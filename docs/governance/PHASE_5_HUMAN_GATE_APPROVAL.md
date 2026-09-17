# TCDX GRC — Phase 5 Human Gate Approval

## Decision record

- Decision ID: `DR-PHASE5-2026-09-17-001`
- Date: `2026-09-17`
- Status: `APPROVED`
- Gate unlocked: `PHASE_5=AUTHORIZED`
- Scope: Phase 5 Core GRC Slice only.
- Phase 6: explicitly not authorized.

## Human approver

The following project roles are formally exercised for this decision by the same human authority. Role accumulation is explicitly recorded; it does not waive runtime segregation-of-duties rules implemented in the product.

| Project role | Approver |
|---|---|
| Product Owner/CPO | Andrés Barouh |
| Architecture Owner | Andrés Barouh |
| Backend Owner | Andrés Barouh |
| Security & Privacy Reviewer | Andrés Barouh |
| QA/Release Owner | Andrés Barouh |

## Problem

Phase 5 was correctly blocked before implementation because the approved executable contracts did not expose the read operations/projections required to implement and verify the Core GRC UI/API slice, the human Phase 5 gate had not been recorded, and the Phase 5 release-dependency manifest had not been approved.

## Approved scope

Phase 5 is authorized exclusively for the rector-defined Core GRC slice:

`Applicability → RequirementAssessment → Statement of Applicability → Controls → ControlAssessment/Assurance → Evidence → Issue/Gap → Action → Verification`

The implementation must preserve the existing canonical entities, physical PostgreSQL contract, lifecycle definitions, tenant isolation, RBAC, audit, outbox, idempotency and traceability requirements.

`DATABASE_CONTRACT_CHANGED=0` remains the expected outcome. Any demonstrated need to change the physical contract requires a new human gate.

## Executable-contract amendment approval

The human authority approves the Phase 5 read-contract decision recorded in `docs/governance/PHASE_5_API_READ_CONTRACT_DECISION.md` and authorizes the corresponding controlled amendments to:

- `docs/executable-contracts/03_API_RESOURCE_OPERATION_MATRIX.md`;
- `docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml`;
- the permission catalog only where a dedicated read permission is required to preserve least privilege and read-only role semantics.

This approval does not authorize convenience endpoints, generic status mutation, parallel domain models or changes to persistence for frontend convenience.

## Release-dependency approval

The human authority approves `docs/governance/PHASE_5_RELEASE_DEPENDENCY_MANIFEST.md`.

Phase 5 generic engineering/runtime validation does not require a commercially publishable ISO pack. Governed non-normative fixtures may be used for development/E2E validation. Blocked regulatory packs remain independently blocked and cannot be represented as official/commercial content.

## Visual authority

All Phase 5 UI work must obey the active `TCDX_GRC_VISUAL_BASELINE_v1.0` under `docs/ui/`.

GlobalISO, ISOTools and comparable ISO/GRC market products may be used only as non-authoritative UX/functional benchmarks for navigation, information density, workflows, matrices, drill-down and commercial usability. They are not sources of product scope, domain semantics, data architecture, branding, copyrighted UI assets or implementation authority.

TCDX GRC must retain its approved Tecdex identity and visual contract.

## Conditions

- `CODEX_VARIATION_BUDGET=ZERO`.
- No Phase 6 work.
- No fabricated ISO normative text.
- No license bypass.
- No hardcoded tenant/client/date behavior.
- No legacy compatibility or deliberate debt.
- Backend remains authoritative for authorization and business rules.
- Product-level SoD remains enforced even though one human currently occupies several project governance roles.
- `HUMAN_UI_REVIEW=PASS` can only be assigned by the human project authority after visual review.
- Deploy/runtime/release gates remain evidence-based and are not implicitly approved by this authorization.

## Approved gate state

```text
PHASE_5=AUTHORIZED
PHASE_5_API_READ_CONTRACT=APPROVED
PHASE_5_RELEASE_DEPENDENCIES=APPROVED
PHASE_5_STARTED=0
PHASE_6_STARTED=0
```
