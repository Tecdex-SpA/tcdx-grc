# E05 — P02 cerrado

APPLICABILITY_CONTEXT_V1 es un perfil aditivo versionado dentro de before_payload/after_payload.applicability_context_v1 del AuditEvent canónico. El esquema cerrado y EVENTS_AND_AUDIT.json fijan applicability/version/row_version, tenant/scope, KnowledgeVersion/Item/version/hash/Subject exactos. Actor humano real, autoridad/SoD, correlación, timestamp/outcome y retención siguen las columnas/contratos existentes; no sistema paralelo.

applicabilityCreate conserva audit.compliance.applicability.create.v1, HTTP202, idempotencia y ausencia de domain event/outbox nuevo. Submit/Approve mantienen sus códigos y eventos, CAS expected_version/row_version y lifecycle. Revalidación bajo locks, FK del mismo tenant y contexto publicado/revisado; perfil no copia cuerpo protegido. La mutación y auditoría se confirman atómicamente; replay no duplica hechos.

Históricos sin perfil permanecen «no registrado»; nuevos sin contexto registran null. No hay backfill, latest mutable, reevaluación automática o modificación de decisiones antiguas. Una corrección es una nueva versión gobernada. Pruebas de forma positivas/negativas PASS; integridad y autoridad runtime NOT_RUN.
