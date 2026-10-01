import { describe, expect, it } from "vitest";
import { loadConfig } from "../config.js";
import { createDatabase, sql } from "../database.js";
import { newUuidV7 } from "../uuid.js";
import { effectivePacks } from "./pack-entitlement.js";
import { activatePack, listPackAssignments, revokePack } from "./pack-contract.js";
import type { PlatformActor } from "../security/platform-authority.js";

const enabled = process.env.TCDX_PHASE5_LIFECYCLE_INTEGRATION === "true";
const rollback = Symbol("isolated-pack-rollback");

describe.skipIf(!enabled)("Phase 5+ pack temporal authority in isolated PostgreSQL", () => {
  it("requires exact explicit effective versions and rejects overlapping active contracts", async () => {
    if (process.env.DATABASE_HOST !== "127.0.0.1" || process.env.DATABASE_PORT !== "55432" ||
        process.env.TCDX_ISOLATED_REBUILD !== "true") throw new Error("ISOLATED_POSTGRES_REQUIRED");
    const database = createDatabase(loadConfig(process.env));
    const tenantId = newUuidV7();
    const actorId = newUuidV7();
    const subscriptionId = newUuidV7();
    const laterVersionId = newUuidV7();
    const futureVersionId = newUuidV7();
    const expiredVersionId = newUuidV7();
    let completed = false;
    try {
      await database.transaction().execute(async (tx) => {
        await sql`INSERT INTO iam.user_identities (user_identity_id,identity_key,display_name,lifecycle_state)
          VALUES (${actorId}::uuid,${`phase5-pack:${actorId}`},'Pack contract reviewer','active')`.execute(tx);
        await sql`INSERT INTO platform.tenants (tenant_id,tenant_code,legal_name,display_name,default_timezone,created_by_user_identity_id,updated_by_user_identity_id)
          VALUES (${tenantId}::uuid,${`PACK-${tenantId.slice(0, 12)}`},'Pack test tenant','Pack test tenant','UTC',${actorId}::uuid,${actorId}::uuid)`.execute(tx);
        const plan = await sql<{ plan_version_id: string }>`SELECT plan_version_id FROM platform.plan_versions WHERE lifecycle_state='published' LIMIT 1`.execute(tx);
        const original = await sql<{ regulatory_pack_version_id: string; regulatory_pack_id: string }>`
          SELECT regulatory_pack_version_id,regulatory_pack_id FROM regulatory.regulatory_pack_versions
           WHERE (effective_from IS NULL OR effective_from<=transaction_timestamp())
             AND (effective_to IS NULL OR effective_to>transaction_timestamp()) LIMIT 1`.execute(tx);
        if (!plan.rows[0] || !original.rows[0]) throw new Error("PUBLISHED_PLAN_AND_IMPORTED_CATALOG_REQUIRED");
        const firstId = original.rows[0].regulatory_pack_version_id;
        await sql`UPDATE regulatory.regulatory_packs SET lifecycle_state='published' WHERE regulatory_pack_id=${original.rows[0].regulatory_pack_id}::uuid`.execute(tx);
        await sql`UPDATE regulatory.regulatory_pack_versions SET lifecycle_state='published' WHERE regulatory_pack_version_id=${firstId}::uuid`.execute(tx);
        for (const [id, number] of [[laterVersionId, 2], [futureVersionId, 3], [expiredVersionId, 4]] as const) {
          await sql`INSERT INTO regulatory.regulatory_pack_versions
            (regulatory_pack_version_id,regulatory_pack_id,version_number,lifecycle_state,effective_from,edition,license_classification,content_hash)
            SELECT ${id}::uuid,regulatory_pack_id,${number},'published',transaction_timestamp()-interval '1 day',
                   ${`test-edition-${number}`},license_classification,repeat('a',64)
              FROM regulatory.regulatory_pack_versions WHERE regulatory_pack_version_id=${firstId}::uuid`.execute(tx);
        }
        await sql`INSERT INTO platform.subscriptions
          (subscription_id,tenant_id,plan_version_id,subscription_code,lifecycle_state,starts_at,created_by_user_identity_id,updated_by_user_identity_id)
          VALUES (${subscriptionId}::uuid,${tenantId}::uuid,${plan.rows[0].plan_version_id}::uuid,
            ${`PACK-${subscriptionId.slice(0, 12)}`},'active',transaction_timestamp()-interval '1 day',${actorId}::uuid,${actorId}::uuid)`.execute(tx);
        const insert = async (id: string, versionId: string, from: string, to: string | null, lifecycle: string) => sql`
          INSERT INTO platform.subscription_regulatory_packs
            (subscription_regulatory_pack_id,tenant_id,subscription_id,regulatory_pack_version_id,lifecycle_state,effective_from,effective_to,
             created_by_user_identity_id,updated_by_user_identity_id)
          VALUES (${id}::uuid,${tenantId}::uuid,${subscriptionId}::uuid,${versionId}::uuid,${lifecycle},
            ${from}::timestamptz,${to}::timestamptz,${actorId}::uuid,${actorId}::uuid)
        `.execute(tx);
        const now = Date.now();
        const platformActor: PlatformActor = {
          identity: { principalClass: "HUMAN_INTERACTIVE", principalId: actorId, tokenId: "isolated-pack-test", expiresAt: new Date(now + 60_000) },
          permissions: new Set(["platform.subscription_regulatory_pack.read", "platform.subscription_regulatory_pack.create", "platform.subscription_regulatory_pack.archive"]),
          roles: ["PLATFORM_ADMIN"]
        };
        const packGrants = await sql<{ role_code: string; permission_code: string }>`
          SELECT r.role_code,p.permission_code FROM iam.role_permissions rp
          JOIN iam.roles r ON r.role_id=rp.role_id JOIN iam.permissions p ON p.permission_id=rp.permission_id
          WHERE p.permission_code LIKE 'platform.subscription_regulatory_pack.%' AND r.tenant_id IS NULL
          ORDER BY r.role_code,p.permission_code
        `.execute(tx);
        expect(packGrants.rows).toEqual([
          { role_code: "PLATFORM_ADMIN", permission_code: "platform.subscription_regulatory_pack.archive" },
          { role_code: "PLATFORM_ADMIN", permission_code: "platform.subscription_regulatory_pack.create" },
          { role_code: "PLATFORM_ADMIN", permission_code: "platform.subscription_regulatory_pack.read" },
          { role_code: "TENANT_ADMIN", permission_code: "platform.subscription_regulatory_pack.read" }
        ]);
        const subjectGrants = await sql<{ role_code: string }>`
          SELECT r.role_code FROM iam.role_permissions rp JOIN iam.roles r ON r.role_id=rp.role_id
          JOIN iam.permissions p ON p.permission_id=rp.permission_id
          WHERE p.permission_code='organization.subject.read' AND r.tenant_id IS NULL ORDER BY r.role_code
        `.execute(tx);
        expect(subjectGrants.rows.map((row) => row.role_code)).toEqual([
          "AI_GOVERNANCE_MANAGER", "CISO_SECURITY_MANAGER", "COMPLIANCE_MANAGER", "CONTROL_OWNER",
          "GRC_MANAGER", "PRIVACY_MANAGER", "PROCESS_OWNER", "QUALITY_MANAGER", "TENANT_ADMIN"
        ]);
        const past = new Date(now - 86_400_000).toISOString();
        const earlier = new Date(now - 172_800_000).toISOString();
        const future = new Date(now + 86_400_000).toISOString();
        await insert(newUuidV7(), firstId, past, null, "active");
        expect((await effectivePacks(tx, tenantId)).map((item) => item.regulatory_pack_version_id)).toEqual([firstId]);
        expect((await listPackAssignments(tx, subscriptionId, tenantId)).items).toHaveLength(1);
        await expect(listPackAssignments(tx, subscriptionId, newUuidV7())).rejects.toMatchObject({ code: "TCDX.RESOURCE.NOT_FOUND" });
        await insert(newUuidV7(), futureVersionId, future, null, "active");
        await insert(newUuidV7(), expiredVersionId, earlier, past, "revoked");
        expect((await effectivePacks(tx, tenantId)).map((item) => item.regulatory_pack_version_id)).toEqual([firstId]);
        await expect(activatePack(tx, { ...platformActor, permissions: new Set() }, {
          subscriptionId, body: { regulatory_pack_version_id: laterVersionId, effective_from: past },
          key: newUuidV7(), correlationId: newUuidV7()
        })).rejects.toMatchObject({ code: "TCDX.AUTHORIZATION.DENIED" });
        const activationKey = newUuidV7();
        const activationBody = { regulatory_pack_version_id: laterVersionId, effective_from: past };
        const activated = await activatePack(tx, platformActor, { subscriptionId, body: activationBody, key: activationKey, correlationId: newUuidV7() });
        expect(activated.replayed).toBe(false);
        const activationReplay = await activatePack(tx, platformActor, { subscriptionId, body: activationBody, key: activationKey, correlationId: newUuidV7() });
        expect(activationReplay.replayed).toBe(true);
        expect(new Set((await effectivePacks(tx, tenantId)).map((item) => item.regulatory_pack_version_id)))
          .toEqual(new Set([firstId, laterVersionId]));
        await sql`SAVEPOINT duplicate_pack_assignment`.execute(tx);
        try {
          await insert(newUuidV7(), firstId, new Date(now - 82_800_000).toISOString(), null, "active");
          throw new Error("OVERLAPPING_ASSIGNMENT_WAS_ACCEPTED");
        } catch (error) {
          expect((error as { code?: string }).code).toBe("23P01");
        } finally { await sql`ROLLBACK TO SAVEPOINT duplicate_pack_assignment`.execute(tx); }
        await expect(revokePack(tx, { ...platformActor, permissions: new Set() }, {
          assignmentId: activated.result.subscription_regulatory_pack_id, body: { reason: "Contract ended" },
          expectedVersion: 1, key: newUuidV7(), correlationId: newUuidV7()
        })).rejects.toMatchObject({ code: "TCDX.AUTHORIZATION.DENIED" });
        const revoked = await revokePack(tx, platformActor, {
          assignmentId: activated.result.subscription_regulatory_pack_id, body: { reason: "Contract ended" },
          expectedVersion: 1, key: newUuidV7(), correlationId: newUuidV7()
        });
        expect(revoked.result).toMatchObject({ lifecycle_state: "revoked", row_version: 2 });
        expect((await effectivePacks(tx, tenantId)).map((item) => item.regulatory_pack_version_id)).toEqual([firstId]);
        const preserved = await sql<{ count: number }>`
          SELECT count(*)::integer AS count FROM platform.subscription_regulatory_packs
           WHERE subscription_regulatory_pack_id=${activated.result.subscription_regulatory_pack_id}::uuid AND effective_to IS NOT NULL
        `.execute(tx);
        expect(preserved.rows[0]?.count).toBe(1);
        completed = true;
        throw rollback;
      });
    } catch (error) { if (error !== rollback) throw error; }
    finally { await database.destroy(); }
    expect(completed).toBe(true);
  });
});
