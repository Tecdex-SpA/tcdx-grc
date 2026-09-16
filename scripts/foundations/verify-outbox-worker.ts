import pg from "pg";
import { createDatabase } from "../../apps/backend/dist/database.js";
import { claimOutboxEvents, completeOutboxEvent, type PersistedOutboxContext } from "../../apps/backend/dist/persistence/outbox-worker.js";
import { newUuidV7 } from "../../apps/backend/dist/uuid.js";

const host = process.env.DATABASE_HOST;
const port = Number(process.env.DATABASE_PORT);
const name = process.env.DATABASE_NAME;
if (host !== "127.0.0.1" || port !== 55432 || name !== "tcdx-grc") {
  throw new Error("Outbox verification is restricted to 127.0.0.1:55432/tcdx-grc");
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

const tenantA = newUuidV7();
const tenantB = newUuidV7();
const servicePrincipalId = newUuidV7();
const eventType = "evidence.file.quarantined.v1";
const insertedOutboxIds: string[] = [];
const authorizedContexts: PersistedOutboxContext[] = [];
const results: Record<string, "PASS" | "BLOCKED"> = {};
const failures: string[] = [];

function record(name: string, pass: boolean, failure: string): void {
  results[name] = pass ? "PASS" : "BLOCKED";
  if (!pass) failures.push(`${name}: ${failure}`);
}

async function insertEvent(tenantId: string, eventVersion: number): Promise<string> {
  const outboxEventId = newUuidV7();
  insertedOutboxIds.push(outboxEventId);
  await client.query(
    `INSERT INTO ops_audit.outbox_events
      (outbox_event_id,ownership_class,tenant_id,correlation_id,event_id,event_type,event_version,
       aggregate_type,aggregate_id,occurred_at,payload,classification)
     VALUES ($1::uuid,'TENANT_OWNED',$2::uuid,$3::uuid,$4::uuid,$5,$6,'FileObject',$7::uuid,CURRENT_TIMESTAMP,'{}'::jsonb,'restricted')`,
    [outboxEventId, tenantId, newUuidV7(), newUuidV7(), eventType, eventVersion, newUuidV7()]
  );
  return outboxEventId;
}

const authorize = async (workerId: string, context: Readonly<PersistedOutboxContext>): Promise<void> => {
  if (workerId !== servicePrincipalId) throw new Error("unexpected worker identity");
  if (!context.tenantId || context.ownershipClass !== "TENANT_OWNED") throw new Error("missing persisted tenant ownership");
  authorizedContexts.push(context as PersistedOutboxContext);
};

try {
  await client.query(
    `INSERT INTO platform.tenants
      (tenant_id,tenant_code,legal_name,display_name,default_timezone,lifecycle_state,data_classification)
     VALUES ($1::uuid,$2,'Outbox A','Outbox A','UTC','active','internal'),
            ($3::uuid,$4,'Outbox B','Outbox B','UTC','active','internal')`,
    [tenantA, `OUTBOX_${tenantA.slice(-8)}`, tenantB, `OUTBOX_${tenantB.slice(-8)}`]
  );

  await insertEvent(tenantA, 1);
  await insertEvent(tenantB, 1);
  const unsupportedId = await insertEvent(tenantA, 2);
  const leaseUntil = new Date(Date.now() + 60_000);
  const claimRequest = {
    servicePrincipalId,
    supportedEventVersions: { [eventType]: new Set([1]) },
    leaseUntil,
    count: 3,
    authorize
  };
  const batches = await Promise.all([
    database.transaction().execute((transaction) => claimOutboxEvents(transaction, claimRequest)),
    database.transaction().execute((transaction) => claimOutboxEvents(transaction, claimRequest))
  ]);
  const claimed = batches.flatMap((batch) => batch.claimed);
  const rejected = batches.flatMap((batch) => batch.rejected);

  record("skip_locked_concurrency", claimed.length === 2 && new Set(claimed.map((item) => item.outboxEventId)).size === 2, "claims were not disjoint");
  record("persisted_tenant_context", new Set(authorizedContexts.map((item) => item.tenantId)).size === 2, "worker did not authorize both stored tenant contexts");
  record("unknown_version_failed", rejected.length === 1 && rejected[0]?.outboxEventId === unsupportedId, "unknown event version was not rejected");

  const delivered = claimed[0];
  const crashed = claimed[1];
  if (!delivered || !crashed) throw new Error("expected two claimed events");
  await database.transaction().execute((transaction) => completeOutboxEvent(transaction, delivered, { outcome: "delivered" }));
  await client.query("UPDATE ops_audit.outbox_events SET available_at=CURRENT_TIMESTAMP - interval '1 second' WHERE outbox_event_id=$1::uuid", [crashed.outboxEventId]);
  const resumed = await database.transaction().execute((transaction) => claimOutboxEvents(transaction, {
    ...claimRequest,
    count: 1,
    leaseUntil: new Date(Date.now() + 60_000)
  }));
  record("restart_resumes_expired_lease", resumed.claimed[0]?.outboxEventId === crashed.outboxEventId && resumed.claimed[0]?.attemptCount === 2, "expired processing lease was not reclaimed");
  if (resumed.claimed[0]) {
    await database.transaction().execute((transaction) => completeOutboxEvent(transaction, resumed.claimed[0]!, {
      outcome: "failed",
      errorCode: "TCDX.PROVIDER.FAILURE"
    }));
  }

  const retryId = await insertEvent(tenantA, 1);
  const retryClaim = await database.transaction().execute((transaction) => claimOutboxEvents(transaction, {
    ...claimRequest,
    count: 1,
    leaseUntil: new Date(Date.now() + 60_000)
  }));
  if (!retryClaim.claimed[0]) throw new Error("expected retry test claim");
  await database.transaction().execute((transaction) => completeOutboxEvent(transaction, retryClaim.claimed[0]!, {
    outcome: "retry",
    availableAt: new Date(Date.now() + 120_000),
    errorCode: "TCDX.DEPENDENCY.UNAVAILABLE"
  }));
  const states = await client.query<{ outbox_event_id: string; delivery_status: string; attempt_count: number; last_error_code: string | null }>(
    "SELECT outbox_event_id,delivery_status,attempt_count,last_error_code FROM ops_audit.outbox_events WHERE outbox_event_id = ANY($1::uuid[])",
    [insertedOutboxIds]
  );
  const byId = new Map(states.rows.map((row) => [row.outbox_event_id, row]));
  record("delivery_completion", byId.get(delivered.outboxEventId)?.delivery_status === "delivered", "delivered state missing");
  record("terminal_failure", byId.get(crashed.outboxEventId)?.delivery_status === "failed", "failed state missing");
  record("explicit_retry_schedule", byId.get(retryId)?.delivery_status === "retry" && byId.get(retryId)?.last_error_code === "TCDX.DEPENDENCY.UNAVAILABLE", "retry state missing");
  record("unknown_version_observable", byId.get(unsupportedId)?.delivery_status === "failed" && byId.get(unsupportedId)?.last_error_code === "TCDX.EVENT.VERSION.UNSUPPORTED", "unknown version error not persisted");
} finally {
  if (insertedOutboxIds.length > 0) {
    await client.query("DELETE FROM ops_audit.outbox_events WHERE outbox_event_id = ANY($1::uuid[])", [insertedOutboxIds]);
  }
  await client.query("DELETE FROM platform.tenants WHERE tenant_id IN ($1::uuid,$2::uuid)", [tenantA, tenantB]);
  await client.end();
  await database.destroy();
}

const pass = failures.length === 0 && Object.values(results).every((result) => result === "PASS");
process.stdout.write(`${JSON.stringify({ outboxWorkerRuntime: pass ? "PASS" : "BLOCKED", results, failures }, null, 2)}\n`);
if (!pass) process.exitCode = 1;
