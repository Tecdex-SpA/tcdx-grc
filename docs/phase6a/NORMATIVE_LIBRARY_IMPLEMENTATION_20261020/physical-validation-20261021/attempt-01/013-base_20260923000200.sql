BEGIN;
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
COMMIT;