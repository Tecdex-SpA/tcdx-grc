# Human-approved physical amendment: Phase 5 methodologies

The explicit approved [architecture decision](../governance/PHASE5_METHODOLOGY_BINDING_ARCHITECTURE_DECISION_20261007.md) extends the frozen physical model. The immutable rector baseline and 29 prior migrations remain unchanged.

Definitive DDL: database/migrations/20261007000200_phase5_methodology_binding.sql. Inventory: scripts/foundations/phase5-methodology-amendment.mjs, consumed into database/expected-schema.json.

The two versioned objects use UUIDv7 primary keys, nullable tenant columns constrained to NULL with PLATFORM_CONTROL ownership, canonical actor FKs, compatible FormulaDefinition FKs, code/version uniqueness, publication and interval checks, numeric bounds and selection indexes. RequirementAssessment.methodology_version_ref references regulatory.compliance_methodologies; ControlAssessment.methodology_version_ref references controls.control_effectiveness_methodologies. FKs use default restrictive deletion, no cascades. Published semantic contents are immutable. Historical references survive expiry. No fake backfill: nonempty existing assessments reject this migration and require explicit mapping review.

Publication occurs through governed seed releases. Tenant roles receive reads only; no global editing endpoint is added. No schema simplification or Phase 6 capability is authorized.
