# Habilitación futura QA — preparado, no ejecutado

**Estado actual: NO-GO integral.** Este documento no autoriza conectarse ni ejecutar QA. Precondiciones pendientes: resolver LOCAL-DEFINITIONS-01 en un alcance autorizado compatible con la cadena rectora; autorización PO concreta para datos operacionales/despliegue; actores/tenants reales de prueba permitidos; evidencia H04 auténtica por fuente/acto; aceptación humana posterior. No ejecutar migraciones 1–35 otra vez ni editar sus bytes.

## 1. Preflight offline

1. Revisar REPORT, BLOCKERS, RESULT y FILE_MANIFEST. Ejecutar `python3 docs/phase6a/NORMATIVE_LIBRARY_IMPLEMENTATION_20261020/local-operational-preparation-20261022/verify.py`.
2. Registrar bytes exactos que se pretende habilitar. Verificar baseline v1.12 activa, cadena de publicación B01–B09/B06/Item/H04/PV01/B04, generador canónico, 35 migraciones y expected-schema de 244 tablas. Revalidar después de cualquier cambio; un snapshot histórico no acepta deltas futuros por inferencia.
3. Mantener STEP6A5/STEP6A6 no iniciados. No importar fuentes ni contenido protegido en esta habilitación. No cambiar DNS, certificados, infraestructura o identidad.
4. Resolver LOCAL-DEFINITIONS-01 sin sentinelas, defaults arbitrarios, disable de constraints ni SQL alternativo. Exigir pruebas físicas positivas de cuatro Definitions/scopes/rules y flujo B04. Mientras no exista una reconciliación autorizada y verificada, **detener esta habilitación integral**.

## 2. Delimitar los datos y el actor de ejecución

- Usar el publisher IAM privado ya existente, su ServicePrincipal autenticado y perfil exacto QA; no provisionar/revocar personas ni ejecutar `iam.publish` genérico para este slice. No inferir permiso por email/nombre de rol.
- Construir el input estricto `{tenantIds, effectiveFrom, effectiveTo}` con los tenants autorizados y vigencia real. No hay IDs/fechas de clientes predefinidos en esta entrega. Resolver identidades canónicas de tenants/roles, evitar duplicados y comprobar integridad; el publisher no crea roles faltantes. Tenant nuevo posterior usa la materialización canónica de roles baseline, sin una grant universal.
- Revisar IAM_REGISTRY_PREPARATION.json y el delta esperado. El alcance técnico de `iam.library.publish` es únicamente catálogo/grants aprobados y 13 bindings; **no publica Definitions ni derechos**. No es una activación de toda la Biblioteca.
- Registrar autorización PO, alcance, lista de targets, intervalo, checksum del input y manifest derivado. Es evidencia de ejecución futura, no un recibo de aprobación existente en esta entrega.

## 3. Preflight QA, sólo tras la autorización futura

Con las credenciales/sesión canónicas autorizadas, comprobar identidad del entorno, ledger exacto, catálogo/roles y esquema aprobado. Hacer lecturas acotadas y fingerprints previos; no reparar divergencias automáticamente. Verificar snapshot/recuperación aprobado y ventana de ejecución. Validar los roles y asignaciones humanos efectivos con pertenencia y vigencia, scopes/entitlements, sin añadir permisos para compensar escenarios ausentes.

Exigir storage privado/cifrado/versionado y cursor firmado canónicos para el backend. El bootstrap debe fallar cerrado si faltan. El dominio de usuario es https://grc.tecdex.net/. Un HTTP200 no acredita derechos, RBAC, datos ni aceptación operacional.

## 4. Orden de activación

1. Publicar IAM/registry por el **mismo operador privado** existente. Configuración opcional exacta: `TCDX_LIBRARY_PUBLICATION_ROOT`, `TCDX_LIBRARY_PUBLICATION_INPUT_FILE`, `TCDX_LIBRARY_PUBLICATION_INPUT_SHA256`, junto al perfil IAM ya aprobado. El loader verifica hashes y sólo se configura dentro del perfil QA canónico; configurar no publica.
2. El comando privado futuro es `iam-publication-operator-cli SOCKET iam.library.publish`. IamPublicationService autentica de nuevo y resuelve el principal; la transacción bloquea catálogos/registry, valida ledger y publica únicamente las filas aprobadas con AuditEvent. No llamarlo desde este expediente ni desde el arranque. Ausencia/conflicto de rol, permiso, scope, policy, efecto, auditoría o ledger significa NO-GO.
3. Publicar las cuatro Definitions/reglas **sólo mediante la solución canónica posterior que resuelva LOCAL-DEFINITIONS-01**. Esta entrega suministra los descriptores/reglas, no un INSERT ejecutable que viole el modelo. Resolver UUIDs en la transacción, preservar versionamiento/vigencia/scopes/NULL defaults y auditoría. No sustituirlo por cuatro filas de conveniencia.
4. Incorporar H04 por fuente/acto con la autoridad humana y evidencia reales correspondientes. Preparar un right-id UUIDv7, el tuple exacto y su binding_hash; custodiar el proof cerrado en una versión privada inmutable `knowledge-rights/<right-id>/<uuidv7>.json`, dentro del bucket existente. No cargar licencias comerciales ni contenido normativo en esta fase sin autorización propia.
5. Para cada incorporación interna, usar un VerifiedIdentity verificado por el autenticador/sesión canónicos vigentes y `recordSourceRights(db, context, record, new MinioRightsEvidence(client,bucket))`. El context lleva tenant cuando corresponda, correlation UUID y rationale. El record lleva la versión/hash exacta de evidencia y recorded_audit_event_id UUIDv7. Estos son métodos internos; no hay endpoint de mantenimiento ni upload API que los clientes deban usar. No inyectar identidades sin autenticación ni usar el verificador sintético del test. Concesión H04 no otorga acceso IAM/pack por sí sola.
6. Sólo con autorización de despliegue posterior, promover los bytes backend/frontend verificados. No promover artefactos o datos sintéticos del runner local. Preservar el rollback de la imagen previa y verificar hash de bundle/configuración/salud.

## 5. Idempotencia, transacciones y recuperación

El publisher IAM usa READ COMMITTED, locks de tablas, lock_timeout5s y statement_timeout60s. Todos sus catálogos/relaciones/bindings/auditorías son una transacción. Repetir el mismo input/hash y principal resulta en cero filas/audits nuevos. Cualquier divergencia bloquea en vez de sobrescribir. No cambiar el input para «forzar» replay: un manifest distinto requiere su propio análisis de delta, y el actual falla cerrado si contradice auditorías anteriores.

H04 serializa por Source: incorpora AuditEvent+derecho atómicamente, rechaza solapamientos ambiguos y revalida autoridad en replay. Revocación vía `revokeSourceRights` es monotónica, auditada y no borra historia. Si falla la transacción, rollback completo y registrar el error; no «completar a mano» una fila parcial. Proof pre-custodiado sin fila aceptada no confiere derecho; conservarlo para diagnóstico/replay y recuperación por la política de almacenamiento vigente, sin borrado improvisado.

Después de commit no deshacer publicaciones por DELETE masivo ni modificar audits. Si hay defecto: detener nuevas activaciones, preservar evidencia y usar recuperación de snapshot aprobada o procedimiento de revocación/gobierno aplicable al objeto. Registrar el alcance y validar fingerprints posteriores. Restaurar una imagen no restaura los datos publicados: no confundir ambas recuperaciones. No existe un script destructivo de rollback en esta entrega.

## 6. Verificaciones posteriores y aceptación

- Comparar filas exactas y ausencia de duplicados con manifests/audits; repetir la publicación idéntica y comprobar cero delta.
- Verificar los13 bindings: permiso FK, key/versión, scope, destino, precondition/SoD, audit, efectos/ordinal/requeridos, CAS/idempotencia y ausencia de system actors.
- Verificar las4 Definitions: code/version, owner global, publicación/vigencia, NULL defaults contractuales, un scope control_version y una regla exacta. Probar listado contextual B04, create funcional sin permiso administrativo, revalidación al guardar, review/decide de otro autor y conflicto/replay.
- Ejecutar ALLOW/DENY con usuarios de prueba reales autorizados y dos tenants: sin permiso, sin entitlement, scope incorrecto, Platform/Tenant, Support metadata, SoD, objects ajenos y default DENY. No conceder roles para fabricar un PASS.
- Probar fuente/acto H04 válido y los negativos de ausencia/insuficiencia/no vigencia/acto/fuente/audiencia/entorno/proof; comprobar audit y revocación. Archivos disponibles no implican autorización.
- Probar APIs/B07, historia/auditoría/outbox exigidos, mini/full de los seis tipos de matriz y flujo Knowledge. Separar prueba física de persistencia, navegador con mocks y E2E QA. No adjudicar a fixtures evidencia de usuarios reales.
- Validación humana de uso/UI y decisión PO de habilitación del alcance. No autoaprobar HUMAN_UI_REVIEW ni MARKET_RELEASE_READY.

## 7. NO-GO

Cualquier hash/gate fallido; LOCAL-DEFINITIONS-01 sin resolver; intento de editar las35 migraciones/generador; rol/tenant/actor/evidencia inexistente; grants amplios; policy/SoD/aislamiento débiles; duplicate/ambiguous registry o derechos; ausencia de recuperación; licencia no probada; contenido preliminar promovido como oficial; despliegue/import/QA no autorizado. Detener el bloque afectado y conservar evidencia. El procedimiento no arrastra autorización a producción ni a fases posteriores.
