# Evaluación de preparación operacional B01–B09/H04

Fecha: 2026-10-22. Posición: POST-STEP6A4 / PRE-STEP6A5. Alcance: diagnóstico local posterior a la adopción física QA; sin habilitación operacional.

## Resultado ejecutivo

La migración `20261021221204` sigue acreditada como aplicada y verificada físicamente en QA. Su SHA-256 es `9279159e88c60fff03f998e33008fb0d675f53e4423df638c9e54f709a773798`, el ledger conserva las 34 migraciones anteriores y agrega sólo el registro 35, y el verificador sellado de adopción vuelve a informar 18 controles posteriores PASS y 242/242 fingerprints de tablas de negocio preservados.

B01–B09/H04 no están operacionalmente habilitados. El código local contiene contratos derivados, servicios, policies, adapters, 31 handlers, rutas condicionales, hooks, seis proyecciones matriciales y componentes UI aislados. El bootstrap real no crea ni entrega `normativeLibrary`, por lo que no registra esas rutas ni los hooks B07. El shell frontend no importa ni monta los componentes de biblioteca o matrices; el bundle construido no contiene sus textos ni rutas. Los ocho permisos/grants contractuales, trece bindings B06, cuatro Definitions/reglas y derechos H04 reales no fueron activados.

Además apareció un bloqueo de reproducibilidad que no estaba cubierto por el recibo físico: `scripts/test-rector-governance-status.sh` falla porque el generador rector `scripts/foundations/generate-contract-assets.mjs` aún reconstruye el manifiesto C04W de 34 migraciones y no reproduce el manifiesto efectivo de 35 ni su expected-schema sucesor. No se modificó el generador durante este diagnóstico.

`OPERATIONAL_READINESS_ASSESSMENT=INCOMPLETE`. La arquitectura publicada y el delta físico son coherentes, pero el gate rector de generación canónica queda bloqueado hasta reconciliar el único generador existente con la autoridad sucesora. Ningún B01–B09 alcanza persistencia→dominio→API→RBAC→audit→UI→E2E→runtime.

## Estado por clase

| Clase | Componentes | Evidencia y límite |
| --- | --- | --- |
| Implementado y verificado dentro de su capa | DDL QA; contratos derivados; validación B01; lógica local Knowledge/H04, configuración, lifecycle, aplicabilidad y matrices | Recibo físico; assets contractuales PASS; 159 pruebas focalizadas; builds/typechecks PASS. No equivale a operación de producto. |
| Implementado pero desconectado | `composeNormativeLibrary`, `registerNormativeLibraryRoutes`, hooks B07, lectores/mutaciones, `ConnectedKnowledgeContent`, `LibraryMatrixView` | La dependencia es opcional y `server.ts` no la suministra; `main.tsx` sólo monta `CoreGrcApp`. |
| Parcial | Navegación normativa existente; UI Knowledge; matrices; configuración/aprobación | La UI existente selecciona marco y lista unidades/requisitos de forma plana. Faltan árbol/búsqueda/capas, flujos de autoría/revisión, cuatro ajustes y mini/full matrices en el producto. |
| Pendiente | Reconciliación del generador; montaje backend/frontend; manifests operacionales; E2E QA; aceptación visual humana | Requiere código y luego autorizaciones separadas para datos operacionales y despliegue. |
| Bloqueado por autorización/dependencia | IAM/grants, lifecycle registry, Definitions/reglas, derechos reales, importaciones, despliegue | Este paso no autoriza DML, imports, registry/IAM ni deploy. |
| Validable aisladamente | Contratos, schemas, policies, negaciones, adapters, rutas Fastify inyectadas, componentes y builds | Ejecutado sin QA. Los mocks/fixtures no acreditan runtime QA. |

## Reconciliación del estado físico

- `qa-adoption-verify-full-20261021/verify.py`: PASS; 5.354 archivos recibidos, 5.352 byte-identical y dos deltas autorizados preservados por preimage/prefix.
- Migración local y recibo conservan sus hashes publicados.
- `database/migrations/manifest.json` contiene 35 entradas y la última es `20261021221204`.
- No se consultó ni modificó QA en esta evaluación. La vigencia física se deriva del recibo sellado y su verificador local, no de una nueva sesión SQL.
- El build y las pruebas sólo escribieron outputs locales ignorados; no hubo DDL/DML, import, IAM, deploy ni Git mutante.

## Arquitectura y runtime

El diseño local no crea una autoridad paralela: las mutaciones usan las transacciones, idempotencia, audit/outbox, locks y errores existentes; configuración consume el resolver canónico; B07 agrega perfil al AuditEvent existente; matrices consultan relaciones canónicas y filtran antes de paginar/contar; H04 exige evidencia exacta por fuente/hash/edición/paquete/acto/entorno/audiencia.

La preparación operacional falla en puntos concretos:

1. El generador rector no reproduce la migración/expected-schema sucesores.
2. `server.ts` no construye `composeNormativeLibraryFromStorage` ni entrega `normativeLibrary` al `buildApp`.
3. Los permisos/grants y lifecycle bindings contractuales siguen con `runtime_activated=false`.
4. Las cuatro Definitions y sus reglas no existen como datos operacionales acreditados.
5. No existen derechos H04 reales ni evidencia privada por fuente/acto; el policy falla cerrado.
6. `main.tsx` no monta biblioteca/matrices; no hay rutas UI, flujos de edición/aprobación ni mini-matrices de dashboard.
7. No hay E2E contra un runtime desplegado, matriz ALLOW/DENY real, actores SoD reales ni revisión visual humana.

## Biblioteca y experiencia de usuario

La pantalla vigente `NormsWorkspace` permite seleccionar un marco publicado y muestra listas planas de unidades y requisitos. Eso reutiliza la capacidad previa y cubre sólo una fracción de N01/N02/N11. No ofrece árbol por parent, búsqueda normativa, capas Knowledge, selección/trazabilidad editorial profunda, contexto empresarial, cuatro ajustes o aprobación.

`MatrixTable` sí es una tabla accesible y trazable y `LibraryMatrixView` reutiliza el mismo lector para mini/full. Las capturas aisladas prueban render en desktop/narrow de un fixture `issues_actions`, no disponibilidad para usuarios. Faltan el montaje, selector de los seis tipos/filtros, miniaturas de dashboard, vista completa y navegación/inspector dentro del shell. Por ello las matrices son visualizables como componente aislado, pero no como función del producto.

## Seguridad

La lógica local valida contexto Platform/Tenant, permisos efectivos, scopes, ownership, targets, SoD, CAS, derechos y ocultación. Platform Support queda limitado a metadata en lecturas y no hereda escrituras. Las negaciones focalizadas cubren tenant ajeno, ausencia de permiso, Support escribiendo, autoaprobación y derechos ausentes.

La autorización efectiva no puede declararse lista: el catálogo y grants operacionales no fueron activados, los bindings B06 no están publicados en el registry QA y no se ejecutaron pruebas con identidades/tenants reales. El resultado correcto es `RBAC_SOD_READINESS=BLOCKED_OPERATIONAL_DATA_AND_RUNTIME_EVIDENCE`.

## Gates ejecutados

| Gate | Resultado | Alcance |
| --- | --- | --- |
| Adopción física sellada | PASS | Verificador local del expediente; no nueva conexión QA |
| Assets B01–B09 | PASS | 24 schemas, 30 operaciones nuevas |
| Rector baseline integrity | PASS | Documentos rectores protegidos |
| Rector status/generator | FAIL | Drift reproducible en `database/migrations/manifest.json`; generador queda en 34 |
| Typecheck contracts/backend/frontend | PASS | Tres paquetes |
| Builds contracts/backend/frontend | PASS | Bundle local; warning no bloqueante de tamaño existente |
| Pruebas focalizadas | PASS | 159 tests / 12 archivos, unitarias/contractuales/route-inject/componentes |
| E2E aislado histórico | REUSED: 2 PASS | Mock API; no producto/QA |
| E2E QA/runtime | NOT_RUN | Fuera del alcance y dependencias aún ausentes |
| HUMAN_UI_REVIEW | PENDING | Sólo autoridad humana puede cerrarlo |

El verificador histórico `resumption-20261021/verify-continuation.py` falla porque compara su inventario congelado con los deltas posteriores autorizados de migración/expected-schema/status/foundations. Se conserva como evidencia histórica; no se interpreta como corrupción ni se re-sella.

## Resultado

```text
PROJECT=GRC_TECDEX
ACTIVE_BASELINE=TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16
PREVIOUS_QA_ADOPTION=APPLIED_VERIFIED
OPERATIONAL_READINESS_ASSESSMENT=INCOMPLETE
RECTOR_GATE=BLOCKED_CANONICAL_GENERATOR_DRIFT
ARCHITECTURAL_CONSISTENCY_GATE=BLOCKED_CANONICAL_GENERATOR_RECONCILIATION
MIGRATION_INTEGRITY_GATE=PASS_PHYSICAL_RECEIPT_AND_LEDGER_35
B01_B09_CONTRACT_TRACEABILITY=PASS_DOCUMENTED_ALL_BINDINGS
H04_RIGHTS_TRACEABILITY=PASS_CONTRACT_TO_CODE;_REAL_RIGHTS_NONE
BACKEND_RUNTIME_READINESS=INCOMPLETE_COMPOSITION_NOT_BOOTSTRAPPED
FRONTEND_READINESS=INCOMPLETE_COMPONENTS_NOT_MOUNTED
RBAC_SOD_READINESS=BLOCKED_OPERATIONAL_IAM_REGISTRY_AND_REAL_ACTORS
E2E_READINESS=BLOCKED_RUNTIME_DATA_DEPLOYMENT_AND_HUMAN_GATES
QA_BUSINESS_DML=NONE
QA_SCHEMA_CHANGES=NONE
NORMATIVE_IMPORTS=NONE
DEPLOYMENTS=NONE
PRODUCTION_CHANGES=NONE
STEP6A5=NOT_STARTED
STEP6A6=NOT_STARTED
```

