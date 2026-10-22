#!/usr/bin/env python3
"""Read-only offline QA02R evidence verifier. No SSH, DB, token or operational call."""
import hashlib
import json
from pathlib import Path
import subprocess
B = Path(__file__).resolve().parent
R = B.parents[3]
def read(p): return json.loads(p.read_text())
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
    result, manifest, entry = [read(B / n) for n in ['RESULT.json', 'FILE_MANIFEST.json', 'ENTRY.json']]
    assert result['PROJECT'] == 'GRC_TECDEX' and result['SCOPE'] == 'QA02R_CANONICAL_OPERATOR_ACCESS_RECOVERY'
    assert result['ACTIVE_BASELINE'] == 'TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16'
    assert result['CANONICAL_DOMAIN'] == 'https://grc.tecdex.net/'
    actual = {str(p.relative_to(R)) for p in B.rglob('*') if p.is_file() and '__pycache__' not in p.parts}
    declared = {r['path'] for r in manifest['files']} | {str((B / 'FILE_MANIFEST.json').relative_to(R))}
    assert actual == declared and len(actual) == result['FILES_CREATED'] == manifest['files_created']
    assert len({r['path'] for r in manifest['files']}) == len(manifest['files'])
    for row in manifest['files']:
        p = R / row['path']
        assert p.resolve().is_relative_to(B) and sha(p) == row['sha256'], row['path']
    for p, h in entry['files'].items(): assert sha(R / p) == h, p
    for row in read(B / 'SOURCE_HASHES.json')['files']: assert sha(R / row['path']) == row['sha256'], row['path']
    git = lambda *args: subprocess.check_output(['git', *args], cwd=R, text=True).strip()
    assert git('rev-parse', 'HEAD') == entry['head'] == result['HEAD']
    assert git('branch', '--show-current') == entry['branch'] == result['BRANCH']
    assert git('diff', '--cached', '--raw') == entry['index'] == ''
    assert result['FILES_MODIFIED'] == manifest['files_modified'] == 0
    remote, config, db, diag = [read(B / n) for n in ['REMOTE_METADATA.json', 'REMOTE_CONFIG.json', 'IDENTITY_ROLES.json', 'DIAGNOSIS.json']]
    assert remote['status'] == 'PASS_READ_ONLY_METADATA' and remote['host'] == 'grc-bk' and remote['administrative_user'] == 'tecdex' and remote['uid'] == 1000
    assert not remote['secrets_read'] and remote['tokens_requested'] == remote['activation_requests'] == remote['processes_started_or_stopped'] == 0
    secret = remote['host_secret_custody']
    assert secret['path'] == '/home/tecdex/.secrets/tcdx-grc-qa/iam-publisher-client-secret' and secret['exists'] and secret['uid'] == 1000 and secret['mode'] == '0o600' and not secret['symlink']
    assert len(remote['containers']) == 5
    operators = [c for c in remote['containers'] if c['name'] != 'tcdx-grc-backend']
    assert len(operators) == 4
    for c in remote['containers']:
        assert c['state']['running']
        probe = c['runtime_probe']
        assert probe['uid'] == 1000
        assert all(not f.get('library_operation') and not f.get('library_method') and not f.get('library_config') for f in probe['files'])
        assert not next(f for f in probe['files'] if f['path'].endswith('/normative-library-publication.js'))['present']
        assert not any(k.startswith('TCDX_LIBRARY_') for k in c['safe_configuration'])
        ref = next(r for r in probe['refs'] if r['path'] == '/run/secrets/iam_publisher_client_secret')
        assert ref['present'] and ref['file'] and ref['mode'] == '600' and ref['owner_matches']
    for c in operators:
        probe = c['runtime_probe']
        assert probe['connection_probe'] == 'CONNECTED_NO_BYTES' and probe['bytes_sent'] == probe['activation_requests'] == 0
        sock = next(r for r in probe['refs'] if r['path'] == '/run/tcdx-operator/catalog.sock')
        assert sock['socket'] and sock['mode'] == '600' and sock['owner_matches']
        mount = next(m for m in c['reviewed_mounts'] if m['destination'] == '/run/tcdx-operator')
        assert mount['host_metadata']['mode'] == '0o700' and mount['socket_metadata']['mode'] == '0o600'
        assert not next(m for m in c['reviewed_mounts'] if m['destination'] == '/run/secrets/iam_publisher_client_secret')['read_write']
    assert config['status'] == 'PASS_NONSENSITIVE_CONFIG' and config['credential_contents_read'] is False and config['tokens_requested'] == 0
    assert len(config['containers']) == 4 and sum(len(c['checks']) for c in config['containers']) == 16
    expected_profile = sha(R / 'iam/config/step6a3-m2m-qa-profile.json')
    for c in config['containers']:
        assert all(x['matches'] and x['sha256'] == x['expected_sha256'] for x in c['checks'])
        assert next(x for x in c['checks'] if x['variable'] == 'TCDX_IAM_M2M_PROFILE')['sha256'] == expected_profile
        assert c['profile']['principal_code'] == 'grc-qa-iam-publisher' and c['profile']['max_lifetime_seconds'] == 300
    assert db['status'] == 'PASS_READ_ONLY' and read(B / 'IDENTITY_ROLES_COMMAND.json')['exit_code'] == 0
    i = db['identity']
    assert i['host'] == '192.168.2.40' and i['db'] == 'tcdx-grc' and i['version'] == '160015' and i['tls_authorized']
    assert i['sslmode'] == 'verify-full' and i['readonly'] == i['default_readonly'] == 'on'
    assert len(db['publisher']) == 1 and db['publisher'][0]['service_principal_id'] == '01a13c3b-dbdd-763f-bcbb-f16ff41d99ba' and db['publisher'][0]['lifecycle_state'] == 'active'
    assert len(db['publisher_provision']) == 1 and db['publisher_provision'][0]['profile_sha256'] == expected_profile
    assert db['publisher_provision'][0]['outcome'] == 'success'
    acme = next(t for t in db['tenants'] if t['tenant_code'] == 'ACME-1')
    assert acme['tenant_id'] == '01a1137a-1351-76b8-ac8a-0bb109ca8e22' and acme['lifecycle_state'] == 'active'
    assert acme['role_rows'] == acme['memberships'] == acme['active_memberships'] == acme['membership_role_rows'] == 0
    codes = {'TENANT_ADMIN', 'GRC_MANAGER', 'COMPLIANCE_MANAGER', 'CONTROL_OWNER', 'EVIDENCE_OWNER', 'ACTION_OWNER', 'VIEWER'}
    for tenant in [None, '01a0cfc7-0c97-75a3-890f-d6ca9db8bbe9', '01a11820-ae9f-7485-93e5-942eaec71121']:
        rows = [r for r in db['seven_roles'] if r['tenant_id'] == tenant]
        assert len(rows) == 7 and {r['role_code'] for r in rows} == codes
        assert all(r['is_baseline'] and r['lifecycle_state'] == 'published' and r['ownership_class'] == ('PLATFORM_CONTROL' if tenant is None else 'TENANT_OWNED') for r in rows)
    assert db['platform_administrators'][0]['active_existing_platform_admins'] == diag['existing_active_platform_admins'] == 2
    preparation = read(B.parent / 'local-operational-preparation-20261022/IAM_REGISTRY_PREPARATION.json')
    assert preparation['real_targets'] == [] and diag['ACME1_in_approved_targets'] is False
    assert diag['SSH_administrative_session_reusable'] and diag['schema_scan_repeated'] is False and diag['QA01_repeated'] is False
    assert diag['activations'] == diag['DDL'] == diag['DML'] == diag['new_processes_containers_services'] == 0
    for key in ['USER_CREATION_REQUIRED', 'ROLE_CREATION_REQUIRED', 'PO_CREDENTIAL_ACTION_REQUIRED', 'PO_VM_ACTION_REQUIRED']: assert result[key] == 'NO'
    for key in ['QA02_ACTIVATIONS', 'QA_DDL', 'QA_DML', 'QA_IAM_ACTIVATIONS', 'QA_B06_ACTIVATIONS', 'QA_DEFINITIONS_ACTIVATIONS', 'QA_H04_ACTIVATIONS', 'NEW_USERS', 'NEW_ROLES', 'NEW_M2M_IDENTITIES', 'NEW_GRANTS', 'CREDENTIAL_ROTATION', 'DEPLOYMENTS', 'INFRASTRUCTURE_CHANGES', 'NORMATIVE_IMPORTS', 'ISO_COMMERCIAL_ACTIVATIONS', 'PRODUCTION_CHANGES']: assert result[key] == 'NONE'
    assert result['RECTOR_GATE'] == result['DIAGNOSTIC_GATE'] == result['OPERATOR_TRANSPORT_ACCESS_GATE'] == 'PASS'
    assert result['QA02R_GATE'] == 'BLOCKED'
    assert all(c['exit_code'] == 0 for c in read(B / 'CHECKS.json')['checks'])
    assert 'Operation not permitted' in read(B / 'REMOTE_ATTEMPT.json')['stderr']
    # Revalidate sealed predecessor offline, without rerunning QA01 or any SQL.
    check = subprocess.run(['python3', str(B.parent / 'qa02-operational-activation-20261022/verify.py')], cwd=R, capture_output=True, text=True, timeout=30)
    assert check.returncode == 0
    return {'dossier_integrity': 'PASS', 'diagnosis': 'PASS', 'operator_transport_access': 'PASS_FOUR_REMOTE_SOCKETS', 'QA02R_GATE': 'BLOCKED_REMOTE_LIBRARY_CODE_NOT_DEPLOYED', 'credential_action': 'NOT_REQUIRED_EXISTING_QA_CUSTODY', 'QA01': 'PRESERVED', 'QA02_activations': 'NONE', 'received_files_preserved': len(entry['files']), 'files_created': len(actual), 'files_modified': 0, 'network_DB_token_calls_this_verifier': 'NONE'}
if __name__ == '__main__': print(json.dumps(main(), indent=2))
