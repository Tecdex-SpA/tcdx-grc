import {sql,type Kysely} from 'kysely';
import {NORMATIVE_LIBRARY,validateLibrarySchema,type ControlDefinitionReferencePage} from '@tcdx-grc/contracts/normative-library';
import type {FoundationDatabase} from '../database.js';
import type {VerifiedIdentity} from '../security/authentication.js';
import {resolveTenantActor} from '../core-grc/security.js';
import {authorizeLibraryOperation,concealed,deny,invalid} from '../normative-library/authorization.js';
import {FoundationError} from '../errors.js';
import {controlDefinitionDescriptor,type ControlDefinition} from './control-adjustments.js';
import {validateControlRule} from './control-adjustment-policy.js';

/** Contextual input references for B04, never an administrative catalogue or a grant. */
export async function readControlDefinitionReferences(database:Kysely<FoundationDatabase>,input:{identity:VerifiedIdentity;tenantId:string;id:string;query:Record<string,unknown>;body?:unknown}):Promise<ControlDefinitionReferencePage>{
 if(input.identity.principalClass!=='HUMAN_INTERACTIVE')deny();
 if(Object.keys(input.query).length||input.body!==undefined||!/^[a-f0-9]{8}-[a-f0-9]{4}-7[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(input.id))invalid();
 return database.transaction().setIsolationLevel('repeatable read').execute(async tx=>{
  await sql`SET TRANSACTION READ ONLY`.execute(tx);
  const actor=await resolveTenantActor(tx,input.identity,input.tenantId);
  authorizeLibraryOperation(actor,'controlConfigurationDefinitionReferenceList');
  const target=await sql<{control_version_id:string}>`SELECT cv.control_version_id FROM controls.control_versions cv
   JOIN controls.controls c ON c.control_id=cv.control_id AND c.tenant_id=cv.tenant_id AND c.ownership_class='TENANT_OWNED'
   WHERE cv.control_version_id=${input.id}::uuid AND cv.tenant_id=${actor.tenantId}::uuid AND cv.ownership_class='TENANT_OWNED'`.execute(tx);
  if(target.rows.length!==1||target.rows[0]!.control_version_id!==input.id)concealed();
  const time=await sql<{evaluated_at:Date}>`SELECT transaction_timestamp() AS evaluated_at`.execute(tx);
  const evaluatedAt=new Date(time.rows[0]!.evaluated_at).toISOString();
  const expected=NORMATIVE_LIBRARY.definitions.definitions;
  const matches=sql.join(expected.map(d=>sql`(d.configuration_code=${d.configuration_code} AND d.version_number=${String(d.version_number)}::bigint)`),sql` OR `);
  const found=await sql<ControlDefinition&{configuration_definition_id:string;effective_from:Date;effective_to:Date;published_at:Date|null}>`
   SELECT d.*,d.version_number::text,ARRAY(SELECT s.scope_level FROM config.configuration_definition_scopes s WHERE s.configuration_definition_id=d.configuration_definition_id ORDER BY s.scope_level) AS allowed_scope_levels
   FROM config.configuration_definitions d WHERE d.ownership_class='PLATFORM_CONTROL' AND d.tenant_id IS NULL AND d.lifecycle_state='published'
   AND d.effective_from<=transaction_timestamp() AND d.effective_to>transaction_timestamp() AND (${matches})
   ORDER BY d.configuration_code COLLATE "C",d.version_number`.execute(tx);
  const items:ControlDefinitionReferencePage['items']=[],seen=new Set<string>();
  for(const row of found.rows){
   if(!controlDefinitionDescriptor(row))continue;
   const key=row.configuration_code+'@'+row.version_number;
   if(seen.has(key))throw new FoundationError('TCDX.CONFLICT.RESOURCE','Ambiguous configuration reference',409);seen.add(key);
   const rules=await sql<Record<string,unknown>>`SELECT * FROM config.configuration_validation_rules WHERE configuration_definition_id=${row.configuration_definition_id}::uuid ORDER BY rule_ordinal`.execute(tx);
   if(!rules.rows.length)throw new FoundationError('TCDX.DEPENDENCY.UNAVAILABLE','Parámetros temporalmente no disponibles. Vuelve a consultar más tarde.',503,true);
   try{validateControlRule(row,rules.rows);}catch(error){if(error instanceof FoundationError&&error.statusCode===422)throw new FoundationError('TCDX.INVARIANT.VIOLATION','Parámetro no disponible para este contexto.',422);throw error;}
   items.push({configuration_definition_id:row.configuration_definition_id,configuration_code:row.configuration_code,definition_version:String(row.version_number),value_type:'text',scope_level:'control_version',effective_from:new Date(row.effective_from).toISOString(),effective_to:new Date(row.effective_to).toISOString(),published_at:row.published_at===null?null:new Date(row.published_at).toISOString()});
  }
  const result={control_version_id:input.id,evaluated_at:evaluatedAt,items};
  if(!validateLibrarySchema('ControlDefinitionReferencePage',result).valid)throw new FoundationError('TCDX.INTERNAL.FAILURE','Invalid reference metadata',500);
  return result;
 });
}
