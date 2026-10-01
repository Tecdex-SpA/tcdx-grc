# TCDX GRC — Phase 5 Subscription create decision

| Field | Value |
|---|---|
| Human authority | Explicit project-authority task packet received 2026-09-24 |
| Master regent | `TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23` |
| Scope | Phase 5 QA Subscription provisioning closure only |
| Physical model | Existing model reused; no DDL |
| Phase 6 | `BLOCKED` |

This record is a post-v1.7 human decision and does not rewrite the immutable v1.7 baseline history. It authorizes exactly one additive Platform permission and one public operation over existing canonical entities.

```text
PERMISSION_CODE=platform.subscription.create
PERMISSION_OWNERSHIP_CLASS=PLATFORM_CONTROL
PERMISSION_SCOPE=platform
PERMISSION_BASE_ROLE=PLATFORM_ADMIN
OPERATION_ID=subscriptionCreate
ROUTE=POST /api/v1/platform/subscriptions
AUDIT_EVENT=audit.platform.subscription.create.v1
OUTBOX_EVENT=platform.subscription.created.v1
```

The operation creates one active Subscription for an existing active tenant and an existing published PlanVersion. It accepts no capability or entitlement list. Effective capabilities remain derived exclusively through `Subscription -> PlanVersion -> Entitlement -> Capability`.

Tenant-row locking serializes active-subscription creation. Idempotency, its request fingerprint, the Subscription insert, the material audit, the reinforced privileged-use audit and the outbox event share one transaction. Reuse of a key with a different payload fails closed.

This decision does not authorize Plan, PlanVersion, Capability or Entitlement mutation; Subscription update/cancel/delete/change-plan; direct user grants; a schema change; UI work; production; PRE-6; Phase 6; commit; push; PR or merge.

The permission and its single base-role grant are published through the repository's existing forward-only migration runner as catalog data only. That release creates no table, column, constraint or index and leaves the canonical physical-table count unchanged.
