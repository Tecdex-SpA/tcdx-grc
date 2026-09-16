-- PRE-F4 approved integrated Audit model; PostgreSQL 16; transactional and fail-closed.
DO $$
DECLARE physical_table_count integer; ledger_count integer; existing_audits bigint;
BEGIN
  IF current_database() <> 'tcdx-grc' OR current_setting('server_version_num')::integer / 10000 <> 16 THEN
    RAISE EXCEPTION 'AUDIT_AMENDMENT_TARGET_IDENTITY_MISMATCH';
  END IF;
  SELECT count(*) INTO ledger_count FROM platform.schema_migrations WHERE outcome = 'applied';
  IF ledger_count <> 9 OR EXISTS (SELECT 1 FROM platform.schema_migrations WHERE migration_id <> ALL (ARRAY['20260916000100', '20260916000200', '20260916000300', '20260916000400', '20260916000500', '20260916000600', '20260916000700', '20260916000800', '20260916000900']::char(14)[])) THEN
    RAISE EXCEPTION 'AUDIT_AMENDMENT_LEDGER_PRECONDITION_FAILED';
  END IF;
  SELECT count(*) INTO physical_table_count FROM pg_catalog.pg_tables WHERE schemaname = ANY (ARRAY['platform', 'iam', 'org', 'regulatory', 'controls', 'evidence', 'remediation', 'risk', 'audit', 'operations', 'third_party', 'resilience', 'privacy', 'survey', 'data', 'config', 'rules', 'integration', 'reporting', 'knowledge', 'ai', 'notification', 'ops_audit']) AND NOT (schemaname = 'platform' AND tablename = 'schema_migrations');
  IF physical_table_count <> 214 THEN RAISE EXCEPTION 'AUDIT_AMENDMENT_SCHEMA_COUNT_PRECONDITION_FAILED: %', physical_table_count; END IF;
  IF to_regclass('audit.audits') IS NULL OR to_regclass('audit.audit_tests') IS NULL
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'audit' AND table_name = 'audits' AND column_name = 'scope_text')
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'audit' AND table_name = 'audits' AND column_name = 'lead_membership_id') THEN
    RAISE EXCEPTION 'AUDIT_AMENDMENT_SCHEMA_SHAPE_PRECONDITION_FAILED';
  END IF;
  SELECT count(*) INTO existing_audits FROM audit.audits;
  RAISE NOTICE 'EXISTING_AUDITS=%', existing_audits;
  IF existing_audits <> 0 THEN RAISE EXCEPTION 'AUDIT_RECONCILIATION_REQUIRED_BEFORE_MUTATION: EXISTING_AUDITS=%', existing_audits; END IF;
END $$;

-- Generated mechanically from docs/physical-data-model/01_PHYSICAL_DATA_MODEL.md.
-- PostgreSQL 16; the approved physical model remains authority.

CREATE TABLE "audit"."audit_objectives" (
  "audit_objective_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "audit_id" uuid NOT NULL,
  "objective_code" varchar(96) NOT NULL,
  "statement" text NOT NULL,
  "ordinal" integer NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  CONSTRAINT "pk_audit_objectives" PRIMARY KEY ("audit_objective_id")
);

CREATE TABLE "audit"."audit_criteria" (
  "audit__criterion_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "audit_id" uuid NOT NULL,
  "criterion_kind" varchar(32) NOT NULL,
  "framework_version_id" uuid NOT NULL,
  "requirement_id" uuid,
  "rationale" text NOT NULL,
  "ordinal" integer NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  CONSTRAINT "pk_audit_criteria" PRIMARY KEY ("audit__criterion_id")
);

CREATE TABLE "audit"."audit_scopes" (
  "audit_scope_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "audit_id" uuid NOT NULL,
  "framework_version_id" uuid NOT NULL,
  "subject_id" uuid NOT NULL,
  "scope_code" varchar(96) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  CONSTRAINT "pk_audit_scopes" PRIMARY KEY ("audit_scope_id")
);

CREATE TABLE "audit"."audit_team_assignments" (
  "audit_team_assignment_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "audit_id" uuid NOT NULL,
  "membership_id" uuid NOT NULL,
  "team_role" varchar(32) NOT NULL,
  "assigned_from" timestamptz NOT NULL,
  "assigned_to" timestamptz,
  "lifecycle_state" varchar(32) NOT NULL,
  CONSTRAINT "pk_audit_team_assignments" PRIMARY KEY ("audit_team_assignment_id")
);

CREATE TABLE "audit"."audit_competencies" (
  "audit_competency_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "competency_code" varchar(128) NOT NULL,
  "version_number" bigint NOT NULL,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz NOT NULL,
  "effective_to" timestamptz,
  "published_at" timestamptz,
  CONSTRAINT "pk_audit_competencies" PRIMARY KEY ("audit_competency_id")
);

CREATE TABLE "audit"."auditor_competency_assertions" (
  "auditor_competency_assertion_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "membership_id" uuid NOT NULL,
  "audit_competency_id" uuid NOT NULL,
  "evidence_version_id" uuid,
  "valid_from" timestamptz NOT NULL,
  "valid_to" timestamptz,
  "assertion_status" varchar(32) NOT NULL,
  "verified_by_membership_id" uuid NOT NULL,
  "verified_at" timestamptz NOT NULL,
  "superseded_by_id" uuid,
  CONSTRAINT "pk_auditor_competency_assertions" PRIMARY KEY ("auditor_competency_assertion_id")
);

CREATE TABLE "audit"."audit_competency_requirements" (
  "audit_competency_requirement_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "audit_id" uuid NOT NULL,
  "framework_version_id" uuid NOT NULL,
  "audit_competency_id" uuid NOT NULL,
  "team_role" varchar(32) NOT NULL,
  "rationale" text NOT NULL,
  CONSTRAINT "pk_audit_competency_requirements" PRIMARY KEY ("audit_competency_requirement_id")
);

CREATE TABLE "audit"."audit_competency_validations" (
  "audit_competency_validation_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "audit_competency_requirement_id" uuid NOT NULL,
  "audit_team_assignment_id" uuid NOT NULL,
  "auditor_competency_assertion_id" uuid,
  "validation_outcome" varchar(32) NOT NULL,
  "validated_by_membership_id" uuid NOT NULL,
  "validated_at" timestamptz NOT NULL,
  "rationale" text,
  CONSTRAINT "pk_audit_competency_validations" PRIMARY KEY ("audit_competency_validation_id")
);

CREATE TABLE "audit"."audit_agenda_items" (
  "audit_agenda_item_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "audit_id" uuid NOT NULL,
  "agenda_code" varchar(96) NOT NULL,
  "title" text NOT NULL,
  "starts_at" timestamptz NOT NULL,
  "ends_at" timestamptz NOT NULL,
  "ordinal" integer NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  CONSTRAINT "pk_audit_agenda_items" PRIMARY KEY ("audit_agenda_item_id")
);

CREATE TABLE "audit"."audit_agenda_item_tests" (
  "audit_agenda_item_test_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "audit_agenda_item_id" uuid NOT NULL,
  "audit_test_id" uuid NOT NULL,
  CONSTRAINT "pk_audit_agenda_item_tests" PRIMARY KEY ("audit_agenda_item_test_id")
);

CREATE TABLE "audit"."audit_agenda_item_scopes" (
  "audit_agenda_item_scope_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "audit_agenda_item_id" uuid NOT NULL,
  "audit_scope_id" uuid NOT NULL,
  CONSTRAINT "pk_audit_agenda_item_scopes" PRIMARY KEY ("audit_agenda_item_scope_id")
);

CREATE TABLE "audit"."audit_agenda_item_team_assignments" (
  "audit_agenda_item_team_assignment_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "audit_agenda_item_id" uuid NOT NULL,
  "audit_team_assignment_id" uuid NOT NULL,
  CONSTRAINT "pk_audit_agenda_item_team_assignments" PRIMARY KEY ("audit_agenda_item_team_assignment_id")
);

CREATE TABLE "audit"."audit_test_requirement_links" (
  "audit_test_requirement_link_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "audit_test_id" uuid NOT NULL,
  "requirement_id" uuid NOT NULL,
  "is_anchor" boolean NOT NULL DEFAULT false,
  "requirement_crosswalk_mapping_id" uuid,
  "link_rationale" text NOT NULL,
  CONSTRAINT "pk_audit_test_requirement_links" PRIMARY KEY ("audit_test_requirement_link_id")
);

CREATE TABLE "audit"."audit_test_control_links" (
  "audit_test_control_link_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "audit_test_id" uuid NOT NULL,
  "control_id" uuid,
  "control_assessment_id" uuid,
  "link_role" varchar(32) NOT NULL,
  CONSTRAINT "pk_audit_test_control_links" PRIMARY KEY ("audit_test_control_link_id")
);

CREATE TABLE "audit"."audit_test_requirement_assessment_links" (
  "audit_test_requirement_assessment_link_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "audit_test_id" uuid NOT NULL,
  "audit_test_requirement_link_id" uuid NOT NULL,
  "requirement_assessment_id" uuid NOT NULL,
  "lineage_role" varchar(32) NOT NULL,
  CONSTRAINT "pk_audit_test_requirement_assessment_links" PRIMARY KEY ("audit_test_requirement_assessment_link_id")
);

-- Declarative invariants derived from physical profiles 01 and invariants 03.

ALTER TABLE "audit"."audit_objectives" ADD CONSTRAINT "ck_audit_objectives__row_version_positive" CHECK (row_version > 0);
ALTER TABLE "audit"."audit_objectives" ADD CONSTRAINT "ck_audit_objectives__created_actor_one" CHECK (num_nonnulls(created_by_user_identity_id, created_by_service_principal_id) <= 1);
ALTER TABLE "audit"."audit_objectives" ADD CONSTRAINT "ck_audit_objectives__updated_actor_one" CHECK (num_nonnulls(updated_by_user_identity_id, updated_by_service_principal_id) <= 1);
ALTER TABLE "audit"."audit_objectives" ADD CONSTRAINT "ck_audit_objectives__ordinal_nonnegative" CHECK (ordinal >= 0);
ALTER TABLE "audit"."audit_objectives" ADD CONSTRAINT "ck_audit_objectives__statement_nonempty" CHECK (btrim(statement) <> '');
ALTER TABLE "audit"."audit_objectives" ADD CONSTRAINT "uq_audit_objectives__tenant_id_audit_objective_id" UNIQUE NULLS NOT DISTINCT ("tenant_id", "audit_objective_id");
ALTER TABLE "audit"."audit_objectives" ADD CONSTRAINT "uq_audit_objectives__audit_id_objective_code" UNIQUE ("audit_id", "objective_code");
ALTER TABLE "audit"."audit_objectives" ADD CONSTRAINT "uq_audit_objectives__audit_id_ordinal" UNIQUE ("audit_id", "ordinal");
ALTER TABLE "audit"."audit_criteria" ADD CONSTRAINT "ck_audit_criteria__row_version_positive" CHECK (row_version > 0);
ALTER TABLE "audit"."audit_criteria" ADD CONSTRAINT "ck_audit_criteria__created_actor_one" CHECK (num_nonnulls(created_by_user_identity_id, created_by_service_principal_id) <= 1);
ALTER TABLE "audit"."audit_criteria" ADD CONSTRAINT "ck_audit_criteria__updated_actor_one" CHECK (num_nonnulls(updated_by_user_identity_id, updated_by_service_principal_id) <= 1);
ALTER TABLE "audit"."audit_criteria" ADD CONSTRAINT "ck_audit_criteria__criterion_target" CHECK ((criterion_kind = 'framework_version' AND requirement_id IS NULL) OR (criterion_kind = 'requirement' AND requirement_id IS NOT NULL));
ALTER TABLE "audit"."audit_criteria" ADD CONSTRAINT "ck_audit_criteria__ordinal_nonnegative" CHECK (ordinal >= 0);
ALTER TABLE "audit"."audit_criteria" ADD CONSTRAINT "ck_audit_criteria__rationale_nonempty" CHECK (btrim(rationale) <> '');
ALTER TABLE "audit"."audit_criteria" ADD CONSTRAINT "uq_audit_criteria__tenant_id_audit__criterion_id" UNIQUE NULLS NOT DISTINCT ("tenant_id", "audit__criterion_id");
ALTER TABLE "audit"."audit_criteria" ADD CONSTRAINT "uq_audit_criteria__audit_id_ordinal" UNIQUE ("audit_id", "ordinal");
ALTER TABLE "audit"."audit_scopes" ADD CONSTRAINT "ck_audit_scopes__row_version_positive" CHECK (row_version > 0);
ALTER TABLE "audit"."audit_scopes" ADD CONSTRAINT "ck_audit_scopes__created_actor_one" CHECK (num_nonnulls(created_by_user_identity_id, created_by_service_principal_id) <= 1);
ALTER TABLE "audit"."audit_scopes" ADD CONSTRAINT "ck_audit_scopes__updated_actor_one" CHECK (num_nonnulls(updated_by_user_identity_id, updated_by_service_principal_id) <= 1);
ALTER TABLE "audit"."audit_scopes" ADD CONSTRAINT "ck_audit_scopes__scope_code_nonempty" CHECK (btrim(scope_code) <> '');
ALTER TABLE "audit"."audit_scopes" ADD CONSTRAINT "uq_audit_scopes__tenant_id_audit_scope_id" UNIQUE NULLS NOT DISTINCT ("tenant_id", "audit_scope_id");
ALTER TABLE "audit"."audit_scopes" ADD CONSTRAINT "uq_audit_scopes__audit_id_framework_version_id_subject_id" UNIQUE ("audit_id", "framework_version_id", "subject_id");
ALTER TABLE "audit"."audit_scopes" ADD CONSTRAINT "uq_audit_scopes__audit_id_scope_code" UNIQUE ("audit_id", "scope_code");
ALTER TABLE "audit"."audit_team_assignments" ADD CONSTRAINT "ck_audit_team_assignments__row_version_positive" CHECK (row_version > 0);
ALTER TABLE "audit"."audit_team_assignments" ADD CONSTRAINT "ck_audit_team_assignments__created_actor_one" CHECK (num_nonnulls(created_by_user_identity_id, created_by_service_principal_id) <= 1);
ALTER TABLE "audit"."audit_team_assignments" ADD CONSTRAINT "ck_audit_team_assignments__updated_actor_one" CHECK (num_nonnulls(updated_by_user_identity_id, updated_by_service_principal_id) <= 1);
ALTER TABLE "audit"."audit_team_assignments" ADD CONSTRAINT "ck_audit_team_assignments__team_role" CHECK (team_role IN ('lead_auditor','auditor','technical_expert'));
ALTER TABLE "audit"."audit_team_assignments" ADD CONSTRAINT "ck_audit_team_assignments__assigned_interval" CHECK (assigned_to IS NULL OR assigned_to > assigned_from);
ALTER TABLE "audit"."audit_team_assignments" ADD CONSTRAINT "uq_audit_team_assignments__tenant_id_audit_team_assignment_id" UNIQUE NULLS NOT DISTINCT ("tenant_id", "audit_team_assignment_id");
ALTER TABLE "audit"."audit_team_assignments" ADD CONSTRAINT "uq_audit_team_assignments__audit_id_membership_id_team_5e8c529e" UNIQUE ("audit_id", "membership_id", "team_role", "assigned_from");
ALTER TABLE "audit"."audit_competencies" ADD CONSTRAINT "ck_audit_competencies__created_actor_one" CHECK (num_nonnulls(created_by_user_identity_id, created_by_service_principal_id) <= 1);
ALTER TABLE "audit"."audit_competencies" ADD CONSTRAINT "ck_audit_competencies__effective_from_effective_to" CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from);
ALTER TABLE "audit"."audit_competencies" ADD CONSTRAINT "ck_audit_competencies__version_positive" CHECK (version_number > 0);
ALTER TABLE "audit"."audit_competencies" ADD CONSTRAINT "ck_audit_competencies__competency_code_nonempty" CHECK (btrim(competency_code) <> '');
ALTER TABLE "audit"."audit_competencies" ADD CONSTRAINT "uq_audit_competencies__competency_code_version_number" UNIQUE ("competency_code", "version_number");
ALTER TABLE "audit"."auditor_competency_assertions" ADD CONSTRAINT "ck_auditor_competency_assertions__created_actor_one" CHECK (num_nonnulls(created_by_user_identity_id, created_by_service_principal_id) <= 1);
ALTER TABLE "audit"."auditor_competency_assertions" ADD CONSTRAINT "ck_auditor_competency_assertions__valid_from_valid_to" CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to > valid_from);
ALTER TABLE "audit"."auditor_competency_assertions" ADD CONSTRAINT "ck_auditor_competency_assertions__assertion_status" CHECK (assertion_status IN ('verified','expired','revoked','superseded'));
ALTER TABLE "audit"."auditor_competency_assertions" ADD CONSTRAINT "ck_auditor_competency_assertions__independent_verifier" CHECK (verified_by_membership_id <> membership_id);
ALTER TABLE "audit"."auditor_competency_assertions" ADD CONSTRAINT "uq_auditor_competency_assertions__tenant_id_auditor_co_2a6515d9" UNIQUE NULLS NOT DISTINCT ("tenant_id", "auditor_competency_assertion_id");
ALTER TABLE "audit"."auditor_competency_assertions" ADD CONSTRAINT "uq_auditor_competency_assertions__membership_id_audit__1b6608b6" UNIQUE ("membership_id", "audit_competency_id", "valid_from");
ALTER TABLE "audit"."audit_competency_requirements" ADD CONSTRAINT "ck_audit_competency_requirements__created_actor_one" CHECK (num_nonnulls(created_by_user_identity_id, created_by_service_principal_id) <= 1);
ALTER TABLE "audit"."audit_competency_requirements" ADD CONSTRAINT "ck_audit_competency_requirements__team_role" CHECK (team_role IN ('lead_auditor','auditor','technical_expert'));
ALTER TABLE "audit"."audit_competency_requirements" ADD CONSTRAINT "ck_audit_competency_requirements__rationale_nonempty" CHECK (btrim(rationale) <> '');
ALTER TABLE "audit"."audit_competency_requirements" ADD CONSTRAINT "uq_audit_competency_requirements__tenant_id_audit_comp_ec4baf3e" UNIQUE NULLS NOT DISTINCT ("tenant_id", "audit_competency_requirement_id");
ALTER TABLE "audit"."audit_competency_requirements" ADD CONSTRAINT "uq_audit_competency_requirements__audit_id_framework_v_71d77e8e" UNIQUE ("audit_id", "framework_version_id", "audit_competency_id", "team_role");
ALTER TABLE "audit"."audit_competency_validations" ADD CONSTRAINT "ck_audit_competency_validations__created_actor_one" CHECK (num_nonnulls(created_by_user_identity_id, created_by_service_principal_id) <= 1);
ALTER TABLE "audit"."audit_competency_validations" ADD CONSTRAINT "ck_audit_competency_validations__validation_outcome" CHECK (validation_outcome IN ('covered','not_covered','expired','evidence_missing'));
ALTER TABLE "audit"."audit_competency_validations" ADD CONSTRAINT "ck_audit_competency_validations__covered_assertion" CHECK ((validation_outcome = 'covered') = (auditor_competency_assertion_id IS NOT NULL));
ALTER TABLE "audit"."audit_competency_validations" ADD CONSTRAINT "uq_audit_competency_validations__tenant_id_audit_compe_ec5c06c8" UNIQUE NULLS NOT DISTINCT ("tenant_id", "audit_competency_validation_id");
ALTER TABLE "audit"."audit_competency_validations" ADD CONSTRAINT "uq_audit_competency_validations__audit_competency_requ_ded5f205" UNIQUE ("audit_competency_requirement_id", "audit_team_assignment_id", "validated_at");
ALTER TABLE "audit"."audit_agenda_items" ADD CONSTRAINT "ck_audit_agenda_items__row_version_positive" CHECK (row_version > 0);
ALTER TABLE "audit"."audit_agenda_items" ADD CONSTRAINT "ck_audit_agenda_items__created_actor_one" CHECK (num_nonnulls(created_by_user_identity_id, created_by_service_principal_id) <= 1);
ALTER TABLE "audit"."audit_agenda_items" ADD CONSTRAINT "ck_audit_agenda_items__updated_actor_one" CHECK (num_nonnulls(updated_by_user_identity_id, updated_by_service_principal_id) <= 1);
ALTER TABLE "audit"."audit_agenda_items" ADD CONSTRAINT "ck_audit_agenda_items__starts_at_ends_at" CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at);
ALTER TABLE "audit"."audit_agenda_items" ADD CONSTRAINT "ck_audit_agenda_items__ordinal_nonnegative" CHECK (ordinal >= 0);
ALTER TABLE "audit"."audit_agenda_items" ADD CONSTRAINT "ck_audit_agenda_items__title_nonempty" CHECK (btrim(title) <> '');
ALTER TABLE "audit"."audit_agenda_items" ADD CONSTRAINT "uq_audit_agenda_items__tenant_id_audit_agenda_item_id" UNIQUE NULLS NOT DISTINCT ("tenant_id", "audit_agenda_item_id");
ALTER TABLE "audit"."audit_agenda_items" ADD CONSTRAINT "uq_audit_agenda_items__audit_id_agenda_code" UNIQUE ("audit_id", "agenda_code");
ALTER TABLE "audit"."audit_agenda_items" ADD CONSTRAINT "uq_audit_agenda_items__audit_id_ordinal" UNIQUE ("audit_id", "ordinal");
ALTER TABLE "audit"."audit_agenda_item_tests" ADD CONSTRAINT "ck_audit_agenda_item_tests__created_actor_one" CHECK (num_nonnulls(created_by_user_identity_id, created_by_service_principal_id) <= 1);
ALTER TABLE "audit"."audit_agenda_item_tests" ADD CONSTRAINT "uq_audit_agenda_item_tests__tenant_id_audit_agenda_item_test_id" UNIQUE NULLS NOT DISTINCT ("tenant_id", "audit_agenda_item_test_id");
ALTER TABLE "audit"."audit_agenda_item_tests" ADD CONSTRAINT "uq_audit_agenda_item_tests__audit_agenda_item_id_audit_test_id" UNIQUE ("audit_agenda_item_id", "audit_test_id");
ALTER TABLE "audit"."audit_agenda_item_scopes" ADD CONSTRAINT "ck_audit_agenda_item_scopes__created_actor_one" CHECK (num_nonnulls(created_by_user_identity_id, created_by_service_principal_id) <= 1);
ALTER TABLE "audit"."audit_agenda_item_scopes" ADD CONSTRAINT "uq_audit_agenda_item_scopes__tenant_id_audit_agenda_it_e27d7092" UNIQUE NULLS NOT DISTINCT ("tenant_id", "audit_agenda_item_scope_id");
ALTER TABLE "audit"."audit_agenda_item_scopes" ADD CONSTRAINT "uq_audit_agenda_item_scopes__audit_agenda_item_id_audi_d64b6daa" UNIQUE ("audit_agenda_item_id", "audit_scope_id");
ALTER TABLE "audit"."audit_agenda_item_team_assignments" ADD CONSTRAINT "ck_audit_agenda_item_team_assignments__created_actor_one" CHECK (num_nonnulls(created_by_user_identity_id, created_by_service_principal_id) <= 1);
ALTER TABLE "audit"."audit_agenda_item_team_assignments" ADD CONSTRAINT "uq_audit_agenda_item_team_assignments__tenant_id_audit_92600b46" UNIQUE NULLS NOT DISTINCT ("tenant_id", "audit_agenda_item_team_assignment_id");
ALTER TABLE "audit"."audit_agenda_item_team_assignments" ADD CONSTRAINT "uq_audit_agenda_item_team_assignments__audit_agenda_it_133856d9" UNIQUE ("audit_agenda_item_id", "audit_team_assignment_id");
ALTER TABLE "audit"."audit_test_requirement_links" ADD CONSTRAINT "ck_audit_test_requirement_links__created_actor_one" CHECK (num_nonnulls(created_by_user_identity_id, created_by_service_principal_id) <= 1);
ALTER TABLE "audit"."audit_test_requirement_links" ADD CONSTRAINT "ck_audit_test_requirement_links__anchor_crosswalk" CHECK (NOT is_anchor OR requirement_crosswalk_mapping_id IS NULL);
ALTER TABLE "audit"."audit_test_requirement_links" ADD CONSTRAINT "ck_audit_test_requirement_links__link_rationale_nonempty" CHECK (btrim(link_rationale) <> '');
ALTER TABLE "audit"."audit_test_requirement_links" ADD CONSTRAINT "uq_audit_test_requirement_links__tenant_id_audit_test__c68dd523" UNIQUE NULLS NOT DISTINCT ("tenant_id", "audit_test_requirement_link_id");
ALTER TABLE "audit"."audit_test_requirement_links" ADD CONSTRAINT "uq_audit_test_requirement_links__audit_test_id_requirement_id" UNIQUE ("audit_test_id", "requirement_id");
ALTER TABLE "audit"."audit_test_control_links" ADD CONSTRAINT "ck_audit_test_control_links__created_actor_one" CHECK (num_nonnulls(created_by_user_identity_id, created_by_service_principal_id) <= 1);
ALTER TABLE "audit"."audit_test_control_links" ADD CONSTRAINT "ck_audit_test_control_links__typed_target" CHECK (num_nonnulls(control_id, control_assessment_id) = 1);
ALTER TABLE "audit"."audit_test_control_links" ADD CONSTRAINT "uq_audit_test_control_links__tenant_id_audit_test_cont_6754c45a" UNIQUE NULLS NOT DISTINCT ("tenant_id", "audit_test_control_link_id");
ALTER TABLE "audit"."audit_test_requirement_assessment_links" ADD CONSTRAINT "ck_audit_test_requirement_assessment_links__created_actor_one" CHECK (num_nonnulls(created_by_user_identity_id, created_by_service_principal_id) <= 1);
ALTER TABLE "audit"."audit_test_requirement_assessment_links" ADD CONSTRAINT "uq_audit_test_requirement_assessment_links__tenant_id__f4ac3223" UNIQUE NULLS NOT DISTINCT ("tenant_id", "audit_test_requirement_assessment_link_id");
ALTER TABLE "audit"."audit_test_requirement_assessment_links" ADD CONSTRAINT "uq_audit_test_requirement_assessment_links__audit_test_4722a755" UNIQUE ("audit_test_id", "requirement_assessment_id", "lineage_role");

-- Typed and tenant-safe foreign keys for the approved Audit amendment.

ALTER TABLE "audit"."audit_objectives" ADD CONSTRAINT "fk_audit_objectives__created_by_user_identity_id" FOREIGN KEY ("created_by_user_identity_id") REFERENCES "iam"."user_identities" ("user_identity_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_objectives" ADD CONSTRAINT "fk_audit_objectives__created_by_service_principal_id" FOREIGN KEY ("created_by_service_principal_id") REFERENCES "iam"."service_principals" ("service_principal_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_objectives" ADD CONSTRAINT "fk_audit_objectives__updated_by_user_identity_id" FOREIGN KEY ("updated_by_user_identity_id") REFERENCES "iam"."user_identities" ("user_identity_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_objectives" ADD CONSTRAINT "fk_audit_objectives__updated_by_service_principal_id" FOREIGN KEY ("updated_by_service_principal_id") REFERENCES "iam"."service_principals" ("service_principal_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_objectives" ADD CONSTRAINT "fk_audit_objectives__tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants" ("tenant_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_objectives" ADD CONSTRAINT "fk_audit_objectives__audit_id" FOREIGN KEY ("tenant_id", "audit_id") REFERENCES "audit"."audits" ("tenant_id", "audit_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_criteria" ADD CONSTRAINT "fk_audit_criteria__created_by_user_identity_id" FOREIGN KEY ("created_by_user_identity_id") REFERENCES "iam"."user_identities" ("user_identity_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_criteria" ADD CONSTRAINT "fk_audit_criteria__created_by_service_principal_id" FOREIGN KEY ("created_by_service_principal_id") REFERENCES "iam"."service_principals" ("service_principal_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_criteria" ADD CONSTRAINT "fk_audit_criteria__updated_by_user_identity_id" FOREIGN KEY ("updated_by_user_identity_id") REFERENCES "iam"."user_identities" ("user_identity_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_criteria" ADD CONSTRAINT "fk_audit_criteria__updated_by_service_principal_id" FOREIGN KEY ("updated_by_service_principal_id") REFERENCES "iam"."service_principals" ("service_principal_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_criteria" ADD CONSTRAINT "fk_audit_criteria__tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants" ("tenant_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_criteria" ADD CONSTRAINT "fk_audit_criteria__audit_id" FOREIGN KEY ("tenant_id", "audit_id") REFERENCES "audit"."audits" ("tenant_id", "audit_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_criteria" ADD CONSTRAINT "fk_audit_criteria__framework_version_id" FOREIGN KEY ("framework_version_id") REFERENCES "regulatory"."framework_versions" ("framework_version_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_criteria" ADD CONSTRAINT "fk_audit_criteria__requirement_id" FOREIGN KEY ("requirement_id") REFERENCES "regulatory"."requirements" ("requirement_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_scopes" ADD CONSTRAINT "fk_audit_scopes__created_by_user_identity_id" FOREIGN KEY ("created_by_user_identity_id") REFERENCES "iam"."user_identities" ("user_identity_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_scopes" ADD CONSTRAINT "fk_audit_scopes__created_by_service_principal_id" FOREIGN KEY ("created_by_service_principal_id") REFERENCES "iam"."service_principals" ("service_principal_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_scopes" ADD CONSTRAINT "fk_audit_scopes__updated_by_user_identity_id" FOREIGN KEY ("updated_by_user_identity_id") REFERENCES "iam"."user_identities" ("user_identity_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_scopes" ADD CONSTRAINT "fk_audit_scopes__updated_by_service_principal_id" FOREIGN KEY ("updated_by_service_principal_id") REFERENCES "iam"."service_principals" ("service_principal_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_scopes" ADD CONSTRAINT "fk_audit_scopes__tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants" ("tenant_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_scopes" ADD CONSTRAINT "fk_audit_scopes__audit_id" FOREIGN KEY ("tenant_id", "audit_id") REFERENCES "audit"."audits" ("tenant_id", "audit_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_scopes" ADD CONSTRAINT "fk_audit_scopes__framework_version_id" FOREIGN KEY ("framework_version_id") REFERENCES "regulatory"."framework_versions" ("framework_version_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_scopes" ADD CONSTRAINT "fk_audit_scopes__subject_id" FOREIGN KEY ("tenant_id", "subject_id") REFERENCES "org"."subjects" ("tenant_id", "subject_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_team_assignments" ADD CONSTRAINT "fk_audit_team_assignments__created_by_user_identity_id" FOREIGN KEY ("created_by_user_identity_id") REFERENCES "iam"."user_identities" ("user_identity_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_team_assignments" ADD CONSTRAINT "fk_audit_team_assignments__created_by_service_principal_id" FOREIGN KEY ("created_by_service_principal_id") REFERENCES "iam"."service_principals" ("service_principal_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_team_assignments" ADD CONSTRAINT "fk_audit_team_assignments__updated_by_user_identity_id" FOREIGN KEY ("updated_by_user_identity_id") REFERENCES "iam"."user_identities" ("user_identity_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_team_assignments" ADD CONSTRAINT "fk_audit_team_assignments__updated_by_service_principal_id" FOREIGN KEY ("updated_by_service_principal_id") REFERENCES "iam"."service_principals" ("service_principal_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_team_assignments" ADD CONSTRAINT "fk_audit_team_assignments__tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants" ("tenant_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_team_assignments" ADD CONSTRAINT "fk_audit_team_assignments__audit_id" FOREIGN KEY ("tenant_id", "audit_id") REFERENCES "audit"."audits" ("tenant_id", "audit_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_team_assignments" ADD CONSTRAINT "fk_audit_team_assignments__membership_id" FOREIGN KEY ("tenant_id", "membership_id") REFERENCES "iam"."tenant_memberships" ("tenant_id", "tenant_membership_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_competencies" ADD CONSTRAINT "fk_audit_competencies__created_by_user_identity_id" FOREIGN KEY ("created_by_user_identity_id") REFERENCES "iam"."user_identities" ("user_identity_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_competencies" ADD CONSTRAINT "fk_audit_competencies__created_by_service_principal_id" FOREIGN KEY ("created_by_service_principal_id") REFERENCES "iam"."service_principals" ("service_principal_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."auditor_competency_assertions" ADD CONSTRAINT "fk_auditor_competency_assertions__created_by_user_identity_id" FOREIGN KEY ("created_by_user_identity_id") REFERENCES "iam"."user_identities" ("user_identity_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."auditor_competency_assertions" ADD CONSTRAINT "fk_auditor_competency_assertions__created_by_service_p_c70fefc8" FOREIGN KEY ("created_by_service_principal_id") REFERENCES "iam"."service_principals" ("service_principal_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."auditor_competency_assertions" ADD CONSTRAINT "fk_auditor_competency_assertions__tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants" ("tenant_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."auditor_competency_assertions" ADD CONSTRAINT "fk_auditor_competency_assertions__membership_id" FOREIGN KEY ("tenant_id", "membership_id") REFERENCES "iam"."tenant_memberships" ("tenant_id", "tenant_membership_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."auditor_competency_assertions" ADD CONSTRAINT "fk_auditor_competency_assertions__audit_competency_id" FOREIGN KEY ("audit_competency_id") REFERENCES "audit"."audit_competencies" ("audit_competency_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."auditor_competency_assertions" ADD CONSTRAINT "fk_auditor_competency_assertions__evidence_version_id" FOREIGN KEY ("tenant_id", "evidence_version_id") REFERENCES "evidence"."evidence_versions" ("tenant_id", "evidence_version_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."auditor_competency_assertions" ADD CONSTRAINT "fk_auditor_competency_assertions__verified_by_membership_id" FOREIGN KEY ("tenant_id", "verified_by_membership_id") REFERENCES "iam"."tenant_memberships" ("tenant_id", "tenant_membership_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."auditor_competency_assertions" ADD CONSTRAINT "fk_auditor_competency_assertions__superseded_by_id" FOREIGN KEY ("tenant_id", "superseded_by_id") REFERENCES "audit"."auditor_competency_assertions" ("tenant_id", "auditor_competency_assertion_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_competency_requirements" ADD CONSTRAINT "fk_audit_competency_requirements__created_by_user_identity_id" FOREIGN KEY ("created_by_user_identity_id") REFERENCES "iam"."user_identities" ("user_identity_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_competency_requirements" ADD CONSTRAINT "fk_audit_competency_requirements__created_by_service_p_66c9101d" FOREIGN KEY ("created_by_service_principal_id") REFERENCES "iam"."service_principals" ("service_principal_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_competency_requirements" ADD CONSTRAINT "fk_audit_competency_requirements__tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants" ("tenant_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_competency_requirements" ADD CONSTRAINT "fk_audit_competency_requirements__audit_id" FOREIGN KEY ("tenant_id", "audit_id") REFERENCES "audit"."audits" ("tenant_id", "audit_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_competency_requirements" ADD CONSTRAINT "fk_audit_competency_requirements__framework_version_id" FOREIGN KEY ("framework_version_id") REFERENCES "regulatory"."framework_versions" ("framework_version_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_competency_requirements" ADD CONSTRAINT "fk_audit_competency_requirements__audit_competency_id" FOREIGN KEY ("audit_competency_id") REFERENCES "audit"."audit_competencies" ("audit_competency_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_competency_validations" ADD CONSTRAINT "fk_audit_competency_validations__created_by_user_identity_id" FOREIGN KEY ("created_by_user_identity_id") REFERENCES "iam"."user_identities" ("user_identity_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_competency_validations" ADD CONSTRAINT "fk_audit_competency_validations__created_by_service_pr_b6baa1b1" FOREIGN KEY ("created_by_service_principal_id") REFERENCES "iam"."service_principals" ("service_principal_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_competency_validations" ADD CONSTRAINT "fk_audit_competency_validations__tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants" ("tenant_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_competency_validations" ADD CONSTRAINT "fk_audit_competency_validations__audit_competency_requ_d53eec70" FOREIGN KEY ("tenant_id", "audit_competency_requirement_id") REFERENCES "audit"."audit_competency_requirements" ("tenant_id", "audit_competency_requirement_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_competency_validations" ADD CONSTRAINT "fk_audit_competency_validations__audit_team_assignment_id" FOREIGN KEY ("tenant_id", "audit_team_assignment_id") REFERENCES "audit"."audit_team_assignments" ("tenant_id", "audit_team_assignment_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_competency_validations" ADD CONSTRAINT "fk_audit_competency_validations__auditor_competency_as_54e0df02" FOREIGN KEY ("tenant_id", "auditor_competency_assertion_id") REFERENCES "audit"."auditor_competency_assertions" ("tenant_id", "auditor_competency_assertion_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_competency_validations" ADD CONSTRAINT "fk_audit_competency_validations__validated_by_membership_id" FOREIGN KEY ("tenant_id", "validated_by_membership_id") REFERENCES "iam"."tenant_memberships" ("tenant_id", "tenant_membership_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_agenda_items" ADD CONSTRAINT "fk_audit_agenda_items__created_by_user_identity_id" FOREIGN KEY ("created_by_user_identity_id") REFERENCES "iam"."user_identities" ("user_identity_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_agenda_items" ADD CONSTRAINT "fk_audit_agenda_items__created_by_service_principal_id" FOREIGN KEY ("created_by_service_principal_id") REFERENCES "iam"."service_principals" ("service_principal_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_agenda_items" ADD CONSTRAINT "fk_audit_agenda_items__updated_by_user_identity_id" FOREIGN KEY ("updated_by_user_identity_id") REFERENCES "iam"."user_identities" ("user_identity_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_agenda_items" ADD CONSTRAINT "fk_audit_agenda_items__updated_by_service_principal_id" FOREIGN KEY ("updated_by_service_principal_id") REFERENCES "iam"."service_principals" ("service_principal_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_agenda_items" ADD CONSTRAINT "fk_audit_agenda_items__tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants" ("tenant_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_agenda_items" ADD CONSTRAINT "fk_audit_agenda_items__audit_id" FOREIGN KEY ("tenant_id", "audit_id") REFERENCES "audit"."audits" ("tenant_id", "audit_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_agenda_item_tests" ADD CONSTRAINT "fk_audit_agenda_item_tests__created_by_user_identity_id" FOREIGN KEY ("created_by_user_identity_id") REFERENCES "iam"."user_identities" ("user_identity_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_agenda_item_tests" ADD CONSTRAINT "fk_audit_agenda_item_tests__created_by_service_principal_id" FOREIGN KEY ("created_by_service_principal_id") REFERENCES "iam"."service_principals" ("service_principal_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_agenda_item_tests" ADD CONSTRAINT "fk_audit_agenda_item_tests__tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants" ("tenant_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_agenda_item_tests" ADD CONSTRAINT "fk_audit_agenda_item_tests__audit_agenda_item_id" FOREIGN KEY ("tenant_id", "audit_agenda_item_id") REFERENCES "audit"."audit_agenda_items" ("tenant_id", "audit_agenda_item_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_agenda_item_tests" ADD CONSTRAINT "fk_audit_agenda_item_tests__audit_test_id" FOREIGN KEY ("tenant_id", "audit_test_id") REFERENCES "audit"."audit_tests" ("tenant_id", "audit_test_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_agenda_item_scopes" ADD CONSTRAINT "fk_audit_agenda_item_scopes__created_by_user_identity_id" FOREIGN KEY ("created_by_user_identity_id") REFERENCES "iam"."user_identities" ("user_identity_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_agenda_item_scopes" ADD CONSTRAINT "fk_audit_agenda_item_scopes__created_by_service_principal_id" FOREIGN KEY ("created_by_service_principal_id") REFERENCES "iam"."service_principals" ("service_principal_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_agenda_item_scopes" ADD CONSTRAINT "fk_audit_agenda_item_scopes__tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants" ("tenant_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_agenda_item_scopes" ADD CONSTRAINT "fk_audit_agenda_item_scopes__audit_agenda_item_id" FOREIGN KEY ("tenant_id", "audit_agenda_item_id") REFERENCES "audit"."audit_agenda_items" ("tenant_id", "audit_agenda_item_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_agenda_item_scopes" ADD CONSTRAINT "fk_audit_agenda_item_scopes__audit_scope_id" FOREIGN KEY ("tenant_id", "audit_scope_id") REFERENCES "audit"."audit_scopes" ("tenant_id", "audit_scope_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_agenda_item_team_assignments" ADD CONSTRAINT "fk_audit_agenda_item_team_assignments__created_by_user_db16b56b" FOREIGN KEY ("created_by_user_identity_id") REFERENCES "iam"."user_identities" ("user_identity_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_agenda_item_team_assignments" ADD CONSTRAINT "fk_audit_agenda_item_team_assignments__created_by_serv_58a0791f" FOREIGN KEY ("created_by_service_principal_id") REFERENCES "iam"."service_principals" ("service_principal_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_agenda_item_team_assignments" ADD CONSTRAINT "fk_audit_agenda_item_team_assignments__tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants" ("tenant_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_agenda_item_team_assignments" ADD CONSTRAINT "fk_audit_agenda_item_team_assignments__audit_agenda_item_id" FOREIGN KEY ("tenant_id", "audit_agenda_item_id") REFERENCES "audit"."audit_agenda_items" ("tenant_id", "audit_agenda_item_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_agenda_item_team_assignments" ADD CONSTRAINT "fk_audit_agenda_item_team_assignments__audit_team_assignment_id" FOREIGN KEY ("tenant_id", "audit_team_assignment_id") REFERENCES "audit"."audit_team_assignments" ("tenant_id", "audit_team_assignment_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_test_requirement_links" ADD CONSTRAINT "fk_audit_test_requirement_links__created_by_user_identity_id" FOREIGN KEY ("created_by_user_identity_id") REFERENCES "iam"."user_identities" ("user_identity_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_test_requirement_links" ADD CONSTRAINT "fk_audit_test_requirement_links__created_by_service_pr_cb2abfac" FOREIGN KEY ("created_by_service_principal_id") REFERENCES "iam"."service_principals" ("service_principal_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_test_requirement_links" ADD CONSTRAINT "fk_audit_test_requirement_links__tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants" ("tenant_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_test_requirement_links" ADD CONSTRAINT "fk_audit_test_requirement_links__audit_test_id" FOREIGN KEY ("tenant_id", "audit_test_id") REFERENCES "audit"."audit_tests" ("tenant_id", "audit_test_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_test_requirement_links" ADD CONSTRAINT "fk_audit_test_requirement_links__requirement_id" FOREIGN KEY ("requirement_id") REFERENCES "regulatory"."requirements" ("requirement_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_test_requirement_links" ADD CONSTRAINT "fk_audit_test_requirement_links__requirement_crosswalk_6219b152" FOREIGN KEY ("requirement_crosswalk_mapping_id") REFERENCES "regulatory"."requirement_crosswalk_mappings" ("requirement_crosswalk_mapping_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_test_control_links" ADD CONSTRAINT "fk_audit_test_control_links__created_by_user_identity_id" FOREIGN KEY ("created_by_user_identity_id") REFERENCES "iam"."user_identities" ("user_identity_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_test_control_links" ADD CONSTRAINT "fk_audit_test_control_links__created_by_service_principal_id" FOREIGN KEY ("created_by_service_principal_id") REFERENCES "iam"."service_principals" ("service_principal_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_test_control_links" ADD CONSTRAINT "fk_audit_test_control_links__tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants" ("tenant_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_test_control_links" ADD CONSTRAINT "fk_audit_test_control_links__audit_test_id" FOREIGN KEY ("tenant_id", "audit_test_id") REFERENCES "audit"."audit_tests" ("tenant_id", "audit_test_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_test_control_links" ADD CONSTRAINT "fk_audit_test_control_links__control_id" FOREIGN KEY ("control_id") REFERENCES "controls"."controls" ("control_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_test_control_links" ADD CONSTRAINT "fk_audit_test_control_links__control_assessment_id" FOREIGN KEY ("tenant_id", "control_assessment_id") REFERENCES "controls"."control_assessments" ("tenant_id", "control_assessment_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_test_requirement_assessment_links" ADD CONSTRAINT "fk_audit_test_requirement_assessment_links__created_by_90ca27a1" FOREIGN KEY ("created_by_user_identity_id") REFERENCES "iam"."user_identities" ("user_identity_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_test_requirement_assessment_links" ADD CONSTRAINT "fk_audit_test_requirement_assessment_links__created_by_b55f1d5e" FOREIGN KEY ("created_by_service_principal_id") REFERENCES "iam"."service_principals" ("service_principal_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_test_requirement_assessment_links" ADD CONSTRAINT "fk_audit_test_requirement_assessment_links__tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants" ("tenant_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_test_requirement_assessment_links" ADD CONSTRAINT "fk_audit_test_requirement_assessment_links__audit_test_id" FOREIGN KEY ("tenant_id", "audit_test_id") REFERENCES "audit"."audit_tests" ("tenant_id", "audit_test_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_test_requirement_assessment_links" ADD CONSTRAINT "fk_audit_test_requirement_assessment_links__audit_test_b2858051" FOREIGN KEY ("tenant_id", "audit_test_requirement_link_id") REFERENCES "audit"."audit_test_requirement_links" ("tenant_id", "audit_test_requirement_link_id") ON UPDATE NO ACTION ON DELETE RESTRICT;
ALTER TABLE "audit"."audit_test_requirement_assessment_links" ADD CONSTRAINT "fk_audit_test_requirement_assessment_links__requiremen_b74dec10" FOREIGN KEY ("tenant_id", "requirement_assessment_id") REFERENCES "regulatory"."requirement_assessments" ("tenant_id", "requirement_assessment_id") ON UPDATE NO ACTION ON DELETE RESTRICT;

-- Integrity and authority-path indexes for the approved Audit amendment.

CREATE INDEX "ix_audit_objectives__created_by_user_identity_id" ON "audit"."audit_objectives" ("created_by_user_identity_id");
CREATE INDEX "ix_audit_objectives__created_by_service_principal_id" ON "audit"."audit_objectives" ("created_by_service_principal_id");
CREATE INDEX "ix_audit_objectives__updated_by_user_identity_id" ON "audit"."audit_objectives" ("updated_by_user_identity_id");
CREATE INDEX "ix_audit_objectives__updated_by_service_principal_id" ON "audit"."audit_objectives" ("updated_by_service_principal_id");
CREATE INDEX "ix_audit_objectives__tenant_id" ON "audit"."audit_objectives" ("tenant_id");
CREATE INDEX "ix_audit_objectives__audit_id" ON "audit"."audit_objectives" ("audit_id");
CREATE INDEX "ix_audit_criteria__created_by_user_identity_id" ON "audit"."audit_criteria" ("created_by_user_identity_id");
CREATE INDEX "ix_audit_criteria__created_by_service_principal_id" ON "audit"."audit_criteria" ("created_by_service_principal_id");
CREATE INDEX "ix_audit_criteria__updated_by_user_identity_id" ON "audit"."audit_criteria" ("updated_by_user_identity_id");
CREATE INDEX "ix_audit_criteria__updated_by_service_principal_id" ON "audit"."audit_criteria" ("updated_by_service_principal_id");
CREATE INDEX "ix_audit_criteria__tenant_id" ON "audit"."audit_criteria" ("tenant_id");
CREATE INDEX "ix_audit_criteria__audit_id" ON "audit"."audit_criteria" ("audit_id");
CREATE INDEX "ix_audit_criteria__framework_version_id" ON "audit"."audit_criteria" ("framework_version_id");
CREATE INDEX "ix_audit_criteria__requirement_id" ON "audit"."audit_criteria" ("requirement_id");
CREATE INDEX "ix_audit_scopes__created_by_user_identity_id" ON "audit"."audit_scopes" ("created_by_user_identity_id");
CREATE INDEX "ix_audit_scopes__created_by_service_principal_id" ON "audit"."audit_scopes" ("created_by_service_principal_id");
CREATE INDEX "ix_audit_scopes__updated_by_user_identity_id" ON "audit"."audit_scopes" ("updated_by_user_identity_id");
CREATE INDEX "ix_audit_scopes__updated_by_service_principal_id" ON "audit"."audit_scopes" ("updated_by_service_principal_id");
CREATE INDEX "ix_audit_scopes__tenant_id" ON "audit"."audit_scopes" ("tenant_id");
CREATE INDEX "ix_audit_scopes__audit_id" ON "audit"."audit_scopes" ("audit_id");
CREATE INDEX "ix_audit_scopes__framework_version_id" ON "audit"."audit_scopes" ("framework_version_id");
CREATE INDEX "ix_audit_scopes__subject_id" ON "audit"."audit_scopes" ("subject_id");
CREATE INDEX "ix_audit_team_assignments__created_by_user_identity_id" ON "audit"."audit_team_assignments" ("created_by_user_identity_id");
CREATE INDEX "ix_audit_team_assignments__created_by_service_principal_id" ON "audit"."audit_team_assignments" ("created_by_service_principal_id");
CREATE INDEX "ix_audit_team_assignments__updated_by_user_identity_id" ON "audit"."audit_team_assignments" ("updated_by_user_identity_id");
CREATE INDEX "ix_audit_team_assignments__updated_by_service_principal_id" ON "audit"."audit_team_assignments" ("updated_by_service_principal_id");
CREATE INDEX "ix_audit_team_assignments__tenant_id" ON "audit"."audit_team_assignments" ("tenant_id");
CREATE INDEX "ix_audit_team_assignments__audit_id" ON "audit"."audit_team_assignments" ("audit_id");
CREATE INDEX "ix_audit_team_assignments__membership_id" ON "audit"."audit_team_assignments" ("membership_id");
CREATE INDEX "ix_audit_competencies__created_by_user_identity_id" ON "audit"."audit_competencies" ("created_by_user_identity_id");
CREATE INDEX "ix_audit_competencies__created_by_service_principal_id" ON "audit"."audit_competencies" ("created_by_service_principal_id");
CREATE INDEX "ix_auditor_competency_assertions__created_by_user_identity_id" ON "audit"."auditor_competency_assertions" ("created_by_user_identity_id");
CREATE INDEX "ix_auditor_competency_assertions__created_by_service_p_70db5cc1" ON "audit"."auditor_competency_assertions" ("created_by_service_principal_id");
CREATE INDEX "ix_auditor_competency_assertions__tenant_id" ON "audit"."auditor_competency_assertions" ("tenant_id");
CREATE INDEX "ix_auditor_competency_assertions__membership_id" ON "audit"."auditor_competency_assertions" ("membership_id");
CREATE INDEX "ix_auditor_competency_assertions__audit_competency_id" ON "audit"."auditor_competency_assertions" ("audit_competency_id");
CREATE INDEX "ix_auditor_competency_assertions__evidence_version_id" ON "audit"."auditor_competency_assertions" ("evidence_version_id");
CREATE INDEX "ix_auditor_competency_assertions__verified_by_membership_id" ON "audit"."auditor_competency_assertions" ("verified_by_membership_id");
CREATE INDEX "ix_auditor_competency_assertions__superseded_by_id" ON "audit"."auditor_competency_assertions" ("superseded_by_id");
CREATE INDEX "ix_audit_competency_requirements__created_by_user_identity_id" ON "audit"."audit_competency_requirements" ("created_by_user_identity_id");
CREATE INDEX "ix_audit_competency_requirements__created_by_service_p_7117db8a" ON "audit"."audit_competency_requirements" ("created_by_service_principal_id");
CREATE INDEX "ix_audit_competency_requirements__tenant_id" ON "audit"."audit_competency_requirements" ("tenant_id");
CREATE INDEX "ix_audit_competency_requirements__audit_id" ON "audit"."audit_competency_requirements" ("audit_id");
CREATE INDEX "ix_audit_competency_requirements__framework_version_id" ON "audit"."audit_competency_requirements" ("framework_version_id");
CREATE INDEX "ix_audit_competency_requirements__audit_competency_id" ON "audit"."audit_competency_requirements" ("audit_competency_id");
CREATE INDEX "ix_audit_competency_validations__created_by_user_identity_id" ON "audit"."audit_competency_validations" ("created_by_user_identity_id");
CREATE INDEX "ix_audit_competency_validations__created_by_service_pr_ea2b663f" ON "audit"."audit_competency_validations" ("created_by_service_principal_id");
CREATE INDEX "ix_audit_competency_validations__tenant_id" ON "audit"."audit_competency_validations" ("tenant_id");
CREATE INDEX "ix_audit_competency_validations__audit_competency_requ_6a90cdae" ON "audit"."audit_competency_validations" ("audit_competency_requirement_id");
CREATE INDEX "ix_audit_competency_validations__audit_team_assignment_id" ON "audit"."audit_competency_validations" ("audit_team_assignment_id");
CREATE INDEX "ix_audit_competency_validations__auditor_competency_as_6a6743eb" ON "audit"."audit_competency_validations" ("auditor_competency_assertion_id");
CREATE INDEX "ix_audit_competency_validations__validated_by_membership_id" ON "audit"."audit_competency_validations" ("validated_by_membership_id");
CREATE INDEX "ix_audit_agenda_items__created_by_user_identity_id" ON "audit"."audit_agenda_items" ("created_by_user_identity_id");
CREATE INDEX "ix_audit_agenda_items__created_by_service_principal_id" ON "audit"."audit_agenda_items" ("created_by_service_principal_id");
CREATE INDEX "ix_audit_agenda_items__updated_by_user_identity_id" ON "audit"."audit_agenda_items" ("updated_by_user_identity_id");
CREATE INDEX "ix_audit_agenda_items__updated_by_service_principal_id" ON "audit"."audit_agenda_items" ("updated_by_service_principal_id");
CREATE INDEX "ix_audit_agenda_items__tenant_id" ON "audit"."audit_agenda_items" ("tenant_id");
CREATE INDEX "ix_audit_agenda_items__audit_id" ON "audit"."audit_agenda_items" ("audit_id");
CREATE INDEX "ix_audit_agenda_item_tests__created_by_user_identity_id" ON "audit"."audit_agenda_item_tests" ("created_by_user_identity_id");
CREATE INDEX "ix_audit_agenda_item_tests__created_by_service_principal_id" ON "audit"."audit_agenda_item_tests" ("created_by_service_principal_id");
CREATE INDEX "ix_audit_agenda_item_tests__tenant_id" ON "audit"."audit_agenda_item_tests" ("tenant_id");
CREATE INDEX "ix_audit_agenda_item_tests__audit_agenda_item_id" ON "audit"."audit_agenda_item_tests" ("audit_agenda_item_id");
CREATE INDEX "ix_audit_agenda_item_tests__audit_test_id" ON "audit"."audit_agenda_item_tests" ("audit_test_id");
CREATE INDEX "ix_audit_agenda_item_scopes__created_by_user_identity_id" ON "audit"."audit_agenda_item_scopes" ("created_by_user_identity_id");
CREATE INDEX "ix_audit_agenda_item_scopes__created_by_service_principal_id" ON "audit"."audit_agenda_item_scopes" ("created_by_service_principal_id");
CREATE INDEX "ix_audit_agenda_item_scopes__tenant_id" ON "audit"."audit_agenda_item_scopes" ("tenant_id");
CREATE INDEX "ix_audit_agenda_item_scopes__audit_agenda_item_id" ON "audit"."audit_agenda_item_scopes" ("audit_agenda_item_id");
CREATE INDEX "ix_audit_agenda_item_scopes__audit_scope_id" ON "audit"."audit_agenda_item_scopes" ("audit_scope_id");
CREATE INDEX "ix_audit_agenda_item_team_assignments__created_by_user_0df50ac5" ON "audit"."audit_agenda_item_team_assignments" ("created_by_user_identity_id");
CREATE INDEX "ix_audit_agenda_item_team_assignments__created_by_serv_ca21cdf4" ON "audit"."audit_agenda_item_team_assignments" ("created_by_service_principal_id");
CREATE INDEX "ix_audit_agenda_item_team_assignments__tenant_id" ON "audit"."audit_agenda_item_team_assignments" ("tenant_id");
CREATE INDEX "ix_audit_agenda_item_team_assignments__audit_agenda_item_id" ON "audit"."audit_agenda_item_team_assignments" ("audit_agenda_item_id");
CREATE INDEX "ix_audit_agenda_item_team_assignments__audit_team_assignment_id" ON "audit"."audit_agenda_item_team_assignments" ("audit_team_assignment_id");
CREATE INDEX "ix_audit_test_requirement_links__created_by_user_identity_id" ON "audit"."audit_test_requirement_links" ("created_by_user_identity_id");
CREATE INDEX "ix_audit_test_requirement_links__created_by_service_pr_4087d17f" ON "audit"."audit_test_requirement_links" ("created_by_service_principal_id");
CREATE INDEX "ix_audit_test_requirement_links__tenant_id" ON "audit"."audit_test_requirement_links" ("tenant_id");
CREATE INDEX "ix_audit_test_requirement_links__audit_test_id" ON "audit"."audit_test_requirement_links" ("audit_test_id");
CREATE INDEX "ix_audit_test_requirement_links__requirement_id" ON "audit"."audit_test_requirement_links" ("requirement_id");
CREATE INDEX "ix_audit_test_requirement_links__requirement_crosswalk_408bde25" ON "audit"."audit_test_requirement_links" ("requirement_crosswalk_mapping_id");
CREATE INDEX "ix_audit_test_control_links__created_by_user_identity_id" ON "audit"."audit_test_control_links" ("created_by_user_identity_id");
CREATE INDEX "ix_audit_test_control_links__created_by_service_principal_id" ON "audit"."audit_test_control_links" ("created_by_service_principal_id");
CREATE INDEX "ix_audit_test_control_links__tenant_id" ON "audit"."audit_test_control_links" ("tenant_id");
CREATE INDEX "ix_audit_test_control_links__audit_test_id" ON "audit"."audit_test_control_links" ("audit_test_id");
CREATE INDEX "ix_audit_test_control_links__control_id" ON "audit"."audit_test_control_links" ("control_id");
CREATE INDEX "ix_audit_test_control_links__control_assessment_id" ON "audit"."audit_test_control_links" ("control_assessment_id");
CREATE INDEX "ix_audit_test_requirement_assessment_links__created_by_ebb768dc" ON "audit"."audit_test_requirement_assessment_links" ("created_by_user_identity_id");
CREATE INDEX "ix_audit_test_requirement_assessment_links__created_by_f5ca46d4" ON "audit"."audit_test_requirement_assessment_links" ("created_by_service_principal_id");
CREATE INDEX "ix_audit_test_requirement_assessment_links__tenant_id" ON "audit"."audit_test_requirement_assessment_links" ("tenant_id");
CREATE INDEX "ix_audit_test_requirement_assessment_links__audit_test_id" ON "audit"."audit_test_requirement_assessment_links" ("audit_test_id");
CREATE INDEX "ix_audit_test_requirement_assessment_links__audit_test_fb5dbd78" ON "audit"."audit_test_requirement_assessment_links" ("audit_test_requirement_link_id");
CREATE INDEX "ix_audit_test_requirement_assessment_links__requiremen_ae28908c" ON "audit"."audit_test_requirement_assessment_links" ("requirement_assessment_id");
CREATE INDEX "ix_audit_criteria__audit_framework_requirement" ON "audit"."audit_criteria" ("audit_id", "framework_version_id", "requirement_id");
CREATE INDEX "ix_audit_scopes__audit_framework_subject" ON "audit"."audit_scopes" ("audit_id", "framework_version_id", "subject_id");
CREATE INDEX "ix_audit_team_assignments__audit_state_role" ON "audit"."audit_team_assignments" ("audit_id", "lifecycle_state", "team_role");
CREATE INDEX "ix_auditor_competency_assertions__validity" ON "audit"."auditor_competency_assertions" ("tenant_id", "membership_id", "audit_competency_id", "valid_from", "valid_to");
CREATE INDEX "ix_audit_agenda_items__range" ON "audit"."audit_agenda_items" ("audit_id", "starts_at", "ends_at");
CREATE UNIQUE INDEX "uq_audit_criteria__framework_row" ON "audit"."audit_criteria" ("audit_id", "framework_version_id") WHERE "criterion_kind" = 'framework_version';
CREATE UNIQUE INDEX "uq_audit_criteria__requirement_row" ON "audit"."audit_criteria" ("audit_id", "requirement_id") WHERE "criterion_kind" = 'requirement';
CREATE UNIQUE INDEX "uq_audit_team_assignments__active_lead" ON "audit"."audit_team_assignments" ("audit_id") WHERE "team_role" = 'lead_auditor' AND "assigned_to" IS NULL AND "lifecycle_state" = 'active';
CREATE UNIQUE INDEX "uq_audit_test_requirement_links__anchor" ON "audit"."audit_test_requirement_links" ("audit_test_id") WHERE "is_anchor";
CREATE UNIQUE INDEX "uq_audit_test_control_links__control" ON "audit"."audit_test_control_links" ("audit_test_id", "control_id", "link_role") WHERE "control_id" IS NOT NULL;
CREATE UNIQUE INDEX "uq_audit_test_control_links__assessment" ON "audit"."audit_test_control_links" ("audit_test_id", "control_assessment_id", "link_role") WHERE "control_assessment_id" IS NOT NULL;

-- Cross-row and cross-authority invariants for the approved integrated Audit model.
CREATE FUNCTION "audit"."enforce_plan_mutable"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE parent_audit_id uuid; parent_state varchar(32);
BEGIN
  parent_audit_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.audit_id ELSE NEW.audit_id END;
  SELECT lifecycle_state INTO parent_state FROM audit.audits WHERE audit_id = parent_audit_id FOR KEY SHARE;
  IF parent_state NOT IN ('draft','planned') THEN
    RAISE EXCEPTION 'AUDIT_PLAN_IMMUTABLE_AFTER_APPROVAL';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;

CREATE FUNCTION "audit"."validate_criterion"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE requirement_framework uuid; framework_count integer;
BEGIN
  IF NEW.requirement_id IS NOT NULL THEN
    SELECT framework_version_id INTO requirement_framework FROM regulatory.requirements WHERE requirement_id = NEW.requirement_id;
    IF requirement_framework IS DISTINCT FROM NEW.framework_version_id THEN
      RAISE EXCEPTION 'AUDIT_REQUIREMENT_FRAMEWORK_MISMATCH';
    END IF;
  END IF;
  SELECT count(DISTINCT framework_version_id) INTO framework_count
    FROM audit.audit_criteria
   WHERE audit_id = NEW.audit_id AND audit_criterion_id <> NEW.audit_criterion_id;
  IF NOT EXISTS (SELECT 1 FROM audit.audit_criteria WHERE audit_id = NEW.audit_id AND audit_criterion_id <> NEW.audit_criterion_id AND framework_version_id = NEW.framework_version_id)
     AND framework_count >= 3 THEN
    RAISE EXCEPTION 'AUDIT_FRAMEWORK_VERSION_LIMIT_EXCEEDED';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION "audit"."validate_scope"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM audit.audit_criteria WHERE audit_id = NEW.audit_id AND framework_version_id = NEW.framework_version_id) THEN
    RAISE EXCEPTION 'AUDIT_SCOPE_FRAMEWORK_NOT_SELECTED';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION "audit"."validate_team_assignment"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE member_state varchar(32); joined timestamptz; ended timestamptz;
BEGIN
  SELECT membership_state, joined_at, ended_at INTO member_state, joined, ended
    FROM iam.tenant_memberships
   WHERE tenant_id = NEW.tenant_id AND tenant_membership_id = NEW.membership_id FOR KEY SHARE;
  IF member_state IS DISTINCT FROM 'active' OR NEW.assigned_from < joined OR (ended IS NOT NULL AND (NEW.assigned_to IS NULL OR NEW.assigned_to > ended)) THEN
    RAISE EXCEPTION 'AUDIT_TEAM_MEMBERSHIP_NOT_ACTIVE_FOR_INTERVAL';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION "audit"."validate_competency_requirement"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM audit.audit_criteria WHERE audit_id = NEW.audit_id AND framework_version_id = NEW.framework_version_id) THEN
    RAISE EXCEPTION 'AUDIT_COMPETENCY_FRAMEWORK_NOT_SELECTED';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION "audit"."validate_competency_validation"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE req audit.audit_competency_requirements%ROWTYPE; assignment audit.audit_team_assignments%ROWTYPE;
        assertion audit.auditor_competency_assertions%ROWTYPE; audit_row audit.audits%ROWTYPE;
BEGIN
  SELECT * INTO req FROM audit.audit_competency_requirements WHERE tenant_id = NEW.tenant_id AND audit_competency_requirement_id = NEW.audit_competency_requirement_id FOR KEY SHARE;
  SELECT * INTO assignment FROM audit.audit_team_assignments WHERE tenant_id = NEW.tenant_id AND audit_team_assignment_id = NEW.audit_team_assignment_id FOR KEY SHARE;
  IF req.audit_id IS DISTINCT FROM assignment.audit_id OR req.team_role IS DISTINCT FROM assignment.team_role THEN
    RAISE EXCEPTION 'AUDIT_COMPETENCY_ASSIGNMENT_MISMATCH';
  END IF;
  IF NEW.auditor_competency_assertion_id IS NOT NULL THEN
    SELECT * INTO assertion FROM audit.auditor_competency_assertions WHERE tenant_id = NEW.tenant_id AND auditor_competency_assertion_id = NEW.auditor_competency_assertion_id FOR KEY SHARE;
    SELECT * INTO audit_row FROM audit.audits WHERE tenant_id = NEW.tenant_id AND audit_id = req.audit_id FOR KEY SHARE;
    IF assertion.membership_id IS DISTINCT FROM assignment.membership_id
       OR assertion.audit_competency_id IS DISTINCT FROM req.audit_competency_id
       OR assertion.assertion_status IS DISTINCT FROM 'verified'
       OR assertion.valid_from > NEW.validated_at
       OR (assertion.valid_to IS NOT NULL AND assertion.valid_to < NEW.validated_at)
       OR (audit_row.planned_start IS NOT NULL AND assertion.valid_from::date > audit_row.planned_start)
       OR (audit_row.planned_end IS NOT NULL AND assertion.valid_to IS NOT NULL AND assertion.valid_to::date < audit_row.planned_end) THEN
      RAISE EXCEPTION 'AUDIT_COMPETENCY_ASSERTION_NOT_EFFECTIVE';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION "audit"."validate_agenda_test_link"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE agenda_audit uuid; test_audit uuid;
BEGIN
  SELECT audit_id INTO agenda_audit FROM audit.audit_agenda_items WHERE tenant_id = NEW.tenant_id AND audit_agenda_item_id = NEW.audit_agenda_item_id;
  SELECT w.audit_id INTO test_audit FROM audit.audit_tests t JOIN audit.audit_workpapers w ON w.tenant_id = t.tenant_id AND w.audit_workpaper_id = t.audit_workpaper_id
   WHERE t.tenant_id = NEW.tenant_id AND t.audit_test_id = NEW.audit_test_id;
  IF agenda_audit IS DISTINCT FROM test_audit THEN RAISE EXCEPTION 'AUDIT_AGENDA_TEST_DIFFERENT_AUDIT'; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION "audit"."validate_agenda_scope_link"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM audit.audit_agenda_items i JOIN audit.audit_scopes s ON s.tenant_id = i.tenant_id AND s.audit_id = i.audit_id
     WHERE i.tenant_id = NEW.tenant_id AND i.audit_agenda_item_id = NEW.audit_agenda_item_id AND s.audit_scope_id = NEW.audit_scope_id
  ) THEN RAISE EXCEPTION 'AUDIT_AGENDA_SCOPE_DIFFERENT_AUDIT'; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION "audit"."validate_agenda_team_link"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM audit.audit_agenda_items i JOIN audit.audit_team_assignments a ON a.tenant_id = i.tenant_id AND a.audit_id = i.audit_id
     WHERE i.tenant_id = NEW.tenant_id AND i.audit_agenda_item_id = NEW.audit_agenda_item_id
       AND a.audit_team_assignment_id = NEW.audit_team_assignment_id AND a.assigned_from <= i.starts_at
       AND (a.assigned_to IS NULL OR a.assigned_to >= i.ends_at)
  ) THEN RAISE EXCEPTION 'AUDIT_AGENDA_TEAM_NOT_EFFECTIVE'; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION "audit"."validate_test_requirement_link"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE test_audit uuid; target_framework uuid; anchor_requirement uuid; anchor_framework uuid;
BEGIN
  SELECT w.audit_id INTO test_audit FROM audit.audit_tests t JOIN audit.audit_workpapers w ON w.tenant_id = t.tenant_id AND w.audit_workpaper_id = t.audit_workpaper_id
   WHERE t.tenant_id = NEW.tenant_id AND t.audit_test_id = NEW.audit_test_id;
  SELECT framework_version_id INTO target_framework FROM regulatory.requirements WHERE requirement_id = NEW.requirement_id;
  IF NOT EXISTS (SELECT 1 FROM audit.audit_criteria WHERE tenant_id = NEW.tenant_id AND audit_id = test_audit AND requirement_id = NEW.requirement_id) THEN
    RAISE EXCEPTION 'AUDIT_TEST_REQUIREMENT_NOT_SELECTED_CRITERION';
  END IF;
  IF NEW.is_anchor THEN RETURN NEW; END IF;
  SELECT l.requirement_id, r.framework_version_id INTO anchor_requirement, anchor_framework
    FROM audit.audit_test_requirement_links l JOIN regulatory.requirements r ON r.requirement_id = l.requirement_id
   WHERE l.tenant_id = NEW.tenant_id AND l.audit_test_id = NEW.audit_test_id AND l.is_anchor;
  IF anchor_requirement IS NULL THEN RAISE EXCEPTION 'AUDIT_TEST_ANCHOR_REQUIRED_FIRST'; END IF;
  IF anchor_framework = target_framework THEN
    IF NEW.requirement_crosswalk_mapping_id IS NOT NULL THEN RAISE EXCEPTION 'AUDIT_TEST_SAME_FRAMEWORK_CROSSWALK_FORBIDDEN'; END IF;
  ELSIF NEW.requirement_crosswalk_mapping_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM regulatory.requirement_crosswalk_mappings m
    JOIN regulatory.framework_crosswalks x ON x.framework_crosswalk_id = m.framework_crosswalk_id
    WHERE m.requirement_crosswalk_mapping_id = NEW.requirement_crosswalk_mapping_id
      AND m.mapping_status = 'approved'
      AND m.relationship_type IN ('equivalent','partially_equivalent','overlaps','supports')
      AND ((m.source_requirement_id = anchor_requirement AND m.target_requirement_id = NEW.requirement_id)
        OR (m.target_requirement_id = anchor_requirement AND m.source_requirement_id = NEW.requirement_id))
      AND x.lifecycle_state IN ('approved','published')
      AND (x.effective_from IS NULL OR x.effective_from <= CURRENT_TIMESTAMP)
      AND (x.effective_to IS NULL OR x.effective_to > CURRENT_TIMESTAMP)
  ) THEN
    RAISE EXCEPTION 'AUDIT_TEST_APPROVED_EFFECTIVE_CROSSWALK_REQUIRED';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION "audit"."validate_test_control_link"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE target_tenant uuid; target_origin varchar(32);
BEGIN
  IF NEW.control_id IS NOT NULL THEN
    SELECT tenant_id, control_origin INTO target_tenant, target_origin FROM controls.controls WHERE control_id = NEW.control_id;
    IF target_tenant IS DISTINCT FROM NEW.tenant_id OR target_origin NOT IN ('tenant_instantiated','tenant_defined') THEN
      RAISE EXCEPTION 'AUDIT_TEST_CONTROL_MUST_BE_TENANT_IMPLEMENTATION';
    END IF;
  ELSE
    SELECT tenant_id INTO target_tenant FROM controls.control_assessments WHERE control_assessment_id = NEW.control_assessment_id;
    IF target_tenant IS DISTINCT FROM NEW.tenant_id THEN RAISE EXCEPTION 'AUDIT_TEST_CONTROL_ASSESSMENT_TENANT_MISMATCH'; END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION "audit"."validate_test_requirement_assessment_link"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE linked_test uuid; linked_requirement uuid; assessed_requirement uuid;
BEGIN
  SELECT audit_test_id, requirement_id INTO linked_test, linked_requirement
    FROM audit.audit_test_requirement_links WHERE tenant_id = NEW.tenant_id AND audit_test_requirement_link_id = NEW.audit_test_requirement_link_id;
  SELECT a.requirement_id INTO assessed_requirement
    FROM regulatory.requirement_assessments r JOIN regulatory.requirement_applicabilities a
      ON a.tenant_id = r.tenant_id AND a.requirement_applicability_id = r.requirement_applicability_id
   WHERE r.tenant_id = NEW.tenant_id AND r.requirement_assessment_id = NEW.requirement_assessment_id;
  IF linked_test IS DISTINCT FROM NEW.audit_test_id OR linked_requirement IS DISTINCT FROM assessed_requirement THEN
    RAISE EXCEPTION 'AUDIT_TEST_REQUIREMENT_ASSESSMENT_LINEAGE_MISMATCH';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION "audit"."validate_audit_approval"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE framework_count integer;
BEGIN
  IF NEW.lifecycle_state = 'approved' AND OLD.lifecycle_state IS DISTINCT FROM 'approved' THEN
    SELECT count(DISTINCT framework_version_id) INTO framework_count FROM audit.audit_criteria WHERE tenant_id = NEW.tenant_id AND audit_id = NEW.audit_id;
    IF framework_count NOT BETWEEN 1 AND 3
       OR NOT EXISTS (SELECT 1 FROM audit.audit_objectives WHERE tenant_id = NEW.tenant_id AND audit_id = NEW.audit_id)
       OR NOT EXISTS (SELECT 1 FROM audit.audit_scopes WHERE tenant_id = NEW.tenant_id AND audit_id = NEW.audit_id)
       OR (SELECT count(*) FROM audit.audit_team_assignments WHERE tenant_id = NEW.tenant_id AND audit_id = NEW.audit_id AND team_role = 'lead_auditor' AND assigned_to IS NULL AND lifecycle_state = 'active') <> 1
       OR NOT EXISTS (SELECT 1 FROM audit.audit_competency_requirements WHERE tenant_id = NEW.tenant_id AND audit_id = NEW.audit_id)
       OR EXISTS (
         SELECT 1 FROM audit.audit_competency_requirements r WHERE r.tenant_id = NEW.tenant_id AND r.audit_id = NEW.audit_id
          AND NOT EXISTS (SELECT 1 FROM audit.audit_competency_validations v WHERE v.tenant_id = r.tenant_id AND v.audit_competency_requirement_id = r.audit_competency_requirement_id AND v.validation_outcome = 'covered')
       )
       OR NOT EXISTS (SELECT 1 FROM audit.audit_agenda_items WHERE tenant_id = NEW.tenant_id AND audit_id = NEW.audit_id)
       OR EXISTS (
         SELECT 1 FROM audit.audit_agenda_items i WHERE i.tenant_id = NEW.tenant_id AND i.audit_id = NEW.audit_id
          AND (NOT EXISTS (SELECT 1 FROM audit.audit_agenda_item_scopes s WHERE s.tenant_id = i.tenant_id AND s.audit_agenda_item_id = i.audit_agenda_item_id)
            OR NOT EXISTS (SELECT 1 FROM audit.audit_agenda_item_team_assignments t WHERE t.tenant_id = i.tenant_id AND t.audit_agenda_item_id = i.audit_agenda_item_id))
       ) THEN
      RAISE EXCEPTION 'AUDIT_APPROVAL_PRECONDITIONS_NOT_MET';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER "trg_audit_objectives_plan_mutable" BEFORE INSERT OR UPDATE OR DELETE ON "audit"."audit_objectives" FOR EACH ROW EXECUTE FUNCTION "audit"."enforce_plan_mutable"();
CREATE TRIGGER "trg_audit_criteria_plan_mutable" BEFORE INSERT OR UPDATE OR DELETE ON "audit"."audit_criteria" FOR EACH ROW EXECUTE FUNCTION "audit"."enforce_plan_mutable"();
CREATE TRIGGER "trg_audit_scopes_plan_mutable" BEFORE INSERT OR UPDATE OR DELETE ON "audit"."audit_scopes" FOR EACH ROW EXECUTE FUNCTION "audit"."enforce_plan_mutable"();
CREATE TRIGGER "trg_audit_team_plan_mutable" BEFORE INSERT OR UPDATE OR DELETE ON "audit"."audit_team_assignments" FOR EACH ROW EXECUTE FUNCTION "audit"."enforce_plan_mutable"();
CREATE TRIGGER "trg_audit_agenda_plan_mutable" BEFORE INSERT OR UPDATE OR DELETE ON "audit"."audit_agenda_items" FOR EACH ROW EXECUTE FUNCTION "audit"."enforce_plan_mutable"();
CREATE TRIGGER "trg_audit_criteria_validate" BEFORE INSERT OR UPDATE ON "audit"."audit_criteria" FOR EACH ROW EXECUTE FUNCTION "audit"."validate_criterion"();
CREATE TRIGGER "trg_audit_scopes_validate" BEFORE INSERT OR UPDATE ON "audit"."audit_scopes" FOR EACH ROW EXECUTE FUNCTION "audit"."validate_scope"();
CREATE TRIGGER "trg_audit_team_validate" BEFORE INSERT OR UPDATE ON "audit"."audit_team_assignments" FOR EACH ROW EXECUTE FUNCTION "audit"."validate_team_assignment"();
CREATE TRIGGER "trg_audit_competency_requirement_validate" BEFORE INSERT ON "audit"."audit_competency_requirements" FOR EACH ROW EXECUTE FUNCTION "audit"."validate_competency_requirement"();
CREATE TRIGGER "trg_audit_competency_validation_validate" BEFORE INSERT ON "audit"."audit_competency_validations" FOR EACH ROW EXECUTE FUNCTION "audit"."validate_competency_validation"();
CREATE TRIGGER "trg_audit_agenda_test_validate" BEFORE INSERT ON "audit"."audit_agenda_item_tests" FOR EACH ROW EXECUTE FUNCTION "audit"."validate_agenda_test_link"();
CREATE TRIGGER "trg_audit_agenda_scope_validate" BEFORE INSERT ON "audit"."audit_agenda_item_scopes" FOR EACH ROW EXECUTE FUNCTION "audit"."validate_agenda_scope_link"();
CREATE TRIGGER "trg_audit_agenda_team_validate" BEFORE INSERT ON "audit"."audit_agenda_item_team_assignments" FOR EACH ROW EXECUTE FUNCTION "audit"."validate_agenda_team_link"();
CREATE TRIGGER "trg_audit_test_requirement_validate" BEFORE INSERT ON "audit"."audit_test_requirement_links" FOR EACH ROW EXECUTE FUNCTION "audit"."validate_test_requirement_link"();
CREATE TRIGGER "trg_audit_test_control_validate" BEFORE INSERT ON "audit"."audit_test_control_links" FOR EACH ROW EXECUTE FUNCTION "audit"."validate_test_control_link"();
CREATE TRIGGER "trg_audit_test_requirement_assessment_validate" BEFORE INSERT ON "audit"."audit_test_requirement_assessment_links" FOR EACH ROW EXECUTE FUNCTION "audit"."validate_test_requirement_assessment_link"();
CREATE TRIGGER "trg_audits_integrated_approval_validate" BEFORE UPDATE OF "lifecycle_state" ON "audit"."audits" FOR EACH ROW EXECUTE FUNCTION "audit"."validate_audit_approval"();

DROP INDEX "audit"."ix_audits__lead_membership_id";
ALTER TABLE "audit"."audits" DROP COLUMN "scope_text", DROP COLUMN "lead_membership_id";

DO $$
DECLARE physical_table_count integer;
BEGIN
  SELECT count(*) INTO physical_table_count FROM pg_catalog.pg_tables WHERE schemaname = ANY (ARRAY['platform', 'iam', 'org', 'regulatory', 'controls', 'evidence', 'remediation', 'risk', 'audit', 'operations', 'third_party', 'resilience', 'privacy', 'survey', 'data', 'config', 'rules', 'integration', 'reporting', 'knowledge', 'ai', 'notification', 'ops_audit']) AND NOT (schemaname = 'platform' AND tablename = 'schema_migrations');
  IF physical_table_count <> 229 THEN RAISE EXCEPTION 'AUDIT_AMENDMENT_POSTCONDITION_TABLE_COUNT_FAILED: %', physical_table_count; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'audit' AND table_name = 'audits' AND column_name IN ('scope_text','lead_membership_id')) THEN
    RAISE EXCEPTION 'AUDIT_AMENDMENT_POSTCONDITION_DUAL_AUTHORITY';
  END IF;
END $$;
