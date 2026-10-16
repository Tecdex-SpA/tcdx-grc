import { createHash } from "node:crypto";
import { lstat, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { connect } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, sql } from "../database.js";
import { loadConfig } from "../config.js";
import { newUuidV7 } from "../uuid.js";
import { commercialSubscriptionFixture } from "./commercial-subscription-fixture.js";
import { commercialCatalogPublication, validateCommercialPublicationManifest } from "./commercial-catalog-publication.js";
import { resolvePlatformActor } from "./platform-authority.js";
import { startCommercialCatalogOperator } from "./commercial-catalog-operator.js";

describe.skipIf(process.env.TCDX_SECURITY_INTEGRATION !== "true")("commercialCatalogPublication on isolated PostgreSQL", () => {
  let db: ReturnType<typeof createDatabase>;
  let fixture: Awaited<ReturnType<typeof commercialSubscriptionFixture>>;
  const hash = (value: Uint8Array) => createHash("sha256").update(value).digest("hex");
  const timestamp = () => new Date().toISOString().replace(/Z$/, "000Z");
  async function input() {
    const plan = (await sql<{ plan_id: string; plan_version_id: string; next_version: string }>`SELECT pv.plan_id,pv.plan_version_id,
      (SELECT max(version_number)+1 FROM platform.plan_versions WHERE plan_id=pv.plan_id)::text AS next_version
      FROM platform.plan_versions pv JOIN platform.plans p USING(plan_id)
      WHERE p.plan_code='GRC' AND pv.version_number=1`.execute(db)).rows[0]!;
    const familyId = newUuidV7(), versionId = newUuidV7(), at = timestamp();
    const rights = (await sql<{ capability_id: string; is_enabled: boolean }>`SELECT capability_id,is_enabled FROM platform.entitlements
      WHERE plan_version_id=${plan.plan_version_id}::uuid ORDER BY capability_id`.execute(db)).rows;
    const record = Buffer.from("isolated approved catalog values", "utf8");
    const manifest = {
      profile: "COMMERCIAL_CATALOG_PUBLICATION_V1", decision_record_ref: "isolated approved record",
      decision_record_sha256: hash(record),
      families: [{ commercial_family_id: familyId, family_code: `ISOLATED-${familyId}`, name: "Isolated family", source_type: "standard" }],
      root_links: [],
      plan_versions: [{ plan_version_id: versionId, plan_id: plan.plan_id, version_number: plan.next_version, display_name: "Isolated GRC successor",
        commercial_terms_ref: null, effective_from: at, effective_to: null,
        family_links: [{ plan_version_commercial_family_link_id: newUuidV7(), commercial_family_id: familyId }],
        usage_limits: [null, familyId].map(commercial_family_id => ({ usage_limit_id: newUuidV7(), commercial_family_id,
          limit_code: "regulatory_pack_count", limit_value: "2", unit: "pack", effective_from: at, effective_to: null })),
        entitlements: rights.map(right => ({ entitlement_id: newUuidV7(), ...right })) }]
    };
    const manifestBytes = Buffer.from(JSON.stringify(manifest));
    const approvalReceiptBytes = Buffer.from(JSON.stringify({
      decision: "APPROVED_EXACT_MANIFEST_BYTES_SUBJECT_TO_OPERATIONAL_GATES", authorizer: "Isolated test approver",
      source: "Isolated test decision", manifest_ref: "isolated manifest", manifest_sha256: hash(manifestBytes),
      decision_record_sha256: hash(record)
    }));
    return { manifest, manifestBytes, decisionRecordBytes: record, approvalReceiptBytes,
      idempotencyKey: newUuidV7(), correlationId: newUuidV7(), familyId, versionId, rightsCount: rights.length };
  }
  beforeAll(async () => {
    db = createDatabase(loadConfig(process.env));
    fixture = await commercialSubscriptionFixture(db);
    await sql`INSERT INTO iam.permissions (permission_id,permission_code,domain_code,resource_code,action_code,lifecycle_state)
      VALUES (${newUuidV7()}::uuid,'platform.commercial_catalog.publish','platform','commercial_catalog','publish','published')
      ON CONFLICT(permission_code) DO NOTHING`.execute(db);
    await sql`INSERT INTO iam.role_permissions (role_permission_id,ownership_class,role_id,permission_id)
      SELECT ${newUuidV7()}::uuid,'PLATFORM_CONTROL',r.role_id,p.permission_id FROM iam.roles r CROSS JOIN iam.permissions p
      WHERE r.role_code='PLATFORM_ADMIN' AND r.is_baseline AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL
        AND p.permission_code='platform.commercial_catalog.publish' ON CONFLICT DO NOTHING`.execute(db);
    const edgeId = newUuidV7();
    await sql`INSERT INTO ops_audit.lifecycle_transition_definitions
      (lifecycle_transition_definition_id,entity_type,version_number,from_state,command_code,to_state,
        precondition_policy_ref,permission_id,sod_policy_ref,audit_event_code,notification_policy_ref,
        recalculation_policy_ref,idempotency_semantics,concurrency_semantics,system_actor_allowed,lifecycle_state,published_at)
      SELECT ${edgeId}::uuid,'PlanVersion',COALESCE((SELECT max(version_number)+1 FROM ops_audit.lifecycle_transition_definitions
        WHERE entity_type='PlanVersion' AND from_state='draft' AND command_code='commercial_catalog.publish'),1),
        'draft','commercial_catalog.publish','published','commercial.catalog.publish.v1',permission_id,
        'PLATFORM_ADMIN_REAL_HUMAN_NO_IMPERSONATION_NO_PRODUCT_SOD_BYPASS','audit.platform.plan_version.publish.v1',
        'NONE_NEW','NO_HISTORICAL_RECALCULATION','PUBLICATION_MANIFEST_SHA256','READ_COMMITTED_ORDERED_CATALOG_LOCKS',
        FALSE,'published',statement_timestamp() FROM iam.permissions
      WHERE permission_code='platform.commercial_catalog.publish'`.execute(db);
    await sql`INSERT INTO ops_audit.lifecycle_transition_scopes
      (lifecycle_transition_scope_id,lifecycle_transition_definition_id,scope_kind)
      VALUES (${newUuidV7()}::uuid,${edgeId}::uuid,'platform')`.execute(db);
    await sql`INSERT INTO ops_audit.lifecycle_transition_side_effects
      (lifecycle_transition_side_effect_id,lifecycle_transition_definition_id,event_code,ordinal,is_required)
      VALUES (${newUuidV7()}::uuid,${edgeId}::uuid,'platform.plan_version.published.v1',1,TRUE)`.execute(db);
  });
  afterAll(async () => { await db?.destroy(); });

  it("publishes atomic v2 rows, audit, outbox and an exact replay without touching v1", async () => {
    const candidate = await input();
    expect(validateCommercialPublicationManifest(candidate.manifest)).toEqual(candidate.manifest);
    const before = (await sql<{ count: number }>`SELECT count(*)::integer AS count FROM platform.entitlements`.execute(db)).rows[0]!.count;
    const actor = await resolvePlatformActor(db, fixture.adminToken.identity);
    const first = await db.transaction().execute(tx => commercialCatalogPublication(tx, actor, candidate));
    expect(first.replayed).toBe(false);
    expect(first.result.published_aggregates).toHaveLength(2);
    const second = await db.transaction().execute(tx => commercialCatalogPublication(tx, actor, candidate));
    expect(second).toEqual({ result: first.result, replayed: true });
    expect((await sql<{ count: number }>`SELECT count(*)::integer AS count FROM platform.entitlements`.execute(db)).rows[0]!.count)
      .toBe(before + candidate.rightsCount);
    expect((await sql<{ lifecycle_state: string }>`SELECT lifecycle_state FROM platform.plan_versions
      WHERE plan_version_id=${candidate.versionId}::uuid`.execute(db)).rows[0]).toEqual({ lifecycle_state: "published" });
    expect((await sql`SELECT audit_event_id FROM ops_audit.audit_events WHERE correlation_id=${candidate.correlationId}::uuid`.execute(db)).rows).toHaveLength(3);
    expect((await sql`SELECT outbox_event_id FROM ops_audit.outbox_events WHERE correlation_id=${candidate.correlationId}::uuid`.execute(db)).rows).toHaveLength(2);
  });

  it("denies support and wrong approval hash before any catalog write", async () => {
    const candidate = await input();
    const support = await resolvePlatformActor(db, fixture.supportToken.identity);
    await expect(db.transaction().execute(tx => commercialCatalogPublication(tx, support, candidate)))
      .rejects.toMatchObject({ statusCode: 403 });
    const admin = await resolvePlatformActor(db, fixture.adminToken.identity);
    await expect(db.transaction().execute(tx => commercialCatalogPublication(tx, admin,
      { ...candidate, approvalReceiptBytes: Buffer.from(candidate.approvalReceiptBytes.toString().replace(hash(candidate.manifestBytes), "0".repeat(64))) }))).rejects.toMatchObject({ statusCode: 403 });
    await expect(db.transaction().execute(async tx => {
      await sql`UPDATE ops_audit.lifecycle_transition_definitions SET lifecycle_state='draft'
        WHERE entity_type='PlanVersion' AND command_code='commercial_catalog.publish'`.execute(tx);
      return commercialCatalogPublication(tx, admin, candidate);
    })).rejects.toMatchObject({ statusCode: 403 });
    expect((await sql`SELECT commercial_family_id FROM platform.commercial_families
      WHERE commercial_family_id=${candidate.familyId}::uuid`.execute(db)).rows).toHaveLength(0);
  });

  it("accepts an exact approved manifest only through the current human application session on a private socket", async () => {
    const candidate = await input();
    const directory = await mkdtemp(join(tmpdir(), "tcdx-commercial-operator-"));
    const socketPath = join(directory, "operator.sock");
    const stop = await startCommercialCatalogOperator({ socketPath,
      approvedManifestSha256: hash(candidate.manifestBytes), database: db, identityVerifier: fixture.tokens });
    expect((await lstat(socketPath)).mode & 0o077).toBe(0);
    const invoke = (bearerToken: string) => new Promise<Record<string, unknown>>((resolve, reject) => {
      const socket = connect(socketPath);
      let response = "";
      socket.on("connect", () => socket.end(JSON.stringify({
        bearer_token: bearerToken,
        manifest_base64: candidate.manifestBytes.toString("base64"),
        decision_record_base64: candidate.decisionRecordBytes.toString("base64"),
        approval_receipt_base64: candidate.approvalReceiptBytes.toString("base64"),
        idempotency_key: candidate.idempotencyKey,
        correlation_id: candidate.correlationId
      })));
      socket.on("data", chunk => { response += chunk.toString("utf8"); });
      socket.on("end", () => resolve(JSON.parse(response) as Record<string, unknown>));
      socket.on("error", reject);
    });
    try {
      expect(await invoke(fixture.supportToken.token)).toEqual({ error: "COMMERCIAL_PUBLICATION_DENIED_OR_FAILED" });
      expect((await sql`SELECT commercial_family_id FROM platform.commercial_families
        WHERE commercial_family_id=${candidate.familyId}::uuid`.execute(db)).rows).toHaveLength(0);
      expect(await invoke(fixture.adminToken.token)).toMatchObject({ replayed: false,
        result: { manifest_sha256: hash(candidate.manifestBytes) } });
      expect(await invoke(fixture.adminToken.token)).toMatchObject({ replayed: true });
      expect(await invoke("invalid-token")).toEqual({ error: "COMMERCIAL_PUBLICATION_DENIED_OR_FAILED" });
    } finally {
      await stop();
      await rm(directory, { recursive: true });
    }
  });
});
