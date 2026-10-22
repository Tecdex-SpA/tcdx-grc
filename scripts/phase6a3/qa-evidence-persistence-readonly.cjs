// QA diagnostic only: no writes, tokens, binary content or object-store operations.
const { Pool } = require('/app/apps/backend/node_modules/pg');
(async()=>{
 if(process.env.NODE_ENV!=='qa')throw Error('QA_REQUIRED');
 const pool=new Pool({host:process.env.DATABASE_HOST,port:Number(process.env.DATABASE_PORT),database:process.env.DATABASE_NAME,user:process.env.DATABASE_USER,password:process.env.DATABASE_PASSWORD,ssl:process.env.DATABASE_SSL_MODE==='disable'?false:{rejectUnauthorized:process.env.DATABASE_SSL_MODE!=='no-verify'}});
 const db=await pool.connect();
 try{
  await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const q=async(s,a=[]) => (await db.query(s,a)).rows;
  const tenant=await q('SELECT tenant_id,tenant_code FROM platform.tenants WHERE tenant_code=$1',['TECDEX']);
  if(tenant.length!==1)throw Error('TENANT_AMBIGUOUS');const tid=tenant[0].tenant_id;
  const columns=await q("SELECT table_schema,table_name,column_name FROM information_schema.columns WHERE (table_schema,table_name) IN (('evidence','evidences'),('storage','file_objects'),('storage','file_upload_intents'),('ops_audit','idempotency_records')) ORDER BY table_schema,table_name,ordinal_position");
  const evidence=await q('SELECT evidence_id,evidence_code,lifecycle_state,created_at,created_by_user_identity_id FROM evidence.evidences WHERE tenant_id=$1 ORDER BY created_at DESC',[tid]);
  const audit=await q("SELECT occurred_at,correlation_id,event_code,command_code,outcome,aggregate_type,aggregate_id,actor_user_identity_id,after_payload FROM ops_audit.audit_events WHERE correlation_id=$1 OR (tenant_id=$2 AND (event_code LIKE 'audit.evidence.%' OR command_code IN ('uploadIntentCreate','uploadFinalize','evidenceCreate'))) ORDER BY occurred_at DESC LIMIT 40",['01a154d0-bc78-7408-a08f-ab026aa4b06f',tid]);
  const rejectedAt=new Date(parseInt('01a154d0bc78',16)).toISOString();
  const subsequent=await q("SELECT count(*)::int AS successful_creations_after_rejection FROM ops_audit.audit_events WHERE tenant_id=$1 AND command_code='evidenceCreate' AND outcome='success' AND occurred_at >= $2",[tid,rejectedAt]);
  const idempotency=await q("SELECT created_at,operation_code,result_status_code,result_ref FROM ops_audit.idempotency_records WHERE tenant_id=$1 AND operation_code='evidenceCreate' AND first_seen_at >= $2 ORDER BY first_seen_at",[tid,rejectedAt]);
  const uploaded=await q("SELECT f.file_object_id,f.created_at,f.scan_status,f.size_bytes,f.source_provenance,f.created_by_user_identity_id, EXISTS(SELECT 1 FROM evidence.evidence_versions v WHERE v.tenant_id=f.tenant_id AND v.file_object_id=f.file_object_id) AS used_by_evidence FROM evidence.file_objects f WHERE f.tenant_id=$1 AND f.file_object_id=$2",[tid,'01a154d0-bb8c-7305-94e0-04279e8330b3']);
  await db.query('ROLLBACK');
  console.log(JSON.stringify({capturedAt:new Date().toISOString(),queryMode:'REPEATABLE READ READ ONLY',tenant,evidence,audit,columns,rejectedAt,subsequent,idempotency,uploaded},null,2));
 }finally{db.release();await pool.end();}
})().catch(e=>{console.error(e.code||e.message);process.exitCode=1});
