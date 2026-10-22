BEGIN;
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
COMMIT;