"""Consolidate observed STEP6A4 QA evidence without assigning simulated runtime PASS."""
import collections,csv,datetime,hashlib,json,pathlib,re,subprocess
ROOT=pathlib.Path(__file__).resolve().parents[2]
BASE=ROOT/'docs/phase6a/STEP_6A4'
OUT=BASE/'evidence/qa-20261020'
assert not (OUT/'SHA256SUMS.txt').exists(), 'QA_EVIDENCE_ALREADY_SEALED_DO_NOT_OVERWRITE'
def save(n,v): (OUT/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def write_csv(n,rows):
 with (OUT/n).open('w',newline='') as f:
  w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
forms=list(csv.DictReader((BASE/'FORM_INVENTORY.csv').open()))
refs=list(csv.DictReader((BASE/'REFERENCE_INVENTORY.csv').open()))
assert len(forms)==42 and len(refs)==95
observed={f['FORM_ID']:f['FORM_ID'] for f in forms if (OUT/(f['FORM_ID']+'-desktop.txt')).exists()}
observed.update({'FORM-05':'FORM-05-confirmation','FORM-07':'FORM-07-confirmation','FORM-13':'controls-assessment-existing-1','FORM-14':'controls-assessment-existing-2'})
context={'cumplimiento':'applicability-existing-1','requisitos':'requisitos-existing-1','soa':'soa-existing-1','controles':'FORM-10','evaluaciones-control':'controls-assessment-existing-1','pruebas':'assurance-existing-1','solicitudes-evidencia':'request-existing-1','evidencias':'evidence-existing-legacy','retencion':'retention-existing-states','issues':'issue-existing-1','acciones':'action-existing-1'}
reasons={
'cumplimiento':'La aplicabilidad existente está aprobada. Crear/enviar/aprobar otra requiere alcance y decisión auténticos; no se modifica la aceptada.',
'requisitos':'Existe evaluación no evaluada y otra evaluada; iniciar/aprobar cambian estado. Registrar resultado exige juicio/evidencia auténticos; aprobación con SoD por objeto.',
'soa':'La SoA existente está publicada. Crear/publicar otra requiere título, selección, justificación y decisión aprobada reales.',
'controles':'Instanciar control requiere código, objetivo, propietario y métodos auténticos. No se duplica el control de STEP6A3.',
'evaluaciones-control':'Existen evaluaciones en progreso, completada y aprobada. Completar/revisar exige resultado/decisión auténticos; no se alteran para obtener cobertura.',
'pruebas':'La prueba visible está aprobada. Planificar/iniciar/ejecutar/revisar otra requiere prueba y muestras auténticas; no se retrocede el estado existente.',
'solicitudes-evidencia':'La solicitud visible está atendida. Crear/cumplir otra requiere solicitud y evidencia elegibles auténticas.',
'evidencias':'La creación requiere archivo/procedencia reales. La sesión no ofrece transiciones sobre el registro legado consultado; usar actor/objeto elegible y SoD. No se repite aceptación STEP6A3.',
'retencion':'Las políticas visibles están publicadas. Nueva política/borrador/revisión/aprobación/publicación requieren decisión auténtica de conservación y actores autorizados.',
'issues':'El hallazgo visible tiene cierre verificado. Otro hallazgo y sus decisiones/transiciones requieren hechos auténticos; no se reabre ni altera el cerrado.',
'acciones':'La acción visible está verificada. Otra acción y sus transiciones requieren hallazgo, asignación, evidencia y decisión auténticos.'}
rows=[]
for f in forms:
 fid=f['FORM_ID'];stem=observed.get(fid,context[f['MODULE']]);file=stem+('-desktop.txt' if (OUT/(stem+'-desktop.txt')).exists() else '.txt')
 assert (OUT/file).exists(),file
 rows.append(dict(FORM_ID=fid,OPERATION_ID=f['OPERATION_ID'],TITLE=f['TITLE'],MODULE=f['MODULE'],REQUIRED_PERMISSION=f['PERMISSION'],REAL_UI='OBSERVED_DESKTOP_AND_390PX' if fid in observed else 'NOT_REACHABLE_IN_CURRENT_STATE_OR_SCOPE',RESULT='BLOCKED_HUMAN_ACTION',REASON=reasons[f['MODULE']],EVIDENCE=file,LOCAL_EVIDENCE='../local-20261020/RESULT.json (component API mocks; not runtime)',REAL_COMMAND='NOT_EXECUTED',PERSISTENCE='NOT_VERIFIED',HUMAN_ACCEPTANCE='PENDING'))
write_csv('FORM_QA_MATRIX.csv',rows)
labels=dict(re.findall(r'^\s*(\w+): "([^"]+)"', (ROOT/'apps/frontend/src/i18n/display-text.ts').read_text(),re.M))
byop={f['OPERATION_ID']:f for f in forms};refrows=[]
for ref in refs:
 field=ref['FIELD_NAME'];f=byop.get(ref['OPERATION_ID']);evidence='../../REFERENCE_INVENTORY.csv';ui='NOT_OBSERVED';note='Runtime del campo requiere objeto/actor/contexto elegible; revisión local sellada preservada.'
 if f and f['FORM_ID'] in observed:
  stem=observed[f['FORM_ID']];jp=OUT/(stem+'-desktop.json');j=json.loads(jp.read_text())
  leaf=field.split('.')[-1];label=labels.get(leaf,'');matching=[x for x in j['fields'] if label and x.get('label')==label]
  if matching:
   evidence=jp.name;ui='FIELD_OBSERVED_READ_ONLY';note='Campo/etiqueta visible en UI real. No acredita payload, escritura, auditoría ni aislamiento.'
 if ref['FIELD_ID']=='F-0122':
  result='NOT_APPLICABLE';note='Referencia histórica retirada; no se recrea base_control_id. Contrato actual based_on_control_version_id.'
 else:result='BLOCKED_HUMAN_ACTION'
 refrows.append(dict(FIELD_ID=ref['FIELD_ID'],OPERATION_ID=ref['OPERATION_ID'],FIELD_NAME=field,SURFACE=ref['SURFACE'],REQUIRED_PERMISSIONS=ref['REQUIRED_PERMISSIONS'],CLASSIFICATION=result,UI_OBSERVATION=ui,EVIDENCE=evidence,LOCAL_REVIEW=ref['REVIEW_RESULT'],LIMIT=note))
write_csv('REFERENCE_QA_MATRIX.csv',refrows)
entry=json.loads((OUT/'workspace-entry-sha256.json').read_text());changed=[p for p,h in entry.items() if not (ROOT/p).is_file() or hashlib.sha256((ROOT/p).read_bytes()).hexdigest()!=h]
assert not changed,changed
assert subprocess.check_output(['git','diff','--cached','--binary'])==(OUT/'index-entry.diff').read_bytes()
assert subprocess.check_output(['git','branch','--show-current'],text=True).strip()=='fix/step6a3-v112-continuity-20261016'
assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()=='4a275264a7522031e62bf09f598c9d56e21d25e0'
sealed=0
for line in (BASE/'evidence/local-20261020/SHA256SUMS.txt').read_text().splitlines():
 h,p=line.split(None,1);assert hashlib.sha256((ROOT/p.strip().lstrip('*')).read_bytes()).hexdigest()==h;sealed+=1
save('PRESERVATION.json',{'status':'PASS','entry_files_verified':len(entry),'preexisting_files_changed':changed,'index_unchanged':True,'branch_and_head_unchanged':True,'sealed_local_files_verified':sealed,'STEP6A3_evidence_untouched':True})
checks=[]
for name,cmd in [('rector-final',['bash','scripts/verify-rector-governance.sh']),('contract-assets',['node','scripts/foundations/generate-contract-assets.mjs','--check']),('form-assets',['/Users/andresbarouh/.npm/_npx/5dad66f2cb301fc2/node_modules/node/bin/node','scripts/phase6a4/generate-form-assets.mjs','--check']),('diff-check',['git','diff','--check'])]:
 p=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True);(OUT/(name+'.log')).write_text(p.stdout+p.stderr);checks.append({'id':name,'exit_code':p.returncode,'status':'PASS' if p.returncode==0 else 'FAIL','command':cmd});assert p.returncode==0,name
save('CHECKS.json',{'checks':checks,'reused_local_checks':'../local-20261020/CHECKS.json and RESULT.json: source hashes and126 sealed files unchanged','local_browser_api':'MOCKED_COMPONENT_ONLY','qa_browser_api':'REAL_EXISTING_QA_BACKEND; no request interception or fixture API','business_mutations_executed':0})
source=json.loads((OUT/'build-source-sha256.json').read_text());assert all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h for p,h in source.items())
patterns=[rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',rb'AKIA[0-9A-Z]{16}',rb'ghp_[A-Za-z0-9]{36}',rb'eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}']
secretfiles=[str(p.relative_to(OUT)) for p in OUT.rglob('*') if p.is_file() and p.suffix not in ['.png'] and any(re.search(x,p.read_bytes()) for x in patterns)];assert not secretfiles
save('SECRET_SCAN.json',{'status':'PASS','matches':secretfiles,'scope':'build sources + compiled bundle (image-verification.json) + QA textual evidence','patterns':'private keys; AWS access key identifiers; GitHub PAT; embedded JWT; pattern-based scan'})
result={'recorded_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'PREDEPLOYMENT_GATE':'PASS','BUILD_STATUS':'PASS','QA_DEPLOYMENT':'PASS','STEP6A4_QA_VERIFICATION':'BLOCKED','STEP6A4_HUMAN_ACCEPTANCE':'PENDING','RECTOR_GATE':'PASS','STEP6A4_CLOSURE':'BLOCKED','STEP6A3_CLOSURE':'PASS_PRESERVED','baseline':'TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16','forms_classified':len(rows),'forms_full_operation_PASS':0,'forms_FAIL':0,'forms_BLOCKED_HUMAN_ACTION':42,'forms_UI_observed_desktop_and_390':len(observed),'references_classified':95,'reference_fields_UI_observed_read_only':sum(x['UI_OBSERVATION']=='FIELD_OBSERVED_READ_ONLY' for x in refrows),'references_retired_not_applicable':1,'references_full_runtime_verified':0,'business_mutations_executed':0,'cross_tenant_isolation':'NOT_VERIFIED','transactional_audit':'NOT_VERIFIED','real_SoD':'NOT_VERIFIED','real_idempotency_and_conflicts':'NOT_VERIFIED','rollout_regression':'NO_CRITICAL_REGRESSION_OBSERVED_WITHIN_READ_ONLY_SCOPE','human_review_ready':'YES_PRESENTATION_REVIEW; complete functional acceptance requires genuine scenarios and actors','layers_changed':['frontend QA runtime image','deployment receipt scripts','QA evidence/documentation'],'protected_layers_changed':False}
save('RESULT.json',result)
(OUT/'git-final.txt').write_bytes(subprocess.check_output(['git','status','--short']))
print(json.dumps(result,ensure_ascii=False))
