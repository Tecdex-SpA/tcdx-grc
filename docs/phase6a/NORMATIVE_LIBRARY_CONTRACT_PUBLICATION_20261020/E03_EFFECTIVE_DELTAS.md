# E03 — Deltas publicados y precedencia

| Binding | Delta contractual acotado | Artefacto autoridad |
| --- | --- | --- |
| B01 | Sexto código CL_LEY_21663, law/Chile, fuentes/vigencias por disposición, gate independiente; compatibilidad preliminar | RECTOR_DELTA.md, REGULATORY_SCOPE.json, CANONICAL_IMPORT_CONTRACT.json |
| B02 | KnowledgeVersion con cuatro destinos FK/XOR, UQ item+version y custodia inmutable | 01_LOGICAL_PHYSICAL_CONTRACT.md, 02_PHYSICAL_DELTA.json, KNOWLEDGE_AND_CUSTODY.md |
| B03 | Contexto tenant KnowledgeVersion→Subject, prosa no jurídica | KNOWLEDGE_AND_CUSTODY.md, OpenAPI KnowledgeContextContent |
| B04 | Cuatro Definitions y scope ControlVersion en Override/EffectiveConfiguration; un resolver | CONFIGURATION_DEFINITIONS.json, CONFIGURATION_APPROVAL_AND_CONCURRENCY.md |
| B05 | Grant contractual GRC_MANAGER approve limitado; operacional NONE | PERMISSIONS_AND_GRANTS.json, OBJECT_POLICIES.json |
| B06 | Operaciones/ciclo/review/decide, SoD/ETag/idempotencia/audit/outbox, sucesión prospectiva | OPERATIONS.json, LIFECYCLE_BINDINGS.json, EVENTS_AND_AUDIT.json |
| B07 | Contexto FK nullable en aplicabilidad y perfil audit aditivo exacto | APPLICABILITY_AND_CROSSWALKS.md, APPLICABILITY_CONTEXT_AUDIT_SCHEMA.json |
| B08 | Seis matrices como consultas de relaciones autorizadas, sin resultados persistidos | MATRIX_TYPES.json, MATRIX_READ_CONTRACT.md |
| B09 | Preferencias efímeras; persistencia/exportación condicionadas a contratos posteriores | PREFERENCES_EXPORT_AND_AI_CONTINUITY.md |

Son contratos locales efectivos sólo por el recibo y el manifiesto de esta publicación. Prevalecen únicamente los deltas enumerados sobre sus fuentes históricas; contratos no afectados conservan autoridad. Los rótulos históricos prepared/candidate/no ejecución no se reescriben ni invalidan el acto posterior. No existe delta contractual pendiente P01–P06 tras sellado correcto; implementación, ejecución física, contenido auténtico y dependencias posteriores conservan gates propios.
