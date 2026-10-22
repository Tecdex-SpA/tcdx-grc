# Plan de habilitación operacional propuesto

Este plan no fue ejecutado. Cada bloque termina en un gate y no arrastra autorización al siguiente.

## 1. Reproducibilidad canónica

- Corregir el único generador foundations para consumir la autoridad sucesora B01–B09/H04/PV01.
- Reproducir exactamente manifest de 35 y expected-schema de 244 tablas de dominio.
- Probar que los 34 registros previos/hashes permanecen inmutables y que cualquier drift falla cerrado.
- Gate: assets, rector integrity, rector status, migration manifest y expected-schema PASS.

## 2. Composición backend local

- Construir `composeNormativeLibraryFromStorage` desde DB, Minio, entorno y cursor canónicos.
- Entregarla a `buildApp` sin flag alterno, migración-on-start ni fallback ALLOW.
- Mantener error explícito/fail-closed si storage, cursor, contratos o datos operacionales faltan.
- Verificar 31 rutas, hooks B07, effective configuration y no duplicación de rutas.
- Gate: unit/contract/typecheck/build y servidor local aislado PASS; QA no tocado.

## 3. Integración frontend local

- Completar árbol/búsqueda/edición y capas Knowledge sobre el `NormsWorkspace` existente.
- Agregar flujos autorizados de contexto, cuatro ajustes y aprobación, sin exponer acciones sin permiso.
- Montar los seis tipos de matriz: miniaturas dashboard y vista completa dentro de módulos ya permitidos, sin iniciar Riesgos.
- Mantener filtros B09 efímeros y sin export/Report Studio.
- Gate: build, rutas, accesibilidad, desktop/narrow, estados de error/deny/empty; HUMAN_UI_REVIEW permanece pendiente.

## 4. Pruebas aisladas antes de QA

- PostgreSQL desechable: migración 35 + manifests operacionales candidatos con datos sintéticos.
- Matriz de autorización Platform Admin/Support y roles tenant; dos tenants; autoaprobación; rights absent/present.
- Replay, stale ETag, audit/outbox, rollback, historia B07 y seis matrices con paginación/filtros.
- Browser local con backend real aislado, no mock de API, y fixtures sintéticos.
- Gate: contract/integration/E2E aislado PASS con límites explícitos.

## 5. Preparación QA con autorizaciones separadas

- Publicar permisos/grants exactos, bindings B06 y Definitions/reglas mediante manifests auditables y transacciones separadas o secuencia aprobada.
- Registrar sólo derechos H04 acreditados; contenido propio/sintético se identifica como tal.
- No importar fuentes en este bloque.
- Gate: fingerprints, ledger de datos operacionales, ALLOW/DENY y drift PASS.

## 6. Deploy QA y E2E real

- Verificar paridad de imagen/bytes y desplegar backend/frontend sólo con autorización específica.
- Smoke de rutas, lectura/escritura, SoD, H04, multi-tenant, matrices y UI con identidades de prueba autorizadas.
- Validar audit/outbox e inexistencia de conteos/objetos cruzados.
- Ejecutar visual/accessibility y solicitar revisión humana.
- Gate: runtime QA/E2E PASS; no implica producción ni contenido oficial.

## 7. Contenido y pruebas humanas

- Importar cada paquete sólo con autorización propia, derechos y gate independiente.
- Mantener 211 candidatos, 104 propuestas y seis crosswalks en su estado real; ninguna equivalencia automática.
- Probar COMPRENDER/IMPLEMENTAR/DEMOSTRAR con contenido propio, sintético o autorizado.
- Cerrar publicación oficial por paquete antes de salida comercial, separada del funcionamiento técnico.

