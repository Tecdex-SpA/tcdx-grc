-- Human architecture resolution: Subject creation and separate non-authoritative validation authority.
DO $$
BEGIN
  IF current_database() <> 'tcdx-grc' OR current_setting('server_version_num')::integer / 10000 <> 16
     OR (SELECT count(*) FROM platform.schema_migrations WHERE outcome='applied') <> 24
     OR (SELECT count(*) FROM iam.permissions WHERE lifecycle_state='published') <> 158
     OR to_regclass('platform.regulatory_pack_validation_accesses') IS NOT NULL
     OR to_regclass('regulatory.regulatory_pack_validation_provenances') IS NOT NULL
     OR EXISTS (SELECT 1 FROM config.configuration_definitions WHERE configuration_code='tenant_account_classification')
  THEN RAISE EXCEPTION 'PHASE5_PLUS_VALIDATION_PRECONDITION_FAILED'; END IF;
  -- Inspect existing Subject generations before removing the old, over-broad unique.
  IF EXISTS (
    SELECT 1 FROM org.subjects WHERE lifecycle_state='active' AND superseded_by_subject_id IS NULL
    GROUP BY tenant_id,subject_type,canonical_key
    HAVING count(*) > 1
  ) THEN RAISE EXCEPTION 'PHASE5_PLUS_SUBJECT_DUPLICATE_ACTIVE_GENERATION'; END IF;
END $$;

ALTER TABLE org.subjects DROP CONSTRAINT uq_subjects__tenant_id_canonical_key;
ALTER TABLE org.subjects ADD CONSTRAINT ex_subjects__active_business_interval EXCLUDE USING gist (
  tenant_id WITH =, subject_type WITH =, canonical_key WITH =,
  tstzrange(effective_from,effective_to,'[)') WITH &&
) WHERE (lifecycle_state='active' AND superseded_by_subject_id IS NULL);

INSERT INTO config.configuration_definitions
  (configuration_definition_id,ownership_class,configuration_code,version_number,value_type,
   tenant_overridable,object_overridable,owner_domain,lifecycle_state,effective_from,effective_to,
   published_at,default_text_value)
VALUES ('01a0db00-0000-7000-8000-000000000001','PLATFORM_CONTROL',
  'tenant_account_classification',1,'text',TRUE,FALSE,'platform','published',
  transaction_timestamp(),'infinity'::timestamptz,transaction_timestamp(),'commercial');
INSERT INTO config.configuration_definition_scopes
  (configuration_definition_scope_id,ownership_class,configuration_definition_id,scope_level)
VALUES ('01a0db00-0000-7000-8000-000000000002','PLATFORM_CONTROL',
  '01a0db00-0000-7000-8000-000000000001','tenant');

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

INSERT INTO iam.permissions
  (permission_id,created_at,updated_at,row_version,permission_code,domain_code,resource_code,action_code,lifecycle_state)
SELECT ('01a0db01-0000-7'||substr(md5(v.permission_code),1,3)||'-8'||substr(md5(v.permission_code),4,3)||'-'||substr(md5(v.permission_code),7,12))::uuid,
  transaction_timestamp(),transaction_timestamp(),1,v.permission_code,v.domain_code,v.resource_code,v.action_code,'published'
FROM (VALUES
  ('organization.subject.create','organization','subject','create'),
  ('platform.regulatory_pack_validation_access.read','platform','regulatory_pack_validation_access','read'),
  ('platform.regulatory_pack_validation_access.create','platform','regulatory_pack_validation_access','create'),
  ('platform.regulatory_pack_validation_access.archive','platform','regulatory_pack_validation_access','archive'),
  ('platform.tenant_account_classification.update','platform','tenant_account_classification','update')
) AS v(permission_code,domain_code,resource_code,action_code);

INSERT INTO iam.role_permissions
  (role_permission_id,created_at,ownership_class,tenant_id,role_id,permission_id)
SELECT ('01a0db02-0000-7'||substr(md5(r.role_id::text||':'||p.permission_code),1,3)||'-8'||substr(md5(r.role_id::text||':'||p.permission_code),4,3)||'-'||substr(md5(r.role_id::text||':'||p.permission_code),7,12))::uuid,
  transaction_timestamp(),r.ownership_class,r.tenant_id,r.role_id,p.permission_id
FROM iam.roles r JOIN iam.permissions p ON p.permission_code IN
  ('organization.subject.create','platform.regulatory_pack_validation_access.read',
   'platform.regulatory_pack_validation_access.create','platform.regulatory_pack_validation_access.archive',
   'platform.tenant_account_classification.update')
WHERE r.is_baseline=TRUE AND r.lifecycle_state='published' AND (
  (r.role_code='TENANT_ADMIN'
    AND p.permission_code IN ('organization.subject.create','platform.regulatory_pack_validation_access.read'))
  OR (r.role_code='PLATFORM_ADMIN' AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL
    AND p.permission_code LIKE 'platform.%')
);

DO $$
BEGIN
  IF (SELECT count(*) FROM iam.permissions WHERE lifecycle_state='published') <> 163 THEN
    RAISE EXCEPTION 'PHASE5_PLUS_VALIDATION_PERMISSION_POSTCONDITION_FAILED';
  END IF;
END $$;
