-- MI6B human-approved, data-only publication of Platform Managed Identity permissions.
-- The canonical migration runner wraps this file and its ledger row in one transaction.
DO $$
BEGIN
  IF current_database() <> 'tcdx-grc'
     OR current_setting('server_version_num')::integer / 10000 <> 16
     OR (SELECT count(*) FROM platform.schema_migrations WHERE outcome='applied') <> 25
     OR NOT EXISTS (
       SELECT 1 FROM platform.schema_migrations
        WHERE migration_id='20260929000300'
          AND content_sha256='5eb46ac182929c1649fed610a4d66cd92017ea07b473aba933e5c167f5e1dfdb'
          AND outcome='applied'
     )
     OR (SELECT count(*) FROM iam.permissions WHERE lifecycle_state='published') <> 163
     OR (SELECT count(*) FROM pg_catalog.pg_tables
          WHERE schemaname IN ('platform','iam','org','regulatory','controls','evidence','remediation','risk','audit','operations','third_party','resilience','privacy','survey','data','config','rules','integration','reporting','knowledge','ai','notification','ops_audit')
            AND NOT (schemaname='platform' AND tablename='schema_migrations')) <> 235
     OR EXISTS (
       SELECT 1 FROM iam.permissions WHERE permission_code IN (
         'platform.managed_identity.read','platform.managed_identity.create',
         'platform.managed_identity.update','platform.managed_identity.administer'
       )
     )
  THEN RAISE EXCEPTION 'MI6B_PERMISSION_PUBLICATION_PRECONDITION_FAILED'; END IF;

  IF (SELECT count(*) FROM iam.roles WHERE role_code='PLATFORM_ADMIN') <> 1
     OR (SELECT count(*) FROM iam.roles
          WHERE role_code='PLATFORM_ADMIN' AND ownership_class='PLATFORM_CONTROL'
            AND tenant_id IS NULL AND is_baseline=TRUE AND lifecycle_state='published') <> 1
  THEN RAISE EXCEPTION 'MI6B_PLATFORM_ADMIN_AUTHORITY_AMBIGUOUS'; END IF;
END $$;

INSERT INTO iam.permissions
  (permission_id,created_at,created_by_user_identity_id,created_by_service_principal_id,
   updated_at,updated_by_user_identity_id,updated_by_service_principal_id,row_version,
   permission_code,domain_code,resource_code,action_code,lifecycle_state)
SELECT ('01a0da04-0000-7'||substr(md5(v.permission_code),1,3)||'-8'||substr(md5(v.permission_code),4,3)||'-'||substr(md5(v.permission_code),7,12))::uuid,
       transaction_timestamp(),NULL,NULL,transaction_timestamp(),NULL,NULL,1,
       v.permission_code,'platform','managed_identity',v.action_code,'published'
  FROM (VALUES
    ('platform.managed_identity.read','read'),
    ('platform.managed_identity.create','create'),
    ('platform.managed_identity.update','update'),
    ('platform.managed_identity.administer','administer')
  ) AS v(permission_code,action_code);

INSERT INTO iam.role_permissions
  (role_permission_id,created_at,created_by_user_identity_id,created_by_service_principal_id,
   ownership_class,tenant_id,role_id,permission_id)
SELECT ('01a0da05-0000-7'||substr(md5(r.role_id::text||':'||p.permission_code),1,3)||'-8'||substr(md5(r.role_id::text||':'||p.permission_code),4,3)||'-'||substr(md5(r.role_id::text||':'||p.permission_code),7,12))::uuid,
       transaction_timestamp(),NULL,NULL,r.ownership_class,r.tenant_id,r.role_id,p.permission_id
  FROM iam.roles r
  JOIN iam.permissions p ON p.permission_code IN (
    'platform.managed_identity.read','platform.managed_identity.create',
    'platform.managed_identity.update','platform.managed_identity.administer'
  )
 WHERE r.role_code='PLATFORM_ADMIN' AND r.ownership_class='PLATFORM_CONTROL'
   AND r.tenant_id IS NULL AND r.is_baseline=TRUE AND r.lifecycle_state='published';

DO $$
BEGIN
  IF (SELECT count(*) FROM iam.permissions WHERE lifecycle_state='published') <> 167
     OR (SELECT count(*) FROM iam.permissions
          WHERE permission_code IN (
            'platform.managed_identity.read','platform.managed_identity.create',
            'platform.managed_identity.update','platform.managed_identity.administer'
          ) AND domain_code='platform' AND resource_code='managed_identity'
            AND lifecycle_state='published'
            AND action_code=split_part(permission_code,'.',3)) <> 4
     OR (SELECT count(*) FROM iam.role_permissions rp
           JOIN iam.permissions p ON p.permission_id=rp.permission_id
           JOIN iam.roles r ON r.role_id=rp.role_id
          WHERE p.permission_code IN (
            'platform.managed_identity.read','platform.managed_identity.create',
            'platform.managed_identity.update','platform.managed_identity.administer'
          ) AND r.role_code='PLATFORM_ADMIN' AND r.ownership_class='PLATFORM_CONTROL'
            AND r.tenant_id IS NULL AND r.is_baseline=TRUE AND r.lifecycle_state='published'
            AND rp.ownership_class=r.ownership_class
            AND rp.tenant_id IS NOT DISTINCT FROM r.tenant_id) <> 4
     OR EXISTS (
       SELECT 1 FROM iam.role_permissions rp
       JOIN iam.permissions p ON p.permission_id=rp.permission_id
       JOIN iam.roles r ON r.role_id=rp.role_id
       WHERE p.permission_code IN (
         'platform.managed_identity.read','platform.managed_identity.create',
         'platform.managed_identity.update','platform.managed_identity.administer'
       ) AND NOT (r.role_code='PLATFORM_ADMIN' AND r.ownership_class='PLATFORM_CONTROL'
                  AND r.tenant_id IS NULL AND r.is_baseline=TRUE AND r.lifecycle_state='published'
                  AND rp.ownership_class=r.ownership_class
                  AND rp.tenant_id IS NOT DISTINCT FROM r.tenant_id)
     )
  THEN RAISE EXCEPTION 'MI6B_PERMISSION_PUBLICATION_POSTCONDITION_FAILED'; END IF;
END $$;
