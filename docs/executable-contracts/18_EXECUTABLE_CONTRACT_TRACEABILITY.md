# Bidirectional executable-contract traceability

| Campo | Valor |
|---|---|
| Contract owner | Architecture Owner |
| Approving human roles | Architecture Owner, Data Model Owner, Backend Owner, Security & Privacy Reviewer, QA/Release Owner |
| Status | `BLOCKED_WITH_FULL_BLOCKER_TRACEABILITY` |

Coverage counts a requirement group only when implementation would not require a material decision within that group. All 32 groups are represented; 20 are closed and 12 remain blocked: `EXECUTABLE_REQUIREMENTS_COVERAGE=20/32`.

## Rector → physical model → executable contract

| # | Rector requirement | Physical authority | Executable artifact | State |
|---:|---|---|---|---|
| 1 | API major base path/versioning | API-neutral physical model | 02 conventions | CLOSED |
| 2 | UUIDv7, UTC/IANA, opaque IDs | profiles/types 01/06/10 | 02 schemas/conventions | CLOSED |
| 3 | authentication before authorization | IAM tables | 02/13 bearer base | BLOCKED: identity profile |
| 4 | tenant/ownership authorization chain | platform/iam; physical 05/08 | 05/13 | CLOSED |
| 5 | pagination/filter/sort/header/media-type wire conventions | required operational indexes 04 | 02 base proposal | BLOCKED: exact API wire conventions |
| 6 | stable safe errors | job/error columns; no secret payload | 02/06 | BLOCKED: exact codes/HTTP mapping |
| 7 | endpoints/commands traceable to capability | all 175 tables; lifecycle registry | 03 | BLOCKED: operation catalog |
| 8 | event envelope and tenant conditionality | `ops_audit.outbox_events`, EV profile | 04/15 | CLOSED |
| 9 | concrete domain/integration events | outbox + aggregates | 04 | BLOCKED: event catalog |
| 10 | permission grammar/actions/scopes/default DENY | `iam.*`; physical 08 | 05/13 | CLOSED |
| 11 | exact permissions/base-role grants | Permission/Role/RolePermission | 05/09 | BLOCKED: registry/grants |
| 12 | three plans and 20 capability groups | `platform.plans/capabilities/entitlements` | 09 | CLOSED |
| 13 | atomic capabilities | same | 05/09 | BLOCKED: decomposition/codes |
| 14 | durable idempotency/replay conflict | `ops_audit.idempotency_records`; INV-084/085 | 07 | CLOSED cross-cutting |
| 15 | operation-specific idempotency | same | 03/07 | BLOCKED: operation classification/fingerprint/retention |
| 16 | audit envelope, redaction, tenant conditionality | `ops_audit.audit_events`; physical 07 | 08 | CLOSED |
| 17 | exact audit events per command | same | 08 | BLOCKED: command/audit codes |
| 18 | seed classes/source/version/idempotency | all platform/reference registries | 09 | CLOSED structurally |
| 19 | exact permission/lifecycle/config seed rows | corresponding physical tables | 09 | BLOCKED: catalogs |
| 20 | result status/sufficiency/provenance | data/result tables; INV-060–069 | 02/06/10 | CLOSED |
| 21 | file/evidence separation and lineage | `evidence.*`; physical 07 | 14 | CLOSED |
| 22 | row version/TX invariants/concurrency | M/TM profiles; physical 03 | 12 | CLOSED |
| 23 | ACID mutation + audit/outbox; eventual cross-domain | `ops_audit.*` and aggregate ownership | 12/15 | CLOSED |
| 24 | OTel/Prometheus/Grafana/Loki/correlation | ops audit/health tables | 16 | CLOSED |
| 25 | AI assistance only via `ia2.tcdx.int` | `ai.*` typed provenance | 17 | CLOSED boundary; runtime purpose/provider decisions tracked separately |
| 26 | mandatory test evidence/gates | all constraints and tables | 10 | CLOSED tool-independent |
| 27 | immutable ordered transactional migration principles | approved physical model as target | 11 | CLOSED principles |
| 28 | migration naming/runner/ledger/checksum mechanics | no selected executable object | 01/11 | BLOCKED |
| 29 | temporal/version/retention/deletion semantics | physical 06 and table policies | 07/08/11/14 | CLOSED |
| 30 | lifecycle states and no generic status write | lifecycle fields/definitions | 03/10/12 | CLOSED semantics |
| 31 | executable transition edges/policies/events | lifecycle registry tables | 03/05/08/09 | BLOCKED: published transition registry |
| 32 | canonical entity/relationship coverage | physical 12: 175/175; unsourced=0 | all artifacts | CLOSED |

## Executable contract → physical model → rector

| Contract family | Physical objects/invariants consumed | Rector authority | Unsourced objects/semantics |
|---|---|---|---:|
| API base schemas | UUIDv7, row_version, result fields, physical types | 25,27,38,39,43 | 0 |
| Auth/RBAC | platform/iam tables, ownership classes, composite tenant FKs | 09,22,42 | 0 |
| Events/outbox | EV profile, outbox, aggregate IDs | 21,25,34,40 | 0 |
| Errors | technical error fields and result status separation | 25,26,38 | 0; proposed names not published |
| Idempotency/concurrency | idempotency record, M/TM row_version, INV-084–086 | 25 | 0 |
| Audit | audit event schema, retention and actor FKs | 22–25,39 | 0 |
| Seeds | plans/capabilities/roles/permissions/lifecycles/scales/packs | 21,22,38,41,42 | 0 |
| Tests | physical constraints/invariants/retention/lineage | 06,13,26,28,43–46 | 0 |
| Migration | whole approved physical model | 43/46 and physical review PASS | 0 |
| Files/evidence | FileObject→Document/Evidence typed chains | 24,44 | 0 |
| Observability | audit/outbox/jobs/health and correlation | 26,43 | 0 |
| AI | AIJob/Recommendation/typed provenance | 26,36,43,46 | 0 |

## Critical end-to-end chain

`FrameworkVersion → NormativeUnit → Requirement → RequirementControlMapping → ControlVersion/Control tenant → Assessment/Evidence → IssueOrigin/Issue → Action → ActionVerification` is preserved by physical FKs and artifacts 03, 05, 08, 10 and 14. No operation is published until each link has an approved command, permission, audit/event mapping and test.

## Orphan scans

```text
ENDPOINTS_WITHOUT_SOURCE=0
EVENTS_WITHOUT_SOURCE=0
PERMISSIONS_WITHOUT_SOURCE=0
SEEDS_WITHOUT_SOURCE=0
AUDIT_EVENTS_WITHOUT_SOURCE=0
TEST_CONTRACTS_WITHOUT_REQUIREMENT=0
MATERIAL_DECISIONS_WITHOUT_OWNER=0
```

Zero is achieved by leaving unapproved codes/operations unpublished, not by treating blocker families as executable contracts.
