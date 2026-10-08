# TCDX GRC — PRE-F5D Platform IAM and administrative-contract reconciliation

## Authority and boundary

| Field | Evidence |
|---|---|
| Continuity base | `main` at `bb24f5b18e5fcbf1ddc34004c9eb41bf2804eb4c` |
| Working branch | `governance/pre-f5d-platform-iam-contract-reconciliation` |
| Master regent | `TCDX_GRC_MASTER_REGENT_BASELINE_v1.5_2026-09-16` |
| Variation budget | `ZERO` |
| Allowed mutation | governance/executable-contract evidence and focused contract tests only |

This is a local reconciliation candidate prepared under the PRE-F5D task packet. It is not a human Decision Record and does not approve a physical-model amendment, executable-contract amendment, runtime implementation or deployment.

## A — Platform Admin physical binding

The conceptual platform role and its permissions are published, but no physical human-to-platform-role binding exists:

- `iam.roles` is mixed ownership and the seeded `PLATFORM_ADMIN` row is `PLATFORM_CONTROL` with no tenant.
- `iam.role_permissions` can hold the corresponding platform grants without a tenant.
- the only human role-assignment table is `iam.membership_roles`; it is profile `TI / TENANT_OWNED` and requires both `tenant_id` and `tenant_membership_id`.
- `iam.tenant_memberships` itself requires `tenant_id` and expresses only `UserIdentity N--N Tenant`.
- the approved eight IAM entities contain no `UserIdentityRole`, platform membership or equivalent binding.
- `iam.impersonation_sessions.platform_actor_user_identity_id` records an already-authorized actor; it is not a grant and cannot bootstrap permission.

Therefore neither role resolution, first-admin provisioning, revocation nor bootstrap audit can be materialized without inventing a physical authority. Environment variables, email allowlists, issuer/subject allowlists, service principals, configuration files and fake tenants are not approved substitutes.

```text
PLATFORM_ADMIN_CONCEPTUAL_ROLE=PUBLISHED
PLATFORM_ADMIN_PERMISSION_GRANTS=PUBLISHED
PLATFORM_ADMIN_PHYSICAL_BINDING=BLOCKED_MODEL_GAP
PLATFORM_ADMIN_RUNTIME_MATERIALIZATION=PROHIBITED
NO_FAKE_TENANT=PASS
NO_PLATFORM_TENANT=PASS
```

## B — Published administrative operations

The operation matrix already fixes paths, operation IDs, permission/scope, idempotency, audit, events and persistence. The wire schemas cannot be closed from physical columns alone because the missing choices affect behavior and security.

| operation | already fixed | unresolved mandatory authority | result |
|---|---|---|---|
| `tenantCreate` | `POST /platform/tenants`; `platform.tenant.create`; platform scope; no tenant header; keyed idempotency; reinforced audit; provisioned event | exact request/response projection; initial lifecycle; classification vocabulary/default; which nontechnical fields are caller inputs versus governed server values | `BLOCKED_EXECUTABLE_CONTRACT` |
| `membershipCreate` | `POST /memberships`; selected tenant from authenticated header; `platform.membership.create`; tenant scope; audit/event/idempotency | create versus invite/materialize semantics; canonical identity selector; initial membership state; joined-time authority; exact response projection | `BLOCKED_EXECUTABLE_CONTRACT` |
| `membershipRoleAssign` | `POST /memberships/{membership_id}/role-assignments`; selected tenant/path membership; `platform.role.assign`; same-tenant role/scope; audit/event/idempotency | exact scope discriminated union; client versus server authority for `valid_from`; optional expiry rules; exact response projection | `BLOCKED_EXECUTABLE_CONTRACT` |

`tenant_id` is not accepted in any body. Membership ID remains path-derived. Actor, timestamps, technical IDs, audit metadata and tenant context cannot be browser assertions. The three operations retain `DomainCommandRequest` until the listed human decisions are approved; a placeholder must never be reported as a closed schema.

```text
TENANT_CREATE_SCHEMA=BLOCKED_EXECUTABLE_CONTRACT
MEMBERSHIP_CREATE_SCHEMA=BLOCKED_EXECUTABLE_CONTRACT
MEMBERSHIP_ROLE_ASSIGN_SCHEMA=BLOCKED_EXECUTABLE_CONTRACT
```

## C — Membership and tenant-context discovery

No published operation unambiguously returns the authenticated identity's active memberships with tenant display name, membership state and effective role summary. `accessGet` exists at `GET /access/me`, but its published shape remains only `AccessQuery -> EffectiveAccess`; it does not decide that it is the discovery operation or fix a dedicated permission, response fields, ordering or pagination.

The browser may not enumerate global tenants and no new endpoint is inferred.

```text
TENANT_CONTEXT_DISCOVERY=BLOCKED_EXECUTABLE_CONTRACT
MISSING_DECISIONS=PATH_OR_ACCESSGET_SEMANTICS,OPERATION_ID,PERMISSION,RESPONSE_SHAPE,PAGINATION
```

## D — Application access-token boundary

The active authentication contract requires the protected-API bearer access token itself to be a JWT validated for issuer, audience, signature/JWKS, algorithm, expiry, not-before, token type and principal class. It does not authorize the OIDC `id_token` as API bearer and does not authorize opaque access tokens.

The current contracts do not define an internal TCDX token issuer. A future decision would have to close, at minimum, all of these inseparable points before implementation:

- TCDX issuer and API audience;
- asymmetric signing-key custody, publication and rotation;
- canonical `sub` binding and token ID;
- short lifetime and time-claim policy;
- separation of identity proof from selected tenant context;
- browser delivery/exchange boundary without a browser client secret or URL token;
- session, logout and revocation semantics;
- issuance/use/revocation audit events and error contract;
- explicit separation between external IdP validation and internal API-token validation.

No choice among those alternatives is made here.

```text
ID_TOKEN_AS_API_BEARER=PROHIBITED
OPAQUE_ACCESS_TOKEN_AS_API_BEARER=PROHIBITED_FAIL_CLOSED
APPLICATION_TOKEN_ISSUANCE=BLOCKED_PENDING_ARCHITECTURE_DECISION
```

## E — Multi-IdP invariant

The reconciled boundary preserves provider neutrality:

```text
EXTERNAL_IDENTITY_KEY=provider_issuer+stable_subject
EMAIL_ROLE=ATTRIBUTE_NOT_PRIMARY_IDENTITY
CORE_GRC_PROVIDER_DEPENDENCY=NONE
TENANT_MEMBERSHIP_PROVIDER_DEPENDENCY=NONE
RBAC_PROVIDER_DEPENDENCY=NONE
PROVIDER_REGISTRY_TABLE_CREATED=0
MULTI_IDP_SEMANTICS=PRESERVED_ISSUER_SUBJECT
```

Concrete issuer URLs and provider values are runtime security configuration, not `UserIdentity`, TenantMembership or RBAC semantics. This candidate adds no provider registry and does not implement another IdP.

## F — Future managed identity constraint

Clients without a corporate IdP remain behind the same external OIDC boundary. A future TCDX Managed Identity is an external identity provider; credentials are not persisted in the GRC system of record.

```text
TCDX_MANAGED_IDENTITY_DB_IMPACT=0
PASSWORD_COLUMNS_ADDED=0
PASSWORD_HASH_COLUMNS_ADDED=0
MFA_SECRET_COLUMNS_ADDED=0
PARALLEL_IAM_SCHEMA_CREATED=0
```

## Gate result

The task cannot reach PRE-F5D PASS because platform authority has no approved physical binding and five executable/architecture decisions remain open. The blocked items are deliberately not implemented.

```text
PRE_F5D=BLOCKED
RECTOR_GATE=BLOCKED
RECTOR_BASELINE_INTEGRITY=PASS
DATABASE_TABLES=229
DATABASE_SCHEMA_CHANGED=0
MIGRATION_CREATED=0
PHYSICAL_MODEL_CHANGED=0
RECTOR_CHANGED=0
EXECUTABLE_CONTRACT_BEHAVIOR_CHANGED=0
BACKEND_CHANGED=0
FRONTEND_CHANGED=0
DEPLOY_CHANGED=0
QA_MUTATION=0
CODEX_VARIATION_BUDGET=ZERO
TASK_PACKET_STATUS=BLOCKED
ASSUMPTIONS_INTRODUCED=NONE
TECHNICAL_DEBT_INTRODUCED=0
```
