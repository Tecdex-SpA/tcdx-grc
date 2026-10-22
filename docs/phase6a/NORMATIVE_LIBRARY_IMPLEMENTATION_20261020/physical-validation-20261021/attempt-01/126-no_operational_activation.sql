BEGIN;
DO $$ DECLARE n bigint; BEGIN SELECT (SELECT count(*) FROM iam.permissions)+(SELECT count(*) FROM iam.roles)+(SELECT count(*) FROM platform.schema_migrations) INTO n; IF n<>0 THEN RAISE EXCEPTION 'unexpected permissions roles ledger'; END IF; END $$;
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
