-- Generated mechanically from docs/physical-data-model/01_PHYSICAL_DATA_MODEL.md.
-- PostgreSQL 16; the approved physical model remains authority.

CREATE TABLE "data"."observation_types" (
  "observation_type_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "observation_code" varchar(160) NOT NULL,
  "version_number" bigint NOT NULL,
  "description" text NOT NULL,
  "value_type" varchar(16) NOT NULL,
  "unit" varchar(64),
  "default_freshness_seconds" bigint NOT NULL,
  "dedup_strategy" varchar(64) NOT NULL,
  "supersession_policy" varchar(64) NOT NULL,
  "sensitivity_classification" varchar(32) NOT NULL,
  "evidence_semantics" varchar(64) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "published_at" timestamptz,
  CONSTRAINT "pk_observation_types" PRIMARY KEY ("observation_type_id")
);

CREATE TABLE "data"."observation_type_subject_types" (
  "observation_type_subject_type_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "observation_type_id" uuid NOT NULL,
  "subject_type" varchar(64) NOT NULL,
  CONSTRAINT "pk_observation_type_subject_types" PRIMARY KEY ("observation_type_subject_type_id")
);

CREATE TABLE "data"."observation_type_source_types" (
  "observation_type_source_type_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "observation_type_id" uuid NOT NULL,
  "source_type" varchar(16) NOT NULL,
  CONSTRAINT "pk_observation_type_source_types" PRIMARY KEY ("observation_type_source_type_id")
);

CREATE TABLE "data"."observations" (
  "observation_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "observation_type_id" uuid NOT NULL,
  "subject_id" uuid NOT NULL,
  "source_type" varchar(16) NOT NULL,
  "source_integration_id" uuid,
  "source_user_identity_id" uuid,
  "source_calculation_run_id" uuid,
  "source_audit_test_id" uuid,
  "source_survey_response_id" uuid,
  "source_system_health_event_id" uuid,
  "raw_record_id" uuid,
  "external_event_id" varchar(255),
  "observed_at" timestamptz NOT NULL,
  "period_start" timestamptz,
  "period_end" timestamptz,
  "value_type" varchar(16) NOT NULL,
  "unit" varchar(64),
  "observation_status" varchar(16) NOT NULL,
  "confidence" numeric(7,6) NOT NULL,
  "quality_status" varchar(32) NOT NULL,
  "provenance_ref" text NOT NULL,
  "correlation_id" uuid NOT NULL,
  "payload_hash" char(64) NOT NULL,
  "superseded_by_id" uuid,
  "retracted_at" timestamptz,
  "boolean_value" boolean,
  "integer_value" bigint,
  "decimal_value" numeric(30,10),
  "text_value" text,
  "timestamp_value" timestamptz,
  "duration_seconds_value" bigint,
  "json_value" jsonb,
  CONSTRAINT "pk_observations" PRIMARY KEY ("observation_id")
);

CREATE TABLE "data"."formula_definitions" (
  "formula_definition_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "formula_code" varchar(128) NOT NULL,
  "version_number" bigint NOT NULL,
  "name" text NOT NULL,
  "expression_language" varchar(64) NOT NULL,
  "expression" text NOT NULL,
  "output_unit" varchar(64),
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  "published_at" timestamptz,
  CONSTRAINT "pk_formula_definitions" PRIMARY KEY ("formula_definition_id")
);

CREATE TABLE "data"."formula_definition_parameters" (
  "formula_definition_parameter_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "formula_definition_id" uuid NOT NULL,
  "parameter_code" varchar(128) NOT NULL,
  "value_type" varchar(16) NOT NULL,
  "unit" varchar(64),
  "is_required" boolean NOT NULL,
  "ordinal" integer NOT NULL,
  CONSTRAINT "pk_formula_definition_parameters" PRIMARY KEY ("formula_definition_parameter_id")
);

CREATE TABLE "data"."metric_definitions" (
  "metric_definition_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "metric_code" varchar(128) NOT NULL,
  "version_number" bigint NOT NULL,
  "name" text NOT NULL,
  "purpose" text NOT NULL,
  "domain_owner" varchar(64) NOT NULL,
  "subject_type" varchar(64) NOT NULL,
  "metric_kind" varchar(32) NOT NULL,
  "formula_definition_id" uuid NOT NULL,
  "unit" varchar(64) NOT NULL,
  "scale_min" numeric(30,10),
  "scale_max" numeric(30,10),
  "expected_direction" varchar(16) NOT NULL,
  "window_seconds" bigint,
  "aggregation_method" varchar(32) NOT NULL,
  "minimum_coverage" numeric(5,2) NOT NULL,
  "maximum_freshness_seconds" bigint NOT NULL,
  "quality_threshold" numeric(5,2) NOT NULL,
  "no_data_policy" varchar(32) NOT NULL,
  "publication_policy" varchar(32) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  "published_at" timestamptz,
  CONSTRAINT "pk_metric_definitions" PRIMARY KEY ("metric_definition_id")
);

CREATE TABLE "data"."metric_definition_inputs" (
  "metric_definition_input_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "metric_definition_id" uuid NOT NULL,
  "input_code" varchar(128) NOT NULL,
  "observation_type_id" uuid,
  "metric_definition_dependency_id" uuid,
  "input_role" varchar(32) NOT NULL,
  "is_required" boolean NOT NULL,
  "is_blocking" boolean NOT NULL,
  "ordinal" integer NOT NULL,
  CONSTRAINT "pk_metric_definition_inputs" PRIMARY KEY ("metric_definition_input_id")
);

CREATE TABLE "data"."metric_definition_thresholds" (
  "metric_definition_threshold_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "metric_definition_id" uuid NOT NULL,
  "threshold_code" varchar(96) NOT NULL,
  "operator" varchar(16) NOT NULL,
  "threshold_value" numeric(30,10) NOT NULL,
  "unit" varchar(64) NOT NULL,
  "severity" varchar(32),
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  CONSTRAINT "pk_metric_definition_thresholds" PRIMARY KEY ("metric_definition_threshold_id")
);

CREATE TABLE "data"."calculation_runs" (
  "calculation_run_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "calculation_code" varchar(128) NOT NULL,
  "calculation_status" varchar(16) NOT NULL,
  "metric_definition_id" uuid,
  "formula_definition_id" uuid,
  "effective_configuration_id" uuid,
  "period_start" timestamptz,
  "period_end" timestamptz,
  "started_at" timestamptz,
  "completed_at" timestamptz,
  "input_hash" char(64) NOT NULL,
  "error_code" varchar(128),
  "error_class" varchar(64),
  "backfill_job_execution_id" uuid,
  CONSTRAINT "pk_calculation_runs" PRIMARY KEY ("calculation_run_id")
);

CREATE TABLE "data"."metric_measurements" (
  "metric_measurement_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "metric_definition_id" uuid NOT NULL,
  "subject_id" uuid NOT NULL,
  "calculation_run_id" uuid NOT NULL,
  "effective_configuration_id" uuid,
  "source_resolution_id" uuid,
  "period_start" timestamptz NOT NULL,
  "period_end" timestamptz NOT NULL,
  "measured_at" timestamptz NOT NULL,
  "result_status" varchar(32) NOT NULL,
  "numeric_value" numeric(30,10),
  "preview_value" numeric(30,10),
  "unit" varchar(64) NOT NULL,
  "coverage_percent" numeric(5,2),
  "freshness_seconds" bigint,
  "domain_conclusion" varchar(40),
  "superseded_by_id" uuid,
  CONSTRAINT "pk_metric_measurements" PRIMARY KEY ("metric_measurement_id")
);

CREATE TABLE "data"."calculation_inputs" (
  "calculation_input_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "calculation_run_id" uuid NOT NULL,
  "input_role" varchar(64) NOT NULL,
  "observation_id" uuid,
  "source_resolution_id" uuid,
  "metric_measurement_id" uuid,
  "effective_configuration_id" uuid,
  "snapshot_id" uuid,
  "is_blocking" boolean NOT NULL,
  "input_hash" char(64) NOT NULL,
  "ordinal" integer NOT NULL,
  CONSTRAINT "pk_calculation_inputs" PRIMARY KEY ("calculation_input_id")
);

CREATE TABLE "data"."data_quality_assessments" (
  "data_quality_assessment_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "definition_code" varchar(128) NOT NULL,
  "definition_version" bigint NOT NULL,
  "observation_id" uuid,
  "metric_measurement_id" uuid,
  "calculation_input_id" uuid,
  "source_resolution_id" uuid,
  "snapshot_id" uuid,
  "dataset_subject_id" uuid,
  "result_status" varchar(32) NOT NULL,
  "completeness_value" numeric(5,2),
  "freshness_value" numeric(5,2),
  "validity_value" numeric(5,2),
  "lineage_value" numeric(5,2),
  "trust_value" numeric(5,2),
  "trust_band" varchar(32),
  "evaluated_at" timestamptz NOT NULL,
  "input_hash" char(64) NOT NULL,
  "completeness_weight" numeric(12,6) NOT NULL,
  "freshness_weight" numeric(12,6) NOT NULL,
  "validity_weight" numeric(12,6) NOT NULL,
  "lineage_weight" numeric(12,6) NOT NULL,
  CONSTRAINT "pk_data_quality_assessments" PRIMARY KEY ("data_quality_assessment_id")
);

CREATE TABLE "data"."data_lineage" (
  "data_lineage_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "raw_record_id" uuid,
  "observation_id" uuid,
  "source_resolution_id" uuid,
  "calculation_input_id" uuid,
  "metric_measurement_id" uuid,
  "rule_evaluation_id" uuid,
  "grc_impact_id" uuid,
  "snapshot_item_id" uuid,
  "ai_recommendation_id" uuid,
  "_to_id" uuid,
  "lineage_role" varchar(64) NOT NULL,
  "transformation_version" varchar(128),
  "occurred_at" timestamptz NOT NULL,
  "raw_record_to_id" uuid,
  "observation_to_id" uuid,
  "source_resolution_to_id" uuid,
  "calculation_input_to_id" uuid,
  "metric_measurement_to_id" uuid,
  "rule_evaluation_to_id" uuid,
  "grc_impact_to_id" uuid,
  "snapshot_item_to_id" uuid,
  "ai_recommendation_to_id" uuid,
  CONSTRAINT "pk_data_lineage" PRIMARY KEY ("data_lineage_id")
);

CREATE TABLE "data"."source_precedence_policies" (
  "source_precedence_policy_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "policy_code" varchar(128) NOT NULL,
  "version_number" bigint NOT NULL,
  "observation_type_id" uuid NOT NULL,
  "subject_type" varchar(64) NOT NULL,
  "scope_subject_id" uuid,
  "strategy" varchar(32) NOT NULL,
  "equivalence_tolerance" numeric(30,10),
  "temporal_overlap_rule" varchar(64) NOT NULL,
  "tie_behavior" varchar(64) NOT NULL,
  "quorum_required" integer,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz NOT NULL,
  "effective_to" timestamptz NOT NULL,
  "published_at" timestamptz,
  CONSTRAINT "pk_source_precedence_policies" PRIMARY KEY ("source_precedence_policy_id")
);

CREATE TABLE "data"."source_precedence_policy_sources" (
  "source_precedence_policy_source_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "source_precedence_policy_id" uuid NOT NULL,
  "source_type" varchar(32) NOT NULL,
  "connector_definition_id" uuid,
  "integration_id" uuid,
  "precedence_ordinal" integer,
  "is_required" boolean NOT NULL,
  CONSTRAINT "pk_source_precedence_policy_sources" PRIMARY KEY ("source_precedence_policy_source_id")
);

CREATE TABLE "data"."source_precedence_policy_key_fields" (
  "source_precedence_policy_key_field_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "source_precedence_policy_id" uuid NOT NULL,
  "field_code" varchar(128) NOT NULL,
  "ordinal" integer NOT NULL,
  "normalization_code" varchar(96),
  CONSTRAINT "pk_source_precedence_policy_key_fields" PRIMARY KEY ("source_precedence_policy_key_field_id")
);

CREATE TABLE "data"."source_resolutions" (
  "source_resolution_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "source_precedence_policy_id" uuid NOT NULL,
  "subject_id" uuid NOT NULL,
  "strategy" varchar(32) NOT NULL,
  "rationale_code" varchar(96) NOT NULL,
  "conflict_outcome" varchar(32) NOT NULL,
  "resolved_at" timestamptz NOT NULL,
  "period_start" timestamptz,
  "period_end" timestamptz,
  "resolved_by_membership_id" uuid,
  "input_hash" char(64) NOT NULL,
  CONSTRAINT "pk_source_resolutions" PRIMARY KEY ("source_resolution_id")
);

CREATE TABLE "data"."source_resolution_observations" (
  "source_resolution_observation_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "source_resolution_id" uuid NOT NULL,
  "observation_id" uuid NOT NULL,
  "selection_role" varchar(16) NOT NULL,
  "ordinal" integer NOT NULL,
  "reason_code" varchar(96),
  CONSTRAINT "pk_source_resolution_observations" PRIMARY KEY ("source_resolution_observation_id")
);

CREATE TABLE "data"."snapshots" (
  "snapshot_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "snapshot_code" varchar(128) NOT NULL,
  "snapshot_kind" varchar(64) NOT NULL,
  "effective_at" timestamptz NOT NULL,
  "published_at" timestamptz NOT NULL,
  "calculation_run_id" uuid,
  "effective_configuration_id" uuid,
  "input_hash" char(64) NOT NULL,
  "supersedes_snapshot_id" uuid,
  "lifecycle_state" varchar(32) NOT NULL DEFAULT 'published',
  CONSTRAINT "pk_snapshots" PRIMARY KEY ("snapshot_id")
);

CREATE TABLE "data"."snapshot_items" (
  "snapshot_item_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "snapshot_id" uuid NOT NULL,
  "metric_measurement_id" uuid,
  "risk_assessment_id" uuid,
  "requirement_assessment_id" uuid,
  "control_assessment_id" uuid,
  "assurance_test_id" uuid,
  "rule_evaluation_id" uuid,
  "data_quality_assessment_id" uuid,
  "supplier_assessment_id" uuid,
  "audit_test_id" uuid,
  "dpia_id" uuid,
  "recovery_test_id" uuid,
  "issue_id" uuid,
  "action_id" uuid,
  "result_status" varchar(32) NOT NULL,
  "domain_conclusion" varchar(40),
  "item_version_ref" varchar(128) NOT NULL,
  "display_order" integer NOT NULL,
  CONSTRAINT "pk_snapshot_items" PRIMARY KEY ("snapshot_item_id")
);

CREATE TABLE "config"."configuration_definitions" (
  "configuration_definition_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "configuration_code" varchar(128) NOT NULL,
  "version_number" bigint NOT NULL,
  "value_type" varchar(16) NOT NULL,
  "tenant_overridable" boolean NOT NULL,
  "object_overridable" boolean NOT NULL,
  "owner_domain" varchar(64) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz NOT NULL,
  "effective_to" timestamptz NOT NULL,
  "published_at" timestamptz,
  "default_boolean_value" boolean,
  "default_integer_value" bigint,
  "default_decimal_value" numeric(30,10),
  "default_text_value" text,
  "default_timestamp_value" timestamptz,
  "default_duration_seconds_value" bigint,
  "default_json_value" jsonb,
  CONSTRAINT "pk_configuration_definitions" PRIMARY KEY ("configuration_definition_id")
);

CREATE TABLE "config"."configuration_definition_scopes" (
  "configuration_definition_scope_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "configuration_definition_id" uuid NOT NULL,
  "scope_level" varchar(32) NOT NULL,
  CONSTRAINT "pk_configuration_definition_scopes" PRIMARY KEY ("configuration_definition_scope_id")
);

CREATE TABLE "config"."configuration_validation_rules" (
  "configuration_validation_rule_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "configuration_definition_id" uuid NOT NULL,
  "rule_ordinal" integer NOT NULL,
  "operator" varchar(32) NOT NULL,
  "error_code" varchar(128) NOT NULL,
  "operand_boolean_value" boolean,
  "operand_integer_value" bigint,
  "operand_decimal_value" numeric(30,10),
  "operand_text_value" text,
  "operand_timestamp_value" timestamptz,
  "operand_duration_seconds_value" bigint,
  "operand_json_value" jsonb,
  CONSTRAINT "pk_configuration_validation_rules" PRIMARY KEY ("configuration_validation_rule_id")
);

CREATE TABLE "config"."configuration_overrides" (
  "configuration_override_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "configuration_definition_id" uuid NOT NULL,
  "override_version" bigint NOT NULL,
  "scope_level" varchar(32) NOT NULL,
  "methodology_id" uuid,
  "regulatory_pack_version_id" uuid,
  "scope_subject_id" uuid,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz NOT NULL,
  "effective_to" timestamptz NOT NULL,
  "approved_by_user_identity_id" uuid,
  "boolean_value" boolean,
  "integer_value" bigint,
  "decimal_value" numeric(30,10),
  "text_value" text,
  "timestamp_value" timestamptz,
  "duration_seconds_value" bigint,
  "json_value" jsonb,
  CONSTRAINT "pk_configuration_overrides" PRIMARY KEY ("configuration_override_id")
);

CREATE TABLE "config"."effective_configurations" (
  "effective_configuration_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "configuration_definition_id" uuid NOT NULL,
  "resolved_for_subject_id" uuid,
  "resolved_at" timestamptz NOT NULL,
  "effective_at" timestamptz NOT NULL,
  "resolution_status" varchar(32) NOT NULL,
  "input_hash" char(64) NOT NULL,
  "effective_boolean_value" boolean,
  "effective_integer_value" bigint,
  "effective_decimal_value" numeric(30,10),
  "effective_text_value" text,
  "effective_timestamp_value" timestamptz,
  "effective_duration_seconds_value" bigint,
  "effective_json_value" jsonb,
  CONSTRAINT "pk_effective_configurations" PRIMARY KEY ("effective_configuration_id")
);

CREATE TABLE "config"."effective_configuration_layers" (
  "effective_configuration_layer_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "effective_configuration_id" uuid NOT NULL,
  "configuration_definition_id" uuid NOT NULL,
  "configuration_override_id" uuid,
  "precedence_level" varchar(32) NOT NULL,
  "ordinal" integer NOT NULL,
  "was_selected" boolean NOT NULL,
  CONSTRAINT "pk_effective_configuration_layers" PRIMARY KEY ("effective_configuration_layer_id")
);

CREATE TABLE "rules"."rule_definitions" (
  "rule_definition_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "rule_code" varchar(128) NOT NULL,
  "version_number" bigint NOT NULL,
  "owner_domain" varchar(64) NOT NULL,
  "subject_type" varchar(64) NOT NULL,
  "expression_operator" varchar(64) NOT NULL,
  "expression" text NOT NULL,
  "minimum_coverage" numeric(5,2),
  "maximum_freshness_seconds" bigint,
  "minimum_data_trust" numeric(5,2),
  "unknown_behavior" varchar(32) NOT NULL,
  "automation_policy_id" uuid,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz NOT NULL,
  "effective_to" timestamptz NOT NULL,
  "published_at" timestamptz,
  CONSTRAINT "pk_rule_definitions" PRIMARY KEY ("rule_definition_id")
);

CREATE TABLE "rules"."rule_definition_inputs" (
  "rule_definition_input_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "rule_definition_id" uuid NOT NULL,
  "input_code" varchar(128) NOT NULL,
  "observation_type_id" uuid,
  "metric_definition_id" uuid,
  "input_role" varchar(32) NOT NULL,
  "is_required" boolean NOT NULL,
  "is_blocking" boolean NOT NULL,
  "ordinal" integer NOT NULL,
  CONSTRAINT "pk_rule_definition_inputs" PRIMARY KEY ("rule_definition_input_id")
);

CREATE TABLE "rules"."rule_definition_thresholds" (
  "rule_definition_threshold_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "rule_definition_id" uuid NOT NULL,
  "threshold_code" varchar(96) NOT NULL,
  "operator" varchar(16) NOT NULL,
  "threshold_value" numeric(30,10) NOT NULL,
  "unit" varchar(64),
  "rule_outcome" varchar(24) NOT NULL,
  "severity" varchar(32),
  "priority" varchar(32),
  "ordinal" integer NOT NULL,
  CONSTRAINT "pk_rule_definition_thresholds" PRIMARY KEY ("rule_definition_threshold_id")
);

CREATE TABLE "rules"."rule_evaluations" (
  "rule_evaluation_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "rule_definition_id" uuid NOT NULL,
  "subject_id" uuid NOT NULL,
  "calculation_run_id" uuid,
  "effective_configuration_id" uuid,
  "result_status" varchar(32) NOT NULL,
  "rule_outcome" varchar(24),
  "severity" varchar(32),
  "evaluated_at" timestamptz NOT NULL,
  "period_start" timestamptz,
  "period_end" timestamptz,
  "input_hash" char(64) NOT NULL,
  "superseded_by_id" uuid,
  "generation" integer NOT NULL DEFAULT 0,
  CONSTRAINT "pk_rule_evaluations" PRIMARY KEY ("rule_evaluation_id")
);

CREATE TABLE "rules"."rule_evaluation_inputs" (
  "rule_evaluation_input_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "rule_evaluation_id" uuid NOT NULL,
  "metric_measurement_id" uuid,
  "observation_id" uuid,
  "source_resolution_id" uuid,
  "input_role" varchar(64) NOT NULL,
  "is_blocking" boolean NOT NULL,
  "ordinal" integer NOT NULL,
  CONSTRAINT "pk_rule_evaluation_inputs" PRIMARY KEY ("rule_evaluation_input_id")
);

CREATE TABLE "rules"."grc_impacts" (
  "grc_impact_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "rule_evaluation_id" uuid NOT NULL,
  "grc_impact_mapping_id" uuid NOT NULL,
  "impact_kind" varchar(32) NOT NULL,
  "severity" varchar(32),
  "priority" varchar(32),
  "lifecycle_state" varchar(32) NOT NULL,
  "resulting_issue_id" uuid,
  "resulting_action_id" uuid,
  "domain_command_code" varchar(160),
  "automation_policy_id" uuid,
  "generation" integer NOT NULL DEFAULT 0,
  CONSTRAINT "pk_grc_impacts" PRIMARY KEY ("grc_impact_id")
);

CREATE TABLE "rules"."grc_impact_mappings" (
  "grc_impact_mapping_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "rule_definition_id" uuid NOT NULL,
  "requirement_id" uuid,
  "control_id" uuid,
  "risk_id" uuid,
  "issue_policy_code" varchar(160),
  "mapping_version" bigint NOT NULL,
  "impact_kind" varchar(32) NOT NULL,
  "source_precedence_policy_id" uuid,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz NOT NULL,
  "effective_to" timestamptz NOT NULL,
  "provenance_ref" text NOT NULL,
  CONSTRAINT "pk_grc_impact_mappings" PRIMARY KEY ("grc_impact_mapping_id")
);

CREATE TABLE "rules"."automation_policies" (
  "automation_policy_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "policy_code" varchar(128) NOT NULL,
  "version_number" bigint NOT NULL,
  "automation_level" varchar(2) NOT NULL,
  "rule_definition_id" uuid,
  "target_command_code" varchar(160) NOT NULL,
  "maximum_scope" varchar(32) NOT NULL,
  "service_principal_id" uuid,
  "required_confidence" numeric(7,6),
  "required_data_trust" numeric(5,2),
  "precondition_policy_ref" varchar(160) NOT NULL,
  "approval_mode" varchar(32) NOT NULL,
  "idempotency_semantics" varchar(64) NOT NULL,
  "compensation_command_code" varchar(160),
  "rate_limit_count" integer NOT NULL,
  "rate_limit_window_seconds" bigint NOT NULL,
  "notification_policy_ref" varchar(160) NOT NULL,
  "audit_event_code" varchar(160) NOT NULL,
  "expires_at" timestamptz,
  "review_at" timestamptz,
  "lifecycle_state" varchar(32) NOT NULL,
  "published_at" timestamptz,
  CONSTRAINT "pk_automation_policies" PRIMARY KEY ("automation_policy_id")
);

CREATE TABLE "integration"."connector_definitions" (
  "connector_definition_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "connector_code" varchar(128) NOT NULL,
  "provider" varchar(128) NOT NULL,
  "name" text NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  CONSTRAINT "pk_connector_definitions" PRIMARY KEY ("connector_definition_id")
);

CREATE TABLE "integration"."connector_versions" (
  "connector_version_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "version_number" bigint NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  "published_at" timestamptz,
  "superseded_by_id" uuid,
  "connector_definition_id" uuid NOT NULL,
  "provider_api_version" varchar(128) NOT NULL,
  "auth_method" varchar(64) NOT NULL,
  "polling_webhook_strategy" varchar(64) NOT NULL,
  "rate_limit_count" integer,
  "rate_limit_window_seconds" bigint,
  "raw_retention_seconds" bigint NOT NULL,
  "schema_version" varchar(128) NOT NULL,
  "timezone" varchar(64) NOT NULL,
  "max_retry_attempts" integer NOT NULL,
  "initial_backoff_seconds" bigint NOT NULL,
  "tombstone_semantics" varchar(64) NOT NULL,
  CONSTRAINT "pk_connector_versions" PRIMARY KEY ("connector_version_id")
);

CREATE TABLE "integration"."connector_version_auth_scopes" (
  "connector_version_auth_scope_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "connector_version_id" uuid NOT NULL,
  "scope_code" varchar(255) NOT NULL,
  "is_required" boolean NOT NULL,
  CONSTRAINT "pk_connector_version_auth_scopes" PRIMARY KEY ("connector_version_auth_scope_id")
);

CREATE TABLE "integration"."connector_version_objects" (
  "connector_version_object_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "connector_version_id" uuid NOT NULL,
  "provider_object" varchar(128) NOT NULL,
  "extraction_mode" varchar(32) NOT NULL,
  CONSTRAINT "pk_connector_version_objects" PRIMARY KEY ("connector_version_object_id")
);

CREATE TABLE "integration"."integrations" (
  "integration_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "connector_version_id" uuid NOT NULL,
  "integration_code" varchar(128) NOT NULL,
  "display_name" text NOT NULL,
  "configuration_lifecycle_state" varchar(32) NOT NULL,
  "operational_health" varchar(32) NOT NULL,
  "external_namespace" varchar(255) NOT NULL,
  "last_health_at" timestamptz,
  CONSTRAINT "pk_integrations" PRIMARY KEY ("integration_id")
);

CREATE TABLE "integration"."integration_credential_refs" (
  "integration_credential_ref_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "integration_id" uuid NOT NULL,
  "credential_ref" text NOT NULL,
  "credential_kind" varchar(64) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "rotated_at" timestamptz,
  "expires_at" timestamptz,
  "last_validated_at" timestamptz,
  CONSTRAINT "pk_integration_credential_refs" PRIMARY KEY ("integration_credential_ref_id")
);

CREATE TABLE "integration"."sync_schedules" (
  "sync_schedule_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "integration_id" uuid NOT NULL,
  "schedule_expression" varchar(255) NOT NULL,
  "schedule_timezone" varchar(64) NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  "next_run_at" timestamptz,
  CONSTRAINT "pk_sync_schedules" PRIMARY KEY ("sync_schedule_id")
);

CREATE TABLE "integration"."sync_runs" (
  "sync_run_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "integration_id" uuid NOT NULL,
  "run_key" varchar(255) NOT NULL,
  "calculation_status" varchar(16) NOT NULL,
  "started_at" timestamptz,
  "completed_at" timestamptz,
  "checkpoint_id" uuid,
  "records_discovered" bigint NOT NULL DEFAULT 0,
  "records_succeeded" bigint NOT NULL DEFAULT 0,
  "records_failed" bigint NOT NULL DEFAULT 0,
  "error_code" varchar(128),
  CONSTRAINT "pk_sync_runs" PRIMARY KEY ("sync_run_id")
);

CREATE TABLE "integration"."checkpoints" (
  "checkpoint_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "integration_id" uuid NOT NULL,
  "checkpoint_key" varchar(255) NOT NULL,
  "cursor_value" text NOT NULL,
  "source_timestamp" timestamptz,
  "schema_version" varchar(128) NOT NULL,
  "committed_at" timestamptz NOT NULL,
  "supersedes_checkpoint_id" uuid,
  CONSTRAINT "pk_checkpoints" PRIMARY KEY ("checkpoint_id")
);

CREATE TABLE "integration"."raw_records" (
  "raw_record_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "sync_run_id" uuid NOT NULL,
  "integration_id" uuid NOT NULL,
  "external_object_type" varchar(128) NOT NULL,
  "external_object_id" varchar(512) NOT NULL,
  "external_event_id" varchar(512),
  "source_timestamp" timestamptz,
  "ingested_at" timestamptz NOT NULL,
  "schema_version" varchar(128) NOT NULL,
  "dedup_key" varchar(512) NOT NULL,
  "payload" jsonb NOT NULL,
  "payload_hash" char(64) NOT NULL,
  "tombstone" boolean NOT NULL DEFAULT false,
  "retention_until" timestamptz NOT NULL,
  CONSTRAINT "pk_raw_records" PRIMARY KEY ("raw_record_id")
);

CREATE TABLE "integration"."dead_letter_records" (
  "dead_letter_record_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "sync_run_id" uuid NOT NULL,
  "raw_record_id" uuid,
  "stage" varchar(32) NOT NULL,
  "error_code" varchar(128) NOT NULL,
  "error_class" varchar(64) NOT NULL,
  "error_detail_redacted" text NOT NULL,
  "retryable" boolean NOT NULL,
  "attempt_count" integer NOT NULL DEFAULT 0,
  "next_retry_at" timestamptz,
  "terminal_at" timestamptz,
  CONSTRAINT "pk_dead_letter_records" PRIMARY KEY ("dead_letter_record_id")
);

CREATE TABLE "integration"."external_identity_bindings" (
  "external_identity_binding_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "integration_id" uuid NOT NULL,
  "external_namespace" varchar(255) NOT NULL,
  "external_object_type" varchar(128) NOT NULL,
  "external_object_id" varchar(512) NOT NULL,
  "binding_generation" bigint NOT NULL,
  "subject_id" uuid NOT NULL,
  "valid_from" timestamptz NOT NULL,
  "valid_to" timestamptz,
  "binding_state" varchar(32) NOT NULL,
  "retired_at" timestamptz,
  CONSTRAINT "pk_external_identity_bindings" PRIMARY KEY ("external_identity_binding_id")
);

CREATE TABLE "integration"."external_schema_mappings" (
  "external_schema_mapping_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "connector_version_id" uuid NOT NULL,
  "mapping_code" varchar(128) NOT NULL,
  "mapping_version" bigint NOT NULL,
  "provider_object" varchar(128) NOT NULL,
  "endpoint_event" text NOT NULL,
  "source_field_path" text NOT NULL,
  "source_type" varchar(64) NOT NULL,
  "external_id_path" text NOT NULL,
  "source_timestamp_path" text NOT NULL,
  "deletion_semantics" varchar(64) NOT NULL,
  "normalization_code" varchar(128) NOT NULL,
  "normalization_expression" text NOT NULL,
  "canonical_subject_type" varchar(64) NOT NULL,
  "observation_type_id" uuid NOT NULL,
  "canonical_value_type" varchar(16) NOT NULL,
  "canonical_unit" varchar(64),
  "freshness_seconds" bigint NOT NULL,
  "dedup_key_contract" text NOT NULL,
  "metric_definition_id" uuid,
  "rule_definition_id" uuid,
  "grc_target_kind" varchar(64),
  "consumer_code" varchar(64) NOT NULL,
  "automation_policy_id" uuid,
  "permission_id" uuid NOT NULL,
  "evidence_semantics" varchar(64) NOT NULL,
  "error_behavior" varchar(64) NOT NULL,
  "source_precedence_policy_id" uuid NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz NOT NULL,
  "effective_to" timestamptz NOT NULL,
  CONSTRAINT "pk_external_schema_mappings" PRIMARY KEY ("external_schema_mapping_id")
);

CREATE TABLE "reporting"."dashboard_definitions" (
  "dashboard_definition_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "dashboard_code" varchar(128) NOT NULL,
  "version_number" bigint NOT NULL,
  "name" text NOT NULL,
  "capability_id" uuid NOT NULL,
  "presentation_metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "lifecycle_state" varchar(32) NOT NULL,
  "published_at" timestamptz,
  CONSTRAINT "pk_dashboard_definitions" PRIMARY KEY ("dashboard_definition_id")
);

CREATE TABLE "reporting"."dashboard_widgets" (
  "dashboard_widget_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "dashboard_definition_id" uuid NOT NULL,
  "widget_code" varchar(128) NOT NULL,
  "metric_definition_id" uuid,
  "report_definition_id" uuid,
  "snapshot_kind" varchar(64),
  "visualization_kind" varchar(64) NOT NULL,
  "display_order" integer NOT NULL,
  "presentation_metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT "pk_dashboard_widgets" PRIMARY KEY ("dashboard_widget_id")
);

CREATE TABLE "reporting"."report_templates" (
  "report_template_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "template_code" varchar(128) NOT NULL,
  "version_number" bigint NOT NULL,
  "name" text NOT NULL,
  "output_format" varchar(16) NOT NULL,
  "template_file_object_id" uuid,
  "layout_payload" jsonb,
  "lifecycle_state" varchar(32) NOT NULL,
  "published_at" timestamptz,
  CONSTRAINT "pk_report_templates" PRIMARY KEY ("report_template_id")
);

CREATE TABLE "reporting"."report_definitions" (
  "report_definition_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "report_code" varchar(128) NOT NULL,
  "version_number" bigint NOT NULL,
  "name" text NOT NULL,
  "report_template_id" uuid NOT NULL,
  "capability_id" uuid NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "published_at" timestamptz,
  CONSTRAINT "pk_report_definitions" PRIMARY KEY ("report_definition_id")
);

CREATE TABLE "reporting"."report_definition_parameters" (
  "report_definition_parameter_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "report_definition_id" uuid NOT NULL,
  "parameter_code" varchar(128) NOT NULL,
  "value_type" varchar(16) NOT NULL,
  "is_required" boolean NOT NULL,
  "ordinal" integer NOT NULL,
  "default_boolean_value" boolean,
  "default_integer_value" bigint,
  "default_decimal_value" numeric(30,10),
  "default_text_value" text,
  "default_timestamp_value" timestamptz,
  "default_duration_seconds_value" bigint,
  "default_json_value" jsonb,
  CONSTRAINT "pk_report_definition_parameters" PRIMARY KEY ("report_definition_parameter_id")
);

CREATE TABLE "reporting"."report_runs" (
  "report_run_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "report_definition_id" uuid NOT NULL,
  "run_key" varchar(255) NOT NULL,
  "calculation_status" varchar(16) NOT NULL,
  "requested_by_membership_id" uuid NOT NULL,
  "started_at" timestamptz,
  "completed_at" timestamptz,
  "result_status" varchar(32) NOT NULL,
  "error_code" varchar(128),
  CONSTRAINT "pk_report_runs" PRIMARY KEY ("report_run_id")
);

CREATE TABLE "reporting"."report_artifacts" (
  "report_artifact_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "report_run_id" uuid NOT NULL,
  "file_object_id" uuid NOT NULL,
  "artifact_version" bigint NOT NULL,
  "output_format" varchar(16) NOT NULL,
  "content_hash" char(64) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "approved_at" timestamptz,
  "published_at" timestamptz,
  "superseded_by_id" uuid,
  CONSTRAINT "pk_report_artifacts" PRIMARY KEY ("report_artifact_id")
);

CREATE TABLE "reporting"."report_run_snapshots" (
  "report_run_snapshot_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "report_run_id" uuid NOT NULL,
  "snapshot_id" uuid NOT NULL,
  "ordinal" integer NOT NULL,
  CONSTRAINT "pk_report_run_snapshots" PRIMARY KEY ("report_run_snapshot_id")
);

CREATE TABLE "knowledge"."knowledge_sources" (
  "knowledge_source_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "source_code" varchar(128) NOT NULL,
  "name" text NOT NULL,
  "source_kind" varchar(64) NOT NULL,
  "official_uri" text,
  "license_classification" varchar(64) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  CONSTRAINT "pk_knowledge_sources" PRIMARY KEY ("knowledge_source_id")
);

CREATE TABLE "knowledge"."knowledge_items" (
  "knowledge_item_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "knowledge_code" varchar(128) NOT NULL,
  "knowledge_source_id" uuid NOT NULL,
  "title" text NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  CONSTRAINT "pk_knowledge_items" PRIMARY KEY ("knowledge_item_id")
);

CREATE TABLE "knowledge"."knowledge_versions" (
  "knowledge_version_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "knowledge_item_id" uuid NOT NULL,
  "version_number" bigint NOT NULL,
  "content_ref" text NOT NULL,
  "content_hash" char(64) NOT NULL,
  "content_language" varchar(35) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  "published_at" timestamptz,
  "superseded_by_id" uuid,
  CONSTRAINT "pk_knowledge_versions" PRIMARY KEY ("knowledge_version_id")
);

CREATE TABLE "knowledge"."regulatory_changes" (
  "regulatory_change_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "regulatory_source_id" uuid NOT NULL,
  "change_code" varchar(128) NOT NULL,
  "source_framework_version_id" uuid,
  "target_framework_version_id" uuid,
  "summary" text NOT NULL,
  "detected_at" timestamptz NOT NULL,
  "effective_at" timestamptz,
  "lifecycle_state" varchar(32) NOT NULL,
  "provenance_ref" text NOT NULL,
  CONSTRAINT "pk_regulatory_changes" PRIMARY KEY ("regulatory_change_id")
);

CREATE TABLE "knowledge"."regulatory_change_reviews" (
  "regulatory_change_review_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "regulatory_change_id" uuid NOT NULL,
  "reviewer_user_identity_id" uuid NOT NULL,
  "decision" varchar(32) NOT NULL,
  "rationale" text NOT NULL,
  "reviewed_at" timestamptz NOT NULL,
  CONSTRAINT "pk_regulatory_change_reviews" PRIMARY KEY ("regulatory_change_review_id")
);

CREATE TABLE "ai"."ai_jobs" (
  "ai_job_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "job_key" varchar(255) NOT NULL,
  "requested_by_membership_id" uuid NOT NULL,
  "service_principal_id" uuid,
  "purpose_code" varchar(96) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "classification" varchar(32) NOT NULL,
  "context_hash" char(64) NOT NULL,
  "requested_at" timestamptz NOT NULL,
  "completed_at" timestamptz,
  "error_code" varchar(128),
  "model_provider_ref" varchar(255) NOT NULL DEFAULT 'ia2.tcdx.int',
  CONSTRAINT "pk_ai_jobs" PRIMARY KEY ("ai_job_id")
);

CREATE TABLE "ai"."ai_recommendations" (
  "ai_recommendation_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "ai_job_id" uuid NOT NULL,
  "recommendation_code" varchar(128) NOT NULL,
  "recommendation_text" text NOT NULL,
  "confidence" numeric(7,6),
  "lifecycle_state" varchar(32) NOT NULL,
  "reviewed_by_membership_id" uuid,
  "review_decision" varchar(32),
  "reviewed_at" timestamptz,
  "accepted_domain_command_ref" text,
  CONSTRAINT "pk_ai_recommendations" PRIMARY KEY ("ai_recommendation_id")
);

CREATE TABLE "ai"."ai_provenance_links" (
  "ai_provenance_link_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "ai_recommendation_id" uuid NOT NULL,
  "evidence_version_id" uuid,
  "metric_measurement_id" uuid,
  "snapshot_id" uuid,
  "knowledge_version_id" uuid,
  "requirement_id" uuid,
  "control_id" uuid,
  "risk_id" uuid,
  "issue_id" uuid,
  "source_role" varchar(32) NOT NULL,
  "excerpt_hash" char(64),
  CONSTRAINT "pk_ai_provenance_links" PRIMARY KEY ("ai_provenance_link_id")
);

CREATE TABLE "notification"."notifications" (
  "notification_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "notification_code" varchar(128) NOT NULL,
  "recipient_membership_id" uuid NOT NULL,
  "notification_kind" varchar(64) NOT NULL,
  "subject" text NOT NULL,
  "body_ref" text NOT NULL,
  "classification" varchar(32) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "created_event_id" uuid NOT NULL,
  "read_at" timestamptz,
  CONSTRAINT "pk_notifications" PRIMARY KEY ("notification_id")
);

CREATE TABLE "notification"."notification_preferences" (
  "notification_preference_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "tenant_membership_id" uuid NOT NULL,
  "notification_kind" varchar(64) NOT NULL,
  "channel" varchar(32) NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "timezone" varchar(64) NOT NULL,
  "quiet_hours_start" time,
  "quiet_hours_end" time,
  CONSTRAINT "pk_notification_preferences" PRIMARY KEY ("notification_preference_id")
);

CREATE TABLE "notification"."notification_deliveries" (
  "notification_delivery_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "notification_id" uuid NOT NULL,
  "channel" varchar(32) NOT NULL,
  "attempt_number" integer NOT NULL,
  "delivery_status" varchar(32) NOT NULL,
  "attempted_at" timestamptz NOT NULL,
  "provider_message_ref" text,
  "error_code" varchar(128),
  "next_retry_at" timestamptz,
  CONSTRAINT "pk_notification_deliveries" PRIMARY KEY ("notification_delivery_id")
);

CREATE TABLE "ops_audit"."audit_events" (
  "audit_event_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "correlation_id" uuid NOT NULL,
  "causation_id" uuid,
  "event_code" varchar(160) NOT NULL,
  "event_version" integer NOT NULL,
  "aggregate_type" varchar(128) NOT NULL,
  "aggregate_id" uuid NOT NULL,
  "command_code" varchar(160) NOT NULL,
  "actor_user_identity_id" uuid,
  "actor_service_principal_id" uuid,
  "occurred_at" timestamptz NOT NULL,
  "outcome" varchar(32) NOT NULL,
  "before_payload" jsonb,
  "after_payload" jsonb,
  "ip_address" inet,
  "device_ref" text,
  "classification" varchar(32) NOT NULL,
  CONSTRAINT "pk_audit_events" PRIMARY KEY ("audit_event_id")
);

CREATE TABLE "ops_audit"."idempotency_records" (
  "idempotency_record_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "actor_user_identity_id" uuid,
  "actor_service_principal_id" uuid,
  "operation_code" varchar(160) NOT NULL,
  "idempotency_key" varchar(255) NOT NULL,
  "request_hash" char(64) NOT NULL,
  "result_status_code" varchar(64) NOT NULL,
  "result_ref" text,
  "response_hash" char(64),
  "first_seen_at" timestamptz NOT NULL,
  "expires_at" timestamptz,
  CONSTRAINT "pk_idempotency_records" PRIMARY KEY ("idempotency_record_id")
);

CREATE TABLE "ops_audit"."outbox_events" (
  "outbox_event_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "correlation_id" uuid NOT NULL,
  "causation_id" uuid,
  "event_id" uuid NOT NULL,
  "event_type" varchar(160) NOT NULL,
  "event_version" integer NOT NULL,
  "aggregate_type" varchar(128) NOT NULL,
  "aggregate_id" uuid NOT NULL,
  "occurred_at" timestamptz NOT NULL,
  "actor_user_identity_id" uuid,
  "actor_service_principal_id" uuid,
  "payload" jsonb NOT NULL,
  "classification" varchar(32) NOT NULL,
  "delivery_status" varchar(32) NOT NULL DEFAULT 'pending',
  "attempt_count" integer NOT NULL DEFAULT 0,
  "available_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "delivered_at" timestamptz,
  "last_error_code" varchar(128),
  CONSTRAINT "pk_outbox_events" PRIMARY KEY ("outbox_event_id")
);

CREATE TABLE "ops_audit"."job_executions" (
  "job_execution_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "job_type" varchar(128) NOT NULL,
  "job_key" varchar(255) NOT NULL,
  "calculation_status" varchar(16) NOT NULL,
  "service_principal_id" uuid NOT NULL,
  "started_at" timestamptz,
  "completed_at" timestamptz,
  "checkpoint_ref" text,
  "attempt_count" integer NOT NULL DEFAULT 0,
  "error_code" varchar(128),
  "correlation_id" uuid NOT NULL,
  CONSTRAINT "pk_job_executions" PRIMARY KEY ("job_execution_id")
);

CREATE TABLE "ops_audit"."system_health_events" (
  "system_health_event_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "component_code" varchar(128) NOT NULL,
  "health_state" varchar(32) NOT NULL,
  "observed_at" timestamptz NOT NULL,
  "duration_seconds" bigint,
  "correlation_id" uuid,
  "details_redacted" jsonb,
  "classification" varchar(32) NOT NULL,
  CONSTRAINT "pk_system_health_events" PRIMARY KEY ("system_health_event_id")
);

CREATE TABLE "ops_audit"."lifecycle_transition_definitions" (
  "lifecycle_transition_definition_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "entity_type" varchar(128) NOT NULL,
  "version_number" bigint NOT NULL,
  "from_state" varchar(32) NOT NULL,
  "command_code" varchar(160) NOT NULL,
  "to_state" varchar(32) NOT NULL,
  "precondition_policy_ref" varchar(160) NOT NULL,
  "permission_id" uuid NOT NULL,
  "sod_policy_ref" varchar(160) NOT NULL,
  "audit_event_code" varchar(160) NOT NULL,
  "notification_policy_ref" varchar(160) NOT NULL,
  "recalculation_policy_ref" varchar(160) NOT NULL,
  "idempotency_semantics" varchar(64) NOT NULL,
  "concurrency_semantics" varchar(64) NOT NULL,
  "system_actor_allowed" boolean NOT NULL DEFAULT false,
  "lifecycle_state" varchar(32) NOT NULL,
  "published_at" timestamptz,
  CONSTRAINT "pk_lifecycle_transition_definitions" PRIMARY KEY ("lifecycle_transition_definition_id")
);

CREATE TABLE "ops_audit"."lifecycle_transition_scopes" (
  "lifecycle_transition_scope_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "lifecycle_transition_definition_id" uuid NOT NULL,
  "scope_kind" varchar(32) NOT NULL,
  CONSTRAINT "pk_lifecycle_transition_scopes" PRIMARY KEY ("lifecycle_transition_scope_id")
);

CREATE TABLE "ops_audit"."lifecycle_transition_side_effects" (
  "lifecycle_transition_side_effect_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "lifecycle_transition_definition_id" uuid NOT NULL,
  "event_code" varchar(160) NOT NULL,
  "ordinal" integer NOT NULL,
  "is_required" boolean NOT NULL,
  CONSTRAINT "pk_lifecycle_transition_side_effects" PRIMARY KEY ("lifecycle_transition_side_effect_id")
);
