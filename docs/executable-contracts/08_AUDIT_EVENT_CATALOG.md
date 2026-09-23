# Audit event catalog

| Campo | Valor |
|---|---|
| Contract owner | Security & Privacy Reviewer |
| Approving human roles | Architecture Owner, Security & Privacy Reviewer, QA/Release Owner, domain owners |
| Status | `CONTRACT_DEFINED` |

Audit events record accountability/outcome and never act as the domain event bus. The exact `audit_event_code` for each of the 80 mutating API operations is the `audit.*.v1` code in artifact 03, including `audit.evidence.evidence.create.v1`. For every API-backed lifecycle command, artifact 09 publishes that same operation-specific code and the implementation persists exactly one material AuditEvent; it never adds a second `audit.lifecycle.*` event. Only internal/system transitions without a public operation-specific code retain `audit.lifecycle.<entity>.<command>.v1`. GET operations produce no material audit by default, while protected-content access/export may add an access audit only through an approved policy.

PRE-F5E additionally publishes three runtime-security boundary codes outside the public API-operation/lifecycle cardinality: `audit.iam.application_token.issue.v1`, `audit.iam.application_token.privileged_use.v1` and `audit.iam.application_token.revoke.v1`. They audit application-token lifecycle and privileged use without creating a GRC domain endpoint, table or event-bus fact.

The 2026-09-23 Platform grant candidate additionally reserves `audit.iam.platform_role_assignment.assign.v1`, `audit.iam.platform_role_assignment.revoke.v1` and `audit.iam.platform_role_assignment.bootstrap.v1`. The bootstrap code belongs exclusively to the internal one-time `FIRST_PLATFORM_ADMIN_BOOTSTRAP` ceremony and is persisted atomically with its first grant; it is not a public endpoint or reusable grant. Any later authorized administration command must use the applicable reinforced code. Payload includes canonical user/role/validity, actor, required bootstrap justification, outcome and correlation, never email or external credential data.

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
| APPLICATION_TOKEN_SECURITY | TCDX application token issuance, privileged use and revocation | canonical actor, outcome/correlation, runtime issuer/key fingerprints and non-reversible jti fingerprint; never raw token/key/external credential | yes |
| WORKFLOW | submit/start/review/approve/reject/complete/verify/triage/fulfill | source/target lifecycle, decision and relevant version; reason reference when required | approve/verify/reject/dismiss/cancel/reopen yes |
| CONTENT_PUBLICATION | SoA, regulatory pack and report publication | version IDs, hashes, coverage/approval refs, classification; no licensed/blob content | yes |
| FILE_EVIDENCE | upload/finalize/request/evidence operations | metadata/checksum/scan/review outcome; never binary/signed URL | approval/access yes |
| DATA_EXECUTION | sync/calculation/source resolution/rule/report/AI jobs | definition/version/job IDs, status, input/context hash and result ref | source resolution/publication/AI acceptance yes |
| RISK_PRIVACY | risk assessment/treatment/acceptance and future erasure | values/status/policy refs; rationale minimized | acceptance/erasure yes |
| CONFIGURATION_GOVERNANCE | configuration definition publication, tenant override creation and lifecycle registry publication | definition/registry/version/scope/policy hashes and approvals; override value minimized | yes |
| PRIVACY_EXECUTION | retention publication, data-subject request decisions and erasure execute/review | policy/legal-basis/hold refs, per-class action/outcome and SoD refs; never erased personal data | yes |

## Denial and IDOR

Authentication failures are security telemetry; authorization/SoD denial for a known authorized context is audit outcome `denied`. Guessed foreign-tenant resources are logged with the actor/request/correlation and attempted route classification but must not copy the foreign identifier into caller-visible details. Audit retrieval itself is tenant/scope protected.

## Coverage

```text
MUTATING_OPERATIONS=80
MUTATING_OPERATIONS_WITH_AUDIT=80
PUBLISHED_LIFECYCLE_EDGES=100
PUBLISHED_LIFECYCLE_AUDIT_CODES=100
PUBLISHED_AUDIT_EVENT_CODES=154
PUBLISHED_SECURITY_BOUNDARY_AUDIT_CODES=3
PUBLISHED_PLATFORM_GRANT_AUDIT_CODES=3
AUDIT_MAPPING_GAPS=0
```

The 154-code count is derived only from artifacts 03 and 09: 80 operation codes plus lifecycle-only codes, with API-backed lifecycle codes deduplicated. The three PRE-F5E token-security codes and two Platform-grant codes are counted separately because they add no API operation or lifecycle edge. H-006 retains source-specific dismissal codes because dismissal has no public F5 operation. Erasure audit stores policy/version, action by object class, exclusions/hold and outcome without reintroducing erased personal data. Configuration and lifecycle publication retain author/reviewer/approver/publisher evidence and do not fabricate tenant context for PLATFORM_CONTROL.

`AUDIT_EVENT_CATALOG=PASS` as a Fase 2 contract candidate.
