-- Human-approved 2026-09-29 Phase 5 commercial pack authority.
-- Forward-only physical amendment; no entitlement or permission is seeded here.
DO $$
DECLARE ledger_rows integer; physical_rows integer;
BEGIN
  IF current_database() <> 'tcdx-grc' OR current_setting('server_version_num')::integer / 10000 <> 16 THEN
    RAISE EXCEPTION 'PHASE5_PACK_AUTHORITY_TARGET_IDENTITY_MISMATCH';
  END IF;
  SELECT count(*) INTO ledger_rows FROM platform.schema_migrations WHERE outcome='applied';
  IF ledger_rows <> 22 OR NOT EXISTS (
    SELECT 1 FROM platform.schema_migrations
    WHERE migration_id='20260928000400' AND outcome='applied'
  ) THEN RAISE EXCEPTION 'PHASE5_PACK_AUTHORITY_EXPECTED_22_APPLIED'; END IF;
  SELECT count(*) INTO physical_rows FROM pg_catalog.pg_tables
   WHERE schemaname IN ('platform','iam','org','regulatory','controls','evidence','remediation','risk','audit','operations','third_party','resilience','privacy','survey','data','config','rules','integration','reporting','knowledge','ai','notification','ops_audit')
     AND NOT (schemaname='platform' AND tablename='schema_migrations');
  IF physical_rows <> 232 OR to_regclass('platform.subscription_regulatory_packs') IS NOT NULL THEN
    RAISE EXCEPTION 'PHASE5_PACK_AUTHORITY_UNEXPECTED_PHYSICAL_STATE: %', physical_rows;
  END IF;
  IF (SELECT count(*) FROM iam.permissions WHERE lifecycle_state='published') <> 154 THEN
    RAISE EXCEPTION 'PHASE5_PACK_AUTHORITY_PERMISSION_PRECONDITION';
  END IF;
END $$;

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE platform.subscription_regulatory_packs (
  subscription_regulatory_pack_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_user_identity_id uuid,
  created_by_service_principal_id uuid,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by_user_identity_id uuid,
  updated_by_service_principal_id uuid,
  row_version bigint NOT NULL DEFAULT 1,
  tenant_id uuid NOT NULL,
  subscription_id uuid NOT NULL,
  regulatory_pack_version_id uuid NOT NULL,
  lifecycle_state varchar(32) NOT NULL,
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  CONSTRAINT pk_subscription_regulatory_packs PRIMARY KEY (subscription_regulatory_pack_id),
  CONSTRAINT ck_subscription_regulatory_packs__row_version_positive CHECK (row_version > 0),
  CONSTRAINT ck_subscription_regulatory_packs__created_actor_one CHECK (num_nonnulls(created_by_user_identity_id,created_by_service_principal_id) = 1),
  CONSTRAINT ck_subscription_regulatory_packs__updated_actor_one CHECK (num_nonnulls(updated_by_user_identity_id,updated_by_service_principal_id) <= 1),
  CONSTRAINT ck_subscription_regulatory_packs__effective_from_effective_to CHECK (effective_to IS NULL OR effective_to > effective_from),
  CONSTRAINT ck_subscription_regulatory_packs__lifecycle CHECK (lifecycle_state IN ('active','revoked')),
  CONSTRAINT ck_subscription_regulatory_packs__interval_state CHECK (
    lifecycle_state='active' OR (lifecycle_state='revoked' AND effective_to IS NOT NULL)
  ),
  CONSTRAINT uq_subscription_regulatory_packs__tenant_id_assignment_id UNIQUE NULLS NOT DISTINCT (tenant_id,subscription_regulatory_pack_id),
  CONSTRAINT uq_subscription_regulatory_packs__business_interval UNIQUE (subscription_id,regulatory_pack_version_id,effective_from),
  CONSTRAINT fk_subscription_regulatory_packs__tenant FOREIGN KEY (tenant_id)
    REFERENCES platform.tenants(tenant_id) ON DELETE RESTRICT,
  CONSTRAINT fk_subscription_regulatory_packs__subscription FOREIGN KEY (tenant_id,subscription_id)
    REFERENCES platform.subscriptions(tenant_id,subscription_id) ON DELETE RESTRICT,
  CONSTRAINT fk_subscription_regulatory_packs__pack_version FOREIGN KEY (regulatory_pack_version_id)
    REFERENCES regulatory.regulatory_pack_versions(regulatory_pack_version_id) ON DELETE RESTRICT,
  CONSTRAINT fk_subscription_regulatory_packs__created_user FOREIGN KEY (created_by_user_identity_id)
    REFERENCES iam.user_identities(user_identity_id) ON DELETE RESTRICT,
  CONSTRAINT fk_subscription_regulatory_packs__created_service FOREIGN KEY (created_by_service_principal_id)
    REFERENCES iam.service_principals(service_principal_id) ON DELETE RESTRICT,
  CONSTRAINT fk_subscription_regulatory_packs__updated_user FOREIGN KEY (updated_by_user_identity_id)
    REFERENCES iam.user_identities(user_identity_id) ON DELETE RESTRICT,
  CONSTRAINT fk_subscription_regulatory_packs__updated_service FOREIGN KEY (updated_by_service_principal_id)
    REFERENCES iam.service_principals(service_principal_id) ON DELETE RESTRICT,
  CONSTRAINT ex_subscription_regulatory_packs__no_overlap EXCLUDE USING gist (
    subscription_id WITH =,
    regulatory_pack_version_id WITH =,
    tstzrange(effective_from,effective_to,'[)') WITH &&
  )
);

CREATE INDEX ix_subscription_regulatory_packs__tenant_active
  ON platform.subscription_regulatory_packs (tenant_id,subscription_id,regulatory_pack_version_id)
  WHERE lifecycle_state='active';
CREATE INDEX ix_subscription_regulatory_packs__pack_version
  ON platform.subscription_regulatory_packs (regulatory_pack_version_id);

DO $$
DECLARE physical_rows integer;
BEGIN
  SELECT count(*) INTO physical_rows FROM pg_catalog.pg_tables
   WHERE schemaname IN ('platform','iam','org','regulatory','controls','evidence','remediation','risk','audit','operations','third_party','resilience','privacy','survey','data','config','rules','integration','reporting','knowledge','ai','notification','ops_audit')
     AND NOT (schemaname='platform' AND tablename='schema_migrations');
  IF physical_rows <> 233 THEN RAISE EXCEPTION 'PHASE5_PACK_AUTHORITY_EXPECTED_233_TABLES: %',physical_rows; END IF;
  IF (SELECT count(*) FROM iam.permissions WHERE lifecycle_state='published') <> 154 THEN
    RAISE EXCEPTION 'PHASE5_PACK_AUTHORITY_CHANGED_PERMISSION_CATALOG';
  END IF;
END $$;
