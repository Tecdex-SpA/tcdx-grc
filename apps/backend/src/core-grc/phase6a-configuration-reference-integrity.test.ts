import { describe, expect, it, vi } from "vitest";
import { PostgresQueryCompiler, type Transaction } from "kysely";
import type { FoundationDatabase } from "../database.js";
import { newUuidV7 } from "../uuid.js";
import type { CoreActor } from "./model.js";
import { mutations } from "./service.js";

// Compiled SQL/command-boundary evidence; no PostgreSQL execution or RLS claim.
function fixture(domain: "compliance" | "controls", eligible: boolean, includeEC = true) {
  const tenantId=newUuidV7(),configurationId=newUuidV7(),methodId=newUuidV7();
  const compiler=new PostgresQueryCompiler();let inserted=false;
  const actor:CoreActor={tenantId,membershipId:newUuidV7(),userIdentityId:newUuidV7(),permissions:new Set(),scopes:new Set(),permissionScopes:new Map(),capabilityGroups:new Set(),roles:[]};
  const executeQuery=vi.fn((query:{sql:string;parameters:readonly unknown[]})=>{
    if(query.sql.includes("JOIN data.formula_definitions"))return {rows:[{methodology_version_ref:methodId,version_number:1,minimum_coverage:80,...(domain==="compliance"?{partial_compliance_factor:0.5}:{})}]};
    if(query.sql.includes("FROM config.effective_configurations")){
      expect(query.parameters).toEqual([configurationId,tenantId,domain]);
      expect(query.sql).toContain("cd.tenant_id IS NULL OR cd.tenant_id=ec.tenant_id");
      expect(query.sql).toContain("layer.tenant_id <> ec.tenant_id");
      expect(query.sql).toContain("ld.configuration_definition_id IS NULL");
      expect(query.sql).toContain("ld.tenant_id <> ec.tenant_id");
      expect(query.sql).toContain("layer.configuration_override_id IS NOT NULL AND lo.configuration_override_id IS NULL");
      expect(query.sql).toContain("lo.tenant_id <> ec.tenant_id");
      expect(query.sql).toContain("layer.configuration_override_id IS NOT NULL AND od.configuration_definition_id IS NULL");
      expect(query.sql).toContain("od.tenant_id <> ec.tenant_id");
      return {rows:eligible?[{effective_configuration_id:configurationId}]:[]};
    }
    if(query.sql.trimStart().startsWith("SELECT 1 AS found"))return {rows:[{found:1}]};
    if(query.sql.startsWith("INSERT INTO")){inserted=true;return {rows:[]};}
    throw new Error("Unexpected memory executor query");
  });
  const transaction={executeQuery,getExecutor:()=>({transformQuery:(node:unknown)=>node,compileQuery:(node:Parameters<PostgresQueryCompiler["compileQuery"]>[0],queryId:Parameters<PostgresQueryCompiler["compileQuery"]>[1])=>compiler.compileQuery(node,queryId),executeQuery})} as unknown as Transaction<FoundationDatabase>;
  const body={methodology_version_ref:methodId,...(includeEC?{effective_configuration_id:configurationId}:{}),...(domain==="compliance"?{requirement_applicability_id:newUuidV7()}:{control_id:newUuidV7(),control_version_id:newUuidV7()})};
  const command=mutations.get(domain==="compliance"?"requirementAssessmentCreate":"controlAssessmentCreate")!;
  return {run:()=>command.execute({transaction,actor,body}),inserted:()=>inserted,executeQuery};
}

describe("Assessment configuration canonical reference guards",()=>{
  it.each(["compliance","controls"] as const)("binds all reference checks for compatible %s EC",async domain=>{
    const f=fixture(domain,true);await f.run();expect(f.inserted()).toBe(true);
  });
  it.each(["compliance","controls"] as const)("prevents %s persistence when reference policy returns no eligible EC",async domain=>{
    const f=fixture(domain,false);await expect(f.run()).rejects.toMatchObject({statusCode:400,code:"TCDX.VALIDATION.FAILED"});expect(f.inserted()).toBe(false);expect(f.executeQuery).toHaveBeenCalledTimes(2);
  });
  it.each(["compliance","controls"] as const)("keeps %s EC optional without fabricating a configuration/default",async domain=>{
    const f=fixture(domain,true,false);await f.run();expect(f.inserted()).toBe(true);expect(f.executeQuery.mock.calls.some(([q])=>q.sql.includes("FROM config.effective_configurations"))).toBe(false);
  });
});
