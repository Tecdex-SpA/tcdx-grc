# TCDX GRC — Rector Enforcement Contract

## Purpose

This contract converts the rector documentation into an operational development gate. It applies to Codex and to any contributor working in this repository.

## Current governed state

The authoritative rector baseline is `TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16`; `docs/rector/BASELINE_STATUS=ACTIVE`. Its exact approved 51-document manifest SHA-256 is `4599f6e522ed91952ab01296a4c0b9cbe4df8ad4c1a612afd7fd0414215f824b`, included in the final review manifest `f4db8b38ac4fb18abb0978f9654a83def7b4ee024bafff560a8dbf6e9b7f9247`. The actual human decision, declared PO/Architecture/Data Model/Security/Privacy functions and conditional QA Release authority are recorded in `docs/governance/amendments/STEP_6A3_INITIAL_SOURCE_20261015/COMPETENT_AUTHORITY_FINAL_APPROVAL_20261015.json`. Rector49 permits the declared editorial accumulation; it does not replace operational SoD, legal source or actual QA acceptance.

The earlier A01–A13 approval and four/six artifact approvals remain valid for their exact bytes. v1.10 manifest `b9b6bf6930931af5eb32ca1b4027212ad3a82f247fef677b919af24d30ac9060` is preserved under history, alongside prior baselines. `scripts/verify-v111-governance.py` verifies active/candidate/root publication, actual decision, protected v1.10/v1.9, executable snapshots, R2 and contract27. Publication does not close STEP_6A3 or start STEP_6A4. A runtime registry scope mismatch found during new-flow testing remains a technical promotion blocker; no authority or QA PASS is inferred to bypass it.

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
