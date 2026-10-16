# 28 - Pre-Implementation Contract Gate

## 1. Objetivo

Impedir que ambigüedades funcionales, semánticas o de datos se conviertan prematuramente en schema, API, reglas runtime o deuda técnica.

El gate posee dos alcances explícitos:

- `PASS_FOR_PHYSICAL_MODEL_DESIGN`: autoriza únicamente derivar y revisar el modelo físico; exige cierre semántico suficiente para DDL propuesto, pero no commands/endpoints ejecutables completos.
- `PASS_FOR_IMPLEMENTATION`: permite pasar de `DESIGN` a `IMPLEMENTATION_AUTHORIZED`; exige además `PHYSICAL_DATA_MODEL_REVIEW=PASS` y `EXECUTABLE_CONTRACTS=PASS`.

Un PASS parcial nunca se presenta como autorización de migrations o runtime.

## 2. Gates

### G1 Product Scope
PASS si dominios, experiencias y exclusiones están definidos.

### G2 Domain Ownership
PASS si cada entidad/concepto tiene único write owner y no hay cross-domain direct writes.

### G3 Canonical Model
PASS si entidades, IDs, tenant ownership, cardinalidades, business keys, lifecycle, temporalidad, versioning e invariants están definidos. Debe reconciliarse expresamente con 33, 40 y 44, incluyendo la separación NormativeUnit/Requirement/Control/Issue.

### G4 Integration Representation
PASS si fuentes externas pueden representarse sin tablas/ad-hoc semantics por conector.

### G5 Metrics & Methodology
PASS si métricas oficiales, no-data semantics, fórmulas base y metodologías GRC están definidas/versionables; `calculation_status`, `result_status` y `domain_conclusion` no se mezclan.

### G6 Rules & Impact
PASS si consecuencias automáticas/humanas y mappings están delimitados.

### G7 Lifecycle
PASS para diseño físico si todos los workflows tienen estados y la entidad canónica `LifecycleTransitionDefinition` permite representar actor, preconditions y side effects. PASS para implementación sólo cuando cada arista usada por un command está publicada en el registry ejecutable.

### G8 RBAC
PASS para diseño físico si el modelo Permission/Scope/SoD y sus relaciones son representables. PASS para implementación sólo si permissions/scopes/SoD cubren cada command incluido en los contratos ejecutables.

### G9 Temporal/Retention
PASS si snapshot, correction, recalculation, retention y deletion están cerrados.

### G10 Evidence
PASS si storage/security/review/expiry están cerrados.

### G11 API/Event Integrity
PASS para diseño físico si idempotency, concurrency, outbox, audit y error model poseen entidades e invariantes representables. PASS para implementación sólo cuando cada command/event/error planeado está congelado en los contratos ejecutables.

### G12 Non-functional
PASS si tenant isolation, secrets, observability, performance targets y release security gates están definidos.

### G13 Connectors
PASS para diseño lógico si Jira/Confluence/GitHub/M365/AWS son representables de punta a punta sin modificar el canonical model. PASS para implementar un conector específico sólo si su `ConnectorVersion` contractual a nivel de campos está publicada conforme a 20.

### G14 Traceability
PASS para diseño físico si para cada experiencia crítica existe una cadena conceptual sin entidad huérfana. PASS para implementación sólo cuando la fila ejecutable contiene DB object, endpoint, permission, eventos y tests congelados:

`Input -> Entity -> Command -> State -> Measurement -> Rule -> Impact -> Result Envelope -> Permission -> Audit -> Test`.

`Result Envelope` no implica entidad `Result` genérica.

### G15 Semantic Integrity
PASS si no quedan términos con múltiples significados incompatibles, pipelines alternativos, ownership duplicado ni TODO/TBD que afecten schema/API/domain behavior. Debe incluir scan explícito contra 32, 33, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44 y 45.

El scan debe verificar específicamente:

- catálogo de entidades vs términos contractuales;
- aliases/status no canónicos;
- Result/DomainResult;
- RiskAppetite/RiskTolerance naming;
- Impact/Likelihood scale references;
- SourceResolution;
- EffectiveConfiguration;
- ErasureExecutionRecord;
- Data Trust/DataQualityAssessment;
- residual risk ranges;
- propagación de status.
- Clause/NormativeUnit vs Requirement;
- Requirement vs Issue/Gap;
- RequirementControlMapping vs NormativeUnitControlMapping;
- controles de referencia vs controles tenant.
- RequirementApplicability vs StatementOfApplicabilityItem;
- FrameworkCrosswalk y mappings tipados por clase de objeto;
- RequirementApplicability tenant-wide vs Subject-scoped;
- EvidenceLink Control vs ControlVersion y targets de EvidenceRequest;
- IssueOrigin y sus orígenes tipados;
- ownership_class/tenant_id en eventos globales, plataforma y tenant;
- Tenant como ownership vs Organization/Subject como scope.
- decisiones abiertas que Codex podría resolver por preferencia técnica;
- alternativas múltiples sin Decision Record humano aprobado;
- task packets sin archivos permitidos, contratos afectados, criterio de aceptación o acciones prohibidas;
- gates o ADR que dependan exclusivamente de autoaprobación de Codex.

## 3. Evidencia del gate

El gate debe generar `PRE_IMPLEMENTATION_GATE_REPORT.md` con una fila explícita para G1–G15, alcance evaluado, evidencia, PASS/FAIL, contradicciones y decision log. Un resumen temático no sustituye esta matriz.

## 4. Gate especial pre-modelo físico

PASS sólo si `39_DECISIONES_SEMANTICAS_FINALES_PRE_MODELO_FISICO.md`, `40_CIERRE_INTEGRIDAD_SEMANTICA_Y_CONTRATOS_FISICOS.md` y `44_CONTRATO_ESTRUCTURA_NORMATIVA_REQUISITOS_CONTROLES.md` están vigentes y el diseño físico puede derivar sin inventar decisiones sobre effectiveness, escalas de riesgo, appetite/tolerance, Data Trust, source precedence, Subject identity, erasure, timezone, IDs, tenant ownership, configuration precedence, result semantics, deletion policy, estructura normativa, atomicidad de Requirements, origen de Controls o crosswalks.

`PASS_FOR_PHYSICAL_MODEL_DESIGN` autoriza exclusivamente diseño/revisión física. No autoriza migrations ni funcionalidad runtime.
