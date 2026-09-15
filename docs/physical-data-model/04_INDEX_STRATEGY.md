# Estrategia de índices

No se define DDL. `INTEGRITY` es parte congelable del contrato; `REQUIRED_OPERATIONAL` soporta flujos expresamente exigidos; `CANDIDATE_PERFORMANCE` requiere evidencia de volumetría/EXPLAIN antes de aprobarse.

## INTEGRITY

| Patrón | Tablas | Índice/unique lógico |
|---|---|---|
| PK UUID | todas | btree PK por `<entity>_id` |
| soporte composite FK tenant | todas TENANT_* | UNIQUE `(tenant_id,id)` |
| business key tenant | masters tenant | UNIQUE `(tenant_id,<code>)` o con version/validity indicada en 01 |
| business key global | registries globales | UNIQUE `(code)` o `(code,version)` |
| versión | todas las versionadas | UNIQUE `(root_id,version_number)`; con tenant cuando aplica |
| relaciones puente | todos los links | UNIQUE de endpoints + role/version |
| idempotencia | `idempotency_records` | UNIQUE ownership/tenant+actor+operation+key |
| raw dedup | `raw_records` | UNIQUE `(tenant_id,integration_id,dedup_key,schema_version)` |
| observation event dedup | `observations` | UNIQUE parcial con external_event_id; alternativa contractual determinística con payload_hash |
| binding externo activo | `external_identity_bindings` | UNIQUE parcial clave externa donde `valid_to IS NULL` |
| scope/version | applicability, policies, config | UNIQUE business key + scope + version/effective_from |

## REQUIRED_OPERATIONAL

| Flujo | Índice lógico y orden | Motivo rector |
|---|---|---|
| tenant isolation/listado | `(tenant_id,lifecycle_state,<code>)` | paginación tenant y filtros de estado |
| Subjects | `(tenant_id,subject_type,canonical_key)`; `(tenant_id,owner_subject_id)` | binding, scope y jerarquía |
| Normative tree | `(framework_version_id,parent_normative_unit_id,display_order)` | navegación determinística |
| Requirements | `(framework_version_id,normative_unit_id,requirement_code)` | descendencia/assessment |
| current validity | `(tenant_id,effective_from,effective_to)` en policies/mappings | resolución temporal |
| operational inbox | `(tenant_id,lifecycle_state,due_date)` en issues/actions/requests | trabajo y overdue |
| evidence expiry | `(tenant_id,expires_at,lifecycle_state)` | elegibilidad/freshness |
| integration runs | `(tenant_id,integration_id,started_at DESC)` | health/sync history |
| raw normalize queue | `(tenant_id,sync_run_id,ingested_at)` | pipeline resumible |
| observation query | `(tenant_id,subject_id,observation_type_id,observed_at DESC)` | hechos actuales/históricos |
| metric current | `(tenant_id,metric_definition_id,subject_id,period_end DESC)` excluyendo superseded | resultado vigente |
| source resolution | `(tenant_id,subject_id,resolved_at DESC)` | reproducibilidad/conflicto |
| calc/jobs pending | `(calculation_status,available/start time)` con tenant | workers |
| outbox dispatch | `(delivery_status,available_at,event_id)` parcial pending/retry | at-least-once |
| audit lookup | `(tenant_id,aggregate_type,aggregate_id,occurred_at DESC)` y `(correlation_id)` | reconstrucción |
| snapshots | `(tenant_id,snapshot_kind,effective_at DESC)` | reporting oficial |
| permissions | `(permission_code)`; role/grant endpoint uniques | autorización |
| membership scope | `(tenant_id,tenant_membership_id,role_id,scope_kind)` | decisión RBAC |
| reports | `(tenant_id,report_definition_id,created_at DESC)` | runs/artifacts |
| notifications | `(tenant_id,recipient_membership_id,lifecycle_state,created_at DESC)` | inbox |

Índices para FKs que no queden cubiertas por los anteriores son `REQUIRED_OPERATIONAL` para evitar locks/deletes costosos, aunque la FK no cree índice automáticamente.

## CANDIDATE_PERFORMANCE

- BRIN por tiempo en `raw_records`, `observations`, `audit_events`, `outbox_events`, `system_health_events` y `metric_measurements` sólo con volumen y correlación física demostrados.
- GIN en JSONB únicamente para una consulta contractual aprobada; no se indexa metadata “por si acaso”.
- Particionado temporal/tenant de ledgers sólo tras conocer volumen, mantenimiento, pruning, retención y unicidad global. No forma parte del candidato congelable actual.
- Índices parciales adicionales para estados de colas/workflows sólo con frecuencia y selectividad medidas.
- Búsqueda full-text/vectorial es derivada, no system of record, y requiere decisión posterior autorizada; no agrega columnas autoritativas.

Todo candidato debe demostrar reducción medible sin debilitar uniqueness, tenant pruning, retención o write throughput.
