import {generateKeyPairSync} from "node:crypto";
import {describe,it,expect,vi} from "vitest";
import {PostgresQueryCompiler,type Kysely} from "kysely";
import {buildApp} from "../app.js";
import type {FoundationDatabase} from "../database.js";
import {newUuidV7} from "../uuid.js";
import {UnavailableFileStoragePort} from "../ports/file-storage.js";
import {ApplicationTokenService} from "../security/application-token.js";
import {parseReferenceQuery,readReferencePage,assertAssignableMembership} from "./reference-reads.js";
import {validatePublishedVocabulary} from "./service.js";
import type {CoreActor} from "./model.js";
import {REQUEST_VOCABULARIES} from "@tcdx-grc/contracts";
const permissions=["compliance.framework.read","platform.membership_reference.read","privacy.retention_policy_reference.read","compliance.soa.read","remediation.action.create","remediation.action.read","remediation.issue.read","evidence.evidence_request.create","evidence.evidence_request.read","controls.assurance_test.read","evidence.document.create","evidence.evidence.create","evidence.evidence.read"];
function fixture(options:{scope?:string;noGrant?:boolean;noCap?:boolean;publicationMissing?:boolean;grantPublicationMissing?:boolean;fail?:boolean;rows?:Record<string,unknown>[];parent?:Record<string,unknown>;roles?:string[];withoutActionCreate?:boolean}={}) {
 const tenant=newUuidV7(),membership=newUuidV7(),principal=newUuidV7();const compiler=new PostgresQueryCompiler();
 const executeQuery=vi.fn(async (q:{sql:string;parameters:readonly unknown[]})=> {
  if(q.sql.includes("AS published"))return {rows:[{published:!options.grantPublicationMissing}]};
  if(q.sql.includes("AS publication_count")) return {rows:options.publicationMissing?[]:[{publication_count:44,service_principal_id:principal}]};
  if(q.sql.includes("FROM iam.tenant_memberships") && !q.sql.includes("JOIN iam.user_identities")) return {rows:[{tenant_membership_id:membership}]};
  if(q.sql.includes("FROM iam.membership_roles")) return {rows:options.noGrant?[]:permissions.filter(p=>!options.withoutActionCreate||p!=="remediation.action.create").flatMap(p=>(options.roles??["GRC_MANAGER"]).map(role=>({permission_code:p,scope_kind:options.scope??"tenant",role_code:role})))};
  if(q.sql.includes("SELECT DISTINCT c.capability_group")) return {rows:options.noCap?[]:["CORE_PLATFORM","ISO_COMPLIANCE","CONTROLS_ASSURANCE","EVIDENCE_DOCUMENTS","ISSUES_ACTIONS"].map(capability_group=>({capability_group}))};
  if(q.sql.includes("FROM platform.subscriptions") || q.sql.includes("regulatory_pack_validation_accesses")) return {rows:[]};
  if(q.sql.includes("FROM remediation.issues t") || q.sql.includes("FROM remediation.actions t") || q.sql.includes("FROM regulatory.statements_of_applicability t")) return {rows:options.parent?[options.parent]:[]};
  if(q.sql.includes("GROUP BY u.display_name")) return {rows:[]};
  if(options.fail) throw new Error("SQL credential and private-host must not leak");
  return {rows:options.rows??[]};
 });
 const db={executeQuery,getExecutor:()=>({transformQuery:(n:unknown)=>n,compileQuery:(n:Parameters<PostgresQueryCompiler['compileQuery']>[0],id:Parameters<PostgresQueryCompiler['compileQuery']>[1])=>compiler.compileQuery(n,id),executeQuery})} as unknown as Kysely<FoundationDatabase>;
 const actor:CoreActor={tenantId:tenant,membershipId:membership,userIdentityId:principal,roles:options.roles??["GRC_MANAGER"],permissions:new Set(permissions),scopes:new Set(["tenant"]),permissionScopes:new Map(permissions.map(p=>[p,new Set(["tenant"])])),capabilityGroups:new Set(["CORE_PLATFORM","ISO_COMPLIANCE","CONTROLS_ASSURANCE","EVIDENCE_DOCUMENTS","ISSUES_ACTIONS"]),runtimeEnvironment:"production"};
 const app=buildApp(async()=>true,{database:db,identityVerifier:{verifyBearerToken:async()=>({principalClass:"HUMAN_INTERACTIVE",principalId:principal,tokenId:newUuidV7(),expiresAt:new Date(Date.now()+60000)})},fileStorage:new UnavailableFileStoragePort()});
 return {app,db,actor,executeQuery,headers:{authorization:"Bearer local-synthetic",'x-tcdx-tenant-id':tenant}};
}
describe("published STEP6A3 reference queries",()=> {
 for(const [kind,url] of [["framework","?page[size]=0"],["framework","?page[size]=101"],["framework","?purpose=select&purpose=history"],["framework","?tenant_id=x"],["framework","?filter[framework_id]=bad"],["framework","?filter[query]=a"],["framework","?purpose=history"],["membership","?purpose=action-assignment"],["membership","?purpose=action-history&issue_id=x"],["retention","?purpose=upload&filter[version_number]=9223372036854775808"],["retention","?purpose=history"],["retention","?purpose=upload&filter[policy_kind]=arbitrary"]] as const) {
  it(`rejects ${kind} ${url} without SQL`,()=>expect(()=>parseReferenceQuery(kind,url)).toThrow());
 }
 it("accepts exact contextual assignment and lossless int64 filters",()=> {
  const id=newUuidV7();expect(parseReferenceQuery("membership",`?purpose=action-assignment&issue_id=${id}`).parents.issue_id).toBe(id);
  expect(parseReferenceQuery("retention","?purpose=upload&filter[version_number]=9223372036854775807").filters.version_number).toBe("9223372036854775807");
 });
});
describe("Fastify reference reads",()=> {
 for(const path of ["framework-version-references","membership-references?purpose=action-assignment&issue_id="+newUuidV7(),"retention-policy-references?purpose=upload"]) {
  it(`${path} challenges anonymous callers and never queries`,async()=>{const f=fixture();try{const r=await f.app.inject({url:'/api/v1/'+path});expect(r.statusCode).toBe(401);expect(r.headers['www-authenticate']).toBe('Bearer');expect(r.headers['cache-control']).toBe('no-store');expect(f.executeQuery).not.toHaveBeenCalled();}finally{await f.app.close();}});
 }
 it("rejects malformed tenant and unknown/duplicate query before any SQL",async()=>{const f=fixture();try{for(const url of ['/api/v1/framework-version-references?x=1','/api/v1/framework-version-references?purpose=select&purpose=select','/api/v1/framework-version-references']) {const r=await f.app.inject({url,headers:{...f.headers,'x-tcdx-tenant-id':'malformed'}});expect(r.statusCode).toBe(400);}expect(f.executeQuery).not.toHaveBeenCalled();}finally{await f.app.close();}});
 for(const options of [{noGrant:true},{noCap:true},{scope:'assigned_object'}]) it(`DENY ${JSON.stringify(options)}`,async()=>{const f=fixture(options);try{const r=await f.app.inject({url:'/api/v1/framework-version-references',headers:f.headers});expect(r.statusCode).toBe(403);}finally{await f.app.close();}});
 for(const options of [{publicationMissing:true},{grantPublicationMissing:true}])it(`denies unadopted publication ${JSON.stringify(options)} despite grant rows`,async()=>{const f=fixture(options);try{const r=await f.app.inject({url:'/api/v1/framework-version-references',headers:f.headers});expect(r.statusCode).toBe(503);expect(r.body).not.toMatch(/service_principal|receipt_sha256|manifest_sha256/);expect(f.executeQuery.mock.calls.some(([q])=>q.sql.includes('FROM regulatory.framework_versions v'))).toBe(false);}finally{await f.app.close();}});
 it("returns genuine authorized empty framework catalog",async()=>{const f=fixture();try{const r=await f.app.inject({url:'/api/v1/framework-version-references',headers:f.headers});expect(r.statusCode).toBe(200);expect(r.json()).toEqual({items:[],page:{has_more:false,next_cursor:null}});expect(r.headers.vary).toContain('X-TCDX-Tenant-Id');}finally{await f.app.close();}});
 it("conceals absent/foreign parent identically",async()=>{const f=fixture();try{for(const id of[newUuidV7(),newUuidV7()]){const r=await f.app.inject({url:`/api/v1/membership-references?purpose=action-assignment&issue_id=${id}`,headers:f.headers});expect(r.statusCode).toBe(404);expect(r.json().message).toBe('Resource not found');}}finally{await f.app.close();}});
 it("sanitizes SQL dependency failure instead of successful empty",async()=>{const f=fixture({fail:true});try{const r=await f.app.inject({url:'/api/v1/framework-version-references',headers:f.headers});expect(r.statusCode).toBe(500);expect(r.body).not.toMatch(/credential|SQL|private-host/);}finally{await f.app.close();}});
 it("denies AUDITOR action assignment after exact D01 grant revocation",async()=>{const f=fixture({roles:['AUDITOR'],withoutActionCreate:true});try{const r=await f.app.inject({url:`/api/v1/membership-references?purpose=action-assignment&issue_id=${newUuidV7()}`,headers:f.headers});expect(r.statusCode).toBe(403);}finally{await f.app.close();}});
 it("does not select unbound retention or call it empty",async()=>{const f=fixture({rows:[{retention_policy_id:newUuidV7(),selectable:false}]});try{const r=await f.app.inject({url:'/api/v1/retention-policy-references?purpose=upload',headers:f.headers});expect(r.statusCode).toBe(422);}finally{await f.app.close();}});
 it("fails closed if a required page signature is unavailable",async()=>{const f=fixture({rows:[{framework_version_id:newUuidV7()},{framework_version_id:newUuidV7()}]});try{const r=await f.app.inject({url:'/api/v1/framework-version-references?page[size]=1',headers:f.headers});expect(r.statusCode).toBe(503);}finally{await f.app.close();}});
});
describe("cursor authentication and command revalidation",()=> {
 it("authenticates complete context, rejects tampering/cross tenant/actor/filter and bearer substitution",async()=> {
  const key=generateKeyPairSync('rsa',{modulusLength:2048});const service=await ApplicationTokenService.create({issuer:'local-test',audience:'local-test',keyId:'test-key',algorithm:'RS256',privateKey:key.privateKey.export({format:'pem',type:'pkcs8'}).toString(),publicKey:key.publicKey.export({format:'pem',type:'spki'}).toString(),maxLifetimeSeconds:300,clockToleranceSeconds:0});
  const rows=[1,2].map(n=>({framework_version_id:newUuidV7(),framework_id:newUuidV7(),framework_code:'ISO',framework_name:'Framework',edition:'v1',version_number:String(n),ownership_class:'TENANT_OWNED',lifecycle_state:'published',effective_from:null,effective_to:null,published_at:null,access_mode:'official',selectable:true}));
  const f=fixture({rows});const q=parseReferenceQuery('framework','?page[size]=1');const page=await readReferencePage(f.db,f.actor,'framework',q,service);const cursor=page.page.next_cursor!;
  expect(cursor).toBeTruthy();await expect(service.verifyBearerToken(cursor)).rejects.toThrow();
  await expect(service.verifyReferenceCursor((await service.issue(f.actor.userIdentityId,newUuidV7())).token)).rejects.toThrow();
  for(const actor of [{...f.actor,tenantId:newUuidV7()},{...f.actor,membershipId:newUuidV7()}]) await expect(readReferencePage(f.db,actor,'framework',{...q,cursor},service)).rejects.toMatchObject({statusCode:400});
  await expect(readReferencePage(f.db,f.actor,'framework',{...q,cursor,filters:{query:'changed'}},service)).rejects.toMatchObject({statusCode:400});
  const parts=cursor.split('.');parts[1]=Buffer.from('{}').toString('base64url');await expect(readReferencePage(f.db,f.actor,'framework',{...q,cursor:parts.join('.')},service)).rejects.toMatchObject({statusCode:400});
  await f.app.close();
 });
 it("bounds CT03 key tuple independently of persisted name length and rejects prior cursor version",async()=> {
  const issue=newUuidV7();const f=fixture({parent:{issue_id:issue},rows:[{tenant_membership_id:newUuidV7(),display_name:'x'.repeat(10000),joined_at:new Date(0)},{tenant_membership_id:newUuidV7(),display_name:'other',joined_at:new Date(0)}]});
  const codec={signReferenceCursor:async(payload:string)=>payload,verifyReferenceCursor:async(payload:string)=>payload};
  const q=parseReferenceQuery('membership',`?purpose=action-assignment&issue_id=${issue}&page[size]=1`);const page=await readReferencePage(f.db,f.actor,'membership',q,codec);const cursor=page.page.next_cursor!;expect(cursor.length).toBeLessThanOrEqual(2048);const decoded=JSON.parse(cursor);expect(decoded.v).toBe(2);expect(decoded.after[0]).toBe(new Date(0).toISOString());expect(cursor).not.toContain('xxxx');await expect(readReferencePage(f.db,f.actor,'membership',{...q,cursor:JSON.stringify({...decoded,v:1})},codec)).rejects.toMatchObject({statusCode:400});await f.app.close();
 });
 it("locks membership and identity and rejects inactive/revoked assignment before mutation",async()=>{const f=fixture();await expect(assertAssignableMembership(f.db,f.actor.tenantId,newUuidV7())).rejects.toMatchObject({statusCode:404});const q=f.executeQuery.mock.calls.at(-1)![0];expect(q.sql).toContain("m.tenant_id=$1::uuid");expect(q.sql).toContain("m.membership_state='active'");expect(q.sql).toContain("u.lifecycle_state='active'");expect(q.sql).toContain('FOR SHARE OF m,u');await f.app.close();});
});
describe("canonical published vocabulary write boundary",()=> {
 for(const [op,fields]of Object.entries(REQUEST_VOCABULARIES)) for(const [path,values]of Object.entries(fields)) {
  it(`${op}.${path} rejects unknown/legacy/coercion and accepts every published value`,()=> {
   const [field,nested]=path.split('[].');const base=Object.fromEntries(Object.entries(fields).filter(([p])=>p.startsWith(field!+'[].')).map(([p,values])=>[p.split('[].')[1]!,values[0]]));const body=(value:unknown)=>nested?{[field!]:[{...base,[nested]:value}]}:{[field!]:value};
   for(const value of values) expect(()=>validatePublishedVocabulary(op,body(value))).not.toThrow();
   for(const value of ['unpublished','upload',null,42,{},'']) expect(()=>validatePublishedVocabulary(op,body(value))).toThrow();
  });
 }
});
