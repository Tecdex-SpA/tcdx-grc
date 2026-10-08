import { describe, expect, it } from "vitest";
import migration from "../../../database/migrations/20260928000100_phase5_administrative_read_permissions.sql?raw";
import manifestSource from "../../../database/migrations/manifest.json?raw";
import seedsSource from "../../../database/seed-manifest.json?raw";
import openApi from "../../../docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml?raw";
import matrix from "../../../docs/executable-contracts/03_API_RESOURCE_OPERATION_MATRIX.md?raw";
import permissions from "../../../docs/executable-contracts/05_PERMISSION_CATALOG.md?raw";

const manifest = JSON.parse(manifestSource) as { migrations: Array<{ id: string; filename: string; sha256: string }> };
const seeds = JSON.parse(seedsSource) as { phase5AdministrativeReadPermissions: {
  migrationId: string; permissionRows: number; permissionCodes: string[];
  platformAdminGrantRows: number; tenantAdminTemplateGrantRows: number; tenantAdminGrantRowsPerTenant: number;
} };

describe("Phase 5 human-approved administrative read contract", () => {
  it("publishes only four additive permissions in one forward-only data-only migration", () => {
    expect(manifest.migrations.length).toBeGreaterThanOrEqual(21);
    expect(manifest.migrations.find(({ id }) => id === "20260928000100")).toMatchObject({ id: "20260928000100", filename: "20260928000100_phase5_administrative_read_permissions.sql" });
    expect(manifest.migrations.find(({ id }) => id === "20260928000100")?.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(seeds.phase5AdministrativeReadPermissions).toMatchObject({
      migrationId: "20260928000100", permissionRows: 4, platformAdminGrantRows: 4,
      tenantAdminTemplateGrantRows: 2, tenantAdminGrantRowsPerTenant: 2,
      permissionCodes: ["platform.tenant.read", "platform.membership.read", "platform.membership_invitation.read", "platform.role.read"]
    });
    expect(migration).toContain("PHASE5_ADMIN_READ_EXPECTED_18_APPLIED");
    expect(migration).toContain("PHASE5_ADMIN_READ_TABLE_COUNT_CHANGED");
    expect(migration).toContain("PHASE5_ADMIN_READ_GRANT_MISMATCH");
    expect(migration).not.toMatch(/CREATE TABLE|ALTER TABLE|DROP TABLE|DELETE FROM iam\.permissions/i);
    expect(permissions).toContain("TOTAL_EXECUTABLE_PERMISSIONS=163");
  });

  it("closes nine exact GET operations with no new mutation, audit, or permission-dump API", () => {
    const operations = ["tenantList", "tenantGet", "membershipList", "membershipGet", "membershipRoleList",
      "membershipInvitationList", "membershipInvitationGet", "roleList", "roleGet"];
    for (const operation of operations) {
      const match = new RegExp(`operationId: ${operation}\\n([\\s\\S]*?)(?=\\n      operationId:|\\n  \")`).exec(openApi);
      expect(match, operation).not.toBeNull();
      expect(match?.[1]).toContain('x-tcdx-idempotency-class: "NATURALLY_IDEMPOTENT"');
      expect(match?.[1]).toContain('x-tcdx-audit-event: "NONE"');
      expect(matrix).toContain(`| ${operation} | GET`);
    }
    expect(openApi).not.toContain("operationId: permissionList");
    expect(openApi).not.toContain("operationId: permissionGet");
  });

  it("excludes identity authority and invitation secrets from every administrative read projection", () => {
    const start = openApi.indexOf("    TenantAdministrativeProjection:");
    const end = openApi.indexOf("    TenantCreateRequest:", start);
    const projections = openApi.slice(start, end);
    expect(projections).toContain("effective_state:");
    expect(projections).toContain("email_normalized:");
    expect(projections).toContain("row_version:");
    expect(projections).not.toMatch(/^\s+(identity_key|stable_subject|token_digest|invitation_token|password|mfa_secret):/m);
    expect(matrix).toContain("Platform mode: no tenant header and required explicit `tenant_id`");
    expect(matrix).toContain("Tenant mode: validated tenant header and no tenant query");
  });
});
