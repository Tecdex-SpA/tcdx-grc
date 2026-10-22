// Diagnostic only, following the documented STEP6A3 backend-container READ ONLY method.
// No authentication secrets, personal names, emails, file content or business descriptions returned.
const {Pool}=require('/app/apps/backend/node_modules/pg');
const {createHash}=require('node:crypto');
(async()=>{
 if(process.env.NODE_ENV!=='qa')throw Error('QA_REQUIRED');
 const pool=new Pool({host:process.env.DATABASE_HOST,port:Number(process.env.DATABASE_PORT),database:process.env.DATABASE_NAME,user:process.env.DATABASE_USER,password:process.env.DATABASE_PASSWORD,ssl:process.env.DATABASE_SSL_MODE==='disable'?false:{rejectUnauthorized:process.env.DATABASE_SSL_MODE!=='no-verify'}});
 const db=await pool.connect();
 try{
  await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  await db.query("SET LOCAL statement_timeout = '15s'");
  const q=async(s,p=[]) => (await db.query(s,p)).rows;
  const mode=await q('SHOW transaction_read_only');if(mode[0].transaction_read_only!=='on')throw Error('READ_ONLY_REQUIRED');
  const tenant=await q("SELECT tenant_id,tenant_code,lifecycle_state FROM platform.tenants WHERE tenant_code=$1",['TECDEX']);if(tenant.length!==1)throw Error('TENANT_AMBIGUOUS');const tid=tenant[0].tenant_id;
  const actors=await q(`SELECT DISTINCT u.user_identity_id,m.tenant_membership_id,m.membership_state,r.role_code,p.permission_code,mr.scope_kind
   FROM iam.tenant_memberships m JOIN iam.user_identities u ON u.user_identity_id=m.user_identity_id
   JOIN iam.membership_roles mr ON mr.tenant_membership_id=m.tenant_membership_id AND mr.tenant_id=m.tenant_id
   JOIN iam.roles r ON r.role_id=mr.role_id AND r.tenant_id=mr.tenant_id AND r.ownership_class='TENANT_OWNED'
   JOIN iam.role_permissions rp ON rp.role_id=r.role_id AND rp.tenant_id=mr.tenant_id AND rp.ownership_class='TENANT_OWNED'
   JOIN iam.permissions p ON p.permission_id=rp.permission_id AND p.lifecycle_state='published'
   WHERE m.tenant_id=$1 AND m.membership_state='active' AND (m.ended_at IS NULL OR m.ended_at>CURRENT_TIMESTAMP)
   AND u.lifecycle_state='active' AND r.lifecycle_state='published' AND mr.valid_from<=CURRENT_TIMESTAMP AND (mr.valid_to IS NULL OR mr.valid_to>CURRENT_TIMESTAMP)
   AND (p.permission_code LIKE 'compliance.%' OR p.permission_code LIKE 'controls.%' OR p.permission_code LIKE 'evidence.%' OR p.permission_code LIKE 'privacy.retention_policy.%' OR p.permission_code LIKE 'remediation.%' OR p.permission_code='organization.subject.read')
   ORDER BY u.user_identity_id,p.permission_code,mr.scope_kind,r.role_code`,[tid]);
  const capabilities=await q(`SELECT DISTINCT c.capability_group FROM platform.subscriptions s JOIN platform.entitlements e ON e.plan_version_id=s.plan_version_id AND e.is_enabled=TRUE JOIN platform.capabilities c ON c.capability_id=e.capability_id AND c.lifecycle_state='published' WHERE s.tenant_id=$1 AND s.lifecycle_state='active' AND s.starts_at<=CURRENT_TIMESTAMP AND (s.ends_at IS NULL OR s.ends_at>CURRENT_TIMESTAMP) ORDER BY c.capability_group`,[tid]);
  const edges=await q(`WITH e AS(SELECT DISTINCT ON(entity_type,from_state,command_code) * FROM ops_audit.lifecycle_transition_definitions WHERE lifecycle_state='published' ORDER BY entity_type,from_state,command_code,version_number DESC)
   SELECT e.entity_type,e.from_state,e.command_code,e.to_state,e.version_number,p.permission_code,e.precondition_policy_ref,e.sod_policy_ref,array_agg(s.scope_kind ORDER BY s.scope_kind) AS allowed_scopes FROM e JOIN iam.permissions p ON p.permission_id=e.permission_id JOIN ops_audit.lifecycle_transition_scopes s ON s.lifecycle_transition_definition_id=e.lifecycle_transition_definition_id
   WHERE e.entity_type IN ('RequirementApplicability','RequirementAssessment','StatementOfApplicability','ControlAssessment','AssuranceTest','EvidenceRequest','EvidenceVersion','RetentionPolicy','Issue','Action') GROUP BY e.entity_type,e.from_state,e.command_code,e.to_state,e.version_number,p.permission_code,e.precondition_policy_ref,e.sod_policy_ref ORDER BY e.entity_type,e.command_code`);
  const tableNames=['regulatory.requirement_applicabilities','regulatory.requirement_assessments','regulatory.statements_of_applicability','regulatory.statement_of_applicability_items','controls.controls','controls.control_versions','controls.control_assessments','controls.assurance_tests','evidence.evidence_requests','evidence.evidences','evidence.evidence_versions','evidence.evidence_reviews','evidence.evidence_links','privacy.retention_policies','privacy.retention_policy_applicabilities','remediation.issues','remediation.issue_origins','remediation.actions','remediation.action_verifications','regulatory.compliance_methodologies','controls.control_effectiveness_methodologies','config.effective_configurations'];
  const allowed=['requirement_applicability_id','requirement_assessment_id','statement_of_applicability_id','statement_of_applicability_item_id','control_id','control_version_id','control_assessment_id','assurance_test_id','evidence_request_id','evidence_id','evidence_version_id','evidence_review_id','evidence_link_id','retention_policy_id','retention_policy_applicability_id','issue_id','issue_origin_id','action_id','action_verification_id','compliance_methodology_id','control_effectiveness_methodology_id','effective_configuration_id','tenant_id','row_version','lifecycle_state','result_status','domain_conclusion','control_code','test_code','request_code','evidence_code','policy_code','version_number','soa_version','requirement_id','framework_version_id','scope_subject_id','business_owner_subject_id','methodology_version_ref','methodology_code','effective_configuration_id','based_on_control_version_id','reference_control_version_id','tenant_control_id','tenant_control_version_id','assigned_membership_id','requested_by_membership_id','executor_membership_id','reviewer_membership_id','created_by_user_identity_id','updated_by_user_identity_id','submitted_at','approved_at','reviewed_at','published_at','effective_from','effective_to','valid_from','valid_to','period_start','period_end','policy_kind','classification','purpose','source_evidence_version_id','file_object_id','ownership_class','verification_decision','decision'];
  const inventory={},fingerprints={};
  for(const name of tableNames){
   const [schema,table]=name.split('.');const cols=await q('SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position',[schema,table]);
   if(!cols.length){inventory[name]={available:false};continue;}
   const names=cols.map(x=>x.column_name);const fields=allowed.filter(x=>names.includes(x));const tenantClause=names.includes('tenant_id')?(['regulatory.compliance_methodologies','controls.control_effectiveness_methodologies'].includes(name)?'WHERE tenant_id IS NULL OR tenant_id=$1':'WHERE tenant_id=$1'):'';const params=names.includes('tenant_id')?[tid]:[];
   inventory[name]={available:true,fields,rows:await q(`SELECT ${fields.map(x=>'"'+x+'"').join(',')} FROM "${schema}"."${table}" ${tenantClause}`,params)};
   const hashrows=await q(`SELECT md5(to_jsonb(t)::text) AS h FROM "${schema}"."${table}" t ${tenantClause} ORDER BY h`,params);
   fingerprints[name]={rows:hashrows.length,sha256:createHash('sha256').update(JSON.stringify(hashrows)).digest('hex')};
  }
  const iamFingerprints={};
  for(const table of ['roles','permissions','role_permissions','membership_roles','tenant_memberships']){
   const rows=await q(`SELECT md5(to_jsonb(t)::text) AS h FROM iam.${table} t ORDER BY h`);iamFingerprints[table]={rows:rows.length,sha256:createHash('sha256').update(JSON.stringify(rows)).digest('hex')};
  }
  await db.query('ROLLBACK');
  console.log(JSON.stringify({captured_at:new Date().toISOString(),transaction:'REPEATABLE READ READ ONLY; ROLLBACK',transaction_read_only:'on',tenant,actors,capabilities,edges,inventory,fingerprints,iamFingerprints,authorization_limit:'Live active grant+scope+entitlement facts, not authenticated command authorization, ObjectPolicy or transactional SoD PASS'},null,2));
 }finally{db.release();await pool.end();}
})().catch(e=>{console.error(e.code||e.message);process.exitCode=1;});
