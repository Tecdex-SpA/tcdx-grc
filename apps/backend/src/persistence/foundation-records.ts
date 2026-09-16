import { sql, type Transaction } from "kysely";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import type { OwnershipClass } from "../security/ownership.js";

export type ActorReference = { userIdentityId: string; servicePrincipalId?: never } | { userIdentityId?: never; servicePrincipalId: string };

type CommonRecord = {
  ownershipClass: OwnershipClass;
  tenantId: string | null;
  actor: ActorReference;
  correlationId: string;
};

function actorValues(actor: ActorReference): [string | null, string | null] {
  return [actor.userIdentityId ?? null, actor.servicePrincipalId ?? null];
}

export async function persistAuditEvent(transaction: Transaction<FoundationDatabase>, record: CommonRecord & {
  auditEventId: string;
  eventCode: string;
  aggregateType: string;
  aggregateId: string;
  commandCode: string;
  outcome: string;
  classification: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}): Promise<void> {
  const [actorUserId, actorServiceId] = actorValues(record.actor);
  await sql`
    INSERT INTO ops_audit.audit_events
      (audit_event_id,ownership_class,tenant_id,correlation_id,event_code,event_version,aggregate_type,aggregate_id,
       command_code,actor_user_identity_id,actor_service_principal_id,occurred_at,outcome,before_payload,after_payload,classification)
    VALUES (${record.auditEventId}::uuid,${record.ownershipClass},${record.tenantId}::uuid,${record.correlationId}::uuid,
      ${record.eventCode},1,${record.aggregateType},${record.aggregateId}::uuid,${record.commandCode},
      ${actorUserId}::uuid,${actorServiceId}::uuid,CURRENT_TIMESTAMP,${record.outcome},
      ${JSON.stringify(record.before ?? null)}::jsonb,${JSON.stringify(record.after ?? null)}::jsonb,${record.classification})
  `.execute(transaction);
}

export async function persistOutboxEvent(transaction: Transaction<FoundationDatabase>, record: CommonRecord & {
  outboxEventId: string;
  eventId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  classification: string;
  payload: Record<string, unknown>;
  causationId?: string;
}): Promise<void> {
  const [actorUserId, actorServiceId] = actorValues(record.actor);
  await sql`
    INSERT INTO ops_audit.outbox_events
      (outbox_event_id,ownership_class,tenant_id,correlation_id,causation_id,event_id,event_type,event_version,
       aggregate_type,aggregate_id,occurred_at,actor_user_identity_id,actor_service_principal_id,payload,classification)
    VALUES (${record.outboxEventId}::uuid,${record.ownershipClass},${record.tenantId}::uuid,${record.correlationId}::uuid,
      ${record.causationId ?? null}::uuid,${record.eventId}::uuid,${record.eventType},1,${record.aggregateType},
      ${record.aggregateId}::uuid,CURRENT_TIMESTAMP,${actorUserId}::uuid,${actorServiceId}::uuid,
      ${JSON.stringify(record.payload)}::jsonb,${record.classification})
  `.execute(transaction);
}

export async function claimIdempotency(transaction: Transaction<FoundationDatabase>, record: CommonRecord & {
  idempotencyRecordId: string;
  operationCode: string;
  key: string;
  requestHash: string;
}): Promise<
  | { state: "claimed"; idempotencyRecordId: string }
  | { state: "replay"; idempotencyRecordId: string; resultStatusCode: string; resultRef: string | null; responseHash: string | null }
> {
  const [actorUserId, actorServiceId] = actorValues(record.actor);
  const inserted = await sql<{ idempotency_record_id: string }>`
    INSERT INTO ops_audit.idempotency_records
      (idempotency_record_id,ownership_class,tenant_id,actor_user_identity_id,actor_service_principal_id,
       operation_code,idempotency_key,request_hash,result_status_code,first_seen_at)
    VALUES (${record.idempotencyRecordId}::uuid,${record.ownershipClass},${record.tenantId}::uuid,
      ${actorUserId}::uuid,${actorServiceId}::uuid,${record.operationCode},${record.key},${record.requestHash},'in_progress',CURRENT_TIMESTAMP)
    ON CONFLICT DO NOTHING RETURNING idempotency_record_id
  `.execute(transaction);
  if (inserted.rows.length === 1) return { state: "claimed", idempotencyRecordId: record.idempotencyRecordId };
  const existing = await sql<{
    idempotency_record_id: string;
    request_hash: string;
    result_status_code: string;
    result_ref: string | null;
    response_hash: string | null;
  }>`
    SELECT idempotency_record_id,request_hash,result_status_code,result_ref,response_hash
      FROM ops_audit.idempotency_records
     WHERE ownership_class=${record.ownershipClass}
       AND tenant_id IS NOT DISTINCT FROM ${record.tenantId}::uuid
       AND actor_user_identity_id IS NOT DISTINCT FROM ${actorUserId}::uuid
       AND actor_service_principal_id IS NOT DISTINCT FROM ${actorServiceId}::uuid
       AND operation_code=${record.operationCode} AND idempotency_key=${record.key}
  `.execute(transaction);
  const previous = existing.rows[0];
  if (previous?.request_hash !== record.requestHash) {
    throw new FoundationError("TCDX.CONFLICT.IDEMPOTENCY", "Idempotency conflict", 409);
  }
  if (previous.result_status_code === "in_progress") {
    throw new FoundationError("TCDX.CONFLICT.IDEMPOTENCY_IN_PROGRESS", "Idempotent operation is in progress", 409, true);
  }
  return {
    state: "replay",
    idempotencyRecordId: previous.idempotency_record_id,
    resultStatusCode: previous.result_status_code,
    resultRef: previous.result_ref,
    responseHash: previous.response_hash
  };
}

export async function completeIdempotency(transaction: Transaction<FoundationDatabase>, completion: {
  idempotencyRecordId: string;
  requestHash: string;
  resultStatusCode: "completed" | "failed";
  resultRef: string;
  responseHash: string;
}): Promise<void> {
  const result = await sql`
    UPDATE ops_audit.idempotency_records
       SET result_status_code=${completion.resultStatusCode},result_ref=${completion.resultRef},response_hash=${completion.responseHash}
     WHERE idempotency_record_id=${completion.idempotencyRecordId}::uuid
       AND request_hash=${completion.requestHash}
       AND result_status_code='in_progress'
  `.execute(transaction);
  if (Number(result.numAffectedRows) !== 1) {
    throw new FoundationError("TCDX.CONFLICT.IDEMPOTENCY", "Idempotency completion conflict", 409);
  }
}
