"""Assemble the mandatory report and detached unsigned approval/checksums.

Consumes completed documentary evidence. Does not sign, approve, connect to DB,
change governance state, execute tests or run Git mutations.
"""
from pathlib import Path
import hashlib
import json
import re

ROOT=Path.cwd()
BASE=ROOT/'docs/phase6a/STEP_6A3'
OUT=BASE/'FINAL_CONTRACT_RECONCILIATION_20261013'
PACKAGE=BASE/'STEP_6A3_COMMERCIAL_GOVERNANCE_APPROVAL_PACKAGE_V2.md'
REPORT=BASE/'STEP_6A3_FINAL_CONTRACT_AND_IMPLEMENTATION_REPORT.md'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


package_sha=digest(PACKAGE)
manifest_sha=digest(OUT/'ARTIFACT_MANIFEST.json')
package=PACKAGE.read_text()
approval=re.search(r'## 9\. Texto exacto.*?```text\n(.*?)```',package,re.S).group(1)
approval=approval.replace('[SHA-256 exacto del paquete v2 recibido]',package_sha)
(OUT/'APPROVAL_TEXT_UNSIGNED.txt').write_text(approval)
manifest=json.loads((OUT/'ARTIFACT_MANIFEST.json').read_text())
validation=json.loads((OUT/'validation-results.json').read_text())
assert validation['documentary_check_result']=='PASS'
assert all(digest(ROOT/r['path'])==r['sha256'] for r in manifest['artifacts'])
resolutions=json.loads((OUT/'15_F01_F10_RESOLUTIONS.json').read_text())['findings']
rows=json.loads((OUT/'14_THIRTY_DISPOSITION_TRACEABILITY.json').read_text())['dispositions']
entry=json.loads((OUT/'entry-state.json').read_text())
document=[f"""# STEP6A3 — informe final contractual y de implementación

**Entrega de etapaA: paquete corregido revisable; implementación dependiente detenida por aprobación/publicación obligatorias. No cierre funcional ni release.**

PACKAGE_ID=GP-STEP6A3-COMMERCIAL-20261013-02
PACKAGE_SHA256={package_sha}
ARTIFACT_MANIFEST_SHA256={manifest_sha}
MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.8_2026-10-09
CODEX_VARIATION_BUDGET=ZERO
RECTOR_GATE=BLOCKED para activación y cierre
STEP_6A3=PARTIAL_BLOCKED
STEP_6A4=NOT_STARTED
TASK_PACKET_STATUS=COMPLETE para preparación documental; BLOCKED para implementación dependiente.
Supuestos usados como autoridad: NONE. Aprobaciones fabricadas:0. Archivos fuera del alcance: NONE.

## A–C. Estado inicial, final, rama y HEAD

Rama {entry['branch']}; HEAD local/remoto {entry['head']}, remoto verificado por git ls-remote. Estado inicial y final de gobernanza sin cambios. Baselinev1.8ACTIVE e integridad técnica verificada, sin editarla. Árbol heredado contiene documentación/evidencia/test previamente modificados; todos los {len(entry['inherited_file_hashes'])} archivos capturados conservan bytes. entry-state.json registra observación real y hashes; no reinterpreta las modificaciones heredadas como trabajo de esta entrega.
QA30migraciones hasta20261007000200,172permisos,0UsageLimit son observaciones HISTÓRICAS del rescate13-10; QA no consultada hoy. Manifest local vigente tiene32entradas; candidato añade33. Son ámbitos distintos, no evidencia de QA actual. Antes de QA comercial reconciliar ledger/base32 bajo sus autorizaciones propias.

## D–E. Archivos preparados y hashes exactos

Paquete v1 y DRAFT originales intactos; no sobrescritura de evidencia. Nuevos archivos sólo en FINAL_CONTRACT_RECONCILIATION_20261013/, paqueteV2 y este informe. El manifest enlaza {len(manifest['artifacts'])} artefactos/datos de entrada por hash. El manifest se vincula al paquete; hash del paquete y hash de este informe se calculan externamente para evitar autorreferencia imposible.

| Archivo nuevo revisable | SHA-256 |
| --- | --- |
| {PACKAGE.relative_to(ROOT).as_posix()} | {package_sha} |
| {OUT.relative_to(ROOT).as_posix()}/ARTIFACT_MANIFEST.json | {manifest_sha} |
"""]
for row in manifest['artifacts']:
    document.append(f"| {row['path']} | {row['sha256']} |")
document.append("\nEvidencia, logs, formulario sin firmar e informe son sidecars de entrega; sus hashes exactos están en DELIVERY_SHA256SUMS.txt. El hash de ese sidecar se comunica al entregar. No se atribuye al paquete el hash anteriorv1.\n")
document.append("## F. Resolución explícita F-01..F-10\n\n| Hallazgo | Resolución propuesta | Dependencia pendiente |\n| --- | --- | --- |")
for item in resolutions:
    document.append(f"| {item['id']} | {item['resolution']} | {item['residual_status']} |")
document.append("""

F01..08 disponen de propuestas concretas y bytes exactos. No son decisiones humanas aprobadas. F05 no declara compatibilidad externa: propone R-P, preserva coexistencias históricas, bloquea nuevas/traslados incompatibles y ofrece alternativaR-A con criterio0overlaps y nuevohash. F09 tiene requisitos/alternativas competentes; fuentes/suficiencia/representación siguen abiertas. F10 fija dependencias y conserva cierreintegral48cláusulas. Ninguna insuficiencia se oculta ni se reclasifica como PASS.

## G. Estado propuesto de las30disposiciones

Matriz14CSV/JSON incluye autoridad, decisión, modelo canónico/físico, contrato ejecutable, dependencias, artefactos, pruebas, riesgos, evidencia, aprobador y condiciones de publicación/operación/aceptación. Referencias cruzadas de revisión conjunta no son ciclos operacionales; DAG19 separa expediente/publicación/aceptación. Las H se reproducen completas del texto base y se complementan; H10 sustituye explícitamente dependencia legal universal por escenarios concretos.

| ID | Estado contractual propuesto | Dependencias principales |
| --- | --- | --- |
""")
for row in rows:
    document.append(f"| {row['id']} | {row['proposed_status']} | {row['dependencies']} |")
document.append("""

## H–I. Contratos y migración candidatos

01delta canónico/lógico/rector;02physical con3tablas comerciales, UsageLimit y lineage/root;03seguridad/TX/replay;07OpenAPI3.1JSON con4operaciones y DTOs cerrados;08mappingoperation/command/registry/Permission/policy/audit/outbox/profile;12payloadaudit;17publicationmanifest+ceremonia;18publicaciónresult;10temporal;11escenarios;19DAG;20alternativas externas. Se proponen tres permissions/grants PlatformAdmin: subscription.update/read y commercial_catalog.publish, separados y no materializados. Permiso publish sólo ceremonia interna, no CRUD ni change-plan.
DDL exacto20261013000100 y manifest09 fuera del runner activo. Rootbackfill mecánico por FK; previousNULL no inferido. Fuente32entradas/checksums preservada; sin cantidades, catálogo de datos ni IAMseed. SQL sólo revisión estática/lexical; no compilado ni ejecutado en PostgreSQL. Gatereview físico/ejecutable humano antes de DDL o implementación. expected-schema y artefactos activos futuros no se declaran aprobados por arrastre.

## J. Cambios funcionales implementados

NINGUNO en esta etapaA. Backend/frontend/DB/IAM/infra/deploy activos preservados. Se inspeccionó y documentó reutilización del alta actual y su interfaz Asignarplan. No se implementa change-plan antes de contratos exactos aprobados/publicados. Catálogo, limits, endpoint, reads, guards, audit, frontend y tests reales son el taskpacket propuesto13, no capacidades ejecutadas.

## K. Verificaciones ejecutadas

""")
document.append(f"Comprobaciones documentales: {len(validation['checks'])}/{len(validation['checks'])}PASS en validation-results.json. Observación UTC {validation['observed_at_utc']}. Alcance limitado a documentos/bytes/schemas/contratos vigentes.\n\n| Verificación | Resultado / límite |\n| --- | --- |")
for item in validation['checks']:
    evidence=item['evidence']
    summary=json.dumps(evidence,ensure_ascii=False,separators=(',',':')) if isinstance(evidence,(dict,list)) else str(evidence)
    document.append(f"| {item['check']} | {item['result']}: {summary.replace('|','/')} |")
document.append("""

Schemas candidatos:17compilados con AJV2020/yaml/ajv-formats ya fijados en contracts;4operaciones y refs comprobadas; no fixtures funcionales ni requests HTTP. Rector script exit0 verifica baseline/historia/ledger actual; su integridadPASS no desbloquea el gate comercial. Secret scanner recorre archivos nuevos y heredados, sin relajación del gate. Contracts --check vigente y whitespacePASS. Ninguna suite histórica intacta reejecutada por trámite.
Evidencia anterior771unit/contractPASS,120PGPASS,typecheck/lint/build/integridad/secretsPASS se conserva únicamente como HISTÓRICA. manifest-review del rescate y27fuentes del paquetev1 se verificaron por hash; no acreditan schemaSQL/change-plan nuevo. Conteos exactos de archivos históricos están en validation-results; no sumar fixtures a producto.

## L. Pruebas pendientes y criterios

84filas de escenarios:46comerciales nuevos/dirigidos,18RBAC heredados,8CFG heredados,12VOC heredados. Todas NOT_EXECUTED_PENDING_EXACT_APPROVAL o EXTERNAL_ACCEPTANCE_PENDING; ningunaPASS.16casos temporales V1..V16. Matriz11 indica contrato/dependencia/evidencia/gate/owner/estado/resultado por escenario.
Pendientes después de autorización: unit/contract afectados; PostgreSQL16 aislado fresh+upgrade/reapply/rollback/restore/FK/UQ/check/exclusion/rootconcurrency/deferredlineage; Adminpositivo y TenantAdmin/Support/ServicePrincipal/impersonation/custom/genericnegativos; tenantisolation; CAS/concurrency/deadlock; snapshotreplay/corruption; atomicityfaults; expiry/quotas/familias/versioning; audit/outbox; frontend/browser/visual/accessibility; typecheck/lint/build de cambios reales; secret/rector y runtime autorizado. No mocks como sustitutoPG. Pruebas afectadas se repiten por cambios reales, intactas se reutilizan por hash/alcance.

## M. Riesgos residuales

Inventario real y coexistencia activa root; ledgerQA≠local; cantidades/mappingadopción no aportados; actors/grants reales; barrera y ventana/restore; fuentes y bindinglegal; suficienciametodología/representaciónH06; aceptación externa; rendimientos/recuperación/visual de nuevo runtime. R-P requiere pruebaPG directa antes de uso real. La barrera de rollout y recuperación se presentan como diseño sujeto a configuración operacional exacta, no nueva capa ejecutada.

## N–O. Aprobaciones obtenidas y pendientes

Obtenidas en esta intervención:0. Se preservan decisiones humanas anteriores en su alcance. El nuevo mandato autoriza preparaciónA, no firmaautomática del paquete ni gates.
Pendientes conjuntas: diseño v2+manifest exacto; deltas superiores/publicación+review físico/ejecutable; expedientes legales/metodológicos competentes; inventario compartido READONLY y resolución de conflictos; datos comerciales y adopción; autorización real de grants/QA/DDL/deploy; aceptaciones Security/QA/Domain/UI y cierre humano.06/20 presentan fuentes, alternativas, recomendaciones propuestas y consecuencias; no se inventa dato o autorización.

## P–R. Gates finales

RECTOR_BASELINE_INTEGRITY=PASS técnico ejecutado; RECTOR_GATE=BLOCKED para activación/cierre. STEP_6A3=PARTIAL_BLOCKED;12cláusulas heredadas siguen pendientes; STEP_6A4=NOT_STARTED y entradaREADY no acreditada. No estado de gobernanza modificado. G-05 firma disposición documental, nunca suficiencia/aplicabilidad; Hcerrada sólo con decisión/evidencia competente.
Rector43/46 exige cierre end-to-end y49§6 preserva6A3→6A4→ZIP→6A5. Sin fuente que excluyaH01/H04..06 del ledger48 no se aprueba cierreintegral sólo por el comercial. Se permite mecanismo comercial independiente tras sus gates, noPASS fase parcial disfrazado.

## S. Preparación de release

NOT_READY_FOR_RELEASE; imágenes no construidas; QA NO_GO/NOT_AUTHORIZED. Plan04T0..T10 con preflight/ventana/adopción/GO/rollback coordinado preparado; taskpacket13 enumera imagen/digest, source/runtime parity, backup/PITR/ruleshash, seeds/grants reales, manifestpacks/capabilities y smoke requeridos. Ningún dato futuro se presenta como aprobado.
La recuperación despuésCOMMIT necesita preservar/coordinar escrituras y retener publicación externa de eventos durante ventana. Si la barrera/restore no se demuestra, NO_GO. Tras apertura pública o efectos externos, no rollback unilateral; incidente y compensación gobernada.

## T. Siguiente acción exacta y firma solicitada

Revisar/aprobar o rechazar paquetev2 y manifest por sus hashes. Aportar las decisiones externas mínimas06/20 cuando sus fuentes estén disponibles. La firma de diseño no autoriza operación ni publica bytes futuros. Después: publicación superior y gates humanos correspondientes; implementación técnica autorizada con pruebasPGaisladas; preparar release real; solicitar autorizaciónoperacionalQA; aceptar evidencias y cierreintegral; sólo entonces evaluar entradaSTEP6A4 sin iniciarla.

Formulario exacto sin firmar; sólo el hash comunicado fue completado. Identidad/funciones/fecha reales pendientes del humano:

```text
""")
document.append(approval.rstrip()+"\n```\n")
REPORT.write_text('\n'.join(document).strip()+'\n')
delivery_files=sorted([p for p in OUT.iterdir() if p.is_file() and p.name!='DELIVERY_SHA256SUMS.txt']+[PACKAGE,REPORT])
(OUT/'DELIVERY_SHA256SUMS.txt').write_text(''.join(f'{digest(p)}  {p.relative_to(ROOT).as_posix()}\n' for p in delivery_files))
print(json.dumps({'package_sha256':package_sha,'manifest_sha256':manifest_sha,'report_sha256':digest(REPORT),
    'delivery_checksums_sha256':digest(OUT/'DELIVERY_SHA256SUMS.txt'),'delivery_files':len(delivery_files),
    'approval_state':'UNSIGNED','RECTOR_GATE':'BLOCKED','STEP_6A3':'PARTIAL_BLOCKED','STEP_6A4':'NOT_STARTED'},ensure_ascii=False))
