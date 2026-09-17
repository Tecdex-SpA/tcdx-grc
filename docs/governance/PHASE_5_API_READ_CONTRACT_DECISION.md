# TCDX GRC — Phase 5 API Read Contract Decision

## Decision record

- Decision ID: `DR-PHASE5-API-READ-2026-09-17-002`
- Date: `2026-09-17`
- Status: `APPROVED`
- Owner/approver: Andrés Barouh acting as Product Owner/CPO, Architecture Owner, Backend Owner and Security & Privacy Reviewer.
- Gate unlocked: `PHASE_5_API_READ_CONTRACT=APPROVED`

## Problem

The Phase 2 executable API contract publishes the write/command operations required by the Core GRC domains but lacks the read surface needed for the Phase 5 backend, UI, E2E and traceability slice. Implementing those reads without a human decision would silently expand the executable contract.

## Decision

Approve a minimal read-only API surface over existing canonical entities. The amendment creates no new business entity, capability, lifecycle, persistence structure or source of authority.

All paths remain relative to `/api/v1`. All reads are `RO`, naturally idempotent, tenant/scope filtered, cursor-paginated where list semantics apply, and return only fields authorized by the canonical resource/projection contract. Read operations emit no domain event. Protected access remains auditable according to the existing access/audit policy.

### Approved Phase 5 read resources

| operation_id | method/path | domain/capability | required read authority |
|---|---|---|---|
| applicabilityList | GET `/requirement-applicabilities` | compliance / ISO_COMPLIANCE | dedicated applicability read permission |
| applicabilityGet | GET `/requirement-applicabilities/{id}` | compliance / ISO_COMPLIANCE | dedicated applicability read permission |
| requirementAssessmentList | GET `/requirement-assessments` | compliance / ISO_COMPLIANCE | dedicated requirement-assessment read permission |
| requirementAssessmentGet | GET `/requirement-assessments/{id}` | compliance / ISO_COMPLIANCE | dedicated requirement-assessment read permission |
| soaList | GET `/statements-of-applicability` | compliance / ISO_COMPLIANCE | dedicated SoA read permission |
| soaGet | GET `/statements-of-applicability/{id}` | compliance / ISO_COMPLIANCE | dedicated SoA read permission |
| controlList | GET `/controls` | controls / CONTROLS_ASSURANCE | dedicated control read permission |
| controlGet | GET `/controls/{id}` | controls / CONTROLS_ASSURANCE | dedicated control read permission |
| controlAssessmentList | GET `/control-assessments` | controls / CONTROLS_ASSURANCE | dedicated control-assessment read permission |
| controlAssessmentGet | GET `/control-assessments/{id}` | controls / CONTROLS_ASSURANCE | dedicated control-assessment read permission |
| assuranceTestList | GET `/assurance-tests` | controls / CONTROLS_ASSURANCE | dedicated assurance-test read permission |
| assuranceTestGet | GET `/assurance-tests/{id}` | controls / CONTROLS_ASSURANCE | dedicated assurance-test read permission |
| evidenceRequestList | GET `/evidence-requests` | evidence / EVIDENCE_DOCUMENTS | dedicated evidence-request read permission |
| evidenceRequestGet | GET `/evidence-requests/{id}` | evidence / EVIDENCE_DOCUMENTS | dedicated evidence-request read permission |
| evidenceList | GET `/evidence` | evidence / EVIDENCE_DOCUMENTS | dedicated evidence read permission |
| evidenceGet | GET `/evidence/{id}` | evidence / EVIDENCE_DOCUMENTS | dedicated evidence read permission |
| evidenceVersionGet | GET `/evidence-versions/{id}` | evidence / EVIDENCE_DOCUMENTS | dedicated evidence read permission |
| issueList | GET `/issues` | remediation / ISSUES_ACTIONS | dedicated issue read permission |
| issueGet | GET `/issues/{id}` | remediation / ISSUES_ACTIONS | dedicated issue read permission |
| actionList | GET `/actions` | remediation / ISSUES_ACTIONS | dedicated action read permission |
| actionGet | GET `/actions/{id}` | remediation / ISSUES_ACTIONS | dedicated action read permission |

## Detail projections

A detail response may include authorized child/relationship projections needed to render the aggregate without inventing separate endpoints, including where already canonical:

- SoA items within SoA detail;
- ControlVersion/objective/scope references within Control detail;
- Assurance samples and authorized result details within AssuranceTest detail;
- Evidence links/reviews/version metadata within Evidence/EvidenceVersion detail;
- typed IssueOrigin within Issue detail;
- ActionEvidenceLink and ActionVerification within Action detail.

These are projections of existing canonical relationships, not new aggregate identities. They must respect field-level authorization, tenant boundary and existing lifecycle/temporal semantics.

## Dashboard decision

Phase 5 does **not** create a generic reporting platform or F9 reporting engine.

The F5 dashboard may compose its cards and drill-down from the approved Phase 5 read operations. If performance later demonstrates a material need for a dedicated aggregate dashboard projection, that is a separate executable-contract decision; the frontend must not invent or calculate authoritative compliance values from incomplete local data.

## Read-permission decision

Least privilege must be preserved. Write permissions must not be reused as read authority merely to avoid publishing read permissions.

The executable permission catalog must therefore publish dedicated read permissions corresponding to the resources above, using the existing capability, tenant boundary, scope and base-role semantics of each domain. Viewer/report/executive roles remain read-only and receive only reads appropriate to their existing entitlements and scope. Domain managers/owners receive reads needed for their authorized objects. Default DENY remains mandatory.

The contract update must not grant a role broader tenant visibility than already allowed by the rector RBAC model.

## Query semantics

List operations may expose only contractually typed filters over existing fields/relationships required by F5 UX, such as lifecycle state, owner/assignee, requirement/control reference, subject/scope, due/expiry dates and cursor pagination. Search/sort must not introduce alternate semantics or denormalized persistence authority.

## Error/idempotency/audit semantics

- Read operations use the existing `COMMON` error model.
- Reads are naturally idempotent (`NAT`).
- No idempotency key is required for reads.
- Reads do not emit domain events.
- Sensitive/protected reads may emit access-audit evidence where required by the existing security/audit policy.
- Cross-tenant lookup must resolve as the existing authorization/not-found policy requires; no information leakage.

## Contract files authorized to change

- `docs/executable-contracts/03_API_RESOURCE_OPERATION_MATRIX.md`
- `docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml`
- `docs/executable-contracts/05_PERMISSION_CATALOG.md` for the corresponding read permissions
- tests/contract fixtures required to prove consistency

No physical-model change is authorized.

## Acceptance

```text
PHASE_5_API_READ_CONTRACT=APPROVED
DATABASE_CONTRACT_CHANGED=0
EXECUTABLE_CONTRACTS_CHANGE=AUTHORIZED_BY_HUMAN_DECISION
HUMAN_GATE_REQUIRED_FOR_THIS_DECISION=SATISFIED
```
