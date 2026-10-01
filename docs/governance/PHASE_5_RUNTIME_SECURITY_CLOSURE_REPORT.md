# TCDX GRC — Phase 5 runtime/security closure report

## Authority and scope

`MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.6_2026-09-23`
`RECTOR_BASELINE_INTEGRITY=PASS`
`RECTOR_GATE=PASS`
`VISUAL_CONTRACT_GATE=PASS_ACTIVE_V1_0_PENDING_V1_2_PRESERVED`
`PRE_F5E=PASS`
`PHASE_6_STARTED=0`

This report records the Phase 5 runtime/security/UI worktree candidate and the QA physical state observed on 2026-09-23. The human project authority has approved `jose@6.1.0`, `TENANT_BOOTSTRAP`, the backend-authoritative frontend session model, active visual authority v1.0 and this QA-only execution. It does not authorize a commit, push, PR, merge, production deployment, human UI approval, global Phase 5 closure or Phase 6.

## QA physical evidence

The pre-existing worktree report states that the canonical runner verified the first twelve ledger entries and applied only the pending migration `20260923000100_pre_f5e_platform_authority.sql` after confirming PostgreSQL 16, database `tcdx-grc`, a configured backup/PITR reference, ledger count 12, 229 canonical tables and absence of `iam.platform_role_assignments`. This execution independently performed read-only ledger, schema and seed verification against QA and observed the migration applied, PostgreSQL 16, 230 tables, zero schema mismatches and zero seed mismatches; it did not reapply the migration or otherwise mutate QA.

```text
PRE_F5E_MIGRATION_APPLIED_QA=1
DATABASE_TABLES_QA=230
SCHEMA_MISMATCHES=0
SEED_MISMATCHES=0
PERSON_SPECIFIC_PLATFORM_ASSIGNMENTS_CREATED=0
```

## Local runtime candidate

The backend candidate implements:

- provider-neutral Authorization Code + PKCE, configured `client_secret_basic|client_secret_post` token-endpoint authentication and exact external `issuer + stable subject` identity resolution/creation;
- asymmetric short-lived TCDX application JWT issuance and verification, mandatory TCDX claims and fail-closed local session/revocation state;
- rejection of external ID tokens, access tokens and opaque provider tokens as protected-API bearers;
- the internal, non-public `FIRST_PLATFORM_ADMIN_BOOTSTRAP` transaction with canonical role locking, post-lock recheck, zero-active plus zero-historical predicates and atomic reinforced audit;
- Platform authority through `PlatformRoleAssignment`, without TenantMembership;
- tenant authority through active membership, tenant-owned role, permission-specific scope and commercial entitlement;
- `tenantCreate`, `membershipCreate`, `membershipRoleAssign` and tenant-context discovery under their closed OpenAPI shapes;
- internal `TENANT_BOOTSTRAP`, serialized on the tenant row, with exact SEED-010 role/grant materialization, one active membership, only `TENANT_ADMIN`, idempotent replay and reinforced audit;
- canonical audit, outbox and idempotency integration for administrative mutations and relevant authorization denial;
- exact-origin CORS handling for the approved frontend origin, without wildcard origin or credential sharing.

No physical model, approved migration, rector baseline or Phase 6 capability changed. Frontend and QA deployment configuration change only within the approved IAM/session/tenant-context slice. The exact JOSE pin and human decisions are recorded in governed mutable artifacts.

## Verification evidence

```text
APPLICATION_JWT_UNIT_TESTS=PASS
APPLICATION_JWT_KEYPAIR_SELF_TEST=PASS
OIDC_PROOF_NEGATIVE_TESTS=PASS
BOOTSTRAP_CONCURRENCY_REAL_POSTGRESQL=PASS_EXACTLY_1_OF_2
BOOTSTRAP_SECOND_USE=DENY
BOOTSTRAP_AFTER_REVOCATION=DENY
PLATFORM_ROLE_ARBITRARY_INPUT=DENY
PLATFORM_RBAC_DEFAULT_DENY=PASS
TENANT_CREATE_SERVER_DEFAULTS=PASS
TENANT_BOOTSTRAP_REAL_POSTGRESQL=PASS
TENANT_BOOTSTRAP_IDEMPOTENT_REPLAY=PASS
TENANT_BOOTSTRAP_BASELINE_ROLES=PASS_EXACT_22
TENANT_BOOTSTRAP_AUTOMATIC_EXTRA_ROLES=0
TENANT_BOOTSTRAP_AUDIT=PASS
MEMBERSHIP_CREATE_NO_AUTOMATIC_ROLE=PASS
MEMBERSHIP_ROLE_ASSIGN_CROSS_TENANT=DENY
TENANT_ENTITLEMENT_DEFAULT_DENY=PASS
ACCESS_ME_OWN_ACTIVE_CONTEXTS=PASS
RUNTIME_TEST_FIXTURE_CLEANUP=PASS
ORDINARY_TESTS=PASS_141_OF_141_WITH_1_GATED_POSTGRES_SUITE
FOCUSED_AUTH_IAM_TESTS=PASS_20_OF_20
PHASE_5_EXECUTABILITY_AND_PRE_F5D_PRE_F5E=PASS_31_OF_31
```

## Final IAM/UI execution continuation

The human execution packet reconciled presentation authority to v1.0. `VISUAL_BASELINE_MANIFEST.json` now selects the already human-approved `TCDX_GRC_VISUAL_BASELINE_v1.0` as `ACTIVE` and preserves all v1.2 evidence under an explicit `PENDING_HUMAN_APPROVAL` candidate. No v1.0 artifact, v1.2 screenshot or design-system reference was changed.

The frontend now implements the approved backend-authoritative browser flow: OIDC popup entry, exact-origin callback message, tab-scoped TCDX-token storage, tenant-header-free `GET /access/me`, automatic selection for exactly one active context, explicit selector for multiple contexts, `X-TCDX-Tenant-Id` on tenant requests, and local plus backend logout. All frontend permission/scope/capability authorization calculations were removed. Backend 401/403 decisions remain authoritative.

A fresh 3072-bit RSA QA keypair was generated directly on `grc-bk` under `/home/tecdex/.secrets/tcdx-grc-qa`, with directory mode `0700` and both files mode `0600`. The private key was not printed, copied locally, committed, stored in PostgreSQL or exposed to the frontend. The deployment consumes it through Compose secrets. The only recorded key evidence is the public-key DER SHA-256 fingerprint:

```text
QA_JWT_PUBLIC_KEY_FINGERPRINT_SHA256=fdde16119acffc16118d23a4307fcfa2137efd9a2fee2162471f5a20f3f4c074
```

Derived runtime configuration is closed as follows: OIDC scopes `openid profile email`, OIDC algorithm allowlist `RS256`, Zoho token endpoint authentication `client_secret_post`, application issuer `https://grc-bk.tcdx.int`, audience `tcdx-grc-api`, public-key-fingerprint-derived key ID, JWT algorithm `RS256`, maximum lifetime 300 seconds and clock tolerance 5 seconds.

The active QA host and GitHub repository/environment metadata contain none of the four external Zoho values. They therefore remain the only pre-deployment human input:

```text
OIDC_ISSUER
OIDC_CLIENT_ID
OIDC_CLIENT_SECRET
OIDC_REDIRECT_URI
```

The real one-time Platform Admin bootstrap still requires the first authenticated canonical human `UserIdentity`; no identity or grant was invented or persisted. The pre-existing object-storage dependency, `evidenceRequestFulfill`, `controlAssessmentSubmit`, seed-manifest drift and four known secret-scan false positives remain global Phase 5 matters and do not block this IAM/UI wait state.

```text
PHASE_5_RUNTIME_CLOSURE=BLOCKED
PHASE_5_IAM_RUNTIME_UI=WAITING_ONLY_EXTERNAL_HUMAN_INPUT
QA_RUNTIME_DEPLOYED=0
QA_JWT_KEYPAIR=GENERATED_SECRET_FILE_ONLY
REAL_PLATFORM_ADMIN_BOOTSTRAP_EXECUTED=0
FRONTEND_SESSION_IMPLEMENTED=PASS_LOCAL
FRONTEND_PERMISSION_AUTHORITY=0
PLAYWRIGHT_LOCAL=PASS_48_OF_48_TEMPORARY_EVIDENCE_NO_BASELINE_UPDATE
PLAYWRIGHT_QA=WAITING_QA_DEPLOY
PHASE_6=BLOCKED
```
