const {chromium,expect}=require('/Users/andresbarouh/repos/tcdx-grc/node_modules/@playwright/test');
const fs=require('node:fs');
const out='/Users/andresbarouh/repos/tcdx-grc/docs/phase6a/STEP_6A4/INTEGRAL_QA_CLOSEOUT_20261020/evidence/browser-followup';
fs.mkdirSync(out,{recursive:true});
const save=(n,v)=>fs.writeFileSync(out+'/'+n,JSON.stringify(v,null,2)+'\n');
(async()=>{
 const browser=await chromium.launch({headless:false});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const events=[],blocked=[];
 await context.route('https://grc.tecdex.net/api/v1/**',async route=>{
  const req=route.request();
  if(!['GET','HEAD','OPTIONS'].includes(req.method())){blocked.push({method:req.method(),path:new URL(req.url()).pathname});await route.abort('blockedbyclient');return;}
  await route.continue();
 });
 context.on('response',r=>{const u=new URL(r.url());if(u.origin==='https://grc.tecdex.net'&&u.pathname.startsWith('/api/'))events.push({path:u.pathname,method:r.request().method(),status:r.status()});});
 const page=await context.newPage();await page.goto('https://grc.tecdex.net/',{waitUntil:'domcontentloaded'});
 console.log('BROWSER_READY_OFFICIAL_LOGIN_REQUIRED');save('browser-status.json',{status:'WAITING_OFFICIAL_LOGIN',time:new Date().toISOString()});
 let ready=false;
 for(let n=0;n<600;n++){
  ready=await page.evaluate(()=>!!sessionStorage.getItem('tcdx.access_token')&&!!sessionStorage.getItem('tcdx.tenant_id')).catch(()=>false);
  if(ready)break;await page.waitForTimeout(1000);
 }
 if(!ready){save('browser-result.json',{status:'BLOCKED_AUTHENTICATED_SESSION_REQUIRED',business_writes:0,events,blocked});await browser.close();return;}
 save('browser-status.json',{status:'AUTHENTICATED_READY',time:new Date().toISOString()});console.log('AUTHENTICATED_READY');
 const results=[];
 async function pick(select){
  try{await expect(select).toBeEnabled({timeout:20000});await expect.poll(async()=>select.locator('option').evaluateAll(ns=>ns.filter(n=>n.value&&!n.disabled).length),{timeout:20000}).toBeGreaterThan(0);}
  catch{return {status:'BLOCKED_LOOKUP_UNAVAILABLE_AFTER_WAIT',guidance:await select.locator('..').innerText()};}
  const opts=await select.locator('option').evaluateAll(ns=>ns.filter(n=>n.value&&!n.disabled).map(n=>({value:n.value,label:n.textContent})));
  await select.selectOption(opts[0].value);await expect(select).toHaveValue(opts[0].value);return {status:'PASS',available_count:opts.length,selected_id:opts[0].value};
 }
 try{
 for(const width of [1440,390])for(const [form,path,title,targets] of [
  ['FORM-21','/evidencias','Solicitar evidencia',['requirement_id','control_id','requirement_assessment_id','control_assessment_id','assurance_test_id']],
  ['FORM-33','/acciones','Registrar hallazgo',['requirement_assessment_id','control_assessment_id','assurance_test_id']]
 ]){
  await page.setViewportSize({width,height:width===390?844:1000});await page.goto('https://grc.tecdex.net'+path,{waitUntil:'domcontentloaded'});
  if(form==='FORM-21')await page.getByRole('tab',{name:'Solicitudes de evidencia',exact:true}).click();
  else await page.getByRole('tab',{name:'Hallazgos y brechas',exact:true}).click();
  const trigger=page.getByRole('button',{name:'Nuevo registro',exact:true});await trigger.click();const d=page.getByRole('dialog');await expect(d.getByRole('heading',{name:title,exact:true})).toBeVisible();
  const row={form,width,status:'PASS_NON_DESTRUCTIVE',checks:[],lookups:[]};results.push(row);
  const type=d.getByLabel('Tipo de origen',{exact:true});await expect(type).toBeVisible();
  await d.getByRole('button',{name:'Crear registro',exact:true}).click();await d.locator('.form-error-summary').getByRole('button',{name:'Objeto de origen',exact:true}).click();await expect(type).toBeFocused();await expect(d.locator('[data-field="_reference"] [role="alert"]')).toContainText('único registro');row.checks.push('no_origin_validation_and_focus');
  for(const target of targets){
   await type.selectOption(target);
   for(const other of targets.filter(x=>x!==target))await expect(d.locator(`[data-field="${other}"]`)).toHaveCount(0);
   if(form==='FORM-21')await expect(d.locator('[data-field="assigned_membership_id"] select')).toHaveValue('');
   const box=d.locator(`[data-field="${target}"]`);
   if(target==='requirement_id'){
    const req=box.getByLabel('Requisito',{exact:true}),fw=box.getByLabel('Marco normativo',{exact:true});await expect(req).toBeDisabled();
    const chosen=await pick(fw);row.lookups.push({target:'framework',...chosen});
    if(chosen.status==='PASS'){
     row.lookups.push({target,...await pick(req)});
     const options=await fw.locator('option').evaluateAll(ns=>ns.filter(n=>n.value&&!n.disabled).map(n=>n.value));
     if(options.length>1)await fw.selectOption(options[1]);else{await fw.selectOption('');await fw.selectOption(options[0]);}
     await expect(req).toHaveValue('');row.checks.push(options.length>1?'framework_change_clears_requirement':'framework_reset_clears_requirement; SECOND_FRAMEWORK_UNAVAILABLE');
    }
   }else row.lookups.push({target,...await pick(box.locator('select').last())});
   row.checks.push('single_active_origin_'+target);
   if(form==='FORM-21')row.lookups.push({target:'assigned_membership_id',...await pick(d.locator('[data-field="assigned_membership_id"] select'))});
  }
  await type.selectOption(targets[0]);if(form==='FORM-21')await expect(d.locator('[data-field="assigned_membership_id"] select')).toHaveValue('');
  for(const el of await d.locator('input,select,textarea').all())if(await el.isVisible())await expect(el).toHaveAccessibleName(/.+/);
  row.document_overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);expect(row.document_overflow).toBe(false);
  await d.locator('.drawer-body').evaluate(el=>el.scrollTop=0);await d.screenshot({path:out+`/${form}-${width}.png`});
  await page.keyboard.press('Escape');await expect(d).not.toBeVisible();await expect(trigger).toBeFocused();row.checks.push('cancel_escape_focus_return','accessible_names','no_document_horizontal_overflow');
  if(blocked.length)throw Error('UNEXPECTED_BUSINESS_COMMAND_BLOCKED');
  save('browser-progress.json',{results,events,blocked});
 }
 save('browser-result.json',{status:'PASS_NON_DESTRUCTIVE_WITH_LOOKUP_LIMITS',results,events,blocked,business_writes:0,api_mocking:false,human_acceptance:'PENDING',time:new Date().toISOString()});
 }catch(error){save('browser-result.json',{status:'BLOCKED_OR_FAIL_REVIEW_REQUIRED',error:String(error.message),results,events,blocked,business_writes:0,api_mocking:false});console.log(String(error.message));}
 await browser.close();console.log('BROWSER_FINISHED');
})().catch(e=>{save('browser-launch-error.json',{error:String(e.message)});console.error(e.message);process.exitCode=1;});
