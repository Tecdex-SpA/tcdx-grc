# Seguridad y tenant isolation

Fecha: 2026-10-08. Main / 6af66387aa03fa185ef139584de07700f247b903. Master: TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23. STEP_6A3=PARTIAL_BLOCKED.

Cadena existente preservada: Identity → active Membership → entitlement → Permission → scope → ObjectPolicy → SoD → ALLOW/DENY; default DENY. Plataforma no equivale a autoridad tenant. ApiClient mantiene header tenant autenticado y tokens/idempotency existentes; currentTenantId no cambia IAM/autorización.

No backend route, grants, permissions ni migraciones nuevas. PostgreSQL82 pruebas verificó contrato runtime/RBAC/tenant existente con fixtures legítimos del modelo aislado. Tests de adapters cubren contexto cambiado, row tenant mismatch,403 no-empty, búsqueda/filter/parent rechazados, versión Control incompatible y relación ControlAssessment→AssuranceTest no admitida. Picker ante403 elimina cache/selección, no sólo deshabilita botón. URLs/context no autorizan escritura: todas lecturas y comandos finales revalidan server-side; scopes/SoD no se calculan ni amplían desde browser.

EvidenceVersionSelect requiere parent Evidence autorizado, version compatible approved y target EvidenceRequest exacto/open. Scan y demás invariantes siguen en comando existente; frontend no afirma que selección autorice fulfillment/closure. `apps/backend/src/core-grc/service.ts:216` revalida elegibilidad y `docs/rector/baseline/24_CONTRATO_EVIDENCIA_DOCUMENTOS_ARCHIVOS.md` mantiene FileObject != Evidence aprobada. Action completed != verified. Scope owned_object sin mapping actor↔Subject permanece fail-closed enbackend existente.

Las38 relaciones confirmadas se conservan al no cambiar persistence/commands;2directasno soportadas siguen rechazadas (ControlAssessment→AssuranceTest y Applicability→SoAItem). Read filters sólo FKpublicadas por tipo. No context navigation links nuevos. Membership parcial usa sólo lectura Tenant Admin ya autorizada y minimiza en adapter a Membership ID/display_name; no nueva política assignee ni PlatformAdmin bypass. Retention parcial requiere privacidad; no global browse ni Evidence-wide grant inventado.

Domain scan de source activo excluye tests negativos y documentación histórica: bad canonical domain references=0. No secretos en doc; secret scannerrepo y scopedchecks PASS. Test tokens/rows son fixtures locales, jamás authority QA. PGtarget fijo127.0.0.1:55432; no consultas ni writesQA. Histórico QA30migrations/latest20261007000200/237tables/172Permission no se reverificó accediendoQA; contracts verify local reporta30/237/172.
