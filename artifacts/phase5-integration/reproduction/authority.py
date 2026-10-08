import json,pathlib,socket,subprocess,time,os,sys
phase=sys.argv[1]
tmp=pathlib.Path('/tmp')
ssh=['ssh','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','UpdateHostKeys=no','-o','ConnectTimeout=6']
remote="""import json,subprocess,pathlib,stat,sys,urllib.parse
c=json.loads(subprocess.check_output(['docker','inspect','tcdx-managed-identity']))[0]
m=[m for m in c['Mounts'] if m['Destination'].endswith('/keycloak.conf')];assert len(m)==1 and not m[0]['RW']
p=pathlib.Path(m[0]['Source']);s=p.lstat();assert stat.S_ISREG(s.st_mode) and not stat.S_ISLNK(s.st_mode) and stat.S_IMODE(s.st_mode) in [0o400,0o600]
conf={}
for line in p.read_text().splitlines():
 line=line.strip()
 if line and not line.startswith('#') and '=' in line:
  key,value=line.split('=',1);conf[key.strip()]=value.strip()
assert conf['db']=='postgres' and 'db-username' in conf and 'db-password' in conf
url=conf.get('db-url','');assert url.startswith('jdbc:postgresql://192.168.2.40:5432/tcdx-keycloak')
query=urllib.parse.parse_qs(urllib.parse.urlparse(url.removeprefix('jdbc:')).query)
assert query.get('sslmode')==['require']
sys.stdout.write(json.dumps({'user':conf['db-username'],'password':conf['db-password'],'database':'tcdx-keycloak','sslMode':'require'}))
"""
# Existing IAM database custody enters only a subprocess pipe, never tool output,
# evidence, argv, environment or a local file. No IAM/GRC bearer token is used.
r=subprocess.run(ssh+['tecdex@192.168.2.46','python3 -'],input=remote,capture_output=True,text=True)
if r.returncode:print(json.dumps({'iamReadOnly':'BLOCKED','safeReason':'EXISTING_DATABASE_CUSTODY_CHECK_FAILED'}));raise SystemExit(1)
config=json.loads(r.stdout)
with socket.socket() as listener:
 listener.bind(('127.0.0.1',0));port=listener.getsockname()[1]
tunnel=subprocess.Popen(ssh+['-N','-o','ExitOnForwardFailure=yes','-L',f'127.0.0.1:{port}:192.168.2.40:5432','tecdex@192.168.2.46'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
try:
 for i in range(30):
  if tunnel.poll() is not None:raise RuntimeError('READ_ONLY_TRANSPORT_FAILED')
  try:
   with socket.create_connection(('127.0.0.1',port),timeout=.2):break
  except OSError:time.sleep(.1)
 else:raise RuntimeError('READ_ONLY_TRANSPORT_TIMEOUT')
 config.update(host='127.0.0.1',port=port)
 node='/tmp/tcdx-grc-npm-cache/_npx/5dad66f2cb301fc2/node_modules/node/bin/node'
 p=subprocess.run([node,'/tmp/tcdx-grc-phase5-integration-authority.mjs'],input=json.dumps(config),capture_output=True,text=True)
 if p.returncode and not p.stdout.strip():raise RuntimeError('READ_ONLY_QUERY_FAILED')
 result=json.loads(p.stdout);result.update(databaseConnection='Existing IAM PostgreSQL principal over encrypted private SSH, READ ONLY transaction; no bearer token or human session',newAuthorityCreated=False,credentialValuesPrintedOrPersisted=False)
 (tmp/('tcdx-grc-phase5-integration-authority-'+phase+'.json')).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:result.get(k) for k in ['capturedAt','enabled','identityActive','activePlatformAdmin','membership','tenantRoles','requiredActions','otp','sessions','pass']}));raise SystemExit(0 if result['pass'] else 1)
finally:
 tunnel.terminate();tunnel.wait(timeout=10)
