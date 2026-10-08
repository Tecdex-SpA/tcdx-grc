import pathlib,json,subprocess,hashlib,shlex,datetime,sys,urllib.request
p=pathlib.Path('/tmp');repo=pathlib.Path('/Users/andresbarouh/repos/tcdx-grc');node='/tmp/tcdx-grc-npm-cache/_npx/5dad66f2cb301fc2/node_modules/node/bin/node';freeze=json.loads((p/'tcdx-grc-mi-tenant-e2e-freeze.json').read_text())
builds={c:json.loads((p/f'tcdx-grc-mi-tenant-e2e-{c}-build.json').read_text())for c in ['backend','frontend']};build=builds['frontend']
ssh=['ssh','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','UpdateHostKeys=no','-o','ConnectTimeout=6'];host='tecdex@192.168.2.46'
def read(name):return json.loads((p/('tcdx-grc-mi-tenant-e2e-'+name+'.json')).read_text())
def save(name,value):
 path=p/('tcdx-grc-mi-tenant-e2e-'+name+'.json');path.write_text(json.dumps(value,indent=2)+'\n');path.chmod(0o600);return value
def run(args,body=None):
 r=subprocess.run(args,input=body,capture_output=True,text=True,cwd=repo)
 if r.returncode:raise RuntimeError('SAFE_COMMAND_FAILED_'+pathlib.Path(args[0]).name)
 return r.stdout
def engine(spec,action):
 r=subprocess.run(ssh+[spec['host'],'python3 - '+shlex.quote(json.dumps(spec))+' '+shlex.quote(action)],input=(p/'tcdx-grc-mi-tenant-e2e-runtime-driver.py').read_text(),capture_output=True,text=True)
 try:result=json.loads(r.stdout)
 except ValueError:raise RuntimeError('NO_SAFE_ENGINE_RESULT')
 save(spec['component']+'-engine-'+action,result)
 if r.returncode:raise RuntimeError('RUNTIME_'+spec['component']+'_'+action+'_'+result.get('safeFailure',result.get('deploy','FAIL')))
 return result
def public():
    out={}
    def get(url,expected,mime=None):
        edge=json.loads((p/'tcdx-grc-mi-tenant-e2e-public-before.json').read_text())['grc']['public_edge'];hostname=url.split('/')[2];assert hostname in ['grc.tecdex.net','iam.grc.tecdex.net'] and edge!='127.0.0.1'
        r=subprocess.run(['curl','--silent','--show-error','--max-time','15','--resolve',hostname+':443:'+edge,'--output','-','--write-out','\n%{http_code}',url],capture_output=True)
        assert r.returncode==0,'PUBLIC_HTTPS_FAILED';body,code=r.stdout.rsplit(b'\n',1);assert int(code)==expected,'PUBLIC_STATUS_FAILED';return body
    html=get('https://grc.tecdex.net/',200);assert b'<title>Tecdex GRC</title>'in html
    assert get('https://grc.tecdex.net/configuraciones/empresas',200)==html
    assert get('https://grc.tecdex.net/configuraciones/usuarios',200)==html
    assert get('https://grc.tecdex.net/login',200)==html
    logo=get('https://grc.tecdex.net/tecdex-logo-light.svg',200);assert hashlib.sha256(logo).hexdigest()==build['logoSha256']
    for asset in build['bundleAssets']:
        actual=get('https://grc.tecdex.net'+asset,200)
        with urllib.request.urlopen('http://127.0.0.1:4197'+asset,timeout=5)as r:expected=r.read()
        assert actual==expected,'DEPLOYED_BUNDLE_MISMATCH'
    providers=json.loads(get('https://grc.tecdex.net/api/v1/auth/providers',200));assert providers['providers'],'LOGIN_PROVIDER_PROJECTION_MISSING'
    for path in ['/api/v1/auth/me/authorization','/api/v1/access/me','/api/v1/user-identities','/api/v1/memberships','/api/v1/roles','/api/v1/platform/managed-identities']:
        get('https://grc.tecdex.net'+path,401)
    for path in ['/api/v1/platform/tenants:bootstrap','/api/v1/tenant-bootstrap','/api/v1/tenants:bootstrap']:
        get('https://grc.tecdex.net'+path,404)
    issuer='https://iam.grc.tecdex.net/realms/tcdx-managed-identity';discovery=json.loads(get(issuer+'/.well-known/openid-configuration',200));assert discovery['issuer']==issuer
    assert json.loads(get(discovery['jwks_uri'],200))['keys']
    for path in ['/admin/','/admin/master/console/','/realms/master','/realms/master/.well-known/openid-configuration','/realms/master/protocol/openid-connect/auth','/realms/master/protocol/openid-connect/certs']:
        get('https://iam.grc.tecdex.net'+path,404)
    return save('public-postcheck',{'publicGrcHealth':200,'authLoginRoute':'PASS_FRONTEND_LOGIN_AND_PUBLIC_PROVIDER_PROJECTION_NO_LOGIN_INITIATION','deployedAssetsMatchExactImage':True,'canonicalLogoMatches':True,'protectedAnonymousGetsDenied':6,'publicBootstrapProbePathsAbsent':3,'oidcDiscovery':'PASS','issuer':issuer,'jwks':'PASS','publicAdminAndMasterDenied':True,'defaultDeny':'PASS','authenticatedDiscoveryExecuted':False,'functionalMutations':0,'postRequests':0,'humanSessionUsed':False})

def gates():
 for gate in ['unit-regression','frontend-unit','postgres-regression','source-e2e','iam-e2e','typecheck','lint','contracts','source-build','secret-scan','image-e2e']:assert read(gate+'-receipt')['exitCode']==0,gate
 for gate in ['source-e2e','image-e2e']:
  s=(p/('tcdx-grc-mi-tenant-e2e-'+gate+'.log')).read_text();stats=json.JSONDecoder().raw_decode(s[s.index('{'):])[0]['stats'];assert stats['expected']==400 and all(stats[k]==0 for k in ['unexpected','skipped','flaky'])
 assert read('publication')['publication']=='PASS' and read('backend-smoke')['BACKEND_LOCAL_SMOKE']=='PASS' and read('backend-smoke')['compiledImagePostgresTestsPassed']==79
 for c,b in builds.items():
  assert b['build']=='PASS' and b['sourceFingerprint']==freeze['sourceFingerprint'] and b['transportVerify']=='PASS' and read(c+'-image-scan')['IMAGE_CONTENT_CHECK']=='PASS'
  with open(b['transportPath'],'rb')as f:assert hashlib.file_digest(f,'sha256').hexdigest()==b['transportSha256']
 for key,path in [('archiveSha256',freeze['archive']),('manifestSha256',freeze['manifest'])]:
  with open(path,'rb')as f:assert hashlib.file_digest(f,'sha256').hexdigest()==freeze[key]
 for path,mode,size,h in freeze['rows']:
  assert hashlib.sha256((pathlib.Path(freeze['source'])/path).read_bytes()).hexdigest()==h,path
  assert hashlib.sha256((repo/path).read_bytes()).hexdigest()==h,path
 assert freeze['exportsIdentical'] and not any(freeze[k]for k in ['contamination','missing','extra','mismatches'])
def fresh():
 run([node,str(p/'tcdx-grc-mi-tenant-e2e-snapshot.mjs'),'postdeploy'])
 a,b=read('qa-postapply'),read('qa-postdeploy')
 for k in ['migrations','latest','physicalTables','publishedPermissions','ledger','schema','schemaSha256','newPermission','newGrants','preservedData','acme']:assert a[k]==b[k],'QA_DRIFT_'+k
 run(['python3',str(p/'tcdx-grc-mi-tenant-e2e-authority.py'),'after'])
 for k,v in read('authority-preapply').items():
  if k!='capturedAt':assert read('authority-after')[k]==v,'IDENTITY_DRIFT'

def backend_probe(spec):
 js="""const origin='http://127.0.0.1:4000',id='01990000-0000-7000-8000-000000000001';
for(const path of ['/health/live','/health/ready'])if((await fetch(origin+path)).status!==200)throw Error('HEALTH_FAILED');
const checks=[['POST','/api/v1/platform/tenants/'+id+'/users:onboard',401,true],['GET','/api/v1/platform/user-identities/'+id+'/tenant-access',401,true],['POST','/api/v1/platform/tenants:initial-onboarding',401,true],['GET','/api/v1/user-identities',401,true],['GET','/api/v1/auth/me/authorization',401,true],['GET','/api/v1/roles?tenant_id='+id,401,false],['GET','/api/v1/roles?assignable_family=platform',401,true],['GET','/api/v1/platform/managed-identities',401,false],['GET','/api/v1/platform/user-identities/'+id+'/platform-roles',401,true],['POST','/api/v1/memberships/'+id+'/role-assignments',401,false],['POST','/api/v1/platform/tenants:bootstrap',404,false],['POST','/api/v1/tenant-bootstrap',404,false],['POST','/api/v1/tenants:bootstrap',404,false]];
for(const [method,path,status,noStore]of checks){const r=await fetch(origin+path,{method,...(method==='POST'?{headers:{'Content-Type':'application/json'},body:'{}'}:{})});if(r.status!==status||(noStore&&r.headers.get('cache-control')!=='no-store'))throw Error('ROUTE_DENY_FAILED_'+path+'_'+r.status);}
const providers=await (await fetch(origin+'/api/v1/auth/providers')).json();if(!providers.providers.some(p=>p.provider==='TCDX_MANAGED_IDENTITY'&&p.available))throw Error('MANAGED_PROVIDER_UNAVAILABLE');
const {permissionProjectionCatalog}=await import('/app/apps/backend/dist/security/permission-projection-catalog.generated.js');if(JSON.stringify(permissionProjectionCatalog['platform.tenant_user.onboard'])!==JSON.stringify({capabilities:['CORE_PLATFORM'],scopes:['platform']}))throw Error('PERMISSION_METADATA_FAILED');
console.log(JSON.stringify({health:'PASS',anonymousDenies:10,bootstrapPublicPostsAbsent:3,newRoutes:'PASS',cacheNoStore:'PASS',permissionMetadata:'PASS',managedProviderAvailable:true,positiveOnboardingRequests:0,functionalMutations:0}));"""
 remote='import subprocess,json\nr=subprocess.run('+repr(['docker','exec','tcdx-grc-backend','node','--input-type=module','-e',js])+',capture_output=True,text=True)\nassert r.returncode==0,"BACKEND_SECURITY_PROBE_FAILED"\nprint(r.stdout)\n'
 return save('backend-runtime-probes',json.loads(run(ssh+[spec['host'],'python3 -'],remote)))

def parity(spec):
 js="""import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';const root='/app/apps/backend/dist',hashes={};function walk(dir){for(const x of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,x.name);if(x.isDirectory())walk(p);else if(x.isFile()&&p.endsWith('.js'))hashes[path.relative(root,p)]=crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');}}walk(root);console.log(JSON.stringify(hashes));"""
 local=json.loads(run(['docker','run','--rm','--platform','linux/amd64','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges',builds['backend']['imageId'],'node','--input-type=module','-e',js]))
 remote='import subprocess\nr=subprocess.run('+repr(['docker','exec','tcdx-grc-backend','node','--input-type=module','-e',js])+',capture_output=True,text=True)\nassert r.returncode==0\nprint(r.stdout)'
 active=json.loads(run(ssh+[spec['host'],'python3 -'],remote));assert local==active and 'security/tenant-user-onboarding.js'in active
 return save('compiled-parity',{'compiledFilesVerified':len(active),'files':active,'sourceFingerprint':freeze['sourceFingerprint'],'exactImageSourceRuntimeParity':'PASS'})

def transport(spec):
 b=builds[spec['component']];dest='/tmp/'+pathlib.Path(b['transportPath']).name
 remote='import pathlib\np=pathlib.Path('+repr(dest)+')\nassert not p.exists(),"TRANSPORT_DEST_EXISTS"\nprint("READY")'
 run(ssh+[spec['host'],'python3 -'],remote)
 run(['scp','-q','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','UpdateHostKeys=no',b['transportPath'],spec['host']+':'+dest])
 remote='import pathlib,hashlib,json,subprocess\np=pathlib.Path('+repr(dest)+')\np.chmod(0o600)\nwith p.open("rb")as f:h=hashlib.file_digest(f,"sha256").hexdigest()\nassert h=='+repr(b['transportSha256'])+'\nr=subprocess.run(["docker","load","--input",str(p)],capture_output=True,text=True)\nassert r.returncode==0,"IMAGE_LOAD_FAILED"\nim=json.loads(subprocess.check_output(["docker","image","inspect",'+repr(b['tag'])+']))[0]\nassert im["Id"]=='+repr(b['imageId'])+' and im["Architecture"]=="amd64" and im["Os"]=="linux"\nprint(json.dumps({"transportIntegrity":"PASS","imageId":im["Id"],"sha256":h,"destination":str(p)}))'
 return save(spec['component']+'-transport',json.loads(run(ssh+[spec['host'],'python3 -'],remote)))

def logs(since):
 rows=[]
 for h,c in [('tecdex@192.168.2.45','backend'),('tecdex@192.168.2.46','frontend')]:rows+=json.loads(run(ssh+[h,'python3 - '+shlex.quote(c)+' '+shlex.quote(since)],(p/'tcdx-grc-d3-a-rd-h-log-review-remote.py').read_text()))['components']
 save('logs',{'windowStart':since,'components':rows,'rawLogsPersisted':False})
 assert all(c['running']and c['health']=='healthy'and all(c[k]==0 for k in ['restartCount','http5xxUnexpected','sqlErrorsUnexpected','fatalErrors','runtimeErrorRecords','secretFindings','activeBadDomainReferences'])for c in rows),'RUNTIME_LOG_GATE_FAILED'
 return rows

gates();fresh();run(['python3',str(p/'tcdx-grc-mi-tenant-e2e-runtime-capture.py'),'after']);before=read('runtime-after');save('runtime-predeploy',before)
specs=[]
for component,h in [('backend','tecdex@192.168.2.45'),('frontend','tecdex@192.168.2.46')]:
 old=next(c for c in before['components']if c['name']=='tcdx-grc-'+component);b=builds[component]
 spec={'component':component,'host':h,'name':old['name'],'containerId':old['containerId'],'oldImage':old['imageId'],'configurationFingerprint':old['configurationFingerprint'],'imageId':b['imageId'],'tag':b['tag'],'sourceFingerprint':freeze['sourceFingerprint']}
 save(component+'-spec',spec);engine(spec,'custody');specs.append(spec)
save('rollback',{'ready':True,'components':specs,'protectedRawConfigCaptured':False,'exactPreviousObjectsRetained':True})
print('ROLLBACK_READY_BOTH_COMPONENTS',flush=True)
for spec in specs:transport(spec);engine(spec,'preflight')
attempted=[];started=datetime.datetime.now(datetime.timezone.utc).isoformat()
try:
 for spec in specs:
  fresh();attempted.append(spec);result=engine(spec,'deploy');spec['deploymentStartedAt']=result['deploymentStartedAt'];save(spec['component']+'-spec',spec);save(spec['component']+'-deploy',result)
  if spec['component']=='backend':backend_probe(spec);parity(spec)
  else:public()
  print(spec['component'].upper()+'_DEPLOY_HEALTH_ROUTES_PASS',flush=True)
 fresh()
 capture=(p/'tcdx-grc-mi-tenant-e2e-runtime-capture.py').read_text()
 capture=capture.replace("if phase in ['before','after']:expected['tcdx-grc-backend']='sha256:798937c23bb25c99f45431536348c3271a6dfdab553c9f0624c524e644dcc67d'","if phase=='before':expected['tcdx-grc-backend']='sha256:798937c23bb25c99f45431536348c3271a6dfdab553c9f0624c524e644dcc67d'\nif phase=='after':expected.update({"+repr('tcdx-grc-backend')+":"+repr(builds['backend']['imageId'])+","+repr('tcdx-grc-frontend')+":"+repr(builds['frontend']['imageId'])+"})")
 (p/'tcdx-grc-mi-tenant-e2e-runtime-post-capture.py').write_text(capture);run(['python3',str(p/'tcdx-grc-mi-tenant-e2e-runtime-post-capture.py'),'after'])
 iamOld=next(c for c in before['components']if c['name']=='tcdx-managed-identity');iamNew=next(c for c in read('runtime-after')['components']if c['name']=='tcdx-managed-identity');assert iamOld==iamNew,'IAM_RUNTIME_DRIFT'
 for spec in specs:engine(spec,'post-config');engine(spec,'capture-logs')
 logs(started);public();save('postcheck',{'postdeployHealth':'PASS','qaDeploy':'PASS','schemaUnchanged':True,'all235DataFingerprintsUnchangedAfterAuthorizedPublication':True,'acmePreserved':True,'andresPreserved':True,'functionalQaMutations':0,'sameFreezeBothComponents':True,'iamUnchanged':True,'rollbackTriggered':False,'deploymentStartedAt':started});print('QA_DEPLOY_POSTCHECK_PASS',flush=True)
except Exception as error:
 restored=[]
 for spec in reversed(attempted):
  try:restored.append(engine(spec,'rollback'))
  except Exception as rollbackError:restored.append({'rollbackResult':'FAIL','safeError':str(rollbackError)})
 save('terminal-failure',{'materialFailure':str(error),'automaticRollback':restored,'functionalQaMutations':0});raise
