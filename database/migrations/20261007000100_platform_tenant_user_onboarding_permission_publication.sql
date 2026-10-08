-- Human-approved centralized onboarding: one Permission, one PLATFORM_ADMIN grant, DDL=0.
DO $$
BEGIN
  IF current_database() <> 'tcdx-grc' OR current_setting('server_version_num')::integer / 10000 <> 16
     OR (SELECT count(*) FROM platform.schema_migrations WHERE outcome='applied') <> 28
     OR (SELECT max(migration_id) FROM platform.schema_migrations) <> '20261006000200'
     OR NOT EXISTS (SELECT 1 FROM platform.schema_migrations WHERE migration_id='20261006000200'
       AND content_sha256='fa7d34a7f33044b8ee02478211c67a6c1c36ee64df0e0d2de57a60101d157c22' AND outcome='applied')
     OR (SELECT count(*) FROM iam.permissions WHERE lifecycle_state='published') <> 169
     OR EXISTS (SELECT 1 FROM iam.permissions WHERE permission_code='platform.tenant_user.onboard')
     OR (SELECT count(*) FROM iam.roles WHERE role_code='PLATFORM_ADMIN' AND is_baseline
       AND ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL AND lifecycle_state='published') <> 1
     OR (SELECT count(*) FROM pg_catalog.pg_tables WHERE schemaname IN
       ('platform','iam','org','regulatory','controls','evidence','risk','remediation','audit','operations',
        'third_party','resilience','privacy','survey','data','rules','integration','config','reporting',
        'knowledge','ai','notification','ops_audit') AND NOT (schemaname='platform' AND tablename='schema_migrations')) <> 235
  THEN RAISE EXCEPTION 'TENANT_USER_ONBOARDING_PERMISSION_PRECONDITION_FAILED'; END IF;
END $$;

INSERT INTO iam.permissions (permission_id,permission_code,domain_code,resource_code,action_code,lifecycle_state)
VALUES (('01a0da10-0000-7' || substr(md5('platform.tenant_user.onboard'),1,3) || '-8' ||
  substr(md5('platform.tenant_user.onboard'),4,3) || '-' || substr(md5('platform.tenant_user.onboard'),7,12))::uuid,
  'platform.tenant_user.onboard','platform','tenant_user','onboard','published');

INSERT INTO iam.role_permissions (role_permission_id,ownership_class,tenant_id,role_id,permission_id)
SELECT ('01a0da11-0000-7' || substr(md5(r.role_id::text || ':platform.tenant_user.onboard'),1,3) || '-8' ||
  substr(md5(r.role_id::text || ':platform.tenant_user.onboard'),4,3) || '-' ||
  substr(md5(r.role_id::text || ':platform.tenant_user.onboard'),7,12))::uuid,
  r.ownership_class,r.tenant_id,r.role_id,p.permission_id
FROM iam.roles r CROSS JOIN iam.permissions p
WHERE r.role_code='PLATFORM_ADMIN' AND r.is_baseline AND r.lifecycle_state='published'
  AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL AND p.permission_code='platform.tenant_user.onboard';

DO $$
BEGIN
  IF (SELECT count(*) FROM iam.permissions WHERE lifecycle_state='published') <> 170
     OR (SELECT count(*) FROM iam.permissions WHERE permission_code='platform.tenant_user.onboard'
       AND domain_code='platform' AND resource_code='tenant_user' AND action_code='onboard' AND lifecycle_state='published') <> 1
     OR (SELECT count(*) FROM iam.role_permissions rp JOIN iam.permissions p USING(permission_id)
       WHERE p.permission_code='platform.tenant_user.onboard') <> 1
     OR EXISTS (SELECT 1 FROM iam.role_permissions rp JOIN iam.permissions p USING(permission_id)
       JOIN iam.roles r USING(role_id) WHERE p.permission_code='platform.tenant_user.onboard'
       AND NOT (r.role_code='PLATFORM_ADMIN' AND r.is_baseline AND r.lifecycle_state='published'
         AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL
         AND rp.ownership_class='PLATFORM_CONTROL' AND rp.tenant_id IS NULL))
  THEN RAISE EXCEPTION 'TENANT_USER_ONBOARDING_PERMISSION_POSTCONDITION_FAILED'; END IF;
END $$;
