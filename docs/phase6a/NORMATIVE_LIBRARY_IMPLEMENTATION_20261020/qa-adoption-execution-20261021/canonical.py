#!/usr/bin/env python3
"""Explicit QA canonical runner invocation. No test mode, rebuild or extra migrations."""
import os,sys,subprocess,json,time,datetime,hashlib
from pathlib import Path
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3]
NODE='/Users/andresbarouh/.npm/_npx/5dad66f2cb301fc2/node_modules/node/bin/node'
def main():
 mode=sys.argv[1];assert mode in ['status','apply','verify']
 output=BASE/('CANONICAL_'+mode.upper()+'.json');assert not output.exists()
 m=json.loads((ROOT/'database/migrations/manifest.json').read_text());assert len(m['migrations'])==35 and m['migrations'][-1]['id']=='20261021221204'
 assert m['migrations'][-1]['sha256']=='9279159e88c60fff03f998e33008fb0d675f53e4423df638c9e54f709a773798'
 for x in m['migrations']:assert hashlib.sha256((ROOT/'database/migrations'/x['filename']).read_bytes()).hexdigest()==x['sha256']
 env={k:v for k,v in os.environ.items() if not k.startswith(('PG','DATABASE_','TCDX_','NODE_OPTIONS'))}
 env.update(DATABASE_HOST='192.168.2.40',DATABASE_PORT='5432',DATABASE_NAME='tcdx-grc',DATABASE_USER='postgres',DATABASE_SSL_MODE='require',NODE_OPTIONS='--use-system-ca')
 opts='-c statement_timeout=60000 -c lock_timeout=2000 -c idle_in_transaction_session_timeout=30000 -c application_name=grc_qa_authorized_adoption'
 if mode!='apply':opts+=' -c default_transaction_read_only=on'
 else:
  gate=json.loads((BASE/'GO_NO_GO.json').read_text());assert gate['decision']=='GO' and all(v=='PASS' for v in gate['gates'].values());assert datetime.datetime.now(datetime.timezone.utc)<datetime.datetime.fromisoformat(gate['window_expires_utc'])
  env['DATABASE_BACKUP_REFERENCE']=gate['backup_reference']
 env['PGOPTIONS']=opts
 args=[NODE,'--experimental-strip-types',str(ROOT/'scripts/foundations'/('verify-schema.ts' if mode=='verify' else 'migrate.ts'))]
 if mode!='verify':args.append(mode)
 start=time.monotonic();p=subprocess.run(args,cwd=ROOT,env=env,capture_output=True,text=True,timeout=120)
 d={'command':['node22.23.2','--experimental-strip-types',str(Path(args[2]).relative_to(ROOT)),*args[3:]],'at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'duration_seconds':round(time.monotonic()-start,4),'exit_code':p.returncode,'stdout':p.stdout,'stderr':p.stderr,'database':'QA192.168.2.40:5432/tcdx-grc','TLS':'require CA verification + existing system CA store','session_options':opts,'test_mode':'DISABLED','isolated_rebuild':'DISABLED'}
 output.write_text(json.dumps(d,indent=2)+'\n');print(json.dumps({'mode':mode,'exit':p.returncode,'duration_seconds':d['duration_seconds'],'error':p.stderr if p.returncode else None}))
if __name__=='__main__':main()
