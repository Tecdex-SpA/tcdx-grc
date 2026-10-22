// QA02: read-only QA identity, physical integrity, exact operational targets and fingerprints.
import {writeFileSync,readFileSync} from 'node:fs';
import {createClient} from '../../../../scripts/foundations/db.ts';
import {guard,collect,queries} from '../qa01-migration36-adoption-20261022/inspect.mts';
const base=import.meta.dirname,phase=process.argv[2];
if(!['PRE','PRE_RETRY','POST'].includes(phase??''))throw Error('READ_ONLY_PHASE_REQUIRED');
const prep=JSON.parse(readFileSync(base+'/../local-operational-preparation-20261022/IAM_REGISTRY_PREPARATION.json','utf8'));
const codes=[...prep.catalogue_delta.map((p:any)=>p.code),prep.existing_permission_limited_grant.code,...prep.bindings.map((b:any)=>b.permission_code)];
const definitionCodes=['control_operational_activity','control_recommended_evidence','control_operational_frequency','control_operational_confirmation'];
const commands=prep.bindings.map((b:any)=>b.command_code);
const c=createClient(),result:any={phase,started_utc:new Date().toISOString()};
try{
 await c.connect();await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');result.identity=await guard(c);
 result.results=await collect(async query=>(await c.query(query)).rows[0].jsonb_build_object);
 const rows=async(query:string,params:any[]=[]) => (await c.query(query,params)).rows;
 result.operational={
  tenants:await rows("SELECT tenant_id::text,tenant_code,lifecycle_state FROM platform.tenants ORDER BY tenant_id"),
  roles:await rows("SELECT role_id::text,role_code,ownership_class,tenant_id::text,is_baseline,lifecycle_state FROM iam.roles ORDER BY tenant_id NULLS FIRST,role_code"),
  permissions:await rows("SELECT permission_id::text,permission_code,domain_code,resource_code,action_code,lifecycle_state FROM iam.permissions WHERE permission_code=ANY($1::text[]) ORDER BY permission_code",[codes]),
  role_permissions:await rows("SELECT rp.role_permission_id::text,rp.ownership_class,rp.tenant_id::text,r.role_id::text,r.role_code,p.permission_code FROM iam.role_permissions rp JOIN iam.roles r USING(role_id) JOIN iam.permissions p USING(permission_id) WHERE p.permission_code=ANY($1::text[]) ORDER BY rp.tenant_id NULLS FIRST,r.role_code,p.permission_code",[codes]),
  publisher:await rows("SELECT service_principal_id::text,principal_code,principal_kind,ownership_class,tenant_id::text,lifecycle_state,credential_ref FROM iam.service_principals WHERE principal_code='grc-qa-iam-publisher'"),
  publisher_provision_audit:await rows("SELECT a.audit_event_id::text,a.event_code,a.command_code,a.outcome,a.actor_service_principal_id::text,a.after_payload FROM ops_audit.audit_events a JOIN iam.service_principals sp ON sp.service_principal_id=a.aggregate_id WHERE sp.principal_code='grc-qa-iam-publisher' AND a.command_code='servicePrincipalProvisionQa' ORDER BY a.audit_event_id"),
  bindings:await rows("SELECT d.*,p.permission_code,ARRAY(SELECT s.scope_kind FROM ops_audit.lifecycle_transition_scopes s WHERE s.lifecycle_transition_definition_id=d.lifecycle_transition_definition_id ORDER BY s.scope_kind) scopes,ARRAY(SELECT e.event_code FROM ops_audit.lifecycle_transition_side_effects e WHERE e.lifecycle_transition_definition_id=d.lifecycle_transition_definition_id ORDER BY e.ordinal) side_effects FROM ops_audit.lifecycle_transition_definitions d JOIN iam.permissions p USING(permission_id) WHERE d.command_code=ANY($1::text[]) ORDER BY d.command_code,d.version_number",[commands]),
  definitions:await rows("SELECT d.*,coalesce((SELECT jsonb_agg(to_jsonb(s) ORDER BY scope_level) FROM config.configuration_definition_scopes s WHERE s.configuration_definition_id=d.configuration_definition_id),'[]') scopes,coalesce((SELECT jsonb_agg(to_jsonb(v) ORDER BY rule_ordinal) FROM config.configuration_validation_rules v WHERE v.configuration_definition_id=d.configuration_definition_id),'[]') rules FROM config.configuration_definitions d WHERE configuration_code=ANY($1::text[]) ORDER BY configuration_code,version_number",[definitionCodes]),
  rights_counts:await rows("SELECT use_environment,use_act,content_kind,count(*)::int rights,count(*) FILTER (WHERE revoked_at IS NULL)::int unrevoked FROM knowledge.knowledge_source_usage_rights GROUP BY use_environment,use_act,content_kind ORDER BY use_environment,use_act,content_kind"),
  source_counts:await rows("SELECT ownership_class,license_classification,count(*)::int FROM knowledge.knowledge_sources GROUP BY ownership_class,license_classification ORDER BY ownership_class,license_classification"),
  publication_audits:await rows("SELECT audit_event_id::text,aggregate_type,aggregate_id::text,event_code,command_code,ownership_class,tenant_id::text,actor_service_principal_id::text,outcome,after_payload FROM ops_audit.audit_events WHERE command_code IN ('normativeLibraryOperationalPublication','knowledgeSourceRightsRecord','knowledgeSourceRightsRevoke') ORDER BY audit_event_id"),
 };
 result.activity=[];
 for(const query of queries.filter(q=>['session_activity','locks','prepared_transactions'].some(k=>q.includes("'category','"+k+"'"))))result.activity.push((await c.query(query)).rows[0].jsonb_build_object);
 await c.query('ROLLBACK');result.status='PASS_READ_ONLY';
}catch(e){await c.query('ROLLBACK').catch(()=>{});result.status='FAIL';result.error=e instanceof Error?{name:e.name,code:(e as any).code,message:e.message}: {name:'UNKNOWN'};process.exitCode=1;}
finally{await c.end();result.finished_utc=new Date().toISOString();writeFileSync(base+'/'+phase+'.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({phase,status:result.status,error:result.error}));}
