# Platform IAM physical-model amendment

## Canonical relation

| Object | Physical representation | Profile / ownership | Columns | Integrity |
|---|---|---|---|---|
| `PlatformRoleAssignment` | `iam.platform_role_assignments` | I / PLATFORM_CONTROL | `platform_role_assignment_id uuid!`; immutable creation actor/time; `ownership_class varchar(24)!=PLATFORM_CONTROL`; `user_identity_id uuid!`; `role_id uuid!`; `valid_from timestamptz!`; `valid_to timestamptz?` | PK assignment; FK UserIdentity; composite FK `(role_id,ownership_class)` to Role; exact PLATFORM_CONTROL check; validity check; one open active grant per user+role |

The fixed `ownership_class` column is the physical ownership discriminator used by the composite FK. It does not duplicate Role code, Permission or grant semantics. `iam.roles` receives the supporting candidate key `(role_id, ownership_class)`; its existing primary key and catalog authority are unchanged.

`PlatformRoleAssignment` contains no `tenant_id`, `tenant_membership_id`, email, issuer, subject, provider name or credential material. External `issuer + stable subject` resolves only the canonical `UserIdentity`; the persisted assignment is the grant authority.

No person-specific assignment is seeded.

## First Platform Admin Bootstrap over existing objects

F5D-007 requires no second table, flag, seed or constraint. The future internal ceremony resolves the exact published baseline `PLATFORM_ADMIN` Role by canonical code and `PLATFORM_CONTROL` ownership, locks that same `iam.roles` row `FOR UPDATE`, and then re-evaluates zero active plus zero historical rows in `iam.platform_role_assignments` under `READ COMMITTED`. The lock is the single serialization point for all bootstrap attempts; the zero-historical predicate makes revocation unable to reopen bootstrap.

The one successful transaction inserts the assignment and `audit.iam.platform_role_assignment.bootstrap.v1` into existing `ops_audit.audit_events` atomically. Any failure rolls both back. The caller never supplies a physical Role UUID. No migration change or additional table is required by F5D-007.

## Temporal, revocation and audit behavior

- `valid_from` is inclusive and `valid_to` is exclusive/nullable.
- `valid_to > valid_from` whenever present.
- the partial unique index on `(user_identity_id, role_id)` where `valid_to IS NULL` prevents duplicate simultaneously open grants.
- revocation ends validity; it never deletes grant history.
- creator fields follow the existing immutable IAM assignment pattern; issuance, privileged use, assignment and revocation remain represented by governed AuditEvents.

## Approved creation defaults

- `platform.tenants.lifecycle_state DEFAULT 'active'`.
- `platform.tenants.data_classification DEFAULT 'confidential'` and CHECK in `public|internal|confidential|restricted`.
- `iam.tenant_memberships.membership_state DEFAULT 'active'`.

These defaults are server-owned initial semantics. They do not authorize caller control of the fields and do not close any later lifecycle transition.
