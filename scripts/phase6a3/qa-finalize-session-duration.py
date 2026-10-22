"""Finalize only after real browser continuity, logout/revocation and QA health pass."""
import hashlib,json,pathlib,subprocess,urllib.request
root=pathlib.Path(__file__).resolve().parents[2]
evidence=root/'docs/phase6a/STEP_6A3/evidence/session-duration-20261019'
runtime=json.loads((evidence/'browser-runtime.json').read_text())
assert runtime['state']=='PASS', 'REAL_BROWSER_VALIDATION_REQUIRED'
assert len(runtime['samples']) >= 31 and runtime['samples'][-1]['elapsedSeconds'] >= 1800
assert all(sample['authenticated'] and sample['status']==200 for sample in runtime['samples'])
assert runtime['initialRenewal']['status']==200
assert runtime['logout']=={'status':204,'accessStatus':401,'refreshStatus':401,'storageCleared':True}
result=json.loads((evidence/'RESULT.json').read_text())
assert (root/'docs/rector/BASELINE_ID').read_text().strip()==result['master_regent']
images=json.loads((evidence/'deployed-images.json').read_text())
health={}
remote="""import json,subprocess,sys
name=sys.argv[1]
c=json.loads(subprocess.check_output(['docker','inspect',name]))[0]
print(json.dumps({'name':name,'image_id':c['Image'],'running':c['State']['Running'],'health':c['State'].get('Health',{}).get('Status'),'restart_count':c['RestartCount']}))
"""
for component,record in images.items():
 done=subprocess.run(['ssh','tecdex@'+record['host'],'python3 - tcdx-grc-'+component],input=remote,capture_output=True,text=True,check=True)
 value=json.loads(done.stdout)
 assert value['image_id']==record['image_id'] and value['running'] and value['health']=='healthy' and value['restart_count']==0
 health[component]=value
with urllib.request.urlopen('https://grc.tecdex.net/',timeout=15) as response:
 assert response.status==200
 health['public_https']={'status':response.status,'tls_certificate_validation':'PASS'}
(evidence/'final-qa-health.json').write_text(json.dumps(health,indent=2)+'\n')
code=(root/'scripts/phase6a3/qa-session-runtime-receipt.cjs').read_text()
since=runtime['login']['at']
done=subprocess.run(['ssh','tecdex@192.168.2.45','docker exec -i tcdx-grc-backend node - '+since],input=code,capture_output=True,text=True,check=True)
audit=json.loads(done.stdout)
assert any(event['command_code']=='oidc.session.renew' and event['events']>0 for event in audit['audit'])
assert any(event['revoked_before_expiry'] for event in audit['revocations'])
(evidence/'runtime-audit-readonly.json').write_text(json.dumps(audit,indent=2)+'\n')
renewals=sum(item['status']==200 for item in runtime['refreshResponses'])
result.update(runtime_validation={'status':'PASS','login_mfa':'PASS','native_refresh_successes':renewals,'continuous_authenticated_seconds':runtime['samples'][-1]['elapsedSeconds'],'read_samples':len(runtime['samples']),'logout':'PASS_204','revoked_access_reuse':'DENY_401','revoked_renewal_reuse':'DENY_401','revocation_before_token_expiry':'PASS_READ_ONLY_AUDIT','credential_storage_cleared':True},qa_health=health)
result['implementation_files'].append('scripts/phase6a3/qa-finalize-session-duration.py')
(evidence/'RESULT.json').write_text(json.dumps(result,indent=2)+'\n')
checks=json.loads((evidence/'checks.json').read_text())
checks['runtime_30_minutes']='PASS_REAL_TIME_BROWSER'
checks['runtime_audit']='PASS_READ_ONLY_RENEWALS_AND_REVOCATION_BEFORE_EXPIRY'
checks['qa_final_health']='PASS_HEALTHY_ZERO_RESTARTS_HTTPS_VALID'
(evidence/'checks.json').write_text(json.dumps(checks,indent=2)+'\n')
report=root/'docs/phase6a/STEP_6A3/SESSION_DURATION_QA_REPORT_20261019.md'
report.write_text(f'''# STEP6A3 — duración de sesión QA

`RECTOR_GATE=PASS` para la corrección acotada. `MASTER_REGENT={result['master_regent']}`. `STEP6A3=PARTIAL_BLOCKED`; aceptación funcional/UI pendiente. `STEP6A4=NOT_STARTED`.

La instrucción PO del 2026-10-19 autoriza exclusivamente esta corrección y su despliegue QA. No se reabre gobernanza ni se atribuye aceptación funcional al login de prueba.

Causa: el JWT TCDX vencía a los 300 segundos, el backend descartaba el refresh token externo y el frontend no renovaba. Keycloak ya permitía 1800 segundos de inactividad y 36000 de duración absoluta; el cliente heredaba esos límites. No se modificó el realm.

Ahora: JWT TCDX de 300 segundos renovable por demanda, con refresh externo custodiado sólo en memoria del backend, inactividad configurada de 1800 segundos y máximo original de 36000. Se verifican MFA, identidad/sesión original, firma, tiempos, identidad canónica activa y revocación antes de rotar el token; se audita la emisión y se revoca el anterior. OIDC Core §12.2 permite omitir nonce sólo en el ID token de refresh; si aparece debe coincidir. El callback inicial sigue exigiéndolo.

Validación focalizada: 37 pruebas distintas PASS; regresiones de nonce/MFA PASS; typecheck y builds backend/frontend PASS; integridad rectora PASS. Alcance de imagen PASS: sólo módulos de autenticación/configuración y salidas compiladas correspondientes; estilos/activos visuales byte-idénticos. Los intentos de medición anteriores quedan registrados sin atribuirles PASS.

QA real: login MFA, {renewals} renovaciones HTTP 200 y {len(runtime['samples'])} lecturas autenticadas HTTP 200 durante {runtime['samples'][-1]['elapsedSeconds']} segundos. Cierre manual HTTP 204; reutilización del token revocado en API y refresh HTTP 401; almacenamiento de sesión eliminado. Lectura de auditoría confirma revocación antes del vencimiento del token. Backend/frontend healthy, cero reinicios, HTTPS público 200/TLS válido. Contenedores anteriores retenidos para rollback y parámetros persistidos en la configuración QA existente.

No cambian esquema, roles/permisos, modelo canónico, aislamiento multi-tenant, políticas de MFA, cookies, topología ni producción. Cambian backend, gestión de sesión del frontend, contrato ejecutable de autenticación y despliegue/configuración QA. Sin conflictos rectores nuevos; no se cierra STEP6A3.

Traza: instrucción PO → rector26/45/46 → ejecutables21 §2 y22 MI-006/007/012/015 → DELTA STEP_6A3_QA_SESSION_DURATION_20261019 → módulos de sesión → pruebas focalizadas → imágenes QA → browser-runtime.json y runtime-audit-readonly.json. Recibos, configuración anterior/nueva y lista completa de archivos: [RESULT.json](evidence/session-duration-20261019/RESULT.json).

Archivos de implementación modificados o creados:

'''+''.join('- `'+path+'`\n' for path in result['implementation_files']))
status=root/'docs/governance/MASTER_EXECUTION_STATUS.md'
marker='## STEP_6A3 — duración de sesión QA, 2026-10-19'
text=status.read_text()
assert marker not in text, 'CHECKPOINT_ALREADY_EXISTS'
status.write_text(text+f'''\n\n{marker}

`MASTER_REGENT={result['master_regent']}`; `RECTOR_GATE=PASS` para esta corrección; `STEP6A3=PARTIAL_BLOCKED`; `STEP6A4=NOT_STARTED`; aceptación funcional/UI pendiente. Causa: JWT TCDX de 300s sin renovación; realm existente idle1800/max36000, cliente heredado. Se conservan esos límites y se implementa renovación gobernada con refresh externo sólo en memoria backend, MFA, identidad/sesión original, revocación y auditoría. QA únicamente: backend/frontend healthy/cero reinicios, HTTPS200/TLS válido y rollback retenido. 37 pruebas distintas, regresión nonce/MFA, typecheck/build e integridad PASS. Navegador real: {renewals} renovaciones200 y {len(runtime['samples'])} lecturas200 durante {runtime['samples'][-1]['elapsedSeconds']}s; logout204, reutilización revocada API/refresh401 y auditoría de revocación antes de exp PASS. Sin cambios de esquema/RBAC/realm/cookies/topología/producción. Traza y archivos: SESSION_DURATION_QA_REPORT_20261019.md y evidence/session-duration-20261019/RESULT.json. No se declara aceptación ni cierre6A3.
''')
paths=[root/path for path in result['implementation_files']]+[report]
paths += [path for path in evidence.iterdir() if path.is_file() and path.name!='SHA256SUMS.txt']
(evidence/'SHA256SUMS.txt').write_text(''.join(hashlib.sha256(path.read_bytes()).hexdigest()+'  '+str(path.relative_to(root))+'\n' for path in sorted(set(paths))))
print(json.dumps({'status':'PASS','authenticated_seconds':runtime['samples'][-1]['elapsedSeconds'],'refresh_successes':renewals,'report':str(report)}))
