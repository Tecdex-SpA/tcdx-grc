BEGIN;
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
COMMIT;