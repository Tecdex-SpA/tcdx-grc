import { createHash } from "node:crypto";
import { sql, type Kysely, type Transaction } from "kysely";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import { claimIdempotency, completeIdempotency, persistAuditEvent, persistOutboxEvent } from "../persistence/foundation-records.js";
import { newUuidV7 } from "../uuid.js";
import { recordPrivilegedUse, requirePlatformAccess, resolvePlatformActor, type PlatformActor } from "./platform-authority.js";

type Executor = Kysely<FoundationDatabase> | Transaction<FoundationDatabase>;
type Json = Record<string, unknown>;
type ConfigurationStatus = "complete" | "incomplete" | "conflicting";
export type SubscriptionDetail = {
  subscription_id: string; tenant_id: string; subscription_code: string; plan_version_id: string;
  plan_id: string; plan_code: string; plan_name: string; plan_version_number: string; lifecycle_state: string;
  starts_at: string; ends_at: string | null; cancelled_at: string | null; row_version: string;
  previous_subscription_id: string | null; next_subscription_id: string | null;
  commercial_configuration_status: ConfigurationStatus;
};
export type ChangePlanResponse = {
  operation_id: "subscriptionChangePlan"; status: "completed"; correlation_id: string; resource_id: string;
  result: { previous_subscription: SubscriptionDetail; current_subscription: SubscriptionDetail; effective_at: string;
    pack_transfers: { count: number; href: string } };
};
type Assignment = { subscription_regulatory_pack_id: string; regulatory_pack_id: string; regulatory_pack_version_id: string;
  effective_from: string; effective_to: string | null; lifecycle_state: string; row_version: string };
const permission = "platform.subscription.update";
const profile = "SUBSCRIPTION_CHANGE_PLAN_V1";
const timestampFormat = sql.lit('YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function fail(code: string, message: string, status: number, retryable = false): never {
  throw new FoundationError(code, message, status, retryable);
}
function invalid(): never { return fail("TCDX.VALIDATION.FAILED", "Invalid commercial request", 400); }
function invariant(): never { return fail("TCDX.INVARIANT.VIOLATION", "Commercial configuration or pack is not eligible", 422); }
function conflict(retryable = false): never { return fail("TCDX.CONFLICT.RESOURCE", "Commercial resource conflict", 409, retryable); }
function concurrency(): never { return fail("TCDX.CONFLICT.CONCURRENCY", "Subscription changed; refresh its current version", 409, true); }
function deniedTransition(): never { return fail("TCDX.LIFECYCLE.TRANSITION_DENIED", "Commercial transition is not available", 409); }
export function commercialUuid(value: unknown): string {
  if (typeof value !== "string" || !uuidPattern.test(value)) invalid();
  return value;
}
export function commercialIfMatch(value: unknown): string {
  const match = typeof value === "string" ? /^"([1-9][0-9]*)"$/.exec(value) : null;
  if (!match || BigInt(match[1]!) > 9223372036854775807n) invalid();
  return match[1]!;
}
export function commercialCanonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(commercialCanonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, item]) => `${JSON.stringify(key)}:${commercialCanonicalJson(item)}`).join(",")}}`;
  return JSON.stringify(value);
}
const digest = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

async function authorize(executor: Executor, actor: PlatformActor, code: string): Promise<PlatformActor> {
  const current = await resolvePlatformActor(executor, actor.identity, "statement");
  requirePlatformAccess(current, code, current.roles.includes("PLATFORM_ADMIN"));
  // A custom role carrying the same permission does not confer baseline commercial authority.
  const baseline = await sql<{ allowed: boolean }>`SELECT EXISTS (
    SELECT 1 FROM iam.platform_role_assignments pa JOIN iam.roles r USING(role_id)
    JOIN iam.role_permissions rp USING(role_id) JOIN iam.permissions p USING(permission_id)
    WHERE pa.user_identity_id=${actor.identity.principalId}::uuid AND pa.ownership_class='PLATFORM_CONTROL'
      AND pa.valid_from<=statement_timestamp() AND (pa.valid_to IS NULL OR pa.valid_to>statement_timestamp())
      AND r.role_code='PLATFORM_ADMIN' AND r.is_baseline AND r.lifecycle_state='published'
      AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL
      AND rp.ownership_class='PLATFORM_CONTROL' AND rp.tenant_id IS NULL
      AND p.permission_code=${code} AND p.lifecycle_state='published') AS allowed`.execute(executor);
  requirePlatformAccess(current, code, baseline.rows[0]?.allowed === true);
  return current;
}

type Dimension = { commercial_family_id: string | null; complete: boolean; constant: boolean };
async function configuration(executor: Executor, planVersionId: string): Promise<ConfigurationStatus> {
  const dimensions = await sql<Dimension>`
    WITH dimensions AS (SELECT NULL::uuid AS commercial_family_id UNION ALL
      SELECT commercial_family_id FROM platform.plan_version_commercial_family_links WHERE plan_version_id=${planVersionId}::uuid)
    SELECT d.commercial_family_id,
      (pv.effective_from IS NOT NULL AND
       range_agg(tstzrange(u.effective_from,u.effective_to,'[)')) FILTER (WHERE u.usage_limit_id IS NOT NULL)
         = tstzmultirange(tstzrange(pv.effective_from,pv.effective_to,'[)'))) IS TRUE AS complete,
      count(DISTINCT u.limit_value)=1 AS constant
    FROM platform.plan_versions pv CROSS JOIN dimensions d LEFT JOIN platform.usage_limits u
      ON u.plan_version_id=pv.plan_version_id AND u.limit_code='regulatory_pack_count'
      AND u.commercial_family_id IS NOT DISTINCT FROM d.commercial_family_id
    WHERE pv.plan_version_id=${planVersionId}::uuid
    GROUP BY d.commercial_family_id,pv.effective_from,pv.effective_to`.execute(executor);
  if (dimensions.rows.length < 2 || dimensions.rows.some(d => !d.complete)) return "incomplete";
  return dimensions.rows.every(d => d.constant) ? "complete" : "conflicting";
}

export async function subscriptionCommercialProjection(executor: Executor, id: string): Promise<SubscriptionDetail> {
  const row = (await sql<Omit<SubscriptionDetail, "commercial_configuration_status">>`
    SELECT s.subscription_id,s.tenant_id,s.subscription_code,s.plan_version_id,pv.plan_id,p.plan_code,
      pv.display_name AS plan_name,pv.version_number::text AS plan_version_number,s.lifecycle_state,
      to_char(s.starts_at AT TIME ZONE 'UTC',${timestampFormat}) AS starts_at,
      to_char(s.ends_at AT TIME ZONE 'UTC',${timestampFormat}) AS ends_at,
      to_char(s.cancelled_at AT TIME ZONE 'UTC',${timestampFormat}) AS cancelled_at,s.row_version::text,
      s.previous_subscription_id,n.subscription_id AS next_subscription_id
    FROM platform.subscriptions s JOIN platform.plan_versions pv USING(plan_version_id)
    JOIN platform.plans p USING(plan_id) LEFT JOIN platform.subscriptions n ON n.previous_subscription_id=s.subscription_id
    WHERE s.subscription_id=${id}::uuid`.execute(executor)).rows[0];
  if (!row) fail("TCDX.RESOURCE.NOT_FOUND", "Subscription not found", 404);
  return { ...row, commercial_configuration_status: await configuration(executor, row.plan_version_id) };
}
export async function subscriptionCommercialGet(executor: Executor, actor: PlatformActor, id: string) {
  await authorize(executor, actor, "platform.subscription.read");
  return subscriptionCommercialProjection(executor, commercialUuid(id));
}

type CursorCodec = { signReferenceCursor(payload: string): Promise<string>; verifyReferenceCursor(value: string): Promise<string> };
type CommercialCursor = { v: 1; actor: string; tenant: string; operation: string; order: string; filter: string; asOf: string; after: [string, string] };
export async function subscriptionCommercialPage(executor: Executor, actor: PlatformActor, operation: "subscriptionCommercialList" | "subscriptionPackTransferList",
  query: Record<string, unknown>, codec?: CursorCodec, subscriptionId?: string) {
  await authorize(executor, actor, "platform.subscription.read");
  const transfer = operation === "subscriptionPackTransferList";
  if (Object.keys(query).some(k => !["page[size]", "page[cursor]", ...(transfer ? [] : ["tenant_id"])].includes(k))) invalid();
  const tenantId = transfer ? (await subscriptionCommercialProjection(executor, commercialUuid(subscriptionId))).tenant_id : commercialUuid(query.tenant_id);
  const size = query["page[size]"] === undefined ? 25 : Number(query["page[size]"]);
  if (!Number.isInteger(size) || size < 1 || size > 100 || (query["page[size]"] !== undefined && !/^[0-9]+$/.test(String(query["page[size]"])))) invalid();
  const order = transfer ? "effective_from_desc,assignment_id_desc" : "starts_at_desc,subscription_id_desc";
  const filter = transfer ? subscriptionId! : tenantId;
  let state: CommercialCursor = { v: 1, actor: actor.identity.principalId, tenant: tenantId, operation, order, filter,
    asOf: (await sql<{ at: string }>`SELECT to_char(statement_timestamp() AT TIME ZONE 'UTC',${timestampFormat}) AS at`.execute(executor)).rows[0]!.at, after: ["", ""] };
  const rawCursor = query["page[cursor]"];
  if (rawCursor !== undefined) {
    if (!codec) fail("TCDX.DEPENDENCY.UNAVAILABLE", "Cursor verification unavailable", 503, true);
    try {
      if (typeof rawCursor !== "string" || !rawCursor || rawCursor.length > 2048) invalid();
      const decoded = JSON.parse(await codec.verifyReferenceCursor(rawCursor)) as CommercialCursor;
      if (Object.keys(decoded).sort().join(",") !== "actor,after,asOf,filter,operation,order,tenant,v" || decoded.v !== 1
        || decoded.actor !== state.actor || decoded.tenant !== tenantId || decoded.operation !== operation || decoded.order !== order || decoded.filter !== filter
        || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(decoded.asOf) || !Array.isArray(decoded.after) || decoded.after.length !== 2
        || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(decoded.after[0]) || !uuidPattern.test(decoded.after[1])) invalid();
      state = decoded;
    } catch { invalid(); }
  }
  const column = transfer ? "effective_from" : "starts_at", idColumn = transfer ? "subscription_regulatory_pack_id" : "subscription_id";
  const table = transfer ? "platform.subscription_regulatory_packs" : "platform.subscriptions";
  const ids = (await sql<{ id: string; at: string }>`SELECT ${sql.ref(idColumn)} AS id,to_char(${sql.ref(column)} AT TIME ZONE 'UTC',${timestampFormat}) AS at
    FROM ${sql.table(table)} WHERE tenant_id=${tenantId}::uuid AND created_at<=${state.asOf}::timestamptz
      ${transfer ? sql`AND subscription_id=${subscriptionId}::uuid AND previous_subscription_regulatory_pack_id IS NOT NULL` : sql``}
      ${state.after[0] ? sql`AND (${sql.ref(column)},${sql.ref(idColumn)})<(${state.after[0]}::timestamptz,${state.after[1]}::uuid)` : sql``}
    ORDER BY ${sql.ref(column)} DESC,${sql.ref(idColumn)} DESC LIMIT ${size + 1}`.execute(executor)).rows;
  const hasMore = ids.length > size, selected = ids.slice(0, size);
  const items = transfer ? (await sql<Json>`SELECT a.previous_subscription_regulatory_pack_id,
    a.subscription_regulatory_pack_id AS current_subscription_regulatory_pack_id,a.regulatory_pack_id,a.regulatory_pack_version_id,
    p.subscription_id AS previous_subscription_id,a.subscription_id AS current_subscription_id,
    to_char(a.effective_from AT TIME ZONE 'UTC',${timestampFormat}) AS effective_from,
    to_char(a.effective_to AT TIME ZONE 'UTC',${timestampFormat}) AS effective_to
    FROM platform.subscription_regulatory_packs a JOIN platform.subscription_regulatory_packs p
      ON p.subscription_regulatory_pack_id=a.previous_subscription_regulatory_pack_id AND p.tenant_id=a.tenant_id
    WHERE a.tenant_id=${tenantId}::uuid AND a.subscription_regulatory_pack_id=ANY(${selected.map(r => r.id)}::uuid[])
    ORDER BY a.effective_from DESC,a.subscription_regulatory_pack_id DESC`.execute(executor)).rows
    : await Promise.all(selected.map(r => subscriptionCommercialProjection(executor, r.id)));
  let next: string | null = null;
  if (hasMore) {
    if (!codec) fail("TCDX.DEPENDENCY.UNAVAILABLE", "Cursor signing unavailable", 503, true);
    const last = selected.at(-1)!;
    next = await codec.signReferenceCursor(JSON.stringify({ ...state, after: [last.at, last.id] }));
    if (next.length > 2048) fail("TCDX.DEPENDENCY.UNAVAILABLE", "Cursor representation unavailable", 503, true);
  }
  return { items, meta: { has_more: hasMore, next_cursor: next } };
}

async function requireEdge(tx: Transaction<FoundationDatabase>, entity: string, from: string | null,
  command: string, to: string, policy: string, audit: string, event: string, idempotency: string) {
  const row = (await sql<{ valid: boolean }>`
    SELECT (d.to_state=${to} AND d.precondition_policy_ref=${policy} AND d.audit_event_code=${audit}
      AND d.sod_policy_ref='PLATFORM_ADMIN_REAL_HUMAN_NO_IMPERSONATION_NO_PRODUCT_SOD_BYPASS'
      AND d.concurrency_semantics='READ_COMMITTED_TENANT_ORDERED_LOCKS_CAS'
      AND d.idempotency_semantics=${idempotency} AND NOT d.system_actor_allowed
      AND d.notification_policy_ref='NONE_NEW' AND d.recalculation_policy_ref='NO_HISTORICAL_RECALCULATION'
      AND p.permission_code=${permission} AND p.lifecycle_state='published'
      AND EXISTS (SELECT 1 FROM ops_audit.lifecycle_transition_scopes sc
        WHERE sc.lifecycle_transition_definition_id=d.lifecycle_transition_definition_id AND sc.scope_kind='platform')
      AND EXISTS (SELECT 1 FROM ops_audit.lifecycle_transition_side_effects se
        WHERE se.lifecycle_transition_definition_id=d.lifecycle_transition_definition_id AND se.event_code=${event} AND se.is_required)) AS valid
    FROM ops_audit.lifecycle_transition_definitions d JOIN iam.permissions p USING(permission_id)
    WHERE d.entity_type=${entity} AND d.from_state IS NOT DISTINCT FROM ${from} AND d.command_code=${command}
      AND d.lifecycle_state='published' ORDER BY d.version_number DESC LIMIT 1 FOR SHARE OF d,p`.execute(tx)).rows[0];
  if (!row?.valid) deniedTransition();
}

function validSnapshot(claim: { resultRef: string | null; responseHash: string | null; resultStatusCode: string }): ChangePlanResponse {
  try {
    if (claim.resultStatusCode !== "completed" || !claim.resultRef) throw new Error();
    const snapshot = JSON.parse(claim.resultRef) as { profile: string; http_status: number; body: ChangePlanResponse };
    if (Object.keys(snapshot).sort().join(",") !== "body,http_status,profile" || snapshot.profile !== profile || snapshot.http_status !== 200
      || !validResponse(snapshot.body)
      || digest(commercialCanonicalJson(snapshot.body)) !== claim.responseHash) throw new Error();
    return snapshot.body;
  } catch { return fail("TCDX.DEPENDENCY.UNAVAILABLE", "Stored commercial result unavailable", 503, true); }
}

function closed(value: unknown, keys: string[]): value is Json {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).sort().join(",") === [...keys].sort().join(",");
}
function validResponse(value: unknown): value is ChangePlanResponse {
  const instant = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(v) && Number.isFinite(Date.parse(v));
  const uuid = (v: unknown) => typeof v === "string" && uuidPattern.test(v);
  const positive = (v: unknown) => typeof v === "string" && /^[1-9][0-9]*$/.test(v);
  const nonempty = (v: unknown, max: number) => typeof v === "string" && v.length > 0 && v.length <= max;
  const detail = (v: unknown) => {
    if (!closed(v, ["subscription_id", "tenant_id", "subscription_code", "plan_version_id", "plan_id", "plan_code", "plan_name", "plan_version_number", "lifecycle_state", "starts_at", "ends_at", "cancelled_at", "row_version", "previous_subscription_id", "next_subscription_id", "commercial_configuration_status"])) return false;
    return [v.subscription_id, v.tenant_id, v.plan_version_id, v.plan_id].every(uuid)
      && [v.previous_subscription_id, v.next_subscription_id].every(id => id === null || uuid(id))
      && positive(v.row_version) && positive(v.plan_version_number) && instant(v.starts_at)
      && [v.ends_at, v.cancelled_at].every(at => at === null || instant(at))
      && nonempty(v.subscription_code, 96) && nonempty(v.plan_code, 64) && nonempty(v.plan_name, Number.MAX_SAFE_INTEGER)
      && nonempty(v.lifecycle_state, 32) && ["complete", "incomplete", "conflicting"].includes(String(v.commercial_configuration_status));
  };
  if (!closed(value, ["operation_id", "status", "correlation_id", "resource_id", "result"]) || value.operation_id !== "subscriptionChangePlan"
    || value.status !== "completed" || !uuid(value.resource_id) || typeof value.correlation_id !== "string"
    || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value.correlation_id)
    || !closed(value.result, ["previous_subscription", "current_subscription", "effective_at", "pack_transfers"])) return false;
  const result = value.result;
  return detail(result.previous_subscription) && detail(result.current_subscription) && instant(result.effective_at)
    && closed(result.pack_transfers, ["count", "href"]) && Number.isSafeInteger(result.pack_transfers.count)
    && Number(result.pack_transfers.count) >= 0 && result.pack_transfers.href === `/api/v1/platform/subscriptions/${value.resource_id}/pack-transfers`;
}

/** Called by the existing Platform service in a single READ COMMITTED transaction. */
export async function subscriptionChangePlan(tx: Transaction<FoundationDatabase>, actor: PlatformActor, input: {
  id: string; body: unknown; key?: string; ifMatch?: unknown; correlationId: string;
}): Promise<{ body: ChangePlanResponse; replayed: boolean }> {
  actor = await authorize(tx, actor, permission);
  const id = commercialUuid(input.id), expectedVersion = commercialIfMatch(input.ifMatch);
  if (!input.body || typeof input.body !== "object" || Array.isArray(input.body)) invalid();
  const body = input.body as Json;
  if (Object.keys(body).sort().join(",") !== "plan_version_id,reason,subscription_code") invalid();
  const planVersionId = commercialUuid(body.plan_version_id);
  if (typeof body.subscription_code !== "string" || !body.subscription_code.trim() || body.subscription_code.length > 96
    || typeof body.reason !== "string" || !body.reason.trim() || body.reason.length > 2000 || !input.key || input.key.length > 255) invalid();
  const subscriptionCode = body.subscription_code.trim(), reason = body.reason.trim();
  const requestHash = digest(`v1subscriptionChangePlan${commercialCanonicalJson({ origin_subscription_id: id,
    plan_version_id: planVersionId, subscription_code: subscriptionCode, reason, expected_row_version: expectedVersion })}`);
  const claim = await claimIdempotency(tx, { idempotencyRecordId: newUuidV7(), ownershipClass: "PLATFORM_CONTROL", tenantId: null,
    actor: { userIdentityId: actor.identity.principalId }, correlationId: input.correlationId,
    operationCode: "subscriptionChangePlan", key: input.key, requestHash, returnInProgress: true });
  if (claim.state === "replay") return { body: validSnapshot(claim), replayed: true };
  if (claim.state === "in_progress") conflict(true);
  const source = (await sql<{ tenant_id: string }>`SELECT tenant_id FROM platform.subscriptions WHERE subscription_id=${id}::uuid`.execute(tx)).rows[0];
  if (!source) fail("TCDX.RESOURCE.NOT_FOUND", "Subscription not found", 404);
  const tenant = (await sql<{ lifecycle_state: string }>`SELECT lifecycle_state FROM platform.tenants
    WHERE tenant_id=${source.tenant_id}::uuid FOR UPDATE`.execute(tx)).rows[0];
  if (tenant?.lifecycle_state !== "active") fail("TCDX.RESOURCE.NOT_FOUND", "Tenant not available", 404);
  await sql`SELECT subscription_id FROM platform.subscriptions WHERE tenant_id=${source.tenant_id}::uuid ORDER BY subscription_id FOR UPDATE`.execute(tx);
  const assignments = (await sql<Assignment>`SELECT subscription_regulatory_pack_id,regulatory_pack_id,regulatory_pack_version_id,
    to_char(effective_from AT TIME ZONE 'UTC',${timestampFormat}) AS effective_from,
    to_char(effective_to AT TIME ZONE 'UTC',${timestampFormat}) AS effective_to,lifecycle_state,row_version::text
    FROM platform.subscription_regulatory_packs WHERE subscription_id=${id}::uuid AND tenant_id=${source.tenant_id}::uuid
    ORDER BY subscription_regulatory_pack_id FOR UPDATE`.execute(tx)).rows;
  // Lock each catalog relation in a stable table/UUID order before choosing the cut.
  for (const [table, column, filterColumn] of [
    ["platform.plans", "plan_id", "plan_id"], ["platform.plan_versions", "plan_version_id", "plan_version_id"],
    ["platform.commercial_families", "commercial_family_id", "commercial_family_id"],
    ["platform.plan_version_commercial_family_links", "plan_version_commercial_family_link_id", "plan_version_id"],
    ["platform.usage_limits", "usage_limit_id", "plan_version_id"], ["platform.entitlements", "entitlement_id", "plan_version_id"],
    ["platform.capabilities", "capability_id", "capability_id"],
    ["platform.regulatory_pack_commercial_family_links", "regulatory_pack_commercial_family_link_id", "regulatory_pack_id"],
    ["regulatory.regulatory_packs", "regulatory_pack_id", "regulatory_pack_id"],
    ["regulatory.regulatory_pack_versions", "regulatory_pack_version_id", "regulatory_pack_version_id"],
    ["regulatory.regulatory_coverage_manifests", "regulatory_coverage_manifest_id", "regulatory_pack_version_id"]
  ] as const) {
    let ids: string[];
    if (filterColumn === "plan_id") ids = (await sql<{ id: string }>`SELECT plan_id AS id FROM platform.plan_versions WHERE plan_version_id=${planVersionId}::uuid`.execute(tx)).rows.map(r => r.id);
    else if (filterColumn === "commercial_family_id") ids = (await sql<{ id: string }>`SELECT commercial_family_id AS id FROM platform.plan_version_commercial_family_links WHERE plan_version_id=${planVersionId}::uuid`.execute(tx)).rows.map(r => r.id);
    else if (filterColumn === "capability_id") ids = (await sql<{ id: string }>`SELECT capability_id AS id FROM platform.entitlements WHERE plan_version_id=${planVersionId}::uuid`.execute(tx)).rows.map(r => r.id);
    else if (filterColumn === "regulatory_pack_id") ids = assignments.map(a => a.regulatory_pack_id);
    else if (filterColumn === "regulatory_pack_version_id") ids = assignments.map(a => a.regulatory_pack_version_id);
    else ids = [planVersionId];
    await sql`SELECT ${sql.ref(column)} FROM ${sql.table(table)} WHERE ${sql.ref(filterColumn)}=ANY(${ids}::uuid[])
      ORDER BY ${sql.ref(column)} FOR SHARE`.execute(tx);
  }
  actor = await authorize(tx, actor, permission);
  await requireEdge(tx, "Subscription", "active", "subscription.change_plan", "ended", "commercial.subscription.change_plan.v1",
    "audit.platform.subscription.change_plan.v1", "platform.subscription.plan_changed.v1", profile);
  const at = (await sql<{ at: string }>`SELECT to_char(statement_timestamp() AT TIME ZONE 'UTC',${timestampFormat}) AS at`.execute(tx)).rows[0]!.at;
  const before = await subscriptionCommercialProjection(tx, id);
  if (before.row_version !== expectedVersion) concurrency();
  if (before.lifecycle_state !== "active" || before.cancelled_at !== null || before.starts_at > at || (before.ends_at !== null && before.ends_at <= at)) deniedTransition();
  if (at <= before.starts_at) conflict(true);
  const activeSubscriptions = (await sql<{ subscription_id: string }>`SELECT subscription_id FROM platform.subscriptions
    WHERE tenant_id=${source.tenant_id}::uuid AND lifecycle_state='active' AND cancelled_at IS NULL
      AND starts_at<=${at}::timestamptz AND (ends_at IS NULL OR ends_at>${at}::timestamptz)`.execute(tx)).rows;
  if (activeSubscriptions.length !== 1 || activeSubscriptions[0]?.subscription_id !== id) conflict();
  if (before.plan_version_id === planVersionId) conflict();
  if ((await sql`SELECT subscription_id FROM platform.subscriptions WHERE tenant_id=${source.tenant_id}::uuid AND subscription_code=${subscriptionCode}`.execute(tx)).rows.length) conflict();
  const target = (await sql<{ eligible: boolean }>`SELECT (p.lifecycle_state='published' AND pv.lifecycle_state='published'
    AND pv.published_at IS NOT NULL AND pv.effective_from<=${at}::timestamptz AND (pv.effective_to IS NULL OR pv.effective_to>${at}::timestamptz)) AS eligible
    FROM platform.plan_versions pv JOIN platform.plans p USING(plan_id) WHERE pv.plan_version_id=${planVersionId}::uuid`.execute(tx)).rows[0];
  if (!target) fail("TCDX.RESOURCE.NOT_FOUND", "PlanVersion not found", 404);
  if (!target.eligible || await configuration(tx, planVersionId) !== "complete") invariant();
  const capabilities = (await sql<{ capability_group: string }>`SELECT DISTINCT c.capability_group FROM platform.entitlements e
    JOIN platform.capabilities c USING(capability_id) WHERE e.plan_version_id=${planVersionId}::uuid AND e.is_enabled AND c.lifecycle_state='published'
    ORDER BY c.capability_group`.execute(tx)).rows;
  if (capabilities.length === 0) invariant();
  const effective = assignments.filter(a => a.lifecycle_state === "active" && a.effective_from<=at && (a.effective_to === null || a.effective_to>at));
  if (assignments.some(a => a.lifecycle_state === "active" && a.effective_from>at)) conflict();
  if (new Set(effective.map(a => a.regulatory_pack_id)).size !== effective.length) conflict();
  if (effective.some(a => a.effective_from>=at)) conflict(true);
  if (effective.length) {
    // The approved normative reader capability remains independent of family eligibility.
    if (!capabilities.some(c => c.capability_group === "ISO_COMPLIANCE")) invariant();
    await requireEdge(tx, "SubscriptionRegulatoryPack", "active", "subscription_regulatory_pack.transfer_close", "revoked", "commercial.pack.transfer_close.v1",
      "audit.platform.subscription_regulatory_pack.transfer_close.v1", "platform.subscription_regulatory_pack.transfer_closed.v1", "PARENT_AND_ASSIGNMENT_ID");
    // Rector 21 §17 and binding 08: transfer_activate creates the successor in its initial
    // active state under this parent command. It has no existing row/from_state to transition.
    // The close edge above remains mandatory; creation is audited below with its exact binding.
  }
  const packs = (await sql<{ regulatory_pack_id: string; commercial_family_id: string; eligible: boolean }>`
    SELECT p.regulatory_pack_id,l.commercial_family_id,
      (p.lifecycle_state='published' AND pv.lifecycle_state='published' AND pv.published_at IS NOT NULL
       AND pv.reviewed_by_user_identity_id IS NOT NULL AND pv.license_classification NOT IN ('NOT_YET_LICENSED','non_authoritative_test_pack')
       AND (pv.effective_from IS NULL OR pv.effective_from<=${at}::timestamptz) AND (pv.effective_to IS NULL OR pv.effective_to>${at}::timestamptz)
       AND f.published_at IS NOT NULL AND f.source_type=p.source_type
       AND EXISTS (SELECT 1 FROM platform.plan_version_commercial_family_links pf WHERE pf.plan_version_id=${planVersionId}::uuid AND pf.commercial_family_id=l.commercial_family_id)
       AND EXISTS (SELECT 1 FROM regulatory.regulatory_coverage_manifests cm WHERE cm.regulatory_pack_version_id=pv.regulatory_pack_version_id
         AND cm.coverage_percent=100 AND cm.valid_parent_links=cm.normative_units_imported
         AND cm.normative_units_imported=cm.normative_units_expected AND cm.normative_units_reviewed=cm.normative_units_expected
         AND cm.requirements_imported=cm.requirements_expected AND cm.requirements_reviewed=cm.requirements_expected
         AND cm.reference_controls_imported=cm.reference_controls_expected AND cm.reference_controls_reviewed=cm.reference_controls_expected
         AND cm.approved_at IS NOT NULL AND cm.approved_by_user_identity_id IS NOT NULL)) AS eligible
    FROM regulatory.regulatory_pack_versions pv JOIN regulatory.regulatory_packs p USING(regulatory_pack_id)
    JOIN platform.regulatory_pack_commercial_family_links l USING(regulatory_pack_id)
    JOIN platform.commercial_families f USING(commercial_family_id)
    WHERE pv.regulatory_pack_version_id=ANY(${effective.map(a => a.regulatory_pack_version_id)}::uuid[])`.execute(tx)).rows;
  if (packs.length !== effective.length || packs.some(p => !p.eligible)) invariant();
  const limits = (await sql<{ usage_limit_id: string; commercial_family_id: string | null; limit_value: string }>`
    SELECT usage_limit_id,commercial_family_id,trunc(limit_value)::text AS limit_value FROM platform.usage_limits
    WHERE plan_version_id=${planVersionId}::uuid AND limit_code='regulatory_pack_count'
      AND (effective_from IS NULL OR effective_from<=${at}::timestamptz) AND (effective_to IS NULL OR effective_to>${at}::timestamptz)
    ORDER BY commercial_family_id NULLS FIRST,usage_limit_id`.execute(tx)).rows;
  const evaluatedLimits = limits.map(l => ({ ...l, evaluated_root_count: l.commercial_family_id === null ? packs.length : packs.filter(p => p.commercial_family_id === l.commercial_family_id).length }));
  if (evaluatedLimits.some(l => BigInt(l.evaluated_root_count)>BigInt(l.limit_value))) fail("TCDX.LIMIT.USAGE_EXCEEDED", "Target plan pack quota exceeded", 409);
  const currentId = newUuidV7();
  const changed = await sql`UPDATE platform.subscriptions SET lifecycle_state='ended',ends_at=${at}::timestamptz,
    row_version=row_version+1,updated_at=${at}::timestamptz,updated_by_user_identity_id=${actor.identity.principalId}::uuid,updated_by_service_principal_id=NULL
    WHERE subscription_id=${id}::uuid AND tenant_id=${source.tenant_id}::uuid AND row_version=${expectedVersion}::bigint AND lifecycle_state='active'`.execute(tx);
  if (Number(changed.numAffectedRows) !== 1) concurrency();
  await sql`INSERT INTO platform.subscriptions (subscription_id,tenant_id,plan_version_id,subscription_code,lifecycle_state,starts_at,ends_at,previous_subscription_id,created_by_user_identity_id,updated_by_user_identity_id)
    VALUES (${currentId}::uuid,${source.tenant_id}::uuid,${planVersionId}::uuid,${subscriptionCode},'active',${at}::timestamptz,${before.ends_at}::timestamptz,${id}::uuid,${actor.identity.principalId}::uuid,${actor.identity.principalId}::uuid)`.execute(tx);
  const common = { ownershipClass: "PLATFORM_CONTROL" as const, tenantId: null, actor: { userIdentityId: actor.identity.principalId }, correlationId: input.correlationId, classification: "confidential" };
  for (const a of effective) {
    const newId = newUuidV7();
    const close = await sql`UPDATE platform.subscription_regulatory_packs SET lifecycle_state='revoked',effective_to=${at}::timestamptz,
      row_version=row_version+1,updated_at=${at}::timestamptz,updated_by_user_identity_id=${actor.identity.principalId}::uuid,updated_by_service_principal_id=NULL
      WHERE subscription_regulatory_pack_id=${a.subscription_regulatory_pack_id}::uuid AND tenant_id=${source.tenant_id}::uuid AND row_version=${a.row_version}::bigint AND lifecycle_state='active'`.execute(tx);
    if (Number(close.numAffectedRows) !== 1) concurrency();
    await sql`INSERT INTO platform.subscription_regulatory_packs
      (subscription_regulatory_pack_id,tenant_id,subscription_id,regulatory_pack_id,regulatory_pack_version_id,lifecycle_state,effective_from,effective_to,previous_subscription_regulatory_pack_id,created_by_user_identity_id,updated_by_user_identity_id)
      VALUES (${newId}::uuid,${source.tenant_id}::uuid,${currentId}::uuid,${a.regulatory_pack_id}::uuid,${a.regulatory_pack_version_id}::uuid,'active',${at}::timestamptz,${a.effective_to}::timestamptz,${a.subscription_regulatory_pack_id}::uuid,${actor.identity.principalId}::uuid,${actor.identity.principalId}::uuid)`.execute(tx);
    const childBefore = { assignment_id: a.subscription_regulatory_pack_id, subscription_id: id, regulatory_pack_id: a.regulatory_pack_id,
      regulatory_pack_version_id: a.regulatory_pack_version_id, lifecycle_state: "active", effective_from: a.effective_from, original_effective_to: a.effective_to, row_version: a.row_version };
    const childAfter = { previous_assignment_id: a.subscription_regulatory_pack_id, current_assignment_id: newId,
      previous_subscription_id: id, current_subscription_id: currentId, regulatory_pack_id: a.regulatory_pack_id,
      regulatory_pack_version_id: a.regulatory_pack_version_id, effective_at: at, preserved_effective_to: a.effective_to, parent_command: "subscription.change_plan" };
    for (const [suffix, aggregateId, event] of [["transfer_close", a.subscription_regulatory_pack_id, "transfer_closed"], ["transfer_activate", newId, "transferred"]] as const) {
      await persistAuditEvent(tx, { ...common, auditEventId: newUuidV7(), eventCode: `audit.platform.subscription_regulatory_pack.${suffix}.v1`,
        aggregateType: "SubscriptionRegulatoryPack", aggregateId, commandCode: `subscription_regulatory_pack.${suffix}`, outcome: "success", before: childBefore, after: childAfter });
      await persistOutboxEvent(tx, { ...common, outboxEventId: newUuidV7(), eventId: newUuidV7(),
        eventType: `platform.subscription_regulatory_pack.${event}.v1`, aggregateType: "SubscriptionRegulatoryPack", aggregateId, payload: childAfter });
    }
  }
  const payload = { previous_subscription_id: id, current_subscription_id: currentId, tenant_id: source.tenant_id,
    old_plan_version_id: before.plan_version_id, new_plan_version_id: planVersionId, effective_at: at, transfer_count: effective.length };
  await persistAuditEvent(tx, { ...common, auditEventId: newUuidV7(), eventCode: "audit.platform.subscription.change_plan.v1", aggregateType: "Subscription", aggregateId: id,
    commandCode: "subscription.change_plan", outcome: "success", before: { subscription: before, scheduled_ends_at: before.ends_at },
    after: { ...payload, preserved_ends_at: before.ends_at, reason, evaluated_configuration_sha256: digest(commercialCanonicalJson({ plan_version_id: planVersionId, limits: evaluatedLimits, capabilities })), evaluated_limits: evaluatedLimits, operation_id: "subscriptionChangePlan" } });
  await recordPrivilegedUse(tx, { actor, correlationId: input.correlationId, aggregateType: "Subscription", aggregateId: id, commandCode: "subscription.change_plan", outcome: "success" });
  await persistOutboxEvent(tx, { ...common, outboxEventId: newUuidV7(), eventId: newUuidV7(), eventType: "platform.subscription.plan_changed.v1", aggregateType: "Subscription", aggregateId: id, payload });
  await sql`SET CONSTRAINTS ALL IMMEDIATE`.execute(tx);
  const response: ChangePlanResponse = { operation_id: "subscriptionChangePlan", status: "completed", correlation_id: input.correlationId, resource_id: currentId,
    result: { previous_subscription: await subscriptionCommercialProjection(tx, id), current_subscription: await subscriptionCommercialProjection(tx, currentId), effective_at: at,
      pack_transfers: { count: effective.length, href: `/api/v1/platform/subscriptions/${currentId}/pack-transfers` } } };
  await completeIdempotency(tx, { idempotencyRecordId: claim.idempotencyRecordId, requestHash, resultStatusCode: "completed",
    resultRef: commercialCanonicalJson({ profile, http_status: 200, body: response }), responseHash: digest(commercialCanonicalJson(response)) });
  return { body: response, replayed: false };
}
