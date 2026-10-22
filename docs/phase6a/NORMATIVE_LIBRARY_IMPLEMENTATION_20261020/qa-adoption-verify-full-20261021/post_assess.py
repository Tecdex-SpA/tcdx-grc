#!/usr/bin/env python3
"""Exact catalog delta and historical fingerprint comparison; no SQL/writes to QA."""
import json,hashlib,datetime
from pathlib import Path
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3]
def read(p):return json.loads(p.read_text())
def cats(d):return {x['category']:x.get('rows',x) for x in d['results'] if x['category']!='data_fingerprint'}
def main():
 assert not (BASE/'POST_GATES.json').exists()
 pre=read(BASE/'IMMEDIATE.json');post=read(BASE/'POST.json');assert pre['status']==post['status']=='PASS_READ_ONLY_INSPECTION' and post['TLS_authorized']
 before=cats(pre);after=cats(post);inventory=read(ROOT/'database/expected-schema.json');spec=inventory['normativeLibraryAmendment']['physicalAssertions']
 actual={};checks=[]
 def check(name,ok,detail=None):
  checks.append({'name':name,'status':'PASS' if ok else 'FAIL','detail':detail});assert ok,(name,detail)
 def delta(category,key):
  a={key(x):x for x in before[category]};z={key(x):x for x in after[category]};d={'added':[z[k] for k in sorted(z.keys()-a.keys())],'removed':[a[k] for k in sorted(a.keys()-z.keys())],'changed':[{'before':a[k],'after':z[k]} for k in sorted(a.keys()&z.keys()) if a[k]!=z[k]]};actual[category]=d;return d,a,z
 relation=lambda x:x['name'];column=lambda x:x['relation']+'.'+x['name'];objectkey=lambda x:x['relation']+':'+x['name'];function=lambda x:x['name']+'('+x['arguments']+')'
 d,a,z=delta('relations',relation);check('exact_two_new_relations',set(x['name'] for x in d['added'])=={'knowledge.knowledge_version_context_links','knowledge.knowledge_source_usage_rights'} and not d['changed'] and not d['removed'])
 d,a,z=delta('columns',column);expected_columns={t['name']+'.'+c['name'] for t in inventory['tables'] for c in t['columns']};check('exact_38_added_columns_no_old_column_changes',len(d['added'])==38 and set(column(x) for x in d['added'])==expected_columns-set(a) and not d['removed'] and not d['changed'])
 d,a,z=delta('constraints',objectkey);expected={objectkey(x) for x in spec['constraints']};check('exact_constraints_including_deferred_trigger_catalog_entries',set(objectkey(x) for x in d['added'])==expected-set(a) and {objectkey(x) for x in d['removed']}=={'knowledge.knowledge_versions:uq_knowledge_versions__version_number'} and not d['changed']);check('new_constraints_validated',all(x['convalidated'] for x in d['added']))
 d,a,z=delta('indexes',objectkey);expected={objectkey(x) for x in spec['indexes']};check('exact_indexes_and_unique_replacement',set(objectkey(x) for x in d['added'])==expected-set(a) and {objectkey(x) for x in d['removed']}=={'knowledge.knowledge_versions:uq_knowledge_versions__version_number'} and not d['changed']);check('all_new_indexes_valid_ready',all(x['indisvalid'] and x['indisready'] for x in d['added']))
 d,a,z=delta('functions',function);check('exact_8_effective_functions',set(function(x) for x in d['added'])=={x['name']+'()' for x in spec['functions']} and not d['changed'] and not d['removed'])
 d,a,z=delta('triggers',objectkey);check('exact_12_triggers',set(objectkey(x) for x in d['added'])=={objectkey(x) for x in spec['triggers']} and not d['changed'] and not d['removed']);check('new_triggers_enabled',all(x['tgenabled']=='O' for x in d['added']))
 check('34_historical_ledger_records_preserved',after['ledger'][:34]==before['ledger'] and len(after['ledger'])==35)
 last=after['ledger'][-1];check('only_authorized_35_ledger_record',last['migration_id']=='20261021221204' and last['content_sha256']=='9279159e88c60fff03f998e33008fb0d675f53e4423df638c9e54f709a773798' and last['outcome']=='applied' and last['transactional'])
 fp=lambda d:{r['relation']:{'rows':r['rows'],'sha256':r['sha256']} for r in d['results'] if r['category']=='data_fingerprint'}
 first=fp(pre);second=fp(post);check('all_242_historical_business_tables_unchanged',first==second and len(first)==242)
 empty=[x for x in post['results'] if x['category']=='new_table_empty'];check('new_support_tables_empty_no_import',len(empty)==2 and all(x['rows']==0 for x in empty))
 nulls=after['new_columns_historical_null'];check('four_new_fields_remain_null_no_backfill',all(nulls[k]==0 for k in ['overrides','effective','applicability']))
 verified=read(BASE/'CANONICAL_VERIFY.json');summary=json.loads(verified['stdout']);check('canonical_schema_verifier_PASS',verified['exit_code']==0 and summary['schemaMismatches']==0 and summary['actualPhysicalTables']==244)
 check('no_delete_cascade_introduced',summary['forbiddenDeleteCascades']==0)
 apply=read(BASE/'CANONICAL_APPLY.json');lines=apply['stdout'].splitlines();check('canonical_runner_only_35_applied',apply['exit_code']==0 and sum(line.endswith(' applied') for line in lines)==1 and lines[-1]=='20261021221204 applied')
 gate=read(BASE/'GO_NO_GO.json');now=datetime.datetime.now(datetime.timezone.utc);check('completed_within_authorized_window',now<datetime.datetime.fromisoformat(gate['window_expires_utc']))
 d={'status':'PASS_PHYSICAL_ADOPTION_SCOPE_ONLY','QA_PHYSICAL_ADOPTION':'APPLIED_VERIFIED','ARCHITECTURAL_CONSISTENCY_GATE':'PASS','MIGRATION_INTEGRITY_GATE':'PASS','DATABASE_DRIFT_GATE':'PASS','POST_ADOPTION_INTEGRITY_GATE':'PASS','checks':checks,'schema_delta_counts':{k:{q:len(v[q]) for q in ['added','removed','changed']} for k,v in actual.items()},'canonical_schema_summary':summary,'historical_data_fingerprints':'242_OF_242_MATCH','QA_business_DML':'NONE','QA_technical_ledger_writes':'ONE_AUTHORIZED_MIGRATION_RECORD','runtime_RBAC_SoD_E2E':'NOT_EXECUTED_NOT_ENABLED','new_function_behavior':'Exact published definitions verified; prior isolated149 behavior tests reused, no synthetic QA writes','window_started_utc':gate['window_started_utc'],'window_expires_utc':gate['window_expires_utc'],'window_closed_utc':now.isoformat()}
 (BASE/'OBJECT_DELTAS.json').write_text(json.dumps(actual,indent=2)+'\n');(BASE/'POST_GATES.json').write_text(json.dumps(d,indent=2)+'\n');print(json.dumps({k:d[k] for k in ['QA_PHYSICAL_ADOPTION','DATABASE_DRIFT_GATE','schema_delta_counts','historical_data_fingerprints','window_closed_utc']}))
if __name__=='__main__':main()
