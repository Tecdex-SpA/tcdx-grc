import pg from 'pg';
let input='';for await (const c of process.stdin) input+=c;
const config=JSON.parse(input);config.ssl={rejectUnauthorized:false};delete config.sslMode;
const db=new pg.Client(config);await db.connect();
try {await db.query('BEGIN READ ONLY');
const realm=(await db.query("SELECT id,name,sso_idle_timeout,sso_max_lifespan,access_token_lifespan,revoke_refresh_token,refresh_token_max_reuse FROM realm WHERE name=$1",['tcdx-managed-identity'])).rows;
const attributes=(await db.query("SELECT name,value FROM realm_attribute WHERE realm_id=$1 AND name ~ '(session|Session|lifespan|Lifespan)' ORDER BY name",[realm[0].id])).rows;
const client=(await db.query("SELECT id,client_id,enabled FROM client WHERE realm_id=$1 AND client_id=$2",[realm[0].id,'tcdx-grc'])).rows;
const clientAttributes=(await db.query("SELECT name,value FROM client_attributes WHERE client_id=$1 AND name ~ '(session|token|lifespan)' ORDER BY name",[client[0].id])).rows;
const events=(await db.query("SELECT type,error,count(*)::int AS count FROM event_entity WHERE realm_id=$1 AND event_time >= $2 GROUP BY type,error ORDER BY type,error",[realm[0].id,Date.parse('2026-10-19T14:35:00Z')])).rows;
const sessions=(await db.query("SELECT to_timestamp(created_on) AS created_at,to_timestamp(last_session_refresh) AS refreshed_at,data::jsonb #>> '{notes,AUTH_TIME}' AS authentication_time FROM offline_user_session WHERE realm_id=$1 AND created_on >= $2 ORDER BY created_on",[realm[0].id,Date.parse('2026-10-19T14:35:00Z')/1000])).rows;
const amr=(await db.query("SELECT e.authenticator,c.name,c.value FROM authentication_execution e JOIN authenticator_config_entry c ON c.authenticator_id=e.auth_config WHERE e.realm_id=$1 AND c.name IN ('default.reference.value','default.reference.maxAge') ORDER BY e.authenticator,c.name",[realm[0].id])).rows;
console.log(JSON.stringify({capturedAt:new Date().toISOString(),realm,attributes,client,clientAttributes,events,sessions,amr},null,2));
await db.query('ROLLBACK');}finally{await db.end();}
