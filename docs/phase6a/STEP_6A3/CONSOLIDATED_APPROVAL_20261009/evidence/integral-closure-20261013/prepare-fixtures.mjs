// Reuses the prior isolated R6 fixture ceremony and published R3 delta.
// These are disposable test data, never human approval or real IAM authority.
import pg from 'pg';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const out=dirname(fileURLToPath(import.meta.url)),root=resolve(out,'../../../../../..');
assert.equal(process.env.TCDX_ISOLATED_REBUILD,'true');
assert.equal(process.env.DATABASE_HOST,'127.0.0.1');
assert.equal(process.env.DATABASE_PORT,'55432');
assert.equal(process.env.DATABASE_NAME,'tcdx-grc');
const c=new pg.Client({host:'127.0.0.1',port:55432,user:'postgres',database:'tcdx-grc'});
await c.connect();
try {
  const identity=(await c.query("SELECT current_database() AS database,current_setting('server_version_num')::int/10000 AS major,system_identifier::text FROM pg_control_system()")).rows[0];
  assert.equal(identity.database,'tcdx-grc');assert.equal(identity.major,16);
  const sha=b=>createHash('sha256').update(b).digest('hex');
  const previous=readFileSync(resolve(root,'docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/evidence/continuity-r6/fixture-setup.mjs'),'utf8');
  const {spawnSync}=await import('node:child_process');
  const run=spawnSync(process.execPath,['--input-type=module','--eval',previous],{
    cwd:root,env:{...process.env,TCDX_STEP6A3_PG_SYSTEM_IDENTIFIER:identity.system_identifier},encoding:'utf8'});
  if(run.status!==0) throw new Error(`Existing fixture ceremony failed: ${run.stderr}`);
  const publication=(await c.query("SELECT actor_service_principal_id FROM ops_audit.audit_events WHERE command_code='phase6a3RolePermissionPublication' AND tenant_id IS NULL LIMIT 1")).rows[0];
  assert.ok(publication?.actor_service_principal_id);
  const r3=readFileSync(resolve(root,'docs/phase6a/STEP_6A3/rbac-publication/20261009000400_phase6a3_rbac_resolution.sql'),'utf8');
  await c.query('BEGIN');
  await c.query("SELECT set_config('tcdx.publication_service_principal_id',$1,true)",[publication.actor_service_principal_id]);
  await c.query(r3);await c.query('COMMIT');
  const attestation={scope:'EXISTING_DISPOSABLE_FIXTURES_ONLY',...identity,
    original_fixture_sha256:sha(previous),r3_fixture_sha256:sha(r3),
    previous_ceremony:JSON.parse(run.stdout.trim()),
    shared_qa_mutations:0,reserved_normative_zip:'NOT_IMPORTED',new_commercial_contracts:'NOT_ACTIVATED',
    fixture_33_34_ledger_entries:'NOT_INSERTED'};
  writeFileSync(resolve(out,'fixture-attestation.json'),JSON.stringify(attestation,null,2)+'\n');
  console.log(JSON.stringify(attestation));
} catch(error) {await c.query('ROLLBACK');throw error;} finally {await c.end();}
