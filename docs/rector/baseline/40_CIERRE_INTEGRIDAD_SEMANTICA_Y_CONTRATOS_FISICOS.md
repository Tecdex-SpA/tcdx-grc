# 40 - Cierre de integridad semántica y contrato para derivación física

## 1. Propósito

Cerrar explícitamente las inconsistencias detectadas antes del diseño PostgreSQL y establecer una sola interpretación autorizada para términos que aparecían con vocabularios o entidades divergentes.

Este documento no agrega funcionalidades de producto. Reconciliación únicamente.

## 2. Precedencia documental definitiva

Cuando dos documentos parecen incompatibles, se resuelve en este orden:

La precedencia única vigente es la declarada en 00. Este documento conserva autoridad sobre sus reconciliaciones semánticas, pero no sobre planes, roles, contenido regulatorio, stack, secuencia o estructura normativa, que se rigen por 41–44.

Esta precedencia sólo resuelve interpretación. Si una fuente superior contradice definición de producto de manera material, el gate vuelve a BLOCKED y debe reconciliarse el producto; no se ignora silenciosamente.

## 3. Decisiones reconciliadas

### 3.1 Status y conclusiones

- `CalculationRun` usa `calculation_status` técnico.
- resultados usan exclusivamente `result_status` de 38.
- conclusiones de dominio usan `domain_conclusion`.
- aliases previos `calculated`, `stale_data`, `insufficient/conflict`, `not_calculable/conflicting` no autorizan nuevos enums.
- `not_calculated` es estado de proyección cuando no existe resultado; no se persiste como resultado exitoso.

### 3.2 Result / DomainResult

No existen como entidades/tablas genéricas. Son envelopes de salida. SnapshotItem referencia la entidad canónica concreta. Queda prohibida tabla genérica `results` sin nuevo contrato.

### 3.3 Risk Appetite/Tolerance

Los nombres canónicos son `RiskAppetitePolicy` y `RiskTolerancePolicy`. `RiskTolerancePolicy` contiene `tolerance_max` en la escala de riesgo y opcional `max_duration`; por tanto la regla `tolerance_max >= appetite_max` es matemáticamente comparable.

### 3.4 Impact/Likelihood

`RiskMethodology` referencia versiones explícitas de `ImpactScaleDefinition` y `LikelihoodScaleDefinition`. Cambiar definición/threshold/horizonte incompatible exige nueva versión.

### 3.5 Residual Risk

Inherent: 1..25. Residual: 0..25. Residual 0 es valor válido modelado, nunca no-data. Bands residuales incluyen 0 explícitamente.

### 3.6 SourceResolution

Es entidad canónica de lineage. Todo cálculo oficial que haya ejecutado una policy de precedencia debe poder referenciar la resolución utilizada.

### 3.7 EffectiveConfiguration

Es entidad lógica derivada y reproducible. Puede calcularse/cachearse para interacción, pero debe quedar persistida o inmutablemente referenciada cuando participa en un resultado oficial.

### 3.8 ErasureExecutionRecord

Es entidad canónica Privacy/Audit y registra ejecución de erasure sin reintroducir datos eliminados.

### 3.9 Data Trust

Se implementa como `DataQualityAssessment` versionado/reproducible. No es un score GRC universal ni un MetricMeasurement de negocio que modifique valores silenciosamente.

### 3.10 Propagación de insuficiencia

38 define baseline determinístico. Cada metodología declara blockers/required inputs; ningún agregado oculta conflictos, source errors, invalid inputs, coverage o freshness relevantes.

### 3.11 Catálogo de entidades

33 debe contener cualquier término contractual que requiera identidad/version/lineage. El diseñador físico no puede crear entidades por interpretación propia.

### 3.12 Configuración

ConfigurationDefinition/Override/EffectiveConfiguration separan definición, override y resolución. JSONB no sustituye constraints/lineage de parámetros críticos.

### 3.13 Scope tenant/Organization/Subject

Tenant es frontera de ownership/aislamiento. Organization y Subject expresan alcance. Las entidades scoped mantienen `tenant_id`; no se introduce `organization_id` universal. RequirementApplicability usa scope tenant-wide o `scope_subject_id` del mismo tenant.

### 3.14 EvidenceLink y EvidenceRequest

EvidenceLink distingue Control tenant de ControlVersion y sólo admite Requirement, Control, ControlVersion, RequirementAssessment, ControlAssessment o AssuranceTest con integridad verificable. EvidenceRequest admite exactamente Requirement, Control, RequirementAssessment, ControlAssessment o AssuranceTest. Quedan prohibidos pares polimórficos débiles `(type,id)`.

### 3.15 IssueOrigin

IssueOrigin sólo admite RequirementAssessment, ControlAssessment, AssuranceTest, AuditTest, Risk, Incident o SupplierAssessment mediante FKs tipadas/constraint equivalente. No existe `source object` libre.

### 3.16 Contexto tenant/global de eventos

Event/Audit context usa `ownership_class`. `tenant_id` es obligatorio sólo para TENANT_OWNED/TENANT_DERIVED y NULL/no aplicable para GLOBAL_REFERENCE/PLATFORM_CONTROL. Se prohíbe crear un tenant técnico o `SYSTEM_TENANT_ID`.

## 4. Reglas de derivación del modelo físico

El diseñador PostgreSQL sólo puede derivar de forma trazable decisiones ya fijadas. Normalización, tablas puente, índices, particionado, materialized views, caches y cualquier otra elección física deben constar en el entregable de Fase 1 con requisito origen, rationale verificable y aprobación del Data Model Owner y Architecture Owner. Si existen dos o más representaciones contractualmente válidas, Codex no elige: registra la decisión requerida y devuelve `RECTOR_GATE=BLOCKED` para esa parte.

Ni el diseñador ni Codex pueden decidir por sí mismos:

- nuevos nombres/entidades de dominio;
- nuevos enums semánticos;
- ownership tenant;
- policy precedence;
- status/conclusion semantics;
- escalas/fórmulas;
- retención/deletion semantics;
- source conflict strategy;
- configuration precedence;
- identidad histórica;
- separación NormativeUnit/Requirement/Control/Issue;
- mappings normativos y de cumplimiento;
- origen/ownership de controles globales y tenant;
- semántica de scope tenant/Subject;
- targets permitidos de EvidenceLink/EvidenceRequest;
- orígenes permitidos de IssueOrigin;
- contexto tenant/global de events y audit.

Cualquier necesidad de inventar uno de esos puntos revierte `SEMANTIC_PRE_PHYSICAL_GATE` a FAIL.

La mera posibilidad técnica, convención de framework, práctica habitual, patrón encontrado en código previo o preferencia de Codex no constituye autoridad. Aplica el contrato 45.

## 5. Gate

Tras la reconciliación de 08, 17, 19, 29, 30, 31, 33, 35, 38, 39, 44 y 45, el scan técnico no detecta conflictos materiales conocidos. Sin embargo, la revisión v1.3 no se autoactiva:

`RECTOR_BASELINE=PASS`

`PHYSICAL_MODEL_DESIGN=AUTHORIZED`

`MIGRATIONS=BLOCKED`

`FUNCTIONAL_DEVELOPMENT=BLOCKED`

Una vez registrada la aprobación humana, se restablecen `SEMANTIC_PRE_PHYSICAL_GATE=PASS`, `PRE_IMPLEMENTATION_CONTRACT_GATE=PASS_FOR_PHYSICAL_MODEL_DESIGN` y `PHYSICAL_MODEL_DESIGN=AUTHORIZED`. La siguiente etapa obligatoria será la Fase 1 de 43: derivar el modelo físico definitivo, incluyendo entidades y relaciones añadidas en 41–44, y someterlo a `PHYSICAL_DATA_MODEL_REVIEW`. Sólo después del PASS se avanza a contratos ejecutables; migrations siguen bloqueadas hasta `EXECUTABLE_CONTRACTS=PASS`.
