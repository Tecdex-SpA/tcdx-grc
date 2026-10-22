BEGIN;
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
COMMIT;