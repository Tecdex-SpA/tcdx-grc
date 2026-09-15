# Authentication and authorization contract

| Campo | Valor |
|---|---|
| Contract owner | Security & Privacy Reviewer |
| Approving human roles | Architecture Owner, Security & Privacy Reviewer, Backend Owner |
| Status | `BLOCKED_BY_IDENTITY_PROFILE_AND_PERMISSION_CATALOG` |

## Authentication

No API authentication mechanism is selected by the rector. Compatible profiles may include an OIDC/OAuth bearer-token profile, a gateway-validated identity profile and a distinct machine-to-machine mechanism; their security and operational impacts differ. Exact issuer/trust root, audience, algorithms, claims, token/session lifetimes and machine credential flow require a human-approved identity profile before an OpenAPI security scheme is published. Any approved credential identifies a principal but never grants object scope by itself; email is not universal identity. Secrets are external references and rotation is supported.

## Tenant context

For tenant operations the request supplies an explicit tenant UUID context. Backend proves active TenantMembership for the authenticated UserIdentity and resolves all effective access in that tenant. The header/query/path value never grants access. Platform/global operations do not invent a tenant. ServicePrincipal ownership must be compatible with the operation target.

## Authorization decision

The chain in artifact 05 is evaluated server-side on every operation and worker command. Capability entitlement is checked before permission; neither substitutes the other. Scope comes from canonical object relationships. References to global content additionally require published/accessibility, pack/capability and RBAC checks.

## Object confidentiality

Foreign-tenant UUIDs must not reveal existence through status, timing, error details, ETags, pagination totals, signed URLs or audit payload returned to callers. Lists/exports always apply tenant and resolved scope at query construction. Cache keys include security context dimensions and cache cannot grant authorization.

## Impersonation

Only an authorized Platform Admin with `platform.impersonation_session.impersonate`, platform scope, mandatory reason and bounded expiry may initiate. Target membership/tenant is explicit; banner and reinforced audit are required. Platform Support has no implicit grant. Impersonation cannot bypass entitlements, object policy, SoD or regulatory restrictions.

## AI and async

AI context is the intersection of actor authorization and purpose. Workers execute as least-privilege ServicePrincipals against stored tenant/ownership context; they do not use a user token after expiry as hidden authority. Accepted AI recommendations invoke a separately authorized domain command.

## Blockers

Exact identity provider profile and permission registry/base-role grants are unresolved. No route may be implemented until both and its operation mapping are approved.
