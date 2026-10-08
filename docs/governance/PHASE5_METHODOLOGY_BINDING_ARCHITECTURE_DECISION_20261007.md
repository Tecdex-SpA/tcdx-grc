# Phase 5 methodology binding — approved architecture decision

Status: **APPROVED_BY_HUMAN_PROJECT_AUTHORITY**. Andrés Barouh explicitly answered “Aprobar enmienda y ejecutar hasta cierre” in this execution. This approval authorizes the precise canonical, physical, executable, migration, seed, backend/frontend and QA release amendment below; Phase 6 and git integration remain unauthorized.

Active master: `TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23`.

## Verified defect and necessity

Rector 19 §1 requires compatible, versioned methodologies whose published versions remain immutable. Rector 31 decision 9 separates Compliance, Risk, Control Effectiveness and Data Trust methodologies. Rector 43 requires assessment within the Phase 5 end-to-end gate.

The approved OpenAPI requires UUIDv7 `methodology_version_ref` on RequirementAssessmentCreateRequest and ControlAssessmentCreateRequest. The frozen physical model stores both as required UUID columns, but defines no Compliance or Control Effectiveness methodology registry, target FK or approved external registry. Current QA has 235 physical tables; its only methodology table is `risk.risk_methodologies`. Its 5x5 risk methodology is incompatible with these two domains. ConfigurationDefinition, FormulaDefinition and FrameworkVersion represent different canonical concepts and cannot silently become methodology identity.

The current backend accepts a syntactically valid reference without resolving a methodology. Isolated tests use synthetic references. That verifies workflow mechanics but cannot prove a governed methodology selection in QA. Creating another arbitrary UUID would preserve this defect.

This is a missing canonical/physical binding, not missing prior test evidence. A new physical representation is necessary unless the project authority supplies a different approved, immutable methodology registry and binding. The approved implementation proceeds through one incremental migration; historical migrations remain immutable.

## Approved minimum amendment

Approve two separate canonical versioned objects: **ComplianceMethodology** and **ControlEffectivenessMethodology**, each represented by one row per methodology version, following the existing versioned-object pattern. Keep RiskMethodology unchanged.

Physical additions:

| Table | Identity/version | Typed methodological data | Ownership and lifecycle |
|---|---|---|---|
| `regulatory.compliance_methodologies` | UUIDv7 `compliance_methodology_id`; `methodology_code`; positive `version_number`; unique code/version | Name; authoritative rector source/version; compatible FormulaDefinition reference; `partial_compliance_factor` in 0..1; baseline minimum coverage in 0..100; effective interval | Global versioned definition with platform ownership, publication timestamp, immutable published contents, canonical creation/audit metadata |
| `controls.control_effectiveness_methodologies` | UUIDv7 `control_effectiveness_methodology_id`; `methodology_code`; positive `version_number`; unique code/version | Name; authoritative rector source/version; compatible FormulaDefinition reference; baseline minimum coverage in 0..100; effective interval | Same publication, ownership, immutability and audit rules |

Use explicit FK targets: RequirementAssessment.methodology_version_ref → ComplianceMethodology; ControlAssessment.methodology_version_ref → ControlEffectivenessMethodology. Preserve existing assessment column names and UUID types. Existing assessment rows must be inventoried before adding validated FKs; never silently backfill arbitrary mappings or delete historical rows. QA currently has zero rows in both assessment tables.

Publish only the two initial rector methodologies through the approved migration/seed governance mechanism, using UUIDv7 identities recorded as governed seed data. Their semantics come exclusively from rector 17/19/38/39: partial compliance factor 0.50, control overall effectiveness min(design, operating), coverage and no-data behavior preserved. Formula references must resolve to the matching approved version; any additional formula seed required is governed data, not a new algorithm or entity. Do not store critical domain parameters only in JSONB.

Phase 5 needs authenticated tenant catalog selection, not a new methodology authoring UI or generic administration proxy. Add two read operations and their narrowly scoped permissions:

- `compliance.methodology.read`, tenant-scoped, granted only to existing roles already authorized to perform the related Compliance assessment.
- `controls.methodology.read`, tenant-scoped, granted only to existing roles already authorized to perform the related Control assessment.

Tenant endpoints return only published, effective methodologies compatible with the requested assessment domain and canonical access rules. The frontend selects a returned version; it never accepts a fabricated default. Backend creation validates existence, domain, publication, effective interval and permitted configuration before persistence. Unknown, wrong-domain, unpublished and expired references fail closed. Later publication remains an explicit governed seed/catalog release; no unapproved editing API is introduced by this amendment.

Add audit events for governed methodology publication and retain method reference/version in assessment audit/lineage. Preserve immutable historical references after expiry; expiry prevents new selection, not historical reads. No global method edit derives from tenant authority. No Platform authority creates Membership or tenant grants.

Expected approved impact: **one incremental migration**, **235 → 237 physical tables**, **29 → 30 migrations**, **170 → 172 published permissions**. Preserve historical migration hashes, IAM configuration, all identities, role families and business records. No Risk, Incident or Loss functionality is introduced.

## Execution following approval

1. Record the human decision and reconcile canonical/logical, physical, executable, permission, seed, audit and traceability contracts as an explicit approved amendment outside the immutable baseline; never edit its manifested files silently.
2. Implement the two catalogs, validated assessment references and frontend selection within Phase 5. Add meaningful negative contract/PostgreSQL tests for invalid references and domain separation; execute complete applicable regression.
3. Use the approved migration runner after read-only inventory and backup/rollback readiness; no direct SQL functional testing or arbitrary backfill.
4. Freeze two identical independent exports, build only changed backend/frontend components for linux/amd64, deploy the same freeze and verify QA health/schema/logs/parity.
5. Execute the previously blocked RequirementAssessment and ControlAssessment lifecycle chains with published canonical versions, legitimate distinct QA actors and minimum authorized temporary roles. Revoke those temporary roles afterward; retain the authorized Membership.
6. Reconcile all final gates and close Phase 5 only if they pass. Keep Phase 6 unstarted; no git staging, commit, push, PR or merge.

## Recorded human decision

Human decision: **Aprobar enmienda y ejecutar hasta cierre**. The project authority approved the exact 30 migrations / 237 tables / 172 permissions impact described above. `RECTOR_GATE=PASS` applies to this amendment after integrity validation. No unresolved representation decision remains.
