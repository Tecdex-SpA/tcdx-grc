# PRE-F4 Audit physical-model amendment

| Campo | Valor |
|---|---|
| Base physical model | approved commit `a822bb92d0d585edd84adc8a1c65ec280923cc8e` |
| Current materialized schema | 214 tables |
| Candidate rector | `TCDX_GRC_MASTER_REGENT_BASELINE_v1.5_2026-09-16` |
| Contract owner | Data Model Owner |
| Human approvers | Data Model Owner, Architecture Owner, Security & Privacy Reviewer |
| Status | `PENDING_HUMAN_APPROVAL` |

This directory is a design amendment only. It does not modify `docs/physical-data-model/`, `database/expected-schema.json`, migrations, PostgreSQL or QA.

```text
PROPOSED_ADDITIONAL_TABLES=15
PROPOSED_ALTERED_TABLES=1
PROPOSED_FINAL_TABLE_COUNT=229
DDL_EXECUTED=0
DATABASE_MUTATED=0
```

The single altered table is `audit.audits`: final authority removes `scope_text` and `lead_membership_id` after governed data reconciliation into typed scope and team tables. There is no compatibility shadow.
