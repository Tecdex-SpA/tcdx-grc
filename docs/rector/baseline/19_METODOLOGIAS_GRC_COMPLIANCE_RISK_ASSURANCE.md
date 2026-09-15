# 19 - Metodologías GRC oficiales iniciales

## 1. Principio

Las metodologías son objetos versionados. Un tenant puede seleccionar una metodología compatible; una versión publicada no se modifica retroactivamente.

## 2. Compliance

Conclusiones de RequirementAssessment (`domain_conclusion`):

`not_assessed | compliant | partially_compliant | non_compliant | not_applicable | insufficient_evidence`

Reglas:

- applicability se decide antes de scoring;
- `not_applicable` requiere justificación y aprobación según RBAC;
- `insufficient_evidence` no se transforma en non_compliant automáticamente;
- score y coverage son dimensiones separadas;
- una declaración manual puede iniciar assessment, pero evidencia/assurance gobierna su confianza.

Fórmula default: documento 17. La validez/suficiencia del score usa `result_status` de 38.

## 3. Assurance de controles

Dimensiones:

- design effectiveness;
- operating effectiveness;
- evidence sufficiency;
- test recency;
- assurance conclusion.

Conclusiones (`domain_conclusion`):

`effective | partially_effective | ineffective | not_tested | insufficient_evidence`

Overall effectiveness default: min(design, operating). Minimum coverage baseline 80%; bajo threshold, `result_status=insufficient_coverage` y no se publica efectividad oficial.

## 4. Riesgo cualitativo default 5x5

La versión publicada de `RiskMethodology` referencia explícitamente una `LikelihoodScaleDefinition` y una `ImpactScaleDefinition`, cada una con versión propia. Las definiciones no se embeben como texto mutable dentro de RiskAssessment.

### Likelihood

1 Rare
2 Unlikely
3 Possible
4 Likely
5 Almost certain

Los criterios cuantitativos/horizonte base están en 39. Otra escala u horizonte requiere nueva metodología/versión compatible.

### Impact

1 Insignificant
2 Minor
3 Moderate
4 Major
5 Severe

Impact puede componerse de dimensiones financieras, operacionales, regulatorias, reputacionales, seguridad/personas y privacidad. Por defecto se usa el máximo de dimensiones aplicables para evitar compensación de un impacto crítico. Los criterios base están en 39.

### Inherent Risk

`inherent_score = likelihood * impact`

Rango contractual: `1..25`.

Bands default:

- 1..4 Low
- 5..9 Moderate
- 10..16 High
- 17..25 Critical

### Control Effectiveness Aggregate

Para controles aplicables se calcula weighted average 0..1; sin pesos explícitos, pesos iguales. Un control no evaluado no se trata como 0.

`control_assessment_coverage = peso_evaluado / peso_aplicable`

Default mínimo 80%. Bajo ese umbral, residual queda `result_status=insufficient_coverage`.

### Residual Risk

`residual_score = inherent_score * (1 - control_effectiveness_aggregate)`

Rango contractual: `0..25` continuo.

`0` significa mitigación modelada completa bajo la metodología y evidencia/coverage válidas; no significa ausencia de riesgo ni ausencia de datos.

Banding residual:

- `0 <= score < 5`: Low
- `5 <= score < 10`: Moderate
- `10 <= score < 17`: High
- `17 <= score <= 25`: Critical

Se conserva inherent_score por separado. Si no existe control assessment suficiente, no se asume residual=inherent: se aplica `insufficient_data` o `insufficient_coverage` según causa.

## 5. Appetite y tolerance

Las entidades canónicas son `RiskAppetitePolicy` y `RiskTolerancePolicy`.

- `RiskAppetitePolicy.appetite_max`: máximo objetivo aceptable en la misma escala de la RiskMethodology.
- `RiskTolerancePolicy.tolerance_max`: límite superior temporal permitido en la misma escala, siempre `tolerance_max >= appetite_max`.
- `RiskTolerancePolicy.max_duration`: duración máxima permitida dentro de la zona tolerada, cuando aplique.
- `RiskTolerancePolicy.escalation_rule`: referencia versionada a regla/workflow de escalamiento.

Evaluación contra residual:

- residual <= appetite_max: `domain_conclusion=within_appetite`;
- appetite_max < residual <= tolerance_max y duración dentro de max_duration: `tolerated_breach`;
- residual > tolerance_max o breach tolerado excede max_duration: `tolerance_breach`.

Aceptar un riesgo es workflow humano separado (`RiskAcceptance`) con owner, rationale, expiry y review date; no modifica el score ni las policies.

## 6. Riesgo cuantitativo

No se mezcla con 5x5. Si se habilita, usa metodología separada con distribución/expected loss/VaR u otra, versión, moneda y supuestos explícitos.

## 7. KRI

KRI no es risk score. Cada KRI tiene target/threshold y relación explícita a Risk.

## 8. Auditoría

Finding severity no modifica automáticamente Risk severity. Puede proponer reassessment mediante GRC Impact.

## 9. Prohibiciones

- promediar escalas incompatibles;
- convertir null/no_data en cero;
- inferir risk score desde compliance percent;
- inferir compliance desde control existence;
- considerar evidencia cargada como evidencia aprobada;
- reutilizar `domain_conclusion` como `result_status`;
- alterar una escala publicada sin nueva versión.
