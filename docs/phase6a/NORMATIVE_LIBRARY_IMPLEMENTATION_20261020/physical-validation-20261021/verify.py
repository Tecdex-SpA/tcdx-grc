#!/usr/bin/env python3
"""Read-only successor verification. No Docker/SQL/network or worktree writes."""
import hashlib
import json
from pathlib import Path
import subprocess

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[3]

def read(path):
    return json.loads((ROOT / path).read_text())

def sha(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT).decode().strip()

def main():
    entry = json.loads((BASE / 'ENTRY.json').read_text())
    inventory = json.loads((BASE / 'INVENTORY.json').read_text())
    seal = json.loads((BASE / 'FINAL_INTEGRITY.json').read_text())
    current = set(git('ls-files', '--cached', '--others', '--exclude-standard', '-z').split('\0')) - {''}
    for path, expected in entry['files'].items():
        assert sha(path) == expected, 'Incoming bytes changed: ' + path
    own = {r['path'] for r in inventory['files']} | set(inventory['seal_exclusions'])
    actual_owned = {str(p.relative_to(ROOT)) for directory in inventory['owned_roots']
                    for p in (ROOT / directory).rglob('*') if p.is_file()}
    assert actual_owned == own, 'Unexpected/missing successor evidence, including ignored logs'
    assert current - set(entry['files']) <= own, 'Unexpected successor files outside owned roots'
    assert not (set(entry['files']) - current), 'Deleted incoming paths'
    for item in inventory['files']:
        assert sha(item['path']) == item['sha256'], item['path']
    sums = (BASE / 'SHA256SUMS.txt').read_text().splitlines()
    hashed = set()
    for row in sums:
        expected, path = row.split('  ', 1)
        assert sha(path) == expected, path
        hashed.add(path)
    assert hashed == own - set(inventory['manifest_exclusions'])
    assert sha(str((BASE / 'SHA256SUMS.txt').relative_to(ROOT))) == seal['manifest_sha256']
    assert len(own) == inventory['files_created_this_run'] == seal['files_created_this_run']
    assert git('branch', '--show-current') == entry['branch']
    assert git('rev-parse', 'HEAD') == entry['head']
    assert not git('diff', '--cached', '--name-only') and not entry['index']
    assert read('docs/rector/ACTIVE_ACTIVATION.json')['baseline_id'] == 'TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16'
    for n in ['01', '02', '03']:
        result = json.loads((BASE / ('attempt-' + n) / 'RESULT.json').read_text())
        assert result['cleanup'] == 'PASS_DESTROYED', n
        isolation = json.loads((BASE / ('attempt-' + n) / 'ISOLATION.json').read_text())
        assert isolation['network'] == 'none' and not isolation['ports'] and not isolation['binds'] and not isolation['mounts']
    final = json.loads((BASE / 'attempt-03/RESULT.json').read_text())
    assert final['status'] == 'PASS' and len(final['checks']) == 149
    assert all(c['status'] == 'PASS' for c in final['checks'])
    original = json.loads((BASE / 'attempt-02/RESULT.json').read_text())
    assert {c['id'] for c in original['checks'] if c['status'] == 'FAIL'} == {'rights_pack_exact_positive','rights_pack_unknown_fk'}
    for ddl in final['candidate_ddls']:
        assert sha(ddl['path']) == ddl['sha256']
    proposal = 'docs/executable-contracts/amendments/NORMATIVE_LIBRARY_H04_PHYSICAL_VALIDATION_20261021/'
    manifest = read(proposal + 'PUBLICATION_MANIFEST_CANDIDATE.json')
    assert manifest['status'] == 'CANDIDATE_NOT_PUBLISHED'
    assert not (ROOT / proposal / 'CONTRACT_PUBLICATION_RECEIPT.json').exists()
    for item in manifest['files']:
        assert sha(item['path']) == item['sha256']
    assert json.loads((BASE / 'RECTOR_GATE.json').read_text())['status'] == 'PASS'
    return {'status':'PASS_ISOLATED_VALIDATION_SUCCESSOR_INTEGRITY',
            'incoming_files_preserved':len(entry['files']), 'files_modified_this_run':0,
            'files_created_this_run':len(own), 'manifest_entries_verified':len(sums),
            'physical_checks_final':'149_PASS_WITH_UNPUBLISHED_CORRECTOR',
            'effective_H04_pack_cases':'2_FAIL_PRESERVED', 'temporary_environments':'3_DESTROYED',
            'branch':entry['branch'], 'head':entry['head'], 'index':'EMPTY_PRESERVED',
            'qa_production_operations':'NONE', 'functional_runtime_closure':'NOT_ASSERTED'}

if __name__ == '__main__':
    print(json.dumps(main(), indent=2))
