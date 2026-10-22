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
SELECT jsonb_build_object('category','knowledge_versions_duplicate_item_version','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS duplicate_groups FROM (SELECT knowledge_item_id,version_number FROM knowledge.knowledge_versions GROUP BY knowledge_item_id,version_number HAVING count(*)>1) x) x;
SELECT jsonb_build_object('category','knowledge_versions_orphan_item','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS orphan_rows FROM knowledge.knowledge_versions v LEFT JOIN knowledge.knowledge_items i ON i.knowledge_item_id=v.knowledge_item_id WHERE i.knowledge_item_id IS NULL) x;
SELECT jsonb_build_object('category','knowledge_items_orphan_source','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS orphan_rows FROM knowledge.knowledge_items i LEFT JOIN knowledge.knowledge_sources s ON s.knowledge_source_id=i.knowledge_source_id WHERE s.knowledge_source_id IS NULL) x;
SELECT jsonb_build_object('category','knowledge_versions_owner_mismatch','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS mismatched_rows FROM knowledge.knowledge_versions v JOIN knowledge.knowledge_items i ON i.knowledge_item_id=v.knowledge_item_id WHERE v.ownership_class IS DISTINCT FROM i.ownership_class OR v.tenant_id IS DISTINCT FROM i.tenant_id) x;
SELECT jsonb_build_object('category','knowledge_items_owner_mismatch','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS mismatched_rows FROM knowledge.knowledge_items i JOIN knowledge.knowledge_sources s ON s.knowledge_source_id=i.knowledge_source_id WHERE i.ownership_class IS DISTINCT FROM s.ownership_class OR i.tenant_id IS DISTINCT FROM s.tenant_id) x;
SELECT jsonb_build_object('category','knowledge_versions_tenant_nullability','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS invalid_rows FROM knowledge.knowledge_versions WHERE (ownership_class='TENANT_OWNED')<>(tenant_id IS NOT NULL)) x;
SELECT jsonb_build_object('category','applicability_subject_cross_tenant','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS mismatched_rows FROM regulatory.requirement_applicabilities a JOIN org.subjects s ON s.subject_id=a.scope_subject_id WHERE a.tenant_id IS DISTINCT FROM s.tenant_id) x;
SELECT jsonb_build_object('category','applicability_requirement_cross_tenant','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS mismatched_rows FROM regulatory.requirement_applicabilities a JOIN regulatory.requirements r ON r.requirement_id=a.requirement_id WHERE r.tenant_id IS NOT NULL AND r.tenant_id IS DISTINCT FROM a.tenant_id) x;
SELECT jsonb_build_object('category','effective_existing_key_duplicates','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS duplicate_groups FROM (SELECT tenant_id,configuration_definition_id,resolved_for_subject_id,effective_at,input_hash FROM config.effective_configurations GROUP BY tenant_id,configuration_definition_id,resolved_for_subject_id,effective_at,input_hash HAVING count(*)>1) x) x;
SELECT jsonb_build_object('category','existing_control_scope_rows','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS rows FROM config.configuration_overrides WHERE scope_level='control_version') x;
SELECT jsonb_build_object('category','effective_definition_orphans','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS orphan_rows FROM config.effective_configurations e LEFT JOIN config.configuration_definitions d ON d.configuration_definition_id=e.configuration_definition_id WHERE d.configuration_definition_id IS NULL) x;
SELECT jsonb_build_object('category','effective_definition_cross_tenant','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS mismatched_rows FROM config.effective_configurations e JOIN config.configuration_definitions d ON d.configuration_definition_id=e.configuration_definition_id WHERE d.tenant_id IS NOT NULL AND d.tenant_id IS DISTINCT FROM e.tenant_id) x;
SELECT jsonb_build_object('category','new_eight_permissions_presence','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS matching_permissions FROM iam.permissions WHERE permission_code=ANY(ARRAY['knowledge.knowledge_item.read','knowledge.knowledge_item.create','knowledge.knowledge_item.update','knowledge.knowledge_item.review','knowledge.knowledge_item.publish','knowledge.knowledge_source.read','knowledge.knowledge_source.create','reporting.matrix.read'])) x;
SELECT jsonb_build_object('category','schema_totals','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS tables_excluding_system FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%') x;
SELECT jsonb_build_object('category','migration_metadata','rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) FROM (SELECT count(*) AS ledger_rows,max(migration_id) AS latest_migration FROM platform.schema_migrations WHERE outcome='applied') x;
\else
\quit 3
\endif
ROLLBACK;
