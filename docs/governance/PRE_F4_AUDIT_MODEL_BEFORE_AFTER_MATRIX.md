# PRE-F4 Audit model — before/after matrix

| capability | v1.4 / 214-table state | v1.5 candidate | gap after candidate |
|---|---|---|---:|
| Audit objectives | no structured authority | `audit.audit_objectives` | 0 |
| multi-framework criteria | no Audit criterion relation | typed `audit.audit_criteria` for FrameworkVersion + optional same-version Requirement | 0 |
| FrameworkVersion+Subject scope | `audit.audits.scope_text` only | `audit.audit_scopes`; old column removed after reconciliation | 0 |
| integrated agenda | absent | AuditAgendaItem + typed test/scope/team support | 0 |
| audit team | only `lead_membership_id`; executor/reviewer per test | AuditTeamAssignment; old lead column removed; test attribution retained | 0 |
| technical expert | absent | closed team role `technical_expert`, without implicit IAM grant | 0 |
| competency registry | absent | versioned PLATFORM_CONTROL AuditCompetency | 0 |
| auditor competency evidence/effectivity | absent | tenant AuditorCompetencyAssertion | 0 |
| competency requirements/coverage | absent | AuditCompetencyRequirement + immutable Validation | 0 |
| AuditTest N:M Requirement | absent | typed links with one anchor and crosswalk rule | 0 |
| AuditTest Control/ControlAssessment | absent | typed XOR link to tenant target | 0 |
| AuditTest RequirementAssessment lineage | absent | typed link constrained to same Requirement | 0 |
| agenda -> tests/scopes/auditors | absent | three support tables, same-Audit invariant | 0 |
| test -> Evidence | existing typed N:M | reused unchanged | 0 |
| AuditTest -> Issue -> Action | existing typed origin/remediation | reused unchanged | 0 |
| FrameworkVersion/Requirement/crosswalk | existing canonical typed model | referenced, never duplicated | 0 |

```text
ISO19011_AUDIT_MODEL_COVERAGE_BEFORE=PARTIAL
ISO19011_AUDIT_MODEL_COVERAGE_CANDIDATE=COMPLETE_PENDING_HUMAN_APPROVAL
PROPOSED_ADDITIONAL_TABLES=15
PROPOSED_ALTERED_TABLES=1
AUTHORITY_DUPLICATION=0
```
