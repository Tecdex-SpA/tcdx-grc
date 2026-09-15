# Permission, capability and base-role catalog

| Campo | Valor |
|---|---|
| Contract owner | Security & Privacy Reviewer |
| Approving human roles | Product Owner/CPO, Architecture Owner, Security & Privacy Reviewer, domain owners |
| Status | `BLOCKED_BY_THREE_PERMISSION_RESOURCE_DECISIONS` |

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

`PUBLISHED_PERMISSION_ROWS=100`; 61 operation-catalog permissions plus 39 additional lifecycle-registry permissions are published. Each is used by an operation or lifecycle edge; absence remains DENY.

## Unresolved permission resources

Rector 29/33/39 require Configuration, Retention/Erasure and LifecycleTransitionDefinition operations, but rector 22 §10 omits matching permission resources. Creating `platform.configuration.*`, `operations.erasure.*` or `platform.lifecycle_transition.*` would expand the normative Permission Registry. These three resource families remain `HUMAN_DECISION_REQUIRED`; operations OP-B01..03 and their seed grants remain blocked.

## Grant rules

- Base grants above are minimum; no role receives every action in its domain implicitly.
- Viewer roles remain read-only. Platform Support has no impersonation. Tenant Admin has no blanket approval. Evidence Owner does not approve own evidence; Action Owner does not verify own action.
- Pack-specific coapproval is enforced by object policy/SoD in addition to Permission.
- Custom roles may compose only published Permission rows and are tenant-owned; baseline roles are immutable.
- Exports require the resource `export` permission when later published and inherit read scope; no export operation is published in this iteration.
