import {sql,type Transaction} from 'kysely';
import type {FoundationDatabase} from '../database.js';
import type {CoreActor} from '../core-grc/model.js';
import {requireAccess} from '../core-grc/security.js';
import {concealed,invariant} from './authorization.js';
import {loadApplicabilityContextProfile} from './postgres.js';
import type {ApplicabilityIdentity} from './applicability.js';

/** Hook for the existing applicabilityCreate transaction ONLY, before its single canonical audit.
 * Connected through the adopted composition only; current bootstrap supplies no such dependency.
 */
export async function bindCreatedApplicabilityContext(tx:Transaction<FoundationDatabase>,actor:CoreActor,created:ApplicabilityIdentity,contextVersionId:string|null){
 requireAccess(actor,'compliance.applicability.create','ISO_COMPLIANCE',['tenant']);
 if(created.tenant_id!==actor.tenantId)concealed();
 const row=await sql<{lifecycle_state:string;created_by_user_identity_id:string;context_knowledge_version_id:string|null;row_version:string}>`SELECT lifecycle_state,created_by_user_identity_id,context_knowledge_version_id,row_version::text FROM regulatory.requirement_applicabilities WHERE requirement_applicability_id=${created.requirement_applicability_id}::uuid AND tenant_id=${actor.tenantId}::uuid FOR UPDATE`.execute(tx);
 const current=row.rows[0];if(!current||current.created_by_user_identity_id!==actor.userIdentityId||current.lifecycle_state!=='draft'||current.row_version!=='1'||current.context_knowledge_version_id!==null)invariant('Context binding requires the new draft create transaction');
 const snapshot=await loadApplicabilityContextProfile(tx,actor,{...created,context_knowledge_version_id:contextVersionId});
 await sql`UPDATE regulatory.requirement_applicabilities SET context_knowledge_version_id=${contextVersionId}::uuid WHERE requirement_applicability_id=${created.requirement_applicability_id}::uuid AND tenant_id=${actor.tenantId}::uuid AND lifecycle_state='draft' AND row_version=1 AND context_knowledge_version_id IS NULL`.execute(tx);
 // Existing AuditEvent.after_payload gets this namespaced additive field; no new event or outbox.
 return {applicability_context_v1:snapshot};
}
export async function contextualApplicabilityAudit(tx:Transaction<FoundationDatabase>,actor:CoreActor,operation:'applicabilitySubmit'|'applicabilityApprove',row:ApplicabilityIdentity){
 requireAccess(actor,operation==='applicabilitySubmit'?'compliance.applicability.submit':'compliance.applicability.approve','ISO_COMPLIANCE',['tenant','owned_object']);
 return {applicability_context_v1:await loadApplicabilityContextProfile(tx,actor,row)};
}

export type ApplicabilityContextHooks={afterMutation(tx:Transaction<FoundationDatabase>,actor:CoreActor,operation:string,id:string,body:Record<string,unknown>):Promise<Record<string,unknown>>;replay(tx:Transaction<FoundationDatabase>,actor:CoreActor,id:string):Promise<void>};
/** Composed into the existing mutation transaction/audit, not a second command or event. */
export function composeApplicabilityContextHooks(assertContextRead:(tx:Transaction<FoundationDatabase>,actor:CoreActor,id:string)=>Promise<void>):ApplicabilityContextHooks{
 async function load(tx:Transaction<FoundationDatabase>,actor:CoreActor,id:string):Promise<ApplicabilityIdentity>{
  const result=await sql<Omit<ApplicabilityIdentity,'row_version'|'applicability_version'>&{row_version:string;applicability_version:string}>`SELECT requirement_applicability_id,applicability_version::text,row_version::text,tenant_id,scope_subject_id,context_knowledge_version_id FROM regulatory.requirement_applicabilities WHERE requirement_applicability_id=${id}::uuid AND tenant_id=${actor.tenantId}::uuid FOR UPDATE`.execute(tx);
  if(!result.rows[0])concealed();const row=result.rows[0],applicabilityVersion=Number(row.applicability_version),rowVersion=Number(row.row_version);
  if(![applicabilityVersion,rowVersion].every(v=>Number.isSafeInteger(v)&&v>0))invariant('Context audit version is not exactly representable');
  return {...row,applicability_version:applicabilityVersion,row_version:rowVersion};
 }
 return {
  async afterMutation(tx,actor,operation,id,body){
   const row=await load(tx,actor,id);
   if(operation==='applicabilityCreate'){
    const context=typeof body.context_knowledge_version_id==='string'?body.context_knowledge_version_id:null;
    if(context)await assertContextRead(tx,actor,context);
    if(context)return bindCreatedApplicabilityContext(tx,actor,row,context);
    return {applicability_context_v1:await loadApplicabilityContextProfile(tx,actor,row)};
   }
   if(row.context_knowledge_version_id)await assertContextRead(tx,actor,row.context_knowledge_version_id);
   return contextualApplicabilityAudit(tx,actor,operation as 'applicabilitySubmit'|'applicabilityApprove',row);
  },
  async replay(tx,actor,id){const row=await load(tx,actor,id);if(row.context_knowledge_version_id)await assertContextRead(tx,actor,row.context_knowledge_version_id);}
 };
}
