# RLS context roles and predicates design R6

D4=A authorizes design for the exact 24 R5 candidates. Version R6 draft1, DRAFT_NOT_APPROVED_NOT_IMPLEMENTED. No SQL policy, role, function, setting, extension or DDL is created. Names OwnTenant, OperationAuthorized and ExplicitGlobalOperation below are logical predicates, not callable objects or existing grants. Actual database role names/attributes/ownership remain PENDING_OPERATIONAL_INPUT.

## Context trust and roles

BoundContext must derive from the validated canonical issuer/stable-subject principal, selected active membership/tenant or an explicitly authorized Platform/ServicePrincipal operation, exact tenant scope, purpose and transaction. A request header, role name, free GUC or a caller-provided boolean is not proof. Missing/malformed/expired/unbound context denies the specific operation. RLS supplements backend RBAC/entitlements/ObjectPolicy/SoD; it never replaces them or validates a legal retention binding.

The proposed runtime group is non-owner, non-superuser, without BYPASSRLS, role creation, policy alteration or unrestricted SET ROLE. Table owner/migration identity is separated and never assigned to the application pool. Tenant request, global publication, auth context discovery, worker delivery and DBA recovery privileges are separate operation contracts, not five newly invented accounts. Existing physical roles and their real grants must be mapped before approval or activation.

Plain SET LOCAL of a tenant UUID prevents accidental query filtering omissions only while the application boundary is trusted. It does not protect against a compromised runtime credential capable of changing that setting. This design rejects it as sole trusted identity proof. Approval requires an exact enforceable context-binding mechanism and a tamper test under the actual runtime role. A signed, transaction-bound context verifier or a protected narrowly granted binder are alternatives requiring their own approved architecture and implementation contract; this draft does not choose an algorithm/key/extension/table or claim either already exists. No signing secrets enter business tables. Until that contract closes, CONTEXT_TRUST_GATE=BLOCKED and the design cannot be activated.

OwnTenant means exact tenant equality against that verified context, preserving ownership. OperationAuthorized means the operation-specific existing authority remains validated, including row/target references and SoD. For nullable/mixed tables, ExplicitGlobalOperation requires the exact existing global contract, principal chain, table/action/purpose and approved audit handling; null tenant, PLATFORM_ADMIN/SUPPORT labels, boolean admin flags and all-tenants wildcards are insufficient. Shared references are read only when the relevant published contract permits them; this draft grants no new reader.

Auth discovery must validate own identity/membership before tenant context is bound. A narrowly scoped pre-context authorization read is therefore required; routing discovery through a tenant-equality policy before binding causes a circular dependency. Its principal binding and projected fields must be separately pinned and tested, with no unrestricted bypass connection. That exact binder is a remaining architecture decision, not an inferred exception.

## Pool workers and recovery

Every request uses an explicit transaction with validated context on the same connection/snapshot. Context cannot survive commit/rollback/error/connection reuse; async work cannot reuse caller context. Worker privilege derives from an existing authorized ServicePrincipal, job ownership and exact tenant/operation; global outbox/audit records use only explicit operations. Missing service/operation binding denies delivery, never drops or rewrites history.

USING and WITH CHECK must enforce the same tenant boundary for reads and old/new mutation rows; tenant reassignment and foreign parent references remain denied by RLS plus composite FK. No permissive OR bypass is composed without review. Partition descendants, owner behavior/FORCE, column permissions, views and privileged functions must be included in the future exact physical delta. No viability conclusion is inferred from absent operational evidence.

DBA backup/restore uses a separately authorized privileged identity and verifies complete data, policy metadata, ownership, grants, checksums, ledger and post-restore negative access. A filtered export is not a complete backup. RPO15min/RTO4h are existing rector targets, not new proof. p95 and connection/worker behavior must be measured in the authorized environment. RLS remains NOT_IMPLEMENTED; app/SQL isolation PASS does not equal RLS PASS.

## Per table design

Full role/context/pool/worker/bypass/global/backup/compatibility/test columns are in evidence/continuity-r6/rls-design-24.json.

| Table | Reason | Logical predicate | State |
|---|---|---|---|
| iam.tenant_memberships | canonical membership and revocation | OwnTenant(row.tenant_id) AND OperationAuthorized(row) | DRAFT_NOT_APPROVED |
| iam.tenant_membership_invitations | invitation recipient and lifecycle | OwnTenant(row.tenant_id) AND OperationAuthorized(row) | DRAFT_NOT_APPROVED |
| iam.membership_roles | tenant role assignments and scope | OwnTenant(row.tenant_id) AND OperationAuthorized(row) | DRAFT_NOT_APPROVED |
| iam.roles | mixed tenant roles/platform templates | OwnTenant(row.tenant_id) AND OperationAuthorized(row) OR ExplicitGlobalOperation(row); ownership_class must match tenant/null branch | DRAFT_NOT_APPROVED |
| iam.role_permissions | permission grants and baseline ownership | OwnTenant(row.tenant_id) AND OperationAuthorized(row) OR ExplicitGlobalOperation(row); ownership_class must match tenant/null branch | DRAFT_NOT_APPROVED |
| evidence.documents | document ownership/classification | OwnTenant(row.tenant_id) AND OperationAuthorized(row) | DRAFT_NOT_APPROVED |
| evidence.document_versions | immutable document versions | OwnTenant(row.tenant_id) AND OperationAuthorized(row) | DRAFT_NOT_APPROVED |
| evidence.evidences | evidence ownership/classification | OwnTenant(row.tenant_id) AND OperationAuthorized(row) | DRAFT_NOT_APPROVED |
| evidence.evidence_versions | evidence lifecycle and provenance | OwnTenant(row.tenant_id) AND OperationAuthorized(row) | DRAFT_NOT_APPROVED |
| evidence.evidence_reviews | operational author/reviewer segregation | OwnTenant(row.tenant_id) AND OperationAuthorized(row) | DRAFT_NOT_APPROVED |
| evidence.evidence_links | evidence target references | OwnTenant(row.tenant_id) AND OperationAuthorized(row) | DRAFT_NOT_APPROVED |
| evidence.file_objects | binary references and retention | OwnTenant(row.tenant_id) AND OperationAuthorized(row) | DRAFT_NOT_APPROVED |
| evidence.file_upload_intents | upload authority and intent lifecycle | OwnTenant(row.tenant_id) AND OperationAuthorized(row) | DRAFT_NOT_APPROVED |
| privacy.privacy_processing_activities | processing context/PII/legal applicability | OwnTenant(row.tenant_id) AND OperationAuthorized(row) | DRAFT_NOT_APPROVED |
| privacy.processing_activity_legal_bases | activity legal basis lineage | OwnTenant(row.tenant_id) AND OperationAuthorized(row) | DRAFT_NOT_APPROVED |
| privacy.retention_policies | mixed global/tenant retention; no legal applicability inferred | OwnTenant(row.tenant_id) AND OperationAuthorized(row) OR ExplicitGlobalOperation(row); ownership_class must match tenant/null branch | DRAFT_NOT_APPROVED |
| privacy.data_subject_requests | data subject PII and rights workflow | OwnTenant(row.tenant_id) AND OperationAuthorized(row) | DRAFT_NOT_APPROVED |
| privacy.privacy_breaches | privacy breach restricted data | OwnTenant(row.tenant_id) AND OperationAuthorized(row) | DRAFT_NOT_APPROVED |
| config.configuration_overrides | mixed global/tenant config override contexts | OwnTenant(row.tenant_id) AND OperationAuthorized(row) OR ExplicitGlobalOperation(row); ownership_class must match tenant/null branch | DRAFT_NOT_APPROVED |
| config.effective_configurations | effective contextual configuration | OwnTenant(row.tenant_id) AND OperationAuthorized(row) | DRAFT_NOT_APPROVED |
| config.effective_configuration_layers | configuration parent-layer integrity | OwnTenant(row.tenant_id) AND OperationAuthorized(row) | DRAFT_NOT_APPROVED |
| ops_audit.audit_events | atomic restricted audit and history | OwnTenant(row.tenant_id) AND OperationAuthorized(row) OR ExplicitGlobalOperation(row); ownership_class must match tenant/null branch | DRAFT_NOT_APPROVED |
| ops_audit.idempotency_records | tenant/principal-specific replay and result | OwnTenant(row.tenant_id) AND OperationAuthorized(row) OR ExplicitGlobalOperation(row); ownership_class must match tenant/null branch | DRAFT_NOT_APPROVED |
| ops_audit.outbox_events | transactional events and bounded worker delivery | OwnTenant(row.tenant_id) AND OperationAuthorized(row) OR ExplicitGlobalOperation(row); ownership_class must match tenant/null branch | DRAFT_NOT_APPROVED |

## Gates for a later exact amendment

Close context proof and principal/membership bootstrap; actual roles/owner/bypass; global/worker purposes and least privileges; all24 exact predicates; performance/partitions/functions; audit transaction preservation; full backup/restore; fail-closed tamper/cross-tenant tests. Seal those bytes and obtain PO acceptance before any local RLS DDL, then test only in an owned discardable cluster before a separately authorized external operation. This mandate authorizes none of that activation. No proven technical impossibility is asserted; design/operational evidence is incomplete.
