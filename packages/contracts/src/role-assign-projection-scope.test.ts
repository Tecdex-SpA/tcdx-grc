import { describe, expect, it } from "vitest";
import openApi from "../../../docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml?raw";
import matrix from "../../../docs/executable-contracts/03_API_RESOURCE_OPERATION_MATRIX.md?raw";
import catalog from "../../../docs/executable-contracts/05_PERMISSION_CATALOG.md?raw";
import projection from "../../../docs/executable-contracts/23_FRONTEND_AUTHENTICATION_AUTHORIZATION_PROJECTIONS.md?raw";
import migration from "../../../database/migrations/20260928000200_phase5_membership_role_revoke_platform_grant.sql?raw";
import generatedSource from "../../../apps/backend/src/security/permission-projection-catalog.generated.ts?raw";

const permissionProjectionCatalog = JSON.parse(
  generatedSource.slice(generatedSource.indexOf(" = ") + 3).replace(/;\s*$/, "")
) as Record<string, { capabilities: string[]; scopes: string[] }>;

const operation = (id: string) => {
  const start = openApi.indexOf(`      operationId: ${id}\n`);
  return openApi.slice(start, openApi.indexOf('\n  "/', start));
};

describe("D3-A existing MembershipRole authority and projection scope", () => {
  it("projects the canonical context union without creating a Permission or grant", () => {
    expect(catalog.split("\n").filter((line) => line.startsWith("| `platform.role.assign` |")))
      .toHaveLength(1);
    expect(catalog).toContain("| assign/revoke tenant MembershipRole | platform, tenant |");
    expect(permissionProjectionCatalog["platform.role.assign"]).toEqual({
      capabilities: ["CORE_PLATFORM"], scopes: ["platform", "tenant"]
    });
    expect(Object.keys(permissionProjectionCatalog)).toHaveLength(172);
    expect(migration).toContain("Add only its PLATFORM_ADMIN Platform-control grant; tenant grants remain unchanged.");
    expect(migration).not.toMatch(/INSERT INTO iam\.permissions|ALTER TABLE|CREATE TABLE/i);
  });

  it("keeps assign tenant-only and independent of the Platform projection", () => {
    const assign = operation("membershipRoleAssign");
    expect(assign).toContain('x-tcdx-scope: "tenant"');
    expect(assign).toContain("Actor: Tenant Admin.");
    expect(assign).toContain("TenantContext");
    expect(assign).not.toContain("AdministrativeTenantId");
    expect(assign).toContain("IDEMPOTENCY_KEY_REQUIRED");
    expect(assign).toContain("audit.platform.role.assign.v1");
    expect(projection).toContain("It does not authorize\n`membershipRoleAssign`");
  });

  it("retains explicit Platform revoke, tenant revoke, reason, CAS, replay and audit", () => {
    const revoke = operation("membershipRoleRevoke");
    expect(revoke).toContain('x-tcdx-permission: "`platform.role.assign`"');
    expect(revoke).toContain("Platform Admin uses explicit selected tenant_id query and no tenant header.");
    expect(revoke).toContain("Tenant Admin uses validated tenant header and no tenant_id query");
    expect(revoke).toContain("MembershipRoleRevokeRequest");
    expect(revoke).toContain("MembershipRoleIfMatch");
    expect(revoke).toContain("IDEMPOTENCY_KEY_REQUIRED");
    expect(revoke).toContain("audit.platform.role.revoke.v1");
    expect(revoke).toContain("iam.role.revoked.v1");
    expect(matrix).toContain("same-key replay has no duplicate effects");
  });

  it("separates presentation from endpoint authority and PlatformRoleAssignment", () => {
    expect(projection).toContain("not an\nobject-specific ALLOW decision");
    expect(projection).toContain("Every endpoint independently revalidates");
    expect(projection).toContain("Neither context\nauthorizes PlatformRoleAssignment administration");
    expect(permissionProjectionCatalog["platform.role.administer"]).toEqual({
      capabilities: ["CORE_PLATFORM"], scopes: ["platform"]
    });
  });
});
