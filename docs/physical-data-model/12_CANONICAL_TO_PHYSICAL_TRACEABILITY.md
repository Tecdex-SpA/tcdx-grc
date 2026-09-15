# Trazabilidad canónico → físico

## Cobertura nominal

Denominador: 175 entidades canónicas únicas de 33. `EffectiveConfiguration` se cuenta una vez aunque aparezca en dos secciones. Cada nombre de la columna canónica corresponde posicionalmente a la tabla de la columna física.

| Contexto | N | Entidades canónicas → tablas físicas | Fuentes |
|---|---:|---|---|
| Identity & Access | 8 | UserIdentity→`iam.user_identities`; TenantMembership→`iam.tenant_memberships`; Role→`iam.roles`; Permission→`iam.permissions`; RolePermission→`iam.role_permissions`; MembershipRole→`iam.membership_roles`; ServicePrincipal→`iam.service_principals`; ImpersonationSession→`iam.impersonation_sessions` | 09, 22, 33, 42 |
| Tenant & Commercial | 9 | Tenant→`platform.tenants`; Organization→`platform.organizations`; Subscription→`platform.subscriptions`; Plan→`platform.plans`; PlanVersion→`platform.plan_versions`; Capability→`platform.capabilities`; Entitlement→`platform.entitlements`; UsageLimit→`platform.usage_limits`; FeatureFlag→`platform.feature_flags` | 30, 33, 42 |
| Organization | 11 | OrganizationalUnit→`org.organizational_units`; Process→`org.processes`; Service→`org.services`; Asset→`org.assets`; System→`org.systems`; Application→`org.applications`; DataAsset→`org.data_assets`; Location→`org.locations`; Dependency→`org.dependencies`; Subject→`org.subjects`; Resource→`org.resources` | 16, 30, 33, 39 |
| Regulatory & Compliance | 19 | RegulatoryPack→`regulatory.regulatory_packs`; RegulatoryPackVersion→`regulatory.regulatory_pack_versions`; RegulatorySource→`regulatory.regulatory_sources`; RegulatoryImportManifest→`regulatory.regulatory_import_manifests`; RegulatoryCoverageManifest→`regulatory.regulatory_coverage_manifests`; Framework→`regulatory.frameworks`; FrameworkVersion→`regulatory.framework_versions`; NormativeUnit→`regulatory.normative_units`; Requirement→`regulatory.requirements`; RequirementApplicability→`regulatory.requirement_applicabilities`; RequirementAssessment→`regulatory.requirement_assessments`; StatementOfApplicability→`regulatory.statements_of_applicability`; StatementOfApplicabilityItem→`regulatory.statement_of_applicability_items`; RequirementControlMapping→`regulatory.requirement_control_mappings`; NormativeUnitControlMapping→`regulatory.normative_unit_control_mappings`; FrameworkCrosswalk→`regulatory.framework_crosswalks`; NormativeUnitCrosswalkMapping→`regulatory.normative_unit_crosswalk_mappings`; RequirementCrosswalkMapping→`regulatory.requirement_crosswalk_mappings`; ControlCrosswalkMapping→`regulatory.control_crosswalk_mappings` | 30, 33, 37, 41, 44 |
| Controls & Assurance | 8 | Control→`controls.controls`; ControlVersion→`controls.control_versions`; ControlObjective→`controls.control_objectives`; ControlScope→`controls.control_scopes`; ControlAssessment→`controls.control_assessments`; AssuranceTest→`controls.assurance_tests`; AssuranceSample→`controls.assurance_samples`; ControlException→`controls.control_exceptions` | 19, 30, 33, 39, 44 |
| Evidence & Documents | 8 | Document→`evidence.documents`; DocumentVersion→`evidence.document_versions`; Evidence→`evidence.evidences`; EvidenceVersion→`evidence.evidence_versions`; EvidenceRequest→`evidence.evidence_requests`; EvidenceReview→`evidence.evidence_reviews`; EvidenceLink→`evidence.evidence_links`; FileObject→`evidence.file_objects` | 24, 30, 33, 44 |
| Risk | 16 | RiskTaxonomy→`risk.risk_taxonomies`; RiskMethodology→`risk.risk_methodologies`; ImpactScaleDefinition→`risk.impact_scale_definitions`; LikelihoodScaleDefinition→`risk.likelihood_scale_definitions`; Risk→`risk.risks`; RiskScope→`risk.risk_scopes`; RiskAssessment→`risk.risk_assessments`; RiskControlMapping→`risk.risk_control_mappings`; RiskTreatment→`risk.risk_treatments`; RiskAcceptance→`risk.risk_acceptances`; RiskAppetitePolicy→`risk.risk_appetite_policies`; RiskTolerancePolicy→`risk.risk_tolerance_policies`; KRI→`risk.kris`; RiskKriMapping→`risk.risk_kri_mappings`; LossEvent→`risk.loss_events`; LossRecovery→`risk.loss_recoveries` | 19, 30, 33, 39 |
| Issues & Remediation | 5 | Issue→`remediation.issues`; IssueOrigin→`remediation.issue_origins`; Action→`remediation.actions`; ActionVerification→`remediation.action_verifications`; ActionEvidenceLink→`remediation.action_evidence_links` | 21, 30, 33, 44 |
| Audit | 6 | AuditUniverseItem→`audit.audit_universe_items`; AuditProgram→`audit.audit_programs`; Audit→`audit.audits`; AuditWorkpaper→`audit.audit_workpapers`; AuditTest→`audit.audit_tests`; AuditSample→`audit.audit_samples` | 05, 21, 30, 33 |
| Incidents & Loss | 3 | Incident→`operations.incidents`; IncidentSubjectLink→`operations.incident_subject_links`; RootCauseRecord→`operations.root_cause_records` | 21, 30, 33 |
| Third Parties | 4 | Supplier→`third_party.suppliers`; SupplierService→`third_party.supplier_services`; SupplierContract→`third_party.supplier_contracts`; SupplierAssessment→`third_party.supplier_assessments` | 07, 21, 30, 33 |
| Resilience | 6 | BIA→`resilience.bias`; BIAVersion→`resilience.bia_versions`; ContinuityPlan→`resilience.continuity_plans`; ContinuityPlanVersion→`resilience.continuity_plan_versions`; ResilienceExercise→`resilience.resilience_exercises`; RecoveryTest→`resilience.recovery_tests` | 15, 21, 30, 33 |
| Privacy | 11 | PrivacyProcessingActivity→`privacy.privacy_processing_activities`; DataCategory→`privacy.data_categories`; DataSubjectCategory→`privacy.data_subject_categories`; LegalBasis→`privacy.legal_bases`; DataRecipient→`privacy.data_recipients`; InternationalTransfer→`privacy.international_transfers`; RetentionPolicy→`privacy.retention_policies`; DPIA→`privacy.dpias`; DataSubjectRequest→`privacy.data_subject_requests`; PrivacyBreach→`privacy.privacy_breaches`; ErasureExecutionRecord→`privacy.erasure_execution_records` | 23, 30, 33, 39 |
| Surveys & Assessments | 7 | Survey→`survey.surveys`; SurveyVersion→`survey.survey_versions`; SurveyQuestion→`survey.survey_questions`; SurveyOption→`survey.survey_options`; SurveyCampaign→`survey.survey_campaigns`; SurveyResponse→`survey.survey_responses`; SurveyAnswer→`survey.survey_answers` | 21, 30, 33 |
| Data, Metrics & Result Lineage | 14 | Observation→`data.observations`; ObservationType→`data.observation_types`; MetricDefinition→`data.metric_definitions`; MetricMeasurement→`data.metric_measurements`; FormulaDefinition→`data.formula_definitions`; CalculationRun→`data.calculation_runs`; CalculationInput→`data.calculation_inputs`; DataQualityAssessment→`data.data_quality_assessments`; DataLineage→`data.data_lineage`; SourcePrecedencePolicy→`data.source_precedence_policies`; SourceResolution→`data.source_resolutions`; Snapshot→`data.snapshots`; SnapshotItem→`data.snapshot_items`; EffectiveConfiguration→`config.effective_configurations` | 14, 16, 17, 23, 30, 33, 35, 38–40 |
| Rules & Impact | 5 | RuleDefinition→`rules.rule_definitions`; RuleEvaluation→`rules.rule_evaluations`; GRCImpact→`rules.grc_impacts`; GRCImpactMapping→`rules.grc_impact_mappings`; AutomationPolicy→`rules.automation_policies` | 18, 30, 33, 36 |
| Integrations | 11 | ConnectorDefinition→`integration.connector_definitions`; ConnectorVersion→`integration.connector_versions`; Integration→`integration.integrations`; IntegrationCredentialRef→`integration.integration_credential_refs`; SyncSchedule→`integration.sync_schedules`; SyncRun→`integration.sync_runs`; Checkpoint→`integration.checkpoints`; RawRecord→`integration.raw_records`; DeadLetterRecord→`integration.dead_letter_records`; ExternalIdentityBinding→`integration.external_identity_bindings`; ExternalSchemaMapping→`integration.external_schema_mappings` | 14, 20, 30, 33, 39 |
| Configuration (unique additions) | 2 | ConfigurationDefinition→`config.configuration_definitions`; ConfigurationOverride→`config.configuration_overrides`; EffectiveConfiguration ya contado arriba | 29, 30, 33, 39 |
| Reporting | 5 | DashboardDefinition→`reporting.dashboard_definitions`; ReportTemplate→`reporting.report_templates`; ReportDefinition→`reporting.report_definitions`; ReportRun→`reporting.report_runs`; ReportArtifact→`reporting.report_artifacts` | 27, 30, 33 |
| Knowledge & Regulatory Intelligence | 5 | KnowledgeSource→`knowledge.knowledge_sources`; KnowledgeItem→`knowledge.knowledge_items`; KnowledgeVersion→`knowledge.knowledge_versions`; RegulatoryChange→`knowledge.regulatory_changes`; RegulatoryChangeReview→`knowledge.regulatory_change_reviews` | 30, 33, 37 |
| AI Assistance | 3 | AIJob→`ai.ai_jobs`; AIRecommendation→`ai.ai_recommendations`; AIProvenanceLink→`ai.ai_provenance_links` | 07, 30, 33, 36 |
| Notifications | 3 | Notification→`notification.notifications`; NotificationPreference→`notification.notification_preferences`; NotificationDelivery→`notification.notification_deliveries` | 04, 21, 33 |
| Platform Audit & Observability | 6 | AuditEvent→`ops_audit.audit_events`; IdempotencyRecord→`ops_audit.idempotency_records`; OutboxEvent→`ops_audit.outbox_events`; JobExecution→`ops_audit.job_executions`; SystemHealthEvent→`ops_audit.system_health_events`; LifecycleTransitionDefinition→`ops_audit.lifecycle_transition_definitions` | 21, 25, 26, 33 |
| **Total único** | **175** | **175/175** | 33, 43 Fase 1 |

## Objetos físicos auxiliares con fuente explícita

No son nuevas entidades de producto; materializan relaciones/atributos multivaluados exigidos sin JSON crítico.

| Objetos | Fuente y consecuencia |
|---|---|
| `org.organizational_unit_process_links`, `org.service_asset_links` | N:M de 30 §2 |
| `regulatory.regulatory_pack_framework_versions` | N:M de 30 §3 |
| `evidence.evidence_request_fulfillments` | request N evidence versions de 30 §4 |
| `risk.impact_scale_levels`, `risk.impact_scale_dimension_criteria`, `risk.likelihood_scale_levels` | criterios versionados de 19/39 sin JSON crítico |
| `risk.loss_event_risk_links`, `risk.loss_event_incident_links` | N:M tipadas de 30 §5 |
| `audit.audit_test_evidence_links` | N:M de 30 §7 |
| seis `privacy.processing_activity_*` links y `privacy.erasure_execution_items` | N:M tipadas de 30 §11; detalle de ejecución exigido por 39 §11 |
| `survey.survey_question_validation_rules` | validación versionada de Question, 15/29/33 |
| `data.observation_type_subject_types`, `data.observation_type_source_types` | sets obligatorios de ObservationType, 16 §10 |
| `data.formula_definition_parameters`, `data.metric_definition_inputs`, `data.metric_definition_thresholds` | parameters/inputs/thresholds versionados, 14/17 |
| `data.source_precedence_policy_sources`, `data.source_precedence_policy_key_fields`, `data.source_resolution_observations` | source set/conflict key/candidates-selection, 35 |
| `config.configuration_definition_scopes`, `config.configuration_validation_rules`, `config.effective_configuration_layers` | scopes/validación/precedencia reproducible, 29/39 |
| `rules.rule_definition_inputs`, `rules.rule_definition_thresholds`, `rules.rule_evaluation_inputs` | inputs/criteria/evaluation lineage, 18/30/38 |
| `integration.connector_version_auth_scopes`, `integration.connector_version_objects` | contrato técnico común, 20 §2/§6 |
| `reporting.dashboard_widgets`, `reporting.report_definition_parameters`, `reporting.report_run_snapshots` | dashboard/report contracts normalizados y run referencia snapshots concretos, 27/30 |
| `ops_audit.lifecycle_transition_scopes`, `ops_audit.lifecycle_transition_side_effects` | arista registry normalizada, 21 §16 |

## Matriz de requisitos persistentes

| Requisito rector | Consecuencia física | Objetos | Estado |
|---|---|---|---|
| ownership único/tenant | clase + tenant condicional + FKs compuestas | perfiles `TM/TI/TV/MX/MXI/EV` | cubierto |
| estructura normativa separada | tablas/IDs/FKs distintos | framework, normative_units, requirements, controls, issues | cubierto |
| applicability y SoA distintos | dos aggregates tenant | applicability/assessment, statements/items | cubierto |
| mappings y crosswalks tipados | tablas separadas, no type/id | cinco mapping families | cubierto |
| evidence/document/file distintos | roots/versions/reviews/file metadata | schema evidence | cubierto |
| targets críticos tipados | FK one-of + same tenant | evidence links/requests, issue origins, inputs, snapshots, AI | cubierto |
| raw→observation→metric→rule→impact | ledgers y lineage separados | integration/data/rules | cubierto |
| status/sufficiency | tres dimensiones separadas | runs/results/domain objects | cubierto |
| source precedence | policy/version + resolution/candidates | source policy/resolution tables | cubierto |
| configuration precedence | definition/override/effective/layers | schema config | cubierto |
| lifecycle registry | arista/permission/scope/SoD/effects | lifecycle transition tables | cubierto |
| RBAC + commercial | plan/capability separados de permission/scope | platform/iam | cubierto |
| temporal/version/retention | explicit intervals, versions, policy refs | todas según 01/06 | cubierto |
| audit/idempotency/outbox | append-only platform controls | ops_audit | cubierto |
| reporting/drilldown | snapshot items + report snapshot links | data/reporting | cubierto |
| IA asistencia/provenance | job/recommendation/typed links | ai | cubierto |
| privacy erasure/legal hold | policy + request + execution record | privacy | cubierto |
| connector contract/version | definition/version/field mapping | integration | cubierto |

## Auditoría inversa Physical → Rector

Cada tabla canónica tiene fila arriba. Cada tabla auxiliar tiene fuente en la sección anterior. Schemas y perfiles son decisiones técnicas PDM-D001/PDM-D014. No existen objetos físicos sin fuente: `UNSOURCED_PHYSICAL_OBJECTS=0`.

Objetos deliberadamente ausentes: Result/DomainResult (envelopes), Clause (presentación de NormativeUnit), PermissionDefinition y ConnectorContractVersion (aliases retirados), blobs binarios (object storage), provider/plan-specific schemas y cualquier tenant artificial.
