# AI integration contract

| Campo | Valor |
|---|---|
| Contract owner | Backend Owner / AI Governance Manager |
| Approving human roles | Architecture Owner, AI Governance Manager, Security & Privacy Reviewer, Backend Owner |
| Status | `CONTRACT_DEFINED` |
| Human authority | Decision Record: Fase 2 continuation authorization, DR-F2-020 |

## Boundary

Only the GRC backend calls `ia2.tcdx.int`. There is no `ia-grc` runtime. The AI service has no direct GRC PostgreSQL access and is never a system of record, permission authority, compliance authority or lifecycle authority.

## Contracted operations

| operation_id | purpose | input boundary | output boundary | human control |
|---|---|---|---|---|
| `aiJobCreate` | authorized explanation, summarization, correlation or recommendation | purpose code; minimized canonical references/context hash; classification; no secret | `AIJob` accepted with provenance/correlation | output remains non-authoritative |
| `aiRecommendationReview` | accept/reject a persisted recommendation | recommendation ID, decision, reason, ETag | review record; an accepted recommendation references a separately authorized domain command | reviewer permission, SoD and audit |

Purpose codes are an allowlist governed as configuration before runtime. Absence of an approved purpose is deny; it does not create a new Phase 2 product capability.

## Authority ceiling

Default ceiling is A2 Propose. AI cannot create official facts, scores, permissions, approvals, evidence decisions, risk acceptance, remediation verification, audit conclusions, compliance declarations or destructive actions. It cannot bypass RBAC or turn missing evidence into a result. Human review applies wherever the rector requires it.

## Context and tenant isolation

Before a request, backend resolves identity, tenant, entitlement, permission, scope, ownership, purpose and content/license access. Only the minimum authorized context is sent. Cross-tenant retrieval/training and uncontrolled prompt enrichment are prohibited. Global licensed content is included only when the relevant pack/license/access contract allows it.

## Provenance, correlation and audit

Each `AIJob` persists tenant where ownership requires it, requester/service principal, purpose, classification, context hash, `ia2.tcdx.int` provider reference, lifecycle/error, correlation/causation and UTC timestamps. `AIProvenanceLink` references one approved typed source per row. Recommendation review is auditable; prompt/output logging is minimized, classified and redacted.

## Security and failure

Credentials use the approved secret mechanism and never enter prompts, responses, logs or audit. Outputs are untrusted content and are never executed as instructions. Provider unavailability returns `TCDX.DEPENDENCY.UNAVAILABLE` or `TCDX.PROVIDER.FAILURE`; deterministic calculations and stored facts remain unchanged. Insufficient authorized evidence returns explicit insufficient-data semantics.

The concrete provider/model behind `ia2.tcdx.int`, model allowlist, DPA/retention/residency terms, timeouts and retry policy are later security/runtime gates. They are not invented and do not block this generic executable contract; runtime remains blocked until those gates pass.

`AI_INTEGRATION_CONTRACT=PASS` as a Phase 2 contract candidate.
