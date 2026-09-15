# AI integration contract

| Campo | Valor |
|---|---|
| Contract owner | Backend Owner / AI Governance Manager |
| Approving human roles | Architecture Owner, AI Governance Manager, Security & Privacy Reviewer, Backend Owner |
| Status | `BLOCKED_BY_OPERATION_AND_PURPOSE_CATALOG` |

## Boundary

The GRC backend calls existing `ia2.tcdx.int`. There is no `ia-grc` runtime and the AI service does not access GRC PostgreSQL directly. Backend authenticates, authorizes, minimizes and classifies context before the call.

## Allowed authority

AI may explain, summarize, correlate and recommend. Default automation ceiling is A2 Propose. It cannot create official facts, scores, permissions, approvals, evidence decisions, risk acceptance, remediation verification, audit conclusions, compliance declarations or destructive actions. A reviewed recommendation is accepted only through a separately authorized/idempotent domain command and published AutomationPolicy when applicable.

## Context and tenant isolation

Context is limited to the requesting actor's authorized tenant, entitlement, permission, scope and purpose. Cross-tenant training/retrieval is prohibited. Global licensed content is supplied only when pack/license/access permits. Prompt/output logging is classified/minimized and never used to bypass retention or rights workflows.

## Provenance

Each AIJob persists tenant, requester, purpose, classification, context hash, provider ref `ia2.tcdx.int`, lifecycle/error and timestamps. Recommendations preserve confidence, human review and accepted command reference. AIProvenanceLink uses exactly one approved typed source per row and compatible tenant/global access.

## Failure and data sufficiency

AI unavailability produces explicit dependency error and does not fail or alter deterministic calculations. Missing authorized evidence is declared insufficient; AI does not reconstruct absent protected content or invent facts. Outputs are untrusted content for injection/safety purposes and are never executed as instructions.

## Security

Credential refs live in the approved secret mechanism; TLS; no secret in prompt/log/audit. Apply output size/time/resource limits only after human approval. Provider retention/training/residency contract, model allowlist, timeout/retry and purpose codes must be approved before runtime.

## Blockers

Exact API operation, purpose-code registry, request/response schema, provider security/data-processing terms, model/version policy and AutomationPolicy mappings are not fixed. `AI_INTEGRATION_CONTRACT` therefore remains blocked for implementation.
