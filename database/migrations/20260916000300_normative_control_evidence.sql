-- Generated mechanically from docs/physical-data-model/01_PHYSICAL_DATA_MODEL.md.
-- PostgreSQL 16; the approved physical model remains authority.

CREATE TABLE "regulatory"."regulatory_packs" (
  "regulatory_pack_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "pack_code" varchar(96) NOT NULL,
  "name" text NOT NULL,
  "source_type" varchar(32) NOT NULL,
  "jurisdiction_code" varchar(32),
  "lifecycle_state" varchar(32) NOT NULL,
  CONSTRAINT "pk_regulatory_packs" PRIMARY KEY ("regulatory_pack_id")
);

CREATE TABLE "regulatory"."regulatory_pack_versions" (
  "regulatory_pack_version_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "version_number" bigint NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  "published_at" timestamptz,
  "superseded_by_id" uuid,
  "regulatory_pack_id" uuid NOT NULL,
  "edition" varchar(128) NOT NULL,
  "license_classification" varchar(64) NOT NULL,
  "content_hash" char(64) NOT NULL,
  "reviewed_by_user_identity_id" uuid,
  CONSTRAINT "pk_regulatory_pack_versions" PRIMARY KEY ("regulatory_pack_version_id")
);

CREATE TABLE "regulatory"."regulatory_sources" (
  "regulatory_source_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "source_code" varchar(128) NOT NULL,
  "source_type" varchar(32) NOT NULL,
  "publisher" text NOT NULL,
  "official_uri" text,
  "license_classification" varchar(64) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  CONSTRAINT "pk_regulatory_sources" PRIMARY KEY ("regulatory_source_id")
);

CREATE TABLE "regulatory"."regulatory_import_manifests" (
  "regulatory_import_manifest_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "regulatory_pack_version_id" uuid NOT NULL,
  "regulatory_source_id" uuid NOT NULL,
  "import_checksum" char(64) NOT NULL,
  "source_edition" varchar(128) NOT NULL,
  "imported_by_user_identity_id" uuid NOT NULL,
  "imported_at" timestamptz NOT NULL,
  "row_count" bigint NOT NULL,
  "outcome" varchar(32) NOT NULL,
  CONSTRAINT "pk_regulatory_import_manifests" PRIMARY KEY ("regulatory_import_manifest_id")
);

CREATE TABLE "regulatory"."regulatory_coverage_manifests" (
  "regulatory_coverage_manifest_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "regulatory_pack_version_id" uuid NOT NULL,
  "normative_units_expected" bigint NOT NULL,
  "normative_units_imported" bigint NOT NULL,
  "normative_units_reviewed" bigint NOT NULL,
  "requirements_expected" bigint NOT NULL,
  "requirements_imported" bigint NOT NULL,
  "requirements_reviewed" bigint NOT NULL,
  "reference_controls_expected" bigint NOT NULL,
  "reference_controls_imported" bigint NOT NULL,
  "reference_controls_reviewed" bigint NOT NULL,
  "valid_parent_links" bigint NOT NULL,
  "reviewed_editorial_mappings" bigint NOT NULL,
  "reviewed_compliance_mappings" bigint NOT NULL,
  "coverage_percent" numeric(5,2) NOT NULL,
  "approved_by_user_identity_id" uuid,
  "approved_at" timestamptz,
  CONSTRAINT "pk_regulatory_coverage_manifests" PRIMARY KEY ("regulatory_coverage_manifest_id")
);

CREATE TABLE "regulatory"."frameworks" (
  "framework_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "framework_code" varchar(128) NOT NULL,
  "name" text NOT NULL,
  "source_type" varchar(32) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  CONSTRAINT "pk_frameworks" PRIMARY KEY ("framework_id")
);

CREATE TABLE "regulatory"."framework_versions" (
  "framework_version_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "framework_id" uuid NOT NULL,
  "version_number" bigint NOT NULL,
  "edition" varchar(128) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  "published_at" timestamptz,
  "superseded_by_id" uuid,
  "content_hash" char(64) NOT NULL,
  CONSTRAINT "pk_framework_versions" PRIMARY KEY ("framework_version_id")
);

CREATE TABLE "regulatory"."regulatory_pack_framework_versions" (
  "regulatory_pack_framework_version_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "regulatory_pack_version_id" uuid NOT NULL,
  "framework_version_id" uuid NOT NULL,
  CONSTRAINT "pk_regulatory_pack_framework_versions" PRIMARY KEY ("regulatory_pack_framework_version_id")
);

CREATE TABLE "regulatory"."normative_units" (
  "normative_unit_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "framework_version_id" uuid NOT NULL,
  "parent_normative_unit_id" uuid,
  "unit_type" varchar(32) NOT NULL,
  "unit_code" varchar(128),
  "title" text NOT NULL,
  "display_order" integer NOT NULL,
  "source_locator" text NOT NULL,
  "content_language" varchar(35) NOT NULL,
  "licensed_content" text,
  "licensed_content_ref" text,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  "content_hash" char(64) NOT NULL,
  "license_classification" varchar(64) NOT NULL,
  "provenance_ref" text NOT NULL,
  CONSTRAINT "pk_normative_units" PRIMARY KEY ("normative_unit_id")
);

CREATE TABLE "regulatory"."requirements" (
  "requirement_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "framework_version_id" uuid NOT NULL,
  "normative_unit_id" uuid NOT NULL,
  "requirement_code" varchar(160) NOT NULL,
  "requirement_kind" varchar(32) NOT NULL,
  "statement_locator" text NOT NULL,
  "content_language" varchar(35) NOT NULL,
  "licensed_statement" text,
  "licensed_content_ref" text,
  "content_hash" char(64) NOT NULL,
  "is_mandatory" boolean NOT NULL,
  "applicability_guidance" text,
  "evidence_expectations" text,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  "superseded_by_requirement_id" uuid,
  "provenance_ref" text NOT NULL,
  CONSTRAINT "pk_requirements" PRIMARY KEY ("requirement_id")
);

CREATE TABLE "regulatory"."requirement_applicabilities" (
  "requirement_applicability_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "requirement_id" uuid NOT NULL,
  "scope_subject_id" uuid,
  "applicability_version" bigint NOT NULL,
  "applicability_decision" varchar(32) NOT NULL,
  "rationale" text NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz NOT NULL,
  "effective_to" timestamptz,
  "approved_by_user_identity_id" uuid,
  "approved_at" timestamptz,
  CONSTRAINT "pk_requirement_applicabilities" PRIMARY KEY ("requirement_applicability_id")
);

CREATE TABLE "regulatory"."requirement_assessments" (
  "requirement_assessment_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "requirement_applicability_id" uuid NOT NULL,
  "methodology_version_ref" uuid NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "result_status" varchar(32) NOT NULL,
  "domain_conclusion" varchar(40),
  "coverage_percent" numeric(5,2),
  "assessed_at" timestamptz,
  "approved_at" timestamptz,
  "effective_configuration_id" uuid,
  "superseded_by_id" uuid,
  CONSTRAINT "pk_requirement_assessments" PRIMARY KEY ("requirement_assessment_id")
);

CREATE TABLE "regulatory"."statements_of_applicability" (
  "statement_of_applicability_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "framework_version_id" uuid NOT NULL,
  "soa_version" bigint NOT NULL,
  "title" text NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  "approved_at" timestamptz,
  "published_at" timestamptz,
  "superseded_by_id" uuid,
  CONSTRAINT "pk_statements_of_applicability" PRIMARY KEY ("statement_of_applicability_id")
);

CREATE TABLE "regulatory"."statement_of_applicability_items" (
  "statement_of_applicability_item_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "statement_of_applicability_id" uuid NOT NULL,
  "reference_control_version_id" uuid NOT NULL,
  "applicability_decision" varchar(32) NOT NULL,
  "justification" text NOT NULL,
  "implementation_state" varchar(32) NOT NULL,
  "tenant_control_id" uuid,
  "tenant_control_version_id" uuid,
  CONSTRAINT "pk_statement_of_applicability_items" PRIMARY KEY ("statement_of_applicability_item_id")
);

CREATE TABLE "regulatory"."requirement_control_mappings" (
  "requirement_control_mapping_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "requirement_id" uuid NOT NULL,
  "control_version_id" uuid NOT NULL,
  "mapping_version" bigint NOT NULL,
  "mapping_type" varchar(32) NOT NULL,
  "coverage_contribution" numeric(12,6),
  "rationale" text NOT NULL,
  "source_precedence_policy_id" uuid,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  "provenance_ref" text NOT NULL,
  "approved_by_user_identity_id" uuid,
  CONSTRAINT "pk_requirement_control_mappings" PRIMARY KEY ("requirement_control_mapping_id")
);

CREATE TABLE "regulatory"."normative_unit_control_mappings" (
  "normative_unit_control_mapping_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "normative_unit_id" uuid NOT NULL,
  "control_version_id" uuid NOT NULL,
  "mapping_version" bigint NOT NULL,
  "source_locator" text NOT NULL,
  "rationale" text,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  "provenance_ref" text NOT NULL,
  CONSTRAINT "pk_normative_unit_control_mappings" PRIMARY KEY ("normative_unit_control_mapping_id")
);

CREATE TABLE "regulatory"."framework_crosswalks" (
  "framework_crosswalk_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "source_framework_version_id" uuid NOT NULL,
  "target_framework_version_id" uuid NOT NULL,
  "crosswalk_version" bigint NOT NULL,
  "direction" varchar(32) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  "provenance_ref" text NOT NULL,
  "approved_by_user_identity_id" uuid,
  CONSTRAINT "pk_framework_crosswalks" PRIMARY KEY ("framework_crosswalk_id")
);

CREATE TABLE "regulatory"."normative_unit_crosswalk_mappings" (
  "normative_unit_crosswalk_mapping_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "framework_crosswalk_id" uuid NOT NULL,
  "source_normative_unit_id" uuid NOT NULL,
  "target_normative_unit_id" uuid,
  "relationship_type" varchar(32) NOT NULL,
  "rationale" text NOT NULL,
  "confidence" numeric(7,6) NOT NULL,
  "reviewer_user_identity_id" uuid,
  "mapping_status" varchar(32) NOT NULL,
  CONSTRAINT "pk_normative_unit_crosswalk_mappings" PRIMARY KEY ("normative_unit_crosswalk_mapping_id")
);

CREATE TABLE "regulatory"."requirement_crosswalk_mappings" (
  "requirement_crosswalk_mapping_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "framework_crosswalk_id" uuid NOT NULL,
  "source_requirement_id" uuid NOT NULL,
  "target_requirement_id" uuid,
  "relationship_type" varchar(32) NOT NULL,
  "rationale" text NOT NULL,
  "confidence" numeric(7,6) NOT NULL,
  "reviewer_user_identity_id" uuid,
  "mapping_status" varchar(32) NOT NULL,
  CONSTRAINT "pk_requirement_crosswalk_mappings" PRIMARY KEY ("requirement_crosswalk_mapping_id")
);

CREATE TABLE "regulatory"."control_crosswalk_mappings" (
  "control_crosswalk_mapping_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "framework_crosswalk_id" uuid NOT NULL,
  "source_control_version_id" uuid NOT NULL,
  "target_control_version_id" uuid,
  "relationship_type" varchar(32) NOT NULL,
  "rationale" text NOT NULL,
  "confidence" numeric(7,6) NOT NULL,
  "reviewer_user_identity_id" uuid,
  "mapping_status" varchar(32) NOT NULL,
  CONSTRAINT "pk_control_crosswalk_mappings" PRIMARY KEY ("control_crosswalk_mapping_id")
);

CREATE TABLE "controls"."controls" (
  "control_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "control_code" varchar(160) NOT NULL,
  "name" text NOT NULL,
  "control_origin" varchar(32) NOT NULL,
  "based_on_control_version_id" uuid,
  "business_owner_subject_id" uuid,
  "lifecycle_state" varchar(32) NOT NULL,
  CONSTRAINT "pk_controls" PRIMARY KEY ("control_id")
);

CREATE TABLE "controls"."control_versions" (
  "control_version_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "control_id" uuid NOT NULL,
  "version_number" bigint NOT NULL,
  "objective" text NOT NULL,
  "control_type" varchar(16) NOT NULL,
  "nature" varchar(16) NOT NULL,
  "frequency_code" varchar(64) NOT NULL,
  "execution_method" text NOT NULL,
  "verification_method" text NOT NULL,
  "minimum_evidence" text NOT NULL,
  "suggested_owner_role_code" varchar(96),
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  "published_at" timestamptz,
  "superseded_by_id" uuid,
  CONSTRAINT "pk_control_versions" PRIMARY KEY ("control_version_id")
);

CREATE TABLE "controls"."control_objectives" (
  "control_objective_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "control_version_id" uuid NOT NULL,
  "objective_code" varchar(96) NOT NULL,
  "description" text NOT NULL,
  "display_order" integer NOT NULL,
  CONSTRAINT "pk_control_objectives" PRIMARY KEY ("control_objective_id")
);

CREATE TABLE "controls"."control_scopes" (
  "control_scope_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "control_id" uuid NOT NULL,
  "subject_id" uuid NOT NULL,
  "scope_role" varchar(32) NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  CONSTRAINT "pk_control_scopes" PRIMARY KEY ("control_scope_id")
);

CREATE TABLE "controls"."control_assessments" (
  "control_assessment_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "control_id" uuid NOT NULL,
  "control_version_id" uuid NOT NULL,
  "methodology_version_ref" uuid NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "result_status" varchar(32) NOT NULL,
  "domain_conclusion" varchar(40),
  "design_effectiveness" numeric(5,2),
  "operating_effectiveness" numeric(5,2),
  "overall_effectiveness" numeric(5,2),
  "coverage_percent" numeric(5,2),
  "effective_configuration_id" uuid,
  "assessed_at" timestamptz,
  "superseded_by_id" uuid,
  CONSTRAINT "pk_control_assessments" PRIMARY KEY ("control_assessment_id")
);

CREATE TABLE "controls"."assurance_tests" (
  "assurance_test_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "control_id" uuid NOT NULL,
  "control_version_id" uuid NOT NULL,
  "test_code" varchar(128) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "result_status" varchar(32) NOT NULL,
  "domain_conclusion" varchar(40),
  "planned_at" timestamptz,
  "executed_at" timestamptz,
  "reviewed_at" timestamptz,
  "approved_at" timestamptz,
  "executor_membership_id" uuid,
  "reviewer_membership_id" uuid,
  "superseded_by_id" uuid,
  CONSTRAINT "pk_assurance_tests" PRIMARY KEY ("assurance_test_id")
);

CREATE TABLE "controls"."assurance_samples" (
  "assurance_sample_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "assurance_test_id" uuid NOT NULL,
  "sample_code" varchar(128) NOT NULL,
  "population_count" bigint,
  "sample_count" bigint NOT NULL,
  "selection_method" varchar(64) NOT NULL,
  "sample_period_start" timestamptz,
  "sample_period_end" timestamptz,
  "result_status" varchar(32) NOT NULL,
  CONSTRAINT "pk_assurance_samples" PRIMARY KEY ("assurance_sample_id")
);

CREATE TABLE "controls"."control_exceptions" (
  "control_exception_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "control_id" uuid NOT NULL,
  "exception_code" varchar(128) NOT NULL,
  "rationale" text NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz NOT NULL,
  "effective_to" timestamptz NOT NULL,
  "approved_by_membership_id" uuid,
  "risk_acceptance_id" uuid,
  CONSTRAINT "pk_control_exceptions" PRIMARY KEY ("control_exception_id")
);

CREATE TABLE "evidence"."documents" (
  "document_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "document_code" varchar(128) NOT NULL,
  "title" text NOT NULL,
  "document_kind" varchar(64) NOT NULL,
  "business_owner_subject_id" uuid,
  "lifecycle_state" varchar(32) NOT NULL,
  "retention_policy_id" uuid NOT NULL,
  CONSTRAINT "pk_documents" PRIMARY KEY ("document_id")
);

CREATE TABLE "evidence"."document_versions" (
  "document_version_id" uuid NOT NULL,
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
  "document_id" uuid NOT NULL,
  "file_object_id" uuid,
  "content_hash" char(64) NOT NULL,
  CONSTRAINT "pk_document_versions" PRIMARY KEY ("document_version_id")
);

CREATE TABLE "evidence"."evidences" (
  "evidence_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "evidence_code" varchar(128) NOT NULL,
  "evidence_type" varchar(64) NOT NULL,
  "business_owner_subject_id" uuid,
  "lifecycle_state" varchar(32) NOT NULL,
  "valid_from" timestamptz,
  "valid_to" timestamptz,
  "retention_policy_id" uuid NOT NULL,
  "source_kind" varchar(32) NOT NULL,
  CONSTRAINT "pk_evidences" PRIMARY KEY ("evidence_id")
);

CREATE TABLE "evidence"."evidence_versions" (
  "evidence_version_id" uuid NOT NULL,
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
  "evidence_id" uuid NOT NULL,
  "document_version_id" uuid,
  "file_object_id" uuid,
  "period_start" timestamptz,
  "period_end" timestamptz,
  "submitted_at" timestamptz,
  "approved_at" timestamptz,
  "expires_at" timestamptz,
  "provenance_ref" text NOT NULL,
  CONSTRAINT "pk_evidence_versions" PRIMARY KEY ("evidence_version_id")
);

CREATE TABLE "evidence"."evidence_requests" (
  "evidence_request_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "request_code" varchar(128) NOT NULL,
  "requirement_id" uuid,
  "control_id" uuid,
  "requirement_assessment_id" uuid,
  "control_assessment_id" uuid,
  "assurance_test_id" uuid,
  "lifecycle_state" varchar(32) NOT NULL,
  "requested_by_membership_id" uuid NOT NULL,
  "assigned_membership_id" uuid,
  "due_at" timestamptz,
  "fulfilled_at" timestamptz,
  CONSTRAINT "pk_evidence_requests" PRIMARY KEY ("evidence_request_id")
);

CREATE TABLE "evidence"."evidence_reviews" (
  "evidence_review_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "evidence_id" uuid NOT NULL,
  "evidence_version_id" uuid NOT NULL,
  "reviewer_membership_id" uuid NOT NULL,
  "decision" varchar(32) NOT NULL,
  "sufficiency" varchar(32),
  "relevance" varchar(32),
  "rationale" text NOT NULL,
  "reviewed_at" timestamptz NOT NULL,
  CONSTRAINT "pk_evidence_reviews" PRIMARY KEY ("evidence_review_id")
);

CREATE TABLE "evidence"."evidence_links" (
  "evidence_link_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "evidence_version_id" uuid NOT NULL,
  "requirement_id" uuid,
  "control_id" uuid,
  "control_version_id" uuid,
  "requirement_assessment_id" uuid,
  "control_assessment_id" uuid,
  "assurance_test_id" uuid,
  "claim" text,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  CONSTRAINT "pk_evidence_links" PRIMARY KEY ("evidence_link_id")
);

CREATE TABLE "evidence"."file_objects" (
  "file_object_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "object_key" text NOT NULL,
  "original_filename" text NOT NULL,
  "declared_mime" varchar(255) NOT NULL,
  "detected_mime" varchar(255) NOT NULL,
  "size_bytes" bigint NOT NULL,
  "sha256" char(64) NOT NULL,
  "encryption_key_ref" text NOT NULL,
  "classification" varchar(32) NOT NULL,
  "retention_policy_id" uuid NOT NULL,
  "scan_status" varchar(32) NOT NULL,
  "scan_completed_at" timestamptz,
  "storage_version" varchar(128) NOT NULL,
  "source_provenance" text NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  CONSTRAINT "pk_file_objects" PRIMARY KEY ("file_object_id")
);

CREATE TABLE "evidence"."evidence_request_fulfillments" (
  "evidence_request_fulfillment_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "evidence_request_id" uuid NOT NULL,
  "evidence_version_id" uuid NOT NULL,
  "fulfilled_at" timestamptz NOT NULL,
  CONSTRAINT "pk_evidence_request_fulfillments" PRIMARY KEY ("evidence_request_fulfillment_id")
);
