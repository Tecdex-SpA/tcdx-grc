#!/usr/bin/env python3
"""Read-only successor verifier; no DB, network, QA, migration or activation."""
from pathlib import Path
import hashlib
import json
import os
import shutil
import subprocess

D = Path(__file__).resolve().parent
R = D.parents[3]
assert (R / 'AGENTS.md').is_file()
read = lambda p: json.loads(Path(p).read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
git = lambda *args: subprocess.check_output(['git', *args], cwd=R, text=True).strip()
initial = read(D / 'INITIAL_STATE.json')
manifest = read(D / 'FILE_MANIFEST.json')
result = read(D / 'RESULT.json')
assert git('branch', '--show-current') == initial['branch'] == result['BRANCH']
assert git('rev-parse', 'HEAD') == initial['head'] == result['HEAD']
assert git('diff', '--cached', '--raw') == initial['index'] == ''
for line in (D / 'SHA256SUMS.txt').read_text().splitlines():
    expected, path = line.split('  ', 1)
    f = R / path
    assert f.resolve().is_relative_to(R) and f.is_file() and sha(f) == expected, path
entries = {f['path']: f for f in manifest['files']}
for path, entry in entries.items():
    f = R / path
    assert f.resolve().is_relative_to(R) and f.is_file() and sha(f) == entry['sha256'], path
modified = {p for p in entries if p in initial['files']}
assert len(modified) == result['FILES_MODIFIED'] == 10
for path, expected in initial['files'].items():
    if path not in modified:
        assert (R / path).is_file() and sha(R / path) == expected, 'Received drift: ' + path
    else:
        assert entries[path]['before_sha256'] == expected
        pre = D / 'preimages' / path
        if path == 'docs/governance/MASTER_EXECUTION_STATUS.md':
            content = read(pre.with_suffix('.md.json'))['content'].encode()
            assert hashlib.sha256(content).hexdigest() == expected
        else:
            assert sha(pre) == expected, 'Preimage drift: ' + path

paths = subprocess.check_output(['git', 'ls-files', '-co', '--exclude-standard', '-z'], cwd=R).decode().split('\0')
current = {p for p in paths if p and (R / p).is_file()}
current |= {str(p.relative_to(R)) for p in D.rglob('*') if p.is_file()}
created = current - set(initial['files'])
assert len(created) == result['FILES_CREATED'] == manifest['files_created']
assert created == {p for p in entries if p not in initial['files']} | {str((D / p).relative_to(R)) for p in ['FILE_MANIFEST.json', 'SHA256SUMS.txt']}
assert not any(p.startswith('apps/frontend/') for p in modified)

old = read(D / 'preimages/database/migrations/manifest.json')
now = read(R / 'database/migrations/manifest.json')
assert len(old['migrations']) == 35 and len(now['migrations']) == 36
assert now == {**old, 'migrations': old['migrations'] + [read(D / 'migration36.json')]}
for m in now['migrations']:
    path = 'database/migrations/' + m['filename']
    assert sha(R / path) == m['sha256']
    if path in initial['files']:
        assert m['sha256'] == initial['files'][path]
before_schema = read(D / 'preimages/database/expected-schema.json')
schema = read(R / 'database/expected-schema.json')
assert schema['tableCount'] == 244
assert sum(len(t['columns']) for t in schema['tables']) == 3630
assert {k: v for k, v in schema.items() if k != 'configurationDefaultAmendment'} == before_schema

asset_path = 'packages/contracts/src/normative-library.generated.json'
before_assets = read(D / 'preimages' / asset_path)
assets = read(R / asset_path)
assert all(assets['sources'][p] == h for p, h in before_assets['sources'].items())
preserved_assets = {k: v for k, v in assets.items() if k != 'configurationDefaultCorrection'}
preserved_assets['sources'] = before_assets['sources']
assert preserved_assets == before_assets, 'API/schema/policies/permissions/B06/descriptors changed'

checks = read(D / 'CHECKS.json')
assert all(c['exit_code'] == 0 and (D / c['log']).is_file() for c in checks)
assert '141 passed' in (D / 'checks/focused.log').read_text()
pg = (D / 'checks/postgres.log').read_text()
assert '10 passed' in pg and '39 passed' in pg and '"schemaMismatches": 0' in pg
browser = read(D / 'browser-results.json')['stats']
assert browser['expected'] == 10 and browser['unexpected'] == 0 and browser['skipped'] == 0
assert read(D / 'LOCAL_CLUSTER_STATUS.json')['status'] == 'STOPPED'
assert result['QA_CONTACTED'] == 'NO' and result['RECTOR_GATE'] == 'PASS'
assert result['NEW_MIGRATION'] == 'PREPARED_LOCAL_NOT_APPLIED'
assert result['STEP6A5'] == result['STEP6A6'] == 'NOT_STARTED'

candidates = [os.environ.get('TCDX_VERIFY_NODE'), shutil.which('node')]
candidates += [str(p) for p in (Path.home() / '.npm/_npx').glob('*/node_modules/node/bin/node')]
node = None
for candidate in candidates:
    if candidate and Path(candidate).is_file() and subprocess.check_output([candidate, '--version'], text=True).startswith('v22.'):
        node = candidate
        break
assert node, 'Installed Node22 required; set TCDX_VERIFY_NODE to its binary'
environment = {**os.environ, 'PATH': str(Path(node).parent) + os.pathsep + os.environ['PATH']}
for command in [[node, 'scripts/foundations/generate-contract-assets.mjs', '--check'],
                [node, 'scripts/normative-library/generate-contract-assets.mjs', '--check'],
                [node, 'scripts/normative-library/generate-rights-contract.mjs', '--check'],
                ['bash', 'scripts/verify-rector-governance.sh'],
                ['bash', 'scripts/test-rector-governance-status.sh']]:
    p = subprocess.run(command, cwd=R, env=environment, capture_output=True, text=True)
    assert p.returncode == 0, ' '.join(command) + '\n' + p.stdout[-3000:] + p.stderr[-3000:]
print(json.dumps({'integrity': 'PASS', 'local_definitions_01': 'PASS_LOCAL_RESOLVED', 'definitions': '4_MATERIALIZED_VALIDATED_ISOLATED',
                  'migrations_1_35': 'UNCHANGED', 'migration_36': 'PREPARED_AND_TESTED_LOCAL_ONLY',
                  'canonical_generator': 'PASS_36_MIGRATIONS_244_TABLES', 'tests': '200_PASS_LOCAL',
                  'qa_contacted': 'NO', 'branch_head_index': 'PRESERVED', 'received_unrelated_files': 'PRESERVED',
                  'files_created': result['FILES_CREATED'], 'files_modified': result['FILES_MODIFIED']}, indent=2))
