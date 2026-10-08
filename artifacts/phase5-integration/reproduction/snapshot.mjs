import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from '/Users/andresbarouh/repos/tcdx-grc/node_modules/pg/lib/index.js';
const root='/Users/andresbarouh/repos/tcdx-grc';
const manifest=JSON.parse(fs.readFileSync(root+'/database/migrations/manifest.json'));
const controlled=[...new Set(JSON.parse(fs.readFileSync(root+'/database/expected-schema.json')).tables.map(t=>t.name.split('.')[0]))];
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const phase=process.argv[2];
if(!['before','after','preapply','postapply','postdeploy'].includes(phase))throw Error('PHASE_INVALID');
if(process.env.DATABASE_HOST!=='192.168.2.40'||process.env.DATABASE_NAME!=='tcdx-grc')throw Error('TARGET_BLOCKED');
const c=new pg.Client({host:process.env.DATABASE_HOST,port:Number(process.env.DATABASE_PORT),database:process.env.DATABASE_NAME,user:process.env.DATABASE_USER,password:process.env.DATABASE_PASSWORD,ssl:process.env.DATABASE_SSL_MODE==='disable'?false:{rejectUnauthorized:process.env.DATABASE_SSL_MODE!=='no-verify'},connectionTimeoutMillis:6000,query_timeout:30000});
try {
 await c.connect();await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 const q=async(s,a=[]) => (await c.query(s,a)).rows;
 const identity=(await q("SELECT current_database() AS database,current_setting('server_version_num')::int/10000 AS major,current_setting('transaction_read_only') AS read_only,inet_server_addr()::text AS server"))[0];
 const ledger=await q('SELECT migration_id,filename,content_sha256,transactional,outcome FROM platform.schema_migrations ORDER BY migration_id');
 const tables=await q('SELECT schemaname,tablename FROM pg_tables WHERE schemaname=ANY($1) ORDER BY 1,2',[controlled]);
 const permission=await q("SELECT permission_code,domain_code,resource_code,action_code,lifecycle_state FROM iam.permissions WHERE permission_code='platform.user_identity.read'");
 const published=(await q("SELECT count(*)::int AS n FROM iam.permissions WHERE lifecycle_state='published'"))[0].n;
 const roles=await q("SELECT role_code,is_baseline,ownership_class,tenant_id IS NULL AS tenant_null,lifecycle_state,count(*)::int AS n FROM iam.roles WHERE role_code IN ('PLATFORM_ADMIN','TENANT_ADMIN') GROUP BY 1,2,3,4,5 ORDER BY 1,3,4,5");
 const canonical=`r.is_baseline AND r.lifecycle_state='published' AND rp.ownership_class=r.ownership_class AND rp.tenant_id IS NOT DISTINCT FROM r.tenant_id AND ((r.role_code IN ('PLATFORM_ADMIN','TENANT_ADMIN') AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL) OR (r.role_code='TENANT_ADMIN' AND r.ownership_class='TENANT_OWNED' AND r.tenant_id IS NOT NULL))`;
 const grants=await q(`SELECT r.role_code,r.is_baseline,r.ownership_class,r.tenant_id IS NULL AS tenant_null,r.lifecycle_state,rp.ownership_class AS grant_ownership,rp.tenant_id IS NOT DISTINCT FROM r.tenant_id AS same_tenant,(${canonical}) AS canonical,count(*)::int AS n FROM iam.role_permissions rp JOIN iam.permissions p USING(permission_id) JOIN iam.roles r USING(role_id) WHERE p.permission_code='platform.user_identity.read' GROUP BY 1,2,3,4,5,6,7,8 ORDER BY 1,3,4`);
 const instanceMatch=(await q("SELECT count(*)::int AS expected,count(*) FILTER(WHERE (SELECT count(*) FROM iam.role_permissions rp JOIN iam.permissions p USING(permission_id) WHERE rp.role_id=r.role_id AND rp.ownership_class=r.ownership_class AND rp.tenant_id=r.tenant_id AND p.permission_code='platform.user_identity.read')=1)::int AS actual FROM iam.roles r WHERE r.role_code='TENANT_ADMIN' AND r.is_baseline AND r.lifecycle_state='published' AND r.ownership_class='TENANT_OWNED' AND r.tenant_id IS NOT NULL"))[0];
 const priorPermission=await q("SELECT permission_code,domain_code,resource_code,action_code,lifecycle_state FROM iam.permissions WHERE permission_code='platform.role.administer'");
 const priorGrants=await q("SELECT r.role_code,r.is_baseline,r.ownership_class,r.tenant_id IS NULL AS tenant_null,r.lifecycle_state,rp.ownership_class AS grant_ownership,rp.tenant_id IS NULL AS grant_tenant_null,count(*)::int AS n FROM iam.role_permissions rp JOIN iam.permissions p USING(permission_id) JOIN iam.roles r USING(role_id) WHERE p.permission_code='platform.role.administer' GROUP BY 1,2,3,4,5,6,7 ORDER BY 1,3");
 const newPermission=await q("SELECT permission_id,permission_code,domain_code,resource_code,action_code,lifecycle_state FROM iam.permissions WHERE permission_code='platform.tenant_user.onboard'");
 const newGrants=await q("SELECT rp.role_permission_id,rp.ownership_class,rp.tenant_id,r.role_id,r.role_code,r.is_baseline,r.lifecycle_state,r.ownership_class AS role_ownership,r.tenant_id AS role_tenant FROM iam.role_permissions rp JOIN iam.permissions p USING(permission_id) JOIN iam.roles r USING(role_id) WHERE p.permission_code='platform.tenant_user.onboard' ORDER BY rp.role_permission_id");
 const acme=await q("SELECT t.tenant_code,t.lifecycle_state,(SELECT count(*)::int FROM iam.roles r WHERE r.tenant_id=t.tenant_id) AS roles,(SELECT count(*)::int FROM iam.tenant_memberships m WHERE m.tenant_id=t.tenant_id) AS memberships,(SELECT count(*)::int FROM platform.subscriptions s WHERE s.tenant_id=t.tenant_id) AS subscriptions,(SELECT count(*)::int FROM iam.membership_roles mr JOIN iam.tenant_memberships m USING(tenant_membership_id) JOIN iam.roles r ON r.role_id=mr.role_id WHERE m.tenant_id=t.tenant_id AND m.membership_state='active' AND (m.ended_at IS NULL OR m.ended_at>transaction_timestamp()) AND mr.tenant_id=t.tenant_id AND r.role_code='TENANT_ADMIN' AND r.is_baseline AND r.lifecycle_state='published' AND r.ownership_class='TENANT_OWNED' AND r.tenant_id=t.tenant_id AND mr.valid_from<=transaction_timestamp() AND (mr.valid_to IS NULL OR mr.valid_to>transaction_timestamp())) AS active_initial_admins FROM platform.tenants t WHERE t.tenant_code='ACME-1'");
 const structural={};
 const queries={
  schemas:"SELECT nspname,pg_get_userbyid(nspowner) AS owner,nspacl::text FROM pg_namespace WHERE nspname !~ '^pg_' AND nspname<>'information_schema' ORDER BY 1",
  relations:"SELECT n.nspname,c.relname,c.relkind,c.relpersistence,pg_get_userbyid(c.relowner) AS owner,c.reloptions,c.relrowsecurity,c.relforcerowsecurity,c.relreplident,c.relacl::text,CASE WHEN c.relkind='p' THEN pg_get_partkeydef(c.oid) END AS partition_key,CASE WHEN c.relispartition THEN pg_get_expr(c.relpartbound,c.oid) END AS partition_bound FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' ORDER BY 1,2",
  columns:"SELECT n.nspname,c.relname,a.attnum,a.attname,format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull,a.attidentity,a.attgenerated,a.attisdropped,a.attstorage,a.attcompression,pg_get_expr(d.adbin,d.adrelid) AS default_value,coll.collname,a.attacl::text FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum LEFT JOIN pg_collation coll ON coll.oid=a.attcollation WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND a.attnum>0 ORDER BY 1,2,3",
  constraints:"SELECT n.nspname,c.relname,con.conname,con.contype,pg_get_constraintdef(con.oid,true) AS definition,con.convalidated,con.condeferrable,con.condeferred FROM pg_constraint con JOIN pg_namespace n ON n.oid=con.connamespace LEFT JOIN pg_class c ON c.oid=con.conrelid WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' ORDER BY 1,2,3",
  indexes:"SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname !~ '^pg_' AND schemaname<>'information_schema' ORDER BY 1,2,3",
  sequences:"SELECT schemaname,sequencename,sequenceowner,data_type,start_value,min_value,max_value,increment_by,cycle,cache_size FROM pg_sequences WHERE schemaname !~ '^pg_' AND schemaname<>'information_schema' ORDER BY 1,2",
  functions:"SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,p.prokind,p.provolatile,p.proparallel,p.prosecdef,p.proconfig,p.proacl::text,md5(pg_get_functiondef(p.oid)) AS definition_md5 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND p.prokind<>'a' ORDER BY 1,2,3",
  triggers:"SELECT n.nspname,c.relname,t.tgname,t.tgenabled,t.tgisinternal,pg_get_triggerdef(t.oid,true) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' ORDER BY 1,2,3",
  views:"SELECT schemaname,viewname,md5(definition) AS definition_md5 FROM pg_views WHERE schemaname !~ '^pg_' AND schemaname<>'information_schema' ORDER BY 1,2",
  policies:"SELECT * FROM pg_policies WHERE schemaname !~ '^pg_' ORDER BY schemaname,tablename,policyname",
  types:"SELECT n.nspname,t.typname,t.typtype,t.typcategory,t.typnotnull,format_type(t.typbasetype,t.typtypmod) AS base,t.typdefault,t.typacl::text FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' ORDER BY 1,2",
  enums:"SELECT n.nspname,t.typname,e.enumsortorder,e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname !~ '^pg_' ORDER BY 1,2,3"
 };
 for(const [name,sql] of Object.entries(queries)){const rows=await q(sql);structural[name]={rows:rows.length,sha256:hash(rows)};}
 // GRC excludes credentials by contract. Additional exclusions avoid hashing tokens,
 // identity mappings, idempotency material or payloads in preservation evidence.
 const columns=await q('SELECT table_schema,table_name,column_name FROM information_schema.columns WHERE table_schema=ANY($1)',[controlled]);
 const data={},baseData={};
 for(const t of tables){
  const name=t.schemaname+'.'+t.tablename;
  if(name==='platform.schema_migrations')continue;
  const exclude=columns.filter(x=>x.table_schema===t.schemaname&&x.table_name===t.tablename&&/password|secret|token|credential|identity_key|request_hash|response_hash|idempotency_key|payload|nonce|verifier|session/i.test(x.column_name)).map(x=>x.column_name);
  const quote=x=>'"'+x.replaceAll('"','""')+'"';
  let where='';


  data[name]=(await q(`SELECT count(*)::int AS rows,md5(coalesce(string_agg(md5((to_jsonb(t)-$1::text[])::text),'' ORDER BY md5((to_jsonb(t)-$1::text[])::text)),'')) AS nonsecret_fingerprint FROM ${quote(t.schemaname)}.${quote(t.tablename)} t${where}`,[exclude]))[0];
  const baseWhere=name==='iam.permissions'?" WHERE t.permission_code<>'platform.tenant_user.onboard'":name==='iam.role_permissions'?" WHERE t.permission_id NOT IN(SELECT permission_id FROM iam.permissions WHERE permission_code='platform.tenant_user.onboard')":'';
  baseData[name]=baseWhere?(await q(`SELECT count(*)::int AS rows,md5(coalesce(string_agg(md5((to_jsonb(t)-$1::text[])::text),'' ORDER BY md5((to_jsonb(t)-$1::text[])::text)),'')) AS nonsecret_fingerprint FROM ${quote(t.schemaname)}.${quote(t.tablename)} t${baseWhere}`,[exclude]))[0]:data[name];
 }
 const valid=ledger.every((r,i)=>{const m=manifest.migrations[i];return m&&m.id===r.migration_id&&m.filename===r.filename&&m.sha256===r.content_sha256&&m.transactional===r.transactional&&r.outcome==='applied';});
 const result={phase,capturedAt:new Date().toISOString(),identity,migrations:ledger.length,latest:ledger.at(-1)?.migration_id,physicalTables:tables.filter(t=>t.schemaname+'.'+t.tablename!=='platform.schema_migrations').length,publishedPermissions:published,ledgerMatchesManifest:valid,pendingIds:manifest.migrations.filter(m=>!ledger.some(r=>r.migration_id===m.id)).map(m=>m.id),newPermission,newGrants,permission,roles,grants,instanceMatch,priorPermission,priorGrants,acme,schema:structural,schemaSha256:hash(structural),preservedBaseData:baseData,preservedData:data,ledger};
 await c.query('ROLLBACK');
 fs.writeFileSync('/tmp/tcdx-grc-phase5-integration-qa-'+phase+'.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({...result,schema:'CAPTURED_ALL_COMPONENTS_IN_FILE',preservedBaseData:'NONSECRET_BASE_PRESERVATION_IN_FILE',preservedData:'NONSECRET_PRESERVATION_IN_FILE',ledger:'VERIFIED_IN_FILE'},null,2));
}catch(e){console.log(JSON.stringify({result:'BLOCKED',safeErrorClass:e.code??e.constructor.name}));process.exitCode=1;}finally{await c.end().catch(()=>{});}
