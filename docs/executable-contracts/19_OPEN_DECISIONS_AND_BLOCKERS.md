# Open decisions and blockers

| Campo | Valor |
|---|---|
| Contract owner | Architecture Owner |
| Approving human roles | role listed per blocker |
| Status | `BLOCKED` |

No blocker is resolved by this document. Alternatives are compatibility inventories, not recommendations or selections.

| blocker_id | decision absent | affected artifacts | compatible alternatives / objective impact | human owner | blocked gate |
|---|---|---|---|---|---|
| B-001 | package manager + exact version | 01, all implementation | npm/pnpm/yarn or compatible; changes workspaces, lockfile, CI and supply chain | Architecture + Security | EXECUTABLE_CONTRACTS |
| B-002 | repository layout | 01, generation/testing | compatible modular-monolith/workspace layouts; changes boundaries/imports/CI | Architecture | EXECUTABLE_CONTRACTS |
| B-003 | typed SQL library/version | 01,11,12 | compatible typed-SQL alternatives; must not own/generate divergent schema | Data Model + Backend | EXECUTABLE_CONTRACTS |
| B-004 | migration runner, naming, ledger/checksum canonicalization and lock | 01,11 | compatible ordered SQL runners/conventions; changes promotion/recovery/reproducibility | Data Model | EXECUTABLE_CONTRACTS |
| B-005 | backend test framework/version | 01,10 | compatible Node/TS frameworks; changes integration/fault/concurrency harness | Backend + QA/Release | EXECUTABLE_CONTRACTS |
| B-006 | frontend/component test framework/version | 01,10 | compatible React 19 tools; changes accessibility/component evidence | Frontend + QA/Release | EXECUTABLE_CONTRACTS |
| B-007 | E2E framework/version | 01,10 | compatible browser frameworks; changes browser coverage/artifacts/flakiness | QA/Release | EXECUTABLE_CONTRACTS |
| B-008 | exact dependency/runtime patch versions | 01 | compatible set inside rector majors; supply-chain/reproducibility impact | Architecture + Security | EXECUTABLE_CONTRACTS |
| B-009 | OpenAPI/type/client generation convention | 01–03 | schema-first generation/manual verified/unidirectional hybrid; drift/ownership impact | Architecture + Backend + Frontend | EXECUTABLE_CONTRACTS |
| B-010 | UUIDv7 implementation | 01,11 | approved library/internal verified generator; security/order/test impact | Backend + Security | EXECUTABLE_CONTRACTS |
| B-011 | authentication mechanism and IdP/trust profile | 02,13 | OIDC/OAuth bearer, gateway-validated identity and separate machine profiles may be compatible; choice determines trust root, issuer/audience/claims/lifetimes and machine flow | Security + Architecture | OPENAPI/AUTH |
| B-012 | concrete API operation/command catalog | 02,03 | resource and command representations consistent with lifecycles; changes public API and transactions | Product/CPO + Architecture + domain owners | OPENAPI/G7/G8/G11/G14 |
| B-013 | event types/versions/payloads/consumers | 04,15 | event boundaries consistent with domain ownership; changes coupling/retry/ordering | Architecture + Backend + domain owners | EVENT_CATALOG/G11/G14 |
| B-014 | atomic capabilities, permissions, scopes and base-role grants | 05,09,13 | explicit subset of potential actions; changes commercial/RBAC access | Product/CPO + Security + domain owners | PERMISSION_CATALOG/G8/G14 |
| B-015 | stable error codes and HTTP mapping | 02,06 | proposed vocabulary or another approved stable vocabulary with identical rector semantics | Architecture + Backend + Security | ERROR_MODEL/G11 |
| B-016 | exact audit event codes/mappings | 08 | one-to-one command audit catalog; changes accountability/query contracts | Security + domain owners | AUDIT_EVENT_CATALOG/G11 |
| B-017 | published lifecycle transition registry | 03,05,08,09,10 | exact edges already semantically bounded but permission/policies/events/commands unresolved | Architecture + domain owners + Security | G7/G8/G11/G14 |
| B-018 | exact seed rows/versions for permissions, grants, lifecycle, configs and methodology registry | 09 | rows depend on B-014/B-017 and owner approvals | Data Model + corresponding owners | SEED_MANIFESTS |
| B-019 | per-operation idempotency class/fingerprint/replay/retention | 03,07 | classes fixed; assignment depends on B-012 | Backend + Data Model | IDEMPOTENCY_CONTRACT/G11 |
| B-020 | AI purposes, provider security/DPA/model policy/request contract | 17 | compatible governed profiles against `ia2.tcdx.int`; privacy/availability impact | AI Governance + Security + Backend | AI_INTEGRATION/INTELLIGENCE_RUNTIME |
| B-021 | API base wire conventions | 02,03,06,07,13 | tenant/correlation/request/idempotency header names, problem media type, cursor versus offset and generic filter/sort syntax have compatible alternatives with client/cache/security impact | Architecture + Backend + Frontend | OPENAPI/G11/G14 |

## Counts

```text
OPEN_HUMAN_DECISIONS=21
OPEN_BLOCKERS=21
```

The first ten are the implementation/toolchain decisions listed in artifact 01. B-011..021 are executable product/security contract decisions. None may be approved by Codex.

## Non-blocking external gates

Licensed regulatory content and provider-specific connector field contracts remain gated independently. They do not block generic contract representation, but they block affected pack/provider implementation and official use.
