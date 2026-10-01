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

## Phase 5 RetentionPolicy forward-only amendment

Migration `20260924000200_phase5_retention_policy_lifecycle.sql` follows the fifteen applied QA migrations. It preserves all 231 physical tables and changes only the existing `privacy.retention_policies`: `effective_from` and `effective_to` become nullable and `row_version bigint NOT NULL DEFAULT 1` is added. Closed CHECK constraints materialize the approved policy kind, numeric precedence, `expiry_or_closure`, lifecycle states and publication/effective timestamp coherence. The same transaction publishes the three approved lifecycle registry edges; it adds no permission, role, entity, table or disposition column. Operational rollback is the verified pre-apply backup/restore procedure, never a destructive down migration.

## Phase 5 canonical membership invitation amendment

Applied migration `20260924000300_phase5_membership_invitation.sql` is immutable at SHA-256 `0942e5eb360f7157a444d7b04fbe7558312e8d782347e60a745a8d4365034806`. It created only `iam.tenant_membership_invitations`, published the two authorized permission rows and produced 232 domain tables/17 ledger rows, but its already-applied grant materialization targeted `TENANT_ADMIN`, contrary to the later controlling Platform-authority clarification in the approved decision.

Migration `20260925000100_phase5_membership_invitation_platform_authority_reconciliation.sql` is the minimal forward-only successor. It requires the exact applied predecessor checksum, preserves 232 tables and the two Permission rows, removes every superseded invitation grant, and creates exactly two PLATFORM_CONTROL grants on the single published baseline `PLATFORM_ADMIN` with zero other grants. It also tightens terminal-field coherence and adds the two missing canonical service-actor FKs/indexes. It creates no entity, permission, role, capability, entitlement, credential or business fixture. Postcondition is 232 domain tables and 18 applied migrations. No applied migration bytes change.

## Phase 5 administrative read catalog release

Human decision 2026-09-28 authorizes the forward-only data-only migration `20260928000100_phase5_administrative_read_permissions.sql` after the exact applied `20260925000100` checksum. It preserves 232 domain tables, immutable predecessor bytes and every invitation lifecycle row. It publishes only `platform.tenant.read`, `platform.membership.read`, `platform.membership_invitation.read` and `platform.role.read`, with exact baseline Platform/Tenant Admin grants and zero direct UserIdentity grants. The runner applies it only after isolated PostgreSQL 16 rebuild, checksum/replay/concurrency/unknown-ledger gates, QA backup/read-only preflight and correct owner authority. QA is not considered applied merely because this migration is in the source manifest.
