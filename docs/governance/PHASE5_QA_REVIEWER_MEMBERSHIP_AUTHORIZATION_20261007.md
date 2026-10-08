# Phase 5 QA reviewer authority — human authorization

Active master: `TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23`.

On 2026-10-07 the project authority explicitly selected **“Autorizar andres.grc: Membership final=1, roles finales=0”** after reviewing the canonical API constraint: membership creation retains an auditable Membership; role revocation ends authority but does not delete that Membership.

This supersedes the task packet's final `ANDRES_GRC_MEMBERSHIPS=0` condition **only for this authorized QA reviewer Membership in existing TecDex**. It authorizes canonical tenant onboarding of existing `andres.grc` and the minimum temporary existing tenant roles needed for independent Phase 5 approval: `COMPLIANCE_MANAGER`, `GRC_MANAGER`, `LEGAL_REVIEWER`. All three assignments must be revoked after validation. The retained Membership carries no active tenant role or implicit tenant permission.

The human selected `andres.grc` as the second QA principal. Mario Cáceres is explicitly excluded; admin.acme is unavailable for these tests. Baruj remains the existing author/operator. The canonical workflows evaluate distinct authenticated UserIdentity actors; approval is never performed using fabricated authentication or a service principal.

PlatformRoleAssignment remains unchanged by onboarding, business workflows and reviewer role cleanup. No Platform grant implies tenant authority. Issuer+subject remains identity authority. No password, MFA, enablement, schema, Permission, lifecycle contract or Phase 6 change is authorized by this decision.

Authority chain: rector 09/21/22/25/42/43/46 → approved executable contracts 21/22/26 → final recovery task packet and explicit human answer → canonical Membership and temporary MembershipRole commands → runtime and audit evidence under `artifacts/phase5-final-closure-20261007/`.
