# TCDX GRC master regent v1.5 — candidate overlay

`BASELINE_ID=TCDX_GRC_MASTER_REGENT_BASELINE_v1.5_2026-09-16`

`BASELINE_STATUS=PENDING_HUMAN_APPROVAL`

## Authority

This directory is a reviewable, content-addressed candidate overlay on active immutable baseline `TCDX_GRC_MASTER_REGENT_BASELINE_v1.4_2026-09-15` at repository commit `a1fe39533418826eb33e76d975385bdeb3f742f0`. It does not modify, supersede or activate itself over `docs/rector/baseline/`.

Human approval must materialize a complete v1.5 baseline, create its authoritative manifest, update the active baseline ID/status/governance verifier and record the approval commit. Until then, every file here is `PENDING_HUMAN_APPROVAL`.

## Closed scope

The candidate changes only the canonical Audit catalog and Phase 7 contract, and adds a specialized integrated-audit/ISO 19011 contract:

- `33_CATALOGO_ENTIDADES_CANONICAS.md`;
- `43_PLAN_MAESTRO_RECTOR_DISENO_Y_DESARROLLO.md`;
- `48_CONTRATO_AUDITORIA_INTEGRADA_ISO_19011.md`.

All other v1.4 semantics are inherited unchanged for review purposes. This overlay adds no commercial capability group, plan, infrastructure component, tenant exception or legacy path.

## Candidate invariants

- integrated Audit covers one to three FrameworkVersion;
- HLS numbering never merges Requirements;
- cross-framework AuditTest grouping requires an approved/effective typed RequirementCrosswalkMapping;
- each Requirement retains its applicability, RequirementAssessment, result_status, domain_conclusion and lineage;
- objectives, criteria, scopes, team, competencies, agenda and test lineage are relational and typed;
- Evidence, Requirement, Control, RequirementAssessment, Issue, Action, TenantMembership and Subject remain under their existing authorities;
- no JSONB semantic shortcut, free `(type,id)`, parallel audit engine or duplicated assessment exists.

## Human gate

`HUMAN_GATE_REQUIRED=AUDIT_MODEL_AMENDMENT_REVIEW`

Required approver roles: Product Owner/CPO, Architecture Owner, Data Model Owner, Security & Privacy Reviewer, Backend Owner and QA/Release Owner. Regulatory Content Owners review crosswalk and framework criteria semantics.
