# 06 — Personalización tenant, aprobación y SoD

D05 está aprobada. La solución candidata utiliza las entidades y los roles existentes, con las ampliaciones mínimas justificadas en 04/B04–B06. No se ha cambiado ningún permiso, grant, dato o contrato activo.

## Ajustes y valores originales

| Ajuste | Base original conservada | Configuración tenant y límite |
| --- | --- | --- |
| Actividades de control | ControlVersion.execution_method y guía Tecdex versionada | Definition de texto/estructura tipada para el ControlVersion tenant; no modifica el control global |
| Evidencias recomendadas | ControlVersion.minimum_evidence, Requirement.evidence_expectations y fuente | Orientación operativa; no reduce obligaciones auténticas ni aprueba EvidenceVersion |
| Periodicidad | frequency_code y Definition de la versión base | Catálogo temporal autorizado; distingue plazo exigido de frecuencia sugerida; sin conversiones implícitas |
| Confirmación operativa | Definition versionada pendiente de publicación | Constancia de ejecución; no modifica autenticidad de fuentes, result_status, conclusión ni suficiencia normativa |

ConfigurationDefinition autoriza tipo, scope, valor base y validaciones; ConfigurationOverride conserva propuesta, autor, valor e intervalo; EffectiveConfiguration conserva selección, capas y hash. El destino ControlVersion y el vocabulario de confirmación operativa faltan en los contratos actuales, como acredita 04. Los códigos, niveles y valores concretos deben publicarse como datos tipados; este expediente no los inventa ni usa JSON abierto para reglas críticas.

## Roles, permisos y grants

| Acto | Rol canónico propuesto | Permiso del catálogo | Estado y delta pendiente |
| --- | --- | --- | --- |
| Proponer/editar borrador | Tenant Admin; GRC Manager conserva su concesión existente | configuration.configuration_override.create / update | El catálogo los contempla; verificar permiso y scope efectivos del actor al ejecutar en el futuro |
| Leer ajustes | Actor con lectura efectiva, incluidos los roles previstos por el catálogo | configuration.configuration_override.read | No concede lectura de contexto ajeno ni de texto protegido |
| Revisar/rechazar propuesta | GRC Manager | configuration.configuration_override.review | Existe previsión en catálogo; faltan wire contract, handler y ciclo completo acreditados |
| Aprobar o rechazar empresarialmente | GRC Manager con responsabilidad asignada por el tenant y autorización efectiva | configuration.configuration_override.approve | **Grant base actual NONE: DENY.** Se propone concesión limitada a las cuatro Definitions y su ObjectPolicy; no se publica aquí |
| Consultar resolución | Actor con lectura efectiva | configuration.effective_configuration.read | Lectura vigente; no concede escritura ni materialización de un binding ausente |

GRC Manager es la elección técnica por su función canónica de gobierno/configuración en el rector 42. El tenant asigna esa responsabilidad mediante IAM autorizado. Un nombre de cargo no acredita representación legal ni permiso. No se crea un rol Gerente, un grant individual, una elevación Platform ni una excepción por login. Executive/Board Viewer mantiene su función de consulta. Una membresía activa sin capability, scope o policy sigue en DENY.

## Flujo candidato

Propuesta **draft** → revisión **reviewed** → decisión **approved/rejected** → vigencia derivada del estado y del intervalo → auditoría. La revisión también puede rechazar con motivo. Estos nombres y transiciones son candidatos para el registro de configuración; no son estados actualmente publicados ni reutilizaciones del ciclo de Evidence.

Los contratos futuros deben incluir esquemas cerrados, ETag/hash fuerte, bloqueo, comparación transaccional e idempotencia. Quien propone no revisa ni decide su propia versión, incluso si acumula roles. La revisión y la decisión se refieren al mismo hash, Definition y target. Un cambio exige nueva revisión. La policy debe resolver expresamente si revisor y decisor pueden coincidir; no se concede por omisión ni se impone una tercera persona universal. Prevalece cualquier separación vigente más estricta.

La proyección muestra valor original, propuesta, resultado efectivo, autor, revisor, decisor y vigencia. Las correcciones son prospectivas, con sucesión e intervalos gobernados; no borran historia ni recalculan resultados anteriores. Un conflicto de igual especificidad se informa como conflicto, sin elegir por orden de lectura o por orden de UI.

## Aplicabilidad contextual

Reutilizar RequirementApplicability y sus comandos existentes, con Subject opcional, rationale e intervalo. La FK candidata a la KnowledgeVersion de contexto de 04/B07 conserva la entrada exacta de la decisión. Los históricos sin esa evidencia mantienen NULL, sin backfill inventado. Aceptar una sugerencia y ejecutar el comando autorizado son actos distintos. El contexto empresarial no altera la fuente Platform ni convierte automáticamente una recomendación en obligación.

## Evidencia futura requerida

Publicar los datos Definition, scope, grant, policy, esquemas y transiciones por los mecanismos existentes, después de revisión física y ejecutable. Verificar luego actores reales cuando exista autorización QA. Diseñar casos de autor DENY, actor de otro tenant DENY, grant NONE DENY, actor autorizado ALLOW, versión desactualizada 409, replay sin duplicación, publicación inmutable, conflicto explícito y auditoría íntegra. Aplican TC-CONFIG-001, TC-SOD-001, TC-AUTHZ-001, TC-IDEM, TC-CONC y aislamiento tenant. **Estas pruebas operacionales no fueron ejecutadas en esta entrega.**
