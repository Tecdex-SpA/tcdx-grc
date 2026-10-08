-- STEP 23L-TENANT-ONBOARDING-D2: local DATA-ONLY candidate, not applied to QA.
-- D1-R grants: Platform Admin template; Tenant Admin template and existing canonical instances.
DO $$
BEGIN
  IF current_database() <> 'tcdx-grc' OR current_setting('server_version_num')::integer / 10000 <> 16
     OR (SELECT count(*) FROM platform.schema_migrations WHERE outcome='applied') <> 27
     OR (SELECT max(migration_id) FROM platform.schema_migrations) <> '20261006000100'
     OR NOT EXISTS (SELECT 1 FROM platform.schema_migrations WHERE migration_id='20261006000100'
       AND content_sha256='2a3c0d14748a9494d6ef60572802782eab2cdf3f4e60bef6026d73c48c1b6399' AND outcome='applied')
     OR (SELECT count(*) FROM iam.permissions WHERE lifecycle_state='published') <> 168
     OR EXISTS (SELECT 1 FROM iam.permissions WHERE permission_code='platform.user_identity.read')
     OR (SELECT count(*) FROM iam.roles WHERE role_code IN ('PLATFORM_ADMIN','TENANT_ADMIN')
       AND is_baseline AND ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL AND lifecycle_state='published') <> 2
     OR (SELECT count(*) FROM pg_catalog.pg_tables WHERE schemaname IN
       ('platform','iam','org','regulatory','controls','evidence','risk','remediation','audit','operations',
        'third_party','resilience','privacy','survey','data','rules','integration','config','reporting',
        'knowledge','ai','notification','ops_audit') AND NOT (schemaname='platform' AND tablename='schema_migrations')) <> 235
  THEN RAISE EXCEPTION 'D2_DISCOVERY_PERMISSION_PRECONDITION_FAILED'; END IF;
END $$;

INSERT INTO iam.permissions
  (permission_id,permission_code,domain_code,resource_code,action_code,lifecycle_state)
VALUES (
  ('01a0da08-0000-7' || substr(md5('platform.user_identity.read'),1,3) || '-8' ||
    substr(md5('platform.user_identity.read'),4,3) || '-' || substr(md5('platform.user_identity.read'),7,12))::uuid,
  'platform.user_identity.read','platform','user_identity','read','published');

INSERT INTO iam.role_permissions (role_permission_id,ownership_class,tenant_id,role_id,permission_id)
SELECT ('01a0da09-0000-7' || substr(md5(r.role_id::text || ':platform.user_identity.read'),1,3) || '-8' ||
  substr(md5(r.role_id::text || ':platform.user_identity.read'),4,3) || '-' ||
  substr(md5(r.role_id::text || ':platform.user_identity.read'),7,12))::uuid,
  r.ownership_class,r.tenant_id,r.role_id,p.permission_id
FROM iam.roles r CROSS JOIN iam.permissions p
WHERE r.is_baseline AND r.lifecycle_state='published' AND p.permission_code='platform.user_identity.read'
  AND ((r.role_code IN ('PLATFORM_ADMIN','TENANT_ADMIN') AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL)
    OR (r.role_code='TENANT_ADMIN' AND r.ownership_class='TENANT_OWNED' AND r.tenant_id IS NOT NULL));

DO $$
BEGIN
  IF (SELECT count(*) FROM iam.permissions WHERE lifecycle_state='published') <> 169
     OR (SELECT count(*) FROM iam.permissions WHERE permission_code='platform.user_identity.read'
       AND domain_code='platform' AND resource_code='user_identity' AND action_code='read' AND lifecycle_state='published') <> 1
     OR EXISTS (SELECT 1 FROM iam.role_permissions rp JOIN iam.permissions p USING(permission_id)
       JOIN iam.roles r USING(role_id) WHERE p.permission_code='platform.user_identity.read'
       AND NOT (r.is_baseline AND r.lifecycle_state='published' AND rp.ownership_class=r.ownership_class
         AND rp.tenant_id IS NOT DISTINCT FROM r.tenant_id AND
         ((r.role_code IN ('PLATFORM_ADMIN','TENANT_ADMIN') AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL)
          OR (r.role_code='TENANT_ADMIN' AND r.ownership_class='TENANT_OWNED' AND r.tenant_id IS NOT NULL))))
     OR (SELECT count(*) FROM iam.role_permissions rp JOIN iam.permissions p USING(permission_id)
       WHERE p.permission_code='platform.user_identity.read') <>
       (2 + (SELECT count(*) FROM iam.roles WHERE role_code='TENANT_ADMIN' AND is_baseline
         AND lifecycle_state='published' AND ownership_class='TENANT_OWNED' AND tenant_id IS NOT NULL))
  THEN RAISE EXCEPTION 'D2_DISCOVERY_PERMISSION_POSTCONDITION_FAILED'; END IF;
END $$;
