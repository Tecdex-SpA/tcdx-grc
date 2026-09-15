# Idempotency contract

| Campo | Valor |
|---|---|
| Contract owner | Backend Owner |
| Approving human roles | Architecture Owner, Backend Owner, Data Model Owner, Security & Privacy Reviewer |
| Status | `BLOCKED_BY_OPERATION_CATALOG` |

## Classes

| Class | Meaning |
|---|---|
| `NATURALLY_IDEMPOTENT` | Repetition with the same authorized intent converges without a dedicated key; reads and explicitly defined replace/set commands may qualify. |
| `IDEMPOTENCY_KEY_REQUIRED` | Retriable create/command may produce a durable effect and requires a persisted key/fingerprint/result. |
| `NON_RETRYABLE_WITHOUT_RECONCILIATION` | Repeating could create an ambiguous or externally duplicated effect; client/worker must reconcile current state first. |

Classification is per approved operation; HTTP verb alone never decides it.

## Authoritative key scope

`ownership_class + tenant_id when TENANT_* + actor identity/service principal + client binding when approved + operation_code + Idempotency-Key`.

No global/platform operation fabricates tenant context. The normalized request fingerprint covers semantic payload, target identity, relevant headers and command version; it excludes transport noise and secrets. Canonicalization algorithm is a human implementation decision and must be versioned before use.

## Persistence and concurrency

- PostgreSQL `ops_audit.idempotency_records` is authoritative; Redis may cache but never decide.
- Claim/check and domain mutation occur under a transaction/locking strategy that admits only one logical winner.
- Same binding/key/fingerprint while in progress yields the operation-specific in-progress replay/response contract; exact behavior must be frozen per operation.
- Same binding/key/different fingerprint returns idempotency conflict and performs no mutation.
- Completed same fingerprint returns the stored status/result reference and response hash, with `Idempotency-Replayed: true`.
- Failed attempts are replayable or retryable only according to the published operation/error contract; a technical failure never becomes success.

## Outbox interaction

The first successful logical command stores mutation, AuditEvent, OutboxEvent and idempotency result consistently with the transaction contract. Replays never create a second domain event. Consumers deduplicate by event ID/business key independently.

## Retention

`expires_at` is nullable because no universal expiry is rector-authorized. Retention must be at least the operation retry/reconciliation window and comply with effective policy. Each operation must cite its policy before assigning a duration.

## Blocking dependency

No concrete operation exists in artifact 03, so no per-operation class, fingerprint fields, replay response or retention can be frozen. The cross-cutting invariant is complete, but `IDEMPOTENCY_CONTRACT=BLOCKED` until the operation catalog is approved.
