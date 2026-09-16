# Integrated Audit seed and test amendment

## Seed manifest

No executable seed is created. Candidate `SEED-AUD-001` publishes versioned PLATFORM_CONTROL AuditCompetency definitions only after human approval.

| field | contract |
|---|---|
| owner | Architecture Owner + Auditor Lead domain owner |
| source | approved v1.5 contract and authorized competency methodology source |
| stable key | `audit_competency:<competency_code>:<version>` |
| version | positive integer; published version immutable |
| idempotency | stable key + canonical checksum; mismatch fails closed |
| update policy | new version only |
| deprecation | explicit supersession/effective_to; history retained |
| environment | all environments through identical manifest bytes |
| dependencies | candidate v1.5 approval and physical amendment migration |

No competency rows are invented by this amendment. Exact competency content is a Regulatory/Audit domain-owner publication gate.

## Test contracts

| test_contract_id | requirement / action | expected invariant | evidence / gate |
|---|---|---|---|
| TC-AUD-MODEL-001 | migrate isolated 214-table schema | exactly 229 tables; 15 named additions; expected constraints/indexes; no unrelated diff | schema manifest/diff; amendment review |
| TC-AUD-MODEL-002 | rebuild empty PostgreSQL 16 | baseline migrations + approved incremental migration converge to identical 229-table schema | rebuild checksums; foundations amendment runtime |
| TC-AUD-TENANT-001 | use tenant A Audit with tenant B Subject/membership/test/assessment/control | DB and API deny without existence leak | negative API/SQL evidence; security |
| TC-AUD-CRITERIA-001 | select 0, 1, 3 and 4 FrameworkVersion | approval denies 0; accepts 1..3; rejects 4 | contract/integration evidence |
| TC-AUD-XWALK-001 | link cross-framework Requirements with absent/draft/no_match/unsupported/approved mappings | only approved/effective equivalent/partially_equivalent/overlaps/supports succeeds | DB/API/audit evidence |
| TC-AUD-XWALK-002 | same HLS/clause number without approved mapping | grouping denied | negative contract test |
| TC-AUD-ASSESS-001 | one shared test/evidence with multiple Requirements | each RequirementAssessment retains separate status/conclusion/lineage | lineage query + API result |
| TC-AUD-CONTROL-001 | link global reference Control versus tenant Control/ControlAssessment | global reference direct target denied; tenant target accepted | negative/positive evidence |
| TC-AUD-TEAM-001 | assign zero/two active leads or foreign membership | approval/constraint denies; exactly one same-tenant lead accepted | constraint/API/audit evidence |
| TC-AUD-COMP-001 | approve with missing/expired/unverified competency | approval denied; covered effective assertion succeeds | validation/audit evidence |
| TC-AUD-COMP-002 | technical expert attempts auditor/lead operation without RBAC | default DENY | authorization matrix evidence |
| TC-AUD-AGENDA-001 | link agenda to test/scope/assignment from another Audit or outside interval | denied; same-Audit time-compatible links accepted | constraint/TX tests |
| TC-AUD-MIG-001 | existing Audit rows with no reconciliation manifest | migration preflight fails before mutation | preflight/no-ledger-change evidence |
| TC-AUD-MIG-002 | reconciled existing Audit | lead/scope backfill exact, old columns removed, no authority duplication | before/after reconciliation |
| TC-AUD-IDEM-001 | replay every new POST concurrently/sequentially | one mutation/audit row; deterministic replay; fingerprint conflict 409 | API/DB counts |
| TC-AUD-RESTORE-001 | backup/restore upgraded representative schema | RPO/RTO contract and object/schema reconciliation pass | restore report |

Mocks cannot close database, tenant-isolation, migration, restore or runtime gates.
