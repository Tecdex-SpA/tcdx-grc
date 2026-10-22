#!/usr/bin/env python3
"""QA01 offline evidence verifier. No network, DB client or operational script."""
import argparse,datetime,hashlib,json,subprocess
from pathlib import Path
B=Path(__file__).resolve().parent;R=B.parents[3]
def read(p):return json.loads(p.read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def cats(d):return {x['category']:x.get('rows',x) for x in d['results'] if x['category']!='data_fingerprint'}
def fps(d):return {x['relation']:(x['rows'],x['sha256']) for x in d['results'] if x['category']=='data_fingerprint'}
def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--check-backup',action='store_true',help='Also hash private local backup; no QA access');args=parser.parse_args()
 manifest=read(B/'FILE_MANIFEST.json');result=read(B/'RESULT.json');entry=read(B/'ENTRY.json');append=read(B/'STATUS_APPEND.json')
 assert result['SCOPE']=='QA01_MIGRATION36_CONTROLLED_ADOPTION' and result['QA01_GATE']==result['RECTOR_GATE']=='PASS'
 for line in (B/'SHA256SUMS.txt').read_text().splitlines():
  h,p=line.split('  ',1);path=R/p;assert path.resolve().is_relative_to(R) and sha(path)==h,p
 assert len({x['path'] for x in manifest['files']})==len(manifest['files'])
 for f in manifest['files']:assert (R/f['path']).resolve().is_relative_to(R) and sha(R/f['path'])==f['sha256'],f['path']
 actual={str(p.relative_to(R)) for p in B.rglob('*') if p.is_file() and '__pycache__' not in p.parts}
 declared={x['path'] for x in manifest['files'] if x['action']=='created'}|{str((B/n).relative_to(R)) for n in ['FILE_MANIFEST.json','SHA256SUMS.txt']}
 assert actual==declared and len(actual)==result['FILES_CREATED']==manifest['files_created']
 assert result['FILES_MODIFIED']==manifest['files_modified']==1
 git=lambda *a:subprocess.check_output(['git',*a],cwd=R,text=True).strip()
 assert git('branch','--show-current')==entry['branch']==result['BRANCH'] and git('rev-parse','HEAD')==entry['head']==result['HEAD']
 assert git('diff','--cached','--raw')==entry['index_raw']==''
 before=(B/'MASTER_STATUS_PREIMAGE.md').read_bytes();after=(R/append['path']).read_bytes()
 assert hashlib.sha256(before).hexdigest()==append['before_sha256']==entry['files'][append['path']]
 assert after.startswith(before) and sha(R/append['path'])==append['after_sha256']
 assert hashlib.sha256(after[len(before):]).hexdigest()==append['append_sha256']
 for p,h in entry['files'].items():
  if p!=append['path']:assert sha(R/p)==h,'Received file drift: '+p
 for p in entry['critical_files']:assert sha(R/p)==entry['files'][p]
 prior=B.parent/'local-definitions-01-resolution-20261022'
 for f in read(prior/'FILE_MANIFEST.json')['files']:
  assert (append['before_sha256'] if f['path']==append['path'] else sha(R/f['path']))==f['sha256'],f['path']
 old=read(prior/'preimages/database/migrations/manifest.json');current=read(R/'database/migrations/manifest.json');m=entry['migration36']
 assert current=={**old,'migrations':old['migrations']+[m]} and len(old['migrations'])==35 and len(current['migrations'])==36
 for migration in current['migrations']:assert sha(R/'database/migrations'/migration['filename'])==migration['sha256']
 assert m['id']=='20261022141304' and m['sha256']=='4fc817fa8ba6b8149dce1d484a301b511b24f8d4329038fd1e72265c9cd0bfc3'
 pre=read(B/'PRE.json');immediate=read(B/'IMMEDIATE.json');post=read(B/'POST.json');a=cats(immediate);z=cats(post)
 for d in [pre,immediate,post]:
  assert d['status']=='PASS_READ_ONLY' and d['identity']['tls_authorized'] and d['identity']['sslmode']=='verify-full'
  assert d['identity']['system_identifier']=='7640968386355389904' and d['identity']['db']=='tcdx-grc' and d['identity']['host']=='192.168.2.40'
  assert d['identity']['readonly']==d['identity']['default_readonly']=='on'
 assert len(a['ledger'])==35 and len(z['ledger'])==36 and z['ledger'][:35]==a['ledger']==cats(pre)['ledger']
 for row,spec in zip(z['ledger'],current['migrations']):
  assert row['migration_id']==spec['id'] and row['filename']==spec['filename'] and row['content_sha256']==spec['sha256'] and row['transactional'] and row['outcome']=='applied'
 assert fps(pre)==fps(immediate)==fps(post) and len(fps(post))==244 and sum(x[0] for x in fps(post).values())==5097
 for k in ['relations','columns','indexes','functions','triggers','authority_catalog']:assert a[k]==z[k],k
 key=lambda x:x['relation']+':'+x['name'];ac={key(x):x for x in a['constraints']};zc={key(x):x for x in z['constraints']};target='config.configuration_definitions:ck_configuration_definitions__typed_default'
 assert ac.keys()==zc.keys() and [k for k in ac if ac[k]!=zc[k]]==[target]
 contract=R/'docs/physical-data-model/amendments/CONFIGURATION_OPTIONAL_DEFAULT_20261022'
 assert a['typed_default_exact']['definition']==read(contract/'PG16_PREDECESSOR.json')['definition']
 assert z['typed_default_exact']['definition']==read(contract/'PG16_CONSTRAINT.json')['definition'] and z['typed_default_exact']['validated']
 assert all(c['convalidated'] for c in z['constraints']) and all(i['indisvalid'] and i['indisready'] for i in z['indexes'])
 assert z['health']['invalid_constraints']==z['health']['invalid_indexes']==0 and z['health']['ssl'] and not z['health']['recovery']
 for d in [immediate,post]:
  act={x['category']:x['rows'] for x in d['activity']};assert act['locks']==[] and act['prepared_transactions'][0]['prepared_transactions']==0
  assert all(x['state']=='idle' and x['open_transactions']==x['lock_waiters']==x['transactions_over_30s']==0 for x in act['session_activity'])
 go=read(B/'GO_NO_GO.json');assert go['decision']=='GO' and all(go['gates'].values())
 for name,h in go['execution_script_sha256'].items():assert sha(B/name)==h
 execution=read(B/'CANONICAL_APPLY.json');lines=execution['stdout'].splitlines()
 assert execution['exit_code']==0 and not execution['test_mode'] and not execution['isolated_rebuild']
 assert len(lines)==36 and sum(x.endswith(' applied') for x in lines)==1 and lines[-1]=='20261022141304 applied'
 assert datetime.datetime.fromisoformat(go['checked_utc'])<=datetime.datetime.fromisoformat(execution['started_utc'])<datetime.datetime.fromisoformat(execution['finished_utc'])<datetime.datetime.fromisoformat(go['expires_utc'])
 receipt=read(B/'MIGRATION_RECEIPT.json');assert receipt['status']=='APPLIED_VERIFIED_ONCE' and receipt['migration']==m and receipt['execution']==execution and receipt['ledger_record']==z['ledger'][-1]
 gates=read(B/'POST_GATES.json');assert gates['status']=='PASS' and all(gates['checks'].values()) and len(gates['checks'])==14
 verify=read(B/'CANONICAL_VERIFY.json');summary=json.loads(verify['stdout'])
 assert verify['exit_code']==0 and summary==gates['canonical_summary'] and summary['schemaMismatches']==0 and summary['actualPhysicalTables']==244 and summary['expectedColumns']==3630
 assert summary['forbiddenDeleteCascades']==0
 backup=read(B/'BACKUP_RECEIPT.json');assert backup['status']=='PASS_VERIFIED_RECOVERABLE' and backup['dump_exit_code']==backup['archive_list_exit_code']==backup['restore_exit_code']==0
 assert backup['tables_compared']==245 and backup['ledger_rows']==35 and backup['restore_version']['major']==16 and all(backup['comparisons'].values())
 assert backup['cleanup']['container_absent'] and backup['cleanup']['sensitive_restore_tmpfs_destroyed'] and backup['cleanup']['exit_code']==0
 assert backup['isolation']['network']=='none' and backup['isolation']['ports']==backup['isolation']['binds']==backup['isolation']['volumes']==[]
 assert receipt['backup_reference']==go['backup_reference']==backup['reference']
 failed=read(B/'BACKUP_RESTORE_ATTEMPT1.json');assert failed['status']=='FAIL' and failed['restore_exit_code']==1 and failed['cleanup']['container_absent'] and failed['dump_sha256']==backup['dump_sha256']
 assert backup['source_connections_this_retry']==0 and backup['dump_size_bytes']>0
 local=read(B/'LOCAL_GATES.json');assert local['status']=='PASS' and local['prior_artifact_entries_verified']==99 and all(x['exit_code']==0 for x in local['checks'])
 assert local['checks'][1]['stdout']==local['checks'][2]['stdout']
 final=read(B/'FINAL_LOCAL_CHECKS.json');assert final['status']=='PASS' and final['private_backup_sha256_rechecked']==backup['dump_sha256'] and all(x['exit_code']==0 for x in final['checks'])
 for name in ['IAM_REGISTRY_ACTIVATIONS','B06_ACTIVATIONS','DEFINITIONS_ACTIVATIONS','H04_ACTIVATIONS','NORMATIVE_IMPORTS','BACKEND_DEPLOYMENTS','FRONTEND_DEPLOYMENTS','PRODUCTION_CHANGES']:assert result[name]=='NONE'
 assert result['STEP6A5']==result['STEP6A6']=='NOT_STARTED'
 if args.check_backup:
  p=Path(backup['protected_location']);assert not p.is_symlink() and sha(p)==backup['dump_sha256'] and p.stat().st_mode&0o077==0 and p.parent.stat().st_mode&0o077==0
 print(json.dumps({'integrity':'PASS','QA01_GATE':'PASS','migration36':'APPLIED_VERIFIED_ONCE','history':'36_EXACT','schema':'244_TABLES_3630_COLUMNS_ZERO_MISMATCHES','business_fingerprints':'244_IDENTICAL_5097_ROWS','backup':'ACTUAL_ISOLATED_PG16_RESTORE_VERIFIED','backup_file_local_check':'PASS' if args.check_backup else 'NOT_REQUESTED_RECEIPT_INTEGRITY_ONLY','QA_connections_this_verifier':'NONE','received_files':'PRESERVED_EXCEPT_DOCUMENTED_STATUS_APPEND','files_created':len(actual),'files_modified':1},indent=2))
if __name__=='__main__':main()
