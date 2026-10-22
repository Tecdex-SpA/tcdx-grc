#!/usr/bin/env python3
"""Capture QA02R bounded read-only diagnostics. No activation entry point."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
sys.dont_write_bytecode = True
B = Path(__file__).resolve().parent
R = B.parents[3]
def save(name, data):
    with (B / name).open('x') as f: f.write(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def git(*args): return subprocess.check_output(['git', *args], cwd=R, text=True).strip()
def preserved():
    e = json.loads((B / 'ENTRY.json').read_text())
    assert git('branch', '--show-current') == e['branch'] and git('rev-parse', 'HEAD') == e['head']
    assert git('diff', '--cached', '--raw') == e['index'] == ''
    for p, h in e['files'].items(): assert sha(R / p) == h, p
if sys.argv[1] == 'entry':
    paths = {p for p in subprocess.check_output(['git', 'ls-files', '-co', '--exclude-standard', '-z'], cwd=R).decode().split('\0') if p}
    paths |= {str(p.relative_to(R)) for p in B.parent.rglob('*') if p.is_file() and '__pycache__' not in p.parts}
    prefix = str(B.relative_to(R)) + '/'
    files = {p: sha(R / p) for p in sorted(paths) if not p.startswith(prefix) and (R / p).is_file()}
    save('ENTRY.json', {'utc': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'branch': git('branch', '--show-current'), 'head': git('rev-parse', 'HEAD'), 'index': git('diff', '--cached', '--raw'), 'git_status': git('status', '--short'), 'files': files})
elif sys.argv[1] in ['remote', 'remote-config']:
    preserved()
    args = ['ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=8', '-o', 'StrictHostKeyChecking=yes', 'tecdex@192.168.2.45', 'python3 -']
    mode = sys.argv[1]
    p = subprocess.run(args, input=(B / ('remote_probe.py' if mode == 'remote' else 'remote_config_probe.py')).read_text(), capture_output=True, text=True, timeout=150)
    if p.returncode:
        save('REMOTE_ATTEMPT.json', {'utc': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'exit_code': p.returncode, 'stderr': p.stderr[-1400:], 'raw_stdout': 'NOT_EXPORTED'})
        print('REMOTE_PROBE_FAILED')
        sys.exit(1)
    output = json.loads(p.stdout)
    save('REMOTE_METADATA.json' if mode == 'remote' else 'REMOTE_CONFIG.json', output)
    print(json.dumps({'status': output['status'], 'containers': len(output['containers']), 'activations': output.get('activation_requests', 0)}))
elif sys.argv[1] == 'roles':
    preserved()
    import importlib.util
    spec = importlib.util.spec_from_file_location('qa02_environment', B.parent / 'qa02-operational-activation-20261022/session.py')
    prior = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(prior)
    env = prior.op.env(False)
    env['PGOPTIONS'] = env['PGOPTIONS'].replace('grc_qa01_migration36', 'grc_qa02r_identity_roles_readonly')
    args = [prior.NODE, '--experimental-strip-types', str(B / 'identity_roles.mts')]
    p = subprocess.run(args, cwd=R, env=env, capture_output=True, text=True, timeout=60)
    save('IDENTITY_ROLES_COMMAND.json', {'command': args, 'exit_code': p.returncode, 'stdout': p.stdout if p.returncode == 0 else 'FAIL_DIAGNOSTIC_REDACTED', 'read_only': True, 'schema_verification_repeated': False})
    print(json.dumps({'exit_code': p.returncode, 'mode': 'roles'}))
    sys.exit(p.returncode)
elif sys.argv[1] == 'checks':
    preserved()
    commands = [['python3', str(B.parent / 'qa02-operational-activation-20261022/verify.py')], ['bash', 'scripts/verify-rector-governance.sh'], ['git', 'diff', '--check']]
    results = []
    for command in commands:
        p = subprocess.run(command, cwd=R, capture_output=True, text=True, timeout=60, env={**os.environ, 'PYTHONDONTWRITEBYTECODE': '1'})
        results.append({'command': command, 'exit_code': p.returncode, 'stdout': p.stdout, 'stderr': p.stderr})
    save('CHECKS.json', {'utc': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'checks': results})
    print(json.dumps({'check_exit_codes': [p['exit_code'] for p in results]}))
else: raise SystemExit('READ_ONLY_MODE_REQUIRED')
