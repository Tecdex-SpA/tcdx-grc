"""Read-only local contractual publication verification. No DB, network or Git writes."""
import csv
import hashlib
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path.cwd()
DOSSIER = pathlib.Path('docs/phase6a/NORMATIVE_LIBRARY_CONTRACT_PUBLICATION_20261020')
GOVERNANCE = pathlib.Path('docs/governance/amendments/NORMATIVE_LIBRARY_20261020')
EXECUTABLE = pathlib.Path('docs/executable-contracts/amendments/NORMATIVE_LIBRARY_20261020')
PHYSICAL = pathlib.Path('docs/physical-data-model/amendments/NORMATIVE_LIBRARY_20261020')
BASELINE = 'TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16'


def read(path):
    return json.loads((ROOT / path).read_text())


def digest(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def verify_reference(ref):
    path = pathlib.Path(ref['path'])
    require(not path.is_absolute() and '..' not in path.parts, 'Non-repository manifest path')
    require(digest(path) == ref['sha256'], 'Hash mismatch: ' + str(path))


def main():
    receipt_path = EXECUTABLE / 'CONTRACT_PUBLICATION_RECEIPT.json'
    manifest_path = EXECUTABLE / 'PUBLICATION_MANIFEST.json'
    receipt = read(receipt_path)
    manifest = read(manifest_path)
    require(receipt['status'] == 'PASS_CONTRACT_EFFECTIVE_LOCAL', 'Receipt not effective')
    require(receipt['baseline_id'] == BASELINE, 'Receipt baseline drift')
    require(receipt['human_signature_of_derived_bytes'] is False, 'Unsupported human byte signature')
    require(receipt['runtime_activation'] == 'NOT_EXECUTED', 'Runtime boundary drift')
    require(receipt['deltas'] == ['B%02d' % i for i in range(1, 10)], 'Delta coverage')
    verify_reference(receipt['publication_manifest'])
    verify_reference(receipt['review_manifest'])
    verify_reference(receipt['authorization'])
    for ref in manifest['files'] + manifest['dependencies']:
        verify_reference(ref)
    require(len({f['path'] for f in manifest['files']}) == len(manifest['files']), 'Duplicate manifest entry')
    actual = {str(f) for d in [DOSSIER, GOVERNANCE, EXECUTABLE, PHYSICAL]
              for f in d.rglob('*') if f.is_file()}
    excluded = set(manifest['seal_exclusions'])
    expected_exclusions = {str(manifest_path), str(receipt_path),
                           str(GOVERNANCE / 'CONTRACT_ACTIVATION.json'),
                           str(DOSSIER / 'evidence/publication-verification-final.json')}
    require(excluded == expected_exclusions, 'Unexpected unsealed exclusions')
    require(actual - excluded == {f['path'] for f in manifest['files']}, 'Missing/extra final files')
    require(actual <= {f['path'] for f in manifest['files']} | excluded, 'Unlisted file')
    review = read(GOVERNANCE / 'REVIEW_MANIFEST.json')
    require(review['status'] == 'PASS_TECHNICAL_REVIEW_CONTRACT_ONLY', 'Review not passed')
    for ref in review['files'] + review['evidence']:
        verify_reference(ref)
    sealed = {f['path']: f['sha256'] for f in manifest['files']}
    for ref in review['files'] + review['evidence']:
        require(sealed.get(ref['path']) == ref['sha256'], 'Review bytes differ from publication')
    activation = read(GOVERNANCE / 'CONTRACT_ACTIVATION.json')
    verify_reference(activation['receipt'])
    verify_reference(activation['publication_manifest'])
    require(activation['scope'] == 'LOCAL_DOCUMENTARY_CONTRACTS_B01_B09_ONLY', 'Activation scope drift')
    require(activation['baseline_replaced'] is False, 'Baseline replacement forbidden')
    require(activation['operational_grants_activated'] is False, 'Grants activation forbidden')
    active = read('docs/rector/ACTIVE_ACTIVATION.json')
    require(active['baseline_id'] == BASELINE, 'Active baseline drift')
    entry = read(DOSSIER / 'evidence/ENTRY.json')
    changed = [p for p, h in entry['files'].items()
               if not (ROOT / p).is_file() or digest(p) != h]
    require(not changed, 'Preexisting files changed: ' + ', '.join(changed))
    branch = subprocess.check_output(['git', 'branch', '--show-current'], text=True).strip()
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
    index_hash = hashlib.sha256(subprocess.check_output(['git', 'diff', '--cached', '--binary'])).hexdigest()
    require((branch, head, index_hash) == (entry['branch'], entry['head'], entry['index_sha256']), 'Git state changed')
    checks = read(DOSSIER / 'evidence/contract-checks-final.json')
    require(checks['status'] == 'PASS' and len(checks['checks']) == 17, 'Final checks missing/failing')
    require(all(x['status'] == 'PASS' for x in checks['checks']), 'Failed contract check')
    for result in read(DOSSIER / 'evidence/FINAL_GATE_RUNS.json'):
        require(result['status'] == 'PASS' and result['exit_code'] == 0, 'Failed mandatory gate')
        verify_reference({'path': result['log'], 'sha256': result['sha256']})
    sql = read(DOSSIER / 'evidence/sql-pg16-parse-final.json')
    require(sql['status'] == 'PASS' and sql['postgresql_grammar'][0] == 16, 'Wrong SQL grammar')
    require(not sql['ddl_executed'] and sql['source_sha256'] == digest(sql['source']), 'SQL changed/executed')
    transfer = read(DOSSIER / 'evidence/RESUME_TRANSFER.json')
    require(transfer['status'] == 'PASS' and transfer['hashes_match'], 'Transfer not verified')
    pause = read(DOSSIER / 'evidence/PAUSE_FILES_SHA256.json')
    delta = read(DOSSIER / 'RESUME_FILE_DELTAS.json')
    for f in pause['files']:
        if f['path'] not in delta['transferred_modified']:
            verify_reference(f)
    require(sorted(delta['created_this_account']) == sorted(actual - set(delta['entry_transferred_files'])), 'Created inventory drift')
    for i in range(1, 16):
        require(len(list((ROOT / DOSSIER).glob('E%02d_*.md' % i))) == 1, 'E01-E15 missing/duplicate')
    with (ROOT / DOSSIER / 'TRACEABILITY.csv').open() as f:
        rows = list(csv.DictReader(f))
    require([row['binding'] for row in rows] == ['B%02d' % i for i in range(1, 12)], 'Traceability gap')
    for row in rows:
        for filename in row['contracts_in_executable_amendment'].split(';'):
            require((ROOT / EXECUTABLE / filename).is_file(), 'Missing traced contract: ' + filename)
    for d in [GOVERNANCE, EXECUTABLE, PHYSICAL]:
        for f in (ROOT / d).rglob('*'):
            if f.is_file():
                require(not re.search(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bAKIA[A-Z0-9]{16}\b', f.read_bytes()), 'Credential marker: ' + str(f.relative_to(ROOT)))
    result = read(DOSSIER / 'RESULT.json')
    require(result['B01_B09_CONTRACT_PUBLICATION'] == 'PASS_CONTRACT_EFFECTIVE_LOCAL', 'Final status drift')
    require(result['FILES_CREATED'] == len(delta['created_this_account']), 'File count drift')
    return {'status': 'PASS', 'scope': 'LOCAL_CONTRACTUAL_PUBLICATION_INTEGRITY_ONLY',
            'baseline': BASELINE, 'manifest_files_verified': len(manifest['files']),
            'dependency_files_verified': len(manifest['dependencies']), 'preexisting_files_checked': len(entry['files']),
            'preexisting_changed': changed, 'files_created_this_account': len(delta['created_this_account']),
            'transferred_files_modified': delta['transferred_modified'], 'branch': branch, 'head': head,
            'index_sha256': index_hash, 'receipt_sha256': digest(receipt_path),
            'publication_manifest_sha256': digest(manifest_path), 'runtime': 'NOT_TESTED',
            'migrations_imports_deployments_grants': 'NONE'}


if __name__ == '__main__':
    try:
        result = main()
    except Exception as exc:
        result = {'status': 'FAIL', 'error': str(exc)}
    if '--output' in sys.argv:
        target = sys.argv[sys.argv.index('--output') + 1]
        require(target == str(DOSSIER / 'evidence/publication-verification-final.json'), 'Unexpected output path')
        (ROOT / target).write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps(result, indent=2, ensure_ascii=False))
    sys.exit(0 if result['status'] == 'PASS' else 1)
