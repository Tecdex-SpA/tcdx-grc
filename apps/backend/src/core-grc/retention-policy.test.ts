import { PostgresQueryCompiler, type Transaction } from "kysely";
import { describe, expect, it } from "vitest";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import type { CoreActor } from "./model.js";
import { retentionIfMatch } from "./routes.js";
import { executeMutation, mutations, type MutationDefinition } from "./service.js";

const tenantId = "018f47f2-6170-7bd0-9d43-12f644a2b111";
const authorId = "018f47f2-6170-7bd0-9d43-12f644a2b112";
const approverId = "018f47f2-6170-7bd0-9d43-12f644a2b113";
const membershipId = "018f47f2-6170-7bd0-9d43-12f644a2b114";
const policyId = "018f47f2-6170-7bd0-9d43-12f644a2b115";
const correlationId = "018f47f2-6170-7bd0-9d43-12f644a2b116";

type Query = { sql: string; parameters: readonly unknown[] };
type QueryResult = { rows: Record<string, unknown>[]; numAffectedRows?: bigint };

function executor(handler: (query: Query) => QueryResult | Promise<QueryResult>) {
  const compiler = new PostgresQueryCompiler();
  const queryExecutor = {
    transformQuery: (node: unknown) => node,
    compileQuery: (node: Parameters<PostgresQueryCompiler["compileQuery"]>[0], queryId: Parameters<PostgresQueryCompiler["compileQuery"]>[1]) => compiler.compileQuery(node, queryId),
    executeQuery: handler
  };
  return { executeQuery: handler, getExecutor: () => queryExecutor } as unknown as Transaction<FoundationDatabase>;
}

function actorFor(definition: MutationDefinition, userIdentityId = authorId): CoreActor {
  return {
    tenantId,
    membershipId,
    userIdentityId,
    permissions: new Set([definition.permission]),
    scopes: new Set(["tenant"]),
    permissionScopes: new Map([[definition.permission, new Set(["tenant"] as const)]]),
    capabilityGroups: new Set(["PRIVACY"]),
    roles: [definition.operationId === "retentionPolicyApprove" ? "LEGAL_REVIEWER" : "PRIVACY_MANAGER"]
  };
}

function row(state: string, version: number, overrides: Record<string, unknown> = {}) {
  return {
    retention_policy_id: policyId,
    row_version: version,
    ownership_class: "TENANT_OWNED",
    policy_code: "TECDEX-EVIDENCE-APPROVED-7Y",
    version_number: 1,
    policy_kind: "tenant_policy",
    retention_seconds: 220752000,
    trigger_event_code: "expiry_or_closure",
    precedence_rank: 200,
    is_mandatory: false,
    lifecycle_state: state,
    effective_from: null,
    effective_to: null,
    regulatory_source_id: null,
    tenant_id: tenantId,
    created_at: new Date(),
    created_by_user_identity_id: authorId,
    ...overrides
  };
}

function edge(toState: string, auditEventCode: string) {
  return { to_state: toState, audit_event_code: auditEventCode, sod_policy_ref: "contract:test", scope_kind: "tenant" };
}

function errorCode(error: unknown): string | undefined {
  return error instanceof FoundationError ? error.code : undefined;
}

describe("RetentionPolicy canonical lifecycle runtime", () => {
  it("updates only a same-tenant draft under row-version CAS", async () => {
    const definition = mutations.get("retentionPolicyUpdate")!;
    let update: Query | undefined;
    const database = executor((query) => {
      if (query.sql.startsWith("SELECT") && query.sql.includes("FROM privacy.retention_policies t")) return { rows: [row("draft", 1)] };
      if (query.sql.startsWith("UPDATE privacy.retention_policies")) { update = query; return { rows: [row("draft", 2, { retention_seconds: 100, is_mandatory: true })] }; }
      throw new Error(`Unexpected SQL: ${query.sql}`);
    });
    const result = await definition.execute({ transaction: database, actor: actorFor(definition), body: { expected_version: 1, retention_seconds: 100, is_mandatory: true }, targetId: policyId, correlationId });
    expect(result).toMatchObject({ resource: "retentionPolicy", id: policyId });
    expect(update?.sql).toContain("lifecycle_state='draft'");
    expect(update?.parameters).toEqual([tenantId, policyId, 1, 100, true]);
    expect(definition.auditEvent).toBe("audit.privacy.retention_policy.update.v1");
    expect(definition.domainEvent).toBeUndefined();
  });

  it("denies updates outside draft and stale versions without writing other rows", async () => {
    const definition = mutations.get("retentionPolicyUpdate")!;
    for (const [state, version, code] of [["under_review", 1, "TCDX.LIFECYCLE.TRANSITION_DENIED"], ["draft", 2, "TCDX.CONFLICT.CONCURRENCY"]] as const) {
      const database = executor((query) => {
        if (query.sql.startsWith("SELECT") && query.sql.includes("FROM privacy.retention_policies t")) return { rows: [row(state, version)] };
        if (query.sql.startsWith("UPDATE privacy.retention_policies")) return { rows: [] };
        if (query.sql.startsWith("SELECT row_version,lifecycle_state")) return { rows: [{ row_version: version, lifecycle_state: state }] };
        throw new Error(`Unexpected SQL: ${query.sql}`);
      });
      await expect(definition.execute({ transaction: database, actor: actorFor(definition), body: { expected_version: 1, retention_seconds: 100, is_mandatory: true }, targetId: policyId, correlationId }))
        .rejects.toSatisfy((error: unknown) => errorCode(error) === code);
    }
    const denied = actorFor(definition);
    denied.permissionScopes = new Map();
    await expect(definition.execute({ transaction: executor(() => ({ rows: [row("draft", 1)] })), actor: denied, body: { expected_version: 1, retention_seconds: 100, is_mandatory: true }, targetId: policyId, correlationId }))
      .rejects.toSatisfy((error: unknown) => errorCode(error) === "TCDX.RESOURCE.NOT_FOUND");
  });
  it("requires one strong If-Match value and rejects body dual authority", () => {
    const request = (headers: Record<string, unknown>, body: Record<string, unknown> = {}) => ({ headers, body }) as never;
    expect(retentionIfMatch("retentionPolicyReview", request({ "if-match": '"7"' }))).toEqual({ expected_version: 7 });
    expect(() => retentionIfMatch("retentionPolicyReview", request({}))).toThrowError(FoundationError);
    expect(() => retentionIfMatch("retentionPolicyReview", request({ "if-match": 'W/"7"' }))).toThrowError(FoundationError);
    expect(() => retentionIfMatch("retentionPolicyReview", request({ "if-match": '"7"' }, { expected_version: 7 }))).toThrowError(FoundationError);
  });

  it("creates the authorized tenant policy as draft with NULL interval and row_version 1", async () => {
    const definition = mutations.get("retentionPolicyCreate")!;
    let insert: Query | undefined;
    const database = executor((query) => {
      insert = query;
      return { rows: [row("draft", 1)] };
    });
    const result = await definition.execute({
      transaction: database,
      actor: actorFor(definition),
      body: {
        policy_code: "TECDEX-EVIDENCE-APPROVED-7Y",
        version_number: 1,
        policy_kind: "tenant_policy",
        retention_seconds: 220752000,
        trigger_event_code: "expiry_or_closure",
        precedence_rank: 200,
        is_mandatory: false
      },
      correlationId
    });
    expect(result.resource).toBe("retentionPolicy");
    expect(insert?.sql).toContain("INSERT INTO privacy.retention_policies");
    expect(insert?.parameters).toContain("TENANT_OWNED");
    expect(insert?.parameters).toContain("draft");
    expect(insert?.parameters.filter((value) => value === null)).toHaveLength(3);
    expect(insert?.parameters).toContain(1);
  });

  it("rejects an unknown kind, mismatched precedence, arbitrary trigger or non-boolean mandatory flag", async () => {
    const definition = mutations.get("retentionPolicyCreate")!;
    const never = executor(() => { throw new Error("must not persist"); });
    const base = { policy_code: "P", version_number: 1, policy_kind: "tenant_policy", retention_seconds: 1, trigger_event_code: "expiry_or_closure", precedence_rank: 200, is_mandatory: false };
    for (const invalid of [
      { ...base, policy_kind: "invented" },
      { ...base, precedence_rank: 500 },
      { ...base, trigger_event_code: "caller_date" },
      { ...base, is_mandatory: "false" }
    ]) {
      await expect(definition.execute({ transaction: never, actor: actorFor(definition), body: invalid, correlationId }))
        .rejects.toSatisfy((error: unknown) => errorCode(error) === "TCDX.VALIDATION.FAILED");
    }
  });

  it("reviews with row-version CAS and no publication timestamp write", async () => {
    const definition = mutations.get("retentionPolicyReview")!;
    let update: Query | undefined;
    const database = executor((query) => {
      if (query.sql.startsWith("SELECT") && query.sql.includes("FROM privacy.retention_policies t")) return { rows: [row("draft", 1)] };
      if (query.sql.includes("WITH current_edges")) return { rows: [edge("under_review", definition.auditEvent)] };
      if (query.sql.startsWith("UPDATE privacy.retention_policies")) { update = query; return { rows: [row("under_review", 2)] }; }
      throw new Error(`Unexpected SQL: ${query.sql}`);
    });
    await definition.execute({ transaction: database, actor: actorFor(definition), body: { expected_version: 1 }, targetId: policyId, correlationId });
    expect(update?.sql).toContain("row_version=row_version+1");
    expect(update?.sql).not.toContain("effective_from=transaction_timestamp()");
    expect(update?.parameters).toEqual([tenantId, policyId, 1, "draft", "under_review"]);
  });

  it("enforces author/approver SoD before the approval CAS", async () => {
    const definition = mutations.get("retentionPolicyApprove")!;
    let updated = false;
    const database = executor((query) => {
      if (query.sql.startsWith("SELECT") && query.sql.includes("FROM privacy.retention_policies t")) return { rows: [row("under_review", 2)] };
      if (query.sql.includes("WITH current_edges")) return { rows: [edge("approved", definition.auditEvent)] };
      if (query.sql.startsWith("SELECT created_by_user_identity_id")) return { rows: [{ created_by_user_identity_id: authorId }] };
      if (query.sql.startsWith("UPDATE")) updated = true;
      return { rows: [] };
    });
    await expect(definition.execute({ transaction: database, actor: actorFor(definition, authorId), body: { expected_version: 2 }, targetId: policyId, correlationId }))
      .rejects.toSatisfy((error: unknown) => errorCode(error) === "TCDX.AUTHORIZATION.DENIED");
    expect(updated).toBe(false);
  });

  it("allows a distinct Legal Reviewer and publishes with the database transaction timestamp", async () => {
    const approve = mutations.get("retentionPolicyApprove")!;
    const publish = mutations.get("retentionPolicyPublish")!;
    const updates: Query[] = [];
    let state = "under_review";
    let version = 2;
    const database = executor((query) => {
      if (query.sql.startsWith("SELECT") && query.sql.includes("FROM privacy.retention_policies t")) return { rows: [row(state, version)] };
      if (query.sql.includes("WITH current_edges")) return { rows: [state === "under_review" ? edge("approved", approve.auditEvent) : edge("published", publish.auditEvent)] };
      if (query.sql.startsWith("SELECT created_by_user_identity_id")) return { rows: [{ created_by_user_identity_id: authorId }] };
      if (query.sql.startsWith("UPDATE privacy.retention_policies")) {
        updates.push(query);
        state = query.parameters[4] as string;
        version += 1;
        return { rows: [row(state, version, state === "published" ? { effective_from: new Date(), effective_to: null } : {})] };
      }
      throw new Error(`Unexpected SQL: ${query.sql}`);
    });
    await approve.execute({ transaction: database, actor: actorFor(approve, approverId), body: { expected_version: 2 }, targetId: policyId, correlationId });
    await publish.execute({ transaction: database, actor: actorFor(publish, authorId), body: { expected_version: 3 }, targetId: policyId, correlationId });
    expect(updates).toHaveLength(2);
    expect(updates[1]?.sql).toContain("effective_from=transaction_timestamp()");
    expect(publish.domainEvent).toBe("privacy.retention_policy.published.v1");
    expect(approve.domainEvent).toBeUndefined();
  });

  it("returns concurrency, wrong-state and concealed cross-tenant failures without mutation", async () => {
    const definition = mutations.get("retentionPolicyReview")!;
    const scenario = (current: Record<string, unknown> | undefined, casCurrent?: Record<string, unknown>) => executor((query) => {
      if (query.sql.startsWith("SELECT") && query.sql.includes("FROM privacy.retention_policies t")) return { rows: current ? [current] : [] };
      if (query.sql.includes("WITH current_edges")) return { rows: [edge("under_review", definition.auditEvent)] };
      if (query.sql.startsWith("UPDATE privacy.retention_policies")) return { rows: [] };
      if (query.sql.startsWith("SELECT row_version,lifecycle_state")) return { rows: casCurrent ? [casCurrent] : [] };
      throw new Error(`Unexpected SQL: ${query.sql}`);
    });
    await expect(definition.execute({ transaction: scenario(row("draft", 2), { row_version: 2, lifecycle_state: "draft" }), actor: actorFor(definition), body: { expected_version: 1 }, targetId: policyId }))
      .rejects.toSatisfy((error: unknown) => errorCode(error) === "TCDX.CONFLICT.CONCURRENCY");
    await expect(definition.execute({ transaction: scenario(row("draft", 1), { row_version: 1, lifecycle_state: "under_review" }), actor: actorFor(definition), body: { expected_version: 1 }, targetId: policyId }))
      .rejects.toSatisfy((error: unknown) => errorCode(error) === "TCDX.LIFECYCLE.TRANSITION_DENIED");
    await expect(definition.execute({ transaction: scenario(undefined), actor: actorFor(definition), body: { expected_version: 1 }, targetId: policyId }))
      .rejects.toSatisfy((error: unknown) => errorCode(error) === "TCDX.RESOURCE.NOT_FOUND");
  });

  it("preserves default DENY before idempotency or persistence", async () => {
    const definition = mutations.get("retentionPolicyReview")!;
    const noDatabase = executor(() => { throw new Error("database must not be reached"); });
    const denied = { ...actorFor(definition), permissions: new Set<string>(), permissionScopes: new Map() };
    await expect(executeMutation(noDatabase, denied, definition, { body: { expected_version: 1 }, idempotencyKey: "deny", correlationId, targetId: policyId }))
      .rejects.toSatisfy((error: unknown) => errorCode(error) === "TCDX.AUTHORIZATION.DENIED");
  });
});
