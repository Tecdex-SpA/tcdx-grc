# 39 - Decisiones semánticas finales pre-modelo físico

## 1. Autoridad y objetivo

Este documento cierra decisiones semánticas necesarias para derivar el modelo PostgreSQL sin inventar comportamiento. Se interpreta junto a 33 (catálogo de entidades), 38 (status), 35 (source precedence), 29 (configuración), 19 (metodologías) y 23 (temporalidad/retención).

Ante contradicción, aplica la política de precedencia contractual del README y el cierre integrador 40. Ningún ejemplo puede redefinir un contrato canónico.

## 2. Control Effectiveness

Control Design Effectiveness y Control Operating Effectiveness usan escala 0..100 y assessment versionado. Overall default = `min(design, operating)`; no existe promedio compensatorio por defecto.

Minimum coverage baseline = 80%. Un control no evaluado no se trata como 0. Bajo threshold, el valor candidato puede existir como preview y `result_status=insufficient_coverage`.

Conclusión Assurance (`domain_conclusion`): `effective | partially_effective | ineffective | not_tested | insufficient_evidence`. No se reutiliza como result_status.

## 3. Impact 1..5

Cada `RiskMethodology` publicada referencia una `ImpactScaleDefinition` versionada. Baseline:

| Nivel | Financiero | Operacional | Regulatorio | Reputacional | Personas | Privacidad |
|---|---|---|---|---|---|---|
| 1 | impacto mínimo | interrupción mínima | incumplimiento menor sin sanción material | impacto limitado | sin lesión | afectación menor |
| 2 | impacto bajo | degradación acotada | observación/remediación menor | impacto local/reversible | lesión menor | afectación limitada |
| 3 | impacto material | interrupción significativa | incumplimiento material/sanción posible | daño relevante | lesión con atención | brecha material |
| 4 | pérdida alta | interrupción severa | sanción importante/acción formal | daño significativo | lesión grave o riesgo serio | brecha grave/múltiples titulares/alto impacto |
| 5 | pérdida extrema/amenaza a continuidad | interrupción catastrófica o prolongada crítica | sanción/acción legal extrema o pérdida de licencia | daño reputacional severo sostenido | fatalidad o peligro crítico | afectación masiva/crítica o consecuencias severas |

Los umbrales monetarios y temporales concretos son parámetros versionados por tenant/categoría y moneda; nunca hardcode. Impact total default = máximo de dimensiones aplicables. Una dimensión sin datos no se transforma en 0; aplica el result_status correspondiente.

## 4. Likelihood 1..5

Cada `RiskMethodology` publicada referencia una `LikelihoodScaleDefinition` versionada. Baseline usa probabilidad en horizonte de 12 meses o frecuencia equivalente, declarando siempre horizonte:

1 Rare: <5% anual o menos de 1 evento/20 años.
2 Unlikely: >=5% y <20% anual o aprox. 1/5..20 años.
3 Possible: >=20% y <50% anual o aprox. 1/2..5 años.
4 Likely: >=50% y <80% anual o aprox. 1..2 eventos/año.
5 Almost certain: >=80% anual o múltiples eventos/año.

Cuando probabilidad y frecuencia estén disponibles y discrepen, la metodología declara la medida primaria; baseline usa la estimación más conservadora respaldada por evidencia y registra rationale. Otro horizonte requiere nueva versión/metodología, no reinterpretación silenciosa.

## 5. Inherent y Residual Risk

`inherent_score = likelihood * impact`, rango `1..25`.

Bands inherent: 1..4 Low; 5..9 Moderate; 10..16 High; 17..25 Critical.

`residual_score = inherent_score * (1 - control_effectiveness_aggregate)`, rango continuo `0..25`.

`0` es un resultado real posible bajo controles modelados 100% efectivos con coverage/evidencia válida; no significa no-data. Bands residual: `0..<5 Low`, `5..<10 Moderate`, `10..<17 High`, `17..25 Critical`.

## 6. Risk Appetite y Tolerance

`RiskAppetitePolicy` y `RiskTolerancePolicy` son las únicas entidades canónicas para estos conceptos.

`RiskAppetitePolicy` es versionada y scoped por tenant + risk category + optional organizational unit/service/subject group + methodology + effective interval. Expresa `appetite_max` en la escala de la metodología.

`RiskTolerancePolicy` expresa `tolerance_max` en la misma escala, con `tolerance_max >= appetite_max`, y puede incluir `max_duration` y escalation rule. Por tanto tolerance posee dos dimensiones compatibles: límite de score temporal y, opcionalmente, duración máxima del breach tolerado.

Resolución: object-specific > service/process/org-unit > category > tenant default. Entre policies del mismo nivel gana la más específica; empate incompatible = `conflicting_policy` y bloquea evaluación hasta resolución autorizada.

Conclusión de dominio:

- residual <= appetite_max: `within_appetite`;
- appetite_max < residual <= tolerance_max y no excede max_duration: `tolerated_breach`;
- residual > tolerance_max o duración excedida: `tolerance_breach`.

RiskAcceptance es decisión humana separada, con owner, rationale, expiry y review date; no modifica score/policies.

## 7. Compliance partial y coverage

Baseline oficial: `partially_compliant = 0.50`. Un Regulatory Pack/metodología puede definir otro factor versionado antes del cálculo.

Baseline `minimum_coverage = 80%` para publicar Compliance Score y Control Effectiveness. Bajo mínimo: preview opcional, `result_status=insufficient_coverage`, nunca resultado oficial válido.

## 8. Data Trust

Data Trust se materializa lógicamente como `DataQualityAssessment`, no como MetricMeasurement de negocio independiente.

Cada componente 0..100:

- Completeness C = `required_fields_present / required_fields_expected * 100`, ponderable cuando la definición lo declare.
- Freshness F: 100 si age <= freshness_target; 0 si age >= freshness_max; entre ambos decae linealmente. Si target=max, F es 100 hasta max y 0 después.
- Validity V = `valid_checks_passed_weight / applicable_validation_weight * 100`. Check no ejecutable por dependencia produce insufficiency, no pass.
- Lineage L = porcentaje ponderado de requisitos de provenance satisfechos: source identity, source record/raw reference, subject binding, observed/effective timestamp, transformation/version y calculation lineage cuando aplique.

`Trust = .35*C + .25*F + .20*V + .20*L`.

Si un componente requerido no puede calcularse, DataQualityAssessment queda `result_status=insufficient_data`, trust_value/band no oficiales y no se redistribuyen pesos. Cada assessment conserva definition/version, scope, components, weights, inputs, evaluated_at y lineage.

## 9. Source precedence por mapping

Todo mapping `implementation_ready` declara `source_precedence_policy_id`, conflict key, equivalence tolerance, temporal overlap rule y strategy conforme a 35. No existe last-write-wins.

Cuando se evalúa más de una observation candidata o una policy de precedencia interviene, se genera `SourceResolution` reproducible. Conflictos preservan todas las observaciones y el cálculo registra elegidas/no elegidas y razón.

## 10. Subject identity

`Subject` posee identidad canónica estable. `ExternalIdentityBinding` identifica provider + external_namespace/account + external_object_type + external_id + validity interval. Esa business key no puede apuntar simultáneamente a dos Subjects activos.

Aliases no crean Subjects nuevos. Merge crea supersession hacia Subject superviviente, preserva IDs históricos y lineage; no reescribe eventos históricos. Split crea nuevos Subjects/bindings efectivos desde fecha explícita; historia previa permanece vinculada al Subject original salvo corrección auditada. Deleted-in-source marca binding/resource `retired`, no borra Subject ni observaciones. Reutilización posterior del mismo external_id requiere nueva binding generation/validity.

## 11. Erasure/anonimización versus auditabilidad

Privacy erasure no implica borrado destructivo indiscriminado. Cada dato se clasifica como erasable, anonymizable/pseudonymizable, retention_required o legal_hold.

Toda ejecución genera `ErasureExecutionRecord` canónico con request/legal basis, scope, policy/version, objetos afectados, acción aplicada por objeto/clase, exclusiones/retención/legal hold, resultado, actor/job, timestamps y AuditEvent references. El registro nunca reintroduce el dato personal eliminado.

AuditEvent, evidencia, snapshots o registros sujetos a obligación de conservación permanecen inmutables durante retención, minimizando payload personal innecesario. Legal hold prevalece sobre purge hasta liberación.

## 12. Timezone contractual

Todo instante persistido se normaliza a UTC (`timestamptz`). Todo tenant posee `default_timezone` IANA válido. Períodos de negocio, due dates, SLA, ventanas y agregaciones se interpretan en timezone declarado por la definición; fallback al timezone tenant. DST usa reglas IANA de la fecha efectiva. Fechas sin hora usan `date`.

## 13. Identificadores y business keys

PK canónica para nuevas entidades: UUIDv7 generado por plataforma, opaco y no derivado de negocio. IDs externos viven en bindings/raw records. Business keys tenant-owned son tenant-scoped; global registries declaran global uniqueness. IDs no se reutilizan. Versiones publicadas tienen ID propio.

## 14. Tenant ownership

Antes de DDL toda entidad se clasifica:

- GLOBAL_REFERENCE;
- PLATFORM_CONTROL;
- TENANT_OWNED;
- TENANT_DERIVED.

Relaciones TENANT_* exigen tenant coincidente. No hay FK tenant-owned a otro tenant. Excepciones cross-tenant sólo mediante objeto PLATFORM_CONTROL explícito.

`Tenant` es frontera de ownership y aislamiento; `Organization`/`Subject` son alcance funcional. Una entidad scoped a Subject conserva `tenant_id`. `organization_id` sólo existe donde su semántica lo exige y nunca se replica como columna universal. Para `RequirementApplicability`, `scope_subject_id=NULL` significa tenant-wide y un valor no NULL debe referenciar Subject del mismo tenant.

`SourceResolution`, `DataQualityAssessment`, MetricMeasurement, Snapshot y EffectiveConfiguration que deriven de datos tenant son TENANT_DERIVED. Policies/definitions globales o tenant se clasifican según su autoridad concreta.

## 15. Configuración efectiva

Entidades canónicas: `ConfigurationDefinition`, `ConfigurationOverride`, `EffectiveConfiguration`.

Precedencia: `Platform Default → Methodology/Regulatory Pack Definition → Tenant Policy/Override → Scoped Object Override`.

Un nivel sólo sobrescribe fields autorizados (`tenant_overridable`/`object_overridable`). Conflicto de igual especificidad produce `configuration_conflict`; nunca selección por orden de lectura.

`EffectiveConfiguration` es resultado derivado reproducible. Puede resolverse on-demand/cachearse para lectura interactiva, pero si afecta CalculationRun, RuleEvaluation, RiskAssessment o Snapshot oficial debe persistirse o quedar referenciada inmutablemente con IDs/versiones y values efectivos utilizados. No se permite blob ad-hoc no auditable.

Feature flags, entitlements, RBAC y configuración metodológica no se mezclan.

## 16. Result contract y propagación de status

No existe entidad genérica `Result` ni `DomainResult`. `Result` es envelope transversal de salida compuesto por la entidad concreta (por ejemplo MetricMeasurement, RiskAssessment, RequirementAssessment o RuleEvaluation), `result_status`, optional `domain_conclusion`, versions, coverage/freshness/Data Trust y lineage.

El vocabulario y propagación baseline son exclusivamente los de 38. Los estados `calculated`, `stale_data`, `insufficient/conflict` u otros aliases no son canónicos para nuevas implementaciones.

## 17. Delete, archive, invalidate y supersede

No existe DELETE CRUD genérico. Cada entity type declara `deletion_policy`:

- EPHEMERAL_PURGE;
- ARCHIVE_ONLY;
- SUPERSEDE_VERSION;
- INVALIDATE;
- IMMUTABLE_RETAIN;
- PRIVACY_ERASURE_CONTROLLED.

Las FKs no usan cascade delete sobre historia, evidence, measurements, impacts, snapshots, SourceResolution, ErasureExecutionRecord o audit. Archive != delete; invalidación != supersession.

## 18. Gate resultante

Estas decisiones son obligatorias para el diseño físico. El modelo PostgreSQL debe demostrar para cada entidad: ownership class, UUID/business key, tenant constraint, lifecycle, temporal semantics, versioning, permission boundary, retention/deletion policy y lineage.

El PASS final depende además del scan/reconciliación de `40_CIERRE_INTEGRIDAD_SEMANTICA_Y_CONTRATOS_FISICOS.md` y `44_CONTRATO_ESTRUCTURA_NORMATIVA_REQUISITOS_CONTROLES.md`.
