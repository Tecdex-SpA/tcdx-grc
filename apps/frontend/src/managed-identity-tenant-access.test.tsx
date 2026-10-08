import { describe,expect,it,vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ApiClient,ApiProblem } from './api-client.js';
import { CentralTenantUserIntent,loadCompanyOptions,loadCompanyTenantRoles,loadCompanyAccess,ManagedIdentityTenantAccess,companyAccessError,centralOnboardingCode } from './managed-identity-tenant-access.js';
const tenant='01900000-0000-7000-8000-000000000001',person='01900000-0000-7000-8000-000000000002',member='01900000-0000-7000-8000-000000000003';
const page=(items:unknown[],cursor:string|null=null)=>({items,page:{has_more:!!cursor,next_cursor:cursor}});
const api=(methods:Record<string,unknown>)=>methods as unknown as ApiClient;
const progress={tenant_id:tenant,user_identity_id:person,membership_id:member,completed_roles:[{role_code:'VIEWER',membership_role_id:member}],pending_role_codes:[]};
describe('Central tenant access presentation and transport boundaries',()=>{
  it('loads company names/codes from paginated server catalog, without tenant header',async()=>{
    const get=vi.fn().mockResolvedValueOnce(page([{tenant_id:tenant,display_name:'Company',tenant_code:'CO',lifecycle_state:'active'}],'next'))
      .mockResolvedValueOnce(page([{tenant_id:'inactive',display_name:'Unavailable',tenant_code:'OFF',lifecycle_state:'suspended'}]));
    expect(await loadCompanyOptions(api({platformGet:get}))).toEqual([{tenant_id:tenant,display_name:'Company',tenant_code:'CO',lifecycle_state:'active'}]);
    expect(get.mock.calls[1]?.[0]).toContain('page%5Bcursor%5D=next');
  });
  it('uses selected runtime tenant roles and excludes global Platform templates and foreign rows',async()=>{
    const row={role_id:member,role_code:'VIEWER',name:'Runtime Viewer',tenant_id:tenant,ownership_class:'TENANT_OWNED',lifecycle_state:'published'};
    const get=vi.fn().mockResolvedValue(page([row,{...row,role_id:'foreign',tenant_id:'foreign'},{...row,tenant_id:null,ownership_class:'PLATFORM_CONTROL',role_code:'PLATFORM_ADMIN'}]));
    expect(await loadCompanyTenantRoles(api({platformGet:get}),tenant)).toEqual([row]);
    expect(get.mock.calls[0]?.[0]).toBe(`/api/v1/roles?tenant_id=${tenant}`);
  });
  it('rejects platform contamination even when row claims tenant ownership',async()=>{
    await expect(loadCompanyTenantRoles(api({platformGet:async()=>page([{role_id:member,role_code:'PLATFORM_ADMIN',name:'Contaminated',tenant_id:tenant,ownership_class:'TENANT_OWNED',lifecycle_state:'published'}])}),tenant)).rejects.toThrow();
  });
  it('rejects malformed/repeated page cursors instead of silently truncating catalogs',async()=>{
    await expect(loadCompanyOptions(api({platformGet:async()=>page([],'same')}))).rejects.toThrow('INVALID_CURSOR');
  });
  it('targets only canonical identity for access read and rejects another identity result',async()=>{
    const get=vi.fn().mockResolvedValue(page([]));await loadCompanyAccess(api({platformGet:get}),person);
    expect(get.mock.calls[0]?.[0]).toBe(`/api/v1/platform/user-identities/${person}/tenant-access`);
    await expect(loadCompanyAccess(api({platformGet:async()=>page([{user_identity_id:'foreign'}])}),person)).rejects.toThrow();
  });
  it('preserves one key and original body through partial failure and continuation',async()=>{
    const pending={...progress,completed_roles:[],pending_role_codes:['VIEWER']};
    const post=vi.fn().mockRejectedValueOnce(new ApiProblem({code:'TCDX.DEPENDENCY.UNAVAILABLE',message:'Safe error',correlation_id:person,retryable:true,
      details:{tenant_user_onboarding_progress:pending}},503)).mockResolvedValueOnce(progress);
    const intent=new CentralTenantUserIntent(tenant,person,['VIEWER'],'Verified person');
    await expect(intent.run(api({platformPost:post}))).rejects.toBeInstanceOf(ApiProblem);expect(intent.progress).toEqual(pending);
    expect(await intent.run(api({platformPost:post}))).toEqual(progress);expect(intent.completed).toBe(true);
    expect(post.mock.calls[0]).toEqual(post.mock.calls[1]);expect(post.mock.calls[0]?.[1]).toEqual({user_identity_id:person,tenant_role_codes:['VIEWER'],reason:'Verified person'});
    expect(JSON.stringify(post.mock.calls)).not.toMatch(/credential|password|username|email/);
  });
  it('duplicate concurrent click never sends a second mutation',async()=>{
    let resolve!:(value:unknown)=>void;const post=vi.fn(()=>new Promise(r=>{resolve=r;}));
    const intent=new CentralTenantUserIntent(tenant,person,['VIEWER'],'Verified person'),first=intent.run(api({platformPost:post}));
    await expect(intent.run(api({platformPost:post}))).rejects.toThrow('INTENT_IN_PROGRESS');expect(post).toHaveBeenCalledTimes(1);resolve(progress);await first;
  });
  it('refuses incomplete or foreign success receipt',async()=>{
    for(const value of [{...progress,pending_role_codes:['VIEWER']},{...progress,user_identity_id:'foreign'},{...progress,completed_roles:[]}]){
      const intent=new CentralTenantUserIntent(tenant,person,['VIEWER'],'Verified person');await expect(intent.run(api({platformPost:async()=>value}))).rejects.toThrow();expect(intent.completed).toBe(false);
    }
  });
  it('explicitly explains subsequent subscription rejection without claiming access',()=>{
    expect(companyAccessError(new ApiProblem({code:'TCDX.AUTHORIZATION.DENIED',message:'Safe',correlation_id:person,retryable:false},403))).toContain('CORE_PLATFORM');
  });
  it('effective permissions control central onboarding; role names confer none',()=>{
    const render=(codes:string[])=>renderToStaticMarkup(<ManagedIdentityTenantAccess api={api({})} userId={person} permissions={new Set(codes)} authorizeFresh={async()=>false}
      intents={new Map()} onBusyChange={()=>{}} onEditingChange={()=>{}}/>);
    expect(render([centralOnboardingCode,'platform.tenant.read','platform.role.read','platform.membership.read'])).toContain('Agregar acceso a empresa');
    for(const codes of [[],['PLATFORM_ADMIN'],['TENANT_ADMIN'],[centralOnboardingCode],['platform.role.assign','platform.membership.read']])expect(render(codes)).not.toContain('Agregar acceso a empresa');
    expect(render(['platform.membership.read'])).toContain('Acceso a empresas');expect(render(['platform.membership.read'])).not.toContain('Roles de plataforma');
  });
});
