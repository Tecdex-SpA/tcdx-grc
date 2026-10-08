import { restorePreMethodologyFixture } from "./methodology-predecessor-fixture.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { Kysely, Transaction } from "kysely";
import type { FoundationDatabase } from "../database.js";
import { buildApp } from "../app.js";
import { loadConfig } from "../config.js";
import { createDatabase, sql } from "../database.js";
import { UnavailableFileStoragePort } from "../ports/file-storage.js";
import { newUuidV7 } from "../uuid.js";
import { resolvePlatformActor, type PlatformActor } from "./platform-authority.js";
import { PlatformRoleService } from "./platform-role-service.js";

describe.skipIf(process.env.TCDX_SECURITY_INTEGRATION !== "true")("P2A isolated PostgreSQL platform role administration", () => {
  let db: ReturnType<typeof createDatabase>, service: PlatformRoleService, actor: PlatformActor;
  let admin: string, target: string, outsider: string, initialAssignment: string;
  const identity = (principalId: string) => ({ principalClass: "HUMAN_INTERACTIVE" as const, principalId, tokenId: newUuidV7(), expiresAt: new Date(Date.now() + 60000) });
  const assign = (code = "PLATFORM_SUPPORT", key = newUuidV7()) => service.assign(actor, target, { role_code: code, reason: "Isolated approved role administration" }, key, newUuidV7());
  beforeEach(async () => {
    if (process.env.DATABASE_HOST !== "127.0.0.1" || process.env.DATABASE_PORT !== "55432" || process.env.TCDX_ISOLATED_REBUILD !== "true") throw new Error("P2A_REQUIRES_ISOLATED_LOCAL_POSTGRES");
    db = createDatabase(loadConfig(process.env)); service = new PlatformRoleService(db);
    admin = newUuidV7(); target = newUuidV7(); outsider = newUuidV7(); initialAssignment = newUuidV7();
    const role = await sql<{ role_id: string }>`SELECT role_id FROM iam.roles WHERE role_code='PLATFORM_ADMIN' AND ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL AND is_baseline`.execute(db);
    await sql`INSERT INTO iam.user_identities (user_identity_id,identity_key,display_name,lifecycle_state)
      VALUES (${admin}::uuid,${`local-p2a:${admin}`},'Local admin fixture','active'),
        (${target}::uuid,${`local-p2a:${target}`},'Local target fixture','active'),
        (${outsider}::uuid,${`local-p2a:${outsider}`},'Local unauthorized fixture','active')`.execute(db);
    await sql`INSERT INTO iam.platform_role_assignments (platform_role_assignment_id,ownership_class,user_identity_id,role_id,valid_from)
      VALUES (${initialAssignment}::uuid,'PLATFORM_CONTROL',${admin}::uuid,${role.rows[0]!.role_id}::uuid,transaction_timestamp()-interval '1 second')`.execute(db);
    actor = await resolvePlatformActor(db, identity(admin));
    expect(actor.permissions.has("platform.role.administer")).toBe(true);
  });
  afterEach(async () => {
    if (!db) return;
    try {
      await sql`DELETE FROM ops_audit.audit_events WHERE actor_user_identity_id IN (${admin}::uuid,${target}::uuid,${outsider}::uuid)`.execute(db);
      await sql`DELETE FROM ops_audit.idempotency_records WHERE actor_user_identity_id IN (${admin}::uuid,${target}::uuid,${outsider}::uuid)`.execute(db);
      await sql`DELETE FROM iam.platform_role_assignments WHERE user_identity_id IN (${admin}::uuid,${target}::uuid,${outsider}::uuid)`.execute(db);
      await sql`DELETE FROM iam.user_identities WHERE user_identity_id IN (${admin}::uuid,${target}::uuid,${outsider}::uuid)`.execute(db);
    } finally { await db.destroy(); }
  });
  it("proves exact DATA-ONLY permission publication and zero catalog schema delta", async () => {
    const rollback = Symbol("local publication proof rollback");
    await db.transaction().execute(async tx => {
      await restorePreMethodologyFixture(tx);
      // Reconstruct the approved migration26 predecessor, excluding later additive D2 data.
      // Restore the historical predecessor only inside this rolled-back publication test.
      await sql`DELETE FROM iam.role_permissions WHERE permission_id IN (SELECT permission_id FROM iam.permissions WHERE permission_code='platform.tenant_user.onboard')`.execute(tx);
      await sql`DELETE FROM iam.permissions WHERE permission_code='platform.tenant_user.onboard'`.execute(tx);
      await sql`DELETE FROM platform.schema_migrations WHERE migration_id='20261007000100'`.execute(tx);
      await sql`DELETE FROM iam.role_permissions WHERE permission_id IN (SELECT permission_id FROM iam.permissions WHERE permission_code='platform.user_identity.read')`.execute(tx);
      await sql`DELETE FROM iam.permissions WHERE permission_code='platform.user_identity.read'`.execute(tx);
      await sql`DELETE FROM platform.schema_migrations WHERE migration_id='20261006000200'`.execute(tx);
      await sql`DELETE FROM iam.role_permissions WHERE permission_id IN (SELECT permission_id FROM iam.permissions WHERE permission_code='platform.role.administer')`.execute(tx);
      await sql`DELETE FROM iam.permissions WHERE permission_code='platform.role.administer'`.execute(tx);
      await sql`DELETE FROM platform.schema_migrations WHERE migration_id='20261006000100'`.execute(tx);
      const structure = async () => (await sql`SELECT n.nspname,c.relname,c.relkind,a.attname,a.atttypid,a.attnotnull,a.attnum,
        pg_get_expr(d.adbin,d.adrelid) AS default_expression
        FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        LEFT JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
        LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
        WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_%'
        ORDER BY n.nspname,c.relname,a.attnum`.execute(tx)).rows;
      const before = await structure();
      await sql.raw(readFileSync('database/migrations/20261006000100_platform_role_administration_permission_publication.sql', 'utf8')).execute(tx);
      expect(await structure()).toEqual(before);
      const counts = await sql<{ published: number; permission: number; admin: number; tenant: number; other: number }>`SELECT
        (SELECT count(*)::int FROM iam.permissions WHERE lifecycle_state='published') AS published,
        (SELECT count(*)::int FROM iam.permissions WHERE permission_code='platform.role.administer') AS permission,
        (SELECT count(*)::int FROM iam.role_permissions rp JOIN iam.roles r USING(role_id) JOIN iam.permissions p USING(permission_id) WHERE p.permission_code='platform.role.administer' AND r.role_code='PLATFORM_ADMIN') AS admin,
        (SELECT count(*)::int FROM iam.role_permissions rp JOIN iam.roles r USING(role_id) JOIN iam.permissions p USING(permission_id) WHERE p.permission_code='platform.role.administer' AND r.role_code='TENANT_ADMIN') AS tenant,
        (SELECT count(*)::int FROM iam.role_permissions rp JOIN iam.roles r USING(role_id) JOIN iam.permissions p USING(permission_id) WHERE p.permission_code='platform.role.administer' AND r.role_code<>'PLATFORM_ADMIN') AS other`.execute(tx);
      expect(counts.rows[0]).toEqual({ published: 168, permission: 1, admin: 1, tenant: 0, other: 0 });
      throw rollback;
    }).catch(error => { if (error !== rollback) throw error; });
  });
  it("persists grant/revoke history, original replay and reinforced audit with zero tenant effects", async () => {
    const tenantState = () => sql<{ memberships: number; roles: number; grants: number; events: number; bootstrap: number }>`SELECT
      (SELECT count(*)::int FROM iam.tenant_memberships) AS memberships,
      (SELECT count(*)::int FROM iam.membership_roles) AS roles,
      (SELECT count(*)::int FROM iam.role_permissions) AS grants,
      (SELECT count(*)::int FROM ops_audit.outbox_events) AS events,
      (SELECT count(*)::int FROM ops_audit.audit_events WHERE event_code='audit.iam.platform_role_assignment.bootstrap.v1') AS bootstrap`.execute(db);
    const before = (await tenantState()).rows[0];
    const key = newUuidV7(), first = await assign("PLATFORM_SUPPORT", key);
    expect(first.replayed).toBe(false);
    await expect(assign("PLATFORM_SUPPORT")).rejects.toMatchObject({ code: "TCDX.CONFLICT.RESOURCE" });
    expect(await assign("PLATFORM_SUPPORT", key)).toEqual({ assignment: first.assignment, replayed: true });
    await expect(assign("PLATFORM_ADMIN", key)).rejects.toMatchObject({ code: "TCDX.CONFLICT.IDEMPOTENCY" });
    const revokeKey = newUuidV7(), correlation = newUuidV7(), reason = { reason: "Isolated approved revocation" };
    const revoked = await service.revoke(actor, target, first.assignment.platform_role_assignment_id, reason, revokeKey, correlation);
    expect(revoked.assignment.valid_to).not.toBeNull();
    expect(await service.revoke(actor, target, first.assignment.platform_role_assignment_id, reason, revokeKey, newUuidV7())).toEqual({ assignment: revoked.assignment, replayed: true });
    await expect(service.revoke(actor, target, first.assignment.platform_role_assignment_id, reason, newUuidV7(), correlation)).rejects.toMatchObject({ code: "TCDX.LIFECYCLE.TRANSITION_DENIED" });
    // Later state changes must not rewrite the original idempotent result.
    expect(await assign("PLATFORM_SUPPORT", key)).toEqual({ assignment: first.assignment, replayed: true });
    const regrant = await assign(); expect(regrant.assignment.platform_role_assignment_id).not.toBe(first.assignment.platform_role_assignment_id);
    const audits = await sql<{ event_code: string; tenant_id: string | null; after_payload: Record<string, unknown> }>`SELECT event_code,tenant_id,after_payload
      FROM ops_audit.audit_events WHERE aggregate_id=${first.assignment.platform_role_assignment_id}::uuid ORDER BY occurred_at`.execute(db);
    expect(audits.rows).toHaveLength(4);
    expect(audits.rows.filter(r => r.event_code === 'audit.iam.platform_role_assignment.assign.v1')).toHaveLength(1);
    expect(audits.rows.filter(r => r.event_code === 'audit.iam.platform_role_assignment.revoke.v1')).toHaveLength(1);
    expect(audits.rows.every(r => r.tenant_id === null)).toBe(true);
    expect(JSON.stringify(audits.rows.map(row => row.after_payload))).not.toMatch(/password|token|cookie|secret|TOTP/);
    expect((await tenantState()).rows[0]).toEqual(before);
  });
  it("rejects unknown/inactive identities and foreign/inactive role families without partial writes", async () => {
    await expect(service.assign(actor, newUuidV7(), { role_code: "PLATFORM_ADMIN", reason: "Local check" }, newUuidV7(), newUuidV7())).rejects.toMatchObject({ statusCode: 404 });
    await expect(assign("UNKNOWN_PLATFORM_ROLE")).rejects.toMatchObject({ statusCode: 404 });
    await expect(assign("TENANT_ADMIN")).rejects.toMatchObject({ statusCode: 403 });
    await sql`UPDATE iam.user_identities SET lifecycle_state='inactive' WHERE user_identity_id=${target}::uuid`.execute(db);
    await expect(assign()).rejects.toMatchObject({ code: "TCDX.LIFECYCLE.TRANSITION_DENIED" });
    expect((await sql`SELECT * FROM iam.platform_role_assignments WHERE user_identity_id=${target}::uuid`.execute(db)).rows).toHaveLength(0);
    expect((await sql`SELECT * FROM ops_audit.idempotency_records WHERE actor_user_identity_id=${admin}::uuid`.execute(db)).rows).toHaveLength(0);
  });
  it("serializes concurrent duplicate grants into exactly one assignment", async () => {
    const outcomes = await Promise.allSettled([assign(), assign()]);
    expect(outcomes.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const failure = outcomes.find(r => r.status === "rejected") as PromiseRejectedResult;
    expect(failure.reason).toMatchObject({ code: "TCDX.CONFLICT.RESOURCE" });
    expect((await sql`SELECT * FROM iam.platform_role_assignments WHERE user_identity_id=${target}::uuid AND valid_to IS NULL`.execute(db)).rows).toHaveLength(1);
  });
  it("concurrently revokes two administrators while preserving exactly one active authority", async () => {
    await expect(service.revoke(actor, admin, initialAssignment, { reason: "Local last admin check" }, newUuidV7(), newUuidV7())).rejects.toMatchObject({ code: "TCDX.CONFLICT.RESOURCE" });
    const second = await assign("PLATFORM_ADMIN");
    const secondActor = await resolvePlatformActor(db, identity(target));
    const outcomes = await Promise.allSettled([
      service.revoke(actor, admin, initialAssignment, { reason: "Local concurrent self revoke" }, newUuidV7(), newUuidV7()),
      service.revoke(secondActor, target, second.assignment.platform_role_assignment_id, { reason: "Local concurrent self revoke" }, newUuidV7(), newUuidV7())
    ]);
    expect(outcomes.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect((outcomes.find(r => r.status === "rejected") as PromiseRejectedResult).reason).toMatchObject({ code: "TCDX.CONFLICT.RESOURCE" });
    const active = await sql`SELECT DISTINCT user_identity_id FROM iam.platform_role_assignments pa JOIN iam.roles r USING(role_id)
      WHERE r.role_code='PLATFORM_ADMIN' AND pa.valid_to IS NULL`.execute(db);
    expect(active.rows).toHaveLength(1);
  });
  it("enforces HTTP platform-only, default DENY, reason/key and exact command routes", async () => {
    const app = buildApp(async () => true, { database: db, identityVerifier: { verifyBearerToken: async token => identity(token === "local-unauthorized" ? outsider : admin) }, fileStorage: new UnavailableFileStoragePort() });
    try {
      const url = `/api/v1/platform/user-identities/${target}/platform-roles`;
      const headers = { authorization: "Bearer local-actor", "idempotency-key": newUuidV7() };
      const payload = { role_code: "PLATFORM_SUPPORT", reason: "Local HTTP contract check" };
      const projection = await app.inject({ url: '/api/v1/auth/me/authorization', headers });
      expect(projection.statusCode).toBe(200);
      expect(projection.json().platform_permissions).toContain('platform.role.administer');
      expect(projection.json().tenant_permissions).toBeNull();
      for (const [extraHeaders, extraPayload, query, status] of [
        [{ "x-tcdx-tenant-id": newUuidV7() }, {}, "", 403], [{}, { tenant_id: newUuidV7() }, "", 400],
        [{}, {}, `?tenant_id=${newUuidV7()}`, 400], [{}, { reason: " " }, "", 400],
        [{ authorization: "Bearer local-unauthorized" }, {}, "", 403]
      ] as const) {
        const response = await app.inject({ method: "POST", url: url + query, headers: { ...headers, ...extraHeaders }, payload: { ...payload, ...extraPayload } });
        expect(response.statusCode).toBe(status); expect(response.headers['cache-control']).toBe('no-store');
      }
      expect((await app.inject({ method: "POST", url, payload, headers: { "idempotency-key": newUuidV7() } })).statusCode).toBe(401);
      expect((await app.inject({ method: "POST", url, payload, headers: { authorization: headers.authorization } })).statusCode).toBe(400);
      const created = await app.inject({ method: "POST", url, payload, headers }); expect(created.statusCode).toBe(201);
      const replay = await app.inject({ method: "POST", url, payload, headers }); expect(replay.statusCode).toBe(201); expect(replay.headers['idempotency-replayed']).toBe('true');
      const revoke = await app.inject({ method: "POST", url: url + `/${created.json().platform_role_assignment_id}:revoke`, headers: { ...headers, 'idempotency-key': newUuidV7() }, payload: { reason: 'Local HTTP revocation' } });
      expect(revoke.statusCode).toBe(200); expect(revoke.json().valid_to).not.toBeNull();
    } finally { await app.close(); }
  });
  it("uses current post-lock validity even when the transaction predates another admin revocation", async () => {
    const second = await assign('PLATFORM_ADMIN');
    const secondActor = await resolvePlatformActor(db, identity(target));
    const rollback = Symbol('older transaction proof rollback');
    await db.transaction().setIsolationLevel('read committed').execute(async tx => {
      await sql`SELECT transaction_timestamp()`.execute(tx);
      // Close A in a later transaction while the older transaction is still alive.
      await service.revoke(actor, admin, initialAssignment, { reason: 'Local later transaction revoke' }, newUuidV7(), newUuidV7());
      // Exercise the identical service inside the already-started real transaction.
      const existingTransaction = { transaction: () => ({ setIsolationLevel: () => ({
        execute: (fn: (transaction: Transaction<FoundationDatabase>) => Promise<unknown>) => fn(tx)
      }) }) } as unknown as Kysely<FoundationDatabase>;
      const oldTransactionService = new PlatformRoleService(existingTransaction);
      await expect(oldTransactionService.revoke(secondActor, target, second.assignment.platform_role_assignment_id,
        { reason: 'Local older transaction last admin check' }, newUuidV7(), newUuidV7())).rejects.toMatchObject({ code: 'TCDX.CONFLICT.RESOURCE' });
      // Also refuse a grant from A's now-revoked persisted authority.
      await expect(oldTransactionService.assign(actor, outsider, { role_code: 'PLATFORM_SUPPORT', reason: 'Local stale actor check' }, newUuidV7(), newUuidV7()))
        .rejects.toMatchObject({ code: 'TCDX.AUTHORIZATION.DENIED' });
      throw rollback;
    }).catch(error => { if (error !== rollback) throw error; });
    expect((await resolvePlatformActor(db, identity(target))).permissions.has('platform.role.administer')).toBe(true);
  });
});
