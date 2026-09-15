# Unified API and worker error model

| Campo | Valor |
|---|---|
| Contract owner | Backend Owner |
| Approving human roles | Architecture Owner, Backend Owner, Security & Privacy Reviewer |
| Status | `PROPOSED_FOR_HUMAN_APPROVAL` |

## Envelope

API errors use `application/problem+json` with the schema in `02_OPENAPI_BASE_CONTRACT.yaml`:

```text
code: stable machine code
message: safe localized-or-client-displayable message
correlation_id: effective correlation UUID
retryable: boolean
field_errors?: [{field, code, message}]
details?: allowlisted object
```

Workers persist/emit the same `code`, `correlation_id` and retryability, but never a client-facing HTTP assumption. SQL, stack traces, secret refs/values, full signed URLs, credentials, raw protected content and cross-tenant object existence are forbidden.

## Proposed stable classes

The semantics are rector-required; the exact codes and HTTP mapping are proposed and require human approval before publication.

| class | proposed code | API status | retryable default | contractual semantics |
|---|---|---:|---:|---|
| validation | `VALIDATION_FAILED` | 400 | false | shape/type/range/field validation; field_errors allowlisted |
| authentication | `AUTHENTICATION_REQUIRED` / `AUTHENTICATION_INVALID` | 401 | false | no authenticated principal |
| authorization | `AUTHORIZATION_DENIED` | 403 | false | entitlement/permission/scope/object policy/SoD denied; do not reveal cross-tenant existence |
| not found | `RESOURCE_NOT_FOUND` | 404 | false | only when caller is authorized to know the resource class; otherwise use safe denial/not-found policy consistently |
| conflict | `RESOURCE_CONFLICT` | 409 | false | uniqueness or current-state conflict |
| concurrency | `CONCURRENCY_CONFLICT` | 409 | true | stale ETag/row_version; caller must refetch/reconcile |
| idempotency | `IDEMPOTENCY_KEY_CONFLICT` | 409 | false | same bound key, different fingerprint; no mutation |
| insufficient data | `RESULT_INSUFFICIENT_DATA` | 422 | false | requested official result cannot be valid; preserve exact `result_status` in details |
| lifecycle | `LIFECYCLE_TRANSITION_NOT_ALLOWED` | 409 | false | no published edge or failed precondition; no generic status update |
| invariant | `DOMAIN_INVARIANT_VIOLATION` | 422 | false | valid syntax but contract invariant rejected |
| rate/limit | `RATE_LIMIT_EXCEEDED` / `USAGE_LIMIT_EXCEEDED` | 429 / 409 | conditional | only where an approved provider/plan/automation policy defines a limit; optional retry-after only when known |
| dependency | `DEPENDENCY_UNAVAILABLE` | 503 | true | required internal/external dependency unavailable; never return empty valid dataset |
| connector/provider | `CONNECTOR_PROVIDER_ERROR` | 502 | conditional | provider-specific detail redacted; provider contract determines retry |
| internal | `INTERNAL_FAILURE` | 500 | conditional | opaque safe message; full diagnostic only in protected telemetry |

`result_status` values are not transport errors by default. A valid query may return an envelope with `no_data`, `conflicting_sources`, `source_error`, etc.; an operation demanding publication may reject with the matching stable domain error without coercing a status to zero or empty data.

## Worker behavior

- transient retry is permitted only when the error classification/policy says so;
- terminal failure records redacted detail in DLQ/job state and preserves prior official result;
- exhausted retry does not fabricate completion;
- partial bulk/import failure has per-row code/outcome and aggregate status; no opaque all-or-nothing claim.

## Approval blocker

Rector 25 freezes envelope fields but not the exact machine-code vocabulary or HTTP mapping. Until the proposal is approved, `ERROR_MODEL=BLOCKED` for implementation even though all required semantic classes are represented.
