# Audit event catalog

| Campo | Valor |
|---|---|
| Contract owner | Security & Privacy Reviewer |
| Approving human roles | Architecture Owner, Security & Privacy Reviewer, QA/Release Owner, domain owners |
| Status | `CONTRACT_DEFINED` |

Audit events record accountability/outcome and never act as the domain event bus. The exact `audit_event_code` for each of the 61 mutating API operations is the `audit.*.v1` code in artifact 03. The 93 unambiguous lifecycle edges use the exact `audit.lifecycle.<entity>.<command>.v1` code published row-by-row in artifact 09. Four GET operations produce no material audit by default, while protected-content access/export may add an access audit only through an approved policy.

## Code convention

`audit.<domain>.<resource>.<command>.v1`, lowercase ASCII. A published code is immutable. A semantically breaking payload change creates `v2`; changing a command creates another code. This convention does not create unlisted operations.

## Record contract

Every mapped operation writes `ops_audit.audit_events` with:

- exact audit code and command/operation ID;
- actor user XOR service principal where applicable;
- ownership_class and `tenant_id` required only for TENANT_OWNED/TENANT_DERIVED, NULL for GLOBAL_REFERENCE/PLATFORM_CONTROL;
- subject aggregate type/ID and action;
- minimized before/after fields relevant to the decision;
- source channel/service, correlation/request/causation and provenance;
- `occurred_at` UTC and outcome `succeeded|denied|failed`;
- reason/justification for reject, archive, impersonate, revoke, approve exceptions, risk acceptance, publish and other commands whose contract requires it;
- classification/redaction and effective retention policy/version.

No secret, blob, full signed URL, JWT/JWKS material, protected normative body, raw provider payload or unnecessary PII is allowed. Baseline retention is seven years subject to longer effective policy/legal hold.

## Audit payload profiles

| profile | operations | before/after semantics | reinforced |
|---|---|---|---:|
| ACCESS_ADMIN | tenant, membership, role and impersonation operations | identifiers, scope/validity and changed grant/session state; no token | yes |
| WORKFLOW | submit/start/review/approve/reject/complete/verify/triage/fulfill | source/target lifecycle, decision and relevant version; reason reference when required | approve/verify/reject/dismiss/cancel/reopen yes |
| CONTENT_PUBLICATION | SoA, regulatory pack and report publication | version IDs, hashes, coverage/approval refs, classification; no licensed/blob content | yes |
| FILE_EVIDENCE | upload/finalize/request/evidence operations | metadata/checksum/scan/review outcome; never binary/signed URL | approval/access yes |
| DATA_EXECUTION | sync/calculation/source resolution/rule/report/AI jobs | definition/version/job IDs, status, input/context hash and result ref | source resolution/publication/AI acceptance yes |
| RISK_PRIVACY | risk assessment/treatment/acceptance and future erasure | values/status/policy refs; rationale minimized | acceptance/erasure yes |

## Denial and IDOR

Authentication failures are security telemetry; authorization/SoD denial for a known authorized context is audit outcome `denied`. Guessed foreign-tenant resources are logged with the actor/request/correlation and attempted route classification but must not copy the foreign identifier into caller-visible details. Audit retrieval itself is tenant/scope protected.

## Coverage

```text
MUTATING_OPERATIONS=61
MUTATING_OPERATIONS_WITH_AUDIT=61
PUBLISHED_LIFECYCLE_EDGES=93
PUBLISHED_LIFECYCLE_AUDIT_CODES=93
PUBLISHED_AUDIT_EVENT_CODES=154
AUDIT_MAPPING_GAPS=0
```

The three blocked operation families OP-B01..03 and the unresolved `Issue.* -> dismissed` edge have no invented audit codes. Their codes are published only after the corresponding human decision.

`AUDIT_EVENT_CATALOG=PASS` as a Fase 2 contract candidate.
