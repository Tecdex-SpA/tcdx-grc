# STEP 23L-MI7A — frontend authentication and authorization projections

Status: `CONTRACT_DEFINED`; runtime implementation is pending MI7-R.
Authority: the explicit human STEP 23L-MI7A task, master
`TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23`, rector 09, 22, 25,
29, 42, 43 and 45, executable contracts 02, 03, 05, 06, 13, 21 and 22.
This closes the two projection decisions identified by MI7. It does not
approve deployment, runtime validation, human UI review or Phase 6.

## 1. Boundaries and existing contracts

Exactly two naturally idempotent, read-only GET contracts are added. They
create no identity lifecycle command, Permission, capability, grant, table,
column, seed or migration. MI6 remains exactly eight operations. The four
MI permissions, issuer + subject identity, IAM/GRC separation, mandatory
TOTP and private Admin Console remain unchanged.

`accessGet` (`GET /api/v1/access/me`) remains unchanged: it selects the
principal's own active tenant contexts and displays role metadata. Contract
21 §4 deliberately excludes permission enumeration. No sufficient existing
permission or public provider projection exists. The new authorization read
therefore complements context selection without duplicating it. Role names
in `EffectiveAccess` are never permission authority.

OpenAPI 02 owns the transport schemas; operation matrix 03 owns operation
traceability; Permission catalog 05 owns capability/scope bindings. The
type-only exports in `packages/contracts` consume these definitions. This
document closes semantics, not a second catalog or configuration registry.

## 2. authenticationProviderList

- Route: `GET /api/v1/auth/providers` (OpenAPI path `/auth/providers`).
- Public before authentication; no bearer, tenant context or Permission is
  required. An optional correlation header follows normal API policy.
- No body, query parameters or tenant-selection header are accepted. An
  incidental browser session cannot personalize the result.
- Response: `AuthenticationProviderAvailability`, containing exactly four
  entries with only `provider` and `available`. Every provider occurs once.
  Entry order is unspecified and never conveys authority or preference.
- Closed product set: `ZOHO`, `MICROSOFT_ENTRA_ID`, `GOOGLE_WORKSPACE`,
  `TCDX_MANAGED_IDENTITY`. No other provider is accepted.

### 2.1 Single availability authority

`available=true` means the backend has validated the provider's complete
canonical authentication configuration, enabled its supported browser flow
through the existing application bootstrap, and registered a client capable
of initiating that flow. All three predicates must hold. Absent or disabled
configuration/client means false. A partially configured group remains a
startup/configuration error under existing policy, never a fabricated true.

The existing authority is backend configuration (`config.ts`) plus browser
client composition (`server.ts`, `registerOidcBrowserRoutes`):

| Product identifier | Existing configuration and initiation authority |
|---|---|
| ZOHO | `oidc.configured`, validated issuer/client/redirect group, configured application-token service and registered `oidcBrowser`; existing `/auth/login?provider=zoho` |
| TCDX_MANAGED_IDENTITY | `managedIdentityOidc.configured`, validated issuer/client/redirect group, configured application-token service and registered `managedIdentityBrowser`; existing `/auth/login?provider=tcdx-managed-identity` |
| MICROSOFT_ENTRA_ID | No approved configured browser adapter/client is registered in the inspected backend; unavailable until its separately approved integration registers that authority |
| GOOGLE_WORKSPACE | No approved configured browser adapter/client is registered in the inspected backend; unavailable until its separately approved integration registers that authority |

The last two descriptions are inspection evidence, not permanent availability
constants. Future integration consumes this same contract and closed set.
No frontend booleans, new enablement flag, separate provider registry,
Managed Identity administration service, DNS, tenant, email domain or UI
button can supply availability. There is no new provider operation or new
login selector. Supporting a product provider is distinct from configuring
and enabling it.

Availability is **configured/enabled**, not **live/healthy**. No synchronous
discovery, health probe, token request or network call to an IdP occurs on
this GET. A later external outage does not change configured availability;
the existing authentication flow returns its safe failure. Backend restart
or its already approved configuration lifecycle refreshes composition. An
internal projection failure returns a redacted 503, not a successful empty
array or guessed booleans. Four false entries are valid only when derived
from an actual configuration with no enabled browser flow.

### 2.2 Public safety and consumption

Return no issuer, client identifier, secret, endpoint, technical client,
realm administration detail, internal hostname, database configuration,
TOTP data, token, failure diagnostic, tenant or user information. The
response is not a configuration dump. Product display names are presentation
of the closed identifiers, not an alternative availability authority.

Success and errors use `Cache-Control: no-store`, normal correlation and
redacted error conventions. The route participates in existing public
surface security/rate limiting; it grants no exemption and establishes no
new numeric limit or AutomationPolicy. An approved limiter may return 429
`TCDX.LIMIT.RATE_EXCEEDED` under contract 06; `Retry-After` is supplied only
when known. Reads produce no material domain audit/outbox event (`NONE`);
existing security-event policy still applies. No external reachability probe
or per-render audit noise is introduced.

Login entry fetches the projection on entry; it discards it on leaving or
retrying the entry. Missing, malformed, unknown or failed results cannot
enable a provider. Only an explicitly present true entry may enable its
already approved initiation flow. False remains unavailable. No persistent
browser storage, hardcoded availability, role/tenant inference or fallback
to a guessed provider is permitted. This step implements neither that
consumer nor the endpoint.

## 3. currentPrincipalAuthorizationRead

- Route: `GET /api/v1/auth/me/authorization` (OpenAPI path
  `/auth/me/authorization`).
- Requires a valid, unrevoked `HUMAN_INTERACTIVE` TCDX application JWT and
  active canonical UserIdentity under contract 13. Missing/invalid session
  is 401; incompatible principal or inactive identity is 403. External IdP
  tokens are not API bearers. No new self-read Permission is required:
  the explicit authenticated-context authority used by `accessGet` applies.
- No body, query principal, user ID, role, permission filter or capability
  claims. Optional `X-TCDX-Tenant-Id` selects one candidate context only.
  Malformed/repeated header is 400. Foreign/missing context is concealed by
  the existing 404 policy; inactive/incompatible own context is denied.
- Without that header, return the platform projection and
  `tenant_permissions: null`. With it, validate the principal's own active
  membership in an active tenant; include only that tenant. Do not enumerate
  all tenants or borrow Platform authority to bypass membership. An invalid
  selected context fails the entire read; no partial success is returned.

### 3.1 Closed payload and derivation

`CurrentPrincipalAuthorization` contains exactly:

1. `evaluated_at`: server UTC timestamp of the coherent read-only evaluation;
2. `platform_permissions`: unique lexicographically ordered published
   Permission codes effective through the active Platform grant chain;
3. `tenant_permissions`: null, or `{tenant_id, permissions}` for the selected
   validated context. `permissions` maps each effective published code to a
   nonempty deduplicated array of its exact `TenantPermissionScope` grants.

An empty platform array or tenant permission map is a legitimate DENY
projection. Unknown/unpublished codes are omitted. No role names, grant
claims from JWT/browser, entitlement overrides, secrets or other principals'
authorization appear. Structural scope references are solely the caller's
own persisted same-tenant grants, not arbitrary object enumeration.

Platform derivation uses validated identity → active
`iam.platform_role_assignments` → published Role(PLATFORM_CONTROL,
tenant_id null) → matching RolePermission → published Permission whose
catalog permits platform scope. Membership does not enter this chain.
No tenant commercial entitlement is invented for Managed Identity. Its
four codes remain platform only; projecting `update` never creates a ninth
operation. There is no special case based on a role name.

Tenant derivation uses validated identity → active own TenantMembership in
active tenant → currently effective subscription/plan/capability entitlement
where required by the existing authorization policy → active MembershipRole
→ published Role(TENANT_OWNED, same tenant) → same-tenant RolePermission →
published Permission → intersection of that permission's catalog scopes
with that particular assignment's valid scope. Never combine a permission
from one role with a scope granted only by another role. Expired/future,
inactive, foreign, orphaned or unsupported grants contribute nothing.
Validity intervals are evaluated at server time with inclusive start and
exclusive end, following existing authorization semantics. Entitlement or
grant revocation takes effect at the next evaluation.

All persisted facts for one result use one consistent PostgreSQL snapshot
(one read statement, or a read-only repeatable-read transaction) and its
server evaluation time. A mixed evaluation across grant/context changes
must not produce a successful permission projection.

The bindings come from Permission catalog 05 and approved executable
operation contracts, consumed through existing foundations. No parallel
permission-to-role/capability/scope mapping is created in React or a new
database. A permission name prefix alone cannot identify scope; some
`platform.*` permissions have expressly approved tenant scopes.

`TenantPermissionScope` preserves `scope_kind` and only its applicable
canonical structural reference:

| scope_kind | Required structural field |
|---|---|
| tenant | none |
| organizational_unit | organizational_unit_id |
| process | process_id |
| service | service_id |
| audit_engagement | audit_id |
| assigned_object | none; existing assignment policy remains required |
| owned_object | none; existing ownership policy remains required |

No platform scope, unrelated structural field, fabricated ID, wildcard or
promotion to tenant scope is allowed. Scope arrays are ordered by scope_kind
then applicable structural UUID. Map key order carries no authority.

### 3.2 Presentation eligibility and default DENY

These are effective **context permission grants for presentation**, not an
object-specific ALLOW decision. Scope constraints remain intact. Object
policy and SoD depend on the target/action and cannot be certified by a
self read with no target. There is no `allowed=true` or token authorizing
commands. Every endpoint independently revalidates identity, grants,
entitlement, permission, scope, object policy and SoD at execution. A visible
control may still receive backend DENY. This preserves the complete rector
chain without inventing a second frontend RBAC evaluator.

For `platform.role.assign`, the catalog's `platform, tenant` context union
represents the already approved 2026-09-28 MembershipRole revoke decision
(OpenAPI 02, operation matrix 03 and migration `20260928000200`). An effective
Platform grant may appear in `platform_permissions` for
`membershipRoleRevoke` with an explicit target tenant. It does not authorize
`membershipRoleAssign`: that operation still requires the actor's own active
tenant Membership, tenant-scoped grant and CORE_PLATFORM entitlement.
Tenant projection remains bound to its validated context. Neither context
authorizes PlatformRoleAssignment administration, which uses the separately
approved `platform.role.administer` contract. This clarification changes no
endpoint predicate, published Permission, grant or physical data model.

For Managed Identity presentation, only exact membership in the fresh
`platform_permissions` array may expose corresponding controls. Tenant codes
never satisfy Platform controls. Absent code, null context, empty result,
malformed response, unknown field/code or read error means DENY for affected
presentation. Role metadata is never a substitute. Neither PLATFORM_ADMIN
nor TENANT_ADMIN name checks are necessary. Tenant Admin receives no global
MI authority from its tenant role. Client alteration never authorizes MI6.

### 3.3 Freshness, caching and failures

Read during authenticated bootstrap and after session/principal or selected
tenant change. Clear the previous projection immediately on those changes,
logout, expiry or authentication/authorization failure. Discard late replies
whose initiating session/context is no longer current. Re-read on entry or
return to a privileged view, on return from a hidden tab, after known grant
or context changes and before a sensitive administrative confirmation.
Failure while refreshing clears eligibility and blocks dependent controls.
No indefinite frontend cache or periodic background authorization system is
introduced. A completed read is a snapshot; backend checks remain fresh
independently of any UI snapshot and target-specific denial.

Store only in ephemeral authenticated-session memory; never localStorage,
sessionStorage, IndexedDB, URLs, durable global state, analytics or logs as
RBAC authority. Do not embed the projection in a new credential/JWT. Both
success and error responses use `Cache-Control: no-store`; authenticated
responses vary on Authorization and X-TCDX-Tenant-Id. Dependency failure is
a redacted 503, never a successful empty/previous projection. Normal
security-denial handling remains; domain audit/outbox events are `NONE`.

## 4. Contract gates and continuity

Static gates validate OpenAPI YAML/references, the closed JSON schemas with
positive and negative synthetic payloads, matrix parity, published
permission/capability/scope bindings, type-only API definitions and rector
integrity. Contract fixtures are not evidence of implemented endpoints,
runtime provider configuration, effective human grants or QA browser flows.

MI7 end-user theme and its PASS_LOCAL evidence are preserved. MI7-R must
implement these projections and consumers under its separate authorization,
then prove frontend credential/idempotency behavior and integrated E2E.
`MULTI_PROCESS_GRC_SESSION_REVOCATION_RUNTIME_VALIDATION=PENDING_PHASE5_RUNTIME`
remains a required Phase 5 runtime gate. No release or human gate is closed
by this contract task.

## Managed Identity tenant onboarding E2E — 2026-10-07

Executable26 adds presentation binding platform.tenant_user.onboard with CORE_PLATFORM/platform only. Fresh effective Platform projection controls central tenant-user onboarding. Tenant projections, role names, email and username never authorize it; backend revalidates. Existing D3-A membershipRoleAssign/revoke scopes remain unchanged.
