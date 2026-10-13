import pg from 'pg';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {newUuidV7} from './apps/backend/dist/uuid.js';
import {loadCatalogV11,materializeCatalogV11} from './apps/backend/dist/regulatory/catalog-v1.1.js';
const c=new pg.Client({host:'127.0.0.1',port:55432,user:'postgres',database:'tcdx-grc'});
await c.connect();
try {
 assert.equal((await c.query('SELECT system_identifier::text FROM pg_control_system()')).rows[0].system_identifier,process.env.TCDX_STEP6A3_PG_SYSTEM_IDENTIFIER);
 assert.equal(process.env.TCDX_ISOLATED_REBUILD,'true');
 const actor=newUuidV7();
 await c.query("INSERT INTO iam.user_identities(user_identity_id,identity_key,display_name,lifecycle_state) VALUES($1,$2,$3,'active')",[actor,'discardable-r6-catalog:'+actor,'Discardable R6 catalog fixture']);
 const catalog=loadCatalogV11('data/regulatory/catalogs/tcdx-unified-compliance-control-catalog/v1.1');
 const imported=await materializeCatalogV11(c,catalog,actor);
 await c.query('BEGIN');
 const sp=newUuidV7();
 await c.query("INSERT INTO iam.service_principals(service_principal_id,ownership_class,tenant_id,principal_code,display_name,principal_kind,lifecycle_state) VALUES($1,'PLATFORM_CONTROL',NULL,$2,'R6 disposable test publisher','internal_service','active')",[sp,'LOCAL_DISPOSABLE_R6_'+sp]);
 await c.query("SELECT set_config('tcdx.publication_service_principal_id',$1,true)",[sp]);
 await c.query(readFileSync('docs/phase6a/STEP_6A3/rbac-publication/20261009000300_phase6a3_role_permission_publication.sql','utf8'));
 const n=(await c.query("SELECT count(*)::int AS n FROM ops_audit.audit_events WHERE event_code='audit.iam.role_permission.publish.v1' AND tenant_id IS NULL")).rows[0].n;
 assert.equal(n,44);await c.query('COMMIT');
 console.log(JSON.stringify({scope:'OWN_DISPOSABLE_TEST_FIXTURES_ONLY',catalog:'EXISTING_V11_SOURCE_NOT_RESERVED_ZIP',imported,publication_audits:n,actor:'TEST_ONLY_NOT_REAL_IAM',ledger33:'NOT_ACTIVE_NOT_INSERTED',resource_system_identifier:process.env.TCDX_STEP6A3_PG_SYSTEM_IDENTIFIER}));
} catch(e) {await c.query('ROLLBACK');throw e;}finally{await c.end();}
