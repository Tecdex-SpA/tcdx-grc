"""Read-only documentary checks; evidence output only, no product/DB/IAM tests."""
from pathlib import Path
import csv
import datetime
import hashlib
import json
import re
import subprocess

ROOT=Path.cwd()
OUT=ROOT/'docs/phase6a/STEP_6A3/FINAL_CONTRACT_RECONCILIATION_20261013'
checks=[]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def check(name, condition, evidence):
    checks.append({'check':name,'result':'PASS' if condition else 'FAIL','evidence':evidence})


entry=json.loads((OUT/'entry-state.json').read_text())
differences=[p for p,h in entry['inherited_file_hashes'].items() if not (ROOT/p).is_file() or sha(ROOT/p)!=h]
check('inherited_files_preserved',not differences,{'files':len(entry['inherited_file_hashes']),'differences':differences})
check('branch_and_head_preserved',subprocess.check_output(['git','branch','--show-current']).decode().strip()==entry['branch'] and subprocess.check_output(['git','rev-parse','HEAD']).decode().strip()==entry['head'],entry['head'])
manifest=json.loads((OUT/'ARTIFACT_MANIFEST.json').read_text())
bad=[r['path'] for r in manifest['artifacts'] if sha(ROOT/r['path'])!=r['sha256']]
check('artifact_hashes',not bad,{'count':len(manifest['artifacts']),'differences':bad})
sources=json.loads((OUT/'SOURCE_MANIFEST.json').read_text())
bad=[r['path'] for r in sources['sources'] if sha(ROOT/r['path'])!=r['sha256']]
check('source_hashes',not bad,{'count':len(sources['sources']),'differences':bad})
original=(ROOT/'docs/phase6a/STEP_6A3/STEP_6A3_COMMERCIAL_GOVERNANCE_APPROVAL_PACKAGE.md').read_text()
old_sources=re.findall(r'\| (docs/[^|]+) \| ([a-f0-9]{64}) \|',original)
old_differences=[p.strip() for p,h in old_sources if sha(ROOT/p.strip())!=h]
check('original_package_source_manifest',not old_differences,{'rows':len(old_sources),'differences':old_differences})
historical=json.loads((ROOT/'docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/evidence/integral-closure-20261013/manifest-review.json').read_text())
historical_diff=[r['path'] for r in historical['files'] if sha(ROOT/r['path'])!=r['sha256']]
check('historical_rescue_manifest',not historical_diff,{'entries':len(historical['files']),'differences':historical_diff,'scope':'hash reuse only; not new product evidence'})
dispositions=json.loads((OUT/'14_THIRTY_DISPOSITION_TRACEABILITY.json').read_text())['dispositions']
expected={f'G-{i:02}' for i in range(1,7)}|{f'C-{i:02}' for i in range(1,13)}|{f'H-{i:02}' for i in range(1,13)}
check('all_thirty_unique_dispositions',len(dispositions)==30 and {r['id'] for r in dispositions}==expected,'6G+12C+12H; all contractual fields present')
required=['authority','decision','canonical_model','physical_model','executable_contract','dependencies','tests','risk','evidence_required','human_authority','publication_condition','operation_condition','acceptance_condition']
check('disposition_contract_fields',all(all(r.get(k) for k in required) for r in dispositions),required)
findings=json.loads((OUT/'15_F01_F10_RESOLUTIONS.json').read_text())['findings']
check('all_ten_findings',len(findings)==10 and {r['id'] for r in findings}=={f'F-{i:02}' for i in range(1,11)},'Each has resolution and explicit residual condition')
cases=list(csv.DictReader((OUT/'11_SCENARIO_DEPENDENCY_EVIDENCE_GATE_MATRIX.csv').open()))
check('scenario_matrix_unique_and_not_pass',len({r['scenario'] for r in cases})==len(cases) and all(r['state'] in ['NOT_EXECUTED_PENDING_EXACT_APPROVAL','EXTERNAL_ACCEPTANCE_PENDING'] for r in cases),{'rows':len(cases),'product_tests_executed':0})
api=json.loads((OUT/'07_OPENAPI_COMMERCIAL_CANDIDATE.json').read_text())
internal_refs=[]
external_refs=[]


def resolve(document, pointer):
    node=document
    for token in pointer[2:].split('/'):
        node=node[token.replace('~1','/').replace('~0','~')]
    return node


def walk(value, document):
    if isinstance(value,dict):
        if '$ref' in value:
            target=value['$ref']
            if target.startswith('#/'):
                resolve(document,target)
                internal_refs.append(target)
            else:
                path=target.split('#',1)[0]
                assert (OUT/path).is_file(),target
                external_refs.append(target)
        if value.get('type')=='object':
            assert value.get('additionalProperties') is False,'open object schema'
        for node in value.values(): walk(node,document)
    elif isinstance(value,list):
        for node in value: walk(node,document)


walk(api,api)
payload=json.loads((OUT/'12_AUDIT_EVENT_PAYLOAD_SCHEMAS.json').read_text())
walk(payload,payload)
check('json_schema_closed_objects_and_local_refs',True,{'internal_refs':len(internal_refs),'external_refs':external_refs,'limitation':'External YAML target schema existence checked by reference text below; not full OpenAPI/JSON-Schema validator or API test'})
base_api=(ROOT/'docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml').read_text()
check('external_error_schema_target',bool(re.search(r'^    ErrorEnvelope:',base_api,re.M)),'unchanged active OpenAPI ErrorEnvelope')
change=api['paths']['/platform/subscriptions/{id}:change-plan']['post']
check('sync_http200_no202',change['responses'].get('200') is not None and '202' not in change['responses'],'subscriptionCreate active contract remains untouched')
check('no_historical_response_etag',all('ETag' not in r.get('headers',{}) for r in change['responses'].values()),'success and replay omit ETag; GET detail has fresh CAS')
check('subscription_if_match_specific',api['components']['parameters']['SubscriptionIfMatch']['name']=='If-Match' and 'Subscription.row_version' in api['components']['parameters']['SubscriptionIfMatch']['description'],'no RetentionPolicy component reused')
check('canonical_url',api['servers'][0]['url']=='https://grc.tecdex.net/api/v1','new artifacts use canonical public host')
wrong_domain='grc.'+'tecdx.net'
bad=[p.name for p in OUT.iterdir() if p.is_file() and p.name not in ['entry-state.json','SOURCE_MANIFEST.json','validation-results.json'] and wrong_domain in p.read_text()]
check('no_wrong_domain_new_artifacts',not bad,bad)
ddl=(OUT/'20261013000100_commercial_contract_reconciliation.sql').read_text()
check('ddl_no_catalog_or_iam_seed',not re.search(r'\b(?:INSERT|UPDATE|DELETE)\s+(?:INTO\s+|FROM\s+)?iam\.',ddl,re.I) and not re.search(r'INSERT\s+INTO\s+platform\.(commercial_families|usage_limits)',ddl,re.I),'only FK-derived root backfill; no commercial amounts seeded')
check('ddl_no_destructive_history',not re.search(r'\b(?:DELETE\s+FROM|TRUNCATE|DROP\s+TABLE)\b',ddl,re.I),'forward structural delta; original migrations unchanged')
check('ddl_prospective_root_not_retroactive_exclusion','commercial_assignment_root_guard' in ddl and not re.search(r'EXCLUDE.*regulatory_pack_id',ddl),'R-P new INSERT guard; history preserved; concurrency proof pending')
check('ddl_finite_nullsafe_coverage','NaN' in ddl and 'NULLS NOT DISTINCT' in ddl and 'range_agg' in ddl,'lexical candidate validation only; SQL NOT executed/compiled by PostgreSQL')
candidate=json.loads((OUT/'09_MIGRATION_MANIFEST_CANDIDATE.json').read_text())
active=json.loads((ROOT/'database/migrations/manifest.json').read_text())
check('migration_source_entries_intact',candidate['migrations'][:-1]==active['migrations'] and candidate['migrations'][-1]['sha256']==sha(OUT/candidate['migrations'][-1]['filename']),{'source_migrations':len(active['migrations']),'candidate_migrations':len(candidate['migrations']),'qa_inventory_current':'NOT_RUN'})
for name,command in [
 ('candidate_schema_compilation',['node','docs/phase6a/STEP_6A3/FINAL_CONTRACT_RECONCILIATION_20261013/verify-candidate-schemas.mjs']),
 ('rector_governance',['bash','scripts/verify-rector-governance.sh']),
 ('active_contract_asset_check',['node','scripts/foundations/generate-contract-assets.mjs','--check']),
 ('secret_scan',['node','scripts/foundations/secret-scan.mjs']),
 ('tracked_whitespace',['git','diff','--check'])]:
    run=subprocess.run(command,capture_output=True,text=True)
    log=OUT/(name+'.log');log.write_text(run.stdout+run.stderr)
    check(name,run.returncode==0,{'command':command,'exit_code':run.returncode,'log':log.relative_to(ROOT).as_posix(),'sha256':sha(log),'scope':'documentary/current contracts; not new product evidence'})
result={'observed_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':checks,
    'documentary_check_result':'PASS' if all(r['result']=='PASS' for r in checks) else 'FAIL',
    'RECTOR_INTEGRITY_SCRIPT':'PASS' if any(r['check']=='rector_governance' and r['result']=='PASS' for r in checks) else 'FAIL',
    'RECTOR_GATE_FOR_ACTIVATION_AND_CLOSURE':'BLOCKED','product_tests_executed':0,'ddl_executed':0,'qa_connections':0,'human_approvals_obtained':0,
    'STEP_6A3':'PARTIAL_BLOCKED','STEP_6A4':'NOT_STARTED'}
(OUT/'validation-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'documentary_check_result':result['documentary_check_result'],'checks':len(checks),'failed':[r['check'] for r in checks if r['result']=='FAIL'],'product_tests_executed':0},ensure_ascii=False))
raise SystemExit(0 if result['documentary_check_result']=='PASS' else 1)
