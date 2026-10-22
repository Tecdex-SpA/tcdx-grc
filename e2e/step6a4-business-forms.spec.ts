import {test,expect,type Page,type Locator} from '@playwright/test';
import assets from '../apps/frontend/src/business-form-contracts.generated.json' with {type:'json'};
import {mkdirSync} from 'node:fs';
import * as validators from '../apps/frontend/src/business-form-validators.generated.js';
const id='018f47f2-6170-7bd0-9d43-12f644a2b111',globalId='018f47f2-6170-7bd0-9d43-12f644a2b112';
const versionId='018f47f2-6170-7bd0-9d43-12f644a2b113';
const schemas=assets.schemas as Record<string,any>;
function rule(schema:string,field:string):any {const r=schemas[schema]?.properties?.[field]??{};return r.$ref?schemas[r.$ref.split('/').at(-1)]:r;}
async function mockedApi(page:Page,failPost=0,denyLookup=false){
 const posts:{path:string;body:any;key:string|undefined;headers:Record<string,string>}[]=[];
 await page.route('**/api/v1/**',async route=>{
  const url=new URL(route.request().url()),path=url.pathname.replace('/api/v1','');
  if(route.request().method()==='POST'){
   posts.push({path,body:route.request().postDataJSON(),key:route.request().headers()['idempotency-key'],headers:route.request().headers()});
   if(failPost){await route.fulfill({status:failPost,json:{code:'TCDX.CONFLICT.CONCURRENCY',message:'private-server-message',correlation_id:id,retryable:true,field_errors:[{field:'title',code:'INVALID',message:'private-server-message'}]}});return;}
   await route.fulfill({status:202,json:{status:'completed',result:{}}});return;
  }
  const context=await page.evaluate(()=> (window as any).__formRow);
  const row={tenant_id:id,selectable:true,lifecycle_state:'active',version_number:1,name:'Referencia de negocio',title:'Registro empresarial',requirement_code:'REQ-COMPONENT',control_code:'CTL-COMPONENT',evidence_code:'EV-COMPONENT',policy_code:'RET-COMPONENT',test_code:'TEST-COMPONENT',display_name:'Responsable de negocio',framework_name:'Marco de prueba',edition:'2026',subject_type:'organization',ownership_class:'TENANT_OWNED',purpose:'evidence_document',classification:'internal',effective_from:'2020-01-01T00:00:00Z',effective_to:null,policy_kind:'tenant_policy',...Object.fromEntries(['framework_version_id','requirement_id','subject_id','control_id','control_version_id','requirement_applicability_id','methodology_version_ref','requirement_assessment_id','control_assessment_id','assurance_test_id','evidence_request_id','evidence_id','retention_policy_id','retention_policy_applicability_id','tenant_membership_id','issue_id'].map(k=>[k,id]))};
  // Keep each simulated reference label representative of its published resource.
  if(!path.includes('retention')){delete (row as any).policy_code;delete (row as any).classification;}
  if(path.includes('evidence-requests'))(row as any).request_code='SOL-COMPONENT';
  if(!path.includes('subjects')){delete (row as any).subject_type;delete (row as any).display_name;}
  if(path.includes('framework-version-references')||path.includes('subjects')||path.includes('evidence')){delete (row as any).name;delete (row as any).title;}
  if(!path.includes('framework-version-references')){delete (row as any).framework_name;delete (row as any).edition;}
  if(!path.includes('controls')){delete (row as any).control_code;}
  if(!path.includes('requirements'))delete (row as any).requirement_code;
  if(!path.includes('evidence'))delete (row as any).evidence_code;
  if(!path.includes('assurance-tests'))delete (row as any).test_code;
  const detailPath=locationPath(context);
  if(path===detailPath){await route.fulfill({json:context});return;}
  if(denyLookup){await route.fulfill({status:403,json:{code:'TCDX.AUTHORIZATION.DENIED',message:'Denied',correlation_id:id,retryable:false}});return;}
  if(path.startsWith('/controls/')){const global=path.endsWith(globalId);await route.fulfill({json:{...row,control_id:global?globalId:id,ownership_class:global?'GLOBAL_REFERENCE':'TENANT_OWNED',versions:[{tenant_id:global?null:id,control_id:global?globalId:id,control_version_id:versionId,version_number:1}]}});return;}
  if(path.startsWith('/evidence-versions/')){await route.fulfill({json:{...row,evidence_version_id:versionId,lifecycle_state:'approved',links:[{control_id:id}]}});return;}
  if(path===`/evidence/${id}`){await route.fulfill({json:{...row,versions:[{evidence_version_id:versionId,lifecycle_state:'approved'}]}});return;}
  if(path===`/evidence-requests/${id}`){await route.fulfill({json:{evidence_request_id:id,lifecycle_state:'open',control_id:id}});return;}
  let items:any[]=[row];
  if(path==='/controls')items=[row,{...row,control_id:globalId,ownership_class:'GLOBAL_REFERENCE',tenant_id:null}];
  if(/retention|methodolog/.test(path))items=items.map(r=>({...r,lifecycle_state:'published'}));
  await route.fulfill({json:{items,page:{has_more:false,next_cursor:null}}});
 });
 return posts;
}
// The fixture supplies exactly one selected business object; no real backend or QA is exercised.
function locationPath(row:any){if(!row)return '';const own=Object.keys(row).find(k=>k.endsWith('_id'));const paths:Record<string,string>={requirement_applicability_id:'/requirement-applicabilities',requirement_assessment_id:'/requirement-assessments',statement_of_applicability_id:'/statements-of-applicability',control_id:'/controls',control_assessment_id:'/control-assessments',assurance_test_id:'/assurance-tests',evidence_request_id:'/evidence-requests',evidence_id:'/evidence',retention_policy_id:'/retention-policies',issue_id:'/issues',action_id:'/actions'};return `${paths[own??'']}/${id}`;}
async function choose(select:Locator,value?:string){await expect(select).toBeEnabled();await expect.poll(()=>select.locator('option').count()).toBeGreaterThan(1);await select.selectOption(value??await select.locator('option').nth(1).getAttribute('value')??'');}
async function fillField(page:Page,schema:string,field:string){
 if(['EvidenceRequestCreateRequest','IssueCreateRequest'].includes(schema)&&schemas[schema].oneOf?.some((branch:any)=>branch.required.includes(field)))await page.getByLabel('Tipo de origen',{exact:true}).selectOption(field);
 const box=page.locator(`[data-field="${field}"]`).first(),r=rule(schema,field);await expect(box).toBeVisible();
 if(field==='items'){
  await box.getByRole('button',{name:'Agregar elemento'}).click();
  const selects=box.locator('select');await choose(selects.nth(0),globalId);await choose(selects.nth(1),versionId);
  await choose(selects.nth(2),'applicable');await box.getByLabel('Justificación',{exact:true}).fill('Justificación empresarial');await choose(selects.nth(3),'implemented');await choose(selects.nth(4),id);await choose(selects.nth(5),versionId);return;
 }
 if(field==='links')return;
 if(field==='file_object_id')return;
 if(field==='retention_seconds'){await box.getByRole('spinbutton').fill('2');return;}
 if(field==='requirement_id') {await choose(box.locator('select').nth(0));await choose(box.locator('select').nth(1));return;}
 if(field==='based_on_control_version_id'){await choose(box.locator('select').nth(0),globalId);await choose(box.locator('select').nth(1),versionId);return;}
 if(field==='evidence_version_id'){await choose(box.locator('select').nth(0));await choose(box.locator('select').nth(1),versionId);return;}
 if(r.format==='date-time'){await box.locator('input[type="datetime-local"]').fill('2026-10-20T09:00');return;}
 if(box.locator('select').count&&await box.locator('select').count()){await choose(box.locator('select').last(),field==='policy_kind'?'tenant_policy':field==='is_mandatory'?'false':undefined);return;}
 const input=box.locator('input,textarea').first();await input.fill(r.type==='integer'||r.type==='number'?'1':r.format==='date'?'2026-10-20':`Negocio ${field}`);
}
for(const form of assets.forms){
 test(`${form.id} ${form.operation} browser component payload and accessibility [mock API]`,async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));const posts=await mockedApi(page);
  await page.goto(`/business-forms.test.html?form=${form.id}`);const opener=page.getByRole('button',{name:'Abrir formulario'});await opener.click();
  const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await expect(dialog.getByRole('heading',{name:form.title,exact:true})).toBeVisible();
  const isCreate=!form.path.includes('{id}');
  const closeButton=dialog.getByRole('button',{name:isCreate?'Cerrar creación':'Cerrar detalle',exact:true});
  await expect(closeButton).toBeFocused();await page.keyboard.press('Shift+Tab');expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);await page.keyboard.press('Tab');await expect(closeButton).toBeFocused();
  if(isCreate){
   await dialog.getByRole('button',{name:'Crear registro',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Operación completada'})).toHaveCount(0);expect(posts).toHaveLength(0);
   for(const field of schemas[form.schema].required??[]){if(field==='precedence_rank'||field==='links'||field==='file_object_id')continue;await fillField(page,form.schema,field);}
   if(form.schema==='RetentionPolicyCreateRequest')await fillField(page,form.schema,'retention_seconds');
   if(form.schema==='EvidenceRequestCreateRequest')await fillField(page,form.schema,'control_id');
   if(form.schema==='IssueCreateRequest')await fillField(page,form.schema,'requirement_assessment_id');
   if(form.schema==='ActionCreateRequest')await fillField(page,form.schema,'issue_id');
   if(form.schema==='EvidenceCreateRequest'){
    // The accepted STEP6A3 transfer is stubbed by the fixture; only the STEP6A4 form/payload is tested.
    await dialog.locator('input[type="file"]').setInputFiles({name:'component-fixture.txt',mimeType:'text/plain',buffer:Buffer.from('component fixture')});
    await dialog.getByLabel('Clasificación del archivo',{exact:true}).selectOption('internal');
    await dialog.getByLabel('Procedencia del archivo',{exact:true}).fill('Fixture de componente');
    await fillField(page,form.schema,'retention_policy_id');
    await fillField(page,form.schema,'retention_policy_applicability_id');
    await dialog.getByRole('button',{name:'Crear registro',exact:true}).click();expect(posts).toHaveLength(0);await expect(dialog.locator('[data-field="links"]').getByRole('alert')).toHaveText(/Agrega al menos un vínculo/);
    const links=dialog.locator('[data-field="links"]');await links.getByRole('button',{name:'Agregar elemento'}).click();await choose(links.locator('select').nth(0),'control_id');await choose(links.locator('select').nth(1),id);
    await links.getByRole('button',{name:'Agregar elemento'}).click();const second=links.getByRole('group',{name:'Vínculo de evidencia 2',exact:true});await choose(second.locator('select').nth(0),'control_version_id');await choose(second.locator('select').nth(1),globalId);await choose(second.locator('select').nth(2),versionId);
    await second.getByLabel('Vigente desde',{exact:true}).fill('2026-10-20T09:00');await second.getByLabel('Vigente hasta',{exact:true}).fill('2026-10-21T09:00');
   }
  }else{
   for(const field of schemas[form.schema].required??[]){if(field!=='expected_version')await fillField(page,form.schema,field);}
   if(form.schema==='RetentionPolicyUpdateRequest')await fillField(page,form.schema,'retention_seconds');
   if(form.schema==='AssuranceTestExecuteRequest'){const samples=dialog.locator('[data-field="samples"]');await samples.getByRole('button',{name:'Agregar elemento'}).click();await samples.getByLabel('Código de muestra',{exact:true}).fill('MUESTRA-1');await samples.getByLabel('Tamaño de la muestra',{exact:true}).fill('1');await samples.getByLabel('Tamaño de la población',{exact:true}).fill('2');await samples.getByLabel('Método de selección',{exact:true}).selectOption('census');await samples.getByLabel('Estado del resultado',{exact:true}).selectOption('no_data');await samples.getByLabel('Inicio del período de muestra',{exact:true}).fill('2026-10-20T09:00');await samples.getByLabel('Fin del período de muestra',{exact:true}).fill('2026-10-21T09:00');}
   const button=dialog.locator('.workflow-action').getByRole('button').last();
   if(!(schemas[form.schema].properties&&Object.keys(schemas[form.schema].properties).some(k=>k!=='expected_version'))){await button.click();expect(posts).toHaveLength(0);await expect(button).toHaveText(/Confirmar/);await expect(dialog.getByText(/Estado resultante:/)).toBeVisible();}
  }
  const out='docs/phase6a/STEP_6A4/evidence/local-20261020/captures';mkdirSync(out,{recursive:true});
  await dialog.locator('.drawer-body').evaluate(el=>{el.scrollTop=0;});
  await dialog.screenshot({path:`${out}/${form.id}-${info.project.name}.png`});
  // Every control is named, keyboard focus remains in the dialog, and narrow width remains contained.
  for(const input of await dialog.locator('input:not([type="file"]),select,textarea').all())if(await input.isVisible())await expect(input).toHaveAccessibleName(/.+/);
  expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  {
   const button=isCreate?dialog.getByRole('button',{name:'Crear registro',exact:true}):dialog.locator('.workflow-action').getByRole('button').last();await button.click();
   await expect(page.getByRole('status').filter({hasText:'Operación completada'})).toBeVisible();expect(posts).toHaveLength(1);
   expect(posts[0]!.path).toBe(form.path.replace('{id}',id).replace('{issue_id}',id));expect(posts[0]!.headers['x-tcdx-tenant-id']).toBe(id);expect(posts[0]!.key).toBeTruthy();const validate=(validators as any)[form.schema];expect(validate(posts[0]!.body),JSON.stringify(validate.errors)).toBe(true);
   if(form.schema==='AssuranceTestExecuteRequest')expect(posts[0]!.body.samples).toEqual([{sample_code:'MUESTRA-1',sample_count:1,population_count:2,selection_method:'census',result_status:'no_data',sample_period_start:'2026-10-20T12:00:00Z',sample_period_end:'2026-10-21T12:00:00Z'}]);
   if(form.schema==='EvidenceCreateRequest')expect(posts[0]!.body.links[1]).toEqual({control_version_id:versionId,effective_from:'2026-10-20T12:00:00Z',effective_to:'2026-10-21T12:00:00Z'});
   await expect(opener).toBeFocused();
   if(form.module==='retencion'&&!isCreate)expect(posts[0]!.headers['if-match']).toBe('"3"');else if(!isCreate)expect(posts[0]!.body.expected_version).toBe(3);
  }
  expect(errors).toEqual([]);
 });
}
test('STEP6A4 conflict preserves entries, refreshes explicitly and permission failures are safe [mock API]',async({page})=>{
 const posts=await mockedApi(page,409);await page.goto('/business-forms.test.html?form=FORM-42');await page.getByRole('button',{name:'Abrir formulario'}).click();
 for(const field of ['verification_decision','rationale'])await fillField(page,'ActionVerifyRequest',field);
 const dialog=page.getByRole('dialog'),button=dialog.locator('.workflow-action').getByRole('button').last();await button.click();await expect(dialog.getByText(/El registro cambió/)).toBeVisible();
 await expect(dialog.locator('[data-field="rationale"] input')).toHaveValue('Negocio rationale');await button.click();await expect.poll(()=>posts.length).toBe(2);expect(posts[0]!.key).toBe(posts[1]!.key);
 await dialog.getByRole('button',{name:'Actualizar detalle y revisar'}).click();await expect(dialog.locator('[data-field="rationale"] input')).toHaveValue('Negocio rationale');await expect(dialog).not.toContainText('private-server-message');
});
test('STEP6A4 missing action permission hides interaction [mock API]',async({page})=>{await mockedApi(page);await page.goto('/business-forms.test.html?form=FORM-42&deny=yes');await page.getByRole('button',{name:'Abrir formulario'}).click();await expect(page.locator('.workflow-action')).toHaveCount(0);});

test('STEP6A4 lookup denial remains distinct from empty options and blocks invalid submit [mock API]',async({page})=>{
 const posts=await mockedApi(page,0,true);await page.goto('/business-forms.test.html?form=FORM-04');await page.getByRole('button',{name:'Abrir formulario'}).click();
 const dialog=page.getByRole('dialog');await expect(dialog.getByRole('alert').first()).toContainText(/No tienes acceso/);
 await dialog.getByRole('button',{name:'Crear registro',exact:true}).click();expect(posts).toHaveLength(0);
 await expect(dialog.locator('[data-field="requirement_applicability_id"] select')).toBeDisabled();
 await expect(dialog).not.toContainText('No hay registros');await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(page.getByRole('button',{name:'Abrir formulario'})).toBeFocused();
});
test('STEP6A4 command denial preserves inputs and never leaks server detail [mock API]',async({page})=>{
 const posts=await mockedApi(page,403);await page.goto('/business-forms.test.html?form=FORM-42');await page.getByRole('button',{name:'Abrir formulario'}).click();
 for(const field of ['verification_decision','rationale'])await fillField(page,'ActionVerifyRequest',field);
 const dialog=page.getByRole('dialog');await dialog.locator('.workflow-action').getByRole('button').last().click();
 await expect(dialog.getByText(/No tienes acceso a esta operación/)).toBeVisible();expect(posts).toHaveLength(1);
 await expect(dialog.locator('[data-field="rationale"] input')).toHaveValue('Negocio rationale');await expect(dialog).not.toContainText('private-server-message');
});
