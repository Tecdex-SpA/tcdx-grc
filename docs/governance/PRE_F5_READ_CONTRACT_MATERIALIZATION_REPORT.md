# TCDX GRC — PRE-F5 read-contract materialization report

## Authority and boundary

| Field | Evidence |
|---|---|
| Task packet | `PRE_F5_MATERIALIZE_READ_CONTRACTS.md` at `84f25b19fc004ca4639baa93bc50b30b40e35545` |
| Approved main base | PR #11 merge `5b6f8852b1f3ac70f469b024a0df951fc9e83365` |
| Master regent | `TCDX_GRC_MASTER_REGENT_BASELINE_v1.5_2026-09-16` |
| Human read decision | `DR-PHASE5-API-READ-2026-09-17-002` |
| Human Phase 5 decision | `DR-PHASE5-2026-09-17-001` |
| Release-dependency decision | `DR-PHASE5-RELEASE-DEPS-2026-09-17-003` |
| Materialization boundary | Executable read contracts and contract tests only |

No Core GRC runtime, backend, frontend, database, migration, seed, canonical entity, lifecycle, capability, commercial plan, infrastructure or deployment change is part of this materialization.

## Exact materialization

The approved surface adds exactly 21 naturally idempotent, read-only operations:

```text
applicabilityList
applicabilityGet
requirementAssessmentList
requirementAssessmentGet
soaList
soaGet
controlList
controlGet
controlAssessmentList
controlAssessmentGet
assuranceTestList
assuranceTestGet
evidenceRequestList
evidenceRequestGet
evidenceList
evidenceGet
evidenceVersionGet
issueList
issueGet
actionList
actionGet
```

All 21 operations use the approved `/api/v1` paths, Bearer security, tenant-context selection, dedicated read permission, `COMMON` errors, `NATURALLY_IDEMPOTENT`, `RO`, no domain event and authorization/not-found concealment semantics.

The permission catalog adds exactly ten executable read-permission contracts:

```text
compliance.applicability.read
compliance.requirement_assessment.read
compliance.soa.read
controls.control.read
controls.control_assessment.read
controls.assurance_test.read
evidence.evidence_request.read
evidence.evidence.read
remediation.issue.read
remediation.action.read
```

The OpenAPI contract adds typed, minimal projections for the eleven approved aggregate/resource families and only the child/relationship projections authorized by the Decision Record:

- SoA items;
- ControlVersion, ControlObjective and ControlScope references;
- AssuranceSample details;
- EvidenceVersion, EvidenceLink and EvidenceReview metadata;
- typed IssueOrigin;
- ActionEvidenceLink and ActionVerification metadata.

No generic dashboard/reporting endpoint was added. No projection includes tenant authority, actor/audit internals, secrets, file binary or signed URLs.

## Verification evidence

| Check | Result | Evidence |
|---|---|---|
| Matrix ↔ approved Decision Record | PASS | contract test derives the authoritative 21 operation IDs/routes from the merged Decision Record |
| Matrix ↔ OpenAPI | PASS | 95 unique operations in each; 26 GET and 69 POST |
| OpenAPI ↔ Permission Catalog | PASS | 21 reads map to the exact ten dedicated permissions |
| Projection ↔ frozen physical model | PASS | projection field contract checked against `database/expected-schema.json` |
| OpenAPI YAML parse/structure | PASS | parsed successfully; 95 unique operation IDs |
| Contract tests | PASS | 1 file, 6 tests |
| Full tests | PASS | 9 files, 48 tests |
| Typecheck | PASS | all workspace packages/apps |
| Build | PASS | all workspace packages/apps |
| Phase 3 generated-contract drift check | PASS | 229 physical tables, 134 initial runtime permissions, 95 lifecycle edges, 10 migrations |
| Rector governance/integrity | PASS | active v1.5 and protected v1.4 integrity |
| Rector status regression | PASS | approved Phase 5 state preserved |
| `git diff --check` | PASS | no whitespace errors |
| Database diff | PASS | zero changed paths under `database/` |
| Rector baseline diff | PASS | zero changed paths under `docs/rector/` |
| Lifecycle diff | PASS | `09_SEED_MANIFESTS.md` unchanged |
| Functional application diff | PASS | zero changed paths under `apps/` |

The frozen Phase 3 seed generator intentionally remains at its approved 134 initial runtime permissions. The ten PRE-F5 permissions are executable contract additions only; materializing Permission/RolePermission runtime rows would change `database/` and start Phase 5 implementation, both prohibited by this task packet.

## Gate result

```text
RECTOR_GATE=PASS
MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.5_2026-09-16
CODEX_VARIATION_BUDGET=ZERO
TASK_PACKET_STATUS=COMPLETE
PHASE_5=AUTHORIZED
PHASE_5_API_READ_CONTRACT=APPROVED
PHASE_5_READ_CONTRACT_MATERIALIZED=PASS
PHASE_5_RELEASE_DEPENDENCIES=APPROVED
PHASE_5_STARTED=0
DATABASE_CONTRACT_CHANGED=0
EXECUTABLE_CONTRACTS_CHANGED=1
TYPECHECK=PASS
BUILD=PASS
TESTS=PASS
RECTOR_REGRESSION=PASS
PHASE_6_STARTED=0
HUMAN_GATE_REQUIRED=NO_NEW_DECISION
HUMAN_REVIEW_BEFORE_MERGE=REQUIRED
SUPUESTOS_INTRODUCIDOS=NONE
ARCHIVOS_FUERA_DE_ALCANCE_MODIFICADOS=NONE
ALTERNATIVAS_NO_RESUELTAS=NONE
ACCIONES_BLOQUEADAS_NO_EJECUTADAS=DATABASE_CHANGE,BACKEND_IMPLEMENTATION,FRONTEND_IMPLEMENTATION,PHASE_5_RUNTIME_START,PHASE_6,DEPLOY,PUSH,PR,MERGE
```

This PASS is documentary/contractual PRE-F5 evidence. It does not declare `CORE_GRC_SLICE=PASS`, runtime readiness, deploy readiness or market release readiness.
