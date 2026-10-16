import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { createDatabase, sql } from "../database.js";
import { loadConfig } from "../config.js";
import { UnavailableFileStoragePort } from "../ports/file-storage.js";
import { newUuidV7 } from "../uuid.js";
import { resolvePlatformActor } from "./platform-authority.js";
import { commercialSubscriptionFixture } from "./commercial-subscription-fixture.js";
import { subscriptionChangePlan, subscriptionCommercialProjection, type ChangePlanResponse } from "./commercial-subscription.js";
import { subscriptionCreate } from "./platform-iam-service.js";

describe.skipIf(process.env.TCDX_SECURITY_INTEGRATION !== "true")("subscriptionChangePlan real PostgreSQL and signed authentication", () => {
  let db: ReturnType<typeof createDatabase>, fixture: Awaited<ReturnType<typeof commercialSubscriptionFixture>>, app: ReturnType<typeof buildApp>;
  const headers = (key = newUuidV7(), version = '"1"') => ({ authorization: `Bearer ${fixture.adminToken.token}`, "idempotency-key": key, "if-match": version });
  const request = async () => ({ plan_version_id: await fixture.plan(), subscription_code: `CHANGED-${newUuidV7()}`, reason: "Isolated approved change" });
  const change = (id: string, body: Record<string, unknown>, extra: Record<string, string> = headers()) => app.inject({ method: "POST", url: `/api/v1/platform/subscriptions/${id}:change-plan`, headers: extra, payload: body });
  const counts = async (tenant: string) => (await sql`SELECT
    (SELECT count(*)::int FROM platform.subscriptions WHERE tenant_id=${tenant}::uuid) AS subscriptions,
    (SELECT count(*)::int FROM platform.subscription_regulatory_packs WHERE tenant_id=${tenant}::uuid) AS packs,
    (SELECT count(*)::int FROM ops_audit.audit_events WHERE actor_user_identity_id=${fixture.actorId}::uuid) AS audits,
    (SELECT count(*)::int FROM ops_audit.outbox_events WHERE actor_user_identity_id=${fixture.actorId}::uuid) AS outbox,
    (SELECT count(*)::int FROM ops_audit.idempotency_records WHERE actor_user_identity_id=${fixture.actorId}::uuid) AS claims`.execute(db)).rows[0];
  beforeAll(async () => {
    db = createDatabase(loadConfig(process.env)); fixture = await commercialSubscriptionFixture(db);
    app = buildApp(async () => true, { database: db, identityVerifier: fixture.tokens, referenceCursor: fixture.tokens,
      fileStorage: new UnavailableFileStoragePort(), runtimeEnvironment: "test" });
  });
  afterAll(async () => { await app?.close(); await db?.destroy(); });

  it("persists successor, original term, exact microseconds, both audits, outbox and complete snapshot after COMMIT", async () => {
    const company = await fixture.company(), body = await request(), before = await subscriptionCommercialProjection(db, company.subscriptionId);
    const response = await change(company.subscriptionId, body);
    expect(response.statusCode, response.body).toBe(200); expect(response.headers.etag).toBeUndefined(); expect(response.headers["idempotency-replayed"]).toBe("false");
    const result = response.json<ChangePlanResponse>();
    expect(result.result.previous_subscription).toMatchObject({ lifecycle_state: "ended", row_version: "2", next_subscription_id: result.resource_id, ends_at: result.result.effective_at });
    expect(result.result.current_subscription).toMatchObject({ tenant_id: company.tenantId, plan_version_id: body.plan_version_id, starts_at: result.result.effective_at,
      ends_at: before.ends_at, previous_subscription_id: company.subscriptionId, row_version: "1", commercial_configuration_status: "complete" });
    expect(result.result.effective_at).toMatch(/\.\d{6}Z$/);
    expect(await subscriptionCommercialProjection(db, result.resource_id)).toEqual(result.result.current_subscription);
    const audit = (await sql<{ event_code: string; before_payload: Record<string, unknown>; after_payload: Record<string, unknown> }>`SELECT event_code,before_payload,after_payload
      FROM ops_audit.audit_events WHERE correlation_id=${result.correlation_id}::uuid`.execute(db)).rows;
    expect(audit).toHaveLength(2);
    expect(audit.find(a => a.event_code === "audit.platform.subscription.change_plan.v1")).toMatchObject({ before_payload: { scheduled_ends_at: before.ends_at }, after_payload: { preserved_ends_at: before.ends_at, reason: body.reason } });
    expect((await sql`SELECT event_type FROM ops_audit.outbox_events WHERE correlation_id=${result.correlation_id}::uuid`.execute(db)).rows).toEqual([{ event_type: "platform.subscription.plan_changed.v1" }]);
  });
  it("transfers exact pack version and expiry, child audits and outbox without a NULL creation transition", async () => {
    const company = await fixture.company(true), body = await request();
    const old = (await sql<{ id: string; expiry: string }>`SELECT subscription_regulatory_pack_id AS id,effective_to::text AS expiry
      FROM platform.subscription_regulatory_packs WHERE subscription_id=${company.subscriptionId}::uuid`.execute(db)).rows[0]!;
    const response = await change(company.subscriptionId, body); expect(response.statusCode, response.body).toBe(200);
    const result = response.json<ChangePlanResponse>(); expect(result.result.pack_transfers.count).toBe(1);
    const pack = (await sql`SELECT lifecycle_state,regulatory_pack_version_id,effective_to::text AS expiry,previous_subscription_regulatory_pack_id
      FROM platform.subscription_regulatory_packs WHERE subscription_id=${result.resource_id}::uuid`.execute(db)).rows[0];
    expect(pack).toEqual({ lifecycle_state: "active", regulatory_pack_version_id: fixture.packVersionId, expiry: old.expiry, previous_subscription_regulatory_pack_id: old.id });
    expect((await sql`SELECT lifecycle_state FROM platform.subscription_regulatory_packs WHERE subscription_regulatory_pack_id=${old.id}::uuid`.execute(db)).rows[0]).toEqual({ lifecycle_state: "revoked" });
    expect((await sql`SELECT event_code FROM ops_audit.audit_events WHERE correlation_id=${result.correlation_id}::uuid`.execute(db)).rows).toHaveLength(4);
    expect((await sql`SELECT event_type FROM ops_audit.outbox_events WHERE correlation_id=${result.correlation_id}::uuid`.execute(db)).rows).toHaveLength(3);
    const page = await app.inject({ method: "GET", url: result.result.pack_transfers.href, headers: headers() });
    expect(page.statusCode, page.body).toBe(200); expect(page.json().items[0]).toMatchObject({ regulatory_pack_version_id: fixture.packVersionId, previous_subscription_id: company.subscriptionId, current_subscription_id: result.resource_id });
  });
  it("replays original body after another change and validates fingerprint before stale CAS", async () => {
    const company = await fixture.company(), body = await request(), key = newUuidV7();
    const first = await change(company.subscriptionId, body, headers(key)); expect(first.statusCode, first.body).toBe(200);
    const next = await change(first.json().resource_id, await request()); expect(next.statusCode, next.body).toBe(200);
    const before = await counts(company.tenantId), replay = await change(company.subscriptionId, body, headers(key));
    expect(replay.statusCode).toBe(200); expect(replay.body).toBe(first.body); expect(replay.headers["idempotency-replayed"]).toBe("true"); expect(replay.headers.etag).toBeUndefined();
    expect(replay.headers["x-correlation-id"]).not.toBe(first.headers["x-correlation-id"]);
    const mismatch = await change(company.subscriptionId, { ...body, reason: "Changed fingerprint" }, headers(key));
    expect(mismatch.statusCode).toBe(409); expect(mismatch.json().code).toBe("TCDX.CONFLICT.IDEMPOTENCY"); expect(await counts(company.tenantId)).toEqual(before);
  });
  it("serializes competing changes through tenant locks and CAS", async () => {
    const company = await fixture.company(), one = await request(), two = await request();
    const responses = await Promise.all([change(company.subscriptionId, one), change(company.subscriptionId, two)]);
    expect(responses.map(r => r.statusCode).sort()).toEqual([200, 409]); expect(responses.find(r => r.statusCode === 409)?.json().code).toBe("TCDX.CONFLICT.CONCURRENCY");
    expect((await sql`SELECT count(*)::int AS count FROM platform.subscriptions WHERE tenant_id=${company.tenantId}::uuid AND lifecycle_state='active'`.execute(db)).rows[0]).toEqual({ count: 1 });
  });
  it("serializes simultaneous identical idempotency keys to one sale and replay", async () => {
    const company = await fixture.company(), body = await request(), key = newUuidV7();
    const responses = await Promise.all([change(company.subscriptionId, body, headers(key)), change(company.subscriptionId, body, headers(key))]);
    expect(responses.map(r => r.statusCode)).toEqual([200, 200]); expect(responses[0]!.json()).toEqual(responses[1]!.json());
    expect(responses.map(r => r.headers["idempotency-replayed"]).sort()).toEqual(["false", "true"]);
  });
  it.each(["missing", "draft", "same", "quota", "stale", "extra-tenant", "weak-cas"])("rejects %s and rolls back all writes", async kind => {
    const company = await fixture.company(kind === "quota"), body = await request();
    let h = headers(), status = 409;
    if (kind === "missing") { body.plan_version_id = newUuidV7(); status = 404; }
    if (kind === "draft") { body.plan_version_id = await fixture.plan(10, true, false); status = 422; }
    if (kind === "same") body.plan_version_id = company.planVersionId;
    if (kind === "quota") body.plan_version_id = await fixture.plan(0);
    if (kind === "stale") h = headers(newUuidV7(), '"2"');
    if (kind === "weak-cas") { h = headers(newUuidV7(), 'W/"1"'); status = 400; }
    const before = await counts(company.tenantId);
    const response = await change(company.subscriptionId, kind === "extra-tenant" ? { ...body, tenant_id: newUuidV7() } : body, h);
    expect(response.statusCode, response.body).toBe(kind === "extra-tenant" ? 400 : status);
    if (kind === "quota") expect(response.json().code).toBe("TCDX.LIMIT.USAGE_EXCEEDED");
    expect(await counts(company.tenantId)).toEqual(before);
  });
  it("rejects unknown subscription and tenant header, never mutating another tenant", async () => {
    const company = await fixture.company(), other = await fixture.company(), body = await request(), before = await counts(company.tenantId);
    expect((await change(newUuidV7(), body)).statusCode).toBe(404);
    expect((await change(company.subscriptionId, body, { ...headers(), "x-tcdx-tenant-id": other.tenantId })).statusCode).toBe(403);
    expect(await counts(company.tenantId)).toEqual(before); expect((await subscriptionCommercialProjection(db, other.subscriptionId)).lifecycle_state).toBe("active");
  });
  it("uses real signed tokens and denies support, anonymous, invalid tokens and revoked authority on replay", async () => {
    const company = await fixture.company(), body = await request(), key = newUuidV7();
    expect((await change(company.subscriptionId, body, { ...headers(), authorization: `Bearer ${fixture.supportToken.token}` })).statusCode).toBe(403);
    expect((await change(company.subscriptionId, body, { ...headers(), authorization: "Bearer invalid" })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: `/api/v1/platform/subscriptions/${company.subscriptionId}:change-plan`, payload: body })).statusCode).toBe(401);
    const first = await change(company.subscriptionId, body, headers(key)); expect(first.statusCode, first.body).toBe(200);
    await fixture.tokens.revokePrincipal(fixture.actorId);
    expect((await change(company.subscriptionId, body, headers(key))).statusCode).toBe(401);
    fixture.adminToken = await fixture.tokens.issue(fixture.actorId, newUuidV7());
  });
  it.each(["audit_events", "outbox_events", "idempotency_records"])("rolls back changes and pack lineage if %s persistence fails", async table => {
    const company = await fixture.company(true), body = await request(), before = await counts(company.tenantId);
    await expect(db.transaction().execute(async tx => {
      await sql.raw(`CREATE FUNCTION pg_temp.reject_change_plan() RETURNS trigger LANGUAGE plpgsql AS $fn$ BEGIN RAISE EXCEPTION 'isolated persistence fault' USING ERRCODE='23514'; END $fn$`).execute(tx);
      await sql.raw(`CREATE TRIGGER isolated_change_plan_fault BEFORE ${table === "idempotency_records" ? "UPDATE" : "INSERT"} ON ops_audit.${table} FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_change_plan()`).execute(tx);
      return subscriptionChangePlan(tx, await resolvePlatformActor(tx, fixture.adminToken.identity), { id: company.subscriptionId, body, key: newUuidV7(), ifMatch: '"1"', correlationId: newUuidV7() });
    })).rejects.toMatchObject({ code: "23514" });
    expect(await counts(company.tenantId)).toEqual(before); expect((await subscriptionCommercialProjection(db, company.subscriptionId)).lifecycle_state).toBe("active");
  });
  it("returns dependency error for a corrupted snapshot without reconstructing current rows", async () => {
    const company = await fixture.company(), body = await request(), key = newUuidV7(), first = await change(company.subscriptionId, body, headers(key));
    expect(first.statusCode, first.body).toBe(200);
    await sql`UPDATE ops_audit.idempotency_records SET result_ref='{}' WHERE actor_user_identity_id=${fixture.actorId}::uuid AND operation_code='subscriptionChangePlan' AND idempotency_key=${key}`.execute(db);
    const response = await change(company.subscriptionId, body, headers(key)); expect(response.statusCode).toBe(503); expect(response.json().code).toBe("TCDX.DEPENDENCY.UNAVAILABLE");
  });
  it("reads own history with signed tenant/actor cursor, fresh ETag and preserved plan name", async () => {
    const company = await fixture.company(), other = await fixture.company(), changed = await change(company.subscriptionId, await request()); expect(changed.statusCode, changed.body).toBe(200);
    const detail = await app.inject({ method: "GET", url: `/api/v1/platform/subscriptions/${changed.json().resource_id}`, headers: headers() });
    expect(detail.statusCode).toBe(200); expect(detail.headers.etag).toBe('"1"'); expect(detail.headers["cache-control"]).toBe("no-store, no-transform");
    const url = `/api/v1/platform/subscriptions?tenant_id=${company.tenantId}&page[size]=1`;
    const page = await app.inject({ method: "GET", url, headers: headers() }); expect(page.statusCode, page.body).toBe(200); expect(page.json().items[0].subscription_id).toBe(changed.json().resource_id);
    const cursor = page.json().meta.next_cursor; expect(cursor).toBeTruthy();
    const second = await app.inject({ method: "GET", url: `${url}&page[cursor]=${encodeURIComponent(cursor)}`, headers: headers() });
    expect(second.statusCode, second.body).toBe(200); expect(second.json().items[0].subscription_id).toBe(company.subscriptionId);
    expect((await app.inject({ method: "GET", url: `${url.replace(company.tenantId, other.tenantId)}&page[cursor]=${encodeURIComponent(cursor)}`, headers: headers() })).statusCode).toBe(400);
  });
  it("updates effective capabilities by exact PlanVersion while preserving initial-create behavior", async () => {
    const company = await fixture.company(), body = await request(), changed = await change(company.subscriptionId, body); expect(changed.statusCode, changed.body).toBe(200);
    const rights = (await sql<{ plan_version_id: string }>`SELECT s.plan_version_id,e.capability_id,e.is_enabled FROM platform.subscriptions s JOIN platform.entitlements e USING(plan_version_id)
      WHERE s.tenant_id=${company.tenantId}::uuid AND s.lifecycle_state='active' AND s.cancelled_at IS NULL AND (s.ends_at IS NULL OR s.ends_at>statement_timestamp())`.execute(db)).rows;
    expect(rights.length).toBeGreaterThan(0); expect(rights.every(r => r.plan_version_id === body.plan_version_id)).toBe(true);
    await expect(db.transaction().execute(async tx => subscriptionCreate(tx, await resolvePlatformActor(tx, fixture.adminToken.identity), {
      body: { tenant_id: company.tenantId, plan_version_id: body.plan_version_id, subscription_code: `DUP-${newUuidV7()}` }, key: newUuidV7(), correlationId: newUuidV7()
    }))).rejects.toMatchObject({ statusCode: 409 });
  });
  it("denies an unpublished lifecycle edge and rolls back its claim", async () => {
    const company = await fixture.company(), body = await request(), before = await counts(company.tenantId);
    await expect(db.transaction().execute(async tx => {
      await sql`UPDATE ops_audit.lifecycle_transition_definitions SET lifecycle_state='draft'
        WHERE entity_type='Subscription' AND command_code='subscription.change_plan'`.execute(tx);
      return subscriptionChangePlan(tx, await resolvePlatformActor(tx, fixture.adminToken.identity), {
        id: company.subscriptionId, body, key: newUuidV7(), ifMatch: '"1"', correlationId: newUuidV7()
      });
    })).rejects.toMatchObject({ code: "TCDX.LIFECYCLE.TRANSITION_DENIED", statusCode: 409 });
    expect(await counts(company.tenantId)).toEqual(before);
  });
  it("reauthorizes a completed replay against current persisted grants", async () => {
    const company = await fixture.company(), body = await request(), key = newUuidV7(), first = await change(company.subscriptionId, body, headers(key));
    expect(first.statusCode).toBe(200);
    await expect(db.transaction().execute(async tx => {
      await sql`UPDATE iam.platform_role_assignments SET valid_to=statement_timestamp() WHERE user_identity_id=${fixture.actorId}::uuid`.execute(tx);
      return subscriptionChangePlan(tx, await resolvePlatformActor(tx, fixture.adminToken.identity), {
        id: company.subscriptionId, body, key, ifMatch: '"1"', correlationId: newUuidV7()
      });
    })).rejects.toMatchObject({ code: "TCDX.AUTHORIZATION.DENIED", statusCode: 403 });
  });
  it("rejects future pack assignments instead of silently transferring or cancelling them", async () => {
    const company = await fixture.company(), body = await request(), before = await counts(company.tenantId);
    await expect(db.transaction().execute(async tx => {
      await sql`INSERT INTO platform.subscription_regulatory_packs
        (subscription_regulatory_pack_id,tenant_id,subscription_id,regulatory_pack_id,regulatory_pack_version_id,lifecycle_state,effective_from,effective_to,created_by_user_identity_id,updated_by_user_identity_id)
        VALUES (${newUuidV7()}::uuid,${company.tenantId}::uuid,${company.subscriptionId}::uuid,${fixture.packId}::uuid,${fixture.packVersionId}::uuid,
          'active',statement_timestamp()+interval '1 day',statement_timestamp()+interval '2 days',${fixture.actorId}::uuid,${fixture.actorId}::uuid)`.execute(tx);
      return subscriptionChangePlan(tx, await resolvePlatformActor(tx, fixture.adminToken.identity), {
        id: company.subscriptionId, body, key: newUuidV7(), ifMatch: '"1"', correlationId: newUuidV7()
      });
    })).rejects.toMatchObject({ code: "TCDX.CONFLICT.RESOURCE", statusCode: 409 });
    expect(await counts(company.tenantId)).toEqual(before);
  });
  it("rejects a pack without approved coverage and preserves all commercial history", async () => {
    const company = await fixture.company(true), body = await request(), before = await counts(company.tenantId);
    await expect(db.transaction().execute(async tx => {
      await sql`UPDATE regulatory.regulatory_coverage_manifests SET coverage_percent=0 WHERE regulatory_pack_version_id=${fixture.packVersionId}::uuid`.execute(tx);
      return subscriptionChangePlan(tx, await resolvePlatformActor(tx, fixture.adminToken.identity), {
        id: company.subscriptionId, body, key: newUuidV7(), ifMatch: '"1"', correlationId: newUuidV7()
      });
    })).rejects.toMatchObject({ code: "TCDX.INVARIANT.VIOLATION", statusCode: 422 });
    expect(await counts(company.tenantId)).toEqual(before);
  });
  it("reports an unavailable commercial read as 503, preserving the real error contract", async () => {
    const config = loadConfig(process.env);
    config.database.user = `unavailable-fixture-${newUuidV7()}`;
    const unavailable = createDatabase(config);
    const unavailableApp = buildApp(async () => false, { database: unavailable, identityVerifier: fixture.tokens,
      fileStorage: new UnavailableFileStoragePort() });
    try {
      const response = await unavailableApp.inject({ method: "GET", url: `/api/v1/platform/subscriptions/${newUuidV7()}`, headers: headers() });
      expect(response.statusCode).toBe(503); expect(response.json().code).toBe("TCDX.DEPENDENCY.UNAVAILABLE");
    } finally { await unavailableApp.close(); await unavailable.destroy(); }
  });
});
