import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, readJson, repositoryRoot } from "./db.ts";

type SeedManifest = { contentSha256: string };
const manifest = readJson<SeedManifest>("database/seed-manifest.json");
const seedPath = resolve(repositoryRoot, "database/migrations/20260916000900_canonical_seeds.sql");
const seedBytes = readFileSync(seedPath);
const checksum = createHash("sha256").update(seedBytes).digest("hex");
if (checksum !== manifest.contentSha256) throw new Error("Seed manifest checksum mismatch");

const client = createClient();
await client.connect();
try {
  const snapshot = async () => (await client.query<{ state: string }>(`
    SELECT jsonb_build_object(
      'plans', (SELECT count(*) FROM platform.plans),
      'capabilities', (SELECT count(*) FROM platform.capabilities),
      'entitlements', (SELECT count(*) FROM platform.entitlements),
      'roles', (SELECT count(*) FROM iam.roles),
      'permissions', (SELECT count(*) FROM iam.permissions),
      'grants', (SELECT count(*) FROM iam.role_permissions),
      'lifecycle_definitions', (SELECT count(*) FROM ops_audit.lifecycle_transition_definitions),
      'lifecycle_scopes', (SELECT count(*) FROM ops_audit.lifecycle_transition_scopes),
      'lifecycle_side_effects', (SELECT count(*) FROM ops_audit.lifecycle_transition_side_effects),
      'impact_levels', (SELECT count(*) FROM risk.impact_scale_levels),
      'likelihood_levels', (SELECT count(*) FROM risk.likelihood_scale_levels),
      'methodologies', (SELECT count(*) FROM risk.risk_methodologies),
      'regulatory_pack_headers', (SELECT count(*) FROM regulatory.regulatory_packs),
      'configuration_defaults', (SELECT count(*) FROM config.configuration_definitions),
      'regulatory_pack_versions', (SELECT count(*) FROM regulatory.regulatory_pack_versions)
    )::text AS state`)).rows[0]!.state;

  const before = await snapshot();
  await client.query("BEGIN");
  try {
    await client.query(seedBytes.toString("utf8"));
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
  const after = await snapshot();
  const pass = before === after;
  process.stdout.write(`${JSON.stringify({ seedReapply: pass ? "PASS" : "BLOCKED", checksum, before: JSON.parse(before), after: JSON.parse(after) }, null, 2)}\n`);
  if (!pass) process.exitCode = 1;
} finally {
  await client.end();
}
