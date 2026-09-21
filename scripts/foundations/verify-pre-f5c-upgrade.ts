import pg from "pg";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { databaseConfig, readJson, repositoryRoot } from "./db.ts";

type Manifest = {
  migrations: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

const target = databaseConfig();
if (process.env.TCDX_ISOLATED_REBUILD !== "true") throw new Error("TCDX_ISOLATED_REBUILD=true is required");
if (!(target.host === "127.0.0.1" && target.port === 55432 && target.database === "tcdx-grc")) {
  throw new Error(`Refusing PRE-F5C upgrade test outside 127.0.0.1:55432/tcdx-grc: ${target.host}:${target.port}/${target.database}`);
}

const migrationDirectory = resolve(repositoryRoot, "database/migrations");
const runner = resolve(repositoryRoot, "scripts/foundations/migrate.ts");
const schemaVerifier = resolve(repositoryRoot, "scripts/foundations/verify-schema.ts");
const seedVerifier = resolve(repositoryRoot, "scripts/foundations/verify-seeds.ts");
const fullManifest = readJson<Manifest>("database/migrations/manifest.json");
if (fullManifest.migrations.length !== 11) throw new Error("PRE-F5C upgrade requires exactly eleven reviewed migrations");

function runNode(script: string, args: string[], environment: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, ["--experimental-strip-types", script, ...args], {
    cwd: repositoryRoot,
    env: environment,
    encoding: "utf8"
  });
}

function output(result: ReturnType<typeof runNode>): string {
  return `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
}

const admin = new pg.Client({ ...target, database: "postgres" });
await admin.connect();
try {
  await admin.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='tcdx-grc' AND pid <> pg_backend_pid()");
  await admin.query('DROP DATABASE IF EXISTS "tcdx-grc"');
  await admin.query('CREATE DATABASE "tcdx-grc"');
} finally {
  await admin.end();
}

const temporaryDirectory = mkdtempSync(join(tmpdir(), "tcdx-grc-pre-f5c-upgrade-"));
const tenManifestPath = join(temporaryDirectory, "manifest-ten.json");
writeFileSync(tenManifestPath, `${JSON.stringify({ ...fullManifest, migrations: fullManifest.migrations.slice(0, 10) }, null, 2)}\n`);
const environment = { ...process.env, TCDX_ISOLATED_REBUILD: "true" };
try {
  const baseline = runNode(runner, ["apply"], {
    ...environment,
    TCDX_MIGRATION_TEST_MODE: "true",
    TCDX_MIGRATION_DIRECTORY: migrationDirectory,
    TCDX_MIGRATION_MANIFEST: tenManifestPath
  });
  if (baseline.status !== 0) throw new Error(`PRE-F5C 229-table baseline build failed: ${output(baseline)}`);

  const before = new pg.Client(target);
  await before.connect();
  let beforeTables = 0;
  let beforeLedger = 0;
  let beforeRowVersionColumns = 0;
  try {
    beforeTables = Number((await before.query<{ count: string }>("SELECT count(*)::text AS count FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') AND NOT (schemaname='platform' AND tablename='schema_migrations')")).rows[0]?.count ?? 0);
    beforeLedger = Number((await before.query<{ count: string }>("SELECT count(*)::text AS count FROM platform.schema_migrations")).rows[0]?.count ?? 0);
    beforeRowVersionColumns = Number((await before.query<{ count: string }>("SELECT count(*)::text AS count FROM information_schema.columns WHERE (table_schema,table_name) IN (('regulatory','requirement_applicabilities'),('regulatory','requirement_assessments'),('regulatory','statements_of_applicability'),('controls','control_assessments'),('controls','assurance_tests'),('evidence','evidence_versions')) AND column_name='row_version'")).rows[0]?.count ?? 0);
  } finally {
    await before.end();
  }

  const upgrade = runNode(runner, ["apply"], environment);
  if (upgrade.status !== 0) throw new Error(`PRE-F5C incremental upgrade failed: ${output(upgrade)}`);
  const schema = runNode(schemaVerifier, [], environment);
  if (schema.status !== 0) throw new Error(`PRE-F5C schema verification failed: ${output(schema)}`);
  const seeds = runNode(seedVerifier, [], environment);
  if (seeds.status !== 0) throw new Error(`PRE-F5C seed verification failed: ${output(seeds)}`);
  const reapply = runNode(runner, ["apply"], environment);
  if (reapply.status !== 0) throw new Error(`PRE-F5C runner reapply failed: ${output(reapply)}`);

  const after = new pg.Client(target);
  await after.connect();
  let afterTables = 0;
  let afterLedger = 0;
  let rowVersionColumns = 0;
  let permissionRows = 0;
  let lifecycleRows = 0;
  try {
    afterTables = Number((await after.query<{ count: string }>("SELECT count(*)::text AS count FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') AND NOT (schemaname='platform' AND tablename='schema_migrations')")).rows[0]?.count ?? 0);
    afterLedger = Number((await after.query<{ count: string }>("SELECT count(*)::text AS count FROM platform.schema_migrations")).rows[0]?.count ?? 0);
    rowVersionColumns = Number((await after.query<{ count: string }>("SELECT count(*)::text AS count FROM information_schema.columns WHERE (table_schema,table_name) IN (('regulatory','requirement_applicabilities'),('regulatory','requirement_assessments'),('regulatory','statements_of_applicability'),('controls','control_assessments'),('controls','assurance_tests'),('evidence','evidence_versions')) AND column_name='row_version'")).rows[0]?.count ?? 0);
    permissionRows = Number((await after.query<{ count: string }>("SELECT count(*)::text AS count FROM iam.permissions WHERE permission_code IN ('compliance.soa.create','controls.assurance_test.create')")).rows[0]?.count ?? 0);
    lifecycleRows = Number((await after.query<{ count: string }>("SELECT count(*)::text AS count FROM ops_audit.lifecycle_transition_definitions WHERE created_at='2026-09-21T00:00:00.000Z'::timestamptz")).rows[0]?.count ?? 0);
  } finally {
    await after.end();
  }

  const parsedSchema = JSON.parse(schema.stdout) as { schemaMismatches?: number };
  const pass = beforeTables === 229 && beforeLedger === 10 && beforeRowVersionColumns === 0
    && afterTables === 229 && afterLedger === 11 && rowVersionColumns === 6
    && permissionRows === 2 && lifecycleRows === 39 && parsedSchema.schemaMismatches === 0;
  process.stdout.write(`${JSON.stringify({
    preF5cUpgradeTest: pass ? "PASS" : "BLOCKED",
    tablesBefore: beforeTables,
    ledgerBefore: beforeLedger,
    mutableRowVersionColumnsBefore: beforeRowVersionColumns,
    tablesAfter: afterTables,
    ledgerAfter: afterLedger,
    mutableRowVersionColumnsAfter: rowVersionColumns,
    addedPermissions: permissionRows,
    lifecycleDefinitionDelta: lifecycleRows,
    schemaMismatches: parsedSchema.schemaMismatches,
    runnerReapply: "PASS"
  }, null, 2)}\n`);
  if (!pass) process.exitCode = 1;
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
