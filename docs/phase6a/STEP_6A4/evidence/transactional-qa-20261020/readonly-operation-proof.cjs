// STEP6A4 QA evidence only: read-only state and audit for the existing FORM-05 object.
const { Pool } = require('/app/apps/backend/node_modules/pg');
(async () => {
  if (process.env.NODE_ENV !== 'qa') throw Error('QA_REQUIRED');
  const db = new Pool({ host: process.env.DATABASE_HOST, port: Number(process.env.DATABASE_PORT), database: process.env.DATABASE_NAME, user: process.env.DATABASE_USER, password: process.env.DATABASE_PASSWORD, ssl: process.env.DATABASE_SSL_MODE === 'disable' ? false : { rejectUnauthorized: process.env.DATABASE_SSL_MODE !== 'no-verify' } });
  const client = await db.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const mode = (await client.query('SHOW transaction_read_only')).rows[0].transaction_read_only;
    if (mode !== 'on') throw Error('READ_ONLY_REQUIRED');
    const tenant = '01a0cfc7-0c97-75a3-890f-d6ca9db8bbe9';
    const target = '01a15942-6048-7405-b0a8-6253ff64f9bb';
    const state = (await client.query('SELECT requirement_assessment_id,tenant_id,lifecycle_state,row_version,result_status,created_by_user_identity_id,updated_by_user_identity_id FROM regulatory.requirement_assessments WHERE tenant_id=$1 AND requirement_assessment_id=$2', [tenant, target])).rows;
    const audit = (await client.query('SELECT event_code,command_code,outcome,aggregate_type,aggregate_id,actor_user_identity_id,correlation_id,occurred_at,before_payload->>\'row_version\' AS before_version,after_payload->>\'row_version\' AS after_version FROM ops_audit.audit_events WHERE tenant_id=$1 AND aggregate_id=$2 ORDER BY occurred_at DESC LIMIT 20', [tenant, target])).rows;
    await client.query('ROLLBACK');
    console.log(JSON.stringify({ captured_at: new Date().toISOString(), transaction_read_only: mode, tenant_id: tenant, target_id: target, state, audit }, null, 2));
  } finally { client.release(); await db.end(); }
})().catch(e => { console.error(e.code || e.message); process.exitCode = 1; });
