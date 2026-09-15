# Domain and integration event catalog

| Campo | Valor |
|---|---|
| Contract owner | Backend Owner |
| Approving human roles | Architecture Owner, Backend Owner, Security & Privacy Reviewer, domain owners |
| Status | `CONTRACT_DEFINED` |

Domain/integration events are confirmed facts for inter-context/asynchronous work. Audit events are accountability records and are cataloged in 08. OutboxEvent is delivery persistence, not a third business fact.

## Envelope and profiles

Every row uses envelope `event_id UUIDv7`, `event_type`, `event_version=1`, `ownership_class`, conditional `tenant_id`, `aggregate_type/id`, `occurred_at UTC`, typed actor, `correlation_id`, nullable `causation_id`, minimal payload and classification. `event_id` is the deduplication key; outbox is required; delivery is at-least-once; order is guaranteed only per aggregate version when the row changes an aggregate; retention is effective policy; payload never contains secrets, blobs, signed URLs or unlicensed content.

Payload profiles:

- `CREATED`: aggregate ID, stable public/business code when non-sensitive, ownership and resulting lifecycle/row version.
- `TRANSITION`: aggregate ID, `from_state`, `to_state`, command code and resulting version; reason is referenced/minimized, not copied when sensitive.
- `PUBLISHED`: aggregate/version IDs, content/config hash and published timestamp; no protected body.
- `JOB_REQUESTED`: durable job/run ID, definition/version IDs, scope/period refs and checkpoint/input hash when applicable.
- `DECISION`: aggregate ID, decision code, reviewer/approver ref and resulting version.

## Published v1 events

`NONE_CONTRACTUALLY_REQUIRED` means no consumer is invented; the event still provides a stable integration fact for the explicitly mapped operation/lifecycle and may be omitted from dispatch only if its operation row says `NONE`.

| event_name | owner / producer | aggregate; ownership | payload | known consumers by contract | security | rector source |
|---|---|---|---|---|---|---|
| `platform.tenant.provisioned.v1` | Platform / tenantCreate | Tenant; PLATFORM_CONTROL | CREATED | tenant-bootstrap worker | confidential | 25,42,43 F3 |
| `platform.tenant.archived.v1` | Platform / tenantArchive | Tenant; PLATFORM_CONTROL | TRANSITION | NONE_CONTRACTUALLY_REQUIRED | confidential | 23,39 |
| `iam.membership.created.v1` | IAM / membershipCreate | TenantMembership; TENANT_OWNED | CREATED | NONE_CONTRACTUALLY_REQUIRED | confidential/PII-minimized | 22,42 |
| `iam.role.assigned.v1` | IAM / membershipRoleAssign | MembershipRole; TENANT_OWNED | CREATED | authorization cache invalidator only; cache non-authoritative | confidential | 22,26 |
| `iam.role.revoked.v1` | IAM / membershipRoleRevoke | MembershipRole; TENANT_OWNED | TRANSITION | authorization cache invalidator only | confidential | 22,26 |
| `iam.impersonation.started.v1` | IAM / impersonationStart | ImpersonationSession; TENANT_OWNED | CREATED | security monitoring | restricted | 22 |
| `iam.impersonation.ended.v1` | IAM / impersonationEnd | ImpersonationSession; TENANT_OWNED | TRANSITION | security monitoring | restricted | 22 |
| `compliance.applicability.submitted.v1` | Compliance / applicabilitySubmit | RequirementApplicability; TENANT_OWNED | TRANSITION | approval notification policy if published | confidential | 21,44 |
| `compliance.applicability.approved.v1` | Compliance / applicabilityApprove | RequirementApplicability; TENANT_OWNED | DECISION | calculation invalidation/recalculation policy | confidential | 21,38,44 |
| `compliance.requirement_assessment.assessed.v1` | Compliance / requirementAssessmentSubmit | RequirementAssessment; TENANT_OWNED | TRANSITION | issue/rules evaluation only through approved mappings | confidential | 21,38 |
| `compliance.requirement_assessment.approved.v1` | Compliance / requirementAssessmentApprove | RequirementAssessment; TENANT_OWNED | DECISION | snapshot/metric recalculation policy | confidential | 21,38 |
| `compliance.soa.published.v1` | Compliance / soaPublish | StatementOfApplicability; TENANT_OWNED | PUBLISHED | reporting/snapshot consumers | confidential | 41,44 |
| `knowledge.regulatory_pack.published.v1` | Regulatory Content / regulatoryPackPublish | RegulatoryPackVersion; GLOBAL_REFERENCE | PUBLISHED | pack availability/read model; tenant adoption remains explicit | protected metadata | 37,41,44 |
| `controls.control.instantiated.v1` | Controls / controlInstantiate | Control; TENANT_OWNED | CREATED | NONE_CONTRACTUALLY_REQUIRED | confidential | 41,44 |
| `controls.control_assessment.completed.v1` | Controls / controlAssessmentSubmit | ControlAssessment; TENANT_OWNED | TRANSITION | review workflow | confidential | 21,39 |
| `controls.control_assessment.approved.v1` | Controls / controlAssessmentApprove | ControlAssessment; TENANT_OWNED | DECISION | effectiveness calculation/snapshot policy | confidential | 17,21,39 |
| `controls.assurance_test.completed.v1` | Controls / assuranceTestExecute | AssuranceTest; TENANT_OWNED | TRANSITION | control assessment/evidence consumers | confidential | 21,24 |
| `evidence.file.quarantined.v1` | Evidence / uploadFinalize | FileObject; TENANT_OWNED | CREATED + checksum/MIME/size refs | malware-scan worker | restricted | 24 |
| `evidence.request.opened.v1` | Evidence / evidenceRequestCreate | EvidenceRequest; TENANT_OWNED | CREATED + typed target ref | notification policy | confidential | 21,24 |
| `evidence.request.fulfilled.v1` | Evidence / evidenceRequestFulfill | EvidenceRequest; TENANT_OWNED | TRANSITION + EvidenceVersion ref | request owner notification | confidential | 21,24 |
| `evidence.evidence.submitted.v1` | Evidence / evidenceSubmit | EvidenceVersion; TENANT_OWNED | TRANSITION | review workflow | confidential | 21,24 |
| `evidence.evidence.approved.v1` | Evidence / evidenceApprove | EvidenceVersion; TENANT_OWNED | DECISION + period/eligibility refs | metrics/rules/snapshot invalidation policy | restricted | 21,24 |
| `evidence.evidence.rejected.v1` | Evidence / evidenceReject | EvidenceVersion; TENANT_OWNED | DECISION | submitter notification | restricted | 21,24 |
| `remediation.issue.opened.v1` | Remediation / issueCreate | Issue; TENANT_OWNED | CREATED + typed origin ref | operational inbox/notification | confidential | 21,44 |
| `remediation.issue.triaged.v1` | Remediation / issueTriage | Issue; TENANT_OWNED | TRANSITION | action/inbox consumers | confidential | 21 |
| `remediation.action.created.v1` | Remediation / actionCreate | Action; TENANT_OWNED | CREATED + Issue ref | Action Owner notification | confidential | 21 |
| `remediation.action.completed.v1` | Remediation / actionComplete | Action; TENANT_OWNED | TRANSITION + closure evidence refs | verification workflow/metrics | confidential | 21,24 |
| `remediation.action.verified.v1` | Remediation / actionVerify | Action; TENANT_OWNED | DECISION | issue verification/metrics/snapshot policy | confidential | 21 |
| `risk.risk.identified.v1` | Risk / riskCreate | Risk; TENANT_OWNED | CREATED + scope refs | NONE_CONTRACTUALLY_REQUIRED | confidential | 21,39 |
| `risk.assessment.submitted.v1` | Risk / riskAssessmentSubmit | RiskAssessment; TENANT_OWNED | DECISION + methodology/result refs | appetite/tolerance evaluation/snapshot policy | restricted | 38,39 |
| `risk.treatment.approved.v1` | Risk / riskTreatmentApprove | RiskTreatment; TENANT_OWNED | TRANSITION | action/monitoring policy | confidential | 21 |
| `risk.acceptance.requested.v1` | Risk / riskAcceptanceRequest | RiskAcceptance; TENANT_OWNED | CREATED + expiry/review refs | approval workflow | restricted | 22,39 |
| `risk.acceptance.approved.v1` | Risk / riskAcceptanceApprove | RiskAcceptance; TENANT_OWNED | DECISION | monitoring/notification policy; score unchanged | restricted | 22,39 |
| `operations.incident.reported.v1` | Incidents / incidentCreate | Incident; TENANT_OWNED | CREATED + subject refs | risk/control/rule consumers only through approved mappings | restricted | 21 |
| `operations.survey_response.submitted.v1` | Surveys / surveyResponseSubmit | SurveyResponse; TENANT_OWNED | TRANSITION | normalization/assessment consumer defined by SurveyVersion | confidential | 21 |
| `audit.audit.approved.v1` | Audit / auditApprove | Audit; TENANT_OWNED | DECISION | assigned-team notification | confidential | 21 |
| `audit.audit_test.completed.v1` | Audit / auditTestExecute | AuditTest; TENANT_OWNED | TRANSITION + evidence refs | Issue creation only via explicit command | confidential | 07,21 |
| `integration.integration.configured.v1` | Integration / integrationConfigure | Integration; TENANT_OWNED | CREATED + ConnectorVersion ref, never credential | sync scheduling worker | restricted | 20,26 |
| `integration.sync.requested.v1` | Integration / syncRunStart | SyncRun; TENANT_OWNED | JOB_REQUESTED | connector sync worker | restricted | 14,20,25 |
| `data.calculation.requested.v1` | Data / calculationRunStart | CalculationRun; TENANT_DERIVED | JOB_REQUESTED | deterministic calculation worker | confidential | 14,17,25,38 |
| `data.source_resolution.created.v1` | Data / sourceResolutionCreate | SourceResolution; TENANT_DERIVED | CREATED + policy/candidate/selected ID hashes | calculation consumers referencing resolution | confidential | 35 |
| `rules.evaluation.requested.v1` | Rules / ruleEvaluationStart | RuleEvaluation; TENANT_DERIVED | JOB_REQUESTED | rule evaluation worker | confidential | 18,36 |
| `reporting.report.requested.v1` | Reporting / reportRunStart | ReportRun; TENANT_OWNED | JOB_REQUESTED + concrete Snapshot refs | report worker | confidential | 23,27 |
| `reporting.report.approved.v1` | Reporting / reportApprove | ReportArtifact; TENANT_OWNED | DECISION | publication workflow | confidential | 21,27 |
| `reporting.report.published.v1` | Reporting / reportPublish | ReportArtifact; TENANT_OWNED | PUBLISHED | notification/download projection | confidential | 21,27 |
| `ai.recommendation.requested.v1` | AI / aiRecommendationRequest | AIJob; TENANT_OWNED | JOB_REQUESTED + purpose/context hash | governed `ia2.tcdx.int` adapter worker | restricted | 26,36 |
| `ai.recommendation.reviewed.v1` | AI / aiRecommendationReview | AIRecommendation; TENANT_OWNED | DECISION + accepted domain command ref if any | NONE_CONTRACTUALLY_REQUIRED; target command is separately invoked/authorized | restricted | 36 |

`PUBLISHED_EVENT_TYPES=47`. No future consumer is invented. A consumer addition changes this catalog and tests; it does not acquire write authority over the producer aggregate.

`EVENT_CATALOG=PASS` as a Fase 2 contract candidate.
