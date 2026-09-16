# 33 - Catálogo completo de entidades canónicas por bounded context — candidato v1.5

> Candidate overlay: `TCDX_GRC_MASTER_REGENT_BASELINE_v1.5_2026-09-16`.
> Status: `PENDING_HUMAN_APPROVAL`. Active authority remains v1.4 until human activation.

Este catálogo es la autoridad nominal de entidades lógicas. Un término contractual que requiera identidad, versionado, lineage o referencia reproducible debe aparecer aquí, aunque su implementación física pueda consolidarse conforme a la regla final.

## Identity & Access
UserIdentity, TenantMembership, Role, Permission, RolePermission, MembershipRole, ServicePrincipal, ImpersonationSession.

`Permission` es el único registry canónico de definiciones de permiso. `PermissionDefinition` queda retirado como alias y no constituye una entidad distinta.

## Tenant & Commercial Entitlements
Tenant, Organization, Subscription, Plan, PlanVersion, Capability, Entitlement, UsageLimit, FeatureFlag.

## Organization
OrganizationalUnit, Process, Service, Asset, System, Application, DataAsset, Location, Dependency, Subject, Resource.

## Regulatory & Compliance
RegulatoryPack, RegulatoryPackVersion, RegulatorySource, RegulatoryImportManifest, RegulatoryCoverageManifest, Framework, FrameworkVersion, NormativeUnit, Requirement, RequirementApplicability, RequirementAssessment, StatementOfApplicability, StatementOfApplicabilityItem, RequirementControlMapping, NormativeUnitControlMapping, FrameworkCrosswalk, NormativeUnitCrosswalkMapping, RequirementCrosswalkMapping, ControlCrosswalkMapping.

`NormativeUnit` es la entidad jerárquica genérica para chapter/clause/subclause/annex/article/paragraph/numeral y otras unidades editoriales. `Clause` no es entidad canónica separada. `Requirement` es exclusivamente una obligación atómica evaluable. `NormativeUnitControlMapping` no sustituye `RequirementControlMapping`.

`FrameworkCrosswalk` es la cabecera versionada entre dos FrameworkVersion. Sus items se separan por tipo mediante `NormativeUnitCrosswalkMapping`, `RequirementCrosswalkMapping` y `ControlCrosswalkMapping`; no existe un `(object_type, object_id)` sin integridad referencial.

`StatementOfApplicabilityItem` registra por tenant y versión de SoA la decisión sobre un ControlVersion de referencia, justificación, estado de implementación y vínculo opcional al Control/ControlVersion tenant. No es RequirementApplicability.

`RequirementApplicability` pertenece siempre a un Tenant y Requirement, y declara scope tenant-wide o un `Subject` del mismo tenant mediante `scope_subject_id` opcional. Tenant define ownership; Subject define alcance.

## Controls & Assurance
Control, ControlVersion, ControlObjective, ControlScope, ControlAssessment, AssuranceTest, AssuranceSample, ControlException.

Control/ControlVersion declara `control_origin=regulatory_reference|tcdx_baseline|tenant_instantiated|tenant_defined` y ownership coherente. Una instancia tenant puede referenciar `based_on_control_version_id`; no muta ni demuestra implementación del control global.

## Evidence & Documents
Document, DocumentVersion, Evidence, EvidenceVersion, EvidenceRequest, EvidenceReview, EvidenceLink, FileObject.

`EvidenceLink` es una relación tipada hacia Requirement, Control, ControlVersion, RequirementAssessment, ControlAssessment o AssuranceTest. `EvidenceRequest` apunta exactamente a Requirement, Control, RequirementAssessment, ControlAssessment o AssuranceTest. Ninguna de ambas relaciones autoriza `(type,id)` sin integridad.

## Risk
RiskTaxonomy, RiskMethodology, ImpactScaleDefinition, LikelihoodScaleDefinition, Risk, RiskScope, RiskAssessment, RiskControlMapping, RiskTreatment, RiskAcceptance, RiskAppetitePolicy, RiskTolerancePolicy, KRI, RiskKriMapping, LossEvent, LossRecovery.

`RiskAppetite` y `RiskTolerance` sin sufijo `Policy` quedan retirados como nombres canónicos y no autorizan nuevas entidades/tablas/API. Toda referencia histórica debe mapearse a `RiskAppetitePolicy`/`RiskTolerancePolicy`.

## Issues & Remediation
Issue, IssueOrigin, Action, ActionVerification, ActionEvidenceLink.

`IssueOrigin` conserva origen tipado exclusivamente hacia RequirementAssessment, ControlAssessment, AssuranceTest, AuditTest, Risk, Incident o SupplierAssessment; no es una referencia polimórfica libre.

## Audit
AuditUniverseItem, AuditProgram, Audit, AuditObjective, AuditCriterion, AuditScope, AuditTeamAssignment, AuditCompetency, AuditorCompetencyAssertion, AuditCompetencyRequirement, AuditCompetencyValidation, AuditAgendaItem, AuditWorkpaper, AuditTest, AuditSample. Findings se representan como Issue con origen AuditTest.

`AuditObjective`, `AuditCriterion`, `AuditScope`, `AuditTeamAssignment` y `AuditAgendaItem` estructuran el plan de una Audit sin reemplazar FrameworkVersion, Requirement, Subject ni TenantMembership. `AuditCriterion` referencia siempre una FrameworkVersion y opcionalmente un Requirement perteneciente a esa versión. `AuditScope` relaciona la Audit con un Subject dentro de una FrameworkVersion seleccionada.

`AuditCompetency` es un registry PLATFORM_CONTROL versionado. `AuditorCompetencyAssertion` registra por tenant la competencia vigente de una TenantMembership con evidencia/verificación. `AuditCompetencyRequirement` declara la competencia requerida por Audit, FrameworkVersion y rol de equipo; `AuditCompetencyValidation` conserva la validación reproducible contra una asignación y una assertion vigente.

Las asignaciones de equipo usan exclusivamente `lead_auditor | auditor | technical_expert`. Existe exactamente un lead activo por Audit. `lead_membership_id` y `scope_text` dejan de ser autoridad en el modelo final enmendado: lead y scope se expresan mediante las entidades tipadas anteriores.

AuditTest se relaciona mediante tablas soporte tipadas con N Requirements, Control/ControlAssessment tenant y RequirementAssessment. Una agrupación de Requirements de distintas FrameworkVersion exige un RequirementCrosswalkMapping aprobado y efectivo con relación `equivalent | partially_equivalent | overlaps | supports`. No fusiona Requirements ni copia conclusions; cada Requirement conserva applicability, RequirementAssessment, result_status, domain_conclusion y lineage.

## Incidents & Loss
Incident, IncidentSubjectLink, RootCauseRecord. LossEvent permanece en Risk por metodología/pérdida, enlazable a Incident.

## Third Parties
Supplier, SupplierService, SupplierContract, SupplierAssessment.

Third Parties es el único write owner de Supplier. Organization, Privacy, Risk y demás dominios lo referencian mediante ID/Subject; no crean otra entidad Supplier.

## Resilience
BIA, BIAVersion, ContinuityPlan, ContinuityPlanVersion, ResilienceExercise, RecoveryTest.

## Privacy
PrivacyProcessingActivity, DataCategory, DataSubjectCategory, LegalBasis, DataRecipient, InternationalTransfer, RetentionPolicy, DPIA, DataSubjectRequest, PrivacyBreach, ErasureExecutionRecord.

## Surveys & Assessments
Survey, SurveyVersion, SurveyQuestion, SurveyOption, SurveyCampaign, SurveyResponse, SurveyAnswer.

## Data, Metrics & Result Lineage
Observation, ObservationType, MetricDefinition, MetricMeasurement, FormulaDefinition, CalculationRun, CalculationInput, DataQualityAssessment, DataLineage, SourcePrecedencePolicy, SourceResolution, Snapshot, SnapshotItem, EffectiveConfiguration.

`Result` y `DomainResult` no son entidades canónicas independientes. Son conceptos/envelopes de salida construidos desde la entidad de dominio o `MetricMeasurement` correspondiente más `result_status`, `domain_conclusion`, lineage, CalculationRun y Snapshot. No crear tabla genérica `results` ni entidad `DomainResult` salvo cambio contractual posterior.

## Rules & Impact
RuleDefinition, RuleEvaluation, GRCImpact, GRCImpactMapping, AutomationPolicy.

## Integrations
ConnectorDefinition, ConnectorVersion, Integration, IntegrationCredentialRef, SyncSchedule, SyncRun, Checkpoint, RawRecord, DeadLetterRecord, ExternalIdentityBinding, ExternalSchemaMapping.

`ConnectorVersion` materializa también el contrato versionado a nivel de campos exigido antes de implementar un adapter. `ConnectorContractVersion` queda retirado como alias y no constituye una entidad distinta.

## Configuration
ConfigurationDefinition, ConfigurationOverride, EffectiveConfiguration.

`EffectiveConfiguration` aparece también en Data/Result Lineage por su uso transversal, pero constituye una sola entidad lógica. `ConfigurationDefinition` declara tipo, default, validación, scope y flags `tenant_overridable`/`object_overridable`; `ConfigurationOverride` registra cada override versionado/effective; `EffectiveConfiguration` es el resultado reproducible de resolver capas.

## Reporting
DashboardDefinition, ReportTemplate, ReportDefinition, ReportRun, ReportArtifact.

## Knowledge & Regulatory Intelligence
KnowledgeSource, KnowledgeItem, KnowledgeVersion, RegulatoryChange, RegulatoryChangeReview.

## AI Assistance
AIJob, AIRecommendation, AIProvenanceLink. AI output no reemplaza entidades GRC oficiales.

## Notifications
Notification, NotificationPreference, NotificationDelivery.

## Platform Audit & Observability
AuditEvent, IdempotencyRecord, OutboxEvent, JobExecution, SystemHealthEvent, LifecycleTransitionDefinition.

`LifecycleTransitionDefinition` es el registry versionado de aristas autorizadas de lifecycle definido en 21.

## Regla de implementación física

Este catálogo es lógico. No implica una tabla por entidad si una implementación preserva identidad, invariantes, relaciones, versionado, auditabilidad y ownership sin fusionar autoridades semánticas distintas.

Queda prohibido que el modelo físico invente una entidad semántica no contenida aquí o elimine una entidad contractual mediante JSONB/ad-hoc storage sin demostrar equivalencia en `PHYSICAL_DATA_MODEL_REVIEW`.
