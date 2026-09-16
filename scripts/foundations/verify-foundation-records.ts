import pg from "pg";
import { createDatabase } from "../../apps/backend/dist/database.js";
import {
  claimIdempotency,
  completeIdempotency,
  persistAuditEvent,
  persistOutboxEvent
} from "../../apps/backend/dist/persistence/foundation-records.js";
import { newUuidV7 } from "../../apps/backend/dist/uuid.js";
import { resolveTenantContext } from "../../apps/backend/dist/security/tenant-context.js";

const host = process.env.DATABASE_HOST;
const port = Number(process.env.DATABASE_PORT);
const name = process.env.DATABASE_NAME;
if (host !== "127.0.0.1" || port !== 55432 || name !== "tcdx-grc") {
  throw new Error("Foundation-record verification is restricted to 127.0.0.1:55432/tcdx-grc");
}

const database = createDatabase({
  nodeEnv: "test",
  port: 4000,
  database: {
    host,
    port,
    name: "tcdx-grc",
    user: process.env.DATABASE_USER ?? "",
    ...(process.env.DATABASE_PASSWORD ? { password: process.env.DATABASE_PASSWORD } : {}),
    sslMode: "disable"
  },
  oidc: { configured: false },
  aiServiceOrigin: "https://ia2.tcdx.int"
});
const client = new pg.Client({
  host,
  port,
  database: name,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  ssl: false
});
await client.connect();

const tenantId = newUuidV7();
const userIdentityId = newUuidV7();
const tenantMembershipId = newUuidV7();
const correlationId = newUuidV7();
const aggregateId = newUuidV7();
const auditEventId = newUuidV7();
const outboxEventId = newUuidV7();
const eventId = newUuidV7();
const idempotencyRecordId = newUuidV7();
const rollbackAuditId = newUuidV7();
const rollbackOutboxId = newUuidV7();
const requestHash = "a".repeat(64);
const responseHash = "b".repeat(64);
const common = {
  ownershipClass: "TENANT_OWNED" as const,
  tenantId,
  actor: { userIdentityId },
  correlationId
};
const results: Record<string, "PASS" | "BLOCKED"> = {};
const failures: string[] = [];

function record(name: string, pass: boolean, failure: string): void {
  results[name] = pass ? "PASS" : "BLOCKED";
  if (!pass) failures.push(`${name}: ${failure}`);
}

try {
  await client.query(
    "INSERT INTO platform.tenants (tenant_id,tenant_code,legal_name,display_name,default_timezone,lifecycle_state,data_classification) VALUES ($1,$2,'Foundation Records','Foundation Records','UTC','active','internal')",
    [tenantId, `FOUNDATION_${tenantId.slice(-8)}`]
  );
  await client.query(
    "INSERT INTO iam.user_identities (user_identity_id,identity_key,display_name,lifecycle_state) VALUES ($1,$2,'Foundation User','active')",
    [userIdentityId, `foundation-${userIdentityId}`]
  );
  await client.query(
    "INSERT INTO iam.tenant_memberships (tenant_membership_id,tenant_id,user_identity_id,membership_state,joined_at) VALUES ($1,$2,$3,'active',CURRENT_TIMESTAMP)",
    [tenantMembershipId, tenantId, userIdentityId]
  );

  const identity = {
    principalClass: "HUMAN_INTERACTIVE" as const,
    principalId: userIdentityId,
    tokenId: newUuidV7(),
    expiresAt: new Date(Date.now() + 60_000)
  };
  const tenantContext = await resolveTenantContext(database, identity, tenantId);
  record("tenant_context_active_membership", tenantContext.membershipId === tenantMembershipId && tenantContext.tenantId === tenantId, "active membership did not resolve");
  let concealedCode = "";
  try {
    await resolveTenantContext(database, identity, newUuidV7());
  } catch (error) {
    concealedCode = (error as { code?: string }).code ?? "";
  }
  record("tenant_context_concealment", concealedCode === "TCDX.RESOURCE.NOT_FOUND", "foreign or absent tenant was not concealed");

  const firstClaim = await database.transaction().execute(async (transaction) => {
    const claim = await claimIdempotency(transaction, {
      ...common,
      idempotencyRecordId,
      operationCode: "uploadFinalize",
      key: "phase3-foundation-records",
      requestHash
    });
    await persistAuditEvent(transaction, {
      ...common,
      auditEventId,
      eventCode: "audit.evidence.file.finalize.v1",
      aggregateType: "FileObject",
      aggregateId,
      commandCode: "uploadFinalize",
      outcome: "success",
      classification: "restricted"
    });
    await persistOutboxEvent(transaction, {
      ...common,
      outboxEventId,
      eventId,
      eventType: "evidence.file.quarantined.v1",
      aggregateType: "FileObject",
      aggregateId,
      classification: "restricted",
      payload: { file_object_id: aggregateId }
    });
    await completeIdempotency(transaction, {
      idempotencyRecordId,
      requestHash,
      resultStatusCode: "completed",
      resultRef: `FileObject:${aggregateId}`,
      responseHash
    });
    return claim;
  });
  record("first_claim", firstClaim.state === "claimed", "initial idempotency claim was not acquired");

  const persisted = await client.query<{ audit_count: string; outbox_count: string; idempotency_count: string; correlations: string }>(
    `SELECT
       (SELECT count(*) FROM ops_audit.audit_events WHERE audit_event_id=$1) AS audit_count,
       (SELECT count(*) FROM ops_audit.outbox_events WHERE outbox_event_id=$2) AS outbox_count,
       (SELECT count(*) FROM ops_audit.idempotency_records WHERE idempotency_record_id=$3 AND result_status_code='completed') AS idempotency_count,
       (SELECT count(DISTINCT correlation_id) FROM (
          SELECT correlation_id FROM ops_audit.audit_events WHERE audit_event_id=$1
          UNION ALL
          SELECT correlation_id FROM ops_audit.outbox_events WHERE outbox_event_id=$2
        ) correlated) AS correlations`,
    [auditEventId, outboxEventId, idempotencyRecordId]
  );
  const counts = persisted.rows[0];
  record("transactional_records", counts?.audit_count === "1" && counts.outbox_count === "1" && counts.idempotency_count === "1", "required records did not commit together");
  record("correlation_propagation", counts?.correlations === "1", "audit and outbox correlation diverged");

  const replay = await database.transaction().execute((transaction) => claimIdempotency(transaction, {
    ...common,
    idempotencyRecordId: newUuidV7(),
    operationCode: "uploadFinalize",
    key: "phase3-foundation-records",
    requestHash
  }));
  record("identical_replay", replay.state === "replay" && replay.resultRef === `FileObject:${aggregateId}` && replay.responseHash === responseHash, "completed response identity was not replayed");

  let conflictCode = "";
  try {
    await database.transaction().execute((transaction) => claimIdempotency(transaction, {
      ...common,
      idempotencyRecordId: newUuidV7(),
      operationCode: "uploadFinalize",
      key: "phase3-foundation-records",
      requestHash: "c".repeat(64)
    }));
  } catch (error) {
    conflictCode = (error as { code?: string }).code ?? "";
  }
  record("fingerprint_conflict", conflictCode === "TCDX.CONFLICT.IDEMPOTENCY", "changed request hash was not rejected");

  try {
    await database.transaction().execute(async (transaction) => {
      await persistAuditEvent(transaction, {
        ...common,
        auditEventId: rollbackAuditId,
        eventCode: "audit.evidence.file.finalize.v1",
        aggregateType: "FileObject",
        aggregateId,
        commandCode: "uploadFinalize",
        outcome: "failure",
        classification: "restricted"
      });
      await persistOutboxEvent(transaction, {
        ...common,
        outboxEventId: rollbackOutboxId,
        eventId: newUuidV7(),
        eventType: "evidence.file.quarantined.v1",
        aggregateType: "FileObject",
        aggregateId,
        classification: "restricted",
        payload: { file_object_id: aggregateId }
      });
      throw new Error("intentional rollback");
    });
  } catch (error) {
    if ((error as Error).message !== "intentional rollback") throw error;
  }
  const rolledBack = await client.query<{ count: string }>(
    "SELECT count(*) FROM ops_audit.audit_events WHERE audit_event_id=$1 UNION ALL SELECT count(*) FROM ops_audit.outbox_events WHERE outbox_event_id=$2",
    [rollbackAuditId, rollbackOutboxId]
  );
  record("atomic_rollback", rolledBack.rows.every((row) => row.count === "0"), "audit or outbox survived transaction rollback");
} finally {
  await client.query("DELETE FROM ops_audit.outbox_events WHERE outbox_event_id IN ($1,$2)", [outboxEventId, rollbackOutboxId]);
  await client.query("DELETE FROM ops_audit.audit_events WHERE audit_event_id IN ($1,$2)", [auditEventId, rollbackAuditId]);
  await client.query("DELETE FROM ops_audit.idempotency_records WHERE idempotency_record_id=$1", [idempotencyRecordId]);
  await client.query("DELETE FROM iam.tenant_memberships WHERE tenant_membership_id=$1", [tenantMembershipId]);
  await client.query("DELETE FROM iam.user_identities WHERE user_identity_id=$1", [userIdentityId]);
  await client.query("DELETE FROM platform.tenants WHERE tenant_id=$1", [tenantId]);
  await client.end();
  await database.destroy();
}

const pass = failures.length === 0 && Object.values(results).every((result) => result === "PASS");
process.stdout.write(`${JSON.stringify({ foundationRecordsRuntime: pass ? "PASS" : "BLOCKED", results, failures }, null, 2)}\n`);
if (!pass) process.exitCode = 1;
