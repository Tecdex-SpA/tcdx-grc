#!/usr/bin/env python3
"""Offline evidence reconciliation. Never connects to QA or executes an activation."""
import datetime
import hashlib
import json
from pathlib import Path
import sys

sys.dont_write_bytecode = True
B = Path(__file__).resolve().parent
R = B.parents[3]
P = B.parent
def read(p): return json.loads(p.read_text())
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def save(name, data):
    with (B / name).open('x') as f: f.write(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
def cats(d): return {x['category']: x.get('rows', x) for x in d['results'] if x['category'] != 'data_fingerprint'}
def fps(d): return {x['relation']: (x['rows'], x['sha256']) for x in d['results'] if x['category'] == 'data_fingerprint'}

def continuity():
    # Reconstruct historical hashes in memory from sealed successor preimages.
    # Historical verifiers and files remain untouched. Closed-workspace counts
    # are intentionally not represented as current-workspace gates.
    overlay = {}
    h = lambda path: overlay.get(path, sha(R / path))
    q = P / 'qa01-migration36-adoption-20261022'
    assert read(B / 'QA01_VERIFY.json')['exit_code'] == 0
    status = 'docs/governance/MASTER_EXECUTION_STATUS.md'
    overlay[status] = sha(q / 'MASTER_STATUS_PREIMAGE.md')
    layers = []
    for name in ['local-definitions-01-resolution-20261022', 'local-operational-preparation-20261022']:
        d = P / name
        m = read(d / 'FILE_MANIFEST.json')
        for row in m['files']: assert h(row['path']) == row['sha256'], row['path']
        for line in (d / 'SHA256SUMS.txt').read_text().splitlines():
            expected, path = line.split('  ', 1)
            assert h(path) == expected, path
        layers.append({'dossier': name, 'manifest_entries': len(m['files']), 'all_manifest_and_seal_entries': 'PASS_AT_SEALED_SUCCESSOR_PREIMAGE'})
        for row in m['files']:
            if row.get('action') != 'modified': continue
            pre = d / 'preimages' / row['path']
            data = pre.read_bytes() if pre.is_file() else read(pre.with_suffix(pre.suffix + '.json'))['content'].encode()
            digest = hashlib.sha256(data).hexdigest()
            assert digest == row['before_sha256'], row['path']
            overlay[row['path']] = digest
    d = P / 'code-b04-01-full-resolution-20261022'
    m = read(d / 'FILE_MANIFEST.json')
    seal = read(d / 'FINAL_INTEGRITY.json')
    assert sha(d / 'FILE_MANIFEST.json') == seal['manifest_sha256']
    for row in m['modified']: assert h(row['path']) == row['sha256'], row['path']
    for row in m['created']: assert h(row['path']) == row['sha256'], row['path']
    layers.append({'dossier': d.name, 'manifest_entries': len(m['modified']) + len(m['created']), 'all_manifest_and_seal_entries': 'PASS_AT_SEALED_SUCCESSOR_PREIMAGE'})
    save('CONTINUITY_RECONCILIATION.json', {'status': 'PASS', 'method': 'Exact SHA256 with sealed successor preimages; no historical verifier edits, no recreation of product files', 'layers': layers, 'historical_verifier_failures': 'RETAINED_EXPECTED_PREDECESSOR_SNAPSHOT_MISMATCHES', 'QA01_current_verifier': 'PASS_WITH_PRIVATE_BACKUP_CHECK'})
    print('CONTINUITY_RECONCILIATION=PASS')

def physical():
    pre = read(B / 'PRE_RETRY.json')
    old = read(P / 'qa01-migration36-adoption-20261022/POST.json')
    assert pre['status'] == 'PASS_READ_ONLY'
    a, z = cats(old), cats(pre)
    checks = {}
    def check(name, value):
        checks[name] = bool(value)
        assert value, name
    for k in ['relations', 'columns', 'constraints', 'indexes', 'functions', 'triggers', 'authority_catalog', 'typed_default_exact', 'ledger']:
        check('qa01_' + k + '_unchanged', a[k] == z[k])
    check('244_fingerprints_5097_rows_unchanged', fps(old) == fps(pre) and len(fps(pre)) == 244 and sum(v[0] for v in fps(pre).values()) == 5097)
    manifest = read(R / 'database/migrations/manifest.json')['migrations']
    check('36_migrations_exact', len(z['ledger']) == len(manifest) == 36 and all(r['migration_id'] == s['id'] and r['filename'] == s['filename'] and r['content_sha256'] == s['sha256'] and r['outcome'] == 'applied' and r['transactional'] for r, s in zip(z['ledger'], manifest)))
    check('migration36_once', sum(r['migration_id'] == manifest[-1]['id'] for r in z['ledger']) == 1)
    i = pre['identity']
    check('QA_TLS_verify_full_16_15', i['host'] == '192.168.2.40' and i['db'] == 'tcdx-grc' and i['version'] == '160015' and i['tls_authorized'] and i['sslmode'] == 'verify-full' and i['readonly'] == i['default_readonly'] == 'on')
    check('health', z['health']['ssl'] and not z['health']['recovery'] and z['health']['invalid_constraints'] == z['health']['invalid_indexes'] == 0)
    activity = {x['category']: x['rows'] for x in pre['activity']}
    check('no_conflicting_activity', activity['locks'] == [] and activity['prepared_transactions'][0]['prepared_transactions'] == 0 and all(r['open_transactions'] == r['lock_waiters'] == r['transactions_over_30s'] == 0 for r in activity['session_activity']))
    o = pre['operational']
    check('B06_target_bindings_absent', len(o['bindings']) == 0)
    check('four_Definitions_absent', len(o['definitions']) == 0)
    check('H04_sources_and_rights_absent', o['source_counts'] == [] and o['rights_counts'] == [])
    check('no_prior_slice_audits', o['publication_audits'] == [])
    check('existing_principal_active', len(o['publisher']) == 1 and o['publisher'][0]['lifecycle_state'] == 'active')
    ready = read(B / 'LOCAL_READINESS_RETRY.json')
    assert ready['exit_code'] == 0
    local = json.loads(ready['stdout'])
    expected = {x['code'] for x in local['approved_permissions']}
    check('eight_catalog_permissions_pending', len(expected) == 8 and not expected.intersection(x['permission_code'] for x in o['permissions']))
    missing_roles = []
    targets = [None] + [t['tenant_id'] for t in o['tenants'] if t['lifecycle_state'] == 'active']
    for tenant in targets:
        for grant in local['approved_grants']:
            if tenant is not None and grant['scope'] != 'tenant': continue
            roles = [r for r in o['roles'] if r['tenant_id'] == tenant and r['role_code'] == grant['role'] and r['is_baseline'] and r['lifecycle_state'] == 'published' and r['ownership_class'] == ('PLATFORM_CONTROL' if tenant is None else 'TENANT_OWNED')]
            if len(roles) != 1: missing_roles.append({'tenant_id': tenant, 'role_code': grant['role'], 'count': len(roles)})
    missing_roles = list({(r['tenant_id'], r['role_code']): r for r in missing_roles}.values())
    save('PHYSICAL_PREFLIGHT.json', {'status': 'PASS_READ_ONLY_NO_DRIFT', 'checks': checks, 'observed_active_tenants': o['tenants'], 'tenants_are_not_an_approved_input': True, 'operational_interval': 'NOT_SELECTED_NO_AUTHENTICATED_EXECUTOR', 'missing_roles': missing_roles, 'missing_role_consequence': 'ACME-1 cannot be included in tenantIds with the current canonical publisher; no missing roles created and no tenant list inferred', 'activation_gate': 'BLOCKED_MISSING_LOCAL_AUTHENTICATED_EXECUTOR', 'QA_writes': 'NONE'})
    print(json.dumps({'physical_preflight': 'PASS', 'checks': len(checks), 'activation': 'BLOCKED_MISSING_LOCAL_AUTHENTICATED_EXECUTOR'}))

def final():
    pre, post = read(B / 'PRE_RETRY.json'), read(B / 'POST.json')
    assert post['status'] == 'PASS_READ_ONLY'
    a, z = cats(pre), cats(post)
    for k in ['relations', 'columns', 'constraints', 'indexes', 'functions', 'triggers', 'authority_catalog', 'typed_default_exact', 'ledger']:
        assert a[k] == z[k], k
    assert fps(pre) == fps(post) and pre['operational'] == post['operational']
    v = read(B / 'CANONICAL_SCHEMA_VERIFY.json')
    assert v['exit_code'] == 0
    schema = json.loads(v['stdout'])
    assert schema['schemaMismatches'] == 0 and schema['actualPhysicalTables'] == 244 and schema['expectedColumns'] == 3630
    assert schema['forbiddenDeleteCascades'] == 0
    save('POST_GATES.json', {'status': 'PASS_NO_MUTATIONS', 'QA01_catalog_and_ledger': 'IDENTICAL', 'domain_fingerprints': '244_IDENTICAL_5097_ROWS', 'operational_pre_post': 'IDENTICAL', 'canonical_schema': schema, 'schema_changes': 'NONE', 'QA_DML': 'NONE', 'test_residue': 'NONE', 'new_audits': 0, 'activation_gate': 'BLOCKED'})
    local = json.loads(read(B / 'LOCAL_READINESS_RETRY.json')['stdout'])
    o = pre['operational']
    reason = 'Canonical publisher requires fresh M2M authentication; credential and private operator socket are absent in this local session. Only PostgreSQL QA connection is authorized; no backend deployment or remote secret transfer performed.'
    common = {'status': 'BLOCKED_NOT_EXECUTED', 'reason': reason, 'writes': 0, 'new_audit_ids': [], 'state_before_after': 'IDENTICAL'}
    save('IAM_REGISTRY_RECEIPT.json', {**common, 'canonical_mechanism': 'IamPublicationService.publishNormativeLibrary / iam.library.publish', 'publisher': o['publisher'], 'pending_permissions': [p['code'] for p in local['approved_permissions']], 'approved_base_pairs': local['approved_grants'], 'limited_grant': local['limited_grant'], 'observed_existing_permissions': o['permissions'], 'observed_existing_grants': o['role_permissions'], 'local_custody': local['custody'], 'scope_or_permission_widening': 'NONE'})
    save('B06_BINDINGS_RECEIPT.json', {**common, 'expected_count': 13, 'actual_before': 0, 'actual_after': 0, 'bindings': [{'contract': b, 'physical_id': None, 'runtime_version': None, 'state_before': 'ABSENT', 'state_after': 'ABSENT'} for b in local['bindings']], 'duplicates': 0, 'negative_functional_tests': 'NOT_RUN_ACTIVATION_BLOCKED'})
    save('DEFINITIONS_RECEIPT.json', {**common, 'expected_count': 4, 'actual_before': 0, 'actual_after': 0, 'definitions': [{'descriptor': d, 'physical_id': None, 'state_before': 'ABSENT', 'state_after': 'ABSENT'} for d in local['definitions']], 'migration36': 'APPLIED_ONCE_UNCHANGED', 'defaults': 'APPROVED_SQL_NULL_NO_SUBSTITUTION', 'scopes': 'control_version; PLATFORM_CONTROL; tenant_id NULL', 'rules': 'contract_schema ordinal 1; pending publication', 'B04_compatibility': 'LOCAL_RESOLUTION_PRESERVED; QA_FUNCTIONAL_NOT_RUN'})
    save('H04_RECEIPT.json', {'status': 'BLOCKED_NOT_ACTIVATED', 'reason': 'IAM dependency blocked; no canonical authenticated human context or private evidence custody available to this session. No source-specific authorization or rights fact is fabricated.', 'policy_authority': 'Product Owner TecDex; QA02 instruction', 'commercial_ISO_sources_authorized': [], 'commercial_ISO_sources_activated': [], 'sources_before': o['source_counts'], 'sources_after': post['operational']['source_counts'], 'rights_before': o['rights_counts'], 'rights_after': post['operational']['rights_counts'], 'physical_mechanism': 'PRESENT_FROM_QA01; canonical schema zero mismatches', 'use_acts': ['consultation', 'extraction', 'storage', 'presentation', 'export', 'import', 'publication'], 'synthetic_tests_QA': 'NOT_RUN_DEPENDENCY_BLOCKED', 'rights_legal_purchase_gate': 'NONE', 'external_legal_validation_gate': 'NONE', 'new_right_ids': [], 'new_audit_ids': [], 'writes': 0})
    backup = read(P / 'qa01-migration36-adoption-20261022/BACKUP_RECEIPT.json')
    save('RECOVERY_ASSESSMENT.json', {'status': 'EXISTING_BACKUP_VERIFIED_NO_NEW_BACKUP_NEEDED_FOR_ZERO_WRITES', 'reference': backup['reference'], 'sha256': backup['dump_sha256'], 'private_file_check': 'PASS_QA01_VERIFY_CHECK_BACKUP', 'QA01_backup_snapshot_before_migration36': True, 'restore_test': 'REUSED_QA01_ACTUAL_PG16_245_TABLES', 'new_backup': 'NONE', 'activation_recovery_approval': 'NOT_EVALUATED_NO_WRITES; revalidate immediate prewrite point for resumption', 'PITR': 'NOT_CLAIMED'})
    print('POST_GATES=PASS_NO_MUTATIONS; QA02_GATE=BLOCKED')

def seal():
    # Produces evidence only, after reports/receipts are concrete and reviewable.
    from importlib.util import spec_from_file_location, module_from_spec
    spec = spec_from_file_location('qa02_session', B / 'session.py')
    session = module_from_spec(spec)
    spec.loader.exec_module(session)
    session.check_preservation()
    assert read(B / 'POST_GATES.json')['status'] == 'PASS_NO_MUTATIONS'
    e = read(B / 'ENTRY.json')
    paths = [p for p in B.rglob('*') if p.is_file() and '__pycache__' not in p.parts]
    count = len(paths) + 2  # RESULT and FILE_MANIFEST are written below.
    result = {
        'PROJECT': 'GRC_TECDEX', 'ACTIVE_BASELINE': 'TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16',
        'SCOPE': 'QA02_B01_B09_H04_OPERATIONAL_ACTIVATION',
        'CURRENT_PHASE': 'POST_STEP6A4_NORMATIVE_LIBRARY_INTERMEDIATE_PRE_STEP6A5',
        'QA01_INTEGRITY': 'PASS_WITH_PRIVATE_BACKUP_CHECK', 'QA_CONNECTION': 'PASS_QA_16_15_VERIFY_FULL_READ_ONLY',
        'MIGRATIONS_1_36': 'PASS_36_EXACT_MIGRATION36_ONCE_UNCHANGED', 'SCHEMA_INTEGRITY': 'PASS_244_TABLES_3630_COLUMNS_ZERO_MISMATCHES',
        'BUSINESS_DATA_INTEGRITY': 'PASS_244_FINGERPRINTS_5097_ROWS_IDENTICAL_TO_QA01',
        'IAM_REGISTRY_ACTIVATION': 'BLOCKED_NO_CANONICAL_AUTHENTICATED_EXECUTOR',
        'B06_BINDINGS_13': 'BLOCKED_0_OF_13_MATERIALIZED_NO_WRITES',
        'DEFINITIONS_RULES_4': 'BLOCKED_0_OF_4_PUBLISHED_NO_WRITES',
        'H04_OPERATIONAL_ACTIVATION': 'BLOCKED_IAM_DEPENDENCY_NO_AUTHENTICATED_HUMAN_CUSTODY_CONTEXT',
        'RBAC_SOD': 'PRESERVED_BY_ZERO_MUTATION_FUNCTIONAL_QA_NOT_RUN',
        'DEFAULT_DENY': 'PRESERVED_BY_ZERO_MUTATION_FUNCTIONAL_QA_NOT_RUN',
        'TENANT_ISOLATION': 'PRESERVED_BY_ZERO_MUTATION_510_COMPOSITE_FK_FUNCTIONAL_QA_NOT_RUN',
        'ISO_COMMERCIAL_SOURCES_ACTIVATED': 'NONE', 'NORMATIVE_IMPORTS': 'NONE',
        'BACKEND_DEPLOYMENTS': 'NONE', 'FRONTEND_DEPLOYMENTS': 'NONE', 'PRODUCTION_CHANGES': 'NONE',
        'QA_WRITES': 'NONE', 'QA_SCHEMA_CHANGES': 'NONE', 'INFRASTRUCTURE_CHANGES': 'NONE',
        'NEW_BACKUP': 'NONE_ZERO_WRITES_EXISTING_QA01_BACKUP_VERIFIED',
        'RECTOR_BASELINE_INTEGRITY': 'PASS', 'RECTOR_GATE': 'BLOCKED', 'QA02_GATE': 'BLOCKED',
        'BRANCH': e['branch'], 'HEAD': e['head'], 'INDEX': 'EMPTY_UNCHANGED',
        'FILES_CREATED': count, 'FILES_MODIFIED': 0,
        'STEP6A3_CLOSURE': 'PASS_PRESERVED', 'STEP6A4_CLOSURE': 'PASS_PRESERVED',
        'STEP6A5': 'NOT_STARTED', 'STEP6A6': 'NOT_STARTED', 'QA03': 'NOT_STARTED',
        'QA_E2E': 'NOT_RUN', 'HUMAN_UI_REVIEW': 'NOT_SELF_APPROVED',
        'LAYERS_CHANGED': ['QA02 evidence dossier only'],
        'LAYERS_PRESERVED': ['database schema and data', '36 migrations and ledger', 'executable contracts', 'backend', 'frontend', 'infrastructure', 'deployment contracts', 'all received files including historical dossiers and master status'],
        'UNRESOLVED_RECTOR_SEMANTIC_CONFLICTS': 'NONE; operational gate blocked by technical execution prerequisites',
        'NEXT_BLOCKERS': 'Local M2M credential and private canonical operator unavailable. ACME-1 additionally lacks seven baseline roles if selected. H04 authenticated human and private proof custody not available in this session.',
        'NEXT_SAFE_ACTION': 'Resume QA02 in an authorized context with existing canonical authenticated private executor and evidence custody; revalidate exact eligible tenant targets, operational interval and immediate recovery point. No code/schema/deployment repair, no QA01 repetition, no QA03.',
        'finished_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
    save('RESULT.json', result)
    files = [{'path': str(p.relative_to(R)), 'action': 'created', 'sha256': sha(p)} for p in sorted(B.rglob('*')) if p.is_file() and '__pycache__' not in p.parts]
    save('FILE_MANIFEST.json', {'scope': result['SCOPE'], 'files_created': count, 'files_modified': 0, 'received_files_preserved': len(e['files']), 'files': files, 'self_exclusion': 'FILE_MANIFEST.json is not self-hashed; verifier checks exact inventory and all other file hashes'})
    print(json.dumps({'sealed_files_created': count, 'files_modified': 0, 'QA02_GATE': 'BLOCKED'}))

if __name__ == '__main__':
    {'continuity': continuity, 'physical': physical, 'final': final, 'seal': seal}[sys.argv[1]]()
