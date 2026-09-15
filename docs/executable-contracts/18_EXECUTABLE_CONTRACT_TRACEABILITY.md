# Bidirectional executable-contract traceability

| Campo | Valor |
|---|---|
| Contract owner | Architecture Owner |
| Approving human roles | Architecture Owner, Data Model Owner, Backend Owner, Security & Privacy Reviewer, QA/Release Owner |
| Status | `COMPLETE_CANDIDATE_FOR_HUMAN_REVIEW` |

All 32 executable-requirement groups are represented and freeze-closed after applying H-001..H-006: `EXECUTABLE_REQUIREMENTS_COVERAGE=32/32`.

## Rector -> physical model -> executable contract

| # | rector requirement | physical authority | executable artifact | state |
|---:|---|---|---|---|
| 1 | API major version/base path | API-neutral model | 02 | CLOSED |
| 2 | UUIDv7, UTC/IANA, opaque IDs | profiles 01/06/10 | 01/02/10 | CLOSED: exact uuid `14.0.2` approved by H-001 |
| 3 | OIDC/OAuth identity before authorization | `iam.*` | 02/13 | CLOSED |
| 4 | tenant/ownership authorization chain | physical 05/08 | 05/13 | CLOSED |
| 5 | headers/media type/cursor/filter/sort | operational indexes 04 | 02 | CLOSED |
| 6 | stable safe errors | job/error/result columns | 02/06 | CLOSED |
| 7 | public operations traceable to capability/model | frozen entities/lifecycle | 02/03 | CLOSED: OP-B01..03 reconciled by H-003..H-005 without new entity/capability |
| 8 | event envelope/tenant conditionality | outbox EV profile | 04/15 | CLOSED |
| 9 | concrete events/versions/payload/consumers | outbox + aggregates | 04 | CLOSED |
| 10 | permission grammar/scopes/default DENY | `iam.*`; physical 08 | 05/13 | CLOSED |
| 11 | exact permissions and grants | Permission/Role/RolePermission | 05/09 | CLOSED: 134 Permission rows, explicit grants/default DENY; H-003..H-005 |
| 12 | three plans / 20 groups | platform plan/capability/entitlement | 05/09 | CLOSED |
| 13 | atomic capability codes | same | 05/09 | CLOSED one-to-one non-expanding decomposition |
| 14 | PostgreSQL idempotency authority | `ops_audit.idempotency_records` | 07/12 | CLOSED |
| 15 | per-operation/transition idempotency | same | 03/07/09 | CLOSED |
| 16 | audit envelope/redaction/conditional tenant | `ops_audit.audit_events` | 08 | CLOSED |
| 17 | exact audit codes/mappings | same | 03/08/09 | CLOSED for every published command |
| 18 | seed source/version/checksum/idempotency | physical registries | 09 | CLOSED |
| 19 | exact permission/lifecycle/config seed rows | registry tables | 09 | CLOSED: approved Permission/grant manifests, intentional empty config-value manifest and exact dismissed edges |
| 20 | result/sufficiency/provenance | data/result tables | 02/06/10 | CLOSED |
| 21 | file/evidence lineage | `evidence.*` | 14 | CLOSED |
| 22 | transaction/concurrency/row version | M/TM profiles; invariants | 12 | CLOSED |
| 23 | atomic mutation+audit+outbox | aggregate + `ops_audit.*` | 04/08/12/15 | CLOSED |
| 24 | OTel/Prometheus/Grafana/Loki/correlation | audit/job/health | 16 | CLOSED |
| 25 | AI assistance via `ia2.tcdx.int` only | `ai.*` | 17 | CLOSED; provider runtime gate explicit |
| 26 | reproducible toolchain and test evidence | all constraints | 01/10 | CLOSED: exact toolchain and `pg` pins HUMAN_APPROVED by H-001/H-002 |
| 27 | immutable ordered migration policy | whole model target | 11 | CLOSED |
| 28 | project runner/naming/ledger/checksum/lock | approved foundations boundary | 01/11 | CLOSED |
| 29 | temporal/retention/deletion semantics | physical 06/table policies | 07/08/11/14 | CLOSED |
| 30 | no generic status writes | lifecycle definitions | 09/12 | CLOSED |
| 31 | exact lifecycle edges/policies/events | `ops_audit.lifecycle_transition_* ` | 05/08/09/10 | CLOSED: exactly two `Issue -> dismissed` rows, sources open/triaged; all absent edges DENY; H-006 |
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
PUBLIC_API_OPERATIONS=74
PUBLIC_MUTATING_OPERATIONS=69
PUBLISHED_DOMAIN_INTEGRATION_EVENTS=55
PUBLISHED_PERMISSIONS=134
PUBLISHED_LIFECYCLE_EDGES=95
PUBLISHED_AUDIT_EVENT_CODES=164
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

H-001..H-006 are the cited human authority for the final rows. No LegalHold entity, capability, hard-delete operation, dismissed exit, tenant registry or inferred configuration default is introduced.
