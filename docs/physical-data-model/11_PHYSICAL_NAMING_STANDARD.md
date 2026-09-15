# Estándar de nombres físicos

## Reglas

- Schemas y tablas: `snake_case`, plural para tablas.
- PK: singular `<entity>_id`; FK: nombre exacto de la PK referida.
- Tablas puente: sustantivo contractual cuando existe (`role_permissions`); si la relación no tiene entidad nominal, `<left>_<right>_links`.
- Instantes: sufijo `_at`; fechas: `_date`; intervalos: `effective_from/effective_to` o `period_start/period_end`.
- Estado de workflow: `lifecycle_state`; ejecución: `calculation_status`; validez: `result_status`; conclusión: `domain_conclusion`.
- Versiones: PK propia más `version_number`; nunca se sobrescribe una versión publicada.
- Constraints: `pk_<table>`, `fk_<table>__<ref>`, `uq_<table>__<columns>`, `ck_<table>__<rule>`.
- Índices: `ix_<table>__<columns>`; parciales añaden sufijo semántico (`__current`, `__pending`).
- No usar nombres ambiguos `status`, `type`, `level`, `score`, `owner` o `mapping` sin calificador.

## Schemas

| Schema | Autoridad lógica |
|---|---|
| `platform` | tenant y comercial |
| `iam` | identidad, RBAC e impersonation |
| `org` | organización y subjects |
| `regulatory` | packs, frameworks, normativa y compliance |
| `controls` | controles y assurance |
| `evidence` | documentos, archivos y evidencia |
| `risk` | riesgo y pérdidas |
| `remediation` | issues, acciones y verificación |
| `audit` | auditorías |
| `operations` | incidentes |
| `third_party` | proveedores |
| `resilience` | BIA y continuidad |
| `privacy` | privacidad, retención y erasure |
| `survey` | encuestas/assessments declarativos |
| `data` | observaciones, métricas, cálculo, calidad, lineage y snapshots |
| `rules` | rules, impacts y automation |
| `integration` | conectores, ingesta y bindings |
| `config` | configuración efectiva |
| `reporting` | dashboards y reportes |
| `knowledge` | conocimiento y cambio regulatorio |
| `ai` | jobs y recomendaciones IA |
| `notification` | notificaciones |
| `ops_audit` | audit event, outbox, idempotencia, jobs, health y lifecycle registry |

Los schemas son namespaces técnicos derivados de bounded contexts 07/33; no crean nuevas autoridades ni permiten escrituras cross-context.

## Nombres prohibidos

`results`, `domain_results`, `clauses`, `requirement_gaps`, `control_tasks`, `permission_definitions`, `connector_contract_versions`, `risk_appetites`, `risk_tolerances`, `system_tenant`, cualquier nombre por cliente/provider/plan/regulación que cree un schema paralelo.
