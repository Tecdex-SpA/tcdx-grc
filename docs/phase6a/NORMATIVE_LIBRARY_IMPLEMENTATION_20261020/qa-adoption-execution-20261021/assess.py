#!/usr/bin/env python3
"""Assess read-only preflight and publication integrity; never executes SQL."""
import json,hashlib,datetime
from pathlib import Path
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3]
def load(p):return json.loads(p.read_text())
def main():
 pre=load(BASE/'PRE.json');assert pre['exit_code']==0
 cat={x['category']:x.get('rows',x) for x in pre['results'] if x['category']!='data_fingerprint'}
 old=load(BASE.parent/'qa-physical-adoption-20261021/PRE_GATES_READONLY.json');past={x['category']:x.get('rows',x) for x in old['results']}
 same={k:cat[k]==past[k] for k in ['relations','columns','constraints','indexes','functions','triggers','ledger']};assert all(same.values()),same
 manifest=load(ROOT/'database/migrations/manifest.json');assert len(cat['ledger'])==34 and len(manifest['migrations'])==35
 for a,m in zip(cat['ledger'],manifest['migrations'][:34]):assert a['migration_id']==m['id'] and a['content_sha256']==m['sha256'] and a['filename']==m['filename']
 for m in manifest['migrations']:assert hashlib.sha256((ROOT/'database/migrations'/m['filename']).read_bytes()).hexdigest()==m['sha256']
 inv=load(ROOT/'database/expected-schema.json');amend=inv['normativeLibraryAmendment'];raw=(ROOT/amend['migration']['path']).read_bytes()
 for s in amend['sources']:assert raw[s['offset']:s['offset']+s['length']]==(ROOT/s['path']).read_bytes()
 receipt=load(ROOT/amend['publicationReceipt']['path']);assert receipt['PV_H04_01']=='CONTRACT_PUBLISHED_VERIFIED'
 counts={x['relation']:x['rows'] for x in pre['results'] if x['category']=='data_fingerprint'};assert len(counts)==242 and all(v<100001 for v in counts.values())
 ref=load(BASE/'BACKUP_AVAILABLE.json')['reference'];backup=load(Path.home()/'.tcdx-grc-qa-recovery'/ref/'SNAPSHOT_METADATA.json');changed=[p for p,n in counts.items() if n!=backup['counts'][p]];assert not changed,changed
 safe=not cat['locks'] and all(x['state']=='idle' and x['open_transactions']==0 and x['lock_waiters']==0 and x['transactions_over_30s']==0 for x in cat['session_activity']) and cat['prepared_transactions'][0]['prepared_transactions']==0
 assert safe,'Concurrent activity incompatible; do not run'
 tls=load(BASE/'CANONICAL_STATUS.json');assert tls['exit_code']!=0 and 'DEPTH_ZERO_SELF_SIGNED_CERT' in tls['stderr']
 result={'at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'decision':'NO_GO','gates':{'rector':'PASS','backup_available_and_recoverable':'PASS_SNAPSHOT_ONLY','QA_target':'PASS','historical_34_checksums':'PASS','architecture_no_drift':same,'exact_published_migration':'PASS','activity_snapshot':'PASS_IDLE_ONLY','canonical_runner_trusted_TLS':'BLOCKED'},'backup_reference':ref,'backup_count_changes':changed,'backup_contents_comparison':'NOT_ASSERTED; counts match only. Current data aggregate hashes captured for a future authorized pre/post comparison.','preexisting_business_tables_fingerprinted':len(counts),'transaction_read_only':cat['identity']['transaction_read_only'],'window':'NOT_STARTED','QA_DDL':'NONE','QA_ledger_writes':'NONE','blocking_error':'DEPTH_ZERO_SELF_SIGNED_CERT','next_required_reference':'Approved CA/public certificate or administrator-verified fingerprint for PostgreSQL QA; no TLS verification bypass inferred','recovery':'Before commit, canonical runner transaction rollback proven in isolated PG16; after commit no destructive reversal authorized; logical snapshot only, no PITR'}
 p=BASE/'NO_GO_01.json';assert not p.exists();p.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'decision':'NO_GO','blocked':'Trusted TLS for canonical runner','other_checks':'PASS','window':'NOT_STARTED'}))
if __name__=='__main__':main()
