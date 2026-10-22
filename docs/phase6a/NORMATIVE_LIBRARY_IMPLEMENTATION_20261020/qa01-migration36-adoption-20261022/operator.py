#!/usr/bin/env python3
"""QA-01 exact target. Secrets remain native pgpass / ephemeral process memory."""
import os,sys,json,hashlib,datetime,subprocess,importlib.util
from pathlib import Path
sys.dont_write_bytecode=True
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3]
prior=BASE.parent/'qa-adoption-verify-full-20261021/operator.py'
spec=importlib.util.spec_from_file_location('prior_operator',prior);old=importlib.util.module_from_spec(spec);spec.loader.exec_module(old)
NODE=old.NODE
def read(p):return json.loads(p.read_text())
def integrity():
 entry=read(BASE/'ENTRY.json')
 for p in entry['critical_files']:assert hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==entry['files'][p],p
 assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()==entry['head']
 assert subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip()==entry['branch']
 assert subprocess.check_output(['git','diff','--cached','--raw'],cwd=ROOT,text=True)==entry['index_raw']==''
 m=read(ROOT/'database/migrations/manifest.json');assert len(m['migrations'])==36 and m['migrations'][-1]==entry['migration36']
 return m
def env(write=False):
 e=old.environment(write=write)
 e['PGOPTIONS']='-c statement_timeout=60000 -c lock_timeout=2000 -c idle_in_transaction_session_timeout=300000 -c application_name=grc_qa01_migration36'+('' if write else ' -c default_transaction_read_only=on')
 cert=Path(e['DATABASE_SSL_ROOT_CERT']);assert not cert.is_symlink()
 fp=subprocess.check_output(['/opt/homebrew/opt/openssl@3/bin/openssl','x509','-in',str(cert),'-noout','-fingerprint','-sha256'],text=True).strip().split('=',1)[1]
 assert fp=='FB:68:09:DA:13:9E:E3:E5:2C:2F:1F:EA:D7:5B:11:92:7B:04:B8:96:7A:2B:5D:B8:46:9C:B6:70:E3:BB:A3:E6'
 return e
def run(mode):
 integrity();assert mode in ['PRE','IMMEDIATE','POST','status','verify','apply','backup']
 out=BASE/('CANONICAL_'+mode.upper()+'.json');assert not out.exists()
 e=env(mode=='apply');args=[NODE,'--experimental-strip-types']
 if mode in ['PRE','IMMEDIATE','POST']:args += [str(BASE/'inspect.mts'),mode]
 elif mode=='backup':args += [str(BASE/'backup.mts')]+(['--restore-saved'] if (BASE/'BACKUP_RESTORE_ATTEMPT1.json').exists() else [])
 else:
  args += [str(ROOT/'scripts/foundations'/('verify-schema.ts' if mode=='verify' else 'migrate.ts'))]
  if mode!='verify':args += [mode]
 if mode=='apply':
  go=read(BASE/'GO_NO_GO.json');assert go['decision']=='GO' and all(go['gates'].values())
  assert datetime.datetime.now(datetime.timezone.utc)<datetime.datetime.fromisoformat(go['expires_utc'])
  assert read(BASE/'BACKUP_RECEIPT.json')['status']=='PASS_VERIFIED_RECOVERABLE'
  assert not (BASE/'MIGRATION_RECEIPT.json').exists()
  for name,h in go['execution_script_sha256'].items():assert hashlib.sha256((BASE/name).read_bytes()).hexdigest()==h,name
  e['DATABASE_BACKUP_REFERENCE']=go['backup_reference']
 started=datetime.datetime.now(datetime.timezone.utc).isoformat()
 p=subprocess.run(args,cwd=ROOT,env=e,capture_output=True,text=True,timeout=600 if mode=='backup' else 120)
 # Operational scripts expose metadata only. Raw errors are kept out of evidence.
 result={'mode':mode,'started_utc':started,'finished_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exit_code':p.returncode,'command':[str(Path(a).relative_to(ROOT)) if a.startswith(str(ROOT)) else a for a in args],'stdout':p.stdout if p.returncode==0 else 'FAILED_RAW_DIAGNOSTIC_NOT_PUBLISHED','stderr':p.stderr if p.returncode==0 else 'REDACTED','TLS':'verify-full host=db-tecdex hostaddr=192.168.2.40','test_mode':False,'isolated_rebuild':False}
 out.write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps({'mode':mode,'exit_code':p.returncode,'output':p.stdout[-1800:] if p.returncode==0 else 'FAIL; no raw output published'}))
 return p.returncode
if __name__=='__main__':sys.exit(run(sys.argv[1]))
