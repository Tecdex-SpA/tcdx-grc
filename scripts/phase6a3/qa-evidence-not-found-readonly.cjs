// QA diagnostic only: no writes, tokens, binary content or object-store operations.
const { Pool } = require('/app/apps/backend/node_modules/pg');
(async()=>{
 if(process.env.NODE_ENV!=='qa')throw Error('QA_REQUIRED');
 const pool=new Pool({host:process.env.DATABASE_HOST,port:Number(process.env.DATABASE_PORT),database:process.env.DATABASE_NAME,user:process.env.DATABASE_USER,password:process.env.DATABASE_PASSWORD,ssl:process.env.DATABASE_SSL_MODE==='disable'?false:{rejectUnauthorized:process.env.DATABASE_SSL_MODE!=='no-verify'}});
 const db=await pool.connect();
 try{
  await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const q=async(s,a=[]) => (await db.query(s,a)).rows;
  const correlation='01a1551c-ffb1-7588-99c4-452ff359cb6e';
  const controlId='01a0ea93-d21e-76d9-a73d-8494499a2398';
  const tenant=await q('SELECT tenant_id,tenant_code FROM platform.tenants WHERE tenant_code=$1',['TECDEX']);
  if(tenant.length!==1)throw Error('TENANT_AMBIGUOUS');const tid=tenant[0].tenant_id;
  const audit=await q('SELECT occurred_at,correlation_id,event_code,command_code,outcome,actor_user_identity_id,before_payload,after_payload FROM ops_audit.audit_events WHERE correlation_id=$1',[correlation]);
  const controls=await q('SELECT control_id,tenant_id,ownership_class,control_code,name,lifecycle_state,based_on_control_version_id FROM controls.controls WHERE control_id=$1 OR tenant_id=$2',[controlId,tid]);
  const controlVersions=await q('SELECT control_version_id,control_id,tenant_id,lifecycle_state FROM controls.control_versions WHERE control_id=$1 OR tenant_id=$2',[controlId,tid]);
  const files=await q("SELECT f.file_object_id,f.created_at,f.original_filename,f.scan_status,f.size_bytes,f.source_provenance,f.created_by_user_identity_id,f.retention_policy_id,f.retention_policy_applicability_id,a.lifecycle_state AS applicability_state,EXISTS(SELECT 1 FROM evidence.evidence_versions v WHERE v.tenant_id=f.tenant_id AND v.file_object_id=f.file_object_id) AS used_by_evidence FROM evidence.file_objects f LEFT JOIN privacy.retention_policy_applicabilities a ON a.tenant_id=f.tenant_id AND a.retention_policy_applicability_id=f.retention_policy_applicability_id WHERE f.tenant_id=$1 ORDER BY f.created_at DESC LIMIT 8",[tid]);
  const policy=await q('SELECT retention_policy_id,tenant_id,policy_code,lifecycle_state FROM privacy.retention_policies WHERE retention_policy_id=ANY($1::uuid[])',[files.map(f=>f.retention_policy_id)]);
  const failedIdempotency=await q("SELECT operation_code,result_status_code,result_ref FROM ops_audit.idempotency_records WHERE tenant_id=$1 AND operation_code='evidenceCreate' ORDER BY first_seen_at DESC LIMIT 5",[tid]);
  await db.query('ROLLBACK');
  console.log(JSON.stringify({capturedAt:new Date().toISOString(),queryMode:'REPEATABLE READ READ ONLY',correlation,tenant,audit,controls,controlVersions,files,policy,failedIdempotency},null,2));
 }finally{db.release();await pool.end();}
})().catch(e=>{console.error(e.code||e.message);process.exitCode=1});
