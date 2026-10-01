# TenantMembershipInvitation traceability and review

| Requirement | Materialization |
|---|---|
| Tenant-owned invitation | `iam.tenant_membership_invitations.tenant_id` plus tenant FK and composite membership FK |
| 256-bit one-time token | `randomBytes(32)` at create; only lowercase SHA-256 `token_digest` persists |
| PT24H server expiry | server transaction time plus 24 hours; expired invitation fails acceptance/revoke closed |
| Zoho only in Phase 5 | closed `authentication_method='ZOHO'` check and runtime validation |
| Email not identity | delivery/ceremony comparison only; UserIdentity key remains issuer+stable subject |
| Atomic accept | invitation row lock; identity resolution, membership create/reuse, consume, audit and outbox in one transaction |
| No automatic role | acceptance writes no `iam.membership_roles` row |
| Platform Admin only | two new Platform-scope Permission rows; exactly two grants on the single published baseline `PLATFORM_ADMIN` role |
| Audit/outbox | approved create/accept/revoke codes; conditional membership-created event only on insert |
| Concurrency | create/revoke idempotency; revoke If-Match; accept one-time flow plus row lock |
| No second IAM | OIDC remains proof boundary; canonical GRC IAM chain remains sole authorization authority; acceptance receives no Platform grant |

`PHYSICAL_AMENDMENT_REVIEW=CONTRACT_COMPLETE_PENDING_RUNTIME_GATES`

Applied predecessor `20260924000300` remains byte-identical. The Platform Admin-only row above is materialized by forward-only authority reconciliation `20260925000100`; its postcondition requires exactly two authorized grants and zero Tenant Admin or other grants.
