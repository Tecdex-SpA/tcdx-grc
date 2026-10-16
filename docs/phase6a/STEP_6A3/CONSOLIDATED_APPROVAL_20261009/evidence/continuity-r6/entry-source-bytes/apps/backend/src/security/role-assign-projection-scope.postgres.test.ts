import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { loadConfig } from "../config.js";
import { createDatabase, sql } from "../database.js";
import { UnavailableFileStoragePort } from "../ports/file-storage.js";
import { newUuidV7 } from "../uuid.js";
import { membershipRoleEtag } from "./membership-role-etag.js";

describe.skipIf(process.env.TCDX_SECURITY_INTEGRATION !== "true")("D3-A actual grant chains and operation-specific role authority", () => {
  const ids = { platform: newUuidV7(), admin: newUuidV7(), target: newUuidV7(), outsider: newUuidV7(),
    tenant: newUuidV7(), foreign: newUuidV7(), adminMembership: newUuidV7(), membership: newUuidV7(),
    foreignMembership: newUuidV7(), adminRole: newUuidV7(), assignRole: newUuidV7(), tenantRevokeRole: newUuidV7(),
    platformRevokeRole: newUuidV7(), foreignRole: newUuidV7(), adminAssignment: newUuidV7(),
    tenantAssignment: newUuidV7(), platformAssignment: newUuidV7(), foreignAssignment: newUuidV7(),
    platformGrant: newUuidV7(), grant: newUuidV7(), subscription: newUuidV7() };
  const actors = [ids.platform, ids.admin, ids.target, ids.outsider];
  const tenants = [ids.tenant, ids.foreign];
  let db: ReturnType<typeof createDatabase>;
  let app: ReturnType<typeof buildApp>;
  const headers = (actor: string, tenant?: string) => ({ authorization: `Bearer ${actor}`,
    ...(tenant ? { "x-tcdx-tenant-id": tenant } : {}) });
  const projection = (actor: string, tenant?: string) => app.inject({
    url: "/api/v1/auth/me/authorization", headers: headers(actor, tenant) });
  const assign = (actor: string, tenant?: string, membership = ids.membership, role = ids.assignRole, key = newUuidV7()) =>
    app.inject({ method: "POST", url: `/api/v1/memberships/${membership}/role-assignments`,
      headers: { ...headers(actor, tenant), "idempotency-key": key }, payload: { role_id: role, scope_kind: "tenant" } });
  const etag = async (assignment: string) => membershipRoleEtag((await sql<{
    membership_role_id: string; valid_from: Date; valid_to: Date | null;
  }>`SELECT membership_role_id,valid_from,valid_to FROM iam.membership_roles
      WHERE membership_role_id=${assignment}::uuid`.execute(db)).rows[0]!);
  const revoke = async (actor: string, assignment: string, tenantHeader?: string, queryTenant?: string,
    options: { reason?: string; match?: string | null; key?: string } = {}) => app.inject({
      method: "POST", url: `/api/v1/role-assignments/${assignment}:revoke${queryTenant ? `?tenant_id=${queryTenant}` : ""}`,
      headers: { ...headers(actor, tenantHeader), "idempotency-key": options.key ?? newUuidV7(),
        ...(options.match === null ? {} : { "if-match": `"${options.match ?? await etag(assignment)}"` }) },
      payload: options.reason === "" ? {} : { reason: options.reason ?? "Isolated D3-A governed correction" }
    });

  beforeAll(async () => {
    if (process.env.DATABASE_HOST !== "127.0.0.1" || process.env.DATABASE_PORT !== "55432"
      || process.env.TCDX_ISOLATED_REBUILD !== "true") throw new Error("D3_A_REQUIRES_ISOLATED_LOCAL_POSTGRES");
    db = createDatabase(loadConfig(process.env));
    const refs = (await sql<{ platform_role: string; permission: string; plan: string }>`SELECT
      (SELECT role_id FROM iam.roles WHERE role_code='PLATFORM_ADMIN' AND ownership_class='PLATFORM_CONTROL'
        AND tenant_id IS NULL AND is_baseline AND lifecycle_state='published') AS platform_role,
      (SELECT permission_id FROM iam.permissions WHERE permission_code='platform.role.assign' AND lifecycle_state='published') AS permission,
      (SELECT e.plan_version_id FROM platform.entitlements e JOIN platform.capabilities c USING(capability_id)
        JOIN platform.plan_versions pv USING(plan_version_id)
        WHERE e.is_enabled AND c.capability_group='CORE_PLATFORM' AND c.lifecycle_state='published'
          AND pv.lifecycle_state='published' LIMIT 1) AS plan`.execute(db)).rows[0]!;
    expect(refs.platform_role).toBeTruthy(); expect(refs.permission).toBeTruthy(); expect(refs.plan).toBeTruthy();
    for (const actor of actors) await sql`INSERT INTO iam.user_identities
      (user_identity_id,identity_key,display_name,lifecycle_state)
      VALUES (${actor}::uuid,${`isolated-d3-a:${actor}`},'Isolated D3-A principal','active')`.execute(db);
    for (const tenant of tenants) await sql`INSERT INTO platform.tenants
      (tenant_id,tenant_code,legal_name,display_name,default_timezone,lifecycle_state,data_classification)
      VALUES (${tenant}::uuid,${`D3A-${tenant.slice(-12)}`},'Isolated D3-A tenant','Isolated D3-A tenant','UTC','active','confidential')`.execute(db);
    for (const [membership, tenant, actor] of [[ids.adminMembership, ids.tenant, ids.admin],
      [ids.membership, ids.tenant, ids.target], [ids.foreignMembership, ids.foreign, ids.target]]) {
      await sql`INSERT INTO iam.tenant_memberships (tenant_membership_id,tenant_id,user_identity_id,membership_state,joined_at)
        VALUES (${membership}::uuid,${tenant}::uuid,${actor}::uuid,'active',statement_timestamp())`.execute(db);
    }
    for (const [role, tenant, code] of [[ids.adminRole, ids.tenant, "TENANT_ADMIN"],
      [ids.assignRole, ids.tenant, "EVIDENCE_OWNER"], [ids.tenantRevokeRole, ids.tenant, "VIEWER"],
      [ids.platformRevokeRole, ids.tenant, "AUDITOR"], [ids.foreignRole, ids.foreign, "VIEWER"]]) {
      await sql`INSERT INTO iam.roles (role_id,ownership_class,tenant_id,role_code,name,is_baseline,lifecycle_state)
        VALUES (${role}::uuid,'TENANT_OWNED',${tenant}::uuid,${code},${code},FALSE,'published')`.execute(db);
    }
    await sql`INSERT INTO iam.role_permissions (role_permission_id,ownership_class,tenant_id,role_id,permission_id)
      VALUES (${ids.grant}::uuid,'TENANT_OWNED',${ids.tenant}::uuid,${ids.adminRole}::uuid,${refs.permission}::uuid)`.execute(db);
    for (const [assignment, tenant, membership, role] of [[ids.adminAssignment, ids.tenant, ids.adminMembership, ids.adminRole],
      [ids.tenantAssignment, ids.tenant, ids.membership, ids.tenantRevokeRole],
      [ids.platformAssignment, ids.tenant, ids.membership, ids.platformRevokeRole],
      [ids.foreignAssignment, ids.foreign, ids.foreignMembership, ids.foreignRole]]) {
      await sql`INSERT INTO iam.membership_roles (membership_role_id,tenant_id,tenant_membership_id,role_id,scope_kind,valid_from)
        VALUES (${assignment}::uuid,${tenant}::uuid,${membership}::uuid,${role}::uuid,'tenant',statement_timestamp()-interval '1 second')`.execute(db);
    }
    // Consume the already published canonical PLATFORM_ADMIN grant; create no RolePermission for Platform.
    await sql`INSERT INTO iam.platform_role_assignments (platform_role_assignment_id,ownership_class,user_identity_id,role_id,valid_from)
      VALUES (${ids.platformGrant}::uuid,'PLATFORM_CONTROL',${ids.platform}::uuid,${refs.platform_role}::uuid,statement_timestamp()-interval '1 second')`.execute(db);
    await sql`INSERT INTO platform.subscriptions (subscription_id,tenant_id,plan_version_id,subscription_code,lifecycle_state,starts_at)
      VALUES (${ids.subscription}::uuid,${ids.tenant}::uuid,${refs.plan}::uuid,${`D3A-${ids.subscription}`},'active',statement_timestamp())`.execute(db);
    app = buildApp(async () => true, { database: db, fileStorage: new UnavailableFileStoragePort(),
      identityVerifier: { verifyBearerToken: async (token) => ({ principalClass: "HUMAN_INTERACTIVE" as const,
        principalId: token, tokenId: newUuidV7(), expiresAt: new Date(Date.now() + 60_000) }) } });
  });

  afterAll(async () => {
    if (app) await app.close();
    if (!db) return;
    try {
      for (const table of ["ops_audit.audit_events", "ops_audit.outbox_events", "ops_audit.idempotency_records"])
        await sql`DELETE FROM ${sql.table(table)} WHERE actor_user_identity_id=ANY(${actors}::uuid[])`.execute(db);
      for (const table of ["iam.membership_roles", "iam.role_permissions", "iam.tenant_memberships", "iam.roles", "platform.subscriptions"])
        await sql`DELETE FROM ${sql.table(table)} WHERE tenant_id=ANY(${tenants}::uuid[])`.execute(db);
      await sql`DELETE FROM platform.tenants WHERE tenant_id=ANY(${tenants}::uuid[])`.execute(db);
      await sql`DELETE FROM iam.platform_role_assignments WHERE user_identity_id=ANY(${actors}::uuid[])`.execute(db);
      await sql`DELETE FROM iam.user_identities WHERE user_identity_id=ANY(${actors}::uuid[])`.execute(db);
    } finally { await db.destroy(); }
  });

  it("projects the existing Platform permission but denies assign without independent tenant authority", async () => {
    const result = await projection(ids.platform);
    expect(result.statusCode).toBe(200);
    expect(result.json().platform_permissions).toContain("platform.role.assign");
    expect(result.json().tenant_permissions).toBeNull();
    expect((await assign(ids.platform)).statusCode).toBe(403);
    expect((await assign(ids.platform, ids.tenant)).statusCode).toBe(404);
    expect((await projection(ids.platform, ids.tenant)).statusCode).toBe(404);
    expect((await projection(ids.outsider)).json().platform_permissions).toEqual([]);
    expect((await revoke(ids.outsider, ids.platformAssignment, undefined, ids.tenant)).statusCode).toBe(403);
  });

  it("keeps the Tenant Admin projection context-bound and rejects foreign objects/contexts and mixed authority", async () => {
    const result = await projection(ids.admin, ids.tenant);
    expect(result.statusCode).toBe(200);
    expect(result.json().platform_permissions).toEqual([]);
    expect(result.json().tenant_permissions).toEqual({ tenant_id: ids.tenant,
      permissions: { "platform.role.assign": [{ scope_kind: "tenant" }] } });
    expect((await projection(ids.admin, ids.foreign)).statusCode).toBe(404);
    expect((await assign(ids.admin, ids.foreign)).statusCode).toBe(404);
    expect((await assign(ids.admin, ids.tenant, ids.foreignMembership)).statusCode).toBe(404);
    expect((await assign(ids.admin, ids.tenant, ids.membership, ids.foreignRole)).statusCode).toBe(403);
    expect((await revoke(ids.admin, ids.foreignAssignment, ids.tenant)).statusCode).toBe(404);
    expect((await revoke(ids.admin, ids.platformAssignment, ids.tenant, ids.tenant)).statusCode).toBe(403);
    expect((await revoke(ids.platform, ids.platformAssignment, undefined, ids.foreign)).statusCode).toBe(404);
  });

  it("fails closed without entitlement, active Membership, a grant or tenant scope", async () => {
    await sql`UPDATE platform.subscriptions SET lifecycle_state='inactive' WHERE subscription_id=${ids.subscription}::uuid`.execute(db);
    try {
      expect((await projection(ids.admin, ids.tenant)).json().tenant_permissions.permissions).toEqual({});
      expect((await assign(ids.admin, ids.tenant)).statusCode).toBe(403);
      expect((await revoke(ids.admin, ids.tenantAssignment, ids.tenant)).statusCode).toBe(403);
    } finally { await sql`UPDATE platform.subscriptions SET lifecycle_state='active' WHERE subscription_id=${ids.subscription}::uuid`.execute(db); }
    await sql`UPDATE iam.tenant_memberships SET membership_state='inactive' WHERE tenant_membership_id=${ids.adminMembership}::uuid`.execute(db);
    try {
      expect((await assign(ids.admin, ids.tenant)).statusCode).toBe(404);
      expect((await revoke(ids.admin, ids.tenantAssignment, ids.tenant)).statusCode).toBe(404);
    } finally { await sql`UPDATE iam.tenant_memberships SET membership_state='active' WHERE tenant_membership_id=${ids.adminMembership}::uuid`.execute(db); }
    await sql`UPDATE iam.roles SET lifecycle_state='retired' WHERE role_id=${ids.adminRole}::uuid`.execute(db);
    try {
      expect((await projection(ids.admin, ids.tenant)).json().tenant_permissions.permissions).toEqual({});
      expect((await assign(ids.admin, ids.tenant)).statusCode).toBe(403);
      expect((await revoke(ids.admin, ids.tenantAssignment, ids.tenant)).statusCode).toBe(403);
    } finally { await sql`UPDATE iam.roles SET lifecycle_state='published' WHERE role_id=${ids.adminRole}::uuid`.execute(db); }
    await sql`UPDATE iam.membership_roles SET scope_kind='owned_object' WHERE membership_role_id=${ids.adminAssignment}::uuid`.execute(db);
    try {
      expect((await projection(ids.admin, ids.tenant)).json().tenant_permissions.permissions).toEqual({});
      expect((await assign(ids.admin, ids.tenant)).statusCode).toBe(403);
      expect((await revoke(ids.admin, ids.tenantAssignment, ids.tenant)).statusCode).toBe(403);
    } finally { await sql`UPDATE iam.membership_roles SET scope_kind='tenant' WHERE membership_role_id=${ids.adminAssignment}::uuid`.execute(db); }
    expect((await assign(ids.outsider, ids.tenant)).statusCode).toBe(404);
    expect((await revoke(ids.outsider, ids.tenantAssignment, ids.tenant)).statusCode).toBe(404);
  });

  it("allows tenant assign with real Membership, entitlement and grant, with one effect on replay", async () => {
    const key = newUuidV7();
    const result = await assign(ids.admin, ids.tenant, ids.membership, ids.assignRole, key);
    expect(result.statusCode).toBe(202);
    const replay = await assign(ids.admin, ids.tenant, ids.membership, ids.assignRole, key);
    expect(replay.statusCode).toBe(202);
    expect(replay.headers["idempotency-replayed"]).toBe("true");
    expect(replay.json().resource_id).toBe(result.json().resource_id);
    const counts = (await sql<{ assignments: number; audits: number; events: number }>`SELECT
      (SELECT count(*)::int FROM iam.membership_roles WHERE tenant_membership_id=${ids.membership}::uuid AND role_id=${ids.assignRole}::uuid) AS assignments,
      (SELECT count(*)::int FROM ops_audit.audit_events WHERE aggregate_id=${result.json().resource_id}::uuid AND event_code='audit.platform.role.assign.v1') AS audits,
      (SELECT count(*)::int FROM ops_audit.outbox_events WHERE aggregate_id=${result.json().resource_id}::uuid AND event_type='iam.role.assigned.v1') AS events`.execute(db)).rows[0];
    expect(counts).toEqual({ assignments: 1, audits: 1, events: 1 });
  });

  it("allows tenant revoke only with reason, If-Match and current authority", async () => {
    expect((await revoke(ids.admin, ids.tenantAssignment, ids.tenant, undefined, { reason: "" })).statusCode).toBe(400);
    expect((await revoke(ids.admin, ids.tenantAssignment, ids.tenant, undefined, { match: null })).statusCode).toBe(400);
    const result = await revoke(ids.admin, ids.tenantAssignment, ids.tenant);
    expect(result.statusCode).toBe(202);
    expect(result.json().result.valid_to).not.toBeNull();
  });

  it("allows Platform revoke through explicit target resolution, CAS, reason, replay and privileged audit", async () => {
    expect((await revoke(ids.platform, ids.platformAssignment)).statusCode).toBe(400);
    expect((await revoke(ids.platform, ids.platformAssignment, undefined, ids.tenant, { reason: "" })).statusCode).toBe(400);
    expect((await revoke(ids.platform, ids.platformAssignment, undefined, ids.tenant, { match: null })).statusCode).toBe(400);
    expect((await revoke(ids.platform, ids.platformAssignment, undefined, ids.tenant, { match: "0".repeat(64) })).statusCode).toBe(409);
    const options = { key: newUuidV7(), match: await etag(ids.platformAssignment) };
    const result = await revoke(ids.platform, ids.platformAssignment, undefined, ids.tenant, options);
    expect(result.statusCode).toBe(202);
    expect(result.json().result.valid_to).not.toBeNull();
    const replay = await revoke(ids.platform, ids.platformAssignment, undefined, ids.tenant, options);
    expect(replay.statusCode).toBe(202);
    expect(replay.headers["idempotency-replayed"]).toBe("true");
    const counts = (await sql<{ revoked: number; privileged: number; events: number }>`SELECT
      (SELECT count(*)::int FROM ops_audit.audit_events WHERE aggregate_id=${ids.platformAssignment}::uuid AND event_code='audit.platform.role.revoke.v1') AS revoked,
      (SELECT count(*)::int FROM ops_audit.audit_events WHERE aggregate_id=${ids.platformAssignment}::uuid AND event_code='audit.iam.application_token.privileged_use.v1' AND outcome='success') AS privileged,
      (SELECT count(*)::int FROM ops_audit.outbox_events WHERE aggregate_id=${ids.platformAssignment}::uuid AND event_type='iam.role.revoked.v1') AS events`.execute(db)).rows[0];
    expect(counts).toEqual({ revoked: 1, privileged: 1, events: 1 });
  });

  it("creates no implicit Platform actor Membership or tenant role and defaults unauthenticated commands to DENY", async () => {
    const counts = (await sql<{ memberships: number; roles: number; platform: number }>`SELECT
      (SELECT count(*)::int FROM iam.tenant_memberships WHERE user_identity_id=${ids.platform}::uuid) AS memberships,
      (SELECT count(*)::int FROM iam.membership_roles mr JOIN iam.tenant_memberships m USING(tenant_membership_id)
        WHERE m.user_identity_id=${ids.platform}::uuid) AS roles,
      (SELECT count(*)::int FROM iam.platform_role_assignments WHERE platform_role_assignment_id=${ids.platformGrant}::uuid AND valid_to IS NULL) AS platform`.execute(db)).rows[0];
    expect(counts).toEqual({ memberships: 0, roles: 0, platform: 1 });
    expect((await app.inject({ method: "POST", url: `/api/v1/memberships/${ids.membership}/role-assignments`, payload: {} })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: `/api/v1/role-assignments/${ids.foreignAssignment}:revoke?tenant_id=${ids.foreign}`, payload: {} })).statusCode).toBe(401);
  });
});
