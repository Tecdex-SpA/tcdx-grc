-- PRE-F5E Platform authority and initial Tenant/Membership semantics candidate.
-- PostgreSQL 16; forward-only, transactional and fail-closed.
DO $$
DECLARE
  physical_table_count integer;
  ledger_count integer;
BEGIN
  IF current_database() <> 'tcdx-grc' OR current_setting('server_version_num')::integer / 10000 <> 16 THEN
    RAISE EXCEPTION 'PRE_F5E_TARGET_IDENTITY_MISMATCH';
  END IF;
  SELECT count(*) INTO ledger_count FROM platform.schema_migrations WHERE outcome = 'applied';
  IF ledger_count <> 12 OR NOT EXISTS (
    SELECT 1 FROM platform.schema_migrations
    WHERE migration_id = '20260921000200' AND outcome = 'applied'
  ) THEN
    RAISE EXCEPTION 'PRE_F5E_LEDGER_PRECONDITION_FAILED';
  END IF;
  SELECT count(*) INTO physical_table_count
  FROM pg_catalog.pg_tables
  WHERE schemaname IN ('platform','iam','org','regulatory','controls','evidence','remediation','risk','audit','operations','third_party','resilience','privacy','survey','data','config','rules','integration','reporting','knowledge','ai','notification','ops_audit')
    AND NOT (schemaname = 'platform' AND tablename = 'schema_migrations');
  IF physical_table_count <> 229 OR to_regclass('iam.platform_role_assignments') IS NOT NULL THEN
    RAISE EXCEPTION 'PRE_F5E_SCHEMA_PRECONDITION_FAILED';
  END IF;
END $$;

ALTER TABLE "iam"."roles"
  ADD CONSTRAINT "uq_roles__role_id_ownership_class"
  UNIQUE ("role_id", "ownership_class");

CREATE TABLE "iam"."platform_role_assignments" (
  "platform_role_assignment_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "ownership_class" varchar(24) NOT NULL DEFAULT 'PLATFORM_CONTROL',
  "user_identity_id" uuid NOT NULL,
  "role_id" uuid NOT NULL,
  "valid_from" timestamptz NOT NULL,
  "valid_to" timestamptz,
  CONSTRAINT "pk_platform_role_assignments" PRIMARY KEY ("platform_role_assignment_id"),
  CONSTRAINT "ck_platform_role_assignments__created_actor_one" CHECK (num_nonnulls("created_by_user_identity_id", "created_by_service_principal_id") <= 1),
  CONSTRAINT "ck_platform_role_assignments__ownership_class" CHECK ("ownership_class" = 'PLATFORM_CONTROL'),
  CONSTRAINT "ck_platform_role_assignments__valid_from_valid_to" CHECK ("valid_to" IS NULL OR "valid_to" > "valid_from"),
  CONSTRAINT "fk_platform_role_assignments__created_by_user_identity_id" FOREIGN KEY ("created_by_user_identity_id") REFERENCES "iam"."user_identities" ("user_identity_id") ON UPDATE NO ACTION ON DELETE RESTRICT,
  CONSTRAINT "fk_platform_role_assignments__created_by_service_principal_id" FOREIGN KEY ("created_by_service_principal_id") REFERENCES "iam"."service_principals" ("service_principal_id") ON UPDATE NO ACTION ON DELETE RESTRICT,
  CONSTRAINT "fk_platform_role_assignments__user_identity_id" FOREIGN KEY ("user_identity_id") REFERENCES "iam"."user_identities" ("user_identity_id") ON UPDATE NO ACTION ON DELETE RESTRICT,
  CONSTRAINT "fk_platform_role_assignments__role" FOREIGN KEY ("role_id", "ownership_class") REFERENCES "iam"."roles" ("role_id", "ownership_class") ON UPDATE NO ACTION ON DELETE RESTRICT
);

CREATE INDEX "ix_platform_role_assignments__created_by_user_identity_id" ON "iam"."platform_role_assignments" ("created_by_user_identity_id");
CREATE INDEX "ix_platform_role_assignments__created_by_service_principal_id" ON "iam"."platform_role_assignments" ("created_by_service_principal_id");
CREATE INDEX "ix_platform_role_assignments__user_identity_validity" ON "iam"."platform_role_assignments" ("user_identity_id", "valid_from", "valid_to");
CREATE INDEX "ix_platform_role_assignments__role_id" ON "iam"."platform_role_assignments" ("role_id");
CREATE UNIQUE INDEX "uq_platform_role_assignments__active_assignment" ON "iam"."platform_role_assignments" ("user_identity_id", "role_id") WHERE "valid_to" IS NULL;

ALTER TABLE "platform"."tenants"
  ALTER COLUMN "lifecycle_state" SET DEFAULT 'active',
  ALTER COLUMN "data_classification" SET DEFAULT 'confidential',
  ADD CONSTRAINT "ck_tenants__data_classification" CHECK ("data_classification" IN ('public','internal','confidential','restricted'));

ALTER TABLE "iam"."tenant_memberships"
  ALTER COLUMN "membership_state" SET DEFAULT 'active';

DO $$
DECLARE physical_table_count integer;
BEGIN
  SELECT count(*) INTO physical_table_count
  FROM pg_catalog.pg_tables
  WHERE schemaname IN ('platform','iam','org','regulatory','controls','evidence','remediation','risk','audit','operations','third_party','resilience','privacy','survey','data','config','rules','integration','reporting','knowledge','ai','notification','ops_audit')
    AND NOT (schemaname = 'platform' AND tablename = 'schema_migrations');
  IF physical_table_count <> 230 THEN
    RAISE EXCEPTION 'PRE_F5E_POSTCONDITION_EXPECTED_230_TABLES';
  END IF;
  IF EXISTS (SELECT 1 FROM iam.platform_role_assignments) THEN
    RAISE EXCEPTION 'PRE_F5E_POSTCONDITION_PERSON_GRANT_SEEDED';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'iam' AND table_name = 'platform_role_assignments'
      AND column_name IN ('tenant_id','tenant_membership_id','email','password','password_hash','mfa_secret')
  ) THEN
    RAISE EXCEPTION 'PRE_F5E_POSTCONDITION_FORBIDDEN_COLUMN';
  END IF;
END $$;
