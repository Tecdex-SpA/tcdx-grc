import { describe, expect, it } from "vitest";
import migration from "../../../database/migrations/20260924000300_phase5_membership_invitation.sql?raw";
import authorityReconciliation from "../../../database/migrations/20260925000100_phase5_membership_invitation_platform_authority_reconciliation.sql?raw";
import manifestSource from "../../../database/migrations/manifest.json?raw";
import schemaSource from "../../../database/expected-schema.json?raw";
import seedSource from "../../../database/seed-manifest.json?raw";
import openApi from "../../../docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml?raw";
import matrix from "../../../docs/executable-contracts/03_API_RESOURCE_OPERATION_MATRIX.md?raw";
import authentication from "../../../docs/executable-contracts/13_AUTHENTICATION_AUTHORIZATION_CONTRACT.md?raw";

const manifest = JSON.parse(manifestSource) as { migrations: Array<{ id: string; filename: string; sha256: string }> };
const schema = JSON.parse(schemaSource) as { tableCount: number; tables: Array<{ name: string; columns: Array<{ name: string }> }> };
const seeds = JSON.parse(seedSource) as { phase5MembershipInvitationPermissions: { migrationId: string; authorityReconciliationMigrationId: string; permissionRows: number; rolePermissionRows: number; rolePermissionPolicy: string; permissionCodes: string[] } };

describe("Phase 5 canonical tenant-user enrollment contract", () => {
  it("adds exactly one forward-only successor table after RetentionPolicy", () => {
    expect(schema.tableCount).toBe(235);
    expect(schema.tables.filter(({ name }) => name === "iam.tenant_membership_invitations")).toHaveLength(1);
    expect(manifest.migrations.length).toBeGreaterThanOrEqual(21);
    expect(manifest.migrations.find(({ id }) => id === "20260924000300")).toMatchObject({
      id: "20260924000300", filename: "20260924000300_phase5_membership_invitation.sql",
      sha256: "0942e5eb360f7157a444d7b04fbe7558312e8d782347e60a745a8d4365034806"
    });
    expect(manifest.migrations.find(({ id }) => id === "20260925000100")).toMatchObject({
      id: "20260925000100", filename: "20260925000100_phase5_membership_invitation_platform_authority_reconciliation.sql"
    });
    expect(manifest.migrations.find(({ id }) => id === "20260925000100")?.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(migration).toContain("PHASE5_MEMBERSHIP_INVITATION_EXPECTED_16_APPLIED");
    expect(migration).toContain("PHASE5_MEMBERSHIP_INVITATION_EXPECTED_232_TABLES");
  });

  it("persists only the invitation digest and no credential or clear-token field", () => {
    const table = schema.tables.find(({ name }) => name === "iam.tenant_membership_invitations")!;
    const columns = table.columns.map(({ name }) => name);
    expect(columns).toContain("token_digest");
    expect(columns).not.toContain("invitation_token");
    expect(columns.filter((name) => /password|mfa|secret|access_token|id_token/i.test(name))).toEqual([]);
    expect(migration).toContain("token_digest ~ '^[0-9a-f]{64}$'");
    expect(migration).toContain("authentication_method='ZOHO'");
    expect(migration).toContain("lifecycle_state IN ('pending','accepted','expired','revoked')");
  });

  it("publishes only the two Platform Admin permissions", () => {
    expect(seeds.phase5MembershipInvitationPermissions).toEqual({
      migrationId: "20260924000300",
      authorityReconciliationMigrationId: "20260925000100",
      permissionRows: 2,
      rolePermissionRows: 2,
      rolePermissionPolicy: "PLATFORM_ADMIN_ONLY",
      permissionCodes: ["platform.membership_invitation.create", "platform.membership_invitation.update"]
    });
    expect(authorityReconciliation).toContain("r.role_code='PLATFORM_ADMIN'");
    expect(authorityReconciliation).toContain("rp.ownership_class='PLATFORM_CONTROL'");
    expect(authorityReconciliation).toContain("DELETE FROM iam.role_permissions");
    expect(authorityReconciliation).toContain("PHASE5_MEMBERSHIP_INVITATION_AUTHORITY_UNAUTHORIZED_GRANTS");
    expect(authorityReconciliation).not.toMatch(/role_code='(?:TENANT_ADMIN|EVIDENCE_OWNER|CONTROL_OWNER|LEGAL_REVIEWER)'/);
  });

  it("publishes create/revoke while keeping acceptance an internal one-time Zoho ceremony", () => {
    for (const operation of ["membershipInvitationCreate", "membershipInvitationRevoke"]) {
      expect(openApi).toContain(`operationId: ${operation}`);
      expect(matrix).toContain(`| ${operation} |`);
    }
    expect(openApi).toContain('"/platform/membership-invitations"');
    expect(openApi).toContain('x-tcdx-scope: "platform"');
    expect(openApi).not.toContain("operationId: membershipInvitationAccept");
    expect(authentication).toContain("`MEMBERSHIP_INVITATION_ACCEPT`");
    expect(authentication).toContain("Zoho is the only enabled provider");
    expect(authentication).toContain("issuer + stable subject");
    expect(authentication).toContain("assigns no role");
  });
});
