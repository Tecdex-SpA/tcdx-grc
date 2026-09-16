-- Generated mechanically from docs/physical-data-model/01_PHYSICAL_DATA_MODEL.md.
-- PostgreSQL 16; the approved physical model remains authority.

CREATE TABLE "remediation"."issues" (
  "issue_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "issue_code" varchar(128) NOT NULL,
  "issue_kind" varchar(32) NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "severity" varchar(32) NOT NULL,
  "priority" varchar(32) NOT NULL,
  "business_owner_subject_id" uuid,
  "due_date" date,
  "dismissal_reason" text,
  "closed_at" timestamptz,
  CONSTRAINT "pk_issues" PRIMARY KEY ("issue_id")
);

CREATE TABLE "remediation"."issue_origins" (
  "issue_origin_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "issue_id" uuid NOT NULL,
  "requirement_assessment_id" uuid,
  "control_assessment_id" uuid,
  "assurance_test_id" uuid,
  "audit_test_id" uuid,
  "risk_id" uuid,
  "incident_id" uuid,
  "supplier_assessment_id" uuid,
  "origin_role" varchar(32) NOT NULL,
  CONSTRAINT "pk_issue_origins" PRIMARY KEY ("issue_origin_id")
);

CREATE TABLE "remediation"."actions" (
  "action_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "issue_id" uuid NOT NULL,
  "action_code" varchar(128) NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "priority" varchar(32) NOT NULL,
  "assigned_membership_id" uuid,
  "due_date" date,
  "completed_at" timestamptz,
  "verified_at" timestamptz,
  "cancel_reason" text,
  CONSTRAINT "pk_actions" PRIMARY KEY ("action_id")
);

CREATE TABLE "remediation"."action_verifications" (
  "action_verification_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "action_id" uuid NOT NULL,
  "verifier_membership_id" uuid NOT NULL,
  "verification_decision" varchar(32) NOT NULL,
  "rationale" text NOT NULL,
  "verified_at" timestamptz NOT NULL,
  "retest_reference" text,
  CONSTRAINT "pk_action_verifications" PRIMARY KEY ("action_verification_id")
);

CREATE TABLE "remediation"."action_evidence_links" (
  "action_evidence_link_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "action_id" uuid NOT NULL,
  "evidence_version_id" uuid NOT NULL,
  "link_role" varchar(32) NOT NULL,
  CONSTRAINT "pk_action_evidence_links" PRIMARY KEY ("action_evidence_link_id")
);

CREATE TABLE "risk"."risk_taxonomies" (
  "risk_taxonomy_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "taxonomy_code" varchar(128) NOT NULL,
  "name" text NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  CONSTRAINT "pk_risk_taxonomies" PRIMARY KEY ("risk_taxonomy_id")
);

CREATE TABLE "risk"."impact_scale_definitions" (
  "impact_scale_definition_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "scale_code" varchar(128) NOT NULL,
  "version_number" bigint NOT NULL,
  "name" text NOT NULL,
  "minimum_value" numeric(12,6) NOT NULL,
  "maximum_value" numeric(12,6) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  "published_at" timestamptz,
  CONSTRAINT "pk_impact_scale_definitions" PRIMARY KEY ("impact_scale_definition_id")
);

CREATE TABLE "risk"."impact_scale_levels" (
  "impact_scale_level_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "impact_scale_definition_id" uuid NOT NULL,
  "level_value" integer NOT NULL,
  "label" varchar(128) NOT NULL,
  "display_order" integer NOT NULL,
  CONSTRAINT "pk_impact_scale_levels" PRIMARY KEY ("impact_scale_level_id")
);

CREATE TABLE "risk"."impact_scale_dimension_criteria" (
  "impact_scale_dimension__criterion_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "impact_scale_level_id" uuid NOT NULL,
  "dimension_code" varchar(64) NOT NULL,
  "criterion_text" text NOT NULL,
  "minimum_value" numeric(30,10),
  "maximum_value" numeric(30,10),
  "unit" varchar(64),
  "currency_code" char(3),
  CONSTRAINT "pk_impact_scale_dimension_criteria" PRIMARY KEY ("impact_scale_dimension__criterion_id")
);

CREATE TABLE "risk"."likelihood_scale_definitions" (
  "likelihood_scale_definition_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "scale_code" varchar(128) NOT NULL,
  "version_number" bigint NOT NULL,
  "name" text NOT NULL,
  "minimum_value" numeric(12,6) NOT NULL,
  "maximum_value" numeric(12,6) NOT NULL,
  "horizon_months" integer NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  "published_at" timestamptz,
  CONSTRAINT "pk_likelihood_scale_definitions" PRIMARY KEY ("likelihood_scale_definition_id")
);

CREATE TABLE "risk"."likelihood_scale_levels" (
  "likelihood_scale_level_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "likelihood_scale_definition_id" uuid NOT NULL,
  "level_value" integer NOT NULL,
  "label" varchar(128) NOT NULL,
  "probability_min" numeric(7,6),
  "probability_max" numeric(7,6),
  "frequency_min" numeric(30,10),
  "frequency_max" numeric(30,10),
  "frequency_period_months" integer,
  "criterion_text" text NOT NULL,
  CONSTRAINT "pk_likelihood_scale_levels" PRIMARY KEY ("likelihood_scale_level_id")
);

CREATE TABLE "risk"."risk_methodologies" (
  "risk_methodology_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "methodology_code" varchar(128) NOT NULL,
  "version_number" bigint NOT NULL,
  "name" text NOT NULL,
  "impact_scale_definition_id" uuid NOT NULL,
  "likelihood_scale_definition_id" uuid NOT NULL,
  "formula_definition_id" uuid NOT NULL,
  "minimum_coverage" numeric(5,2) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  "published_at" timestamptz,
  CONSTRAINT "pk_risk_methodologies" PRIMARY KEY ("risk_methodology_id")
);

CREATE TABLE "risk"."risks" (
  "risk_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "risk_code" varchar(128) NOT NULL,
  "risk_taxonomy_id" uuid NOT NULL,
  "title" text NOT NULL,
  "scenario" text NOT NULL,
  "threat" text,
  "vulnerability" text,
  "lifecycle_state" varchar(32) NOT NULL,
  "business_owner_subject_id" uuid,
  "risk_category_code" varchar(96) NOT NULL,
  CONSTRAINT "pk_risks" PRIMARY KEY ("risk_id")
);

CREATE TABLE "risk"."risk_scopes" (
  "risk_scope_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "risk_id" uuid NOT NULL,
  "subject_id" uuid NOT NULL,
  "scope_role" varchar(32) NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  CONSTRAINT "pk_risk_scopes" PRIMARY KEY ("risk_scope_id")
);

CREATE TABLE "risk"."risk_assessments" (
  "risk_assessment_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "risk_id" uuid NOT NULL,
  "risk_methodology_id" uuid NOT NULL,
  "assessment_kind" varchar(16) NOT NULL,
  "likelihood_level" integer,
  "impact_level" integer,
  "inherent_score" numeric(8,4),
  "control_effectiveness" numeric(12,10),
  "control_coverage" numeric(5,2),
  "residual_score" numeric(8,4),
  "risk_level" varchar(32),
  "result_status" varchar(32) NOT NULL,
  "domain_conclusion" varchar(40),
  "effective_configuration_id" uuid,
  "calculation_run_id" uuid,
  "assessed_at" timestamptz NOT NULL,
  "period_start" timestamptz,
  "period_end" timestamptz,
  "superseded_by_id" uuid,
  CONSTRAINT "pk_risk_assessments" PRIMARY KEY ("risk_assessment_id")
);

CREATE TABLE "risk"."risk_control_mappings" (
  "risk_control_mapping_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "risk_id" uuid NOT NULL,
  "control_id" uuid NOT NULL,
  "mapping_version" bigint NOT NULL,
  "weight" numeric(12,6),
  "rationale" text NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  CONSTRAINT "pk_risk_control_mappings" PRIMARY KEY ("risk_control_mapping_id")
);

CREATE TABLE "risk"."risk_treatments" (
  "risk_treatment_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "risk_id" uuid NOT NULL,
  "disposition" varchar(16) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "rationale" text NOT NULL,
  "owner_membership_id" uuid NOT NULL,
  "target_date" date,
  "approved_at" timestamptz,
  "completed_at" timestamptz,
  "verified_at" timestamptz,
  CONSTRAINT "pk_risk_treatments" PRIMARY KEY ("risk_treatment_id")
);

CREATE TABLE "risk"."risk_acceptances" (
  "risk_acceptance_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "risk_id" uuid NOT NULL,
  "requested_by_membership_id" uuid NOT NULL,
  "approved_by_membership_id" uuid,
  "rationale" text NOT NULL,
  "decision" varchar(32) NOT NULL,
  "effective_from" timestamptz NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "review_date" date NOT NULL,
  "decided_at" timestamptz,
  CONSTRAINT "pk_risk_acceptances" PRIMARY KEY ("risk_acceptance_id")
);

CREATE TABLE "risk"."risk_appetite_policies" (
  "risk_appetite_policy_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "version_number" bigint NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz NOT NULL,
  "effective_to" timestamptz NOT NULL,
  "published_at" timestamptz,
  "superseded_by_id" uuid,
  "policy_key" varchar(128) NOT NULL,
  "risk_methodology_id" uuid NOT NULL,
  "risk_category_code" varchar(96) NOT NULL,
  "organizational_unit_id" uuid,
  "process_id" uuid,
  "service_id" uuid,
  "subject_id" uuid,
  "appetite_max" numeric(8,4) NOT NULL,
  CONSTRAINT "pk_risk_appetite_policies" PRIMARY KEY ("risk_appetite_policy_id")
);

CREATE TABLE "risk"."risk_tolerance_policies" (
  "risk_tolerance_policy_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "version_number" bigint NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz NOT NULL,
  "effective_to" timestamptz NOT NULL,
  "published_at" timestamptz,
  "superseded_by_id" uuid,
  "policy_key" varchar(128) NOT NULL,
  "risk_methodology_id" uuid NOT NULL,
  "risk_category_code" varchar(96) NOT NULL,
  "organizational_unit_id" uuid,
  "process_id" uuid,
  "service_id" uuid,
  "subject_id" uuid,
  "appetite_policy_id" uuid NOT NULL,
  "tolerance_max" numeric(8,4) NOT NULL,
  "max_duration_seconds" bigint,
  "escalation_rule_definition_id" uuid,
  CONSTRAINT "pk_risk_tolerance_policies" PRIMARY KEY ("risk_tolerance_policy_id")
);

CREATE TABLE "risk"."kris" (
  "kri_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "kri_code" varchar(128) NOT NULL,
  "name" text NOT NULL,
  "metric_definition_id" uuid NOT NULL,
  "target_value" numeric(30,10),
  "warning_threshold" numeric(30,10),
  "critical_threshold" numeric(30,10),
  "lifecycle_state" varchar(32) NOT NULL,
  CONSTRAINT "pk_kris" PRIMARY KEY ("kri_id")
);

CREATE TABLE "risk"."risk_kri_mappings" (
  "risk_kri_mapping_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "risk_id" uuid NOT NULL,
  "kri_id" uuid NOT NULL,
  "mapping_version" bigint NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  CONSTRAINT "pk_risk_kri_mappings" PRIMARY KEY ("risk_kri_mapping_id")
);

CREATE TABLE "risk"."loss_events" (
  "loss_event_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "loss_event_code" varchar(128) NOT NULL,
  "occurred_at" timestamptz NOT NULL,
  "discovered_at" timestamptz NOT NULL,
  "description" text NOT NULL,
  "gross_loss" numeric(20,4) NOT NULL,
  "currency_code" char(3) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "business_owner_subject_id" uuid,
  CONSTRAINT "pk_loss_events" PRIMARY KEY ("loss_event_id")
);

CREATE TABLE "risk"."loss_recoveries" (
  "loss_recovery_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "loss_event_id" uuid NOT NULL,
  "recovery_date" date NOT NULL,
  "amount" numeric(20,4) NOT NULL,
  "currency_code" char(3) NOT NULL,
  "source_ref" text NOT NULL,
  CONSTRAINT "pk_loss_recoveries" PRIMARY KEY ("loss_recovery_id")
);

CREATE TABLE "risk"."loss_event_risk_links" (
  "loss_event n:m risk_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "loss_event_id" uuid NOT NULL,
  "risk_id" uuid NOT NULL,
  "relationship_kind" varchar(32) NOT NULL,
  CONSTRAINT "pk_loss_event_risk_links" PRIMARY KEY ("loss_event n:m risk_id")
);

CREATE TABLE "risk"."loss_event_incident_links" (
  "loss_event n:m incident_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "loss_event_id" uuid NOT NULL,
  "incident_id" uuid NOT NULL,
  "relationship_kind" varchar(32) NOT NULL,
  CONSTRAINT "pk_loss_event_incident_links" PRIMARY KEY ("loss_event n:m incident_id")
);

CREATE TABLE "audit"."audit_universe_items" (
  "audit_universe_item_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "universe_code" varchar(128) NOT NULL,
  "subject_id" uuid NOT NULL,
  "name" text NOT NULL,
  "risk_rating" varchar(32),
  "lifecycle_state" varchar(32) NOT NULL,
  CONSTRAINT "pk_audit_universe_items" PRIMARY KEY ("audit_universe_item_id")
);

CREATE TABLE "audit"."audit_programs" (
  "audit_program_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "program_code" varchar(128) NOT NULL,
  "name" text NOT NULL,
  "period_start" date NOT NULL,
  "period_end" date NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "approved_at" timestamptz,
  CONSTRAINT "pk_audit_programs" PRIMARY KEY ("audit_program_id")
);

CREATE TABLE "audit"."audits" (
  "audit_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "audit_program_id" uuid,
  "audit_code" varchar(128) NOT NULL,
  "title" text NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "scope_text" text NOT NULL,
  "lead_membership_id" uuid NOT NULL,
  "planned_start" date,
  "planned_end" date,
  "issued_at" timestamptz,
  "closed_at" timestamptz,
  CONSTRAINT "pk_audits" PRIMARY KEY ("audit_id")
);

CREATE TABLE "audit"."audit_workpapers" (
  "audit_workpaper_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "audit_id" uuid NOT NULL,
  "workpaper_code" varchar(128) NOT NULL,
  "title" text NOT NULL,
  "content_ref" text NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "prepared_by_membership_id" uuid NOT NULL,
  "reviewed_by_membership_id" uuid,
  CONSTRAINT "pk_audit_workpapers" PRIMARY KEY ("audit_workpaper_id")
);

CREATE TABLE "audit"."audit_tests" (
  "audit_test_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "audit_workpaper_id" uuid NOT NULL,
  "test_code" varchar(128) NOT NULL,
  "title" text NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "result_status" varchar(32) NOT NULL,
  "domain_conclusion" varchar(40),
  "executor_membership_id" uuid NOT NULL,
  "reviewer_membership_id" uuid,
  "executed_at" timestamptz,
  "approved_at" timestamptz,
  CONSTRAINT "pk_audit_tests" PRIMARY KEY ("audit_test_id")
);

CREATE TABLE "audit"."audit_samples" (
  "audit_sample_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "audit_test_id" uuid NOT NULL,
  "sample_code" varchar(128) NOT NULL,
  "population_count" bigint,
  "sample_count" bigint NOT NULL,
  "selection_method" varchar(64) NOT NULL,
  "result_status" varchar(32) NOT NULL,
  CONSTRAINT "pk_audit_samples" PRIMARY KEY ("audit_sample_id")
);

CREATE TABLE "audit"."audit_test_evidence_links" (
  "audit_test_evidence_link_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "audit_test_id" uuid NOT NULL,
  "evidence_version_id" uuid NOT NULL,
  "link_role" varchar(32) NOT NULL,
  CONSTRAINT "pk_audit_test_evidence_links" PRIMARY KEY ("audit_test_evidence_link_id")
);

CREATE TABLE "operations"."incidents" (
  "incident_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "incident_code" varchar(128) NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "severity" varchar(32) NOT NULL,
  "reported_at" timestamptz NOT NULL,
  "occurred_at" timestamptz,
  "contained_at" timestamptz,
  "recovered_at" timestamptz,
  "closed_at" timestamptz,
  CONSTRAINT "pk_incidents" PRIMARY KEY ("incident_id")
);

CREATE TABLE "operations"."incident_subject_links" (
  "incident_subject_link_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "incident_id" uuid NOT NULL,
  "subject_id" uuid NOT NULL,
  "relationship_kind" varchar(32) NOT NULL,
  CONSTRAINT "pk_incident_subject_links" PRIMARY KEY ("incident_subject_link_id")
);

CREATE TABLE "operations"."root_cause_records" (
  "root_cause_record_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "incident_id" uuid NOT NULL,
  "analysis_version" bigint NOT NULL,
  "method" varchar(64) NOT NULL,
  "cause_statement" text NOT NULL,
  "approved_by_membership_id" uuid,
  "approved_at" timestamptz,
  "superseded_by_id" uuid,
  CONSTRAINT "pk_root_cause_records" PRIMARY KEY ("root_cause_record_id")
);

CREATE TABLE "third_party"."suppliers" (
  "supplier_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "supplier_code" varchar(128) NOT NULL,
  "legal_name" text NOT NULL,
  "display_name" text NOT NULL,
  "country_code" char(2),
  "subject_id" uuid NOT NULL,
  "criticality" varchar(32),
  "lifecycle_state" varchar(32) NOT NULL,
  CONSTRAINT "pk_suppliers" PRIMARY KEY ("supplier_id")
);

CREATE TABLE "third_party"."supplier_services" (
  "supplier_service_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "supplier_id" uuid NOT NULL,
  "service_id" uuid NOT NULL,
  "supplier_service_code" varchar(128) NOT NULL,
  "description" text NOT NULL,
  "criticality" varchar(32),
  "lifecycle_state" varchar(32) NOT NULL,
  CONSTRAINT "pk_supplier_services" PRIMARY KEY ("supplier_service_id")
);

CREATE TABLE "third_party"."supplier_contracts" (
  "supplier_contract_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "supplier_id" uuid NOT NULL,
  "contract_code" varchar(128) NOT NULL,
  "document_id" uuid,
  "starts_on" date NOT NULL,
  "ends_on" date,
  "lifecycle_state" varchar(32) NOT NULL,
  "currency_code" char(3),
  "contract_value" numeric(20,4),
  CONSTRAINT "pk_supplier_contracts" PRIMARY KEY ("supplier_contract_id")
);

CREATE TABLE "third_party"."supplier_assessments" (
  "supplier_assessment_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "supplier_id" uuid NOT NULL,
  "assessment_code" varchar(128) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "result_status" varchar(32) NOT NULL,
  "domain_conclusion" varchar(40),
  "assessed_at" timestamptz,
  "expires_at" timestamptz,
  "superseded_by_id" uuid,
  CONSTRAINT "pk_supplier_assessments" PRIMARY KEY ("supplier_assessment_id")
);

CREATE TABLE "resilience"."bias" (
  "bia_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "bia_code" varchar(128) NOT NULL,
  "process_id" uuid,
  "service_id" uuid,
  "lifecycle_state" varchar(32) NOT NULL,
  "business_owner_subject_id" uuid NOT NULL,
  CONSTRAINT "pk_bias" PRIMARY KEY ("bia_id")
);

CREATE TABLE "resilience"."bia_versions" (
  "bia_version_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "version_number" bigint NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  "published_at" timestamptz,
  "superseded_by_id" uuid,
  "bia_id" uuid NOT NULL,
  "rto_seconds" bigint,
  "rpo_seconds" bigint,
  "mtpd_seconds" bigint,
  "impact_summary" text NOT NULL,
  CONSTRAINT "pk_bia_versions" PRIMARY KEY ("bia_version_id")
);

CREATE TABLE "resilience"."continuity_plans" (
  "continuity_plan_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "plan_code" varchar(128) NOT NULL,
  "bia_id" uuid NOT NULL,
  "name" text NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "business_owner_subject_id" uuid NOT NULL,
  CONSTRAINT "pk_continuity_plans" PRIMARY KEY ("continuity_plan_id")
);

CREATE TABLE "resilience"."continuity_plan_versions" (
  "continuity_plan_version_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "version_number" bigint NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  "published_at" timestamptz,
  "superseded_by_id" uuid,
  "continuity_plan_id" uuid NOT NULL,
  "strategy" text NOT NULL,
  "activation_criteria" text NOT NULL,
  "document_version_id" uuid,
  CONSTRAINT "pk_continuity_plan_versions" PRIMARY KEY ("continuity_plan_version_id")
);

CREATE TABLE "resilience"."resilience_exercises" (
  "resilience_exercise_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "continuity_plan_id" uuid NOT NULL,
  "exercise_code" varchar(128) NOT NULL,
  "exercise_kind" varchar(64) NOT NULL,
  "planned_at" timestamptz NOT NULL,
  "executed_at" timestamptz,
  "lifecycle_state" varchar(32) NOT NULL,
  "result_status" varchar(32) NOT NULL,
  CONSTRAINT "pk_resilience_exercises" PRIMARY KEY ("resilience_exercise_id")
);

CREATE TABLE "resilience"."recovery_tests" (
  "recovery_test_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "resilience_exercise_id" uuid NOT NULL,
  "test_code" varchar(128) NOT NULL,
  "recovery_target_kind" varchar(64) NOT NULL,
  "target_seconds" bigint,
  "actual_seconds" bigint,
  "result_status" varchar(32) NOT NULL,
  "domain_conclusion" varchar(40),
  "executed_at" timestamptz,
  CONSTRAINT "pk_recovery_tests" PRIMARY KEY ("recovery_test_id")
);

CREATE TABLE "privacy"."privacy_processing_activities" (
  "privacy_processing_activity_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "activity_code" varchar(128) NOT NULL,
  "name" text NOT NULL,
  "purpose" text NOT NULL,
  "business_owner_subject_id" uuid NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  "retention_policy_id" uuid NOT NULL,
  CONSTRAINT "pk_privacy_processing_activities" PRIMARY KEY ("privacy_processing_activity_id")
);

CREATE TABLE "privacy"."data_categories" (
  "data_category_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "category_code" varchar(128) NOT NULL,
  "name" text NOT NULL,
  "sensitivity_classification" varchar(32) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  CONSTRAINT "pk_data_categories" PRIMARY KEY ("data_category_id")
);

CREATE TABLE "privacy"."data_subject_categories" (
  "data_subject_category_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "category_code" varchar(128) NOT NULL,
  "name" text NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  CONSTRAINT "pk_data_subject_categories" PRIMARY KEY ("data_subject_category_id")
);

CREATE TABLE "privacy"."legal_bases" (
  "legal_basis_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "legal_basis_code" varchar(128) NOT NULL,
  "name" text NOT NULL,
  "regulatory_source_id" uuid,
  "citation_ref" text,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  CONSTRAINT "pk_legal_bases" PRIMARY KEY ("legal_basis_id")
);

CREATE TABLE "privacy"."data_recipients" (
  "data_recipient_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "recipient_code" varchar(128) NOT NULL,
  "name" text NOT NULL,
  "supplier_id" uuid,
  "recipient_kind" varchar(64) NOT NULL,
  "country_code" char(2),
  "lifecycle_state" varchar(32) NOT NULL,
  CONSTRAINT "pk_data_recipients" PRIMARY KEY ("data_recipient_id")
);

CREATE TABLE "privacy"."international_transfers" (
  "international_transfer_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "processing_activity_id" uuid NOT NULL,
  "data_recipient_id" uuid NOT NULL,
  "destination_country_code" char(2) NOT NULL,
  "transfer_mechanism" varchar(96) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  CONSTRAINT "pk_international_transfers" PRIMARY KEY ("international_transfer_id")
);

CREATE TABLE "privacy"."retention_policies" (
  "retention_policy_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "policy_code" varchar(128) NOT NULL,
  "version_number" bigint NOT NULL,
  "policy_kind" varchar(32) NOT NULL,
  "retention_seconds" bigint,
  "trigger_event_code" varchar(96) NOT NULL,
  "precedence_rank" integer NOT NULL,
  "is_mandatory" boolean NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz NOT NULL,
  "effective_to" timestamptz NOT NULL,
  "regulatory_source_id" uuid,
  CONSTRAINT "pk_retention_policies" PRIMARY KEY ("retention_policy_id")
);

CREATE TABLE "privacy"."dpias" (
  "dpia_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "dpia_code" varchar(128) NOT NULL,
  "processing_activity_id" uuid NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "result_status" varchar(32) NOT NULL,
  "domain_conclusion" varchar(40),
  "approved_at" timestamptz,
  "superseded_by_id" uuid,
  CONSTRAINT "pk_dpias" PRIMARY KEY ("dpia_id")
);

CREATE TABLE "privacy"."data_subject_requests" (
  "data_subject_request_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "request_code" varchar(128) NOT NULL,
  "request_kind" varchar(32) NOT NULL,
  "received_at" timestamptz NOT NULL,
  "due_at" timestamptz,
  "lifecycle_state" varchar(32) NOT NULL,
  "requester_pseudonymous_ref" text NOT NULL,
  "legal_basis_id" uuid,
  CONSTRAINT "pk_data_subject_requests" PRIMARY KEY ("data_subject_request_id")
);

CREATE TABLE "privacy"."privacy_breaches" (
  "privacy_breach_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "breach_code" varchar(128) NOT NULL,
  "incident_id" uuid,
  "occurred_at" timestamptz,
  "discovered_at" timestamptz NOT NULL,
  "severity" varchar(32) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "notification_due_at" timestamptz,
  "notified_at" timestamptz,
  CONSTRAINT "pk_privacy_breaches" PRIMARY KEY ("privacy_breach_id")
);

CREATE TABLE "privacy"."erasure_execution_records" (
  "erasure_execution_record_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "data_subject_request_id" uuid NOT NULL,
  "retention_policy_id" uuid NOT NULL,
  "legal_basis_ref" text NOT NULL,
  "scope_summary" text NOT NULL,
  "execution_outcome" varchar(32) NOT NULL,
  "job_execution_id" uuid,
  "executed_by_membership_id" uuid,
  "started_at" timestamptz NOT NULL,
  "completed_at" timestamptz,
  "audit_event_id" uuid NOT NULL,
  CONSTRAINT "pk_erasure_execution_records" PRIMARY KEY ("erasure_execution_record_id")
);

CREATE TABLE "privacy"."erasure_execution_items" (
  "erasure_execution_item_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "erasure_execution_record_id" uuid NOT NULL,
  "object_class" varchar(128) NOT NULL,
  "object_reference_hash" char(64) NOT NULL,
  "action_applied" varchar(32) NOT NULL,
  "item_outcome" varchar(32) NOT NULL,
  "exclusion_reason_code" varchar(96),
  "retention_policy_id" uuid,
  "legal_hold_reference_hash" char(64),
  "executed_at" timestamptz,
  CONSTRAINT "pk_erasure_execution_items" PRIMARY KEY ("erasure_execution_item_id")
);

CREATE TABLE "privacy"."processing_activity_data_categories" (
  "processing_activity_data_category_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "processing_activity_id" uuid NOT NULL,
  "data_category_id" uuid NOT NULL,
  "role" varchar(32) NOT NULL,
  CONSTRAINT "pk_processing_activity_data_categories" PRIMARY KEY ("processing_activity_data_category_id")
);

CREATE TABLE "privacy"."processing_activity_subject_categories" (
  "processing_activity_subject_category_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "processing_activity_id" uuid NOT NULL,
  "data_subject_category_id" uuid NOT NULL,
  CONSTRAINT "pk_processing_activity_subject_categories" PRIMARY KEY ("processing_activity_subject_category_id")
);

CREATE TABLE "privacy"."processing_activity_legal_bases" (
  "processing_activity_legal_base_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "processing_activity_id" uuid NOT NULL,
  "legal_basis_id" uuid NOT NULL,
  CONSTRAINT "pk_processing_activity_legal_bases" PRIMARY KEY ("processing_activity_legal_base_id")
);

CREATE TABLE "privacy"."processing_activity_recipients" (
  "processing_activity_recipient_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "processing_activity_id" uuid NOT NULL,
  "data_recipient_id" uuid NOT NULL,
  CONSTRAINT "pk_processing_activity_recipients" PRIMARY KEY ("processing_activity_recipient_id")
);

CREATE TABLE "privacy"."processing_activity_suppliers" (
  "processing_activity_supplier_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "processing_activity_id" uuid NOT NULL,
  "supplier_id" uuid NOT NULL,
  CONSTRAINT "pk_processing_activity_suppliers" PRIMARY KEY ("processing_activity_supplier_id")
);

CREATE TABLE "privacy"."processing_activity_subjects" (
  "processing_activity_subject_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "processing_activity_id" uuid NOT NULL,
  "subject_id" uuid NOT NULL,
  "relationship_kind" varchar(32) NOT NULL,
  CONSTRAINT "pk_processing_activity_subjects" PRIMARY KEY ("processing_activity_subject_id")
);

CREATE TABLE "survey"."surveys" (
  "survey_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "survey_code" varchar(128) NOT NULL,
  "name" text NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  CONSTRAINT "pk_surveys" PRIMARY KEY ("survey_id")
);

CREATE TABLE "survey"."survey_versions" (
  "survey_version_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "survey_id" uuid NOT NULL,
  "version_number" bigint NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  "published_at" timestamptz,
  "superseded_by_id" uuid,
  "instructions" text,
  CONSTRAINT "pk_survey_versions" PRIMARY KEY ("survey_version_id")
);

CREATE TABLE "survey"."survey_questions" (
  "survey_question_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "survey_version_id" uuid NOT NULL,
  "question_code" varchar(128) NOT NULL,
  "prompt" text NOT NULL,
  "answer_type" varchar(32) NOT NULL,
  "is_required" boolean NOT NULL,
  "display_order" integer NOT NULL,
  CONSTRAINT "pk_survey_questions" PRIMARY KEY ("survey_question_id")
);

CREATE TABLE "survey"."survey_question_validation_rules" (
  "survey_question_validation_rule_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "survey_question_id" uuid NOT NULL,
  "rule_ordinal" integer NOT NULL,
  "operator" varchar(32) NOT NULL,
  "message" text NOT NULL,
  "operand_boolean_value" boolean,
  "operand_integer_value" bigint,
  "operand_decimal_value" numeric(30,10),
  "operand_text_value" text,
  "operand_timestamp_value" timestamptz,
  "operand_duration_seconds_value" bigint,
  "operand_json_value" jsonb,
  CONSTRAINT "pk_survey_question_validation_rules" PRIMARY KEY ("survey_question_validation_rule_id")
);

CREATE TABLE "survey"."survey_options" (
  "survey_option_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "survey_question_id" uuid NOT NULL,
  "option_code" varchar(128) NOT NULL,
  "label" text NOT NULL,
  "stored_value" text NOT NULL,
  "display_order" integer NOT NULL,
  CONSTRAINT "pk_survey_options" PRIMARY KEY ("survey_option_id")
);

CREATE TABLE "survey"."survey_campaigns" (
  "survey_campaign_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "survey_version_id" uuid NOT NULL,
  "campaign_code" varchar(128) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "scheduled_at" timestamptz,
  "opens_at" timestamptz,
  "closes_at" timestamptz,
  "scope_subject_id" uuid,
  CONSTRAINT "pk_survey_campaigns" PRIMARY KEY ("survey_campaign_id")
);

CREATE TABLE "survey"."survey_responses" (
  "survey_response_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "survey_campaign_id" uuid NOT NULL,
  "respondent_membership_id" uuid,
  "respondent_subject_id" uuid,
  "lifecycle_state" varchar(32) NOT NULL,
  "started_at" timestamptz NOT NULL,
  "submitted_at" timestamptz,
  "accepted_at" timestamptz,
  CONSTRAINT "pk_survey_responses" PRIMARY KEY ("survey_response_id")
);

CREATE TABLE "survey"."survey_answers" (
  "survey_answer_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "survey_response_id" uuid NOT NULL,
  "survey_question_id" uuid NOT NULL,
  "value_type" varchar(16) NOT NULL,
  "answered_at" timestamptz NOT NULL,
  "boolean_value" boolean,
  "integer_value" bigint,
  "decimal_value" numeric(30,10),
  "text_value" text,
  "timestamp_value" timestamptz,
  "duration_seconds_value" bigint,
  "json_value" jsonb,
  CONSTRAINT "pk_survey_answers" PRIMARY KEY ("survey_answer_id")
);
