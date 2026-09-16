# Audit amendment canonical-to-physical traceability

| canonical concept / requirement | physical realization | existing authority preserved | source |
|---|---|---|---|
| AuditObjective | `audit.audit_objectives` | Audit aggregate | candidate 33/48 §3–4 |
| AuditCriterion | `audit.audit_criteria` | FrameworkVersion/Requirement remain Regulatory | candidate 33/48 §4 |
| AuditScope | `audit.audit_scopes` | Subject remains Organization; Tenant remains ownership | candidate 33/48 §4 |
| AuditTeamAssignment | `audit.audit_team_assignments` | TenantMembership remains IAM | candidate 33/48 §5 |
| AuditCompetency | `audit.audit_competencies` | no Role/Permission duplication | candidate 33/48 §5 |
| AuditorCompetencyAssertion | `audit.auditor_competency_assertions` | EvidenceVersion remains Evidence | candidate 33/48 §5 |
| AuditCompetencyRequirement | `audit.audit_competency_requirements` | FrameworkVersion remains Regulatory | candidate 33/48 §5 |
| AuditCompetencyValidation | `audit.audit_competency_validations` | assignment/assertion referenced, not copied | candidate 33/48 §5 |
| AuditAgendaItem | `audit.audit_agenda_items`, `audit.audit_agenda_item_tests`, `audit.audit_agenda_item_scopes`, `audit.audit_agenda_item_team_assignments` | test/scope/team identities remain independent | candidate 33/48 §6 |
| AuditTest N:M Requirement | `audit.audit_test_requirement_links` | Requirement and crosswalk remain Regulatory | candidate 48 §7 |
| AuditTest typed Control target | `audit.audit_test_control_links` | Control/ControlAssessment remain Controls | candidate 48 §8 |
| AuditTest→RequirementAssessment lineage | `audit.audit_test_requirement_assessment_links` | RequirementAssessment remains Regulatory | candidate 48 §8 |
| Evidence | existing `audit.audit_test_evidence_links` | no new table | v1.4 physical Audit |
| Finding→Issue→Action | existing `remediation.issue_origins`, `issues`, `actions` | no new remediation authority | v1.4 physical Remediation |

```text
NEW_CANONICAL_IDENTITIES=9
NEW_PHYSICAL_TABLES=15
SUPPORT_RELATION_TABLES=6
EXISTING_AUTHORITIES_DUPLICATED=0
GENERIC_POLYMORPHIC_REFERENCES=0
JSONB_SEMANTIC_SHORTCUTS=0
```
