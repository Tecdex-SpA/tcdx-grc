# PRE-F4 Audit model incremental migration plan

| Campo | Valor |
|---|---|
| Base schema | approved/materialized Phase 3 schema, 214 tables |
| Approved target | 229 tables; 15 additions; 1 altered table |
| Contract owner | Data Model Owner |
| Human approvers | Data Model Owner, Architecture Owner, Security & Privacy Reviewer, QA/Release Owner |
| Status | `APPROVED_FOR_EXECUTION` |

The approved implementation is the single transactional migration `20260916001000_pre_f4_integrated_audit_model.sql`. Runtime evidence is recorded separately and this plan does not authorize functional Audit implementation.

## Migration identity

The next valid 14-digit migration ID allocated under the approved grammar is:

`20260916001000_pre_f4_integrated_audit_model.sql`

It is one project-owned, checksum-pinned, transactional migration unless PostgreSQL proves an operation cannot be transactional. No such exception is currently proposed.

## Hard preconditions

1. Active approved rector version includes candidate documents 33, 43 and 48.
2. Physical/executable amendments have recorded human approval.
3. Target identity is PostgreSQL 16 / database `tcdx-grc`; current ledger exactly contains the nine approved foundation migrations and no unknown entry.
4. Current schema conforms exactly to `database/expected-schema.json` with `tableCount=214`.
5. Backup/PITR readiness and restore evidence meet RPO/RTO contracts.
6. Runner owns the established advisory lock and checksum preflight passes.
7. Read-only data preflight counts existing `audit.audits` rows.

If Audit row count is nonzero, a versioned, human-approved reconciliation manifest is mandatory for every Audit. It must provide typed objectives, FrameworkVersion criteria, FrameworkVersion+Subject scopes, team assignments including exactly one lead, competency requirements/validation state, agenda and AuditTest lineage where applicable. It references existing canonical IDs and has its own checksum.

The migration never parses `scope_text`, derives FrameworkVersion from title/text, infers HLS equivalence, invents a Subject or treats `lead_membership_id` as an IAM grant. Missing/invalid reconciliation aborts before mutation.

## Transactional sequence

1. Recheck ledger, schema count/checksum, row counts and reconciliation checksum under advisory lock.
2. Create the 15 candidate tables in FK dependency order:
   - competency registry;
   - objectives/criteria/scopes/team/competency requirements/assertions/validations;
   - agenda items and agenda support;
   - AuditTest requirement/control/assessment lineage.
3. Add PK, tenant+PK unique, typed/composite FKs, CHECKs, partial uniques and required integrity indexes.
4. When existing Audit rows exist, load only the approved reconciliation rows and validate every tenant/reference/interval/crosswalk invariant.
5. Create lead assignment from approved reconciliation and verify exact equality with former `lead_membership_id`.
6. Create typed scopes from approved reconciliation and verify coverage; never retain text as authoritative fallback.
7. Verify every approved/non-draft Audit satisfies the candidate approval preconditions and every AuditTest lineage mapping is valid.
8. Drop `audit.audits.scope_text` and `audit.audits.lead_membership_id` within the same transaction.
9. Run postconditions and record the migration only on complete success.

There is no committed intermediate state with dual scope/lead authority.

## Postconditions

- table count exactly 229 and exact expected table names;
- old columns absent;
- one active lead per Audit;
- 1..3 FrameworkVersion criteria for every Audit eligible for approval;
- no cross-tenant FK path;
- no cross-framework AuditTest Requirement link without an approved/effective allowed crosswalk;
- every RequirementAssessment link matches the test Requirement;
- global/reference Control cannot be direct tenant control target;
- no JSONB semantic columns in the 15 tables;
- no cascade delete across Audit history/lineage;
- schema manifest, migration checksum, ledger and permissions are identical across environments.

## Failure, rollback and recovery

- Any precondition or in-transaction failure performs a full rollback and leaves ledger/schema/data unchanged.
- Applied migration bytes are immutable; corrections are forward-only.
- Post-commit rollback is restore/PITR or an explicitly reviewed forward correction. No generic destructive down migration is promised.
- Rebuild proof: empty PostgreSQL 16 -> nine approved foundation migrations -> approved Audit amendment -> exact 229-table expected schema and seeds.
- Upgrade proof: representative 214-table backup with zero Audit rows and with reconciled representative Audit rows.
- Restore proof reconciles PostgreSQL metadata, Evidence/FileObject references and schema checksum.

## Promotion evidence

Isolated development -> QA -> production uses identical bytes/checksum. Required evidence: target identity, backup reference, preflight counts, reconciliation checksum or explicit zero-row result, ledger before/after, schema diff, constraint/index inventory, negative tenant tests, crosswalk tests, rebuild, reapply, failure rollback and restore timing.

```text
MIGRATION_CREATED=1
MIGRATION_ID=20260916001000
QA_DATABASE_MUTATED=0
MIGRATION_PLAN_STATUS=APPROVED_FOR_EXECUTION
```
