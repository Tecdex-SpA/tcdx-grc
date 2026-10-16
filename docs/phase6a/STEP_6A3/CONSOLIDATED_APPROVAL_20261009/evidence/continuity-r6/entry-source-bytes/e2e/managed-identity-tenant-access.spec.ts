import { expect,test,type Page } from '@playwright/test';
// Every API is an isolated fixture. No credentials appear in traces or automatic screenshots.
test.use({trace:'off',screenshot:'off'});
const person='01990000-0000-7000-8000-000000000001',tenant='01990000-0000-7000-8000-000000000002',member='01990000-0000-7000-8000-000000000003';
const roleIds=['01990000-0000-7000-8000-000000000004','01990000-0000-7000-8000-000000000005'];
const identity={user_identity_id:person,provider:'tcdx-managed-identity',issuer:'https://iam.grc.tecdex.net/realms/tcdx-managed-identity',subject_reference:'local-isolated-subject',username:'local.person',display_name:'Persona local',identity_lifecycle_state:'active',enabled:true,mfa_enrolled:false};
const company={tenant_id:tenant,display_name:'Empresa local',tenant_code:'LOCAL',lifecycle_state:'active'};
const roleCodes=['COMPLIANCE_MANAGER','EVIDENCE_OWNER'],names=['Responsable runtime','Custodio runtime'];
const permissions=['platform.managed_identity.read','platform.managed_identity.create','platform.tenant_user.onboard','platform.membership.read','platform.tenant.read','platform.role.read','platform.role.assign','platform.role.administer'];
const pageOf=(items:unknown[])=>({items,page:{has_more:false,next_cursor:null}});
async function fixture(page:Page,options:{existing?:boolean;partial?:boolean;deny?:boolean;readFailure?:boolean;noOnboard?:boolean;contaminated?:boolean}={}){
  const state={permissions:options.noOnboard?permissions.filter(p=>p!=='platform.tenant_user.onboard'):[...permissions],provisions:0,posts:[] as {body:Record<string,unknown>;key:string}[],reads:0,roleReads:0,revokePosts:0,assigned:options.existing?[0]:[] as number[],hasMember:!!options.existing,partial:!!options.partial,readFailure:!!options.readFailure};
  const credential=`local-fixture-${crypto.randomUUID()}`;
  await page.addInitScript(()=>sessionStorage.setItem('tcdx.access_token','central-isolated-session'));
  await page.route('**/api/v1/**',async route=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname,method=request.method();
    const problem=(status:number,details?:unknown)=>route.fulfill({status,json:{code:status===403?'TCDX.AUTHORIZATION.DENIED':'TCDX.DEPENDENCY.UNAVAILABLE',message:'Unsafe internal detail',correlation_id:person,retryable:status>=500,...(details?{details}:{})}});
    const progress=(pending:string[]=[])=>({tenant_id:tenant,user_identity_id:person,membership_id:member,completed_roles:state.assigned.map(i=>({role_code:roleCodes[i],membership_role_id:roleIds[i]})),pending_role_codes:pending});
    if(path==='/api/v1/access/me')return route.fulfill({json:{available_tenant_contexts:[],effective_platform_role_codes:['UNTRUSTED_ROLE_DISPLAY']}});
    if(path==='/api/v1/auth/me/authorization')return route.fulfill({json:{evaluated_at:new Date().toISOString(),platform_permissions:state.permissions,tenant_permissions:null}});
    if(path==='/api/v1/platform/managed-identities'&&method==='POST'){
      state.provisions++;expect(request.headers()['x-tcdx-tenant-id']).toBeUndefined();
      expect(request.postDataJSON()).toEqual({display_name:'Persona local',username:'local.person',person_verification_ref:'Verificación local'});
      return route.fulfill({status:201,json:{identity,credential_disclosed:true,temporary_credential:credential}});
    }
    if(path.startsWith('/api/v1/platform/managed-identities'))return route.fulfill({json:path.endsWith(person)?identity:pageOf([identity])});
    if(path===`/api/v1/platform/user-identities/${person}/tenant-access`){
      state.reads++;expect(request.headers()['x-tcdx-tenant-id']).toBeUndefined();
      if(state.readFailure&&state.posts.length){state.readFailure=false;return problem(503);}
      return route.fulfill({json:pageOf(state.hasMember?[{tenant_membership_id:member,tenant_id:tenant,user_identity_id:person,membership_state:'active',joined_at:'2026-01-01T00:00:00Z',ended_at:null,tenant:company,
        roles:state.assigned.map(i=>({membership_role_id:roleIds[i],role_id:roleIds[i],role_code:roleCodes[i],role_name:names[i],scope_kind:'tenant',valid_from:'2026-01-01T00:00:00Z',valid_to:null,etag:'a'.repeat(64)}))}]:[])});
    }
    if(path.includes('/platform-roles'))return route.fulfill({json:{items:[]}});
    if(path==='/api/v1/platform/tenants'){expect(request.headers()['x-tcdx-tenant-id']).toBeUndefined();return route.fulfill({json:pageOf([company])});}
    if(path==='/api/v1/roles'){
      expect(request.headers()['x-tcdx-tenant-id']).toBeUndefined();
      if(url.searchParams.get('assignable_family')==='platform')return route.fulfill({json:pageOf([{role_id:roleIds[0],role_code:'PLATFORM_SUPPORT',name:'Soporte de plataforma',ownership_class:'PLATFORM_CONTROL',tenant_id:null,lifecycle_state:'published',is_baseline:true}])});
      expect(url.searchParams.get('tenant_id')).toBe(tenant);state.roleReads++;
      return route.fulfill({json:pageOf(roleCodes.map((code,i)=>({role_id:roleIds[i],role_code:options.contaminated&&i===0?'PLATFORM_ADMIN':code,name:names[i],tenant_id:tenant,ownership_class:'TENANT_OWNED',lifecycle_state:'published'})))});
    }
    if(path===`/api/v1/platform/tenants/${tenant}/users:onboard`){
      expect(request.headers()['x-tcdx-tenant-id']).toBeUndefined();expect(url.search).toBe('');
      const body=request.postDataJSON();state.posts.push({body,key:request.headers()['idempotency-key']??''});expect(body).toEqual({user_identity_id:person,tenant_role_codes:body.tenant_role_codes,reason:'Verificación local'});expect(state.posts.at(-1)!.key).toBeTruthy();
      if(options.deny)return problem(403);
      state.hasMember=true;const chosen=(body.tenant_role_codes as string[]).map(code=>roleCodes.indexOf(code));
      if(state.partial){state.partial=false;state.assigned=[chosen[0]!];return problem(503,{tenant_user_onboarding_progress:progress(chosen.slice(1).map(i=>roleCodes[i]!))});}
      state.assigned=[...new Set([...state.assigned,...chosen])];
      // Receipt contains the requested roles only, while the canonical read retains other roles.
      return route.fulfill({status:201,json:{...progress(),completed_roles:chosen.map(i=>({role_code:roleCodes[i],membership_role_id:roleIds[i]}))}});
    }
    if(path===`/api/v1/role-assignments/${roleIds[0]}:revoke`){
      state.revokePosts++;expect(url.searchParams.get('tenant_id')).toBe(tenant);expect(request.headers()['x-tcdx-tenant-id']).toBeUndefined();
      expect(request.headers()['if-match']).toBe(`"${'a'.repeat(64)}"`);expect(request.headers()['idempotency-key']).toBeTruthy();expect(request.postDataJSON()).toEqual({reason:'Revisión local'});
      state.assigned=state.assigned.filter(i=>i!==0);return route.fulfill({status:202,json:{result:{}}});
    }
    return route.abort('blockedbyclient');
  });return {state,credential};
}
async function open(page:Page){await page.goto('/configuraciones/identidades-gestionadas');await page.getByRole('button',{name:'Ver detalle'}).click();await expect(page.getByRole('heading',{name:'Acceso a empresas',exact:true})).toBeVisible();}
async function provision(page:Page){await page.goto('/configuraciones/identidades-gestionadas');await page.getByRole('button',{name:'Provisionar identidad',exact:true}).click();
  await page.getByLabel('Nombre visible',{exact:true}).fill(identity.display_name);await page.getByLabel('Nombre de usuario',{exact:true}).fill(identity.username);await page.getByLabel('Referencia de verificación de persona').fill('Verificación local');
  await page.getByRole('button',{name:'Confirmar provisión'}).click();await expect(page.getByLabel('Credencial temporal emitida')).toBeVisible();}
async function association(page:Page,codes=[0]){await page.getByRole('button',{name:'Agregar acceso a empresa',exact:true}).click();await expect(page.getByLabel('Empresa',{exact:true})).toBeFocused();
  await expect(page.getByRole('checkbox')).toHaveCount(0);await page.getByLabel('Empresa',{exact:true}).selectOption(tenant);
  for(const i of codes)await page.getByRole('checkbox',{name:new RegExp(names[i]!)}).check();await page.getByLabel('Motivo de incorporación').fill('Verificación local');}
test('A identity-only provisioning is optional and never rediscloses its credential',async({page})=>{const {state,credential}=await fixture(page);await provision(page);
  await expect(page.getByRole('heading',{name:'Acceso a empresas (opcional)',exact:true})).toBeVisible();expect(state.roleReads).toBe(0);expect(state.posts).toHaveLength(0);
  await page.getByRole('button',{name:'Ya custodié la credencial'}).click();await expect(page.getByLabel('Credencial temporal emitida')).toHaveCount(0);
  await page.getByRole('button',{name:'Finalizar sólo con identidad'}).click();await page.getByRole('button',{name:'Ver detalle'}).click();await expect(page.getByRole('dialog')).not.toContainText(credential);
  expect(await page.evaluate(secret=>[localStorage,sessionStorage].some(store=>Object.values(store).some(v=>String(v).includes(secret))),credential)).toBe(false);expect(state.provisions).toBe(1);
});
for(const chosen of [[0],[0,1]])test(`B/C provision plus ${chosen.length} runtime tenant roles, server refetch and duplicate click`,async({page},info)=>{const {state}=await fixture(page);await provision(page);await page.getByRole('button',{name:'Ya custodié la credencial'}).click();await association(page,chosen);
  await expect(page.getByRole('option',{name:'Empresa local · LOCAL'})).toHaveCount(1);await expect(page.getByRole('checkbox',{name:/PLATFORM/})).toHaveCount(0);
  await page.getByRole('button',{name:'Incorporar a empresa',exact:true}).dblclick();await expect(page.getByRole('list',{name:'Empresas de esta identidad'})).toContainText(names[0]!);await expect(page.getByRole('alert',{name:'Resultado de acceso a empresas'})).toContainText('confirmados desde el servidor');
  expect(state.posts).toHaveLength(1);expect(state.reads).toBeGreaterThan(1);expect(state.provisions).toBe(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:`/tmp/tcdx-grc-mi-tenant-e2e-provision-${chosen.length}-${info.project.name}.png`,fullPage:true,mask:[page.getByLabel('Credencial temporal emitida')]});
});
test('D existing identity adds company access without reprovision or UUID labels',async({page})=>{const {state}=await fixture(page);await open(page);await association(page);await page.getByRole('button',{name:'Incorporar a empresa',exact:true}).click();
  await expect(page.getByRole('list',{name:'Empresas de esta identidad'})).toContainText('Membresía activa');expect(state.provisions).toBe(0);await expect(page.getByRole('dialog')).not.toContainText(tenant);await expect(page.getByRole('dialog')).not.toContainText(member);
});
test('E existing Membership displays current roles and adds roles without duplication',async({page})=>{const {state}=await fixture(page,{existing:true});await open(page);await expect(page.getByRole('list',{name:'Roles de Empresa local'})).toContainText(names[0]!);
  await page.getByRole('button',{name:'Administrar roles de Empresa local'}).click();await expect(page.getByText('Esta identidad ya tiene una membresía en esta empresa. Se conservarán sus roles actuales.')).toBeVisible();
  await page.getByRole('checkbox',{name:new RegExp(names[1]!)}).check();await page.getByLabel('Motivo de incorporación').fill('Verificación local');await page.getByRole('button',{name:'Incorporar a empresa',exact:true}).click();
  await expect(page.getByRole('list',{name:'Empresas de esta identidad'})).toContainText(names[1]!);expect(state.assigned).toEqual([0,1]);await expect(page.getByRole('list',{name:'Empresas de esta identidad'}).locator(':scope > li')).toHaveCount(1);
});
test('F/G platform selector remains Platform-only and tenant catalog is loaded only for the selected company',async({page})=>{const {state}=await fixture(page);await open(page);
  await page.getByRole('button',{name:'Asignar rol de plataforma',exact:true}).click();await expect(page.getByLabel('Rol de plataforma',{exact:true})).toContainText('Soporte de plataforma');await expect(page.getByLabel('Rol de plataforma',{exact:true})).not.toContainText(names[0]!);expect(state.roleReads).toBe(0);
  await page.getByRole('button',{name:'Cancelar cambio de rol'}).click();await association(page);expect(state.roleReads).toBe(1);await expect(page.getByRole('checkbox',{name:/Soporte de plataforma/})).toHaveCount(0);
});
test('J partial role failure retains identity and Membership, retry reuses exactly the original body/key',async({page})=>{const {state}=await fixture(page,{partial:true});await provision(page);await page.getByRole('button',{name:'Ya custodié la credencial'}).click();await association(page,[0,1]);await page.getByRole('button',{name:'Incorporar a empresa',exact:true}).click();
  await expect(page.getByRole('alert',{name:'Resultado de acceso a empresas'})).toContainText('Algunos roles quedaron pendientes');await expect(page.getByLabel('Empresa',{exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Continuar incorporación pendiente'}).click();await expect(page.getByRole('list',{name:'Empresas de esta identidad'})).toContainText(names[1]!);expect(state.posts[0]).toEqual(state.posts[1]);expect(state.provisions).toBe(1);await expect(page.getByLabel('Credencial temporal emitida')).toHaveCount(0);
});
test('K subscription denial explains the pending association and preserves the provisioned identity',async({page})=>{const {state}=await fixture(page,{deny:true});await provision(page);await association(page);await page.getByRole('button',{name:'Incorporar a empresa',exact:true}).click();
  await expect(page.getByRole('alert',{name:'Resultado de acceso a empresas'})).toContainText('CORE_PLATFORM');await expect(page.getByRole('alert',{name:'Resultado de acceso a empresas'})).toContainText('Acceso a empresa pendiente');expect(state.hasMember).toBe(false);expect(state.provisions).toBe(1);await expect(page.getByRole('dialog')).not.toContainText('Unsafe internal detail');
});
test('server-read failure after success permits refresh without repeating a mutation',async({page})=>{const {state}=await fixture(page,{readFailure:true});await open(page);await association(page);await page.getByRole('button',{name:'Incorporar a empresa',exact:true}).click();await expect(page.getByRole('alert',{name:'Resultado de acceso a empresas'})).toContainText('lectura sigue pendiente');
  await page.getByRole('button',{name:'Actualizar acceso a empresas'}).click();await expect(page.getByRole('alert',{name:'Resultado de acceso a empresas'})).toContainText('confirmados desde el servidor');expect(state.posts).toHaveLength(1);
});
test('effective permission revocation prevents the central POST without relying on role names',async({page})=>{const {state}=await fixture(page);await open(page);await association(page);state.permissions=state.permissions.filter(code=>code!=='platform.tenant_user.onboard');await page.getByRole('button',{name:'Incorporar a empresa',exact:true}).click();expect(state.posts).toHaveLength(0);await expect(page.getByRole('button',{name:'Agregar acceso a empresa'})).toHaveCount(0);
});
test('missing effective central permission exposes reads but never onboarding actions',async({page})=>{const {state}=await fixture(page,{noOnboard:true,existing:true});await open(page);await expect(page.getByRole('list',{name:'Empresas de esta identidad'})).toBeVisible();await expect(page.getByRole('button',{name:'Agregar acceso a empresa'})).toHaveCount(0);expect(state.posts).toHaveLength(0);
});
test('tenant catalog contamination fails closed without a usable role or submit control',async({page})=>{await fixture(page,{contaminated:true});await open(page);await page.getByRole('button',{name:'Agregar acceso a empresa'}).click();await page.getByLabel('Empresa',{exact:true}).selectOption(tenant);await expect(page.getByRole('alert',{name:'Resultado de acceso a empresas'})).toBeVisible();await expect(page.getByRole('checkbox')).toHaveCount(0);await expect(page.getByRole('button',{name:'Incorporar a empresa',exact:true})).toBeDisabled();
});
test('governed tenant role revocation uses explicit target, ETag, reason, idempotency and canonical refetch',async({page})=>{const {state}=await fixture(page,{existing:true});await open(page);await page.getByRole('button',{name:`Revocar rol de empresa ${names[0]}`}).click();await page.getByLabel('Motivo de revocación').fill('Revisión local');await page.getByRole('button',{name:'Confirmar revocación de rol de empresa'}).dblclick();await expect(page.getByRole('alert',{name:'Resultado de acceso a empresas'})).toContainText('revocado');expect(state.revokePosts).toBe(1);await expect(page.getByRole('list',{name:'Empresas de esta identidad'})).toContainText('Sin roles activos.');
});
test('M/N/O separated access sections preserve branding, responsive containment and keyboard focus',async({page},info)=>{await fixture(page,{existing:true});await open(page);await expect(page.getByRole('heading',{name:'Roles de plataforma',exact:true})).toBeVisible();await expect(page.getByRole('dialog')).not.toContainText('Keycloak');await expect(page.getByRole('dialog')).not.toContainText('TCDX Managed Identity');
  await page.getByRole('button',{name:'Agregar acceso a empresa'}).click();await expect(page.getByLabel('Empresa',{exact:true})).toBeFocused();await page.keyboard.press('Tab');await expect(page.getByLabel('Motivo de incorporación')).toBeFocused();
  await page.getByRole('button',{name:'Cerrar acceso a empresa'}).click();await expect(page.getByRole('button',{name:'Agregar acceso a empresa'})).toBeFocused();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:`/tmp/tcdx-grc-mi-tenant-e2e-detail-${info.project.name}.png`,fullPage:true});await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:'Ver detalle'})).toBeFocused();
});
