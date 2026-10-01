-- Human-approved Phase 5 Catalog v1.1 contract alignment. Forward-only.
-- No historical content is inferred or backfilled.
DO $precheck$
BEGIN
  IF current_database() <> 'tcdx-grc' OR current_setting('server_version_num')::integer / 10000 <> 16 THEN
    RAISE EXCEPTION 'Catalog alignment requires PostgreSQL 16 / tcdx-grc';
  END IF;
  IF (SELECT count(*) FROM platform.schema_migrations WHERE outcome = 'applied') <> 21 THEN
    RAISE EXCEPTION 'Catalog alignment requires 21 applied predecessor migrations';
  END IF;
  IF (SELECT count(*) FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema')) <> 233
    OR (SELECT count(*) FROM iam.permissions) <> 154 THEN
    RAISE EXCEPTION 'Catalog alignment requires 232 domain tables and 154 permissions';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'regulatory.normative_units'::regclass
      AND conname = 'uq_normative_units__source_locator'
      AND pg_get_constraintdef(oid) = 'UNIQUE (source_locator)'
  ) THEN
    RAISE EXCEPTION 'Expected global NormativeUnit locator constraint is absent or changed';
  END IF;
  IF EXISTS (
    SELECT 1 FROM regulatory.normative_units
    GROUP BY framework_version_id, source_locator HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'NormativeUnit composite business key has duplicate rows';
  END IF;
  IF EXISTS (
    SELECT 1 FROM regulatory.requirements
    WHERE NULLIF(btrim(licensed_statement), '') IS NULL
      AND NULLIF(btrim(licensed_content_ref), '') IS NULL
  ) THEN
    RAISE EXCEPTION 'Existing Requirement lacks content; human review required';
  END IF;
  IF EXISTS (SELECT 1 FROM regulatory.normative_unit_crosswalk_mappings)
    OR EXISTS (SELECT 1 FROM regulatory.requirement_crosswalk_mappings)
    OR EXISTS (SELECT 1 FROM regulatory.control_crosswalk_mappings) THEN
    RAISE EXCEPTION 'Existing crosswalk mappings require human metadata reconciliation';
  END IF;
  IF EXISTS (SELECT 1 FROM regulatory.requirement_control_mappings)
    OR EXISTS (SELECT 1 FROM regulatory.normative_unit_control_mappings) THEN
    RAISE EXCEPTION 'Existing Control mappings require human version reconciliation';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'regulatory.requirement_control_mappings'::regclass
      AND conname = 'uq_requirement_control_mappings__ownership_class_tenan_0197a00d'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'regulatory.normative_unit_control_mappings'::regclass
      AND conname = 'uq_normative_unit_control_mappings__mapping_version'
  ) THEN
    RAISE EXCEPTION 'Expected Control mapping global-version constraints are absent';
  END IF;
END
$precheck$;

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
