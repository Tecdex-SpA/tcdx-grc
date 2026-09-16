# PRE-F4 Audit physical-model amendment

| Campo | Valor |
|---|---|
| Base physical model | approved commit `a822bb92d0d585edd84adc8a1c65ec280923cc8e` |
| Current materialized schema | 214 tables |
| Active rector | `TCDX_GRC_MASTER_REGENT_BASELINE_v1.5_2026-09-16` |
| Contract owner | Data Model Owner |
| Human approvers | Data Model Owner, Architecture Owner, Security & Privacy Reviewer |
| Status | `APPROVED_AND_MATERIALIZED` |

This directory is the approved physical-model amendment. The frozen Phase 1 files remain unchanged; materialization is additive through migration `20260916001000_pre_f4_integrated_audit_model.sql` and the v1.5 expected schema.

```text
PROPOSED_ADDITIONAL_TABLES=15
PROPOSED_ALTERED_TABLES=1
PROPOSED_FINAL_TABLE_COUNT=229
MIGRATION_CREATED=1
LOCAL_RUNTIME_VALIDATION=REQUIRED
```

The single altered table is `audit.audits`: final authority removes `scope_text` and `lead_membership_id` after governed data reconciliation into typed scope and team tables. There is no compatibility shadow.
