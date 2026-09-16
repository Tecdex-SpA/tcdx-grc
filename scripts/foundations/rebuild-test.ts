import pg from "pg";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { databaseConfig, repositoryRoot } from "./db.ts";

const target = databaseConfig();
if (process.env.TCDX_ISOLATED_REBUILD !== "true") throw new Error("TCDX_ISOLATED_REBUILD=true is required");
if (!(["127.0.0.1", "localhost"].includes(target.host) && target.port === 55432 && target.database === "tcdx-grc")) {
  throw new Error(`Refusing destructive rebuild outside approved isolated target: ${target.host}:${target.port}/${target.database}`);
}

const admin = new pg.Client({ ...target, database: "postgres" });
await admin.connect();
try {
  const identity = await admin.query<{ major: number; database_name: string }>("SELECT current_setting('server_version_num')::integer / 10000 AS major, current_database() AS database_name");
  if (identity.rows[0]?.major !== 16 || identity.rows[0]?.database_name !== "postgres") throw new Error("Isolated PostgreSQL 16 admin identity check failed");
  await admin.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='tcdx-grc' AND pid <> pg_backend_pid()");
  await admin.query('DROP DATABASE IF EXISTS "tcdx-grc"');
  await admin.query('CREATE DATABASE "tcdx-grc"');
} finally {
  await admin.end();
}

const commands = [
  ["migrations", "migrate.ts", "apply"],
  ["schema", "verify-schema.ts"],
  ["seeds", "verify-seeds.ts"],
  ["seed-reapply", "verify-seed-reapply.ts"],
  ["migration-reapply", "migrate.ts", "apply"],
  ["schema-after-reapply", "verify-schema.ts"],
  ["seeds-after-reapply", "verify-seeds.ts"]
] as const;
const evidence: Array<{ gate: string; status: string; output: string }> = [];
for (const [gate, script, argument] of commands) {
  const args = ["--experimental-strip-types", resolve(repositoryRoot, "scripts/foundations", script)];
  if (argument) args.push(argument);
  const result = spawnSync(process.execPath, args, {
    cwd: repositoryRoot,
    env: { ...process.env, TCDX_ISOLATED_REBUILD: "true" },
    encoding: "utf8"
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  evidence.push({ gate, status: result.status === 0 ? "PASS" : "BLOCKED", output });
  if (result.status !== 0) break;
}

const pass = evidence.length === commands.length && evidence.every((item) => item.status === "PASS");
process.stdout.write(`${JSON.stringify({ rebuildTest: pass ? "PASS" : "BLOCKED", target: "127.0.0.1:55432/tcdx-grc", evidence }, null, 2)}\n`);
if (!pass) process.exitCode = 1;
