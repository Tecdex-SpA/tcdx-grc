-- DRAFT_NOT_EFFECTIVE: exact review candidate, NOT applied or in active runner.
-- PG16, R-P prospective root rule. No commercial values, identities or grants.
-- Runner owns BEGIN/COMMIT + ledger; do not run as an ungoverned psql script.
DO $preflight$
BEGIN
 IF current_database()<>'tcdx-grc' OR current_setting('server_version_num')::integer/10000<>16 THEN
  RAISE EXCEPTION 'COMMERCIAL_TARGET_IDENTITY_MISMATCH';
 END IF;
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'COMMERCIAL_REQUIRES_REVIEWED_READ_COMMITTED';
 END IF;
 IF to_regclass('platform.commercial_families') IS NOT NULL THEN
  RAISE EXCEPTION 'COMMERCIAL_SCHEMA_ALREADY_PRESENT_WITHOUT_REVIEWED_LEDGER';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='platform.usage_limits'::regclass
   AND conname='uq_usage_limits__limit_code' AND contype='u') THEN
  RAISE EXCEPTION 'COMMERCIAL_SOURCE_USAGE_LIMIT_CONSTRAINT_MISMATCH';
 END IF;
 IF EXISTS(SELECT 1 FROM platform.usage_limits WHERE limit_value::text IN ('NaN','Infinity','-Infinity')
   OR limit_value<0 OR (effective_to IS NOT NULL AND effective_to<=effective_from)
   OR (limit_code='regulatory_pack_count' AND (unit<>'pack' OR trunc(limit_value)<>limit_value))) THEN
  RAISE EXCEPTION 'COMMERCIAL_USAGE_LIMIT_DATA_REQUIRES_COMPETENT_RESOLUTION';
 END IF;
END; $preflight$;

DO $ledger$
BEGIN
 IF EXISTS(
   SELECT 1 FROM jsonb_to_recordset($reviewed$[{"id":"20260916000100","filename":"20260916000100_bootstrap_schemas_and_ledger.sql","sha256":"4f29910baacf82526fb06226c237024b7315038a4868baa7bbda56ced4779437","transactional":true,"preconditions":["database_name=tcdx-grc","postgres_major=16"],"postconditions":["ledger_outcome=applied"]},{"id":"20260916000200","filename":"20260916000200_platform_iam_organization.sql","sha256":"08fce9d08e729f097095a10cfdfbf093c43f9d8cbfbee97d39594691f4ad8f29","transactional":true,"preconditions":["database_name=tcdx-grc","postgres_major=16"],"postconditions":["ledger_outcome=applied"]},{"id":"20260916000300","filename":"20260916000300_normative_control_evidence.sql","sha256":"f300aac95b6fba36c09fc6ac77550bf574f953c0ee0ad374a8cbf6fdb338ef9f","transactional":true,"preconditions":["database_name=tcdx-grc","postgres_major=16"],"postconditions":["ledger_outcome=applied"]},{"id":"20260916000400","filename":"20260916000400_risk_operations_privacy.sql","sha256":"a38d2a7babbe77d79783d66e8ce909916e967be739d3712f303e51883d85a81b","transactional":true,"preconditions":["database_name=tcdx-grc","postgres_major=16"],"postconditions":["ledger_outcome=applied"]},{"id":"20260916000500","filename":"20260916000500_data_integration_reporting_ai.sql","sha256":"bac1e0a421a4d532eb2da27e4bc9453125cfa407a2e8da904c8749c726815764","transactional":true,"preconditions":["database_name=tcdx-grc","postgres_major=16"],"postconditions":["ledger_outcome=applied"]},{"id":"20260916000600","filename":"20260916000600_constraints_and_uniqueness.sql","sha256":"7d079aa1234050b6dde06d9fb3cad939144fcbccdf287cc31bbe863c68899bf5","transactional":true,"preconditions":["database_name=tcdx-grc","postgres_major=16"],"postconditions":["ledger_outcome=applied"]},{"id":"20260916000700","filename":"20260916000700_foreign_keys.sql","sha256":"d2112e4b402e8789312d5473969b615e6d7ab344a58a2211f790c4423dd4361f","transactional":true,"preconditions":["database_name=tcdx-grc","postgres_major=16"],"postconditions":["ledger_outcome=applied"]},{"id":"20260916000800","filename":"20260916000800_required_indexes.sql","sha256":"d3502b9de76209b54b40497e6b9fdf94d463335d1f5441fb0fb924786648336e","transactional":true,"preconditions":["database_name=tcdx-grc","postgres_major=16"],"postconditions":["ledger_outcome=applied"]},{"id":"20260916000900","filename":"20260916000900_canonical_seeds.sql","sha256":"94547ff1fa6a9accf56ff6f28be93afeb91b8c290ca9bb224667862c64c8c2e7","transactional":true,"preconditions":["database_name=tcdx-grc","postgres_major=16"],"postconditions":["ledger_outcome=applied"]},{"id":"20260916001000","filename":"20260916001000_pre_f4_integrated_audit_model.sql","sha256":"c4247051c223960eb5ca817a0f85650dbc828a7864e48f66a1a73b1d298a224d","transactional":true,"preconditions":["database_name=tcdx-grc","postgres_major=16","ledger_count=9","physical_tables=214","existing_audits=0_or_approved_reconciliation"],"postconditions":["ledger_outcome=applied","physical_tables=229","audit_scope_and_lead_dual_authority=0"]},{"id":"20260921000100","filename":"20260921000100_pre_f5c_executable_physical_reconciliation.sql","sha256":"1181d7ab26718927124de880e351fbaba3f2daaca41267a1ef66d28ac2021680","transactional":true,"preconditions":["database_name=tcdx-grc","postgres_major=16","ledger_count=10","physical_tables=229","pre_f5c_columns=absent"],"postconditions":["ledger_outcome=applied","physical_tables=229","mutable_f5_rows=row_version","pre_f5c_lifecycle_delta=39","pre_f5c_permissions=2"]},{"id":"20260921000200","filename":"20260921000200_phase5_core_grc_runtime_permissions.sql","sha256":"8cc3d1b2a64a5b00ffd55f93ccfbcdfcde5406ffa9c1fa7f2d2055f505048eb0","transactional":true,"preconditions":["database_name=tcdx-grc","postgres_major=16","ledger_count=11","physical_tables=229"],"postconditions":["ledger_outcome=applied","physical_tables=229","phase5_runtime_permissions=11"]},{"id":"20260923000100","filename":"20260923000100_pre_f5e_platform_authority.sql","sha256":"4ee0b3d24c7d7aa6ea87a8e9a6618cd2a7b164aedf1e3990590c3cf1b512ea82","transactional":true,"preconditions":["database_name=tcdx-grc","postgres_major=16","ledger_count=12","physical_tables=229","platform_role_assignments=absent"],"postconditions":["ledger_outcome=applied","physical_tables=230","platform_role_assignments=present","person_specific_grants=0"]},{"id":"20260923000200","filename":"20260923000200_phase5_final_closure.sql","sha256":"96a56b5669cd6e6fd0d751dc12526e3fe6ad2c612e77a8a7e144c847775be96c","transactional":true,"preconditions":["database_name=tcdx-grc","postgres_major=16","ledger_count=13","physical_tables=230","file_upload_intents=absent"],"postconditions":["ledger_outcome=applied","physical_tables=231","file_upload_intents=present","active_lifecycle_amendments=2","secret_or_blob_columns=0"]},{"id":"20260924000100","filename":"20260924000100_phase5_subscription_create_catalog.sql","sha256":"a41efa51265d5f95a342674bdbac2faecf37ac31ac1c45aef47b394c7e380f2f","transactional":true,"preconditions":["database_name=tcdx-grc","postgres_major=16","ledger_count=14","physical_tables=231","platform.subscription.create=absent"],"postconditions":["ledger_outcome=applied","physical_tables=231","platform.subscription.create=published","PLATFORM_ADMIN_grant=1"]},{"id":"20260924000200","filename":"20260924000200_phase5_retention_policy_lifecycle.sql","sha256":"751ff47c9644b8d7134bb16148728a075e61af3057fa2a271e280a1fb1cd1728","transactional":true,"preconditions":["database_name=tcdx-grc","postgres_major=16","ledger_count=15","physical_tables=231","retention_policy_lifecycle_state=present","retention_policy_row_version=absent"],"postconditions":["ledger_outcome=applied","physical_tables=231","retention_effective_from_nullable=yes","retention_effective_to_nullable=yes","retention_row_version=bigint_not_null_default_1","retention_lifecycle_edges=3"]},{"id":"20260924000300","filename":"20260924000300_phase5_membership_invitation.sql","sha256":"0942e5eb360f7157a444d7b04fbe7558312e8d782347e60a745a8d4365034806","transactional":true,"preconditions":["database_name=tcdx-grc","postgres_major=16","ledger_count=16","physical_tables=231","tenant_membership_invitations=absent","membership_invitation_permissions=absent"],"postconditions":["ledger_outcome=applied","physical_tables=232","tenant_membership_invitations=present","membership_invitation_permissions=2","PLATFORM_ADMIN_only_grants=2"]},{"id":"20260925000100","filename":"20260925000100_phase5_membership_invitation_platform_authority_reconciliation.sql","sha256":"b66f88a19323d7a92465f6e61e762dffcf511eae55e53456d811c7912d3dad8a","transactional":true,"preconditions":["database_name=tcdx-grc","postgres_major=16","ledger_count=17","physical_tables=232","applied_membership_invitation_sha256=0942e5eb...","PLATFORM_ADMIN=exactly_1"],"postconditions":["ledger_outcome=applied","physical_tables=232","membership_invitation_permissions=2","PLATFORM_ADMIN_only_grants=2","unauthorized_grants=0","service_actor_fks=2"]},{"id":"20260928000100","filename":"20260928000100_phase5_administrative_read_permissions.sql","sha256":"d19c72ce5a0b9e5caa65d8b6b93daec1b2188dee54067551bb8ac3c8c7dcdd35","transactional":true,"preconditions":["database_name=tcdx-grc","postgres_major=16","ledger_count=18","physical_tables=232","applied_membership_invitation_authority_sha256=b66f88a1...","administrative_read_permissions=absent"],"postconditions":["ledger_outcome=applied","physical_tables=232","administrative_read_permissions=4","unauthorized_grants=0","direct_identity_grants=0"]},{"id":"20260928000200","filename":"20260928000200_phase5_membership_role_revoke_platform_grant.sql","sha256":"d47e4fa07250092c5b8c063a60713528627acee864f93278b3c5f0ed5dd57cdc","transactional":true,"preconditions":["database_name=tcdx-grc","postgres_major=16","ledger_count=19","physical_tables=232","applied_administrative_read_sha256=d19c72ce...","published_permissions=154","platform_admin_role_assign_grant=absent"],"postconditions":["ledger_outcome=applied","physical_tables=232","published_permissions=154","platform_admin_role_assign_grant=1","direct_identity_grants=0"]},{"id":"20260928000300","filename":"20260928000300_phase5_control_assessment_start_tenant_scope.sql","sha256":"4e38ffe74d4c5324d16871228e65e800396d538f45aaf29b052d895bfb5cbe84","transactional":true,"preconditions":["database_name=tcdx-grc","postgres_major=16","ledger_count=20","physical_tables=232","applied_role_revoke_grant_sha256=d47e4fa07250092c5b8c063a60713528627acee864f93278b3c5f0ed5dd57cdc","control_assessment_start_v2=published","control_owner_update_template_grant=1"],"postconditions":["ledger_outcome=applied","physical_tables=232","published_permissions=154","control_assessment_start_v3_tenant_scope=published","direct_identity_grants=0"]},{"id":"20260928000400","filename":"20260928000400_phase5_regulatory_catalog_contract_alignment.sql","sha256":"1d4e5a51372531a1a5645dd5152cd00742016a3e5a7f3c508193caa65afcb929","transactional":true,"preconditions":["database_name=tcdx-grc","postgres_major=16","ledger_count=21","physical_tables=232","published_permissions=154","crosswalk_mapping_rows=0","normative_unit_composite_duplicates=0","existing_requirements_content_valid"],"postconditions":["ledger_outcome=applied","physical_tables=232","published_permissions=154","normative_unit_business_key=composite","requirement_editorial_summary=present","crosswalk_mapping_metadata=present"]},{"id":"20260929000100","filename":"20260929000100_phase5_subscription_regulatory_pack_authority.sql","sha256":"58db95213900be09348312702659b292f53a5913fe03df99102c444320c70bbd","transactional":true,"preconditions":["database_name=tcdx-grc","postgres_major=16","ledger_count=22","physical_tables=232","published_permissions=154","subscription_regulatory_packs=absent"],"postconditions":["ledger_outcome=applied","physical_tables=233","published_permissions=154","subscription_regulatory_packs=present","no_active_overlap"]},{"id":"20260929000200","filename":"20260929000200_phase5_plus_permissions_applicability.sql","sha256":"58d52157c20f5daa95d533030fa0b2ed4f85d7faea1a0f256a167f608a23ea8d","transactional":true,"preconditions":["database_name=tcdx-grc","postgres_major=16","ledger_count=23","physical_tables=233","published_permissions=154"],"postconditions":["ledger_outcome=applied","physical_tables=233","published_permissions=158","applicability_decision=closed"]},{"id":"20260929000300","filename":"20260929000300_phase5_plus_subject_validation_access.sql","sha256":"5eb46ac182929c1649fed610a4d66cd92017ea07b473aba933e5c167f5e1dfdb","transactional":true,"preconditions":["database_name=tcdx-grc","postgres_major=16","ledger_count=24","physical_tables=233","published_permissions=158","no_duplicate_active_subject_generation"],"postconditions":["ledger_outcome=applied","physical_tables=235","published_permissions=163","subject_active_interval_unique","validation_access_separate_from_subscription"]},{"id":"20261001000100","filename":"20261001000100_managed_identity_permissions_publication.sql","sha256":"90503ed1cf626c7d8a3529d323670322e180efde90257ee8bb99efe2736eef07","transactional":true,"preconditions":["database_name=tcdx-grc","postgres_major=16","ledger_count=25","latest_migration=20260929000300","physical_tables=235","published_permissions=163","managed_identity_permissions=0","canonical_platform_admin_roles=1"],"postconditions":["ledger_outcome=applied","physical_tables=235","published_permissions=167","managed_identity_permissions=4","platform_admin_managed_identity_grants=4","other_role_managed_identity_grants=0"]},{"id":"20261006000100","filename":"20261006000100_platform_role_administration_permission_publication.sql","sha256":"2a3c0d14748a9494d6ef60572802782eab2cdf3f4e60bef6026d73c48c1b6399","transactional":true,"preconditions":["database_name=tcdx-grc","postgres_major=16","ledger_count=26","latest_migration=20261001000100","physical_tables=235","published_permissions=167","platform_role_administer_permissions=0","canonical_platform_admin_roles=1"],"postconditions":["ledger_outcome=applied","physical_tables=235","published_permissions=168","platform_role_administer_permissions=1","platform_admin_role_administer_grants=1","other_role_role_administer_grants=0","schema_delta=0"]},{"id":"20261006000200","filename":"20261006000200_user_identity_discovery_permission_publication.sql","sha256":"fa7d34a7f33044b8ee02478211c67a6c1c36ee64df0e0d2de57a60101d157c22","transactional":true,"preconditions":["database_name=tcdx-grc","postgres_major=16","ledger_count=27","latest_migration=20261006000100","physical_tables=235","published_permissions=168","user_identity_read_permissions=0","canonical_platform_and_tenant_admin_templates=2"],"postconditions":["ledger_outcome=applied","physical_tables=235","published_permissions=169","user_identity_read_permissions=1","platform_admin_grant=1","tenant_admin_template_grant=1","tenant_admin_grant_per_existing_instance=1","unauthorized_grants=0","schema_delta=0"]},{"id":"20261007000100","filename":"20261007000100_platform_tenant_user_onboarding_permission_publication.sql","sha256":"4f91369da1908264eba937e5c9d760a34bcefe3d7de1d726ac558c3f9b138673","transactional":true,"preconditions":["database_name=tcdx-grc","postgres_major=16","ledger_count=28","latest_migration=20261006000200","physical_tables=235","published_permissions=169","tenant_user_onboard_permissions=0","canonical_platform_admin_roles=1"],"postconditions":["ledger_outcome=applied","physical_tables=235","published_permissions=170","tenant_user_onboard_permissions=1","platform_admin_grant=1","unauthorized_grants=0","schema_delta=0"]},{"id":"20261007000200","filename":"20261007000200_phase5_methodology_binding.sql","sha256":"fa178ad731d48045313a11b22f1bdf3c228be502dafa1883136162ad48127850","transactional":true,"preconditions":["database_name=tcdx-grc","postgres_major=16","ledger_count=29","latest_migration=20261007000100","physical_tables=235","published_permissions=170","assessment_rows=0"],"postconditions":["ledger_outcome=applied","physical_tables=237","published_permissions=172","methodologies=two_separate_published_versions","assessment_methodology_fks=validated"]},{"id":"20261009000100","filename":"20261009000100_phase6a3_configuration_integrity.sql","sha256":"b717f0c91f88a4079f791fd68cc08ff5202ef7f0dda6c7cf85ea37cb23441722","transactional":true,"preconditions":["approved macro R1","exact source constraints","compatible existing data; no backfill"],"postconditions":["ledger_outcome=applied","physical_tables=237","published_permissions=172","EC_natural_key=NULLS_NOT_DISTINCT","layer_unique=parent_precedence_ordinal","defaults=exactly_one_compatible_typed_value","existing_records_preserved"]},{"id":"20261009000200","filename":"20261009000200_phase6a3_reference_read_permissions.sql","sha256":"920ececb9d28e3821a9faf9d2c754db481a26c0e33c53ae0f94b3a0535885ed8","transactional":true,"preconditions":["ledger_count=31","published_permissions=172","44 exact baseline role templates","no current candidate permissions"],"postconditions":["ledger_outcome=applied","physical_tables=237","published_permissions=175","new_permissions=3","exact_global_template_pairs=44","no_platform_or_tenant_admin_escalation","existing_baseline_tenant_instances=exact_approved_pairs","no_custom_role_or_membership_grants"]}]$reviewed$::jsonb)
   AS expected(id text,filename text,sha256 text,transactional boolean)
   FULL JOIN (SELECT * FROM platform.schema_migrations WHERE outcome='applied') actual
     ON actual.migration_id=expected.id
   WHERE expected.id IS NULL OR actual.migration_id IS NULL OR actual.filename<>expected.filename
      OR actual.content_sha256<>expected.sha256 OR actual.transactional<>expected.transactional
 ) THEN RAISE EXCEPTION 'COMMERCIAL_REVIEWED_SOURCE_LEDGER_MISMATCH'; END IF;
END; $ledger$;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE platform.commercial_families (
 commercial_family_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
 created_by_user_identity_id uuid,created_by_service_principal_id uuid,
 family_code varchar(96) NOT NULL, name text NOT NULL, source_type varchar(32) NOT NULL, published_at timestamptz NOT NULL, publication_manifest_sha256 char(64) NOT NULL,CONSTRAINT pk_commercial_families PRIMARY KEY(commercial_family_id),
 CONSTRAINT ck_commercial_families__created_actor_one CHECK(num_nonnulls(created_by_user_identity_id,created_by_service_principal_id)<=1),
 CONSTRAINT fk_commercial_families__created_user FOREIGN KEY(created_by_user_identity_id) REFERENCES iam.user_identities(user_identity_id) ON DELETE RESTRICT,
 CONSTRAINT fk_commercial_families__created_service FOREIGN KEY(created_by_service_principal_id) REFERENCES iam.service_principals(service_principal_id) ON DELETE RESTRICT,
 CONSTRAINT uq_commercial_families__family_code UNIQUE(family_code), CONSTRAINT uq_commercial_families__id_source UNIQUE(commercial_family_id,source_type), CONSTRAINT ck_commercial_families__required_text CHECK(btrim(family_code)<>'' AND family_code=btrim(family_code) AND btrim(name)<>'' AND btrim(source_type)<>''), CONSTRAINT ck_commercial_families__manifest_hash CHECK(publication_manifest_sha256 ~ '^[0-9a-f]{64}$')
);

CREATE TABLE platform.regulatory_pack_commercial_family_links (
 regulatory_pack_commercial_family_link_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
 created_by_user_identity_id uuid,created_by_service_principal_id uuid,
 regulatory_pack_id uuid NOT NULL,commercial_family_id uuid NOT NULL,source_type varchar(32) NOT NULL,CONSTRAINT pk_regulatory_pack_commercial_family_links PRIMARY KEY(regulatory_pack_commercial_family_link_id),
 CONSTRAINT ck_regulatory_pack_commercial_family_links__created_actor_one CHECK(num_nonnulls(created_by_user_identity_id,created_by_service_principal_id)<=1),
 CONSTRAINT fk_regulatory_pack_commercial_family_links__created_user FOREIGN KEY(created_by_user_identity_id) REFERENCES iam.user_identities(user_identity_id) ON DELETE RESTRICT,
 CONSTRAINT fk_regulatory_pack_commercial_family_links__created_service FOREIGN KEY(created_by_service_principal_id) REFERENCES iam.service_principals(service_principal_id) ON DELETE RESTRICT,
 CONSTRAINT uq_pack_commercial_family_links__root UNIQUE(regulatory_pack_id)
);

CREATE TABLE platform.plan_version_commercial_family_links (
 plan_version_commercial_family_link_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
 created_by_user_identity_id uuid,created_by_service_principal_id uuid,
 plan_version_id uuid NOT NULL,commercial_family_id uuid NOT NULL,CONSTRAINT pk_plan_version_commercial_family_links PRIMARY KEY(plan_version_commercial_family_link_id),
 CONSTRAINT ck_plan_version_commercial_family_links__created_actor_one CHECK(num_nonnulls(created_by_user_identity_id,created_by_service_principal_id)<=1),
 CONSTRAINT fk_plan_version_commercial_family_links__created_user FOREIGN KEY(created_by_user_identity_id) REFERENCES iam.user_identities(user_identity_id) ON DELETE RESTRICT,
 CONSTRAINT fk_plan_version_commercial_family_links__created_service FOREIGN KEY(created_by_service_principal_id) REFERENCES iam.service_principals(service_principal_id) ON DELETE RESTRICT,
 CONSTRAINT uq_plan_version_family_links__pair UNIQUE(plan_version_id,commercial_family_id)
);


ALTER TABLE regulatory.regulatory_packs ADD CONSTRAINT uq_regulatory_packs__id_source_commercial UNIQUE(regulatory_pack_id,source_type);
ALTER TABLE platform.regulatory_pack_commercial_family_links
 ADD CONSTRAINT fk_pack_family_links__root_source FOREIGN KEY(regulatory_pack_id,source_type) REFERENCES regulatory.regulatory_packs(regulatory_pack_id,source_type) ON DELETE RESTRICT,
 ADD CONSTRAINT fk_pack_family_links__family_source FOREIGN KEY(commercial_family_id,source_type) REFERENCES platform.commercial_families(commercial_family_id,source_type) ON DELETE RESTRICT;
ALTER TABLE platform.plan_version_commercial_family_links
 ADD CONSTRAINT fk_plan_version_family_links__plan_version FOREIGN KEY(plan_version_id) REFERENCES platform.plan_versions(plan_version_id) ON DELETE RESTRICT,
 ADD CONSTRAINT fk_plan_version_family_links__family FOREIGN KEY(commercial_family_id) REFERENCES platform.commercial_families(commercial_family_id) ON DELETE RESTRICT;
ALTER TABLE platform.usage_limits ADD COLUMN commercial_family_id uuid;
ALTER TABLE platform.usage_limits DROP CONSTRAINT uq_usage_limits__limit_code;
ALTER TABLE platform.usage_limits
 ADD CONSTRAINT uq_usage_limits__version_code_family_start UNIQUE NULLS NOT DISTINCT(plan_version_id,limit_code,commercial_family_id,effective_from),
 ADD CONSTRAINT fk_usage_limits__family FOREIGN KEY(commercial_family_id) REFERENCES platform.commercial_families(commercial_family_id) ON DELETE RESTRICT,
 ADD CONSTRAINT fk_usage_limits__version_family FOREIGN KEY(plan_version_id,commercial_family_id) REFERENCES platform.plan_version_commercial_family_links(plan_version_id,commercial_family_id) ON DELETE RESTRICT,
 ADD CONSTRAINT ck_usage_limits__finite_nonnegative CHECK(limit_value::text NOT IN ('NaN','Infinity','-Infinity') AND limit_value>=0),
 ADD CONSTRAINT ck_usage_limits__pack_value_unit CHECK(limit_code<>'regulatory_pack_count' OR (unit='pack' AND trunc(limit_value)=limit_value)),
 ADD CONSTRAINT ck_usage_limits__family_code CHECK(commercial_family_id IS NULL OR limit_code='regulatory_pack_count'),
 ADD CONSTRAINT ex_usage_limits__total_no_overlap EXCLUDE USING gist(plan_version_id WITH =,limit_code WITH =,tstzrange(effective_from,effective_to,'[)') WITH &&) WHERE(commercial_family_id IS NULL),
 ADD CONSTRAINT ex_usage_limits__family_no_overlap EXCLUDE USING gist(plan_version_id WITH =,limit_code WITH =,commercial_family_id WITH =,tstzrange(effective_from,effective_to,'[)') WITH &&) WHERE(commercial_family_id IS NOT NULL);
ALTER TABLE platform.subscriptions
 ADD COLUMN previous_subscription_id uuid,
 ADD CONSTRAINT fk_subscriptions__previous FOREIGN KEY(tenant_id,previous_subscription_id) REFERENCES platform.subscriptions(tenant_id,subscription_id) ON DELETE RESTRICT,
 ADD CONSTRAINT ck_subscriptions__previous_not_self CHECK(previous_subscription_id IS NULL OR previous_subscription_id<>subscription_id),
 ADD CONSTRAINT ex_subscriptions__active_no_overlap EXCLUDE USING gist(tenant_id WITH =,tstzrange(starts_at,ends_at,'[)') WITH &&) WHERE(lifecycle_state='active' AND cancelled_at IS NULL);
CREATE UNIQUE INDEX uq_subscriptions__previous_successor ON platform.subscriptions(tenant_id,previous_subscription_id) WHERE previous_subscription_id IS NOT NULL;
ALTER TABLE regulatory.regulatory_pack_versions ADD CONSTRAINT uq_pack_versions__version_root_commercial UNIQUE(regulatory_pack_version_id,regulatory_pack_id);
ALTER TABLE platform.subscription_regulatory_packs
 ADD COLUMN regulatory_pack_id uuid,
 ADD COLUMN previous_subscription_regulatory_pack_id uuid;
-- Mechanical FK-derived root only. No family, quota, chronology or provenance backfill.
UPDATE platform.subscription_regulatory_packs assignment SET regulatory_pack_id=version.regulatory_pack_id
 FROM regulatory.regulatory_pack_versions version WHERE version.regulatory_pack_version_id=assignment.regulatory_pack_version_id;
ALTER TABLE platform.subscription_regulatory_packs
 ALTER COLUMN regulatory_pack_id SET NOT NULL,
 ADD CONSTRAINT fk_subscription_regulatory_packs__version_root FOREIGN KEY(regulatory_pack_version_id,regulatory_pack_id) REFERENCES regulatory.regulatory_pack_versions(regulatory_pack_version_id,regulatory_pack_id) ON DELETE RESTRICT,
 ADD CONSTRAINT fk_subscription_regulatory_packs__previous FOREIGN KEY(tenant_id,previous_subscription_regulatory_pack_id) REFERENCES platform.subscription_regulatory_packs(tenant_id,subscription_regulatory_pack_id) ON DELETE RESTRICT,
 ADD CONSTRAINT ck_subscription_regulatory_packs__previous_not_self CHECK(previous_subscription_regulatory_pack_id IS NULL OR previous_subscription_regulatory_pack_id<>subscription_regulatory_pack_id);
CREATE UNIQUE INDEX uq_subscription_regulatory_packs__previous_successor ON platform.subscription_regulatory_packs(tenant_id,previous_subscription_regulatory_pack_id) WHERE previous_subscription_regulatory_pack_id IS NOT NULL;
CREATE INDEX ix_subscription_regulatory_packs__root_interval ON platform.subscription_regulatory_packs(subscription_id,regulatory_pack_id,effective_from);
CREATE INDEX ix_subscriptions__tenant_history ON platform.subscriptions(tenant_id,starts_at DESC,subscription_id DESC);
CREATE INDEX ix_plan_version_family_links__family ON platform.plan_version_commercial_family_links(commercial_family_id);

CREATE FUNCTION platform.commercial_immutable_row_guard() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN RAISE EXCEPTION 'COMMERCIAL_IMMUTABLE_RETAIN'; END; $fn$;
CREATE FUNCTION platform.commercial_version_child_guard() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE state text;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'COMMERCIAL_VERSION_CHILD_IMMUTABLE'; END IF;
 SELECT lifecycle_state INTO state FROM platform.plan_versions WHERE plan_version_id=NEW.plan_version_id FOR UPDATE;
 IF state IS NULL OR state='published' THEN RAISE EXCEPTION 'COMMERCIAL_PUBLISHED_VERSION_FROZEN'; END IF;
 RETURN NEW;
END; $fn$;
CREATE TRIGGER commercial_families_immutable BEFORE UPDATE OR DELETE ON platform.commercial_families FOR EACH ROW EXECUTE FUNCTION platform.commercial_immutable_row_guard();
CREATE TRIGGER pack_family_links_immutable BEFORE UPDATE OR DELETE ON platform.regulatory_pack_commercial_family_links FOR EACH ROW EXECUTE FUNCTION platform.commercial_immutable_row_guard();
CREATE TRIGGER plan_family_links_frozen BEFORE INSERT OR UPDATE OR DELETE ON platform.plan_version_commercial_family_links FOR EACH ROW EXECUTE FUNCTION platform.commercial_version_child_guard();
CREATE TRIGGER usage_limits_frozen BEFORE INSERT OR UPDATE OR DELETE ON platform.usage_limits FOR EACH ROW EXECUTE FUNCTION platform.commercial_version_child_guard();
CREATE TRIGGER entitlements_frozen BEFORE INSERT OR UPDATE OR DELETE ON platform.entitlements FOR EACH ROW EXECUTE FUNCTION platform.commercial_version_child_guard();

CREATE FUNCTION platform.commercial_plan_publication_guard() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE family uuid; required_range tstzmultirange; actual_range tstzmultirange; distinct_values bigint;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'COMMERCIAL_VERSION_HISTORY_RETAIN'; END IF;
 IF TG_OP='UPDATE' AND OLD.lifecycle_state='published' AND NEW IS DISTINCT FROM OLD THEN
  RAISE EXCEPTION 'COMMERCIAL_PUBLISHED_VERSION_IMMUTABLE';
 END IF;
 IF NEW.lifecycle_state<>'published' THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN RAISE EXCEPTION 'COMMERCIAL_CREATE_DRAFT_BEFORE_PUBLICATION'; END IF;
 IF OLD.lifecycle_state='published' THEN RETURN NEW; END IF;
 IF NEW.effective_from IS NULL OR NEW.published_at IS NULL THEN RAISE EXCEPTION 'COMMERCIAL_PUBLICATION_INTERVAL_REQUIRED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM platform.plan_version_commercial_family_links WHERE plan_version_id=NEW.plan_version_id) THEN
  RAISE EXCEPTION 'COMMERCIAL_PUBLICATION_FAMILY_REQUIRED';
 END IF;
 required_range:=tstzmultirange(tstzrange(NEW.effective_from,NEW.effective_to,'[)'));
 FOR family IN SELECT NULL::uuid UNION ALL SELECT commercial_family_id FROM platform.plan_version_commercial_family_links WHERE plan_version_id=NEW.plan_version_id LOOP
  SELECT range_agg(tstzrange(effective_from,effective_to,'[)')),count(DISTINCT limit_value)
   INTO actual_range,distinct_values FROM platform.usage_limits WHERE plan_version_id=NEW.plan_version_id
    AND limit_code='regulatory_pack_count' AND commercial_family_id IS NOT DISTINCT FROM family;
  IF actual_range IS DISTINCT FROM required_range OR distinct_values<>1 THEN
   RAISE EXCEPTION 'COMMERCIAL_PUBLICATION_QUOTA_COVERAGE_OR_VALUE_CONFLICT';
  END IF;
 END LOOP;
 RETURN NEW;
END; $fn$;
CREATE TRIGGER plan_versions_commercial_publication BEFORE INSERT OR UPDATE OR DELETE ON platform.plan_versions FOR EACH ROW EXECUTE FUNCTION platform.commercial_plan_publication_guard();

CREATE FUNCTION platform.commercial_assignment_root_guard() RETURNS trigger LANGUAGE plpgsql VOLATILE AS $fn$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'COMMERCIAL_ASSIGNMENT_HISTORY_RETAIN'; END IF;
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'COMMERCIAL_ROOT_REQUIRES_READ_COMMITTED'; END IF;
 PERFORM 1 FROM platform.subscriptions WHERE subscription_id=NEW.subscription_id AND tenant_id=NEW.tenant_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'COMMERCIAL_ASSIGNMENT_PARENT_MISMATCH'; END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.subscription_regulatory_pack_id IS DISTINCT FROM OLD.subscription_regulatory_pack_id
   OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id OR NEW.subscription_id IS DISTINCT FROM OLD.subscription_id
   OR NEW.regulatory_pack_id IS DISTINCT FROM OLD.regulatory_pack_id OR NEW.regulatory_pack_version_id IS DISTINCT FROM OLD.regulatory_pack_version_id
   OR NEW.effective_from IS DISTINCT FROM OLD.effective_from
   OR NEW.previous_subscription_regulatory_pack_id IS DISTINCT FROM OLD.previous_subscription_regulatory_pack_id THEN
   RAISE EXCEPTION 'COMMERCIAL_ASSIGNMENT_IDENTITY_HISTORY_IMMUTABLE';
  END IF;
  IF OLD.effective_to IS NOT NULL AND (NEW.effective_to IS NULL OR NEW.effective_to>OLD.effective_to) THEN
   RAISE EXCEPTION 'COMMERCIAL_ASSIGNMENT_NO_IMPLICIT_EXTENSION';
  END IF;
  IF OLD.lifecycle_state='revoked' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'COMMERCIAL_REVOKED_HISTORY_IMMUTABLE'; END IF;
  RETURN NEW; -- Preserved legitimate history; closure only, never range expansion.
 END IF;
 -- New SELECT after parent lock. Existing historical rows are compared, not rewritten.
 IF EXISTS(SELECT 1 FROM platform.subscription_regulatory_packs existing
  WHERE existing.subscription_id=NEW.subscription_id AND existing.regulatory_pack_id=NEW.regulatory_pack_id
   AND tstzrange(existing.effective_from,existing.effective_to,'[)') && tstzrange(NEW.effective_from,NEW.effective_to,'[)')) THEN
  RAISE EXCEPTION 'COMMERCIAL_NEW_ASSIGNMENT_ROOT_OVERLAP';
 END IF;
 RETURN NEW;
END; $fn$;
CREATE TRIGGER subscription_pack_root_prospective BEFORE INSERT OR UPDATE OR DELETE ON platform.subscription_regulatory_packs FOR EACH ROW EXECUTE FUNCTION platform.commercial_assignment_root_guard();

CREATE FUNCTION platform.commercial_subscription_lineage_guard() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
 IF EXISTS(SELECT 1 FROM platform.subscriptions child JOIN platform.subscriptions parent
  ON parent.subscription_id=child.previous_subscription_id
  WHERE (child.subscription_id=NEW.subscription_id OR parent.subscription_id=NEW.subscription_id)
   AND (child.tenant_id<>parent.tenant_id OR parent.lifecycle_state<>'ended' OR parent.starts_at>=child.starts_at
    OR parent.ends_at IS DISTINCT FROM child.starts_at)) THEN
  RAISE EXCEPTION 'COMMERCIAL_SUBSCRIPTION_LINEAGE_INVALID';
 END IF;
 RETURN NULL;
END; $fn$;
CREATE CONSTRAINT TRIGGER subscription_lineage_consistent AFTER INSERT OR UPDATE ON platform.subscriptions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION platform.commercial_subscription_lineage_guard();

CREATE FUNCTION platform.commercial_pack_lineage_guard() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
 IF EXISTS(SELECT 1 FROM platform.subscription_regulatory_packs child
  JOIN platform.subscription_regulatory_packs parent ON parent.subscription_regulatory_pack_id=child.previous_subscription_regulatory_pack_id
  JOIN platform.subscriptions child_subscription ON child_subscription.subscription_id=child.subscription_id
  WHERE (child.subscription_regulatory_pack_id=NEW.subscription_regulatory_pack_id OR parent.subscription_regulatory_pack_id=NEW.subscription_regulatory_pack_id)
   AND (child.tenant_id<>parent.tenant_id OR child.regulatory_pack_id<>parent.regulatory_pack_id
    OR child.regulatory_pack_version_id<>parent.regulatory_pack_version_id OR parent.lifecycle_state<>'revoked'
    OR parent.effective_to IS DISTINCT FROM child.effective_from OR parent.effective_from>=child.effective_from
    OR child_subscription.previous_subscription_id IS DISTINCT FROM parent.subscription_id
    OR child.effective_from IS DISTINCT FROM child_subscription.starts_at
    OR (child_subscription.ends_at IS NOT NULL AND (child.effective_to IS NULL OR child.effective_to>child_subscription.ends_at)))) THEN
  RAISE EXCEPTION 'COMMERCIAL_PACK_TRANSFER_LINEAGE_INVALID';
 END IF;
 RETURN NULL;
END; $fn$;
CREATE CONSTRAINT TRIGGER pack_transfer_lineage_consistent AFTER INSERT OR UPDATE ON platform.subscription_regulatory_packs DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION platform.commercial_pack_lineage_guard();
-- No catalog data/limits/permissions/grants/actors inserted. Publication has its own gate.
