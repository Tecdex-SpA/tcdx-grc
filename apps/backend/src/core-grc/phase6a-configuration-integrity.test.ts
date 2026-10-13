import { describe, expect, it, vi } from "vitest";
import { PostgresQueryCompiler, type Transaction } from "kysely";
import type { FoundationDatabase } from "../database.js";
import { newUuidV7 } from "../uuid.js";
import type { CoreActor } from "./model.js";
import { mutations } from "./service.js";

// SQL contract evidence using the real command, without a driver or database.
function fixture(domain: "compliance" | "controls", compatible: boolean) {
  const tenantId = newUuidV7();
  const configurationId = newUuidV7();
  const methodId = newUuidV7();
  const compiler = new PostgresQueryCompiler();
  const actor: CoreActor = {
    tenantId, membershipId: newUuidV7(), userIdentityId: newUuidV7(),
    permissions: new Set(), scopes: new Set(), permissionScopes: new Map(),
    capabilityGroups: new Set(), roles: []
  };
  let saved: Record<string, unknown> | undefined;
  const executeQuery = vi.fn((query: { sql: string; parameters: readonly unknown[] }) => {
    if (query.sql.includes("JOIN data.formula_definitions")) return { rows: [{
      methodology_version_ref: methodId, version_number: 1, minimum_coverage: 80,
      ...(domain === "compliance" ? { partial_compliance_factor: 0.5 } : {})
    }] };
    if (query.sql.includes("FROM config.effective_configurations")) {
      expect(query.parameters).toEqual([configurationId, tenantId, domain]);
      expect(query.sql).toContain("ec.tenant_id=$2::uuid");
      expect(query.sql).toContain("cd.owner_domain=$3");
      expect(query.sql).toContain("cd.lifecycle_state='published'");
      expect(query.sql).toMatch(/NOT EXISTS\s*\(SELECT 1 FROM config\.effective_configuration_layers layer\s+WHERE layer\.effective_configuration_id=ec\.effective_configuration_id\s+AND layer\.tenant_id <> ec\.tenant_id\)/);
      return { rows: compatible ? [{ effective_configuration_id: configurationId }] : [] };
    }
    if (query.sql.trimStart().startsWith("SELECT 1 AS found")) return { rows: [{ found: 1 }] };
    if (query.sql.startsWith("INSERT INTO")) {
      const columns = [...query.sql.matchAll(/"([a-z_]+)"/g)].map(match => match[1]!);
      saved = Object.fromEntries(columns.map((column, index) => [column, query.parameters[index]]));
      return { rows: [saved] };
    }
    throw new Error("Unexpected query in memory-only configuration fixture");
  });
  const transaction = {
    executeQuery,
    getExecutor: () => ({ transformQuery: (node: unknown) => node,
      compileQuery: (node: Parameters<PostgresQueryCompiler["compileQuery"]>[0], queryId: Parameters<PostgresQueryCompiler["compileQuery"]>[1]) => compiler.compileQuery(node, queryId),
      executeQuery })
  } as unknown as Transaction<FoundationDatabase>;
  const command = mutations.get(domain === "compliance" ? "requirementAssessmentCreate" : "controlAssessmentCreate")!;
  const body = {
    methodology_version_ref: methodId, effective_configuration_id: configurationId,
    ...(domain === "compliance" ? { requirement_applicability_id: newUuidV7() }
      : { control_id: newUuidV7(), control_version_id: newUuidV7() })
  };
  return { run: () => command.execute({ transaction, actor, body }), saved: () => saved, executeQuery, configurationId };
}

describe("STEP6A.3 assessment EC tenant lineage SQL contract", () => {
  it.each(["compliance", "controls"] as const)("requires same-tenant EC and layers for %s while preserving a compatible EC", async domain => {
    const f = fixture(domain, true);
    await f.run();
    expect(f.saved()).toMatchObject({ effective_configuration_id: f.configurationId });
  });

  it.each(["compliance", "controls"] as const)("stops %s before persistence when the EC eligibility query finds no compatible resolution", async domain => {
    const f = fixture(domain, false);
    await expect(f.run()).rejects.toMatchObject({ statusCode: 400, code: "TCDX.VALIDATION.FAILED", details: { field: "effective_configuration_id" } });
    expect(f.saved()).toBeUndefined();
    expect(f.executeQuery).toHaveBeenCalledTimes(2);
  });
});
