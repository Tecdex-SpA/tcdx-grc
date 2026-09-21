import { describe, expect, it } from "vitest";
import expectedSchemaSource from "../../../database/expected-schema.json?raw";
import matrix from "../../../docs/executable-contracts/03_API_RESOURCE_OPERATION_MATRIX.md?raw";
import events from "../../../docs/executable-contracts/04_EVENT_CATALOG.md?raw";
import permissions from "../../../docs/executable-contracts/05_PERMISSION_CATALOG.md?raw";
import idempotency from "../../../docs/executable-contracts/07_IDEMPOTENCY_CONTRACT.md?raw";
import audits from "../../../docs/executable-contracts/08_AUDIT_EVENT_CATALOG.md?raw";
import lifecycle from "../../../docs/executable-contracts/09_SEED_MANIFESTS.md?raw";
import decision from "../../../docs/governance/PRE_F5B_EXECUTABLE_CONTRACT_DECISION.md?raw";
import openApi from "../../../docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml?raw";

type ParsedOperation = { method: "get" | "post"; path: string; block: string };

const collectionOrders: Record<string, string> = {
  applicabilityList: "created_at DESC, requirement_applicability_id DESC",
  requirementAssessmentList: "created_at DESC, requirement_assessment_id DESC",
  soaList: "created_at DESC, statement_of_applicability_id DESC",
  controlList: "created_at DESC, control_id DESC",
  controlAssessmentList: "created_at DESC, control_assessment_id DESC",
  assuranceTestList: "created_at DESC, assurance_test_id DESC",
  evidenceRequestList: "created_at DESC, evidence_request_id DESC",
  evidenceList: "created_at DESC, evidence_id DESC",
  issueList: "created_at DESC, issue_id DESC",
  actionList: "created_at DESC, action_id DESC"
};

const f5MutationSchemas: Record<string, string> = {
  applicabilityCreate: "ApplicabilityCreateRequest",
  applicabilitySubmit: "ApplicabilitySubmitRequest",
  applicabilityApprove: "ApplicabilityApproveRequest",
  requirementAssessmentCreate: "RequirementAssessmentCreateRequest",
  requirementAssessmentStart: "RequirementAssessmentStartRequest",
  requirementAssessmentSubmit: "RequirementAssessmentSubmitRequest",
  requirementAssessmentApprove: "RequirementAssessmentApproveRequest",
  soaCreate: "SoaCreateRequest",
  soaPublish: "SoaPublishRequest",
  controlInstantiate: "ControlInstantiateRequest",
  controlAssessmentCreate: "ControlAssessmentCreateRequest",
  controlAssessmentStart: "ControlAssessmentStartRequest",
  controlAssessmentSubmit: "ControlAssessmentSubmitRequest",
  controlAssessmentReview: "ControlAssessmentReviewRequest",
  controlAssessmentApprove: "ControlAssessmentApproveRequest",
  assuranceTestCreate: "AssuranceTestCreateRequest",
  assuranceTestStart: "AssuranceTestStartRequest",
  assuranceTestExecute: "AssuranceTestExecuteRequest",
  assuranceTestReview: "AssuranceTestReviewRequest",
  assuranceTestApprove: "AssuranceTestApproveRequest",
  uploadIntentCreate: "UploadIntentCreateRequest",
  uploadFinalize: "UploadFinalizeRequest",
  evidenceRequestCreate: "EvidenceRequestCreateRequest",
  evidenceRequestFulfill: "EvidenceRequestFulfillRequest",
  evidenceCreate: "EvidenceCreateRequest",
  evidenceSubmit: "EvidenceSubmitRequest",
  evidenceReviewStart: "EvidenceReviewStartRequest",
  evidenceApprove: "EvidenceApproveRequest",
  evidenceReject: "EvidenceRejectRequest",
  issueCreate: "IssueCreateRequest",
  issueTriage: "IssueTriageRequest",
  issueStartRemediation: "IssueStartRemediationRequest",
  issueRequestVerification: "IssueRequestVerificationRequest",
  issueVerifyClose: "IssueVerifyCloseRequest",
  actionCreate: "ActionCreateRequest",
  actionStart: "ActionStartRequest",
  actionSubmitForReview: "ActionSubmitForReviewRequest",
  actionComplete: "ActionCompleteRequest",
  actionVerify: "ActionVerifyRequest"
};

const versionedF5Mutations = new Set([
  "applicabilitySubmit",
  "applicabilityApprove",
  "requirementAssessmentStart",
  "requirementAssessmentSubmit",
  "requirementAssessmentApprove",
  "soaPublish",
  "controlAssessmentStart",
  "controlAssessmentSubmit",
  "controlAssessmentReview",
  "controlAssessmentApprove",
  "assuranceTestExecute",
  "assuranceTestStart",
  "assuranceTestReview",
  "assuranceTestApprove",
  "uploadFinalize",
  "evidenceRequestFulfill",
  "evidenceSubmit",
  "evidenceReviewStart",
  "evidenceApprove",
  "evidenceReject",
  "issueTriage",
  "issueStartRemediation",
  "issueRequestVerification",
  "issueVerifyClose",
  "actionStart",
  "actionSubmitForReview",
  "actionComplete",
  "actionVerify"
]);

function parseOperations(source: string): Map<string, ParsedOperation> {
  const lines = source.split("\n");
  const result = new Map<string, ParsedOperation>();
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
    result.set(operationMatch[1] ?? "", { method, path, block: block.join("\n") });
  }
  return result;
}

function schemaBlock(name: string): string {
  const marker = `    ${name}:\n`;
  const start = openApi.indexOf(marker);
  if (start < 0) return "";
  const remainder = openApi.slice(start + marker.length);
  const next = remainder.search(/^    [A-Za-z0-9]+:\n/m);
  return remainder.slice(0, next < 0 ? undefined : next);
}

function parseMatrixOperations(source: string): Map<string, { method: string; path: string }> {
  const result = new Map<string, { method: string; path: string }>();
  for (const row of source.split("\n")) {
    const match = /^\| ([A-Za-z0-9]+) \| (GET|POST) `([^`]+)` \|/.exec(row);
    if (match) result.set(match[1] ?? "", { method: (match[2] ?? "").toLowerCase(), path: match[3] ?? "" });
  }
  return result;
}

describe("PRE-F5B executable-contract closure", () => {
  const operations = parseOperations(openApi);

  it("publishes exactly 106 operations and 80 mutations after PRE-F5C", () => {
    expect(operations.size).toBe(106);
    expect([...operations.values()].filter(({ method }) => method === "get")).toHaveLength(26);
    expect([...operations.values()].filter(({ method }) => method === "post")).toHaveLength(80);
    expect(matrix).toContain("`CONTRACTUAL_OPERATIONS=106`");
    expect(matrix).toContain("`PUBLIC_MUTATING_OPERATIONS=80`");
  });

  it("keeps every operation ID, method and path aligned between OpenAPI and the matrix", () => {
    const matrixOperations = parseMatrixOperations(matrix);
    expect(matrixOperations.size).toBe(106);
    const matrixEntries = [...matrixOperations.entries()].sort(([left], [right]) => left.localeCompare(right));
    const openApiEntries = [...operations.entries()]
      .map(([operationId, { method, path }]) => [operationId, { method, path }] as const)
      .sort(([left], [right]) => left.localeCompare(right));
    expect(matrixEntries).toEqual(openApiEntries);
  });

  it("closes the exact 39 Phase 5 mutation request schemas without dual concurrency authority", () => {
    expect(Object.keys(f5MutationSchemas)).toHaveLength(39);
    for (const [operationId, requestSchema] of Object.entries(f5MutationSchemas)) {
      const operation = operations.get(operationId);
      expect(operation?.method, operationId).toBe("post");
      expect(operation?.block, operationId).toContain(`#/components/schemas/${requestSchema}`);
      expect(operation?.block, operationId).not.toContain("DomainCommandRequest");
      expect(operation?.block, operationId).not.toContain("#/components/parameters/IfMatch");
      const request = schemaBlock(requestSchema);
      expect(request, requestSchema).toContain("additionalProperties: false");
      if (versionedF5Mutations.has(operationId)) {
        expect(request, `${operationId} expected_version`).toContain("required: [expected_version");
      } else {
        expect(request, `${operationId} create request`).not.toContain("expected_version");
      }
    }
    expect(versionedF5Mutations.size).toBe(28);
    expect(schemaBlock("IssueCreateRequest")).toContain("priority: { type: string, minLength: 1, maxLength: 32 }");
    expect(schemaBlock("IssueTriageRequest")).toContain("priority: { type: string, minLength: 1, maxLength: 32 }");
    expect(schemaBlock("ActionCreateRequest")).toContain("priority: { type: string, minLength: 1, maxLength: 32 }");
  });

  it("keeps operation permission, audit, event and idempotency decisions internally closed", () => {
    for (const [operationId, operation] of operations) {
      const permission = /x-tcdx-permission: "`([^`]+)`"/.exec(operation.block)?.[1];
      if (operationId !== "accessGet") {
        expect(permission, `${operationId} permission`).toBeDefined();
        expect(permissions, `${operationId} permission catalog`).toContain(permission);
      }
      const audit = /x-tcdx-audit-event: "`([^`]+)`"/.exec(operation.block)?.[1];
      const event = /x-tcdx-domain-events: "`([^`]+)`"/.exec(operation.block)?.[1];
      if (operation.method === "post") {
        expect(operation.block, `${operationId} idempotency`).toContain('x-tcdx-idempotency-class: "IDEMPOTENCY_KEY_REQUIRED"');
        expect(audit, `${operationId} audit`).toMatch(/^audit\..+\.v1$/);
      } else {
        expect(operation.block, `${operationId} idempotency`).toContain('x-tcdx-idempotency-class: "NATURALLY_IDEMPOTENT"');
        expect(operation.block, `${operationId} audit`).toContain('x-tcdx-audit-event: "NONE"');
      }
      if (event) expect(events, `${operationId} event catalog`).toContain(`\`${event}\``);
    }
    expect(idempotency).toContain("All 26 published GET operations");
    expect(idempotency).toContain("All 80 published POST operations");
    expect(audits).toContain("MUTATING_OPERATIONS=80");
    expect(audits).toContain("PUBLISHED_AUDIT_EVENT_CODES=154");
  });

  it("fixes cursor pagination and stable order for the ten Phase 5 collections", () => {
    expect(Object.keys(collectionOrders)).toHaveLength(10);
    const pageSize = openApi.slice(openApi.indexOf("    PageSize:\n"), openApi.indexOf("    Sort:\n"));
    expect(pageSize).toContain("type: integer, minimum: 1, maximum: 100, default: 25");
    expect(pageSize).toContain("COMMON HTTP 400");
    for (const [operationId, order] of Object.entries(collectionOrders)) {
      const operation = operations.get(operationId);
      expect(operation?.method, operationId).toBe("get");
      expect(operation?.block, operationId).toContain("#/components/parameters/Cursor");
      expect(operation?.block, operationId).toContain("#/components/parameters/PageSize");
      expect(operation?.block, operationId).toContain(`x-tcdx-stable-order: "${order}"`);
      expect(operation?.block, operationId).not.toContain("offset");
    }
    const cursor = openApi.slice(openApi.indexOf("    Cursor:\n"), openApi.indexOf("    PageSize:\n"));
    expect(cursor).toContain("cannot be changed by cursor contents");
    expect(cursor).toContain("Offset pagination is not accepted");
  });

  it("exposes Action submit-for-review using the published edge and existing permission", () => {
    const operation = operations.get("actionSubmitForReview");
    expect(operation).toMatchObject({ method: "post", path: "/actions/{id}:submit-for-review" });
    expect(operation?.block).toContain("`remediation.action.transition`");
    expect(operation?.block).toContain("`audit.remediation.action.submit_review.v1`");
    expect(operation?.block).toContain('x-tcdx-domain-events: "NONE"');
    expect(operation?.block).toContain('x-tcdx-idempotency-class: "IDEMPOTENCY_KEY_REQUIRED"');
    expect(operation?.block).toContain('x-tcdx-transaction-boundary: "TX"');
    expect(lifecycle).toContain("| `Action` | `in_progress` | `in_review` | `action.submit_review` | `remediation.action.transition`");
    expect(permissions).toContain("start/submit-for-review/complete/reopen/cancel action");
    expect(idempotency).toContain(":submit-for-review");
  });

  it("materializes Evidence with the exact typed targets and complete cross-catalog mapping", () => {
    const operation = operations.get("evidenceCreate");
    expect(operation).toMatchObject({ method: "post", path: "/evidence" });
    expect(operation?.block).toContain("`evidence.evidence.create`");
    expect(operation?.block).toContain("`audit.evidence.evidence.create.v1`");
    expect(operation?.block).toContain("`evidence.evidence.created.v1`");
    expect(operation?.block).toContain('x-tcdx-idempotency-class: "IDEMPOTENCY_KEY_REQUIRED"');
    expect(operation?.block).toContain('x-tcdx-transaction-boundary: "TX"');
    const link = schemaBlock("EvidenceLinkCreateInput");
    const targets = [...link.matchAll(/^        ([a-z_]+_id): \{ \$ref:/gm)].map((match) => match[1]);
    expect(targets).toEqual([
      "requirement_id",
      "control_id",
      "control_version_id",
      "requirement_assessment_id",
      "control_assessment_id",
      "assurance_test_id"
    ]);
    expect(link).not.toContain("target_type");
    expect(link).not.toContain("target_id");
    expect(permissions).toContain("<code>evidence.evidence.create</code>");
    expect(events).toContain("`evidence.evidence.created.v1`");
    expect(events).toContain("NONE_CONTRACTUALLY_REQUIRED");
    expect(audits).toContain("audit.evidence.evidence.create.v1");
    expect(idempotency).toContain("including `evidenceCreate`");
  });

  it("preserves the 229-table frozen schema and adds no runtime-seed claim", () => {
    const expectedSchema = JSON.parse(expectedSchemaSource) as { tables: Array<{ name: string }> };
    expect(expectedSchema.tables).toHaveLength(229);
    for (const table of ["evidence.file_objects", "evidence.evidences", "evidence.evidence_versions", "evidence.evidence_links"]) {
      expect(expectedSchema.tables.some(({ name }) => name === table), table).toBe(true);
    }
    expect(decision).toContain("DATABASE_SCHEMA_CHANGED=0");
    expect(decision).toContain("RUNTIME_PERMISSION_SEEDS_CHANGED=0");
    expect(decision).toContain("PHASE_5_STARTED=0");
    expect(decision).toContain("PHASE_6_STARTED=0");
  });
});
