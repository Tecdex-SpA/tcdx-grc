# Platform tenant-user onboarding — approved complementary contract

Authority: Andrés Barouh's STEP 23L-MANAGED-IDENTITY-TENANT-ONBOARDING-E2E
packet and DR-2026-10-07-MANAGED-IDENTITY-TENANT-ONBOARDING. Master:
TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23. No schema change.

## Command and boundary

tenantUserOnboardingCreate: POST /api/v1/platform/tenants/{tenant_id}/users:onboard.
Authenticated HUMAN_INTERACTIVE canonical active identity -> active
PlatformRoleAssignment -> published PLATFORM_CONTROL Role -> matching
RolePermission -> published platform.tenant_user.onboard -> platform scope;
PLATFORM_ADMIN object predicate and default DENY. Support and Tenant Admin are
denied. Tenant header is forbidden403; body/query target overrides are400.
Path tenant UUIDv7 and body user_identity_id UUIDv7 are mandatory. Closed body:
user_identity_id, tenant_role_codes (unique nonblank codes, may be empty for
Membership-only onboarding), reason (trimmed nonempty, maximum2000). Codes use
the existing Role role_code maximum128. No identity_key, email, username,
credentials, issuer, actor, subscription, scheduling or bootstrap input.
Idempotency-Key is nonblank, maximum255. No invented TTL.

Target tenant must exist and be active; canonical UserIdentity must exist and be
active, distinct from actor. This operation creates no UserIdentity. Subsequent
user onboarding always requires target tenant's current CORE_PLATFORM entitlement
through active Subscription/PlanVersion/Entitlement/Capability. Missing entitlement
returns TCDX.AUTHORIZATION.DENIED403 with safe UI guidance. Initial new-company
onboarding remains executable25, including its no-subscription exception; this
command neither calls bootstrap nor initializes/repairs missing base roles.

Roles resolve by code from target tenant's published TENANT_OWNED runtime catalog.
Global templates and Platform functional role family are forbidden. Missing,
ambiguous or nonassignable roles fail closed. Existing active Membership is reused;
inactive/ended/conflicting history is not reactivated (G6 remains deferred).
Only requested tenant-wide roles are added/reconciled. Existing unselected/scoped
roles remain. Duplicate active or future overlapping tenant-wide assignments fail
closed; one existing active assignment is reused. Closed history can receive a new
assignment only under a new intent. Actor receives zero Membership/tenant role.
No Keycloak access or credential input/output is part of this command.

## Transactions, concurrency, replay and truthful partial failure

Platform ownership/null tenant binds actor+operation+key; canonical SHA256
fingerprint includes exact target tenant, canonical identity, sorted role codes
and normalized reason. Same key/different intent409 TCDX.CONFLICT.IDEMPOTENCY.
A nonblocking session advisory lock serializes the same actor/operation/key;
concurrent same-intent use returns409 retryable rather than repeating work.
Every child READ COMMITTED transaction locks the target tenant, then revalidates
current Platform authority, target identity, entitlement and role eligibility.
Canonical tenant/Membership/role constraints remain defense in depth.

First child commits Membership create/reuse, its material audit/outbox when new,
and a safe durable progress receipt in existing ops_audit.idempotency_records.
Each requested role has its own transaction: validate/reconcile exact Membership,
role and prior acknowledged assignments, create/reuse one assignment, persist
material audit/outbox when new, update durable progress. Failure rolls back only
that child. Prior committed Membership/roles remain. A retry of the SAME original
intent/key resumes only pending roles; acknowledged results are reconciled and
never silently regranted after later lifecycle change. No distributed transaction,
identity rollback, automatic credential retry or secret redisclosure is claimed.

Completion audit + privileged-use audit + completed idempotency receipt commit
atomically. Response201 is closed TenantUserOnboardingResult with tenant_id,
user_identity_id, membership_id, completed_roles [{role_code,membership_role_id}],
pending_role_codes=[]; completed replay returns original result/hash with
Idempotency-Replayed=true, after current authorization/target/entitlement checks,
without regrant/audit. Safe errors may include only tenant_user_onboarding_progress
with the same references and pending codes; UI must distinguish identity-created/
access-pending and Membership-created/roles-pending. Audit failure is503 fail-closed.
Never fabricate success from local state; UI refetches server Membership/roles.

Outcome audit audit.platform.tenant_user.onboard.v1 uses PLATFORM_CONTROL/null,
canonical actor, safe target tenant/identity/Membership references, reason,
completed/pending role codes, correlation and success/denied/failure. No raw input
on denied validation, no secrets. Denied administrative use is audited against
actor without hidden-target disclosure. Reuse does not duplicate authority or
material child events. New Membership and role children retain canonical
TENANT_OWNED audit.platform.membership.create.v1 / audit.platform.role.assign.v1
and iam.membership.created.v1 / iam.role.assigned.v1 with exact target tenant.

Errors:400 malformed;401 unauthenticated;403 authority/self/entitlement/Platform
role denial;404 absent target/role;409 lifecycle/ambiguity/overlap/idempotency;
503 dependency/audit. All responses/errors no-store. No new business error code.

## Read and role management reuse

userIdentityTenantAccessList: GET
/api/v1/platform/user-identities/{user_identity_id}/tenant-access.
Existing platform.membership.read plus PLATFORM_ADMIN object predicate, Platform
chain only; no tenant header/body/target override. Canonical target exists or404,
including inactive target for inspection. REPEATABLE READ / READ ONLY snapshot.
Existing keyset page[size]1..100/default25 and page[cursor], sorted Membership
created_at DESC/id DESC, cursor bound to target. Projection: Membership canonical
ID/tenant/identity/state/joined_at/ended_at, tenant display_name/code/lifecycle_state,
active published same-tenant Role assignments with canonical code/name/scope/
validity/ETag. No provider key, credential, secret or external identity metadata.
No mutation/audit/event on this ordinary administrative read.

Companies and Role catalog reuse tenantList and GET /api/v1/roles?tenant_id=...
with existing Platform read permissions and omitted tenant header. UI accepts
only target TENANT_OWNED published roles, excludes Platform family; backend
command revalidates. Never hardcode the22 tenant roles. Membership+role reads
remain independent effective permissions. Removal reuses membershipRoleRevoke
with fresh platform.role.assign, explicit tenant query, exact assignment derived
from the selected Membership, reason, If-Match and stable idempotency key. It
preserves executable23/D3-A: membershipRoleAssign remains tenant-only.

## UI and credential custody

MI provisioning remains existing separate operation. Company is optional and
selected only after successful identity provisioning/one-time disclosure.
Operator may finish with identity only or add tenant access; identity result is
retained in component memory without credential redisclosure/reprovisioning.
Credential remains visible until explicitly dismissed/closed, never stored in
local/session storage, logs, evidence or automated screenshots. Existing identity
detail has separate Acceso a empresas and Roles de plataforma. Current permissions
are checked again before confirmation; projection is presentation only.
Tenant Admin existing identity flow is unchanged and cannot provision MI.
Zoho-specific invitations remain explicitly labeled and separate from Agregar
usuario; Entra/Google availability is not invented. Existing visual baseline,
local logo, branding, keyboard/focus and responsive language remain in force.

## Publication and release

One DATA-ONLY migration after current migration20261006000200 publishes exactly
platform.tenant_user.onboard (domain platform/resource tenant_user/action onboard)
and exactly one PLATFORM_ADMIN RolePermission; other grants0; DDL0, tables235,
permissions169->170, ledger28->29, schema unchanged. Canonical generator/manifest/
seed registry consume this additive publication; historical bytes remain exact.
Required local security, PostgreSQL, UI/E2E and static gates precede publication.
Backend+frontend build from same definitive two-export freeze; unchanged IAM
reused. No positive functional QA mutation; human functional test pending.
