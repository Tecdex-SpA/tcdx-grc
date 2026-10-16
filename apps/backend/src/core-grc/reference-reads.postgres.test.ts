import {readFileSync} from 'node:fs';
import {CompiledQuery} from 'kysely';
import {generateKeyPairSync} from 'node:crypto';
import {ApplicationTokenService} from '../security/application-token.js';
import {describe,it,expect} from 'vitest';
import {loadConfig} from '../config.js';
import {createDatabase,sql} from '../database.js';
import {buildApp} from '../app.js';
import {UnavailableFileStoragePort} from '../ports/file-storage.js';
import {newUuidV7} from '../uuid.js';
import {assertAssignableMembership,assertSelectableFramework} from './reference-reads.js';
import type {CoreGrcDependencies} from './model.js';
const enabled=process.env.TCDX_STEP6A3_REFERENCE_POSTGRES==='true';
const cases=['isolates framework root and version, preserves native int64','membership assignment returns active same-tenant minimal references','historical exact member remains visible after inactivation','revoked role permission is revalidated on each HTTP read','membership revocation invalidates actor authority','unbound retention selection fails closed','assignment rejects ended or inactive identity at command instant','foreign parent and arbitrary history member are concealed','framework command revalidates publication, dates and root tenant','duplicate human labels fail closed without exposing identities','bounded keyset pages unbounded names without loss, repetition or microsecond truncation','publication reconciles an existing baseline tenant role without custom or admin escalation'] as const;
describe.skipIf(!enabled)('STEP6A3 canonical PostgreSQL references — rollback only',()=> {
 for(const scenario of cases) it(scenario,async()=> {
  if(process.env.DATABASE_HOST!=='127.0.0.1' || !['55432','55436'].includes(process.env.DATABASE_PORT??'') || !process.env.TCDX_STEP6A3_PG_SYSTEM_IDENTIFIER) throw new Error('Disposable instance attestation required');
  const db=createDatabase(loadConfig(process.env));const ids={tenant:newUuidV7(),foreign:newUuidV7(),principal:newUuidV7(),assignee:newUuidV7(),foreignUser:newUuidV7(),actorMember:newUuidV7(),member:newUuidV7(),foreignMember:newUuidV7(),role:newUuidV7(),framework:newUuidV7(),version:newUuidV7(),foreignFramework:newUuidV7(),foreignVersion:newUuidV7(),issue:newUuidV7(),action:newUuidV7(),policy:newUuidV7()};
  const roleCode=scenario===cases[5]?'EVIDENCE_OWNER':'GRC_MANAGER';
  const rollback=new Error('ROLLBACK_ONLY_LOCAL_REFERENCE_TEST');
  try {
   const sys=await sql<{id:string}>`SELECT system_identifier::text AS id FROM pg_control_system()`.execute(db);expect(sys.rows[0]?.id).toBe(process.env.TCDX_STEP6A3_PG_SYSTEM_IDENTIFIER);
   await db.transaction().execute(async tx=> {
    await sql`INSERT INTO iam.user_identities(user_identity_id,identity_key,display_name,lifecycle_state) VALUES(${ids.principal}::uuid,${ids.principal},'Actor','active'),(${ids.assignee}::uuid,${ids.assignee},'Responsable','active'),(${ids.foreignUser}::uuid,${ids.foreignUser},'Persona ajena','active')`.execute(tx);
    await sql`INSERT INTO platform.tenants(tenant_id,tenant_code,legal_name,display_name,default_timezone) VALUES(${ids.tenant}::uuid,${ids.tenant},'Local','Local','America/Santiago'),(${ids.foreign}::uuid,${ids.foreign},'Ajeno','Ajeno','UTC')`.execute(tx);
    await sql`INSERT INTO iam.tenant_memberships(tenant_membership_id,tenant_id,user_identity_id,membership_state,joined_at) VALUES(${ids.actorMember}::uuid,${ids.tenant}::uuid,${ids.principal}::uuid,'active',transaction_timestamp()-interval '1 day'),(${ids.member}::uuid,${ids.tenant}::uuid,${ids.assignee}::uuid,'active',transaction_timestamp()-interval '1 day'),(${ids.foreignMember}::uuid,${ids.foreign}::uuid,${ids.foreignUser}::uuid,'active',transaction_timestamp()-interval '1 day')`.execute(tx);
    await sql`INSERT INTO platform.subscriptions(subscription_id,tenant_id,plan_version_id,subscription_code,lifecycle_state,starts_at) SELECT ${newUuidV7()}::uuid,${ids.tenant}::uuid,pv.plan_version_id,${ids.tenant},'active',transaction_timestamp()-interval '1 day' FROM platform.plan_versions pv JOIN platform.plans p USING(plan_id) WHERE p.plan_code='GRC'`.execute(tx);
    await sql`INSERT INTO iam.roles(role_id,ownership_class,tenant_id,role_code,name,lifecycle_state,is_baseline) VALUES(${ids.role}::uuid,'TENANT_OWNED',${ids.tenant}::uuid,${roleCode},'Local baseline consumer','published',true)`.execute(tx);
    const permissionRows=await sql<{permission_id:string}>`SELECT p.permission_id FROM iam.role_permissions rp JOIN iam.roles r USING(role_id) JOIN iam.permissions p USING(permission_id) WHERE r.role_code=${roleCode} AND r.tenant_id IS NULL AND r.is_baseline`.execute(tx);
    for(const row of permissionRows.rows) await sql`INSERT INTO iam.role_permissions(role_permission_id,ownership_class,tenant_id,role_id,permission_id) VALUES(${newUuidV7()}::uuid,'TENANT_OWNED',${ids.tenant}::uuid,${ids.role}::uuid,${row.permission_id}::uuid)`.execute(tx);
    const publicationActor=await sql<{id:string}>`SELECT actor_service_principal_id::text AS id FROM ops_audit.audit_events WHERE event_code='audit.iam.role_permission.publish.v1' AND tenant_id IS NULL LIMIT 1`.execute(tx);
    await sql`SELECT set_config('tcdx.publication_service_principal_id',${publicationActor.rows[0]!.id},true)`.execute(tx);
    await tx.executeQuery(CompiledQuery.raw(readFileSync(new URL('../../../../docs/phase6a/STEP_6A3/rbac-publication/20261009000300_phase6a3_role_permission_publication.sql',import.meta.url),'utf8')));
    await sql`INSERT INTO iam.membership_roles(membership_role_id,tenant_id,tenant_membership_id,role_id,scope_kind,valid_from) VALUES(${newUuidV7()}::uuid,${ids.tenant}::uuid,${ids.actorMember}::uuid,${ids.role}::uuid,'tenant',transaction_timestamp()-interval '1 day')`.execute(tx);
    await sql`INSERT INTO regulatory.frameworks(framework_id,ownership_class,tenant_id,framework_code,name,source_type,lifecycle_state) VALUES(${ids.framework}::uuid,'TENANT_OWNED',${ids.tenant}::uuid,'LOCAL','Marco local','internal','published'),(${ids.foreignFramework}::uuid,'TENANT_OWNED',${ids.foreign}::uuid,'FOREIGN','Oculto','internal','published')`.execute(tx);
    await sql`INSERT INTO regulatory.framework_versions(framework_version_id,ownership_class,tenant_id,framework_id,version_number,edition,lifecycle_state,content_hash,effective_from) VALUES(${ids.version}::uuid,'TENANT_OWNED',${ids.tenant}::uuid,${ids.framework}::uuid,9223372036854775807,'Local','published',${'a'.repeat(64)},transaction_timestamp()-interval '1 day'),(${ids.foreignVersion}::uuid,'TENANT_OWNED',${ids.foreign}::uuid,${ids.foreignFramework}::uuid,1,'Ajeno','published',${'b'.repeat(64)},transaction_timestamp()-interval '1 day')`.execute(tx);
    await sql`INSERT INTO remediation.issues(issue_id,tenant_id,issue_code,issue_kind,title,description,lifecycle_state,severity,priority) VALUES(${ids.issue}::uuid,${ids.tenant}::uuid,'LOCAL','finding','Local','Local','open','minor','normal')`.execute(tx);
    await sql`INSERT INTO remediation.actions(action_id,tenant_id,issue_id,action_code,title,description,lifecycle_state,priority,assigned_membership_id) VALUES(${ids.action}::uuid,${ids.tenant}::uuid,${ids.issue}::uuid,'LOCAL','Local','Local','planned','normal',${ids.member}::uuid)`.execute(tx);
    const key=generateKeyPairSync('rsa',{modulusLength:2048});
    const cursor=await ApplicationTokenService.create({issuer:'disposable-reference-test',audience:'disposable-reference-test',keyId:'local-key',algorithm:'RS256',privateKey:key.privateKey.export({format:'pem',type:'pkcs8'}).toString(),publicKey:key.publicKey.export({format:'pem',type:'spki'}).toString(),maxLifetimeSeconds:300,clockToleranceSeconds:0});
    const app=buildApp(async()=>true,{database:tx as unknown as CoreGrcDependencies['database'],identityVerifier:{verifyBearerToken:async()=>({principalClass:'HUMAN_INTERACTIVE',principalId:ids.principal,tokenId:newUuidV7(),expiresAt:new Date(Date.now()+60000)})},fileStorage:new UnavailableFileStoragePort(),runtimeEnvironment:'production',referenceCursor:cursor});
    const get=(url:string)=>app.inject({url,headers:{authorization:'Bearer simulated-local-IAM','x-tcdx-tenant-id':ids.tenant}});
    try {
     if(scenario===cases[0]) {const r=await get('/api/v1/framework-version-references');expect(r.statusCode).toBe(200);expect(r.body).toContain('9223372036854775807');expect(r.json().items.map((i:{framework_version_id:string})=>i.framework_version_id)).toEqual([ids.version]);expect(r.body).not.toMatch(/FOREIGN|Oculto/);}
     if(scenario===cases[1]) {const r=await get(`/api/v1/membership-references?purpose=action-assignment&issue_id=${ids.issue}`);expect(r.statusCode).toBe(200);expect(r.json().items.map((i:{tenant_membership_id:string})=>i.tenant_membership_id).sort()).toEqual([ids.member,ids.actorMember].sort());expect(Object.keys(r.json().items[0]).sort()).toEqual(['tenant_membership_id','display_name','joined_at','selectable'].sort());expect(r.body).not.toMatch(/Persona ajena|user_identity_id|email/);}
     if(scenario===cases[2]) {await sql`UPDATE iam.tenant_memberships SET membership_state='inactive',ended_at=clock_timestamp() WHERE tenant_membership_id=${ids.member}::uuid`.execute(tx);const r=await get(`/api/v1/membership-references?purpose=action-history&action_id=${ids.action}&filter[tenant_membership_id]=${ids.member}`);expect(r.statusCode).toBe(200);expect(r.json().items).toHaveLength(1);expect(r.json().items[0].selectable).toBe(false);}
     if(scenario===cases[3]) {expect((await get('/api/v1/framework-version-references')).statusCode).toBe(200);await sql`DELETE FROM iam.role_permissions WHERE role_id=${ids.role}::uuid AND permission_id IN(SELECT permission_id FROM iam.permissions WHERE permission_code='compliance.framework.read')`.execute(tx);expect((await get('/api/v1/framework-version-references')).statusCode).toBe(403);}
     if(scenario===cases[4]) {await sql`UPDATE iam.tenant_memberships SET membership_state='inactive',ended_at=clock_timestamp() WHERE tenant_membership_id=${ids.actorMember}::uuid`.execute(tx);expect((await get('/api/v1/framework-version-references')).statusCode).toBe(404);}
     if(scenario===cases[5]) {await sql`INSERT INTO privacy.retention_policies(retention_policy_id,ownership_class,tenant_id,policy_code,version_number,policy_kind,retention_seconds,trigger_event_code,precedence_rank,is_mandatory,lifecycle_state,effective_from) VALUES(${ids.policy}::uuid,'TENANT_OWNED',${ids.tenant}::uuid,'LOCAL',1,'tenant_policy',0,'expiry_or_closure',200,false,'published',transaction_timestamp()-interval '1 day')`.execute(tx);const r=await get('/api/v1/retention-policy-references?purpose=evidence');expect(r.statusCode).toBe(422);}
     if(scenario===cases[6]) {await assertAssignableMembership(tx,ids.tenant,ids.member);await sql`UPDATE iam.user_identities SET lifecycle_state='inactive' WHERE user_identity_id=${ids.assignee}::uuid`.execute(tx);await expect(assertAssignableMembership(tx,ids.tenant,ids.member)).rejects.toMatchObject({statusCode:404});await sql`UPDATE iam.user_identities SET lifecycle_state='active' WHERE user_identity_id=${ids.assignee}::uuid`.execute(tx);await sql`UPDATE iam.tenant_memberships SET ended_at=clock_timestamp() WHERE tenant_membership_id=${ids.member}::uuid`.execute(tx);await expect(assertAssignableMembership(tx,ids.tenant,ids.member)).rejects.toMatchObject({statusCode:404});}
     if(scenario===cases[11]) {
      const admin=newUuidV7(),custom=newUuidV7();
      await sql`INSERT INTO iam.roles(role_id,ownership_class,tenant_id,role_code,name,lifecycle_state,is_baseline) VALUES(${admin}::uuid,'TENANT_OWNED',${ids.tenant}::uuid,'TENANT_ADMIN','Existing admin','published',true),(${custom}::uuid,'TENANT_OWNED',${ids.tenant}::uuid,'LOCAL_CUSTOM','Existing custom','published',false)`.execute(tx);
      await sql`DELETE FROM iam.role_permissions WHERE permission_id IN(SELECT permission_id FROM iam.permissions WHERE permission_code IN('compliance.framework.read','platform.membership_reference.read','privacy.retention_policy_reference.read'))`.execute(tx);
      await sql`DELETE FROM iam.permissions WHERE permission_code IN('compliance.framework.read','platform.membership_reference.read','privacy.retention_policy_reference.read')`.execute(tx);
      await sql`DELETE FROM platform.schema_migrations WHERE migration_id='20261009000200'`.execute(tx);
      const migration=readFileSync(new URL('../../../../database/migrations/20261009000200_phase6a3_reference_read_permissions.sql',import.meta.url),'utf8');
      await tx.executeQuery(CompiledQuery.raw(migration));
      const rows=await sql<{role_id:string;n:number}>`SELECT rp.role_id,count(*)::int AS n FROM iam.role_permissions rp JOIN iam.permissions p USING(permission_id) WHERE rp.tenant_id=${ids.tenant}::uuid AND p.permission_code IN('compliance.framework.read','platform.membership_reference.read','privacy.retention_policy_reference.read') GROUP BY rp.role_id`.execute(tx);
      expect(rows.rows).toEqual([{role_id:ids.role,n:3}]);
      const total=await sql<{n:number}>`SELECT count(*)::int AS n FROM iam.role_permissions rp JOIN iam.permissions p USING(permission_id) WHERE rp.tenant_id IS NULL AND p.permission_code IN('compliance.framework.read','platform.membership_reference.read','privacy.retention_policy_reference.read')`.execute(tx);expect(total.rows[0]?.n).toBe(44);
      const memberships=await sql<{n:number}>`SELECT count(*)::int AS n FROM iam.membership_roles WHERE tenant_id=${ids.tenant}::uuid`.execute(tx);expect(memberships.rows[0]?.n).toBe(1);
     }
     if(scenario===cases[10]) {
      await sql`UPDATE iam.user_identities SET display_name=${'a'.repeat(10000)} WHERE user_identity_id=${ids.principal}::uuid`.execute(tx);
      await sql`UPDATE iam.user_identities SET display_name=${'b'.repeat(10000)} WHERE user_identity_id=${ids.assignee}::uuid`.execute(tx);
      const r=await get(`/api/v1/membership-references?purpose=action-assignment&issue_id=${ids.issue}&page[size]=1`);
      expect(r.statusCode).toBe(200);const first=r.json();expect(first.page.next_cursor.length).toBeLessThanOrEqual(2048);const next=await get(`/api/v1/membership-references?purpose=action-assignment&issue_id=${ids.issue}&page[size]=1&page[cursor]=${encodeURIComponent(first.page.next_cursor)}`);expect(next.statusCode).toBe(200);expect(new Set([...first.items,...next.json().items].map((i:{tenant_membership_id:string})=>i.tenant_membership_id)).size).toBe(2);expect(next.json().page.has_more).toBe(false);expect([...first.items,...next.json().items].every((i:{display_name:string})=>i.display_name.length===10000)).toBe(true);
     }
     if(scenario===cases[9]) {
      await sql`UPDATE iam.user_identities SET display_name='Actor' WHERE user_identity_id=${ids.assignee}::uuid`.execute(tx);
      const r=await get(`/api/v1/membership-references?purpose=action-assignment&issue_id=${ids.issue}`);
      expect(r.statusCode).toBe(409);expect(r.body).not.toMatch(/display_name|user_identity_id|email|Persona ajena/);
     }
     if(scenario===cases[8]) {
      const actor={tenantId:ids.tenant,runtimeEnvironment:'production'} as Parameters<typeof assertSelectableFramework>[1];
      await assertSelectableFramework(tx,actor,ids.version);
      await expect(assertSelectableFramework(tx,actor,ids.foreignVersion)).rejects.toMatchObject({statusCode:404});
      await sql`UPDATE regulatory.frameworks SET lifecycle_state='draft' WHERE framework_id=${ids.framework}::uuid`.execute(tx);
      await expect(assertSelectableFramework(tx,actor,ids.version)).rejects.toMatchObject({statusCode:404});
      await sql`UPDATE regulatory.frameworks SET lifecycle_state='published' WHERE framework_id=${ids.framework}::uuid`.execute(tx);
      await sql`UPDATE regulatory.framework_versions SET effective_to=clock_timestamp() WHERE framework_version_id=${ids.version}::uuid`.execute(tx);
      await expect(assertSelectableFramework(tx,actor,ids.version)).rejects.toMatchObject({statusCode:404});
     }
     if(scenario===cases[7]) {expect((await get(`/api/v1/membership-references?purpose=action-assignment&issue_id=${newUuidV7()}`)).statusCode).toBe(404);expect((await get(`/api/v1/membership-references?purpose=action-history&action_id=${ids.action}&filter[tenant_membership_id]=${ids.foreignMember}`)).statusCode).toBe(404);}
    }finally{await app.close();}
    throw rollback;
   });
  }catch(error){if(error!==rollback)throw error;}
  finally {
   const leftover=await sql<{n:string}>`SELECT count(*)::text AS n FROM platform.tenants WHERE tenant_id=ANY(${[ids.tenant,ids.foreign]}::uuid[])`.execute(db);expect(leftover.rows[0]?.n).toBe('0');await db.destroy();
  }
 });
});
