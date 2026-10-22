#!/usr/bin/env python3
"""Local final continuity/integrity verification. No SQL, network or writes."""
import json,hashlib,subprocess
from pathlib import Path
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):return json.loads(p.read_text())
def git(*a):return subprocess.check_output(['git',*a],cwd=ROOT).decode().strip()
def main():
 entry=read(BASE/'ENTRY.json');authorized=read(BASE/'AUTHORIZED_CANONICAL_DELTAS.json');changes={r['path']:r for r in authorized['changes']}
 assert set(changes)=={'database/expected-schema.json','database/migrations/manifest.json','scripts/foundations/verify-schema.ts','scripts/foundations/db.ts'}
 assert len(entry['files'])==5286
 for path,before in entry['files'].items():
  actual=sha(ROOT/path)
  if path in changes:
   row=changes[path];assert before==row['before_sha256'] and actual==row['after_sha256'],path
   original=subprocess.check_output(['git','show',entry['head']+':'+path],cwd=ROOT);assert hashlib.sha256(original).hexdigest()==before,path
  else:assert actual==before,path
 assert git('branch','--show-current')==entry['branch'] and git('rev-parse','HEAD')==entry['head']
 assert git('diff','--cached','--binary')==entry['index']==''
 manifest=read(ROOT/'database/migrations/manifest.json');previous=json.loads(subprocess.check_output(['git','show',entry['head']+':database/migrations/manifest.json'],cwd=ROOT))
 assert manifest['migrations'][:34]==previous['migrations'] and len(manifest['migrations'])==35
 for row in manifest['migrations']:assert sha(ROOT/'database/migrations'/row['filename'])==row['sha256']
 inventory=read(ROOT/'database/expected-schema.json');assert inventory['tableCount']==len(inventory['tables'])==244
 amendment=inventory['normativeLibraryAmendment'];receipt=read(ROOT/amendment['publicationReceipt']['path']);assert sha(ROOT/amendment['publicationReceipt']['path'])==amendment['publicationReceipt']['sha256'];assert receipt['PV_H04_01']=='CONTRACT_PUBLISHED_VERIFIED'
 raw=(ROOT/amendment['migration']['path']).read_bytes();assert hashlib.sha256(raw).hexdigest()==amendment['migration']['sha256']
 for src in amendment['sources']:
  content=(ROOT/src['path']).read_bytes();assert hashlib.sha256(content).hexdigest()==src['sha256'];assert raw[src['offset']:src['offset']+src['length']]==content
 assert len(amendment['physicalAssertions']['functions'])==8 and len(amendment['physicalAssertions']['triggers'])==12
 suite=read(BASE/'SYNTHETIC_STABILIZED.json');assert suite['exit_code']==0 and suite['result']['status']=='PASS_ISOLATED_CANONICAL_CHAIN_ONLY'
 assert len(suite['result']['tests'])==17 and all(t['status']=='PASS' for t in suite['result']['tests']) and suite['cleanup']['absent']
 for name in ['NORMALIZER_TESTS.json','TYPECHECK_FINAL.json','RECTOR_GATE.json']:assert read(BASE/name)['exit_code']==0
 proof=read(BASE/'CONSTRAINT_EQUIVALENCE.json');assert proof['constraints']==180 and all(x['normalized_AST_equal'] and x['changed_literal_rejected'] for x in proof['assertions'])
 recovery=read(BASE/'FINAL_RECOVERY_RECEIPT.json');assert recovery['status']=='PASS_LOGICAL_SNAPSHOT_RECOVERY_ONLY' and recovery['file_encryption']=='NONE_EXPLICIT_PO_DIRECTION'
 physical=read(BASE/'BACKUP_RESTORE_RECONCILED.json');assert physical['restore_exit_code']==0 and physical['cleanup']['container_absent'] and physical['tables_compared']==243 and physical['ledger_rows']==34
 for k,v in physical['comparisons'].items():
  if k!='constraints':assert v,k
 assert len(physical['constraint_diagnostic']['differences'])==180
 for item in recovery['evidence']:assert sha(ROOT/item['path'])==item['sha256']
 assert len(read(BASE/'ARCHITECTURE_RECONCILIATION.json')['objects'])==112
 result=read(BASE/'RESULT.json');assert result['QA_PHYSICAL_ADOPTION']=='NOT_EXECUTED' and result['QA_MIGRATION_HISTORY_WRITES']=='NONE'
 delta=read(BASE/'DELTAS.json');assert delta['files_modified_this_run']==4
 created={r['path'] for r in delta['files'] if r['change']=='CREATED'}|set(delta['seal_exclusions'])
 own={str(p.relative_to(ROOT)) for p in BASE.rglob('*') if p.is_file()}|{'scripts/foundations/schema-definition.ts',amendment['migration']['path']}
 assert own==created and len(created)==delta['files_created_this_run']
 visible=set(subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=ROOT).decode().split('\0'))-{''}
 assert visible-set(entry['files'])==created
 for item in delta['files']:assert sha(ROOT/item['path'])==item['sha256'],item['path']
 hashed=set()
 for line in (BASE/'SHA256SUMS.txt').read_text().splitlines():
  h,path=line.split('  ',1);assert sha(ROOT/path)==h,path;hashed.add(path)
 assert hashed == ((created | set(changes)) - set(delta['manifest_exclusions']))
 final=read(BASE/'FINAL_INTEGRITY.json');assert sha(BASE/'SHA256SUMS.txt')==final['manifest_sha256']
 return {'status':'PASS_LOCAL_CONTINUITY_AND_CANONICAL_INTEGRITY','received_files':5286,'received_unchanged':5282,'authorized_modified':4,'original_preimages':'EXACT_HEAD_BYTES_VERIFIED','historical_migrations':'34_OF_34_IMMUTABLE','created':len(created),'canonical_migrations':35,'isolated_gates':'17_PASS','normalizer_tests':'3_PASS','G4':'PASS_DATABASE_SNAPSHOT_ONLY_NO_FILE_CIPHER','backup_reference':recovery['reference'],'QA_DDL_DML_HISTORY_WRITES':'NONE','index':'EMPTY_PRESERVED','adoption':'NOT_EXECUTED'}
if __name__=='__main__':print(json.dumps(main(),indent=2))
