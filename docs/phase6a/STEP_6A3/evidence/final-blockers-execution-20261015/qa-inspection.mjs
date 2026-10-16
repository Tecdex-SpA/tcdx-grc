// Read-only product inspection. Real existing M2M OAuth is used only for denied reads.
import {createHash, randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createDatabase, sql} from '/app/apps/backend/dist/database.js';
import {loadConfig} from '/app/apps/backend/dist/config.js';
import {ApplicationTokenService} from '/app/apps/backend/dist/security/application-token.js';
import {configureQaIamPublication} from '/app/apps/backend/dist/security/iam-publication-runtime.js';
import {IamPublicationService} from '/app/apps/backend/dist/security/iam-publication.js';
const hash = value => createHash('sha256').update(value).digest('hex');
const c=loadConfig(process.env);
if(c.nodeEnv!=='qa') throw Error('QA_ONLY');
const db=createDatabase(c);
try {
 const snapshot=await db.transaction().execute(async tx=>{
  await sql`SET TRANSACTION READ ONLY`.execute(tx);
  const identity=(await sql`SELECT current_database() AS database,host(inet_server_addr()) AS host,
    current_setting('server_version_num')::int/10000 AS major,CURRENT_TIMESTAMP AS observed_at`.execute(tx)).rows[0];
  if(identity.host!=='192.168.2.40'||identity.database!=='tcdx-grc'||identity.major!==16)throw Error('QA_IDENTITY_REQUIRED');
  const applicabilities=(await sql`SELECT retention_policy_applicability_id::text AS id,tenant_id::text,
    lifecycle_state,row_version::text,source_evidence_version_id::text,published_at
    FROM privacy.retention_policy_applicabilities ORDER BY retention_policy_applicability_id`.execute(tx)).rows;
  const evidence=(await sql`SELECT ev.evidence_version_id::text AS id,ev.tenant_id::text,ev.lifecycle_state,
    ev.effective_from,ev.effective_to,ev.expires_at,ev.row_version::text,ev.created_by_user_identity_id::text AS author,
    fo.scan_status,fo.retention_policy_applicability_id::text AS file_applicability_id
    FROM evidence.evidence_versions ev LEFT JOIN evidence.document_versions dv
    ON dv.tenant_id=ev.tenant_id AND dv.document_version_id=ev.document_version_id
    LEFT JOIN evidence.file_objects fo ON fo.tenant_id=ev.tenant_id AND fo.file_object_id=COALESCE(ev.file_object_id,dv.file_object_id)
    ORDER BY ev.evidence_version_id`.execute(tx)).rows;
  const reviewers=(await sql`SELECT tm.tenant_membership_id::text AS membership_id,tm.tenant_id::text,
    tm.user_identity_id::text,tm.membership_state,mr.scope_kind,mr.valid_from,mr.valid_to,
    array_agg(DISTINCT p.permission_code ORDER BY p.permission_code) AS permissions
    FROM iam.tenant_memberships tm JOIN iam.membership_roles mr USING(tenant_membership_id,tenant_id)
    JOIN iam.roles r USING(role_id) JOIN iam.role_permissions rp ON rp.role_id=r.role_id AND rp.tenant_id=tm.tenant_id
    JOIN iam.permissions p USING(permission_id)
    WHERE r.role_code='LEGAL_REVIEWER' AND tm.membership_state='active'
    AND mr.valid_from<=CURRENT_TIMESTAMP AND (mr.valid_to IS NULL OR mr.valid_to>CURRENT_TIMESTAMP)
    AND p.permission_code IN ('privacy.retention_policy.approve','evidence.evidence.approve')
    GROUP BY tm.tenant_membership_id,tm.tenant_id,tm.user_identity_id,tm.membership_state,mr.scope_kind,mr.valid_from,mr.valid_to
    ORDER BY tm.tenant_membership_id`.execute(tx)).rows;
  const preserved=(await sql`SELECT
    (SELECT count(*)::int FROM ops_audit.audit_events WHERE aggregate_type='RetentionPolicyApplicability') AS applicability_audits,
    (SELECT count(*)::int FROM privacy.retention_policy_hold_releases) AS hold_releases,
    (SELECT count(*)::int FROM platform.schema_migrations) AS migration_count`.execute(tx)).rows[0];
  return {identity,applicabilities,evidence,reviewers,preserved,transaction:'READ_ONLY'};
 });
 const tokens=await ApplicationTokenService.create(c.applicationJwt);
 const publication=await configureQaIamPublication(db,tokens,c,process.env);
 if(!publication)throw Error('EXISTING_MACHINE_PROFILE_REQUIRED');
 const profile=JSON.parse(await readFile(process.env.TCDX_IAM_M2M_PROFILE_FILE,'utf8'));
 const secret=await IamPublicationService.credentialFile(profile.credential_ref)();
 const response=await fetch(profile.issuer+'/protocol/openid-connect/token',{
  method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
  headers:{authorization:'Basic '+Buffer.from(profile.client_id+':'+secret).toString('base64'),
    'content-type':'application/x-www-form-urlencoded',accept:'application/json'},
  body:new URLSearchParams({grant_type:'client_credentials'})
 });
 if(!response.ok)throw Error('MACHINE_OAUTH_DENIED');
 const oauth=await response.json();
 if(oauth.token_type?.toLowerCase()!=='bearer'||typeof oauth.access_token!=='string')throw Error('MACHINE_OAUTH_INVALID');
 const actor=await tokens.verifyBearerToken(oauth.access_token);
 if(actor.principalClass!=='MACHINE_TO_MACHINE')throw Error('REAL_MACHINE_REQUIRED');
 const tenant=snapshot.applicabilities[0]?.tenant_id;
 if(!tenant)throw Error('EXISTING_CASE_REQUIRED');
 const checks=[];
 async function check(method,path,auth,headers={}) {
  const sentCorrelation=randomUUID();
  const r=await fetch('https://grc.tecdex.net'+path,{method,redirect:'error',signal:AbortSignal.timeout(15000),
    headers:{'x-correlation-id':sentCorrelation,'x-tcdx-tenant-id':tenant,accept:'application/json',...headers,
       ...(auth?{authorization:'Bearer '+auth}:{})}});
  const body=await r.text();let payload;try{payload=JSON.parse(body);}catch{}
  checks.push({method,path,status:r.status,sent_correlation_id:sentCorrelation,
    response_correlation_id:r.headers.get('x-correlation-id')??payload?.correlation_id??null,
    response_body_sha256:hash(body),error_code:payload?.error?.code??payload?.code??null,
    expected:auth===oauth.access_token?403:401,
    actor_class:auth===oauth.access_token?'VERIFIED_EXISTING_MACHINE_TO_MACHINE':auth?'INVALID_BEARER':'UNAUTHENTICATED',
    scope:auth===oauth.access_token?'Human tenant boundary, NOT author SoD or human cross-tenant proof':'Authentication rejection'});
 }
 await check('GET','/api/v1/retention-policy-applicabilities',oauth.access_token);
 await check('GET','/api/v1/retention-policy-applicabilities/'+snapshot.applicabilities[0].id,oauth.access_token);
 // Capture absent correlation receipts; these attempts cannot approve a case without authentication.
 await check('POST','/api/v1/retention-policy-applicabilities/'+snapshot.applicabilities[0].id+':approve',null,
   {'if-match':'"'+snapshot.applicabilities[0].row_version+'"','idempotency-key':randomUUID()});
 await check('GET','/api/v1/retention-policy-applicabilities','invalid-not-a-session');
 const after=await db.transaction().execute(async tx=>{
  await sql`SET TRANSACTION READ ONLY`.execute(tx);
  return (await sql`SELECT retention_policy_applicability_id::text AS id,tenant_id::text,lifecycle_state,
    row_version::text,source_evidence_version_id::text,published_at
    FROM privacy.retention_policy_applicabilities ORDER BY retention_policy_applicability_id`.execute(tx)).rows;
 });
 console.log(JSON.stringify({observed_at_utc:new Date().toISOString(),snapshot,
  machine_identity:{principal_class:actor.principalClass,service_principal_id:actor.principalId,credential_or_token_logged:false},
  checks,pass:checks.every(v=>v.status===v.expected),applicabilities_unchanged:JSON.stringify(after)===JSON.stringify(snapshot.applicabilities),
  not_run:[{case:'C04W_AUTHOR_SOD_DENY',reason:'No authenticated human browser/session transport is available to this agent; do not mint/impersonate a human token'},
   {case:'CFGD_FORCED_VALID_HTTP_DENY',reason:'Same human session prerequisite; preserve completed diagnostic and historical assessments'},
   {case:'HUMAN_CROSS_TENANT_404_AND_PERMISSION_ENTITLEMENT_DENY',reason:'Requires the correct existing human session/context; M2M 403 is not that proof'}]}));
 if(checks.some(v=>v.status!==v.expected)||JSON.stringify(after)!==JSON.stringify(snapshot.applicabilities))process.exitCode=1;
}catch{
 console.log(JSON.stringify({status:'BLOCKED_INSPECTION_OR_AUTHENTICATION_FAILED',secrets_logged:false}));
 process.exitCode=1;
}finally{await db.destroy();}
