import { NORMATIVE_LIBRARY, validateLibrarySchema } from '@tcdx-grc/contracts/normative-library';
import { resolveConfiguration, type ConfigurationLayer } from './resolver.js';
import { hashCanonical } from '../regulatory/hash.js';
import type { CoreActor } from '../core-grc/model.js';
import { requireAccess } from '../core-grc/security.js';
import { concealed, deny, invariant, invalid } from '../normative-library/authorization.js';

export type ControlDefinition = { configuration_definition_id: string; configuration_code: string; version_number: number; lifecycle_state: string; tenant_overridable: boolean; object_overridable: boolean; value_type: string; allowed_scope_levels: readonly string[] };
export type ControlVersionFacts = { control_version_id: string; tenant_id: string | null; ownership_class: string; execution_method: string | null; minimum_evidence: string | null; frequency_code: string | null };
export type ControlOverride = { configuration_override_id: string; configuration_definition_id: string; tenant_id: string; control_version_id: string; override_version: number | string; text_value: string; lifecycle_state: string; effective_from: string; effective_to: string; supersedes_configuration_override_id: string | null; created_by_user_identity_id: string };
export function assertControlDefinition(definition: ControlDefinition) {
  const contract = NORMATIVE_LIBRARY.definitions.definitions.find(d => d.configuration_code === definition.configuration_code);
  if (!contract || definition.version_number !== contract.version_number || definition.lifecycle_state !== 'published' || definition.value_type !== contract.value_type || !definition.tenant_overridable || !definition.object_overridable || definition.allowed_scope_levels.length !== 1 || definition.allowed_scope_levels[0] !== 'control_version') invariant('Unpublished or incompatible control Definition');
  return contract;
}
export function validateAdjustmentCreate(actor: CoreActor, body: unknown, definition: ControlDefinition, control: ControlVersionFacts): void {
  requireAccess(actor, 'configuration.configuration_override.create', 'CORE_PLATFORM', ['tenant']);
  if (!actor.roles.some(r => r === 'TENANT_ADMIN' || r === 'GRC_MANAGER')) deny();
  if (!validateLibrarySchema('ControlOverrideCreateRequest', body).valid) invalid();
  const input = body as { configuration_definition_id: string; control_version_id: string; text_value: string; effective_from: string; effective_to: string };
  if (input.configuration_definition_id !== definition.configuration_definition_id || input.control_version_id !== control.control_version_id || control.tenant_id !== actor.tenantId || control.ownership_class !== 'TENANT_OWNED') concealed();
  const contract = assertControlDefinition(definition);
  validateControlAdjustmentValue(input.text_value, contract.value_schema);
  if (Date.parse(input.effective_from) >= Date.parse(input.effective_to)) invariant('Invalid override interval');
}
export function validateControlAdjustmentValue(value: string, schema: { maxLength: number; enum?: readonly string[] }): void {
  if (!value.trim() || [...value].length > schema.maxLength || (schema.enum && !schema.enum.includes(value))) invariant('Value not permitted by Definition');
}
export function assertOverrideSoD(actor: CoreActor, override: ControlOverride, action: 'review' | 'approve'): void {
  requireAccess(actor, 'configuration.configuration_override.'+action, 'CORE_PLATFORM', ['tenant']);
  if (override.tenant_id !== actor.tenantId) concealed();
  if (!actor.roles.includes('GRC_MANAGER') || override.created_by_user_identity_id === actor.userIdentityId) deny();
}
export function assertOverrideSuccessor(next: ControlOverride, previous: ControlOverride): void {
  if (previous.lifecycle_state !== 'approved' || next.supersedes_configuration_override_id !== previous.configuration_override_id || next.configuration_override_id === previous.configuration_override_id || next.tenant_id !== previous.tenant_id || next.control_version_id !== previous.control_version_id || next.configuration_definition_id !== previous.configuration_definition_id || !/^[1-9][0-9]*$/.test(String(next.override_version)) || BigInt(next.override_version) <= BigInt(previous.override_version) || Date.parse(next.effective_from) <= Date.parse(previous.effective_from) || Date.parse(next.effective_from) >= Date.parse(previous.effective_to)) invariant('Invalid override succession');
}
/** Selects eligible layers only; resolveConfiguration remains the only value resolver. */
export function resolveControlAdjustment(input: { tenantId: string; asOf: string; definition: ControlDefinition; control: ControlVersionFacts; overrides: readonly ControlOverride[] }) {
  const contract = assertControlDefinition(input.definition);
  if (input.control.tenant_id !== input.tenantId || input.control.ownership_class !== 'TENANT_OWNED') concealed();
  const instant = Date.parse(input.asOf);
  if (!Number.isFinite(instant)) invalid('as_of');
  const all = input.overrides.filter(o => o.lifecycle_state === 'approved');
  const ids = new Map<string, ControlOverride>();
  for (const o of all) {
    if (ids.has(o.configuration_override_id)) invariant('Duplicate override identity');
    if (o.tenant_id !== input.tenantId || o.control_version_id !== input.control.control_version_id || o.configuration_definition_id !== input.definition.configuration_definition_id) concealed();
    if (!Number.isFinite(Date.parse(o.effective_from)) || !Number.isFinite(Date.parse(o.effective_to)) || Date.parse(o.effective_from) >= Date.parse(o.effective_to)) invariant('Invalid stored override interval');
    validateControlAdjustmentValue(o.text_value, contract.value_schema);ids.set(o.configuration_override_id,o);
  }
  const cuts = new Map<string, number>();
  for (const o of all) if (o.supersedes_configuration_override_id) {
    const previous = ids.get(o.supersedes_configuration_override_id);
    if (!previous || cuts.has(previous.configuration_override_id)) invariant('Missing predecessor or approved fork');
    assertOverrideSuccessor(o,previous);cuts.set(previous.configuration_override_id,Date.parse(o.effective_from));
  }
  const layers: ConfigurationLayer[] = [];
  const field = contract.base_control_version_field as 'execution_method' | 'minimum_evidence' | 'frequency_code' | null;
  if (field && input.control[field] !== null) layers.push({ layerId: input.control.control_version_id, precedence: 1, specificity: 'control_version', value: input.control[field] });
  for (const o of all) if (Date.parse(o.effective_from) <= instant && instant < Math.min(Date.parse(o.effective_to),cuts.get(o.configuration_override_id) ?? Infinity)) layers.push({ layerId: o.configuration_override_id, precedence: 3, specificity: 'control_version', value: o.text_value });
  const inputHash = hashCanonical({ definition: input.definition, descriptor: contract, control: input.control, as_of: input.asOf, eligible_layers: [...layers].sort((a,b)=>a.layerId.localeCompare(b.layerId)) });
  return { ...(layers.length ? resolveConfiguration(layers) : { value: null, selectedLayerId: null, layerIds: [] }), inputHash };
}

export function controlOverrideEtag(row:Record<string,unknown>,materialAuditIds:readonly string[]):string{
  const fields=['configuration_override_id','configuration_definition_id','ownership_class','tenant_id','scope_level','control_version_id','supersedes_configuration_override_id','lifecycle_state','created_by_user_identity_id','approved_by_user_identity_id','methodology_id','regulatory_pack_version_id','scope_subject_id','boolean_value','integer_value','decimal_value','text_value','timestamp_value','duration_seconds_value','json_value'];
  const aggregate:Record<string,unknown>=Object.fromEntries(fields.map(k=>[k,row[k]??null]));aggregate.override_version=String(row.override_version);
  for(const k of ['effective_from','effective_to'])aggregate[k]=new Date(row[k] as string|Date).toISOString();
  return '"'+hashCanonical({aggregate,material_audit_ids:[...new Set(materialAuditIds)].sort()})+'"';
}
