# PRE-F5E Platform IAM, administrative contracts and token boundary

| Field | Value |
|---|---|
| Human authority | PRE-F5E F5D-001/002/003/007 decisions approved 2026-09-23; F5D-004/005/006 closures preserved |
| Master regent | `TCDX_GRC_MASTER_REGENT_BASELINE_v1.6_2026-09-23` |
| Rector source | exact checksummed candidate preserved under `docs/rector/candidates/` |
| Variation budget | `ZERO` |
| Database impact | candidate 230-table model; one new IAM relation; QA/runtime unchanged |
| Status | `PRE_F5E_PASS` |

This contract records the activated PRE-F5E authority. It does not execute the migration in QA, implement runtime authentication/backend/frontend, deploy or change infrastructure.

## 1. Rector reconciliation of Platform authority

The historical v1.5 baseline exposed F5D-001 because its only human grant chain required TenantMembership. The 2026-09-23 human activation rejects both a runtime allowlist and a fake/platform tenant and authorizes the missing persisted IAM relation. Active v1.6 publishes two explicit paths:

```text
Platform:
authenticated UserIdentity
-> active PlatformRoleAssignment
-> Role(PLATFORM_CONTROL)
-> RolePermission -> Permission
-> platform scope -> ObjectPolicy -> SoD
-> ALLOW / default DENY

Tenant:
authenticated UserIdentity
-> active TenantMembership
-> commercial entitlement
-> active MembershipRole -> Role -> RolePermission -> Permission
-> tenant/object scope -> ObjectPolicy -> SoD
-> ALLOW / default DENY
```

`iam.platform_role_assignments` is the only persisted human Platform-grant relation. It references the existing UserIdentity and Role catalogs, has no tenant/membership, carries validity, creator audit fields and a fixed `PLATFORM_CONTROL` discriminator enforced through CHECK plus composite Role FK. No person-specific assignment is seeded. Exact external `issuer + stable subject` remains the identity key used to resolve UserIdentity, never a parallel grant authority.

Grant assignment/revocation must emit reinforced `audit.iam.platform_role_assignment.assign.v1` / `audit.iam.platform_role_assignment.revoke.v1` evidence. PRE-F5E does not invent their administration endpoint; that runtime/admin operation remains a later explicitly authorized dependency.

```text
F5D_001_PLATFORM_AUTHORITY=CLOSED
PLATFORM_AUTHORITY_SOURCE=UserIdentity->PlatformRoleAssignment->Role(PLATFORM_CONTROL)->Permission->platform_scope->ObjectPolicy->SoD
PLATFORM_AUTHORITY_IDENTITY_KEY=canonical_UserIdentity_resolved_from_issuer+stable_subject
TENANT_AUTHORITY_SOURCE=UserIdentity->TenantMembership->MembershipRole->Permission->Scope/ObjectPolicy/SoD
NO_FAKE_TENANT=PASS
NO_PLATFORM_TENANT=PASS
NO_EMAIL_BASED_PRIVILEGE=PASS
```

Formal rector authority is active. Until separate migration and runtime authorization, the runtime remains fail-closed.

### 1.1 First Platform Admin Bootstrap

F5D-007 closes the initial zero-authority transition through one internal command contract:

```text
FIRST_PLATFORM_ADMIN_BOOTSTRAP
validated HUMAN_INTERACTIVE TCDX principal
-> canonical authenticated UserIdentity
-> exact published baseline Role(PLATFORM_ADMIN, PLATFORM_CONTROL, tenant_id=NULL)
-> exclusive row lock on that canonical Role
-> zero active PlatformRoleAssignment AND zero historical PlatformRoleAssignment
-> atomic PlatformRoleAssignment + reinforced AuditEvent
-> COMMIT once / every later attempt DENY
```

The active predicate at the transaction's single server time is `valid_from <= transaction_timestamp()` and `(valid_to IS NULL OR valid_to > transaction_timestamp())`. Zero historical rows is an additional fail-closed one-time guard: revoking the first grant cannot make bootstrap available again.

All attempts execute at PostgreSQL `READ COMMITTED`, resolve exactly one `PLATFORM_ADMIN` baseline role by canonical code (never a hardcoded UUID), acquire `SELECT ... FOR UPDATE` on that same row, and only then re-evaluate identity, role and assignment predicates. The second concurrent transaction waits, receives a fresh post-lock statement snapshot, observes the committed assignment and DENY. Catalog ambiguity, absent role, unexpected ownership/lifecycle, an existing row, or any database/audit error also DENY and rollback.

The target is the authenticated canonical `UserIdentity` itself. The command has no caller field for email, issuer/subject, tenant, membership or arbitrary `role_id`; it cannot create `PLATFORM_SUPPORT`, another Platform role, a tenant/custom role, identity, membership, tenant or credential. It persists `audit.iam.platform_role_assignment.bootstrap.v1` in the same transaction with canonical actor/target, resolved role, server-owned timestamp, correlation, required justification and outcome. It creates no bootstrap table, enabled flag, personal seed, environment allowlist, second authority or public endpoint.

Repository inspection found no existing internal administrative command/CLI boundary suitable for a minimal implementation without adding runtime architecture. Therefore PRE-F5E publishes the complete semantic/transaction contract but deliberately leaves the executable ceremony for the next authorized runtime/security stage:

```text
F5D_007_FIRST_PLATFORM_ADMIN_BOOTSTRAP=CLOSED
BOOTSTRAP_RUNTIME_IMPLEMENTED=0
BOOTSTRAP_RUNTIME_SURFACE=NONE
BOOTSTRAP_SECOND_USE=DENY
BOOTSTRAP_PUBLIC_ENDPOINT_CREATED=0
```

## 2. TCDX application access-token boundary

The external IdP proves identity only. The protected TCDX GRC API accepts only a TCDX application access token issued after the validated external identity resolves to a canonical `UserIdentity`.

```text
External Authorization Code + PKCE
-> validate external identity proof
-> resolve exact (issuer, stable subject) to UserIdentity
-> TCDX token issuance boundary
-> short-lived TCDX application access-token JWT
-> protected TCDX GRC API
```

### 2.1 JWT profile

- `iss` is an exact TCDX runtime-security configuration value. Missing or mismatched issuer fails closed.
- `aud` includes the exact configured TCDX GRC API audience. Missing or mismatched audience fails closed.
- signing is asymmetric. Verification accepts only an explicitly configured safe algorithm allowlist and never an algorithm supplied as authority by the token itself.
- private signing keys remain in external secret/key custody and are never stored in Git, the browser or the GRC system-of-record database.
- public verification keys are published or referenced through an authenticated, rotatable mechanism; verifier cache behavior must preserve fail-closed rotation and revocation policy.
- `sub` is the canonical stable `iam.user_identities.user_identity_id`; it is never email or a provider-specific business identifier.
- `jti`, `iat` and `exp` are mandatory. `exp` must be later than `iat` and the resulting lifetime must be positive, short and no greater than the human-approved runtime maximum. Absence of that configured maximum blocks issuance.
- `nbf`, when required by the approved runtime temporal policy, is validated with the same bounded clock-skew policy as `iat`/`exp`; no concrete duration or skew is fixed in Git by PRE-F5E.
- `principal_class=HUMAN_INTERACTIVE` is mandatory and exact.
- selected tenant, tenant header, membership, roles, permissions and provider access-token claims are not identity proof and are not embedded as authorization authority.

The external access token, external `id_token` and any opaque provider token are prohibited as TCDX API bearer credentials. The API bearer scheme in artifact 02 denotes the TCDX application JWT only.

### 2.2 Browser delivery, session and revocation

After a successful authenticated callback, browser delivery may return only the TCDX application access token. External access/refresh tokens, the external `id_token`, signing secrets and private keys are never delivered as API credentials. Tokens must not be placed in URL query, fragment, referrer-visible data or logs.

Logout terminates the local application session, removes the browser-held TCDX credential and revokes its `jti` until `exp`. Revocation state is protected runtime-security state outside the canonical GRC system of record; it does not create a GRC table or entity. Every API verifier checks signature and claims and also applies the current revocation/session policy before authorization. Missing or unavailable required revocation state fails closed for affected tokens.

The provider-specific authorization/callback route and claim adapter remain runtime-security configuration. PRE-F5E does not publish a provider-specific GRC domain endpoint and does not implement the callback.

### 2.3 Authorization and audit after token validation

For tenant-owned operations, `X-TCDX-Tenant-Id` selects only a candidate context. The backend proves an active membership for the canonical `sub` and then resolves entitlement, role, permission, scope, object policy and SoD. Platform operations remain blocked at the Platform grant step described in section 1 until the rector conflict is resolved.

Security boundary audit codes are:

- `audit.iam.application_token.issue.v1`;
- `audit.iam.application_token.privileged_use.v1`;
- `audit.iam.application_token.revoke.v1`.

Their payloads contain canonical actor ID, outcome, correlation, runtime issuer/key fingerprints and a non-reversible `jti` fingerprint where needed; they never contain a token, signing key, provider secret or raw external credential. Privileged use means successful or denied platform/admin-sensitive use, not indiscriminate duplication of every ordinary request audit.

```text
F5D_006_APPLICATION_TOKEN=CLOSED
EXTERNAL_IDP_TOKEN_AS_API_BEARER=0
ID_TOKEN_AS_API_BEARER=0
OPAQUE_TOKEN_AS_API_BEARER=0
TCDX_APPLICATION_TOKEN_CONTRACT=JWT_ASYMMETRIC_RUNTIME_CONFIGURED
```

## 3. Administrative write contracts

### 3.1 `tenantCreate`

The 2026-09-23 decision fixes `lifecycle_state=active` and initial `data_classification=confidential`, both server-owned. Classification is restricted to the versioned Platform vocabulary `public | internal | confidential | restricted`.

`TenantCreateRequest` accepts exactly `tenant_code`, `legal_name`, `display_name` and IANA `default_timezone`. It rejects tenant ID, lifecycle, classification, actor, audit and technical timestamps. `TenantProjection` returns the minimal persisted business state.

```text
F5D_002_TENANT_CREATE=CLOSED
TENANT_INITIAL_LIFECYCLE_STATE=active
DATA_CLASSIFICATION_VOCABULARY=public,internal,confidential,restricted
TENANT_INITIAL_DATA_CLASSIFICATION=confidential
TENANT_CREATE_SCHEMA=TenantCreateRequest->TenantProjection
```

### 3.2 `membershipCreate`

The operation materializes a membership only for an existing canonical `user_identity_id`. Tenant, generated ID, joined/created timestamps and actor/audit metadata are server-owned; email, invitation, password, external identity creation and automatic role assignment are prohibited.

The 2026-09-23 decision fixes `membership_state=active`, server-owned. `MembershipCreateRequest` contains only `user_identity_id`; `TenantMembershipProjection` returns the generated membership, validated tenant context, canonical identity, active state and server joined time. An active membership alone grants no Permission.

```text
F5D_003_MEMBERSHIP_CREATE=CLOSED
MEMBERSHIP_INITIAL_STATE=active
MEMBERSHIP_CREATE_SCHEMA=MembershipCreateRequest->TenantMembershipProjection
```

### 3.3 `membershipRoleAssign`

Artifact 02 publishes the closed `MembershipRoleAssignRequest` and minimal `MembershipRoleAssignmentProjection`:

- membership is path-derived and tenant is validated from `X-TCDX-Tenant-Id`;
- caller supplies an existing same-tenant `role_id` and one existing RBAC `scope_kind` other than `platform`;
- structural scope IDs use only the existing physical discriminants `organizational_unit_id`, `process_id`, `service_id` and `audit_id`;
- `tenant`, `assigned_object` and `owned_object` carry no invented target field and are resolved by existing policy/relationships;
- `valid_from` is server time and is not exposed as caller input because no active contract authorizes future scheduling;
- optional `valid_to` is the existing canonical/physical validity endpoint and must be later than server-derived `valid_from`;
- `PLATFORM_CONTROL` roles are rejected before persistence; actor and technical timestamps are server-owned.

```text
F5D_004_MEMBERSHIP_ROLE_ASSIGN=CLOSED
MEMBERSHIP_ROLE_ASSIGN_SCHEMA=MembershipRoleAssignRequest->MembershipRoleAssignmentProjection
```

## 4. Tenant-context discovery

`GET /access/me` retains `operationId: accessGet`, authenticated-context permission and no required tenant header. Its `EffectiveAccess` response includes `available_tenant_contexts`, built only from the authenticated canonical `UserIdentity`'s active memberships in active tenants.

Each context contains only `tenant_id`, canonical `tenant_display_name`, `tenant_membership_id`, `membership_state` and a deduplicated minimal `effective_role_codes` summary. Results are ordered by `tenant_display_name ASC, tenant_id ASC`. The bounded own-membership collection is complete and unpaginated; it never enumerates global tenants, other users' memberships or permissions. A supplied/selected tenant is not identity proof.

```text
F5D_005_TENANT_CONTEXT_DISCOVERY=CLOSED
TENANT_CONTEXT_DISCOVERY=GET_/access/me.available_tenant_contexts
```

## 5. Provider neutrality and future managed identity

External human identity remains exactly `issuer + stable subject`; email is an attribute. Provider-specific endpoints and claim mappings are runtime adapters and never enter `UserIdentity`, TenantMembership or RBAC semantics. No provider registry is created.

A future TCDX Managed Identity remains an external OIDC identity service. Passwords, password hashes, MFA/recovery secrets and credential material are prohibited from the GRC model and converge through the same external-proof/TCDX-token boundary.

```text
MULTI_IDP_SEMANTICS=PRESERVED_ISSUER_SUBJECT
TCDX_MANAGED_IDENTITY_DB_IMPACT=0
PASSWORD_COLUMNS_ADDED=0
PASSWORD_HASH_COLUMNS_ADDED=0
MFA_SECRET_COLUMNS_ADDED=0
PARALLEL_IAM_SCHEMA_CREATED=0
```

## 6. Gate

```text
PRE_F5E=PASS
RECTOR_GATE=PASS
F5D_BLOCKERS_CLOSED=7
F5D_BLOCKERS_OPEN=0
DATABASE_TABLES=230
DATABASE_SCHEMA_CHANGED=1
MIGRATION_CREATED=1
MIGRATION_ID=20260923000100
PHYSICAL_MODEL_CHANGED=1
TECHNICAL_DEBT_INTRODUCED=0
```
