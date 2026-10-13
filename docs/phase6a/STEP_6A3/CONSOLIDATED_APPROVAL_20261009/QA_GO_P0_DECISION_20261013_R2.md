# Decisión operacional única QA — GO-P0 R2

2026-10-13. TASK_ID=QA-GO-P0-LOCAL-PREPARATION-R2. Estado PREPARED_NOT_AUTHORIZED_NOT_EXECUTED; ventana NOT_SCHEDULED. Este sucesor conserva íntegros QA_GO_NO_GO_IANA_POST_R6_20261013.md y su checkpoint. Para ejecución, este R2 reemplaza sus ejemplos con placeholders; no copiar los ejemplos históricos como comandos listos. El mandato actual autoriza únicamente lectura/preparación/documentación local.

## Resultado y autoridad

QA_PROMOTION_READY=NO_GO; QA_GO_P0_STATUS=BLOCKED_AUTHORITY; QA_READ_ONLY_INVENTORY_AUTHORIZED=NO; QA_DEPLOY_AUTHORIZED=NO; QA_EXECUTION=NOT_RUN. Rector activo TCDX_GRC_MASTER_REGENT_BASELINE_v1.8_2026-10-09, manifest SHA256 e51f6539df119775b2feb8839907c8cd690623b82707b399aa15a31d59196533. RECTOR_INTEGRITY=PASS; RECTOR_GATE=BLOCKED para cierre/promoción; 48 trazadas,36 cerradas locales,12 pendientes; STEP_6A3=PARTIAL_BLOCKED, STEP_6A4=NOT_STARTED, SOG_V2=DRAFT_NOT_EFFECTIVE.

IANA_API_V2_PUBLICATION=PUBLISHED_LOCAL_API_V2 desde14:03:13UTC; semántica SHA256 6205faaafa3cb0cbd4d0cf34cd9c8343ccca64392e638a833e10fa7db8c73375; manifest SHA256 88e8a56c0d4939e257cd3ab70c21df96ef0ebee5105ea2990036ca83888a0397. Metadata33, recibo y 34 fuentes coinciden ahora con los hashes publicados. GET /api/v2/auth/me/authorization; exclusivamente GET /api/v1/auth/me/authorization retirado404 sin redirect/fallback; otros v1 conservados. No pedir nuevamente D1–D5 ni API major/retiro.

Rector43 §5.5: «No se hacen commit, merge ni deploy si el gate aplicable a ese artefacto o capacidad está FAIL.» Rector46 §5: «Un PASS parcial no autoriza la etapa siguiente salvo que 43 lo establezca expresamente.» No se encontró una prohibición universal de lecturas QA dentro de6A.3; esas lecturas requieren GO específico. No se habilita promoción del checkout bloqueado mediante este documento. Un eventual incremento delimitado necesita gates propios completos, sin excepción tácita ni avance6A.4.

## Únicos faltantes materiales y datos locales utilizables

Todos los estados corresponden a este acto, no certifican vigencia de una VM desde una observación histórica. Fuentes relativas a la raíz del checkout.

| Dato/gate | Clasificación | Evidencia precisa / responsable |
|---|---|---|
| Topología y HTTPS canónico | VERIFIED_EXISTING como contrato | Rector12/43/46: DB192.168.2.40/tcdx-grc, backend192.168.2.45/grc-bk.tcdx.int, frontend192.168.2.46/grc-www.tcdx.int; https://grc.tecdex.net/ |
| GO-P0 para lectura externa | BLOCKED_AUTHORITY | Mandato actual§0/6 y R6_NEXT_V2_APPROVAL_RECEIPT.json exclusionesQA; ningún GO positivo en las fuentes prioritarias; PO Andrés Barouh |
| Operador SSH backend/frontend y acceso existente | PENDING_OPERATIONAL_INPUT | QA_PROMOTION_PACKAGE_R6.md / qa-operational-inputs.json; designación por PO/QARelease, referencia protegida y ventanaUTC. No inferir operador desde /home/tecdex |
| DBA humano y uso read-only de configuración DB protegida existente | PENDING_OPERATIONAL_INPUT | QA_OPERATIONAL_PLAN_R3.json actor_plan.DBA_execution_identity=null; DBA/PO confirma custodio y uso diagnóstico de referencia runtime; no crear rol/grant ni perfil libpq |
| Images/labels/config/salud vigentes | PENDING_OPERATIONAL_INPUT | QARelease mediante P0. Última evidencia PHASE5_FINAL_QA_RECOVERY_PROOF.json,2026-10-08: pareja histórica disponible entonces, no ahora |
| Proxy/runtime HTTPS actual y procedimiento de ventana | PENDING_OPERATIONAL_INPUT | La misma prueba: proxySSHDiagnostic registra principal tecdex denegado históricamente. PO/QARelease aporta inventario vigente/procedimiento; no inferir IP ni conectar proxy. P0 sólo observa HTTPS desde cliente |
| Candidato backend+frontend desplegable/manifest/compatibilidad/CI | PENDING_OPERATIONAL_INPUT | R6_V2_APPROVAL_MANIFEST.json + Dockerfiles; v2-build-hashes.json:image_digest=NOT_BUILT_NOT_INVENTED; QARelease/Architecture |
| Ledger/estructura realmente vigentes en DB | PENDING_OPERATIONAL_INPUT | Prueba histórica:30 migraciones,última20261007000200. Manifest local verificado:32,última20261009000200;33/34 fuera del manifest activo. DBA vía P0 |
| Nueva migración/permiso/grant del delta IANA | NOT_APPLICABLE_WITH_EVIDENCE | Metadata33 physical_changes=false,migrations=[],permissions_or_grants_added=[]; no se extiende esta conclusión a todo checkout |
| ServicePrincipal PLATFORM_CONTROL real | NOT_APPLICABLE_WITH_EVIDENCE para IANA/P0; PENDING_OPERATIONAL_INPUT para33/34 | QA planR3 actor_plan.existing_real_service_principal_id=null y migration_plan33/34. IAM/DBA sólo antes de esas operaciones, que no se incluyen en IANA |
| Humanos/issuer/subject/tenants A-B/membresías/roles/entitlements | PENDING_OPERATIONAL_INPUT para smoke; no requeridos para metadataP0 | QA planR3 actor_plan.real_tenant_memberships_and_entitlements=null; IAM/PO identifica existentes. Antecedentes Baruj/andres.grc no prueban autorización6A.3 |
| Backup/PITR artefacto/destino/cifrado/retención | PENDING_OPERATIONAL_INPUT | evidence/continuity-r6/qa-operational-inputs.json; DBA aporta ruta/versión/hash de procedimiento y evidencia actual |
| Restore test: destino aislado, procedimiento y consistencia | PENDING_OPERATIONAL_INPUT | Misma fuente; DBA. verify-restore.ts es local/ledger histórico, no procedimiento QA reutilizable |
| Rollback pareado/images retenidas/overrides/operador/control de tráfico | PENDING_OPERATIONAL_INPUT | QARelease: verificar de nuevo pareja histórica abajo, procedimiento vigente y post-rollback; sin restaurar datos por arrastre |
| GO backup/restore,DDL/grants,deploy y smoke real | BLOCKED_AUTHORITY por acto | Mandato§0/6, reciboR6_NEXT y ficha anterior; cada casilla necesita alcance/identidad/ventana/evidencia propios |

No hay un nuevo BLOCKED_SECURITY demostrado por lectura local: la denegación proxy es histórica y no se intenta sortear. Si P0 descubre bypass/aislamiento roto, transporte inválido o exposición de secretos, el gate afectado pasa a BLOCKED_SECURITY y se detiene; no inventar una vulnerabilidad actual.

Pareja histórica para comparar, no declarar vigente: backend ImageID sha256:ab9902e4215289307992b9aa98421d5882a18b4236752948356b4fbe25829195; frontend ImageID sha256:f31fd8a5b63003ba0973822854a94dc03b0b9753ec9dc165253418608c0f73ce. Fuente artifacts/phase5-integration/PHASE5_FINAL_QA_RECOVERY_PROOF.json runtime.components; imageAvailableForRollback=true entonces. Los labels compose.image difieren del ImageID: comprobar el ejecutado. Rutas compose/overrides históricas están en el paquete post-R6, sujetas a revalidación.

## Procedimiento único, con bloqueo antes del primer acceso

### P0 — inventario de metadata e imágenes

Se requieren solamente designaciones/accesos existentes/ventana y recibo GO-P0. No requiere cerrar las12, construir imagen, ejecutar login, inventariar personas, backup ni crear cuenta. Valores vacíos son PENDING_OPERATIONAL_INPUT; no son placeholders ejecutables. El bloque bash siguiente, guardado fuera del repo por el operador y revisado, **sale sin conexión con su configuración actual**. Las variables de autorización no conceden autoridad por sí mismas: el PO debe aceptar alcance exacto y recibo/hash; QARelease comprueba esa semántica antes de cambiar valores. Referencias de acceso permanecen protegidas fuera del reporte.

```bash
# BEGIN GUARDED_P0
set -euo pipefail
QA_GO_P0='NOT_AUTHORIZED'
QA_GO_RECEIPT_FILE=''       # recibo local exacto aceptado por PO
QA_GO_RECEIPT_SHA256=''     # SHA256 presentado y aceptado
QA_WINDOW_START_EPOCH=''   # ventana UTC aceptada, epoch seconds
QA_WINDOW_END_EPOCH=''
QA_SSH_BACKEND=''          # login SSH existente designado
QA_SSH_FRONTEND=''
QA_DBA_ID=''               # identificador humano no secreto
QA_DB_RUNTIME_REFERENCE_APPROVED='' # GO explícito para usar config DB protegida del backend existente
QA_BACKEND_HOST='192.168.2.45'
QA_FRONTEND_HOST='192.168.2.46'
QA_PUBLIC_ORIGIN='https://grc.tecdex.net'
deny() { printf '%s\n' "$1" >&2; exit 78; }
need() { [[ -n "$2" ]] || deny "PENDING_OPERATIONAL_INPUT: $1"; }
[[ "$QA_GO_P0" == 'APPROVED_EXACT_READ_ONLY' ]] || deny 'BLOCKED_AUTHORITY: GO-P0 no otorgado'
for key in QA_GO_RECEIPT_FILE QA_GO_RECEIPT_SHA256 QA_WINDOW_START_EPOCH QA_WINDOW_END_EPOCH QA_SSH_BACKEND QA_SSH_FRONTEND QA_DBA_ID QA_DB_RUNTIME_REFERENCE_APPROVED; do
  need "$key" "${!key}"
done
[[ -f "$QA_GO_RECEIPT_FILE" ]] || deny 'Recibo GO-P0 ausente'
[[ "$QA_GO_RECEIPT_SHA256" =~ ^[a-f0-9]{64}$ ]] || deny 'Hash de recibo inválido'
[[ "$(shasum -a 256 "$QA_GO_RECEIPT_FILE" | cut -d ' ' -f 1)" == "$QA_GO_RECEIPT_SHA256" ]] || deny 'Recibo distinto del aprobado'
[[ "$QA_WINDOW_START_EPOCH" =~ ^[0-9]{1,12}$ && "$QA_WINDOW_END_EPOCH" =~ ^[0-9]{1,12}$ ]] || deny 'Ventana UTC inválida'
for key in QA_SSH_BACKEND QA_SSH_FRONTEND; do
  [[ "${!key}" =~ ^[a-zA-Z0-9_][a-zA-Z0-9_.-]*$ ]] || deny "Identificador inválido: $key"
done
window() {
  local now
  now=$(date -u +%s)
  (( now >= QA_WINDOW_START_EPOCH && now < QA_WINDOW_END_EPOCH )) || deny 'Fuera de ventana GO-P0'
}
bounded() {
  window
  python3 -c '
import subprocess, sys
try:
    sys.exit(subprocess.run(sys.argv[1:], timeout=30).returncode)
except subprocess.TimeoutExpired:
    print("NO_GO: timeout30s; detener, no reintentar ampliando autoridad", file=sys.stderr)
    sys.exit(124)
' "$@"
}
[[ "$QA_DB_RUNTIME_REFERENCE_APPROVED" == 'CURRENT_BACKEND_PROTECTED_CONFIG_READ_ONLY' ]] || deny 'Config DB existente no autorizada para P0'
for cmd in ssh curl python3; do command -v "$cmd" >/dev/null || deny "Herramienta requerida: $cmd"; done
ssh_flags=(-o BatchMode=yes -o ConnectTimeout=10 -o ServerAliveInterval=5 -o ServerAliveCountMax=2)
bounded ssh "${ssh_flags[@]}" "$QA_SSH_BACKEND@$QA_BACKEND_HOST" 'docker inspect --format "{{.Name}} {{.Image}} {{.Config.Image}} {{.State.Status}} {{.State.Health.Status}}" tcdx-grc-backend'
bounded ssh "${ssh_flags[@]}" "$QA_SSH_FRONTEND@$QA_FRONTEND_HOST" 'docker inspect --format "{{.Name}} {{.Image}} {{.Config.Image}} {{.State.Status}} {{.State.Health.Status}}" tcdx-grc-frontend'
bounded ssh "${ssh_flags[@]}" "$QA_SSH_BACKEND@$QA_BACKEND_HOST" 'docker inspect --format "{{index .Config.Labels \"org.opencontainers.image.revision\"}} {{index .Config.Labels \"org.opencontainers.image.source.tree\"}} {{index .Config.Labels \"com.docker.compose.project.config_files\"}}" tcdx-grc-backend'
bounded ssh "${ssh_flags[@]}" "$QA_SSH_FRONTEND@$QA_FRONTEND_HOST" 'docker inspect --format "{{index .Config.Labels \"org.opencontainers.image.revision\"}} {{index .Config.Labels \"org.opencontainers.image.source.tree\"}} {{index .Config.Labels \"com.docker.compose.project.config_files\"}}" tcdx-grc-frontend'
for path in / /api/v1/auth/providers; do
  bounded curl --connect-timeout 10 --max-time 20 --silent --show-error --output /dev/null --write-out '%{http_code}\n' "$QA_PUBLIC_ORIGIN$path"
done
bounded ssh "${ssh_flags[@]}" "$QA_SSH_BACKEND@$QA_BACKEND_HOST" 'docker exec -i -w /app/apps/backend tcdx-grc-backend node --input-type=module' <<'JS'
import pg from 'pg';
const e=process.env;
if(e.DATABASE_HOST!=='192.168.2.40'||e.DATABASE_NAME!=='tcdx-grc'||e.DATABASE_PORT!=='5432'){
  console.error('NO_GO: DB_TARGET_CONFIG');process.exit(3);
}
const c=new pg.Client({host:e.DATABASE_HOST,port:5432,database:e.DATABASE_NAME,
  user:e.DATABASE_USER,password:e.DATABASE_PASSWORD,
  ssl:e.DATABASE_SSL_MODE==='disable'?false:{rejectUnauthorized:e.DATABASE_SSL_MODE!=='no-verify'},
  options:'-c default_transaction_read_only=on',connectionTimeoutMillis:6000,query_timeout:25000});
try{
  await c.connect();await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  await c.query("SET LOCAL statement_timeout='25s'");
  const identity=(await c.query("SELECT current_database() AS db,inet_server_addr()::text AS server,current_user AS role,current_setting('server_version_num')::int AS version,current_setting('transaction_read_only') AS read_only")).rows[0];
  if(identity.db!=='tcdx-grc'||identity.server!=='192.168.2.40'||identity.version<160000||identity.version>=170000||identity.read_only!=='on')throw Error('TARGET_IDENTITY');
  const role=(await c.query('SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows;
  const ledger=(await c.query("SELECT migration_id,filename,content_sha256,transactional FROM platform.schema_migrations WHERE outcome='applied' ORDER BY migration_id")).rows;
  const columns=(await c.query("SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='platform' AND table_name='tenants' AND column_name IN ('tenant_id','default_timezone','lifecycle_state')")).rows;
  await c.query('ROLLBACK');console.log(JSON.stringify({identity,role,ledger,columns}));
}catch(error){
  await c.query('ROLLBACK').catch(()=>{});console.error(JSON.stringify({state:'NO_GO',safeErrorClass:error.code??'READONLY_PREFLIGHT_FAILED'}));process.exitCode=1;
}finally{await c.end().catch(()=>{});}
JS
# END GUARDED_P0
```

P0 no imprime env, secretos, tokens ni filas de persona/tenant. La conexión usa referencias existentes del contenedor backend sólo con autorización específica de su custodio DBA; no exige crear un perfil libpq ni copiar credenciales al operador. Conserva la configuración de transporte vigente sin alterarla; DBA/Security debe confirmar su aplicabilidad antes del GO. Rolesuper/BYPASSRLS son metadata del principal existente, no grants ni evidencia de RLS runtime. HTTPS se registra como observación HTTP, nunca como autorización. Ante error de identidad/target/lectura/timeout, detener con NO_GO; rollback read-only/cierre de conexión.

Del resultado P0 se obtiene una lista exacta de imágenes/archivos actuales. QARelease presenta los ImageID y paths devueltos para autorizar lecturas selectivas `docker image inspect`/checksum; no ejecutar strings de labels como shell ni inferir procedimiento desde ellas. Hasta que esas referencias estén aprobadas, comandos de archivo/imagen adicionales son NOT_MATERIALIZED_PENDING_INPUT, no placeholders. Estado de rollback y compatibilidad requiere esta verificación posterior dirigida.

### P1–P5 — promoción posterior por etapas separadas

| Etapa | Entrada exacta requerida y operación | Verificación/recuperación | Estado de comandos |
|---|---|---|---|
| P1 candidato compatible | Release manifest de fuentes/images/assets pareados; ledgerP0 y dependencies; integración Git/CI y autoría exacta aprobadas separadamente | Dockerfiles copian aplicaciones completas; no promover todo worktree por tener delta IANA sin DDL. Inventario VOC histórico si el bundle introduce enforcement; 31/32/33/34 no implícitas | NOT_MATERIALIZED_PENDING_INPUT: no pareja de imágenes ni release/integración autorizados |
| P2 backup + restore test | DBA: procedimiento aprobado ruta/versión/hash, operador, artefacto cifrado/destino/retención/PITR y restore aislado real; GO específico | Comparar ledger, constraints/FK, ownership/grants, integridad y consistencia; conservar snapshot/pareja previa. Ningún restore sobre QA por arrastre | NOT_MATERIALIZED_PENDING_INPUT: sin fuente operacional no es legítimo fabricar pg_dump/restore |
| P3 DDL/grants si aplica | Delta IANA: NO_APLICA. Si P1 descubre dependencias físicas, detener y presentar task packet forward-only con inventario/preflight/actor/SP/hash/runner/audit y GO separado | Antes decommit rollback; después sólo reparación forward o restore coordinado aprobado con lineage. 33/34 siguen fuera del runner efectivo | NOT_APPLICABLE_WITH_EVIDENCE para IANA; BLOCKED_AUTHORITY para31–34 |
| P4 deploy pareado | GO de images exactas, ventana/control de tráfico, transporte y adaptación exacta del driverEngine histórico al runtime verificado; gates de incremento PASS; backup/restore y rollback PASS | Sustituir únicamente backend/frontend preservandoConfig/HostConfig/mounts/red; comparaciónImageID/health/assets/headers; conservar/recuperar contenedores anteriores ante fallo | NOT_MATERIALIZED_PENDING_INPUT: falta spec actual ydriver adaptado/aprobado. Las formas de comando del paquete anterior son historia, no órdenes |
| P5 smoke IAM/API/IANA y aceptación | GO separado: usuarios existentes, issuer/subject, A/B/membresías/grants/entitlements, credenciales por referencia protegida, catálogo de casos y captura minimizada | v2 propia200; sin tenant null; v1-self404 sin Location; demásv1 preservados; 400/401/403/404/503; zona persistida/cambioA-B/UTCZ/DST/aislamiento; humano móvil/UI | NOT_MATERIALIZED_PENDING_INPUT: no sesiones/actores/tenants/runner externo aprobados |

Cada etapa se convierte en comandos parametrizados sólo desde su procedimiento real y referencias aprobadas; no se ocultan valores desconocidos detrás de un script arbitrario. No hay procedimiento de mutación inmediatamente ejecutable acreditado. El bloqueo selectivo P1–P5 no impide realizar P0 autorizado. Los comandos finales deberán comprobar autorización/hash/ventana/valores antes del primer efecto, como P0.

Rollback P4 obligatorio antes deGO: retener ImageID backend/frontend y compose/overrides exactos, comprobar disponibilidad local y procedimiento vigente para ambos hosts. Fallos dehealth, imagen/asset, pareja mezclada, cross-tenant, timezone persistida distinta o regresiónv1 detienen avance y activan sólo recuperación de aplicación previamente aprobada. Verificar post-rollback ImageID, health, HTTPS/assets/logo/deep-route y API correspondiente a la pareja anterior; no deshacer esquema, grants, registros, audit o sesiones ni fabricar compatibilidadv1/v2. Sin pareja recuperable/procedimiento/control de tráfico, P4=NO_GO. Migraciones eventualmente aplicadas nunca se revierten con un down improvisado.

P5 no presume password+MFA de Managed Identity ni crea fake tenants: usar únicamente flujo contractual realmente vigente; OIDC externo sólo Zoho, Entra ID y Google Workspace conforme al contrato. No producir503 mediante corrupción de datos o interrupción no autorizada: marcar prueba real pendiente y conservar negativa local. Sin retest de móvil manual no declarar HUMAN_UI_REVIEW=PASS. Smoke IANA no cierra las12 ni STEP6A.3.

## Una decisión para el PO, con cinco casillas independientes

Beneficio de la decisión inicial: conocer qué release y BD están ejecutando las VMs para cerrar el paso a paso de promoción sin alterar la plataforma. Aprobador verificable: Andrés Barouh como PO; funciones operacionales ejercidas y ejecutores se deben registrar expresamente. Ventana actual NOT_SCHEDULED.

- [ ] **(i) Inventario read-only GO-P0.** Autorizar el bloque P0 de este R2: backend192.168.2.45, frontend192.168.2.46, DB192.168.2.40/tcdx-grc y GETs sin sesión HTTPS canónico. PO confirma loginSSH histórico porVM, DBA humano y uso read-only de configuraciónDB runtime protegida existente, con ventanaUTC/reciboSHA. Sin esos campos, la casilla sólo expresa intención y sigue NO_GO. Sin personas/tenants ni login IAM. Impacto: carga acotada, timeouts30s; recuperación ROLLBACK/cerrar conexiones. No cambia aplicación/datos/grants.
- [ ] **(ii) Backup y restore test.** Mantener SIN AUTORIZAR ahora; DBA presenta artefacto/destino/procedimiento cifrado y destino aislado verificables antes de una decisión ejecutable. Riesgo y autorización separados de lectura; no restaurar QA. No condicionar (i) a este permiso.
- [ ] **(iii) Migraciones/grants.** NO_APLICA al delta IANA acreditado. Si el release completo los necesita, mantener SIN AUTORIZAR y pedir packet específico con actor/SP, preflight, SQL/runner/audit/hash y recuperación; no aprobar un DDL desconocido mediante esta casilla.
- [ ] **(iv) Deploy backend+frontend.** Mantener SIN AUTORIZAR ahora; requiere pareja exacta compatible, CI/gates PASS, backup/restore/rollback verificados, procedimiento/control de tráfico, operador y ventana. Git/construcción/transferencia tampoco autorizados por (i).
- [ ] **(v) IAM/E2E reales y aceptación.** Mantener SIN AUTORIZAR ahora; IAM/PO presenta humanos/issuer-subject/tenantsA-B/membresías/grants/entitlements, casos y alcance/ventana. Login puede crear sesión/audit; sin modificación IAM/grants ni certificación automática. Aceptación humana posterior queda separada.

La solicitud única vigente figura al final, con operadores históricos y configuraciónDB existente identificados. Los blancos de esa decisión son campos del operador, no comandos. Si no se confirman accesos/custodio/ventana, registrarPENDING_OPERATIONAL_INPUT y mantenerQA=NO_GO, sin volver a investigarR3–R6.

La confirmación es necesaria por mandato actual§0/6, rector45§2/6, rector49§3 y exclusiones del reciboR6_NEXT: autorización local y D5 no permiten acceso QA. No hubo rechazo automático de aprobación. Condiciones automáticas NO_GO: falta autoridad/campo crítico, target/identidad/hash distinto, fuera de ventana, error/timeout, dependencia contractual/DDL no autorizada, gates del artefacto fallidos, pareja/rollback/backup no verificados para promoción o aislamiento/seguridad inválidos. La ausencia deGO externo no bloquea redacción/lectura local.

## Datos operacionales recuperados por instrucción de continuidad del PO

Este addendum sucede sólo los campos de procedimiento/identidades y solicitud anteriores. No abre un nuevo paquete. Los requisitos de un servicio libpq propio dejan de ser impedimento: se reutiliza configuración protegida existente bajoGO específico, conforme al bloqueP0 actualizado.

Fuentes6 verificadas contra EVIDENCE_SHA256.json de artifacts/phase5-iam-ui/step23l-managed-identity-tenant-onboarding-e2e: backend-build.py, frontend-build.py, deploy.py, runtime-driver.py, snapshot.mjs y rollback.json. La evidencia posterior vigente histórica está en artifacts/phase5-final-closure-20261007/FINAL_QA_RUNTIME_REPORT.md y artifacts/phase5-integration/PHASE5_FINAL_QA_RECOVERY_PROOF.json; no confundir el reporte preliminar dentrophase5-iam-ui (29/235/170) con cierre posterior30/237/172.

| Dato ahora identificado | Evidencia y uso permitido | Pendiente que bloquea operación |
|---|---|---|
| Construcción existente | backend/frontend-build.py: docker buildx build --platform linux/amd64 --load --provenance=false, fuente congelada idéntica, label OCI public source, frontendVITE_API_ORIGIN canónico; DockerfilesNode22.23.2/pnpm12.4.1. Sin secretos como input | QARelease: congelar alcance IANA compatible y autorizar build; no reejecutar scripts sobre su freeze histórico |
| Transporte existente | docker image save, tar0600, SHA256, scp con host keys estrictas, docker load y comparación ImageID/platform | GO transferencia y digests actuales sellados; no existen imágenesR6 QA |
| Operadores históricos SSH | deploy.py/rollback.json: tecdex@192.168.2.45 y tecdex@192.168.2.46 | PO confirma vigencia/designación paraP0, sin inferir autoridad de permisos técnicos existentes |
| Conexión DB | Snapshot original y sanitizedRuntime posterior:192.168.2.40:5432/tcdx-grc; username redacted; credenciales protegidas en .env/runtime existente. MI8A release packaging contract fija custodia tecdex y modos0600; sin extraer secretos | DBA/PO autoriza uso diagnóstico read-only de esa referencia; no se exige comunicar contraseña ni crear rol/profile |
| Deploy realmente utilizado | runtime-driver.py: Docker Engine API sobre socket local, copia Config/HostConfig en memoria, preserva secretos/mounts/red, stop+rename anterior, create/start candidato, comparador exacto salvo image/hostname generado/OCI source permitido | Driver fija oldImage7989…/2299… anteriores a cierre; no válido para ab990…/f31fd… sin adaptación exacta al runtimeP0/manifest aprobado. No sustituir por compose recreación por comodidad |
| Recuperación utilizada | Conserva contenedor anterior exacto detenido; esperahealth240s; captura sanitizada de logs antes de rollback, retiene candidato fallido, renombra/reinicia anterior; rollback pareado coordinado desde deploy.py | QARelease valida disponibilidad actual/containerIDs/configfingerprints y aprueba adaptación del driver/procedimiento; nunca borrar evidencia |
| Salud existente | backend /health/live y /health/ready internos; frontend raíz8080; providers/root/deep-routes/asset hashes públicos; healthy/restarts0/uid1000 | P0 verifica actualidad; smoke antiguo espera v1self401 y debe actualizar exclusivamente a v1self404/v2 sin sesión401 |
| Backup histórico | FINAL_QA_RUNTIME_REPORT posterior: backup protegido previo con catálogo pg_restore verificado; ledger de cierre30 y checksum estable | DBA: referencia/retención/PITR y prueba de restore actual aislada faltan. Catálogo no acredita restauración ejecutada |
| Humanos QA históricos | PHASE5_QA_REVIEWER_MEMBERSHIP_AUTHORIZATION_20261007.md y cierre: Baruj autor, andres.grc reviewer con Membership1/roles0 yOTP1; TecDex real | IAM/PO autoriza su uso6A.3, verifica issuer/subject/tenantsA-B/permisos actuales. No otorgar roles ni reclamar vigente el antecedente |

Los resultados23J/23K se consumen a través de sus sucesores verificables23L y cierre/integraciónFase5; no reabrir decisiones superadas ni usar digests intermedios. Documento MI8A es autoridad de packaging/custodia, no GO deploy actual. La copia de Config/HostConfig del Engine protege configuración real; labels compose no demuestran que recreación vía compose sea el mismo procedimiento.

Compatibilidad: revisión dirigida de frontend-projections.ts no muestra dependencia del handler IANA respecto de CFG-D, CT04 ni publication runner33/34. Usa membresía/tenant/grants/entitlements existentes y default_timezone; metadata confirma ceroDDL/grants nuevos. Estos bloqueos no se añaden al incremento como dependencias. El bundle completo del worktree sí lleva otros cambios6A.3: falta demostrar aislamiento de alcance/compatibilidad conQA30, sin prometer que una imagen de todo el checkout sea desplegable sin sus dependencias.

**Solicitud única vigente, en reemplazo de los campos libpq de la respuesta anterior:** «Autorizo sólo casilla(i), GO-P0 read-only conforme al bloque actualizado: confirmo los operadores históricos tecdex en192.168.2.45 y192.168.2.46 para esta operación; designo custodioDBA humano=___ y autorizo uso diagnóstico de la configuración PostgreSQL protegida del backend actual, sin revelar/alterar credenciales; ventanaUTC=___; recibo/hash exactos=___. Alcance: imágenes/labels/salud/metadata DB y GETs públicos sin login, incluida ejecución transitoria del lector dentro del backend, sin mutaciones de negocio. (ii),(iv),(v) no autorizadas; (iii) no aplica al deltaIANA.» Si el operador histórico ya no está vigente, PO entrega el reemplazo existente autorizado antes de acceso. No solicitar aquí permiso de un deploy con imágenes/rollback todavía desconocidos.

Para habilitar posteriormente promoción, faltan exclusivamente: release compatible y pareja exacta construida/validada bajo autorización; runtime/containerIDs/fingerprints actuales; driver adaptado exacto y aprobado, custodia rollback; backup/restore exigidos con evidencia; ventana/control de acceso; cuentas/tenants actuales yGO smoke; GOdeploy específico. No hay nuevo impedimento metodológico/jurídico inventado ni infraestructura paralela.

## Ejecución P0 autorizada y empaquetado canónico — continuidad vigente

Este append sucede los estados NOT_AUTHORIZED/NOT_RUN anteriores exclusivamente para P0. Mandato PO actual autoriza inventario no mutante; respuesta humana «si autorizo» y «es tecdex siempre» confirma operador; autenticación temporal SSH autorizada aparte, valor no registrado. PostgreSQL administrativo fue autorizado posteriormente como postgres sólo para metadata read-only; tcdx_grc_app no es actor administrativo. La ventana de deploy sigue NOT_SCHEDULED. No se encontró requisito rector de ventana programada para estas lecturas acotadas; el requisito de ventana del ejemplo anterior no se convierte en un gate rector nuevo. No solicitar nuevamente GO-P0 ni operador.

Evidencia durable: evidence/P0_READ_ONLY_EVIDENCE_20261013.json SHA256 21d838f05ba71db96344323597be96c39173209f74c80878bca00e33da792b9c. Contiene comandos/alcances saneados, resultados, certificado público, fingerprints y artefactos; ninguna credencial/clave privada. P0_BACKEND=PASS; P0_FRONTEND=PASS; operador tecdex/UID1000 verificado por SSH con host keys estrictas. Se observaron NODE_ENV=qa, linux/amd64, contenedores activos/healthy, puertos4000/8080, digests finales Phase5 vigentes. Backend tiene restartCount1 desde09/10; no se atribuye causa ni se convierte el histórico restart0 en evidencia vigente. Frontend restartCount0.

- Backend actual: contenedor6acd160b09f89943bb0657ad04b47f39ff4ed37f9c40a79af8c40b5ba1a36ae3, ImageID sha256:ab9902e4215289307992b9aa98421d5882a18b4236752948356b4fbe25829195; health/live yready200.
- Frontend actual: contenedor31c3257ee28ffa0c03ae7791b178c089b2cfb118043e668270a15e09627e5080, ImageID sha256:f31fd8a5b63003ba0973822854a94dc03b0b9753ec9dc165253418608c0f73ce. Bundle público ycontenedor SHA256 0cc529bf3dc084b508f8f5e862a31bb319f9280965eecf03b00d2ada2515b00f coinciden yconsumen self-v1.
- HTTPS público conTLS válido: raíz/providers200; self-v1 sin sesión401, self-v2 todavía404. No hubo login humano ni IAM real.
- Hay contenedores previos retenidos enambos hosts ylas imágenes actuales disponibles. El procedimiento Engine está acreditado localmente, pero el driver histórico fija digests antiguos yno existe ya enla ruta/tmp original: requiere adaptación/versionado exactos ycustodia antes deGOdeploy, sin copiarlo/ejecutarlo remotamente porP0. Restore operativo no ejecutado/verificado.

### PostgreSQL: estado final y cliente preparado

DATABASE_TLS_MODE_EFFECTIVE=disable enel backendQA, confirmado enconfig no secreta ycreateDatabase: usa ssl:false. El primerP0 impuso ssl.rejectUnauthorized=true, distinto delruntime; suDEPTH_ZERO_SELF_SIGNED_CERT no demuestra caídaDB. No se encontró autorización rectora explícita para plaintext, porlo que nose reprodujo elmodo disable niseseleccionó no-verify.

PO informó ssl=on ycertificadoUbuntu autofirmado. Mediante SSH autorizado tecdex@192.168.2.40 se leyó sólo /etc/ssl/certs/ssl-cert-snakeoil.pem; clave privada NO leída. Subject/issuer CN=db-tecdex, SAN DNS:db-tecdex, vigencia17/05/2026–14/05/2036. Fingerprint SHA256 delcertificado DER FB:68:09:DA:13:9E:E3:E5:2C:2F:1F:EA:D7:5B:11:92:7B:04:B8:96:7A:2B:5D:B8:46:9C:B6:70:E3:BB:A3:E6; SHA256 PEM 0a99469321c1117cdf3154a7e5c5e50dd42f719af7b8b1a647fa0bb55179519b. No cubre IP192.168.2.40 nihostname db-v4.tcdx.int; libpq fue preparado conhost=db-tecdex, hostaddr=192.168.2.40, sslmode=verify-full yreferencia pública/tmp/tcdx-qa-postgres-public-cert-20261013.pem. No cambioDNS/servercert/config persistente/trust store.

La validación TLS dejó de fallar; conexión quedó bloqueada posteriormente por fe_sendauth: no password supplied. Existe .pgpass local protegido0600, pero libpq no obtuvo autenticación parahost certificado db-tecdex/usuariopostgres/basetcdx-grc. No se leyó, copió nimodificó sucontenido por elagente; no se reutilizó contraseñaSSH como contraseñaDB. P0_DATABASE=BLOCKED_AUTHENTICATION_REFERENCE; identidad efectiva/migraciones/schema actuales NO leídos, ningún SELECT/DDL/DML ejecutado. NEXT_SINGLE_ACTION: custodioDBA configura/proporciona una referencia deautenticación existente gestionada válida para esa identidad TLS ypostgres/tcdx-grc, sin secretos enrepo; luego ejecutar elbloque metadata READ ONLY aprobado. La confirmación genérica «aprobado» anterior no suplió unpin/credencial; elcertificado público verificado síresolvió confianza.

### Pareja local preparada y corrección autorizada

PACKAGING_ROOT_CAUSE: paquetecontracts exportaba src/index.ts pero susruntime imports requieren iana-timezone.js/phase6a-vocabularies.js; Dockerfile sólocompilaba backend. La copia intermedia dist→src fue rechazada porPO, eliminada yNO esartefacto de release. CANONICAL_FIX: packages/contracts/package.json declara main/exports.import dist/index.js ytypes/exports.types dist/index.d.ts; Dockerfiles usan pnpm --filter @tcdx-grc/backend... build yfrontend... build, compilando dependenciasworkspace antesdel consumidor. FuentesTS yinterfaces/modelos/semánticaIANA permanecen intactos. Dockerfiles ymanifest depackaging cambiaron; no cambiócontrato API ni modelo físico.

Integridadsinomisión:203inputs delcontexto final;200coinciden con snapshotprobado; los3deltas están sellados exactamente: backendDockerfile47ebf8eaa031510da799c7aadfd1f71e92ccce21c6d942c3ffc52980d14e21c6; frontendDockerfileb6a1998bc90a09e71ea9e595596ed65d7f5d8ee8cfd0d6b474427126afca726b; contracts/package.json7687941476e5c3f35a47227bb9b6990f6ae4843e7d79723b9f142c6da8fd9570. Elfreezer exige elset yhashes exactos, sinexcepción general paraDockerfile. Losoutputs ViteconfigJS/map heredados sepreservaron ynoentraron como fuentes; buildaprobado selecciona explícitamentevite.config.ts.

BACKEND_IMAGE_LOCAL_READY=PASS_LOCAL: sha256:c2cb4cf9ea4140ba606845dfc99ba7749105079c89df3cf1e80f5c2a4176dee3, tagtcdx-grc-backend:iana-v2-local-7d512e859abd. Linux/amd64 Node22.23.2, packageentry dist/index.js, iana-timezone.js presente, sinJS generado ensrc, loader/backend listenlocalPASS sinDB/redexterna; v1self404/noLocation, v2sin sesión401, providersv1 200, negativasIANA PASS. Tar/tmp/tcdx-iana-v2-local-pair-20261013-0h1biec_/backend-local-image.tar SHA256 9f029b57cbc8fd2860506952c4a309c16c6f415c138d9b4b811fd251f406bb2c.

FRONTEND_IMAGE_LOCAL_READY=PASS_LOCAL: sha256:d83025f687b94d5cb69d7782d11e320bfcde36497fddce8595ff723184a567f0, tagtcdx-grc-frontend:iana-v2-local-b488bbaaafc8. Imagenpreparada antesdel ajuste deentradas Node sepreservó porordenPO dereconstruir únicamente imagenafectada; fuentes deUI/IANA/DTO no cambiaron. Su bundle valida v2, ausencia self-v1 yorigen canónico; logo idéntico alassetaprobado. SHA bundleJS da6099a85b525ff1d63d7c2fba112d21ab55958d7a9bf33330c9d94ee218a301; tar/tmp/tcdx-iana-v2-local-pair-20261013-f_si0mfa/frontend-local-image.tar SHA256 071e48be3b1334ca23a25d178dbb031914f66123f411d4cdcb3a20d2d08d52e8. Sourcefreeze propio b488…; backendfinal7d512…; nosedeclaran falsamente unamismafreeze, yseverificaque loscontratos/fuentesproductivas compartidos sonlosmismos. Futurebuild frontend usaelgraph corregido.

Checks nuevospertinentes: build canónico/loaderimagen/entrypoint/negativasIANA/API PASS;22pruebas dirigidas decontratoIANA/projection boundary/APIclientPASS; contracts:verify ytypecheckfrontendPASS. 872unit/PG y468casos únicosbrowser mantienen carácter histórico, no reejecutados. NoHumanUI/runtimeE2E autoaprobado.

QA_DEPLOY_GO=NO_GO. IANA_DB_MIGRATION_REQUIRED=NONE paraeldelta; MIGRATIONS_PENDING=NOT_VERIFIED conDBsinmetadata, localmanifest32 y31/32 candidatos frente aúltimoQA30histórico; noseafirmaqueseguen pendienteshoy. Elbundle completo contieneotroscambios6A.3 yrequiere compatibilidad/inventario autorizado; nosepromueve bajo la conclusiónnoDDL deIANA. Faltan referenciaauthDB/metadatoscompatibles, custodiabackup/restore ydriver/rollback adaptados, ventana yGOdeploy/smoke separados. Ninguna nuevaautorizaciónP0 necesaria; ningún despliegue/transporte/backup/restore/IAM/DDL/grant/Git ejecutado. AutenticaciónSSH temporaldebe reemplazarse por mecanismo gestionado despuésP0 mediante acto separado; nosemodificóIAM.


## PostgreSQL P0 resuelto mediante libpq — 2026-10-13 16:01 UTC

Este append sucede únicamente BLOCKED_AUTHENTICATION_REFERENCE y los campos de compatibilidad aún no observados. Se reutilizó la autenticación protegida libpq configurada por el operador fuera del repositorio. El agente no leyó el passfile ni contraseñas. No hay nueva autorización P0 pendiente.

**P0_DATABASE=PASS_READ_ONLY.** psql -X -w, host=db-tecdex, hostaddr=192.168.2.40, port=5432, dbname=tcdx-grc, user=postgres, sslmode=verify-full y certificado público confiable /tmp/tcdx-qa-postgres-public-cert-20261013.pem. Pin PEM SHA256 0a99469321c1117cdf3154a7e5c5e50dd42f719af7b8b1a647fa0bb55179519b. PostgreSQL 16.15 confirmó identidad postgres, destino .40:5432, TLSv1.3/TLS_AES_256_GCM_SHA384 y transaction_read_only=on. Dos transacciones metadata REPEATABLE READ READ ONLY terminaron ROLLBACK; statement_timeout=10s, lock_timeout=3s, idle timeout=15s, proceso limitado a25s. Sin DDL/DML, datos de personas/tenants, grants ni modificaciones de configuración. El modo del runtime backend sigue disable según el inventario anterior; no se alteró ni se lo consideró autorización de plaintext.

Evidencia nueva inmutable: evidence/P0_POSTGRES_READ_ONLY_20261013.json, SHA256 db47cf34eeee3c0a75cdf61a5f560fb90269bad6e8dbe0f8892eef862d6aab4a. Conserva parámetros no secretos, SQL exacto, timestamps, resultados de catálogo y comparación local. La evidencia P0 anterior permanece byte-identica; su fallo de autenticación es historia resuelta.

| Campo | Resultado verificado | Alcance |
|---|---|---|
| QA_DB_SCHEMA_VERSION | 30 migraciones; última 20261007000200 | Todas las30 identidades, filenames, hashes y transactional coinciden con manifest local; cero desconocidas/discrepancias |
| IANA_DB_MIGRATION_REQUIRED | NONE | Metadata contractual33: physical_changes=false, migrations=[], grants=[]; platform.tenants.default_timezone varchar NOT NULL e iam.tenant_memberships con columnas requeridas existen |
| MIGRATIONS_PENDING | 20261009000100 y20261009000200 | No son migraciones IANA. Localmanifest32, QA30; no se ejecutó runner apply |
| QA_DB_COMPATIBILITY_IANA | SCHEMA_PREREQUISITES_VERIFIED | No valida valores timezone de tenants ni membresías/sesiones reales; estas pruebas requieren smoke aprobado |
| QA_DB_COMPATIBILITY_FULL_BUNDLE | NOT_APPROVED | Catálogo conserva uniques/default anteriores; faltan constraints canónicas31. Publicación32 incluye3 permisos/44 pares que el ledger no acredita. Imagen preparada incluye otros cambios6A.3: no afirmar que todo el bundle es compatible conQA30 ni que se necesita DDL paraIANA |
| BACKEND_IMAGE_READY / FRONTEND_IMAGE_READY | PASS_LOCAL preservado | No rebuild ni suites repetidas; hashes/validaciones en evidencia P0 anterior |
| ROLLBACK_READINESS | PREVIOUS_CONTAINERS_OBSERVED; EXECUTABLE_CURRENT_PROCEDURE_PENDING | Adaptación del driver histórico, custodia y recuperación no aprobadas todavía |
| QA_DEPLOY_GO | NO_GO | Bloqueo autenticación eliminado; persisten aprobación del alcance compatible del release, recuperación/backup, procedimiento vigente, ventana y GOdeploy/smoke |

La falta31/32 no se convierte en dependencia del handler IANA, ni en permiso automático de ejecutar migraciones. El backend no ejecuta migraciones por iniciar; no se autoriza empaquetar un enforcement pendiente como si fuera sóloIANA. QARelease/PO debe acreditar alcance del release preparado contraQA30, o presentar separadamente un paquete de cambios operacionales31/32 con preflight y autorizaciones: ninguna alternativa se adopta implícitamente. CFG-D/CT04 no se añaden como bloqueadores del handler.

### Operación de promoción propuesta para autorización separada

Objeto concreto de revisión: pareja local backend sha256:c2cb4cf9ea4140ba606845dfc99ba7749105079c89df3cf1e80f5c2a4176dee3 yfrontend sha256:d83025f687b94d5cb69d7782d11e320bfcde36497fddce8595ff723184a567f0. Operador confirmado tecdex; destinos existentes192.168.2.45/tcdx-grc-backend y192.168.2.46/tcdx-grc-frontend. Sin infraestructura nueva ni cambio Caddy/DNS. Ventana NOT_SCHEDULED. Esta secuencia es propuesta y no es un GO ni un script ejecutado.

1. QARelease aprueba alcance compatible conQA30 y los artefactos exactos; verifica gates aplicables. DBA/PO aporta referencia actual de backup/recuperación, custodio y evidencia exigidos por el plan. Release entrega driver Engine adaptado/versionado a los IDs actuales y control de acceso durante el cambio pareado. Estos campos son PENDING_OPERATIONAL_INPUT; no usar el driver histórico sin adaptar ni inventar comandos para esos valores.
2. Dentro de ventana aprobada, preflight read-only comprueba que los contenedores siguen siendo backend6acd160b09f89943bb0657ad04b47f39ff4ed37f9c40a79af8c40b5ba1a36ae3/imageab9902e4215289307992b9aa98421d5882a18b4236752948356b4fbe25829195 yfrontend31c3257ee28ffa0c03ae7791b178c089b2cfb118043e668270a15e09627e5080/imagef31fd8a5b63003ba0973822854a94dc03b0b9753ec9dc165253418608c0f73ce, healthy y recuperables. Diferencia deID/config/ledger implica STOP y revisión; no sobrescribir otro release.
3. Transportar únicamente backend-local-image.tar desde/tmp/tcdx-iana-v2-local-pair-20261013-0h1biec_ a.45 (SHA256 9f029b57cbc8fd2860506952c4a309c16c6f415c138d9b4b811fd251f406bb2c), yfrontend-local-image.tar desde/tmp/tcdx-iana-v2-local-pair-20261013-f_si0mfa a.46 (SHA256 071e48be3b1334ca23a25d178dbb031914f66123f411d4cdcb3a20d2d08d52e8). Usar transporte controladoFase5/host keys estrictas yarchivo0600, verificarSHA antes de docker load yImageID/linux-amd64 después. Destinos dearchivo remoto únicos y autenticación gestionada se fijan en el driver aprobado, nunca contienen contraseñas.
4. Aplicar el procedimiento Engine Fase5 aprobado: preservar Config/HostConfig/mounts/red sin exportar secretos; detener/renombrar contenedor actual, crear/iniciar candidato exacto, retener anterior. Promoción backend yfrontend coordinada bajo control de acceso: mezcla de cliente self-v1 ybackend self-v2 no es una ventana funcional aceptable. Esperar health hasta240s por el procedimiento; antefallo conservar evidencia saneada y recuperar la pareja anterior. No ejecutar migrate apply/DDL/grants ni aprovechar el permiso de deploy para backup/restore.
5. Verificar health live/ready, HTTPS canónico/assets exactos, GET self-v1=404 sinLocation/fallback; GET self-v2 sin sesión=401; providers yresto de rutasv1 preservados. El bundle frontend candidato debe consumir self-v2. Smoke autenticado/IANA con humanos ytenants reales exige casilla aparte: zona persistida, UTCZ, cambioA/B, negativas/aislamiento yDST; ningún fake tenant ni modificacionesIAM. No atribuir aceptaciones humanas a la automatización.
6. Rollback autorizado sólo deaplicación: conservar candidato/evidencia, detener candidato yrenombrar/reiniciar contenedores previos exactos deambos hosts. Confirmar imagesab990…/f31fd…, health, asset público previo0cc529bf3dc084b508f8f5e862a31bb319f9280965eecf03b00d2ada2515b00f yself-v1 original. No down migrations ni revertir audit/datos/sesiones.

**Una decisión operacional pendiente, con permisos separados:** PO/QARelease presenta o acepta (a) alcance del release compatible conQA30 ydriver/rollback exactos; DBA/custodio presenta referencia actual de recuperación; PO fija ventanaUTC/control de acceso. Con esos campos verificados, casilla DEPLOY autorizaría transporte y sustitución pareada por tecdex deestosdosImageID con recuperación anterior antefallo. Casilla BACKUP/RESTORE seguiría separada si se requiere ejecutar nueva evidencia; casilla IAM/E2E seguiría separada con actores/tenants/casos exactos; casilla DDL/GRANTS permanece NO_AUTORIZADA. No solicitar GOdeploy imposible mientras esos insumos falten, ni reautorizar P0/D1–D5/APIv2. Riesgos concretos: mezcla temporalv1/v2, alcance6A.3 adicional enimagen yrecuperación no ensayada; condiciones NO_GO anteriores siguen vigentes.

36cláusulas cerradas localmente/12pendientes; RECTOR_GATE=BLOCKED, STEP_6A3=PARTIAL_BLOCKED, STEP_6A4=NOT_STARTED. Rector43§5.5: «No se hacen commit, merge ni deploy si el gate aplicable a ese artefacto o capacidad está FAIL.» Resolver P0 no dispensa ese gate ni requiere cerrar artificialmente las12 para preparar la propuesta. Sin cambios productivos/DB/API/infra, sin builds/suites nuevas, sinbackup/restore/transport/deploy/Git remoto. Siguiente acción única: QARelease/PO resuelve alcance compatible del par preparado conQA30 ylos campos de recuperación/ventana en este mismo paquete; no otra rondaP0.


## Decisión final de compatibilidad del paquete sobre QA30 — 2026-10-13T16:13:49.099763+00:00

Este append sucede la compatibilidad FULL_BUNDLE=NOT_APPROVED y la propuesta de promover la pareja completa anteriores. P0 permanece aceptado PASS_READ_ONLY; no se repitió SSH, TLS, autenticación, inventario remoto ni SQL. Se inspeccionaron las imágenes locales existentes, sin rebuild, sin ejecutar sus servidores contra QA y sin cambiar fuentes del checkout.

**QA30_PACKAGE_COMPATIBILITY=FAIL_FUNCTIONAL_DEPENDENCY.** No es un fallo de arranque/loader de las imágenes ni de IANA aislada. El paquete incorpora rutas y componentes adicionales que no pueden completar su función sobre el ledger QA30. No se declara que faltan tablas o columnas creadas por31/32: esas migraciones no crean ninguna. La incompatibilidad decisiva es la dependencia contractual de publicación que las consultas ejecutables verifican.

### Dependencia bloqueante probada en las imágenes

Backend candidato c2cb4cf9…: recorrido de imports JavaScript compilados desde server.js detecta52 módulos alcanzables. Cadena concreta: server.js → app.js → core-grc/routes.js → reference-reads.js → security/reference-publication.js. La dependencia está en la imagen ejecutable, no sólo en un test o archivo fuente sin registrar.

- GET /api/v1/framework-version-references, /api/v1/membership-references y /api/v1/retention-policy-references están registrados por registerCoreGrcRoutes. readReferencePage exige autorización y después llama requireReferencePublication y requireReferenceGrantPublication.
- requireReferencePublication exige en SQL `EXISTS (SELECT 1 FROM platform.schema_migrations sm WHERE sm.migration_id = source_migration_id AND sm.content_sha256 = source_migration_sha256 AND sm.outcome = 'applied')`. ROLE_PERMISSION_PUBLICATION fija source_migration_id=20261009000200 y SHA256920ececb9d28e3821a9faf9d2c754db481a26c0e33c53ae0f94b3a0535885ed8. El ledger P0 aceptado tiene30 entradas y no incluye ese ID. Por tanto el agregado de publicación nunca puede satisfacer44 pares para una lectura exitosa en QA30. Puede haber403 antes por permisos ausentes; si se alcanza el gate, resulta503. No se inventaron datos para ejecutar una prueba autenticada.
- Además se exige evidencia AuditEvent del comando phase6a3RolePermissionPublication, manifiesto/recibo exactos, actor ServicePrincipal PLATFORM_CONTROL y publicación tenant de los grants. Ejecutar32 por sí sola no satisface esas condiciones. Las operaciones R1/R3 de publicación33/34 siguen reservadas; no se autorizaron como parte de esta inspección.
- Frontend candidato d83025f6…: bundle real index-C6N_MYES.js SHA256da6099a85b525ff1d63d7c2fba112d21ab55958d7a9bf33330c9d94ee218a301 contiene self-v2 y los tres endpoints de referencias. core-grc.tsx, reference-selectors.tsx y structured-reference-fields.tsx incorporan esas lecturas a selección de frameworks, responsables e historial/retención. El selector descarta opciones ante403 y reporta error ante503. El paquete no puede presentarse como incremento IANA funcional independiente dejando esos componentes incorporados sin sus dependencias.

Contraste de las dos migraciones pendientes: **31=integridad CFG**, sustituye uniques/default por reglas canónicas; no incorpora relaciones/columnas, y no se encontró dependencia SQL directa de sus nuevos nombres en el handler IANA ni en GET EC. No se usa su mera ausencia como prueba de fallo del paquete. **32=permisos/grants de referencias**, publica3 permisos y44 pares, depende de31 en su preflight y es fuente obligatoria del gate de referencias antes descrito. Esta segunda dependencia basta para rechazar la pareja completa; no se requiere otra auditoría general ni consultas a filas de negocio. La lógica R3 añadida a bootstrap verifica también publicación auditada cuando los templates contienen compliance.requirement.read; no se presume resuelta mediante32.

Hashes observados del JavaScript ejecutable candidato:
- `apps/backend/dist/core-grc/routes.js`: `ea211915a110d95e505e9a470b85727d5e757e8934e066c38e905a638c6b989f`.
- `apps/backend/dist/core-grc/reference-reads.js`: `7c0625408f1f572c60e721d5c95fc0a524313c165be7484712e1e67ae366892c`.
- `apps/backend/dist/security/reference-publication.js`: `04a8bb2667ab4b1f160362b0126155a8200e48e3471334c7eb4fe7215e9c2db6`.
- `apps/backend/dist/security/platform-iam-service.js`: `7bb34da12cb50288688454b39498278324df81cb485e1a868d435679d3814cf4`.

Evidencia reproducible sin nuevos informes: imágenes/tars sellados de evidence/P0_READ_ONLY_EVIDENCE_20261013.json; ledger de evidence/P0_POSTGRES_READ_ONLY_20261013.json SHA256db47cf34eeee3c0a75cdf61a5f560fb90269bad6e8dbe0f8892eef862d6aab4a; migraciones/manifest.json SHA256f10105381a492feabf7f39ae92329c49bc7f357f3b5aee06b4ef279b983801b9; contratos ROLE_PERMISSION_PUBLICATION en packages/contracts/src/phase6a-vocabularies.ts. Extracciones locales de archivos públicos, grafo/delta y checks en /tmp/tcdx-qa30-package-review-20261013; decision-evidence.json SHA256597d159830c5f096f32a360cbdef317189a28a17ad082312ec2f0e0e67f58851 y blocking-proof.json SHA256ccdf6598ce7bcc61d7fdc4bd77318102df31bb9d3c45a2a8c0d37beaaafe8944. Los hashes y el razonamiento decisivo quedan registrados aquí, sin otro documento de diagnóstico.

### Candidato IANA independiente y pareja recuperable

**DEPLOYABLE_IMAGE_PAIR=NONE_CURRENTLY.** Las dos imágenes IANA existentes siguen siendo PASS_LOCAL de build, pero su paquete completo falla esta compatibilidad. No se puede reutilizar sólo el frontend nuevo con backend Phase5: consume self-v2; el backend anterior sólo self-v1. Tampoco backend nuevo con frontend anterior: la self-v1 retirada rompe el cliente. No modificar imágenes en sitio, desactivar gates, agregar fallbackv1 ni eliminar consultas para disfrazar compatibilidad.

**CANDIDATE_IANA_ONLY=SOURCE_BASELINE_IDENTIFIED_NOT_BUILT.** Existe una base verificable para derivarlo: release Phase5 ee6e4c359d701d2929aec649468b46e940451a8314ea06fb89574b49738faee7, source manifest del cierre final, backend local ab990… y frontend f31fd…. Se comprobaron13 fuentes/inputs pertinentes contra RELEASE_SOURCE_MANIFEST.sha256; backend desde la propia imagen y frontend desde HEAD cuyos hashes coinciden exactamente con esa release. No se usa HEAD como prueba de ausencia de cambios heredados.

Alcance del nuevo candidato: mantener esa release y sus capacidades; portar exclusivamente contrato33 aprobado, GETself-v2/404 exclusivo self-v1, default_timezone del tenant seleccionado en lectura read-only, DTO/parser/cliente v2, validador IANA y display/conversión temporal/DST/invalidation al cambiar tenant. Conservar empaquetado canónico dist y build de dependencias. No portar los nuevos selectores/rutas de referencias, publication gates, provenance/enforcement de vocabularios, grants o integridadCFG de otros incrementos. Esto es composición de un release con alcance explícito desde la base aprobada, no una rama runtime alternativa ni una compatibilidad artificial. Los slices6A.3 completos permanecen intactos en el worktree; no se revierten ni se reescriben contratos publicados.

La frontend actual mezcla la temporalidad con los componentes de referencias: el candidato requiere un delta frontend propio sobre la base versionada, revisión visual aplicable y pruebas dirigidas de ese delta, no copiar core-grc.tsx completo. No existe hoy un par sellado que materialice ese alcance. Dos nuevas imágenes serían necesarias por cambio real de fuentes del release; no son repetición de builds aprobados. No se reconstruyó nada durante esta inspección ni se atribuyeron hashes de las imágenes completas al candidato limitado. El scope/delta exactos, checks y nuevas imágenes deben quedar acreditados antes de una solicitud ejecutable de deploy.

**ROLLBACK_READY=PAIR_IMAGES_AVAILABLE_PROCEDURE_NOT_READY.** docker image inspect local confirmó ab9902e4215289307992b9aa98421d5882a18b4236752948356b4fbe25829195 y f31fd8a5b63003ba0973822854a94dc03b0b9753ec9dc165253418608c0f73ce linux/amd64. Se leyó el bundle de esa frontend: SHA2560cc529bf3dc084b508f8f5e862a31bb319f9280965eecf03b00d2ada2515b00f, self-v1 presente, ninguna de las tres nuevas rutas de referencias. P0 aceptado acredita esa pareja activa/healthy sobreQA30, sus imágenes disponibles en las VMs y contenedores históricos retenidos. No se afirma una segunda verificación remota ni una restauración ejecutada.

Rollback correcto tras una promoción sinDDL: retener los contenedores **actuales** 6acd160b…/31c3257e… con su configuración y sus images ab990…/f31fd…, y recuperar ambos juntos. No elegir al azar dos contenedores históricos: sus imágenes tienen versiones distintas. El driver histórico no es ejecutable sin adaptar: precheck fija images7989…/2299… y exige restartCount0, pero backend actual tiene1; restore/wait_healthy también exigiría0 a ese contenedor conservado. La adaptación debe comprobar baseline de restart observado del anterior (1backend/0frontend), distinguirlo del candidato nuevo(0), impedir aumentos inesperados y conservar la comparación Config/HostConfig y captura de evidencia. No se cambia restart policy ni se falsifica el contador. Hace falta esa adaptación verificada, custodia de la pareja y evidencia de recuperación exigida; por ello no se declara rollback PASS.

### Operación exacta vigente

**EXACT_QA_DEPLOY_OPERATION=BLOCKED_NO_COMPATIBLE_IMAGE_PAIR.** La propuesta anterior de transportar/reemplazar c2cb4cf9…/d83025f6… queda NO_GO por la dependencia probada. No pedir autorización de esas imágenes como incremento IANA sinDDL. REMAINING_BLOCKER: materializar y validar la pareja IANA de alcance limitado; completar driver/rollback y campos de recuperación/ventana del plan; después GO de transporte/deploy pareado separado de IAM/E2E. No se vuelven a pedir decisiones D1–D5, APIv2 ni P0.

Una vez exista el par exacto compatible, conservar el mecanismo Fase5: preflight de IDs/estado y recuperación; verificarSHA de los dos tars; transporte controlado/load/comparaciónImageID; bajo ventana/control de acceso aprobado detener/renombrar actuales, crear/iniciar candidatos con Config/HostConfig/red/mounts preservados sin exportar secretos; verificar pareja/health/API/assets; si falla, conservar candidatos/evidencia y restaurar ambos contenedores actuales, verificar images/health/assetself-v1 original. NoDDL ni cambiosIAM/grants/Caddy/DNS. No hay comando mutante autorizable hoy con los artefactos actuales; no sustituir los ImageID futuros por placeholders ejecutables.

RECTOR_GATE=BLOCKED; master TCDX_GRC_MASTER_REGENT_BASELINE_v1.8_2026-10-09; STEP_6A3=PARTIAL_BLOCKED; STEP_6A4=NOT_STARTED;36cláusulas cerradas/12pendientes. Capas producto/DB/API/backend/frontend/infra y staging preservadas: en esta iteración sólo append de este plan y evidencia temporal de lectura local. Sin SSH/SQL nuevos, builds, suites, commits/push/PR/merge/deploy/migraciones. Supuestos nuevos=NONE; no se declara compatibilidad total a partir de mocks, arranque sinDB o IANA aislada.
