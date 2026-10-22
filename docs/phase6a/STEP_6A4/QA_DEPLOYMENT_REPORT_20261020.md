# STEP6A4 — CONTROLLED QA DEPLOYMENT AND REAL VALIDATION REPORT

## A. Estado

```
PREDEPLOYMENT_GATE=PASS
BUILD_STATUS=PASS
QA_DEPLOYMENT=PASS
STEP6A4_QA_VERIFICATION=BLOCKED
STEP6A4_HUMAN_ACCEPTANCE=PENDING
RECTOR_GATE=PASS
STEP6A4_CLOSURE=BLOCKED
STEP6A3_CLOSURE=PASS_PRESERVED
```

El frontend autorizado quedó publicado correctamente. La verificación real fue de acceso, lectura, renderizado, referencias, validación local y confirmaciones canceladas. No se ejecutaron comandos de negocio para fabricar resultados. Los42 formularios tienen clasificación individual BLOCKED_HUMAN_ACTION respecto de la operación completa; no se confunde despliegue saludable con aceptación funcional.

## B. Identificación

- Baseline activa: TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16. Entrada46/enforcement/AGENTS vigentes; sin cambio de autoridad. Visual v1.0 preservada; sin autoaprobación humana.
- Rama: fix/step6a3-v112-continuity-20261016.
- HEAD: 4a275264a7522031e62bf09f598c9d56e21d25e0.
- Git: 27 rutas tracked modificadas preexistentes, 78 entradas untracked de status final; índice sin cambios. 3724 archivos de entrada preservados byte a byte; las126 entradas del sellado local verificadas. No commit/push/merge/cambio de rama.
- Origen exclusivo: https://grc.tecdex.net/. TLS válido, HTTP200 y bundle público idéntico al de la imagen; dominio erróneo ausente de entradas de build y bundle. No configuración alternativa ni compensación DNS.
- Host frontend QA:192.168.2.46; NODE_ENV=qa. Backend real QA:192.168.2.45, healthy.
- Imagen anterior: `sha256:b4fdbc1ce487269f5a531cafcebdbfc2dcae8f029780a689a65bf8c704bf9564`.
- Imagen nueva/tag: `tcdx-grc-frontend:step6a4-ux-business-forms-20261020`.
- Digest/identificador inmutable nuevo: `sha256:bc8f21f7edaa0779cfafbfee01afe324d81e7e39bf45d4e51302bc6b7303fdd6`; RepoDigest `tcdx-grc-frontend@sha256:bc8f21f7edaa0779cfafbfee01afe324d81e7e39bf45d4e51302bc6b7303fdd6`; Linux/amd64. Fuente dirty tree identificada por manifest `e47df6eaa298ed6bd40812d4f437c8d8fddacac2640b85dbe1ebf7c73c6a97b4`; HEAD solo no describe todos sus bytes.
- Rollout: 2026-10-20T13:42:38.485086+00:00 → 2026-10-20T13:42:48.341834+00:00; 10:42:38–10:42:48 America/Santiago, 2026-10-20.
- Contenedor nuevo: `5b74e613dc8dc3a5ac38759960a09ffc80a15674dee9a70de882f857048f8fb2`; running/healthy,0 reinicios. Última comprobación: 2026-10-20T13:50:28.683199+00:00; estabilidad observada de más de7min desde inicio.
- Bundle: `/assets/index-I3a0WyWz.js`, SHA256 `4692b2d67c7892ef91c1cbce222be509d1334fc161c90a35fa07addf03ab8ff9`.

Procedimiento: precedente documentado `docs/phase6a/STEP_6A3/EVIDENCE_CONTROL_SELECTOR_DEPLOY_20261019.md`, Dockerfile frontend vigente, docker save/SSH/docker load y promotor frontend que clona configuración existente y conserva rollback. Adaptación exclusivamente de nombres de contenedor para esta ejecución. Sin registro remoto/Git ni promoción del backend.

## C. Cobertura

| Evidencia | Resultado |
| --- | --- |
| Formularios inventariados/clasificados |42/42 |
| UI de formularios observada con backend real, escritorio1440x1000/390x844 |15: FORM-01,04,05,07,08,10,11,13,14,16,21,23,28,33,38 |
| Operación completa PASS / FAIL / BLOCKED_HUMAN_ACTION |0 /0 /42 |
| Escrituras de negocio |0; sin cargas/descargas ni repetición de aceptación STEP6A3 |
| Referencias históricas clasificadas |95/95:94 activas y1 retirada N/A (F-0122) |
| Campos de referencia observados directamente en UI |22; observación parcial de lectura, no validación de escritura completa |
| Referencias con roundtrip mutante/persistencia nueva acreditados |0 |
| Typecheck/lint/build global,61 pruebas unitarias/contrato/componentes,92 casos de navegador |PASS local reutilizado por integridad sellada; los92 usan API simulada y no acreditan QA |
| Build Docker de publicación |PASS, sin cambios de dependencias/configuración para el build; advertencia Vite de tamaño de bundle preservada |
| Rector predeploy/final, contract-assets --check, form-assets --check, diff --check |PASS |
| Secret scan por patrones, fuentes/bundle/evidencia textual |PASS,0 coincidencias; límite explícito, no prueba universal |

Transversales: SoA mostró dependencia real Control/ControlVersion y selección del par; no se envió payload. EvidenceLink mostró seis destinos tipados y seis lookups completados (*-loaded.txt), con fechas opcionales; sin creación/persistencia. Retención mostró segundos/minutos/horas/días de24h y condición legal hold; sin modificar políticas. Muestras conserva cobertura contractual local; ejecución real bloqueada porque la prueba visible está aprobada. No se alteran estados para obtener cobertura.

Accesibilidad: foco inicial en cerrar, trap Tab/Shift+Tab, Escape y retorno al disparador observados; envío vacío bloqueado con resumen y errores. Las15 capturas estrechas tienen ancho390 sin overflow horizontal del documento; drawer con desplazamiento y acción esencial visible. No equivalen a auditoría WCAG completa ni aceptación visual humana. Las confirmaciones de iniciar/aprobar requisitos muestran significado y estado resultante; fueron canceladas antes del comando.

Matrices: `evidence/qa-20261020/FORM_QA_MATRIX.csv` y `REFERENCE_QA_MATRIX.csv`. Cada fila incluye operación/campo, permiso, estado, evidencia y justificación. Los estados aprobados/publicados/atendidos/verificados y el alcance del actor impiden varias acciones. El acceso por Zoho usa la sesión/cuenta existente de TecDex; no se infiere identidad canónica ni permisos operativos desde el nombre Platform Admin.

## D. Seguridad e integridad

Backend intacto: mismo contenedor, imagen, started_at, health y reinicios antes/después. PostgreSQL, migraciones, IAM/RBAC, permisos, OpenAPI/contratos, baseline, metodologías y datos no fueron modificados. Preservación de fuentes/índice/evidencias locales PASS. Aislamiento multi-tenant, SoD real, auditoría transaccional, conflictos/idempotencia reales: **NOT_VERIFIED** en esta ejecución; no se acreditan por mocks o por selección de tenant.

Rollback disponible: `tcdx-grc-frontend-rollback-step6a4-ux-business-forms-20261020`, contenedor anterior conservado/detenido con imagen exacta anterior. La salud anterior consta en frontend-before.json; el health de un contenedor detenido no demuestra salud actual. Reversión oficial y condiciones en `INCIDENTS_AND_LIMITS.md`; no se ejecutó ni ensayó rollback porque no hubo fallo crítico observado. No se afirma ausencia universal de regresiones.

Incidencias: primer build bloqueado por escritura Buildx fuera del sandbox, mismo comando reejecutado con escalamiento aprobado. La UI volvió una vez a login durante lectura y recuperó por Zoho; causa no atribuida sin evidencia, sin cambio de duración/autenticación ni bypass. Recibos conservados. Sin incidencia crítica demostrada que requiera rollback.

## E. Pendientes humanos

La guía `HUMAN_ACCEPTANCE_QA_20261020.md` identifica pantalla, actor/permisos efectivos y resultado esperado para cada grupo; la matriz individual desglosa las42 operaciones. Acción mínima del PO: seleccionar escenarios auténticos QA y actores existentes elegibles para las operaciones pendientes, conservando SoD. No inventar fuentes, evidencia, identidades o datos. No modificar registros terminales aceptados para completar una prueba. Después, ejecutar las operaciones correspondientes por UI y observar persistencia mediante lecturas oficiales; obtener confirmación explícita funcional/visual/accesibilidad STEP6A4.

Las comprobaciones de aislamiento/conflictos/idempotencia/auditoría requieren escenarios reales autorizados suficientes, no una aceptación visual. No se repiten actividades humanas ya aceptadas de STEP6A3. Si faltan decisiones/evidencia auténticas, mantener el bloqueo individual; no es un permiso para conceder roles nuevos.

## F. Dictamen

**Frontend STEP6A4 desplegado y estable en QA, listo para revisión humana de presentación. La verificación funcional completa y el cierre permanecen bloqueados por acciones/escenarios humanos pendientes.** No se declara cierre ni QA integral PASS. STEP6A5, STEP6A6 y biblioteca normativa intermedia no iniciadas. No cambios de infraestructura ajenos al reemplazo frontend autorizado ni producción.

Archivos nuevos de esta ejecución: `scripts/phase6a4/qa-promote-frontend.py`, `qa-deploy-frontend.py`, `qa-consolidate-evidence.py`; este informe, guía humana y directorio QA. Ningún archivo preexistente modificado. Lista exacta, hashes y estado Git en CHANGED_FILES.json, SHA256SUMS.txt y git-final.txt del expediente. Evidencia local/STEP6A3 sellada intacta. El ledger rector imprime checkpoints históricos anteriores; no se reinterpretan como estado de cierre vigente.
