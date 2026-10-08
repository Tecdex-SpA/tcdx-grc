# ADR — TCDX Managed Identity — Self-Hosted Keycloak External OIDC Authority

| Field | Value |
|---|---|
| Status | **APPROVED** |
| Approved by | `HUMAN_ARCHITECTURE_AUTHORITY` |
| Approval date | `2026-10-01` |
| Master regent | `TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23` |
| Scope | Managed Identity architecture, MI3A deployment coordinate and future implementation gates; no runtime authorization in MI3/MI3A |
| Contract | [`22_TCDX_MANAGED_IDENTITY_KEYCLOAK_CONTRACT.md`](../executable-contracts/22_TCDX_MANAGED_IDENTITY_KEYCLOAK_CONTRACT.md) |
| Rector amendment | [`TCDX_MANAGED_IDENTITY_INFRASTRUCTURE_AMENDMENT_v1.0_2026-10-01.md`](TCDX_MANAGED_IDENTITY_INFRASTRUCTURE_AMENDMENT_v1.0_2026-10-01.md), human-approved 2026-10-01 |

## Context and authority

The Phase 5 Zoho enrollment amendment and the current authentication contract permit only Zoho for the already deployed invitation flow; LOCAL password/MFA remains unimplemented. PRE-F5E §5 already requires any future TCDX Managed Identity to be an **external OIDC identity service**, with credential material outside the GRC system of record. Rector 46 §4 and plan 43 §2 require a human ADR and rector versioning before implementing a new deployable layer. STEP 23L-P3R found the Managed Identity runtime absent; MI1 identified the missing secret authority; MI2 proposed self-hosted Keycloak. The human architecture authority explicitly approved that proposal on 2026-10-01. This ADR records that approval without changing the existing Phase 5 runtime gate or immutable rector baseline.

## Decision

TCDX will operate **one TCDX Managed Identity realm in self-hosted Keycloak**, under TCDX control, as an external OIDC authority. This means one realm for managed human identities, never one realm per tenant. Keycloak authenticates username and password, holds password verifiers and TOTP state, governs credential lifecycle and issues OIDC identity proof. A username may look like an email address without a mailbox. Email verification, invitation delivery, OTP and recovery by email are not required for this population.

GRC accepts only validated OIDC proof and resolves the exact `issuer + stable sub` to its canonical `UserIdentity`. The existing physical `iam.user_identities.identity_key` is unique, `email_normalized` is nullable, and the current resolver derives its key from issuer and subject. No second user table or GRC migration is required for this architecture. Usernames and email never become identity keys or privilege selectors. A human interactive identity must identify one auditable person; shared human accounts are prohibited. The five `@credex.cl` texts in STEP 23L are proposed login identifiers only and create no identity or grant.

The GRC backend alone decides authorization from `UserIdentity`, active `TenantMembership` and `MembershipRole` or active `PlatformRoleAssignment`, then canonical permissions, entitlement, scope, object policy, SoD and default DENY. Keycloak realm roles, client roles, groups and role claims confer **no GRC business authority**. Keycloak administrative roles may exist for operating Keycloak itself. An external Keycloak token is never a GRC API bearer: GRC issues its own application JWT after the external proof and MFA gate pass.

## Security and credential boundary

- Password is mandatory; its policy is governed in Keycloak configuration, not hardcoded in GRC. No password, hash, salt, verifier, TOTP seed, recovery secret, external token or signing private key enters GRC PostgreSQL, Git, logs, reports, prompts or browser-delivered GRC API credentials.
- TOTP is mandatory for every usable Managed Identity. Password-only login must fail. **Enrollment alone does not prove that the login producing the consumed OIDC proof verified TOTP.** The GRC boundary must validate a signed, issuer/audience-bound authentication claim demonstrating password **and** TOTP for that authentication, together with the relevant login time/session context. A mapped `acr` level alone, an enrolled credential flag, or an unverified `amr` string cannot suffice. The exact Keycloak flow, claim mapping and validation profile must be proven by positive and negative integration tests before any TCDX token is issued. Missing, stale, contradictory or ambiguous proof means DENY.
- Keycloak brute-force protection and persisted user/admin event audit are mandatory deployment gates. At minimum the audit covers login success/failure, MFA and password lifecycle, account enable/disable, reset/recovery and administrator actions, with no secret values.
- Authorized onboarding is operator provision → direct secure delivery of a one-use temporary credential to the named human → force password choice/change → force TOTP enrollment → verify TOTP in an actual authentication → enable GRC session after proof and exact identity mapping. This ceremony was human-approved in MI3A. Provisioning does not automatically create membership or role. The operator must not know the permanent password. No account may become usable until this ceremony and the MFA proof gate are closed. MI6 must verify the operational person check, short lifetime and one-use handling without recording the credential.
- Recovery is authorized reset → invalidate prior credentials and sessions → force new password setup/change → reset prior factor when needed → enroll and verify a new TOTP factor → audit. MFA reset is sensitive, tenant-scoped when applicable, and cannot reveal the prior seed. No mailbox, security questions or previous-password disclosure. Exact GRC administrative operations, permissions, scopes and audit event mappings require separate approved executable contracts before implementation.

## Infrastructure and operations

### MI6E — controlled Keycloak administrative capability exception (2026-10-02)

The human architecture/security authority approves a **technical capability exception**, not a GRC functional-authority expansion. In Keycloak 26.7.5, the fine-grained user `manage` capability needed for the approved enable/disable, credential/TOTP and session actions also permits user deletion and federated-identity mutations. GRC remains limited to the eight Platform operations in executable contract 22. `MI6-SEC-001` records this distinction. The human MI6E-R decision names Andrés Barouh, in the capacity of TCDX GRC architecture/development owner, and fixes expiration at 2027-04-02, closing the owner/date requirements of rector 43 §5.4. The exception does not renew automatically.

| Exception field | Governed value |
|---|---|
| ID | `MI6-SEC-001` |
| Human decision | `HUMAN_ARCHITECTURE_SECURITY_APPROVAL`, 2026-10-02; `manage` only for the dedicated Managed Identity service account in realm `tcdx-managed-identity` |
| Owner | Andrés Barouh; `RESPONSABLE_ARQUITECTURA_DESARROLLO_TCDX_GRC`, human-approved in MI6E-R |
| Expiration date | `2027-04-02`, human-approved in MI6E-R; no automatic renewal |
| Technical scope | Keycloak 26.7.5 user `manage`, limited by Keycloak to the narrowest supported managed-user resource scope; minimum view/query only when required |
| Functional scope | Exactly the eight approved MI6 Platform operations; no ninth operation or additional GRC grant |
| Prohibited use | Delete user/Managed Identity; identity or federated-identity link/unlink; impersonation; realm, client, authorization, Keycloak role or group administration; arbitrary user mutation or Admin REST passthrough |
| Compensating controls | Explicit adapter method allowlist, internal Admin API network boundary, dedicated confidential service account and protected rotatable secret, prior GRC Platform RBAC/default DENY, correlated secret-free GRC and Keycloak audit, negative source/contract tests |
| Elimination plan | Before expiration, reassess the required Admin API privileges, replace `manage` with narrower scopes where possible, revoke the excess grant, verify the eight MI6 functions and negative gates, then close or replace this exception through human review. At expiration it must be `CLOSED`, `REPLACED` or `EXPLICITLY_REAPPROVED`; never `AUTO_RENEWED` |
| Early review triggers | `KEYCLOAK_VERSION_CHANGE` from 26.7.5; `LOWER_PRIVILEGE_CAPABILITY_AVAILABLE`; any proposed use of capability beyond the eight operations requires a new human decision |

The technical client must never receive `realm-admin`, `manage-realm`, `manage-clients`, impersonation or `manage-authorization`. Its service account is infrastructure, not a GRC actor; the human Platform actor must pass canonical GRC authorization before an allowlisted adapter method invokes Keycloak. The Admin API stays internal and public `/admin*` remains blocked. This record does not create the client, change Keycloak, implement MI6D, alter the GRC schema, or deploy anything.

Keycloak is a new deployable layer on the existing frontend VM `192.168.2.46`, as a **separate service/container** with its own lifecycle, health, restart, resources and logs. It uses the PostgreSQL instance at `192.168.2.40` through a **separate Keycloak database and principal**, never tables or credential columns in `tcdx-grc`. Its runtime needs persistent configuration/signing material, HTTPS/TLS at the human-approved `iam.grc.tecdex.net`, health and restart policy, monitoring, event persistence, reproducible realm/client configuration, encrypted backup and tested restore of database, identities, credential/MFA state and signing/key configuration. Realm export alone is not sufficient backup. Service secrets use protected secret references; no values are versioned or placed in examples. The GRC public origin and callbacks use `https://grc.tecdex.net/`. The similar-looking `grc.tecdx.net` and `iam.grc.tecdx.net` are prohibited. DNS, reverse proxy, TLS certificate, database and service deployment are not created in MI3A. VM capacity and current proxy/DNS topology must be inspected in MI4 before deployment; insufficient capacity blocks rather than moving hosts automatically.

## Alternatives considered

MI1 left an external OIDC credential authority unselected. MI2 evaluated self-hosted Keycloak as the implementable TCDX-controlled option and did not establish a competing approved provider. The human selected Keycloak. Storing LOCAL password/TOTP material in GRC, per-tenant realms and Keycloak-based GRC RBAC conflict with the existing authority boundary and were rejected. No provider comparison or selection is reopened by this record.

## Consequences and acceptance gates

This approval creates an operating dependency on a governed Keycloak service and its own backup, recovery, audit and security posture. MI3A subsequently approved the IAM hostname, placement, separate PostgreSQL database and direct one-use credential ceremony in the linked versioned rector amendment. Neither decision activates a Managed Identity account, changes the Zoho Phase 5 invitation, deploys infrastructure, edits the immutable rector baseline or closes STEP 23L. MI4–MI15 and their evidence are sequenced in [`STEP_23L_MANAGED_IDENTITY_IMPLEMENTATION_PLAN.md`](STEP_23L_MANAGED_IDENTITY_IMPLEMENTATION_PLAN.md). The exact realm identifier and resulting issuer require later configuration/verification; the approved hostname alone is not an issuer URL.

Architecture acceptance requires MI-001–MI-028 of the linked executable contract. Runtime acceptance additionally requires live positive/negative MFA proof, no password-only or email dependency, enforced brute-force and audit configuration, named-person onboarding/recovery, issuer+subject mapping, tenant isolation/RBAC negatives, backup/restore, exact public domain and QA E2E evidence. Until those gates pass: `MANAGED_IDENTITY_IMPLEMENTED=NO`, `MANAGED_IDENTITY_DEPLOYED=NO`, `STEP_23L=BLOCKED`, `HUMAN_UI_REVIEW=PENDING`, `PHASE_6=BLOCKED` and `PHASE_6_STARTED=0`.

## Traceability

Rector 09/12/22/30/43/46 → canonical `UserIdentity` and grants → physical `iam.user_identities` (`identity_key` unique, nullable email) → PRE-F5E 21 §5 and authentication contract 13 → this ADR → MI3A rector amendment → executable contract 22 → MI4–MI15 implementation plan. STEP 23L-P3R, MI1 and MI2 reports under `/tmp/` are prior continuity evidence, not authority over the active baseline.

Keycloak configuration capabilities and the need to verify the actual authentication context are documented in the official [Server Administration Guide](https://www.keycloak.org/docs/latest/server_admin/); production operation is covered by the official [production configuration](https://www.keycloak.org/server/configuration-production), [database](https://www.keycloak.org/server/db) and [health](https://www.keycloak.org/observability/health) guides. These references explain implementation capabilities and do not supersede the TCDX rector contracts or prove runtime configuration.
