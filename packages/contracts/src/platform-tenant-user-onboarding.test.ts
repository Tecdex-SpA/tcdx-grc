import { describe,expect,it } from 'vitest';
import YAML from 'yaml';
import { Ajv2020 } from 'ajv/dist/2020.js';
import apiSource from '../../../docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml?raw';
import source from '../../../docs/executable-contracts/26_PLATFORM_TENANT_USER_ONBOARDING.md?raw';
import sql from '../../../database/migrations/20261007000100_platform_tenant_user_onboarding_permission_publication.sql?raw';
import manifest from '../../../database/migrations/manifest.json?raw';
import projectionSource from '../../../apps/backend/src/security/permission-projection-catalog.generated.ts?raw';
const permissionProjectionCatalog=JSON.parse(projectionSource.slice(projectionSource.indexOf(' = ')+3).trim().slice(0,-1));
const api=YAML.parse(apiSource),ajv=new Ajv2020({strict:false,validateFormats:false});ajv.addSchema({$id:'urn:tcdx:central',components:api.components});
const check=(name:string,value:unknown)=>ajv.compile({$ref:`urn:tcdx:central#/components/schemas/${name}`})(value);
const id='01900000-0000-7000-8000-000000000001';
describe('Human-approved Platform central onboarding executable contracts',()=>{
  it('publishes narrow platform-only capability and preserves tenant generic assign',()=>{
    expect(permissionProjectionCatalog['platform.tenant_user.onboard']).toEqual({capabilities:['CORE_PLATFORM'],scopes:['platform']});
    const command=api.paths['/platform/tenants/{tenant_id}/users:onboard'].post;expect(command.operationId).toBe('tenantUserOnboardingCreate');
    expect(command['x-tcdx-permission']).toBe('`platform.tenant_user.onboard`');expect(command['x-tcdx-scope']).toBe('platform');
    expect(api.paths['/memberships/{membership_id}/role-assignments'].post['x-tcdx-scope']).toBe('tenant');
    expect(api.paths['/platform/user-identities/{user_identity_id}/tenant-access'].get['x-tcdx-permission']).toBe('`platform.membership.read`');
    expect(source).toContain('Actor receives zero Membership/tenant role');
  });
  it('closed request rejects authority keys and credentials',()=>{
    const input={user_identity_id:id,tenant_role_codes:['VIEWER'],reason:'Verified person'};expect(check('TenantUserOnboardingRequest',input)).toBe(true);
    for(const field of ['email','username','tenant_id','actor','password','identity_key','bootstrap'])expect(check('TenantUserOnboardingRequest',{...input,[field]:'forbidden'})).toBe(false);
    expect(check('TenantUserOnboardingRequest',{...input,tenant_role_codes:['VIEWER','VIEWER']})).toBe(false);
  });
  it('partial result cannot be success and errors contain only safe allowlisted progress',()=>{
    const progress={tenant_id:id,user_identity_id:id,membership_id:id,completed_roles:[],pending_role_codes:['VIEWER']};
    expect(check('TenantUserOnboardingResult',progress)).toBe(false);expect(check('TenantUserOnboardingResult',{...progress,pending_role_codes:[]})).toBe(true);
    const error={code:'TCDX.DEPENDENCY.UNAVAILABLE',message:'Safe',correlation_id:id,retryable:true,details:{tenant_user_onboarding_progress:progress}};
    expect(check('TenantUserOnboardingError',error)).toBe(true);expect(check('TenantUserOnboardingError',{...error,details:{...error.details,password:'forbidden'}})).toBe(false);
  });
  it('one DATA-ONLY next migration preserves baseline and grants only PlatformAdmin',()=>{
    const rows=JSON.parse(manifest).migrations;expect(rows.find((row: { id: string }) => row.id === '20261007000100')).toMatchObject({id:'20261007000100',transactional:true});
    expect(rows[27]).toMatchObject({id:'20261006000200',sha256:'fa7d34a7f33044b8ee02478211c67a6c1c36ee64df0e0d2de57a60101d157c22'});
    expect(sql).not.toMatch(/\b(?:CREATE|ALTER|DROP|TRUNCATE)\s+(?:TABLE|SCHEMA|INDEX|TYPE|VIEW|FUNCTION)/i);
    expect(sql).not.toMatch(/INSERT INTO iam\.(?:roles|user_identities|tenant_memberships|membership_roles|platform_role_assignments)\b/i);
    expect(sql).toContain("r.role_code='PLATFORM_ADMIN'");expect(sql).toContain("resource_code='tenant_user' AND action_code='onboard'");
  });
});
