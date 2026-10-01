# 18 - Contrato del Rules Engine y GRC Impact

## 1. Propósito

Separar hechos, mediciones, reglas y consecuencias. Una regla no escribe arbitrariamente en varios dominios.

## 2. RuleDefinition

Toda regla publicada posee:

- rule_code y version;
- owner;
- scope y subject_type;
- inputs permitidos;
- expresión/operador determinístico;
- thresholds;
- data eligibility;
- output enum;
- severity mapping;
- impact mappings;
- automation policy;
- effective_from/to;
- approval status.

Outputs base:

`pass | fail | warning | unknown | not_applicable`

`unknown` no equivale a fail.

## 3. Impact Mapping

Una regla no contiene IDs tenant hardcoded. Usa mappings gobernados:

`Rule -> Mapping -> Requirement/Control/Risk/IssuePolicy`

Mapping puede ser global de pack o tenant-specific, siempre versionado y auditable.

## 4. Consecuencias permitidas

Clasificación:

### Informativas automáticas
- alert/notification;
- dashboard indicator;
- observation-derived annotation.

### Propuestas automáticas que requieren decisión humana
- proposed Issue;
- proposed Action;
- proposed Risk update;
- proposed Compliance reassessment.

### Automatizaciones autorizables
Sólo políticas explícitamente publicadas pueden crear Issue/Action automáticamente. Deben ser idempotentes, reversibles por workflow y auditadas.

### Prohibido automáticamente
- aprobar evidencia;
- verificar acción;
- aceptar riesgo;
- cerrar finding de auditoría;
- declarar compliance final;
- cambiar metodología.

## 5. ImpactGraph

Toda consecuencia crea relaciones transitables:

`Observation -> MetricMeasurement -> RuleEvaluation -> GRCImpact -> DomainObject`

El grafo es proyección sobre IDs canónicos, no segundo system of record.

## 6. Re-evaluación

Cambio de dato, mapping, regla o fórmula crea nueva evaluación. No reescribe la evaluación histórica.

## 7. Loops

Se prohíben loops autoalimentados. Un objeto derivado no puede volver a ser input de la misma regla salvo contrato explícito con `generation` y límite.

## 8. Prioridad

Priority es distinta de severity y risk. Default para Issue/Action:

- critical: safety/legal/blocking severe exposure;
- high;
- medium;
- low.

La política exacta se versiona. No se deriva por nombres similares de campos.
