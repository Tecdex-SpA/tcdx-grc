import {sql,type Kysely} from 'kysely';
import type {FoundationDatabase} from '../database.js';
import type {VerifiedIdentity} from '../security/authentication.js';
import {resolvePlatformActor,requirePlatformAccess} from '../security/platform-authority.js';
import {resolveTenantActor,requireAccess,grantedScopes} from '../core-grc/security.js';
import type {CoreActor} from '../core-grc/model.js';
import {lockRetentionTenant} from '../core-grc/initial-retention-source.js';
import {assertPrimaryRetentionApplicability} from '../core-grc/retention-applicability.js';
import {newUuidV7} from '../uuid.js';
import {bindingAudit,bindingClaim,bindingFail,bindingId,bindingIfMatch,bindingOutbox,bindingSchema,type BindingMutation,type BindingTx} from './runtime-binding-core.js';

type Doc={document_id:string;document_code:string;title:string;document_kind:string;row_version:string;created_by_user_identity_id:string};
type File={file_object_id:string;tenant_id:string;created_by_user_identity_id:string;sha256:string;retention_policy_id:string;retention_policy_applicability_id:string;classification:string;scan_status:string;scan_completed_at:Date|null;detected_mime:string;storage_version:string;encryption_key_ref:string;scope_subject_id:string|null;processing_activity_id:string|null};
type Version={document_version_id:string;document_id:string;file_object_id:string;version_number:string;content_hash:string;document_code:string;lifecycle_state:string;created_by_user_identity_id:string};
type Ticket={subscription_id:string;tenant_id:string;document_version_id:string|null;content_hash:string|null;audit_event_id:string|null;row_version:string};
async function documentActor(tx:BindingTx,identity:VerifiedIdentity,tenantId:string){
 const active=await sql`SELECT user_identity_id FROM iam.user_identities WHERE user_identity_id=${identity.principalId}::uuid AND lifecycle_state='active'`.execute(tx);
 if(active.rows.length!==1)bindingFail(403);
 return resolveTenantActor(tx,identity,tenantId,'statement');
}
function documentAccess(actor:CoreActor,permission:string,owner?:string):void{
 requireAccess(actor,permission,'EVIDENCE_DOCUMENTS',['tenant','owned_object']);
 if(owner&&!grantedScopes(actor,permission).has('tenant')&&owner!==actor.userIdentityId)bindingFail(404);
}
async function fileFacts(tx:BindingTx,tenantId:string,id:string):Promise<File>{
 const rows=await sql<File>`SELECT f.*,a.scope_subject_id,a.processing_activity_id FROM evidence.file_objects f
  LEFT JOIN privacy.retention_policy_applicabilities a ON a.tenant_id=f.tenant_id AND a.retention_policy_applicability_id=f.retention_policy_applicability_id
  WHERE f.tenant_id=${tenantId}::uuid AND f.file_object_id=${id}::uuid FOR SHARE OF f`.execute(tx);
 const f=rows.rows[0];if(!f)bindingFail(404);
 if(f.scan_status!=='passed'||!f.scan_completed_at||f.detected_mime!=='application/pdf'||!f.storage_version||!f.encryption_key_ref||!/^[a-f0-9]{64}$/.test(f.sha256)||!f.retention_policy_applicability_id)bindingFail(422,'Document custody is not eligible');
 await assertPrimaryRetentionApplicability(tx,{tenantId,applicabilityId:f.retention_policy_applicability_id,retentionPolicyId:f.retention_policy_id,classification:f.classification,scopeSubjectId:f.scope_subject_id,processingActivityId:f.processing_activity_id},'statement');
 return f;
}
async function document(tx:BindingTx,tenantId:string,id:string,lock=false):Promise<Doc>{
 const row=(await sql<Doc>`SELECT *,row_version::text FROM evidence.documents WHERE tenant_id=${tenantId}::uuid AND document_id=${id}::uuid${sql.raw(lock?' FOR UPDATE':'')}`.execute(tx)).rows[0];
 if(!row||row.document_kind!=='contractual_ticket')bindingFail(404);return row;
}
async function version(tx:BindingTx,tenantId:string,id:string):Promise<Version>{
 const row=(await sql<Version>`SELECT v.*,v.version_number::text,d.document_code,d.created_by_user_identity_id FROM evidence.document_versions v JOIN evidence.documents d ON d.document_id=v.document_id AND d.tenant_id=v.tenant_id WHERE v.tenant_id=${tenantId}::uuid AND v.document_version_id=${id}::uuid AND d.document_kind='contractual_ticket' FOR SHARE OF v,d`.execute(tx)).rows[0];
 if(!row||!row.file_object_id)bindingFail(404);return row;
}
function projectVersion(v:Version){return bindingSchema<Version>('DocumentVersionProjection',{document_version_id:v.document_version_id,document_id:v.document_id,file_object_id:v.file_object_id,version_number:v.version_number,content_hash:v.content_hash,document_code:v.document_code,lifecycle_state:v.lifecycle_state},503);}
export class SubscriptionTicketService{
 constructor(private readonly db:Kysely<FoundationDatabase>){}
 async readDocument(identity:VerifiedIdentity,tenantId:string,id:string,kind:'document'|'version'){
  bindingId(tenantId);bindingId(id);
  return this.db.transaction().setIsolationLevel('repeatable read').execute(async tx=>{
   await sql`SET TRANSACTION READ ONLY`.execute(tx);
   const actor=await documentActor(tx,identity,tenantId);documentAccess(actor,'evidence.document.read');
   if(kind==='document'){const d=await document(tx,tenantId,id);documentAccess(actor,'evidence.document.read',d.created_by_user_identity_id);return {result:bindingSchema('DocumentProjection',{document_id:d.document_id,document_code:d.document_code,title:d.title,document_kind:d.document_kind,row_version:d.row_version},503),etag:'"'+d.row_version+'"'};}
   // Read-only metadata retrieval uses no FOR SHARE lock.
   const rows=await sql<Version>`SELECT v.*,v.version_number::text,d.document_code,d.created_by_user_identity_id FROM evidence.document_versions v JOIN evidence.documents d ON d.document_id=v.document_id AND d.tenant_id=v.tenant_id WHERE v.tenant_id=${tenantId}::uuid AND v.document_version_id=${id}::uuid AND d.document_kind='contractual_ticket'`.execute(tx);
   const v=rows.rows[0];if(!v)bindingFail(404);documentAccess(actor,'evidence.document.read',v.created_by_user_identity_id);return {result:projectVersion(v)};
  });
 }
 async incorporate(identity:VerifiedIdentity,tenantId:string,body:unknown,input:BindingMutation,documentId?:string){
  bindingId(tenantId);if(documentId)bindingId(documentId);
  const name=documentId?'documentVersionIncorporate':'documentIncorporate',permission=documentId?'evidence.document.update':'evidence.document.create';
  const b=bindingSchema<{file_object_id:string;document_code?:string;title?:string;reason:string}>(documentId?'DocumentVersionIncorporate':'DocumentIncorporate',body);
  if(documentId)bindingIfMatch(input.ifMatch,'numeric');
  return this.db.transaction().setIsolationLevel('read committed').execute(async tx=>{
   let actor=await documentActor(tx,identity,tenantId);documentAccess(actor,permission);
   await lockRetentionTenant(tx,tenantId);
   await sql`SELECT pg_advisory_xact_lock(hashtextextended(${tenantId+':document:'+(documentId??b.document_code)},0))`.execute(tx);
   actor=await documentActor(tx,identity,tenantId);documentAccess(actor,permission);
   const claim=await bindingClaim(tx,{tenantId,actorId:actor.userIdentityId,operation:name,targetId:documentId??null,body:b,schema:'DocumentVersionProjection'},input);
   if(claim.replay!==undefined)return {result:claim.replay,replay:true};
   let d:Doc;
   if(documentId){d=await document(tx,tenantId,documentId,true);documentAccess(actor,permission,d.created_by_user_identity_id);if(input.ifMatch!=='"'+d.row_version+'"')bindingFail(409);}
   else{
    if((await sql`SELECT document_id FROM evidence.documents WHERE tenant_id=${tenantId}::uuid AND document_code=${b.document_code!}`.execute(tx)).rows.length)bindingFail(409);
    d={document_id:newUuidV7(),document_code:b.document_code!,title:b.title!,document_kind:'contractual_ticket',row_version:'1',created_by_user_identity_id:actor.userIdentityId};
   }
   const f=await fileFacts(tx,tenantId,b.file_object_id);documentAccess(actor,permission,f.created_by_user_identity_id);
   if(!documentId)await sql`INSERT INTO evidence.documents(document_id,created_by_user_identity_id,updated_by_user_identity_id,tenant_id,document_code,title,document_kind,lifecycle_state,retention_policy_id) VALUES(${d.document_id}::uuid,${actor.userIdentityId}::uuid,${actor.userIdentityId}::uuid,${tenantId}::uuid,${d.document_code},${d.title},'contractual_ticket','draft',${f.retention_policy_id}::uuid)`.execute(tx);
   else{
    const match=await sql`SELECT document_id FROM evidence.documents WHERE tenant_id=${tenantId}::uuid AND document_id=${d.document_id}::uuid AND retention_policy_id=${f.retention_policy_id}::uuid`.execute(tx);
    if(!match.rows.length)bindingFail(422,'Document versions must retain the document retention authority');
    await sql`UPDATE evidence.documents SET row_version=row_version+1,updated_at=statement_timestamp(),updated_by_user_identity_id=${actor.userIdentityId}::uuid WHERE tenant_id=${tenantId}::uuid AND document_id=${d.document_id}::uuid`.execute(tx);
   }
   const sequence=(await sql<{n:string}>`SELECT (COALESCE(max(version_number),0)+1)::text AS n FROM evidence.document_versions WHERE tenant_id=${tenantId}::uuid AND document_id=${d.document_id}::uuid`.execute(tx)).rows[0]!.n;
   const id=newUuidV7();await sql`INSERT INTO evidence.document_versions(document_version_id,created_by_user_identity_id,tenant_id,version_number,lifecycle_state,document_id,file_object_id,content_hash) VALUES(${id}::uuid,${actor.userIdentityId}::uuid,${tenantId}::uuid,${sequence}::bigint,'draft',${d.document_id}::uuid,${f.file_object_id}::uuid,${f.sha256})`.execute(tx);
   const result=projectVersion({document_version_id:id,document_id:d.document_id,file_object_id:f.file_object_id,version_number:sequence,content_hash:f.sha256,document_code:d.document_code,lifecycle_state:'draft',created_by_user_identity_id:actor.userIdentityId});
   await bindingAudit(tx,{tenantId,actorId:actor.userIdentityId,correlationId:input.correlationId,operation:name,aggregateType:'Document',aggregateId:d.document_id,event:documentId?'audit.evidence.document_version.incorporate.v1':'audit.evidence.document.incorporate.v1',after:{...result,reason:b.reason,external_issuance_not_performed:true}});
   await claim.complete(result);return {result,replay:false};
  });
 }
 async readTicket(identity:VerifiedIdentity,id:string){
  bindingId(id);return this.db.transaction().setIsolationLevel('repeatable read').execute(async tx=>{
   await sql`SET TRANSACTION READ ONLY`.execute(tx);const actor=await resolvePlatformActor(tx,identity);requirePlatformAccess(actor,'platform.subscription_ticket.read',actor.roles.includes('PLATFORM_ADMIN'));
   return {result:await this.ticketProjection(tx,id)};
  });
 }
 private async ticketProjection(tx:BindingTx,id:string):Promise<Ticket>{
  const s=(await sql<{subscription_id:string;tenant_id:string;tenant_creation_ticket_document_version_id:string|null;row_version:string}>`SELECT subscription_id,tenant_id,tenant_creation_ticket_document_version_id,row_version::text FROM platform.subscriptions WHERE subscription_id=${id}::uuid`.execute(tx)).rows[0];if(!s)bindingFail(404);
  let hash:string|null=null,audit:string|null=null;
  if(s.tenant_creation_ticket_document_version_id){
   const row=(await sql<{content_hash:string;audit_event_id:string;after_payload:{content_hash:string}}>`SELECT v.content_hash,a.audit_event_id,a.after_payload FROM evidence.document_versions v JOIN ops_audit.audit_events a ON a.aggregate_type='Subscription' AND a.aggregate_id=${id}::uuid AND a.tenant_id=v.tenant_id AND a.event_code='audit.platform.subscription.ticket.link.v1' AND a.outcome='succeeded' AND a.after_payload->>'document_version_id'=v.document_version_id::text WHERE v.document_version_id=${s.tenant_creation_ticket_document_version_id}::uuid AND v.tenant_id=${s.tenant_id}::uuid ORDER BY a.occurred_at DESC,a.audit_event_id DESC LIMIT 1`.execute(tx)).rows[0];
   if(!row||row.content_hash!==row.after_payload.content_hash)bindingFail(503,'Ticket link audit integrity failed');hash=row.content_hash;audit=row.audit_event_id;
  }
  return bindingSchema('TicketProjection',{subscription_id:id,tenant_id:s.tenant_id,document_version_id:s.tenant_creation_ticket_document_version_id,content_hash:hash,audit_event_id:audit,row_version:s.row_version},503);
 }
 async link(identity:VerifiedIdentity,id:string,body:unknown,input:BindingMutation){
  bindingId(id);bindingIfMatch(input.ifMatch,'numeric');const b=bindingSchema<{document_version_id:string;reason:string}>('SubscriptionTicketLink',body);
  return this.db.transaction().setIsolationLevel('read committed').execute(async tx=>{
   let actor=await resolvePlatformActor(tx,identity,'statement');requirePlatformAccess(actor,'platform.subscription_ticket.update',actor.roles.includes('PLATFORM_ADMIN'));
   const root=(await sql<{tenant_id:string}>`SELECT tenant_id FROM platform.subscriptions WHERE subscription_id=${id}::uuid`.execute(tx)).rows[0];if(!root)bindingFail(404);
   await lockRetentionTenant(tx,root.tenant_id);
   const row=(await sql<{row_version:string;tenant_creation_ticket_document_version_id:string|null}>`SELECT row_version::text,tenant_creation_ticket_document_version_id FROM platform.subscriptions WHERE subscription_id=${id}::uuid AND tenant_id=${root.tenant_id}::uuid FOR UPDATE`.execute(tx)).rows[0];if(!row)bindingFail(404);
   actor=await resolvePlatformActor(tx,identity,'statement');requirePlatformAccess(actor,'platform.subscription_ticket.update',actor.roles.includes('PLATFORM_ADMIN'));
   const claim=await bindingClaim(tx,{tenantId:null,actorId:identity.principalId,operation:'subscriptionTicketLink',targetId:id,body:b,schema:'TicketProjection'},input);if(claim.replay!==undefined)return {result:claim.replay,replay:true};
   if(input.ifMatch!=='"'+row.row_version+'"')bindingFail(409);
   const v=await version(tx,root.tenant_id,b.document_version_id),f=await fileFacts(tx,root.tenant_id,v.file_object_id);if(f.sha256!==v.content_hash)bindingFail(422,'Document hash mismatch');
   if(row.tenant_creation_ticket_document_version_id){const old=await version(tx,root.tenant_id,row.tenant_creation_ticket_document_version_id);if(old.document_id!==v.document_id||BigInt(old.version_number)>=BigInt(v.version_number))bindingFail(409);}
   const before={document_version_id:row.tenant_creation_ticket_document_version_id,row_version:row.row_version};
   const updated=(await sql<{row_version:string}>`UPDATE platform.subscriptions SET tenant_creation_ticket_document_version_id=${v.document_version_id}::uuid,row_version=row_version+1,updated_at=statement_timestamp(),updated_by_user_identity_id=${identity.principalId}::uuid WHERE subscription_id=${id}::uuid AND row_version=${row.row_version}::bigint RETURNING row_version::text`.execute(tx)).rows[0];if(!updated)bindingFail(409);
   const auditId=newUuidV7(),result={subscription_id:id,tenant_id:root.tenant_id,document_version_id:v.document_version_id,content_hash:v.content_hash,audit_event_id:auditId,row_version:updated.row_version};
   await bindingAudit(tx,{tenantId:root.tenant_id,actorId:identity.principalId,correlationId:input.correlationId,operation:'subscriptionTicketLink',aggregateType:'Subscription',aggregateId:id,event:'audit.platform.subscription.ticket.link.v1',before,after:{...result,reason:b.reason}},auditId);
   await bindingOutbox(tx,{tenantId:root.tenant_id,actorId:identity.principalId,correlationId:input.correlationId,aggregateType:'Subscription',aggregateId:id,event:'platform.subscription.ticket.linked.v1',payload:result});
   await claim.complete(result);return {result,replay:false};
  });
 }
}
