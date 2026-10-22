BEGIN;
DO $$ DECLARE n text; BEGIN FOREACH n IN ARRAY ARRAY['knowledge.ix_knowledge_context__tenant_version','knowledge.ix_knowledge_context__unit','knowledge.ix_knowledge_context__requirement','knowledge.ix_knowledge_context__control','knowledge.ix_knowledge_context__subject','config.uq_config_override__control_revision','config.uq_config_override__approved_successor','config.ix_config_override__control_interval','config.uq_effective_config__control_inputs','regulatory.ix_applicability__context','knowledge.ix_knowledge_source_usage_rights__lookup'] LOOP IF to_regclass(n) IS NULL THEN RAISE EXCEPTION 'missing index %',n; END IF; END LOOP; END $$;
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
