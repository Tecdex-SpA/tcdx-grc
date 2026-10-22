# STEP6A3 — PASO 9.2B — NOT_FOUND de control de evidencia

`MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16`. `RECTOR_GATE=PASS` para diagnóstico/corrección local; `PASO9.2B=BLOCKED_TEST_DATA`; `STEP6A3=PARTIAL_BLOCKED`; `STEP6A4=NOT_STARTED`. Aceptación funcional/UI pendiente. Dominio único https://grc.tecdex.net/.

## Recurso que falla y prueba de tenant

Correlación informada: `01a1551c-ffb1-7588-99c4-452ff359cb6e`, timestamp UUID 2026-10-19T17:02:06.257Z.

El control `01a0ea93-d21e-76d9-a73d-8494499a2398` **existe globalmente**, con tenant_id=NULL, ownership_class=PLATFORM_CONTROL, código EVIDENCE-001, nombre Protección de evidencias y registros y lifecycle=draft. Su versión `01a0ea93-d236-7544-8b75-b3d5d16b0007` también es global/draft. No es un Control de TECDEX.

`createEvidence` mapea links.control_id a controls.controls y llama referenceExists sin globalAllowed. La consulta exige control_id=$1 AND tenant_id=$2; para TECDEX (`01a0cfc7-0c97-75a3-890f-d6ca9db8bbe9`) retorna cero filas. Eso produce exactamente TCDX.RESOURCE.NOT_FOUND. No falta el control en el catálogo: falta una referencia de ese tipo **perteneciente al tenant**. El backend conserva el comportamiento contractual; no se amplía globalAllowed ni se sustituye el tipo por ControlVersion.

Rector24 exige targets tipados y aislamiento; demostrar implementación del tenant requiere su Control, no sólo una versión global. EvidenceLinkCreateInput distingue control_id de control_version_id; que un catálogo de lectura muestre referencias globales no las vuelve targets control_id válidos.

## FileObject y límite de trazabilidad

READ ONLY encuentra, inmediatamente antes del error (461ms), FileObject `01a1551c-fdf8-72e0-aa91-85a45bd805c9`, archivo GRC_Tecdex_Evidencia_QA_STEP6A3.pdf, 71932bytes, creado por user3 a17:02:05.796Z en TECDEX, scan passed. Policy QA_RET_ORD_001 y aplicabilidad Interna están publicadas; sin EvidenceVersion que lo use. El archivo no fue modificado, transferido, descargado ni eliminado durante el diagnóstico.

La consulta por correlación en audit_events retorna cero filas; docker logs tampoco contiene la correlación. El servidor tiene logger=false y no conserva aquí un payload de la petición rechazada; la transacción fallida no deja un resultado idempotente exitoso. Por ello la asociación del FileObject con esa correlación se acredita por autor/tiempo/archivo, **no por un payload persistido**. No se afirma haber recuperado el request exacto. El fallo del control indicado es determinista e independiente de esa limitación. El FileObject encontrado existe y su cadena no está ausente; sin el payload original no se excluye otra referencia distinta enviada por el navegador.

## Defecto demostrado y corrección mínima local

El selector de vínculos usaba el lector genérico de controles, que incluye controles de referencia globales visibles en el tenant. Permitía escogerlos como control_id; el backend los rechaza correctamente. Corregido únicamente el selector **dentro de StructuredCollectionEditor kind=links**, campo control_id: contexto tenantOwnedControl y filtrado de opciones ownership_class=TENANT_OWNED. El API de lectura y su autorización siguen iguales. Se preservan búsqueda, cursores/paginación, aislamiento de tenant, catálogos de referencia para otros consumidores y transporte de FileObject. Ningún ID/tenant/código del incidente está hardcodeado en implementación.

Archivos de implementación: apps/frontend/src/structured-reference-fields.tsx y apps/frontend/src/reference-read.ts. Archivos de pruebas: reference-read.test.ts, core-grc.test.ts y nuevo caso focal en e2e/core-grc-ui.spec.ts. Diagnóstico: scripts/phase6a3/qa-evidence-not-found-readonly.cjs, este informe, recibos y entrada de estado. Los archivos tenían trabajo pendiente anterior: el patch adjunto aísla sólo la corrección nueva. No se modificaron backend de producto, contratos, PostgreSQL/esquema/datos, IAM/RBAC, auditoría, almacenamiento o arquitectura. No hubo deploy ni cambio de main/worktrees.

## Datos de prueba y compatibilidad

La consulta sin límite de controles tenant encuentra **un solo Control TECDEX**: `01a118d7-6222-7470-8a85-306e07659f4a`, QA-F5-20261007-CONTROL, QA Phase5 20261007 - Control de requisitos de clientes, active, basado en otra versión global (`01a0ea93-d739-7298-adf1-3a1336487617`). No existe una implementación TECDEX del Control EVIDENCE-001 indicado. Sus evaluaciones/prueba históricas de la consulta anterior pertenecen al control de requisitos de clientes; no se convierten automáticamente en respaldo de protección de evidencias.

**BLOCKED_TEST_DATA**: no se entrega un ID como sustituto compatible con el documento, porque esa compatibilidad no está acreditada. No se leyó contenido del PDF; su nombre/procedencia no prueban una relación con el control de requisitos de clientes ni con otro target admitido. No se concluye inexistencia universal de un Requirement/ControlVersion apropiado: no se ha acreditado un vínculo documental genuino y la implementación tenant pretendida está ausente. Seleccionar el único Control tenant sólo para superar la validación inventaría el vínculo. Se necesita un caso documental que respalde un objeto existente elegible, o preparación de datos de prueba autorizada separadamente; no se ejecuta ninguna de esas mutaciones en esta tarea.

## Validación y estado

- Prueba focal frontend: excluye globales sólo en contexto de EvidenceLink, conserva catálogo general y cursor incluso en página sin elegibles: PASS.
- Prueba focal backend: el control global no satisface el predicado tenant; NOT_FOUND y ningún EvidenceLink insertado: PASS. Executor simulado, sin escrituras QA.
- Playwright focal del selector: desktop y narrow PASS (2/2), mocks locales, cero POST de creación/cargas; capturas guardadas e inspeccionadas. Componente/estilo existentes conservados; no autoaprobación humana.
- Typecheck frontend/backend: PASS. Build frontend: PASS.
- Rector Governance Gate: PASS exit0; whitespace: PASS.
- No se repitieron login, upload, fechas o aceptación previa. QA **no desplegado** por instrucción expresa; conserva su frontend anterior. Corrección local preparada para revisión/autorización futura, sin pedir ni asumir deploy.

## Retomar PASO 9.2B

Mantener el formulario abierto para preservar su file_object_id finalizado. No recargar/cerrar ni modificar política/clasificación/selección del PDF; la recuperación entre formularios no existe en la UI actual. No reintentar con el control global indicado ni cambiarlo ciegamente por el único Control tenant. Resolver primero el bloqueo de datos/pertinencia documental con autoridad funcional. Una vez exista un target real compatible y autorizado, seleccionar ese vínculo y reintentar en el mismo formulario sin repetir upload. La corrección del selector aún no está en QA; su promoción requiere autorización del usuario. No se declara éxito funcional ni cierre.

Recibos en evidence/evidence-not-found-20261019: qa-readonly.json, correlation-log-readonly.json, focused-tests.log, playwright.log, typechecks/build/governance, capturas, frontend-scoped-change.patch, RESULT.json y SHA256SUMS.txt.
