#!/usr/bin/env python3
"""Retry only the authorized isolated restore, never reconnect to QA."""
import sys,os,json,uuid,time,subprocess,re,hashlib,importlib.util
from pathlib import Path
sys.dont_write_bytecode=True
BASE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('recovery',BASE/'backup_restore.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def main():
 assert len(sys.argv)==2 and re.fullmatch(r'QA-LOGICAL-[a-f0-9]{32}',sys.argv[1])
 os.umask(0o077);ref=sys.argv[1];dest=Path.home()/'.tcdx-grc-qa-recovery'/ref;dump=dest/'tcdx-grc.pgdump';saved=json.loads((dest/'SNAPSHOT_METADATA.json').read_text());prev=json.loads((dest/'RECEIPT.json').read_text());assert m.sha(dump)==saved['dump_sha256']==prev['dump_sha256']
 assert m.run(['fdesetup','status'],text=True).stdout.strip()=='FileVault is On.'
 assert not (BASE/'BACKUP_RESTORE_RECONCILED.json').exists()
 name='grc-qa-recovery-'+uuid.uuid4().hex[:12]
 def source_q(sql):
  p=m.run([str(m.PG/'psql'),m.CONN,'-X','-w','-qAt','-v','ON_ERROR_STOP=1'],input=('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;'+sql+'ROLLBACK;').encode())
  return json.loads(p.stdout.decode())
 identity=source_q("SELECT jsonb_build_object('ok',current_database()='tcdx-grc' AND inet_server_addr()='192.168.2.40'::inet AND current_setting('server_version_num')='160015' AND current_setting('transaction_read_only')='on');")
 assert identity['ok']
 current=source_q(m.CATALOG);assert current==saved['catalog'],'Source metadata changed since captured snapshot; stop diagnosis'
 constraints_sql="SELECT jsonb_agg(to_jsonb(x) ORDER BY x.relation COLLATE \"C\",x.name COLLATE \"C\") FROM (SELECT n.nspname||'.'||c.relname AS relation,k.conname AS name,pg_get_constraintdef(k.oid,true) AS definition,k.convalidated AS validated FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%') x;"
 source_constraints=source_q(constraints_sql)

 result={k:v for k,v in prev.items() if k not in ['error','status','cleanup','restore_exit_code','isolation','finished_utc']};result['retry']='Restore only; original dump bytes unchanged';result['source_connections_this_retry']='READ_ONLY metadata only, no repeated dump'
 errors=open(dest/'restore-reconcile-private.log','x')
 try:
  m.run(['docker','run','-d','--name',name,'--label','tcdx.purpose=qa-logical-recovery-drill','--network','none','--tmpfs','/var/lib/postgresql/data:rw,noexec,nosuid,size=768m','--env','POSTGRES_DB=tcdx-grc','--env','POSTGRES_HOST_AUTH_METHOD=trust',m.IMAGE,'-c','listen_addresses=','-c','max_connections=10','-c','max_locks_per_transaction=1024'])
  inspection=json.loads(m.run(['docker','inspect',name],text=True).stdout)[0]
  assert inspection['HostConfig']['NetworkMode']=='none' and not inspection['HostConfig'].get('PortBindings') and not inspection['HostConfig'].get('Binds') and not inspection['Mounts']
  result['isolation']={'network':'none','ports':[],'binds':[],'volumes':[],'PGDATA':'tmpfs768MiB','image':inspection['Image'],'container':name,'max_locks_per_transaction':1024,'source_credentials_present':False}
  for attempt in range(60):
   ready=subprocess.run(['docker','exec',name,'pg_isready','-U','postgres','-d','tcdx-grc'],capture_output=True).returncode
   if ready==0:break
   time.sleep(.5)
  assert ready==0
  for role in saved['identity']['roles_used'] or []:
   assert re.fullmatch(r'[a-z_][a-z0-9_]*',role)
   if role!='postgres':m.run(['docker','exec','-i',name,'psql','-X','-q','-v','ON_ERROR_STOP=1','-U','postgres','-d','tcdx-grc'],input=('CREATE ROLE "'+role+'" NOLOGIN;').encode())
  start=time.monotonic()
  with dump.open('rb') as stream:
   p=subprocess.run(['docker','exec','-i',name,'pg_restore','--exit-on-error','--single-transaction','--username=postgres','--dbname=tcdx-grc'],stdin=stream,stdout=subprocess.DEVNULL,stderr=errors,timeout=180)
  result['restore_exit_code']=p.returncode;assert p.returncode==0,'Restore failed; private diagnostics retained'
  def q(sql):return json.loads(m.run(['docker','exec','-i',name,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d','tcdx-grc'],input=('BEGIN READ ONLY;'+sql+'ROLLBACK;').encode()).stdout.decode())
  target=q(m.CATALOG);source=saved['catalog'];counts={}
  for t in source['tables']:
   assert re.fullmatch(r'[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*',t)
   counts[t]=q('SELECT jsonb_build_object(\'count\',count(*)) FROM '+t+';')['count']
  result['comparisons']={k:source[k]==target[k] for k in source};result['comparisons']['all_table_counts']=counts==saved['counts']
  target_constraints=q(constraints_sql)
  bykey=lambda rows:{r['relation']+':'+r['name']:r for r in rows}
  a=bykey(source_constraints);z=bykey(target_constraints);diff=[{'object':k,'source':a.get(k),'restore':z.get(k)} for k in sorted(set(a)|set(z)) if a.get(k)!=z.get(k)]
  result['constraint_diagnostic']={'original_ordered_digest_matches':result['comparisons']['constraints'],'source_metadata_unchanged_from_snapshot':True,'definitions_compared':len(a),'differences':diff,'source_sha256':hashlib.sha256(json.dumps(a,sort_keys=True).encode()).hexdigest(),'restore_sha256':hashlib.sha256(json.dumps(z,sort_keys=True).encode()).hexdigest()}
  result['comparisons']['constraints']=not diff

  result['tables_compared']=len(counts);result['ledger_rows']=len(source['ledger']);result['restore_seconds']=round(time.monotonic()-start,3)
  result['all_pass']=all(result['comparisons'].values());result['postgres_version']=q("SELECT jsonb_build_object('version',current_setting('server_version_num'),'readonly',current_setting('transaction_read_only')); ")
  result['status']='PASS_LOGICAL_SNAPSHOT_RECOVERY_ONLY' if result['all_pass'] else 'FAIL_COMPARISON';result['recovery_point_utc']=saved['identity']['captured_utc']
  assert result['all_pass'],result['comparisons']
 finally:
  deleted=subprocess.run(['docker','rm','-f','-v',name],capture_output=True);absent=subprocess.run(['docker','inspect',name],capture_output=True).returncode!=0
  result['cleanup']={'destroy_exit_code':deleted.returncode,'container_absent':absent,'plaintext_restore_tmpfs_destroyed':absent};result['finished_utc']=m.datetime.datetime.now(m.datetime.timezone.utc).isoformat();errors.close()
  m.emit(dest/'RESTORE_RECONCILED_RECEIPT.json',result);m.emit(BASE/'BACKUP_RESTORE_RECONCILED.json',result)
  print(json.dumps({'status':result.get('status','FAIL'),'comparisons':result.get('comparisons'),'cleanup':result['cleanup']}))
if __name__=='__main__':main()
