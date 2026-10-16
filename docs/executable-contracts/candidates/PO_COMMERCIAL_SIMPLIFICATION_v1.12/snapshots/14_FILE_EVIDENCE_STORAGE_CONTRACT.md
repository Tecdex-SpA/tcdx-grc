> DRAFT_NOT_EFFECTIVE — copia candidata PO v1.12. Estados y recibos heredados describen su autoridad histórica; el delta PO rige la propuesta futura.

> CANDIDATE_NOT_EFFECTIVE: snapshot sucesor INITIAL_SOURCE; texto histórico preservado, requiere publicación competente.

# File and evidence storage contract

| Campo | Valor |
|---|---|
| Contract owner | Backend Owner / Security & Privacy Reviewer |
| Internal development authority | Express PO instruction in scope; DR003; no second internal approval |
| Status | `CONTRACT_DEFINED` |

## Authority split

MinIO/S3-compatible storage holds encrypted binary objects. PostgreSQL holds FileUploadIntent coordination plus final FileObject metadata, tenant ownership, permissions, classification, checksum, scan state, retention and evidence/document relations. Blob existence is not Evidence and object storage is not an authorization authority.

## Pipeline

`authorize request → persist FileUploadIntent and opaque quarantine key → short-lived signed upload → trusted size/MIME detection → malware scan → SHA-256 → promote and persist final FileObject → Document/Evidence version → submit/review`.

Before scan PASS the file is unavailable as evidence or download except tightly authorized security/quarantine handling. Scan failure/timeout is explicit; no valid empty fallback.

## Metadata and keys

Persist the exact metadata required by rector 24 and physical model. Object keys contain no tenant name, filename, email or sensitive business data. Tenant namespace is logical and enforced by metadata/access policy. Original filename is display metadata and never trusted as path/MIME.

## Access

Every upload/download verifies tenant + entitlement + permission + scope + object policy. Signed URLs are single-purpose and short-lived; the exact TTL is bounded security configuration approved before runtime and is not product authority. Full signed URLs are never logged/audited. Range/download behavior cannot bypass classification or expiry policy.

The public browser path is `https://grc.tecdex.net`: authenticated `PUT /api/v1/file-upload-intents/{id}/content` streams into the server-owned pending intent quarantine key, and authenticated `GET /api/v1/file-objects/{id}/content` streams a scan-PASS authorized final object. The browser receives a relative `upload_url`, never a private MinIO hostname or signed MinIO URL. Internal signed URLs may remain in the adapter for private operations. The backend enforces exact declared size, tenant and object policy, MIME and malware at finalization, safe Content-Disposition and no caller-selected bucket/key. No alternate storage is introduced.

## Evidence lineage

Document, DocumentVersion, Evidence, EvidenceVersion, EvidenceReview, FileUploadIntent and FileObject remain separate. FileUploadIntent is expirable pre-materialization coordination, never evidence or permanent alternate storage. EvidenceLink and EvidenceRequest use approved typed targets and same-tenant constraints. Evidence proving tenant implementation links the tenant Control; a global ControlVersion alone is insufficient. Expiry preserves history but changes current eligibility and may trigger only approved policies/events.

## Integrity/recovery

Checksum is verified at finalization and retrieval/restore procedures. Object versioning/backup is reconciled with PostgreSQL metadata. Missing/mismatched blob causes explicit dependency/source failure, not successful Evidence. Orphan quarantine cleanup and retention purge are idempotent, audited jobs honoring legal hold.

`FILE_EVIDENCE_STORAGE_CONTRACT=PASS` as a Phase 2 contract candidate.

## STEP_6A3 C-04W — cadena documental vinculada

Un nuevo FileUploadIntent exige `retention_policy_applicability_id` de una policy tenant-owned publicada, ordinaria e inequívoca, clasificación y contexto compatibles. FileObject hereda exactamente esa FK después de scan-PASS y hash real. EvidenceVersion conserva la misma applicability y concuerda con Evidence.retention_policy_id y su FileObject directo o mediante DocumentVersion. Las filas históricas con FK nula se consultan como `LEGACY_UNBOUND`; no se les inventa fuente ni se las presenta como acreditadas. Una fuente legal vinculada requiere EvidenceVersion aprobada, vigente y FileObject scan-PASS, con cláusula y contexto explícitos. El vínculo prueba procedencia técnica y no certifica cumplimiento jurídico. Purge reevalúa obligaciones concurrentes, retención ordinaria y todo legal hold activo, con DENY ante conflicto o contexto insuficiente.


## INITIAL_SOURCE v1.11 — delta candidato

Excepción exclusiva al requisito de primaria publicada para el primer documento fuente: si no existe primaria ordinaria elegible para el contexto exacto, request-upload, finalize y EvidenceCreate pueden usar una nueva aplicabilidad draft de un Tenant Admin custodio, sin source, vinculada a policy ordinaria tenant-owned publicada/vigente. Cada comando revalida bajo locks el mismo tenant, clasificación, propósito evidence_document, contexto, FK y ausencia de primaria/conflicto. Intent/file/EvidenceVersion conservan la misma FK y el mismo autor documental real, Tenant Admin custodio o Evidence Owner con permisos/scope vigentes. En esta ruta acotada links=[] no crea evidencia de negocio. Scan/hash/MIME/storage, expiración, cleanup y revisión independiente se mantienen. El documento auténtico es externo aportado por persona competente: su carga no acredita legalidad. El draft permanece draft durante carga/revisión. Sólo tras aprobación independiente, vigencia/scan-PASS y cláusula auténtica el custodio ejecuta bind; después siguen submit/review/approve/publish ordinarios. No se admite source inexistente, histórica sin vigencia, cambio de autoría, datos falsos o publicación previa para desbloquear upload. El contrato ejecutable sucesor detalla el comando y consumo.

La custodia de la primera fuente mediante FK a aplicabilidad draft no cambia duración ni precedencia de la policy ordinaria tenant-owned publicada/vigente. Source pendiente se deriva de FK/estado existentes; no es un enum persistido, legal hold, obligación acreditada ni permiso de borrado. Ninguna cadena pendiente habilita consumo de negocio, evaluación oficial, purge o release; todas las obligaciones concurrentes y la historia se conservan. Source e intervalo se revalidan al bind y antes de aprobar/publicar. Los plazos comerciales futuros de12/18/24/36/48/60meses no se implementan por esta sucesora.


## INITIAL_SOURCE — reconciliación de scope submit, sucesora ejecutable

EvidenceVersion/draft/evidence.submit/v2→submitted conserva permiso evidence.evidence.submit, audit.evidence.evidence.submit.v1 y side effect evidence.evidence.submitted.v1. Scopes: assigned_object,owned_object,tenant. Tenant sólo permite submit por el autor humano real de la cadena INITIAL_SOURCE propia, con scope tenant efectivo, rol Tenant Admin custodio o Evidence Owner, aplicabilidad draft nueva válida, sin source, sin EvidenceLinks, policy ordinaria tenant-owned publicada/vigente, contexto/FK exactos y ausencia de primaria ordinaria. Si sólo tiene tenant y no satisface ese predicado: DENY; la lectura tenant no confiere derechos. No sintetizar scopes en el actor. Antes de CAS y en replay se reautoriza con datos bloqueados actuales. Después de publicación de la aplicabilidad el replay no produce otra transición; comprueba autor/contexto/cadena, sin conceder consumo a un documento sin links.

Owned/assigned ordinarios conservan permiso, scope efectivo, ObjectPolicy y reglas actuales. No se concede tenant-only para Evidence ordinaria o ajena. Review/approve y sus SoD no cambian. El consumo ordinario y bind mantienen guards v1.11. La sucesora usa precondition_policy_ref contract:initial-retention-source-submit:v1.11. La v1 permanece inmutable e inventariada; la elección es por versión publicada superior, conforme al resolver canónico, sin fallback.

## Operador privado y publicación

Nueva operación privada exclusiva QA iam.initial_source.publish dentro del operador existente, sin endpoint HTTP público ni grants nuevos. Reutiliza autenticación real del principal M2M activo y sus proofs actuales. Configuración adicional: par completo TCDX_INITIAL_SOURCE_PUBLICATION_ROOT / TCDX_INITIAL_SOURCE_PUBLICATION_MANIFEST_SHA256; ausencia deshabilita la operación; configuración parcial/no QA/manifest o decisión incoherente DENY. Loaders verifican baseline activa, aprobación exacta, todos los snapshots y binding, recibo predecessor y ledger34/R2 exactos. No añadir credenciales, ServicePrincipal ni permisos; no ejecutar iam.publish/iam.c04w.publish.

Transacción: lock_timeout5s; bloquear registry, scopes y side-effects; resolver proof/principal; verificar predecesora v1 exacta del snapshot QA; insertar únicamente v2 con3scopes y el mismo side-effect requerido ordinal1; insertar una auditoría audit.platform.lifecycle_transition.publish.v1 bajo step6a3InitialSourceLifecyclePublication, con manifest/decisión/hash/principal/correlation, sin secretos. Falla audit o discrepancia revierte todo. Replay exacto verifica v2, scopes/efecto/audit único y retorna0 filas/0audit nuevos; discrepancia es409 y nunca edita v1/v2. Las cinco aristas C04W conservan sus filas/auditorías sin republicación. Bind no crea otra arista.



## Delta operativo y jurídico candidato PO

DELTA.md C3–C4 sucede cualquier lectura universal de INITIAL_SOURCE: ese flujo
es para incorporar una fuente formal y no es un requisito de guardar una opción
ordinaria. Una primaria ordinaria publicada sin fuente puede ser técnicamente
elegible con policy ordinaria no obligatoria, contexto y FK exactos, conservando
guards físicos y todas las obligaciones concurrentes. No acredita legalidad.
Si se vincula fuente o se invoca acreditación formal, sus revisiones y SoD se
validan; Evidence/hold no se autoaprueban por autonomía Tenant. No se permiten
uploads nuevos sin FK ni purge por una opción mensual. El operador privado y sus
publicaciones históricas conservan sus contratos; no se ejecutan aquí.
