import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {Kysely,PostgresDialect,sql,CompiledQuery} from 'kysely';
import pg from 'pg';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import type {FoundationDatabase} from '../database.js';
import {newUuidV7} from '../uuid.js';

describe.skipIf(process.env.TCDX_LIBRARY_OPERATIONAL_INTEGRATION!=='true')('optional typed default forward-only PG16 correction',()=>{
 let db:Kysely<FoundationDatabase>;
 const from=new Date(Date.now()-3600000).toISOString(),to=new Date(Date.now()+86400000).toISOString();
 const types=['boolean','integer','decimal','text','timestamp','duration','json'];
 const columns=['default_boolean_value','default_integer_value','default_decimal_value','default_text_value','default_timestamp_value','default_duration_seconds_value','default_json_value'];
 const values=[true,'7','3.25','Synthetic default',from,'3600',{synthetic:true}];
 let dataBefore:unknown,catalogBefore:unknown;
 const tables=JSON.parse(readFileSync('database/expected-schema.json','utf8')).tables.map((t:{name:string})=>t.name) as string[];
 async function rows(){const r:Record<string,string>={};for(const table of tables){const value=(await db.executeQuery(CompiledQuery.raw(`SELECT to_jsonb(t)::text AS body FROM ${table} t ORDER BY to_jsonb(t)::text`))).rows;r[table]=createHash('sha256').update(JSON.stringify(value)).digest('hex');}return r;}
 async function catalog(){return (await sql`SELECT n.nspname,c.relname,k.conname,pg_get_constraintdef(k.oid) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND k.conname<>'ck_configuration_definitions__typed_default' ORDER BY n.nspname,c.relname,k.conname`.execute(db)).rows;}
 async function insert(type:string,defaults:Record<string,unknown>={}){
  const vals={configuration_definition_id:newUuidV7(),ownership_class:'PLATFORM_CONTROL',configuration_code:newUuidV7(),version_number:1,value_type:type,tenant_overridable:true,object_overridable:true,owner_domain:'controls',lifecycle_state:'published',effective_from:from,effective_to:to,published_at:new Date().toISOString(),...defaults};
  return db.insertInto('config.configuration_definitions' as never).values(vals as never).execute();
 }
 beforeAll(async()=>{
  if(process.env.DATABASE_HOST!=='127.0.0.1'||process.env.DATABASE_PORT!=='55549'||!process.env.TCDX_LIBRARY_TEST_CLUSTER?.startsWith('/private/tmp/tcdx-library-operational.'))throw Error('OWN_LOCAL_CLUSTER_REQUIRED');
  db=new Kysely<FoundationDatabase>({dialect:new PostgresDialect({pool:new pg.Pool({host:'127.0.0.1',port:55549,database:'tcdx-grc',user:process.env.DATABASE_USER,ssl:false})})});
  expect((await sql<{path:string}>`SELECT current_setting('data_directory') AS path`.execute(db)).rows[0]!.path).toBe(process.env.TCDX_LIBRARY_TEST_CLUSTER);
  expect((await sql`SELECT * FROM platform.schema_migrations`.execute(db)).rows).toHaveLength(35);
  // Real legacy-compatible defaults for every supported type, before the corrective migration.
  for(let i=0;i<types.length;i++)await insert(types[i]!,{[columns[i]!]:values[i]});
  dataBefore=await rows();catalogBefore=await catalog();
 });
 afterAll(async()=>{await db?.destroy();});
 it('demonstrates the old constraint and applies correction through the canonical runner',async()=>{
  await expect(insert('text')).rejects.toMatchObject({code:'23514',constraint:'ck_configuration_definitions__typed_default'});
  const manifest=JSON.parse(readFileSync('database/migrations/manifest.json','utf8'));
  const correction=readFileSync('database/migrations/'+manifest.migrations.at(-1).filename,'utf8');
  await expect(db.transaction().execute(async tx=>{
   await sql`ALTER TABLE config.configuration_definitions DROP CONSTRAINT ck_configuration_definitions__typed_default`.execute(tx);
   await sql`ALTER TABLE config.configuration_definitions ADD CONSTRAINT ck_configuration_definitions__typed_default CHECK(TRUE)`.execute(tx);
   await tx.executeQuery(CompiledQuery.raw(correction));
  })).rejects.toThrow('LOCAL_DEFINITIONS_01_PREDECESSOR_DRIFT');
  const result=spawnSync(process.execPath,['--experimental-strip-types','scripts/foundations/migrate.ts','apply'],{env:{...process.env,TCDX_MIGRATION_TEST_MODE:'false'},encoding:'utf8'});
  expect(result.status,result.stdout+result.stderr).toBe(0);
  expect(await rows()).toEqual(dataBefore);expect(await catalog()).toEqual(catalogBefore);
  expect((await sql`SELECT * FROM platform.schema_migrations`.execute(db)).rows).toHaveLength(36);
 });
 it.each(types)('accepts semantic absence for known type %s and rejects wrong/double typed values',async type=>{
  await expect(insert(type)).resolves.toBeDefined();const index=types.indexOf(type),other=(index+1)%types.length;
  await expect(insert(type,{[columns[other]!]:values[other]})).rejects.toMatchObject({code:'23514',constraint:'ck_configuration_definitions__typed_default'});
  await expect(insert(type,{[columns[index]!]:values[index],[columns[other]!]:values[other]})).rejects.toMatchObject({code:'23514',constraint:'ck_configuration_definitions__typed_default'});
  await expect(insert(type,{[columns[index]!]:values[index]})).resolves.toBeDefined();
 });
 it('rejects unknown type even with no default and retains nonnegative duration integrity',async()=>{
  await expect(insert('unknown')).rejects.toMatchObject({code:'23514'});
  await expect(insert('duration',{default_duration_seconds_value:-1})).rejects.toMatchObject({code:'23514'});
 });
 it('is no-op on canonical reapply and preserves the 35 predecessor ledger entries',async()=>{
  const manifest=JSON.parse(readFileSync('database/migrations/manifest.json','utf8'));
  const before=(await sql`SELECT migration_id,filename,content_sha256,outcome FROM platform.schema_migrations ORDER BY migration_id`.execute(db)).rows;
  const result=spawnSync(process.execPath,['--experimental-strip-types','scripts/foundations/migrate.ts','apply'],{env:{...process.env,TCDX_MIGRATION_TEST_MODE:'false'},encoding:'utf8'});expect(result.status,result.stdout+result.stderr).toBe(0);
  expect((await sql`SELECT migration_id,filename,content_sha256,outcome FROM platform.schema_migrations ORDER BY migration_id`.execute(db)).rows).toEqual(before);
  expect(before.slice(0,35)).toEqual(manifest.migrations.slice(0,35).map((m:{id:string;filename:string;sha256:string})=>({migration_id:m.id,filename:m.filename,content_sha256:m.sha256,outcome:'applied'})));
 });
});
