"""Read-only verification of inherited evidence and exact R5 decision content.

Run from the repository root. Product tests and external operations are not run.
"""
from pathlib import Path
import json, hashlib, zipfile, xml.etree.ElementTree as ET

ROOT = Path.cwd()
B = ROOT / 'docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009'
E = B / 'evidence/continuity-r5'
def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):
    return json.loads(p.read_text())

sealed = []
for line in (B / 'R4_SHA256SUMS.txt').read_text().splitlines():
    reported, name = line.split('  ', 1)
    assert sha(B / name) == reported, name
    sealed.append(name)
assert len(sealed) == 34

runner = read(B / 'evidence/product-r3/r3-runner-source-hashes.json')
diffs = []
for name, reported in runner.items():
    actual = sha(ROOT / name)
    if actual != reported:
        diffs.append(dict(path=name, reported_sha256=reported, actual_sha256=actual))
expected_diffs = {x['path'] for x in read(B / 'evidence/continuity-r4/runner-source-comparison.json') if x['status'] == 'DIFF'}
assert len(runner) == 863 and {x['path'] for x in diffs} == expected_diffs
assert not any(x['path'].startswith(('apps/', 'packages/', 'database/', 'scripts/')) for x in diffs)

report = read(B / 'evidence/product-r3/r3-full-tests.json')
assert report['numTotalTests'] == report['numPassedTests'] == 850
assert report['numFailedTests'] == report['numPendingTests'] == report['numTodoTests'] == 0
assert report['success']
files = report['testResults']
pg = [x for x in files if '.postgres.test.' in x['name']]
cases = lambda rows: sum(len(x['assertionResults']) for x in rows)
assert len(files) == 85 and len(pg) == 18 and cases(pg) == 113 and cases(files) - cases(pg) == 737
assert all(a['status'] == 'passed' for f in files for a in f['assertionResults'])
native_subset = [x for x in pg if not any(s in x['name'] for s in ('effective-read.postgres.', 'reference-reads.postgres.', 'rbac-resolution-r3.postgres.'))]
assert len(native_subset) == 15 and cases(native_subset) == 82

sources = read(E / 'source-registry.json')
assert len(sources) == 14
assert all(sha(ROOT / x['path']) == x['sha256'] for x in sources)
iana = (E / 'iana-exact-r4.txt').read_text()
r4_literal = next(l[2:] for l in (B / 'R4_DECISIONS_REQUIRED.md').read_text().splitlines() if l.startswith('> Apruebo para STEP 6A.3')) + '\n'
assert iana == r4_literal
with zipfile.ZipFile(B / 'R5_MACRO_DECISIONS.docx') as z:
    xml = ET.fromstring(z.read('word/document.xml'))
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
paragraphs = [''.join(p.itertext()) for p in xml.findall('.//w:p', ns)]
# itertext includes only actual textual nodes in this generated document.
assert iana.strip() in paragraphs
word_text = '\n'.join(paragraphs)
for s in sources:
    assert s['path'] in word_text and s['sha256'] in word_text
rows = read(E / '12-disposition.json')
assert len(rows) == len({x['clause_id'] for x in rows}) == 12
ledger = read(ROOT / 'docs/phase6a/STEP_6A3/SOLO_OWNER_GOVERNANCE_PROPOSAL_20261009_V2/07_RESULT.json')
current = ledger[ledger['CURRENT_EXECUTION_REPORT']]
pending = [x for x in current['clauses_48'] if x['status'] != 'DONE']
assert len(current['clauses_48']) == 48 and len(pending) == 12
assert {x['clause_id'] for x in rows} == {x['clause_id'] for x in pending}
for r in rows:
    assert r['literal_ledger_requirement'] in word_text
    old = next(x for x in pending if x['clause_id'] == r['clause_id'])
    for key in old:
        assert old[key] == r[key], (r['clause_id'], key)
    assert r['literal_ledger_requirement'] in (B / 'R5_12_CLAUSES_DISPOSITION.md').read_text()
assert sha(E / 'iana-exact-r4.txt') in word_text
for p in [B / 'R5_DECISIONS_REQUIRED.md', B / 'QA_PROMOTION_PACKAGE_R5.md', B / 'R5_12_CLAUSES_DISPOSITION.md', B / 'R5_RLS_VIABILITY.md']:
    assert 'grc.tecdx.net' not in p.read_text()
    assert not any(l.rstrip() != l for l in p.read_text().splitlines()), p
assert 'https://grc.tecdex.net/' in (B / 'QA_PROMOTION_PACKAGE_R5.md').read_text()
assert len(read(E / 'rls-critical-candidates.json')) == 24

print(json.dumps(dict(result='PASS', scope='READ_ONLY_EVIDENCE_NOT_PRODUCT_RERUN',
    r4_sealed_entries=len(sealed), runner_total=len(runner), runner_matches=len(runner)-len(diffs),
    runner_diffs=diffs, r3_total=850, r3_unit=737, r3_postgres=113,
    r3_previously_omitted_cases=82, r3_previously_omitted_files=15,
    source_hashes=14, exact_iana_sha256=sha(E / 'iana-exact-r4.txt'), literal_clauses=12,
    word_pages_visually_reviewed=8, word_sha256=sha(B / 'R5_MACRO_DECISIONS.docx'),
    product_runtime_changes=0, effective_contract_changes=0, QA='NOT_RUN', IAM='NOT_RUN'), ensure_ascii=False, indent=2))
