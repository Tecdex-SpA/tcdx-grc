# Análisis contractual focalizado

Resultado: no hay operación aprobada reutilizable o parcialmente integrada que resuelva el descubrimiento inicial. Hay entidades, descriptores, permiso Platform y operaciones relacionadas reutilizables **como componentes de una enmienda**, sin autoridad actual para exponer una nueva consulta.

## Fuente y elegibilidad

| Punto | Autoridad / evidencia | Determinación |
| --- | --- | --- |
| Entidad/identificador | Rector29/30/33/39; físico01; `database/expected-schema.json` | ConfigurationDefinition → `config.configuration_definitions.configuration_definition_id`, UUID canónico; versión bigint y business key ownership/tenant/código/versión. |
| Relación con B04 | `CONFIGURATION_APPROVAL_AND_CONCURRENCY.md`; OpenAPI `ControlOverrideCreateRequest` | FK exacta desde ConfigurationOverride. No resolver ID por label, número de orden, último escritor o UUID manual. |
| Publicación | OpenAPI `configurationDefinitionPublish`; matriz03; Permission05 H-003 | Publica Definition global previamente aprobada; author/review/approve/publish SoD, ETag, reason/approval refs, idempotencia, TX y auditoría reforzada. No es una consulta. |
| Estado de consumo | B04; `assertControlDefinition`; `mutateControlAdjustment` | Estado literal `published`, descriptor/código/versión aprobados, value_type text, tenant_overridable y object_overridable true; scopes exactamente control_version. No confundir aprobación de override con publicación de Definition. |
| Temporalidad | Rector29/23; consulta B04 bajo lock | Definition vigente al instante transaccional: effective_from ≤ now y now < effective_to, extremo superior abierto. Intervalo del override válido y comprobado por command. No se inventa cobertura temporal adicional ni autoelección de versión más reciente. |
| Ownership | B04 y lectura/command existentes | Definition `PLATFORM_CONTROL`, tenant_id NULL; target `TENANT_OWNED` ControlVersion del tenant activo. La proyección de selección no transforma Definition global en dato tenant ni expone otros tenants. |
| Scopes/reglas | Tablas canónicas `configuration_definition_scopes` y `configuration_validation_rules`; B04 + CONTROL_VALIDATION amendment | Scope normalizado, una regla ordinal1 contract_schema, error code/operand exactos vinculados al descriptor vigente y resto de operandos nulos. No nuevas tablas ni expresiones ejecutables. |
| Descriptores | CONFIGURATION_DEFINITIONS.json | Actividades→execution_method; evidencias→minimum_evidence; frecuencia→frequency_code con CV-03; confirmación sin campo base ni default inventado. Cuatro códigos/versión1, ninguna fila operacional publicada por el JSON. |
| SoD | B04/B05, OBJECT_POLICIES, B06 | Tenant Admin/GRC Manager proponen con grants; GRC Manager revisa/decide con permisos específicos; autor no revisa/decide. Reviewer puede decidir si no es autor; política más estricta prevalece. Leer referencias no aprueba nada. |
| Auditoría | matriz03, EVENTS_AND_AUDIT; B06 | Publish Definition y comandos override preservan eventos propios y TX audit/outbox/idempotencia. La consulta propuesta no es transición B06. |

La columna published_at es nullable en el modelo físico. No se propone fabricar timestamp ni convertir su ausencia en un nuevo estado. El selector debe consumir el estado/versión/vigencia aprobados y conservar esa metadata nullable. La materialización/publicación legítima sigue siendo responsabilidad del workflow H-003; este diagnóstico no certifica filas operacionales.

## Operaciones consideradas

| Candidato | Contrato actual | Compatibilidad con selección inicial B04 |
| --- | --- | --- |
| configurationDefinitionPublish | POST `/platform/configuration-definitions/{id}:publish`; publish/platform/Platform Admin | NO: escritura, necesita ID conocido, aprobación y SoD. Reutilizable sólo como autoridad del estado de publicación. |
| configuration_definition.read | Permission05, CORE_PLATFORM/platform, Platform Admin | NO: permiso sin operación GET vinculada; no grant tenant. No ampliar sus scopes por implementación. |
| effectiveConfigurationGet | GET `/effective-configurations/{id}`; effective_configuration.read/tenant; contrato28 | NO: requiere resultado persistido conocido; RO, metadata mínima, excluye discovery contextual y materialización. No usar como resolver por GET. |
| configurationOverrideGet | GET `/configuration-overrides/{id}`; override.read/tenant | NO: ID de override previo. Sus campos Definition no autorizan consultar otras Definitions. |
| controlConfigurationOverrideList | GET `/control-versions/{id}/configuration-overrides`; override.read/tenant | NO para primer create: sólo joins desde overrides ya existentes. Sí conserva utilidad para propuestas/historia posteriores. |
| configurationOverrideCreate | POST `/configuration-overrides`; override.create/tenant; CONTROL_OVERRIDE_AUTHOR | NO como consulta: recibe Definition exacta obligatoria. Reutilizable como único comando de creación tras una futura selección autorizada. |
| frameworkVersionReferenceList / membershipReferenceList / retentionPolicyReferenceList | GET de referencias con recursos/propósitos/permisos cerrados | NO: contrato29 y ReferenceKind sólo framework/membership/retention. El patrón técnico de selección/contexto sirve para implementar una operación nueva tras aprobación, sin alias ni propósito improvisado. |
| SELECT/policy internos B04 | Servicio de comando/policy con DB canónica | NO como API aprobada. Reutilizables para evitar divergencia de elegibilidad; su existencia no autoriza una ruta nueva. |

Fuentes primarias de contraste: `docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml`, `03_API_RESOURCE_OPERATION_MATRIX.md`, `05_PERMISSION_CATALOG.md`, `28_EFFECTIVE_CONFIGURATION_DETAIL_READ.md`, `29_PHASE6A3_REFERENCE_READS.md`; sucesor `amendments/NORMATIVE_LIBRARY_20261020/02_OPENAPI_NORMATIVE_LIBRARY.json` y sus descriptores/policies; B06 successor `NORMATIVE_LIBRARY_B06_REGISTRY_20261020`.

Puentes de implementación inspeccionados: `apps/backend/src/configuration/{control-adjustments,control-adjustment-service,control-adjustment-policy,control-adjustment-read,effective-read}.ts`, `core-grc/{routes,reference-reads}.ts`, `normative-library/{composition,routes}.ts`; `apps/frontend/src/{reference-read,normative-library-client,normative-library-workspace}.tsx/ts` según extensión real. Se usa código para comprobar conexiones, nunca para otorgar autoridad.

## IAM/registry y derechos

No hay permiso implícito por cargo/staff. Platform Admin/Support no adquieren create/aprobación tenant. El permiso definition.read permanece Platform; una nueva referencia tenant necesita un binding de autorización explícitamente aprobado. La propuesta recomienda reutilizar override.create más permiso de lectura del control y object policy acotada, sin grant nuevo y sin dar lectura global genérica.

Los13 bindings B06 siguen inactivos según expediente recibido. Un GET naturalmente idempotente no añade una arista ni un command de decisión al registry. Aprobar la consulta no activa sus dependencias ni vuelve operativo un create sin registry.

La propuesta sólo expone metadatos de Definitions/control ID autorizado, sin cuerpos normativos/editoriales, valores base, defaults sensibles, derechos/evidencias o valores de overrides ajenos. H04 no se convierte en un booleano ni se concede por seleccionar. Cualquier lectura posterior de contenido/base queda bajo su policy/derechos por fuente/acto; esta operación no los sustituye.
