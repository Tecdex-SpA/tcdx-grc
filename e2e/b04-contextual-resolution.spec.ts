import {test,expect,type Page} from '@playwright/test';
import {contextualFixture,tenant,control,otherControl,fixtureId,now} from '../apps/backend/src/configuration/control-definition-references.test-support.js';
async function isolated(page:Page){
 const fixture=contextualFixture();const requests:{path:string;body:unknown}[]=[];
 await page.addInitScript(id=>{sessionStorage.setItem('tcdx.access_token','b04-isolated');sessionStorage.setItem('tcdx.tenant_id',id);},tenant);
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname;
  if(url.origin==='http://127.0.0.1:4184'&&!path.startsWith('/api/')){await route.continue();return;}
  if(!path.startsWith('/api/')){await route.abort();return;}
  if(path==='/api/v1/access/me'){await route.fulfill({json:{available_tenant_contexts:[{tenant_id:tenant,tenant_display_name:'Empresa sintética',tenant_membership_id:fixtureId(5),membership_state:'active',effective_role_codes:['GRC_MANAGER']}],effective_platform_role_codes:[]}});return;}
  if(path==='/api/v2/auth/me/authorization'){await route.fulfill({json:{evaluated_at:now,platform_permissions:[],tenant_permissions:{tenant_id:tenant,default_timezone:'America/Santiago',permissions:Object.fromEntries(['configuration.configuration_override.create','controls.control.read'].map(p=>[p,[{scope_kind:'tenant'}]]))}}});return;}
  const parent=(n:number)=>({control_id:fixtureId(n),tenant_id:tenant,ownership_class:'TENANT_OWNED',control_code:n===30?'CTRL-A':'CTRL-B',name:n===30?'Control sintético A':'Control sintético B',lifecycle_state:'active'});
  if(path==='/api/v1/controls'){await route.fulfill({json:{items:[parent(30),parent(31)],page:{has_more:false,next_cursor:null}}});return;}
  if(path==='/api/v1/controls/'+fixtureId(30)||path==='/api/v1/controls/'+fixtureId(31)){const n=path.endsWith(fixtureId(30))?30:31;await route.fulfill({json:{...parent(n),versions:[{control_id:fixtureId(n),control_version_id:n===30?control:otherControl,tenant_id:tenant,version_number:1,lifecycle_state:'active'}]}});return;}
  if(path.endsWith('/configuration-definition-references')||path==='/api/v1/configuration-overrides'){
   const body=req.method()==='POST'?req.postDataJSON():undefined;requests.push({path,body});
   // Actual canonical Fastify composition, actor resolution, policy, SQL and command functions.
   // The only persistence substitute is the isolated SQL executor fixture; no DB/network exists.
   const response=await fixture.app.inject({method:req.method() as 'GET'|'POST',url:path+url.search,headers:req.headers(),...(body?{payload:body}:{})});
   await route.fulfill({status:response.statusCode,contentType:'application/json',headers:{'cache-control':'no-store'},body:response.body});return;
  }
  await route.abort();
 });
 return {...fixture,requests};
}
async function selectControl(page:Page,n=30){
 await page.getByLabel('Control de la organización',{exact:true}).selectOption(fixtureId(n));
 await page.getByLabel('Versión de control',{exact:true}).selectOption(n===30?control:otherControl);
}
async function fillProposal(page:Page,id:string){
 await page.getByLabel('Parámetro a personalizar').selectOption(id);
 const valueField=page.getByRole('combobox',{name:'Valor propuesto',exact:true}).or(page.getByRole('textbox',{name:'Valor propuesto',exact:true}));
 await expect(valueField).toBeVisible();
 if(await valueField.evaluate(el=>el.tagName==='SELECT'))await valueField.selectOption('monthly');else await valueField.fill('Propuesta sintética del navegador');
 await page.getByLabel('Vigente desde',{exact:true}).fill('2026-10-23T09:00');
 await page.getByLabel('Vigente hasta',{exact:true}).fill('2026-12-23T09:00');
 await page.getByLabel('Fundamento de la propuesta').fill('Validación aislada del flujo B04.');
}
test('creates initial B04 using real canonical handlers without Platform or override-read permission',async({page},info)=>{
 const f=await isolated(page);try{
  await page.goto('/normas?tab=ajustes');await selectControl(page);
  await expect(page.getByLabel('Parámetro a personalizar')).toBeVisible();
  await fillProposal(page,f.state.definitions[0]!.configuration_definition_id);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath('b04-create-form.png'),fullPage:true});
  await page.getByRole('button',{name:'Guardar propuesta',exact:true}).click();
  await expect(page.getByText('Propuesta guardada como borrador.',{exact:false})).toBeVisible();
  expect(f.state.overrides).toHaveLength(1);expect(f.state.overrides[0]).toMatchObject({configuration_definition_id:f.state.definitions[0]!.configuration_definition_id,tenant_id:tenant,lifecycle_state:'draft'});
  expect(f.state.statements.filter(q=>q.sql.includes('INSERT INTO ops_audit.audit_events'))).toHaveLength(1);
 }finally{await f.app.close();}
});
test('control change clears prior Definition/value and backend checks new target',async({page})=>{
 const f=await isolated(page);try{await page.goto('/normas?tab=ajustes');await selectControl(page);await fillProposal(page,f.state.definitions[0]!.configuration_definition_id);await selectControl(page,31);await expect(page.getByLabel('Parámetro a personalizar')).toHaveValue('');await expect(page.getByLabel('Valor propuesto',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Guardar propuesta',exact:true})).toBeDisabled();expect(f.requests.some(r=>r.path.includes(otherControl))).toBe(true);expect(f.state.overrides).toHaveLength(0);}finally{await f.app.close();}
});
test('stale Definition is rejected by write and selection invalidated automatically',async({page})=>{
 const f=await isolated(page);try{await page.goto('/normas?tab=ajustes');await selectControl(page);await fillProposal(page,f.state.definitions[0]!.configuration_definition_id);f.state.definitions[0]!.lifecycle_state='draft';await page.getByRole('button',{name:'Guardar propuesta',exact:true}).click();await expect(page.getByRole('alert')).toContainText('El parámetro seleccionado ya no está disponible');await expect(page.getByLabel('Parámetro a personalizar')).toHaveValue('');expect(f.state.overrides).toHaveLength(0);expect(f.state.statements.some(q=>q.sql.includes('INSERT INTO ops_audit.audit_events'))).toBe(false);}finally{await f.app.close();}
});
test('empty, denied and dependency errors remain explicit and cannot submit',async({page})=>{
 const f=await isolated(page);try{
  f.state.definitions=[];await page.goto('/normas?tab=ajustes');await selectControl(page);await expect(page.getByText('No hay parámetros publicados disponibles para este control.')).toBeVisible();await expect(page.getByRole('button',{name:'Guardar propuesta',exact:true})).toHaveCount(0);
  f.state.allowed=false;await selectControl(page,31);await expect(page.getByRole('alert')).toContainText('No tienes autorización');
  f.state.allowed=true;f.state.definitions=(await import('../apps/backend/src/configuration/control-definition-references.test-support.js')).definitionFixture();f.state.missingRules=true;await page.getByRole('button',{name:'Volver a consultar parámetros'}).click();await expect(page.getByRole('alert')).toContainText('No fue posible consultar');expect(f.state.overrides).toHaveLength(0);
 }finally{await f.app.close();}
});

test('published periodicity vocabulary is understandable and saved through the same B04 command',async({page})=>{
 const f=await isolated(page);try{await page.goto('/normas?tab=ajustes');await selectControl(page);const definition=f.state.definitions.find(d=>d.configuration_code==='control_operational_frequency')!;await fillProposal(page,definition.configuration_definition_id);await expect(page.getByRole('option',{name:'Mensual',exact:true})).toHaveCount(1);await page.getByRole('button',{name:'Guardar propuesta',exact:true}).click();await expect(page.getByText('Propuesta guardada como borrador.',{exact:false})).toBeVisible();expect(f.state.overrides[0]!.text_value).toBe('monthly');}finally{await f.app.close();}
});
