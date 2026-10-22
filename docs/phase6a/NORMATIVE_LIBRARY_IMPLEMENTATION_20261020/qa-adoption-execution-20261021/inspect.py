#!/usr/bin/env python3
"""QA-only READ ONLY catalog + aggregated data fingerprints; never prints rows."""
import sys,json,subprocess,hashlib,time,datetime,re
from pathlib import Path
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3];OLD=BASE.parent/'qa-physical-adoption-20261021'
CONN="host=192.168.2.40 port=5432 dbname=tcdx-grc user=postgres sslmode=require connect_timeout=5 application_name=grc_qa_adoption_inspection options='-c default_transaction_read_only=on -c statement_timeout=15000 -c lock_timeout=1000 -c idle_in_transaction_session_timeout=30000'"
def main():
 phase=sys.argv[1];assert phase in ['PRE','POST','IMMEDIATE']
 path=BASE/(phase+'.json');assert not path.exists()
 sql=(OLD/'PRE_GATES_READONLY.sql').read_text()
 old=json.loads((OLD/'PRE_GATES_READONLY.json').read_text());cat={x['category']:x.get('rows',x) for x in old['results']}
 tables=sorted(x['name'] for x in cat['relations'] if x['relkind']=='r')
 if phase=='POST':tables+=['knowledge.knowledge_version_context_links','knowledge.knowledge_source_usage_rights']
 excluded={'config.configuration_overrides':['control_version_id','supersedes_configuration_override_id'],'config.effective_configurations':['control_version_id'],'regulatory.requirement_applicabilities':['context_knowledge_version_id']}
 extra="SELECT jsonb_build_object('category','clock','utc',clock_timestamp(),'cluster_system_identifier',(SELECT system_identifier::text FROM pg_control_system()));\n"
 if phase!='IMMEDIATE':
  for table in tables:
   assert re.fullmatch(r'[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*',table)
   if table=='platform.schema_migrations':continue
   removal="ARRAY["+','.join("'"+x+"'" for x in excluded.get(table,[]))+']::text[]'
   # Existing columns only; nullable new columns are verified separately.
   extra+="SELECT jsonb_build_object('category','data_fingerprint','relation','"+table+"','rows',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(h,'' ORDER BY h COLLATE \"C\"),''),'UTF8')),'hex')) FROM (SELECT encode(sha256(convert_to((to_jsonb(t)-"+removal+")::text,'UTF8')),'hex') h FROM "+table+" t LIMIT 100001) s;\n"
 else:
  # The immediate guard only rechecks identity, concurrent activity and ledger.
  sql='\n'.join(line for line in sql.splitlines() if not any("'category','"+x+"'" in line for x in ['relations','columns','constraints','indexes','functions','triggers','archiver','recovery_settings']))+'\n'
 sql=sql.replace('\\else\n\\quit 3',extra+'\\else\n\\quit 3')
 (BASE/(phase+'.sql')).write_text(sql);started=time.monotonic()
 p=subprocess.run(['psql',CONN,'-X','-w','-qAt','-v','ON_ERROR_STOP=1'],input=sql,text=True,capture_output=True,timeout=90)
 d={'at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'duration_seconds':round(time.monotonic()-started,4),'exit_code':p.returncode,'sql_sha256':hashlib.sha256(sql.encode()).hexdigest(),'results':[json.loads(l) for l in p.stdout.splitlines() if l.startswith('{')],'error':p.stderr.strip() or None}
 path.write_text(json.dumps(d,indent=2)+'\n');assert p.returncode==0,'Read-only inspection failed; preserve evidence'
 print(json.dumps({'phase':phase,'exit_code':p.returncode,'categories':len(d['results']),'duration_seconds':d['duration_seconds']}))
if __name__=='__main__':main()
