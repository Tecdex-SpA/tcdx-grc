# TCDX GRC — Modelo físico PostgreSQL 16

Estado del artefacto: `DRAFT_CANDIDATE_FOR_HUMAN_REVIEW`

Baseline: `TCDX_GRC_MASTER_REGENT_BASELINE_v1.4_2026-09-15`

Fase: `PHYSICAL_MODEL_DESIGN`

Motor objetivo: PostgreSQL 16, base `tcdx-grc`

Gate humano pendiente: `PHYSICAL_DATA_MODEL_REVIEW`

## Alcance y autoridad

Este directorio deriva el modelo físico definitivo de las 175 entidades canónicas únicas de `33_CATALOGO_ENTIDADES_CANONICAS.md`, las relaciones de `30_MODELO_LOGICO_RELACIONAL_CANONICO.md` y los cierres 39–44. Es documentación no ejecutable: no contiene DDL, migraciones, seeds, triggers, funciones, policies RLS ni cambios de runtime.

La autoridad permanece en el baseline rector. Este candidato no aprueba su propio gate y no autoriza contratos ejecutables, migraciones ni desarrollo funcional.

## Convención de lectura

`01_PHYSICAL_DATA_MODEL.md` define perfiles físicos reutilizables y, para cada tabla, su perfil, ownership, columnas propias, claves, checks, temporalidad, auditoría, retención e integridad. La combinación **perfil + fila de tabla** constituye la especificación completa; ningún ORM o consumidor puede completar campos materialmente.

Los otros documentos separan relaciones, invariantes, índices, aislamiento tenant, temporalidad, auditoría/lineage, RBAC, normativa, tipos, nomenclatura, trazabilidad, decisiones técnicas, blockers y reporte de revisión.

## Reglas de congelamiento

- PK nuevas: UUIDv7 generado por plataforma, sin default de BD.
- Instantes: `timestamptz`, normalizados a UTC; fechas civiles: `date`; timezone: identificador IANA.
- `tenant_id` es ownership, no scope funcional. `organization_id` no es universal.
- Versiones publicadas, snapshots, resoluciones, historial y audit son inmutables.
- No hay tabla `results`, `domain_results`, `clauses`, `permission_definitions` ni `connector_contract_versions`.
- JSONB sólo se usa donde el baseline autoriza payload abierto, raw o metadata suplementaria; no sustituye relaciones, autorización, cálculo ni lineage.
- Relaciones polimórficas críticas se materializan con FKs tipadas y checks de exclusividad.
- No se usa borrado en cascada sobre historia, evidencia, mediciones, impactos, snapshots, resoluciones, erasure o auditoría.

## Índice

1. [Modelo físico](01_PHYSICAL_DATA_MODEL.md)
2. [Relaciones y cardinalidades](02_RELATIONSHIP_AND_CARDINALITY_MATRIX.md)
3. [Constraints e invariantes](03_CONSTRAINTS_AND_INVARIANTS.md)
4. [Estrategia de índices](04_INDEX_STRATEGY.md)
5. [Aislamiento multi-tenant](05_MULTI_TENANT_ISOLATION_MODEL.md)
6. [Temporalidad, versionado y retención](06_TEMPORAL_VERSIONING_RETENTION_MODEL.md)
7. [Auditoría, evidencia y lineage](07_AUDIT_EVIDENCE_LINEAGE_MODEL.md)
8. [RBAC físico](08_RBAC_PHYSICAL_MODEL.md)
9. [Modelo normativo](09_NORMATIVE_AND_REGULATORY_MODEL.md)
10. [Catálogo de tipos](10_DATA_TYPE_CATALOG.md)
11. [Estándar de nombres](11_PHYSICAL_NAMING_STANDARD.md)
12. [Trazabilidad canónico → físico](12_CANONICAL_TO_PHYSICAL_TRACEABILITY.md)
13. [Registro de decisiones](13_PHYSICAL_MODEL_DECISION_LOG.md)
14. [Blockers](14_OPEN_BLOCKERS.md)
15. [Reporte de revisión](15_PHYSICAL_DATA_MODEL_REVIEW_REPORT.md)

## Estado de fase

`RECTOR_GATE=PASS`

`PHYSICAL_MODEL_DESIGN=AUTHORIZED`

`PHYSICAL_DATA_MODEL_REVIEW=PENDING`

`EXECUTABLE_CONTRACTS=PENDING`

`MIGRATIONS=BLOCKED`

`FUNCTIONAL_DEVELOPMENT=BLOCKED`
