-- NOT_RUN_NOT_AUTHORIZED_DDL. Prepared only for an approved disposable PG16 DB.
-- Temporary tables and transaction rollback; never an existing product table.
BEGIN;
CREATE TEMP TABLE test_ec (tenant_id integer NOT NULL,definition_id integer NOT NULL,
 subject_id integer,effective_at integer NOT NULL,input_hash text NOT NULL,
 UNIQUE NULLS NOT DISTINCT(tenant_id,definition_id,subject_id,effective_at,input_hash)) ON COMMIT DROP;
CREATE TEMP TABLE test_layer (ec_id integer NOT NULL,precedence_level text NOT NULL,
 ordinal integer NOT NULL,UNIQUE(ec_id,precedence_level,ordinal)) ON COMMIT DROP;
CREATE TEMP TABLE test_default (value_type text NOT NULL,b boolean,i bigint,d numeric,
 t text,ts timestamptz,dur bigint,j jsonb,
 CHECK(num_nonnulls(b,i,d,t,ts,dur,j)=1 AND CASE value_type
 WHEN 'boolean' THEN b IS NOT NULL WHEN 'integer' THEN i IS NOT NULL
 WHEN 'decimal' THEN d IS NOT NULL WHEN 'text' THEN t IS NOT NULL
 WHEN 'timestamp' THEN ts IS NOT NULL WHEN 'duration' THEN dur IS NOT NULL
 WHEN 'json' THEN j IS NOT NULL ELSE FALSE END)) ON COMMIT DROP;
INSERT INTO test_ec VALUES (1,1,NULL,1,'a'),(1,2,NULL,1,'a'),(2,1,NULL,1,'a'),
 (1,1,2,1,'a'),(1,1,NULL,2,'a'),(1,1,NULL,1,'b');
INSERT INTO test_layer VALUES (1,'tenant',1),(2,'tenant',1),(1,'object',1);
INSERT INTO test_default VALUES
 ('boolean',FALSE,NULL,NULL,NULL,NULL,NULL,NULL),
 ('integer',NULL,0,NULL,NULL,NULL,NULL,NULL),
 ('decimal',NULL,NULL,0,NULL,NULL,NULL,NULL),
 ('text',NULL,NULL,NULL,'',NULL,NULL,NULL),
 ('timestamp',NULL,NULL,NULL,NULL,'2026-10-09T00:00:00Z',NULL,NULL),
 ('duration',NULL,NULL,NULL,NULL,NULL,0,NULL),
 ('json',NULL,NULL,NULL,NULL,NULL,NULL,'{}');
DO $tests$
BEGIN
 BEGIN
  INSERT INTO test_ec VALUES(1,1,NULL,1,'a');
  RAISE EXCEPTION 'DUPLICATE_NULL_KEY_ACCEPTED';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN
  INSERT INTO test_layer VALUES(1,'tenant',1);
  RAISE EXCEPTION 'DUPLICATE_LAYER_KEY_ACCEPTED';
 EXCEPTION WHEN unique_violation THEN NULL; END;
END
$tests$;
-- Typed-default predicate is tested independently against the identical draft
-- expression; it does not certify the unapplied product constraint.
DO $defaults$
DECLARE bad_type text;
BEGIN
 FOREACH bad_type IN ARRAY ARRAY['boolean','integer','decimal','text','timestamp','duration','json','unknown'] LOOP
  BEGIN
   INSERT INTO test_default(value_type) VALUES(bad_type);
   RAISE EXCEPTION 'ABSENT_DEFAULT_ACCEPTED';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
   INSERT INTO test_default(value_type,b,i) VALUES(bad_type,FALSE,0);
   RAISE EXCEPTION 'MULTIPLE_DEFAULTS_ACCEPTED';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
   IF bad_type='boolean' THEN
    INSERT INTO test_default(value_type,i) VALUES(bad_type,0);
   ELSE
    INSERT INTO test_default(value_type,b) VALUES(bad_type,FALSE);
   END IF;
   RAISE EXCEPTION 'MISMATCHED_DEFAULT_ACCEPTED';
  EXCEPTION WHEN check_violation THEN NULL; END;
 END LOOP;
END
$defaults$;
ROLLBACK;
