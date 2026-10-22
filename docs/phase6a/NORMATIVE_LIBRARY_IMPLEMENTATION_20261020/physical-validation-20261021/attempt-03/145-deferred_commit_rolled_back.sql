BEGIN;
DO $$ BEGIN IF EXISTS(SELECT FROM knowledge.knowledge_version_context_links) THEN RAISE EXCEPTION 'failed commit leaked row'; END IF; END $$;
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
