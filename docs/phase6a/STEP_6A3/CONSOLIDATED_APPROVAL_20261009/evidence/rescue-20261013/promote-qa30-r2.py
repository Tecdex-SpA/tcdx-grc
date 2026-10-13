import argparse,datetime,hashlib,json,pathlib,shlex,subprocess,sys,urllib.request
p=pathlib.Path(__file__).resolve().parent
parser=argparse.ArgumentParser();parser.add_argument('--go-receipt',required=True);parser.add_argument('--go-sha256',required=True);a=parser.parse_args()
rpath=pathlib.Path(a.go_receipt);raw=rpath.read_bytes();receipt=json.loads(raw);ops=json.loads((p/'operational-specs-r2.json').read_text());release=json.loads((p/'RELEASE_MANIFEST.json').read_text())
assert hashlib.sha256(raw).hexdigest()==a.go_sha256,'GO_HASH_MISMATCH'
assert receipt['decision']=='GO' and receipt['driver_sha256']==ops['driver_sha256'] and receipt['specs']==ops['specs'] and receipt['human_approval_record'],'EXACT_HUMAN_GO_REQUIRED'
assert hashlib.sha256((p/'iana-qa30-tls-runtime-driver-r2.py').read_bytes()).hexdigest()==ops['driver_sha256']
assert all(receipt['gates'][x]=='PASS' for x in ['RELEASE_SCOPE','SECURITY_RUNTIME_TLS','BACKUP_RECOVERY_REFERENCE','ROLLBACK_PAIR'])
root='/home/tecdex/.cache/tcdx-grc/iana-qa30-20261013';ssh=['ssh','-o','BatchMode=yes','-o','ConnectTimeout=10','-o','StrictHostKeyChecking=yes'];results={};touched=[];transport_started=False
def window():
 now=datetime.datetime.now(datetime.timezone.utc);assert datetime.datetime.fromisoformat(receipt['window_start_utc'])<=now<=datetime.datetime.fromisoformat(receipt['window_end_utc']),'GO_WINDOW_EXPIRED'
def run(args,timeout=45):
 r=subprocess.run(args,capture_output=True,text=True,timeout=timeout)
 if r.returncode:raise RuntimeError('COMMAND_FAILED_'+args[0])
 return r.stdout
# Never echo inspect output, protected environment or unfiltered logs.
def remote(host,args,timeout=45):return run(ssh+[host,shlex.join(args)],timeout)
def action(spec,verb):
 window();cmd=['env','TCDX_QA_GO_RECEIPT='+root+'/go-receipt.json','TCDX_QA_GO_RECEIPT_SHA256='+a.go_sha256,'python3',root+'/driver.py',json.dumps(spec,separators=(',',':')),verb]
 value=remote(spec['host'],cmd,270);j=json.loads(value);results[spec['component']+'_'+verb]=j;(p/'qa-execution.json').write_text(json.dumps(results,indent=2)+'\n');print(spec['component']+' '+verb+' '+j.get('deploy',j.get('preflight',j.get('rollbackResult','PASS'))),flush=True)
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
  window();host=spec['host'];remote(host,['mkdir','-p',root]);remote(host,['chmod','700',root]);copy(host,p/'iana-qa30-tls-runtime-driver-r2.py',root+'/driver.py');copy(host,rpath,root+'/go-receipt.json');remote(host,['chmod','600',root+'/driver.py',root+'/go-receipt.json'])
  if spec['component']=='backend':
   ca=spec['tlsRepair']['caHostFile'];remote(host,['mkdir','-p','/home/tecdex/.config/tcdx-grc']);copy(host,p/'qa-db-public.pem',ca);remote(host,['chmod','600',ca])
  image=release['images'][spec['component']];transport=next(x for x in release['transport_custody'] if x['sha256']==image['transport_sha256']);source=pathlib.Path(transport['path']);assert hashlib.sha256(source.read_bytes()).hexdigest()==transport['sha256'];dest=root+'/'+source.name;copy(host,source,dest);remote(host,['chmod','600',dest]);pin=remote(host,['sha256sum',dest]).split()[0];assert pin==transport['sha256'];remote(host,['docker','image','load','--input',dest],90);action(spec,'preflight')
 action(frontend,'park');touched=[frontend]
 action(backend,'deploy');touched.append(backend)
 action(frontend,'deploy')
 for spec in [backend,frontend]:action(spec,'post-config')
 public={}
 for path,expected in [('/',200),('/api/v1/auth/providers',200),('/api/v1/auth/me/authorization',404),('/api/v2/auth/me/authorization',401)]:
  try:
   with urllib.request.urlopen('https://grc.tecdex.net'+path,timeout=15) as response:status=response.status;body=response.read()
  except urllib.error.HTTPError as error:status=error.code;body=error.read()
  assert status==expected,'PUBLIC_SMOKE_STATUS';public[path]={'status':status,'bodySHA256':hashlib.sha256(body).hexdigest()}
 # Check exact frontend asset bytes served through public Caddy.
 for asset in release['images']['frontend']['validation']['assets']:
  with urllib.request.urlopen('https://grc.tecdex.net'+asset['path'],timeout=15) as response:body=response.read();assert response.status==200 and hashlib.sha256(body).hexdigest()==asset['sha256'],'PUBLIC_ASSET_MISMATCH'
 for spec in [backend,frontend]:action(spec,'capture-logs')
 results['publicSmoke']={'result':'PASS','paths':public,'exactFrontendAssets':'PASS','humanLoginAndTenantValidation':'HUMAN_VALIDATION_PENDING'}
 results['QA_DEPLOY_STATUS']='DEPLOYED';results['QA_IANA_VISIBLE']='PASS';(p/'qa-execution.json').write_text(json.dumps(results,indent=2)+'\n');print('QA_IANA_VISIBLE=PASS',flush=True)
except Exception as error:
 results['failure']={'safeClass':type(error).__name__,'safeReason':str(error) if isinstance(error,RuntimeError) else 'ASSERTION_OR_OPERATION_GATE_FAILED'}
 if touched:
  # Restore backend first, then expose the matching previous frontend.
  for spec in [backend,frontend]:
   try:action(spec,'rollback')
   except Exception:results[spec['component']+'_rollback_failure']='REQUIRES_OPERATOR_RECOVERY'
  results['QA_DEPLOY_STATUS']='ROLLED_BACK'
 else:results['QA_DEPLOY_STATUS']='NOT_DEPLOYED'
 (p/'qa-execution.json').write_text(json.dumps(results,indent=2)+'\n');print('QA_DEPLOY_STATUS='+results['QA_DEPLOY_STATUS'],flush=True);sys.exit(1)
