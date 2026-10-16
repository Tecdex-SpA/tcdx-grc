# STEP 6A.3 — preparación de activación rectora v1.9

`DECISION=DR-STEP6A3-PUBLICATION-CANDIDATE-20261014-01`  
`APPROVAL=APPROVED_EXACT_77_CANDIDATE_FILES`  
`CANDIDATE=PREPARED_VERIFIED_NOT_EFFECTIVE`  
`ACTIVATION=BLOCKED_PENDING_EXACT_ACTIVATION_BYTES_AND_CEREMONY`  
`ACTIVE_BASELINE=TCDX_GRC_MASTER_REGENT_BASELINE_v1.8_2026-10-09`  
`STEP_6A3=PARTIAL_BLOCKED`  
`STEP_6A4=NOT_STARTED`

La constancia humana está en `HUMAN_PUBLICATION_DECISION_RECEIPT_20261014.md`. El manifest aprobado tiene SHA-256 `5b3b791cc2b7c3446ff69b244edacdf3ab810b0c864c5428c795f52dc6b9fb06` y contiene 77 archivos con hashes correctos. El `SHA256SUMS.txt` de la baseline activa tiene SHA-256 `e51f6539df119775b2feb8839907c8cd690623b82707b399aa15a31d59196533`; el de la candidata tiene SHA-256 `8466d47faaf34a6be6884ca8edf264f772c98c3b80b73d7b7b999fc4cf4b37d5`. Ambos son contenidos diferentes y no se sustituyen por cambio de nombre o estado.

## Secuencia exacta de la ceremonia pendiente

1. Verificar otra vez HEAD, receipt, manifest aprobado, 77 hashes, baseline v1.8 activa y ausencia de divergencia candidata. Si cambia un byte aprobado, detener y volver a revisión humana de ese delta.
2. Preparar una copia histórica **byte idéntica** de los 52 archivos actuales de `docs/rector/baseline/` en `docs/rector/history/TCDX_GRC_MASTER_REGENT_BASELINE_v1.8_2026-10-09/`; validar su `SHA256SUMS.txt` e inventario exacto, sin modificar v1.4–v1.7. Esta copia todavía no existe ni se declara publicada.
3. Construir una propuesta de cambio atómico para `docs/rector/baseline/` con sólo los 51 documentos normativos y `SHA256SUMS.txt` aprobados en la candidata. Los seis archivos auxiliares del directorio candidato no ingresan a la baseline activa. Verificar igualdad byte a byte contra la candidata y las 15 diferencias aprobadas.
4. Presentar por hash los **artefactos de activación fuera de los 77**: `docs/rector/BASELINE_ID`, `docs/rector/BASELINE_STATUS`, `docs/rector/RECTOR_MANIFEST.sha256`, `docs/rector/ACTIVE_ACTIVATION.json`, `AGENTS.md`, `docs/governance/CODEX_RECTOR_ENFORCEMENT.md`, `scripts/verify-rector-governance.sh`, el nuevo `scripts/verify-v19-governance.py`, `scripts/verify-phase6a3-current.py`, `scripts/test-rector-governance-status.sh`, estado de ejecución y cualquier referencia CI que realmente requiera delta. `scripts/verify-internal-governance.py` se conserva para la historia v1.8. Algunos bytes pueden permanecer iguales; cada nuevo contenido debe revisarse exactamente. El effective_at debe corresponder al acto real de activación, no a la fecha de la firma candidata.
5. Validar un verificador sucesor con positivos y negativos: manifest/ID/status concordantes, historia v1.8 y v1.4–v1.7 protegida, receipt y 77 hashes, scope comercial exacto, SoD conservada, fase sin avance inferido. La CI rectora y la revisión humana antes de integrar `main` siguen obligatorias. No cambiar sólo `BASELINE_STATUS`.
6. Ejecutar la publicación/activación únicamente cuando exista autorización expresa para los bytes de activación, evidencia de verificación y mandato de cambio de estado/operación aplicable. Registrar fecha UTC efectiva real y hash del manifest activo. Volver a ejecutar los verificadores después del acto.

## Gates posteriores separados

| Capa | Preparado | Pendiente antes de implementación dependiente |
| --- | --- | --- |
| Modelo físico | Modelo, inventario READ ONLY, migración forward-only y manifest candidatos aprobados como bytes del paquete de 77. | `PHYSICAL_DATA_MODEL_REVIEW=PASS` específico; compatibilidad real; ensayo PostgreSQL 16 aislado autorizado; expected-schema completo derivado y revisado por hash. |
| Contratos ejecutables | OpenAPI comercial y vista completa candidata, mappings Permission/ObjectPolicy/lifecycle/audit/event/replay y schemas aprobados como bytes. | `EXECUTABLE_CONTRACTS=PASS` específico; registry/permissions/policies activos y manifest comercial de datos/seed exacto cuando se presente. |
| Migraciones | SQL y manifest candidatos fuera del runner activo. | Gates físico/ejecutable, inventario/backup/restore, preflight y autorización operacional por entorno. No DDL/DML QA compartido por esta firma. |
| Backend/frontend | Objetivo y command `subscriptionChangePlan` definidos. | Baseline activa y contratos publicados; implementación, pruebas PostgreSQL/RBAC/tenant/CAS/idempotencia/audit/outbox/UI/E2E y aceptación. |

`database/expected-schema.json` activo permanece con SHA-256 `f920bf882a8b7ab0e91e2d43929bb161ca0ffeab100f0b640cf621a70ec2d7d3`. No existe sucesor completo aprobado. No hay migración ejecutada, implementación comercial nueva, imágenes, deploy ni aceptación runtime por este acto. H-01..H-12 siguen abiertos según sus dependencias; la clasificación comercial no publica ni licencia contenido de RegulatoryPackVersion. R-A continúa excluida.

Este expediente es preparación fuera del manifest de 77; no modifica sus bytes, no declara gates PASS ni representa autorización de activación, QA, IAM, grants, commit, push, merge, deploy o STEP 6A.4.
