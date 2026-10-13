import {readFileSync} from 'node:fs';
import {CompiledQuery} from 'kysely';
import {describe,it,expect} from 'vitest';
import {loadConfig} from '../config.js';
import {createDatabase,sql} from '../database.js';
import {buildApp} from '../app.js';
import {UnavailableFileStoragePort} from '../ports/file-storage.js';
import type {CoreGrcDependencies} from '../core-grc/model.js';
import {newUuidV7} from '../uuid.js';
import {RBAC_RESOLUTION_R3} from '@tcdx-grc/contracts';
import {requireRbacResolutionR3} from './reference-publication.js';
import {tenantBootstrapInTransaction} from './platform-iam-service.js';
import type {PlatformActor} from './platform-authority.js';
const enabled=process.env.TCDX_STEP6A3_REFERENCE_POSTGRES==='true';
const scenarios=['reconciles populated baseline roles and preserves custom grants/membership/history','materializes approved eleven readers with per-grant audit and no AUDITOR action grant','rejects corrupt receipt and inactive publication actor without fake repair'] as const;
describe.skipIf(!enabled)('R3 isolated PostgreSQL — transaction rollback',()=> {
 for(const scenario of scenarios) it(scenario,async()=> {
  if(process.env.DATABASE_HOST!=='127.0.0.1'||!['55432','55436'].includes(process.env.DATABASE_PORT??'')||!process.env.TCDX_STEP6A3_PG_SYSTEM_IDENTIFIER)throw new Error('Disposable instance attestation required');
  const db=createDatabase(loadConfig(process.env));const rollback=new Error('R3_ROLLBACK_ONLY');
  const ids={tenant:newUuidV7(),human:newUuidV7(),admin:newUuidV7(),auditor:newUuidV7(),viewer:newUuidV7(),custom:newUuidV7(),member:newUuidV7(),assignment:newUuidV7()};
  try {
   expect((await sql<{id:string}>`SELECT system_identifier::text AS id FROM pg_control_system()`.execute(db)).rows[0]?.id).toBe(process.env.TCDX_STEP6A3_PG_SYSTEM_IDENTIFIER);
   await db.transaction().execute(async tx=> {
    const sp=(await sql<{id:string}>`SELECT actor_service_principal_id::text AS id FROM ops_audit.audit_events WHERE command_code='phase6a3RolePermissionPublication' AND tenant_id IS NULL LIMIT 1`.execute(tx)).rows[0]!.id;
    await sql`SELECT set_config('tcdx.publication_service_principal_id',${sp},true)`.execute(tx);
    await sql`INSERT INTO iam.user_identities(user_identity_id,identity_key,display_name,lifecycle_state) VALUES(${ids.human}::uuid,${ids.human},'Local actor','active'),(${ids.admin}::uuid,${ids.admin},'Local tenant admin','active')`.execute(tx);
    await sql`INSERT INTO platform.tenants(tenant_id,tenant_code,legal_name,display_name,default_timezone,lifecycle_state) VALUES(${ids.tenant}::uuid,${ids.tenant},'Local','Local','America/Santiago','active')`.execute(tx);
    if(scenario===scenarios[0]) {
     await sql`INSERT INTO iam.roles(role_id,ownership_class,tenant_id,role_code,name,lifecycle_state,is_baseline) VALUES(${ids.auditor}::uuid,'TENANT_OWNED',${ids.tenant}::uuid,'AUDITOR','Local auditor','published',true),(${ids.viewer}::uuid,'TENANT_OWNED',${ids.tenant}::uuid,'VIEWER','Local viewer','published',true),(${ids.custom}::uuid,'TENANT_OWNED',${ids.tenant}::uuid,'LOCAL_CUSTOM','Local custom','published',false)`.execute(tx);
     await sql`INSERT INTO iam.role_permissions(role_permission_id,ownership_class,tenant_id,role_id,permission_id) SELECT gen_random_uuid(),'TENANT_OWNED',${ids.tenant}::uuid,r.role_id,p.permission_id FROM iam.roles r CROSS JOIN iam.permissions p WHERE r.role_id=ANY(${[ids.auditor,ids.custom]}::uuid[]) AND p.permission_code='remediation.action.create'`.execute(tx);
     await sql`INSERT INTO iam.tenant_memberships(tenant_membership_id,tenant_id,user_identity_id,membership_state,joined_at) VALUES(${ids.member}::uuid,${ids.tenant}::uuid,${ids.human}::uuid,'active',clock_timestamp())`.execute(tx);
     await sql`INSERT INTO iam.membership_roles(membership_role_id,tenant_id,tenant_membership_id,role_id,scope_kind,valid_from) VALUES(${ids.assignment}::uuid,${ids.tenant}::uuid,${ids.member}::uuid,${ids.viewer}::uuid,'tenant',clock_timestamp())`.execute(tx);
    }
    await tx.executeQuery(CompiledQuery.raw(readFileSync(new URL('../../../../docs/phase6a/STEP_6A3/rbac-publication/20261009000400_phase6a3_rbac_resolution.sql',import.meta.url),'utf8')));
    expect(await requireRbacResolutionR3(tx,true)).toBe(sp);
    if(scenario===scenarios[0]) {
     const rows=(await sql<{role_id:string;permission_code:string}>`SELECT rp.role_id,p.permission_code FROM iam.role_permissions rp JOIN iam.permissions p USING(permission_id) WHERE rp.tenant_id=${ids.tenant}::uuid ORDER BY rp.role_id`.execute(tx)).rows;
     expect(rows).toHaveLength(2);expect(rows).toContainEqual({role_id:ids.custom,permission_code:'remediation.action.create'});expect(rows).toContainEqual({role_id:ids.viewer,permission_code:'compliance.requirement.read'});
     expect((await sql`SELECT membership_role_id FROM iam.membership_roles WHERE membership_role_id=${ids.assignment}::uuid`.execute(tx)).rows).toHaveLength(1);
     const audits=(await sql<{before_payload:Record<string,unknown>;after_payload:Record<string,unknown>}>`SELECT before_payload,after_payload FROM ops_audit.audit_events WHERE tenant_id=${ids.tenant}::uuid AND command_code=${RBAC_RESOLUTION_R3.command_code}`.execute(tx)).rows;expect(audits).toHaveLength(2);expect(audits.some(a=>a.before_payload.present===true&&a.after_payload.present===false&&a.before_payload.row_snapshot)).toBe(true);
    }
    if(scenario===scenarios[1]) {
     const actor:PlatformActor={identity:{principalClass:'HUMAN_INTERACTIVE',principalId:ids.human,tokenId:newUuidV7(),expiresAt:new Date(Date.now()+60000)},permissions:new Set(['platform.tenant.create']),roles:['PLATFORM_ADMIN']};
     await tenantBootstrapInTransaction(tx,actor,{tenantId:ids.tenant,userIdentityId:ids.admin,correlationId:newUuidV7()});
     const audits=(await sql<{n:number}>`SELECT count(*)::int AS n FROM ops_audit.audit_events WHERE tenant_id=${ids.tenant}::uuid AND command_code=${RBAC_RESOLUTION_R3.command_code} AND before_payload->>'present'='false' AND after_payload->>'present'='true' AND after_payload->>'receipt_sha256'=${RBAC_RESOLUTION_R3.receipt_sha256} AND actor_service_principal_id=${sp}::uuid AND actor_user_identity_id IS NULL`.execute(tx)).rows;expect(audits[0]?.n).toBe(11);
     await sql`INSERT INTO platform.subscriptions(subscription_id,tenant_id,plan_version_id,subscription_code,lifecycle_state,starts_at) SELECT ${newUuidV7()}::uuid,${ids.tenant}::uuid,pv.plan_version_id,${ids.tenant},'active',transaction_timestamp()-interval '1 day' FROM platform.plan_versions pv JOIN platform.plans p USING(plan_id) WHERE p.plan_code='GRC'`.execute(tx);
     const framework=newUuidV7(),version=newUuidV7();
     await sql`INSERT INTO regulatory.frameworks(framework_id,ownership_class,tenant_id,framework_code,name,source_type,lifecycle_state) VALUES(${framework}::uuid,'TENANT_OWNED',${ids.tenant}::uuid,'LOCAL_R3','Marco local','internal','published')`.execute(tx);
     await sql`INSERT INTO regulatory.framework_versions(framework_version_id,ownership_class,tenant_id,framework_id,version_number,edition,lifecycle_state,content_hash,effective_from) VALUES(${version}::uuid,'TENANT_OWNED',${ids.tenant}::uuid,${framework}::uuid,1,'Local','published',${'a'.repeat(64)},transaction_timestamp()-interval '1 day')`.execute(tx);
     const member=(await sql<{id:string}>`SELECT tenant_membership_id::text AS id FROM iam.tenant_memberships WHERE tenant_id=${ids.tenant}::uuid AND user_identity_id=${ids.admin}::uuid`.execute(tx)).rows[0]!.id;
     const app=buildApp(async()=>true,{database:tx as unknown as CoreGrcDependencies['database'],identityVerifier:{verifyBearerToken:async()=>({principalClass:'HUMAN_INTERACTIVE',principalId:ids.admin,tokenId:newUuidV7(),expiresAt:new Date(Date.now()+60000)})},fileStorage:new UnavailableFileStoragePort()});
     const get=(id=version)=>app.inject({url:`/api/v1/framework-versions/${id}/requirements`,headers:{authorization:'Bearer local-synthetic-IAM','x-tcdx-tenant-id':ids.tenant}});
     try {
      for(const code of RBAC_RESOLUTION_R3.reader_roles) {
       await sql`DELETE FROM iam.membership_roles WHERE tenant_id=${ids.tenant}::uuid AND tenant_membership_id=${member}::uuid`.execute(tx);
       await sql`INSERT INTO iam.membership_roles(membership_role_id,tenant_id,tenant_membership_id,role_id,scope_kind,valid_from) SELECT ${newUuidV7()}::uuid,${ids.tenant}::uuid,${member}::uuid,role_id,'tenant',transaction_timestamp()-interval '1 second' FROM iam.roles WHERE tenant_id=${ids.tenant}::uuid AND role_code=${code}`.execute(tx);
       const result=await get();expect(result.statusCode,code).toBe(200);expect(result.json().items).toEqual([]);expect((await get(newUuidV7())).statusCode).toBe(404);
      }
      await sql`UPDATE iam.membership_roles SET scope_kind='assigned_object' WHERE tenant_id=${ids.tenant}::uuid AND tenant_membership_id=${member}::uuid`.execute(tx);expect((await get()).statusCode).toBe(403);
      await sql`UPDATE iam.membership_roles SET scope_kind='tenant' WHERE tenant_id=${ids.tenant}::uuid AND tenant_membership_id=${member}::uuid`.execute(tx);
      await sql`UPDATE platform.subscriptions SET lifecycle_state='inactive' WHERE tenant_id=${ids.tenant}::uuid`.execute(tx);expect((await get()).statusCode).toBe(403);
      await sql`UPDATE platform.subscriptions SET lifecycle_state='active' WHERE tenant_id=${ids.tenant}::uuid`.execute(tx);
      await sql`UPDATE iam.membership_roles SET valid_to=transaction_timestamp()-interval '1 millisecond' WHERE tenant_id=${ids.tenant}::uuid AND tenant_membership_id=${member}::uuid`.execute(tx);expect((await get()).statusCode).toBe(403);
     }finally{await app.close();}
     expect((await sql`SELECT rp.role_permission_id FROM iam.role_permissions rp JOIN iam.roles r USING(role_id) JOIN iam.permissions p USING(permission_id) WHERE rp.tenant_id=${ids.tenant}::uuid AND r.role_code='AUDITOR' AND p.permission_code='remediation.action.create'`.execute(tx)).rows).toHaveLength(0);
    }
    if(scenario===scenarios[2]) {
     await sql`UPDATE iam.service_principals SET lifecycle_state='inactive' WHERE service_principal_id=${sp}::uuid`.execute(tx);await expect(requireRbacResolutionR3(tx,true)).rejects.toMatchObject({statusCode:503});await sql`UPDATE iam.service_principals SET lifecycle_state='active' WHERE service_principal_id=${sp}::uuid`.execute(tx);
     await sql`UPDATE ops_audit.audit_events SET after_payload=after_payload||'{"receipt_sha256":"wrong"}'::jsonb WHERE command_code=${RBAC_RESOLUTION_R3.command_code}`.execute(tx);await expect(requireRbacResolutionR3(tx,true)).rejects.toMatchObject({statusCode:503});
    }
    throw rollback;
   });
  }catch(e){if(e!==rollback)throw e;}finally{await db.destroy();}
 });
});
