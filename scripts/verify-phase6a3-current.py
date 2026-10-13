#!/usr/bin/env python3
"""Consume the append-only STEP6A.3 ledger; never promote historical gates."""
import hashlib
import json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
ledger_path = 'docs/phase6a/STEP_6A3/SOLO_OWNER_GOVERNANCE_PROPOSAL_20261009_V2/07_RESULT.json'
ledger = json.loads((root / ledger_path).read_text())
key = ledger['CURRENT_EXECUTION_REPORT']
report = ledger[key]
if report['RECTOR_ACTIVE_VERSION'] != (root / 'docs/rector/BASELINE_ID').read_text().strip():
    raise SystemExit('STEP6A3 current ledger baseline mismatch')
if report['STEP_6A4'] != 'NOT_STARTED' or report['SOG_V2'] != 'DRAFT_NOT_EFFECTIVE':
    raise SystemExit('Unauthorized downstream promotion')
if key == 'macro_implementation_20261009':
    ids = [c['clause_id'] for c in report['clauses_48']]
    if len(ids) != 48 or len(set(ids)) != 48:
        raise SystemExit('STEP6A3 missing/duplicate traceability clauses')
    for macro in report['approvals']:
        path = root / macro['manifest_path']
        if hashlib.sha256(path.read_bytes()).hexdigest() != macro['manifest_sha256']:
            raise SystemExit('STEP6A3 signed macro bytes differ')
        receipt = json.loads((root / macro['receipt_path']).read_text())
        if receipt['manifest_sha256'] != macro['manifest_sha256'] or not receipt['status'].startswith('APPROVED_EXACT_MACRO_'):
            raise SystemExit('STEP6A3 approval receipt mismatch')
    if report['STEP_6A3'] == 'PASS' and any(c['status'] != 'DONE' for c in report['clauses_48']):
        raise SystemExit('STEP6A3 false closure with pending clauses')
    for gate in ['QA', 'IAM_REAL', 'E2E_EXTERNAL']:
        if report['gates'][gate] == 'PASS' and not report.get('external_execution_evidence'):
            raise SystemExit('STEP6A3 external gate lacks actual execution evidence')
    print('STEP6A3_QA=' + report['gates']['QA'])
    print('STEP6A3_IAM_REAL=' + report['gates']['IAM_REAL'])
    print('STEP6A3_E2E_EXTERNAL=' + report['gates']['E2E_EXTERNAL'])
print('STEP6A3_EXECUTION_STATUS_SOURCE=' + ledger_path + '#' + key)
print('STEP6A3_ACTIVE_BASELINE=' + report['RECTOR_ACTIVE_VERSION'])
print('STEP6A3_CURRENT_GATE=' + report['RECTOR_GATE'])
print('STEP6A3_CURRENT_STATUS=' + report['STEP_6A3'])
print('STEP6A3_CURRENT_LEDGER=PASS')
