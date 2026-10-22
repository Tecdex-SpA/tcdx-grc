# STEP6A3 — fechas de evidencias — PASO 9.2B

Baseline: `TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16`. `RECTOR_GATE=PASS` para esta corrección y operación QA autorizada. `STEP6A3=PARTIAL_BLOCKED`; aceptación funcional/UI humana pendiente; `STEP6A4=NOT_STARTED`.

## Causa demostrada y contrato

`docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml`, `EvidenceCreateRequest`, referencia `UtcTimestamp`: string, format date-time, RFC3339 con sufijo UTC Z. El backend `core-grc/service.ts`, `validateField`, exige fecha/hora terminada en Z y Date.parse válido. `2026-10-19` carece de hora y zona; se rechaza por formato, antes de persistencia. No hay evidencia de rechazo por rango. La captura genérica del frontend enviaba texto sin normalización.

| Campo real | Semántica | Captura y API |
| --- | --- | --- |
| valid_from / valid_to | Validez de Evidence | Hora local del tenant → instante UTC Z |
| period_start / period_end | Período medido de EvidenceVersion | Hora local del tenant → instante UTC Z |
| effective_from / effective_to | Vigencia de negocio de EvidenceVersion | Hora local del tenant → instante UTC Z |
| expires_at | Vencimiento de EvidenceVersion; no borra historia | Hora local del tenant → instante UTC Z |

Los siete son opcionales en el comando; vacío se omite, sin null, hora inventada ni default. Ninguno es fecha de calendario. Los tres intervalos conservan fin estrictamente posterior a inicio cuando ambos están informados. No se inventa una relación adicional para expires_at. Rectores 23 y24 mantienen temporalidades distintas, revisión, historia y separación archivo/evidencia.

## Corrección acotada

Sólo `CreateDrawer` de evidencias: selector compartido `TenantLocalDateTimeField` para los siete campos, normalización/validación de instantes resueltos y orden antes del upload. La zona proviene de la proyección backend de autorización del tenant seleccionado, sin fallback del navegador ni hardcode. Consulta QA READ ONLY confirma TECDEX `default_timezone=America/Santiago` (recibo adjunto). El selector reutilizado convierte local→UTC una vez y UTC→local al volver a editar. DST inexistente bloquea; DST repetido exige elegir ocurrencia. Sin introducir operaciones de edición/versionado nuevas.

Ejemplo: `19/10/2026 12:30 America/Santiago` → `2026-10-19T15:30:00Z`; `19/07/2026 12:30` → `2026-07-19T16:30:00Z`. Las horas repetidas `04/04/2026 23:30` permiten elegir `2026-04-05T02:30:00Z` o `2026-04-05T03:30:00Z`; `06/09/2026 00:30` no existe.

Se conserva el manejo previo del rechazo de creación: mensaje comprensible, campo y correlación, FileObject finalizado en el mismo formulario y reintento sin upload adicional. La conservación es en memoria del formulario abierto: cerrar/recargar no recupera un FileObject de formularios anteriores. No se crea mecanismo alternativo de recuperación ni se vuelve a transferir ningún PDF en QA.

## Verificación

- Typecheck frontend: PASS.
- Vitest focalizado `tenant-timezone.test.tsx`, `retention-local-dates.test.tsx`: 24/24 PASS (inválidos de calendario, zona ausente, UTC/local, precisión, Santiago verano/invierno, DST y orden).
- Nuevo Playwright `evidence dates use tenant instants and preserve finalized file on date rejection`: escritorio y móvil PASS. Comprueba los siete campos del payload, fin opcional omitido, cambio posterior reflejado, hora inexistente/ambigua, orden, mensaje/correlación, FileObject idéntico y una transferencia simulada para dos intentos. Repetido contra la imagen compilada exacta: 2/2 PASS. Todos los endpoints API son interceptados localmente; cero escrituras QA.
- Build frontend local y Docker linux/amd64: PASS; dependencias frontend compartidas compiladas, sin construir backend.
- Rector Governance Gate e integridad: PASS (exit0); su salida conserva estados históricos globales bloqueados y no declara aceptación STEP6A3.
- Capturas escritorio/móvil inspeccionadas: componente y lenguaje visual existentes, etiquetas accesibles, sin rediseño. `HUMAN_UI_REVIEW=PENDING`.

Recibos de imagen, bundle, despliegue, HTTPS, salud, pruebas y SHA256: [evidence/evidence-dates-20261019](evidence/evidence-dates-20261019/RESULT.json). La promoción exige imagen verificada y hash del código, mantiene configuración del contenedor QA y rollback. Verificación posterior exige hash público idéntico al bundle de la imagen. Dominio único: https://grc.tecdex.net/.

## Repetición manual exclusiva del PASO 9.2B

1. user3, tenant TECDEX, abrir la versión actualizada en https://grc.tecdex.net/ → Evidencias → Evidencias → Nuevo registro. No repetir otras pruebas aceptadas. Una pestaña cargada antes del despliegue mantiene su versión antigua hasta recargar; una recarga pierde el estado del formulario anterior.
2. Usar los valores funcionales reales ya acordados para QA_EVID_RET_001: responsable TecDex, QA_RET_ORD_001 v1, aplicabilidad Interna v1 publicada y referencia de procedencia. Seleccionar fecha y hora de negocio con los controles locales; confirmar que muestran America/Santiago. Dejar fechas opcionales vacías cuando no correspondan, respetar orden y elegir ocurrencia si hay horario repetido.
3. Crear una sola vez. Si se rechaza después de finalizar el archivo, corregir el campo indicado y reintentar en ese mismo formulario, sin cerrarlo, sin cambiar política/clasificación y sin volver a seleccionar/transferir el PDF. La corrección no recupera automáticamente un FileObject de una sesión anterior cerrada; no repetir transferencias para compensar esa limitación.
4. Tras éxito, recargar el listado y verificar QA_EVID_RET_001 y sus fechas. La creación real y la aceptación corresponden al usuario; no se ejecutaron durante estas verificaciones técnicas.

## Alcance y archivos

Modificados para este slice: `apps/frontend/src/core-grc.tsx`, nuevo caso en `e2e/core-grc-ui.spec.ts`, scripts `scripts/phase6a3/qa-{verify-evidence-dates-image,deploy-evidence-dates-frontend,promote-evidence-dates-frontend}.py`, este informe, recibos y entrada aditiva en `MASTER_EXECUTION_STATUS.md`. El patch adjunto aísla la corrección respecto del frontend pendiente existente. Trabajo previo y rama preservados; no commits ni modificación de main.

Cambió únicamente implementación/despliegue frontend QA y su verificación/documentación. Sin cambios a backend, IAM/RBAC, datos QA, PostgreSQL/esquema, contratos ejecutables/despliegue, infraestructura/topología o almacenamiento. Producción intacta. Sin conflictos rectores nuevos; aceptación humana pendiente, sin cierre de STEP6A3.
