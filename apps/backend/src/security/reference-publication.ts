import {sql,type Kysely,type Transaction} from "kysely";
import {ROLE_PERMISSION_PUBLICATION,RBAC_RESOLUTION_R3} from "@tcdx-grc/contracts";
import type {FoundationDatabase} from "../database.js";
import {FoundationError} from "../errors.js";
type Ex=Kysely<FoundationDatabase>|Transaction<FoundationDatabase>;
const p=ROLE_PERMISSION_PUBLICATION;
/** Candidate rows alone never make an auditable permission publication effective. */
export async function requireReferencePublication(ex:Ex,forMaterialization=false):Promise<string> {
 const result=await sql<{publication_count:number;service_principal_id:string|null}>`SELECT count(*)::int AS publication_count,min(a.actor_service_principal_id::text) AS service_principal_id
 FROM iam.role_permissions rp JOIN iam.roles r USING(role_id) JOIN iam.permissions perm USING(permission_id)
 JOIN ops_audit.audit_events a ON a.aggregate_type='RolePermission' AND a.aggregate_id=rp.role_permission_id AND a.event_code=${p.event_code} AND a.command_code=${p.command_code}
 JOIN iam.service_principals sp ON sp.service_principal_id=a.actor_service_principal_id AND sp.ownership_class='PLATFORM_CONTROL' AND sp.tenant_id IS NULL
 WHERE rp.tenant_id IS NULL AND rp.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL AND r.is_baseline AND r.lifecycle_state='published'
 AND EXISTS(SELECT 1 FROM jsonb_to_recordset(${JSON.stringify(p.pairs.map(pair=>({role_code:pair.role_code,permission:pair.permission})))}::jsonb) AS approved(role_code text,permission text) WHERE approved.role_code=r.role_code AND approved.permission=perm.permission_code)
 AND perm.permission_code=ANY(${[...p.permission_codes]}::text[]) AND a.tenant_id IS NULL AND a.ownership_class='PLATFORM_CONTROL' AND a.outcome='success'
 AND a.after_payload->>'manifest_sha256'=${p.manifest_sha256} AND a.after_payload->>'receipt_sha256'=${p.receipt_sha256}
 AND a.after_payload->>'source_migration_sha256'=${p.source_migration_sha256} AND a.after_payload->>'present'='true'
 AND a.after_payload->>'permission_code'=perm.permission_code AND a.after_payload->>'role_id'=rp.role_id::text
 AND (${forMaterialization}::boolean=false OR sp.lifecycle_state='active')
 AND EXISTS(SELECT 1 FROM platform.schema_migrations sm WHERE sm.migration_id=${p.source_migration_id} AND sm.content_sha256=${p.source_migration_sha256} AND sm.outcome='applied')`.execute(ex);
 const row=result.rows[0];if(row?.publication_count!==p.pairs.length||!row.service_principal_id)throw new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE","Reference publication unavailable",503,true);
 return row.service_principal_id;
}

export async function requireReferenceGrantPublication(ex:Ex,tenantId:string,membershipId:string,permission:string):Promise<void> {
 const result=await sql<{published:boolean}>`SELECT EXISTS(SELECT 1 FROM iam.membership_roles mr JOIN iam.roles r ON r.role_id=mr.role_id AND r.tenant_id=mr.tenant_id JOIN iam.role_permissions rp ON rp.role_id=r.role_id AND rp.tenant_id=r.tenant_id JOIN iam.permissions perm ON perm.permission_id=rp.permission_id JOIN ops_audit.audit_events a ON a.aggregate_id=rp.role_permission_id AND a.aggregate_type='RolePermission' AND a.tenant_id=rp.tenant_id AND a.ownership_class=rp.ownership_class AND a.event_code=${p.event_code} AND a.command_code=${p.command_code} JOIN iam.service_principals sp ON sp.service_principal_id=a.actor_service_principal_id AND sp.ownership_class='PLATFORM_CONTROL' AND sp.tenant_id IS NULL WHERE mr.tenant_id=${tenantId}::uuid AND mr.tenant_membership_id=${membershipId}::uuid AND mr.valid_from<=clock_timestamp() AND (mr.valid_to IS NULL OR mr.valid_to>clock_timestamp()) AND perm.permission_code=${permission} AND r.is_baseline AND EXISTS(SELECT 1 FROM jsonb_to_recordset(${JSON.stringify(p.pairs.map(pair=>({role_code:pair.role_code,permission:pair.permission})))}::jsonb) AS approved(role_code text,permission text) WHERE approved.role_code=r.role_code AND approved.permission=perm.permission_code) AND r.lifecycle_state='published' AND a.outcome='success' AND a.after_payload->>'present'='true' AND a.after_payload->>'manifest_sha256'=${p.manifest_sha256} AND a.after_payload->>'receipt_sha256'=${p.receipt_sha256} AND a.after_payload->>'source_migration_sha256'=${p.source_migration_sha256} AND a.after_payload->>'permission_code'=perm.permission_code AND a.after_payload->>'role_id'=rp.role_id::text) AS published`.execute(ex);
 if(result.rows[0]?.published!==true)throw new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE","Reference grant publication unavailable",503,true);
}

/** R3 is separate from the 44 reference grants; it never expands the role catalogue. */
export async function requireRbacResolutionR3(ex:Ex,forMaterialization=false):Promise<string> {
 const p=RBAC_RESOLUTION_R3;
 const result=await sql<{publication_count:number;service_principal_id:string|null}>`SELECT count(*)::int AS publication_count,min(a.actor_service_principal_id::text) AS service_principal_id
 FROM iam.role_permissions rp JOIN iam.roles r USING(role_id) JOIN iam.permissions perm USING(permission_id)
 JOIN ops_audit.audit_events a ON a.aggregate_type='RolePermission' AND a.aggregate_id=rp.role_permission_id AND a.event_code=${p.event_code} AND a.command_code=${p.command_code}
 JOIN iam.service_principals sp ON sp.service_principal_id=a.actor_service_principal_id AND sp.ownership_class='PLATFORM_CONTROL' AND sp.tenant_id IS NULL
 WHERE rp.tenant_id IS NULL AND rp.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL AND r.is_baseline AND r.lifecycle_state='published'
 AND r.role_code=ANY(${[...p.reader_roles]}::text[]) AND perm.permission_code=${p.permission_code}
 AND a.tenant_id IS NULL AND a.ownership_class='PLATFORM_CONTROL' AND a.outcome='success'
 AND a.after_payload->>'manifest_sha256'=${p.manifest_sha256} AND a.after_payload->>'receipt_sha256'=${p.receipt_sha256}
 AND a.after_payload->>'source_migration_sha256'=${p.source_migration_sha256} AND a.after_payload->>'present'='true'
 AND a.after_payload->>'role_id'=rp.role_id::text AND a.after_payload->>'permission_id'=rp.permission_id::text
 AND (${forMaterialization}::boolean=false OR sp.lifecycle_state='active')
 AND EXISTS(SELECT 1 FROM platform.schema_migrations sm WHERE sm.migration_id=${p.source_migration_id} AND sm.content_sha256=${p.source_migration_sha256} AND sm.outcome='applied')
 AND NOT EXISTS(SELECT 1 FROM iam.role_permissions d JOIN iam.roles dr USING(role_id) JOIN iam.permissions dp USING(permission_id) WHERE dr.is_baseline AND dr.role_code=${p.revoked_role} AND dp.permission_code=${p.revoked_permission})
 AND EXISTS(SELECT 1 FROM ops_audit.audit_events d JOIN iam.roles dr ON dr.role_id::text=d.after_payload->>'role_id' WHERE d.command_code=${p.command_code} AND d.event_code=${p.event_code} AND d.aggregate_type='RolePermission' AND d.tenant_id IS NULL AND d.ownership_class='PLATFORM_CONTROL' AND d.outcome='success' AND d.before_payload->>'present'='true' AND d.after_payload->>'present'='false' AND d.after_payload->>'manifest_sha256'=${p.manifest_sha256} AND d.after_payload->>'receipt_sha256'=${p.receipt_sha256} AND d.after_payload->>'source_migration_sha256'=${p.source_migration_sha256} AND d.after_payload->>'permission_code'=${p.revoked_permission} AND d.before_payload ? 'row_snapshot' AND d.actor_service_principal_id IS NOT NULL AND d.actor_user_identity_id IS NULL AND dr.is_baseline AND dr.tenant_id IS NULL AND dr.role_code=${p.revoked_role})`.execute(ex);
 const row=result.rows[0];if(row?.publication_count!==p.reader_roles.length||!row.service_principal_id)throw new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE","R3 publication unavailable",503,true);
 return row.service_principal_id;
}
