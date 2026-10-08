# Bidirectional executable-contract traceability

| Campo | Valor |
|---|---|
| Contract owner | Architecture Owner |
| Approving human roles | Architecture Owner, Data Model Owner, Backend Owner, Security & Privacy Reviewer, QA/Release Owner |
| Status | `COMPLETE_CANDIDATE_FOR_HUMAN_REVIEW` |

All 32 executable-requirement groups remain represented and freeze-closed after applying H-001..H-006 plus the approved PRE-F5 and PRE-F5B amendments: `EXECUTABLE_REQUIREMENTS_COVERAGE=32/32`.

## Rector -> physical model -> executable contract

| # | rector requirement | physical authority | executable artifact | state |
|---:|---|---|---|---|
| 1 | API major version/base path | API-neutral model | 02 | CLOSED |
| 2 | UUIDv7, UTC/IANA, opaque IDs | profiles 01/06/10 | 01/02/10 | CLOSED: exact uuid `14.0.2` approved by H-001 |
| 3 | OIDC/OAuth identity before authorization | `iam.*` | 02/13 | CLOSED |
| 4 | tenant/ownership authorization chain | physical 05/08 | 05/13 | CLOSED |
| 5 | headers/media type/cursor/filter/sort | operational indexes 04 | 02/10 | CLOSED: ten Phase 5 collections use opaque cursor pagination, page size 1..100/default 25 and exact stable order |
| 6 | stable safe errors | job/error/result columns | 02/06 | CLOSED |
| 7 | public operations traceable to capability/model | frozen entities/lifecycle | 02/03 | CLOSED: OP-B01..03 reconciled by H-003..H-005; PRE-F5C adds only the nine approved Core GRC create/transition operations without a new entity/capability |
| 8 | event envelope/tenant conditionality | outbox EV profile | 04/15 | CLOSED |
| 9 | concrete events/versions/payload/consumers | outbox + aggregates | 04 | CLOSED: 57 types; Evidence creation has no contractually required consumer |
| 10 | permission grammar/scopes/default DENY | `iam.*`; physical 08 | 05/13 | CLOSED |
| 11 | exact permissions and grants | Permission/Role/RolePermission | 05/09 | CLOSED: 154 runtime/executable permission rows after the forward-only Phase 5 runtime, Subscription, membership-invitation and administrative-read catalog releases; invitation create/update remain Platform Admin only; default DENY |
| 12 | three plans / 20 groups | platform plan/capability/entitlement | 05/09 | CLOSED |
| 13 | atomic capability codes | same | 05/09 | CLOSED one-to-one non-expanding decomposition |
| 14 | PostgreSQL idempotency authority | `ops_audit.idempotency_records` | 07/12 | CLOSED |
| 15 | per-operation/transition idempotency | same | 03/07/09 | CLOSED: 86 POST operations key-required; 35 GET operations naturally idempotent |
| 16 | audit envelope/redaction/conditional tenant | `ops_audit.audit_events` | 08 | CLOSED |
| 17 | exact audit codes/mappings | same | 03/08/09 | CLOSED: 161 unique active codes derived from 87 audited operation mappings, the acceptance callback fact and 103 current lifecycle keys; evidenceRequestFulfill uses only `audit.lifecycle.evidence_request.fulfill.v1` |
| 18 | seed source/version/checksum/idempotency | physical registries | 09 | CLOSED |
| 19 | exact permission/lifecycle/config seed rows | registry tables | 09 | CLOSED: approved Permission/grant manifests, intentional empty config-value manifest and exact dismissed edges |
| 20 | result/sufficiency/provenance | data/result tables | 02/06/10 | CLOSED |
| 21 | file/evidence lineage | `evidence.file_upload_intents`, `evidence.file_objects`, Evidence relations | 02/03/04/05/10/14 | CLOSED: durable expirable pre-materialization intent, real quarantine/scan/hash/MIME/promotion, final scan-PASS FileObject and exactly six typed EvidenceLink targets |
| Phase 5 browser file transport | Human decision 2026-09-28; rector 24 | existing FileUploadIntent/FileObject and private MinIO adapter | 02/03/14 | Local candidate: GRC HTTPS authenticated PUT/GET streaming, no private hostname delivered to browser; QA deployment and real lifecycle remain pending |
| Phase 5 ControlAssessment Start | Human decision 2026-09-28; rector 21/22/25 | existing `controls.control_assessments` and versioned lifecycle registry; migration `20260928000300` | 02/03/05/09/10 | Local candidate: CONTROL_OWNER tenant grant, published v3 tenant edge, CAS and existing start audit; submit unchanged |
| Phase 5 RetentionPolicy read/update | Human decision 2026-09-28; rector 21/22/23; H-004 | existing `privacy.retention_policies`; no DDL | 02/03/05/08/10 | Local candidate: tenant read/list and draft-only update of retention seconds/mandatory flag using strong If-Match, row CAS and update audit; QA policy creation and human SoD deferred |
| 22 | transaction/concurrency/row version | M/TM profiles; invariants | 12 | CLOSED: every same-row F5 workflow target has explicit `row_version`; business version fields and `xmin` are not CAS authority |
| 23 | atomic mutation+audit+outbox | aggregate + `ops_audit.*` | 04/08/12/15 | CLOSED |
| 24 | OTel/Prometheus/Grafana/Loki/correlation | audit/job/health | 16 | CLOSED |
| 25 | AI assistance via `ia2.tcdx.int` only | `ai.*` | 17 | CLOSED; provider runtime gate explicit |
| 26 | reproducible toolchain and test evidence | all constraints | 01/10 | CLOSED: exact toolchain and `pg` pins HUMAN_APPROVED by H-001/H-002; PRE-F5B cross-catalog tests added |
| 27 | immutable ordered migration policy | whole model target | 11 | CLOSED |
| 28 | project runner/naming/ledger/checksum/lock | approved foundations boundary | 01/11 | CLOSED |
| 29 | temporal/retention/deletion semantics | physical 06/table policies | 07/08/11/14 | CLOSED |
| 30 | no generic status writes | lifecycle definitions | 09/12 | CLOSED |
| 31 | exact lifecycle edges/policies/events | `ops_audit.lifecycle_transition_* ` | 02/03/05/08/09/10 | CLOSED: 103 authoritative edges, including the exact three-edge RetentionPolicy path; exactly two `Issue -> dismissed` rows remain internal; all absent edges DENY |
| 32 | canonical entity/relationship coverage | physical 12: 175/175 | all | CLOSED |

## Executable contract -> physical model -> rector

| contract family | physical objects/invariants | rector sources | unsourced |
|---|---|---|---:|
| API/auth/RBAC | platform/iam, ownership, tenant FKs | 09,22,25,42 | 0 |
| operations/errors/idempotency | aggregates, row_version, idempotency | 21,25,38 | 0 |
| events/audit/outbox | `ops_audit.*`, EV profile | 21,22,25,34,40 | 0 |
| seeds/lifecycles | plan/capability/role/permission/transition/methodology/packs | 21,22,38,39,41,42 | 0 |
| migration/concurrency | approved physical model/invariants | 23,25,43,46 | 0 |
| evidence/files | typed evidence/document/file chains | 24,44 | 0 |
| tests/observability | constraints, audit/jobs/health | 26,28,43–46 | 0 |
| AI | AIJob/Recommendation/provenance | 26,36,43,46 | 0 |

## Cross-catalog cardinality

```text
PUBLIC_API_OPERATIONS=121
PUBLIC_READ_OPERATIONS=35
PUBLIC_MUTATING_OPERATIONS=86
PUBLISHED_DOMAIN_INTEGRATION_EVENTS=56
PUBLISHED_EXECUTABLE_PERMISSION_CONTRACTS=154
RUNTIME_PERMISSION_ROWS=154_AFTER_ADMINISTRATIVE_READ_CATALOG_RELEASE
PUBLISHED_LIFECYCLE_EDGES=103
PUBLISHED_AUDIT_EVENT_CODES=160
UNSOURCED_CONTRACTS=0
```

Every public operation has capability, permission/authenticated-context, tenant semantics, idempotency, audit decision, event decision, transaction boundary, physical entities and rector source. Every lifecycle edge has permission, preconditions/SoD, audit, event decision, idempotency/concurrency and source. Every seed row has owner/source/stable key/version/update/environment/dependencies.

## Orphan scans

```text
ENDPOINTS_WITHOUT_SOURCE=0
EVENTS_WITHOUT_SOURCE=0
PERMISSIONS_WITHOUT_SOURCE=0
SEEDS_WITHOUT_SOURCE=0
AUDIT_EVENTS_WITHOUT_SOURCE=0
LIFECYCLE_EDGES_WITHOUT_PERMISSION=0
TEST_CONTRACTS_WITHOUT_REQUIREMENT=0
MATERIAL_DECISIONS_WITHOUT_OWNER=0
```

H-001..H-006, DR-PHASE5-API-READ-2026-09-17-002, DR-PRE-F5B-2026-09-21-004 and DR-PRE-F5C-2026-09-21-005 are the cited human authority for the current rows. No LegalHold entity, capability, hard-delete operation, dismissed exit, tenant registry, generic Evidence target or inferred configuration default is introduced.

## STEP 22J — validation candidate read traceability

Human STEP 22J approval binds `validationAccessCandidateList` to rector 22/25/46, the Phase 5+ amendment, OpenAPI 02, operation matrix 03, permission catalog 05 and test contract `TC-F5PLUS-CANDIDATE-001`. The read joins the existing regulatory pack, version, validation provenance, import manifest and source tables. It is a derived RO projection with no tenant enumeration, normative text, audit, domain event, idempotency record, commercial entitlement or licence assertion. Production and absent Platform Admin read authority deny. The tenant access list and published commercial selector keep their independent predicates.

## PRE-F5E post-Phase-2 traceability

PRE-F5E preserves the earlier traceability history and publishes the following 2026-09-23 candidate reconciliation:

| PRE-F5E item | rector / human authority | physical authority | executable evidence | result |
|---|---|---|---|---|
| Platform human authority | human PRE-F5E F5D-001 2026-09-23; active rector v1.6 09/22/30/33/39 | candidate `iam.platform_role_assignments`; existing UserIdentity/Role/RolePermission/Permission | physical PRE-F5E amendment; migration `20260923000100`; 13/19/21 | `CLOSED` |
| `tenantCreate` | human PRE-F5E F5D-002 2026-09-23; rector v1.6 candidate 21/39 | `platform.tenants`; active/confidential server defaults and classification CHECK | 02 `TenantCreateRequest`/`TenantProjection`; 03/19/21 | `CLOSED_BY_HUMAN_DECISION_PRE_F5E` |
| `membershipCreate` | human PRE-F5E F5D-003 2026-09-23; rector v1.6 candidate 21/22/39 | `iam.tenant_memberships`; active server default | 02 `MembershipCreateRequest`/`TenantMembershipProjection`; 03/19/21 | `CLOSED_BY_HUMAN_DECISION_PRE_F5E` |
| `membershipInvitationCreate`, `membershipInvitationRevoke`, `MEMBERSHIP_INVITATION_ACCEPT` | DR-PHASE5-CANONICAL-TENANT-USER-ENROLLMENT-2026-09-24 | `iam.tenant_membership_invitations`; existing canonical UserIdentity/TenantMembership | 02/03/04/05/07/08/11/12/13; migration `20260924000300`; backend OIDC/IAM; minimal frontend | `AUTHORIZED_PHASE5_QA_ZOHO_ONLY` |
| `membershipRoleAssign` | human H5; rector 22/23/42 | `iam.membership_roles` existing columns/scopes/validity | 02 `MembershipRoleAssignRequest`/projection; 03/19/21 | `CLOSED_BY_HUMAN_DECISION_PRE_F5E` |
| `membershipRoleRevoke` | human Phase 5 decision 2026-09-28; rector 22/23/25/42 | existing `iam.membership_roles.valid_to`; existing published `platform.role.assign`; forward-only Platform Admin grant migration `20260928000200`; no table/identity/PlatformRoleAssignment change | 02 closed request/ETag/response; 03/04/05/08/19; backend transactional CAS, audit/outbox/idempotency; Users UI; isolated PostgreSQL and E2E tests | `LOCAL_CANDIDATE_PENDING_QA` |
| own tenant-context discovery | human H6; rector 09/22/42 | UserIdentity/Membership/Role/Tenant existing relations | 02 `EffectiveAccess.available_tenant_contexts`; 03/19/21 | `CLOSED_BY_HUMAN_DECISION_PRE_F5E` |
| TCDX application JWT | human H2/H7/H8; rector 25/26/34/43 | no canonical schema change; secrets/runtime state external | 02 bearer profile; 08/13/19/21 | `CLOSED_BY_HUMAN_DECISION_PRE_F5E` |
| first Platform Admin bootstrap | human F5D-007 decision 2026-09-23; active rector v1.6 09/22/39 | candidate `iam.platform_role_assignments`, canonical PLATFORM_ADMIN Role row and `ops_audit.audit_events`; no bootstrap table | internal one-time command contract in 08/10/13/19/21; no public OpenAPI operation | `CLOSED_RUNTIME_CEREMONY_DEFERRED` |

```text
PRE_F5E_TRACEABILITY=7/7_ACCOUNTED
PRE_F5E_CLOSED=7
PRE_F5E_BLOCKED=0
PRE_F5E_HUMAN_ACTIVATION_PENDING=0
PRE_F5E_UNSOURCED_CONTRACTS=0
```

## Phase 5 fast-track traceability

| item | rector / human authority | physical authority | executable evidence | result |
|---|---|---|---|---|
| tenant bootstrap | Phase 5 fast-track Decision B 2026-09-23; SEED-010; rector 09/22/25/42 | existing `platform.tenants`, `iam.user_identities`, `iam.roles`, `iam.role_permissions`, `iam.tenant_memberships`, `iam.membership_roles`, `ops_audit.audit_events`; no new table | internal `TENANT_BOOTSTRAP` service; `TC-PHASE5-TENANT-BOOTSTRAP-001`; canonical privileged-use audit; no public OpenAPI operation | `IMPLEMENTED_LOCAL_REAL_POSTGRESQL` |
| RetentionPolicy lifecycle | human Phase 5 RetentionPolicy authorization 2026-09-24; rector 21/22/23/25/39/42; H-004 | existing `privacy.retention_policies` plus nullable effective interval and row_version in migration `20260924000200`; existing lifecycle/audit/outbox/idempotency tables | operations create/review/approve/publish; three SEED-007 edges; `TC-PHASE5-RETENTION-001`; strong If-Match; author/approver SoD | `IMPLEMENTED_LOCAL_CANDIDATE_PENDING_GATES_AND_QA` |

## Phase 5+ human-resolution traceability — 2026-09-29

| slice | human/rector authority | physical and executable contract | runtime and test evidence | local result |
|---|---|---|---|---|
| Pack entitlement | Human Phase 5+ §§1–5,14–16; rector 16/22/37/44/46 | existing `platform.subscription_regulatory_packs`; forward-only `20260929000200`; three resource permissions; OpenAPI/matrix/audit/idempotency | `pack-contract.ts`, `pack-entitlement.ts`, `pack-temporal.postgres.test.ts`, Company packs E2E | PASS_LOCAL; QA pending |
| Subject read | Human Phase 5+ §§6–9; rector 16/22/44/46 | existing `org.subjects`; `organization.subject.read` and nine exact tenant roles; minimal scoped page | `subject-read.ts`, `phase5-lifecycle.postgres.test.ts`, Control Subject selector E2E | PASS_LOCAL; QA pending |
| Applicability | Human Phase 5+ §§10–13; rector 21/22/44/46 | existing `regulatory.requirement_applicabilities`; closed CHECK and N/A rationale CHECK; OpenAPI conditional validation | `service.ts`, `phase5-lifecycle.postgres.test.ts`, applicability selector E2E | PASS_LOCAL; QA pending |
| Controls filter | Human Phase 5+ §§17,20; rector 16/22/44/46 | existing Control list envelope extended with `framework_filters`, derived from effective pack/framework links | `repository.ts`, `phase5-lifecycle.postgres.test.ts`, four viewport filter E2E | PASS_LOCAL; QA pending |


## STEP 23L-TENANT-ONBOARDING-D1-R

| Human-approved slice | API/Permission | Canonical physical path | Contract authority | Runtime status |
|---|---|---|---|---|
| Privacy identity discovery | userIdentityDiscovery / platform.user_identity.read; platform and tenant scopes | iam.user_identities, existing RolePermission/grant/context chains, safe provider metadata, ops_audit.audit_events | D1-R human decision; executable25;02/03/05/08/13 | LOCAL_ONLY; Permission runtime0 |
| Initial company/admin onboarding | tenantInitialOnboardingCreate; existing platform.tenant.create plus new discovery Permission | platform.tenants, existing roles/grants/Membership/assignment, audit/idempotency/outbox; no new entity | D1-R human decision; fast-trackB;SEED010; executable25 | LOCAL_ONLY; no caller implemented; TENANT_BOOTSTRAP_PUBLIC_ENDPOINT=0 |

No schema/SQL/runtime/generated-source change. G6/G7/G8 and MI10 activation remain deferred/frozen.

## Managed Identity tenant onboarding E2E — 2026-10-07

Human MI tenant E2E packet -> DR-2026-10-07-MANAGED-IDENTITY-TENANT-ONBOARDING -> executable26 -> tenantUserOnboardingCreate / userIdentityTenantAccessList -> one DATA-ONLY Permission publication -> exact same-freeze backend/frontend -> isolated security/UI regression -> authorized QA safe verification -> pending human functional test.

## Approved Phase 5 methodology amendment

See [27 — canonical methodology binding](27_PHASE5_METHODOLOGY_BINDING.md) and the explicit human architecture approval. Migration `20261007000200` produces 30 migrations / 237 physical tables / 172 permissions. Seeds: separate Compliance and Control Effectiveness version 1, two compatible FormulaDefinitions, two narrowly scoped read permissions; publication audit `audit.compliance.methodology.publish.v1` and `audit.controls.methodology.publish.v1`. No historical migration or immutable rector file is changed.
