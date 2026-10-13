-- R3 forward-only candidate34; outside active manifest. Caller owns BEGIN/COMMIT/ledger.
-- No role, permission, MembershipRole, custom grant or historical migration changes.
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
LOCK TABLE iam.roles,iam.permissions,iam.role_permissions IN SHARE ROW EXCLUSIVE MODE;
DO $delta$ DECLARE actor uuid; target record; grant_row iam.role_permissions%ROWTYPE;
 pid uuid; aid uuid; gid uuid; stamp text; entropy text; state jsonb; prior jsonb; desired boolean; BEGIN
 actor:=nullif(current_setting('tcdx.publication_service_principal_id',true),'')::uuid;
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM iam.service_principals WHERE service_principal_id=actor AND ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL AND lifecycle_state='active') THEN RAISE EXCEPTION 'R3_ACTIVE_PUBLICATION_ACTOR_REQUIRED';END IF;
 IF NOT EXISTS(SELECT 1 FROM platform.schema_migrations WHERE migration_id='20260916000900' AND content_sha256='94547ff1fa6a9accf56ff6f28be93afeb91b8c290ca9bb224667862c64c8c2e7' AND outcome='applied') THEN RAISE EXCEPTION 'R3_SOURCE_REQUIRED';END IF;
 IF (SELECT count(*) FROM iam.roles WHERE is_baseline AND lifecycle_state='published' AND tenant_id IS NULL AND ownership_class='PLATFORM_CONTROL' AND role_code IN('AUDITOR','VIEWER','REPORT_VIEWER','EXECUTIVE_BOARD_VIEWER','GRC_MANAGER','QUALITY_MANAGER','COMPLIANCE_MANAGER','CISO_SECURITY_MANAGER','AI_GOVERNANCE_MANAGER','PRIVACY_MANAGER','LEGAL_REVIEWER','REGULATORY_CONTENT_STEWARD'))<>12 THEN RAISE EXCEPTION 'R3_EXACT_GLOBAL_ROLES_REQUIRED';END IF;
 IF (SELECT count(*) FROM iam.permissions WHERE lifecycle_state='published' AND permission_code IN('compliance.requirement.read','remediation.action.create'))<>2 THEN RAISE EXCEPTION 'R3_EXISTING_PERMISSIONS_REQUIRED';END IF;
 IF EXISTS(SELECT 1 FROM iam.roles WHERE is_baseline AND role_code IN('AUDITOR','VIEWER','REPORT_VIEWER','EXECUTIVE_BOARD_VIEWER','GRC_MANAGER','QUALITY_MANAGER','COMPLIANCE_MANAGER','CISO_SECURITY_MANAGER','AI_GOVERNANCE_MANAGER','PRIVACY_MANAGER','LEGAL_REVIEWER','REGULATORY_CONTENT_STEWARD') AND (lifecycle_state<>'published' OR (tenant_id IS NULL AND ownership_class<>'PLATFORM_CONTROL') OR (tenant_id IS NOT NULL AND ownership_class<>'TENANT_OWNED'))) THEN RAISE EXCEPTION 'R3_BASELINE_ROLE_INCOMPATIBLE';END IF;
 FOR target IN SELECT * FROM iam.roles WHERE is_baseline AND lifecycle_state='published' AND role_code IN('AUDITOR','VIEWER','REPORT_VIEWER','EXECUTIVE_BOARD_VIEWER','GRC_MANAGER','QUALITY_MANAGER','COMPLIANCE_MANAGER','CISO_SECURITY_MANAGER','AI_GOVERNANCE_MANAGER','PRIVACY_MANAGER','LEGAL_REVIEWER','REGULATORY_CONTENT_STEWARD') ORDER BY tenant_id NULLS FIRST,role_code LOOP
  desired:=target.role_code<>'AUDITOR';
  SELECT permission_id INTO STRICT pid FROM iam.permissions WHERE permission_code=CASE WHEN desired THEN 'compliance.requirement.read' ELSE 'remediation.action.create' END;
  SELECT * INTO grant_row FROM iam.role_permissions WHERE role_id=target.role_id AND permission_id=pid;
  IF FOUND AND (grant_row.tenant_id IS DISTINCT FROM target.tenant_id OR grant_row.ownership_class<>target.ownership_class) THEN RAISE EXCEPTION 'R3_GRANT_OWNERSHIP_INCOMPATIBLE';END IF;
  -- Existing evidence is immutable. Never replace a corrupted receipt or adopt a replay as INSERT.
  IF EXISTS(SELECT 1 FROM ops_audit.audit_events a WHERE a.command_code='phase6a3RbacResolutionR3' AND a.after_payload->>'role_id'=target.role_id::text AND a.after_payload->>'permission_id'=pid::text) THEN
   IF (SELECT count(*) FROM ops_audit.audit_events WHERE command_code='phase6a3RbacResolutionR3' AND after_payload->>'role_id'=target.role_id::text AND after_payload->>'permission_id'=pid::text)<>1 OR NOT EXISTS(SELECT 1 FROM ops_audit.audit_events a JOIN iam.service_principals sp ON sp.service_principal_id=a.actor_service_principal_id AND sp.tenant_id IS NULL AND sp.ownership_class='PLATFORM_CONTROL' WHERE a.command_code='phase6a3RbacResolutionR3' AND a.event_code='audit.iam.role_permission.publish.v1' AND a.aggregate_type='RolePermission' AND a.tenant_id IS NOT DISTINCT FROM target.tenant_id AND a.ownership_class=target.ownership_class AND a.actor_user_identity_id IS NULL AND a.outcome='success' AND a.after_payload->>'role_id'=target.role_id::text AND a.after_payload->>'permission_id'=pid::text AND a.after_payload->>'present'=desired::text AND a.after_payload@>'{"manifest_sha256":"17eeb65269bc2dc9727c605999f1fd0c5c343cab3b6653a372c3d879618daed9","receipt_sha256":"3d69c54a089e0996096b6b37eab1ec45c320f96771c97030c2741fd2afff816d","migration_id":"20261009000400","source_migration_id":"20260916000900","source_migration_sha256":"94547ff1fa6a9accf56ff6f28be93afeb91b8c290ca9bb224667862c64c8c2e7"}'::jsonb AND (NOT desired OR a.aggregate_id=grant_row.role_permission_id)) OR desired<>(grant_row.role_permission_id IS NOT NULL) THEN RAISE EXCEPTION 'R3_IMMUTABLE_AUDIT_OR_STATE_MISMATCH';END IF;
   CONTINUE;
  END IF;
  stamp:=lpad(to_hex(floor(extract(epoch FROM clock_timestamp())*1000)::bigint),12,'0');entropy:=md5(gen_random_uuid()::text);aid:=(substr(stamp,1,8)||'-'||substr(stamp,9,4)||'-7'||substr(entropy,1,3)||'-8'||substr(entropy,4,3)||'-'||substr(entropy,7,12))::uuid;
  state:=jsonb_build_object('present',grant_row.role_permission_id IS NOT NULL,'role_id',target.role_id,'role_code',target.role_code,'permission_id',pid,'permission_code',CASE WHEN desired THEN 'compliance.requirement.read' ELSE 'remediation.action.create' END);
  prior:=state;
  IF NOT desired THEN
   IF grant_row.role_permission_id IS NULL THEN RAISE EXCEPTION 'R3_REVOCATION_HISTORY_REQUIRED';END IF;
   gid:=grant_row.role_permission_id;prior:=prior||jsonb_build_object('row_snapshot',to_jsonb(grant_row));DELETE FROM iam.role_permissions WHERE role_permission_id=gid;
  ELSE
   gid:=grant_row.role_permission_id;
   IF gid IS NULL THEN
    entropy:=md5(gen_random_uuid()::text);gid:=(substr(stamp,1,8)||'-'||substr(stamp,9,4)||'-7'||substr(entropy,1,3)||'-8'||substr(entropy,4,3)||'-'||substr(entropy,7,12))::uuid;
    INSERT INTO iam.role_permissions(role_permission_id,ownership_class,tenant_id,role_id,permission_id) VALUES(gid,target.ownership_class,target.tenant_id,target.role_id,pid);
   END IF;
  END IF;
  INSERT INTO ops_audit.audit_events(audit_event_id,ownership_class,tenant_id,correlation_id,event_code,event_version,aggregate_type,aggregate_id,command_code,actor_service_principal_id,occurred_at,outcome,before_payload,after_payload,classification)
  VALUES(aid,target.ownership_class,target.tenant_id,aid,'audit.iam.role_permission.publish.v1',1,'RolePermission',gid,'phase6a3RbacResolutionR3',actor,clock_timestamp(),'success',prior,state||jsonb_build_object('present',desired,'reason','Exact approved R3 reconciliation; actual presence audited, custom roles and membership history preserved')||'{"manifest_sha256":"17eeb65269bc2dc9727c605999f1fd0c5c343cab3b6653a372c3d879618daed9","receipt_sha256":"3d69c54a089e0996096b6b37eab1ec45c320f96771c97030c2741fd2afff816d","migration_id":"20261009000400","source_migration_id":"20260916000900","source_migration_sha256":"94547ff1fa6a9accf56ff6f28be93afeb91b8c290ca9bb224667862c64c8c2e7"}'::jsonb,'restricted');
 END LOOP;
END $delta$;
