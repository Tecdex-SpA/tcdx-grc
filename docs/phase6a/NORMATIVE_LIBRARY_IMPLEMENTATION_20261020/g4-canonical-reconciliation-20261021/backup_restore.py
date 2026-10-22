#!/usr/bin/env python3
"""Authorized QA-only logical recovery drill. No source writes, no automatic adoption.
The PO selected no file encryption and custody in their home. FileVault must be ON.
Sensitive backup/diagnostics stay outside the repository in a private directory.
"""
import os,sys,json,hashlib,subprocess,datetime,time,uuid,shutil
from pathlib import Path
BASE=Path(__file__).resolve().parent
PG=Path('/opt/homebrew/opt/postgresql@16/bin')
CONN="host=192.168.2.40 port=5432 dbname=tcdx-grc user=postgres sslmode=require connect_timeout=5 options='-c default_transaction_read_only=on -c statement_timeout=60000 -c lock_timeout=1000 -c idle_in_transaction_session_timeout=300000'"
IMAGE='sha256:0ea6700a3b4f0ae6ce746519073558aed4d88a79d8d07622a9a644946c7319c4'
CATALOG="""SELECT jsonb_build_object(
 'tables',(SELECT jsonb_agg(n.nspname||'.'||c.relname ORDER BY n.nspname,c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%'),
 'columns',(SELECT md5(string_agg(n.nspname||'.'||c.relname||'.'||a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull||':'||coalesce(pg_get_expr(d.adbin,d.adrelid),''),E'\\n' ORDER BY n.nspname,c.relname,a.attnum)) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE c.relkind='r' AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT md5(string_agg(n.nspname||'.'||c.relname||':'||k.conname||':'||pg_get_constraintdef(k.oid,true)||':'||k.convalidated,E'\\n' ORDER BY n.nspname,c.relname,k.conname)) FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%'),
 'indexes',(SELECT md5(string_agg(schemaname||'.'||indexname||':'||indexdef,E'\\n' ORDER BY schemaname,indexname)) FROM pg_indexes WHERE schemaname NOT IN ('pg_catalog','information_schema') AND schemaname NOT LIKE 'pg_toast%'),
 'functions',(SELECT md5(string_agg(n.nspname||'.'||p.proname||':'||pg_get_functiondef(p.oid),E'\\n' ORDER BY n.nspname,p.proname,pg_get_function_identity_arguments(p.oid))) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.prokind='f' AND n.nspname NOT IN ('pg_catalog','information_schema','public')),
 'triggers',(SELECT md5(string_agg(n.nspname||'.'||c.relname||':'||t.tgname||':'||pg_get_triggerdef(t.oid,true)||':'||t.tgenabled::text,E'\\n' ORDER BY n.nspname,c.relname,t.tgname)) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal),
 'extensions',(SELECT jsonb_agg(jsonb_build_object('name',extname,'version',extversion) ORDER BY extname) FROM pg_extension),
 'ledger',(SELECT jsonb_agg(jsonb_build_object('id',migration_id,'sha256',content_sha256) ORDER BY migration_id) FROM platform.schema_migrations),
 'invalid_constraints',(SELECT count(*) FROM pg_constraint WHERE NOT convalidated),
 'invalid_indexes',(SELECT count(*) FROM pg_index WHERE NOT indisvalid OR NOT indisready));"""
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def emit(p,d):
 assert not p.exists(),p
 p.write_text(json.dumps(d,indent=2)+'\n');p.chmod(0o600)
def run(args,**kw):return subprocess.run(args,check=True,capture_output=True,**kw)
def main():
 assert len(sys.argv)==3 and sys.argv[1]=='--execute' and sys.argv[2].isdigit(), 'Explicit --execute ATTEMPT_NUMBER required'
 report=BASE/('BACKUP_RESTORE_ATTEMPT_'+sys.argv[2]+'.json')
 assert not report.exists(),'Never overwrite a completed drill'
 os.umask(0o077)
 fv=run(['fdesetup','status'],text=True).stdout.strip();assert fv=='FileVault is On.',fv
 ref='QA-LOGICAL-'+uuid.uuid4().hex
 parent=Path.home()/'.tcdx-grc-qa-recovery';parent.mkdir(mode=0o700,exist_ok=True)
 assert not parent.is_symlink() and parent.stat().st_uid==os.getuid() and parent.stat().st_mode&0o077==0
 dest=parent/ref;dest.mkdir(mode=0o700);dump=dest/'tcdx-grc.pgdump'
 env={k:v for k,v in os.environ.items() if not k.startswith(('PG','DATABASE_','TCDX_'))}
 private_error=open(dest/'private-diagnostics.log','w')
 snapshot=None;container=None;result={'reference':ref,'source':'QA 192.168.2.40:5432/tcdx-grc','started_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'custody':'PO local account andresbarouh; private home directory','retention':'Retain pending PO recovery/adoption and explicit disposal decision; no automatic deletion','file_encryption':'NONE_BY_EXPLICIT_PO_DIRECTION','at_rest_protection':'APFS FileVault ON; unlocked session remains sensitive','qa_writes':'NONE','restored_data':'REAL_QA_SENSITIVE','PITR':'NOT_AVAILABLE; logical snapshot only'}
 try:
  snapshot=subprocess.Popen([str(PG/'psql'),CONN,'-X','-w','-qAt','-v','ON_ERROR_STOP=1'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=private_error,text=True,env=env,bufsize=1)
  def q(sql):
   snapshot.stdin.write(sql+'\n');snapshot.stdin.flush()
   line=snapshot.stdout.readline();assert line,'Source session failed; private diagnostics retained'
   return json.loads(line)
  identity=q("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SELECT jsonb_build_object('database',current_database(),'host',inet_server_addr(),'port',inet_server_port(),'user',current_user,'version',current_setting('server_version_num'),'cluster',current_setting('cluster_name'),'readonly',current_setting('transaction_read_only'),'default_readonly',current_setting('default_transaction_read_only'),'snapshot',pg_export_snapshot(),'captured_utc',clock_timestamp(),'size_bytes',pg_database_size(current_database()),'roles_used',(SELECT jsonb_agg(DISTINCT r.rolname) FROM pg_shdepend d JOIN pg_roles r ON r.oid=d.refobjid WHERE d.dbid=(SELECT oid FROM pg_database WHERE datname=current_database()) AND d.refclassid='pg_authid'::regclass));")
  assert (identity['database'],identity['host'],identity['port'],identity['user'],identity['version'],identity['cluster'],identity['readonly'],identity['default_readonly'])==('tcdx-grc','192.168.2.40',5432,'postgres','160015','16/main','on','on')
  assert shutil.disk_usage(dest).free>max(identity['size_bytes']*5,1024**3)
  snap=identity.pop('snapshot');result['identity']=identity;result['snapshot_token_sha256']=hashlib.sha256(snap.encode()).hexdigest()
  source=q(CATALOG)
  counts={}
  import re
  for table in source['tables']:
   assert re.fullmatch(r'[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*',table)
   count=q('SELECT jsonb_build_object(\'count\',count(*)) FROM '+table+';')['count'];counts[table]=count
  start=time.monotonic()
  p=subprocess.run([str(PG/'pg_dump'),CONN,'-w','--format=custom','--compress=6','--lock-wait-timeout=5s','--snapshot='+snap,'--file='+str(dump)],env=env,stdout=subprocess.DEVNULL,stderr=private_error,timeout=180)
  result['dump_exit_code']=p.returncode;assert p.returncode==0,'Dump failed; private diagnostics retained'
  dump.chmod(0o600);result.update(dump_sha256=sha(dump),dump_size_bytes=dump.stat().st_size,dump_seconds=round(time.monotonic()-start,3),tool_version=run([str(PG/'pg_dump'),'--version'],text=True).stdout.strip())
  snapshot.stdin.write('ROLLBACK;\n\\q\n');snapshot.stdin.flush();snapshot.wait(timeout=10);snapshot=None
  emit(dest/'SNAPSHOT_METADATA.json',{'identity':identity,'catalog':source,'counts':counts,'dump_sha256':result['dump_sha256']})
  # No mount, no volume, no port, no source credential in restore environment.
  name='grc-qa-recovery-'+uuid.uuid4().hex[:12];container=name
  run(['docker','run','-d','--name',name,'--label','tcdx.purpose=qa-logical-recovery-drill','--network','none','--tmpfs','/var/lib/postgresql/data:rw,noexec,nosuid,size=768m','--env','POSTGRES_DB=tcdx-grc','--env','POSTGRES_HOST_AUTH_METHOD=trust',IMAGE,'-c','listen_addresses=','-c','max_connections=10'])
  inspection=json.loads(run(['docker','inspect',name],text=True).stdout)[0]
  assert inspection['HostConfig']['NetworkMode']=='none' and not inspection['HostConfig'].get('PortBindings')
  assert not inspection['HostConfig'].get('Binds') and not inspection['Mounts']
  result['isolation']={'network':'none','ports':[],'binds':[],'volumes':[],'PGDATA':'tmpfs768MiB','image':inspection['Image'],'container':name}
  for attempt in range(60):
   ready=subprocess.run(['docker','exec',name,'pg_isready','-U','postgres','-d','tcdx-grc'],capture_output=True).returncode
   if ready==0:break
   time.sleep(.5)
  assert ready==0,'Isolated PostgreSQL not ready'
  for role in identity['roles_used'] or []:
   assert re.fullmatch(r'[a-z_][a-z0-9_]*',role)
   if role!='postgres':run(['docker','exec','-i',name,'psql','-X','-q','-v','ON_ERROR_STOP=1','-U','postgres','-d','tcdx-grc'],input=('CREATE ROLE "'+role+'" NOLOGIN;').encode())
  with dump.open('rb') as stream:
   restored=subprocess.run(['docker','exec','-i',name,'pg_restore','--exit-on-error','--single-transaction','--username=postgres','--dbname=tcdx-grc'],stdin=stream,stdout=subprocess.DEVNULL,stderr=private_error,timeout=180)
  result['restore_exit_code']=restored.returncode;assert restored.returncode==0,'Restore failed; private diagnostics retained'
  def target_q(sql):return json.loads(run(['docker','exec','-i',name,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d','tcdx-grc'],input=('BEGIN READ ONLY;'+sql+'ROLLBACK;').encode()).stdout.decode())
  target=target_q(CATALOG);target_counts={t:target_q('SELECT jsonb_build_object(\'count\',count(*)) FROM '+t+';')['count'] for t in source['tables']}
  comparisons={k:source[k]==target[k] for k in source};comparisons['all_table_counts']=counts==target_counts
  result['comparisons']=comparisons;result['tables_compared']=len(counts);result['ledger_rows']=len(source['ledger']);result['all_pass']=all(comparisons.values())
  assert result['all_pass'],'Restored metadata/count comparison differs'
  result['status']='PASS_LOGICAL_SNAPSHOT_RECOVERY_ONLY';result['recovery_point_utc']=identity['captured_utc']
 except Exception as e:
  result['status']='FAIL';result['error']=str(e);raise
 finally:
  if snapshot:
   try:snapshot.stdin.write('ROLLBACK;\n\\q\n');snapshot.stdin.flush();snapshot.wait(timeout=10)
   except Exception:snapshot.kill();snapshot.wait()
  if container:
   deleted=subprocess.run(['docker','rm','-f','-v',container],capture_output=True)
   absent=subprocess.run(['docker','inspect',container],capture_output=True).returncode!=0
   result['cleanup']={'destroy_exit_code':deleted.returncode,'container_absent':absent,'plaintext_restore_tmpfs_destroyed':absent}
  result['finished_utc']=datetime.datetime.now(datetime.timezone.utc).isoformat()
  private_error.close()
  emit(dest/'RECEIPT.json',result)
  emit(report,result)
  print(json.dumps({k:result[k] for k in ['reference','status','qa_writes','cleanup'] if k in result}))
if __name__=='__main__':main()
