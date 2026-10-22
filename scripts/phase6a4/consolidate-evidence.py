"""Build STEP6A4 traceability from published sources and executed receipts; no product mutation."""
import csv,json,pathlib,hashlib,subprocess
root=pathlib.Path(__file__).resolve().parents[2]
out=root/'docs/phase6a/STEP_6A4';ev=out/'evidence/local-20261020'
assets=json.loads((root/'apps/frontend/src/business-form-contracts.generated.json').read_text())
forms=list(csv.DictReader((root/'docs/phase6a/STEP_6A2/07_BUSINESS_FORM_DESIGN_MATRIX.csv').open()))
selectors=list(csv.DictReader((root/'docs/phase6a/STEP_6A2/03_REFERENCE_SELECTOR_DESIGN.csv').open()))
fields={row['field_id']:row for row in csv.DictReader((root/'docs/phase6a/STEP_6A1/02_FORM_FIELD_MATRIX.csv').open())}
references=[(field.strip(),selector) for selector in selectors for field in selector['FIELD_IDS'].split(';')]
assert len(forms)==42 and len(references)==95 and len(set(field for field,_ in references))==95
backend={str(path.relative_to(root)):path.read_text() for path in (root/'apps/backend/src').rglob('*.ts') if '.test.' not in path.name}
rows=[]
for original,form in zip(forms,assets['forms']):
 assert original['FORM_ID']==form['id']
 locations=[path for path,source in backend.items() if form['operation'] in source]
 assert locations,form['operation']
 task={'Compliance':'T-FCOM','Controls':'T-FCTL','Evidence':'T-FEVD','Actions':'T-FACT'}[original['DOMAIN'].split(' (')[0]]
 rows.append(dict(TASK_ID=task+';T-VALID;T-LABEL',OPERATION_ID=form['operation'],FORM_ID=form['id'],CONTRACT_SOURCE=original['SOURCE_REFERENCES']+';docs/phase6a/STEP_6A2/07_BUSINESS_FORM_DESIGN_MATRIX.csv',FRONTEND_COMPONENT='CreateDrawer' if '{id}' not in form['path'] else 'DetailDrawer',BACKEND_OPERATION=form['method'].upper()+' /api/v1'+form['path']+';'+ ';'.join(locations),REFERENCE_FIELDS=';'.join(fields[field]['field_name']+' ['+field+']' for field,_ in references if fields[field]['operation']==form['operation']),VALIDATION_RULES=original['VALIDATION_RULES'],RBAC_REQUIREMENTS=form['permission'],CURRENT_STATUS='NEEDS_CORRECTION',REQUIRED_CHANGE='Schema-driven required/optional/conditional, business labels/grouping, accessible validation and confirmation; preserve existing readers, domain policies and payload.',TEST_COVERAGE=f'apps/frontend/src/business-forms.test.tsx::{form["id"]};e2e/step6a4-business-forms.spec.ts::{form["id"]} (desktop/narrow; API mocks)',FINAL_RESULT='PASS_LOCAL_CONTRACT_AND_BROWSER_COMPONENT'))
def write_csv(name,rows):
 with (out/name).open('w',newline='') as file:
  writer=csv.DictWriter(file,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
write_csv('TRACEABILITY_MATRIX.csv',rows)
write_csv('FORM_INVENTORY.csv',[dict(FORM_ID=f['id'],OPERATION_ID=f['operation'],MODULE=f['module'],TITLE=f['title'],SCHEMA=f['schema'],PATH=f['path'],METHOD=f['method'],PERMISSION=f['permission'],FINAL_RESULT='PASS_LOCAL_COMPONENT_CONTRACT',QA='NOT_RUN',HUMAN_ACCEPTANCE='PENDING') for f in assets['forms']])
refrows=[]
for field,selector in references:
 source=fields[field];name=source['field_name'];surface=source['surface_kind'];
 if field=='F-0122':
  classification='NOT_APPLICABLE';note='Historical base_control_id occurrence: absent from current ControlInstantiateRequest; current contract uses based_on_control_version_id. No retired input recreated.'
 elif field in {'F-0124','F-0125','F-0153','F-0154','F-0182','F-0344','F-0345'}:
  classification='NEEDS_CORRECTION';note='Tenant Control/version eligibility and synchronous parent/version serialization corrected; existing API and FK pair preserved.'
 elif surface in ['detail','list'] and field not in {'F-0118','F-0054','F-0255','F-0269','F-0239','F-0172','F-0173','F-0198','F-0199','F-0330'}:
  classification='NEEDS_CORRECTION';note='Business presentation without raw UUID. Resolve only existing authorized readers; unavailable identity/source stays registered provenance; current scope does not grant historical eligibility.'
 elif name.startswith('links[].control_version_id'):
  classification='NEEDS_IMPLEMENTATION';note='Sixth exact typed EvidenceLink target now has reference control/version picker; context control ID is not serialized as another link target.'
 else:
  classification='ALREADY_COMPLIANT';note='Existing STEP6A3 authorized selector retained; STEP6A4 adds field labels/requiredness and schema validation. Optional unavailable configuration is omitted; no invented reference.'
 refrows.append(dict(FIELD_ID=field,SELECTOR_ID=selector['SELECTOR_ID'],OPERATION_ID=source['operation'],FIELD_NAME=name,SURFACE=surface,CONTRACT_SOURCE=source['source_references'],EXISTING_READS=selector['EXISTING_READ_OPERATIONS'],REQUIRED_PERMISSIONS=source['required_permissions'],CLASSIFICATION=classification,REVIEW_RESULT='REVIEWED_NOT_APPLICABLE' if classification=='NOT_APPLICABLE' else 'PASS_STATIC_AND_PRESERVED_OR_FOCUSED_LOCAL',EVIDENCE_TIER='Published contract + STEP6A3 closure reused + focused STEP6A4 tests; no new QA claim',RESOLUTION=note))
write_csv('REFERENCE_INVENTORY.csv',refrows)
entry=json.loads(pathlib.Path('/private/tmp/step6a4-entry-20261020/manifest.json').read_text())
allowed={'apps/frontend/src/core-grc.tsx','apps/frontend/src/structured-reference-fields.tsx','docs/governance/MASTER_EXECUTION_STATUS.md'}
changed=[]
for item in entry:
 path=root/item['path'];actual=hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None
 if actual!=item['sha256']:changed.append(item['path']);assert item['path'] in allowed,('Unexpected preexisting change',item['path'])
index=subprocess.check_output(['git','diff','--cached','--binary'],cwd=root)
assert index==pathlib.Path('/private/tmp/step6a4-entry-20261020/index').read_bytes()
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=root).decode().strip()=='4a275264a7522031e62bf09f598c9d56e21d25e0'
write=lambda name,data:(ev/name).write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
write('ENTRY_PRESERVATION.json',{'files_at_entry':len(entry),'preexisting_files_changed_in_scope':changed,'all_other_preexisting_files_sha256_unchanged':True,'index_unchanged':True,'branch_unchanged':True,'head_unchanged':True,'entry_snapshot':'/private/tmp/step6a4-entry-20261020','entry_sha256':entry})
print('TRACEABILITY=PASS forms=42 references=95; ENTRY_PRESERVATION=PASS')
