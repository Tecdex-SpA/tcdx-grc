# TCDX GRC — Codex Project Constitution

This repository is governed for 100% of the TCDX GRC product lifecycle by the immutable master baseline `TCDX_GRC_MASTER_REGENT_BASELINE_v1.5_2026-09-16` under `docs/rector/baseline/`, with `46_REGENTE_MAESTRO_DEL_DESARROLLO.md` as the mandatory entry point and `docs/governance/CODEX_RECTOR_ENFORCEMENT.md` as enforcement contract.

## Current gate

`PROJECT_MODE=RECTOR_GOVERNED`
`MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.5_2026-09-16`
`CODEX_VARIATION_BUDGET=ZERO`

Codex MUST NOT treat implementation code, tests, framework conventions, historical documents, mocks or its own reasoning as a source of product authority.

## Permanent visual authority

`VISUAL_BASELINE=ACTIVE`
`VISUAL_BASELINE_ID=TCDX_GRC_VISUAL_BASELINE_v1.0`
`VISUAL_AUTHORITY_PATH=docs/ui`
`BRAND_REFERENCE=Tecdex-SpA/tecdex-design-system`
`BRAND_REFERENCE_MODE=READ_ONLY`

For every task that creates, modifies or reviews user-facing UI, Codex MUST, before changing frontend code:

1. Read `docs/ui/VISUAL_BASELINE_MANIFEST.json`.
2. Read every active visual contract referenced under `docs/ui/`.
3. Use the approved local/versioned Tecdex brand assets under `docs/ui/assets/brand/`.
4. Treat the approved baseline images under `docs/ui/baselines/` as human-approved visual references.
5. Preserve the approved tokens, layout, navigation, component language, density and branding unless a human-approved visual amendment exists.
6. Treat `Tecdex-SpA/tecdex-design-system` strictly as READ ONLY reference material.
7. Never modify domain semantics, database structure, RBAC, lifecycle or canonical contracts to satisfy a visual decision.
8. Execute applicable visual-regression checks for UI changes.
9. Never self-declare `HUMAN_UI_REVIEW=PASS`; only the human project authority may approve that gate.

If the visual authority is missing, internally inconsistent or cannot be reconciled with a higher rector contract, Codex MUST stop the frontend portion and report `VISUAL_CONTRACT_GATE=BLOCKED`.

The visual contract is subordinate to the master rector baseline and canonical product/data contracts. It governs presentation, not business authority.

## Mandatory execution protocol

Before any change, Codex MUST:

1. Read this file.
2. Read `docs/rector/baseline/46_REGENTE_MAESTRO_DEL_DESARROLLO.md`.
3. Read every specialized rector document applicable to the requested slice.
4. Read `docs/governance/CODEX_RECTOR_ENFORCEMENT.md`.
5. Read current gate/status artifacts outside the immutable baseline.
6. Run the rector governance/integrity checks when executable tooling is available.
7. Determine whether the requested work is explicitly authorized by the current gate.

If any requested action conflicts with the active rector baseline or requires a material decision not closed by it, Codex MUST stop that part of the work and report `RECTOR_GATE=BLOCKED`. It MUST NOT solve the conflict by inventing compatibility layers, temporary schemas, shadow models, hardcoded exceptions, legacy structures, TODO debt, fallbacks, alternate semantics or inferred product decisions.

## Permanent architectural authority chain

`master rector baseline -> canonical/logical data model -> approved frozen physical PostgreSQL model -> approved executable contracts -> migrations/foundations -> backend -> frontend -> integrations/AI -> runtime evidence -> commercial release`

A lower layer consumes higher contracts and never silently redefines them. Database structure is not changed for backend/frontend convenience.

## Non-negotiable product rules

- The target is a 100% functional and commercial product, not an MVP or disposable demo.
- Do not broaden product scope beyond approved rector sources.
- Do not introduce deliberate technical or contractual debt.
- Do not create tenant-specific, ID-specific or date-specific behavior unless expressly modeled as governed data/configuration.
- Preserve multi-tenant isolation, RBAC, traceability, auditability, temporal/versioning semantics, evidence lineage and canonical nomenclature.
- Do not introduce legacy compatibility structures unless the rector baseline explicitly requires them.
- Do not infer missing product decisions; block and identify the unresolved contract.
- `Tecdex-SpA/tecdex-design-system` is read-only visual reference and has no functional authority.
- AI is assistance only; `ia2.tcdx.int` is consumed through governed backend integration and cannot become business authority.
- Codex cannot self-approve a human gate.

## Infrastructure authority

- PostgreSQL 16 / `tcdx-grc`: `192.168.2.40`.
- Backend: `192.168.2.45`, `grc-bk.tcdx.int`.
- Frontend: `192.168.2.46`, `grc-www.tcdx.int`.
- AI service: `ia2.tcdx.int`; there is no separate `ia-grc` VM/runtime in the approved initial architecture.

## Completion contract

A capability is not complete until its required slice reaches persistence -> domain -> API -> RBAC -> audit -> UI -> tests -> E2E -> runtime -> traceability with real evidence and all applicable gates passing.

The whole product is not complete until every rector-required item and approved release dependency is satisfied and `MARKET_RELEASE_READY=PASS`.

Every Codex delivery must state:

- `RECTOR_GATE=PASS|BLOCKED`
- active master regent ID;
- current phase/gates;
- files changed;
- tests/checks executed and results;
- unresolved rector conflicts;
- whether database, executable contracts, backend, frontend, infrastructure or deployment contracts changed;
- traceability evidence for the implemented slice.

A task is not complete if mandatory checks fail or implementation diverges from the rector hierarchy.
