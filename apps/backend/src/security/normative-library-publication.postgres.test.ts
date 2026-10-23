import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {Kysely,PostgresDialect,sql,type Transaction} from 'kysely';
import pg from 'pg';
import {NORMATIVE_LIBRARY as c} from '@tcdx-grc/contracts/normative-library';
import type {FoundationDatabase} from '../database.js';
import {newUuidV7} from '../uuid.js';
import type {VerifiedIdentity} from './authentication.js';
import {prepareLibraryPublication,prepareLibraryDefinitions,publishLibraryOperationalData,type LibraryPublication} from './normative-library-publication.js';
import {resolveTenantActor} from '../core-grc/security.js';
import {resolvePlatformActor} from './platform-authority.js';
import {authorizeLibraryOperation} from '../normative-library/authorization.js';
import {matchesLibraryRegistry,type RuntimeLibraryEdge} from '../normative-library/lifecycle.js';
import {readControlDefinitionReferences} from '../configuration/control-definition-references.js';
import {mutateControlAdjustment} from '../configuration/control-adjustment-service.js';
import {CanonicalControlAdjustmentPolicy} from '../configuration/control-adjustment-policy.js';
import {controlOverrideEtag,resolveControlAdjustment,type ControlDefinition,type ControlVersionFacts} from '../configuration/control-adjustments.js';
import {permitsSourceUse,type RightsRecord,type RightsRequest} from '../normative-library/rights.js';
import {recordSourceRights,revokeSourceRights} from '../normative-library/rights-publication.js';
import {generateKeyPairSync} from 'node:crypto';
import {ApplicationTokenService} from './application-token.js';
import {buildApp} from '../app.js';
import {composeNormativeLibrary} from '../normative-library/composition.js';
import {registerNormativeLibraryRoutes} from '../normative-library/routes.js';

describe.skipIf(process.env.TCDX_LIBRARY_OPERATIONAL_INTEGRATION!=='true')('B01–B09 operational preparation on task-owned PG16',()=>{
 let db:Kysely<FoundationDatabase>,p:LibraryPublication;
 const tenants=[newUuidV7(),newUuidV7()],principal=newUuidV7(),control=newUuidV7(),source=newUuidV7();
 const users={author:newUuidV7(),reviewer:newUuidV7(),viewer:newUuidV7(),platform:newUuidV7(),support:newUuidV7()};
 const identity=(id:string):VerifiedIdentity=>({principalClass:'HUMAN_INTERACTIVE',principalId:id,tokenId:newUuidV7(),expiresAt:new Date(Date.now()+3600000)});
 const from=new Date(Date.now()-3600000).toISOString(),to=new Date(Date.now()+86400000*30).toISOString();
 const publish=()=>db.transaction().setIsolationLevel('read committed').execute(tx=>publishLibraryOperationalData(tx,principal,newUuidV7(),p));
 const count=async()=>{const r=await sql<{n:number}>`SELECT count(*)::int AS n FROM ops_audit.audit_events`.execute(db);return r.rows[0]!.n;};
 const rollback=async(fn:(tx:Transaction<FoundationDatabase>)=>Promise<void>)=>{const marker=Error('ROLLBACK_LOCAL_CASE');await expect(db.transaction().execute(async tx=>{await fn(tx);throw marker;})).rejects.toBe(marker);};
 beforeAll(async()=>{
  if(process.env.DATABASE_HOST!=='127.0.0.1'||process.env.DATABASE_PORT!=='55549'||process.env.TCDX_ISOLATED_REBUILD!=='true'||!process.env.TCDX_LIBRARY_TEST_CLUSTER?.startsWith('/private/tmp/tcdx-library-operational.'))throw Error('TASK_OWNED_CLUSTER_REQUIRED');
  db=new Kysely<FoundationDatabase>({dialect:new PostgresDialect({pool:new pg.Pool({host:'127.0.0.1',port:55549,database:'tcdx-grc',user:process.env.DATABASE_USER,ssl:false})})});
  const own=(await sql<{data_directory:string;major:number}>`SELECT current_setting('data_directory') AS data_directory,current_setting('server_version_num')::int/10000 AS major`.execute(db)).rows[0]!;
  expect(own).toEqual({data_directory:process.env.TCDX_LIBRARY_TEST_CLUSTER,major:16});
  p=await prepareLibraryPublication(process.cwd(),{tenantIds:tenants,effectiveFrom:from,effectiveTo:to});
  await sql`INSERT INTO iam.service_principals(service_principal_id,ownership_class,principal_code,display_name,principal_kind,lifecycle_state) VALUES(${principal}::uuid,'PLATFORM_CONTROL',${principal},'Synthetic publisher','integration','active')`.execute(db);
  for(const tenant of tenants){
   await sql`INSERT INTO platform.tenants(tenant_id,tenant_code,legal_name,display_name,default_timezone,lifecycle_state) VALUES(${tenant}::uuid,${tenant},'Synthetic only','Synthetic only','America/Santiago','active')`.execute(db);
   const roles=(await sql<{role_code:string}>`SELECT role_code FROM iam.roles WHERE tenant_id IS NULL AND is_baseline AND lifecycle_state='published'`.execute(db)).rows;
   for(const r of roles){const id=newUuidV7();await sql`INSERT INTO iam.roles(role_id,ownership_class,tenant_id,role_code,name,is_baseline,lifecycle_state) VALUES(${id}::uuid,'TENANT_OWNED',${tenant}::uuid,${r.role_code},${r.role_code},TRUE,'published')`.execute(db);
    const perms=(await sql<{permission_id:string}>`SELECT rp.permission_id FROM iam.role_permissions rp JOIN iam.roles r USING(role_id) WHERE r.role_code=${r.role_code} AND r.tenant_id IS NULL`.execute(db)).rows;
    for(const perm of perms)await sql`INSERT INTO iam.role_permissions(role_permission_id,ownership_class,tenant_id,role_id,permission_id) VALUES(${newUuidV7()}::uuid,'TENANT_OWNED',${tenant}::uuid,${id}::uuid,${perm.permission_id}::uuid)`.execute(db);
   }
  }
  for(const id of Object.values(users))await sql`INSERT INTO iam.user_identities(user_identity_id,identity_key,display_name,lifecycle_state) VALUES(${id}::uuid,${id},'Synthetic identity','active')`.execute(db);
  for(const [user,role]of [[users.author,'TENANT_ADMIN'],[users.reviewer,'GRC_MANAGER'],[users.viewer,'VIEWER']]){const membership=newUuidV7();await sql`INSERT INTO iam.tenant_memberships(tenant_membership_id,tenant_id,user_identity_id,membership_state,joined_at) VALUES(${membership}::uuid,${tenants[0]!}::uuid,${user!}::uuid,'active',transaction_timestamp())`.execute(db);
   await sql`INSERT INTO iam.membership_roles(membership_role_id,tenant_id,tenant_membership_id,role_id,scope_kind,valid_from) SELECT ${newUuidV7()}::uuid,${tenants[0]!}::uuid,${membership}::uuid,role_id,'tenant',transaction_timestamp() FROM iam.roles WHERE tenant_id=${tenants[0]!}::uuid AND role_code=${role!}`.execute(db);}
  for(const [user,role]of [[users.platform,'PLATFORM_ADMIN'],[users.support,'PLATFORM_SUPPORT']])await sql`INSERT INTO iam.platform_role_assignments(platform_role_assignment_id,ownership_class,user_identity_id,role_id,valid_from) SELECT ${newUuidV7()}::uuid,'PLATFORM_CONTROL',${user!}::uuid,role_id,transaction_timestamp() FROM iam.roles WHERE tenant_id IS NULL AND role_code=${role!}`.execute(db);
  const plan=(await sql<{plan_version_id:string}>`SELECT plan_version_id FROM platform.plan_versions WHERE lifecycle_state='published' LIMIT 1`.execute(db)).rows[0];
  if(!plan)throw Error('CANONICAL_TEST_PLAN_MISSING');
  for(const tenant of tenants)await sql`INSERT INTO platform.subscriptions(subscription_id,tenant_id,plan_version_id,subscription_code,lifecycle_state,starts_at) VALUES(${newUuidV7()}::uuid,${tenant}::uuid,${plan.plan_version_id}::uuid,${tenant},'active',transaction_timestamp())`.execute(db);
  const controlId=newUuidV7();
  await sql`INSERT INTO controls.controls(control_id,ownership_class,tenant_id,control_code,name,control_origin,lifecycle_state) VALUES(${controlId}::uuid,'TENANT_OWNED',${tenants[0]!}::uuid,${controlId},'Synthetic control','internal','draft')`.execute(db);
  await sql`INSERT INTO controls.control_versions(control_version_id,ownership_class,tenant_id,control_id,version_number,objective,control_type,nature,frequency_code,execution_method,verification_method,minimum_evidence,lifecycle_state)
   VALUES(${control}::uuid,'TENANT_OWNED',${tenants[0]!}::uuid,${controlId}::uuid,1,'Synthetic','preventive','manual','monthly','Synthetic execution','Synthetic verification','Synthetic evidence','draft')`.execute(db);
  await sql`INSERT INTO knowledge.knowledge_sources(knowledge_source_id,created_by_user_identity_id,ownership_class,tenant_id,source_code,name,source_kind,license_classification,lifecycle_state) VALUES(${source}::uuid,${users.author}::uuid,'TENANT_OWNED',${tenants[0]!}::uuid,${source},'Synthetic own source','editorial','original','draft')`.execute(db);
 },30000);
 afterAll(async()=>{await db?.destroy();});

 it('fails closed for invalid manifests and unprepared objects',async()=>{
  await expect(prepareLibraryPublication(process.cwd(),{tenantIds:[tenants[0]!,tenants[0]!],effectiveFrom:from,effectiveTo:to})).rejects.toMatchObject({statusCode:409});
  await expect(db.transaction().execute(tx=>publishLibraryOperationalData(tx,principal,newUuidV7(),{...p}))).rejects.toMatchObject({statusCode:409});
 });
 it('rolls back catalog, bindings and audits on any failure',async()=>{
  const before=await count();
  await sql`CREATE FUNCTION public.library_audit_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.aggregate_type='ConfigurationDefinition' THEN RAISE EXCEPTION 'synthetic audit fault'; END IF; RETURN NEW; END $$`.execute(db);
  await sql`CREATE TRIGGER library_audit_fault BEFORE INSERT ON ops_audit.audit_events FOR EACH ROW EXECUTE FUNCTION public.library_audit_fault()`.execute(db);
  try{await expect(publish()).rejects.toThrow('synthetic audit fault');expect(await count()).toBe(before);expect((await sql`SELECT * FROM iam.permissions WHERE permission_code='knowledge.knowledge_item.read'`.execute(db)).rows).toHaveLength(0);}
  finally{await sql`DROP TRIGGER library_audit_fault ON ops_audit.audit_events`.execute(db);await sql`DROP FUNCTION public.library_audit_fault()`.execute(db);}
 });
 it('publishes the exact catalog and 13 bindings atomically, and replays without duplicates',async()=>{
  const global=await prepareLibraryPublication(process.cwd(),{tenantIds:[],effectiveFrom:from,effectiveTo:to});
  const firstGlobal=await db.transaction().execute(tx=>publishLibraryOperationalData(tx,principal,newUuidV7(),global));
  expect(firstGlobal).toMatchObject({permissions:8,bindings:13,definitions:4,created:64,audited:64});
  const globalAudits=(await sql`SELECT * FROM ops_audit.audit_events WHERE command_code='normativeLibraryOperationalPublication' ORDER BY audit_event_id`.execute(db)).rows;
  const first=await publish();expect(first).toMatchObject({permissions:8,bindings:13});expect(first.created).toBeGreaterThan(0);
  const retained=(await sql`SELECT * FROM ops_audit.audit_events WHERE command_code='normativeLibraryOperationalPublication' AND tenant_id IS NULL ORDER BY audit_event_id`.execute(db)).rows;
  expect(retained).toEqual(globalAudits);
  const audits=await count();expect(await publish()).toMatchObject({created:0,audited:0});expect(await count()).toBe(audits);
  expect((await sql`SELECT * FROM platform.schema_migrations`.execute(db)).rows).toHaveLength(36);
 });
 it('rejects unrelated global audit manifest drift rather than adopting or rewriting it',async()=>{
  await rollback(async tx=>{
   await sql`UPDATE ops_audit.audit_events SET after_payload=jsonb_set(after_payload,'{publication_manifest_sha256}','"unapproved"'::jsonb) WHERE command_code='normativeLibraryOperationalPublication' AND aggregate_type='Permission'`.execute(tx);
   await expect(publishLibraryOperationalData(tx,principal,newUuidV7(),p)).rejects.toMatchObject({statusCode:409});
  });
 });
 it('serializes two concurrent replays without duplicate rows or audit',async()=>{
  const before=await count();for(const result of await Promise.all([publish(),publish()]))expect(result).toMatchObject({created:0,audited:0});expect(await count()).toBe(before);
 });
 it.each(c.lifecycle.bindings)('adopts and rejects drift for $command_code',async b=>{
  const rows=(await sql<RuntimeLibraryEdge&{id:string}>`SELECT d.*,d.lifecycle_transition_definition_id::text AS id,s.scope_kind,
   ARRAY(SELECT e.event_code FROM ops_audit.lifecycle_transition_side_effects e WHERE e.lifecycle_transition_definition_id=d.lifecycle_transition_definition_id ORDER BY ordinal) AS side_effect_event_codes,TRUE AS all_effects_required
   FROM ops_audit.lifecycle_transition_definitions d JOIN ops_audit.lifecycle_transition_scopes s USING(lifecycle_transition_definition_id)
   WHERE entity_type=${b.entity_type} AND from_state=${b.from_state} AND command_code=${b.command_code}`.execute(db)).rows;
  expect(matchesLibraryRegistry(b,rows)).toBe(true);
  await rollback(async tx=>{await sql`UPDATE ops_audit.lifecycle_transition_definitions SET sod_policy_ref='synthetic-invalid' WHERE lifecycle_transition_definition_id=${rows[0]!.id}::uuid`.execute(tx);await expect(publishLibraryOperationalData(tx,principal,newUuidV7(),p)).rejects.toMatchObject({statusCode:409});});
  await rollback(async tx=>{await sql`UPDATE ops_audit.lifecycle_transition_scopes SET scope_kind='assigned_object' WHERE lifecycle_transition_definition_id=${rows[0]!.id}::uuid`.execute(tx);await expect(publishLibraryOperationalData(tx,principal,newUuidV7(),p)).rejects.toMatchObject({statusCode:409});});
  await rollback(async tx=>{await sql`DELETE FROM ops_audit.lifecycle_transition_side_effects WHERE lifecycle_transition_definition_id=${rows[0]!.id}::uuid`.execute(tx);await expect(publishLibraryOperationalData(tx,principal,newUuidV7(),p)).rejects.toMatchObject({statusCode:409});});
  await rollback(async tx=>{await sql`UPDATE ops_audit.lifecycle_transition_side_effects SET ordinal=2 WHERE lifecycle_transition_definition_id=${rows[0]!.id}::uuid`.execute(tx);await expect(publishLibraryOperationalData(tx,principal,newUuidV7(),p)).rejects.toMatchObject({statusCode:409});});
 });
 it.each(c.definitions.definitions)('materializes $configuration_code@1 with semantic NULL and exact scope/rule, preserving its original base',async d=>{
  const prepared=prepareLibraryDefinitions().find(r=>r.descriptor.configuration_code===d.configuration_code)!;
  expect(prepared.descriptor.default_text_value).toBe(null);expect(prepared.scope.scope_level).toBe('control_version');expect(prepared.validation_rule.operand_text_value).toMatch(new RegExp('^'+d.configuration_code+'@1:[a-f0-9]{64}$'));
  const defs=(await sql<ControlDefinition&{default_text_value:null}>`SELECT d.*,ARRAY(SELECT scope_level FROM config.configuration_definition_scopes s WHERE s.configuration_definition_id=d.configuration_definition_id) AS allowed_scope_levels FROM config.configuration_definitions d WHERE configuration_code=${d.configuration_code}`.execute(db)).rows;
  expect(defs).toHaveLength(1);expect(defs[0]!.default_text_value).toBe(null);
  const cv=(await sql<ControlVersionFacts>`SELECT * FROM controls.control_versions WHERE control_version_id=${control}::uuid`.execute(db)).rows[0]!;
  const resolved=resolveControlAdjustment({tenantId:tenants[0]!,asOf:new Date().toISOString(),definition:defs[0]!,control:cv,overrides:[]});
  expect(resolved.value).toBe(d.base_control_version_field?cv[d.base_control_version_field as keyof ControlVersionFacts]:null);
  await rollback(async tx=>{await sql`UPDATE config.configuration_validation_rules SET operand_text_value='synthetic-drift' WHERE configuration_definition_id=${defs[0]!.configuration_definition_id}::uuid`.execute(tx);await expect(publishLibraryOperationalData(tx,principal,newUuidV7(),p)).rejects.toMatchObject({statusCode:422});});
 });
 it('enforces canonical roles, Platform/Tenant separation, missing permission, default DENY and tenant isolation',async()=>{
  const author=await resolveTenantActor(db,identity(users.author),tenants[0]);expect(author.capabilityGroups.has('CORE_PLATFORM')).toBe(true);expect(author.permissions.has('knowledge.knowledge_item.create')).toBe(true);
  expect(author.permissions.has('configuration.configuration_override.approve')).toBe(false);
  const reviewer=await resolveTenantActor(db,identity(users.reviewer),tenants[0]);expect(reviewer.permissions.has('configuration.configuration_override.approve')).toBe(true);
  const viewer=await resolveTenantActor(db,identity(users.viewer),tenants[0]);expect(()=>authorizeLibraryOperation(viewer,'knowledgeVersionCreate')).toThrow();
  const support=await resolvePlatformActor(db,identity(users.support));expect(authorizeLibraryOperation(support,'platformKnowledgeSourceGet')).toBe('metadata_only');expect(()=>authorizeLibraryOperation(support,'platformKnowledgeSourceCreate')).toThrow();
  expect(()=>authorizeLibraryOperation(author,'platformKnowledgeSourceCreate')).toThrow();expect(()=>authorizeLibraryOperation(support,'knowledgeSourceCreate')).toThrow();
  await expect(readControlDefinitionReferences(db,{identity:identity(users.author),tenantId:tenants[1]!,id:control,query:{}})).rejects.toMatchObject({statusCode:404});
 });
 it('preserves code/version uniqueness and refuses unapproved Definition versions rather than overwriting them',async()=>{
  const code=c.definitions.definitions[0]!.configuration_code;
  await expect(db.transaction().execute(tx=>sql`INSERT INTO config.configuration_definitions(configuration_definition_id,ownership_class,configuration_code,version_number,value_type,tenant_overridable,object_overridable,owner_domain,lifecycle_state,effective_from,effective_to)
   VALUES(${newUuidV7()}::uuid,'PLATFORM_CONTROL',${code},1,'text',TRUE,TRUE,'controls','published',${from}::timestamptz,${to}::timestamptz)`.execute(tx))).rejects.toMatchObject({code:'23505'});
  await rollback(async tx=>{await sql`INSERT INTO config.configuration_definitions(configuration_definition_id,ownership_class,configuration_code,version_number,value_type,tenant_overridable,object_overridable,owner_domain,lifecycle_state,effective_from,effective_to)
   VALUES(${newUuidV7()}::uuid,'PLATFORM_CONTROL',${code},2,'text',TRUE,TRUE,'controls','published',${from}::timestamptz,${to}::timestamptz)`.execute(tx);await expect(publishLibraryOperationalData(tx,principal,newUuidV7(),p)).rejects.toMatchObject({statusCode:409});});
 });
 it('denies an inactive publisher and enforces registry permission FK integrity',async()=>{
  await rollback(async tx=>{await sql`UPDATE iam.service_principals SET lifecycle_state='inactive' WHERE service_principal_id=${principal}::uuid`.execute(tx);await expect(publishLibraryOperationalData(tx,principal,newUuidV7(),p)).rejects.toMatchObject({statusCode:409});});
  await expect(db.transaction().execute(tx=>sql`UPDATE ops_audit.lifecycle_transition_definitions SET permission_id=${newUuidV7()}::uuid WHERE command_code='knowledgeVersionUpdate'`.execute(tx))).rejects.toMatchObject({code:'23503'});
 });
 it('discovers four valid Definitions, creates B04, revalidates on save and completes review/decision under actual B06',async()=>{
  const refs=await readControlDefinitionReferences(db,{identity:identity(users.author),tenantId:tenants[0]!,id:control,query:{}});
  expect(refs.items).toHaveLength(4);const selected=refs.items.find(r=>r.configuration_code==='control_operational_activity')!;
  const input={identity:identity(users.author),tenantId:tenants[0]!,operationId:'configurationOverrideCreate' as const,idempotencyKey:'synthetic-b04-create',correlationId:newUuidV7(),body:{configuration_definition_id:selected.configuration_definition_id,scope_level:'control_version',control_version_id:control,text_value:'Synthetic operational activity',effective_from:from,effective_to:to,rationale:'Synthetic isolated test'}};
  const policy=new CanonicalControlAdjustmentPolicy();
  const created=await mutateControlAdjustment(db,policy,input);expect(created.response.result).toMatchObject({lifecycle_state:'draft',configuration_definition_id:selected.configuration_definition_id});
  expect((await mutateControlAdjustment(db,policy,input)).replay).toBe(true);
  const id=String(created.response.resource_id);
  const etag=async()=>{const row=(await sql<Record<string,unknown>>`SELECT *,override_version::text,effective_from::text,effective_to::text FROM config.configuration_overrides WHERE configuration_override_id=${id}::uuid`.execute(db)).rows[0]!;const audits=(await sql<{audit_event_id:string}>`SELECT audit_event_id FROM ops_audit.audit_events WHERE aggregate_type='ConfigurationOverride' AND aggregate_id=${id}::uuid AND outcome='succeeded'`.execute(db)).rows;return controlOverrideEtag(row,audits.map(r=>r.audit_event_id));};
  await expect(mutateControlAdjustment(db,policy,{...input,operationId:'configurationOverrideReview',targetId:id,idempotencyKey:newUuidV7(),ifMatch:await etag(),body:{decision:'reviewed',rationale:'Synthetic self-review negative'}})).rejects.toMatchObject({statusCode:403});
  const reviewed=await mutateControlAdjustment(db,policy,{...input,identity:identity(users.reviewer),operationId:'configurationOverrideReview',targetId:id,idempotencyKey:newUuidV7(),ifMatch:await etag(),body:{decision:'reviewed',rationale:'Synthetic independent review'}});expect(reviewed.response.result).toMatchObject({lifecycle_state:'reviewed'});
  const decided=await mutateControlAdjustment(db,policy,{...input,identity:identity(users.reviewer),operationId:'configurationOverrideDecide',targetId:id,idempotencyKey:newUuidV7(),ifMatch:await etag(),body:{decision:'approved',rationale:'Synthetic reviewed decision'}});expect(decided.response.result).toMatchObject({lifecycle_state:'approved'});
  await expect(mutateControlAdjustment(db,policy,{...input,idempotencyKey:newUuidV7(),body:{...input.body,configuration_definition_id:newUuidV7()}})).rejects.toMatchObject({statusCode:409});
 });

 const record=():RightsRecord=>({knowledge_source_usage_right_id:newUuidV7(),knowledge_source_id:source,ownership_class:'TENANT_OWNED',tenant_id:tenants[0]!,audience_tenant_id:tenants[0]!,content_hash:'a'.repeat(64),edition_ref:'SYNTHETIC_ONLY',regulatory_pack_version_id:null,use_act:'consultation',use_environment:'test',content_kind:'editorial',effective_from:from,effective_to:to,revoked_at:null,evidence_ref:'SYNTHETIC_ISOLATED_EVIDENCE',evidence_hash:'b'.repeat(64),recorded_audit_event_id:newUuidV7()});
 const context=()=>({identity:identity(users.author),tenantId:tenants[0]!,correlationId:newUuidV7(),rationale:'Synthetic own content only'});
 const request=(r:RightsRecord):RightsRequest=>({sourceId:source,ownershipClass:'TENANT_OWNED',sourceTenantId:tenants[0]!,audienceTenantId:tenants[0]!,contentHash:r.content_hash,packVersionId:null,act:'consultation',environment:'test',now:new Date().toISOString(),preliminary:false,edition:r.edition_ref});
 let stored:RightsRecord;
 const evidence={verify:async()=>true}; // Attestation custody is independently tested in rights.test.ts, no legal evidence is fabricated here.
 it('records exact attested synthetic rights with canonical audit and no duplicate or overlapping grants',async()=>{
  const r=record();stored=r;expect(await recordSourceRights(db,context(),r,evidence)).toMatchObject({replayed:false});expect(await recordSourceRights(db,context(),r,evidence)).toMatchObject({replayed:true});
  expect(await permitsSourceUse(request(r),[r],evidence)).toBe(true);
  await expect(recordSourceRights(db,context(),{...r,knowledge_source_usage_right_id:newUuidV7(),recorded_audit_event_id:newUuidV7()},evidence)).rejects.toMatchObject({statusCode:403});
  const audits=(await sql`SELECT * FROM ops_audit.audit_events WHERE audit_event_id=${r.recorded_audit_event_id}::uuid AND aggregate_type='KnowledgeSource' AND outcome='succeeded'`.execute(db)).rows;expect(audits).toHaveLength(1);
 });
 it.each(['absent','insufficient','expired','future','act','source','tenant','environment','unattested'] as const)('denies H04 %s',async scenario=>{
  const r={...stored},req=request(r);let rows=[r],proof=evidence;
  if(scenario==='absent')rows=[];if(scenario==='insufficient')r.content_kind='metadata';if(scenario==='expired')r.effective_to=from;if(scenario==='future')r.effective_from=to;
  if(scenario==='act')req.act='publication';if(scenario==='source')req.sourceId=newUuidV7();if(scenario==='tenant')req.audienceTenantId=tenants[1]!;if(scenario==='environment')req.environment='qa';if(scenario==='unattested')proof={verify:async()=>false};
  expect(await permitsSourceUse(req,rows,proof)).toBe(false);
 });
 it('denies rights materialization without evidence, privilege or same-tenant authority',async()=>{
  const r=record();await expect(recordSourceRights(db,context(),r,{verify:async()=>false})).rejects.toMatchObject({statusCode:403});
  await expect(recordSourceRights(db,{...context(),identity:identity(users.viewer)},r,evidence)).rejects.toMatchObject({statusCode:403});
  await expect(recordSourceRights(db,{...context(),tenantId:tenants[1]!},r,evidence)).rejects.toMatchObject({statusCode:404});
  expect((await sql`SELECT * FROM knowledge.knowledge_source_usage_rights WHERE knowledge_source_usage_right_id=${r.knowledge_source_usage_right_id}::uuid`.execute(db)).rows).toHaveLength(0);
 });
 it('rolls back H04 audit and right together if persistence fails',async()=>{
  const r={...record(),content_hash:'c'.repeat(64)},before=await count();
  await sql`CREATE FUNCTION public.rights_write_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic rights persistence fault'; END $$`.execute(db);
  await sql`CREATE TRIGGER rights_write_fault BEFORE INSERT ON knowledge.knowledge_source_usage_rights FOR EACH ROW EXECUTE FUNCTION public.rights_write_fault()`.execute(db);
  try{await expect(recordSourceRights(db,context(),r,evidence)).rejects.toThrow('synthetic rights persistence fault');expect(await count()).toBe(before);}
  finally{await sql`DROP TRIGGER rights_write_fault ON knowledge.knowledge_source_usage_rights`.execute(db);await sql`DROP FUNCTION public.rights_write_fault()`.execute(db);}
 });
 it('serializes concurrent H04 replay under the canonical Source lock',async()=>{
  const r={...record(),content_hash:'d'.repeat(64)};const results=await Promise.all([recordSourceRights(db,context(),r,evidence),recordSourceRights(db,context(),r,evidence)]);
  expect(results.map(r=>r.replayed).sort()).toEqual([false,true]);
  expect((await sql`SELECT * FROM ops_audit.audit_events WHERE audit_event_id=${r.recorded_audit_event_id}::uuid`.execute(db)).rows).toHaveLength(1);
 });
 it('revokes once with canonical audit; preserves immutable history and default DENY',async()=>{
  expect(await revokeSourceRights(db,context(),source,stored.knowledge_source_usage_right_id)).toMatchObject({replayed:false});expect(await revokeSourceRights(db,context(),source,stored.knowledge_source_usage_right_id)).toMatchObject({replayed:true});
  const row=(await sql<RightsRecord>`SELECT * FROM knowledge.knowledge_source_usage_rights WHERE knowledge_source_usage_right_id=${stored.knowledge_source_usage_right_id}::uuid`.execute(db)).rows[0]!;
  expect(await permitsSourceUse(request(stored),[{...stored,revoked_at:String(row.revoked_at)}],evidence)).toBe(false);
  await expect(sql`DELETE FROM knowledge.knowledge_source_usage_rights WHERE knowledge_source_usage_right_id=${stored.knowledge_source_usage_right_id}::uuid`.execute(db)).rejects.toThrow('immutable rights history');
 });

 describe('B04 HTTP with signed synthetic identities and real PostgreSQL persistence',()=>{
  let app:ReturnType<typeof buildApp>,tokens:ApplicationTokenService,origin:string;
  const bearer=new Map<string,string>();
  beforeAll(async()=>{
   const keys=generateKeyPairSync('rsa',{modulusLength:2048});
   tokens=await ApplicationTokenService.create({issuer:'https://isolated.tcdx.test',audience:'tcdx-grc-api',privateKey:keys.privateKey.export({format:'pem',type:'pkcs8'}).toString(),publicKey:keys.publicKey.export({format:'pem',type:'spki'}).toString(),keyId:newUuidV7(),algorithm:'RS256',maxLifetimeSeconds:3600,clockToleranceSeconds:0});
   for(const user of Object.values(users))bearer.set(user,(await tokens.issue(user,newUuidV7())).token);
   app=buildApp(async()=>true);
   registerNormativeLibraryRoutes(app,tokens,composeNormativeLibrary({database:db,environment:'test',cursor:tokens,rightsEvidence:{verify:async()=>false},custody:{prepare:async()=>{throw Error('B04 must not write custody');},read:async()=>{throw Error('B04 must not read custody');}}}));
   origin=await app.listen({host:'127.0.0.1',port:0});
  });
  afterAll(async()=>{await app?.close();});
  async function request(method:string,path:string,user=users.author,body?:unknown,headers:Record<string,string>={}){
   const response=await fetch(origin+'/api/v1'+path,{method,headers:{authorization:'Bearer '+bearer.get(user),'x-tcdx-tenant-id':tenants[0]!,...(body===undefined?{}:{'content-type':'application/json','idempotency-key':newUuidV7()}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
   return {status:response.status,headers:response.headers,body:await response.json()};
  }
  async function create(){
   const op=c.registry.new_operations.find(o=>o.operation_id==='controlConfigurationDefinitionReferenceList')!;
   const refs=await request('GET',op.path.replace('{id}',control));expect(refs.status).toBe(200);
   const selected=refs.body.items.find((r:{configuration_code:string})=>r.configuration_code==='control_operational_activity');
   const body={configuration_definition_id:selected.configuration_definition_id,scope_level:'control_version',control_version_id:control,text_value:'Synthetic HTTP activity',effective_from:from,effective_to:to,rationale:'Synthetic local HTTP test'};
   const key=newUuidV7(),created=await request('POST','/configuration-overrides',users.author,body,{'idempotency-key':key});
   expect(created.status).toBe(202);return {id:String(created.body.resource_id),body,key,created};
  }
  async function read(id:string){const r=await request('GET','/configuration-overrides/'+id);expect(r.status).toBe(200);expect(r.headers.get('etag')).toMatch(/^"[a-f0-9]{64}"$/);expect(r.headers.get('cache-control')).toBe('no-store, no-transform');return r;}
  it('creates, replays, updates, reviews and decides with exact HTTP ETags and authentic synthetic audit actors',async()=>{
   const f=await create(),replay=await request('POST','/configuration-overrides',users.author,f.body,{'idempotency-key':f.key});expect(replay.status).toBe(202);expect(replay.body).toEqual(f.created.body);expect(replay.headers.get('idempotency-replayed')).toBe('true');
   const path='/configuration-overrides/'+f.id,draft=await read(f.id);
   const updated=await request('PATCH',path,users.author,{text_value:'Updated synthetic activity',effective_from:from,effective_to:to,rationale:'Synthetic change'},{'if-match':draft.headers.get('etag')!});expect(updated.status).toBe(200);
   const current=await read(f.id);expect(current.headers.get('etag')).not.toBe(draft.headers.get('etag'));
   expect((await request('POST',path+':review',users.author,{decision:'reviewed',rationale:'Self review must deny'},{'if-match':current.headers.get('etag')!})).status).toBe(403);
   const reviewed=await request('POST',path+':review',users.reviewer,{decision:'reviewed',rationale:'Independent synthetic reviewer'},{'if-match':current.headers.get('etag')!});expect(reviewed.status).toBe(200);
   const afterReview=await read(f.id),key=newUuidV7(),decision={decision:'approved',rationale:'Synthetic decision'};
   const decided=await request('POST',path+':decide',users.reviewer,decision,{'if-match':afterReview.headers.get('etag')!,'idempotency-key':key});expect(decided.status).toBe(200);expect(decided.body.result.lifecycle_state).toBe('approved');
   const repeated=await request('POST',path+':decide',users.reviewer,decision,{'if-match':afterReview.headers.get('etag')!,'idempotency-key':key});expect(repeated.status).toBe(200);expect(repeated.body).toEqual(decided.body);expect(repeated.headers.get('idempotency-replayed')).toBe('true');
   const final=await read(f.id);expect(final.body.result.review_audit_event_id).toBe(decided.body.result.review_audit_event_id);expect(final.body.result.decision_audit_event_id).toBe(decided.body.result.decision_audit_event_id);
   const audits=(await sql<{command_code:string;actor_user_identity_id:string}>`SELECT command_code,actor_user_identity_id FROM ops_audit.audit_events WHERE aggregate_type='ConfigurationOverride' AND aggregate_id=${f.id}::uuid ORDER BY occurred_at,audit_event_id`.execute(db)).rows;
   expect(audits).toEqual(['configurationOverrideCreate','configurationOverrideUpdate','configurationOverrideReview','configurationOverrideDecide'].map((command_code,i)=>({command_code,actor_user_identity_id:i<2?users.author:users.reviewer})));
   expect((await sql`SELECT * FROM ops_audit.outbox_events WHERE aggregate_id=${f.id}::uuid`.execute(db)).rows).toHaveLength(4);
  });
  it('rejects missing/invalid/stale CAS, unknown fields, wrong tenant, anonymous and invalid signatures without transitions',async()=>{
   const f=await create(),path='/configuration-overrides/'+f.id,current=await read(f.id),decision={decision:'reviewed',rationale:'Synthetic negative case'};
   for(const [headers,status]of [[{},400],[{'if-match':'invalid'},400],[{'if-match':'"'+'0'.repeat(64)+'"'},409]] as const)expect((await request('POST',path+':review',users.reviewer,decision,headers)).status).toBe(status);
   expect((await request('POST',path+':review',users.reviewer,{...decision,approved:true},{'if-match':current.headers.get('etag')!})).status).toBe(400);
   expect((await request('GET',path,users.author,undefined,{'x-tcdx-tenant-id':tenants[1]!})).status).toBe(404);
   for(const authorization of ['', 'Bearer invalid'])expect((await request('GET',path,users.author,undefined,{authorization})).status).toBe(401);
   expect((await request('POST',path+':review',users.viewer,decision,{'if-match':current.headers.get('etag')!})).status).toBe(403);
   expect((await request('POST',path+':decide',users.reviewer,{decision:'approved',rationale:'No prior review'},{'if-match':current.headers.get('etag')!})).status).toBe(409);
   expect((await read(f.id)).body.result.lifecycle_state).toBe('draft');
   expect((await sql`SELECT * FROM ops_audit.audit_events WHERE aggregate_type='ConfigurationOverride' AND aggregate_id=${f.id}::uuid`.execute(db)).rows).toHaveLength(1);
  });
  it.each(['review','decide'] as const)('persists a %s rejection and denies a subsequent approval',async stage=>{
   const f=await create(),path='/configuration-overrides/'+f.id;
   if(stage==='decide'){const current=await read(f.id);expect((await request('POST',path+':review',users.reviewer,{decision:'reviewed',rationale:'Synthetic review'},{'if-match':current.headers.get('etag')!})).status).toBe(200);}
   const current=await read(f.id),rejected=await request('POST',path+':'+stage,users.reviewer,{decision:'rejected',rationale:'Synthetic rejected case'},{'if-match':current.headers.get('etag')!});expect(rejected.status).toBe(200);expect((await read(f.id)).body.result.lifecycle_state).toBe('rejected');
   expect((await request('POST',path+':decide',users.reviewer,{decision:'approved',rationale:'Rejected is terminal'},{'if-match':(await read(f.id)).headers.get('etag')!})).status).toBe(409);
  });
  it('serializes concurrent review CAS and rolls back transition/idempotency/audit/outbox on persistence failure',async()=>{
   const f=await create(),path='/configuration-overrides/'+f.id,current=await read(f.id),body={decision:'reviewed',rationale:'Concurrent synthetic review'};
   const responses=await Promise.all([request('POST',path+':review',users.reviewer,body,{'if-match':current.headers.get('etag')!}),request('POST',path+':review',users.reviewer,body,{'if-match':current.headers.get('etag')!})]);expect(responses.map(r=>r.status).sort()).toEqual([200,409]);
   const reviewed=await read(f.id),key=newUuidV7(),correlation=newUuidV7(),decision={decision:'approved',rationale:'Fault injection'};
   await sql`CREATE FUNCTION public.b04_http_audit_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.command_code='configurationOverrideDecide' THEN RAISE EXCEPTION 'synthetic B04 HTTP audit fault'; END IF; RETURN NEW; END $$`.execute(db);
   await sql`CREATE TRIGGER b04_http_audit_fault BEFORE INSERT ON ops_audit.audit_events FOR EACH ROW EXECUTE FUNCTION public.b04_http_audit_fault()`.execute(db);
   try{expect((await request('POST',path+':decide',users.reviewer,decision,{'if-match':reviewed.headers.get('etag')!,'idempotency-key':key,'x-correlation-id':correlation})).status).toBe(500);expect((await read(f.id)).body.result.lifecycle_state).toBe('reviewed');expect((await sql`SELECT * FROM ops_audit.audit_events WHERE correlation_id=${correlation}::uuid`.execute(db)).rows).toHaveLength(0);expect((await sql`SELECT * FROM ops_audit.outbox_events WHERE correlation_id=${correlation}::uuid`.execute(db)).rows).toHaveLength(0);}
   finally{await sql`DROP TRIGGER b04_http_audit_fault ON ops_audit.audit_events`.execute(db);await sql`DROP FUNCTION public.b04_http_audit_fault()`.execute(db);}
   expect((await request('POST',path+':decide',users.reviewer,decision,{'if-match':reviewed.headers.get('etag')!,'idempotency-key':key})).status).toBe(200);
  });
 });
});
