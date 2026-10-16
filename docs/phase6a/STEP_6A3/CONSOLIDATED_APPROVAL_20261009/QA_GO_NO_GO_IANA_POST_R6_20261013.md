# QA IANA/API v2 — paquete sucesor para paso a paso ChatGPT

2026-10-13. PREPARED_NOT_AUTHORIZED_NOT_EXECUTED. DEPLOY=NO_GO; siguiente acto propuesto GO-P0=READ_ONLY_PREFLIGHT, actualmente NOT_AUTHORIZED. Este paquete sucede las fichas R5/R6/R6_NEXT sin cambiar sus bytes. El PO pidió que ChatGPT dé el paso a paso de despliegue con esta salida. Las órdenes siguientes son previstas, no ejecutadas; los campos entre `<...>` requieren datos verificados, no valores supuestos.

## Alcance y autoridad

Rector v1.8 ACTIVE_VERIFIED, manifest SHA `e51f6539df119775b2feb8839907c8cd690623b82707b399aa15a31d59196533`. IANA/API v2 local ya publicada: metadata33 y R6_NEXT_V2_APPROVAL_RECEIPT.json; manifest SHA `88e8a56c0d4939e257cd3ab70c21df96ef0ebee5105ea2990036ca83888a0397`; semántica SHA `6205faaafa3cb0cbd4d0cf34cd9c8343ccca64392e638a833e10fa7db8c73375`. No pedir otra aprobación D1–D5 ni API v2/retiro v1. D5 autoriza preparar, no conectar ni desplegar.

Rector43 §1: «Ninguna fase posterior comienza sin evidencia PASS de su gate»; §5.5: «No se hacen commit, merge ni deploy si el gate aplicable a ese artefacto o capacidad está FAIL.» Rector46 §5: «Un PASS parcial no autoriza la etapa siguiente salvo que 43 lo establezca expresamente.» No se identificó en estas secciones prohibición universal de toda lectura QA durante 6A.3; sí prohibición de avanzar fases o promover un artefacto con gate fallido. GO-P0 propuesto es verificación dentro del slice actual, no cierre/avance. Un GO humano no dispensa gates técnicos; no se propone excepción para desplegar el worktree entero bloqueado.

Incremento funcional solicitado: GET /api/v2/auth/me/authorization, IANA persistida y consumidores UTC/DST; GET /api/v1/auth/me/authorization pasa a 404 sin Location/redirect/fallback; resto de v1 permanece. DTO cerrado exige pareja backend/frontend exacta. Sin migración/grant/permiso nuevos para IANA. CT04, sucesor CFG-D, RLS físico y adopciones31–34 quedan fuera de este incremento.

**Límite de empaquetado:** R6 parte de un worktree R1/R2/R3 aún sin integrar. Dockerfiles copian las aplicaciones y packages completos; construir directamente este checkout transportaría también referencias, vocabularios y dependencias físicas/RBAC anteriores. Histórico QA registra 30 migraciones; manifest local incluye 32 y candidatas33/34 están fuera. NO_DDL_REQUIRED corresponde al delta IANA, no certifica compatibilidad de todo el checkout con QA. P0 debe comprobar ledger/dependencias. Falta un manifest desplegable de alcance cerrado que demuestre compatibilidad con el QA actual. No se inventa ni implementa un aislamiento/cherry-pick contractual: si necesita nuevos bytes fuera del delta publicado, debe revisarse el delta exacto y probarse antes de promoverlo. No aplicar31–34 por arrastre.

## Destinos y último runtime acreditado

| Destino | Identificación verificable en fuentes locales | Estado actual |
|---|---|---|
| PostgreSQL | 192.168.2.40 / tcdx-grc / PostgreSQL16; rector12/43/46 | Documentado; no conectado |
| Backend | 192.168.2.45 / grc-bk.tcdx.int; contenedor tcdx-grc-backend; puerto4000 | Runtime vigente PENDING_OPERATIONAL_INPUT |
| Frontend | 192.168.2.46 / grc-www.tcdx.int; contenedor tcdx-grc-frontend; puerto8080 | Runtime vigente PENDING_OPERATIONAL_INPUT |
| Público | https://grc.tecdex.net/; build VITE_API_ORIGIN=https://grc.tecdex.net | Disponibilidad vigente no probada |

Última observación histórica: artifacts/phase5-integration/PHASE5_FINAL_QA_RECOVERY_PROOF.json, capturada 2026-10-08T12:44:20.154639+00:00; testedMainCommit 7225f1ee607c0c9be5c810976f66c3c27a40e06c. Source labels de contenedores: revision bbf4c8752ebcfa91a3215f7096c6df5b5a74d081, tree 4aaa36167744a6c6be62750748f53f8106f3c638. Distinguir esa etiqueta runtime del main probado y del HEAD heredado actual.

- Backend ImageID real observado: `sha256:ab9902e4215289307992b9aa98421d5882a18b4236752948356b4fbe25829195`.
- Frontend ImageID real observado: `sha256:f31fd8a5b63003ba0973822854a94dc03b0b9753ec9dc165253418608c0f73ce`.
- Ambas imageAvailableForRollback=true entonces; disponibilidad actual pendiente. Las labels com.docker.compose.image difieren de esos ImageID; no usarlas como prueba del digest ejecutado.
- Compose backend histórico: `/home/tecdex/apps/tcdx-grc-phase5-role-revoke-20260928-r2/deploy/qa/docker-compose.yml` + `/tmp/tcdx-grc-step23k-backend.override.yml`.
- Compose frontend histórico: `/home/tecdex/apps/tcdx-grc-phase5-role-revoke-frontend-final-20260928/deploy/qa/docker-compose.frontend.yml` + `/tmp/tcdx-grc-step23l-p0r-frontend.override.yml`.
- DB histórica: 30 migraciones, última20261007000200, 237 tablas, 172 permisos; schema SHA `741f79e8aaefa0b8b0bb9080d6ddff2ace49ead11b00619f2008e8db53935080`. No afirmar vigencia actual ni sustituir por cifras de otras observaciones Phase5.

Estas rutas y digests son candidatos de comparación/rollback, no un procedimiento de operación aprobado actualmente. No ejecutar los compose del repo por sus tags históricos ni iniciar object-storage-init/MinIO/ClamAV como efecto indirecto.

## Readiness y campos precisos

| Gate/campo | Estado | Responsable y fuente exacta para completarlo |
|---|---|---|
| Publicación local/34 fuentes/17 artefactos exactos | GO_LOCAL_VERIFIED | Metadata33, recibo R6_NEXT, checkpoint sucesor; ya aceptados |
| Lectura QA por Codex | NO_GO: falta GO-P0 | PO Andrés Barouh, acto/ventana/targets de este paquete; exclusiones del recibo R6_NEXT |
| Operador SSH por VM y referencia de acceso protegida | PENDING_OPERATIONAL_INPUT | PO/QARelease; procedimiento QA vigente. Directorio /home/tecdex no prueba identidad autorizada |
| Identidad DBA y servicio/rol de conexión read-only | PENDING_OPERATIONAL_INPUT | DBA/PO; QA_OPERATIONAL_PLAN_R3.json actor_plan.DBA_execution_identity=null; indicar identificador, no contraseña |
| Release/images/compose/hashes actuales y clientes aún v1 | PENDING_OPERATIONAL_INPUT | QARelease mediante P0; prueba histórica PHASE5_FINAL_QA_RECOVERY_PROOF.json |
| Candidato desplegable: manifest exacto, pareja de imágenes y compatibilidad DB | PENDING_OPERATIONAL_INPUT | QARelease/Architecture; R6_V2_APPROVAL_MANIFEST.json y Dockerfiles. No imagen construida, no asumir todo checkout no-DDL |
| Humanos existentes, issuer/subject, tenant A y B activos, membresías/grants/entitlements | PENDING_OPERATIONAL_INPUT | IAM/PO; QA planR3 actor_plan.real_tenant_memberships_and_entitlements=null. Baruj/andres.grc son sólo antecedentes Phase5 |
| Datos temporales reales válidos y aislamiento | PENDING_OPERATIONAL_INPUT | IAM/DBA: tenants seleccionados por PO, zonas persistidas, membresías y autorización existentes; sin crear cuentas/tenant/datos |
| Backup/PITR: artefacto/destino/cifrado/retención/operador | PENDING_OPERATIONAL_INPUT | DBA; procedimiento operacional vigente ruta/versión/hash y evidencia actual; fuentes R6 qa-operational-inputs.json |
| Restore: destino aislado/procedimiento/prueba consistente | PENDING_OPERATIONAL_INPUT | DBA; no usar scripts/foundations/verify-restore.ts, restringido a localhost/ledger histórico |
| Rollback pareado y control de acceso durante sustitución/reload | PENDING_OPERATIONAL_INPUT | QARelease: imágenes actuales retenidas, overrides preservados, procedimiento vigente/operador; coordinación HTTPS sin inventar host del proxy |
| Ventana y GO de integración/construcción/transferencia/deploy/smoke | NOT_SCHEDULED / NOT_AUTHORIZED | PO/QARelease, actos separados del GO-P0. Sin commit/push/PR/merge/deploy implícitos |
| ServicePrincipal PLATFORM_CONTROL para33/34 | NO_APLICA al delta IANA; pendiente STEP6A3 | IAM/DBA; QA planR3 existing_real_service_principal_id=null. No convierte despliegue IANA en operación de grants |
| QA/IAM/E2E/humano móvil/UI/aceptación comercial | NOT_RUN | PO/IAM/QARelease tras autorización específica; no autoaprobar |

## Secuencia operacional prevista para ChatGPT

1. Obtener el único GO-P0 transcrito al final y operador/servicio read-only/ventana. Sin esos campos, no abrir conexiones. Conectar sólo targets autorizados; timeout conexión10s, comando30s y transacción30s. Interrumpir ante identidad/destino incorrecto o timeout; preservar salida minimizada, no ampliar permisos.
2. Revalidar pareja vigente, disponibilidad rollback, rutas compose y revisión/imagen reales; leer salud y HTTPS, nunca env/secrets ni docker inspect completo. Ejemplos previstos, sustituyendo operador validado:

```sh
ssh -o BatchMode=yes -o ConnectTimeout=10 <SSH_OPERATOR_BACKEND>@192.168.2.45 'docker inspect --format "{{.Name}} {{.Image}} {{.Config.Image}} {{.State.Status}} {{.State.Health.Status}}" tcdx-grc-backend'
ssh -o BatchMode=yes -o ConnectTimeout=10 <SSH_OPERATOR_FRONTEND>@192.168.2.46 'docker inspect --format "{{.Name}} {{.Image}} {{.Config.Image}} {{.State.Status}} {{.State.Health.Status}}" tcdx-grc-frontend'
curl --connect-timeout 10 --max-time 20 --silent --show-error --output /dev/null --write-out '%{http_code}\n' https://grc.tecdex.net/
curl --connect-timeout 10 --max-time 20 --silent --show-error --output /dev/null --write-out '%{http_code}\n' https://grc.tecdex.net/api/v1/auth/providers
```

Lecturas adicionales previstas: docker inspect de labels seleccionadas (revision/tree/compose.config_files), docker image inspect de los ImageID corrientes/rollback con formato selectivo; checksum de compose/overrides sin contenido de secretos. No iniciar sesión humana real en P0. Leer DB mediante `psql 'service=<APPROVED_QA_RO_SERVICE>' -X --set=ON_ERROR_STOP=1` y sólo el bloque revisado:

```sql
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '30s';
SELECT current_database(), inet_server_addr(), inet_server_port(),
       current_setting('server_version_num'), current_user;
SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname=current_user;
SELECT migration_id, filename, content_sha256, transactional
  FROM platform.schema_migrations WHERE outcome='applied' ORDER BY migration_id;
SELECT table_schema, table_name, column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema='platform' AND table_name='tenants'
   AND column_name IN ('tenant_id','default_timezone','lifecycle_state');
ROLLBACK;
```

Los IDs de tenant/humano, issuer/subject y permisos para leerlos deben estar delimitados por PO/IAM antes del inventario de membresías/zonas. Usar sólo dos tenants existentes seleccionados y resultados mínimos; sin listado global de personas, PII ni dumps. El mismo gate rige inventario histórico VOC; si se solicita, usar mapping30 y predicates físicos ya sellados, no scope automático de IANA. P0 verifica permisos existentes, no concede ninguno.

3. Resolver compatibilidad del candidato con ese estado. Sellar alcance exacto y cerrar gates aplicables. Git sigue no integrado: antes de cualquier mutación Git, aprobar el manifest de rutas y alcance; staging selectivo, comparación del staged manifest y secret/whitespace/governance; commit sólo autorizado, push de rama/PR a main, required CI y revisión humana, merge sin bypass. No add -A ni incorporar archivos heredados por arrastre. Comandos previstos: `git add --pathspec-from-file=<APPROVED_PATH_MANIFEST>`, `git diff --cached --check`, `git diff --cached --name-only`, `git commit -F <REVIEWED_MESSAGE_FILE>`, `git push origin <APPROVED_BRANCH>`, `gh pr create --base main --head <APPROVED_BRANCH> --body-file <REVIEWED_PR_BODY>`, `gh pr checks <PR>`, `gh pr merge <PR> --merge`. Cada acto necesita autorización efectiva y gates; PR/release IDs aún no existen.
4. Tras autorización de construcción sobre fuente integrada y sellada: `docker build -f apps/backend/Dockerfile -t <APPROVED_BACKEND_TAG> <FROZEN_SOURCE_DIR>` y `docker build -f apps/frontend/Dockerfile --build-arg VITE_API_ORIGIN=https://grc.tecdex.net -t <APPROVED_FRONTEND_TAG> <FROZEN_SOURCE_DIR>`. Registrar ImageID, arquitectura compatible y SHA de assets/source; validar etiqueta vs imagen. Si la fuente difiere del candidato probado, ejecutar las pruebas afectadas y gates integrales exigidos; no heredar automáticamente los872. No construir ahora ni alterar Dockerfiles/tags del repo.
5. DBA completa backup compatible y restore aislado verificado mediante procedimiento vigente aprobado; QARelease conserva pareja/compose/overrides anteriores y verifica rollback. IANA no tiene down-migration DB. No hay comando backup/restore ejecutable aprobado actualmente: faltan ruta/versión/hash/destino; ChatGPT debe incorporarlo desde DBA, no inventarlo.
6. Con GO_DEPLOY específico para pareja exacta, ventana y procedimiento de control de acceso: transportar con `docker save -o <RELEASE_TAR> <EXACT_IMAGE_ID>`, verificar `shasum -a 256 <RELEASE_TAR>`, `scp <RELEASE_TAR> <APPROVED_OPERATOR>@<APPROVED_VM>:<APPROVED_DESTINATION>`, `docker load -i <VERIFIED_RELEASE_TAR>` en cada VM. Usar compose vigente verificado + override de imagen exacta aprobado. Backend: `docker compose -f <VERIFIED_BACKEND_COMPOSE> -f <APPROVED_BACKEND_OVERRIDE> up -d --no-deps --no-build --pull never backend`; frontend equivalente con service `frontend`. No levantar servicios auxiliares, migrador, seed ni IAM. Coordinar la pareja en ventana; clientes antiguos abiertos deben recargar assets. La ruta v1 retirada produce404 y no se restaura con fallback. Disponibilidad parcial/pareja mezclada=NO_GO.
7. Verificar imágenes reales, health, HTTPS/logo/asset hash/MIME/deep-route/reload, no-store/Vary y consumo v2. GET v1-self404 sin Location; v1providers200; otros v1 del release conservados. GET v2 sin sesión401; sesión humana real con tenant activo200 y zona igual a persistencia; sin tenant tenant_permissions=null; header inválido400; no humano/inactivo403; foreign/no membership/inexistente404; temporal/dependencia inválida503. No provocar503 corrompiendo datos ni indisponibilidad QA sin permiso: usar evidencia negativa local donde no exista caso real autorizado y mantener ese gate pendiente. Revalidar revocación/grants/tenant isolation sin realizar mutaciones IAM. Switch A/B invalida zona anterior; UTC Z API; DST ambiguo/inexistente rechazado. Smoke autenticado mediante sesión/archivo protegido aprobado, nunca tokens en comandos/reportes. No presuponer password+MFA Managed Identity; usar flujo vigente contractual. PO prueba móvil manual y registra aceptación visual/comercial.
8. Ante health fallido, digest/asset distinto, mezcla de clientes, bypass, timezone distinta, cruce tenant o regresión v1: detener avance, recuperar pareja anterior exacta con sus overrides mediante el mismo up selectivo autorizado; confirmar ImageID/health/assets/API de la pareja anterior. El retorno de la ruta de autorización anterior corresponde al release anterior completo. No restaurar datos ni borrar audit/historia/sesiones por decisión automática. Si rollback no está disponible, DEPLOY=NO_GO antes de sustituir. Después registrar evidencia y aceptación humana; no afirmar cierre6A.3/6A.4 por este smoke.

## Una solicitud operacional concreta para presentar al PO

> Solicito GO-P0 exclusivamente para preflight QA de sólo lectura de este paquete: backend192.168.2.45/tcdx-grc-backend, frontend192.168.2.46/tcdx-grc-frontend, PostgreSQL16/192.168.2.40/tcdx-grc y GETs HTTPS sin sesión a https://grc.tecdex.net/. Andrés Barouh (PO) confirma la función operacional y designa el operador SSH por VM, identificador DBA/rol/servicio read-only, referencia protegida de acceso y ventana UTC. Autoriza únicamente identidad/ledger/columna timezone, imágenes/salud/labels seleccionadas, checksums compose/rollback y GETs públicos previstos; la lectura de membresías/zonas queda limitada a humano y tenants A/B existentes que PO/IAM identifiquen expresamente. Resultados mínimos sin secretos/PII. Recuperación P0: ROLLBACK/cierre de conexiones, sin mutación de negocio; riesgo limitado a carga de lectura, con timeouts. El efecto es identificar release y compatibilidad reales para completar el paso a paso de ChatGPT. No autoriza Git operativo, construcción/transferencia/deploy, DDL, grants, IAM real, backup/restore ni gates humanos. GO_DEPLOY permanece NO_GO hasta presentar pareja exacta, gates, backup/restore, rollback y ventana verificables.

La confirmación se necesita por rector45 §2 («ejecutar commit, push, merge, migración, deploy o acción destructiva sin autorización específica y gate aplicable» está prohibido), rector49 §3 y exclusiones explícitas del recibo R6_NEXT y del mandato del PO: D5 no autoriza conexión QA. No hay rechazo automático de aprobación; falta autoridad operacional concreta. No se solicitan secretos ni otra decisión contractual.
