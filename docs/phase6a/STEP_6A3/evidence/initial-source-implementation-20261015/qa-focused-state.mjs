// Executed inside the existing QA backend; reads only metadata and hashes.
import {createDatabase,sql} from './dist/database.js';import {loadConfig} from './dist/config.js';import {createHash} from 'node:crypto';
const db=createDatabase(loadConfig(process.env));const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
try{console.log(JSON.stringify(await db.transaction().execute(async tx=>{
 await sql`SET TRANSACTION READ ONLY`.execute(tx);await sql`SET LOCAL statement_timeout='15s'`.execute(tx);
 const identity=(await sql`SELECT current_database() AS database,host(inet_server_addr()) AS server,current_setting('server_version_num')::int/10000 AS major,current_setting('transaction_read_only') AS read_only`.execute(tx)).rows[0];
 if(identity.database!=='tcdx-grc'||identity.server!=='192.168.2.40'||identity.major!==16||identity.read_only!=='on')throw Error('QA_READONLY_IDENTITY_REQUIRED');
 const preserved={};
 for(const [key,table,order,where]of[
 ['roles','iam.roles','role_id','TRUE'],['grants','iam.role_permissions','role_permission_id','TRUE'],['memberships','iam.membership_roles','membership_role_id','TRUE'],
 ['applicabilities','privacy.retention_policy_applicabilities','retention_policy_applicability_id','TRUE'],
 ['evidence_versions','evidence.evidence_versions','evidence_version_id','TRUE'],['evidence_reviews','evidence.evidence_reviews','evidence_review_id','TRUE'],
 ['policies','privacy.retention_policies','retention_policy_id','TRUE'],['holds','privacy.retention_policy_hold_releases','hold_release_id','TRUE'],
 ['controls_history','controls.control_assessments','control_assessment_id',"control_assessment_id IN ('01a14122-06e4-748d-a3db-5935f64c1901','01a11afc-7f48-701e-9c0b-c2bc01ba0a5e')"],
 ['subscriptions','platform.subscriptions','subscription_id','TRUE']]) {
 const rows=(await sql.raw(`SELECT to_jsonb(t) AS row FROM ${table} t WHERE ${where} ORDER BY ${order}`).execute(tx)).rows;preserved[key]={rows:rows.length,sha256:hash(rows)};
 }
 const migrations=(await sql`SELECT migration_id,filename,content_sha256,outcome FROM platform.schema_migrations ORDER BY migration_id`.execute(tx)).rows;
 const c04w=(await sql`SELECT d.*,(SELECT json_agg(scope_kind ORDER BY scope_kind) FROM ops_audit.lifecycle_transition_scopes s WHERE s.lifecycle_transition_definition_id=d.lifecycle_transition_definition_id) AS scopes FROM ops_audit.lifecycle_transition_definitions d WHERE (entity_type='RetentionPolicyApplicability' OR (entity_type='RetentionPolicy' AND command_code='retention_policy.submit_for_review')) AND lifecycle_state='published' ORDER BY entity_type,command_code`.execute(tx)).rows;
 const c04wAudits=(await sql`SELECT audit_event_id,aggregate_id,actor_service_principal_id,after_payload FROM ops_audit.audit_events WHERE command_code='step6a3C04wLifecyclePublication' ORDER BY audit_event_id`.execute(tx)).rows;
 const initial=(await sql`SELECT d.*,(SELECT json_agg(scope_kind ORDER BY scope_kind) FROM ops_audit.lifecycle_transition_scopes s WHERE s.lifecycle_transition_definition_id=d.lifecycle_transition_definition_id) AS allowed_scopes,(SELECT json_agg(json_build_object('event_code',e.event_code,'ordinal',e.ordinal,'is_required',e.is_required) ORDER BY ordinal) FROM ops_audit.lifecycle_transition_side_effects e WHERE e.lifecycle_transition_definition_id=d.lifecycle_transition_definition_id) AS side_effects FROM ops_audit.lifecycle_transition_definitions d WHERE entity_type='EvidenceVersion' AND command_code='evidence.submit' AND version_number=2`.execute(tx)).rows;
 const audits=(await sql`SELECT a.audit_event_id,a.aggregate_id,a.actor_service_principal_id,a.after_payload,a.correlation_id FROM ops_audit.audit_events a JOIN iam.service_principals sp ON sp.service_principal_id=a.actor_service_principal_id AND sp.lifecycle_state='active' WHERE a.command_code='step6a3InitialSourceLifecyclePublication' AND a.event_code='audit.platform.lifecycle_transition.publish.v1' AND a.ownership_class='PLATFORM_CONTROL' AND a.tenant_id IS NULL AND a.actor_user_identity_id IS NULL AND a.outcome='success' ORDER BY audit_event_id`.execute(tx)).rows;
 return {observed_at_utc:new Date().toISOString(),identity,transaction:'READ_ONLY',preserved,migrations,c04w:{published_rows:c04w.length,registry_sha256:hash(c04w),authenticated_publication_audits:c04wAudits.length,audits_sha256:hash(c04wAudits)},initial_source:{definitions:initial,audits},DDL:0,DML:0};
})));}finally{await db.destroy();}
