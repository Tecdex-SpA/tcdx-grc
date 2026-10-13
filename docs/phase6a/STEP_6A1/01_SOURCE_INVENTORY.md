# PHASE6A_SOURCE_INVENTORY

Audit date: 2026-10-08. Baseline: main at 6af66387aa03fa185ef139584de07700f247b903.
Master: TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23. Mode: READ_ONLY_AUDIT.
Recommendations are audit proposals for the authorized later stages; no application contract or runtime change is approved by this artifact.

This is the requested single source inventory, delivered under the required filename `01_SOURCE_INVENTORY.md`. No duplicate inventory artifact is created. 112 repository files are indexed. The inventory includes shared files only for their in-scope clauses. Tests are evidence references, not product authority or fresh runtime verification.

| Path | Domain | Responsibility | Audit relevance |
| --- | --- | --- | --- |
| `AGENTS.md` | Governance | Authority / integrity / gate evidence | Audit authorization; latest append-only closure versus historical verifier projection |
| `docs/governance/CODEX_RECTOR_ENFORCEMENT.md` | Governance | Authority / integrity / gate evidence | Audit authorization; latest append-only closure versus historical verifier projection |
| `docs/governance/MASTER_EXECUTION_STATUS.md` | Governance | Authority / integrity / gate evidence | Audit authorization; latest append-only closure versus historical verifier projection |
| `docs/rector/BASELINE_ID` | Governance | Authority / integrity / gate evidence | Audit authorization; latest append-only closure versus historical verifier projection |
| `docs/rector/BASELINE_STATUS` | Governance | Authority / integrity / gate evidence | Audit authorization; latest append-only closure versus historical verifier projection |
| `docs/rector/RECTOR_MANIFEST.sha256` | Governance | Authority / integrity / gate evidence | Audit authorization; latest append-only closure versus historical verifier projection |
| `scripts/verify-rector-governance.sh` | Governance | Authority / integrity / gate evidence | Audit authorization; latest append-only closure versus historical verifier projection |
| `scripts/test-rector-governance-status.sh` | Governance | Authority / integrity / gate evidence | Audit authorization; latest append-only closure versus historical verifier projection |
| `docs/rector/baseline/08_TCDX_GRC_CANONICAL_DATA_MODEL.md` | All four domains | Immutable specialized rector authority | Canonical relationships, vocabularies, workflow, tenant authority, no inference |
| `docs/rector/baseline/19_METODOLOGIAS_GRC_COMPLIANCE_RISK_ASSURANCE.md` | All four domains | Immutable specialized rector authority | Canonical relationships, vocabularies, workflow, tenant authority, no inference |
| `docs/rector/baseline/21_LIFECYCLE_TRANSITION_MATRIX.md` | All four domains | Immutable specialized rector authority | Canonical relationships, vocabularies, workflow, tenant authority, no inference |
| `docs/rector/baseline/22_RBAC_PERMISSION_SCOPE_MATRIX.md` | All four domains | Immutable specialized rector authority | Canonical relationships, vocabularies, workflow, tenant authority, no inference |
| `docs/rector/baseline/24_CONTRATO_EVIDENCIA_DOCUMENTOS_ARCHIVOS.md` | All four domains | Immutable specialized rector authority | Canonical relationships, vocabularies, workflow, tenant authority, no inference |
| `docs/rector/baseline/25_API_EVENTOS_IDEMPOTENCIA_AUDITORIA.md` | All four domains | Immutable specialized rector authority | Canonical relationships, vocabularies, workflow, tenant authority, no inference |
| `docs/rector/baseline/29_CONFIGURACION_PARAMETRIZACION_Y_EXTENSIBILIDAD.md` | All four domains | Immutable specialized rector authority | Canonical relationships, vocabularies, workflow, tenant authority, no inference |
| `docs/rector/baseline/30_MODELO_LOGICO_RELACIONAL_CANONICO.md` | All four domains | Immutable specialized rector authority | Canonical relationships, vocabularies, workflow, tenant authority, no inference |
| `docs/rector/baseline/31_DECISIONES_FUNDACIONALES_CERRADAS.md` | All four domains | Immutable specialized rector authority | Canonical relationships, vocabularies, workflow, tenant authority, no inference |
| `docs/rector/baseline/38_RESULT_STATUS_AND_DATA_SUFFICIENCY_CONTRACT.md` | All four domains | Immutable specialized rector authority | Canonical relationships, vocabularies, workflow, tenant authority, no inference |
| `docs/rector/baseline/39_DECISIONES_SEMANTICAS_FINALES_PRE_MODELO_FISICO.md` | All four domains | Immutable specialized rector authority | Canonical relationships, vocabularies, workflow, tenant authority, no inference |
| `docs/rector/baseline/43_PLAN_MAESTRO_RECTOR_DISENO_Y_DESARROLLO.md` | All four domains | Immutable specialized rector authority | Canonical relationships, vocabularies, workflow, tenant authority, no inference |
| `docs/rector/baseline/44_CONTRATO_ESTRUCTURA_NORMATIVA_REQUISITOS_CONTROLES.md` | All four domains | Immutable specialized rector authority | Canonical relationships, vocabularies, workflow, tenant authority, no inference |
| `docs/rector/baseline/45_CONTRATO_DESARROLLO_CERRADO_Y_NO_INFERENCIA.md` | All four domains | Immutable specialized rector authority | Canonical relationships, vocabularies, workflow, tenant authority, no inference |
| `docs/rector/baseline/46_REGENTE_MAESTRO_DEL_DESARROLLO.md` | All four domains | Immutable specialized rector authority | Canonical relationships, vocabularies, workflow, tenant authority, no inference |
| `docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml` | All four domains | Approved executable contract | Request/projection schema, operation, permission, audit, serialization |
| `docs/executable-contracts/03_API_RESOURCE_OPERATION_MATRIX.md` | All four domains | Approved executable contract | Request/projection schema, operation, permission, audit, serialization |
| `docs/executable-contracts/05_PERMISSION_CATALOG.md` | All four domains | Approved executable contract | Request/projection schema, operation, permission, audit, serialization |
| `docs/executable-contracts/06_ERROR_MODEL.md` | All four domains | Approved executable contract | Request/projection schema, operation, permission, audit, serialization |
| `docs/executable-contracts/07_IDEMPOTENCY_CONTRACT.md` | All four domains | Approved executable contract | Request/projection schema, operation, permission, audit, serialization |
| `docs/executable-contracts/08_AUDIT_EVENT_CATALOG.md` | All four domains | Approved executable contract | Request/projection schema, operation, permission, audit, serialization |
| `docs/executable-contracts/13_AUTHENTICATION_AUTHORIZATION_CONTRACT.md` | All four domains | Approved executable contract | Request/projection schema, operation, permission, audit, serialization |
| `docs/executable-contracts/14_FILE_EVIDENCE_STORAGE_CONTRACT.md` | All four domains | Approved executable contract | Request/projection schema, operation, permission, audit, serialization |
| `docs/executable-contracts/23_FRONTEND_AUTHENTICATION_AUTHORIZATION_PROJECTIONS.md` | All four domains | Approved executable contract | Request/projection schema, operation, permission, audit, serialization |
| `docs/executable-contracts/27_PHASE5_METHODOLOGY_BINDING.md` | All four domains | Approved executable contract | Request/projection schema, operation, permission, audit, serialization |
| `docs/physical-data-model/01_PHYSICAL_DATA_MODEL.md` | All four domains | Frozen physical contract | Typed FK/source, tenant ownership and versioning |
| `docs/physical-data-model/02_RELATIONSHIP_AND_CARDINALITY_MATRIX.md` | All four domains | Frozen physical contract | Typed FK/source, tenant ownership and versioning |
| `docs/physical-data-model/03_CONSTRAINTS_AND_INVARIANTS.md` | All four domains | Frozen physical contract | Typed FK/source, tenant ownership and versioning |
| `docs/physical-data-model/05_MULTI_TENANT_ISOLATION_MODEL.md` | All four domains | Frozen physical contract | Typed FK/source, tenant ownership and versioning |
| `docs/physical-data-model/15_PHASE5_METHODOLOGY_BINDING_AMENDMENT.md` | All four domains | Frozen physical contract | Typed FK/source, tenant ownership and versioning |
| `docs/governance/PHASE_5_API_READ_CONTRACT_DECISION.md` | Supporting references | Human approved read/binding decisions | No invented selector authority |
| `docs/governance/PHASE_5_ADMINISTRATIVE_READ_AUTHORITY_DECISION.md` | Supporting references | Human approved read/binding decisions | No invented selector authority |
| `docs/governance/PHASE5_METHODOLOGY_BINDING_ARCHITECTURE_DECISION_20261007.md` | Supporting references | Human approved read/binding decisions | No invented selector authority |
| `apps/frontend/src/core-grc.tsx` | All four domains | UI observation / reusable components / client / existing tests | All forms, details, routes, labels, reference patterns, errors; source is observation, not product authority |
| `apps/frontend/src/main.tsx` | All four domains | UI observation / reusable components / client / existing tests | All forms, details, routes, labels, reference patterns, errors; source is observation, not product authority |
| `apps/frontend/src/api-client.ts` | All four domains | UI observation / reusable components / client / existing tests | All forms, details, routes, labels, reference patterns, errors; source is observation, not product authority |
| `apps/frontend/src/frontend-auth-projections.ts` | All four domains | UI observation / reusable components / client / existing tests | All forms, details, routes, labels, reference patterns, errors; source is observation, not product authority |
| `apps/frontend/src/tenant-onboarding.tsx` | All four domains | UI observation / reusable components / client / existing tests | All forms, details, routes, labels, reference patterns, errors; source is observation, not product authority |
| `apps/frontend/src/styles.css` | All four domains | UI observation / reusable components / client / existing tests | All forms, details, routes, labels, reference patterns, errors; source is observation, not product authority |
| `apps/frontend/src/i18n/display-text.ts` | All four domains | UI observation / reusable components / client / existing tests | All forms, details, routes, labels, reference patterns, errors; source is observation, not product authority |
| `apps/frontend/src/i18n/es.ts` | All four domains | UI observation / reusable components / client / existing tests | All forms, details, routes, labels, reference patterns, errors; source is observation, not product authority |
| `apps/frontend/src/i18n/status-labels.ts` | All four domains | UI observation / reusable components / client / existing tests | All forms, details, routes, labels, reference patterns, errors; source is observation, not product authority |
| `apps/frontend/src/core-grc.test.tsx` | All four domains | UI observation / reusable components / client / existing tests | All forms, details, routes, labels, reference patterns, errors; source is observation, not product authority |
| `apps/frontend/src/api-client.test.ts` | All four domains | UI observation / reusable components / client / existing tests | All forms, details, routes, labels, reference patterns, errors; source is observation, not product authority |
| `apps/backend/src/core-grc/model.ts` | All four domains | Handler / registry / validation / read model / existing tests | Actual permissions, constraints, object scope, state and serialization evidence |
| `apps/backend/src/core-grc/routes.ts` | All four domains | Handler / registry / validation / read model / existing tests | Actual permissions, constraints, object scope, state and serialization evidence |
| `apps/backend/src/core-grc/service.ts` | All four domains | Handler / registry / validation / read model / existing tests | Actual permissions, constraints, object scope, state and serialization evidence |
| `apps/backend/src/core-grc/repository.ts` | All four domains | Handler / registry / validation / read model / existing tests | Actual permissions, constraints, object scope, state and serialization evidence |
| `apps/backend/src/core-grc/security.ts` | All four domains | Handler / registry / validation / read model / existing tests | Actual permissions, constraints, object scope, state and serialization evidence |
| `apps/backend/src/core-grc/subject-read.ts` | All four domains | Handler / registry / validation / read model / existing tests | Actual permissions, constraints, object scope, state and serialization evidence |
| `apps/backend/src/core-grc/subject-create.ts` | All four domains | Handler / registry / validation / read model / existing tests | Actual permissions, constraints, object scope, state and serialization evidence |
| `apps/backend/src/core-grc/methodologies.ts` | All four domains | Handler / registry / validation / read model / existing tests | Actual permissions, constraints, object scope, state and serialization evidence |
| `apps/backend/src/core-grc/core-grc.test.ts` | All four domains | Handler / registry / validation / read model / existing tests | Actual permissions, constraints, object scope, state and serialization evidence |
| `apps/backend/src/core-grc/routes.test.ts` | All four domains | Handler / registry / validation / read model / existing tests | Actual permissions, constraints, object scope, state and serialization evidence |
| `apps/backend/src/core-grc/phase5-lifecycle.postgres.test.ts` | All four domains | Handler / registry / validation / read model / existing tests | Actual permissions, constraints, object scope, state and serialization evidence |
| `apps/backend/src/core-grc/phase5-final-closure.test.ts` | All four domains | Handler / registry / validation / read model / existing tests | Actual permissions, constraints, object scope, state and serialization evidence |
| `apps/backend/src/core-grc/retention-policy.test.ts` | All four domains | Handler / registry / validation / read model / existing tests | Actual permissions, constraints, object scope, state and serialization evidence |
| `apps/backend/src/core-grc/methodologies.postgres.test.ts` | All four domains | Handler / registry / validation / read model / existing tests | Actual permissions, constraints, object scope, state and serialization evidence |
| `apps/backend/src/core-grc/browser-file-routes.test.ts` | All four domains | Handler / registry / validation / read model / existing tests | Actual permissions, constraints, object scope, state and serialization evidence |
| `apps/backend/src/regulatory/tenant-read.ts` | Compliance / Controls | Authorized normative/reference resolution | Pack visibility, labels and retrieval limits |
| `apps/backend/src/regulatory/pack-entitlement.ts` | Compliance / Controls | Authorized normative/reference resolution | Pack visibility, labels and retrieval limits |
| `apps/backend/src/regulatory/pack-contract.ts` | Compliance / Controls | Authorized normative/reference resolution | Pack visibility, labels and retrieval limits |
| `apps/backend/src/regulatory/tenant-classification.ts` | Compliance / Controls | Authorized normative/reference resolution | Pack visibility, labels and retrieval limits |
| `apps/backend/src/security/administrative-read.ts` | Supporting references | Tenant/RBAC resolver | Membership lookup authority is administrative; default DENY |
| `apps/backend/src/security/tenant-context.ts` | Supporting references | Tenant/RBAC resolver | Membership lookup authority is administrative; default DENY |
| `apps/backend/src/security/authorization.ts` | Supporting references | Tenant/RBAC resolver | Membership lookup authority is administrative; default DENY |
| `apps/backend/src/security/ownership.ts` | Supporting references | Tenant/RBAC resolver | Membership lookup authority is administrative; default DENY |
| `apps/backend/src/security/frontend-projections.ts` | Supporting references | Tenant/RBAC resolver | Membership lookup authority is administrative; default DENY |
| `apps/backend/src/configuration/resolver.ts` | Effective configuration | Canonical resolution implementation | Resolver exists; no HTTP discovery/list route established |
| `packages/shared-types/src/index.ts` | All four domains | Shared contract constants | Reuse versioned enums rather than frontend-owned options |
| `packages/contracts/src/phase5-read-contracts.test.ts` | All four domains | Existing contract checks | Evidence of contract coverage; not executed in audit |
| `packages/contracts/src/pre-f5b-executable-contracts.test.ts` | All four domains | Existing contract checks | Evidence of contract coverage; not executed in audit |
| `packages/contracts/src/phase5-executability-preflight.test.ts` | All four domains | Existing contract checks | Evidence of contract coverage; not executed in audit |
| `packages/contracts/src/phase5-retention-policy-contract.test.ts` | All four domains | Existing contract checks | Evidence of contract coverage; not executed in audit |
| `packages/contracts/src/phase5-administrative-read-contract.test.ts` | All four domains | Existing contract checks | Evidence of contract coverage; not executed in audit |
| `database/migrations/20260916000300_normative_control_evidence.sql` | Scope contracts only | Versioned persistence / grants / constraints | Read-only; risk tables in shared file do not authorize Risk work |
| `database/migrations/20260916000400_risk_operations_privacy.sql` | Scope contracts only | Versioned persistence / grants / constraints | Read-only; risk tables in shared file do not authorize Risk work |
| `database/migrations/20260916000600_constraints_and_uniqueness.sql` | Scope contracts only | Versioned persistence / grants / constraints | Read-only; risk tables in shared file do not authorize Risk work |
| `database/migrations/20260916000700_foreign_keys.sql` | Scope contracts only | Versioned persistence / grants / constraints | Read-only; risk tables in shared file do not authorize Risk work |
| `database/migrations/20260921000100_pre_f5c_executable_physical_reconciliation.sql` | Scope contracts only | Versioned persistence / grants / constraints | Read-only; risk tables in shared file do not authorize Risk work |
| `database/migrations/20260921000200_phase5_core_grc_runtime_permissions.sql` | Scope contracts only | Versioned persistence / grants / constraints | Read-only; risk tables in shared file do not authorize Risk work |
| `database/migrations/20260923000200_phase5_final_closure.sql` | Scope contracts only | Versioned persistence / grants / constraints | Read-only; risk tables in shared file do not authorize Risk work |
| `database/migrations/20260924000200_phase5_retention_policy_lifecycle.sql` | Scope contracts only | Versioned persistence / grants / constraints | Read-only; risk tables in shared file do not authorize Risk work |
| `database/migrations/20260928000100_phase5_administrative_read_permissions.sql` | Scope contracts only | Versioned persistence / grants / constraints | Read-only; risk tables in shared file do not authorize Risk work |
| `database/migrations/20260928000400_phase5_regulatory_catalog_contract_alignment.sql` | Scope contracts only | Versioned persistence / grants / constraints | Read-only; risk tables in shared file do not authorize Risk work |
| `database/migrations/20260929000200_phase5_plus_permissions_applicability.sql` | Scope contracts only | Versioned persistence / grants / constraints | Read-only; risk tables in shared file do not authorize Risk work |
| `database/migrations/20260929000300_phase5_plus_subject_validation_access.sql` | Scope contracts only | Versioned persistence / grants / constraints | Read-only; risk tables in shared file do not authorize Risk work |
| `database/migrations/20261007000200_phase5_methodology_binding.sql` | Scope contracts only | Versioned persistence / grants / constraints | Read-only; risk tables in shared file do not authorize Risk work |
| `database/migrations/manifest.json` | Scope contracts only | Versioned persistence / grants / constraints | Read-only; risk tables in shared file do not authorize Risk work |
| `database/expected-schema.json` | All four domains | Frozen executable schema projection | Column types and typed relationships |
| `data/regulatory/catalogs/tcdx-unified-compliance-control-catalog/v1.1/canonical_vocabularies.json` | Supporting catalogs | Authorized import vocabularies | Does not define severity, priority or evidence types |
| `artifacts/phase5-integration/PHASE5_INTEGRATION_RESULT.json` | Governance | Integrated closure evidence | Phase 5 PASS preserved; no QA access |
| `artifacts/phase5-integration/PHASE5_FINAL_RECOVERY_CLOSURE.md` | Governance | Latest transport recovery/closure | Historical failure not current gate |
| `docs/ui/VISUAL_BASELINE_MANIFEST.json` | UI | Visual authority manifest | Active v1.0; pending v1.2 is not human approved |
| `docs/ui/TCDX_GRC_VISUAL_CONTRACT_v1.0.md` | UI | Active visual contract | Tokens, approved layout, component language, responsive and human gates |
| `docs/ui/TCDX_GRC_DESIGN_TOKENS_CONTRACT_v1.0.md` | UI | Active visual contract | Tokens, approved layout, component language, responsive and human gates |
| `docs/ui/TCDX_GRC_COMPONENT_CONTRACT_v1.0.md` | UI | Active visual contract | Tokens, approved layout, component language, responsive and human gates |
| `docs/ui/TCDX_GRC_LAYOUT_AND_NAVIGATION_v1.0.md` | UI | Active visual contract | Tokens, approved layout, component language, responsive and human gates |
| `docs/ui/TCDX_GRC_DASHBOARD_CONTRACT_v1.0.md` | UI | Active visual contract | Tokens, approved layout, component language, responsive and human gates |
| `docs/ui/TCDX_GRC_VISUAL_ACCEPTANCE_GATES_v1.0.md` | UI | Active visual contract | Tokens, approved layout, component language, responsive and human gates |
| `docs/ui/baselines/dashboard/TCDX_GRC_DASHBOARD_BASELINE_v1.0.png` | UI | Approved image/brand asset | Versioned reference only; preserved |
| `docs/ui/assets/brand/tecdex-logo-light.svg` | UI | Approved image/brand asset | Versioned reference only; preserved |
| `e2e/core-grc-ui.spec.ts` | All four domains | Existing E2E/visual coverage | Read inventory; no E2E executed |
| `e2e/branding.spec.ts` | All four domains | Existing E2E/visual coverage | Read inventory; no E2E executed |

## Complete form/screen coverage

42 mutation surfaces: 11 create, one edit (`retentionPolicyUpdate`), 30 transitions. Zero-input transitions count as forms because they are business operations. In addition: 11 detail drawers, 11 collection workspaces, their status filters, four Controls filters, and three auxiliary Controls picker inputs. The Evidence upload controls belong to Evidence creation and are counted as fields, not an additional independent create screen. SoA/Evidence/Assurance typed array members are separately audited in the CSV.

| Screen | Domain | Operation / schema | Kind; permitted source state | Visible inputs |
| --- | --- | --- | --- | --- |
| cumplimiento | Compliance | applicabilityCreate / Requirement must be accessible; scope Subject, when present, is active, effective and belo | create; new | requirement_id, scope_subject_id, applicability_decision, rationale, effective_from, effective_to |
| cumplimiento | Compliance | applicabilitySubmit / named closed request | transition; draft | rationale |
| cumplimiento | Compliance | applicabilityApprove / Approval actor and timestamp come only from the authorized server context; SoD remains man | transition; submitted | NONE: context supplies target/version |
| requisitos | Compliance | requirementAssessmentCreate / Applicability and optional EffectiveConfiguration must be same-tenant and compatible; meth | create; new | requirement_applicability_id, methodology_version_ref, effective_configuration_id |
| requisitos | Compliance | requirementAssessmentStart / named closed request | transition; not_assessed | NONE: context supplies target/version |
| requisitos | Compliance | requirementAssessmentSubmit / result_status and domain_conclusion are distinct; assessed_at is server-generated. | transition; in_progress | result_status, domain_conclusion, coverage_percent |
| requisitos | Compliance | requirementAssessmentApprove / SoD and the assessed-to-approved precondition are enforced from authoritative state. | transition; assessed | NONE: context supplies target/version |
| soa | Compliance | soaCreate / Tenant, soa_version, initial draft state, row_version and technical identities are server- | create; new | framework_version_id, title, effective_from, items |
| soa | Compliance | soaPublish / named closed request | transition; draft | reason |
| controles | Controls | controlInstantiate / Creates only a TENANT_OWNED tenant_instantiated Control and version 1 from an accessible g | create; new | based_on_control_version_id, control_code, name, business_owner_subject_id, objective, control_type, nature, frequency_code, execution_method, verification_method, minimum_evidence, suggested_owner_role_code, effective_from, effective_to |
| evaluaciones-control | Controls | controlAssessmentCreate / Control, version and optional EffectiveConfiguration must be compatible and belong to the  | create; new | control_id, control_version_id, methodology_version_ref, effective_configuration_id |
| evaluaciones-control | Controls | controlAssessmentStart / named closed request | transition; planned | NONE: context supplies target/version |
| evaluaciones-control | Controls | controlAssessmentSubmit / Overall effectiveness is derived by the compatible methodology and is not client authority | transition; in_progress | result_status, domain_conclusion, design_effectiveness, operating_effectiveness, coverage_percent |
| evaluaciones-control | Controls | controlAssessmentReview / named closed request | transition; completed | NONE: context supplies target/version |
| evaluaciones-control | Controls | controlAssessmentApprove / SoD and reviewed-to-approved state are enforced from authoritative state. | transition; reviewed | NONE: context supplies target/version |
| pruebas | Controls | assuranceTestCreate / Creates only planned state; tenant, row_version, actors and lifecycle timestamps are serve | create; new | control_id, control_version_id, test_code, planned_at |
| pruebas | Controls | assuranceTestStart / named closed request | transition; planned | NONE: context supplies target/version |
| pruebas | Controls | assuranceTestExecute / Executor identity and executed_at are server-derived; samples, when supplied, must be same | transition; in_progress | result_status, domain_conclusion, samples |
| pruebas | Controls | assuranceTestReview / named closed request | transition; completed | NONE: context supplies target/version |
| pruebas | Controls | assuranceTestApprove / SoD and reviewed-to-approved state are enforced from authoritative state. | transition; reviewed | NONE: context supplies target/version |
| solicitudes-evidencia | Evidence | evidenceRequestCreate / Exactly one approved typed target must be present; target existence, visibility, type and  | create; new | request_code, requirement_id, control_id, requirement_assessment_id, control_assessment_id, assurance_test_id, assigned_membership_id, due_at |
| solicitudes-evidencia | Evidence | evidenceRequestFulfill / named closed request | transition; open | evidence_version_id |
| evidencias | Evidence | evidenceCreate / FileObject must be finalized, usable and scan-PASS; all objects and policies must be tenan | create; new | evidence_code, evidence_type, business_owner_subject_id, valid_from, valid_to, retention_policy_id, source_kind, file_object_id, period_start, period_end, effective_from, effective_to, expires_at, provenance_ref, links |
| evidencias | Evidence | evidenceSubmit / named closed request | transition; draft | NONE: context supplies target/version |
| evidencias | Evidence | evidenceReviewStart / named closed request | transition; submitted | NONE: context supplies target/version |
| evidencias | Evidence | evidenceApprove / Decision=approved, reviewer identity and reviewed_at are server-derived; submitter/reviewe | transition; under_review | sufficiency, relevance, rationale |
| evidencias | Evidence | evidenceReject / Decision=rejected, reviewer identity and reviewed_at are server-derived; rejection reason  | transition; under_review | sufficiency, relevance, rationale |
| retencion | Evidence (supporting retention) | retentionPolicyCreate / Precedence must match policy_kind exactly (500/400/300/200/100). effective_from, effective | create; new | policy_code, version_number, policy_kind, retention_seconds, trigger_event_code, precedence_rank, is_mandatory |
| retencion | Evidence (supporting retention) | retentionPolicyUpdate / Draft-only update; strong If-Match supplies row_version. Policy identity, kind, trigger, p | edit; draft | retention_seconds, is_mandatory |
| retencion | Evidence (supporting retention) | retentionPolicyReview / Empty command body. The sole API concurrency precondition is the strong If-Match header. | transition; draft | NONE: context supplies target/version |
| retencion | Evidence (supporting retention) | retentionPolicyApprove / Empty command body. The sole API concurrency precondition is the strong If-Match header. | transition; under_review | NONE: context supplies target/version |
| retencion | Evidence (supporting retention) | retentionPolicyPublish / Empty command body. The sole API concurrency precondition is the strong If-Match header. | transition; approved | NONE: context supplies target/version |
| issues | Actions | issueCreate / Exactly one Core GRC typed origin is accepted in Phase 5; risk, incident, supplier and aud | create; new | issue_code, issue_kind, title, description, severity, priority, business_owner_subject_id, due_date, requirement_assessment_id, control_assessment_id, assurance_test_id, origin_role |
| issues | Actions | issueTriage / Severity and priority remain distinct from the open-to-triaged lifecycle transition. | transition; open | severity, priority, business_owner_subject_id, due_date |
| issues | Actions | issueStartRemediation / named closed request | transition; triaged | NONE: context supplies target/version |
| issues | Actions | issueRequestVerification / named closed request | transition; remediation_in_progress | NONE: context supplies target/version |
| issues | Actions | issueVerifyClose / Verifier identity and closed_at are server-derived; required SoD is enforced before closin | transition; pending_verification | verification_decision, rationale |
| acciones | Actions | actionCreate / Parent Issue is the path identity and must belong to the selected tenant; initial state is | create; new | issue_id, action_code, title, description, priority, assigned_membership_id, due_date |
| acciones | Actions | actionStart / named closed request | transition; pending | NONE: context supplies target/version |
| acciones | Actions | actionSubmitForReview / Executes only action.submit_review from in_progress to in_review. | transition; in_progress | NONE: context supplies target/version |
| acciones | Actions | actionComplete / Closure EvidenceVersion must be eligible and same-tenant; completion is allowed only from  | transition; in_review | evidence_version_id, link_role |
| acciones | Actions | actionVerify / Verifier identity and verified_at are server-derived; the verifier/completer SoD policy is | transition; completed | verification_decision, rationale, retest_reference |

Generic edit forms are not present for the other ten aggregates; no new CRUD operation is inferred. EvidenceReview and ActionVerification creation happens through the existing review/verification commands. There is no separate Document create/detail UI in these workspaces; the upload pipeline creates a FileObject, not a Document. Supporting company/user administrative creation screens are outside this business-form scope. Their reference-read contracts are included where relevant.

Route/navigation observation: `apps/frontend/src/core-grc.tsx:111` defines all eleven modules; `workspaceGroups` and `ModuleWorkspace` at `apps/frontend/src/core-grc.tsx:566` expose SoA, control assessments/tests, requests/retention and issues as existing tabs. Parent-to-child navigation and supplied parent references are absent in CreateDrawer. Existing submodules are therefore reachable; the defect is contextual navigation, not missing top-level routes.

## External rector source reconciliation

The requested exact ZIP basename with `(1)` was not found in the searched repository, Downloads or Documents locations. The available source is `/Users/andresbarouh/Downloads/TCDX_GRC_RECTOR_BASELINE_v1.1_2026-09-15.zip`; SHA-256 `e08519a2216828d58296a47c3ff1b549db98d02ac37ea35ee51e037295fc807e`, 48 entries. Relevant 22/24/25/31/43 entries were inspected read-only. It predates v1.7, lacks 45, and does not override the active immutable baseline. Exact identity with the requested `(1)` archive is UNKNOWN; verification requires that artifact or its approved checksum. This does not affect the active-v1.7 audit, whose integrity passed. No ZIP was extracted into the repository.

## Counting convention

The CSV contains 361 rows. A field occurrence is identified by screen + operation + surface_kind + field_name; repetition between create, detail and list is intentional. JSON members count as schema member rows, not separately visible controls. Conditional controls include the version selector whose label appears only when multiple versions exist. Fields supplied internally (expected_version, tenant header, actors, generated UUIDs) are documented in the audit but are not visible-input rows. Read-only scalar fields are included; children deliberately excluded by the current renderer are catalogued as omissions in 04/06.
