-- Human Phase 5 decision 2026-09-28: ControlAssessment Start is tenant scoped.
-- Publish a new immutable lifecycle definition; retain historical versions.
DO $$
BEGIN
  IF current_database() <> 'tcdx-grc' OR current_setting('server_version_num')::integer / 10000 <> 16 THEN
    RAISE EXCEPTION 'PHASE5_CONTROL_START_TARGET_IDENTITY_MISMATCH';
  END IF;
  IF (SELECT count(*) FROM platform.schema_migrations WHERE outcome='applied') <> 20
    OR NOT EXISTS (SELECT 1 FROM platform.schema_migrations WHERE migration_id='20260928000200'
      AND outcome='applied' AND content_sha256='d47e4fa07250092c5b8c063a60713528627acee864f93278b3c5f0ed5dd57cdc')
  THEN RAISE EXCEPTION 'PHASE5_CONTROL_START_EXPECTED_20_APPLIED'; END IF;
  IF (SELECT count(*) FROM iam.permissions WHERE permission_code='controls.control_assessment.update' AND lifecycle_state='published') <> 1
    OR (SELECT count(*) FROM iam.role_permissions rp JOIN iam.roles r ON r.role_id=rp.role_id
      JOIN iam.permissions p ON p.permission_id=rp.permission_id
      WHERE r.role_code='CONTROL_OWNER' AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL
        AND p.permission_code='controls.control_assessment.update') <> 1
  THEN RAISE EXCEPTION 'PHASE5_CONTROL_START_CANONICAL_GRANT_MISSING'; END IF;
  IF (SELECT count(*) FROM ops_audit.lifecycle_transition_definitions
      WHERE entity_type='ControlAssessment' AND from_state='planned' AND command_code='control_assessment.start'
        AND version_number=2 AND lifecycle_state='published') <> 1
    OR EXISTS (SELECT 1 FROM ops_audit.lifecycle_transition_definitions
      WHERE entity_type='ControlAssessment' AND from_state='planned' AND command_code='control_assessment.start'
        AND version_number>=3)
  THEN RAISE EXCEPTION 'PHASE5_CONTROL_START_LIFECYCLE_PRECONDITION_FAILED'; END IF;
END $$;

INSERT INTO ops_audit.lifecycle_transition_definitions
  (lifecycle_transition_definition_id,created_at,created_by_user_identity_id,created_by_service_principal_id,
   entity_type,version_number,from_state,command_code,to_state,precondition_policy_ref,permission_id,
   sod_policy_ref,audit_event_code,notification_policy_ref,recalculation_policy_ref,idempotency_semantics,
   concurrency_semantics,system_actor_allowed,lifecycle_state,published_at)
SELECT '01a0da03-0000-7000-8000-000000000001',transaction_timestamp(),NULL,NULL,
  'ControlAssessment',3,'planned','control_assessment.start','in_progress',
  'contract:phase5:control-assessment-start:tenant:v3',p.permission_id,
  'contract:default-deny-sod:v1','audit.controls.control_assessment.start.v1',
  'NONE_CONTRACTUALLY_REQUIRED','NONE_CONTRACTUALLY_REQUIRED',
  'IDEMPOTENCY_KEY_REQUIRED','ROW_VERSION_COMPARE_AND_SWAP',false,'published',transaction_timestamp()
FROM iam.permissions p WHERE p.permission_code='controls.control_assessment.update' AND p.lifecycle_state='published';

INSERT INTO ops_audit.lifecycle_transition_scopes
  (lifecycle_transition_scope_id,created_at,created_by_user_identity_id,created_by_service_principal_id,
   lifecycle_transition_definition_id,scope_kind)
VALUES ('01a0da03-0000-7000-8000-000000000002',transaction_timestamp(),NULL,NULL,
  '01a0da03-0000-7000-8000-000000000001','tenant');

DO $$
DECLARE table_count integer;
BEGIN
  SELECT count(*) INTO table_count FROM pg_catalog.pg_tables
   WHERE schemaname IN ('platform','iam','org','regulatory','controls','evidence','remediation','risk','audit',
     'operations','third_party','resilience','privacy','survey','data','config','rules','integration',
     'reporting','knowledge','ai','notification','ops_audit')
     AND NOT (schemaname='platform' AND tablename='schema_migrations');
  IF table_count <> 232 OR (SELECT count(*) FROM iam.permissions WHERE lifecycle_state='published') <> 154
    OR (SELECT count(*) FROM ops_audit.lifecycle_transition_scopes
      WHERE lifecycle_transition_definition_id='01a0da03-0000-7000-8000-000000000001' AND scope_kind='tenant') <> 1
  THEN RAISE EXCEPTION 'PHASE5_CONTROL_START_POSTCONDITION_FAILED'; END IF;
END $$;
