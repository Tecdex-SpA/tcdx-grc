// Reuse the already reviewed read-only SELECTs; never executes migration SQL.
import { readFileSync,writeFileSync,existsSync } from 'node:fs';
import type {TLSSocket} from 'node:tls';
import {createClient} from '../../../../scripts/foundations/db.ts';
const base=import.meta.dirname;const phase=process.argv[2];
if(!phase||!['PRE','POST','IMMEDIATE'].includes(phase)||existsSync(base+'/'+phase+'.json'))throw Error('Distinct inspection required');
const script=readFileSync(base+'/../qa-adoption-execution-20261021/PRE.sql','utf8');
let queries=script.split('\n').filter(line=>line.startsWith('SELECT jsonb_build_object'));
if(phase==='IMMEDIATE'){const activity=queries.filter(q=>['session_activity','locks','prepared_transactions'].some(category=>q.includes("'category','"+category+"'")));queries=queries.filter(q=>!activity.includes(q)).concat(activity);}
if(phase==='POST'){
 for(const name of ['knowledge.knowledge_version_context_links','knowledge.knowledge_source_usage_rights'])queries.push(`SELECT jsonb_build_object('category','new_table_empty','relation','${name}','rows',count(*)) FROM ${name};`);
 queries.push("SELECT jsonb_build_object('category','new_columns_historical_null','overrides',(SELECT count(*) FROM config.configuration_overrides WHERE control_version_id IS NOT NULL OR supersedes_configuration_override_id IS NOT NULL),'effective',(SELECT count(*) FROM config.effective_configurations WHERE control_version_id IS NOT NULL),'applicability',(SELECT count(*) FROM regulatory.requirement_applicabilities WHERE context_knowledge_version_id IS NOT NULL));");
}
const started=Date.now();const c=createClient();const result:any={phase,started_utc:new Date().toISOString(),queries:queries.length,results:[]};
try{
 await c.connect();const tls=(c as unknown as {connection:{stream:TLSSocket}}).connection.stream;
 if(!tls.authorized||tls.getPeerCertificate().fingerprint256!=='FB:68:09:DA:13:9E:E3:E5:2C:2F:1F:EA:D7:5B:11:92:7B:04:B8:96:7A:2B:5D:B8:46:9C:B6:70:E3:BB:A3:E6')throw Error('TLS identity blocked');
 await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 const guard=(await c.query("SELECT current_database()='tcdx-grc' AND inet_server_addr()='192.168.2.40'::inet AND inet_server_port()=5432 AND current_user='postgres' AND current_setting('server_version_num')='160015' AND current_setting('cluster_name')='16/main' AND current_setting('default_transaction_read_only')='on' AND current_setting('transaction_read_only')='on' AND NOT pg_is_in_recovery() AS ok")).rows[0];
 if(!guard.ok)throw Error('QA read-only guard blocked');
 result.TLS_authorized=true;
 for(const query of queries){const r=await c.query(query);result.results.push(r.rows[0].jsonb_build_object);}
 await c.query('ROLLBACK');result.status='PASS_READ_ONLY_INSPECTION';
}catch(e){result.status='FAIL';result.error=String(e);process.exitCode=1;}finally{await c.end();result.finished_utc=new Date().toISOString();result.duration_ms=Date.now()-started;writeFileSync(base+'/'+phase+'.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});writeFileSync(base+'/'+phase+'.sql',queries.join('\n')+'\n',{flag:'wx'});process.stdout.write(JSON.stringify({phase,status:result.status,duration_ms:result.duration_ms,error:result.error})+'\n');}
