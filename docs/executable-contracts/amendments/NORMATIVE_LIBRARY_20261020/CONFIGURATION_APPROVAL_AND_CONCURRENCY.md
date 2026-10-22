# Configuración, aprobación empresarial y concurrencia

## Cuatro Definitions

CONFIGURATION_DEFINITIONS.json define códigos/versiones/tipos/validaciones y bindings al ControlVersion original. Es un contrato de datos, no un seed ejecutado. Los cuatro parámetros son text en columnas tipadas; no hay UUID crítico en JSON. Scope control_version, mismo tenant; los flags superiores deben permitir override. Periodicidad consume exactamente los ocho códigos activos de CV-03, con sus semánticas calendarias; no mes=30días. Actividad y evidencia son orientación operativa, no rebajan un mínimo auténtico. Confirmación es una etiqueta descriptiva operativa redactada/decidida por el tenant, sin orden numérico ni catálogo global inventado: no se compara ni convierte en autenticidad, suficiencia, score o conclusión.

Los defaults son NULL: no se inventa una confirmación o frecuencia. La proyección muestra el valor original del campo ControlVersion y la Definition exacta; ausencia de confirmación queda sin configurar. Los descriptores de binding al campo real son datos contractuales cerrados/versionados, nunca expresiones SQL del usuario, casos por tenant/UUID o una segunda autoridad. Si no hay override, el resolver consume el valor original permitido como capa base; si no existe, la ausencia se conserva. El input_hash incluye Definition/descriptores, ControlVersion y todas las capas seleccionadas.

## Creación y superficies

configurationOverrideCreate mantiene POST /configuration-overrides, permiso, auditoría/evento y HTTP202 publicados. El nuevo scope se especializa con esquema cerrado cuando scope_level=control_version o se aporta control_version_id. No se autoriza omitir el scope para evitar la especialización: CHECK y policy rechazan ese caso. Los otros contratos de scope se preservan literalmente; no se usa un fallback como autoridad del nuevo scope. El request no acepta tenant/actor/estado/row_version/expected_version. La respuesta de esta rama sigue ControlOverrideResult, status=accepted con el draft efectivamente persistido; no se afirma approval o vigencia. Lectura posterior da estado actual.

Las operaciones get/update/review/decide/list anexas sólo cubren los cuatro ajustes control_version de esta publicación. No expanden acceso a otras configuraciones. GET effectiveConfigurationGet sigue siendo lectura persistida; añadir control_version_id no permite resolver/materializar por GET.

## Roles, SoD y transiciones

Tenant Admin/GRC Manager proponen con grants efectivos existentes. GRC Manager revisa con review y decide con approve, bajo CONTROL_OVERRIDE_DECIDER limitado a las cuatro Definitions. La concesión está publicada como contrato de activación futura; el grant operacional actual permanece NONE. Platform Admin/Support no aprueban ajustes tenant por ser staff. Autor diferente de revisor y de decisor, incluso acumulando roles; revisor puede ser decisor del mismo artefacto si no es autor. Prevalece una policy vigente más estricta. No se impone un tercer humano universal.

Registry contractual: create→draft; update draft→draft; review draft→reviewed/rejected; decide reviewed→approved/rejected. Motivo obligatorio, revisión ligada a hash/target exactos. Vigencia se deriva de approved + intervalo, Definition, control y sucesión elegibles, sin enum efectivo nuevo. Rejected es terminal; corregir requiere nuevo draft. No se inserta ninguna arista en el registry runtime ni se adivina su versión futura.

## Sucesión y conflicto

Un ajuste nuevo puede citar supersedes_configuration_override_id del aprobado anterior. Su FK y restricciones están justificadas en el modelo físico: mismo tenant/Definition/control, versión mayor, corte posterior dentro del intervalo, sin ampliar autorizaciones superiores. Un sucesor aprobado por predecesor, sin forks o ciclos. Se conserva la fila aprobada original completa. Para asOf anterior al corte sigue seleccionable; desde el corte se consume el sucesor. Sin cadena explícita, igualdad de especificidad incompatible produce configuration_conflict. La selección no depende de order by updated_at o el último escritor.

## ETag y transacción

KnowledgeVersion/ConfigurationOverride no tienen row_version. Sus ETags fuertes se derivan del agregado canónico persistido, links/targets y conjunto ordenado de audit_event_id de cambios materiales de ese agregado. Incluir IDs de auditorías materiales evita ABA sin asumir orden temporal del reloj, xmin o contador inexistente; una implementación puede cachear el digest sólo de forma no autoritativa verificable. No se incluyen lecturas o intentos denegados que no alteren la representación. AuditEvent actor/aggregate/ownership/correlation son las columnas canónicas, no UUID libre en metadata.

Orden: autenticar/autorizar/validar → claim de idempotencia por ownership+tenant+actor+operación+key → locks deterministas de Definition/tenant/control, predecesor si aplica y agregado → reautorizar, leer estado/manifest/auditorías → comparar If-Match → guardas/revisión → persistir cambio+AuditEvent+outbox+IdempotencyRecord → COMMIT → respuesta. La serialización por Definition/tenant/control debe funcionar también en primera creación sin fila previa, mediante lock transaccional canónico/advisory con namespace estable y las revalidaciones requeridas. No se crea tabla lease o nuevo resolver.

El command genera el ID del AuditEvent antes de calcular el ETag posterior; su conjunto de IDs no incluye ese mismo ETag como input, evitando circularidad. Payload audit contiene hashes/IDs/razón/estado y valores minimizados, no blobs ni secretos. Revisión usa el hash de entrada y la auditoría material exacta; approve comprueba la revisión y su actor después de los locks. Falla de audit/outbox/idempotencia revierte toda mutación.

Replay reautoriza primero y comprueba fingerprint antes de evaluar CAS/estado posterior; retorna el resultado persistido sin nueva mutación/evento. No se reconstruye desde filas actuales. Un resultado de command es histórico: replay omite ETag y el cliente obtiene el ETag actual por GET. Payload cambiado produce TCDX.CONFLICT.IDEMPOTENCY; If-Match obsoleto produce TCDX.CONFLICT.CONCURRENCY, ambos409. Ausencia/header malformado400; autoridad403 o404 por ocultación; invariante422; arista ausente/estado incompatible409; storage503. No se introduce vocabulario de errores paralelo.

Las operaciones con row_version real (Item, Source, Applicability) conservan sus reglas canónicas. El nuevo digest se limita a los agregados sin esa columna; no se sustituye el If-Match decimal de RetentionPolicy ni el expected_version histórico de otras operaciones.
