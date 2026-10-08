import { randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Isolated, disposable IAM visual fixtures. No production credentials or IAM configuration are read.
const root = fileURLToPath(new URL("..", import.meta.url));
const fixtureDirectory = mkdtempSync(join(tmpdir(), "tcdx-mi7-theme-fixture-"));
const container = `tcdx-mi7-theme-${randomBytes(8).toString("hex")}`;
const password = randomBytes(32).toString("base64url");
const fixture = JSON.parse(readFileSync(join(root, "iam/e2e/realm.json"), "utf8"));
fixture.users = [
  ...["desktop", "tablet", "mobile"].map((viewport) => ({
    username: `mi7-synthetic-required-actions-${viewport}`, firstName: "Synthetic", lastName: "MI7", enabled: true,
    email: `mi7-${viewport}@example.invalid`, emailVerified: true,
    requiredActions: ["UPDATE_PASSWORD", "CONFIGURE_TOTP"],
    credentials: [{ type: "password", value: password, temporary: true }]
  })),
  { username: "mi7-synthetic-disabled", enabled: false,
    credentials: [{ type: "password", value: password, temporary: false }] }
];
const importFile = join(fixtureDirectory, "realm.json");
writeFileSync(importFile, JSON.stringify(fixture), { mode: 0o600 });
const docker = (args) => spawnSync("docker", args, { cwd: root, stdio: "pipe", encoding: "utf8" });
// Consume no callback parameters, headers or tokens and write no access log.
const callbackServer = createServer((_request, response) => {
  response.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-store" });
  response.end("<!doctype html><html><body><h1>Local fixture completed</h1></body></html>");
});
let started = false;
try {
  await new Promise((resolve, reject) => {
    callbackServer.once("error", reject);
    callbackServer.listen(4899, "127.0.0.1", resolve);
  });
  const result = docker(["run", "--rm", "-d", "--name", container, "-p", "127.0.0.1:4898:8080",
    "-v", `${fixtureDirectory}:/opt/keycloak/data/import:ro`, "tcdx-grc-iam-theme:mi7-local", "start-dev", "--import-realm"]);
  if (result.status !== 0) throw new Error("LOCAL_THEME_CONTAINER_START_FAILED");
  started = true;
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const response = await fetch("http://127.0.0.1:4898/realms/tcdx-mi7-local/.well-known/openid-configuration");
      if (response.ok) { ready = true; break; }
    } catch { /* wait only for this disposable local container */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error("LOCAL_THEME_CONTAINER_NOT_READY");
  // Realm import has finished. Remove the plaintext synthetic import before browser validation.
  rmSync(importFile);
  const status = await new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["test:e2e", "--config=iam/playwright.config.ts"], {
      cwd: root, stdio: "inherit", env: { ...process.env, TCDX_MI7_SYNTHETIC_PASSWORD: password }
    });
    child.once("error", reject);
    child.once("exit", resolve);
  });
  process.exitCode = status ?? 1;
} catch (error) {
  const allowed = ["LOCAL_THEME_CONTAINER_START_FAILED", "LOCAL_THEME_CONTAINER_NOT_READY"];
  console.error(allowed.includes(error?.message) ? error.message : "LOCAL_THEME_E2E_SETUP_FAILED");
  if (started) {
    const logs = docker(["logs", container]);
    const output = logs.stdout + logs.stderr;
    console.error(`LOCAL_IMPORT_ACCESS_DENIED=${/AccessDeniedException|Permission denied/.test(output)}`);
    console.error(`LOCAL_STARTUP_COMPLETE=${/Listening on:/.test(output)}`);
    console.error(`LOCAL_REALM_IMPORTED=${/Realm 'tcdx-mi7-local' imported/.test(output)}`);
    console.error(`LOCAL_STARTUP_ERROR=${/ERROR/.test(output)}`);
    console.error(docker(["inspect", "--format", "LOCAL_CONTAINER_STATE={{.State.Status}} EXIT={{.State.ExitCode}} OOM={{.State.OOMKilled}}", container]).stdout.trim());
  }
  process.exitCode = 1;
} finally {
  if (started) docker(["stop", container]);
  await new Promise((resolve) => callbackServer.close(resolve));
  rmSync(fixtureDirectory, { recursive: true, force: true });
}
