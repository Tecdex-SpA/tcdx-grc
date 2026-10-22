BEGIN;
ALTER TABLE privacy.retention_policies ADD CONSTRAINT ck_retention_policies__kind_duration_c04w
  CHECK ((policy_kind='legal_hold' AND retention_seconds IS NULL)
      OR (policy_kind<>'legal_hold' AND retention_seconds IS NOT NULL AND retention_seconds>=0)) NOT VALID;
ALTER TABLE privacy.retention_policies VALIDATE CONSTRAINT ck_retention_policies__kind_duration_c04w;
CREATE TABLE privacy.retention_policy_applicabilities (
  retention_policy_applicability_id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  retention_policy_id uuid NOT NULL,
  version_number bigint NOT NULL CHECK (version_number>0),
  classification varchar(32) NOT NULL CHECK (classification IN ('public','internal','confidential','restricted')),
  purpose varchar(32) NOT NULL CHECK (purpose='evidence_document'),
  scope_subject_id uuid,
  processing_activity_id uuid,
  legal_basis_id uuid,
  source_evidence_version_id uuid,
  source_clause_ref text,
  effective_from timestamptz,
  effective_to timestamptz,
  lifecycle_state varchar(32) NOT NULL CHECK (lifecycle_state IN ('draft','under_review','approved','published')),
  published_at timestamptz,
  supersedes_applicability_id uuid,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  created_by_user_identity_id uuid,
  created_by_service_principal_id uuid,
  row_version bigint NOT NULL DEFAULT 1 CHECK (row_version>0),
  CONSTRAINT ck_retention_applicabilities__actor CHECK (num_nonnulls(created_by_user_identity_id,created_by_service_principal_id)=1),
  CONSTRAINT ck_retention_applicabilities__interval CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to>effective_from),
  CONSTRAINT ck_retention_applicabilities__publication CHECK ((lifecycle_state='published')=(published_at IS NOT NULL AND effective_from IS NOT NULL)),
  CONSTRAINT ck_retention_applicabilities__source_clause CHECK (source_clause_ref IS NULL OR source_evidence_version_id IS NOT NULL),
  CONSTRAINT uq_retention_applicabilities__tenant_id UNIQUE (tenant_id,retention_policy_applicability_id),
  CONSTRAINT uq_retention_applicabilities__tenant_policy UNIQUE (tenant_id,retention_policy_applicability_id,retention_policy_id),
  CONSTRAINT uq_retention_applicabilities__version UNIQUE NULLS NOT DISTINCT
    (tenant_id,retention_policy_id,scope_subject_id,processing_activity_id,classification,purpose,version_number),
  CONSTRAINT uq_retention_applicabilities__supersedes UNIQUE (supersedes_applicability_id),
  CONSTRAINT fk_retention_applicabilities__tenant FOREIGN KEY (tenant_id)
    REFERENCES platform.tenants(tenant_id) ON DELETE RESTRICT,
  CONSTRAINT fk_retention_applicabilities__policy FOREIGN KEY (tenant_id,retention_policy_id)
    REFERENCES privacy.retention_policies(tenant_id,retention_policy_id) ON DELETE RESTRICT,
  CONSTRAINT fk_retention_applicabilities__subject FOREIGN KEY (tenant_id,scope_subject_id)
    REFERENCES org.subjects(tenant_id,subject_id) ON DELETE RESTRICT,
  CONSTRAINT fk_retention_applicabilities__activity FOREIGN KEY (tenant_id,processing_activity_id)
    REFERENCES privacy.privacy_processing_activities(tenant_id,privacy_processing_activity_id) ON DELETE RESTRICT,
  CONSTRAINT fk_retention_applicabilities__legal_basis FOREIGN KEY (tenant_id,legal_basis_id)
    REFERENCES privacy.legal_bases(tenant_id,legal_basis_id) ON DELETE RESTRICT,
  CONSTRAINT fk_retention_applicabilities__source FOREIGN KEY (tenant_id,source_evidence_version_id)
    REFERENCES evidence.evidence_versions(tenant_id,evidence_version_id) ON DELETE RESTRICT,
  CONSTRAINT fk_retention_applicabilities__previous FOREIGN KEY (tenant_id,supersedes_applicability_id)
    REFERENCES privacy.retention_policy_applicabilities(tenant_id,retention_policy_applicability_id) ON DELETE RESTRICT,
  CONSTRAINT fk_retention_applicabilities__author_human FOREIGN KEY (created_by_user_identity_id)
    REFERENCES iam.user_identities(user_identity_id) ON DELETE RESTRICT,
  CONSTRAINT fk_retention_applicabilities__author_service FOREIGN KEY (created_by_service_principal_id)
    REFERENCES iam.service_principals(service_principal_id) ON DELETE RESTRICT
);
CREATE INDEX ix_retention_applicabilities__resolution ON privacy.retention_policy_applicabilities
  (tenant_id,classification,purpose,lifecycle_state,effective_from);
CREATE INDEX ix_retention_applicabilities__source ON privacy.retention_policy_applicabilities
  (tenant_id,source_evidence_version_id) WHERE source_evidence_version_id IS NOT NULL;
ALTER TABLE evidence.file_upload_intents ADD COLUMN retention_policy_applicability_id uuid;
ALTER TABLE evidence.file_objects ADD COLUMN retention_policy_applicability_id uuid;
ALTER TABLE evidence.evidence_versions ADD COLUMN retention_policy_applicability_id uuid;
ALTER TABLE evidence.file_upload_intents ADD CONSTRAINT fk_file_upload_intents__retention_applicability
  FOREIGN KEY (tenant_id,retention_policy_applicability_id,retention_policy_id)
  REFERENCES privacy.retention_policy_applicabilities(tenant_id,retention_policy_applicability_id,retention_policy_id)
  ON DELETE RESTRICT NOT VALID;
ALTER TABLE evidence.file_objects ADD CONSTRAINT fk_file_objects__retention_applicability
  FOREIGN KEY (tenant_id,retention_policy_applicability_id,retention_policy_id)
  REFERENCES privacy.retention_policy_applicabilities(tenant_id,retention_policy_applicability_id,retention_policy_id)
  ON DELETE RESTRICT NOT VALID;
ALTER TABLE evidence.evidence_versions ADD CONSTRAINT fk_evidence_versions__retention_applicability
  FOREIGN KEY (tenant_id,retention_policy_applicability_id)
  REFERENCES privacy.retention_policy_applicabilities(tenant_id,retention_policy_applicability_id)
  ON DELETE RESTRICT NOT VALID;
ALTER TABLE evidence.file_upload_intents VALIDATE CONSTRAINT fk_file_upload_intents__retention_applicability;
ALTER TABLE evidence.file_objects VALIDATE CONSTRAINT fk_file_objects__retention_applicability;
ALTER TABLE evidence.evidence_versions VALIDATE CONSTRAINT fk_evidence_versions__retention_applicability;
CREATE INDEX ix_file_upload_intents__retention_applicability ON evidence.file_upload_intents(tenant_id,retention_policy_applicability_id);
CREATE INDEX ix_file_objects__retention_applicability ON evidence.file_objects(tenant_id,retention_policy_applicability_id);
CREATE INDEX ix_evidence_versions__retention_applicability ON evidence.evidence_versions(tenant_id,retention_policy_applicability_id);
CREATE TABLE privacy.retention_policy_hold_releases (
  hold_release_id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  retention_policy_applicability_id uuid NOT NULL,
  released_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  released_by_membership_id uuid NOT NULL,
  reason text NOT NULL CHECK (length(btrim(reason))>0),
  release_source_evidence_version_id uuid,
  audit_event_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT uq_retention_hold_releases__applicability UNIQUE (retention_policy_applicability_id),
  CONSTRAINT fk_retention_hold_releases__tenant FOREIGN KEY (tenant_id)
    REFERENCES platform.tenants(tenant_id) ON DELETE RESTRICT,
  CONSTRAINT fk_retention_hold_releases__applicability FOREIGN KEY (tenant_id,retention_policy_applicability_id)
    REFERENCES privacy.retention_policy_applicabilities(tenant_id,retention_policy_applicability_id) ON DELETE RESTRICT,
  CONSTRAINT fk_retention_hold_releases__membership FOREIGN KEY (tenant_id,released_by_membership_id)
    REFERENCES iam.tenant_memberships(tenant_id,tenant_membership_id) ON DELETE RESTRICT,
  CONSTRAINT fk_retention_hold_releases__source FOREIGN KEY (tenant_id,release_source_evidence_version_id)
    REFERENCES evidence.evidence_versions(tenant_id,evidence_version_id) ON DELETE RESTRICT,
  CONSTRAINT fk_retention_hold_releases__audit FOREIGN KEY (tenant_id,audit_event_id)
    REFERENCES ops_audit.audit_events(tenant_id,audit_event_id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX ix_retention_hold_releases__tenant ON privacy.retention_policy_hold_releases(tenant_id,retention_policy_applicability_id);
-- The lifecycle service remains the only writer of approved transitions. These
-- database guards make publication, source integrity and history fail closed.
CREATE FUNCTION privacy.c04w_guard_applicability() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE policy_row privacy.retention_policies%ROWTYPE;
DECLARE predecessor privacy.retention_policy_applicabilities%ROWTYPE;
DECLARE source_ok boolean;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'C04W_APPLICABILITY_DELETE_DENIED'; END IF;
  IF TG_OP='UPDATE' THEN
    IF OLD.lifecycle_state='published' THEN RAISE EXCEPTION 'C04W_PUBLISHED_IMMUTABLE'; END IF;
    IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id OR NEW.retention_policy_id IS DISTINCT FROM OLD.retention_policy_id
       OR NEW.retention_policy_applicability_id IS DISTINCT FROM OLD.retention_policy_applicability_id
       OR NEW.created_by_user_identity_id IS DISTINCT FROM OLD.created_by_user_identity_id
       OR NEW.created_by_service_principal_id IS DISTINCT FROM OLD.created_by_service_principal_id
       OR NEW.version_number IS DISTINCT FROM OLD.version_number THEN
      RAISE EXCEPTION 'C04W_APPLICABILITY_IDENTITY_IMMUTABLE';
    END IF;
    IF NEW.row_version<>OLD.row_version+1 THEN RAISE EXCEPTION 'C04W_CAS_REQUIRED'; END IF;
    IF (OLD.lifecycle_state,NEW.lifecycle_state) NOT IN
       (('draft','draft'),('draft','under_review'),('under_review','approved'),('approved','published')) THEN
      RAISE EXCEPTION 'C04W_LIFECYCLE_TRANSITION_DENIED';
    END IF;
  ELSIF NEW.lifecycle_state<>'draft' OR NEW.row_version<>1 THEN
    RAISE EXCEPTION 'C04W_APPLICABILITY_INSERT_DRAFT_ONLY';
  END IF;
  SELECT * INTO policy_row FROM privacy.retention_policies
   WHERE tenant_id=NEW.tenant_id AND retention_policy_id=NEW.retention_policy_id FOR SHARE;
  IF NOT FOUND OR policy_row.ownership_class<>'TENANT_OWNED' THEN
    RAISE EXCEPTION 'C04W_TENANT_POLICY_REQUIRED';
  END IF;
  IF NEW.lifecycle_state='published' THEN
    IF policy_row.lifecycle_state<>'published' OR policy_row.effective_from>NEW.effective_from
       OR (policy_row.effective_to IS NOT NULL AND policy_row.effective_to<=NEW.effective_from) THEN
      RAISE EXCEPTION 'C04W_POLICY_NOT_EFFECTIVE';
    END IF;
    IF policy_row.policy_kind='legal_hold' AND NEW.effective_to IS NOT NULL THEN
      RAISE EXCEPTION 'C04W_HOLD_END_DATE_DENIED';
    END IF;
    IF NEW.source_evidence_version_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM evidence.evidence_versions ev
        LEFT JOIN evidence.document_versions dv
          ON dv.tenant_id=ev.tenant_id AND dv.document_version_id=ev.document_version_id
        JOIN evidence.file_objects fo
          ON fo.tenant_id=ev.tenant_id AND fo.file_object_id=COALESCE(ev.file_object_id,dv.file_object_id)
       WHERE ev.tenant_id=NEW.tenant_id AND ev.evidence_version_id=NEW.source_evidence_version_id
         AND ev.lifecycle_state='approved' AND fo.scan_status='passed'
         AND ev.effective_from<=transaction_timestamp()
         AND (ev.effective_to IS NULL OR ev.effective_to>transaction_timestamp())
         AND (ev.expires_at IS NULL OR ev.expires_at>transaction_timestamp())
      ) INTO source_ok;
      IF NOT source_ok THEN RAISE EXCEPTION 'C04W_SOURCE_NOT_APPROVED_OR_SCAN_PASS'; END IF;
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.tenant_id::text||NEW.retention_policy_id::text||
      COALESCE(NEW.scope_subject_id::text,'')||COALESCE(NEW.processing_activity_id::text,'')||
      NEW.classification||NEW.purpose,0));
    IF NEW.supersedes_applicability_id IS NOT NULL THEN
      SELECT * INTO predecessor FROM privacy.retention_policy_applicabilities
       WHERE tenant_id=NEW.tenant_id AND retention_policy_applicability_id=NEW.supersedes_applicability_id FOR SHARE;
      IF NOT FOUND OR predecessor.lifecycle_state<>'published' OR NEW.version_number<>predecessor.version_number+1
         OR NEW.effective_from<=predecessor.effective_from THEN
        RAISE EXCEPTION 'C04W_INVALID_SUCCESSOR';
      END IF;
    ELSIF NEW.version_number<>1 THEN
      RAISE EXCEPTION 'C04W_MISSING_PREDECESSOR';
    END IF;
    IF EXISTS (
      SELECT 1 FROM privacy.retention_policy_applicabilities other
       WHERE other.tenant_id=NEW.tenant_id AND other.retention_policy_id=NEW.retention_policy_id
         AND other.classification=NEW.classification AND other.purpose=NEW.purpose
         AND other.scope_subject_id IS NOT DISTINCT FROM NEW.scope_subject_id
         AND other.processing_activity_id IS NOT DISTINCT FROM NEW.processing_activity_id
         AND other.lifecycle_state='published'
         AND other.retention_policy_applicability_id<>COALESCE(NEW.supersedes_applicability_id,NEW.retention_policy_applicability_id)
         AND NOT EXISTS (SELECT 1 FROM privacy.retention_policy_applicabilities successor
           WHERE successor.supersedes_applicability_id=other.retention_policy_applicability_id
             AND successor.lifecycle_state='published')
    ) THEN RAISE EXCEPTION 'C04W_ACTIVE_SCOPE_CONFLICT'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_c04w_guard_applicability
  BEFORE INSERT OR UPDATE OR DELETE ON privacy.retention_policy_applicabilities
  FOR EACH ROW EXECUTE FUNCTION privacy.c04w_guard_applicability();
CREATE FUNCTION evidence.c04w_guard_file_chain() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE application_policy uuid;
DECLARE application_tenant uuid;
DECLARE file_policy uuid;
DECLARE file_application uuid;
DECLARE evidence_policy uuid;
BEGIN
  IF TG_TABLE_NAME='file_upload_intents' THEN
    IF TG_OP='UPDATE' AND NEW.lifecycle_state='promoted' THEN
      SELECT fo.retention_policy_id,fo.retention_policy_applicability_id
        INTO file_policy,file_application FROM evidence.file_objects fo
       WHERE fo.tenant_id=NEW.tenant_id AND fo.file_object_id=NEW.file_object_id;
      IF file_policy IS DISTINCT FROM NEW.retention_policy_id
         OR file_application IS DISTINCT FROM NEW.retention_policy_applicability_id THEN
        RAISE EXCEPTION 'C04W_INTENT_FILE_CHAIN_MISMATCH';
      END IF;
    END IF;
  END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.retention_policy_applicability_id IS NULL THEN RAISE EXCEPTION 'C04W_NEW_OBJECT_UNBOUND'; END IF;
    IF TG_TABLE_NAME='evidence_versions' THEN
      SELECT e.retention_policy_id INTO evidence_policy FROM evidence.evidences e
       WHERE e.tenant_id=NEW.tenant_id AND e.evidence_id=NEW.evidence_id;
      SELECT fo.retention_policy_id,fo.retention_policy_applicability_id
        INTO file_policy,file_application FROM evidence.file_objects fo
       WHERE fo.tenant_id=NEW.tenant_id
         AND fo.file_object_id=COALESCE(NEW.file_object_id,
           (SELECT dv.file_object_id FROM evidence.document_versions dv
             WHERE dv.tenant_id=NEW.tenant_id AND dv.document_version_id=NEW.document_version_id));
      SELECT a.tenant_id,a.retention_policy_id INTO application_tenant,application_policy
        FROM privacy.retention_policy_applicabilities a
       WHERE a.tenant_id=NEW.tenant_id AND a.retention_policy_applicability_id=NEW.retention_policy_applicability_id;
      IF evidence_policy IS NULL OR file_policy IS NULL OR application_tenant IS NULL
         OR evidence_policy IS DISTINCT FROM file_policy OR evidence_policy IS DISTINCT FROM application_policy
         OR file_application IS DISTINCT FROM NEW.retention_policy_applicability_id THEN
        RAISE EXCEPTION 'C04W_EVIDENCE_CHAIN_MISMATCH';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_c04w_guard_intent BEFORE INSERT OR UPDATE ON evidence.file_upload_intents
  FOR EACH ROW EXECUTE FUNCTION evidence.c04w_guard_file_chain();
CREATE TRIGGER trg_c04w_guard_file BEFORE INSERT ON evidence.file_objects
  FOR EACH ROW EXECUTE FUNCTION evidence.c04w_guard_file_chain();
CREATE TRIGGER trg_c04w_guard_evidence_version BEFORE INSERT ON evidence.evidence_versions
  FOR EACH ROW EXECUTE FUNCTION evidence.c04w_guard_file_chain();
CREATE FUNCTION privacy.c04w_guard_hold_release() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE hold_kind text;
DECLARE hold_state text;
DECLARE hold_author uuid;
DECLARE release_actor uuid;
BEGIN
  IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'C04W_HOLD_RELEASE_IMMUTABLE'; END IF;
  NEW.released_at:=transaction_timestamp();
  NEW.created_at:=NEW.released_at;
  SELECT p.policy_kind,a.lifecycle_state,a.created_by_user_identity_id
    INTO hold_kind,hold_state,hold_author
    FROM privacy.retention_policy_applicabilities a JOIN privacy.retention_policies p
      ON p.tenant_id=a.tenant_id AND p.retention_policy_id=a.retention_policy_id
   WHERE a.tenant_id=NEW.tenant_id AND a.retention_policy_applicability_id=NEW.retention_policy_applicability_id FOR SHARE OF a,p;
  SELECT m.user_identity_id INTO release_actor FROM iam.tenant_memberships m
   WHERE m.tenant_id=NEW.tenant_id AND m.tenant_membership_id=NEW.released_by_membership_id
     AND m.membership_state='active' AND m.ended_at IS NULL;
  IF hold_kind IS DISTINCT FROM 'legal_hold' OR hold_state IS DISTINCT FROM 'published'
     OR release_actor IS NULL OR release_actor=hold_author THEN
    RAISE EXCEPTION 'C04W_HOLD_RELEASE_DENIED';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM iam.membership_roles mr
    JOIN iam.roles r ON r.role_id=mr.role_id AND r.tenant_id=mr.tenant_id
    JOIN iam.role_permissions rp ON rp.role_id=r.role_id AND rp.tenant_id=r.tenant_id
    JOIN iam.permissions perm ON perm.permission_id=rp.permission_id
   WHERE mr.tenant_id=NEW.tenant_id AND mr.tenant_membership_id=NEW.released_by_membership_id
     AND mr.scope_kind='tenant' AND mr.valid_from<=transaction_timestamp()
     AND (mr.valid_to IS NULL OR mr.valid_to>transaction_timestamp())
     AND r.ownership_class='TENANT_OWNED' AND r.role_code='LEGAL_REVIEWER'
     AND r.lifecycle_state='published'
     AND perm.permission_code='privacy.retention_policy.legal_hold.release'
     AND perm.lifecycle_state='published'
  ) THEN RAISE EXCEPTION 'C04W_RELEASE_ROLE_PERMISSION_DENIED'; END IF;
  IF NEW.release_source_evidence_version_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM evidence.evidence_versions ev
    LEFT JOIN evidence.document_versions dv
      ON dv.tenant_id=ev.tenant_id AND dv.document_version_id=ev.document_version_id
    JOIN evidence.file_objects fo
      ON fo.tenant_id=ev.tenant_id AND fo.file_object_id=COALESCE(ev.file_object_id,dv.file_object_id)
   WHERE ev.tenant_id=NEW.tenant_id
     AND ev.evidence_version_id=NEW.release_source_evidence_version_id
     AND ev.lifecycle_state='approved' AND fo.scan_status='passed'
     AND ev.effective_from<=transaction_timestamp()
     AND (ev.effective_to IS NULL OR ev.effective_to>transaction_timestamp())
     AND (ev.expires_at IS NULL OR ev.expires_at>transaction_timestamp())
  ) THEN RAISE EXCEPTION 'C04W_RELEASE_SOURCE_NOT_APPROVED_OR_SCAN_PASS'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_c04w_guard_hold_release
  BEFORE INSERT OR UPDATE OR DELETE ON privacy.retention_policy_hold_releases
  FOR EACH ROW EXECUTE FUNCTION privacy.c04w_guard_hold_release();
COMMIT;