import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {createDatabase,sql} from '../database.js';
import {loadConfig} from '../config.js';
import {buildApp} from '../app.js';
import {UnavailableFileStoragePort} from '../ports/file-storage.js';
import {commercialSubscriptionFixture} from '../security/commercial-subscription-fixture.js';
import {newUuidV7} from '../uuid.js';
import {effectivePacks} from './pack-entitlement.js';

describe.skipIf(process.env.TCDX_SECURITY_INTEGRATION!=='true')('pack contracting HTTP and PostgreSQL, synthetic local fixtures only',()=>{
 let db:ReturnType<typeof createDatabase>,app:ReturnType<typeof buildApp>,f:Awaited<ReturnType<typeof commercialSubscriptionFixture>>;
 beforeAll(async()=>{
  db=createDatabase(loadConfig(process.env));f=await commercialSubscriptionFixture(db);
  app=buildApp(async()=>true,{database:db,identityVerifier:f.tokens,referenceCursor:f.tokens,fileStorage:new UnavailableFileStoragePort(),runtimeEnvironment:'test'});
 });
 afterAll(async()=>{await app?.close();await db?.destroy();});
 const headers=(key=newUuidV7())=>({authorization:'Bearer '+f.adminToken.token,'idempotency-key':key});
 const body=()=>({regulatory_pack_version_id:f.packVersionId,effective_from:new Date(Date.now()-1000).toISOString()});
 const activate=(subscription:string,payload=body(),extra=headers())=>app.inject({method:'POST',url:'/api/v1/subscriptions/'+subscription+'/regulatory-packs',headers:extra,payload});
 it('persists exact assignment, audit/outbox and entitlement; revokes access and preserves the original activation replay',async()=>{
  const company=await f.company(),key=newUuidV7(),input=body(),first=await activate(company.subscriptionId,input,headers(key));expect(first.statusCode,first.body).toBe(202);
  const result=first.json().result,id=result.subscription_regulatory_pack_id;
  expect((await effectivePacks(db,company.tenantId)).map(r=>r.regulatory_pack_version_id)).toEqual([f.packVersionId]);
  const revoked=await app.inject({method:'POST',url:'/api/v1/subscription-regulatory-packs/'+id+':revoke',headers:{...headers(),'if-match':first.headers.etag!},payload:{reason:'Synthetic test complete'}});expect(revoked.statusCode,revoked.body).toBe(202);
  expect(await effectivePacks(db,company.tenantId)).toEqual([]);
  const replay=await activate(company.subscriptionId,input,headers(key));expect(replay.statusCode,replay.body).toBe(202);expect(replay.headers['idempotency-replayed']).toBe('true');expect(replay.json().result).toEqual(result);
  const stored=(await sql`SELECT lifecycle_state,row_version FROM platform.subscription_regulatory_packs WHERE subscription_regulatory_pack_id=${id}::uuid`.execute(db)).rows[0];expect(stored).toMatchObject({lifecycle_state:'revoked',row_version:'2'});
  expect((await sql`SELECT * FROM ops_audit.audit_events WHERE aggregate_id=${id}::uuid`.execute(db)).rows).toHaveLength(2);
  expect((await sql`SELECT * FROM ops_audit.outbox_events WHERE aggregate_id=${id}::uuid`.execute(db)).rows).toHaveLength(2);
 });
 it('serializes identical concurrent retries and rejects changed intent without another assignment',async()=>{
  const company=await f.company(),key=newUuidV7(),input=body(),responses=await Promise.all([activate(company.subscriptionId,input,headers(key)),activate(company.subscriptionId,input,headers(key))]);
  for(const r of responses)expect(r.statusCode,r.body).toBe(202);
  expect(responses.map(r=>r.json().resource_id)).toEqual([responses[0]!.json().resource_id,responses[0]!.json().resource_id]);
  expect((await activate(company.subscriptionId,{...input,effective_from:new Date(Date.now()-2000).toISOString()},headers(key))).statusCode).toBe(409);
  expect((await sql`SELECT * FROM platform.subscription_regulatory_packs WHERE subscription_id=${company.subscriptionId}::uuid`.execute(db)).rows).toHaveLength(1);
 });
 it('enforces signed authentication, platform permission, tenant separation and closed request shape',async()=>{
  const company=await f.company();
  for(const [extra,status]of [[{authorization:''},401],[{authorization:'Bearer invalid'},401],[{authorization:'Bearer '+f.supportToken.token},403],[{'x-tcdx-tenant-id':company.tenantId},403]] as const){const r=await activate(company.subscriptionId,body(),{...headers(),...extra});expect(r.statusCode,r.body).toBe(status);}
  expect((await activate(newUuidV7())).statusCode).toBe(404);
  expect((await activate(company.subscriptionId,{...body(),tenant_id:company.tenantId} as ReturnType<typeof body>)).statusCode).toBe(400);
  expect(await effectivePacks(db,company.tenantId)).toEqual([]);
 });
 it('rolls back assignment, audit, outbox and claim after a database fault; permits an exact retry',async()=>{
  const company=await f.company(),key=newUuidV7(),input=body();
  await sql`CREATE FUNCTION public.pack_http_audit_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.aggregate_type='SubscriptionRegulatoryPack' THEN RAISE EXCEPTION 'synthetic pack HTTP audit failure'; END IF; RETURN NEW; END $$`.execute(db);
  await sql`CREATE TRIGGER pack_http_audit_fault BEFORE INSERT ON ops_audit.audit_events FOR EACH ROW EXECUTE FUNCTION public.pack_http_audit_fault()`.execute(db);
  try{expect((await activate(company.subscriptionId,input,headers(key))).statusCode).toBe(500);expect(await effectivePacks(db,company.tenantId)).toEqual([]);expect((await sql`SELECT * FROM platform.subscription_regulatory_packs WHERE subscription_id=${company.subscriptionId}::uuid`.execute(db)).rows).toHaveLength(0);}
  finally{await sql`DROP TRIGGER pack_http_audit_fault ON ops_audit.audit_events`.execute(db);await sql`DROP FUNCTION public.pack_http_audit_fault()`.execute(db);}
  expect((await activate(company.subscriptionId,input,headers(key))).statusCode).toBe(202);
 });
 it('refuses corrupt stored replay instead of reconstructing a successful result from current rows',async()=>{
  const company=await f.company(),key=newUuidV7(),input=body();expect((await activate(company.subscriptionId,input,headers(key))).statusCode).toBe(202);
  await sql`UPDATE ops_audit.idempotency_records SET result_ref='{}' WHERE actor_user_identity_id=${f.actorId}::uuid AND operation_code='subscriptionRegulatoryPackActivate' AND idempotency_key=${key}`.execute(db);
  expect((await activate(company.subscriptionId,input,headers(key))).statusCode).toBe(503);
 });
 it('reauthorizes replay against current persisted Platform authority, rather than a still-valid token',async()=>{
  const company=await f.company(),key=newUuidV7(),input=body(),first=await activate(company.subscriptionId,input,headers(key));expect(first.statusCode).toBe(202);
  const id=first.json().resource_id;
  await sql`UPDATE iam.platform_role_assignments SET valid_to=statement_timestamp() WHERE user_identity_id=${f.actorId}::uuid AND valid_to IS NULL`.execute(db);
  expect((await activate(company.subscriptionId,input,headers(key))).statusCode).toBe(403);
  expect((await sql`SELECT * FROM ops_audit.audit_events WHERE aggregate_id=${id}::uuid`.execute(db)).rows).toHaveLength(1);
 });
});
