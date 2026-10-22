// Execute inside the existing QA backend. Read-only; never output tokens or secrets.
const { Pool } = require('/app/apps/backend/node_modules/pg');
const since = process.argv[2];
if (!since || !Number.isFinite(Date.parse(since))) throw Error('OBSERVATION_START_REQUIRED');
(async () => {
  if (process.env.NODE_ENV !== 'qa') throw Error('QA_REQUIRED');
  const pool = new Pool({host:process.env.DATABASE_HOST,port:Number(process.env.DATABASE_PORT),
    database:process.env.DATABASE_NAME,user:process.env.DATABASE_USER,password:process.env.DATABASE_PASSWORD,
    ssl:process.env.DATABASE_SSL_MODE==='disable'?false:{rejectUnauthorized:process.env.DATABASE_SSL_MODE!=='no-verify'}});
  const db=await pool.connect();
  try {
    await db.query('BEGIN READ ONLY');
    const renewal=await db.query(`SELECT command_code,count(*)::int AS events,min(occurred_at) AS first_at,max(occurred_at) AS last_at
      FROM ops_audit.audit_events WHERE occurred_at >= $1 AND command_code IN ('oidc.session.establish','oidc.session.renew','application.session.logout')
      GROUP BY command_code ORDER BY command_code`,[since]);
    const revocations=await db.query(`SELECT r.occurred_at AS revoked_at,i.after_payload->>'expires_at' AS issued_token_expiry,
        (i.after_payload->>'expires_at')::timestamptz > r.occurred_at AS revoked_before_expiry
      FROM ops_audit.audit_events r JOIN ops_audit.audit_events i
        ON i.after_payload->>'token_id_fingerprint'=r.after_payload->>'token_id_fingerprint'
       AND i.event_code='audit.iam.application_token.issue.v1'
      WHERE r.event_code='audit.iam.application_token.revoke.v1' AND r.command_code='application.session.logout'
        AND r.occurred_at >= $1 ORDER BY r.occurred_at`,[since]);
    await db.query('ROLLBACK');
    console.log(JSON.stringify({capturedAt:new Date().toISOString(),environment:'qa',audit:renewal.rows,
      revocations:revocations.rows,queryMode:'READ ONLY',credentialsPrinted:false}));
  } finally { db.release(); await pool.end(); }
})().catch(() => {console.log(JSON.stringify({status:'FAILED_RUNTIME_RECEIPT'})); process.exitCode=1;});
