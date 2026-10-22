# Aplicabilidad contextual y relaciones entre marcos

ApplicabilityCreateRequest añade context_knowledge_version_id opcional, nullable en persistencia, con FK compuesta al mismo tenant. No se renombra el comando ni se sustituye su CAS o lifecycle existentes. En borrador, el actor autorizado fija la versión de contexto; submit/approve revalidan que esté publicada/revisada, sea TENANT_OWNED, tenga contexto_empresarial→Subject propio y corresponda al scope. Si scope_subject_id está presente debe coincidir con el Subject declarado por ese vínculo; tenant-wide admite contexto de organización del mismo tenant. Contexto de otro scope se rechaza en vez de inferir una jerarquía o usar metadata.

Requirement, source/FrameworkVersion, applicability_version, rationale, intervalo, actor/approved_by y AuditEvent conservan sus autoridades. El contexto es una entrada declarada, no una fuente jurídica. La FK se congela al submit/approve; cualquier corrección de la decisión genera la versión correspondiente por sus comandos y preserva la anterior. Históricos NULL no reciben backfill. Cambiar una guía o contexto no reevalúa ni altera decisiones existentes. Aceptar una recomendación no invoca el comando automáticamente.

FrameworkCrosswalk, NormativeUnitCrosswalkMapping, RequirementCrosswalkMapping y ControlCrosswalkMapping siguen tipados por ambas ediciones, tipo/dirección/fundamento/confianza/procedencia/revisión y aprobación. Las seis correspondencias recibidas siguen preliminares hasta cotejo; no se publica su contenido mediante esta orden. matrixRead expone sus estados literales sólo bajo las lecturas y access_mode autorizados. No copia conclusiones ni fusiona identidades.

Las referencias de lectura entre unidades pueden expresarse como citas Knowledge: link ordinal a vínculos con FKs de unidad y locator, sin afirmar equivalencia o nueva relación normativa crítica. Una relación intra-edición crítica distinta de parent no se fuerza en crosswalk: requiere su contrato específico antes de persistirse. Este paso no crea tal autoridad a partir de un href.

NormativeUnit no recibe assessment o EvidenceLink directo. La biblioteca recorre Requirements y targets autorizados de evidencia; Annex A no se convierte artificialmente en Requirement.

## Binding de auditoría contextual cerrado

EVENTS_AND_AUDIT.json fija APPLICABILITY_CONTEXT_V1 y APPLICABILITY_CONTEXT_AUDIT_SCHEMA.json: extensión aditiva explícita en before/after del AuditEvent canónico de create/submit/approve, sin cambiar sus códigos v1 ni exigir outbox nuevo a create. Referencias KnowledgeVersion/Item/version/hash/Subject exactas, tenant autenticado, actor/autoridad real, correlación y CAS se verifican transaccionalmente. La versión queda fijada; no se consulta latest ni se reescribe historia. Ausencia histórica del perfil no equivale a contexto inferido.
