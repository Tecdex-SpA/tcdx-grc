# DR-PHASE5-CANONICAL-TENANT-USER-ENROLLMENT-2026-09-24

| Campo | Valor |
|---|---|
| Active master regent | `TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23` |
| Amendment | `TCDX_GRC_PHASE5_CANONICAL_TENANT_USER_ENROLLMENT_v1.0_2026-09-24` |
| Scope | QA, Phase 5 closure only |
| Decision | `APPROVED_BY_HUMAN_AUTHORITY` |

This versioned rector amendment closes only `MISSING_CANONICAL_USER_ENROLLMENT`. It introduces the tenant-owned `TenantMembershipInvitation`, Platform-scoped permissions `platform.membership_invitation.create` and `platform.membership_invitation.update` granted exclusively to the base `PLATFORM_ADMIN` role, operations `membershipInvitationCreate` and `membershipInvitationRevoke`, and internal ceremony `MEMBERSHIP_INVITATION_ACCEPT`. Create governs creation/delivery bootstrap and update governs administrative mutations such as revoke; acceptance grants no Platform authority.

The invitation lifecycle is `pending -> accepted|expired|revoked`. It carries a normalized delivery email and Phase-5-only `authentication_method=ZOHO`; neither is a role, grant or permanent identity authority. The clear invitation token has 256 random bits, PT24H server-owned expiry and one-time semantics. Only its SHA-256 digest is persisted. The clear value is excluded from PostgreSQL, audit, outbox and logs and is not a TCDX bearer.

`expired` is the effective terminal projection of a persisted `pending` invitation once PostgreSQL server time reaches `expires_at`. Acceptance and revoke both re-evaluate that clock condition under row lock and fail closed; a stale persisted `pending` value never remains usable and no unapproved scheduler or expiry event is introduced.

Acceptance requires a valid pending unexpired unrevoked invitation, digest-bound OIDC flow state, and successful Zoho proof whose normalized email matches the temporary invitation recipient. Canonical `UserIdentity` resolution and duplicate prevention remain exclusively based on OIDC issuer plus stable subject. Under an invitation-row lock the transaction creates or idempotently reuses one active `TenantMembership`, consumes the invitation, writes the approved audit/outbox facts and assigns no role. Bootstrap authority ends immediately; all later authorization follows `UserIdentity -> TenantMembership -> MembershipRole -> Permission`.

The physical entity was introduced by forward-only migration `20260924000300_phase5_membership_invitation.sql`, after `20260924000200`. Once that migration was observed applied in QA with superseded Tenant Admin grants, it became immutable at SHA-256 `0942e5eb360f7157a444d7b04fbe7558312e8d782347e60a745a8d4365034806`. The authorized Platform authority is reconciled only by successor `20260925000100_phase5_membership_invitation_platform_authority_reconciliation.sql`, which changes no table count or permission vocabulary. Microsoft Entra ID, Google Workspace, LOCAL password/MFA, credential storage and the commercial administration console are explicitly outside this amendment and reserved for PRE-6. No historical migration, second IAM authority, direct user grant, fake identity, SQL business fixture, commit, push, PR, merge, production, PRE-6 or Phase 6 is authorized.

```text
RECTOR_AMENDMENT=APPROVED
SECOND_IAM_AUTHORITY=0
ZOHO_ONLY_PHASE5=1
ROLES_ON_ACCEPT=0
HISTORICAL_MIGRATION_MUTATION=0
```
