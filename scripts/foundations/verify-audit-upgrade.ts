import pg from "pg";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { databaseConfig, readJson, repositoryRoot } from "./db.ts";

type Manifest = {
  manifestVersion: number;
  runnerVersion: string;
  databaseName: string;
  postgresMajor: number;
  advisoryLockSource: string;
  migrations: Array<Record<string, unknown>>;
};

const target = databaseConfig();
if (process.env.TCDX_ISOLATED_REBUILD !== "true") throw new Error("TCDX_ISOLATED_REBUILD=true is required");
if (!(target.host === "127.0.0.1" && target.port === 55432 && target.database === "tcdx-grc")) {
  throw new Error(`Refusing Audit upgrade test outside 127.0.0.1:55432/tcdx-grc: ${target.host}:${target.port}/${target.database}`);
}

const runner = resolve(repositoryRoot, "scripts/foundations/migrate.ts");
const schemaVerifier = resolve(repositoryRoot, "scripts/foundations/verify-schema.ts");
const migrationDirectory = resolve(repositoryRoot, "database/migrations");
const fullManifest = readJson<Manifest>("database/migrations/manifest.json");
if (fullManifest.migrations.length !== 11) throw new Error("Audit upgrade test requires the eleven reviewed migrations through PRE-F5C");

function runNode(script: string, args: string[], environment: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, ["--experimental-strip-types", script, ...args], {
    cwd: repositoryRoot,
    env: environment,
    encoding: "utf8"
  });
}

function combinedOutput(result: ReturnType<typeof runNode>): string {
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

const temporaryDirectory = mkdtempSync(join(tmpdir(), "tcdx-grc-audit-upgrade-"));
const nineManifestPath = join(temporaryDirectory, "manifest-nine.json");
writeFileSync(nineManifestPath, `${JSON.stringify({ ...fullManifest, migrations: fullManifest.migrations.slice(0, 9) }, null, 2)}\n`);
const commonEnvironment = { ...process.env, TCDX_ISOLATED_REBUILD: "true" };
const nineResult = runNode(runner, ["apply"], {
  ...commonEnvironment,
  TCDX_MIGRATION_TEST_MODE: "true",
  TCDX_MIGRATION_DIRECTORY: migrationDirectory,
  TCDX_MIGRATION_MANIFEST: nineManifestPath
});
if (nineResult.status !== 0) throw new Error(`214-table baseline build failed: ${combinedOutput(nineResult)}`);

const client = new pg.Client(target);
await client.connect();
let beforeTables = 0;
let beforeLedger = 0;
let guardedTables = 0;
let guardedLedger = 0;
let existingAuditGuard = "BLOCKED";
try {
  beforeTables = Number((await client.query<{ count: string }>("SELECT count(*)::text AS count FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') AND NOT (schemaname='platform' AND tablename='schema_migrations')")).rows[0]?.count ?? 0);
  beforeLedger = Number((await client.query<{ count: string }>("SELECT count(*)::text AS count FROM platform.schema_migrations")).rows[0]?.count ?? 0);

  const tenant = "01994e00-0000-7000-8000-000000000001";
  const user = "01994e00-0000-7000-8000-000000000002";
  const membership = "01994e00-0000-7000-8000-000000000003";
  const audit = "01994e00-0000-7000-8000-000000000004";
  await client.query("INSERT INTO platform.tenants (tenant_id,tenant_code,legal_name,display_name,default_timezone,lifecycle_state,data_classification) VALUES ($1,'AUDIT_UPGRADE_GUARD','Audit upgrade guard','Audit upgrade guard','UTC','active','internal')", [tenant]);
  await client.query("INSERT INTO iam.user_identities (user_identity_id,identity_key,display_name,lifecycle_state) VALUES ($1,'audit-upgrade-guard','Audit upgrade guard','active')", [user]);
  await client.query("INSERT INTO iam.tenant_memberships (tenant_membership_id,tenant_id,user_identity_id,membership_state,joined_at) VALUES ($1,$2,$3,'active',CURRENT_TIMESTAMP)", [membership, tenant, user]);
  await client.query("INSERT INTO audit.audits (audit_id,tenant_id,audit_code,title,lifecycle_state,scope_text,lead_membership_id) VALUES ($1,$2,'AUDIT-UPGRADE-GUARD','Audit upgrade guard','draft','unresolved textual scope',$3)", [audit, tenant, membership]);

  const guarded = runNode(runner, ["apply"], commonEnvironment);
  const guardedOutput = combinedOutput(guarded);
  if (guarded.status !== 0 && /AUDIT_RECONCILIATION_REQUIRED_BEFORE_MUTATION/.test(guardedOutput)) existingAuditGuard = "PASS";
  guardedTables = Number((await client.query<{ count: string }>("SELECT count(*)::text AS count FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') AND NOT (schemaname='platform' AND tablename='schema_migrations')")).rows[0]?.count ?? 0);
  guardedLedger = Number((await client.query<{ count: string }>("SELECT count(*)::text AS count FROM platform.schema_migrations")).rows[0]?.count ?? 0);
  if (await client.query("SELECT to_regclass('audit.audit_objectives') AS relation").then((result) => result.rows[0]?.relation !== null)) {
    throw new Error("Audit reconciliation guard left partial schema mutation");
  }

  await client.query("DELETE FROM audit.audits WHERE audit_id=$1", [audit]);
  await client.query("DELETE FROM iam.tenant_memberships WHERE tenant_membership_id=$1", [membership]);
  await client.query("DELETE FROM iam.user_identities WHERE user_identity_id=$1", [user]);
  await client.query("DELETE FROM platform.tenants WHERE tenant_id=$1", [tenant]);
} finally {
  await client.end();
}

const upgradeResult = runNode(runner, ["apply"], commonEnvironment);
if (upgradeResult.status !== 0) throw new Error(`214-table baseline through PRE-F5C upgrade failed: ${combinedOutput(upgradeResult)}`);
const schemaResult = runNode(schemaVerifier, [], commonEnvironment);
if (schemaResult.status !== 0) throw new Error(`229-table schema verification failed: ${combinedOutput(schemaResult)}`);
const schema = JSON.parse(schemaResult.stdout) as { actualPhysicalTables?: number; schemaMismatches?: number };

const after = new pg.Client(target);
await after.connect();
let afterLedger = 0;
let legacyColumns = 0;
let addedTables = 0;
try {
  afterLedger = Number((await after.query<{ count: string }>("SELECT count(*)::text AS count FROM platform.schema_migrations")).rows[0]?.count ?? 0);
  legacyColumns = Number((await after.query<{ count: string }>("SELECT count(*)::text AS count FROM information_schema.columns WHERE table_schema='audit' AND table_name='audits' AND column_name IN ('scope_text','lead_membership_id')")).rows[0]?.count ?? 0);
  addedTables = Number((await after.query<{ count: string }>("SELECT count(*)::text AS count FROM pg_catalog.pg_tables WHERE schemaname='audit' AND tablename = ANY($1::text[])", [[
    "audit_objectives", "audit_criteria", "audit_scopes", "audit_team_assignments", "audit_competencies",
    "auditor_competency_assertions", "audit_competency_requirements", "audit_competency_validations", "audit_agenda_items",
    "audit_agenda_item_tests", "audit_agenda_item_scopes", "audit_agenda_item_team_assignments", "audit_test_requirement_links",
    "audit_test_control_links", "audit_test_requirement_assessment_links"
  ]])).rows[0]?.count ?? 0);
} finally {
  await after.end();
  rmSync(temporaryDirectory, { recursive: true, force: true });
}

const pass = beforeTables === 214 && beforeLedger === 9 && existingAuditGuard === "PASS"
  && guardedTables === 214 && guardedLedger === 9 && schema.actualPhysicalTables === 229
  && schema.schemaMismatches === 0 && afterLedger === 11 && legacyColumns === 0 && addedTables === 15;
process.stdout.write(`${JSON.stringify({
  auditUpgradeTest: pass ? "PASS" : "BLOCKED",
  tablesBefore: beforeTables,
  ledgerBefore: beforeLedger,
  existingAuditReconciliationGuard: existingAuditGuard,
  tablesAfterGuardFailure: guardedTables,
  ledgerAfterGuardFailure: guardedLedger,
  tablesAfter: schema.actualPhysicalTables,
  ledgerAfter: afterLedger,
  addedAuditTables: addedTables,
  legacyAuthorityColumns: legacyColumns,
  schemaMismatches: schema.schemaMismatches
}, null, 2)}\n`);
if (!pass) process.exitCode = 1;
