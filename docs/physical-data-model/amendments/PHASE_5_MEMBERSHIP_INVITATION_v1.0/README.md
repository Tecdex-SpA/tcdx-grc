# Phase 5 TenantMembershipInvitation physical amendment v1.0

Authority: `DR-PHASE5-CANONICAL-TENANT-USER-ENROLLMENT-2026-09-24` under active master `TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23`.

Preflight reconfirmed that the approved 231-table physical model contained no invitation/enrollment entity and that `ExternalIdentityBinding` and `TenantMembership` represent different authorities. This amendment adds exactly one canonical table, `iam.tenant_membership_invitations`, producing 232 domain tables. It reuses the existing canonical `UserIdentity`, `TenantMembership`, Role, Permission, audit, outbox and idempotency authorities.

The table uses the tenant-mutable profile, canonical actor metadata and row version. Its own fields and constraints are recorded in `docs/physical-data-model/01_PHYSICAL_DATA_MODEL.md`. No password, MFA secret, external token, clear invitation token or email-based grant is stored.

Administration is deliberately separate from object ownership: the invitation remains TENANT_OWNED, while create/revoke require the approved Platform-scope permissions through the canonical active `PlatformRoleAssignment -> PLATFORM_ADMIN -> RolePermission` chain. The invited human receives no Platform authority during acceptance.

Expiry is server-time-owned: API projections expose `expired` once `expires_at` is reached, while accept and revoke revalidate that condition under the invitation-row lock. This makes an elapsed persisted `pending` row terminal and unusable without adding a scheduler, implicit event or additional physical authority.

The entity was introduced by now-applied, immutable `database/migrations/20260924000300_phase5_membership_invitation.sql`. Forward-only successor `database/migrations/20260925000100_phase5_membership_invitation_platform_authority_reconciliation.sql` materializes the controlling Platform Admin grant policy, tightens terminal coherence and completes the canonical service-actor FKs/indexes without changing the 232-table shape. The amendment changes physical model, expected schema and manifest; it does not modify any applied migration.
