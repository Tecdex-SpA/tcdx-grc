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
  const evidence=await q('SELECT evidence_id,tenant_id,evidence_code,evidence_type,lifecycle_state,business_owner_subject_id,retention_policy_id,source_kind,valid_from,valid_to,created_at,created_by_user_identity_id,row_version FROM evidence.evidences WHERE tenant_id=$1 AND evidence_code=$2',[tid,'QA_EVID_RET_001']);
  const evidenceIds=evidence.map(e=>e.evidence_id);
  const versions=await q('SELECT to_jsonb(v) AS row FROM evidence.evidence_versions v WHERE evidence_id=ANY($1::uuid[]) ORDER BY version_number',[evidenceIds]);
  const vids=versions.map(x=>x.row.evidence_version_id);const docIds=versions.map(x=>x.row.document_version_id).filter(Boolean);
  const documentVersions=docIds.length?await q('SELECT to_jsonb(d) AS row FROM evidence.document_versions d WHERE document_version_id=ANY($1::uuid[])',[docIds]):[];
  const fileIds=[...new Set([...versions.map(x=>x.row.file_object_id),...documentVersions.map(x=>x.row.file_object_id)].filter(Boolean))];
  const files=await q('SELECT file_object_id,tenant_id,original_filename,declared_mime,detected_mime,size_bytes,sha256,classification,scan_status,scan_completed_at,retention_policy_id,retention_policy_applicability_id,source_provenance,created_by_user_identity_id,created_at FROM evidence.file_objects WHERE file_object_id=ANY($1::uuid[])',[fileIds]);
  const links=await q('SELECT to_jsonb(l) AS row FROM evidence.evidence_links l WHERE evidence_version_id=ANY($1::uuid[])',[vids]);
  const controlIds=links.map(x=>x.row.control_id).filter(Boolean);
  const controls=await q('SELECT control_id,tenant_id,ownership_class,control_code,name,lifecycle_state FROM controls.controls WHERE control_id=ANY($1::uuid[])',[controlIds]);
  const policyIds=[...new Set([...evidence.map(e=>e.retention_policy_id),...files.map(f=>f.retention_policy_id)].filter(Boolean))];
  const policies=await q('SELECT to_jsonb(p) AS row FROM privacy.retention_policies p WHERE retention_policy_id=ANY($1::uuid[])',[policyIds]);
  const appIds=[...new Set([...versions.map(x=>x.row.retention_policy_applicability_id),...files.map(f=>f.retention_policy_applicability_id)].filter(Boolean))];
  const applicabilities=await q('SELECT to_jsonb(a) AS row FROM privacy.retention_policy_applicabilities a WHERE retention_policy_applicability_id=ANY($1::uuid[])',[appIds]);
  const subjects=await q('SELECT subject_id,tenant_id,display_name,lifecycle_state FROM org.subjects WHERE subject_id=ANY($1::uuid[])',[evidence.map(e=>e.business_owner_subject_id).filter(Boolean)]);
  const ids=[...evidenceIds,...vids,...fileIds,...controlIds,...appIds,...policyIds];
  const audit=await q('SELECT occurred_at,tenant_id,correlation_id,event_code,command_code,outcome,aggregate_type,aggregate_id,actor_user_identity_id,after_payload FROM ops_audit.audit_events WHERE tenant_id=$1 AND aggregate_id::text=ANY($2::text[]) ORDER BY occurred_at',[tid,ids]);
  await db.query('ROLLBACK');
  console.log(JSON.stringify({capturedAt:new Date().toISOString(),queryMode:'REPEATABLE READ READ ONLY',tenant,evidence,versions,documentVersions,files,links,controls,policies,applicabilities,subjects,audit},null,2));
 }finally{db.release();await pool.end();}
})().catch(e=>{console.error(e.code||e.message);process.exitCode=1});
