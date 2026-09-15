# Open decisions and blockers

| Campo | Valor |
|---|---|
| Contract owner | Architecture Owner |
| Approving human roles | listed per decision |
| Status | `BLOCKED` |

## Resolved continuation blockers

`B-001..B-011` and `B-020` are resolved in direction by the human continuation Decision Record. Controlled derivation closes B-013 event catalog, B-015 errors, B-016 audit mapping, B-019 idempotency and B-021 wire conventions. B-012/B-014/B-017/B-018 are closed for all publishable rows and retain only the decisions below.

## Remaining human decisions

| decision_id | exact decision required | evidence / alternatives | affected artifacts | human owner |
|---|---|---|---|---|
| H-001 | approve or replace exact toolchain version set IDM-P01 | registry compatibility supports the exact proposed set; any replacement must preserve rector majors and lockfile reproducibility | 01/10 | Architecture Owner + Security + applicable owners |
| H-002 | approve or replace `pg 8.23.0` as exact Kysely PostgreSQL driver | Kysely needs a PostgreSQL driver; alternatives change pool/TLS/type parsing surface | 01 | Data Model Owner + Backend Owner + Security |
| H-003 | add/authorize canonical Permission resource/actions/grants for ConfigurationDefinition/Override publication | rector requires config operations; rector 22 has no `configuration` resource. Alternatives: extend `platform` or `data`, or add a rector-approved resource; semantics differ | 02/03/05/09 | Product Owner/CPO + Architecture Owner + Security |
| H-004 | add/authorize Permission resource/actions/grants for retention, erasure and legal hold | physical privacy objects exist but rector 22 has no matching permission resource. Mapping to existing privacy/operations/platform changes authority | 02/03/05/09 | Privacy Manager + Legal Reviewer + Security |
| H-005 | add/authorize Permission resource/actions/grants for LifecycleTransitionDefinition administration | physical registry is PLATFORM_CONTROL but rector 22 has no lifecycle-transition resource. Mapping to permission/administer or a new resource changes governance | 02/03/05/09 | Architecture Owner + Security + domain owners |
| H-006 | define exact allowed source state(s) for `Issue.dismissed` | rector 21 permits dismissed with command/reason but does not name source states; allowing open only vs multiple active states changes workflow | 05/08/09 | Product Owner/CPO + Architecture Owner + remediation owner + Security |

## Counts

```text
OPEN_HUMAN_DECISIONS=6
OPEN_BLOCKERS=6
```

Provider/model/DPA, concrete IdP values, alert routing, signed-URL TTL and licensed regulatory contents are explicit later runtime/security/content gates. They do not alter the generic Phase 2 contract and are not counted as Phase 2 blockers.
