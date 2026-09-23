# 30 - Modelo lógico relacional canónico antes del modelo físico

## 1. Propósito

Fijar relaciones y cardinalidades antes de crear tablas PostgreSQL. El catálogo nominal vinculante es 33; este documento no puede introducir entidades nuevas no catalogadas.

## 2. Platform / Organization

Tenant 1--N Organization
Tenant determina ownership y aislamiento. Organization/Subject determinan alcance funcional cuando corresponda; `organization_id` no sustituye `tenant_id` ni se propaga indiscriminadamente a todas las entidades tenant-owned.
Organization 1--N OrganizationalUnit
OrganizationalUnit N--N Process (mediante ownership/participation)
Process 1--N Service
Service N--N Asset
Supplier N--N Service mediante SupplierService. Supplier es propiedad de Third Parties; Organization sólo lo referencia.
UserIdentity N--N Tenant mediante TenantMembership
UserIdentity N--N Role(PLATFORM_CONTROL) mediante PlatformRoleAssignment, sin Tenant ni TenantMembership
TenantMembership N--N Role mediante MembershipRole dentro del mismo tenant; no concede autoridad platform
Plan 1--N PlanVersion
Tenant 1--N Subscription
Subscription N--1 PlanVersion
PlanVersion N--N Capability mediante Entitlement

## 3. Regulatory / Controls

Framework 1--N FrameworkVersion
RegulatoryPack 1--N RegulatoryPackVersion
RegulatoryPackVersion N--N FrameworkVersion
RegulatoryPackVersion 1--N RegulatoryImportManifest y RegulatoryCoverageManifest
RegulatoryImportManifest N--1 RegulatorySource
FrameworkVersion 1--N NormativeUnit
NormativeUnit 0..1--N NormativeUnit mediante parent_normative_unit_id, siempre dentro de la misma FrameworkVersion
NormativeUnit 1--0..N Requirement; cada Requirement posee exactamente una NormativeUnit primaria
FrameworkVersion N--N FrameworkVersion mediante FrameworkCrosswalk
FrameworkCrosswalk 1--N NormativeUnitCrosswalkMapping y/o RequirementCrosswalkMapping y/o ControlCrosswalkMapping
RequirementApplicability N--1 Tenant y N--1 Requirement.
RequirementApplicability posee exactamente un scope efectivo: tenant-wide (`scope_subject_id` NULL) o un `Subject` del mismo tenant (`scope_subject_id` NOT NULL). Para múltiples scopes se crean registros de applicability distintos; no se usa un array/blob ni un `(type,id)` genérico. Business key mínima: tenant + requirement + scope_subject_id + validity/version.
RequirementApplicability 1--0..N RequirementAssessment
StatementOfApplicability 1--N StatementOfApplicabilityItem; cada item referencia ControlVersion de referencia y opcionalmente el Control/ControlVersion tenant que lo implementa
Requirement N--N ControlVersion mediante RequirementControlMapping versionado
NormativeUnit N--N ControlVersion mediante NormativeUnitControlMapping versionado para ubicación/provenance de controles de referencia
Control 1--N ControlVersion
ControlVersion global 1--0..N Control tenant mediante `based_on_control_version_id`; un Control `tenant_defined` puede no tener referencia global
Control N--N Subject mediante ControlScope
Control 1--N ControlAssessment
Control 1--N AssuranceTest

## 4. Evidence

Document 1--N DocumentVersion
Evidence 1--N EvidenceVersion
EvidenceVersion N--N Requirement/Control/ControlVersion/RequirementAssessment/ControlAssessment/AssuranceTest mediante EvidenceLink tipado. `Control` identifica la implementación tenant; `ControlVersion` identifica la versión de referencia o la versión concreta cuando corresponda. Ninguno sustituye al otro.
Evidence 1--N EvidenceReview
EvidenceRequest referencia exactamente un target permitido: Requirement, Control, RequirementAssessment, ControlAssessment o AssuranceTest, y puede satisfacerse por N EvidenceVersion. El target se implementa con FKs tipadas/constraints equivalentes; queda prohibido un `(target_type,target_id)` sin integridad referencial.

## 5. Risk

RiskMethodology N--1 ImpactScaleDefinition versionada
RiskMethodology N--1 LikelihoodScaleDefinition versionada
Risk N--N Subject mediante RiskScope
Risk 1--N RiskAssessment
Risk N--N Control mediante RiskControlMapping
Risk 1--N RiskTreatment
Risk N--N KRI mediante RiskKriMapping
Risk 0..N RiskAcceptance
RiskAppetitePolicy y RiskTolerancePolicy se aplican por scope/metodología/effective interval; no son atributos mutables embebidos en Risk.
LossEvent N--N Risk y N--N Incident mediante relaciones tipadas.

## 6. Remediation

Issue N--N origen mediante IssueOrigin. Cada IssueOrigin referencia exactamente un origen permitido: RequirementAssessment, ControlAssessment, AssuranceTest, AuditTest, Risk, Incident o SupplierAssessment. La implementación usa FKs tipadas/constraints equivalentes; queda prohibido un `(source_type,source_id)` sin integridad referencial.
Issue 1--N Action
Action 1--N ActionVerification
Action N--N EvidenceVersion como closure evidence.

## 7. Audit

Audit 1--N AuditWorkpaper
AuditWorkpaper 1--N AuditTest
AuditTest N--N EvidenceVersion
AuditTest puede originar Issue/Finding; no modifica directamente target.

## 8. Operations

Incident N--N Subject
Supplier 1--N SupplierAssessment
Process/Service 1--N BIA versions
BIA 1--N ContinuityPlan relation as applicable
PrivacyProcessingActivity N--N Subject/Supplier/DataAsset.

## 9. Data / Integration / Results

Integration 1--N SyncRun
SyncRun 1--N RawRecord
RawRecord 0..N Observation
Subject 1--N Observation
Observation N--0..N SourceResolution como candidate/selected input
SourcePrecedencePolicy 1--N SourceResolution
MetricDefinition 1--N MetricMeasurement
MetricMeasurement N--N Observation/SourceResolution mediante CalculationInput/DataLineage
MetricMeasurement 0..N DataQualityAssessment según scope/version
CalculationRun 1--N CalculationInput y 0..N MetricMeasurement/result outputs
RuleDefinition 1--N RuleEvaluation
RuleEvaluation N--N MetricMeasurement/Observation inputs
RuleEvaluation 0..N GRCImpact
Snapshot N--N MetricMeasurement y/o entidades de dominio resultantes mediante SnapshotItem tipado.

`Result` y `DomainResult` son envelopes/conceptos, no entidades lógicas independientes. `SnapshotItem` referencia la entidad canónica concreta y su status/conclusion/version; no existe FK a tabla genérica `DomainResult`.

## 10. Configuration

ConfigurationDefinition 1--N ConfigurationOverride
EffectiveConfiguration N--1 ConfigurationDefinition/scope resolution y referencia todas las capas/versions participantes.
MetricMeasurement, RuleEvaluation, RiskAssessment o Snapshot publicado que dependa de configuración debe poder referenciar la EffectiveConfiguration utilizada.

## 11. Privacy / Surveys / Reporting

PrivacyProcessingActivity N--N DataCategory/DataSubjectCategory/Recipient/Supplier/Subject mediante links tipados.
DPIA N--1 PrivacyProcessingActivity (o scope compuesto) y puede originar Risk/Issue por commands.
DataSubjectRequest 0..N ErasureExecutionRecord; cada ErasureExecutionRecord referencia RetentionPolicy/legal hold decisions, objetos afectados/excluidos y AuditEvent.
Survey 1--N SurveyVersion; SurveyVersion 1--N Question/Option; Campaign N--1 SurveyVersion; Response N--1 Campaign; Answer N--1 Response.
ReportDefinition 1--N ReportRun; ReportRun 1--N ReportArtifact; ReportRun referencia Snapshot(s) concretos.

## 12. Knowledge / AI

KnowledgeItem versionado y scoped global/tenant.
AIRecommendation N--1 actor context, N--N source objects mediante provenance links; aceptar recommendation genera DomainCommand, no mutación directa.

## 13. Invariantes relacionales

- toda relación tenant-owned conserva mismo tenant;
- FKs cross-tenant imposibles por constraint/service boundary;
- mappings poseen validity/version;
- relaciones polimórficas críticas no se implementan sólo con `(type,id)` sin integridad: usar link tables tipadas o registry canónico con FK;
- no usar cascade delete sobre audit/history/evidence publicada;
- uniqueness usa business key + tenant + validity/version cuando aplique;
- escalas/metodologías/policies publicadas son inmutables y referenciables históricamente;
- resultados oficiales conservan lineage a CalculationRun, EffectiveConfiguration y SourceResolution cuando aplique.
- `LifecycleTransitionDefinition` referencia entity type, Permission y códigos de policy/event sin introducir una segunda autoridad del workflow de dominio.
- `NormativeUnit` no se usa como Requirement, target de assessment tenant ni Issue; las vistas por unidad agregan descendientes.
- Requirement y NormativeUnit comparten FrameworkVersion y tienen business keys separadas; la jerarquía NormativeUnit impide ciclos.
- `RequirementControlMapping` expresa contribución al cumplimiento; `NormativeUnitControlMapping` expresa ubicación editorial/provenance y no son intercambiables.
- controles `regulatory_reference`/`tcdx_baseline` y `tenant_instantiated`/`tenant_defined` preservan ownership e identidad separados.
- crosswalks entre FrameworkVersion usan mappings tipados distintos para NormativeUnit, Requirement y ControlVersion; no usan pares polimórficos sin FK ni fusionan identidades.
- NormativeUnit y Requirement heredan ownership/tenant de FrameworkVersion; una relación tenant-owned nunca apunta a contenido de otro tenant.
- RequirementApplicability evalúa alcance de obligaciones por tenant y scope Subject opcional; StatementOfApplicabilityItem decide aplicabilidad/implementación de controles de referencia y no son intercambiables.
- Tenant es frontera de ownership/aislamiento; Organization y Subject expresan alcance. Ninguna entidad pierde `tenant_id` por estar scoped a Organization/Subject y no se añade `organization_id` indiscriminadamente.
- EvidenceLink distingue Control tenant de ControlVersion; evidencia de implementación tenant debe apuntar al Control tenant cuando la afirmación depende de esa implementación.
- EvidenceRequest e IssueOrigin sólo admiten targets/orígenes enumerados por contrato y deben conservar integridad referencial física; no se autorizan referencias polimórficas débiles.
