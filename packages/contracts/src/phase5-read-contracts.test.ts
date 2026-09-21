import { describe, expect, it } from "vitest";
import matrix from "../../../docs/executable-contracts/03_API_RESOURCE_OPERATION_MATRIX.md?raw";
import openApi from "../../../docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml?raw";
import permissions from "../../../docs/executable-contracts/05_PERMISSION_CATALOG.md?raw";
import phase5ReadDecision from "../../../docs/governance/PHASE_5_API_READ_CONTRACT_DECISION.md?raw";
import expectedSchemaSource from "../../../database/expected-schema.json?raw";

const expectedSchema = JSON.parse(expectedSchemaSource) as {
  tables: Array<{ name: string; columns: Array<{ name: string }> }>;
};

type ApprovedRead = {
  operationId: string;
  method: "get";
  path: string;
  permission: string;
  responseSchema: string;
};

const approvedReads: ApprovedRead[] = [
  { operationId: "applicabilityList", method: "get", path: "/requirement-applicabilities", permission: "compliance.applicability.read", responseSchema: "RequirementApplicabilityPage" },
  { operationId: "applicabilityGet", method: "get", path: "/requirement-applicabilities/{id}", permission: "compliance.applicability.read", responseSchema: "RequirementApplicabilityProjection" },
  { operationId: "requirementAssessmentList", method: "get", path: "/requirement-assessments", permission: "compliance.requirement_assessment.read", responseSchema: "RequirementAssessmentPage" },
  { operationId: "requirementAssessmentGet", method: "get", path: "/requirement-assessments/{id}", permission: "compliance.requirement_assessment.read", responseSchema: "RequirementAssessmentProjection" },
  { operationId: "soaList", method: "get", path: "/statements-of-applicability", permission: "compliance.soa.read", responseSchema: "StatementOfApplicabilityPage" },
  { operationId: "soaGet", method: "get", path: "/statements-of-applicability/{id}", permission: "compliance.soa.read", responseSchema: "StatementOfApplicabilityProjection" },
  { operationId: "controlList", method: "get", path: "/controls", permission: "controls.control.read", responseSchema: "ControlPage" },
  { operationId: "controlGet", method: "get", path: "/controls/{id}", permission: "controls.control.read", responseSchema: "ControlProjection" },
  { operationId: "controlAssessmentList", method: "get", path: "/control-assessments", permission: "controls.control_assessment.read", responseSchema: "ControlAssessmentPage" },
  { operationId: "controlAssessmentGet", method: "get", path: "/control-assessments/{id}", permission: "controls.control_assessment.read", responseSchema: "ControlAssessmentProjection" },
  { operationId: "assuranceTestList", method: "get", path: "/assurance-tests", permission: "controls.assurance_test.read", responseSchema: "AssuranceTestPage" },
  { operationId: "assuranceTestGet", method: "get", path: "/assurance-tests/{id}", permission: "controls.assurance_test.read", responseSchema: "AssuranceTestProjection" },
  { operationId: "evidenceRequestList", method: "get", path: "/evidence-requests", permission: "evidence.evidence_request.read", responseSchema: "EvidenceRequestPage" },
  { operationId: "evidenceRequestGet", method: "get", path: "/evidence-requests/{id}", permission: "evidence.evidence_request.read", responseSchema: "EvidenceRequestProjection" },
  { operationId: "evidenceList", method: "get", path: "/evidence", permission: "evidence.evidence.read", responseSchema: "EvidencePage" },
  { operationId: "evidenceGet", method: "get", path: "/evidence/{id}", permission: "evidence.evidence.read", responseSchema: "EvidenceProjection" },
  { operationId: "evidenceVersionGet", method: "get", path: "/evidence-versions/{id}", permission: "evidence.evidence.read", responseSchema: "EvidenceVersionProjection" },
  { operationId: "issueList", method: "get", path: "/issues", permission: "remediation.issue.read", responseSchema: "IssuePage" },
  { operationId: "issueGet", method: "get", path: "/issues/{id}", permission: "remediation.issue.read", responseSchema: "IssueProjection" },
  { operationId: "actionList", method: "get", path: "/actions", permission: "remediation.action.read", responseSchema: "ActionPage" },
  { operationId: "actionGet", method: "get", path: "/actions/{id}", permission: "remediation.action.read", responseSchema: "ActionProjection" }
];

const approvedPermissionCodes = [...new Set(approvedReads.map(({ permission }) => permission))];

function parseOpenApiOperations(source: string): Map<string, { method: string; path: string; block: string }> {
  const lines = source.split("\n");
  const operations = new Map<string, { method: string; path: string; block: string }>();
  let currentPath = "";
  let currentMethod = "";

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const pathMatch = /^  "([^"]+)":$/.exec(line);
    if (pathMatch) {
      currentPath = pathMatch[1] ?? "";
      currentMethod = "";
      continue;
    }
    const methodMatch = /^    (get|post):$/.exec(line);
    if (methodMatch) {
      currentMethod = methodMatch[1] ?? "";
      continue;
    }
    const operationMatch = /^      operationId: ([A-Za-z0-9]+)$/.exec(line);
    if (!operationMatch || !currentPath || !currentMethod) continue;
    const blockLines: string[] = [];
    for (let cursor = index; cursor < lines.length; cursor += 1) {
      const candidate = lines[cursor] ?? "";
      if (cursor > index && (/^    (get|post):$/.test(candidate) || /^  "[^"]+":$/.test(candidate) || candidate === "tags: []")) break;
      blockLines.push(candidate);
    }
    operations.set(operationMatch[1] ?? "", { method: currentMethod, path: currentPath, block: blockLines.join("\n") });
  }
  return operations;
}

function parseMatrixOperations(source: string): Map<string, { method: string; path: string; row: string }> {
  const operations = new Map<string, { method: string; path: string; row: string }>();
  for (const row of source.split("\n")) {
    if (!row.startsWith("| ") || !row.includes(" | GET `") && !row.includes(" | POST `")) continue;
    const cells = row.slice(2, -2).split(" | ");
    const methodPath = /^(GET|POST) `([^`]+)`$/.exec(cells[1] ?? "");
    if (!methodPath || !cells[0]) continue;
    operations.set(cells[0], { method: methodPath[1]?.toLowerCase() ?? "", path: methodPath[2] ?? "", row });
  }
  return operations;
}

describe("PRE-F5 approved read-contract materialization", () => {
  const openApiOperations = parseOpenApiOperations(openApi);
  const matrixOperations = parseMatrixOperations(matrix);

  it("matches the exact human-approved operation IDs and routes", () => {
    const approvedByDecision = phase5ReadDecision.split("\n").flatMap((row) => {
      const match = /^\| ([A-Za-z0-9]+) \| (GET) `([^`]+)` \|/.exec(row);
      return match ? [{ operationId: match[1], method: match[2]?.toLowerCase(), path: match[3] }] : [];
    });
    expect(approvedByDecision).toEqual(approvedReads.map(({ operationId, method, path }) => ({ operationId, method, path })));
  });

  it("materializes exactly the 21 approved reads in matrix and OpenAPI", () => {
    expect(approvedReads).toHaveLength(21);
    for (const read of approvedReads) {
      const openApiOperation = openApiOperations.get(read.operationId);
      const matrixOperation = matrixOperations.get(read.operationId);
      expect(openApiOperation, read.operationId).toBeDefined();
      expect(matrixOperation, read.operationId).toBeDefined();
      expect(openApiOperation).toMatchObject({ method: read.method, path: read.path });
      expect(matrixOperation).toMatchObject({ method: read.method, path: read.path });
      expect(openApiOperation?.block).toContain(`x-tcdx-permission: "\`${read.permission}\`"`);
      expect(openApiOperation?.block).toContain('x-tcdx-idempotency-class: "NATURALLY_IDEMPOTENT"');
      expect(openApiOperation?.block).toContain('x-tcdx-transaction-boundary: "RO"');
      expect(openApiOperation?.block).toContain('x-tcdx-domain-events: "NONE"');
      expect(matrixOperation?.row).toContain(`\`${read.permission}\``);
      expect(matrixOperation?.row).toContain("COMMON; NAT");
      expect(matrixOperation?.row).toContain("NONE; NONE");
      expect(matrixOperation?.row).toContain("RO;");
      expect(openApi).toContain(`$ref: '#/components/schemas/${read.responseSchema}'`);
    }
  });

  it("keeps cross-catalog operation counts and operation IDs unique", () => {
    expect(openApiOperations.size).toBe(106);
    expect(matrixOperations.size).toBe(106);
    expect([...openApiOperations.values()].filter(({ method }) => method === "post")).toHaveLength(80);
    expect([...openApiOperations.values()].filter(({ method }) => method === "get")).toHaveLength(26);
    expect([...matrixOperations.values()].filter(({ method }) => method === "post")).toHaveLength(80);
    expect([...matrixOperations.values()].filter(({ method }) => method === "get")).toHaveLength(26);
  });

  it("publishes exactly ten dedicated read permissions without reusing write authority", () => {
    expect(approvedPermissionCodes).toHaveLength(10);
    for (const permission of approvedPermissionCodes) {
      expect(permissions).toContain(`<code>${permission}</code>`);
      expect(permission.endsWith(".read")).toBe(true);
    }
    expect(permissions).toContain("PRE_F5_READ_PERMISSION_ADDITIONS=10");
    expect(permissions).toContain("PRE_F5B_PERMISSION_ADDITIONS=1");
    expect(permissions).toContain("TOTAL_EXECUTABLE_PERMISSIONS=147");
    expect(permissions).toContain("DATABASE_CONTRACT_CHANGED=1");
  });

  it("keeps every material projection field backed by the frozen physical model", () => {
    const physicalColumns = new Map(expectedSchema.tables.map((table) => [table.name, new Set(table.columns.map(({ name }) => name))]));
    const expectedFields: Record<string, string[]> = {
      "regulatory.requirement_applicabilities": ["requirement_applicability_id", "row_version", "requirement_id", "scope_subject_id", "applicability_version", "applicability_decision", "rationale", "lifecycle_state", "effective_from", "effective_to", "approved_at", "superseded_by_id"],
      "regulatory.requirement_assessments": ["requirement_assessment_id", "row_version", "requirement_applicability_id", "methodology_version_ref", "lifecycle_state", "result_status", "domain_conclusion", "coverage_percent", "assessed_at", "approved_at", "effective_configuration_id", "superseded_by_id"],
      "regulatory.statements_of_applicability": ["statement_of_applicability_id", "row_version", "framework_version_id", "soa_version", "title", "lifecycle_state", "effective_from", "effective_to", "approved_at", "published_at", "superseded_by_id"],
      "controls.controls": ["control_id", "row_version", "ownership_class", "control_code", "name", "control_origin", "based_on_control_version_id", "business_owner_subject_id", "lifecycle_state"],
      "controls.control_assessments": ["control_assessment_id", "row_version", "control_id", "control_version_id", "methodology_version_ref", "lifecycle_state", "result_status", "domain_conclusion", "design_effectiveness", "operating_effectiveness", "overall_effectiveness", "coverage_percent", "effective_configuration_id", "assessed_at", "superseded_by_id"],
      "controls.assurance_tests": ["assurance_test_id", "row_version", "control_id", "control_version_id", "test_code", "lifecycle_state", "result_status", "domain_conclusion", "planned_at", "executed_at", "reviewed_at", "approved_at", "executor_membership_id", "reviewer_membership_id", "superseded_by_id"],
      "evidence.evidence_requests": ["evidence_request_id", "row_version", "request_code", "requirement_id", "control_id", "requirement_assessment_id", "control_assessment_id", "assurance_test_id", "lifecycle_state", "requested_by_membership_id", "assigned_membership_id", "due_at", "fulfilled_at"],
      "evidence.evidences": ["evidence_id", "row_version", "evidence_code", "evidence_type", "business_owner_subject_id", "lifecycle_state", "valid_from", "valid_to", "retention_policy_id", "source_kind"],
      "evidence.evidence_versions": ["evidence_version_id", "row_version", "evidence_id", "version_number", "lifecycle_state", "document_version_id", "file_object_id", "period_start", "period_end", "effective_from", "effective_to", "submitted_at", "approved_at", "expires_at", "published_at", "superseded_by_id", "provenance_ref"],
      "remediation.issues": ["issue_id", "row_version", "issue_code", "issue_kind", "title", "description", "lifecycle_state", "severity", "priority", "business_owner_subject_id", "due_date", "dismissal_reason", "closed_at"],
      "remediation.actions": ["action_id", "row_version", "issue_id", "action_code", "title", "description", "lifecycle_state", "priority", "assigned_membership_id", "due_date", "completed_at", "verified_at", "cancel_reason"]
    };
    for (const [table, fields] of Object.entries(expectedFields)) {
      expect(physicalColumns.has(table), table).toBe(true);
      for (const field of fields) expect(physicalColumns.get(table)?.has(field), `${table}.${field}`).toBe(true);
    }
  });

  it("does not add a dashboard/reporting endpoint or leak prohibited projection fields", () => {
    expect(openApi).not.toMatch(/^  "\/dashboard/m);
    const projectionBlock = openApi.slice(openApi.indexOf("    RequirementApplicabilityProjection:"), openApi.indexOf("    AsyncOperation:"));
    expect(projectionBlock).not.toContain("tenant_id:");
    expect(projectionBlock).not.toContain("created_by_user_identity_id:");
    expect(projectionBlock).not.toContain("created_by_service_principal_id:");
    expect(projectionBlock).not.toContain("signed_upload_url:");
    expect(projectionBlock).not.toContain("binary:");
  });
});
