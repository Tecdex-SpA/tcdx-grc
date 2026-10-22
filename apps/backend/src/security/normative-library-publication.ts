import {readFile} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {sql,type Transaction} from 'kysely';
import {NORMATIVE_LIBRARY as contract} from '@tcdx-grc/contracts/normative-library';
import type {FoundationDatabase} from '../database.js';
import {FoundationError} from '../errors.js';
import {newUuidV7} from '../uuid.js';
import {hashCanonical} from '../regulatory/hash.js';
import {persistAuditEvent} from '../persistence/foundation-records.js';
import {controlSchemaReference,validateControlRule} from '../configuration/control-adjustment-policy.js';
import {matchesLibraryRegistry,type RuntimeLibraryEdge} from '../normative-library/lifecycle.js';

const fail=():never=>{throw new FoundationError('TCDX.CONFLICT.RESOURCE','Normative library publication conflicts with canonical authority',409);};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-7[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
export type LibraryPublicationInput={tenantIds:string[];effectiveFrom:string;effectiveTo:string};
type Migration={id:string;filename:string;sha256:string};
export type LibraryPublication=Readonly<LibraryPublicationInput&{manifestSha256:string;migrations:Migration[]}>;
const loaded=new WeakMap<LibraryPublication,string>();
const globalPredecessor=new WeakMap<LibraryPublication,string>();

/** Offline preparation only. Catalogs and successor receipts remain the sole product authority.
 * Tenant selection and validity are operational inputs, never tenant/date-specific code. */
export async function prepareLibraryPublication(root:string,input:LibraryPublicationInput):Promise<LibraryPublication>{
 if(Object.keys(input).sort().join(',')!=='effectiveFrom,effectiveTo,tenantIds'||!Array.isArray(input.tenantIds)
  ||input.tenantIds.some(t=>!uuid.test(t))||new Set(input.tenantIds).size!==input.tenantIds.length
  ||!Number.isFinite(Date.parse(input.effectiveFrom))||!Number.isFinite(Date.parse(input.effectiveTo))
  ||Date.parse(input.effectiveFrom)>=Date.parse(input.effectiveTo))fail();
 const exact=async(path:string,expected:string)=>{const absolute=resolve(root,path);if(!absolute.startsWith(resolve(root)+sep))fail();const b=await readFile(absolute);if(sha(b)!==expected)fail();return b;};
 for(const [path,expected]of Object.entries(contract.sources))await exact(path,expected);
 const manifestBytes=await readFile(resolve(root,'database/migrations/manifest.json'));
 const correction=contract.configurationDefaultCorrection;
 const predecessor=JSON.parse((await exact(correction.predecessor_manifest.path,correction.predecessor_manifest.sha256)).toString());
 if(predecessor.migrations.length!==35||manifestBytes.toString()!==JSON.stringify({...predecessor,migrations:[...predecessor.migrations,correction.migration]},null,2)+'\n')fail();
 const migrations=(JSON.parse(manifestBytes.toString()).migrations as Migration[]);
 if(migrations.length!==36||migrations[34]?.sha256!=='9279159e88c60fff03f998e33008fb0d675f53e4423df638c9e54f709a773798')fail();
 for(const m of migrations)await exact('database/migrations/'+m.filename,m.sha256);
 const p:LibraryPublication={tenantIds:[...input.tenantIds].sort(),effectiveFrom:new Date(input.effectiveFrom).toISOString(),effectiveTo:new Date(input.effectiveTo).toISOString(),migrations,
  manifestSha256:hashCanonical({sources:contract.sources,migrations_sha256:sha(manifestBytes),...input,tenantIds:[...input.tenantIds].sort()})};
 loaded.set(p,hashCanonical(p));
 globalPredecessor.set(p,hashCanonical({sources:contract.sources,migrations_sha256:sha(manifestBytes),...input,tenantIds:[]}));
 return p;
}

/** Reuses the authenticated IAM publisher's transaction. No startup seed or public registration API.
 * All reads/writes are canonical; conflicts are rejected rather than repaired or overwritten. */
export async function publishLibraryOperationalData(tx:Transaction<FoundationDatabase>,principal:string,correlationId:string,p:LibraryPublication){
 if(!loaded.has(p)||loaded.get(p)!==hashCanonical(p))fail();
 await sql`SET LOCAL lock_timeout='5s'`.execute(tx);
 await sql`SET LOCAL statement_timeout='60s'`.execute(tx);
 await sql`LOCK TABLE iam.roles,iam.permissions,iam.role_permissions,config.configuration_definitions,
  config.configuration_definition_scopes,config.configuration_validation_rules,ops_audit.lifecycle_transition_definitions,
  ops_audit.lifecycle_transition_scopes,ops_audit.lifecycle_transition_side_effects IN SHARE ROW EXCLUSIVE MODE`.execute(tx);
 const actor=await sql`SELECT service_principal_id FROM iam.service_principals WHERE service_principal_id=${principal}::uuid
  AND ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL AND lifecycle_state='active' FOR SHARE`.execute(tx);
 if(actor.rows.length!==1)fail();
 const ledger=(await sql<{migration_id:string;filename:string;content_sha256:string;outcome:string}>`SELECT migration_id,filename,content_sha256,outcome FROM platform.schema_migrations ORDER BY migration_id`.execute(tx)).rows;
 if(hashCanonical(ledger)!==hashCanonical(p.migrations.map(m=>({migration_id:m.id,filename:m.filename,content_sha256:m.sha256,outcome:'applied'}))))fail();
 let created=0,audited=0;
 async function audit(type:string,id:string,event:string,tenantId:string|null,material:Record<string,unknown>){
  const after={...material,publication_manifest_sha256:p.manifestSha256};
  // A later explicitly selected tenant may consume the exact global-only
  // predecessor from these same sources and validity. Its immutable audit is
  // retained, not rewritten or duplicated. No other manifest drift is accepted.
  const predecessor={...after,publication_manifest_sha256:globalPredecessor.get(p)};
  const existing=(await sql<{valid:boolean}>`SELECT ((after_payload=${JSON.stringify(after)}::jsonb
   OR (${tenantId===null} AND after_payload=${JSON.stringify(predecessor)}::jsonb)) AND outcome='success'
   AND ownership_class=${tenantId?'TENANT_OWNED':'PLATFORM_CONTROL'} AND tenant_id IS NOT DISTINCT FROM ${tenantId}::uuid
   AND actor_service_principal_id=${principal}::uuid AND actor_user_identity_id IS NULL) AS valid
   FROM ops_audit.audit_events WHERE aggregate_type=${type} AND aggregate_id=${id}::uuid
   AND event_code=${event} AND command_code='normativeLibraryOperationalPublication'`.execute(tx)).rows;
  if(existing.length){if(existing.length!==1||!existing[0]!.valid)fail();return;}
  await persistAuditEvent(tx,{auditEventId:newUuidV7(),actor:{servicePrincipalId:principal},correlationId,ownershipClass:tenantId?'TENANT_OWNED':'PLATFORM_CONTROL',tenantId,
   aggregateType:type,aggregateId:id,eventCode:event,commandCode:'normativeLibraryOperationalPublication',outcome:'success',classification:'restricted',before:{present:false},after});audited++;
 }
 const permissions=new Map<string,string>();
 const limited=contract.permissions.existing_permission_limited_grant;
 const codes=[...new Set([...contract.permissions.catalogue_delta.map(c=>c.code),limited.code,...contract.lifecycle.bindings.map(b=>b.permission_code)])];
 for(const code of codes){
  const [domain,resource,action]=code.split('.');
  const existing=(await sql<{id:string;valid:boolean}>`SELECT permission_id::text AS id,(domain_code=${domain} AND resource_code=${resource} AND action_code=${action} AND lifecycle_state='published') AS valid FROM iam.permissions WHERE permission_code=${code}`.execute(tx)).rows;
  if(existing.length>1||existing[0]?.valid===false)fail();
  if(!existing.length&&!contract.permissions.catalogue_delta.some(c=>c.code===code))fail();
  const id=existing[0]?.id??newUuidV7();
  if(!existing.length){await sql`INSERT INTO iam.permissions(permission_id,created_by_service_principal_id,permission_code,domain_code,resource_code,action_code,lifecycle_state)
   VALUES(${id}::uuid,${principal}::uuid,${code},${domain},${resource},${action},'published')`.execute(tx);created++;}
  permissions.set(code,id);
  if(contract.permissions.catalogue_delta.some(c=>c.code===code))await audit('Permission',id,'audit.iam.permission.publish.v1',null,{permission_code:code,present:true});
 }
 const grants=[...contract.permissions.catalogue_delta.flatMap(c=>c.contract_grants.map(g=>({code:c.code,...g}))),{code:limited.code,role:limited.contract_role,scope:limited.scope,policy:limited.policy}];
 // Global baseline templates are also used by the existing tenant-onboarding materializer.
 for(const tenantId of [null,...p.tenantIds]){
  if(tenantId){const tenants=await sql`SELECT tenant_id FROM platform.tenants WHERE tenant_id=${tenantId}::uuid AND lifecycle_state='active' FOR SHARE`.execute(tx);if(tenants.rows.length!==1)fail();}
  for(const g of grants.filter(g=>tenantId===null||g.scope==='tenant')){
   const roles=(await sql<{id:string}>`SELECT role_id::text AS id FROM iam.roles WHERE role_code=${g.role} AND is_baseline AND lifecycle_state='published'
    AND tenant_id IS NOT DISTINCT FROM ${tenantId}::uuid AND ownership_class=${tenantId?'TENANT_OWNED':'PLATFORM_CONTROL'}`.execute(tx)).rows;
   if(roles.length!==1)fail();const role=roles[0]!.id,permission=permissions.get(g.code)!;
   const existing=(await sql<{id:string;valid:boolean}>`SELECT role_permission_id::text AS id,(tenant_id IS NOT DISTINCT FROM ${tenantId}::uuid AND ownership_class=${tenantId?'TENANT_OWNED':'PLATFORM_CONTROL'}) AS valid
    FROM iam.role_permissions WHERE role_id=${role}::uuid AND permission_id=${permission}::uuid`.execute(tx)).rows;
   if(existing.length>1||existing[0]?.valid===false)fail();const id=existing[0]?.id??newUuidV7();
   if(!existing.length){await sql`INSERT INTO iam.role_permissions(role_permission_id,created_by_service_principal_id,ownership_class,tenant_id,role_id,permission_id)
    VALUES(${id}::uuid,${principal}::uuid,${tenantId?'TENANT_OWNED':'PLATFORM_CONTROL'},${tenantId}::uuid,${role}::uuid,${permission}::uuid)`.execute(tx);created++;}
   await audit('RolePermission',id,'audit.iam.role_permission.publish.v1',tenantId,{permission_code:g.code,role_id:role,scope:g.scope,object_policy:g.policy,present:true});
  }
 }
 for(const b of contract.lifecycle.bindings){
  const rows=(await sql<{id:string;version_number:string;permission_id:string;lifecycle_state:string}&RuntimeLibraryEdge>`SELECT d.*,d.lifecycle_transition_definition_id::text AS id,d.version_number::text,
   s.scope_kind,ARRAY(SELECT e.event_code FROM ops_audit.lifecycle_transition_side_effects e WHERE e.lifecycle_transition_definition_id=d.lifecycle_transition_definition_id ORDER BY e.ordinal) AS side_effect_event_codes,
   NOT EXISTS(SELECT 1 FROM ops_audit.lifecycle_transition_side_effects e WHERE e.lifecycle_transition_definition_id=d.lifecycle_transition_definition_id
    AND (NOT e.is_required OR e.ordinal IS DISTINCT FROM array_position(${[...b.side_effect_event_codes]}::text[],e.event_code))) AS all_effects_required
   FROM ops_audit.lifecycle_transition_definitions d LEFT JOIN ops_audit.lifecycle_transition_scopes s USING(lifecycle_transition_definition_id)
   WHERE d.entity_type=${b.entity_type} AND d.from_state=${b.from_state} AND d.command_code=${b.command_code} ORDER BY d.version_number DESC`.execute(tx)).rows;
  const current=rows.filter(r=>r.version_number===rows[0]?.version_number);
  const permission=permissions.get(b.permission_code)!;
  if(current.length&&(!matchesLibraryRegistry(b,current)||current.some(r=>r.permission_id!==permission||r.lifecycle_state!=='published')))fail();
  const id=current[0]?.id??newUuidV7();
  if(!current.length){
   await sql`INSERT INTO ops_audit.lifecycle_transition_definitions(lifecycle_transition_definition_id,created_by_service_principal_id,entity_type,version_number,from_state,command_code,to_state,precondition_policy_ref,permission_id,sod_policy_ref,audit_event_code,notification_policy_ref,recalculation_policy_ref,idempotency_semantics,concurrency_semantics,system_actor_allowed,lifecycle_state,published_at)
    VALUES(${id}::uuid,${principal}::uuid,${b.entity_type},1,${b.from_state},${b.command_code},${b.to_state},${b.precondition_policy_ref},${permission}::uuid,${b.sod_policy_ref},${b.audit_event_code},${b.notification_policy},${b.recalculation_policy},${b.idempotency_semantics},${b.concurrency_semantics},FALSE,'published',transaction_timestamp())`.execute(tx);
   for(const scope of b.allowed_scopes)await sql`INSERT INTO ops_audit.lifecycle_transition_scopes(lifecycle_transition_scope_id,created_by_service_principal_id,lifecycle_transition_definition_id,scope_kind) VALUES(${newUuidV7()}::uuid,${principal}::uuid,${id}::uuid,${scope})`.execute(tx);
   for(const [i,event]of b.side_effect_event_codes.entries())await sql`INSERT INTO ops_audit.lifecycle_transition_side_effects(lifecycle_transition_side_effect_id,created_by_service_principal_id,lifecycle_transition_definition_id,event_code,ordinal,is_required) VALUES(${newUuidV7()}::uuid,${principal}::uuid,${id}::uuid,${event},${i+1},TRUE)`.execute(tx);
   created++;
  }
  await audit('LifecycleTransitionDefinition',id,'audit.platform.lifecycle_transition.publish.v1',null,{binding:b,runtime_registry_version:current[0]?.version_number??'1',present:true});
 }
 for(const d of contract.definitions.definitions){
  const rows=(await sql<Record<string,unknown>&{configuration_definition_id:string;effective_from:Date;effective_to:Date;published_at:Date|null}>`SELECT * FROM config.configuration_definitions WHERE configuration_code=${d.configuration_code} ORDER BY version_number`.execute(tx)).rows;
  if(rows.length>1||rows[0]&&['configuration_code','version_number','value_type','owner_domain','ownership_class','tenant_overridable','object_overridable'].some(k=>String(rows[0]![k])!==String(d[k as keyof typeof d])))fail();
  const current=rows[0],id=current?.configuration_definition_id??newUuidV7();
  if(current&&(current.tenant_id!==null||current.lifecycle_state!=='published'||!current.published_at||current.effective_from.toISOString()!==p.effectiveFrom||current.effective_to.toISOString()!==p.effectiveTo||Object.entries(current).some(([k,v])=>k.startsWith('default_')&&v!==null)))fail();
  const definition={...d,configuration_definition_id:id,lifecycle_state:'published'};
  if(!current){
   await sql`INSERT INTO config.configuration_definitions(configuration_definition_id,created_by_service_principal_id,ownership_class,configuration_code,version_number,value_type,tenant_overridable,object_overridable,owner_domain,lifecycle_state,effective_from,effective_to,published_at)
    VALUES(${id}::uuid,${principal}::uuid,'PLATFORM_CONTROL',${d.configuration_code},${d.version_number},${d.value_type},TRUE,TRUE,${d.owner_domain},'published',${p.effectiveFrom}::timestamptz,${p.effectiveTo}::timestamptz,transaction_timestamp())`.execute(tx);
   await sql`INSERT INTO config.configuration_definition_scopes(configuration_definition_scope_id,created_by_service_principal_id,ownership_class,configuration_definition_id,scope_level) VALUES(${newUuidV7()}::uuid,${principal}::uuid,'PLATFORM_CONTROL',${id}::uuid,'control_version')`.execute(tx);
   await sql`INSERT INTO config.configuration_validation_rules(configuration_validation_rule_id,created_by_service_principal_id,ownership_class,configuration_definition_id,rule_ordinal,operator,error_code,operand_text_value)
    VALUES(${newUuidV7()}::uuid,${principal}::uuid,'PLATFORM_CONTROL',${id}::uuid,1,'contract_schema','TCDX.VALIDATION.FAILED',${controlSchemaReference(definition)})`.execute(tx);created++;
  }
  const scopes=(await sql<{scope_level:string;ownership_class:string;tenant_id:string|null}>`SELECT * FROM config.configuration_definition_scopes WHERE configuration_definition_id=${id}::uuid`.execute(tx)).rows;
  if(scopes.length!==1||scopes[0]?.scope_level!=='control_version'||scopes[0].ownership_class!=='PLATFORM_CONTROL'||scopes[0].tenant_id!==null)fail();
  validateControlRule(definition,(await sql<Record<string,unknown>>`SELECT * FROM config.configuration_validation_rules WHERE configuration_definition_id=${id}::uuid ORDER BY rule_ordinal`.execute(tx)).rows);
  await audit('ConfigurationDefinition',id,'audit.configuration.configuration_definition.publish.v1',null,{descriptor:d,effective_from:p.effectiveFrom,effective_to:p.effectiveTo,present:true});
 }
 return {permissions:8,bindings:13,definitions:4,created,audited,publication_manifest_sha256:p.manifestSha256};
}

/** Exact derived preparation, without manufactured defaults or physical IDs.
 * The general forward-only optional-default correction supplies physical integrity. */
export function prepareLibraryDefinitions(){
 return contract.definitions.definitions.map(d=>({descriptor:d,scope:{ownership_class:'PLATFORM_CONTROL',tenant_id:null,scope_level:'control_version'},
  validation_rule:{rule_ordinal:1,operator:'contract_schema',error_code:'TCDX.VALIDATION.FAILED',operand_text_value:controlSchemaReference({...d,configuration_definition_id:'',lifecycle_state:'published'})}}));
}
