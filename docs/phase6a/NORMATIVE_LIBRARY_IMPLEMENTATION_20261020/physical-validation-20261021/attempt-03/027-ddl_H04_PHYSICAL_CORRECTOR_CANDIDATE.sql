BEGIN;
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

COMMIT;