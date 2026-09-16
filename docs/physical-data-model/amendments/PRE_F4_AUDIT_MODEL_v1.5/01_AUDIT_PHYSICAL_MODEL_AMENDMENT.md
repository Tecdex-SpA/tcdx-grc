# Audit physical model amendment — 15-table candidate

## Profiles

- `TM`: tenant mutable profile from the approved model, including UUIDv7 PK, actor metadata, `row_version`, tenant FK and tenant+PK unique.
- `TI`: tenant immutable profile from the approved model.
- `I / PLATFORM_CONTROL`: immutable global platform registry; `tenant_id=NULL`.

No table uses JSONB for objectives, criteria, scope, team, competencies, agenda or lineage.

## Proposed tables

| # | physical table — canonical concept | profile | domain columns | constraints / authority | temporal, audit, retention |
|---:|---|---|---|---|---|
| 1 | `audit.audit_objectives` — AuditObjective | TM | `audit_id uuid!`; `objective_code varchar(96)!`; `statement text!`; `ordinal integer!`; `lifecycle_state varchar(32)!` | same-tenant Audit; UQ audit+code and audit+ordinal; ordinal>=0; statement nonempty | mutable only before Audit approval; frozen/audited after; IR >=7y |
| 2 | `audit.audit_criteria` — AuditCriterion | TM | `audit_id uuid!`; `criterion_kind varchar(32)!`; `framework_version_id uuid!`; `requirement_id uuid?`; `rationale text!`; `ordinal integer!`; `lifecycle_state varchar(32)!` | kind `framework_version|requirement`; Requirement NULL iff framework criterion; Requirement belongs FrameworkVersion; FrameworkVersion selected 1..3 per Audit; partial UQ audit+framework for framework row, audit+requirement for requirement row; UQ audit+ordinal | freezes at Audit approval; audit; IR >=7y |
| 3 | `audit.audit_scopes` — AuditScope | TM | `audit_id uuid!`; `framework_version_id uuid!`; `subject_id uuid!`; `scope_code varchar(96)!`; `lifecycle_state varchar(32)!` | Audit/Subject same tenant; FrameworkVersion selected by criterion and accessible; UQ audit+framework+subject and audit+scope_code | freezes at approval; audit; IR >=7y |
| 4 | `audit.audit_team_assignments` — AuditTeamAssignment | TM | `audit_id uuid!`; `membership_id uuid!`; `team_role varchar(32)!`; `assigned_from timestamptz!`; `assigned_to timestamptz?`; `lifecycle_state varchar(32)!` | role `lead_auditor|auditor|technical_expert`; same-tenant active membership; end>start; UQ audit+membership+role+from; partial UQ one active lead per Audit | assignment history retained; audit; IR >=7y |
| 5 | `audit.audit_competencies` — AuditCompetency | I / PLATFORM_CONTROL | `competency_code varchar(128)!`; `version_number bigint!`; `name text!`; `description text!`; `lifecycle_state varchar(32)!`; `effective_from timestamptz!`; `effective_to timestamptz?`; `published_at timestamptz?` | UQ code+version; version>0; effective_to>from; published immutable | versioned registry; audit publication; IR |
| 6 | `audit.auditor_competency_assertions` — AuditorCompetencyAssertion | TI | `membership_id uuid!`; `audit_competency_id uuid!`; `evidence_version_id uuid?`; `valid_from timestamptz!`; `valid_to timestamptz?`; `assertion_status varchar(32)!`; `verified_by_membership_id uuid!`; `verified_at timestamptz!`; `superseded_by_id uuid?` | subject/verifier/evidence same tenant; verifier != subject; validity ordered; status `verified|expired|revoked|superseded`; UQ membership+competency+valid_from; acyclic supersession | immutable assertion/version; audit; policy/IR >=7y |
| 7 | `audit.audit_competency_requirements` — AuditCompetencyRequirement | TI | `audit_id uuid!`; `framework_version_id uuid!`; `audit_competency_id uuid!`; `team_role varchar(32)!`; `rationale text!` | Audit tenant; selected FrameworkVersion; role closed as team role; UQ audit+framework+competency+role; row presence means required | frozen with approved plan; audit; IR >=7y |
| 8 | `audit.audit_competency_validations` — AuditCompetencyValidation | TI | `audit_competency_requirement_id uuid!`; `audit_team_assignment_id uuid!`; `auditor_competency_assertion_id uuid?`; `validation_outcome varchar(32)!`; `validated_by_membership_id uuid!`; `validated_at timestamptz!`; `rationale text?` | same Audit/tenant; assignment role matches requirement; assertion membership/competency matches assignment/requirement and is effective at Audit period; outcome `covered|not_covered|expired|evidence_missing`; assertion required iff covered; UQ requirement+assignment+validated_at | immutable reproducible validation; audit; IR >=7y |
| 9 | `audit.audit_agenda_items` — AuditAgendaItem | TM | `audit_id uuid!`; `agenda_code varchar(96)!`; `title text!`; `starts_at timestamptz!`; `ends_at timestamptz!`; `ordinal integer!`; `lifecycle_state varchar(32)!` | same-tenant Audit; end>start; ordinal>=0; UQ audit+code and audit+ordinal | freezes at approval; audit; IR >=7y |
| 10 | `audit.audit_agenda_item_tests` — agenda/test support | TI | `audit_agenda_item_id uuid!`; `audit_test_id uuid!` | both same tenant and same Audit through Workpaper; UQ pair | immutable plan lineage; IR >=7y |
| 11 | `audit.audit_agenda_item_scopes` — agenda/scope support | TI | `audit_agenda_item_id uuid!`; `audit_scope_id uuid!` | both same tenant/Audit; UQ pair | immutable plan lineage; IR >=7y |
| 12 | `audit.audit_agenda_item_team_assignments` — agenda/team support | TI | `audit_agenda_item_id uuid!`; `audit_team_assignment_id uuid!` | both same tenant/Audit; assignment effective during agenda interval; UQ pair | immutable plan lineage; IR >=7y |
| 13 | `audit.audit_test_requirement_links` — test/Requirement N:M | TI | `audit_test_id uuid!`; `requirement_id uuid!`; `is_anchor boolean!=false`; `requirement_crosswalk_mapping_id uuid?`; `link_rationale text!` | same tenant AuditTest; Requirement selected as criterion; UQ test+requirement; partial UQ one anchor per test; anchor has no crosswalk; cross-framework non-anchor requires approved/effective allowed crosswalk connecting anchor+target | immutable execution lineage; IR >=7y |
| 14 | `audit.audit_test_control_links` — typed test/control target | TI | `audit_test_id uuid!`; `control_id uuid?`; `control_assessment_id uuid?`; `link_role varchar(32)!` | exactly one target; target same tenant; Control target must be `tenant_instantiated|tenant_defined`; assessment belongs tenant Control; partial UQ test+selected target+role | immutable execution lineage; IR >=7y |
| 15 | `audit.audit_test_requirement_assessment_links` — per-Requirement conclusion lineage | TI | `audit_test_id uuid!`; `audit_test_requirement_link_id uuid!`; `requirement_assessment_id uuid!`; `lineage_role varchar(32)!` | link belongs same test; assessment same tenant and same Requirement as test link; UQ test+assessment+role | immutable conclusion lineage; IR >=7y |

## Altered table

| table | final change | migration precondition | no-duplication result |
|---|---|---|---|
| `audit.audits` | remove `scope_text`; remove `lead_membership_id` | every existing Audit has reconciled typed scope and exactly one active lead assignment before columns are dropped | `audit_scopes` is sole scope authority; `audit_team_assignments` is sole lead/team authority |

No other existing table is altered. `audit.audit_tests.executor_membership_id` and `reviewer_membership_id` remain execution/review attribution, not team eligibility authority.

## Candidate physical decisions requiring the amendment gate

| decision_id | candidate decision | reason / alternatives excluded by candidate | owner |
|---|---|---|---|
| PDM-AUD-001 | AuditCompetency registry is versioned PLATFORM_CONTROL; assertions/requirements/validations are tenant-owned | avoids tenant-specific duplicate registry while preserving tenant evidence and assignments | Data Model + Architecture |
| PDM-AUD-002 | one typed AuditCriterion table with mandatory FrameworkVersion and optional same-version Requirement | exact FKs and CHECK avoid a generic polymorphic pair while keeping one criterion identity | Data Model |
| PDM-AUD-003 | one AuditTestControlLink with XOR Control/ControlAssessment FKs | follows approved typed-link pattern; no `type,id` | Data Model |
| PDM-AUD-004 | one anchor Requirement per AuditTest; cross-framework links cite approved crosswalk | makes grouping justification structurally reproducible | Architecture + Regulatory Content Owner |

All four remain `PENDING_HUMAN_APPROVAL`; Codex does not approve them.
