import { describe, expect, it } from "vitest";
import { PostgresQueryCompiler, type Kysely } from "kysely";
import { buildApp } from "../app.js";
import type { FoundationDatabase } from "../database.js";
import { UnavailableFileStoragePort } from "../ports/file-storage.js";
import { newUuidV7 } from "../uuid.js";

type Query = { sql: string; parameters: readonly unknown[] };
const actorId = newUuidV7(), planId = newUuidV7(), versionId = newUuidV7();
const url = "/api/v1/platform/plan-versions?page%5Bsize%5D=1";
const authorization = { authorization: "Bearer isolated-test-token" };

function setup(permission = true) {
  const queries: Query[] = [];
  const compiler = new PostgresQueryCompiler();
  const executeQuery = async (query: Query) => {
    queries.push(query);
    if (query.sql.includes("SELECT lifecycle_state FROM iam.user_identities")) return { rows: [{ lifecycle_state: "active" }] };
    if (query.sql.includes("SELECT DISTINCT p.permission_code")) return { rows: permission ? [{ permission_code: "platform.subscription.create", role_code: "PLATFORM_ADMIN" }] : [] };
    if (query.sql.includes("FROM platform.plan_versions pv JOIN platform.plans p")) return { rows: [
      { plan_version_id: versionId, plan_id: planId, plan_code: "ISO", plan_name: "ISO", version_number: 1, display_name: "ISO v1", created_at: new Date("2026-09-16T00:00:00Z") }
    ] };
    return { rows: [] };
  };
  const database = { executeQuery, getExecutor: () => ({ transformQuery: (node: unknown) => node,
    compileQuery: compiler.compileQuery.bind(compiler), executeQuery }) } as unknown as Kysely<FoundationDatabase>;
  const app = buildApp(async () => true, { database, fileStorage: new UnavailableFileStoragePort(), identityVerifier: {
    verifyBearerToken: async () => ({ principalClass: "HUMAN_INTERACTIVE" as const, principalId: actorId,
      tokenId: "test", expiresAt: new Date(Date.now() + 60_000) })
  } });
  return { app, queries };
}

describe("published PlanVersion selector", () => {
  it("returns only canonical published and effective metadata through a bounded page", async () => {
    const { app, queries } = setup();
    try {
      const response = await app.inject({ url, headers: authorization });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ items: [{ plan_version_id: versionId, plan_id: planId, plan_code: "ISO", plan_name: "ISO", version_number: 1, display_name: "ISO v1" }],
        page: { has_more: false, next_cursor: null } });
      const query = queries.find((entry) => entry.sql.includes("FROM platform.plan_versions pv JOIN platform.plans p"))!;
      expect(query.sql).toContain("p.lifecycle_state='published' AND pv.lifecycle_state='published'");
      expect(query.sql).toContain("pv.effective_from<=transaction_timestamp()");
      expect(query.parameters).toEqual([2]);
      expect(JSON.stringify(queries)).not.toMatch(/INSERT|UPDATE|DELETE|platform.entitlements/);
    } finally { await app.close(); }
  });
  it("denies anonymous, unauthorized, tenant-scoped and unsupported queries", async () => {
    const { app } = setup(false);
    try {
      expect((await app.inject({ url })).statusCode).toBe(401);
      expect((await app.inject({ url, headers: authorization })).statusCode).toBe(403);
      expect((await app.inject({ url, headers: { ...authorization, "x-tcdx-tenant-id": actorId } })).statusCode).toBe(403);
      expect((await app.inject({ url: `${url}&tenant_id=${actorId}`, headers: authorization })).statusCode).toBe(400);
    } finally { await app.close(); }
  });
});
