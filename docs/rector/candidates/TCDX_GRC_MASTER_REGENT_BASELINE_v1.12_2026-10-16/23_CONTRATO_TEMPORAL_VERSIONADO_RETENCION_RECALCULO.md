# 23 - Temporalidad, versionado, retención y recálculo

## 1. Tiempos distintos

- `created_at`: persistencia técnica;
- `observed_at`: momento de observación;
- `effective_from/to`: vigencia de negocio;
- `period_start/end`: período medido;
- `published_at`: publicación oficial;
- `superseded_at`: sustitución.

No son intercambiables.

## 2. Versionado

Son versionables al menos:

FrameworkVersion, NormativeUnit, Requirement content, ControlVersion global, Methodology, MetricDefinition, RuleDefinition, Mapping, SurveyVersion, DocumentVersion, EvidenceVersion, ReportTemplate, RegulatoryPack.

Version publicada es inmutable.

## 3. Corrección histórica

Datos fuente erróneos no se sobreescriben sin rastro. Se retractan/supersede y se inserta corrección.

## 4. Recálculo

- nuevo dato dentro de período abierto: puede recalcular current result;
- dato tardío/corrección: genera nueva CalculationRun y Snapshot;
- cambio de fórmula: no recalcula historia automáticamente;
- backfill requiere job explícito con target methodology/formula version.

## 5. Snapshot

Snapshot publicado es inmutable y reproducible. Un reporte aprobado referencia snapshots concretos.

## 6. Retención baseline de producto

Los siguientes valores son **baselines operacionales del producto, no afirmaciones de mínimos legales universales**. Antes de producción, cada Regulatory Pack/contrato/tenant puede imponer una `RetentionPolicy` superior o distinta cuando sea jurídicamente necesaria. Una política tenant nunca puede reducir una obligación legal/contractual aplicable resuelta por el policy engine:

- AuditEvent: 7 años;
- evidencias/documentos aprobados: 7 años después de expiración/cierre, salvo legal hold;
- raw integration records: 90 días online, luego purge/archival según necesidad contractual;
- normalized observations/measurements: 7 años;
- calculation runs/snapshots: 7 años;
- connector operational logs: 180 días;
- security logs: 1 año online o política reforzada.

El producto debe permitir políticas superiores e implementar legal hold.

## 7. Borrado

Soft delete sólo donde semánticamente corresponde. Audit, published snapshots y historical versions no se borran por UI ordinaria.

Derechos de eliminación de datos personales se procesan mediante workflow de Privacy que respeta obligaciones de conservación/legal hold.

## 8. Resolución de RetentionPolicy

La retención efectiva se calcula por precedencia: `legal_hold > mandatory_regulatory_policy > contractual_policy > tenant_policy > product_baseline`. Ante conflicto se aplica la conservación más restrictiva para borrado hasta resolución autorizada. Toda decisión de purge registra policy/version y AuditEvent.

Ningún Regulatory Pack puede prometer automáticamente que una duración satisface una jurisdicción; la obligación debe estar versionada y vinculada a fuente normativa/contractual.

## 9. Temporalidad comercial propuesta

Un cambio de PlanVersion no renueva, acorta ni extiende automáticamente la vigencia comercial acordada. El command conserva el `ends_at` programado del origen en la Subscription sucesora y la expiración original de cada asignación de RegulatoryPackVersion transferida. El origen se cierra en un corte único `t` obtenido de PostgreSQL después de adquirir los locks; la sucesora comienza en `t`. Se conservan IDs e intervalos históricos. La auditoría registra el término original antes de mutar y permite verificar que el sucesor recibió exactamente ese valor.

Las nuevas PlanVersion publicadas, sus familias, entitlements y límites son inmutables. La regla prospectiva R-P se aplica a nuevas escrituras/expansiones por raíz y no recalcula ni reinterpreta asignaciones históricas. Un conflicto de coexistencia activa exige decisión competente por las asignaciones afectadas, sin elegir derechos por fecha o código. Todo corte/expiración sigue representado como intervalo `[from,to)` y no se deriva de la hora de creación técnica.

## 10. Enmienda candidata STEP_6A3 C-04W

La RetentionPolicy tenant-owned y su versión continúan siendo la única autoridad de duración, tipo y precedencia. Su RetentionPolicyApplicability publicada declara contexto, clasificación, propósito, alcance y vigencia. El resolver considera todas las obligaciones concurrentes; la FK primaria de un archivo selecciona una aplicabilidad ordinaria inequívoca y jamás elimina un legal hold o una obligación superior. Conflicto no resuelto impide purge. Un legal hold usa retention_seconds=NULL, no expira por vencimiento ordinario y sólo se levanta por RetentionPolicyHoldRelease explícita, autorizada, tenant-owned, insert-only y auditada. La liberación no ejecuta purge. Las filas históricas sin vínculo nuevo conservan su política previa y no se presumen liberadas de hold. La especificación exacta de predicados, transición y pruebas es el paquete aprobado identificado al final.

Fuente exacta del delta: `docs/governance/amendments/STEP_6A3_C04W_CFGD_20261014/CONTRACT_PACKET_20261015.md`; SHA-256 `6b87812823472d56a89622eca8119b0cd56606f2f21d635dd84bf903896ba7f2`. Esta copia candidata no es autoridad activa antes del gate 47.


## STEP_6A3 — candidata de incorporación inicial de fuente v1.11

`STATUS=DRAFT_NOT_EFFECTIVE; HUMAN_EXACT_BYTES_REVIEW=PENDING`. Baseline candidata TCDX_GRC_MASTER_REGENT_BASELINE_v1.11_2026-10-15, predecesora TCDX_GRC_MASTER_REGENT_BASELINE_v1.10_2026-10-15. Diseño PO aprobado por SHA `1a133d60e576208eefc90d68ff39df903df829f3c9ab1b3c51fa06d8c826913b`; constancia `docs/governance/amendments/STEP_6A3_INITIAL_SOURCE_20261015/PO_DESIGN_APPROVAL_RECEIPT_20261015.json`. Esta sección sólo tendrá efecto después de publicación conforme47/49 y gates físico/ejecutable; no autoriza operación QA ni deploy por sí sola.

La custodia de la primera fuente mediante FK a aplicabilidad draft no cambia duración ni precedencia de la policy ordinaria tenant-owned publicada/vigente. Source pendiente se deriva de FK/estado existentes; no es un enum persistido, legal hold, obligación acreditada ni permiso de borrado. Ninguna cadena pendiente habilita consumo de negocio, evaluación oficial, purge o release; todas las obligaciones concurrentes y la historia se conservan. Source e intervalo se revalidan al bind y antes de aprobar/publicar. La propuesta comercial de12/18/24/36/48/60meses se incorpora contractualmente en §11; no se declara implementada ni se convierte en segundos o autorización de purge.

## 11. Opción comercial operativa y conservación concurrente — DR001 §5

Propuesta comercial:12 meses por defecto y alternativas18/24/36/48/60 meses. Su dimensión es servicio/operación y no define por sí sola cuánto puede conservarse o borrarse cada categoría. Esta candidata no materializa defaults, UsageLimit, ConfigurationDefinition/Override ni políticas. La selección comercial debe referenciar datos versionados de oferta/contrato y configuración; nunca hardcodes de tenant ni una segunda autoridad de duración.
Las duraciones y anclas de §6 permanecen íntegras: AuditEvent7años; documentos/evidencias aprobados7años desde expiración/cierre; raw90días online y disposición gobernada; observaciones/mediciones7años; CalculationRun/Snapshot7años; logs connector180días; security1año online o refuerzo. Una ventana de servicio12meses no autoriza borrar evidencia aprobada a12meses ni reducir acceso/historia exigidos por su contrato; archivo y disponibilidad se gobiernan por la categoría, no por una reducción silenciosa del SLA. No se homogeneizan obligaciones con unidades o eventos de inicio distintos.
La conservación efectiva evalúa por objeto el evento inicial, la categoría y TODAS las políticas aplicables conforme a §8. Se conservan los pisos de producto y obligaciones superiores; la opción comercial sólo puede añadir una condición compatible. No se usa la precedencia tenant_policy para reducir el piso de categoría. Un hold sin release autorizado impide purge indefinidamente; cambiar plan, elegir12meses, expirar o archivar no lo libera. Fuente obligatoria no resuelta, conflicto o ancla desconocida impiden purge/acreditación dependientes, no una configuración independiente.
El contrato de datos temporal posterior debe fijar el código/versión publicado, unidad mes calendario o duración exacta, ancla, zona y regla de fin de mes antes de mapear a retention_seconds. No se asume mes=30días ni se inventa un default persistido. Esto acota la implementación de esa opción y no reabre su decisión comercial ni bloquea la candidata. No existe autorización de eliminación en esta entrega.
