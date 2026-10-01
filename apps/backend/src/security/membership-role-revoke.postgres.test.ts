import { describe, expect, it } from "vitest";
import { loadConfig } from "../config.js";
import { createDatabase, sql } from "../database.js";
import type { CoreActor } from "../core-grc/model.js";
import { newUuidV7 } from "../uuid.js";
import { membershipRoleRevoke } from "./platform-iam-service.js";
import { membershipRoleEtag } from "./membership-role-etag.js";
import { resolvePlatformActor } from "./platform-authority.js";

const rollback = Symbol("isolated-membership-role-revoke-rollback");

describe.skipIf(process.env.TCDX_SECURITY_INTEGRATION !== "true")("MembershipRole revoke PostgreSQL integration", () => {
  it("closes one of N tenant roles with CAS, replay, tenant isolation, audit and outbox", async () => {
    if (process.env.DATABASE_HOST !== "127.0.0.1" || process.env.DATABASE_PORT !== "55432"
      || process.env.TCDX_ISOLATED_REBUILD !== "true") throw new Error("ROLE_REVOKE_TEST_REQUIRES_ISOLATED_LOCAL_POSTGRES");
    const database = createDatabase(loadConfig(process.env));
    const ids = { tenant: newUuidV7(), foreign: newUuidV7(), admin: newUuidV7(), target: newUuidV7(),
      membership: newUuidV7(), roleA: newUuidV7(), roleB: newUuidV7(), assignmentA: newUuidV7(),
      assignmentB: newUuidV7(), platformAssignment: newUuidV7() };
    const tenantActor: CoreActor = {
      tenantId: ids.tenant, membershipId: ids.membership, userIdentityId: ids.admin,
      permissions: new Set(["platform.role.assign"]), scopes: new Set(["tenant"]),
      permissionScopes: new Map([["platform.role.assign", new Set(["tenant"])] ]),
      capabilityGroups: new Set(["CORE_PLATFORM"]), roles: ["TENANT_ADMIN"]
    };
    const platformIdentity = { principalClass: "HUMAN_INTERACTIVE" as const, principalId: ids.admin,
      tokenId: newUuidV7(), expiresAt: new Date(Date.now() + 60000) };
    let completed = false;
    try {
      await database.transaction().execute(async (tx) => {
        await sql`
          INSERT INTO iam.user_identities (user_identity_id,identity_key,display_name,lifecycle_state)
          VALUES (${ids.admin}::uuid,${`role-revoke:${ids.admin}`},'Isolated Admin','active'),
                 (${ids.target}::uuid,${`role-revoke:${ids.target}`},'Isolated Target','active')
        `.execute(tx);
        await sql`
          INSERT INTO platform.tenants (tenant_id,tenant_code,legal_name,display_name,default_timezone,created_by_user_identity_id,updated_by_user_identity_id)
          VALUES (${ids.tenant}::uuid,${`RR-${ids.tenant.slice(-12)}`},'Isolated Tenant','Isolated Tenant','UTC',${ids.admin}::uuid,${ids.admin}::uuid),
                 (${ids.foreign}::uuid,${`RR-${ids.foreign.slice(-12)}`},'Foreign Tenant','Foreign Tenant','UTC',${ids.admin}::uuid,${ids.admin}::uuid)
        `.execute(tx);
        await sql`
          INSERT INTO iam.tenant_memberships (tenant_membership_id,tenant_id,user_identity_id,membership_state,joined_at,created_by_user_identity_id,updated_by_user_identity_id)
          VALUES (${ids.membership}::uuid,${ids.tenant}::uuid,${ids.target}::uuid,'active',transaction_timestamp(),${ids.admin}::uuid,${ids.admin}::uuid)
        `.execute(tx);
        await sql`
          INSERT INTO iam.roles (role_id,ownership_class,tenant_id,role_code,name,lifecycle_state)
          VALUES (${ids.roleA}::uuid,'TENANT_OWNED',${ids.tenant}::uuid,'ISOLATED_REVOKE_A','Role A','published'),
                 (${ids.roleB}::uuid,'TENANT_OWNED',${ids.tenant}::uuid,'ISOLATED_REVOKE_B','Role B','published')
        `.execute(tx);
        await sql`
          INSERT INTO iam.membership_roles (membership_role_id,tenant_id,tenant_membership_id,role_id,scope_kind,valid_from,created_by_user_identity_id)
          VALUES (${ids.assignmentA}::uuid,${ids.tenant}::uuid,${ids.membership}::uuid,${ids.roleA}::uuid,'tenant',transaction_timestamp()-interval '1 second',${ids.admin}::uuid),
                 (${ids.assignmentB}::uuid,${ids.tenant}::uuid,${ids.membership}::uuid,${ids.roleB}::uuid,'tenant',transaction_timestamp()-interval '1 second',${ids.admin}::uuid)
        `.execute(tx);
        const platformRole = await sql<{ role_id: string }>`SELECT role_id FROM iam.roles WHERE role_code='PLATFORM_ADMIN' AND ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL`.execute(tx);
        expect(platformRole.rows).toHaveLength(1);
        await sql`
          INSERT INTO iam.platform_role_assignments (platform_role_assignment_id,ownership_class,user_identity_id,role_id,valid_from,created_by_user_identity_id)
          VALUES (${ids.platformAssignment}::uuid,'PLATFORM_CONTROL',${ids.admin}::uuid,${platformRole.rows[0]!.role_id}::uuid,transaction_timestamp()-interval '1 second',${ids.admin}::uuid)
        `.execute(tx);
        const platformActor = await resolvePlatformActor(tx, platformIdentity);
        expect(platformActor.roles).toContain("PLATFORM_ADMIN");
        expect(platformActor.permissions.has("platform.role.assign")).toBe(true);
        const original = await sql<{ membership_role_id: string; valid_from: Date; valid_to: Date | null }>`
          SELECT membership_role_id,valid_from,valid_to FROM iam.membership_roles WHERE membership_role_id=${ids.assignmentA}::uuid
        `.execute(tx);
        const etag = membershipRoleEtag(original.rows[0]!);
        const input = { assignmentId: ids.assignmentA, body: { reason: "Isolated SoD correction" }, expectedEtag: etag,
          key: newUuidV7(), correlationId: newUuidV7() };
        await expect(membershipRoleRevoke(tx, { kind: "tenant", actor: { ...tenantActor, permissions: new Set() } }, input))
          .rejects.toMatchObject({ code: "TCDX.AUTHORIZATION.DENIED" });
        await expect(membershipRoleRevoke(tx, { kind: "tenant", actor: { ...tenantActor, roles: ["EVIDENCE_OWNER"] } }, input))
          .rejects.toMatchObject({ code: "TCDX.AUTHORIZATION.DENIED" });
        await expect(membershipRoleRevoke(tx, { kind: "tenant", actor: tenantActor }, { ...input, assignmentId: ids.platformAssignment, key: newUuidV7() }))
          .rejects.toMatchObject({ code: "TCDX.RESOURCE.NOT_FOUND" });
        await expect(membershipRoleRevoke(tx, { kind: "platform", actor: platformActor, tenantId: ids.foreign }, { ...input, key: newUuidV7() }))
          .rejects.toMatchObject({ code: "TCDX.RESOURCE.NOT_FOUND" });
        const revoked = await membershipRoleRevoke(tx, { kind: "tenant", actor: tenantActor }, input);
        expect(revoked.replayed).toBe(false);
        expect(revoked.result).toMatchObject({ membership_role_id: ids.assignmentA, role_id: ids.roleA });
        expect(revoked.result.valid_to).not.toBeNull();
        expect(revoked.result.etag).not.toBe(etag);
        const replay = await membershipRoleRevoke(tx, { kind: "tenant", actor: tenantActor }, input);
        expect(replay).toMatchObject({ replayed: true, result: revoked.result });
        await expect(membershipRoleRevoke(tx, { kind: "tenant", actor: tenantActor }, { ...input, key: newUuidV7() }))
          .rejects.toMatchObject({ code: "TCDX.CONFLICT.CONCURRENCY" });
        const rows = await sql<{ roles: number; active_other: number; membership: number; identity: number; platform: number; audits: number; events: number }>`
          SELECT (SELECT count(*)::integer FROM iam.membership_roles WHERE tenant_membership_id=${ids.membership}::uuid) AS roles,
                 (SELECT count(*)::integer FROM iam.membership_roles WHERE membership_role_id=${ids.assignmentB}::uuid AND valid_to IS NULL) AS active_other,
                 (SELECT count(*)::integer FROM iam.tenant_memberships WHERE tenant_membership_id=${ids.membership}::uuid) AS membership,
                 (SELECT count(*)::integer FROM iam.user_identities WHERE user_identity_id=${ids.target}::uuid) AS identity,
                 (SELECT count(*)::integer FROM iam.platform_role_assignments WHERE platform_role_assignment_id=${ids.platformAssignment}::uuid AND valid_to IS NULL) AS platform,
                 (SELECT count(*)::integer FROM ops_audit.audit_events WHERE aggregate_id=${ids.assignmentA}::uuid AND event_code='audit.platform.role.revoke.v1') AS audits,
                 (SELECT count(*)::integer FROM ops_audit.outbox_events WHERE aggregate_id=${ids.assignmentA}::uuid AND event_type='iam.role.revoked.v1') AS events
        `.execute(tx);
        expect(rows.rows[0]).toEqual({ roles: 2, active_other: 1, membership: 1, identity: 1, platform: 1, audits: 1, events: 1 });
        const other = await sql<{ membership_role_id: string; valid_from: Date; valid_to: Date | null }>`
          SELECT membership_role_id,valid_from,valid_to FROM iam.membership_roles WHERE membership_role_id=${ids.assignmentB}::uuid
        `.execute(tx);
        const platformRevoked = await membershipRoleRevoke(tx, { kind: "platform", actor: platformActor, tenantId: ids.tenant }, {
          assignmentId: ids.assignmentB, body: { reason: "Platform-authorized isolated correction" },
          expectedEtag: membershipRoleEtag(other.rows[0]!), key: newUuidV7(), correlationId: newUuidV7()
        });
        expect(platformRevoked.result.valid_to).not.toBeNull();
        const platformAudit = await sql<{ revoked: number; privileged: number; platform_unchanged: number }>`
          SELECT (SELECT count(*)::integer FROM ops_audit.audit_events WHERE aggregate_id=${ids.assignmentB}::uuid AND event_code='audit.platform.role.revoke.v1') AS revoked,
                 (SELECT count(*)::integer FROM ops_audit.audit_events WHERE aggregate_id=${ids.assignmentB}::uuid AND command_code='membershipRoleRevoke' AND event_code='audit.iam.application_token.privileged_use.v1') AS privileged,
                 (SELECT count(*)::integer FROM iam.platform_role_assignments WHERE platform_role_assignment_id=${ids.platformAssignment}::uuid AND valid_to IS NULL) AS platform_unchanged
        `.execute(tx);
        expect(platformAudit.rows[0]).toEqual({ revoked: 1, privileged: 1, platform_unchanged: 1 });
        completed = true;
        throw rollback;
      });
    } catch (error) { if (error !== rollback) throw error; }
    finally { await database.destroy(); }
    expect(completed).toBe(true);
  });
});
