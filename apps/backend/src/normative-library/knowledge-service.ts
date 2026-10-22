import { sql, type Kysely, type Transaction } from 'kysely';
import type { FoundationDatabase } from '../database.js';
import type { VerifiedIdentity } from '../security/authentication.js';
import type { CoreActor } from '../core-grc/model.js';
import type { PlatformActor } from '../security/platform-authority.js';
import { newUuidV7 } from '../uuid.js';
import { insertRow } from '../core-grc/repository.js';
import { hashCanonical } from '../regulatory/hash.js';
import type { KnowledgeWrite, KnowledgeTarget } from '@tcdx-grc/contracts/normative-library';
import { executeLibraryMutation } from './mutations.js';
import { validateKnowledgeWrite, validateKnowledgeTargets, type TargetFacts } from './knowledge.js';
import { insertKnowledgeLinks, tenantKnowledgeTarget } from './postgres.js';
import type { KnowledgeCustody } from './custody.js';
import { authorizeLibraryOperation, assertCompatibleOwnership, concealed, type Ownership } from './authorization.js';

type Actor=CoreActor|PlatformActor;
type Parent=Ownership&{knowledge_item_id:string;knowledge_source_id:string;license_classification:string};
export type KnowledgeSourceRights = {
  assertWrite(tx:Transaction<FoundationDatabase>,actor:Actor,parent:Parent,body:KnowledgeWrite,phase:'create'|'update'|'review'|'publish'):Promise<void>;
  assertRead(tx:Transaction<FoundationDatabase>,actor:Actor,versionId:string):Promise<void>;
  platformTarget(tx:Transaction<FoundationDatabase>,actor:PlatformActor,target:KnowledgeTarget):Promise<TargetFacts|null>;
};
/** Real version-create persistence, kept unregistered until physical constraints and IAM are adopted. */
export async function createKnowledgeVersion(database:Kysely<FoundationDatabase>,custody:KnowledgeCustody,rights:KnowledgeSourceRights,input:{identity:VerifiedIdentity;tenantId?:string;itemId:string;body:unknown;idempotencyKey:string;correlationId:string}){
 const body=validateKnowledgeWrite(input.body),platform=input.tenantId===undefined;
 const operationId=platform?'platformKnowledgeVersionCreate':'knowledgeVersionCreate';
 let parent:Parent|undefined;let versionNumber:string|undefined;
 return executeLibraryMutation(database,{identity:input.identity,...(input.tenantId?{tenantId:input.tenantId}:{}),operationId,targetId:input.itemId,correlationId:input.correlationId,idempotencyKey:input.idempotencyKey,body},{
  async authorizeReplay(tx,actor,response){await rights.assertRead(tx,actor,String(response.resource_id));},
  async lockAndValidate(tx,actor){
   const ownership:Ownership=platform?{ownership_class:'PLATFORM_CONTROL',tenant_id:null}:{ownership_class:'TENANT_OWNED',tenant_id:(actor as CoreActor).tenantId};
   const result=await sql<Parent>`SELECT i.knowledge_item_id,i.knowledge_source_id,i.ownership_class,i.tenant_id,s.license_classification
     FROM knowledge.knowledge_items i JOIN knowledge.knowledge_sources s ON s.knowledge_source_id=i.knowledge_source_id
     AND s.ownership_class=i.ownership_class AND s.tenant_id IS NOT DISTINCT FROM i.tenant_id
     WHERE i.knowledge_item_id=${input.itemId}::uuid AND i.ownership_class=${ownership.ownership_class} AND i.tenant_id IS NOT DISTINCT FROM ${ownership.tenant_id}::uuid
     FOR UPDATE OF i,s`.execute(tx);
   parent=result.rows[0];if(!parent)concealed();assertCompatibleOwnership(ownership,parent);
   await rights.assertWrite(tx,actor,parent,body,'create');
   await validateKnowledgeTargets(ownership,body,target=>'identity' in actor?rights.platformTarget(tx,actor,target):tenantKnowledgeTarget(tx,actor,target));
   const next=await sql<{next_version:string}>`SELECT (COALESCE(MAX(version_number),0)+1)::text AS next_version FROM knowledge.knowledge_versions WHERE knowledge_item_id=${input.itemId}::uuid`.execute(tx);
   versionNumber=next.rows[0]!.next_version;
   return {ownership,aggregateId:newUuidV7(),aggregateType:'KnowledgeVersion'};
  },
  async apply(tx,actor,locked,_body,auditId){
   if(!parent||!versionNumber)concealed();
   // Custody prepares and verifies immutable bytes before PostgreSQL references them.
   const stored=await custody.prepare(locked.aggregateId,body);
   await insertRow(tx,'knowledge.knowledge_versions',{knowledge_version_id:locked.aggregateId,created_by_user_identity_id:input.identity.principalId,ownership_class:locked.ownership.ownership_class,tenant_id:locked.ownership.tenant_id,knowledge_item_id:input.itemId,version_number:versionNumber,content_ref:stored.contentRef,content_hash:stored.contentHash,content_language:body.content_language,lifecycle_state:'draft',effective_from:body.effective_from,effective_to:body.effective_to??null});
   await insertKnowledgeLinks(tx,locked.aggregateId,locked.ownership,input.identity.principalId,body.links,newUuidV7);
   const projection={knowledge_version_id:locked.aggregateId,knowledge_item_id:input.itemId,version_number:versionNumber,content_hash:stored.contentHash,content_language:body.content_language,lifecycle_state:'draft',effective_from:body.effective_from,effective_to:body.effective_to??null,published_at:null,superseded_by_id:null,links:body.links,content:body.content,content_access:'body_available',content_restriction:null,publication_authority:'comprender' in body.content?'editorial':'tenant_context'};
   return {response:{operation_id:operationId,status:'completed',correlation_id:input.correlationId,resource_id:locked.aggregateId,result:projection},after:{aggregate_id:locked.aggregateId,input_hash:hashCanonical(body),artifact_hash:stored.contentHash,rationale:body.rationale,to_state:'draft'}};
  }
 });
}

export async function mutateKnowledgeVersion(database:Kysely<FoundationDatabase>,custody:KnowledgeCustody,rights:KnowledgeSourceRights,input:{identity:VerifiedIdentity;tenantId?:string;versionId:string;operationId:'knowledgeVersionUpdate'|'knowledgeVersionReview'|'knowledgeVersionPublish'|'platformKnowledgeVersionUpdate'|'platformKnowledgeVersionReview'|'platformKnowledgeVersionPublish';body:unknown;ifMatch:string;idempotencyKey:string;correlationId:string}){
 type VersionRow=Ownership&{knowledge_item_id:string;knowledge_version_id:string;version_number:string;content_ref:string;content_hash:string;content_language:string;lifecycle_state:string;effective_from:string;effective_to:string|null;published_at:string|null;superseded_by_id:string|null;created_by_user_identity_id:string};
 let current:VersionRow|undefined;let stored:Omit<KnowledgeWrite,'rationale'>|undefined;let reviewId:string|undefined;
 const update=input.operationId.endsWith('Update'),publish=input.operationId.endsWith('Publish');
 const {assertDraftAuthor,knowledgeVersionEtag}=await import('./knowledge.js');
 return executeLibraryMutation(database,{identity:input.identity,...(input.tenantId?{tenantId:input.tenantId}:{}),operationId:input.operationId,targetId:input.versionId,correlationId:input.correlationId,idempotencyKey:input.idempotencyKey,ifMatch:input.ifMatch,body:input.body},{
  async authorizeReplay(tx,actor,response){await rights.assertRead(tx,actor,String(response.resource_id));},
  async lockAndValidate(tx,actor,request){
   const authority:Ownership='identity' in actor?{ownership_class:'PLATFORM_CONTROL',tenant_id:null}:{ownership_class:'TENANT_OWNED',tenant_id:actor.tenantId};
   const root=await sql`SELECT i.knowledge_item_id FROM knowledge.knowledge_items i JOIN knowledge.knowledge_versions v ON v.knowledge_item_id=i.knowledge_item_id WHERE v.knowledge_version_id=${input.versionId}::uuid AND v.ownership_class=${authority.ownership_class} AND v.tenant_id IS NOT DISTINCT FROM ${authority.tenant_id}::uuid FOR UPDATE OF i`.execute(tx);if(root.rows.length!==1)concealed();
   const found=await sql<VersionRow>`SELECT v.*,v.version_number::text,v.effective_from::text,v.effective_to::text,v.published_at::text FROM knowledge.knowledge_versions v WHERE v.knowledge_version_id=${input.versionId}::uuid AND v.ownership_class=${authority.ownership_class} AND v.tenant_id IS NOT DISTINCT FROM ${authority.tenant_id}::uuid FOR UPDATE`.execute(tx);
   current=found.rows[0];if(!current)concealed();
   await rights.assertRead(tx,actor,current.knowledge_version_id);
   stored=await custody.read(current.knowledge_version_id,current.content_ref,current.content_hash);
   const parentRow=await sql<Parent>`SELECT i.knowledge_item_id,i.knowledge_source_id,i.ownership_class,i.tenant_id,s.license_classification FROM knowledge.knowledge_items i JOIN knowledge.knowledge_sources s ON s.knowledge_source_id=i.knowledge_source_id AND s.ownership_class=i.ownership_class AND s.tenant_id IS NOT DISTINCT FROM i.tenant_id WHERE i.knowledge_item_id=${current.knowledge_item_id}::uuid AND i.ownership_class=${authority.ownership_class} AND i.tenant_id IS NOT DISTINCT FROM ${authority.tenant_id}::uuid FOR SHARE OF i,s`.execute(tx);
   if(!parentRow.rows[0])concealed();
   const artifact=update?validateKnowledgeWrite(request):validateKnowledgeWrite({...stored,rationale:request.rationale});
   await rights.assertWrite(tx,actor,parentRow.rows[0],artifact,update?'update':publish?'publish':'review');
   await validateKnowledgeTargets(authority,artifact,target=>'identity' in actor?rights.platformTarget(tx,actor,target):tenantKnowledgeTarget(tx,actor,target));
   if(update)assertDraftAuthor(current,input.identity.principalId);
   else if(current.created_by_user_identity_id===input.identity.principalId)throw new (await import('../errors.js')).FoundationError('TCDX.AUTHORIZATION.DENIED','Access denied',403);
   if(publish){
    const review=await sql<{audit_event_id:string}>`SELECT audit_event_id FROM ops_audit.audit_events WHERE aggregate_type='KnowledgeVersion' AND aggregate_id=${input.versionId}::uuid AND ownership_class=${authority.ownership_class} AND tenant_id IS NOT DISTINCT FROM ${authority.tenant_id}::uuid AND event_code='audit.knowledge.knowledge_version.review.v1' AND outcome='succeeded' AND after_payload->>'artifact_hash'=${current.content_hash} AND after_payload->>'to_state'='reviewed' AND actor_user_identity_id IS DISTINCT FROM ${current.created_by_user_identity_id}::uuid ORDER BY occurred_at DESC,audit_event_id DESC LIMIT 1 FOR SHARE`.execute(tx);
    reviewId=review.rows[0]?.audit_event_id;if(!reviewId)concealed();
   }
   const audits=await sql<{audit_event_id:string}>`SELECT audit_event_id FROM ops_audit.audit_events WHERE aggregate_type='KnowledgeVersion' AND aggregate_id=${input.versionId}::uuid AND ownership_class=${authority.ownership_class} AND tenant_id IS NOT DISTINCT FROM ${authority.tenant_id}::uuid AND outcome='succeeded' AND event_code IN ('audit.knowledge.knowledge_version.create.v1','audit.knowledge.knowledge_version.update.v1','audit.knowledge.knowledge_version.review.v1','audit.knowledge.knowledge_version.publish.v1') ORDER BY audit_event_id FOR SHARE`.execute(tx);
   return {ownership:authority,aggregateId:input.versionId,aggregateType:'KnowledgeVersion',lifecycleState:current.lifecycle_state,etag:knowledgeVersionEtag(current,stored.links,audits.rows.map(a=>a.audit_event_id)),before:{aggregate_id:input.versionId,artifact_hash:current.content_hash,from_state:current.lifecycle_state}};
  },
  async apply(tx,_actor,locked,request){
   if(!current||!stored)concealed();let artifact=stored;let hash=current.content_hash;let ref=current.content_ref;
   const to=update?'draft':publish?'published':String(request.decision);
   if(update){const write=validateKnowledgeWrite(request);const prepared=await custody.prepare(input.versionId,write);hash=prepared.contentHash;ref=prepared.contentRef;artifact=write;
    await sql`DELETE FROM knowledge.knowledge_version_context_links WHERE knowledge_version_id=${input.versionId}::uuid AND tenant_id IS NOT DISTINCT FROM ${locked.ownership.tenant_id}::uuid`.execute(tx);
    await insertKnowledgeLinks(tx,input.versionId,locked.ownership,input.identity.principalId,write.links,newUuidV7);
   }
   const result=await sql<{published_at:Date|null}>`UPDATE knowledge.knowledge_versions SET content_ref=${ref},content_hash=${hash},content_language=${artifact.content_language},effective_from=${artifact.effective_from}::timestamptz,effective_to=${artifact.effective_to??null}::timestamptz,lifecycle_state=${to},published_at=CASE WHEN ${publish} THEN transaction_timestamp() ELSE published_at END WHERE knowledge_version_id=${input.versionId}::uuid AND lifecycle_state=${current.lifecycle_state} RETURNING published_at`.execute(tx);
   if(result.rows.length!==1)concealed();
   // Publish is the only permitted one-time supersession link on the prior immutable version.
   if(publish&&typeof request.supersedes_knowledge_version_id==='string'){
    const previous=await sql<{knowledge_version_id:string;version_number:string;effective_from:string;superseded_by_id:string|null}>`SELECT knowledge_version_id,version_number::text,effective_from::text,superseded_by_id FROM knowledge.knowledge_versions WHERE knowledge_version_id=${request.supersedes_knowledge_version_id}::uuid AND knowledge_item_id=${current.knowledge_item_id}::uuid AND ownership_class=${locked.ownership.ownership_class} AND tenant_id IS NOT DISTINCT FROM ${locked.ownership.tenant_id}::uuid AND lifecycle_state='published' AND published_at IS NOT NULL FOR UPDATE`.execute(tx);
    const old=previous.rows[0];if(!old||old.superseded_by_id!==null||BigInt(old.version_number)>=BigInt(current.version_number)||Date.parse(old.effective_from)>=Date.parse(artifact.effective_from))concealed();
    await sql`UPDATE knowledge.knowledge_versions SET superseded_by_id=${input.versionId}::uuid WHERE knowledge_version_id=${old.knowledge_version_id}::uuid AND superseded_by_id IS NULL`.execute(tx);
   }

   const projection={knowledge_version_id:input.versionId,knowledge_item_id:current.knowledge_item_id,version_number:current.version_number,content_hash:hash,content_language:artifact.content_language,lifecycle_state:to,effective_from:artifact.effective_from,effective_to:artifact.effective_to??null,published_at:result.rows[0]!.published_at?.toISOString()??null,superseded_by_id:current.superseded_by_id,links:artifact.links,content:artifact.content,content_access:'body_available',content_restriction:null,publication_authority:'comprender' in artifact.content?'editorial':'tenant_context'};
   return {response:{operation_id:input.operationId,status:'completed',correlation_id:input.correlationId,resource_id:input.versionId,result:projection},after:{aggregate_id:input.versionId,input_hash:hashCanonical(request),artifact_hash:hash,rationale:String(request.rationale),from_state:current.lifecycle_state,to_state:to,...(reviewId?{review_audit_event_id:reviewId}:{})}};
  }
 });
}

/** Source and Item creates persist only provenance/identity, never normative authority. */
export async function createKnowledgeCatalogEntry(database:Kysely<FoundationDatabase>,input:{identity:VerifiedIdentity;tenantId?:string;kind:'source'|'item';body:unknown;idempotencyKey:string;correlationId:string}){
 const {NORMATIVE_LIBRARY}=await import('@tcdx-grc/contracts/normative-library');
 const platform=input.tenantId===undefined;
 const operationId=(platform?'platformKnowledge':'knowledge')+(input.kind==='source'?'SourceCreate':'ItemCreate');
 let sourceId:string|undefined;
 return executeLibraryMutation(database,{identity:input.identity,...(input.tenantId?{tenantId:input.tenantId}:{}),operationId,correlationId:input.correlationId,idempotencyKey:input.idempotencyKey,body:input.body},{
  async authorizeReplay(tx,actor,response){
   const tenantId='identity' in actor?null:actor.tenantId;
   const exists=input.kind==='source'?await sql`SELECT knowledge_source_id FROM knowledge.knowledge_sources WHERE knowledge_source_id=${String(response.resource_id)}::uuid AND tenant_id IS NOT DISTINCT FROM ${tenantId}::uuid FOR SHARE`.execute(tx):await sql`SELECT knowledge_item_id FROM knowledge.knowledge_items WHERE knowledge_item_id=${String(response.resource_id)}::uuid AND tenant_id IS NOT DISTINCT FROM ${tenantId}::uuid FOR SHARE`.execute(tx);
   if(exists.rows.length!==1)concealed();
  },
  async lockAndValidate(tx,actor,body){
   const authority:Ownership=platform?{ownership_class:'PLATFORM_CONTROL',tenant_id:null}:{ownership_class:'TENANT_OWNED',tenant_id:(actor as CoreActor).tenantId};
   if(input.kind==='item'){
    sourceId=String(body.knowledge_source_id);
    const source=await sql<Ownership>`SELECT ownership_class,tenant_id FROM knowledge.knowledge_sources WHERE knowledge_source_id=${sourceId}::uuid AND ownership_class=${authority.ownership_class} AND tenant_id IS NOT DISTINCT FROM ${authority.tenant_id}::uuid FOR SHARE`.execute(tx);
    if(!source.rows[0])concealed();authorizeLibraryOperation(actor,platform?'platformKnowledgeSourceGet':'knowledgeSourceGet',source.rows[0]);assertCompatibleOwnership(authority,source.rows[0]);
   }
   return {ownership:authority,aggregateId:newUuidV7(),aggregateType:input.kind==='source'?'KnowledgeSource':'KnowledgeItem'};
  },
  async apply(tx,_actor,locked,body){
   const common={created_by_user_identity_id:input.identity.principalId,ownership_class:locked.ownership.ownership_class,tenant_id:locked.ownership.tenant_id};
   const fields=input.kind==='source'?{knowledge_source_id:locked.aggregateId,source_code:body.source_code,name:body.name,source_kind:body.source_kind,official_uri:body.official_uri??null,license_classification:body.license_classification,lifecycle_state:NORMATIVE_LIBRARY.itemInitial.source_initial_state}:{knowledge_item_id:locked.aggregateId,knowledge_source_id:sourceId,knowledge_code:body.knowledge_code,title:body.title,lifecycle_state:NORMATIVE_LIBRARY.itemInitial.server_owned_initial_lifecycle_state};
   await insertRow(tx,input.kind==='source'?'knowledge.knowledge_sources':'knowledge.knowledge_items',{...common,...fields});
   const result={...fields,ownership_class:locked.ownership.ownership_class,tenant_id:locked.ownership.tenant_id};
   return {response:{operation_id:operationId,status:'completed',correlation_id:input.correlationId,resource_id:locked.aggregateId,result},after:{aggregate_id:locked.aggregateId,input_hash:hashCanonical(body),artifact_hash:hashCanonical(result),rationale:String(body.rationale)}};
  }
 });
}
