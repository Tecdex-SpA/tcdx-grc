-- Forward-only reconciliation for DR-PHASE5-CANONICAL-TENANT-USER-ENROLLMENT-2026-09-24.
-- The applied 20260924000300 migration remains byte-identical. This successor
-- removes its superseded Tenant Admin grants and materializes the approved
-- Platform Admin authority plus the missing canonical actor integrity.
DO $$
DECLARE
  ledger_rows integer;
  physical_rows integer;
  platform_admin_rows integer;
  incoherent_rows integer;
BEGIN
  IF current_database() <> 'tcdx-grc' OR current_setting('server_version_num')::integer / 10000 <> 16 THEN
    RAISE EXCEPTION 'PHASE5_MEMBERSHIP_INVITATION_AUTHORITY_TARGET_IDENTITY_MISMATCH';
  END IF;
  SELECT count(*) INTO ledger_rows FROM platform.schema_migrations WHERE outcome='applied';
  IF ledger_rows <> 17 OR NOT EXISTS (
    SELECT 1 FROM platform.schema_migrations
     WHERE migration_id='20260924000300'
       AND content_sha256='0942e5eb360f7157a444d7b04fbe7558312e8d782347e60a745a8d4365034806'
       AND outcome='applied'
  ) THEN
    RAISE EXCEPTION 'PHASE5_MEMBERSHIP_INVITATION_AUTHORITY_EXPECTED_17_APPLIED';
  END IF;
  SELECT count(*) INTO physical_rows
    FROM pg_catalog.pg_tables
   WHERE schemaname IN ('platform','iam','org','regulatory','controls','evidence','remediation','risk','audit','operations','third_party','resilience','privacy','survey','data','config','rules','integration','reporting','knowledge','ai','notification','ops_audit')
     AND NOT (schemaname='platform' AND tablename='schema_migrations');
  IF physical_rows <> 232 OR to_regclass('iam.tenant_membership_invitations') IS NULL THEN
    RAISE EXCEPTION 'PHASE5_MEMBERSHIP_INVITATION_AUTHORITY_EXPECTED_232_TABLES: %', physical_rows;
  END IF;
  IF (SELECT count(*) FROM iam.permissions WHERE permission_code IN (
    'platform.membership_invitation.create','platform.membership_invitation.update'
  ) AND lifecycle_state='published') <> 2 THEN
    RAISE EXCEPTION 'PHASE5_MEMBERSHIP_INVITATION_AUTHORITY_PERMISSION_CATALOG_MISMATCH';
  END IF;
  SELECT count(*) INTO platform_admin_rows
    FROM iam.roles
   WHERE role_code='PLATFORM_ADMIN' AND ownership_class='PLATFORM_CONTROL'
     AND tenant_id IS NULL AND is_baseline=TRUE AND lifecycle_state='published';
  IF platform_admin_rows <> 1 THEN
    RAISE EXCEPTION 'PHASE5_MEMBERSHIP_INVITATION_AUTHORITY_PLATFORM_ADMIN_AMBIGUOUS: %', platform_admin_rows;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid='iam.tenant_membership_invitations'::regclass
       AND conname IN (
         'fk_tenant_membership_invitations__created_by_service_p_96d84021',
         'fk_tenant_membership_invitations__updated_by_service_p_03a17137'
       )
  ) OR EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname='iam' AND tablename='tenant_membership_invitations'
       AND indexname IN (
         'ix_tenant_membership_invitations__created_by_service_p_d7488861',
         'ix_tenant_membership_invitations__updated_by_service_p_8df1fba4'
       )
  ) THEN
    RAISE EXCEPTION 'PHASE5_MEMBERSHIP_INVITATION_AUTHORITY_ALREADY_PRESENT_OUTSIDE_LEDGER';
  END IF;
  SELECT count(*) INTO incoherent_rows
    FROM iam.tenant_membership_invitations
   WHERE NOT (
      (lifecycle_state='accepted' AND accepted_at IS NOT NULL AND accepted_by_user_identity_id IS NOT NULL AND tenant_membership_id IS NOT NULL)
      OR
      (lifecycle_state<>'accepted' AND accepted_at IS NULL AND accepted_by_user_identity_id IS NULL AND tenant_membership_id IS NULL)
    ) OR NOT (
      (lifecycle_state='revoked' AND revoked_at IS NOT NULL AND revoked_by_user_identity_id IS NOT NULL)
      OR
      (lifecycle_state<>'revoked' AND revoked_at IS NULL AND revoked_by_user_identity_id IS NULL AND revoke_reason IS NULL)
    );
  IF incoherent_rows <> 0 THEN
    RAISE EXCEPTION 'PHASE5_MEMBERSHIP_INVITATION_AUTHORITY_INCOHERENT_ROWS: %', incoherent_rows;
  END IF;
END $$;

ALTER TABLE iam.tenant_membership_invitations
  DROP CONSTRAINT ck_tenant_membership_invitations__accepted_coherence,
  ADD CONSTRAINT ck_tenant_membership_invitations__accepted_coherence CHECK (
    (lifecycle_state='accepted' AND accepted_at IS NOT NULL AND accepted_by_user_identity_id IS NOT NULL AND tenant_membership_id IS NOT NULL)
    OR
    (lifecycle_state<>'accepted' AND accepted_at IS NULL AND accepted_by_user_identity_id IS NULL AND tenant_membership_id IS NULL)
  ),
  DROP CONSTRAINT ck_tenant_membership_invitations__revoked_coherence,
  ADD CONSTRAINT ck_tenant_membership_invitations__revoked_coherence CHECK (
    (lifecycle_state='revoked' AND revoked_at IS NOT NULL AND revoked_by_user_identity_id IS NOT NULL)
    OR
    (lifecycle_state<>'revoked' AND revoked_at IS NULL AND revoked_by_user_identity_id IS NULL AND revoke_reason IS NULL)
  ),
  ADD CONSTRAINT fk_tenant_membership_invitations__created_by_service_p_96d84021
    FOREIGN KEY (created_by_service_principal_id) REFERENCES iam.service_principals(service_principal_id) ON UPDATE NO ACTION ON DELETE RESTRICT,
  ADD CONSTRAINT fk_tenant_membership_invitations__updated_by_service_p_03a17137
    FOREIGN KEY (updated_by_service_principal_id) REFERENCES iam.service_principals(service_principal_id) ON UPDATE NO ACTION ON DELETE RESTRICT;

CREATE INDEX ix_tenant_membership_invitations__created_by_service_p_d7488861
  ON iam.tenant_membership_invitations (created_by_service_principal_id);
CREATE INDEX ix_tenant_membership_invitations__updated_by_service_p_8df1fba4
  ON iam.tenant_membership_invitations (updated_by_service_principal_id);

DELETE FROM iam.role_permissions rp
 USING iam.permissions p
 WHERE p.permission_id=rp.permission_id
   AND p.permission_code IN ('platform.membership_invitation.create','platform.membership_invitation.update');

INSERT INTO iam.role_permissions
  (role_permission_id,created_at,created_by_user_identity_id,created_by_service_principal_id,ownership_class,tenant_id,role_id,permission_id)
SELECT ('01a0d5d0-0000-7'||substr(md5(r.role_id::text||':'||p.permission_code),1,3)||'-8'||substr(md5(r.role_id::text||':'||p.permission_code),4,3)||'-'||substr(md5(r.role_id::text||':'||p.permission_code),7,12))::uuid,
       '2026-09-25T00:00:00.000Z',NULL,NULL,'PLATFORM_CONTROL',NULL,r.role_id,p.permission_id
  FROM iam.roles r
 CROSS JOIN iam.permissions p
 WHERE r.role_code='PLATFORM_ADMIN' AND r.is_baseline=TRUE AND r.lifecycle_state='published'
   AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL
   AND p.permission_code IN ('platform.membership_invitation.create','platform.membership_invitation.update');

DO $$
DECLARE actual_grants integer; unauthorized_grants integer; physical_rows integer;
BEGIN
  SELECT count(*) INTO physical_rows
    FROM pg_catalog.pg_tables
   WHERE schemaname IN ('platform','iam','org','regulatory','controls','evidence','remediation','risk','audit','operations','third_party','resilience','privacy','survey','data','config','rules','integration','reporting','knowledge','ai','notification','ops_audit')
     AND NOT (schemaname='platform' AND tablename='schema_migrations');
  IF physical_rows <> 232 THEN
    RAISE EXCEPTION 'PHASE5_MEMBERSHIP_INVITATION_AUTHORITY_TABLE_COUNT_CHANGED: %', physical_rows;
  END IF;
  SELECT count(*) INTO actual_grants FROM iam.role_permissions rp
    JOIN iam.roles r ON r.role_id=rp.role_id
    JOIN iam.permissions p ON p.permission_id=rp.permission_id
   WHERE r.role_code='PLATFORM_ADMIN'
     AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL
     AND rp.ownership_class='PLATFORM_CONTROL' AND rp.tenant_id IS NULL
     AND p.permission_code IN ('platform.membership_invitation.create','platform.membership_invitation.update');
  IF actual_grants <> 2 THEN
    RAISE EXCEPTION 'PHASE5_MEMBERSHIP_INVITATION_AUTHORITY_PLATFORM_GRANTS: %/2', actual_grants;
  END IF;
  SELECT count(*) INTO unauthorized_grants FROM iam.role_permissions rp
    JOIN iam.roles r ON r.role_id=rp.role_id
    JOIN iam.permissions p ON p.permission_id=rp.permission_id
   WHERE p.permission_code IN ('platform.membership_invitation.create','platform.membership_invitation.update')
     AND NOT (
       r.role_code='PLATFORM_ADMIN'
       AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL
       AND rp.ownership_class='PLATFORM_CONTROL' AND rp.tenant_id IS NULL
     );
  IF unauthorized_grants <> 0 THEN
    RAISE EXCEPTION 'PHASE5_MEMBERSHIP_INVITATION_AUTHORITY_UNAUTHORIZED_GRANTS: %', unauthorized_grants;
  END IF;
  IF (SELECT count(*) FROM pg_constraint
       WHERE conrelid='iam.tenant_membership_invitations'::regclass
         AND conname IN (
           'fk_tenant_membership_invitations__created_by_service_p_96d84021',
           'fk_tenant_membership_invitations__updated_by_service_p_03a17137'
         )) <> 2 THEN
    RAISE EXCEPTION 'PHASE5_MEMBERSHIP_INVITATION_AUTHORITY_SERVICE_ACTOR_FKS_MISSING';
  END IF;
END $$;
