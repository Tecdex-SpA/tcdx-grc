BEGIN;
DO $$ BEGIN IF (SELECT count(*) FROM pg_trigger WHERE tgname IN ('ck_knowledge_context__compatibility','ck_control_override__succession') AND tgdeferrable AND tginitdeferred)<>2 THEN RAISE EXCEPTION 'missing deferred guards'; END IF; END $$;
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
