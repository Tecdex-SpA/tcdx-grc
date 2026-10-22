import {sql,CompiledQuery,type Kysely,type Transaction} from 'kysely';
import {NORMATIVE_LIBRARY,validateLibrarySchema,type KnowledgeWrite,type KnowledgeLink} from '@tcdx-grc/contracts/normative-library';
import type {FoundationDatabase} from '../database.js';
import type {VerifiedIdentity} from '../security/authentication.js';
import {resolvePlatformActor,type PlatformActor} from '../security/platform-authority.js';
import {resolveTenantActor} from '../core-grc/security.js';
import type {CoreActor} from '../core-grc/model.js';
import {hashCanonical} from '../regulatory/hash.js';
import {FoundationError} from '../errors.js';
import {authorizeLibraryOperation,concealed,invalid,invariant,type Ownership} from './authorization.js';
import {knowledgeVersionEtag} from './knowledge.js';
import type {KnowledgeCustody} from './custody.js';
import type {CursorPort} from './matrices.js';

type Row=Record<string,unknown>;type Actor=CoreActor|PlatformActor;type Tx=Transaction<FoundationDatabase>;
export interface KnowledgeReadPolicy {
 visibleCatalog(tx:Tx,actor:Actor,kind:'source'|'item',row:Row):Promise<boolean>;
 visibleVersion(tx:Tx,actor:Actor,row:Row,links:readonly KnowledgeLink[]):Promise<boolean>;
 bodyAllowed(tx:Tx,actor:Actor,row:Row):Promise<boolean>;
 assertTargetFilter(tx:Tx,actor:Actor,field:string,id:string):Promise<void>;
}
const catalog={source:{table:'knowledge.knowledge_sources',id:'knowledge_source_id',sort:'source_code',projection:['knowledge_source_id','ownership_class','tenant_id','source_code','name','source_kind','official_uri','license_classification','lifecycle_state']},item:{table:'knowledge.knowledge_items',id:'knowledge_item_id',sort:'knowledge_code',projection:['knowledge_item_id','knowledge_source_id','knowledge_code','title','ownership_class','tenant_id','lifecycle_state']}} as const;
function project(row:Row,fields:readonly string[]):Row{return Object.fromEntries(fields.map(k=>[k,row[k]??null]));}
function iso(v:unknown):string|null{return v==null?null:new Date(String(v)).toISOString();}
function conflict():never{throw new FoundationError('TCDX.CONFLICT.CONCURRENCY','Knowledge cursor context changed',409);}
/** Real prepared metadata/content readers; effective grants, exact source rights and targets remain required ports. */
export async function readKnowledge(database:Kysely<FoundationDatabase>,custody:KnowledgeCustody,policy:KnowledgeReadPolicy,signer:CursorPort,input:{identity:VerifiedIdentity;tenantId?:string;kind:'source'|'item'|'version';id?:string;query:Record<string,unknown>;correlationId:string}){
 const platform=input.tenantId===undefined,list=input.id===undefined;
 const operationId=(platform?'platformKnowledge':'knowledge')+({source:'Source',item:'Item',version:'Version'}[input.kind])+(list?'List':'Get');
 const op=NORMATIVE_LIBRARY.registry.new_operations.find(o=>o.operation_id===operationId);if(!op||!op.response_schema)invalid('operation_id');
 const schema=op.response_schema;
 const allowed=list?new Set(['cursor','page_size','query',...(input.kind==='item'?['knowledge_source_id']:input.kind==='version'?['knowledge_item_id','normative_unit_id','requirement_id','control_version_id','subject_id','context_role']:[])]):new Set<string>();
 for(const [key,value]of Object.entries(input.query))if(!allowed.has(key)||typeof value!=='string'&&key!=='page_size')invalid(key);
 const targetFields=['normative_unit_id','requirement_id','control_version_id','subject_id'].filter(f=>input.query[f]!==undefined);if(targetFields.length>1)invalid('target');
 if(input.query.context_role!==undefined&&!['comprender','implementar','demostrar','contexto_empresarial'].includes(String(input.query.context_role)))invalid('context_role');
 for(const [key,value]of Object.entries(input.query))if(key.endsWith('_id')&&(!/^[a-f0-9]{8}-[a-f0-9]{4}-7[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(String(value))))invalid(key);
 if(input.id&&!/^[a-f0-9]{8}-[a-f0-9]{4}-7[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(input.id))invalid('id');
 const size=input.query.page_size===undefined?50:Number(input.query.page_size);if(!Number.isInteger(size)||size<1||size>200)invalid('page_size');
 if(input.query.query!==undefined&&(!String(input.query.query).trim()||[...String(input.query.query)].length>256))invalid('query');
 return database.transaction().setIsolationLevel('repeatable read').execute(async tx=>{
  await sql`SET TRANSACTION READ ONLY`.execute(tx);
  const actor:Actor=platform?await resolvePlatformActor(tx,input.identity):await resolveTenantActor(tx,input.identity,input.tenantId);
  const access=authorizeLibraryOperation(actor,operationId);const tenant='identity' in actor?null:actor.tenantId;
  for(const [field,id]of Object.entries(input.query))if(field.endsWith('_id'))await policy.assertTargetFilter(tx,actor,field,String(id));
  let rows:Row[]=[];let keys:string[]=[];let etag:string|undefined;
  if(input.kind!=='version'){
   const d=catalog[input.kind],params:unknown[]=[tenant];let where='(tenant_id IS NOT DISTINCT FROM $1::uuid OR ($1::uuid IS NOT NULL AND tenant_id IS NULL))';
   if(input.id){params.push(input.id);where+=` AND ${d.id}=$${params.length}::uuid`;}
   if(input.query.knowledge_source_id){params.push(input.query.knowledge_source_id);where+=` AND knowledge_source_id=$${params.length}::uuid`;}
   if(input.query.query){params.push('%'+String(input.query.query)+'%');where+=` AND (${d.sort} ILIKE $${params.length} OR ${input.kind==='source'?'name':'title'} ILIKE $${params.length})`;}
   const result=await tx.executeQuery<Row>(CompiledQuery.raw(`SELECT ${d.projection.join(',')} FROM ${d.table} WHERE ${where} ORDER BY ${d.sort} COLLATE "C",${d.id}`,params));
   for(const row of result.rows)if(await policy.visibleCatalog(tx,actor,input.kind,row)){authorizeLibraryOperation(actor,operationId,row as Ownership);rows.push(project(row,d.projection));keys.push(String(row[d.sort])+'\u0000'+String(row[d.id]));}
  }else{
   const params:unknown[]=[tenant];let where='(v.tenant_id IS NOT DISTINCT FROM $1::uuid OR ($1::uuid IS NOT NULL AND v.tenant_id IS NULL))';
   if(input.id){params.push(input.id);where+=` AND v.knowledge_version_id=$${params.length}::uuid`;}
   if(input.query.knowledge_item_id){params.push(input.query.knowledge_item_id);where+=` AND v.knowledge_item_id=$${params.length}::uuid`;}
   const linkConditions:string[]=[];
   for(const field of targetFields){params.push(input.query[field]);linkConditions.push(`l.${field}=$${params.length}::uuid`);}
   if(input.query.context_role){params.push(input.query.context_role);linkConditions.push(`l.context_role=$${params.length}`);}
   if(linkConditions.length)where+=` AND EXISTS(SELECT 1 FROM knowledge.knowledge_version_context_links l WHERE l.knowledge_version_id=v.knowledge_version_id AND ${linkConditions.join(' AND ')})`;
   if(input.query.query){params.push('%'+String(input.query.query)+'%');where+=` AND (i.knowledge_code ILIKE $${params.length} OR i.title ILIKE $${params.length})`;}
   const result=await tx.executeQuery<Row>(CompiledQuery.raw(`SELECT v.*,v.version_number::text,i.knowledge_code FROM knowledge.knowledge_versions v JOIN knowledge.knowledge_items i ON i.knowledge_item_id=v.knowledge_item_id AND i.ownership_class=v.ownership_class AND i.tenant_id IS NOT DISTINCT FROM v.tenant_id WHERE ${where} ORDER BY i.knowledge_code COLLATE "C",v.knowledge_version_id`,params));
   for(const row of result.rows){
    const links=await sql<Row>`SELECT normative_unit_id,requirement_id,control_version_id,subject_id,context_role,source_locator,provenance_ref,excerpt_hash FROM knowledge.knowledge_version_context_links WHERE knowledge_version_id=${String(row.knowledge_version_id)}::uuid AND tenant_id IS NOT DISTINCT FROM ${row.tenant_id as string|null}::uuid ORDER BY knowledge_version_context_link_id`.execute(tx);
    const mapped=links.rows.map(l=>{const fields=['normative_unit_id','requirement_id','control_version_id','subject_id'].filter(k=>l[k]!=null);if(fields.length!==1)invariant('Invalid persisted Knowledge target');return {target:{[fields[0]!]:l[fields[0]!]},context_role:l.context_role,source_locator:l.source_locator,provenance_ref:l.provenance_ref,...(l.excerpt_hash?{excerpt_hash:l.excerpt_hash}:{})} as KnowledgeLink;});
    if(!await policy.visibleVersion(tx,actor,row,mapped))continue;authorizeLibraryOperation(actor,operationId,row as Ownership);
    const bodyAllowed=access==='body_available'&&await policy.bodyAllowed(tx,actor,row);
    let artifact:Omit<KnowledgeWrite,'rationale'>|null=null;
    if(bodyAllowed){artifact=await custody.read(String(row.knowledge_version_id),String(row.content_ref),String(row.content_hash));if(hashCanonical(artifact.links.map(hashCanonical).sort())!==hashCanonical(mapped.map(hashCanonical).sort()))invariant('Persisted link set differs from immutable artifact');}
    const projection={knowledge_version_id:row.knowledge_version_id,knowledge_item_id:row.knowledge_item_id,version_number:String(row.version_number),content_hash:row.content_hash,content_language:row.content_language,lifecycle_state:row.lifecycle_state,effective_from:iso(row.effective_from),effective_to:iso(row.effective_to),published_at:iso(row.published_at),superseded_by_id:row.superseded_by_id??null,links:artifact?.links??[],content:artifact?.content??null,content_access:bodyAllowed?'body_available':'metadata_only',content_restriction:bodyAllowed?null:'Acceso limitado a metadatos; no se reproduce contenido protegido.',publication_authority:mapped.some(l=>l.context_role==='contexto_empresarial')?'tenant_context':'editorial'};
    rows.push(projection);keys.push(String(row.knowledge_code)+'\u0000'+String(row.knowledge_version_id));
    if(input.id){const audits=await sql<{audit_event_id:string}>`SELECT audit_event_id FROM ops_audit.audit_events WHERE aggregate_type='KnowledgeVersion' AND aggregate_id=${input.id}::uuid AND tenant_id IS NOT DISTINCT FROM ${row.tenant_id as string|null}::uuid AND outcome='succeeded' AND event_code LIKE 'audit.knowledge.knowledge_version.%' ORDER BY audit_event_id`.execute(tx);etag=knowledgeVersionEtag(row,mapped,audits.rows.map(a=>a.audit_event_id));}
   }
  }
  if(!list){if(rows.length!==1)concealed();const response={operation_id:operationId,status:'completed',correlation_id:input.correlationId,resource_id:input.id,result:rows[0]};if(!validateLibrarySchema(schema,response).valid)invariant('Invalid Knowledge projection');return {response,...(etag?{etag}:{})};}
  const binding=hashCanonical({operationId,actor:input.identity.principalId,tenant,permissions:[...actor.permissions].sort(),roles:actor.roles,query:{...input.query,cursor:undefined},visible:rows});let after='';
  if(input.query.cursor){try{const cursor=JSON.parse(await signer.verifyReferenceCursor(String(input.query.cursor))) as {binding:string;after:string};if(cursor.binding!==binding||typeof cursor.after!=='string')conflict();after=cursor.after;}catch(error){if(error instanceof FoundationError)throw error;invalid('cursor');}}
  const selected=rows.map((row,i)=>({row,key:keys[i]!})).filter(r=>r.key>after);const page=selected.slice(0,size);
  const response={items:page.map(r=>r.row),next_cursor:selected.length>size?await signer.signReferenceCursor(JSON.stringify({binding,after:page.at(-1)!.key})):null};if(!validateLibrarySchema(schema,response).valid)invariant('Invalid Knowledge page');return {response};
 });
}
