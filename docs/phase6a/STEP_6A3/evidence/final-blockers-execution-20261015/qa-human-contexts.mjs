import {createDatabase,sql} from '/app/apps/backend/dist/database.js';
import {loadConfig} from '/app/apps/backend/dist/config.js';
const c=loadConfig(process.env);if(c.nodeEnv!=='qa')throw Error('QA_ONLY');const db=createDatabase(c);
try{console.log(JSON.stringify(await db.transaction().execute(async tx=>{
 await sql`SET TRANSACTION READ ONLY`.execute(tx);
 const contexts=(await sql`SELECT tm.tenant_id::text,tm.tenant_membership_id::text,tm.user_identity_id::text,
    array_agg(DISTINCT r.role_code ORDER BY r.role_code) AS roles,
    array_agg(DISTINCT p.permission_code ORDER BY p.permission_code) FILTER (WHERE p.permission_code IN
     ('privacy.retention_policy.update','privacy.retention_policy.read','privacy.retention_policy.approve',
      'evidence.evidence.approve','evidence.evidence.review','controls.control_assessment.submit')) AS relevant_permissions
   FROM iam.tenant_memberships tm JOIN iam.membership_roles mr USING(tenant_id,tenant_membership_id)
   JOIN iam.roles r USING(role_id) JOIN iam.role_permissions rp ON rp.role_id=r.role_id
   JOIN iam.permissions p USING(permission_id)
   WHERE tm.membership_state='active' AND r.lifecycle_state='published' AND p.lifecycle_state='published'
    AND mr.valid_from<=CURRENT_TIMESTAMP AND (mr.valid_to IS NULL OR mr.valid_to>CURRENT_TIMESTAMP)
   GROUP BY tm.tenant_id,tm.tenant_membership_id,tm.user_identity_id ORDER BY tm.tenant_id,tm.tenant_membership_id`.execute(tx)).rows;
 const policies=(await sql`SELECT tenant_id::text,retention_policy_id::text,policy_kind,lifecycle_state,
   effective_from,effective_to,retention_seconds::text FROM privacy.retention_policies ORDER BY retention_policy_id`.execute(tx)).rows;
 return {observed_at_utc:new Date().toISOString(),transaction:'READ_ONLY',contexts,policies,
  limitation:'Effective role/permission inventory only; object policy, entitlements, session availability and actual independent human act must still be verified'};
})));}finally{await db.destroy();}
