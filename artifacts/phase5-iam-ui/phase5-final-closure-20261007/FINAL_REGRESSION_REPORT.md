# FINAL_REGRESSION_REPORT

All executed with Node22.23.2/pnpm12.4.1 against current source, with QA secrets stripped for local runners. Root Vitest485PASS (includes81frontend), separate frontend81PASS, isolated PostgreSQL79PASS/14files/0skipped, GRC Playwright400PASS/4viewports, IAM real synthetic Keycloak21PASS/3viewports and theme4PASS. Root PostgreSQL79skipped is intentional only in unit invocation; all79run in the separate isolated suite.

Native AMR/code+PKCE callback:3scenarios PASS (expired pwd reference DENY, actual pwd+otp ACCEPT, first enrollment without verified challenge DENY),6signed-proof negatives PASS against the exact QA backend image. IAM synthetic fixture architectureARM64/Keycloak26.7.5; QAAMD64 images unchanged. This is local authentication regression, not another human login.

Typecheck/lint (repository tsc static scripts), production build, generated-contract verification, OpenAPI159operations/54reads, matrix equality, permission/physical representation,39request/projection cases, RBAC/default-DENY/scopes, rector hashes/status, diff, source secret/domain checks PASS. Recoverable sandbox port/Docker access and missing Python modules were resolved via approved escalation and existing tools; no source fix was needed. No historical counts were imposed as acceptance counts.

Unit/integration/E2E suites cover current auth/state/nonce/PKCE/session-store revocation, identity disabled/unknown/password-only negatives, roles, onboarding, audit, idempotency, core workflows, scope/tenant isolation, branding, keyboard/focus and responsive behavior. UI E2Es use fixture-backed API responses and PostgreSQL integration runs isolated; neither is represented as missing Core QA human SoD/runtime evidence.
