# STEP_6A3 — conciliación de continuidad verificada

`MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.10_2026-10-15`
`RECTOR_BASELINE=PASS; STEP_6A3=PARTIAL_BLOCKED; RECTOR_GATE=BLOCKED; STEP_6A4=NOT_STARTED`
`CODEX_VARIATION_BUDGET=ZERO; TASK_PACKET_STATUS=BLOCKED`

## DONE — alcance de esta continuación

Mismo worktree `/private/tmp/tcdx-grc-step6a3-prep-20261015`, rama `codex/step6a3-c04w-cfgd-prep-20261015`, HEAD `23c7b50468213b8c0769ca2607349e04f4c32eae`. Se preservó el trabajo previo modificado y no rastreado. Las observaciones QA de esta continuación constan con sus UTC reales en `evidence/account-continuity-20261015/`; no se les atribuye la hora de la sesión interrumpida.

| Control | Resultado y alcance | Evidencia en ese directorio |
|---|---|---|
| Baseline v1.10 / v1.9 protegida / 51 candidatos | PASS; manifest rector `b9b6bf6930931af5eb32ca1b4027212ad3a82f247fef677b919af24d30ac9060` | `v110-governance.log`, `rector-governance.log`, `rector-status.log` |
| Cuatro candidatos + seis snapshots | PASS_CONTRACT_EFFECTIVE; se corroboran copias, proyecciones, dependencias y ambos actos, sin volver a publicar | `authority-integrity.json`; receipts remotos físico/ejecutable en `backend-runtime.json` |
| Acta seis snapshots | SHA `9841298fc01c6dfef1efd062a5f72bed1cd4aab47499e0a2e2199577f42e0539`; manifest de publicación `e7f30ded29f213fa33a8648466b5c7bbfcc6bb520e6cdf2b11968a41d9f6e944` | `authority-integrity.json` y originales de amendments |
| Contrato 27 histórico | SHA exacto `eedf85debfb5eb48e25d4abdd5ff4332c5dba8197ab7b96a66b97f640cfef4df` | `authority-integrity.json` |
| QA PostgreSQL 16 / ledger | 34 entradas y todos sus checksums exactos; R2 preservada, ninguna migración ejecutada | `live-ledger-registry.json`, `reconciliation-result.json` |
| Esquema | Verificador oficial recuperado: 242 tablas, `schemaMismatches=0`. Se reutiliza: R2 y expected-schema siguen con los mismos hashes. Lectura QA actual: cero FK sin validar y cero cascadas | `recovered-step6a3-final-qa-schema.log`, `live-ledger-registry.json` |
| Registry M2M C-04W | Cinco aristas publicadas exactas, scope tenant, sin efectos, una auditoría de principal M2M por arista, manifest exacto. Se compararon todos los campos del mapping, no sólo conteos | `live-ledger-registry.json`, `verification-retry-result.json`, operator receipt en `backend-runtime.json` |
| Replay M2M | La sesión parcial conserva salida de replay con cero filas/cero auditorías nuevas; la lectura actual prueba ausencia de duplicados. No se reejecutó publicación para fabricar otro recibo | `partial-session-excerpts.json`, cinco auditorías actuales; test aislado recuperado `recovered-c04w-lifecycle-pg.log` |
| Backend QA final | Imagen `sha256:474e525a3e6b2bcc067dda7a77039b36f2832ca37d138b1424a700644560fc6d`, fuente `879942f159f61a607712fe4c7ba79668343f008285e43a37129159fae821a58e`, healthy / cero reinicios | `backend-runtime.json`, activation receipt remoto recuperado |
| Frontend QA español final | Imagen `sha256:552ff3e9412cb1c78bfa3400c26c8835c6a2bfa09a6db1dc72ef18b8a2712eeb`, fuente `bac88a14e73d95ed258cd4e3c9a615dce5ec42c7352241b5239fec7e16d45821`, healthy / cero reinicios | `frontend-runtime.json`, ambos activation receipts, incluido el final UI ES |
| Rollback y salud | Tres contenedores previos por servicio retenidos; cero patrones fatal/SQL error/HTTP 5xx desde el arranque observado. Son contadores, no una certificación de observabilidad completa | `backend-runtime.json`, `frontend-runtime.json` |
| Fuente local / imagen activa | Cero diferencias en 187 entradas backend y 77 frontend de los manifests finales, labels de imagen y sources concordantes. No se afirma atestación criptográfica firmada del build | `source-parity.json` y manifests recuperados |
| C-04W real | Dos filas under_review, row_version 2, cuatro auditorías y cuatro registros idempotentes completados. Una usó SubmitForReview y la otra Review. No hubo approve/publish de esos casos | `recovered-step6a3-c04w-qa-proof.json`, `live-c04w.json` |
| CFG-D real Controls | Assessment nuevo completed/insufficient_data, métricas/cobertura/conclusión nulas, auditoría de submit. El aprobado histórico y su updated_at siguen iguales | `recovered-step6a3-cfgd-qa-proof.json`, `live-cfgd.json` |
| Preservación comercial e histórica | Fingerprints de suscripciones, plan v1, entitlements v1, roles y reference grants coinciden con el checkpoint final previo. EvidenceVersion histórica conserva effective_from NULL, approved y row_version 4 | `live-commercial-preservation.json`, `live-c04w.json`, `reconciliation-result.json` |
| Acceso HTTPS público | `/` 200; colecciones de aplicabilidad y assessments sin autenticación 401 | `public-http-now.json` |

La fila técnica `01a14126-bc97-7721-85e4-e34026cf4213` y la fila `01a14127-94bf-72c7-b2b8-ad4c48fb0905` son pruebas pendientes de respaldo, no fuentes legales. El assessment diagnóstico es `01a14122-06e4-748d-a3db-5935f64c1901`. No se creó ni modificó ninguno en esta continuación.

## Verificaciones focalizadas y corrección del test

Se ejecutaron con Node 22.23.2: typecheck backend y frontend PASS; contratos generados PASS (242 tablas/34 migraciones/169 operaciones); gobernanza/integridad/status PASS; `git diff --check` PASS; secrets scan cero hallazgos. Sus recibos están ligados a comandos, salidas y hashes en `verification-result.json`, `verification-retry-result.json` y `completion-checks.json`.

UI local sobre el código final: cuatro casos C-04W PASS en escritorio y estrecho. Dos casos antiguos de captura de políticas fallaron inicialmente: su respuesta simulada de autorización carecía de `privacy.retention_policy.read`, y la UI ocultaba correctamente la pestaña. Se corrigió exclusivamente ese fixture en `e2e/core-grc-ui.spec.ts`; sólo esos dos casos se repitieron y pasaron. Resultado final: **seis casos únicos satisfechos**; no se oculta el fallo inicial ni se presenta como cambio del producto. Capturas del detalle de retención en español preservadas como `mock-ui-politicas-retencion-{chromium-desktop,chromium-narrow}.png`; inspección de la estrecha confirma etiquetas españolas y detalle legible. No son capturas QA autenticadas ni aprobación humana. Los screenshots preexistentes del repositorio se restauraron a sus bytes anteriores después de la captura.

Se recuperaron los logs de nueve tests de preflight, tres tests del mapping, un test de publicación PostgreSQL con rollback, un test de impacto del operador, 40 pruebas focalizadas y 23 pruebas PostgreSQL. No se suman como pruebas nuevas ni se repiten. Los logs son salidas locales sin firma; su procedencia y timestamps se conservan en `recovery-index.json`. El PASS previo de 367 checks queda referenciado en el expediente histórico, no se inventa un nuevo log de esa ejecución.

## PENDING_HUMAN y límites de evidencia

1. **Fuente jurídica auténtica y revisión separada.** Privacy/Legal debe entregar documento autorizado, origen, cláusula, contexto y vigencia; el revisor independiente debe efectuar su acto real. La elegibilidad previa de una membership no es consentimiento. La única EvidenceVersion histórica no se altera ni se hace suficiente artificialmente.
2. **Contexto inicial para incorporar la fuente.** Hoy no hay aplicabilidad primaria publicada y el upload nuevo la exige. La fuente auténtica y el recorrido inicial autorizado deben quedar resueltos antes de H03 del checklist; no se promete que simplemente subir un archivo sea posible, ni se publica una fila sin respaldo para eludirlo. Véase el preflight H02 y su regla de detención. No se solicita otra aprobación del paquete de diez artefactos.
3. **Aceptación humana QA/UI de las imágenes finales**, y recibos específicos faltantes del slice. La aprobación comercial anterior mantiene su alcance, sin extenderse a estas pantallas. El checklist contiene URLs, roles, acciones, resultados, precondiciones y acta sin firmar.

Persistencia y auditoría corroboran las operaciones exitosas, pero no reconstruyen todo el HTTP anterior. El login Zoho, DENY de autoaprobación y rechazo del intento de imponer valid están reportados por el log parcial; no se recuperó un recibo HTTP de esos rechazos ni los binarios de las capturas de la herramienta de escritorio anterior. La consulta filtrada de logs no obtuvo respuestas correlacionables (`qa-http-log-corroboration.json`). No se fabrica dicha prueba. Compliance v1 tampoco tiene un recibo QA específico recuperado. Los negativos de cross-tenant/entitlement, discordancia de policy/clasificación, fuente no elegible y hold posterior siguen diferenciados de las pruebas PostgreSQL aisladas; los que dependan de fuente se ejecutan después de disponer de ella. Los pasos concretos constan en el checklist.

Siguiente acción humana inmediata: **H01, aportar/identificar la fuente auténtica y su responsable Privacy/Legal; después resolver H02 con el contexto real y coordinar la revisión independiente**. No hace falta repetir publicación, migración ni despliegue para realizar ese acto. Aceptación y cierre se registran después de ejecutar los pasos aplicables y conservar sus recibos.

## Archivos y capas

Esta continuación sólo añadió este informe, `C04W_CFGD_HUMAN_CLOSEOUT_CHECKLIST_20261015.md` y `evidence/account-continuity-20261015/`; amplió aditivamente el expediente residual y MASTER_EXECUTION_STATUS; corrigió dos líneas del fixture en `e2e/core-grc-ui.spec.ts`. El resto del diff amplio pertenece al trabajo recuperado y se conserva. `git-before.json` permite distinguirlo.

BD: sin DDL/DML; contratos ejecutables: sin nuevos bytes ni publicación; backend: sin cambio; frontend runtime: sin cambio; infraestructura y contratos de despliegue: sin cambio. QA: exclusivamente lectura, sin deploy adicional ni publicación M2M repetida. Sin producción, commit, push, merge, reset o limpieza destructiva.

Trazabilidad: rectores 23/24/38/46/49 → diez sucesoras aprobadas + mapping exacto → R2/ledger34 → operador M2M/auditoría → imágenes finales → casos QA persistidos / pruebas locales → recibos de continuidad / checklist / futuro acto humano. No hay divergencia de hashes detectada ni nuevas decisiones de producto tomadas por Codex. La incorporación inicial y las actuaciones humanas siguen pendientes; no se infiere solución material. Supuestos introducidos: NONE. Archivos fuera de alcance modificados: NONE. Decisiones mecánicas: cotejo de bytes, recuperación de recibos, fixture de permiso de lectura y derivación de checklist. SOG v2 continúa DRAFT_NOT_EFFECTIVE.

Este informe **no declara cerrado STEP_6A3** y no inicia STEP_6A4.
