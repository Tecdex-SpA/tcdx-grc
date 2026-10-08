# Audit event catalog

| Campo | Valor |
|---|---|
| Contract owner | Security & Privacy Reviewer |
| Approving human roles | Architecture Owner, Security & Privacy Reviewer, QA/Release Owner, domain owners |
| Status | `CONTRACT_DEFINED` |

Audit events record accountability/outcome and never act as the domain event bus. The exact `audit_event_code` for each audited POST operation is the `audit.*.v1` code in artifact 03, including `audit.evidence.evidence.create.v1`, the five RetentionPolicy operation codes, the two Platform-governed invitation mutations and the two SubscriptionRegulatoryPack commands. For every API-backed lifecycle command, artifact 09 publishes that same operation-specific code and the implementation persists exactly one material AuditEvent; it never adds a second `audit.lifecycle.*` event. Only internal/system transitions without a public operation-specific code retain `audit.lifecycle.<entity>.<command>.v1`. GET operations produce no material audit by default, while protected-content access/export may add an access audit only through an approved policy.

The Phase 5 human amendment designates `audit.lifecycle.evidence_request.fulfill.v1` as the single canonical exception/name for the public `evidenceRequestFulfill` command. It is emitted exactly once; `audit.evidence.request.fulfill.v1` is not an active alias and is never emitted.

PRE-F5E additionally publishes three runtime-security boundary codes outside the public API-operation/lifecycle cardinality: `audit.iam.application_token.issue.v1`, `audit.iam.application_token.privileged_use.v1` and `audit.iam.application_token.revoke.v1`. They audit application-token lifecycle and privileged use without creating a GRC domain endpoint, table or event-bus fact.

The Phase 5 Subscription decision publishes `audit.platform.subscription.create.v1` as the material audit for `subscriptionCreate`. The same transaction emits `platform.subscription.created.v1` through the governed outbox and also records the existing reinforced privileged-use audit. No update, cancel, delete or change-plan audit/event is authorized by this decision.

The human Phase 5+ resolution of 2026-09-29 publishes `audit.platform.subscription_regulatory_pack.activate.v1` and `audit.platform.subscription_regulatory_pack.revoke.v1` for the distinct contractual relation. Activation records the exact Subscription, RegulatoryPackVersion and effective interval. Revocation records before/after, actor and required reason. Both operations emit their corresponding `platform.subscription_regulatory_pack.*.v1` outbox event in the same transaction. No physical DELETE or generic Subscription update is authorized.

The Phase 5+ human architecture resolution additionally publishes `audit.organization.subject.create.v1`, `audit.platform.tenant_account_classification.set.v1`, `audit.platform.regulatory_pack_validation_provenance.create.v1`, `audit.platform.regulatory_pack_validation_access.create.v1` and `audit.platform.regulatory_pack_validation_access.revoke.v1`. These record Subject identity, classification layer change, exact provenance/version approval, exact tenant access interval and required revocation reason respectively. They emit no domain outbox event because no approved downstream fact contract exists. No commercial entitlement or licence assertion is made.

DR-PHASE5-CANONICAL-TENANT-USER-ENROLLMENT-2026-09-24 publishes `audit.platform.membership_invitation.create.v1`, `audit.platform.membership_invitation.accept.v1` and `audit.platform.membership_invitation.revoke.v1`. Payloads may contain canonical invitation/membership identifiers, method, lifecycle, expiry and actor/correlation, but never the clear invitation token, token digest, external token or unnecessary email. Acceptance audit is written once in the same transaction that consumes the invitation and creates/reuses membership; assigning a role remains a separate `membershipRoleAssign` fact.

The human Phase 5 MembershipRole revoke decision of 2026-09-28 uses the existing `audit.platform.role.revoke.v1` for exactly one TENANT_OWNED assignment. It records canonical actor, tenant, assignment, role, before/after validity and required reason in the same transaction as the validity closure and `iam.role.revoked.v1` outbox event. Platform Admin use additionally records the existing reinforced privileged-use audit. Same-key replay produces no new audit/outbox event; no identity secret, token, digest or PlatformRoleAssignment is included.

The human STEP 23L-MI6A decision publishes six future Platform-only Managed Identity material-audit codes: `audit.platform.managed_identity.provision.v1`, `audit.platform.managed_identity.disable.v1`, `audit.platform.managed_identity.enable.v1`, `audit.platform.managed_identity.password_reset.v1`, `audit.platform.managed_identity.mfa_reset.v1` and `audit.platform.managed_identity.session_revoke.v1`. Each corresponds to exactly one approved POST in contract 22 and artifact 03. They require canonical Platform actor, target UserIdentity where known, operation, server time, correlation, result, safe before/after lifecycle metadata and a reason for every operation except provision. `ownership_class=PLATFORM_CONTROL`, `tenant_id=NULL`. Replay writes no second material audit. No password, temporary credential, OTP, TOTP seed, recovery secret, Keycloak client secret, raw token or provider payload appears in the event. Keycloak separately persists authentication and credential/admin events. These codes are contract-approved; runtime audit catalog and database publication are deferred to MI6. There is no Managed Identity GET material audit and no new outbox event under MI6A.

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
MUTATING_OPERATIONS=95
MUTATING_OPERATIONS_WITH_AUDIT=92
PUBLISHED_LIFECYCLE_EDGES=103
PUBLISHED_LIFECYCLE_AUDIT_CODES=103
PUBLISHED_AUDIT_EVENT_CODES=168
PUBLISHED_SECURITY_BOUNDARY_AUDIT_CODES=3
PUBLISHED_PLATFORM_GRANT_AUDIT_CODES=3
AUDIT_MAPPING_GAPS=0
```

The 161-code count adds `audit.privacy.retention_policy.update.v1` for the human-authorized draft update to the prior 160-code catalog. The RetentionPolicy lifecycle amendment adds create/review/approve audit codes while reusing the already-published publish code. The v1.7 replacement of the contradictory fulfillment code by the single canonical `audit.lifecycle.evidence_request.fulfill.v1` removes the former duplicate alias from the active catalog. The three PRE-F5E token-security codes and three Platform-grant codes remain counted separately because they add no lifecycle edge. Binary content transfer is accounted for by upload-request/finalize audit; authorized GET has no material audit by default under this contract.

The coverage counts above describe the **existing runtime-materialized catalog**. The six MI6A codes are separately contract-approved (`MI6A_CONTRACT_AUDIT_CODES=6`) and are not included in the 168 runtime count until MI6 publishes and verifies them under the existing model.

`AUDIT_EVENT_CATALOG=PASS` as a Fase 2 contract candidate.

## STEP 23L-MI10-P2A

P2A activates reserved audit.iam.platform_role_assignment.assign.v1 and audit.iam.platform_role_assignment.revoke.v1 for exactly platformRoleAssign/platformRoleRevoke. Restricted reinforced material audit and existing privileged-use audit commit with mutation/idempotency. Actor, target, role, reason, time, correlation, outcome and validity are minimized per executable24. No domain outbox fact, tenant authority or secret payload.


## STEP 23L-TENANT-ONBOARDING-D1-R

Two human-approved local contract audit bindings are added, not runtime-published counts or SQL:

| Operation | Audit code | Privacy / transaction meaning |
|---|---|---|
| userIdentityDiscovery | audit.platform.user_identity.discover.v1 | Reinforced access attempt: actor, boundary, own tenant where applicable, mode, criterion type, internal classification, time/outcome/correlation. Raw value and hidden identity references omitted; no new query hash. Business read plus required audit append. |
| tenantInitialOnboardingCreate | audit.platform.tenant_initial_onboarding.create.v1 | Reinforced parent result/outcome and safe authorized progress. Platform ownership/NULL tenant context; target company is reference, not actor membership. Primitive tenantCreate and internal privileged bootstrap facts retain their audits; completed replay no duplicate material fact. |

No new outbox event. Existing INTERNAL TENANT_BOOTSTRAP keeps audit.iam.application_token.privileged_use.v1 and its replay-attempt semantics. Existing runtime count sections above are historical materialized counts, not this new local contract publication. Executable25 owns exact fields, retention/privacy and fail-closed persistence behavior.

## Managed Identity tenant onboarding E2E — 2026-10-07

`audit.platform.tenant_user.onboard.v1`: Platform actor, explicit safe target, reason, completed/pending references, correlation, success/denied/failure; PLATFORM_CONTROL/null. Children retain `audit.platform.membership.create.v1` / `audit.platform.role.assign.v1`, exact TENANT_OWNED ownership and existing events. No secret/input lookup value in audit.

## Approved Phase 5 methodology amendment

See [27 — canonical methodology binding](27_PHASE5_METHODOLOGY_BINDING.md) and the explicit human architecture approval. Migration `20261007000200` produces 30 migrations / 237 physical tables / 172 permissions. Seeds: separate Compliance and Control Effectiveness version 1, two compatible FormulaDefinitions, two narrowly scoped read permissions; publication audit `audit.compliance.methodology.publish.v1` and `audit.controls.methodology.publish.v1`. No historical migration or immutable rector file is changed.
