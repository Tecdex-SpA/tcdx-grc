import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, relative } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const excluded = new Set([".git", "node_modules", "dist", "coverage", "playwright-report", "test-results"]);
const findings = [];
const patterns = [
  ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["jwt", /eyJ[a-zA-Z0-9_-]{12,}\.eyJ[a-zA-Z0-9_-]{12,}\.[a-zA-Z0-9_-]{12,}/],
  ["credential-uri", /(?:postgres(?:ql)?|mongodb(?:\+srv)?|redis):\/\/[^\s:@/]+:[^\s@/]+@/],
  ["quoted-secret", /(?:password|token|secret|private_key)\s*[:=]\s*["'](?!<|\$\{)[A-Za-z0-9+/_=-]{16,}["']/i],
  ["environment-secret", /^(?:[A-Z0-9_]*(?:PASSWORD|TOKEN|SECRET|PRIVATE_KEY)[A-Z0-9_]*)\s*=\s*(?!<|\$\{|undefined|null)[A-Za-z0-9+/_=-]{16,}\s*$/im]
];

const assignedSecretPatterns = patterns.filter(([kind]) => kind === "quoted-secret" || kind === "environment-secret");
const detects = (value) => assignedSecretPatterns.some(([, pattern]) => pattern.test(value));
const canaryValue = "abcdefgh" + "ijklmnop";
if (!detects(`password: "${canaryValue}"`) || !detects(`DATABASE_PASSWORD=${canaryValue}`) || detects("password: databasePassword")) {
  findings.push({ path: "scripts/foundations/secret-scan.mjs", kind: "scanner-self-test" });
}

function walk(directory) {
  for (const entry of readdirSync(directory)) {
    if (excluded.has(entry)) continue;
    const path = resolve(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path);
    else if (stat.size <= 5_000_000) {
      const content = readFileSync(path, "utf8");
      for (const [kind, pattern] of patterns) if (pattern.test(content)) findings.push({ path: relative(root, path), kind });
    }
  }
}

walk(root);
process.stdout.write(`${JSON.stringify({ secretFindings: findings.length, findings }, null, 2)}\n`);
if (findings.length) process.exitCode = 1;
