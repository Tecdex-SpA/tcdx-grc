# PRE-F5E Platform authority physical-model amendment v1.6

`STATUS=PASS_LOCAL_CANDIDATE_PENDING_QA_MIGRATION_AUTHORIZATION`

`RECTOR_CANDIDATE=TCDX_GRC_MASTER_REGENT_BASELINE_v1.6_2026-09-23`

This overlay proposes exactly one new canonical table, `iam.platform_role_assignments`, plus the minimum defaults/checks approved for Tenant and TenantMembership creation. It does not mutate the frozen active physical-model documents in place and creates no fake tenant, platform tenant, credential store, provider registry or parallel IAM.

F5D-007 adds no physical object. Its one-time concurrency and audit contract uses the candidate assignment relation, the existing canonical `PLATFORM_ADMIN` Role row and the existing `ops_audit.audit_events` relation in one transaction.

The active rector baseline authorizes this physical contract. The 229-table QA model remains the runtime authority until migration `20260923000100` is separately authorized for that environment.
