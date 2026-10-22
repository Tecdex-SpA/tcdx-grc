#!/usr/bin/env python3
"""Read-only verification of this successor, its protected predecessor and local publications."""
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
    return subprocess.check_output(['git', *args], cwd=ROOT)


def ref(item):
    assert sha(item['path']) == item['sha256'], item['path']


def main():
    entry = json.loads((BASE / 'ENTRY.json').read_text())
    delta = json.loads((BASE / 'DELTAS_SUCCESSOR.json').read_text())
    for item in delta['files']:
        ref(item)
    actual_changes = []
    for path, original in entry['files'].items():
        assert (ROOT / path).is_file(), path
        if sha(path) != original:
            actual_changes.append(path)
    assert sorted(actual_changes) == sorted(delta['modified_this_run']), actual_changes
    current = set(git('ls-files', '--cached', '--others', '--exclude-standard', '-z').decode().split('\0')) - {''}
    inventory = {item['path'] for item in delta['files']} | set(delta['seal_exclusions'])
    assert current - set(entry['files']) <= inventory, sorted(current - set(entry['files']) - inventory)
    sums = (BASE / 'SHA256SUMS_SUCCESSOR.txt').read_text().splitlines()
    for line in sums:
        expected, path = line.split('  ', 1)
        assert sha(path) == expected, path
    assert {line.split('  ', 1)[1] for line in sums} == inventory - set(delta['manifest_exclusions'])

    # No predecessor evidence/receipt is re-sealed. Seven received source files have authorized deltas.
    previous_root = 'docs/phase6a/NORMATIVE_LIBRARY_IMPLEMENTATION_20261020/'
    previous = read(previous_root + 'CHANGES.json')
    received_changes = []
    for item in previous['files']:
        if sha(item['path']) != item['sha256']:
            received_changes.append(item['path'])
    assert sorted(received_changes) == sorted(delta['received_source_deltas']), received_changes
    for path in previous['seal_exclusions']:
        assert sha(path) == entry['files'][path], path
    assert len(previous['preexisting_modified']) == 8 and previous['files_created'] == 115

    amendments = [
        'NORMATIVE_LIBRARY_20261020', 'NORMATIVE_LIBRARY_B06_REGISTRY_20261020',
        'NORMATIVE_LIBRARY_ITEM_INITIAL_20261020', 'NORMATIVE_LIBRARY_H04_RIGHTS_20261021',
        'NORMATIVE_LIBRARY_CONTROL_VALIDATION_20261021', 'NORMATIVE_LIBRARY_H04_SQL_GRAMMAR_20261021',
    ]
    verified_entries = 0
    for name in amendments:
        root = 'docs/executable-contracts/amendments/' + name + '/'
        receipt = read(root + 'CONTRACT_PUBLICATION_RECEIPT.json')
        assert receipt['status'] == 'PASS_CONTRACT_EFFECTIVE_LOCAL', name
        ref(receipt['publication_manifest'])
        for item in read(receipt['publication_manifest']['path'])['files']:
            ref(item)
            verified_entries += 1
        for key in ['authorization', 'review', 'review_manifest', 'predecessor_receipt', 'effective_ddl', 'supersedes_only']:
            if key in receipt:
                ref(receipt[key])
        if name in amendments[:3]:
            assert sha(root + 'CONTRACT_PUBLICATION_RECEIPT.json') == entry['files'][root + 'CONTRACT_PUBLICATION_RECEIPT.json']
    original = read('docs/executable-contracts/amendments/NORMATIVE_LIBRARY_20261020/PUBLICATION_MANIFEST.json')
    for path in original['seal_exclusions']:
        assert sha(path) == entry['files'][path], path
    assert read('docs/executable-contracts/amendments/NORMATIVE_LIBRARY_H04_RIGHTS_20261021/CONTRACT.json')['rights_instances'] == []

    for name in ['FINAL_CODE_GATES.json', 'FINAL_UI_GATES.json', 'FINAL_BOUNDARY_RECHECK.json']:
        rows = json.loads((BASE / name).read_text())
        assert all(r['status'] == 'PASS' and r['exit_code'] == 0 for r in rows), name
        for row in rows:
            assert sha(row['log']) == row['sha256'], row['log']
    browser = json.loads((BASE / 'BROWSER_RECEIPT.json').read_text())
    ref(browser['last_run'])
    for item in browser['images']:
        ref(item)
    for path, expected in browser['source_sha256'].items():
        assert sha(path) == expected, path
    assert json.loads((BASE / 'browser/.last-run.json').read_text())['status'] == 'passed'

    assert read('docs/rector/ACTIVE_ACTIVATION.json')['baseline_id'] == 'TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16'
    assert git('branch', '--show-current').decode().strip() == entry['branch']
    assert git('rev-parse', 'HEAD').decode().strip() == entry['head']
    assert hashlib.sha256(git('diff', '--cached', '--binary')).hexdigest() == entry['index_sha256']
    assert not git('diff', '--cached', '--name-only').strip()
    return {
        'status': 'PASS_CONTINUATION_INTEGRITY_ONLY',
        'previous_115_created': 'ALL_PRESENT_108_BYTE_IDENTICAL_7_AUTHORIZED_SOURCE_DELTAS',
        'previous_8_modified': 'ALL_PRESENT_BYTE_IDENTICAL_TO_INCOMING_CHECKPOINT',
        'received_source_deltas': received_changes,
        'original_contract_files_preserved': len(original['files']) + len(original['seal_exclusions']),
        'publication_receipts_verified': len(amendments),
        'publication_manifest_entries_verified': verified_entries,
        'source_files_modified_this_run': len(actual_changes),
        'files_created_this_run': delta['files_created_this_run'],
        'manifest_entries_verified': len(sums),
        'branch': entry['branch'], 'head': entry['head'], 'index': 'EMPTY_PRESERVED',
        'rights_evidence': 'NONE_NOT_ASSERTED',
        'runtime_physical_qa': 'NOT_EXECUTED',
        'implementation': 'WIRED_CODE_ONLY_RUNTIME_BLOCKED_DEPENDENCY',
    }


if __name__ == '__main__':
    print(json.dumps(main(), indent=2))
