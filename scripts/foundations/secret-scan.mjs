import { createHash } from "node:crypto";
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

// Contract/status assignments can resemble environment secrets. Exceptions are
// review-pinned to both their repository path and exact line fingerprint so that
// changing either re-enables detection instead of broadening the scanner bypass.
const approvedFalsePositives = new Map([
  // Historical human-gate state, pinned to this exact line; contains no credential.
  ["docs/governance/MASTER_EXECUTION_STATUS.md", new Set([
    "aa5c45d1e85a98e45da5ddc46145de9af5f695f841deafd180680fd251b467a2"
  ])],
  ["docs/executable-contracts/13_AUTHENTICATION_AUTHORIZATION_CONTRACT.md", new Set([
    "0e5e2b5a79e10b67bbfbb1b2ae4437b078c56d00648e8a2d8929da4c39eeea1f"
  ])],
  ["docs/executable-contracts/19_OPEN_DECISIONS_AND_BLOCKERS.md", new Set([
    "3a17bbf26b8564e3e08634da5d1fe1d239334fe9fc88d29e520c2eaa391c065b"
  ])],
  ["docs/executable-contracts/21_PRE_F5E_PLATFORM_IAM_AND_TOKEN_BOUNDARY.md", new Set([
    "0e5e2b5a79e10b67bbfbb1b2ae4437b078c56d00648e8a2d8929da4c39eeea1f"
  ])],
  ["docs/governance/PRE_F5D_PLATFORM_IAM_CONTRACT_RECONCILIATION_REPORT.md", new Set([
    "bbb8e834ec48c13497e366e616b49de94aeef4a1c9c2cbe4fed34d573a594fd5",
    "3a17bbf26b8564e3e08634da5d1fe1d239334fe9fc88d29e520c2eaa391c065b"
  ])],
  // This exact QA template line is a Docker secret-file reference, not secret material.
  // Path and full-line fingerprint are pinned so any value/path change is rescanned.
  ["deploy/qa/.env.example", new Set([
    "cd116a1137c8b1d3700fc917002b816becef8d165c92f5ca682572898a6cf8c9"
  ])]
]);
const approvedHits = new Set();
const fingerprint = (value) => createHash("sha256").update(value).digest("hex");
const approvedKey = (path, lineHash) => `${path}:${lineHash}`;
const isApprovedFalsePositive = (path, line) => {
  const lineHash = fingerprint(line);
  const approved = approvedFalsePositives.get(path)?.has(lineHash) ?? false;
  if (approved) approvedHits.add(approvedKey(path, lineHash));
  return approved;
};

const assignedSecretPatterns = patterns.filter(([kind]) => kind === "quoted-secret" || kind === "environment-secret");
const detects = (value) => assignedSecretPatterns.some(([, pattern]) => pattern.test(value));
const canaryValue = "abcdefgh" + "ijklmnop";
const approvedWithoutRecording = (path, line) => approvedFalsePositives.get(path)?.has(fingerprint(line)) ?? false;
if (!detects(`password: "${canaryValue}"`)
  || !detects(`DATABASE_PASSWORD=${canaryValue}`)
  || detects("password: databasePassword")
  || isApprovedFalsePositive("synthetic.env", `DATABASE_PASSWORD=${canaryValue}`)
  || !approvedWithoutRecording("deploy/qa/.env.example", "OBJECT_STORAGE_SECRET_KEY_FILE=/run/secrets/object_storage_secret_key")
  || approvedWithoutRecording("deploy/qa/.env.example", `OBJECT_STORAGE_SECRET_KEY=${canaryValue}`)) {
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
      const repositoryPath = relative(root, path);
      for (const [kind, pattern] of patterns) {
        if (kind !== "environment-secret") {
          if (pattern.test(content)) findings.push({ path: repositoryPath, kind });
          continue;
        }
        for (const line of content.split(/\r?\n/)) {
          if (pattern.test(line) && !isApprovedFalsePositive(repositoryPath, line)) findings.push({ path: repositoryPath, kind });
        }
      }
    }
  }
}

walk(root);
for (const [path, hashes] of approvedFalsePositives) {
  for (const lineHash of hashes) {
    if (!approvedHits.has(approvedKey(path, lineHash))) findings.push({ path, kind: "stale-secret-false-positive-approval" });
  }
}
process.stdout.write(`${JSON.stringify({ secretFindings: findings.length, findings }, null, 2)}\n`);
if (findings.length) process.exitCode = 1;
