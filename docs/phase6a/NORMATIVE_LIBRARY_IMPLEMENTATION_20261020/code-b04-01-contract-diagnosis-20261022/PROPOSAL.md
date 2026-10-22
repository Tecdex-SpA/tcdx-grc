# Propuesta mínima — referencias de Definition para B04

**STATUS=PROPOSED_NOT_APPROVED_NOT_PUBLISHED_NOT_EFFECTIVE.** Este documento propone decisiones contractuales para el PO. Los nombres, ruta, proyección y autorización siguientes no existen como operación publicada ni habilitan código o datos. No son un contrato ejecutable.

## Autoridad y delta propuesto

Subordinada a rector29/30/33/39/46, modelo físico congelado, H-003 y amendments publicados B04/B05/B06 y CONTROL_VALIDATION. Agregar **una operación de lectura contextual**, una proyección cerrada y una ObjectPolicy de referencia B04 a un sucesor aprobado. Mantener el catálogo `configuration_definition.read` exclusivamente Platform, sin nuevos grants ni expansión de sus scopes.

No se agregan entidades, columnas, tablas, migraciones, estados, resolver, persistencia de selecciones, catálogo paralelo o aristas B06. Los códigos/versiones/validaciones/labels provienen del descriptor aprobado vigente; los IDs sólo de filas canónicas reales. No se convierten códigos a UUID ni se incluyen IDs de ejemplo o semillas.

## Operación candidata

- OperationId propuesto: `controlConfigurationDefinitionReferenceList`.
- Método/ruta propuesta: GET `/api/v1/control-versions/{id}/configuration-definition-references`.
- Propósito único: obtener referencias de Definitions elegibles como entrada al create B04 para ese ControlVersion tenant.
- Entrada: bearer humano; tenant seleccionado por el header canónico; `{id}` UUIDv7 de ControlVersion; correlation/request IDs existentes. Sin body ni `tenant_id`/actor/role suministrados por cliente.
- Filtros: ninguno configurable. Resource, estado published, scope control_version y conjunto de descriptores B04 son restricciones obligatorias del contrato. Sin query genérica por código, lifecycle, tenant, as_of, purpose u orden; parámetros desconocidos/duplicados o body no permitido producen400. No es un explorador global.
- Tiempo: elegibilidad a `transaction_timestamp()` del servidor; no se acepta fecha del navegador para elegir una Definition histórica o futura. No se impone por este GET una nueva regla de cobertura del intervalo del override.
- Lectura: transacción READ ONLY/REPEATABLE READ, sin locks/escrituras de negocio, materialización, side effects o llamadas a IA/storage. Usa únicamente tablas canónicas y descriptor publicado.

## Autorización propuesta, pendiente de aprobación expresa

Nueva policy candidata `CONTROL_OVERRIDE_DEFINITION_REFERENCE`, de condiciones conjunctivas:

1. Autenticación HUMAN_INTERACTIVE; UserIdentity y Membership activos del tenant seleccionado; default DENY.
2. Permiso efectivo existente `configuration.configuration_override.create`, capability `CORE_PLATFORM`, scope **tenant**, y rol Tenant Admin o GRC Manager conforme a CONTROL_OVERRIDE_AUTHOR. No reutilizar scopes estructurales/owned/assigned sin un binding explícito.
3. Permiso efectivo `controls.control.read`, capability `CONTROLS_ASSURANCE`, con alcance tenant y visibilidad del target propio según el lector canónico. Los entitlements/capabilities se comprueban independientemente, no se deducen por poseer el permiso create.
4. ControlVersion `TENANT_OWNED`, `tenant_id` igual al actor; parent Control compatible y accesible. Ausencia/control global/tenant ajeno:404 indistinguible. No pedir sólo un UUID válido para asumir propiedad.
5. No modo Platform, impersonation ni transporte sin tenant. Platform Admin/Support sólo podrían consumir esta consulta actuando bajo su **propia Membership tenant y grants tenant reales**, sin usar PlatformRoleAssignment como sustituto.

Este binding de consulta es **nuevo** y requiere aprobación; no se deduce hoy de override.create ni de Permission05. Reutilizar esos permisos para una referencia mínima de entrada evita otorgar lectura genérica de Definitions a todos los tenants. No se propone usar definition.read/platform en el navegador tenant ni autorizar por un booleano de UI.

Una respuesta positiva sólo identifica entradas candidatas del comando; no acredita derecho a aprobar ni disponibilidad de registry B06. CREATE vuelve a autenticar/autorizar/revalidar todo bajo sus locks, sin aceptar una selección previa como grant o lease. Revisar/decidir mantienen sus permisos, SoD y B06 exactos.

## Elegibilidad de las filas

Una referencia requiere simultáneamente:

- Definition canónica `PLATFORM_CONTROL`, tenant_id NULL, estado literal `published` y vigente ahora, intervalo superior abierto.
- Match **exacto** de código y versión con uno de los cuatro descriptores de CONFIGURATION_DEFINITIONS vigente; no se elige MAX(version), latest, fecha de actualización o primer resultado. Ningún hardcode por tenant/norma/ID.
- value_type text; flags tenant_overridable/object_overridable true; scopes normalizados exactamente control_version; reglas exactas del amendment CONTROL_VALIDATION: una contract_schema ordinal1 y referencia/hash aprobado, owner/FK coherentes y otros operandos nulos. Ninguna regla adicional se ignora.
- Ninguna policy superior vigente incompatible; los mínimos auténticos y cualquier policy más estricta permanecen conjunctivos. La consulta no calcula equivalencia/suficiencia de textos o cumplimiento.

Draft, approved sin publish, retiradas/no publicadas, expiradas, futuras, de otro owner o fuera del descriptor no son opciones. No se añade un enum de lifecycle ni se afirma que todos esos vocablos formen parte de una secuencia canónica de ConfigurationDefinition. `published_at` conserva su valor nullable autorizado; no se inventan timestamps o prueba de aprobación por tener una fila.

La ausencia legítima de filas elegibles devuelve200 items vacíos. Una Definition activa que declara el binding B04 pero carece de reglas requeridas es dependencia no lista, no éxito vacío:503. Reglas contradictorias/no soportadas o metadata inválida fallan de forma cerrada según errores siguientes. No se exponen motivos por fila que revelen referencias ocultas.

## Salida candidata

HTTP200, objeto JSON cerrado con exactamente:

| Campo | Forma/autoridad |
| --- | --- |
| control_version_id | UUIDv7 del target ya autorizado. |
| evaluated_at | Timestamp UTC del snapshot de lectura del servidor. |
| items | Array completo de0..4 referencias; sin total global ni conteos ocultos. |

Cada item, cerrado:

| Campo | Forma/autoridad |
| --- | --- |
| configuration_definition_id | UUIDv7 real de `config.configuration_definitions`. |
| configuration_code | Código exacto del descriptor B04 aprobado; sin catálogo nuevo. |
| definition_version | Decimal string int64 positivo, sin JS number ni selección latest. |
| value_type | Literal text del contrato B04. |
| scope_level | Literal control_version; no JSON con un ID de negocio. |
| effective_from | Timestamp UTC canónico. |
| effective_to | Timestamp UTC canónico, fin abierto. |
| published_at | Timestamp UTC o NULL según dato canónico; nunca sintetizado. |

Orden determinista código COLLATE C y versión numérica. No hay paginación: población acotada a los cuatro descriptores aprobados y sus versiones exactas, con unicidad canónica. Ambigüedad/duplicado no se resuelve truncando o seleccionando arbitrariamente. La cota4 es del alcance contractual B04, no una regla particular de un cliente.

Labels/esquemas de edición se consumen por match exacto código+versión desde el descriptor aprobado existente. No se devuelve default_json, valores efectivos, textos base de controles, operandos internos, identidades de autores, auditorías, contenido normativo/editorial o filas de otros tenants. Las restricciones de rights/H04 y de lectura del control no se eliminan ni se derivan de esta referencia.

Cache-Control no-store; Vary Authorization, X-TCDX-Tenant-Id; correlation/request IDs canónicos. GET naturalmente idempotente, sin Idempotency-Key obligatorio, If-Match o token de autorización transportado al command.

## Errores y auditoría propuestos

| HTTP | Código existente | Condición |
| --- | --- | --- |
| 400 | TCDX.VALIDATION.FAILED | UUID/shape/header/query/body no admitidos; no consulta de objeto antes de validar. |
| 401 | TCDX.AUTHENTICATION.REQUIRED / INVALID | Bearer ausente/inválido; challenge existente; sin SQL de objeto. |
| 403 | TCDX.AUTHORIZATION.DENIED | Membership/tenant/capability/grant/scope/rol no habilitado, incluyendo uso sólo Platform. |
| 404 | TCDX.RESOURCE.NOT_FOUND | Target ausente, ajeno, global o fuera de alcance; mensaje idéntico. |
| 409 | TCDX.CONFLICT.RESOURCE | Ambigüedad de binding/identidad elegible; nunca elegir una versión por orden. |
| 422 | TCDX.INVARIANT.VIOLATION | Binding de reglas contradictorio/no soportado para una Definition que declara B04. |
| 503 | TCDX.DEPENDENCY.UNAVAILABLE | Dependencia obligatoria de validación no materializada/disponible; no se convierte en lista vacía. |
| 500 | TCDX.INTERNAL.FAILURE | Metadata canónica malformada/fallo inesperado; respuesta sanitizada. |

Usar ErrorEnvelope y clasificación/retryability contractuales existentes; no SQL, stacks, secretos, cuerpos, causas privadas por fila ni conteos ocultos en errores.

Propuesta RO/NAT: sin AuditEvent de mutación, domain event, outbox, idempotency record ni nueva arista LifecycleTransitionDefinition para el GET. Trazabilidad de acceso/denegación por telemetry/policy canónica con operation/correlation/request/actor/tenant/outcome minimizados; no log de cuerpos o valores. Los eventos publicados de DefinitionPublish y los comandos B04/B06 se conservan completos. Esta decisión de audit NONE de negocio para una consulta requiere aprobación del PO junto al nuevo binding; no modifica las obligaciones de auditoría del create o las decisiones gerenciales.

## Integración B04 prevista, sin ejecutar

Tras aprobación/publicación/verificación contractual en un alcance separado: conectar la consulta a la composición existente, usando el mismo actor/contexto, lectores de control y predicados de Definition/regla; sin segundo resolver ni container. El selector UI carga al elegir ControlVersion, muestra label y versión del descriptor aprobado, almacena sólo selección efímera y remite la FK real al `configurationOverrideCreate` existente. Cambio de tenant/control/permisos aborta y borra opciones/selección; error/empty bloquean submit con mensaje accesible. No UUID manual, fallback o selección automática de una versión incompatible.

Revalidar el comando original íntegramente: Definition/reglas/flags/scope/temporalidad actuales, target propio, valor, idempotencia, locks, audit/outbox y registry B06. Una referencia obtenida antes de expiración/revocación no otorga permiso posterior. No extender por conveniencia el contrato de GET effectiveConfiguration ni la respuesta de overrides.

Datos operacionales ausentes seguirán impidiendo uso real. Este diseño no supone que existan las cuatro filas, grants, reglas o13 bindings B06; su activación necesita órdenes independientes. Tampoco publica una administración Platform de Definitions o amplía su ciclo de autoría.

## Pruebas contractuales requeridas después de aprobación — NOT_RUN

1. OpenAPI/matriz/policy/schema trazados y consistentes; una sola nueva operación RO; cero DDL, estados o grants nuevos. Esquema cerrado, versiones int64 string y timestamps/null exactos.
2. Matriz ALLOW/DENY: Tenant Admin/GRC Manager con grants/capabilities requeridos; rol solo, grant ausente, scope no vinculado, capability faltante, Platform Admin/Support sin Membership, token inválido. Actor válido sin permiso no ejecuta consulta de filas.
3. Dos tenants: mismo targetID ajeno/global/ausente produce404 indistinguible; sin filtros/cachés/conteos cruzados. Root-control/ControlVersion incompatibles deniegan.
4. Cero, una y cuatro Definitions elegibles; código/versión exactos; flags false, scope distinto, no published, intervalo futuro/expirado excluidos. Evaluar bordes temporales; no reemplazar ausencia por defaults o MAX(version).
5. Reglas exactas, extras, operandos distintos, FK/ownership inválidos, falta de regla, metadata corrupta y binding ambiguo: errores cerrados previstos; ninguna respuesta parcial engañosa.
6. Snapshot coherente en lectura; revalidación al crear después de cambio/expiración o pérdida de grant; selección previa no es autoridad ni lease.
7. GET no escribe audit/outbox/idempotencia/configuración ni activa B06. Publish/create/review/decide retienen pruebas audit/rollback/SoD ya existentes; autores no autoaprueban por haber seleccionado una Definition.
8. UI: selección inicial sin override previo, labels/versiones según descriptor, empty/deny/error, limpieza tenant/control/permisos, accesibilidad y payload create con FK exacta sin tenant/actor/estado impuestos por cliente.
9. Ausencia de contenido protegido/valores sensibles/identidades en salida, logs y errores; derechos H04 posteriores preservados. No presentar fixture como E2E QA.

Publicación futura: revisar el sucesor, registrar decisión PO, sellar manifests/recibo y verificar generadores/contratos antes de implementar. La aprobación conceptual de este texto no se equipara a publicación de OpenAPI ni a autorización operacional. Ninguno de esos pasos se realiza en este expediente.
