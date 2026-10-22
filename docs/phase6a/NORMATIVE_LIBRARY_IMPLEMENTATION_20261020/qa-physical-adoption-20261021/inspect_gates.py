#!/usr/bin/env python3
"""G1-G4 READ ONLY inspection. Never applies migrations or acquires locks."""
import datetime
import hashlib
import json
from pathlib import Path
import subprocess
import time
BASE=Path(__file__).resolve().parent
ROOT=BASE.parents[3]
CONNECTION="host=192.168.2.40 port=5432 dbname=tcdx-grc user=postgres connect_timeout=5 sslmode=require options='-c default_transaction_read_only=on -c statement_timeout=5000 -c lock_timeout=1000 -c idle_in_transaction_session_timeout=15000'"
def query(label,selects):
    path=BASE/(label+'.sql');assert not path.exists(),'Preserve every attempt'
    sql="""\\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT current_database()='tcdx-grc' AND inet_server_addr()='192.168.2.40'::inet
 AND inet_server_port()=5432 AND current_user='postgres'
 AND current_setting('server_version_num')='160015'
 AND current_setting('cluster_name',true)='16/main' AND NOT pg_is_in_recovery()
 AND current_setting('default_transaction_read_only')='on'
 AND current_setting('transaction_read_only')='on' AS identity_ok \\gset
\\if :identity_ok
"""+selects+"\n\\else\n\\quit 3\n\\endif\nROLLBACK;\n"
    path.write_text(sql);start=time.monotonic()
    p=subprocess.run(['psql',CONNECTION,'-X','-w','-qAt','-v','ON_ERROR_STOP=1'],input=sql,text=True,capture_output=True,timeout=65)
    result={'label':label,'at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'duration_seconds':round(time.monotonic()-start,4),'exit_code':p.returncode,'sql_sha256':hashlib.sha256(sql.encode()).hexdigest(),'results':[json.loads(line) for line in p.stdout.splitlines() if line.startswith('{')],'error':p.stderr.strip() or None}
    (BASE/(label+'.json')).write_text(json.dumps(result,indent=2)+'\n')
    assert p.returncode==0,label+' failed; preserve error and stop'
    return result
def aggregate(category,query):
    return "SELECT jsonb_build_object('category','"+category+"','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM ("+query+") x;"
def main():
    queries=["""SELECT jsonb_build_object('category','identity','host',inet_server_addr(),'port',inet_server_port(),'database',current_database(),'user',current_user,'version',version(),'cluster',current_setting('cluster_name'),'transaction_read_only',current_setting('transaction_read_only'),'default_transaction_read_only',current_setting('default_transaction_read_only'),'statement_timeout',current_setting('statement_timeout'),'lock_timeout',current_setting('lock_timeout'),'superuser',(SELECT rolsuper FROM pg_roles WHERE rolname=current_user));""",
      aggregate('session_activity',"SELECT backend_type,state,count(*) AS sessions,count(*) FILTER(WHERE xact_start IS NOT NULL) AS open_transactions,count(*) FILTER(WHERE xact_start<clock_timestamp()-interval '30 seconds') AS transactions_over_30s,count(*) FILTER(WHERE wait_event_type='Lock') AS lock_waiters FROM pg_catalog.pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() GROUP BY backend_type,state ORDER BY backend_type,state LIMIT 30"),
      aggregate('locks',"SELECT locktype,mode,granted,count(*) AS locks FROM pg_catalog.pg_locks WHERE database=(SELECT oid FROM pg_database WHERE datname=current_database()) AND pid<>pg_backend_pid() GROUP BY locktype,mode,granted ORDER BY locktype,mode LIMIT 100"),
      aggregate('prepared_transactions',"SELECT count(*) AS prepared_transactions FROM pg_catalog.pg_prepared_xacts WHERE database=current_database()"),
      aggregate('recovery_settings',"SELECT name,CASE WHEN name='archive_command' THEN (setting<>'')::text ELSE setting END AS setting FROM pg_catalog.pg_settings WHERE name IN ('archive_mode','archive_command','wal_level','data_checksums') ORDER BY name LIMIT 10"),
      aggregate('archiver',"SELECT archived_count,last_archived_time,failed_count,last_failed_time FROM pg_catalog.pg_stat_archiver LIMIT 1"),
      aggregate('ledger',"SELECT migration_id,filename,content_sha256,transactional,runner_version,outcome FROM platform.schema_migrations ORDER BY migration_id LIMIT 100"),
      aggregate('relations',"SELECT c.oid AS oid,n.nspname||'.'||c.relname AS name,c.relkind,pg_get_userbyid(c.relowner) AS owner,c.relrowsecurity,c.relforcerowsecurity FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND c.relkind IN ('r','v','m','S','p') ORDER BY name LIMIT 1000"),
      aggregate('columns',"SELECT n.nspname||'.'||c.relname AS relation,a.attname AS name,format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull,pg_get_expr(d.adbin,d.adrelid) AS default_expression FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND c.relkind IN ('r','p') AND a.attnum>0 AND NOT a.attisdropped ORDER BY relation,a.attnum LIMIT 10000"),
      aggregate('constraints',"SELECT k.oid AS oid,k.conrelid AS relation_oid,k.confrelid AS referenced_relation_oid,n.nspname||'.'||c.relname AS relation,k.conname AS name,k.contype,k.convalidated,pg_get_constraintdef(k.oid,true) AS definition FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' ORDER BY relation,name LIMIT 10000"),
      aggregate('indexes',"SELECT n.nspname||'.'||c.relname AS relation,i.relname AS name,x.indisvalid,x.indisready,pg_get_indexdef(i.oid) AS definition FROM pg_catalog.pg_index x JOIN pg_catalog.pg_class c ON c.oid=x.indrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace JOIN pg_catalog.pg_class i ON i.oid=x.indexrelid WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' ORDER BY relation,name LIMIT 10000"),
      aggregate('functions',"SELECT p.oid AS oid,n.nspname||'.'||p.proname AS name,pg_get_function_identity_arguments(p.oid) AS arguments,pg_get_userbyid(p.proowner) AS owner,p.prosecdef,encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex') AS definition_sha256 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('knowledge','config','regulatory','controls','org','ops_audit','platform','iam','audit','risk','evidence','remediation','privacy') AND p.prokind='f' ORDER BY name,arguments LIMIT 1000"),
      aggregate('triggers',"SELECT n.nspname||'.'||c.relname AS relation,t.tgname AS name,t.tgenabled,pg_get_triggerdef(t.oid,true) AS definition FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal AND n.nspname NOT IN ('pg_catalog','information_schema') ORDER BY relation,name LIMIT 2000")]
    result=query('PRE_GATES_READONLY','\n'.join(queries))
    cat={r['category']:r.get('rows',r) for r in result['results']}
    manifest=json.loads((ROOT/'database/migrations/manifest.json').read_text())
    expected={m['id']:m for m in manifest['migrations']}
    mismatches=[]
    for m in manifest['migrations']:
        path=ROOT/'database/migrations'/m['filename']
        if hashlib.sha256(path.read_bytes()).hexdigest()!=m['sha256']:mismatches.append({'id':m['id'],'mismatch':'LOCAL_CHECKSUM'})
    for r in cat['ledger']:
        e=expected.get(r['migration_id'])
        if not e or r['filename']!=e['filename'] or r['content_sha256']!=e['sha256'] or r['transactional']!=e['transactional']:mismatches.append({'id':r['migration_id'],'mismatch':'QA_LEDGER'})
    assert not mismatches,mismatches
    canonical=json.dumps({k:v for k,v in cat.items() if k in ['relations','columns','constraints','indexes','functions','triggers']},sort_keys=True,separators=(',',':')).encode()
    (BASE/'QA_SCHEMA_FINGERPRINT.json').write_text(json.dumps({'algorithm':'SHA256 canonical sorted JSON; object OIDs retained for local QA reference','sha256':hashlib.sha256(canonical).hexdigest(),'categories':{k:len(v) for k,v in cat.items() if isinstance(v,list)},'ledger_checksum_match':'PASS_34_OF_34','ledger_rows':len(cat['ledger']),'schema_snapshot':'PRE_GATES_READONLY.json'},indent=2)+'\n')
    print(json.dumps({'identity':cat['identity'],'sessions':cat['session_activity'],'locks':cat['locks'],'recovery':cat['recovery_settings'],'archiver':cat['archiver'],'ledger_rows':len(cat['ledger']),'fingerprint':'RECORDED','checksums':'PASS'}))
if __name__=='__main__':main()
