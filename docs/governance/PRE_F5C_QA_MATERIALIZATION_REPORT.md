# TCDX GRC — PRE-F5C QA materialization report

## Authority

`MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.5_2026-09-16`
`PRE_F5C_MIGRATION_ID=20260921000100`
`QA_TARGET=192.168.2.40/tcdx-grc`
`POST_PR14_MAIN=49991c453205a41396e76948c6dfa8e4d4627502`

This report records the governed QA materialization of PRE-F5C after PR #14. It closes the PRE-F5C physical runtime gate only. It does not start Phase 5 or Phase 6 and does not authorize deployment or market release.

## Pre-migration evidence

```text
QA_MIGRATION_LEDGER_BEFORE=10
QA_DATABASE_TABLES_BEFORE=229
PRE_F5C_MIGRATION_PRESENT_BEFORE=0
PRE_F5C_ROW_VERSION_COLUMNS_PRESENT_BEFORE=0
```

## Backup evidence

```text
QA_BACKUP_CREATED=1
QA_BACKUP_VERIFIED=PASS
QA_BACKUP_FILE=/home/tecdex/backups/tcdx-grc/pre-f5c/pre-f5c-before-20260921000100-20260921T191852Z.dump
QA_BACKUP_BYTES=2109246
QA_BACKUP_SHA256=7adc72f780cc92204b27679b450b83b2f8e9fa09d22064c329497f209a24a555
```

The PostgreSQL custom-format backup catalog was validated successfully with `pg_restore -l` before migration execution.

## Migration evidence

The canonical migration runner verified all previous checksums and applied:

```text
20260921000100 applied
```

Final migration state:

```text
QA_MIGRATION_LEDGER_AFTER=11
PRE_F5C_MIGRATION_PRESENT=1
QA_MIGRATION_EXECUTED=1
```

## Physical schema verification

```text
QA_DATABASE_TABLES=229
EXPECTED_PHYSICAL_TABLES=229
ACTUAL_PHYSICAL_TABLES=229
EXPECTED_COLUMNS=3387
EXPECTED_CONSTRAINTS=2397
EXPECTED_REQUIRED_INDEXES=1502
SCHEMA_MISMATCHES=0
FORBIDDEN_DELETE_CASCADES=0
PRE_F5C_ROW_VERSION_COLUMNS_PRESENT=6
```

## Seed verification

```text
PLANS=3
CAPABILITIES=20
ENTITLEMENTS=36
ROLES=24
PERMISSIONS=136
LIFECYCLE_DEFINITION_ROWS=134
LIFECYCLE_EDGES=100
REGULATORY_PACK_HEADERS=5
SEED_MISMATCHES=0
```

## Tenant isolation

```text
DB_TENANT_ISOLATION=PASS
TENANT_ISOLATION_GAPS=0
```

All executed cross-tenant negative probes passed.

## Application health

Backend:

```text
QA_BACKEND_LIVE=PASS
GET http://192.168.2.45:4000/health/live
{"state":"up"}

QA_BACKEND_READY=PASS
GET http://192.168.2.45:4000/health/ready
{"state":"up","dependencies":{"database":"up"}}
```

Frontend:

```text
QA_FRONTEND_HEALTH=PASS
HEAD http://192.168.2.46:8080
HTTP/1.1 200 OK
```

No application deployment was required or performed as part of PRE-F5C materialization.

## Final gate

```text
RECTOR_GATE=PASS
PRE_F5C_LOCAL_GATE=PASS
PHASE_5_EXECUTABILITY_PREFLIGHT=PASS
PRE_F5C_PHYSICAL_RUNTIME=PASS
QA_MIGRATION_EXECUTED=1
QA_MIGRATION_LEDGER=11
DATABASE_TABLES=229
SCHEMA_MISMATCHES=0
SEED_MISMATCHES=0
TENANT_ISOLATION_GAPS=0
QA_BACKEND_READY=PASS
QA_FRONTEND_HEALTH=PASS
CORE_GRC_SLICE=READY_FOR_IMPLEMENTATION
PHASE_5_STARTED=0
PHASE_6_STARTED=0
DEPLOYMENT_PERFORMED=0
```

PRE-F5C is materially present and validated in QA. Phase 5 may now proceed through its separately authorized implementation gate. Phase 6 remains not started.
