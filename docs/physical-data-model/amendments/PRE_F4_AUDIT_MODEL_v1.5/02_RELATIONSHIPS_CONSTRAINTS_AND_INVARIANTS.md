# Audit amendment relationships, constraints and invariants

## Relationship matrix

| source | target | cardinality / physical relation | tenant/ownership rule | delete |
|---|---|---|---|---|
| Audit | AuditObjective | 1:N | same tenant | RESTRICT |
| Audit | AuditCriterion | 1:N | same tenant; FrameworkVersion accessible | RESTRICT |
| Audit | AuditScope | 1:N | same tenant; selected FrameworkVersion | RESTRICT |
| Audit | AuditTeamAssignment | 1:N | same tenant membership | RESTRICT |
| Audit | AuditCompetencyRequirement | 1:N | tenant Audit; global published competency | RESTRICT |
| AuditCompetencyRequirement | AuditCompetencyValidation | 1:N history | same tenant/Audit | RESTRICT |
| AuditTeamAssignment | AuditorCompetencyAssertion | N:M evidence through Validation | membership and competency match | RESTRICT |
| Audit | AuditAgendaItem | 1:N | same tenant | RESTRICT |
| AuditAgendaItem | AuditTest | N:M support | same Audit/tenant | RESTRICT |
| AuditAgendaItem | AuditScope | N:M support | same Audit/tenant | RESTRICT |
| AuditAgendaItem | AuditTeamAssignment | N:M support | same Audit/tenant, time-compatible | RESTRICT |
| AuditTest | Requirement | N:M typed link | criterion-selected; crosswalk rule | RESTRICT |
| AuditTest | Control or ControlAssessment | N:M typed XOR link | tenant target only | RESTRICT |
| AuditTest | RequirementAssessment | N:M typed lineage | same linked Requirement/tenant | RESTRICT |

## Database constraints

1. Every TENANT_* table has `tenant_id NOT NULL`, tenant FK, UQ `(tenant_id, pk)` and composite FKs to tenant parents.
2. `audit_criteria`: `criterion_kind='framework_version' <=> requirement_id IS NULL`; `criterion_kind='requirement' <=> requirement_id IS NOT NULL`.
3. Maximum three distinct FrameworkVersion criteria per Audit is an APP/TX invariant locked on Audit; minimum one is approval precondition.
4. `audit_test_control_links` has exactly one non-null typed target.
5. `audit_test_requirement_links` has exactly one anchor per AuditTest via partial unique index; non-anchor in another FrameworkVersion requires crosswalk FK.
6. Crosswalk mapping must be approved/effective, connect anchor and linked Requirement in either declared direction, and use only the four allowed relationship types.
7. `audit_competency_validations.outcome='covered'` iff a compatible, verified, effective assertion is present.
8. Partial unique index admits one active `lead_auditor` assignment per Audit.
9. Agenda interval is inside the Audit planned interval when present; linked assignment overlaps agenda interval.
10. No cascade delete touches Audit plan, competency history, test lineage, Evidence, Issue, Action or audit history.

## Transaction invariants

- Audit approval locks Audit plus objectives, criteria, scopes, active team, competency requirements/latest validations and agenda; it rejects missing objective, criterion, scope, active lead, uncovered competency or agenda assignment.
- A test cross-framework grouping locks its anchor link and cited RequirementCrosswalkMapping to prevent approval/version drift.
- RequirementAssessment lineage creation locks test link and assessment and checks Requirement equality.
- Agenda link creation checks the target resolves to the same Audit through Workpaper/parent relations.
- Adding team/competency data never grants RBAC; authorization is evaluated independently.

## Index plan

- child FK indexes on every parent/reference;
- `audit_criteria(audit_id, framework_version_id, requirement_id)`;
- `audit_scopes(audit_id, framework_version_id, subject_id)`;
- active team lookup `(audit_id, lifecycle_state, team_role)`;
- competency validity lookup `(tenant_id, membership_id, audit_competency_id, valid_from, valid_to)`;
- agenda range `(audit_id, starts_at, ends_at)`;
- test lineage indexes by AuditTest and each typed target.

Performance indexes beyond these integrity/operational indexes require measured evidence and do not alter the contract.
