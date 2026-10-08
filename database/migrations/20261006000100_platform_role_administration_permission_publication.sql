-- STEP 23L-MI10-P2A human-approved DATA-ONLY local publication candidate.
-- QA application is NOT authorized by this step. No schema or personal grant.
DO $$
BEGIN
  IF current_database() <> 'tcdx-grc' OR current_setting('server_version_num')::integer / 10000 <> 16
     OR (SELECT count(*) FROM platform.schema_migrations WHERE outcome='applied') <> 26
     OR (SELECT max(migration_id) FROM platform.schema_migrations) <> '20261001000100'
     OR NOT EXISTS (SELECT 1 FROM platform.schema_migrations WHERE migration_id='20261001000100'
       AND content_sha256='90503ed1cf626c7d8a3529d323670322e180efde90257ee8bb99efe2736eef07' AND outcome='applied')
     OR (SELECT count(*) FROM iam.permissions WHERE lifecycle_state='published') <> 167
     OR EXISTS (SELECT 1 FROM iam.permissions WHERE permission_code='platform.role.administer')
     OR (SELECT count(*) FROM iam.roles WHERE role_code='PLATFORM_ADMIN' AND is_baseline
       AND ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL AND lifecycle_state='published') <> 1
     OR (SELECT count(*) FROM pg_catalog.pg_tables WHERE schemaname IN
       ('platform','iam','org','regulatory','controls','evidence','risk','remediation','audit','operations',
        'third_party','resilience','privacy','survey','data','rules','integration','config','reporting',
        'knowledge','ai','notification','ops_audit') AND NOT (schemaname='platform' AND tablename='schema_migrations')) <> 235
  THEN RAISE EXCEPTION 'P2A_PERMISSION_PUBLICATION_PRECONDITION_FAILED'; END IF;
END $$;

INSERT INTO iam.permissions
  (permission_id,permission_code,domain_code,resource_code,action_code,lifecycle_state)
VALUES (
  ('01a0da06-0000-7' || substr(md5('platform.role.administer'),1,3) || '-8' ||
    substr(md5('platform.role.administer'),4,3) || '-' || substr(md5('platform.role.administer'),7,12))::uuid,
  'platform.role.administer','platform','role','administer','published');

INSERT INTO iam.role_permissions (role_permission_id,ownership_class,tenant_id,role_id,permission_id)
SELECT ('01a0da07-0000-7' || substr(md5(r.role_id::text || ':platform.role.administer'),1,3) || '-8' ||
  substr(md5(r.role_id::text || ':platform.role.administer'),4,3) || '-' ||
  substr(md5(r.role_id::text || ':platform.role.administer'),7,12))::uuid,
  'PLATFORM_CONTROL',NULL,r.role_id,p.permission_id
FROM iam.roles r CROSS JOIN iam.permissions p
WHERE r.role_code='PLATFORM_ADMIN' AND r.is_baseline AND r.ownership_class='PLATFORM_CONTROL'
  AND r.tenant_id IS NULL AND r.lifecycle_state='published' AND p.permission_code='platform.role.administer';

DO $$
BEGIN
  IF (SELECT count(*) FROM iam.permissions WHERE lifecycle_state='published') <> 168
     OR (SELECT count(*) FROM iam.permissions WHERE permission_code='platform.role.administer'
       AND domain_code='platform' AND resource_code='role' AND action_code='administer' AND lifecycle_state='published') <> 1
     OR (SELECT count(*) FROM iam.role_permissions rp JOIN iam.permissions p USING(permission_id)
       WHERE p.permission_code='platform.role.administer') <> 1
     OR (SELECT count(*) FROM iam.role_permissions rp JOIN iam.permissions p USING(permission_id)
       JOIN iam.roles r USING(role_id) WHERE p.permission_code='platform.role.administer'
       AND r.role_code='PLATFORM_ADMIN' AND r.is_baseline AND r.lifecycle_state='published'
       AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL
       AND rp.ownership_class='PLATFORM_CONTROL' AND rp.tenant_id IS NULL) <> 1
  THEN RAISE EXCEPTION 'P2A_PERMISSION_PUBLICATION_POSTCONDITION_FAILED'; END IF;
END $$;
