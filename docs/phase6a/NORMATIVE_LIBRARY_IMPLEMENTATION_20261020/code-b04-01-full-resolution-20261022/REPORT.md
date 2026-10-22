# CODE-B04-01 — resolución integral en código

`CODE_B04_01=PASS_LOCAL_CODE_AND_ISOLATED_TESTS`. La brecha de selección inicial B04 queda resuelta en contratos y código. El usuario con autorización funcional de creación consulta automáticamente los parámetros publicados del control propio, elige por descripción/versión y guarda mediante `configurationOverrideCreate`. No requiere permiso administrativo Platform ni lectura previa de overrides.

Baseline activa `TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16`; dominio https://grc.tecdex.net/. Rama `fix/step6a3-v112-continuity-20261016`; HEAD `4a275264a7522031e62bf09f598c9d56e21d25e0`; índice vacío preservado. STEP6A3/STEP6A4 PASS previos conservados; Biblioteca Normativa intermedia IN_PROGRESS; STEP6A5/STEP6A6 NOT_STARTED.

## Autorización y continuidad

La instrucción PO «RESOLUCIÓN INTEGRAL CODE-B04-01» autoriza directamente contrato ejecutable, operación/policy, backend, hooks, frontend y pruebas, sin revisión contractual intermedia. Sucede las restricciones de implementación de la tarea diagnóstica anterior dentro de este alcance; sus expedientes históricos no se editan.

Se utilizaron primero los expedientes code-composition y code-b04-01-contract-diagnosis y sus rutas concretas. La Constitución/rector46/29, enforcement y seis contratos visuales activos se consumen como autoridad. No se reconstruyó arquitectura ni se repitieron251 tests/8 browser históricos indiscriminadamente. INITIAL_STATE conserva estado Git y hashes recibidos; los preimages permiten revisar el delta exclusivo de esta ejecución.

## Implementación

- Un sucesor local en `contracts/` dentro de **este mismo expediente**, con OperationId `controlConfigurationDefinitionReferenceList`, GET `/api/v1/control-versions/{id}/configuration-definition-references`, schema cerrado y ObjectPolicy. Su recibo documenta la autorización PO actual y sella fuentes; no inventa una firma humana sobre bytes futuros ni activa datos. No hay nuevo ciclo de propuesta/aprobación.
- Consulta ligada a `configuration.configuration_override.create`, CORE_PLATFORM, grant tenant y roles autores ya aprobados. Membership/actor efectivos se resuelven automáticamente. No se amplía `configuration_definition.read/platform`, no se agrega permiso, grant o rol. La lectura de referencias mínimas necesarias para create forma parte del flujo funcional B04 autorizado.
- La consulta no exige adicionalmente `controls.control.read` para esas referencias mínimas: valida el mismo target propio permitido al autor B04, sin devolver texto/detalle del control. Los selectores existentes de controles conservan sus permisos funcionales de lectura. Esto concreta la instrucción PO actual y sucede la recomendación de doble permiso de la propuesta anterior; no elimina restricciones de las lecturas de controles.
- `control-definition-references.ts` consume DB/actor/policies existentes: ControlVersion y parent Control TENANT_OWNED del tenant; Definitions PLATFORM_CONTROL/globales, published, vigentes y versiones exactas de los cuatro descriptores; scopes/flags y reglas normalizadas exactos. Lectura READ ONLY/REPEATABLE READ, sin cálculo, DML ni storage. Ausencia legítima devuelve lista vacía; falta de reglas503; reglas inválidas422; sin enumeración de targets ajenos.
- El predicado `controlDefinitionDescriptor` se comparte con el comando existente. CREATE consulta de nuevo bajo sus locks; comprobar primero el target propio conserva404 para objetos ajenos. Definition retirada/no publicada/fuera de vigencia/flags incompatibles después de seleccionar produce409 seguro con referencia al campo, sin aceptar el resultado anterior del selector como autorización.
- La composición existente monta una operación GET adicional:31 operaciones nuevas del slice contando esta sucesora, más el create preexistente =32 handlers. Trece bindings B06 sin cambios; no nuevo lifecycle para el GET.
- `ControlAdjustmentCreate` usa el cliente y hook canónicos. Opciones por label/versión del descriptor aprobado; sin UUID manual. Conserva loading/empty/error/deny/retry, invalida selección por target/contexto/autorización y vuelve a cargar tras conflicto. Validación antes de submit; idempotency key por request/reintento; vigencia en la zona IANA tenant/UTC; frecuencia con vocabulario/labels publicados; confirmación como texto operativo sin score.
- `ControlAdjustments` y navegación permiten entrada por create aunque falte override.read. Lista/historia/revisión/decisión conservan su permiso independiente. El contexto de control queda bloqueado mediante fieldset nativo durante el guardado sin borrar su selección. El resultado se confirma explícitamente como borrador, sin afirmar aprobación.
- El generador **del slice normativo** consume/verifica el sucesor y deriva JSON/validadores. El generador canónico `scripts/foundations/generate-contract-assets.mjs` permanece byte-identical. No se modifican las35 migraciones, manifest, expected-schema, baseline inmutable, identidad, H04, IAM operacional o contratos de despliegue.

## Verificación y alcance del PASS

134 pruebas focalizadas en13 archivos PASS. Diez casos de navegador en1536×1024 y390×844 PASS. Navegador sobre bundle compilado → cliente real → Fastify inject/composición/actor/policy/servicios/comandos reales → **ejecutor SQL sintético**, sin conexión PostgreSQL. Las lecturas de opciones y creación que resuelven CODE-B04-01 no usan respuestas estáticas de API. La autenticación, consultas de roles/persistencia y catálogos de prueba son sintéticos; no prueban JWT/locks/constraints/commit físicos ni E2E operacional QA.

Typechecks/builds globales y frontend final PASS; assets B04/H04, generador canónico --check repetido, rector integrity/status, whitespace y secret scan PASS. El schema, manifest, generador canónico y35 SQL conservan sus hashes. CHECKS.json y TEST_REPORT contienen comandos/resultados y límites.

Se conservan assets de marca/CSS/tokens/layout recibidos; nuevas capturas muestran formulario y teclado/labels/overflow en ambos viewports. No se aprueba una nueva baseline visual ni aceptación QA: `HUMAN_UI_REVIEW=PENDING`. Advertencia de bundle >500kB registrada, sin relajar umbral. No se afirma performance operacional.

## Estado final y dependencias

`RECTOR_GATE=PASS` exclusivamente para esta resolución local autorizada. No quedan bloqueos conocidos de implementación de CODE-B04-01. No equivale a habilitación de toda la Biblioteca Normativa ni cierre comercial.

Siguen fuera de autorización: IAM/grants, materialización de cuatro Definitions/reglas,13 bindings B06, derechos H04 reales, contenido/importaciones, despliegue y E2E con actores reales. Sin esos datos efectivos, backend mantiene DENY/empty/dependency según corresponda. No se requiere intervención administrativa por cada selección; el aprovisionamiento operacional inicial sigue siendo un paso separado del producto.

Capas cambiadas: contrato ejecutable local del slice, generador derivado del slice, backend, frontend, pruebas/documentación. Capas preservadas: DB/35 migraciones/esquema físico, manifest, expected-schema, generador canónico, permisos/grants operacionales, modelo de identidad, baseline rector, infraestructura y despliegue. Sin QA, imports, producción, commit/push/merge o etapas6A5/6A6. Listado y hashes exactos en FILE_MANIFEST; trazabilidad en TRACEABILITY; verificación de sólo lectura en verify.py.
