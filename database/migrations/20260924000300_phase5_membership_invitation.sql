-- DR-PHASE5-CANONICAL-TENANT-USER-ENROLLMENT-2026-09-24.
-- Forward-only Phase 5 Zoho invitation/enrollment boundary.
DO $$
DECLARE ledger_rows integer; physical_rows integer;
BEGIN
  IF current_database() <> 'tcdx-grc' OR current_setting('server_version_num')::integer / 10000 <> 16 THEN
    RAISE EXCEPTION 'PHASE5_MEMBERSHIP_INVITATION_TARGET_IDENTITY_MISMATCH';
  END IF;
  SELECT count(*) INTO ledger_rows FROM platform.schema_migrations WHERE outcome='applied';
  IF ledger_rows <> 16 OR NOT EXISTS (
    SELECT 1 FROM platform.schema_migrations WHERE migration_id='20260924000200' AND outcome='applied'
  ) THEN
    RAISE EXCEPTION 'PHASE5_MEMBERSHIP_INVITATION_EXPECTED_16_APPLIED';
  END IF;
  SELECT count(*) INTO physical_rows
    FROM pg_catalog.pg_tables
   WHERE schemaname IN ('platform','iam','org','regulatory','controls','evidence','remediation','risk','audit','operations','third_party','resilience','privacy','survey','data','config','rules','integration','reporting','knowledge','ai','notification','ops_audit')
     AND NOT (schemaname='platform' AND tablename='schema_migrations');
  IF physical_rows <> 231 THEN
    RAISE EXCEPTION 'PHASE5_MEMBERSHIP_INVITATION_EXPECTED_231_TABLES: %', physical_rows;
  END IF;
  IF to_regclass('iam.tenant_membership_invitations') IS NOT NULL THEN
    RAISE EXCEPTION 'PHASE5_MEMBERSHIP_INVITATION_ALREADY_PRESENT_OUTSIDE_LEDGER';
  END IF;
  IF EXISTS (SELECT 1 FROM iam.permissions WHERE permission_code IN (
    'platform.membership_invitation.create','platform.membership_invitation.update'
  )) THEN
    RAISE EXCEPTION 'PHASE5_MEMBERSHIP_INVITATION_PERMISSION_ALREADY_PRESENT_OUTSIDE_LEDGER';
  END IF;
END $$;

CREATE TABLE iam.tenant_membership_invitations (
  tenant_membership_invitation_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_user_identity_id uuid,
  created_by_service_principal_id uuid,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by_user_identity_id uuid,
  updated_by_service_principal_id uuid,
  row_version bigint NOT NULL DEFAULT 1,
  tenant_id uuid NOT NULL,
  invitee_email varchar(320) NOT NULL,
  authentication_method varchar(32) NOT NULL,
  token_digest char(64) NOT NULL,
  lifecycle_state varchar(32) NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by_user_identity_id uuid,
  tenant_membership_id uuid,
  revoked_at timestamptz,
  revoked_by_user_identity_id uuid,
  revoke_reason text,
  CONSTRAINT pk_tenant_membership_invitations PRIMARY KEY (tenant_membership_invitation_id),
  CONSTRAINT ck_tenant_membership_invitations__created_actor_one CHECK (num_nonnulls(created_by_user_identity_id,created_by_service_principal_id) <= 1),
  CONSTRAINT ck_tenant_membership_invitations__updated_actor_one CHECK (num_nonnulls(updated_by_user_identity_id,updated_by_service_principal_id) <= 1),
  CONSTRAINT ck_tenant_membership_invitations__row_version_positive CHECK (row_version > 0),
  CONSTRAINT ck_tenant_membership_invitations__email_normalized CHECK (invitee_email=lower(btrim(invitee_email)) AND invitee_email LIKE '%@%'),
  CONSTRAINT ck_tenant_membership_invitations__authentication_method CHECK (authentication_method='ZOHO'),
  CONSTRAINT ck_tenant_membership_invitations__token_digest CHECK (token_digest ~ '^[0-9a-f]{64}$'),
  CONSTRAINT ck_tenant_membership_invitations__lifecycle CHECK (lifecycle_state IN ('pending','accepted','expired','revoked')),
  CONSTRAINT ck_tenant_membership_invitations__expiry CHECK (expires_at > created_at),
  CONSTRAINT ck_tenant_membership_invitations__accepted_coherence CHECK (
    (lifecycle_state='accepted') = (accepted_at IS NOT NULL AND accepted_by_user_identity_id IS NOT NULL AND tenant_membership_id IS NOT NULL)
  ),
  CONSTRAINT ck_tenant_membership_invitations__revoked_coherence CHECK (
    (lifecycle_state='revoked') = (revoked_at IS NOT NULL AND revoked_by_user_identity_id IS NOT NULL)
  ),
  CONSTRAINT uq_tenant_membership_invitations__tenant_id_invitation_id UNIQUE NULLS NOT DISTINCT (tenant_id,tenant_membership_invitation_id),
  CONSTRAINT uq_tenant_membership_invitations__token_digest UNIQUE (token_digest),
  CONSTRAINT fk_tenant_membership_invitations__tenant_id FOREIGN KEY (tenant_id) REFERENCES platform.tenants(tenant_id),
  CONSTRAINT fk_tenant_membership_invitations__created_by_user_identity_id FOREIGN KEY (created_by_user_identity_id) REFERENCES iam.user_identities(user_identity_id),
  CONSTRAINT fk_tenant_membership_invitations__updated_by_user_identity_id FOREIGN KEY (updated_by_user_identity_id) REFERENCES iam.user_identities(user_identity_id),
  CONSTRAINT fk_tenant_membership_invitations__accepted_identity FOREIGN KEY (accepted_by_user_identity_id) REFERENCES iam.user_identities(user_identity_id),
  CONSTRAINT fk_tenant_membership_invitations__revoked_identity FOREIGN KEY (revoked_by_user_identity_id) REFERENCES iam.user_identities(user_identity_id),
  CONSTRAINT fk_tenant_membership_invitations__membership FOREIGN KEY (tenant_id,tenant_membership_id) REFERENCES iam.tenant_memberships(tenant_id,tenant_membership_id)
);

CREATE INDEX ix_tenant_membership_invitations__tenant_state_expiry
  ON iam.tenant_membership_invitations (tenant_id,lifecycle_state,expires_at);
CREATE INDEX ix_tenant_membership_invitations__created_by_user_identity_id
  ON iam.tenant_membership_invitations (created_by_user_identity_id);
CREATE INDEX ix_tenant_membership_invitations__updated_by_user_identity_id
  ON iam.tenant_membership_invitations (updated_by_user_identity_id);
CREATE INDEX ix_tenant_membership_invitations__accepted_by_user_identity_id
  ON iam.tenant_membership_invitations (accepted_by_user_identity_id);
CREATE INDEX ix_tenant_membership_invitations__revoked_by_user_identity_id
  ON iam.tenant_membership_invitations (revoked_by_user_identity_id);

INSERT INTO iam.permissions
  (permission_id,created_at,created_by_user_identity_id,created_by_service_principal_id,
   updated_at,updated_by_user_identity_id,updated_by_service_principal_id,row_version,
   permission_code,domain_code,resource_code,action_code,lifecycle_state)
VALUES
  ('01a0d5d0-0000-7001-8000-000000000001','2026-09-24T00:00:00.000Z',NULL,NULL,'2026-09-24T00:00:00.000Z',NULL,NULL,1,
   'platform.membership_invitation.create','platform','membership_invitation','create','published'),
  ('01a0d5d0-0000-7002-8000-000000000002','2026-09-24T00:00:00.000Z',NULL,NULL,'2026-09-24T00:00:00.000Z',NULL,NULL,1,
   'platform.membership_invitation.update','platform','membership_invitation','update','published');

INSERT INTO iam.role_permissions
  (role_permission_id,created_at,created_by_user_identity_id,created_by_service_principal_id,ownership_class,tenant_id,role_id,permission_id)
SELECT ('01a0d5d0-0000-7'||substr(md5(r.role_id::text||':'||p.permission_code),1,3)||'-8'||substr(md5(r.role_id::text||':'||p.permission_code),4,3)||'-'||substr(md5(r.role_id::text||':'||p.permission_code),7,12))::uuid,
       '2026-09-24T00:00:00.000Z',NULL,NULL,r.ownership_class,r.tenant_id,r.role_id,p.permission_id
  FROM iam.roles r
 CROSS JOIN iam.permissions p
 WHERE r.role_code='TENANT_ADMIN' AND r.is_baseline=TRUE AND r.lifecycle_state='published'
   AND r.ownership_class IN ('PLATFORM_CONTROL','TENANT_OWNED')
   AND p.permission_code IN ('platform.membership_invitation.create','platform.membership_invitation.update');

DO $$
DECLARE physical_rows integer; expected_grants integer; actual_grants integer;
BEGIN
  SELECT count(*) INTO physical_rows
    FROM pg_catalog.pg_tables
   WHERE schemaname IN ('platform','iam','org','regulatory','controls','evidence','remediation','risk','audit','operations','third_party','resilience','privacy','survey','data','config','rules','integration','reporting','knowledge','ai','notification','ops_audit')
     AND NOT (schemaname='platform' AND tablename='schema_migrations');
  IF physical_rows <> 232 THEN RAISE EXCEPTION 'PHASE5_MEMBERSHIP_INVITATION_EXPECTED_232_TABLES: %', physical_rows; END IF;
  IF (SELECT count(*) FROM iam.permissions WHERE permission_code IN (
    'platform.membership_invitation.create','platform.membership_invitation.update'
  ) AND lifecycle_state='published') <> 2 THEN
    RAISE EXCEPTION 'PHASE5_MEMBERSHIP_INVITATION_PERMISSION_POSTCONDITION_FAILED';
  END IF;
  SELECT count(*)*2 INTO expected_grants FROM iam.roles
   WHERE role_code='TENANT_ADMIN' AND is_baseline=TRUE AND lifecycle_state='published'
     AND ownership_class IN ('PLATFORM_CONTROL','TENANT_OWNED');
  SELECT count(*) INTO actual_grants FROM iam.role_permissions rp
    JOIN iam.roles r ON r.role_id=rp.role_id
    JOIN iam.permissions p ON p.permission_id=rp.permission_id
   WHERE r.role_code='TENANT_ADMIN' AND p.permission_code IN (
     'platform.membership_invitation.create','platform.membership_invitation.update'
   );
  IF actual_grants <> expected_grants THEN
    RAISE EXCEPTION 'PHASE5_MEMBERSHIP_INVITATION_GRANT_POSTCONDITION_FAILED: %/%', actual_grants, expected_grants;
  END IF;
END $$;
