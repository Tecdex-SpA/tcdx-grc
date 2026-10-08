import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { loadConfig } from "../config.js";
import { createDatabase, sql } from "../database.js";
import { newUuidV7 } from "../uuid.js";
import { UnavailableFileStoragePort } from "../ports/file-storage.js";
import { acceptMembershipInvitation, PostgresOidcIdentityResolver } from "./oidc-browser.js";
import { membershipInvitationCreate, membershipInvitationRevoke, tenantCreate } from "./platform-iam-service.js";
import { bootstrapFirstPlatformAdmin, resolvePlatformActor } from "./platform-authority.js";

describe.skipIf(process.env.TCDX_SECURITY_INTEGRATION !== "true")("membership invitation PostgreSQL integration", () => {
  it("enforces one-time tenant enrollment, audit/outbox and accept/revoke concurrency", async () => {
    const database = createDatabase(loadConfig(process.env));
    const adminIdentityId = newUuidV7();
    const correlations = Array.from({ length: 12 }, () => newUuidV7());
    const tenantIds: string[] = [];
    const invitationIds: string[] = [];
    const acceptedIdentityIds: string[] = [];
    let platformRoleAssignmentId: string | undefined;

    const identity = {
      principalClass: "HUMAN_INTERACTIVE" as const,
      principalId: adminIdentityId,
      tokenId: newUuidV7(),
      expiresAt: new Date(Date.now() + 3_600_000)
    };
    const identities = new PostgresOidcIdentityResolver();
    const code = (error: unknown) => (error as { code?: string }).code;

    try {
      const existingAssignments = await sql<{ count: number }>`SELECT count(*)::integer AS count FROM iam.platform_role_assignments`.execute(database);
      if (existingAssignments.rows[0]?.count !== 0) throw new Error("INVITATION_TEST_PRECONDITION_BLOCKED: platform assignment history is not empty");
      await sql`
        INSERT INTO iam.user_identities (user_identity_id,identity_key,display_name,lifecycle_state)
        VALUES (${adminIdentityId}::uuid,${`phase5-invitation-admin:${adminIdentityId}`},'Invitation Runtime Admin','active')
      `.execute(database);
      const bootstrap = await bootstrapFirstPlatformAdmin(database, {
        identity, correlationId: correlations[0]!, justification: "Isolated membership invitation runtime verification"
      });
      platformRoleAssignmentId = bootstrap.platformRoleAssignmentId;
      const platformActor = await resolvePlatformActor(database, identity);

      const grants = await sql<{ count: number }>`
        SELECT count(*)::integer AS count
          FROM iam.role_permissions rp
          JOIN iam.roles r ON r.role_id=rp.role_id
          JOIN iam.permissions p ON p.permission_id=rp.permission_id
         WHERE r.role_code='PLATFORM_ADMIN' AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL
           AND rp.ownership_class='PLATFORM_CONTROL' AND rp.tenant_id IS NULL
           AND p.permission_code IN ('platform.membership_invitation.create','platform.membership_invitation.update')
      `.execute(database);
      expect(grants.rows[0]?.count).toBe(2);

      const tenantOne = await database.transaction().execute((transaction) => tenantCreate(transaction, platformActor, {
        body: { tenant_code: `INV-${adminIdentityId.slice(-10)}`, legal_name: "Invitation Runtime One", display_name: "Invitation One", default_timezone: "America/Santiago" },
        key: newUuidV7(), correlationId: correlations[1]!
      }));
      const tenantTwo = await database.transaction().execute((transaction) => tenantCreate(transaction, platformActor, {
        body: { tenant_code: `IN2-${adminIdentityId.slice(-10)}`, legal_name: "Invitation Runtime Two", display_name: "Invitation Two", default_timezone: "UTC" },
        key: newUuidV7(), correlationId: correlations[2]!
      }));
      tenantIds.push(tenantOne.result.tenant_id, tenantTwo.result.tenant_id);

      await expect(database.transaction().execute((transaction) => membershipInvitationCreate(transaction, {
        ...platformActor, permissions: new Set()
      }, {
        body: { tenant_id: tenantOne.result.tenant_id, invitee_email: "reviewer@example.test", authentication_method: "ZOHO" },
        key: newUuidV7(), correlationId: correlations[3]!
      }))).rejects.toSatisfy((error: unknown) => code(error) === "TCDX.AUTHORIZATION.DENIED");

      const createKey = newUuidV7();
      const invitation = await database.transaction().execute((transaction) => membershipInvitationCreate(transaction, platformActor, {
        body: { tenant_id: tenantOne.result.tenant_id, invitee_email: "Reviewer@Example.Test", authentication_method: "ZOHO" },
        key: createKey, correlationId: correlations[4]!
      }));
      invitationIds.push(invitation.result.tenant_membership_invitation_id);
      expect(invitation.invitationToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
      const administrativeApp = buildApp(async () => true, {
        database,
        identityVerifier: { verifyBearerToken: async () => identity },
        fileStorage: new UnavailableFileStoragePort()
      });
      try {
        const administrativeList = await administrativeApp.inject({
          method: "GET", url: `/api/v1/platform/membership-invitations?tenant_id=${tenantOne.result.tenant_id}`,
          headers: { authorization: "Bearer isolated-platform-admin" }
        });
        expect(administrativeList.statusCode).toBe(200);
        const safeList = administrativeList.json();
        expect(safeList.items.some((item: { tenant_membership_invitation_id: string }) => item.tenant_membership_invitation_id === invitation.result.tenant_membership_invitation_id)).toBe(true);
        expect(JSON.stringify(safeList)).not.toContain("token_digest");
        expect(JSON.stringify(safeList)).not.toContain(invitation.invitationToken!);
        const administrativeDetail = await administrativeApp.inject({
          method: "GET", url: `/api/v1/platform/membership-invitations/${invitation.result.tenant_membership_invitation_id}?tenant_id=${tenantOne.result.tenant_id}`,
          headers: { authorization: "Bearer isolated-platform-admin" }
        });
        expect(administrativeDetail.statusCode).toBe(200);
        expect(administrativeDetail.json()).toMatchObject({ lifecycle_state: "pending", effective_state: "pending", row_version: 1 });
        const foreignDetail = await administrativeApp.inject({
          method: "GET", url: `/api/v1/platform/membership-invitations/${invitation.result.tenant_membership_invitation_id}?tenant_id=${tenantTwo.result.tenant_id}`,
          headers: { authorization: "Bearer isolated-platform-admin" }
        });
        expect(foreignDetail.statusCode).toBe(404);
      } finally { await administrativeApp.close(); }
      const replay = await database.transaction().execute((transaction) => membershipInvitationCreate(transaction, platformActor, {
        body: { tenant_id: tenantOne.result.tenant_id, invitee_email: "reviewer@example.test", authentication_method: "ZOHO" },
        key: createKey, correlationId: correlations[4]!
      }));
      expect(replay).toMatchObject({ replayed: true, invitationToken: null });
      expect(replay.result.tenant_membership_invitation_id).toBe(invitation.result.tenant_membership_invitation_id);

      const stored = await sql<{ token_digest: string; expires_in_seconds: number }>`
        SELECT token_digest,(extract(epoch FROM expires_at-created_at))::integer AS expires_in_seconds
          FROM iam.tenant_membership_invitations
         WHERE tenant_membership_invitation_id=${invitation.result.tenant_membership_invitation_id}::uuid
      `.execute(database);
      expect(stored.rows[0]).toMatchObject({
        token_digest: createHash("sha256").update(invitation.invitationToken!, "ascii").digest("hex"),
        expires_in_seconds: 86_400
      });
      expect(stored.rows[0]?.token_digest).not.toBe(invitation.invitationToken);

      const acceptedIdentity = await database.transaction().execute((transaction) => acceptMembershipInvitation(transaction, identities, {
        issuer: "https://accounts.zoho.test", subject: `accepted-${adminIdentityId}`, email: "reviewer@example.test", displayName: "Runtime Reviewer"
      }, {
        invitationId: invitation.result.tenant_membership_invitation_id,
        tokenDigest: stored.rows[0]!.token_digest
      }, correlations[5]!));
      acceptedIdentityIds.push(acceptedIdentity.userIdentityId);
      await expect(database.transaction().execute((transaction) => acceptMembershipInvitation(transaction, identities, {
        issuer: "https://accounts.zoho.test", subject: `accepted-${adminIdentityId}`, email: "reviewer@example.test", displayName: "Runtime Reviewer"
      }, {
        invitationId: invitation.result.tenant_membership_invitation_id,
        tokenDigest: stored.rows[0]!.token_digest
      }, correlations[6]!))).rejects.toSatisfy((error: unknown) => code(error) === "TCDX.AUTHENTICATION.INVALID");

      const enrollment = await sql<{ tenant_id: string; memberships: number; roles: number; accepted: number }>`
        SELECT
          min(tm.tenant_id::text) AS tenant_id,
          count(DISTINCT tm.tenant_membership_id)::integer AS memberships,
          count(DISTINCT mr.membership_role_id)::integer AS roles,
          (SELECT count(*)::integer FROM iam.tenant_membership_invitations i
            WHERE i.tenant_membership_invitation_id=${invitation.result.tenant_membership_invitation_id}::uuid
              AND i.lifecycle_state='accepted' AND i.accepted_by_user_identity_id=${acceptedIdentity.userIdentityId}::uuid) AS accepted
          FROM iam.tenant_memberships tm
          LEFT JOIN iam.membership_roles mr ON mr.tenant_id=tm.tenant_id AND mr.tenant_membership_id=tm.tenant_membership_id
         WHERE tm.user_identity_id=${acceptedIdentity.userIdentityId}::uuid
      `.execute(database);
      expect(enrollment.rows[0]).toMatchObject({ tenant_id: tenantOne.result.tenant_id, memberships: 1, roles: 0, accepted: 1 });

      const revocable = await database.transaction().execute((transaction) => membershipInvitationCreate(transaction, platformActor, {
        body: { tenant_id: tenantOne.result.tenant_id, invitee_email: "revoked@example.test", authentication_method: "ZOHO" },
        key: newUuidV7(), correlationId: correlations[7]!
      }));
      invitationIds.push(revocable.result.tenant_membership_invitation_id);
      const revokeKey = newUuidV7();
      const revoked = await database.transaction().execute((transaction) => membershipInvitationRevoke(transaction, platformActor, {
        invitationId: revocable.result.tenant_membership_invitation_id, body: { reason: "Runtime verification" },
        key: revokeKey, correlationId: correlations[8]!, expectedVersion: 1
      }));
      const revokedReplay = await database.transaction().execute((transaction) => membershipInvitationRevoke(transaction, platformActor, {
        invitationId: revocable.result.tenant_membership_invitation_id, body: { reason: "Runtime verification" },
        key: revokeKey, correlationId: correlations[8]!, expectedVersion: 1
      }));
      expect(revoked.result.lifecycle_state).toBe("revoked");
      expect(revokedReplay).toMatchObject({ replayed: true, result: { lifecycle_state: "revoked", row_version: 2 } });

      const expiredInvitationId = newUuidV7();
      invitationIds.push(expiredInvitationId);
      const expiredDigest = createHash("sha256").update(`expired-${expiredInvitationId}`).digest("hex");
      await sql`
        INSERT INTO iam.tenant_membership_invitations
          (tenant_membership_invitation_id,tenant_id,invitee_email,authentication_method,token_digest,lifecycle_state,
           created_at,expires_at,created_by_user_identity_id,updated_by_user_identity_id)
        VALUES (${expiredInvitationId}::uuid,${tenantOne.result.tenant_id}::uuid,'expired@example.test','ZOHO',${expiredDigest},'pending',
                transaction_timestamp()-interval '25 hours',transaction_timestamp()-interval '1 hour',${adminIdentityId}::uuid,${adminIdentityId}::uuid)
      `.execute(database);
      await expect(database.transaction().execute((transaction) => acceptMembershipInvitation(transaction, identities, {
        issuer: "https://accounts.zoho.test", subject: `expired-${adminIdentityId}`, email: "expired@example.test", displayName: "Expired Reviewer"
      }, { invitationId: expiredInvitationId, tokenDigest: expiredDigest }, correlations[9]!)))
        .rejects.toSatisfy((error: unknown) => code(error) === "TCDX.AUTHENTICATION.INVALID");

      const racing = await database.transaction().execute((transaction) => membershipInvitationCreate(transaction, platformActor, {
        body: { tenant_id: tenantTwo.result.tenant_id, invitee_email: "race@example.test", authentication_method: "ZOHO" },
        key: newUuidV7(), correlationId: correlations[10]!
      }));
      invitationIds.push(racing.result.tenant_membership_invitation_id);
      const racingDigest = createHash("sha256").update(racing.invitationToken!, "ascii").digest("hex");
      const contenders = await Promise.allSettled([
        database.transaction().execute((transaction) => acceptMembershipInvitation(transaction, identities, {
          issuer: "https://accounts.zoho.test", subject: `race-${adminIdentityId}`, email: "race@example.test", displayName: "Race Reviewer"
        }, { invitationId: racing.result.tenant_membership_invitation_id, tokenDigest: racingDigest }, correlations[11]!)),
        database.transaction().execute((transaction) => membershipInvitationRevoke(transaction, platformActor, {
          invitationId: racing.result.tenant_membership_invitation_id, body: {}, key: newUuidV7(),
          correlationId: correlations[11]!, expectedVersion: 1
        }))
      ]);
      expect(contenders.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
      expect(contenders.filter(({ status }) => status === "rejected")).toHaveLength(1);
      const acceptedContender = contenders[0];
      if (acceptedContender.status === "fulfilled") acceptedIdentityIds.push(acceptedContender.value.userIdentityId);
      const raceState = await sql<{ lifecycle_state: string; row_version: string }>`
        SELECT lifecycle_state,row_version FROM iam.tenant_membership_invitations
         WHERE tenant_membership_invitation_id=${racing.result.tenant_membership_invitation_id}::uuid
      `.execute(database);
      expect(raceState.rows[0]).toMatchObject({ row_version: "2" });
      expect(["accepted", "revoked"]).toContain(raceState.rows[0]?.lifecycle_state);

      const facts = await sql<{ create_audits: number; accept_audits: number; created_events: number; accepted_events: number; membership_events: number; idempotency_rows: number }>`
        SELECT
          count(*) FILTER (WHERE event_code='audit.platform.membership_invitation.create.v1' AND aggregate_id=${invitation.result.tenant_membership_invitation_id}::uuid)::integer AS create_audits,
          count(*) FILTER (WHERE event_code='audit.platform.membership_invitation.accept.v1' AND aggregate_id=${invitation.result.tenant_membership_invitation_id}::uuid)::integer AS accept_audits,
          (SELECT count(*)::integer FROM ops_audit.outbox_events WHERE event_type='iam.membership_invitation.created.v1' AND aggregate_id=${invitation.result.tenant_membership_invitation_id}::uuid) AS created_events,
          (SELECT count(*)::integer FROM ops_audit.outbox_events WHERE event_type='iam.membership_invitation.accepted.v1' AND aggregate_id=${invitation.result.tenant_membership_invitation_id}::uuid) AS accepted_events,
          (SELECT count(*)::integer FROM ops_audit.outbox_events WHERE event_type='iam.membership.created.v1' AND tenant_id=${tenantOne.result.tenant_id}::uuid AND actor_user_identity_id=${acceptedIdentity.userIdentityId}::uuid) AS membership_events,
          (SELECT count(*)::integer FROM ops_audit.idempotency_records WHERE operation_code='membershipInvitationCreate' AND idempotency_key=${createKey} AND result_status_code='completed') AS idempotency_rows
          FROM ops_audit.audit_events
      `.execute(database);
      expect(facts.rows[0]).toEqual({ create_audits: 1, accept_audits: 1, created_events: 1, accepted_events: 1, membership_events: 1, idempotency_rows: 1 });
    } finally {
      await sql`DELETE FROM ops_audit.outbox_events WHERE tenant_id = ANY(${tenantIds}::uuid[]) OR actor_user_identity_id=${adminIdentityId}::uuid`.execute(database).catch(() => undefined);
      await sql`DELETE FROM ops_audit.audit_events WHERE tenant_id = ANY(${tenantIds}::uuid[]) OR actor_user_identity_id=${adminIdentityId}::uuid`.execute(database).catch(() => undefined);
      await sql`DELETE FROM ops_audit.idempotency_records WHERE tenant_id = ANY(${tenantIds}::uuid[]) OR actor_user_identity_id=${adminIdentityId}::uuid`.execute(database).catch(() => undefined);
      await sql`DELETE FROM iam.tenant_membership_invitations WHERE tenant_membership_invitation_id = ANY(${invitationIds}::uuid[])`.execute(database).catch(() => undefined);
      await sql`DELETE FROM iam.membership_roles WHERE tenant_id = ANY(${tenantIds}::uuid[])`.execute(database).catch(() => undefined);
      await sql`DELETE FROM iam.tenant_memberships WHERE tenant_id = ANY(${tenantIds}::uuid[])`.execute(database).catch(() => undefined);
      await sql`DELETE FROM platform.subscriptions WHERE tenant_id = ANY(${tenantIds}::uuid[])`.execute(database).catch(() => undefined);
      await sql`DELETE FROM platform.tenants WHERE tenant_id = ANY(${tenantIds}::uuid[])`.execute(database).catch(() => undefined);
      if (platformRoleAssignmentId) await sql`DELETE FROM iam.platform_role_assignments WHERE platform_role_assignment_id=${platformRoleAssignmentId}::uuid`.execute(database).catch(() => undefined);
      if (acceptedIdentityIds.length > 0) await sql`DELETE FROM iam.user_identities WHERE user_identity_id = ANY(${acceptedIdentityIds}::uuid[])`.execute(database).catch(() => undefined);
      await sql`DELETE FROM iam.user_identities WHERE user_identity_id=${adminIdentityId}::uuid`.execute(database).catch(() => undefined);
      await database.destroy();
    }
  }, 30_000);
});
