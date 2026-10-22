// QA-01: read-only catalog and aggregate fingerprints; never retrieves row data.
import {readFileSync,writeFileSync} from 'node:fs';
import {createClient} from '../../../../scripts/foundations/db.ts';
import {normalizedConstraintDefinition} from '../../../../scripts/foundations/schema-definition.ts';
import type {TLSSocket} from 'node:tls';
export const base=import.meta.dirname;
export const fingerprint='FB:68:09:DA:13:9E:E3:E5:2C:2F:1F:EA:D7:5B:11:92:7B:04:B8:96:7A:2B:5D:B8:46:9C:B6:70:E3:BB:A3:E6';
export const tables=(JSON.parse(readFileSync(base+'/../../../../database/expected-schema.json','utf8')).tables as Array<{name:string}>).map(t=>t.name).sort();
const prior=readFileSync(base+'/../qa-adoption-verify-full-20261021/PRE.sql','utf8');
export const queries=prior.split('\n').filter(q=>q.startsWith('SELECT jsonb_build_object')&&!q.includes("'category','data_fingerprint'"));
// Existing catalog SELECTs, with full ledger history instead of its old subset.
queries[queries.findIndex(q=>q.includes("'category','ledger'"))]="SELECT jsonb_build_object('category','ledger','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT * FROM platform.schema_migrations ORDER BY migration_id LIMIT 100) x;";
queries.push("SELECT jsonb_build_object('category','health','recovery',pg_is_in_recovery(),'connections',(SELECT count(*) FROM pg_stat_activity),'max_connections',current_setting('max_connections'),'database_bytes',pg_database_size(current_database()),'invalid_constraints',(SELECT count(*) FROM pg_constraint WHERE NOT convalidated),'invalid_indexes',(SELECT count(*) FROM pg_index WHERE NOT indisvalid OR NOT indisready),'ssl',(SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()));");
queries.push("SELECT jsonb_build_object('category','typed_default_exact','definition',pg_get_constraintdef(oid),'validated',convalidated) FROM pg_constraint WHERE conrelid='config.configuration_definitions'::regclass AND conname='ck_configuration_definitions__typed_default';");
queries.push("SELECT jsonb_build_object('category','authority_catalog','roles',(SELECT jsonb_agg(jsonb_build_object('name',rolname,'superuser',rolsuper,'login',rolcanlogin) ORDER BY rolname) FROM pg_roles),'namespaces',(SELECT jsonb_agg(jsonb_build_object('name',nspname,'owner',pg_get_userbyid(nspowner),'acl',nspacl::text) ORDER BY nspname) FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname<>'information_schema'),'relation_acl',(SELECT jsonb_agg(jsonb_build_object('name',n.nspname||'.'||c.relname,'acl',c.relacl::text) ORDER BY n.nspname,c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema'),'extensions',(SELECT jsonb_agg(jsonb_build_object('name',extname,'version',extversion) ORDER BY extname) FROM pg_extension));");
export function dataQueries(includeLedger=false){return [...tables,...(includeLedger?['platform.schema_migrations']:[])].map(t=>{
 if(!/^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/.test(t))throw Error('Unsafe relation');
 return `SELECT jsonb_build_object('category','data_fingerprint','relation','${t}','rows',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(h,'' ORDER BY h COLLATE "C"),''),'UTF8')),'hex')) FROM (SELECT encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex') h FROM ${t} t LIMIT 100001) s;`;
});}
export async function collect(q:(sql:string)=>Promise<any>,includeLedger=false){
 const results=[];
 for(const sql of [...queries,...dataQueries(includeLedger)])results.push(await q(sql));
 for(const x of results){
  if(x.category==='data_fingerprint'&&x.rows>=100001)throw Error('Fingerprint bound exceeded');
  if(x.category==='constraints')for(const r of x.rows)r.normalized_definition=normalizedConstraintDefinition(r.definition);
 }
 return results;
}
export async function guard(c:ReturnType<typeof createClient>){
 const tls=(c as unknown as {connection:{stream:TLSSocket}}).connection.stream;
 if(!tls.authorized||tls.getPeerCertificate().fingerprint256!==fingerprint)throw Error('Unapproved TLS peer');
 const r=(await c.query("SELECT current_database() db,host(inet_server_addr()) host,inet_server_port() port,current_user username,current_setting('server_version_num') version,current_setting('cluster_name') cluster,current_setting('transaction_read_only') readonly,current_setting('default_transaction_read_only') default_readonly,(SELECT system_identifier::text FROM pg_control_system()) system_identifier,pg_is_in_recovery() recovery")).rows[0];
 if(r.db!=='tcdx-grc'||r.host!=='192.168.2.40'||r.port!==5432||r.username!=='postgres'||r.version!=='160015'||r.cluster!=='16/main'||r.readonly!=='on'||r.default_readonly!=='on'||r.system_identifier!=='7640968386355389904'||r.recovery)throw Error('Unexpected QA identity');
 return {...r,tls_authorized:true,peer_fingerprint:fingerprint,protocol:tls.getProtocol(),servername:'db-tecdex',sslmode:'verify-full'};
}
if(process.argv[1]===import.meta.filename){
 const phase=process.argv[2];if(!['PRE','IMMEDIATE','POST'].includes(phase))throw Error('Invalid phase');
 const out=base+'/'+phase+'.json';const result:any={phase,started_utc:new Date().toISOString()};const c=createClient();
 try{
  await c.connect();await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');result.identity=await guard(c);
  result.results=await collect(async sql=>(await c.query(sql)).rows[0].jsonb_build_object);
  // Operational conditions are checked last, immediately before closing snapshot.
  result.activity=[];
  for(const sql of queries.filter(q=>['session_activity','locks','prepared_transactions'].some(k=>q.includes("'category','"+k+"'"))))result.activity.push((await c.query(sql)).rows[0].jsonb_build_object);
  await c.query('ROLLBACK');result.status='PASS_READ_ONLY';
 }catch(e){result.status='FAIL';result.error=String(e);process.exitCode=1;}
 finally{await c.end();result.finished_utc=new Date().toISOString();writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({phase,status:result.status,error:result.error}));}
}
