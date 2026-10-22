import {sql,type Kysely,type Transaction} from 'kysely';
import {NORMATIVE_LIBRARY,type MatrixRef,type MatrixType,type MatrixCell} from '@tcdx-grc/contracts/normative-library';
import type {FoundationDatabase} from '../database.js';
import type {VerifiedIdentity} from '../security/authentication.js';
import type {CoreActor} from '../core-grc/model.js';
import {resources} from '../core-grc/model.js';
import {resolveTenantActor,requireAccess} from '../core-grc/security.js';
import {getResource} from '../core-grc/repository.js';
import {packVisibility} from '../regulatory/pack-entitlement.js';
import {FoundationError} from '../errors.js';
import {concealed} from './authorization.js';
import {authorizeMatrix,parseMatrixQuery,projectMatrixPage,type CursorPort,type MatrixAuthorization} from './matrices.js';
import {loadMatrixPopulation} from './matrix-source.js';

type Tx=Transaction<FoundationDatabase>;
async function canonicalAuthority(tx:Tx,actor:CoreActor):Promise<MatrixAuthorization>{
 const visibility=await packVisibility(tx,actor.tenantId,actor.runtimeEnvironment);
 const visibleFrameworks=new Set(visibility.frameworkVersionIds);
 async function framework(id:string):Promise<boolean>{
  const found=await sql<{tenant_id:string|null;lifecycle_state:string}>`SELECT v.tenant_id,v.lifecycle_state FROM regulatory.framework_versions v JOIN regulatory.frameworks f ON f.framework_id=v.framework_id AND f.ownership_class=v.ownership_class AND f.tenant_id IS NOT DISTINCT FROM v.tenant_id WHERE v.framework_version_id=${id}::uuid AND (v.tenant_id=${actor.tenantId}::uuid OR v.tenant_id IS NULL) AND (v.tenant_id IS NULL OR f.lifecycle_state='published')`.execute(tx);
  const row=found.rows[0];return !!row&&(row.tenant_id===actor.tenantId?row.lifecycle_state==='published':visibleFrameworks.has(id));
 }
 async function axis(ref:MatrixRef):Promise<boolean>{
  try{
   if('framework_version_id' in ref)return framework(ref.framework_version_id);
   if('requirement_id' in ref){
    const requirement=await sql<{framework_version_id:string}>`SELECT framework_version_id FROM regulatory.requirements WHERE requirement_id=${ref.requirement_id}::uuid AND (tenant_id=${actor.tenantId}::uuid OR tenant_id IS NULL)`.execute(tx);
    return !!requirement.rows[0]&&await framework(requirement.rows[0].framework_version_id);
   }
   if('control_version_id' in ref){const control=await sql<{control_id:string}>`SELECT control_id FROM controls.control_versions WHERE control_version_id=${ref.control_version_id}::uuid AND (tenant_id=${actor.tenantId}::uuid OR tenant_id IS NULL)`.execute(tx);if(!control.rows[0])return false;await getResource(tx,actor,resources.control,control.rows[0].control_id);return true;}
   const keyed=[['control_id','control'],['evidence_version_id','evidenceVersion'],['requirement_assessment_id','requirementAssessment'],['requirement_applicability_id','applicability'],['issue_id','issue'],['action_id','action']] as const;
   for(const [field,key]of keyed)if(field in ref){await getResource(tx,actor,resources[key],(ref as Record<string,string>)[field]!);return true;}
   return false;
  }catch(error){if(error instanceof FoundationError&&error.statusCode===404)return false;throw error;}
 }
 return {axis,
  async relation(cell:MatrixCell){return await axis(cell.row_ref)&&await axis(cell.column_ref);},
  async filter(field,id){
   if(field==='source_framework_version_id'||field==='target_framework_version_id'){if(!await framework(id))concealed();return;}
   if(field==='scope_subject_id'){
    requireAccess(actor,'organization.subject.read','CORE_PLATFORM',['tenant']);
    const row=await sql`SELECT subject_id FROM org.subjects WHERE subject_id=${id}::uuid AND tenant_id=${actor.tenantId}::uuid AND lifecycle_state='active' AND effective_from<=transaction_timestamp() AND (effective_to IS NULL OR effective_to>transaction_timestamp())`.execute(tx);if(row.rows.length!==1)concealed();return;
   }
   if(!await axis({[field]:id} as MatrixRef))concealed();
  }
 };
}
/** Same source for compact dashboard windows and full matrices; no registry/grant activation here. */
export async function readMatrix(database:Kysely<FoundationDatabase>,input:{identity:VerifiedIdentity;tenantId:string;type:MatrixType;query:Record<string,unknown>},signer:CursorPort){
 return database.transaction().setIsolationLevel('repeatable read').execute(async tx=>{
  await sql`SET TRANSACTION READ ONLY`.execute(tx);
  const actor=await resolveTenantActor(tx,input.identity,input.tenantId);authorizeMatrix(actor,input.type);
  const descriptor=NORMATIVE_LIBRARY.matrices.types.find(d=>d.matrix_type===input.type)!;
  const registry=await sql<{from_state:string;to_state:string}>`SELECT from_state,to_state FROM ops_audit.lifecycle_transition_definitions WHERE entity_type=${descriptor.lifecycle_state_source.entity_type} AND lifecycle_state='published'`.execute(tx);
  const lifecycle=[...new Set(registry.rows.flatMap(r=>[r.from_state,r.to_state]))];
  const query=parseMatrixQuery(input.type,input.query,lifecycle);
  const authority=await canonicalAuthority(tx,actor);
  // Validate object filters before even reading the source relationship population.
  for(const [field,id]of Object.entries(query.filters))if(field.endsWith('_id'))await authority.filter(field,id);
  const population=await loadMatrixPopulation(tx,actor,query);
  return projectMatrixPage(actor,query,population,authority,signer);
 });
}
