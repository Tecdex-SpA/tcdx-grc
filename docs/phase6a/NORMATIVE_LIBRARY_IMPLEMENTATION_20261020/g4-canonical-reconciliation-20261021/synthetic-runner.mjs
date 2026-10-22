// Isolated test harness for the REAL canonical runner, never a migration authority.
import pg from '/work/node_modules/pg/lib/index.js';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, copyFileSync, mkdtempSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root='/work';
if(process.env.TCDX_ISOLATED_REBUILD!=='true'||process.env.DATABASE_HOST!=='127.0.0.1'||!process.env.TCDX_RECONCILIATION_SYSTEM_IDENTIFIER) throw Error('Isolated attested target required');
const c=new pg.Client({host:'127.0.0.1',port:5432,database:'tcdx-grc',user:'postgres',ssl:false});await c.connect();
const id=(await c.query('SELECT system_identifier::text FROM pg_control_system()')).rows[0].system_identifier;
if(id!==process.env.TCDX_RECONCILIATION_SYSTEM_IDENTIFIER)throw Error('Cluster identity mismatch');
const manifest=JSON.parse(readFileSync(root+'/database/migrations/manifest.json'));
const tests=[];const logs=[];
function check(name,ok,detail){tests.push({name,status:ok?'PASS':'FAIL',detail});if(!ok)throw Error(name+': '+JSON.stringify(detail));}
function run(name,args,env={},success=true,pattern){const start=Date.now();const r=spawnSync(process.execPath,['--experimental-strip-types',...args],{cwd:root,encoding:'utf8',env:{...process.env,...env}});const output=r.stdout+'\n'+r.stderr;logs.push({name,exit:r.status,ms:Date.now()-start,output});check(name,success?r.status===0:r.status!==0&&pattern.test(output),{exit:r.status});return r;}
const runner=root+'/scripts/foundations/migrate.ts';const verifier=root+'/scripts/foundations/verify-schema.ts';
const tmp=mkdtempSync('/tmp/normative-migrations-');
try {
 const base={...manifest,migrations:manifest.migrations.slice(0,-1)};writeFileSync(tmp+'/base.json',JSON.stringify(base));
 run('canonical_34_history_rebuild',[runner,'apply'],{TCDX_MIGRATION_TEST_MODE:'true',TCDX_MIGRATION_MANIFEST:tmp+'/base.json',TCDX_MIGRATION_DIRECTORY:root+'/database/migrations'});
 const before=(await c.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')")).rows[0].n;
 const faildir=tmp+'/fail';(await import('node:fs')).mkdirSync(faildir);
 for(const m of manifest.migrations)copyFileSync(root+'/database/migrations/'+m.filename,faildir+'/'+m.filename);
 const bad=structuredClone(manifest);const last=bad.migrations.at(-1);const badbytes=readFileSync(faildir+'/'+last.filename,'utf8')+'\nSELECT 1/0; -- intentional final-statement rollback probe, disposable only\n';writeFileSync(faildir+'/'+last.filename,badbytes);last.sha256=createHash('sha256').update(badbytes).digest('hex');writeFileSync(tmp+'/failure.json',JSON.stringify(bad));
 run('migration_35_failure_is_rolled_back',[runner,'apply'],{TCDX_MIGRATION_TEST_MODE:'true',TCDX_MIGRATION_MANIFEST:tmp+'/failure.json',TCDX_MIGRATION_DIRECTORY:faildir},false,/division by zero/);
 const rb=(await c.query("SELECT (SELECT count(*)::int FROM platform.schema_migrations) ledger,(SELECT count(*)::int FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')) tables,to_regclass('knowledge.knowledge_version_context_links') links,to_regclass('knowledge.knowledge_source_usage_rights') rights,(SELECT count(*)::int FROM pg_attribute WHERE attrelid='regulatory.requirement_applicabilities'::regclass AND attname='context_knowledge_version_id' AND NOT attisdropped) context_columns")).rows[0];check('DDL_and_ledger_atomic_rollback',rb.ledger===34&&rb.tables===before&&rb.links===null&&rb.rights===null&&rb.context_columns===0,rb);
 run('canonical_35_apply',[runner,'apply']);
 run('canonical_35_noop_reapply',[runner,'apply']);
 run('canonical_35_status',[runner,'status']);
 const counts=(await c.query("SELECT (SELECT count(*)::int FROM platform.schema_migrations) ledger,(SELECT count(*)::int FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')) tables")).rows[0];check('35_ledger_and_244_domain_tables',counts.ledger===35&&counts.tables===245,counts);
 const functions=(await c.query("SELECT n.nspname||'.'||p.proname AS name,pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('knowledge','config','regulatory') AND p.proname=ANY($1::text[]) ORDER BY 1",[['check_context_link','guard_context_link','guard_context_target_owner','guard_published_version_core','guard_control_override_history','check_control_override_successor','guard_context_decision_history','enforce_source_usage_rights']])).rows;
 const triggers=(await c.query("SELECT n.nspname||'.'||c.relname AS relation,t.tgname AS name,pg_get_triggerdef(t.oid,true) AS definition,t.tgenabled AS enabled FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal AND (t.tgname LIKE 'ck_knowledge_context__%' OR t.tgname LIKE 'ck_context_target__%' OR t.tgname IN ('ck_context_source__owner','ck_knowledge_version__published_core','ck_control_override__history','ck_control_override__succession','ck_applicability__context_history','trg_knowledge_source_usage_rights__integrity')) ORDER BY 1,2")).rows;
 const affected=['knowledge.knowledge_version_context_links','knowledge.knowledge_source_usage_rights','knowledge.knowledge_versions','config.configuration_overrides','config.effective_configurations','regulatory.requirement_applicabilities'];
 const constraints=(await c.query("SELECT n.nspname||'.'||c.relname AS relation,k.conname AS name,pg_get_constraintdef(k.oid,true) AS definition,k.convalidated AS validated FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname||'.'||c.relname=ANY($1::text[]) ORDER BY 1,2",[affected])).rows;
 const indexes=(await c.query("SELECT n.nspname||'.'||c.relname AS relation,i.relname AS name,pg_get_indexdef(i.oid) AS definition,x.indisvalid AS valid,x.indisready AS ready FROM pg_index x JOIN pg_class c ON c.oid=x.indrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_class i ON i.oid=x.indexrelid WHERE n.nspname||'.'||c.relname=ANY($1::text[]) ORDER BY 1,2",[affected])).rows;
 check('8_effective_functions_12_triggers',functions.length===8&&triggers.length===12,{functions:functions.length,triggers:triggers.length});
 if(process.argv.includes('--project-only'))process.stdout.write(JSON.stringify({tests,logs,projection:{functions,triggers,constraints,indexes}},null,2)+'\n');
 else {
  run('canonical_schema_verify',[verifier]);
  run('canonical_migration_guards',[root+'/scripts/foundations/verify-migration-gates.ts']);
  await c.query('CREATE FUNCTION knowledge.enforce_source_usage_rights(integer) RETURNS integer LANGUAGE sql AS \'SELECT $1\'');
  run('unexpected_function_overload_rejected',[verifier],{},false,/duplicate-function-identity/);await c.query('DROP FUNCTION knowledge.enforce_source_usage_rights(integer)');
  await c.query('ALTER TABLE privacy.retention_policies DROP CONSTRAINT ck_retention_policies__kind_duration_c04w');
  run('historical_C04W_check_still_required',[verifier],{},false,/missing-constraint:ck_retention_policies__kind_duration_c04w/);
  await c.query("ALTER TABLE privacy.retention_policies ADD CONSTRAINT ck_retention_policies__kind_duration_c04w CHECK ((policy_kind='legal_hold' AND retention_seconds IS NULL) OR (policy_kind<>'legal_hold' AND retention_seconds IS NOT NULL AND retention_seconds>=0))");

  const original=functions.find(x=>x.name==='knowledge.enforce_source_usage_rights').definition;
  await c.query(original.replace('DECLARE source_row record; audit_row record;','DECLARE source_row record; audit_row record;\n-- deliberate drift test'));
  run('function_body_drift_rejected',[verifier],{},false,/function-definition/);await c.query(original);
  await c.query('ALTER TABLE knowledge.knowledge_version_context_links DISABLE TRIGGER ck_knowledge_context__immutable');run('disabled_trigger_rejected',[verifier],{},false,/trigger-definition/);await c.query('ALTER TABLE knowledge.knowledge_version_context_links ENABLE TRIGGER ck_knowledge_context__immutable');
  await c.query('DROP INDEX knowledge.ix_knowledge_context__unit');run('missing_index_rejected',[verifier],{},false,/missing-index|index-definition/);await c.query(indexes.find(x=>x.name==='ix_knowledge_context__unit').definition);
  const ck=constraints.find(x=>x.name==='ck_knowledge_context__target_xor');await c.query('ALTER TABLE '+ck.relation+' DROP CONSTRAINT '+ck.name);await c.query('ALTER TABLE '+ck.relation+' ADD CONSTRAINT '+ck.name+' CHECK(true)');run('weakened_XOR_check_rejected',[verifier],{},false,/constraint-definition/);await c.query('ALTER TABLE '+ck.relation+' DROP CONSTRAINT '+ck.name);await c.query('ALTER TABLE '+ck.relation+' ADD CONSTRAINT '+ck.name+' '+ck.definition);
  run('final_canonical_schema_verify',[verifier]);
  process.stdout.write(JSON.stringify({tests,logs,status:'PASS_ISOLATED_CANONICAL_CHAIN_ONLY'},null,2)+'\n');
 }
} catch(error){process.stdout.write(JSON.stringify({tests,logs,error:String(error),status:'FAIL'},null,2)+'\n');process.exitCode=1;} finally{await c.end();}
