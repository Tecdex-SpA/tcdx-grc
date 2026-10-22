\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SHOW transaction_read_only;
SELECT current_database()='tcdx-grc' AND current_user='postgres'
 AND inet_server_addr()='192.168.2.40'::inet AND inet_server_port()=5432
 AND current_setting('server_version_num')::integer/10000=16
 AND current_setting('transaction_read_only')='on'
 AND current_setting('default_transaction_read_only')='on'
 AND current_setting('statement_timeout')='5s' AND current_setting('lock_timeout')='1s'
 AND NOT pg_is_in_recovery() AS qa_identity_ok \gset
\if :qa_identity_ok
SELECT jsonb_build_object('category','identity','database',current_database(),
 'user',current_user,'server_address',inet_server_addr(),'server_port',inet_server_port(),
 'version',version(),'server_version_num',current_setting('server_version_num'),
 'default_transaction_read_only',current_setting('default_transaction_read_only'),
 'transaction_read_only',current_setting('transaction_read_only'),
 'statement_timeout',current_setting('statement_timeout'),'lock_timeout',current_setting('lock_timeout'),
 'cluster_name',current_setting('cluster_name',true),'in_recovery',pg_is_in_recovery(),
 'role_superuser',(SELECT rolsuper FROM pg_catalog.pg_roles WHERE rolname=current_user));
SELECT jsonb_build_object('category','relations','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT n.nspname||'.'||c.relname AS name,c.relkind,pg_get_userbyid(c.relowner) AS owner,c.reltuples::bigint AS estimated_rows,c.relrowsecurity,c.relforcerowsecurity FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname||'.'||c.relname IN ('iam.user_identities','platform.tenants') ORDER BY name LIMIT 5) x;
SELECT jsonb_build_object('category','columns','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT n.nspname||'.'||c.relname AS relation,a.attname AS name,format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull,pg_get_expr(d.adbin,d.adrelid) AS default_expression,a.attidentity,a.attgenerated FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE n.nspname||'.'||c.relname IN ('iam.user_identities','platform.tenants') AND a.attnum>0 AND NOT a.attisdropped ORDER BY relation,a.attnum LIMIT 100) x;
SELECT jsonb_build_object('category','constraints','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT n.nspname||'.'||c.relname AS relation,k.conname AS name,k.contype,k.convalidated,k.condeferrable,k.condeferred,pg_get_constraintdef(k.oid,true) AS definition FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname||'.'||c.relname IN ('iam.user_identities','platform.tenants') ORDER BY relation,name LIMIT 100) x;
\else
\quit 3
\endif
ROLLBACK;
