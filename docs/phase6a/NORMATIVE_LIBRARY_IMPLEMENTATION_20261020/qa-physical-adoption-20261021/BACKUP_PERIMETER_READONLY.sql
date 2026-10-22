\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT current_database()='tcdx-grc' AND inet_server_addr()='192.168.2.40'::inet
 AND inet_server_port()=5432 AND current_user='postgres'
 AND current_setting('server_version_num')='160015'
 AND current_setting('cluster_name',true)='16/main' AND NOT pg_is_in_recovery()
 AND current_setting('default_transaction_read_only')='on'
 AND current_setting('transaction_read_only')='on' AS identity_ok \gset
\if :identity_ok
SELECT jsonb_build_object('category','backup_perimeter','other_connectable_non_template_databases',(SELECT count(*) FROM pg_catalog.pg_database WHERE datallowconn AND NOT datistemplate AND datname NOT IN (current_database(),'postgres')),'extra_tablespaces',(SELECT count(*) FROM pg_catalog.pg_tablespace WHERE spcname NOT IN ('pg_default','pg_global')),'active_basebackups',(SELECT count(*) FROM pg_catalog.pg_stat_progress_basebackup));
\else
\quit 3
\endif
ROLLBACK;
