import assets from './business-form-contracts.generated.json' with { type: 'json' };
import * as validators from './business-form-validators.generated.js';
import { tenantInstantToUtc, isUtcEndAfterStart } from './tenant-timezone.js';
import { ApiProblem } from './api-client.js';
import { fieldLabel } from './i18n/display-text.js';

export const businessForms = assets.forms;
export type BusinessForm = typeof businessForms[number];
export type FormErrors = Record<string, string>;
export type Schema = { type?: string; format?: string; $ref?: string; required?: string[]; properties?: Record<string, Schema>; minLength?: number; maxLength?: number; minimum?: number; maximum?: number; enum?: (string | number)[] };
const schemas = assets.schemas as Record<string, Schema>;
export function formForPath(path: string): BusinessForm | undefined { return businessForms.find(form => form.path === path); }
export function formSchema(form: BusinessForm): Schema { return schemas[form.schema]!; }
export function propertySchema(schema: string, field: string): Schema {
  const value = schemas[schema]?.properties?.[field] ?? {};
  return value.$ref ? schemas[value.$ref.split('/').at(-1)!]! : value;
}
export function requiredField(schema: string, field: string, values: Record<string, unknown> = {}): boolean {
  return !!schemas[schema]?.required?.includes(field) ||
    (schema==='EvidenceLinkCreateInput' && ['requirement_id','control_id','control_version_id','requirement_assessment_id','control_assessment_id','assurance_test_id'].includes(field) && Object.hasOwn(values,field)) ||
    (schema==='SoaItemCreateInput' && ['tenant_control_id','tenant_control_version_id'].includes(field) && !!(values.tenant_control_id||values.tenant_control_version_id)) ||
    (schema === 'ApplicabilityCreateRequest' && field === 'rationale' && values.applicability_decision === 'not_applicable') ||
    (schema.startsWith('RetentionPolicy') && field === 'retention_seconds' && values.policy_kind !== 'legal_hold');
}
export function normalizeForm(schema: string, values: Record<string, unknown>, timezone: string | null): { body: Record<string, unknown>; errors: FormErrors } {
  const body: Record<string, unknown> = {}; const errors: FormErrors = {};
  for (const [field, value] of Object.entries(values)) {
    if (value === '' || value === undefined) continue;
    const rule = propertySchema(schema, field);
    if (rule.type === 'integer' || rule.type === 'number') {
      const number = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(number) || (rule.type === 'integer' && (!Number.isSafeInteger(number) || !/^-?\d+$/.test(String(value))))) errors[field] = 'Ingresa un número válido sin pérdida de precisión.';
      body[field] = number;
    } else if (rule.format === 'date-time') {
      const utc = typeof value === 'string' ? tenantInstantToUtc(value, timezone) : null;
      if (!utc) errors[field] = 'Selecciona una fecha y hora válida en la zona de la empresa.';
      else body[field] = utc;
    } else body[field] = value;
  }
  return { body, errors };
}
/** Published schema plus documented cross-field invariants. API remains authoritative. */
export function validateForm(schema: string, body: Record<string, unknown>): FormErrors {
  const validator = (validators as unknown as Record<string, validators.Validator>)[schema];
  if (!validator) throw new Error(`Unpublished form schema: ${schema}`);
  const errors: FormErrors = {};
  validator(body);
  for (const error of validator.errors ?? []) {
    if (error.keyword === 'if' || error.schemaPath?.includes('/oneOf/')) continue;
    const field = (error.instancePath.slice(1).replaceAll('/', '.') || String(error.params.missingProperty ?? '_form'));
    const missing = error.keyword === 'required' ? String(error.params.missingProperty) : '';
    const key = missing && error.instancePath ? `${field}.${missing}` : missing || field;
    errors[key] = error.keyword === 'required' ? 'Completa este campo obligatorio.' : error.keyword === 'oneOf' ? 'Selecciona exactamente un objeto de referencia.' : error.keyword === 'maxLength' ? `Usa como máximo ${String(error.params.limit)} caracteres.` : error.keyword === 'minimum' || error.keyword === 'maximum' ? `Revisa el límite permitido: ${String(error.params.limit)}.` : 'Revisa el valor y el formato de este campo.';
  }
  const inspect = (row: Record<string, unknown>, prefix = '') => {
    const err = (field: string, message: string) => { errors[prefix + field] = message; };
    for (const [field,value] of Object.entries(row)) if (typeof value === 'string' && value.length && !value.trim()) err(field, 'Escribe un valor que no esté vacío.');
    for (const [start,end] of [['effective_from','effective_to'],['valid_from','valid_to'],['period_start','period_end'],['sample_period_start','sample_period_end']]) {
      if (typeof row[start!] === 'string' && typeof row[end!] === 'string' && !isUtcEndAfterStart(String(row[start!]),String(row[end!]))) err(end!, 'Debe ser posterior al inicio del intervalo.');
    }
    if (row.sample_count !== undefined && row.population_count !== undefined && Number(row.sample_count) > Number(row.population_count)) err('sample_count','La muestra no puede superar la población.');
    if (!!row.tenant_control_id !== !!row.tenant_control_version_id) err('tenant_control_version_id','Selecciona el control de la organización y su versión, o deja ambos sin seleccionar.');
  };
  inspect(body);
  for (const collection of ['items','links','samples']) if (Array.isArray(body[collection])) (body[collection] as Record<string, unknown>[]).forEach((row,index) => inspect(row,`${collection}.${index}.`));
  if (schema === 'ControlAssessmentSubmitRequest' && (body.design_effectiveness !== undefined) !== (body.operating_effectiveness !== undefined)) errors.operating_effectiveness = 'Completa conjuntamente la efectividad de diseño y la operativa.';
  // RetentionPolicy descriptions: duration required except legal_hold; no legal default.
  if (schema === 'RetentionPolicyCreateRequest' && body.policy_kind !== 'legal_hold' && body.retention_seconds === undefined) errors.retention_seconds = 'Indica la duración de retención.';
  return errors;
}
export function problemErrors(failure: unknown): FormErrors {
  if (!(failure instanceof ApiProblem) || [401,403,404].includes(failure.status)) return {};
  // Never echo server values, signed URLs, or raw internal messages.
  const fields=failure.problem.field_errors ?? (typeof failure.problem.details?.field==='string'?[{field:failure.problem.details.field}]:[]);
  return Object.fromEntries(fields.map(error => [error.field.replace(/\[(\d+)\]/g,'.$1'), 'Revisa este campo conforme a las condiciones de la operación.']));
}
export function formFailure(failure: unknown): string {
  if (failure instanceof ApiProblem) {
    if ([401,403].includes(failure.status)) return 'No tienes acceso a esta operación en la empresa seleccionada.';
    if (failure.status === 404) return 'La referencia no está disponible en tu alcance autorizado.';
    if (failure.status === 409) return 'El registro cambió o la operación entra en conflicto. Conservamos tus entradas; actualiza el detalle y revisa antes de confirmar de nuevo.';
    if (failure.status === 422) return 'La operación no cumple sus condiciones de negocio. Revisa los campos y los requisitos del objeto.';
  }
  return 'No pudimos completar la operación. Conservamos tus entradas para que puedas revisarlas.';
}
export function errorFieldLabel(path: string): string { return path.split('.').map(part => /^\d+$/.test(part) ? `fila ${Number(part)+1}` : fieldLabel(part)).join(' · '); }
