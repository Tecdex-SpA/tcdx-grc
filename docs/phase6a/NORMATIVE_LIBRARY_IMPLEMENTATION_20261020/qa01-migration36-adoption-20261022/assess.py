#!/usr/bin/env python3
"""Offline assessments only; no database client or SQL execution."""
from pathlib import Path
import json,sys,datetime,hashlib
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3]
def read(p):return json.loads(p.read_text())
def write(name,data):
 p=BASE/name;assert not p.exists();p.write_text(json.dumps(data,indent=2)+'\n')
def cats(d):return {x['category']:x.get('rows',x) for x in d['results'] if x['category']!='data_fingerprint'}
def fps(d):return {x['relation']:(x['rows'],x['sha256']) for x in d['results'] if x['category']=='data_fingerprint'}
TARGET='config.configuration_definitions:ck_configuration_definitions__typed_default'
def objectkey(x):return x['relation']+':'+x['name']
def historical_catalog(current):
 old=cats(read(BASE.parent/'qa-adoption-verify-full-20261021/POST.json'))
 for category in ['relations','columns','indexes','functions','triggers']:
  assert current[category]==old[category],('Unexpected historical schema drift',category)
 # exact all catalog entries except the one explicitly authorized replacement.
 strip=lambda rows:[{k:v for k,v in r.items() if k!='normalized_definition'} for r in rows if objectkey(r)!=TARGET]
 assert strip(current['constraints'])==strip(old['constraints']),'Unrelated constraint drift'
def ledger(current):
 m=read(ROOT/'database/migrations/manifest.json')['migrations'];rows=current['ledger']
 assert len(rows) in [35,36] and len(m)==36
 for row,spec in zip(rows,m):
  assert row['migration_id']==spec['id'] and row['filename']==spec['filename'] and row['content_sha256']==spec['sha256'] and row['transactional'] and row['outcome']=='applied'
 return len(rows)
def operational(d):
 a={x['category']:x['rows'] for x in d['activity']}
 assert not a['locks'],'Unexpected locks'
 assert a['prepared_transactions'][0]['prepared_transactions']==0
 assert all(x['state']=='idle' and x['open_transactions']==x['lock_waiters']==x['transactions_over_30s']==0 for x in a['session_activity']),'Incompatible sessions'
 h=cats(d)['health'];assert h['ssl'] and not h['recovery'] and h['invalid_constraints']==h['invalid_indexes']==0 and h['connections']<int(h['max_connections'])*.8
def pre(phase):
 d=read(BASE/(phase+'.json'));assert d['status']=='PASS_READ_ONLY' and d['identity']['tls_authorized']
 c=cats(d);n=ledger(c);historical_catalog(c);operational(d)
 assert len(fps(d))==244
 expected=read(ROOT/('docs/physical-data-model/amendments/CONFIGURATION_OPTIONAL_DEFAULT_20261022/'+('PG16_PREDECESSOR.json' if n==35 else 'PG16_CONSTRAINT.json')))
 constraint=[x for x in c['constraints'] if objectkey(x)==TARGET];assert len(constraint)==1
 assert c['typed_default_exact']['definition']==expected['definition'] and c['typed_default_exact']['validated'] and constraint[0]['convalidated']
 assert all(x['convalidated'] for x in c['constraints']) and all(x['indisvalid'] and x['indisready'] for x in c['indexes'])
 gates={'local_integrity':read(BASE/'LOCAL_GATES.json')['status']=='PASS','QA_identity_TLS':True,'history_exact':True,'schema_exact_predecessor_or_already_applied':True,'activity_health':True,'all_244_fingerprints_bounded':True}
 if phase=='IMMEDIATE':
  first=read(BASE/'PRE.json');assert c['ledger']==cats(first)['ledger'];assert fps(d)==fps(first),'Data changed since preflight'
  for k in ['relations','columns','constraints','indexes','functions','triggers','authority_catalog']:assert c[k]==cats(first)[k],k
  b=read(BASE/'BACKUP_RECEIPT.json');assert b['status']=='PASS_VERIFIED_RECOVERABLE' and b['restore_exit_code']==0 and all(b['comparisons'].values()) and b['cleanup']['sensitive_restore_tmpfs_destroyed']
  dump=Path(b['protected_location']);assert hashlib.sha256(dump.read_bytes()).hexdigest()==b['dump_sha256'] and dump.stat().st_mode&0o077==0
  metadata=read(dump.parent/'SNAPSHOT_METADATA.json');assert fps({'results':metadata['source']})|{} == fps(d)|{'platform.schema_migrations':fps({'results':metadata['source']})['platform.schema_migrations']}
  assert cats({'results':metadata['source']})['ledger']==c['ledger']
  now=datetime.datetime.now(datetime.timezone.utc);assert (now-datetime.datetime.fromisoformat(d['finished_utc'])).total_seconds()<20
  assert n==35,'Already applied: never rerun'
  gates['fresh_recoverable_backup']=True;gates['only36_pending']=True
  result={'decision':'GO','gates':gates,'checked_utc':now.isoformat(),'expires_utc':(now+datetime.timedelta(minutes=10)).isoformat(),'migration':read(BASE/'ENTRY.json')['migration36'],'backup_reference':b['reference'],'recovery':'Runner transaction rollback on failure. After commit: preserve evidence and stop; no unreviewed down/ledger edit. Verified private logical snapshot recovery is available, with its recorded point/limits.'}
  result['execution_script_sha256']={name:hashlib.sha256((BASE/name).read_bytes()).hexdigest() for name in ['operator.py','inspect.mts','backup.mts','assess.py']}
  write('GO_NO_GO.json',result)
 else:write('PREFLIGHT_ASSESSMENT.json',{'status':'PASS','gates':gates,'applied_migrations':n,'pending_migration':'20261022141304' if n==35 else None,'already_applied':n==36})
 print(json.dumps({'phase':phase,'status':'PASS','applied':n,'gates':gates}))
def post():
 pre=read(BASE/'IMMEDIATE.json');post=read(BASE/'POST.json');a=cats(pre);z=cats(post);assert post['status']=='PASS_READ_ONLY';assert ledger(z)==36;operational(post)
 checks={}
 def check(k,ok):checks[k]=bool(ok);assert ok,k
 for k in ['relations','columns','indexes','functions','triggers','authority_catalog']:check(k+'_unchanged',a[k]==z[k])
 before={objectkey(x):x for x in a['constraints']};after={objectkey(x):x for x in z['constraints']};check('constraint_names_unchanged',before.keys()==after.keys())
 changed=[k for k in before if before[k]!=after[k]];check('only_authorized_check_replaced',changed==[TARGET])
 expected=read(ROOT/'docs/physical-data-model/amendments/CONFIGURATION_OPTIONAL_DEFAULT_20261022/PG16_CONSTRAINT.json')
 check('exact_new_validated_check',z['typed_default_exact']['definition']==expected['definition'] and z['typed_default_exact']['validated'] and after[TARGET]['convalidated'] and before[TARGET]['oid']!=after[TARGET]['oid'])
 check('all_244_business_fingerprints_identical',fps(pre)==fps(post) and len(fps(post))==244)
 check('35_full_historical_ledger_rows_identical',z['ledger'][:35]==a['ledger'] and len(z['ledger'])==36)
 check('no_invalid_constraints_indexes',z['health']['invalid_constraints']==z['health']['invalid_indexes']==0)
 v=read(BASE/'CANONICAL_VERIFY.json');summary=json.loads(v['stdout']);check('canonical_schema_zero_mismatches',v['exit_code']==0 and summary['schemaMismatches']==0 and summary['actualPhysicalTables']==244 and summary['forbiddenDeleteCascades']==0)
 apply=read(BASE/'CANONICAL_APPLY.json');lines=apply['stdout'].splitlines();check('only36_applied_once',apply['exit_code']==0 and len(lines)==36 and sum(x.endswith(' applied') for x in lines)==1 and lines[-1]=='20261022141304 applied')
 write('POST_GATES.json',{'status':'PASS','checks':checks,'canonical_summary':summary,'constraint_change':{'before':before[TARGET],'after':after[TARGET]},'business_tables':244,'business_DML':'NONE','technical_ledger_inserts':1})
 write('MIGRATION_RECEIPT.json',{'status':'APPLIED_VERIFIED_ONCE','migration':read(BASE/'ENTRY.json')['migration36'],'execution':apply,'pre_history':35,'post_history':36,'ledger_record':z['ledger'][-1],'business_tables_preserved':244,'business_DML':'NONE','object_changes':{'one_CHECK_replaced':TARGET,'all_other_objects':'IDENTICAL'},'backup_reference':read(BASE/'BACKUP_RECEIPT.json')['reference'],'TLS':post['identity']})
 print(json.dumps({'status':'PASS','checks':checks}))
if __name__=='__main__':post() if sys.argv[1]=='POST' else pre(sys.argv[1])
