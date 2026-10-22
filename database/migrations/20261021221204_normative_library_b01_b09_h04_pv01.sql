-- Prepared canonical migration candidate; NOT REGISTERED OR EXECUTED.
-- Exact published DDL sequence; transaction and ledger belong to the canonical runner.
-- DDL SPECIFICATION ONLY. NOT EXECUTED. No migration ledger entry is created.
-- Target PostgreSQL 16. Exact application requires a separate PO migration order and real preflight.
CREATE TABLE knowledge.knowledge_version_context_links (
 knowledge_version_context_link_id uuid PRIMARY KEY,
 created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
 created_by_user_identity_id uuid NOT NULL REFERENCES iam.user_identities(user_identity_id) ON DELETE RESTRICT,
 ownership_class varchar(24) NOT NULL,
 tenant_id uuid REFERENCES platform.tenants(tenant_id) ON DELETE RESTRICT,
 knowledge_version_id uuid NOT NULL REFERENCES knowledge.knowledge_versions(knowledge_version_id) ON DELETE RESTRICT,
 normative_unit_id uuid REFERENCES regulatory.normative_units(normative_unit_id) ON DELETE RESTRICT,
 requirement_id uuid REFERENCES regulatory.requirements(requirement_id) ON DELETE RESTRICT,
 control_version_id uuid REFERENCES controls.control_versions(control_version_id) ON DELETE RESTRICT,
 subject_id uuid REFERENCES org.subjects(subject_id) ON DELETE RESTRICT,
 context_role varchar(32) NOT NULL,
 source_locator text NOT NULL,
 provenance_ref text NOT NULL,
 excerpt_hash char(64),
 CONSTRAINT ck_knowledge_context__target_xor CHECK (num_nonnulls(normative_unit_id,requirement_id,control_version_id,subject_id)=1),
 CONSTRAINT ck_knowledge_context__ownership CHECK (ownership_class IN ('GLOBAL_REFERENCE','PLATFORM_CONTROL','TENANT_OWNED')),
 CONSTRAINT ck_knowledge_context__tenant CHECK ((ownership_class='TENANT_OWNED')=(tenant_id IS NOT NULL)),
 CONSTRAINT ck_knowledge_context__role CHECK (context_role IN ('comprender','implementar','demostrar','contexto_empresarial')),
 CONSTRAINT ck_knowledge_context__context CHECK (context_role<>'contexto_empresarial' OR subject_id IS NOT NULL),
 CONSTRAINT ck_knowledge_context__locator CHECK (btrim(source_locator)<>'' AND btrim(provenance_ref)<>''),
 CONSTRAINT uq_knowledge_context__semantic UNIQUE NULLS NOT DISTINCT
 (knowledge_version_id,context_role,normative_unit_id,requirement_id,control_version_id,subject_id)
);
CREATE INDEX ix_knowledge_context__tenant_version ON knowledge.knowledge_version_context_links(tenant_id,knowledge_version_id);
CREATE INDEX ix_knowledge_context__unit ON knowledge.knowledge_version_context_links(normative_unit_id) WHERE normative_unit_id IS NOT NULL;
CREATE INDEX ix_knowledge_context__requirement ON knowledge.knowledge_version_context_links(requirement_id) WHERE requirement_id IS NOT NULL;
CREATE INDEX ix_knowledge_context__control ON knowledge.knowledge_version_context_links(control_version_id) WHERE control_version_id IS NOT NULL;
CREATE INDEX ix_knowledge_context__subject ON knowledge.knowledge_version_context_links(tenant_id,subject_id) WHERE subject_id IS NOT NULL;

ALTER TABLE knowledge.knowledge_versions DROP CONSTRAINT uq_knowledge_versions__version_number;
ALTER TABLE knowledge.knowledge_versions ADD CONSTRAINT uq_knowledge_versions__item_version UNIQUE(knowledge_item_id,version_number);
ALTER TABLE config.configuration_overrides ADD COLUMN control_version_id uuid;
ALTER TABLE config.configuration_overrides ADD COLUMN supersedes_configuration_override_id uuid;
ALTER TABLE config.configuration_overrides ADD CONSTRAINT fk_config_override__control FOREIGN KEY(tenant_id,control_version_id) REFERENCES controls.control_versions(tenant_id,control_version_id) ON DELETE RESTRICT;
ALTER TABLE config.configuration_overrides ADD CONSTRAINT fk_config_override__previous FOREIGN KEY(tenant_id,supersedes_configuration_override_id) REFERENCES config.configuration_overrides(tenant_id,configuration_override_id) ON DELETE RESTRICT;
ALTER TABLE config.configuration_overrides ADD CONSTRAINT ck_config_override__control_scope CHECK
 ((scope_level<>'control_version' OR (control_version_id IS NOT NULL AND tenant_id IS NOT NULL AND ownership_class='TENANT_OWNED' AND num_nonnulls(methodology_id,regulatory_pack_version_id,scope_subject_id)=0))
 AND (control_version_id IS NULL OR scope_level='control_version')
 AND (supersedes_configuration_override_id IS NULL OR (scope_level='control_version' AND supersedes_configuration_override_id<>configuration_override_id)));
CREATE UNIQUE INDEX uq_config_override__control_revision ON config.configuration_overrides(tenant_id,configuration_definition_id,control_version_id,override_version,effective_from) WHERE scope_level='control_version';
CREATE UNIQUE INDEX uq_config_override__approved_successor ON config.configuration_overrides(tenant_id,supersedes_configuration_override_id) WHERE scope_level='control_version' AND lifecycle_state='approved' AND supersedes_configuration_override_id IS NOT NULL;
CREATE INDEX ix_config_override__control_interval ON config.configuration_overrides(tenant_id,control_version_id,configuration_definition_id,effective_from,effective_to);
ALTER TABLE config.effective_configurations ADD COLUMN control_version_id uuid;
ALTER TABLE config.effective_configurations ADD CONSTRAINT fk_effective_config__control FOREIGN KEY(tenant_id,control_version_id) REFERENCES controls.control_versions(tenant_id,control_version_id) ON DELETE RESTRICT;
ALTER TABLE config.effective_configurations ADD CONSTRAINT ck_effective_config__control_scope CHECK(control_version_id IS NULL OR resolved_for_subject_id IS NULL);
CREATE UNIQUE INDEX uq_effective_config__control_inputs ON config.effective_configurations(tenant_id,configuration_definition_id,control_version_id,effective_at,input_hash) WHERE control_version_id IS NOT NULL;
ALTER TABLE regulatory.requirement_applicabilities ADD COLUMN context_knowledge_version_id uuid;
ALTER TABLE regulatory.requirement_applicabilities ADD CONSTRAINT fk_applicability__context FOREIGN KEY(tenant_id,context_knowledge_version_id) REFERENCES knowledge.knowledge_versions(tenant_id,knowledge_version_id) ON DELETE RESTRICT;
CREATE INDEX ix_applicability__context ON regulatory.requirement_applicabilities(tenant_id,context_knowledge_version_id) WHERE context_knowledge_version_id IS NOT NULL;

-- Cross-table ownership is not expressible as a CHECK. A deferred constraint trigger checks it.
CREATE FUNCTION knowledge.check_context_link() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v knowledge.knowledge_versions%ROWTYPE; target_tenant uuid;
BEGIN
 SELECT * INTO STRICT v FROM knowledge.knowledge_versions WHERE knowledge_version_id=NEW.knowledge_version_id FOR SHARE;
 IF v.ownership_class<>NEW.ownership_class OR v.tenant_id IS DISTINCT FROM NEW.tenant_id THEN RAISE EXCEPTION 'knowledge source ownership mismatch' USING ERRCODE='23514'; END IF;
 IF NEW.normative_unit_id IS NOT NULL THEN SELECT tenant_id INTO target_tenant FROM regulatory.normative_units WHERE normative_unit_id=NEW.normative_unit_id FOR SHARE;
 ELSIF NEW.requirement_id IS NOT NULL THEN SELECT tenant_id INTO target_tenant FROM regulatory.requirements WHERE requirement_id=NEW.requirement_id FOR SHARE;
 ELSIF NEW.control_version_id IS NOT NULL THEN SELECT tenant_id INTO target_tenant FROM controls.control_versions WHERE control_version_id=NEW.control_version_id FOR SHARE;
 ELSE SELECT tenant_id INTO target_tenant FROM org.subjects WHERE subject_id=NEW.subject_id FOR SHARE; END IF;
 IF target_tenant IS NOT NULL AND target_tenant IS DISTINCT FROM NEW.tenant_id THEN RAISE EXCEPTION 'private target mismatch' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER ck_knowledge_context__compatibility AFTER INSERT OR UPDATE ON knowledge.knowledge_version_context_links DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION knowledge.check_context_link();

CREATE FUNCTION knowledge.guard_context_link() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE rec record;
BEGIN
 -- Lock source(s) in canonical order; check BOTH parents on attempted reparenting.
 FOR rec IN SELECT knowledge_version_id,lifecycle_state,published_at FROM knowledge.knowledge_versions
 WHERE knowledge_version_id IN (CASE WHEN TG_OP<>'DELETE' THEN NEW.knowledge_version_id END,CASE WHEN TG_OP<>'INSERT' THEN OLD.knowledge_version_id END)
 ORDER BY knowledge_version_id FOR UPDATE LOOP
  IF rec.published_at IS NOT NULL OR rec.lifecycle_state='published' THEN RAISE EXCEPTION 'published knowledge links immutable' USING ERRCODE='23514'; END IF;
 END LOOP;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER ck_knowledge_context__immutable BEFORE INSERT OR UPDATE OR DELETE ON knowledge.knowledge_version_context_links FOR EACH ROW EXECUTE FUNCTION knowledge.guard_context_link();

-- Required parent tenant keys cannot drift while referenced. Global->private changes also fail.
CREATE FUNCTION knowledge.guard_context_target_owner() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE keyname text; idvalue uuid; linked boolean;
BEGIN
 keyname:=TG_ARGV[0]; idvalue:=(to_jsonb(OLD)->>keyname)::uuid;
 IF NEW.tenant_id IS NOT DISTINCT FROM OLD.tenant_id AND (to_jsonb(NEW)->>'ownership_class') IS NOT DISTINCT FROM (to_jsonb(OLD)->>'ownership_class') THEN RETURN NEW; END IF;
 -- Tenant/ownership keys are canonical immutable keys, including concurrent new links.
 RAISE EXCEPTION 'ownership keys immutable' USING ERRCODE='23514';
 RETURN NEW;
END $$;
CREATE TRIGGER ck_context_target__unit BEFORE UPDATE OF tenant_id,ownership_class ON regulatory.normative_units FOR EACH ROW EXECUTE FUNCTION knowledge.guard_context_target_owner('normative_unit_id');
CREATE TRIGGER ck_context_target__requirement BEFORE UPDATE OF tenant_id,ownership_class ON regulatory.requirements FOR EACH ROW EXECUTE FUNCTION knowledge.guard_context_target_owner('requirement_id');
CREATE TRIGGER ck_context_target__control BEFORE UPDATE OF tenant_id,ownership_class ON controls.control_versions FOR EACH ROW EXECUTE FUNCTION knowledge.guard_context_target_owner('control_version_id');
CREATE TRIGGER ck_context_target__subject BEFORE UPDATE OF tenant_id ON org.subjects FOR EACH ROW EXECUTE FUNCTION knowledge.guard_context_target_owner('subject_id');

-- Full command-time predicates and publication guards are specified in INVARIANTS.json.
-- They require authenticated actors, registry, AuditEvent/outbox/idempotency and rights; SQL cannot grant authority.
-- Their implementation and PG positive/negative validation remain reserved to the migration/implementation order.

CREATE TRIGGER ck_context_source__owner BEFORE UPDATE OF tenant_id,ownership_class ON knowledge.knowledge_versions FOR EACH ROW EXECUTE FUNCTION knowledge.guard_context_target_owner('knowledge_version_id');

CREATE FUNCTION knowledge.guard_published_version_core() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE successor knowledge.knowledge_versions%ROWTYPE;
BEGIN
 IF OLD.published_at IS NULL AND OLD.lifecycle_state<>'published' THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'published knowledge immutable' USING ERRCODE='23514'; END IF;
 IF (to_jsonb(NEW)-'superseded_by_id') IS DISTINCT FROM (to_jsonb(OLD)-'superseded_by_id') THEN RAISE EXCEPTION 'published core immutable' USING ERRCODE='23514'; END IF;
 IF NEW.superseded_by_id IS DISTINCT FROM OLD.superseded_by_id THEN
  IF OLD.superseded_by_id IS NOT NULL OR NEW.superseded_by_id IS NULL THEN RAISE EXCEPTION 'supersession immutable' USING ERRCODE='23514'; END IF;
  SELECT * INTO STRICT successor FROM knowledge.knowledge_versions WHERE knowledge_version_id=NEW.superseded_by_id FOR SHARE;
  IF successor.knowledge_item_id<>OLD.knowledge_item_id OR successor.version_number<=OLD.version_number OR successor.lifecycle_state<>'published' OR successor.published_at IS NULL OR successor.effective_from IS NULL OR OLD.effective_from IS NULL OR successor.effective_from<=OLD.effective_from OR successor.tenant_id IS DISTINCT FROM OLD.tenant_id OR successor.ownership_class<>OLD.ownership_class THEN RAISE EXCEPTION 'invalid supersession' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER ck_knowledge_version__published_core BEFORE UPDATE OR DELETE ON knowledge.knowledge_versions FOR EACH ROW EXECUTE FUNCTION knowledge.guard_published_version_core();

CREATE FUNCTION config.guard_control_override_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.scope_level='control_version' AND OLD.lifecycle_state IN ('approved','rejected') THEN RAISE EXCEPTION 'decided override immutable' USING ERRCODE='23514'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER ck_control_override__history BEFORE UPDATE OR DELETE ON config.configuration_overrides FOR EACH ROW EXECUTE FUNCTION config.guard_control_override_history();

CREATE FUNCTION config.check_control_override_successor() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE predecessor config.configuration_overrides%ROWTYPE;
BEGIN
 IF NEW.supersedes_configuration_override_id IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO STRICT predecessor FROM config.configuration_overrides WHERE configuration_override_id=NEW.supersedes_configuration_override_id FOR SHARE;
 IF predecessor.tenant_id IS DISTINCT FROM NEW.tenant_id OR predecessor.configuration_definition_id<>NEW.configuration_definition_id OR predecessor.control_version_id IS DISTINCT FROM NEW.control_version_id OR predecessor.lifecycle_state<>'approved' OR predecessor.override_version>=NEW.override_version OR NEW.effective_from<=predecessor.effective_from OR NEW.effective_from>=predecessor.effective_to THEN RAISE EXCEPTION 'invalid override predecessor' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER ck_control_override__succession AFTER INSERT OR UPDATE ON config.configuration_overrides DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION config.check_control_override_successor();

CREATE FUNCTION regulatory.guard_context_decision_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.lifecycle_state<>'draft' AND NEW.context_knowledge_version_id IS DISTINCT FROM OLD.context_knowledge_version_id THEN RAISE EXCEPTION 'decided context immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER ck_applicability__context_history BEFORE UPDATE OF context_knowledge_version_id ON regulatory.requirement_applicabilities FOR EACH ROW EXECUTE FUNCTION regulatory.guard_context_decision_history();

-- SPECIFICATION ONLY. No migration ledger, bootstrap, pipeline or runtime execution.
CREATE TABLE knowledge.knowledge_source_usage_rights (
 knowledge_source_usage_right_id uuid PRIMARY KEY,
 created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
 created_by_user_identity_id uuid NOT NULL REFERENCES iam.user_identities(user_identity_id) ON DELETE RESTRICT,
 ownership_class varchar(24) NOT NULL,
 tenant_id uuid REFERENCES platform.tenants(tenant_id) ON DELETE RESTRICT,
 knowledge_source_id uuid NOT NULL REFERENCES knowledge.knowledge_sources(knowledge_source_id) ON DELETE RESTRICT,
 audience_tenant_id uuid REFERENCES platform.tenants(tenant_id) ON DELETE RESTRICT,
 content_hash char(64) NOT NULL,
 edition_ref text NOT NULL,
 regulatory_pack_version_id uuid REFERENCES regulatory.regulatory_pack_versions(regulatory_pack_version_id) ON DELETE RESTRICT,
 use_act varchar(24) NOT NULL,
 use_environment varchar(16) NOT NULL,
 content_kind varchar(24) NOT NULL,
 effective_from timestamptz NOT NULL,
 effective_to timestamptz NOT NULL,
 evidence_ref text NOT NULL,
 evidence_hash char(64) NOT NULL,
 recorded_audit_event_id uuid NOT NULL REFERENCES ops_audit.audit_events(audit_event_id) ON DELETE RESTRICT,
 revoked_at timestamptz,
 revoked_audit_event_id uuid REFERENCES ops_audit.audit_events(audit_event_id) ON DELETE RESTRICT,
 CONSTRAINT ck_knowledge_source_usage_rights__ownership CHECK (ownership_class IN ('GLOBAL_REFERENCE','PLATFORM_CONTROL','TENANT_OWNED') AND (ownership_class='TENANT_OWNED')=(tenant_id IS NOT NULL)),
 CONSTRAINT ck_knowledge_source_usage_rights__tenant CHECK (tenant_id IS NULL OR audience_tenant_id=tenant_id),
 CONSTRAINT ck_knowledge_source_usage_rights__tenant_audience CHECK (tenant_id IS NULL OR audience_tenant_id IS NOT NULL),
 CONSTRAINT ck_knowledge_source_usage_rights__act CHECK (use_act IN ('consultation','extraction','storage','presentation','export','import','publication')),
 CONSTRAINT ck_knowledge_source_usage_rights__environment CHECK (use_environment IN ('development','test','qa','production')),
 CONSTRAINT ck_knowledge_source_usage_rights__content CHECK (content_kind IN ('metadata','editorial','tenant_context','third_party')),
 CONSTRAINT ck_knowledge_source_usage_rights__hashes CHECK (content_hash ~ '^[a-f0-9]{64}$' AND evidence_hash ~ '^[a-f0-9]{64}$'),
 CONSTRAINT ck_knowledge_source_usage_rights__interval CHECK (effective_from<effective_to),
 CONSTRAINT ck_knowledge_source_usage_rights__evidence CHECK (btrim(edition_ref)<>'' AND btrim(evidence_ref)<>''),
 CONSTRAINT ck_knowledge_source_usage_rights__revocation CHECK ((revoked_at IS NULL)=(revoked_audit_event_id IS NULL) AND (revoked_at IS NULL OR revoked_at>=created_at))
);
CREATE INDEX ix_knowledge_source_usage_rights__lookup ON knowledge.knowledge_source_usage_rights
 (knowledge_source_id,content_hash,audience_tenant_id,use_act,use_environment,regulatory_pack_version_id,effective_from,effective_to);

CREATE FUNCTION knowledge.enforce_source_usage_rights() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source_row record; audit_row record; pack_tenant uuid;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'immutable rights history'; END IF;
 IF TG_OP='UPDATE' THEN
  IF OLD.revoked_at IS NOT NULL OR NEW.revoked_at IS NULL OR NEW.revoked_audit_event_id IS NULL
   OR (to_jsonb(NEW)-'revoked_at'-'revoked_audit_event_id') IS DISTINCT FROM (to_jsonb(OLD)-'revoked_at'-'revoked_audit_event_id')
  THEN RAISE EXCEPTION 'only first audited revocation is allowed'; END IF;
 END IF;
 SELECT ownership_class,tenant_id INTO STRICT source_row FROM knowledge.knowledge_sources WHERE knowledge_source_id=NEW.knowledge_source_id FOR SHARE;
 IF source_row.ownership_class<>NEW.ownership_class OR source_row.tenant_id IS DISTINCT FROM NEW.tenant_id THEN RAISE EXCEPTION 'source ownership mismatch'; END IF;
 IF NEW.regulatory_pack_version_id IS NOT NULL THEN
  SELECT tenant_id INTO STRICT pack_tenant FROM regulatory.regulatory_pack_versions WHERE regulatory_pack_version_id=NEW.regulatory_pack_version_id FOR SHARE;
  IF pack_tenant IS NOT NULL AND pack_tenant IS DISTINCT FROM NEW.tenant_id THEN RAISE EXCEPTION 'pack ownership mismatch'; END IF;
 END IF;
 SELECT aggregate_type,aggregate_id,ownership_class,tenant_id,event_code,outcome,actor_user_identity_id,after_payload INTO STRICT audit_row
 FROM ops_audit.audit_events WHERE audit_event_id=CASE WHEN TG_OP='UPDATE' THEN NEW.revoked_audit_event_id ELSE NEW.recorded_audit_event_id END FOR SHARE;
 IF audit_row.aggregate_type<>'KnowledgeSource' OR audit_row.aggregate_id<>NEW.knowledge_source_id
  OR audit_row.ownership_class<>NEW.ownership_class OR audit_row.tenant_id IS DISTINCT FROM NEW.tenant_id
  OR audit_row.outcome<>'succeeded' OR audit_row.actor_user_identity_id IS NULL
  OR (TG_OP='INSERT' AND audit_row.actor_user_identity_id<>NEW.created_by_user_identity_id)
  OR audit_row.after_payload->>'knowledge_source_usage_right_id' IS DISTINCT FROM NEW.knowledge_source_usage_right_id::text
  OR audit_row.after_payload->>'evidence_hash' IS DISTINCT FROM NEW.evidence_hash
  OR audit_row.event_code<>(CASE WHEN TG_OP='UPDATE' THEN 'audit.knowledge.knowledge_source.rights.revoke.v1' ELSE 'audit.knowledge.knowledge_source.rights.record.v1' END)
 THEN RAISE EXCEPTION 'canonical rights audit mismatch'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_knowledge_source_usage_rights__integrity BEFORE INSERT OR UPDATE OR DELETE
 ON knowledge.knowledge_source_usage_rights FOR EACH ROW EXECUTE FUNCTION knowledge.enforce_source_usage_rights();

-- CANDIDATE CORRECTOR ONLY. No publication, migration registration or runtime activation.
-- Apply after the effective B01-B09 and H04 specification in an authorized isolated test only.
CREATE OR REPLACE FUNCTION knowledge.enforce_source_usage_rights() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source_row record; audit_row record;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'immutable rights history'; END IF;
 IF TG_OP='UPDATE' THEN
  IF OLD.revoked_at IS NOT NULL OR NEW.revoked_at IS NULL OR NEW.revoked_audit_event_id IS NULL
   OR (to_jsonb(NEW)-'revoked_at'-'revoked_audit_event_id') IS DISTINCT FROM (to_jsonb(OLD)-'revoked_at'-'revoked_audit_event_id')
  THEN RAISE EXCEPTION 'only first audited revocation is allowed'; END IF;
 END IF;
 SELECT ownership_class,tenant_id INTO STRICT source_row FROM knowledge.knowledge_sources WHERE knowledge_source_id=NEW.knowledge_source_id FOR SHARE;
 IF source_row.ownership_class<>NEW.ownership_class OR source_row.tenant_id IS DISTINCT FROM NEW.tenant_id THEN RAISE EXCEPTION 'source ownership mismatch'; END IF;
 IF NEW.regulatory_pack_version_id IS NOT NULL THEN
  -- The canonical pack/version catalog has no tenant/ownership columns.
  -- Lock the exact global package; the existing FK rejects an unknown id.
  PERFORM regulatory_pack_version_id FROM regulatory.regulatory_pack_versions WHERE regulatory_pack_version_id=NEW.regulatory_pack_version_id FOR SHARE;
 END IF;
 SELECT aggregate_type,aggregate_id,ownership_class,tenant_id,event_code,outcome,actor_user_identity_id,after_payload INTO STRICT audit_row
 FROM ops_audit.audit_events WHERE audit_event_id=CASE WHEN TG_OP='UPDATE' THEN NEW.revoked_audit_event_id ELSE NEW.recorded_audit_event_id END FOR SHARE;
 IF audit_row.aggregate_type<>'KnowledgeSource' OR audit_row.aggregate_id<>NEW.knowledge_source_id
  OR audit_row.ownership_class<>NEW.ownership_class OR audit_row.tenant_id IS DISTINCT FROM NEW.tenant_id
  OR audit_row.outcome<>'succeeded' OR audit_row.actor_user_identity_id IS NULL
  OR (TG_OP='INSERT' AND audit_row.actor_user_identity_id<>NEW.created_by_user_identity_id)
  OR audit_row.after_payload->>'knowledge_source_usage_right_id' IS DISTINCT FROM NEW.knowledge_source_usage_right_id::text
  OR audit_row.after_payload->>'evidence_hash' IS DISTINCT FROM NEW.evidence_hash
  OR audit_row.event_code<>(CASE WHEN TG_OP='UPDATE' THEN 'audit.knowledge.knowledge_source.rights.revoke.v1' ELSE 'audit.knowledge.knowledge_source.rights.record.v1' END)
 THEN RAISE EXCEPTION 'canonical rights audit mismatch'; END IF;
 RETURN NEW;
END $$;

