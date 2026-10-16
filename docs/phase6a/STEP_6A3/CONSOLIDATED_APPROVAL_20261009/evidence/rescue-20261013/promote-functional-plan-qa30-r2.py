import argparse,datetime,hashlib,json,pathlib,re,shlex,subprocess,sys,urllib.request
p=pathlib.Path(__file__).resolve().parent
repo=p.parents[5]
parser=argparse.ArgumentParser();parser.add_argument('--go-receipt',required=True);parser.add_argument('--go-sha256',required=True);a=parser.parse_args()
rpath=pathlib.Path(a.go_receipt);raw=rpath.read_bytes();receipt=json.loads(raw);ops=json.loads((p/'functional-plan-qa30-operational-specs-r2.json').read_text());release=json.loads((p/'functional-plan-qa30-package-r2.json').read_text())
assert hashlib.sha256(raw).hexdigest()==a.go_sha256,'GO_HASH_MISMATCH'
assert receipt['decision']=='GO' and receipt['driver_sha256']==ops['driver_sha256'] and receipt['specs']==ops['specs'] and receipt['human_approval_record'],'EXACT_HUMAN_GO_REQUIRED'
assert hashlib.sha256((p/'functional-qa30-runtime-driver-r2.py').read_bytes()).hexdigest()==ops['driver_sha256']==release['rollback']['driver_sha256']
assert all(receipt['gates'][x]=='PASS' for x in ['RELEASE_SCOPE','SECURITY_RUNTIME_TLS','BACKUP_RECOVERY_REFERENCE','ROLLBACK_PAIR'])
root='/home/tecdex/.cache/tcdx-grc/functional-plan-qa30-r2-20261013';ssh=['ssh','-o','BatchMode=yes','-o','ConnectTimeout=10','-o','StrictHostKeyChecking=yes'];results={};touched=[]
def safe_reason(error):
 reason=str(error)
 if not isinstance(error,RuntimeError):return 'ASSERTION_OR_OPERATION_GATE_FAILED'
 if reason in {'DEPLOY_FAILED_AND_COMPONENT_RESTORED','BACKEND_DATABASE_TLS_PROBE_FAILED'}:return reason
 if re.fullmatch(r'COMMAND_FAILED_(ssh|scp)',reason):return reason
 match=re.fullmatch(r'DRIVER_FAILED_(backend|frontend)_(SAFE_COMMAND_FAILED|ASSERTION_GATE_FAILED|OPERATION_GATE)',reason)
 if match:return reason
 if re.fullmatch(r'DRIVER_GUARD_OR_EXECUTION_FAILED_(backend|frontend)',reason):return reason
 return 'UNCLASSIFIED_OPERATION_GATE_FAILED'
def window():
 now=datetime.datetime.now(datetime.timezone.utc);assert datetime.datetime.fromisoformat(receipt['window_start_utc'])<=now<=datetime.datetime.fromisoformat(receipt['window_end_utc']),'GO_WINDOW_EXPIRED'
def run(args,timeout=45):
 r=subprocess.run(args,capture_output=True,text=True,timeout=timeout)
 if r.returncode:raise RuntimeError('COMMAND_FAILED_'+args[0])
 return r.stdout
# Never echo inspect output, protected environment or unfiltered logs.
def remote(host,args,timeout=45):return run(ssh+[host,shlex.join(args)],timeout)
def action(spec,verb):
 if verb!='rollback':window()
 cmd=['env','TCDX_QA_GO_RECEIPT='+root+'/go-receipt.json','TCDX_QA_GO_RECEIPT_SHA256='+a.go_sha256,'python3',root+'/driver.py',json.dumps(spec,separators=(',',':')),verb]
 r=subprocess.run(ssh+[spec['host'],shlex.join(cmd)],capture_output=True,text=True,timeout=270)
 try:j=json.loads(r.stdout)
 except ValueError:raise RuntimeError('DRIVER_GUARD_OR_EXECUTION_FAILED_'+spec['component'])
 results[spec['component']+'_'+verb]=j;(p/'qa-functional-execution-r2.json').write_text(json.dumps(results,indent=2)+'\n')
 print(spec['component']+' '+verb+' '+j.get('deploy',j.get('preflight',j.get('rollbackResult',j.get('result','PASS')))),flush=True)
 if r.returncode:raise RuntimeError('DRIVER_FAILED_'+spec['component']+'_'+j.get('safeFailure','OPERATION_GATE'))
 if j.get('deploy')=='FAIL':raise RuntimeError('DEPLOY_FAILED_AND_COMPONENT_RESTORED')
 return j
def copy(host,source,dest):run(['scp','-q','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes',str(source),host+':'+dest],90)
backend=ops['specs']['tcdx-grc-backend'];frontend=ops['specs']['tcdx-grc-frontend']
try:
 window()
 # Final compare before the first remote write; does not copy secrets.
 code="import json,hashlib,subprocess,sys;spec=json.loads(sys.argv[1]);c=json.loads(subprocess.check_output(['docker','inspect',spec['name']]))[0];assert c['Id']==spec['containerId'] and c['Image']==spec['oldImage'] and c['State']['Running'] and c['State']['Health']['Status']=='healthy' and c['RestartCount']==spec['baselineRestartCount'];assert hashlib.sha256(json.dumps([c['Config'],c['HostConfig']],sort_keys=True).encode()).hexdigest()==spec['configurationFingerprint'];assert json.loads(subprocess.check_output(['docker','image','inspect',spec['oldImage']]))[0]['Id']==spec['oldImage'];print('PREWRITE_ID_CONFIG_RECOVERY=PASS')"
 for spec in [backend,frontend]:remote(spec['host'],['python3','-c',code,json.dumps(spec)])
 for spec in [backend,frontend]:
  window();host=spec['host'];remote(host,['mkdir','-p',root]);remote(host,['chmod','700',root]);copy(host,p/'functional-qa30-runtime-driver-r2.py',root+'/driver.py');copy(host,rpath,root+'/go-receipt.json');remote(host,['chmod','600',root+'/driver.py',root+'/go-receipt.json'])
  if spec['component']=='backend':
   ca=spec['tlsRepair']['caHostFile'];assert remote(host,['sha256sum',ca]).split()[0]==spec['tlsRepair']['caSHA256'],'PUBLIC_CA_CHANGED'
  image=release['build'][spec['component']];source=repo/image['transport_path'];assert hashlib.sha256(source.read_bytes()).hexdigest()==image['transport_sha256'],'LOCAL_TRANSPORT_HASH_MISMATCH'
  dest=root+'/'+source.name;copy(host,source,dest);remote(host,['chmod','600',dest]);assert remote(host,['sha256sum',dest]).split()[0]==image['transport_sha256'],'REMOTE_TRANSPORT_HASH_MISMATCH'
  remote(host,['docker','image','load','--input',dest],90)
  action(spec,'loaded')
  action(spec,'preflight')
 touched=[frontend,backend]
 action(frontend,'park')
 action(backend,'deploy')
 action(frontend,'deploy')
 for spec in [backend,frontend]:action(spec,'post-config')
 tls_probe="""import {createDatabase,sql} from './dist/database.js';import {loadConfig} from './dist/config.js';if(process.env.DATABASE_SSL_MODE!=='require'||process.env.DATABASE_HOST!=='db-tecdex'||process.env.NODE_EXTRA_CA_CERTS!=='/run/config/qa-db-public.pem')throw Error('TLS_CONFIG_MISMATCH');const db=createDatabase(loadConfig(process.env));try{await db.transaction().execute(async tx=>{await sql`SET TRANSACTION READ ONLY`.execute(tx);await sql`SET LOCAL statement_timeout='10s'`.execute(tx);const r=(await sql`SELECT ssl,version,cipher,host(inet_server_addr()) AS server,current_database() AS database,current_setting('transaction_read_only') AS read_only FROM pg_stat_ssl WHERE pid=pg_backend_pid()`.execute(tx)).rows[0];if(!r.ssl||r.server!=='192.168.2.40'||r.database!=='tcdx-grc'||r.read_only!=='on')throw Error('TLS_IDENTITY_MISMATCH');console.log(JSON.stringify({result:'PASS_VERIFIED',ssl:r.ssl,version:r.version,cipher:r.cipher,server:r.server,database:r.database,readOnly:r.read_only,hostname:'db-tecdex',rejectUnauthorized:true}));});}catch(e){console.log(JSON.stringify({result:'FAIL',safeCode:e.code??'TLS_PROBE_FAILURE'}));process.exitCode=1}finally{await db.destroy()}"""
 results['backendTls']=json.loads(remote(backend['host'],['docker','exec','-w','/app/apps/backend',backend['name'],'node','--input-type=module','-e',tls_probe],30))
 assert results['backendTls']['result']=='PASS_VERIFIED','BACKEND_DATABASE_TLS_PROBE_FAILED'
 public={}
 for path,expected in [('/',200),('/api/v1/auth/providers',200),('/api/v1/auth/me/authorization',404),('/api/v2/auth/me/authorization',401),('/api/v1/platform/plan-versions',401)]:
  try:
   with urllib.request.urlopen('https://grc.tecdex.net'+path,timeout=15) as response:status=response.status;body=response.read()
  except urllib.error.HTTPError as error:status=error.code;body=error.read()
  assert status==expected,'PUBLIC_SMOKE_STATUS';public[path]={'status':status,'bodySHA256':hashlib.sha256(body).hexdigest()}
 # Check exact frontend asset bytes served through public Caddy.
 for asset in release['build']['frontend']['assets']:
  with urllib.request.urlopen('https://grc.tecdex.net'+asset['path'],timeout=15) as response:body=response.read();assert response.status==200 and hashlib.sha256(body).hexdigest()==asset['sha256'],'PUBLIC_ASSET_MISMATCH'
 for spec in [backend,frontend]:action(spec,'capture-logs')
 results['publicSmoke']={'result':'PASS','paths':public,'exactFrontendAssets':'PASS','humanPlanAssignment':'HUMAN_VALIDATION_PENDING'}
 results['QA_DEPLOY_STATUS']='DEPLOYED';(p/'qa-functional-execution-r2.json').write_text(json.dumps(results,indent=2)+'\n');print('QA_FUNCTIONAL_PLAN_ASSET_VISIBLE=PASS',flush=True)
except Exception as error:
 results['failure']={'safeClass':type(error).__name__,'safeReason':safe_reason(error)}
 print('QA_FAILURE_CLASS='+results['failure']['safeClass']+' QA_FAILURE_REASON='+results['failure']['safeReason'],flush=True)
 if touched:
  # Restore backend first, then expose the matching previous frontend.
  for spec in [backend,frontend]:
   try:action(spec,'rollback')
   except Exception:results[spec['component']+'_rollback_failure']='REQUIRES_OPERATOR_RECOVERY'
   print('QA_'+spec['component'].upper()+'_ROLLBACK='+('PASS' if results.get(spec['component']+'_rollback',{}).get('rollbackResult')=='PASS' else 'REQUIRES_OPERATOR_RECOVERY'),flush=True)
  results['QA_DEPLOY_STATUS']='ROLLED_BACK'
 else:results['QA_DEPLOY_STATUS']='NOT_DEPLOYED'
 (p/'qa-functional-execution-r2.json').write_text(json.dumps(results,indent=2)+'\n');print('QA_DEPLOY_STATUS='+results['QA_DEPLOY_STATUS'],flush=True);sys.exit(1)
