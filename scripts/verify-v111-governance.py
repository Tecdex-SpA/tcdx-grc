#!/usr/bin/env python3
"""Verify exact human-approved initial-source publication, preserving v1.10."""
import datetime
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OLD='TCDX_GRC_MASTER_REGENT_BASELINE_v1.10_2026-10-15'
NEW='TCDX_GRC_MASTER_REGENT_BASELINE_v1.11_2026-10-15'
HASH='4599f6e522ed91952ab01296a4c0b9cbe4df8ad4c1a612afd7fd0414215f824b'
REVIEW='f4db8b38ac4fb18abb0978f9654a83def7b4ee024bafff560a8dbf6e9b7f9247'
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def inventory(d):
 entries={}
 for line in (d/'SHA256SUMS.txt').read_text().splitlines():
  h,n=line.split('  ',1); n=n.removeprefix('./'); assert '/' not in n and n not in entries
  assert not (d/n).is_symlink() and digest(d/n)==h,n
  entries[n]=h
 assert set(entries)|{'SHA256SUMS.txt'}=={p.name for p in d.iterdir()}
 return entries
b=ROOT/'docs/rector'; active=b/'baseline'; candidate=b/'candidates'/NEW
assert digest(active/'SHA256SUMS.txt')==HASH
assert (b/'RECTOR_MANIFEST.sha256').read_bytes()==(active/'SHA256SUMS.txt').read_bytes()
assert inventory(active)==inventory(candidate) and len(inventory(active))==51
history=b/'history'/OLD
assert digest(history/'SHA256SUMS.txt')=='b9b6bf6930931af5eb32ca1b4027212ad3a82f247fef677b919af24d30ac9060'
assert inventory(history)==inventory(b/'candidates'/OLD)
v19=b/'history/TCDX_GRC_MASTER_REGENT_BASELINE_v1.9_2026-10-14'
assert digest(v19/'SHA256SUMS.txt')=='8466d47faaf34a6be6884ca8edf264f772c98c3b80b73d7b7b999fc4cf4b37d5'
assert len(inventory(v19))==51
assert (b/'BASELINE_ID').read_text().strip()==NEW and (b/'BASELINE_STATUS').read_text().strip()=='ACTIVE'
a=json.loads((b/'ACTIVE_ACTIVATION.json').read_text())
assert a['baseline_id']==NEW and a['predecessor']==OLD and a['manifest_sha256']==HASH
assert a['approved_candidate_manifest_sha256']==HASH and a['sog_v2']=='DRAFT_NOT_EFFECTIVE'
assert datetime.datetime.fromisoformat(a['effective_at'])<=datetime.datetime.now(datetime.timezone.utc)
assert digest(ROOT/a['authorization_path'])==a['authorization_sha256']
r=json.loads((ROOT/a['authorization_path']).read_text())
assert r['decision']=='APPROVED_FINAL_EXACT_BYTES' and r['final_question_manifest_sha256']==REVIEW
assert r['qa_acceptance']=='NOT_PERFORMED'
assert digest(ROOT/a['review_manifest_path'])==REVIEW
review=json.loads((ROOT/a['review_manifest_path']).read_text())
for f in review['files']+review['supplemental_reviews']+[review['diff']]: assert digest(ROOT/f['path'])==f['sha256'],f['path']
publication=json.loads((ROOT/'docs/executable-contracts/amendments/STEP_6A3_INITIAL_SOURCE_v1.11/CONTRACT_PUBLICATION_RECEIPT.json').read_text())
assert publication['status']=='PUBLISHED_LOCAL_EFFECTIVE' and publication['approved_review_manifest_sha256']==REVIEW
scope_path=ROOT/'docs/executable-contracts/amendments/STEP_6A3_INITIAL_SOURCE_SUBMIT_SCOPE_v1.11/CONTRACT_PUBLICATION_RECEIPT.json'
scope=json.loads(scope_path.read_text())
assert scope['status']=='PUBLISHED_LOCAL_EFFECTIVE'
assert digest(ROOT/scope['approval_path'])==scope['approval_sha256']
assert digest(ROOT/scope['review_manifest_path'])==scope['review_manifest_sha256']=='df66515d794942c6f18e8a61fb3d398fb679c7b2111ea225571a77e605b8f19b'
scope_review=json.loads((ROOT/scope['review_manifest_path']).read_text())
for f in scope_review['files']: assert digest(ROOT/f['path'])==f['sha256']
current={f['path']:f for f in scope['files']}
for f in publication['files']:
 if f['path'] in current:
  assert current[f['path']]['predecessor_sha256']==f['sha256']
  assert digest(scope_path.parent/'predecessor-snapshots'/Path(f['path']).name)==f['sha256']
 else: assert digest(ROOT/f['path'])==f['sha256'],f['path']
for f in scope['files']: assert digest(ROOT/f['path'])==f['sha256']
for path in ['AGENTS.md','docs/governance/CODEX_RECTOR_ENFORCEMENT.md']:
 assert NEW in (ROOT/path).read_text()
assert f'`MASTER_REGENT={NEW}`' in (ROOT/'docs/governance/MASTER_EXECUTION_STATUS.md').read_text().splitlines()[:5]
assert digest(ROOT/'database/migrations/20261015000100_c04w_applicability_hold_r2.sql')=='b2a5bc73f75d7f95fb7ba5068f1b3ea77a923d7da7501446d05455ee545ec523'
assert digest(ROOT/'docs/executable-contracts/27_PHASE5_METHODOLOGY_BINDING.md')=='eedf85debfb5eb48e25d4abdd5ff4332c5dba8197ab7b96a66b97f640cfef4df'
print('V111_RECTOR_AND_EXECUTABLE_PUBLICATION=PASS')
print('PROTECTED_V1_10_INTEGRITY=PASS')
print('PROTECTED_V1_9_INTEGRITY=PASS')
print('EXACT_HUMAN_AUTHORITY_DECISION=PASS')
print('R2_AND_HISTORICAL_27_UNCHANGED=PASS')
