import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PostgresQueryCompiler, type Transaction } from "kysely";
import type { ScopeKind } from "@tcdx-grc/shared-types";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import type { CoreActor } from "./model.js";
import { resources } from "./model.js";
import { casTransition, getResource, listResource } from "./repository.js";
import { requireAccess } from "./security.js";
import { executeMutation, mutations, type MutationDefinition } from "./service.js";
import { coreGrcCommandRoutes, coreGrcReadRoutes } from "./routes.js";

const tenantId = "018f47f2-6170-7bd0-9d43-12f644a2b111";
const actorId = "018f47f2-6170-7bd0-9d43-12f644a2b112";
const membershipId = "018f47f2-6170-7bd0-9d43-12f644a2b113";
const resourceId = "018f47f2-6170-7bd0-9d43-12f644a2b114";
const correlationId = "018f47f2-6170-7bd0-9d43-12f644a2b115";

const actor: CoreActor = {
  tenantId,
  membershipId,
  userIdentityId: actorId,
  permissions: new Set(["remediation.action.transition", "evidence.evidence_request.submit"]),
  scopes: new Set(["tenant"]),
  permissionScopes: new Map([
    ["remediation.action.transition", new Set(["tenant"] as const)],
    ["evidence.evidence_request.submit", new Set(["tenant"] as const)]
  ]),
  capabilityGroups: new Set(["ISSUES_ACTIONS", "EVIDENCE_DOCUMENTS"]),
  roles: ["GRC_MANAGER"]
};

type Query = { sql: string; parameters: readonly unknown[] };
type QueryResult = { rows: Record<string, unknown>[]; numAffectedRows?: bigint };

function executor(handler: (query: Query) => QueryResult | Promise<QueryResult>) {
  const compiler = new PostgresQueryCompiler();
  const queryExecutor = {
    transformQuery: (node: unknown) => node,
    compileQuery: (node: Parameters<PostgresQueryCompiler["compileQuery"]>[0], queryId: Parameters<PostgresQueryCompiler["compileQuery"]>[1]) => compiler.compileQuery(node, queryId),
    executeQuery: handler
  };
  return {
    executeQuery: handler,
    getExecutor: () => queryExecutor
  } as unknown as Transaction<FoundationDatabase>;
}

function code(error: unknown): string | undefined {
  return error instanceof FoundationError ? error.code : undefined;
}

function openApiOperations(): Map<string, { path: string; method: string; block: string; schema?: string }> {
  const source = readFileSync("docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml", "utf8");
  const lines = source.split("\n");
  const operations = new Map<string, { path: string; method: string; block: string; schema?: string }>();
  let path = "";
  let method = "";
  for (let index = 0; index < lines.length; index += 1) {
    const pathMatch = /^  "([^"]+)":$/.exec(lines[index] ?? "");
    if (pathMatch) { path = pathMatch[1]!; method = ""; continue; }
    const methodMatch = /^    (get|post):$/.exec(lines[index] ?? "");
    if (methodMatch) { method = methodMatch[1]!; continue; }
    const operationMatch = /^      operationId: ([A-Za-z0-9]+)$/.exec(lines[index] ?? "");
    if (!operationMatch || !path || !method) continue;
    const block: string[] = [];
    for (let cursor = index; cursor < lines.length; cursor += 1) {
      const candidate = lines[cursor] ?? "";
      if (cursor > index && (/^    (get|post):$/.test(candidate) || /^  "[^"]+":$/.test(candidate) || candidate === "tags: []")) break;
      block.push(candidate);
    }
    const sourceBlock = block.join("\n");
    const schemas = [...sourceBlock.matchAll(/#\/components\/schemas\/([A-Za-z0-9]+)/g)];
    const schema = schemas.at(-1)?.[1];
    operations.set(operationMatch[1]!, { path, method, block: sourceBlock, ...(schema ? { schema } : {}) });
  }
  return operations;
}

function requestSchema(name: string): { required: string[]; properties: string[] } {
  const source = readFileSync("docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml", "utf8");
  const marker = `    ${name}:\n`;
  const start = source.indexOf(marker);
  const remainder = source.slice(start + marker.length);
  const next = remainder.search(/^    [A-Za-z0-9]+:\n/m);
  const block = remainder.slice(0, next < 0 ? undefined : next);
  const required = /required: \[([^\]]*)\]/.exec(block)?.[1]?.split(",").map((field) => field.trim()).filter(Boolean) ?? [];
  const properties = block.slice(block.indexOf("      properties:\n") + 18).split("\n").flatMap((line) => /^        ([a-z][a-z0-9_]*):/.exec(line)?.[1] ?? []);
  return { required, properties };
}

function contractScopes(block: string): string[] {
  const raw = /x-tcdx-scope: "([^"]+)"/.exec(block)?.[1] ?? "";
  return raw.split(/[,/]/).map((scope) => scope.trim()).filter(Boolean).map((scope) => scope === "assigned" ? "assigned_object" : scope === "owned" ? "owned_object" : scope).sort();
}

function routeContractPath(path: string): string {
  return path.replace("/api/v1", "").replace(/\/:([a-z_]+)\\:/g, "/{$1}:").replace(/\/:([a-z_]+)/g, "/{$1}");
}

describe("Core GRC authorization and data isolation", () => {
  it("requires entitlement, permission and an allowed scope (default DENY)", () => {
    expect(() => requireAccess(actor, "remediation.action.transition", "ISSUES_ACTIONS", ["tenant"])).not.toThrow();
    expect(() => requireAccess({ ...actor, permissions: new Set() }, "remediation.action.transition", "ISSUES_ACTIONS", ["tenant"])).toThrowError(FoundationError);
    expect(() => requireAccess({ ...actor, capabilityGroups: new Set() }, "remediation.action.transition", "ISSUES_ACTIONS", ["tenant"])).toThrowError(FoundationError);
    expect(() => requireAccess({ ...actor, permissionScopes: new Map() }, "remediation.action.transition", "ISSUES_ACTIONS", ["tenant"])).toThrowError(FoundationError);
  });

  it("does not let a scope granted for another permission widen authority", () => {
    const permissionScopes = new Map<string, ReadonlySet<ScopeKind>>([
      ["remediation.action.transition", new Set<ScopeKind>(["owned_object"])],
      ["evidence.evidence_request.submit", new Set<ScopeKind>(["tenant"])]
    ]);
    const mixed = {
      ...actor,
      scopes: new Set(["tenant", "owned_object"] as const),
      permissionScopes
    };
    expect(() => requireAccess(mixed, "remediation.action.transition", "ISSUES_ACTIONS", ["tenant"])).toThrowError(FoundationError);
    expect(() => requireAccess(mixed, "remediation.action.transition", "ISSUES_ACTIONS", ["owned_object"])).not.toThrow();
  });

  it("binds tenant in repository SQL and conceals an out-of-scope object", async () => {
    let observed: Query | undefined;
    const database = executor((query) => {
      observed = query;
      return { rows: [{ action_id: resourceId, row_version: 1, lifecycle_state: "pending", created_at: new Date(), created_by_user_identity_id: "other" }] };
    });
    const assignedActor = { ...actor, scopes: new Set(["assigned_object"] as const), permissionScopes: new Map([[resources.action.permission, new Set(["assigned_object"] as const)]]) };
    await expect(getResource(database, assignedActor, resources.action, resourceId)).rejects.toSatisfy((error: unknown) => code(error) === "TCDX.RESOURCE.NOT_FOUND");
    expect(observed?.sql).toContain("t.tenant_id=$1::uuid");
    expect(observed?.parameters).toEqual([tenantId, resourceId]);
  });

  it("uses bounded stable cursor pagination and rejects a cursor from different filters", async () => {
    const queries: Query[] = [];
    const database = executor((query) => {
      queries.push(query);
      return { rows: [
        { action_id: resourceId, row_version: 1, lifecycle_state: "pending", created_at: "2026-09-21T10:00:00.000Z" },
        { action_id: actorId, row_version: 1, lifecycle_state: "pending", created_at: "2026-09-21T09:00:00.000Z" }
      ] };
    });
    const first = await listResource(database, actor, resources.action, { "page[size]": "1", "filter[lifecycle_state]": "pending" });
    expect(first.items).toHaveLength(1);
    expect(first.page).toEqual({ has_more: true, next_cursor: first.page.next_cursor });
    expect(first.page.next_cursor).toBeTruthy();
    expect(queries[0]?.sql).toContain('ORDER BY t.created_at DESC,t."action_id" DESC');
    expect(queries[0]?.parameters).toEqual([tenantId, "pending", 2]);
    await expect(listResource(database, actor, resources.action, { "page[cursor]": first.page.next_cursor!, "filter[lifecycle_state]": "verified" })).rejects.toSatisfy((error: unknown) => code(error) === "TCDX.VALIDATION.FAILED");
    await expect(listResource(database, actor, resources.action, { "page[size]": 101 })).rejects.toSatisfy((error: unknown) => code(error) === "TCDX.VALIDATION.FAILED");
    await expect(listResource(database, actor, resources.action, { offset: "10" })).rejects.toSatisfy((error: unknown) => code(error) === "TCDX.VALIDATION.FAILED");
  });

  it("constrains assigned-only list visibility in SQL", async () => {
    let observed: Query | undefined;
    const database = executor((query) => { observed = query; return { rows: [] }; });
    await listResource(database, { ...actor, scopes: new Set(["assigned_object"] as const), permissionScopes: new Map([[resources.action.permission, new Set(["assigned_object"] as const)]]) }, resources.action, {});
    expect(observed?.sql).toContain('t."assigned_membership_id"=$2::uuid');
    expect(observed?.parameters.slice(0, 2)).toEqual([tenantId, membershipId]);
  });

  it("does not reinterpret audit_engagement as object assignment", async () => {
    let observed: Query | undefined;
    const database = executor((query) => {
      observed = query;
      return { rows: [{ action_id: resourceId, row_version: 1, lifecycle_state: "pending", assigned_membership_id: membershipId, created_at: new Date(), created_by_user_identity_id: correlationId }] };
    });
    const auditActor = { ...actor, scopes: new Set(["audit_engagement"] as const), permissionScopes: new Map([[resources.action.permission, new Set(["audit_engagement"] as const)]]) };
    await expect(getResource(database, auditActor, resources.action, resourceId)).rejects.toSatisfy((error: unknown) => code(error) === "TCDX.RESOURCE.NOT_FOUND");
    await listResource(database, auditActor, resources.action, {});
    expect(observed?.sql).toContain("AND (FALSE)");
  });
});

describe("Core GRC executable request and route contract", () => {
  it("matches all 21 approved read routes and their authorization/response extensions", () => {
    const operations = openApiOperations();
    const names = {
      applicability: ["applicabilityList", "applicabilityGet"],
      requirementAssessment: ["requirementAssessmentList", "requirementAssessmentGet"],
      soa: ["soaList", "soaGet"],
      control: ["controlList", "controlGet"],
      controlAssessment: ["controlAssessmentList", "controlAssessmentGet"],
      assuranceTest: ["assuranceTestList", "assuranceTestGet"],
      evidenceRequest: ["evidenceRequestList", "evidenceRequestGet"],
      evidence: ["evidenceList", "evidenceGet"],
      issue: ["issueList", "issueGet"],
      action: ["actionList", "actionGet"]
    } as const;
    let checked = 0;
    for (const [resourceKey, listPath, detailPath] of coreGrcReadRoutes) {
      const definition = resources[resourceKey];
      const operationIds = names[resourceKey as keyof typeof names];
      expect(operationIds, resourceKey).toBeTruthy();
      for (const [operationId, routePath] of [[operationIds[0], listPath], [operationIds[1], detailPath]] as const) {
        const operation = operations.get(operationId);
        expect(operation?.method, operationId).toBe("get");
        expect(routeContractPath(routePath), `${operationId} path`).toBe(operation?.path);
        expect(operation?.block, `${operationId} permission`).toContain(`x-tcdx-permission: "\`${definition.permission}\`"`);
        expect(operation?.block, `${operationId} capability`).toContain(`x-tcdx-capability: "${definition.capability}"`);
        expect(contractScopes(operation!.block), `${operationId} scopes`).toEqual([...definition.scopes].sort());
        expect(operation?.block).toContain('x-tcdx-audit-event: "NONE"');
        expect(operation?.block).toContain('x-tcdx-domain-events: "NONE"');
        expect(operation?.block).toContain('x-tcdx-idempotency-class: "NATURALLY_IDEMPOTENT"');
        expect(operation?.block).toMatch(/'200': \{ \$ref: '#\/components\/responses\/[A-Za-z]+Success' \}/);
        checked += 1;
      }
    }
    const version = operations.get("evidenceVersionGet")!;
    expect(version.method).toBe("get");
    expect(version.path).toBe("/evidence-versions/{id}");
    expect(version.block).toContain(`x-tcdx-permission: "\`${resources.evidenceVersion.permission}\`"`);
    expect(version.block).toContain(`x-tcdx-capability: "${resources.evidenceVersion.capability}"`);
    expect(contractScopes(version.block)).toEqual([...resources.evidenceVersion.scopes].sort());
    expect(checked + 1).toBe(21);
  });

  it("matches the 35 safely materialized mutation routes, fields, scopes and extensions", () => {
    const operations = openApiOperations();
    const routeByOperation = new Map(coreGrcCommandRoutes.map(([operationId, path]) => [operationId, routeContractPath(path)]));
    expect([...mutations.keys()].sort()).toEqual([...routeByOperation.keys()].sort());
    expect([...operations.keys()].filter((operationId) => ["uploadIntentCreate", "uploadFinalize", "evidenceRequestFulfill", "controlAssessmentSubmit"].includes(operationId) && !mutations.has(operationId)).sort()).toEqual(["controlAssessmentSubmit", "evidenceRequestFulfill", "uploadFinalize", "uploadIntentCreate"]);
    for (const [operationId, definition] of mutations) {
      const operation = operations.get(operationId);
      expect(operation?.method, operationId).toBe("post");
      expect(routeByOperation.get(operationId), `${operationId} path`).toBe(operation?.path);
      expect(operation?.block, `${operationId} permission`).toContain(`x-tcdx-permission: \"\`${definition.permission}\`\"`);
      expect(operation?.block, `${operationId} capability`).toContain(`x-tcdx-capability: \"${definition.capability}\"`);
      expect(contractScopes(operation!.block), `${operationId} scopes`).toEqual([...definition.scopes].sort());
      expect(operation?.block, `${operationId} audit`).toContain(`x-tcdx-audit-event: "\`${definition.auditEvent}\`"`);
      expect(operation?.block, `${operationId} domain event`).toContain(definition.domainEvent ? `x-tcdx-domain-events: "\`${definition.domainEvent}\`"` : 'x-tcdx-domain-events: "NONE"');
      expect(operation?.block, `${operationId} idempotency`).toContain('x-tcdx-idempotency-class: "IDEMPOTENCY_KEY_REQUIRED"');
      expect(operation?.block, `${operationId} transaction`).toContain('x-tcdx-transaction-boundary: "TX"');
      expect(operation?.block, `${operationId} response`).toContain("'202': { $ref: '#/components/responses/OperationSuccess' }");
      const schema = requestSchema(operation!.schema!);
      expect([...definition.allowedFields].sort(), `${operationId} fields`).toEqual(schema.properties.sort());
      expect([...definition.requiredFields].sort(), `${operationId} required`).toEqual(schema.required.sort());
      if (coreGrcCommandRoutes.find(([candidate]) => candidate === operationId)?.[2] === "target") expect(definition.requiredFields, `${operationId} expected_version`).toContain("expected_version");
    }
  });

  it("rejects malformed UUIDs, timestamps, enums, ranges and nested additional fields before persistence", async () => {
    const database = executor(() => { throw new Error("persistence must not run"); });
    const cases: Array<[string, Record<string, unknown>]> = [
      ["applicabilityCreate", { requirement_id: "not-a-uuid", applicability_decision: "applicable", rationale: "reason", effective_from: "2026-09-21T00:00:00Z" }],
      ["applicabilityCreate", { requirement_id: resourceId, applicability_decision: "applicable", rationale: "reason", effective_from: "2026-09-21" }],
      ["requirementAssessmentSubmit", { expected_version: 1, result_status: "unknown" }],
      ["requirementAssessmentSubmit", { expected_version: 1, result_status: "valid", coverage_percent: 101 }],
      ["soaCreate", { framework_version_id: resourceId, title: "SoA", items: [{ reference_control_version_id: resourceId, applicability_decision: "yes", justification: "why", implementation_state: "active", convenience: true }] }]
    ];
    for (const [operationId, body] of cases) {
      const definition = mutations.get(operationId)!;
      await expect(executeMutation(database, actor, definition, { body, idempotencyKey: "validation", correlationId }))
        .rejects.toSatisfy((error: unknown) => code(error) === "TCDX.VALIDATION.FAILED");
    }
  });
});

describe("Core GRC lifecycle, SoD and optimistic concurrency", () => {
  it("returns the contractual 409 when row_version CAS loses", async () => {
    const database = executor((query) => query.sql.startsWith("UPDATE")
      ? { rows: [] }
      : { rows: [{ row_version: 4, lifecycle_state: "pending" }] });
    await expect(casTransition(database, actor, resources.action, resourceId, 3, "pending", "in_progress"))
      .rejects.toSatisfy((error: unknown) => code(error) === "TCDX.CONFLICT.CONCURRENCY" && (error as FoundationError).statusCode === 409);
  });

  it("denies a transition absent from the lifecycle registry", async () => {
    const definition = mutations.get("actionStart")!;
    const database = executor((query) => {
      if (query.sql.includes("FROM remediation.actions")) return { rows: [{ action_id: resourceId, row_version: 1, lifecycle_state: "pending", created_at: new Date(), created_by_user_identity_id: actorId }] };
      if (query.sql.includes("current_edges")) return { rows: [] };
      throw new Error(`Unexpected SQL: ${query.sql}`);
    });
    await expect(definition.execute({ transaction: database, actor, body: { expected_version: 1 }, targetId: resourceId }))
      .rejects.toSatisfy((error: unknown) => code(error) === "TCDX.LIFECYCLE.TRANSITION_DENIED");
  });

  it("enforces separation of duties before approval CAS", async () => {
    const definition = mutations.get("applicabilityApprove")!;
    const database = executor((query) => {
      if (query.sql.includes("prior_actor")) return { rows: [{ prior_actor: actorId }] };
      if (query.sql.includes("FROM regulatory.requirement_applicabilities")) return { rows: [{ requirement_applicability_id: resourceId, row_version: 1, lifecycle_state: "submitted", created_at: new Date(), created_by_user_identity_id: actorId }] };
      if (query.sql.includes("current_edges")) return { rows: [{ to_state: "approved", audit_event_code: definition.auditEvent, sod_policy_ref: "distinct_actor", scope_kind: "tenant" }] };
      throw new Error(`Unexpected SQL: ${query.sql}`);
    });
    const approvingActor = { ...actor, permissions: new Set([definition.permission]), permissionScopes: new Map([[definition.permission, new Set(["tenant"] as const)]]), capabilityGroups: new Set([definition.capability]) };
    await expect(definition.execute({ transaction: database, actor: approvingActor, body: { expected_version: 1 }, targetId: resourceId }))
      .rejects.toSatisfy((error: unknown) => code(error) === "TCDX.AUTHORIZATION.DENIED");
  });

  it("keeps evidenceRequestFulfill unmaterialized on the exact audit-code contradiction", () => {
    const operation = openApiOperations().get("evidenceRequestFulfill")!;
    const seed = readFileSync("docs/executable-contracts/09_SEED_MANIFESTS.md", "utf8");
    const apiAudit = /x-tcdx-audit-event: "`([^`]+)`"/.exec(operation.block)?.[1];
    const lifecycleRow = seed.split("\n").find((line) => line.startsWith("| `EvidenceRequest` | `open` | `fulfilled` | `evidence_request.fulfill` |"));
    const lifecycleAudit = lifecycleRow?.split("|").map((cell) => cell.trim())[7]?.replaceAll("`", "");
    expect(apiAudit).toBe("audit.evidence.request.fulfill.v1");
    expect(lifecycleAudit).toBe("audit.lifecycle.evidence_request.fulfill.v1");
    expect(apiAudit).not.toBe(lifecycleAudit);
    expect(mutations.has("evidenceRequestFulfill")).toBe(false);
    expect(coreGrcCommandRoutes.some(([operationId]) => operationId === "evidenceRequestFulfill")).toBe(false);
  });

  it("keeps assigned-only ControlAssessment completion closed without an authoritative assignee relation", () => {
    const operation = openApiOperations().get("controlAssessmentSubmit")!;
    expect(contractScopes(operation.block)).toEqual(["assigned_object"]);
    expect("assignedMembershipColumn" in resources.controlAssessment).toBe(false);
    expect(mutations.has("controlAssessmentSubmit")).toBe(false);
    expect(coreGrcCommandRoutes.some(([operationId]) => operationId === "controlAssessmentSubmit")).toBe(false);
  });

  it("links Evidence to its draft EvidenceVersion with exactly one typed target", async () => {
    const definition = mutations.get("evidenceCreate")!;
    let evidenceId = "";
    let versionId = "";
    let linkedVersionId = "";
    const database = executor((query) => {
      if (query.sql.includes("FROM evidence.file_objects")) return { rows: [{ scan_status: "passed" }] };
      if (query.sql.startsWith("SELECT 1 AS found")) return { rows: [{ found: 1 }] };
      if (query.sql.startsWith("INSERT INTO evidence.evidences")) evidenceId = String(query.parameters[0]);
      if (query.sql.startsWith("INSERT INTO evidence.evidence_versions")) versionId = String(query.parameters[0]);
      if (query.sql.startsWith("INSERT INTO evidence.evidence_links")) linkedVersionId = String(query.parameters[3]);
      return { rows: [{}] };
    });
    const result = await definition.execute({
      transaction: database, actor,
      body: {
        evidence_code: "EV-001", evidence_type: "document", retention_policy_id: resourceId,
        source_kind: "upload", file_object_id: actorId, provenance_ref: "source-record",
        links: [{ requirement_id: correlationId }]
      }
    });
    expect(result).toEqual({ resource: "evidence", id: evidenceId });
    expect(versionId).not.toBe("");
    expect(versionId).not.toBe(evidenceId);
    expect(linkedVersionId).toBe(versionId);
  });

  it("rejects an EvidenceLink with multiple typed targets atomically", async () => {
    const definition = mutations.get("evidenceCreate")!;
    const sqlStatements: string[] = [];
    const database = executor((query) => {
      sqlStatements.push(query.sql);
      if (query.sql.includes("FROM evidence.file_objects")) return { rows: [{ scan_status: "passed" }] };
      if (query.sql.startsWith("SELECT 1 AS found")) return { rows: [{ found: 1 }] };
      return { rows: [{}] };
    });
    await expect(definition.execute({
      transaction: database, actor,
      body: {
        evidence_code: "EV-002", evidence_type: "document", retention_policy_id: resourceId,
        source_kind: "upload", file_object_id: actorId, provenance_ref: "source-record",
        links: [{ requirement_id: correlationId, control_id: resourceId }]
      }
    })).rejects.toSatisfy((error: unknown) => code(error) === "TCDX.INVARIANT.VIOLATION");
    expect(sqlStatements.some((statement) => statement.startsWith("INSERT INTO evidence.evidence_links"))).toBe(false);
  });

  it("requires an approved usable EvidenceVersion before Action completion", async () => {
    const definition = mutations.get("actionComplete")!;
    const owningActor: CoreActor = {
      ...actor,
      scopes: new Set(["owned_object"]),
      permissionScopes: new Map([[definition.permission, new Set(["owned_object"] as const)]])
    };
    const database = executor((query) => {
      if (query.sql.includes("FROM remediation.actions")) return { rows: [{ action_id: resourceId, row_version: 1, lifecycle_state: "in_review", created_at: new Date(), created_by_user_identity_id: actorId }] };
      if (query.sql.includes("current_edges")) return { rows: [{ to_state: "completed", audit_event_code: definition.auditEvent, sod_policy_ref: "none", scope_kind: "owned_object" }] };
      if (query.sql.includes("FROM evidence.evidence_versions")) return { rows: [{ lifecycle_state: "submitted", scan_status: "passed" }] };
      throw new Error(`Unexpected SQL: ${query.sql}`);
    });
    await expect(definition.execute({ transaction: database, actor: owningActor, body: { expected_version: 1, evidence_version_id: correlationId, link_role: "closure" }, targetId: resourceId }))
      .rejects.toSatisfy((error: unknown) => code(error) === "TCDX.INVARIANT.VIOLATION");
  });

  it("denies verification by the assigned Action member before the CAS write", async () => {
    const definition = mutations.get("actionVerify")!;
    let updateAttempted = false;
    const verifyingActor: CoreActor = {
      ...actor,
      permissions: new Set([definition.permission]),
      scopes: new Set(["tenant"]),
      permissionScopes: new Map([[definition.permission, new Set(["tenant"] as const)]])
    };
    const database = executor((query) => {
      if (query.sql.includes("FROM remediation.actions")) return { rows: [{ action_id: resourceId, row_version: 2, lifecycle_state: "completed", assigned_membership_id: membershipId, created_at: new Date(), created_by_user_identity_id: correlationId }] };
      if (query.sql.includes("current_edges")) return { rows: [{ to_state: "verified", audit_event_code: definition.auditEvent, sod_policy_ref: "distinct_actor", scope_kind: "tenant" }] };
      if (query.sql.includes("prior_actor")) return { rows: [{ prior_actor: correlationId }] };
      if (query.sql.startsWith("UPDATE")) updateAttempted = true;
      return { rows: [] };
    });
    await expect(definition.execute({ transaction: database, actor: verifyingActor, body: { expected_version: 2, verification_decision: "accepted", rationale: "checked" }, targetId: resourceId }))
      .rejects.toSatisfy((error: unknown) => code(error) === "TCDX.AUTHORIZATION.DENIED");
    expect(updateAttempted).toBe(false);
  });
});

describe("Core GRC idempotency, audit and outbox", () => {
  it("maps every implemented operation to the published permission, audit and outbox codes", () => {
    const matrix = readFileSync("docs/executable-contracts/03_API_RESOURCE_OPERATION_MATRIX.md", "utf8").split("\n");
    const mismatches: string[] = [];
    for (const [operationId, definition] of mutations) {
      const line = matrix.find((candidate) => candidate.startsWith(`| ${operationId} |`));
      expect(line, operationId).toBeTruthy();
      const cells = line!.split("|").map((cell) => cell.trim());
      const permission = cells[5]!.match(/`([^`]+)`/)?.[1];
      const codes = [...cells[9]!.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
      if (definition.permission !== permission) mismatches.push(`${operationId}:permission:${definition.permission}:${permission}`);
      if (definition.auditEvent !== codes[0]) mismatches.push(`${operationId}:audit:${definition.auditEvent}:${codes[0]}`);
      if ((definition.domainEvent ?? "NONE") !== (codes[1] ?? "NONE")) mismatches.push(`${operationId}:outbox:${definition.domainEvent ?? "NONE"}:${codes[1] ?? "NONE"}`);
    }
    expect(mismatches).toEqual([]);
  });

  it("writes exactly one audit and one authorized outbox event for a successful command", async () => {
    const sql: string[] = [];
    const database = executor((query) => {
      sql.push(query.sql);
      if (query.sql.includes("INSERT INTO ops_audit.idempotency_records")) return { rows: [{ idempotency_record_id: resourceId }] };
      if (query.sql.includes("UPDATE ops_audit.idempotency_records")) return { rows: [], numAffectedRows: 1n };
      return { rows: [] };
    });
    const definition: MutationDefinition = {
      operationId: "testAuthorizedCommand",
      permission: "remediation.action.transition",
      capability: "ISSUES_ACTIONS",
      scopes: ["tenant"],
      auditEvent: "audit.remediation.action.start.v1",
      domainEvent: "remediation.action.completed.v1",
      allowedFields: [], requiredFields: [],
      execute: async () => ({ resource: "action", id: resourceId, response: { action_id: resourceId, row_version: 2, lifecycle_state: "in_progress" } })
    };
    const result = await executeMutation(database, actor, definition, { body: {}, idempotencyKey: "stable-key", correlationId });
    expect(result.replayed).toBe(false);
    expect(sql.filter((value) => value.includes("INSERT INTO ops_audit.audit_events"))).toHaveLength(1);
    expect(sql.filter((value) => value.includes("INSERT INTO ops_audit.outbox_events"))).toHaveLength(1);
    expect(sql.filter((value) => value.includes("UPDATE ops_audit.idempotency_records"))).toHaveLength(1);
  });

  it("replays the stored tenant-scoped result without executing or re-auditing", async () => {
    let executed = 0;
    let requestHash = "";
    const sql: string[] = [];
    const database = executor((query) => {
      sql.push(query.sql);
      if (query.sql.includes("INSERT INTO ops_audit.idempotency_records")) {
        requestHash = String(query.parameters[7]);
        return { rows: [] };
      }
      if (query.sql.includes("FROM ops_audit.idempotency_records")) {
        return { rows: [{ idempotency_record_id: resourceId, request_hash: requestHash, result_status_code: "completed", result_ref: `action:${resourceId}`, response_hash: "stored" }] };
      }
      if (query.sql.includes("FROM remediation.actions")) return { rows: [{ action_id: resourceId, row_version: 2, lifecycle_state: "in_progress", created_at: new Date(), created_by_user_identity_id: actorId }] };
      if (query.sql.includes("FROM remediation.action_evidence_links") || query.sql.includes("FROM remediation.action_verifications")) return { rows: [] };
      throw new Error(`Unexpected SQL: ${query.sql}`);
    });
    const definition: MutationDefinition = {
      operationId: "testReplay",
      permission: "remediation.action.transition",
      capability: "ISSUES_ACTIONS",
      scopes: ["tenant"],
      auditEvent: "audit.remediation.action.start.v1",
      allowedFields: [], requiredFields: [],
      execute: async () => { executed += 1; return { resource: "action", id: resourceId }; }
    };
    const result = await executeMutation(database, actor, definition, { body: {}, idempotencyKey: "same-key", correlationId });
    expect(result.replayed).toBe(true);
    expect(executed).toBe(0);
    expect(sql.some((value) => value.includes("audit_events"))).toBe(false);
    expect(sql.some((value) => value.includes("outbox_events"))).toBe(false);
  });

  it("rejects a reused idempotency key with a different fingerprint before execution", async () => {
    let executed = 0;
    const sqlStatements: string[] = [];
    const database = executor((query) => {
      sqlStatements.push(query.sql);
      if (query.sql.includes("INSERT INTO ops_audit.idempotency_records")) return { rows: [] };
      if (query.sql.includes("FROM ops_audit.idempotency_records")) {
        return { rows: [{ idempotency_record_id: resourceId, request_hash: "0".repeat(64), result_status_code: "completed", result_ref: `action:${resourceId}`, response_hash: "1".repeat(64) }] };
      }
      throw new Error(`Unexpected SQL: ${query.sql}`);
    });
    const definition: MutationDefinition = {
      operationId: "testConflict", permission: "remediation.action.transition", capability: "ISSUES_ACTIONS", scopes: ["tenant"],
      auditEvent: "audit.remediation.action.start.v1", allowedFields: ["value"], requiredFields: ["value"],
      execute: async () => { executed += 1; return { resource: "action", id: resourceId }; }
    };
    await expect(executeMutation(database, actor, definition, { body: { value: "changed" }, idempotencyKey: "reused-key", correlationId }))
      .rejects.toSatisfy((error: unknown) => code(error) === "TCDX.CONFLICT.IDEMPOTENCY" && (error as FoundationError).statusCode === 409);
    expect(executed).toBe(0);
    expect(sqlStatements.some((statement) => statement.includes("audit_events") || statement.includes("outbox_events"))).toBe(false);
  });
});
