import { describe, expect, it } from "vitest";
import { PostgresQueryCompiler, type Kysely } from "kysely";
import { newUuidV7 } from "../uuid.js";
import type { FoundationDatabase } from "../database.js";
import { packVisibility } from "./pack-entitlement.js";
import { listResource } from "../core-grc/repository.js";
import { resources, type CoreActor } from "../core-grc/model.js";

type Query = { sql: string; parameters: readonly unknown[] };

function executor(handler: (query: Query) => { rows: Record<string, unknown>[] }) {
  const compiler = new PostgresQueryCompiler();
  const queryExecutor = {
    transformQuery: (node: unknown) => node,
    compileQuery: (node: Parameters<PostgresQueryCompiler["compileQuery"]>[0], queryId: Parameters<PostgresQueryCompiler["compileQuery"]>[1]) => compiler.compileQuery(node, queryId),
    executeQuery: handler
  };
  return { executeQuery: handler, getExecutor: () => queryExecutor } as unknown as Kysely<FoundationDatabase>;
}

describe("one commercial pack visibility authority", () => {
  it("fails closed without an active Subscription assignment", async () => {
    const queries: Query[] = [];
    const database = executor((query) => { queries.push(query); return { rows: [] }; });
    const visible = await packVisibility(database, newUuidV7());
    expect(visible.frameworkVersionIds.size).toBe(0);
    expect(visible.globalControlVersionIds.size).toBe(0);
    expect(queries).toHaveLength(1);
    expect(queries[0]?.sql).toContain("srp.lifecycle_state='active'");
    expect(queries[0]?.sql).toContain("s.lifecycle_state='active'");
    expect(queries[0]?.sql).toContain("srp.effective_from<=transaction_timestamp()");
    expect(queries[0]?.sql).toContain("pv.lifecycle_state='published'");
    expect(queries[0]?.sql).toContain("p.lifecycle_state='published'");
  });

  it("retains one shared Control and only the contracted framework relations", async () => {
    const tenantId = newUuidV7();
    const packA = newUuidV7();
    const frameworkA = newUuidV7();
    const frameworkB = newUuidV7();
    const controlVersion = newUuidV7();
    const control = newUuidV7();
    const queries: Query[] = [];
    const database = executor((query) => {
      queries.push(query);
      if (query.sql.includes("FROM platform.subscriptions s")) return { rows: [{
        regulatory_pack_version_id: packA, pack_code: "A", name: "A", edition: "v1",
        pack_lifecycle_state: "published", entitlement_effective_from: new Date(), entitlement_effective_to: null
      }] };
      if (query.sql.includes("FROM regulatory.regulatory_pack_framework_versions pfv")) {
        expect(query.parameters).toEqual([[packA]]);
        return { rows: [{ framework_version_id: frameworkA }] };
      }
      if (query.sql.includes("FROM controls.control_versions cv")) {
        expect(query.parameters).toEqual([[frameworkA], [frameworkA]]);
        return { rows: [{ control_version_id: controlVersion, control_id: control }] };
      }
      throw new Error(`Unexpected SQL: ${query.sql}`);
    });
    const visible = await packVisibility(database, tenantId);
    expect([...visible.frameworkVersionIds]).toEqual([frameworkA]);
    expect(visible.frameworkVersionIds.has(frameworkB)).toBe(false);
    expect([...visible.globalControlIds]).toEqual([control]);
    expect([...visible.globalControlVersionIds]).toEqual([controlVersion]);
    expect(queries[2]?.sql).toContain("regulatory.requirement_control_mappings");
    expect(queries[2]?.sql).toContain("regulatory.normative_unit_control_mappings");
  });

  it("binds Control search and framework filters to the contracted framework set", async () => {
    const tenantId = newUuidV7();
    const frameworkA = newUuidV7();
    const frameworkB = newUuidV7();
    const packA = newUuidV7();
    const controlVersion = newUuidV7();
    const control = newUuidV7();
    const statements: Query[] = [];
    const database = executor((query) => {
      statements.push(query);
      if (query.sql.includes("FROM platform.subscriptions s")) return { rows: [{ regulatory_pack_version_id: packA }] };
      if (query.sql.includes("FROM regulatory.regulatory_pack_framework_versions pfv")) return { rows: [{ framework_version_id: frameworkA }] };
      if (query.sql.includes("FROM controls.control_versions cv") && query.sql.includes("SELECT DISTINCT")) return { rows: [{ control_version_id: controlVersion, control_id: control }] };
      if (query.sql.includes("FROM controls.controls t")) return { rows: [] };
      if (query.sql.includes("FROM regulatory.framework_versions fv")) return { rows: [{ framework_version_id: frameworkA, framework_code: "A", framework_name: "Marco A", edition: "1" }] };
      throw new Error(`Unexpected SQL: ${query.sql}`);
    });
    const actor: CoreActor = {
      tenantId, membershipId: newUuidV7(), userIdentityId: newUuidV7(),
      permissions: new Set([resources.control.permission]),
      permissionScopes: new Map([[resources.control.permission, new Set(["owned_object" as const])]]),
      scopes: new Set(["owned_object"]), capabilityGroups: new Set([resources.control.capability]), roles: []
    };
    await listResource(database, actor, resources.control, { "filter[query]": "framework code" });
    const search = statements.findLast((statement) => statement.sql.includes("FROM controls.controls t"))!;
    expect(search.sql).toContain("fv.framework_version_id=ANY(");
    expect(search.sql).toContain("t.control_id=ANY(");
    expect(search.parameters).toContainEqual([frameworkA]);
    expect(search.parameters).not.toContainEqual([frameworkB]);
    expect(search.sql).toContain("AND (t.tenant_id IS NULL OR (t.tenant_id=$1::uuid");

    await listResource(database, actor, resources.control, { "filter[framework_version_id]": frameworkB });
    expect(statements.findLast((statement) => statement.sql.includes("FROM controls.controls t"))?.sql).toContain("AND FALSE");
  });
});
