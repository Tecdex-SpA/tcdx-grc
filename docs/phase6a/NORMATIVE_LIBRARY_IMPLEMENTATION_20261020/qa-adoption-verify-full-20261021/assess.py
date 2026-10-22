#!/usr/bin/env python3
"""Offline gate assessment; --open-window only after a fresh verified inspection."""
from pathlib import Path
import json,hashlib,datetime,sys
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3]
def read(p):return json.loads(p.read_text())
def categories(d):return {x['category']:x.get('rows',x) for x in d['results'] if x['category']!='data_fingerprint'}
def assess(phase):
 pre=read(BASE/(phase+'.json'));assert pre['status']=='PASS_READ_ONLY_INSPECTION' and pre['TLS_authorized'];cat=categories(pre)
 old=read(BASE.parent/'qa-adoption-execution-20261021/PRE.json');original=categories(old)
 same={k:cat[k]==original[k] for k in ['relations','columns','constraints','indexes','functions','triggers','ledger']};assert all(same.values()),same
 assert cat['clock']['cluster_system_identifier']==original['clock']['cluster_system_identifier']
 a={r['relation']:(r['rows'],r['sha256']) for r in old['results'] if r['category']=='data_fingerprint'};z={r['relation']:(r['rows'],r['sha256']) for r in pre['results'] if r['category']=='data_fingerprint'};assert a==z,'Business data drift since approved preflight; no DDL';assert len(z)==242
 assert not cat['locks'] and cat['prepared_transactions'][0]['prepared_transactions']==0
 assert all(x['state']=='idle' and x['open_transactions']==0 and x['lock_waiters']==0 and x['transactions_over_30s']==0 for x in cat['session_activity']),'Incompatible activity; STOP'
 m=read(ROOT/'database/migrations/manifest.json');assert len(m['migrations'])==35 and len(cat['ledger'])==34
 for applied,spec in zip(cat['ledger'],m['migrations'][:34]):assert applied['migration_id']==spec['id'] and applied['content_sha256']==spec['sha256'] and applied['filename']==spec['filename']
 for spec in m['migrations']:assert hashlib.sha256((ROOT/'database/migrations'/spec['filename']).read_bytes()).hexdigest()==spec['sha256']
 n=m['migrations'][-1];assert n['id']=='20261021221204' and n['sha256']=='9279159e88c60fff03f998e33008fb0d675f53e4423df638c9e54f709a773798'
 am=read(ROOT/'database/expected-schema.json')['normativeLibraryAmendment'];raw=(ROOT/am['migration']['path']).read_bytes()
 for src in am['sources']:assert raw[src['offset']:src['offset']+src['length']]==(ROOT/src['path']).read_bytes()
 tls=read(BASE/'TLS_VALIDATION.json');assert tls['status']=='PASS_VERIFIED_TLS_ONLY' and len(tls['tests'])==4 and all(x['status']=='PASS' for x in tls['tests'])
 for p in ['TYPECHECK.json','UNIT_TESTS.json','RECTOR_PRE.json']:assert read(BASE/p)['exit_code']==0,p
 status=read(BASE/'CANONICAL_STATUS.json');assert status['exit_code']==0
 lines=status['stdout'].splitlines();assert len(lines)==35 and sum(' applied ' in l for l in lines)==34 and lines[-1].startswith('20261021221204 pending ')
 b=read(BASE/'BACKUP_AVAILABLE.json');backup=Path.home()/'.tcdx-grc-qa-recovery'/b['reference']/'tcdx-grc.pgdump';assert hashlib.sha256(backup.read_bytes()).hexdigest()==b['sha256']
 entry=read(BASE/'ENTRY.json');changed=[]
 for name,h in entry['files'].items():
  if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=h:changed.append(name)
 assert changed==['scripts/foundations/db.ts'],changed
 assert hashlib.sha256((BASE/'PREIMAGE_db.ts.txt').read_bytes()).hexdigest()==entry['files']['scripts/foundations/db.ts']
 return {'rector':'PASS','published_sources':'PASS','QA_identity_TLS_verify_full':'PASS','34_immutable_migrations_and_sole_pending_35':'PASS','architectural_consistency':'PASS','schema_and_all_242_business_fingerprints_no_drift':'PASS','backup_available_verified_recovery':'PASS','canonical_client_typecheck_and_4_unit_tests':'PASS','activity_transactions_locks':'PASS'}
def main():
 phase=sys.argv[1];assert phase in ['PRE','IMMEDIATE'];gates=assess(phase)
 now=datetime.datetime.now(datetime.timezone.utc);d={'gates':gates,'decision':'PASS_PRECHECK' if phase=='PRE' else 'GO','checked_at_utc':now.isoformat(),'backup_reference':'QA-LOGICAL-e923e6ecc44845c6920c8fd975f34675','migration_id':'20261021221204','migration_sha256':'9279159e88c60fff03f998e33008fb0d675f53e4423df638c9e54f709a773798','recovery':'Canonical transaction rollback before commit; prior isolated PG16.15 rollback proof reused. Named logical backup recoverable at22:46:47UTC; no PITR. No destructive down or restore inferred after commit.'}
 if phase=='IMMEDIATE':
  inspected=datetime.datetime.fromisoformat(read(BASE/'IMMEDIATE.json')['finished_utc']);assert (now-inspected).total_seconds()<15,'Immediate gate too old';d['window_started_utc']=now.isoformat();d['window_expires_utc']=(now+datetime.timedelta(minutes=30)).isoformat()
 p=BASE/('PREFLIGHT_ASSESSMENT.json' if phase=='PRE' else 'GO_NO_GO.json');assert not p.exists();p.write_text(json.dumps(d,indent=2)+'\n');print(json.dumps({'decision':d['decision'],'gates':gates,'window':d.get('window_started_utc','NOT_STARTED')}))
if __name__=='__main__':main()
