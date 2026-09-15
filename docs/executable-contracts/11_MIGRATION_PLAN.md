# Migration plan contract

| Campo | Valor |
|---|---|
| Contract owner | Data Model Owner |
| Approving human roles | Data Model Owner, Architecture Owner, Security & Privacy Reviewer, QA/Release Owner |
| Status | `CONTRACT_DEFINED` |
| Human authority | Decision Record: Fase 2 continuation authorization, DR-F2-004 |

This plan freezes Phase 3 runner behavior. It creates no SQL, migration, ledger or database object in Phase 2.

## Project-owned runner

The Phase 3 runner is a minimal project-owned Node.js/TypeScript command over versioned SQL. It does not infer schema, generate DDL, auto-sync models or own the physical model. Kysely is not used as migration/schema authority. PostgreSQL 16 remains authoritative.

## Identity and file grammar

- Migration ID: 14-digit UTC timestamp `YYYYMMDDHHMMSS`, strictly increasing in repository order.
- Filename: `YYYYMMDDHHMMSS_<lower_snake_case_slug>.sql`.
- IDs and filenames are immutable after application; duplicate IDs, invalid grammar and ordering regression fail preflight.
- Manifest records ID, filename, SHA-256 of exact reviewed bytes, transactional mode and required pre/postconditions.
- Default is `transactional=true`. A non-transactional migration requires an explicit manifest flag, PostgreSQL reason, reviewed recovery/resume procedure and human promotion approval.

## PostgreSQL ledger and lock

Phase 3 creates the technical ledger `platform.schema_migrations` as part of the approved foundations sequence. Its contract fields are migration ID, filename, content SHA-256, transactional mode, runner version, started/applied UTC timestamps, duration and outcome. Only a successful completed migration is authoritative as applied. Failed attempts may be recorded separately but can never satisfy the applied unique identity.

The runner acquires a transaction/session advisory lock whose deterministic signed 64-bit key is derived from UTF-8 `tcdx-grc:platform.schema_migrations:v1` by SHA-256 first eight bytes in network order. It releases on session end and rejects concurrent runners. This lock is coordination only; the ledger is authority.

Checksum canonicalization is the SHA-256 of repository file bytes with no line-ending or whitespace normalization. An applied ID with different filename or checksum fails closed before executing SQL.

## Bootstrap order

1. Secret-safe target identity: environment, database exactly `tcdx-grc`, PostgreSQL major 16, execution principal, backup/PITR readiness and expected current ledger.
2. Approved schemas and extensions from the frozen physical model.
3. Ledger/runner foundations, then base types/tables in physical dependency order.
4. PK/UQ/CHECK/FK constraints, tenant composite references and prohibited-cascade checks.
5. Required integrity/operational indexes.
6. Immutable global/reference seeds.
7. Plans/capabilities, permission/role, lifecycle and methodology seeds from approved manifests.
8. Regulatory pack headers only; protected content only after its independent gate.
9. Postconditions: schema checksum/invariants, grants, negative tenant probes, ledger state and evidence capture.

Tenant bootstrap is an application command, never a hardcoded migration tenant.

## Failure, rebuild and rollback

Precondition failure performs no mutation. Transactional failure rolls back the whole migration and does not mark applied. Non-transactional work is allowed only under its pre-approved restore/resume contract. Applied migrations are never edited or destructively down-migrated; correction is forward-only.

Rebuild proof is empty PostgreSQL 16 -> every migration in order -> approved seeds -> exact schema/catalog/invariant comparison. Reapply proves no-op, checksum mismatch proves fail-closed, and concurrency proves a single lock holder. Rollback prefers compatible application rollback; otherwise restore/PITR under incident/change control. Destructive changes require backup, impact review, restore rehearsal and explicit promotion approval.

## Promotion and evidence

Identical reviewed bytes/checksums promote isolated development -> QA -> production. Production DDL outside the runner is prohibited. Evidence per environment includes revision, manifest/checksums, target identity, preflight, backup reference, ledger before/after, lock result, duration, postconditions, schema/grant diff, negative tenant checks, failure/retry result and approval/change record. Secrets are never captured.

`MIGRATION_PLAN=PASS` as a Phase 2 contract candidate. Implementation and execution remain blocked for Phase 3/human gates.
