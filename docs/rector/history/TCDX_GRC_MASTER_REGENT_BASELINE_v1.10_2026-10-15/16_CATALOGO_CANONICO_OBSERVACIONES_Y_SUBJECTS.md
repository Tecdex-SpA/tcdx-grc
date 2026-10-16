# 16 - Catálogo canónico de Subjects, Resources y Observations

## 1. Propósito

Definir el lenguaje universal con el que TCDX GRC representa aquello sobre lo que observa hechos y los hechos observados. Ningún conector, módulo o importador puede crear una semántica paralela.

## 2. Subject canónico

Un **Subject** es cualquier objeto real o lógico sobre el cual puede existir una observación, métrica, control, riesgo, evidencia o relación GRC.

Tipos iniciales cerrados y extensibles por catálogo versionado:

- organization
- organizational_unit
- process
- service
- asset
- system
- application
- data_asset
- identity
- group
- supplier
- contract
- location
- repository
- pipeline
- cloud_account
- cloud_resource
- project
- ticket
- document
- control
- requirement
- risk
- incident
- audit
- action

### Identidad

Cada Subject tenant-owned posee:

- `subject_id`: UUID interno inmutable;
- `tenant_id`;
- `subject_type`;
- `canonical_key`: business key estable dentro del tenant;
- `display_name`;
- `owner_subject_id` cuando aplica;
- `lifecycle_state`;
- `criticality` cuando aplica;
- `effective_from`, `effective_to`;
- `created_at`, `updated_at`;
- `metadata` estrictamente suplementaria, nunca sustituto de columnas canónicas.

Una identidad externa se registra separadamente mediante `ExternalIdentityBinding`:

`integration_id + external_object_type + external_object_id -> subject_id`

El mismo Subject puede tener múltiples bindings externos. Un binding no cambia la identidad canónica.

## 3. Resource

**Resource** es un Subject técnico que puede ser descubierto por una integración y que requiere lifecycle propio aunque todavía no esté promovido a un Asset/Process/Service de negocio.

El Resource permite onboarding progresivo sin inventar Asset automáticamente.

Estados:

`discovered -> mapped | ignored -> archived`

Un Resource sólo adquiere impacto GRC cuando está mapeado explícitamente a un Subject de negocio o cuando una regla publicada permite operar directamente sobre ese tipo de Resource.

## 4. Observation canónica

Una Observation es un hecho observado. Es append-only salvo supersession explícito.

Campos obligatorios:

- `observation_id` UUID;
- `tenant_id`;
- `observation_code` versionado;
- `observation_version`;
- `subject_id`;
- `source_type`: integration | manual | calculation | audit | survey | system;
- `source_id`;
- `raw_record_id` nullable cuando no existe fuente raw;
- `observed_at`;
- `period_start`, `period_end` cuando corresponda;
- `value_type`: boolean | integer | decimal | string | enum | duration | timestamp | json;
- `value` tipado;
- `unit` cuando aplica;
- `status`: valid | stale | invalid | superseded | retracted;
- `confidence`: 0..1;
- `quality_status`;
- `provenance`;
- `correlation_id`;
- `created_at`.

## 5. Catálogo normativo de observation_code

Este catálogo es un **registry contractual**, no una lista ilustrativa. Un código no listado aquí o en una extensión versionada aprobada NO puede producir hechos oficiales.

Formato obligatorio:

`<domain>.<object>.<fact>`

Códigos iniciales publicados:

- `identity.mfa.enabled`
- `identity.account.active`
- `identity.signin.risky`
- `repository.branch.protected`
- `repository.secret_scanning.enabled`
- `repository.dependency_alert.open`
- `pipeline.run.succeeded`
- `ticket.sla.breached`
- `ticket.status.open`
- `document.review.overdue`
- `document.owner.present`
- `cloud.storage.public`
- `cloud.resource.encrypted`
- `cloud.audit_logging.enabled`
- `backup.job.succeeded`
- `service.availability.percent`
- `incident.occurred`

Cada código publicado define: semántica, tipo de valor, unidad, subject types permitidos, freshness por defecto, dedup key, evidencia esperada y política de supersession.

## 6. Deduplificación

Una Observation nunca se deduplica por título o texto libre.

Clave mínima:

`tenant + source + external_event_id`

Si no existe event id:

`tenant + source + observation_code + subject + observed_at + deterministic_payload_hash`

Retries deben producir el mismo resultado lógico.

## 7. Hecho vs interpretación

Observation no contiene por sí misma:

- estado de cumplimiento;
- score de riesgo;
- efectividad de control;
- severidad GRC final;
- decisión de remediación.

Esos conceptos pertenecen a Metric/Rule/Domain Impact.

## 8. Conflictos de fuentes

Cuando dos fuentes afirman hechos incompatibles:

- no se sobrescribe una con otra;
- ambas observations se preservan;
- se aplica una `SourcePrecedencePolicy` versionada si existe;
- sin política, el derivado queda `conflicting_sources` y no se publica como oficial.

## 9. Gate

Ninguna integración puede implementarse si los Subjects y observation codes que producirá no están definidos en este catálogo o en una extensión versionada aprobada.

## 10. Gobierno del registry de observaciones

Cada `ObservationType` publicado debe registrar obligatoriamente: `observation_code`, versión, descripción semántica inequívoca, `value_type`, unidad, subject types permitidos, source types permitidos, freshness por defecto, dedup strategy, supersession policy, sensitivity classification y evidence semantics.

Estados del tipo: `draft -> approved -> published -> deprecated -> retired`. Sólo `published` puede ser emitido por producción. `deprecated` sigue siendo interpretable históricamente pero no debe usarse en nuevos mappings. `retired` nunca invalida observaciones históricas.

Cambiar `value_type`, unidad, significado, polaridad o subject semantics exige nueva versión incompatible y análisis de impacto; no se edita una versión publicada.

La precedencia entre fuentes NO se define en el ObservationType. Se resuelve mediante `SourcePrecedencePolicy` conforme al documento 35.
