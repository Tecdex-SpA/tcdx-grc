# Permission, capability and base-role catalog

| Campo | Valor |
|---|---|
| Contract owner | Security & Privacy Reviewer |
| Approving human roles | Product Owner/CPO, Architecture Owner, Security & Privacy Reviewer, domain owners |
| Status | `CONTRACT_DEFINED` |

Authorization is always `identity → active membership → entitlement/capability → permission → scope → object policy → SoD → ALLOW`, otherwise DENY. Plan, capability, entitlement, role, permission, scope and ownership remain separate.

## Atomic capabilities

Fase 2 uses one atomic capability per closed capability group, with `capability_code=capability_group`. This is an exact, non-expanding decomposition of rector 42. Plan entitlements are exactly the yes/no matrix in that source: ISO gets the first seven ISO groups; ISO_RIESGO_OPERATIVO adds OPERATIONAL_RISK and INCIDENTS_LOSS; GRC gets all twenty.

`CORE_PLATFORM, ISO_COMPLIANCE, CONTROLS_ASSURANCE, EVIDENCE_DOCUMENTS, ISSUES_ACTIONS, AUDIT, ISO_REPORTING, OPERATIONAL_RISK, INCIDENTS_LOSS, INTEGRATION_HUB, DATA_TRUST, RULES_IMPACT, THIRD_PARTIES, RESILIENCE, PRIVACY, SURVEYS, REPORT_STUDIO, REGULATORY_INTELLIGENCE, AI_ASSISTANCE, GOVERNED_AUTOMATION`.

## Published permissions used by operations

Scopes abbreviate exact rector scopes. `tenant*` means tenant plus narrower object-derived scopes listed; it never broadens access. Base-role grants are minimum grants supported directly by rector responsibilities; every grant remains entitlement- and scope-bound.

| permission_code | capability | action/resource | allowed scopes | tenant boundary | base roles containing it | entitlement / SoD / sensitive / audit | rector source |
|---|---|---|---|---|---|---|---|
| `platform.tenant.create` | CORE_PLATFORM | create tenant | platform | platform target, no tenant actor context | Platform Admin | entitlement N/A; sensitive; reinforced audit | 22,42 |
| `platform.tenant.archive` | CORE_PLATFORM | archive tenant | platform | target explicit; no destructive delete | Platform Admin | sensitive; reason; reinforced audit | 22,23,42 |
| `platform.membership.create` | CORE_PLATFORM | create membership | tenant | selected tenant only | Tenant Admin | CORE_PLATFORM; audit | 22,42 |
| `platform.role.assign` | CORE_PLATFORM | assign/revoke role | tenant | membership/role/scope same tenant | Tenant Admin | cannot grant outside own authority; audit | 22,42 |
| `platform.impersonation_session.impersonate` | CORE_PLATFORM | impersonate | platform | target tenant explicit | Platform Admin | SoD/regulatory restrictions remain; sensitive; reinforced audit | 22 §8/12 |
| `compliance.normative_unit.read` | ISO_COMPLIANCE | read normative unit | tenant | global pack must be entitled/licensed; tenant content same tenant | Viewer, Report Viewer, Executive/Board Viewer, GRC Manager, Quality Manager, Compliance Manager, CISO/Security Manager, AI Governance Manager, Privacy Manager, Legal Reviewer, Regulatory Content Steward | read-only; pack gate; audit only for protected export/access policy | 22,41,42,44 |
| `compliance.requirement.read` | ISO_COMPLIANCE | read requirement | tenant | same as above | same as normative-unit readers | read-only; pack gate | 22,41,42,44 |
| `compliance.applicability.create` | ISO_COMPLIANCE | create applicability | tenant, organizational_unit, process, service | Subject scope resolved; same tenant | Compliance Manager, Quality Manager, CISO/Security Manager, AI Governance Manager, Privacy Manager | pack-specific responsibility; audit | 22,41,42,44 |
| `compliance.applicability.submit` | ISO_COMPLIANCE | submit applicability | tenant, assigned_object, owned_object | same tenant | same as create | submitter cannot self-approve where policy applies | 22,44 |
| `compliance.applicability.approve` | ISO_COMPLIANCE | approve applicability | tenant | same tenant | Compliance Manager; pack coapprover role when required | sensitive; SoD; reinforced audit | 22,41 |
| `compliance.requirement_assessment.create` | ISO_COMPLIANCE | create assessment | tenant, organizational_unit, process, service | applicability same tenant | Compliance Manager, Quality Manager, CISO/Security Manager, AI Governance Manager, Privacy Manager | capability+pack; audit | 22,42 |
| `compliance.requirement_assessment.update` | ISO_COMPLIANCE | start/update assessment | assigned_object, owned_object, tenant | same tenant | same domain managers | object policy; audit | 21,22 |
| `compliance.requirement_assessment.submit` | ISO_COMPLIANCE | submit assessment | assigned_object, owned_object, tenant | same tenant | same domain managers | no conclusion coercion; audit | 21,22,38 |
| `compliance.requirement_assessment.approve` | ISO_COMPLIANCE | approve assessment | tenant | same tenant | Compliance Manager plus required pack coapprover | sensitive; SoD; reinforced audit | 21,22,41 |
| `compliance.soa.publish` | ISO_COMPLIANCE | publish SoA | tenant | same tenant/version | GRC Manager, Compliance Manager | sensitive; complete approvals; reinforced audit | 22,41,44 |
| `knowledge.regulatory_pack.publish` | REGULATORY_INTELLIGENCE | publish pack | platform | global/platform only | GRC Manager | requires Regulatory Content Steward import and pack-specific coapprovals; sensitive | 37,41,42 |
| `controls.control.create` | CONTROLS_ASSURANCE | create/instantiate control | tenant, organizational_unit, process, service | tenant control only; global ref immutable | GRC Manager, Control Owner | entitlement; audit | 22,42,44 |
| `controls.control_assessment.create` | CONTROLS_ASSURANCE | create assessment | tenant, assigned_object, owned_object | control same tenant | Control Owner, GRC Manager | audit | 21,22,42 |
| `controls.control_assessment.submit` | CONTROLS_ASSURANCE | complete/submit assessment | assigned_object, owned_object | same tenant | Control Owner | cannot self-approve by default | 21,22 |
| `controls.control_assessment.review` | CONTROLS_ASSURANCE | review assessment | tenant, assigned_object | same tenant | GRC Manager, Auditor | independence policy | 21,22 |
| `controls.control_assessment.approve` | CONTROLS_ASSURANCE | approve assessment | tenant | same tenant | GRC Manager | sensitive; SoD; reinforced audit | 21,22 |
| `controls.assurance_test.execute` | CONTROLS_ASSURANCE | execute assurance test | assigned_object, audit_engagement | same tenant | Auditor, Control Owner | executor/final approver separation when required | 21,22 |
| `evidence.document.create` | EVIDENCE_DOCUMENTS | request upload/create document | tenant, assigned_object, owned_object | same tenant | Evidence Owner, Control Owner, Auditor | classification/scan; audit | 22,24,42 |
| `evidence.document.update` | EVIDENCE_DOCUMENTS | finalize/version document | assigned_object, owned_object | same tenant | Evidence Owner | no binary authority in DB; audit | 22,24 |
| `evidence.evidence_request.create` | EVIDENCE_DOCUMENTS | create evidence request | tenant, assigned_object | typed target same tenant/global accessible | GRC Manager, Compliance Manager, Control Owner, Auditor Lead, Auditor | audit | 22,24 |
| `evidence.evidence_request.submit` | EVIDENCE_DOCUMENTS | fulfill request | assigned_object, owned_object | same tenant | Evidence Owner | evidence eligible; audit | 21,22,24 |
| `evidence.evidence.submit` | EVIDENCE_DOCUMENTS | submit evidence | assigned_object, owned_object | same tenant | Evidence Owner | submitter not default approver | 21,22,24 |
| `evidence.evidence.review` | EVIDENCE_DOCUMENTS | review evidence | assigned_object, tenant | same tenant | GRC Manager, Compliance Manager, Auditor | reviewer eligible; audit | 21,22 |
| `evidence.evidence.approve` | EVIDENCE_DOCUMENTS | approve evidence | tenant | same tenant | GRC Manager, Compliance Manager | sensitive; submitter≠approver; reinforced audit | 21,22,24 |
| `evidence.evidence.reject` | EVIDENCE_DOCUMENTS | reject evidence | tenant | same tenant | GRC Manager, Compliance Manager | reason; audit | 21,22 |
| `remediation.issue.create` | ISSUES_ACTIONS | create issue | tenant, audit_engagement, assigned_object | typed origin same tenant | GRC Manager, Quality Manager, Compliance Manager, Risk Manager, Auditor | audit | 21,42,44 |
| `remediation.issue.transition` | ISSUES_ACTIONS | transition issue | tenant, assigned_object, owned_object | same tenant | GRC Manager, Issue assignee through custom role grant | exact lifecycle; reason for dismiss/reopen | 21,22 |
| `remediation.action.create` | ISSUES_ACTIONS | create action | tenant, assigned_object | issue same tenant | GRC Manager, Quality Manager, Compliance Manager, Risk Manager, Auditor Lead | audit | 21,42 |
| `remediation.action.transition` | ISSUES_ACTIONS | start/complete/reopen/cancel action | assigned_object, owned_object | same tenant | Action Owner | completed≠verified; audit | 21,22,42 |
| `remediation.action.verify` | ISSUES_ACTIONS | verify action | tenant, assigned_object | same tenant | GRC Manager, Auditor Lead | completer≠verifier where policy applies; sensitive | 21,22,42 |
| `risk.risk.create` | OPERATIONAL_RISK | create risk | tenant, organizational_unit, process, service | same tenant | Risk Manager | entitlement; audit | 22,39,42 |
| `risk.risk_assessment.create` | OPERATIONAL_RISK | create assessment | tenant, assigned_object | same tenant | Risk Manager | methodology/config versioned | 19,39 |
| `risk.risk_assessment.submit` | OPERATIONAL_RISK | submit assessment | assigned_object, owned_object | same tenant | Risk Manager | values/status/lineage; audit | 38,39 |
| `risk.treatment.create` | OPERATIONAL_RISK | create treatment | tenant, assigned_object | same tenant | Risk Manager | audit | 21,42 |
| `risk.treatment.approve` | OPERATIONAL_RISK | approve treatment | tenant | same tenant | Risk Manager, GRC Manager | sensitive; SoD | 21,22 |
| `risk.acceptance.create` | OPERATIONAL_RISK | request acceptance | tenant, assigned_object | same tenant | Risk Manager | rationale/expiry/review; audit | 22,39 |
| `risk.acceptance.approve` | OPERATIONAL_RISK | approve acceptance | tenant | same tenant | GRC Manager | requester≠approver; sensitive | 22,39 |
| `operations.incident.create` | INCIDENTS_LOSS | report incident | tenant, process, service, assigned_object | same tenant | Risk Manager, CISO/Security Manager, Process Owner | audit | 21,42 |
| `operations.supplier_assessment.create` | THIRD_PARTIES | create supplier assessment | tenant, assigned_object | Supplier same tenant; Third Parties write owner | Supplier Manager | entitlement; audit | 07,21,42 |
| `operations.continuity_plan.create` | RESILIENCE | create continuity plan | tenant, process, service | same tenant | Continuity Manager | entitlement; audit | 21,42 |
| `operations.survey.create` | SURVEYS | create campaign | tenant | same tenant | GRC Manager; domain manager by approved campaign owner | entitlement; audit | 21,42 |
| `operations.survey.submit` | SURVEYS | submit response | assigned_object | same tenant | assigned respondent through role/custom grant | immutable submitted response; audit | 21 |
| `audit.audit.create` | AUDIT | create audit | tenant | same tenant | Auditor Lead | audit scope/team; audit event | 21,42 |
| `audit.audit.approve` | AUDIT | approve audit | tenant | same tenant | Auditor Lead | independence; sensitive | 21,22 |
| `audit.audit_test.execute` | AUDIT | execute audit test | audit_engagement | same tenant | Auditor | no administrative right over target | 07,22,42 |
| `integration.integration.configure` | INTEGRATION_HUB | configure integration | tenant | connector version published | Data Admin | credential ref only; sensitive audit | 20,22,26,42 |
| `integration.sync_run.execute` | INTEGRATION_HUB | start sync | tenant | same tenant/provider contract gate | Data Admin, least-privilege ServicePrincipal | idempotent/checkpointed; audit | 20,22,26 |
| `data.measurement.execute` | DATA_TRUST | execute calculation | tenant | inputs/config same tenant/access-compatible | Data Admin, ServicePrincipal | no manual result editing; audit | 14,17,22,38 |
| `data.lineage.review` | DATA_TRUST | create/review source resolution | tenant | candidates same tenant | Data Admin | no last-write-wins; audit | 22,35 |
| `data.rule.execute` | RULES_IMPACT | execute rule | tenant | inputs/mappings compatible | Data Admin, ServicePrincipal | AutomationPolicy limits; audit | 18,22,36 |
| `data.snapshot.read` | DATA_TRUST | read snapshot | tenant, organizational_unit, process, service | same tenant and drilldown permission-limited | Report Viewer, Viewer, Executive/Board Viewer, GRC Manager, Data Admin | read-only | 22,27,42 |
| `reporting.report_run.execute` | ISO_REPORTING or REPORT_STUDIO | run report | tenant | capability by definition | GRC Manager, Report Viewer | snapshot-bound; audit | 22,27,42 |
| `reporting.report.approve` | ISO_REPORTING or REPORT_STUDIO | approve report | tenant | same tenant | GRC Manager | reviewer SoD; sensitive | 21,22,27 |
| `reporting.report.publish` | ISO_REPORTING or REPORT_STUDIO | publish report | tenant | same tenant/classification | GRC Manager | sensitive; reinforced audit | 21,22,27 |
| `ai.ai_recommendation.create` | AI_ASSISTANCE | request recommendation | tenant, assigned_object, owned_object | authorized/minimized context | AI Governance Manager, GRC Manager | no authority; audit | 22,26,36,42 |
| `ai.ai_recommendation.review` | AI_ASSISTANCE | review recommendation | tenant, assigned_object | same tenant | AI Governance Manager, GRC Manager | accepted recommendation still needs target-domain permission | 22,36 |

## PRE-F5 approved read-permission additions

These ten permissions materialize `DR-PHASE5-API-READ-2026-09-17-002`. They are read-only, entitlement-bound and default-DENY. A listed base role receives no tenant-wide visibility from the role name alone: effective access still requires the selected tenant, enabled capability, the granted permission, an allowed scope, object policy and SoD. Viewer, Report Viewer and Executive/Board Viewer remain read-only and can see only the objects permitted by their existing scope/object policy. Domain managers and owners receive only the reads required for their authorized objects.

The permission codes use HTML code markup in this PRE-F5 table to keep them outside the frozen Phase 3 seed parser. This contract-only step is expressly prohibited from modifying `database/`; runtime Permission/RolePermission materialization belongs to the later authorized Phase 5 implementation packet.

| permission_code | capability | action/resource | allowed scopes | tenant boundary | base roles containing it | entitlement / SoD / sensitive / audit | rector source |
|---|---|---|---|---|---|---|---|
| <code>compliance.applicability.read</code> | ISO_COMPLIANCE | read RequirementApplicability | tenant, organizational_unit, process, service, assigned_object, owned_object | selected tenant; Requirement visibility and same-tenant Subject scope enforced | Viewer, Report Viewer, Executive/Board Viewer, GRC Manager, Quality Manager, Compliance Manager, CISO/Security Manager, AI Governance Manager, Privacy Manager, Legal Reviewer, Auditor Lead, Auditor | read-only; ISO_COMPLIANCE entitlement; scope/object policy; protected access audit only when existing policy requires | DR-PHASE5-API-READ-2026-09-17-002; 09,22,42,44 |
| <code>compliance.requirement_assessment.read</code> | ISO_COMPLIANCE | read RequirementAssessment | tenant, organizational_unit, process, service, assigned_object, owned_object | assessment and its RequirementApplicability remain in selected tenant and authorized scope | Viewer, Report Viewer, Executive/Board Viewer, GRC Manager, Quality Manager, Compliance Manager, CISO/Security Manager, AI Governance Manager, Privacy Manager, Legal Reviewer, Auditor Lead, Auditor | read-only; no approval authority; result_status and domain_conclusion remain distinct | DR-PHASE5-API-READ-2026-09-17-002; 09,22,38,42,44 |
| <code>compliance.soa.read</code> | ISO_COMPLIANCE | read StatementOfApplicability and authorized items | tenant | selected tenant; entitled FrameworkVersion/control content visibility enforced | Viewer, Report Viewer, Executive/Board Viewer, GRC Manager, Quality Manager, Compliance Manager, CISO/Security Manager, AI Governance Manager, Privacy Manager, Legal Reviewer, Auditor Lead, Auditor | read-only; published/draft visibility follows object policy; no publish authority | DR-PHASE5-API-READ-2026-09-17-002; 09,22,41,42,44 |
| <code>controls.control.read</code> | CONTROLS_ASSURANCE | read Control, authorized ControlVersion/objective/scope references | tenant, organizational_unit, process, service, assigned_object, owned_object, audit_engagement | tenant controls same tenant; global references require entitlement/content visibility | Viewer, Report Viewer, Executive/Board Viewer, GRC Manager, Quality Manager, Compliance Manager, CISO/Security Manager, AI Governance Manager, Privacy Manager, Auditor Lead, Auditor, Process Owner, Control Owner | read-only; global reference does not prove tenant implementation | DR-PHASE5-API-READ-2026-09-17-002; 09,22,42,44 |
| <code>controls.control_assessment.read</code> | CONTROLS_ASSURANCE | read ControlAssessment | tenant, organizational_unit, process, service, assigned_object, owned_object, audit_engagement | assessment and Control/ControlVersion visibility resolved without cross-tenant disclosure | Viewer, Report Viewer, Executive/Board Viewer, GRC Manager, Quality Manager, Compliance Manager, CISO/Security Manager, AI Governance Manager, Privacy Manager, Auditor Lead, Auditor, Process Owner, Control Owner | read-only; no submit/review/approve authority; result_status and domain_conclusion remain distinct | DR-PHASE5-API-READ-2026-09-17-002; 09,22,38,42 |
| <code>controls.assurance_test.read</code> | CONTROLS_ASSURANCE | read AssuranceTest and authorized samples/result details | tenant, assigned_object, owned_object, audit_engagement | selected tenant; engagement, assignment and target Control policy enforced | Viewer, Report Viewer, Executive/Board Viewer, GRC Manager, Quality Manager, Compliance Manager, CISO/Security Manager, AI Governance Manager, Privacy Manager, Auditor Lead, Auditor, Control Owner | read-only; no execute/review/approve authority; sample/result fields permission-limited | DR-PHASE5-API-READ-2026-09-17-002; 09,22,38,42 |
| <code>evidence.evidence_request.read</code> | EVIDENCE_DOCUMENTS | read EvidenceRequest | tenant, assigned_object, owned_object, audit_engagement | selected tenant; typed target, requester/assignee and target-object visibility enforced | Viewer, Report Viewer, Executive/Board Viewer, GRC Manager, Quality Manager, Compliance Manager, CISO/Security Manager, AI Governance Manager, Privacy Manager, Legal Reviewer, Auditor Lead, Auditor, Control Owner, Evidence Owner | read-only; request read does not grant target-object or evidence-binary access | DR-PHASE5-API-READ-2026-09-17-002; 09,22,24,42,44 |
| <code>evidence.evidence.read</code> | EVIDENCE_DOCUMENTS | read Evidence/EvidenceVersion and authorized links/reviews | tenant, assigned_object, owned_object, audit_engagement | selected tenant; classification, aggregate ownership, typed link and object policy enforced | Viewer, Report Viewer, Executive/Board Viewer, GRC Manager, Quality Manager, Compliance Manager, CISO/Security Manager, AI Governance Manager, Privacy Manager, Legal Reviewer, Auditor Lead, Auditor, Control Owner, Evidence Owner | read-only; no secret/blob/signed URL; version/link/review fields remain permission-limited | DR-PHASE5-API-READ-2026-09-17-002; 09,22,24,42,44 |
| <code>remediation.issue.read</code> | ISSUES_ACTIONS | read Issue and authorized typed origins | tenant, assigned_object, owned_object, audit_engagement | selected tenant; origin object visibility and object policy enforced | Viewer, Report Viewer, Executive/Board Viewer, GRC Manager, Quality Manager, Compliance Manager, Risk Manager, CISO/Security Manager, AI Governance Manager, Privacy Manager, Legal Reviewer, Auditor Lead, Auditor, Process Owner, Control Owner, Action Owner | read-only; typed origin projection cannot expand access to source object | DR-PHASE5-API-READ-2026-09-17-002; 09,22,42,44 |
| <code>remediation.action.read</code> | ISSUES_ACTIONS | read Action and authorized evidence-link/verification metadata | tenant, assigned_object, owned_object, audit_engagement | selected tenant; parent Issue visibility, assignment and object policy enforced | Viewer, Report Viewer, Executive/Board Viewer, GRC Manager, Quality Manager, Compliance Manager, Risk Manager, CISO/Security Manager, AI Governance Manager, Privacy Manager, Legal Reviewer, Auditor Lead, Auditor, Process Owner, Control Owner, Evidence Owner, Action Owner | read-only; no transition/verify authority; linked Evidence still requires evidence read authority | DR-PHASE5-API-READ-2026-09-17-002; 09,22,24,42 |

```text
PRE_F5_READ_PERMISSION_ADDITIONS=10
TOTAL_EXECUTABLE_PERMISSIONS=144
PHASE_3_SEED_PERMISSION_ROWS=134
DATABASE_CONTRACT_CHANGED=0
```

## Additional lifecycle-registry permissions

These rows are exact actions permitted by rector 22 §10 and required by the unambiguous edges in seed manifest SEED-007. They do not create product capabilities.

| permission_code | capability | action/resource | allowed scopes | tenant boundary | base roles containing it | entitlement / SoD / sensitive / audit | rector source |
|---|---|---|---|---|---|---|---|
| `audit.audit.transition` | AUDIT | transition audit | tenant | same tenant; global definitions remain immutable | Auditor Lead | capability required; object policy; audit; SoD on review/approve/verify | 21,22,42 |
| `audit.audit.update` | AUDIT | update/plan audit | tenant | same tenant; global definitions remain immutable | Auditor Lead | capability required; object policy; audit; SoD on review/approve/verify | 21,22,42 |
| `compliance.requirement_assessment.archive` | ISO_COMPLIANCE | archive/supersede assessment | tenant | same tenant; global definitions remain immutable | Compliance Manager | capability required; object policy; audit; SoD on review/approve/verify | 21,22 |
| `controls.assurance_test.approve` | CONTROLS_ASSURANCE | approve assurance test | tenant | same tenant; global definitions remain immutable | GRC Manager, Auditor Lead | capability required; object policy; audit; SoD on review/approve/verify | 21,22 |
| `controls.assurance_test.review` | CONTROLS_ASSURANCE | review assurance test | tenant, audit_engagement | same tenant; global definitions remain immutable | Auditor, GRC Manager | capability required; object policy; audit; SoD on review/approve/verify | 21,22 |
| `controls.control_assessment.update` | CONTROLS_ASSURANCE | start/update control assessment | assigned_object, owned_object | same tenant; global definitions remain immutable | Control Owner | capability required; object policy; audit; SoD on review/approve/verify | 21,22 |
| `evidence.evidence.archive` | EVIDENCE_DOCUMENTS | expire/supersede evidence | tenant | same tenant; global definitions remain immutable | GRC Manager, Compliance Manager | capability required; object policy; audit; SoD on review/approve/verify | 21,22,24 |
| `evidence.evidence.update` | EVIDENCE_DOCUMENTS | revise rejected evidence | assigned_object, owned_object | same tenant; global definitions remain immutable | Evidence Owner | capability required; object policy; audit; SoD on review/approve/verify | 21,22,24 |
| `evidence.evidence_request.archive` | EVIDENCE_DOCUMENTS | cancel/expire request | tenant, assigned_object | same tenant; global definitions remain immutable | GRC Manager, Compliance Manager, Control Owner, Auditor Lead | capability required; object policy; audit; SoD on review/approve/verify | 21,22 |
| `evidence.evidence_request.update` | EVIDENCE_DOCUMENTS | cancel request | tenant, assigned_object | same tenant; global definitions remain immutable | GRC Manager, Compliance Manager, Control Owner, Auditor Lead | capability required; object policy; audit; SoD on review/approve/verify | 21,22 |
| `integration.integration.archive` | INTEGRATION_HUB | disable integration | tenant | same tenant; global definitions remain immutable | Data Admin | capability required; object policy; audit; SoD on review/approve/verify | 21,22 |
| `integration.integration.update` | INTEGRATION_HUB | authorize/connect integration | tenant | same tenant; global definitions remain immutable | Data Admin | capability required; object policy; audit; SoD on review/approve/verify | 21,22 |
| `operations.bia.approve` | RESILIENCE | approve BIA | tenant | same tenant; global definitions remain immutable | Continuity Manager, GRC Manager | capability required; object policy; audit; SoD on review/approve/verify | 21,22,42 |
| `operations.bia.archive` | RESILIENCE | supersede BIA | tenant | same tenant; global definitions remain immutable | Continuity Manager | capability required; object policy; audit; SoD on review/approve/verify | 21,22 |
| `operations.bia.review` | RESILIENCE | review BIA | tenant, process, service | same tenant; global definitions remain immutable | Continuity Manager | capability required; object policy; audit; SoD on review/approve/verify | 21,22 |
| `operations.bia.transition` | RESILIENCE | transition BIA | tenant, process, service | same tenant; global definitions remain immutable | Continuity Manager | capability required; object policy; audit; SoD on review/approve/verify | 21,22 |
| `operations.bia.verify` | RESILIENCE | record BIA test | tenant, process, service | same tenant; global definitions remain immutable | Continuity Manager | capability required; object policy; audit; SoD on review/approve/verify | 21,22 |
| `operations.continuity_plan.approve` | RESILIENCE | approve continuity plan | tenant | same tenant; global definitions remain immutable | Continuity Manager, GRC Manager | capability required; object policy; audit; SoD on review/approve/verify | 21,22,42 |
| `operations.continuity_plan.archive` | RESILIENCE | supersede continuity plan | tenant | same tenant; global definitions remain immutable | Continuity Manager | capability required; object policy; audit; SoD on review/approve/verify | 21,22 |
| `operations.continuity_plan.review` | RESILIENCE | review continuity plan | tenant, process, service | same tenant; global definitions remain immutable | Continuity Manager | capability required; object policy; audit; SoD on review/approve/verify | 21,22 |
| `operations.continuity_plan.transition` | RESILIENCE | transition continuity plan | tenant, process, service | same tenant; global definitions remain immutable | Continuity Manager | capability required; object policy; audit; SoD on review/approve/verify | 21,22 |
| `operations.continuity_plan.verify` | RESILIENCE | record continuity test | tenant, process, service | same tenant; global definitions remain immutable | Continuity Manager | capability required; object policy; audit; SoD on review/approve/verify | 21,22 |
| `operations.incident.transition` | INCIDENTS_LOSS | transition incident | tenant, assigned_object | same tenant; global definitions remain immutable | Risk Manager, CISO/Security Manager, Process Owner | capability required; object policy; audit; SoD on review/approve/verify | 21,22,42 |
| `operations.supplier_assessment.approve` | THIRD_PARTIES | approve supplier assessment | tenant | same tenant; global definitions remain immutable | Supplier Manager, GRC Manager | capability required; object policy; audit; SoD on review/approve/verify | 21,22,42 |
| `operations.supplier_assessment.archive` | THIRD_PARTIES | expire supplier assessment | tenant | same tenant; global definitions remain immutable | Supplier Manager | capability required; object policy; audit; SoD on review/approve/verify | 21,22 |
| `operations.supplier_assessment.review` | THIRD_PARTIES | review supplier assessment | tenant, assigned_object | same tenant; global definitions remain immutable | Supplier Manager | capability required; object policy; audit; SoD on review/approve/verify | 21,22 |
| `operations.supplier_assessment.submit` | THIRD_PARTIES | request/submit supplier assessment | tenant, assigned_object | same tenant; global definitions remain immutable | Supplier Manager | capability required; object policy; audit; SoD on review/approve/verify | 21,22 |
| `operations.supplier_assessment.transition` | THIRD_PARTIES | transition supplier assessment | tenant, assigned_object | same tenant; global definitions remain immutable | Supplier Manager | capability required; object policy; audit; SoD on review/approve/verify | 21,22 |
| `operations.survey.approve` | SURVEYS | publish/accept survey object | tenant | same tenant; global definitions remain immutable | GRC Manager | capability required; object policy; audit; SoD on review/approve/verify | 21,22,42 |
| `operations.survey.archive` | SURVEYS | retire survey definition | tenant | same tenant; global definitions remain immutable | GRC Manager | capability required; object policy; audit; SoD on review/approve/verify | 21,22 |
| `operations.survey.reject` | SURVEYS | invalidate survey response | tenant, assigned_object | same tenant; global definitions remain immutable | GRC Manager | capability required; object policy; audit; SoD on review/approve/verify | 21,22 |
| `operations.survey.review` | SURVEYS | analyze survey campaign | tenant | same tenant; global definitions remain immutable | GRC Manager | capability required; object policy; audit; SoD on review/approve/verify | 21,22 |
| `operations.survey.transition` | SURVEYS | activate/close survey campaign | tenant | same tenant; global definitions remain immutable | GRC Manager | capability required; object policy; audit; SoD on review/approve/verify | 21,22 |
| `operations.survey.update` | SURVEYS | schedule survey campaign | tenant | same tenant; global definitions remain immutable | GRC Manager | capability required; object policy; audit; SoD on review/approve/verify | 21,22 |
| `reporting.report.archive` | ISO_REPORTING or REPORT_STUDIO | supersede report | tenant | same tenant; global definitions remain immutable | GRC Manager | capability required; object policy; audit; SoD on review/approve/verify | 21,22,27 |
| `reporting.report.review` | ISO_REPORTING or REPORT_STUDIO | review report | tenant | same tenant; global definitions remain immutable | GRC Manager | capability required; object policy; audit; SoD on review/approve/verify | 21,22,27 |
| `risk.risk.transition` | OPERATIONAL_RISK | transition risk | tenant, assigned_object, owned_object | same tenant; global definitions remain immutable | Risk Manager | capability required; object policy; audit; SoD on review/approve/verify | 21,22,42 |
| `risk.treatment.transition` | OPERATIONAL_RISK | transition treatment | tenant, assigned_object | same tenant; global definitions remain immutable | Risk Manager | capability required; object policy; audit; SoD on review/approve/verify | 21,22 |
| `risk.treatment.verify` | OPERATIONAL_RISK | verify treatment | tenant | same tenant; global definitions remain immutable | GRC Manager, Risk Manager | capability required; object policy; audit; SoD on review/approve/verify | 21,22 |

`PUBLISHED_PERMISSION_ROWS_BEFORE_FINAL_DECISIONS=100`; 61 operation-catalog permissions plus 39 additional lifecycle-registry permissions were already published.

## Human-approved final permission resources

H-003..H-005 authorize these Permission rows over existing entities and capabilities. They add no entitlement/capability or physical entity. `NONE` means the Permission is published without a base-role grant; custom roles still require an explicit governed grant.

| permission_code | capability | action/resource | allowed scopes | tenant boundary | base roles containing it | entitlement / SoD / sensitive / audit | source |
|---|---|---|---|---|---|---|---|
| `configuration.configuration_definition.read` | CORE_PLATFORM | read configuration definition | platform | global/platform definitions only | Platform Admin | no tenant content authority; audit by access policy | 29,33,39; H-003 |
| `configuration.configuration_definition.create` | CORE_PLATFORM | create configuration definition | platform | global/platform definitions only | Platform Admin | author/reviewer/approver/publisher SoD; reinforced audit | 22,29,39; H-003 |
| `configuration.configuration_definition.update` | CORE_PLATFORM | update draft configuration definition | platform | published definition immutable | Platform Admin | author/reviewer/approver/publisher SoD; reinforced audit | 22,29,39; H-003 |
| `configuration.configuration_definition.review` | CORE_PLATFORM | review configuration definition | platform | global/platform definitions only | Platform Admin | reviewer distinct where SoD requires; reinforced audit | 22,29,39; H-003 |
| `configuration.configuration_definition.approve` | CORE_PLATFORM | approve configuration definition | platform | global/platform definitions only | Platform Admin | approver distinct where SoD requires; reinforced audit | 22,29,39; H-003 |
| `configuration.configuration_definition.publish` | CORE_PLATFORM | publish configuration definition | platform | published version immutable | Platform Admin | author/review/approve/publish SoD; reinforced audit | 22,29,39; H-003 |
| `configuration.configuration_definition.archive` | CORE_PLATFORM | archive configuration definition | platform | no destructive delete or history rewrite | Platform Admin | reason and reinforced audit | 23,29,39; H-003 |
| `configuration.configuration_override.read` | CORE_PLATFORM | read configuration override | tenant, organizational_unit, process, service, assigned_object, owned_object | always tenant-scoped; definition must allow override | GRC Manager, Tenant Admin, Data Admin | CORE_PLATFORM; object policy; audit by access policy | 29,39,42; H-003 |
| `configuration.configuration_override.create` | CORE_PLATFORM | create configuration override | tenant, organizational_unit, process, service, assigned_object, owned_object | always tenant-scoped; never mutates global definition | GRC Manager, Tenant Admin | definition flags/type/scope enforced; audit | 29,39,42; H-003 |
| `configuration.configuration_override.update` | CORE_PLATFORM | update draft configuration override | tenant, organizational_unit, process, service, assigned_object, owned_object | same tenant and definition | GRC Manager, Tenant Admin | row version; audit | 22,29,39; H-003 |
| `configuration.configuration_override.review` | CORE_PLATFORM | review configuration override | tenant, organizational_unit, process, service | same tenant | GRC Manager | author/reviewer SoD; reinforced audit | 22,29,39; H-003 |
| `configuration.configuration_override.approve` | CORE_PLATFORM | approve configuration override | tenant | same tenant | NONE | Permission exists without base grant; SoD; reinforced audit | 22,29,39; H-003 |
| `configuration.configuration_override.archive` | CORE_PLATFORM | archive configuration override | tenant | same tenant; preserves history | NONE | Permission exists without base grant; reason; audit | 23,29,39; H-003 |
| `configuration.effective_configuration.read` | CORE_PLATFORM | read resolved EffectiveConfiguration | tenant, organizational_unit, process, service, assigned_object, owned_object | TENANT_DERIVED; inputs same tenant | Data Admin | resolution is read-only; conflicts explicit; no direct write | 29,33,39; H-003 |
| `privacy.retention_policy.read` | PRIVACY | read retention policy | tenant | tenant policy/content only; global policy visibility does not grant mutation | Privacy Manager, Legal Reviewer, GRC Manager | PRIVACY entitlement; minimized access | 23,39,42; H-004 |
| `privacy.retention_policy.create` | PRIVACY | create retention policy | tenant | tenant-owned policy only | Privacy Manager | legal/regulatory precedence preserved; audit | 23,39,42; H-004 |
| `privacy.retention_policy.update` | PRIVACY | update draft retention policy | tenant | tenant-owned draft only | Privacy Manager | published immutable; audit | 23,39; H-004 |
| `privacy.retention_policy.review` | PRIVACY | review retention policy | tenant | same tenant | Privacy Manager, Legal Reviewer | author/reviewer SoD; legal exception/hold review; reinforced audit | 22,23,39; H-004 |
| `privacy.retention_policy.approve` | PRIVACY | approve retention policy | tenant | same tenant | Legal Reviewer | legal decision; author/approver SoD; reinforced audit | 22,23,42; H-004 |
| `privacy.retention_policy.publish` | PRIVACY | publish retention policy | tenant | same tenant; cannot weaken mandatory/contractual policy | Privacy Manager | approval required; reinforced audit | 22,23,39; H-004 |
| `privacy.retention_policy.archive` | PRIVACY | archive retention policy | tenant | same tenant; history retained | Privacy Manager | no purge authorization by itself; reason; audit | 23,39; H-004 |
| `privacy.data_subject_request.read` | PRIVACY | read data-subject request | tenant | same tenant; personal content minimized | Privacy Manager, Legal Reviewer, GRC Manager | restricted; reinforced access audit by policy | 26,39,42; H-004 |
| `privacy.data_subject_request.create` | PRIVACY | create data-subject request | tenant | same tenant | Privacy Manager | request identity minimized; audit | 33,39,42; H-004 |
| `privacy.data_subject_request.update` | PRIVACY | update data-subject request | tenant, assigned_object | same tenant | Privacy Manager | lifecycle/object policy; audit | 22,39; H-004 |
| `privacy.data_subject_request.review` | PRIVACY | review data-subject request | tenant, assigned_object | same tenant | Privacy Manager, Legal Reviewer | legal decision/exception review; SoD; reinforced audit | 22,39,42; H-004 |
| `privacy.data_subject_request.approve` | PRIVACY | approve data-subject request decision | tenant | same tenant | Legal Reviewer | author/approver SoD; reinforced audit | 22,39,42; H-004 |
| `privacy.data_subject_request.transition` | PRIVACY | execute an explicitly published request transition | tenant, assigned_object | same tenant; no generic status write | Privacy Manager | only registry edge; reason where required; audit | 21,22,39; H-004 |
| `privacy.data_subject_request.archive` | PRIVACY | archive data-subject request | tenant | same tenant; protected history retained | Privacy Manager | no destructive delete; reason; audit | 23,39; H-004 |
| `privacy.erasure_execution.read` | PRIVACY | read erasure execution | tenant | same tenant; record must not reintroduce erased data | Privacy Manager, Legal Reviewer, GRC Manager | restricted; retention/legal hold enforced | 23,39,42; H-004 |
| `privacy.erasure_execution.execute` | PRIVACY | execute controlled erasure | tenant, assigned_object | same tenant; per-object policy/action | Privacy Manager | approved workflow; retention/legal hold; executor/reviewer SoD; reinforced audit | 22,23,39; H-004 |
| `privacy.erasure_execution.review` | PRIVACY | review erasure execution | tenant | same tenant | Privacy Manager, Legal Reviewer | reviewer distinct from executor; legal exceptions/hold; reinforced audit | 22,23,39,42; H-004 |
| `platform.lifecycle_transition.read` | CORE_PLATFORM | read LifecycleTransitionDefinition registry | platform | PLATFORM_CONTROL; no tenant registry | Platform Admin | read registry only; administering is separate | 21,33; H-005 |
| `platform.lifecycle_transition.administer` | CORE_PLATFORM | administer draft registry definition | platform | PLATFORM_CONTROL; no tenant variant entity | Platform Admin | versioned; no arbitrary executable rules; reinforced audit | 21,22,33; H-005 |
| `platform.lifecycle_transition.publish` | CORE_PLATFORM | publish registry definition | platform | PLATFORM_CONTROL; published immutable | Platform Admin | review/publish SoD; reinforced audit; not domain transition execution | 21,22,33; H-005 |

`PUBLISHED_PERMISSION_ROWS=134`. A Permission may exist without a base grant. Every authorization remains default DENY and entitlement/scope/object-policy/SoD constrained.

## Grant rules

- Base grants above are minimum; no role receives every action in its domain implicitly.
- Viewer roles remain read-only. Platform Support has no impersonation. Tenant Admin has no blanket approval. Evidence Owner does not approve own evidence; Action Owner does not verify own action.
- Pack-specific coapproval is enforced by object policy/SoD in addition to Permission.
- Custom roles may compose only published Permission rows and are tenant-owned; baseline roles are immutable.
- Exports require the resource `export` permission when later published and inherit read scope; no export operation is published in this iteration.

`PERMISSION_CATALOG=PASS` as a Phase 2 contract candidate.
