// Run inside the existing QA backend container. Output excludes credentials and personal data.
const { Pool } = require('/app/apps/backend/node_modules/pg');

async function main() {
  const pool = new Pool({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    ssl: process.env.DATABASE_SSL_MODE === 'disable' ? false : { rejectUnauthorized: process.env.DATABASE_SSL_MODE !== 'no-verify' },
    max: 1
  });
  const client = await pool.connect();
  try {
    await client.query('BEGIN READ ONLY');
    const subjects = await client.query(`
      SELECT s.display_name, s.subject_type, s.lifecycle_state,
             s.effective_from <= clock_timestamp() AND (s.effective_to IS NULL OR s.effective_to > clock_timestamp()) AS effective
        FROM org.subjects s JOIN platform.tenants t ON t.tenant_id=s.tenant_id
       WHERE t.tenant_code=$1 ORDER BY s.display_name`, ['TECDEX']);
    const retention = await client.query(`
      SELECT p.policy_code, p.version_number AS policy_version, p.lifecycle_state AS policy_state,
             p.policy_kind, p.ownership_class, p.effective_from <= clock_timestamp()
                AND (p.effective_to IS NULL OR p.effective_to > clock_timestamp()) AS policy_effective,
             a.version_number AS applicability_version, a.classification, a.purpose,
             a.lifecycle_state AS applicability_state,
             a.effective_from <= clock_timestamp()
                AND (a.effective_to IS NULL OR a.effective_to > clock_timestamp()) AS applicability_effective,
             a.scope_subject_id IS NULL AS unscoped_subject,
             a.processing_activity_id IS NULL AS unscoped_activity
        FROM privacy.retention_policies p
        JOIN platform.tenants t ON t.tenant_id=p.tenant_id
        LEFT JOIN privacy.retention_policy_applicabilities a
          ON a.tenant_id=p.tenant_id AND a.retention_policy_id=p.retention_policy_id
       WHERE t.tenant_code=$1 AND p.policy_code=$2
       ORDER BY p.version_number, a.version_number`, ['TECDEX', 'QA_RET_ORD_001']);
    const grants = await client.query(`
      SELECT r.role_code, p.permission_code
        FROM iam.roles r JOIN iam.role_permissions rp ON rp.role_id=r.role_id
        JOIN iam.permissions p ON p.permission_id=rp.permission_id
        JOIN platform.tenants t ON t.tenant_id=rp.tenant_id
       WHERE t.tenant_code=$1 AND r.role_code IN ('EVIDENCE_OWNER','PRIVACY_MANAGER')
         AND p.permission_code IN ('organization.subject.read','privacy.retention_policy.read',
           'privacy.retention_policy_reference.read','evidence.document.create','evidence.evidence.create')
       ORDER BY r.role_code,p.permission_code`, ['TECDEX']);
    await client.query('ROLLBACK');
    console.log(JSON.stringify({ subjects: subjects.rows, retention: retention.rows, grants: grants.rows }));
  } finally {
    await client.release();
    await pool.end();
  }
}
main().catch(error => { console.error(error.code || error.message); process.exitCode = 1; });
