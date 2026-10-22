// Fresh real QA browser session. No credential/session import or token export.
import {chromium} from '@playwright/test';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
const run=process.argv[2]??'live-browser';
if(!/^[a-z][a-z0-9-]*$/.test(run))throw Error('Invalid observation run');
const provider=process.argv[3]??'managed';
if(!['managed','zoho'].includes(provider))throw Error('Invalid existing provider');
const directory=new URL('../../.release-custody/integrated-qa-release-20261022/'+run+'/',import.meta.url);
await mkdir(directory,{recursive:true});
const save=(name,data)=>writeFile(new URL(name,directory),JSON.stringify(data,null,2)+'\n');
const browser=await chromium.launch({headless:false});
const context=await browser.newContext({viewport:{width:1536,height:1024}});
const page=await context.newPage();
let closing=false;
async function stop(){if(closing)return;closing=true;await browser.close();}
process.once('SIGTERM',()=>void stop());process.once('SIGINT',()=>void stop());
const report={started_utc:new Date().toISOString(),origin:'https://grc.tecdex.net',status:'WAITING_HUMAN_LOGIN',tests:[],credentials_exported:false};
try{
 await page.goto('https://grc.tecdex.net/',{waitUntil:'networkidle'});
 await page.screenshot({path:new URL('login.png',directory).pathname,fullPage:true});
 await save('status.json',report);
 console.log('QA_BROWSER_READY_FOR_EXISTING_USER_LOGIN');
 const managed=page.getByRole('button',{name:provider==='zoho'?/Zoho/i:/Tecdex Managed Identity/i});
 if(await managed.count())await managed.click();
 for(let i=0;i<900;i++){
  if(closing)break;
  if(page.url().startsWith(report.origin)&&await page.evaluate(()=>Boolean(sessionStorage.getItem('tcdx.access_token')))){
   const summary=await page.evaluate(async()=>{
    const token=sessionStorage.getItem('tcdx.access_token');
    const headers={authorization:`Bearer ${token}`,accept:'application/json'};
    const access=await fetch('/api/v1/access/me',{headers}),authorization=await fetch('/api/v2/auth/me/authorization',{headers});
    const a=access.ok?await access.json():null,b=authorization.ok?await authorization.json():null;
    const platform=await fetch('/api/v1/platform/knowledge-sources',{headers});
    const denied=await fetch('/api/v1/platform/knowledge-sources',{headers:{authorization:'Bearer invalid-release-probe',accept:'application/json'}});
    return {access_status:access.status,authorization_status:authorization.status,available_tenant_contexts:a?.available_tenant_contexts?.map(x=>({tenant_id:x.tenant_id,roles:x.effective_role_codes}))??[],platform_roles:a?.effective_platform_role_codes??[],platform_permission_count:b?.platform_permissions?.length??0,platform_library_permissions:b?.platform_permissions?.filter(p=>p.startsWith('knowledge.'))??[],platform_source_list_status:platform.status,invalid_bearer_status:denied.status};
   });
   report.tests.push({kind:'REAL_AUTHENTICATED_API',...summary});
   report.status='AUTHENTICATED_READY';await save('status.json',report);
   await page.screenshot({path:new URL('authenticated.png',directory).pathname,fullPage:true});
   console.log('QA_AUTHENTICATED_BROWSER_READY');
   for(const [id,path]of [['platform-library','/biblioteca-plataforma'],['tenant-matrices','/normas?tab=matrices'],['tenant-adjustments','/normas?tab=ajustes']]){
    await page.goto(report.origin+path,{waitUntil:'networkidle'});
    await page.screenshot({path:new URL('screen-auto-'+id+'.png',directory).pathname,fullPage:true});
    const view=await page.evaluate(()=>({headings:[...document.querySelectorAll('h1,h2,h3')].map(x=>x.textContent),tables:document.querySelectorAll('table').length,alerts:[...document.querySelectorAll('[role=alert]')].map(x=>x.textContent),buttons:[...document.querySelectorAll('main button')].map(x=>x.textContent),horizontal_overflow:document.documentElement.scrollWidth>innerWidth}));
    await save('response-auto-'+id+'.json',{status:'OBSERVED',path,...view});
   }
   // Keep the credential inside the page. Commands are read-only navigation/API
   // or close; writes require a separately reviewed canonical scenario.
   let last;
   for(let n=0;n<3600&&!closing;n++){
    let cmd;try{cmd=JSON.parse(await readFile(new URL('command.json',directory),'utf8'));}catch{}
    if(cmd&&cmd.id!==last){last=cmd.id;
     if(cmd.action==='close'){await stop();break;}
     if(cmd.action==='navigate'&&typeof cmd.path==='string'&&cmd.path.startsWith('/')&&!cmd.path.startsWith('//')){
      await page.goto(report.origin+cmd.path,{waitUntil:'networkidle'});
      await page.screenshot({path:new URL('screen-'+cmd.id+'.png',directory).pathname,fullPage:true});
      const view=await page.evaluate(()=>({headings:[...document.querySelectorAll('h1,h2,h3')].map(x=>x.textContent),tables:document.querySelectorAll('table').length,alerts:[...document.querySelectorAll('[role=alert]')].map(x=>x.textContent),horizontal_overflow:document.documentElement.scrollWidth>innerWidth}));
      await save('response-'+cmd.id+'.json',{status:'OBSERVED',path:cmd.path,...view});
     }
     if(cmd.action==='read-api'&&Array.isArray(cmd.paths)&&cmd.paths.every(p=>typeof p==='string'&&p.startsWith('/api/v1/')&&!p.includes('://'))){
      const results=await page.evaluate(async({paths,tenantId})=>{
       const token=sessionStorage.getItem('tcdx.access_token');
       const headers={authorization:`Bearer ${token}`,accept:'application/json',...(tenantId?{'x-tcdx-tenant-id':tenantId}:{})};
       const results=[];
       for(const path of paths){const response=await fetch(path,{headers});let body;try{body=await response.json();}catch{}results.push({path,status:response.status,code:body?.error?.code??body?.code,item_count:Array.isArray(body?.items)?body.items.length:undefined});}
       return results;
      },{paths:cmd.paths,tenantId:cmd.tenantId});
      await save('response-'+cmd.id+'.json',{status:'OBSERVED_READ_ONLY',results});
     }
    }
    await new Promise(r=>setTimeout(r,1000));
   }
   break;
  }
  await new Promise(r=>setTimeout(r,1000));
 }
}catch(e){report.status='FAILED';report.error=e.message;await save('status.json',report);process.exitCode=1;}
finally{await stop();}
