# TCDX GRC — Phase 5 fast-track runtime/UI decisions

| Field | Value |
|---|---|
| Human authority | Explicit project-authority task packet received 2026-09-23 |
| Master regent | `TCDX_GRC_MASTER_REGENT_BASELINE_v1.6_2026-09-23` |
| Scope | Phase 5 IAM/runtime and login/session/tenant-context UI only |
| Variation budget | `ZERO` |
| Phase 6 | `BLOCKED` |

This record materializes the three decisions stated by the human project authority for the current Phase 5 fast-track task. It does not approve a commit, push, PR, merge, production deployment, global Phase 5 closure, visual review or Phase 6.

## Decision A — JOSE

`jose@6.1.0` is the single approved security dependency for JWK/JWS/JWT validation, provider-neutral OIDC validation and TCDX asymmetric application-token issuance/verification. Custom cryptography and a parallel JWT/JOSE library are prohibited.

```text
JOSE_6_1_0=HUMAN_APPROVED
CUSTOM_JWT_CRYPTO=PROHIBITED
PARALLEL_JWT_LIBRARY=PROHIBITED
```

## Decision B — TENANT_BOOTSTRAP

`TENANT_BOOTSTRAP` is an internal governed operation executable only by an authorized Platform Admin after `tenantCreate`. In one transaction it validates an active canonical tenant and active canonical `UserIdentity`, materializes the exact 22 tenant baseline roles and grants from `SEED-004`/`SEED-006` through `SEED-010`, creates or reuses one active membership, and creates or reuses exactly one tenant-scope `TENANT_ADMIN` assignment.

The operation is serialized on the canonical tenant row, naturally idempotent for the same tenant and identity, fail-closed on catalog/state ambiguity, and audited through the existing canonical reinforced privileged-use event. It creates no endpoint, credential, identity, extra automatic assignment, fake tenant, platform tenant or parallel authority.

```text
TENANT_BOOTSTRAP=HUMAN_APPROVED_INTERNAL_OPERATION
TENANT_BOOTSTRAP_PUBLIC_ENDPOINT=0
TENANT_BOOTSTRAP_BASE_ROLE_SOURCE=SEED_004_PLUS_SEED_006_VIA_SEED_010
TENANT_BOOTSTRAP_AUTOMATIC_ASSIGNMENT=TENANT_ADMIN_ONLY
```

## Decision C — frontend session/context

The browser receives only the TCDX application JWT, obtains its own active contexts from `GET /access/me`, lets the human select a tenant context when necessary and sends that selected candidate through `X-TCDX-Tenant-Id`. The backend recomputes authorization for every request. The frontend does not calculate or become authority for permissions/scopes, and no permission-dump endpoint is authorized.

```text
FRONTEND_SESSION_AUTHORITY=BACKEND_ONLY
FRONTEND_BEARER=TCDX_APPLICATION_JWT_ONLY
FRONTEND_TENANT_DISCOVERY=GET_/access/me.available_tenant_contexts
FRONTEND_PERMISSION_AUTHORITY=0
PARALLEL_EFFECTIVE_PERMISSION_ENDPOINT=0
```

Presentation implementation remains independently subject to the active visual-authority gate and `HUMAN_UI_REVIEW`.
