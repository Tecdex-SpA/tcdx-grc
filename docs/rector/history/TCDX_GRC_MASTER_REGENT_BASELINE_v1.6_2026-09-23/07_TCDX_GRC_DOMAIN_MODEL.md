# TCDX GRC — Domain Model

## Bounded Contexts

- Identity & Access
- Tenant & Commercial Entitlements
- Organization
- Regulatory & Compliance
- Controls & Assurance
- Evidence & Documents
- Risk
- Issues & Remediation
- Audit
- Incidents & Loss
- Third Parties
- Resilience
- Privacy
- Surveys & Assessments
- Data & Metrics
- Rules & Impact
- Reporting
- Integrations
- Knowledge & Regulatory Intelligence
- AI Assistance
- Notifications
- Platform Audit & Observability

## Ownership

Cada concepto canónico tiene una única autoridad de escritura de negocio.

- Identity & Access posee identidades, memberships, roles y grants.
- Tenant & Commercial Entitlements posee suscripciones, planes, capabilities y entitlements.
- Organization posee estructura organizacional y objetos internos de negocio; `Subject` es un registro de identidad/referencia, no una segunda autoridad del objeto.
- Regulatory & Compliance posee Regulatory Packs, FrameworkVersion, NormativeUnit, Requirements, applicability, SoA y RequirementAssessment.
- Controls & Assurance posee Controls globales/TCDX/tenant, ControlVersion, ControlAssessment y AssuranceTest. El origen y ownership del control no se mezclan.
- Evidence & Documents posee Document/Evidence lifecycle y archivos gobernados.
- Risk posee Risk, RiskAssessment, RiskTreatment, appetite/tolerance, KRI y LossEvent.
- Issues & Remediation posee Issue y Action.
- Audit posee programa/engagement/workpapers/tests; findings se crean como Issue mediante command contractual.
- Third Parties posee Supplier, SupplierService, SupplierContract y SupplierAssessment. Organization sólo referencia Supplier mediante IDs/Subject y no mantiene una segunda autoridad de escritura.
- Data & Metrics posee Observation canónica, MetricDefinition/Measurement, CalculationRun, DataQuality, Lineage y Snapshot.
- Rules & Impact posee RuleDefinition/Evaluation, GRCImpact y AutomationPolicy.
- Integrations posee Connector/Integration, RawRecord, SyncRun, Checkpoint, external schema mapping y ExternalIdentityBinding. Produce commands para crear Observations; no mantiene una segunda Observation oficial.
- Reporting posee definiciones/runs/artifacts; consume snapshots oficiales.
- AI Assistance posee AIJob/Recommendation/provenance, no hechos GRC oficiales.

## Relaciones

Los contextos referencian conceptos de otros contextos mediante contratos/identificadores, sin crear copias divergentes.

Compliance puede relacionar Requirements con Controls mediante `RequirementControlMapping`, pero no redefine Control. `NormativeUnitControlMapping` conserva la ubicación editorial de controles de referencia sin afirmar implementación ni cumplimiento.

Risk relaciona Controls con Risks, pero no crea una segunda autoridad de controles.

Audit prueba objetos existentes y genera findings; no cambia silenciosamente su estado oficial.

IA produce Recommendation con provenance. La aceptación de una recomendación genera un comando explícito al dominio autorizado.

## Anti-patrones

- cross-context direct table writes;
- duplicate authorities;
- business rules en controllers;
- reglas de dominio únicamente en frontend;
- servicios omniscientes con autoridad transversal;
- tablas compartidas cuyo owner no puede determinarse.

## Addendum - Consumidores y autoridad sobre informacion

Los bounded contexts consumen conceptos canonicos y mantienen una unica autoridad de escritura por concepto. Integrations es responsable de la captura/normalizacion externa; Data & Metrics de mediciones oficiales; Rules/GRC Impact de la evaluacion contractual; cada dominio aplica impactos dentro de su autoridad. Ningun consumidor crea una segunda autoridad sobre el hecho fuente. Ver documentos 14 y 15.
