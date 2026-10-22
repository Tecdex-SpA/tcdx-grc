import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const evidence=new URL('../../docs/phase6a/STEP_6A3/evidence/session-duration-20261019/',import.meta.url);
const result={startedAt:new Date().toISOString(),state:'WAITING_HUMAN_LOGIN',refreshResponses:[],samples:[]};
const save=()=>writeFile(new URL('browser-runtime.json',evidence),JSON.stringify(result,null,2)+'\n');
const browser=await chromium.launch({headless:false});
const context=await browser.newContext({viewport:{width:1536,height:1024}});
const page=await context.newPage();
page.on('response',response=>{
 if(new URL(response.url()).pathname==='/auth/refresh'){
  const item={at:new Date().toISOString(),status:response.status()};
  result.refreshResponses.push(item);console.log(JSON.stringify({refresh:item}));void save();
 }
});
try {
 await page.goto('https://grc.tecdex.net/',{waitUntil:'networkidle'});
 await save();console.log('WAITING_HUMAN_LOGIN_IN_VISIBLE_BROWSER');
 await page.getByRole('button',{name:/Tecdex Managed Identity/i}).click({timeout:15000});
 let authenticated=false;
 for(let i=0;i<40;i++){
  try{await page.waitForFunction(()=>Boolean(sessionStorage.getItem('tcdx.access_token')), { }, {timeout:15000});authenticated=true;break;}
  catch{console.log('WAITING_HUMAN_LOGIN');}
 }
 if(!authenticated)throw Error('HUMAN_LOGIN_NOT_COMPLETED');
 const initial=await page.evaluate(()=>{
  const token=sessionStorage.getItem('tcdx.access_token');
  const claims=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
  return {renewable:claims.session_renewable===true,lifetimeSeconds:claims.exp-claims.iat};
 });
 if(!initial.renewable)throw Error('LOGIN_DID_NOT_ESTABLISH_RENEWABLE_SESSION');
 const renewal=await page.evaluate(async()=>{
  const token=sessionStorage.getItem('tcdx.access_token');
  const response=await fetch('/auth/refresh',{method:'POST',headers:{authorization:`Bearer ${token}`,accept:'application/json'}});
  if(response.ok){const body=await response.json();sessionStorage.setItem('tcdx.access_token',body.token);}
  return {status:response.status};
 });
 result.initialRenewal=renewal;
 if(renewal.status!==200)throw Error('INITIAL_RENEWAL_FAILED');
 result.login={at:new Date().toISOString(),...initial};result.state='OBSERVING_30_MINUTES';await save();
 const start=Date.now();
 console.log(JSON.stringify({login:result.login}));
 await page.waitForTimeout(1000);
 await page.screenshot({path:new URL('authenticated-before.png',evidence).pathname,fullPage:true});
 for(let index=0;index<=30;index++){
  if(index>0)await page.waitForTimeout(Math.max(0,start+index*60000-Date.now()));
  await page.reload({waitUntil:'networkidle'});
  await page.waitForTimeout(800);
  const sample=await page.evaluate(async()=>{
   const token=sessionStorage.getItem('tcdx.access_token');
   if(!token)return {authenticated:false};
   const response=await fetch('/api/v1/access/me',{headers:{authorization:`Bearer ${token}`,accept:'application/json'}});
   return {authenticated:response.ok,status:response.status};
  });
  result.samples.push({at:new Date().toISOString(),elapsedSeconds:Math.round((Date.now()-start)/1000),...sample});
  await save();console.log(JSON.stringify(result.samples.at(-1)));
  if(!sample.authenticated)throw Error('SESSION_CONTINUITY_FAILED');
 }
 await page.screenshot({path:new URL('authenticated-after-30-minutes.png',evidence).pathname,fullPage:true});
 // Reuse is checked inside the page; credential values never leave the browser.
 const [logoutResponse,replay]=await (async()=>{
  await page.evaluate(()=>{window.__qaLogoutToken=sessionStorage.getItem('tcdx.access_token');});
  const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/auth/logout');
  await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();
  const logout=await response;
  const outcome=await page.evaluate(async()=>{
   const token=window.__qaLogoutToken;delete window.__qaLogoutToken;
   const headers={authorization:`Bearer ${token}`,accept:'application/json'};
   const access=await fetch('/api/v1/access/me',{headers});
   const refresh=await fetch('/auth/refresh',{method:'POST',headers});
   return {accessStatus:access.status,refreshStatus:refresh.status,storageCleared:sessionStorage.getItem('tcdx.access_token')===null};
  });
  return [logout.status(),outcome];
 })();
 result.logout={status:logoutResponse,...replay};
 if(logoutResponse!==204||replay.accessStatus!==401||replay.refreshStatus!==401||!replay.storageCleared)throw Error('LOGOUT_REVOCATION_FAILED');
 if(!result.refreshResponses.some(x=>x.status===200))throw Error('NO_SUCCESSFUL_TOKEN_RENEWAL');
 result.state='PASS';result.finishedAt=new Date().toISOString();await save();console.log('SESSION_CONTINUITY_30_MINUTES_PASS');
} catch(error){result.state='FAILED';result.reason=error.message;await save();console.log(JSON.stringify({state:result.state,reason:result.reason}));process.exitCode=1;}
finally{await browser.close();}
