# Migration plan contract

| Campo | Valor |
|---|---|
| Contract owner | Data Model Owner |
| Approving human roles | Data Model Owner, Architecture Owner, Security & Privacy Reviewer, QA/Release Owner |
| Status | `BLOCKED` |

This plan specifies Fase 3 behavior but creates and executes no migration.

## Immutable principles

- PostgreSQL 16; one definitive model; no provisional, legacy, compatibility or plan/provider/tenant schemas.
- Versioned SQL migrations are ordered, immutable after application and transaction-wrapped whenever PostgreSQL permits.
- Ledger stores migration identity, content SHA-256, applied timestamp, duration, tool/runner version and outcome. Applied checksum mismatch fails closed.
- One advisory lock/serialization mechanism prevents concurrent migrators; exact lock key is part of the runner decision.
- No ad-hoc production DDL. Every change travels through reviewed migration + pre/postconditions + promotion evidence.

## Required sequence

1. Secret-safe identity/precondition check: environment, database `tcdx-grc`, PostgreSQL major 16, role/capability, backup/PITR readiness.
2. Required schemas and approved extensions only.
3. Base tables/types/registries in dependency order.
4. PK/UQ/CHECK/FK constraints, with tenant composite FKs and prohibited-cascade scan.
5. Integrity and required operational indexes.
6. Immutable global/reference seed manifests.
7. Plans/capabilities, permission/role, lifecycle and methodology seeds only after their catalogs are approved.
8. Tenant bootstrap remains an application command, not a hardcoded migration tenant.
9. Postconditions: catalog checksum/invariant probes, negative grants/tenant checks, ledger state and backup evidence.

## Naming/versioning blocker

Migration filename/identity, runner implementation and exact ledger schema are not uniquely selected by the baseline. Compatible alternatives include monotonically ordered numeric IDs, UTC timestamp IDs or another collision-safe ordered scheme. Human approval must freeze:

- filename grammar and identifier length;
- transaction opt-out syntax for PostgreSQL operations that cannot run transactionally;
- advisory lock identity;
- ledger object/name and checksum canonicalization;
- runner/package/version and execution command.

Codex does not select one.

## Failure and rollback

- Precondition failure: no mutation and explicit non-zero result.
- Transactional failure: rollback entire migration; ledger must not claim applied.
- Non-transactional step: only if PostgreSQL requires it and a reviewed resume/restore contract exists before promotion.
- Applied migrations are never edited or down-migrated destructively. Correction is a new forward migration.
- Rollback of release prefers application rollback only when schema compatibility was explicitly approved; otherwise restore/PITR under incident/change control.
- Destructive/schema-contract changes require backup, impact analysis, explicit human gate and tested restore. No generic `down` promises data reversibility.

## Rebuild and promotion

Rebuild means empty PostgreSQL 16 → all migrations → global seeds → exact catalog/invariant comparison. Promotion is dev/isolated → QA → production using identical reviewed bytes/checksums. QA proves rebuild, upgrade, reapply, checksum rejection, failure recovery, tenant isolation and restore. Production apply requires separate operational authorization and backup evidence.

## Evidence

Per environment: revision, migration manifest/checksums, preflight, identity, backup ref, ledger before/after, duration, postconditions, schema diff, grant scan, failure/retry result and approver/change record. Secret values are never captured.

`MIGRATION_PLAN=BLOCKED` until IDM-013 and the naming/ledger decisions above are human-approved.
