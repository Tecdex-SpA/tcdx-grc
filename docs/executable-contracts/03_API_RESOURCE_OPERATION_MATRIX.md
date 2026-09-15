# API resource / operation matrix

| Campo | Valor |
|---|---|
| Contract owner | Backend Owner |
| Approving human roles | Product Owner/CPO, Architecture Owner, Backend Owner, Security & Privacy Reviewer, owners de dominio |
| Status | `BLOCKED` |

## Resultado

No se congela ninguna operación concreta. El baseline fija `/api/v1`, recursos, workflows, acciones potenciales y autorización, pero no determina de forma única `method + path + operation_id + request/response command`. Elegir una de varias representaciones REST compatibles sería una decisión material prohibida por 45.

`CONTRACTUAL_OPERATIONS=0` y `UNSOURCED_OPERATIONS=0`. `02_OPENAPI_BASE_CONTRACT.yaml` mantiene `paths: {}` deliberadamente.

## Familias de operaciones requeridas antes de PASS

Estas filas son blockers de decisión, no endpoints ni autorizaciones.

| blocker_id | domain/capability | actor/owner | resource and command families required by rector | required permission/scope source | tenant semantics | physical entities | rector source | missing human decision |
|---|---|---|---|---|---|---|---|---|
| API-B01 | CORE_PLATFORM | Platform Admin, Tenant Admin | tenant/membership/role assignment/subscription/entitlement/configuration/impersonation commands and queries | 22 §10–12; 42 | platform operations have no invented tenant; tenant targets explicit and audited | `platform.*`, `iam.*`, `config.*` | 09, 22, 29, 42 | exact operation list, command names, paths, methods, schemas |
| API-B02 | ISO_COMPLIANCE | Regulatory Content Steward, Compliance/Quality/Security/AI/Privacy/Legal/GRC reviewers | navigate normative tree; applicability; assessment; SoA; pack review/publication | compliance/knowledge potential actions; pack SoD | global pack read gated by entitlement/RBAC; applicability/assessment tenant-owned | `regulatory.*` | 21, 22, 37, 41, 44 | exact query/command boundary and publication workflow registry |
| API-B03 | CONTROLS_ASSURANCE | Control Owner, reviewers | instantiate/define/version/scope/assess/test/review/approve controls | controls.* + object scope + SoD | global reference never presented as tenant implementation | `controls.*`, mappings | 21, 22, 44 | exact commands and per-command permissions |
| API-B04 | EVIDENCE_DOCUMENTS | Evidence Owner, reviewer | upload intent/finalize; document/evidence version; request/fulfill/submit/review/approve/reject/expire | evidence.* + assigned/tenant scope + SoD | all tenant relationships and signed access same tenant | `evidence.*` | 21, 22, 24 | exact upload API, limits, states/commands, permission codes |
| API-B05 | ISSUES_ACTIONS | GRC/Action owners and verifiers | issue triage/dismiss; action assign/start/complete/verify/reopen/cancel | remediation.* + assigned/owned/tenant + SoD | same-tenant origin/evidence only | `remediation.*` | 21, 22 | exact transition registry and paths |
| API-B06 | AUDIT | Auditor Lead/Auditor | program/audit/workpaper/test/sample/issue commands | audit.* + audit_engagement scope | target reads preserve target scopes; no direct domain writes | `audit.*`, `remediation.issue_origins` | 07, 21, 22 | exact operation catalog and independence policies |
| API-B07 | OPERATIONAL_RISK / INCIDENTS_LOSS | Risk Manager and owners | risk assessment/treatment/acceptance/KRI/incident/loss workflows | risk.* / operations.* + scopes + SoD | all subjects/policies same tenant | `risk.*`, `operations.*` | 19, 21, 22, 39 | exact commands, acceptance approval contract, async recalculation |
| API-B08 | INTEGRATION_HUB / DATA_TRUST / RULES_IMPACT | Data Admin, service principals | connector config/sync; observation/source resolution; calculation/rule/impact jobs | integration.* / data.* + execute/configure/administer | no provider endpoint before provider gate; all derived data same tenant | `integration.*`, `data.*`, `rules.*` | 14, 18, 20, 22, 35, 36 | provider-independent operations, job shapes, command/event codes |
| API-B09 | REPORTING / ISO_REPORTING / REPORT_STUDIO | viewers, report operators/reviewers | snapshot queries, report job/review/approve/publish/export | reporting.*; export inherits read scope | report/snapshot/artifact same tenant; heavy jobs async | `data.snapshots`, `reporting.*` | 22, 23, 27 | exact operations and capability split |
| API-B10 | PRIVACY / THIRD_PARTIES / RESILIENCE / SURVEYS | domain managers | complete governed lifecycle families | operations.* potential registry plus future exact permissions | tenant-owned, typed links, retention/erasure controls | corresponding schemas | 21, 22, 23, 30, 33 | exact operations/commands and transition definitions |
| API-B11 | REGULATORY_INTELLIGENCE / AI_ASSISTANCE | governed actors | regulatory change review; AI job/recommendation review/reject/accept via domain command | knowledge.* / ai.* and original domain permission | authorized minimized context; same tenant; AI never mutates official state directly | `knowledge.*`, `ai.*` | 22, 36, 37 | exact purpose codes, operations, accepted command mapping |

## Mandatory row shape after decision

Every approved operation row must contain exactly: `operation_id`, HTTP method, path, domain/capability, actor, permission, scope, tenant semantics, request schema, response schema, error classes, idempotency class, audit event, domain events, transaction boundary, physical entities and rector source. A missing field blocks that operation.

## Cross-cutting transaction contract

- Queries are read-only, tenant-filtered and permission-aware; read models never accept business writes.
- A command mutates only one domain owner aggregate per transaction. Audit and outbox records required by the command are inserted atomically.
- Cross-domain effects are events/commands, never direct table writes.
- Bulk/import/report operations are jobs with explicit row-level outcomes and resumability.
