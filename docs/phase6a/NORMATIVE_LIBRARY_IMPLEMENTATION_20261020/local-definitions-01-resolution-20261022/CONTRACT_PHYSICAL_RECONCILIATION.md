# Reconciliación de contrato y modelo físico

| Autoridad | Regla recibida | Resolución |
| --- | --- | --- |
| Rector29§§2–4 | Definition versionada con tipo, validación, default, scopes y precedencia Platform→objeto | Preservar entidad y resolver; la ausencia no se convierte en un valor |
| Modelo físico01, fila config.configuration_definitions | «exactly one typed default» | Sucesor general expreso: cero defaults representa ausencia; si se aporta uno debe corresponder al value_type |
| Migración31, CHECK typed_default | num_nonnulls=1 AND CASE tipo→columna no nula | Histórico inmutable; migración36 reemplaza el predicado, conserva función de integridad y nombre final |
| CONFIGURATION_DEFINITIONS.json y CONFIGURATION_APPROVAL_AND_CONCURRENCY.md B04 | Cuatrotext v1/default_text_value=NULL, campos ControlVersion originales y confirmación sin configurar | Conservados byte a byte. No centinelas ni nuevo catálogo/escala |
| CONTROL_VALIDATION contract | Una regla global ordinal1, operator contract_schema, referencia code@version:hash_schema y otras operands NULL | Materializada junto con cada Definition y scope; mismo evaluator canónico |
| Orden PO actual / rector45-46 DR003 | Resolución local integral; migración correctiva si indispensable; sin QA | Autoridad del sucesor local; no firma inventada ni aprobación operacional |

Caso A aplica a las cuatro Definitions. Caso B carece de un default contractual legítimo: actividad usa execution_method original, evidencia usa minimum_evidence, periodicidad usa frequency_code/CV03, confirmación conserva NULL/no configurada. Caso C no ofrece una representación tipada equivalente bajo el CHECK recibido: cambiar a json/text vacío u otra columna dejaría de ser el valor aprobado o violaría el tipo. Se evita una tabla, campo o condición específica de esos cuatro códigos.

El nuevo predicado admite exactamente estas formas: `(tipo conocido, todos los defaults SQL NULL)` o `(tipo conocido, un solo default no nulo en su columna correspondiente)`. Sigue rechazando tipo desconocido sin default, columna incorrecta, dos o más defaults. Un JSONB `null` sería un valor JSON de otro tipo y no sustituye SQL NULL de una Definitiontext.

El conjunto de filas previamente válidas es subconjunto del nuevo predicado: todo registro que antes tenía un valor correctamente tipado sigue siendo válido e idéntico. No se requiere transformar datos. La migración es general a ConfigurationDefinition; condiciones de código/tenant/UUID/fecha están ausentes. ConfigurationOverride mantiene sus propias constraints de valor y su workflow; la corrección no autoriza overrides vacíos ni cambia suficiencia de evidencias.

Fuentes actuales y hashes se encuentran en PUBLICATION_MANIFEST del sucesor físico y FILE_MANIFEST de este expediente. Las proyecciones PG16 son evidencia derivada de DDL; el DDL publicado conserva autoridad. No se introduce un segundo generador ni se sustituye la semántica por el catálogo PostgreSQL.
