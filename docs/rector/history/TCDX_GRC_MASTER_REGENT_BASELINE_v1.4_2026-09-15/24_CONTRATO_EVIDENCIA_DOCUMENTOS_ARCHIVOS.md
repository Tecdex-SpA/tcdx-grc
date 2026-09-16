# 24 - Contrato de evidencia, documentos y archivos

## 1. Separación

`Document != DocumentVersion != Evidence != EvidenceVersion != EvidenceReview`.

Un archivo es blob; no es evidencia aprobada por existir.

## 2. Storage

PostgreSQL conserva metadata y relaciones. Binarios residen en object storage compatible S3 con tenant namespace lógico, encryption at rest y URLs firmadas de corta duración.

## 3. Upload pipeline

`request upload -> validate type/size -> quarantine -> malware scan -> checksum -> store -> create version -> classify -> submit/review`

Hasta scan PASS el archivo no es utilizable como evidencia.

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

## 7. Expiración

Expiry no elimina historial. Cambia elegibilidad para cálculos actuales y puede generar EvidenceRequest/Issue según regla.

## 8. Relación con estructura normativa

Evidence no se vincula directamente a `NormativeUnit` como demostración de cumplimiento. La navegación por cláusula obtiene evidencia mediante Requirements, Controls, RequirementAssessment, ControlAssessment y AssuranceTest descendientes, preservando el objeto exacto que la evidencia sustenta.

`EvidenceLink` admite exclusivamente Requirement, Control, ControlVersion, RequirementAssessment, ControlAssessment o AssuranceTest. Cuando se demuestra una implementación tenant, el vínculo debe incluir el Control tenant; un ControlVersion global por sí solo no acredita implementación.

`EvidenceRequest` referencia exactamente uno de estos targets solicitables: Requirement, Control, RequirementAssessment, ControlAssessment o AssuranceTest. Su implementación física debe usar FKs tipadas o una restricción equivalente que garantice existencia y pertenencia al mismo tenant; se prohíbe un par genérico `(target_type,target_id)` sin integridad.
