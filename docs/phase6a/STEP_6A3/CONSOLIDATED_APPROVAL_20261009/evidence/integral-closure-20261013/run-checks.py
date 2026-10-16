"""Repeatable verification of current source; local PostgreSQL only, no QA mutation."""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import shutil

ROOT = Path(__file__).resolve().parents[6]
OUT = Path(__file__).resolve().parent
NODE = Path(os.environ.get('TCDX_NODE22_BINARY', '/private/tmp/tcdx-grc-npm-cache/_npx/5dad66f2cb301fc2/node_modules/node/bin/node'))
ENV = dict(os.environ)
ENV.update(PATH=str(NODE.parent) + os.pathsep + ENV['PATH'], NODE_ENV='test',
           DATABASE_HOST='127.0.0.1', DATABASE_PORT='55432', DATABASE_NAME='tcdx-grc',
           DATABASE_USER='postgres', DATABASE_SSL_MODE='disable', TCDX_ISOLATED_REBUILD='true',
           TCDX_SECURITY_INTEGRATION='true', TCDX_PHASE5_LIFECYCLE_INTEGRATION='true',
           TCDX_EC_READONLY_POSTGRES='true')
# The existing disposable container authenticates locally without a password.
ENV.pop('DATABASE_PASSWORD', None)
CHECKS = {
    'rector': ['bash', 'scripts/verify-rector-governance.sh'],
    'rector-status': ['bash', 'scripts/test-rector-governance-status.sh'],
    'typecheck': ['pnpm', 'typecheck'],
    'lint': ['pnpm', 'lint'],
    'build': ['pnpm', 'build'],
    'fixtures': [str(NODE), str(OUT / 'prepare-fixtures.mjs')],
    'unit': ['pnpm', 'exec', 'vitest', 'run', '--config', 'vitest.config.ts', '--exclude', '**/*.postgres.test.ts',
             '--reporter=json', '--outputFile=' + str(OUT / 'unit-results.json')],
    'contracts': ['pnpm', 'contracts:verify'],
    'secrets': ['pnpm', 'secrets:scan'],
    'migration-status': ['pnpm', 'db:status'],
    'migration-apply-isolated': ['pnpm', 'db:migrate'],
    'migration-validation': ['pnpm', 'db:migration-gates'],
    'schema': ['pnpm', 'db:verify'],
    'seeds': ['pnpm', 'seed:verify'],
    'subscription-postgres': ['pnpm', 'exec', 'vitest', 'run', '--config', 'vitest.integration.config.ts',
                              'apps/backend/src/security/platform-subscription.postgres.test.ts',
                              '--reporter=json', '--outputFile=' + str(OUT / 'subscription-postgres-results.json')],
    'postgres': ['pnpm', 'exec', 'vitest', 'run', '--config', 'vitest.integration.config.ts', '--no-file-parallelism',
                 '--reporter=json', '--outputFile=' + str(OUT / 'postgres-results.json')],
    'tenant-isolation': ['pnpm', 'db:tenant-isolation'],
}
parser = argparse.ArgumentParser()
parser.add_argument('checks', nargs='+', choices=CHECKS)
args = parser.parse_args()
assert (ROOT / 'AGENTS.md').is_file(), ROOT
assert subprocess.check_output([str(NODE), '--version'], text=True).strip() == 'v22.23.2'
for name in args.checks:
    prior = list(OUT.glob(name + '-*.json')) + list(OUT.glob(name + '.log'))
    if prior:
        archive = OUT / 'attempts' / (name + '-' + datetime.datetime.now(datetime.timezone.utc).strftime('%H%M%S%f'))
        archive.mkdir(parents=True)
        for artifact in prior:
            shutil.copy2(artifact, archive / artifact.name)
    # Unit regression must not silently include PG-enabled suites in parallel.
    env = dict(ENV)
    if name == 'unit':
        env.pop('TCDX_SECURITY_INTEGRATION', None)
        env.pop('TCDX_PHASE5_LIFECYCLE_INTEGRATION', None)
    if name == 'postgres':
        attestation = json.loads((OUT / 'fixture-attestation.json').read_text())
        env.update(TCDX_STEP6A3_REFERENCE_POSTGRES='true',
                   TCDX_STEP6A3_PG_SYSTEM_IDENTIFIER=attestation['system_identifier'])
    started = datetime.datetime.now(datetime.timezone.utc).isoformat()
    process = subprocess.run(CHECKS[name], cwd=ROOT, env=env, capture_output=True, text=True, timeout=600)
    log = OUT / (name + '.log')
    log.write_text(process.stdout + process.stderr)
    result = dict(check=name, command=CHECKS[name], started_at=started,
                  finished_at=datetime.datetime.now(datetime.timezone.utc).isoformat(), exit_code=process.returncode,
                  status='PASS' if process.returncode == 0 else 'FAIL', node='22.23.2',
                  database_target='127.0.0.1:55432/tcdx-grc', shared_qa_mutations=0,
                  log_sha256=hashlib.sha256(log.read_bytes()).hexdigest())
    (OUT / (name + '-receipt.json')).write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result), flush=True)
    if process.returncode:
        print((process.stdout + process.stderr)[-7000:], flush=True)
        raise SystemExit(process.returncode)
