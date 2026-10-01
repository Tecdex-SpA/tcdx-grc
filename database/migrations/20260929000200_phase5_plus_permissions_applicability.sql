-- Human resolution 2026-09-29. Forward-only catalog and applicability closure.
DO $$
BEGIN
  IF current_database() <> 'tcdx-grc' OR current_setting('server_version_num')::integer / 10000 <> 16
     OR (SELECT count(*) FROM platform.schema_migrations WHERE outcome='applied') <> 23
     OR NOT EXISTS (SELECT 1 FROM platform.schema_migrations WHERE migration_id='20260929000100' AND outcome='applied')
     OR (SELECT count(*) FROM iam.permissions WHERE lifecycle_state='published') <> 154
     OR EXISTS (SELECT 1 FROM iam.permissions WHERE permission_code IN
       ('platform.subscription_regulatory_pack.read','platform.subscription_regulatory_pack.create',
        'platform.subscription_regulatory_pack.archive','organization.subject.read'))
  THEN RAISE EXCEPTION 'PHASE5_PLUS_PRECONDITION_FAILED'; END IF;
END $$;

INSERT INTO iam.permissions
  (permission_id,created_at,created_by_user_identity_id,created_by_service_principal_id,
   updated_at,updated_by_user_identity_id,updated_by_service_principal_id,row_version,
   permission_code,domain_code,resource_code,action_code,lifecycle_state)
SELECT ('01a0da02-0000-7'||substr(md5(v.permission_code),1,3)||'-8'||substr(md5(v.permission_code),4,3)||'-'||substr(md5(v.permission_code),7,12))::uuid,
       transaction_timestamp(),NULL,NULL,transaction_timestamp(),NULL,NULL,1,
       v.permission_code,v.domain_code,v.resource_code,v.action_code,'published'
  FROM (VALUES
    ('platform.subscription_regulatory_pack.read','platform','subscription_regulatory_pack','read'),
    ('platform.subscription_regulatory_pack.create','platform','subscription_regulatory_pack','create'),
    ('platform.subscription_regulatory_pack.archive','platform','subscription_regulatory_pack','archive'),
    ('organization.subject.read','organization','subject','read')
  ) AS v(permission_code,domain_code,resource_code,action_code);

-- Global baseline templates and existing tenant copies receive the same explicit grants.
INSERT INTO iam.role_permissions
  (role_permission_id,created_at,created_by_user_identity_id,created_by_service_principal_id,
   ownership_class,tenant_id,role_id,permission_id)
SELECT ('01a0da03-0000-7'||substr(md5(r.role_id::text||':'||p.permission_code),1,3)||'-8'||substr(md5(r.role_id::text||':'||p.permission_code),4,3)||'-'||substr(md5(r.role_id::text||':'||p.permission_code),7,12))::uuid,
       transaction_timestamp(),NULL,NULL,r.ownership_class,r.tenant_id,r.role_id,p.permission_id
  FROM iam.roles r
  JOIN iam.permissions p ON p.permission_code IN
    ('platform.subscription_regulatory_pack.read','platform.subscription_regulatory_pack.create',
     'platform.subscription_regulatory_pack.archive','organization.subject.read')
 WHERE r.is_baseline=TRUE AND r.lifecycle_state='published'
   AND (
     (r.role_code='PLATFORM_ADMIN' AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL
      AND p.permission_code LIKE 'platform.subscription_regulatory_pack.%')
     OR (r.role_code='TENANT_ADMIN' AND p.permission_code='platform.subscription_regulatory_pack.read')
     OR (r.role_code IN
       ('TENANT_ADMIN','GRC_MANAGER','QUALITY_MANAGER','COMPLIANCE_MANAGER',
        'CISO_SECURITY_MANAGER','AI_GOVERNANCE_MANAGER','PRIVACY_MANAGER','PROCESS_OWNER','CONTROL_OWNER')
       AND p.permission_code='organization.subject.read')
   );

-- DRAFT and SUBMITTED carry unapproved decisions; the stored decision vocabulary is exact.
ALTER TABLE regulatory.requirement_applicabilities
  ADD CONSTRAINT ck_requirement_applicabilities__decision_closed
    CHECK (applicability_decision IN ('applicable','not_applicable')),
  ADD CONSTRAINT ck_requirement_applicabilities__not_applicable_rationale
    CHECK (applicability_decision <> 'not_applicable' OR length(btrim(rationale)) > 0);

DO $$
BEGIN
  IF (SELECT count(*) FROM iam.permissions WHERE lifecycle_state='published') <> 158
     OR EXISTS (
       SELECT 1 FROM iam.role_permissions rp JOIN iam.permissions p ON p.permission_id=rp.permission_id
       JOIN iam.roles r ON r.role_id=rp.role_id
       WHERE p.permission_code IN ('platform.subscription_regulatory_pack.create','platform.subscription_regulatory_pack.archive')
         AND r.role_code <> 'PLATFORM_ADMIN')
  THEN RAISE EXCEPTION 'PHASE5_PLUS_PERMISSION_POSTCONDITION_FAILED'; END IF;
END $$;
