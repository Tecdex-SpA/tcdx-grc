#!/usr/bin/env python3
"""Read-only integrity, preservation and contract checks for the PO successor bundle."""
import argparse
import copy
import difflib
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[4]
REL = Path('docs/governance/amendments/PO_COMMERCIAL_SIMPLIFICATION_20261016')
BASE = Path('docs/rector/candidates/TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16')
EXE = Path('docs/executable-contracts/candidates/PO_COMMERCIAL_SIMPLIFICATION_v1.12')
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def load(path): return json.loads(path.read_text())
def require(condition, message):
    if not condition: raise ValueError(message)
def manifest(root):
    package = root / REL
    file = package / 'REVIEW_MANIFEST.json'
    require(sha(file) == (package/'REVIEW_MANIFEST.sha256').read_text().split()[0], 'manifest seal mismatch')
    data = load(file)
    require(data['status'] == 'DRAFT_NOT_EFFECTIVE', 'candidate must remain inactive')
    actual = set()
    for relative in [REL, BASE, EXE]:
        for p in (root/relative).rglob('*'):
            require(not p.is_symlink(), 'symlink inside candidate bundle')
            if p.is_file() and p.name not in {'REVIEW_MANIFEST.json','REVIEW_MANIFEST.sha256'}:
                actual.add(p.relative_to(root).as_posix())
    declared = set()
    for row in data['files']:
        relative = Path(row['path'])
        require(not relative.is_absolute() and '..' not in relative.parts, 'unsafe manifest path')
        require(any(relative.is_relative_to(r) for r in [REL, BASE, EXE]), 'path outside bundle')
        require(row['path'] not in declared, 'duplicate manifest path')
        declared.add(row['path'])
        p = root/relative
        require(p.is_file() and not p.is_symlink(), 'missing manifested artifact')
        require(p.stat().st_size == row['size'] and sha(p) == row['sha256'], 'artifact mismatch: '+row['path'])
    require(actual == declared, 'manifest inventory differs from complete bundle')
    return data
def verify_baseline(root):
    directory = root/BASE
    rows = {}
    for line in (directory/'SHA256SUMS.txt').read_text().splitlines():
        digest, name = line.split('  ', 1)
        require('/' not in name and name not in rows, 'unsafe/duplicate baseline filename')
        require(sha(directory/name) == digest, 'baseline document mismatch')
        rows[name] = digest
    require(len(rows) == 51, 'baseline must contain51 documents')
    require(set(rows)|{'SHA256SUMS.txt'} == {p.name for p in directory.iterdir()}, 'baseline inventory differs')
    return rows
def preserve(root):
    state = load(root/REL/'PROTECTED_STATE.json')
    for row in state['files']:
        p = root/row['path']
        require(p.is_file() and sha(p) == row['sha256'], 'preexisting file changed: '+row['path'])
        require(p.stat().st_mode & 0o777 == row['mode'], 'preexisting mode changed')
    for row in state['untracked']:
        p = root/row['path']
        if row['symlink_target'] is not None:
            require(p.is_symlink() and os.readlink(p) == row['symlink_target'], 'dependency link changed')
        else: require(p.is_file() and sha(p) == row['sha256'], 'preexisting untracked file changed')
    def git(*args): return subprocess.check_output(['git',*args],cwd=root)
    require(git('rev-parse','HEAD').decode().strip() == state['head'], 'HEAD changed')
    require(git('branch','--show-current').decode().strip() == state['branch'], 'branch changed')
    require(hashlib.sha256(git('ls-files','--stage','-z')).hexdigest() == state['index_sha256'], 'index contents changed')
    require(not git('diff','--name-only'), 'tracked modifications appeared')
    roots = [REL, BASE, EXE]
    initial = {r['path'] for r in state['untracked']}
    new = {p.decode() for p in git('ls-files','--others','--exclude-standard','-z').split(b'\0') if p}
    require(all(p in initial or any(Path(p).is_relative_to(r) for r in roots) for p in new), 'new file outside authorized roots')
    return len(state['files'])
def section(text, start, end): return text.split(start,1)[1].split(end,1)[0]
def semantic_checks(root):
    active = root/'docs/rector/baseline'
    proposed = root/BASE
    get = lambda d,n: next(d.glob(n+'_*'))
    for n in ['07','08','17','19','26','30','33','34','35','38','39']:
        require(get(active,n).read_bytes() == get(proposed,n).read_bytes(), 'canonical/methodology/NFR file changed: '+n)
    old = get(active,'23').read_text(); new = get(proposed,'23').read_text()
    for a,b in [('## 6. Retención baseline de producto','## 7. Borrado'),('## 8. Resolución de RetentionPolicy','## 9. Temporalidad')]:
        require(section(old,a,b) == section(new,a,b), 'category floors/precedence changed')
    require(section(get(active,'22').read_text(),'## 6. SoD obligatoria','## 7. Machine identities') ==
            section(get(proposed,'22').read_text(),'## 6. SoD obligatoria','## 7. Machine identities'), 'operational SoD changed')
    proposal = load(root/EXE/'RETENTION_PROPOSAL.json')
    require(proposal['default_option_months'] == 12 and proposal['option_months'] == [12,18,24,36,48,60], 'commercial proposal differs')
    require(proposal['preserve_category_floors'] and not proposal['persisted_default_created'] and
            not proposal['purge_authorized_by_this_package'], 'unsafe retention proposal')
    cases = load(root/EXE/'TEST_SCENARIOS.json')['cases']
    require(len(cases) == 18 and all(x['execution'] == 'NOT_RUN' for x in cases), 'future scenarios presented as executed')
    for n in ['43','45','46','47','49']:
        text=get(proposed,n).read_text()
        require(any(mark in text for mark in ['DR003', 'DR-GRC-20261016-003',
            'DR-GRC-20261016-001/002/003']), 'missing DR003 governance binding')
        require('segunda' in text and ('alcance' in text), 'governance scope missing')
    report=(proposed/'PRE_IMPLEMENTATION_GATE_REPORT.md').read_text()
    require(all(f'| G{i} ' in report for i in range(1,16)), 'G1-G15 matrix incomplete')
    mapping=(root/REL/'STEP_6A3_ACCEPTANCE_DELTA.md').read_text()
    require(all(f'| H{i:02d} ' in mapping for i in range(1,11)), 'H01-H10 mapping incomplete')
    source=load(root/REL/'SOURCE_VERIFICATION.json')
    require(source['source_commit']=='2373b5b63a49ddddb47e104947020e4ceb070f64' and
            source['parent_commit']=='0524d615dada258a87bd71d0b84f9babf7c2f9d1', 'decision source mismatch')
    doc=root/REL/'DECISION_RECORD.md';raw=doc.read_bytes()
    require(sha(doc)==source['decision_sha256']=='abc283701314ae7dc2c5fdb55f2349df6dc6543192bb05107c72d60aae1bc7f4', 'remote decision bytes changed')
    require(hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==source['decision_git_blob_sha1'], 'Git blob mismatch')
    dr3=load(root/REL/'DR003_SOURCE_RECEIPT.json')
    require(sha(root/dr3['transcription_path'])==dr3['transcription_sha256'] and
            dr3['second_conceptual_approval']=='NOT_REQUIRED' and dr3['independent_human_signatures_created']==0, 'DR003 receipt mismatch')
    diff=[]
    index=load(root/REL/'DIFFERENCE_INDEX.json')
    for pair in index['pairs']:
        a,b=root/pair['active'],root/pair['candidate']
        diff.extend(difflib.unified_diff(a.read_text().splitlines(True),b.read_text().splitlines(True),fromfile=pair['active'],tofile=pair['candidate']))
    f=root/index['new_normative_contract']
    diff.extend(difflib.unified_diff([],f.read_text().splitlines(True),fromfile='/dev/null',tofile=index['new_normative_contract']))
    require((root/REL/'DIFFERENCES.patch').read_text()==''.join(diff).rstrip()+'\n', 'difference report not reproducible')
    return len(cases)
def negative_tests(root):
    rejected=[]
    with tempfile.TemporaryDirectory(prefix='grc-po-candidate-negative-') as td:
        scratch=Path(td)
        for relative in [REL,BASE,EXE]:
            shutil.copytree(root/relative,scratch/relative)
        manifest(scratch)
        victim=next((scratch/BASE).glob('23_*')); original=victim.read_bytes()
        victim.write_bytes(original+b'changed\n')
        try: manifest(scratch)
        except ValueError: rejected.append('changed-artifact')
        else: raise ValueError('tamper control did not fail')
        victim.write_bytes(original)
        extra=scratch/BASE/'UNMANIFESTED.txt';extra.write_text('extra')
        try: manifest(scratch)
        except ValueError: rejected.append('unmanifested-extra')
        else: raise ValueError('inventory control did not fail')
        extra.unlink()
        victim=next((scratch/BASE).glob('47_*'));original=victim.read_bytes();victim.unlink()
        try: manifest(scratch)
        except ValueError: rejected.append('missing-artifact')
        else: raise ValueError('missing-file control did not fail')
        victim.write_bytes(original)
        mf=scratch/REL/'REVIEW_MANIFEST.json';seal=scratch/REL/'REVIEW_MANIFEST.sha256'
        original_mf=mf.read_bytes();original_seal=seal.read_bytes()
        data=load(mf);data['files'][0]['path']='../outside-bundle'
        mf.write_text(json.dumps(data));seal.write_text(sha(mf)+'  REVIEW_MANIFEST.json\n')
        try: manifest(scratch)
        except ValueError: rejected.append('unsafe-manifest-path')
        else: raise ValueError('path control did not fail')
        mf.write_bytes(original_mf);seal.write_bytes(original_seal)
        sums=scratch/BASE/'SHA256SUMS.txt';original=sums.read_bytes()
        sums.write_text('\n'.join(sums.read_text().splitlines()[:-1])+'\n')
        try: verify_baseline(scratch)
        except ValueError: rejected.append('incomplete-baseline-inventory')
        else: raise ValueError('baseline inventory control did not fail')
        sums.write_bytes(original)
    return rejected
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--self-test',action='store_true');args=parser.parse_args()
    manifest(ROOT);verify_baseline(ROOT)
    files=preserve(ROOT);cases=semantic_checks(ROOT)
    contract=json.loads(subprocess.check_output(['node',str(ROOT/REL/'verify_openapi.mjs')],cwd=ROOT))
    result={'result':'PASS','scope':'DOCUMENTARY_CANDIDATE_ONLY','active_baseline':'v1.11 unchanged',
      'candidate':'v1.12 DRAFT_NOT_EFFECTIVE','decision_records':['DR001','DR002','DR003'],
      'protected_preexisting_files':files,'baseline_documents':51,'full_inventory_and_sha256':'PASS',
      'canonical_schema_migrations_backend_frontend_history':'UNCHANGED','operational_SoD_and_retention_floors':'UNCHANGED',
      'source_PR_commit_blob_and_DR003_receipt':'PASS','G1_G15_and_H01_H10_mapping':'COMPLETE',
      'difference_report':'REPRODUCIBLE','future_test_scenarios_NOT_RUN':cases,'openapi':contract,
      'negative_integrity_controls_rejected':negative_tests(ROOT) if args.self_test else 'NOT_REQUESTED',
      'activation_commit_push_merge_deploy_DB_runtime_acceptance':'NOT_EXECUTED'}
    print(json.dumps(result,indent=2,ensure_ascii=False))
if __name__=='__main__':main()
