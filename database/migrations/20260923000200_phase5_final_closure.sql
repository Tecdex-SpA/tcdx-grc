-- Phase 5 final human-approved closure: FileUploadIntent and immutable lifecycle amendments.
-- PostgreSQL 16; forward-only, transactional and fail-closed.
DO $$
DECLARE physical_table_count integer; ledger_count integer;
BEGIN
  IF current_database() <> 'tcdx-grc' OR current_setting('server_version_num')::integer / 10000 <> 16 THEN
    RAISE EXCEPTION 'PHASE5_FINAL_TARGET_IDENTITY_MISMATCH';
  END IF;
  SELECT count(*) INTO ledger_count FROM platform.schema_migrations WHERE outcome='applied';
  IF ledger_count <> 13 OR NOT EXISTS (
    SELECT 1 FROM platform.schema_migrations WHERE migration_id='20260923000100' AND outcome='applied'
  ) THEN RAISE EXCEPTION 'PHASE5_FINAL_LEDGER_PRECONDITION_FAILED'; END IF;
  SELECT count(*) INTO physical_table_count FROM pg_catalog.pg_tables
   WHERE schemaname IN ('platform','iam','org','regulatory','controls','evidence','remediation','risk','audit','operations','third_party','resilience','privacy','survey','data','config','rules','integration','reporting','knowledge','ai','notification','ops_audit')
     AND NOT (schemaname='platform' AND tablename='schema_migrations');
  IF physical_table_count <> 230 OR to_regclass('evidence.file_upload_intents') IS NOT NULL THEN
    RAISE EXCEPTION 'PHASE5_FINAL_SCHEMA_PRECONDITION_FAILED';
  END IF;
END $$;

CREATE TABLE "evidence"."file_upload_intents" (
  "file_upload_intent_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_identity_id" uuid,
  "created_by_service_principal_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_user_identity_id" uuid,
  "updated_by_service_principal_id" uuid,
  "row_version" bigint NOT NULL DEFAULT 1,
  "tenant_id" uuid NOT NULL,
  "purpose" varchar(32) NOT NULL,
  "original_filename" text NOT NULL,
  "declared_mime" varchar(255) NOT NULL,
  "expected_size_bytes" bigint NOT NULL,
  "classification" varchar(32) NOT NULL,
  "retention_policy_id" uuid NOT NULL,
  "source_provenance" text NOT NULL,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  "quarantine_object_key" text NOT NULL,
  "lifecycle_state" varchar(32) NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "uploaded_at" timestamptz,
  "scan_started_at" timestamptz,
  "scan_completed_at" timestamptz,
  "promoted_at" timestamptz,
  "rejected_at" timestamptz,
  "expired_at" timestamptz,
  "cancelled_at" timestamptz,
  "file_object_id" uuid,
  CONSTRAINT "pk_file_upload_intents" PRIMARY KEY ("file_upload_intent_id"),
  CONSTRAINT "uq_file_upload_intents__tenant_id_file_upload_intent_id" UNIQUE NULLS NOT DISTINCT ("tenant_id", "file_upload_intent_id"),
  CONSTRAINT "uq_file_upload_intents__quarantine_object_key" UNIQUE ("quarantine_object_key"),
  CONSTRAINT "uq_file_upload_intents__file_object_id" UNIQUE ("file_object_id"),
  CONSTRAINT "ck_file_upload_intents__created_actor_one" CHECK (num_nonnulls("created_by_user_identity_id", "created_by_service_principal_id") <= 1),
  CONSTRAINT "ck_file_upload_intents__updated_actor_one" CHECK (num_nonnulls("updated_by_user_identity_id", "updated_by_service_principal_id") <= 1),
  CONSTRAINT "ck_file_upload_intents__row_version_positive" CHECK ("row_version" > 0),
  CONSTRAINT "ck_file_upload_intents__purpose" CHECK ("purpose" = 'evidence_document'),
  CONSTRAINT "ck_file_upload_intents__size_nonnegative" CHECK ("expected_size_bytes" >= 0),
  CONSTRAINT "ck_file_upload_intents__classification" CHECK ("classification" IN ('public','internal','confidential','restricted')),
  CONSTRAINT "ck_file_upload_intents__effective_from_effective_to" CHECK ("effective_to" IS NULL OR "effective_from" IS NULL OR "effective_to" > "effective_from"),
  CONSTRAINT "ck_file_upload_intents__lifecycle" CHECK ("lifecycle_state" IN ('pending_upload','quarantined','scanning','promoted','rejected','expired','cancelled')),
  CONSTRAINT "ck_file_upload_intents__expiry" CHECK ("expires_at" > "created_at"),
  CONSTRAINT "ck_file_upload_intents__terminal_state" CHECK (
    ("lifecycle_state"='pending_upload' AND "file_object_id" IS NULL AND "promoted_at" IS NULL AND "rejected_at" IS NULL AND "expired_at" IS NULL AND "cancelled_at" IS NULL)
    OR ("lifecycle_state"='quarantined' AND "uploaded_at" IS NOT NULL AND "file_object_id" IS NULL)
    OR ("lifecycle_state"='scanning' AND "uploaded_at" IS NOT NULL AND "scan_started_at" IS NOT NULL AND "file_object_id" IS NULL)
    OR ("lifecycle_state"='promoted' AND "uploaded_at" IS NOT NULL AND "scan_started_at" IS NOT NULL AND "scan_completed_at" IS NOT NULL AND "promoted_at" IS NOT NULL AND "file_object_id" IS NOT NULL)
    OR ("lifecycle_state"='rejected' AND "rejected_at" IS NOT NULL AND "file_object_id" IS NULL)
    OR ("lifecycle_state"='expired' AND "expired_at" IS NOT NULL AND "file_object_id" IS NULL)
    OR ("lifecycle_state"='cancelled' AND "cancelled_at" IS NOT NULL AND "file_object_id" IS NULL)
  ),
  CONSTRAINT "fk_file_upload_intents__tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants" ("tenant_id") ON UPDATE NO ACTION ON DELETE RESTRICT,
  CONSTRAINT "fk_file_upload_intents__created_by_user_identity_id" FOREIGN KEY ("created_by_user_identity_id") REFERENCES "iam"."user_identities" ("user_identity_id") ON UPDATE NO ACTION ON DELETE RESTRICT,
  CONSTRAINT "fk_file_upload_intents__created_by_service_principal_id" FOREIGN KEY ("created_by_service_principal_id") REFERENCES "iam"."service_principals" ("service_principal_id") ON UPDATE NO ACTION ON DELETE RESTRICT,
  CONSTRAINT "fk_file_upload_intents__updated_by_user_identity_id" FOREIGN KEY ("updated_by_user_identity_id") REFERENCES "iam"."user_identities" ("user_identity_id") ON UPDATE NO ACTION ON DELETE RESTRICT,
  CONSTRAINT "fk_file_upload_intents__updated_by_service_principal_id" FOREIGN KEY ("updated_by_service_principal_id") REFERENCES "iam"."service_principals" ("service_principal_id") ON UPDATE NO ACTION ON DELETE RESTRICT,
  CONSTRAINT "fk_file_upload_intents__retention_policy_id" FOREIGN KEY ("retention_policy_id") REFERENCES "privacy"."retention_policies" ("retention_policy_id") ON UPDATE NO ACTION ON DELETE RESTRICT,
  CONSTRAINT "fk_file_upload_intents__file_object_id" FOREIGN KEY ("tenant_id", "file_object_id") REFERENCES "evidence"."file_objects" ("tenant_id", "file_object_id") ON UPDATE NO ACTION ON DELETE RESTRICT
);

CREATE INDEX "ix_file_upload_intents__tenant_state_expiry" ON "evidence"."file_upload_intents" ("tenant_id", "lifecycle_state", "expires_at");
CREATE INDEX "ix_file_upload_intents__created_by_user_identity_id" ON "evidence"."file_upload_intents" ("created_by_user_identity_id");
CREATE INDEX "ix_file_upload_intents__retention_policy_id" ON "evidence"."file_upload_intents" ("retention_policy_id");

INSERT INTO ops_audit.lifecycle_transition_definitions
  (lifecycle_transition_definition_id,created_at,created_by_user_identity_id,created_by_service_principal_id,entity_type,version_number,from_state,command_code,to_state,precondition_policy_ref,permission_id,sod_policy_ref,audit_event_code,notification_policy_ref,recalculation_policy_ref,idempotency_semantics,concurrency_semantics,system_actor_allowed,lifecycle_state,published_at)
SELECT '01a0d007-e6db-7552-8fd1-a99b5248bf7d','2026-09-23T00:00:00.000Z',NULL,NULL,'EvidenceRequest',2,'open','evidence_request.fulfill','fulfilled','contract:phase5-final:evidence-request-fulfill:v2',p.permission_id,'contract:default-deny-sod:v1','audit.lifecycle.evidence_request.fulfill.v1','NONE_CONTRACTUALLY_REQUIRED','NONE_CONTRACTUALLY_REQUIRED','IDEMPOTENCY_KEY_REQUIRED','ROW_VERSION_COMPARE_AND_SWAP',false,'published','2026-09-23T00:00:00.000Z'
FROM iam.permissions p WHERE p.permission_code='evidence.evidence_request.submit' ON CONFLICT DO NOTHING;

INSERT INTO ops_audit.lifecycle_transition_scopes (lifecycle_transition_scope_id,created_at,created_by_user_identity_id,created_by_service_principal_id,lifecycle_transition_definition_id,scope_kind) VALUES
('01a0d007-e6dc-72c9-b0f7-0081215d097f','2026-09-23T00:00:00.000Z',NULL,NULL,'01a0d007-e6db-7552-8fd1-a99b5248bf7d','assigned_object'),
('01a0d007-e6dc-72c9-b0f7-06bef4d54124','2026-09-23T00:00:00.000Z',NULL,NULL,'01a0d007-e6db-7552-8fd1-a99b5248bf7d','tenant')
ON CONFLICT DO NOTHING;

INSERT INTO ops_audit.lifecycle_transition_side_effects (lifecycle_transition_side_effect_id,created_at,created_by_user_identity_id,created_by_service_principal_id,lifecycle_transition_definition_id,event_code,ordinal,is_required) VALUES
('01a0d007-e6dc-72c9-b0f7-0990fa496a96','2026-09-23T00:00:00.000Z',NULL,NULL,'01a0d007-e6db-7552-8fd1-a99b5248bf7d','evidence.request.fulfilled.v1',1,true)
ON CONFLICT DO NOTHING;

INSERT INTO ops_audit.lifecycle_transition_definitions
  (lifecycle_transition_definition_id,created_at,created_by_user_identity_id,created_by_service_principal_id,entity_type,version_number,from_state,command_code,to_state,precondition_policy_ref,permission_id,sod_policy_ref,audit_event_code,notification_policy_ref,recalculation_policy_ref,idempotency_semantics,concurrency_semantics,system_actor_allowed,lifecycle_state,published_at)
SELECT '01a0d007-e6dc-72c9-b0f7-0e63b15b035b','2026-09-23T00:00:00.000Z',NULL,NULL,'ControlAssessment',3,'in_progress','control_assessment.complete','completed','contract:phase5-final:control-assessment-complete:v3',p.permission_id,'contract:default-deny-sod:v1','audit.controls.control_assessment.complete.v1','NONE_CONTRACTUALLY_REQUIRED','NONE_CONTRACTUALLY_REQUIRED','IDEMPOTENCY_KEY_REQUIRED','ROW_VERSION_COMPARE_AND_SWAP',false,'published','2026-09-23T00:00:00.000Z'
FROM iam.permissions p WHERE p.permission_code='controls.control_assessment.submit' ON CONFLICT DO NOTHING;

INSERT INTO ops_audit.lifecycle_transition_scopes (lifecycle_transition_scope_id,created_at,created_by_user_identity_id,created_by_service_principal_id,lifecycle_transition_definition_id,scope_kind) VALUES
('01a0d007-e6dc-72c9-b0f7-12eb26a0ccf2','2026-09-23T00:00:00.000Z',NULL,NULL,'01a0d007-e6dc-72c9-b0f7-0e63b15b035b','owned_object'),
('01a0d007-e6dc-72c9-b0f7-14e9b8804138','2026-09-23T00:00:00.000Z',NULL,NULL,'01a0d007-e6dc-72c9-b0f7-0e63b15b035b','tenant')
ON CONFLICT DO NOTHING;

INSERT INTO ops_audit.lifecycle_transition_side_effects (lifecycle_transition_side_effect_id,created_at,created_by_user_identity_id,created_by_service_principal_id,lifecycle_transition_definition_id,event_code,ordinal,is_required) VALUES
('01a0d007-e6dc-72c9-b0f7-1b7065ce1d43','2026-09-23T00:00:00.000Z',NULL,NULL,'01a0d007-e6dc-72c9-b0f7-0e63b15b035b','controls.control_assessment.completed.v1',1,true)
ON CONFLICT DO NOTHING;

DO $$
DECLARE physical_table_count integer;
BEGIN
  SELECT count(*) INTO physical_table_count FROM pg_catalog.pg_tables
   WHERE schemaname IN ('platform','iam','org','regulatory','controls','evidence','remediation','risk','audit','operations','third_party','resilience','privacy','survey','data','config','rules','integration','reporting','knowledge','ai','notification','ops_audit')
     AND NOT (schemaname='platform' AND tablename='schema_migrations');
  IF physical_table_count <> 231 THEN RAISE EXCEPTION 'PHASE5_FINAL_POSTCONDITION_EXPECTED_231_TABLES'; END IF;
  IF (SELECT count(*) FROM ops_audit.lifecycle_transition_definitions WHERE lifecycle_transition_definition_id IN ('01a0d007-e6db-7552-8fd1-a99b5248bf7d','01a0d007-e6dc-72c9-b0f7-0e63b15b035b')) <> 2 THEN
    RAISE EXCEPTION 'PHASE5_FINAL_LIFECYCLE_POSTCONDITION_FAILED';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='evidence' AND table_name='file_upload_intents' AND column_name IN ('blob','content','access_key','secret_key','signed_url','credential')) THEN
    RAISE EXCEPTION 'PHASE5_FINAL_FORBIDDEN_SECRET_OR_BLOB_COLUMN';
  END IF;
END $$;
