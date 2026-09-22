import { STATUS_LABELS } from "./status-labels.js";

const FIELD_LABELS: Readonly<Record<string, string>> = {
  requirement_applicability_id: "ID de aplicabilidad",
  requirement_assessment_id: "ID de evaluación",
  statement_of_applicability_id: "ID de declaración",
  control_id: "ID de control",
  control_assessment_id: "ID de evaluación de control",
  assurance_test_id: "ID de prueba",
  evidence_request_id: "ID de solicitud",
  evidence_id: "ID de evidencia",
  evidence_version_id: "ID de versión de evidencia",
  issue_id: "ID de hallazgo",
  action_id: "ID de acción",
  requirement_id: "ID de requisito",
  scope_subject_id: "ID del alcance",
  framework_version_id: "ID de versión del marco",
  control_version_id: "ID de versión del control",
  based_on_control_version_id: "ID del control base",
  methodology_version_ref: "Referencia metodológica",
  effective_configuration_id: "ID de configuración efectiva",
  business_owner_subject_id: "ID del responsable de negocio",
  assigned_membership_id: "ID de responsable asignado",
  retention_policy_id: "ID de política de retención",
  file_object_id: "ID de archivo",
  applicability_decision: "Decisión de aplicabilidad",
  rationale: "Fundamento",
  reason: "Motivo",
  result_status: "Estado del resultado",
  domain_conclusion: "Conclusión",
  coverage_percent: "Cobertura (%)",
  title: "Título",
  name: "Nombre",
  items: "Elementos",
  links: "Vínculos",
  control_code: "Código de control",
  request_code: "Código de solicitud",
  evidence_code: "Código de evidencia",
  issue_code: "Código de hallazgo",
  action_code: "Código de acción",
  test_code: "Código de prueba",
  description: "Descripción",
  objective: "Objetivo",
  control_type: "Tipo de control",
  nature: "Naturaleza",
  frequency_code: "Frecuencia",
  execution_method: "Método de ejecución",
  verification_method: "Método de verificación",
  minimum_evidence: "Evidencia mínima",
  suggested_owner_role_code: "Rol responsable sugerido",
  evidence_type: "Tipo de evidencia",
  source_kind: "Origen",
  issue_kind: "Tipo de hallazgo",
  severity: "Severidad",
  priority: "Prioridad",
  origin_role: "Rol de origen",
  verification_decision: "Decisión de verificación",
  sufficiency: "Suficiencia",
  relevance: "Relevancia",
  retest_reference: "Referencia de reevaluación",
  link_role: "Tipo de vínculo",
  samples: "Muestras",
  row_version: "Versión",
  lifecycle_state: "Estado",
  effective_from: "Vigente desde",
  effective_to: "Vigente hasta",
  valid_from: "Válida desde",
  valid_to: "Válida hasta",
  period_start: "Inicio del período",
  period_end: "Fin del período",
  expires_at: "Vence el",
  due_at: "Fecha límite",
  due_date: "Fecha límite",
  planned_at: "Fecha planificada",
  assessed_at: "Fecha de evaluación",
  approved_at: "Fecha de aprobación",
  published_at: "Fecha de publicación",
  submitted_at: "Fecha de envío",
  completed_at: "Fecha de término",
  verified_at: "Fecha de verificación",
  provenance_ref: "Referencia de procedencia",
  superseded_by_id: "Sustituida por"
};

const VALUE_LABELS: Readonly<Record<string, string>> = {
  ...STATUS_LABELS,
  applicable: "Aplicable",
  not_applicable: "No aplicable",
  partially_applicable: "Aplicable parcialmente",
  compliant: "Conforme",
  non_compliant: "No conforme",
  partially_compliant: "Conforme parcialmente",
  effective: "Efectivo",
  ineffective: "No efectivo",
  partially_effective: "Efectivo parcialmente",
  valid: "Válido",
  invalid: "No válido",
  insufficient_data: "Datos insuficientes",
  insufficient_evidence: "Evidencia insuficiente",
  no_data: "Sin datos",
  document: "Documento",
  upload: "Carga de archivo",
  high: "Alta",
  medium: "Media",
  low: "Baja",
  accepted: "Aceptada",
  closure: "Cierre"
};

const ROLE_LABELS: Readonly<Record<string, string>> = {
  "GRC Manager": "Responsable GRC",
  GRC_MANAGER: "Responsable GRC",
  COMPLIANCE_MANAGER: "Responsable de cumplimiento",
  CONTROL_OWNER: "Responsable de control",
  EVIDENCE_OWNER: "Responsable de evidencia",
  ACTION_OWNER: "Responsable de acción",
  AUDITOR: "Auditor",
  AUDITOR_LEAD: "Auditor líder",
  VIEWER: "Consulta"
};

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? "Campo contractual";
}

export function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "No informado";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "string") {
    if (VALUE_LABELS[value]) return VALUE_LABELS[value];
    if (/^[a-z][a-z0-9_]+$/.test(value) && value.includes("_")) return "Valor contractual";
    return value;
  }
  return String(value);
}

export function roleLabel(value: string | undefined): string {
  if (!value) return "Rol autorizado";
  return ROLE_LABELS[value] ?? "Rol autorizado";
}

export function fieldPlaceholder(field: string): string {
  if (field.endsWith("_id") || field.endsWith("_ref")) return "Ingresa el identificador autorizado";
  if (["items", "links", "samples"].includes(field)) return "Ingresa el objeto JSON según el contrato";
  if (field.includes("date") || field.endsWith("_at") || field.endsWith("_from") || field.endsWith("_to")) return "AAAA-MM-DD";
  return `Ingresa ${fieldLabel(field).toLowerCase()}`;
}
