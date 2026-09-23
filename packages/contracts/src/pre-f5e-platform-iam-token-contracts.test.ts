import { describe, expect, it } from "vitest";
import expectedSchemaSource from "../../../database/expected-schema.json?raw";
import migrationManifestSource from "../../../database/migrations/manifest.json?raw";
import preF5eMigration from "../../../database/migrations/20260923000100_pre_f5e_platform_authority.sql?raw";
import openApi from "../../../docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml?raw";
import matrix from "../../../docs/executable-contracts/03_API_RESOURCE_OPERATION_MATRIX.md?raw";
import permissions from "../../../docs/executable-contracts/05_PERMISSION_CATALOG.md?raw";
import auditCatalog from "../../../docs/executable-contracts/08_AUDIT_EVENT_CATALOG.md?raw";
import authentication from "../../../docs/executable-contracts/13_AUTHENTICATION_AUTHORIZATION_CONTRACT.md?raw";
import blockers from "../../../docs/executable-contracts/19_OPEN_DECISIONS_AND_BLOCKERS.md?raw";
import preF5eContract from "../../../docs/executable-contracts/21_PRE_F5E_PLATFORM_IAM_AND_TOKEN_BOUNDARY.md?raw";
import physicalAmendment from "../../../docs/physical-data-model/amendments/PRE_F5E_PLATFORM_AUTHORITY_v1.6/01_PLATFORM_IAM_PHYSICAL_MODEL_AMENDMENT.md?raw";
import candidateRbac from "../../../docs/rector/candidates/TCDX_GRC_MASTER_REGENT_BASELINE_v1.6_2026-09-23/22_RBAC_PERMISSION_SCOPE_MATRIX.md?raw";
import candidateRbacModel from "../../../docs/rector/candidates/TCDX_GRC_MASTER_REGENT_BASELINE_v1.6_2026-09-23/09_TCDX_GRC_RBAC_MODEL.md?raw";
import candidateSemantics from "../../../docs/rector/candidates/TCDX_GRC_MASTER_REGENT_BASELINE_v1.6_2026-09-23/39_DECISIONES_SEMANTICAS_FINALES_PRE_MODELO_FISICO.md?raw";
import candidateCatalog from "../../../docs/rector/candidates/TCDX_GRC_MASTER_REGENT_BASELINE_v1.6_2026-09-23/33_CATALOGO_ENTIDADES_CANONICAS.md?raw";
import candidateStatus from "../../../docs/rector/candidates/TCDX_GRC_MASTER_REGENT_BASELINE_v1.6_2026-09-23/BASELINE_STATUS?raw";
import candidateManifest from "../../../docs/rector/candidates/TCDX_GRC_MASTER_REGENT_BASELINE_v1.6_2026-09-23/CANDIDATE_MANIFEST.sha256?raw";
import activeBaselineId from "../../../docs/rector/BASELINE_ID?raw";
import activeBaselineStatus from "../../../docs/rector/BASELINE_STATUS?raw";
import canonicalSeeds from "../../../database/migrations/20260916000900_canonical_seeds.sql?raw";
import preF5eReport from "../../../docs/governance/PRE_F5E_HUMAN_ARCHITECTURE_DECISIONS_REPORT.md?raw";

type ExpectedColumn = { name: string; type: string; nullable: boolean; default: string | null };
type ExpectedTable = { name: string; columns: ExpectedColumn[]; checks: string[]; uniqueConstraints: string[][] };
type ExpectedSchema = { tableCount: number; tables: ExpectedTable[] };
type MigrationManifest = { migrations: Array<{ id: string; filename: string; sha256: string }> };

const expectedSchema = JSON.parse(expectedSchemaSource) as ExpectedSchema;
const migrationManifest = JSON.parse(migrationManifestSource) as MigrationManifest;
const tables = new Map(expectedSchema.tables.map((table) => [table.name, table]));

function operationBlock(operationId: string): string {
  const marker = `      operationId: ${operationId}\n`;
  const start = openApi.indexOf(marker);
  if (start < 0) return "";
  const remainder = openApi.slice(start + marker.length);
  const next = remainder.search(/^  "[^"]+":$|^tags: \[\]$/m);
  return remainder.slice(0, next < 0 ? undefined : next);
}

function schemaBlock(schemaName: string): string {
  const marker = `    ${schemaName}:\n`;
  const start = openApi.indexOf(marker);
  if (start < 0) return "";
  const remainder = openApi.slice(start + marker.length);
  const next = remainder.search(/^    [A-Za-z0-9]+:\n/m);
  return remainder.slice(0, next < 0 ? undefined : next);
}

describe("PRE-F5E canonical Platform IAM materialization", () => {
  it("publishes one checksummed migration and exactly 230 candidate tables", () => {
    expect(expectedSchema.tableCount).toBe(230);
    expect(expectedSchema.tables).toHaveLength(230);
    const migrations = migrationManifest.migrations.filter(({ filename }) => /pre[_-]?f5e/i.test(filename));
    expect(migrations).toHaveLength(1);
    expect(migrations[0]).toMatchObject({ id: "20260923000100", filename: "20260923000100_pre_f5e_platform_authority.sql" });
    expect(migrations[0]?.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(preF5eMigration).toContain("PRE_F5E_POSTCONDITION_EXPECTED_230_TABLES");
    expect(preF5eReport).toContain("DATABASE_TABLES_BEFORE=229");
    expect(preF5eReport).toContain("DATABASE_TABLES_AFTER=230");
  });

  it("materializes the sole persisted Platform grant without tenant, membership or parallel authority", () => {
    const assignment = tables.get("iam.platform_role_assignments");
    expect(assignment).toBeDefined();
    const columns = assignment?.columns.map(({ name }) => name) ?? [];
    expect(columns).toEqual([
      "platform_role_assignment_id", "created_at", "created_by_user_identity_id", "created_by_service_principal_id",
      "ownership_class", "user_identity_id", "role_id", "valid_from", "valid_to"
    ]);
    expect(columns).not.toContain("tenant_id");
    expect(columns).not.toContain("tenant_membership_id");
    expect(preF5eMigration).toContain('CHECK ("ownership_class" = \'PLATFORM_CONTROL\')');
    expect(preF5eMigration).toContain('FOREIGN KEY ("role_id", "ownership_class") REFERENCES "iam"."roles" ("role_id", "ownership_class")');
    expect(preF5eMigration).toContain('UNIQUE ("role_id", "ownership_class")');
    expect(preF5eMigration).toContain('WHERE "valid_to" IS NULL');
    expect(preF5eMigration).not.toMatch(/INSERT\s+INTO\s+iam\.platform_role_assignments/i);
    expect(physicalAmendment).toContain("No person-specific assignment is seeded");
    expect(auditCatalog).toContain("audit.iam.platform_role_assignment.assign.v1");
    expect(auditCatalog).toContain("audit.iam.platform_role_assignment.revoke.v1");
  });

  it("separates Platform and tenant authority while retaining one IAM catalog and default DENY", () => {
    expect(candidateStatus.trim()).toBe("PENDING_HUMAN_APPROVAL");
    expect(candidateCatalog).toContain("PlatformRoleAssignment");
    expect(candidateRbac).toContain("active PlatformRoleAssignment -> Role(PLATFORM_CONTROL)");
    expect(candidateRbac).toContain("active TenantMembership -> commercial entitlement -> active MembershipRole");
    expect(candidateRbac).toContain("Default DENY");
    expect(candidateRbac).toContain("No existe grant por email");
    expect(authentication).toContain("sole human Platform grant authority");
    expect(preF5eReport).toContain("SECOND_GRANT_AUTHORITY_CREATED=0");
  });

  it("closes F5D-007 as a one-time, PLATFORM_ADMIN-only, serialized and audited internal ceremony", () => {
    const contract = [candidateRbacModel, candidateRbac, candidateSemantics, authentication, preF5eContract].join("\n");
    expect(contract).toContain("FIRST_PLATFORM_ADMIN_BOOTSTRAP");
    expect(contract).toContain("role_code=PLATFORM_ADMIN");
    expect(contract).toContain("ownership_class=PLATFORM_CONTROL");
    expect(contract).toContain("COUNT(active PlatformRoleAssignment)=0");
    expect(contract).toContain("zero historical");
    expect(contract).toContain("SELECT ... FOR UPDATE");
    expect(contract).toContain("READ COMMITTED");
    expect(contract).toContain("audit.iam.platform_role_assignment.bootstrap.v1");
    expect(contract).toContain("second");
    expect(contract).toContain("DENY");
    expect(contract).toContain("PLATFORM_SUPPORT");
    expect(contract).toContain("arbitrary role ID");
    expect(preF5eContract).toContain("The target is the authenticated canonical `UserIdentity` itself");
    expect(preF5eContract).toContain("BOOTSTRAP_RUNTIME_IMPLEMENTED=0");
    expect(preF5eContract).toContain("BOOTSTRAP_RUNTIME_SURFACE=NONE");
    expect(blockers).toContain("F5D_007_FIRST_PLATFORM_ADMIN_BOOTSTRAP=CLOSED");
    expect(auditCatalog).toContain("required bootstrap justification");
  });

  it("adds no bootstrap authority, tenant dependency, person seed, table or public endpoint", () => {
    expect(expectedSchema.tableCount).toBe(230);
    expect(expectedSchema.tables.filter(({ name }) => /bootstrap/i.test(name))).toHaveLength(0);
    expect(preF5eMigration).not.toMatch(/CREATE\s+TABLE[^;]*bootstrap/is);
    expect(preF5eMigration).not.toMatch(/INSERT\s+INTO\s+iam\.platform_role_assignments/i);
    expect(canonicalSeeds).toContain("'PLATFORM_ADMIN', 'Platform Admin'");
    expect(canonicalSeeds).not.toMatch(/INSERT\s+INTO\s+iam\.platform_role_assignments/i);
    expect(openApi).not.toMatch(/operationId:\s*\w*bootstrap\w*/i);
    expect(openApi).not.toMatch(/^\s*"[^\n"]*bootstrap[^\n"]*":/im);
    expect(preF5eContract).toContain("no caller field for email, issuer/subject, tenant, membership or arbitrary `role_id`");
    expect(preF5eContract).toContain("creates no bootstrap table, enabled flag, personal seed, environment allowlist, second authority or public endpoint");
  });

  it("keeps the exact candidate evidence and selects the activated v1.6 baseline", () => {
    expect(activeBaselineId.trim()).toBe("TCDX_GRC_MASTER_REGENT_BASELINE_v1.6_2026-09-23");
    expect(activeBaselineStatus.trim()).toBe("ACTIVE");
    const entries = candidateManifest.trim().split("\n");
    expect(entries).toHaveLength(10);
    const files: string[] = [];
    for (const entry of entries) {
      const match = /^([a-f0-9]{64})  \.\/(.+)$/.exec(entry);
      expect(match, entry).not.toBeNull();
      files.push(match![2]!);
    }
    expect(files).toEqual([
      "00_CANDIDATE_README.md", "09_TCDX_GRC_RBAC_MODEL.md", "21_LIFECYCLE_TRANSITION_MATRIX.md",
      "22_RBAC_PERMISSION_SCOPE_MATRIX.md", "30_MODELO_LOGICO_RELACIONAL_CANONICO.md",
      "33_CATALOGO_ENTIDADES_CANONICAS.md", "39_DECISIONES_SEMANTICAS_FINALES_PRE_MODELO_FISICO.md",
      "BASELINE_ID", "BASELINE_STATUS", "CANDIDATE_GATE_REPORT.md"
    ]);
  });

  it("closes tenantCreate with only canonical caller fields and server-owned initial semantics", () => {
    const operation = operationBlock("tenantCreate");
    const request = schemaBlock("TenantCreateRequest");
    const projection = schemaBlock("TenantProjection");
    expect(operation).toContain("TenantCreateRequest");
    expect(operation).not.toContain("DomainCommandRequest");
    expect(request).toContain("required: [tenant_code, legal_name, display_name, default_timezone]");
    for (const forbidden of ["tenant_id:", "lifecycle_state:", "data_classification:", "created_at:", "created_by_"]) expect(request).not.toContain(forbidden);
    expect(projection).toContain("lifecycle_state: { type: string, const: active }");
    expect(projection).toContain("const: confidential");
    expect(schemaBlock("DataClassification")).toContain("enum: [public, internal, confidential, restricted]");
    expect(tables.get("platform.tenants")?.columns.find(({ name }) => name === "lifecycle_state")?.default).toBe("active");
    expect(tables.get("platform.tenants")?.columns.find(({ name }) => name === "data_classification")?.default).toBe("confidential");
    expect(tables.get("platform.tenants")?.checks).toContain("data_classification");
  });

  it("closes membershipCreate for an existing canonical identity with no automatic role", () => {
    const operation = operationBlock("membershipCreate");
    const request = schemaBlock("MembershipCreateRequest");
    expect(operation).toContain("MembershipCreateRequest");
    expect(operation).not.toContain("DomainCommandRequest");
    expect(request).toContain("required: [user_identity_id]");
    expect(request).not.toMatch(/email:|password:|invite|role_id:/i);
    expect(tables.get("iam.tenant_memberships")?.columns.find(({ name }) => name === "membership_state")?.default).toBe("active");
    expect(preF5eContract).toContain("An active membership alone grants no Permission");
  });

  it("preserves membershipRoleAssign without Platform roles or caller valid_from", () => {
    const operation = operationBlock("membershipRoleAssign");
    const request = schemaBlock("MembershipRoleAssignRequest");
    expect(blockers).toContain("F5D_004_MEMBERSHIP_ROLE_ASSIGN=CLOSED");
    expect(operation).toContain("MembershipRoleAssignRequest");
    expect(request).toContain("enum: [tenant, organizational_unit, process, service, audit_engagement, assigned_object, owned_object]");
    expect(request).not.toMatch(/^\s+valid_from:/m);
    expect(request).toContain("PLATFORM_CONTROL roles fail closed");
  });

  it("preserves own active tenant discovery without preselected tenant identity proof", () => {
    const operation = operationBlock("accessGet");
    expect(blockers).toContain("F5D_005_TENANT_CONTEXT_DISCOVERY=CLOSED");
    expect(operation).not.toContain("#/components/parameters/TenantContext");
    expect(schemaBlock("EffectiveAccess")).toContain("available_tenant_contexts");
    expect(preF5eContract).toContain("never enumerates global tenants, other users' memberships or permissions");
    expect(authentication).toContain("never becomes identity proof");
  });

  it("preserves the asymmetric TCDX JWT and rejects all external bearer substitutes", () => {
    for (const claim of ["`iss`", "`aud`", "`sub`", "`jti`", "`iat`", "`exp`", "`principal_class=HUMAN_INTERACTIVE`"]) expect(preF5eContract, claim).toContain(claim);
    expect(preF5eContract).toContain("signing is asymmetric");
    expect(preF5eContract).toContain("EXTERNAL_IDP_TOKEN_AS_API_BEARER=0");
    expect(preF5eContract).toContain("ID_TOKEN_AS_API_BEARER=0");
    expect(preF5eContract).toContain("OPAQUE_TOKEN_AS_API_BEARER=0");
    expect(authentication).toContain("Authorization: Bearer <TCDX-application-access-token>");
  });

  it("preserves permission, scope, audit, event and idempotency for all three admin mutations", () => {
    const expected = {
      tenantCreate: ["platform.tenant.create", "platform", "audit.platform.tenant.create.v1", "platform.tenant.provisioned.v1"],
      membershipCreate: ["platform.membership.create", "tenant", "audit.platform.membership.create.v1", "iam.membership.created.v1"],
      membershipRoleAssign: ["platform.role.assign", "tenant", "audit.platform.role.assign.v1", "iam.role.assigned.v1"]
    } as const;
    for (const [operationId, [permission, scope, audit, event]] of Object.entries(expected)) {
      const operation = operationBlock(operationId);
      expect(operation).toContain(`x-tcdx-permission: "\`${permission}\`"`);
      expect(operation).toContain(`x-tcdx-scope: "${scope}"`);
      expect(operation).toContain(audit);
      expect(operation).toContain(event);
      expect(operation).toContain('x-tcdx-idempotency-class: "IDEMPOTENCY_KEY_REQUIRED"');
      expect(permissions).toContain(`\`${permission}\``);
      expect(matrix).toContain(`| ${operationId} |`);
    }
  });

  it("adds no GRC credential field, provider semantic, fake tenant or Phase 6 change", () => {
    const columns = expectedSchema.tables.flatMap(({ name, columns: tableColumns }) => tableColumns.map(({ name: column }) => `${name}.${column}`));
    expect(columns.filter((column) => /password|password_hash|mfa_secret|recovery_secret/i.test(column))).toEqual([]);
    expect((preF5eContract + authentication + openApi)).not.toMatch(/\b(?:Zoho|Entra|Okta|Google|Keycloak)\b/i);
    expect(preF5eReport).toContain("FAKE_TENANT_CREATED=0");
    expect(preF5eReport).toContain("PLATFORM_TENANT_CREATED=0");
    expect(preF5eReport).toContain("PHASE_6_STARTED=0");
    expect(preF5eReport).toContain("TECHNICAL_DEBT_INTRODUCED=0");
  });
});
