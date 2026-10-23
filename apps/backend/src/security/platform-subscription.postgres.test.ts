import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { loadConfig } from "../config.js";
import { createDatabase, sql } from "../database.js";
import { UnavailableFileStoragePort } from "../ports/file-storage.js";
import { newUuidV7 } from "../uuid.js";
import { resolvePlatformActor } from "./platform-authority.js";
import { subscriptionCreate, tenantCreate } from "./platform-iam-service.js";

// Regression of the published create contract. This does not publish change-plan.
describe.skipIf(process.env.TCDX_SECURITY_INTEGRATION !== "true")("Subscription create in real isolated PostgreSQL", () => {
  let db: ReturnType<typeof createDatabase>;
  const adminId = newUuidV7(), tenantAdminId = newUuidV7(), supportId = newUuidV7();
  const identity = (principalId = adminId) => ({ principalClass: "HUMAN_INTERACTIVE" as const,
    principalId, tokenId: newUuidV7(), expiresAt: new Date(Date.now() + 60_000) });
  const tenants: string[] = [];
  let planId: string;
  const body = (tenantId: string) => ({ tenant_id: tenantId, plan_version_id: planId, subscription_code: `PG-${newUuidV7()}` });
  const create = (request: ReturnType<typeof body>, key = newUuidV7(), principalId = adminId) =>
    db.transaction().execute(async tx => subscriptionCreate(tx, await resolvePlatformActor(tx, identity(principalId)), {
      body: request, key, correlationId: newUuidV7()
    }));
  const company = async () => {
    const result = await db.transaction().execute(async tx => tenantCreate(tx, await resolvePlatformActor(tx, identity()), {
      body: { tenant_code: `PG-${newUuidV7()}`, legal_name: "Isolated subscription fixture",
        display_name: "Isolated subscription fixture", default_timezone: "UTC" }, key: newUuidV7(), correlationId: newUuidV7()
    }));
    tenants.push(result.result.tenant_id);
    return result.result.tenant_id;
  };
  const counts = async () => (await sql`SELECT
    (SELECT count(*)::int FROM platform.subscriptions WHERE tenant_id=ANY(${tenants}::uuid[])) AS subscriptions,
    (SELECT count(*)::int FROM ops_audit.audit_events WHERE actor_user_identity_id=${adminId}::uuid) AS audits,
    (SELECT count(*)::int FROM ops_audit.outbox_events WHERE actor_user_identity_id=${adminId}::uuid) AS outbox,
    (SELECT count(*)::int FROM ops_audit.idempotency_records WHERE actor_user_identity_id=${adminId}::uuid) AS idempotency`.execute(db)).rows[0];

  beforeAll(async () => {
    if (process.env.DATABASE_HOST !== "127.0.0.1" || process.env.DATABASE_PORT !== "55432"
      || process.env.DATABASE_NAME !== "tcdx-grc" || process.env.TCDX_ISOLATED_REBUILD !== "true") {
      throw new Error("ISOLATED_POSTGRES_REQUIRED");
    }
    db = createDatabase(loadConfig(process.env));
    const server = (await sql<{ major: number; database: string }>`SELECT
      current_setting('server_version_num')::int/10000 AS major,current_database() AS database`.execute(db)).rows[0];
    expect(server).toEqual({ major: 16, database: "tcdx-grc" });
    for (const id of [adminId, tenantAdminId, supportId]) {
      await sql`INSERT INTO iam.user_identities (user_identity_id,identity_key,display_name,lifecycle_state)
        VALUES (${id}::uuid,${`isolated-subscription:${id}`},'Isolated subscription actor','active')`.execute(db);
    }
    for (const [id, role] of [[adminId, "PLATFORM_ADMIN"], [supportId, "PLATFORM_SUPPORT"]] as const) {
      await sql`INSERT INTO iam.platform_role_assignments
        (platform_role_assignment_id,ownership_class,user_identity_id,role_id,valid_from)
        SELECT ${newUuidV7()}::uuid,'PLATFORM_CONTROL',${id}::uuid,role_id,statement_timestamp()-interval '1 second'
        FROM iam.roles WHERE role_code=${role} AND ownership_class='PLATFORM_CONTROL'
          AND tenant_id IS NULL AND is_baseline AND lifecycle_state='published'`.execute(db);
    }
    const plan = (await sql<{ plan_version_id: string }>`SELECT pv.plan_version_id FROM platform.plan_versions pv
      JOIN platform.plans p USING(plan_id) WHERE p.lifecycle_state='published' AND pv.lifecycle_state='published'
        AND (pv.effective_from IS NULL OR pv.effective_from<=transaction_timestamp())
        AND (pv.effective_to IS NULL OR pv.effective_to>transaction_timestamp()) ORDER BY pv.plan_version_id LIMIT 1`.execute(db)).rows[0];
    expect(plan).toBeDefined(); planId = plan!.plan_version_id;
  });

  afterAll(async () => {
    if (!db) return;
    try {
      const actors = [adminId, tenantAdminId, supportId];
      for (const table of ["ops_audit.audit_events", "ops_audit.outbox_events", "ops_audit.idempotency_records"]) {
        await sql`DELETE FROM ${sql.table(table)} WHERE actor_user_identity_id=ANY(${actors}::uuid[])`.execute(db);
      }
      for (const table of ["iam.membership_roles", "iam.role_permissions", "iam.tenant_memberships", "iam.roles", "platform.subscriptions"]) {
        await sql`DELETE FROM ${sql.table(table)} WHERE tenant_id=ANY(${tenants}::uuid[])`.execute(db);
      }
      await sql`DELETE FROM platform.tenants WHERE tenant_id=ANY(${tenants}::uuid[])`.execute(db);
      await sql`DELETE FROM iam.platform_role_assignments WHERE user_identity_id=ANY(${actors}::uuid[])`.execute(db);
      await sql`DELETE FROM iam.user_identities WHERE user_identity_id=ANY(${actors}::uuid[])`.execute(db);
    } finally { await db.destroy(); }
  });

  it("commits an initial subscription, exact persisted plan, material and privileged audit, outbox and replay claim", async () => {
    const tenant = await company(), request = body(tenant), key = newUuidV7(), created = await create(request, key);
    expect(created).toMatchObject({ replayed: false, result: { ...request, lifecycle_state: "active", ends_at: null, cancelled_at: null } });
    const id = created.result.subscription_id;
    const audits = (await sql<{ event_code: string; ownership_class: string; tenant_id: string | null }>`SELECT
      event_code,ownership_class,tenant_id FROM ops_audit.audit_events WHERE aggregate_id=${id}::uuid`.execute(db)).rows;
    expect(audits).toHaveLength(2);
    expect(audits.some(row => row.event_code === "audit.platform.subscription.create.v1")).toBe(true);
    expect(audits.every(row => row.ownership_class === "PLATFORM_CONTROL" && row.tenant_id === null)).toBe(true);
    const event = (await sql<{ event_type: string; payload: Record<string, unknown> }>`SELECT event_type,payload
      FROM ops_audit.outbox_events WHERE aggregate_id=${id}::uuid`.execute(db)).rows;
    expect(event).toHaveLength(1);
    expect(event[0]).toMatchObject({ event_type: "platform.subscription.created.v1", payload: { tenant_id: tenant, plan_version_id: planId } });
    const before = await counts();
    expect(await create(request, key)).toEqual({ ...created, replayed: true });
    expect(await counts()).toEqual(before);
    await expect(create({ ...request, subscription_code: `OTHER-${newUuidV7()}` }, key)).rejects.toMatchObject({ code: "TCDX.CONFLICT.IDEMPOTENCY", statusCode: 409 });
    expect(await counts()).toEqual(before);
  });

  it.each(["future", "expired", "draft"])("rejects %s PlanVersion and rolls back its idempotency claim", async state => {
    const request = body(await company()), before = await counts();
    await expect(db.transaction().execute(async tx => {
      // Published versions are immutable under the commercial contract. Build
      // a distinct synthetic candidate instead of corrupting the seeded plan.
      const version=newUuidV7(),family=newUuidV7(),from=new Date(Date.now()+(state==='future'?86400000:-172800000)).toISOString();
      const to=state==='expired'?new Date(Date.now()-86400000).toISOString():null;
      await sql`INSERT INTO platform.plan_versions(plan_version_id,plan_id,version_number,display_name,lifecycle_state,effective_from,effective_to)
        SELECT ${version}::uuid,plan_id,max(version_number)+1,'Synthetic negative candidate','draft',${from}::timestamptz,${to}::timestamptz
        FROM platform.plan_versions WHERE plan_id=(SELECT plan_id FROM platform.plan_versions WHERE plan_version_id=${planId}::uuid) GROUP BY plan_id`.execute(tx);
      await sql`INSERT INTO platform.commercial_families(commercial_family_id,family_code,name,source_type,published_at,publication_manifest_sha256,created_by_user_identity_id)
        VALUES(${family}::uuid,${family},'Synthetic negative test family','standard',statement_timestamp(),repeat('a',64),${adminId}::uuid)`.execute(tx);
      await sql`INSERT INTO platform.plan_version_commercial_family_links(plan_version_commercial_family_link_id,plan_version_id,commercial_family_id,created_by_user_identity_id)
        VALUES(${newUuidV7()}::uuid,${version}::uuid,${family}::uuid,${adminId}::uuid)`.execute(tx);
      for(const dimension of [null,family])await sql`INSERT INTO platform.usage_limits(usage_limit_id,plan_version_id,limit_code,limit_value,unit,effective_from,effective_to,commercial_family_id,created_by_user_identity_id)
        VALUES(${newUuidV7()}::uuid,${version}::uuid,'regulatory_pack_count',1,'pack',${from}::timestamptz,${to}::timestamptz,${dimension}::uuid,${adminId}::uuid)`.execute(tx);
      const capabilities=(await sql<{capability_id:string;is_enabled:boolean}>`SELECT capability_id,is_enabled FROM platform.entitlements WHERE plan_version_id=${planId}::uuid`.execute(tx)).rows;
      for(const capability of capabilities)await sql`INSERT INTO platform.entitlements(entitlement_id,plan_version_id,capability_id,is_enabled) VALUES(${newUuidV7()}::uuid,${version}::uuid,${capability.capability_id}::uuid,${capability.is_enabled})`.execute(tx);
      if(state!=='draft')await sql`UPDATE platform.plan_versions SET lifecycle_state='published',published_at=statement_timestamp() WHERE plan_version_id=${version}::uuid`.execute(tx);
      return subscriptionCreate(tx, await resolvePlatformActor(tx, identity()), { body: {...request,plan_version_id:version}, key: newUuidV7(), correlationId: newUuidV7() });
    })).rejects.toMatchObject({ statusCode: 422, code: "TCDX.INVARIANT.VIOLATION" });
    expect(await counts()).toEqual(before);
  });

  it("serializes two concurrent initial subscriptions and preserves one active contract", async () => {
    const tenant = await company();
    const attempts = await Promise.allSettled([create(body(tenant)), create(body(tenant))]);
    expect(attempts.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const rejected = attempts.find(result => result.status === "rejected");
    expect(rejected).toMatchObject({ status: "rejected", reason: { statusCode: 409 } });
    const persisted = (await sql<{ count: number }>`SELECT count(*)::int AS count FROM platform.subscriptions
      WHERE tenant_id=${tenant}::uuid AND lifecycle_state='active'`.execute(db)).rows[0];
    expect(persisted?.count).toBe(1);
  });

  it("rolls back subscription, both audits, outbox and idempotency when PostgreSQL rejects the material audit", async () => {
    const request = body(await company()), before = await counts();
    await expect(db.transaction().execute(async tx => {
      // Fault exists only within this transaction, including its trigger definition.
      await sql.raw(`CREATE FUNCTION pg_temp.reject_subscription_audit() RETURNS trigger LANGUAGE plpgsql AS $fn$
        BEGIN IF NEW.event_code='audit.platform.subscription.create.v1' THEN
          RAISE EXCEPTION 'isolated audit persistence fault' USING ERRCODE='23514';
        END IF; RETURN NEW; END $fn$`).execute(tx);
      await sql.raw(`CREATE TRIGGER isolated_subscription_audit_fault BEFORE INSERT ON ops_audit.audit_events
        FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_subscription_audit()`).execute(tx);
      return subscriptionCreate(tx, await resolvePlatformActor(tx, identity()), { body: request, key: newUuidV7(), correlationId: newUuidV7() });
    })).rejects.toMatchObject({ code: "23514" });
    expect(await counts()).toEqual(before);
    expect((await sql<{ count: number }>`SELECT count(*)::int AS count FROM pg_trigger
      WHERE tgname='isolated_subscription_audit_fault'`.execute(db)).rows[0]?.count).toBe(0);
    expect((await create(request)).replayed).toBe(false);
  });

  it("rejects Tenant Admin and Platform Support at the authenticated API and reads each tenant's own persisted current plan", async () => {
    const first = await company(), second = await company();
    // Isolated tenant authority fixture; no PlatformRoleAssignment for this identity.
    const roleId = newUuidV7(), membershipId = newUuidV7();
    await sql`INSERT INTO iam.roles (role_id,ownership_class,tenant_id,role_code,name,is_baseline,lifecycle_state)
      VALUES (${roleId}::uuid,'TENANT_OWNED',${first}::uuid,'TENANT_ADMIN','Tenant Admin',TRUE,'published')`.execute(db);
    await sql`INSERT INTO iam.tenant_memberships (tenant_membership_id,tenant_id,user_identity_id,membership_state,joined_at)
      VALUES (${membershipId}::uuid,${first}::uuid,${tenantAdminId}::uuid,'active',statement_timestamp())`.execute(db);
    await sql`INSERT INTO iam.membership_roles (membership_role_id,tenant_id,tenant_membership_id,role_id,scope_kind,valid_from)
      VALUES (${newUuidV7()}::uuid,${first}::uuid,${membershipId}::uuid,${roleId}::uuid,'tenant',statement_timestamp())`.execute(db);
    let current = adminId;
    const app = buildApp(async () => true, { database: db, identityVerifier: { verifyBearerToken: async () => identity(current) },
      fileStorage: new UnavailableFileStoragePort() });
    const headers = () => ({ authorization: "Bearer isolated-verified-identity", "idempotency-key": newUuidV7() });
    try {
      const firstResponse = await app.inject({ method: "POST", url: "/api/v1/platform/subscriptions", headers: headers(), payload: body(first) });
      const secondResponse = await app.inject({ method: "POST", url: "/api/v1/platform/subscriptions", headers: headers(), payload: body(second) });
      expect(firstResponse.statusCode).toBe(202); expect(secondResponse.statusCode).toBe(202);
      for (const [tenant, response] of [[first, firstResponse], [second, secondResponse]] as const) {
        const read = await app.inject({ method: "GET", url: `/api/v1/platform/tenants/${tenant}`, headers: headers() });
        expect(read.statusCode).toBe(200);
        expect(read.json().current_subscription.subscription_id).toBe(response.json().result.subscription_id);
        expect(read.json().tenant_id).toBe(tenant);
      }
      const before = await counts();
      for (const candidate of [tenantAdminId, supportId]) {
        current = candidate;
        const denied = await app.inject({ method: "POST", url: "/api/v1/platform/subscriptions", headers: headers(), payload: body(second) });
        expect(denied.statusCode).toBe(403);
        const readDenied = await app.inject({ method: "GET", url: `/api/v1/platform/tenants/${second}`, headers: headers() });
        expect(readDenied.statusCode).toBe(403);
      }
      expect(await counts()).toEqual(before);
      expect((await app.inject({ method: "POST", url: "/api/v1/platform/subscriptions", payload: body(first) })).statusCode).toBe(401);
    } finally { await app.close(); }
  });
});
