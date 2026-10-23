import {beforeAll,afterAll,describe,it,expect,vi} from 'vitest';
import {Kysely,PostgresDialect,sql} from 'kysely';
import pg from 'pg';
import {generateKeyPairSync,createHash} from 'node:crypto';
import {Readable} from 'node:stream';
import type {FoundationDatabase} from '../database.js';
import {newUuidV7} from '../uuid.js';
import {buildApp} from '../app.js';
import {ApplicationTokenService} from '../security/application-token.js';
import {resolvePlatformActor} from '../security/platform-authority.js';
import {publishRuntimeBindingData} from '../security/runtime-binding-publication.js';
import {composeNormativeLibrary} from '../normative-library/composition.js';
import {recordSourceRights,revokeSourceRights} from '../normative-library/rights-publication.js';
import type {RightsRecord} from '../normative-library/rights.js';
import type {FileStoragePort} from '../ports/file-storage.js';
import {RegulatoryPackPipeline} from './pipeline.js';
import {PostgresRegulatoryPackRepository} from './postgres-repository.js';
import type {RegulatoryPackCode} from './model.js';
import {publicationFixture} from './testing/runtime-binding-fixtures.js';

describe.skipIf(process.env.TCDX_RUNTIME_BINDINGS_INTEGRATION!=='true')('P1 P2 T1 canonical HTTP and PostgreSQL, synthetic identities and documents only',()=>{
 let db:Kysely<FoundationDatabase>,app:ReturnType<typeof buildApp>,tokens:ApplicationTokenService,pipeline:RegulatoryPackPipeline;
 const principal=newUuidV7(),tenants=[newUuidV7(),newUuidV7()],subscriptions=[newUuidV7(),newUuidV7()];
 const users=Object.fromEntries(['admin','support','publisher','steward','compliance','ciso','legal','custodian','viewer','matrix','quality','privacy','ai'].map(k=>[k,newUuidV7()])) as Record<string,string>;
 const roleCodes:Record<string,string>={admin:'PLATFORM_ADMIN',support:'PLATFORM_SUPPORT',publisher:'GRC_MANAGER',steward:'REGULATORY_CONTENT_STEWARD',compliance:'COMPLIANCE_MANAGER',ciso:'CISO_SECURITY_MANAGER',legal:'LEGAL_REVIEWER',quality:'QUALITY_MANAGER',privacy:'PRIVACY_MANAGER',ai:'AI_GOVERNANCE_MANAGER'};
 const bearer=new Map<string,string>(),files=new Map<string,Buffer>();let sequence=9000;
 const identity=(name:string)=>({principalClass:'HUMAN_INTERACTIVE' as const,principalId:users[name]!,tokenId:newUuidV7(),expiresAt:new Date(Date.now()+3600000)});
 const evidence={verify:async()=>true}; // Synthetic proof port; never actual rights or MinIO evidence.
 const custody={prepare:async()=>{throw Error('Publication does not write Knowledge bodies');},read:async()=>{throw Error('Publication does not read Knowledge bodies');}};
 const storage:FileStoragePort={allocateQuarantineUpload:async()=>{throw Error('Test files are explicit PG fixtures');},finalizeQuarantine:async()=>{throw Error('No implicit fixture uploads');},removeQuarantine:async()=>{},removeFinalizedObject:async()=>{},createDownloadReference:async()=>{throw Error('No public references');},uploadQuarantineContent:async()=>{throw Error('No uploads');},openDownload:async input=>{const bytes=files.get(input.fileObjectId);if(!bytes||createHash('sha256').update(bytes).digest('hex')!==input.sha256)throw Error('Synthetic storage hash failure');return Readable.from([bytes]);}};
 beforeAll(async()=>{
  if(process.env.DATABASE_HOST!=='127.0.0.1'||process.env.DATABASE_PORT!=='55561'||process.env.TCDX_ISOLATED_REBUILD!=='true'||!process.env.TCDX_RUNTIME_BINDINGS_TEST_CLUSTER?.startsWith('/private/tmp/tcdx-runtime-bindings.'))throw Error('TASK_OWNED_PG16_REQUIRED');
  db=new Kysely({dialect:new PostgresDialect({pool:new pg.Pool({host:'127.0.0.1',port:55561,database:'tcdx-grc',user:process.env.DATABASE_USER,ssl:false,max:10})})});
  expect((await sql<{directory:string;major:number}>`SELECT current_setting('data_directory') AS directory,current_setting('server_version_num')::int/10000 AS major`.execute(db)).rows[0]).toEqual({directory:process.env.TCDX_RUNTIME_BINDINGS_TEST_CLUSTER,major:16});
  await sql`INSERT INTO iam.service_principals(service_principal_id,ownership_class,principal_code,display_name,principal_kind,lifecycle_state) VALUES(${principal}::uuid,'PLATFORM_CONTROL',${principal},'Synthetic binding publisher','integration','active')`.execute(db);
  for(const id of Object.values(users))await sql`INSERT INTO iam.user_identities(user_identity_id,identity_key,display_name,lifecycle_state) VALUES(${id}::uuid,${id},'Synthetic test identity','active')`.execute(db);
  for(const [key,role]of Object.entries(roleCodes))await sql`INSERT INTO iam.platform_role_assignments(platform_role_assignment_id,ownership_class,user_identity_id,role_id,valid_from) SELECT ${newUuidV7()}::uuid,'PLATFORM_CONTROL',${users[key]!}::uuid,role_id,statement_timestamp()-interval '1 second' FROM iam.roles WHERE role_code=${role} AND tenant_id IS NULL AND ownership_class='PLATFORM_CONTROL'`.execute(db);
  const plan=(await sql<{plan_version_id:string}>`SELECT v.plan_version_id FROM platform.plan_versions v JOIN platform.plans p USING(plan_id) WHERE p.plan_code='GRC' AND v.lifecycle_state='published' ORDER BY v.version_number LIMIT 1`.execute(db)).rows[0]!;
  for(const [index,tenant]of tenants.entries()){
   await sql`INSERT INTO platform.tenants(tenant_id,tenant_code,legal_name,display_name,default_timezone,lifecycle_state) VALUES(${tenant}::uuid,${tenant},'Synthetic tenant','Synthetic tenant','UTC','active')`.execute(db);
   await sql`INSERT INTO platform.subscriptions(subscription_id,tenant_id,plan_version_id,subscription_code,lifecycle_state,starts_at) VALUES(${subscriptions[index]!}::uuid,${tenant}::uuid,${plan.plan_version_id}::uuid,${tenant},'active',statement_timestamp()-interval '1 day')`.execute(db);
   for(const role of ['TENANT_ADMIN','EVIDENCE_OWNER','GRC_MANAGER']){
    const roleId=newUuidV7();await sql`INSERT INTO iam.roles(role_id,ownership_class,tenant_id,role_code,name,is_baseline,lifecycle_state) VALUES(${roleId}::uuid,'TENANT_OWNED',${tenant}::uuid,${role},${role},TRUE,'published')`.execute(db);
    const permissions=(await sql<{permission_id:string}>`SELECT permission_id FROM iam.role_permissions rp JOIN iam.roles r USING(role_id) WHERE r.role_code=${role} AND r.tenant_id IS NULL`.execute(db)).rows;
    for(const p of permissions)await sql`INSERT INTO iam.role_permissions(role_permission_id,ownership_class,tenant_id,role_id,permission_id) VALUES(${newUuidV7()}::uuid,'TENANT_OWNED',${tenant}::uuid,${roleId}::uuid,${p.permission_id}::uuid)`.execute(db);
   }
  }
  const member=newUuidV7();await sql`INSERT INTO iam.tenant_memberships(tenant_membership_id,tenant_id,user_identity_id,membership_state,joined_at) VALUES(${member}::uuid,${tenants[0]!}::uuid,${users.custodian!}::uuid,'active',statement_timestamp())`.execute(db);
  await sql`INSERT INTO iam.membership_roles(membership_role_id,tenant_id,tenant_membership_id,role_id,scope_kind,valid_from) SELECT ${newUuidV7()}::uuid,${tenants[0]!}::uuid,${member}::uuid,role_id,'owned_object',statement_timestamp()-interval '1 second' FROM iam.roles WHERE tenant_id=${tenants[0]!}::uuid AND role_code='EVIDENCE_OWNER'`.execute(db);
  for(const name of ['matrix','viewer']){
   const membership=newUuidV7();await sql`INSERT INTO iam.tenant_memberships(tenant_membership_id,tenant_id,user_identity_id,membership_state,joined_at) VALUES(${membership}::uuid,${tenants[0]!}::uuid,${users[name]!}::uuid,'active',statement_timestamp())`.execute(db);
   if(name==='matrix')await sql`INSERT INTO iam.membership_roles(membership_role_id,tenant_id,tenant_membership_id,role_id,scope_kind,valid_from) SELECT ${newUuidV7()}::uuid,${tenants[0]!}::uuid,${membership}::uuid,role_id,'tenant',statement_timestamp()-interval '1 second' FROM iam.roles WHERE tenant_id=${tenants[0]!}::uuid AND role_code='GRC_MANAGER'`.execute(db);
  }
  await db.transaction().execute(tx=>publishRuntimeBindingData(tx,principal,newUuidV7(),tenants));
  const keys=generateKeyPairSync('rsa',{modulusLength:2048});tokens=await ApplicationTokenService.create({issuer:'https://isolated-bindings.test',audience:'tcdx-grc-api',privateKey:keys.privateKey.export({format:'pem',type:'pkcs8'}).toString(),publicKey:keys.publicKey.export({format:'pem',type:'spki'}).toString(),keyId:newUuidV7(),algorithm:'RS256',maxLifetimeSeconds:3600,clockToleranceSeconds:0});
  for(const [name,id]of Object.entries(users))bearer.set(name,(await tokens.issue(id,newUuidV7())).token);
  app=buildApp(async()=>true,{database:db,identityVerifier:tokens,fileStorage:storage,referenceCursor:tokens,runtimeEnvironment:'test',normativeLibrary:composeNormativeLibrary({database:db,rightsEvidence:evidence,environment:'test',cursor:tokens,custody})});
  app.addHook('onError',(_request,_reply,error,done)=>{process.stderr.write('BINDING_TEST_ERROR '+JSON.stringify({code:(error as {code?:string}).code,message:error.message})+'\n');done();});
  pipeline=new RegulatoryPackPipeline(new PostgresRegulatoryPackRepository(db));
 },30000);
 afterAll(async()=>{await app?.close();await db?.destroy();});
 async function http(method:'GET'|'POST',url:string,who='publisher',body?:unknown,headers:Record<string,string>={}){
  const r=await app.inject({method,url:'/api/v1'+url,headers:{authorization:'Bearer '+bearer.get(who),...(body===undefined?{}:{'idempotency-key':newUuidV7()}),...headers},...(body===undefined?{}:{payload:body as object})});return {status:r.statusCode,headers:r.headers,body:r.json()};
 }
 const pubPath=(id:string)=>'/platform/regulatory-pack-versions/'+id;
 async function makeActor(name:string,roles:string[]){
  const id=newUuidV7();users[name]=id;await sql`INSERT INTO iam.user_identities(user_identity_id,identity_key,display_name,lifecycle_state) VALUES(${id}::uuid,${id},'Synthetic independent actor','active')`.execute(db);
  for(const role of roles)await sql`INSERT INTO iam.platform_role_assignments(platform_role_assignment_id,ownership_class,user_identity_id,role_id,valid_from) SELECT ${newUuidV7()}::uuid,'PLATFORM_CONTROL',${id}::uuid,role_id,statement_timestamp()-interval '1 second' FROM iam.roles WHERE role_code=${role} AND ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL`.execute(db);
  bearer.set(name,(await tokens.issue(id,newUuidV7())).token);return id;
 }
 async function pack(importer='steward',code:RegulatoryPackCode='CL_LEY_21663'){
  const input=publicationFixture(users[importer]!,++sequence,code),result=await pipeline.import(input),source=newUuidV7();
  await sql`INSERT INTO knowledge.knowledge_sources(knowledge_source_id,created_by_user_identity_id,ownership_class,source_code,name,source_kind,license_classification,lifecycle_state) VALUES(${source}::uuid,${users.admin!}::uuid,'PLATFORM_CONTROL',${source},'Synthetic source association','editorial','original','active')`.execute(db);
  const im=(await sql<{regulatory_import_manifest_id:string;content_hash:string}>`SELECT i.regulatory_import_manifest_id,v.content_hash FROM regulatory.regulatory_import_manifests i JOIN regulatory.regulatory_pack_versions v USING(regulatory_pack_version_id) WHERE i.regulatory_pack_version_id=${result.regulatoryPackVersionId}::uuid`.execute(db)).rows[0]!;
  return {id:result.regulatoryPackVersionId,framework:result.frameworkVersionId,source,edition:input.edition,manifest:im.regulatory_import_manifest_id,hash:im.content_hash,input};
 }
 type Pack=Awaited<ReturnType<typeof pack>>;
 async function read(p:Pack){const r=await http('GET',pubPath(p.id)+'/publication');expect(r.status,r.body?.message).toBe(200);expect(r.headers.etag).toMatch(/^"[a-f0-9]{64}"$/);return r;}
 async function capture(p:Pack,who:string,kind:string,role:string,patch:Record<string,unknown>={}){
  const r=await read(p);return http('POST',pubPath(p.id)+'/validations',who,{regulatory_import_manifest_id:p.manifest,validation_kind:kind,role_code:role,decision:'approved',...(kind==='source'?{knowledge_source_id:p.source}:{}),reason:'Synthetic review only; no real content or human approval',...patch},{'if-match':String(r.headers.etag)});
 }
 async function approvals(p:Pack){for(const [who,kind,role]of [['steward','source','REGULATORY_CONTENT_STEWARD'],['compliance','edition','COMPLIANCE_MANAGER'],['compliance','package','COMPLIANCE_MANAGER'],['ciso','package','CISO_SECURITY_MANAGER'],['legal','package','LEGAL_REVIEWER']]){const r=await capture(p,who!,kind!,role!);expect(r.status,r.body?.message).toBe(201);}}
 async function rights(p:Pack){
  const rows:RightsRecord[]=[];
  for(const act of ['consultation','publication']){
   const r:RightsRecord={knowledge_source_usage_right_id:newUuidV7(),knowledge_source_id:p.source,ownership_class:'PLATFORM_CONTROL',tenant_id:null,audience_tenant_id:null,content_hash:p.hash,edition_ref:p.edition,regulatory_pack_version_id:p.id,use_act:act,use_environment:'test',content_kind:'editorial',effective_from:new Date(Date.now()-3600000).toISOString(),effective_to:new Date(Date.now()+86400000).toISOString(),revoked_at:null,evidence_ref:'SYNTHETIC_TEST_PROOF_NOT_REAL_RIGHTS',evidence_hash:'a'.repeat(64),recorded_audit_event_id:newUuidV7()};
   await recordSourceRights(db,{identity:identity('admin'),correlationId:newUuidV7(),rationale:'Synthetic fixture, not actual rights'},r,evidence);rows.push(r);
  }return rows;
 }
 async function ready(){const p=await pack();await approvals(p);const grants=await rights(p);return {...p,grants};}
 async function publish(p:Pack,headers:Record<string,string>={},who='publisher'){const r=await read(p);return http('POST',pubPath(p.id)+':publish',who,{reason:'Synthetic technical publication, not an actual normative pack'},{'if-match':String(r.headers.etag),...headers});}

 it('uses the canonical IAM publisher, replays without grants or new audits and confines global content roles',async()=>{
  expect(await db.transaction().execute(tx=>publishRuntimeBindingData(tx,principal,newUuidV7(),tenants))).toEqual({created:0,audited:0,personal_assignments:0});
  const actor=await resolvePlatformActor(db,identity('publisher'));expect(actor.roles).toEqual(['GRC_MANAGER']);expect(actor.permissions.has('knowledge.regulatory_pack.publish')).toBe(true);expect(actor.permissions.has('platform.role.administer')).toBe(false);expect(actor.permissions.has('privacy.retention_policy.publish')).toBe(false);
 });
 it('keeps a tenant role from global publication and does not let Admin or Support publish',async()=>{
  const p=await pack();for(const who of ['custodian','admin','support','viewer'])expect((await http('POST',pubPath(p.id)+':publish',who,{reason:'Synthetic negative'},{'if-match':'"'+'a'.repeat(64)+'"'})).status).toBe(403);
 });
 it('authenticates and rejects tenant context, actor/approval flags and malformed or absent CAS',async()=>{
  const p=await pack(),url=pubPath(p.id)+':publish';
  expect((await app.inject({method:'POST',url:'/api/v1'+url,payload:{reason:'Test'}})).statusCode).toBe(401);
  expect((await http('POST',url,'publisher',{reason:'Test'},{authorization:'Bearer invalid'})).status).toBe(401);
  expect((await http('POST',url,'publisher',{reason:'Test'},{'x-tcdx-tenant-id':tenants[0]!})).status).toBe(403);
  expect((await http('POST',url,'publisher',{reason:'Test',approved:true},{'if-match':'"'+'a'.repeat(64)+'"'})).status).toBe(400);
  for(const match of ['', 'W/"abc"','"1"'])expect((await http('POST',url,'publisher',{reason:'Test'},match?{'if-match':match}:{})).status).toBe(400);
  expect((await http('GET',pubPath(newUuidV7())+'/publication')).status).toBe(404);
 });
 it('captures three separate populations, immutable actor-bound receipts and a CAS change on every new receipt',async()=>{
  const p=await pack(),before=await read(p),r=await capture(p,'steward','source','REGULATORY_CONTENT_STEWARD');expect(r.status,r.body?.message).toBe(201);
  const after=await read(p);expect(after.headers.etag).not.toBe(before.headers.etag);expect(after.body.validations).toHaveLength(1);expect(after.body.validations[0].validation_kind).toBe('source');
  await expect(sql`UPDATE regulatory.regulatory_pack_validation_receipts SET decision='rejected' WHERE regulatory_pack_validation_receipt_id=${r.body.regulatory_pack_validation_receipt_id}::uuid`.execute(db)).rejects.toMatchObject({code:'23514'});
  expect((await http('POST',pubPath(p.id)+'/validations','compliance',{regulatory_import_manifest_id:p.manifest,validation_kind:'edition',role_code:'COMPLIANCE_MANAGER',decision:'approved',reason:'Synthetic stale command'},{'if-match':String(before.headers.etag)})).status).toBe(409);
 });
 it('denies a role claim not held by the actual actor and a source or edition from another pack',async()=>{
  const p=await pack(),other=await pack();expect((await capture(p,'compliance','package','CISO_SECURITY_MANAGER')).status).toBe(403);
  expect((await capture(p,'steward','source','REGULATORY_CONTENT_STEWARD',{regulatory_import_manifest_id:other.manifest})).status).toBe(422);
  expect((await capture(p,'steward','source','REGULATORY_CONTENT_STEWARD',{knowledge_source_id:newUuidV7()})).status).toBe(404);
 });
 it('requires source, edition and every Ley21663 coapproval rather than body flags',async()=>{const p=await pack();await rights(p);expect((await publish(p)).status).toBe(422);await capture(p,'steward','source','REGULATORY_CONTENT_STEWARD');await capture(p,'compliance','edition','COMPLIANCE_MANAGER');await capture(p,'compliance','package','COMPLIANCE_MANAGER');await capture(p,'ciso','package','CISO_SECURITY_MANAGER');expect((await publish(p)).status).toBe(422);});
 it('requires exact effective rights and refuses a revoked publication proof',async()=>{const p=await pack();await approvals(p);expect((await publish(p)).status).toBe(422);const grants=await rights(p);await revokeSourceRights(db,{identity:identity('admin'),correlationId:newUuidV7(),rationale:'Synthetic revocation'},p.source,grants[1]!.knowledge_source_usage_right_id);expect((await publish(p)).status).toBe(422);});
 it('publishes exactly the pack and linked framework states with one audit/outbox and historical replay',async()=>{
  const p=await ready(),before=await read(p),key=newUuidV7(),body={reason:'Synthetic complete test publication'};
  const result=await http('POST',pubPath(p.id)+':publish','publisher',body,{'if-match':String(before.headers.etag),'idempotency-key':key});expect(result.status,result.body?.message).toBe(200);
  const replay=await http('POST',pubPath(p.id)+':publish','publisher',body,{'if-match':String(before.headers.etag),'idempotency-key':key});expect(replay.status).toBe(200);expect(replay.body).toEqual(result.body);expect(replay.headers['idempotency-replayed']).toBe('true');expect(replay.headers.etag).toBeUndefined();
  expect((await sql<{pack:string;version:string;framework:string;framework_version:string}>`SELECT p.lifecycle_state AS pack,v.lifecycle_state AS version,f.lifecycle_state AS framework,fv.lifecycle_state AS framework_version FROM regulatory.regulatory_pack_versions v JOIN regulatory.regulatory_packs p USING(regulatory_pack_id) JOIN regulatory.regulatory_pack_framework_versions l USING(regulatory_pack_version_id) JOIN regulatory.framework_versions fv USING(framework_version_id) JOIN regulatory.frameworks f USING(framework_id) WHERE v.regulatory_pack_version_id=${p.id}::uuid`.execute(db)).rows[0]).toEqual({pack:'published',version:'published',framework:'published',framework_version:'published'});
  const references=(await sql<{root:string;version:string;compliance:string;editorial:string}>`SELECT c.lifecycle_state AS root,v.lifecycle_state AS version,m.lifecycle_state AS compliance,n.lifecycle_state AS editorial FROM regulatory.requirement_control_mappings m JOIN regulatory.requirements r USING(requirement_id) JOIN controls.control_versions v USING(control_version_id) JOIN controls.controls c USING(control_id) JOIN regulatory.normative_unit_control_mappings n ON n.control_version_id=v.control_version_id JOIN regulatory.regulatory_pack_framework_versions p ON p.framework_version_id=r.framework_version_id WHERE p.regulatory_pack_version_id=${p.id}::uuid`.execute(db)).rows;expect(references).toEqual([{root:'published',version:'published',compliance:'published',editorial:'published'}]);
  const audit=(await sql<{after_payload:{affected_references:unknown[]};ownership_class:string}>`SELECT after_payload,ownership_class FROM ops_audit.audit_events WHERE audit_event_id=${result.body.audit_event_id}::uuid`.execute(db)).rows[0]!;expect(audit.ownership_class).toBe('GLOBAL_REFERENCE');expect(audit.after_payload.affected_references).toHaveLength(4);
  expect((await sql`SELECT * FROM ops_audit.audit_events WHERE aggregate_id=${p.id}::uuid AND command_code='regulatoryPackPublish'`.execute(db)).rows).toHaveLength(1);expect((await sql`SELECT * FROM ops_audit.outbox_events WHERE aggregate_id=${p.id}::uuid AND event_type='knowledge.regulatory_pack.published.v1'`.execute(db)).rows).toHaveLength(1);
  expect((await http('POST',pubPath(p.id)+':publish','publisher',{reason:'Changed intent'},{'if-match':String(before.headers.etag),'idempotency-key':key})).status).toBe(409);
 });
 it('serializes competing publication commands with the same snapshot',async()=>{const p=await ready(),r=await read(p);const results=await Promise.all([1,2].map(()=>http('POST',pubPath(p.id)+':publish','publisher',{reason:'Synthetic concurrent publication'},{'if-match':String(r.headers.etag)})));expect(results.map(r=>r.status).sort()).toEqual([200,409]);});
 it('uses the current rejected receipt and refuses a stale approved predecessor',async()=>{
  const p=await ready(),r=await read(p),old=r.body.validations.find((v:{validation_kind:string})=>v.validation_kind==='source');
  const rejected=await capture(p,'steward','source','REGULATORY_CONTENT_STEWARD',{decision:'rejected',knowledge_source_id:undefined,supersedes_validation_receipt_id:old.regulatory_pack_validation_receipt_id});expect(rejected.status,rejected.body?.message).toBe(201);expect((await publish(p)).status).toBe(422);
 });
 it('rolls back publication, claim, audit and outbox on an actual audit INSERT failure and permits exact retry',async()=>{
  const p=await ready(),r=await read(p),key=newUuidV7();await sql`CREATE FUNCTION public.binding_audit_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.command_code='regulatoryPackPublish' THEN RAISE EXCEPTION 'synthetic publication audit fault'; END IF; RETURN NEW; END $$`.execute(db);await sql`CREATE TRIGGER binding_audit_fault BEFORE INSERT ON ops_audit.audit_events FOR EACH ROW EXECUTE FUNCTION public.binding_audit_fault()`.execute(db);
  try{expect((await publish(p,{'idempotency-key':key,'if-match':String(r.headers.etag)})).status).toBe(500);expect((await sql<{lifecycle_state:string}>`SELECT lifecycle_state FROM regulatory.regulatory_pack_versions WHERE regulatory_pack_version_id=${p.id}::uuid`.execute(db)).rows[0]!.lifecycle_state).toBe('review');}
  finally{await sql`DROP TRIGGER binding_audit_fault ON ops_audit.audit_events`.execute(db);await sql`DROP FUNCTION public.binding_audit_fault()`.execute(db);}
  expect((await publish(p,{'idempotency-key':key,'if-match':String(r.headers.etag)})).status).toBe(200);
 });
 it('administers global content assignments through the existing IAM command without a tenant Membership',async()=>{
  const id=newUuidV7();await sql`INSERT INTO iam.user_identities(user_identity_id,identity_key,display_name,lifecycle_state) VALUES(${id}::uuid,${id},'Synthetic assignment target','active')`.execute(db);
  const assigned=await http('POST','/platform/user-identities/'+id+'/platform-roles','admin',{role_code:'GRC_MANAGER',reason:'Synthetic explicit global assignment'});expect(assigned.status,assigned.body?.message).toBe(201);
  expect((await resolvePlatformActor(db,{...identity('publisher'),principalId:id})).permissions.has('knowledge.regulatory_pack.publish')).toBe(true);
  expect((await sql`SELECT * FROM iam.tenant_memberships WHERE user_identity_id=${id}::uuid`.execute(db)).rows).toHaveLength(0);
 });
 it('denies sole-importer approval even when that actual identity holds every specialist role',async()=>{
  await makeActor('sole',['REGULATORY_CONTENT_STEWARD','COMPLIANCE_MANAGER','CISO_SECURITY_MANAGER','LEGAL_REVIEWER']);const p=await pack('sole');
  for(const [kind,role]of [['source','REGULATORY_CONTENT_STEWARD'],['edition','COMPLIANCE_MANAGER'],['package','COMPLIANCE_MANAGER'],['package','CISO_SECURITY_MANAGER'],['package','LEGAL_REVIEWER']])expect((await capture(p,'sole',kind!,role!)).status).toBe(201);
  await rights(p);expect((await publish(p)).status).toBe(403);
 });
 it('denies changed source edition, incomplete coverage and a stale reviewed population',async()=>{
  const edition=await ready();await sql`UPDATE regulatory.regulatory_import_manifests SET source_edition='different-synthetic-edition' WHERE regulatory_import_manifest_id=${edition.manifest}::uuid`.execute(db);expect((await publish(edition)).status).toBe(422);
  const coverage=await ready();await sql`UPDATE regulatory.regulatory_coverage_manifests SET normative_units_reviewed=0 WHERE regulatory_pack_version_id=${coverage.id}::uuid`.execute(db);expect((await publish(coverage)).status).toBe(422);
  const drift=await ready();await sql`UPDATE regulatory.normative_units SET title='Changed synthetic reviewed content' WHERE framework_version_id=${drift.framework}::uuid`.execute(db);expect((await publish(drift)).status).toBe(422);
 });
 it('revalidates current IAM on replay and refuses a corrupted durable publication result',async()=>{
  const who='revocable',actor=await makeActor(who,['GRC_MANAGER']),p=await ready(),r=await read(p),key=newUuidV7(),headers={'if-match':String(r.headers.etag),'idempotency-key':key};
  expect((await publish(p,headers,who)).status).toBe(200);
  await sql`UPDATE iam.platform_role_assignments SET valid_to=statement_timestamp() WHERE user_identity_id=${actor}::uuid`.execute(db);expect((await publish(p,headers,who)).status).toBe(403);
  const other=await ready(),before=await read(other),otherKey=newUuidV7(),otherHeaders={'if-match':String(before.headers.etag),'idempotency-key':otherKey};expect((await publish(other,otherHeaders)).status).toBe(200);
  await sql`UPDATE ops_audit.idempotency_records SET result_ref='{"broken":true}' WHERE actor_user_identity_id=${users.publisher!}::uuid AND operation_code='regulatoryPackPublish' AND idempotency_key=${otherKey}`.execute(db);expect((await publish(other,otherHeaders)).status).toBe(503);
 });
 it('keeps published content immutable and rejects a new publication command in the terminal state',async()=>{
  const p=await ready();expect((await publish(p)).status).toBe(200);expect((await publish(p)).status).toBe(409);
  const changed={...p.input,edition:'changed-after-published'};const {calculateImportChecksum}=await import('./validator.js');changed.importChecksum=calculateImportChecksum(changed);await expect(pipeline.import(changed)).rejects.toMatchObject({code:'TCDX.REGULATORY.SOURCE_DRIFT'});
 });

 async function file(tenant=tenants[0]!,owner=users.custodian!){
  const policy=newUuidV7(),applicability=newUuidV7(),id=newUuidV7(),bytes=Buffer.from('%PDF-synthetic fixture '+id),hash=createHash('sha256').update(bytes).digest('hex');files.set(id,bytes);
  await sql`INSERT INTO privacy.retention_policies(retention_policy_id,created_by_user_identity_id,ownership_class,tenant_id,policy_code,version_number,policy_kind,retention_seconds,trigger_event_code,precedence_rank,is_mandatory,lifecycle_state,effective_from) VALUES(${policy}::uuid,${owner}::uuid,'TENANT_OWNED',${tenant}::uuid,${policy},1,'tenant_policy',604800,'expiry_or_closure',200,FALSE,'published',statement_timestamp()-interval '1 day')`.execute(db);
  // One current ordinary retention context per tenant/classification; reuse its canonical root.
  const existing=(await sql<{retention_policy_applicability_id:string;retention_policy_id:string}>`SELECT retention_policy_applicability_id,retention_policy_id FROM privacy.retention_policy_applicabilities WHERE tenant_id=${tenant}::uuid AND classification='confidential' AND purpose='evidence_document' AND lifecycle_state='published'`.execute(db)).rows[0];
  let actualPolicy=policy,actualApplicability=applicability;
  if(existing){actualPolicy=existing.retention_policy_id;actualApplicability=existing.retention_policy_applicability_id;}
  else {
   await sql`INSERT INTO privacy.retention_policy_applicabilities(retention_policy_applicability_id,tenant_id,retention_policy_id,version_number,classification,purpose,lifecycle_state,effective_from,created_by_user_identity_id) VALUES(${applicability}::uuid,${tenant}::uuid,${policy}::uuid,1,'confidential','evidence_document','draft',statement_timestamp()-interval '12 hours',${owner}::uuid)`.execute(db);
   for(const state of ['under_review','approved','published'])await sql`UPDATE privacy.retention_policy_applicabilities SET lifecycle_state=${state},row_version=row_version+1,published_at=CASE WHEN ${state}='published' THEN statement_timestamp() ELSE published_at END WHERE retention_policy_applicability_id=${applicability}::uuid`.execute(db);
  }
  await sql`INSERT INTO evidence.file_objects(file_object_id,created_by_user_identity_id,tenant_id,object_key,original_filename,declared_mime,detected_mime,size_bytes,sha256,encryption_key_ref,classification,retention_policy_id,scan_status,scan_completed_at,storage_version,source_provenance,retention_policy_applicability_id) VALUES(${id}::uuid,${owner}::uuid,${tenant}::uuid,${'objects/'+id},'synthetic-ticket.pdf','application/pdf','application/pdf',${bytes.length},${hash},'synthetic-encryption','confidential',${actualPolicy}::uuid,'passed',statement_timestamp(),'synthetic-immutable-version','synthetic-not-an-issued-ticket',${actualApplicability}::uuid)`.execute(db);return {id,hash,bytes};
 }
 async function incorporate(f:Awaited<ReturnType<typeof file>>,code=newUuidV7()){const body={document_code:code,title:'Synthetic external ticket fixture',file_object_id:f.id,reason:'Technical fixture; no actual managerial issue'};const r=await http('POST','/documents','custodian',body,{'x-tcdx-tenant-id':tenants[0]!});expect(r.status,r.body?.message).toBe(201);return {r,body};}
 it('incorporates an external document, preserves SHA256 and recovers the exact private bytes through canonical file access',async()=>{
  const f=await file(),{r}=await incorporate(f);expect(r.body.content_hash).toBe(f.hash);expect(r.body.lifecycle_state).toBe('draft');
  const version=await http('GET','/document-versions/'+r.body.document_version_id,'custodian',undefined,{'x-tcdx-tenant-id':tenants[0]!});expect(version.status).toBe(200);expect(version.body).toEqual(r.body);
  const download=await app.inject({method:'GET',url:'/api/v1/file-objects/'+f.id+'/content',headers:{authorization:'Bearer '+bearer.get('custodian'),'x-tcdx-tenant-id':tenants[0]!}});expect(download.statusCode).toBe(200);expect(download.rawPayload).toEqual(f.bytes);
  expect((await http('GET','/document-versions/'+r.body.document_version_id,'admin',undefined,{'x-tcdx-tenant-id':tenants[0]!})).status).toBeGreaterThanOrEqual(403);
 });
 it('allows version1 of distinct documents and replays the original incorporation without duplicate documents',async()=>{
  const f=await file(),code=newUuidV7(),key=newUuidV7(),body={document_code:code,title:'Synthetic',file_object_id:f.id,reason:'Synthetic'};
  const first=await http('POST','/documents','custodian',body,{'x-tcdx-tenant-id':tenants[0]!,'idempotency-key':key});expect(first.status,first.body?.message).toBe(201);
  const replay=await http('POST','/documents','custodian',body,{'x-tcdx-tenant-id':tenants[0]!,'idempotency-key':key});expect(replay.body).toEqual(first.body);expect(replay.headers['idempotency-replayed']).toBe('true');expect((await incorporate(await file())).r.body.version_number).toBe('1');
 });
 it('links a same-tenant exact DocumentVersion with Subscription CAS, minimal Platform receipt and canonical replay',async()=>{
  const {r}=await incorporate(await file()),before=await http('GET','/platform/subscriptions/'+subscriptions[0]+'/ticket','admin');expect(before.status,before.body?.message).toBe(200);expect(before.body.document_version_id).toBeNull();
  const key=newUuidV7(),body={document_version_id:r.body.document_version_id,reason:'Synthetic association'},headers={'if-match':'"'+before.body.row_version+'"','idempotency-key':key};
  const linked=await http('POST','/platform/subscriptions/'+subscriptions[0]+':link-ticket','admin',body,headers);expect(linked.status,linked.body?.message).toBe(200);expect(linked.body.document_version_id).toBe(r.body.document_version_id);expect(linked.body.content_hash).toBe(r.body.content_hash);expect(linked.body).not.toHaveProperty('file_object_id');
  const replay=await http('POST','/platform/subscriptions/'+subscriptions[0]+':link-ticket','admin',body,headers);expect(replay.body).toEqual(linked.body);expect(replay.headers['idempotency-replayed']).toBe('true');
 });
 it('rejects foreign tenant documents, malware, missing scope and stale Subscription CAS without a link',async()=>{
  const foreign=await file(tenants[1]!),own=await file();expect((await http('POST','/documents','custodian',{document_code:newUuidV7(),title:'Synthetic',file_object_id:foreign.id,reason:'Synthetic'},{'x-tcdx-tenant-id':tenants[0]!})).status).toBe(404);
  await sql`UPDATE evidence.file_objects SET scan_status='failed' WHERE file_object_id=${own.id}::uuid`.execute(db);
  expect((await http('POST','/documents','custodian',{document_code:newUuidV7(),title:'Synthetic',file_object_id:own.id,reason:'Synthetic'},{'x-tcdx-tenant-id':tenants[0]!})).status).toBe(422);
  expect((await http('POST','/platform/subscriptions/'+subscriptions[1]+':link-ticket','support',{document_version_id:newUuidV7(),reason:'Synthetic'},{'if-match':'"1"'})).status).toBe(403);
  expect((await http('POST','/platform/subscriptions/'+subscriptions[0]+':link-ticket','admin',{document_version_id:newUuidV7(),reason:'Synthetic stale'},{'if-match':'"1"'})).status).toBe(409);
 });
 async function freshSubscription(){const id=newUuidV7();await sql`INSERT INTO platform.subscriptions(subscription_id,tenant_id,plan_version_id,subscription_code,lifecycle_state,starts_at,ends_at,cancelled_at) SELECT ${id}::uuid,tenant_id,plan_version_id,${id},'cancelled',statement_timestamp()-interval '2 years',statement_timestamp()-interval '1 year',statement_timestamp()-interval '1 year' FROM platform.subscriptions WHERE subscription_id=${subscriptions[0]!}::uuid`.execute(db);return id;}
 async function append(documentId:string,fileId:string){const current=await http('GET','/documents/'+documentId,'custodian',undefined,{'x-tcdx-tenant-id':tenants[0]!});expect(current.status).toBe(200);const r=await http('POST','/documents/'+documentId+'/versions','custodian',{file_object_id:fileId,reason:'Synthetic corrected external document'},{'x-tcdx-tenant-id':tenants[0]!,'if-match':String(current.headers.etag)});expect(r.status,r.body?.message).toBe(201);return r;}
 it('versions documents without rewriting bytes and resolves competing ticket corrections with CAS and historical replay',async()=>{
  const id=await freshSubscription(),{r:first}=await incorporate(await file()),key=newUuidV7(),body={document_version_id:first.body.document_version_id,reason:'Synthetic first association'},headers={'if-match':'"1"','idempotency-key':key};
  const initial=await http('POST','/platform/subscriptions/'+id+':link-ticket','admin',body,headers);expect(initial.status,initial.body?.message).toBe(200);
  const second=await append(first.body.document_id,(await file()).id),third=await append(first.body.document_id,(await file()).id);expect(second.body.version_number).toBe('2');expect(third.body.version_number).toBe('3');
  const concurrent=await Promise.all([second,third].map(version=>http('POST','/platform/subscriptions/'+id+':link-ticket','admin',{document_version_id:version.body.document_version_id,reason:'Synthetic version correction'},{'if-match':'"2"'})));expect(concurrent.map(r=>r.status).sort()).toEqual([200,409]);
  const replay=await http('POST','/platform/subscriptions/'+id+':link-ticket','admin',body,headers);expect(replay.body).toEqual(initial.body);expect(replay.headers['idempotency-replayed']).toBe('true');
  const old=await http('GET','/document-versions/'+first.body.document_version_id,'custodian',undefined,{'x-tcdx-tenant-id':tenants[0]!});expect(old.body).toEqual(first.body);
  const latest=await http('GET','/platform/subscriptions/'+id+'/ticket','admin');expect(latest.body.document_version_id).not.toBe(first.body.document_version_id);expect(latest.body.row_version).toBe('3');
 });
 it('enforces the same-tenant ticket FK in PostgreSQL and denies a Platform metadata permission as PDF access',async()=>{
  const foreign=await file(tenants[1]!),doc=newUuidV7(),v=newUuidV7();
  const retention=(await sql<{retention_policy_id:string}>`SELECT retention_policy_id FROM evidence.file_objects WHERE file_object_id=${foreign.id}::uuid`.execute(db)).rows[0]!;
  await sql`INSERT INTO evidence.documents(document_id,created_by_user_identity_id,tenant_id,document_code,title,document_kind,lifecycle_state,retention_policy_id) VALUES(${doc}::uuid,${users.custodian!}::uuid,${tenants[1]!}::uuid,${doc},'Synthetic foreign document','contractual_ticket','draft',${retention.retention_policy_id}::uuid)`.execute(db);
  await sql`INSERT INTO evidence.document_versions(document_version_id,created_by_user_identity_id,tenant_id,version_number,lifecycle_state,document_id,file_object_id,content_hash) VALUES(${v}::uuid,${users.custodian!}::uuid,${tenants[1]!}::uuid,1,'draft',${doc}::uuid,${foreign.id}::uuid,${foreign.hash})`.execute(db);
  await expect(sql`UPDATE platform.subscriptions SET tenant_creation_ticket_document_version_id=${v}::uuid WHERE subscription_id=${subscriptions[0]!}::uuid`.execute(db)).rejects.toMatchObject({code:'23503'});
  const id=await freshSubscription();expect((await http('POST','/platform/subscriptions/'+id+':link-ticket','admin',{document_version_id:v,reason:'Synthetic foreign reference'},{'if-match':'"1"'})).status).toBe(404);
  expect((await app.inject({method:'GET',url:'/api/v1/file-objects/'+foreign.id+'/content',headers:{authorization:'Bearer '+bearer.get('admin'),'x-tcdx-tenant-id':tenants[1]!}})).statusCode).toBeGreaterThanOrEqual(403);
 });
 it('rolls back the ticket FK and row_version on audit failure and preserves the same-key retry',async()=>{
  const id=await freshSubscription(),{r}=await incorporate(await file()),key=newUuidV7(),body={document_version_id:r.body.document_version_id,reason:'Synthetic rollback proof'},headers={'if-match':'"1"','idempotency-key':key};
  await sql`CREATE FUNCTION public.ticket_audit_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.command_code='subscriptionTicketLink' THEN RAISE EXCEPTION 'synthetic ticket audit fault'; END IF; RETURN NEW; END $$`.execute(db);await sql`CREATE TRIGGER ticket_audit_fault BEFORE INSERT ON ops_audit.audit_events FOR EACH ROW EXECUTE FUNCTION public.ticket_audit_fault()`.execute(db);
  try{expect((await http('POST','/platform/subscriptions/'+id+':link-ticket','admin',body,headers)).status).toBe(500);const current=await http('GET','/platform/subscriptions/'+id+'/ticket','admin');expect(current.body.document_version_id).toBeNull();expect(current.body.row_version).toBe('1');}
  finally{await sql`DROP TRIGGER ticket_audit_fault ON ops_audit.audit_events`.execute(db);await sql`DROP FUNCTION public.ticket_audit_fault()`.execute(db);}
  expect((await http('POST','/platform/subscriptions/'+id+':link-ticket','admin',body,headers)).status).toBe(200);
 });
 let matrixFixture:Promise<Record<string,string>>|undefined;
 async function matrixData():Promise<Record<string,string>>{return matrixFixture??=(async()=>{
  const tenant=tenants[0]!,id=Object.fromEntries(['framework','source','targetRoot','target','unit','requirement','control','controlVersion','mapping','applicability','assessment','crosswalk','evidence','evidenceVersion','link','issue','action'].map(key=>[key,newUuidV7()])) as Record<string,string>,hash='b'.repeat(64);
  for(const [root,version]of [['framework','source'],['targetRoot','target']]){
   await sql`INSERT INTO regulatory.frameworks(framework_id,ownership_class,tenant_id,framework_code,name,source_type,lifecycle_state) VALUES(${id[root!]!}::uuid,'TENANT_OWNED',${tenant}::uuid,${id[root!]!},'Synthetic private framework','internal','published')`.execute(db);
   await sql`INSERT INTO regulatory.framework_versions(framework_version_id,ownership_class,tenant_id,framework_id,version_number,edition,lifecycle_state,content_hash) VALUES(${id[version!]!}::uuid,'TENANT_OWNED',${tenant}::uuid,${id[root!]!}::uuid,1,${version!},'published',${hash})`.execute(db);
  }
  await sql`INSERT INTO regulatory.normative_units(normative_unit_id,ownership_class,tenant_id,framework_version_id,unit_type,unit_code,title,display_order,source_locator,content_language,content_hash,license_classification,provenance_ref) VALUES(${id.unit!}::uuid,'TENANT_OWNED',${tenant}::uuid,${id.source!}::uuid,'article','SYNTHETIC','Synthetic',1,'synthetic:unit','es',${hash},'synthetic','synthetic-only')`.execute(db);
  await sql`INSERT INTO regulatory.requirements(requirement_id,ownership_class,tenant_id,framework_version_id,normative_unit_id,requirement_code,requirement_kind,statement_locator,licensed_statement,content_language,content_hash,is_mandatory,provenance_ref) VALUES(${id.requirement!}::uuid,'TENANT_OWNED',${tenant}::uuid,${id.source!}::uuid,${id.unit!}::uuid,'SYNTHETIC_REQ','internal_requirement','synthetic:requirement','Synthetic statement, no normative authority','es',${hash},false,'synthetic-only')`.execute(db);
  await sql`INSERT INTO controls.controls(control_id,ownership_class,tenant_id,control_code,control_origin,name,lifecycle_state) VALUES(${id.control!}::uuid,'TENANT_OWNED',${tenant}::uuid,'SYNTHETIC_CONTROL','tenant_defined','Synthetic','published')`.execute(db);
  await sql`INSERT INTO controls.control_versions(control_version_id,ownership_class,tenant_id,control_id,version_number,lifecycle_state,objective,control_type,nature,frequency_code,execution_method,verification_method,minimum_evidence) VALUES(${id.controlVersion!}::uuid,'TENANT_OWNED',${tenant}::uuid,${id.control!}::uuid,1,'published','Synthetic','preventive','manual','annual','Synthetic','Synthetic','Synthetic')`.execute(db);
  await sql`INSERT INTO regulatory.requirement_control_mappings(requirement_control_mapping_id,ownership_class,tenant_id,requirement_id,control_version_id,mapping_version,mapping_type,rationale,provenance_ref,lifecycle_state) VALUES(${id.mapping!}::uuid,'TENANT_OWNED',${tenant}::uuid,${id.requirement!}::uuid,${id.controlVersion!}::uuid,1,'supports','Synthetic','synthetic-only','published')`.execute(db);
  await sql`INSERT INTO regulatory.requirement_applicabilities(requirement_applicability_id,tenant_id,requirement_id,applicability_version,applicability_decision,rationale,lifecycle_state,effective_from) VALUES(${id.applicability!}::uuid,${tenant}::uuid,${id.requirement!}::uuid,1,'applicable','Synthetic','approved',statement_timestamp()-interval '1 day')`.execute(db);
  await sql`INSERT INTO regulatory.requirement_assessments(requirement_assessment_id,tenant_id,requirement_applicability_id,methodology_version_ref,lifecycle_state,result_status) SELECT ${id.assessment!}::uuid,${tenant}::uuid,${id.applicability!}::uuid,compliance_methodology_id,'draft','no_data' FROM regulatory.compliance_methodologies WHERE lifecycle_state='published' ORDER BY version_number DESC LIMIT 1`.execute(db);
  await sql`INSERT INTO regulatory.framework_crosswalks(framework_crosswalk_id,ownership_class,tenant_id,source_framework_version_id,target_framework_version_id,crosswalk_version,direction,lifecycle_state,provenance_ref) VALUES(${id.crosswalk!}::uuid,'TENANT_OWNED',${tenant}::uuid,${id.source!}::uuid,${id.target!}::uuid,1,'source_to_target','review','synthetic-only')`.execute(db);
  const f=await file();
  await sql`INSERT INTO evidence.evidences(evidence_id,tenant_id,evidence_code,evidence_type,lifecycle_state,retention_policy_id,source_kind) SELECT ${id.evidence!}::uuid,${tenant}::uuid,'SYNTHETIC_EVIDENCE','document','draft',retention_policy_id,'uploaded' FROM evidence.file_objects WHERE file_object_id=${f.id}::uuid`.execute(db);
  await sql`INSERT INTO evidence.evidence_versions(evidence_version_id,tenant_id,evidence_id,version_number,lifecycle_state,provenance_ref,file_object_id,retention_policy_applicability_id) SELECT ${id.evidenceVersion!}::uuid,${tenant}::uuid,${id.evidence!}::uuid,1,'draft','synthetic-only',${f.id}::uuid,retention_policy_applicability_id FROM evidence.file_objects WHERE file_object_id=${f.id}::uuid`.execute(db);
  await sql`INSERT INTO evidence.evidence_links(evidence_link_id,tenant_id,evidence_version_id,control_version_id) VALUES(${id.link!}::uuid,${tenant}::uuid,${id.evidenceVersion!}::uuid,${id.controlVersion!}::uuid)`.execute(db);
  await sql`INSERT INTO remediation.issues(issue_id,tenant_id,issue_code,issue_kind,title,description,lifecycle_state,severity,priority) VALUES(${id.issue!}::uuid,${tenant}::uuid,'SYNTHETIC_ISSUE','finding','Synthetic','Synthetic','open','low','low')`.execute(db);
  await sql`INSERT INTO remediation.actions(action_id,tenant_id,issue_id,action_code,title,description,lifecycle_state,priority) VALUES(${id.action!}::uuid,${tenant}::uuid,${id.issue!}::uuid,'SYNTHETIC_ACTION','Synthetic','Synthetic','open','low')`.execute(db);
  return {...id,as_of:new Date(Date.now()+1000).toISOString()};
 })();}
 function matrixQuery(type:string,id:Record<string,string>){return {as_of:id.as_of!,...(['requirements_controls','requirements_assessments','frameworks_frameworks','obligations_applicability'].includes(type)?{source_framework_version_id:id.source!}:{}),...(type==='frameworks_frameworks'?{target_framework_version_id:id.target!}:{})};}
 async function matrix(type:string,query:Record<string,string>,who='matrix',tenant=tenants[0]!){return http('GET','/matrices/'+type+'?'+new URLSearchParams(query),who,undefined,{'x-tcdx-tenant-id':tenant});}
 for(const type of ['requirements_controls','controls_evidence','requirements_assessments','frameworks_frameworks','obligations_applicability','issues_actions'])it('projects the populated '+type+' matrix from canonical PostgreSQL through authenticated HTTP',async()=>{
  const id=await matrixData(),r=await matrix(type,matrixQuery(type,id));expect(r.status,r.body?.message).toBe(200);expect(r.body.matrix_type).toBe(type);expect(r.body.cells.length).toBeGreaterThan(0);expect(r.body.rows.length).toBeGreaterThan(0);expect(r.body.columns.length).toBeGreaterThan(0);
  if(type==='controls_evidence'){expect(r.body.rows).toContainEqual(expect.objectContaining({ref:{control_version_id:id.controlVersion}}));expect(r.body.columns).toContainEqual(expect.objectContaining({label:'SYNTHETIC_EVIDENCE · v1'}));}
  if(type==='requirements_controls')expect(r.body.columns).toContainEqual(expect.objectContaining({label:'SYNTHETIC_CONTROL · v1'}));
  if(type==='requirements_assessments')expect(r.body.cells[0].stored_result).toMatchObject({result_status:'no_data',domain_conclusion:null,assessment_ref:{requirement_assessment_id:id.assessment}});
 });
 it('intersects matrix/source permissions, conceals foreign filters and performs reads without audit/outbox/idempotency side effects',async()=>{
  const id=await matrixData(),q=matrixQuery('requirements_controls',id);
  async function counts(){return (await sql`SELECT (SELECT count(*) FROM ops_audit.audit_events) AS audit,(SELECT count(*) FROM ops_audit.outbox_events) AS outbox,(SELECT count(*) FROM ops_audit.idempotency_records) AS claims`.execute(db)).rows[0];}
  const before=await counts();expect((await matrix('requirements_controls',q,'viewer')).status).toBe(403);expect((await matrix('requirements_controls',q,'matrix',tenants[1]!)).status).toBe(404);
  expect((await matrix('requirements_controls',{...q,requirement_id:newUuidV7()})).status).toBe(404);expect((await matrix('requirements_controls',{...q,tenant_id:tenants[1]!})).status).toBe(400);
  for(const type of ['requirements_controls','controls_evidence','requirements_assessments','frameworks_frameworks','obligations_applicability','issues_actions'])expect((await matrix(type,matrixQuery(type,id))).status).toBe(200);
  expect(await counts()).toEqual(before);
 });
 it('serializes identical concurrent publication keys into one operation and one historical replay',async()=>{
  const p=await ready(),r=await read(p),key=newUuidV7(),headers={'if-match':String(r.headers.etag),'idempotency-key':key};const results=await Promise.all([1,2].map(()=>http('POST',pubPath(p.id)+':publish','publisher',{reason:'Synthetic same-key concurrency'},headers)));expect(results.map(r=>r.status)).toEqual([200,200]);expect(results[0]!.body).toEqual(results[1]!.body);expect(results.filter(r=>r.headers['idempotency-replayed']==='true')).toHaveLength(1);
 });

 it('keeps private tenant additions out of the matrix fingerprint and rejects a cursor after visible source drift',async()=>{
  const id=await matrixData(),extra=newUuidV7();await sql`INSERT INTO remediation.actions(action_id,tenant_id,issue_id,action_code,title,description,lifecycle_state,priority,created_at) VALUES(${extra}::uuid,${tenants[0]!}::uuid,${id.issue!}::uuid,'SYNTHETIC_ACTION_2','Synthetic','Synthetic','open','low',${id.as_of!}::timestamptz-interval '1 second')`.execute(db);
  const q={...matrixQuery('issues_actions',id),column_limit:'1'},before=await matrix('issues_actions',q);expect(before.status).toBe(200);expect(before.body.next_column_cursor).toBeTypeOf('string');
  const foreignIssue=newUuidV7(),foreignAction=newUuidV7();await sql`INSERT INTO remediation.issues(issue_id,tenant_id,issue_code,issue_kind,title,description,lifecycle_state,severity,priority,created_at) VALUES(${foreignIssue}::uuid,${tenants[1]!}::uuid,'PRIVATE_FOREIGN','finding','Private','Private','open','low','low',${id.as_of!}::timestamptz-interval '1 second')`.execute(db);
  await sql`INSERT INTO remediation.actions(action_id,tenant_id,issue_id,action_code,title,description,lifecycle_state,priority,created_at) VALUES(${foreignAction}::uuid,${tenants[1]!}::uuid,${foreignIssue}::uuid,'PRIVATE_FOREIGN','Private','Private','open','low',${id.as_of!}::timestamptz-interval '1 second')`.execute(db);
  const hidden=await matrix('issues_actions',q);expect(hidden.body.snapshot_fingerprint).toBe(before.body.snapshot_fingerprint);expect(hidden.body.cells).toEqual(before.body.cells);expect((await matrix('issues_actions',{...q,issue_id:foreignIssue})).status).toBe(404);
  const page=await matrix('issues_actions',{...q,column_cursor:before.body.next_column_cursor});expect(page.status).toBe(200);expect(page.body.columns[0].ref).not.toEqual(before.body.columns[0].ref);
  await sql`UPDATE remediation.actions SET action_code='SYNTHETIC_CHANGED' WHERE action_id=${extra}::uuid`.execute(db);expect((await matrix('issues_actions',{...q,column_cursor:before.body.next_column_cursor})).status).toBe(409);
 });
 it('requires every matrix source permission even when the matrix permission remains effective',async()=>{
  const id=await matrixData(),grant=(await sql<{data:Record<string,unknown>}>`SELECT to_jsonb(rp) AS data FROM iam.role_permissions rp JOIN iam.roles r USING(role_id) JOIN iam.permissions p USING(permission_id) WHERE rp.tenant_id=${tenants[0]!}::uuid AND r.role_code='GRC_MANAGER' AND p.permission_code='evidence.evidence.read'`.execute(db)).rows[0]!.data;
  await sql`DELETE FROM iam.role_permissions WHERE role_permission_id=${String(grant.role_permission_id)}::uuid`.execute(db);
  try{expect((await matrix('controls_evidence',matrixQuery('controls_evidence',id))).status).toBe(403);expect((await matrix('issues_actions',matrixQuery('issues_actions',id))).status).toBe(200);}
  finally{await sql`INSERT INTO iam.role_permissions SELECT * FROM jsonb_populate_record(NULL::iam.role_permissions,${JSON.stringify(grant)}::jsonb)`.execute(db);}
 });

 it('holds the exact rights row while publication verifies evidence so revocation cannot race the checked fact',async()=>{
  const p=await ready();let entered!:()=>void,release!:()=>void;
  const checking=new Promise<void>(resolve=>{entered=resolve;}),continueCheck=new Promise<void>(resolve=>{release=resolve;});
  const proof=vi.spyOn(evidence,'verify').mockImplementationOnce(async()=>{entered();await continueCheck;return true;});
  const pending=publish(p);
  try{
   await Promise.race([checking,new Promise<never>((_resolve,reject)=>setTimeout(()=>reject(Error('Evidence verification did not begin')),3000))]);
   await expect(db.transaction().execute(async tx=>{await sql`SET LOCAL lock_timeout='150ms'`.execute(tx);await sql`UPDATE knowledge.knowledge_source_usage_rights SET revoked_at=statement_timestamp() WHERE knowledge_source_usage_right_id=${p.grants[1]!.knowledge_source_usage_right_id}::uuid`.execute(tx);})).rejects.toMatchObject({code:'55P03'});
  }finally{release();proof.mockRestore();}
  expect((await pending).status).toBe(200);
  await revokeSourceRights(db,{identity:identity('admin'),correlationId:newUuidV7(),rationale:'Synthetic revocation after serialized publication'},p.source,p.grants[1]!.knowledge_source_usage_right_id);
 });

 const packApprovalCases:Array<[RegulatoryPackCode,string[]]>=[['ISO_9001_2015',['compliance','quality']],['ISO_9001_2026',['compliance','quality']],['ISO_IEC_27001_2022',['compliance','ciso']],['ISO_IEC_42001_2023',['compliance','ai']],['CL_LEY_21719',['compliance','privacy','legal']],['CL_LEY_21663',['compliance','ciso','legal']]];
 for(const [code,specialists]of packApprovalCases)it('enforces and publishes the exact persisted specialist combination for '+code,async()=>{
  const p=await pack('steward',code);await rights(p);expect((await capture(p,'steward','source','REGULATORY_CONTENT_STEWARD')).status).toBe(201);expect((await capture(p,'compliance','edition','COMPLIANCE_MANAGER')).status).toBe(201);
  for(const who of specialists){expect((await publish(p)).status).toBe(422);expect((await capture(p,who,'package',roleCodes[who]!)).status).toBe(201);}
  expect((await publish(p)).status).toBe(200);
 });

});
