# Platform role administration — STEP 23L-MI10-P2A

Human authority: Andrés Barouh, P2A task packet, 2026-10-06. Master regent: `TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23`. Local implementation and isolated publication proof are authorized; QA publication and deployment require a subsequent controlled step.

## Authority and inputs

`platform.role.administer`: resource `platform.role`, action `administer`, capability `CORE_PLATFORM`, scope `platform`. Initial grant is exclusively the published baseline `PLATFORM_ADMIN`. `platform.role.assign` remains exclusively MembershipRole administration. Authentication, email, username and Keycloak roles confer no GRC authority.

| operationId | method and path relative to /api/v1 | body | success |
|---|---|---|---|
| platformRoleAssign | POST /platform/user-identities/{user_identity_id}/platform-roles | role_code, reason | 201 PlatformRoleAssignmentProjection |
| platformRoleRevoke | POST /platform/user-identities/{user_identity_id}/platform-roles/{platform_role_assignment_id}:revoke | reason | 200 PlatformRoleAssignmentProjection |

Both require an authenticated HUMAN_INTERACTIVE GRC identity and its current effective platform permission. No tenant context: presence of X-TCDX-Tenant-Id returns 403; tenant_id in query/body returns 400. Unknown fields are rejected. IDs are UUIDv7. Reason is trimmed nonempty text, at most 2000 characters; operators must never include credentials. Idempotency-Key is nonempty text, at most 255 characters. No If-Match or row_version is invented for this immutable temporal relation.

Target is an existing active `iam.user_identities.user_identity_id`. Role resolution is by canonical role_code, never a caller-supplied role UUID. Rector42 defines the platform functional family: `PLATFORM_ADMIN`, `PLATFORM_SUPPORT`. A role must additionally be the unique published baseline PLATFORM_CONTROL/tenant-null catalog record. Global catalog templates of tenant roles are not platform roles. No identity creation, provider mapping, tenant membership, MembershipRole, tenant grant, Keycloak mutation or bootstrap call is permitted.

## Transaction and temporal lifecycle

READ COMMITTED transaction locks the unique canonical PLATFORM_ADMIN role row first, sharing the F5D-007 serialization object without invoking bootstrap. Every assignment/revocation then re-resolves actor authority after obtaining that lock. Validity uses the current post-lock PostgreSQL statement timestamp, not a potentially older transaction-start timestamp; assignments and closure use server statement time. The original bootstrap timestamp contract remains unchanged. Target identity and resolved role/assignment are validated in that transaction. Assign creates one server-timed open interval. An existing currently active or overlapping future interval conflicts; the existing unique open-pair constraint is preserved. Closed history permits a new assignment with a new ID.

Revoke closes only the exact target assignment valid_to using server time, preserving history. Already inactive, revoked or not-yet-active assignments conflict. When revoking PLATFORM_ADMIN, count distinct active UserIdentities retaining currently active canonical PLATFORM_ADMIN grants after this revocation. Zero remaining administrators is denied. Counts are evaluated after the shared role lock in the same transaction; concurrent revocations cannot both remove the final authority. F5D-007 remains permanently one-time and consumed.

## Idempotency, audit and errors

Canonical v1 fingerprint is SHA256 of `v1 + NUL + operationId + NUL + sorted canonical JSON`, including target IDs and normalized body. Binding is PLATFORM_CONTROL, null tenant, canonical actor, operation and key. Claim, mutation, material audit, privileged-use audit and completion commit atomically. Completed replay returns the original projection and status with Idempotency-Replayed=true, even after a later grant lifecycle change; no new grant/audit. Projection JSON is stored as the existing idempotency result_ref and protected by response_hash. Same key/different payload returns 409 TCDX.CONFLICT.IDEMPOTENCY. No safe in-progress representation: 409 TCDX.CONFLICT.RESOURCE, retryable=true. Failed transactions leave no partial grant, audit or claim. No invented TTL.

Material codes are the existing reserved `audit.iam.platform_role_assignment.assign.v1` and `audit.iam.platform_role_assignment.revoke.v1`. Aggregate is PlatformRoleAssignment; command is the exact operationId; classification restricted; actor, target, resolved role, reason, server time, correlation, outcome and before/after validity are recorded. Existing privileged-use audit accompanies sensitive use. No new domain/outbox event is authorized. Audit/idempotency use existing foundation persistence, not a parallel subsystem.

| condition | canonical error/status |
|---|---|
| malformed/missing fields, reason or key; tenant_id input; unknown fields | TCDX.VALIDATION.FAILED / 400 |
| missing authentication | TCDX.AUTHENTICATION.REQUIRED / 401 |
| absent current permission, non-human actor or tenant header | TCDX.AUTHORIZATION.DENIED / 403 |
| missing target, unknown role, assignment not belonging to target | TCDX.RESOURCE.NOT_FOUND / 404 |
| inactive target; unpublished/nonassignable role; inactive assignment | TCDX.LIFECYCLE.TRANSITION_DENIED / 409 |
| non-platform functional role | TCDX.AUTHORIZATION.DENIED / 403 |
| ambiguous catalog, duplicate active/overlapping assignment, last admin revoke | TCDX.CONFLICT.RESOURCE / 409 |
| changed idempotency payload | TCDX.CONFLICT.IDEMPOTENCY / 409 |

Responses and failures use no-store. Projection fields: platform_role_assignment_id, user_identity_id, role_code, valid_from, valid_to (nullable). Neither secrets nor tenant authority are projected.

## Publication and traceability

Local DATA-ONLY artifact `20261006000100_platform_role_administration_permission_publication.sql` follows exact migration26 checksum. Precondition: PostgreSQL16/tcdx-grc, ledger26/latest20261001000100, 235 tables, 167 published permissions, absent new permission, exactly one canonical PLATFORM_ADMIN. It inserts exactly one Permission and one RolePermission resolved by canonical role_code; no hardcoded role UUID, DDL, person grant or tenant side effect. Postcondition168 permissions, one new permission, one PLATFORM_ADMIN grant, zero other grants, same schema. Manifest/seed registry and isolated PostgreSQL evidence accompany the artifact. QA remains26/235/167 until separately authorized publication.

Authority: rector09/22/25/28/31/33/35/39/40/42/43, PRE-F5E21/F5D-001/F5D-007 and P2A human approval. Runtime: platform-role-service and platform-role-routes. Tests: platform-role-service unit/isolated PostgreSQL and platform-role-administration contract gates. Branding fixes remain explicitly deferred before HUMAN_UI_REVIEW.

## STEP 23L-MI10-P2E — canonical read closure (local only)

Human authority: Andrés Barouh, P2E task packet 2026-10-06. This extends only the existing platform administration surface; no QA deploy, frontend completion, authority assignment, login or Phase6 is authorized.

### Target assignment read

`platformRoleAssignmentList`: GET `/api/v1/platform/user-identities/{user_identity_id}/platform-roles`; permission `platform.role.administer`; scope `platform`; authenticated HUMAN_INTERACTIVE actor resolved through current canonical PlatformRoleAssignment -> published Role -> RolePermission -> published Permission, default DENY. Roles, email, username, Keycloak and tenant memberships confer no alternate authority. `platform.role.read` is not used because its catalog contract excludes direct UserIdentity grants; `platform.role.assign` belongs to MembershipRole. No grant expands.

Target UUIDv7 resolves only iam.user_identities, including inactive targets for administrative inspection. Missing identity is404 TCDX.RESOURCE.NOT_FOUND; existing target with no active assignments is200 `{items:[]}`. No body or query is accepted, including tenant_id (400 TCDX.VALIDATION.FAILED). Presence of tenant header is403 TCDX.AUTHORIZATION.DENIED. Malformed ID400; unauthenticated401; absent current permission/nonhuman403. No idempotency key or ETag is required or emitted. All outcomes use no-store. Existing canonical error envelopes remain unchanged.

One REPEATABLE READ / READ ONLY snapshot resolves actor, target and temporal projection. Active means valid_from <= transaction_timestamp() and (valid_to IS NULL or valid_to > transaction_timestamp()). Future and closed intervals are omitted, never deleted; a nonnull future valid_to still represents an active interval. Assignment validity is expressed by the approved valid_from/valid_to fields, not a new stored status, assigned_at or revoked_at alias. Role resolution enforces fixed PLATFORM_CONTROL ownership, tenant-null and the rector42 functional platform family, independent of global tenant templates. It does not silently hide active intervals because the role is later unpublished; assign/revoke still apply their unchanged lifecycle checks.

Each item contains exactly platform_role_assignment_id, user_identity_id, canonical role_code, role_name from iam.roles.name, valid_from, nullable valid_to. Assignment ID is the exact platformRoleRevoke path input. Ordering is role_code ASC then assignment ID ASC. Complete unpaginated set is bounded by the two-role canonical family and command no-overlap invariant; duplicate active intervals for one role fail closed409 TCDX.CONFLICT.RESOURCE, never truncate. No tenant data, provider identity, secrets, creator metadata or grants to permissions are returned. No DB mutation, material/reinforced change audit, domain event, idempotency write or bootstrap is performed; this is an administrative read, as existing roleList, not sensitive authority-changing administer use.

### Reuse of existing runtime Role catalog

Inspection: roleList GET `/api/v1/roles` already queries iam.roles under platform.role.read, but its unfiltered PLATFORM_CONTROL catalog includes global tenant templates. P2E integrates that existing canonical source through optional `assignable_family=platform`, without a second endpoint or operation. Only this literal is accepted; other values400. This mode rejects tenant header403, tenant_id or body400. Existing authentication, platform.role.read and Platform Admin object policy remain unchanged, so no grant broadens. No platform.role.administer substitution or tenant grant is inferred.

Backend filters to rector42 functional platform family AND published AND baseline AND PLATFORM_CONTROL AND tenant-null, exactly matching platformRoleAssign eligibility. Ambiguous same-code catalog records fail closed409. It retains RoleAdministrativePage/Projection, including role_code, name, publication metadata and informational role_id; UI selection sends canonical role_code, never role UUID. Existing keyset pagination is unchanged (default25/max100, created_at DESC/role_id DESC, context-bound cursor); clients follow page.has_more/next_cursor. Empty eligible catalog is a valid empty page. Unfiltered roleList and roleGet retain approved semantics. No frontend filtering or hardcoded option supplies eligibility.

`PLATFORM_ROLE_CATALOG_RUNTIME_SOURCE=roleList?assignable_family=platform -> iam.roles`; `PLATFORM_ROLE_CATALOG_STATUS=INTEGRATED_EXISTING_CANONICAL_SOURCE`. No table/column/entity/cache, Permission, RolePermission, seed or migration is added. Contracts precede implementation. P2D branding is preserved; P2D UI remains blocked until separately resumed as P2D-R.

Traceability: rector09/22/23/25/28/42/43/45 -> PRE-F5E F5D-001/007 -> physical iam.user_identities/roles/platform_role_assignments -> executable02/03/05/24 -> platform-role-read and administrative-read -> platform-role-read unit/PostgreSQL and platform-role-read-contract tests. Local evidence does not establish QA/runtime or human UI approval.
