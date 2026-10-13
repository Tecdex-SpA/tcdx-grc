# 24 - Contrato de evidencia, documentos y archivos

## 1. Separación

`Document != DocumentVersion != Evidence != EvidenceVersion != EvidenceReview`.

Un archivo es blob; no es evidencia aprobada por existir.

## 2. Storage

PostgreSQL conserva metadata y relaciones. Binarios residen en object storage compatible S3/MinIO operado en infraestructura Tecdex, con tenant namespace lógico, encryption at rest y URLs firmadas de corta duración. Credenciales y claves secretas pertenecen al mecanismo de secrets runtime, nunca a PostgreSQL.

## 3. Upload pipeline

`FileUploadIntent -> signed upload/quarantine -> object received -> malware scan -> detected MIME -> SHA-256 -> encryption/storage metadata -> FileObject final -> EvidenceVersion/DocumentVersion -> submit/review`

Hasta scan PASS el archivo no es utilizable como evidencia.

`FileUploadIntent` es coordinación durable, tenant-owned y expirable del período previo a `FileObject`. Conserva clave opaca server-owned de cuarentena, metadata declarada no confiable, propósito contractual, actor, lifecycle, expiración, idempotencia/concurrencia y referencia al `FileObject` sólo después de promoción. No admite blob ni secreto y no puede operar como repositorio permanente alternativo. `FileObject` sólo se materializa con MIME detectado, tamaño, SHA-256, scan PASS y metadata real de storage/encryption.

## 4. Metadata mínima

- tenant_id;
- object key opaco;
- original filename;
- MIME detectado y declarado;
- size;
- SHA-256;
- encryption metadata;
- created_by;
- source/provenance;
- classification;
- retention policy;
- scan status;
- version;
- effective dates.

## 5. Evidence

Evidence declara:

- claim/control/requirement que sustenta;
- evidence type;
- period;
- owner;
- validity;
- source;
- review decision;
- sufficiency/relevance cuando aplica.

## 6. Seguridad

- deny by default;
- no public buckets;
- object key no contiene información sensible;
- download verifica tenant + permission + scope;
- logs no exponen URLs firmadas completas ni contenido.
- object keys son opacas, generadas por servidor y no contienen filename, email o nombre de tenant; la unicidad impide colisión cross-tenant;
- expiración/cleanup de intents y objetos abandonados es idempotente y auditable;
- malware scan y promoción fallan cerrados.

## 7. Expiración

Expiry no elimina historial. Cambia elegibilidad para cálculos actuales y puede generar EvidenceRequest/Issue según regla.

## 8. Relación con estructura normativa

Evidence no se vincula directamente a `NormativeUnit` como demostración de cumplimiento. La navegación por cláusula obtiene evidencia mediante Requirements, Controls, RequirementAssessment, ControlAssessment y AssuranceTest descendientes, preservando el objeto exacto que la evidencia sustenta.

`EvidenceLink` admite exclusivamente Requirement, Control, ControlVersion, RequirementAssessment, ControlAssessment o AssuranceTest. Cuando se demuestra una implementación tenant, el vínculo debe incluir el Control tenant; un ControlVersion global por sí solo no acredita implementación.

`EvidenceRequest` referencia exactamente uno de estos targets solicitables: Requirement, Control, RequirementAssessment, ControlAssessment o AssuranceTest. Su implementación física debe usar FKs tipadas o una restricción equivalente que garantice existencia y pertenencia al mismo tenant; se prohíbe un par genérico `(target_type,target_id)` sin integridad.
