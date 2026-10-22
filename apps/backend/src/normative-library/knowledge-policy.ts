import {sql,type Transaction} from 'kysely';
import type {FoundationDatabase} from '../database.js';
import type {CoreActor} from '../core-grc/model.js';
import type {PlatformActor} from '../security/platform-authority.js';
import type {KnowledgeWrite,KnowledgeLink,KnowledgeTarget} from '@tcdx-grc/contracts/normative-library';
import {validateLibrarySchema} from '@tcdx-grc/contracts/normative-library';
import type {KnowledgeSourceRights} from './knowledge-service.js';
import type {KnowledgeReadPolicy} from './knowledge-read.js';
import {authorizeLibraryOperation,concealed,type Ownership} from './authorization.js';
import {tenantKnowledgeTarget} from './postgres.js';
import {knowledgeArtifact,type TargetFacts} from './knowledge.js';
import {permitsSourceUse,requireSourceUse,rightsBindingHash,type RightsEvidence,type RightsRecord,type UseAct,type UseEnvironment} from './rights.js';
import {FoundationError} from '../errors.js';

type Tx=Transaction<FoundationDatabase>;type Actor=CoreActor|PlatformActor;type Row=Record<string,unknown>;type TargetLink=Pick<KnowledgeLink,'target'|'context_role'|'excerpt_hash'>;
/** Adapter over canonical actors, object/pack readers, typed links and the published H04 support relation. */
export class CanonicalKnowledgePolicy implements KnowledgeSourceRights,KnowledgeReadPolicy{
 constructor(private readonly environment:UseEnvironment,private readonly evidence:RightsEvidence){}
 async platformTarget(tx:Tx,actor:PlatformActor,target:KnowledgeTarget):Promise<TargetFacts|null>{
  authorizeLibraryOperation(actor,'platformKnowledgeVersionGet');
  if(!validateLibrarySchema('KnowledgeTarget',target).valid)return null;
  // Closed identifier dispatch; global staff never consumes tenant-owned targets.
  const result='normative_unit_id' in target?await sql<Ownership>`SELECT ownership_class,tenant_id FROM regulatory.normative_units WHERE normative_unit_id=${target.normative_unit_id}::uuid AND tenant_id IS NULL`.execute(tx):'requirement_id' in target?await sql<Ownership>`SELECT ownership_class,tenant_id FROM regulatory.requirements WHERE requirement_id=${target.requirement_id}::uuid AND tenant_id IS NULL`.execute(tx):'control_version_id' in target?await sql<Ownership>`SELECT ownership_class,tenant_id FROM controls.control_versions WHERE control_version_id=${target.control_version_id}::uuid AND tenant_id IS NULL`.execute(tx):null;
  const row=result?.rows[0];const entry=Object.entries(target)[0];return row&&entry?{...row,id:String(entry[1]),kind:entry[0],readable:true}:null;
 }
 private async target(tx:Tx,actor:Actor,target:KnowledgeTarget):Promise<TargetFacts>{
  const facts='identity' in actor?await this.platformTarget(tx,actor,target):await tenantKnowledgeTarget(tx,actor,target,false);if(!facts)concealed();return facts;
 }
 async visibleVersion(tx:Tx,actor:Actor,row:Row,links:readonly TargetLink[]):Promise<boolean>{
  const tenant='identity' in actor?null:actor.tenantId;
  if(row.tenant_id!==null&&row.tenant_id!==tenant)return false;
  if('identity' in actor&&row.tenant_id!==null)return false;
  if(!('identity' in actor)&&row.tenant_id===null&&row.lifecycle_state!=='published')return false;
  try{for(const link of links)await this.target(tx,actor,link.target);return true;}catch(e){if(e instanceof FoundationError&&[403,404].includes(e.statusCode))return false;throw e;}
 }
 async visibleCatalog(tx:Tx,actor:Actor,kind:'source'|'item',row:Row):Promise<boolean>{
  const tenant='identity' in actor?null:actor.tenantId;
  if(row.tenant_id!==null)return row.tenant_id===tenant;
  if('identity' in actor)return true;
  const versions=await sql<Row>`SELECT v.* FROM knowledge.knowledge_versions v JOIN knowledge.knowledge_items i ON i.knowledge_item_id=v.knowledge_item_id AND i.tenant_id IS NULL WHERE v.tenant_id IS NULL AND v.lifecycle_state='published' AND (${kind==='source'} AND i.knowledge_source_id=${String(row.knowledge_source_id??'')}::uuid OR ${kind==='item'} AND i.knowledge_item_id=${kind==='item'?String(row.knowledge_item_id):null}::uuid)`.execute(tx);
  for(const version of versions.rows)if(await this.visibleVersion(tx,actor,version,await this.links(tx,String(version.knowledge_version_id))))return true;
  return false;
 }
 private async links(tx:Tx,id:string):Promise<TargetLink[]>{
  const found=await sql<Row>`SELECT normative_unit_id,requirement_id,control_version_id,subject_id,context_role FROM knowledge.knowledge_version_context_links WHERE knowledge_version_id=${id}::uuid`.execute(tx);
  return found.rows.map(r=>{const fields=['normative_unit_id','requirement_id','control_version_id','subject_id'].filter(k=>r[k]!=null);if(fields.length!==1)concealed();return {target:{[fields[0]!]:r[fields[0]!] as string},context_role:r.context_role} as TargetLink;});
 }
 async assertTargetFilter(tx:Tx,actor:Actor,field:string,id:string):Promise<void>{
  if(field==='knowledge_source_id'||field==='knowledge_item_id'){
   const kind=field==='knowledge_source_id'?'source':'item';authorizeLibraryOperation(actor,('identity' in actor?'platformKnowledge':'knowledge')+(kind==='source'?'SourceGet':'ItemGet'));const found=kind==='source'?await sql<Row>`SELECT * FROM knowledge.knowledge_sources WHERE knowledge_source_id=${id}::uuid`.execute(tx):await sql<Row>`SELECT * FROM knowledge.knowledge_items WHERE knowledge_item_id=${id}::uuid`.execute(tx);
   if(!found.rows[0]||!await this.visibleCatalog(tx,actor,kind,found.rows[0]))concealed();return;
  }
  await this.target(tx,actor,{[field]:id} as KnowledgeTarget);
 }
 async bodyAllowed(tx:Tx,actor:Actor,row:Row):Promise<boolean>{
  if('identity' in actor&&!actor.roles.includes('PLATFORM_ADMIN'))return false;
  const links=await this.links(tx,String(row.knowledge_version_id));if(!await this.visibleVersion(tx,actor,row,links))return false;
  const source=await sql<{knowledge_source_id:string;ownership_class:string;tenant_id:string|null}>`SELECT s.knowledge_source_id,s.ownership_class,s.tenant_id FROM knowledge.knowledge_items i JOIN knowledge.knowledge_sources s ON s.knowledge_source_id=i.knowledge_source_id AND s.ownership_class=i.ownership_class AND s.tenant_id IS NOT DISTINCT FROM i.tenant_id WHERE i.knowledge_item_id=${String(row.knowledge_item_id)}::uuid`.execute(tx);
  if(!source.rows[0])return false;
  return this.permits(tx,actor,source.rows[0],String(row.content_hash),links,['consultation','presentation']);
 }
 async assertRead(tx:Tx,actor:Actor,versionId:string):Promise<void>{
  authorizeLibraryOperation(actor,'identity' in actor?'platformKnowledgeVersionGet':'knowledgeVersionGet');
  const row=await sql<Row>`SELECT * FROM knowledge.knowledge_versions WHERE knowledge_version_id=${versionId}::uuid`.execute(tx);if(!row.rows[0])concealed();requireSourceUse(await this.bodyAllowed(tx,actor,row.rows[0]));
 }
 async assertWrite(tx:Tx,actor:Actor,parent:Ownership&{knowledge_source_id:string},body:KnowledgeWrite,phase:'create'|'update'|'review'|'publish'):Promise<void>{
  const acts:UseAct[]=phase==='create'?['storage']:phase==='update'?['consultation','storage']:phase==='review'?['consultation']:['consultation','publication'];
  acts.push('consultation','presentation');
  if(body.links.length)acts.push('extraction');
  requireSourceUse(await this.permits(tx,actor,parent,knowledgeArtifact(body).hash,body.links,[...new Set(acts)],true));
 }
 private async permits(tx:Tx,actor:Actor,source:{knowledge_source_id:string;ownership_class:string;tenant_id:string|null},hash:string,links:readonly TargetLink[],acts:readonly UseAct[],lock=false):Promise<boolean>{
  const audience='identity' in actor?null:actor.tenantId;
  const time=await sql<{now:string}>`SELECT transaction_timestamp()::text AS now`.execute(tx);
  const packs=new Map<string,{edition:string;preliminary:boolean}>();
  for(const link of links){
   await this.target(tx,actor,link.target);
   // Regulatory pack dependencies of exact normative targets; subject/control-only guidance has its own source evidence.
   if('normative_unit_id' in link.target||'requirement_id' in link.target||'control_version_id' in link.target){
    const rows=await sql<{regulatory_pack_version_id:string;edition:string;preliminary:boolean}>`SELECT p.regulatory_pack_version_id,p.edition,EXISTS(SELECT 1 FROM platform.regulatory_pack_validation_provenances vp WHERE vp.regulatory_pack_version_id=p.regulatory_pack_version_id AND vp.authority_class='NON_AUTHORITATIVE_TEST_PACK') AS preliminary FROM regulatory.regulatory_pack_versions p JOIN regulatory.regulatory_pack_framework_versions pf ON pf.regulatory_pack_version_id=p.regulatory_pack_version_id WHERE pf.framework_version_id IN (SELECT framework_version_id FROM regulatory.normative_units WHERE normative_unit_id=${'normative_unit_id' in link.target?link.target.normative_unit_id:null}::uuid UNION SELECT framework_version_id FROM regulatory.requirements WHERE requirement_id=${'requirement_id' in link.target?link.target.requirement_id:null}::uuid UNION SELECT r.framework_version_id FROM regulatory.requirement_control_mappings m JOIN regulatory.requirements r ON r.requirement_id=m.requirement_id WHERE m.control_version_id=${'control_version_id' in link.target?link.target.control_version_id:null}::uuid UNION SELECT n.framework_version_id FROM regulatory.normative_unit_control_mappings m JOIN regulatory.normative_units n ON n.normative_unit_id=m.normative_unit_id WHERE m.control_version_id=${'control_version_id' in link.target?link.target.control_version_id:null}::uuid)`.execute(tx);
    if(!rows.rows.length&&!('control_version_id' in link.target))return false;for(const p of rows.rows)packs.set(p.regulatory_pack_version_id,p);
   }
  }
  const records=await sql<RightsRecord&{audit_binding_hash:string|null}>`SELECT r.*,r.effective_from::text,r.effective_to::text,r.revoked_at::text,a.after_payload->>'binding_hash' AS audit_binding_hash FROM knowledge.knowledge_source_usage_rights r JOIN ops_audit.audit_events a ON a.audit_event_id=r.recorded_audit_event_id AND a.aggregate_type='KnowledgeSource' AND a.aggregate_id=r.knowledge_source_id AND a.ownership_class=r.ownership_class AND a.tenant_id IS NOT DISTINCT FROM r.tenant_id AND a.actor_user_identity_id=r.created_by_user_identity_id AND a.event_code='audit.knowledge.knowledge_source.rights.record.v1' AND a.outcome='succeeded' AND a.after_payload->>'knowledge_source_usage_right_id'=r.knowledge_source_usage_right_id::text AND a.after_payload->>'evidence_hash'=r.evidence_hash WHERE r.knowledge_source_id=${source.knowledge_source_id}::uuid AND r.content_hash=${hash} AND r.audience_tenant_id IS NOT DISTINCT FROM ${audience}::uuid AND r.effective_from<=transaction_timestamp() AND r.effective_to>transaction_timestamp() AND (r.revoked_at IS NULL OR r.revoked_at>transaction_timestamp())${sql.raw(lock?' FOR SHARE OF r':'')}`.execute(tx);
  // Binding normalizes UTC representation without losing PostgreSQL microseconds.
  const normalized=records.rows;
  const evidence:RightsEvidence={verify:async r=>records.rows.find(x=>x.knowledge_source_usage_right_id===r.knowledge_source_usage_right_id)?.audit_binding_hash===rightsBindingHash(r)&&await this.evidence.verify(r)};
  const dependencies:[string|null,{edition?:string;preliminary:boolean}][]=[[null,{preliminary:false}],...packs.entries()];
  for(const [pack,context]of dependencies)for(const act of acts){if(!await permitsSourceUse({sourceId:source.knowledge_source_id,ownershipClass:source.ownership_class,sourceTenantId:source.tenant_id,audienceTenantId:audience,contentHash:hash,packVersionId:pack,act,environment:this.environment,now:time.rows[0]!.now,preliminary:context.preliminary,...(context.edition?{edition:context.edition}:{})},normalized,evidence))return false;}
  return true;
 }
}
