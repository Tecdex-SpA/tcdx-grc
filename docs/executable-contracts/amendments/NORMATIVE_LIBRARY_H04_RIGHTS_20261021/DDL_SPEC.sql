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
  OR audit_row.event_code<>CASE WHEN TG_OP='UPDATE' THEN 'audit.knowledge.knowledge_source.rights.revoke.v1' ELSE 'audit.knowledge.knowledge_source.rights.record.v1' END
 THEN RAISE EXCEPTION 'canonical rights audit mismatch'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_knowledge_source_usage_rights__integrity BEFORE INSERT OR UPDATE OR DELETE
 ON knowledge.knowledge_source_usage_rights FOR EACH ROW EXECUTE FUNCTION knowledge.enforce_source_usage_rights();
