import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createDatabase,sql} from '../database.js';
import {loadConfig} from '../config.js';
import {newUuidV7} from '../uuid.js';

/** Relocated historical checks use actual predecessor schemas. No forged ledger or disabled constraints. */
describe.skipIf(process.env.TCDX_HISTORICAL_PERMISSION_PUBLICATION!=='true')('historical permission publication on exact task-owned predecessors',()=>{
 const cases=[{n:27,code:'platform.role.administer',file:'20261006000100_platform_role_administration_permission_publication.sql',permissions:168},{n:28,code:'platform.user_identity.read',file:'20261006000200_user_identity_discovery_permission_publication.sql',permissions:169},{n:29,code:'platform.tenant_user.onboard',file:'20261007000100_platform_tenant_user_onboarding_permission_publication.sql',permissions:170}];
 for(const test of cases)it.skipIf(process.env.TCDX_HISTORICAL_PERMISSION_TARGET!==String(test.n))(`${test.code}: exact DATA-ONLY publication and zero schema delta`,async()=>{
  if(process.env.DATABASE_HOST!=='127.0.0.1'||process.env.DATABASE_PORT!=='55432'||process.env.TCDX_ISOLATED_REBUILD!=='true'||!process.env.TCDX_RUNTIME_TEST_CLUSTER?.startsWith('/private/tmp/tcdx-runtime-postgres.'))throw Error('ATTESTED_LOCAL_PREDECESSOR_REQUIRED');
  const db=createDatabase(loadConfig(process.env)),rollback=Symbol('historical publication rollback');
  try{await db.transaction().execute(async tx=>{
   const directory=(await sql<{directory:string}>`SELECT current_setting('data_directory') AS directory`.execute(tx)).rows[0]!.directory;expect(directory).toBe(process.env.TCDX_RUNTIME_TEST_CLUSTER);
   const manifest=JSON.parse(readFileSync('database/migrations/manifest.json','utf8')).migrations.slice(0,test.n-1);
   const ledger=(await sql<{migration_id:string;content_sha256:string}>`SELECT migration_id,content_sha256 FROM platform.schema_migrations ORDER BY migration_id`.execute(tx)).rows;expect(ledger).toEqual(manifest.map((m:{id:string;sha256:string})=>({migration_id:m.id,content_sha256:m.sha256})));
   const tenant=newUuidV7(),role=newUuidV7();await sql`INSERT INTO platform.tenants(tenant_id,tenant_code,legal_name,display_name,default_timezone) VALUES(${tenant}::uuid,${tenant},'Synthetic predecessor tenant','Synthetic predecessor tenant','UTC')`.execute(tx);
   await sql`INSERT INTO iam.roles(role_id,ownership_class,tenant_id,role_code,name,is_baseline,lifecycle_state) VALUES(${role}::uuid,'TENANT_OWNED',${tenant}::uuid,'TENANT_ADMIN','Synthetic canonical role',TRUE,'published')`.execute(tx);
   const structure=async()=>(await sql`SELECT n.nspname,c.relname,c.relkind,a.attname,a.atttypid,a.attnotnull,a.attnum,pg_get_expr(d.adbin,d.adrelid) AS default_expression FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' ORDER BY n.nspname,c.relname,a.attnum`.execute(tx)).rows;
   const before=await structure();await sql.raw(readFileSync('database/migrations/'+test.file,'utf8')).execute(tx);expect(await structure()).toEqual(before);
   expect((await sql<{n:number}>`SELECT count(*)::int AS n FROM iam.permissions WHERE lifecycle_state='published'`.execute(tx)).rows[0]!.n).toBe(test.permissions);
   const grants=(await sql<{role_code:string;ownership_class:string;tenant_id:string|null}>`SELECT r.role_code,r.ownership_class,r.tenant_id FROM iam.role_permissions rp JOIN iam.roles r USING(role_id) JOIN iam.permissions p USING(permission_id) WHERE p.permission_code=${test.code} ORDER BY r.role_code,r.ownership_class`.execute(tx)).rows;
   const expected:Array<{role_code:string;ownership_class:string;tenant_id:string|null}>=[{role_code:'PLATFORM_ADMIN',ownership_class:'PLATFORM_CONTROL',tenant_id:null}];if(test.n===28)expected.push({role_code:'TENANT_ADMIN',ownership_class:'PLATFORM_CONTROL',tenant_id:null},{role_code:'TENANT_ADMIN',ownership_class:'TENANT_OWNED',tenant_id:tenant});expect(grants).toEqual(expected);
   expect((await sql<{n:number}>`SELECT count(*)::int AS n FROM platform.schema_migrations`.execute(tx)).rows[0]!.n).toBe(test.n-1);throw rollback;
  }).catch(error=>{if(error!==rollback)throw error;});}finally{await db.destroy();}
 });
});
