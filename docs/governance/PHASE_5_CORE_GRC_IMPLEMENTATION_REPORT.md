# TCDX GRC — Phase 5 Core GRC local implementation report

| Field | Value |
|---|---|
| Master regent | `TCDX_GRC_MASTER_REGENT_BASELINE_v1.5_2026-09-16` |
| Branch | `implementation/phase-5-core-grc-slice-final` |
| Base HEAD | `16c972ecc4dedbffeabe5ce47f706c5d0f46942c` |
| Implementation state | `IMPLEMENTED_UNVERIFIED_RUNTIME` |
| Core GRC slice | `BLOCKED_PENDING_RUNTIME` |
| Final local verification | `2026-09-22` |
| Human UI review | `PENDING` |
| Database tables | `229` |
| Database schema changed | `0` |
| Phase 6 started | `0` |

## Authority and boundary

This local candidate consumes the active rector baseline, frozen PostgreSQL model, executable contracts and PRE-F5/PRE-F5B/PRE-F5C decisions. It introduces no Phase 6 capability, no generic CRUD/status endpoint, no alternate persistence model and no tenant-, ID- or date-specific behavior. Migration `20260921000200` contains only the authorized Phase 5 Permission/RolePermission runtime materialization; it creates or changes no table, column, constraint, index or database type and has not been applied to QA.

## Implemented operation inventory

All active routes use `/api/v1`, authenticated tenant context, capability + permission + permission-specific scope checks, object-policy filtering, UUID validation and safe problem responses.

### Reads — 21

- RequirementApplicability list/get.
- RequirementAssessment list/get.
- StatementOfApplicability list/get.
- Control list/get.
- ControlAssessment list/get.
- AssuranceTest list/get.
- EvidenceRequest list/get.
- Evidence list/get and EvidenceVersion get.
- Issue list/get.
- Action list/get.

Collection reads use bounded cursor pagination (`items`, `page.has_more`, `page.next_cursor`), stable `created_at DESC, id DESC` order, filter-bound cursors and no offset. Foreign or out-of-policy identifiers are concealed as not found. Scopes without an authoritative object relation resolve to DENY; `audit_engagement` is never reinterpreted as assignment.

### Mutations — 35

- Applicability: create, submit, approve.
- RequirementAssessment: create, start, submit, approve.
- SoA: create, publish.
- Control: instantiate.
- ControlAssessment: create, start, review, approve.
- AssuranceTest: create, start, execute, review, approve.
- EvidenceRequest: create.
- Evidence/EvidenceVersion: create, submit, start review, approve, reject.
- Issue: create, triage, start remediation, request verification, verify close.
- Action: create, start, submit for review, complete, verify.

Every active mutation has a closed request body, exact required fields, `Idempotency-Key`, tenant/actor/operation binding, a single required AuditEvent, an OutboxEvent only where the catalog requires one, and HTTP `202 OperationResult`. Mutable transitions use explicit `expected_version` and PostgreSQL `row_version` compare-and-swap. Evidence creation atomically creates the Evidence root, first draft EvidenceVersion and exactly typed EvidenceLinks; Action completion requires an eligible EvidenceVersion; verification rejects the assigned/completing actor before the CAS write.

## Operations deliberately not materialized

| Operation | Gate | Governing reason |
|---|---|---|
| `uploadIntentCreate` | BLOCKED | The runtime uses `UnavailableFileStoragePort`; no real governed object storage exists. Frozen `evidence.file_objects` also requires detected MIME, SHA-256, encryption ref and storage version before the upload-intent contract possesses them. Sentinel/fake values or a shadow model are forbidden. |
| `uploadFinalize` | BLOCKED | Depends on the missing durable upload-intent representation and real object-store verification; external effects cannot be simulated as authoritative. |
| `evidenceRequestFulfill` | BLOCKED | OpenAPI/matrix require `audit.evidence.request.fulfill.v1`; the published lifecycle seed requires `audit.lifecycle.evidence_request.fulfill.v1`. PRE-F5C single-write audit equality forbids choosing either code or emitting both. |
| `controlAssessmentSubmit` | BLOCKED | The operation permits only `assigned_object`, while frozen ControlAssessment has no assignee field or approved canonical assignment relation. Treating creator or Control owner as assignee would be an inferred product decision. |

These operations have no public backend route and no executable frontend action in this candidate. Their absence is explicit fail-closed behavior, not compatibility debt.

## Backend and persistence traceability

| Layer | Evidence |
|---|---|
| Persistence | Existing 229-table physical model only; data-only permission migration; tenant predicates on all tenant-owned queries; typed FK-compatible inserts. |
| Domain/service | 35 operation definitions; exact lifecycle commands; SoD; Evidence and Action invariants; no direct generic state mutation. |
| API | 21 reads and 35 POST routes reconciled mechanically with OpenAPI paths, methods, closed schemas, required fields, permissions, capabilities, scopes, status and event extensions. |
| RBAC | Grants are resolved from PostgreSQL roles/permissions and active membership assignments; capabilities from active subscription entitlements; permission-specific scopes prevent cross-permission widening. |
| Audit/outbox/idempotency | Command, mutation, one audit, required outbox and idempotency completion share the route transaction; replay does not re-execute or re-emit; changed fingerprint returns 409. |
| Concurrency | Explicit `row_version` CAS; no `xmin`; lost update returns contractual 409. |

## Frontend and visual evidence

The React surface provides a read-composed dashboard and the authorized Compliance, Controls, Evidence, Issue and Action workspaces. Navigation, tabs, creation and lifecycle actions are permission/capability/scope gated, while the backend remains authoritative. Dashboard values are explicitly visible-record counts/distributions, never synthetic official metrics. Lists support lifecycle filtering and cursor continuation. OIDC remains fail-closed through `BlockedIdentityVerifier`; no token, signed URL or binary is persisted by the UI.

Playwright produced ten deterministic captures under `artifacts/phase5-ui/`: desktop and responsive dashboard, Applicability, Control detail, Evidence detail and Issue/Action detail. Automated flows passed; manual inspection found no obvious token/layout/brand divergence from visual baseline v1.0. This is not human approval: `HUMAN_UI_REVIEW=PENDING`.

## Local verification evidence

| Check | Result |
|---|---|
| Rector integrity | PASS |
| Rector status test | PASS |
| Phase 5 executability preflight | PASS, 8/8 |
| Contract asset drift | PASS, 12 migrations / 229 tables |
| Migration gates | PASS; checksum, concurrency and unknown-ledger guards |
| Backend typecheck | PASS |
| Frontend typecheck | PASS |
| Core GRC targeted suites | PASS, 28/28 |
| Monorepo lint | PASS |
| Monorepo typecheck | PASS, backend and frontend |
| Full Vitest suite | PASS, 92/92 across 14 files |
| Production build | PASS |
| Playwright E2E | PASS, 10/10 |
| Visual capture/responsive checks | PASS, 10/10 automated captures; human review pending |

The local shell used Node `v26.4.0`, while the approved project engine is Node `22.23.2`; therefore these results are local evidence only and do not close the approved-toolchain or runtime gate. pnpm was the approved `12.4.1`.

## Runtime blockers and next gate

- Approved OIDC verification/runtime is not connected; authentication remains fail-closed.
- Real governed object storage, malware scanning and file lifecycle runtime are unavailable.
- The two executable/physical contradictions above require human-approved contract/model reconciliation; Codex cannot resolve them.
- Migration `20260921000200` is not applied; QA migration ledger remains 11.
- No QA deployment, runtime integration test or human UI review was executed.

`TECHNICAL_DEBT=0`: no workaround, sentinel, bypass, compatibility layer, shadow schema or TODO implementation was introduced. The next gate is human resolution of the two contract conflicts, approved runtime dependencies, execution under Node 22.23.2, separate QA materialization/runtime verification and human UI review.
