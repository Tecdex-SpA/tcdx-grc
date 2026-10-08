# RetentionPolicy physical reconciliation

| item | approved result |
|---|---|
| entity/table | existing `RetentionPolicy` / `privacy.retention_policies` |
| lifecycle column | existing `lifecycle_state varchar(32) NOT NULL` |
| effective interval | `effective_from timestamptz NULL`; `effective_to timestamptz NULL` |
| concurrency | `row_version bigint NOT NULL DEFAULT 1`, positive and monotonic |
| physical tables | remains 231 |
| lifecycle | `draft -> under_review -> approved -> published` |
| create state | draft; both effective timestamps NULL; row_version 1 |
| publication | database transaction timestamp sets effective_from; effective_to remains NULL |
| policy kinds / precedence | legal_hold=500; mandatory_regulatory_policy=400; contractual_policy=300; tenant_policy=200; product_baseline=100 |
| trigger | `expiry_or_closure`; caller never supplies retention start date |
| disposition | `purge_if_no_legal_hold`, contractual/runtime only; no column added |
| SoD | author UserIdentity differs from approving Legal Reviewer UserIdentity |

The operational value `220752000` seconds is the authorized physical baseline for `TECDEX-EVIDENCE-APPROVED-7Y`; it is not a universal legal equivalence between seconds and seven calendar years. Expiration or closure is resolved from canonical protected-object relations/state, never from an arbitrary caller date.

Constraints reject unknown policy kinds, mismatched numeric precedence, an unknown trigger, lifecycle state outside the four approved values, nonpositive row versions and published rows without effective_from (or prepublication rows with one).
