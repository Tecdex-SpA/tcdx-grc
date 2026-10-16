import pg from 'pg';
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'../..');
const published=process.argv.includes('--published');
const publication=published ? JSON.parse(readFileSync(root+'/docs/executable-contracts/30_PHASE6A3_VOCABULARIES_MANIFEST.json')) : null;
const a=JSON.parse(readFileSync(process.env.TCDX_DISPOSABLE_INSTANCE_ATTESTATION));
const manifest=JSON.parse(readFileSync(root+'/docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/MACRO_MANIFEST_R1.json'));
assert.equal(process.env.TCDX_DISPOSABLE_INSTANCE_ID,a.container_id);
assert.equal(a.labels['tcdx.disposable'],'true');
assert.equal(a.labels['tcdx.execution'],'step6a3-v18-20261009');
assert.equal(a.host,'127.0.0.1');
const c=new pg.Client({host:a.host,port:a.port,user:'postgres',database:'tcdx-grc'});await c.connect();
try{
 assert.equal((await c.query('SELECT system_identifier::text FROM pg_control_system()')).rows[0].system_identifier,a.system_identifier);
 await c.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
 const roles=(await c.query("SELECT role_id,role_code,ownership_class,tenant_id,lifecycle_state FROM iam.roles WHERE tenant_id IS NULL")).rows;
 const permissions=(await c.query('SELECT permission_id,permission_code FROM iam.permissions')).rows;
 const grants=(await c.query('SELECT r.role_code,p.permission_code FROM iam.role_permissions rp JOIN iam.roles r ON r.role_id=rp.role_id JOIN iam.permissions p ON p.permission_id=rp.permission_id WHERE r.tenant_id IS NULL')).rows;
 const pairs=manifest.rbac_pairs.map(pair=>{const role=roles.find(r=>r.role_code===pair.role_code);assert.ok(role);const permission=permissions.find(p=>p.permission_code===pair.permission);const before=grants.filter(g=>g.role_code===pair.role_code&&g.permission_code===pair.permission).length;assert.equal(before,published?1:0);if(published)assert.ok(permission);else assert.equal(permission,undefined);return {...pair,publication_state:published?'PUBLISHED_LOCAL_V1':pair.publication_state,role_verified:true,permission_exists:published,before_native:published?pair.before:before,after_native:before,authority:'TENANT_CONTEXT_REQUIRED; TEMPLATE_PLATFORM_CONTROL_IS_NOT_PLATFORM_ACTOR_AUTHORITY'};});
 const values=(await c.query("SELECT table_schema,table_name,column_name,data_type,character_maximum_length,is_nullable FROM information_schema.columns WHERE table_schema IN ('controls','evidence','remediation','regulatory')")).rows;
 const occurrences=new Map();
 const source=readFileSync(root+'/docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md','utf8');
 for(const line of source.split('\n')){if(!line.startsWith('| F-'))continue;const cells=line.split('|');const field=cells[1].trim().split(' ')[0];const columns=[...cells[3].matchAll(/([a-z_]+)\.([a-z_]+)\.([a-z_]+)/g)].map(m=>m.slice(1));occurrences.set(field,columns);}
 const vocabulary=manifest.vocabularies.map(item=>{
  const physical=[];
  for(const field of item.field_ids.split(';')){const columns=occurrences.get(field);assert.ok(columns?.length,field);
   for(const [s,t,f] of columns){const col=values.find(c=>c.table_schema===s&&c.table_name===t&&c.column_name===f);assert.ok(col,`${s}.${t}.${f}`);assert.ok(item.value.length<=col.character_maximum_length);assert.equal(col.data_type,'character varying');physical.push({field,physical_column:`${s}.${t}.${f}`,physical_max_length:col.character_maximum_length,physical_nullable:col.is_nullable});}}
  if(published){const family=publication.families.find(f=>f.id===item.decision_id);assert.ok(family);const value=family.values.find(v=>v.code===item.value);assert.ok(value);assert.equal(value.label_es,item.label_es);}
  return {decision_id:item.decision_id,value:item.value,label_es:item.label_es,physical,publication_state:published?'PUBLISHED_LOCAL_V1':'NOT_PUBLISHED',compatibility:'PASS_LENGTH_AND_PHYSICAL_TYPE_ONLY; NO_NEW_ENUM_OR_ALIAS'};
 });

 const inventory=[];
 if(published)for(const columns of new Map([...occurrences.values()].flat().map(x=>[x.join('.'),x])).values()){const [s,t,f]=columns;assert.ok([s,t,f].every(x=>/^[a-z_]+$/.test(x)));const rows=(await c.query(`SELECT ${f} AS code,count(*)::text AS count FROM ${s}.${t} GROUP BY ${f} ORDER BY ${f}`)).rows;inventory.push({column:columns.join('.'),values:rows,historical_action:'PRESERVE; NO_ALIAS_OR_BACKFILL'});}
 if(published){const actual=grants.filter(g=>manifest.rbac_pairs.some(p=>p.permission===g.permission_code));assert.equal(actual.length,44);assert.ok(actual.every(g=>manifest.rbac_pairs.some(p=>p.permission===g.permission_code&&p.role_code===g.role_code)));}
 const discrepancies={auditor_action_create:grants.filter(g=>g.role_code==='AUDITOR'&&g.permission_code==='remediation.action.create').length,requirement_read_grants:grants.filter(g=>g.permission_code==='compliance.requirement.read').length};
 assert.equal(discrepancies.auditor_action_create,1);assert.equal(discrepancies.requirement_read_grants,0);
 process.stdout.write(JSON.stringify({status:published?'PASS_LOCAL_PUBLICATION_RECONCILIATION':'PASS_RECONCILIATION_ONLY',inventory,read_only:true,transaction_end:'ROLLBACK',pairs,vocabulary,discrepancies,counts:{pairs:44,vocabulary:52,families:14,occurrences:26},actual_permissions:permissions.length,permissions_published_by_this_execution:published?3:0,template_grants_published_by_this_execution:published?44:0,instance_system_identifier:a.system_identifier},null,2)+'\n');
 await c.query('ROLLBACK');
}finally{await c.end();}
