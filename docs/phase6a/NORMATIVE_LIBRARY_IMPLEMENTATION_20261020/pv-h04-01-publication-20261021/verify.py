#!/usr/bin/env python3
"""Read-only review/publication gates; never executes SQL, Docker or network."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[3]
CONTRACT = 'docs/executable-contracts/amendments/NORMATIVE_LIBRARY_H04_PV01_PUBLICATION_20261021/'
CANDIDATE = 'docs/executable-contracts/amendments/NORMATIVE_LIBRARY_H04_PHYSICAL_VALIDATION_20261021/'
PHYSICAL = 'docs/phase6a/NORMATIVE_LIBRARY_IMPLEMENTATION_20261020/physical-validation-20261021/'
PREDECESSOR = 'docs/executable-contracts/amendments/NORMATIVE_LIBRARY_H04_SQL_GRAMMAR_20261021/'

def read(path):
    return json.loads((ROOT / path).read_text())

def sha(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()

def ref(item):
    assert sha(item['path']) == item['sha256'], item['path']

def main():
    entry = json.loads((BASE / 'ENTRY.json').read_text())
    for path, expected in entry['files'].items():
        assert sha(path) == expected, 'Protected bytes changed: ' + path
    assert len(entry['files']) == 5209
    auth = read(CONTRACT + 'AUTHORIZATION.json')
    ref(auth['authorized_candidate_manifest'])
    candidate = read(auth['authorized_candidate_manifest']['path'])
    for item in candidate['files']:
        ref(item)
    review = read(CANDIDATE + 'REVIEW.json')
    for key in ['ddl', 'physical_result', 'original_failure']:
        ref(review[key])
    effective = read(PREDECESSOR + 'CONTRACT_PUBLICATION_RECEIPT.json')
    for key in ['publication_manifest', 'effective_ddl', 'predecessor_receipt', 'supersedes_only']:
        ref(effective[key])
    for item in read(effective['publication_manifest']['path'])['files']:
        ref(item)
    # Exact function delta; no lower-layer semantic edits or substituted DDL.
    original = (ROOT / effective['effective_ddl']['path']).read_text()
    expected = original[original.index('CREATE FUNCTION '):original.index('CREATE TRIGGER ')]
    expected = expected.replace('CREATE FUNCTION ', 'CREATE OR REPLACE FUNCTION ', 1)
    expected = expected.replace(' audit_row record; pack_tenant uuid;', ' audit_row record;')
    old = "  SELECT tenant_id INTO STRICT pack_tenant FROM regulatory.regulatory_pack_versions WHERE regulatory_pack_version_id=NEW.regulatory_pack_version_id FOR SHARE;\n  IF pack_tenant IS NOT NULL AND pack_tenant IS DISTINCT FROM NEW.tenant_id THEN RAISE EXCEPTION 'pack ownership mismatch'; END IF;"
    assert old in expected
    expected = expected.replace(old, '  -- The canonical pack/version catalog has no tenant/ownership columns.\n  -- Lock the exact global package; the existing FK rejects an unknown id.\n  PERFORM regulatory_pack_version_id FROM regulatory.regulatory_pack_versions WHERE regulatory_pack_version_id=NEW.regulatory_pack_version_id FOR SHARE;')
    actual = (ROOT / review['ddl']['path']).read_text()
    assert actual[actual.index('CREATE OR REPLACE FUNCTION '):] == expected
    historical = read(PHYSICAL + 'INVENTORY.json')
    assert historical['files_created_this_run'] == 850
    for item in historical['files']:
        ref(item)
    for line in (ROOT / PHYSICAL / 'SHA256SUMS.txt').read_text().splitlines():
        expected_hash, path = line.split('  ', 1)
        assert sha(path) == expected_hash, path
    assert sha(PHYSICAL + 'SHA256SUMS.txt') == read(PHYSICAL + 'FINAL_INTEGRITY.json')['manifest_sha256']
    physical = read(review['physical_result']['path'])
    assert physical['status'] == 'PASS' and len(physical['checks']) == 149
    verified_logs = 0
    for index, case in enumerate(physical['checks'], 1):
        assert case['status'] == 'PASS'
        prefix = PHYSICAL + 'attempt-03/%03d-%s' % (index, case['id'])
        assert sha(prefix + '.sql') == case['sql_sha256'], prefix
        log = (ROOT / (prefix + '.log')).read_text()
        if case['expected_sqlstate'] is None:
            assert case['returncode'] == 0 and 'ERROR:' not in log, prefix
        else:
            assert case['returncode'] != 0 and re.search(r'\b' + re.escape(case['expected_sqlstate']) + ':', log), prefix
            if case['expected_message']:
                assert case['expected_message'] in log, prefix
        verified_logs += 1
    for n in ['01', '02', '03']:
        assert read(PHYSICAL + 'attempt-' + n + '/CLEANUP.json')['status'] == 'PASS_DESTROYED'
    original_failure = read(PHYSICAL + 'attempt-02/RESULT.json')
    failures = [c for c in original_failure['checks'] if c['status'] == 'FAIL']
    assert {c['id'] for c in failures} == {'rights_pack_exact_positive', 'rights_pack_unknown_fk'}
    for index, case in enumerate(original_failure['checks'], 1):
        if case['status'] == 'FAIL':
            log = (ROOT / (PHYSICAL + 'attempt-02/%03d-%s.log' % (index, case['id']))).read_text()
            assert '42703:' in log and 'tenant_id' in log
    for ddl in physical['candidate_ddls']:
        ref(ddl)
    assert any(ddl['path'] == review['ddl']['path'] for ddl in physical['candidate_ddls'])
    def git(*args):
        return subprocess.check_output(['git', *args], cwd=ROOT).decode().strip()
    assert git('branch', '--show-current') == entry['branch']
    assert git('rev-parse', 'HEAD') == entry['head']
    assert git('diff', '--cached', '--binary') == entry['index'] == ''
    assert read('docs/rector/ACTIVE_ACTIVATION.json')['baseline_id'] == auth['baseline_id']
    state = 'PASS_PUBLICATION_REVIEW_ONLY'
    if '--final' in sys.argv:
        receipt = read(CONTRACT + 'CONTRACT_PUBLICATION_RECEIPT.json')
        assert receipt['status'] == 'PASS_CONTRACT_EFFECTIVE_LOCAL'
        assert receipt['PV_H04_01'] == 'CONTRACT_PUBLISHED_VERIFIED'
        for key in ['publication_manifest', 'authorization', 'review', 'predecessor_receipt', 'effective_ddl', 'physical_evidence']:
            ref(receipt[key])
        for item in read(receipt['publication_manifest']['path'])['files']:
            ref(item)
        assert receipt['effective_ddl'] == review['ddl']
        assert receipt['runtime_activation'] == 'NOT_EXECUTED'
        state = 'PASS_CONTRACT_PUBLICATION_VERIFIED'
    if '--sealed' in sys.argv:
        inventory = json.loads((BASE / 'DELTAS.json').read_text())
        own = {i['path'] for i in inventory['files']} | set(inventory['seal_exclusions'])
        actual_own = {str(p.relative_to(ROOT)) for directory in inventory['owned_roots']
                      for p in (ROOT / directory).rglob('*') if p.is_file()}
        assert actual_own == own
        visible = set(git('ls-files', '--cached', '--others', '--exclude-standard', '-z').split('\0')) - {''}
        assert visible - set(entry['files']) <= own
        for item in inventory['files']:
            ref(item)
        hashed = set()
        for line in (BASE / 'SHA256SUMS.txt').read_text().splitlines():
            expected_hash, path = line.split('  ', 1)
            assert sha(path) == expected_hash, path
            hashed.add(path)
        assert hashed == own - set(inventory['manifest_exclusions'])
        assert sha(str((BASE / 'SHA256SUMS.txt').relative_to(ROOT))) == json.loads((BASE / 'FINAL_INTEGRITY.json').read_text())['manifest_sha256']
        assert len(own) == inventory['files_created_this_run']
    return {'status': state, 'protected_files_verified': 5209,
            'original_files_preserved': 4359, 'physical_artifacts_preserved': 850,
            'physical_checks_evidence_verified': verified_logs,
            'original_failures_preserved': 2, 'corrector_delta': 'EXACT_ONE_FUNCTION',
            'runtime_execution_this_run': 'NONE', 'branch': entry['branch'],
            'head': entry['head'], 'index': 'EMPTY_PRESERVED'}

if __name__ == '__main__':
    print(json.dumps(main(), indent=2))
