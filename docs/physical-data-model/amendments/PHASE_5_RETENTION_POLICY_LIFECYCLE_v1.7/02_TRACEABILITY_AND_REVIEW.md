# Traceability and review boundary

| concern | authority / evidence |
|---|---|
| physical DDL | migration `20260924000200`; generated `database/expected-schema.json`; migration manifest |
| operations | OpenAPI and API Resource Operation Matrix: create, review, approve, publish |
| authorization | existing permissions; Privacy Manager create/review/publish; Legal Reviewer approve; tenant scope; default DENY |
| lifecycle | three new published `LifecycleTransitionDefinition` rows and tenant scopes |
| concurrency | strong API `If-Match` normalized to `row_version` CAS; no body dual authority, `xmin`, timestamp or `version_number` substitute |
| accountability | one operation AuditEvent each; publish alone emits `privacy.retention_policy.published.v1` through outbox |
| QA boundary | migration/deploy only after local gates and verified backup; policy approval requires a second authenticated human |

No baseline activation is performed: this is the human-authorized forward-only amendment mechanism outside the immutable baseline. No PRE-6 or Phase 6 work is authorized.

## QA materialization evidence — 2026-09-24

- PostgreSQL 16 custom-format backup: `/home/tecdex/backups/tcdx-grc/phase5-retention/tcdx-grc-before-20260924000200-20260924T191750Z-pg16.dump`; catalog verified; 2,165,355 bytes; SHA-256 `5383c52085519127854ba96ea882cc5c284573f6d63c1bb2d540e34eeefa8d87`.
- Canonical runner: fifteen historical migrations checksum-verified and only `20260924000200` applied; final ledger count sixteen.
- Physical result: 231 canonical tables, zero schema mismatches, nullable effective interval, `row_version bigint NOT NULL DEFAULT 1` and zero RetentionPolicy rows.
- Registry result: 103 lifecycle edges and 139 raw definition rows, including the three published RetentionPolicy transitions; zero seed mismatches.
- Backend result: only the QA backend was rebuilt/recreated; image `sha256:17a66c259d4a7ceb6f5bffd4fdc09fe3348118db30a3e3d775f991fc4a2a1a82`; live/ready healthy, database up, MinIO healthy, ClamAV healthy, zero observed HTTP 5xx and SQL-error signatures after deployment.

## Blocking SoD boundary

QA still has exactly one `UserIdentity` and zero RetentionPolicy rows. OIDC login can resolve or create a canonical identity, while `membershipCreate` and `membershipRoleAssign` exist, but there is no published tenant invitation/enrollment or canonical identity-selection operation. `membershipCreate` requires an existing raw `user_identity_id` and `/access/me` does not expose it. Consequently the complete second-human enrollment chain cannot be executed without prohibited SQL or out-of-band UUID handling. No identity, membership, role assignment or policy mutation was performed at this gate.
