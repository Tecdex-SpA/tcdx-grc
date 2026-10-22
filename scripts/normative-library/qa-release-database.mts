// Canonical foundations client + previously verified QA catalog collectors.
// PRE/POST are read-only. BACKUP writes only private local recovery custody.
import {readFileSync,writeFileSync,mkdirSync,lstatSync,statSync} from 'node:fs';
import {homedir} from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createClient} from '../foundations/db.ts';
import {collect,guard,dataQueries} from '../../docs/phase6a/NORMATIVE_LIBRARY_IMPLEMENTATION_20261020/qa01-migration36-adoption-20261022/inspect.mts';
const root=new URL('../../',import.meta.url).pathname;
const custody=root+'.release-custody/integrated-qa-release-20261022';
const mode=process.argv[2];if(!['PRE','PRE_RETRY','POST','BACKUP'].includes(mode??''))throw Error('READ_ONLY_OR_BACKUP_REQUIRED');
process.umask(0o077);
const sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const run=(cmd:string,args:string[],options:any={})=>{const p=spawnSync(cmd,args,{encoding:'utf8',timeout:180000,maxBuffer:32*1024*1024,...options});if(p.status!==0)throw Error('Subprocess failed: '+cmd);return p.stdout as string;};
const result:any={mode,started_utc:new Date().toISOString(),QA_writes:'NONE'};
const c=createClient();let container:string|undefined;
try{
 await c.connect();await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');result.identity=await guard(c);
 const ledger=(await c.query('SELECT migration_id,filename,content_sha256,outcome FROM platform.schema_migrations ORDER BY migration_id')).rows;
 const manifest=JSON.parse(readFileSync(root+'database/migrations/manifest.json','utf8')).migrations;
 if(ledger.length!==36||JSON.stringify(ledger)!==JSON.stringify(manifest.map((m:any)=>({migration_id:m.id,filename:m.filename,content_sha256:m.sha256,outcome:'applied'}))))throw Error('Exact36 ledger required');
 if(mode!=='BACKUP'){
  result.results=await collect(async q=>(await c.query(q)).rows[0].jsonb_build_object);
  result.activation=await c.query("SELECT aggregate_type,event_code,count(*)::int FROM ops_audit.audit_events WHERE command_code='normativeLibraryOperationalPublication' GROUP BY aggregate_type,event_code ORDER BY aggregate_type,event_code").then(r=>r.rows);
  result.definitions=await c.query("SELECT configuration_definition_id::text,configuration_code,version_number,value_type,lifecycle_state,effective_from::text,effective_to::text,num_nonnulls(default_boolean_value,default_integer_value,default_decimal_value,default_text_value,default_timestamp_value,default_duration_seconds_value,default_json_value) defaults FROM config.configuration_definitions WHERE configuration_code IN ('control_operational_activity','control_recommended_evidence','control_operational_frequency','control_operational_confirmation') ORDER BY configuration_code").then(r=>r.rows);
  await c.query('ROLLBACK');result.status='PASS_READ_ONLY';
 }else{
  if(run('fdesetup',['status']).trim()!=='FileVault is On.')throw Error('Encrypted custody required');
  const parent=homedir()+'/.tcdx-grc-qa-recovery';const parentStat=lstatSync(parent);
  if(parentStat.isSymbolicLink()||parentStat.uid!==process.getuid?.()||(parentStat.mode&0o077)!==0)throw Error('Unsafe recovery parent');
  const reference='INTEGRATED-QA-'+randomUUID().replaceAll('-',''),dest=parent+'/'+reference;mkdirSync(dest,{mode:0o700});
  const dump=dest+'/tcdx-grc.pgdump';
  const snap=(await c.query('SELECT pg_export_snapshot() snapshot,clock_timestamp() captured_utc')).rows[0];
  const source=await collect(async q=>(await c.query(q)).rows[0].jsonb_build_object,true);
  const roles=(await c.query("SELECT DISTINCT r.rolname FROM pg_shdepend d JOIN pg_roles r ON r.oid=d.refobjid WHERE d.dbid=(SELECT oid FROM pg_database WHERE datname=current_database()) AND d.refclassid='pg_authid'::regclass ORDER BY r.rolname")).rows.map(r=>String(r.rolname));
  const conn=`host=db-tecdex hostaddr=192.168.2.40 port=5432 dbname=tcdx-grc user=postgres sslmode=verify-full sslrootcert=${process.env.DATABASE_SSL_ROOT_CERT} connect_timeout=5`;
  run('/opt/homebrew/opt/postgresql@16/bin/pg_dump',[conn,'-w','--format=custom','--compress=6','--lock-wait-timeout=5s','--snapshot='+snap.snapshot,'--file='+dump],{env:{...process.env,PGPASSWORD:(c as any).password}});
  await c.query('ROLLBACK');await c.end();
  if((statSync(dump).mode&0o077)!==0)throw Error('Unsafe dump permissions');
  const image='sha256:0ea6700a3b4f0ae6ce746519073558aed4d88a79d8d07622a9a644946c7319c4';container='grc-integrated-restore-'+randomUUID().slice(0,12);
  run('docker',['run','-d','--name',container,'--network','none','--tmpfs','/var/lib/postgresql/data:rw,noexec,nosuid,size=768m','--env','POSTGRES_DB=tcdx-grc','--env','POSTGRES_HOST_AUTH_METHOD=trust',image,'-c','listen_addresses=','-c','max_connections=10','-c','max_locks_per_transaction=1024']);
  const inspected=JSON.parse(run('docker',['inspect',container]))[0];
  if(inspected.Image!==image||inspected.HostConfig.NetworkMode!=='none'||Object.keys(inspected.HostConfig.PortBindings??{}).length||inspected.HostConfig.Binds?.length||inspected.Mounts.length)throw Error('Isolation required');
  let ready=false;for(let i=0;i<60;i++){if(spawnSync('docker',['exec',container,'pg_isready','-U','postgres','-d','tcdx-grc'],{stdio:'ignore'}).status===0){ready=true;break;}await new Promise(r=>setTimeout(r,500));}if(!ready)throw Error('Restore cluster not ready');
  for(const role of roles){if(!/^[a-z_][a-z0-9_]*$/.test(role))throw Error('Role identifier invalid');if(role!=='postgres')run('docker',['exec','-i',container,'psql','-X','-q','-v','ON_ERROR_STOP=1','-U','postgres','-d','tcdx-grc'],{input:`CREATE ROLE "${role}" NOLOGIN;`});}
  run('docker',['exec','-i',container,'pg_restore','--exit-on-error','--single-transaction','-U','postgres','-d','tcdx-grc'],{input:readFileSync(dump)});
  const target=[];for(const q of dataQueries(true))target.push(JSON.parse(run('docker',['exec','-i',container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d','tcdx-grc'],{input:'BEGIN READ ONLY;'+q+'ROLLBACK;'})));
  const fingerprints=(rows:any[])=>rows.filter(r=>r.category==='data_fingerprint').sort((a,b)=>a.relation.localeCompare(b.relation));
  if(target.length!==245||JSON.stringify(fingerprints(source))!==JSON.stringify(fingerprints(target)))throw Error('Restore fingerprints differ');
  const restoredLedger=JSON.parse(run('docker',['exec','-i',container,'psql','-X','-qAt','-U','postgres','-d','tcdx-grc'],{input:"SELECT json_agg(x ORDER BY migration_id) FROM (SELECT migration_id,filename,content_sha256,outcome FROM platform.schema_migrations) x;"}));
  if(JSON.stringify(restoredLedger)!==JSON.stringify(ledger))throw Error('Restore ledger differs');
  Object.assign(result,{status:'PASS_VERIFIED_RECOVERABLE',reference,protected_location:dump,dump_sha256:sha(readFileSync(dump)),dump_size_bytes:statSync(dump).size,snapshot_utc:snap.captured_utc,tables_restored_verified:245,ledger_rows:36,isolation:{network:'none',ports:[],binds:[],volumes:[],PGDATA:'tmpfs768MiB'},catalogue_in_dump:true,PITR:'NOT_PROVIDED'});
  writeFileSync(dest+'/RECEIPT.json',JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 }
}catch(e){result.status='FAIL';result.error=e instanceof Error?e.message:'Unclassified failure';process.exitCode=1;}
finally{
 try{await c.end();}catch{}
 if(container){const p=spawnSync('docker',['rm','-f','-v',container],{stdio:'ignore'});result.restore_cleanup={exit_code:p.status,container_absent:spawnSync('docker',['inspect',container],{stdio:'ignore'}).status!==0};if(p.status!==0||!result.restore_cleanup.container_absent){result.status='FAIL';process.exitCode=1;}}
 result.finished_utc=new Date().toISOString();writeFileSync(custody+'/'+mode+'.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({mode,status:result.status,error:result.error,reference:result.reference,restore:result.tables_restored_verified}));
}
