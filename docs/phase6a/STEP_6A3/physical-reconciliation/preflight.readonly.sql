-- STEP 6A.3 candidate inspection only. No DML, DDL, identifiers or private values.
-- Run only against an explicitly authorized instance; never inferred QA access.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT current_database() AS database_name, current_setting('server_version') AS server_version,
       current_setting('transaction_read_only') AS read_only;
SELECT n.nspname, c.relname, con.conname, con.contype, con.convalidated,
       pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='config' AND c.relname IN
 ('configuration_definitions','effective_configurations','effective_configuration_layers')
ORDER BY c.relname,con.conname;
SELECT tablename,indexname,indexdef FROM pg_indexes
WHERE schemaname='config' AND tablename IN
 ('configuration_definitions','effective_configurations','effective_configuration_layers')
ORDER BY tablename,indexname;
SELECT value_type,lifecycle_state,(published_at IS NOT NULL) AS published,
 num_nonnulls(default_boolean_value,default_integer_value,default_decimal_value,
 default_text_value,default_timestamp_value,default_duration_seconds_value,default_json_value)
 AS populated_defaults,count(*) AS definitions
FROM config.configuration_definitions GROUP BY 1,2,3,4 ORDER BY 1,2,3,4;
SELECT 'effective_configurations' AS relation,count(*) AS rows FROM config.effective_configurations
UNION ALL SELECT 'effective_configuration_layers',count(*) FROM config.effective_configuration_layers;
SELECT count(*) AS duplicate_ec_groups FROM (
 SELECT 1 FROM config.effective_configurations
 GROUP BY tenant_id,configuration_definition_id,resolved_for_subject_id,effective_at,input_hash
 HAVING count(*)>1) duplicates;
SELECT count(*) AS duplicate_layer_groups FROM (
 SELECT 1 FROM config.effective_configuration_layers
 GROUP BY effective_configuration_id,precedence_level,ordinal HAVING count(*)>1) duplicates;
SELECT count(*) AS inconsistent_layers FROM config.effective_configuration_layers l
LEFT JOIN config.effective_configurations e ON e.effective_configuration_id=l.effective_configuration_id
LEFT JOIN config.configuration_overrides o ON o.configuration_override_id=l.configuration_override_id
WHERE e.effective_configuration_id IS NULL OR l.tenant_id IS DISTINCT FROM e.tenant_id
 OR l.configuration_definition_id IS DISTINCT FROM e.configuration_definition_id
 OR (l.configuration_override_id IS NOT NULL AND
 (o.configuration_override_id IS NULL OR o.configuration_definition_id IS DISTINCT FROM l.configuration_definition_id
 OR (o.tenant_id IS NOT NULL AND o.tenant_id IS DISTINCT FROM l.tenant_id)));
SELECT count(*) AS invalid_hashes FROM config.effective_configurations
WHERE input_hash !~ '^[0-9a-f]{64}$';
ROLLBACK;
