# STEP 23L-TENANT-ONBOARDING-D1-R — identity discovery and initial onboarding

Status: `CLOSED_LOCAL_CONTRACT_ONLY`. Human authority: Andrés Barouh's explicit
STEP 23L-TENANT-ONBOARDING-D1-R decision. Master:
`TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23`. Sources: rector
09/22/25/28/30/31/33/35/39/40/42/43, PRE-F5E, F5D-001..004/007,
fast-track Decision B, SEED-004/006/010, executable 02/03/05/06/07/08/09/12/13/21/22/23/24,
and the TENANT_UX_E2E_AUDIT and D1 evidence. This closes G1..G5 contracts only.
G6 membership lifecycle, G7 Entra/Google implementation and G8 commercial
subscription/regulatory UX remain deferred. No runtime, SQL, migration,
implementation, build, deployment, Git publication or MI10 activation is authorized.

## 1. One Permission, two canonical authorization boundaries

`SINGLE_PERMISSION_DUAL_BOUNDARY_MODEL=SUPPORTED`.
Permission is a global definition in `iam.permissions`; it has no scope column.
`iam.role_permissions` binds the same Permission to ownership-qualified Role.
Scope is resolved from Platform authority or active tenant MembershipRole and
the endpoint's predicates. Existing membership/role/subscription-pack reads
already use one Permission in both boundaries. No new scope vocabulary.

Contract definition: `platform.user_identity.read`, domain `platform`, physical
resource_code `user_identity`, resource name `platform.user_identity`, action
`read`, capability `CORE_PLATFORM`, allowed scopes `platform` and `tenant`.
The two modes below never substitute for their respective grant chains.

Approved grants, not runtime-published:

| Role binding | RolePermission ownership / tenant | Effective boundary |
|---|---|---|
| PLATFORM_ADMIN baseline Role | PLATFORM_CONTROL / NULL | platform_search through active PlatformRoleAssignment |
| TENANT_ADMIN baseline template | PLATFORM_CONTROL / NULL | Template only; grants no tenant runtime authority by itself |
| TENANT_ADMIN Role instance for each canonical tenant | TENANT_OWNED / exact same tenant as Role | tenant_exact through active Membership, effective tenant TENANT_ADMIN, entitlement and tenant scope |

No grant to Platform Support or any other base role. The template grant is
materialized by the existing governed seed/bootstrap mechanism. The Permission
itself grants neither Membership nor authority; no direct user grants. D1-R
adds no physical row and no generated runtime projection binding. Future
data-only publication and D2 projection consumption are separate gates.

## 2. userIdentityDiscovery

`GET /api/v1/user-identities`, human-interactive authentication required;
Permission `platform.user_identity.read`. Reuse was assessed first: MI list
covers only Managed Identities and is Platform-only; membership reads cover
existing Memberships; accessGet covers self contexts; subjectList is org.Subject;
PlatformRoleAssignment reads require an already known target. None is this
directory discovery contract, so no duplicate operation is added.

Required query: `mode`, `criterion`, `value`. Unknown query/body and tenant_id
input are rejected. No body. Mode is required, not inferred from UI role names.

| Mode | Authorization and context | Query semantics | Pagination |
|---|---|---|---|
| platform_search | Active canonical PlatformRoleAssignment to PLATFORM_ADMIN, published Permission and platform scope; tenant header forbidden | criterion=display_name/email/username; active identities only; name literal substring, email/username exact presentation metadata; no empty search | page[size] 1..100 default25, page[cursor]; stable created_at DESC,user_identity_id DESC; cursor bound to mode/filter, not authority |
| tenant_exact | Active own Membership, effective TENANT_ADMIN, CORE_PLATFORM entitlement, published Permission with tenant scope, X-TCDX-Tenant-Id validated server-side | criterion=email/username only; one explicitly submitted complete exact criterion; active eligible identity only; no list/fuzzy/prefix/wildcard/autocomplete | No page parameters; at most one result; has_more=false and next_cursor=null |

Authorization precedes identity lookup. Platform Admin may use tenant_exact
only if independently satisfying the tenant chain; a Platform grant is not
tenant authority. Tenant Admin cannot gain global mode by omitting the header
or changing mode. A target tenant header is never authority proof.

`value` is 1..255 characters as in existing identity presentation fields.
Email criterion must be a complete email value and matches the canonical
`email_normalized` presentation metadata exactly. Discovery introduces no
new email normalization: it compares the already normalized stored metadata,
without domain rewriting, alias/dot/plus stripping, fuzzy or Unicode folding.
Username is an exact match to verified metadata available through the existing
Managed Identity adapter, not an identity_key. No case/diacritic folding or
partial username matching. Display-name substring is Platform-only and literal;
SQL/regular-expression wildcard interpretation is prohibited. A missing
metadata field is not manufactured from another field or a hash.

Provider metadata is taken only from an existing verifiable configured
identity-provider binding/adapter. Do not infer it from email domain or username,
or decode an opaque identity_key. Where absent, provider/provider_display are
null and UI says provider unavailable. No Entra/Google integration is added.

Canonical result and subsequent target use `user_identity_id`, backed by the
existing issuer+stable-subject identity mapping/representation. Email and
username are lookup metadata only. All targets are revalidated when creating
Membership or onboarding; a lookup result is not an authorization token.

## 3. Privacy response, audit and abuse boundary

Tenant exact mode returns HTTP200 `{items: [], meta: {has_more: false,
next_cursor: null}}` identically for no match, ambiguous matches, inactive,
ineligible or nonvisible identity. No reason/count/provider suggestions in
that response. More than one candidate never selects first/latest; ambiguity
is evaluated before truncation. Dependency/incomplete-provider visibility
must return503, not a successful empty page. Queries use bounded execution
and safe parameter binding; do not truncate ambiguity into a unique match.

One eligible unique candidate returns only canonical ID, safe display name,
verified provider/display or null, lifecycle_state=active, and an optional
existing own-tenant Membership reference. Same-tenant active Membership is
reported as existing so the UI does not create another. Conflicting/inactive
existing Membership is not silently activated; fail closed and leave G6 deferred.
No other tenant's Membership, identity status detail or directory size is exposed.
Exact matching allows confirmation of one deliberately named candidate; it
does not mathematically prevent repeated exact probes. No browse/prefix mode
exists for tenant actors; auditing and the existing approved abuse policy
remain mandatory, with no invented numeric rate threshold.

Platform mode additionally may return safe available username and normalized
email metadata. Tenant mode omits those values: the operator already supplied
the criterion. Neither mode exposes identity_key, subject, issuer, reconciliation
marker, credential/MFA metadata, tokens, provider internals or secrets.
Every response, including errors, uses no-store; identity lookup query values
must be omitted/redacted in URL/access/telemetry logging before exposing the route.

Errors use06:401 authentication;403 permission/actor/context denied (including
forbidden Platform header or missing tenant context);400 invalid mode/criterion,
shape, body or tenant pagination;429 only under existing approved limiter,
Retry-After only when known;503 audit/query/provider dependency failure.
No lookup is run on denied authorization and no foreign identity identifier
appears in an error. Responses must not distinguish hidden cases by field
error or unnecessary timing-dependent output; never claim guaranteed constant time.

Privacy audit code `audit.platform.user_identity.discover.v1`, reinforced:
actor, authority boundary, tenant for tenant mode only, operation, mode,
criterion type, internal result classification (none/unique/ambiguous/ineligible/
already_member), time, outcome and correlation. Omit the raw lookup value;
do not add a new hash/pseudonymization algorithm. Do not record hidden target
identifiers. Aggregate is the actor's canonical UserIdentity; unique visible
target may be recorded as an authorized safe reference. PLATFORM_CONTROL/NULL
for Platform; TENANT_OWNED/own tenant for tenant mode. Audit retrieval has its
own authorization; internal result classification is not returned to the caller.
Authorized privacy reads must append the required audit, failing closed if
audit cannot persist. Repetition creates another access-attempt audit, never
business authority or a domain outbox event. GET is naturally idempotent for
business state, not an excuse to suppress privacy access evidence.

## 4. Bounded initial onboarding application command

`tenantInitialOnboardingCreate`, `POST /api/v1/platform/tenants:initial-onboarding`.
It represents creation and initial administration of a new company, not a
bootstrap proxy. Existing tenantCreate remains its exact four-field primitive;
no existing production onboarding service/caller was found. A separate bounded
application command is needed. No public TENANT_BOOTSTRAP operation, path or
arbitrary target-tenant bootstrap request is defined.

`TENANT_BOOTSTRAP_PUBLIC_ENDPOINT=0` remains unchanged.
Canonical Platform actor must possess `platform.tenant.create` AND
`platform.user_identity.read` at platform scope. No tenant header/context.
No Membership, tenant role or subscription is required of the Platform actor.
No implicit grant to any other platform role. UI refetch uses its separately
approved tenant/membership/role read permissions.

Input: `tenant` is existing TenantCreateRequest; `initial_administrator` is
either `existing_identity` with canonical user_identity_id selected through
discovery, or `provisioned_managed_identity` with its canonical user_identity_id
from the preceding managedIdentityProvision result. No issuer, subject,
credentials, arbitrary role list, actor override, target tenant ID, subscription,
plan, entitlement or bootstrap flag. New-MI branch is prepared through the
existing Platform-only managedIdentityProvision operation before this command;
that branch revalidates the Platform provisioning permission and verified
Managed Identity target. Existing-identity branch can select an already
existing Zoho or Managed Identity; it creates no external IdP account or invite.

The wizard can provide one business confirmation: for new MI it first calls
managedIdentityProvision with its own key and preserves its original disclosure,
then calls this bounded command. Identity discovery/selection is completed
before tenant creation; this reduces avoidable partial companies. No external
Keycloak mutation occurs inside this command and no credential passes through
its request/response, audit or idempotency result. Every primitive remains
authorized through its approved application interface, not raw cross-domain SQL.

Sequence: reauthorize + validate selected active identity/distinct target →
tenantCreate → internal TENANT_BOOTSTRAP → safe server refetch/result.
The service invokes tenantCreate and internal bootstrap; no frontend call to
the internal function. TenantCreate and bootstrap keep their own domain audit,
idempotency and transaction semantics; the public boundary adds its own safe
receipt and completion/outcome audit without replacing those facts.

## 5. Internal first-admin and role initialization invariants

Owner of role initialization is TENANT_BOOTSTRAP, exactly as fast-track
Decision B and SEED010 require. The onboarding service invokes it after
tenantCreate; it does not duplicate it in TenantCreate or in frontend. Resolve
the exact tenant base templates and grants from SEED004/006/010, not a hardcoded
role set or UUID. Existing Role/RolePermission business keys prevent duplicates.

In one bootstrap transaction, lock the canonical tenant and inspect:
active existing tenant; active canonical target distinct from the Platform
actor; zero active TENANT_ADMIN assignments tenant-wide for a new initial
execution; no previous completed initial bootstrap for another target or
consumed prior bootstrap; zero duplicate active Memberships for target+tenant;
base roles/grants exactly valid or atomically initializable; exactly one
canonical tenant-own TENANT_ADMIN Role. Create/reuse the unique active target
Membership and create/reuse exactly one tenant-scope TENANT_ADMIN assignment.
No other automatic role, PlatformRoleAssignment or actor Membership side effect.

Successful same-onboarding/tenant/version/target replay returns existing
results and never initializes another administrator. This is the explicit
completed-replay exception to zero-active-first-execution. Another target,
ambiguous role/grant/Membership/history or actor==target fails closed. Revoking
the first administrator later does not reopen bootstrap; lifecycle remains G6.
Existing inactive/conflicting Membership is not autoactivated here.

Bootstrap catalog+Membership+role+reinforced privileged-use audit are one ACID
transaction. Failure creates none of those partial authority rows. Existing
internal audit `audit.iam.application_token.privileged_use.v1` records operation
TENANT_BOOTSTRAP and safe target/result references; a genuine internal retry
may record replayed privileged-use evidence with no second authority. No use
of consumed FIRST_PLATFORM_ADMIN_BOOTSTRAP/F5D007 authority.

The current function lacks the tenant-wide first-admin and distinct-target
guards and the production caller: those are D2 work, not facts repaired here.
ACME's zero roles/admin are evidence of absent production integration, not
proof of a legacy model. Baseline42/SEED010 govern exact22 tenant roles;
stale count prose in physical RBAC08 is not a new role authority.

## 6. Idempotency, partial results and recovery

Public command requires Idempotency-Key, Platform+actor+operation binding,
v1 canonical fingerprint of tenant input and initial administrator choice.
Claim/reference uses only existing ops_audit.idempotency_records result_ref
metadata and canonical records. No workflow table, tenant bootstrap_state,
application entity or second authority. Receipt/progress are transport values.
Persist nonsecret references/checkpoints atomically with each completed GRC
step. Child tenantCreate has its own operation-bound key; reuse the parent key
under the child's different operation binding, never adopt unrelated tenant by
code/email/name. Key collision with a different child intent fails409.

Same key+same fingerprint continues only pending work under canonical claim
and tenant locking. An actively locked in-flight attempt returns409 RESOURCE
retryable; uncertain unlocked progress is reconciled against its own canonical
child result, audit/idempotency and references before resuming. Parent receipt
cannot claim completion while bootstrap is pending. Parent/child completion
and checkpoint writes must leave no crash window where a created tenant is
unrecoverably unbound. D2 proves the lock/crash boundaries before release;
it cannot introduce a lease/schema workaround. Same key+different input409
IDEMPOTENCY, no mutation. Completed replay returns safe receipt, no second
material effect/audit/outbox. Reference metadata is not RBAC authority.

Only a tenant created by this exact operation/claim can be resumed internally.
Request never accepts arbitrary existing tenant ID. A new key cannot pick up
an unrelated or prior partially-created tenant. ACME recovery/initialization
would require a separate governed packet; it is not enabled by this contract.

Complete response201: tenant, target identity, Membership and initial assignment
safe references and completed steps. Replay has Idempotency-Replayed and no
secret. Partial failure keeps original HTTP/error taxonomy (400/403/404/409/
422/503 as applicable), with allowlisted details.onboarding_progress containing
only authorized safe references and completed/pending step names. Do not return
201 or fake rollback. Refetch canonical state and offer «Continuar alta inicial»
using the same intent/key internally. No raw technical IDs required of operator.

Tenant creation succeeded, bootstrap failed: keep tenant; show company created,
administrator pending; resume only bootstrap after reconciliation. Existing
primitive tenantCreate calls remain valid but are not falsely declared a
completed initial onboarding; their integration/recovery is not an arbitrary
target bootstrap API. Identity selection/provisioning normally precedes this
command; if UI/provider fails after identity success, keep identity and report
tenant onboarding incomplete. Never delete valid identity/tenant as compensation.

MI credential is disclosed once by the original authorized MI HTTPS operation,
volatile memory only. Never redisclosed on retry, stored in localStorage/
sessionStorage/IndexedDB, audit/logs or wrapper. Continuing company/admin work
reuses only safe canonical references, not another provisioning call. Lost or
uncertain delivery requires the separately governed MI recovery/password-reset
packet; no original recovery or reset is executed here.

New parent audit `audit.platform.tenant_initial_onboarding.create.v1` records
actor Platform context, operation, tenant/initial-user safe references when
created, steps completed/pending, server timestamp, outcome and correlation.
Ownership PLATFORM_CONTROL, tenant_id NULL; target tenant is payload/aggregate
reference, never actor tenant context. Reinforced; no new domain outbox event:
tenantCreate retains its existing platform.tenant.provisioned.v1 event.
Failed/denied authorized attempts have safe outcome evidence; replay of a
completed material fact does not recreate the success audit.

## 7. Subscription ordering and subsequent users

Initial Platform tenant creation, Managed Identity provisioning and internal
bootstrap do not require Subscription, by their existing Platform contracts.
This is a governed initial authority path, not an entitlement bypass for tenant
commands. Platform subscriptionCreate targets an existing tenant independently
and requires no Tenant Admin Membership, so no circular dependency exists.

After first admin is established, normal MembershipCreate and membershipRoleAssign
require active own Membership, active Subscription/PlanVersion granting
CORE_PLATFORM, tenant permissions, scope and object policy/SoD. User management
does not additionally require a regulatory pack/norma. A bootstrap-completed
company without entitlement is reported as initial admin established, commercial
enablement pending, not operationally ready. G8 implementation remains deferred.

Tenant Admin existing-person flow: own context → tenant_exact discovery → select
canonical target → roleList tenant-own catalog → membershipCreate → zero or
more independent membershipRoleAssign → server refetch. Existing own Membership
is reused rather than recreated. A person with no assigned role remains
incorporated without operational authority; UI cannot report permission success
solely because Membership exists. No grant based on frontend or provider role.

Membership succeeds but role fails: preserve Membership, report roles pending,
retry only missing assignments with their own operation/target/role/scope key
and refetch. Changes of operator reauthorize and reconcile, never copy actor
binding to impersonate. No generic transaction/composite API for subsequent
members. No optimistic authority or automatic rollback/revoke.

Tenant Admin new-MI flow: display the Platform-only credential boundary;
Platform Admin provisions the named person through existing MI UI and delivers
credential personally; Tenant Admin explicitly exact-searches the now-existing
identity and completes Membership/roles. No request/approval subsystem, technical
ID handoff, secret handoff to Tenant Admin or platform.managed_identity.create
grant to tenant role is introduced.

## 8. Business UX and implementation gates

Platform: Empresas → Crear empresa → Datos de empresa → Administrador inicial
and identity method (existing/new MI) → Resumen → Confirmar. One business
wizard, truthful independent canonical results; no UUID/issuer/subject input,
Keycloak UI or arbitrary first-role selector. First role is fixed TENANT_ADMIN.
Company result offers authorized read and handoff to initial admin, never
implicit tenant membership for Platform actor.

Tenant: Empresa → Usuarios → Agregar usuario → existing person (complete
criterion then explicit lookup, select, runtime tenant roles, confirm/refetch)
or new MI (explicit Platform handoff). No search-as-you-type, show-all, prefixes,
global suggestions or wildcard. None/hidden/ambiguous result says «No hay una
identidad elegible para incorporar con ese criterio» without revealing cause.
Rows represent Membership with safe person presentation; global identity enabled
and tenant Membership active are different statuses. No extra auth/MFA metadata
without its own authorized read. MANUAL_USER_ID_REQUIRED_TARGET=NO.

Preserve approved visual v1.0; no frontend change or human visual PASS here.
D2 is a separate implementation packet after local contract gates. Runtime
Permission publication is a separately authorized data-only step (one definition,
Platform grant, Tenant Admin template and correct tenant instances only) with
before/after count/scope/audit verification. The future data plan creates one
Permission definition, one PLATFORM_ADMIN template grant, one TENANT_ADMIN
template grant and one grant per already-existing canonical TENANT_ADMIN tenant
Role. It does not create missing tenant Role instances, initialize ACME or add
Membership/role assignments. New tenant instances later inherit the approved
grant only through SEED010 after publication. Count targets are168→169 Permission
rows and2+N new RolePermission bindings where N is the authorized preflight count
of existing canonical tenant TENANT_ADMIN Roles. Natural keys prevent duplicates;
all other grants and schema remain unchanged. Publication requires its own
authorized audit/verification and is not executed here. No historical seed/SQL rewrite,
migration28, role publication, schema or QA mutation in D1-R. Runtime168 remains
unchanged and new Permission count0; until actual authorized publication and
implementation, default DENY applies to both new operations.
