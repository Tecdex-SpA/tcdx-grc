// Fresh QA logical snapshot; sensitive dump stays in private FileVault custody.
// Restore is a networkless PG16 tmpfs container, removed in finally.
import {mkdirSync,statSync,lstatSync,writeFileSync,openSync,closeSync,readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createClient} from '../../../../scripts/foundations/db.ts';
import {base,guard,collect} from './inspect.mts';
const PG='/opt/homebrew/opt/postgresql@16/bin/';
const image='sha256:0ea6700a3b4f0ae6ce746519073558aed4d88a79d8d07622a9a644946c7319c4';
const sha=(s:Buffer|string)=>createHash('sha256').update(s).digest('hex');
process.umask(0o077);
function run(cmd:string,args:string[],opts:any={}){
 const p=spawnSync(cmd,args,{encoding:'utf8',timeout:180000,maxBuffer:32*1024*1024,...opts});
 if(p.status!==0)throw Error('Subprocess failed: '+cmd);return p.stdout as string;
}
if(run('fdesetup',['status']).trim()!=='FileVault is On.')throw Error('Encrypted custody required');
const parent=homedir()+'/.tcdx-grc-qa-recovery';mkdirSync(parent,{mode:0o700,recursive:true});
if(lstatSync(parent).isSymbolicLink()||statSync(parent).uid!==process.getuid!()||(statSync(parent).mode&0o077)!==0)throw Error('Unsafe custody');
const retry=process.argv.includes('--restore-saved');
const previous:any=retry?JSON.parse(readFileSync(base+'/BACKUP_RESTORE_ATTEMPT1.json','utf8')):undefined;
const reference=previous?.reference??('QA01-LOGICAL-'+randomUUID().replaceAll('-',''));const dest=parent+'/'+reference;
if(!retry)mkdirSync(dest,{mode:0o700});const dump=dest+'/tcdx-grc.pgdump';const err=openSync(dest+(retry?'/restore-retry-private-diagnostics.log':'/private-diagnostics.log'),'wx',0o600);
const result:any=retry?{...previous,retry:'Restore only; original dump unchanged; no new QA connection',source_connections_this_retry:0}:{reference,protected_location:dump,started_utc:new Date().toISOString(),source:'QA db-tecdex/192.168.2.40:5432/tcdx-grc',source_writes:'NONE',custody:'andresbarouh; directory0700/archive0600; FileVault ON',file_encryption:'FileVault at rest; no independent file encryption, prior PO custody decision preserved',PITR:'NOT_PROVIDED_LOGICAL_SNAPSHOT_ONLY',retention:'Retain pending explicit PO disposal decision',image};
if(retry){for(const k of ['status','failed_stage','cleanup','finished_utc','isolation','restore_exit_code'])delete result[k];result.restore_retry_started_utc=new Date().toISOString();if(result.protected_location!==dump||sha(readFileSync(dump))!==result.dump_sha256)throw Error('Saved dump drift');}
const c=createClient();let container:string|undefined;let stage='connect';
let source:any[];let roles:string[];
try{
 if(retry){source=JSON.parse(readFileSync(dest+'/SNAPSHOT_METADATA.json','utf8')).source;roles=result.referenced_roles;}
 else{
 await c.connect();await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');result.identity=await guard(c);
 const snapshot=(await c.query('SELECT pg_export_snapshot() snapshot,clock_timestamp() captured_utc,pg_database_size(current_database()) size_bytes')).rows[0];
 result.snapshot_utc=snapshot.captured_utc;result.snapshot_token_sha256=sha(snapshot.snapshot);
 roles=(await c.query("SELECT DISTINCT r.rolname FROM pg_shdepend d JOIN pg_roles r ON r.oid=d.refobjid WHERE d.dbid=(SELECT oid FROM pg_database WHERE datname=current_database()) AND d.refclassid='pg_authid'::regclass ORDER BY r.rolname")).rows.map(r=>r.rolname as string);
 result.referenced_roles=roles;
 const free=Number(run('df',['-Pk',dest]).trim().split('\n').at(-1)!.split(/\s+/)[3])*1024;
 if(free<Math.max(Number(snapshot.size_bytes)*5,1024**3))throw Error('Custody disk space inadequate');
 source=await collect(async sql=>(await c.query(sql)).rows[0].jsonb_build_object,true);
 stage='dump';
 const conn=`host=db-tecdex hostaddr=192.168.2.40 port=5432 dbname=tcdx-grc user=postgres sslmode=verify-full sslrootcert=${process.env.DATABASE_SSL_ROOT_CERT} connect_timeout=5`;
 const password=(c as unknown as {password:string}).password;
 const env={...process.env,PGPASSWORD:password};
 const p=spawnSync(PG+'pg_dump',[conn,'-w','--format=custom','--compress=6','--lock-wait-timeout=5s','--snapshot='+snapshot.snapshot,'--file='+dump],{env,stdio:['ignore','ignore',err],timeout:180000});
 result.dump_exit_code=p.status;if(p.status!==0)throw Error('Dump failed');
 result.dump_sha256=sha(readFileSync(dump));result.dump_size_bytes=statSync(dump).size;result.dump_version=run(PG+'pg_dump',['--version']).trim();
 if((statSync(dump).mode&0o077)!==0||result.dump_size_bytes===0)throw Error('Unsafe/empty dump');
 const list=run(PG+'pg_restore',['--list',dump],{stdio:['ignore','pipe',err]});result.archive_toc_sha256=sha(list);result.archive_list_exit_code=0;
 await c.query('ROLLBACK');await c.end();
 writeFileSync(dest+'/SNAPSHOT_METADATA.json',JSON.stringify({identity:result.identity,source,snapshot_utc:result.snapshot_utc,dump_sha256:result.dump_sha256},null,2)+'\n',{flag:'wx',mode:0o600});
 }
 stage='isolated_restore';container='grc-qa01-restore-'+randomUUID().slice(0,12);
 run('docker',['run','-d','--name',container,'--label','tcdx.purpose=qa01-migration36-recovery-drill','--network','none','--tmpfs','/var/lib/postgresql/data:rw,noexec,nosuid,size=768m','--env','POSTGRES_DB=tcdx-grc','--env','POSTGRES_HOST_AUTH_METHOD=trust',image,'-c','listen_addresses=','-c','max_connections=10','-c','max_locks_per_transaction=1024']);
 const inspected=JSON.parse(run('docker',['inspect',container]))[0];
 if(inspected.Image!==image||inspected.HostConfig.NetworkMode!=='none'||inspected.HostConfig.PortBindings&&Object.keys(inspected.HostConfig.PortBindings).length||inspected.HostConfig.Binds?.length||inspected.Mounts.length)throw Error('Restore isolation invalid');
 result.isolation={container,image:inspected.Image,network:'none',ports:[],binds:[],volumes:[],PGDATA:'tmpfs768MiB',max_locks_per_transaction:1024};
 let ready=false;
 for(let n=0;n<60;n++){if(spawnSync('docker',['exec',container,'pg_isready','-U','postgres','-d','tcdx-grc'],{stdio:'ignore'}).status===0){ready=true;break;}await new Promise(r=>setTimeout(r,500));}
 if(!ready)throw Error('Isolated PG not ready');
 for(const role of roles){if(!/^[a-z_][a-z0-9_]*$/.test(role))throw Error('Invalid referenced role');if(role!=='postgres')run('docker',['exec','-i',container,'psql','-X','-q','-v','ON_ERROR_STOP=1','-U','postgres','-d','tcdx-grc'],{input:`CREATE ROLE "${role}" NOLOGIN;`,stdio:['pipe','pipe',err]});}
 const fd=openSync(dump,'r');
 try{const p=spawnSync('docker',['exec','-i',container,'pg_restore','--exit-on-error','--single-transaction','--username=postgres','--dbname=tcdx-grc'],{stdio:[fd,'ignore',err],timeout:180000});result.restore_exit_code=p.status;if(p.status!==0)throw Error('Restore failed');}finally{closeSync(fd);}
 const targetQ=async(sql:string)=>JSON.parse(run('docker',['exec','-i',container!,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d','tcdx-grc'],{input:'BEGIN READ ONLY;'+sql+'ROLLBACK;',stdio:['pipe','pipe',err]}));
 // Only source-identity/activity/control-file SELECTs are inapplicable to restore.
 // Domain metadata and row fingerprints are collected with identical SELECTs.
 const {queries,dataQueries}=await import('./inspect.mts');const target:any[]=[];
 for(const sql of [...queries.filter(q=>['relations','columns','constraints','indexes','functions','triggers','ledger','authority_catalog'].some(k=>q.includes("'category','"+k+"'"))),...dataQueries(true)])target.push(await targetQ(sql));
 const {normalizedConstraintDefinition}=await import('../../../../scripts/foundations/schema-definition.ts');
 const clean=(rows:any[],category:string)=>{
  let x=structuredClone(rows.find(r=>r.category===category));
  if(['relations','constraints','functions'].includes(category))for(const row of x.rows){delete row.oid;delete row.relation_oid;delete row.referenced_relation_oid;}
  if(category==='constraints')for(const row of x.rows){row.definition=normalizedConstraintDefinition(row.definition);delete row.normalized_definition;}
  if(category==='authority_catalog')delete x.roles; // global cluster roles are not backed up; only NOLOGIN owner names in isolated restore.
  return JSON.stringify(x);
 };
 result.comparisons={};
 for(const category of ['relations','columns','constraints','indexes','functions','triggers','ledger','authority_catalog'])result.comparisons[category]=clean(source,category)===clean(target,category);
 const fps=(rows:any[])=>rows.filter(x=>x.category==='data_fingerprint').sort((a,b)=>a.relation.localeCompare(b.relation));
 result.comparisons.all_245_table_fingerprints=JSON.stringify(fps(source))===JSON.stringify(fps(target));
 result.tables_compared=fps(source).length;result.ledger_rows=source.find(x=>x.category==='ledger').rows.length;
 result.restore_version=await targetQ("SELECT jsonb_build_object('major',current_setting('server_version_num')::int/10000,'version',version());");
 if(result.restore_version.major!==16||result.tables_compared!==245||!Object.values(result.comparisons).every(Boolean))throw Error('Restored comparison differs');
 result.status='PASS_VERIFIED_RECOVERABLE';
}catch(e){result.status='FAIL';result.failed_stage=stage;writeFileSync(err,String(e)+'\n');process.exitCode=1;}
finally{
 try{await c.end();}catch{}
 if(container){const p=spawnSync('docker',['rm','-f','-v',container],{stdio:['ignore','ignore',err]});const absent=spawnSync('docker',['inspect',container],{stdio:'ignore'}).status!==0;result.cleanup={exit_code:p.status,container_absent:absent,sensitive_restore_tmpfs_destroyed:absent};if(p.status!==0||!absent){result.status='FAIL';process.exitCode=1;}}
 closeSync(err);result.finished_utc=new Date().toISOString();
 for(const path of [dest+(retry?'/RESTORE_VERIFIED_RECEIPT.json':'/RECEIPT.json'),base+'/BACKUP_RECEIPT.json'])writeFileSync(path,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({status:result.status,reference:result.reference,failed_stage:result.failed_stage,comparisons:result.comparisons,cleanup:result.cleanup}));
}
