#!/usr/bin/env python3
"""Local, read-only successor verifier. No SQL, network, builds, activation or Git mutation."""
import hashlib,json,subprocess
from pathlib import Path
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
PREFIX=str(HERE.relative_to(ROOT))+'/'
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def git(*args):return subprocess.check_output(['git','-C',str(ROOT),*args]).decode()
def main():
 initial=json.loads((HERE/'INITIAL_STATE.json').read_text());manifest=json.loads((HERE/'FILE_MANIFEST.json').read_text());seal=json.loads((HERE/'FINAL_INTEGRITY.json').read_text());result=json.loads((HERE/'RESULT.json').read_text())
 assert sha(HERE/'FILE_MANIFEST.json')==seal['manifest_sha256']
 allowed={r['path'] for r in manifest['modified']}
 for path,digest in initial['received_hashes'].items():
  if path not in allowed:assert sha(ROOT/path)==digest,path
 for row in manifest['modified']:
  assert initial['received_hashes'][row['path']]==row['before_sha256']
  assert sha(ROOT/row['path'])==row['sha256'],row['path']
  assert sha(HERE/'preimages'/row['path'])==row['before_sha256'],row['path']
 for row in manifest['created']:assert sha(ROOT/row['path'])==row['sha256'],row['path']
 current={p for p in git('ls-files','--cached','--others','--exclude-standard','-z').split('\0') if p}
 current|={str(p.relative_to(ROOT)) for p in HERE.rglob('*') if p.is_file()}
 created=current-set(initial['received_hashes'])
 expected={r['path'] for r in manifest['created']}|{PREFIX+'FILE_MANIFEST.json',PREFIX+'FINAL_INTEGRITY.json'}
 assert created==expected,{'unexpected':sorted(created-expected),'missing':sorted(expected-created)}
 for key,args in [('branch',('branch','--show-current')),('head',('rev-parse','HEAD')),('index',('diff','--cached','--binary'))]:assert git(*args)==initial['git'][key]
 assert initial['git']['index']==''
 migrations=json.loads((ROOT/'database/migrations/manifest.json').read_text())['migrations'];assert len(migrations)==35
 for m in migrations:assert sha(ROOT/'database/migrations'/m['filename'])==m['sha256']
 expected_sql={p for p in initial['received_hashes'] if p.startswith('database/migrations/') and p.endswith('.sql')}
 assert {str(p.relative_to(ROOT)) for p in (ROOT/'database/migrations').rglob('*.sql')}==expected_sql
 for protected in ['database/expected-schema.json','database/migrations/manifest.json','scripts/foundations/generate-contract-assets.mjs']:
  assert sha(ROOT/protected)==initial['received_hashes'][protected]
 receipt=json.loads((HERE/'contracts/RECEIPT.json').read_text());assert receipt['status']=='PASS_CONTRACT_EFFECTIVE_LOCAL' and receipt['runtime_activation']=='NONE'
 for ref in receipt['files']:assert sha(ROOT/ref['path'])==ref['sha256']
 contract=json.loads((HERE/'contracts/CONTRACT.json').read_text())
 for ref in contract['predecessors']:assert sha(ROOT/ref['path'])==ref['sha256']
 assert contract['permissions_delta'].startswith('NONE') and contract['physical_delta']=='NONE'
 assets=json.loads((ROOT/'packages/contracts/src/normative-library.generated.json').read_text());assert len(assets['registry']['new_operations'])==31
 matches=[o for o in assets['registry']['new_operations'] if o['operation_id']==contract['operation']['operation_id']];assert matches==[contract['operation']]
 assert not any(b['operation_id']==contract['operation']['operation_id'] for b in assets['lifecycle']['bindings'])
 assert all(c['exit_code']==0 for c in json.loads((HERE/'CHECKS.json').read_text()))
 assert (HERE/'canonical-assets.log').read_bytes()==(HERE/'canonical-repeat.log').read_bytes()
 browser=json.loads((HERE/'browser-results.json').read_text());assert browser['stats']['expected']==10 and browser['stats']['unexpected']==0
 for path,digest in json.loads((HERE/'BUILD_ARTIFACTS.json').read_text())['files'].items():assert sha(ROOT/path)==digest,path
 assert result['CODE_B04_01']=='PASS' and result['RECTOR_GATE']=='PASS' and result['QA_CONTACTED']=='NO'
 assert result['FILES_CREATED']==len(created) and result['FILES_MODIFIED']==len(allowed)
 return {'integrity':'PASS','code_b04_01':'PASS_LOCAL_CODE_AND_ISOLATED_TESTS','migrations':'35_UNCHANGED','canonical_generator':'UNCHANGED','contract_and_assets':'HASH_MATCH','unrelated_received_files':'PRESERVED','branch_head_index':'PRESERVED','browser':'10_PASS_ISOLATED_SQL_EXECUTOR','qa_contacted':'NO','files_created':len(created),'files_modified':len(allowed)}
if __name__=='__main__':print(json.dumps(main(),indent=2))
