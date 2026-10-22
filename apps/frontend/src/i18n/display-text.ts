import { STATUS_LABELS } from "./status-labels.js";

const FIELD_LABELS: Readonly<Record<string, string>> = {
  tenant_id: "Empresa",
  ownership_class: "Ámbito del registro",
  created_at: "Fecha de creación",
  updated_at: "Última actualización",
  created_by_user_identity_id: "Autoría registrada",
  updated_by_user_identity_id: "Última modificación registrada",
  created_by_service_principal_id: "Procedencia automatizada",
  updated_by_service_principal_id: "Modificación automatizada",
  regulatory_source_id: "Procedencia normativa",
  claim: "Declaración de evidencia",
  reviewer_membership_id: "Revisor",
  executor_membership_id: "Ejecutor",
  requested_by_membership_id: "Solicitado por",
  soa_version: "Versión de la declaración",
  applicability_version: "Versión de aplicabilidad",
  tenant_control_version_id: "Versión del control de la organización",
  tenant_control_id: "Control de la organización",
  reference_control_version_id: "Versión del control de referencia",
  requirement_applicability_id: "Aplicabilidad",
  requirement_assessment_id: "Evaluación de requisito",
  statement_of_applicability_id: "Declaración de aplicabilidad",
  control_id: "Control",
  control_assessment_id: "Evaluación de control",
  assurance_test_id: "Prueba de control",
  evidence_request_id: "Solicitud de evidencia",
  evidence_id: "Evidencia",
  evidence_version_id: "Versión de evidencia",
  issue_id: "Hallazgo",
  action_id: "Acción",
  requirement_id: "Requisito",
  scope_subject_id: "Alcance",
  framework_version_id: "Versión del marco normativo",
  control_version_id: "Versión del control",
  based_on_control_version_id: "Versión del control base",
  methodology_version_ref: "Referencia metodológica",
  effective_configuration_id: "Configuración efectiva",
  business_owner_subject_id: "Responsable de negocio",
  assigned_membership_id: "Responsable asignado",
  retention_policy_id: "Política de retención",
  retention_policy_applicability_id: "Aplicabilidad de la política de retención",
  supersedes_applicability_id: "Aplicabilidad sustituida",
  source_evidence_version_id: "Versión de evidencia de la fuente",
  release_source_evidence_version_id: "Versión de evidencia del levantamiento",
  source_clause_ref: "Cláusula o disposición aplicable",
  custodian_display_name: "Custodio de la aplicabilidad",
  document_author_display_name: "Autor del documento",
  initial_source_bind_allowed: "Vinculación inicial disponible",
  ordinary_consumption_allowed: "Disponible como evidencia ordinaria",
  classification: "Clasificación",
  purpose: "Finalidad",
  policy_kind: "Tipo de política",
  policy_code: "Código de política",
  version_number: "Número de versión",
  trigger_event_code: "Evento de inicio de retención",
  precedence_rank: "Orden de precedencia",
  is_mandatory: "Obligatoria",
  retention_seconds: "Duración de retención (segundos)",
  processing_activity_id: "Actividad de tratamiento",
  legal_basis_id: "Contexto legal",
  file_object_id: "Archivo",
  applicability_decision: "Decisión de aplicabilidad",
  implementation_state: "Estado de implementación",
  justification: "Justificación",
  population_count: "Tamaño de la población",
  sample_count: "Tamaño de la muestra",
  sample_code: "Código de muestra",
  selection_method: "Método de selección",
  sample_period_start: "Inicio del período de muestra",
  sample_period_end: "Fin del período de muestra",
  rationale: "Fundamento",
  reason: "Motivo",
  result_status: "Estado del resultado",
  domain_conclusion: "Conclusión",
  coverage_percent: "Cobertura (%)",
  design_effectiveness: "Efectividad de diseño",
  operating_effectiveness: "Efectividad operativa",
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
  TENANT_DERIVED: "Derivado de la organización",
  public: "Pública",
  internal: "Interna",
  confidential: "Confidencial",
  restricted: "Restringida",
  evidence_document: "Documento de evidencia",
  insufficient_coverage: "Cobertura insuficiente",
  stale_source: "Fuente desactualizada",
  conflicting_sources: "Fuentes en conflicto",
  dependency_pending: "Dependencia pendiente",
  invalid_input: "Datos de entrada no válidos",
  source_error: "Error de la fuente",
  calculation_error: "Error de cálculo",
  not_tested: "Sin probar",
  finding: "Hallazgo",
  non_conformity: "No conformidad",
  gap: "Brecha",
  exception: "Excepción",
  audit_observation: "Observación de auditoría",
  legal_hold: "Suspensión del borrado por obligación legal",
  mandatory_regulatory_policy: "Política normativa obligatoria",
  contractual_policy: "Política contractual",
  tenant_policy: "Política de la organización",
  product_baseline: "Política base del producto",
  expiry_or_closure: "Vencimiento o cierre",
  PLATFORM_CONTROL: "Control base TCDX",
  GLOBAL_REFERENCE: "Control de referencia",
  TENANT_OWNED: "Control de la organización",
  NOT_YET_LICENSED: "Contenido aún no licenciado",
  non_authoritative_test_pack: "Paquete de prueba no autoritativo",
  NON_AUTHORITATIVE_TEST_PACK: "Paquete de prueba no autoritativo",
  provisional_supporting_reference: "Referencia provisional de apoyo",
  supporting_reference: "Referencia de apoyo",
  test_data_source: "Fuente de datos de prueba",
  LICENSED: "Contenido licenciado",
  preventive: "Preventivo",
  detective: "Detectivo",
  corrective: "Correctivo",
  directive: "Directivo",
  manual: "Manual",
  automated: "Automatizado",
  hybrid: "Híbrido",
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
  PLATFORM_ADMIN: "Administrador de la plataforma",
  PLATFORM_SUPPORT: "Soporte de la plataforma",
  TENANT_ADMIN: "Administrador de la empresa",
  PRIVACY_MANAGER: "Responsable de privacidad",
  LEGAL_REVIEWER: "Revisor legal",
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
  return FIELD_LABELS[field] ?? field.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "No informado";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "string") {
    if (VALUE_LABELS[value]) return VALUE_LABELS[value];
    if (/^[a-z][a-z0-9_]+$/.test(value) && value.includes("_")) return value.replaceAll("_", " ");
    return value;
  }
  return String(value);
}

export function roleLabel(value: string | undefined): string {
  if (!value) return "Rol autorizado";
  return ROLE_LABELS[value] ?? "Rol personalizado";
}

export function fieldPlaceholder(field: string): string {
  if(field==="provenance_ref")return "Describe la fuente o referencia de procedencia";
  if (field.endsWith("_id") || field.endsWith("_ref")) return "Selecciona una referencia autorizada";
  if (["items", "links", "samples"].includes(field)) return "Agrega elementos mediante los campos del formulario";
  if (field.includes("date") || field.endsWith("_at") || field.endsWith("_from") || field.endsWith("_to")) return "AAAA-MM-DD";
  return `Ingresa ${fieldLabel(field).toLowerCase()}`;
}

// Labels consume published values; they never define an allowed vocabulary.
export function publishedOptionLabel(value: string | number, context: "value" | "lifecycle" = "value"): string | undefined {
  if (typeof value === "number") return String(value);
  return context === "lifecycle" ? STATUS_LABELS[value] : VALUE_LABELS[value];
}

// Rector16 initial Subject types. Unknown extensions need their own published translation.
const SUBJECT_TYPE_LABELS: Readonly<Record<string, string>> = {
  organization: "Organización", organizational_unit: "Unidad organizativa", process: "Proceso",
  service: "Servicio", asset: "Activo", system: "Sistema", application: "Aplicación",
  data_asset: "Activo de datos", identity: "Identidad", group: "Grupo", supplier: "Proveedor",
  contract: "Contrato", location: "Ubicación", repository: "Repositorio", pipeline: "Flujo de procesamiento",
  cloud_account: "Cuenta de nube", cloud_resource: "Recurso de nube", project: "Proyecto", ticket: "Solicitud",
  document: "Documento", control: "Control", requirement: "Requisito", risk: "Riesgo",
  incident: "Incidente", audit: "Auditoría", action: "Acción"
};
export function subjectTypeLabel(value: string): string | undefined { return SUBJECT_TYPE_LABELS[value]; }
