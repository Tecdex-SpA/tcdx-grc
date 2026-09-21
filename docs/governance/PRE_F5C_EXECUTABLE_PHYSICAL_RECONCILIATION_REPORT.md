# TCDX GRC — PRE-F5C executable/physical reconciliation report

## Authority and boundary

| Field | Evidence |
|---|---|
| Continuity base | `b8e37607f4c178864fb89ef489161a6ec38d0b67` |
| Contract/physical implementation commit | `51c193a` |
| Working branch | `governance/pre-f5c-executable-physical-reconciliation` |
| Master regent | `TCDX_GRC_MASTER_REGENT_BASELINE_v1.5_2026-09-16` |
| Human decision | `DR-PRE-F5C-2026-09-21-005` |
| Boundary | PRE-F5C only: physical/executable reconciliation, one incremental migration, permanent preflight, local PostgreSQL 16 evidence and governance closure |

No Phase 5 or Phase 6 implementation was started. No backend endpoint, frontend, infrastructure, deployment, QA database, push, pull request or merge was changed or executed.

## Physical reconciliation

The table count remains `DATABASE_TABLES=229`. Each of these tables receives exactly `updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP`, `updated_by_user_identity_id uuid NULL`, `updated_by_service_principal_id uuid NULL` and `row_version bigint NOT NULL DEFAULT 1`, plus canonical update-actor and positive-row-version checks and update-actor FKs:

- `regulatory.requirement_applicabilities`
- `regulatory.requirement_assessments`
- `regulatory.statements_of_applicability`
- `controls.control_assessments`
- `controls.assurance_tests`
- `evidence.evidence_versions`

Existing rows deterministically backfill `updated_at=created_at` and `row_version=1`; no historical actor or business value is fabricated.

Constraint reconciliation:

- replaced RequirementApplicability `(tenant_id, requirement_id, applicability_version)` with `UNIQUE NULLS NOT DISTINCT (tenant_id, requirement_id, scope_subject_id, applicability_version)`;
- added nullable `superseded_by_id` with same-tenant self-FK on RequirementApplicability;
- replaced SoA `(tenant_id, soa_version)` with `(tenant_id, framework_version_id, soa_version)`;
- added SoA-item uniqueness `(tenant_id, statement_of_applicability_id, reference_control_version_id)`;
- added EvidenceVersion uniqueness `(tenant_id, evidence_id, version_number)`.

No UUID sentinel, `COALESCE`, `xmin`, trigger, parallel table or alternate model is used.

## Migration and registry materialization

```text
MIGRATION_ID=20260921000100
MIGRATION_FILE=20260921000100_pre_f5c_executable_physical_reconciliation.sql
MIGRATION_SHA256=1181d7ab26718927124de880e351fbaba3f2daaca41267a1ef66d28ac2021680
TRANSACTIONAL=1
HISTORICAL_MIGRATION_DIFF=0
```

The generator validates the ten historical migration byte hashes and writes only the PRE-F5C incremental migration, manifest, expected schema and seed manifest. The migration preflight requires ledger count 10, migration `20260916001000`, 229 physical tables and absent PRE-F5C columns. Operational rollback is restore from the separately required backup/PITR point; no destructive down migration exists.

The immutable lifecycle registry adds 39 definition rows: 31 active definitions and eight superseding definitions. The current highest-version graph contains 100 published edges over 134 historical definition rows. It replaces Evidence-root transition authority with EvidenceVersion authority and retires `assurance_test.complete` in favor of the reachable `assurance_test.execute` edge without rewriting published history.

## Executable-contract result

```text
API_OPERATION_COUNT=106
GET_OPERATION_COUNT=26
POST_OPERATION_COUNT=80
PHASE_5_MUTATION_REQUEST_SCHEMAS=39
PHASE_5_STATEFUL_REQUEST_SCHEMAS=28
LIFECYCLE_EDGE_COUNT=100
RAW_LIFECYCLE_DEFINITION_ROWS=134
AUDIT_CODE_COUNT=154
PERMISSION_CONTRACT_COUNT=147
RUNTIME_PERMISSION_ROWS=136
```

Added operations:

- `soaCreate`
- `controlAssessmentStart`
- `assuranceTestCreate`
- `assuranceTestStart`
- `assuranceTestReview`
- `assuranceTestApprove`
- `issueStartRemediation`
- `issueRequestVerification`
- `issueVerifyClose`

Added permissions:

- `compliance.soa.create` — GRC Manager and Compliance Manager, tenant scope;
- `controls.assurance_test.create` — GRC Manager, Auditor Lead and Auditor, tenant/audit-engagement scope.

All 26 API-backed F5 lifecycle commands have exact OpenAPI/matrix/registry audit-code equality and require one material AuditEvent only. The unique audit catalog count is derived as 154; lifecycle-only codes remain confined to commands without a public operation-specific code.

## Reachability

The permanent preflight proves these exact paths:

```text
RequirementApplicability: draft -> submitted -> approved
RequirementAssessment: not_assessed -> in_progress -> assessed -> approved
StatementOfApplicability: draft -> published
ControlAssessment: planned -> in_progress -> completed -> reviewed -> approved
AssuranceTest: planned -> in_progress -> completed -> reviewed -> approved
EvidenceVersion: draft -> submitted -> under_review -> approved
Issue: open -> triaged -> remediation_in_progress -> pending_verification -> verified_closed
Action: pending -> in_progress -> in_review -> completed -> verified
```

It also verifies creation/transition operation coverage for the approved Core GRC E2E chain and rejects generic status mutation, duplicate operation IDs, method/path drift, open request schemas, missing `expected_version`, create-time `expected_version`, business-version CAS and dual concurrency authority.

## Verification evidence

| Check | Result | Evidence |
|---|---|---|
| Rector governance status | PASS | active master regent v1.5; Phase 5/6 not started |
| Rector integrity | PASS | active/protected baseline integrity; 229-table authority |
| Contract generation/verification | PASS | 229 tables; 136 runtime permissions; 100 current edges; 134 registry rows; 11 migrations |
| PRE-F5C executability | PASS | 8 permanent tests in `phase5-executability-preflight.test.ts` |
| PRE-F5/PRE-F5B regressions | PASS | current cross-catalog tests included in full 64-test suite |
| OpenAPI YAML parse | PASS | Ruby YAML parser; 106 unique operation IDs |
| Full tests | PASS | 11 files, 64 tests |
| Typecheck | PASS | all workspace packages/apps |
| Lint | PASS | all workspace packages/apps |
| Build | PASS | all workspace packages/apps |
| PRE-F5C 10-to-11 upgrade | PASS | 229 before/after; ledger 10->11; six row-version targets; 39 registry rows; schema mismatches 0 |
| Audit 9-to-11 upgrade regression | PASS | 214->229; guard rollback intact; 15 Audit tables; schema mismatches 0 |
| Empty rebuild | PASS | 11 migrations; schema, seeds, seed reapply, migration reapply all PASS |
| Schema verifier | PASS | 229 tables; 3,387 expected columns; 0 mismatches; 0 forbidden cascades |
| Seed verifier | PASS | 136 permissions; 134 raw/100 authoritative lifecycle definitions; 0 mismatches |
| Migration gates | PASS | checksum, advisory-lock concurrency, unknown-ledger and source-checksum guards |
| Tenant isolation | PASS | 12 positive/negative probes; 0 gaps |
| `git diff --check` | PASS | no whitespace errors |

The local database was the guarded isolated target `127.0.0.1:55432/tcdx-grc`. The QA authority `192.168.2.40/tcdx-grc` was not contacted or mutated.

## Gate result

```text
RECTOR_GATE=PASS
MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.5_2026-09-16
CODEX_VARIATION_BUDGET=ZERO
PRE_F5C_LOCAL_GATE=PASS
PHASE_5_EXECUTABILITY_PREFLIGHT=PASS
PHASE_5=AUTHORIZED_NOT_STARTED
PHASE_5_STARTED=0
PHASE_6_STARTED=0
CORE_GRC_SLICE=BLOCKED_PENDING_PRE_F5C_QA_MATERIALIZATION
DATABASE_TABLES=229
DATABASE_SCHEMA_CHANGED=1
PHYSICAL_MODEL_AMENDMENT=PASS_LOCAL_CANDIDATE
EXPECTED_SCHEMA=PASS
MIGRATION_CREATED=20260921000100
QA_MIGRATION_EXECUTED=0
PRE_F5C_PHYSICAL_RUNTIME=NOT_EXECUTED
PUSH_PERFORMED=0
PR_CREATED=0
MERGE_PERFORMED=0
DEPLOYMENT_PERFORMED=0
UNRESOLVED_RECTOR_CONFLICTS=0
HUMAN_GATE_REQUIRED=QA_BACKUP_REVIEW_AND_MIGRATION_AUTHORIZATION
```

`CORE_GRC_SLICE` cannot return to `READY_FOR_IMPLEMENTATION` until the separately authorized QA materialization and post-migration runtime evidence pass. This report does not claim QA, deployment, Phase 5 implementation, production readiness or market-release readiness.
