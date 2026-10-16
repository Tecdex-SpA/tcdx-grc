// Synthetic technical fixtures exist only inside a rolled-back local PG16
// transaction. They are not tenant QA legal documents or human approvals.
import { describe, it, expect, vi } from "vitest";
import { Readable } from "node:stream";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Transaction } from "kysely";
import { sql, createDatabase, type FoundationDatabase } from "../database.js";
import { loadConfig } from "../config.js";
import { newUuidV7 } from "../uuid.js";
import { FoundationError } from "../errors.js";
import type { FileStoragePort } from "../ports/file-storage.js";
import type { CoreActor } from "./model.js";
import { resources } from "./model.js";
import { detailResource } from "./repository.js";
import { executeMutation, mutations } from "./service.js";
import { assertOrdinaryEvidence, assertUploadRetention, lockRetentionTenant } from "./initial-retention-source.js";
import {loadInitialSourcePublication,publishInitialSourceLifecycle} from "../security/initial-source-lifecycle-publication.js";
import * as records from "../persistence/foundation-records.js";
const enabled=process.env.TCDX_INITIAL_SOURCE_POSTGRES==='true';
const rolledBack=new Error('INITIAL_SOURCE_LOCAL_ROLLBACK');
const cases=['full source workflow and independent authors','CAS and idempotent replay','bind negatives and no publication without source','three retention revalidations and author checks','tenant permission and capability isolation','pending source cannot be ordinary evidence','audit failure rolls back source binding','source scan interval clause and independent review','source custody does not broaden document reads','tenant-only legacy DENY becomes authorized source submit under exact v2','ordinary tenant policy publication and upload without accreditation','ordinary product baseline publication and upload without accreditation','mandatory tenant policy still needs a formal source','contractual policy still needs a formal source','legal hold still needs a formal source','pending initial source cannot be published as ordinary'] as const;

describe.skipIf(!enabled)('INITIAL_SOURCE PG16 isolated rollback only',()=>{
it('serializes competing source and publication transactions on the same tenant',async()=>{
 if(process.env.DATABASE_HOST!=='127.0.0.1'||process.env.DATABASE_PORT!=='55437')throw Error('LOCAL_ONLY');
 const db=createDatabase(loadConfig(process.env)),tenant=newUuidV7();
 try {
  await db.transaction().execute(async tx=>{
   await lockRetentionTenant(tx,tenant);
   const other=await db.transaction().execute(async second=> (await sql<{locked:boolean}>`SELECT pg_try_advisory_xact_lock(hashtextextended(${tenant}::text || ':initial-retention-source',0)) AS locked`.execute(second)).rows[0]!.locked);
   expect(other).toBe(false);
  });
  const after=await db.transaction().execute(async tx=>(await sql<{locked:boolean}>`SELECT pg_try_advisory_xact_lock(hashtextextended(${tenant}::text || ':initial-retention-source',0)) AS locked`.execute(tx)).rows[0]!.locked);
  expect(after).toBe(true);
 }finally{await db.destroy();}
});
for(const scenario of cases) it(scenario,async()=>{
 if(process.env.DATABASE_HOST!=='127.0.0.1'||process.env.DATABASE_PORT!=='55437'||process.env.TCDX_INITIAL_SOURCE_PG_IDENTIFIER!=='7696888505868808231') throw new Error('ATTESTED_LOCAL_PG16_REQUIRED');
 const db=createDatabase(loadConfig(process.env));
 // Use the sealed published binding as a rollback fixture, not the operational
 // v1.11 loader: v1.12 activation does not authorize republishing its registry.
 const sealed=readFileSync('docs/executable-contracts/amendments/STEP_6A3_INITIAL_SOURCE_SUBMIT_SCOPE_v1.11/PUBLICATION_MANIFEST.json');
 const manifestSha256=createHash('sha256').update(sealed).digest('hex');
 expect(manifestSha256).toBe('c36209d048fcebb88cb77072b0cbaeab7189bcedac9bc77be8a41dd2857d69d9');
 const manifest=JSON.parse(sealed.toString());
 const fixture=(suffix:string)=>{const entry=manifest.approved_files.find((e:{path:string})=>e.path.endsWith(suffix));const bytes=readFileSync(entry.path);expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sha256);return JSON.parse(bytes.toString());};
 const publication:Awaited<ReturnType<typeof loadInitialSourcePublication>>={binding:fixture('/LIFECYCLE_BINDING.json'),predecessor:fixture('/QA_PREDECESSOR.json').definitions[0],manifestSha256,decision:manifest.decision,reviewSha256:manifest.review_manifest.sha256,migrations:JSON.parse(readFileSync('database/migrations/manifest.json','utf8')).migrations};
 const ids={tenant:newUuidV7(),foreign:newUuidV7(),custodian:newUuidV7(),owner:newUuidV7(),custMember:newUuidV7(),ownerMember:newUuidV7(),role:newUuidV7()};
 try {
  const identity=await sql<{id:string;major:number}>`SELECT system_identifier::text AS id,current_setting('server_version_num')::int/10000 AS major FROM pg_control_system()`.execute(db);
  expect(identity.rows[0]).toEqual({id:process.env.TCDX_INITIAL_SOURCE_PG_IDENTIFIER,major:16});
  await db.transaction().execute(async tx=>{
   await sql`INSERT INTO iam.user_identities(user_identity_id,identity_key,display_name,lifecycle_state)
    VALUES(${ids.custodian}::uuid,${ids.custodian},'LOCAL TECHNICAL CUSTODIAN','active'),(${ids.owner}::uuid,${ids.owner},'LOCAL TECHNICAL DOCUMENT AUTHOR','active')`.execute(tx);
   await sql`INSERT INTO platform.tenants(tenant_id,tenant_code,legal_name,display_name,default_timezone)
    VALUES(${ids.tenant}::uuid,${ids.tenant},'ROLLBACK TECHNICAL FIXTURE','ROLLBACK TECHNICAL FIXTURE','UTC'),(${ids.foreign}::uuid,${ids.foreign},'ROLLBACK OTHER TENANT','ROLLBACK OTHER TENANT','UTC')`.execute(tx);
   await sql`INSERT INTO iam.tenant_memberships(tenant_membership_id,tenant_id,user_identity_id,membership_state,joined_at)
    VALUES(${ids.custMember}::uuid,${ids.tenant}::uuid,${ids.custodian}::uuid,'active',transaction_timestamp()),(${ids.ownerMember}::uuid,${ids.tenant}::uuid,${ids.owner}::uuid,'active',transaction_timestamp())`.execute(tx);
   await sql`INSERT INTO iam.roles(role_id,ownership_class,tenant_id,role_code,name,lifecycle_state)
    VALUES(${ids.role}::uuid,'TENANT_OWNED',${ids.tenant}::uuid,'TENANT_ADMIN','LOCAL CUSTODIAN','published')`.execute(tx);
   await sql`INSERT INTO iam.membership_roles(membership_role_id,tenant_id,tenant_membership_id,role_id,scope_kind,valid_from)
    VALUES(${newUuidV7()}::uuid,${ids.tenant}::uuid,${ids.custMember}::uuid,${ids.role}::uuid,'tenant',transaction_timestamp())`.execute(tx);
   const perms=[...new Set([...mutations.values()].map(d=>d.permission)), 'evidence.evidence.read','privacy.retention_policy.read'];
   const actor=(who:'custodian'|'owner',roles:readonly string[]=who==='custodian'?['TENANT_ADMIN','PRIVACY_MANAGER']:['EVIDENCE_OWNER','LEGAL_REVIEWER']):CoreActor=>({tenantId:ids.tenant,membershipId:who==='custodian'?ids.custMember:ids.ownerMember,userIdentityId:ids[who],permissions:new Set(perms),scopes:new Set(['tenant']),permissionScopes:new Map(perms.map(p=>[p,new Set(['tenant'] as const)])),capabilityGroups:new Set(['PRIVACY','EVIDENCE_DOCUMENTS']),roles});
   let compensate=0;
   const storage={allocateQuarantineUpload:async({uploadIntentId,expiresAt})=>({objectKey:`quarantine/${uploadIntentId}`,uploadReference:'https://local.invalid/upload',expiresAt:expiresAt??new Date(Date.now()+300000)}),finalizeQuarantine:async({fileObjectId})=>({objectKey:`objects/${fileObjectId}`,detectedMime:'application/pdf',sizeBytes:12,sha256:'a'.repeat(64),scanState:'passed',storageVersion:'local-only',encryptionKeyRef:'local-only'}),removeQuarantine:async()=>{},removeFinalizedObject:async()=>{compensate++;},createDownloadReference:async()=>({downloadReference:'https://local.invalid/download'}),uploadQuarantineContent:async()=>{},openDownload:async()=>Readable.from([])} satisfies FileStoragePort;
   const run=async(op:string,who:'custodian'|'owner',body:Record<string,unknown>,targetId?:string,key=newUuidV7(),override?:CoreActor)=>{
    await sql`SAVEPOINT operation_case`.execute(tx);
    try { const value=await executeMutation(tx,override??actor(who),mutations.get(op)!,{body,...(targetId?{targetId}:{}),idempotencyKey:key,correlationId:newUuidV7(),fileStorage:storage});await sql`RELEASE SAVEPOINT operation_case`.execute(tx);return value; }
    catch(e){await sql`ROLLBACK TO SAVEPOINT operation_case`.execute(tx);await sql`RELEASE SAVEPOINT operation_case`.execute(tx);throw e;}
   };
   const fixtureInstant=(await sql<{now:string}>`SELECT to_char(transaction_timestamp(),'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS now`.execute(tx)).rows[0]!.now;
   const ordinary = scenario===cases[10] || scenario===cases[11];
   const kind = scenario===cases[11] ? 'product_baseline' : scenario===cases[13] ? 'contractual_policy' : scenario===cases[14] ? 'legal_hold' : 'tenant_policy';
   const policy=(await run('retentionPolicyCreate','custodian',{policy_code:ids.tenant,version_number:1,policy_kind:kind,...(kind==='legal_hold'?{}:{retention_seconds:604800}),trigger_event_code:'expiry_or_closure',precedence_rank:kind==='product_baseline'?100:kind==='contractual_policy'?300:kind==='legal_hold'?500:200,is_mandatory:scenario===cases[12]})).response.retention_policy_id as string;
   await run('retentionPolicyReview','custodian',{expected_version:1},policy);
   await run('retentionPolicyApprove','owner',{expected_version:2},policy);
   await run('retentionPolicyPublish','custodian',{expected_version:3},policy);
   const app=(await run('retentionApplicabilityCreate','custodian',{retention_policy_id:policy,version_number:1,classification:'confidential',...(ordinary || scenario===cases[12] || scenario===cases[13] || scenario===cases[14] || scenario===cases[15]?{effective_from:fixtureInstant}:{} )})).response.retention_policy_applicability_id as string;
   const bindings=JSON.parse(readFileSync(new URL('../../../../docs/executable-contracts/candidates/STEP_6A3_C04W_CFGD_v1.10/LIFECYCLE_BINDINGS.json',import.meta.url),'utf8')).bindings;
   for(const b of bindings){const edge=newUuidV7();await sql`INSERT INTO ops_audit.lifecycle_transition_definitions
    (lifecycle_transition_definition_id,entity_type,version_number,from_state,command_code,to_state,precondition_policy_ref,permission_id,sod_policy_ref,audit_event_code,notification_policy_ref,recalculation_policy_ref,idempotency_semantics,concurrency_semantics,system_actor_allowed,lifecycle_state,published_at)
    SELECT ${edge}::uuid,${b.entity_type},(SELECT COALESCE(max(version_number),0)+1 FROM ops_audit.lifecycle_transition_definitions WHERE entity_type=${b.entity_type} AND from_state=${b.from_state} AND command_code=${b.command_code}),${b.from_state},${b.command_code},${b.to_state},${b.precondition_policy_ref},permission_id,${b.sod_policy_ref},${b.audit_event_code},${b.notification_policy},${b.recalculation_policy},${b.idempotency_semantics},${b.concurrency_semantics},${b.system_actor_allowed},'published',transaction_timestamp() FROM iam.permissions WHERE permission_code=${b.permission_code} AND lifecycle_state='published'`.execute(tx);
    for(const scope of b.allowed_scopes) await sql`INSERT INTO ops_audit.lifecycle_transition_scopes(lifecycle_transition_scope_id,lifecycle_transition_definition_id,scope_kind) VALUES(${newUuidV7()}::uuid,${edge}::uuid,${scope})`.execute(tx);}
   if (scenario===cases[15]) {
    await run('uploadIntentCreate','owner',{original_filename:'LOCAL-PENDING-SOURCE.pdf',declared_mime:'application/pdf',size_bytes:12,classification:'confidential',retention_policy_id:policy,retention_policy_applicability_id:app,source_provenance:'ISOLATED PENDING SOURCE TEST'});
    await expect(run('retentionApplicabilitySubmitForReview','custodian',{expected_version:1},app)).rejects.toMatchObject({statusCode:422});
    throw rolledBack;
   }
   if (ordinary) {
    const failure=vi.spyOn(records,'persistAuditEvent').mockRejectedValueOnce(new Error('ORDINARY_AUDIT_FAILURE'));
    await expect(run('retentionApplicabilitySubmitForReview','custodian',{expected_version:1},app)).rejects.toThrow('ORDINARY_AUDIT_FAILURE');
    failure.mockRestore();
    const ctx={tenantId:ids.tenant,applicabilityId:app,retentionPolicyId:policy,classification:'confidential',scopeSubjectId:null,processingActivityId:null};
    const key=newUuidV7();
    await run('retentionApplicabilitySubmitForReview','custodian',{expected_version:1},app,key);
    expect((await run('retentionApplicabilitySubmitForReview','custodian',{expected_version:1},app,key)).replayed).toBe(true);
    await expect(run('retentionApplicabilityApprove','custodian',{expected_version:2},app)).rejects.toMatchObject({statusCode:403});
    const base=actor('owner');
    for(const denied of [{...base,tenantId:ids.foreign},{...base,permissions:new Set<string>()},{...base,capabilityGroups:new Set<string>()}]) {
     await expect(run('retentionApplicabilityApprove','owner',{expected_version:2},app,newUuidV7(),denied)).rejects.toBeInstanceOf(FoundationError);
    }
    await expect(run('retentionApplicabilityApprove','owner',{expected_version:1},app)).rejects.toMatchObject({statusCode:409});
    await run('retentionApplicabilityApprove','owner',{expected_version:2},app);
    await run('retentionApplicabilityPublish','custodian',{expected_version:3},app);
    const persisted=await sql<{lifecycle_state:string;source_evidence_version_id:null;source_clause_ref:null;row_version:string}>`SELECT lifecycle_state,source_evidence_version_id,source_clause_ref,row_version::text FROM privacy.retention_policy_applicabilities WHERE tenant_id=${ids.tenant}::uuid AND retention_policy_applicability_id=${app}::uuid`.execute(tx);
    expect(persisted.rows[0]).toEqual({lifecycle_state:'published',source_evidence_version_id:null,source_clause_ref:null,row_version:'4'});
    const audits=await sql<{n:number}>`SELECT count(*)::int AS n FROM ops_audit.audit_events WHERE tenant_id=${ids.tenant}::uuid AND aggregate_id=${app}::uuid`.execute(tx);
    expect(audits.rows[0]?.n).toBe(4);
    expect(await assertUploadRetention(tx,actor('owner'),ctx,'evidence.evidence.create')).toBe(false);
    await expect(assertUploadRetention(tx,actor('owner'),{...ctx,classification:'public'},'evidence.evidence.create')).rejects.toBeInstanceOf(FoundationError);
    const uploaded=(await run('uploadIntentCreate','owner',{original_filename:'LOCAL-ORDINARY-TECHNICAL.pdf',declared_mime:'application/pdf',size_bytes:12,classification:'confidential',retention_policy_id:policy,retention_policy_applicability_id:app,source_provenance:'ISOLATED ORDINARY OPERATION TEST'})).response.upload_intent_id as string;
    const finalized=await run('uploadFinalize','owner',{expected_version:1},uploaded);
    expect(finalized.response.retention_policy_applicability_id).toBe(app);
    throw rolledBack;
   }
   await expect(run('retentionApplicabilitySubmitForReview','custodian',{expected_version:1},app)).rejects.toMatchObject({statusCode:422});
   if (scenario===cases[12] || scenario===cases[13] || scenario===cases[14]) throw rolledBack;
   const uploadBody={original_filename:'LOCAL-NOT-A-LEGAL-DOCUMENT.pdf',declared_mime:'application/pdf',size_bytes:12,classification:'confidential',retention_policy_id:policy,retention_policy_applicability_id:app,source_provenance:'ISOLATED TECHNICAL FIXTURE ONLY'};
   const intent=(await run('uploadIntentCreate','owner',uploadBody)).response.upload_intent_id as string;
   if(scenario===cases[3]){
    await expect(run('uploadFinalize','custodian',{expected_version:1},intent)).rejects.toMatchObject({statusCode:404});
    await expect(run('uploadIntentCreate','owner',{...uploadBody,classification:'public'})).rejects.toMatchObject({statusCode:422});
    await sql`SAVEPOINT state_guard`.execute(tx);
    await sql`UPDATE privacy.retention_policies SET effective_from=transaction_timestamp()-interval '2 days',effective_to=transaction_timestamp()-interval '1 day',row_version=row_version+1 WHERE tenant_id=${ids.tenant}::uuid AND retention_policy_id=${policy}::uuid`.execute(tx);
    await expect(run('uploadFinalize','owner',{expected_version:1},intent)).rejects.toMatchObject({statusCode:422});
    await sql`ROLLBACK TO SAVEPOINT state_guard`.execute(tx);
   }
   const file=(await run('uploadFinalize','owner',{expected_version:1},intent)).response.file_object_id as string;
   const instant=(await sql<{now:string}>`SELECT to_char(transaction_timestamp(),'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS now`.execute(tx)).rows[0]!.now;
   const evidenceBody={evidence_code:ids.tenant,evidence_type:'document',retention_policy_id:policy,source_kind:'uploaded',file_object_id:file,effective_from:instant,provenance_ref:'ISOLATED TECHNICAL FIXTURE',links:[]};
   if(scenario===cases[3]){
    await expect(run('evidenceCreate','custodian',evidenceBody)).rejects.toMatchObject({statusCode:403});
    await sql`SAVEPOINT state_guard2`.execute(tx);
    await sql`UPDATE privacy.retention_policies SET effective_from=transaction_timestamp()-interval '2 days',effective_to=transaction_timestamp()-interval '1 day',row_version=row_version+1 WHERE tenant_id=${ids.tenant}::uuid AND retention_policy_id=${policy}::uuid`.execute(tx);
    await expect(run('evidenceCreate','owner',evidenceBody)).rejects.toMatchObject({statusCode:422});await sql`ROLLBACK TO SAVEPOINT state_guard2`.execute(tx);
   }
   const created=await run('evidenceCreate','owner',evidenceBody);const evidence=created.response.evidence_id as string;
   const version=(created.response.versions as {evidence_version_id:string}[])[0]!.evidence_version_id;
   if(scenario===cases[9]) {
    const existingActor=actor('owner'); existingActor.permissionScopes=new Map(perms.map(p=>[p,new Set(['tenant'] as const)]));
    await expect(run('evidenceSubmit','owner',{expected_version:1},version,newUuidV7(),existingActor)).rejects.toMatchObject({statusCode:409,code:'TCDX.LIFECYCLE.TRANSITION_DENIED'});
    // Reproduces real QA scopes before the approved v2 publication.
   }
   const principal=(await sql<{id:string}>`SELECT service_principal_id::text AS id FROM iam.service_principals WHERE lifecycle_state='active' LIMIT 1`.execute(tx)).rows[0]!.id;
   await expect(publishInitialSourceLifecycle(tx,principal,newUuidV7(),publication)).rejects.toMatchObject({statusCode:403});
   // The local ledger is genuinely33. Adapt only this rollback test configuration,
   // never ledger rows or the production loader: actual QA must match approved34.
   const localLedger=(await sql<{id:string;filename:string;sha256:string}>`SELECT migration_id AS id,filename,content_sha256 AS sha256 FROM platform.schema_migrations ORDER BY migration_id`.execute(tx)).rows;
   const isolatedConfig={...publication,migrations:localLedger};
   if(scenario===cases[6]) {
    await sql`SAVEPOINT publication_audit_rollback`.execute(tx);
    const failAudit=vi.spyOn(records,'persistAuditEvent').mockRejectedValueOnce(new Error('ISOLATED_PUBLICATION_AUDIT_FAILURE'));
    await expect(publishInitialSourceLifecycle(tx,principal,newUuidV7(),isolatedConfig)).rejects.toThrow('ISOLATED_PUBLICATION_AUDIT_FAILURE');failAudit.mockRestore();
    await sql`ROLLBACK TO SAVEPOINT publication_audit_rollback`.execute(tx);
    expect((await sql<{n:number}>`SELECT count(*)::int AS n FROM ops_audit.lifecycle_transition_definitions WHERE entity_type='EvidenceVersion' AND command_code='evidence.submit' AND version_number=2`.execute(tx)).rows[0]!.n).toBe(0);
   }
   expect(await publishInitialSourceLifecycle(tx,principal,newUuidV7(),isolatedConfig)).toMatchObject({initial_source_lifecycle_created:1,initial_source_lifecycle_audited:1});
   expect(await publishInitialSourceLifecycle(tx,principal,newUuidV7(),isolatedConfig)).toMatchObject({initial_source_lifecycle_created:0,initial_source_lifecycle_audited:0});
   if(scenario===cases[2]) {
    await sql`SAVEPOINT publication_scope_drift`.execute(tx);
    await sql`UPDATE ops_audit.lifecycle_transition_scopes SET scope_kind='platform' WHERE scope_kind='tenant' AND lifecycle_transition_definition_id IN (SELECT lifecycle_transition_definition_id FROM ops_audit.lifecycle_transition_definitions WHERE entity_type='EvidenceVersion' AND command_code='evidence.submit' AND version_number=2)`.execute(tx);
    await expect(publishInitialSourceLifecycle(tx,principal,newUuidV7(),isolatedConfig)).rejects.toMatchObject({statusCode:409});
    await sql`ROLLBACK TO SAVEPOINT publication_scope_drift`.execute(tx);
   }
   const submitKey=newUuidV7();
   await run('evidenceSubmit','owner',{expected_version:1},version,submitKey);
   await run('evidenceReviewStart','custodian',{expected_version:2},version);
   await expect(run('evidenceApprove','owner',{expected_version:3,rationale:'LOCAL SELF APPROVAL MUST FAIL'},version)).rejects.toMatchObject({statusCode:403});
   await run('evidenceApprove','custodian',{expected_version:3,rationale:'ISOLATED TECHNICAL TEST ONLY'},version);
   const bind={expected_version:1,source_evidence_version_id:version,source_clause_ref:'LOCAL TECHNICAL CLAUSE, NO LEGAL FORCE',effective_from:instant};
   if(scenario===cases[4]){
    const base=actor('custodian');
    for(const bad of [{...base,permissions:new Set<string>()},{...base,capabilityGroups:new Set<string>()},{...base,permissionScopes:new Map()},{...base,tenantId:ids.foreign},{...base,roles:['PLATFORM_ADMIN']}]){
     await expect(run('retentionApplicabilityBindInitialSource','custodian',bind,app,newUuidV7(),bad)).rejects.toBeInstanceOf(FoundationError);
    }
   }
   if(scenario===cases[2]){
    await expect(run('retentionApplicabilityBindInitialSource','owner',bind,app)).rejects.toMatchObject({statusCode:403});
    await expect(run('retentionApplicabilityBindInitialSource','custodian',{...bind,expected_version:2},app)).rejects.toMatchObject({statusCode:409});
   }
   if(scenario===cases[7]){
    await expect(run('retentionApplicabilityBindInitialSource','custodian',{...bind,source_clause_ref:'  '},app)).rejects.toMatchObject({statusCode:422});
    await expect(run('retentionApplicabilityBindInitialSource','custodian',{...bind,effective_to:instant},app)).rejects.toMatchObject({statusCode:400});
    for(const negative of ['scan','interval','review'] as const){await sql`SAVEPOINT invalid_source`.execute(tx);
     if(negative==='scan') await sql`UPDATE evidence.file_objects SET scan_status='failed',row_version=row_version+1 WHERE tenant_id=${ids.tenant}::uuid AND file_object_id=${file}::uuid`.execute(tx);
     if(negative==='interval') await sql`UPDATE evidence.evidence_versions SET effective_from=NULL,row_version=row_version+1 WHERE tenant_id=${ids.tenant}::uuid AND evidence_version_id=${version}::uuid`.execute(tx);
     if(negative==='review') await sql`UPDATE evidence.evidence_reviews SET reviewer_membership_id=${ids.ownerMember}::uuid WHERE tenant_id=${ids.tenant}::uuid AND evidence_version_id=${version}::uuid`.execute(tx);
     await expect(run('retentionApplicabilityBindInitialSource','custodian',bind,app)).rejects.toMatchObject({statusCode:422});await sql`ROLLBACK TO SAVEPOINT invalid_source`.execute(tx);
    }
   }
   if(scenario===cases[5]){
    await expect(assertOrdinaryEvidence(tx,ids.tenant,version)).rejects.toMatchObject({statusCode:422});
    const projected=await detailResource(tx,actor('owner'),resources.evidenceVersion,version);expect(projected.ordinary_consumption_allowed).toBe(false);
   }
   if(scenario===cases[8]){
    const other={...actor('owner'),userIdentityId:newUuidV7(),roles:['EVIDENCE_OWNER'],permissions:new Set(['evidence.evidence.read'])};
    await expect(detailResource(tx,other,resources.evidence,evidence)).rejects.toMatchObject({statusCode:404});
    const allowed=await detailResource(tx,actor('custodian'),resources.evidence,evidence);expect(allowed.evidence_id).toBe(evidence);
   }
   if(scenario===cases[6]){
    const spy=vi.spyOn(records,'persistAuditEvent').mockRejectedValueOnce(new Error('ISOLATED_AUDIT_FAILURE'));
    await expect(run('retentionApplicabilityBindInitialSource','custodian',bind,app)).rejects.toThrow('ISOLATED_AUDIT_FAILURE');spy.mockRestore();
    const check=await detailResource(tx,actor('custodian'),resources.retentionPolicyApplicability,app);expect(check).toMatchObject({row_version:1,source_evidence_version_id:null});
   }
   const key=newUuidV7();await run('retentionApplicabilityBindInitialSource','custodian',bind,app,key);
   if(scenario===cases[1]){
    expect((await run('retentionApplicabilityBindInitialSource','custodian',bind,app,key)).replayed).toBe(true);
    await expect(run('retentionApplicabilityBindInitialSource','custodian',{...bind,source_clause_ref:'different'},app,key)).rejects.toMatchObject({statusCode:409});
    await expect(run('retentionApplicabilityBindInitialSource','custodian',bind,app)).rejects.toMatchObject({statusCode:409});
   }
   await run('retentionApplicabilitySubmitForReview','custodian',{expected_version:2},app);
   await expect(run('retentionApplicabilityApprove','custodian',{expected_version:3},app)).rejects.toMatchObject({statusCode:403});
   await run('retentionApplicabilityApprove','owner',{expected_version:3},app);
   await run('retentionApplicabilityPublish','custodian',{expected_version:4},app);
   await assertOrdinaryEvidence(tx,ids.tenant,version);
   expect((await run('evidenceSubmit','owner',{expected_version:1},version,submitKey)).replayed).toBe(true);
   await expect(run('evidenceSubmit','owner',{expected_version:4},version)).rejects.toMatchObject({statusCode:403});
   const audit=await sql<{n:number}>`SELECT count(*)::int AS n FROM ops_audit.audit_events WHERE tenant_id=${ids.tenant}::uuid AND aggregate_id=${app}::uuid AND event_code='audit.privacy.retention_policy_applicability.bind_initial_source.v1' AND before_payload->>'row_version'='1' AND after_payload->>'row_version'='2'`.execute(tx);expect(audit.rows[0]?.n).toBe(1);
   expect(compensate).toBe(0);
   throw rolledBack;
  });
 }catch(e){if(e!==rolledBack)throw e;}
 finally {vi.restoreAllMocks();const residue=await sql<{n:number}>`SELECT count(*)::int AS n FROM platform.tenants WHERE tenant_id=${ids.tenant}::uuid`.execute(db);expect(residue.rows[0]?.n).toBe(0);await db.destroy();}
},30000);
});
