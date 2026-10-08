import { restorePreMethodologyFixture } from "./methodology-predecessor-fixture.js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { buildApp } from "../app.js";
import { createDatabase, sql } from "../database.js";
import { loadConfig } from "../config.js";
import { UnavailableFileStoragePort } from "../ports/file-storage.js";
import { newUuidV7 } from "../uuid.js";
import { canonicalIdentityKey } from "./oidc-browser.js";
import { resolvePlatformActor } from "./platform-authority.js";
import { membershipCreate, subscriptionCreate, tenantBootstrap, tenantCreate } from "./platform-iam-service.js";
import { UserIdentityDiscovery, type IdentityDiscoveryMetadataPort } from "./user-identity-discovery.js";
import { TenantInitialOnboarding } from "./tenant-initial-onboarding.js";
import * as records from "../persistence/foundation-records.js";
import { resolveTenantActor } from "../core-grc/security.js";
import { ManagedIdentityService } from "./managed-identity-service.js";
import type { ManagedUserAdminPort } from "./keycloak-managed-user-adapter.js";

describe.skipIf(process.env.TCDX_SECURITY_INTEGRATION !== "true")("D2 isolated PostgreSQL onboarding/privacy/transactions", () => {
  let db: ReturnType<typeof createDatabase>;
  let discovery: UserIdentityDiscovery, onboarding: TenantInitialOnboarding;
  const ids = { platform: newUuidV7(), admin: newUuidV7(), managed: newUuidV7(), other: newUuidV7(), inactive: newUuidV7(), duplicate: newUuidV7() };
  const keys = Object.fromEntries(Object.entries(ids).map(([name, id]) => [name, canonicalIdentityKey(
    name === "managed" ? "https://iam.grc.tecdex.net/realms/tcdx-managed-identity" : "https://isolated-provider.example.test", id)]));
  const identities = Object.values(ids);
  const provider = new Map([[keys.managed!, { username: "d2.managed", provider: "tcdx-managed-identity", provider_display: "Tecdex Managed Identity", eligible: true }]]);
  const metadata: IdentityDiscoveryMetadataPort = { discoveryMetadata: vi.fn(async () => provider) };
  const identity = (id: string) => ({ principalClass: "HUMAN_INTERACTIVE" as const, principalId: id, tokenId: newUuidV7(), expiresAt: new Date(Date.now() + 60000) });
  const tenantInput = () => ({ tenant_code: `D2-${newUuidV7().slice(-12)}`, legal_name: "D2 Isolated Company", display_name: "D2 Isolated Company", default_timezone: "America/Santiago" });
  const input = (target = ids.admin, kind = "existing_identity") => ({ tenant: tenantInput(), initial_administrator: { kind, user_identity_id: target } });
  const create = (request = input(), key = newUuidV7()) => onboarding.create(identity(ids.platform), undefined, request, key, newUuidV7());
  const lookup = (actor = ids.platform, tenant: string | undefined = undefined, query: Record<string, unknown> = { mode: "platform_search", criterion: "display_name", value: "D2" }) =>
    discovery.discover(identity(actor), tenant, query, newUuidV7());
  const exact = (value: string, criterion = "email") => ({ mode: "tenant_exact", criterion, value });
  let tenant: string, adminMembership: string;

  beforeAll(async () => {
    if (process.env.DATABASE_HOST !== "127.0.0.1" || process.env.DATABASE_PORT !== "55432" || process.env.TCDX_ISOLATED_REBUILD !== "true") throw new Error("D2_REQUIRES_ISOLATED_POSTGRES");
    db = createDatabase(loadConfig(process.env)); discovery = new UserIdentityDiscovery(db, metadata); onboarding = new TenantInitialOnboarding(db, metadata);
    for (const [name, id] of Object.entries(ids)) {
      await sql`INSERT INTO iam.user_identities (user_identity_id,identity_key,display_name,email_normalized,lifecycle_state)
        VALUES (${id}::uuid,${keys[name]},${`D2 ${name}`},${name === "duplicate" ? "ambiguous@example.test" : `${name}@example.test`},${name === "inactive" ? "suspended" : "active"})`.execute(db);
    }
    const role = (await sql<{ role_id: string }>`SELECT role_id FROM iam.roles WHERE role_code='PLATFORM_ADMIN' AND ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL AND is_baseline AND lifecycle_state='published'`.execute(db)).rows[0]!;
    await sql`INSERT INTO iam.platform_role_assignments (platform_role_assignment_id,ownership_class,user_identity_id,role_id,valid_from)
      VALUES (${newUuidV7()}::uuid,'PLATFORM_CONTROL',${ids.platform}::uuid,${role.role_id}::uuid,statement_timestamp()-interval '1 second')`.execute(db);
    const created = await create(); tenant = created.result.tenant_id; adminMembership = created.result.membership_id!;
    const plan = (await sql<{ plan_version_id: string }>`SELECT pv.plan_version_id FROM platform.plan_versions pv JOIN platform.plans p USING(plan_id)
      WHERE p.plan_code='ISO' AND pv.lifecycle_state='published' LIMIT 1`.execute(db)).rows[0]!;
    await db.transaction().execute(async (tx) => subscriptionCreate(tx, await resolvePlatformActor(tx, identity(ids.platform)), {
      body: { tenant_id: tenant, plan_version_id: plan.plan_version_id, subscription_code: `D2-${newUuidV7()}` }, key: newUuidV7(), correlationId: newUuidV7()
    }));
  });

  afterAll(async () => {
    if (!db) return;
    try {
      const tenants = (await sql<{ tenant_id: string }>`SELECT tenant_id FROM platform.tenants WHERE created_by_user_identity_id=${ids.platform}::uuid`.execute(db)).rows.map((row) => row.tenant_id);
      await sql`DELETE FROM ops_audit.audit_events WHERE actor_user_identity_id=ANY(${identities}::uuid[])`.execute(db);
      await sql`DELETE FROM ops_audit.outbox_events WHERE actor_user_identity_id=ANY(${identities}::uuid[])`.execute(db);
      await sql`DELETE FROM ops_audit.idempotency_records WHERE actor_user_identity_id=ANY(${identities}::uuid[])`.execute(db);
      for (const table of ["iam.membership_roles", "iam.role_permissions", "iam.tenant_memberships", "iam.roles", "platform.subscriptions"]) {
        await sql`DELETE FROM ${sql.table(table)} WHERE tenant_id=ANY(${tenants}::uuid[])`.execute(db);
      }
      await sql`DELETE FROM platform.tenants WHERE tenant_id=ANY(${tenants}::uuid[])`.execute(db);
      await sql`DELETE FROM iam.platform_role_assignments WHERE user_identity_id=ANY(${identities}::uuid[])`.execute(db);
      await sql`DELETE FROM iam.user_identities WHERE user_identity_id=ANY(${identities}::uuid[])`.execute(db);
    } finally { await db.destroy(); }
  });

  it("publishes exactly one physical Permission, approved template/tenant grants and no schema delta", async () => {
    const rollback = Symbol("rollback isolated data publication proof");
    await db.transaction().execute(async (tx) => {
      await restorePreMethodologyFixture(tx);
      const structure = async () => (await sql`SELECT n.nspname,c.relname,c.relkind,a.attname,a.atttypid,a.attnotnull,a.attnum,pg_get_expr(d.adbin,d.adrelid) AS default_expression
        FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
        LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' ORDER BY 1,2,7`.execute(tx)).rows;
      const before = await structure();
      // Restore the historical predecessor only inside this rolled-back publication test.
      await sql`DELETE FROM iam.role_permissions WHERE permission_id IN (SELECT permission_id FROM iam.permissions WHERE permission_code='platform.tenant_user.onboard')`.execute(tx);
      await sql`DELETE FROM iam.permissions WHERE permission_code='platform.tenant_user.onboard'`.execute(tx);
      await sql`DELETE FROM platform.schema_migrations WHERE migration_id='20261007000100'`.execute(tx);
      await sql`DELETE FROM iam.role_permissions WHERE permission_id IN (SELECT permission_id FROM iam.permissions WHERE permission_code='platform.user_identity.read')`.execute(tx);
      await sql`DELETE FROM iam.permissions WHERE permission_code='platform.user_identity.read'`.execute(tx);
      await sql`DELETE FROM platform.schema_migrations WHERE migration_id='20261006000200'`.execute(tx);
      await sql.raw(readFileSync('database/migrations/20261006000200_user_identity_discovery_permission_publication.sql','utf8')).execute(tx);
      expect(await structure()).toEqual(before);
      const counts = (await sql<{ published: number; definition: number; platform: number; template: number; own: number; unauthorized: number }>`SELECT
        (SELECT count(*)::int FROM iam.permissions WHERE lifecycle_state='published') AS published,
        (SELECT count(*)::int FROM iam.permissions WHERE permission_code='platform.user_identity.read') AS definition,
        count(*) FILTER (WHERE r.role_code='PLATFORM_ADMIN')::int AS platform,
        count(*) FILTER (WHERE r.role_code='TENANT_ADMIN' AND r.ownership_class='PLATFORM_CONTROL')::int AS template,
        count(*) FILTER (WHERE r.role_code='TENANT_ADMIN' AND r.ownership_class='TENANT_OWNED' AND r.tenant_id=${tenant}::uuid)::int AS own,
        count(*) FILTER (WHERE r.role_code NOT IN ('PLATFORM_ADMIN','TENANT_ADMIN') OR NOT r.is_baseline OR rp.ownership_class<>r.ownership_class OR rp.tenant_id IS DISTINCT FROM r.tenant_id)::int AS unauthorized
        FROM iam.role_permissions rp JOIN iam.roles r USING(role_id) JOIN iam.permissions p USING(permission_id) WHERE p.permission_code='platform.user_identity.read'`.execute(tx)).rows[0];
      expect(counts).toEqual({ published: 169, definition: 1, platform: 1, template: 1, own: 1, unauthorized: 0 });
      throw rollback;
    }).catch((error) => { if (error !== rollback) throw error; });
  });

  it("allows Platform global safe projection; provider binding is canonical issuer+subject, never email", async () => {
    const page = await lookup(); expect(page.items.length).toBeGreaterThan(1);
    const managed = page.items.find((row) => row.user_identity_id === ids.managed)!;
    expect(managed.provider).toBe("tcdx-managed-identity"); expect(managed.username).toBe("d2.managed");
    expect(page.items.find((row) => row.user_identity_id === ids.admin)!.provider).toBeNull();
    expect(JSON.stringify(page)).not.toMatch(/identity_key|subject|issuer|reconciliation|credential|mfa|attributes|requiredActions|enabled/);
    expect((await lookup(ids.platform, undefined, { mode: "platform_search", criterion: "username", value: "d2.managed" })).items[0]!.user_identity_id).toBe(ids.managed);
    expect((await lookup(ids.platform, undefined, { mode: "platform_search", criterion: "email", value: "managed@example.test" })).items[0]!.user_identity_id).toBe(ids.managed);
  });
  it("supports deterministic filtered pagination and rejects a cursor from another lookup", async () => {
    const query = { mode: "platform_search", criterion: "display_name", value: "D2", "page[size]": "1" };
    const first = await lookup(ids.platform, undefined, query); expect(first.meta.has_more).toBe(true);
    const second = await lookup(ids.platform, undefined, { ...query, "page[cursor]": first.meta.next_cursor });
    expect(second.items[0]!.user_identity_id).not.toBe(first.items[0]!.user_identity_id);
    await expect(lookup(ids.platform, undefined, { ...query, value: "Other", "page[cursor]": first.meta.next_cursor })).rejects.toMatchObject({ statusCode: 400 });
    expect((await lookup(ids.platform, undefined, { mode: "platform_search", criterion: "display_name", value: "%" })).items).toEqual([]);
  });
  it("authorizes own tenant exact lookup and omits supplied email/username from its response/audit", async () => {
    const result = await lookup(ids.admin, tenant, exact("managed@example.test"));
    expect(result.items).toEqual([{ user_identity_id: ids.managed, display_name: "D2 managed", provider: "tcdx-managed-identity", provider_display: "Tecdex Managed Identity", lifecycle_state: "active" }]);
    expect(result.meta).toEqual({ has_more: false, next_cursor: null });
    const audit = (await sql<{ after_payload: object; ownership_class: string; tenant_id: string }>`SELECT after_payload,ownership_class,tenant_id FROM ops_audit.audit_events
      WHERE actor_user_identity_id=${ids.admin}::uuid AND command_code='userIdentityDiscovery' ORDER BY occurred_at DESC LIMIT 1`.execute(db)).rows[0]!;
    expect(audit.ownership_class).toBe("TENANT_OWNED"); expect(audit.tenant_id).toBe(tenant);
    expect(JSON.stringify(audit.after_payload)).not.toContain("managed@example.test");
    expect(JSON.stringify(audit.after_payload)).not.toMatch(/identity_key|subject|credential|lookup_value|username.*d2.managed/);
  });
  it.each([
    ["no membership", "other", "own"], ["wrong tenant", "admin", "foreign"], ["missing context", "admin", "missing"], ["platform without membership", "platform", "own"]
  ])("denies tenant discovery before provider lookup: %s", async (_label, name, context) => {
    const before = vi.mocked(metadata.discoveryMetadata).mock.calls.length;
    await expect(lookup(ids[name as keyof typeof ids], context === "own" ? tenant : context === "foreign" ? newUuidV7() : undefined, exact("managed@example.test"))).rejects.toMatchObject({ statusCode: 403 });
    expect(vi.mocked(metadata.discoveryMetadata).mock.calls.length).toBe(before);
  });
  it("denies Tenant Admin global mode even with no context header and refuses a Platform context header", async () => {
    await expect(lookup(ids.admin)).rejects.toMatchObject({ statusCode: 403 });
    await expect(lookup(ids.platform, tenant)).rejects.toMatchObject({ statusCode: 403 });
  });
  it("denies an active own Membership with a non-admin role and denies missing entitlement", async () => {
    const actor = await resolveTenantActor(db, identity(ids.admin), tenant);
    const membership = await db.transaction().execute((tx) => membershipCreate(tx, actor, {
      body: { user_identity_id: ids.other }, key: newUuidV7(), correlationId: newUuidV7()
    }));
    try {
      await expect(lookup(ids.other, tenant, exact("managed@example.test"))).rejects.toMatchObject({ statusCode: 403 });
    } finally { await sql`DELETE FROM iam.tenant_memberships WHERE tenant_membership_id=${membership.result.tenant_membership_id}::uuid`.execute(db); }
    await sql`UPDATE platform.subscriptions SET lifecycle_state='suspended' WHERE tenant_id=${tenant}::uuid`.execute(db);
    try { await expect(lookup(ids.admin, tenant, exact("managed@example.test"))).rejects.toMatchObject({ statusCode: 403 }); }
    finally { await sql`UPDATE platform.subscriptions SET lifecycle_state='active' WHERE tenant_id=${tenant}::uuid`.execute(db); }
  });
  it.each([
    { value: "", criterion: "username" }, { value: "d2.*", criterion: "username" }, { value: "d2.%", criterion: "username" },
    { value: "D2", criterion: "display_name" }, { value: "d2.managed", criterion: "username", "page[size]": "1" },
    { value: "d2.managed", criterion: "username", prefix: "true" }, { value: "d2.managed", criterion: "username", fuzzy: "true" },
    { value: "d2.managed", criterion: "username", autocomplete: "true" }
  ])("rejects tenant enumeration shape %#", async (query) => {
    await expect(lookup(ids.admin, tenant, { mode: "tenant_exact", ...query })).rejects.toMatchObject({ statusCode: 400 });
  });
  it("has identical empty responses for absent, inactive, ineligible and ambiguous exact targets", async () => {
    const empty = await lookup(ids.admin, tenant, exact("missing@example.test"));
    expect(await lookup(ids.admin, tenant, exact("inactive@example.test"))).toEqual(empty);
    provider.get(keys.managed!)!.eligible = false;
    try { expect(await lookup(ids.admin, tenant, exact("managed@example.test"))).toEqual(empty); }
    finally { provider.get(keys.managed!)!.eligible = true; }
    await sql`UPDATE iam.user_identities SET email_normalized='ambiguous@example.test' WHERE user_identity_id=${ids.other}::uuid`.execute(db);
    try { expect(await lookup(ids.admin, tenant, exact("ambiguous@example.test"))).toEqual(empty); }
    finally { await sql`UPDATE iam.user_identities SET email_normalized='other@example.test' WHERE user_identity_id=${ids.other}::uuid`.execute(db); }
    expect((await lookup(ids.admin, tenant, exact("d2.man", "username"))).items).toEqual([]);
    expect((await lookup(ids.admin, tenant, exact("D2.MANAGED", "username"))).items).toEqual([]);
  });
  it("returns only own existing active Membership; inactive conflicts are not reactivated", async () => {
    const own = await lookup(ids.admin, tenant, exact("admin@example.test"));
    expect(own.items[0]!.existing_membership_id).toBe(adminMembership);
    await db.transaction().execute(async (tx) => {
      const actor = await resolvePlatformActor(tx, identity(ids.platform));
      // Other identity's membership is a controlled fixture, not an implicit Platform grant.
      await sql`INSERT INTO iam.tenant_memberships (tenant_membership_id,tenant_id,user_identity_id,membership_state,joined_at)
        VALUES (${newUuidV7()}::uuid,${tenant}::uuid,${ids.managed}::uuid,'suspended',transaction_timestamp())`.execute(tx);
      expect(actor.roles).toContain("PLATFORM_ADMIN");
    });
    expect((await lookup(ids.admin, tenant, exact("managed@example.test"))).items).toEqual([]);
    await sql`DELETE FROM iam.tenant_memberships WHERE tenant_id=${tenant}::uuid AND user_identity_id=${ids.managed}::uuid`.execute(db);
  });
  it("provider/audit dependency failures cannot masquerade as empty200", async () => {
    vi.mocked(metadata.discoveryMetadata).mockRejectedValueOnce(new Error("isolated dependency failure"));
    await expect(lookup(ids.admin, tenant, exact("managed@example.test"))).rejects.toMatchObject({ statusCode: 503 });
    await expect(new UserIdentityDiscovery(db).discover(identity(ids.platform), undefined,
      { mode: "platform_search", criterion: "email", value: "managed@example.test" }, newUuidV7())).rejects.toMatchObject({ statusCode: 503 });
    const audit = vi.spyOn(records, "persistAuditEvent").mockRejectedValueOnce(new Error("isolated audit unavailable"));
    try { await expect(lookup(ids.admin, tenant, exact("managed@example.test"))).rejects.toMatchObject({ statusCode: 503 }); }
    finally { audit.mockRestore(); }
  });

  it("creates company,22 canonical roles and exactly one first Tenant Admin without subscription/actor authority", async () => {
    const created = await create(input(ids.managed, "provisioned_managed_identity"));
    expect(created.result.completed_steps).toEqual(["tenant_create", "tenant_bootstrap"]); expect(created.result.pending_steps).toEqual([]);
    const counts = (await sql<{ roles: number; memberships: number; admins: number; actor_memberships: number; actor_roles: number; subscriptions: number }>`SELECT
      (SELECT count(*)::int FROM iam.roles WHERE tenant_id=${created.result.tenant_id}::uuid AND is_baseline) AS roles,
      (SELECT count(*)::int FROM iam.tenant_memberships WHERE tenant_id=${created.result.tenant_id}::uuid) AS memberships,
      (SELECT count(*)::int FROM iam.membership_roles mr JOIN iam.roles r USING(role_id) WHERE mr.tenant_id=${created.result.tenant_id}::uuid AND r.role_code='TENANT_ADMIN') AS admins,
      (SELECT count(*)::int FROM iam.tenant_memberships WHERE user_identity_id=${ids.platform}::uuid) AS actor_memberships,
      (SELECT count(*)::int FROM iam.membership_roles mr JOIN iam.tenant_memberships m USING(tenant_membership_id) WHERE m.user_identity_id=${ids.platform}::uuid) AS actor_roles,
      (SELECT count(*)::int FROM platform.subscriptions WHERE tenant_id=${created.result.tenant_id}::uuid) AS subscriptions`.execute(db)).rows[0];
    expect(counts).toEqual({ roles: 22, memberships: 1, admins: 1, actor_memberships: 0, actor_roles: 0, subscriptions: 0 });
    const codes = (await sql<{ role_code: string }>`SELECT role_code FROM iam.roles WHERE tenant_id=${created.result.tenant_id}::uuid AND is_baseline ORDER BY role_code`.execute(db)).rows;
    const templates = (await sql<{ role_code: string }>`SELECT role_code FROM iam.roles WHERE ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL AND is_baseline AND role_code NOT IN ('PLATFORM_ADMIN','PLATFORM_SUPPORT') ORDER BY role_code`.execute(db)).rows;
    expect(codes).toEqual(templates);
    await expect(lookup(ids.admin, created.result.tenant_id, exact("other@example.test"))).rejects.toMatchObject({ statusCode: 403 });
    await expect(lookup(ids.managed, created.result.tenant_id, exact("admin@example.test"))).rejects.toMatchObject({ statusCode: 403 });
    const actor = await resolvePlatformActor(db, identity(ids.platform));
    await expect(db.transaction().execute((tx) => membershipCreate(tx, {
      runtimeEnvironment: "test", tenantId: created.result.tenant_id, membershipId: created.result.membership_id!, userIdentityId: ids.managed,
      permissions: new Set(["platform.membership.create"]), permissionScopes: new Map([["platform.membership.create", new Set(["tenant" as const])]]),
      scopes: new Set(["tenant" as const]), roles: ["TENANT_ADMIN"], capabilityGroups: new Set()
    }, { body: { user_identity_id: ids.other }, key: newUuidV7(), correlationId: newUuidV7() }))).rejects.toMatchObject({ statusCode: 403 });
    expect(actor.permissions.has("platform.managed_identity.create")).toBe(true);
  });
  it("replays exact completed intent with no duplicate rows/audit/outbox; altered payload conflicts", async () => {
    const request = input(), key = newUuidV7(); const first = await create(request, key);
    const count = async () => (await sql`SELECT
      (SELECT count(*) FROM iam.roles) AS roles,(SELECT count(*) FROM iam.role_permissions) AS grants,
      (SELECT count(*) FROM iam.tenant_memberships) AS memberships,(SELECT count(*) FROM iam.membership_roles) AS assignments,
      (SELECT count(*) FROM ops_audit.audit_events) AS audit,(SELECT count(*) FROM ops_audit.outbox_events) AS outbox`.execute(db)).rows;
    const before = await count(); expect(await create(request, key)).toEqual({ ...first, replayed: true }); expect(await count()).toEqual(before);
    await expect(create({ ...request, tenant: { ...request.tenant, display_name: "Changed" } }, key)).rejects.toMatchObject({ code: "TCDX.CONFLICT.IDEMPOTENCY" });
  });
  it("serializes simultaneous same-intent attempts and keeps one company/admin", async () => {
    const request = input(), key = newUuidV7(); const attempts = await Promise.allSettled([create(request, key), create(request, key)]);
    expect(attempts.some((result) => result.status === "fulfilled")).toBe(true);
    for (const result of attempts) if (result.status === "rejected") expect(result.reason).toMatchObject({ statusCode: 409, retryable: true });
    const completed = await create(request, key); expect(completed.replayed).toBe(true);
    expect((await sql<{ count: number }>`SELECT count(*)::int AS count FROM platform.tenants WHERE tenant_code=${request.tenant.tenant_code}`.execute(db)).rows[0]!.count).toBe(1);
  });
  it("returns retryable409 for an actively held claim lock without creating a company", async () => {
    const request = input(), key = newUuidV7();
    const lock = createHash("sha256").update(`tenantInitialOnboardingCreate\0${ids.platform}\0${key}`).digest().readBigInt64BE(0).toString();
    await db.connection().execute(async (connection) => {
      await sql`SELECT pg_advisory_lock(${lock}::bigint)`.execute(connection);
      try { await expect(create(request, key)).rejects.toMatchObject({ code: "TCDX.CONFLICT.RESOURCE", statusCode: 409, retryable: true }); }
      finally { await sql`SELECT pg_advisory_unlock(${lock}::bigint)`.execute(connection); }
    });
    expect((await sql<{ count: number }>`SELECT count(*)::int AS count FROM platform.tenants WHERE tenant_code=${request.tenant.tenant_code}`.execute(db)).rows[0]!.count).toBe(0);
  });
  it("rolls back bootstrap authority if parent completion audit fails, preserving only the child checkpoint", async () => {
    const request = input(ids.managed, "provisioned_managed_identity"), key = newUuidV7();
    const realAudit = records.persistAuditEvent;
    const audit = vi.spyOn(records, "persistAuditEvent").mockImplementation(async (tx, record) => {
      if (record.commandCode === "tenantInitialOnboardingCreate" && record.outcome === "success") throw new Error("isolated parent audit fault");
      await realAudit(tx, record);
    });
    try { await expect(create(request, key)).rejects.toMatchObject({ statusCode: 503, details: { onboarding_progress: { completed_steps: ["tenant_create"], pending_steps: ["tenant_bootstrap"] } } }); }
    finally { audit.mockRestore(); }
    const partial = (await sql<{ tenant_id: string }>`SELECT tenant_id FROM platform.tenants WHERE tenant_code=${request.tenant.tenant_code}`.execute(db)).rows[0]!.tenant_id;
    const authority = (await sql<{ roles: number; memberships: number; assignments: number }>`SELECT
      (SELECT count(*)::int FROM iam.roles WHERE tenant_id=${partial}::uuid) AS roles,
      (SELECT count(*)::int FROM iam.tenant_memberships WHERE tenant_id=${partial}::uuid) AS memberships,
      (SELECT count(*)::int FROM iam.membership_roles WHERE tenant_id=${partial}::uuid) AS assignments`.execute(db)).rows[0];
    expect(authority).toEqual({ roles: 0, memberships: 0, assignments: 0 });
    const completed = await create(request, key); expect(completed.result.tenant_id).toBe(partial);
    expect(JSON.stringify(completed)).not.toMatch(/credential|password|totp|subject|issuer/);
    expect((await sql<{ count: number }>`SELECT count(*)::int AS count FROM iam.user_identities WHERE user_identity_id=${ids.managed}::uuid`.execute(db)).rows[0]!.count).toBe(1);
  });
  it("persists company/admin-pending checkpoint, rolls back late bootstrap failure and resumes only pending work", async () => {
    const request = input(), key = newUuidV7();
    await sql`UPDATE iam.roles SET lifecycle_state='draft' WHERE role_code='TENANT_ADMIN' AND ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL`.execute(db);
    let partialTenant: string;
    try {
      await expect(create(request, key)).rejects.toMatchObject({ statusCode: 422, details: { onboarding_progress: { completed_steps: ["tenant_create"], pending_steps: ["tenant_bootstrap"] } } });
      partialTenant = (await sql<{ tenant_id: string }>`SELECT tenant_id FROM platform.tenants WHERE tenant_code=${request.tenant.tenant_code}`.execute(db)).rows[0]!.tenant_id;
    } finally { await sql`UPDATE iam.roles SET lifecycle_state='published' WHERE role_code='TENANT_ADMIN' AND ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL`.execute(db); }
    await sql`INSERT INTO iam.tenant_memberships (tenant_membership_id,tenant_id,user_identity_id,membership_state,joined_at)
      VALUES (${newUuidV7()}::uuid,${partialTenant!}::uuid,${ids.admin}::uuid,'suspended',transaction_timestamp())`.execute(db);
    await expect(create(request, key)).rejects.toMatchObject({ statusCode: 403, details: { onboarding_progress: { tenant_id: partialTenant! } } });
    expect((await sql<{ count: number }>`SELECT count(*)::int AS count FROM iam.roles WHERE tenant_id=${partialTenant!}::uuid`.execute(db)).rows[0]!.count).toBe(0);
    await sql`DELETE FROM iam.tenant_memberships WHERE tenant_id=${partialTenant!}::uuid`.execute(db);
    // Isolated canonical fixture: catalog already initialized and one valid Membership survives.
    const templates = (await sql<{ role_id: string; role_code: string; name: string }>`SELECT role_id,role_code,name FROM iam.roles
      WHERE ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL AND is_baseline AND lifecycle_state='published'
        AND role_code NOT IN ('PLATFORM_ADMIN','PLATFORM_SUPPORT') ORDER BY role_code`.execute(db)).rows;
    const materialized = new Map<string, string>();
    for (const template of templates) {
      const roleId = newUuidV7(); materialized.set(template.role_id, roleId);
      await sql`INSERT INTO iam.roles (role_id,ownership_class,tenant_id,role_code,name,is_baseline,lifecycle_state)
        VALUES (${roleId}::uuid,'TENANT_OWNED',${partialTenant!}::uuid,${template.role_code},${template.name},TRUE,'published')`.execute(db);
    }
    const grants = (await sql<{ role_id: string; permission_id: string }>`SELECT role_id,permission_id FROM iam.role_permissions
      WHERE ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL AND role_id=ANY(${templates.map((row) => row.role_id)}::uuid[])`.execute(db)).rows;
    await sql`INSERT INTO iam.role_permissions (role_permission_id,ownership_class,tenant_id,role_id,permission_id) VALUES
      ${sql.join(grants.map((grant) => sql`(${newUuidV7()}::uuid,'TENANT_OWNED',${partialTenant!}::uuid,${materialized.get(grant.role_id)}::uuid,${grant.permission_id}::uuid)`))}`.execute(db);
    const membershipId = newUuidV7();
    await sql`INSERT INTO iam.tenant_memberships (tenant_membership_id,tenant_id,user_identity_id,membership_state,joined_at)
      VALUES (${membershipId}::uuid,${partialTenant!}::uuid,${ids.admin}::uuid,'active',transaction_timestamp())`.execute(db);
    await expect(sql`INSERT INTO iam.tenant_memberships (tenant_membership_id,tenant_id,user_identity_id,membership_state,joined_at)
      VALUES (${newUuidV7()}::uuid,${partialTenant!}::uuid,${ids.admin}::uuid,'active',transaction_timestamp())`.execute(db)).rejects.toMatchObject({ code: "23505" });
    const recovered = await create(request, key); expect(recovered.result.tenant_id).toBe(partialTenant!);
    expect(recovered.result.membership_id).toBe(membershipId);
    expect((await sql<{ count: number }>`SELECT count(*)::int AS count FROM iam.roles WHERE tenant_id=${partialTenant!}::uuid AND is_baseline`.execute(db)).rows[0]!.count).toBe(templates.length);
    const replay = await create(request, key); expect(replay.replayed).toBe(true);
    expect((await sql<{ count: number }>`SELECT count(*)::int AS count FROM ops_audit.outbox_events WHERE aggregate_id=${partialTenant!}::uuid AND event_type='platform.tenant.provisioned.v1'`.execute(db)).rows[0]!.count).toBe(1);
  });
  it("cannot adopt a separately created child intent or bootstrap an arbitrary existing tenant", async () => {
    const request = input(), key = newUuidV7();
    await db.transaction().execute(async (tx) => tenantCreate(tx, await resolvePlatformActor(tx, identity(ids.platform)), { body: request.tenant, key, correlationId: newUuidV7() }));
    await expect(create(request, key)).rejects.toMatchObject({ statusCode: 409 });
    await expect(create({ ...request, tenant_id: tenant } as ReturnType<typeof input>)).rejects.toMatchObject({ statusCode: 400 });
  });
  it("rejects a new key against the same business company without adopting its authority", async () => {
    const request = input(); await create(request);
    await expect(create(request)).rejects.toMatchObject({ code: "TCDX.CONFLICT.RESOURCE", statusCode: 409 });
  });
  it.each(["self", "inactive", "missing", "wrong managed kind"])("rejects %s before creating a company", async (kind) => {
    const request = input(kind === "self" ? ids.platform : kind === "inactive" ? ids.inactive : kind === "missing" ? newUuidV7() : ids.other,
      kind === "wrong managed kind" ? "provisioned_managed_identity" : "existing_identity");
    await expect(create(request)).rejects.toMatchObject({ statusCode: kind === "inactive" || kind === "missing" ? 404 : 403 });
    expect((await sql<{ count: number }>`SELECT count(*)::int AS count FROM platform.tenants WHERE tenant_code=${request.tenant.tenant_code}`.execute(db)).rows[0]!.count).toBe(0);
  });
  it("internal bootstrap cannot establish another target or reopen after first admin revocation", async () => {
    const request = input(), first = await create(request); const actor = await resolvePlatformActor(db, identity(ids.platform));
    await expect(tenantBootstrap(db, actor, { tenantId: first.result.tenant_id, userIdentityId: ids.other, correlationId: newUuidV7() })).rejects.toMatchObject({ statusCode: 422 });
    const replay = await tenantBootstrap(db, actor, { tenantId: first.result.tenant_id, userIdentityId: ids.admin, correlationId: newUuidV7() }); expect(replay.replayed).toBe(true);
    await sql`UPDATE iam.membership_roles SET valid_to=statement_timestamp() WHERE membership_role_id=${first.result.initial_assignment_id}::uuid`.execute(db);
    await expect(tenantBootstrap(db, actor, { tenantId: first.result.tenant_id, userIdentityId: ids.admin, correlationId: newUuidV7() })).rejects.toMatchObject({ statusCode: 422 });
  });
  it("binds public routes exactly, has no bootstrap route, uses no-store on success/error and authenticates", async () => {
    let current = ids.platform;
    const forbiddenMutation = vi.fn(async () => { throw new Error("D2 forbids provider mutations"); });
    const port: ManagedUserAdminPort = { listManagedUsers: async (first) => first === 0 ? [{ id: ids.managed, username: "d2.managed",
      enabled: true, requiredActions: ["UPDATE_PASSWORD", "CONFIGURE_TOTP"], attributes: {}, mfaEnrolled: false }] : [],
      getManagedUser: async () => null, createManagedUser: forbiddenMutation, setManagedUserEnabled: forbiddenMutation,
      setTemporaryPassword: forbiddenMutation, removeManagedUserTotpCredential: forbiddenMutation, revokeManagedUserSessions: forbiddenMutation };
    const service = new ManagedIdentityService(db, port, forbiddenMutation);
    const app = buildApp(async () => true, { database: db, identityVerifier: { verifyBearerToken: async () => identity(current) }, fileStorage: new UnavailableFileStoragePort() },
      undefined, undefined, undefined, service);
    try {
      const request = input();
      const done = await app.inject({ method: "POST", url: "/api/v1/platform/tenants:initial-onboarding", headers: { authorization: "Bearer isolated-fixture", "idempotency-key": newUuidV7() }, payload: request });
      expect(done.statusCode).toBe(201); expect(done.headers["cache-control"]).toBe("no-store");
      expect(JSON.stringify(done.json())).not.toMatch(/credential|password|subject|issuer|token|seed/);
      expect((await app.inject({ method: "POST", url: "/api/v1/platform/tenants:arbitrary-bootstrap", payload: request })).statusCode).toBe(404);
      expect((await app.inject({ method: "POST", url: `/api/v1/platform/tenants/${tenant}:bootstrap-first-admin`, payload: {} })).statusCode).toBe(404);
      const unauthenticated = await app.inject({ method: "GET", url: "/api/v1/user-identities?mode=platform_search&criterion=email&value=admin%40example.test" });
      expect(unauthenticated.statusCode).toBe(401); expect(unauthenticated.headers["cache-control"]).toBe("no-store");
      const positive = await app.inject({ method: "GET", url: "/api/v1/user-identities?mode=platform_search&criterion=username&value=d2.managed", headers: { authorization: "Bearer isolated-fixture" } });
      expect(positive.statusCode).toBe(200); expect(positive.json().items[0].user_identity_id).toBe(ids.managed);
      expect(positive.headers["cache-control"]).toBe("no-store"); expect(forbiddenMutation).not.toHaveBeenCalled();
      current = ids.admin;
      const deniedCommand = await app.inject({ method: "POST", url: "/api/v1/platform/tenants:initial-onboarding?tenant_id=untrusted",
        headers: { authorization: "Bearer isolated-fixture", "idempotency-key": newUuidV7() }, payload: request });
      expect(deniedCommand.statusCode).toBe(403);
      const denied = await app.inject({ method: "GET", url: "/api/v1/user-identities?mode=platform_search&criterion=email&value=admin%40example.test", headers: { authorization: "Bearer isolated-fixture" } });
      expect(denied.statusCode).toBe(403); expect(denied.headers["cache-control"]).toBe("no-store");
    } finally { await app.close(); }
  });
});
