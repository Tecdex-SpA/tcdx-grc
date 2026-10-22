BEGIN;
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
COMMIT;