# Integrated Audit API, permission and audit amendment

## Wire and authorization

All paths are under `/api/v1`, use OIDC/OAuth Bearer JWT, `X-Correlation-Id`, tenant-context selection, JSON, `application/problem+json`, ETag/If-Match for mutable plan resources and PostgreSQL-authoritative idempotency. Tenant header never grants access.

Existing capability `AUDIT` is reused. No new capability group or entitlement is introduced.

## Operations

| operation_id | method/path | request -> response | permission/scope | idempotency | audit event | domain event | physical authority |
|---|---|---|---|---|---|---|---|
| `auditPlanGet` | GET `/audits/{audit_id}/integrated-plan` | ID -> typed objectives/criteria/scopes/team/competency coverage/agenda/test lineage | `audit.audit.read`; tenant/audit_engagement | NATURALLY_IDEMPOTENT | NONE | NONE | existing Audit + 15 candidate tables |
| `auditObjectiveCreate` | POST `/audits/{audit_id}/objectives` | code, statement, ordinal -> AuditObjective | `audit.audit_objective.create`; tenant | KEY | `audit.audit.objective.create.v1` | NONE | `audit.audit_objectives` |
| `auditCriterionCreate` | POST `/audits/{audit_id}/criteria` | kind, FrameworkVersion, optional Requirement, rationale, ordinal -> AuditCriterion | `audit.audit_criterion.create`; tenant | KEY | `audit.audit.criterion.create.v1` | NONE | `audit.audit_criteria` |
| `auditScopeCreate` | POST `/audits/{audit_id}/scopes` | FrameworkVersion, Subject, code -> AuditScope | `audit.audit_scope.create`; tenant | KEY | `audit.audit.scope.create.v1` | NONE | `audit.audit_scopes` |
| `auditTeamAssignmentCreate` | POST `/audits/{audit_id}/team-assignments` | membership, team_role, interval -> assignment | `audit.audit_team.assign`; tenant | KEY | `audit.audit.team.assign.v1` | NONE | `audit.audit_team_assignments` |
| `auditorCompetencyAssertionCreate` | POST `/auditor-competency-assertions` | membership, competency version, validity, evidence, verification -> assertion | `audit.auditor_competency.create`; tenant | KEY | `audit.audit.competency_assertion.create.v1` | NONE | `audit.auditor_competency_assertions` |
| `auditCompetencyRequirementCreate` | POST `/audits/{audit_id}/competency-requirements` | FrameworkVersion, competency, team_role, rationale -> requirement | `audit.audit_competency_requirement.create`; tenant | KEY | `audit.audit.competency_requirement.create.v1` | NONE | `audit.audit_competency_requirements` |
| `auditCompetencyCoverageValidate` | POST `/audits/{audit_id}/competency-validations` | requirement, assignment, assertion/result -> immutable validation | `audit.audit_competency_requirement.review`; tenant | KEY | `audit.audit.competency_validation.create.v1` | NONE | validations + requirement/assignment/assertion |
| `auditAgendaItemCreate` | POST `/audits/{audit_id}/agenda-items` | code, title, UTC interval, ordinal -> item | `audit.audit_agenda.create`; tenant | KEY | `audit.audit.agenda_item.create.v1` | NONE | `audit.audit_agenda_items` |
| `auditAgendaTestAssign` | POST `/audit-agenda-items/{item_id}/tests` | AuditTest ID -> link | `audit.audit_agenda.update`; audit_engagement | KEY | `audit.audit.agenda_test.assign.v1` | NONE | agenda/test support |
| `auditAgendaScopeAssign` | POST `/audit-agenda-items/{item_id}/scopes` | AuditScope ID -> link | `audit.audit_agenda.update`; audit_engagement | KEY | `audit.audit.agenda_scope.assign.v1` | NONE | agenda/scope support |
| `auditAgendaTeamAssign` | POST `/audit-agenda-items/{item_id}/team-assignments` | AuditTeamAssignment ID -> link | `audit.audit_agenda.update`; audit_engagement | KEY | `audit.audit.agenda_team.assign.v1` | NONE | agenda/team support |
| `auditTestRequirementLink` | POST `/audit-tests/{audit_test_id}/requirements` | Requirement, anchor flag, optional approved crosswalk, rationale -> link | `audit.audit_test.update`; audit_engagement | KEY | `audit.audit.audit_test_requirement.link.v1` | NONE | test/Requirement link |
| `auditTestControlLink` | POST `/audit-tests/{audit_test_id}/controls` | exactly one Control or ControlAssessment, role -> link | `audit.audit_test.update`; audit_engagement | KEY | `audit.audit.audit_test_control.link.v1` | NONE | typed test/control link |
| `auditTestRequirementAssessmentLink` | POST `/audit-tests/{audit_test_id}/requirement-assessments` | test Requirement link, RequirementAssessment, lineage role -> link | `audit.audit_test.update`; audit_engagement | KEY | `audit.audit.audit_test_requirement_assessment.link.v1` | NONE | typed assessment lineage |

`KEY` means `IDEMPOTENCY_KEY_REQUIRED`, tenant/actor/operation-bound with canonical request fingerprint. All writes include expected ETag of the mutable parent where applicable. No operation emits a domain/integration event because no consumer is contractually required; Audit approval retains existing `audit.audit.approved.v1`.

## Request invariants and safe errors

- selection of a fourth FrameworkVersion: `TCDX.INVARIANT.VIOLATION` / 422;
- Requirement not in declared FrameworkVersion: invariant violation / 422;
- cross-framework link without compatible approved crosswalk: `TCDX.INVALID_STATE_TRANSITION` / 409;
- duplicate/second anchor: `TCDX.CONFLICT.RESOURCE` / 409;
- stale row_version: `TCDX.CONFLICT.CONCURRENCY` / 409;
- same idempotency key/different fingerprint: `TCDX.CONFLICT.IDEMPOTENCY` / 409;
- missing objectives/scope/lead/competency coverage/agenda at approval: invariant violation with allowlisted missing categories only;
- foreign tenant ID: `TCDX.RESOURCE.NOT_FOUND` / 404 without existence disclosure.

No response exposes protected normative content, raw crosswalk rationale beyond caller authorization, evidence binary, secret, SQL, stack trace or foreign identifier.

## Permission additions

| permission | allowed scopes | base-role candidate grants | SoD / sensitive audit |
|---|---|---|---|
| `audit.audit.read` | tenant, audit_engagement | Auditor Lead, Auditor, GRC Manager, Executive/Board Viewer and Report Viewer only through object/read policy | read-only; protected export separate |
| `audit.audit_objective.create` | tenant | Auditor Lead | plan mutation; audit |
| `audit.audit_objective.update` | tenant | Auditor Lead | pre-approval only |
| `audit.audit_criterion.create` | tenant | Auditor Lead | pack/crosswalk access enforced |
| `audit.audit_criterion.update` | tenant | Auditor Lead | pre-approval only |
| `audit.audit_scope.create` | tenant | Auditor Lead | Subject same tenant |
| `audit.audit_scope.update` | tenant | Auditor Lead | pre-approval only |
| `audit.audit_team.assign` | tenant | Auditor Lead | cannot self-grant RBAC; exactly one lead |
| `audit.auditor_competency.create` | tenant | Auditor Lead | verifier != subject; reinforced audit |
| `audit.audit_competency_requirement.create` | tenant | Auditor Lead | selected FrameworkVersion only |
| `audit.audit_competency_requirement.review` | tenant | Auditor Lead, GRC Manager | validation does not grant role/permission |
| `audit.audit_agenda.create` | tenant | Auditor Lead | pre-approval only |
| `audit.audit_agenda.update` | tenant, audit_engagement | Auditor Lead | target same Audit |
| `audit.audit_test.update` | audit_engagement | Auditor Lead, assigned Auditor | assigned test only; no final approval |

Every permission remains entitlement-, tenant-, scope-, object-policy- and SoD-bound. Technical expert is an Audit assignment role, not an IAM base role or implicit permission grant.

## Audit payload

Each listed mutating operation records actor, tenant, Audit/AuditTest subject, action, minimized before/after IDs and versions, correlation/request, UTC, outcome and reason/rationale reference where required. Audit payload never duplicates protected Requirement text, Evidence content or competency evidence binary.
