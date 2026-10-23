import {sql,type Transaction} from 'kysely';
import type {FoundationDatabase} from '../database.js';
import {newUuidV7} from '../uuid.js';
import {persistAuditEvent} from '../persistence/foundation-records.js';
import {hashCanonical} from '../regulatory/hash.js';
import {bindingFail,RUNTIME_BINDING_CONTRACT as c} from '../regulatory/runtime-binding-core.js';
import data from '../regulatory/runtime-bindings-contract.generated.json' with {type:'json'};

/** Explicit canonical publisher transaction only. No assignments or startup activation. */
export async function publishRuntimeBindingData(tx:Transaction<FoundationDatabase>,principalId:string,correlationId:string,tenantIds:readonly string[]=[]){
 const principal=(await sql`SELECT service_principal_id FROM iam.service_principals WHERE service_principal_id=${principalId}::uuid AND ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL AND lifecycle_state='active' FOR SHARE`.execute(tx)).rows;
 if(principal.length!==1||!(await sql`SELECT migration_id FROM platform.schema_migrations WHERE migration_id=${data.physicalMigration.id} AND filename=${data.physicalMigration.filename} AND content_sha256=${data.physicalMigration.sha256} AND outcome='applied'`.execute(tx)).rows.length)bindingFail(409,'Runtime bindings physical predecessor is not adopted');
 await sql`SELECT pg_advisory_xact_lock(hashtextextended('tcdx-grc:runtime-binding-iam-publication',0))`.execute(tx);
 let created=0,audited=0;
 async function auditOnce(kind:string,id:string,tenantId:string|null,payload:Record<string,unknown>){
  const after={...payload,publication_receipt_sha256:data.receipt_sha256};
  const previous=(await sql<{after_payload:Record<string,unknown>;outcome:string}>`SELECT after_payload,outcome FROM ops_audit.audit_events WHERE command_code='runtimeBindingOperationalPublication' AND aggregate_type=${kind} AND aggregate_id=${id}::uuid AND tenant_id IS NOT DISTINCT FROM ${tenantId}::uuid AND after_payload->>'publication_receipt_sha256'=${data.receipt_sha256}`.execute(tx)).rows;
  if(previous.length){if(previous.length!==1||previous[0]!.outcome!=='succeeded'||hashCanonical(previous[0]!.after_payload)!==hashCanonical(after))bindingFail(409,'Runtime binding IAM audit drift');return;}
  await persistAuditEvent(tx,{auditEventId:newUuidV7(),ownershipClass:tenantId?'TENANT_OWNED':'PLATFORM_CONTROL',tenantId,actor:{servicePrincipalId:principalId},correlationId,commandCode:'runtimeBindingOperationalPublication',aggregateType:kind,aggregateId:id,eventCode:kind==='Permission'?'audit.iam.permission.publish.v1':'audit.iam.role_permission.publish.v1',outcome:'succeeded',classification:'protected_metadata',after});audited++;
 }
 for(const spec of c.permissions){
  const [domain,resource,action]=spec.code.split('.');
  let permission=(await sql<{permission_id:string;domain_code:string;resource_code:string;action_code:string;lifecycle_state:string}>`SELECT * FROM iam.permissions WHERE permission_code=${spec.code} FOR UPDATE`.execute(tx)).rows[0];
  if(permission){if(permission.domain_code!==domain||permission.resource_code!==resource||permission.action_code!==action||permission.lifecycle_state!=='published')bindingFail(409,'Permission catalog conflict');}
  else{const id=newUuidV7();await sql`INSERT INTO iam.permissions(permission_id,created_by_service_principal_id,updated_by_service_principal_id,permission_code,domain_code,resource_code,action_code,lifecycle_state) VALUES(${id}::uuid,${principalId}::uuid,${principalId}::uuid,${spec.code},${domain!},${resource!},${action!},'published')`.execute(tx);permission={permission_id:id,domain_code:domain!,resource_code:resource!,action_code:action!,lifecycle_state:'published'};created++;}
  await auditOnce('Permission',permission.permission_id,null,{permission_code:spec.code,scope:spec.scope});
  const contexts=spec.scope==='tenant_or_owned_object'?[null,...new Set(tenantIds)]:[null];
  for(const tenantId of contexts)for(const code of spec.roles){
   const roles=(await sql<{role_id:string}>`SELECT role_id FROM iam.roles WHERE role_code=${code} AND tenant_id IS NOT DISTINCT FROM ${tenantId}::uuid AND ownership_class=${tenantId?'TENANT_OWNED':'PLATFORM_CONTROL'} AND is_baseline AND lifecycle_state='published' FOR SHARE`.execute(tx)).rows;if(roles.length!==1)bindingFail(409,'Canonical role catalog conflict');
   const roleId=roles[0]!.role_id,existing=(await sql<{role_permission_id:string;ownership_class:string;tenant_id:string|null}>`SELECT * FROM iam.role_permissions WHERE role_id=${roleId}::uuid AND permission_id=${permission.permission_id}::uuid FOR UPDATE`.execute(tx)).rows;if(existing.length>1)bindingFail(409);
   let id=existing[0]?.role_permission_id;if(id){if(existing[0]!.tenant_id!==tenantId||existing[0]!.ownership_class!==(tenantId?'TENANT_OWNED':'PLATFORM_CONTROL'))bindingFail(409);}
   else{id=newUuidV7();await sql`INSERT INTO iam.role_permissions(role_permission_id,created_by_service_principal_id,ownership_class,tenant_id,role_id,permission_id) VALUES(${id}::uuid,${principalId}::uuid,${tenantId?'TENANT_OWNED':'PLATFORM_CONTROL'},${tenantId}::uuid,${roleId}::uuid,${permission.permission_id}::uuid)`.execute(tx);created++;}
   await auditOnce('RolePermission',id,tenantId,{role_code:code,permission_code:spec.code,scope:spec.scope,role_id:roleId});
  }
 }
 return {created,audited,personal_assignments:0};
}
