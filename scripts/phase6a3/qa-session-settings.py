import json,socket,subprocess,time,pathlib
ssh=['ssh','-o','BatchMode=yes','-o','ConnectTimeout=6']
remote="import json,subprocess,pathlib,stat,sys,urllib.parse\nc=json.loads(subprocess.check_output(['docker','inspect','tcdx-managed-identity']))[0]\nm=[m for m in c['Mounts'] if m['Destination'].endswith('/keycloak.conf')];assert len(m)==1 and not m[0]['RW']\np=pathlib.Path(m[0]['Source']);s=p.lstat();assert stat.S_ISREG(s.st_mode) and not stat.S_ISLNK(s.st_mode) and stat.S_IMODE(s.st_mode) in [0o400,0o600]\nconf={}\nfor line in p.read_text().splitlines():\n line=line.strip()\n if line and not line.startswith('#') and '=' in line:\n  key,value=line.split('=',1);conf[key.strip()]=value.strip()\nassert conf['db']=='postgres' and 'db-username' in conf and 'db-password' in conf\nurl=conf.get('db-url','');assert url.startswith('jdbc:postgresql://192.168.2.40:5432/tcdx-keycloak')\nquery=urllib.parse.parse_qs(urllib.parse.urlparse(url.removeprefix('jdbc:')).query)\nassert query.get('sslmode')==['require']\nsys.stdout.write(json.dumps({'user':conf['db-username'],'password':conf['db-password'],'database':'tcdx-keycloak','sslMode':'require'}))\n"

r=subprocess.run(ssh+['tecdex@192.168.2.46','python3 -'],input=remote,capture_output=True,text=True,check=True)
config=json.loads(r.stdout)
with socket.socket() as listener:
 listener.bind(('127.0.0.1',0));port=listener.getsockname()[1]
tunnel=subprocess.Popen(ssh+['-N','-o','ExitOnForwardFailure=yes','-L',f'127.0.0.1:{port}:192.168.2.40:5432','tecdex@192.168.2.46'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
try:
 for i in range(40):
  try:
   with socket.create_connection(('127.0.0.1',port),timeout=.2):break
  except OSError:time.sleep(.1)
 config.update(host='127.0.0.1',port=port)
 p=subprocess.run(['node','scripts/phase6a3/qa-session-settings.mjs'],input=json.dumps(config),capture_output=True,text=True)
 if p.returncode: raise RuntimeError('READ_ONLY_QUERY_FAILED: '+p.stderr[-500:])
 result=json.loads(p.stdout)
 pathlib.Path("docs/phase6a/STEP_6A3/evidence/session-duration-20261019/keycloak-settings-readonly.json").write_text(json.dumps(result,indent=2)+"\n")
 print(json.dumps(result))
finally:
 tunnel.terminate();tunnel.wait(timeout=10)
