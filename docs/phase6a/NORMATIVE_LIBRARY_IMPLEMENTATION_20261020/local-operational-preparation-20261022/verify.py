#!/usr/bin/env python3
"""Offline successor integrity verifier. No DB/network, data activation or historical edits."""
from pathlib import Path
import hashlib
import json
import os
import shutil
import subprocess

D = Path(__file__).resolve().parent
R = D.parents[3]
assert (R / 'AGENTS.md').is_file(), 'Repository root required'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def git(*args):
    return subprocess.check_output(['git', *args], cwd=R, text=True).strip()


initial = json.loads((D / 'INITIAL_STATE.json').read_text())
manifest = json.loads((D / 'FILE_MANIFEST.json').read_text())
result = json.loads((D / 'RESULT.json').read_text())
assert git('branch', '--show-current') == initial['branch'] == result['BRANCH']
assert git('rev-parse', 'HEAD') == initial['head'] == result['HEAD']
assert git('diff', '--cached', '--raw') == initial['index'] == '', 'Index changed'

for line in (D / 'SHA256SUMS.txt').read_text().splitlines():
    expected, relative = line.split('  ', 1)
    p = R / relative
    assert p.resolve().is_relative_to(R), relative
    assert p.is_file() and digest(p) == expected, 'Seal mismatch: ' + relative

entries = {f['path']: f for f in manifest['files']}
for path, entry in entries.items():
    p = R / path
    assert p.resolve().is_relative_to(R), path
    assert p.is_file() and digest(p) == entry['sha256'], 'Delta mismatch: ' + path
modified = {p for p in entries if p in initial['files']}
assert len(modified) == result['FILES_MODIFIED'] == 7
for path, expected in initial['files'].items():
    if path in modified:
        assert entries[path]['before_sha256'] == expected
        preimage = D / 'preimages' / path
        if path == 'docs/governance/MASTER_EXECUTION_STATUS.md':
            saved = json.loads(preimage.with_suffix('.md.json').read_text())
            assert hashlib.sha256(saved['content'].encode()).hexdigest() == saved['before_sha256'] == expected
        else:
            assert digest(preimage) == expected, 'Preimage mismatch: ' + path
    else:
        p = R / path
        assert p.is_file() and digest(p) == expected, 'Received-file drift: ' + path

listed = subprocess.check_output(['git', 'ls-files', '-co', '--exclude-standard', '-z'], cwd=R).decode().split('\0')
current = {p for p in listed if p and (R / p).is_file()}
# Logs may be Git-ignored; every dossier artifact still belongs in its seal/count.
current |= {str(p.relative_to(R)) for p in D.rglob('*') if p.is_file()}
created = current - set(initial['files'])
assert len(created) == result['FILES_CREATED'] == manifest['files_created']
assert created == {p for p in entries if p not in initial['files']} | {str((D / n).relative_to(R)) for n in ['FILE_MANIFEST.json', 'SHA256SUMS.txt']}, 'Unmanifested files'

migrations = json.loads((R / 'database/migrations/manifest.json').read_text())['migrations']
assert len(migrations) == 35
assert migrations[-1]['sha256'] == '9279159e88c60fff03f998e33008fb0d675f53e4423df638c9e54f709a773798'
for m in migrations:
    p = R / 'database/migrations' / m['filename']
    assert digest(p) == m['sha256'] == initial['files'][str(p.relative_to(R))]
assert json.loads((R / 'database/expected-schema.json').read_text())['tableCount'] == 244
assert result['QA_CONTACTED'] == 'NO' and result['RECTOR_GATE'] == 'BLOCKED'
assert result['DEFINITIONS_RULES_4'] == 'BLOCKED_LOCAL_DEFINITIONS_01_PREPARED_RULES_ONLY'
assert result['CODE_B04_01'] == 'PASS_PRESERVED'
assert result['STEP6A5'] == result['STEP6A6'] == 'NOT_STARTED'
assert len(json.loads((D / 'DEFINITIONS_PREPARATION.json').read_text())['definitions']) == 4
assert len(json.loads((D / 'IAM_REGISTRY_PREPARATION.json').read_text())['bindings']) == 13
checks = json.loads((D / 'CHECKS.json').read_text())
assert all(c['exit_code'] == 0 and (D / c['log']).is_file() for c in checks)
assert '144 passed' in (D / 'checks/focused.log').read_text()
assert '38 passed' in (D / 'checks/postgres.log').read_text()
assert '13 passed' in (D / 'checks/authentication.log').read_text()

# Prefer the required installed Node 22; never download tools or use an external service.
candidates = [os.environ.get('TCDX_VERIFY_NODE'), shutil.which('node')]
candidates += [str(p) for p in (Path.home() / '.npm/_npx').glob('*/node_modules/node/bin/node')]
node = None
for candidate in candidates:
    if candidate and Path(candidate).is_file():
        version = subprocess.check_output([candidate, '--version'], text=True).strip()
        if version.startswith('v22.'):
            node = candidate
            break
assert node, 'Installed Node 22 required; set TCDX_VERIFY_NODE to its binary'
environment = {**os.environ, 'PATH': str(Path(node).parent) + os.pathsep + os.environ['PATH']}
commands = [
    [node, 'scripts/foundations/generate-contract-assets.mjs', '--check'],
    [node, 'scripts/normative-library/generate-contract-assets.mjs', '--check'],
    [node, 'scripts/normative-library/generate-rights-contract.mjs', '--check'],
    ['bash', 'scripts/verify-rector-governance.sh'],
    ['bash', 'scripts/test-rector-governance-status.sh'],
]
for command in commands:
    p = subprocess.run(command, cwd=R, env=environment, capture_output=True, text=True)
    assert p.returncode == 0, '\n'.join(['Gate failed: ' + ' '.join(command), p.stdout[-3000:], p.stderr[-3000:]])

print(json.dumps({
    'integrity': 'PASS', 'received_files': 'PRESERVED_EXCEPT_7_DOCUMENTED_DELTAS',
    'branch_head_index': 'PRESERVED', 'migrations': '35_UNCHANGED', 'canonical_generator': 'PASS_UNCHANGED',
    'tests': '195_PASS_LOCAL_INCLUDING_EXPECTED_PHYSICAL_DENIALS',
    'scope_result': 'PARTIAL_BLOCKED', 'rector_gate': 'BLOCKED_LOCAL_DEFINITIONS_01',
    'qa_contacted': 'NO', 'files_created': result['FILES_CREATED'], 'files_modified': result['FILES_MODIFIED']
}, indent=2))
