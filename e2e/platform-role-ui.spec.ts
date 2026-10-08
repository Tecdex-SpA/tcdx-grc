import { expect, test, type Page } from "@playwright/test";
// Canonical local Playwright fixtures only; every API request is intercepted.
test.use({trace:'off',screenshot:'off'});
const target='0199bf70-2891-75c4-9563-a7c128d014ca', assignmentId='0199bf70-2890-75c4-9563-a7c128d014ca',tenant='0199bf70-2892-75c4-9563-a7c128d014ca';
const identity={user_identity_id:target,provider:'tcdx-managed-identity',issuer:'https://iam.grc.tecdex.net/realms/tcdx-managed-identity',subject_reference:'synthetic-platform-ui',username:'persona-sintetica',display_name:'Identidad sintética',identity_lifecycle_state:'active',enabled:true,mfa_enrolled:false};
const assignment={platform_role_assignment_id:assignmentId,user_identity_id:target,role_code:'PLATFORM_SUPPORT',role_name:'Soporte canónico del servidor',valid_from:'2026-10-06T00:00:00Z',valid_to:null};
const role={role_id:'0199bf70-2893-75c4-9563-a7c128d014ca',role_code:'PLATFORM_SUPPORT',name:'Soporte canónico del servidor',ownership_class:'PLATFORM_CONTROL',tenant_id:null,is_baseline:true,lifecycle_state:'published'};
const all=['platform.managed_identity.read','platform.role.administer','platform.role.read'];
async function fixture(page:Page,options:{permissions?:string[];active?:boolean;readError?:number;catalogError?:number;mutationError?:number;uncertain?:boolean;refreshError?:boolean}={}){
  const state={items:options.active?[assignment]:[],reads:0,catalogReads:0,posts:[] as {path:string;body:Record<string,unknown>;key:string}[],permissions:options.permissions??all,authorizations:0};
  await page.addInitScript(()=>sessionStorage.setItem('tcdx.access_token','p2d-r-synthetic-session'));
  await page.route('**/api/v1/**',async route=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname;
    const problem=async(status:number)=>route.fulfill({status,contentType:'application/problem+json',body:JSON.stringify({code:status===409?'TCDX.CONFLICT.RESOURCE':status===404?'TCDX.RESOURCE.NOT_FOUND':status===403?'TCDX.AUTHORIZATION.DENIED':status===401?'TCDX.AUTHENTICATION.REQUIRED':'TCDX.VALIDATION.FAILED',message:'Internal error detail must not be displayed',correlation_id:assignmentId,retryable:false})});
    if(path==='/api/v1/access/me')return route.fulfill({json:{available_tenant_contexts:[{tenant_id:tenant,tenant_display_name:'Empresa sintética',tenant_membership_id:tenant,membership_state:'active',effective_role_codes:['TENANT_ADMIN']}],effective_platform_role_codes:['PLATFORM_ADMIN']}});
    if(path==='/api/v1/auth/me/authorization'){
      state.authorizations++;
      return route.fulfill({json:{evaluated_at:new Date().toISOString(),platform_permissions:state.permissions,tenant_permissions:{tenant_id:tenant,permissions:{'platform.role.read':[{scope_kind:'tenant'}]}}}});
    }
    if(path.startsWith('/api/v1/platform/managed-identities'))return route.fulfill({json:path.endsWith(target)?identity:{items:[identity],page:{has_more:false,next_cursor:null}}});
    if(path.startsWith('/api/v1/platform/user-identities/')||path==='/api/v1/roles'){
      expect(request.headers()['x-tcdx-tenant-id']).toBeUndefined();expect(url.searchParams.has('tenant_id')).toBe(false);
      if(path==='/api/v1/roles'){
        state.catalogReads++;expect(url.searchParams.get('assignable_family')).toBe('platform');
        return options.catalogError?problem(options.catalogError):route.fulfill({json:{items:[role],page:{has_more:false,next_cursor:null}}});
      }
      expect(path.startsWith(`/api/v1/platform/user-identities/${target}/platform-roles`)).toBe(true);
      if(request.method()==='GET'){
        state.reads++;
        if(options.readError||(options.refreshError&&state.posts.length))return problem(options.readError??403);
        return route.fulfill({json:{items:state.items}});
      }
      const body=request.postDataJSON(),key=request.headers()['idempotency-key']??'';
      state.posts.push({path,body,key});expect(key).toBeTruthy();expect(body).not.toHaveProperty('tenant_id');
      if(options.uncertain)return route.abort('failed');
      if(options.mutationError)return problem(options.mutationError);
      state.items=path.endsWith(':revoke')?[]:[assignment];
      // POST response is deliberately not used as a role-list authority.
      return route.fulfill({status:path.endsWith(':revoke')?200:201,json:{...assignment,role_name:'POST result must not become authoritative'}});
    }
    return route.abort('blockedbyclient');
  });
  return state;
}
async function open(page:Page){
  await page.goto('/configuraciones/identidades-gestionadas');
  await page.getByRole('button',{name:'Ver detalle'}).click();
  await expect(page.getByRole('heading',{name:'Roles de plataforma',exact:true})).toBeVisible();
}
async function assignForm(page:Page){
  await page.getByRole('button',{name:'Asignar rol de plataforma',exact:true}).click();
  await expect(page.getByLabel('Rol de plataforma',{exact:true})).toBeFocused();
  await page.getByLabel('Rol de plataforma',{exact:true}).selectOption(role.role_code);
  await page.getByLabel('Motivo del cambio de rol').fill('  Decisión sintética explícita  ');
  await expect(page.getByRole('form',{name:'Asignar rol de plataforma'})).toBeVisible();
  expect(await page.getByRole('form',{name:'Asignar rol de plataforma'}).evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
}
test('navigation, identity selection, empty state and catalog remain distinct from tenant roles',async({page})=>{
  const state=await fixture(page);await open(page);
  await expect(page.getByText('Esta identidad no tiene roles de plataforma vigentes.')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Los roles de empresa/tenant se administran por separado');
  await assignForm(page);await expect(page.getByRole('option',{name:'Soporte canónico del servidor · PLATFORM_SUPPORT'})).toHaveCount(1);
  await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Confirmar asignación de rol'})).toBeFocused();
  await page.keyboard.press('Shift+Tab');await expect(page.getByLabel('Motivo del cambio de rol')).toBeFocused();
  await expect(page.getByRole('option',{name:/Tenant Admin/})).toHaveCount(0);
  await page.getByLabel('Motivo del cambio de rol').fill('   ');await page.getByRole('button',{name:'Confirmar asignación de rol'}).click();
  await expect(page.getByRole('alert')).toContainText('motivo no vacío');expect(state.posts).toHaveLength(0);
  await expect(page.getByLabel('Motivo del cambio de rol')).toHaveAttribute('aria-invalid','true');
  await page.getByRole('button',{name:'Cancelar cambio de rol'}).click();
  await expect(page.getByRole('button',{name:'Actualizar roles de plataforma'})).toBeFocused();
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Ver detalle'})).toBeFocused();
});
test('assign and revoke send exact IDs/payloads/fresh keys and refetch server state without optimistic authority',async({page},info)=>{
  const state=await fixture(page);await open(page);await assignForm(page);
  await page.getByRole('button',{name:'Confirmar asignación de rol'}).dblclick();
  const list=page.getByRole('list',{name:'Asignaciones de plataforma vigentes'});
  await expect(list).toContainText(assignment.role_name);await expect(page.getByRole('dialog')).not.toContainText('POST result');
  expect(state.posts).toHaveLength(1);expect(state.reads).toBe(2);expect(state.posts[0]!.body).toEqual({role_code:role.role_code,reason:'Decisión sintética explícita'});
  await expect(page.getByRole('dialog')).not.toContainText(assignmentId);
  await expect(page.getByRole('button',{name:'Actualizar roles de plataforma'})).toBeFocused();
  expect(await page.evaluate(()=>Array.from(document.querySelectorAll<HTMLElement>('body *')).filter(element=>element.getBoundingClientRect().right>innerWidth+1).map(element=>({tag:element.tagName,class:element.className,right:element.getBoundingClientRect().right}))), 'Responsive elements must fit the viewport').toEqual([]);
  await page.screenshot({path:`/tmp/tcdx-grc-mi10-p2d-r-roles-${info.project.name}.png`,fullPage:true});
  await page.getByRole('button',{name:`Revocar rol ${assignment.role_name}`}).click();
  await expect(page.getByLabel('Motivo del cambio de rol')).toBeFocused();
  await page.getByLabel('Motivo del cambio de rol').fill('Revocación sintética explícita');
  await page.getByRole('button',{name:'Confirmar revocación de rol'}).dblclick();
  await expect(page.getByText('Esta identidad no tiene roles de plataforma vigentes.')).toBeVisible();
  expect(state.reads).toBe(3);expect(state.posts).toHaveLength(2);
  expect(state.posts[1]!.path).toBe(`/api/v1/platform/user-identities/${target}/platform-roles/${assignmentId}:revoke`);
  expect(state.posts[1]!.body).toEqual({reason:'Revocación sintética explícita'});
  expect(state.posts[0]!.key).not.toBe(state.posts[1]!.key);
  for(const post of state.posts)expect(await page.evaluate(key=>[localStorage,sessionStorage].some(store=>Object.values(store).includes(key)),post.key)).toBe(false);
});
test('role-name and tenant grants cannot expose admin actions without effective platform permission',async({page})=>{
  const state=await fixture(page,{permissions:['platform.managed_identity.read','platform.role.read']});await open(page);
  await expect(page.getByRole('button',{name:'Asignar rol de plataforma'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:/Revocar rol/})).toHaveCount(0);expect(state.reads).toBe(0);
});
test('missing catalog permission never supplies a hardcoded option while revoke remains independent',async({page})=>{
  const state=await fixture(page,{permissions:['platform.managed_identity.read','platform.role.administer'],active:true});await open(page);
  await expect(page.getByRole('button',{name:'Asignar rol de plataforma'})).toBeDisabled();
  await expect(page.getByText('El catálogo requiere el permiso de lectura de roles de plataforma.')).toBeVisible();
  await expect(page.getByRole('button',{name:`Revocar rol ${assignment.role_name}`})).toBeEnabled();expect(state.catalogReads).toBe(0);
});
test('fresh permission revocation prevents POST even after opening the confirmation',async({page})=>{
  const state=await fixture(page);await open(page);await assignForm(page);
  state.permissions=state.permissions.filter(code=>code!=='platform.role.administer');
  await page.getByRole('button',{name:'Confirmar asignación de rol'}).click();
  await expect(page.getByText('El permiso ya no está vigente. No se envió la operación.')).toBeVisible();expect(state.posts).toHaveLength(0);
});
for(const status of [400,401,403,404,409])test(`assignment read ${status} is an error rather than an empty collection`,async({page})=>{
  await fixture(page,{readError:status});await open(page);
  await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByRole('dialog')).not.toContainText('Internal error');
  await expect(page.getByText('Esta identidad no tiene roles de plataforma vigentes.')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Asignar rol de plataforma'})).toBeDisabled();
});
test('catalog failure stays unavailable and does not fabricate options',async({page})=>{
  await fixture(page,{catalogError:403});await open(page);
  await expect(page.getByRole('alert')).toContainText('No tienes autorización');await expect(page.getByRole('button',{name:'Asignar rol de plataforma'})).toBeDisabled();
});
test('last platform administrator conflict preserves the exact server-rendered assignment',async({page})=>{
  const state=await fixture(page,{active:true,mutationError:409});await open(page);
  await page.getByRole('button',{name:`Revocar rol ${assignment.role_name}`}).click();
  await page.getByLabel('Motivo del cambio de rol').fill('Decisión sintética');await page.getByRole('button',{name:'Confirmar revocación de rol'}).click();
  await expect(page.getByRole('alert')).toContainText('protección del último administrador');
  await expect(page.getByRole('list',{name:'Asignaciones de plataforma vigentes'})).toContainText(assignment.role_name);
  expect(state.posts).toHaveLength(1);expect(state.reads).toBe(1);
});
test('uncertain transport result blocks retries until explicit server read and a new intention',async({page})=>{
  const state=await fixture(page,{uncertain:true});await open(page);await assignForm(page);
  await page.getByRole('button',{name:'Confirmar asignación de rol'}).click();
  await expect(page.getByRole('alert')).toContainText('No repitas la operación');await expect(page.getByRole('button',{name:'Confirmar asignación de rol'})).toBeDisabled();expect(state.posts).toHaveLength(1);
  await page.getByRole('button',{name:'Actualizar roles de plataforma'}).click();
  await expect(page.getByRole('button',{name:'Asignar rol de plataforma',exact:true})).toBeEnabled();
  await expect(page.getByRole('alert')).toContainText('Estado actualizado desde el servidor.');
  await expect(page.getByText('Resultado pendiente de verificación.',{exact:false})).toHaveCount(0);
  await assignForm(page);await page.getByRole('button',{name:'Confirmar asignación de rol'}).click();
  await expect(page.getByRole('alert')).toContainText('No repitas');expect(state.posts).toHaveLength(2);expect(state.posts[0]!.key).not.toBe(state.posts[1]!.key);
});
test('successful POST with failed refetch never inserts authoritative optimistic state',async({page})=>{
  const state=await fixture(page,{refreshError:true});await open(page);await assignForm(page);
  await page.getByRole('button',{name:'Confirmar asignación de rol'}).click();
  await expect(page.getByText('El servidor confirmó la operación, pero no se pudo actualizar la lectura. Actualiza el estado antes de otra acción.')).toBeVisible();
  await expect(page.getByRole('list',{name:'Asignaciones de plataforma vigentes'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Confirmar asignación de rol'})).toBeDisabled();expect(state.posts).toHaveLength(1);
});
