# Modelo lógico y físico — amendment contractual

No se ejecuta DDL ni se modifica database/expected-schema.json. 02_PHYSICAL_DELTA.json fija tipos, nulabilidad, claves y referencias; EXPECTED_SCHEMA_CONTRACT.json es la proyección sucesora contractual, **no un inventario QA**. El conteo deriva una tabla adicional del artefacto de 242 tablas, sin afirmar su existencia física.

## Relaciones y cardinalidades

KnowledgeSource 1:N KnowledgeItem; KnowledgeItem 1:N KnowledgeVersion. KnowledgeVersion 1:N knowledge_version_context_links; cada vínculo tiene **exactamente un** destino NormativeUnit, Requirement, ControlVersion o Subject. Cada destino admite 0:N versiones editoriales. context_role es comprender, implementar, demostrar o contexto_empresarial; este último requiere Subject. No son estados de cumplimiento. ID UUIDv7; source_locator y provenance_ref son citas, no permisos o FKs sustitutas.

La fila vínculo hereda exactamente ownership/tenant de KnowledgeVersion. Global no apunta a privado; tenant sólo apunta a global autorizado o mismo tenant. FK al ID exacto y guard diferido de ownership son conjuntos, no alternativas. Subject tiene tenant_id, no ownership_class: se compara su tenant directamente. El conjunto publicado de cuerpo y vínculos es inmutable. Una asociación no concede licencia, entitlement o lectura del destino.

## Ampliaciones y necesidad demostrada antes del DDL

1. config.configuration_overrides.control_version_id y config.effective_configurations.control_version_id son FKs tipadas al ControlVersion tenant. Sólo se permiten en scope control_version; metodología, pack y Subject directos de ese override son NULL. Un UUID no se incrusta en configuration_code ni JSON. La definición permite el scope y el override; mismas capas y resolver canónico.
2. **B06: supersedes_configuration_override_id nullable**, FK al override anterior del mismo tenant. Es estrictamente necesaria para aprobar una corrección prospectiva sin modificar el intervalo o texto de una versión aprobada y sin escoger por último escritor. Alternativas descartadas: cortar destructivamente la fila aprobada; inferir sucesión desde fecha/orden; resolver otro motor. El sucesor cita exactamente una versión aprobada del mismo tenant/Definition/control, con número mayor y corte posterior, dentro del intervalo base. Un predecesor tiene como máximo un sucesor aprobado. La vigencia efectiva del anterior se deriva hasta el corte del sucesor; sus campos originales no se editan. No se crean estados ni una tabla de historia paralela. Las aprobaciones de sucesores se serializan sobre la definición/tenant/control y el predecesor; un fork se rechaza. Sin sucesión explícita, solapamiento de igual especificidad produce configuration_conflict.
3. regulatory.requirement_applicabilities.context_knowledge_version_id nullable usa FK compuesta tenant+KnowledgeVersion. Debe ser contexto empresarial publicado/revisado, con vínculo Subject compatible con el scope. Se fija en borrador por el comando existente y se congela al submit/approve. Históricos conservan NULL. No altera decisiones por cambios editoriales.
4. **Corrección de derivación B02:** physical01 especifica UQ KnowledgeItem+version; migration 20260916000600 línea 945 y expected-schema derivaron UQ version_number global. Se publica la corrección al UQ compuesto canónico. La restricción anterior era más fuerte: reemplazarla no renumera ni modifica contenido histórico. No se adopta numeración global artificial para esquivar el defecto. La migración futura exige preflight real y aprobación PO; no se modifica la migración histórica.

## Integridad, auditoría e índices

03_DDL_SPEC.sql contiene el DDL propuesto, **nunca ejecutado**. CHECK XOR, FKs RESTRICT, uniques con semántica NULL explícita, índices de navegación, guardas de ownership/publicación y procedencia son obligatorios. Las reglas TX de resolver, autorización, SoD, hash/ETag, auditoría y sucesión están en los contratos ejecutables. No se atribuye RBAC a una FK ni integridad global/tenant a un NULL compuesto.

Las versiones publicadas conservan texto, hash, targets, autoría y citas. KnowledgeVersion.superseded_by_id ya existe: sólo puede enlazarse una vez a nueva versión publicada del mismo item, con número/corte posterior, por publish gobernado y auditado; no es PATCH ordinario ni reescribe el artefacto sellado. La elegibilidad histórica usa el corte del sucesor, sin cambiar effective_from/to originales. Los demás cambios de una versión publicada están prohibidos.

Los drafts no requieren row_version nuevo. La concurrencia usa locks y hash fuerte con el conjunto de IDs de auditorías materiales del agregado, evitando ABA sin timestamp, xmin o campo inexistente. Los perfiles con row_version existente conservan su CAS.

Ningún FK tiene DELETE CASCADE. No hay tabla por ley, tabla de matriz, copia de Evidence o tabla IA. Se conserva la retención de audit y versiones bajo rector23, clasificación, holds y resolución de políticas; no se ofrece purge en estos contratos.

## Gates y ejecución futura

La revisión contractual del modelo comprueba trazabilidad canónica, columnas reales, referencias, constraints y especificación temporal. **No prueba enforcement PostgreSQL, aislamiento runtime o una migración.** Sus pruebas positivas/negativas reales quedan NOT_RUN_RESERVED_FOR_PO_AUTHORIZED_MIGRATION. El PASS documental/estructural nunca se etiqueta como PASS de esa ejecución. La orden PO actual aprueba B02/B04/B06/B07 como arquitectura; no autoriza aplicarlos a la base.
