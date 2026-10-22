import {sql,type Kysely} from 'kysely';
import {validateLibrarySchema} from '@tcdx-grc/contracts/normative-library';
import type {FoundationDatabase} from '../database.js';
import type {VerifiedIdentity} from '../security/authentication.js';
import {resolveTenantActor} from '../core-grc/security.js';
import {authorizeLibraryOperation,concealed,invalid,invariant} from '../normative-library/authorization.js';
import type {CursorPort} from '../normative-library/matrices.js';
import {hashCanonical} from '../regulatory/hash.js';
import {FoundationError} from '../errors.js';
import {controlOverrideEtag} from './control-adjustments.js';

export async function readControlAdjustment(database:Kysely<FoundationDatabase>,signer:CursorPort,input:{identity:VerifiedIdentity;tenantId:string;id:string;list:boolean;query:Record<string,unknown>;correlationId:string}){
 const operationId=input.list?'controlConfigurationOverrideList':'configurationOverrideGet';
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-7[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(input.id))invalid('id');
 if(Object.keys(input.query).some(k=>!input.list||!['page_size','cursor'].includes(k)))invalid();
 const size=input.query.page_size===undefined?50:Number(input.query.page_size);if(!Number.isInteger(size)||size<1||size>200)invalid('page_size');
 return database.transaction().setIsolationLevel('repeatable read').execute(async tx=>{
  await sql`SET TRANSACTION READ ONLY`.execute(tx);const actor=await resolveTenantActor(tx,input.identity,input.tenantId);authorizeLibraryOperation(actor,operationId);
  const found=await sql<Record<string,unknown>>`SELECT o.*,o.override_version::text,o.effective_from::text,o.effective_to::text,d.configuration_code,d.version_number::text AS definition_version FROM config.configuration_overrides o JOIN config.configuration_definitions d ON d.configuration_definition_id=o.configuration_definition_id AND d.lifecycle_state='published' AND d.ownership_class='PLATFORM_CONTROL' AND d.tenant_id IS NULL JOIN controls.control_versions cv ON cv.control_version_id=o.control_version_id AND cv.tenant_id=o.tenant_id AND cv.ownership_class='TENANT_OWNED' WHERE o.tenant_id=${actor.tenantId}::uuid AND o.scope_level='control_version' AND ((${input.list} AND o.control_version_id=${input.id}::uuid) OR (NOT ${input.list} AND o.configuration_override_id=${input.id}::uuid)) ORDER BY d.configuration_code COLLATE "C",o.configuration_override_id`.execute(tx);
  const items:Record<string,unknown>[]=[],keys:string[]=[];let etag:string|undefined;
  for(const row of found.rows){
   const audits=await sql<{audit_event_id:string;actor_user_identity_id:string;event_code:string;after_payload:Record<string,unknown>}>`SELECT audit_event_id,actor_user_identity_id,event_code,after_payload FROM ops_audit.audit_events WHERE aggregate_type='ConfigurationOverride' AND aggregate_id=${row.configuration_override_id as string}::uuid AND tenant_id=${actor.tenantId}::uuid AND outcome='succeeded' ORDER BY occurred_at,audit_event_id`.execute(tx);
   const material=audits.rows.filter(a=>['audit.configuration.configuration_override.create.v1','audit.configuration.configuration_override.update.v1','audit.configuration.configuration_override.review.v1','audit.configuration.configuration_override.decide.v1'].includes(a.event_code));
   const decision=material.filter(a=>a.event_code.endsWith('.decide.v1')).at(-1),review=decision?.after_payload.review_audit_event_id?material.find(a=>a.audit_event_id===decision.after_payload.review_audit_event_id):material.filter(a=>a.event_code.endsWith('.review.v1')).at(-1);
   const rationale=material.at(-1)?.after_payload.rationale;if(typeof rationale!=='string'||!rationale.trim())invariant('Required configuration audit provenance is missing');
   const item={configuration_override_id:row.configuration_override_id,configuration_definition_id:row.configuration_definition_id,configuration_code:row.configuration_code,definition_version:row.definition_version,tenant_id:row.tenant_id,scope_level:row.scope_level,control_version_id:row.control_version_id,override_version:row.override_version,text_value:row.text_value,effective_from:new Date(String(row.effective_from)).toISOString(),effective_to:new Date(String(row.effective_to)).toISOString(),lifecycle_state:row.lifecycle_state,supersedes_configuration_override_id:row.supersedes_configuration_override_id??null,created_by_user_identity_id:row.created_by_user_identity_id,reviewed_by_user_identity_id:review?.actor_user_identity_id??null,approved_by_user_identity_id:row.approved_by_user_identity_id??null,review_audit_event_id:review?.audit_event_id??null,decision_audit_event_id:decision?.audit_event_id??null,rationale};
   items.push(item);keys.push(String(row.configuration_code)+'\u0000'+String(row.configuration_override_id));etag=controlOverrideEtag(row,material.map(a=>a.audit_event_id));
  }
  if(!input.list){if(items.length!==1)concealed();const response={operation_id:operationId,status:'completed',correlation_id:input.correlationId,resource_id:input.id,result:items[0]};if(!validateLibrarySchema('ControlOverrideResult',response).valid)invariant('Invalid override projection');return {response,etag};}
  // A foreign control filter cannot be disguised as an authorized empty list.
  const control=await sql`SELECT control_version_id FROM controls.control_versions WHERE control_version_id=${input.id}::uuid AND tenant_id=${actor.tenantId}::uuid AND ownership_class='TENANT_OWNED'`.execute(tx);if(control.rows.length!==1)concealed();
  const binding=hashCanonical({actor:actor.userIdentityId,tenant:actor.tenantId,permissions:[...actor.permissionScopes].map(([p,s])=>[p,[...s].sort()]).sort(),control:input.id,items});let after='';
  if(input.query.cursor){try{const p=JSON.parse(await signer.verifyReferenceCursor(String(input.query.cursor))) as {binding:string;after:string};if(p.binding!==binding||typeof p.after!=='string')throw new FoundationError('TCDX.CONFLICT.CONCURRENCY','Configuration cursor changed',409);after=p.after;}catch(e){if(e instanceof FoundationError)throw e;invalid('cursor');}}
  const available=items.map((row,index)=>({row,key:keys[index]!})).filter(r=>r.key>after),page=available.slice(0,size);const response={items:page.map(r=>r.row),next_cursor:available.length>size?await signer.signReferenceCursor(JSON.stringify({binding,after:page.at(-1)!.key})):null};if(!validateLibrarySchema('ControlOverridePage',response).valid)invariant('Invalid override page');return {response};
 });
}
