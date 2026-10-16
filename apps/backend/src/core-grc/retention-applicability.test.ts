import { PostgresQueryCompiler, type Transaction } from "kysely";
import { describe, expect, it } from "vitest";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import { permissionProjectionCatalog } from "../security/permission-projection-catalog.generated.js";
import { assertPrimaryRetentionApplicability } from "./retention-applicability.js";

const context = {
  tenantId: "018f47f2-6170-7bd0-9d43-12f644a2b111",
  applicabilityId: "018f47f2-6170-7bd0-9d43-12f644a2b112",
  retentionPolicyId: "018f47f2-6170-7bd0-9d43-12f644a2b113",
  classification: "confidential",
  scopeSubjectId: null,
  processingActivityId: null
};

function executor(rows: Record<string, unknown>[], inspect?: (query: { sql: string; parameters: readonly unknown[] }) => void) {
  const compiler = new PostgresQueryCompiler();
  const executeQuery = (query: { sql: string; parameters: readonly unknown[] }) => {
    inspect?.(query);
    return Promise.resolve({ rows });
  };
  return {
    executeQuery,
    getExecutor: () => ({
      transformQuery: (node: unknown) => node,
      compileQuery: (node: Parameters<PostgresQueryCompiler["compileQuery"]>[0], queryId: Parameters<PostgresQueryCompiler["compileQuery"]>[1]) => compiler.compileQuery(node, queryId),
      executeQuery
    })
  } as unknown as Transaction<FoundationDatabase>;
}

describe("C-04W primary applicability", () => {
  it("projects legal hold release only within the tenant PRIVACY capability", () => {
    expect(permissionProjectionCatalog["privacy.retention_policy.legal_hold.release"])
      .toEqual({ capabilities: ["PRIVACY"], scopes: ["tenant"] });
  });
  it("binds tenant, policy version, classification and declared scope to a published ordinary policy", async () => {
    await assertPrimaryRetentionApplicability(executor([{ retention_policy_applicability_id: context.applicabilityId }], (query) => {
      expect(query.sql).toContain("p.policy_kind<>'legal_hold'");
      expect(query.sql).toContain("a.lifecycle_state='published'");
      expect(query.sql).toContain("a.scope_subject_id IS NULL OR a.scope_subject_id=");
      expect(query.sql).toContain("a.processing_activity_id IS NULL OR a.processing_activity_id=");
      expect(query.sql).toContain("peer_policy.precedence_rank>=p.precedence_rank");
      expect(query.sql).toContain("successor.supersedes_applicability_id=a.retention_policy_applicability_id");
      expect(query.sql).toContain("FOR SHARE OF a, p");
      expect(query.parameters.slice(0, 6)).toEqual([
        context.tenantId, context.applicabilityId, context.retentionPolicyId,
        context.classification, context.scopeSubjectId, context.processingActivityId
      ]);
    }), context);
  });

  it("rejects missing, cross-tenant, stale or incompatible applicability without selecting a fallback", async () => {
    await expect(assertPrimaryRetentionApplicability(executor([]), context))
      .rejects.toSatisfy((error: unknown) => error instanceof FoundationError && error.code === "TCDX.INVARIANT.VIOLATION");
  });
});
