# TCDX GRC — PRE-F5E canonical materialization report

## Authority and boundary

| Field | Evidence |
|---|---|
| Base checkpoint | `04a2d3b29ed7853d88d28cc64e6d1eb7647ea895` |
| Working branch | `governance/pre-f5e-human-architecture-decisions` |
| Active master regent | `TCDX_GRC_MASTER_REGENT_BASELINE_v1.6_2026-09-23` |
| Rector candidate | exact checksummed source preserved under `docs/rector/candidates/` |
| Human authority | F5D-001/002/003/007 decisions approved 2026-09-23; prior F5D-004/005/006 closures preserved |
| Variation budget | `ZERO` |
| Runtime boundary | no backend/frontend/deploy/QA mutation; stop before commit |

The PRE-F5D discovery and 2026-09-22 partial reconciliation remain historical evidence. The 2026-09-23 authority explicitly approved the exact v1.6 candidate, replaces the three previously blocked decisions and authorizes the PRE-F5E reconciliation. It does not authorize QA migration or runtime implementation.

## Reconciliation result

| blocker | candidate result | evidence |
|---|---|---|
| F5D-001 Platform authority | `CLOSED` | active v1.6 publishes the separate persisted Platform grant chain; physical amendment and migration add only `iam.platform_role_assignments` with PLATFORM_CONTROL enforcement and no tenant/membership. |
| F5D-002 `tenantCreate` | `CLOSED` | `TenantCreateRequest -> TenantProjection`; server owns active lifecycle/confidential initial classification; closed classification vocabulary. |
| F5D-003 `membershipCreate` | `CLOSED` | `MembershipCreateRequest -> TenantMembershipProjection`; existing `user_identity_id` only; active server state; no invite/identity/credential/role side effect. |
| F5D-004 `membershipRoleAssign` | `CLOSED` | existing request/projection, same-tenant scopes, server valid_from, optional valid_to and PLATFORM_CONTROL rejection preserved without semantic change. |
| F5D-005 tenant context discovery | `CLOSED` | `accessGet.available_tenant_contexts` remains own-active-only, no tenant preselection/global enumeration and no M2M human context. |
| F5D-006 application token | `CLOSED` | asymmetric TCDX JWT and external/ID/opaque-token bearer prohibitions remain unchanged. |
| F5D-007 first Platform Admin bootstrap | `CLOSED` | internal one-time ceremony targets the authenticated canonical UserIdentity, resolves only canonical PLATFORM_ADMIN, serializes on its Role row, requires zero active and zero historical grants, writes assignment + audit atomically and permanently denies second use; runtime command is deferred. |

## Authority chains

```text
PLATFORM
validated TCDX principal
-> canonical UserIdentity (external identity resolved by issuer + stable subject)
-> active PlatformRoleAssignment
-> Role(PLATFORM_CONTROL) -> RolePermission -> Permission
-> platform scope -> ObjectPolicy -> SoD
-> ALLOW / default DENY

TENANT
validated TCDX principal
-> canonical UserIdentity
-> active TenantMembership -> commercial entitlement
-> active MembershipRole -> Role -> RolePermission -> Permission
-> tenant/object scope -> ObjectPolicy -> SoD
-> ALLOW / default DENY
```

The external identity key is not a grant allowlist. PlatformRoleAssignment is persisted IAM authority; TenantMembership never substitutes for it. Both paths share the same UserIdentity, Role, Permission and RolePermission catalogs.

## Rector and physical candidate

The repository's established activation process preserved the exact v1.5 baseline under `docs/rector/history/`, promoted the checksummed v1.6 overlay for rector 09, 21, 22, 30, 33 and 39, normalized activation metadata, and regenerated the active manifests. The original candidate remains content-addressed historical review evidence.

The physical overlay proposes one table. Migration `20260923000100_pre_f5e_platform_authority.sql` is forward-only and local-testable but has not been executed in QA. It adds:

- PK `platform_role_assignment_id`;
- UserIdentity FK and creator actor FKs;
- fixed `ownership_class=PLATFORM_CONTROL` CHECK and composite Role FK backed by candidate key `(role_id, ownership_class)`;
- validity CHECK and active-grant partial unique index;
- no tenant/membership/provider/email/credential column;
- Tenant defaults `active`/`confidential`, closed classification CHECK, and Membership default `active`.

No PlatformRoleAssignment is seeded for any person.

F5D-007 does not change the physical candidate or migration. Its future runtime transaction reuses the canonical `PLATFORM_ADMIN` Role row as the common `FOR UPDATE` serialization point and existing `iam.platform_role_assignments`/`ops_audit.audit_events`; it adds no table, flag, seed, public endpoint or grant authority. Repository inspection found no existing internal administrative command surface that could host the ceremony without creating new runtime architecture, so implementation and real concurrency evidence are explicitly deferred to the next authorized runtime/security stage.

## Gate result

```text
RECTOR_BASELINE_INTEGRITY=PASS
RECTOR_GATE=PASS
PRE_F5E=PASS
DATABASE_TABLES_BEFORE=229
DATABASE_TABLES_AFTER=230
DATABASE_SCHEMA_CHANGED=1
MIGRATION_CREATED=1
MIGRATION_ID=20260923000100
PHYSICAL_MODEL_CHANGED=1
RECTOR_BASELINE_ACTIVE_CHANGED=1
F5D_001_PLATFORM_AUTHORITY=CLOSED
F5D_002_TENANT_CREATE=CLOSED
F5D_003_MEMBERSHIP_CREATE=CLOSED
F5D_004_MEMBERSHIP_ROLE_ASSIGN=CLOSED
F5D_005_TENANT_CONTEXT_DISCOVERY=CLOSED
F5D_006_APPLICATION_TOKEN=CLOSED
F5D_007_FIRST_PLATFORM_ADMIN_BOOTSTRAP=CLOSED
F5D_007_RUNTIME_CEREMONY=DEFERRED_TO_NEXT_AUTHORIZED_RUNTIME_STAGE
PLATFORM_BOOTSTRAP_TABLE_CREATED=0
PLATFORM_BOOTSTRAP_PUBLIC_ENDPOINT_CREATED=0
FAKE_TENANT_CREATED=0
PLATFORM_TENANT_CREATED=0
SECOND_GRANT_AUTHORITY_CREATED=0
EMAIL_BASED_PRIVILEGE=0
PASSWORD_OR_MFA_SECRET_IN_GRC_DB=0
BACKEND_FUNCTIONAL_CHANGED=0
FRONTEND_FUNCTIONAL_CHANGED=0
DEPLOY_CHANGED=0
QA_MUTATION=0
PHASE_6_STARTED=0
TECHNICAL_DEBT_INTRODUCED=0
```

## Next human gate

Review the activation diff and gate evidence before any commit or runtime stage. Runtime Platform authorization remains fail-closed until the separately authorized migration and runtime implementation; the migration must not be applied outside an isolated local PostgreSQL 16 test without a later human gate.

## Local validation evidence

```text
RECTOR_CANDIDATE_MANIFEST=PASS_10_OF_10
OPENAPI_YAML_PARSE=PASS
TYPECHECK=PASS
BUILD=PASS
CONTRACT_TESTS=PASS_121_OF_121
PRE_F5D_PRE_F5E_FOCUSED_TESTS=PASS_23_OF_23
F5D_007_FOCUSED_TESTS=PASS_13_OF_13
PHASE_5_EXECUTABILITY_PREFLIGHT=PASS_8_OF_8
POSTGRESQL_16_ISOLATED_REBUILD=PASS_13_MIGRATIONS_230_TABLES_0_MISMATCHES
MIGRATION_GATES=PASS
DATABASE_VERIFY=PASS_230_OF_230
SEED_VERIFY=PASS
RECTOR_BASELINE_INTEGRITY=PASS
RECTOR_STATUS_TEST=PASS
CONTRACT_GENERATOR_VERIFY=BLOCKED_PREEXISTING_DATABASE_SEED_MANIFEST_DRIFT
QA_MIGRATION_EXECUTED=0
```

`database/seed-manifest.json` remains byte-identical to base `04a2d3b` (SHA-256 `e1d4970379a627e6f6b7836600c72a40e0743b9a1dfd977d2890090c44dc8cf4`). The same already documented generator drift remains the only `contracts:verify` blocker and was not repaired or hidden by this candidate.
