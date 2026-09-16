# PRE-F4 Audit model materialization report

## Final gate

```text
RECTOR_GATE=PASS
ACTIVE_MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.5_2026-09-16
TASK=PRE_F4_AUDIT_MODEL_MATERIALIZATION_FINAL_CONTINUATION
AUDIT_MODEL_AMENDMENT_REVIEW=PASS
AUDIT_MODEL_MIGRATION_RUNTIME=PASS
DATABASE_TABLES=229
OPEN_BLOCKERS=0
PHASE_4_AUTHORIZED=YES
PHASE_4_STARTED=0
```

This report records the governed QA materialization of the approved PRE-F4 integrated Audit physical-model amendment. It closes the schema materialization dependency only. It does not start Phase 4 or Phase 7, authorize functional Audit implementation, deploy application code, or change the immutable rector baseline.

## Governing identities

| Authority or artifact | Exact identity |
|---|---|
| Approved amendment candidate | `6a31034ae1ecc1f9ee551431fb2a504a25fb52ce` |
| Active master regent | `TCDX_GRC_MASTER_REGENT_BASELINE_v1.5_2026-09-16` |
| v1.5 activation commit | `e95bfbf9d36d80b09d708fca15a1dc563e532648` |
| Migration implementation commit | `4795a5da6984d1c654d9710da9d67a63540899f5` |
| Migration ID | `20260916001000` |
| Migration file | `database/migrations/20260916001000_pre_f4_integrated_audit_model.sql` |
| Migration SHA-256 | `c4247051c223960eb5ca817a0f85650dbc828a7864e48f66a1a73b1d298a224d` |
| QA PostgreSQL target | PostgreSQL 16.15 / `tcdx-grc` / `db-v4.tcdx.int` (`192.168.2.40`) |

## Preconditions and recovery evidence

```text
QA_DATABASE_TABLES_BEFORE=214
QA_MIGRATION_LEDGER_BEFORE=9
QA_SCHEMA_MISMATCHES_BEFORE=0
EXISTING_AUDITS=0
AUDIT_RECONCILIATION=PASS
QA_BACKUP_CREATED=1
QA_BACKUP_VERIFIED=PASS
QA_BACKUP_BYTES=1943393
QA_BACKUP_SHA256=03dbebd65d197849e0b7283c16d29d5eb38c9bf5fa328b8cf5a18ff7f9a5e59c
QA_BACKUP_PG_RESTORE=PASS
```

The verified backup reference is:

```text
grc-bk:/home/tecdex/backups/tcdx-grc/pre-f4-audit-before-20260916001000-20260916T161050Z.dump
```

The read-only preflight found zero existing `audit.audits` rows. Therefore no reconciliation manifest or data backfill was required. The migration's fail-closed reconciliation precondition passed without deriving scope, framework, subject, team, competency, agenda, or lineage data.

## Local implementation gates carried into QA

The committed migration candidate had already passed the following required local evidence before QA execution. These gates were not repeated during this final continuation:

```text
LOCAL_GATE=PASS
LOCAL_REBUILD=PASS
LOCAL_UPGRADE_214_TO_229=PASS
MIGRATION_REAPPLY=PASS
MIGRATION_CHECKSUM_GUARD=PASS
MIGRATION_CONCURRENCY_GUARD=PASS
UNKNOWN_LEDGER_GUARD=PASS
TENANT_ISOLATION_LOCAL=PASS
RESTORE_RUNTIME_LOCAL=PASS
```

## QA migration and schema result

The canonical runner verified the checksums of migrations `20260916000100` through `20260916000900` and then reported:

```text
20260916001000 applied
```

Final QA evidence:

```text
QA_MIGRATION_EXECUTED=1
QA_MIGRATION_LEDGER=10
QA_DATABASE_TABLES=229
QA_SCHEMA_ACTUAL_PHYSICAL_TABLES=229
QA_SCHEMA_MISMATCHES=0
QA_FORBIDDEN_DELETE_CASCADES=0
LEGACY_SCOPE_TEXT_PRESENT=0
LEGACY_LEAD_MEMBERSHIP_ID_PRESENT=0
AUDIT_NEW_TABLES_PRESENT=15
```

The 15 materialized Audit tables are:

1. `audit.audit_objectives`
2. `audit.audit_criteria`
3. `audit.audit_scopes`
4. `audit.audit_team_assignments`
5. `audit.audit_competencies`
6. `audit.auditor_competency_assertions`
7. `audit.audit_competency_requirements`
8. `audit.audit_competency_validations`
9. `audit.audit_agenda_items`
10. `audit.audit_agenda_item_tests`
11. `audit.audit_agenda_item_scopes`
12. `audit.audit_agenda_item_team_assignments`
13. `audit.audit_test_requirement_links`
14. `audit.audit_test_control_links`
15. `audit.audit_test_requirement_assessment_links`

The legacy `audit.audits.scope_text` and `audit.audits.lead_membership_id` columns are absent. There is no dual scope or lead authority and no compatibility shadow.

## QA tenant-isolation evidence

The staged verifier executed transactionally against QA. Its temporary fixtures were created after `BEGIN` and removed by `ROLLBACK`; no fixture persisted.

```text
QA_TENANT_ISOLATION=PASS
QA_TENANT_ISOLATION_GAPS=0
audit_objective_cross_tenant_parent=PASS
audit_team_cross_tenant_membership=PASS
audit_tenant_ownership=PASS
```

These negative checks confirm that the new Audit objective and team relations reject cross-tenant parents or memberships and that tenant ownership remains enforced. They complement the complete staged tenant-isolation verifier result `dbTenantIsolation=PASS`.

## QA application health

Health checks were executed without restart or deployment from inside the QA network:

```text
QA_BACKEND_LIVE=PASS
QA_BACKEND_READY=PASS
QA_BACKEND_DATABASE_DEPENDENCY=PASS
QA_FRONTEND_HEALTH=PASS
```

Observed backend responses:

```json
{"state":"up"}
{"state":"up","dependencies":{"database":"up"}}
```

The frontend returned the TCDX GRC HTML application shell from `192.168.2.46:8080`.

## Protected-authority integrity

```text
PROTECTED_V1_4_INTEGRITY=PASS
PROTECTED_PHASE_1_DIFF=0
PROTECTED_PHASE_2_DIFF=0
```

The protected v1.4 history, the original approved Phase 1 physical-data-model sources, and the original approved Phase 2 executable-contract sources remain unchanged. The approved v1.5 amendment and its executable/physical amendment directories remain the only authorized overlays.

## Warnings and blockers

The `MODULE_TYPELESS_PACKAGE_JSON` and locale warnings arose only from the temporary staged verification environment. They did not change repository bytes, migration semantics, database results, schema conformance, or tenant-isolation outcomes.

```text
STAGING_WARNINGS_BLOCKING=0
OPEN_BLOCKERS=0
```

## Architectural and operational impact

- Database contract: changed in QA from the approved 214-table state to the approved 229-table state through migration `20260916001000`.
- Executable contracts: no new change during materialization; the approved v1.5 amendment was consumed as authority.
- Backend contract/code: unchanged; health and database readiness passed.
- Frontend contract/code: unchanged; health passed.
- Infrastructure topology: unchanged.
- Deployment: not performed.
- Functional Audit implementation: not started and remains phase-gated.

## Final execution status

```text
AUDIT_MODEL_AMENDMENT_REVIEW=PASS
RECTOR_BASELINE_V1_5=ACTIVE
AUDIT_MODEL_MIGRATION_RUNTIME=PASS
DATABASE_TABLES=229
PHASE_3=COMPLETE
FOUNDATIONS_RUNTIME=PASS
PHASE_4=AUTHORIZED
FUNCTIONAL_PRODUCT_SLICES=BLOCKED_PENDING_PHASE_4_SCOPE
PHASE_4_STARTED=0
PUSH_PERFORMED=0
PR_CREATED=0
MERGE_PERFORMED=0
DEPLOYMENT_PERFORMED=0
```
