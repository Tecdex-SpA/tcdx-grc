BEGIN;
DO $$ BEGIN IF EXISTS(SELECT FROM pg_constraint WHERE NOT convalidated AND conrelid IN ('knowledge.knowledge_version_context_links'::regclass,'knowledge.knowledge_source_usage_rights'::regclass,'config.configuration_overrides'::regclass,'config.effective_configurations'::regclass,'regulatory.requirement_applicabilities'::regclass)) THEN RAISE EXCEPTION 'unvalidated candidate constraint'; END IF; END $$;
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
