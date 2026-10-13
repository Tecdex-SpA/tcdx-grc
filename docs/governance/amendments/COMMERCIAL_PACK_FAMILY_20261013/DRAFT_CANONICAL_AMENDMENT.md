# Borrador de enmienda — familia normativa y elegibilidad comercial

`STATUS=DRAFT_NOT_APPROVED_NOT_ACTIVE`
`TASK_ID=COMMERCIAL-PACK-FAMILY-20261013`
`MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.8_2026-10-09`
`CODEX_VARIATION_BUDGET=ZERO`
`RECTOR_GATE=BLOCKED` para publicar contrato, cambiar plan o migrar QA.

## Autoridad y alcance

El usuario autorizó **preparar** una enmienda canónica de familia de pack el 2026-10-13. También decidió que el cambio de plan será una sustitución transaccional inmediata, conservará ambas suscripciones y trasladará los packs vigentes compatibles; un pack incompatible rechaza toda la operación. Un tenant puede tener simultáneamente múltiples ISO y leyes operativas. Sumar un pack agrega acceso sin retirar los demás; reemplazar uno cierra únicamente su intervalo y activa el nuevo conservando historia y evidencia. Estas decisiones de intención no publican por sí solas un modelo físico, operación API, permiso ni migración.

Fuentes: rector 37 §§1–6 (motor único, versiones y adopción explícita), 41 §1 (cuatro packs ISO y una ley inicial), 42 §§2.1–2.4 (ISO solo estándares de familia ISO; GRC también contenido legal, contractual y sectorial; Plan/Entitlement separado de RBAC), modelo físico 01 (`RegulatoryPack`, `Subscription`, `SubscriptionRegulatoryPack`), decisión Phase 5 de creación de Subscription y contrato aprobado de packs Phase 5+.

## Brecha comprobada

`regulatory.regulatory_packs` solo posee `source_type` y `jurisdiction_code`; no hay atributo ni relación que identifique la **familia ISO**. `source_type=standard` no basta: el rector 37 contempla también estándares no ISO. Un prefijo de `pack_code`, una lista de UUIDs en código o el orden de semillas no son autoridad comercial. `activatePack` verifica publicación/vigencia del pack y la Subscription, pero no la elegibilidad de familia respecto al plan. El dato de familia debe estar disponible para altas, sumas, reemplazos, traslados por cambio de plan y lecturas efectivas.

En QA, una consulta PostgreSQL `READ ONLY` sobre conexión TLSv1.3 identificó **4** raíces `source_type=standard` y **1** `source_type=law`, sin revelar contenido ni cambiar filas. Esto no acredita por sí solo su familia o publicación.

## Representación candidata para decisión humana

Agregar a la entidad global `RegulatoryPack` el atributo gobernado `standard_family_code varchar(64) NULL`. Para `source_type=standard` debe tener un código de familia publicado; para otros `source_type` debe ser `NULL`. La familia pertenece a la raíz estable del pack, no a cada versión ni a cada tenant. Las cuatro raíces ISO obligatorias de rector 41 recibirían el código cerrado `ISO`; la raíz legal conservaría `NULL`. Nuevos códigos de familia requieren publicación contractual previa. Una versión publicada no altera retroactivamente la familia de su raíz.

La elegibilidad efectiva candidata es:

- Plan `ISO` e `ISO_RIESGO_OPERATIVO`: solo `source_type=standard AND standard_family_code=ISO`, además de versión publicada/vigente, licencia, gate normativo y límites comerciales aplicables.
- Plan `GRC`: packs publicados/vigentes de las clases autorizadas por rector 42 y su versión contractual, incluidos ISO y ley; la lista exacta de clases permitidas requiere fijarse en contrato ejecutable, no en heurísticas.
- Un tenant puede tener simultáneamente asignaciones de **distintas raíces** RegulatoryPack dentro de la misma Subscription: varias ISO y leyes, sin límite global de un solo pack. La exclusión temporal existente solo impide solapamiento para el mismo par Subscription/PackVersion; el reemplazo de una versión de la misma raíz debe cerrar su intervalo anterior antes de activar la nueva, sin afectar las otras raíces. La regla ejecutable de solapamiento por raíz requiere publicación junto con la operación de reemplazo.
- El cambio de plan toma una instantánea bajo lock de la Subscription y asignaciones efectivas. Si cualquiera falla la elegibilidad del destino, rechaza toda la transacción. Si todas pasan, crea asignaciones nuevas hacia la nueva Subscription en el mismo instante efectivo; las filas antiguas permanecen históricas y no se borran evaluaciones/evidencias. El acceso efectivo exige simultáneamente Subscription vigente, pack vigente, Entitlement, RBAC y políticas existentes.

Este texto es una **propuesta para revisión**; las condiciones de licencia, gate normativo y límites solo se implementarán mediante sus bindings publicados. No se crea un atajo que permita que un pack conceda una Capability ausente del plan.

## Migración y contratos afectados si se aprueba

Requiere enmienda formal del modelo canónico/lógico/físico antes de generar una migración forward-only. El preflight deberá verificar el inventario exacto y la clasificación aprobada de **todas** las raíces existentes; si hay una raíz `standard` sin familia decidida, fallará sin escribir. La migración candidata agregaría la columna sin pérdida de datos, poblaría solo el mapeo aprobado, validaría el CHECK condicional y conservaría las versiones/asignaciones históricas. No se altera una migración ya aplicada. No hay autorización para ejecutar este DDL en QA mientras el modelo y gates sigan pendientes.

Después del modelo: revisar catálogo/seed, proyecciones y contratos de elegibilidad, `activatePack`, eventual operación atómica de reemplazo, cambio de plan, permisos, auditoría/outbox, pruebas PostgreSQL de dos tenants y E2E autenticado. QA30 R2 no puede consumir la columna antes de una promoción compatible; QA32 de referencias tiene migraciones y gates independientes.

## Decisión requerida y aceptación

Owner: autoridad humana de Producto + Modelo de Datos + Arquitectura + Seguridad/QA conforme rector 45/49. Debe aprobar **bytes exactos** del atributo, tipo, vocabulario inicial, relación con `source_type`, mapeo de cada raíz, regla GRC para clases no ISO, límites comerciales, planes/roles afectados, migración y orden de promoción. Alternativa material: una relación/catálogo de familias gobernado en lugar de columna; no se elige por inferencia. También queda por definir el estado histórico de la Subscription cerrada y la operación/permiso de cambio de plan.

Aceptación exigida: varios ISO + ley simultáneos en GRC; varios ISO simultáneos en ISO; ley denegada en ISO; familia desconocida denegada; suma no revoca; reemplazo cierra solo el pack sustituido; downgrade incompatible revierte íntegro; historial y evidencia intactos; RBAC negativo y aislamiento entre tenants; replay y concurrencia sin duplicados; lectura posterior consistente. Evidencia local con PostgreSQL real y QA autenticada separadas. `HUMAN_APPROVAL=PENDING`; `PHYSICAL_MODEL_GATE=PENDING`; `EXECUTABLE_CONTRACT_GATE=PENDING`; `QA_MIGRATION=NOT_RUN`.
