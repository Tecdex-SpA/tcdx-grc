import { createHash } from "node:crypto";
import { sql, type Kysely, type Transaction } from "kysely";
import { validate as validateUuid } from "uuid";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import { claimIdempotency, completeIdempotency, persistAuditEvent } from "../persistence/foundation-records.js";
import { requirePlatformAccess, type PlatformActor } from "../security/platform-authority.js";
import { newUuidV7 } from "../uuid.js";
import { effectiveTenantClassification } from "./tenant-classification.js";

type Executor = Kysely<FoundationDatabase> | Transaction<FoundationDatabase>;
type Body = Record<string, unknown>;

function invalid(field: string): never {
  throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field });
}
function notFound(): never { throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404); }
function conflict(): never { throw new FoundationError("TCDX.CONFLICT.RESOURCE", "Resource conflict", 409); }
function closedBody(value: unknown, allowed: string[], required: string[]): Body {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid("body");
  const body = value as Body;
  for (const key of Object.keys(body)) if (!allowed.includes(key)) invalid(key);
  for (const key of required) if (body[key] === undefined || body[key] === null || body[key] === "") invalid(key);
  return body;
}
function uuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !validateUuid(value)) invalid(field);
  return value as string;
}
function date(value: unknown, field: string): Date {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(value)) invalid(field);
  const parsed = new Date(value as string);
  if (Number.isNaN(parsed.getTime())) invalid(field);
  return parsed;
}
function hash(value: unknown): string { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }

async function claim(tx: Transaction<FoundationDatabase>, actor: PlatformActor,
  operation: string, key: string, correlationId: string, payload: unknown) {
  if (!key || key.length > 255) invalid("Idempotency-Key");
  const requestHash = hash(payload);
  const result = await claimIdempotency(tx, { idempotencyRecordId: newUuidV7(), ownershipClass: "PLATFORM_CONTROL",
    tenantId: null, actor: { userIdentityId: actor.identity.principalId }, correlationId,
    operationCode: operation, key, requestHash });
  return { result, requestHash };
}

async function audit(tx: Transaction<FoundationDatabase>, actor: PlatformActor, correlationId: string,
  eventCode: string, aggregateType: string, aggregateId: string, after: Record<string, unknown>, before?: Record<string, unknown>) {
  await persistAuditEvent(tx, { auditEventId: newUuidV7(), ownershipClass: "PLATFORM_CONTROL", tenantId: null,
    actor: { userIdentityId: actor.identity.principalId }, correlationId, eventCode,
    aggregateType, aggregateId, commandCode: eventCode, outcome: "success", classification: "confidential",
    ...(before ? { before } : {}), after });
}

export async function validationProvenanceCreate(tx: Transaction<FoundationDatabase>, actor: PlatformActor, input: {
  body: unknown; key: string; correlationId: string;
}) {
  requirePlatformAccess(actor, "platform.regulatory_pack_validation_access.create", actor.roles.includes("PLATFORM_ADMIN"));
  const body = closedBody(input.body,
    ["regulatory_pack_version_id", "regulatory_import_manifest_id", "source_role", "provenance_ref"],
    ["regulatory_pack_version_id", "regulatory_import_manifest_id", "source_role", "provenance_ref"]);
  const versionId = uuid(body.regulatory_pack_version_id, "regulatory_pack_version_id");
  const manifestId = uuid(body.regulatory_import_manifest_id, "regulatory_import_manifest_id");
  const sourceRole = body.source_role;
  if (!["provisional_supporting_reference", "supporting_reference", "test_data_source"].includes(String(sourceRole))) invalid("source_role");
  const provenanceRef = body.provenance_ref;
  if (typeof provenanceRef !== "string" || !provenanceRef.trim() || provenanceRef.length > 2000) invalid("provenance_ref");
  const { result: idempotency, requestHash } = await claim(tx, actor, "validationProvenanceCreate", input.key,
    input.correlationId, [versionId,manifestId,sourceRole,provenanceRef]);
  if (idempotency.state === "replay") return { result: { regulatory_pack_validation_provenance_id: idempotency.resultRef?.split(":")[1] }, replayed: true };
  const source = await sql<{ regulatory_source_id: string; import_checksum: string }>`
    SELECT im.regulatory_source_id,im.import_checksum
      FROM regulatory.regulatory_import_manifests im
      JOIN regulatory.regulatory_sources rs ON rs.regulatory_source_id=im.regulatory_source_id
      JOIN regulatory.regulatory_pack_versions pv ON pv.regulatory_pack_version_id=im.regulatory_pack_version_id
      JOIN regulatory.regulatory_packs p ON p.regulatory_pack_id=pv.regulatory_pack_id
     WHERE im.regulatory_import_manifest_id=${manifestId}::uuid
       AND im.regulatory_pack_version_id=${versionId}::uuid
       AND im.outcome IN ('validated','validated_test_non_authoritative')
       AND rs.license_classification IN ('NOT_YET_LICENSED','non_authoritative_test_pack')
       AND pv.license_classification IN ('NOT_YET_LICENSED','non_authoritative_test_pack')
       AND pv.lifecycle_state='draft' AND p.lifecycle_state='draft'
       AND EXISTS (SELECT 1 FROM regulatory.regulatory_pack_framework_versions pfv
         JOIN regulatory.normative_units nu ON nu.framework_version_id=pfv.framework_version_id
         WHERE pfv.regulatory_pack_version_id=pv.regulatory_pack_version_id
           AND nu.provenance_ref=${provenanceRef})
     FOR SHARE OF im,pv,p
  `.execute(tx);
  if (source.rows.length !== 1) notFound();
  const existing = await sql<{ regulatory_pack_validation_provenance_id: string }>`
    SELECT regulatory_pack_validation_provenance_id FROM regulatory.regulatory_pack_validation_provenances
     WHERE regulatory_pack_version_id=${versionId}::uuid FOR UPDATE
  `.execute(tx);
  if (existing.rows.length) conflict();
  const id = newUuidV7();
  await sql`INSERT INTO regulatory.regulatory_pack_validation_provenances
    (regulatory_pack_validation_provenance_id,regulatory_pack_version_id,regulatory_import_manifest_id,
     regulatory_source_id,source_role,provenance_ref,source_checksum,created_by_user_identity_id)
    VALUES (${id}::uuid,${versionId}::uuid,${manifestId}::uuid,
      ${source.rows[0]!.regulatory_source_id}::uuid,${String(sourceRole)},${provenanceRef},
      ${source.rows[0]!.import_checksum},${actor.identity.principalId}::uuid)
  `.execute(tx);
  const result = { regulatory_pack_validation_provenance_id: id, regulatory_pack_version_id: versionId,
    source_role: sourceRole, provenance_ref: provenanceRef, authority_class: "NON_AUTHORITATIVE_TEST_PACK" };
  await audit(tx, actor, input.correlationId, "audit.platform.regulatory_pack_validation_provenance.create.v1",
    "RegulatoryPackValidationProvenance", id, result);
  await completeIdempotency(tx, { idempotencyRecordId: idempotency.idempotencyRecordId, requestHash,
    resultStatusCode: "completed", resultRef: `provenance:${id}`, responseHash: hash(result) });
  return { result, replayed: false };
}

async function accessDetail(executor: Executor, id: string, tenantId?: string) {
  const result = await sql<{ regulatory_pack_validation_access_id: string; tenant_id: string;
    regulatory_pack_version_id: string; regulatory_pack_validation_provenance_id: string;
    lifecycle_state: string; effective_from: Date; effective_to: Date | null; row_version: string;
    pack_code: string; name: string; edition: string; license_classification: string }>`
    SELECT va.regulatory_pack_validation_access_id,va.tenant_id,va.regulatory_pack_version_id,
           va.regulatory_pack_validation_provenance_id,va.lifecycle_state,va.effective_from,va.effective_to,va.row_version,
           p.pack_code,p.name,pv.edition,pv.license_classification
      FROM platform.regulatory_pack_validation_accesses va
      JOIN regulatory.regulatory_pack_versions pv ON pv.regulatory_pack_version_id=va.regulatory_pack_version_id
      JOIN regulatory.regulatory_packs p ON p.regulatory_pack_id=pv.regulatory_pack_id
     WHERE va.regulatory_pack_validation_access_id=${id}::uuid
       AND (${tenantId ?? null}::uuid IS NULL OR va.tenant_id=${tenantId ?? null}::uuid)
  `.execute(executor);
  const row = result.rows[0];
  if (!row) notFound();
  return { ...row, row_version: Number(row.row_version), access_mode: "non_authoritative_validation" as const,
    effective_from: row.effective_from.toISOString(), effective_to: row.effective_to?.toISOString() ?? null,
    effective_state: row.lifecycle_state === "revoked" ? "revoked" : row.effective_from.getTime() > Date.now() ? "future"
      : row.effective_to && row.effective_to.getTime() <= Date.now() ? "expired" : "effective" };
}

export async function listValidationAccesses(executor: Executor, tenantId: string, query: Record<string, unknown> = {}) {
  if (Object.keys(query).some((key) => key !== "page[size]" && key !== "page[cursor]")) invalid("query");
  const size = query["page[size]"] === undefined ? 25 : Number(query["page[size]"]);
  if (!Number.isInteger(size) || size < 1 || size > 100) invalid("page[size]");
  let after: { created_at: string; id: string } | null = null;
  if (query["page[cursor]"] !== undefined) {
    try {
      if (typeof query["page[cursor]"] !== "string" || query["page[cursor]"].length > 2048) invalid("page[cursor]");
      const parsed = JSON.parse(Buffer.from(query["page[cursor]"] as string,"base64url").toString("utf8")) as {
        tenant_id?: string; created_at?: string; id?: string
      };
      if (parsed.tenant_id !== tenantId || !parsed.created_at || Number.isNaN(Date.parse(parsed.created_at)) ||
          !parsed.id || !validateUuid(parsed.id)) invalid("page[cursor]");
      after = { created_at: parsed.created_at, id: parsed.id };
    } catch { invalid("page[cursor]"); }
  }
  const rows = await sql<{ regulatory_pack_validation_access_id: string; created_at: Date }>`
    SELECT regulatory_pack_validation_access_id,created_at FROM platform.regulatory_pack_validation_accesses
     WHERE tenant_id=${tenantId}::uuid
       AND (${after?.created_at ?? null}::timestamptz IS NULL OR
         (created_at,regulatory_pack_validation_access_id)<
           (${after?.created_at ?? null}::timestamptz,${after?.id ?? null}::uuid))
     ORDER BY created_at DESC,regulatory_pack_validation_access_id DESC LIMIT ${size+1}
  `.execute(executor);
  const items = [];
  for (const row of rows.rows.slice(0,size)) items.push(await accessDetail(executor,row.regulatory_pack_validation_access_id,tenantId));
  const last = rows.rows[size-1];
  return { items, page: { has_more: rows.rows.length > size,
    next_cursor: rows.rows.length > size && last ? Buffer.from(JSON.stringify({
      tenant_id:tenantId,created_at:last.created_at.toISOString(),id:last.regulatory_pack_validation_access_id
    }),"utf8").toString("base64url") : null } };
}

export async function validationAccessCreate(tx: Transaction<FoundationDatabase>, actor: PlatformActor, input: {
  body: unknown; key: string; correlationId: string; runtimeEnvironment: "development" | "test" | "qa" | "production";
}) {
  requirePlatformAccess(actor, "platform.regulatory_pack_validation_access.create", actor.roles.includes("PLATFORM_ADMIN"));
  if (input.runtimeEnvironment === "production") throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
  const body = closedBody(input.body,
    ["tenant_id", "regulatory_pack_version_id", "regulatory_pack_validation_provenance_id", "effective_from", "effective_to"],
    ["tenant_id", "regulatory_pack_version_id", "regulatory_pack_validation_provenance_id", "effective_from"]);
  const tenantId = uuid(body.tenant_id,"tenant_id");
  const versionId = uuid(body.regulatory_pack_version_id,"regulatory_pack_version_id");
  const provenanceId = uuid(body.regulatory_pack_validation_provenance_id,"regulatory_pack_validation_provenance_id");
  const effectiveFrom = date(body.effective_from,"effective_from");
  const effectiveTo = body.effective_to == null ? null : date(body.effective_to,"effective_to");
  if (effectiveTo && effectiveTo <= effectiveFrom) invalid("effective_to");
  const { result: idempotency, requestHash } = await claim(tx, actor, "validationAccessCreate", input.key,
    input.correlationId, [tenantId,versionId,provenanceId,effectiveFrom.toISOString(),effectiveTo?.toISOString()]);
  if (idempotency.state === "replay") {
    const id = idempotency.resultRef?.split(":")[1];
    if (!id) conflict();
    return { result: await accessDetail(tx,id), replayed: true };
  }
  const tenant = await sql<{ tenant_id: string }>`
    SELECT tenant_id FROM platform.tenants WHERE tenant_id=${tenantId}::uuid AND lifecycle_state='active' FOR UPDATE
  `.execute(tx);
  if (tenant.rows.length !== 1) notFound();
  const classification = await effectiveTenantClassification(tx,tenantId);
  if (classification.value !== "demo" && classification.value !== "test") throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
  const version = await sql<{ regulatory_pack_version_id: string }>`
    SELECT pv.regulatory_pack_version_id FROM regulatory.regulatory_pack_versions pv
    JOIN regulatory.regulatory_packs p ON p.regulatory_pack_id=pv.regulatory_pack_id
    JOIN regulatory.regulatory_pack_validation_provenances vp
      ON vp.regulatory_pack_version_id=pv.regulatory_pack_version_id
    WHERE pv.regulatory_pack_version_id=${versionId}::uuid
      AND vp.regulatory_pack_validation_provenance_id=${provenanceId}::uuid
      AND vp.authority_class='NON_AUTHORITATIVE_TEST_PACK'
      AND pv.lifecycle_state='draft' AND p.lifecycle_state='draft'
      AND pv.license_classification IN ('NOT_YET_LICENSED','non_authoritative_test_pack')
      AND (pv.effective_from IS NULL OR pv.effective_from<=${effectiveFrom.toISOString()}::timestamptz)
      AND (pv.effective_to IS NULL OR pv.effective_to>${effectiveFrom.toISOString()}::timestamptz)
  `.execute(tx);
  if (version.rows.length !== 1) notFound();
  const id = newUuidV7();
  try {
    await sql`INSERT INTO platform.regulatory_pack_validation_accesses
      (regulatory_pack_validation_access_id,tenant_id,regulatory_pack_version_id,
       regulatory_pack_validation_provenance_id,effective_from,effective_to,
       created_by_user_identity_id,updated_by_user_identity_id)
      VALUES (${id}::uuid,${tenantId}::uuid,${versionId}::uuid,${provenanceId}::uuid,
        ${effectiveFrom.toISOString()}::timestamptz,${effectiveTo?.toISOString() ?? null}::timestamptz,
        ${actor.identity.principalId}::uuid,${actor.identity.principalId}::uuid)
    `.execute(tx);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "23P01") conflict();
    throw error;
  }
  const result = await accessDetail(tx,id);
  await audit(tx, actor, input.correlationId, "audit.platform.regulatory_pack_validation_access.create.v1",
    "RegulatoryPackValidationAccess",id,result);
  await completeIdempotency(tx, { idempotencyRecordId: idempotency.idempotencyRecordId, requestHash,
    resultStatusCode: "completed", resultRef: `validation-access:${id}`, responseHash: hash(result) });
  return { result, replayed: false };
}

export async function validationAccessRevoke(tx: Transaction<FoundationDatabase>, actor: PlatformActor, input: {
  id: string; body: unknown; expectedVersion: number; key: string; correlationId: string;
}) {
  requirePlatformAccess(actor, "platform.regulatory_pack_validation_access.archive", actor.roles.includes("PLATFORM_ADMIN"));
  const id = uuid(input.id,"regulatory_pack_validation_access_id");
  const body = closedBody(input.body,["reason"],["reason"]);
  if (typeof body.reason !== "string" || !body.reason.trim() || body.reason.length > 2000) invalid("reason");
  if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 1) invalid("If-Match");
  const { result: idempotency, requestHash } = await claim(tx,actor,"validationAccessRevoke",input.key,input.correlationId,
    [id,body.reason,input.expectedVersion]);
  if (idempotency.state === "replay") return { result: await accessDetail(tx,id), replayed: true };
  const before = await accessDetail(tx,id);
  if (before.lifecycle_state !== "active" || before.effective_state === "expired") conflict();
  const updated = await sql<{ regulatory_pack_validation_access_id: string }>`
    UPDATE platform.regulatory_pack_validation_accesses
       SET lifecycle_state='revoked',effective_to=GREATEST(transaction_timestamp(),effective_from),row_version=row_version+1,
           updated_at=transaction_timestamp(),updated_by_user_identity_id=${actor.identity.principalId}::uuid
     WHERE regulatory_pack_validation_access_id=${id}::uuid AND row_version=${input.expectedVersion}
       AND lifecycle_state='active'
       AND (effective_to IS NULL OR effective_to>transaction_timestamp())
     RETURNING regulatory_pack_validation_access_id
  `.execute(tx);
  if (updated.rows.length !== 1) conflict();
  const result = await accessDetail(tx,id);
  await audit(tx,actor,input.correlationId,"audit.platform.regulatory_pack_validation_access.revoke.v1",
    "RegulatoryPackValidationAccess",id,{ ...result, reason: body.reason.trim() },before);
  await completeIdempotency(tx,{ idempotencyRecordId: idempotency.idempotencyRecordId,requestHash,
    resultStatusCode:"completed",resultRef:`validation-access:${id}`,responseHash:hash(result) });
  return { result, replayed:false };
}
