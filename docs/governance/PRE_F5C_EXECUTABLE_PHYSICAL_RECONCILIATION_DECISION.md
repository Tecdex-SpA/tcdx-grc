# TCDX GRC — PRE-F5C executable/physical reconciliation decision

## Decision record

- Decision ID: `DR-PRE-F5C-2026-09-21-005`
- Date: `2026-09-21`
- Status: `APPROVED`
- Owner/approver: Andrés Barouh acting as Product Owner/CPO, Architecture Owner, Data Model Owner for this reconciliation, Backend Owner, Security & Privacy Reviewer and QA/Release Owner.
- Gate unlocked: PRE-F5C contract, physical amendment, incremental migration candidate and isolated local validation only.

This record materializes the human decision supplied in the PRE-F5C mandate. It is not Codex self-approval and does not authorize Phase 5 start, Phase 6, QA migration, deployment, push, pull request or merge.

## Approved reconciliation

1. The only F5 optimistic-concurrency authority is an explicit `row_version bigint NOT NULL DEFAULT 1` on the same workflow row. Stateful request `expected_version` means exactly the target row's `row_version`; business versions, state, hashes, AuditEvent counts and `xmin` are prohibited as substitutes.
2. `regulatory.requirement_applicabilities`, `regulatory.requirement_assessments`, `regulatory.statements_of_applicability`, `controls.control_assessments`, `controls.assurance_tests` and `evidence.evidence_versions` become mutable tenant rows with `updated_at`, nullable update actors, `row_version`, the canonical actor check and positive-version check. No table is added.
3. RequirementApplicability uniqueness is tenant + requirement + nullable scope + applicability version using PostgreSQL 16 `UNIQUE NULLS NOT DISTINCT`; it gains a same-tenant `superseded_by_id` FK. SoA uniqueness includes framework version, SoA items prohibit duplicate reference ControlVersions, and EvidenceVersion content versions are unique per tenant Evidence.
4. The authoritative lifecycle registry is the highest version for each entity/from/command key. Published history is not rewritten. The PRE-F5C incremental delta publishes the reconciled current definitions and supersedes the former Evidence-root authority and `assurance_test.complete` definition.
5. The nine authorized API additions are `soaCreate`, `controlAssessmentStart`, `assuranceTestCreate`, `assuranceTestStart`, `assuranceTestReview`, `assuranceTestApprove`, `issueStartRemediation`, `issueRequestVerification` and `issueVerifyClose`.
6. Only `compliance.soa.create` and `controls.assurance_test.create` are added as runtime permissions. Permission and role relationships resolve by `permission_code` and `role_code`; absence remains DENY.
7. An API-backed lifecycle command persists exactly one material AuditEvent using the operation-matrix code. A lifecycle-specific audit code remains valid only for internal/system commands without a public operation code.
8. The physical schema remains exactly 229 tables. The change is one forward-only transactional migration after `20260916001000`; operational rollback is backup/restore, not a destructive down migration.

## Boundary and gate state

```text
MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.5_2026-09-16
CODEX_VARIATION_BUDGET=ZERO
PRE_F5C_LOCAL_GATE=PASS
PHASE_5_EXECUTABILITY_PREFLIGHT=PASS
PHASE_5=AUTHORIZED_NOT_STARTED
PHASE_5_STARTED=0
PHASE_6_STARTED=0
DATABASE_TABLES=229
DATABASE_SCHEMA_CHANGED=1
QA_MIGRATION_EXECUTED=0
PRE_F5C_PHYSICAL_RUNTIME=BLOCKED_PENDING_SEPARATE_QA_AUTHORIZATION
CORE_GRC_SLICE=BLOCKED_PENDING_PRE_F5C_QA_MATERIALIZATION
```

The local PASS establishes a reviewable migration candidate and executable preflight. Only a separate human-authorized QA backup, preflight, migration, schema/isolation verification and post-materialization report may set `PRE_F5C_PHYSICAL_RUNTIME=PASS` and restore `CORE_GRC_SLICE=READY_FOR_IMPLEMENTATION`.
