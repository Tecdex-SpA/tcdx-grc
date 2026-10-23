import pg from 'pg';
import {readFile} from 'node:fs/promises';
import {newUuidV7} from '../../apps/backend/dist/uuid.js';
import {loadCatalogV11,materializeCatalogV11} from '../../apps/backend/dist/regulatory/catalog-v1.1.js';

// Test preparation only: approved publication SQL, synthetic principal, no M2M
// token/provider or operational QA receipt is manufactured by this fixture.
if(process.env.DATABASE_HOST!=='127.0.0.1'||process.env.DATABASE_PORT!=='55432'
 ||process.env.TCDX_ISOLATED_REBUILD!=='true'
 ||!process.env.TCDX_RUNTIME_TEST_CLUSTER?.startsWith('/private/tmp/tcdx-runtime-postgres.'))throw Error('TASK_OWNED_CLUSTER_REQUIRED');
const client=new pg.Client({host:'127.0.0.1',port:55432,database:'tcdx-grc',user:process.env.DATABASE_USER,ssl:false});
await client.connect();
try{
 const own=(await client.query("SELECT current_setting('data_directory') AS directory,current_setting('server_version_num')::int/10000 AS major")).rows[0];
 if(own.directory!==process.env.TCDX_RUNTIME_TEST_CLUSTER||own.major!==16)throw Error('TASK_OWNED_PG16_REQUIRED');
 await client.query('BEGIN');
 const id=newUuidV7();
 await client.query("INSERT INTO iam.service_principals(service_principal_id,ownership_class,principal_code,display_name,principal_kind,lifecycle_state) VALUES($1::uuid,'PLATFORM_CONTROL',$1::text,'Synthetic local fixture only','integration','active')",[id]);
 await client.query("SELECT set_config('tcdx.publication_service_principal_id',$1,true)",[id]);
 for(const path of ['20261009000300_phase6a3_role_permission_publication.sql','20261009000400_phase6a3_rbac_resolution.sql']){
  await client.query(await readFile(new URL('../../docs/phase6a/STEP_6A3/rbac-publication/'+path,import.meta.url),'utf8'));
 }
 await client.query('COMMIT');
 const importer=newUuidV7();
 await client.query("INSERT INTO iam.user_identities(user_identity_id,identity_key,display_name,lifecycle_state) VALUES($1::uuid,$1::text,'Synthetic local catalog importer','active')",[importer]);
 await materializeCatalogV11(client,loadCatalogV11('data/regulatory/catalogs/tcdx-unified-compliance-control-catalog/v1.1'),importer);
 process.stdout.write('SYNTHETIC_LOCAL_REFERENCE_PUBLICATION=PREPARED_NOT_QA_EVIDENCE\n');
 process.stdout.write('CATALOG_V11=REUSED_EXISTING_DRAFT_TEST_DATA_NOT_OFFICIAL_CONTENT\n');
}catch(error){await client.query('ROLLBACK');throw error;}
finally{await client.end();}
