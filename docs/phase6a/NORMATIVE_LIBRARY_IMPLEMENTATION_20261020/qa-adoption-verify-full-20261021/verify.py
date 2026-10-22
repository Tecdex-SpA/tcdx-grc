#!/usr/bin/env python3
"""Local adoption receipt/continuity verifier. No SQL, network or writes."""
import json,hashlib,subprocess,datetime
from pathlib import Path
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):return json.loads(p.read_text())
def cats(d):return {r['category']:r.get('rows',r) for r in d['results'] if r['category']!='data_fingerprint'}
def main():
 entry=read(BASE/'ENTRY.json');assert len(entry['files'])==5354
 source=read(BASE/'SOURCE_DELTAS.json');changes={r['path']:r for r in source['changes']};assert set(changes)=={'scripts/foundations/db.ts','docs/governance/MASTER_EXECUTION_STATUS.md'}
 for name,before in entry['files'].items():
  if name in changes:assert sha(ROOT/name)==changes[name]['after_sha256'] and before==changes[name]['before_sha256']
  else:assert sha(ROOT/name)==before,name
 assert sha(BASE/'PREIMAGE_db.ts.txt')==entry['files']['scripts/foundations/db.ts']
 append=read(BASE/'STATUS_APPEND.json');raw=(ROOT/append['path']).read_bytes();assert hashlib.sha256(raw[:append['preserved_prefix_bytes']]).hexdigest()==append['preserved_prefix_sha256'];assert hashlib.sha256(raw[append['preserved_prefix_bytes']:]).hexdigest()==append['append_sha256']
 def git(*a):return subprocess.check_output(['git',*a],cwd=ROOT).decode().strip()
 assert git('branch','--show-current')==entry['branch'] and git('rev-parse','HEAD')==entry['head']
 assert git('diff','--cached','--binary')==entry['index']==''
 manifest=read(ROOT/'database/migrations/manifest.json');assert len(manifest['migrations'])==35
 for row in manifest['migrations']:assert sha(ROOT/'database/migrations'/row['filename'])==row['sha256']
 expected=read(ROOT/'database/expected-schema.json');am=expected['normativeLibraryAmendment'];migration=(ROOT/am['migration']['path']).read_bytes();assert sha(ROOT/am['migration']['path'])==am['migration']['sha256']
 for src in am['sources']:assert sha(ROOT/src['path'])==src['sha256'] and migration[src['offset']:src['offset']+src['length']]==(ROOT/src['path']).read_bytes()
 tls=read(BASE/'TLS_VALIDATION.json');assert tls['status']=='PASS_VERIFIED_TLS_ONLY' and tls['tls']['authorized'] and tls['tls']['servername']=='db-tecdex'
 assert len(tls['tests'])==4 and all(x['status']=='PASS' for x in tls['tests']) and tls['libpq']['exit_code']==0
 fp=subprocess.check_output(['/opt/homebrew/opt/openssl@3/bin/openssl','x509','-in',str(BASE/'QA_ADMINISTRATIVE_PUBLIC_CERT.pem'),'-noout','-fingerprint','-sha256']).decode().strip().split('=',1)[1];assert fp==tls['approved_fingerprint']==read(BASE/'PO_TLS_AUTHORITY.json')['approved_certificate_sha256']
 for file in ['UNIT_TESTS.json','TYPECHECK_FINAL.json','RECTOR_FINAL.json','CANONICAL_APPLY.json','CANONICAL_VERIFY.json','CANONICAL_POST.json']:assert read(BASE/file)['exit_code']==0,file
 before=read(BASE/'IMMEDIATE.json');after=read(BASE/'POST.json');assert before['status']==after['status']=='PASS_READ_ONLY_INSPECTION' and after['TLS_authorized']
 b=cats(before);a=cats(after);assert b['ledger']==a['ledger'][:34] and len(a['ledger'])==35
 assert a['ledger'][-1]['migration_id']=='20261021221204' and a['ledger'][-1]['content_sha256']=='9279159e88c60fff03f998e33008fb0d675f53e4423df638c9e54f709a773798'
 fingerprints=lambda data:{x['relation']:(x['rows'],x['sha256']) for x in data['results'] if x['category']=='data_fingerprint'}
 assert fingerprints(before)==fingerprints(after) and len(fingerprints(before))==242
 post=read(BASE/'POST_GATES.json');assert len(post['checks'])==18 and all(c['status']=='PASS' for c in post['checks'])
 assert post['QA_PHYSICAL_ADOPTION']=='APPLIED_VERIFIED';assert datetime.datetime.fromisoformat(post['window_started_utc'])<datetime.datetime.fromisoformat(post['window_closed_utc'])<datetime.datetime.fromisoformat(post['window_expires_utc'])
 wanted={'relations':(2,0),'columns':(38,0),'constraints':(42,1),'indexes':(15,1),'functions':(8,0),'triggers':(12,0)};delta=read(BASE/'OBJECT_DELTAS.json')
 for kind,(added,removed) in wanted.items():assert len(delta[kind]['added'])==added and len(delta[kind]['removed'])==removed and not delta[kind]['changed']
 summary=json.loads(read(BASE/'CANONICAL_VERIFY.json')['stdout']);assert summary['schemaMismatches']==0 and summary['actualPhysicalTables']==244 and summary['expectedColumns']==3630
 assert all(x['rows']==0 for x in after['results'] if x['category']=='new_table_empty');assert all(a['new_columns_historical_null'][k]==0 for k in ['overrides','effective','applicability'])
 receipt=read(BASE/'ADOPTION_RECEIPT.json');assert receipt['status']=='APPLIED_VERIFIED_PHYSICAL_SCOPE_ONLY'
 for ref in receipt['evidence']:assert sha(ROOT/ref['path'])==ref['sha256']
 result=read(BASE/'RESULT.json');assert result['QA_PHYSICAL_ADOPTION']=='APPLIED_VERIFIED' and result['B01_B09_OPERATIONAL_ENABLEMENT']=='NOT_PERFORMED'
 inv=read(BASE/'DELTAS.json');own={str(p.relative_to(ROOT)) for p in BASE.rglob('*') if p.is_file()};created={x['path'] for x in inv['files'] if x['change']=='CREATED'}|set(inv['seal_exclusions']);assert own==created and len(own)==inv['files_created'] and inv['files_modified']==2
 for x in inv['files']:assert sha(ROOT/x['path'])==x['sha256']
 visible=set(subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=ROOT).decode().split('\0'))-{''};assert visible-set(entry['files'])==own
 hashed=set()
 for line in (BASE/'SHA256SUMS.txt').read_text().splitlines():
  h,p=line.split('  ',1);assert sha(ROOT/p)==h,p;hashed.add(p)
 assert hashed==((own|set(changes))-set(inv['manifest_exclusions']));assert sha(BASE/'SHA256SUMS.txt')==read(BASE/'FINAL_INTEGRITY.json')['manifest_sha256']
 return {'integrity':'PASS','adoption':'APPLIED_VERIFIED_PHYSICAL_SCOPE_ONLY','received':5354,'received_byte_unchanged':5352,'authorized_deltas_preserved_preimage_or_prefix':2,'files_created':len(own),'migration':'20261021221204','ledger':'34_PRESERVED_PLUS_ONE_AUTHORIZED','TLS':'PASS_VERIFY_FULL_APPROVED_CERTIFICATE','business_table_fingerprints':'242_OF_242_MATCH','post_gates':'18_PASS','window':'CLOSED_WITHIN_30_MIN','operational_enablement':'NOT_PERFORMED','index':'EMPTY_PRESERVED'}
if __name__=='__main__':print(json.dumps(main(),indent=2))
