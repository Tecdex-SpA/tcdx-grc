# TCDX GRC — PRE-F5B executable-contract closure decision

## Decision record

- Decision ID: `DR-PRE-F5B-2026-09-21-004`
- Date: `2026-09-21`
- Status: `APPROVED`
- Owner/approver: Andrés Barouh acting as Product Owner/CPO, Architecture Owner, Backend Owner, Security & Privacy Reviewer and QA/Release Owner.
- Gate unlocked: contractual closure only; Phase 5 implementation remains not started.

This record materializes the human decision supplied in the PRE-F5B task packet. It does not represent Codex self-approval and does not approve runtime, deployment, Phase 6 or a physical-model change.

## Approved closure

The decision authorizes only these contract amendments over the already approved Core GRC slice:

1. The ten approved Phase 5 collection GETs use opaque cursor pagination with `page[size]` integer 1..100/default 25, COMMON HTTP 400 for invalid input, no offset and stable order `created_at DESC, <entity_primary_id> DESC`. Cursor contents never grant tenant, scope, entitlement or object access.
2. The 30 Core GRC mutation operations use operation-specific closed request schemas. None uses `DomainCommandRequest`; fields and validations come only from the active rector baseline and frozen physical/executable contracts.
3. `actionSubmitForReview` exposes the already published `action.submit_review` edge from `in_progress` to `in_review`, reusing `remediation.action.transition`. It does not complete or verify the Action and emits no domain event.
4. `evidenceCreate` materializes a distinct Evidence aggregate, its first draft EvidenceVersion and requested valid EvidenceLinks from one finalized, usable, scan-PASS FileObject in one transaction. FileObject remains distinct; no binary or signed URL is duplicated or persisted as Evidence authority.
5. EvidenceLink input permits exactly Requirement, Control, ControlVersion, RequirementAssessment, ControlAssessment or AssuranceTest. A generic target pair is prohibited; existence, type, visibility and tenant compatibility are validated before persistence.
6. The contract-only permission `evidence.evidence.create` is authorized for Evidence Owner using existing `EVIDENCE_DOCUMENTS` capability and governed scopes. This task creates no Permission/RolePermission runtime seed.

## Cross-contract mapping

| Operation | Permission | Audit | Domain event | Idempotency | Transaction |
|---|---|---|---|---|---|
| `actionSubmitForReview` | `remediation.action.transition` | `audit.remediation.action.submit_review.v1` | `NONE` | `IDEMPOTENCY_KEY_REQUIRED` | `TX` |
| `evidenceCreate` | `evidence.evidence.create` | `audit.evidence.evidence.create.v1` | `evidence.evidence.created.v1` | `IDEMPOTENCY_KEY_REQUIRED` | `TX` |

The Evidence-created event has `NONE_CONTRACTUALLY_REQUIRED` consumers. No consumer, grant, seed, worker or runtime behavior is invented by this decision.

## Boundary and gate state

```text
MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.5_2026-09-16
CODEX_VARIATION_BUDGET=ZERO
PHASE_5=AUTHORIZED
PHASE_5_EXECUTABLE_CONTRACTS=CLOSED
PHASE_5_STARTED=0
PHASE_6_STARTED=0
DATABASE_TABLES=229
DATABASE_SCHEMA_CHANGED=0
BACKEND_IMPLEMENTED=0
FRONTEND_IMPLEMENTED=0
RUNTIME_PERMISSION_SEEDS_CHANGED=0
DEPLOYMENT_PERFORMED=0
```

Any implementation-layer need that contradicts this record or the higher rector/physical authority requires a separate human decision. This record does not declare `CORE_GRC_SLICE=PASS`, runtime PASS or market-release readiness.
