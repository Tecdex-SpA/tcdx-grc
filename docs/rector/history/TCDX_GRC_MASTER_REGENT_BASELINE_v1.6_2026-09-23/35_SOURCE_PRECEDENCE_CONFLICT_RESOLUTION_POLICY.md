# 35 - Source Precedence y resolución de conflictos

## 1. Propósito

Definir cómo TCDX GRC resuelve múltiples observaciones válidas que pretenden describir el mismo hecho sin destruir provenance.

## 2. Regla

Nunca existe `last write wins` semántico entre fuentes. Todas las observaciones se preservan. La selección para cálculo se realiza mediante `SourcePrecedencePolicy` versionada.

## 3. Estrategias permitidas

- `authoritative_source`: una fuente publicada es autoritativa para un fact scope;
- `ordered_sources`: lista ordenada de fuentes compatibles;
- `most_recent_valid`: sólo entre fuentes declaradas equivalentes y dentro de freshness;
- `quorum_consensus`: exige coincidencia mínima definida;
- `manual_resolution`: conflicto bloquea resultado oficial hasta resolución humana;
- `aggregate_population`: múltiples fuentes forman intencionalmente una población; no son conflicto;
- `domain_specific_versioned`: algoritmo de resolución definido y versionado por metodología/dominio.

Los nombres anteriores `priority_order`, `consensus` y `aggregate` se consideran aliases documentales legacy y no se usan en nuevos contratos.

## 4. Clave y alcance de policy

`tenant/global scope + observation_code@version + subject_type + optional subject scope + effective interval`.

Toda policy publicada registra strategy, source set, conflict key, equivalence tolerance, temporal overlap rule, tie behavior y owner.

## 5. SourceResolution

Toda resolución utilizada por un cálculo oficial genera `SourceResolution` reproducible con:

- `source_resolution_id`;
- tenant/scope;
- SourcePrecedencePolicy ID/version;
- candidate Observation IDs;
- selected Observation IDs;
- rejected/non-selected Observation IDs;
- strategy;
- reason/rationale code;
- conflict/equivalence outcome;
- resolved_at/effective period;
- actor cuando la resolución es humana;
- lineage hacia CalculationRun/MetricMeasurement/Snapshot consumidores.

`SourceResolution` es entidad canónica de lineage. Puede omitirse sólo cuando existe exactamente un input fuente aplicable y no se ejecutó ninguna política de precedencia.

Si no existe policy aplicable y hay conflicto material, `result_status=conflicting_sources`; el resultado dependiente nunca se convierte en cero, PASS, `insufficient/conflict` ni otro status no canónico.

## 6. Gobierno

Cambiar precedencia no reescribe historia. Puede disparar recálculo explícito conforme a 23. Toda policy publicada es inmutable y auditable.
