# Arquitectura de navegación empresarial

Fecha: 2026-10-08. Autoridad: TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23. HEAD: main / 6af66387aa03fa185ef139584de07700f247b903. Alcance: diseño documental, sin implementación.

La navegación parte del objeto que el usuario reconoce y continúa con una acción empresarial. Los UUID permanecen en los payloads canónicos; ninguna operación habitual pide copiar identificadores o redactar JSON. La regla transversal del Product Owner es obligatoria: «Ningún módulo de Tecdex GRC podrá considerarse funcionalmente terminado si sus operaciones habituales requieren que el usuario empresarial conozca identificadores técnicos, estructuras JSON o relaciones internas de la base de datos.»

Este diseño satisface el task packet documental 6A.2. Propuestas de nuevas lecturas/vocabularios son DRAFT y requieren decisión humana y publicación contractual antes de código. El PASS documental no aprueba esos contratos ni gates humanos de rector45. Se preservan Phase5 PASS/closed, CORE_GRC_SLICE histórico y Risk/Incidents not started.

## Autoridad y estructura

Rector46 → modelo canónico/rector08/30 → modelo físico congelado → OpenAPI/matriz/Permission → backend → UI. Fuentes principales: `docs/phase6a/STEP_6A1/01_SOURCE_INVENTORY.md`, `docs/phase6a/STEP_6A1/02_FORM_FIELD_MATRIX.csv`, `docs/phase6a/STEP_6A1/03_CANONICAL_REFERENCE_RESOLUTION.md`, `docs/phase6a/STEP_6A1/04_WORKFLOW_DEPENDENCY_MAP.md`, `docs/phase6a/STEP_6A1/07_PHASE6A_IMPLEMENTATION_BACKLOG.md`. Contratos: `docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml`, `docs/executable-contracts/03_API_RESOURCE_OPERATION_MATRIX.md`, `docs/executable-contracts/05_PERMISSION_CATALOG.md`. Protección: rector22/24/25/31/43/45, con paths concretos indexados en 6A.1/01.

Conservar shell, grupos sidebar y workspaces existentes; añadir contexto dentro de ellos. Framework/version/requisitos son un explorador de dependencias de Compliance, no un administrador de Regulatory Packs. Document/DocumentVersion son conceptos canónicos distintos; no hay comando/pantalla Phase5 que autorice crear Documents desde Evidence. La relación histórica se conserva como no soportada para creación actual. No introducir una UI framework o sistema visual paralelo.

Visual vigente: `docs/ui/VISUAL_BASELINE_MANIFEST.json`, sus seis contratos activos v1.0 y `docs/ui/assets/brand/tecdex-logo-light.svg`. Candidato v1.2 permanece pendiente; no autoridad activa. Reusar ControlVersionSelect, SubjectSelect, MethodologySelect, DetailDrawer, StatePanel y API client observados en `apps/frontend/src/core-grc.tsx` y `apps/frontend/src/api-client.ts`; completar cursor/keyboard en esos patrones. Breadcrumb/context panel conserva tokens/densidad y labels españoles. No cambios visuales ni HUMAN_UI_REVIEW autoaprobado en este paso.

## Patrones de interacción

| Patrón | Entrada y comportamiento | Preservación contractual |
| --- | --- | --- |
| A Crear desde contexto | Acción del padre autorizado abre formulario con etiqueta y referencia readonly; confirmar antes de enviar | FK exacta / path parent según operación, releer autorización |
| B Seleccionar existente | Picker específico de entidad, dependencia padre/versión y paginación cursor | Sólo resultados autorizados; write permission separado |
| C Continuar workflow | Detalle muestra estado actual, siguiente acción y efecto; cero-input usa confirmación contextual | Comando, estado fuente, SoD y concurrency existentes |
| D Configuración efectiva | Metodología visible publicada, configuración opcional conforme a RR-G02 | Ninguna configuración inventada ni JSON manual; conflicto explícito |
| E Crear dependencia | Sólo si hay command y permiso propios; guardado explícito seguido de lectura y selección visible | No creación silenciosa, catálogo duplicado o grant implícito |
| F Retorno | Cancelar/guardar vuelve al padre autorizado y restaura filtro/cursor/foco | Tenant cambiado invalida contexto y cache de labels |
| G Vacío | Explica requisito inexistente/no elegible/no publicado/estado | Error temporal no se convierte en lista vacía; no fallback |
| H Denegado | Mensaje genérico sin existencia/cantidad/IDs ajenos; orientación autorizada | Default DENY y ausencia de autoridad Platform→Tenant |

## Todas las dependencias históricas preservadas

DEP_ID corresponde al orden exacto de la primera tabla de 6A.1/04. Los 38 vínculos confirmados se conservan, incluidos los dos que no tienen creación UI soportada. Los 29 clasificados UI_NAVIGATION_MISSING se diseñan en 02; no se inventan nuevos enlaces para satisfacer expectativas conceptuales. Operaciones y estados son los históricos, no nuevas restricciones de aprobación/activo si no están demostradas.

| DEP_ID | Source | Destination | Actual canonical relationship | Requiredness | Operation | Permitted state / constraint | Permission | Navigation classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DEP-01 | FrameworkVersion | Requirement | Requirement.framework_version_id | required | requirementList | Pack visibility; no current-requirement lifecycle filter | compliance.requirement.read | UI_NAVIGATION_MISSING |
| DEP-02 | Requirement | RequirementApplicability | requirement_id | required | applicabilityCreate | Accessible reference; draft generated | compliance.applicability.create + requirement.read | UI_NAVIGATION_MISSING |
| DEP-03 | Subject | RequirementApplicability | scope_subject_id | optional; NULL = tenant-wide | applicabilityCreate | active/effective Subject | organization.subject.read + compliance.applicability.create | UI_NAVIGATION_MISSING |
| DEP-04 | RequirementApplicability | RequirementAssessment | requirement_applicability_id | required | requirementAssessmentCreate | Handler checks existence/tenant; no approval-state create guard found | compliance.requirement_assessment.create + applicability.read | UI_NAVIGATION_MISSING |
| DEP-05 | ComplianceMethodology | RequirementAssessment | methodology_version_ref | required | requirementAssessmentCreate | published/effective/domain-compatible | compliance.methodology.read + requirement_assessment.create | EXISTING_UI_PATTERN_OR_CONTEXT |
| DEP-06 | EffectiveConfiguration | RequirementAssessment / ControlAssessment | effective_configuration_id | optional | requirementAssessmentCreate / controlAssessmentCreate | same tenant/domain; published definition; missing business resolution contract | configuration.effective_configuration.read; assessment create | UI_NAVIGATION_MISSING |
| DEP-07 | FrameworkVersion | SoA | framework_version_id | required | soaCreate | Accessible version; header starts draft | compliance.soa.create; framework discovery RR-G01 | UI_NAVIGATION_MISSING |
| DEP-08 | SoA | SoAItem | statement_of_applicability_id | required header; one+ items | soaCreate | Atomic draft header/item creation | compliance.soa.create | UI_NAVIGATION_MISSING |
| DEP-09 | Reference ControlVersion | SoAItem | reference_control_version_id | required per item | soaCreate | Accessible reference version | controls.control.read + compliance.soa.create | UI_NAVIGATION_MISSING |
| DEP-10 | Tenant Control + ControlVersion | SoAItem | tenant_control_id + tenant_control_version_id | optional compatible pair | soaCreate | both or neither; matching tenant parent/version | controls.control.read + compliance.soa.create | UI_NAVIGATION_MISSING |
| DEP-11 | Global ControlVersion | Tenant Control | based_on_control_version_id | required for instantiate | controlInstantiate | Pack-entitled base; tenant active generated | controls.control.create + control.read | UI_NAVIGATION_MISSING |
| DEP-12 | Subject | Tenant Control / Evidence / Issue | business_owner_subject_id | required Control; optional Evidence/Issue | controlInstantiate / evidenceCreate / issueCreate | Control checks selectable Subject; other handlers check tenant existence | organization.subject.read + domain create | EXISTING_UI_PATTERN_OR_CONTEXT |
| DEP-13 | Tenant Control + ControlVersion | ControlAssessment | control_id + control_version_id | required compatible pair | controlAssessmentCreate | same tenant, version matches control | controls.control_assessment.create + control.read | UI_NAVIGATION_MISSING |
| DEP-14 | ControlEffectivenessMethodology | ControlAssessment | methodology_version_ref | required | controlAssessmentCreate | published/effective/domain-compatible | controls.methodology.read + control_assessment.create | EXISTING_UI_PATTERN_OR_CONTEXT |
| DEP-15 | Tenant Control + ControlVersion | AssuranceTest | control_id + control_version_id | required compatible pair | assuranceTestCreate | same tenant, version matches control | controls.assurance_test.create + control.read | UI_NAVIGATION_MISSING |
| DEP-16 | AssuranceTest | AssuranceSample | assurance_test_id | optional samples array | assuranceTestExecute | in_progress; counts/period/result validated | controls.assurance_test.execute | UI_NAVIGATION_MISSING |
| DEP-17 | Requirement | EvidenceRequest | requirement_id | exactly one of five typed targets | evidenceRequestCreate | Accessible target; no target lifecycle gate in create handler | compliance.requirement.read + evidence.evidence_request.create | UI_NAVIGATION_MISSING |
| DEP-18 | Control | EvidenceRequest | control_id | exactly one of five typed targets | evidenceRequestCreate | Accessible target; no target lifecycle gate in create handler | controls.control.read + evidence.evidence_request.create | UI_NAVIGATION_MISSING |
| DEP-19 | RequirementAssessment | EvidenceRequest | requirement_assessment_id | exactly one of five typed targets | evidenceRequestCreate | Accessible target; no target lifecycle gate in create handler | compliance.requirement_assessment.read + evidence.evidence_request.create | UI_NAVIGATION_MISSING |
| DEP-20 | ControlAssessment | EvidenceRequest | control_assessment_id | exactly one of five typed targets | evidenceRequestCreate | Accessible target; no target lifecycle gate in create handler | controls.control_assessment.read + evidence.evidence_request.create | UI_NAVIGATION_MISSING |
| DEP-21 | AssuranceTest | EvidenceRequest | assurance_test_id | exactly one of five typed targets | evidenceRequestCreate | Accessible target; no target lifecycle gate in create handler | controls.assurance_test.read + evidence.evidence_request.create | UI_NAVIGATION_MISSING |
| DEP-22 | TenantMembership | EvidenceRequest / Action | assigned_membership_id | optional | evidenceRequestCreate / actionCreate | existence + same tenant; active-only eligibility not established | domain create; assignee lookup RR-G03 | UI_NAVIGATION_MISSING |
| DEP-23 | FileUploadIntent | FileObject | file_object_id on promotion | required upload path | uploadIntentCreate / uploadFinalize | quarantine -> scanning -> promoted; scan PASS | evidence.document.create/update | EXISTING_UI_PATTERN_OR_CONTEXT |
| DEP-24 | FileObject | EvidenceVersion | file_object_id | required for current evidenceCreate | evidenceCreate | finalized, same tenant, scan passed | evidence.evidence.create | EXISTING_UI_PATTERN_OR_CONTEXT |
| DEP-25 | RetentionPolicy | FileObject / Evidence | retention_policy_id | required | uploadIntentCreate / evidenceCreate | allowed global/same tenant; exact selector eligibility RR-G04 | domain create + governed retention read | UI_NAVIGATION_MISSING |
| DEP-26 | Document | DocumentVersion | document_id | required child | No business Document UI/command in these workspaces | Canonical version relationship; not new UI authority | No Phase 5 Document read established | RELATION_NOT_SUPPORTED_IN_PRESENT_UI |
| DEP-27 | DocumentVersion | EvidenceVersion | document_version_id | optional canonical relation | No current evidenceCreate input | Projection is returned but current create supports FileObject | evidence.evidence.read for parent | RELATION_NOT_SUPPORTED_IN_PRESENT_UI |
| DEP-28 | Evidence | EvidenceVersion | evidence_id | required; first version atomic | evidenceCreate / evidenceGet | draft then version workflow | evidence.evidence.create/read | EXISTING_UI_PATTERN_OR_CONTEXT |
| DEP-29 | EvidenceVersion | Requirement / Control / ControlVersion / RequirementAssessment / ControlAssessment / AssuranceTest | EvidenceLink typed FK | one+ links; exactly one target per link | evidenceCreate | Accessible target; ControlVersion-only never proves tenant implementation | evidence.evidence.create + exact target read | UI_NAVIGATION_MISSING |
| DEP-30 | EvidenceVersion | EvidenceReview | evidence_id + evidence_version_id | review record on approve/reject | evidenceApprove / evidenceReject | under_review; independent submitter/reviewer | evidence.evidence.approve/reject | UI_NAVIGATION_MISSING |
| DEP-31 | EvidenceVersion | EvidenceRequest fulfillment | evidence_request_fulfillments | required selected version | evidenceRequestFulfill | request open; eligible approved version + matching typed target | evidence.evidence_request.submit + evidence.evidence.read | UI_NAVIGATION_MISSING |
| DEP-32 | RequirementAssessment | Issue | IssueOrigin.requirement_assessment_id | exactly one of three create origins | issueCreate | Accessible tenant origin; no source lifecycle create guard found | compliance.requirement_assessment.read + remediation.issue.create | UI_NAVIGATION_MISSING |
| DEP-33 | ControlAssessment | Issue | IssueOrigin.control_assessment_id | exactly one of three create origins | issueCreate | Accessible tenant origin; no source lifecycle create guard found | controls.control_assessment.read + remediation.issue.create | UI_NAVIGATION_MISSING |
| DEP-34 | AssuranceTest | Issue | IssueOrigin.assurance_test_id | exactly one of three create origins | issueCreate | Accessible tenant origin; no source lifecycle create guard found | controls.assurance_test.read + remediation.issue.create | UI_NAVIGATION_MISSING |
| DEP-35 | Issue | Action | issue_id | required path parent | actionCreate | Same tenant existing issue; initial pending | remediation.action.create + issue.read | UI_NAVIGATION_MISSING |
| DEP-36 | EvidenceVersion | Action closure | action_evidence_links.evidence_version_id | required complete | actionComplete | Action in_review; eligible approved evidence version | remediation.action.transition + evidence.evidence.read | UI_NAVIGATION_MISSING |
| DEP-37 | Action | ActionVerification | action_id | required command context | actionVerify | completed; accepted; independent verifier/completer/assignee | remediation.action.verify | UI_NAVIGATION_MISSING |
| DEP-38 | Requirement | ControlVersion | RequirementControlMapping | canonical M:N mapping | controlList / controlGet | Entitled framework/control references; applicability uses effective approved rows | controls.control.read; applicability.read for decisions | EXISTING_UI_PATTERN_OR_CONTEXT |

## Relaciones rechazadas

| DEP_ID | Source | Destination | Actual canonical relationship | Relationship classification |
| --- | --- | --- | --- | --- |
| DEP-39 | ControlAssessment | AssuranceTest | No direct parent FK established | RELATION_NOT_SUPPORTED |
| DEP-40 | RequirementApplicability | SoAItem | Distinct canonical concepts; no direct link established | RELATION_NOT_SUPPORTED |

Document → DocumentVersion (DEP-26) y DocumentVersion → EvidenceVersion (DEP-27) son relaciones confirmadas: no confundir ausencia de comando UI con ausencia de relación. No añadir document_id ni document_version_id a evidenceCreate. ControlAssessment → AssuranceTest directo y RequirementApplicability → SoAItem directo se rechazan; selección usa el Control padre o ControlVersion real, nunca FK inventada.

## Contratos UI → API

Selector: tenant validado y parámetros declarados → lista paginada mínima → etiqueta humana; errores preservan código/correlación. Selección: almacenar ID canónico + versión/label autorizado en estado efímero de UI, sin tabla paralela; revalidar antes de comando. Contexto: parent/read + tenant + return location local; URL no prueba de autorización. Creación: payload schema de 07, omitir opcionales ausentes, Idempotency-Key por intención estable. Transición: path ID del detalle y expected_version existente; retention usa If-Match fuerte. Guardar retry con mismo key/payload; payload cambiado requiere nueva intención/key. 409 relee y solicita decisión empresarial, sin override silencioso. API conserva auditoría/outbox/idempotencia. Retorno no persiste información sensible en URL ni storage compartido entre tenants.

Clasificaciones: EXISTING_OPERATION se consume igual; EXISTING_OPERATION_NEEDS_UI_ADAPTER añade representación sin cambiar contrato; NEW_READ_OPERATION_REQUIRED sólo las propuestas DRAFT de 04; UNSUPPORTED_BY_CANONICAL_MODEL nunca habilita comando/relación. Ninguna ruta nueva se presenta como existente.

Dominios: https://grc.tecdex.net/ ; https://iam.grc.tecdex.net/ ; issuer https://iam.grc.tecdex.net/realms/tcdx-managed-identity ; callback https://grc.tecdex.net/auth/callback. Sin alias/fallback.

## Salvaguardas explícitas

Se rechazan reemplazar UUID por códigos manuales como FK, lookup tables/catálogos duplicados, vocabularios frontend hardcodeados, JSON arbitrario, fake tenant, lookup default-allow o global sin política tenant, cambios de schema para comodidad UI, writes SQL directos, bypass de comandos canónicos, validación debilitada, creación escondida de dependencias, confusión Platform/Tenant, grants amplios implícitos y capas de compatibilidad legacy. Risk e Incidents/Loss no se diseñan ni inician. Las nuevas lecturas DRAFT reutilizan entidades existentes y pasan aprobación/publicación antes del código.
