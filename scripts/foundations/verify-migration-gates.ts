import { createHash } from "node:crypto";
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createClient, readJson, repositoryRoot } from "./db.ts";

type Migration = { id: string; filename: string; sha256: string; transactional: boolean };
type Manifest = { advisoryLockSource: string; migrations: Migration[] };

const manifest = readJson<Manifest>("database/migrations/manifest.json");
const runner = resolve(repositoryRoot, "scripts/foundations/migrate.ts");
const migrationDirectory = resolve(repositoryRoot, "database/migrations");
const commonEnvironment = { ...process.env, TCDX_ISOLATED_REBUILD: "true" };
const failures: string[] = [];

function runRunner(environment: NodeJS.ProcessEnv, command: "apply" | "status") {
  return spawnSync(process.execPath, ["--experimental-strip-types", runner, command], {
    cwd: repositoryRoot,
    env: environment,
    encoding: "utf8"
  });
}

function assertFailure(name: string, result: ReturnType<typeof runRunner>, expected: RegExp): void {
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (result.status === 0 || !expected.test(output)) failures.push(`${name}: unexpected status/output: ${result.status} ${output.trim()}`);
}

// Exercise the real runner against copied bytes. The reviewed source files are never modified.
const temporaryDirectory = mkdtempSync(join(tmpdir(), "tcdx-grc-migration-checksum-"));
for (const migration of manifest.migrations) {
  copyFileSync(join(migrationDirectory, migration.filename), join(temporaryDirectory, migration.filename));
}
const copiedManifest = join(temporaryDirectory, "manifest.json");
copyFileSync(join(migrationDirectory, "manifest.json"), copiedManifest);
const tampered = join(temporaryDirectory, manifest.migrations[0]!.filename);
writeFileSync(tampered, Buffer.concat([readFileSync(tampered), Buffer.from("\n-- tamper probe\n", "utf8")]));
assertFailure("checksum-guard", runRunner({
  ...commonEnvironment,
  TCDX_MIGRATION_TEST_MODE: "true",
  TCDX_MIGRATION_DIRECTORY: temporaryDirectory,
  TCDX_MIGRATION_MANIFEST: copiedManifest
}, "status"), /Checksum mismatch/);

const client = createClient();
await client.connect();
const lockKey = createHash("sha256")
  .update(Buffer.from(manifest.advisoryLockSource, "utf8"))
  .digest()
  .readBigInt64BE(0)
  .toString();

try {
  const lock = await client.query<{ acquired: boolean }>("SELECT pg_try_advisory_lock($1::bigint) AS acquired", [lockKey]);
  if (lock.rows[0]?.acquired !== true) failures.push("concurrency-guard: test could not acquire advisory lock");
  else {
    assertFailure("concurrency-guard", runRunner(commonEnvironment, "apply"), /Concurrent migration runner rejected/);
    await client.query("SELECT pg_advisory_unlock($1::bigint)", [lockKey]);
  }

  const unknownId = "99999999999999";
  await client.query(
    "INSERT INTO platform.schema_migrations (migration_id, filename, content_sha256, transactional, runner_version, started_at, applied_at, duration_ms, outcome) VALUES ($1,$2,$3,true,'gate-test',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,0,'applied')",
    [unknownId, `${unknownId}_unknown.sql`, "0".repeat(64)]
  );
  try {
    assertFailure("unknown-ledger-guard", runRunner(commonEnvironment, "status"), /Ledger contains migration not present/);
  } finally {
    await client.query("DELETE FROM platform.schema_migrations WHERE migration_id=$1", [unknownId]);
  }
} finally {
  await client.end();
}

const originalChecksumsIntact = manifest.migrations.every((migration) => {
  const digest = createHash("sha256").update(readFileSync(join(migrationDirectory, migration.filename))).digest("hex");
  return digest === migration.sha256;
});
if (!originalChecksumsIntact) failures.push("source-migration-checksums-changed");

process.stdout.write(`${JSON.stringify({
  migrationChecksumGuard: failures.some((item) => item.startsWith("checksum-guard")) ? "BLOCKED" : "PASS",
  migrationConcurrencyGuard: failures.some((item) => item.startsWith("concurrency-guard")) ? "BLOCKED" : "PASS",
  unknownLedgerGuard: failures.some((item) => item.startsWith("unknown-ledger-guard")) ? "BLOCKED" : "PASS",
  sourceMigrationChecksumsIntact: originalChecksumsIntact,
  copiedTamperTarget: basename(tampered),
  failures
}, null, 2)}\n`);
if (failures.length) process.exitCode = 1;
