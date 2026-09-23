# Authentication and authorization contract

| Campo | Valor |
|---|---|
| Contract owner | Security & Privacy Reviewer |
| Approving human roles | Architecture Owner, Security & Privacy Reviewer, Backend Owner |
| Status | `CONTRACT_DEFINED` |
| Human authority | Decision Record: Fase 2 continuation authorization, DR-F2-011 |

## Authentication profile

All protected API operations use `Authorization: Bearer <TCDX-application-access-token>`. For a human interactive session, that credential is the short-lived TCDX application JWT defined by PRE-F5E; it is not the external IdP access token, external `id_token`, opaque provider token or provider refresh token.

The human boundary is:

`Authorization Code + PKCE -> validate external identity proof -> resolve exact (external issuer, stable subject) to canonical UserIdentity -> TCDX token issuance -> protected API`.

The TCDX JWT is validated against the exact runtime-configured TCDX issuer and API audience, an asymmetric verification key and safe algorithm allowlist, mandatory `sub`, `jti`, `iat`, `exp` and `principal_class=HUMAN_INTERACTIVE`, applicable `nbf`, and current local session/revocation state. `sub` is the stable canonical `UserIdentity` UUID and never email. Validation fails closed on any missing/mismatched claim, signature/key/algorithm, non-positive or over-policy lifetime, time policy, token type, principal class or revocation check.

Private signing keys remain in external secret/key custody. Public verification keys use an authenticated rotatable publication/reference mechanism. No signing secret, private key or concrete QA issuer/hostname/key ID is committed or delivered to the browser. Exact issuer/audience values, safe algorithm allowlist, key references, maximum short lifetime and bounded time policy are deployment security configuration requiring the pre-runtime security gate; absence blocks issuance/acceptance.

The concrete commercial IdP, provider authorization/callback path and claim adapter are runtime security configuration. Provider identity always converges to exact `issuer + stable subject`; no vendor, email domain or provider-specific claim becomes GRC authorization semantics.

## Human browser delivery, logout and revocation

After a successful authenticated callback, browser delivery returns only the TCDX application access token. External access/refresh tokens, external `id_token`, signing material and provider secrets are never returned as API credentials. No token may appear in URL query, fragment, referrer-visible data or logs.

Logout closes the local application session, removes the browser-held TCDX credential and revokes its `jti` through `exp`. The revocation/session mechanism is protected runtime-security state outside the canonical GRC system-of-record and creates no GRC table or entity. Required revocation state unavailable or indeterminate means DENY for affected tokens.

Issuance, privileged use and revocation are auditable as `audit.iam.application_token.issue.v1`, `audit.iam.application_token.privileged_use.v1` and `audit.iam.application_token.revoke.v1`. Audit stores canonical actor, outcome, correlation, issuer/key fingerprints and a non-reversible `jti` fingerprint where required, never a raw token, signing material or external credential.

## Principal separation

| principal_class | authentication contract | authorization subject |
|---|---|---|
| `HUMAN_INTERACTIVE` | TCDX asymmetric application JWT issued after validated external OIDC proof and canonical `UserIdentity` resolution | Platform authority through active persisted PlatformRoleAssignment; tenant authority through active membership/role grants/scopes/entitlements/object policy |
| `MACHINE_TO_MACHINE` | separately approved OAuth 2.x JWT profile identifying a canonical `ServicePrincipal`; never the human token-exchange profile | explicit service-principal grants, purpose and allowed ownership/tenant context; never an inherited human session |

Frontend-supplied roles, permissions, scopes, plan or capability claims are untrusted hints and confer no access. Backend GRC state is authorization authority after identity validation.

## Tenant-context selection

Tenant operations require `X-TCDX-Tenant-Id`. The header selects a candidate context only and never becomes identity proof. Backend proves an active `TenantMembership` for the canonical token `sub`, or explicit service-principal tenant authorization, then resolves entitlement, permission, scope, ownership, SoD and object policy. Missing, inactive, foreign or incompatible context fails without leaking object existence. `GET /access/me` is the explicit exception for discovering only the authenticated human's own active contexts before selection and requires no tenant header. Platform/global operations omit the header unless their operation contract explicitly targets tenant-owned data; target IDs never become ambient authority.

## Effective authorization

Platform authority is:

`validated TCDX principal -> canonical UserIdentity -> active PlatformRoleAssignment -> Role(PLATFORM_CONTROL) -> RolePermission -> Permission -> platform scope -> object policy -> SoD -> ALLOW`.

Tenant authority is:

`validated TCDX principal -> canonical UserIdentity -> active TenantMembership -> plan version -> capability entitlement -> MembershipRole -> RolePermission -> Permission -> scope/ownership -> object policy -> SoD -> ALLOW`.

`PlatformRoleAssignment` is the sole human Platform grant authority and is canonical persisted IAM data. It contains no tenant/membership and targets only roles whose ownership class is `PLATFORM_CONTROL`. External `(issuer, stable subject)` resolves `UserIdentity` but is not a runtime grant allowlist. TenantMembership never grants Platform authority. Missing/inactive assignment, role, permission, platform scope, object policy or SoD outcome means DENY. This route is authorized by active rector baseline v1.6; runtime remains fail-closed until the separately authorized physical migration and runtime implementation.

## First Platform Admin Bootstrap

F5D-007 authorizes exactly one internal ceremony, `FIRST_PLATFORM_ADMIN_BOOTSTRAP`, to cross the initial zero-grant state. It is not a public API, permission, normal Platform authorization path, runtime flag or identity allowlist. The target is exactly the canonical `UserIdentity` represented by the already validated `HUMAN_INTERACTIVE` TCDX principal; the ceremony accepts no email, provider identity tuple, tenant, membership or caller-selected `role_id`.

The future internal command must execute one atomic PostgreSQL 16 `READ COMMITTED` transaction:

1. resolve exactly one published baseline Role by `role_code=PLATFORM_ADMIN`, `ownership_class=PLATFORM_CONTROL`, `tenant_id IS NULL`; zero or multiple matches DENY;
2. lock that canonical role row with `SELECT ... FOR UPDATE`, providing the common serialization point for every bootstrap attempt;
3. after obtaining the lock, revalidate the principal and role, require both zero active assignments at `transaction_timestamp()` and zero historical rows in `iam.platform_role_assignments`;
4. insert exactly one open `PlatformRoleAssignment` for the authenticated `UserIdentity`, using the resolved role ID, server UUID/time and no tenant/membership;
5. insert reinforced `audit.iam.platform_role_assignment.bootstrap.v1` with actor/target, role, server time, correlation, justification and outcome in the same transaction.

Any missing input, catalog ambiguity, existing active or historical assignment, audit failure, serialization failure or transaction failure is DENY/rollback. Because every contender locks the same role row and re-reads after the lock under `READ COMMITTED`, concurrent attempts cannot both create a first grant. Requiring zero historical rows additionally makes the ceremony permanently unavailable after first success, including after later revocation. `PLATFORM_SUPPORT`, any other Platform role, tenant/custom role and arbitrary role ID are never eligible.

No existing backend surface provides this internal ceremony. PRE-F5E closes its authority and invariants only; runtime implementation and real concurrency evidence remain for the next authorized runtime/security stage. Until then no bootstrap command is executable and Platform access remains fail-closed.

Every missing or indeterminate input is `DENY`. A capability is not a permission; a role is not a scope; an entitlement is not ownership. Lists, exports, signed-file access, jobs, outbox consumers and AI context apply the same effective predicate at query/command construction.

H-003..H-005 do not weaken this chain. Configuration overrides and all privacy operations resolve a real tenant from persisted ownership; Platform Admin has no automatic right to tenant personal content. LifecycleTransitionDefinition is PLATFORM_CONTROL and only Platform Admin has its base grants, while administering/publishing that registry never authorizes execution of a domain transition. Configuration, privacy and lifecycle publication/execute/review actions remain default DENY, SoD-checked and reinforced-audited.

## Confidentiality and cache

Foreign-tenant identifiers produce the same `TCDX.RESOURCE.NOT_FOUND` contract as absence when disclosure would reveal existence. Timing, pagination totals, ETags, audit details and signed URLs cannot disclose the foreign object. Cache keys bind all authorization-relevant dimensions and cache is never authorization authority.

## Impersonation

Only `platform.impersonation_session.impersonate` with platform scope may start/end a bounded session. Target membership and tenant are explicit; reason, expiry, correlation and reinforced audit are mandatory. Impersonation cannot expand entitlement, permission, scope, SoD, license or regulatory content access.

## Workers, AI and asynchronous work

Workers execute as least-privilege `ServicePrincipal` using the persisted tenant/ownership/purpose context captured by the initiating transaction. They do not retain an expired user token as hidden authority. AI receives only the intersection of authorized context and approved purpose. Accepting an AI recommendation invokes a separately authorized domain command.

```text
EXTERNAL_IDP_TOKEN_AS_API_BEARER=0
ID_TOKEN_AS_API_BEARER=0
OPAQUE_PROVIDER_TOKEN_AS_API_BEARER=0
TCDX_APPLICATION_TOKEN_CONTRACT=JWT_ASYMMETRIC_RUNTIME_CONFIGURED
F5D_001_PLATFORM_AUTHORITY=CLOSED
F5D_006_APPLICATION_TOKEN=CLOSED
```

`AUTHENTICATION_AUTHORIZATION_CONTRACT=ACTIVE_PRE_F5E`. The application-token boundary and bootstrap semantics are closed contractually; runtime IdP/key/revocation/bootstrap implementation and physical materialization still require their later security/runtime gates.
