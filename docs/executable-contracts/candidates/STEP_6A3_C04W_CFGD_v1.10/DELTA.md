# STEP_6A3 C-04W / CFG-D — contrato ejecutable candidato v1.10

STATUS=DRAFT_NOT_EFFECTIVE
SOURCE_PACKET_SHA256=6b87812823472d56a89622eca8119b0cd56606f2f21d635dd84bf903896ba7f2

## C-04W

### Operaciones HTTP exactas candidatas

Todas las mutaciones exigen `Idempotency-Key`, `X-TCDX-Tenant-Id`, bearer autorizado y transacción con AuditEvent. Las transiciones usan `If-Match` fuerte `"<row_version>"`; `expected_version` es interno y se rechaza en el body HTTP. Las lecturas son tenant-scoped, `no-store`, sin entrega de fuente binaria por estos endpoints.

| OperationId | Método y ruta API v1 | Permission | AuditEvent | Body HTTP |
|---|---|---|---|---|
| `retentionPolicySubmitForReview` | POST `/retention-policies/{id}:submit-for-review` | `privacy.retention_policy.update` | `audit.privacy.retention_policy.submit_for_review.v1` | `{}` |
| `retentionApplicabilityList` | GET `/retention-policy-applicabilities` | `privacy.retention_policy.read` | NONE | sin body; filtros `page[size]`, `page[cursor]`, `filter[lifecycle_state]`, `filter[retention_policy_id]` |
| `retentionApplicabilityGet` | GET `/retention-policy-applicabilities/{id}` | `privacy.retention_policy.read` | NONE | sin body |
| `retentionApplicabilityCreate` | POST `/retention-policy-applicabilities` | `privacy.retention_policy.create` | `audit.privacy.retention_policy_applicability.create.v1` | `retention_policy_id`, `version_number`, `classification` obligatorios; `scope_subject_id`, `processing_activity_id`, `legal_basis_id`, `source_evidence_version_id`, `source_clause_ref`, `effective_from`, `effective_to`, `supersedes_applicability_id` opcionales |
| `retentionApplicabilitySubmitForReview` | POST `/retention-policy-applicabilities/{id}:submit-for-review` | `privacy.retention_policy.update` | `audit.privacy.retention_policy_applicability.submit_for_review.v1` | `{}` |
| `retentionApplicabilityReview` | POST `/retention-policy-applicabilities/{id}:review` | `privacy.retention_policy.review` | `audit.privacy.retention_policy_applicability.review.v1` | `{}` |
| `retentionApplicabilityApprove` | POST `/retention-policy-applicabilities/{id}:approve` | `privacy.retention_policy.approve` | `audit.privacy.retention_policy_applicability.approve.v1` | `{}` |
| `retentionApplicabilityPublish` | POST `/retention-policy-applicabilities/{id}:publish` | `privacy.retention_policy.publish` | `audit.privacy.retention_policy_applicability.publish.v1` | `{}` |
| `legalHoldRelease` | POST `/retention-policy-applicabilities/{id}:release-hold` | `privacy.retention_policy.legal_hold.release` | `audit.privacy.retention_policy.legal_hold.release.v1` | `reason` obligatorio; `release_source_evidence_version_id` opcional |

`UploadIntentCreateRequest` agrega `retention_policy_applicability_id` UUIDv7 obligatorio; `scope_subject_id` y `processing_activity_id` UUIDv7 opcionales. `RetentionPolicyCreateRequest` y `RetentionPolicyUpdateRequest` hacen `retention_seconds` condicional: ausente para `legal_hold`, entero ≥0 obligatorio para otros kinds. Las proyecciones de FileUploadIntent, FileObject y EvidenceVersion agregan el ID tipado; Evidence conserva su FK original. Las operaciones de evidencia del Tenant Admin sólo admiten la fuente propia del flujo C-04W según ObjectPolicy, sin cambiar otros roles. Todas las operaciones anteriores tienen `x-tcdx-scope=tenant`, `x-tcdx-capability=PRIVACY` salvo upload/evidencia existentes con `EVIDENCE_DOCUMENTS`; errores 400/401/403/404/409 y 422 de invariante según contrato 06.

- `retentionPolicyCreate`: Tenant Admin tenant-owned con PRIVACY; para `legal_hold`, `retention_seconds` ausente y persistido NULL; otras kinds requieren entero no negativo; policy draft. `retentionPolicySubmitForReview` agrega `draft→under_review` con `privacy.retention_policy.update`, autor propio, If-Match fuerte, idempotency, audit. Review/approve/publish preservan SoD y permisos Privacy Manager/Legal Reviewer.
- `retentionApplicabilityCreate`: `POST /api/v1/retention-policy-applicabilities`, permiso `privacy.retention_policy.create`, capability PRIVACY, campos obligatorios `retention_policy_id`, `version_number`, `classification`; opcionales `scope_subject_id`, `processing_activity_id`, `legal_basis_id`, `source_evidence_version_id`, `source_clause_ref`, `effective_from`, `effective_to`, `supersedes_applicability_id`. Sólo policy publicada tenant-owned. Respuesta draft con `row_version=1`; fuente opcional sólo hasta respaldo pendiente. Read/list bajo `privacy.retention_policy.read`, tenant-only.
- `retentionApplicabilitySubmitForReview|Review|Approve|Publish`: `draft→under_review→approved→published` con permissions `privacy.retention_policy.update|review|approve|publish`, If-Match, idempotency, autor distinto del aprobador, revalidación de fuente y scope, audit transaccional. Publicada inmutable; sucesora versionada.
- `uploadIntentCreate` exige `retention_policy_applicability_id`, `retention_policy_id`, clasificación, contexto declarado y aplicabilidad primaria ordinaria publicada/vigente. `uploadFinalize` hereda FK después de scan-PASS. `evidenceCreate` exige concordancia FileObject/Evidence/EvidenceVersion; para fuente de Tenant Admin admite `links=[]` porque la relación tipada final es la nueva aplicabilidad, sin inventar un target normativo. `evidenceSubmit` por Tenant Admin sólo su fuente del mismo tenant; review/approve de EvidenceVersion permanecen separados. La fuente aprobada y scan-PASS se vincula en nueva versión de aplicabilidad, sin autoacreditación jurídica.
- `legalHoldRelease`: `POST /api/v1/retention-policy-applicabilities/{id}:release-hold`; permiso nuevo `privacy.retention_policy.legal_hold.release`, scope tenant, sólo Legal Reviewer tenant-owned, distinto del autor del hold. Body `reason` y `release_source_evidence_version_id` opcional; If-Match de aplicabilidad, idempotency, FK de AuditEvent transaccional, hora de PostgreSQL, release insert-only. No ejecuta purge. Purge reevalúa todas las políticas concurrentes y DENY ante hold activo/conflicto/contexto insuficiente.
- RolePermission exactos: `ROLE_PERMISSIONS.json`. Entitlement PRIVACY sigue sólo GRC; EVIDENCE_DOCUMENTS no cambia. No hay grants Platform, globales ni directos a identidades.

## CFG-D

`BASELINE_COMPLIANCE` v1 y `BASELINE_CONTROL_EFFECTIVENESS` v1, sus fórmulas, EC opcional, assessments y snapshots históricos se preservan. Submit de assessment es cálculo diagnóstico; `result_status=valid` declarado por caller no acredita metodología. Antes de approve/publicación se exigen criterios completos publicados por metodología/version, población, inputs, evidencia, cobertura, procedencia, conflictos, recencia sólo si existe límite, calidad y lineage. Como v1 carece de inventario íntegro de criterios required/blocking/evidence sufficiency, approve de preview `valid` queda DENY con causa contractual `insufficient_data`. Otros estados se rigen por rector 38; nunca se convierte falta de evidencia en cero ni `EC=NULL` en `configuration_mode=none`. No se publica versión ficticia.

## Gates

Contratos 03/05/09/14/27, OpenAPI, auditoría, RBAC y release deben publicarse sólo después de sucesora exacta aprobada y gate ejecutable. Probar PG16 real, inmutabilidad, versión, scan-PASS, tenant isolation, role scope, SoD, hold, source auténtica autorizada en QA, guards positivos/negativos, typecheck/build y runtime QA. Los fixtures sintéticos de unit test no acreditan fuente legal.
