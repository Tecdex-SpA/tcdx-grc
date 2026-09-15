# Catálogo de tipos físicos

Todos los tipos son PostgreSQL 16. Este documento define aliases documentales, no dominios ni tipos SQL ejecutables.

| Alias documental | Tipo físico | Null/default | Uso e invariante |
|---|---|---|---|
| `id` | `uuid` | NOT NULL / sin default | UUIDv7 generado por plataforma; PK opaca e inmutable |
| `tenant_ref` | `uuid` | según ownership / sin default | FK a `platform.tenants`; nunca tenant artificial |
| `code` | `varchar(160)` | NOT NULL / sin default | business key normalizada; unicidad definida por tabla |
| `short_code` | `varchar(64)` | NOT NULL / sin default | estados/catálogos cerrados mediante CHECK o FK |
| `name` | `varchar(255)` | NOT NULL / sin default | nombre humano |
| `title` | `text` | NOT NULL / sin default | título sin semántica de business key |
| `description` | `text` | NULL / sin default | texto descriptivo |
| `instant` | `timestamptz` | según tabla / sin default salvo `created_at` | instante UTC |
| `created_at` | `timestamptz` | NOT NULL / `CURRENT_TIMESTAMP` | tiempo técnico, no tiempo de negocio |
| `date_only` | `date` | según tabla / sin default | fecha civil interpretada en timezone contractual |
| `iana_timezone` | `varchar(64)` | NOT NULL / sin default | nombre IANA validado contra catálogo de runtime |
| `language_tag` | `varchar(35)` | NOT NULL / sin default | BCP 47 normalizado |
| `country_code` | `char(2)` | NULL / sin default | ISO 3166-1 alpha-2 |
| `currency_code` | `char(3)` | NULL / sin default | ISO 4217 |
| `sha256` | `char(64)` | NOT NULL / sin default | hexadecimal lowercase |
| `uri_ref` | `text` | NULL / sin default | referencia no secreta; scheme permitido validado por aplicación |
| `percent` | `numeric(5,2)` | según tabla / sin default | 0.00..100.00 |
| `probability` | `numeric(7,6)` | según tabla / sin default | 0..1 |
| `confidence` | `numeric(7,6)` | según tabla / sin default | 0..1 |
| `weight` | `numeric(12,6)` | según tabla / sin default | >=0 |
| `decimal_value` | `numeric(30,10)` | según tabla / sin default | cálculo determinístico sin punto flotante |
| `risk_score` | `numeric(8,4)` | según tabla / sin default | inherent 1..25 o residual 0..25 según columna |
| `money` | `numeric(20,4)` | según tabla / sin default | siempre acompañado por moneda |
| `duration_seconds` | `bigint` | según tabla / sin default | >=0; duración canónica |
| `sequence` | `bigint` | NOT NULL / sin default | orden/version monotónico dentro de su parent |
| `counter` | `bigint` | NOT NULL / `0` sólo si el cero es semántico | conteo >=0 |
| `small_counter` | `integer` | NOT NULL / sin default | ordinal/nivel >=0 |
| `json_payload` | `jsonb` | según tabla / sin default | payload raw/event/config estructurado permitido; no autoridad relacional |
| `inet_address` | `inet` | NULL / sin default | IP de auditoría minimizada |

## Valores tipados heterogéneos

`observations`, `configuration_definitions`, `configuration_overrides`, `survey_answers` y objetos equivalentes usan columnas tipadas separadas (`boolean_value`, `integer_value`, `decimal_value`, `text_value`, `timestamp_value`, `duration_seconds_value`, `json_value`) con un CHECK de correspondencia a `value_type` y exactamente un valor no NULL cuando el contrato exige valor. JSON sólo es válido cuando el propio contrato declara `value_type=json`.

## Vocabularios

Se usan `varchar` + CHECK para vocabularios cerrados por el baseline (ownership class, deletion policy, result status y estados publicados). Se usan FKs a registries canónicos para permisos, capabilities, observation types, métricas, reglas, transiciones, metodologías y otros vocabularios versionados. No se crean enums SQL porque su mutación acoplaría despliegue físico y semántica versionada.

## Precisión y redondeo

Los cálculos persisten valores sin redondeo de presentación. Porcentajes usan dos decimales sólo cuando son resultados publicados; inputs y componentes conservan `numeric(30,10)`. Riesgo conserva cuatro decimales. Moneda conserva cuatro decimales y exige `currency_code`; conversiones requieren fuente FX y lineage.
