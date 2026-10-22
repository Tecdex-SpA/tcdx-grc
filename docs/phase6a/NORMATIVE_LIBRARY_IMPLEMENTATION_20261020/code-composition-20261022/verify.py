#!/usr/bin/env python3
"""Read-only successor verifier. No network, SQL, Git mutation or rewriting evidence."""
import hashlib
import json
from pathlib import Path
import subprocess
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
PREFIX=str(HERE.relative_to(ROOT))+'/'
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def git(*args):return subprocess.check_output(['git','-C',str(ROOT),*args]).decode()
def main():
 initial=json.loads((HERE/'INITIAL_STATE.json').read_text())
 manifest=json.loads((HERE/'FILE_MANIFEST.json').read_text())
 final=json.loads((HERE/'FINAL_INTEGRITY.json').read_text())
 assert sha(HERE/'FILE_MANIFEST.json')==final['manifest_sha256']
 allowed={row['path'] for row in manifest['modified']}
 assert allowed=={'apps/backend/src/server.ts','apps/frontend/src/core-grc.tsx','apps/frontend/src/normative-library.tsx'}
 for path,digest in initial['files'].items():
  if path not in allowed:assert sha(ROOT/path)==digest,path
 for row in manifest['modified']:
  assert initial['files'][row['path']]==row['before_sha256']
  assert sha(ROOT/row['path'])==row['sha256'],row['path']
 for row in manifest['created']:assert sha(ROOT/row['path'])==row['sha256'],row['path']
 current={p for p in git('ls-files','--cached','--others','--exclude-standard','-z').split('\0') if p}
 current|={str(p.relative_to(ROOT)) for p in HERE.rglob('*') if p.is_file()}
 created=current-set(initial['files'])
 expected={row['path'] for row in manifest['created']}|{PREFIX+'FILE_MANIFEST.json',PREFIX+'FINAL_INTEGRITY.json'}
 assert created==expected,{'unexpected':sorted(created-expected),'missing':sorted(expected-created)}
 assert git('branch','--show-current')==initial['git']['branch']
 assert git('rev-parse','HEAD')==initial['git']['head']
 assert git('diff','--cached','--binary')==initial['git']['index']==''
 migrations=json.loads((ROOT/'database/migrations/manifest.json').read_text())['migrations']
 assert len(migrations)==35
 for migration in migrations:assert sha(ROOT/'database/migrations'/migration['filename'])==migration['sha256']
 assert migrations[-1]['sha256']=='9279159e88c60fff03f998e33008fb0d675f53e4423df638c9e54f709a773798'
 assert sha(ROOT/'scripts/foundations/generate-contract-assets.mjs')==initial['files']['scripts/foundations/generate-contract-assets.mjs']
 checks=json.loads((HERE/'CHECKS.json').read_text());assert all(c['exit_code']==0 for c in checks)
 assert (HERE/'contract-gate.log').read_bytes()==(HERE/'generator-repeat.log').read_bytes()
 browser=json.loads((HERE/'browser-results.json').read_text());assert browser['stats']['unexpected']==0 and browser['stats']['expected']==8
 result=json.loads((HERE/'RESULT.json').read_text());assert result['FILES_CREATED']==len(created) and result['FILES_MODIFIED']==len(allowed)
 return {'integrity':'PASS','migrations':'35_HASH_MATCH','unrelated_preexisting_files':'PRESERVED','branch_head_index':'PRESERVED','checks':'PASS_LOCAL','browser':'8_PASS_ISOLATED','scope':result['IMPLEMENTATION_SCOPE_RESULT'],'rector_gate':result['RECTOR_GATE'],'qa_contacted':'NO','created':len(created),'modified':len(allowed)}
if __name__=='__main__':print(json.dumps(main(),indent=2))
