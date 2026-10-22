BEGIN;
ALTER TABLE org.subjects DROP CONSTRAINT uq_subjects__tenant_id_canonical_key;
ALTER TABLE org.subjects ADD CONSTRAINT ex_subjects__active_business_interval EXCLUDE USING gist (
  tenant_id WITH =, subject_type WITH =, canonical_key WITH =,
  tstzrange(effective_from,effective_to,'[)') WITH &&
) WHERE (lifecycle_state='active' AND superseded_by_subject_id IS NULL);
CREATE TABLE regulatory.regulatory_pack_validation_provenances (
  regulatory_pack_validation_provenance_id uuid PRIMARY KEY,
  regulatory_pack_version_id uuid NOT NULL REFERENCES regulatory.regulatory_pack_versions(regulatory_pack_version_id) ON DELETE RESTRICT,
  regulatory_import_manifest_id uuid NOT NULL REFERENCES regulatory.regulatory_import_manifests(regulatory_import_manifest_id) ON DELETE RESTRICT,
  regulatory_source_id uuid NOT NULL REFERENCES regulatory.regulatory_sources(regulatory_source_id) ON DELETE RESTRICT,
  authority_class varchar(48) NOT NULL DEFAULT 'NON_AUTHORITATIVE_TEST_PACK',
  source_role varchar(48) NOT NULL,
  provenance_ref text NOT NULL,
  source_checksum char(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  created_by_user_identity_id uuid NOT NULL REFERENCES iam.user_identities(user_identity_id) ON DELETE RESTRICT,
  CONSTRAINT ck_regulatory_pack_validation_provenances__authority
    CHECK (authority_class='NON_AUTHORITATIVE_TEST_PACK'),
  CONSTRAINT ck_regulatory_pack_validation_provenances__source_role
    CHECK (source_role IN ('official_metadata','provisional_supporting_reference','supporting_reference','test_data_source')),
  CONSTRAINT ck_regulatory_pack_validation_provenances__checksum
    CHECK (source_checksum ~ '^[a-f0-9]{64}$'),
  CONSTRAINT ck_regulatory_pack_validation_provenances__provenance
    CHECK (length(btrim(provenance_ref)) > 0),
  CONSTRAINT uq_regulatory_pack_validation_provenances__version UNIQUE (regulatory_pack_version_id),
  CONSTRAINT uq_regulatory_pack_validation_provenances__version_id UNIQUE (regulatory_pack_version_id,regulatory_pack_validation_provenance_id)
);
CREATE TABLE platform.regulatory_pack_validation_accesses (
  regulatory_pack_validation_access_id uuid PRIMARY KEY,
  ownership_class varchar(24) NOT NULL DEFAULT 'PLATFORM_CONTROL',
  tenant_id uuid NOT NULL REFERENCES platform.tenants(tenant_id) ON DELETE RESTRICT,
  regulatory_pack_version_id uuid NOT NULL REFERENCES regulatory.regulatory_pack_versions(regulatory_pack_version_id) ON DELETE RESTRICT,
  regulatory_pack_validation_provenance_id uuid NOT NULL REFERENCES regulatory.regulatory_pack_validation_provenances(regulatory_pack_validation_provenance_id) ON DELETE RESTRICT,
  lifecycle_state varchar(32) NOT NULL DEFAULT 'active',
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  row_version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  created_by_user_identity_id uuid NOT NULL REFERENCES iam.user_identities(user_identity_id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_by_user_identity_id uuid NOT NULL REFERENCES iam.user_identities(user_identity_id) ON DELETE RESTRICT,
  CONSTRAINT ck_regulatory_pack_validation_accesses__ownership CHECK (ownership_class='PLATFORM_CONTROL'),
  CONSTRAINT ck_regulatory_pack_validation_accesses__lifecycle CHECK (lifecycle_state IN ('active','revoked')),
  CONSTRAINT ck_regulatory_pack_validation_accesses__interval CHECK (effective_to IS NULL OR effective_to >= effective_from),
  CONSTRAINT ck_regulatory_pack_validation_accesses__revoked CHECK (lifecycle_state='active' OR effective_to IS NOT NULL),
  CONSTRAINT ck_regulatory_pack_validation_accesses__row_version CHECK (row_version > 0),
  CONSTRAINT uq_regulatory_pack_validation_accesses__tenant_id_id UNIQUE NULLS NOT DISTINCT (tenant_id,regulatory_pack_validation_access_id),
  CONSTRAINT fk_regulatory_pack_validation_accesses__exact_provenance FOREIGN KEY
    (regulatory_pack_version_id,regulatory_pack_validation_provenance_id)
    REFERENCES regulatory.regulatory_pack_validation_provenances(regulatory_pack_version_id,regulatory_pack_validation_provenance_id)
    ON DELETE RESTRICT,
  CONSTRAINT ex_regulatory_pack_validation_accesses__no_overlap EXCLUDE USING gist (
    tenant_id WITH =, regulatory_pack_version_id WITH =,
    tstzrange(effective_from,effective_to,'[)') WITH &&
  )
);
CREATE INDEX ix_regulatory_pack_validation_accesses__tenant_active
  ON platform.regulatory_pack_validation_accesses (tenant_id,regulatory_pack_version_id)
  WHERE lifecycle_state='active';
COMMIT;