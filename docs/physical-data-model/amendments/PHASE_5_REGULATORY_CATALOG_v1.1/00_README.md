# Phase 5 regulatory Catalog v1.1 physical amendment

Status: human-authorized local implementation candidate under `TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23`.

This forward-only amendment records three explicit human decisions without rewriting the immutable rector baseline or historical migrations:

1. `Requirement.editorial_summary` stores TCDX-authored editorial content, separate from licensed normative text, licensed references, applicability guidance, and evidence expectations. At least one of the three content representations must be nonblank. The editorial representation never grants license, normative authority, publication approval, or a compliance conclusion.
2. Typed crosswalk mappings preserve their own direction, provenance, effective interval, and semantic mapping version. For Catalog v1.1 the importer explicitly supplies version 1; mapping dates inherit the source FrameworkCrosswalk dates only when absent in the mapping. `FrameworkCrosswalk.effective_from=2026-09-28T00:00:00Z` is the governed editorial crosswalk version date from `manifest.generated_on`, not a normative effective date. Header `directed` means `source_to_target`. Confidence normalization is exactly `medium=0.750000`, `high=0.900000`; other labels fail closed.
3. `NormativeUnit` identity is `framework_version_id + source_locator`. The historical global `UNIQUE(source_locator)` is replaced with the rector-defined composite uniqueness. Identical locators in different FrameworkVersions are distinct units.
4. `RequirementControlMapping.mapping_version` and `NormativeUnitControlMapping.mapping_version` are semantic versions of individual typed relationships. Catalog v1.1 supplies version 1 explicitly to every new relationship; no persistent default or global sequence is used. Requirement mapping identity is `(requirement_id, control_version_id, mapping_type, mapping_version)` and editorial NormativeUnit mapping identity is `(normative_unit_id, control_version_id, mapping_version)`. Ownership/tenant coherence remains enforced independently.

The authoritative DDL candidate is `database/migrations/20260928000400_phase5_regulatory_catalog_contract_alignment.sql`. It adds no tables, permissions, tenants, or business data. Catalog v1.1 remains byte-identical. Any pre-existing Control or crosswalk mapping or invalid Requirement causes migration failure; no historical value is fabricated.

The source `Requirement.content_hash` is preserved as supplied. All 118 catalog hashes have the required lowercase SHA-256 shape; none equals the SHA-256 of `summary_tcdx` alone. The source package does not declare a byte-level preimage formula, so the importer must neither reinterpret nor recalculate it.

## ISO/IEC 42001:2023 date precision resolution

The Catalog v1.1 source value `2023-12` is retained in the immutable source. The human-verified official [ISO lifecycle record](https://www.iso.org/standard/42001) records stage 60.60, “International Standard published,” on **2023-12-18**. For `ISO_IEC_42001_2023` and source `effective_from=2023-12` only, the importer persists `2023-12-18T00:00:00Z` for its FrameworkVersion and the 55 NormativeUnits, 7 Requirements and 38 ControlVersions tied to that edition. This is canonical date-to-timestamptz boundary normalization; `00:00:00Z` is not an asserted publication time. The original textual `publication_date=2023-12` remains in the source package. Other partial dates fail closed. This precision enrichment does not change normative text, licensing, ownership, business identity or editorial content.
