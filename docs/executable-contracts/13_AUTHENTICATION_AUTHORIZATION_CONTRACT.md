# Authentication and authorization contract

| Campo | Valor |
|---|---|
| Contract owner | Security & Privacy Reviewer |
| Approving human roles | Architecture Owner, Security & Privacy Reviewer, Backend Owner |
| Status | `CONTRACT_DEFINED` |
| Human authority | Decision Record: Fase 2 continuation authorization, DR-F2-011 |

## Authentication profile

All protected API operations use `Authorization: Bearer <access-token>` under OIDC/OAuth 2.x. The access token is a JWT validated by the backend against environment-configured issuer, audience and JWKS/verification keys. Validation fails closed on signature, algorithm allowlist, issuer, audience, expiry, not-before, token type or principal-class mismatch. Key rotation is supported; secrets/private keys are external references and never repository data.

The concrete commercial IdP, exact claims mapping, issuer URL, audience value, authorized algorithms and token lifetimes are deployment security configuration and require the corresponding pre-runtime security gate. They are not product semantics and no vendor is inferred here.

## Principal separation

| principal_class | authentication contract | authorization subject |
|---|---|---|
| `HUMAN_INTERACTIVE` | OIDC interactive access token identifying a canonical `UserIdentity` | active membership, role grants, scopes, entitlements and object policy |
| `MACHINE_TO_MACHINE` | OAuth 2.x machine access token identifying a canonical `ServicePrincipal` | explicit service-principal grants, purpose and allowed ownership/tenant context; never an inherited human session |

Frontend-supplied roles, permissions, scopes, plan or capability claims are untrusted hints and confer no access. Backend GRC state is authorization authority after identity validation.

## Tenant-context selection

Tenant operations require `X-TCDX-Tenant-Id`. The header selects a candidate context only. Backend proves an active `TenantMembership` or explicit service-principal tenant authorization, then resolves entitlement, permission, scope, ownership, SoD and object policy. Missing, inactive, foreign or incompatible context fails without leaking object existence. Platform/global operations omit the header unless their operation contract explicitly targets tenant-owned data; target IDs never become ambient authority.

## Effective authorization

`authenticated principal -> principal class -> active tenant context when required -> plan version -> capability entitlement -> canonical role/custom role -> permission -> scope/ownership -> object policy -> SoD -> ALLOW`

Every missing or indeterminate input is `DENY`. A capability is not a permission; a role is not a scope; an entitlement is not ownership. Lists, exports, signed-file access, jobs, outbox consumers and AI context apply the same effective predicate at query/command construction.

## Confidentiality and cache

Foreign-tenant identifiers produce the same `TCDX.RESOURCE.NOT_FOUND` contract as absence when disclosure would reveal existence. Timing, pagination totals, ETags, audit details and signed URLs cannot disclose the foreign object. Cache keys bind all authorization-relevant dimensions and cache is never authorization authority.

## Impersonation

Only `platform.impersonation_session.impersonate` with platform scope may start/end a bounded session. Target membership and tenant are explicit; reason, expiry, correlation and reinforced audit are mandatory. Impersonation cannot expand entitlement, permission, scope, SoD, license or regulatory content access.

## Workers, AI and asynchronous work

Workers execute as least-privilege `ServicePrincipal` using the persisted tenant/ownership/purpose context captured by the initiating transaction. They do not retain an expired user token as hidden authority. AI receives only the intersection of authorized context and approved purpose. Accepting an AI recommendation invokes a separately authorized domain command.

`AUTHENTICATION_AUTHORIZATION_CONTRACT=PASS` as a Phase 2 contract candidate; runtime IdP configuration still requires its later security gate.
