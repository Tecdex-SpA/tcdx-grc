# Phase 5 Subscription RegulatoryPackVersion authority

`STATUS=HUMAN_APPROVED_FOR_PHASE5_MATERIALIZATION_2026-09-29`

`MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23`

The 2026-09-29 human decision closes the missing commercial relationship required by rector 42 (pack activation) and rector 22 (global normative content only within enabled packs). `platform.subscription_regulatory_packs` is the sole tenant-specific pack entitlement authority. It is an owned child of `platform.subscriptions`, not a parallel tenant-framework registry. It references the exact `regulatory.regulatory_pack_versions` row; a later edition is never inherited. Capability entitlement, pack entitlement, RBAC, applicability, implementation, and assessment remain distinct.

| Entity | Physical representation | Profile | Business identity and lifecycle |
|---|---|---|---|
| SubscriptionRegulatoryPack | `platform.subscription_regulatory_packs` | `TM / TENANT_OWNED` | UUIDv7 PK; `(subscription_id, regulatory_pack_version_id, effective_from)` is the temporal business key. `active` rows may have a planned `effective_to` expiry; revocation closes the interval and marks `revoked`; reactivation inserts a new row. No `version_number` or parallel commercial authority. |

The table includes `tenant_id` because the approved TM profile requires it, enabling a composite `(tenant_id, subscription_id)` FK to the parent Subscription and tenant-scoped indexes. The value is derived from Subscription by the Platform command, never accepted as independent caller authority. The pack-version FK is global. Creation actor, update actor, `row_version`, timestamps, audit and idempotency follow existing mutable tenant-owned patterns. Database checks and a temporal exclusion constraint prevent invalid or overlapping intervals for the same Subscription and PackVersion. `btree_gist` supports equality of the UUID pair in that constraint.

The human decision authorizes the physical authority and forward-only migration. The 2026-09-24 `platform.subscription.create` decision authorizes only Subscription creation and explicitly forbids widening it by inference. Pack activation/revocation permissions, grants and executable operation definitions require their own explicit human closure before those runtime commands are published. Until then, an empty relation causes global pack content access to fail closed.

Expected physical domain tables after this approved addition: **233**. The prior 232-table baseline is preserved as historical migration state. No existing migration, catalog v1.1 source, imported identity, or license classification changes.
