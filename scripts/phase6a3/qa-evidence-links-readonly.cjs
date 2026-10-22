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
  const targets={};
  for(const [name,table] of Object.entries({controls:'controls.controls',control_assessments:'controls.control_assessments',assurance_tests:'controls.assurance_tests',requirement_assessments:'regulatory.requirement_assessments',requirement_applicabilities:'regulatory.requirement_applicabilities'})) {
    targets[name]=await q('SELECT to_jsonb(t) AS row FROM '+table+' t WHERE tenant_id=$1 LIMIT 30',[tid]);
  }
  const files=await q("SELECT f.file_object_id,f.scan_status,f.created_at,f.created_by_user_identity_id,f.retention_policy_id,a.retention_policy_applicability_id,a.lifecycle_state AS applicability_state,a.classification,EXISTS(SELECT 1 FROM evidence.evidence_versions v WHERE v.tenant_id=f.tenant_id AND v.file_object_id=f.file_object_id) AS used_by_evidence FROM evidence.file_objects f LEFT JOIN privacy.retention_policy_applicabilities a ON a.tenant_id=f.tenant_id AND a.retention_policy_applicability_id=f.retention_policy_applicability_id WHERE f.tenant_id=$1 ORDER BY f.created_at DESC LIMIT 5",[tid]);
  const audit=await q("SELECT occurred_at,correlation_id,command_code,outcome,actor_user_identity_id,after_payload FROM ops_audit.audit_events WHERE tenant_id=$1 AND command_code='evidenceCreate' ORDER BY occurred_at DESC LIMIT 5",[tid]);
  const catalog=await q("SELECT table_schema,table_name,column_name FROM information_schema.columns WHERE table_schema='iam' AND table_name IN ('role_assignments','tenant_memberships','user_identities','roles') ORDER BY table_name,ordinal_position");
  const actorRoles=await q("SELECT u.user_identity_id,u.display_name,m.membership_state,r.role_code,mr.scope_kind FROM iam.user_identities u JOIN iam.tenant_memberships m ON m.user_identity_id=u.user_identity_id JOIN iam.membership_roles mr ON mr.tenant_id=m.tenant_id AND mr.tenant_membership_id=m.tenant_membership_id JOIN iam.roles r ON r.role_id=mr.role_id WHERE m.tenant_id=$1 AND u.user_identity_id=$2 AND mr.valid_from<=statement_timestamp() AND (mr.valid_to IS NULL OR mr.valid_to>statement_timestamp())",[tid,files[0].created_by_user_identity_id]);
  const readerPermissions=await q("SELECT DISTINCT p.permission_code,mr.scope_kind FROM iam.tenant_memberships m JOIN iam.membership_roles mr ON mr.tenant_id=m.tenant_id AND mr.tenant_membership_id=m.tenant_membership_id JOIN iam.roles r ON r.role_id=mr.role_id JOIN iam.role_permissions rp ON rp.role_id=r.role_id JOIN iam.permissions p ON p.permission_id=rp.permission_id WHERE m.tenant_id=$1 AND m.user_identity_id=$2 AND mr.valid_from<=statement_timestamp() AND (mr.valid_to IS NULL OR mr.valid_to>statement_timestamp()) AND p.permission_code IN ('controls.control.read','controls.control_assessment.read','controls.assurance_test.read','compliance.requirement_assessment.read')",[tid,files[0].created_by_user_identity_id]);
  await db.query('ROLLBACK');
  console.log(JSON.stringify({capturedAt:new Date().toISOString(),queryMode:'REPEATABLE READ READ ONLY',tenant,targets,files,audit,catalog,actorRoles,readerPermissions},null,2));
 }finally{db.release();await pool.end();}
})().catch(e=>{console.error(e.code||e.message);process.exitCode=1});
