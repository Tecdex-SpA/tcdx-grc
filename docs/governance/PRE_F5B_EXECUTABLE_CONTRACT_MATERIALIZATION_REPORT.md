# TCDX GRC — PRE-F5B executable-contract materialization report

## Authority and boundary

| Field | Evidence |
|---|---|
| Continuity base | `1c1ffb358856dbc06d58b575a4704a6dd9fe00a0` (main post PR #12) |
| Working branch | `governance/close-phase-5-executable-contracts` |
| Master regent | `TCDX_GRC_MASTER_REGENT_BASELINE_v1.5_2026-09-16` |
| Human decision | `DR-PRE-F5B-2026-09-21-004` |
| Prior Phase 5 decisions | `DR-PHASE5-2026-09-17-001`; `DR-PHASE5-API-READ-2026-09-17-002`; `DR-PHASE5-RELEASE-DEPS-2026-09-17-003` |
| Materialization boundary | Executable contracts, contract tests, decision evidence and mutable execution status only |

No physical schema, migration, runtime seed, backend, frontend, infrastructure, deployment or Phase 6 change is part of this materialization. `PHASE_5_STARTED=0` remains authoritative.

## Cross-catalog result

```text
PUBLIC_API_OPERATIONS=97
PUBLIC_READ_OPERATIONS=26
PUBLIC_MUTATING_OPERATIONS=71
PHASE_5_MUTATION_REQUEST_SCHEMAS=30
PHASE_5_COLLECTION_READS=10
PUBLISHED_DOMAIN_INTEGRATION_EVENTS=56
PUBLISHED_EXECUTABLE_PERMISSION_CONTRACTS=145
PHASE_3_RUNTIME_PERMISSION_ROWS=134
PUBLISHED_LIFECYCLE_EDGES=95
PUBLISHED_AUDIT_EVENT_CODES=166
DATABASE_TABLES=229
DATABASE_SCHEMA_CHANGED=0
```

All 97 operation IDs, methods and paths match between OpenAPI and the operation matrix. All 71 POST operations are idempotency-key-required and have an audit code; all 26 GET operations are naturally idempotent. The two PRE-F5B operations are included in the 71 mutations.

## Closed Core GRC requests

The following 30 Phase 5 mutation operations now reference a specific schema with `additionalProperties: false` and no `DomainCommandRequest`:

```text
applicabilityCreate                 ApplicabilityCreateRequest
applicabilitySubmit                 ApplicabilitySubmitRequest
applicabilityApprove                ApplicabilityApproveRequest
requirementAssessmentCreate         RequirementAssessmentCreateRequest
requirementAssessmentStart          RequirementAssessmentStartRequest
requirementAssessmentSubmit         RequirementAssessmentSubmitRequest
requirementAssessmentApprove        RequirementAssessmentApproveRequest
soaPublish                          SoaPublishRequest
controlInstantiate                  ControlInstantiateRequest
controlAssessmentCreate             ControlAssessmentCreateRequest
controlAssessmentSubmit             ControlAssessmentSubmitRequest
controlAssessmentReview             ControlAssessmentReviewRequest
controlAssessmentApprove            ControlAssessmentApproveRequest
assuranceTestExecute                AssuranceTestExecuteRequest
uploadIntentCreate                  UploadIntentCreateRequest
uploadFinalize                      UploadFinalizeRequest
evidenceRequestCreate               EvidenceRequestCreateRequest
evidenceRequestFulfill              EvidenceRequestFulfillRequest
evidenceCreate                      EvidenceCreateRequest
evidenceSubmit                      EvidenceSubmitRequest
evidenceReviewStart                 EvidenceReviewStartRequest
evidenceApprove                     EvidenceApproveRequest
evidenceReject                      EvidenceRejectRequest
issueCreate                         IssueCreateRequest
issueTriage                         IssueTriageRequest
actionCreate                        ActionCreateRequest
actionStart                         ActionStartRequest
actionSubmitForReview               ActionSubmitForReviewRequest
actionComplete                      ActionCompleteRequest
actionVerify                        ActionVerifyRequest
```

Twenty-one stateful F5 commands use `expected_version` as their single contractual concurrency precondition and do not also expose `If-Match`. The nine create/materialization commands do not accept `expected_version`. The previously inferred closed priority enum was removed: `priority` remains a required physical field, but no unpublished value catalog is fabricated.

## Pagination

The exact ten Phase 5 collection reads are `applicabilityList`, `requirementAssessmentList`, `soaList`, `controlList`, `controlAssessmentList`, `assuranceTestList`, `evidenceRequestList`, `evidenceList`, `issueList` and `actionList`.

Each has:

- `page[size]` integer minimum 1, maximum 100, default 25;
- invalid input mapped to COMMON HTTP 400;
- opaque cursor containing stable-order and server continuation/filter context;
- no offset pagination and no cursor-derived authority;
- `created_at DESC, <entity_primary_id> DESC` stable order, validated against the frozen physical columns.

## Action workflow

`actionSubmitForReview` publishes `POST /actions/{id}:submit-for-review` for the existing registry command `action.submit_review` and exact edge `in_progress -> in_review`.

```text
PERMISSION=remediation.action.transition
AUDIT=audit.remediation.action.submit_review.v1
DOMAIN_EVENT=NONE
IDEMPOTENCY=IDEMPOTENCY_KEY_REQUIRED
TRANSACTION=TX
```

It does not merge with `actionComplete`; the contractual sequence remains `pending -> in_progress -> in_review -> completed -> verified`.

## Evidence materialization

`evidenceCreate` publishes `POST /evidence`. From one finalized, usable, scan-PASS FileObject, the transaction creates one Evidence aggregate, its first draft EvidenceVersion and requested valid EvidenceLinks. It does not duplicate binary content or persist a signed URL.

The exact typed target set is:

```text
Requirement
Control
ControlVersion
RequirementAssessment
ControlAssessment
AssuranceTest
```

No generic `target_type`/`target_id` is accepted. Type, existence, visibility and tenant compatibility are command preconditions; a ControlVersion-only link does not prove tenant implementation.

```text
PERMISSION=evidence.evidence.create
BASE_ROLE=Evidence Owner
AUDIT=audit.evidence.evidence.create.v1
DOMAIN_EVENT=evidence.evidence.created.v1
EVENT_CONSUMERS=NONE_CONTRACTUALLY_REQUIRED
IDEMPOTENCY=IDEMPOTENCY_KEY_REQUIRED
TRANSACTION=TX
RUNTIME_PERMISSION_SEED_CREATED=0
```

## Verification evidence

| Check | Result | Evidence |
|---|---|---|
| Directed PRE-F5/PRE-F5B contract tests | PASS | 2 files, 14 tests |
| Full tests | PASS | 10 files, 56 tests |
| OpenAPI YAML parse/structure | PASS | 97 unique operation IDs; 26 GET; 71 POST; 30 closed F5 request schemas |
| Matrix/OpenAPI reconciliation | PASS | exact operation ID/method/path set |
| Permission/event/audit/idempotency reconciliation | PASS | deterministic cross-catalog tests; counts above |
| Frozen schema | PASS | expected schema parses to 229 tables; required Evidence objects exist |
| Database path diff | PASS | no changed path under `database/` |
| Rector baseline diff | PASS | no changed path under `docs/rector/` |
| Functional application diff | PASS | no changed path under `apps/` |
| Rector governance/integrity | PASS | active v1.5 and protected v1.4 integrity |
| Rector status regression | PASS | approved phases preserved; Phase 5/6 not started |
| Typecheck | PASS | all workspace packages/apps |
| Build | PASS | all workspace packages/apps |
| `git diff --check` | PASS | no whitespace errors |

No E2E, runtime or visual check was executed because Phase 5 implementation has not started and this task changes no user-facing UI or runtime behavior.

## Gate result

```text
RECTOR_GATE=PASS
MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.5_2026-09-16
CODEX_VARIATION_BUDGET=ZERO
PHASE_5=AUTHORIZED
PHASE_5_EXECUTABLE_CONTRACTS=CLOSED
PHASE_5_PAGINATION_CONTRACT=PASS
PHASE_5_MUTATION_REQUEST_SCHEMAS=PASS
PHASE_5_ACTION_WORKFLOW_CONTRACT=PASS
PHASE_5_EVIDENCE_CREATION_CONTRACT=PASS
PHASE_5_STARTED=0
PHASE_6_STARTED=0
DATABASE_TABLES=229
DATABASE_SCHEMA_CHANGED=0
CORE_GRC_SLICE=READY_FOR_IMPLEMENTATION
TYPECHECK=PASS
BUILD=PASS
TESTS=PASS
RECTOR_REGRESSION=PASS
HUMAN_GATE_REQUIRED=NO_NEW_DECISION
HUMAN_REVIEW_BEFORE_MERGE=REQUIRED
PUSH=NOT_EXECUTED
PR=NOT_EXECUTED
MERGE=NOT_EXECUTED
DEPLOY=NOT_EXECUTED
```

This is PRE-F5B contractual readiness only. It does not declare Phase 5 implementation, Core GRC runtime PASS, production readiness or market-release readiness.
