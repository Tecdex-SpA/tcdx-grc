// QA official API bridge. Credentials remain inside the browser; no final Evidence POST allowed.
import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const run=process.env.TCDX_QA_RUN??'';
if(run&&!/^[a-z0-9-]+$/.test(run))throw Error('INVALID_QA_RUN');
const root=new URL('../../docs/phase6a/STEP_6A3/evidence/residual-closeout-20261020/'+(run?run+'/':''),import.meta.url);
await mkdir(root,{recursive:true});
const save=(name,data)=>writeFile(new URL(name,root),JSON.stringify(data,null,2)+'\n');
const browser=await chromium.launch({headless:false});
const context=await browser.newContext({viewport:{width:1536,height:1024}});
const page=await context.newPage();
await page.goto('https://grc.tecdex.net/');
console.log('QA_BROWSER_OPEN_LOGIN_REQUIRED');
await save('browser-state.json',{state:'WAITING_HUMAN_LOGIN'});
const provider=process.env.TCDX_QA_PROVIDER??'managed';
if(!['managed','zoho'].includes(provider))throw Error('INVALID_PROVIDER');
try{await page.getByRole('button',{name:provider==='zoho'?/Zoho/i:/Tecdex Managed Identity/i}).click({timeout:10000});}catch{}
let lastCommand;
for(let attempt=0;attempt<1800;attempt++){
 const loggedIn=await page.evaluate(()=>!!sessionStorage.getItem('tcdx.access_token'));
 if(loggedIn){
  if(attempt===0 || !lastCommand){
   await save('browser-state.json',{state:'AUTHENTICATED_READY'});
  }
  let cmd;
  try{cmd=JSON.parse(await readFile(new URL('browser-command.json',root),'utf8'));}catch{}
  if(cmd && cmd.id!==lastCommand){
   lastCommand=cmd.id;
   if(cmd.action==='close'){await browser.close();break;}
   if(cmd.action==='capture-readonly-ui'){
    if(!['/evidencias?tab=retencion','/evidencias?tab=aplicabilidad-retencion','/controles?tab=evaluaciones-control','/requisitos?tab=requisitos'].includes(cmd.route))throw Error('ROUTE_OUTSIDE_RESIDUAL_REVIEW');
    const receipts=[];
    for(const viewport of [{width:1536,height:1024},{width:390,height:844}]){
     await page.setViewportSize(viewport);await page.goto('https://grc.tecdex.net'+cmd.route);await page.waitForTimeout(1800);
     if(cmd.openCreate)await page.getByRole('button',{name:'Nuevo registro',exact:true}).click();
     const file=`${cmd.id}-${viewport.width}.png`;
     await page.screenshot({path:new URL(file,root).pathname,fullPage:true});
     receipts.push({viewport,file,url:page.url(),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),bodyText:(await page.locator('body').innerText()).slice(0,18000)});
     if(cmd.openCreate)await page.keyboard.press('Escape');
    }
    await save(`response-${cmd.id}.json`,{status:'CAPTURED_NOT_HUMAN_ACCEPTANCE',receipts});continue;
   }
   if(cmd.action==='inspect-evidence-control-picker'){
    let evidencePosts=0;const count=request=>{if(request.method()==='POST'&&new URL(request.url()).pathname==='/api/v1/evidence')evidencePosts++;};
    page.on('request',count);
    await page.goto('https://grc.tecdex.net/evidencias?tab=evidencias');
    await page.getByRole('button',{name:'Nuevo registro',exact:true}).click();
    const dialog=page.getByRole('dialog');
    await dialog.getByRole('button',{name:'Agregar elemento',exact:true}).click();
    await dialog.getByLabel('Tipo de objeto',{exact:false}).selectOption('control_id');
    const picker=dialog.getByRole('combobox',{name:'ID de control',exact:true});
    await picker.locator(`option[value="${cmd.controlId}"]`).waitFor({state:'attached',timeout:20000});
    await picker.selectOption(cmd.controlId);
    const options=await picker.locator('option').evaluateAll(nodes=>nodes.map(n=>({id:n.value,label:n.textContent})));
    await picker.scrollIntoViewIfNeeded();await dialog.screenshot({path:new URL('live-evidence-control-picker.png',root).pathname});
    const selected=await picker.inputValue();
    page.off('request',count);
    const result={status:selected===cmd.controlId&&evidencePosts===0?'PASS':'FAIL',selected_control_id:selected,options,evidence_posts:evidencePosts,final_evidence_created:false};
    await save(`response-${cmd.id}.json`,result);console.log(JSON.stringify({command:cmd.id,status:result.status}));
    continue;
   }
   const method=cmd.method??'GET';
   if(!cmd.path?.startsWith('/api/') || (method!=='GET' && !(method==='POST' && /^\/api\/v1\/(requirement-assessments|control-assessments)(?:\/[0-9a-f-]+:(?:start|submit|complete))?$/.test(cmd.path))))throw Error('OPERATION_OUTSIDE_AUTHORIZED_SCENARIO');
   const result=await page.evaluate(async cmd=>{
    const token=sessionStorage.getItem('tcdx.access_token');
    const headers={authorization:`Bearer ${token}`,...(cmd.ifMatch?{'If-Match':cmd.ifMatch}:{}),accept:cmd.binary?'application/pdf':'application/json',...(cmd.tenantId?{'X-TCDX-Tenant-Id':cmd.tenantId}:{}),...(cmd.body?{'content-type':'application/json','Idempotency-Key':cmd.idempotencyKey}: {})};
    const response=await fetch(cmd.path,{method:cmd.method??'GET',headers,...(cmd.body?{body:JSON.stringify(cmd.body)}:{})});
    if(cmd.binary&&response.ok){const bytes=new Uint8Array(await response.arrayBuffer());let text='';for(const byte of bytes)text+=String.fromCharCode(byte);return {status:response.status,base64:btoa(text)};}
    const text=await response.text();let body;try{body=JSON.parse(text);}catch{body={text:text.slice(0,1000)};}
    return {status:response.status,body};
   },cmd);
   if(result.base64){await writeFile(new URL('source-document.pdf',root),Buffer.from(result.base64,'base64'));delete result.base64;result.file='source-document.pdf';}
   await save(`response-${cmd.id}.json`,result);console.log(JSON.stringify({command:cmd.id,status:result.status}));
  }
 }
 await new Promise(resolve=>setTimeout(resolve,1000));
}
