# TCDX GRC — Rector Enforcement Contract

## Purpose

This contract converts the rector documentation into an operational development gate. It applies to Codex and to any contributor working in this repository.

## Current governed state

The authoritative rector baseline is `TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23` and `docs/rector/BASELINE_STATUS` is `ACTIVE`. The 2026-09-23 human approval authorizes only the v1.7 reconciliation and Phase 5 closure recorded in the mutable execution status; it does not authorize commit, push, PR, merge, production or Phase 6.

Historical baseline v1.6 remains immutable under `docs/rector/history/` and is verified independently from the active v1.7 manifest.

## Activation conditions

The rector baseline may become `ACTIVE` only when all of the following are true:

1. The human-approved rector documents are present under `docs/rector/baseline/`.
2. A manifest of approved files and SHA-256 hashes exists at `docs/rector/RECTOR_MANIFEST.sha256`.
3. `./scripts/verify-rector-governance.sh` validates every manifest entry.
4. The baseline version is recorded in `docs/rector/BASELINE_ID`.
5. Before integration into `main`, the activation change passes the mandatory GitHub CI checks and human review.

Changing `BASELINE_STATUS` alone does not authorize development if the manifest or integrity checks fail.

## Authority order

When active, conflicts are resolved in this order:

1. approved rector baseline and its explicit source-precedence policy;
2. canonical/domain/logical contracts contained in that baseline;
3. frozen physical PostgreSQL model after its formal approval gate;
4. backend contracts and implementation;
5. frontend behavior and presentation;
6. tests and fixtures, which must verify the contracts rather than redefine them.

## Blocking conditions

Work MUST stop with `RECTOR_GATE=BLOCKED` when it would require any of the following without explicit rector authority:

- adding or redefining a canonical entity, state, relationship or semantic;
- adding database structures merely to satisfy a backend/frontend implementation shortcut;
- creating parallel or shadow data models;
- introducing compatibility/legacy structures not required by the rector baseline;
- hardcoded tenant IDs, user IDs, dates, customer exceptions or product-specific bypasses;
- weakening multi-tenant, RBAC, audit, traceability, evidence, temporal or lineage contracts;
- bypassing a pending architectural gate;
- replacing an unresolved rector decision with an implementation assumption;
- reducing a required commercial/product capability to a demo, mock, MVP stub or TODO debt.

## Database freeze principle

The physical PostgreSQL model becomes authoritative only after its formal review gate. Once frozen, backend changes must conform to it. A backend or frontend requirement that appears to demand a schema change is treated as an architectural change request and must be reconciled against the rector baseline before any DDL is modified.

## CI enforcement model

GitHub Actions is the executable enforcement layer. The workflow must fail on:

- missing governance files;
- unauthorized implementation while baseline is pending;
- active baseline without ID/manifest;
- hash mismatch in rector files;
- unauthorized direct changes to frozen database contracts once the physical-model freeze gate exists;
- future contract tests or architecture checks added by approved development phases.

The `main` branch must then be protected by a GitHub Ruleset/branch protection rule that requires the governance check to pass before merge and disallows bypass for normal contributors.

## Required completion report

Every development task must report gate state, baseline state, changed files, validation performed, unresolved conflicts and affected architectural layers.
