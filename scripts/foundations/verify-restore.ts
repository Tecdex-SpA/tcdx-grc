import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import pg from "pg";

const host = process.env.DATABASE_HOST;
const port = Number(process.env.DATABASE_PORT);
const sourceDatabase = process.env.DATABASE_NAME;
const user = process.env.DATABASE_USER;
const password = process.env.DATABASE_PASSWORD;
if (host !== "127.0.0.1" || port !== 55432 || sourceDatabase !== "tcdx-grc" || !user) {
  throw new Error("Restore verification is restricted to 127.0.0.1:55432/tcdx-grc");
}

const restoreDatabase = `tcdx_grc_restore_${process.pid}_${Date.now()}`;
const temporaryDirectory = mkdtempSync(join(tmpdir(), "tcdx-grc-restore-"));
const dumpPath = join(temporaryDirectory, "foundation.dump");
const environment = { ...process.env, PGPASSWORD: password ?? "" };
const admin = new pg.Client({ host, port, database: "postgres", user, password, ssl: false });
await admin.connect();

function run(command: string, args: string[], extraEnvironment: NodeJS.ProcessEnv = {}): string {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: { ...environment, ...extraEnvironment },
    encoding: "utf8"
  });
  if (result.status !== 0) {
    throw new Error(`${command} failed: ${(result.stderr || result.stdout).trim()}`);
  }
  return result.stdout;
}

let schema: { schemaMismatches?: number } = {};
let seeds: { seedMismatches?: number } = {};
let ledgerCount = 0;
try {
  run("pg_dump", ["--host", host, "--port", String(port), "--username", user, "--format", "plain", "--file", dumpPath, sourceDatabase]);
  const dumpSql = readFileSync(dumpPath, "utf8").replace(/^SET transaction_timeout = 0;\n/m, "");
  writeFileSync(dumpPath, dumpSql, "utf8");
  await admin.query(`CREATE DATABASE "${restoreDatabase}"`);
  run("psql", ["--host", host, "--port", String(port), "--username", user, "--set", "ON_ERROR_STOP=1", "--dbname", restoreDatabase, "--file", dumpPath]);

  const verificationEnvironment = {
    DATABASE_HOST: host,
    DATABASE_PORT: String(port),
    DATABASE_NAME: restoreDatabase,
    DATABASE_USER: user,
    DATABASE_PASSWORD: password ?? "",
    DATABASE_SSL_MODE: "disable",
    TCDX_ISOLATED_RESTORE_TEST: "true"
  };
  schema = JSON.parse(run("node", ["--experimental-strip-types", "scripts/foundations/verify-schema.ts"], verificationEnvironment)) as typeof schema;
  seeds = JSON.parse(run("node", ["--experimental-strip-types", "scripts/foundations/verify-seeds.ts"], verificationEnvironment)) as typeof seeds;

  const restored = new pg.Client({ host, port, database: restoreDatabase, user, password, ssl: false });
  await restored.connect();
  try {
    ledgerCount = Number((await restored.query<{ count: string }>("SELECT count(*)::text AS count FROM platform.schema_migrations")).rows[0]?.count ?? 0);
  } finally {
    await restored.end();
  }
} finally {
  await admin.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid <> pg_backend_pid()", [restoreDatabase]);
  await admin.query(`DROP DATABASE IF EXISTS "${restoreDatabase}"`);
  await admin.end();
  rmSync(temporaryDirectory, { recursive: true, force: true });
}

const pass = schema.schemaMismatches === 0 && seeds.seedMismatches === 0 && ledgerCount === 9;
process.stdout.write(`${JSON.stringify({
  restoreTest: pass ? "PASS" : "BLOCKED",
  source: "127.0.0.1:55432/tcdx-grc",
  schemaMismatches: schema.schemaMismatches,
  seedMismatches: seeds.seedMismatches,
  migrationLedgerRows: ledgerCount,
  temporaryRestoreRemoved: true
}, null, 2)}\n`);
if (!pass) process.exitCode = 1;
