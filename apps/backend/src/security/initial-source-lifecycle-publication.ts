import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {sql,type Transaction} from 'kysely';
import type {FoundationDatabase} from '../database.js';
import {FoundationError} from '../errors.js';
import {newUuidV7} from '../uuid.js';
import {persistAuditEvent} from '../persistence/foundation-records.js';
const publicationPath='docs/executable-contracts/amendments/STEP_6A3_INITIAL_SOURCE_SUBMIT_SCOPE_v1.11/PUBLICATION_MANIFEST.json';
const reviewSha='df66515d794942c6f18e8a61fb3d398fb679c7b2111ea225571a77e605b8f19b';
const digest=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
function deny():never{throw new FoundationError('TCDX.AUTHORIZATION.DENIED','Initial source publication denied',403);}
function conflict():never{throw new FoundationError('TCDX.CONFLICT.RESOURCE','Initial source publication conflict',409);}
type Binding={entity_type:string;version_number:number;from_state:string;to_state:string;command_code:string;permission_code:string;precondition_policy_ref:string;sod_policy_ref:string;audit_event_code:string;notification_policy_ref:string;recalculation_policy_ref:string;idempotency_semantics:string;concurrency_semantics:string;system_actor_allowed:boolean;allowed_scopes:string[];side_effects:{event_code:string;ordinal:number;is_required:boolean}[]};
export async function loadInitialSourcePublication(root:string,sha:string){
 async function exact(path:string,hash:string){const f=resolve(root,path);if(!f.startsWith(resolve(root)+sep)||!/^[a-f0-9]{64}$/.test(hash))deny();const b=await readFile(f);if(digest(b)!==hash)deny();return JSON.parse(b.toString());}
 const p=await exact(publicationPath,sha);
 if(p.status!=='APPROVED_EXACT_SCOPE_SUCCESSOR_CONTRACT'||p.baseline!=='TCDX_GRC_MASTER_REGENT_BASELINE_v1.11_2026-10-15'||p.review_manifest.sha256!==reviewSha)deny();
 const review=await exact(p.review_manifest.path,reviewSha),act=await exact(p.decision.path,p.decision.sha256);
 if(act.decision!=='APPROVED_EXACT_EIGHT_SUCCESSOR_FILES'||act.manifest_sha256!==reviewSha||review.files.length!==8||JSON.stringify(p.approved_files)!==JSON.stringify(review.files))deny();
 const authorityPath='docs/governance/amendments/STEP_6A3_INITIAL_SOURCE_20261015/COMPETENT_AUTHORITY_FINAL_APPROVAL_20261015.json';
 const authority=JSON.parse(await readFile(resolve(root,authorityPath),'utf8'));if(authority.decision!=='APPROVED_FINAL_EXACT_BYTES')deny();
 const baseline=await readFile(resolve(root,'docs/rector/baseline/SHA256SUMS.txt'));
 if(digest(baseline)!==p.baseline_manifest_sha256||(await readFile(resolve(root,'docs/rector/BASELINE_ID'),'utf8')).trim()!==p.baseline)deny();
 let binding:Binding|undefined,predecessor:Record<string,unknown>|undefined;
 for(const entry of p.approved_files){const f=resolve(root,entry.path);if(!f.startsWith(resolve(root)+sep)||digest(await readFile(f))!==entry.sha256)deny();
  if(entry.path.endsWith('/LIFECYCLE_BINDING.json'))binding=await exact(entry.path,entry.sha256);
  if(entry.path.endsWith('/QA_PREDECESSOR.json')){const old=await exact(entry.path,entry.sha256);if(old.definitions.length!==1)deny();predecessor=old.definitions[0];}}
 if(!binding||!predecessor||binding.entity_type!=='EvidenceVersion'||binding.command_code!=='evidence.submit'||binding.version_number!==2||binding.from_state!=='draft'||binding.to_state!=='submitted'||binding.permission_code!=='evidence.evidence.submit'||binding.precondition_policy_ref!=='contract:initial-retention-source-submit:v1.11'||binding.system_actor_allowed!==false||JSON.stringify(binding.allowed_scopes)!==JSON.stringify(['assigned_object','owned_object','tenant'])||JSON.stringify(binding.side_effects)!==JSON.stringify(predecessor.side_effects))deny();
 const migration=p.dependencies.find((e:{path:string})=>e.path==='database/migrations/manifest.json');if(!migration)deny();const manifest=await exact(migration.path,migration.sha256);
 const r2=p.dependencies.find((e:{path:string})=>e.path==='database/migrations/20261015000100_c04w_applicability_hold_r2.sql');if(!r2||r2.sha256!=='b2a5bc73f75d7f95fb7ba5068f1b3ea77a923d7da7501446d05455ee545ec523'||digest(await readFile(resolve(root,r2.path)))!==r2.sha256)deny();
 return {binding,predecessor,manifestSha256:sha,decision:p.decision,reviewSha256:reviewSha,migrations:manifest.migrations as {id:string;filename:string;sha256:string}[]};
}
export type InitialSourcePublication=Awaited<ReturnType<typeof loadInitialSourcePublication>>;

/** The caller authenticates the existing machine principal and opens a QA-only transaction. */
export async function publishInitialSourceLifecycle(tx:Transaction<FoundationDatabase>,principal:string,correlationId:string,c:InitialSourcePublication){
 const ledger=(await sql<{migration_id:string;filename:string;content_sha256:string;outcome:string}>`SELECT migration_id,filename,content_sha256,outcome FROM platform.schema_migrations ORDER BY migration_id`.execute(tx)).rows;
 if(JSON.stringify(ledger)!==JSON.stringify(c.migrations.map(m=>({migration_id:m.id,filename:m.filename,content_sha256:m.sha256,outcome:'applied'}))))deny();
 const rows=(await sql<Record<string,unknown>>`SELECT d.*,
  (SELECT json_agg(s.scope_kind ORDER BY s.scope_kind) FROM ops_audit.lifecycle_transition_scopes s WHERE s.lifecycle_transition_definition_id=d.lifecycle_transition_definition_id) AS allowed_scopes,
  (SELECT json_agg(json_build_object('event_code',e.event_code,'ordinal',e.ordinal,'is_required',e.is_required) ORDER BY e.ordinal) FROM ops_audit.lifecycle_transition_side_effects e WHERE e.lifecycle_transition_definition_id=d.lifecycle_transition_definition_id) AS side_effects,p.permission_code
  FROM ops_audit.lifecycle_transition_definitions d JOIN iam.permissions p USING(permission_id)
  WHERE d.entity_type='EvidenceVersion' AND d.from_state='draft' AND d.command_code='evidence.submit' ORDER BY d.version_number`.execute(tx)).rows;
 const old=rows.find(r=>Number(r.version_number)===1);if(!old||JSON.stringify(JSON.parse(JSON.stringify(old)))!==JSON.stringify(c.predecessor))conflict();
 if(rows.length>2||rows.some(r=>![1,2].includes(Number(r.version_number))))conflict();
 const b=c.binding;let current=rows.find(r=>Number(r.version_number)===2);const existed=!!current;const id=current?String(current.lifecycle_transition_definition_id):newUuidV7();
 if(current){for(const key of ['entity_type','from_state','to_state','command_code','permission_code','precondition_policy_ref','sod_policy_ref','audit_event_code','notification_policy_ref','recalculation_policy_ref','idempotency_semantics','concurrency_semantics','system_actor_allowed','allowed_scopes','side_effects'] as const)if(JSON.stringify(current[key])!==JSON.stringify(b[key]))conflict();
  if(current.lifecycle_state!=='published'||current.created_by_service_principal_id!==principal)conflict();
 }else{
  await sql`INSERT INTO ops_audit.lifecycle_transition_definitions(lifecycle_transition_definition_id,created_by_service_principal_id,entity_type,version_number,from_state,command_code,to_state,precondition_policy_ref,permission_id,sod_policy_ref,audit_event_code,notification_policy_ref,recalculation_policy_ref,idempotency_semantics,concurrency_semantics,system_actor_allowed,lifecycle_state,published_at)
   VALUES(${id}::uuid,${principal}::uuid,${b.entity_type},2,${b.from_state},${b.command_code},${b.to_state},${b.precondition_policy_ref},${String(old.permission_id)}::uuid,${b.sod_policy_ref},${b.audit_event_code},${b.notification_policy_ref},${b.recalculation_policy_ref},${b.idempotency_semantics},${b.concurrency_semantics},FALSE,'published',transaction_timestamp())`.execute(tx);
  for(const scope of b.allowed_scopes)await sql`INSERT INTO ops_audit.lifecycle_transition_scopes(lifecycle_transition_scope_id,created_by_service_principal_id,lifecycle_transition_definition_id,scope_kind) VALUES(${newUuidV7()}::uuid,${principal}::uuid,${id}::uuid,${scope})`.execute(tx);
  for(const e of b.side_effects)await sql`INSERT INTO ops_audit.lifecycle_transition_side_effects(lifecycle_transition_side_effect_id,created_by_service_principal_id,lifecycle_transition_definition_id,event_code,ordinal,is_required) VALUES(${newUuidV7()}::uuid,${principal}::uuid,${id}::uuid,${e.event_code},${e.ordinal},${e.is_required})`.execute(tx);
 }
 const audits=(await sql<{n:number}>`SELECT count(*)::int AS n FROM ops_audit.audit_events WHERE aggregate_type='LifecycleTransitionDefinition' AND aggregate_id=${id}::uuid AND event_code='audit.platform.lifecycle_transition.publish.v1' AND command_code='step6a3InitialSourceLifecyclePublication' AND ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL AND actor_service_principal_id=${principal}::uuid AND actor_user_identity_id IS NULL AND outcome='success' AND after_payload->>'publication_manifest_sha256'=${c.manifestSha256} AND after_payload->>'review_manifest_sha256'=${c.reviewSha256}`.execute(tx)).rows[0]!.n;
 if(existed&&audits!==1||!existed&&audits!==0)conflict();
 if(!existed)await persistAuditEvent(tx,{auditEventId:newUuidV7(),ownershipClass:'PLATFORM_CONTROL',tenantId:null,actor:{servicePrincipalId:principal},correlationId,eventCode:'audit.platform.lifecycle_transition.publish.v1',aggregateType:'LifecycleTransitionDefinition',aggregateId:id,commandCode:'step6a3InitialSourceLifecyclePublication',outcome:'success',classification:'internal',before:{version_number:1,allowed_scopes:c.predecessor.allowed_scopes},after:{version_number:2,binding:b,publication_manifest_sha256:c.manifestSha256,review_manifest_sha256:c.reviewSha256,human_decision:c.decision}});
 return {initial_source_lifecycle_registry_rows:1,initial_source_lifecycle_created:existed?0:1,initial_source_lifecycle_audited:existed?0:1,version_number:2};
}
