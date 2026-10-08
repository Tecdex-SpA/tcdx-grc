# TCDX GRC — Phase 5+ local closure and QA handoff

Date: 2026-09-29. This report indexes the requested 62 topics. The prior 53-section report text was not present in the workspace; sections 1–53 below reconstruct the current slice from executable evidence. Historical status statements in `MASTER_EXECUTION_STATUS.md` remain historical.

## 1. MASTER_REGENT

`TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23` is active.

## 2. RECTOR_GATE

`RECTOR_GATE=PASS` for this locally authorized Phase 5+ slice; no new unresolved rector contradiction was found.

## 3. CURRENT_PHASE

Phase 5 Core GRC remains active. Phase 6 has not started.

## 4. HUMAN_DECISIONS

The 2026-09-29 resolution closes pack authority, Subject read and applicability vocabulary.

## 5. SCOPE_BOUNDARY

No historical migration, catalog v1.1 source, QA runtime or licensed-content field was modified by this closure.

## 6. VISUAL_AUTHORITY

`docs/ui/VISUAL_BASELINE_MANIFEST.json` and its active contracts were read before frontend changes. Approved local branding and layout remain authoritative; `HUMAN_UI_REVIEW=PENDING`.

## 7. PHYSICAL_AUTHORITY

The existing `platform.subscription_regulatory_packs`, `org.subjects` and `regulatory.requirement_applicabilities` remain the only physical authorities for these slices.

## 8. FORWARD_ONLY_MIGRATION

`20260929000200_phase5_plus_permissions_applicability.sql` follows the previously implemented pack-relation migration. It adds four permissions and two applicability CHECK constraints without changing historical migrations or creating a table.

## 9. PACK_RESOURCE

Subscription–RegulatoryPackVersion assignment is a separate commercial resource. It never reuses `platform.subscription.create` for assignment management.

## 10. PACK_LIFECYCLE

Activation creates a UUIDv7 assignment with required `effective_from`; revocation closes the approved interval/lifecycle and preserves the row.

## 11. PACK_CONCURRENCY

Activation/revocation use idempotency; revocation uses strong `If-Match`/CAS. The database exclusion rule rejects overlapping assignments for the same subscription and exact pack version.

## 12. PACK_VERSION_SEMANTICS

Entitlement uses an explicitly assigned, currently effective pack version. New editions are not inherited; separately contracted editions can coexist.

## 13. PACK_API

List/detail/activate/revoke and published-version selection use project operation IDs and response envelopes; the revoke literal route uses `:id(.*)::revoke` and has positive/negative tests.

## 14. PACK_READ_SCOPE

Platform Admin reads platform scope. Tenant Admin reads only the authenticated tenant's current subscription; client-supplied tenant IDs cannot widen scope.

## 15. PACK_WRITE_SCOPE

Only Platform Admin can activate or revoke; backend authorization denies tenant mutation even when invoked outside the frontend.

## 16. PACK_AUDIT

Mutations persist actor, reason where required, correlation, audit and outbox records under the existing contracts.

## 17. PACK_HISTORY

Revocation removes future entitlement to licensed normative content while retaining historical applicability, tenant-owned controls, evidence and audit rows.

## 18. CONTRACTED_VS_LICENSED

`PACK_CONTRACTED != CONTENT_LICENSED`. Existing ISO versions remain `NOT_YET_LICENSED`; no licensed statement/content/ref was populated.

## 19. CATALOG_V1_1

The catalog source remains unchanged. Isolated import yielded five pack versions, 260 normative units, 118 requirements and 212 controls; second import returned `replayed=true`.

## 20. SUBJECT_AUTHORITY

`organization.subject.read` is the only selector permission; no parallel Subject permission or UserIdentity substitute exists.

## 21. SUBJECT_PROJECTION

The tenant-scoped Subject endpoint returns only ID, type, canonical key, display name and lifecycle state, with search/type/cursor paging.

## 22. SUBJECT_SELECTION

Control creation uses an authorized Subject selector and sends `subject_id`. Backend rejects foreign, archived, inactive or ineffective Subjects.

## 23. APPLICABILITY_VOCABULARY

Persisted `applicability_decision` is exactly `applicable|not_applicable`; pending work is represented by lifecycle.

## 24. NOT_APPLICABLE_RATIONALE

`not_applicable` requires a nonempty, non-whitespace rationale in API and PostgreSQL validation; it remains historical.

## 25. APPLICABLE_MEANING

`applicable` can omit rationale unless another contract requires it. It creates no compliance result or score.

## 26. APPLICABILITY_SOD

The existing author/reviewer segregation prevents self-approval where policy applies; a distinct authorized actor can approve.

## 27. APPLICABILITY_UI

The UI selects “Aplicable” or “No aplica”, enforces N/A justification and displays decision separately from lifecycle and reviewer information.

## 28. COMPANY_PACKS_UI

Configuraciones → Empresas → tenant → Marcos contratados shows pack/name/edition/license class/contract state/interval/effective state from API data.

## 29. COMPANY_PACKS_ACTIONS

Platform Admin sees activation/revocation. Tenant Admin sees a read-only current-tenant page; other tenant roles receive no commercial management surface.

## 30. CONTROL_CATALOG

The catalog displays code, name, authorized framework, applicability, implementation, lifecycle and version.

## 31. CONTROL_SEARCH

Server-side search covers control code/name and authorized normative references; no uncontracted framework is exposed by search.

## 32. CONTROL_FRAMEWORK_FILTER

The Control page's `framework_filters` comes from effective contracted framework versions independently of control result pagination. Foreign/uncontracted filters return no rows.

## 33. CONTROL_DETAIL

Detail shows definition, authorized normative mappings, applicability, tenant implementation and permitted assessment/evidence relations.

## 34. NEW_CONTROL

The normal flow selects an authorized ControlVersion and Subject, uses closed control vocabularies and contains no manual business-owner UUID input.

## 35. SHARED_CONTROLS

Global shared controls are visible only through effective pack/framework mappings; tenant-owned historical controls persist after revocation.

## 36. FRONTEND_TERMINOLOGY

Commercial state and unlicensed-content labels are human-readable Spanish; effective pack state is distinct from contract lifecycle.

## 37. FRONTEND_AUTHORITY

Frontend visibility is advisory. Backend permissions, tenant context, pack entitlement and object checks remain the authority.

## 38. CARRIL_A

A1–A12 are implemented locally across Company packs, backend visibility, shared/catalog controls, search/filter, applicability, selectors, closed vocabularies, detail, terminology, lifecycle actions and human-flow preparation.

## 39. CARRIL_B

The operational prerequisites for the local Phase 5 flow are implemented: Subject selection, pack assignment authority, storage transport, IAM/role checks, lifecycle, audit and test configuration.

## 40. CARRIL_C

Later risk/audit/third-party/integration/analytics/AI capabilities remain documented in `PHASE5_PLUS_DEFERRED_CAPABILITIES.md` without Phase 6 work.

## 41. CONTRACT_ASSETS

OpenAPI, operation matrix, permission catalog, event/audit/idempotency contracts, seed and migration manifests, expected schema and generated assets reflect the local candidate.

Phase 5+ changed-file groups: `database/migrations/20260929000100_phase5_subscription_regulatory_pack_authority.sql`, `20260929000200_phase5_plus_permissions_applicability.sql`, `database/migrations/manifest.json`, `database/expected-schema.json`, `database/seed-manifest.json`; `apps/backend/src/regulatory/{pack-contract,pack-entitlement,tenant-read}.ts`, `apps/backend/src/core-grc/{routes,repository,service,subject-read}.ts`; `apps/frontend/src/{core-grc.tsx,i18n/display-text.ts,i18n/status-labels.ts}`; executable contracts `02`–`05`, `07`–`10`, `18`–`19`; associated unit/PostgreSQL/E2E tests, `scripts/foundations/{generate-contract-assets.mjs,verify-seeds.ts}`, `package.json`, `vitest.integration.config.ts`, and this mutable governance report/status. The shared worktree also contains earlier uncommitted Phase 5 files; their pre-existing state was preserved.

## 42. DATABASE_REBUILD

Isolated PostgreSQL 16 clean rebuild passed with 24 migrations and 233 physical tables.

## 43. DATABASE_REPLAY

Migration replay, seed replay, schema verification and migration checksum/concurrency/unknown-ledger gates passed.

## 44. SEED_VERIFICATION

Seed verification passed with 158 published permissions and zero mismatches; exact Phase 5+ grant drift is verified.

## 45. SECURITY_VERIFICATION

`security:verify` passed its three PostgreSQL security scenarios; `db:tenant-isolation` passed 12 checks.

## 46. CROSS_ENTITLEMENT

Pack temporal integration and control projection tests cover effective/future/expired/revoked versions, cross-tenant DENY and uncontracted framework exclusion.

## 47. TYPECHECK

Workspace typecheck passed under Node.js 22.23.2 and pnpm 12.4.1.

## 48. BUILD

Workspace production build passed under the same exact toolchain.

## 49. UNIT_AND_CONTRACT_TESTS

`pnpm test` passed 227 tests in 33 files. Its five conditional PostgreSQL files were executed separately by `pnpm test:integration` without skips.

## 50. INTEGRATION_TESTS

`pnpm test:integration` passed all five real isolated PostgreSQL 16 files under the exact toolchain.

## 51. E2E_AND_VISUAL_CHECKS

Playwright passed 84/84 checks in desktop, laptop, tablet and narrow viewports, including pack, Subject, applicability and framework-filter flows. Browser screenshots are local evidence; human visual approval remains pending.

## 52. INTEGRITY_AND_HYGIENE

`contracts:verify`, rector integrity/status, secret scan and `git diff --check` passed locally; the final repeat is recorded with the handoff.

## 53. EXACT_QA_PLAN

1. Human QA owner reviews this candidate and records approval to apply; capture a PostgreSQL 16 backup and rollback point before mutation.
2. Confirm QA's current migration ledger, checksums, Node/pnpm images and deployed backend/frontend hashes read-only; reconcile the 20 previously observed QA migrations with the 24 local candidates.
3. Apply pending forward-only migrations in manifest order with the canonical PostgreSQL owner runner. Never edit or replay historical migration files in place.
4. Run `db:verify`, `seed:verify`, migration/seed replay, migration gates and tenant isolation in QA. Confirm 233 tables, 158 permissions and exact grants.
5. Import unchanged catalog v1.1; repeat the import and require `replayed=true`, with five pack versions, 260 normative units, 118 requirements and 212 controls. Confirm ISO license classifications remain `NOT_YET_LICENSED`.
6. Build/publish approved backend/frontend candidate images from the reviewed source and exact toolchain; deploy only after database gates and capture image digests, health, logs and runtime contract parity.
7. Run authenticated Platform Admin pack read/activate/revoke, Tenant Admin own read and mutation/foreign read DENY, no-permission DENY, future/expired/revoked/exact-version cases, CAS/idempotency and audit/outbox checks.
8. Run authenticated tenant Subject search/paging/type/selection, cross-tenant and ineffective Subject DENY; complete two-human applicability N/A rationale and SoD approval, Control instantiate/assessment/evidence/file lifecycle and pack-revocation history checks with real roles and no SQL business fixture.
9. Run full API/security/integration/E2E regression in four viewports against QA; capture human visual review, licensed-content and data-retention evidence.
10. Record all QA and human gate decisions. Keep Phase 6 pending until those independent gates pass. This plan is a handoff; none of its QA steps were executed here.

## 54. PACK_PERMISSION_CODES

`platform.subscription_regulatory_pack.read` = READ; `.create` = ACTIVATE; `.archive` = REVOKE/ARCHIVE. No generic update or physical delete permission was added.

## 55. PACK_PERMISSION_GRANTS

`PLATFORM_ADMIN`: read/create/archive at platform scope. `TENANT_ADMIN`: read at tenant scope. No other tenant role has a pack management grant.

## 56. SUBJECT_PERMISSION_RESULT

`organization.subject.read` did not exist in the 154-permission prestate and was published once by forward-only migration. No duplicate or parallel selector permission was added.

## 57. SUBJECT_PERMISSION_GRANTS

Tenant-scoped baseline grants: `TENANT_ADMIN`, `GRC_MANAGER`, `QUALITY_MANAGER`, `COMPLIANCE_MANAGER`, `CISO_SECURITY_MANAGER`, `AI_GOVERNANCE_MANAGER`, `PRIVACY_MANAGER`, `PROCESS_OWNER`, `CONTROL_OWNER`. Existing tenant copies receive the same exact grant. `VIEWER` and Report Viewer receive none.

## 58. APPLICABILITY_VOCABULARY

`applicable`, `not_applicable` only. DRAFT/SUBMITTED represent unapproved work; APPROVED plus decision defines the approved outcome.

## 59. NOT_APPLICABLE_VALIDATION

OpenAPI conditional schema, backend validation, UI validation and PostgreSQL CHECK require a nonblank rationale for `not_applicable`; SoD and audit/outbox remain in force.

## 60. PERMISSIONS_BEFORE_AFTER

`PERMISSIONS_BEFORE=154`; `PERMISSIONS_ADDED=4`; `PERMISSIONS_AFTER=158`. Added exactly: `platform.subscription_regulatory_pack.read`, `platform.subscription_regulatory_pack.create`, `platform.subscription_regulatory_pack.archive`, `organization.subject.read`.

## 61. FULL_E2E_RESULT

`FULL_E2E_RESULT=PASS_84_OF_84_FOUR_VIEWPORTS` with Node.js 22.23.2 and pnpm 12.4.1. No failed scenario was skipped to achieve PASS.

## 62. LOCAL_PHASE5_PLUS_CLOSURE

`RECTOR_GATE=PASS`; `PHASE_5_PLUS_LOCAL_VERIFIED=PASS`; `QA_APPLY_REQUIRED=YES`; `PHASE_6_READINESS=PENDING_QA_AND_HUMAN_GATES`; `HUMAN_UI_REVIEW=PENDING`. Database and executable contracts, backend, frontend and local build artifacts changed. This human-resolution slice changed no infrastructure or deployment contract; QA infrastructure/deployment state did not change. No commit, push, PR, merge or tag was created.
