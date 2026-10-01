import { createHash } from "node:crypto";
import { sql, type Transaction } from "kysely";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import { claimIdempotency, completeIdempotency, persistAuditEvent } from "../persistence/foundation-records.js";
import { newUuidV7 } from "../uuid.js";
import type { CoreActor } from "./model.js";
import { requireAccess } from "./security.js";

const subjectTypes = new Set([
  "organization", "organizational_unit", "process", "service", "asset", "system",
  "application", "data_asset", "identity", "group", "supplier", "contract",
  "location", "repository", "pipeline", "cloud_account", "cloud_resource",
  "project", "ticket", "document", "control", "requirement", "risk", "incident",
  "audit", "action"
]);

function invalid(field: string): never {
  throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field });
}

type SubjectProjection = {
  subject_id: string; subject_type: string; canonical_key: string; display_name: string;
  lifecycle_state: string; effective_from: string; effective_to: null;
};

async function projection(tx: Transaction<FoundationDatabase>, tenantId: string, subjectId: string): Promise<SubjectProjection> {
  const result = await sql<{ subject_id: string; subject_type: string; canonical_key: string; display_name: string;
    lifecycle_state: string; effective_from: Date }>`
    SELECT subject_id,subject_type,canonical_key,display_name,lifecycle_state,effective_from
      FROM org.subjects WHERE tenant_id=${tenantId}::uuid AND subject_id=${subjectId}::uuid
  `.execute(tx);
  const row = result.rows[0];
  if (!row) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
  return { ...row, effective_from: row.effective_from.toISOString(), effective_to: null };
}

export async function subjectCreate(tx: Transaction<FoundationDatabase>, actor: CoreActor, input: {
  body: unknown; key: string; correlationId: string;
}): Promise<{ result: SubjectProjection; replayed: boolean }> {
  requireAccess(actor, "organization.subject.create", "CORE_PLATFORM", ["tenant"]);
  if (!actor.roles.includes("TENANT_ADMIN")) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
  if (!input.body || typeof input.body !== "object" || Array.isArray(input.body)) invalid("body");
  const body = input.body as Record<string, unknown>;
  if (Object.keys(body).some((field) => !["subject_type", "canonical_key", "display_name"].includes(field))) invalid("body");
  const subjectType = body.subject_type;
  const canonicalKey = body.canonical_key;
  const displayName = body.display_name;
  if (typeof subjectType !== "string" || !subjectTypes.has(subjectType)) invalid("subject_type");
  if (typeof canonicalKey !== "string" || !canonicalKey.trim() || canonicalKey.length > 255) invalid("canonical_key");
  if (typeof displayName !== "string" || !displayName.trim()) invalid("display_name");
  if (!input.key || input.key.length > 255) invalid("Idempotency-Key");
  const requestHash = createHash("sha256").update(JSON.stringify([subjectType,canonicalKey,displayName])).digest("hex");
  const claim = await claimIdempotency(tx, { idempotencyRecordId: newUuidV7(), ownershipClass: "TENANT_OWNED",
    tenantId: actor.tenantId, actor: { userIdentityId: actor.userIdentityId }, correlationId: input.correlationId,
    operationCode: "subjectCreate", key: input.key, requestHash });
  if (claim.state === "replay") {
    const subjectId = claim.resultRef?.split(":")[1];
    if (!subjectId) throw new FoundationError("TCDX.CONFLICT.RESOURCE", "Resource conflict", 409);
    return { result: await projection(tx, actor.tenantId, subjectId), replayed: true };
  }
  const existing = await sql<{ subject_id: string }>`
    SELECT subject_id FROM org.subjects WHERE tenant_id=${actor.tenantId}::uuid
      AND subject_type=${subjectType} AND canonical_key=${canonicalKey}
      AND lifecycle_state='active' AND superseded_by_subject_id IS NULL
      AND effective_from<=transaction_timestamp()
      AND (effective_to IS NULL OR effective_to>transaction_timestamp())
    FOR UPDATE
  `.execute(tx);
  if (existing.rows.length) throw new FoundationError("TCDX.CONFLICT.RESOURCE", "Subject already active", 409);
  const subjectId = newUuidV7();
  try {
    await sql`INSERT INTO org.subjects
      (subject_id,tenant_id,subject_type,canonical_key,display_name,lifecycle_state,effective_from,effective_to,
       created_by_user_identity_id,updated_by_user_identity_id)
      VALUES (${subjectId}::uuid,${actor.tenantId}::uuid,${subjectType},${canonicalKey},${displayName},
        'active',transaction_timestamp(),NULL,${actor.userIdentityId}::uuid,${actor.userIdentityId}::uuid)
    `.execute(tx);
  } catch (error) {
    if (typeof error === "object" && error && ("code" in error) && (error.code === "23P01" || error.code === "23505")) {
      throw new FoundationError("TCDX.CONFLICT.RESOURCE", "Subject already active", 409);
    }
    throw error;
  }
  const result = await projection(tx, actor.tenantId, subjectId);
  await persistAuditEvent(tx, { auditEventId: newUuidV7(), ownershipClass: "TENANT_OWNED", tenantId: actor.tenantId,
    actor: { userIdentityId: actor.userIdentityId }, correlationId: input.correlationId,
    eventCode: "audit.organization.subject.create.v1", aggregateType: "Subject", aggregateId: subjectId,
    commandCode: "subjectCreate", outcome: "success", classification: "confidential",
    after: { subject_id: subjectId, subject_type: subjectType, canonical_key: canonicalKey, lifecycle_state: "active" } });
  await completeIdempotency(tx, { idempotencyRecordId: claim.idempotencyRecordId, requestHash,
    resultStatusCode: "completed", resultRef: `subject:${subjectId}`,
    responseHash: createHash("sha256").update(JSON.stringify(result)).digest("hex") });
  return { result, replayed: false };
}
