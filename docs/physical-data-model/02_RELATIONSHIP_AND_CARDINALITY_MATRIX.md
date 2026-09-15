# Matriz de relaciones y cardinalidades

Acciones referenciales por defecto: `ON UPDATE NO ACTION`; `ON DELETE RESTRICT`. `SET NULL` sólo aparece donde la ausencia posterior está autorizada y nunca sobre historia/evidence/lineage. “Cross-tenant” = `NO`; `GLOBAL` significa que el child tenant puede referenciar un parent GLOBAL_REFERENCE/PLATFORM_CONTROL publicado, no otro tenant.

| Parent | Child / relación | Cardinalidad | FK / obligatoriedad | Delete | Cross-tenant | Fuente |
|---|---|---|---|---|---|---|
| Tenant | Organization | 1:N | `tenant_id` obligatoria | RESTRICT | NO | 30 §2 |
| Tenant | toda tabla perfil `TM/TI/TV` | 1:N ownership | `tenant_id` obligatoria y parte de FK compuesta | RESTRICT | NO | 26, 30 §13, 39 §14 |
| Tenant | Subscription | 1:N | `tenant_id` obligatoria | RESTRICT | NO | 30 §2 |
| Plan | PlanVersion | 1:N | `plan_id` obligatoria | RESTRICT | N/A | 30 §2 |
| PlanVersion | Capability | N:M via Entitlement | ambas obligatorias | RESTRICT | N/A | 30 §2, 42 |
| PlanVersion | Subscription | 1:N | `plan_version_id` obligatoria | RESTRICT | GLOBAL | 30 §2 |
| UserIdentity | Tenant | N:M via TenantMembership | ambas obligatorias | RESTRICT | membership define tenant | 30 §2 |
| Role | Permission | N:M via RolePermission | ambas obligatorias | RESTRICT | compatible ownership | 22, 33 |
| TenantMembership | Role | N:M via MembershipRole | ambas obligatorias + scope | RESTRICT | NO | 22, 33 |
| Organization | OrganizationalUnit | 1:N | organization obligatoria | RESTRICT | NO | 30 §2 |
| OrganizationalUnit | OrganizationalUnit | 0..1:N | parent opcional | RESTRICT | NO | 30 §2 |
| OrganizationalUnit | Process | N:M via unit-process link | ambas obligatorias | RESTRICT | NO | 30 §2 |
| Process | Service | 1:N | process obligatoria | RESTRICT | NO | 30 §2 |
| Service | Asset | N:M via service-asset link | ambas obligatorias | RESTRICT | NO | 30 §2 |
| Subject | Subject | 0..1:N owner/supersession | owner/survivor opcional | RESTRICT | NO | 16, 39 §10 |
| Subject | Resource | 1:0..1 identity | subject obligatoria | RESTRICT | NO | 16 |
| Resource | Subject | N:0..1 mapped business subject | mapped opcional | RESTRICT | NO | 16 |
| Supplier | Service | N:M via SupplierService | ambas obligatorias | RESTRICT | NO | 30 §2 |
| RegulatoryPack | RegulatoryPackVersion | 1:N | pack obligatoria | RESTRICT | N/A | 30 §3 |
| RegulatoryPackVersion | FrameworkVersion | N:M via pack-framework | ambas obligatorias | RESTRICT | compatible | 30 §3, 41 |
| RegulatoryPackVersion | Import/Coverage Manifest | 1:N | pack version obligatoria | RESTRICT | N/A | 30 §3, 41 |
| RegulatorySource | RegulatoryImportManifest | 1:N | source obligatoria | RESTRICT | N/A | 30 §3 |
| Framework | FrameworkVersion | 1:N | framework obligatoria | RESTRICT | compatible | 30 §3 |
| FrameworkVersion | NormativeUnit | 1:N | framework version obligatoria | RESTRICT | inherited | 30 §3, 44 |
| NormativeUnit | NormativeUnit | 0..1:N | parent opcional, misma framework version | RESTRICT | NO | 30 §3, 44 §4 |
| NormativeUnit | Requirement | 1:0..N | unit obligatoria, misma framework version | RESTRICT | inherited | 30 §3, 44 §5 |
| Requirement | RequirementApplicability | 1:N | requirement obligatoria | RESTRICT | GLOBAL/same tenant | 30 §3, 44 §8 |
| Subject | RequirementApplicability | 1:N scoped | scope opcional; NULL tenant-wide | RESTRICT | NO | 30 §3 |
| RequirementApplicability | RequirementAssessment | 1:0..N | applicability obligatoria | RESTRICT | NO | 30 §3 |
| StatementOfApplicability | SoAItem | 1:N | SoA obligatoria | RESTRICT | NO | 30 §3 |
| ControlVersion reference | SoAItem | 1:N | reference version obligatoria | RESTRICT | GLOBAL | 30 §3, 44 §8 |
| Control tenant | SoAItem | 1:N optional implementation | tenant control/version opcionales coherentes | RESTRICT | NO | 30 §3 |
| Requirement | ControlVersion | N:M via RequirementControlMapping | ambas obligatorias | RESTRICT | compatible | 30 §3, 44 §7 |
| NormativeUnit | ControlVersion | N:M via NormativeUnitControlMapping | ambas obligatorias | RESTRICT | reference compatible | 30 §3, 44 §7 |
| FrameworkVersion | FrameworkVersion | N:M via FrameworkCrosswalk | source/target obligatorias | RESTRICT | compatible | 30 §3, 44 §10 |
| FrameworkCrosswalk | typed crosswalk items | 1:N | header obligatoria | RESTRICT | compatible | 30 §3, 44 §10 |
| typed source | typed target | N:M via each crosswalk item | target opcional sólo no_match | RESTRICT | compatible | 44 §10 |
| Control | ControlVersion | 1:N | control obligatoria | RESTRICT | inherited | 30 §3 |
| ControlVersion global | Control tenant | 1:0..N | based_on opcional/required by origin | RESTRICT | GLOBAL | 30 §3, 44 §6 |
| Control | Subject | N:M via ControlScope | ambas obligatorias | RESTRICT | NO | 30 §3 |
| Control | ControlAssessment | 1:N | control obligatoria | RESTRICT | NO | 30 §3 |
| Control | AssuranceTest | 1:N | control obligatoria | RESTRICT | NO | 30 §3 |
| AssuranceTest | AssuranceSample | 1:N | test obligatoria | RESTRICT | NO | 33 |
| Document | DocumentVersion | 1:N | document obligatoria | RESTRICT | NO | 30 §4 |
| Evidence | EvidenceVersion | 1:N | evidence obligatoria | RESTRICT | NO | 30 §4 |
| FileObject | DocumentVersion/EvidenceVersion | 1:N | file opcional; obligatorio según forma de versión | RESTRICT | NO | 24 |
| DocumentVersion | EvidenceVersion | 1:N optional | document version opcional | RESTRICT | NO | 24 |
| RetentionPolicy | Document/Evidence/FileObject/ProcessingActivity | 1:N | policy obligatoria | RESTRICT | GLOBAL/same tenant | 23, 24, 39 |
| Evidence | EvidenceReview | 1:N | evidence/version obligatorias | RESTRICT | NO | 30 §4 |
| EvidenceVersion | typed Evidence target | N:M via EvidenceLink | exactly one target | RESTRICT | NO/GLOBAL | 24, 30 §4 |
| EvidenceRequest | EvidenceVersion | N:M via fulfillment | ambas obligatorias | RESTRICT | NO | 30 §4 |
| typed request target | EvidenceRequest | 1:N | exactly one target | RESTRICT | NO/GLOBAL | 24, 30 §4 |
| RiskMethodology | Impact/Likelihood Scale | N:1 each | ambas obligatorias | RESTRICT | compatible | 30 §5, 39 |
| ImpactScaleDefinition | ImpactScaleLevel | 1:N | definition obligatoria | RESTRICT | inherited | 19, 39 §3 |
| ImpactScaleLevel | DimensionCriterion | 1:N | level obligatorio | RESTRICT | inherited | 39 §3 |
| LikelihoodScaleDefinition | LikelihoodScaleLevel | 1:N | definition obligatoria | RESTRICT | inherited | 19, 39 §4 |
| Risk | Subject | N:M via RiskScope | ambas obligatorias | RESTRICT | NO | 30 §5 |
| Risk | RiskAssessment | 1:N | risk obligatoria | RESTRICT | NO | 30 §5 |
| Risk | Control | N:M via RiskControlMapping | ambas obligatorias | RESTRICT | NO | 30 §5 |
| Risk | RiskTreatment | 1:N | risk obligatoria | RESTRICT | NO | 30 §5 |
| Risk | RiskAcceptance | 1:N | risk obligatoria | RESTRICT | NO | 30 §5 |
| Risk | KRI | N:M via RiskKriMapping | ambas obligatorias | RESTRICT | NO | 30 §5 |
| RiskAppetitePolicy | RiskTolerancePolicy | 1:N | appetite policy obligatoria | RESTRICT | NO | 19, 39 §6 |
| LossEvent | Risk | N:M via typed link | ambas obligatorias | RESTRICT | NO | 30 §5 |
| LossEvent | Incident | N:M via typed link | ambas obligatorias | RESTRICT | NO | 30 §5 |
| LossEvent | LossRecovery | 1:N | loss event obligatoria | RESTRICT | NO | 33 |
| Issue | typed origin | N:M via IssueOrigin | issue + exactly one source | RESTRICT | NO | 30 §6, 44 §8 |
| Issue | Action | 1:N | issue obligatoria | RESTRICT | NO | 30 §6 |
| Action | ActionVerification | 1:N | action obligatoria | RESTRICT | NO | 30 §6 |
| Action | EvidenceVersion | N:M via ActionEvidenceLink | ambas obligatorias | RESTRICT | NO | 30 §6 |
| AuditProgram | Audit | 1:N | program opcional | RESTRICT | NO | 05, 33 |
| Audit | AuditWorkpaper | 1:N | audit obligatoria | RESTRICT | NO | 30 §7 |
| AuditWorkpaper | AuditTest | 1:N | workpaper obligatoria | RESTRICT | NO | 30 §7 |
| AuditTest | AuditSample | 1:N | test obligatoria | RESTRICT | NO | 30 §7 |
| AuditTest | EvidenceVersion | N:M via typed link | ambas obligatorias | RESTRICT | NO | 30 §7 |
| Incident | Subject | N:M via IncidentSubjectLink | ambas obligatorias | RESTRICT | NO | 30 §8 |
| Incident | RootCauseRecord | 1:N | incident obligatoria | RESTRICT | NO | 33 |
| Supplier | SupplierContract/Assessment | 1:N | supplier obligatoria | RESTRICT | NO | 30 §8 |
| Process/Service | BIA | 1:N | exactly one scope FK | RESTRICT | NO | 30 §8 |
| BIA | BIAVersion | 1:N | BIA obligatoria | RESTRICT | NO | 33 |
| BIA | ContinuityPlan | 1:N | BIA obligatoria | RESTRICT | NO | 30 §8 |
| ContinuityPlan | Version/Exercise | 1:N | plan obligatoria | RESTRICT | NO | 33 |
| Exercise | RecoveryTest | 1:N | exercise obligatoria | RESTRICT | NO | 33 |
| PrivacyProcessingActivity | category/subject/recipient/supplier | N:M typed links | endpoints obligatorios | RESTRICT | NO/GLOBAL | 30 §11 |
| PrivacyProcessingActivity | DPIA/Transfer | 1:N | activity obligatoria | RESTRICT | NO | 30 §11 |
| DataSubjectRequest | ErasureExecutionRecord | 1:N | request obligatoria | RESTRICT | NO | 30 §11, 39 §11 |
| ErasureExecutionRecord | ErasureExecutionItem | 1:N | ejecución obligatoria | RESTRICT | NO | 39 §11 |
| Survey | SurveyVersion | 1:N | survey obligatoria | RESTRICT | inherited | 30 §11 |
| SurveyVersion | Question | 1:N | version obligatoria | RESTRICT | inherited | 30 §11 |
| Question | ValidationRule | 1:N | question obligatoria | RESTRICT | inherited | 29, 33 |
| Question | Option | 1:N | question obligatoria | RESTRICT | inherited | 30 §11 |
| SurveyVersion | Campaign | 1:N | version obligatoria | RESTRICT | GLOBAL/same tenant | 30 §11 |
| Campaign | Response | 1:N | campaign obligatoria | RESTRICT | NO | 30 §11 |
| Response | Answer | 1:N | response obligatoria | RESTRICT | NO | 30 §11 |
| Integration | SyncRun/Checkpoint/Schedule/Credential | 1:N | integration obligatoria | RESTRICT | NO | 30 §9, 33 |
| SyncRun | RawRecord/DLQ | 1:N | sync run obligatoria | RESTRICT | NO | 30 §9 |
| RawRecord | Observation | 1:0..N | raw opcional on Observation | RESTRICT | NO | 30 §9 |
| Integration external key | Subject | N:M temporal via ExternalIdentityBinding | ambos obligatorios | RESTRICT | NO | 16, 39 §10 |
| ConnectorDefinition | ConnectorVersion | 1:N | definition obligatoria | RESTRICT | N/A | 20, 33 |
| ConnectorVersion | AuthScope/SupportedObject | 1:N each | connector version obligatoria | RESTRICT | N/A | 20 §2/§6 |
| ConnectorVersion | ExternalSchemaMapping | 1:N | version obligatoria | RESTRICT | compatible | 20 §6 |
| Subject | Observation | 1:N | subject obligatoria | RESTRICT | NO | 30 §9 |
| ObservationType | Observation | 1:N | type/version obligatoria | RESTRICT | GLOBAL/same tenant | 16 |
| ObservationType | allowed SubjectType/SourceType | 1:N each | type obligatoria | RESTRICT | inherited | 16 §10 |
| SourcePrecedencePolicy | SourceResolution | 1:N | policy obligatoria | RESTRICT | GLOBAL/same tenant | 30 §9, 35 |
| SourceResolution | Observation | N:M candidate/selected links | endpoints obligatorios | RESTRICT | NO | 35 §5 |
| MetricDefinition | MetricMeasurement | 1:N | definition obligatoria | RESTRICT | GLOBAL/same tenant | 30 §9 |
| FormulaDefinition | MetricDefinition | 1:N | formula obligatoria | RESTRICT | compatible | 14, 17 |
| FormulaDefinition | FormulaParameter | 1:N | formula obligatoria | RESTRICT | inherited | 14 §5, 17 §1 |
| MetricDefinition | InputDefinition/Threshold | 1:N each | metric obligatoria | RESTRICT | inherited | 17 §1 |
| CalculationRun | CalculationInput | 1:N | run obligatoria | RESTRICT | NO | 30 §9 |
| CalculationRun | MetricMeasurement | 1:N | run obligatoria | RESTRICT | NO | 30 §9 |
| Measurement | Observation/Resolution/etc. | N:M via CalculationInput/DataLineage | typed source exactly one | RESTRICT | NO | 30 §9 |
| concrete result | DataQualityAssessment | 1:N typed scope | exactly one scope | RESTRICT | NO | 17, 30 §9 |
| RuleDefinition | RuleEvaluation | 1:N | definition obligatoria | RESTRICT | GLOBAL/same tenant | 30 §9 |
| RuleDefinition | InputDefinition/Threshold | 1:N each | rule obligatoria | RESTRICT | inherited | 18 §2 |
| RuleEvaluation | typed inputs | 1:N | exactly one input per row | RESTRICT | NO | 30 §9 |
| RuleEvaluation | GRCImpact | 1:N | evaluation obligatoria | RESTRICT | NO | 30 §9 |
| RuleDefinition | domain target | N:M via GRCImpactMapping | exactly one typed target | RESTRICT | compatible | 18, 30 §9 |
| ConfigurationDefinition | ConfigurationOverride | 1:N | definition obligatoria | RESTRICT | compatible | 29, 30 §10 |
| ConfigurationDefinition | allowed Scope/ValidationRule | 1:N each | definition obligatoria | RESTRICT | inherited | 29 §2 |
| ConfigurationDefinition | EffectiveConfiguration | 1:N | definition obligatoria | RESTRICT | GLOBAL/same tenant | 30 §10 |
| EffectiveConfiguration | layers | 1:N | resolution obligatoria | RESTRICT | compatible | 29, 39 §15 |
| Snapshot | SnapshotItem | 1:N | snapshot obligatoria | RESTRICT | NO | 30 §9 |
| SnapshotItem | concrete result/object | N:1 typed | exactly one object | RESTRICT | NO | 30 §9 |
| ReportDefinition | ReportRun | 1:N | definition obligatoria | RESTRICT | GLOBAL/same tenant | 30 §11 |
| DashboardDefinition | DashboardWidget | 1:N | dashboard obligatoria | RESTRICT | inherited | 27, 33 |
| ReportDefinition | ReportParameter | 1:N | report definition obligatoria | RESTRICT | inherited | 27, 33 |
| ReportRun | ReportArtifact | 1:N | run obligatoria | RESTRICT | NO | 30 §11 |
| ReportRun | Snapshot | N:M via report-run-snapshot | ambas obligatorias | RESTRICT | NO | 30 §11 |
| KnowledgeItem | KnowledgeVersion | 1:N | item obligatoria | RESTRICT | inherited | 30 §12 |
| RegulatoryChange | Review | 1:N | change obligatoria | RESTRICT | compatible | 33 |
| AIJob | AIRecommendation | 1:N | job obligatoria | RESTRICT | NO | 07, 33 |
| AIRecommendation | typed source object | N:M via AIProvenanceLink | exactly one source | RESTRICT | NO/GLOBAL | 30 §12 |
| Notification | NotificationDelivery | 1:N | notification obligatoria | RESTRICT | NO | 33 |
| TenantMembership | NotificationPreference | 1:N | membership obligatoria | RESTRICT | NO | 33 |
| LifecycleTransitionDefinition | allowed Scope/SideEffect | 1:N each | transition obligatoria | RESTRICT | N/A | 21 §16 |
| Permission | LifecycleTransitionDefinition | 1:N | permission obligatoria | RESTRICT | N/A | 21 §16 |
| AutomationPolicy | RuleDefinition/GRCImpact | 1:N optional | policy opcional según nivel | RESTRICT | compatible | 18, 36 |
| GRCImpactMapping | GRCImpact | 1:N | mapping obligatoria | RESTRICT | compatible tenant | 18, 30 §9 |
| PlanVersion | UsageLimit | 1:N | plan version obligatoria | RESTRICT | N/A | 33, 42 |
| UserIdentity | TenantMembership | 1:N | identity obligatoria | RESTRICT | tenant boundary via membership | 30 §2 |
| UserIdentity/ServicePrincipal | created/updated/audit actor | 1:N optional | actor FKs tipadas | RESTRICT | compatible context | 25 |
| UserIdentity | ImpersonationSession | 1:N platform actor | actor obligatoria | RESTRICT | platform→target tenant only | 22 §8 |
| TenantMembership | ImpersonationSession | 1:N target | target obligatoria | RESTRICT | explicit target tenant | 22 §8 |
| Subject | System/Application/DataAsset specialization | 1:0..1 each | subject obligatoria | RESTRICT | NO | 16, 33 |
| Subject | Dependency | 1:N source and target | ambas obligatorias | RESTRICT | NO | 15, 33 |
| Subject | business-owner references | 1:N optional | owner subject opcional | RESTRICT | NO | 15, 16 |
| RetentionPolicy | ErasureExecutionRecord/Item | 1:N | effective policy obligatoria/optional detail | RESTRICT | GLOBAL/same tenant | 23, 39 §11 |
| RiskTaxonomy | Risk | 1:N | taxonomy obligatoria | RESTRICT | compatible tenant | 33 |
| FormulaDefinition | RiskMethodology | 1:N | formula obligatoria | RESTRICT | compatible | 19, 39 |
| MetricDefinition | KRI | 1:N | metric obligatoria | RESTRICT | GLOBAL/same tenant | 17, 19 |
| RiskAcceptance | ControlException | 1:N optional | acceptance opcional | RESTRICT | NO | 19, 33 |
| AuditUniverseItem | Subject | N:1 | subject obligatoria | RESTRICT | NO | 15, 33 |
| RegulatorySource | LegalBasis/RegulatoryChange | 1:N | source opcional/obligatoria | RESTRICT | compatible | 37, 41 |
| Incident | PrivacyBreach | 1:N optional | incident opcional | RESTRICT | NO | 15, 33 |
| KnowledgeSource | KnowledgeItem | 1:N | source obligatoria | RESTRICT | compatible | 30 §12 |
| ReportTemplate | ReportDefinition | 1:N | template obligatoria | RESTRICT | compatible | 30 §11 |
| FileObject | ReportTemplate/ReportArtifact | 1:N | file opcional/obligatoria | RESTRICT | compatible tenant | 24, 27 |
| Capability | DashboardDefinition/ReportDefinition | 1:N | capability obligatoria | RESTRICT | GLOBAL | 42 |
| Notification | Audit/Outbox originating event | N:1 logical ref | event reference obligatoria | RESTRICT | NO | 04, 25 |
| JobExecution | Erasure/Calculation/AI/operational jobs | 1:N optional | job reference opcional | RESTRICT | NO | 25, 26, 39 |

Todos los self-supersession FKs son opcionales, acíclicos y `RESTRICT`. Todas las relaciones no destructivas usan `NO ACTION` al actualizar PK (las PK son inmutables).
