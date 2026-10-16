import { generateKeyPairSync } from "node:crypto";
import { sql, type Kysely } from "kysely";
import type { FoundationDatabase } from "../database.js";
import { newUuidV7 } from "../uuid.js";
import { ApplicationTokenService } from "./application-token.js";

/** Fixtures only, requiring the task-owned disposable PostgreSQL before any writes. */
export async function commercialSubscriptionFixture(db: Kysely<FoundationDatabase>) {
  if (process.env.DATABASE_HOST !== "127.0.0.1" || process.env.DATABASE_PORT !== "55434"
    || process.env.TCDX_ISOLATED_REBUILD !== "true") throw new Error("TASK_OWNED_DISPOSABLE_POSTGRES_REQUIRED");
  const actorId = newUuidV7(), supportId = newUuidV7(), familyId = newUuidV7(), packId = newUuidV7(), packVersionId = newUuidV7();
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const tokens = await ApplicationTokenService.create({ issuer: "https://isolated.tcdx.test", audience: "tcdx-grc-api",
    privateKey: privateKey.export({ format: "pem", type: "pkcs8" }).toString(), publicKey: publicKey.export({ format: "pem", type: "spki" }).toString(),
    keyId: newUuidV7(), algorithm: "RS256", maxLifetimeSeconds: 3600, clockToleranceSeconds: 0 });
  await db.transaction().execute(async tx => {
    for (const id of [actorId, supportId]) await sql`INSERT INTO iam.user_identities (user_identity_id,identity_key,display_name,lifecycle_state)
      VALUES (${id}::uuid,${`isolated-commercial:${id}`},'Isolated commercial actor','active')`.execute(tx);
    for (const [id, code] of [[actorId, "PLATFORM_ADMIN"], [supportId, "PLATFORM_SUPPORT"]] as const) await sql`
      INSERT INTO iam.platform_role_assignments (platform_role_assignment_id,ownership_class,user_identity_id,role_id,valid_from)
      SELECT ${newUuidV7()}::uuid,'PLATFORM_CONTROL',${id}::uuid,role_id,statement_timestamp()-interval '1 second'
      FROM iam.roles WHERE role_code=${code} AND is_baseline AND ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL`.execute(tx);
    for (const action of ["update", "read"]) {
      const permissionId = newUuidV7();
      await sql`INSERT INTO iam.permissions (permission_id,permission_code,domain_code,resource_code,action_code,lifecycle_state)
        VALUES (${permissionId}::uuid,${`platform.subscription.${action}`},'platform','subscription',${action},'published')
        ON CONFLICT(permission_code) DO NOTHING`.execute(tx);
      await sql`INSERT INTO iam.role_permissions (role_permission_id,ownership_class,role_id,permission_id)
        SELECT ${newUuidV7()}::uuid,'PLATFORM_CONTROL',r.role_id,p.permission_id FROM iam.roles r CROSS JOIN iam.permissions p
        WHERE r.role_code='PLATFORM_ADMIN' AND r.is_baseline AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL
          AND p.permission_code=${`platform.subscription.${action}`} ON CONFLICT DO NOTHING`.execute(tx);
    }
    for (const [entity, command, to, policy, audit, event, profile] of [
      ["Subscription", "subscription.change_plan", "ended", "commercial.subscription.change_plan.v1", "audit.platform.subscription.change_plan.v1", "platform.subscription.plan_changed.v1", "SUBSCRIPTION_CHANGE_PLAN_V1"],
      ["SubscriptionRegulatoryPack", "subscription_regulatory_pack.transfer_close", "revoked", "commercial.pack.transfer_close.v1", "audit.platform.subscription_regulatory_pack.transfer_close.v1", "platform.subscription_regulatory_pack.transfer_closed.v1", "PARENT_AND_ASSIGNMENT_ID"]
    ] as const) {
      const edgeId = newUuidV7();
      await sql`INSERT INTO ops_audit.lifecycle_transition_definitions
        (lifecycle_transition_definition_id,entity_type,version_number,from_state,command_code,to_state,precondition_policy_ref,permission_id,sod_policy_ref,
          audit_event_code,notification_policy_ref,recalculation_policy_ref,idempotency_semantics,concurrency_semantics,system_actor_allowed,lifecycle_state,published_at)
        SELECT ${edgeId}::uuid,${entity},COALESCE((SELECT max(version_number)+1 FROM ops_audit.lifecycle_transition_definitions WHERE entity_type=${entity} AND from_state='active' AND command_code=${command}),1),
          'active',${command},${to},${policy},permission_id,'PLATFORM_ADMIN_REAL_HUMAN_NO_IMPERSONATION_NO_PRODUCT_SOD_BYPASS',${audit},'NONE_NEW','NO_HISTORICAL_RECALCULATION',${profile},
          'READ_COMMITTED_TENANT_ORDERED_LOCKS_CAS',FALSE,'published',statement_timestamp() FROM iam.permissions WHERE permission_code='platform.subscription.update'`.execute(tx);
      await sql`INSERT INTO ops_audit.lifecycle_transition_scopes (lifecycle_transition_scope_id,lifecycle_transition_definition_id,scope_kind)
        VALUES (${newUuidV7()}::uuid,${edgeId}::uuid,'platform')`.execute(tx);
      await sql`INSERT INTO ops_audit.lifecycle_transition_side_effects (lifecycle_transition_side_effect_id,lifecycle_transition_definition_id,event_code,ordinal,is_required)
        VALUES (${newUuidV7()}::uuid,${edgeId}::uuid,${event},1,TRUE)`.execute(tx);
    }
    await sql`INSERT INTO platform.commercial_families (commercial_family_id,family_code,name,source_type,published_at,publication_manifest_sha256,created_by_user_identity_id)
      VALUES (${familyId}::uuid,${`FIXTURE-${familyId}`},'Isolated family','standard',statement_timestamp(),repeat('a',64),${actorId}::uuid)`.execute(tx);
    await sql`INSERT INTO regulatory.regulatory_packs (regulatory_pack_id,pack_code,name,source_type,lifecycle_state)
      VALUES (${packId}::uuid,${`FIXTURE-${packId}`},'Isolated published pack','standard','published')`.execute(tx);
    await sql`INSERT INTO regulatory.regulatory_pack_versions (regulatory_pack_version_id,regulatory_pack_id,version_number,lifecycle_state,effective_from,published_at,edition,license_classification,content_hash,reviewed_by_user_identity_id)
      VALUES (${packVersionId}::uuid,${packId}::uuid,1,'published',statement_timestamp()-interval '1 day',statement_timestamp(),'Isolated edition','licensed',repeat('b',64),${actorId}::uuid)`.execute(tx);
    await sql`INSERT INTO platform.regulatory_pack_commercial_family_links (regulatory_pack_commercial_family_link_id,regulatory_pack_id,commercial_family_id,source_type,created_by_user_identity_id)
      VALUES (${newUuidV7()}::uuid,${packId}::uuid,${familyId}::uuid,'standard',${actorId}::uuid)`.execute(tx);
    await sql`INSERT INTO regulatory.regulatory_coverage_manifests (regulatory_coverage_manifest_id,regulatory_pack_version_id,normative_units_expected,normative_units_imported,normative_units_reviewed,
      requirements_expected,requirements_imported,requirements_reviewed,reference_controls_expected,reference_controls_imported,reference_controls_reviewed,valid_parent_links,reviewed_editorial_mappings,reviewed_compliance_mappings,coverage_percent,approved_by_user_identity_id,approved_at)
      VALUES (${newUuidV7()}::uuid,${packVersionId}::uuid,1,1,1,1,1,1,0,0,0,1,0,0,100,${actorId}::uuid,statement_timestamp())`.execute(tx);
  });
  const plan = async (limit = 10, includeFamily = true, published = true) => {
    const id = newUuidV7();
    await db.transaction().execute(async tx => {
      const source = (await sql<{ plan_id: string; plan_version_id: string }>`SELECT pv.plan_id,pv.plan_version_id FROM platform.plan_versions pv
        JOIN platform.plans p USING(plan_id) WHERE p.plan_code='GRC' AND pv.lifecycle_state='published' ORDER BY pv.version_number LIMIT 1`.execute(tx)).rows[0]!;
      await sql`INSERT INTO platform.plan_versions (plan_version_id,plan_id,version_number,lifecycle_state,effective_from,display_name,created_by_user_identity_id)
        SELECT ${id}::uuid,${source.plan_id}::uuid,max(version_number)+1,'draft',statement_timestamp()-interval '1 day',${`Isolated GRC ${id}`},${actorId}::uuid
        FROM platform.plan_versions WHERE plan_id=${source.plan_id}::uuid`.execute(tx);
      const rights = (await sql<{ capability_id: string; is_enabled: boolean }>`SELECT capability_id,is_enabled FROM platform.entitlements WHERE plan_version_id=${source.plan_version_id}::uuid`.execute(tx)).rows;
      for (const right of rights) await sql`INSERT INTO platform.entitlements (entitlement_id,plan_version_id,capability_id,is_enabled,created_by_user_identity_id)
        VALUES (${newUuidV7()}::uuid,${id}::uuid,${right.capability_id}::uuid,${right.is_enabled},${actorId}::uuid)`.execute(tx);
      if (includeFamily) {
        await sql`INSERT INTO platform.plan_version_commercial_family_links (plan_version_commercial_family_link_id,plan_version_id,commercial_family_id,created_by_user_identity_id)
          VALUES (${newUuidV7()}::uuid,${id}::uuid,${familyId}::uuid,${actorId}::uuid)`.execute(tx);
        for (const family of [null, familyId]) await sql`INSERT INTO platform.usage_limits (usage_limit_id,plan_version_id,limit_code,limit_value,unit,effective_from,commercial_family_id,created_by_user_identity_id)
          VALUES (${newUuidV7()}::uuid,${id}::uuid,'regulatory_pack_count',${limit},'pack',(SELECT effective_from FROM platform.plan_versions WHERE plan_version_id=${id}::uuid),${family}::uuid,${actorId}::uuid)`.execute(tx);
      }
      if (published) await sql`UPDATE platform.plan_versions SET lifecycle_state='published',published_at=statement_timestamp() WHERE plan_version_id=${id}::uuid`.execute(tx);
    });
    return id;
  };
  const company = async (withPack = false, scheduledEnd = true) => {
    const tenantId = newUuidV7(), subscriptionId = newUuidV7();
    const pv = await plan();
    await db.transaction().execute(async tx => {
      await sql`INSERT INTO platform.tenants (tenant_id,tenant_code,legal_name,display_name,default_timezone,lifecycle_state,data_classification)
        VALUES (${tenantId}::uuid,${`FIXTURE-${tenantId}`},'Isolated company',${`Isolated company ${tenantId}`},'UTC','active','confidential')`.execute(tx);
      await sql`INSERT INTO platform.subscriptions (subscription_id,tenant_id,plan_version_id,subscription_code,lifecycle_state,starts_at,ends_at)
        VALUES (${subscriptionId}::uuid,${tenantId}::uuid,${pv}::uuid,${`INITIAL-${subscriptionId}`},'active',statement_timestamp()-interval '1 hour',
          ${scheduledEnd ? sql`statement_timestamp()+interval '30 days'` : sql`NULL`})`.execute(tx);
      if (withPack) await sql`INSERT INTO platform.subscription_regulatory_packs (subscription_regulatory_pack_id,tenant_id,subscription_id,regulatory_pack_id,regulatory_pack_version_id,lifecycle_state,effective_from,effective_to,created_by_user_identity_id,updated_by_user_identity_id)
        VALUES (${newUuidV7()}::uuid,${tenantId}::uuid,${subscriptionId}::uuid,${packId}::uuid,${packVersionId}::uuid,'active',statement_timestamp()-interval '30 minutes',statement_timestamp()+interval '2 days',${actorId}::uuid,${actorId}::uuid)`.execute(tx);
    });
    return { tenantId, subscriptionId, planVersionId: pv };
  };
  const adminToken = await tokens.issue(actorId, newUuidV7()), supportToken = await tokens.issue(supportId, newUuidV7());
  return { actorId, supportId, familyId, packId, packVersionId, tokens, adminToken, supportToken, plan, company };
}
