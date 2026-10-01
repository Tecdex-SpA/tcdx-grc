-- Human Phase 5 decision 2026-09-28: the existing published
-- platform.role.assign permission governs assignment and revocation.
-- Add only its PLATFORM_ADMIN Platform-control grant; tenant grants remain unchanged.
DO $$
BEGIN
  IF current_database() <> 'tcdx-grc' OR current_setting('server_version_num')::integer / 10000 <> 16 THEN
    RAISE EXCEPTION 'PHASE5_ROLE_REVOKE_TARGET_IDENTITY_MISMATCH';
  END IF;
  IF (SELECT count(*) FROM platform.schema_migrations WHERE outcome='applied') <> 19
    OR NOT EXISTS (SELECT 1 FROM platform.schema_migrations
      WHERE migration_id='20260928000100' AND outcome='applied'
        AND content_sha256='d19c72ce5a0b9e5caa65d8b6b93daec1b2188dee54067551bb8ac3c8c7dcdd35')
  THEN RAISE EXCEPTION 'PHASE5_ROLE_REVOKE_EXPECTED_19_APPLIED'; END IF;
  IF (SELECT count(*) FROM iam.permissions WHERE lifecycle_state='published') <> 154
    OR (SELECT count(*) FROM iam.permissions WHERE permission_code='platform.role.assign' AND lifecycle_state='published') <> 1
  THEN RAISE EXCEPTION 'PHASE5_ROLE_REVOKE_PERMISSION_CATALOG_MISMATCH'; END IF;
  IF (SELECT count(*) FROM iam.roles WHERE role_code='PLATFORM_ADMIN' AND ownership_class='PLATFORM_CONTROL'
      AND tenant_id IS NULL AND is_baseline=TRUE AND lifecycle_state='published') <> 1
  THEN RAISE EXCEPTION 'PHASE5_ROLE_REVOKE_PLATFORM_ADMIN_AMBIGUOUS'; END IF;
  IF EXISTS (SELECT 1 FROM iam.role_permissions rp JOIN iam.roles r ON r.role_id=rp.role_id
      JOIN iam.permissions p ON p.permission_id=rp.permission_id
      WHERE r.role_code='PLATFORM_ADMIN' AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL
        AND p.permission_code='platform.role.assign')
  THEN RAISE EXCEPTION 'PHASE5_ROLE_REVOKE_GRANT_ALREADY_PRESENT_OUTSIDE_LEDGER'; END IF;
END $$;

INSERT INTO iam.role_permissions
  (role_permission_id,created_at,created_by_user_identity_id,created_by_service_principal_id,
   ownership_class,tenant_id,role_id,permission_id)
SELECT ('01a0da02-0000-7'||substr(md5(r.role_id::text||':'||p.permission_code),1,3)||'-8'||
        substr(md5(r.role_id::text||':'||p.permission_code),4,3)||'-'||
        substr(md5(r.role_id::text||':'||p.permission_code),7,12))::uuid,
       transaction_timestamp(),NULL,NULL,'PLATFORM_CONTROL',NULL,r.role_id,p.permission_id
  FROM iam.roles r CROSS JOIN iam.permissions p
 WHERE r.role_code='PLATFORM_ADMIN' AND r.ownership_class='PLATFORM_CONTROL'
   AND r.tenant_id IS NULL AND r.is_baseline=TRUE AND r.lifecycle_state='published'
   AND p.permission_code='platform.role.assign' AND p.lifecycle_state='published';

DO $$
DECLARE table_count integer;
BEGIN
  SELECT count(*) INTO table_count FROM pg_catalog.pg_tables
   WHERE schemaname IN ('platform','iam','org','regulatory','controls','evidence','remediation','risk','audit',
      'operations','third_party','resilience','privacy','survey','data','config','rules','integration',
      'reporting','knowledge','ai','notification','ops_audit')
     AND NOT (schemaname='platform' AND tablename='schema_migrations');
  IF table_count <> 232 THEN RAISE EXCEPTION 'PHASE5_ROLE_REVOKE_TABLE_COUNT_CHANGED'; END IF;
  IF (SELECT count(*) FROM iam.permissions WHERE lifecycle_state='published') <> 154
    OR (SELECT count(*) FROM iam.role_permissions rp JOIN iam.roles r ON r.role_id=rp.role_id
        JOIN iam.permissions p ON p.permission_id=rp.permission_id
        WHERE r.role_code='PLATFORM_ADMIN' AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL
          AND rp.ownership_class='PLATFORM_CONTROL' AND rp.tenant_id IS NULL
          AND p.permission_code='platform.role.assign') <> 1
  THEN RAISE EXCEPTION 'PHASE5_ROLE_REVOKE_GRANT_MISMATCH'; END IF;
END $$;
