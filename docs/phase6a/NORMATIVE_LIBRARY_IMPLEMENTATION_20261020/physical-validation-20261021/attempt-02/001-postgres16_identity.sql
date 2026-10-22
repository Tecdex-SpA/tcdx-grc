BEGIN;
DO $$ BEGIN IF current_setting('server_version_num')::int/10000<>16 OR current_database()<>'synthetic_contract_validation' THEN RAISE EXCEPTION 'unsafe database'; END IF; END $$; SELECT version();
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
