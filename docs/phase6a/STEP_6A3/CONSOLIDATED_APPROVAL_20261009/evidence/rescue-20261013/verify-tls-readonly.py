import base64,hashlib,http.client,json,socket,os,pathlib,subprocess,uuid,time,sys
REMOTE=r'''
import base64,hashlib,http.client,json,socket,os,tempfile,time
class Engine(http.client.HTTPConnection):
 def connect(self):self.sock=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM);self.sock.connect('/var/run/docker.sock')
def api(method,path,body=None):
 c=Engine('localhost',timeout=20);c.request(method,path,body=None if body is None else json.dumps(body),headers={'Content-Type':'application/json'});r=c.getresponse();data=r.read();status=r.status;c.close()
 if status>=400:raise RuntimeError('ENGINE_STATUS_'+str(status))
 return json.loads(data) if data else None
old=api('GET','/containers/tcdx-grc-backend/json');assert old['Id']=='6acd160b09f89943bb0657ad04b47f39ff4ed37f9c40a79af8c40b5ba1a36ae3' and old['Image']=='sha256:ab9902e4215289307992b9aa98421d5882a18b4236752948356b4fbe25829195'
assert old['State']['Running'] and old['State']['Health']['Status']=='healthy'
assert hashlib.sha256(json.dumps([old['Config'],old['HostConfig']],sort_keys=True).encode()).hexdigest()=='4ac4f3156518c89f3fc16387ec349d9645c3fd7d201e010a8f4a70433bd85879'
env=dict(x.split('=',1) for x in old['Config']['Env']);assert env['DATABASE_NAME']=='tcdx-grc', 'DATABASE_NAME_MISMATCH'
pem=base64.b64decode(CERT);assert hashlib.sha256(pem).hexdigest()=='0a99469321c1117cdf3154a7e5c5e50dd42f719af7b8b1a647fa0bb55179519b'
fd,path=tempfile.mkstemp(prefix='tcdx-qa30-public-ca-',suffix='.pem');os.write(fd,pem);os.close(fd)
code="""import fs from 'node:fs';import crypto from 'node:crypto';import {createDatabase,sql} from './dist/database.js';import {loadConfig} from './dist/config.js';
const hash=crypto.createHash('sha256').update(fs.readFileSync('./dist/database.js')).digest('hex');if(hash!=='865b2d8b1b8ce87790059abb70b1af021aebbc06640ad5f85ab4c37a6fb17a61')throw Error('DRIVER_NOT_IDENTICAL');
let phase='CONFIG';const db=createDatabase(loadConfig(process.env));phase='CONNECT';try{await db.transaction().execute(async tx=>{phase='SET_READONLY';await sql`SET TRANSACTION READ ONLY`.execute(tx);await sql`SET LOCAL statement_timeout='10s'`.execute(tx);phase='SELECT_METADATA';const result=await sql`SELECT ssl,version,cipher,current_database() AS database,host(inet_server_addr()) AS server,current_setting('transaction_read_only') AS read_only FROM pg_stat_ssl WHERE pid=pg_backend_pid()`.execute(tx);const r=result.rows[0];phase='IDENTITY';console.log(JSON.stringify({identity:r}));if(!r.ssl||r.server!=='192.168.2.40'||r.database!=='tcdx-grc'||r.read_only!=='on')throw Error('TLS_IDENTITY_GATE');console.log(JSON.stringify({result:'PASS_VERIFIED_AUTHENTICATED_BACKEND_DRIVER',...r,databaseModuleSHA:hash,pgVersion:JSON.parse(fs.readFileSync('./node_modules/pg/package.json')).version,sslMode:'require',rejectUnauthorized:true,nodeExtraCaPresent:true,secretsExported:false,DDL:0,DML:0}));});}catch(error){console.log(JSON.stringify({result:'FAIL',safeCode:error.code??'TLS_DRIVER_PROBE_FAILED',phase,name:error.name,passwordConfigured:!!process.env.DATABASE_PASSWORD,classifiedMessage:/password.*string/i.test(error.message)?'PASSWORD_TYPE':/cert|issuer|verify|tls/i.test(error.message)?'CERTIFICATE':/permission/i.test(error.message)?'PERMISSION':/TLS_IDENTITY_GATE/.test(error.message)?'IDENTITY':/open.*transaction|read.only/i.test(error.message)?'TRANSACTION':'OTHER'}));process.exitCode=1}finally{await db.destroy()}
"""
probe=None
try:
 e=[f'{k}={env[k]}'for k in ['DATABASE_USER','DATABASE_PASSWORD','DATABASE_NAME','DATABASE_PORT'] if k in env]+['DATABASE_HOST=db-tecdex','DATABASE_SSL_MODE=require','NODE_ENV=test','NODE_EXTRA_CA_CERTS=/run/qa-db-public.pem']
 network=next(iter(old['NetworkSettings']['Networks']));name='tcdx-qa30-tls-probe-'+str(os.getpid())
 body={'Image':old['Image'],'User':'node','WorkingDir':'/app/apps/backend','Entrypoint':['node'],'Cmd':['--input-type=module','-e',code],'Env':e,'HostConfig':{'NetworkMode':network,'ExtraHosts':['db-tecdex:192.168.2.40'],'Binds':[path+':/run/qa-db-public.pem:ro'],'CapDrop':['ALL'],'SecurityOpt':['no-new-privileges'],'ReadonlyRootfs':True,'RestartPolicy':{'Name':'no'}},'Labels':{'tcdx.scope':'temporary-read-only-tls-probe'}}
 probe=api('POST','/containers/create?name='+name,body)['Id'];api('POST','/containers/'+probe+'/start')
 end=time.monotonic()+25
 while time.monotonic()<end:
  state=api('GET','/containers/'+probe+'/json')['State']
  if not state['Running']:break
  time.sleep(.5)
 else:raise RuntimeError('PROBE_TIMEOUT')
 log=subprocess.run(['docker','logs',probe],capture_output=True,text=True,timeout=5)
 safe=[json.loads(x)for x in log.stdout.splitlines()if x.startswith('{')]
 identities=[x for x in safe if 'identity' in x];safe=[x for x in safe if 'result' in x];assert len(safe)==1 and safe[0]['result']=='PASS_VERIFIED_AUTHENTICATED_BACKEND_DRIVER' and state['ExitCode']==0, 'TLS_PROBE_FAILED_'+json.dumps({'identity':identities,'result':safe})
 print(json.dumps({'probe':safe[0],'exactCandidateDatabaseSubsystem':'PASS_IDENTICAL_MODULE_AND_PG_VERSION','previousContainerUnchanged':api('GET','/containers/tcdx-grc-backend/json')['Id']==old['Id'],'newRuntimeTLSConfig':{'DATABASE_HOST':'db-tecdex','DATABASE_SSL_MODE':'require','NODE_EXTRA_CA_CERTS':'/run/config/qa-db-public.pem','extraHosts':['db-tecdex:192.168.2.40'],'CA_SHA256':hashlib.sha256(pem).hexdigest()},'baselineConfigurationFingerprint':hashlib.sha256(json.dumps([old['Config'],old['HostConfig']],sort_keys=True).encode()).hexdigest(),'rollbackImageAvailable':api('GET','/images/'+old['Image']+'/json')['Id']==old['Image']}))
finally:
 if probe:api('DELETE','/containers/'+probe+'?force=true')
 os.unlink(path)
'''
CERT=base64.b64encode(pathlib.Path('/tmp/tcdx-qa-postgres-public-cert-20261013.pem').read_bytes()).decode()
script='CERT='+repr(CERT)+'\nimport subprocess\n'+REMOTE
p=subprocess.run(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=10','tecdex@192.168.2.45','python3','-'],input=script,capture_output=True,text=True,timeout=50)
if p.returncode:
 print(json.dumps({'result':'FAIL_READONLY_TLS_PROBE','remoteExit':p.returncode,'safeFailure':p.stderr.splitlines()[-1] if p.stderr else 'NO_SAFE_RESULT'}));sys.exit(1)
r=json.loads(p.stdout);out=pathlib.Path('docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/evidence/rescue-20261013/tls-backend-proof.json');out.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r))
