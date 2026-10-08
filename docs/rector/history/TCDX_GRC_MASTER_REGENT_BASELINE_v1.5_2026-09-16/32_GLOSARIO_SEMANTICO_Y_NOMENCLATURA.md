# 32 - Glosario semántico y nomenclatura canónica

## Regla

Los siguientes términos poseen significado único. No se permiten sinónimos técnicos ambiguos en schema/API.

- **NormativeUnit**: unidad estructural versionada de una fuente normativa; puede ser capítulo, cláusula, subcláusula, anexo, artículo, párrafo, numeral u otra unidad. No es un Requirement ni recibe assessment tenant.
- **Clause / Cláusula**: etiqueta de presentación para una NormativeUnit cuyo `unit_type=clause|subclause`; no es entidad canónica independiente.
- **Requirement**: obligación atómica evaluable perteneciente a una NormativeUnit. Applicability y compliance assessment operan sobre esta entidad.
- **Control**: mecanismo de gobierno u operación; puede ser referencia global, baseline TCDX, instancia tenant o definición tenant. No es cláusula, Requirement, tarea ni resultado.
- **RequirementControlMapping**: relación versionada de contribución entre Requirement y Control.
- **NormativeUnitControlMapping**: relación editorial/provenance entre NormativeUnit y ControlVersion de referencia; no acredita cumplimiento.
- **Gap**: tipo de Issue derivado de una evaluación; nunca sinónimo de Requirement.
- **StatementOfApplicabilityItem**: línea tenant-owned de una SoA que decide y justifica la aplicabilidad/implementación de un ControlVersion de referencia; no es RequirementApplicability.

- **Subject**: identidad canónica de un objeto sobre el que puede existir información GRC.
- **Resource**: Subject técnico descubierto, aún no necesariamente promovido/mapeado a un objeto de negocio.
- **RawRecord**: payload fuente preservado, no interpretado como hecho GRC.
- **Observation**: hecho canónico observado y trazable. No significa hallazgo de auditoría.
- **Audit Observation**: tipo de `Issue`, nunca `Observation` canónica.
- **SourcePrecedencePolicy**: contrato versionado que determina cómo resolver observaciones múltiples para un mismo hecho/scope.
- **SourceResolution**: registro reproducible de candidatos, seleccionados/no seleccionados, policy/version y razón utilizada por un cálculo.
- **MetricDefinition**: contrato de qué se mide.
- **MetricMeasurement**: resultado de una métrica para un Subject/período.
- **CalculationRun**: ejecución reproducible que produce measurements/derived results.
- **calculation_status**: estado técnico de una ejecución; no describe validez del resultado.
- **result_status**: estado canónico de suficiencia/validez de un resultado conforme a 38; no es lifecycle ni conclusión de dominio.
- **domain_conclusion**: conclusión propia de Compliance, Assurance, Risk u otro dominio; no reemplaza result_status.
- **Result Envelope**: representación transversal de salida compuesta por la entidad concreta, value/status/conclusion, versiones y lineage. No es entidad ni tabla genérica `Result`.
- **RuleDefinition**: criterio evaluable versionado.
- **RuleEvaluation**: resultado de una regla bajo su contrato; conserva result_status y conclusión/decision propias cuando aplique.
- **GRCImpact**: relación derivada entre RuleEvaluation y objetos de dominio.
- **Issue**: desviación gobernada que requiere triage/remediación. `kind`: finding, non_conformity, gap, exception, audit_observation u otro catálogo publicado.
- **Action**: trabajo de remediación. `completed` significa ejecutado; `verified` significa verificado independientemente.
- **Document**: contenido gestionado/versionado.
- **Evidence**: objeto probatorio gobernado que sustenta un claim/control/requirement/test.
- **Assessment**: evaluación humana o calculada de un objeto bajo una metodología.
- **Lifecycle state**: etapa de workflow. No representa severidad, resultado ni score.
- **Severity**: magnitud de una desviación/evento según escala propia.
- **Priority**: urgencia de atención/remediación.
- **Risk level**: banda derivada de una metodología de riesgo.
- **ImpactScaleDefinition**: escala/version contractual de impacto usada por RiskMethodology.
- **LikelihoodScaleDefinition**: escala/version contractual de likelihood usada por RiskMethodology.
- **RiskAppetitePolicy**: policy versionada que define `appetite_max` para un scope/metodología.
- **RiskTolerancePolicy**: policy versionada que define `tolerance_max` y opcional `max_duration` para un scope/metodología.
- **Compliance result**: resultado de RequirementAssessment; no es lifecycle.
- **Data Trust**: confianza/calidad de datos representada mediante `DataQualityAssessment`; no altera silenciosamente el valor medido.
- **DataQualityAssessment**: evaluación versionada/reproducible de completeness, freshness, validity y lineage para un scope.
- **ConfigurationDefinition**: contrato versionado de un parámetro y sus scopes/overrides permitidos.
- **ConfigurationOverride**: valor override versionado/effective autorizado por una ConfigurationDefinition.
- **EffectiveConfiguration**: resolución reproducible de las capas de configuración para scope/fecha concretos.
- **ErasureExecutionRecord**: registro auditable de una ejecución de privacy erasure/anonimización, sin reintroducir datos eliminados.
- **Snapshot**: publicación inmutable de resultados a un instante lógico.
- **Mapping**: relación versionada entre conceptos; siempre se califica por tipo (`SubjectBinding`, `RequirementControlMapping`, `GRCImpactMapping`, etc.).
- **ConnectorDefinition**: definición global/versionada de un conector.
- **Integration**: instancia configurada por tenant de un ConnectorDefinition.
- **Capability/Entitlement**: habilitación comercial del producto.
- **Permission**: derecho funcional RBAC.
- **Scope**: subconjunto de objetos sobre los que una Permission es válida.

## Términos prohibidos sin calificador

Evitar en contratos persistentes: `status`, `level`, `score`, `observation`, `mapping`, `owner`, `type` sin dominio/calificador cuando exista riesgo de ambigüedad. Usar nombres como `lifecycle_state`, `risk_level`, `data_trust_score`, `audit_observation`, `subject_binding`, `business_owner_user_id`.

Evitar también `clause_requirement`, `requirement_gap`, `control_task` o cualquier nombre que colapse NormativeUnit, Requirement, Issue, Action o Control.

`RiskAppetite`, `RiskTolerance`, `DomainResult` y tabla genérica `Result/results` no son nombres canónicos nuevos. Sus equivalentes válidos están definidos arriba y en 33/40.
