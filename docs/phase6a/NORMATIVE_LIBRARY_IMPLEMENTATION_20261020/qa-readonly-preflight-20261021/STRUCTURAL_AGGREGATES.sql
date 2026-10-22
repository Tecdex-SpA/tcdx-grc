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
SELECT jsonb_build_object('category','definition_presence','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS matching_definitions FROM config.configuration_definitions WHERE configuration_code=ANY(ARRAY['control_operational_activity','control_recommended_evidence','control_operational_frequency','control_operational_confirmation'])) x;
SELECT jsonb_build_object('category','registry_presence','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS matching_rows FROM ops_audit.lifecycle_transition_definitions WHERE command_code=ANY(ARRAY['configurationOverrideDecide.approved','configurationOverrideDecide.rejected','configurationOverrideReview.rejected','configurationOverrideReview.reviewed','configurationOverrideUpdate','knowledgeVersionPublish','knowledgeVersionReview.rejected','knowledgeVersionReview.reviewed','knowledgeVersionUpdate','platformKnowledgeVersionPublish','platformKnowledgeVersionReview.rejected','platformKnowledgeVersionReview.reviewed','platformKnowledgeVersionUpdate']) AND entity_type IN ('KnowledgeVersion','ConfigurationOverride')) x;
\else
\quit 3
\endif
ROLLBACK;
