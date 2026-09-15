# Observability contract

| Campo | Valor |
|---|---|
| Contract owner | Architecture Owner / QA/Release Owner |
| Approving human roles | Architecture Owner, Security & Privacy Reviewer, QA/Release Owner |
| Status | `CONTRACT_DEFINED_PENDING_HUMAN_APPROVAL` |

## Stack and propagation

OpenTelemetry instruments API, commands, DB, outbox/workers, object storage, connector/provider and `ia2.tcdx.int` calls. Prometheus receives metrics; Grafana visualizes; Loki stores structured logs. `correlation_id` propagates end-to-end; `request_id`, `event_id` and `causation_id` distinguish attempts/causes.

## Structured logs

Minimum safe fields: timestamp UTC, severity, service/component, environment, operation/command code, outcome, duration, correlation/request/event identifiers, pseudonymized tenant reference when TENANT_*, actor type, error code and trace/span IDs. No secrets, credentials, raw tokens, signed URLs, binary content, protected normative text or unnecessary PII. Authorization denial does not log foreign object details.

## Metrics

- API latency/error/rate by safe route template/outcome;
- PostgreSQL saturation, transaction/lock/deadlock and pool state;
- outbox/job/DLQ depth, age, attempts and latency;
- connector health, rate limits, sync/calculation lag and checkpoint age;
- object scan/quarantine/failure;
- result-status counts without treating insufficiency as technical success/failure;
- AI availability/latency/failure separately from deterministic calculation;
- backup/PITR/restore evidence and SLO indicators.

Labels must be bounded; never raw tenant UUID, user ID, object ID, external ID or error text as high-cardinality metric labels.

## Tracing and health

Critical flows produce distributed traces with authorization and payload values redacted. Health reports dependency state without credentials or topology detail to unauthorized callers. `system_health_events` are operational history, not entitlement bypass or business truth.

## SLO/DR evidence

Production target is 99.9% monthly excluding announced maintenance; RPO 15m, RTO 4h; simple read p95 <500ms and simple mutation p95 <1s in representative QA; dashboard initial <2.5s with precomputed results. Exact alert thresholds/runbooks require human operational approval and may not redefine these targets.
