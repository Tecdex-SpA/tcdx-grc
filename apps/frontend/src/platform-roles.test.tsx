import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import source from "./platform-roles.tsx?raw";
import { ApiClient, ApiProblem } from "./api-client.js";
import { PlatformRoleWorkspace, loadPlatformRoleCatalog, parsePlatformAssignments, platformRoleError, sendPlatformRoleChange } from "./platform-roles.js";
const target = '0199bf70-2891-75c4-9563-a7c128d014ca', assignmentId = '0199bf70-2890-75c4-9563-a7c128d014ca';
const assignment = { platform_role_assignment_id: assignmentId, user_identity_id: target, role_code: 'SERVER_CODE', role_name:'Rol canónico del servidor',valid_from:'2026-10-06T00:00:00Z',valid_to:null };
const role = { role_id:assignmentId,role_code:'SERVER_CODE',name:'Rol canónico del servidor',ownership_class:'PLATFORM_CONTROL',tenant_id:null,is_baseline:true,lifecycle_state:'published' };
const page=(items:unknown[],next_cursor:string|null=null)=>({items,page:{has_more:!!next_cursor,next_cursor}});
const api = () => new ApiClient('https://grc.tecdex.net',{getAccessToken:async()=> 'local-unit-fixture',clearSession:vi.fn()},()=>({tenantId:'selected-tenant-fixture'}));
afterEach(()=>vi.unstubAllGlobals());
describe('P2D-R target and catalog consumption',()=>{
  it('accepts empty and canonical assignments while excluding unwanted fields',()=>{
    expect(parsePlatformAssignments({items:[]},target)).toEqual([]);
    expect(parsePlatformAssignments({items:[{...assignment,secret:'ignored',membership:'ignored'}]},target)).toEqual([assignment]);
    for(const value of [{items:[{...assignment,user_identity_id:'foreign'}]},{items:[{...assignment,valid_from:'invalid'}]},{items:[assignment,assignment]},{}]) expect(()=>parsePlatformAssignments(value,target)).toThrow();
  });
  it('keeps nonnull validity metadata without interpreting a local clock',()=>{
    const item={...assignment,valid_to:'2030-01-01T00:00:00Z'};
    expect(parsePlatformAssignments({items:[item]},target)).toEqual([item]);
  });
  it('follows canonical catalog pagination and keeps canonical codes rather than UUIDs',async()=>{
    const requests: string[]=[];
    const client={platformGet:vi.fn(async(path:string)=>{requests.push(path);return requests.length===1?page([role],'cursor+1'):page([{...role,role_code:'SECOND_SERVER_CODE'}]);})} as unknown as ApiClient;
    expect(await loadPlatformRoleCatalog(client)).toEqual([{role_code:'SERVER_CODE',name:role.name},{role_code:'SECOND_SERVER_CODE',name:role.name}]);
    expect(requests).toEqual(['/api/v1/roles?assignable_family=platform','/api/v1/roles?assignable_family=platform&page%5Bcursor%5D=cursor%2B1']);
    expect(await loadPlatformRoleCatalog({platformGet:async()=>page([])} as unknown as ApiClient)).toEqual([]);
  });
  it.each([{...role,ownership_class:'TENANT_OWNED'},{...role,tenant_id:'foreign'},{...role,is_baseline:false},{...role,lifecycle_state:'draft'}])('rejects an incompatible catalog response rather than silently making it available: %j',async bad=>{
    await expect(loadPlatformRoleCatalog({platformGet:async()=>page([bad])} as unknown as ApiClient)).rejects.toThrow();
  });
  it('does not turn catalog failure, ambiguous codes or cyclic cursors into an empty collection',async()=>{
    await expect(loadPlatformRoleCatalog({platformGet:async()=>{throw new ApiProblem({code:'TCDX.AUTHORIZATION.DENIED',message:'Denied',correlation_id:'fixture',retryable:false},403);}} as unknown as ApiClient)).rejects.toMatchObject({status:403});
    for(const value of [page([role,role]),{items:[],page:{has_more:true,next_cursor:null}}]) await expect(loadPlatformRoleCatalog({platformGet:async()=>value} as unknown as ApiClient)).rejects.toThrow();
  });
});
describe('P2D-R exact mutation boundary',()=>{
  it('sends assign/revoke exact payloads, fresh keys and no selected tenant context',async()=>{
    const requests:{url:string;init:RequestInit}[]=[];
    vi.stubGlobal('fetch',vi.fn(async(url:URL,init:RequestInit)=>{requests.push({url:String(url),init});return new Response('{}',{status:200});}));
    const client=api();
    await sendPlatformRoleChange(client,target,{kind:'assign',role_code:role.role_code,reason:'  Decisión explícita  '});
    await sendPlatformRoleChange(client,target,{kind:'revoke',platform_role_assignment_id:assignmentId,reason:' Revocación explícita '});
    expect(requests.map(r=>new URL(r.url).pathname)).toEqual([`/api/v1/platform/user-identities/${target}/platform-roles`,`/api/v1/platform/user-identities/${target}/platform-roles/${assignmentId}:revoke`]);
    expect(requests.map(r=>JSON.parse(String(r.init.body)))).toEqual([{role_code:'SERVER_CODE',reason:'Decisión explícita'},{reason:'Revocación explícita'}]);
    const keys=requests.map(r=>new Headers(r.init.headers).get('idempotency-key'));
    expect(keys[0]).toBeTruthy();expect(keys[1]).toBeTruthy();expect(keys[0]).not.toBe(keys[1]);
    expect(requests.every(r=>!new Headers(r.init.headers).has('x-tcdx-tenant-id') && !r.url.includes('tenant_id'))).toBe(true);
  });
  it.each(['','   ','x'.repeat(2001)])('requires a bounded explicit reason',reason=>{
    expect(()=>sendPlatformRoleChange({} as ApiClient,target,{kind:'assign',role_code:role.role_code,reason})).toThrow();
    expect(()=>sendPlatformRoleChange({} as ApiClient,target,{kind:'revoke',platform_role_assignment_id:assignmentId,reason})).toThrow();
  });
  it.each([401,403,400,404,409])('propagates canonical HTTP %i without optimistic success or retry',async status=>{
    const fetch=vi.fn(async()=>new Response(JSON.stringify({code:'TCDX.CONFLICT.RESOURCE',message:'internal detail',correlation_id:'fixture',retryable:false}),{status}));vi.stubGlobal('fetch',fetch);
    await expect(sendPlatformRoleChange(api(),target,{kind:'assign',role_code:role.role_code,reason:'Decisión explícita'})).rejects.toMatchObject({status});
    expect(fetch).toHaveBeenCalledTimes(1);
    const message=platformRoleError(new ApiProblem({code:'TCDX.CONFLICT.RESOURCE',message:'stack trace/internal detail',correlation_id:'fixture',retryable:false},status),true);
    expect(message).not.toContain('stack trace');if(status===409)expect(message).toContain('último administrador');
  });
  it('treats unknown transport outcomes as uncertain',()=>{expect(platformRoleError(new Error('unsafe network detail'),true)).toContain('No repitas');});
});
describe('P2D-R effective permission presentation',()=>{
  const render=(permissions:string[])=>renderToStaticMarkup(<PlatformRoleWorkspace api={{} as ApiClient} targetId={target} permissions={new Set(permissions)} authorizeFresh={async()=>false} onBusyChange={()=>undefined} onEditingChange={()=>undefined}/>);
  it('has no admin action without exact administer permission; read grants do not promote tenant authority',()=>{
    expect(render([])).not.toContain('Asignar rol de plataforma');
    expect(render(['platform.role.read'])).not.toContain('Asignar rol de plataforma');
    expect(render(['platform.role.administer'])).toContain('Asignar rol de plataforma');
    expect(render(['platform.role.administer'])).toContain('El catálogo requiere');
    expect(render(['platform.role.administer','platform.role.read'])).toContain('Cargando catálogo');
  });
  it('contains no local role or identity authority, persistent intentions or backend alterations',()=>{
    expect(source).not.toMatch(/PLATFORM_ADMIN|PLATFORM_SUPPORT|andres\.grc|localStorage|sessionStorage|effective_platform_role_codes/);
    expect(source).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(source).toContain('platform.role.administer');expect(source).toContain('assignable_family=platform');
  });
});
