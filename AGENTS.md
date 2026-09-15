# TCDX GRC — Codex Project Constitution

This repository is governed by the approved TCDX GRC rector baseline and by the enforcement contract in `docs/governance/CODEX_RECTOR_ENFORCEMENT.md`.

## Current gate

`PROJECT_MODE=BOOTSTRAP_GOVERNED`

The rector baseline is still under review and is not yet active in this repository.

Until `docs/rector/BASELINE_STATUS` contains `ACTIVE`, Codex MUST NOT create or modify functional implementation artifacts, including database schemas or migrations, backend application code, frontend application code, executable API contracts, rules-engine implementations, AI integrations, or deployment artifacts for functional services.

## Mandatory execution protocol

Before any change, Codex MUST:

1. Read this file.
2. Read `docs/governance/CODEX_RECTOR_ENFORCEMENT.md`.
3. Read `docs/rector/BASELINE_STATUS`.
4. Run `./scripts/verify-rector-governance.sh` when executable tooling is available.
5. Determine whether the requested work is authorized by the current gate.

If any requested action conflicts with the current gate or the active rector baseline, Codex MUST stop that part of the work and report `RECTOR_GATE=BLOCKED` with the conflicting rule. It MUST NOT solve the conflict by inventing compatibility layers, temporary schemas, shadow models, hardcoded exceptions, legacy structures, TODO debt, or alternate semantics.

## Permanent architectural direction

Once the rector baseline is active, the authority chain is:

`rector baseline -> canonical/logical data model -> frozen physical PostgreSQL model -> backend -> frontend`

Later layers consume earlier contracts; they do not redefine them.

## Non-negotiable development rules

- Do not broaden product scope beyond the approved rector sources.
- Do not introduce deliberate technical debt.
- Do not create tenant-specific, ID-specific or date-specific behavior unless expressly defined by the rector contract as data/configuration.
- Preserve multi-tenant isolation, RBAC, traceability, auditability, temporal/versioning semantics, evidence lineage and canonical nomenclature when the active baseline requires them.
- Do not introduce legacy compatibility structures unless the rector baseline explicitly requires them.
- Do not silently change database contracts to accommodate backend or frontend convenience.
- Do not infer missing product decisions. Block and identify the unresolved contract instead.
- `Tecdex-SpA/tecdex-design-system` is read-only reference material.

## Completion contract

Every Codex delivery must state:

- `RECTOR_GATE=PASS|BLOCKED`
- `BASELINE_STATUS=PENDING|ACTIVE`
- files changed;
- tests/checks executed and results;
- any unresolved rector conflict;
- whether database, backend, frontend or deployment contracts were changed.

A task is not complete if mandatory checks fail or if the implementation violates the rector hierarchy.
