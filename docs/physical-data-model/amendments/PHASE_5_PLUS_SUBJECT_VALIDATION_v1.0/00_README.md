# Phase 5+ — Subject y acceso regulatorio de validación

Autoridad humana: resolución de arquitectura de 2026-09-29. Baseline rector: `TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23`. Este amendment es forward-only; no modifica el baseline ni el catálogo regulatorio v1.1.

## Subject

`org.subjects` sigue siendo la única entidad Subject. `SubjectCreate` recibe exclusivamente `subject_type`, `canonical_key` y `display_name`; el servidor determina `tenant_id`, UUIDv7, `active`, `transaction_timestamp()`, `effective_to=NULL` y actor. El request no puede determinar ownership, ID, lifecycle ni intervalo. La identidad activa usa `tenant_id + subject_type + canonical_key` y exclusión temporal GiST para impedir generaciones activas solapadas; generaciones históricas terminadas conservan la business key. La migración audita duplicados existentes antes de retirar la unicidad antigua.

## Clasificación tenant

`config.configuration_definitions` contiene `tenant_account_classification` versión 1 publicada, scope tenant y default `commercial`. `config.configuration_overrides` versiona la decisión `commercial | demo | test`; la operación plataforma cierra la versión anterior, audita y resuelve mediante `resolveConfiguration`. Valores ausentes, ambiguos o inválidos resuelven `commercial` y no habilitan contenido provisional. No se acepta una clasificación desde headers, query ni frontend.

## Autoridades físicas adicionales

`regulatory.regulatory_pack_validation_provenances` registra una aprobación inmutable para **una** `RegulatoryPackVersion`: ImportManifest y RegulatorySource exactos, rol de contenido, referencia de provenance y checksum. La referencia se comprueba contra una NormativeUnit vinculada a la versión. El rol registrado es la clasificación revisada del contenido de validación; no modifica el rol ni licencia de la fuente original. La aprobación y auditoría conservan el actor. No duplica textos ni controles del catálogo.

`platform.regulatory_pack_validation_accesses` vincula tenant, versión exacta y provenance aprobada. `ownership_class=PLATFORM_CONTROL`, aunque la relación contiene `tenant_id` obligatorio. El estado es `active -> revoked`; el intervalo `[effective_from,effective_to)` y la exclusión GiST impiden accesos solapados. `row_version`, actores y timestamps sostienen CAS, auditoría e historia. Una FK compuesta obliga a que la provenance corresponda a la misma PackVersion. Revocar cierra el intervalo y no borra applicability, controles TENANT_OWNED, assessments, evidence ni lineage.

`SubscriptionRegulatoryPack` y `effectivePacks()` conservan exactamente la autoridad comercial publicada. No comparten filas ni estado con la autoridad de validación.

## Inventario

Migración `20260929000300_phase5_plus_subject_validation_access.sql`: 24 → 25 migraciones, 233 → 235 tablas de dominio, 158 → 163 permisos publicados. Se agrega una definición de configuración; el catálogo v1.1 y Migration22 no cambian.
