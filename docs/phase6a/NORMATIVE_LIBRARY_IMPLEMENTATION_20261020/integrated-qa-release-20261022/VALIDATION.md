# Validación del release integrado QA

Resultado de ejecución: controles técnicos ejecutados PASS; aceptación integral PARTIAL por E2E positivo dual-actor no ejecutado en QA. RESULT.json conserva cuarenta referencias SHA256, IDs físicos y límites de cada prueba. No se equiparan fixtures locales con interfaz real.

## Pruebas y construcción

- Generadores canónicos foundations/contratos, Biblioteca y H04: reproducibles,36 migraciones y244 tablas. Rector/integridad baseline PASS.
- Typecheck global y backend/TLS PASS. Build completo y ambas imágenes linux/amd64 PASS. Warning existente del tamaño de chunk frontend sin relajar umbrales.
- Regresión definitiva:1.070 tests PASS,100 archivos.27 suites PostgreSQL/227 tests no habilitados en la ejecución general: explícitamente SKIPPED, no PASS.
- Persistencia aislada PostgreSQL16:50 tests PASS, incluidos10 de migración/default y40 operacionales B06/Definitions/B04/H04, auditoría, concurrencia, aislamiento y SoD. Clúster temporal detenido. Ningún fixture de esas suites se ejecutó sobre QA.
- B04 browser:10 tests desktop/narrow PASS usando handlers Fastify reales con SQL sintético. No son E2E de escritura sobre QA.
- Syntax Python/JavaScript y whitespace de los cambios nuevos PASS. Scanner de secretos PASS; no secretos/respaldo privado versionados.

Comandos reproducibles: pnpm test; pnpm typecheck; bash scripts/normative-library/run-operational-postgres-tests.sh; pnpm exec playwright test --config scripts/normative-library/playwright-integrated-release.config.ts; node scripts/foundations/generate-contract-assets.mjs --check; node scripts/normative-library/generate-contract-assets.mjs --check; node scripts/normative-library/generate-rights-contract.mjs --check; bash scripts/verify-rector-governance.sh. Node22.23.2/pnpm12.4.1. El runner PostgreSQL requiere su puerto local libre y sólo crea un clúster temporal propio.

La verificación offline específica es python3 scripts/normative-library/integrated-qa-release.py verify. Comprueba hashes de evidencia local, commits, IDs/cantidades y límites; no conecta a QA ni convierte PARTIAL en PASS.

## QA físico y seguridad

Conexión PostgreSQL16.15/db-tecdex/192.168.2.40/tcdx-grc con SNI/certificado verify-full y TLS1.3. Ledger36 exacto, cero migraciones fallidas; catálogos de tablas/columnas/constraints/índices/funciones/triggers y autoridad PostgreSQL idénticos antes/después. Constraints/FK e índices válidos. Sin DDL, nuevas migraciones ni reaplicaciones.

Deltas esperados: permisos+8, role_permissions+69 (39 globales/templates y30 tenant), Definitions/scopes/reglas+4 cada uno, bindings/scopes/efectos+13 cada uno. AuditEvent de publicación+94; los demás eventos nuevos corresponden a oidc.session.establish/application_token.issue. Identidades existentes conservan su cantidad y sólo muestran actualización canónica de login. Otras234 tablas, fuentes, roles, membresías, asignaciones humanas, principales y datos empresariales ajenos sin cambio.

Publisher canónico con principal existente 01a13c3b-dbdd-763f-bcbb-f16ff41d99ba, sin acceso PostgreSQL directo como sustituto de autenticación operacional. Publicación y replays verifican referencias, permisos, scopes, SoD, efectos obligatorios, versiones, fechas y audit; ausencia de duplicados acreditada por replay exacto. Global y tenant son destinos separados; un template global de rol tenant no concede autoridad Platform.

El delta tenant reconoce exclusivamente el predecesor global derivado de las mismas fuentes y vigencia: conserva sus64 auditorías byte a byte, añade sólo30 tenant y rechaza cualquier manifiesto desconocido. Pruebas PostgreSQL verificaron esa conservación y rechazo. No se sobreescribieron auditorías ni se aceptó un cambio arbitrario de contrato/fecha para forzar replay.

## Runtime e interfaz reales

HTTPS https://grc.tecdex.net/200; SHA256 del HTML público11ff9fd54e73494e2e1ae2e08a5d24831b126341a4093c06054d6ec75644d005 coincide con el HTML de la imagen frontend desplegada. Backend ready/database up, ambos contenedores healthy. Cuatro operadores finales ready; iam.library.publish y fresh M2M efectivos.

Sesión Managed Identity real PRIVACY_MANAGER: access/authorization200, Platform403 y bearer inválido401. Sesión Zoho del PO: PLATFORM_ADMIN existente, access/authorization200, siete permisos Biblioteca Platform proyectados y consulta Platform200. Sin importación/exportación de tokens, cookies o contraseñas.

Después de activar TecDex: GET knowledge-sources/knowledge-items200; matrices issues_actions y controls_evidence200 con as_of válido. La pantalla Hallazgos × Acciones renderizó una tabla real con fila, columna y relación QA existente, sin alertas ni overflow horizontal. Captura y hash en RESULT.json. La navegación Platform mostró Biblioteca editorial, fuentes, contenido y ediciones. No se declaran matrices de todas las familias con datos ni homologaciones inexistentes.

B04: API autenticada de referencias devolvió cuatro Definitions en dos controles existentes del tenant. Scopes/defaults/reglas/versiones persistidos y verificados. Selector y formulario de acceso B04 cubiertos en browser local y navegación QA; no se declara que se haya guardado/revisado/aprobado un ajuste real por UI en QA.

Separación Platform/Tenant: consulta Platform con encabezado tenant403. Usuario sin membresía en ACME2 recibe404 al consultar fuentes y referencias B04 de otro tenant, sin exposición de datos ni cambios allí. Default DENY y aislamiento negativos reales preservados.

H04: nueve comprobaciones del módulo desplegado usando un RightsRecord exclusivamente sintético en memoria y una prueba real cifrada/versionada en el Minio existente. ALLOW sólo para fuente/hash/edición/acto/entorno/audiencia/evidencia exactos; DENY ausente, otra fuente/acto/audiencia/entorno, ambiguo, revocado y hash de evidencia distinto. Versión única de prueba eliminada y ausencia verificada. No persisten fuentes, derechos, auditorías o contenido normativo de ese fixture. Persistencia y auditoría H04 sí se probaron en PostgreSQL aislado, no se falsifican como auditorías nuevas de QA.

## Incidencias resueltas y límites

Caddy estaba inaccesible desde runner y VM frontend; el PO reinició su máquina y HTTPS/OAuth se recuperaron. Codex no modificó proxy, DNS ni infraestructura. Se corrigieron la omisión de las ocho Permissions aprobadas en el generador de proyección y el soporte verify-full del backend. No se modificaron políticas RBAC para arreglar navegación.

Una segunda promoción detectó montaje duplicado del certificado: rollback recuperó el contenedor saludable y el promotor canónico fue corregido antes del reintento PASS. Se conservaron los rollback y no se forzó la promoción. El primer sondeo de storage desde un operador host-network falló por el contexto de red; se verificó correctamente dentro del backend: bucket AES256 y versioning Enabled. No se cambió la red del operador.

Un sondeo manual con bearer almacenado ya vencido devolvió401; no se cuenta como lectura positiva. Las validaciones finales usaron un login nuevo tras reemplazar el backend. Se cerraron las ventanas/procesos temporales de validación, sin exportar sesiones.

Pendiente: recorrido completo positivo de escritura/revisión/aprobación QA con actores independientes y evidencia propia; consulta de disponibilidad encontró cero GRC_MANAGER activos distintos del PO en TecDex. No se creó un usuario, rol, membresía o asignación para resolverlo artificialmente. HUMAN_UI_REVIEW no autoaprobado; no se declara MARKET_RELEASE_READY ni PASS integral.
