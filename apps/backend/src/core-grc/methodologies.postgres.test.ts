import { describe, expect, it } from "vitest";
import { loadConfig } from "../config.js";
import { createDatabase, sql } from "../database.js";
import { newUuidV7 } from "../uuid.js";
import { resolveMethodology, listMethodologies } from "./methodologies.js";
import type { CoreActor } from "./model.js";

describe.skipIf(process.env.TCDX_PHASE5_LIFECYCLE_INTEGRATION !== "true")("Phase 5 canonical methodology binding PostgreSQL", () => {
  function database() {
    if (process.env.DATABASE_HOST !== "127.0.0.1" || process.env.DATABASE_PORT !== "55432" || process.env.DATABASE_NAME !== "tcdx-grc" || process.env.TCDX_ISOLATED_REBUILD !== "true") throw new Error("METHODOLOGY_TEST_REQUIRES_ISOLATED_POSTGRES");
    return createDatabase(loadConfig(process.env));
  }
  const actor = (tenantId = newUuidV7()): CoreActor => ({ tenantId, membershipId: newUuidV7(), userIdentityId: newUuidV7(), roles: ["COMPLIANCE_MANAGER"], permissions: new Set(["compliance.methodology.read", "controls.methodology.read"]), permissionScopes: new Map([["compliance.methodology.read", new Set(["tenant"] as const)], ["controls.methodology.read", new Set(["tenant"] as const)]]), scopes: new Set(["tenant"]), capabilityGroups: new Set(["ISO_COMPLIANCE", "CONTROLS_ASSURANCE"]) });
  it("selects published compatible methods, separates domains and denies unknown references", async () => {
    const db = database();
    try {
      const principal = actor();
      const compliance = await listMethodologies(db, principal, "compliance", {});
      const controls = await listMethodologies(db, principal, "controls", {});
      expect(compliance.items).toHaveLength(1); expect(controls.items).toHaveLength(1);
      expect(compliance.items[0]).toMatchObject({ partial_compliance_factor: 0.5, minimum_coverage: 80, version_number: 1 });
      await expect(resolveMethodology(db, "controls", compliance.items[0]!.methodology_version_ref)).rejects.toMatchObject({ code: "TCDX.VALIDATION.FAILED" });
      await expect(resolveMethodology(db, "compliance", controls.items[0]!.methodology_version_ref)).rejects.toMatchObject({ code: "TCDX.VALIDATION.FAILED" });
      await expect(resolveMethodology(db, "compliance", newUuidV7())).rejects.toMatchObject({ code: "TCDX.VALIDATION.FAILED" });
      await expect(listMethodologies(db, { ...principal, permissions: new Set(), permissionScopes: new Map() }, "compliance", {})).rejects.toMatchObject({ code: "TCDX.AUTHORIZATION.DENIED" });
      await expect(listMethodologies(db, { ...principal, capabilityGroups: new Set() }, "compliance", {})).rejects.toMatchObject({ code: "TCDX.AUTHORIZATION.DENIED" });
      await expect(listMethodologies(db, principal, "compliance", { "filter[tenant_id]": newUuidV7() })).rejects.toMatchObject({ code: "TCDX.VALIDATION.FAILED" });
    } finally { await db.destroy(); }
  });
  it("excludes draft, future and expired versions but preserves expired historical reference resolution", async () => {
    const db = database(); const rollback = new Error("ROLLBACK_METHOD_FIXTURES");
    try {
      await db.transaction().execute(async tx => {
        for (const [index, state, start, end] of [[2,"draft","-2 days",null],[3,"published","2 days",null],[4,"published","-2 days","-1 day"]] as const) {
          const id = newUuidV7();
          await sql`INSERT INTO regulatory.compliance_methodologies(compliance_methodology_id,ownership_class,methodology_code,version_number,name,rector_source,rector_version,formula_definition_id,minimum_coverage,partial_compliance_factor,lifecycle_state,effective_from,effective_to,published_at)
            SELECT ${id}::uuid,ownership_class,methodology_code,${index},name,rector_source,rector_version,formula_definition_id,minimum_coverage,partial_compliance_factor,${state},transaction_timestamp()+${start}::interval,CASE WHEN ${end}::text IS NULL THEN NULL ELSE transaction_timestamp()+${end}::interval END,CASE WHEN ${state}='published' THEN transaction_timestamp() ELSE NULL END FROM regulatory.compliance_methodologies WHERE version_number=1`.execute(tx);
          await expect(resolveMethodology(tx,"compliance",id)).rejects.toMatchObject({ code:"TCDX.VALIDATION.FAILED" });
          if (index===4) expect((await resolveMethodology(tx,"compliance",id,false)).version_number).toBe(4);
        }
        expect((await listMethodologies(tx,actor(),"compliance",{})).items).toHaveLength(1);
        throw rollback;
      }).catch(error => { if (error!==rollback) throw error; });
    } finally { await db.destroy(); }
  });
  it("protects published semantics, restrictive references and exact role grant derivation", async () => {
    const db = database();
    try {
      await expect(db.transaction().execute(tx => sql`UPDATE regulatory.compliance_methodologies SET partial_compliance_factor=0.9 WHERE lifecycle_state='published'`.execute(tx))).rejects.toThrow("PUBLISHED_METHODOLOGY_IMMUTABLE");
      await expect(db.transaction().execute(tx => sql`DELETE FROM controls.control_effectiveness_methodologies WHERE lifecycle_state='published'`.execute(tx))).rejects.toThrow("PUBLISHED_METHODOLOGY_IMMUTABLE");
      await expect(db.transaction().execute(tx => sql`UPDATE data.formula_definitions SET expression='changed' WHERE formula_code='BASELINE_COMPLIANCE'`.execute(tx))).rejects.toThrow("PUBLISHED_METHODOLOGY_FORMULA_IMMUTABLE");
      const fks = await sql<{count: string}>`SELECT count(*)::text AS count FROM pg_constraint WHERE conname IN ('fk_cm_assessment_method','fk_cem_assessment_method') AND convalidated AND confdeltype='a'`.execute(db);
      expect(Number(fks.rows[0]!.count)).toBe(2);
      const leakage = await sql<{count:string}>`SELECT count(*)::text AS count FROM iam.role_permissions rp JOIN iam.permissions p USING(permission_id) JOIN iam.roles r USING(role_id) WHERE p.permission_code IN ('compliance.methodology.read','controls.methodology.read') AND r.role_code='PLATFORM_ADMIN'`.execute(db);
      expect(Number(leakage.rows[0]!.count)).toBe(0);
      for (const [domain, resource] of [["compliance","requirement_assessment"],["controls","control_assessment"]]) {
        const diff = await sql<{count:string}>`WITH expected AS (SELECT rp.role_id FROM iam.role_permissions rp JOIN iam.permissions p USING(permission_id) WHERE p.permission_code=${domain+"."+resource+".create"}), actual AS (SELECT rp.role_id FROM iam.role_permissions rp JOIN iam.permissions p USING(permission_id) WHERE p.permission_code=${domain+".methodology.read"}) SELECT count(*)::text AS count FROM ((SELECT * FROM expected EXCEPT SELECT * FROM actual) UNION ALL (SELECT * FROM actual EXCEPT SELECT * FROM expected)) difference`.execute(db);
        expect(Number(diff.rows[0]!.count)).toBe(0);
      }
    } finally { await db.destroy(); }
  });
});
