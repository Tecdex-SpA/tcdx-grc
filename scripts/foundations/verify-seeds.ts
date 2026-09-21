import { createClient, readJson } from "./db.ts";

type SeedManifest = { permissionRows: number; lifecycleEdges: number; rawLifecycleDefinitionRows: number; configurationDefaults: number; protectedRegulatoryContents: number; contentSha256: string };
const manifest = readJson<SeedManifest>("database/seed-manifest.json");
const client = createClient();
await client.connect();
const failures: string[] = [];
try {
  const scalar = async (sql: string, params: unknown[] = []) => Number((await client.query<{ count: string }>(sql, params)).rows[0]?.count ?? -1);
  const counts = {
    plans: await scalar("SELECT count(*)::text AS count FROM platform.plans"),
    capabilities: await scalar("SELECT count(*)::text AS count FROM platform.capabilities"),
    entitlements: await scalar("SELECT count(*)::text AS count FROM platform.entitlements WHERE is_enabled"),
    roles: await scalar("SELECT count(*)::text AS count FROM iam.roles WHERE is_baseline"),
    permissions: await scalar("SELECT count(*)::text AS count FROM iam.permissions"),
    lifecycleDefinitionRows: await scalar("SELECT count(*)::text AS count FROM ops_audit.lifecycle_transition_definitions"),
    lifecycleEdges: await scalar(`SELECT count(*)::text AS count FROM (
      SELECT DISTINCT ON (entity_type, from_state, command_code) lifecycle_state
        FROM ops_audit.lifecycle_transition_definitions
       ORDER BY entity_type, from_state, command_code, version_number DESC
    ) current_edges WHERE lifecycle_state = 'published'`),
    configurationDefaults: await scalar("SELECT count(*)::text AS count FROM config.configuration_definitions"),
    regulatoryPackHeaders: await scalar("SELECT count(*)::text AS count FROM regulatory.regulatory_packs"),
    regulatoryPackVersions: await scalar("SELECT count(*)::text AS count FROM regulatory.regulatory_pack_versions"),
    impactLevels: await scalar("SELECT count(*)::text AS count FROM risk.impact_scale_levels"),
    likelihoodLevels: await scalar("SELECT count(*)::text AS count FROM risk.likelihood_scale_levels"),
    methodologies: await scalar("SELECT count(*)::text AS count FROM risk.risk_methodologies")
  };
  const expected = { plans: 3, capabilities: 20, entitlements: 36, roles: 24, permissions: manifest.permissionRows, lifecycleDefinitionRows: manifest.rawLifecycleDefinitionRows, lifecycleEdges: manifest.lifecycleEdges, configurationDefaults: manifest.configurationDefaults, regulatoryPackHeaders: 5, regulatoryPackVersions: manifest.protectedRegulatoryContents, impactLevels: 5, likelihoodLevels: 5, methodologies: 1 };
  for (const [key, value] of Object.entries(expected)) if (counts[key as keyof typeof counts] !== value) failures.push(`${key}:${counts[key as keyof typeof counts]}:${value}`);
  const dismiss = await client.query<{ from_state: string; to_state: string; command_code: string }>(`SELECT from_state, to_state, command_code FROM (
    SELECT DISTINCT ON (entity_type, from_state, command_code) entity_type, from_state, to_state, command_code, lifecycle_state
      FROM ops_audit.lifecycle_transition_definitions
     ORDER BY entity_type, from_state, command_code, version_number DESC
  ) current_edges WHERE entity_type='Issue' AND to_state='dismissed' AND lifecycle_state='published' ORDER BY from_state`);
  if (JSON.stringify(dismiss.rows) !== JSON.stringify([{ from_state: "open", to_state: "dismissed", command_code: "issue.dismiss" }, { from_state: "triaged", to_state: "dismissed", command_code: "issue.dismiss" }])) failures.push("issue-dismissal-edges");
  const seedLedger = await client.query<{ content_sha256: string }>("SELECT content_sha256 FROM platform.schema_migrations WHERE migration_id='20260916000900'");
  if (seedLedger.rows[0]?.content_sha256 !== manifest.contentSha256) failures.push("seed-ledger-checksum");
  process.stdout.write(`${JSON.stringify({ counts, issueDismissedSources: dismiss.rows.map((row) => row.from_state), seedMismatches: failures.length, failures }, null, 2)}\n`);
  if (failures.length) process.exitCode = 1;
} finally {
  await client.end();
}
