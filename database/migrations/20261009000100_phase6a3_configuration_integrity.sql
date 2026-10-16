-- MACRO-STEP6A3-20261009-R1; local publication. Execution on existing/QA databases requires separate authorization.
-- Exact approved preconditions/constraints, outer transaction and ledger owned by canonical runner. No backfill.
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
LOCK TABLE config.configuration_definitions,config.effective_configurations,
 config.effective_configuration_layers IN ACCESS EXCLUSIVE MODE;
DO $preflight$
BEGIN
 -- Refuse unexpected source structures. This avoids dropping a constraint
 -- merely because a familiar name exists on a different definition.
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE
 conrelid='config.effective_configurations'::regclass
 AND conname='uq_effective_configurations__tenant_id' AND contype='u' AND convalidated
 AND pg_get_constraintdef(oid)='UNIQUE NULLS NOT DISTINCT (tenant_id)')
 OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE
 conrelid='config.effective_configuration_layers'::regclass
 AND conname='uq_effective_configuration_layers__ordinal' AND contype='u' AND convalidated
 AND pg_get_constraintdef(oid)='UNIQUE (ordinal)')
 OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE
 conrelid='config.configuration_definitions'::regclass
 AND conname='ck_configuration_definitions__default_value_count' AND contype='c' AND convalidated
 AND pg_get_constraintdef(oid)='CHECK ((num_nonnulls(default_boolean_value, default_integer_value, default_decimal_value, default_text_value, default_timestamp_value, default_duration_seconds_value, default_json_value) <= 1))')
 THEN RAISE EXCEPTION 'STEP6A3_UNEXPECTED_SOURCE_CONSTRAINTS'; END IF;
 IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid IN
 ('config.configuration_definitions'::regclass,'config.effective_configurations'::regclass,
 'config.effective_configuration_layers'::regclass) AND contype IN ('f','c') AND NOT convalidated)
 THEN RAISE EXCEPTION 'STEP6A3_UNVALIDATED_SOURCE_CONSTRAINTS'; END IF;
 IF EXISTS (SELECT 1 FROM config.effective_configurations GROUP BY
 tenant_id,configuration_definition_id,resolved_for_subject_id,effective_at,input_hash HAVING count(*)>1)
 THEN RAISE EXCEPTION 'STEP6A3_DUPLICATE_EC_KEY'; END IF;
 IF EXISTS (SELECT 1 FROM config.effective_configuration_layers GROUP BY
 effective_configuration_id,precedence_level,ordinal HAVING count(*)>1)
 THEN RAISE EXCEPTION 'STEP6A3_DUPLICATE_LAYER_KEY'; END IF;
 IF EXISTS (SELECT 1 FROM config.configuration_definitions WHERE
 num_nonnulls(default_boolean_value,default_integer_value,default_decimal_value,
 default_text_value,default_timestamp_value,default_duration_seconds_value,default_json_value)<>1)
 THEN RAISE EXCEPTION 'STEP6A3_DEFAULT_CARDINALITY'; END IF;
 IF EXISTS (SELECT 1 FROM config.configuration_definitions WHERE
 (CASE value_type
 WHEN 'boolean' THEN default_boolean_value IS NOT NULL
 WHEN 'integer' THEN default_integer_value IS NOT NULL
 WHEN 'decimal' THEN default_decimal_value IS NOT NULL
 WHEN 'text' THEN default_text_value IS NOT NULL
 WHEN 'timestamp' THEN default_timestamp_value IS NOT NULL
 WHEN 'duration' THEN default_duration_seconds_value IS NOT NULL
 WHEN 'json' THEN default_json_value IS NOT NULL ELSE FALSE END) IS DISTINCT FROM TRUE)
 THEN RAISE EXCEPTION 'STEP6A3_DEFAULT_TYPE'; END IF;
 IF EXISTS (SELECT 1 FROM config.effective_configurations e
 LEFT JOIN config.configuration_definitions d ON d.configuration_definition_id=e.configuration_definition_id
 WHERE d.configuration_definition_id IS NULL OR (d.tenant_id IS NOT NULL AND d.tenant_id IS DISTINCT FROM e.tenant_id))
 THEN RAISE EXCEPTION 'STEP6A3_ROOT_REFERENCE_INTEGRITY'; END IF;
 IF EXISTS (SELECT 1 FROM config.effective_configurations WHERE input_hash !~ '^[0-9a-f]{64}$')
 THEN RAISE EXCEPTION 'STEP6A3_HASH_FORMAT'; END IF;
 IF EXISTS (SELECT 1 FROM config.effective_configuration_layers l
 LEFT JOIN config.effective_configurations e ON e.effective_configuration_id=l.effective_configuration_id
 LEFT JOIN config.configuration_overrides o ON o.configuration_override_id=l.configuration_override_id
 WHERE e.effective_configuration_id IS NULL OR l.tenant_id IS DISTINCT FROM e.tenant_id
 OR l.configuration_definition_id IS DISTINCT FROM e.configuration_definition_id
 OR (l.configuration_override_id IS NOT NULL AND
 (o.configuration_override_id IS NULL OR o.configuration_definition_id IS DISTINCT FROM l.configuration_definition_id
 OR (o.tenant_id IS NOT NULL AND o.tenant_id IS DISTINCT FROM l.tenant_id))))
 THEN RAISE EXCEPTION 'STEP6A3_LAYER_REFERENCE_INTEGRITY'; END IF;
END
$preflight$;
-- Add canonical constraints before dropping the narrower inherited constraints.
-- PG16 NULLS NOT DISTINCT treats absent subject as one business-key component.
ALTER TABLE config.effective_configurations ADD CONSTRAINT uq_ec__canonical_business_key
 UNIQUE NULLS NOT DISTINCT
 (tenant_id,configuration_definition_id,resolved_for_subject_id,effective_at,input_hash);
ALTER TABLE config.effective_configuration_layers ADD CONSTRAINT uq_ec_layers__parent_level_ordinal
 UNIQUE (effective_configuration_id,precedence_level,ordinal);
-- This candidate value_type mapping needs explicit competent adoption. It does
-- not publish an enum or provide a default for an unknown type.
ALTER TABLE config.configuration_definitions ADD CONSTRAINT ck_configuration_definitions__typed_default
 CHECK (num_nonnulls(default_boolean_value,default_integer_value,default_decimal_value,
 default_text_value,default_timestamp_value,default_duration_seconds_value,default_json_value)=1
 AND CASE value_type
 WHEN 'boolean' THEN default_boolean_value IS NOT NULL
 WHEN 'integer' THEN default_integer_value IS NOT NULL
 WHEN 'decimal' THEN default_decimal_value IS NOT NULL
 WHEN 'text' THEN default_text_value IS NOT NULL
 WHEN 'timestamp' THEN default_timestamp_value IS NOT NULL
 WHEN 'duration' THEN default_duration_seconds_value IS NOT NULL
 WHEN 'json' THEN default_json_value IS NOT NULL
 ELSE FALSE END) NOT VALID;
ALTER TABLE config.configuration_definitions VALIDATE CONSTRAINT ck_configuration_definitions__typed_default;
ALTER TABLE config.effective_configurations DROP CONSTRAINT uq_effective_configurations__tenant_id;
ALTER TABLE config.effective_configuration_layers DROP CONSTRAINT uq_effective_configuration_layers__ordinal;
ALTER TABLE config.configuration_definitions DROP CONSTRAINT ck_configuration_definitions__default_value_count;
-- PK, tenant identity UQ, FK, ownership, temporal and duration checks survive.
