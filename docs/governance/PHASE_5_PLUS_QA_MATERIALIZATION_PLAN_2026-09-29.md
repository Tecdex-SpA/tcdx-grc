# Phase 5+ — secuencia QA pendiente, no ejecutada

Estado: **PLAN, NO APLICADO**. Autoridad: resolución humana 2026-09-29. Branch `phase5/runtime-security-closure`; baseline rector v1.7. Las operaciones de negocio siguientes usan API canónica; el inventario SQL indicado es exclusivamente lectura diagnóstica para obtener IDs generados por el importador v1.1 en QA. No se editan los 49 archivos del catálogo, Migration22 ni SubscriptionRegulatoryPack.

## 1. Antes de mutar QA

Registrar SHA de candidato backend/frontend construido a partir del diff revisado, checksum de Migration25, 49 hashes del catálogo, HEAD y estado de QA. Comparar ledger QA: 24 migraciones, latest `20260929000200`; 233 tablas, 158 permisos. Confirmar `NODE_ENV=qa` en backend y ausencia de clasificación de TECDEX. Probar backup/restore y salud. Obtener aprobación humana de la aplicación QA después de revisar este candidato. Desplegar por el mecanismo QA existente con rollback de artefactos; aplicar **sólo** Migration25 por el runner canónico `pnpm db:migrate`, luego `pnpm db:verify`, `pnpm seed:verify`, `pnpm security:verify` y `pnpm db:tenant-isolation`. Esperado: 25 migraciones, 235 tablas, 163 permisos. No ejecutar ninguna etapa de este plan desde el trabajo local.

## 2. IDs y autorización

Usar token de `PLATFORM_ADMIN` sólo en rutas `/platform/...`, sin `X-TCDX-Tenant-Id`. Usar token de `TENANT_ADMIN` con contexto TECDEX en `POST /api/v1/subjects`. `tenant_id` de TECDEX es `01a0cfc7-0c97-75a3-890f-d6ca9db8bbe9`. Los IDs de versión, ImportManifest y NormativeUnit provenance se obtienen de la importación QA existente; nunca se adivinan ni se hardcodean en migración/seed.

Consulta **read-only** de diagnóstico, ejecutada por operador autorizado en QA tras migrar, para formar los cuerpos API exactos:

```sql
SELECT p.pack_code,pv.regulatory_pack_version_id,im.regulatory_import_manifest_id,
       nu.provenance_ref,pv.lifecycle_state,pv.license_classification,
       pv.effective_from,pv.effective_to
FROM regulatory.regulatory_packs p
JOIN regulatory.regulatory_pack_versions pv ON pv.regulatory_pack_id=p.regulatory_pack_id
JOIN regulatory.regulatory_import_manifests im ON im.regulatory_pack_version_id=pv.regulatory_pack_version_id
JOIN regulatory.regulatory_pack_framework_versions pfv ON pfv.regulatory_pack_version_id=pv.regulatory_pack_version_id
JOIN regulatory.normative_units nu ON nu.framework_version_id=pfv.framework_version_id
WHERE p.pack_code IN ('ISO_9001_2026','ISO_IEC_27001_2022','ISO_IEC_42001_2023')
  AND im.outcome='validated' AND nu.provenance_ref IS NOT NULL
  AND pv.lifecycle_state='draft' AND pv.license_classification='NOT_YET_LICENSED'
  AND (pv.effective_from IS NULL OR pv.effective_from<=transaction_timestamp())
  AND (pv.effective_to IS NULL OR pv.effective_to>transaction_timestamp())
ORDER BY p.pack_code,nu.display_order;
```

Elegir una provenance_ref revisable por cada PackVersion; confirmar su ImportManifest/source y checksum. ISO 9001:2015 terminó 2026-09-16 y Ley 21.719 comienza 2026-12-01: no habilitarlas al 2026-09-29. No convertir draft en published ni modificar `NOT_YET_LICENSED`.

## 3. Operaciones canónicas

Cada POST lleva `Authorization: Bearer <token>` e `Idempotency-Key: <UUID único>`; todos los cuerpos son JSON. Sustituir los marcadores `<...>` con resultados leídos/verificados, sin exponer tokens en evidencia.

1. `POST /api/v1/platform/tenants/01a0cfc7-0c97-75a3-890f-d6ca9db8bbe9/account-classification` con `{"classification":"test"}`. Leer el mismo recurso y exigir `value=test` y `selectedLayerId=configuration-override:<id>`.
2. `POST /api/v1/subjects` con contexto autenticado TECDEX y cuerpo mínimo `{"subject_type":"process","canonical_key":"<clave de proceso aprobada por TecDex>","display_name":"<nombre aprobado por TecDex>"}`. No enviar `tenant_id`, lifecycle, ID ni fechas. Guardar el `resource_id` de la respuesta y verificar `GET /api/v1/subjects` sólo para TECDEX. El nombre/clave son datos humanos de TecDex pendientes, no un seed de producto.
3. Por cada versión ISO temporalmente elegible y revisada: `POST /api/v1/platform/regulatory-pack-validation-provenances` con `{"regulatory_pack_version_id":"<id>","regulatory_import_manifest_id":"<id>","source_role":"provisional_supporting_reference","provenance_ref":"<referencia exacta revisada>"}`. Registrar el ID devuelto. Si el rol revisado es `supporting_reference` o `test_data_source`, usar el rol real aprobado para esa pieza de contenido. Ningún rol se infiere de licencia.
4. Por cada provenance aprobada: `POST /api/v1/platform/regulatory-pack-validation-accesses` con `{"tenant_id":"01a0cfc7-0c97-75a3-890f-d6ca9db8bbe9","regulatory_pack_version_id":"<id>","regulatory_pack_validation_provenance_id":"<id>","effective_from":"<UTC posterior al inicio real de la versión>"}`. Guardar ID y ETag/row_version. No usar `SubscriptionRegulatoryPack`.
5. `GET /api/v1/regulatory-pack-validation-accesses/current` con token/contexto TECDEX muestra sólo sus relaciones, separadas de `GET /api/v1/subscriptions/current/regulatory-packs`. `GET /api/v1/platform/regulatory-pack-versions` sigue mostrando sólo published. La UI debe mostrar la advertencia provisional y el catálogo limitado a los marcos autorizados.
6. En UI/API TECDEX: elegir Subject del selector, buscar por norma/ley y texto, filtrar aplicabilidad e implementación, registrar `applicable` y `not_applicable` con rationale obligatorio, instanciar un Control TENANT_OWNED desde una referencia visible, y verificar assessments/evidence y lineage. Registrar IDs y snapshots históricos antes de revocar.
7. Revocar por `POST /api/v1/platform/regulatory-pack-validation-accesses/<id>:revoke` con `If-Match: "<row_version>"`, `Idempotency-Key` y `{"reason":"Fin de validación QA"}`. Verificar que desaparecen nuevas lecturas/instanciaciones referenciales y que Subject, applicability, Control tenant, assessment, evidence y auditoría anteriores persisten.
8. Repetir búsqueda/listado/instanciación con tenant comercial no clasificado y con backend de producción: ambos deben DENY el contenido draft/NOT_YET_LICENSED. No activar modo QA en producción. Verificar 5xx=0, errores SQL=0, default DENY y logs/audit.

Gate humano pendiente: datos iniciales de Subject, revisión de provenance, ejecución QA y `HUMAN_UI_REVIEW`. Fase 6 permanece bloqueada.
