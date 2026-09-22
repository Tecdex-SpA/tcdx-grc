import { createClient, readJson } from "./db.ts";

type Phase5RuntimePermissions = {
  migrationId: string;
  permissionRows: number;
  rolePermissionRows: number;
  permissionCodes: string[];
};

type SeedManifest = {
  permissionRows: number;
  lifecycleEdges: number;
  rawLifecycleDefinitionRows: number;
  configurationDefaults: number;
  protectedRegulatoryContents: number;
  contentSha256: string;
  phase5RuntimePermissions?: Phase5RuntimePermissions;
};

type MigrationManifest = {
  migrations: Array<{
    id: string;
    sha256: string;
  }>;
};

const manifest = readJson<SeedManifest>("database/seed-manifest.json");
const migrationManifest = readJson<MigrationManifest>("database/migrations/manifest.json");
const client = createClient();
await client.connect();
const failures: string[] = [];

try {
  const scalar = async (sql: string, params: unknown[] = []) =>
    Number((await client.query<{ count: string }>(sql, params)).rows[0]?.count ?? -1);

  const phase5 = manifest.phase5RuntimePermissions;
  let phase5Applied = false;

  if (phase5) {
    const ledger = await client.query<{ content_sha256: string; outcome: string }>(
      "SELECT content_sha256, outcome FROM platform.schema_migrations WHERE migration_id=$1",
      [phase5.migrationId],
    );

    if (ledger.rows.length > 0) {
      phase5Applied = ledger.rows[0]?.outcome === "applied";
      const declared = migrationManifest.migrations.find((migration) => migration.id === phase5.migrationId);

      if (!declared) {
        failures.push(`phase5-runtime-migration-manifest-missing:${phase5.migrationId}`);
      } else if (ledger.rows[0]?.content_sha256 !== declared.sha256) {
        failures.push(`phase5-runtime-migration-checksum:${ledger.rows[0]?.content_sha256 ?? "missing"}:${declared.sha256}`);
      }
    }
  }

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
    methodologies: await scalar("SELECT count(*)::text AS count FROM risk.risk_methodologies"),
  };

  const expectedPermissions =
    manifest.permissionRows + (phase5Applied && phase5 ? phase5.permissionRows : 0);

  const expected = {
    plans: 3,
    capabilities: 20,
    entitlements: 36,
    roles: 24,
    permissions: expectedPermissions,
    lifecycleDefinitionRows: manifest.rawLifecycleDefinitionRows,
    lifecycleEdges: manifest.lifecycleEdges,
    configurationDefaults: manifest.configurationDefaults,
    regulatoryPackHeaders: 5,
    regulatoryPackVersions: manifest.protectedRegulatoryContents,
    impactLevels: 5,
    likelihoodLevels: 5,
    methodologies: 1,
  };

  for (const [key, value] of Object.entries(expected)) {
    if (counts[key as keyof typeof counts] !== value) {
      failures.push(`${key}:${counts[key as keyof typeof counts]}:${value}`);
    }
  }

  if (phase5Applied && phase5) {
    const permissionRows = await scalar(
      "SELECT count(*)::text AS count FROM iam.permissions WHERE permission_code = ANY($1::text[])",
      [phase5.permissionCodes],
    );
    if (permissionRows !== phase5.permissionRows) {
      failures.push(`phase5-runtime-permissions:${permissionRows}:${phase5.permissionRows}`);
    }

    const rolePermissionRows = await scalar(
      `SELECT count(*)::text AS count
         FROM iam.role_permissions rp
         JOIN iam.permissions p ON p.permission_id = rp.permission_id
        WHERE p.permission_code = ANY($1::text[])`,
      [phase5.permissionCodes],
    );
    if (rolePermissionRows !== phase5.rolePermissionRows) {
      failures.push(`phase5-runtime-role-permissions:${rolePermissionRows}:${phase5.rolePermissionRows}`);
    }
  }

  const dismiss = await client.query<{ from_state: string; to_state: string; command_code: string }>(`SELECT from_state, to_state, command_code FROM (
    SELECT DISTINCT ON (entity_type, from_state, command_code) entity_type, from_state, to_state, command_code, lifecycle_state
      FROM ops_audit.lifecycle_transition_definitions
     ORDER BY entity_type, from_state, command_code, version_number DESC
  ) current_edges WHERE entity_type='Issue' AND to_state='dismissed' AND lifecycle_state='published' ORDER BY from_state`);

  if (
    JSON.stringify(dismiss.rows) !==
    JSON.stringify([
      { from_state: "open", to_state: "dismissed", command_code: "issue.dismiss" },
      { from_state: "triaged", to_state: "dismissed", command_code: "issue.dismiss" },
    ])
  ) {
    failures.push("issue-dismissal-edges");
  }

  const seedLedger = await client.query<{ content_sha256: string }>(
    "SELECT content_sha256 FROM platform.schema_migrations WHERE migration_id='20260916000900'",
  );
  if (seedLedger.rows[0]?.content_sha256 !== manifest.contentSha256) {
    failures.push("seed-ledger-checksum");
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        counts,
        expectedPermissionRows: expectedPermissions,
        phase5RuntimePermissionsApplied: phase5Applied,
        issueDismissedSources: dismiss.rows.map((row) => row.from_state),
        seedMismatches: failures.length,
        failures,
      },
      null,
      2,
    )}
`,
  );

  if (failures.length) process.exitCode = 1;
} finally {
  await client.end();
}
