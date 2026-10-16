BEGIN READ ONLY;
SELECT json_build_object(
 'observed_at',CURRENT_TIMESTAMP,
 'database',current_database(),
 'host',host(inet_server_addr()),
 'port',inet_server_port(),
 'postgres_major',current_setting('server_version_num')::int/10000,
 'migrations',(SELECT count(*) FROM platform.schema_migrations),
 'tables',(SELECT json_agg(n.nspname||'.'||c.relname ORDER BY n.nspname,c.relname)
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r'
   AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%'),
 'functions',(SELECT json_agg(json_build_object('name',n.nspname||'.'||p.proname,'body',p.prosrc) ORDER BY p.proname)
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.proname LIKE 'c04w_guard%'),
 'triggers',(SELECT json_agg(json_build_object('name',tgname,'definition',pg_get_triggerdef(oid)) ORDER BY tgname)
   FROM pg_trigger WHERE tgname LIKE 'trg_c04w%'),
 'columns',(SELECT json_agg(json_build_object('table',table_schema||'.'||table_name,'name',column_name,
     'type',data_type,'nullable',is_nullable) ORDER BY table_schema,table_name,ordinal_position)
   FROM information_schema.columns WHERE (table_schema='privacy' AND table_name='retention_policy_applicabilities')
   OR (table_schema='evidence' AND table_name IN ('file_upload_intents','file_objects','evidence_versions')
       AND column_name='retention_policy_applicability_id')),
 'constraints',(SELECT json_agg(json_build_object('table',conrelid::regclass::text,'name',conname,
     'validated',convalidated,'definition',pg_get_constraintdef(oid)) ORDER BY conname)
   FROM pg_constraint WHERE conrelid='privacy.retention_policy_applicabilities'::regclass
   OR conname LIKE '%c04w%' OR conname LIKE '%applicability%'),
 'transaction','READ_ONLY_NO_FIXTURES_NO_IMPLEMENTATION_CODE'
);
COMMIT;
