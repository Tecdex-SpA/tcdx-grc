import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, readJson, repositoryRoot } from "./db.ts";

type Migration = {
  id: string;
  filename: string;
  sha256: string;
  transactional: boolean;
};

type Manifest = {
  manifestVersion: number;
  runnerVersion: string;
  databaseName: string;
  postgresMajor: number;
  advisoryLockSource: string;
  migrations: Migration[];
};

type AppliedMigration = {
  migration_id: string;
  filename: string;
  content_sha256: string;
  transactional: boolean;
};

const testMode = process.env.TCDX_MIGRATION_TEST_MODE === "true";
const migrationDir = testMode && process.env.TCDX_MIGRATION_DIRECTORY
  ? resolve(process.env.TCDX_MIGRATION_DIRECTORY)
  : resolve(repositoryRoot, "database/migrations");
const manifest = testMode && process.env.TCDX_MIGRATION_MANIFEST
  ? JSON.parse(readFileSync(resolve(process.env.TCDX_MIGRATION_MANIFEST), "utf8")) as Manifest
  : readJson<Manifest>("database/migrations/manifest.json");
const sha256 = (content: Buffer) => createHash("sha256").update(content).digest("hex");

function lockKey(source: string): bigint {
  return createHash("sha256").update(Buffer.from(source, "utf8")).digest().readBigInt64BE(0);
}

function validateManifest(): Map<string, Buffer> {
  if (manifest.databaseName !== "tcdx-grc" || manifest.postgresMajor !== 16) throw new Error("Manifest target identity is not the approved PostgreSQL 16 tcdx-grc target");
  const bytes = new Map<string, Buffer>();
  let prior = "";
  const ids = new Set<string>();
  for (const migration of manifest.migrations) {
    if (!/^\d{14}$/.test(migration.id)) throw new Error(`Invalid migration ID grammar: ${migration.id}`);
    if (!new RegExp(`^${migration.id}_[a-z0-9]+(?:_[a-z0-9]+)*\\.sql$`).test(migration.filename)) throw new Error(`Invalid migration filename grammar: ${migration.filename}`);
    if (!migration.filename.startsWith(`${migration.id}_`)) throw new Error(`Migration filename/ID mismatch: ${migration.filename}`);
    if (ids.has(migration.id)) throw new Error(`Duplicate migration ID: ${migration.id}`);
    if (prior && migration.id <= prior) throw new Error(`Migration order regression: ${migration.id}`);
    if (!migration.transactional) throw new Error(`Non-transactional migration lacks a separately approved recovery contract: ${migration.id}`);
    ids.add(migration.id);
    prior = migration.id;
    const content = readFileSync(resolve(migrationDir, migration.filename));
    const actual = sha256(content);
    if (actual !== migration.sha256) throw new Error(`Checksum mismatch for ${migration.filename}: expected ${migration.sha256}, actual ${actual}`);
    bytes.set(migration.id, content);
  }
  return bytes;
}

async function preflight(client: ReturnType<typeof createClient>, mutating: boolean): Promise<{ ledgerExists: boolean; applied: Map<string, AppliedMigration> }> {
  const identity = await client.query<{ database_name: string; version_num: string; user_name: string }>("SELECT current_database() AS database_name, current_setting('server_version_num') AS version_num, current_user AS user_name");
  const row = identity.rows[0];
  if (!row || row.database_name !== manifest.databaseName) throw new Error(`Database identity blocked: expected ${manifest.databaseName}`);
  if (Math.floor(Number(row.version_num) / 10000) !== manifest.postgresMajor) throw new Error(`PostgreSQL major blocked: expected ${manifest.postgresMajor}`);
  if (mutating && process.env.TCDX_ISOLATED_REBUILD !== "true" && !process.env.DATABASE_BACKUP_REFERENCE) throw new Error("Backup/PITR readiness reference is required before mutation");
  const ledgerProbe = await client.query<{ ledger: string | null }>("SELECT to_regclass('platform.schema_migrations')::text AS ledger");
  const ledgerExists = ledgerProbe.rows[0]?.ledger !== null;
  const applied = new Map<string, AppliedMigration>();
  if (ledgerExists) {
    const result = await client.query<AppliedMigration>("SELECT migration_id, filename, content_sha256, transactional FROM platform.schema_migrations WHERE outcome = 'applied' ORDER BY migration_id");
    for (const item of result.rows) applied.set(item.migration_id, item);
  } else if (mutating) {
    const existing = await client.query<{ schema_name: string; table_name: string }>("SELECT schemaname AS schema_name, tablename AS table_name FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY 1,2");
    if (existing.rowCount) throw new Error(`DATABASE_PRECONDITION_BLOCKED: ${existing.rowCount} unexpected pre-ledger table(s)`);
  }
  return { ledgerExists, applied };
}

function verifyApplied(applied: Map<string, AppliedMigration>): void {
  const known = new Map(manifest.migrations.map((migration) => [migration.id, migration]));
  for (const row of applied.values()) {
    const expected = known.get(row.migration_id);
    if (!expected) throw new Error(`Ledger contains migration not present in reviewed manifest: ${row.migration_id}`);
    if (row.filename !== expected.filename || row.content_sha256 !== expected.sha256 || row.transactional !== expected.transactional)
      throw new Error(`Applied migration identity/checksum mismatch: ${row.migration_id}`);
  }
}

async function apply(): Promise<void> {
  const bytes = validateManifest();
  const client = createClient();
  await client.connect();
  let locked = false;
  try {
    const state = await preflight(client, true);
    verifyApplied(state.applied);
    const lock = await client.query<{ acquired: boolean }>("SELECT pg_try_advisory_lock($1::bigint) AS acquired", [lockKey(manifest.advisoryLockSource).toString()]);
    locked = lock.rows[0]?.acquired === true;
    if (!locked) throw new Error("Concurrent migration runner rejected: advisory lock is held");
    for (const migration of manifest.migrations) {
      const existing = state.applied.get(migration.id);
      if (existing) {
        process.stdout.write(`${migration.id} already applied; checksum verified\n`);
        continue;
      }
      const started = Date.now();
      await client.query("BEGIN");
      try {
        await client.query(bytes.get(migration.id)!.toString("utf8"));
        await client.query(
          "INSERT INTO platform.schema_migrations (migration_id, filename, content_sha256, transactional, runner_version, started_at, applied_at, duration_ms, outcome) VALUES ($1,$2,$3,$4,$5,to_timestamp($6 / 1000.0),CURRENT_TIMESTAMP,$7,'applied')",
          [migration.id, migration.filename, migration.sha256, migration.transactional, manifest.runnerVersion, started, Date.now() - started]
        );
        await client.query("COMMIT");
        process.stdout.write(`${migration.id} applied\n`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    if (locked) await client.query("SELECT pg_advisory_unlock($1::bigint)", [lockKey(manifest.advisoryLockSource).toString()]);
    await client.end();
  }
}

async function status(): Promise<void> {
  validateManifest();
  const client = createClient();
  await client.connect();
  try {
    const state = await preflight(client, false);
    verifyApplied(state.applied);
    for (const migration of manifest.migrations) process.stdout.write(`${migration.id} ${state.applied.has(migration.id) ? "applied" : "pending"} ${migration.filename}\n`);
  } finally {
    await client.end();
  }
}

const command = process.argv[2] ?? "status";
if (command !== "apply" && command !== "status") throw new Error(`Unknown command: ${command}`);
await (command === "apply" ? apply() : status());
