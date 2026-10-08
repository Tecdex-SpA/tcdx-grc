import { randomBytes, createHash, createHmac } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { createRequire } from 'node:module';
const { generateKeyPair, SignJWT, exportJWK } = await import(createRequire(new URL('../apps/backend/package.json', import.meta.url)).resolve('jose'));

// Disposable local identities only. No QA secrets, human credentials, browser traces or tokens on disk.
const policy = JSON.parse(readFileSync(new URL('./config/managed-identity-amr-policy.json', import.meta.url)));
const image = process.argv[2], backendImage = process.argv[3];
if (!image || !backendImage) throw Error('EXACT_IAM_AND_BACKEND_IMAGES_REQUIRED');
const directory = mkdtempSync(join(tmpdir(), 'tcdx-amr-callback-'));
const container = `tcdx-amr-callback-${randomBytes(8).toString('hex')}`;
const password = randomBytes(32).toString('base64url'), seed = randomBytes(20).toString('hex');
const oidcPort = 4908, callbackPort = 4909;
const callback = `http://127.0.0.1:${callbackPort}/callback`;
const fixture = (name, corrected) => ({
 realm: name, enabled: true, loginTheme: 'tcdx-grc', registrationAllowed: false,
 browserFlow: 'isolated-password-totp',
 authenticationFlows: [{ alias: 'isolated-password-totp', providerId: 'basic-flow', topLevel: true, builtIn: false,
  authenticationExecutions: policy.executions.map((e,i) => ({ authenticator: e.authenticator, requirement: 'REQUIRED', priority: i * 10, authenticatorFlow: false, authenticatorConfig: `factor-${i}` })) }],
 authenticatorConfig: policy.executions.map((e,i) => ({ alias: `factor-${i}`, config: corrected ? e.config : { 'default.reference.value': e.config['default.reference.value'] } })),
 clientScopes: [{name:'verified-amr',protocol:'openid-connect',protocolMappers:[{name:'amr',protocol:'openid-connect',protocolMapper:'oidc-amr-mapper',config:{'id.token.claim':'true','access.token.claim':'false'}},{name:'auth_time',protocol:'openid-connect',protocolMapper:'oidc-usersessionmodel-note-mapper',config:{'user.session.note':'AUTH_TIME','claim.name':'auth_time','jsonType.label':'long','id.token.claim':'true','access.token.claim':'true'}}]}],
 clients: [{clientId:'isolated-callback',enabled:true,publicClient:true,standardFlowEnabled:true,directAccessGrantsEnabled:false,implicitFlowEnabled:false,redirectUris:[callback],attributes:{'pkce.code.challenge.method':'S256'},defaultClientScopes:['verified-amr']}],
 users: [{ username: 'isolated-nominal-person', enabled: true, firstName: 'Synthetic', lastName: 'Regression', email: 'fixture@example.invalid', emailVerified: true,
 credentials: [{type:'password',value:password,temporary:false},{type:'otp',secretData:JSON.stringify({value:seed}),credentialData:JSON.stringify({subType:'totp',digits:6,counter:0,period:30,algorithm:'HmacSHA1'})}] }]
});
for (const [name,corrected] of [['isolated-expired-amr',false],['isolated-current-amr',true],['isolated-enrollment-amr',true]]) {
 const realm=fixture(name,corrected);
 if(name==='isolated-enrollment-amr'){realm.users[0].credentials=[{type:'password',value:password,temporary:true}];realm.users[0].requiredActions=['UPDATE_PASSWORD','CONFIGURE_TOTP'];}
 writeFileSync(join(directory,`${name}.json`),JSON.stringify(realm),{mode:0o600});
}
const docker = (args,input) => spawnSync('docker',args,{input,encoding:'utf8',maxBuffer:4*1024*1024});
const verifyCode = `import { verifyOidcIdentityProof } from './dist/security/oidc-browser.js'; import {createLocalJWKSet} from 'jose'; let input='';for await(const p of process.stdin)input+=p;const q=JSON.parse(input);try{await verifyOidcIdentityProof(q.config,q.token,q.nonce,createLocalJWKSet(q.jwks));console.log(JSON.stringify({accepted:true}));}catch{console.log(JSON.stringify({accepted:false}));}`;
let current, browser, running=false;
const server = createServer(async (request,response) => {
 try {
  const url = new URL(request.url,callback);
  if (!current || url.pathname!='/callback' || url.searchParams.get('state')!==current.state || !url.searchParams.get('code')) throw Error('ISOLATED_STATE_DENIED');
  const tokenResponse = await fetch(`${current.issuer}/protocol/openid-connect/token`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:'isolated-callback',redirect_uri:callback,code:url.searchParams.get('code'),code_verifier:current.verifier})});
  if (!tokenResponse.ok) throw Error('ISOLATED_CODE_EXCHANGE_FAILED');
  const body=await tokenResponse.json(), jwks=await (await fetch(`${current.issuer}/protocol/openid-connect/certs`)).json();
  const config={issuer:current.issuer,clientId:'isolated-callback',allowedAlgorithms:['RS256'],requiredAmr:policy.idTokenRequiredAmr};
  const checked=docker(['run','--rm','-i','--workdir','/app/apps/backend','--entrypoint','node',backendImage,'--input-type=module','-e',verifyCode],JSON.stringify({config,token:body.id_token,nonce:current.nonce,jwks}));
  if(checked.status!==0)throw Error('EXACT_BACKEND_IMAGE_VALIDATOR_FAILED');
  const accepted=JSON.parse(checked.stdout).accepted;
  // Signed token is consumed only in volatile memory. Persist only verified outcome and factor references.
  const claims=JSON.parse(Buffer.from(body.id_token.split('.')[1],'base64url').toString());
  current.result={accepted,amr:claims.amr,issuerMatched:claims.iss===current.issuer,audienceMatched:claims.aud==='isolated-callback',nonceMatched:claims.nonce===current.nonce,sidPresent:typeof claims.sid==='string',authTimePresent:Number.isSafeInteger(claims.auth_time),codeExchange:true};
  response.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});response.end('<h1>Isolated callback consumed</h1>');
 }catch{current.result={setupError:true};response.writeHead(500);response.end('Isolated fixture failed');}
});
try {
 await new Promise(resolve=>server.listen(callbackPort,'127.0.0.1',resolve));
 const launched=docker(['run','--rm','-d','--name',container,'-p',`127.0.0.1:${oidcPort}:8080`,'-v',`${directory}:/opt/keycloak/data/import:ro`,image,'start-dev','--import-realm']);
 if(launched.status!==0)throw Error('LOCAL_IAM_START_FAILED'); running=true;
 let ready=false;for(let i=0;i<300;i++){try{if((await fetch(`http://127.0.0.1:${oidcPort}/realms/isolated-current-amr/.well-known/openid-configuration`)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}
 if(!ready)throw Error('LOCAL_IAM_NOT_READY');
 for(const name of ['isolated-expired-amr','isolated-current-amr','isolated-enrollment-amr'])rmSync(join(directory,`${name}.json`));
 browser=await chromium.launch();const outcomes=[];
 for(const name of ['isolated-expired-amr','isolated-current-amr','isolated-enrollment-amr']){
  const context=await browser.newContext();const page=await context.newPage();
  current={issuer:`http://127.0.0.1:${oidcPort}/realms/${name}`,state:randomBytes(32).toString('base64url'),nonce:randomBytes(32).toString('base64url'),verifier:randomBytes(48).toString('base64url')};
  const url=new URL(`${current.issuer}/protocol/openid-connect/auth`);url.search=new URLSearchParams({client_id:'isolated-callback',redirect_uri:callback,response_type:'code',scope:'openid',state:current.state,nonce:current.nonce,code_challenge:createHash('sha256').update(current.verifier).digest('base64url'),code_challenge_method:'S256'}).toString();
  await page.goto(url.href);await page.locator('#username').fill('isolated-nominal-person');await page.locator('#password').fill(password);await page.locator('#kc-login').click();
  if(name==='isolated-enrollment-amr'){
   await page.locator('#totpSecret').waitFor({state:'attached'});const enrollmentSeed=await page.locator('#totpSecret').inputValue();
   const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const digest=createHmac('sha1',Buffer.from(enrollmentSeed,'utf8')).update(counter).digest();const offset=digest.at(-1)&15;const otp=String((digest.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');
   await page.locator('#totp').fill(otp);await page.locator('#saveTOTPBtn').click();await page.locator('#password-new').waitFor();const permanent=randomBytes(32).toString('base64url');await page.locator('#password-new').fill(permanent);await page.locator('#password-confirm').fill(permanent);await page.locator('#kc-submit').click();await page.getByRole('heading',{name:'Isolated callback consumed'}).waitFor({timeout:30000});
   outcomes.push({profile:name,...current.result});await context.close();continue;
  }
  await page.locator('#otp').waitFor();
  await new Promise(r=>setTimeout(r,1500));
  const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const digest=createHmac('sha1',Buffer.from(seed,'utf8')).update(counter).digest();const offset=digest.at(-1)&15;const otp=String((digest.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');
  await page.locator('#otp').fill(otp);await page.locator('#kc-login').click();await page.getByRole('heading',{name:'Isolated callback consumed'}).waitFor({timeout:30000});
  outcomes.push({profile:name,...current.result});await context.close();
 }
 const keys=await generateKeyPair('RS256'), jwk=await exportJWK(keys.publicKey);jwk.kid='isolated-regression';
 const config={issuer:'https://isolated-issuer.example.test',clientId:'isolated-callback',allowedAlgorithms:['RS256'],requiredAmr:policy.idTokenRequiredAmr};
 const now=Math.floor(Date.now()/1000), base={iss:config.issuer,aud:config.clientId,sub:'isolated-stable-subject',iat:now,exp:now+300,nonce:'isolated-nonce',sid:'isolated-session',auth_time:now,amr:['pwd','otp']};
 const negatives=[];
 for(const [name,patch,nonce] of [['password-only',{amr:['pwd']},base.nonce],['wrong-issuer',{iss:'https://other.example.test'},base.nonce],['wrong-audience',{aud:'other-client'},base.nonce],['wrong-nonce',{},'different-nonce'],['missing-subject',{sub:''},base.nonce],['expired-token',{exp:now-1},base.nonce]]){
  const token=await new SignJWT({...base,...patch}).setProtectedHeader({alg:'RS256',kid:jwk.kid}).sign(keys.privateKey);
  const checked=docker(['run','--rm','-i','--workdir','/app/apps/backend','--entrypoint','node',backendImage,'--input-type=module','-e',verifyCode],JSON.stringify({config,token,nonce,jwks:{keys:[jwk]}}));
  if(checked.status!==0)throw Error('EXACT_BACKEND_IMAGE_VALIDATOR_FAILED');negatives.push({name,denied:JSON.parse(checked.stdout).accepted===false});
 }
 const pass=outcomes[2].accepted===false&&!outcomes[2].amr.includes('otp')&&negatives.every(n=>n.denied)&&outcomes[0].accepted===false&&!outcomes[0].amr.includes('pwd')&&outcomes[1].accepted===true&&policy.idTokenRequiredAmr.every(x=>outcomes[1].amr.includes(x));
 console.log(JSON.stringify({pass,outcomes,negatives,exactBackendImage:backendImage,exactIamImage:image,qaMutationCount:0,secretValuesPersisted:false}));if(!pass)process.exitCode=1;
}catch(error){if(running){const log=docker(['logs',container]);const output=log.stdout+log.stderr;console.error(JSON.stringify({startupComplete:/Listening on:/.test(output),imported:/imported/.test(output),importError:/Error during import|Failed to import|ERROR/.test(output),exceptionTypes:[...new Set(output.match(/[A-Za-z.]+(?:Exception|Error)/g)||[])]}));}console.error(['LOCAL_IAM_START_FAILED','LOCAL_IAM_NOT_READY','EXACT_BACKEND_IMAGE_VALIDATOR_FAILED'].includes(error.message)?error.message:'ISOLATED_CALLBACK_REGRESSION_FAILED');process.exitCode=1;}
finally{await browser?.close();if(running)docker(['stop',container]);await new Promise(r=>server.close(r));rmSync(directory,{recursive:true,force:true});}
