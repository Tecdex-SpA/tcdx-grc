-- Additive catalog release for the human Phase 5 administrative-read decision of 2026-09-28.
-- Applied migration bytes and the frozen 232-table physical model remain unchanged.
DO $$
DECLARE ledger_rows integer; physical_rows integer;
BEGIN
  IF current_database() <> 'tcdx-grc' OR current_setting('server_version_num')::integer / 10000 <> 16 THEN
    RAISE EXCEPTION 'PHASE5_ADMIN_READ_TARGET_IDENTITY_MISMATCH';
  END IF;
  SELECT count(*) INTO ledger_rows FROM platform.schema_migrations WHERE outcome='applied';
  IF ledger_rows <> 18 OR NOT EXISTS (
    SELECT 1 FROM platform.schema_migrations WHERE migration_id='20260925000100'
      AND content_sha256='b66f88a19323d7a92465f6e61e762dffcf511eae55e53456d811c7912d3dad8a'
      AND outcome='applied'
  ) THEN RAISE EXCEPTION 'PHASE5_ADMIN_READ_EXPECTED_18_APPLIED'; END IF;
  SELECT count(*) INTO physical_rows FROM pg_catalog.pg_tables
   WHERE schemaname IN ('platform','iam','org','regulatory','controls','evidence','remediation','risk','audit','operations','third_party','resilience','privacy','survey','data','config','rules','integration','reporting','knowledge','ai','notification','ops_audit')
     AND NOT (schemaname='platform' AND tablename='schema_migrations');
  IF physical_rows <> 232 THEN RAISE EXCEPTION 'PHASE5_ADMIN_READ_EXPECTED_232_TABLES: %', physical_rows; END IF;
  IF EXISTS (SELECT 1 FROM iam.permissions WHERE permission_code IN (
    'platform.tenant.read','platform.membership.read','platform.membership_invitation.read','platform.role.read'
  )) THEN RAISE EXCEPTION 'PHASE5_ADMIN_READ_PERMISSION_ALREADY_PRESENT_OUTSIDE_LEDGER'; END IF;
  IF (SELECT count(*) FROM iam.roles WHERE role_code='PLATFORM_ADMIN' AND ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL AND is_baseline=TRUE AND lifecycle_state='published') <> 1
    OR (SELECT count(*) FROM iam.roles WHERE role_code='TENANT_ADMIN' AND ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL AND is_baseline=TRUE AND lifecycle_state='published') <> 1
  THEN RAISE EXCEPTION 'PHASE5_ADMIN_READ_BASE_ROLE_AMBIGUOUS'; END IF;
END $$;

INSERT INTO iam.permissions
  (permission_id,created_at,created_by_user_identity_id,created_by_service_principal_id,
   updated_at,updated_by_user_identity_id,updated_by_service_principal_id,row_version,
   permission_code,domain_code,resource_code,action_code,lifecycle_state)
SELECT ('01a0da00-0000-7'||substr(md5(v.permission_code),1,3)||'-8'||substr(md5(v.permission_code),4,3)||'-'||substr(md5(v.permission_code),7,12))::uuid,
       transaction_timestamp(),NULL,NULL,transaction_timestamp(),NULL,NULL,1,
       v.permission_code,'platform',v.resource_code,'read','published'
  FROM (VALUES
    ('platform.tenant.read','tenant'),
    ('platform.membership.read','membership'),
    ('platform.membership_invitation.read','membership_invitation'),
    ('platform.role.read','role')
  ) AS v(permission_code,resource_code);

-- PLATFORM_ADMIN gets exactly the four approved Platform reads. The two
-- tenant reads are also seeded into the global TENANT_ADMIN template for
-- future canonical tenant bootstrap, and into already materialized tenants.
INSERT INTO iam.role_permissions
  (role_permission_id,created_at,created_by_user_identity_id,created_by_service_principal_id,
   ownership_class,tenant_id,role_id,permission_id)
SELECT ('01a0da01-0000-7'||substr(md5(r.role_id::text||':'||p.permission_code),1,3)||'-8'||substr(md5(r.role_id::text||':'||p.permission_code),4,3)||'-'||substr(md5(r.role_id::text||':'||p.permission_code),7,12))::uuid,
       transaction_timestamp(),NULL,NULL,r.ownership_class,r.tenant_id,r.role_id,p.permission_id
  FROM iam.roles r
  JOIN iam.permissions p ON p.permission_code IN (
    'platform.tenant.read','platform.membership.read','platform.membership_invitation.read','platform.role.read'
  )
 WHERE r.role_code='PLATFORM_ADMIN' AND r.ownership_class='PLATFORM_CONTROL'
   AND r.tenant_id IS NULL AND r.is_baseline=TRUE AND r.lifecycle_state='published';

INSERT INTO iam.role_permissions
  (role_permission_id,created_at,created_by_user_identity_id,created_by_service_principal_id,
   ownership_class,tenant_id,role_id,permission_id)
SELECT ('01a0da01-0000-7'||substr(md5(r.role_id::text||':'||p.permission_code),1,3)||'-8'||substr(md5(r.role_id::text||':'||p.permission_code),4,3)||'-'||substr(md5(r.role_id::text||':'||p.permission_code),7,12))::uuid,
       transaction_timestamp(),NULL,NULL,r.ownership_class,r.tenant_id,r.role_id,p.permission_id
  FROM iam.roles r
  JOIN iam.permissions p ON p.permission_code IN ('platform.membership.read','platform.role.read')
 WHERE r.role_code='TENANT_ADMIN' AND r.is_baseline=TRUE AND r.lifecycle_state='published'
   AND (r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL
        OR r.ownership_class='TENANT_OWNED' AND r.tenant_id IS NOT NULL);

DO $$
DECLARE physical_rows integer; tenant_admin_rows integer; authorized_grants integer; unauthorized_grants integer;
BEGIN
  SELECT count(*) INTO physical_rows FROM pg_catalog.pg_tables
   WHERE schemaname IN ('platform','iam','org','regulatory','controls','evidence','remediation','risk','audit','operations','third_party','resilience','privacy','survey','data','config','rules','integration','reporting','knowledge','ai','notification','ops_audit')
     AND NOT (schemaname='platform' AND tablename='schema_migrations');
  IF physical_rows <> 232 THEN RAISE EXCEPTION 'PHASE5_ADMIN_READ_TABLE_COUNT_CHANGED'; END IF;
  IF (SELECT count(*) FROM iam.permissions WHERE permission_code IN (
    'platform.tenant.read','platform.membership.read','platform.membership_invitation.read','platform.role.read'
  ) AND lifecycle_state='published') <> 4 THEN RAISE EXCEPTION 'PHASE5_ADMIN_READ_PERMISSION_COUNT'; END IF;
  SELECT count(*) INTO tenant_admin_rows FROM iam.roles
   WHERE role_code='TENANT_ADMIN' AND is_baseline=TRUE AND lifecycle_state='published'
     AND (ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL OR ownership_class='TENANT_OWNED' AND tenant_id IS NOT NULL);
  SELECT count(*) INTO authorized_grants FROM iam.role_permissions rp
    JOIN iam.roles r ON r.role_id=rp.role_id
    JOIN iam.permissions p ON p.permission_id=rp.permission_id
   WHERE p.permission_code IN ('platform.tenant.read','platform.membership.read','platform.membership_invitation.read','platform.role.read')
     AND (r.role_code='PLATFORM_ADMIN' AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL
          OR r.role_code='TENANT_ADMIN' AND p.permission_code IN ('platform.membership.read','platform.role.read')
             AND (r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL OR r.ownership_class='TENANT_OWNED' AND r.tenant_id IS NOT NULL))
     AND rp.ownership_class=r.ownership_class AND rp.tenant_id IS NOT DISTINCT FROM r.tenant_id;
  SELECT count(*) INTO unauthorized_grants FROM iam.role_permissions rp
    JOIN iam.roles r ON r.role_id=rp.role_id
    JOIN iam.permissions p ON p.permission_id=rp.permission_id
   WHERE p.permission_code IN ('platform.tenant.read','platform.membership.read','platform.membership_invitation.read','platform.role.read')
     AND NOT (r.role_code='PLATFORM_ADMIN' AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL
          OR r.role_code='TENANT_ADMIN' AND p.permission_code IN ('platform.membership.read','platform.role.read')
             AND (r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL OR r.ownership_class='TENANT_OWNED' AND r.tenant_id IS NOT NULL));
  IF authorized_grants <> 4 + 2*tenant_admin_rows OR unauthorized_grants <> 0 THEN
    RAISE EXCEPTION 'PHASE5_ADMIN_READ_GRANT_MISMATCH authorized=% expected=% unauthorized=%',authorized_grants,4+2*tenant_admin_rows,unauthorized_grants;
  END IF;
END $$;
