-- Generated mechanically from docs/physical-data-model/01_PHYSICAL_DATA_MODEL.md.
-- PostgreSQL 16; the approved physical model remains authority.

CREATE TABLE "platform"."tenants" (
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_code" varchar(64) NOT NULL,
  "legal_name" text NOT NULL,
  "display_name" text NOT NULL,
  "default_timezone" varchar(64) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "data_classification" varchar(32) NOT NULL,
  CONSTRAINT "pk_tenants" PRIMARY KEY ("tenant_id")
);

CREATE TABLE "platform"."organizations" (
  "organization_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "organization_code" varchar(64) NOT NULL,
  "legal_name" text NOT NULL,
  "display_name" text NOT NULL,
  "country_code" char(2),
  "lifecycle_state" varchar(32) NOT NULL,
  CONSTRAINT "pk_organizations" PRIMARY KEY ("organization_id")
);

CREATE TABLE "platform"."plans" (
  "plan_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "plan_code" varchar(64) NOT NULL,
  "name" varchar(255) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  CONSTRAINT "pk_plans" PRIMARY KEY ("plan_id")
);

CREATE TABLE "platform"."plan_versions" (
  "plan_version_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "version_number" bigint NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  "published_at" timestamptz,
  "superseded_by_id" uuid,
  "plan_id" uuid NOT NULL,
  "display_name" text NOT NULL,
  "commercial_terms_ref" text,
  CONSTRAINT "pk_plan_versions" PRIMARY KEY ("plan_version_id")
);

CREATE TABLE "platform"."capabilities" (
  "capability_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "capability_code" varchar(96) NOT NULL,
  "capability_group" varchar(64) NOT NULL,
  "name" text NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  CONSTRAINT "pk_capabilities" PRIMARY KEY ("capability_id")
);

CREATE TABLE "platform"."entitlements" (
  "entitlement_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "plan_version_id" uuid NOT NULL,
  "capability_id" uuid NOT NULL,
  "is_enabled" boolean NOT NULL DEFAULT false,
  CONSTRAINT "pk_entitlements" PRIMARY KEY ("entitlement_id")
);

CREATE TABLE "platform"."subscriptions" (
  "subscription_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "plan_version_id" uuid NOT NULL,
  "subscription_code" varchar(96) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "starts_at" timestamptz NOT NULL,
  "ends_at" timestamptz,
  "cancelled_at" timestamptz,
  CONSTRAINT "pk_subscriptions" PRIMARY KEY ("subscription_id")
);

CREATE TABLE "platform"."usage_limits" (
  "usage_limit_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "plan_version_id" uuid NOT NULL,
  "limit_code" varchar(96) NOT NULL,
  "limit_value" numeric(30,10) NOT NULL,
  "unit" varchar(64) NOT NULL,
  "effective_from" timestamptz NOT NULL,
  "effective_to" timestamptz,
  CONSTRAINT "pk_usage_limits" PRIMARY KEY ("usage_limit_id")
);

CREATE TABLE "platform"."feature_flags" (
  "feature_flag_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "flag_code" varchar(96) NOT NULL,
  "enabled" boolean NOT NULL DEFAULT false,
  "rollout_scope" varchar(32) NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  CONSTRAINT "pk_feature_flags" PRIMARY KEY ("feature_flag_id")
);

CREATE TABLE "iam"."user_identities" (
  "user_identity_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "identity_key" varchar(255) NOT NULL,
  "display_name" text NOT NULL,
  "email_normalized" text,
  "lifecycle_state" varchar(32) NOT NULL,
  "last_authenticated_at" timestamptz,
  CONSTRAINT "pk_user_identities" PRIMARY KEY ("user_identity_id")
);

CREATE TABLE "iam"."tenant_memberships" (
  "tenant_membership_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "user_identity_id" uuid NOT NULL,
  "membership_state" varchar(32) NOT NULL,
  "joined_at" timestamptz NOT NULL,
  "ended_at" timestamptz,
  CONSTRAINT "pk_tenant_memberships" PRIMARY KEY ("tenant_membership_id")
);

CREATE TABLE "iam"."roles" (
  "role_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "role_code" varchar(96) NOT NULL,
  "name" text NOT NULL,
  "is_baseline" boolean NOT NULL DEFAULT false,
  "lifecycle_state" varchar(32) NOT NULL,
  CONSTRAINT "pk_roles" PRIMARY KEY ("role_id")
);

CREATE TABLE "iam"."permissions" (
  "permission_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "permission_code" varchar(160) NOT NULL,
  "domain_code" varchar(64) NOT NULL,
  "resource_code" varchar(64) NOT NULL,
  "action_code" varchar(32) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  CONSTRAINT "pk_permissions" PRIMARY KEY ("permission_id")
);

CREATE TABLE "iam"."role_permissions" (
  "role_permission_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "role_id" uuid NOT NULL,
  "permission_id" uuid NOT NULL,
  CONSTRAINT "pk_role_permissions" PRIMARY KEY ("role_permission_id")
);

CREATE TABLE "iam"."membership_roles" (
  "membership_role_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "tenant_membership_id" uuid NOT NULL,
  "role_id" uuid NOT NULL,
  "scope_kind" varchar(32) NOT NULL,
  "organizational_unit_id" uuid,
  "process_id" uuid,
  "service_id" uuid,
  "audit_id" uuid,
  "valid_from" timestamptz NOT NULL,
  "valid_to" timestamptz,
  CONSTRAINT "pk_membership_roles" PRIMARY KEY ("membership_role_id")
);

CREATE TABLE "iam"."service_principals" (
  "service_principal_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "ownership_class" varchar(24) NOT NULL,
  "tenant_id" uuid,
  "principal_code" varchar(160) NOT NULL,
  "display_name" text NOT NULL,
  "principal_kind" varchar(32) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "credential_ref" text,
  CONSTRAINT "pk_service_principals" PRIMARY KEY ("service_principal_id")
);

CREATE TABLE "iam"."impersonation_sessions" (
  "impersonation_session_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "platform_actor_user_identity_id" uuid NOT NULL,
  "target_membership_id" uuid NOT NULL,
  "reason" text NOT NULL,
  "started_at" timestamptz NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "ended_at" timestamptz,
  "lifecycle_state" varchar(32) NOT NULL,
  CONSTRAINT "pk_impersonation_sessions" PRIMARY KEY ("impersonation_session_id")
);

CREATE TABLE "org"."organizational_units" (
  "organizational_unit_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "parent_organizational_unit_id" uuid,
  "unit_code" varchar(96) NOT NULL,
  "name" text NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz NOT NULL,
  "effective_to" timestamptz,
  CONSTRAINT "pk_organizational_units" PRIMARY KEY ("organizational_unit_id")
);

CREATE TABLE "org"."processes" (
  "process_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "process_code" varchar(96) NOT NULL,
  "name" text NOT NULL,
  "business_owner_subject_id" uuid,
  "criticality" varchar(32),
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  CONSTRAINT "pk_processes" PRIMARY KEY ("process_id")
);

CREATE TABLE "org"."services" (
  "service_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "process_id" uuid NOT NULL,
  "service_code" varchar(96) NOT NULL,
  "name" text NOT NULL,
  "business_owner_subject_id" uuid,
  "criticality" varchar(32),
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  CONSTRAINT "pk_services" PRIMARY KEY ("service_id")
);

CREATE TABLE "org"."assets" (
  "asset_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "asset_code" varchar(128) NOT NULL,
  "name" text NOT NULL,
  "asset_class" varchar(64) NOT NULL,
  "business_owner_subject_id" uuid,
  "criticality" varchar(32),
  "lifecycle_state" varchar(32) NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  CONSTRAINT "pk_assets" PRIMARY KEY ("asset_id")
);

CREATE TABLE "org"."systems" (
  "system_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "subject_id" uuid NOT NULL,
  "system_code" varchar(128) NOT NULL,
  "name" text NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  CONSTRAINT "pk_systems" PRIMARY KEY ("system_id")
);

CREATE TABLE "org"."applications" (
  "application_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "subject_id" uuid NOT NULL,
  "application_code" varchar(128) NOT NULL,
  "name" text NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  CONSTRAINT "pk_applications" PRIMARY KEY ("application_id")
);

CREATE TABLE "org"."data_assets" (
  "data_asset_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "subject_id" uuid NOT NULL,
  "data_asset_code" varchar(128) NOT NULL,
  "name" text NOT NULL,
  "classification" varchar(32) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  CONSTRAINT "pk_data_assets" PRIMARY KEY ("data_asset_id")
);

CREATE TABLE "org"."locations" (
  "location_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "location_code" varchar(96) NOT NULL,
  "name" text NOT NULL,
  "country_code" char(2),
  "timezone" varchar(64),
  "lifecycle_state" varchar(32) NOT NULL,
  CONSTRAINT "pk_locations" PRIMARY KEY ("location_id")
);

CREATE TABLE "org"."dependencies" (
  "dependency_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "source_subject_id" uuid NOT NULL,
  "target_subject_id" uuid NOT NULL,
  "dependency_kind" varchar(64) NOT NULL,
  "criticality" varchar(32),
  "effective_from" timestamptz NOT NULL,
  "effective_to" timestamptz,
  CONSTRAINT "pk_dependencies" PRIMARY KEY ("dependency_id")
);

CREATE TABLE "org"."subjects" (
  "subject_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "subject_type" varchar(64) NOT NULL,
  "canonical_key" varchar(255) NOT NULL,
  "display_name" text NOT NULL,
  "owner_subject_id" uuid,
  "lifecycle_state" varchar(32) NOT NULL,
  "criticality" varchar(32),
  "effective_from" timestamptz NOT NULL,
  "effective_to" timestamptz,
  "superseded_by_subject_id" uuid,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT "pk_subjects" PRIMARY KEY ("subject_id")
);

CREATE TABLE "org"."resources" (
  "resource_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "subject_id" uuid NOT NULL,
  "integration_id" uuid,
  "resource_kind" varchar(96) NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "mapped_subject_id" uuid,
  "discovered_at" timestamptz NOT NULL,
  "retired_at" timestamptz,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT "pk_resources" PRIMARY KEY ("resource_id")
);

CREATE TABLE "org"."organizational_unit_process_links" (
  "organizational_unit_process_link_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "organizational_unit_id" uuid NOT NULL,
  "process_id" uuid NOT NULL,
  "relationship_kind" varchar(32) NOT NULL,
  "effective_from" timestamptz NOT NULL,
  "effective_to" timestamptz,
  CONSTRAINT "pk_organizational_unit_process_links" PRIMARY KEY ("organizational_unit_process_link_id")
);

CREATE TABLE "org"."service_asset_links" (
  "service_asset_link_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "tenant_id" uuid NOT NULL,
  "service_id" uuid NOT NULL,
  "asset_id" uuid NOT NULL,
  "relationship_kind" varchar(32) NOT NULL,
  "effective_from" timestamptz NOT NULL,
  "effective_to" timestamptz,
  CONSTRAINT "pk_service_asset_links" PRIMARY KEY ("service_asset_link_id")
);
