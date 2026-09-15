# Idempotency contract

| Campo | Valor |
|---|---|
| Contract owner | Backend Owner |
| Approving human roles | Architecture Owner, Backend Owner, Data Model Owner, Security & Privacy Reviewer |
| Status | `CONTRACT_DEFINED` |

## Classes

| Class | Meaning |
|---|---|
| `NATURALLY_IDEMPOTENT` | Repetition with the same authorized intent converges without a dedicated key; reads and explicitly defined replace/set commands may qualify. |
| `IDEMPOTENCY_KEY_REQUIRED` | Retriable create/command may produce a durable effect and requires a persisted key/fingerprint/result. |
| `NON_RETRYABLE_WITHOUT_RECONCILIATION` | Repeating could create an ambiguous or externally duplicated effect; client/worker must reconcile current state first. |

Classification is per approved operation; HTTP verb alone never decides it.

## Authoritative key scope

`ownership_class + tenant_id when TENANT_* + actor identity/service principal + client binding when approved + operation_code + Idempotency-Key`.

No global/platform operation fabricates tenant context. The normalized request fingerprint covers semantic payload, target identity, relevant headers and command version; it excludes transport noise and secrets. Canonicalization is frozen by the v1 profile below and must be versioned before any breaking change.

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

## Per-operation assignment

Artifact 03 is authoritative for the assignment. The four GET operations are `NATURALLY_IDEMPOTENT`:

`accessGet, normativeUnitList, requirementList, snapshotGet`.

All 61 published POST operations are `IDEMPOTENCY_KEY_REQUIRED`. This includes upload finalization and async job requests: a durable PostgreSQL command/job record is created before any object-store/provider/worker side effect. No published operation is `NON_RETRYABLE_WITHOUT_RECONCILIATION`; that class is reserved for a future approved operation whose external effect cannot be placed behind a durable keyed command. Such an operation cannot be added silently.

All 93 internal lifecycle command edges published in SEED-007 are also `IDEMPOTENCY_KEY_REQUIRED`, tenant/actor/command/aggregate bound, fingerprinted with current row_version and persisted atomically with audit and any required outbox event.

## Canonical fingerprint profiles

| profile | operations | fingerprint fields in addition to binding/operation/key |
|---|---|---|
| CREATE | create/instantiate/request/start POSTs | canonical JSON body, target parent IDs, command schema version |
| TRANSITION | `:submit/:approve/:review/:reject/:start/:complete/:verify/:publish/:archive/:triage/:fulfill/:finalize/:end/:revoke` | aggregate UUID, expected ETag/row_version, decision/reason and command-specific inputs |
| ASYNC | sync/calculation/rule/report/AI requests | definition/version IDs, scope/period, input/config references and purpose |
| FILE | upload intent/finalize | file UUID when allocated, declared metadata/checksum/size/MIME; signed URL and secret material excluded |

Canonical JSON uses UTF-8, sorted object keys, normalized numbers/strings and omission rules frozen with the request schema. The hash is SHA-256 over `fingerprint_version + operation_id + canonical_request`. `fingerprint_version=v1` is stored/derivable; a breaking canonicalization change creates v2 and cannot reinterpret existing records.

## Replay and conflict

- Successful completion replays the stored HTTP status, result reference and response hash. Sensitive short-lived material such as a signed URL is not persisted as replay body; the operation returns the same durable FileObject and a newly authorized delivery token only through a separately authorized mechanism.
- In-flight same fingerprint returns `202` with the same durable operation/result reference for async work, or `409 TCDX.CONFLICT.RESOURCE` with `retryable=true` when no safe in-progress representation exists; each operation declares which in OpenAPI.
- Same key with changed fingerprint returns `409 TCDX.CONFLICT.IDEMPOTENCY`, `retryable=false`, and no mutation/outbox.
- Retention/expiry remains policy-resolved (`expires_at` nullable); no universal TTL is invented.

`IDEMPOTENCY_CONTRACT=PASS` as a Fase 2 contract candidate.
