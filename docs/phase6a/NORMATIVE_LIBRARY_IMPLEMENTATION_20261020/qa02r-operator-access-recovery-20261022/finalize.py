#!/usr/bin/env python3
"""Seal the concrete read-only diagnosis; no QA connection or operational action."""
import datetime
import hashlib
import json
from pathlib import Path
import sys
sys.dont_write_bytecode = True
B = Path(__file__).resolve().parent
R = B.parents[3]
def read(p): return json.loads(p.read_text())
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def save(name, data):
    with (B / name).open('x') as f: f.write(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
remote, config, db, entry = [read(B / n) for n in ['REMOTE_METADATA.json', 'REMOTE_CONFIG.json', 'IDENTITY_ROLES.json', 'ENTRY.json']]
assert remote['status'] == 'PASS_READ_ONLY_METADATA' and db['status'] == 'PASS_READ_ONLY'
assert remote['host'] == 'grc-bk' and remote['administrative_user'] == 'tecdex'
operators = [c for c in remote['containers'] if c['name'] != 'tcdx-grc-backend']
assert len(operators) == 4 and all(c['state']['running'] for c in operators)
assert all(c['runtime_probe']['connection_probe'] == 'CONNECTED_NO_BYTES' and c['runtime_probe']['bytes_sent'] == 0 for c in operators)
assert all(not f.get('library_operation') and not f.get('library_method') and not f.get('library_config') for c in remote['containers'] for f in c['runtime_probe']['files'])
assert all(not next(f for f in c['runtime_probe']['files'] if f['path'].endswith('/normative-library-publication.js'))['present'] for c in remote['containers'])
assert all(not any(k.startswith('TCDX_LIBRARY_') for k in c['safe_configuration']) for c in remote['containers'])
assert all(x['matches'] for c in config['containers'] for x in c['checks'])
assert remote['host_secret_custody']['exists'] and remote['host_secret_custody']['mode'] == '0o600'
for p, h in entry['files'].items(): assert sha(R / p) == h, p
sources = [
 'AGENTS.md', 'docs/rector/BASELINE_ID', 'docs/rector/BASELINE_STATUS', 'docs/rector/RECTOR_MANIFEST.sha256',
 'docs/rector/baseline/46_REGENTE_MAESTRO_DEL_DESARROLLO.md', 'docs/rector/baseline/22_RBAC_PERMISSION_SCOPE_MATRIX.md',
 'docs/rector/baseline/45_CONTRATO_DESARROLLO_CERRADO_Y_NO_INFERENCIA.md', 'docs/governance/CODEX_RECTOR_ENFORCEMENT.md',
 'docs/governance/MASTER_EXECUTION_STATUS.md', 'iam/config/step6a3-m2m-qa-profile.json',
 'docs/phase6a/STEP_6A3/IAM_M2M_QA_DECISION_RECEIPT_20261014.json', 'docs/phase6a/STEP_6A3/QA_RUNTIME_PUBLICATION_RELEASE_EVIDENCE_20261014.json',
 'docs/phase6a/STEP_6A3/STEP_6A3_QA_DEPLOY_HANDOFF_RESULT_20261015.md',
 'scripts/phase6a3/qa-iam-publication-runtime.py', 'scripts/phase6a3/qa-c04w-lifecycle-runtime.py', 'scripts/phase6a3/qa-initial-source-runtime.py',
 'scripts/phase6a3/store-iam-publisher-secret.py',
 'apps/backend/src/security/publication-operator-server.ts', 'apps/backend/src/security/commercial-catalog-operator.ts',
 'apps/backend/src/security/iam-publication-operator-cli.ts', 'apps/backend/src/security/iam-publication-runtime.ts',
 'apps/backend/src/security/iam-publication.ts', 'apps/backend/src/security/application-token.ts',
 'apps/backend/src/security/normative-library-publication.ts',
 'docs/phase6a/NORMATIVE_LIBRARY_IMPLEMENTATION_20261020/qa02-operational-activation-20261022/FILE_MANIFEST.json',
 'docs/phase6a/NORMATIVE_LIBRARY_IMPLEMENTATION_20261020/local-operational-preparation-20261022/QA_ENABLEMENT_RUNBOOK.md',
 'docs/phase6a/NORMATIVE_LIBRARY_IMPLEMENTATION_20261020/local-operational-preparation-20261022/HANDOFF.md',
 'docs/phase6a/NORMATIVE_LIBRARY_IMPLEMENTATION_20261020/local-operational-preparation-20261022/TRACEABILITY.md',
 'docs/phase6a/NORMATIVE_LIBRARY_IMPLEMENTATION_20261020/local-operational-preparation-20261022/IAM_REGISTRY_PREPARATION.json',
]
save('SOURCE_HASHES.json', {'files': [{'path': p, 'sha256': sha(R / p)} for p in sources], 'scope': 'Only sources identified by continuity and this diagnosis; no secret files'})
save('DIAGNOSIS.json', {
 'diagnostic_gate': 'PASS', 'transport_access_gate': 'PASS', 'Library_runtime_capability_gate': 'BLOCKED_NOT_DEPLOYED',
 'hypotheses': {
  'operator_not_started': 'REFUTED_FOUR_RUNNING', 'operator_in_other_context': 'CONFIRMED_QA_VM_CONTAINERS',
  'socket_nonexistent': 'REFUTED_FOUR_REMOTE_SOCKETS_CONNECTED', 'socket_other_path': 'CONFIRMED_DISTINCT_HOST_BINDS_AND_CONTAINER_PATH',
  'socket_permission_denial': 'REFUTED_FOR_TECDEX_UID1000', 'M2M_credential_absent': 'REFUTED_QA_CUSTODY_AND_READONLY_MOUNT_METADATA',
  'incomplete_Library_configuration': 'CONFIRMED_THREE_VARIABLES_ABSENT', 'Codex_account_incompatibility': 'NOT_EVIDENCED_OS_USER_TECDEX_WORKS',
  'network_or_environment': 'LOCAL_DEFAULT_USER_AUTH_FAILED_AND_CAPTURE_SANDBOX_EPERM; AUTHORIZED_TECDEX_SSH_AND_PG_READONLY_SUCCEEDED',
  'remote_code_lacks_Library': 'CONFIRMED_FIVE_RUNTIMES_NO_MODULE_NO_DISPATCH_NO_METHOD',
 },
 'health_or_status_operation': 'DOES_NOT_EXIST_IN_CANONICAL_PROTOCOL', 'probe': 'UNIX_CONNECT_ZERO_BYTES_NO_COMMAND',
 'credential_current_Keycloak_validity': 'NOT_TESTED_NO_SECRET_READ_OR_TOKEN_REQUEST',
 'SSH_administrative_session_reusable': True, 'human_GRC_session': 'NOT_INSPECTED_NO_COOKIES_OR_TOKENS_ACCESSED',
 'existing_active_platform_admins': db['platform_administrators'][0]['active_existing_platform_admins'],
 'ACME1': next(t for t in db['tenants'] if t['tenant_code'] == 'ACME-1'),
 'ACME1_in_approved_targets': False, 'approved_targets_state': 'PREPARATION_REAL_TARGETS_EMPTY_NO_OPERATIONAL_INPUT',
 'schema_scan_repeated': False, 'QA01_repeated': False,
 'VM_manual_action_needed': False, 'credential_action_needed': False,
 'PO_decision_needed': ['Authorize promotion of already-prepared canonical bytes to a private temporary QA executor, including configuration and cleanup, without application deployment', 'Specify exact tenantIds or global-only and effectiveFrom/effectiveTo for later QA02'],
 'activations': 0, 'DDL': 0, 'DML': 0, 'new_processes_containers_services': 0,
 'new_credentials_users_roles_grants': 0, 'remote_secret_file_contents_read': False,
 'secrets_exported': False, 'tokens_requested': 0,
})
count = len([p for p in B.rglob('*') if p.is_file() and '__pycache__' not in p.parts]) + 2
result = {
 'PROJECT': 'GRC_TECDEX', 'ACTIVE_BASELINE': 'TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16',
 'SCOPE': 'QA02R_CANONICAL_OPERATOR_ACCESS_RECOVERY', 'CURRENT_PHASE': 'POST_STEP6A4_PRE_STEP6A5', 'CANONICAL_DOMAIN': 'https://grc.tecdex.net/',
 'QA01_INTEGRITY': 'PRESERVED', 'QA02_ACTIVATIONS': 'NONE', 'CANONICAL_OPERATOR_IDENTIFIED': 'PASS',
 'OPERATOR_LOCATION': 'QA grc-bk/192.168.2.45; four existing private Docker operators; application /app/apps/backend/dist/security',
 'OPERATOR_SOCKET': 'PASS_FOUR_REACHABLE; /run/tcdx-operator/catalog.sock in each container; host bind paths in OPERATOR_ACCESS.md',
 'OPERATOR_STARTUP_PROCEDURE': 'IDENTIFIED_NODE_PUBLICATION_OPERATOR_SERVER; NOT_RUN_NO_DIAGNOSTIC_MODE',
 'OPERATOR_ACCESS_STATUS': 'SSH_AND_SOCKETS_ACCESS_CONFIRMED; QA02_LIBRARY_CAPABILITY_BLOCKED_REMOTE_BYTES_NOT_DEPLOYED',
 'M2M_IDENTITY_EXISTS': 'YES_ACTIVE_01a13c3b-dbdd-763f-bcbb-f16ff41d99ba', 'M2M_AUTHENTICATION_METHOD': 'OAUTH2_CLIENT_CREDENTIALS_RS256_FRESH_PROOF',
 'M2M_CREDENTIAL_AVAILABILITY': 'PRESENT_PROTECTED_QA_HOST_AND_READONLY_MOUNTS_METADATA_VERIFIED; NO_TOKEN_REQUEST',
 'ACME1_RELEVANCE': 'NOT_SELECTED_NOT_A_GENERAL_QA02_BLOCKER; WOULD_CONFLICT_IF_EXPLICITLY_INCLUDED',
 'ACME1_SEVEN_ROLES': 'CANONICAL_TEMPLATES_EXIST; TENANT_INSTANCES_ABSENT; ACME1_HAS_ZERO_ROLES_MEMBERSHIPS_ASSIGNMENTS',
 'USER_CREATION_REQUIRED': 'NO', 'ROLE_CREATION_REQUIRED': 'NO', 'PO_CREDENTIAL_ACTION_REQUIRED': 'NO', 'PO_VM_ACTION_REQUIRED': 'NO',
 'PO_EXACT_ACTION': 'Authorize private temporary QA operator promotion/configuration/cleanup for the local prepared Library bytes; specify exact tenantIds or global-only and effectiveFrom/effectiveTo for later QA02. No credential or manual VM action.',
 'QA_DDL': 'NONE', 'QA_DML': 'NONE', 'QA_IAM_ACTIVATIONS': 'NONE', 'QA_B06_ACTIVATIONS': 'NONE', 'QA_DEFINITIONS_ACTIVATIONS': 'NONE', 'QA_H04_ACTIVATIONS': 'NONE',
 'NEW_USERS': 'NONE', 'NEW_ROLES': 'NONE', 'NEW_M2M_IDENTITIES': 'NONE', 'NEW_GRANTS': 'NONE', 'CREDENTIAL_ROTATION': 'NONE',
 'DEPLOYMENTS': 'NONE', 'INFRASTRUCTURE_CHANGES': 'NONE', 'NORMATIVE_IMPORTS': 'NONE', 'ISO_COMMERCIAL_ACTIVATIONS': 'NONE', 'PRODUCTION_CHANGES': 'NONE',
 'RECTOR_GATE': 'PASS', 'QA02R_GATE': 'BLOCKED', 'DIAGNOSTIC_GATE': 'PASS', 'OPERATOR_TRANSPORT_ACCESS_GATE': 'PASS',
 'NEXT_BLOCKERS': 'Remote code/configuration lacks iam.library.publish; deployments explicitly excluded. Exact tenant input/interval not selected by existing plan.',
 'NEXT_SAFE_ACTION': 'PO scope decision described in PO_ACTION_REQUIRED.md; preserve evidence and stop before promotion or QA02 activation.',
 'BRANCH': entry['branch'], 'HEAD': entry['head'], 'INDEX': 'EMPTY_UNCHANGED', 'FILES_CREATED': count, 'FILES_MODIFIED': 0,
 'STEP6A5': 'NOT_STARTED', 'STEP6A6': 'NOT_STARTED', 'QA03': 'NOT_STARTED',
 'LAYERS_CHANGED': ['QA02R evidence dossier only'], 'LAYERS_PRESERVED': ['database', 'executable contracts', 'backend', 'frontend', 'infrastructure', 'deployment contracts', 'all prior dossiers and received files'],
 'UNRESOLVED_RECTOR_CONFLICTS': 'NONE; pending deployment requires scope not granted by this instruction',
 'finished_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
}
save('RESULT.json', result)
files = [{'path': str(p.relative_to(R)), 'sha256': sha(p), 'action': 'created'} for p in sorted(B.rglob('*')) if p.is_file() and '__pycache__' not in p.parts]
save('FILE_MANIFEST.json', {'scope': result['SCOPE'], 'files_created': count, 'files_modified': 0, 'files': files, 'self_exclusion': 'FILE_MANIFEST.json is not self-hashed; exact inventory and all other hashes verified'})
print(json.dumps({'files_created': count, 'files_modified': 0, 'diagnostic_gate': 'PASS', 'QA02R_GATE': 'BLOCKED'}))
