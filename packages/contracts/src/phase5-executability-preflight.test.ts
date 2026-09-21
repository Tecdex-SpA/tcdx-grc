import { describe, expect, it } from "vitest";
import expectedSchemaSource from "../../../database/expected-schema.json?raw";
import migration from "../../../database/migrations/20260921000100_pre_f5c_executable_physical_reconciliation.sql?raw";
import auditCatalog from "../../../docs/executable-contracts/08_AUDIT_EVENT_CATALOG.md?raw";
import lifecycleSource from "../../../docs/executable-contracts/09_SEED_MANIFESTS.md?raw";
import matrixSource from "../../../docs/executable-contracts/03_API_RESOURCE_OPERATION_MATRIX.md?raw";
import openApi from "../../../docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml?raw";
import permissionCatalog from "../../../docs/executable-contracts/05_PERMISSION_CATALOG.md?raw";

type OpenApiOperation = { method: "get" | "post"; path: string; block: string };
type MatrixOperation = { method: "get" | "post"; path: string; audit: string; row: string };
type Edge = { entity: string; from: string; to: string; command: string; permission: string; audit: string };
type ExpectedTable = {
  name: string;
  profile: string;
  columns: Array<{ name: string; type: string; nullable: boolean; default: string | null }>;
  uniqueConstraints: string[][];
};

const expectedSchema = JSON.parse(expectedSchemaSource) as { tableCount: number; tables: ExpectedTable[] };

function parseOpenApiOperations(source: string): Map<string, OpenApiOperation> {
  const lines = source.split("\n");
  const operations = new Map<string, OpenApiOperation>();
  let path = "";
  let method: "get" | "post" | "" = "";
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const pathMatch = /^  "([^"]+)":$/.exec(line);
    if (pathMatch) {
      path = pathMatch[1] ?? "";
      method = "";
      continue;
    }
    const methodMatch = /^    (get|post):$/.exec(line);
    if (methodMatch) {
      method = methodMatch[1] as "get" | "post";
      continue;
    }
    const operationMatch = /^      operationId: ([A-Za-z0-9]+)$/.exec(line);
    if (!operationMatch || !path || !method) continue;
    const block: string[] = [];
    for (let cursor = index; cursor < lines.length; cursor += 1) {
      const candidate = lines[cursor] ?? "";
      if (cursor > index && (/^    (get|post):$/.test(candidate) || /^  "[^"]+":$/.test(candidate) || candidate === "tags: []")) break;
      block.push(candidate);
    }
    const id = operationMatch[1] ?? "";
    expect(operations.has(id), `duplicate operationId ${id}`).toBe(false);
    operations.set(id, { method, path, block: block.join("\n") });
  }
  return operations;
}

function parseMatrix(source: string): Map<string, MatrixOperation> {
  const operations = new Map<string, MatrixOperation>();
  for (const row of source.split("\n")) {
    const cells = row.startsWith("| ") ? row.slice(2, -2).split(" | ") : [];
    const methodPath = /^(GET|POST) `([^`]+)`$/.exec(cells[1] ?? "");
    if (!methodPath || !/^[a-z][A-Za-z0-9]+$/.test(cells[0] ?? "")) continue;
    const audit = /audit\.[a-z0-9_.]+\.v1/.exec(cells[8] ?? "")?.[0] ?? "NONE";
    operations.set(cells[0]!, { method: methodPath[1]!.toLowerCase() as "get" | "post", path: methodPath[2]!, audit, row });
  }
  return operations;
}

function parseLifecycle(source: string): Edge[] {
  return source.split("\n").flatMap((row) => {
    if (!row.startsWith("| `")) return [];
    const cells = row.slice(2, -2).split(" | ").map((cell) => cell.replaceAll("`", "").trim());
    if (cells.length !== 10 || !cells[3]?.includes(".")) return [];
    return [{ entity: cells[0]!, from: cells[1]!, to: cells[2]!, command: cells[3]!, permission: cells[4]!, audit: cells[6]! }];
  });
}

function schemaBlock(name: string): string {
  const marker = `    ${name}:\n`;
  const start = openApi.indexOf(marker);
  if (start < 0) return "";
  const remainder = openApi.slice(start + marker.length);
  const next = remainder.search(/^    [A-Za-z0-9]+:\n/m);
  return remainder.slice(0, next < 0 ? undefined : next);
}

function canReach(edges: Edge[], entity: string, states: string[]): boolean {
  for (let index = 0; index < states.length - 1; index += 1) {
    if (!edges.some((edge) => edge.entity === entity && edge.from === states[index] && edge.to === states[index + 1])) return false;
  }
  return true;
}

describe("PRE-F5C Phase 5 executability preflight", () => {
  const openApiOperations = parseOpenApiOperations(openApi);
  const matrixOperations = parseMatrix(matrixSource);
  const edges = parseLifecycle(lifecycleSource);
  const tables = new Map(expectedSchema.tables.map((table) => [table.name, table]));

  it("keeps exactly 229 tables and gives every same-row F5 workflow target the canonical mutable columns", () => {
    expect(expectedSchema.tableCount).toBe(229);
    expect(expectedSchema.tables).toHaveLength(229);
    const mutable = [
      "regulatory.requirement_applicabilities",
      "regulatory.requirement_assessments",
      "regulatory.statements_of_applicability",
      "controls.control_assessments",
      "controls.assurance_tests",
      "evidence.evidence_versions"
    ];
    for (const name of mutable) {
      const table = tables.get(name);
      expect(table?.profile, name).toBe("TM");
      const columns = new Map(table?.columns.map((column) => [column.name, column]));
      expect(columns.get("updated_at"), `${name}.updated_at`).toMatchObject({ type: "timestamptz", nullable: false, default: "CURRENT_TIMESTAMP" });
      expect(columns.get("updated_by_user_identity_id"), `${name}.updated_by_user_identity_id`).toMatchObject({ type: "uuid", nullable: true });
      expect(columns.get("updated_by_service_principal_id"), `${name}.updated_by_service_principal_id`).toMatchObject({ type: "uuid", nullable: true });
      expect(columns.get("row_version"), `${name}.row_version`).toMatchObject({ type: "bigint", nullable: false, default: "1" });
    }
    expect(tables.get("regulatory.statement_of_applicability_items")?.columns.some(({ name }) => name === "row_version")).toBe(false);
    expect(migration).not.toMatch(/\bxmin\b/i);
    expect(migration).not.toMatch(/COALESCE\s*\([^)]*scope_subject_id/i);
    expect(migration).not.toMatch(/CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER/i);
    expect(migration).not.toMatch(/CREATE\s+TABLE/i);
  });

  it("materializes the four corrected uniqueness contracts with PostgreSQL NULL-safe semantics", () => {
    const expected: Record<string, string[]> = {
      "regulatory.requirement_applicabilities": ["tenant_id", "requirement_id", "scope_subject_id", "applicability_version"],
      "regulatory.statements_of_applicability": ["tenant_id", "framework_version_id", "soa_version"],
      "regulatory.statement_of_applicability_items": ["tenant_id", "statement_of_applicability_id", "reference_control_version_id"],
      "evidence.evidence_versions": ["tenant_id", "evidence_id", "version_number"]
    };
    for (const [name, columns] of Object.entries(expected)) {
      expect(tables.get(name)?.uniqueConstraints, name).toContainEqual(columns);
      const sqlColumns = columns.map((column) => `"${column}"`).join(", ");
      expect(migration, name).toContain(`UNIQUE NULLS NOT DISTINCT (${sqlColumns})`);
    }
    expect(migration).toContain('FOREIGN KEY ("tenant_id", "superseded_by_id") REFERENCES "regulatory"."requirement_applicabilities" ("tenant_id", "requirement_applicability_id")');
  });

  it("keeps all 106 OpenAPI operations aligned with the matrix and adds exactly the nine authorized operations", () => {
    expect(openApiOperations.size).toBe(106);
    expect(matrixOperations.size).toBe(106);
    expect([...openApiOperations.values()].filter(({ method }) => method === "get")).toHaveLength(26);
    expect([...openApiOperations.values()].filter(({ method }) => method === "post")).toHaveLength(80);
    for (const [id, operation] of openApiOperations) expect(matrixOperations.get(id), id).toMatchObject({ method: operation.method, path: operation.path });
    const required: Record<string, [string, string]> = {
      soaCreate: ["post", "/statements-of-applicability"],
      controlAssessmentStart: ["post", "/control-assessments/{id}:start"],
      assuranceTestCreate: ["post", "/assurance-tests"],
      assuranceTestStart: ["post", "/assurance-tests/{id}:start"],
      assuranceTestReview: ["post", "/assurance-tests/{id}:review"],
      assuranceTestApprove: ["post", "/assurance-tests/{id}:approve"],
      issueStartRemediation: ["post", "/issues/{id}:start-remediation"],
      issueRequestVerification: ["post", "/issues/{id}:request-verification"],
      issueVerifyClose: ["post", "/issues/{id}:verify-close"]
    };
    expect(Object.keys(required)).toHaveLength(9);
    for (const [id, [method, path]] of Object.entries(required)) expect(openApiOperations.get(id), id).toMatchObject({ method, path });
    expect([...openApiOperations.keys()].filter((id) => /updateStatus/i.test(id))).toHaveLength(0);
    expect([...matrixOperations.values()].some(({ row }) => /update_status/i.test(row))).toBe(false);
  });

  it("uses closed request schemas, expected_version only for stateful mutations, and no dual concurrency authority", () => {
    const requests: Record<string, { schema: string; stateful: boolean }> = {
      soaCreate: { schema: "SoaCreateRequest", stateful: false },
      controlAssessmentStart: { schema: "ControlAssessmentStartRequest", stateful: true },
      assuranceTestCreate: { schema: "AssuranceTestCreateRequest", stateful: false },
      assuranceTestStart: { schema: "AssuranceTestStartRequest", stateful: true },
      assuranceTestReview: { schema: "AssuranceTestReviewRequest", stateful: true },
      assuranceTestApprove: { schema: "AssuranceTestApproveRequest", stateful: true },
      issueStartRemediation: { schema: "IssueStartRemediationRequest", stateful: true },
      issueRequestVerification: { schema: "IssueRequestVerificationRequest", stateful: true },
      issueVerifyClose: { schema: "IssueVerifyCloseRequest", stateful: true }
    };
    for (const [id, contract] of Object.entries(requests)) {
      expect(openApiOperations.get(id)?.block, id).toContain(`#/components/schemas/${contract.schema}`);
      const schema = schemaBlock(contract.schema);
      expect(schema, contract.schema).toContain("additionalProperties: false");
      expect(schema.includes("expected_version"), contract.schema).toBe(contract.stateful);
      if (contract.stateful) expect(schema).toContain("required: [expected_version");
      expect(openApiOperations.get(id)?.block, id).not.toContain("#/components/parameters/IfMatch");
    }
    expect(openApi).toContain("must equal the target row's explicit `row_version`");
  });

  it("publishes exactly 100 authoritative edges and proves every mandated lifecycle path without a skipped state", () => {
    expect(edges).toHaveLength(100);
    const graphs: Array<[string, string[]]> = [
      ["RequirementApplicability", ["draft", "submitted", "approved"]],
      ["RequirementAssessment", ["not_assessed", "in_progress", "assessed", "approved"]],
      ["StatementOfApplicability", ["draft", "published"]],
      ["ControlAssessment", ["planned", "in_progress", "completed", "reviewed", "approved"]],
      ["AssuranceTest", ["planned", "in_progress", "completed", "reviewed", "approved"]],
      ["EvidenceVersion", ["draft", "submitted", "under_review", "approved"]],
      ["Issue", ["open", "triaged", "remediation_in_progress", "pending_verification", "verified_closed"]],
      ["Action", ["pending", "in_progress", "in_review", "completed", "verified"]]
    ];
    for (const [entity, states] of graphs) expect(canReach(edges, entity, states), entity).toBe(true);
    expect(edges.some(({ command }) => command === "assurance_test.complete")).toBe(false);
    expect(edges.some(({ command }) => command === "assurance_test.execute")).toBe(true);
    expect(edges.some(({ command }) => /update_status/i.test(command))).toBe(false);
  });

  it("maps every API-backed F5 lifecycle command to one edge and exactly the same audit code", () => {
    const mappings: Record<string, [string, string]> = {
      applicabilitySubmit: ["RequirementApplicability", "applicability.submit"],
      applicabilityApprove: ["RequirementApplicability", "applicability.approve"],
      requirementAssessmentStart: ["RequirementAssessment", "requirement_assessment.start"],
      requirementAssessmentSubmit: ["RequirementAssessment", "requirement_assessment.submit"],
      requirementAssessmentApprove: ["RequirementAssessment", "requirement_assessment.approve"],
      soaPublish: ["StatementOfApplicability", "soa.publish"],
      controlAssessmentStart: ["ControlAssessment", "control_assessment.start"],
      controlAssessmentSubmit: ["ControlAssessment", "control_assessment.complete"],
      controlAssessmentReview: ["ControlAssessment", "control_assessment.review"],
      controlAssessmentApprove: ["ControlAssessment", "control_assessment.approve"],
      assuranceTestStart: ["AssuranceTest", "assurance_test.start"],
      assuranceTestExecute: ["AssuranceTest", "assurance_test.execute"],
      assuranceTestReview: ["AssuranceTest", "assurance_test.review"],
      assuranceTestApprove: ["AssuranceTest", "assurance_test.approve"],
      evidenceSubmit: ["EvidenceVersion", "evidence.submit"],
      evidenceReviewStart: ["EvidenceVersion", "evidence.start_review"],
      evidenceApprove: ["EvidenceVersion", "evidence.approve"],
      evidenceReject: ["EvidenceVersion", "evidence.reject"],
      issueTriage: ["Issue", "issue.triage"],
      issueStartRemediation: ["Issue", "issue.start_remediation"],
      issueRequestVerification: ["Issue", "issue.request_verification"],
      issueVerifyClose: ["Issue", "issue.verify_close"],
      actionStart: ["Action", "action.start"],
      actionSubmitForReview: ["Action", "action.submit_review"],
      actionComplete: ["Action", "action.complete"],
      actionVerify: ["Action", "action.verify"]
    };
    expect(Object.keys(mappings)).toHaveLength(26);
    for (const [operationId, [entity, command]] of Object.entries(mappings)) {
      const matches = edges.filter((edge) => edge.entity === entity && edge.command === command);
      expect(matches, `${entity}.${command}`).toHaveLength(1);
      const matrixAudit = matrixOperations.get(operationId)?.audit;
      const openApiAudit = /x-tcdx-audit-event: "`([^`]+)`"/.exec(openApiOperations.get(operationId)?.block ?? "")?.[1];
      expect(matrixAudit, operationId).toBe(matches[0]?.audit);
      expect(openApiAudit, operationId).toBe(matches[0]?.audit);
      expect(matches[0]?.audit, operationId).not.toMatch(/^audit\.lifecycle\./);
    }
    const operationAudits = [...matrixOperations.values()].map(({ audit }) => audit).filter((audit) => audit !== "NONE");
    const uniqueAudits = new Set([...operationAudits, ...edges.map(({ audit }) => audit)]);
    expect(operationAudits).toHaveLength(80);
    expect(uniqueAudits.size).toBe(154);
    expect(auditCatalog).toContain("PUBLISHED_AUDIT_EVENT_CODES=154");
    expect(auditCatalog).toContain("exactly one material AuditEvent");
  });

  it("adds only the two authorized permissions and resolves their role grants by code", () => {
    expect(permissionCatalog).toContain("PRE_F5C_PERMISSION_ADDITIONS=2");
    expect(permissionCatalog).toContain("TOTAL_EXECUTABLE_PERMISSIONS=147");
    expect(permissionCatalog).toContain("<code>compliance.soa.create</code>");
    expect(permissionCatalog).toContain("<code>controls.assurance_test.create</code>");
    expect(migration.match(/INSERT INTO iam\.permissions /g)).toHaveLength(2);
    expect(migration.match(/INSERT INTO iam\.role_permissions /g)).toHaveLength(5);
    expect(migration).toContain("r.role_code = 'GRC_MANAGER'");
    expect(migration).toContain("p.permission_code = 'compliance.soa.create'");
    expect(migration).toContain("p.permission_code = 'controls.assurance_test.create'");
  });

  it("has creation and transition operations sufficient for the approved Core GRC E2E chain", () => {
    const requiredOperations = [
      "requirementList", "applicabilityCreate", "applicabilitySubmit", "applicabilityApprove",
      "requirementAssessmentCreate", "requirementAssessmentStart", "requirementAssessmentSubmit", "requirementAssessmentApprove",
      "soaCreate", "soaPublish", "controlInstantiate", "controlAssessmentCreate", "controlAssessmentStart",
      "controlAssessmentSubmit", "controlAssessmentReview", "controlAssessmentApprove", "assuranceTestCreate",
      "assuranceTestStart", "assuranceTestExecute", "assuranceTestReview", "assuranceTestApprove",
      "evidenceRequestCreate", "uploadIntentCreate", "uploadFinalize", "evidenceCreate", "evidenceSubmit",
      "evidenceReviewStart", "evidenceApprove", "issueCreate", "issueTriage", "issueStartRemediation",
      "actionCreate", "actionStart", "actionSubmitForReview", "actionComplete", "actionVerify",
      "issueRequestVerification", "issueVerifyClose"
    ];
    for (const operationId of requiredOperations) expect(openApiOperations.has(operationId), operationId).toBe(true);
  });
});
