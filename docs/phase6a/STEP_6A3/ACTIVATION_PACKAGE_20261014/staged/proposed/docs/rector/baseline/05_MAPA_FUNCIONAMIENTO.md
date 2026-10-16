# TCDX GRC — Mapa de funcionamiento

## Mapa macro

```text
Organization
  ↓
Governance / Regulatory
  ↓
NormativeUnit hierarchy → Requirement
  ↓
Compliance ←→ Controls ←→ Evidence
  ↓              ↓
Risk ←──────── Assurance
  ↓
Issues / Findings / Gaps
  ↓
Actions
  ↓
Verification / Retest
  ↓
Metrics / Snapshots / Reporting
```

## Cadena de impacto

```text
Source Data
→ External/Internal Observation
→ Validation / Data Trust
→ Metric Definition
→ Calculation / MetricMeasurement
→ Rule Evaluation
→ GRC Impact
→ Requirement / Control / Risk
→ Priority
→ Issue
→ Action
→ Evidence
→ Verification
→ Snapshot
→ Executive/Operational Reporting
```

## Integraciones

```text
External System
→ Connector
→ RawRecord
→ Normalization
→ Subject Binding
→ Observation
→ Metric/Direct Rule Input
→ Rule Evaluation
→ GRC Impact
```

## IA

```text
Canonical GRC Data
→ RBAC + Tenant Authorized Context
→ backend GRC / integración IA gobernada
→ ia2.tcdx.int
→ Response + Provenance
```

La respuesta IA no modifica automáticamente hechos oficiales.

## Trazabilidad de assurance

```text
FrameworkVersion
→ NormativeUnit hierarchy
→ Requirement
→ RequirementControlMapping
→ Tenant Control
→ Evidence
→ Assurance Test
→ Finding
→ Action
→ Verification
```

## Riesgo

```text
Process / Service / Asset
→ Risk
→ Inherent Assessment
→ Controls
→ Effectiveness
→ Residual Risk
→ Appetite/Tolerance
→ Treatment
→ Action
→ Review
```

## Auditoría

```text
Audit Universe
→ Annual Program
→ Audit
→ Workpaper/Test/Sample
→ Evidence
→ Finding
→ Action
→ Retest
→ Conclusion
→ Report
→ Follow-up
```

## Addendum - Mapa causal de informacion

Cadena transversal obligatoria:

`External/Internal Source -> Ingestion -> Raw Record -> Normalized Observation -> Validation/Data Trust -> Metric -> Rule -> GRC Impact -> Domain Consumer -> Issue/Action/Evidence/Verification -> Reporting`

Un hecho canonico puede alimentar multiples dominios; no debe duplicarse por consumidor. Ver documentos 14 y 15.

La navegación por cláusula es una proyección sobre `NormativeUnit` y sus Requirements descendientes; una cláusula no se evalúa ni se convierte en gap directamente. Ver 44.
