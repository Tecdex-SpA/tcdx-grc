#!/usr/bin/env python3
"""Seal recovery evidence after real isolated restore and offline semantic proof.
No SQL, dump, network connection or new restore is performed here.
"""
import json,hashlib,os,subprocess,datetime
from pathlib import Path
BASE=Path(__file__).resolve().parent
ROOT=BASE.parents[3]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 os.umask(0o077)
 restored=json.loads((BASE/'BACKUP_RESTORE_RECONCILED.json').read_text());proof=json.loads((BASE/'CONSTRAINT_EQUIVALENCE.json').read_text());unit=json.loads((BASE/'NORMALIZER_TESTS.json').read_text())
 assert restored['restore_exit_code']==0 and restored['cleanup']['container_absent'] and restored['cleanup']['plaintext_restore_tmpfs_destroyed']
 assert all(value for key,value in restored['comparisons'].items() if key!='constraints')
 assert proof['status']=='PASS_NARROW_ARRAY_CAST_EQUIVALENCE' and proof['constraints']==len(restored['constraint_diagnostic']['differences'])==180 and unit['exit_code']==0
 assert all(x['normalized_AST_equal'] and x['changed_literal_rejected'] for x in proof['assertions'])
 assert subprocess.check_output(['fdesetup','status']).decode().strip()=='FileVault is On.'
 ref=restored['reference'];custody=Path.home()/'.tcdx-grc-qa-recovery'/ref;dump=custody/'tcdx-grc.pgdump'
 assert not custody.is_symlink() and custody.stat().st_uid==os.getuid() and custody.stat().st_mode&0o077==0 and dump.stat().st_mode&0o077==0
 assert sha(dump)==restored['dump_sha256']
 receipt={'status':'PASS_LOGICAL_SNAPSHOT_RECOVERY_ONLY','reference':ref,'verified_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':restored['source'],'snapshot_utc':restored['recovery_point_utc'],'dump_sha256':sha(dump),'dump_size_bytes':dump.stat().st_size,'dump_tool':restored['tool_version'],'restore_postgres':'16.15','file_encryption':'NONE_EXPLICIT_PO_DIRECTION','at_rest':'FileVault ON, private home directory0700 / backup0600','custody':'andresbarouh local PO account; ~/.tcdx-grc-qa-recovery/<reference>/tcdx-grc.pgdump','retention':'Retain as the recovery copy pending PO adoption and explicit disposal decision; no automatic deletion','coverage':{'tables':restored['tables_compared'],'ledger_checksums':restored['ledger_rows'],'all_table_row_counts':'MATCH_SAME_DUMP_SNAPSHOT','columns_indexes_functions_triggers_extensions':'MATCH','constraints':{'raw_definition_differences':180,'compared_total':2857,'semantic_AST_equivalence':'180_OF_180_PASS','all_others':'EXACT_MATCH'},'invalid_constraints':'NONE','invalid_indexes':'NONE','source_writes':'NONE','temporary_restore_cleanup':'VERIFIED_DESTROYED'},'limits':['Logical snapshot only; no PITR or recovery of the other four databases','No cluster/global role secrets copied; only referenced application role recreated NOLOGIN for isolated restore, database ACL/owners retained','Filesystem protection relies on FileVault and local account custody; artifact is NOT independently encrypted or portable as encrypted media','QA application, external object storage, secrets, jobs and E2E recovery are outside this database-only drill','Backup point must be reconsidered if QA changes before a future adoption; no future recovery point is inferred'], 'evidence':[{'path':str((BASE/n).relative_to(ROOT)),'sha256':sha(BASE/n)} for n in ['BACKUP_RESTORE_ATTEMPT_02.json','BACKUP_RESTORE_FINAL.json','BACKUP_RESTORE_RECONCILED.json','CONSTRAINT_EQUIVALENCE.json','NORMALIZER_TESTS.json']], 'qa_ddl_dml_history_writes':'NONE'}
 for p in [custody/'FINAL_RECOVERY_RECEIPT.json',BASE/'FINAL_RECOVERY_RECEIPT.json']:
  assert not p.exists();p.write_text(json.dumps(receipt,indent=2)+'\n');p.chmod(0o600)
 print(json.dumps({'status':receipt['status'],'reference':ref,'sha256':receipt['dump_sha256'],'real_restore_cleaned':True}))
if __name__=='__main__':main()
