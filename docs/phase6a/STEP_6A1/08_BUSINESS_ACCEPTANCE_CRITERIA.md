# Business acceptance criteria

Audit date: 2026-10-08. Baseline: main at 6af66387aa03fa185ef139584de07700f247b903.
Master: TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23. Mode: READ_ONLY_AUDIT.
Recommendations are audit proposals for the authorized later stages; no application contract or runtime change is approved by this artifact.

Mandatory human acceptance rule:

> Ningún módulo de Tecdex GRC podrá considerarse funcionalmente terminado si sus operaciones habituales requieren que el usuario empresarial conozca identificadores técnicos, estructuras JSON o relaciones internas de la base de datos.

This is prospective Phase 6A product acceptance. Phase 5 technical closure remains closed and its historical PASS evidence is not rewritten.

## Checks required for every audited operation

AC-G01: a business user completes the operation without typing/copying a UUID, inspecting a database, consulting an API operation name or editing JSON. Codes remain legitimate business inputs only where the current contract assigns them to the caller; they do not replace canonical IDs.

AC-G02: labels explain meaning/source, required/optional/conditional fields and prerequisites. Dates/units/state/result/conclusion are distinguishable. Prerequisite absence, unauthorized access and loading/error are separate; empty states direct only to explicitly authorized existing actions.

AC-G03: only authorized canonical selections for the validated tenant are available; failed or stale reference lookup cannot become a usable empty/default value. Paging includes all permitted candidates; tenant/parent change resets dependent options and selections. Missing capabilities/vocabularies are resolved contractually before dependent UI acceptance; no bypass/fallback.

AC-G04: backend enforces membership, entitlement, permission-specific scope, object policy and SoD on every read/mutation. Negative tests reject foreign tenant IDs and incompatible/unpublished references even when a client tampers with payload. A Platform grant alone grants no tenant business access. No hidden authority escalation, entity/invitation creation or role grant occurs.

AC-G05: existing operation/path/member names/types/cardinalities are preserved; optional absent values remain absent. Canonical workflow source and destination states are used. Expected row version or strong If-Match is supplied from authoritative detail. Stale concurrency returns conflict. Audit, idempotency/replay and outbox remain verified; no duplicate business mutation on safe retry.

AC-G06: labels are programmatically associated; keyboard selection/submission works; focus enters/leaves drawers predictably; field validation is linked via accessible descriptions and error summary; errors retain actionable business reason without secrets/IDs. Desktop, laptop, tablet and narrow viewport keep required actions legible and operable. Use approved local brand/tokens/layout, applicable visual regression and human UI review for later UI changes. This audit does not self-approve human or runtime gates.

## Form-specific verifiable acceptance

| Acceptance ID | Screen / operation | Business operation test (all AC-G apply) |
| --- | --- | --- |
| AC-F01 | cumplimiento / applicabilityCreate | Select authorized Requirement and optional active/effective scope or tenant-wide; decision; nonblank rationale for not_applicable; explicit effective interval. |
| AC-F02 | cumplimiento / applicabilitySubmit | Draft → submitted; rationale required; selected row concurrency preserved. |
| AC-F03 | cumplimiento / applicabilityApprove | Submitted → approved; distinct approval actor/SoD; no editable lifecycle. |
| AC-F04 | requisitos / requirementAssessmentCreate | Resolve readable parent applicability; choose published ComplianceMethodology; optional configuration explains source and omission; no manual reference. |
| AC-F05 | requisitos / requirementAssessmentStart | not_assessed → in_progress from selected canonical assessment. |
| AC-F06 | requisitos / requirementAssessmentSubmit | in_progress → assessed; ResultStatus required; conclusion and coverage optional per contract, separated and explained. |
| AC-F07 | requisitos / requirementAssessmentApprove | assessed → approved with current version and required independence. |
| AC-F08 | soa / soaCreate | Readable FrameworkVersion; one+ structured reference-control items; justification and implementation state; paired tenant Control/version; exact typed serialization. |
| AC-F09 | soa / soaPublish | draft → published via existing command; reason required; items and framework displayed. |
| AC-F10 | controles / controlInstantiate | Authorized base version and active Subject owner; business definition explained; code remains caller-owned; new tenant instance distinct from base. |
| AC-F11 | evaluaciones-control / controlAssessmentCreate | Same-tenant Control and matching version; published Controls methodology; optional configuration resolved only by approved domain rules. |
| AC-F12 | evaluaciones-control / controlAssessmentStart | planned → in_progress; explain backend ownership/tenant scope prerequisites. |
| AC-F13 | evaluaciones-control / controlAssessmentSubmit | in_progress → completed; compatible published methodology; design/operating paired; valid requires design/operating/coverage/conclusion and minimum coverage; overall remains server-derived. |
| AC-F14 | evaluaciones-control / controlAssessmentReview | completed → reviewed; independent permitted reviewer. |
| AC-F15 | evaluaciones-control / controlAssessmentApprove | reviewed → approved; independent permitted approver. |
| AC-F16 | pruebas / assuranceTestCreate | Same-tenant Control and matching version; explained test business code; optional planned instant. |
| AC-F17 | pruebas / assuranceTestStart | planned → in_progress for selected parent control/version. |
| AC-F18 | pruebas / assuranceTestExecute | in_progress → completed; ResultStatus; optional conclusion/samples; guided sample rows; count/period validation. |
| AC-F19 | pruebas / assuranceTestReview | completed → reviewed; independent reviewer; inspect samples/result. |
| AC-F20 | pruebas / assuranceTestApprove | reviewed → approved; independent approval and readable result history. |
| AC-F21 | solicitudes-evidencia / evidenceRequestCreate | Exactly one readable typed target; legitimate optional assignee and UTC due instant; explain target and request business code. |
| AC-F22 | solicitudes-evidencia / evidenceRequestFulfill | open → fulfilled; approved eligible EvidenceVersion chosen by code/version; typed link matches request exact target. |
| AC-F23 | evidencias / evidenceCreate | Upload scan/finalization context or legitimate selected finalized file; policy/owner meaning; structured one+ typed links; exact validity/period/effective/expiry semantics. |
| AC-F24 | evidencias / evidenceSubmit | draft version → submitted; scan passed, one+ typed link; exact displayed version target. |
| AC-F25 | evidencias / evidenceReviewStart | submitted version → under_review; display subject/version/prerequisites. |
| AC-F26 | evidencias / evidenceApprove | under_review version → approved; rationale required; sufficiency/relevance optional; independent reviewer; review history visible. |
| AC-F27 | evidencias / evidenceReject | under_review version → rejected; rationale required; optional review rubric; no expiry/approval inferred. |
| AC-F28 | retencion / retentionPolicyCreate | Policy business code/version ownership clear; exact kind/rank/trigger mapping; nonnegative duration; boolean mandatory; no implied legal default. |
| AC-F29 | retencion / retentionPolicyUpdate | Draft-only edit of duration/mandatory; strong If-Match; identity/kind/precedence not editable. |
| AC-F30 | retencion / retentionPolicyReview | draft → under_review with strong If-Match and empty command body. |
| AC-F31 | retencion / retentionPolicyApprove | under_review → approved; distinct author/approver; strong If-Match and empty body. |
| AC-F32 | retencion / retentionPolicyPublish | approved → published; strong If-Match; no user-entered server effective time. |
| AC-F33 | issues / issueCreate | One of three readable Core origins; verified issue kind and vocabulary; optional Subject owner; business title/description/severity/priority and due date. |
| AC-F34 | issues / issueTriage | open → triaged; severity/priority required; owner/due_date optional; readable origin retained. |
| AC-F35 | issues / issueStartRemediation | triaged → remediation_in_progress with selected issue version. |
| AC-F36 | issues / issueRequestVerification | remediation_in_progress → pending_verification; explain verification prerequisites. |
| AC-F37 | issues / issueVerifyClose | pending_verification → verified_closed; accepted + rationale; current version and SoD; no arbitrary status. |
| AC-F38 | acciones / actionCreate | Readable parent Issue supplied by context or selection and serialized in path; optional legitimate membership; business code/title/description/priority/date. |
| AC-F39 | acciones / actionStart | pending → in_progress with assigned/owned authorization enforced in backend. |
| AC-F40 | acciones / actionSubmitForReview | in_progress → in_review; distinguish submission from completion. |
| AC-F41 | acciones / actionComplete | in_review → completed; approved eligible evidence version + verified link_role; closure link is canonical. |
| AC-F42 | acciones / actionVerify | completed → verified; accepted + rationale; optional business retest_reference; verifier is not completer/assignee. |

## Details/navigation acceptance

All eleven list/detail workspaces use business labels to identify an object and its references. Navigation supplies the confirmed parent/context when creating a child; breadcrumb and return context remain visible. SoA items, assurance samples, Evidence version/links/reviews, Issue origins and Action evidence/verification records are rendered from existing authorized projections. Control owner is named from an authorized Subject read. No field becomes a link merely because its value looks like a UUID.

For each confirmed edge in 04, test one authorized path and a denied/missing-reference path. For unsupported edges, verify no invented navigation or auto-created relation exists. For each JSON field, assert the structured editor produces an object that passes its existing closed schema; no textarea or hidden technical editor is needed. For each U-VOC family, test the approved resolved source or explicitly confirmed free-text contract, never examples as inferred enums.

Evidence to obtain only in 6A.6 under its authorization: per-operation functional/E2E outcomes, negative tenant/RBAC/SoD cases, idempotency/concurrency/audit receipts, accessibility/responsive and visual regressions, real authorized runtime and human business acceptance. No such suites or QA flows were run in 6A.1.
