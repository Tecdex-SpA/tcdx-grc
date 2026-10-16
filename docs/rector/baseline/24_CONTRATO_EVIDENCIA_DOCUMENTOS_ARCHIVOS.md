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

## 9. Enmienda candidata STEP_6A3 C-04W

El comando nuevo request-upload exige RetentionPolicyApplicability publicada y aplicable, registra su FK y la RetentionPolicy/version. Finalize conserva la misma FK en FileObject sólo tras scan-PASS y hash real. EvidenceVersion hereda el vínculo exacto del FileObject directo o de DocumentVersion.file_object_id y concuerda con Evidence.retention_policy_id. Cuando una aplicabilidad cita una fuente para acreditación jurídica o contractual formal, esa fuente se aporta como EvidenceVersion auténtica del mismo tenant, revisada, vigente y respaldada por FileObject scan-PASS antes de publicar la nueva versión que la cite. Una aplicabilidad operativa ordinaria puede carecer de fuente: no se le atribuye por ello acreditación jurídica. La carga técnica nunca acredita validez jurídica. Las versiones históricas permanecen inmutables; ausencia de respaldo se informa como insuficiencia.

Fuente exacta del delta: `docs/governance/amendments/STEP_6A3_C04W_CFGD_20261014/CONTRACT_PACKET_20261015.md`; SHA-256 `6b87812823472d56a89622eca8119b0cd56606f2f21d635dd84bf903896ba7f2`. Esta copia candidata no es autoridad activa antes del gate 47.


## STEP_6A3 — candidata de incorporación inicial de fuente v1.11

`STATUS=DRAFT_NOT_EFFECTIVE; HUMAN_EXACT_BYTES_REVIEW=PENDING`. Baseline candidata TCDX_GRC_MASTER_REGENT_BASELINE_v1.11_2026-10-15, predecesora TCDX_GRC_MASTER_REGENT_BASELINE_v1.10_2026-10-15. Diseño PO aprobado por SHA `1a133d60e576208eefc90d68ff39df903df829f3c9ab1b3c51fa06d8c826913b`; constancia `docs/governance/amendments/STEP_6A3_INITIAL_SOURCE_20261015/PO_DESIGN_APPROVAL_RECEIPT_20261015.json`. Esta sección sólo tendrá efecto después de publicación conforme47/49 y gates físico/ejecutable; no autoriza operación QA ni deploy por sí sola.

Excepción exclusiva al requisito de primaria publicada para el primer documento fuente: si no existe primaria ordinaria elegible para el contexto exacto, request-upload, finalize y EvidenceCreate pueden usar una nueva aplicabilidad draft de un Tenant Admin custodio, sin source, vinculada a policy ordinaria tenant-owned publicada/vigente. Cada comando revalida bajo locks el mismo tenant, clasificación, propósito evidence_document, contexto, FK y ausencia de primaria/conflicto. Intent/file/EvidenceVersion conservan la misma FK y el mismo autor documental real, Tenant Admin custodio o Evidence Owner con permisos/scope vigentes. En esta ruta acotada links=[] no crea evidencia de negocio. Scan/hash/MIME/storage, expiración, cleanup y revisión independiente se mantienen. El documento auténtico es externo aportado por persona competente: su carga no acredita legalidad. El draft permanece draft durante carga/revisión. Sólo tras aprobación independiente, vigencia/scan-PASS y cláusula auténtica el custodio ejecuta bind; después siguen submit/review/approve/publish ordinarios. No se admite source inexistente, histórica sin vigencia, cambio de autoría, datos falsos o publicación previa para desbloquear upload. El contrato ejecutable sucesor detalla el comando y consumo.

## Configuración y carga ordinarias — DR001 §4

No se exige adjuntar documento jurídico ni iniciar revisión independiente para guardar una configuración SaaS ordinaria autorizada. Las cargas ordinarias conservan primaria operativa publicada, policy tenant-owned/vigente, contexto/clasificación y FK exactos, hash, MIME, scan-PASS, autorización y auditoría. Una primaria ordinaria sin source puede ser elegible técnicamente sin acreditar un fundamento jurídico; no se fabrica un documento para desbloquearla. Si se invoca una obligación obligatoria/contractual o una fuente, se validan su procedencia y el flujo formal correspondiente. La ausencia de policy/binding técnico publicado sí impide el comando afectado; no impide administrar usuarios o una configuración independiente.
La excepción draft de primera fuente continúa exclusivamente para acreditar una fuente real. Su revisión y bind no se convierten en requisito universal de operación ordinaria. EvidenceReview/approve, retención concurrente y hold mantienen SoD y controles; ninguna carga demuestra cumplimiento por sí sola. Las categorías de23 y toda historia permanecen.
