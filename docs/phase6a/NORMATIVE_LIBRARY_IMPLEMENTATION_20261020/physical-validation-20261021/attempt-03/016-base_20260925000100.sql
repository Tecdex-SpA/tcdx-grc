BEGIN;
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
COMMIT;