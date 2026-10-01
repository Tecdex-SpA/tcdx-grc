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
  phase5SubscriptionPermission?: Phase5RuntimePermissions;
  phase5MembershipInvitationPermissions?: {
    migrationId: string;
    permissionRows: number;
    rolePermissionRows: number;
    rolePermissionPolicy: string;
    permissionCodes: string[];
  };
  phase5AdministrativeReadPermissions?: {
    migrationId: string;
    permissionRows: number;
    permissionCodes: string[];
    platformAdminGrantRows: number;
    tenantAdminTemplateGrantRows: number;
    tenantAdminGrantRowsPerTenant: number;
  };
  phase5ControlAssessmentStart?: {
    migrationId: string;
    lifecycleDefinitionDelta: number;
    authoritativeScope: string;
    permissionCode: string;
  };
  phase5PlusPermissions?: {
    migrationId: string;
    permissionRows: number;
    permissionCodes: string[];
  };
  phase5PlusValidation?: { migrationId: string; permissionRows: number; configurationDefaults: number; permissionCodes: string[] };
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
  const subscriptionPermission = manifest.phase5SubscriptionPermission;
  const invitationPermissions = manifest.phase5MembershipInvitationPermissions;
  const administrativeReadPermissions = manifest.phase5AdministrativeReadPermissions;
  const controlAssessmentStart = manifest.phase5ControlAssessmentStart;
  const phase5PlusPermissions = manifest.phase5PlusPermissions;
  const phase5PlusValidation = manifest.phase5PlusValidation;
  let phase5Applied = false;
  let subscriptionPermissionApplied = false;
  let invitationPermissionsApplied = false;
  let administrativeReadPermissionsApplied = false;
  let controlAssessmentStartApplied = false;
  let phase5PlusApplied = false;
  let phase5PlusValidationApplied = false;

  if (phase5PlusValidation) {
    const ledger = await client.query<{ content_sha256: string; outcome: string }>(
      "SELECT content_sha256,outcome FROM platform.schema_migrations WHERE migration_id=$1", [phase5PlusValidation.migrationId]);
    if (ledger.rows.length > 0) {
      phase5PlusValidationApplied = ledger.rows[0]?.outcome === "applied";
      const declared = migrationManifest.migrations.find((migration) => migration.id === phase5PlusValidation.migrationId);
      if (!declared || ledger.rows[0]?.content_sha256 !== declared.sha256)
        failures.push(`phase5-plus-validation-migration-checksum:${phase5PlusValidation.migrationId}`);
    }
  }

  if (phase5PlusPermissions) {
    const ledger = await client.query<{ content_sha256: string; outcome: string }>(
      "SELECT content_sha256,outcome FROM platform.schema_migrations WHERE migration_id=$1", [phase5PlusPermissions.migrationId]);
    if (ledger.rows.length > 0) {
      phase5PlusApplied = ledger.rows[0]?.outcome === "applied";
      const declared = migrationManifest.migrations.find((migration) => migration.id === phase5PlusPermissions.migrationId);
      if (!declared || ledger.rows[0]?.content_sha256 !== declared.sha256)
        failures.push(`phase5-plus-migration-checksum:${phase5PlusPermissions.migrationId}`);
    }
  }

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

  if (subscriptionPermission) {
    const ledger = await client.query<{ content_sha256: string; outcome: string }>(
      "SELECT content_sha256, outcome FROM platform.schema_migrations WHERE migration_id=$1",
      [subscriptionPermission.migrationId],
    );
    if (ledger.rows.length > 0) {
      subscriptionPermissionApplied = ledger.rows[0]?.outcome === "applied";
      const declared = migrationManifest.migrations.find((migration) => migration.id === subscriptionPermission.migrationId);
      if (!declared) failures.push(`phase5-subscription-migration-manifest-missing:${subscriptionPermission.migrationId}`);
      else if (ledger.rows[0]?.content_sha256 !== declared.sha256) {
        failures.push(`phase5-subscription-migration-checksum:${ledger.rows[0]?.content_sha256 ?? "missing"}:${declared.sha256}`);
      }
    }
  }

  if (invitationPermissions) {
    const ledger = await client.query<{ content_sha256: string; outcome: string }>(
      "SELECT content_sha256,outcome FROM platform.schema_migrations WHERE migration_id=$1",
      [invitationPermissions.migrationId],
    );
    if (ledger.rows.length > 0) {
      invitationPermissionsApplied = ledger.rows[0]?.outcome === "applied";
      const declared = migrationManifest.migrations.find((migration) => migration.id === invitationPermissions.migrationId);
      if (!declared) failures.push(`phase5-invitation-migration-manifest-missing:${invitationPermissions.migrationId}`);
      else if (ledger.rows[0]?.content_sha256 !== declared.sha256) failures.push(`phase5-invitation-migration-checksum:${ledger.rows[0]?.content_sha256 ?? "missing"}:${declared.sha256}`);
    }
  }

  if (administrativeReadPermissions) {
    const ledger = await client.query<{ content_sha256: string; outcome: string }>(
      "SELECT content_sha256,outcome FROM platform.schema_migrations WHERE migration_id=$1",
      [administrativeReadPermissions.migrationId],
    );
    if (ledger.rows.length > 0) {
      administrativeReadPermissionsApplied = ledger.rows[0]?.outcome === "applied";
      const declared = migrationManifest.migrations.find((migration) => migration.id === administrativeReadPermissions.migrationId);
      if (!declared) failures.push(`phase5-admin-read-migration-manifest-missing:${administrativeReadPermissions.migrationId}`);
      else if (ledger.rows[0]?.content_sha256 !== declared.sha256) failures.push(`phase5-admin-read-migration-checksum:${ledger.rows[0]?.content_sha256 ?? "missing"}:${declared.sha256}`);
    }
  }

  if (controlAssessmentStart) {
    const ledger = await client.query<{ content_sha256: string; outcome: string }>(
      "SELECT content_sha256,outcome FROM platform.schema_migrations WHERE migration_id=$1",
      [controlAssessmentStart.migrationId],
    );
    if (ledger.rows.length > 0) {
      controlAssessmentStartApplied = ledger.rows[0]?.outcome === "applied";
      const declared = migrationManifest.migrations.find((migration) => migration.id === controlAssessmentStart.migrationId);
      if (!declared) failures.push(`phase5-control-start-migration-manifest-missing:${controlAssessmentStart.migrationId}`);
      else if (ledger.rows[0]?.content_sha256 !== declared.sha256) failures.push(`phase5-control-start-migration-checksum:${ledger.rows[0]?.content_sha256 ?? "missing"}:${declared.sha256}`);
    }
  }

  const counts = {
    plans: await scalar("SELECT count(*)::text AS count FROM platform.plans"),
    capabilities: await scalar("SELECT count(*)::text AS count FROM platform.capabilities"),
    entitlements: await scalar("SELECT count(*)::text AS count FROM platform.entitlements WHERE is_enabled"),
    roles: await scalar("SELECT count(*)::text AS count FROM iam.roles WHERE is_baseline AND ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL"),
    tenantBaselineRoles: await scalar("SELECT count(*)::text AS count FROM iam.roles WHERE is_baseline AND ownership_class='TENANT_OWNED' AND tenant_id IS NOT NULL"),
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
    manifest.permissionRows
    + (phase5Applied && phase5 ? phase5.permissionRows : 0)
    + (subscriptionPermissionApplied && subscriptionPermission ? subscriptionPermission.permissionRows : 0)
    + (invitationPermissionsApplied && invitationPermissions ? invitationPermissions.permissionRows : 0)
    + (administrativeReadPermissionsApplied && administrativeReadPermissions ? administrativeReadPermissions.permissionRows : 0)
    + (phase5PlusApplied && phase5PlusPermissions ? phase5PlusPermissions.permissionRows : 0)
    + (phase5PlusValidationApplied && phase5PlusValidation ? phase5PlusValidation.permissionRows : 0);

  // Regulatory versions are materialized by the governed importer after the seeds.
  // Every non-seed version must retain an ImportManifest; seed verification must
  // still reject unexplained versions without treating imported business data as seeds.
  const importedRegulatoryPackVersions = await scalar(`SELECT count(DISTINCT pv.regulatory_pack_version_id)::text AS count
    FROM regulatory.regulatory_pack_versions pv
    JOIN regulatory.regulatory_import_manifests im ON im.regulatory_pack_version_id=pv.regulatory_pack_version_id`);

  const expected = {
    plans: 3,
    capabilities: 20,
    entitlements: 36,
    roles: 24,
    permissions: expectedPermissions,
    lifecycleDefinitionRows: manifest.rawLifecycleDefinitionRows + (controlAssessmentStartApplied && controlAssessmentStart ? controlAssessmentStart.lifecycleDefinitionDelta : 0),
    lifecycleEdges: manifest.lifecycleEdges,
    configurationDefaults: manifest.configurationDefaults +
      (phase5PlusValidationApplied && phase5PlusValidation ? phase5PlusValidation.configurationDefaults : 0),
    regulatoryPackHeaders: 5,
    regulatoryPackVersions: manifest.protectedRegulatoryContents + importedRegulatoryPackVersions,
    impactLevels: 5,
    likelihoodLevels: 5,
    methodologies: 1,
  };

  for (const [key, value] of Object.entries(expected)) {
    if (counts[key as keyof typeof counts] !== value) {
      failures.push(`${key}:${counts[key as keyof typeof counts]}:${value}`);
    }
  }

  if (controlAssessmentStartApplied && controlAssessmentStart) {
    const current = await client.query<{ scope_kind: string; permission_code: string; version_number: number }>(`
      SELECT s.scope_kind,p.permission_code,d.version_number
        FROM ops_audit.lifecycle_transition_definitions d
        JOIN ops_audit.lifecycle_transition_scopes s ON s.lifecycle_transition_definition_id=d.lifecycle_transition_definition_id
        JOIN iam.permissions p ON p.permission_id=d.permission_id
       WHERE d.entity_type='ControlAssessment' AND d.from_state='planned'
         AND d.command_code='control_assessment.start' AND d.lifecycle_state='published'
       ORDER BY d.version_number DESC LIMIT 1
    `);
    const row = current.rows[0];
    if (row?.scope_kind !== controlAssessmentStart.authoritativeScope || row.permission_code !== controlAssessmentStart.permissionCode || Number(row.version_number) !== 3) {
      failures.push("control-assessment-start-current-scope");
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
        WHERE rp.ownership_class='PLATFORM_CONTROL' AND rp.tenant_id IS NULL
          AND p.permission_code = ANY($1::text[])`,
      [phase5.permissionCodes],
    );
    if (rolePermissionRows !== phase5.rolePermissionRows) {
      failures.push(`phase5-runtime-role-permissions:${rolePermissionRows}:${phase5.rolePermissionRows}`);
    }
  }

  if (subscriptionPermissionApplied && subscriptionPermission) {
    const permissionRows = await scalar(
      "SELECT count(*)::text AS count FROM iam.permissions WHERE permission_code = ANY($1::text[]) AND lifecycle_state='published'",
      [subscriptionPermission.permissionCodes],
    );
    if (permissionRows !== subscriptionPermission.permissionRows) {
      failures.push(`phase5-subscription-permissions:${permissionRows}:${subscriptionPermission.permissionRows}`);
    }
    const rolePermissionRows = await scalar(
      `SELECT count(*)::text AS count
         FROM iam.role_permissions rp
         JOIN iam.permissions p ON p.permission_id=rp.permission_id
         JOIN iam.roles r ON r.role_id=rp.role_id
        WHERE rp.ownership_class='PLATFORM_CONTROL' AND rp.tenant_id IS NULL
          AND r.role_code='PLATFORM_ADMIN'
          AND p.permission_code = ANY($1::text[])`,
      [subscriptionPermission.permissionCodes],
    );
    if (rolePermissionRows !== subscriptionPermission.rolePermissionRows) {
      failures.push(`phase5-subscription-role-permissions:${rolePermissionRows}:${subscriptionPermission.rolePermissionRows}`);
    }
  }


  if (invitationPermissionsApplied && invitationPermissions) {
    const permissionRows = await scalar(
      "SELECT count(*)::text AS count FROM iam.permissions WHERE permission_code = ANY($1::text[]) AND lifecycle_state='published'",
      [invitationPermissions.permissionCodes],
    );
    if (permissionRows !== invitationPermissions.permissionRows) failures.push(`phase5-invitation-permissions:${permissionRows}:${invitationPermissions.permissionRows}`);
    const unauthorizedGrants = await scalar(
      `SELECT count(*)::text AS count
         FROM iam.role_permissions rp
         JOIN iam.permissions p ON p.permission_id=rp.permission_id
         JOIN iam.roles r ON r.role_id=rp.role_id
        WHERE p.permission_code=ANY($1::text[])
          AND NOT (r.role_code='PLATFORM_ADMIN' AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL
            AND rp.ownership_class='PLATFORM_CONTROL' AND rp.tenant_id IS NULL)`,
      [invitationPermissions.permissionCodes],
    );
    if (unauthorizedGrants !== 0) failures.push(`phase5-invitation-unauthorized-grants:${unauthorizedGrants}:0`);
    const authorizedGrants = await scalar(
      `SELECT count(*)::text AS count
         FROM iam.role_permissions rp
         JOIN iam.permissions p ON p.permission_id=rp.permission_id
         JOIN iam.roles r ON r.role_id=rp.role_id
        WHERE p.permission_code=ANY($1::text[])
          AND r.role_code='PLATFORM_ADMIN' AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL
          AND rp.ownership_class='PLATFORM_CONTROL' AND rp.tenant_id IS NULL`,
      [invitationPermissions.permissionCodes],
    );
    if (authorizedGrants !== invitationPermissions.rolePermissionRows) failures.push(`phase5-invitation-platform-admin-grants:${authorizedGrants}:${invitationPermissions.rolePermissionRows}`);
  }

  if (administrativeReadPermissionsApplied && administrativeReadPermissions) {
    const codes = administrativeReadPermissions.permissionCodes;
    const permissionRows = await scalar(
      "SELECT count(*)::text AS count FROM iam.permissions WHERE permission_code=ANY($1::text[]) AND lifecycle_state='published'",
      [codes],
    );
    if (permissionRows !== administrativeReadPermissions.permissionRows) failures.push(`phase5-admin-read-permissions:${permissionRows}:${administrativeReadPermissions.permissionRows}`);
    const authorizedGrants = await scalar(`
      SELECT count(*)::text AS count
        FROM iam.role_permissions rp
        JOIN iam.roles r ON r.role_id=rp.role_id
        JOIN iam.permissions p ON p.permission_id=rp.permission_id
       WHERE p.permission_code=ANY($1::text[])
         AND rp.ownership_class=r.ownership_class AND rp.tenant_id IS NOT DISTINCT FROM r.tenant_id
         AND (r.role_code='PLATFORM_ADMIN' AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL
           OR r.role_code='TENANT_ADMIN' AND p.permission_code IN ('platform.membership.read','platform.role.read')
             AND (r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL
               OR r.ownership_class='TENANT_OWNED' AND r.tenant_id IS NOT NULL))`, [codes]);
    const unauthorizedGrants = await scalar(`
      SELECT count(*)::text AS count
        FROM iam.role_permissions rp
        JOIN iam.roles r ON r.role_id=rp.role_id
        JOIN iam.permissions p ON p.permission_id=rp.permission_id
       WHERE p.permission_code=ANY($1::text[])
         AND NOT (rp.ownership_class=r.ownership_class AND rp.tenant_id IS NOT DISTINCT FROM r.tenant_id
           AND (r.role_code='PLATFORM_ADMIN' AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL
             OR r.role_code='TENANT_ADMIN' AND p.permission_code IN ('platform.membership.read','platform.role.read')
               AND (r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL
                 OR r.ownership_class='TENANT_OWNED' AND r.tenant_id IS NOT NULL)))`, [codes]);
    const tenantAdminCount = await scalar(`
      SELECT count(*)::text AS count FROM iam.roles
       WHERE role_code='TENANT_ADMIN' AND is_baseline=TRUE AND lifecycle_state='published'
         AND (ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL
           OR ownership_class='TENANT_OWNED' AND tenant_id IS NOT NULL)`);
    const expectedGrants = administrativeReadPermissions.platformAdminGrantRows
      + administrativeReadPermissions.tenantAdminTemplateGrantRows
      + administrativeReadPermissions.tenantAdminGrantRowsPerTenant * Math.max(0, tenantAdminCount - 1);
    if (authorizedGrants !== expectedGrants) failures.push(`phase5-admin-read-authorized-grants:${authorizedGrants}:${expectedGrants}`);
    if (unauthorizedGrants !== 0) failures.push(`phase5-admin-read-unauthorized-grants:${unauthorizedGrants}:0`);
  }

  if (phase5PlusApplied && phase5PlusPermissions) {
    const published = await scalar(
      "SELECT count(*)::text AS count FROM iam.permissions WHERE lifecycle_state='published' AND permission_code=ANY($1::text[])",
      [phase5PlusPermissions.permissionCodes]);
    if (published !== phase5PlusPermissions.permissionRows)
      failures.push(`phase5-plus-permission-codes:${published}:${phase5PlusPermissions.permissionRows}`);
    const invalidGrants = await scalar(`SELECT count(*)::text AS count FROM iam.role_permissions rp
      JOIN iam.roles r ON r.role_id=rp.role_id JOIN iam.permissions p ON p.permission_id=rp.permission_id
      WHERE p.permission_code=ANY($1::text[]) AND NOT (
        r.role_code='PLATFORM_ADMIN' AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL
          AND p.permission_code LIKE 'platform.subscription_regulatory_pack.%'
        OR r.role_code='TENANT_ADMIN' AND p.permission_code='platform.subscription_regulatory_pack.read'
        OR r.role_code=ANY($2::text[]) AND p.permission_code='organization.subject.read')`,
      [phase5PlusPermissions.permissionCodes,
        ['TENANT_ADMIN','GRC_MANAGER','QUALITY_MANAGER','COMPLIANCE_MANAGER','CISO_SECURITY_MANAGER',
          'AI_GOVERNANCE_MANAGER','PRIVACY_MANAGER','PROCESS_OWNER','CONTROL_OWNER']]);
    if (invalidGrants !== 0) failures.push(`phase5-plus-unauthorized-grants:${invalidGrants}:0`);
    const grantDrift = await scalar(`WITH expected AS (
      SELECT r.role_id,p.permission_id FROM iam.roles r CROSS JOIN iam.permissions p
       WHERE r.is_baseline=TRUE AND r.lifecycle_state='published'
         AND p.permission_code=ANY($1::text[]) AND (
           r.role_code='PLATFORM_ADMIN' AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL
             AND p.permission_code LIKE 'platform.subscription_regulatory_pack.%'
           OR r.role_code='TENANT_ADMIN' AND p.permission_code='platform.subscription_regulatory_pack.read'
           OR r.role_code=ANY($2::text[]) AND p.permission_code='organization.subject.read')
    ), actual AS (
      SELECT rp.role_id,rp.permission_id FROM iam.role_permissions rp
      JOIN iam.permissions p ON p.permission_id=rp.permission_id
      WHERE p.permission_code=ANY($1::text[])
    ) SELECT count(*)::text AS count FROM (
      (SELECT * FROM expected EXCEPT SELECT * FROM actual)
      UNION ALL
      (SELECT * FROM actual EXCEPT SELECT * FROM expected)
    ) drift`,
    [phase5PlusPermissions.permissionCodes,
      ['TENANT_ADMIN','GRC_MANAGER','QUALITY_MANAGER','COMPLIANCE_MANAGER','CISO_SECURITY_MANAGER',
        'AI_GOVERNANCE_MANAGER','PRIVACY_MANAGER','PROCESS_OWNER','CONTROL_OWNER']]);
    if (grantDrift !== 0) failures.push(`phase5-plus-grant-drift:${grantDrift}:0`);
  }
  if (phase5PlusValidationApplied && phase5PlusValidation) {
    const published = await scalar(
      "SELECT count(*)::text AS count FROM iam.permissions WHERE lifecycle_state='published' AND permission_code=ANY($1::text[])",
      [phase5PlusValidation.permissionCodes]);
    if (published !== phase5PlusValidation.permissionRows)
      failures.push(`phase5-plus-validation-permission-codes:${published}:${phase5PlusValidation.permissionRows}`);
    const grantDrift = await scalar(`WITH expected AS (
      SELECT r.role_id,p.permission_id FROM iam.roles r CROSS JOIN iam.permissions p
       WHERE r.is_baseline=TRUE AND r.lifecycle_state='published'
         AND p.permission_code=ANY($1::text[]) AND (
           r.role_code='PLATFORM_ADMIN' AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL
             AND p.permission_code LIKE 'platform.%'
           OR r.role_code='TENANT_ADMIN' AND p.permission_code IN
             ('organization.subject.create','platform.regulatory_pack_validation_access.read'))
    ), actual AS (
      SELECT rp.role_id,rp.permission_id FROM iam.role_permissions rp
      JOIN iam.permissions p ON p.permission_id=rp.permission_id
      WHERE p.permission_code=ANY($1::text[])
    ) SELECT count(*)::text AS count FROM (
      (SELECT * FROM expected EXCEPT SELECT * FROM actual)
      UNION ALL (SELECT * FROM actual EXCEPT SELECT * FROM expected)
    ) drift`,[phase5PlusValidation.permissionCodes]);
    if (grantDrift !== 0) failures.push(`phase5-plus-validation-grant-drift:${grantDrift}:0`);
  }

  const tenantBootstrapRows = await client.query<{ tenant_id: string; role_count: string }>(`
    SELECT tenant_id,count(*)::text AS role_count
      FROM iam.roles
     WHERE ownership_class='TENANT_OWNED' AND tenant_id IS NOT NULL AND is_baseline=TRUE
     GROUP BY tenant_id
     ORDER BY tenant_id
  `);
  for (const tenant of tenantBootstrapRows.rows) {
    if (Number(tenant.role_count) !== 22) failures.push(`tenant-bootstrap-roles:${tenant.tenant_id}:${tenant.role_count}:22`);
    const catalogDrift = await scalar(`
      SELECT count(*)::text AS count FROM (
        (SELECT r.role_code AS contract_key
           FROM iam.roles r
          WHERE r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL AND r.is_baseline=TRUE
            AND r.role_code NOT IN ('PLATFORM_ADMIN','PLATFORM_SUPPORT')
         EXCEPT
         SELECT r.role_code
           FROM iam.roles r
          WHERE r.ownership_class='TENANT_OWNED' AND r.tenant_id=$1::uuid AND r.is_baseline=TRUE)
        UNION ALL
        (SELECT r.role_code
           FROM iam.roles r
          WHERE r.ownership_class='TENANT_OWNED' AND r.tenant_id=$1::uuid AND r.is_baseline=TRUE
         EXCEPT
         SELECT r.role_code
           FROM iam.roles r
          WHERE r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL AND r.is_baseline=TRUE
            AND r.role_code NOT IN ('PLATFORM_ADMIN','PLATFORM_SUPPORT'))
        UNION ALL
        (SELECT r.role_code || ':' || p.permission_code
           FROM iam.roles r
           JOIN iam.role_permissions rp ON rp.role_id=r.role_id AND rp.ownership_class='PLATFORM_CONTROL' AND rp.tenant_id IS NULL
           JOIN iam.permissions p ON p.permission_id=rp.permission_id
          WHERE r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL AND r.is_baseline=TRUE
            AND r.role_code NOT IN ('PLATFORM_ADMIN','PLATFORM_SUPPORT')
         EXCEPT
         SELECT r.role_code || ':' || p.permission_code
           FROM iam.roles r
           JOIN iam.role_permissions rp ON rp.role_id=r.role_id AND rp.ownership_class='TENANT_OWNED' AND rp.tenant_id=r.tenant_id
           JOIN iam.permissions p ON p.permission_id=rp.permission_id
          WHERE r.ownership_class='TENANT_OWNED' AND r.tenant_id=$1::uuid AND r.is_baseline=TRUE)
        UNION ALL
        (SELECT r.role_code || ':' || p.permission_code
           FROM iam.roles r
           JOIN iam.role_permissions rp ON rp.role_id=r.role_id AND rp.ownership_class='TENANT_OWNED' AND rp.tenant_id=r.tenant_id
           JOIN iam.permissions p ON p.permission_id=rp.permission_id
          WHERE r.ownership_class='TENANT_OWNED' AND r.tenant_id=$1::uuid AND r.is_baseline=TRUE
         EXCEPT
         SELECT r.role_code || ':' || p.permission_code
           FROM iam.roles r
           JOIN iam.role_permissions rp ON rp.role_id=r.role_id AND rp.ownership_class='PLATFORM_CONTROL' AND rp.tenant_id IS NULL
           JOIN iam.permissions p ON p.permission_id=rp.permission_id
          WHERE r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL AND r.is_baseline=TRUE
            AND r.role_code NOT IN ('PLATFORM_ADMIN','PLATFORM_SUPPORT'))
      ) differences
    `, [tenant.tenant_id]);
    if (catalogDrift !== 0) failures.push(`tenant-bootstrap-catalog-drift:${tenant.tenant_id}:${catalogDrift}`);
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
        phase5SubscriptionPermissionApplied: subscriptionPermissionApplied,
        phase5MembershipInvitationPermissionsApplied: invitationPermissionsApplied,
        phase5AdministrativeReadPermissionsApplied: administrativeReadPermissionsApplied,
        phase5ControlAssessmentStartApplied: controlAssessmentStartApplied,
        tenantBootstrapMaterializations: tenantBootstrapRows.rows.map((row) => ({ tenantId: row.tenant_id, baselineRoles: Number(row.role_count) })),
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
