#!/usr/bin/env python3
"""Read-only transfer verification. Does not connect to services or modify Git."""
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[3]
BASE = Path(__file__).resolve().parent


def digest(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()


def read(path):
    return json.loads((ROOT / path).read_text())


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def verify_ref(ref):
    assert digest(ref['path']) == ref['sha256'], ref['path']


def main():
    entry = json.loads((BASE / 'evidence/ENTRY.json').read_text())
    changes = json.loads((BASE / 'CHANGES.json').read_text())
    for item in changes['files']:
        assert digest(item['path']) == item['sha256'], item['path']
    sums = (BASE / 'SHA256SUMS.txt').read_text().splitlines()
    for line in sums:
        expected, path = line.split('  ', 1)
        assert digest(path) == expected, path
    changed = []
    for path, original in entry['files'].items():
        assert (ROOT / path).is_file(), 'Missing predecessor: ' + path
        if digest(path) != original:
            changed.append(path)
    assert sorted(changed) == sorted(changes['preexisting_modified']), changed
    assert git('branch', '--show-current').decode().strip() == entry['branch']
    assert git('rev-parse', 'HEAD').decode().strip() == entry['head']
    assert hashlib.sha256(git('diff', '--cached', '--binary')).hexdigest() == entry['index_sha256']
    assert not git('diff', '--cached', '--name-only').strip(), 'Unexpected staged changes'

    original = 'docs/executable-contracts/amendments/NORMATIVE_LIBRARY_20261020/'
    receipt_path = original + 'CONTRACT_PUBLICATION_RECEIPT.json'
    assert digest(receipt_path) == entry['receipt_sha256']
    receipt = read(receipt_path)
    for key in ['publication_manifest', 'review_manifest', 'authorization']:
        verify_ref(receipt[key])
    manifest = read(receipt['publication_manifest']['path'])
    for item in manifest['files']:
        verify_ref(item)
    # All four sealing exclusions: two fixed by receipt, two by entry snapshot.
    for path in manifest['seal_exclusions']:
        assert path in entry['files'], path
        assert digest(path) == entry['files'][path], path

    successor_root = 'docs/executable-contracts/amendments/'
    successor_count = 0
    for directory in ['NORMATIVE_LIBRARY_B06_REGISTRY_20261020', 'NORMATIVE_LIBRARY_ITEM_INITIAL_20261020']:
        successor = read(successor_root + directory + '/CONTRACT_PUBLICATION_RECEIPT.json')
        assert successor['status'] == 'PASS_CONTRACT_EFFECTIVE_LOCAL'
        verify_ref(successor['publication_manifest'])
        for item in read(successor['publication_manifest']['path'])['files']:
            verify_ref(item)
        successor_count += 1

    before = read(original + 'LIFECYCLE_BINDINGS.json')['bindings']
    after = read(successor_root + 'NORMATIVE_LIBRARY_B06_REGISTRY_20261020/LIFECYCLE_BINDINGS.json')['bindings']
    assert len(before) == len(after) == 13
    changed_commands = 0
    keys = set()
    for old, new in zip(before, after):
        assert {k:v for k,v in old.items() if k != 'command_code'} == {k:v for k,v in new.items() if k != 'command_code'}
        changed_commands += old['command_code'] != new['command_code']
        key = (new['entity_type'], new['from_state'], new['command_code'])
        assert key not in keys, key
        keys.add(key)
    assert changed_commands == 8

    current = set(git('ls-files', '--cached', '--others', '--exclude-standard', '-z').decode().split('\0')) - {''}
    new_git_paths = current - set(entry['files'])
    inventoried = {item['path'] for item in changes['files']} | set(changes['seal_exclusions'])
    assert new_git_paths <= inventoried, sorted(new_git_paths - inventoried)
    expected_sums = inventoried - set(changes['manifest_exclusions'])
    assert {line.split('  ', 1)[1] for line in sums} == expected_sums
    for name in ['FINAL_VERIFICATION.json', 'LAST_VERIFICATION.json']:
        rows = json.loads((BASE / 'evidence' / name).read_text())
        assert all(row['status'] == 'PASS' and row['exit_code'] == 0 for row in rows), name
    assert json.loads((BASE / 'evidence/playwright/.last-run.json').read_text())['status'] == 'passed'
    return {
        'status': 'PASS_CHECKPOINT_INTEGRITY_ONLY',
        'contract_gate': 'PASS_ORIGINAL_AND_TWO_PUBLISHED_SUCCESSORS',
        'original_manifest_entries': len(manifest['files']),
        'original_sealing_files': len(manifest['seal_exclusions']),
        'successor_publications_verified': successor_count,
        'registry_unique_keys': len(keys),
        'registry_command_changes': changed_commands,
        'entry_files_verified': len(entry['files']),
        'preexisting_modified': changed,
        'files_created': changes['files_created'],
        'files_modified': len(changed),
        'manifest_entries_verified': len(sums),
        'branch': entry['branch'], 'head': entry['head'],
        'index': 'EMPTY_PRESERVED',
        'runtime_physical_qa': 'NOT_EXECUTED',
        'implementation': 'INCOMPLETE_CODE_PREPARED_NOT_ENABLED',
        'H04': 'PROPOSAL_ONLY_NOT_A_PUBLISHED_RIGHTS_BINDING',
    }


if __name__ == '__main__':
    print(json.dumps(main(), indent=2, ensure_ascii=False))
