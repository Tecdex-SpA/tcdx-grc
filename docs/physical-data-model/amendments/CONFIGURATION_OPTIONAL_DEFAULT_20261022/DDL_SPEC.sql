-- LOCAL-DEFINITIONS-01. Forward-only corrective amendment; no business DML.
-- Transaction/advisory lock/ledger belong to the canonical migration runner.
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
LOCK TABLE config.configuration_definitions IN ACCESS EXCLUSIVE MODE;
DO $preflight$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='config.configuration_definitions'::regclass
  AND conname='ck_configuration_definitions__typed_default' AND contype='c' AND convalidated
  AND pg_get_constraintdef(oid)='CHECK (((num_nonnulls(default_boolean_value, default_integer_value, default_decimal_value, default_text_value, default_timestamp_value, default_duration_seconds_value, default_json_value) = 1) AND
CASE value_type
    WHEN ''boolean''::text THEN (default_boolean_value IS NOT NULL)
    WHEN ''integer''::text THEN (default_integer_value IS NOT NULL)
    WHEN ''decimal''::text THEN (default_decimal_value IS NOT NULL)
    WHEN ''text''::text THEN (default_text_value IS NOT NULL)
    WHEN ''timestamp''::text THEN (default_timestamp_value IS NOT NULL)
    WHEN ''duration''::text THEN (default_duration_seconds_value IS NOT NULL)
    WHEN ''json''::text THEN (default_json_value IS NOT NULL)
    ELSE false
END))')
 THEN RAISE EXCEPTION 'LOCAL_DEFINITIONS_01_PREDECESSOR_DRIFT'; END IF;
END
$preflight$;
ALTER TABLE config.configuration_definitions
 ADD CONSTRAINT ck_configuration_definitions__typed_default_optional
 CHECK (
  value_type IN ('boolean','integer','decimal','text','timestamp','duration','json')
  AND (
   num_nonnulls(default_boolean_value,default_integer_value,default_decimal_value,
    default_text_value,default_timestamp_value,default_duration_seconds_value,default_json_value)=0
   OR (
    num_nonnulls(default_boolean_value,default_integer_value,default_decimal_value,
     default_text_value,default_timestamp_value,default_duration_seconds_value,default_json_value)=1
    AND CASE value_type
     WHEN 'boolean' THEN default_boolean_value IS NOT NULL
     WHEN 'integer' THEN default_integer_value IS NOT NULL
     WHEN 'decimal' THEN default_decimal_value IS NOT NULL
     WHEN 'text' THEN default_text_value IS NOT NULL
     WHEN 'timestamp' THEN default_timestamp_value IS NOT NULL
     WHEN 'duration' THEN default_duration_seconds_value IS NOT NULL
     WHEN 'json' THEN default_json_value IS NOT NULL
     ELSE FALSE
    END
   )
  )
 ) NOT VALID;
ALTER TABLE config.configuration_definitions
 VALIDATE CONSTRAINT ck_configuration_definitions__typed_default_optional;
ALTER TABLE config.configuration_definitions
 DROP CONSTRAINT ck_configuration_definitions__typed_default;
ALTER TABLE config.configuration_definitions
 RENAME CONSTRAINT ck_configuration_definitions__typed_default_optional TO ck_configuration_definitions__typed_default;
