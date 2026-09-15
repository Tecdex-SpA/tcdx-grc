# Open decisions and blockers

| Campo | Valor |
|---|---|
| Contract owner | Architecture Owner |
| Approving human roles | listed per decision |
| Status | `CLOSED_FOR_HUMAN_GATE_REVIEW` |

## Resolved continuation blockers

`B-001..B-011` and `B-020` are resolved in direction by the human continuation Decision Record. Controlled derivation closes B-013 event catalog, B-015 errors, B-016 audit mapping, B-019 idempotency and B-021 wire conventions. B-012/B-014/B-017/B-018 are closed for all publishable rows and retain only the decisions below.

## Applied final human decisions

| decision_id | human-approved closure | evidence / constraints | affected artifacts | status |
|---|---|---|---|---|
| H-001 | exact toolchain set with pnpm `12.4.1` | exact pins; no installation/manifests/lockfiles in Fase 2 | 01/10 | `HUMAN_APPROVED` |
| H-002 | `pg 8.23.0` only as Kysely PostgreSQL driver | no schema generation, migration authority or auto-sync | 01 | `HUMAN_APPROVED` |
| H-003 | `configuration.configuration_definition.*`, `configuration.configuration_override.*`, `configuration.effective_configuration.read` | existing entities/capabilities; default DENY, tenant boundaries, SoD and reinforced audit | 02/03/05/08/09/13/18 | `HUMAN_APPROVED` |
| H-004 | `privacy.retention_policy.*`, `privacy.data_subject_request.*`, `privacy.erasure_execution.*` | existing entities; no LegalHold entity or generic hard-delete; precedence and protected-history rules fixed | 02/03/04/05/08/09/10/18 | `HUMAN_APPROVED` |
| H-005 | platform lifecycle-transition read/administer/publish permissions | PLATFORM_CONTROL; only Platform Admin base grants; registry administration is not domain transition execution | 02/03/04/05/08/09/13/18 | `HUMAN_APPROVED` |
| H-006 | exactly `open -> dismissed` and `triaged -> dismissed` | explicit command, required reason, `remediation.issue.transition`, audit; dismissed terminal and every absent edge DENY | 05/08/09/10/18 | `HUMAN_APPROVED` |

## Exact human-approved freezes

- H-001: Node.js `22.23.2`; pnpm `12.4.1`; TypeScript `7.0.2`; Fastify `5.12.4`; React `19.3.0`; React DOM `19.3.0`; Vite `8.3.0`; Kysely `0.29.5`; Vitest `5.0.1`; Testing Library React `16.3.3`; Testing Library DOM `10.4.2`; Playwright `1.63.0`; uuid `14.0.2`. No package installation or runtime manifest/lockfile is authorized.
- H-002: `pg 8.23.0`, exact pin, exclusively as Kysely's PostgreSQL driver; no schema generation, migration authority or auto-sync. PostgreSQL and the approved physical model remain authority.
- H-003: resources are exactly `configuration.configuration_definition.*`, `configuration.configuration_override.*` and `configuration.effective_configuration.read`; maximum actions are definition `read/create/update/review/approve/publish/archive`, override `read/create/update/review/approve/archive`, and effective configuration `read`. Definitions are global/platform governed; overrides are always tenant-scoped; EffectiveConfiguration is read-only resolution. Default DENY, author/review/approve/publish SoD and reinforced audit apply. A tenant never modifies a published global definition. Base grants are exactly those recorded in 05: Platform Admin for definition workflow, GRC Manager and Tenant Admin for their approved override subset, and Data Admin for effective read plus override read; Viewer receives no write. No role or capability is added, and a Permission may exist without a grant.
- H-004: resources are exactly `privacy.retention_policy.*`, `privacy.data_subject_request.*` and `privacy.erasure_execution.*`; no `LegalHold` entity is created. Precedence is exactly `legal_hold > mandatory_regulatory_policy > contractual_policy > tenant_policy > product_baseline`. Maximum actions are retention policy `read/create/update/review/approve/publish/archive`, data-subject request `read/create/update/review/approve/transition/archive`, and erasure execution `read/execute/review`. Privacy Manager operates tenant privacy; Legal Reviewer reads/reviews/approves legal decisions/exceptions/holds; GRC Manager has read/justifiable coordination only; Platform Admin has no automatic tenant personal-content right. Erasure requires workflow, retention/legal hold, audit and SoD; it never deletes AuditEvent, published snapshots or protected history outside contract, and no generic hard-delete API exists.
- H-005: permissions are exactly `platform.lifecycle_transition.read`, `platform.lifecycle_transition.administer` and `platform.lifecycle_transition.publish`, all scope `platform`. Only Platform Admin receives base grants. LifecycleTransitionDefinition remains PLATFORM_CONTROL, versioned, immutable after publication and reinforced-audited; tenant variation uses authorized policy/configuration, never a second entity or arbitrary executable rules. Registry administration does not execute a domain transition.
- H-006: exactly `open -> dismissed` and `triaged -> dismissed`, command `issue.dismiss`, `reason=REQUIRED`, permission `remediation.issue.transition`, mandatory audit. No dismissal edge exists from `remediation_in_progress`, `pending_verification`, `verified_closed` or `reopened`; `dismissed` is terminal and absence of an edge is DENY.

## Counts

```text
OPEN_HUMAN_DECISIONS=0
OPEN_BLOCKERS=0
```

Provider/model/DPA, concrete IdP values, alert routing, signed-URL TTL and licensed regulatory contents are explicit later runtime/security/content gates. They do not alter the generic Phase 2 contract and are not counted as Phase 2 blockers.
