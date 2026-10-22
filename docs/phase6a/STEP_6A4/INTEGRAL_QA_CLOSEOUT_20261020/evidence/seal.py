import pathlib,json,csv,hashlib,subprocess,shutil,datetime,re
R=pathlib.Path('/Users/andresbarouh/repos/tcdx-grc');O=R/'docs/phase6a/STEP_6A4/INTEGRAL_QA_CLOSEOUT_20261020';E=O/'evidence'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def rows(p):return list(csv.DictReader(p.open()))
for src,dst in [('/private/tmp/step6a4-integral-qa.py','operator.py'),('/private/tmp/step6a4-integral-browser-followup.cjs','browser-followup-operator.cjs'),('/private/tmp/step6a4-integral-consolidate.py','consolidate.py'),('/private/tmp/step6a4-integral-seal.py','seal.py')]:shutil.copyfile(src,E/dst)
checks=[]
p3=['Formulario visible','Tipo de origen','Registro de origen','Ausencia de origen','Mensaje comprensible','Foco al selector','Selección de requisito','Dependencia de marco normativo','Cambio entre marcos distintos','Limpieza de requisito anterior','Cambio de tipo','Limpieza de referencias incompatibles','Limpieza responsable dependiente','Opcionales identificados','Cancelación sin persistencia']
p5=['Formulario visible','Tipo de origen','Registro de origen','Ausencia de origen','Mensaje comprensible','Foco al selector','Evaluación de requisito','Evaluación de control','Prueba de control','Cambio entre tipos','Una sola referencia activa','Limpieza de referencias incompatibles','Cancelación sin persistencia']
for group,names in [('P3',p3),('P5',p5)]:
 for n,name in enumerate(names,1):
  status='PASS_QA_NON_DESTRUCTIVE';limit='UI/read only; no business command or persistence claim'
  if group=='P3' and n==9:status='BLOCKED_QA_SECOND_FRAMEWORK_UNAVAILABLE';limit='Single eligible framework; reset/reselect verified in QA; distinct-framework change PASS local simulated only'
  if (group,n) in [('P3',12),('P5',11),('P5',12)]:limit='UI exclusive selector observed in QA; request-FK exclusivity verified locally, no real payload submitted'
  if group=='P3' and n==13:limit='QA type-change reset verified with eligible assignee; record-change within same type retains focused local evidence'
  checks.append({'CHECK_ID':group+'-'+str(n).zfill(2),'CHECK':name,'RESULT':status,'QA_EVIDENCE':'evidence/browser-followup/browser-result.json; evidence/browser-result.json; screenshots','LOCAL_EVIDENCE':'../REFERENCE_CORRECTION_20261020/evidence/unit.txt; browser-retry.txt; source seal','LIMIT':limit,'HUMAN':'PENDING; REPORT.md guide'})
with (O/'P3_P5_CHECKS.csv').open('w') as f:
 w=csv.DictWriter(f,fieldnames=list(checks[0]));w.writeheader();w.writerows(checks)
assert len(checks)==28
assert len(rows(O/'COVERAGE_42.csv'))==42 and len(rows(O/'REFERENCE_TRACEABILITY_95.csv'))==95
assert sum(x['TRANSACTIONAL_RESULT']=='PASS' for x in rows(O/'COVERAGE_42.csv'))==1
assert (O/'REFERENCE_TRACEABILITY_95.csv').read_bytes()==(R/'docs/phase6a/STEP_6A4/REFERENCE_INVENTORY.csv').read_bytes()
for p,h in json.loads((E/'REUSED_EVIDENCE_SHA256.json').read_text()).items():assert sha(R/p)==h,p
for filename in ['browser-result.json','browser-followup/browser-result.json']:
 v=json.loads((E/filename).read_text());assert v['business_writes']==0 and not v['api_mocking'] and not v['blocked'];assert all(x['method']=='GET' for x in v['events']);assert len(v['results'])==4
assert json.loads((E/'runtime-configuration-comparison.json').read_text())['status']=='PASS'
git=lambda *a:subprocess.check_output(['git',*a],cwd=R,text=True).strip()
before=json.loads((E/'git-entry.json').read_text());assert git('branch','--show-current')==before['branch'] and git('rev-parse','HEAD')==before['head'];assert hashlib.sha256(subprocess.check_output(['git','diff','--cached','--binary'],cwd=R)).hexdigest()==before['index_sha256']
p=subprocess.run(['git','diff','--check'],cwd=R,text=True,capture_output=True);(E/'delivery-whitespace.log').write_text(p.stdout+p.stderr);assert p.returncode==0
entry=json.loads((E/'workspace-entry.json').read_text());status='docs/governance/MASTER_EXECUTION_STATUS.md';marker='\n\n## STEP6A4 — despliegue integral QA P3/P5 y preparación de cierre, 2026-10-20\n'
assert hashlib.sha256((R/status).read_text().split(marker)[0].encode()).hexdigest()==entry[status]
assert all(sha(R/p)==h for p,h in entry.items() if p!=status)
new_paths=sorted(str(p.relative_to(R)) for p in O.rglob('*') if p.is_file())
files={'preexisting_changed_append_only':[status],'new_directory':str(O.relative_to(R)),'new_files':new_paths,'product_source_files_modified_in_this_task':[]}
(E/'CHANGED_FILES.json').write_text(json.dumps(files,indent=2)+'\n')
v={'status':'PASS','time':datetime.datetime.now(datetime.timezone.utc).isoformat(),'forms':42,'references':95,'focused_checks':28,'transactional_pass_preserved':1,'transactional_blocked':41,'new_business_writes':0,'new_business_api_mutating_attempts':0,'baseline':'TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16','branch':before['branch'],'head':before['head'],'index_preserved':True,'preexisting_files':len(entry),'append_only_status':status,'historical_evidence_preserved':True,'rector_delivery_exit_code':0,'scope_and_layers':'Frontend rollout only; documentation appended. No source/schema/backend/contracts/IAM changes by this task.','limitations':['41 commands and real security negatives pending','Human acceptance pending','Second eligible framework unavailable in QA','No certification of universal absence of implementation debt']}
(E/'FINAL_INTEGRITY.json').write_text(json.dumps(v,indent=2)+'\n')
# Validate relative documentation links after all final artifacts exist.
for target in re.findall(r'\]\(([^)]+)\)',(O/'REPORT.md').read_text()):
 if not target.startswith('https:'):assert (O/target).exists(),target
manifest={str(p.relative_to(R)):sha(p) for p in sorted(O.rglob('*')) if p.is_file() and p.name!='SHA256SUMS.txt'}
(O/'SHA256SUMS.txt').write_text(''.join(h+'  '+p+'\n' for p,h in manifest.items()))
assert all(sha(R/p)==h for p,h in manifest.items())
print(json.dumps({'status':'PASS','sealed_files':len(manifest),'preexisting_preserved_except_status_append':len(entry)-1,'rector_delivery':'PASS','git_preserved':True}))
