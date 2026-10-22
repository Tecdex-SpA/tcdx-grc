import {test,expect,type Page,type Locator} from '@playwright/test';
import {writeFileSync,mkdirSync} from 'node:fs';
import {EvidenceRequestCreateRequest,IssueCreateRequest} from '../apps/frontend/src/business-form-validators.generated.js';
const out='docs/phase6a/STEP_6A4/REFERENCE_CORRECTION_20261020/evidence';
const id='018f47f2-6170-7bd0-9d43-12f644a2b111';
const other='018f47f2-6170-7bd0-9d43-12f644a2b112';
async function choose(select:Locator,value=id){await expect(select).toBeEnabled();await expect(select.locator(`option[value="${value}"]`)).toHaveCount(1);await select.selectOption(value);}
async function setup(page:Page,form:string){
 const posts:{path:string;body:Record<string,unknown>}[]=[],reads:string[]=[];
 await page.route('**/api/v1/**',async route=>{
  const request=route.request(),url=new URL(request.url());reads.push(url.pathname+url.search);
  if(request.method()==='POST'){posts.push({path:url.pathname,body:request.postDataJSON()});await route.fulfill({status:202,json:{status:'completed',result:{}}});return;}
  const row={tenant_id:id,selectable:true,ownership_class:'TENANT_OWNED',framework_version_id:id,framework_name:'Marco autorizado',edition:'2026',requirement_id:id,requirement_code:'REQ-LOCAL',control_id:id,control_code:'CTL-LOCAL',requirement_assessment_id:id,control_assessment_id:id,assurance_test_id:id,tenant_membership_id:id,subject_id:id,display_name:'Responsable local',subject_type:'organization',title:'Registro local',lifecycle_state:'active'};
  if(url.pathname.includes('framework-version-references')){await route.fulfill({json:{items:[row,{...row,framework_version_id:other,framework_name:'Segundo marco autorizado'}],page:{has_more:false,next_cursor:null}}});return;}
  await route.fulfill({json:{items:[row],page:{has_more:false,next_cursor:null}}});
 });
 await page.goto(`/business-forms.test.html?form=${form}`);await page.getByRole('button',{name:'Abrir formulario'}).click();
 return {posts,reads,dialog:page.getByRole('dialog')};
}
for(const [form,schema,targets] of [
 ['FORM-21','EvidenceRequestCreateRequest',['requirement_id','control_id','requirement_assessment_id','control_assessment_id','assurance_test_id']],
 ['FORM-33','IssueCreateRequest',['requirement_assessment_id','control_assessment_id','assurance_test_id']]
] as const){
 test(`${form} origin guidance, dependent selection, switching and payload [local simulated API]`,async({page},info)=>{
  const {posts,reads,dialog}=await setup(page,form);
  const submit=dialog.getByRole('button',{name:'Crear registro',exact:true});
  await submit.click();expect(posts).toHaveLength(0);
  const summary=dialog.locator('.form-error-summary');await expect(summary).toContainText('único registro');
  await summary.getByRole('button',{name:'Objeto de origen',exact:true}).click();await expect(dialog.getByLabel('Tipo de origen',{exact:true})).toBeFocused();
  await expect(dialog.locator('[data-field="_reference"] [role="alert"]')).toContainText('único registro');
  await expect(dialog.getByLabel('Tipo de origen',{exact:true})).toHaveAttribute('aria-invalid','true');
  if(form==='FORM-21')await dialog.getByLabel('Código de solicitud',{exact:true}).fill('SOL-LOCAL');
  else {
   await dialog.locator('[data-field="issue_code"] input').fill('HALL-LOCAL');
   await dialog.locator('[data-field="title"] input').fill('Hallazgo local');
   await dialog.locator('[data-field="description"] input').fill('Descripción local');
   for(const [field,value] of [['issue_kind','finding'],['severity','minor'],['priority','low'],['origin_role','trigger']])await dialog.locator(`[data-field="${field}"] select`).selectOption(value!);
  }
  for(const field of targets){
   await dialog.getByLabel('Tipo de origen',{exact:true}).selectOption(field);
   for(const incompatible of targets.filter(target=>target!==field))await expect(dialog.locator(`[data-field="${incompatible}"]`)).toHaveCount(0);
   const box=dialog.locator(`[data-field="${field}"]`);
   if(field==='requirement_id'){
    await expect(box.getByLabel('Requisito',{exact:true})).toBeDisabled();
    await choose(box.getByLabel('Marco normativo',{exact:true}));await choose(box.getByLabel('Requisito',{exact:true}));
    await box.getByLabel('Marco normativo',{exact:true}).selectOption(other);
    await expect(box.getByLabel('Requisito',{exact:true})).toHaveValue('');
    await choose(box.getByLabel('Requisito',{exact:true}));
    expect(reads.some(path=>path.includes('/requirements?')&&path.includes(other))).toBe(true);
   }else await choose(box.locator('select').last());
   await expect(box.locator('select').last()).toHaveAttribute('required','');
   await expect(dialog.getByLabel('Tipo de origen',{exact:true})).toHaveAttribute('aria-invalid','false');
   if(form==='FORM-21')await choose(dialog.locator('[data-field="assigned_membership_id"] select'));
  }
  // Switching removes the old target and clears its dependent assignee even before a replacement exists.
  const first=targets[0];await dialog.getByLabel('Tipo de origen',{exact:true}).selectOption(first);
  if(form==='FORM-21')await expect(dialog.locator('[data-field="assigned_membership_id"] select')).toHaveValue('');
  await submit.click();expect(posts).toHaveLength(0);await expect(summary).toContainText('único registro');
  if(first==='requirement_id'){
   await choose(dialog.getByLabel('Marco normativo',{exact:true}));await choose(dialog.getByLabel('Requisito',{exact:true}));
  }else await choose(dialog.locator(`[data-field="${first}"] select`).last());
  if(form==='FORM-21')await choose(dialog.locator('[data-field="assigned_membership_id"] select'));
  else {await choose(dialog.locator('[data-field="business_owner_subject_id"] select'));await dialog.locator('[data-field="due_date"] input').fill('2026-10-21');}
  await expect(summary).toHaveCount(0);
  for(const control of await dialog.locator('input,select,textarea').all())if(await control.isVisible())await expect(control).toHaveAccessibleName(/.+/);
  expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  await dialog.locator('.drawer-body').evaluate(el=>{el.scrollTop=0;});mkdirSync(out,{recursive:true});
  await dialog.screenshot({path:`${out}/${form}-${info.project.name}.png`});
  await dialog.locator('[data-field="_reference"]').screenshot({path:`${out}/${form}-origin-${info.project.name}.png`});
  await submit.click();await expect(page.getByText('Operación completada',{exact:true})).toBeVisible();expect(posts).toHaveLength(1);
  const body=posts[0]!.body;expect(targets.filter(field=>field in body)).toEqual([first]);expect(body).not.toHaveProperty('framework_version_id');expect(body).not.toHaveProperty('origin_type');
  expect((schema==='EvidenceRequestCreateRequest'?EvidenceRequestCreateRequest:IssueCreateRequest)(body)).toBe(true);
  if(form==='FORM-21')expect(body.assigned_membership_id).toBe(id);else expect(body.business_owner_subject_id).toBe(id);
  writeFileSync(`${out}/${form}-${info.project.name}-payload.json`,JSON.stringify({evidence:'LOCAL_SIMULATED_API_NOT_QA_PERSISTENCE',posts,reads},null,2)+'\n');
 });
 test(`${form} unavailable lookup remains empty and prevents submission [local simulated API]`,async({page})=>{
  const {posts,dialog}=await setup(page,form);
  await page.route('**/api/v1/requirement-assessments*',route=>route.fulfill({status:403,json:{code:'TCDX.AUTHORIZATION.DENIED',message:'Denied',correlation_id:id,retryable:false}}));
  await dialog.getByLabel('Tipo de origen',{exact:true}).selectOption('requirement_assessment_id');
  const box=dialog.locator('[data-field="requirement_assessment_id"]');await expect(box).toContainText('No tienes acceso');await expect(box.locator('select')).toBeDisabled();
  await dialog.getByRole('button',{name:'Crear registro',exact:true}).click();expect(posts).toHaveLength(0);
 });
}
