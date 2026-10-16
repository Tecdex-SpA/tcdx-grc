# TCDX GRC — Canonical Data Model

## Entidades canónicas principales

El catálogo completo y vinculante se encuentra en `33_CATALOGO_ENTIDADES_CANONICAS.md`. Ningún documento especializado puede introducir silenciosamente una entidad contractual ausente de dicho catálogo.

Núcleo transversal mínimo:

- Platform/Identity: Tenant, Organization, UserIdentity, TenantMembership, Role, Permission, Capability, Entitlement.
- Organization: Subject, Resource, OrganizationalUnit, Process, Service, Asset, System, Application, DataAsset.
- Regulatory: RegulatoryPack/Version, RegulatorySource, RegulatoryImportManifest, RegulatoryCoverageManifest, FrameworkVersion, NormativeUnit, Requirement, RequirementApplicability, RequirementAssessment, StatementOfApplicability, StatementOfApplicabilityItem, FrameworkCrosswalk, NormativeUnitCrosswalkMapping, RequirementCrosswalkMapping, ControlCrosswalkMapping, RequirementControlMapping, NormativeUnitControlMapping.
- Controls: Control/Version, ControlAssessment, AssuranceTest.
- Evidence: Document/Version, Evidence/Version, EvidenceRequest, EvidenceReview, FileUploadIntent, FileObject.
- Risk: RiskMethodology, ImpactScaleDefinition, LikelihoodScaleDefinition, Risk, RiskAssessment, RiskTreatment, RiskAcceptance, RiskAppetitePolicy, RiskTolerancePolicy, KRI, LossEvent.
- Remediation: Issue, Action, ActionVerification.
- Third Parties: Supplier, SupplierService, SupplierContract, SupplierAssessment.
- Data/Results: Observation, SourcePrecedencePolicy, SourceResolution, MetricDefinition, MetricMeasurement, FormulaDefinition, CalculationRun, DataQualityAssessment, DataLineage, Snapshot, EffectiveConfiguration.
- Configuration: ConfigurationDefinition, ConfigurationOverride, EffectiveConfiguration.
- Privacy: DataSubjectRequest, ErasureExecutionRecord, RetentionPolicy y demás entidades del catálogo 33.
- Rules: RuleDefinition, RuleEvaluation, GRCImpact, AutomationPolicy.
- Integration: ConnectorDefinition, Integration, SyncRun, RawRecord, Checkpoint, ExternalIdentityBinding.
- Workflow registry: LifecycleTransitionDefinition.
- Reporting/Knowledge/AI: ReportDefinition, ReportRun, KnowledgeItem/Version, RegulatoryChange, AIRecommendation, Notification, AuditEvent.

`Result` y `DomainResult` son envelopes/conceptos de salida y no entidades canónicas independientes. No crear tabla genérica `results` salvo modificación contractual posterior.

## Reglas semánticas

Cada entidad define:
- canonical name;
- domain owner;
- identifier;
- tenant ownership;
- atributos requeridos/opcionales;
- relaciones/cardinalidad;
- invariantes;
- business keys;
- lifecycle;
- versionado;
- temporalidad;
- auditability;
- retención/deletion policy;
- clasificación;
- lineage.

## Estado de cálculo, resultado y conclusión

Se separan obligatoriamente:

- `calculation_status`: ejecución técnica;
- `result_status`: suficiencia/validez del resultado;
- `domain_conclusion`: conclusión propia del dominio.

El vocabulario vinculante está en 38. Ninguna escala de dominio puede reutilizarse como result_status.

## Unidades y escalas

No se consideran equivalentes implícitamente `severity`, `risk_level`, `level` u otros campos parecidos.

Toda escala conserva metadata y versión. 0–5, 1–5, 0–25 y 0–100 son contratos distintos.

## Temporalidad

Cada fuente define su semántica efectiva. La fecha de creación técnica no sustituye fecha efectiva, período, validity interval o snapshot date.

## Source of Truth

Una entidad canónica tiene una autoridad. Vistas, caches, snapshots, índices, embeddings y analytics son derivados, no segunda verdad.

## Data sufficiency

Los derivados declaran required inputs, optional inputs, cobertura mínima, freshness máxima, calidad aceptada, blockers y propagación de status. Falta/conflicto/error no se transforma en cero.

## Addendum - Semántica canónica extendida

El Canonical Data Model incluye contratos de origen, temporalidad, freshness, calidad, lineage, formula/version, rule/version, configuración efectiva, source resolution e impacto. Todo resultado oficial debe ser reproducible desde sus inputs canónicos y versiones exactas.

## Especializaciones contractuales

Subjects/Observations se detallan en 16; métricas y Data Trust en 17; rules/impact en 18; metodologías en 19; temporalidad en 23; evidencia/archivos en 24; configuración en 29; relaciones/cardinalidades en 30; entidades en 33; source precedence en 35; result status en 38; cierres semánticos en 39-40; baseline regulatorio en 41; planes/roles en 42; ejecución en 43; estructura normativa/Requirements/Controls en 44. Estas fuentes completan este modelo sin crear autoridades alternativas.

## Separación normativa obligatoria

`NormativeUnit`, `Requirement`, `Control` e `Issue` poseen identidades y responsabilidades distintas. NormativeUnit organiza la fuente; Requirement expresa una obligación atómica evaluable; Control describe el mecanismo; Issue registra la desviación. Se prohíbe una entidad o tabla que los colapse.

## Contrato canónico comercial de la sucesora propuesta

`CommercialFamily` es entidad `PLATFORM_CONTROL` con UUIDv7, código/significado publicados inmutables y retención `IMMUTABLE_RETAIN`. Cada RegulatoryPack raíz elegible nuevo tiene exactamente una clasificación de familia por relación soporte tipada y coherente con su `source_type`; una PlanVersion publicada relaciona explícitamente sus familias. La clasificación no publica ni licencia una edición normativa. Ningún derecho se infiere del nombre, `source_type` o familia.

`UsageLimit` pertenece a una PlanVersion y representa una dimensión total o una familia vinculada explícitamente. La cuota `regulatory_pack_count` total y una por familia cubren la vigencia contractual completa con valor finito, no negativo, constante e inmutable por PlanVersion; cero es explícito y ausencia requerida bloquea. Un cambio material de cuota, elegibilidad o familia exige una nueva PlanVersion publicada, sin editar las versiones ya contratadas.

`Subscription` y `SubscriptionRegulatoryPack` preservan identidad, tenant, intervalos, lineage de predecesor/sucesor y derechos históricos. `subscription.change_plan` conserva el término comercial programado y expiraciones originales, cierra el origen en un corte común y crea sucesores tipados en una transacción auditada. La regla por raíz R-P rige prospectivamente nuevas escrituras/expansiones y preserva solapamientos históricos legítimos sin adjudicar retrospectivamente una versión de regla. La incompatibilidad activa bloquea sólo la adopción afectada hasta decisión competente.
