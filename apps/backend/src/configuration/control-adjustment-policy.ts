import {sql,type Transaction} from 'kysely';
import type {FoundationDatabase} from '../database.js';
import type {CoreActor} from '../core-grc/model.js';
import type {ControlAdjustmentPolicy} from './control-adjustment-service.js';
import {assertControlDefinition,validateControlAdjustmentValue,type ControlDefinition,type ControlVersionFacts} from './control-adjustments.js';
import {hashCanonical} from '../regulatory/hash.js';
import {invariant} from '../normative-library/authorization.js';
/** Closed reference into the published four schemas; not a database-provided expression or second resolver. */
export function controlSchemaReference(definition:ControlDefinition):string{
 const descriptor=assertControlDefinition(definition);return descriptor.configuration_code+'@'+descriptor.version_number+':'+hashCanonical(descriptor.value_schema);
}
export function validateControlRule(definition:ControlDefinition,rules:readonly Record<string,unknown>[]):void{
 if(rules.length!==1)invariant('Missing or unsupported canonical Definition validation rules');
 const r=rules[0]!;
 if(r.configuration_definition_id!==definition.configuration_definition_id||r.ownership_class!=='PLATFORM_CONTROL'||r.tenant_id!==null||Number(r.rule_ordinal)!==1||r.operator!=='contract_schema'||r.error_code!=='TCDX.VALIDATION.FAILED'||r.operand_text_value!==controlSchemaReference(definition))invariant('Definition rule differs from published schema binding');
 for(const key of ['operand_boolean_value','operand_integer_value','operand_decimal_value','operand_timestamp_value','operand_duration_seconds_value','operand_json_value'])if(r[key]!==null)invariant('Unexpected Definition operand');
}
export class CanonicalControlAdjustmentPolicy implements ControlAdjustmentPolicy{
 async assertDefinitionRules(tx:Transaction<FoundationDatabase>,actor:CoreActor,definition:ControlDefinition,control:ControlVersionFacts,value:string,from:string,to:string):Promise<void>{
  const descriptor=assertControlDefinition(definition);
  if(control.tenant_id!==actor.tenantId||control.ownership_class!=='TENANT_OWNED')invariant('Invalid control authority');
  if(!Number.isFinite(Date.parse(from))||!Number.isFinite(Date.parse(to))||Date.parse(from)>=Date.parse(to))invariant('Invalid configuration interval');
  const rules=await sql<Record<string,unknown>>`SELECT * FROM config.configuration_validation_rules WHERE configuration_definition_id=${definition.configuration_definition_id}::uuid ORDER BY rule_ordinal FOR SHARE`.execute(tx);
  validateControlRule(definition,rules.rows);validateControlAdjustmentValue(value,descriptor.value_schema);
 }
}
