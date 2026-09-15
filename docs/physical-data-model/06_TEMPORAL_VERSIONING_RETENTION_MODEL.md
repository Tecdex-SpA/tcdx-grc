# Temporalidad, versionado y retención

## Semánticas temporales

| Semántica | Columnas | Aplicación |
|---|---|---|
| técnica | `created_at`, `updated_at` | persistencia; nunca sustituye tiempo de negocio |
| observación | `observed_at`, `source_timestamp`, `ingested_at` | hechos externos/internos |
| vigencia | `effective_from`, `effective_to` | policy, mapping, definición, normativa |
| período | `period_start`, `period_end` | measurement, assessment, evidence |
| publicación | `published_at` | versión oficial inmutable |
| supersession | `superseded_by_id`, `superseded_at` cuando aplica | corrección/versionado sin rewrite |
| snapshot | `effective_at`, `published_at` | vista lógica inmutable |
| fecha civil | `due_date`, `review_date` | interpretada en timezone IANA contractual |

Todos los instantes usan `timestamptz` UTC. DST se interpreta con reglas IANA a la fecha efectiva. No se usan timestamps sin zona.

## Modelo de versión

- Root estable + versión con UUID propio y `version_number` monotónico.
- UNIQUE root/version; como máximo una versión published/current aplicable por intervalo cuando el contrato así lo exige.
- Published no se actualiza. Cambio compatible o incompatible crea nueva versión; incompatibilidad exige análisis contractual.
- Correcciones de facts se retractan/supersede; historia y links permanecen.
- Framework/pack editions crean identidades versionadas nuevas y crosswalk, nunca merge de historia.

## Recálculo

Dato tardío, corrección, mapping/policy/formula/config distinta o backfill crea `CalculationRun` nuevo. Si se publica, crea `MetricMeasurement`/resultado concreto y `Snapshot` nuevos. El snapshot anterior pasa a referencia histórica/superseded sin mutación de sus items. Un reporte aprobado sigue apuntando a los snapshots originales.

## Retención

| Clase | Baseline | Política física |
|---|---|---|
| AuditEvent | 7 años | IMMUTABLE_RETAIN |
| Evidence/document aprobado | 7 años tras expiración/cierre | IMMUTABLE_RETAIN, salvo retención superior/legal hold |
| RawRecord | 90 días online | EPHEMERAL_PURGE después de `retention_until`, sujeto a policy/hold |
| Observation/Measurement | 7 años | IMMUTABLE_RETAIN |
| CalculationRun/Snapshot | 7 años | IMMUTABLE_RETAIN |
| connector operational log/DLQ | 180 días | purge/archivo por policy |
| security log | 1 año online | policy reforzada puede aumentar |
| otros objetos | `RetentionPolicy` efectiva | deletion_policy de 01 |

Precedencia: `legal_hold > mandatory_regulatory_policy > contractual_policy > tenant_policy > product_baseline`. La policy más restrictiva bloquea purge hasta resolución. Toda ejecución registra policy/version y AuditEvent.

## Deletion policies

- `EPHEMERAL_PURGE`: sólo después del plazo y sin hold.
- `ARCHIVE_ONLY`: sale de operación corriente, conserva identidad.
- `SUPERSEDE_VERSION`: nueva versión, anterior intacta.
- `INVALIDATE`: hecho no elegible, no borrado.
- `IMMUTABLE_RETAIN`: no UI delete ni cascade.
- `PRIVACY_ERASURE_CONTROLLED`: workflow Privacy, acción por objeto/clase y ErasureExecutionRecord minimizado.

No existe DELETE CRUD genérico ni CASCADE sobre objetos históricos.
