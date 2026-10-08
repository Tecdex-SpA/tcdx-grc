# Human decision — STEP 23L-TENANT-ONBOARDING-D1-R

Authority: Andrés Barouh's explicit D1-R task, following D1's blocked decision.
Master: `TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23`.
Status: `APPROVED_HUMAN_DECISION_LOCAL_CONTRACT_ONLY`.

The human approves one Permission `platform.user_identity.read`: Platform Admin
global privacy-minimized discovery and Tenant Admin exact-match onboarding for
its own authorized tenant. The approved physical/logical representation uses
the existing Permission and ownership-qualified RolePermission models, canonical
`platform`/`tenant` scopes and endpoint predicates, with no new scope or schema.
No runtime row, grant, source implementation or generated runtime projection
is published by this record.

The human explicitly retains `TENANT_BOOTSTRAP_PUBLIC_ENDPOINT=0` and authorizes
only internal bootstrap within a governed Platform initial-company onboarding
flow. This supersedes D1's unapproved standalone first-admin endpoint proposal;
that proposal has no active authority. Existing TenantCreate primitive retains
its four fields; bounded `tenantInitialOnboardingCreate` coordinates it and
the internal function, without arbitrary existing tenant input or bootstrap proxy.
Identity selection or separately authorized Managed Identity provisioning
precedes company creation. A wizard may present one confirmation while reporting
each canonical result truthfully.

Bootstrap requires a distinct active initial administrator, zero active tenant
administrators for new-first execution, unconsumed initialization, valid canonical
template/grant set and duplicate-free Membership/assignment. Completed exact-intent
replay is the explicit idempotency exception; revocation does not reopen bootstrap.
It initializes canonical base tenant Role instances and grants via SEED010,
creates/reuses only the target Membership and assigns only TENANT_ADMIN. Platform
actor gains zero Membership, tenant role or implicit tenant ownership.

Normal subsequent Membership/role administration remains Tenant Admin authority
inside its own tenant with CORE_PLATFORM entitlement. Managed Identity credential
provisioning stays Platform-only; no tenant provisioning grant. Initial Platform
bootstrap has no Subscription prerequisite; subsequent tenant commands keep
the commercial chain. A regulatory pack/norma is not an extra user-admin gate.
G6/G7/G8 remain deferred beyond resolving that ordering.

Executable25 owns the closed semantics. OpenAPI02 and operation matrix03 own
transport/operation bindings,05 the staged Permission/grants,08 privacy/material
audit,07/12 recovery and transaction boundaries. No fake rollback, identity
deletion or credential redisclosure is approved. Runtime remains DENY until the
separate authorized publication/implementation gates.

OpenAPI validation also identified six existing path-items/eight operations
with an undeclared `{id}`. Only their already-contractual UUIDv7 path parameter
declaration is reconciled; no route, business command, grant or G8 UX changes.

No migration28, SQL/data publication, QA mutation, ACME initialization, first
login/password/TOTP/session revoke for andres.grc, build/deploy/stage/commit/
push/merge or Phase6. Human visual review remains pending. D2 is a separate packet.
