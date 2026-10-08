# Human decision — component-scoped releases and D3 frontend publication

| Field | Approved value |
| --- | --- |
| Decision ID | DR-2026-10-07-COMPONENT-SCOPED-RELEASE |
| Status | APPROVED_HUMAN_DECISION |
| Date | 2026-10-07 |
| Owner / approver | Andrés Barouh, Architecture Owner / QA Release Owner |
| Authority | TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23; rector 43 §5 and 45 §3–5 |
| Approval source | Explicit human STEP 23L-TENANT-ONBOARDING-D3-RELEASE packet §4–6/11 |
| Gate unlocked | D3 release component-policy gate; technical frontend release/deployment conditional on all required gates |

## Problem and alternatives

D3-RR stopped because prior packet-specific same-freeze and backend-only releases
did not establish the component policy for D3. The human considered rebuilding
backend+frontend from one new freeze versus publishing frontend with the exact
compatible D3-A backend already deployed. This record closes that missing decision;
it does not reinterpret historical freezes or alter immutable rector history.

## Approved component-scoped policy

COMPONENT_SCOPED_RELEASE_POLICY=APPROVED.

When a functional change affects one component only, unchanged required components
need not be rebuilt solely to force a shared freeze, provided that they are already
deployed, identified by exact digest, contractually compatible, and contain no
pending functional change required by the component being published.

Traceability records the new component's freeze/provenance, exact reused component
digests, and demonstrated compatibility. A multi-component release from one freeze
remains mandatory when two or more components change functionally, a new required
cross-component contract is not yet deployed, or a specific applicable contract
expressly requires joint publication. Missing compatibility proof blocks execution.

## D3 application approved by the human

D3_RELEASE_COMPONENT_POLICY=FRONTEND_ONLY_ALLOWED_WITH_EXISTING_BACKEND.

- Reused backend, without rebuild/redeploy:
  sha256:798937c23bb25c99f45431536348c3271a6dfdab553c9f0624c524e644dcc67d.
- Reused IAM, without rebuild/redeploy:
  sha256:4ef4f816c60d05c3867c1fce9092a3b0d1539bf22683d3e2742c6c1d7ce25ea4.
- Existing frontend rollback target:
  sha256:d68e4f32c86a82130c428ade9a43406d5ae8f8bff26d484cf20ebceafe6d352f.

D3-R changed frontend/E2E only. D3-A already implements the required backend
operations and authorization projection. Required release regressions and exact
frontend/backend compatibility must be executed; historical PASS alone is not
sufficient. This avoids unnecessary replacement of unchanged components.

## Consequences and execution boundary

The same human packet authorizes recording this decision, reconciliation, full
regressions, a new definitive two-export freeze, frontend linux/amd64 build and
exact-image E2E, transport/verification, rollback capture, frontend-only QA deploy,
postchecks and evidence without another human deployment approval, conditional on
all prior gates passing. Exact functional runtime configuration remains preserved.
The only OCI provenance comparison exception is org.opencontainers.image.source;
all other labels remain exact/fail-closed. Existing MI8A base/secret packaging rules
remain applicable. No secret build inputs or credential extraction.

No backend/IAM build or deployment, migration29, functional QA tenant/user/identity/
Membership/role/subscription mutation, ACME repair, andres.grc activation, R3,
commit/push/merge or Phase6 is authorized. Human UI review stays PENDING_HUMAN and
is never self-approved. G6/G7/G8 remain deferred. Authorized technical rollback is
frontend only, retaining sanitized candidate logs before recovery/removal.

## Affected contracts and traceability

Rector43/45/46 → this explicit human Decision Record → MI8A packaging and existing
OCI metadata decision → D3-R executable22/23/24/25 consumers → exact D3-A deployed
backend and unchanged IAM → new frontend freeze/image/tests/transport → authorized
frontend deployment/postchecks → pending human UI review. This record governs
release component selection; it changes no product, executable API/RBAC/data,
physical schema, infrastructure topology or immutable baseline contract.
