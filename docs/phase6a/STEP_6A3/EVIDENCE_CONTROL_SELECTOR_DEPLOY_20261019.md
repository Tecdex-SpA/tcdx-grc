# STEP6A3 — despliegue QA del selector de vínculos — 2026-10-19

Baseline `TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16`. Autorización explícita del usuario: promover exclusivamente la corrección existente de links.control_id, sin reimplementarla ni ampliar alcance. Procedimiento de promoción frontend QA reutilizado de qa-deploy/promote-evidence-dates-frontend.py, con nombre de imagen/rollback/recibos propios de esta operación. No requiere commit, push, merge ni operación Git mutante.

## Origen y alcance

Commit de origen: `4a275264a7522031e62bf09f598c9d56e21d25e0`; rama `fix/step6a3-v112-continuity-20261016`. Árbol local con cambios pendientes; **la corrección no está contenida en ese commit**. El manifiesto de SHA256 del árbol preflight y el patch focal previo identifican los bytes reales construidos. No se hizo commit ni se cambió main.

Únicos archivos de producto que componen la corrección existente: apps/frontend/src/reference-read.ts y apps/frontend/src/structured-reference-fields.tsx. Se verificaron contra el patch de EVIDENCE_NOT_FOUND_DIAGNOSIS_20261019.md: contexto tenantOwnedControl exclusivo de links.control_id, opciones ownership_class=TENANT_OWNED; conservación de catálogo general, cursores, controles tenant y demás categorías. Sin tenant/ID hardcodeado ni cambios de validación backend. No se volvió a modificar código de producto. La prueba adicional evidence-link-selector-deploy.test.ts sólo verifica regresión de otras cuatro categorías y rechazo de tenant ajeno.

Todo el contenido previo de apps/frontend, apps/backend, contratos ejecutables y baseline se comparó por hash antes de promover: preservado, salvo artefactos generados de build excluidos. Se conservan los cambios pendientes anteriores. Source-manifest/source-preservation e image-verification registran hashes; sin reset, clean, stash ni worktrees nuevos.

## Gates y artefacto

Seis pruebas Vitest focalizadas PASS: filtro global/tenant y cursor, categorías Requirement/RequirementAssessment/ControlAssessment/AssuranceTest, rechazo de referencia de otro tenant. Typecheck frontend PASS. Build frontend PASS; Docker linux/amd64 PASS; Rector Governance Gate exit0 PASS. Otras pruebas no requeridas omitidas.

Imagen nueva: `sha256:b4fdbc1ce487269f5a531cafcebdbfc2dcae8f029780a689a65bf8c704bf9564`.
Tag: tcdx-grc-frontend:step6a3-evidence-control-selector-20261019.
Bundle: `index-CNgO5Y7x.js`, SHA256 `c1876e91991ad27c22f8276ff560f69f4a79d7c48e874297bc3b73952bd8a03e`.

La imagen exacta fue arrancada localmente y comprobada con Playwright desktop/narrow (2/2 PASS): control global no ofrecido como control_id, control tenant disponible y seleccionable. Servido y archivo interno de imagen idénticos. API simulada, sin transferencias ni POST de creación. No se repitieron flujos de login/upload/fechas aceptados. Las categorías restantes se verificaron en pruebas focalizadas; ramas del selector ajenas a control_id permanecen sin modificación. Capturas preservan el componente y presentación existentes; HUMAN_UI_REVIEW=PENDING.

## Evidencia operativa

Recibos en evidence/evidence-control-selector-deploy-20261019: source-manifest, source-preservation, gates/build, image-verification, preflight, promotion, postdeploy, backend-before/after, pruebas del bundle público, capturas y RESULT.json con SHA256SUMS. RESULT.json es el estado final de esta ejecución.

La promoción conserva la configuración del contenedor frontend existente y retiene rollback. Verificación posterior: healthy, cero reinicios, HTTPS200/TLS válido en https://grc.tecdex.net/, bundle público idéntico al de imagen. Se ejecuta también la prueba focal desktop/narrow desde el dominio público con API interceptada, sin afectar datos QA; esto acredita comportamiento del frontend desplegado y no sustituye aceptación humana con datos reales. Backend se compara antes/después por imagen, container ID y tiempo de arranque; no se reconstruye ni despliega.

Sin cambios PostgreSQL/datos/migraciones, API contracts, IAM/RBAC, identidad, almacenamiento, infraestructura/topología o producción. Sólo se sustituye el contenedor frontend QA; no se crean controles ni vínculos ni evidencias, no se transfiere PDF y no se ejecuta SQL.

## Pendiente de PASO 9.2B

La corrección impide seleccionar el control global EVIDENCE-001 como control_id. El bloqueo documental/datos del diagnóstico anterior continúa: no existe implementación TECDEX de ese control, y no se acredita que el PDF respalde el único control tenant de requisitos de clientes. No se recomienda un vínculo artificial. Resolver ese caso de prueba con autoridad funcional antes de reintentar.

El FileObject finalizado se conserva en el mismo formulario abierto; cerrar o recargar no recupera su estado automáticamente. La versión nueva se carga al abrir/recargar la aplicación; un formulario abierto antes del despliegue conserva el JavaScript anterior. No se prescribe recargar ese formulario ni repetir upload para compensarlo.

`STEP6A3=PARTIAL_BLOCKED`; `PASO9.2B=BLOCKED_TEST_DATA`; `STEP6A4=NOT_STARTED`. No se declara cierre ni aceptación funcional. No hay conflictos rectores nuevos.

## Resultado final

`FRONTEND_QA_DEPLOY=PASS`; `RECTOR_GATE=PASS`; `TENANT_ISOLATION=PASS`; `BACKEND_UNCHANGED=YES`; `DATABASE_UNCHANGED=YES`; `CONTRACTS_UNCHANGED=YES`. Desktop/narrow sobre imagen exacta y bundle público: 2/2 PASS en cada ejecución, APIs simuladas, sin escrituras QA. Frontend healthy/cero reinicios; HTTPS200 y TLS válido; SHA público idéntico al artefacto. Backend antes/después idéntico en imagen/contenedor/arranque/salud/reinicios. Se verificó preservación final de hashes de todo código previo y contratos. HUMAN_UI_REVIEW y aceptación funcional pendientes. Las afirmaciones de datos/infraestructura intactos se refieren a las acciones de esta operación; no se ejecutó SQL ni se modificaron otros servicios.
