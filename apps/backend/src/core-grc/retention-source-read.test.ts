import { PostgresQueryCompiler, type Transaction } from "kysely";
import { describe, expect, it } from "vitest";
import type { FoundationDatabase } from "../database.js";
import type { CoreActor } from "./model.js";
import { resources } from "./model.js";
import { listResource } from "./repository.js";

const tenantId = "018f47f2-6170-7bd0-9d43-12f644a2b111";
const actorId = "018f47f2-6170-7bd0-9d43-12f644a2b112";
const membershipId = "018f47f2-6170-7bd0-9d43-12f644a2b113";

function executor(independentRead: boolean, queries: string[]) {
  const compiler = new PostgresQueryCompiler();
  const executeQuery = (query: { sql: string }) => {
    queries.push(query.sql);
    return Promise.resolve({ rows: query.sql.includes("AS permitted") ? [{ permitted: independentRead }] : [] });
  };
  return {
    executeQuery,
    getExecutor: () => ({
      transformQuery: (node: unknown) => node,
      compileQuery: (node: Parameters<PostgresQueryCompiler["compileQuery"]>[0], id: Parameters<PostgresQueryCompiler["compileQuery"]>[1]) => compiler.compileQuery(node, id),
      executeQuery
    })
  } as unknown as Transaction<FoundationDatabase>;
}

const actor: CoreActor = {
  tenantId, membershipId, userIdentityId: actorId,
  permissions: new Set(["evidence.evidence.read"]),
  scopes: new Set(["tenant"]),
  permissionScopes: new Map([["evidence.evidence.read", new Set(["tenant"] as const)]]),
  capabilityGroups: new Set(["EVIDENCE_DOCUMENTS"]),
  roles: ["TENANT_ADMIN"]
};

describe("C-04W tenant-admin evidence read ObjectPolicy", () => {
  it("limits the new tenant-scope grant to own or published policy sources", async () => {
    const queries: string[] = [];
    await listResource(executor(false, queries), actor, resources.evidence, {});
    expect(queries[0]).toContain("r.role_code<>'TENANT_ADMIN'");
    expect(queries[1]).toContain("t.created_by_user_identity_id=");
    expect(queries[1]).toContain("app.source_evidence_version_id=ev.evidence_version_id");
  });

  it("preserves a separate tenant-scope Evidence read role", async () => {
    const queries: string[] = [];
    await listResource(executor(true, queries), actor, resources.evidence, {});
    expect(queries[1]).not.toContain("app.source_evidence_version_id");
  });
});
