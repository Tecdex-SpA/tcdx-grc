# TCDX GRC — Master Execution Status

`MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23`
`BASELINE_STATUS=ACTIVE`
`RECTOR_BASELINE=PASS`
`RECTOR_DOCUMENT_CONSISTENCY=PASS`
`SEMANTIC_CONFLICTS=0`
`UNRESOLVED_ARCHITECTURAL_FINDINGS=0`
`SCOPE_EXPANSIONS=0`
`CODEX_VARIATION_BUDGET=ZERO`

## Human approval — PRE-F4 integrated Audit amendment

`AUDIT_MODEL_AMENDMENT_APPROVED_COMMIT=6a31034ae1ecc1f9ee551431fb2a504a25fb52ce`
`AUDIT_MODEL_AMENDMENT_REVIEW=PASS`
`AUDIT_MODEL_MIGRATION_EXECUTION=AUTHORIZED_NOW`
`RECTOR_BASELINE_V1_5=ACTIVE`
`AUDIT_MODEL_AMENDMENT_HUMAN_APPROVAL_DATE=2026-09-16`

The human project authority approved activation of rector baseline v1.5 and immediate governed materialization of the approved Audit model amendment from 214 to 229 tables. This approval does not start Phase 4 or authorize functional Audit implementation.

## CI rector

`RECTOR_CI_WORKFLOW=Rector Governance Gate`
`RECTOR_REQUIRED_CHECK_NAME=rector-governance`
`RECTOR_CI_EXECUTION=PASS`
`MAIN_RULESET=TCDX GRC Main Governance`
`MAIN_RULESET_ENFORCEMENT=ACTIVE`
`MAIN_REQUIRED_STATUS_CHECK=rector-governance`
`MAIN_BYPASS_ACTORS=0`

The rector workflow is operational and the repository ruleset enforces pull requests and the required `rector-governance` status check on the default branch. Force-pushes and branch deletion are blocked and no bypass actors are configured.

## Human approval — Phase 1

`PHYSICAL_MODEL_APPROVED_COMMIT=a822bb92d0d585edd84adc8a1c65ec280923cc8e`
`PHYSICAL_DATA_MODEL_REVIEW=PASS`
`PHYSICAL_MODEL_DESIGN=COMPLETE`
`PHYSICAL_MODEL_HUMAN_APPROVAL_DATE=2026-09-15`

The human project authority approved the PostgreSQL 16 physical model corresponding to commit `a822bb92d0d585edd84adc8a1c65ec280923cc8e` after independent architectural review.

## Human approval — Phase 2

`EXECUTABLE_CONTRACTS_APPROVED_COMMIT=16deeafc0237f219d08d44f5d5a27c62ae4cc909`
`EXECUTABLE_CONTRACTS=PASS`
`EXECUTABLE_CONTRACTS_DESIGN=COMPLETE`
`EXECUTABLE_CONTRACTS_HUMAN_APPROVAL_DATE=2026-09-15`

The human project authority explicitly approved H-001 through H-006 and the executable contracts corresponding to commit `16deeafc0237f219d08d44f5d5a27c62ae4cc909` after independent review.

## Human approval — Phase 3

`FOUNDATIONS_RUNTIME_APPROVED_COMMIT=d98f3f2454c2c9fbece0379ec97e7c09d1ecf151`
`FOUNDATIONS_RUNTIME=PASS`
`FOUNDATIONS_IMPLEMENTATION=COMPLETE`
`DATABASE_INITIALIZATION=PASS`
`MIGRATIONS_RUNTIME=PASS`
`FOUNDATIONS_RUNTIME_HUMAN_APPROVAL_DATE=2026-09-16`

The human project authority explicitly approved the Phase 3 foundations runtime corresponding to commit `d98f3f2454c2c9fbece0379ec97e7c09d1ecf151` after QA materialization and validation of the definitive PostgreSQL database, backend foundation runtime and frontend foundation runtime.

## Human approval — Visual baseline v1.0

`VISUAL_BASELINE=ACTIVE`
`VISUAL_BASELINE_ID=TCDX_GRC_VISUAL_BASELINE_v1.0`
`VISUAL_BASELINE_APPROVED_COMMIT=eb4ceee`
`VISUAL_AUTHORITY_PATH=docs/ui`
`VISUAL_BASELINE_HUMAN_APPROVAL_DATE=2026-09-16`
`BRAND_REFERENCE_MODE=READ_ONLY`

The human project authority approved the TCDX GRC visual baseline v1.0, including the dashboard baseline, Tecdex design tokens, component contract, layout/navigation contract, visual acceptance gates and the local versioned official Tecdex logo asset. The visual baseline governs presentation only and cannot override the rector baseline, canonical data model, physical model, executable contracts, RBAC or lifecycle semantics.

## Human approval — Phase 5 authorization

`PHASE_5_HUMAN_DECISION=DR-PHASE5-2026-09-17-001`
`PHASE_5_API_READ_DECISION=DR-PHASE5-API-READ-2026-09-17-002`
`PHASE_5_RELEASE_DEPENDENCY_DECISION=DR-PHASE5-RELEASE-DEPS-2026-09-17-003`
`PHASE_5_HUMAN_APPROVER=Andrés Barouh`
`PHASE_5_HUMAN_APPROVAL_DATE=2026-09-17`

The human project authority, Andrés Barouh, acting explicitly as Product Owner/CPO, Architecture Owner, Backend Owner, Security & Privacy Reviewer and QA/Release Owner, authorized Phase 5 Core GRC Slice and approved the controlled Phase 5 read-contract amendment and release-dependency manifest. Product/runtime segregation-of-duties requirements remain mandatory and are not waived by project-governance role accumulation.

## Human approval — PRE-F5B executable-contract closure

`PHASE_5_EXECUTABLE_CONTRACT_DECISION=DR-PRE-F5B-2026-09-21-004`
`PHASE_5_EXECUTABLE_CONTRACTS=CLOSED`
`PHASE_5_PAGINATION_CONTRACT=PASS`
`PHASE_5_MUTATION_REQUEST_SCHEMAS=PASS`
`PHASE_5_ACTION_WORKFLOW_CONTRACT=PASS`
`PHASE_5_EVIDENCE_CREATION_CONTRACT=PASS`
`PHASE_5_EXECUTABLE_CONTRACT_HUMAN_APPROVAL_DATE=2026-09-21`

The human project authority approved the PRE-F5B decision that closes the remaining Core GRC executable-contract blockers: cursor pagination for the ten approved collection reads, 30 closed mutation request schemas, explicit Action submit-for-review and explicit Evidence materialization with typed EvidenceLinks. This is documentary/executable-contract closure only; it changes no physical schema or runtime seed and does not start Phase 5.

## Human approval — PRE-F5C executable/physical reconciliation

`PRE_F5C_HUMAN_DECISION=DR-PRE-F5C-2026-09-21-005`
`PRE_F5C_LOCAL_GATE=PASS`
`PHASE_5_EXECUTABILITY_PREFLIGHT=PASS`
`PRE_F5C_PHYSICAL_MODEL_AMENDMENT=PASS_LOCAL_CANDIDATE`
`PRE_F5C_MIGRATION_ID=20260921000100`
`PRE_F5C_QA_MIGRATION_EXECUTED=1`
`PRE_F5C_PHYSICAL_RUNTIME=PASS`
`PRE_F5C_HUMAN_APPROVAL_DATE=2026-09-21`

The human project authority approved the PRE-F5C decisions that reconcile explicit F5 row-version concurrency, the six mutable workflow rows, four physical integrity constraints, lifecycle reachability, nine missing API operations, exactly two permissions and the single-write audit rule. The migration candidate and executable preflight pass in isolated local PostgreSQL 16 with 229 tables. QA materialization remains a separate human gate and Phase 5 remains not started.

## Human activation — PRE-F5E Platform IAM and token boundary

`PRE_F5E=PASS`
`PRE_F5E_F5D_BLOCKERS_CLOSED=7`
`PRE_F5E_F5D_BLOCKERS_OPEN=0`
`PRE_F5E_RECTOR_BASELINE=TCDX_GRC_MASTER_REGENT_BASELINE_v1.6_2026-09-23`
`PRE_F5E_RECTOR_ACTIVATION=PASS`
`PRE_F5E_PHYSICAL_MODEL_AMENDMENT=PASS_LOCAL_CANDIDATE`
`PRE_F5E_MIGRATION_ID=20260923000100`
`PRE_F5E_CANDIDATE_DATABASE_TABLES=230`
`PRE_F5E_QA_MIGRATION_EXECUTED=1`
`F5D_001_PLATFORM_AUTHORITY=CLOSED`
`F5D_002_TENANT_CREATE=CLOSED`
`F5D_003_MEMBERSHIP_CREATE=CLOSED`
`F5D_004_MEMBERSHIP_ROLE_ASSIGN=CLOSED`
`F5D_005_TENANT_CONTEXT_DISCOVERY=CLOSED`
`F5D_006_APPLICATION_TOKEN=CLOSED`
`F5D_007_FIRST_PLATFORM_ADMIN_BOOTSTRAP=CLOSED`
`F5D_007_RUNTIME_CEREMONY=IMPLEMENTED_LOCAL_NOT_EXECUTED_QA`
`PRE_F5E_HUMAN_DECISION_DATE=2026-09-23`

The 2026-09-23 human authority activated rector baseline v1.6 and closed F5D-001 through F5D-007. Persisted `PlatformRoleAssignment` separates Platform authority from TenantMembership; Tenant creation starts active/confidential under a closed classification vocabulary; Membership creation starts active for an existing canonical UserIdentity; and the one-time internal, serialized, audited, PLATFORM_ADMIN-only bootstrap contract crosses the initial zero-grant state. The bootstrap adds no table/public endpoint/allowlist/seed. The later Phase 5 runtime/security authorization applied migration `20260923000100` through the canonical runner after local and QA preconditions passed; QA now has 230 canonical tables and zero person-specific Platform assignments.

## Human activation — Rector v1.7 and Phase 5 final closure

`PHASE_5_FINAL_CLOSURE_HUMAN_DECISION=DR-PHASE5-FINAL-2026-09-23-008`
`RECTOR_BASELINE_V1_7=ACTIVE`
`RECTOR_V1_6_HISTORY=PROTECTED_IMMUTABLE`
`PHASE_5_FINAL_MIGRATION_ID=20260923000200`
`PHASE_5_FINAL_MIGRATION_MODE=FORWARD_ONLY`
`HISTORICAL_MIGRATION_20260921000100_SHA256=1181d7ab26718927124de880e351fbaba3f2daaca41267a1ef66d28ac2021680`
`PHASE_5_FINAL_CLOSURE_HUMAN_APPROVAL_DATE=2026-09-23`

The human authority activated v1.7 with exactly three decisions: durable tenant-owned `FileUploadIntent` before final `FileObject`, the unique fulfillment audit code `audit.lifecycle.evidence_request.fulfill.v1`, and `controlAssessmentSubmit` authorization through canonically resolvable `owned_object` or a published `tenant` grant. The authority also requires the already-applied PRE-F5C migration to remain byte-identical and confines all new physical materialization to migration `20260923000200`. This authorization does not include commit, push, PR, merge, production or Phase 6.

## Human approval — Phase 5 fast-track IAM/runtime/UI decisions

`JOSE_6_1_0=HUMAN_APPROVED`
`TENANT_BOOTSTRAP_OPERATION=HUMAN_APPROVED_INTERNAL`
`FRONTEND_SESSION_MODEL=HUMAN_APPROVED_BACKEND_AUTHORITATIVE`
`PHASE_5_FAST_TRACK_HUMAN_DECISION_DATE=2026-09-23`

The human project authority approved `jose@6.1.0` as the single JOSE/JWT/OIDC security library, approved the internal Platform-Admin-only `TENANT_BOOTSTRAP` operation over `SEED-010`, and fixed the browser model to TCDX JWT plus `GET /access/me` tenant-context discovery and `X-TCDX-Tenant-Id`, with authorization recomputed by the backend on every request. The decisions are recorded in `PHASE_5_FAST_TRACK_RUNTIME_UI_DECISIONS.md` and do not approve a visual baseline, QA secrets, a real bootstrap identity, production, global Phase 5 closure or Phase 6.

## Phase 5 local implementation — runtime unverified

`PHASE_5_STARTED=1`
`PHASE_5_IMPLEMENTATION=IMPLEMENTED_UNVERIFIED_RUNTIME`
`CORE_GRC_SLICE=BLOCKED_PENDING_RUNTIME`
`PHASE_5_RUNTIME_PERMISSION_MIGRATION=20260921000200`
`PHASE_5_RUNTIME_PERMISSION_MIGRATION_EXECUTED=1`
`PHASE_5_LOCAL_VERIFICATION_DATE=2026-09-23`
`PHASE_5_LOCAL_FULL_TESTS=PASS_141_OF_141_WITH_1_GATED_POSTGRES_SUITE`
`PHASE_5_SECURITY_POSTGRES_INTEGRATION=PASS_1_OF_1`
`PHASE_5_LOCAL_PLAYWRIGHT=PASS_48_OF_48_TEMPORARY_EVIDENCE_NO_BASELINE_UPDATE`
`HUMAN_UI_REVIEW=PENDING`
`PHASE_5_TENANT_BOOTSTRAP_LOCAL=PASS_REAL_POSTGRESQL`
`PHASE_5_RUNTIME_SECURITY_LOCAL=PASS_WORKTREE_CANDIDATE`
`PHASE_5_FRONTEND_SESSION_LOCAL=PASS_BACKEND_AUTHORITATIVE`
`PHASE_5_FRONTEND_PERMISSION_AUTHORITY=0`
`QA_JWT_KEYPAIR=GENERATED_SECRET_FILE_ONLY`
`QA_JWT_PUBLIC_KEY_FINGERPRINT_SHA256=fdde16119acffc16118d23a4307fcfa2137efd9a2fee2162471f5a20f3f4c074`
`QA_OIDC_EXTERNAL_VALUES_REQUIRED=4`
`VISUAL_CONTRACT_GATE=PASS_ACTIVE_V1_0_PENDING_V1_2_PRESERVED`
`PHASE_5_IAM_RUNTIME_UI=WAITING_ONLY_EXTERNAL_HUMAN_INPUT`
`PHASE_6_STARTED=0`

The local worktree candidate materializes the existing Core GRC slice plus the PRE-F5E runtime/security backend boundary with PostgreSQL-derived access, tenant/object policy, lifecycle registry, explicit row-version CAS, idempotency, audit and authorized outbox behavior. The approved `jose@6.1.0` dependency is pinned, and `TENANT_BOOTSTRAP` locally materializes exactly 22 tenant baseline roles and their grants, one active membership and only the tenant-scope `TENANT_ADMIN` assignment with idempotent replay and reinforced audit. Verification on 2026-09-23 passes rector integrity/status, typecheck, build, the separately gated real PostgreSQL security integration and 48 local Playwright checks across four viewports. The Phase 5 runtime-permission and PRE-F5E migrations are applied in QA. Visual authority is reconciled to active v1.0 while v1.2 remains preserved as pending; no baseline screenshot was updated. The frontend now completes OIDC popup delivery, stores only the TCDX application token in tab-scoped session storage, discovers contexts through tenant-header-free `/access/me`, selects or auto-selects a tenant and sends `X-TCDX-Tenant-Id` only on tenant requests; it contains no permission/scope authorization calculation. A fresh QA RSA keypair exists only in the protected host secret directory and the remaining undeployable inputs are exactly `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` and `OIDC_REDIRECT_URI`. Upload intent/finalization remain unavailable without governed object storage. `evidenceRequestFulfill` and `controlAssessmentSubmit` retain their previously recorded executable/physical blockers. Full evidence is in `PHASE_5_CORE_GRC_IMPLEMENTATION_REPORT.md` and `PHASE_5_RUNTIME_SECURITY_CLOSURE_REPORT.md`.

## Human approval — Phase 5 Subscription create

`PHASE_5_SUBSCRIPTION_DECISION=HUMAN_APPROVED_2026_09_24`
`SUBSCRIPTION_PERMISSION=platform.subscription.create`
`SUBSCRIPTION_PERMISSION_SCOPE=platform`
`SUBSCRIPTION_PERMISSION_OWNERSHIP=PLATFORM_CONTROL`
`SUBSCRIPTION_PERMISSION_BASE_ROLE=PLATFORM_ADMIN`
`SUBSCRIPTION_OPERATION=subscriptionCreate`
`SUBSCRIPTION_PHYSICAL_MODEL_CHANGE=0`
`PHASE_5_SUBSCRIPTION_CATALOG_RELEASE=APPLIED_QA_FORWARD_ONLY_DATA_ONLY`

The human authority approved publication of the exact permission and operation for creating a Subscription over an existing published PlanVersion. Plans, PlanVersions, Capabilities and Entitlements remain immutable to the caller; effective entitlements derive from the selected PlanVersion. The decision is recorded in `PHASE_5_SUBSCRIPTION_CREATE_DECISION.md`, creates no physical structure and does not authorize any other commercial lifecycle command, production, PRE-6 or Phase 6.

## Phase 5 QA provisioning complete — smoke data prerequisites blocked

`PHASE_5_SUBSCRIPTION_CATALOG_MIGRATION_ID=20260924000100`
`PHASE_5_SUBSCRIPTION_CATALOG_QA_MIGRATION_EXECUTED=1`
`SUBSCRIPTION_PERMISSION_QA=PUBLISHED`
`PLATFORM_ADMIN_SUBSCRIPTION_GRANT_QA=PASS_EXACTLY_1`
`SUBSCRIPTION_RUNTIME_BACKEND_QA=DEPLOYED_HEALTHY`
`QA_BACKEND_IMAGE_DIGEST=sha256:b588f9d1ec94ab827cde1b9583e6cdec2594ea1783ad18ed6aa72c9aca8f428b`
`SAME_USERIDENTITY_QA=PASS`
`PLATFORM_ADMIN_ACTIVE_QA=PASS_EXACTLY_1`
`TECDEX_ACTIVE_SUBSCRIPTIONS_QA=1`
`TECDEX_SUBSCRIPTION_CODE_QA=TECDEX-GRC`
`TECDEX_SUBSCRIPTION_STATE_QA=active`
`TECDEX_SUBSCRIPTION_ID_QA=01a0d491-030a-723c-940e-14eee9605a16`
`PLATFORM_ADMIN_ASSIGNMENT_PRESERVED_QA=PASS`
`TENANT_MEMBERSHIP_PRESERVED_QA=PASS`
`TENANT_ADMIN_QA=ACTIVE`
`EVIDENCE_OWNER_QA=ACTIVE`
`CONTROL_OWNER_QA=ACTIVE`
`QA_PROVISIONING=PASS`
`OIDC_NEW_SESSION_QA=PASS`
`OIDC_HUMAN_LOGIN_REQUIRED=YES_FOR_RESUMED_SMOKES`
`ACCESS_ME_QA=PENDING_DIRECT_RESPONSE_EVIDENCE`
`OIDC_LOGOUT_QA=NOT_PROVEN_NO_REVOCATION_EVENT`
`QA_SMOKE_DATA_PREFLIGHT=BLOCKED_MISSING_CANONICAL_PREREQUISITES`

On 2026-09-24 the complete local gate battery passed under Node.js 22.23.2 and pnpm 12.4.1: typecheck, build, 167 unit/contract tests with the separately gated PostgreSQL suite, contracts verification, secret scan, rector integrity/status, migration gates, schema verification, seed verification, the real PostgreSQL security integration and 48 Playwright checks. QA read-only preconditions then proved one active `PLATFORM_ADMIN`, one active TecDex membership and the same canonical `UserIdentity`; TecDex retained only `TENANT_ADMIN`, had zero active Subscriptions and the single published GRC PlanVersion v1 enabled `CONTROLS_ASSURANCE` and `EVIDENCE_DOCUMENTS`.

The canonical migration runner verified the first fourteen checksums and applied only data-only migration `20260924000100`. Postconditions prove fifteen applied migrations, 231 physical tables, 148 permissions, exactly one `PLATFORM_ADMIN` grant for `platform.subscription.create`, zero schema mismatches and zero seed mismatches. The backend candidate was rebuilt from the byte-matched QA source, recreated without touching PostgreSQL, MinIO or ClamAV, and is healthy at image digest `sha256:b588f9d1ec94ab827cde1b9583e6cdec2594ea1783ad18ed6aa72c9aca8f428b` with the published `subscriptionCreate` route present.

On 2026-09-24 Andrés completed the human OIDC ceremony through the normal application flow. `subscriptionCreate` created exactly one active TecDex Subscription with business code `TECDEX-GRC` over the dynamically resolved published GRC PlanVersion v1; replay with the same idempotency key returned the same Subscription and the canonical replay header. `membershipRoleAssign` added only `CONTROL_OWNER` and `EVIDENCE_OWNER` to the existing membership. Database evidence proves the original `PLATFORM_ADMIN` assignment and `TENANT_ADMIN` role remain active, the same `UserIdentity` owns both contexts, user-identity and membership counts remain one, no direct-user-grant table exists, both commercial capabilities are enabled, and each successful operation has its canonical audit, outbox and completed idempotency record. The provisioning session was revoked normally and a later application-token issue event proves the required post-provisioning human login.

The Phase 5 runtime smokes cannot start honestly because QA contains no canonical seed or API-created business prerequisites: zero accessible RetentionPolicy rows, zero Subject rows, zero tenant or global Controls/ControlVersions, zero EvidenceVersions and zero EvidenceRequests. `uploadIntentCreate` requires an existing RetentionPolicy and no RetentionPolicy create operation is published. `controlAssessmentSubmit` requires a real ControlAssessment, while `controlAssessmentCreate` requires an existing Control and ControlVersion and `controlInstantiate` additionally requires an existing Subject and source ControlVersion. `evidenceRequestFulfill` requires an approved, exact-compatible EvidenceVersion; with one permitted `UserIdentity`, creating and approving that Evidence would violate the enforced reviewer independence rule. SQL provisioning, a second identity, fabricated ownership and contract expansion remain prohibited, so no smoke mutation was attempted after this preflight.

## Phase 5 RetentionPolicy reconciliation — QA materialized, SoD enrollment blocked

`PHASE_5_RETENTION_POLICY_DECISION=HUMAN_APPROVED_2026_09_24`
`PHASE_5_RETENTION_POLICY_MIGRATION_ID=20260924000200`
`PHASE_5_RETENTION_POLICY_QA_MIGRATION_EXECUTED=1`
`PHASE_5_RETENTION_POLICY_PHYSICAL_TABLES_TARGET=231`
`PHASE_5_RETENTION_POLICY_LOCAL_REBUILD=PASS_16_MIGRATIONS`
`PHASE_5_RETENTION_POLICY_LOCAL_SCHEMA_VERIFY=PASS`
`PHASE_5_RETENTION_POLICY_LOCAL_SEED_VERIFY=PASS_103_EDGES_139_ROWS`
`PHASE_5_RETENTION_POLICY_FOCUSED_TESTS=PASS`
`PHASE_5_RETENTION_POLICY_FULL_LOCAL_GATES=PASS`
`PHASE_5_RETENTION_POLICY_QA_BACKUP_VERIFIED=PASS`
`PHASE_5_RETENTION_POLICY_QA_BACKUP_SHA256=5383c52085519127854ba96ea882cc5c284573f6d63c1bb2d540e34eeefa8d87`
`PHASE_5_RETENTION_POLICY_QA_SCHEMA_VERIFY=PASS_231_TABLES_ZERO_MISMATCHES`
`PHASE_5_RETENTION_POLICY_QA_SEED_VERIFY=PASS_103_EDGES_139_ROWS`
`PHASE_5_RETENTION_POLICY_QA_BACKEND=DEPLOYED_HEALTHY`
`PHASE_5_RETENTION_POLICY_QA_BACKEND_IMAGE=sha256:17a66c259d4a7ceb6f5bffd4fdc09fe3348118db30a3e3d775f991fc4a2a1a82`
`PHASE_5_RETENTION_POLICY_RUNTIME=BLOCKED_MISSING_CANONICAL_USER_ENROLLMENT`
`RETENTION_SOD_SECOND_HUMAN_REQUIRED=YES`
`CANONICAL_ENROLLMENT_AVAILABLE=NO`

The 2026-09-24 human authorization closes the previously reported RetentionPolicy physical incompatibility. A single forward-only migration after the fifteen QA-applied migrations makes the existing effective interval nullable, adds only the approved `row_version`, closes the approved vocabularies and publishes the three registry transitions. The existing `lifecycle_state` column remains sole state authority. No historical migration, entity, table, permission, role, entitlement or disposition column changed. A clean isolated PostgreSQL 16 rebuild at `127.0.0.1:55432/tcdx-grc` applied all sixteen migrations, retained 231 tables, verified zero schema/seed mismatches, 103 authoritative lifecycle edges and 139 registry rows, and passed seed/migration replay. The complete local gate battery, including 48 Playwright checks, passed.

Before QA mutation, a PostgreSQL 16 custom-format backup was created on `db-v4` and its catalog, size and SHA-256 were verified. The canonical runner then verified all fifteen historical checksums and applied only migration `20260924000200`. QA now has sixteen applied migrations, 231 canonical tables, nullable `effective_from` and `effective_to`, `row_version bigint NOT NULL DEFAULT 1`, three published RetentionPolicy lifecycle edges, zero schema/seed mismatches and zero RetentionPolicy rows. The backend was rebuilt from byte-matched source and recreated alone; it is healthy with database `up`, while MinIO and ClamAV remain healthy. Since deployment, backend logs contain zero HTTP 5xx and zero SQL-error signatures.

The SoD gate remains blocked before any policy mutation. OIDC login can resolve or create a canonical `UserIdentity`; `membershipCreate` and `membershipRoleAssign` can then materialize membership and roles, but the published 110-operation OpenAPI has no tenant invitation/enrollment or identity-selection operation. `membershipCreate` accepts only an already-known raw `user_identity_id`, `/access/me` does not expose that identity identifier, and QA has one `UserIdentity`. Therefore no complete canonical path can bridge a second authenticated human to TenantMembership without read-only SQL/out-of-band UUID handling, which is prohibited. No second identity, membership, role assignment or RetentionPolicy was created.

## Human approval — canonical tenant-user enrollment

`PHASE_5_MEMBERSHIP_INVITATION_DECISION=HUMAN_APPROVED_2026_09_24`
`PHASE_5_MEMBERSHIP_INVITATION_MIGRATION_ID=20260924000300`
`PHASE_5_MEMBERSHIP_INVITATION_MIGRATION_MODE=FORWARD_ONLY`
`PHASE_5_MEMBERSHIP_INVITATION_APPLIED_SHA256=0942e5eb360f7157a444d7b04fbe7558312e8d782347e60a745a8d4365034806`
`PHASE_5_MEMBERSHIP_INVITATION_AUTHORITY_RECONCILIATION_MIGRATION_ID=20260925000100`
`PHASE_5_MEMBERSHIP_INVITATION_PLATFORM_PERMISSIONS=2`
`PHASE_5_MEMBERSHIP_INVITATION_PLATFORM_BASE_ROLE=PLATFORM_ADMIN`
`PHASE_5_MEMBERSHIP_INVITATION_TTL=PT24H`
`PHASE_5_MEMBERSHIP_INVITATION_PROVIDER=ZOHO_ONLY`
`PHASE_5_MEMBERSHIP_INVITATION_LOCAL_CANDIDATE=UNDER_FORWARD_ONLY_RECONCILIATION_VERIFICATION`
`PHASE_5_MEMBERSHIP_INVITATION_QA_MIGRATION_EXECUTED=1`
`PHASE_5_MEMBERSHIP_INVITATION_AUTHORITY_RECONCILIATION_QA_EXECUTED=0`

The human authority approved `TenantMembershipInvitation` as one TENANT_OWNED enrollment bridge without creating a second IAM authority. Platform Admin alone receives the two Platform-scoped create/update permissions; acceptance is a normal Zoho OIDC ceremony and has no Platform authority. The clear 256-bit token is returned once, expires after PT24H and is represented at rest only by its digest. Acceptance resolves the canonical identity by issuer plus stable subject, creates or reuses one active tenant membership and assigns no role.

Read-only QA revalidation on 2026-09-25 found that another execution had already backed up QA, applied migration `20260924000300` and deployed an enrollment candidate. QA has 232 tables, 17 applied ledger rows, 150 permissions, zero invitations, one UserIdentity and zero RetentionPolicy rows. The applied migration checksum is preserved exactly, but its four effective grants target PLATFORM_CONTROL/TENANT_OWNED `TENANT_ADMIN`, and the deployed backend resolves a tenant actor. Both conflict with the controlling Platform Admin decision. No smoke invitation was created. Reconciliation is therefore restricted to forward-only successor `20260925000100`; no applied bytes may change.

The preceding 2026-09-25 paragraph is retained as a historical observation, not the current QA state. The current state is recorded below.

## Current authorized phase

`PHASE_3=COMPLETE`
`FOUNDATIONS_RUNTIME=PASS`
`AUDIT_MODEL_MIGRATION_RUNTIME=PASS`
`PRE_F5C_QA_MIGRATION_EXECUTED=1`
`PRE_F5E_QA_MIGRATION_EXECUTED=1`
`DATABASE_TABLES_ACTIVE_QA=235`
`DATABASE_TABLES_TARGET_CANONICAL=235`
`PHASE_5_FINAL_QA_MIGRATION_EXECUTED=1`
`PHASE_5_SUBSCRIPTION_CATALOG_QA_MIGRATION_EXECUTED=1`
`PHASE_5_RETENTION_POLICY_QA_MIGRATION_EXECUTED=1`
`PHASE_4=COMPLETE`
`PHASE_4_IMPLEMENTATION=COMPLETE`
`PHASE_4_CONTENT_GATES_PARTIAL=YES`
`VISUAL_BASELINE=ACTIVE`
`VISUAL_BASELINE_ID=TCDX_GRC_VISUAL_BASELINE_v1.0`
`PHASE_5=AUTHORIZED`
`PHASE_5_API_READ_CONTRACT=APPROVED`
`PHASE_5_RELEASE_DEPENDENCIES=APPROVED`
`PHASE_5_EXECUTABLE_CONTRACTS=CLOSED`
`PHASE_5_PAGINATION_CONTRACT=PASS`
`PHASE_5_MUTATION_REQUEST_SCHEMAS=PASS`
`PHASE_5_ACTION_WORKFLOW_CONTRACT=PASS`
`PHASE_5_EVIDENCE_CREATION_CONTRACT=PASS`
`PRE_F5C_LOCAL_GATE=PASS`
`PHASE_5_EXECUTABILITY_PREFLIGHT=PASS`
`PHASE_5_RETENTION_POLICY_LOCAL_REBUILD=PASS_16_MIGRATIONS`
`PHASE_5_RETENTION_POLICY_RUNTIME=PENDING_CANONICAL_POLICY_DATA_AND_REAL_HUMAN_SOD`
`PHASE_5_MEMBERSHIP_INVITATION_DECISION=HUMAN_APPROVED_2026_09_24`
`PHASE_5_MEMBERSHIP_INVITATION_LOCAL_CANDIDATE=PASS_ISOLATED_REBUILD_AND_SECURITY_INTEGRATION`
`PHASE_5_MEMBERSHIP_INVITATION_QA_MIGRATION_EXECUTED=1`
`PHASE_5_MEMBERSHIP_INVITATION_AUTHORITY_RECONCILIATION_QA_EXECUTED=1`
`PHASE_5_ADMINISTRATIVE_READ_DECISION=HUMAN_APPROVED_2026_09_28`
`PHASE_5_ADMINISTRATIVE_READ_LOCAL_CANDIDATE=PASS_ISOLATED_REBUILD_AND_SECURITY_INTEGRATION`
`PHASE_5_ADMINISTRATIVE_READ_QA_MIGRATION_EXECUTED=1`
`PHASE_5_MEMBERSHIP_ROLE_REVOKE_DECISION=HUMAN_APPROVED_2026_09_28`
`PHASE_5_MEMBERSHIP_ROLE_REVOKE_LOCAL_CANDIDATE=PASS_20_MIGRATIONS_64_E2E`
`PHASE_5_MEMBERSHIP_ROLE_REVOKE_QA_MIGRATION_EXECUTED=1`
`PHASE_5_QA_MIGRATIONS=25`
`PHASE_5_QA_PERMISSION_ROWS=163`
`PHASE_5_QA_LATEST_MIGRATION=20260929000300`
`PHASE5_PLUS_SUBJECT_VALIDATION_DECISION=HUMAN_APPROVED_2026_09_29`
`PHASE5_PLUS_SUBJECT_VALIDATION_LOCAL_CANDIDATE=PASS_25_MIGRATIONS_235_TABLES_163_PERMISSIONS_92_E2E`
`PHASE5_PLUS_SUBJECT_VALIDATION_QA_APPLIED=YES`
`PHASE5_PLUS_QA_APPLY_REQUIRED=NO`
`PHASE5_PLUS_QA_APPLIED=YES`
`PHASE5_PLUS_TECDEX_SUBJECT_QA=CREATED_ORGANIZATION_TECDEX`
`PHASE5_PLUS_TECDEX_ACCOUNT_CLASSIFICATION_QA=test`
`PHASE5_PLUS_ISO_9001_2026_VALIDATION_PROVENANCE_QA=CREATED`
`PHASE5_PLUS_VALIDATION_ACCESS_COUNT_QA=0`
`PHASE5_PLUS_22J_CANDIDATE_READ_LOCAL_IMPLEMENTATION=PASS`
`PHASE5_PLUS_22J_CANDIDATE_READ_QA_DEPLOYED=NO`
`PHASE5_PLUS_22K_CREATE_UI_LOCAL_IMPLEMENTATION=PASS`
`PHASE5_PLUS_22K_CREATE_UI_QA_DEPLOYED=NO`
`PHASE_5_ROLE_REVOKE_QA_INTEGRITY=PASS`
`PHASE_5_SECOND_REAL_HUMAN=PASS`
`PHASE_5_STORAGE_INFRA_QA=PASS_HEALTHY_PRIVATE_AES256_VERSIONED`
`PHASE_5_STORAGE_ADAPTER_QA=PASS_PRESIGNED_SCAN_PROMOTE_GET_MALWARE_DENY_ZERO_RESIDUE`
`PHASE_5_BROWSER_UPLOAD_GATE=HUMAN_APPROVED_PRIVATE_MINIO_GRC_HTTPS_LOCAL_CANDIDATE_PENDING_QA`
`PHASE_5_FILE_DOWNLOAD_API=HUMAN_APPROVED_GRC_HTTPS_LOCAL_CANDIDATE_PENDING_QA`
`PHASE_5_RETENTION_READ_UPDATE_API=HUMAN_APPROVED_LOCAL_CANDIDATE_PENDING_QA`
`PHASE_5_EVIDENCE_RUNTIME_QA=PENDING_REAL_LIFECYCLE`
`PHASE_5_CONTROL_ASSESSMENT_START=HUMAN_APPROVED_TENANT_CONTROL_OWNER_LOCAL_MIGRATION_PENDING_QA`
`PHASE_5_CONTROL_ASSESSMENT_SUBMIT=PASS_ISOLATED_ONLY`
`PHASE_5_SOURCE_RUNTIME_PARITY=PENDING_22J_22K_QA_DEPLOYMENT`
`PHASE_5_LOCAL_TECHNICAL_BACKEND_CANDIDATE=sha256:f8d75389f936ca8f56796bb1fa6b025c3659616811a08c966090e003485ec97d`
`PHASE_5_LOCAL_TECHNICAL_FRONTEND_CANDIDATE=sha256:f8feba3feb9d846ad8b4ce1bd5344144c7397dd683a3806e14a92761d8892b7a`
`PHASE_5_LOCAL_TECHNICAL_CANDIDATE_PARITY=PASS_COMPILED_BACKEND_AND_PUBLIC_BUNDLE_SHA256`
`PHASE_5_BACKEND_QA_IMAGE=sha256:bf2c8b28e18f43ee8c09f0053400b136038a5b848f8185fb4b3438732e516bec`
`PHASE_5_FRONTEND_QA_IMAGE=sha256:2f23bd8a7b7bc634d98243f2d092acf162d8a5b2f38256de8a5df82b2bcb1713`
`PRE_F5C_PHYSICAL_RUNTIME=PASS`
`PRE_F5E=PASS`
`PRE_F5E_F5D_BLOCKERS_OPEN=0`
`PHASE_5_IMPLEMENTATION=PARTIAL_RUNTIME_VERIFIED_PENDING_REAL_LIFECYCLE`
`PHASE_5_FINAL_LOCAL_GATES=PASS_21_MIGRATIONS_68_E2E_TECHNICAL_CANDIDATE`
`PHASE_5_ADMINISTRATIVE_READ_QA_OWNER_GATE=PASS_CANONICAL_RUNNER_APPLIED`
`PHASE_5_RUNTIME_CLOSURE=PENDING_22J_22K_QA_DEPLOYMENT_REAL_SOD_AND_HUMAN_UI`
`PHASE_5_IAM_RUNTIME_UI=PASS_PRESERVED`
`CORE_GRC_SLICE=LOCAL_TECHNICAL_CANDIDATE_PENDING_QA_REAL_LIFECYCLE`
`PHASE_5_STARTED=1`
`HUMAN_UI_REVIEW=PENDING`
`PHASE_6=BLOCKED`
`PHASE_6_STARTED=0`

Phase 4 engineering is closed. Independent regulatory content gates remain open where licensed or structured content is still pending; those gates do not reopen Phase 4 implementation. Phase 5 final closure remains authorized under active v1.7. Read-only QA verification on 2026-09-28 confirms PostgreSQL 16.15, database `tcdx-grc`, 18 applied migrations and latest applied successor `20260925000100` with SHA-256 `b66f88a19323d7a92465f6e61e762dffcf511eae55e53456d811c7912d3dad8a`; the verified 232 physical domain tables and 150 pre-administrative-read permissions remain active. Two real invitations remain unaccepted and effectively expired; no second human identity or membership was materialized. The 2026-09-28 administrative-read decision is implemented as local candidate with forward-only migration `20260928000100` at SHA-256 `d19c72ce5a0b9e5caa65d8b6b93daec1b2188dee54067551bb8ac3c8c7dcdd35`, but that migration is not yet applied in QA. Exact Node.js 22.23.2/pnpm 12.4.1 local revalidation passes rector integrity/status, typecheck, build, 198 tests, contract verification, secret scan, isolated 19-migration PostgreSQL rebuild, migration/schema/seed/security gates, Phase 5 lifecycle integration and 60 Playwright checks across four viewports. Separate backend and frontend candidates were built without deployment; the running QA backend remains healthy with zero restarts, and the public runtime continues to expose its prior bundle. The canonical runner confirms only `20260928000100` is pending, but QA runtime credentials use `tcdx_grc_app` while the verified table owner is `postgres`; Codex has no non-interactive sudo authority on db-v4, so only the owner-authority migration act is blocked without changing ownership or grants. Backend/frontend deployment and administrative runtime smokes remain pending that migration. A real second human is required only for the independent QA SoD ceremonies. `HUMAN_UI_REVIEW` remains pending and Phase 6 remains blocked.

The subsequent human Phase 5 continuity report of 2026-09-28 confirms that administrative-read migration `20260928000100` was applied through the canonical runner with a prior backup, and that QA backend/frontend images and user-facing administrative UI were deployed and human-checked. Independent read-only runner verification in this continuation observes all 19 migrations applied; backend image `sha256:05a00bad6028d6f35e4fff94799d0c249e1697415cd6ec7999bc6e371848dc90` is healthy with zero restarts. The human reports Mario Cáceres enrolled canonically as a second real actor. A separate human decision authorizes closing individual tenant MembershipRole validity, using the existing `platform.role.assign` permission and separate Platform Admin grant; forward-only successor `20260928000200` has SHA-256 `d47e4fa07250092c5b8c063a60713528627acee864f93278b3c5f0ed5dd57cdc` and remains unapplied in QA. The human selected `COMPLIANCE_MANAGER` as Mario's temporary Evidence approver role for the real SoD smoke; `LEGAL_REVIEWER` remains his target ongoing role. Local 20-migration PostgreSQL 16 rebuild passes with 232 tables/154 permissions, schema/seed/migration/security/Phase 5 lifecycle gates pass, 201 unit/contract checks pass, and 64 Playwright checks pass across four viewports. The final `r2` source artifact is staged on the backend host at matching SHA-256 `30336021770f434fabafaa64828cc6dab15088ff3fff16fc52267e9cbce98aaf`; backend candidate image `sha256:e464715323972b472236984e7833db704ea241b2a948118228fc9babc86bb485` is built but not deployed and its compiled service/routes match local SHA-256. A new backup and PostgreSQL owner authority are required before QA migration 20. Authenticated administrative reads and two-human SoD runtime ceremonies are still pending independent evidence; no Phase 6 work has begun.

The next 2026-09-28 continuation checked the frontend validity display after the `r2` backend build. A MembershipRole is shown as currently assigned only when `valid_from <= now < valid_to` (or `valid_to` is open); future and ended assignments remain visible in the detail with temporal labels, and the detail does not claim that every ended interval was revoked. Rector integrity/status, workspace typecheck, frontend production build, `git diff --check` and the focused revoke UI E2E passed; the focused E2E ran in all four approved viewports. No database, migration, executable contract or backend file was changed in this continuation. Read-only QA queries observed PostgreSQL 16.15, 19 applied ledger rows ending at `20260928000100` with its expected checksum, 232 physical tables and 154 permissions; successor `20260928000200` is still pending. Read-only Docker inspection confirms candidate `tcdx-grc-backend:phase5-role-revoke-r2` at `sha256:e464715323972b472236984e7833db704ea241b2a948118228fc9babc86bb485`; the active backend remains `sha256:05a00bad6028d6f35e4fff94799d0c249e1697415cd6ec7999bc6e371848dc90`, healthy with zero restarts. QA backup, owner runner, backend/frontend deployment and real human smokes were not executed in this continuation.

The current 2026-09-28 continuation supersedes only the older QA observations above. Read-only PostgreSQL verification now observes 20 applied migrations, latest `20260928000200` with SHA-256 `d47e4fa07250092c5b8c063a60713528627acee864f93278b3c5f0ed5dd57cdc`, 232 physical tables and 154 permissions. Independent read-only schema/seed verification reports zero mismatches. Mario Cáceres is a second authenticated real identity with active TecDex membership. His historical TENANT_ADMIN MembershipRole remains present with original `valid_from=2026-09-28T15:38:16.857Z` and `valid_to=2026-09-28T18:01:52.824Z` (15:01 CLT); no active duplicate exists, and CONTROL_OWNER, EVIDENCE_OWNER and LEGAL_REVIEWER remain active. Exactly one `audit.platform.role.revoke.v1`, one `iam.role.revoked.v1` and one correlated privileged-use audit exist for that assignment, without foreign-tenant event. Backend QA runs router-fix-r1 image `sha256:fe390409c0f024dc5be4768ec02b120036adcfeb1f2541caef48322787ca7e22`, healthy with zero restarts; its compiled route, IAM service and MinIO adapter hashes match the local build. The human reports the final frontend image `sha256:dc88c0bf841ea6975de6a9e5815cd651f7ba0cebd7b5e8b4eaaad037e561dd7b` deployed and confirmed the role-removal UI; public HTML serves `index-CEmj2Gs8.js` and `index-CwTEgE07.css`. Rebuilding locally with the approved `VITE_API_ORIGIN` produced byte-identical public JS and CSS SHA-256 hashes (`5a84bb42e0ca5808830b878ee747814dcba0764f7d1c3771ae5b8d013e7c322e`, `16a3d6add6cb8f4c7a32e139dc97c4585331e4209671d02b2cdee109f7ae0f14`). QA still has zero RetentionPolicy, Subject, Requirement, Control, ControlVersion, ControlAssessment, FileUploadIntent, FileObject, EvidenceVersion or EvidenceRequest rows, so no real Evidence/Retention/ControlAssessment lifecycle smoke is claimed. Mario has no active COMPLIANCE_MANAGER grant for Evidence approval. The canonical bucket is present with AES256 encryption, versioning enabled, no bucket policy, credentials from secret files, and MinIO/ClamAV/backend healthy with zero restarts. A QA-only transient adapter probe verified signed PUT, real ClamAV scan, MIME/SHA-256, promotion, signed GET, anonymous GET deny, EICAR rejection without promotion and zero residual object versions; it created no database row and does not substitute for authenticated Evidence API/SoD smoke. Local full unit/contract/E2E and isolated PostgreSQL gates pass in this continuation, but the host Node.js is 26.4.0 rather than the rector-pinned 22.23.2, so these new local runs are recorded as supplementary to the earlier exact-toolchain passes. Human UI review, real SoD ceremonies and the published ControlAssessment Start scope contradiction remain open. Phase 6 remains blocked and unstarted.

The adapter probe is not a browser upload gate: the effective signed URL uses the internal `minio` HTTP endpoint while the frontend origin is HTTPS. No browser-reachable governed storage path is established. The published Phase 5 operation matrix also has no authorized FileObject download operation and no RetentionPolicy read/update operation, although the storage port implements signed GET. These are contract/architecture decisions, not permission to add a proxy, endpoint or UI workaround by inference. No frontend upload UI, public download route, migration or grant was added in this continuation.

This file is mutable execution state. It is not part of the immutable rector baseline and cannot override it.

## Phase 5+ human resolution and local candidate — 2026-09-29

`PHASE5_PLUS_HUMAN_DECISIONS=CLOSED`
`PHASE5_PLUS_PERMISSIONS_BEFORE=154`
`PHASE5_PLUS_PERMISSIONS_ADDED=4`
`PHASE5_PLUS_PERMISSIONS_AFTER=158`
`PHASE5_PLUS_LOCAL_VERIFIED=PASS`
`PHASE5_PLUS_QA_APPLY_REQUIRED=YES`
`PHASE5_PLUS_QA_APPLIED=NO`
`PHASE_6_READINESS=PENDING_QA_AND_HUMAN_GATES`
`HUMAN_UI_REVIEW=PENDING`

The 2026-09-29 human resolution closes pack permissions/authority, Subject read/selector and the two-value applicability vocabulary. Local PostgreSQL 16 clean rebuild applied 24 migrations to 233 tables; seed and schema verification, migration and seed replay, catalog v1.1 first import and replay (`replayed=true`), security and tenant-isolation checks passed. The catalog remained unchanged and retains five pack versions, 260 normative units, 118 requirements and 212 controls. Node.js 22.23.2/pnpm 12.4.1 passed 227 unit/contract tests, five real PostgreSQL integration tests, 84 E2E checks across four viewports, typecheck, build and contracts verification. The dedicated Phase 5+ closure report records the exact tests and QA apply sequence. No QA mutation, deployment, commit, push, PR, merge, tag or Phase 6 action occurred in this continuation.

The following human architecture resolution of 2026-09-29 authorizes SubjectCreate, canonical tenant classification and a separate non-authoritative validation-access authority. The user reports QA at 24 migrations, 233 domain tables, 158 permissions and catalog v1.1 unchanged; this task does not independently query or modify QA. Local PostgreSQL 16 rebuild applies 25 migrations to 235 domain tables/163 permissions. The new permission delta is exact, with TENANT_ADMIN-only Subject create and PLATFORM_ADMIN-only validation create/archive. Local catalog v1.1 materialization, runtime positive/negative integration, tenant isolation, security and contracts pass; 227 unit checks, six PostgreSQL integration tests, typecheck, build and 92 E2E across four viewports also pass with the rector-pinned Node.js 22.23.2. Validation access in QA, real Subject creation, human UI review, evidence/assessment ceremonies and Phase 6 remain pending. See `docs/governance/PHASE_5_PLUS_QA_MATERIALIZATION_PLAN_2026-09-29.md`.

## Phase 5+ current QA and source reconciliation — 2026-09-30

Read-only QA verification supersedes the earlier dated pending-apply observations above: 25 migrations are applied through `20260929000300`, with 235 physical tables and 163 published permissions. TecDex remains active; its canonical organization Subject `organization/tecdex` exists, account classification is `test`, ISO_9001_2026 validation provenance exists, and the current validation-access count is exactly zero. The running backend and frontend image digests are the ones recorded in the current authorized phase above. The earlier `PHASE5_PLUS_PERMISSIONS_AFTER=158` records the first Phase 5+ four-permission milestone, not the current total.

STEP 22J candidate-read backend and STEP 22K Platform Admin CREATE UI pass local implementation checks but are not deployed to QA. The current source therefore has no runtime parity claim for those steps. The 22K human UI review remains `PENDING`; real Evidence/assessment ceremonies and Phase 5 runtime/governance closure remain open. `PHASE_5=AUTHORIZED`, `PHASE_6=BLOCKED`, and `PHASE_6_STARTED=0` remain in force. No new QA mutation or deployment is recorded by this reconciliation.
