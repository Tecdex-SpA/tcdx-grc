-- Phase 5 Subscription permission/grant catalog release approved 2026-09-24.
-- Forward-only data materialization only: no DDL and no physical-model change.
DO $$
DECLARE ledger_rows integer; physical_rows integer; platform_admin_rows integer;
BEGIN
  IF current_database() <> 'tcdx-grc' OR current_setting('server_version_num')::integer / 10000 <> 16 THEN
    RAISE EXCEPTION 'PHASE5_SUBSCRIPTION_CATALOG_TARGET_IDENTITY_MISMATCH';
  END IF;
  SELECT count(*) INTO ledger_rows FROM platform.schema_migrations WHERE outcome='applied';
  IF ledger_rows <> 14 OR NOT EXISTS (
    SELECT 1 FROM platform.schema_migrations WHERE migration_id='20260923000200' AND outcome='applied'
  ) THEN
    RAISE EXCEPTION 'PHASE5_SUBSCRIPTION_CATALOG_EXPECTED_14_APPLIED';
  END IF;
  SELECT count(*) INTO physical_rows
    FROM pg_catalog.pg_tables
   WHERE schemaname IN ('platform','iam','org','regulatory','controls','evidence','remediation','risk','audit','operations','third_party','resilience','privacy','survey','data','config','rules','integration','reporting','knowledge','ai','notification','ops_audit')
     AND NOT (schemaname='platform' AND tablename='schema_migrations');
  IF physical_rows <> 231 THEN
    RAISE EXCEPTION 'PHASE5_SUBSCRIPTION_CATALOG_EXPECTED_231_TABLES: %', physical_rows;
  END IF;
  IF EXISTS (SELECT 1 FROM iam.permissions WHERE permission_code='platform.subscription.create') THEN
    RAISE EXCEPTION 'PHASE5_SUBSCRIPTION_PERMISSION_ALREADY_PRESENT_OUTSIDE_LEDGER';
  END IF;
  SELECT count(*) INTO platform_admin_rows
    FROM iam.roles
   WHERE role_code='PLATFORM_ADMIN' AND ownership_class='PLATFORM_CONTROL'
     AND tenant_id IS NULL AND is_baseline=TRUE AND lifecycle_state='published';
  IF platform_admin_rows <> 1 THEN
    RAISE EXCEPTION 'PHASE5_SUBSCRIPTION_PLATFORM_ADMIN_CATALOG_AMBIGUOUS: %', platform_admin_rows;
  END IF;
END $$;

INSERT INTO iam.permissions
  (permission_id,created_at,created_by_user_identity_id,created_by_service_principal_id,
   updated_at,updated_by_user_identity_id,updated_by_service_principal_id,row_version,
   permission_code,domain_code,resource_code,action_code,lifecycle_state)
VALUES
  ('01a0d0b6-4000-7c4a-88c3-091a01048397','2026-09-24T00:00:00.000Z',NULL,NULL,
   '2026-09-24T00:00:00.000Z',NULL,NULL,1,
   'platform.subscription.create','platform','subscription','create','published');

INSERT INTO iam.role_permissions
  (role_permission_id,created_at,created_by_user_identity_id,created_by_service_principal_id,
   ownership_class,tenant_id,role_id,permission_id)
SELECT
  '01a0d0b6-4000-7748-b8fe-c434e55e85c2','2026-09-24T00:00:00.000Z',NULL,NULL,
  'PLATFORM_CONTROL',NULL,r.role_id,p.permission_id
FROM iam.roles r
JOIN iam.permissions p ON p.permission_code='platform.subscription.create' AND p.lifecycle_state='published'
WHERE r.role_code='PLATFORM_ADMIN' AND r.ownership_class='PLATFORM_CONTROL'
  AND r.tenant_id IS NULL AND r.is_baseline=TRUE AND r.lifecycle_state='published';

DO $$
DECLARE physical_rows integer;
BEGIN
  IF (SELECT count(*) FROM iam.permissions
       WHERE permission_code='platform.subscription.create'
         AND domain_code='platform' AND resource_code='subscription'
         AND action_code='create' AND lifecycle_state='published') <> 1 THEN
    RAISE EXCEPTION 'PHASE5_SUBSCRIPTION_PERMISSION_POSTCONDITION_FAILED';
  END IF;
  IF (SELECT count(*)
        FROM iam.role_permissions rp
        JOIN iam.permissions p ON p.permission_id=rp.permission_id
        JOIN iam.roles r ON r.role_id=rp.role_id
       WHERE p.permission_code='platform.subscription.create'
         AND r.role_code='PLATFORM_ADMIN'
         AND rp.ownership_class='PLATFORM_CONTROL' AND rp.tenant_id IS NULL) <> 1 THEN
    RAISE EXCEPTION 'PHASE5_SUBSCRIPTION_GRANT_POSTCONDITION_FAILED';
  END IF;
  SELECT count(*) INTO physical_rows
    FROM pg_catalog.pg_tables
   WHERE schemaname IN ('platform','iam','org','regulatory','controls','evidence','remediation','risk','audit','operations','third_party','resilience','privacy','survey','data','config','rules','integration','reporting','knowledge','ai','notification','ops_audit')
     AND NOT (schemaname='platform' AND tablename='schema_migrations');
  IF physical_rows <> 231 THEN
    RAISE EXCEPTION 'PHASE5_SUBSCRIPTION_CATALOG_CHANGED_PHYSICAL_TABLE_COUNT: %', physical_rows;
  END IF;
END $$;
