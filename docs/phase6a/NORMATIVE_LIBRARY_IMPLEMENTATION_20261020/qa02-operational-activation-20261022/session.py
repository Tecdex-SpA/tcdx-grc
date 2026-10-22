#!/usr/bin/env python3
"""QA02 evidence capture. Database commands are read-only; no activation mode exists."""
import datetime
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys

sys.dont_write_bytecode = True
B = Path(__file__).resolve().parent
R = B.parents[3]
Q = B.parent / 'qa01-migration36-adoption-20261022'
spec = importlib.util.spec_from_file_location('qa01_environment', Q / 'operator.py')
op = importlib.util.module_from_spec(spec)
spec.loader.exec_module(op)
NODE = op.NODE

def read(p):
    return json.loads(p.read_text())

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def save(name, data):
    with (B / name).open('x') as f:
        f.write(json.dumps(data, indent=2, ensure_ascii=False) + '\n')

def git(*args):
    return subprocess.check_output(['git', *args], cwd=R, text=True).strip()

def entry():
    paths = {p for p in subprocess.check_output(['git', 'ls-files', '-co', '--exclude-standard', '-z'], cwd=R).decode().split('\0') if p}
    paths |= {str(p.relative_to(R)) for p in B.parent.rglob('*') if p.is_file() and '__pycache__' not in p.parts}
    prefix = str(B.relative_to(R)) + '/'
    files = {p: sha(R / p) for p in sorted(paths) if not p.startswith(prefix) and (R / p).is_file()}
    qa01 = read(Q / 'ENTRY.json')
    assert all(files[p] == h for p, h in qa01['files'].items() if p != 'docs/governance/MASTER_EXECUTION_STATUS.md')
    assert git('diff', '--cached', '--raw') == ''
    assert git('rev-parse', 'HEAD') == qa01['head']
    assert git('branch', '--show-current') == qa01['branch']
    save('ENTRY.json', {'utc': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'cwd': str(R), 'branch': git('branch', '--show-current'), 'head': git('rev-parse', 'HEAD'), 'index': git('diff', '--cached', '--raw'), 'status': git('status', '--short'), 'files': files})

def check_preservation():
    e = read(B / 'ENTRY.json')
    assert git('rev-parse', 'HEAD') == e['head'] and git('branch', '--show-current') == e['branch']
    assert git('diff', '--cached', '--raw') == e['index'] == ''
    for p, h in e['files'].items():
        assert sha(R / p) == h, 'Received file drift: ' + p

def command(name, args, database=False):
    check_preservation()
    env = op.env(False) if database else dict(os.environ)
    env['PYTHONDONTWRITEBYTECODE'] = '1'
    env['PATH'] = str(Path(NODE).parent) + os.pathsep + env.get('PATH', '')
    if database:
        env['PGOPTIONS'] = env['PGOPTIONS'].replace('grc_qa01_migration36', 'grc_qa02_readonly')
    start = datetime.datetime.now(datetime.timezone.utc).isoformat()
    p = subprocess.run(args, cwd=R, env=env, text=True, capture_output=True, timeout=180)
    # Only known read-only commands; errors are not allowed to expose connection secrets.
    result = {'command': args, 'started_utc': start, 'finished_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'exit_code': p.returncode,
              'stdout': p.stdout if not database or p.returncode == 0 else 'REDACTED_DATABASE_FAILURE',
              'stderr': p.stderr if not database or p.returncode == 0 else 'REDACTED_DATABASE_FAILURE', 'database': database, 'read_only': database}
    save(name, result)
    print(json.dumps({'receipt': name, 'exit_code': p.returncode, 'summary': p.stdout[-1100:] if p.returncode == 0 else result['stderr'][-500:]}))
    return p.returncode

if __name__ == '__main__':
    mode = sys.argv[1]
    if mode == 'entry':
        entry()
    elif mode == 'offline':
        commands = [
            ('QA01_VERIFY.json', ['python3', str(Q / 'verify.py'), '--check-backup']),
            ('HISTORICAL_DEFINITIONS_VERIFY.json', ['python3', str(B.parent / 'local-definitions-01-resolution-20261022/verify.py')]),
            ('HISTORICAL_PREPARATION_VERIFY.json', ['python3', str(B.parent / 'local-operational-preparation-20261022/verify.py')]),
            ('HISTORICAL_B04_VERIFY.json', ['python3', str(B.parent / 'code-b04-01-full-resolution-20261022/verify.py')]),
            ('RECTOR_VERIFY.json', ['bash', 'scripts/verify-rector-governance.sh']),
            ('STATUS_VERIFY.json', ['bash', 'scripts/test-rector-governance-status.sh']),
            ('FOUNDATIONS_GENERATOR_CHECK.json', [NODE, 'scripts/foundations/generate-contract-assets.mjs', '--check']),
            ('LIBRARY_GENERATOR_CHECK.json', [NODE, 'scripts/normative-library/generate-contract-assets.mjs', '--check']),
            ('RIGHTS_GENERATOR_CHECK.json', [NODE, 'scripts/normative-library/generate-rights-contract.mjs', '--check']),
            ('LOCAL_READINESS.json', [NODE, '--experimental-strip-types', str(B / 'local-readiness.mts')]),
        ]
        for name, args in commands:
            command(name, args)
    elif mode in ['PRE', 'PRE_RETRY', 'POST']:
        sys.exit(command('CANONICAL_' + mode + '.json', [NODE, '--experimental-strip-types', str(B / 'inspect.mts'), mode], True))
    elif mode == 'schema':
        sys.exit(command('CANONICAL_SCHEMA_VERIFY.json', [NODE, '--experimental-strip-types', 'scripts/foundations/verify-schema.ts'], True))
    elif mode == 'readiness':
        sys.exit(command('LOCAL_READINESS_RETRY.json', [NODE, '--experimental-strip-types', str(B / 'local-readiness.mts')]))
    else:
        raise SystemExit('READ_ONLY_MODE_REQUIRED')
