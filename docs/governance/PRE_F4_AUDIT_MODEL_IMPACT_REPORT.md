# PRE-F4 Audit model impact report

| Campo | Valor |
|---|---|
| Task ID | `PRE_F4_AUDIT_MODEL_CLOSURE` |
| Active baseline | `TCDX_GRC_MASTER_REGENT_BASELINE_v1.4_2026-09-15` |
| Candidate baseline | `TCDX_GRC_MASTER_REGENT_BASELINE_v1.5_2026-09-16` |
| Base HEAD | `a1fe39533418826eb33e76d975385bdeb3f742f0` |
| Status | `PENDING_HUMAN_APPROVAL` |

## Input evidence and verification

- Primary task packet SHA-256: `647bdc9fcc20de1d8547a3237c703f5e9b568c688b99b57e664ef909094259cd`.
- Reviewed technical handoff SHA-256: `7345723fbfd6f1f45ea31da4012dc892a9e21047a7cbdc630c1e6cae81f8b738`.
- `database/expected-schema.json`: `tableCount=214` and `tables.length=214`.
- Existing Audit tables: universe items, programs, audits, workpapers, tests, samples and test/evidence links.
- Repository verification confirms `scope_text` and `lead_membership_id`, and confirms absence of every stated gap table/relation.
- Existing typed FrameworkCrosswalk/RequirementCrosswalkMapping, Evidence, RequirementAssessment, IssueOrigin and Action claims match approved artifacts.

No handoff claim materially conflicts with the active rector or approved physical model.

## Layer impact

| layer | candidate impact | current mutation |
|---|---|---:|
| active baseline v1.4 | none; hashes and files unchanged | 0 |
| rector candidate | new v1.5 overlay: catalog 33, Phase 7 section 43, contract 48 | documentation only |
| approved physical model | none in place | 0 |
| physical amendment | 15 new tables, one altered table, exact constraints/lineage | proposal only |
| approved executable contracts | none in place | 0 |
| executable amendment | 15 operations, 14 permissions, 14 audit codes, tests/seeds | proposal only |
| migration/runtime database | incremental plan only | 0 |
| backend/frontend/workers | future Phase 7 consumers; no implementation | 0 |
| plans/capabilities | existing `AUDIT` only | 0 |
| infrastructure/deployment | none | 0 |

## No-duplication proof

- FrameworkVersion, Requirement and RequirementCrosswalkMapping remain Regulatory authority.
- Subject remains scope authority and Tenant remains ownership boundary.
- TenantMembership remains identity/tenant membership authority; team role does not grant IAM permission.
- Control/ControlAssessment remain Controls authority.
- RequirementAssessment retains independent conclusion authority.
- EvidenceVersion remains Evidence authority.
- Issue and Action remain Remediation authority.
- `scope_text` and `lead_membership_id` are removed after reconciled migration instead of retained as compatibility authorities.

## Gate and prohibited actions

```text
TASK_PACKET_STATUS=COMPLETE
CODEX_VARIATION_BUDGET=ZERO
ASSUMPTIONS_INTRODUCED=NONE
FILES_OUTSIDE_SCOPE_MODIFIED=NONE
AUDIT_MODEL_AMENDMENT_REVIEW=PENDING_HUMAN_APPROVAL
DDL_EXECUTED=0
QA_DATABASE_MUTATED=0
FUNCTIONAL_DEVELOPMENT=0
DEPLOYMENT_PERFORMED=0
```

Human review must approve/reject the candidate physical decisions and contracts before any manifest activation, expected-schema update or migration implementation.
