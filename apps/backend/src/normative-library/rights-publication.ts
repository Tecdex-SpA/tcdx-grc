import {sql,type Kysely,type Transaction} from 'kysely';
import type {FoundationDatabase} from '../database.js';
import type {VerifiedIdentity} from '../security/authentication.js';
import {resolveTenantActor} from '../core-grc/security.js';
import {resolvePlatformActor} from '../security/platform-authority.js';
import {persistAuditEvent} from '../persistence/foundation-records.js';
import {newUuidV7} from '../uuid.js';
import {hashCanonical} from '../regulatory/hash.js';
import {authorizeLibraryOperation,concealed,deny,invalid,type Ownership} from './authorization.js';
import {SOURCE_RIGHTS_CONTRACT,rightsBindingHash,rightsInstant,type RightsRecord,type RightsEvidence} from './rights.js';

type Tx=Transaction<FoundationDatabase>;
type Context={identity:VerifiedIdentity;tenantId?:string;correlationId:string;rationale:string};
type Source=Ownership&{knowledge_source_id:string};
/** Internal governed materialization only. No public route, upload API, automatic license or grant.
 * Caller supplies an exact immutable proof already in private custody. IDs come from UUIDv7
 * preparation, and the proof binds that ID before this transaction can accept it. */
async function authority(tx:Tx,c:Context,sourceId:string):Promise<Source>{
 await sql`SET LOCAL lock_timeout='5s'`.execute(tx);
 await sql`SET LOCAL statement_timeout='60s'`.execute(tx);
 if(c.identity.principalClass!=='HUMAN_INTERACTIVE'||c.identity.expiresAt<=new Date())deny();
 if(!c.rationale?.trim()||c.rationale.length>4096)invalid('rationale');
 const active=await sql`SELECT user_identity_id FROM iam.user_identities WHERE user_identity_id=${c.identity.principalId}::uuid AND lifecycle_state='active' FOR SHARE`.execute(tx);
 if(active.rows.length!==1)deny();
 const actor=c.tenantId?await resolveTenantActor(tx,c.identity,c.tenantId):await resolvePlatformActor(tx,c.identity);
 authorizeLibraryOperation(actor,c.tenantId?'knowledgeSourceCreate':'platformKnowledgeSourceCreate');
 const source=(await sql<Source>`SELECT knowledge_source_id,ownership_class,tenant_id FROM knowledge.knowledge_sources
  WHERE knowledge_source_id=${sourceId}::uuid AND tenant_id IS NOT DISTINCT FROM ${c.tenantId??null}::uuid FOR UPDATE`.execute(tx)).rows[0];
 if(!source)concealed();
 authorizeLibraryOperation(actor,c.tenantId?'knowledgeSourceCreate':'platformKnowledgeSourceCreate',source);
 return source;
}
async function audit(tx:Tx,c:Context,source:Source,record:RightsRecord,event:string,id:string){
 await persistAuditEvent(tx,{auditEventId:id,actor:{userIdentityId:c.identity.principalId},correlationId:c.correlationId,
  ownershipClass:source.ownership_class,tenantId:source.tenant_id,aggregateType:'KnowledgeSource',aggregateId:source.knowledge_source_id,
  eventCode:event,commandCode:event.endsWith('record.v1')?'knowledgeSourceRightsRecord':'knowledgeSourceRightsRevoke',outcome:'succeeded',classification:'restricted',
  after:{knowledge_source_usage_right_id:record.knowledge_source_usage_right_id,evidence_hash:record.evidence_hash,binding_hash:rightsBindingHash(record),
   knowledge_source_id:source.knowledge_source_id,regulatory_pack_version_id:record.regulatory_pack_version_id,rationale:c.rationale}});
}
const columns=sql.raw("r.*,to_char(r.effective_from AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') AS effective_from,to_char(r.effective_to AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') AS effective_to,r.revoked_at::text");
export async function recordSourceRights(db:Kysely<FoundationDatabase>,c:Context,record:RightsRecord,evidence:RightsEvidence){
 const expected=[...SOURCE_RIGHTS_CONTRACT.exact_scope,...SOURCE_RIGHTS_CONTRACT.evidence,'knowledge_source_usage_right_id','effective_from','effective_to','revoked_at'].sort();
 if(Object.keys(record).sort().join(',')!==expected.join(',')||record.revoked_at!==null
  ||!SOURCE_RIGHTS_CONTRACT.use_acts.includes(record.use_act)||!SOURCE_RIGHTS_CONTRACT.environments.includes(record.use_environment)
  ||!SOURCE_RIGHTS_CONTRACT.content_kinds.includes(record.content_kind)||!/^[a-f0-9]{64}$/.test(record.content_hash)
  ||!/^[a-f0-9]{64}$/.test(record.evidence_hash)||!record.edition_ref?.trim()
  ||![record.knowledge_source_usage_right_id,record.recorded_audit_event_id,record.knowledge_source_id].every(id=>/^[a-f0-9]{8}-[a-f0-9]{4}-7[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id))
  ||!Number.isFinite(Date.parse(record.effective_from))||!Number.isFinite(Date.parse(record.effective_to))||Date.parse(record.effective_from)>=Date.parse(record.effective_to))invalid();
 const normalized={...record,effective_from:rightsInstant(record.effective_from),effective_to:rightsInstant(record.effective_to)};
 return db.transaction().setIsolationLevel('read committed').execute(async tx=>{
  const source=await authority(tx,c,record.knowledge_source_id);
  if(source.ownership_class!==record.ownership_class||source.tenant_id!==record.tenant_id
   ||source.tenant_id!==null&&source.tenant_id!==record.audience_tenant_id)concealed();
  if(!await evidence.verify(normalized))deny();
  const existing=(await sql<RightsRecord>`SELECT ${columns} FROM knowledge.knowledge_source_usage_rights r WHERE knowledge_source_usage_right_id=${record.knowledge_source_usage_right_id}::uuid`.execute(tx)).rows;
  if(existing.length){
   const material=Object.fromEntries(Object.keys(normalized).map(k=>[k,(existing[0] as unknown as Record<string,unknown>)[k]]));
   if(hashCanonical(material)!==hashCanonical(normalized))deny();
   const audits=(await sql`SELECT audit_event_id FROM ops_audit.audit_events WHERE audit_event_id=${record.recorded_audit_event_id}::uuid
    AND aggregate_type='KnowledgeSource' AND aggregate_id=${source.knowledge_source_id}::uuid AND outcome='succeeded'
    AND event_code='audit.knowledge.knowledge_source.rights.record.v1' AND after_payload->>'binding_hash'=${rightsBindingHash(normalized)}
    AND after_payload->>'evidence_hash'=${record.evidence_hash}`.execute(tx)).rows;
   if(audits.length!==1)deny();return {replayed:true,right_id:record.knowledge_source_usage_right_id};
  }
  const overlaps=await sql`SELECT knowledge_source_usage_right_id FROM knowledge.knowledge_source_usage_rights WHERE knowledge_source_id=${record.knowledge_source_id}::uuid
   AND audience_tenant_id IS NOT DISTINCT FROM ${record.audience_tenant_id}::uuid AND content_hash=${record.content_hash}
   AND regulatory_pack_version_id IS NOT DISTINCT FROM ${record.regulatory_pack_version_id}::uuid AND use_act=${record.use_act} AND use_environment=${record.use_environment}
   AND effective_from<${record.effective_to}::timestamptz AND effective_to>${record.effective_from}::timestamptz
   AND (revoked_at IS NULL OR revoked_at>${record.effective_from}::timestamptz)`.execute(tx);
  if(overlaps.rows.length)deny();
  await audit(tx,c,source,normalized,'audit.knowledge.knowledge_source.rights.record.v1',record.recorded_audit_event_id);
  await sql`INSERT INTO knowledge.knowledge_source_usage_rights(knowledge_source_usage_right_id,created_by_user_identity_id,ownership_class,tenant_id,knowledge_source_id,audience_tenant_id,content_hash,edition_ref,regulatory_pack_version_id,use_act,use_environment,content_kind,effective_from,effective_to,evidence_ref,evidence_hash,recorded_audit_event_id)
   VALUES(${record.knowledge_source_usage_right_id}::uuid,${c.identity.principalId}::uuid,${source.ownership_class},${source.tenant_id}::uuid,${source.knowledge_source_id}::uuid,
    ${record.audience_tenant_id}::uuid,${record.content_hash},${record.edition_ref},${record.regulatory_pack_version_id}::uuid,${record.use_act},${record.use_environment},${record.content_kind},
    ${record.effective_from}::timestamptz,${record.effective_to}::timestamptz,${record.evidence_ref},${record.evidence_hash},${record.recorded_audit_event_id}::uuid)`.execute(tx);
  return {replayed:false,right_id:record.knowledge_source_usage_right_id};
 });
}
export async function revokeSourceRights(db:Kysely<FoundationDatabase>,c:Context,sourceId:string,rightId:string){
 return db.transaction().setIsolationLevel('read committed').execute(async tx=>{
  const source=await authority(tx,c,sourceId);
  const record=(await sql<RightsRecord>`SELECT ${columns} FROM knowledge.knowledge_source_usage_rights r WHERE knowledge_source_usage_right_id=${rightId}::uuid AND knowledge_source_id=${sourceId}::uuid FOR UPDATE`.execute(tx)).rows[0];
  if(!record)concealed();if(record.revoked_at)return {replayed:true,right_id:rightId};
  const id=newUuidV7();await audit(tx,c,source,record,'audit.knowledge.knowledge_source.rights.revoke.v1',id);
  await sql`UPDATE knowledge.knowledge_source_usage_rights SET revoked_at=transaction_timestamp(),revoked_audit_event_id=${id}::uuid WHERE knowledge_source_usage_right_id=${rightId}::uuid AND revoked_at IS NULL`.execute(tx);
  return {replayed:false,right_id:rightId};
 });
}
