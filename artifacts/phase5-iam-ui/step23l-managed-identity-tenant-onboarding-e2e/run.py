import os,json,subprocess,pathlib,sys
repo=pathlib.Path('/Users/andresbarouh/repos/tcdx-grc');node=pathlib.Path('/tmp/tcdx-grc-npm-cache/_npx/5dad66f2cb301fc2/node_modules/node/bin/node')
env=os.environ.copy()
for k in list(env):
 if any(s in k for s in ['PASSWORD','CLIENT_SECRET','ACCESS_TOKEN','REFRESH_TOKEN','PRIVATE_KEY']) or k.startswith(('DATABASE_','MANAGED_IDENTITY_','OIDC_','APP_JWT_','OBJECT_STORAGE_','TCDX_','VITE_')):env.pop(k,None)
env['PATH']=str(node.parent)+':'+env['PATH'];env['VITE_API_ORIGIN']='http://127.0.0.1:4173';env['TCDX_UI_EVIDENCE_DIR']='/tmp/tcdx-grc-step23l-tenant-onboarding-d3-r-ui/core-regression'
mode,name=sys.argv[1:3];args=sys.argv[3:];env['VITE_API_ORIGIN']='https://grc.tecdex.net' if mode=='static' else 'http://127.0.0.1:4173';root=repo
if mode=='isolated':
 c=json.loads(subprocess.check_output(['docker','inspect','tcdx-grc-phase3-postgres-16']))[0];assert c['State']['Running'] and c['NetworkSettings']['Ports']['5432/tcp']==[{'HostIp':'127.0.0.1','HostPort':'55432'}]
 cfg=dict(x.split('=',1)for x in c['Config']['Env']if '='in x);env.update(DATABASE_HOST='127.0.0.1',DATABASE_PORT='55432',DATABASE_NAME='tcdx-grc',DATABASE_USER=cfg.get('POSTGRES_USER','postgres'),DATABASE_SSL_MODE='disable',TCDX_ISOLATED_REBUILD='true',TCDX_SECURITY_INTEGRATION='true',TCDX_PHASE5_LIFECYCLE_INTEGRATION='true')
 if cfg.get('POSTGRES_PASSWORD'):env['DATABASE_PASSWORD']=cfg['POSTGRES_PASSWORD']
elif mode in ['unit','e2e']:env.update(TCDX_ISOLATED_REBUILD='false',TCDX_SECURITY_INTEGRATION='false',TCDX_PHASE5_LIFECYCLE_INTEGRATION='false')
else:assert mode=='static'
log=pathlib.Path('/tmp/tcdx-grc-mi-tenant-e2e-'+name+'.log')
with log.open('w')as f:result=subprocess.run(args,cwd=root,env=env,stdout=f,stderr=subprocess.STDOUT)
out={'gate':name,'exitCode':result.returncode,'mode':mode,'log':str(log),'node':'22.23.2','qaSecretsInherited':False,'mutationsTarget':'LOCAL_ONLY'}
pathlib.Path('/tmp/tcdx-grc-mi-tenant-e2e-'+name+'-receipt.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out));print(log.read_text()[-2800:]);raise SystemExit(result.returncode)
