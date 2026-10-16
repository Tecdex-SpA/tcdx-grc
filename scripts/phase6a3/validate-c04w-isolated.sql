\set ON_ERROR_STOP on
BEGIN;
DO $$
DECLARE
  tenant_one uuid;
  tenant_two uuid;
  actor_id uuid;
  reviewer_id uuid;
  reviewer_membership_id uuid := gen_random_uuid();
  reviewer_role_id uuid := gen_random_uuid();
  release_permission_id uuid := gen_random_uuid();
  release_audit_id uuid := gen_random_uuid();
  release_id uuid := gen_random_uuid();
  ordinary_policy uuid := gen_random_uuid();
  hold_policy uuid := gen_random_uuid();
  application_id uuid := gen_random_uuid();
  hold_application_id uuid := gen_random_uuid();
  rejected boolean;
BEGIN
  SELECT tenant_id INTO tenant_one FROM platform.tenants ORDER BY tenant_id LIMIT 1;
  SELECT tenant_id INTO tenant_two FROM platform.tenants WHERE tenant_id<>tenant_one ORDER BY tenant_id LIMIT 1;
  SELECT user_identity_id INTO actor_id FROM iam.user_identities ORDER BY user_identity_id LIMIT 1;
  SELECT user_identity_id INTO reviewer_id FROM iam.user_identities
   WHERE user_identity_id<>actor_id ORDER BY user_identity_id LIMIT 1;
  IF tenant_one IS NULL OR tenant_two IS NULL OR actor_id IS NULL OR reviewer_id IS NULL THEN
    RAISE EXCEPTION 'C04W_ISOLATED_FIXTURE_MISSING';
  END IF;

  INSERT INTO privacy.retention_policies
    (retention_policy_id,ownership_class,tenant_id,policy_code,version_number,policy_kind,
     retention_seconds,trigger_event_code,precedence_rank,is_mandatory,lifecycle_state,effective_from)
  VALUES
    (ordinary_policy,'TENANT_OWNED',tenant_one,'C04W_ISOLATED_ORDINARY',1,'tenant_policy',
     3600,'expiry_or_closure',200,false,'published',transaction_timestamp()-interval '1 minute'),
    (hold_policy,'TENANT_OWNED',tenant_one,'C04W_ISOLATED_HOLD',1,'legal_hold',
     NULL,'expiry_or_closure',500,true,'published',transaction_timestamp()-interval '1 minute');

  rejected := false;
  BEGIN
    INSERT INTO privacy.retention_policies
      (retention_policy_id,ownership_class,tenant_id,policy_code,version_number,policy_kind,
       retention_seconds,trigger_event_code,precedence_rank,is_mandatory,lifecycle_state)
    VALUES (gen_random_uuid(),'TENANT_OWNED',tenant_one,'C04W_INVALID_HOLD',1,'legal_hold',
      1,'expiry_or_closure',500,true,'draft');
  EXCEPTION WHEN check_violation THEN rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'C04W_HOLD_DURATION_ACCEPTED'; END IF;

  rejected := false;
  BEGIN
    INSERT INTO privacy.retention_policy_applicabilities
      (retention_policy_applicability_id,tenant_id,retention_policy_id,version_number,
       classification,purpose,lifecycle_state,created_by_user_identity_id)
    VALUES (gen_random_uuid(),tenant_two,ordinary_policy,1,'confidential','evidence_document','draft',actor_id);
  EXCEPTION WHEN foreign_key_violation OR raise_exception THEN rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'C04W_CROSS_TENANT_POLICY_ACCEPTED'; END IF;

  INSERT INTO privacy.retention_policy_applicabilities
    (retention_policy_applicability_id,tenant_id,retention_policy_id,version_number,
     classification,purpose,lifecycle_state,created_by_user_identity_id)
  VALUES (application_id,tenant_one,ordinary_policy,1,'confidential','evidence_document','draft',actor_id),
         (hold_application_id,tenant_one,hold_policy,1,'confidential','evidence_document','draft',actor_id);
  UPDATE privacy.retention_policy_applicabilities SET lifecycle_state='under_review',row_version=2
    WHERE retention_policy_applicability_id IN (application_id,hold_application_id);
  UPDATE privacy.retention_policy_applicabilities SET lifecycle_state='approved',row_version=3
    WHERE retention_policy_applicability_id IN (application_id,hold_application_id);
  UPDATE privacy.retention_policy_applicabilities
     SET lifecycle_state='published',row_version=4,published_at=transaction_timestamp(),
         effective_from=transaction_timestamp()-interval '30 seconds'
   WHERE retention_policy_applicability_id IN (application_id,hold_application_id);

  rejected := false;
  BEGIN
    UPDATE privacy.retention_policy_applicabilities SET source_clause_ref='tamper',row_version=5
     WHERE retention_policy_applicability_id=application_id;
  EXCEPTION WHEN raise_exception THEN rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'C04W_PUBLISHED_MUTATION_ACCEPTED'; END IF;

  rejected := false;
  BEGIN
    INSERT INTO privacy.retention_policy_hold_releases
      (hold_release_id,tenant_id,retention_policy_applicability_id,released_by_membership_id,reason,audit_event_id)
    VALUES (gen_random_uuid(),tenant_one,hold_application_id,gen_random_uuid(),'isolated negative test',gen_random_uuid());
  EXCEPTION WHEN raise_exception THEN rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'C04W_UNAUTHORIZED_RELEASE_ACCEPTED'; END IF;

  INSERT INTO iam.tenant_memberships
    (tenant_membership_id,tenant_id,user_identity_id,membership_state,joined_at)
  VALUES (reviewer_membership_id,tenant_one,reviewer_id,'active',transaction_timestamp());
  INSERT INTO iam.roles (role_id,ownership_class,tenant_id,role_code,name,lifecycle_state)
  VALUES (reviewer_role_id,'TENANT_OWNED',tenant_one,'LEGAL_REVIEWER','Isolated legal reviewer','published');
  INSERT INTO iam.permissions
    (permission_id,permission_code,domain_code,resource_code,action_code,lifecycle_state)
  VALUES (release_permission_id,'privacy.retention_policy.legal_hold.release',
          'privacy','retention_policy','release','published');
  INSERT INTO iam.role_permissions
    (role_permission_id,ownership_class,tenant_id,role_id,permission_id)
  VALUES (gen_random_uuid(),'TENANT_OWNED',tenant_one,reviewer_role_id,release_permission_id);
  INSERT INTO iam.membership_roles
    (membership_role_id,tenant_id,tenant_membership_id,role_id,scope_kind,valid_from)
  VALUES (gen_random_uuid(),tenant_one,reviewer_membership_id,reviewer_role_id,
          'tenant',transaction_timestamp()-interval '1 second');
  INSERT INTO ops_audit.audit_events
    (audit_event_id,ownership_class,tenant_id,correlation_id,event_code,event_version,
     aggregate_type,aggregate_id,command_code,actor_user_identity_id,occurred_at,outcome,classification)
  VALUES (release_audit_id,'TENANT_OWNED',tenant_one,gen_random_uuid(),
          'audit.privacy.retention_policy.legal_hold.release.v1',1,
          'RetentionPolicyApplicability',hold_application_id,'retention_policy.legal_hold.release',
          reviewer_id,transaction_timestamp(),'success','internal');
  INSERT INTO privacy.retention_policy_hold_releases
    (hold_release_id,tenant_id,retention_policy_applicability_id,released_by_membership_id,reason,audit_event_id)
  VALUES (release_id,tenant_one,hold_application_id,reviewer_membership_id,
          'Isolated authorized release',release_audit_id);
  IF NOT EXISTS (
    SELECT 1 FROM privacy.retention_policy_hold_releases
     WHERE hold_release_id=release_id AND released_at=transaction_timestamp()
  ) THEN RAISE EXCEPTION 'C04W_AUTHORIZED_RELEASE_NOT_PERSISTED'; END IF;

  rejected := false;
  BEGIN
    UPDATE privacy.retention_policy_hold_releases SET reason='changed'
     WHERE hold_release_id=release_id;
  EXCEPTION WHEN raise_exception THEN rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'C04W_RELEASE_HISTORY_MUTABLE'; END IF;

  rejected := false;
  BEGIN
    INSERT INTO privacy.retention_policy_hold_releases
      (hold_release_id,tenant_id,retention_policy_applicability_id,released_by_membership_id,reason,audit_event_id)
    VALUES (gen_random_uuid(),tenant_one,hold_application_id,reviewer_membership_id,
            'Duplicate release',gen_random_uuid());
  EXCEPTION WHEN unique_violation THEN rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'C04W_DUPLICATE_RELEASE_ACCEPTED'; END IF;

  RAISE NOTICE 'C04W_ISOLATED_CONSTRAINTS=PASS';
END $$;
ROLLBACK;
