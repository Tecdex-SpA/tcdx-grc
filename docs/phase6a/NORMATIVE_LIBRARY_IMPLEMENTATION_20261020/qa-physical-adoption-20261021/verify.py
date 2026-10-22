#!/usr/bin/env python3
"""Local preservation and NO-GO verification only; no SQL/network execution."""
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
    for path,h in entry['files'].items():assert sha(ROOT/path)==h,path
    assert len(entry['files'])==5256
    go=read(BASE/'GO_NO_GO.json')
    assert go['decision']=='NO_GO' and go['G4']['status']=='BLOCKED'
    assert go['G1']['execution_window_minutes']==30
    assert go['QA_DDL_EXECUTED']==go['TECHNICAL_LEDGER_WRITES']=='NONE'
    inspection=read(BASE/'PRE_GATES_READONLY.json')
    assert inspection['exit_code']==0
    assert sha(BASE/'PRE_GATES_READONLY.sql')==inspection['sql_sha256']
    categories={r['category']:r.get('rows',r) for r in inspection['results']}
    identity=categories['identity']
    assert identity['host']=='192.168.2.40' and identity['database']=='tcdx-grc'
    assert identity['transaction_read_only']==identity['default_transaction_read_only']=='on'
    assert len(categories['ledger'])==34
    manifest=read(ROOT/'database/migrations/manifest.json')
    for m in manifest['migrations']:assert sha(ROOT/'database/migrations'/m['filename'])==m['sha256']
    expected={m['id']:m for m in manifest['migrations']}
    for row in categories['ledger']:
        m=expected[row['migration_id']]
        assert row['filename']==m['filename'] and row['content_sha256']==m['sha256']
    dependency=read(BASE/'TRANSITIVE_DEPENDENCIES.json')
    assert not dependency['invalid_constraints_in_closure'] and not dependency['invalid_indexes_in_closure']
    assert read(BASE/'PREVIOUS_PREFLIGHT_RECONCILIATION.json')['status']=='PASS_NO_UNEXPECTED_SCOPED_SCHEMA_DRIFT'
    rec=read(BASE/'MIGRATION_RECONCILIATION.json')
    candidate=rec['candidate_migration'];raw=(ROOT/candidate['path']).read_bytes()
    assert sha(ROOT/candidate['path'])==candidate['sha256']
    for src in candidate['sources']:
        assert sha(ROOT/src['path'])==src['sha256']
        assert raw[src['offset']:src['offset']+src['length']]==(ROOT/src['path']).read_bytes()
    assert rec['not_registered'] and len(manifest['migrations'])==34
    assert read(BASE/'CANDIDATE_CHECKS.json')['status']=='PASS_OFFLINE_EXACT_BYTES_AND_GRAMMAR_ONLY'
    impact=read(BASE/'ARCHITECTURE_IMPACT_MATRIX.json')
    assert len(impact['objects'])==112
    for row in impact['objects']:
        assert sha(ROOT/row['contract']['path'])==row['contract']['sha256']
        for module in row['consumer_modules']:assert (ROOT/module).is_file()
    backup=read(BASE/'BACKUP_METADATA_READONLY.json')
    assert backup['exit_code']==255 and backup['result'] is None
    assert read(BASE/'BACKUP_PERIMETER_READONLY.json')['results'][0]['other_connectable_non_template_databases']==4
    def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT).decode().strip()
    assert git('branch','--show-current')==entry['branch']
    assert git('rev-parse','HEAD')==entry['head']
    assert git('diff','--cached','--binary')==entry['index']==''
    inv=read(BASE/'DELTAS.json')
    own={r['path'] for r in inv['files']}|set(inv['seal_exclusions'])
    assert own=={str(p.relative_to(ROOT)) for p in BASE.rglob('*') if p.is_file()}
    visible=set(git('ls-files','--cached','--others','--exclude-standard','-z').split('\0'))-{''}
    assert visible-set(entry['files'])<=own
    for item in inv['files']:assert sha(ROOT/item['path'])==item['sha256']
    hashed=set()
    for line in (BASE/'SHA256SUMS.txt').read_text().splitlines():
        h,p=line.split('  ',1);assert sha(ROOT/p)==h;hashed.add(p)
    assert hashed==own-set(inv['manifest_exclusions'])
    assert sha(BASE/'SHA256SUMS.txt')==read(BASE/'FINAL_INTEGRITY.json')['manifest_sha256']
    assert len(own)==inv['files_created_this_run']
    return {'status':'PASS_NO_GO_SUCCESSOR_INTEGRITY','protected_files':len(entry['files']),
      'files_created':len(own),'files_modified':0,'ledger_checksums':'34_OF_34_PASS',
      'impact_objects':112,'transitive_catalog_tables':dependency['transitive_tables'],
      'decision':'NO_GO','QA_DDL':'NONE','window':'30_MIN_AUTHORIZED_NOT_STARTED',
      'G4':'BLOCKED','index':'EMPTY_PRESERVED'}
if __name__=='__main__':print(json.dumps(main(),indent=2))
