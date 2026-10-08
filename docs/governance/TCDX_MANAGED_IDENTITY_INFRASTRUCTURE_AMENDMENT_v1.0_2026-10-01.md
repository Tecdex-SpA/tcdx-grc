# TCDX GRC — Managed Identity infrastructure and onboarding rector amendment v1.0

| Field | Value |
|---|---|
| Amendment ID | `TCDX_GRC_MANAGED_IDENTITY_INFRASTRUCTURE_v1.0_2026-10-01` |
| Status | `APPROVED_BY_HUMAN_AUTHORITY` on 2026-10-01 |
| Active master regent | `TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23` |
| Parent decision | [`ADR_2026_10_01_TCDX_MANAGED_IDENTITY_KEYCLOAK.md`](ADR_2026_10_01_TCDX_MANAGED_IDENTITY_KEYCLOAK.md) |
| Scope | New Keycloak deployment coordinate and no-mailbox initial credential ceremony only; documentary activation before MI4 |

## Rector lifecycle and authority

Rector 46 §4, rector 12 and plan 43 §2 require a human-approved ADR and a versioned rector change before implementing a new deployable layer. The human authority approved the Keycloak ADR in STEP 23L-MI3 and explicitly approved the coordinates and ceremony below in STEP 23L-MI3A. This is the versioned, scoped amendment to that architecture. It follows the existing governance pattern of the Phase 5 canonical enrollment amendment under the active master regent. The checksummed v1.7 baseline, its manifest, historical baselines, physical GRC model and current execution gates remain intact. This amendment does not activate a new master baseline by Codex action and does not authorize MI4 execution within MI3A, QA deployment, Phase 6 or a GRC migration.

## Approved deployment coordinate

| Invariant | Approved value and boundary |
|---|---|
| IAM public hostname | `iam.grc.tecdex.net`; public IAM access requires `https://iam.grc.tecdex.net/` |
| GRC public hostname and callbacks | `https://grc.tecdex.net/` only; `grc.tecdx.net` and `iam.grc.tecdx.net` are prohibited as active origins, aliases, redirects or fallbacks |
| Keycloak runtime host | Existing frontend VM `192.168.2.46`; **separate service/container**, process, lifecycle, healthcheck, restart policy, resource accounting and logs from the GRC frontend |
| PostgreSQL host | Existing PostgreSQL 16 instance on `192.168.2.40` |
| Keycloak persistence | Own database and own least-privilege PostgreSQL principal; never `tcdx-grc`, its schemas, credentials, grants or migration authority |
| Managed Identity realm | One managed-human realm, never one per tenant; final realm identifier and exact OIDC issuer are configuration to verify during MI4/MI5 |
| Identity and authorization | Keycloak holds passwords/TOTP/recovery state and authenticates; GRC maps exact issuer + stable subject to canonical `UserIdentity` and alone owns Membership, RoleAssignment, PlatformRoleAssignment, permissions and DENY |

The hostname approves the IAM authority's public name, **not** a TLS certificate, proxy rule or prematurely fixed realm issuer. The human authority subsequently confirmed that the DNS name was already created. A read-only DNS query on 2026-10-01 returned A record `181.212.166.187`; this is a public entrypoint observation, not proof of routing to `192.168.2.46`, TLS readiness or Keycloak deployment. MI3A creates or modifies no DNS record. The issuer must be derived from the actual HTTPS hostname plus the configured single realm and validated against discovery/JWKS at the later integration gate. GRC callback configuration stays on the canonical GRC origin. No public `http://192.168.2.46:<port>` endpoint is allowed. MI4 must discover the existing DNS target, proxy product/topology, certificate and trusted-proxy-header pattern before any later authorized infrastructure change; it must not introduce a parallel proxy.

The shared VM is a placement decision, not permission to embed Keycloak in the frontend container, nginx frontend process, React/Vite process or GRC backend. MI4 must first inspect CPU, RAM, disk, container runtime, current frontend consumption, ports, networks, filesystem, restart policy and monitoring. If capacity is inadequate, `BLOCKED_FOR_INFRA_CAPACITY`; moving Keycloak to another VM requires a separate human rector decision.

The shared PostgreSQL instance is a host decision, not permission to put Keycloak tables into `tcdx-grc`. Keycloak's database and principal require separate creation, privileges, backup and restore. The GRC migration runner and Kysely migrations cannot manage Keycloak schema. No Keycloak database or role is created by this amendment. The only existing project database name found in versioned GRC contracts is `tcdx-grc`; no separate-service database naming convention is established. `tcdx-keycloak` is a **proposal** for later explicit naming review, not an approved or created database.

## Approved no-mailbox ceremony

An authorized operator provisions an individually attributable human identity in Keycloak; issues a temporary one-use credential; delivers it directly and securely to the named human; requires the person to choose a permanent password unknown to the operator; requires TOTP enrollment; then requires a real verified TOTP challenge in the authentication that will be accepted by GRC. A usable GRC session is issued only after validated OIDC proof, exact issuer+subject mapping and proof that this authentication verified both password and TOTP. TOTP enrollment alone is never sufficient. Provisioning grants no GRC membership or role automatically. The initial credential must have a bounded short operational lifetime, forced first-use change and no reuse. The approved delivery model is direct operator-to-person handoff without mailbox; MI6 must document and test its person verification, single-use handling and audit metadata without recording the credential.

Password, hash, salt, verifier, TOTP seed, recovery secret, initial credential, raw token and signing private key are excluded from `tcdx-grc`, Git, logs, GRC audit, tickets, reports, documentation and prompts. Keycloak credential material belongs only to its protected external authority and separate persistence. Relevant Keycloak user and admin events must be persisted without secrets. Brute-force protection must be explicitly enabled and tested, not assumed from defaults.

Recovery is authorized operator reset, invalidation of previous credential and sessions, temporary reset state, forced permanent password change, TOTP reset/re-enrollment when required, a fresh verified TOTP authentication and audit. MFA reset is sensitive, scoped by GRC when applicable and cannot expose an old seed. No mailbox, security questions or shared human account. The five `@credex.cl` strings remain proposed login identifiers only; each future human identity needs a named real person. The tenant code remains caller supplied, trimmed, nonblank, maximum 64 and globally unique, with case semantics unspecified and human approval still required.

## MI4 and later gates

MI4 is **infrastructure discovery and local/isolated Keycloak preparation**. Before any deployment it must verify VM capacity, container runtime, port availability, frontend resource conflict, the already-created DNS record's effective entrypoint and proxy/TLS pattern, PostgreSQL connectivity, final database name and separate principal, secret custody, backup/restore, health, restart, monitoring, brute-force and event audit. Any later DNS change, proxy, certificate, firewall, Keycloak database/role creation and QA deployment are separately authorized mutations. If any required fact cannot be established, that dependent action remains blocked; no alternate VM, domain or database is inferred.

This amendment changes no GRC canonical entity, physical table, migration, API operation, runtime source or Zoho Phase 5 enrollment semantics. `MANAGED_IDENTITY_IMPLEMENTED=NO`, `MANAGED_IDENTITY_DEPLOYED=NO`, `MANAGED_IDENTITY_RUNTIME_VALIDATED=NO`, `STEP_23L=BLOCKED`, `HUMAN_UI_REVIEW=PENDING`, `PHASE_6=BLOCKED`, `PHASE_6_STARTED=0`.

## Contract and traceability

Rector 12/43/46 → human-approved MI3 ADR → this human-approved versioned infrastructure amendment → executable MI-001–MI-028 → MI4–MI15 plan. The actual runtime gate still requires the normal persistence/domain/API/RBAC/audit/UI/test/E2E/runtime evidence chain where applicable.

```text
HUMAN_INFRA_PLACEMENT_APPROVAL=YES
HUMAN_IAM_HOSTNAME_APPROVAL=YES
HUMAN_ONBOARDING_CEREMONY_APPROVAL=YES
IAM_CANONICAL_HOSTNAME=iam.grc.tecdex.net
KEYCLOAK_RUNTIME_HOST=192.168.2.46
KEYCLOAK_RUNTIME_ISOLATION=SEPARATE_SERVICE
KEYCLOAK_VM_CAPACITY_VALIDATION_REQUIRED=YES
KEYCLOAK_POSTGRES_HOST=192.168.2.40
KEYCLOAK_DATABASE_SEPARATE=YES
KEYCLOAK_DATABASE_IS_TCDX_GRC=NO
KEYCLOAK_DB_PRINCIPAL_SEPARATE=YES
PROPOSED_KEYCLOAK_DATABASE_NAME=tcdx-keycloak
IAM_DNS_REQUIRED=YES
IAM_DNS_CREATED=YES_PREEXISTING_NOT_BY_MI3A
IAM_DNS_A_RECORD_OBSERVED=181.212.166.187
IAM_REVERSE_PROXY_REQUIRED=YES
IAM_TLS_REQUIRED=YES
MANAGED_IDENTITY_INITIAL_CREDENTIAL_CEREMONY_APPROVED=YES
MANAGED_IDENTITY_MAILBOX_REQUIRED=NO
MANAGED_IDENTITY_MFA_PROOF_REQUIRED=YES
MIGRATION_26_CREATED=NO
PHASE_6_STARTED=0
```
