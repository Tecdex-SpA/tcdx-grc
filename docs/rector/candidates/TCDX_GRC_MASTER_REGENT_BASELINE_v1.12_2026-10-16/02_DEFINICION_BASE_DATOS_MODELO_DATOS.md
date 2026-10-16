# TCDX GRC — Definición de base de datos y modelo de datos

## Autoridad

La nueva base `tcdx-grc` se diseña desde cero. La primera implementación autorizada será definitiva y no conserva esquemas legacy, provisionales o paralelos por compatibilidad.

> Primero existe el modelo canónico; después existen los consumidores.

## Capas

### Global / Platform
Frameworks, versiones, `NormativeUnit` jerárquicas, Requirements atómicos evaluables, controles de referencia, regulatory content, catálogo de permisos, capabilities y catálogos globales.

### Tenant Master Data
Tenant, organización, unidades, procesos, servicios, activos, proveedores e identidades relacionadas.

### GRC Operational
Assessments, controles, evidencias, riesgos, issues, acciones, auditorías, incidentes, continuidad, privacidad y surveys.

### Data & Intelligence
Observaciones, metric definitions, measurements, calidad, lineage, snapshots e impactos.

### Integration
Integraciones, sync runs, checkpoints, raw records, external schema mappings, errores, DLQ y health. Las Observations canónicas pertenecen a Data & Metrics; Integration Hub no mantiene una segunda autoridad de Observation.

## Multi-tenancy

Toda entidad tenant-owned debe tener ownership inequívoco. Ninguna query de negocio puede depender de que el caller recuerde agregar accidentalmente el tenant.

Las relaciones y constraints deben impedir asociaciones cross-tenant inválidas.

## Temporalidad

Cada entidad declara su semántica: evento, estado actual, versión, validity interval, snapshot o append-only log.

`created_at` no representa universalmente el período efectivo de negocio.

## Versionado

Normas, NormativeUnit, Requirements, controles globales, documentos, evidencias, cuestionarios, metodologías, regulatory content y templates requieren versionado explícito cuando corresponda.

## Archivos

Document, DocumentVersion, Evidence y EvidenceVersion son conceptos distintos. Un archivo asociado no equivale por sí mismo a evidencia aprobada.

## Auditoría

Las operaciones críticas permiten reconstruir actor, tenant, momento, acción, entidad, estado previo/posterior y correlation ID.

## Idempotencia

Conversiones, acciones automáticas, imports, sync, webhooks y snapshots deben definir business key/idempotency key y comportamiento de retry.

## Métricas

Toda medición oficial conserva definición, versión de fórmula, fuente, período, unidad, calidad, freshness y lineage.

## Integridad

No crear columnas para satisfacer consumers equivocados. El consumer debe ajustarse al contrato canónico salvo que el contrato haya sido formalmente modificado.

## Addendum - Gate previo de modelo de datos

La estructura definitiva de BD debe soportar el contrato `Source -> Ingestion -> RawRecord -> Normalization -> Subject Binding -> Observation -> Validation/Data Trust -> Metric Definition -> Calculation -> MetricMeasurement -> Rule Evaluation -> GRC Impact -> Domain Command/State -> Aggregation/Snapshot -> Result Envelope -> Presentation -> Drill-down/Lineage` sin duplicar hechos por modulo. Los consumidores no pueden forzar columnas o tablas ad-hoc incompatibles. Todo cambio semantico posterior requiere extension/migracion versionada del contrato. Ver documentos 14 y 15.
## Cierre pre-schema

El modelo físico PostgreSQL sólo puede derivarse después de reconciliar `16` a `44`, especialmente `30_MODELO_LOGICO_RELACIONAL_CANONICO.md`, las adiciones 41–42 y el contrato normativo 44. El schema físico no define semántica; la implementa. Se aplica la Fase 1 de 43.
