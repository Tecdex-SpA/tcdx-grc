# Authority reconciliation — PASS

Master `TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23`. Human authority: Andrés Barouh, STEP23M and PHASE5_QA_REVIEWER_MEMBERSHIP_AUTHORIZATION_20261007.

andres.grc resolves exactly once by issuer+subject: enabled, OTP1, active PlatformAdmin1, Membership1, active tenant roles0. Classification AUTHORIZED_HUMAN_TENANT_MEMBERSHIP. The retained Membership grants no implicit tenant authority.

Canonical Membership `01a118c3-b108-7636-abcf-7cb86725320e` in tenant `01a0cfc7-0c97-75a3-890f-d6ca9db8bbe9` / TECDEX is active. Created `2026-10-07T23:47:20.454Z`, joined `2026-10-07T23:47:20.469Z`, actor `01a0cfae-d860-730d-88b8-d8b1b3f5d7dc`. Command tenantUserOnboardingCreate; material audit `01a118c3-b10a-774f-893f-def4fd1febb8` and completion `01a118c3-b18f-75c8-900f-ab1096ba144d`, correlation `01a118c3-b0f2-73fb-a8bd-24803faf7f6f`. Completion reason: QA Phase5 final recovery 20261007: principal revisor autorizado expresamente; Membership retenida y roles temporales revocados al finalizar.

Creation precedes session revoke `2026-10-08T00:25:47.604Z`, audit `01a118e6-e5df-70ed-a8f1-6082454426df`, correlation `01a118e6-e45d-7441-99da-ae0f1209cd0c`. The historical pre-revoke snapshot and present READ ONLY query agree on1/1/0/OTP1/enabled. No authority event shares the revoke correlation. The session service/adapter never changes Membership, MembershipRole or PlatformRoleAssignment; its PostgreSQL/RBAC/idempotency/audit regression passed. SESSION_REVOCATION_AUTHORITY_SIDE_EFFECTS=0. No authority correction, grant, revoke or IAM change performed.

Password and OTP remain REQUIRED, maxAge600; Cookie DISABLED. Signed native callback regression checks exact IAM/backend images, first enrollment, password-only, expired AMR and forged/missing context. Credentials were not selected or persisted. Current evidence: PHASE5_AUTHORITY_PROOF.json; prior accepted pre-revoke and GRC401 proofs remain unchanged.
