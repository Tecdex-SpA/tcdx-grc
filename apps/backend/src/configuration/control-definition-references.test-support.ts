/** SQL executor fixture for isolated service/HTTP/browser tests. No PostgreSQL connection or runtime import. */
import {PostgresQueryCompiler,type Kysely} from 'kysely';
import type {FoundationDatabase} from '../database.js';
import {composeNormativeLibrary} from '../normative-library/composition.js';
import {buildApp} from '../app.js';
import {UnavailableFileStoragePort} from '../ports/file-storage.js';
import {NORMATIVE_LIBRARY} from '@tcdx-grc/contracts/normative-library';
import {controlSchemaReference} from './control-adjustment-policy.js';
import type {KnowledgeCustody} from '../normative-library/custody.js';
export const fixtureId=(n:number)=>'018f47f2-6170-7000-8000-'+n.toString(16).padStart(12,'0');
export const tenant=fixtureId(1),user=fixtureId(2),control=fixtureId(3),otherControl=fixtureId(4),now='2026-10-22T12:00:00.000Z';
export function definitionFixture(){return NORMATIVE_LIBRARY.definitions.definitions.map((d,i)=>({configuration_definition_id:fixtureId(10+i),configuration_code:d.configuration_code,version_number:String(d.version_number),lifecycle_state:'published',tenant_overridable:true,object_overridable:true,value_type:'text',allowed_scope_levels:['control_version'],ownership_class:'PLATFORM_CONTROL',tenant_id:null,effective_from:'2026-01-01T00:00:00.000Z',effective_to:'2027-01-01T00:00:00.000Z',published_at:null}));}
export function contextualFixture(){
 const definitions=definitionFixture();
 const state={allowed:true,role:'GRC_MANAGER',scope:'tenant',capability:true,definitions,missingRules:false,badRules:false,failAudit:false,statements:[] as {sql:string;parameters:readonly unknown[]}[],overrides:[] as Record<string,unknown>[],commit:0,rollback:0};
 const compiler=new PostgresQueryCompiler();
 const executeQuery=async(q:{sql:string;parameters:readonly unknown[]})=>{
  state.statements.push(q);const p=q.parameters,s=q.sql;const rows=(values:unknown[]=[])=>({rows:values,numAffectedRows:1n});
  if(s.includes('FROM iam.tenant_memberships'))return rows(p[0]===tenant?[{tenant_membership_id:fixtureId(5)}]:[]);
  if(s.includes('FROM iam.membership_roles'))return rows(state.allowed?[{permission_code:'configuration.configuration_override.create',scope_kind:state.scope,role_code:state.role}]:[]);
  if(s.includes('FROM platform.subscriptions'))return rows(state.capability?[{capability_group:'CORE_PLATFORM'}]:[]);
  if(s.includes('SET TRANSACTION')||s.includes('pg_advisory_xact_lock'))return rows();
  if(s.includes('transaction_timestamp() AS evaluated_at'))return rows([{evaluated_at:now}]);
  if(s.includes('FROM controls.control_versions')){
   const own=[control,otherControl].includes(String(p[0]))&&p[1]===tenant;
   return rows(own?[{control_version_id:p[0],tenant_id:tenant,ownership_class:'TENANT_OWNED',execution_method:'Método sintético',minimum_evidence:'Evidencia sintética',frequency_code:'monthly'}]:[]);
  }
  if(s.includes('FROM config.configuration_definitions')){
   const valid=state.definitions.filter(d=>d.ownership_class==='PLATFORM_CONTROL'&&d.tenant_id===null&&d.effective_from<=now&&d.effective_to>now);
   return rows(s.includes('d.configuration_definition_id=')?valid.filter(d=>d.configuration_definition_id===p[0]):valid.filter(d=>d.lifecycle_state==='published'));
  }
  if(s.includes('FROM config.configuration_validation_rules')){
   const d=state.definitions.find(d=>d.configuration_definition_id===p[0]);
   return rows(!d||state.missingRules?[]:[{configuration_definition_id:d.configuration_definition_id,ownership_class:'PLATFORM_CONTROL',tenant_id:null,rule_ordinal:1,operator:state.badRules?'arbitrary':'contract_schema',error_code:'TCDX.VALIDATION.FAILED',operand_text_value:controlSchemaReference(d),operand_boolean_value:null,operand_integer_value:null,operand_decimal_value:null,operand_timestamp_value:null,operand_duration_seconds_value:null,operand_json_value:null}]);
  }
  if(s.includes('MAX(override_version)'))return rows([{next_version:String(state.overrides.length+1)}]);
  if(s.includes('FROM ops_audit.audit_events'))return rows();
  if(s.includes('INSERT INTO ops_audit.idempotency_records'))return rows([{idempotency_record_id:p[0]}]);
  if(s.includes('UPDATE ops_audit.idempotency_records'))return rows();
  if(s.includes('INSERT INTO ops_audit.audit_events')){if(state.failAudit)throw Error('synthetic private audit failure');return rows();}
  if(s.includes('INSERT INTO ops_audit.outbox_events'))return rows();
  if(s.startsWith('INSERT INTO config.configuration_overrides')){
   const columns=[...s.slice(s.indexOf('('),s.indexOf(')')).matchAll(/"([a-z_]+)"/g)].map(m=>m[1]!);
   const row={...Object.fromEntries(columns.map((k,i)=>[k,p[i]])),approved_by_user_identity_id:null};state.overrides.push(row);return rows([row]);
  }
  if(s.includes('FROM config.configuration_overrides'))return rows(state.overrides.filter(row=>row.configuration_override_id===p[0]&&row.tenant_id===p[1]));
  throw Error('Unexpected isolated SQL: '+s);
 };
 const database={executeQuery,getExecutor:()=>({transformQuery:(node:unknown)=>node,compileQuery:(node:Parameters<PostgresQueryCompiler['compileQuery']>[0],id:Parameters<PostgresQueryCompiler['compileQuery']>[1])=>compiler.compileQuery(node,id),executeQuery}),transaction:()=>({setIsolationLevel:()=>({execute:work}),execute:work})} as unknown as Kysely<FoundationDatabase>;
 async function work<T>(callback:(tx:Kysely<FoundationDatabase>)=>Promise<T>){const before=[...state.overrides];try{const result=await callback(database);state.commit++;return result;}catch(error){state.overrides=before;state.rollback++;throw error;}}
 const identity={principalClass:'HUMAN_INTERACTIVE' as const,principalId:user,tokenId:'fixture',expiresAt:new Date('2099-01-01T00:00:00Z')};
 const normativeLibrary=composeNormativeLibrary({database,environment:'test',custody:{} as KnowledgeCustody,rightsEvidence:{verify:async()=>false},cursor:{signReferenceCursor:async()=>{throw Error('Unused cursor');},verifyReferenceCursor:async()=>{throw Error('Unused cursor');}}});
 const app=buildApp(async()=>true,{database,normativeLibrary,identityVerifier:{verifyBearerToken:async()=>identity},fileStorage:new UnavailableFileStoragePort(),runtimeEnvironment:'test'});
 return {state,database,identity,app};
}
