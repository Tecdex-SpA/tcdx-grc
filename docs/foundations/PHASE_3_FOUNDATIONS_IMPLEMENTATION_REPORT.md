# Phase 3 foundations implementation report

## Authority and candidate state

- Master regent: `TCDX_GRC_MASTER_REGENT_BASELINE_v1.4_2026-09-15`.
- Branch: `implementation/phase-3-foundations`.
- Continuity base: `0e1fd41` (`architecture: close phase 2 executable contracts`).
- Implementation checkpoint: `a1f1174` (`chore: checkpoint phase 3 foundations continuation`).
- Physical model authority: `a822bb92d0d585edd84adc8a1c65ec280923cc8e`.
- Executable-contract authority: `16deeafc0237f219d08d44f5d5a27c62ae4cc909` plus recorded H-001..H-006 human approval.
- Candidate status: `FOUNDATIONS_IMPLEMENTATION=COMPLETE`; `FOUNDATIONS_RUNTIME=CANDIDATE_READY_FOR_HUMAN_REVIEW`.
- Codex has not self-approved the human runtime gate.

## Consolidated evidence

| Gate | Evidence | Result |
|---|---|---|
| Exact toolchain | Node `22.23.2`; pnpm `12.4.1`; exact dependency pins and `pnpm-lock.yaml` | PASS |
| Typecheck | `pnpm typecheck` under Node `22.23.2` | PASS |
| Build | `pnpm build` under Node `22.23.2` | PASS |
| Tests | Vitest `5.0.1`: 7 files, 18 tests | PASS |
| Generated assets | `generate-contract-assets.mjs --check`; 214 physical tables, 134 permissions, 95 lifecycle edges, 9 migrations | PASS |
| Clean rebuild | Empty local PostgreSQL 16 database through migrations, seeds and postconditions | PASS |
| Schema | 214/214 tables; 3,192 columns expected; 2,199 derived constraints expected; 1,401 required indexes; 0 mismatches; 0 DELETE CASCADE | PASS |
| Migrations | 9/9 applied; reapply no-op with exact checksums | PASS |
| Seeds | canonical counts match; reapply stable; seed checksum exact | PASS |
| Migration guards | checksum, advisory-lock concurrency, unknown-ledger and source-byte integrity | PASS |
| Tenant isolation | 10 negative/positive DB and service cases; 0 gaps | PASS |
| Foundation records | tenant-context concealment; audit/outbox/idempotency atomicity; replay; hash conflict; rollback | PASS |
| Outbox worker | `SKIP LOCKED`; persisted tenant context; expired-lease resume; version rejection; delivered/retry/failed outcomes | PASS |
| Restore | local dump/restore to temporary PostgreSQL 16 database; schema 0 mismatches; seeds 0 mismatches; 9 ledger rows; temporary database removed | PASS |
| UUIDv7 | `uuid@14.0.2`; 100,000 samples; 100,000 unique; 0 invalid; 0 lexical regressions | PASS |
| Secret scan | literal/env credential detection self-test; repository findings 0 | PASS |
| Rector integrity | `verify-rector-governance.sh`: baseline files OK and `RECTOR_GATE=PASS` | PASS |
| Protected authorities | rector baseline, physical model and executable-contract diffs from `0e1fd41`: 0 | PASS |

The governance script still prints historical `MIGRATIONS=BLOCKED` and `FUNCTIONAL_DEVELOPMENT=BLOCKED`. For migrations, the current mutable authority is `docs/governance/MASTER_EXECUTION_STATUS.md`, which records `MIGRATIONS=AUTHORIZED_WITHIN_PHASE_3_CONTRACT`; this known stale line was not used to reopen an approved decision. Functional product slices remain correctly blocked until the human foundations runtime gate passes.

## Foundation traceability

| Contract | Implementation | Evidence |
|---|---|---|
| Migration plan / PostgreSQL authority | `database/migrations/*`, manifest, project runner, schema verifier | rebuild, reapply, checksum/concurrency/unknown-ledger gates |
| Transaction, audit, outbox and idempotency | `transaction.ts`, `foundation-records.ts`, `outbox-worker.ts` | atomic commit/rollback, identical replay, fingerprint conflict, lease recovery, `SKIP LOCKED` |
| Authentication, authorization and tenant context | fail-closed identity verifier, effective authorization chain, membership resolution, ownership compatibility | unit tests plus isolated PostgreSQL tenant-context and tenant-isolation probes |
| Configuration | deterministic precedence resolver with explicit insufficiency/conflict and lineage | unit tests |
| File/evidence storage | authorization-carrying quarantine/finalize/download port; opaque key allocation belongs to adapter; unavailable adapter fails closed | strict typecheck and fail-closed boundary tests |
| AI | backend-only `https://ia2.tcdx.int` port; explicit authorized context and `A2_PROPOSE` ceiling; unavailable adapter fails closed | strict typecheck and boundary tests |
| Observability | safe structured-log fields and bounded metric-label contract | strict typecheck |
| Frontend | React/Vite shell, explicit tenant/auth boundary, bearer API client and problem envelope | typecheck/build |
| Health/readiness | liveness and PostgreSQL readiness fail closed with correlation ID | Fastify tests |

## Deliberately deferred runtime configuration

The following remain later security/operational gates and are not foundation blockers: concrete OIDC issuer/audience/JWKS/algorithm profile; object-storage provider credentials and signed-URL TTL; OpenTelemetry exporter and alert-routing configuration; concrete provider/model, timeout and retry policy behind `ia2.tcdx.int`; QA/production secrets and deployment configuration. Their absence is represented by explicit interfaces and fail-closed adapters, not fallback business semantics.

## Files in the Phase 3 candidate

The final evidence commit adds this report. The implementation candidate contains the following other paths:

```text
.env.example
.gitignore
apps/backend/package.json
apps/backend/src/app.test.ts
apps/backend/src/app.ts
apps/backend/src/config.test.ts
apps/backend/src/config.ts
apps/backend/src/configuration/resolver.test.ts
apps/backend/src/configuration/resolver.ts
apps/backend/src/database.ts
apps/backend/src/errors.ts
apps/backend/src/index.ts
apps/backend/src/persistence/foundation-records.ts
apps/backend/src/persistence/outbox-worker.test.ts
apps/backend/src/persistence/outbox-worker.ts
apps/backend/src/ports/ai-service.ts
apps/backend/src/ports/boundaries.test.ts
apps/backend/src/ports/file-storage.ts
apps/backend/src/ports/observability.ts
apps/backend/src/security/authentication.test.ts
apps/backend/src/security/authentication.ts
apps/backend/src/security/authorization.test.ts
apps/backend/src/security/authorization.ts
apps/backend/src/security/ownership.ts
apps/backend/src/security/tenant-context.ts
apps/backend/src/transaction.ts
apps/backend/src/uuid.ts
apps/backend/tsconfig.json
apps/frontend/index.html
apps/frontend/package.json
apps/frontend/src/api-client.ts
apps/frontend/src/auth-boundary.ts
apps/frontend/src/config.ts
apps/frontend/src/main.tsx
apps/frontend/src/styles.css
apps/frontend/tsconfig.json
apps/frontend/vite.config.ts
database/expected-schema.json
database/migrations/20260916000100_bootstrap_schemas_and_ledger.sql
database/migrations/20260916000200_platform_iam_organization.sql
database/migrations/20260916000300_normative_control_evidence.sql
database/migrations/20260916000400_risk_operations_privacy.sql
database/migrations/20260916000500_data_integration_reporting_ai.sql
database/migrations/20260916000600_constraints_and_uniqueness.sql
database/migrations/20260916000700_foreign_keys.sql
database/migrations/20260916000800_required_indexes.sql
database/migrations/20260916000900_canonical_seeds.sql
database/migrations/manifest.json
database/seed-manifest.json
package.json
packages/contracts/package.json
packages/contracts/src/index.ts
packages/contracts/tsconfig.json
packages/shared-types/package.json
packages/shared-types/src/index.ts
packages/shared-types/tsconfig.json
pnpm-lock.yaml
pnpm-workspace.yaml
scripts/foundations/db.ts
scripts/foundations/generate-contract-assets.mjs
scripts/foundations/migrate.ts
scripts/foundations/rebuild-test.ts
scripts/foundations/secret-scan.mjs
scripts/foundations/verify-foundation-records.ts
scripts/foundations/verify-migration-gates.ts
scripts/foundations/verify-outbox-worker.ts
scripts/foundations/verify-restore.ts
scripts/foundations/verify-schema.ts
scripts/foundations/verify-seed-reapply.ts
scripts/foundations/verify-seeds.ts
scripts/foundations/verify-tenant-isolation.ts
scripts/foundations/verify-uuidv7.ts
tsconfig.base.json
vitest.config.ts
```

## Non-actions

`QA_DATABASE_MUTATED=0`

`DEPLOYMENT_PERFORMED=0`

`PUSH_PERFORMED=0`

`PR_CREATED=0`

`MERGE_PERFORMED=0`
