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
SELECT jsonb_build_object('category','bounded_cardinality_knowledge.knowledge_sources','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS observed_up_to_10001 FROM (SELECT 1 FROM knowledge.knowledge_sources LIMIT 10001) x) x;
SELECT jsonb_build_object('category','bounded_cardinality_knowledge.knowledge_items','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS observed_up_to_10001 FROM (SELECT 1 FROM knowledge.knowledge_items LIMIT 10001) x) x;
SELECT jsonb_build_object('category','bounded_cardinality_knowledge.knowledge_versions','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS observed_up_to_10001 FROM (SELECT 1 FROM knowledge.knowledge_versions LIMIT 10001) x) x;
SELECT jsonb_build_object('category','bounded_cardinality_config.configuration_definitions','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS observed_up_to_10001 FROM (SELECT 1 FROM config.configuration_definitions LIMIT 10001) x) x;
SELECT jsonb_build_object('category','bounded_cardinality_config.configuration_overrides','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS observed_up_to_10001 FROM (SELECT 1 FROM config.configuration_overrides LIMIT 10001) x) x;
SELECT jsonb_build_object('category','bounded_cardinality_config.effective_configurations','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS observed_up_to_10001 FROM (SELECT 1 FROM config.effective_configurations LIMIT 10001) x) x;
SELECT jsonb_build_object('category','bounded_cardinality_regulatory.requirement_applicabilities','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS observed_up_to_10001 FROM (SELECT 1 FROM regulatory.requirement_applicabilities LIMIT 10001) x) x;
SELECT jsonb_build_object('category','bounded_cardinality_org.subjects','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS observed_up_to_10001 FROM (SELECT 1 FROM org.subjects LIMIT 10001) x) x;
SELECT jsonb_build_object('category','bounded_cardinality_controls.control_versions','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS observed_up_to_10001 FROM (SELECT 1 FROM controls.control_versions LIMIT 10001) x) x;
SELECT jsonb_build_object('category','bounded_cardinality_regulatory.requirements','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS observed_up_to_10001 FROM (SELECT 1 FROM regulatory.requirements LIMIT 10001) x) x;
SELECT jsonb_build_object('category','bounded_cardinality_regulatory.normative_units','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS observed_up_to_10001 FROM (SELECT 1 FROM regulatory.normative_units LIMIT 10001) x) x;
SELECT jsonb_build_object('category','bounded_cardinality_regulatory.regulatory_pack_versions','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS observed_up_to_10001 FROM (SELECT 1 FROM regulatory.regulatory_pack_versions LIMIT 10001) x) x;
SELECT jsonb_build_object('category','bounded_cardinality_iam.permissions','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS observed_up_to_10001 FROM (SELECT 1 FROM iam.permissions LIMIT 10001) x) x;
SELECT jsonb_build_object('category','bounded_cardinality_ops_audit.lifecycle_transition_definitions','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS observed_up_to_10001 FROM (SELECT 1 FROM ops_audit.lifecycle_transition_definitions LIMIT 10001) x) x;
\else
\quit 3
\endif
ROLLBACK;
