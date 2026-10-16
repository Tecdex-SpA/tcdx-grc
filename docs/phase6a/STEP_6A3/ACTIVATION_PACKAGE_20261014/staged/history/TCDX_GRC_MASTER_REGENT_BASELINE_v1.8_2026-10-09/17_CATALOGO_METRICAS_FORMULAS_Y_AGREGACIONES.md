# 17 - Catálogo de métricas, fórmulas y agregaciones

## 1. Regla general

Una métrica oficial es un contrato versionado, no un cálculo embebido en una pantalla.

Toda `MetricDefinition` contiene:

- metric_code y versión;
- nombre y propósito;
- owner de dominio;
- subject_type;
- tipo KPI/KRI/KCI/KQI/operational;
- required inputs y optional inputs;
- fórmula determinística;
- unidad y escala;
- dirección esperada;
- ventana temporal;
- aggregation method;
- minimum coverage;
- maximum freshness;
- quality threshold;
- thresholds versionados;
- comportamiento ante no-data/conflict/error;
- reglas de publicación;
- lineage requerido.

## 2. Estado de resultados

Toda medición usa exclusivamente `result_status` conforme a `38_RESULT_STATUS_AND_DATA_SUFFICIENCY_CONTRACT.md`:

`valid | no_data | insufficient_data | insufficient_coverage | stale_source | conflicting_sources | dependency_pending | invalid_input | source_error | calculation_error | not_applicable | superseded`.

El estado técnico de `CalculationRun` se registra separadamente mediante `calculation_status`. Las conclusiones de Compliance/Assurance/Risk se registran como `domain_conclusion`; no se mezclan con `result_status`.

Sólo `result_status=valid` posee `numeric_value` oficial publicable. Un preview puede conservar valor candidato con status no válido si la metodología lo permite. Cero es dato, no ausencia.

## 3. Métricas base del producto

### 3.1 Compliance Score

Por Requirement aplicable:

- compliant = 1.00
- partially_compliant = 0.50
- non_compliant = 0.00
- not_assessed/insufficient_evidence = sin score
- not_applicable = excluido

Peso por defecto = 1. El Regulatory Pack puede publicar pesos distintos.

`score = sum(weight * status_factor) / sum(weight of scored applicable requirements) * 100`

`coverage = scored applicable requirements / applicable requirements * 100`

Default `minimum_coverage = 80%`. Si coverage < minimum, `result_status=insufficient_coverage`; puede mostrarse preview claramente no oficial. Requirement `not_applicable` se excluye antes del denominador de coverage.

Sólo `Requirement` participa en el denominador. `NormativeUnit` no se puntúa como si fuera otro Requirement. La vista por cláusula/subcláusula agrega los Requirements descendientes conservando coverage, pesos, status y lineage; nunca duplica el score por niveles jerárquicos.

### 3.2 Control Design Effectiveness

Escala 0..100, determinada por assessment versionado con criterios publicados. Sin assessment válido: `insufficient_data`.

### 3.3 Control Operating Effectiveness

Escala 0..100, derivada de Assurance Tests, observaciones y evidencia según metodología publicada.

### 3.4 Overall Control Effectiveness

Default:

`min(design_effectiveness, operating_effectiveness)`

La dimensión más débil limita el control. No se permite promedio compensatorio por defecto. Minimum coverage baseline = 80%; bajo threshold el valor puede existir como preview, con `result_status=insufficient_coverage`.

### 3.5 Evidence Coverage

`requirements_or_controls_with_valid_required_evidence / requirements_or_controls_requiring_evidence * 100`

La evidencia expirada o rechazada no cuenta como válida.

### 3.6 Evidence Freshness

`valid_non_expired_evidence / currently_required_evidence * 100`

### 3.7 Action On-Time Closure Rate

`actions_closed_on_or_before_due_date / actions_closed_in_period * 100`

No mezcla acciones aún abiertas en el denominador.

### 3.8 Overdue Action Rate

`open_actions_past_due / open_actions * 100`

### 3.9 Data Trust

Data Trust es una `DataQualityAssessment` versionada y reproducible asociable a Observation, MetricMeasurement, CalculationInput, SourceResolution, Snapshot o dataset/scope definido. No constituye `MetricMeasurement` de negocio ni altera su valor.

Componentes default:

- completeness 35%
- freshness 25%
- validity 20%
- lineage/provenance 20%

Cada componente 0..100.

`trust = .35*C + .25*F + .20*V + .20*L`

Bands:

- >=90 TRUSTED
- 75..89.99 TRUSTED_WITH_WARNINGS
- 50..74.99 LOW_CONFIDENCE
- <50 INSUFFICIENT_TRUST

`DataQualityAssessment` conserva: definition/version, componentes, weights, inputs/lineage, evaluated_at, scope, `result_status`, trust_value nullable y band nullable. Si un componente requerido no puede calcularse, `result_status=insufficient_data` y no se redistribuyen pesos silenciosamente.

Data Trust nunca altera silenciosamente el valor de negocio; altera elegibilidad, confianza y presentación según la metodología consumidora.

## 4. Riesgo

Las métricas de riesgo se rigen por el documento 19 y el cierre 39. No reutilizar Compliance Score ni severity como risk score.

## 5. Readiness

No existe un `GRC Health` universal mágico.

Readiness es framework/objetivo específico y versionado. Default de certificación/readiness de un framework requiere simultáneamente:

- Compliance Score válido con coverage suficiente;
- Evidence Coverage >= threshold del pack;
- cero issues críticos vencidos definidos como blockers;
- cero acciones críticas vencidas definidas como blockers.

La UI debe mostrar dimensiones y blockers; no fabricar un único número si la metodología del pack no lo define.

## 6. Agregaciones

Agregaciones permitidas: sum, count, distinct_count, avg, weighted_avg, min, max, ratio, percentile, latest_valid, time_weighted.

Toda agregación declara:

- población;
- filtros;
- tratamiento de null;
- tratamiento de outliers;
- timezone;
- período;
- required/blocking inputs;
- propagación de result_status conforme a 38;
- redondeo sólo en presentation boundary.

## 7. Monedas

No se agregan importes en monedas distintas. Conversión requiere FX source oficial, effective_at y lineage. Sin FX válido se aplica el `result_status` correspondiente (`source_error`, `stale_source`, `conflicting_sources` o `insufficient_data`), nunca cero ni un status no canónico.

## 8. Snapshots

Un resultado publicado genera Snapshot inmutable con MetricDefinition/Formula/Methodology version, SourceResolution cuando aplique, EffectiveConfiguration, source lineage, CalculationRun, inputs hash y timestamp efectivo.

Recalcular no modifica el snapshot histórico; genera uno nuevo.
