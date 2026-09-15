# Seed manifests

| Campo | Valor |
|---|---|
| Contract owner | Data Model Owner |
| Approving human roles | Product Owner/CPO, Architecture Owner, Data Model Owner, Security & Privacy Reviewer, Regulatory Content Owner |
| Status | `BLOCKED` |

Seeds are declarative manifests for Fase 3, not scripts and not DDL. Every entry must declare owner, authoritative source, stable key, version, idempotency rule, update policy, deprecation policy, environment applicability and dependencies. Applied published/versioned rows are immutable; changes create new versions or authorized lifecycle changes.

## Seed classes

| manifest_id | class | stable keys/content | owner/source | update/deprecation | environments | dependencies | status |
|---|---|---|---|---|---|---|---|
| SEED-001 | global immutable/reference | four ownership classes; canonical result/calculation vocabularies only where physical CHECK/registry requires rows | Architecture/Data Model Owner; 38–40 | immutable; baseline change only | all | physical model | contract defined; exact row-vs-CHECK placement follows approved model |
| SEED-002 | plans | `ISO`, `ISO_RIESGO_OPERATIVO`, `GRC` | Product Owner/CPO; 42 | new PlanVersion; never mutate contracts | all | Plan/PlanVersion | defined |
| SEED-003 | capability groups | exact 20 group codes and plan matrix from 42 | Product Owner/CPO; 42 | no add/rename/split/merge without rector change | all | plans | defined |
| SEED-004 | atomic capabilities | exact decomposition and plan entitlements | Product Owner/CPO + Architecture Owner; 42 | versioned PlanVersion/Entitlement | all | SEED-003 | `HUMAN_DECISION_REQUIRED` |
| SEED-005 | roles | exact 2 platform + 24 tenant role names/responsibilities from 42 | Security & Privacy Reviewer; 22,42 | baseline definitions immutable; custom roles tenant data | all | Tenant bootstrap | defined |
| SEED-006 | permissions | approved `domain.resource.action` registry | Security & Privacy Reviewer; 22 | immutable registry revision/lifecycle | all | SEED-004 | blocked by artifact 05 |
| SEED-007 | role-permission grants | explicit base-role grants/scopes/SoD | Security & Privacy Reviewer + domain owners | additive/revocation by published revision; default DENY | all | SEED-005/006 | `HUMAN_DECISION_REQUIRED` |
| SEED-008 | lifecycle definitions | every approved edge with permission, scope, policy, events, idempotency and concurrency | Architecture + domain owners; 21 | published edge immutable; new version | all | permission/audit/event catalogs | blocked |
| SEED-009 | scale/methodology catalogs | closed baseline formulas/scales from 17,19,38,39 | domain owners | new version; no historical rewrite | all | definitions/config | structurally defined; exact registry rows need approval |
| SEED-010 | configuration definitions | platform/methodology defaults and override flags | Product/Architecture/domain owners; 29,39 | versioned/effective; authorized fields only | all | methodologies/packs | blocked until exact keys approved |
| SEED-011 | tenant bootstrap | baseline tenant roles, membership/assignments, authorized configuration defaults | Tenant Admin process + Security reviewer | idempotent by tenant+stable key/version; no hardcoded tenant | non-production and production when tenant provision command approved | global seeds | blocked by permission/operation catalogs |
| SEED-012 | regulatory pack manifests | five pack headers/states/metadata from 41; no protected text | Regulatory Content Owner; 41 | edition/version/supersession; independent pack gates | all | RegulatorySource and licensed import later | headers defined; content not seeded |
| SEED-013 | regulatory contents | units, requirements, controls, mappings, coverage | applicable Regulatory Content Owners; licensed/official sources | immutable published version; new edition/import | only after pack gate/source authorization | SEED-012 | blocked by licensed/publication gates; deliberately absent |

## Idempotency

A seed runner must compare stable key + manifest version + canonical content checksum. Same checksum converges; different checksum on an applied immutable version fails closed. It may not silently update a published record.

## Regulatory prohibition

No ISO protected content is reconstructed or copied. ISO 9001:2026 stays prepublication until definitive authorized source. A named pack without 100% coverage and required approvals is not officially usable.

`SEED_MANIFESTS=BLOCKED` because atomic capabilities, permission rows/grants, lifecycle definitions and exact configuration catalogs require human approval.
