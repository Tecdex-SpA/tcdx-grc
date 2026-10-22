// Narrow read-only QA02R identity and role diagnosis. No schema scan or fingerprints.
import {writeFileSync} from 'node:fs';
import {createClient} from '../../../../scripts/foundations/db.ts';
import {guard} from '../qa01-migration36-adoption-20261022/inspect.mts';
const c=createClient(),output:any={started_utc:new Date().toISOString(),scope:'QA02R_IDENTITY_ROLES_ONLY'};
try{
 await c.connect();await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');output.identity=await guard(c);
 const read=async(query:string)=>(await c.query(query)).rows;
 output.tenants=await read("SELECT t.tenant_id::text,t.tenant_code,t.lifecycle_state,(SELECT count(*)::int FROM iam.roles r WHERE r.tenant_id=t.tenant_id) AS role_rows,(SELECT count(*)::int FROM iam.tenant_memberships m WHERE m.tenant_id=t.tenant_id) AS memberships,(SELECT count(*)::int FROM iam.tenant_memberships m WHERE m.tenant_id=t.tenant_id AND m.membership_state='active') AS active_memberships,(SELECT count(*)::int FROM iam.membership_roles mr WHERE mr.tenant_id=t.tenant_id) AS membership_role_rows FROM platform.tenants t ORDER BY t.tenant_id");
 output.seven_roles=await read("SELECT role_id::text,role_code,ownership_class,tenant_id::text,is_baseline,lifecycle_state FROM iam.roles WHERE role_code IN ('TENANT_ADMIN','GRC_MANAGER','COMPLIANCE_MANAGER','CONTROL_OWNER','EVIDENCE_OWNER','ACTION_OWNER','VIEWER') ORDER BY role_code,tenant_id NULLS FIRST");
 output.platform_administrators=await read("SELECT count(DISTINCT pa.user_identity_id)::int AS active_existing_platform_admins FROM iam.platform_role_assignments pa JOIN iam.roles r USING(role_id) JOIN iam.user_identities u USING(user_identity_id) WHERE r.role_code='PLATFORM_ADMIN' AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL AND r.lifecycle_state='published' AND u.lifecycle_state='active' AND pa.valid_from<=transaction_timestamp() AND (pa.valid_to IS NULL OR pa.valid_to>transaction_timestamp())");
 output.publisher=await read("SELECT service_principal_id::text,principal_code,principal_kind,ownership_class,tenant_id::text,lifecycle_state,credential_ref FROM iam.service_principals WHERE principal_code='grc-qa-iam-publisher'");
 output.publisher_provision=await read("SELECT a.audit_event_id::text,a.command_code,a.event_code,a.outcome,a.after_payload->>'profile_sha256' profile_sha256,a.after_payload->>'decision_sha256' decision_sha256,a.after_payload->>'client_id' client_id FROM ops_audit.audit_events a JOIN iam.service_principals sp ON sp.service_principal_id=a.aggregate_id WHERE sp.principal_code='grc-qa-iam-publisher' AND a.command_code='servicePrincipalProvisionQa' AND a.event_code='audit.iam.service_principal.provision.v1'");
 await c.query('ROLLBACK');output.status='PASS_READ_ONLY';
}catch(e){await c.query('ROLLBACK').catch(()=>{});output.status='FAIL';output.error={name:(e as Error).name,code:(e as any).code};process.exitCode=1;}
finally{await c.end();output.finished_utc=new Date().toISOString();writeFileSync(import.meta.dirname+'/IDENTITY_ROLES.json',JSON.stringify(output,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:output.status,role_diagnostic_only:true,error:output.error}));}
