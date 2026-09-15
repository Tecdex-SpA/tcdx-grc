# Outbox and worker contract

| Campo | Valor |
|---|---|
| Contract owner | Backend Owner |
| Approving human roles | Architecture Owner, Backend Owner, Data Model Owner, QA/Release Owner |
| Status | `BLOCKED_BY_EVENT_CATALOG` |

## Production

A committed domain mutation and its required `ops_audit.outbox_events` row are in the same PostgreSQL transaction. Outbox payload follows the approved event schema/classification and contains no secret/blob. No direct broker/provider call substitutes the transaction.

## Delivery

- at-least-once delivery;
- bounded exponential retry/jitter policy must be approved per event/provider; no universal numbers are inferred;
- claim/lease state is PostgreSQL-authoritative; Redis may coordinate/cache only;
- duplicate delivery is normal and consumers are idempotent;
- terminal/exhausted failure enters explicit failed/DLQ state with redacted code and operator visibility;
- restart resumes from PostgreSQL state/checkpoint.

## Consumers

Consumers validate event type/version, authorization/service-principal scope and ownership. Unknown versions fail safely and become observable; they are not ignored as success. A consumer writes only its own bounded-context aggregate and emits its own outbox event if needed. Generation/causation prevents loops.

## Ordering

No global order. When an approved event requires aggregate order, consumer checks version/sequence and holds/retries gaps. Out-of-order delivery never overwrites newer published/current state.

## Observability

Metrics include pending/retry/failed depth, oldest available age, attempts, processing latency, duplicate count and terminal failures by safe event category. Logs propagate correlation/causation and pseudonymized tenant context.

## Blocker

Exact event schemas, retry policies, consumers and ordering declarations depend on artifact 04. No worker implementation is authorized until those rows are approved.
