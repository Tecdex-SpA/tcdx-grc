# Transaction and concurrency contract

| Campo | Valor |
|---|---|
| Contract owner | Backend Owner |
| Approving human roles | Architecture Owner, Data Model Owner, Backend Owner |
| Status | `CONTRACT_DEFINED` |

## Boundaries

- One application command owns one ACID transaction for its aggregate and authoritative records.
- Required AuditEvent, OutboxEvent and IdempotencyRecord outcome are written consistently with the mutation.
- Domain modules do not directly mutate another bounded context. Cross-context effects use outbox events and idempotent commands/consumers.
- No distributed pseudo-transaction with object storage, provider API, Redis or `ia2.tcdx.int`.

## Concurrency mechanisms

- Mutable profiles use positive monotonic `row_version`; API exposes strong ETag and requires `If-Match` for critical updates.
- Stale version produces concurrency conflict and no mutation/event.
- Published versions, observations, snapshots, audit, source resolutions and other append-only records are never updated to resolve a conflict.
- Idempotency uniqueness is ownership/tenant/actor/operation/key; same key/different hash fails.
- Worker claims, schedules, outbox delivery and job retries require a database locking/claim strategy selected in implementation without changing business semantics. Exact SQL is Fase 3.
- Multi-row invariants identified as TX in physical model 03 are checked under a transaction/lock level sufficient to prevent write skew; the Fase 3 implementation must document the lock set and isolation proof per invariant.

## Critical TX invariants

Publication coverage/approvals; hierarchy acyclicity; compatible ownership; current/published uniqueness; selected source subset; lifecycle edge/preconditions; SoD; effective configuration/retention/policy specificity; control origin; typed-target same-tenant rules; active subscription/binding uniqueness.

## Deadlocks and retry

Use deterministic lock ordering per aggregate contract. Database serialization/deadlock failures may be retried only by an idempotent command with bounded policy; retry does not create a new logical event/correlation root. Unbounded retry is prohibited.

## Object storage sequence

Upload uses pre-authorized quarantine. Object-store success alone does not commit Evidence. Finalization verifies metadata/checksum/scan and commits PostgreSQL authority; orphan quarantine cleanup is an observable idempotent job, never evidence creation.

`TRANSACTION_CONCURRENCY_CONTRACT=PASS` as a Phase 2 contract candidate.
