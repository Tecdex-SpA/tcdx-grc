import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { PostgresQueryCompiler, type Transaction } from "kysely";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import type { PlatformActor } from "./platform-authority.js";
import { subscriptionCreate } from "./platform-iam-service.js";

type Query = { sql: string; parameters: readonly unknown[] };
type QueryResult = { rows: Record<string, unknown>[]; numAffectedRows?: bigint };

const tenantId = "018f47f2-6170-7bd0-9d43-12f644a2b111";
const planVersionId = "018f47f2-6170-7bd0-9d43-12f644a2b112";
const actorId = "018f47f2-6170-7bd0-9d43-12f644a2b113";
const correlationId = "018f47f2-6170-7bd0-9d43-12f644a2b114";
const subscriptionId = "018f47f2-6170-7bd0-9d43-12f644a2b115";

const actor: PlatformActor = {
  identity: { principalClass: "HUMAN_INTERACTIVE", principalId: actorId, tokenId: "018f47f2-6170-7bd0-9d43-12f644a2b116", expiresAt: new Date(Date.now() + 60_000) },
  permissions: new Set(["platform.subscription.create"]),
  roles: ["PLATFORM_ADMIN"]
};

function executor(handler: (query: Query) => QueryResult | Promise<QueryResult>) {
  const compiler = new PostgresQueryCompiler();
  const queryExecutor = {
    transformQuery: (node: unknown) => node,
    compileQuery: (node: Parameters<PostgresQueryCompiler["compileQuery"]>[0], queryId: Parameters<PostgresQueryCompiler["compileQuery"]>[1]) => compiler.compileQuery(node, queryId),
    executeQuery: handler
  };
  return { executeQuery: handler, getExecutor: () => queryExecutor } as unknown as Transaction<FoundationDatabase>;
}

function requestHash(code = "TECDEX-GRC"): string {
  const body = { plan_version_id: planVersionId, subscription_code: code, tenant_id: tenantId };
  return createHash("sha256").update(JSON.stringify(body, Object.keys(body).sort())).digest("hex");
}

function projection() {
  return {
    subscription_id: subscriptionId,
    tenant_id: tenantId,
    plan_version_id: planVersionId,
    subscription_code: "TECDEX-GRC",
    lifecycle_state: "active",
    starts_at: new Date("2026-09-24T12:00:00.000Z"),
    ends_at: null,
    cancelled_at: null
  };
}

function input(body: Record<string, unknown> = { tenant_id: tenantId, plan_version_id: planVersionId, subscription_code: "TECDEX-GRC" }) {
  return { body, key: "subscription-create-key", correlationId };
}

function code(error: unknown): string | undefined {
  return error instanceof FoundationError ? error.code : undefined;
}

describe("subscriptionCreate", () => {
  it("creates one active subscription with audit, privileged-use audit, outbox and idempotency", async () => {
    const statements: string[] = [];
    const transaction = executor((query) => {
      statements.push(query.sql);
      if (query.sql.includes("INSERT INTO ops_audit.idempotency_records")) return { rows: [{ idempotency_record_id: subscriptionId }] };
      if (query.sql.includes("FROM platform.tenants")) return { rows: [{ tenant_id: tenantId }] };
      if (query.sql.includes("FROM platform.plan_versions")) return { rows: [{ plan_version_id: planVersionId, plan_state: "published", version_state: "published" }] };
      if (query.sql.includes("FROM platform.subscriptions") && query.sql.includes("FOR UPDATE")) return { rows: [] };
      if (query.sql.includes("SELECT subscription_id,tenant_id")) return { rows: [projection()] };
      if (query.sql.includes("UPDATE ops_audit.idempotency_records")) return { rows: [], numAffectedRows: 1n };
      return { rows: [] };
    });

    const result = await subscriptionCreate(transaction, actor, input());

    expect(result).toMatchObject({ replayed: false, result: { subscription_id: subscriptionId, lifecycle_state: "active" } });
    expect(statements.filter((statement) => statement.includes("INSERT INTO platform.subscriptions"))).toHaveLength(1);
    expect(statements.filter((statement) => statement.includes("INSERT INTO ops_audit.audit_events"))).toHaveLength(2);
    expect(statements.filter((statement) => statement.includes("INSERT INTO ops_audit.outbox_events"))).toHaveLength(1);
    expect(statements.some((statement) => statement.includes("INSERT INTO platform.entitlements"))).toBe(false);
  });

  it("replays the persisted subscription without a second mutation", async () => {
    const statements: string[] = [];
    const transaction = executor((query) => {
      statements.push(query.sql);
      if (query.sql.includes("INSERT INTO ops_audit.idempotency_records")) return { rows: [] };
      if (query.sql.includes("FROM ops_audit.idempotency_records")) return { rows: [{ idempotency_record_id: subscriptionId, request_hash: requestHash(), result_status_code: "completed", result_ref: `subscription:${subscriptionId}`, response_hash: "stored" }] };
      if (query.sql.includes("SELECT subscription_id,tenant_id")) return { rows: [projection()] };
      return { rows: [] };
    });

    const result = await subscriptionCreate(transaction, actor, input());

    expect(result.replayed).toBe(true);
    expect(statements.some((statement) => statement.includes("INSERT INTO platform.subscriptions"))).toBe(false);
    expect(statements.some((statement) => statement.includes("audit_events") || statement.includes("outbox_events"))).toBe(false);
  });

  it("rejects an idempotency key reused with a different payload", async () => {
    const transaction = executor((query) => {
      if (query.sql.includes("INSERT INTO ops_audit.idempotency_records")) return { rows: [] };
      if (query.sql.includes("FROM ops_audit.idempotency_records")) return { rows: [{ idempotency_record_id: subscriptionId, request_hash: requestHash("OTHER"), result_status_code: "completed", result_ref: `subscription:${subscriptionId}`, response_hash: "stored" }] };
      return { rows: [] };
    });
    await expect(subscriptionCreate(transaction, actor, input())).rejects.toSatisfy((error: unknown) => code(error) === "TCDX.CONFLICT.IDEMPOTENCY");
  });

  it.each([
    { candidate: { ...actor, permissions: new Set<string>() }, label: "missing permission" },
    { candidate: { ...actor, roles: ["PLATFORM_SUPPORT"] }, label: "non-Platform-Admin role" }
  ] as const)("denies $label", async ({ candidate }) => {
    await expect(subscriptionCreate({} as never, candidate, input())).rejects.toSatisfy((error: unknown) => code(error) === "TCDX.AUTHORIZATION.DENIED");
  });

  it.each(["capabilities", "entitlements"])("rejects caller-supplied %s", async (field) => {
    await expect(subscriptionCreate({} as never, actor, input({ tenant_id: tenantId, plan_version_id: planVersionId, subscription_code: "TECDEX-GRC", [field]: [] })))
      .rejects.toSatisfy((error: unknown) => code(error) === "TCDX.VALIDATION.FAILED");
  });

  it("fails closed for a missing tenant", async () => {
    const transaction = executor((query) => {
      if (query.sql.includes("INSERT INTO ops_audit.idempotency_records")) return { rows: [{ idempotency_record_id: subscriptionId }] };
      if (query.sql.includes("FROM platform.tenants")) return { rows: [] };
      return { rows: [] };
    });
    await expect(subscriptionCreate(transaction, actor, input())).rejects.toSatisfy((error: unknown) => code(error) === "TCDX.RESOURCE.NOT_FOUND");
  });

  it.each([
    [[], "TCDX.RESOURCE.NOT_FOUND"],
    [[{ plan_version_id: planVersionId, plan_state: "published", version_state: "draft" }], "TCDX.INVARIANT.VIOLATION"]
  ] as const)("fails closed for an unavailable PlanVersion", async (planRows, expectedCode) => {
    const transaction = executor((query) => {
      if (query.sql.includes("INSERT INTO ops_audit.idempotency_records")) return { rows: [{ idempotency_record_id: subscriptionId }] };
      if (query.sql.includes("FROM platform.tenants")) return { rows: [{ tenant_id: tenantId }] };
      if (query.sql.includes("FROM platform.plan_versions")) return { rows: [...planRows] };
      return { rows: [] };
    });
    await expect(subscriptionCreate(transaction, actor, input())).rejects.toSatisfy((error: unknown) => code(error) === expectedCode);
  });

  it("rejects a second active subscription after serializing on the tenant", async () => {
    const transaction = executor((query) => {
      if (query.sql.includes("INSERT INTO ops_audit.idempotency_records")) return { rows: [{ idempotency_record_id: subscriptionId }] };
      if (query.sql.includes("FROM platform.tenants")) return { rows: [{ tenant_id: tenantId }] };
      if (query.sql.includes("FROM platform.plan_versions")) return { rows: [{ plan_version_id: planVersionId, plan_state: "published", version_state: "published" }] };
      if (query.sql.includes("FROM platform.subscriptions") && query.sql.includes("FOR UPDATE")) return { rows: [{ subscription_id: subscriptionId }] };
      return { rows: [] };
    });
    await expect(subscriptionCreate(transaction, actor, input())).rejects.toSatisfy((error: unknown) => code(error) === "TCDX.CONFLICT.RESOURCE");
  });
});
