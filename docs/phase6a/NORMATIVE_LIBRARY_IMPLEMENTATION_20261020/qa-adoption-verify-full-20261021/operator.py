#!/usr/bin/env python3
"""Exact QA operational configuration; no credentials in argv, evidence or files."""
import os,sys,json,subprocess,hashlib,datetime,time
from pathlib import Path
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3]
NODE='/Users/andresbarouh/.npm/_npx/5dad66f2cb301fc2/node_modules/node/bin/node'
def environment(rootcert=None,write=False):
 env={k:v for k,v in os.environ.items() if not k.startswith(('PG','DATABASE_','TCDX_','NODE_OPTIONS','NODE_EXTRA_CA_CERTS','NODE_TLS_REJECT_UNAUTHORIZED'))}
 env.update(DATABASE_HOST='db-tecdex',DATABASE_HOSTADDR='192.168.2.40',DATABASE_PORT='5432',DATABASE_NAME='tcdx-grc',DATABASE_USER='postgres',DATABASE_SSL_MODE='verify-full',DATABASE_SSL_ROOT_CERT=str(rootcert or BASE/'QA_ADMINISTRATIVE_PUBLIC_CERT.pem'))
 env['PGOPTIONS']='-c statement_timeout=60000 -c lock_timeout=2000 -c idle_in_transaction_session_timeout=30000 -c application_name=grc_qa_approved_verify_full'+('' if write else ' -c default_transaction_read_only=on')
 return env
def main():
 mode=sys.argv[1];assert mode in ['tls','status','apply','verify','PRE','POST','IMMEDIATE']
 out=BASE/('CANONICAL_'+mode.upper()+'.json');assert not out.exists()
 env=environment(BASE/'QA_APPROVED_CERT_CANDIDATE.pem' if mode=='tls' else None,mode=='apply')
 rootcert=Path(env['DATABASE_SSL_ROOT_CERT']);assert rootcert.is_file() and not rootcert.is_symlink()
 fp=subprocess.check_output(['/opt/homebrew/opt/openssl@3/bin/openssl','x509','-in',str(rootcert),'-noout','-fingerprint','-sha256']).decode().strip().split('=',1)[1];assert fp=='FB:68:09:DA:13:9E:E3:E5:2C:2F:1F:EA:D7:5B:11:92:7B:04:B8:96:7A:2B:5D:B8:46:9C:B6:70:E3:BB:A3:E6'
 args=[NODE,'--experimental-strip-types']
 if mode=='tls':args+=[str(BASE/'tls-validation.mts')]
 elif mode in ['PRE','POST','IMMEDIATE']:args+=[str(BASE/'inspect.mts'),mode]
 else:
  m=json.loads((ROOT/'database/migrations/manifest.json').read_text());assert len(m['migrations'])==35 and m['migrations'][-1]['id']=='20261021221204'
  for x in m['migrations']:assert hashlib.sha256((ROOT/'database/migrations'/x['filename']).read_bytes()).hexdigest()==x['sha256']
  assert m['migrations'][-1]['sha256']=='9279159e88c60fff03f998e33008fb0d675f53e4423df638c9e54f709a773798'
  args+=[str(ROOT/'scripts/foundations'/('verify-schema.ts' if mode=='verify' else 'migrate.ts'))]
  if mode!='verify':args+=[mode]
 if mode=='apply':
  go=json.loads((BASE/'GO_NO_GO.json').read_text());assert go['decision']=='GO' and all(x=='PASS' for x in go['gates'].values());assert datetime.datetime.now(datetime.timezone.utc)<datetime.datetime.fromisoformat(go['window_expires_utc']);env['DATABASE_BACKUP_REFERENCE']=go['backup_reference']
 start=time.monotonic();p=subprocess.run(args,cwd=ROOT,env=env,capture_output=True,text=True,timeout=120)
 if p.returncode and mode=='apply':
  private=Path.home()/'.tcdx-grc-qa-recovery/QA-LOGICAL-e923e6ecc44845c6920c8fd975f34675/adoption-private-error.log';assert not private.exists();private.write_text(p.stdout+'\n'+p.stderr);private.chmod(0o600);p.stdout='Canonical runner failed; private diagnostics retained outside repository';p.stderr='RAW_DIAGNOSTIC_REDACTED'
 result={'mode':mode,'command':['node22.23.2','--experimental-strip-types',str(Path(args[2]).relative_to(ROOT)),*args[3:]],'finished_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exit_code':p.returncode,'duration_seconds':round(time.monotonic()-start,3),'stdout':p.stdout,'stderr':p.stderr,'TLS':'verify-full; host=db-tecdex; hostaddr=192.168.2.40; only PO-approved certificate','test_mode':'DISABLED','isolated_rebuild':'DISABLED','session_options':env['PGOPTIONS']}
 out.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'mode':mode,'exit_code':p.returncode,'stdout':p.stdout[-1200:] if mode=='tls' else None,'stderr':p.stderr[:1200] if p.returncode else None}))
if __name__=='__main__':main()
