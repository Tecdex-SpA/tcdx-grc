import { restorePreMethodologyFixture } from "./methodology-predecessor-fixture.js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { buildApp } from "../app.js";
import { createDatabase,sql } from "../database.js";
import { loadConfig } from "../config.js";
import { newUuidV7 } from "../uuid.js";
import { UnavailableFileStoragePort } from "../ports/file-storage.js";
import { TenantUserOnboarding } from "./tenant-user-onboarding.js";
import { TenantInitialOnboarding } from "./tenant-initial-onboarding.js";
import { resolvePlatformActor } from "./platform-authority.js";
import { subscriptionCreate } from "./platform-iam-service.js";
import { userIdentityTenantAccessList } from "./administrative-read.js";
import { canonicalIdentityKey } from "./oidc-browser.js";
import * as records from "../persistence/foundation-records.js";

describe.skipIf(process.env.TCDX_SECURITY_INTEGRATION!=="true")("Central onboarding isolated PostgreSQL security and partial progress",()=>{
  let db:ReturnType<typeof createDatabase>,service:TenantUserOnboarding;
  const ids={platform:newUuidV7(),support:newUuidV7(),admin:newUuidV7(),admin2:newUuidV7(),admin3:newUuidV7(),target:newUuidV7(),target2:newUuidV7(),inactive:newUuidV7(),plain:newUuidV7()};
  const people=Object.values(ids);let tenant:string,other:string,unentitled:string;
  const identity=(id=ids.platform)=>({principalClass:"HUMAN_INTERACTIVE" as const,principalId:id,tokenId:newUuidV7(),expiresAt:new Date(Date.now()+60000)});
  const input=(target=ids.target,codes=['COMPLIANCE_MANAGER','EVIDENCE_OWNER'])=>({user_identity_id:target,tenant_role_codes:codes,reason:'Isolated person verification'});
  const create=(body:unknown=input(),key=newUuidV7(),targetTenant=tenant,actor=ids.platform,header:unknown=undefined,query:Record<string,unknown>={})=>service.create(identity(actor),targetTenant,header,body,key,newUuidV7(),query);
  const count=async(table:string,where=sql`TRUE`)=>(await sql<{n:number}>`SELECT count(*)::int AS n FROM ${sql.table(table)} WHERE ${where}`.execute(db)).rows[0]!.n;
  beforeAll(async()=>{
    if(process.env.DATABASE_HOST!=='127.0.0.1'||process.env.DATABASE_PORT!=='55432'||process.env.TCDX_ISOLATED_REBUILD!=='true')throw Error('ISOLATED_POSTGRES_REQUIRED');
    db=createDatabase(loadConfig(process.env));service=new TenantUserOnboarding(db);
    for(const [name,id]of Object.entries(ids))await sql`INSERT INTO iam.user_identities(user_identity_id,identity_key,display_name,lifecycle_state)
      VALUES(${id}::uuid,${canonicalIdentityKey("https://isolated-central.example.test",id)},${`Central ${name}`},${name==='inactive'?'suspended':'active'})`.execute(db);
    for(const [id,code]of [[ids.platform,'PLATFORM_ADMIN'],[ids.support,'PLATFORM_SUPPORT']])await sql`INSERT INTO iam.platform_role_assignments
      (platform_role_assignment_id,ownership_class,user_identity_id,role_id,valid_from)
      SELECT ${newUuidV7()}::uuid,'PLATFORM_CONTROL',${id!}::uuid,role_id,statement_timestamp()-interval '1 second'
      FROM iam.roles WHERE role_code=${code!} AND ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL AND is_baseline AND lifecycle_state='published'`.execute(db);
    const initial=new TenantInitialOnboarding(db);
    const tenants=[];
    for(const target of [ids.admin,ids.admin2,ids.admin3]){
      const result=await initial.create(identity(),undefined,{tenant:{tenant_code:`CENTRAL-${newUuidV7()}`,legal_name:'Isolated central',display_name:'Isolated central',default_timezone:'UTC'},
        initial_administrator:{kind:'existing_identity',user_identity_id:target}},newUuidV7(),newUuidV7());tenants.push(result.result.tenant_id);
    }
    [tenant,other,unentitled]=tenants as [string,string,string];
    const plan=(await sql<{plan_version_id:string}>`SELECT pv.plan_version_id FROM platform.plan_versions pv JOIN platform.plans p USING(plan_id)
      WHERE p.plan_code='ISO' AND pv.lifecycle_state='published' LIMIT 1`.execute(db)).rows[0]!;
    for(const id of [tenant,other])await db.transaction().execute(async tx=>subscriptionCreate(tx,await resolvePlatformActor(tx,identity()),{
      body:{tenant_id:id,plan_version_id:plan.plan_version_id,subscription_code:`CENTRAL-${newUuidV7()}`},key:newUuidV7(),correlationId:newUuidV7()}));
  });
  afterAll(async()=>{
    if(!db)return;vi.restoreAllMocks();
    try{
      const tenants=(await sql<{tenant_id:string}>`SELECT tenant_id FROM platform.tenants WHERE created_by_user_identity_id=${ids.platform}::uuid`.execute(db)).rows.map(x=>x.tenant_id);
      for(const table of ['ops_audit.audit_events','ops_audit.outbox_events','ops_audit.idempotency_records'])await sql`DELETE FROM ${sql.table(table)} WHERE actor_user_identity_id=ANY(${people}::uuid[])`.execute(db);
      for(const table of ['iam.membership_roles','iam.role_permissions','iam.tenant_memberships','iam.roles','platform.subscriptions'])await sql`DELETE FROM ${sql.table(table)} WHERE tenant_id=ANY(${tenants}::uuid[])`.execute(db);
      await sql`DELETE FROM platform.tenants WHERE tenant_id=ANY(${tenants}::uuid[])`.execute(db);
      await sql`DELETE FROM iam.platform_role_assignments WHERE user_identity_id=ANY(${people}::uuid[])`.execute(db);
      await sql`DELETE FROM iam.user_identities WHERE user_identity_id=ANY(${people}::uuid[])`.execute(db);
    }finally{await db.destroy();}
  });
  it('publishes one Permission/PlatformAdmin grant with no DDL/schema delta',async()=>{
    const rollback=Symbol();await db.transaction().execute(async tx=>{
      await restorePreMethodologyFixture(tx);
      const schema=async()=>(await sql`SELECT n.nspname,c.relname,a.attname,a.atttypid,a.attnotnull FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 WHERE n.nspname NOT LIKE 'pg_%' ORDER BY 1,2,3`.execute(tx)).rows;
      const before=await schema();
      await sql`DELETE FROM iam.role_permissions WHERE permission_id IN(SELECT permission_id FROM iam.permissions WHERE permission_code='platform.tenant_user.onboard')`.execute(tx);
      await sql`DELETE FROM iam.permissions WHERE permission_code='platform.tenant_user.onboard'`.execute(tx);
      await sql`DELETE FROM platform.schema_migrations WHERE migration_id='20261007000100'`.execute(tx);
      await sql.raw(readFileSync('database/migrations/20261007000100_platform_tenant_user_onboarding_permission_publication.sql','utf8')).execute(tx);
      expect(await schema()).toEqual(before);
      const grants=(await sql`SELECT r.role_code,r.ownership_class,r.tenant_id FROM iam.role_permissions rp JOIN iam.permissions p USING(permission_id)
        JOIN iam.roles r USING(role_id) WHERE p.permission_code='platform.tenant_user.onboard'`.execute(tx)).rows;
      expect(grants).toEqual([{role_code:'PLATFORM_ADMIN',ownership_class:'PLATFORM_CONTROL',tenant_id:null}]);throw rollback;
    }).catch(e=>{if(e!==rollback)throw e;});
  });
  it('allows PlatformAdmin Membership plus tenant roles, audit/outbox and no actor authority',async()=>{
    const result=await create();expect(result.result.pending_role_codes).toEqual([]);expect(result.result.completed_roles).toHaveLength(2);
    expect(await count('iam.tenant_memberships',sql`user_identity_id=${ids.platform}::uuid`)).toBe(0);
    expect(await count('iam.membership_roles',sql`tenant_membership_id IN(SELECT tenant_membership_id FROM iam.tenant_memberships WHERE user_identity_id=${ids.platform}::uuid)`)).toBe(0);
    expect(await count('ops_audit.audit_events',sql`actor_user_identity_id=${ids.platform}::uuid AND command_code='tenantUserOnboardingCreate' AND outcome='success'`)).toBeGreaterThan(2);
    expect(await count('ops_audit.outbox_events',sql`actor_user_identity_id=${ids.platform}::uuid AND aggregate_id=${result.result.membership_id}::uuid`)).toBe(1);
    expect(JSON.stringify(result)).not.toMatch(/secret|password|credential|identity_key|issuer|subject/);
  });
  it.each([['Platform Support',ids.support],['Tenant Admin',ids.admin],['ungranted identity',ids.plain]])('default denies %s and audits denied administrative use',async(_name,actor)=>{
    await expect(create(input(),newUuidV7(),tenant,actor)).rejects.toMatchObject({statusCode:403});
    expect(await count('ops_audit.audit_events',sql`actor_user_identity_id=${actor}::uuid AND command_code='tenantUserOnboardingCreate' AND outcome='denied'`)).toBe(1);
  });
  it('denies actor self-target; never grants actor membership',async()=>{
    await expect(create(input(ids.platform))).rejects.toMatchObject({statusCode:403});
    expect(await count('iam.tenant_memberships',sql`user_identity_id=${ids.platform}::uuid`)).toBe(0);
  });
  it('requires explicit tenant, denies context override and missing/inactive target',async()=>{
    await expect(service.create(identity(),undefined,undefined,input(),newUuidV7(),newUuidV7())).rejects.toMatchObject({statusCode:400});
    await expect(create(input(),newUuidV7(),tenant,ids.platform,other)).rejects.toMatchObject({statusCode:403});
    await expect(create(input(),newUuidV7(),tenant,ids.platform,undefined,{tenant_id:other})).rejects.toMatchObject({statusCode:400});
    await expect(create(input(),newUuidV7(),newUuidV7())).rejects.toMatchObject({statusCode:404});
    await sql`UPDATE platform.tenants SET lifecycle_state='suspended' WHERE tenant_id=${other}::uuid`.execute(db);
    try{await expect(create(input(),newUuidV7(),other)).rejects.toMatchObject({statusCode:409});}finally{await sql`UPDATE platform.tenants SET lifecycle_state='active' WHERE tenant_id=${other}::uuid`.execute(db);}
    await expect(create(input(newUuidV7()))).rejects.toMatchObject({statusCode:404});await expect(create(input(ids.inactive))).rejects.toMatchObject({statusCode:409});
  });
  it.each(['PLATFORM_ADMIN','PLATFORM_SUPPORT'])('rejects Platform role %s and creates no target Membership',async code=>{
    await expect(create(input(ids.target2,[code]))).rejects.toMatchObject({statusCode:403});
    expect(await count('iam.tenant_memberships',sql`user_identity_id=${ids.target2}::uuid`)).toBe(0);
  });
  it('uses existing canonical roles; rejects missing catalog without fallback',async()=>{
    await expect(create(input(ids.target2,['MISSING_ROLE']))).rejects.toMatchObject({statusCode:404});
  });
  it('reconciles duplicate Membership/assignment and same-key replay without duplicate evidence',async()=>{
    const key=newUuidV7();const first=await create(input(),key);const before=await count('ops_audit.audit_events',sql`actor_user_identity_id=${ids.platform}::uuid`);
    const replay=await create(input(),key);expect(replay).toEqual({...first,replayed:true});
    expect(await count('ops_audit.audit_events',sql`actor_user_identity_id=${ids.platform}::uuid`)).toBe(before);
    const next=await create();expect(next.result.membership_id).toBe(first.result.membership_id);expect(next.result.completed_roles).toEqual(first.result.completed_roles);
    expect(await count('iam.tenant_memberships',sql`tenant_id=${tenant}::uuid AND user_identity_id=${ids.target}::uuid`)).toBe(1);
    await expect(create(input(ids.target,['VIEWER']),key)).rejects.toMatchObject({statusCode:409,code:'TCDX.CONFLICT.IDEMPOTENCY'});
  });
  it('explicit cross-tenant target creates independent Membership and only tenant-owned roles',async()=>{
    const result=await create(input(),newUuidV7(),other);expect(result.result.tenant_id).toBe(other);
    expect(await count('iam.tenant_memberships',sql`user_identity_id=${ids.target}::uuid`)).toBe(2);
    expect(await count('iam.membership_roles',sql`tenant_membership_id=${result.result.membership_id}::uuid AND role_id NOT IN(SELECT role_id FROM iam.roles WHERE tenant_id=${other}::uuid AND ownership_class='TENANT_OWNED')`)).toBe(0);
  });
  it('requires subsequent CORE_PLATFORM while initial-admin path remains subscription-free',async()=>{
    expect(await count('platform.subscriptions',sql`tenant_id=${unentitled}::uuid`)).toBe(0);
    expect(await count('iam.tenant_memberships',sql`tenant_id=${unentitled}::uuid AND user_identity_id=${ids.admin3}::uuid`)).toBe(1);
    await expect(create(input(ids.target2),newUuidV7(),unentitled)).rejects.toMatchObject({statusCode:403});
    expect(await count('iam.tenant_memberships',sql`tenant_id=${unentitled}::uuid AND user_identity_id=${ids.target2}::uuid`)).toBe(0);
  });
  it('retains committed Membership/first role after second-role failure; retries only pending with original key',async()=>{
    const original=records.persistOutboxEvent,key=newUuidV7(),request=input(ids.target2,['COMPLIANCE_MANAGER','EVIDENCE_OWNER']);
    const spy=vi.spyOn(records,'persistOutboxEvent').mockImplementation(async(tx,row)=>{
      if(row.payload.role_code==='EVIDENCE_OWNER')throw Error('ISOLATED_CHILD_FAILURE');return original(tx,row);
    });
    let partial:Record<string,unknown>|undefined;
    try{await create(request,key);}catch(e){partial=(e as {details?:Record<string,unknown>}).details;}finally{spy.mockRestore();}
    expect(partial).toMatchObject({tenant_user_onboarding_progress:{pending_role_codes:['EVIDENCE_OWNER'],completed_roles:[{role_code:'COMPLIANCE_MANAGER'}]}});
    const first=await count('ops_audit.outbox_events',sql`actor_user_identity_id=${ids.platform}::uuid AND payload->>'role_code'='COMPLIANCE_MANAGER'`);
    const result=await create(request,key);expect(result.result.completed_roles).toHaveLength(2);
    expect(await count('ops_audit.outbox_events',sql`actor_user_identity_id=${ids.platform}::uuid AND payload->>'role_code'='COMPLIANCE_MANAGER'`)).toBe(first);
  });
  it('rolls back failed Membership child and audit failure never produces false success',async()=>{
    const original=records.persistAuditEvent,spy=vi.spyOn(records,'persistAuditEvent').mockImplementation(async(tx,row)=>{
      if(row.aggregateType==='TenantMembership'&&row.eventCode==='audit.platform.membership.create.v1')throw Error('ISOLATED_AUDIT_FAILURE');return original(tx,row);
    });
    try{await expect(create(input(ids.plain,['VIEWER']))).rejects.toMatchObject({statusCode:503});}finally{spy.mockRestore();}
    expect(await count('iam.tenant_memberships',sql`user_identity_id=${ids.plain}::uuid`)).toBe(0);
  });
  it('concurrent different intents reconcile one Membership/assignment without duplicate authority',async()=>{
    const [a,b]=await Promise.all([create(input(ids.plain,['VIEWER'])),create(input(ids.plain,['VIEWER']))]);
    expect(a.result).toEqual(b.result);
    expect(await count('iam.tenant_memberships',sql`user_identity_id=${ids.plain}::uuid AND tenant_id=${tenant}::uuid`)).toBe(1);
    expect(await count('iam.membership_roles',sql`tenant_membership_id=${a.result.membership_id}::uuid`)).toBe(1);
  });
  it('read projection is canonical ID based, paginated and contains only target tenant roles; denies tenant actor',async()=>{
    const page=await userIdentityTenantAccessList(db,identity(),ids.target,undefined,{'page[size]':'1'},undefined);
    expect(page.items).toHaveLength(1);expect(page.page.has_more).toBe(true);
    const rest=await userIdentityTenantAccessList(db,identity(),ids.target,undefined,{'page[size]':'1','page[cursor]':page.page.next_cursor},undefined);
    expect(rest.items).toHaveLength(1);expect(rest.items[0]!.tenant_id).not.toBe(page.items[0]!.tenant_id);
    expect(JSON.stringify(page)).not.toMatch(/identity_key|secret|credential|username|email|PLATFORM_ADMIN/);
    await expect(userIdentityTenantAccessList(db,identity(ids.admin),ids.target,undefined,{},undefined)).rejects.toMatchObject({statusCode:403});
    await expect(userIdentityTenantAccessList(db,identity(),ids.target,tenant,{},undefined)).rejects.toMatchObject({statusCode:403});
  });
  it('registered endpoint requires authentication and keeps generic assign tenant-only',async()=>{
    const app=buildApp(async()=>true,{database:db,fileStorage:new UnavailableFileStoragePort(),identityVerifier:{verifyBearerToken:async()=>identity()}});
    try{
      const url=`/api/v1/platform/tenants/${tenant}/users:onboard`;
      expect((await app.inject({method:'POST',url,payload:input()})).statusCode).toBe(401);
      const allowed=await app.inject({method:'POST',url,headers:{authorization:'Bearer isolated','idempotency-key':newUuidV7()},payload:input()});expect(allowed.statusCode).toBe(201);expect(allowed.headers['cache-control']).toBe('no-store');
      const generic=await app.inject({method:'POST',url:`/api/v1/memberships/${allowed.json().membership_id}/role-assignments`,headers:{authorization:'Bearer isolated','x-tcdx-tenant-id':tenant,'idempotency-key':newUuidV7()},payload:{role_id:newUuidV7(),scope_kind:'tenant'}});
      // Tenant-context resolution hides inaccessible Membership with canonical 404.
      expect(generic.statusCode).toBe(404);expect(generic.json().code).toBe("TCDX.RESOURCE.NOT_FOUND");
    }finally{await app.close();}
  });
});
