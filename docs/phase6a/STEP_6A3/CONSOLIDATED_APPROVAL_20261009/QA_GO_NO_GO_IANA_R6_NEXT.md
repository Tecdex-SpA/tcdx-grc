# Incremento IANA R6 next y cadencia comercial QA

PREPARED_NOT_AUTHORIZED_NOT_EXECUTED. GO_NO_GO=NO_GO actualmente. Este plan materializa la preferencia operacional del PO de2026-10-13: al terminar el mandato anterior, cada incremento funcional futuro debe promoverse de forma controlada a las VMs/QA existentes para prueba comercial. La preferencia no autoriza conexiones ni escrituras. Autorizar cada operación concreta cuando su paquete esté completo; sin push/deploy/IAM/DDL/grants por arrastre.

## Alcance del primer incremento

Únicamente proyección propia de autorización majorv2, default_timezone persistido y consumidores IANA/DST. R6_V2_APPROVAL_MANIFEST.json identifica bytes/build/tests; publicación local aún pendiente de aceptación exacta y retiro/compatibilidad. Ninguna migración para este incremento: NO_DDL_REQUIRED, NO_SCHEMA_CHANGE, NO_NEW_GRANTS. Las candidatas31/32/33/34 ySEED010/grants44 pertenecen al plan operacional STEP6A3 más amplio; no se incluyen ni se ejecutan automáticamente al promover IANA. RLS, reglas CFG-D, aplicación CT04 y ZIP normativo fuera de esta promoción.

Destinos documentados: PostgreSQL16/tcdx-grc192.168.2.40, backend192.168.2.45/grc-bk.tcdx.int, frontend192.168.2.46/grc-www.tcdx.int. Prueba pública posterior sólo https://grc.tecdex.net/. Documentados, no conectados ni comprobados vivos aquí. VentanaNOT_SCHEDULED. Destinatario de decisión GO/NO-GO: Product Owner con funciones Architecture/Backend/Security/DBA/IAM/QARelease, sin exigir segunda persona interna por defecto.

## Ficha GO NO GO por operación

| Operación | Fuente o evidencia requerida | Responsable | Estado |
|---|---|---|---|
| Publicación contractual local | aceptación del manifest exacto, propuesta de retiro v1-self y compatibilidad;25 §1/49 §3 |PO Architecture Backend Security|PENDING_EXACT_HASH_APPROVAL|
| Preflight QA read-only | autorización concreta; target/versión/estado actual/identidad de operador y despliegue; planQA R3 yR6 |DBA QARelease|NOT_AUTHORIZED|
| Backup previo | artefacto/destino/retención/encriptación/procedimiento vigentes verificables, alcance y autorización |DBA|PENDING_OPERATIONAL_INPUT|
| Restauración de prueba | destino aislado real autorizado, procedimiento compatible aprobado y evidencia de restauración/consistencia |DBA|PENDING_OPERATIONAL_INPUT|
| Publicación pareada backend frontend | build/image/asset hashes exactos, contrato publicado, consumidores presentes, antigua pareja identificada, ventana y autorización |QARelease PO|NOT_AUTHORIZED|
| Smoke con cuentas existentes |identidades canónicas, issuer/subject/membresías/roles/entitlements actuales y alcance explícito |IAM QARelease|PENDING_OPERATIONAL_INPUT|
| Recuperación |pareja anterior exacta, procedimiento real aprobado, operador y criterios de activación |QARelease DBA|PENDING_OPERATIONAL_INPUT|
| Aceptación humana comercial |registro caso a caso sobre incremento publicado, contexto/PII/visual/conclusiones reales |PO|NOT_RUN|

## Backup restore y recuperación sin inventar procedimientos

Antes de autorizar promoción, DBA debe aportar el procedimiento operacional vigente, su ruta/versión/hash y los identificadores no secretos del backup y destino de restore. Verificar aplicabilidad al estado real y autorizaciones de operación. Sólo entonces ejecutar backup, validar artefacto y restaurar en el destino aislado autorizado; registrar consistencia, ledger/migraciones, ownership, grants, counts y pruebas negativas conforme a aquel procedimiento. Estos son gates de aceptación, no un nuevo procedimiento de restore ejecutable. La falta de procedimiento/destino tiene estadoPENDING_OPERATIONAL_INPUT, dueñoDBA, fuente requerida: operacional QA vigente; referencias históricas enQA planR3 y cierrePhase5 son antecedentes sin acreditación actual.

scripts/foundations/verify-restore.ts está limitado a localhost127.0.0.1:55432 y un ledger histórico; no reutilizarlo sobreQA ni declararlo procedimiento comercial. IANA no modifica datos/esquema: no hay down-migration ni rollbackDB de este incremento. Recuperación de aplicación requiere volver únicamente a la pareja backend/frontend anterior exacta y aprobada, cuyo digest y procedimiento son todavía inputs pendientes; no borrar historia, contratos, auditoría ni datos. Actualizar caché/activos y verificar la proyección correspondiente a esa pareja según su procedimiento autorizado. No se propone borrar sesiones ni inventar comandos de runtime.

## Smoke externo propuesto después de autorización

Con actores/tenants/membresías existentes y autorizados: login/session real, proyección propia200, default_timezone igual al dato persistido del tenant activo, null sin selección; errores400/401/403/404/503 según contexto; no Tenant.read adicional ni acceso transversal PlatformSupport/Admin; revocación y cambio A/B sin contexto temporal anterior; backendUTCZ y presentación por zona persistida; gapDST rechazado, overlap inequívoco con offset válido; secretos/PII/UUID sin exposición adicional. Confirmar retiro v1-self404 sólo si la decisión exacta lo aprueba, y conservar v1providers/access/business. Verificar no-store/Vary, CORS, activos MIME/hash, logo aprobado, deep-route y reload. Observaciones/error/capturas con redacción y criterio humano; simulación local no sustituye E2E externo ni IAM real.

## Cadencia para incrementos futuros

Preparar una sola ficha versionada por incremento: alcance, delta/manifest/hash, compatibilidad/migraciones explícitas, tests locales actuales, recuperación, actores y operación exacta. PresentarGO/NO-GO alPO. TrasGO y autorización específica, promover a las VMs existentes, ejecutar smoke y prueba comercial, registrar aceptación o recuperación real, y adjuntar esa evidencia al incremento antes del siguiente. Sin automatizar operaciones de riesgo ni usar una autorización anterior fuera de su alcance.

GO sólo con todos los gates aplicables a IANA completos y autorizaciones concretas;NO_GO actual por contrato/compatibilidad y datos operacionales. Los bloqueos CFG-D/CT04 se mantienen en sus actos dependientes y no se inventan como impedimento para un futuro smoke IANA autorizado. STEP6A3 permanecePARTIAL_BLOCKED hasta satisfacer todas sus cláusulas aplicables.

Los inputs individuales, fuentes y dueños constan en evidence/continuity-r6/qa-operational-inputs.json yQA_PROMOTION_PACKAGE_R6.md. No se inventan cuentas, identidades, grants, imagen, backup, destino ni ventana. QA/IAM/E2E externoNOT_RUN;DEPLOY0;DDL_QA0.
