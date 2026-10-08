# Human decision — centralized tenant-user onboarding

Decision ID: DR-2026-10-07-MANAGED-IDENTITY-TENANT-ONBOARDING.
Owner/approver: Andrés Barouh, Architecture Owner / QA Release Owner.
Date: 2026-10-07. Status: APPROVED_HUMAN_DECISION.
Authority: explicit STEP 23L-MANAGED-IDENTITY-TENANT-ONBOARDING-E2E packet,
sections 5–18, 21–22, 37–54; master
TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23.

The approved gap is global Managed Identity provisioning followed by optional
access to an explicitly selected existing company, and access/role administration
from an existing identity's detail. UserIdentity remains global, identified by
issuer plus stable subject. Only independent canonical Memberships carry tenant
association. Keycloak stores no GRC roles or tenant association.

Reuse analysis: tenantInitialOnboardingCreate creates a new company and its first
administrator; it cannot target an existing tenant or arbitrary roles.
membershipCreate/membershipRoleAssign require independent own-tenant authority
and cannot authorize Platform-only central onboarding. platform.role.administer
belongs to PlatformRoleAssignment; platform.user_identity.read is discovery,
not authority mutation. None has the required Platform capability. Human sections
8–11 therefore authorize tenantUserOnboardingCreate and the one new Permission
platform.tenant_user.onboard (platform / tenant_user / onboard, CORE_PLATFORM,
platform scope), granted initially only to canonical PLATFORM_ADMIN. This is the
explicit bounded addition to rector22's initial action/resource vocabulary;
no generic tenant command, grant chain, scope or physical model changes.

Read reuse: tenantList, roleList with explicit target tenant, membership reads and
membershipRoleRevoke already have Platform-specific boundaries. No existing
read lists one target identity's independent Memberships across companies;
section18 approves a minimal paginated userIdentityTenantAccessList projection
under existing platform.membership.read. It creates no Permission or grant.
Existing canonical explicit-target membershipRoleRevoke handles role removal;
the new onboarding operation adds/reconciles selected roles without removing
unselected authority. No new role-assign/revoke command is needed.

One DATA-ONLY permission/grant publication is authorized, with canonical
manifest/checksum/runner, exact pre/postchecks and DDL=0. Backend and frontend
functional changes must come from the same definitive freeze. Unchanged IAM is
reused by exact digest. Tests run with isolated fixtures; automated positive
functional QA user/tenant/Membership/role mutations, ACME repair, andres.grc
activation, R3, commit/push/merge and Phase6 are prohibited. Exact automatic
rollback of affected runtime components is authorized after retaining sanitized
candidate logs. Technical completion stops at deployed QA awaiting human
functional UI test; no human UI gate is self-approved.

Executable26 owns transport, authorization, entitlement, concurrency, partial
progress and credential custody. Existing contracts21–25 remain authoritative
outside this explicitly approved complementary operation. Traceability:
rector09/22/25/26/30/42/43/45/46 -> explicit human packet -> this record ->
executable26 + affected catalogs -> DATA-ONLY publication -> backend/frontend ->
isolated tests -> same-freeze release -> QA safe checks -> pending human test.
