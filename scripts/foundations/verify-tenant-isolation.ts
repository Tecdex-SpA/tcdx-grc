import { assertCompatibleReference, ConcealedReferenceError } from "../../apps/backend/src/security/ownership.ts";
import { newUuidV7 } from "../../apps/backend/src/uuid.ts";
import { createClient } from "./db.ts";

const client = createClient();
await client.connect();
const results: Record<string, "PASS" | "BLOCKED"> = {};
const failures: string[] = [];
const id = () => newUuidV7();

async function expectDatabaseRejection(name: string, sql: string, params: unknown[], expectedCodes = ["23503", "23514", "23505"]): Promise<void> {
  await client.query(`SAVEPOINT ${name}`);
  try {
    await client.query(sql, params);
    results[name] = "BLOCKED";
    failures.push(`${name}: write unexpectedly succeeded`);
  } catch (error) {
    const code = (error as { code?: string }).code ?? "unknown";
    if (!expectedCodes.includes(code)) failures.push(`${name}: unexpected SQLSTATE ${code}`);
    results[name] = expectedCodes.includes(code) ? "PASS" : "BLOCKED";
  } finally {
    await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
    await client.query(`RELEASE SAVEPOINT ${name}`);
  }
}

try {
  await client.query("BEGIN");
  const tenantA = id();
  const tenantB = id();
  const userA = id();
  const userB = id();
  const membershipA = id();
  const membershipB = id();
  const roleA = id();
  const roleB = id();
  const subjectB = id();
  const configurationDefinition = id();

  await client.query("INSERT INTO platform.tenants (tenant_id,tenant_code,legal_name,display_name,default_timezone,lifecycle_state,data_classification) VALUES ($1,'PHASE3_A','Phase 3 A','Phase 3 A','UTC','active','internal'),($2,'PHASE3_B','Phase 3 B','Phase 3 B','UTC','active','internal')", [tenantA, tenantB]);
  await client.query("INSERT INTO iam.user_identities (user_identity_id,identity_key,display_name,lifecycle_state) VALUES ($1,'phase3-user-a','A','active'),($2,'phase3-user-b','B','active')", [userA, userB]);
  await client.query("INSERT INTO iam.tenant_memberships (tenant_membership_id,tenant_id,user_identity_id,membership_state,joined_at) VALUES ($1,$2,$3,'active',CURRENT_TIMESTAMP),($4,$5,$6,'active',CURRENT_TIMESTAMP)", [membershipA, tenantA, userA, membershipB, tenantB, userB]);
  await client.query("INSERT INTO iam.roles (role_id,ownership_class,tenant_id,role_code,name,is_baseline,lifecycle_state) VALUES ($1,'TENANT_OWNED',$2,'CUSTOM_A','Custom A',false,'published'),($3,'TENANT_OWNED',$4,'CUSTOM_B','Custom B',false,'published')", [roleA, tenantA, roleB, tenantB]);
  await client.query("INSERT INTO org.subjects (subject_id,tenant_id,subject_type,canonical_key,display_name,lifecycle_state,effective_from,metadata) VALUES ($1,$2,'process','subject-b','Subject B','active',CURRENT_TIMESTAMP,'{}'::jsonb)", [subjectB, tenantB]);
  await client.query("INSERT INTO config.configuration_definitions (configuration_definition_id,ownership_class,tenant_id,configuration_code,version_number,value_type,tenant_overridable,object_overridable,owner_domain,lifecycle_state,effective_from,effective_to,published_at) VALUES ($1,'PLATFORM_CONTROL',NULL,'PHASE3_TEST',1,'text',true,true,'platform','published',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP + interval '1 year',CURRENT_TIMESTAMP)", [configurationDefinition]);

  await expectDatabaseRejection(
    "cross_tenant_fk",
    "INSERT INTO iam.membership_roles (membership_role_id,tenant_id,tenant_membership_id,role_id,scope_kind,valid_from) VALUES ($1,$2,$3,$4,'tenant',CURRENT_TIMESTAMP)",
    [id(), tenantA, membershipB, roleA],
    ["23503"]
  );
  await expectDatabaseRejection(
    "cross_tenant_object_reference",
    "INSERT INTO org.subjects (subject_id,tenant_id,subject_type,canonical_key,display_name,owner_subject_id,lifecycle_state,effective_from,metadata) VALUES ($1,$2,'process','subject-a','Subject A',$3,'active',CURRENT_TIMESTAMP,'{}'::jsonb)",
    [id(), tenantA, subjectB],
    ["23503"]
  );
  await expectDatabaseRejection(
    "configuration_override_cross_tenant_scope",
    "INSERT INTO config.configuration_overrides (configuration_override_id,ownership_class,tenant_id,configuration_definition_id,override_version,scope_level,scope_subject_id,lifecycle_state,effective_from,effective_to,text_value) VALUES ($1,'TENANT_OWNED',$2,$3,1,'scoped_object',$4,'published',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP + interval '1 year','value')",
    [id(), tenantA, configurationDefinition, subjectB],
    ["23503"]
  );

  try {
    assertCompatibleReference(tenantA, { ownershipClass: "TENANT_OWNED", tenantId: tenantB });
    results.role_assignment_cross_tenant_service = "BLOCKED";
    failures.push("role_assignment_cross_tenant_service: policy unexpectedly allowed foreign tenant role");
  } catch (error) {
    results.role_assignment_cross_tenant_service = error instanceof ConcealedReferenceError ? "PASS" : "BLOCKED";
  }
  try {
    assertCompatibleReference(tenantA, { ownershipClass: "TENANT_OWNED", tenantId: tenantB });
    results.configuration_definition_cross_tenant_service = "BLOCKED";
    failures.push("configuration_definition_cross_tenant_service: policy unexpectedly allowed foreign tenant definition");
  } catch (error) {
    results.configuration_definition_cross_tenant_service = error instanceof ConcealedReferenceError ? "PASS" : "BLOCKED";
  }
  assertCompatibleReference(tenantA, { ownershipClass: "PLATFORM_CONTROL", tenantId: null });
  results.global_reference_compatibility = "PASS";

  const idemSql = "INSERT INTO ops_audit.idempotency_records (idempotency_record_id,ownership_class,tenant_id,actor_user_identity_id,operation_code,idempotency_key,request_hash,result_status_code,first_seen_at) VALUES ($1,'TENANT_OWNED',$2,$3,'phase3.test','same-key',$4,'completed',CURRENT_TIMESTAMP)";
  await client.query(idemSql, [id(), tenantA, userA, "a".repeat(64)]);
  await client.query(idemSql, [id(), tenantB, userA, "a".repeat(64)]);
  results.idempotency_tenant_separation = "PASS";
  await expectDatabaseRejection("idempotency_same_tenant_duplicate", idemSql, [id(), tenantA, userA, "a".repeat(64)], ["23505"]);

  await expectDatabaseRejection(
    "audit_tenant_ownership",
    "INSERT INTO ops_audit.audit_events (audit_event_id,ownership_class,tenant_id,correlation_id,event_code,event_version,aggregate_type,aggregate_id,command_code,actor_user_identity_id,occurred_at,outcome,classification) VALUES ($1,'TENANT_OWNED',NULL,$2,'audit.phase3.v1',1,'Tenant',$3,'phase3.test',$4,CURRENT_TIMESTAMP,'success','internal')",
    [id(), id(), tenantA, userA],
    ["23514"]
  );
  await expectDatabaseRejection(
    "outbox_global_ownership",
    "INSERT INTO ops_audit.outbox_events (outbox_event_id,ownership_class,tenant_id,correlation_id,event_id,event_type,event_version,aggregate_type,aggregate_id,occurred_at,actor_user_identity_id,payload,classification) VALUES ($1,'GLOBAL_REFERENCE',$2,$3,$4,'phase3.test.v1',1,'Tenant',$5,CURRENT_TIMESTAMP,$6,'{}'::jsonb,'internal')",
    [id(), tenantA, id(), id(), tenantA, userA],
    ["23514"]
  );

  await client.query("ROLLBACK");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}

const pass = failures.length === 0 && Object.values(results).every((result) => result === "PASS");
process.stdout.write(`${JSON.stringify({ dbTenantIsolation: pass ? "PASS" : "BLOCKED", tenantIsolationGaps: failures.length, results, failures }, null, 2)}\n`);
if (!pass) process.exitCode = 1;
