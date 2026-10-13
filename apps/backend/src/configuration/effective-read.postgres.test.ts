import { describe, expect, it } from "vitest";
import { Pool } from "pg";
import type { Kysely } from "kysely";
import type { FoundationDatabase } from "../database.js";
import type { CoreActor } from "../core-grc/model.js";
import { newUuidV7 } from "../uuid.js";
import { readEffectiveConfiguration } from "./effective-read.js";

const enabled = process.env.TCDX_EC_READONLY_POSTGRES === "true";
// Executes the actual reader SQL on PostgreSQL with typed VALUES CTE fixtures.
// Table substitution is test-only; no persisted fixtures, DDL, IAM or RLS proof.
type Defect = "none" | "global" | "foreign_root" | "foreign_layer" | "missing_layer_definition" | "foreign_layer_definition"
  | "missing_override" | "foreign_override" | "missing_override_definition" | "foreign_override_definition"
  | "absent" | "empty" | "duplicate_key" | "duplicate_selected" | "different_levels" | "stored_conflict";

async function fixture(defect: Defect) {
  if (process.env.DATABASE_HOST !== "127.0.0.1" || process.env.DATABASE_PORT !== "55432" || process.env.DATABASE_NAME !== "tcdx-grc") {
    throw new Error("EC_READ_TEST_REQUIRES_EXPLICIT_ISOLATED_LOCAL_POSTGRES");
  }
  const pool = new Pool({ host: "127.0.0.1", port: 55432, database: "tcdx-grc", user: process.env.DATABASE_USER ?? "postgres",
    ...(process.env.DATABASE_PASSWORD ? { password: process.env.DATABASE_PASSWORD } : {}),
    options: "-c default_transaction_read_only=on", connectionTimeoutMillis: 2000, max: 1 });
  const tenant = newUuidV7(), foreignTenant = newUuidV7(), ec = newUuidV7(), definition = newUuidV7(), layerDefinition = newUuidV7(), overrideDefinition = newUuidV7(), override = newUuidV7();
  const actor: CoreActor = {tenantId: tenant,membershipId:newUuidV7(),userIdentityId:newUuidV7(),roles:[],permissions:new Set(["configuration.effective_configuration.read"]),
    scopes:new Set(["tenant"]),permissionScopes:new Map([["configuration.effective_configuration.read",new Set(["tenant"])]]),capabilityGroups:new Set(["CORE_PLATFORM"])};
  const parameters: unknown[] = [ec, tenant];
  const bind = (value: unknown, type: string) => { parameters.push(value); return `$${parameters.length}::${type}`; };
  const definitions = [
    [definition, defect === "global" ? null : defect === "foreign_root" ? foreignTenant : tenant, "READER_LOCAL_FIXTURE", "9223372036854775807"],
    [layerDefinition, defect === "global" ? null : defect === "foreign_layer_definition" ? foreignTenant : tenant, "LAYER_LOCAL_FIXTURE", "1"],
    [overrideDefinition, defect === "global" ? null : defect === "foreign_override_definition" ? foreignTenant : tenant, "OVERRIDE_LOCAL_FIXTURE", "1"]
  ].filter(([id]) => !(defect === "missing_layer_definition" && id === layerDefinition) && !(defect === "missing_override_definition" && id === overrideDefinition));
  const defsSQL = definitions.map(([id,owner,code,version]) => `(${bind(id,"uuid")},${bind(owner,"uuid")},${bind(code,"varchar(128)")},${bind(version,"bigint")})`).join(",");
  const overrideSQL = `SELECT ${bind(override,"uuid")} AS configuration_override_id,${bind(defect==="global"?null:defect==="foreign_override"?foreignTenant:tenant,"uuid")} AS tenant_id,${bind(overrideDefinition,"uuid")} AS configuration_definition_id${defect==="missing_override"?" WHERE FALSE":""}`;
  const ecSQL = `SELECT ${bind(ec,"uuid")} AS effective_configuration_id,${bind(tenant,"uuid")} AS tenant_id,${bind(definition,"uuid")} AS configuration_definition_id,NULL::uuid AS resolved_for_subject_id,
    '2026-10-09T03:00:00+03:00'::timestamptz AS effective_at,'2026-10-09T00:00:00Z'::timestamptz AS resolved_at,
    ${bind(defect==="stored_conflict"?"configuration_conflict":"historical_fixture","varchar(32)")} AS resolution_status,${bind("A".repeat(64),"char(64)")} AS input_hash${defect==="absent"?" WHERE FALSE":""}`;
  const layersSQL = [2,1].map(ordinal => `(${bind(newUuidV7(),"uuid")},${bind(ec,"uuid")},${bind(defect==="foreign_layer"?foreignTenant:tenant,"uuid")},${bind(layerDefinition,"uuid")},${bind(override,"uuid")},${bind(defect==="different_levels"?`historical_${ordinal}`:"historical_level","varchar(32)")},${bind(defect==="duplicate_key"||defect==="different_levels"?1:ordinal,"integer")},${bind(defect==="duplicate_selected"||defect==="different_levels"||ordinal===2,"boolean")})`).join(",");
  let reads = 0;
  const database = {executeQuery: async (query:{sql:string;parameters:readonly unknown[]})=>{
    reads++;expect(query.parameters).toEqual([ec,tenant]);
    const ctes = `WITH fixture_definitions(configuration_definition_id,tenant_id,configuration_code,version_number) AS (VALUES ${defsSQL}),
      fixture_overrides AS (${overrideSQL}),fixture_ec AS (${ecSQL}),
      fixture_layers_values(effective_configuration_layer_id,effective_configuration_id,tenant_id,configuration_definition_id,configuration_override_id,precedence_level,ordinal,was_selected) AS (VALUES ${layersSQL}),
      fixture_layers AS (SELECT * FROM fixture_layers_values${defect==="empty"?" WHERE FALSE":""})`;
    const sql = query.sql.replaceAll("config.effective_configuration_layers","fixture_layers").replaceAll("config.effective_configurations","fixture_ec")
      .replaceAll("config.configuration_definitions","fixture_definitions").replaceAll("config.configuration_overrides","fixture_overrides");
    const result = await pool.query(ctes+sql,parameters);return {rows:result.rows};
  }} as unknown as Kysely<FoundationDatabase>;
  return {pool,read:()=>readEffectiveConfiguration(database,actor,ec),reads:()=>reads};
}

describe.skipIf(!enabled)("EC reader SQL on existing local PostgreSQL — read-only CTE fixtures",()=>{
  it.each(["none","global","different_levels","stored_conflict"] as const)("returns complete coherent metadata for %s",async scenario=>{
    const f=await fixture(scenario);try {const result=await f.read();expect(result.configuration_definition.version_number).toBe("9223372036854775807");expect(result.layers).toHaveLength(2);
      expect(result.effective_at).toBe("2026-10-09T00:00:00.000Z");expect(f.reads()).toBe(1);
      if(scenario==="none")expect(result.layers.map(x=>x.ordinal)).toEqual([1,2]);
      if(scenario==="stored_conflict")expect(result.resolution_status).toBe("configuration_conflict");
    }finally {await f.pool.end();}
  });
  it.each(["foreign_root","foreign_layer","missing_layer_definition","foreign_layer_definition","missing_override","foreign_override","missing_override_definition","foreign_override_definition","absent"] as const)("conceals %s with404 rather than partial/global access",async scenario=>{
    const f=await fixture(scenario);try {await expect(f.read()).rejects.toMatchObject({statusCode:404,code:"TCDX.RESOURCE.NOT_FOUND",message:"Resource not found"});expect(f.reads()).toBe(1);}finally {await f.pool.end();}
  });
  it.each(["duplicate_key","duplicate_selected"] as const)("returns409 for %s without resolving by order",async scenario=>{
    const f=await fixture(scenario);try {await expect(f.read()).rejects.toMatchObject({statusCode:409,code:"TCDX.CONFLICT.RESOURCE"});}finally {await f.pool.end();}
  });
  it("distinguishes zero persisted layers from invalid references",async()=>{
    const f=await fixture("empty");try {expect((await f.read()).layers).toEqual([]);expect(f.reads()).toBe(1);}finally {await f.pool.end();}
  });
});
