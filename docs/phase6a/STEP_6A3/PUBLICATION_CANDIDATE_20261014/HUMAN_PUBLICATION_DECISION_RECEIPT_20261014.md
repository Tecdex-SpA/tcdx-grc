# DR-STEP6A3-PUBLICATION-CANDIDATE-20261014-01 — constancia de aprobación humana

`DECISION_ID=DR-STEP6A3-PUBLICATION-CANDIDATE-20261014-01`  
`PUBLICATION_PACKAGE_ID=GP-STEP6A3-PUBLICATION-CANDIDATE-20261014-01`  
`PUBLICATION_MANIFEST_FILE=docs/phase6a/STEP_6A3/PUBLICATION_CANDIDATE_20261014/PUBLICATION_MANIFEST.json`  
`PUBLICATION_MANIFEST_SHA256=5b3b791cc2b7c3446ff69b244edacdf3ab810b0c864c5428c795f52dc6b9fb06`  
`PREDECESSOR=TCDX_GRC_MASTER_REGENT_BASELINE_v1.8_2026-10-09`  
`SUCCESSOR_CANDIDATE=TCDX_GRC_MASTER_REGENT_BASELINE_v1.9_2026-10-14`  
`SOURCE_DESIGN_DECISION=DR-STEP6A3-COMMERCIAL-GOVERNANCE-20261013-02`  
`SOURCE_DESIGN_PACKAGE_SHA256=489e8cec4b72c2cf464d0315e5ba4f2f5664012b60df2327a07f82882943ba55`  
`SOURCE_DESIGN_ARTIFACT_MANIFEST_SHA256=b454e3e2475ece966f87a4da1f89c1640f5cf9baf48d7b7d146935edc4db5cc3`  
`SOURCE_SIGNED_AT_UTC=2026-10-13T23:45:00Z`  
`HUMAN_IDENTITY=Andrés Barouh`  
`HUMAN_FUNCTIONS=Producto; Arquitectura; Modelo de Datos; Backend; Seguridad; Privacidad/Legal; Metodología; QA/Release`  
`SIGNED_AT_UTC=2026-10-14T12:03:42Z`  
`APPROVAL_STATUS=APPROVED`  
`SIGNATURE_MEDIUM=EXPLICIT_CONVERSATION_APPROVAL_NOT_CRYPTOGRAPHIC`

## Alcance de la decisión

Andrés Barouh aprobó expresamente los 77 archivos y sus hashes enumerados en el manifest como contenido exacto candidato para publicación gobernada de la sucesora v1.9. Aprobó las 15 diferencias rectoras frente a v1.8 dentro del alcance comercial ya aprobado. La decisión comercial v2 permanece vigente; no se reabren G-01..G-06, C-01..C-12, H-01..H-12 ni F-01..F-10. R-A permanece sin autorización. Cualquier diferencia de contenido rompe la correspondencia con esta aprobación.

La aprobación autoriza registrar esta decisión, continuar la preparación de publicación, verificar artefactos de activación y preparar los gates físicos y ejecutables. No declara activa automáticamente v1.9, dispensa la ceremonia de activación ni aprueba expected-schema, publicación/seed, implementación o imágenes futuras fuera del manifest. No cierra H, STEP 6A.3, STEP 6A.4 ni release.

No autoriza DDL/DML en QA compartido, IAM real, grants, cambios destructivos, commit, push, merge, deploy ni inicio de STEP 6A.4. Cada acto dependiente conserva sus gates y mandato operacional. La intención de autorizar futuras migraciones QA no sustituye esas autorizaciones. El dominio público canónico permanece `https://grc.tecdex.net/`; no se admite fallback por el dominio incorrecto.

## Verificación previa al registro

- HEAD leído: `23c7b50468213b8c0769ca2607349e04f4c32eae`.
- Baseline activa leída: `TCDX_GRC_MASTER_REGENT_BASELINE_v1.8_2026-10-09`, `BASELINE_STATUS=ACTIVE`.
- SHA-256 del manifest de publicación: coincide con el valor aprobado; 77 rutas únicas, 77 tamaños y 77 hashes correctos; 15 documentos normativos cambiados.
- Paquete comercial v2 y manifest de 30 artefactos: hashes coincidentes. El receipt comercial original permanece byte idéntico a su hash registrado `78e1216e018a3c7d5f8efb8905e415aeb9b741aa40edc1c6addb91a39a3eab8f`.
- `build-review-package.py --verify` y `scripts/verify-rector-governance.sh`: PASS antes de este registro.

Este receipt registra la aprobación expresada por el humano en la conversación, sin inventar una firma digital. Es evidencia posterior y **no integra los 77 archivos aprobados**. No modifica la candidata, la baseline activa ni sus manifests.
