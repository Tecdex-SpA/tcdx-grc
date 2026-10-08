import subprocess,json,pathlib,time
build=json.loads(pathlib.Path('/tmp/tcdx-grc-mi-tenant-e2e-backend-build.json').read_text());image=build['imageId'];freeze=json.loads(pathlib.Path('/tmp/tcdx-grc-mi-tenant-e2e-freeze.json').read_text());name='tcdx-grc-mi-tenant-e2e-backend-local'
def run(args,check=True):
 p=subprocess.run(args,capture_output=True,text=True)
 if check and p.returncode:raise RuntimeError('LOCAL_SMOKE_COMMAND_FAILED_'+args[0]+' '+p.stderr[-2000:])
 return p
pg=json.loads(run(['docker','inspect','tcdx-grc-phase3-postgres-16']).stdout)[0]; pgip=next(iter(pg['NetworkSettings']['Networks'].values()))['IPAddress']; assert pgip.startswith('172.')
run(['docker','run','-d','--name',name,'--network','bridge','-v',freeze['source']+'/database:/app/database:ro','-v',freeze['source']+'/data:/app/data:ro','-v',freeze['source']+'/docs:/app/docs:ro','-e','DATABASE_HOST='+pgip,'-e','DATABASE_PORT=5432','-e','DATABASE_USER=postgres','-e','DATABASE_NAME=tcdx-grc','-e','DATABASE_SSL_MODE=disable',image])
try:
 for i in range(30):
  p=run(['docker','exec',name,'node','-e',"fetch('http://127.0.0.1:4000/health/live').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))"],False)
  if p.returncode==0:break
  time.sleep(1)
 else:raise RuntimeError('LOCAL_LIVENESS_FAILED')
 js="""
const {loadConfig}=await import('/app/apps/backend/dist/config.js');
let rejectedMissingDb=false;try{loadConfig({})}catch(e){rejectedMissingDb=e.message.includes('DATABASE_USER')}
let rejectedMissingMiSecret=false;try{loadConfig({DATABASE_USER:'local-smoke-reader',MANAGED_IDENTITY_OIDC_ISSUER:'https://iam.grc.tecdex.net/realms/tcdx-managed-identity',MANAGED_IDENTITY_OIDC_CLIENT_ID:'tcdx-grc',MANAGED_IDENTITY_OIDC_REDIRECT_URI:'https://grc.tecdex.net/auth/callback',MANAGED_IDENTITY_OIDC_CLIENT_SECRET_FILE:'/run/secrets/managed_identity_oidc_client_secret'})}catch(e){rejectedMissingMiSecret=e.message.includes('MANAGED_IDENTITY_OIDC_CLIENT_SECRET_FILE')}
if(!rejectedMissingDb||!rejectedMissingMiSecret)throw Error('MISSING_CONFIGURATION_NOT_REJECTED');
const {newUuidV7}=await import('/app/apps/backend/dist/uuid.js');
const id=newUuidV7(),assignment=newUuidV7();const origin='http://127.0.0.1:4000';
const assign=await fetch(origin+'/api/v1/platform/user-identities/'+id+'/platform-roles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role_code:'PLATFORM_SUPPORT',reason:'Anonymous local route-registration smoke'})});
const revoke=await fetch(origin+'/api/v1/platform/user-identities/'+id+'/platform-roles/'+assignment+':revoke',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason:'Anonymous local route-registration smoke'})});
if(assign.status!==401||revoke.status!==401)throw Error('PLATFORM_ROUTE_REGISTRATION_OR_DEFAULT_DENY_FAILED');
const read=await fetch(origin+'/api/v1/platform/user-identities/'+id+'/platform-roles'); const roles=await fetch(origin+'/api/v1/roles?assignable_family=platform'); if(read.status!==401||roles.status!==401)throw Error('P2E_ROUTE_OR_DEFAULT_DENY_FAILED_'+read.status+'_'+roles.status); const providers=await fetch(origin+'/api/v1/auth/providers');if(providers.status!==200)throw Error('PROVIDER_ROUTE_FAILED');
const providerBody=await providers.json();if(providerBody.providers.length!==4||providerBody.providers.some(p=>p.available))throw Error('UNCONFIGURED_PROVIDER_NOT_CLOSED');

const central=await fetch(origin+'/api/v1/platform/tenants/'+id+'/users:onboard',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
const access=await fetch(origin+'/api/v1/platform/user-identities/'+id+'/tenant-access');
for(const response of [central,access])if(response.status!==401||response.headers.get('cache-control')!=='no-store')throw Error('CENTRAL_DEFAULT_DENY_FAILED');
const {permissionProjectionCatalog}=await import('/app/apps/backend/dist/security/permission-projection-catalog.generated.js');
if(JSON.stringify(permissionProjectionCatalog['platform.tenant_user.onboard'])!==JSON.stringify({capabilities:['CORE_PLATFORM'],scopes:['platform']}))throw Error('CENTRAL_PROJECTION_FAILED');
const ready=await fetch(origin+'/health/ready');if(ready.status!==200)throw Error('LOCAL_DB_READINESS_FAILED');
const discovery=await fetch(origin+'/api/v1/user-identities?mode=platform_search&criterion=display_name&value=local-smoke');
const onboarding=await fetch(origin+'/api/v1/platform/tenants:initial-onboarding',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
for(const response of [discovery,onboarding]){if(response.status!==401||response.headers.get('cache-control')!=='no-store'||(await response.json()).code!=='TCDX.AUTHENTICATION.REQUIRED')throw Error('D2_CANONICAL_UNAUTHENTICATED_DENY_FAILED');}
for(const path of ['/api/v1/platform/tenants/'+id+':bootstrap','/api/v1/tenant-bootstrap','/api/v1/platform/tenants:bootstrap']){const r=await fetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(r.status!==404)throw Error('UNEXPECTED_BOOTSTRAP_ROUTE');}
const {buildApp}=await import('/app/apps/backend/dist/app.js');
const {createDatabase}=await import('/app/apps/backend/dist/database.js');
const {BlockedIdentityVerifier}=await import('/app/apps/backend/dist/security/authentication.js');
const {UnavailableFileStoragePort}=await import('/app/apps/backend/dist/ports/file-storage.js');
const db=createDatabase(loadConfig(process.env));const registered=buildApp(async()=>true,{database:db,identityVerifier:new BlockedIdentityVerifier(),fileStorage:new UnavailableFileStoragePort(),runtimeEnvironment:'qa'});await registered.ready();
const expected=[['POST','/api/v1/platform/tenants/'+id+'/users:onboard'],['GET','/api/v1/platform/user-identities/'+id+'/tenant-access'],['GET','/api/v1/user-identities'],['POST','/api/v1/platform/tenants:initial-onboarding'],['GET','/api/v1/platform/user-identities/'+id+'/platform-roles'],['POST','/api/v1/platform/user-identities/'+id+'/platform-roles'],['POST','/api/v1/platform/user-identities/'+id+'/platform-roles/'+assignment+':revoke']];
for(const [method,url]of expected){const r=await registered.inject({method,url,...(method==='POST'?{payload:{}}:{})});if(r.statusCode!==401)throw Error('COMPILED_OPENAPI_ROUTE_MISMATCH');}
if(registered.printRoutes().toLowerCase().includes('bootstrap'))throw Error('PUBLIC_BOOTSTRAP_REGISTRATION_FOUND');await registered.close();await db.destroy();
const uid=process.getuid();if(uid!==1000)throw Error('RUNTIME_UID_MISMATCH');
console.log(JSON.stringify({healthLive:200,healthReady:200,userIdentityDiscoveryAnonymous:401,tenantInitialOnboardingAnonymous:401,bootstrapPublicRoute:"ABSENT",compiledOpenApiExpectedRoutes:7,processStarted:true,routeRegistration:'PASS',platformRoleAssignmentListAnonymous:read.status,platformRoleCatalogAnonymous:roles.status,platformRoleAssignAnonymous:assign.status,platformRoleRevokeAnonymous:revoke.status,missingDbConfigurationRejected:true,missingManagedSecretRejected:true,providerProjection:'PASS_ALL_UNCONFIGURED',runtimeUid:uid,qaDbConnection:false,qaSecretsUsed:false,identityCreated:false,assignmentCreated:false}));
"""
 result=json.loads(run(['docker','exec',name,'node','--input-type=module','-e',js]).stdout)
 info=json.loads(run(['docker','inspect',name]).stdout)[0]
 logs=run(['docker','logs',name]);lines=(logs.stdout+logs.stderr).splitlines()
 assert not any('uncaught' in s.lower() or 'fatal' in s.lower() for s in lines)
 assert info['State']['Running'] and info['RestartCount']==0
 # Exercise the immutable candidate's compiled D3-A test through a local-only DB relay.
 relayCode="const net=require('node:net');net.createServer(a=>{const b=net.connect(5432,"+json.dumps(pgip)+");a.pipe(b);b.pipe(a);a.on('error',()=>b.destroy());b.on('error',()=>a.destroy())}).listen(55432,'127.0.0.1')"
 relay=subprocess.Popen(['docker','exec',name,'node','-e',relayCode],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 try:
  run(['docker','exec',name,'node','-e',"require('node:fs').writeFileSync('/tmp/d3-a-r-vitest.config.mjs',`export default {test:{include:['/app/apps/backend/dist/**/*.postgres.test.js'],environment:'node',passWithNoTests:false}};`)"])
  test=run(['docker','exec','-e','DATABASE_HOST=127.0.0.1','-e','DATABASE_PORT=55432','-e','TCDX_ISOLATED_REBUILD=true','-e','TCDX_SECURITY_INTEGRATION=true','-e','TCDX_PHASE5_LIFECYCLE_INTEGRATION=true',name,'node','/app/node_modules/vitest/vitest.mjs','run','--config','/tmp/d3-a-r-vitest.config.mjs','--no-file-parallelism'],False)
  pathlib.Path('/tmp/tcdx-grc-mi-tenant-e2e-backend-image-projection.log').write_text(test.stdout+test.stderr)
  assert test.returncode==0,'COMPILED_IMAGE_PROJECTION_SMOKE_FAILED_SEE_LOCAL_LOG'
  assert '79 passed' in test.stdout,'COMPILED_IMAGE_PROJECTION_CASE_COUNT_MISMATCH'
  result.update(compiledImageAuthorizationRegression='PASS',compiledImagePostgresTestsPassed=79,isolatedFixtureAuthority=True,humanTokensUsed=False)
 finally:relay.terminate();relay.wait(timeout=10)
 result.update(BACKEND_LOCAL_SMOKE='PASS',network='local-isolated-postgres-only',localSmokeContainerRemoved=True,startupFatalErrors=0)
 pathlib.Path('/tmp/tcdx-grc-mi-tenant-e2e-backend-smoke.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
finally:run(['docker','rm','-f',name])
