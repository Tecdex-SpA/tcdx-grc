import { sql, type Transaction } from "kysely";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import type { OwnershipClass } from "../security/ownership.js";

export type PersistedOutboxContext = {
  outboxEventId: string;
  eventId: string;
  eventType: string;
  eventVersion: number;
  ownershipClass: OwnershipClass;
  tenantId: string | null;
  correlationId: string;
  causationId: string | null;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  classification: string;
  attemptCount: number;
};

export type OutboxClaimAuthorizer = (
  servicePrincipalId: string,
  persistedContext: Readonly<PersistedOutboxContext>
) => void | Promise<void>;

export type OutboxClaimRequest = {
  servicePrincipalId: string;
  supportedEventVersions: Readonly<Record<string, ReadonlySet<number>>>;
  leaseUntil: Date;
  count: number;
  authorize: OutboxClaimAuthorizer;
};

export type RejectedOutboxEvent = {
  outboxEventId: string;
  eventId: string;
  eventType: string;
  eventVersion: number;
  errorCode: "TCDX.EVENT.VERSION.UNSUPPORTED";
};

export type OutboxClaimResult = {
  claimed: PersistedOutboxContext[];
  rejected: RejectedOutboxEvent[];
};

export type OutboxCompletion =
  | { outcome: "delivered" }
  | { outcome: "retry"; availableAt: Date; errorCode: string }
  | { outcome: "failed"; errorCode: string };

type OutboxRow = {
  outbox_event_id: string;
  event_id: string;
  event_type: string;
  event_version: number;
  ownership_class: OwnershipClass;
  tenant_id: string | null;
  correlation_id: string;
  causation_id: string | null;
  aggregate_type: string;
  aggregate_id: string;
  payload: Record<string, unknown>;
  classification: string;
  attempt_count: number;
};

const SAFE_ERROR_CODE = /^[A-Z0-9]+(?:[._-][A-Z0-9]+)*$/;

function assertDate(value: Date, field: string): void {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new FoundationError("TCDX.VALIDATION.INVALID", `Invalid ${field}`, 400);
  }
}

function assertErrorCode(value: string): void {
  if (!SAFE_ERROR_CODE.test(value)) {
    throw new FoundationError("TCDX.VALIDATION.INVALID", "Invalid outbox error code", 400);
  }
}

function toContext(row: OutboxRow, attemptCount = row.attempt_count): PersistedOutboxContext {
  return {
    outboxEventId: row.outbox_event_id,
    eventId: row.event_id,
    eventType: row.event_type,
    eventVersion: row.event_version,
    ownershipClass: row.ownership_class,
    tenantId: row.tenant_id,
    correlationId: row.correlation_id,
    causationId: row.causation_id,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    payload: row.payload,
    classification: row.classification,
    attemptCount
  };
}

export async function claimOutboxEvents(
  transaction: Transaction<FoundationDatabase>,
  request: OutboxClaimRequest
): Promise<OutboxClaimResult> {
  if (!request.servicePrincipalId) {
    throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
  }
  if (!Number.isSafeInteger(request.count) || request.count < 1) {
    throw new FoundationError("TCDX.VALIDATION.INVALID", "Invalid outbox claim count", 400);
  }
  assertDate(request.leaseUntil, "outbox lease");
  if (request.leaseUntil.getTime() <= Date.now()) {
    throw new FoundationError("TCDX.VALIDATION.INVALID", "Outbox lease must expire in the future", 400);
  }
  const eventTypes = Object.keys(request.supportedEventVersions);
  if (eventTypes.length === 0) return { claimed: [], rejected: [] };

  const candidates = await sql<OutboxRow>`
    SELECT outbox_event_id,event_id,event_type,event_version,ownership_class,tenant_id,correlation_id,causation_id,
           aggregate_type,aggregate_id,payload,classification,attempt_count
      FROM ops_audit.outbox_events
     WHERE event_type = ANY(${eventTypes}::text[])
       AND available_at <= CURRENT_TIMESTAMP
       AND delivery_status IN ('pending','retry','processing')
     ORDER BY available_at,event_id
     FOR UPDATE SKIP LOCKED
     LIMIT ${request.count}
  `.execute(transaction);

  const claimed: PersistedOutboxContext[] = [];
  const rejected: RejectedOutboxEvent[] = [];
  for (const row of candidates.rows) {
    const supportedVersions = request.supportedEventVersions[row.event_type];
    if (!supportedVersions?.has(row.event_version)) {
      await sql`
        UPDATE ops_audit.outbox_events
           SET delivery_status='failed',attempt_count=attempt_count+1,
               last_error_code='TCDX.EVENT.VERSION.UNSUPPORTED'
         WHERE outbox_event_id=${row.outbox_event_id}::uuid
      `.execute(transaction);
      rejected.push({
        outboxEventId: row.outbox_event_id,
        eventId: row.event_id,
        eventType: row.event_type,
        eventVersion: row.event_version,
        errorCode: "TCDX.EVENT.VERSION.UNSUPPORTED"
      });
      continue;
    }

    const persistedContext = toContext(row, row.attempt_count + 1);
    await request.authorize(request.servicePrincipalId, persistedContext);
    await sql`
      UPDATE ops_audit.outbox_events
         SET delivery_status='processing',attempt_count=attempt_count+1,
             available_at=${request.leaseUntil},last_error_code=NULL
       WHERE outbox_event_id=${row.outbox_event_id}::uuid
    `.execute(transaction);
    claimed.push(persistedContext);
  }
  return { claimed, rejected };
}

export async function completeOutboxEvent(
  transaction: Transaction<FoundationDatabase>,
  claim: Readonly<Pick<PersistedOutboxContext, "outboxEventId" | "attemptCount">>,
  completion: OutboxCompletion
): Promise<void> {
  let result: { numAffectedRows?: bigint | number };
  if (completion.outcome === "delivered") {
    result = await sql`
      UPDATE ops_audit.outbox_events
         SET delivery_status='delivered',delivered_at=CURRENT_TIMESTAMP,last_error_code=NULL
       WHERE outbox_event_id=${claim.outboxEventId}::uuid
         AND delivery_status='processing' AND attempt_count=${claim.attemptCount}
    `.execute(transaction);
  } else if (completion.outcome === "retry") {
    assertDate(completion.availableAt, "outbox retry availability");
    assertErrorCode(completion.errorCode);
    result = await sql`
      UPDATE ops_audit.outbox_events
         SET delivery_status='retry',available_at=${completion.availableAt},last_error_code=${completion.errorCode}
       WHERE outbox_event_id=${claim.outboxEventId}::uuid
         AND delivery_status='processing' AND attempt_count=${claim.attemptCount}
    `.execute(transaction);
  } else {
    assertErrorCode(completion.errorCode);
    result = await sql`
      UPDATE ops_audit.outbox_events
         SET delivery_status='failed',last_error_code=${completion.errorCode}
       WHERE outbox_event_id=${claim.outboxEventId}::uuid
         AND delivery_status='processing' AND attempt_count=${claim.attemptCount}
    `.execute(transaction);
  }

  if (Number(result.numAffectedRows ?? 0) !== 1) {
    throw new FoundationError("TCDX.CONFLICT.CONCURRENCY", "Outbox claim is no longer current", 409, true);
  }
}
