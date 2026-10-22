#!/usr/bin/env python3
"""Disposable synthetic canonical-chain test; no QA credentials, network or mounts."""
import subprocess,json,uuid,time,sys
from pathlib import Path
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3]
IMAGE='sha256:0ea6700a3b4f0ae6ce746519073558aed4d88a79d8d07622a9a644946c7319c4'
def run(a,**kw):return subprocess.run(a,capture_output=True,check=True,**kw)
name='grc-canonical-synthetic-'+uuid.uuid4().hex[:12];mode=sys.argv[1];assert mode in ['project','final','final2','stabilized']
out=BASE/('SYNTHETIC_'+mode.upper()+'.json');assert not out.exists()
result={}
try:
 run(['docker','run','-d','--name',name,'--label','tcdx.purpose=canonical-synthetic-only','--network','none','--tmpfs','/var/lib/postgresql/data:rw,noexec,nosuid,size=768m','-e','POSTGRES_DB=tcdx-grc','-e','POSTGRES_HOST_AUTH_METHOD=trust',IMAGE,'-c','listen_addresses=127.0.0.1','-c','max_connections=10','-c','max_locks_per_transaction=1024'])
 info=json.loads(run(['docker','inspect',name],text=True).stdout)[0];assert info['HostConfig']['NetworkMode']=='none' and not info['Mounts'] and not info['HostConfig'].get('PortBindings')
 for i in range(60):
  if subprocess.run(['docker','exec',name,'pg_isready','-U','postgres','-d','tcdx-grc'],capture_output=True).returncode==0:break
  time.sleep(.5)
 identity=run(['docker','exec',name,'psql','-XAt','-U','postgres','-d','tcdx-grc','-c','SELECT system_identifier FROM pg_control_system()'],text=True).stdout.strip()
 cmd=['docker','run','--rm','--read-only','--tmpfs','/tmp:rw,noexec,nosuid,size=256m','--network','container:'+name,'--mount','type=bind,src='+str(ROOT)+',dst=/work,readonly','-w','/work']
 for k,v in {'DATABASE_HOST':'127.0.0.1','DATABASE_PORT':'5432','DATABASE_NAME':'tcdx-grc','DATABASE_USER':'postgres','DATABASE_PASSWORD':'','DATABASE_SSL_MODE':'disable','TCDX_ISOLATED_REBUILD':'true','TCDX_RECONCILIATION_SYSTEM_IDENTIFIER':identity}.items():cmd+=['-e',k+'='+v]
 cmd+=['--entrypoint','node','48e4b67d85f8','/work/'+str((BASE/'synthetic-runner.mjs').relative_to(ROOT))]
 if mode=='project':cmd+=['--project-only']
 start=time.monotonic();p=subprocess.run(cmd,capture_output=True,text=True,timeout=180)
 result={'exit_code':p.returncode,'duration_seconds':round(time.monotonic()-start,3),'isolation':{'database_container':name,'postgres_image':IMAGE,'node_image':'48e4b67d85f8','node_version':'22.23.2','network':'none shared namespace, loopback only','ports':[],'PGDATA':'tmpfs','node_repo_mount':'READ_ONLY','QA_credentials':'NONE'},'result':json.loads(p.stdout) if p.stdout.strip().startswith('{') else None,'error':p.stderr or None}
finally:
 deleted=subprocess.run(['docker','rm','-f','-v',name],capture_output=True);absent=subprocess.run(['docker','inspect',name],capture_output=True).returncode!=0;result['cleanup']={'destroy_exit_code':deleted.returncode,'absent':absent}
 out.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:result[k] for k in ['exit_code','duration_seconds','cleanup'] if k in result}))
