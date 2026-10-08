import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const source = resolve(root, "docs/executable-contracts/05_PERMISSION_CATALOG.md");
const target = resolve(root, "apps/backend/src/security/permission-projection-catalog.generated.ts");
const scopeKinds = ["platform", "tenant", "organizational_unit", "process", "service", "audit_engagement", "assigned_object", "owned_object"];
const rows = new Map();

for (const line of readFileSync(source, "utf8").split("\n")) {
  if (!/^\| (?:`|<code>)[a-z][a-z0-9_.]+/.test(line)) continue;
  const cells = line.slice(2, -2).split(" | ").map((cell) => cell.trim());
  const code = cells[0].replaceAll("`", "").replaceAll(/<\/?code>/g, "");
  const scopes = scopeKinds.filter((scope) => new RegExp(`\\b${scope}\\b`).test(cells[3]));
  const capabilities = cells[1].split(" or ");
  if (rows.has(code) || !scopes.length || !capabilities.every((value) => /^[A-Z_]+$/.test(value))) {
    throw new Error(`Invalid permission catalog binding: ${code}`);
  }
  rows.set(code, { capabilities, scopes });
}

if (rows.size !== 166) throw new Error(`Expected 166 pre-MI plus approved P2A/methodology permission bindings, got ${rows.size}`);
const approvedDiscovery = readFileSync(source, "utf8").split("\n").find((line) => line.startsWith("| platform.user_identity.read |"));
if (!approvedDiscovery || !approvedDiscovery.includes("| CORE_PLATFORM | platform, tenant |")) throw new Error("D1-R discovery binding missing");
rows.set("platform.user_identity.read", { capabilities: ["CORE_PLATFORM"], scopes: ["platform", "tenant"] });
const approvedOnboarding = readFileSync(source, "utf8").split("\n").find(line => line.startsWith("| platform.tenant_user.onboard |"));
if (!approvedOnboarding?.includes("| onboard | CORE_PLATFORM | platform | PLATFORM_ADMIN ONLY;")) throw new Error("Platform tenant onboarding binding missing");
rows.set("platform.tenant_user.onboard", { capabilities: ["CORE_PLATFORM"], scopes: ["platform"] });
for (const action of ["read", "create", "update", "administer"]) {
  rows.set(`platform.managed_identity.${action}`, { capabilities: ["CORE_PLATFORM"], scopes: ["platform"] });
}
const content = `// Generated from executable Permission catalog 05 and approved MI6A/P2A/D1-R publication contracts. Do not edit.\n`
  + `export const permissionProjectionCatalog: Readonly<Record<string, { capabilities: readonly string[]; scopes: readonly string[] }>> = `
  + `${JSON.stringify(Object.fromEntries([...rows].sort(([a], [b]) => a.localeCompare(b))), null, 2)};\n`;
if (process.argv.includes("--check")) {
  if (readFileSync(target, "utf8") !== content) throw new Error("Permission projection catalog is stale");
} else {
  writeFileSync(target, content);
}
