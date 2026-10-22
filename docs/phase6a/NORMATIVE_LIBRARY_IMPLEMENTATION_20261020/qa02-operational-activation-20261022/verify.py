#!/usr/bin/env python3
"""Offline QA02 BLOCKED dossier verifier. Never connects to QA or invokes operational scripts."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

B = Path(__file__).resolve().parent
R = B.parents[3]
Q = B.parent / 'qa01-migration36-adoption-20261022'
def read(p): return json.loads(p.read_text())
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def cats(d): return {x['category']: x.get('rows', x) for x in d['results'] if x['category'] != 'data_fingerprint'}
def fps(d): return {x['relation']: (x['rows'], x['sha256']) for x in d['results'] if x['category'] == 'data_fingerprint'}

def verify(check_backup=False):
    manifest, result, entry = read(B / 'FILE_MANIFEST.json'), read(B / 'RESULT.json'), read(B / 'ENTRY.json')
    assert result['SCOPE'] == 'QA02_B01_B09_H04_OPERATIONAL_ACTIVATION'
    assert result['QA02_GATE'] == result['RECTOR_GATE'] == 'BLOCKED'
    assert result['ACTIVE_BASELINE'] == 'TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16'
    actual = {str(p.relative_to(R)) for p in B.rglob('*') if p.is_file() and '__pycache__' not in p.parts}
    declared = {x['path'] for x in manifest['files']} | {str((B / 'FILE_MANIFEST.json').relative_to(R))}
    assert actual == declared and len(actual) == manifest['files_created'] == result['FILES_CREATED']
    assert len(manifest['files']) == len({x['path'] for x in manifest['files']})
    for row in manifest['files']:
        path = R / row['path']
        assert path.resolve().is_relative_to(B) and sha(path) == row['sha256'], row['path']
    for p, digest in entry['files'].items(): assert sha(R / p) == digest, 'Received drift: ' + p
    git = lambda *args: subprocess.check_output(['git', *args], cwd=R, text=True).strip()
    assert git('rev-parse', 'HEAD') == entry['head'] == result['HEAD']
    assert git('branch', '--show-current') == entry['branch'] == result['BRANCH']
    assert git('diff', '--cached', '--raw') == entry['index'] == ''
    assert result['FILES_MODIFIED'] == manifest['files_modified'] == 0
    assert read(B / 'CONTINUITY_RECONCILIATION.json')['status'] == 'PASS'
    for name in ['QA01_VERIFY', 'RECTOR_VERIFY', 'STATUS_VERIFY', 'FOUNDATIONS_GENERATOR_CHECK', 'LIBRARY_GENERATOR_CHECK', 'RIGHTS_GENERATOR_CHECK', 'LOCAL_READINESS_RETRY', 'CANONICAL_PRE_RETRY', 'CANONICAL_SCHEMA_VERIFY', 'CANONICAL_POST']:
        assert read(B / (name + '.json'))['exit_code'] == 0, name
    for name in ['HISTORICAL_DEFINITIONS_VERIFY', 'HISTORICAL_PREPARATION_VERIFY', 'HISTORICAL_B04_VERIFY']:
        assert read(B / (name + '.json'))['exit_code'] == 1
    assert read(B / 'PRE.json')['error']['code'] == 'EPERM'
    assert read(B / 'CANONICAL_PRE.json')['exit_code'] != 0
    old, pre, post = read(Q / 'POST.json'), read(B / 'PRE_RETRY.json'), read(B / 'POST.json')
    for d in [pre, post]:
        i = d['identity']
        assert d['status'] == 'PASS_READ_ONLY' and i['host'] == '192.168.2.40' and i['db'] == 'tcdx-grc' and i['version'] == '160015'
        assert i['tls_authorized'] and i['sslmode'] == 'verify-full' and i['servername'] == 'db-tecdex'
        assert i['system_identifier'] == '7640968386355389904' and i['readonly'] == i['default_readonly'] == 'on'
        assert i['peer_fingerprint'] == 'FB:68:09:DA:13:9E:E3:E5:2C:2F:1F:EA:D7:5B:11:92:7B:04:B8:96:7A:2B:5D:B8:46:9C:B6:70:E3:BB:A3:E6'
        c = cats(d)
        assert c['health']['ssl'] and not c['health']['recovery'] and c['health']['invalid_constraints'] == c['health']['invalid_indexes'] == 0
        for key in ['relations', 'columns', 'constraints', 'indexes', 'functions', 'triggers', 'authority_catalog', 'typed_default_exact', 'ledger']:
            assert c[key] == cats(old)[key], key
        assert fps(d) == fps(old) and len(fps(d)) == 244 and sum(v[0] for v in fps(d).values()) == 5097
        activity = {x['category']: x['rows'] for x in d['activity']}
        assert activity['locks'] == [] and activity['prepared_transactions'][0]['prepared_transactions'] == 0
        assert all(r['open_transactions'] == r['lock_waiters'] == r['transactions_over_30s'] == 0 for r in activity['session_activity'])
    migrations = read(R / 'database/migrations/manifest.json')['migrations']
    ledger = cats(post)['ledger']
    assert len(ledger) == len(migrations) == 36
    for r, s in zip(ledger, migrations):
        assert r['migration_id'] == s['id'] and r['filename'] == s['filename'] and r['content_sha256'] == s['sha256'] and r['outcome'] == 'applied'
        assert sha(R / 'database/migrations' / s['filename']) == s['sha256']
    assert sum(r['migration_id'] == '20261022141304' for r in ledger) == 1
    assert pre['operational'] == post['operational']
    o = pre['operational']
    assert o['bindings'] == o['definitions'] == o['rights_counts'] == o['source_counts'] == o['publication_audits'] == []
    local = json.loads(read(B / 'LOCAL_READINESS_RETRY.json')['stdout'])
    assert local['status'] == 'PASS_OFFLINE_CONTRACTS' and local['source_and_36_migration_hashes_verified']
    assert all(not p['present'] for p in local['custody']) and not local['local_authenticated_operator_available']
    assert local['configured_environment_names'] == []
    iam, b06, defs, h04 = [read(B / name) for name in ['IAM_REGISTRY_RECEIPT.json', 'B06_BINDINGS_RECEIPT.json', 'DEFINITIONS_RECEIPT.json', 'H04_RECEIPT.json']]
    assert len(iam['pending_permissions']) == 8
    assert set(iam['pending_permissions']) == {x['code'] for x in local['approved_permissions']}
    assert not set(iam['pending_permissions']).intersection(x['permission_code'] for x in o['permissions'])
    assert iam['publisher'] == o['publisher'] and len(o['publisher']) == 1 and o['publisher'][0]['lifecycle_state'] == 'active'
    assert len(b06['bindings']) == b06['expected_count'] == 13 and b06['actual_before'] == b06['actual_after'] == b06['duplicates'] == 0
    assert [r['contract'] for r in b06['bindings']] == local['bindings']
    assert all(r['physical_id'] is None and r['runtime_version'] is None for r in b06['bindings'])
    assert len(defs['definitions']) == defs['expected_count'] == 4 and defs['actual_before'] == defs['actual_after'] == 0
    assert [r['descriptor'] for r in defs['definitions']] == local['definitions']
    assert all(r['physical_id'] is None and r['descriptor']['default_text_value'] is None and r['descriptor']['version_number'] == 1 and r['descriptor']['value_type'] == 'text' for r in defs['definitions'])
    assert h04['commercial_ISO_sources_activated'] == h04['commercial_ISO_sources_authorized'] == []
    assert h04['rights_before'] == h04['rights_after'] == h04['sources_before'] == h04['sources_after'] == []
    for r in [iam, b06, defs, h04]: assert r['status'].startswith('BLOCKED') and r['writes'] == 0 and r['new_audit_ids'] == []
    gates = read(B / 'PHYSICAL_PREFLIGHT.json')
    assert gates['status'] == 'PASS_READ_ONLY_NO_DRIFT' and all(gates['checks'].values()) and len(gates['checks']) == 21
    assert {r['role_code'] for r in gates['missing_roles']} == {'TENANT_ADMIN', 'GRC_MANAGER', 'COMPLIANCE_MANAGER', 'CONTROL_OWNER', 'EVIDENCE_OWNER', 'ACTION_OWNER', 'VIEWER'}
    assert {r['tenant_id'] for r in gates['missing_roles']} == {'01a1137a-1351-76b8-ac8a-0bb109ca8e22'}
    schema = json.loads(read(B / 'CANONICAL_SCHEMA_VERIFY.json')['stdout'])
    assert schema['schemaMismatches'] == schema['forbiddenDeleteCascades'] == 0 and schema['actualPhysicalTables'] == 244 and schema['expectedColumns'] == 3630
    assert read(B / 'POST_GATES.json')['canonical_schema'] == schema
    assert read(B / 'RECOVERY_ASSESSMENT.json')['new_backup'] == 'NONE'
    for k in ['ISO_COMMERCIAL_SOURCES_ACTIVATED', 'NORMATIVE_IMPORTS', 'BACKEND_DEPLOYMENTS', 'FRONTEND_DEPLOYMENTS', 'PRODUCTION_CHANGES', 'QA_WRITES', 'QA_SCHEMA_CHANGES', 'INFRASTRUCTURE_CHANGES']:
        assert result[k] == 'NONE', k
    assert result['STEP6A5'] == result['STEP6A6'] == 'NOT_STARTED' and result['QA03'] == 'NOT_STARTED'
    # The predecessor verifier is offline, reads only evidence and optionally
    # hashes the private backup. It never invokes its operational scripts.
    args = ['python3', str(Q / 'verify.py')] + (['--check-backup'] if check_backup else [])
    q = subprocess.run(args, cwd=R, capture_output=True, text=True, timeout=30)
    assert q.returncode == 0, 'QA01 offline verifier failed'
    return {'dossier_integrity': 'PASS', 'QA02_GATE': 'BLOCKED', 'RECTOR_GATE': 'BLOCKED', 'QA01_INTEGRITY': 'PASS', 'QA_schema': '244_TABLES_3630_COLUMNS_ZERO_MISMATCHES', 'QA_business_fingerprints': '244_IDENTICAL_5097_ROWS', 'activation_writes': 0, 'received_files_preserved': len(entry['files']), 'files_created': len(actual), 'files_modified': 0, 'QA_connections_this_verifier': 'NONE', 'private_backup_check': 'PASS' if check_backup else 'NOT_REQUESTED'}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check-backup', action='store_true')
    args = parser.parse_args()
    print(json.dumps(verify(args.check_backup), indent=2))
