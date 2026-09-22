-- Phase 5 authorized runtime materialization of the ten PRE-F5 read permissions
-- and the PRE-F5B Evidence materialization permission. No schema changes.
DO $$
BEGIN
  IF (SELECT count(*) FROM platform.schema_migrations WHERE outcome='applied') <> 11
     OR NOT EXISTS (SELECT 1 FROM platform.schema_migrations WHERE migration_id='20260921000100' AND outcome='applied') THEN
    RAISE EXCEPTION 'PHASE5_PERMISSION_PREFLIGHT_EXPECTED_11_APPLIED';
  END IF;
  IF (SELECT count(*) FROM pg_catalog.pg_tables WHERE schemaname IN ('platform','iam','org','regulatory','controls','evidence','remediation','risk','audit','operations','third_party','resilience','privacy','survey','data','config','rules','integration','reporting','knowledge','ai','notification','ops_audit') AND NOT (schemaname='platform' AND tablename='schema_migrations')) <> 229 THEN
    RAISE EXCEPTION 'PHASE5_PERMISSION_PREFLIGHT_EXPECTED_229_TABLES';
  END IF;
END $$;

WITH permission_seed(permission_code,domain_code,resource_code,action_code) AS (VALUES
  ('compliance.applicability.read','compliance','applicability','read'),
  ('compliance.requirement_assessment.read','compliance','requirement_assessment','read'),
  ('compliance.soa.read','compliance','soa','read'),
  ('controls.control.read','controls','control','read'),
  ('controls.control_assessment.read','controls','control_assessment','read'),
  ('controls.assurance_test.read','controls','assurance_test','read'),
  ('evidence.evidence_request.read','evidence','evidence_request','read'),
  ('evidence.evidence.read','evidence','evidence','read'),
  ('remediation.issue.read','remediation','issue','read'),
  ('remediation.action.read','remediation','action','read'),
  ('evidence.evidence.create','evidence','evidence','create')
), identified AS (
  SELECT ('01a0c143-2c02-7'||substr(md5(permission_code),1,3)||'-8'||substr(md5(permission_code),4,3)||'-'||substr(md5(permission_code),7,12))::uuid AS permission_id,*
  FROM permission_seed
)
INSERT INTO iam.permissions
  (permission_id,created_at,created_by_user_identity_id,created_by_service_principal_id,updated_at,updated_by_user_identity_id,updated_by_service_principal_id,row_version,permission_code,domain_code,resource_code,action_code,lifecycle_state)
SELECT permission_id,'2026-09-21T00:00:00.000Z',NULL,NULL,'2026-09-21T00:00:00.000Z',NULL,NULL,1,permission_code,domain_code,resource_code,action_code,'published'
FROM identified ON CONFLICT (permission_code) DO NOTHING;

WITH common_roles(role_code) AS (VALUES
  ('VIEWER'),('REPORT_VIEWER'),('EXECUTIVE_BOARD_VIEWER'),('GRC_MANAGER'),('QUALITY_MANAGER'),('COMPLIANCE_MANAGER'),
  ('CISO_SECURITY_MANAGER'),('AI_GOVERNANCE_MANAGER'),('PRIVACY_MANAGER'),('LEGAL_REVIEWER'),('AUDITOR_LEAD'),('AUDITOR')
), permission_roles(permission_code,role_codes) AS (VALUES
  ('compliance.applicability.read',ARRAY(SELECT role_code FROM common_roles)),
  ('compliance.requirement_assessment.read',ARRAY(SELECT role_code FROM common_roles)),
  ('compliance.soa.read',ARRAY(SELECT role_code FROM common_roles)),
  ('controls.control.read',ARRAY['VIEWER','REPORT_VIEWER','EXECUTIVE_BOARD_VIEWER','GRC_MANAGER','QUALITY_MANAGER','COMPLIANCE_MANAGER','CISO_SECURITY_MANAGER','AI_GOVERNANCE_MANAGER','PRIVACY_MANAGER','AUDITOR_LEAD','AUDITOR','PROCESS_OWNER','CONTROL_OWNER']),
  ('controls.control_assessment.read',ARRAY['VIEWER','REPORT_VIEWER','EXECUTIVE_BOARD_VIEWER','GRC_MANAGER','QUALITY_MANAGER','COMPLIANCE_MANAGER','CISO_SECURITY_MANAGER','AI_GOVERNANCE_MANAGER','PRIVACY_MANAGER','AUDITOR_LEAD','AUDITOR','PROCESS_OWNER','CONTROL_OWNER']),
  ('controls.assurance_test.read',ARRAY['VIEWER','REPORT_VIEWER','EXECUTIVE_BOARD_VIEWER','GRC_MANAGER','QUALITY_MANAGER','COMPLIANCE_MANAGER','CISO_SECURITY_MANAGER','AI_GOVERNANCE_MANAGER','PRIVACY_MANAGER','AUDITOR_LEAD','AUDITOR','CONTROL_OWNER']),
  ('evidence.evidence_request.read',ARRAY['VIEWER','REPORT_VIEWER','EXECUTIVE_BOARD_VIEWER','GRC_MANAGER','QUALITY_MANAGER','COMPLIANCE_MANAGER','CISO_SECURITY_MANAGER','AI_GOVERNANCE_MANAGER','PRIVACY_MANAGER','LEGAL_REVIEWER','AUDITOR_LEAD','AUDITOR','CONTROL_OWNER','EVIDENCE_OWNER']),
  ('evidence.evidence.read',ARRAY['VIEWER','REPORT_VIEWER','EXECUTIVE_BOARD_VIEWER','GRC_MANAGER','QUALITY_MANAGER','COMPLIANCE_MANAGER','CISO_SECURITY_MANAGER','AI_GOVERNANCE_MANAGER','PRIVACY_MANAGER','LEGAL_REVIEWER','AUDITOR_LEAD','AUDITOR','CONTROL_OWNER','EVIDENCE_OWNER']),
  ('remediation.issue.read',ARRAY['VIEWER','REPORT_VIEWER','EXECUTIVE_BOARD_VIEWER','GRC_MANAGER','QUALITY_MANAGER','COMPLIANCE_MANAGER','RISK_MANAGER','CISO_SECURITY_MANAGER','AI_GOVERNANCE_MANAGER','PRIVACY_MANAGER','LEGAL_REVIEWER','AUDITOR_LEAD','AUDITOR','PROCESS_OWNER','CONTROL_OWNER','ACTION_OWNER']),
  ('remediation.action.read',ARRAY['VIEWER','REPORT_VIEWER','EXECUTIVE_BOARD_VIEWER','GRC_MANAGER','QUALITY_MANAGER','COMPLIANCE_MANAGER','RISK_MANAGER','CISO_SECURITY_MANAGER','AI_GOVERNANCE_MANAGER','PRIVACY_MANAGER','LEGAL_REVIEWER','AUDITOR_LEAD','AUDITOR','PROCESS_OWNER','CONTROL_OWNER','EVIDENCE_OWNER','ACTION_OWNER']),
  ('evidence.evidence.create',ARRAY['EVIDENCE_OWNER'])
), expanded AS (
  SELECT permission_code,unnest(role_codes) AS role_code FROM permission_roles
), resolved AS (
  SELECT e.permission_code,e.role_code,p.permission_id,r.role_id,
    ('01a0c143-2c02-7'||substr(md5(e.permission_code||':'||e.role_code),1,3)||'-8'||substr(md5(e.permission_code||':'||e.role_code),4,3)||'-'||substr(md5(e.permission_code||':'||e.role_code),7,12))::uuid AS role_permission_id
  FROM expanded e JOIN iam.permissions p USING(permission_code) JOIN iam.roles r ON r.role_code=e.role_code AND r.tenant_id IS NULL AND r.lifecycle_state='published'
)
INSERT INTO iam.role_permissions
  (role_permission_id,created_at,created_by_user_identity_id,created_by_service_principal_id,ownership_class,tenant_id,role_id,permission_id)
SELECT role_permission_id,'2026-09-21T00:00:00.000Z',NULL,NULL,'PLATFORM_CONTROL',NULL,role_id,permission_id FROM resolved
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  IF (SELECT count(*) FROM iam.permissions WHERE permission_code IN (
    'compliance.applicability.read','compliance.requirement_assessment.read','compliance.soa.read','controls.control.read',
    'controls.control_assessment.read','controls.assurance_test.read','evidence.evidence_request.read','evidence.evidence.read',
    'remediation.issue.read','remediation.action.read','evidence.evidence.create')) <> 11 THEN
    RAISE EXCEPTION 'PHASE5_PERMISSION_POSTCONDITION_EXPECTED_11';
  END IF;
END $$;
