-- Phase 5 human-approved RetentionPolicy physical reconciliation and lifecycle.
-- PostgreSQL 16; forward-only, transactional and fail-closed.
DO $$
DECLARE
  ledger_rows integer;
  physical_rows integer;
BEGIN
  IF current_database() <> 'tcdx-grc'
     OR current_setting('server_version_num')::integer / 10000 <> 16 THEN
    RAISE EXCEPTION 'PHASE5_RETENTION_POLICY_TARGET_IDENTITY_MISMATCH';
  END IF;

  SELECT count(*) INTO ledger_rows
    FROM platform.schema_migrations
   WHERE outcome = 'applied';
  IF ledger_rows <> 15 OR NOT EXISTS (
    SELECT 1 FROM platform.schema_migrations
     WHERE migration_id = '20260924000100' AND outcome = 'applied'
  ) THEN
    RAISE EXCEPTION 'PHASE5_RETENTION_POLICY_EXPECTED_15_APPLIED_MIGRATIONS';
  END IF;

  SELECT count(*) INTO physical_rows
    FROM pg_catalog.pg_tables
   WHERE schemaname IN ('platform','iam','org','regulatory','controls','evidence','remediation','risk','audit','operations','third_party','resilience','privacy','survey','data','config','rules','integration','reporting','knowledge','ai','notification','ops_audit')
     AND NOT (schemaname = 'platform' AND tablename = 'schema_migrations');
  IF physical_rows <> 231 THEN
    RAISE EXCEPTION 'PHASE5_RETENTION_POLICY_EXPECTED_231_TABLES: %', physical_rows;
  END IF;

  IF to_regclass('privacy.retention_policies') IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'privacy' AND table_name = 'retention_policies'
          AND column_name = 'lifecycle_state' AND is_nullable = 'NO'
     ) THEN
    RAISE EXCEPTION 'PHASE5_RETENTION_POLICY_MISSING_CANONICAL_LIFECYCLE_STATE';
  END IF;

  IF EXISTS (
       SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'privacy' AND table_name = 'retention_policies'
          AND column_name = 'row_version'
     )
     OR (SELECT is_nullable FROM information_schema.columns
          WHERE table_schema = 'privacy' AND table_name = 'retention_policies'
            AND column_name = 'effective_from') <> 'NO'
     OR (SELECT is_nullable FROM information_schema.columns
          WHERE table_schema = 'privacy' AND table_name = 'retention_policies'
            AND column_name = 'effective_to') <> 'NO' THEN
    RAISE EXCEPTION 'PHASE5_RETENTION_POLICY_PHYSICAL_PRECONDITION_FAILED';
  END IF;

  IF (SELECT count(*) FROM iam.permissions
       WHERE permission_code IN (
         'privacy.retention_policy.review',
         'privacy.retention_policy.approve',
         'privacy.retention_policy.publish'
       ) AND lifecycle_state = 'published') <> 3 THEN
    RAISE EXCEPTION 'PHASE5_RETENTION_POLICY_REQUIRED_PERMISSIONS_NOT_PUBLISHED';
  END IF;
END $$;

ALTER TABLE privacy.retention_policies
  ALTER COLUMN effective_from DROP NOT NULL,
  ALTER COLUMN effective_to DROP NOT NULL,
  ADD COLUMN row_version bigint NOT NULL DEFAULT 1;

ALTER TABLE privacy.retention_policies
  ADD CONSTRAINT ck_retention_policies__row_version_positive
    CHECK (row_version > 0),
  ADD CONSTRAINT ck_retention_policies__policy_kind
    CHECK (policy_kind IN (
      'legal_hold',
      'mandatory_regulatory_policy',
      'contractual_policy',
      'tenant_policy',
      'product_baseline'
    )),
  ADD CONSTRAINT ck_retention_policies__precedence_rank
    CHECK (
      (policy_kind = 'legal_hold' AND precedence_rank = 500)
      OR (policy_kind = 'mandatory_regulatory_policy' AND precedence_rank = 400)
      OR (policy_kind = 'contractual_policy' AND precedence_rank = 300)
      OR (policy_kind = 'tenant_policy' AND precedence_rank = 200)
      OR (policy_kind = 'product_baseline' AND precedence_rank = 100)
    ),
  ADD CONSTRAINT ck_retention_policies__trigger_event
    CHECK (trigger_event_code = 'expiry_or_closure'),
  ADD CONSTRAINT ck_retention_policies__lifecycle
    CHECK (lifecycle_state IN ('draft','under_review','approved','published')),
  ADD CONSTRAINT ck_retention_policies__publication_effective_from
    CHECK (
      (lifecycle_state = 'published' AND effective_from IS NOT NULL)
      OR (lifecycle_state IN ('draft','under_review','approved') AND effective_from IS NULL)
    );

INSERT INTO ops_audit.lifecycle_transition_definitions
  (lifecycle_transition_definition_id,created_at,created_by_user_identity_id,created_by_service_principal_id,
   entity_type,version_number,from_state,command_code,to_state,precondition_policy_ref,permission_id,
   sod_policy_ref,audit_event_code,notification_policy_ref,recalculation_policy_ref,idempotency_semantics,
   concurrency_semantics,system_actor_allowed,lifecycle_state,published_at)
SELECT
  '01a0d10a-0000-7000-8000-000000000001','2026-09-24T00:00:00.000Z',NULL,NULL,
  'RetentionPolicy',1,'draft','retention_policy.review','under_review',
  'contract:phase5:retention-policy-review:v1',p.permission_id,
  'contract:default-deny-sod:v1',
  'audit.privacy.retention_policy.review.v1',
  'NONE_CONTRACTUALLY_REQUIRED','NONE_CONTRACTUALLY_REQUIRED',
  'IDEMPOTENCY_KEY_REQUIRED','ROW_VERSION_COMPARE_AND_SWAP',false,'published','2026-09-24T00:00:00.000Z'
FROM iam.permissions p
WHERE p.permission_code = 'privacy.retention_policy.review'
ON CONFLICT DO NOTHING;

INSERT INTO ops_audit.lifecycle_transition_definitions
  (lifecycle_transition_definition_id,created_at,created_by_user_identity_id,created_by_service_principal_id,
   entity_type,version_number,from_state,command_code,to_state,precondition_policy_ref,permission_id,
   sod_policy_ref,audit_event_code,notification_policy_ref,recalculation_policy_ref,idempotency_semantics,
   concurrency_semantics,system_actor_allowed,lifecycle_state,published_at)
SELECT
  '01a0d10a-0000-7000-8000-000000000002','2026-09-24T00:00:00.000Z',NULL,NULL,
  'RetentionPolicy',1,'under_review','retention_policy.approve','approved',
  'contract:phase5:retention-policy-approve:v1',p.permission_id,
  'contract:retention-policy-author-approver-distinct:v1',
  'audit.privacy.retention_policy.approve.v1',
  'NONE_CONTRACTUALLY_REQUIRED','NONE_CONTRACTUALLY_REQUIRED',
  'IDEMPOTENCY_KEY_REQUIRED','ROW_VERSION_COMPARE_AND_SWAP',false,'published','2026-09-24T00:00:00.000Z'
FROM iam.permissions p
WHERE p.permission_code = 'privacy.retention_policy.approve'
ON CONFLICT DO NOTHING;

INSERT INTO ops_audit.lifecycle_transition_definitions
  (lifecycle_transition_definition_id,created_at,created_by_user_identity_id,created_by_service_principal_id,
   entity_type,version_number,from_state,command_code,to_state,precondition_policy_ref,permission_id,
   sod_policy_ref,audit_event_code,notification_policy_ref,recalculation_policy_ref,idempotency_semantics,
   concurrency_semantics,system_actor_allowed,lifecycle_state,published_at)
SELECT
  '01a0d10a-0000-7000-8000-000000000003','2026-09-24T00:00:00.000Z',NULL,NULL,
  'RetentionPolicy',1,'approved','retention_policy.publish','published',
  'contract:phase5:retention-policy-publish:v1',p.permission_id,
  'contract:default-deny-sod:v1',
  'audit.privacy.retention_policy.publish.v1',
  'NONE_CONTRACTUALLY_REQUIRED','NONE_CONTRACTUALLY_REQUIRED',
  'IDEMPOTENCY_KEY_REQUIRED','ROW_VERSION_COMPARE_AND_SWAP',false,'published','2026-09-24T00:00:00.000Z'
FROM iam.permissions p
WHERE p.permission_code = 'privacy.retention_policy.publish'
ON CONFLICT DO NOTHING;

INSERT INTO ops_audit.lifecycle_transition_scopes
  (lifecycle_transition_scope_id,created_at,created_by_user_identity_id,created_by_service_principal_id,
   lifecycle_transition_definition_id,scope_kind)
VALUES
  ('01a0d10a-0000-7000-8000-000000000011','2026-09-24T00:00:00.000Z',NULL,NULL,'01a0d10a-0000-7000-8000-000000000001','tenant'),
  ('01a0d10a-0000-7000-8000-000000000012','2026-09-24T00:00:00.000Z',NULL,NULL,'01a0d10a-0000-7000-8000-000000000002','tenant'),
  ('01a0d10a-0000-7000-8000-000000000013','2026-09-24T00:00:00.000Z',NULL,NULL,'01a0d10a-0000-7000-8000-000000000003','tenant')
ON CONFLICT DO NOTHING;

INSERT INTO ops_audit.lifecycle_transition_side_effects
  (lifecycle_transition_side_effect_id,created_at,created_by_user_identity_id,created_by_service_principal_id,
   lifecycle_transition_definition_id,event_code,ordinal,is_required)
VALUES
  ('01a0d10a-0000-7000-8000-000000000021','2026-09-24T00:00:00.000Z',NULL,NULL,
   '01a0d10a-0000-7000-8000-000000000003','privacy.retention_policy.published.v1',1,true)
ON CONFLICT DO NOTHING;

DO $$
DECLARE physical_rows integer;
BEGIN
  SELECT count(*) INTO physical_rows
    FROM pg_catalog.pg_tables
   WHERE schemaname IN ('platform','iam','org','regulatory','controls','evidence','remediation','risk','audit','operations','third_party','resilience','privacy','survey','data','config','rules','integration','reporting','knowledge','ai','notification','ops_audit')
     AND NOT (schemaname = 'platform' AND tablename = 'schema_migrations');
  IF physical_rows <> 231 THEN
    RAISE EXCEPTION 'PHASE5_RETENTION_POLICY_CHANGED_TABLE_COUNT: %', physical_rows;
  END IF;

  IF (SELECT is_nullable FROM information_schema.columns
       WHERE table_schema = 'privacy' AND table_name = 'retention_policies'
         AND column_name = 'effective_from') <> 'YES'
     OR (SELECT is_nullable FROM information_schema.columns
          WHERE table_schema = 'privacy' AND table_name = 'retention_policies'
            AND column_name = 'effective_to') <> 'YES'
     OR NOT EXISTS (
       SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'privacy' AND table_name = 'retention_policies'
          AND column_name = 'row_version' AND data_type = 'bigint'
          AND is_nullable = 'NO' AND column_default = '1'
     ) THEN
    RAISE EXCEPTION 'PHASE5_RETENTION_POLICY_PHYSICAL_POSTCONDITION_FAILED';
  END IF;

  IF (SELECT count(*) FROM ops_audit.lifecycle_transition_definitions
       WHERE lifecycle_transition_definition_id IN (
         '01a0d10a-0000-7000-8000-000000000001',
         '01a0d10a-0000-7000-8000-000000000002',
         '01a0d10a-0000-7000-8000-000000000003'
       ) AND lifecycle_state = 'published') <> 3 THEN
    RAISE EXCEPTION 'PHASE5_RETENTION_POLICY_LIFECYCLE_POSTCONDITION_FAILED';
  END IF;
END $$;
