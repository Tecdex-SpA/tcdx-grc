import { describe, expect, it } from "vitest";
import migration from "../../../database/migrations/20260928000200_phase5_membership_role_revoke_platform_grant.sql?raw";
import manifestSource from "../../../database/migrations/manifest.json?raw";
import openApi from "../../../docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml?raw";
import matrix from "../../../docs/executable-contracts/03_API_RESOURCE_OPERATION_MATRIX.md?raw";
import permissions from "../../../docs/executable-contracts/05_PERMISSION_CATALOG.md?raw";

const manifest = JSON.parse(manifestSource) as { migrations: Array<{ id: string; filename: string; sha256: string }> };

describe("Phase 5 human-approved MembershipRole revoke", () => {
  it("uses one forward-only grant and the existing published permission", () => {
    expect(manifest.migrations.length).toBeGreaterThanOrEqual(21);
    expect(manifest.migrations.find(({ id }) => id === "20260928000200")).toMatchObject({
      id: "20260928000200", filename: "20260928000200_phase5_membership_role_revoke_platform_grant.sql",
      sha256: "d47e4fa07250092c5b8c063a60713528627acee864f93278b3c5f0ed5dd57cdc"
    });
    expect(migration).toContain("PHASE5_ROLE_REVOKE_EXPECTED_19_APPLIED");
    expect(migration).toContain("platform.role.assign");
    expect(migration).not.toMatch(/CREATE TABLE|ALTER TABLE|DROP TABLE|DELETE FROM|INSERT INTO iam\.permissions|INSERT INTO iam\.membership_roles|INSERT INTO iam\.platform_role_assignments/i);
    expect(permissions).toContain("| `platform.role.assign` | CORE_PLATFORM | assign/revoke tenant MembershipRole |");
    expect(permissions).toContain("TOTAL_EXECUTABLE_PERMISSIONS=163");
  });

  it("closes the existing operation with separate Platform and tenant contexts", () => {
    const start = openApi.indexOf("      operationId: membershipRoleRevoke");
    const operation = openApi.slice(start, openApi.indexOf("\n  \"/", start));
    expect(operation).toContain("MembershipRoleRevokeRequest");
    expect(operation).toContain("MembershipRoleIfMatch");
    expect(operation).toContain("MembershipRoleRevokeSuccess");
    expect(operation).toContain("AdministrativeTenantId");
    expect(operation).toContain("iam.role.revoked.v1");
    expect(operation).not.toContain("DomainCommandRequest");
    expect(matrix).toContain("same-key replay has no duplicate effects");
    expect(openApi).toContain("    MembershipRoleRevokeOperationResult:");
  });
});
