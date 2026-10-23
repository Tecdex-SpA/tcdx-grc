import {createRequire} from 'node:module';
const req=createRequire(new URL('../../apps/backend/package.json',import.meta.url));
const {Kysely,PostgresDialect,sql,CompiledQuery}=await import(req.resolve('kysely'));
import pg from 'pg';
import {readFile} from 'node:fs/promises';
import {newUuidV7} from '../../apps/backend/dist/uuid.js';
import {prepareLibraryPublication,publishLibraryOperationalData} from '../../apps/backend/dist/security/normative-library-publication.js';
if(process.env.DATABASE_HOST!=='127.0.0.1'||process.env.DATABASE_PORT!=='55561'||process.env.TCDX_ISOLATED_REBUILD!=='true'||!process.env.TCDX_RUNTIME_BINDINGS_TEST_CLUSTER?.startsWith('/private/tmp/tcdx-runtime-bindings.'))throw Error('TASK_OWNED_BINDING_CLUSTER_REQUIRED');
const db=new Kysely({dialect:new PostgresDialect({pool:new pg.Pool({host:'127.0.0.1',port:55561,database:'tcdx-grc',user:process.env.DATABASE_USER,ssl:false})})});
try{
 const own=(await sql`SELECT current_setting('data_directory') AS directory,current_setting('server_version_num')::int/10000 AS major`.execute(db)).rows[0];
 if(own.directory!==process.env.TCDX_RUNTIME_BINDINGS_TEST_CLUSTER||own.major!==16)throw Error('LOCAL_PG16_ATTESTATION_REQUIRED');
 const publication=await prepareLibraryPublication(process.cwd(),{tenantIds:[],effectiveFrom:new Date(Date.now()-3600000).toISOString(),effectiveTo:new Date(Date.now()+86400000).toISOString()});
 const principal=newUuidV7();
 await db.transaction().execute(async tx=>{
  await sql`INSERT INTO iam.service_principals(service_principal_id,ownership_class,principal_code,display_name,principal_kind,lifecycle_state) VALUES(${principal}::uuid,'PLATFORM_CONTROL',${principal},'Synthetic local predecessor only','integration','active')`.execute(tx);
  await sql`SELECT set_config('tcdx.publication_service_principal_id',${principal},true)`.execute(tx);
  for(const file of ['20261009000300_phase6a3_role_permission_publication.sql','20261009000400_phase6a3_rbac_resolution.sql'])await tx.executeQuery(CompiledQuery.raw(await readFile(new URL('../../docs/phase6a/STEP_6A3/rbac-publication/'+file,import.meta.url),'utf8')));
  await publishLibraryOperationalData(tx,principal,newUuidV7(),publication);
 });
 process.stdout.write('PREDECESSOR_LIBRARY_PUBLICATION=LOCAL_SYNTHETIC_ONLY\n');
}finally{await db.destroy();}
