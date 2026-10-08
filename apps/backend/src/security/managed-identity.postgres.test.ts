import { describe, expect, it, vi } from "vitest";
import { loadConfig } from "../config.js";
import { createDatabase, sql } from "../database.js";
import { availableTenantContexts, resolveTenantActor } from "../core-grc/security.js";
import { newUuidV7 } from "../uuid.js";
import { requirePlatformAccess, resolvePlatformActor } from "./platform-authority.js";
import { PostgresOidcIdentityResolver, canonicalIdentityKey } from "./oidc-browser.js";
import { ManagedIdentityService } from "./managed-identity-service.js";
import type { ManagedUser, ManagedUserAdminPort } from "./keycloak-managed-user-adapter.js";
import type { PlatformActor } from "./platform-authority.js";

const rollback = Symbol("managed-identity-isolated-rollback");

describe.skipIf(process.env.TCDX_SECURITY_INTEGRATION !== "true")("Managed Identity canonical mapping in isolated PostgreSQL", () => {
  it("denies unknown and disabled subjects without creating identity, membership or role authority", async () => {
    if (process.env.DATABASE_HOST !== "127.0.0.1" || process.env.DATABASE_PORT !== "55432"
      || process.env.TCDX_ISOLATED_REBUILD !== "true") throw new Error("MANAGED_IDENTITY_TEST_REQUIRES_ISOLATED_LOCAL_POSTGRES");
    const database = createDatabase(loadConfig(process.env));
    const issuer = "https://iam.grc.tecdex.net/realms/tcdx-managed-identity";
    const identityId = newUuidV7();
    const otherId = newUuidV7();
    const subject = `isolated-${identityId}`;
    const claims = { issuer, subject, email: "same@example.test", displayName: "Managed fixture" };
    const identityKey = canonicalIdentityKey(issuer, subject);
    const resolver = new PostgresOidcIdentityResolver();
    try {
      try {
        await database.transaction().execute(async (transaction) => {
          await expect(resolver.resolveExisting(transaction, claims))
            .rejects.toMatchObject({ code: "TCDX.AUTHENTICATION.INVALID" });
          const before = await sql<{ count: number }>`
            SELECT count(*)::integer AS count FROM iam.user_identities WHERE identity_key=${identityKey}
          `.execute(transaction);
          expect(before.rows[0]?.count).toBe(0);

          await sql`
            INSERT INTO iam.user_identities (user_identity_id,identity_key,display_name,email_normalized,lifecycle_state)
            VALUES (${identityId}::uuid,${identityKey},'Managed fixture','same@example.test','active'),
                   (${otherId}::uuid,${canonicalIdentityKey("https://accounts.zoho.com", subject)},'Zoho fixture','same@example.test','active')
          `.execute(transaction);
          expect((await resolver.resolveExisting(transaction, claims)).userIdentityId).toBe(identityId);
          expect((await resolver.resolveExisting(transaction, { ...claims, email: "changed@example.test", displayName: "Changed" })).userIdentityId)
            .toBe(identityId);
          const unchangedProfile = await sql<{ email_normalized: string | null; display_name: string; last_authenticated_at: Date | null }>`
            SELECT email_normalized,display_name,last_authenticated_at FROM iam.user_identities
             WHERE user_identity_id=${identityId}::uuid
          `.execute(transaction);
          expect(unchangedProfile.rows[0]).toMatchObject({ email_normalized: "same@example.test", display_name: "Managed fixture" });
          expect(unchangedProfile.rows[0]?.last_authenticated_at).not.toBeNull();
          await expect(resolver.resolveExisting(transaction, { ...claims, subject: `other-${subject}` }))
            .rejects.toMatchObject({ code: "TCDX.AUTHENTICATION.INVALID" });

          const verified = { principalClass: "HUMAN_INTERACTIVE" as const, principalId: identityId,
            tokenId: newUuidV7(), expiresAt: new Date(Date.now() + 60_000) };
          expect(await availableTenantContexts(transaction, verified)).toEqual([]);
          await expect(resolveTenantActor(transaction, verified, newUuidV7()))
            .rejects.toMatchObject({ code: "TCDX.RESOURCE.NOT_FOUND" });
          const platform = await resolvePlatformActor(transaction, verified);
          expect(platform.permissions.size).toBe(0);
          expect(() => requirePlatformAccess(platform, "platform.tenant.create"))
            .toThrowError();

          await sql`UPDATE iam.user_identities SET lifecycle_state='disabled' WHERE user_identity_id=${identityId}::uuid`.execute(transaction);
          await expect(resolver.resolveExisting(transaction, claims))
            .rejects.toMatchObject({ code: "TCDX.AUTHENTICATION.INVALID" });
          throw rollback;
        });
      } catch (error) {
        if (error !== rollback) throw error;
      }
    } finally {
      await database.destroy();
    }
  });

  it("completes the eight-operation local lifecycle with one-time disclosure, safe audit and no grants", async () => {
    if (process.env.DATABASE_HOST !== "127.0.0.1" || process.env.DATABASE_PORT !== "55432"
      || process.env.TCDX_ISOLATED_REBUILD !== "true") throw new Error("MANAGED_IDENTITY_TEST_REQUIRES_ISOLATED_LOCAL_POSTGRES");
    const database = createDatabase(loadConfig(process.env));
    const actorId = newUuidV7();
    const subject = newUuidV7();
    const username = `mi6d-r3-${actorId.slice(0, 8)}`;
    const displayName = "MI6D R3 local fixture";
    let managedId: string | undefined;
    let user: ManagedUser | null = null;
    let passwordActions = 0;
    let logoutActions = 0;
    let failPasswordOnce = false;
    let signalCreateStarted!: () => void;
    let releaseCreate!: () => void;
    const createStarted = new Promise<void>((resolve) => { signalCreateStarted = resolve; });
    const createMayFinish = new Promise<void>((resolve) => { releaseCreate = resolve; });
    const createManagedUser = vi.fn(async (input: { username: string; displayName: string; marker: string }) => {
      signalCreateStarted();
      await createMayFinish;
      expect(user).toBeNull();
      expect(input.marker).toMatch(/^[A-Za-z0-9_-]{32}$/);
      expect(input.marker).not.toBe(username);
      user = { id: subject, username: input.username, firstName: input.displayName, enabled: true,
        requiredActions: ["UPDATE_PASSWORD", "CONFIGURE_TOTP"],
        attributes: { tcdx_provision_reconciliation_marker: [input.marker] }, mfaEnrolled: false };
      return subject;
    });
    const admin: ManagedUserAdminPort = {
      createManagedUser,
      getManagedUser: vi.fn(async (id) => user && id === subject ? { ...user } : null),
      listManagedUsers: vi.fn(async (first, max, marker) => {
        const found = user && (!marker || user.attributes.tcdx_provision_reconciliation_marker?.[0] === marker) ? [user] : [];
        return found.slice(first, first + max).map((item) => ({ ...item }));
      }),
      setManagedUserEnabled: vi.fn(async (_id, enabled) => { if (!user) throw new Error("missing fixture"); user.enabled = enabled; }),
      setTemporaryPassword: vi.fn(async (_id, credential) => {
        expect(credential.length).toBeGreaterThan(40);
        passwordActions += 1;
        if (failPasswordOnce) { failPasswordOnce = false; throw new Error("uncertain provider result"); }
      }),
      removeManagedUserTotpCredential: vi.fn(async () => { if (!user) throw new Error("missing fixture"); user.mfaEnrolled = false; }),
      revokeManagedUserSessions: vi.fn(async () => { logoutActions += 1; })
    };
    const revokeApplicationSessions = vi.fn(async () => {});
    const actor: PlatformActor = { identity: { principalClass: "HUMAN_INTERACTIVE", principalId: actorId,
      tokenId: newUuidV7(), expiresAt: new Date(Date.now() + 60_000) }, roles: ["PLATFORM_ADMIN"],
      permissions: new Set(["platform.managed_identity.read", "platform.managed_identity.create",
        "platform.managed_identity.administer"]) };
    const service = new ManagedIdentityService(database, admin, revokeApplicationSessions);
    const provisionBody = { display_name: displayName, username, person_verification_ref: "local-person-check" };
    try {
      await sql`INSERT INTO iam.user_identities (user_identity_id,identity_key,display_name,lifecycle_state)
        VALUES (${actorId}::uuid,${canonicalIdentityKey("https://accounts.zoho.com", actorId)},'Local actor','active')`.execute(database);
      await expect(service.provision(actor, { ...provisionBody, tenant_id: newUuidV7() }, "tenant-body-key", newUuidV7()))
        .rejects.toMatchObject({ code: "TCDX.VALIDATION.FAILED" });
      const firstPending = service.provision(actor, provisionBody, "provision-key", newUuidV7());
      await createStarted;
      const competing = service.provision(actor, provisionBody, "provision-key", newUuidV7());
      releaseCreate();
      const first = await firstPending;
      const concurrent = await competing;
      expect(concurrent).toMatchObject({ credential_disclosed: false, replayed: true });
      expect(concurrent).not.toHaveProperty("temporary_credential");
      managedId = first.identity.user_identity_id;
      expect(first).toMatchObject({ credential_disclosed: true, replayed: false });
      expect(first.temporary_credential?.length).toBeGreaterThan(40);
      expect(first.identity.subject_reference).toBe(subject);
      expect(await service.read(actor, managedId)).toMatchObject({ user_identity_id: managedId });
      expect((await service.list(actor, {})).items).toContainEqual(expect.objectContaining({ user_identity_id: managedId }));
      const replay = await service.provision(actor, provisionBody, "provision-key", newUuidV7());
      expect(replay).toMatchObject({ credential_disclosed: false, replayed: true });
      expect(replay).not.toHaveProperty("temporary_credential");
      expect(createManagedUser).toHaveBeenCalledTimes(1);
      expect(passwordActions).toBe(1);
      await expect(service.provision(actor, { ...provisionBody, display_name: "Different" }, "provision-key", newUuidV7()))
        .rejects.toMatchObject({ code: "TCDX.CONFLICT.IDEMPOTENCY" });

      expect((await service.disable(actor, managedId, { reason: "Local validation" }, "disable-key", newUuidV7())).identity.enabled).toBe(false);
      await expect(service.disable(actor, managedId, { reason: "Local validation" }, "another-disable-key", newUuidV7()))
        .rejects.toMatchObject({ code: "TCDX.LIFECYCLE.TRANSITION_DENIED" });
      expect((await service.enable(actor, managedId, { reason: "Local validation" }, "enable-key", newUuidV7())).identity.enabled).toBe(true);
      const resetBody = { reason: "Local recovery", person_verification_ref: "local-person-check" };
      const reset = await service.passwordReset(actor, managedId, resetBody, "reset-key", newUuidV7());
      expect(reset).toMatchObject({ credential_disclosed: true, replayed: false });
      expect(reset.temporary_credential?.length).toBeGreaterThan(40);
      const resetReplay = await service.passwordReset(actor, managedId, resetBody, "reset-key", newUuidV7());
      expect(resetReplay).toMatchObject({ credential_disclosed: false, replayed: true });
      expect(resetReplay).not.toHaveProperty("temporary_credential");
      expect(passwordActions).toBe(2);
      failPasswordOnce = true;
      await expect(service.passwordReset(actor, managedId, resetBody, "uncertain-key", newUuidV7()))
        .rejects.toMatchObject({ code: "TCDX.CONFLICT.RECOVERY_REQUIRED" });
      await expect(service.passwordReset(actor, managedId, resetBody, "uncertain-key", newUuidV7()))
        .rejects.toMatchObject({ code: "TCDX.CONFLICT.RECOVERY_REQUIRED" });
      expect(passwordActions).toBe(3);
      expect((await service.passwordReset(actor, managedId, resetBody, "new-recovery-key", newUuidV7())).credential_disclosed).toBe(true);
      expect(passwordActions).toBe(4);
      await service.mfaReset(actor, managedId, { reason: "Local factor reset" }, "mfa-key", newUuidV7());
      await service.sessionRevoke(actor, managedId, { reason: "Local session reset" }, "session-key", newUuidV7());
      expect(logoutActions).toBeGreaterThanOrEqual(5);
      expect(revokeApplicationSessions).toHaveBeenCalled();

      const rows = await sql<{ membership_count: number; grant_count: number }>`
        SELECT (SELECT count(*)::integer FROM iam.tenant_memberships WHERE user_identity_id=${managedId}::uuid) AS membership_count,
               (SELECT count(*)::integer FROM iam.platform_role_assignments WHERE user_identity_id=${managedId}::uuid) AS grant_count
      `.execute(database);
      expect(rows.rows[0]).toEqual({ membership_count: 0, grant_count: 0 });
      const durable = await sql<{ body: string }>`
        SELECT row_to_json(t)::text AS body FROM ops_audit.idempotency_records t WHERE actor_user_identity_id=${actorId}::uuid
        UNION ALL SELECT row_to_json(t)::text AS body FROM ops_audit.audit_events t WHERE actor_user_identity_id=${actorId}::uuid
      `.execute(database);
      expect(durable.rows.length).toBeGreaterThan(0);
      expect(durable.rows.every((row) => !row.body.includes(first.temporary_credential!)
        && !row.body.includes(reset.temporary_credential!))).toBe(true);
      expect(durable.rows.some((row) => row.body.includes("uncertain"))).toBe(true);
    } finally {
      await sql`DELETE FROM ops_audit.audit_events WHERE actor_user_identity_id=${actorId}::uuid`.execute(database);
      await sql`DELETE FROM ops_audit.idempotency_records WHERE actor_user_identity_id=${actorId}::uuid`.execute(database);
      if (managedId) await sql`DELETE FROM iam.user_identities WHERE user_identity_id=${managedId}::uuid`.execute(database);
      await sql`DELETE FROM iam.user_identities WHERE user_identity_id=${actorId}::uuid`.execute(database);
      await database.destroy();
    }
  });

  it("reconciles a lost create response by its durable marker without retrying create or disclosing a credential", async () => {
    if (process.env.DATABASE_HOST !== "127.0.0.1" || process.env.DATABASE_PORT !== "55432"
      || process.env.TCDX_ISOLATED_REBUILD !== "true") throw new Error("MANAGED_IDENTITY_TEST_REQUIRES_ISOLATED_LOCAL_POSTGRES");
    const database = createDatabase(loadConfig(process.env));
    const actorId = newUuidV7();
    const subject = newUuidV7();
    const username = `mi6d-reconcile-${actorId.slice(0, 8)}`;
    const body = { display_name: "MI6D recovery fixture", username, person_verification_ref: "local-person-check" };
    let user: ManagedUser | null = null;
    const createManagedUser = vi.fn(async (input: { username: string; displayName: string; marker: string }) => {
      user = { id: subject, username: input.username, firstName: input.displayName, enabled: true,
        requiredActions: ["UPDATE_PASSWORD", "CONFIGURE_TOTP"],
        attributes: { tcdx_provision_reconciliation_marker: [input.marker] }, mfaEnrolled: false };
      throw new Error("response lost after provider create");
    });
    const setTemporaryPassword = vi.fn(async () => {});
    const admin: ManagedUserAdminPort = {
      createManagedUser,
      getManagedUser: vi.fn(async (id) => user && id === subject ? { ...user } : null),
      listManagedUsers: vi.fn(async (first, max, marker) => {
        const matches = user && (!marker || user.attributes.tcdx_provision_reconciliation_marker?.[0] === marker) ? [user] : [];
        return matches.slice(first, first + max).map((item) => ({ ...item }));
      }),
      setManagedUserEnabled: vi.fn(), setTemporaryPassword,
      removeManagedUserTotpCredential: vi.fn(), revokeManagedUserSessions: vi.fn()
    };
    const actor: PlatformActor = { identity: { principalClass: "HUMAN_INTERACTIVE", principalId: actorId,
      tokenId: newUuidV7(), expiresAt: new Date(Date.now() + 60_000) }, roles: ["PLATFORM_ADMIN"],
      permissions: new Set(["platform.managed_identity.create"]) };
    const service = new ManagedIdentityService(database, admin, async () => {});
    try {
      await sql`INSERT INTO iam.user_identities (user_identity_id,identity_key,display_name,lifecycle_state)
        VALUES (${actorId}::uuid,${canonicalIdentityKey("https://accounts.zoho.com", actorId)},'Local actor','active')`.execute(database);
      await expect(service.provision(actor, body, "lost-create-key", newUuidV7()))
        .rejects.toMatchObject({ code: "TCDX.CONFLICT.RECOVERY_REQUIRED" });
      const claim = await sql<{ idempotency_record_id: string; result_ref: string; result_status_code: string }>`
        SELECT idempotency_record_id,result_ref,result_status_code FROM ops_audit.idempotency_records
         WHERE actor_user_identity_id=${actorId}::uuid AND idempotency_key='lost-create-key'
      `.execute(database);
      expect(claim.rows[0]?.result_ref).toMatch(/^marker:[A-Za-z0-9_-]{32}$/);
      expect(claim.rows[0]?.result_status_code).toBe("in_progress");
      const claimId = claim.rows[0]!.idempotency_record_id;
      const uncertainAudit = async () => (await sql<{ count: number }>`
        SELECT count(*)::integer AS count FROM ops_audit.audit_events
         WHERE aggregate_type='IdempotencyRecord' AND aggregate_id=${claimId}::uuid
           AND event_code='audit.platform.managed_identity.provision.v1'
      `.execute(database)).rows[0]!.count;
      expect(await uncertainAudit()).toBe(1);
      await expect(service.provision(actor, body, "lost-create-key", newUuidV7()))
        .rejects.toMatchObject({ code: "TCDX.CONFLICT.RECOVERY_REQUIRED" });
      expect(await uncertainAudit()).toBe(1);
      const mapped = await sql<{ user_identity_id: string }>`
        SELECT user_identity_id FROM iam.user_identities WHERE identity_key=${canonicalIdentityKey("https://iam.grc.tecdex.net/realms/tcdx-managed-identity", subject)}
      `.execute(database);
      expect(mapped.rows).toHaveLength(1);
      expect(createManagedUser).toHaveBeenCalledTimes(1);
      expect(setTemporaryPassword).not.toHaveBeenCalled();
      await expect(service.provision(actor, body, "lost-create-key", newUuidV7()))
        .rejects.toMatchObject({ code: "TCDX.CONFLICT.RECOVERY_REQUIRED" });
      expect(createManagedUser).toHaveBeenCalledTimes(1);
      user = null;
      await expect(service.provision(actor, { ...body, username: `${username}-zero` }, "zero-match-key", newUuidV7()))
        .rejects.toMatchObject({ code: "TCDX.CONFLICT.RECOVERY_REQUIRED" });
      await expect(service.provision(actor, { ...body, username: `${username}-zero` }, "zero-match-key", newUuidV7()))
        .rejects.toMatchObject({ code: "TCDX.CONFLICT.RECOVERY_REQUIRED" });
      expect(createManagedUser).toHaveBeenCalledTimes(2);
      const zeroAudit = await sql<{ count: number }>`
        SELECT count(*)::integer AS count FROM ops_audit.audit_events
         WHERE actor_user_identity_id=${actorId}::uuid AND aggregate_type='IdempotencyRecord'
           AND event_code='audit.platform.managed_identity.provision.v1'
      `.execute(database);
      expect(zeroAudit.rows[0]?.count).toBe(2);
    } finally {
      await sql`DELETE FROM ops_audit.audit_events WHERE actor_user_identity_id=${actorId}::uuid`.execute(database);
      await sql`DELETE FROM ops_audit.idempotency_records WHERE actor_user_identity_id=${actorId}::uuid`.execute(database);
      await sql`DELETE FROM iam.user_identities WHERE identity_key=${canonicalIdentityKey("https://iam.grc.tecdex.net/realms/tcdx-managed-identity", subject)}`.execute(database);
      await sql`DELETE FROM iam.user_identities WHERE user_identity_id=${actorId}::uuid`.execute(database);
      await database.destroy();
    }
  });
});
