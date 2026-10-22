# E08 — Contrato físico y frontera

Se reutilizan sin cambiar bytes los cinco artefactos físicos preparados en docs/physical-data-model/amendments/NORMATIVE_LIBRARY_20261020/. Tabla soporte única knowledge_version_context_links; cuatro columnas: configuration_overrides.control_version_id, configuration_overrides.supersedes_configuration_override_id, effective_configurations.control_version_id y requirement_applicabilities.context_knowledge_version_id. EXPECTED_SCHEMA_CONTRACT.json es sucesor contractual, no inventario de base real.

La reconciliación KnowledgeVersion sustituye UQ global version_number por UQ canónico knowledge_item_id+version_number sin renumeración ni edición de migraciones históricas. La sucesión de overrides conserva fila aprobada y corte prospectivo mediante FK; no último escritor. Constraints/índices/guards se publican como especificación candidata para ejecución futura autorizada.

Antes de una migración futura: preflight físico real de catálogos/datos/UQ/FK/locks, pruebas positivas/negativas de constraints y rollback/recuperación, autorización PO de ejecución y evidencia de schema final. Nada de esto se declara ejecutado. No se modifica database/expected-schema.json ni ledger de migraciones.
