-- P1/P2/T1 local-only successor; canonical runner, fresh disposable PG16 only.
ALTER TABLE regulatory.regulatory_import_manifests ADD CONSTRAINT uq_import_manifests__pack_import_source UNIQUE(regulatory_pack_version_id,regulatory_import_manifest_id,regulatory_source_id);
ALTER TABLE regulatory.regulatory_coverage_manifests ADD CONSTRAINT uq_coverage_manifests__pack_manifest UNIQUE(regulatory_pack_version_id,regulatory_coverage_manifest_id);
ALTER TABLE iam.platform_role_assignments ADD CONSTRAINT uq_platform_role_assignments__actor_role UNIQUE(platform_role_assignment_id,user_identity_id,role_id);
ALTER TABLE iam.roles ADD CONSTRAINT uq_roles__id_code UNIQUE(role_id,role_code);

CREATE TABLE regulatory.regulatory_pack_validation_receipts (
 regulatory_pack_validation_receipt_id uuid NOT NULL,
 ownership_class varchar(24) NOT NULL DEFAULT 'PLATFORM_CONTROL',
 created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
 created_by_user_identity_id uuid NOT NULL,
 regulatory_pack_version_id uuid NOT NULL,
 regulatory_import_manifest_id uuid NOT NULL,
 regulatory_source_id uuid NOT NULL,
 regulatory_coverage_manifest_id uuid NOT NULL,
 knowledge_source_id uuid,
 source_edition varchar(128) NOT NULL,
 import_checksum char(64) NOT NULL,
 content_hash char(64) NOT NULL,
 population_hash char(64) NOT NULL,
 validation_kind varchar(16) NOT NULL,
 decision varchar(16) NOT NULL,
 role_id uuid NOT NULL,
 role_code varchar(64) NOT NULL,
 platform_role_assignment_id uuid NOT NULL,
 rationale text NOT NULL,
 audit_event_id uuid NOT NULL,
 supersedes_validation_receipt_id uuid,
 CONSTRAINT pk_regulatory_pack_validation_receipts PRIMARY KEY(regulatory_pack_validation_receipt_id),
 CONSTRAINT ck_validation_receipts__ownership CHECK(ownership_class='PLATFORM_CONTROL'),
 CONSTRAINT ck_validation_receipts__hashes CHECK(import_checksum ~ '^[a-f0-9]{64}$' AND content_hash ~ '^[a-f0-9]{64}$' AND population_hash ~ '^[a-f0-9]{64}$'),
 CONSTRAINT ck_validation_receipts__kind CHECK(validation_kind IN ('source','edition','package')),
 CONSTRAINT ck_validation_receipts__decision CHECK(decision IN ('approved','rejected')),
 CONSTRAINT ck_validation_receipts__role CHECK(role_code IN ('REGULATORY_CONTENT_STEWARD','COMPLIANCE_MANAGER','QUALITY_MANAGER','CISO_SECURITY_MANAGER','AI_GOVERNANCE_MANAGER','PRIVACY_MANAGER','LEGAL_REVIEWER')),
 CONSTRAINT ck_validation_receipts__rationale CHECK(length(btrim(rationale)) BETWEEN 1 AND 2000),
 CONSTRAINT ck_validation_receipts__source_link CHECK((validation_kind='source' AND decision='approved' AND knowledge_source_id IS NOT NULL) OR (NOT(validation_kind='source' AND decision='approved') AND knowledge_source_id IS NULL)),
 CONSTRAINT fk_validation_receipts__import FOREIGN KEY(regulatory_pack_version_id,regulatory_import_manifest_id,regulatory_source_id) REFERENCES regulatory.regulatory_import_manifests(regulatory_pack_version_id,regulatory_import_manifest_id,regulatory_source_id),
 CONSTRAINT fk_validation_receipts__coverage FOREIGN KEY(regulatory_pack_version_id,regulatory_coverage_manifest_id) REFERENCES regulatory.regulatory_coverage_manifests(regulatory_pack_version_id,regulatory_coverage_manifest_id),
 CONSTRAINT fk_validation_receipts__knowledge_source FOREIGN KEY(knowledge_source_id) REFERENCES knowledge.knowledge_sources(knowledge_source_id),
 CONSTRAINT fk_validation_receipts__actor_role FOREIGN KEY(platform_role_assignment_id,created_by_user_identity_id,role_id) REFERENCES iam.platform_role_assignments(platform_role_assignment_id,user_identity_id,role_id),
 CONSTRAINT fk_validation_receipts__role_code FOREIGN KEY(role_id,role_code) REFERENCES iam.roles(role_id,role_code),
 CONSTRAINT fk_validation_receipts__audit FOREIGN KEY(audit_event_id) REFERENCES ops_audit.audit_events(audit_event_id) DEFERRABLE INITIALLY DEFERRED,
 CONSTRAINT fk_validation_receipts__supersedes FOREIGN KEY(supersedes_validation_receipt_id) REFERENCES regulatory.regulatory_pack_validation_receipts(regulatory_pack_validation_receipt_id),
 CONSTRAINT uq_validation_receipts__single_successor UNIQUE(supersedes_validation_receipt_id)
);
CREATE INDEX ix_validation_receipts__pack ON regulatory.regulatory_pack_validation_receipts(regulatory_pack_version_id,validation_kind,role_code);
CREATE INDEX ix_validation_receipts__source ON regulatory.regulatory_pack_validation_receipts(regulatory_source_id);
CREATE UNIQUE INDEX uq_validation_receipts__root ON regulatory.regulatory_pack_validation_receipts(regulatory_pack_version_id,regulatory_import_manifest_id,validation_kind,role_code) WHERE supersedes_validation_receipt_id IS NULL;
CREATE INDEX ix_validation_receipts__knowledge_source ON regulatory.regulatory_pack_validation_receipts(knowledge_source_id) WHERE knowledge_source_id IS NOT NULL;

CREATE FUNCTION regulatory.reject_validation_receipt_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'immutable regulatory validation receipt' USING ERRCODE='23514'; END $$;
CREATE TRIGGER tr_validation_receipts__immutable BEFORE UPDATE OR DELETE ON regulatory.regulatory_pack_validation_receipts FOR EACH ROW EXECUTE FUNCTION regulatory.reject_validation_receipt_mutation();

CREATE FUNCTION regulatory.validate_receipt_links() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE predecessor regulatory.regulatory_pack_validation_receipts%ROWTYPE;
BEGIN
 IF NEW.knowledge_source_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM knowledge.knowledge_sources s WHERE s.knowledge_source_id=NEW.knowledge_source_id AND s.tenant_id IS NULL AND s.ownership_class IN ('GLOBAL_REFERENCE','PLATFORM_CONTROL')) THEN
  RAISE EXCEPTION 'validation source must be global' USING ERRCODE='23514';
 END IF;
 IF NEW.supersedes_validation_receipt_id IS NOT NULL THEN
  SELECT * INTO predecessor FROM regulatory.regulatory_pack_validation_receipts WHERE regulatory_pack_validation_receipt_id=NEW.supersedes_validation_receipt_id;
  IF NOT FOUND OR predecessor.regulatory_pack_version_id<>NEW.regulatory_pack_version_id OR predecessor.regulatory_import_manifest_id<>NEW.regulatory_import_manifest_id OR predecessor.validation_kind<>NEW.validation_kind OR predecessor.role_code<>NEW.role_code THEN
   RAISE EXCEPTION 'invalid validation receipt succession' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER tr_validation_receipts__links BEFORE INSERT ON regulatory.regulatory_pack_validation_receipts FOR EACH ROW EXECUTE FUNCTION regulatory.validate_receipt_links();

CREATE FUNCTION regulatory.validate_receipt_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM ops_audit.audit_events a WHERE a.audit_event_id=NEW.audit_event_id AND a.aggregate_type='RegulatoryPackVersion' AND a.aggregate_id=NEW.regulatory_pack_version_id AND a.actor_user_identity_id=NEW.created_by_user_identity_id AND a.ownership_class='PLATFORM_CONTROL' AND a.tenant_id IS NULL AND a.outcome='succeeded' AND a.event_code='audit.knowledge.regulatory_pack.validation.create.v1' AND a.after_payload->>'regulatory_pack_validation_receipt_id'=NEW.regulatory_pack_validation_receipt_id::text AND a.after_payload->>'population_hash'=NEW.population_hash) THEN
  RAISE EXCEPTION 'missing exact validation audit' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER tr_validation_receipts__audit AFTER INSERT ON regulatory.regulatory_pack_validation_receipts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION regulatory.validate_receipt_audit();

ALTER TABLE platform.subscriptions ADD COLUMN tenant_creation_ticket_document_version_id uuid;
ALTER TABLE platform.subscriptions ADD CONSTRAINT fk_subscriptions__ticket_document_version FOREIGN KEY(tenant_id,tenant_creation_ticket_document_version_id) REFERENCES evidence.document_versions(tenant_id,document_version_id);
CREATE INDEX ix_subscriptions__ticket_document_version ON platform.subscriptions(tenant_id,tenant_creation_ticket_document_version_id) WHERE tenant_creation_ticket_document_version_id IS NOT NULL;
ALTER TABLE evidence.document_versions ADD CONSTRAINT uq_document_versions__document_version UNIQUE(document_id,version_number);
ALTER TABLE evidence.document_versions DROP CONSTRAINT uq_document_versions__version_number;
