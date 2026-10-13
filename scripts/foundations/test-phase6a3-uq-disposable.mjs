import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import pg from 'pg';

// Test infrastructure only. This never discovers or mutates a shared database.
const attestation=JSON.parse(readFileSync(process.env.TCDX_DISPOSABLE_INSTANCE_ATTESTATION,'utf8'));
assert.equal(attestation.labels['tcdx.disposable'],'true');
assert.equal(attestation.labels['tcdx.execution'],'step6a3-v18-20261009');
assert.equal(attestation.ipc_mode,'private');
assert.equal(attestation.host,'127.0.0.1');
assert.equal(process.env.TCDX_DISPOSABLE_INSTANCE_ID,attestation.container_id);
const config={host:attestation.host,port:attestation.port,user:'postgres',database:'postgres',connectionTimeoutMillis:3000};
const admin=new pg.Client(config);await admin.connect();
const identity=(await admin.query('SELECT system_identifier::text FROM pg_control_system()')).rows[0];
assert.equal(identity.system_identifier,attestation.system_identifier,'refuse any other cluster');
assert.equal((await admin.query("SELECT current_setting('server_version_num')::integer/10000 AS major")).rows[0].major,16);
const migration=readFileSync('docs/phase6a/STEP_6A3/physical-reconciliation/forward-only.candidate.sql','utf8');
const migrationHash=createHash('sha256').update(migration).digest('hex');
const tests=[];const databases=[];
const uuid=()=>{const b=randomUUID().split('');b[14]='7';return b.join('');}; // local fixture UUIDv7 shape only; no persisted product identity.
async function test(name,fn){await fn();tests.push({name,result:'PASS'});}
async function database(suffix){const name=`step6a3_uq_${process.pid}_${suffix}`;databases.push(name);await admin.query(`CREATE DATABASE "${name}" TEMPLATE "tcdx-grc"`);const c=new pg.Client({...config,database:name});await c.connect();return c;}
async function oldConstraints(c){return (await c.query("SELECT conname,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conname IN ('uq_effective_configurations__tenant_id','uq_effective_configuration_layers__ordinal','ck_configuration_definitions__default_value_count') ORDER BY conname")).rows;}
async function fingerprint(c){return (await c.query("SELECT md5(COALESCE(string_agg(row_to_json(t)::text,'|' ORDER BY configuration_definition_id),'')) AS hash FROM config.configuration_definitions t UNION ALL SELECT md5(COALESCE(string_agg(row_to_json(t)::text,'|' ORDER BY effective_configuration_id),'')) FROM config.effective_configurations t UNION ALL SELECT md5(COALESCE(string_agg(row_to_json(t)::text,'|' ORDER BY effective_configuration_layer_id),'')) FROM config.effective_configuration_layers t")).rows;}
async function reject(c,query,params,code){await c.query('SAVEPOINT expected_rejection');try{await assert.rejects(c.query(query,params),e=>e.code===code);}finally{await c.query('ROLLBACK TO SAVEPOINT expected_rejection');}}
async function fixture(c){
 const actor=uuid(),tenant=uuid(),foreign=uuid(),ec=uuid(),layer=uuid();
 await c.query("INSERT INTO iam.user_identities(user_identity_id,identity_key,display_name,lifecycle_state) VALUES($1,$2,'Disposable UQ actor','active')",[actor,'uq:'+actor]);
 for(const t of [tenant,foreign])await c.query("INSERT INTO platform.tenants(tenant_id,tenant_code,legal_name,display_name,default_timezone,created_by_user_identity_id,updated_by_user_identity_id) VALUES($1,$2,'Disposable UQ tenant','Disposable UQ tenant','UTC',$3,$3)",[t,'uq:'+t,actor]);
 const definition=(await c.query("SELECT configuration_definition_id FROM config.configuration_definitions WHERE configuration_code='tenant_account_classification'")).rows[0].configuration_definition_id;
 const ecInsert="INSERT INTO config.effective_configurations(effective_configuration_id,tenant_id,configuration_definition_id,resolved_at,effective_at,resolution_status,input_hash,effective_text_value) VALUES($1,$2,$3,transaction_timestamp(),'2026-10-09T00:00:00Z','resolved',$4,'local')";
 const layerInsert="INSERT INTO config.effective_configuration_layers(effective_configuration_layer_id,tenant_id,effective_configuration_id,configuration_definition_id,precedence_level,ordinal,was_selected) VALUES($1,$2,$3,$4,$5,$6,true)";
 await c.query(ecInsert,[ec,tenant,definition,'a'.repeat(64)]);await c.query(layerInsert,[layer,tenant,ec,definition,'tenant',1]);
 return{actor,tenant,foreign,ec,layer,definition,ecInsert,layerInsert};
}
async function badMigration(suffix,makeBad,reason){const c=await database(suffix);try{await fixture(c);await makeBad(c);const before=await fingerprint(c),constraints=await oldConstraints(c);await assert.rejects(c.query(migration),e=>e.message===reason);await c.query('ROLLBACK');assert.deepEqual(await fingerprint(c),before);assert.deepEqual(await oldConstraints(c),constraints);}finally{await c.end();}}
try{
 await test('actual forward delta rolls back all DDL and preserves nonempty records',async()=>{const c=await database('rollback');try{await fixture(c);const before=await fingerprint(c),constraints=await oldConstraints(c);await c.query(migration.replace('\nCOMMIT;','\nROLLBACK;'));assert.deepEqual(await fingerprint(c),before);assert.deepEqual(await oldConstraints(c),constraints);}finally{await c.end();}});
 const newDefinition="INSERT INTO config.configuration_definitions(configuration_definition_id,ownership_class,configuration_code,version_number,value_type,tenant_overridable,object_overridable,owner_domain,lifecycle_state,effective_from,effective_to,default_boolean_value,default_integer_value,default_decimal_value,default_text_value,default_timestamp_value,default_duration_seconds_value,default_json_value) VALUES($1,'GLOBAL_REFERENCE',$2,1,$3,false,false,'Core Platform','draft','2026-10-09T00:00:00Z','2030-01-01T00:00:00Z',$4,$5,$6,$7,$8,$9,$10)";
 await test('preexisting absent default fails closed without backfill',()=>badMigration('absent',c=>c.query(newDefinition,[uuid(),'local_absent','text',null,null,null,null,null,null,null]),'STEP6A3_DEFAULT_CARDINALITY'));
 await test('preexisting wrong typed default fails closed without data change',()=>badMigration('wrong',c=>c.query(newDefinition,[uuid(),'local_wrong','boolean',null,0,null,null,null,null,null]),'STEP6A3_DEFAULT_TYPE'));
 await test('preexisting invalid hash fails closed without DDL residue',()=>badMigration('hash',c=>c.query("UPDATE config.effective_configurations SET input_hash=repeat('A',64)"),'STEP6A3_HASH_FORMAT'));
 await test('unexpected source constraint name cannot be silently dropped',()=>badMigration('source',c=>c.query('ALTER TABLE config.effective_configurations RENAME CONSTRAINT uq_effective_configurations__tenant_id TO local_unexpected_source'),'STEP6A3_UNEXPECTED_SOURCE_CONSTRAINTS'));
 const c=await database('valid');try{
  const f=await fixture(c);const before=await fingerprint(c);
  await test('forward migration accepts existing canonical data and preserves every record',async()=>{await c.query(migration);assert.deepEqual(await fingerprint(c),before);assert.equal((await oldConstraints(c)).length,0);});
  await c.query('BEGIN');
  await test('same tenant different EC natural keys are accepted',async()=>{await c.query(f.ecInsert,[uuid(),f.tenant,f.definition,'b'.repeat(64)]);});
  await test('duplicate EC natural key with NULL subject is rejected by native constraint',()=>reject(c,f.ecInsert,[uuid(),f.tenant,f.definition,'a'.repeat(64)],'23505'));
  const second=(await c.query('SELECT effective_configuration_id FROM config.effective_configurations WHERE tenant_id=$1 AND input_hash=$2',[f.tenant,'b'.repeat(64)])).rows[0].effective_configuration_id;
  await test('ordinal reused across EC parents is accepted',()=>c.query(f.layerInsert,[uuid(),f.tenant,second,f.definition,'tenant',1]));
  await test('ordinal reused across precedence levels is accepted',()=>c.query(f.layerInsert,[uuid(),f.tenant,f.ec,f.definition,'object',1]));
  await test('duplicate contextual ordinal is rejected natively',()=>reject(c,f.layerInsert,[uuid(),f.tenant,f.ec,f.definition,'tenant',1],'23505'));
  await test('cross-tenant EC layer is rejected by unchanged composite FK',()=>reject(c,f.layerInsert,[uuid(),f.foreign,f.ec,f.definition,'tenant',2],'23503'));
  const types=['boolean','integer','decimal','text','timestamp','duration','json'];
  const values=[false,0,0,'','2026-10-09T00:00:00Z',0,'{}'];
  for(let i=0;i<types.length;i++){
   await test(`typed ${types[i]} default roundtrip preserves false/zero/empty`,async()=>{const fields=Array(7).fill(null);fields[i]=values[i];await c.query(newDefinition,[uuid(),'local_valid_'+types[i],types[i],...fields]);});
   await test(`absent ${types[i]} default is rejected`,()=>reject(c,newDefinition,[uuid(),'local_absent_'+types[i],types[i],...Array(7).fill(null)],'23514'));
   await test(`wrong ${types[i]} default is rejected`,()=>{const fields=Array(7).fill(null);fields[i===0?1:0]=i===0?0:false;return reject(c,newDefinition,[uuid(),'local_wrong_'+types[i],types[i],...fields],'23514');});
  }
  await test('multiple defaults are rejected without coercion',()=>reject(c,newDefinition,[uuid(),'local_multiple','boolean',false,0,null,null,null,null,null],'23514'));
  await test('unknown default type is rejected without invented enum',()=>reject(c,newDefinition,[uuid(),'local_unknown','unknown',false,null,null,null,null,null,null],'23514'));
  await c.query('COMMIT');
  await test('concurrent duplicate EC inserts serialize and reject one writer',async()=>{
   const a=new pg.Client({...config,database:c.database}),b=new pg.Client({...config,database:c.database});await a.connect();await b.connect();
   try{await a.query('BEGIN');await b.query('BEGIN');await a.query(f.ecInsert,[uuid(),f.tenant,f.definition,'c'.repeat(64)]);
    const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
    const pending=b.query(f.ecInsert,[uuid(),f.tenant,f.definition,'c'.repeat(64)]).then(()=>({accepted:true}),e=>({code:e.code}));
    let waiting=false;for(let attempt=0;attempt<100;attempt++){const row=(await c.query("SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1",[pid])).rows[0];if(row?.wait_event_type==='Lock'){waiting=true;break;}await new Promise(r=>setTimeout(r,20));}
    assert.ok(waiting,'second writer must wait on uniqueness lock');await a.query('COMMIT');assert.deepEqual(await pending,{code:'23505'});await b.query('ROLLBACK');
    assert.equal((await c.query('SELECT count(*)::int AS n FROM config.effective_configurations WHERE tenant_id=$1 AND input_hash=$2',[f.tenant,'c'.repeat(64)])).rows[0].n,1);
   }finally{await a.query('ROLLBACK');await b.query('ROLLBACK');await a.end();await b.end();}
  });
  await test('old global tenant uniqueness cannot be reinstalled after valid new cardinalities',async()=>{await c.query('BEGIN');await reject(c,'ALTER TABLE config.effective_configurations ADD CONSTRAINT local_bad_recovery UNIQUE NULLS NOT DISTINCT(tenant_id)',[],'23505');await c.query('ROLLBACK');});
  await test('unregistered raw rerun fails closed; ledger idempotency is not faked',async()=>{const before=await fingerprint(c);await assert.rejects(c.query(migration),e=>e.message==='STEP6A3_UNEXPECTED_SOURCE_CONSTRAINTS');await c.query('ROLLBACK');assert.deepEqual(await fingerprint(c),before);});
 }finally{await c.end();}
 console.log(JSON.stringify({status:'PASS',scope:'NATIVE_CANONICAL_CONSTRAINTS_ON_OWN_DISPOSABLE_CLONES_ONLY',postgres:'16.15',instance:attestation,migration_sha256:migrationHash,tests,count:tests.length,persistent_shared_writes:0,qa:'NOT_RUN',rls:'NOT_IMPLEMENTED',external_e2e:'NOT_RUN'},null,2));
}finally{
 for(const db of databases)await admin.query(`DROP DATABASE "${db}"`);
 await admin.end();
}
