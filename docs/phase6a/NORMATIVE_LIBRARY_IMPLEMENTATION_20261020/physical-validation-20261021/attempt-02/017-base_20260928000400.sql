BEGIN;
ALTER TABLE regulatory.normative_units
  DROP CONSTRAINT uq_normative_units__source_locator;
ALTER TABLE regulatory.normative_units
  ADD CONSTRAINT uq_normative_units__framework_version_id_source_locator
  UNIQUE (framework_version_id, source_locator);
ALTER TABLE regulatory.requirements
  ADD COLUMN editorial_summary text;
ALTER TABLE regulatory.requirements
  ADD CONSTRAINT ck_requirements__content_representation CHECK (
    NULLIF(btrim(licensed_statement), '') IS NOT NULL
    OR NULLIF(btrim(licensed_content_ref), '') IS NOT NULL
    OR NULLIF(btrim(editorial_summary), '') IS NOT NULL
  );
-- mapping_version is a semantic version of each typed business relation.
-- The Catalog v1.1 importer explicitly supplies 1 for each new relation.
ALTER TABLE regulatory.requirement_control_mappings
  DROP CONSTRAINT uq_requirement_control_mappings__ownership_class_tenan_0197a00d;
ALTER TABLE regulatory.requirement_control_mappings
  ADD CONSTRAINT uq_requirement_control_mappings__business_version
    UNIQUE (requirement_id, control_version_id, mapping_type, mapping_version),
  ADD CONSTRAINT ck_requirement_control_mappings__mapping_version_positive
    CHECK (mapping_version >= 1);
ALTER TABLE regulatory.normative_unit_control_mappings
  DROP CONSTRAINT uq_normative_unit_control_mappings__mapping_version;
ALTER TABLE regulatory.normative_unit_control_mappings
  ADD CONSTRAINT uq_normative_unit_control_mappings__business_version
    UNIQUE (normative_unit_id, control_version_id, mapping_version),
  ADD CONSTRAINT ck_normative_unit_control_mappings__mapping_version_positive
    CHECK (mapping_version >= 1);
ALTER TABLE regulatory.normative_unit_crosswalk_mappings
  ADD COLUMN direction varchar(32) NOT NULL,
  ADD COLUMN provenance_ref text NOT NULL,
  ADD COLUMN effective_from timestamptz NOT NULL,
  ADD COLUMN effective_to timestamptz,
  ADD COLUMN mapping_version_number bigint NOT NULL;
ALTER TABLE regulatory.requirement_crosswalk_mappings
  ADD COLUMN direction varchar(32) NOT NULL,
  ADD COLUMN provenance_ref text NOT NULL,
  ADD COLUMN effective_from timestamptz NOT NULL,
  ADD COLUMN effective_to timestamptz,
  ADD COLUMN mapping_version_number bigint NOT NULL;
ALTER TABLE regulatory.control_crosswalk_mappings
  ADD COLUMN direction varchar(32) NOT NULL,
  ADD COLUMN provenance_ref text NOT NULL,
  ADD COLUMN effective_from timestamptz NOT NULL,
  ADD COLUMN effective_to timestamptz,
  ADD COLUMN mapping_version_number bigint NOT NULL;
ALTER TABLE regulatory.normative_unit_crosswalk_mappings
  ADD CONSTRAINT ck_nu_xwalk_direction CHECK (direction IN ('source_to_target','target_to_source','bidirectional')),
  ADD CONSTRAINT ck_nu_xwalk_provenance CHECK (length(btrim(provenance_ref)) > 0),
  ADD CONSTRAINT ck_nu_xwalk_effective_interval CHECK (effective_to IS NULL OR effective_to > effective_from),
  ADD CONSTRAINT ck_nu_xwalk_mapping_version CHECK (mapping_version_number >= 1),
  ADD CONSTRAINT ck_nu_xwalk_no_match_target CHECK ((relationship_type = 'no_match') = (target_normative_unit_id IS NULL)),
  ADD CONSTRAINT uq_nu_xwalk_business_version UNIQUE NULLS NOT DISTINCT
    (framework_crosswalk_id, source_normative_unit_id, target_normative_unit_id, mapping_version_number);
ALTER TABLE regulatory.requirement_crosswalk_mappings
  ADD CONSTRAINT ck_req_xwalk_direction CHECK (direction IN ('source_to_target','target_to_source','bidirectional')),
  ADD CONSTRAINT ck_req_xwalk_provenance CHECK (length(btrim(provenance_ref)) > 0),
  ADD CONSTRAINT ck_req_xwalk_effective_interval CHECK (effective_to IS NULL OR effective_to > effective_from),
  ADD CONSTRAINT ck_req_xwalk_mapping_version CHECK (mapping_version_number >= 1),
  ADD CONSTRAINT ck_req_xwalk_no_match_target CHECK ((relationship_type = 'no_match') = (target_requirement_id IS NULL)),
  ADD CONSTRAINT uq_req_xwalk_business_version UNIQUE NULLS NOT DISTINCT
    (framework_crosswalk_id, source_requirement_id, target_requirement_id, mapping_version_number);
ALTER TABLE regulatory.control_crosswalk_mappings
  ADD CONSTRAINT ck_control_xwalk_direction CHECK (direction IN ('source_to_target','target_to_source','bidirectional')),
  ADD CONSTRAINT ck_control_xwalk_provenance CHECK (length(btrim(provenance_ref)) > 0),
  ADD CONSTRAINT ck_control_xwalk_effective_interval CHECK (effective_to IS NULL OR effective_to > effective_from),
  ADD CONSTRAINT ck_control_xwalk_mapping_version CHECK (mapping_version_number >= 1),
  ADD CONSTRAINT ck_control_xwalk_no_match_target CHECK ((relationship_type = 'no_match') = (target_control_version_id IS NULL)),
  ADD CONSTRAINT uq_control_xwalk_business_version UNIQUE NULLS NOT DISTINCT
    (framework_crosswalk_id, source_control_version_id, target_control_version_id, mapping_version_number);
COMMIT;