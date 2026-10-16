import { describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { loadConfig } from "../config.js";
import { createDatabase, sql } from "../database.js";
import { UnavailableFileStoragePort } from "../ports/file-storage.js";
import { newUuidV7 } from "../uuid.js";

describe.skipIf(process.env.TCDX_SECURITY_INTEGRATION !== "true")("MI7A authorization projection in isolated local PostgreSQL", () => {
  it("separates Platform and tenant grants, intersects entitlement/scope and defaults to DENY", async () => {
    if (process.env.DATABASE_HOST !== "127.0.0.1" || process.env.DATABASE_PORT !== "55432"
      || process.env.TCDX_ISOLATED_REBUILD !== "true") throw new Error("MI7A_REQUIRES_ISOLATED_LOCAL_POSTGRES");
    const database = createDatabase(loadConfig(process.env));
    const ids = { user: newUuidV7(), tenant: newUuidV7(), membership: newUuidV7(), otherTenant: newUuidV7(), otherMembership: newUuidV7(), role: newUuidV7(),
      assignment: newUuidV7(), platform: newUuidV7(), subscription: newUuidV7(), grant: newUuidV7(), badGrant: newUuidV7(), roleGrant: newUuidV7() };
    const verifier = { verifyBearerToken: async () => ({ principalClass: "HUMAN_INTERACTIVE" as const,
      principalId: ids.user, tokenId: newUuidV7(), expiresAt: new Date(Date.now() + 60_000) }) };
    let app: ReturnType<typeof buildApp> | undefined;
    try {
      const refs = await sql<{ platform_role_id: string; plan_version_id: string; subject_permission_id: string; mi_permission_id: string; role_permission_id: string }>`
        SELECT (SELECT role_id FROM iam.roles WHERE role_code='PLATFORM_ADMIN' AND ownership_class='PLATFORM_CONTROL') AS platform_role_id,
               (SELECT e.plan_version_id FROM platform.entitlements e JOIN platform.capabilities c ON c.capability_id=e.capability_id
                 WHERE e.is_enabled AND c.capability_group='CORE_PLATFORM' LIMIT 1) AS plan_version_id,
               (SELECT permission_id FROM iam.permissions WHERE permission_code='organization.subject.read') AS subject_permission_id,
               (SELECT permission_id FROM iam.permissions WHERE permission_code='platform.managed_identity.read') AS mi_permission_id,
               (SELECT permission_id FROM iam.permissions WHERE permission_code='platform.role.assign') AS role_permission_id
      `.execute(database);
      const ref = refs.rows[0]!;
      await sql`INSERT INTO iam.user_identities (user_identity_id,identity_key,display_name,lifecycle_state)
        VALUES (${ids.user}::uuid,${`oidc:mi7r-${ids.user}`},'MI7 local principal','active')`.execute(database);
      await sql`INSERT INTO platform.tenants (tenant_id,tenant_code,legal_name,display_name,default_timezone,lifecycle_state,data_classification)
        VALUES (${ids.tenant}::uuid,${`MI7R-${ids.tenant.slice(-12)}`},'MI7 local','MI7 local','America/Santiago','active','confidential')`.execute(database);
      await sql`INSERT INTO iam.tenant_memberships (tenant_membership_id,tenant_id,user_identity_id,membership_state,joined_at)
        VALUES (${ids.membership}::uuid,${ids.tenant}::uuid,${ids.user}::uuid,'active',transaction_timestamp())`.execute(database);
      await sql`INSERT INTO iam.roles (role_id,ownership_class,tenant_id,role_code,name,is_baseline,lifecycle_state)
        VALUES (${ids.role}::uuid,'TENANT_OWNED',${ids.tenant}::uuid,'TENANT_ADMIN','Tenant Admin',FALSE,'published')`.execute(database);
      await sql`INSERT INTO iam.membership_roles (membership_role_id,tenant_id,tenant_membership_id,role_id,scope_kind,valid_from)
        VALUES (${ids.assignment}::uuid,${ids.tenant}::uuid,${ids.membership}::uuid,${ids.role}::uuid,'tenant',transaction_timestamp())`.execute(database);
      await sql`INSERT INTO iam.role_permissions (role_permission_id,ownership_class,tenant_id,role_id,permission_id)
        VALUES (${ids.grant}::uuid,'TENANT_OWNED',${ids.tenant}::uuid,${ids.role}::uuid,${ref.subject_permission_id}::uuid),
               (${ids.badGrant}::uuid,'TENANT_OWNED',${ids.tenant}::uuid,${ids.role}::uuid,${ref.mi_permission_id}::uuid),
               (${ids.roleGrant}::uuid,'TENANT_OWNED',${ids.tenant}::uuid,${ids.role}::uuid,${ref.role_permission_id}::uuid)`.execute(database);
      await sql`INSERT INTO platform.subscriptions (subscription_id,tenant_id,plan_version_id,subscription_code,lifecycle_state,starts_at)
        VALUES (${ids.subscription}::uuid,${ids.tenant}::uuid,${ref.plan_version_id}::uuid,${`MI7R-${ids.tenant.slice(-12)}`},'active',transaction_timestamp())`.execute(database);
      app = buildApp(async () => true, { database, identityVerifier: verifier, fileStorage: new UnavailableFileStoragePort() });
      const headers = { authorization: "Bearer isolated-application-token" };
      const noTenant = await app.inject({ url: "/api/v2/auth/me/authorization", headers });
      expect(noTenant.statusCode).toBe(200);
      expect(noTenant.json()).toMatchObject({ platform_permissions: [], tenant_permissions: null });
      const tenant = await app.inject({ url: "/api/v2/auth/me/authorization", headers: { ...headers, "x-tcdx-tenant-id": ids.tenant } });
      expect(tenant.statusCode).toBe(200);
      expect(tenant.json().tenant_permissions).toEqual({ tenant_id: ids.tenant, default_timezone: "America/Santiago",
        permissions: { "organization.subject.read": [{ scope_kind: "tenant" }], "platform.role.assign": [{ scope_kind: "tenant" }] } });
      expect(tenant.json().platform_permissions).toEqual([]);
      expect(JSON.stringify(tenant.json())).not.toContain("platform.managed_identity");
      await sql`INSERT INTO iam.platform_role_assignments (platform_role_assignment_id,ownership_class,user_identity_id,role_id,valid_from)
        VALUES (${ids.platform}::uuid,'PLATFORM_CONTROL',${ids.user}::uuid,${ref.platform_role_id}::uuid,transaction_timestamp())`.execute(database);
      const platform = await app.inject({ url: "/api/v2/auth/me/authorization", headers });
      expect(platform.statusCode).toBe(200);
      expect(platform.json().platform_permissions).toContain("platform.managed_identity.read");
      expect(platform.json().platform_permissions).toContain("platform.role.assign");
      expect(platform.json().tenant_permissions).toBeNull();
      const foreign = await app.inject({ url: "/api/v2/auth/me/authorization", headers: { ...headers, "x-tcdx-tenant-id": newUuidV7() } });
      expect(foreign.statusCode).toBe(404);
      // The selected tenant's persisted value is re-read in the same snapshot.
      for (const zone of ["Europe/Berlin", "Pacific/Auckland", "Asia/Kathmandu", "UTC"]) {
        await sql`UPDATE platform.tenants SET default_timezone=${zone} WHERE tenant_id=${ids.tenant}::uuid`.execute(database);
        const response = await app.inject({ url: "/api/v2/auth/me/authorization", headers: { ...headers, "x-tcdx-tenant-id": ids.tenant } });
        expect(response.statusCode).toBe(200);
        expect(response.json().tenant_permissions.default_timezone).toBe(zone);
        expect(response.json().tenant_permissions.permissions).not.toHaveProperty("platform.tenant.read");
        expect(response.json().evaluated_at).toMatch(/Z$/);
      }
      for (const zone of ["invalid/zone", "+02:00", "", "x".repeat(64)]) {
        await sql`UPDATE platform.tenants SET default_timezone=${zone} WHERE tenant_id=${ids.tenant}::uuid`.execute(database);
        const response = await app.inject({ url: "/api/v2/auth/me/authorization", headers: { ...headers, "x-tcdx-tenant-id": ids.tenant } });
        expect(response.statusCode).toBe(503);
        expect(response.headers["cache-control"]).toBe("no-store");
        expect(response.body).not.toContain(zone || "default_timezone");
      }
      await sql`UPDATE platform.tenants SET default_timezone='UTC',lifecycle_state='inactive' WHERE tenant_id=${ids.tenant}::uuid`.execute(database);
      expect((await app.inject({ url: "/api/v2/auth/me/authorization", headers: { ...headers, "x-tcdx-tenant-id": ids.tenant } })).statusCode).toBe(403);
      await sql`UPDATE platform.tenants SET lifecycle_state='active' WHERE tenant_id=${ids.tenant}::uuid`.execute(database);
      await sql`INSERT INTO platform.tenants (tenant_id,tenant_code,legal_name,display_name,default_timezone,lifecycle_state,data_classification)
        VALUES (${ids.otherTenant}::uuid,${`MI7R-B-${ids.otherTenant.slice(-12)}`},'Other isolated tenant','Other isolated tenant','Asia/Tokyo','active','confidential')`.execute(database);
      await sql`INSERT INTO iam.tenant_memberships (tenant_membership_id,tenant_id,user_identity_id,membership_state,joined_at)
        VALUES (${ids.otherMembership}::uuid,${ids.otherTenant}::uuid,${ids.user}::uuid,'active',transaction_timestamp())`.execute(database);
      const selectedB = await app.inject({ url: "/api/v2/auth/me/authorization", headers: { ...headers, "x-tcdx-tenant-id": ids.otherTenant } });
      expect(selectedB.statusCode).toBe(200);
      expect(selectedB.json().tenant_permissions).toEqual({ tenant_id: ids.otherTenant, default_timezone: "Asia/Tokyo", permissions: {} });
      const selectedA = await app.inject({ url: "/api/v2/auth/me/authorization", headers: { ...headers, "x-tcdx-tenant-id": ids.tenant } });
      expect(selectedA.json().tenant_permissions.default_timezone).toBe("UTC");
      await sql`UPDATE iam.platform_role_assignments SET valid_to=transaction_timestamp() WHERE platform_role_assignment_id=${ids.platform}::uuid`.execute(database);
      expect((await app.inject({ url: "/api/v2/auth/me/authorization", headers })).json().platform_permissions).toEqual([]);
      await sql`UPDATE iam.tenant_memberships SET membership_state='inactive' WHERE tenant_membership_id=${ids.membership}::uuid`.execute(database);
      expect((await app.inject({ url: "/api/v2/auth/me/authorization", headers: { ...headers, "x-tcdx-tenant-id": ids.tenant } })).statusCode).toBe(403);
    } finally {
      if (app) await app.close();
      await sql`DELETE FROM iam.tenant_memberships WHERE tenant_membership_id=${ids.otherMembership}::uuid`.execute(database).catch(() => undefined);
      await sql`DELETE FROM platform.tenants WHERE tenant_id=${ids.otherTenant}::uuid`.execute(database).catch(() => undefined);
      await sql`DELETE FROM iam.platform_role_assignments WHERE platform_role_assignment_id=${ids.platform}::uuid`.execute(database).catch(() => undefined);
      await sql`DELETE FROM iam.role_permissions WHERE role_permission_id IN (${ids.grant}::uuid,${ids.badGrant}::uuid,${ids.roleGrant}::uuid)`.execute(database).catch(() => undefined);
      await sql`DELETE FROM iam.membership_roles WHERE membership_role_id=${ids.assignment}::uuid`.execute(database).catch(() => undefined);
      await sql`DELETE FROM iam.tenant_memberships WHERE tenant_membership_id=${ids.membership}::uuid`.execute(database).catch(() => undefined);
      await sql`DELETE FROM platform.subscriptions WHERE subscription_id=${ids.subscription}::uuid`.execute(database).catch(() => undefined);
      await sql`DELETE FROM iam.roles WHERE role_id=${ids.role}::uuid`.execute(database).catch(() => undefined);
      await sql`DELETE FROM platform.tenants WHERE tenant_id=${ids.tenant}::uuid`.execute(database).catch(() => undefined);
      await sql`DELETE FROM iam.user_identities WHERE user_identity_id=${ids.user}::uuid`.execute(database).catch(() => undefined);
      await database.destroy();
    }
  });
});
