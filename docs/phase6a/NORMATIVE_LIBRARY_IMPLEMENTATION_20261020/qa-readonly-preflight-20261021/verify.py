#!/usr/bin/env python3
"""Local integrity verification only. No network, database or Docker calls."""
import hashlib
import json
from pathlib import Path
import subprocess
BASE=Path(__file__).resolve().parent
ROOT=BASE.parents[3]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):return json.loads(p.read_text())
def main():
    entry=read(BASE/'ENTRY.json')
    for p,h in entry['files'].items():assert sha(ROOT/p)==h,p
    assert len(entry['files'])==5225
    assert read(BASE/'AUTHORITY_GATE.json')['status']=='PASS'
    scope=read(BASE/'QUERY_SCOPE_GATE.json');assert scope['status']=='PASS'
    for item in scope['files']:
        assert sha(ROOT/item['path'])==item['sha256']
        assert set(item['statement_kinds'])<={'TransactionStmt','VariableShowStmt','SelectStmt'}
    batches=['CATALOG_INSPECTION_ATTEMPT_02','STRUCTURAL_AGGREGATES','BOUNDED_CARDINALITIES','BOUNDED_INTEGRITY_AGGREGATES','FK_ROOT_METADATA']
    for batch in batches:
        r=read(BASE/(batch+'.json'))
        assert r['exit_code']==0 and r['show_transaction_read_only']=='on'
        assert sha(BASE/(batch+'.sql'))==r['sql_sha256']
        identity=r['results'][0]
        assert identity['database']=='tcdx-grc' and identity['server_address']=='192.168.2.40'
        assert identity['server_port']==5432 and identity['user']=='postgres'
        assert identity['transaction_read_only']==identity['default_transaction_read_only']=='on'
        assert identity['statement_timeout']=='5s' and identity['lock_timeout']=='1s'
        assert identity['role_superuser'] is True
    evidence=read(BASE/'EVIDENCE.json')
    assert evidence['postgres_exception']['explicit_PO_authorization']=='utiliza postgres por ahora, es solo lectura'
    assert evidence['gates']['QA_TARGET']=='PASS' and evidence['gates']['READONLY_SESSION']=='PASS'
    assert read(BASE/'FK_PREREQUISITES.json')['status']=='PASS_METADATA_ONLY'
    diff=read(BASE/'SCHEMA_DIFF.json')
    assert diff['summary']=={'MATCH':376,'MISSING':111,'CONFLICT':1}
    assert not [r for r in diff['objects'] if r['state']=='CONFLICT' and not r.get('planned_removal')]
    assert not read(BASE/'BOUNDED_QUERY_COVERAGE.json')['skipped']
    for item in read(BASE/'BOUNDED_INTEGRITY_AGGREGATES.json')['results'][1:]:
        if item['category'] in ['new_eight_permissions_presence','schema_totals','migration_metadata']:continue
        assert all(value==0 for row in item['rows'] for value in row.values()),item['category']
    receipt=ROOT/'docs/executable-contracts/amendments/NORMATIVE_LIBRARY_H04_PV01_PUBLICATION_20261021/CONTRACT_PUBLICATION_RECEIPT.json'
    assert read(receipt)['PV_H04_01']=='CONTRACT_PUBLISHED_VERIFIED'
    for item in read(receipt)['effective_ddl_sequence']:assert sha(ROOT/item['path'])==item['sha256']
    def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT).decode().strip()
    assert git('branch','--show-current')==entry['branch']
    assert git('rev-parse','HEAD')==entry['head']
    assert git('diff','--cached','--binary')==entry['index']==''
    inventory=read(BASE/'INVENTORY.json')
    own={i['path'] for i in inventory['files']}|set(inventory['seal_exclusions'])
    actual={str(p.relative_to(ROOT)) for p in BASE.rglob('*') if p.is_file()}
    assert own==actual
    visible=set(git('ls-files','--cached','--others','--exclude-standard','-z').split('\0'))-{''}
    assert visible-set(entry['files'])<=own
    for item in inventory['files']:assert sha(ROOT/item['path'])==item['sha256']
    hashed=set()
    for line in (BASE/'SHA256SUMS.txt').read_text().splitlines():
        h,p=line.split('  ',1);assert sha(ROOT/p)==h;hashed.add(p)
    assert hashed==own-set(inventory['manifest_exclusions'])
    assert sha(BASE/'SHA256SUMS.txt')==read(BASE/'FINAL_INTEGRITY.json')['manifest_sha256']
    assert len(own)==inventory['files_created_this_run']
    return {'status':'PASS_READONLY_PREFLIGHT_INTEGRITY','protected_files':len(entry['files']),
      'new_files':len(own),'preexisting_modified':0,'readonly_catalog_and_aggregate_batches':len(batches),
      'schema_diff':diff['summary'],'runtime_enablement':'NOT_ASSERTED','index':'EMPTY_PRESERVED'}
if __name__=='__main__':print(json.dumps(main(),indent=2))
