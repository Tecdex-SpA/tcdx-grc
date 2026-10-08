import { createHash } from "node:crypto";
import { sql, type Kysely, type Transaction } from "kysely";
import { validate as validateUuid } from "uuid";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import { newUuidV7 } from "../uuid.js";
import { claimIdempotency, completeIdempotency, persistAuditEvent, persistOutboxEvent } from "../persistence/foundation-records.js";
import type { PlatformActor } from "../security/platform-authority.js";
import { requirePlatformAccess } from "../security/platform-authority.js";

type Executor = Kysely<FoundationDatabase> | Transaction<FoundationDatabase>;
type Assignment = {
  subscription_regulatory_pack_id: string; subscription_id: string; tenant_id: string;
  regulatory_pack_version_id: string; row_version: string | number; lifecycle_state: string;
  effective_from: Date; effective_to: Date | null; pack_code: string; name: string;
  edition: string; license_classification: string; pack_lifecycle_state: string;
};

function invalid(field: string): never {
  throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field });
}
function notFound(): never { throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404); }
function conflict(): never { throw new FoundationError("TCDX.CONFLICT.RESOURCE", "Resource conflict", 409); }

export function packUuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !validateUuid(value)) invalid(field);
  return value as string;
}

function isoDate(value: unknown, field: string): Date {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(value)) invalid(field);
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) invalid(field);
  return date;
}

function bodyFields(body: unknown, allowed: readonly string[], required: readonly string[]): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) invalid("body");
  const record = body as Record<string, unknown>;
  for (const field of Object.keys(record)) if (!allowed.includes(field)) invalid(field);
  for (const field of required) if (record[field] === undefined || record[field] === null) invalid(field);
  return record;
}

function project(row: Assignment) {
  return { ...row, row_version: Number(row.row_version), effective_from: row.effective_from.toISOString(),
    effective_to: row.effective_to?.toISOString() ?? null,
    effective_state: row.lifecycle_state === "revoked" ? "revoked"
      : row.effective_from.getTime() > Date.now() ? "future"
      : row.effective_to && row.effective_to.getTime() <= Date.now() ? "expired" : "effective" };
}

async function assignment(executor: Executor, id: string, tenantId?: string) {
  const result = await sql<Assignment>`
    SELECT a.subscription_regulatory_pack_id,a.subscription_id,a.tenant_id,a.regulatory_pack_version_id,
           a.row_version,a.lifecycle_state,a.effective_from,a.effective_to,p.pack_code,p.name,pv.edition,
           pv.license_classification,pv.lifecycle_state AS pack_lifecycle_state
      FROM platform.subscription_regulatory_packs a
      JOIN regulatory.regulatory_pack_versions pv ON pv.regulatory_pack_version_id=a.regulatory_pack_version_id
      JOIN regulatory.regulatory_packs p ON p.regulatory_pack_id=pv.regulatory_pack_id
     WHERE a.subscription_regulatory_pack_id=${id}::uuid
       AND (${tenantId ?? null}::uuid IS NULL OR a.tenant_id=${tenantId ?? null}::uuid)
  `.execute(executor);
  if (result.rows.length !== 1) notFound();
  return project(result.rows[0]!);
}

export async function packAssignmentDetail(executor: Executor, id: string, tenantId?: string) {
  return assignment(executor, packUuid(id, "subscription_regulatory_pack_id"), tenantId);
}

export async function listPackAssignments(executor: Executor, subscriptionId: string, tenantId?: string, query: Record<string, unknown> = {}) {
  packUuid(subscriptionId, "subscription_id");
  for (const field of Object.keys(query)) if (field !== "page[size]" && field !== "page[cursor]") invalid(field);
  const size = query["page[size]"] === undefined ? 25 : Number(query["page[size]"]);
  if (!Number.isInteger(size) || size < 1 || size > 100) invalid("page[size]");
  const cursorHash = createHash("sha256").update(JSON.stringify([subscriptionId, tenantId ?? null])).digest("hex");
  let after: { created_at: string; id: string } | null = null;
  if (query["page[cursor]"] !== undefined) {
    const raw = query["page[cursor]"];
    if (typeof raw !== "string" || raw.length > 2048) invalid("page[cursor]");
    try {
      const decoded = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as { hash?: string; created_at?: string; id?: string };
      if (decoded.hash !== cursorHash || !decoded.created_at || Number.isNaN(Date.parse(decoded.created_at)) ||
          !decoded.id || !validateUuid(decoded.id)) throw new Error("cursor");
      after = { created_at: decoded.created_at, id: decoded.id };
    } catch { invalid("page[cursor]"); }
  }
  const subscription = await sql<{ subscription_id: string }>`
    SELECT subscription_id FROM platform.subscriptions
     WHERE subscription_id=${subscriptionId}::uuid
       AND (${tenantId ?? null}::uuid IS NULL OR tenant_id=${tenantId ?? null}::uuid)
  `.execute(executor);
  if (subscription.rows.length !== 1) notFound();
  const ids = await sql<{ subscription_regulatory_pack_id: string; created_at: Date }>`
    SELECT subscription_regulatory_pack_id,created_at FROM platform.subscription_regulatory_packs
     WHERE subscription_id=${subscriptionId}::uuid
       AND (${after?.created_at ?? null}::timestamptz IS NULL OR (created_at,subscription_regulatory_pack_id)<(${after?.created_at ?? null}::timestamptz,${after?.id ?? null}::uuid))
     ORDER BY created_at DESC,subscription_regulatory_pack_id DESC
     LIMIT ${size + 1}
  `.execute(executor);
  const items = [];
  for (const row of ids.rows.slice(0, size)) items.push(await assignment(executor, row.subscription_regulatory_pack_id, tenantId));
  const last = ids.rows[Math.min(ids.rows.length, size) - 1];
  return { items, page: { has_more: ids.rows.length > size, next_cursor: ids.rows.length > size && last
    ? Buffer.from(JSON.stringify({ hash: cursorHash, created_at: last.created_at.toISOString(), id: last.subscription_regulatory_pack_id })).toString("base64url") : null } };
}

async function idempotency(transaction: Transaction<FoundationDatabase>, actor: PlatformActor,
  input: { key: string; correlationId: string; operation: string; payload: unknown }) {
  if (!input.key || input.key.length > 255) invalid("Idempotency-Key");
  const requestHash = createHash("sha256").update(JSON.stringify(input.payload)).digest("hex");
  const claim = await claimIdempotency(transaction, {
    idempotencyRecordId: newUuidV7(), ownershipClass: "PLATFORM_CONTROL", tenantId: null,
    actor: { userIdentityId: actor.identity.principalId }, correlationId: input.correlationId,
    operationCode: input.operation, key: input.key, requestHash
  });
  return { claim, requestHash };
}

async function recorded(transaction: Transaction<FoundationDatabase>, actor: PlatformActor,
  input: { id: string; operation: string; correlationId: string; before?: Record<string, unknown>; after: Record<string, unknown> }) {
  await persistAuditEvent(transaction, {
    auditEventId: newUuidV7(), ownershipClass: "PLATFORM_CONTROL", tenantId: null,
    actor: { userIdentityId: actor.identity.principalId }, correlationId: input.correlationId,
    eventCode: `audit.platform.subscription_regulatory_pack.${input.operation}.v1`,
    aggregateType: "SubscriptionRegulatoryPack", aggregateId: input.id, commandCode: input.operation,
    outcome: "success", classification: "confidential", ...(input.before ? { before: input.before } : {}), after: input.after
  });
  await persistOutboxEvent(transaction, {
    outboxEventId: newUuidV7(), eventId: newUuidV7(), ownershipClass: "PLATFORM_CONTROL", tenantId: null,
    actor: { userIdentityId: actor.identity.principalId }, correlationId: input.correlationId,
    eventType: `platform.subscription_regulatory_pack.${input.operation}.v1`, aggregateType: "SubscriptionRegulatoryPack",
    aggregateId: input.id, classification: "confidential", payload: input.after
  });
}

export async function activatePack(transaction: Transaction<FoundationDatabase>, actor: PlatformActor, input: {
  subscriptionId: string; body: unknown; key: string; correlationId: string;
}) {
  requirePlatformAccess(actor, "platform.subscription_regulatory_pack.create", actor.roles.includes("PLATFORM_ADMIN"));
  const subscriptionId = packUuid(input.subscriptionId, "subscription_id");
  const body = bodyFields(input.body, ["regulatory_pack_version_id", "effective_from"], ["regulatory_pack_version_id", "effective_from"]);
  const versionId = packUuid(body.regulatory_pack_version_id, "regulatory_pack_version_id");
  const effectiveFrom = isoDate(body.effective_from, "effective_from");
  const { claim, requestHash } = await idempotency(transaction, actor, {
    key: input.key, correlationId: input.correlationId, operation: "subscriptionRegulatoryPackActivate",
    payload: { subscriptionId, versionId, effectiveFrom: effectiveFrom.toISOString() }
  });
  if (claim.state === "replay") {
    const id = claim.resultRef?.split(":")[1];
    if (!id) conflict();
    return { result: await assignment(transaction, id), replayed: true };
  }
  const subscription = await sql<{ tenant_id: string }>`
    SELECT tenant_id FROM platform.subscriptions WHERE subscription_id=${subscriptionId}::uuid
      AND lifecycle_state='active' AND starts_at<=transaction_timestamp()
      AND (ends_at IS NULL OR ends_at>transaction_timestamp()) AND cancelled_at IS NULL FOR UPDATE
  `.execute(transaction);
  if (subscription.rows.length !== 1) notFound();
  const version = await sql<{ regulatory_pack_version_id: string }>`
    SELECT pv.regulatory_pack_version_id FROM regulatory.regulatory_pack_versions pv
    JOIN regulatory.regulatory_packs p ON p.regulatory_pack_id=pv.regulatory_pack_id
    WHERE pv.regulatory_pack_version_id=${versionId}::uuid
      AND pv.lifecycle_state='published' AND p.lifecycle_state='published'
      AND (pv.effective_from IS NULL OR pv.effective_from<=${effectiveFrom.toISOString()}::timestamptz)
      AND (pv.effective_to IS NULL OR pv.effective_to>${effectiveFrom.toISOString()}::timestamptz)
  `.execute(transaction);
  if (version.rows.length !== 1) notFound();
  const active = await sql<{ subscription_regulatory_pack_id: string }>`
    SELECT subscription_regulatory_pack_id FROM platform.subscription_regulatory_packs
     WHERE subscription_id=${subscriptionId}::uuid AND regulatory_pack_version_id=${versionId}::uuid
       AND tstzrange(effective_from,effective_to,'[)') && tstzrange(${effectiveFrom.toISOString()}::timestamptz,NULL,'[)')
  `.execute(transaction);
  if (active.rows.length !== 0) conflict();
  const id = newUuidV7();
  await sql`INSERT INTO platform.subscription_regulatory_packs
    (subscription_regulatory_pack_id,tenant_id,subscription_id,regulatory_pack_version_id,lifecycle_state,effective_from,
     created_by_user_identity_id,updated_by_user_identity_id)
    VALUES (${id}::uuid,${subscription.rows[0]!.tenant_id}::uuid,${subscriptionId}::uuid,${versionId}::uuid,'active',
      ${effectiveFrom.toISOString()}::timestamptz,${actor.identity.principalId}::uuid,${actor.identity.principalId}::uuid)
  `.execute(transaction);
  const result = await assignment(transaction, id);
  await recorded(transaction, actor, { id, operation: "activate", correlationId: input.correlationId, after: result });
  await completeIdempotency(transaction, { idempotencyRecordId: claim.idempotencyRecordId, requestHash,
    resultStatusCode: "completed", resultRef: `pack:${id}`,
    responseHash: createHash("sha256").update(JSON.stringify(result)).digest("hex") });
  return { result, replayed: false };
}

export async function revokePack(transaction: Transaction<FoundationDatabase>, actor: PlatformActor, input: {
  assignmentId: string; body: unknown; expectedVersion: number; key: string; correlationId: string;
}) {
  requirePlatformAccess(actor, "platform.subscription_regulatory_pack.archive", actor.roles.includes("PLATFORM_ADMIN"));
  const id = packUuid(input.assignmentId, "subscription_regulatory_pack_id");
  const body = bodyFields(input.body, ["reason"], ["reason"]);
  const reason = body.reason;
  if (typeof reason !== "string" || !reason.trim() || reason.length > 2000) invalid("reason");
  if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 1) invalid("If-Match");
  const { claim, requestHash } = await idempotency(transaction, actor, {
    key: input.key, correlationId: input.correlationId, operation: "subscriptionRegulatoryPackRevoke",
    payload: { id, reason: reason.trim(), expectedVersion: input.expectedVersion }
  });
  if (claim.state === "replay") return { result: await assignment(transaction, id), replayed: true };
  const before = await assignment(transaction, id);
  if (before.lifecycle_state !== "active" || before.effective_state !== "effective") conflict();
  const updated = await sql<{ subscription_regulatory_pack_id: string }>`
    UPDATE platform.subscription_regulatory_packs SET lifecycle_state='revoked',effective_to=transaction_timestamp(),
      updated_at=transaction_timestamp(),updated_by_user_identity_id=${actor.identity.principalId}::uuid,row_version=row_version+1
     WHERE subscription_regulatory_pack_id=${id}::uuid AND row_version=${input.expectedVersion}
       AND lifecycle_state='active' AND effective_from<transaction_timestamp()
       AND (effective_to IS NULL OR effective_to>transaction_timestamp())
     RETURNING subscription_regulatory_pack_id
  `.execute(transaction);
  if (updated.rows.length !== 1) conflict();
  const result = await assignment(transaction, id);
  await recorded(transaction, actor, { id, operation: "revoke", correlationId: input.correlationId,
    before, after: { ...result, reason: reason.trim() } });
  await completeIdempotency(transaction, { idempotencyRecordId: claim.idempotencyRecordId, requestHash,
    resultStatusCode: "completed", resultRef: `pack:${id}`,
    responseHash: createHash("sha256").update(JSON.stringify(result)).digest("hex") });
  return { result, replayed: false };
}
