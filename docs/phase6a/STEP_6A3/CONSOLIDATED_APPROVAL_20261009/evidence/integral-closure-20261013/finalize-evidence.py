"""Verify preservation and tie the final report to exact artifacts, without approval."""
import datetime
import hashlib
import json
from pathlib import Path
import subprocess

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[5]
def command(*args):
    return subprocess.check_output(args, cwd=ROOT, text=True).strip()
def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
assert (ROOT / 'AGENTS.md').is_file()
entry = json.loads((OUT / 'entry-state.json').read_text())
assert command('git', 'branch', '--show-current') == entry['branch']
assert command('git', 'rev-parse', 'HEAD') == entry['head']
remote = command('git', 'ls-remote', 'origin', 'refs/heads/' + entry['branch']).split()[0]
assert remote == entry['remote_branch_head']
inherited = entry['inherited_files_first_content_hash_recorded_at_report_time']
assert all(sha(ROOT / path) == digest for path, digest in inherited.items())
protected = ['docs/rector', 'docs/physical-data-model', 'docs/executable-contracts', 'database',
             'apps/frontend', 'deploy', '.github']
protected_diff = command('git', 'diff', '--name-only', '--', *protected)
assert protected_diff == '', protected_diff
assert command('git', 'diff', '--check') == ''
scan = subprocess.run(['rg', '-n', 'grc\\.tecdx\\.net', 'apps', 'packages', 'deploy', 'database',
                       'e2e', '.github', '.env.example'], cwd=ROOT, capture_output=True, text=True)
assert scan.returncode == 1, scan.stdout
unit = json.loads((OUT / 'unit-results.json').read_text())
pg = json.loads((OUT / 'postgres-results.json').read_text())
assert all(d['numFailedTests'] == d['numPendingTests'] == 0 for d in [unit, pg])
qa = json.loads((OUT / 'qa-readonly.json').read_text())['probe']
known = {m['id']: m for m in json.loads((ROOT / 'database/migrations/manifest.json').read_text())['migrations']}
assert all(known[m['migration_id']]['sha256'] == m['content_sha256'] for m in qa['migrations'])
assert len(qa['migrations']) == 30 and qa['migrations'][-1]['migration_id'] == '20261007000200'
ledger = json.loads((OUT / 'inherited-pending-clauses.json').read_text())
assert ledger['done'] == 36 and len(ledger['pending']) == 12
result = dict(recorded_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
              branch=entry['branch'], head=entry['head'], remote_head=remote,
              rector_integrity='PASS', rector_closure_gate='BLOCKED', step_6a3='PARTIAL_BLOCKED',
              step_6a4='NOT_STARTED', step_6a4_ready='BLOCKED',
              protected_paths=protected, protected_tracked_changes=[], inherited_files_preserved=inherited,
              active_domain_scan='PASS', whitespace='PASS', qa_ledger_checksums='PASS_30',
              unit_pass=unit['numPassedTests'], postgres_pass=pg['numPassedTests'],
              shared_database_changes=0, new_commercial_migrations=0, git_publication=0,
              human_approval='PENDING_NOT_SIMULATED')
(OUT / 'final-audit.json').write_text(json.dumps(result, indent=2) + '\n')
paths = [ROOT / 'docs/governance/amendments/COMMERCIAL_PACK_FAMILY_20261013/DRAFT_CANONICAL_AMENDMENT.md',
         ROOT / 'docs/phase6a/STEP_6A3/STEP_6A3_INTEGRAL_CLOSURE_REPORT_20261013.md',
         ROOT / 'docs/governance/MASTER_EXECUTION_STATUS.md',
         ROOT / 'packages/contracts/src/mi7a-frontend-projections.test.ts',
         ROOT / 'apps/backend/src/security/platform-subscription.postgres.test.ts']
paths += sorted(p for p in OUT.rglob('*') if p.is_file() and p.name not in ['manifest-review.json', 'SHA256SUMS.txt'])
manifest = dict(status='DRAFT_REVIEW_PACKAGE_NOT_APPROVED', master_regent='TCDX_GRC_MASTER_REGENT_BASELINE_v1.8_2026-10-09',
                required_authority='Rector45 section6, Rector46 sections3/5/6, Rector49 section3',
                contract=str(paths[0].relative_to(ROOT)), contract_sha256=sha(paths[0]),
                source_head=entry['head'], files=[dict(path=str(p.relative_to(ROOT)), sha256=sha(p)) for p in paths])
(OUT / 'manifest-review.json').write_text(json.dumps(manifest, indent=2) + '\n')
paths.append(OUT / 'manifest-review.json')
(OUT / 'SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.relative_to(ROOT)}\n' for p in paths))
print(json.dumps(dict(contract_sha256=manifest['contract_sha256'], artifacts=len(paths), final_audit=result), indent=2))
