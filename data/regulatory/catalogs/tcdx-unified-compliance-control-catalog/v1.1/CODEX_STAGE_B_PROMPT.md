# CODEX TASK — TCDX GRC Catalog v1.1 canonical importer/materializer

Use the active rector/baseline in the repository as highest authority. The input package is `TCDX_Unified_Compliance_Control_Catalog_v1.1_CANONICAL_IMPORT_READY`.

## Non-negotiable boundaries
- Do not redesign schema, add shadow tables, JSONB escape hatches, legacy compatibility or hardcoded IDs.
- Do not change historical migrations.
- Do not import `quarantined_relations.*`.
- Do not treat provisional ISO content as licensed/official.
- Do not recreate Annex A reference controls as Requirements.
- Do not start Phase 6.
- Preserve multi-tenant isolation, RBAC, audit, outbox, provenance, immutable published history and default DENY.

## Required implementation
1. Verify every file and business key against the active physical schema and executable contracts. If a required canonical entity is absent from the active schema, STOP and report the exact rector conflict; do not invent storage.
2. Implement a canonical importer/materializer that reads v1.1 files and resolves identity by business key. Generate UUIDv7 only on first materialization. Re-runs must be idempotent.
3. Materialize in the exact order from `materialization_order.json`.
4. Materialize the 131 Annex A entries as GLOBAL_REFERENCE `Control/ControlVersion` with `control_origin=regulatory_reference`, and their 131 `NormativeUnitControlMapping` rows.
5. Materialize the 81 TCDX-authored baseline controls as PLATFORM_CONTROL, tenant_id NULL, `control_origin=tcdx_baseline`. Publication must use the existing governed lifecycle; do not directly bypass publication transitions.
6. Materialize only the 118 canonical Requirements and 333 canonical RequirementControlMappings. Never materialize quarantined mappings.
7. Materialize typed crosswalk headers and typed NormativeUnit/Requirement/Control mappings. Do not introduce a generic polymorphic mapping.
8. Preserve source/provenance/license classification. ISO packs remain not official until licensed content and human review exist. Law rows use official BCN provenance.
9. Add importer validation for duplicate business keys, parent hierarchy, foreign references, ownership, tenant rules, crosswalk framework membership, source provenance and prohibited official/licensed promotion.
10. Add tests for first import, idempotent re-import, modified immutable identity fail-closed, missing parent, missing target, duplicate key, mixed-type crosswalk rejection, licensing guard, tenant isolation and rollback/transactionality.
11. Rebuild PostgreSQL 16 from zero using the repository's canonical migrations, then run schema/seed verification and the importer in an isolated database. Prove counts and re-run idempotency.
12. Do not mutate QA until all local gates pass and a QA backup is created/verified. If QA apply is allowed by the current human authorization, apply through the canonical runner/importer only, then verify DB counts, runtime health, 0 HTTP 5xx and 0 SQL errors.
13. Build runtime images for the QA host architecture (`linux/amd64`), not the local Mac architecture. Verify image architecture and runtime digest before deployment.
14. Update mutable governance status and traceability only after evidence exists. No commit/push/PR/merge/tag unless separately authorized.

## Expected core counts from v1.1
- Regulatory packs: 5
- Frameworks: 5
- NormativeUnits: 260
- Requirements: 118
- Regulatory reference controls: 131
- TCDX baseline controls: 81
- NormativeUnitControlMappings: 131
- RequirementControlMappings: 333
- NormativeUnit crosswalk mappings: 28
- Requirement crosswalk mappings: 188
- Control crosswalk mappings: 278
- Quarantined relations (must stay unmaterialized): 1213

## Completion report
Return exact source files changed, migrations if any, importer commands, tests/results, DB counts, QA changes, image IDs/architectures, HTTP/SQL error counts, remaining human gates, and an exact continuation state. Stop on any rector/physical-contract contradiction rather than broadening scope.
