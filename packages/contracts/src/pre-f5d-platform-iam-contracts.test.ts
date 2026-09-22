import { describe, expect, it } from "vitest";
import expectedSchemaSource from "../../../database/expected-schema.json?raw";
import iamMigration from "../../../database/migrations/20260916000200_platform_iam_organization.sql?raw";
import seeds from "../../../database/migrations/20260916000900_canonical_seeds.sql?raw";
import openApi from "../../../docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml?raw";
import matrix from "../../../docs/executable-contracts/03_API_RESOURCE_OPERATION_MATRIX.md?raw";
import permissions from "../../../docs/executable-contracts/05_PERMISSION_CATALOG.md?raw";
import authentication from "../../../docs/executable-contracts/13_AUTHENTICATION_AUTHORIZATION_CONTRACT.md?raw";
import blockers from "../../../docs/executable-contracts/19_OPEN_DECISIONS_AND_BLOCKERS.md?raw";
import physicalRbac from "../../../docs/physical-data-model/08_RBAC_PHYSICAL_MODEL.md?raw";
import reconciliation from "../../../docs/governance/PRE_F5D_PLATFORM_IAM_CONTRACT_RECONCILIATION_REPORT.md?raw";

type ExpectedSchema = {
  tableCount: number;
  tables: Array<{ name: string; columns: Array<{ name: string }> }>;
};

const expectedSchema = JSON.parse(expectedSchemaSource) as ExpectedSchema;

function operationBlock(operationId: string): string {
  const marker = `      operationId: ${operationId}\n`;
  const start = openApi.indexOf(marker);
  if (start < 0) return "";
  const remainder = openApi.slice(start + marker.length);
  const next = remainder.search(/^  "[^"]+":$|^tags: \[\]$/m);
  return remainder.slice(0, next < 0 ? undefined : next);
}

describe("PRE-F5D Platform IAM contract reconciliation", () => {
  it("blocks Platform Admin materialization through a fake or platform tenant", () => {
    expect(reconciliation).toContain("PLATFORM_ADMIN_PHYSICAL_BINDING=BLOCKED_MODEL_GAP");
    expect(reconciliation).toContain("NO_FAKE_TENANT=PASS");
    expect(reconciliation).toContain("NO_PLATFORM_TENANT=PASS");
    expect(iamMigration).not.toContain("SYSTEM_TENANT_ID");
    expect(iamMigration).not.toContain("platform_tenant");
  });

  it("does not reinterpret tenant MembershipRole as a platform-role binding", () => {
    const iamTables = expectedSchema.tables.filter(({ name }) => name.startsWith("iam.")).map(({ name }) => name).sort();
    expect(iamTables).toEqual([
      "iam.impersonation_sessions",
      "iam.membership_roles",
      "iam.permissions",
      "iam.role_permissions",
      "iam.roles",
      "iam.service_principals",
      "iam.tenant_memberships",
      "iam.user_identities"
    ]);
    expect(physicalRbac).toContain("`iam.membership_roles` | tenant+membership+role+scope+validity");
    expect(iamMigration).toMatch(/CREATE TABLE "iam"\."membership_roles"[\s\S]*?"tenant_id" uuid NOT NULL[\s\S]*?"tenant_membership_id" uuid NOT NULL/);
    expect(seeds).toContain("'PLATFORM_CONTROL', NULL, 'PLATFORM_ADMIN', 'Platform Admin'");
    expect(blockers).toContain("F5D-001");
  });

  it("never reports an administrative schema closed while it still uses DomainCommandRequest", () => {
    const schemas = {
      TENANT_CREATE_SCHEMA: "tenantCreate",
      MEMBERSHIP_CREATE_SCHEMA: "membershipCreate",
      MEMBERSHIP_ROLE_ASSIGN_SCHEMA: "membershipRoleAssign"
    } as const;
    for (const [statusName, operationId] of Object.entries(schemas)) {
      const status = new RegExp(`^${statusName}=([^\\n]+)$`, "m").exec(reconciliation)?.[1];
      expect(status, statusName).toBeDefined();
      if (status === "CLOSED") {
        expect(operationBlock(operationId), operationId).not.toContain("DomainCommandRequest");
      } else {
        expect(status, statusName).toBe("BLOCKED_EXECUTABLE_CONTRACT");
        expect(operationBlock(operationId), operationId).toContain("DomainCommandRequest");
      }
    }
  });

  it("retains permission, scope, audit, event and idempotency on every published admin mutation", () => {
    const expected = {
      tenantCreate: ["platform.tenant.create", "platform", "audit.platform.tenant.create.v1", "platform.tenant.provisioned.v1"],
      membershipCreate: ["platform.membership.create", "tenant", "audit.platform.membership.create.v1", "iam.membership.created.v1"],
      membershipRoleAssign: ["platform.role.assign", "tenant", "audit.platform.role.assign.v1", "iam.role.assigned.v1"]
    } as const;
    for (const [operationId, [permission, scope, audit, event]] of Object.entries(expected)) {
      const block = operationBlock(operationId);
      expect(block, operationId).toContain(`x-tcdx-permission: "\`${permission}\`"`);
      expect(block, operationId).toContain(`x-tcdx-scope: "${scope}"`);
      expect(block, operationId).toContain(audit);
      expect(block, operationId).toContain(event);
      expect(block, operationId).toContain('x-tcdx-idempotency-class: "IDEMPOTENCY_KEY_REQUIRED"');
      expect(permissions, permission).toContain(`\`${permission}\``);
      expect(matrix, operationId).toContain(`| ${operationId} |`);
    }
  });

  it("blocks tenant-context discovery until a permission and complete executable shape are approved", () => {
    expect(reconciliation).toContain("TENANT_CONTEXT_DISCOVERY=BLOCKED_EXECUTABLE_CONTRACT");
    expect(reconciliation).toContain("MISSING_DECISIONS=PATH_OR_ACCESSGET_SEMANTICS,OPERATION_ID,PERMISSION,RESPONSE_SHAPE,PAGINATION");
    expect(openApi).not.toMatch(/operationId: (?:membershipList|tenantContextList|tenantMembershipList)/);
    expect(operationBlock("accessGet")).toContain('x-tcdx-permission: "authenticated context"');
    expect(operationBlock("accessGet")).not.toContain("TenantMembershipPage");
  });

  it("prohibits using an id_token as the protected-API bearer", () => {
    expect(reconciliation).toContain("ID_TOKEN_AS_API_BEARER=PROHIBITED");
    expect(authentication).toContain("Authorization: Bearer <access-token>");
    expect(authentication).toContain("The access token is a JWT");
  });

  it("keeps opaque access tokens fail-closed under the JWT contract", () => {
    expect(reconciliation).toContain("OPAQUE_ACCESS_TOKEN_AS_API_BEARER=PROHIBITED_FAIL_CLOSED");
    expect(authentication).toContain("Validation fails closed");
    expect(openApi).toContain("bearerFormat: JWT");
  });

  it("keeps UserIdentity provider-neutral and keyed by issuer plus stable subject, not email", () => {
    expect(reconciliation).toContain("EXTERNAL_IDENTITY_KEY=provider_issuer+stable_subject");
    expect(reconciliation).toContain("EMAIL_ROLE=ATTRIBUTE_NOT_PRIMARY_IDENTITY");
    expect(authentication).toContain("The concrete commercial IdP, exact claims mapping, issuer URL");
    expect((authentication + physicalRbac + reconciliation).toLowerCase()).not.toContain("zoho");
  });

  it("adds no password, password-hash or MFA-secret field to the GRC model", () => {
    const columns = expectedSchema.tables.flatMap(({ name, columns: tableColumns }) => tableColumns.map(({ name: column }) => `${name}.${column}`));
    expect(columns.filter((column) => /password|password_hash|mfa_secret/i.test(column))).toEqual([]);
    expect(reconciliation).toContain("PASSWORD_COLUMNS_ADDED=0");
    expect(reconciliation).toContain("PASSWORD_HASH_COLUMNS_ADDED=0");
    expect(reconciliation).toContain("MFA_SECRET_COLUMNS_ADDED=0");
  });

  it("preserves the frozen 229-table schema with no PRE-F5D migration", () => {
    expect(expectedSchema.tableCount).toBe(229);
    expect(expectedSchema.tables).toHaveLength(229);
    expect(reconciliation).toContain("DATABASE_TABLES=229");
    expect(reconciliation).toContain("DATABASE_SCHEMA_CHANGED=0");
    expect(reconciliation).toContain("MIGRATION_CREATED=0");
    expect(reconciliation).toContain("PHYSICAL_MODEL_CHANGED=0");
    expect(reconciliation).toContain("PRE_F5D=BLOCKED");
  });
});
