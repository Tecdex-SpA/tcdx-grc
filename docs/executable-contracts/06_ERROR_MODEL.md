# Unified API and worker error model

| Campo | Valor |
|---|---|
| Contract owner | Backend Owner |
| Approving human roles | Architecture Owner, Backend Owner, Security & Privacy Reviewer |
| Status | `CONTRACT_DEFINED` |

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

## Stable machine codes and HTTP mapping

Codes are namespaced `TCDX.<CLASS>.<SPECIFIC>`, uppercase ASCII and immutable once published. New codes may refine a class without changing the HTTP or disclosure contract.

| class | stable code | API status | retryable default | contractual semantics |
|---|---|---:|---:|---|
| VALIDATION | `TCDX.VALIDATION.FAILED` | 400 | false | shape/type/range/field validation; allowlisted field errors |
| AUTHENTICATION | `TCDX.AUTHENTICATION.REQUIRED`, `TCDX.AUTHENTICATION.INVALID` | 401 | false | missing or invalid JWT/trust validation; `WWW-Authenticate: Bearer` |
| AUTHORIZATION | `TCDX.AUTHORIZATION.DENIED` | 403 | false | authenticated and resource is within a context whose existence caller may know, but entitlement/permission/SoD denies action |
| NOT_FOUND | `TCDX.RESOURCE.NOT_FOUND` | 404 | false | missing object or concealed cross-tenant/out-of-scope object; identical safe message prevents IDOR disclosure |
| CONFLICT | `TCDX.CONFLICT.RESOURCE` | 409 | false | uniqueness/current-state conflict not covered by concurrency/idempotency |
| CONCURRENCY_CONFLICT | `TCDX.CONFLICT.CONCURRENCY` | 409 | true | stale `If-Match`/row_version; refetch and reconcile |
| IDEMPOTENCY_CONFLICT | `TCDX.CONFLICT.IDEMPOTENCY` | 409 | false | same bound key with a different canonical request fingerprint; no mutation |
| INSUFFICIENT_DATA | `TCDX.RESULT.INSUFFICIENT_DATA` | 422 | false | an operation demanding an official result cannot meet rector sufficiency; exact `result_status` is allowlisted in details |
| INVALID_STATE_TRANSITION | `TCDX.LIFECYCLE.TRANSITION_DENIED` | 409 | false | edge absent, source state mismatch or published precondition failed |
| INVARIANT_VIOLATION | `TCDX.INVARIANT.VIOLATION` | 422 | false | syntactically valid command violates domain/physical invariant |
| RATE_LIMIT | `TCDX.LIMIT.RATE_EXCEEDED` | 429 | conditional | only from approved provider/AutomationPolicy; `Retry-After` only when known |
| USAGE_LIMIT | `TCDX.LIMIT.USAGE_EXCEEDED` | 409 | false | versioned PlanVersion/UsageLimit prevents command; not authorization |
| DEPENDENCY_UNAVAILABLE | `TCDX.DEPENDENCY.UNAVAILABLE` | 503 | true | required internal/object-store/AI dependency unavailable; never valid empty data |
| PROVIDER_ERROR | `TCDX.PROVIDER.FAILURE` | 502 | conditional | approved connector/provider failure; detail redacted and retry policy provider-contractual |
| INTERNAL_ERROR | `TCDX.INTERNAL.FAILURE` | 500 | conditional | opaque safe failure; diagnostic only in protected telemetry |

`result_status` values are not transport errors by default. A valid query may return an envelope with `no_data`, `conflicting_sources`, `source_error`, etc.; an operation demanding publication may reject with the matching stable domain error without coercing a status to zero or empty data.

## Worker behavior

- transient retry is permitted only when the error classification/policy says so;
- terminal failure records redacted detail in DLQ/job state and preserves prior official result;
- exhausted retry does not fabricate completion;
- partial bulk/import failure has per-row code/outcome and aggregate status; no opaque all-or-nothing claim.

## Disclosure rule

For a guessed foreign-tenant or out-of-scope identifier, return `TCDX.RESOURCE.NOT_FOUND` regardless of whether the UUID exists. Use `TCDX.AUTHORIZATION.DENIED` only when revealing the resource/context is already authorized. Timing, field errors and details must not distinguish the hidden cases.

`ERROR_MODEL=PASS` as a Fase 2 contract candidate; human gate approval remains external.
