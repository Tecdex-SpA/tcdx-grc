# Managed Identity AMR execution policy

Contract authority: executable contract 22, MI-007 and MI10 R3 callback recovery.
Canonical source: `managed-identity-amr-policy.json`.

Keycloak 26.7.5 defaults `default.reference.maxAge` to zero. Native AMR mapping
then omits an already verified password by the time the operator submits TOTP.
Both verified factor references must remain available during the existing
600-second GRC authentication transaction. This is bounded evidence retention,
not a replacement for factor execution. Cookie stays DISABLED and both
executions stay REQUIRED. Backend validations remain unchanged.

Before publication, resolve the existing `tcdx-managed-identity` realm, its
`tcdx-browser-password-totp` browser flow and the existing password and OTP
execution configurations. Fail closed on a missing/ambiguous execution, a
non-REQUIRED factor, another reference value or an enabled Cookie authenticator.
Preserve every other configuration entry and record the nonsecret before state.
Set only `default.reference.maxAge` to `600` in both existing configurations.
No new flow/configuration/user/credential or service-account grant is required.

Publication uses the authenticated private Keycloak administrative channel and
its native authenticator-config update operation. The provisioner has no realm
management authority and must not be expanded or reused for this change.
Nominal human administrator custody is recorded in MI6H-C. No human password,
OTP, cookie or bearer token may be supplied to Codex. When only that human
administrator can authenticate, publication is a genuine administrative human
boundary; database edits, offline realm replacement and bootstrap recovery are
not substitutes.

Human private-console application, when required:

1. Open the approved private Admin Console using the existing channel and log
   in personally as `andres.barouh`; supply no credentials to Codex.
2. Select realm `tcdx-managed-identity`, Authentication, flow
   `tcdx-browser-password-totp`.
3. Open the existing configuration for `auth-username-password-form`, reference
   `pwd`. Set its Authentication Reference Max Age to `600` seconds; save.
4. Open the existing configuration for `auth-otp-form`, reference `otp`. Set its
   Authentication Reference Max Age to `600` seconds; save.
5. Preserve reference values and every other execution/setting; change no user,
   password, OTP, session or authority. Leave admin-event representation off.
6. Report only that both configuration changes were saved. Automated read-only
   verification must compare the exact source policy and audit before any human
   GRC login retry is declared ready.

Rollback restores the exact previous presence/value of the max-age keys through
that same native administrative channel. Capture sanitized failed-candidate
metadata first. Do not roll back user credentials or authentication enrollment.

Reproduction: `node iam/run-amr-callback-regression.mjs <local-IAM-image>
<exact-backend-image>`. Only disposable local imported identities are used.
It exchanges real authorization codes with S256 and consumes signed ID tokens
in the exact backend image, retaining only factor references and safe boolean
results. No browser traces, screenshots, credential values or tokens persist.
