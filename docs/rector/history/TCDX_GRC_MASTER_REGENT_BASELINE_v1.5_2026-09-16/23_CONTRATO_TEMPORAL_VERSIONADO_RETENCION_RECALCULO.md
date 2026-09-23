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
