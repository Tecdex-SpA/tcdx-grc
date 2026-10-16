"""QA metadata through the running backend's TLS driver; strictly READ ONLY."""
import datetime
import json
from pathlib import Path
import subprocess

OUT = Path(__file__).resolve().parent
source = r'''
import {createDatabase,sql} from './dist/database.js';
import {loadConfig} from './dist/config.js';
const db=createDatabase(loadConfig(process.env));
try {
  const result=await db.transaction().execute(async tx=>{
    await sql`SET TRANSACTION READ ONLY`.execute(tx);
    await sql`SET LOCAL statement_timeout='10s'`.execute(tx);
    const identity=(await sql`SELECT current_database() AS database,host(inet_server_addr()) AS server,
      current_setting('server_version_num')::int/10000 AS major,current_setting('transaction_read_only') AS read_only,
      ssl,version AS tls FROM pg_stat_ssl WHERE pid=pg_backend_pid()`.execute(tx)).rows[0];
    if(identity.database!=='tcdx-grc'||identity.server!=='192.168.2.40'||identity.major!==16||identity.read_only!=='on'||!identity.ssl)
      throw Error('QA_READONLY_IDENTITY_GATE');
    const migrations=(await sql`SELECT migration_id,filename,content_sha256,outcome FROM platform.schema_migrations ORDER BY migration_id`.execute(tx)).rows;
    const families=(await sql`SELECT to_regclass('regulatory.pack_families')::text AS pack_families,
      to_regclass('regulatory.commercial_families')::text AS commercial_families,
      to_regclass('regulatory.regulatory_pack_family_assignments')::text AS assignments,
      to_regclass('platform.plan_version_pack_families')::text AS plan_families`.execute(tx)).rows[0];
    const limits=(await sql`SELECT count(*)::int AS total,count(*) FILTER(WHERE limit_code ILIKE '%pack%')::int AS pack_limits
      FROM platform.usage_limits`.execute(tx)).rows[0];
    const limit_constraints=(await sql`SELECT conname,pg_get_constraintdef(oid) AS definition FROM pg_constraint
      WHERE conrelid='platform.usage_limits'::regclass ORDER BY conname`.execute(tx)).rows;
    const permissions=(await sql`SELECT count(*) FILTER(WHERE lifecycle_state='published')::int AS published,
      count(*) FILTER(WHERE permission_code='platform.subscription.change_plan' AND lifecycle_state='published')::int AS change_plan
      FROM iam.permissions`.execute(tx)).rows[0];
    const packs=(await sql`SELECT pack_code,source_type FROM regulatory.regulatory_packs ORDER BY pack_code`.execute(tx)).rows;
    const contradictions=(await sql`SELECT count(*)::int AS tenants_with_multiple_current_subscriptions FROM
      (SELECT tenant_id FROM platform.subscriptions WHERE lifecycle_state='active' AND starts_at<=transaction_timestamp()
        AND (ends_at IS NULL OR ends_at>transaction_timestamp()) AND cancelled_at IS NULL GROUP BY tenant_id HAVING count(*)>1) q`.execute(tx)).rows[0];
    return {identity,migrations,families,limits,limit_constraints,permissions,packs,contradictions};
  });
  console.log(JSON.stringify({status:'PASS_READONLY_METADATA',...result,DDL:0,DML:0,secrets_exported:false}));
} catch(error) {console.log(JSON.stringify({status:'FAIL',safe_code:error.code??'QA_READONLY_PROBE_FAILED'}));process.exitCode=1;}
finally {await db.destroy();}
'''
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
process = subprocess.run(['ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10',
                          'tecdex@192.168.2.45', 'docker', 'exec', '-i', '-w', '/app/apps/backend',
                          'tcdx-grc-backend', 'node', '--input-type=module'],
                         input=source, capture_output=True, text=True, timeout=45)
result = dict(started_at=started, finished_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
              exit_code=process.returncode, target='backend 192.168.2.45 -> PostgreSQL 192.168.2.40', DDL=0, DML=0)
try:
    result['probe'] = json.loads(process.stdout.strip())
except json.JSONDecodeError:
    result['probe'] = {'status': 'FAIL', 'safe_code': 'NO_STRUCTURED_READONLY_RESULT'}
(OUT / 'qa-readonly.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
raise SystemExit(process.returncode or (0 if result['probe']['status'] == 'PASS_READONLY_METADATA' else 1))
