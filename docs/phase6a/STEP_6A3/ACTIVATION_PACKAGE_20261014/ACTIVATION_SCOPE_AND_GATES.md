# Paquete único de preparación de activación v1.9

`STATUS=PREPARED_NOT_EFFECTIVE`  
`ACTIVE_BASELINE=TCDX_GRC_MASTER_REGENT_BASELINE_v1.8_2026-10-09`  
`APPROVED_CANDIDATE=TCDX_GRC_MASTER_REGENT_BASELINE_v1.9_2026-10-14`  
`SOURCE_DECISION=DR-STEP6A3-PUBLICATION-CANDIDATE-20261014-01`  
`SOURCE_MANIFEST_SHA256=5b3b791cc2b7c3446ff69b244edacdf3ab810b0c864c5428c795f52dc6b9fb06`  
`PROPOSED_ACTIVATION_DECISION=DR-STEP6A3-RECTOR-V19-ACTIVATION-20261014-01`

El manifest `ACTIVATION_STAGING_MANIFEST.json` enumera los hashes de la copia histórica v1.8, la baseline sucesora byte idéntica a los documentos normativos aprobados, los punteros/contratos de enforcement/estado propuestos y los verificadores. No es un manifest activo. La aprobación humana de los 77 archivos conserva su receipt y no se repite.

## Operaciones exactas propuestas para una sola ceremonia posterior

1. Revalidar el manifest fuente de 77 archivos y el receipt de aprobación. Exigir que HEAD y la worktree sean los que apruebe el mandato operacional; los cambios heredados no se descartan ni se incorporan por arrastre.
2. Preservar `docs/rector/baseline/` v1.8 completo bajo `docs/rector/history/TCDX_GRC_MASTER_REGENT_BASELINE_v1.8_2026-10-09/` a partir de los 52 archivos staged, con inventario exacto y SHA-256. Mantener v1.4–v1.7 inmutables.
3. Sustituir el contenido de `docs/rector/baseline/` por los 52 archivos staged de v1.9 (51 `.md` normativos y `SHA256SUMS.txt`); no copiar al directorio activo los seis auxiliares de la candidata.
4. Aplicar en el mismo cambio gobernado los punteros y manifests raíz, `AGENTS.md`, enforcement, estado de ejecución, checkpoint del ledger y verificadores staged. El reporte macro original del ledger conserva su hash canónico y sus 48 cláusulas; el nuevo checkpoint sólo actualiza el puntero rector.
5. Registrar el receipt de la decisión de activación real. Sustituir **sólo** `__REAL_ACTIVATION_UTC__` y `__NEW_ACTIVATION_DECISION_RECEIPT_SHA256__` en `ACTIVE_ACTIVATION.json` por la fecha efectiva real y el SHA-256 de ese receipt. La ruta e ID de decisión ya están fijados en el template. Validar UTF-8, JSON, fecha UTC, hash y ausencia de otros placeholders antes de declarar la activación.
6. Ejecutar verificador v1.9, verificador STEP 6A.3 y CI rector. Conservar revisión humana antes de integrar `main`. Si cualquier hash, historia, gate o fuente difiere: NO_GO; no activar por editar sólo `BASELINE_STATUS`.

Los dos valores dinámicos del paso 5 aún no existen. Por ello el hash final de `ACTIVE_ACTIVATION.json`, el hash final del receipt y el hash del manifest operacional resultante **no son calculables antes del acto**. Todos los bytes estáticos staged tienen hashes presentados; ninguna hora de aprobación anterior se usa como fecha efectiva.

## Gates físicos, ejecutables y de implementación preparados

| Capa | Preparación verificable | Dependencia que sigue pendiente |
| --- | --- | --- |
| Físico | Modelo, SQL forward-only, inventario READ ONLY y manifest de migración candidatos incluidos en los 77 bytes aprobados. | Revisión humana `PHYSICAL_DATA_MODEL_REVIEW=PASS` del delta específico; ensayo PostgreSQL 16 aislado autorizado; inventario/compatibilidad real; backup/restore y expected-schema completo por hash. |
| Ejecutable | OpenAPI candidata y fusión completa, bindings de Permission/ObjectPolicy/lifecycle/audit/event/replay y schemas incluidos en los 77 bytes. | Revisión humana `EXECUTABLE_CONTRACTS=PASS` específica; activación de registry/permissions/policies y manifest de datos comerciales exactos. Los tres grants son sólo candidatos. |
| Expected-schema | Delta estructural candidato identifica tres tablas nuevas y relaciones existentes afectadas; archivo activo SHA-256 `f920bf882a8b7ab0e91e2d43929bb161ca0ffeab100f0b640cf621a70ec2d7d3`. | Materialización PostgreSQL aislada autorizada, inspección real, reconciliación y aprobación por hash del sucesor completo. |
| Migración/compatibilidad | SQL candidato de hash aprobado, sin runner activo ni QA DDL/DML. | Gates físico/ejecutable, inventario de datos actuales, ensayo fresh/upgrade/reapply/rollback y mandato operacional por entorno. Ningún backfill heurístico. |
| Implementación comercial v2 | Command, endpoint, CAS/replay, lineage, auditoría/outbox, RBAC y lecturas definidos documentalmente. | Publicación superior, gates anteriores y task packet de implementación; después backend, frontend, pruebas reales y aceptación. |

No se cambia la base de datos, los contratos ejecutables activos, IAM, grants, backend, frontend, infraestructura, deployment ni el dominio canónico `https://grc.tecdex.net/`. No se declara `STEP_6A3=PASS`, `STEP_6A4` iniciado ni `READY_FOR_RELEASE`.
