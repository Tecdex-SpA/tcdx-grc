# TCDX GRC — Traceability Matrix

## Objetivo

Demostrar que cada requisito funcional tiene una cadena completa desde contrato hasta runtime.

## Cadena

```text
Functional Requirement ID
→ Product Domain
→ Use Case
→ Actor
→ Domain Aggregate
→ Canonical Entity
→ DB Object
→ Migration
→ Domain Service
→ API Endpoint
→ Permission
→ Capability
→ UI Route/View
→ Audit Event
→ Notification
→ Metric Impact
→ Unit Test
→ Integration Test
→ E2E Test
→ Cross-Tenant Test
→ Runtime Evidence
→ Documentation
→ Status
```

## Estados

- NOT_STARTED
- CONTRACT_DEFINED
- IMPLEMENTED_UNVERIFIED
- LOCAL_PASS
- INTEGRATION_PASS
- E2E_PASS
- RUNTIME_PASS
- RELEASE_READY
- BLOCKED

No se utilizan porcentajes subjetivos para sustituir evidencia.

## Detección de huérfanos

La trazabilidad debe detectar:
- requisito funcional o normativo sin entidad correspondiente;
- endpoint sin requisito funcional/contrato;
- tabla sin domain owner;
- pantalla sin backend contract;
- permission sin uso;
- feature sin E2E;
- métrica sin source;
- IA sin provenance;
- integración sin efecto o propósito definido.

## Trazabilidad conceptual pre-modelo físico de experiencias críticas

Esta matriz satisface G14 únicamente para `PASS_FOR_PHYSICAL_MODEL_DESIGN`. Los DB objects, endpoints, códigos de eventos y tests concretos se completan y congelan en `EXECUTABLE_CONTRACTS`; ninguna fila se considera implementable antes de ello.

| Experiencia | Input | Entidades/owner | Command y estado conceptual | Medición/resultado | Permission/scope | Audit y test contractual |
|---|---|---|---|---|---|---|
| Centro Ejecutivo GRC | snapshots oficiales | Snapshot, SnapshotItem, ReportRun / Reporting | consultar snapshot publicado | Result Envelope y drill-down | reporting/report.read; tenant/org scope | acceso/export auditado; tenant isolation y consistencia de snapshot |
| Centro Operativo GRC | assessments, issues, actions, evidence | RequirementAssessment, ControlAssessment, Issue, Action, Evidence | priorizar, asignar y transicionar workflows | coverage, vencimientos y blockers | permisos de cada dominio; assigned/owned/tenant scope | cada transición auditada; E2E de bandeja a objeto fuente |
| Risk 360 | subjects, metodología, assessments, controles | Risk, RiskAssessment, RiskTreatment, RiskAcceptance, KRI / Risk | evaluar, tratar, aceptar, monitorear | inherente, residual, appetite/tolerance conclusion | risk.*; tenant/org/process/service scope | versión y lineage; tests de rangos, coverage y SoD |
| Control 360 | requirements, scopes, evidencia y tests | RequirementControlMapping, Control, ControlVersion, ControlAssessment, AssuranceTest / Controls | diseñar, mapear, evaluar, probar y aprobar | design/operating/overall effectiveness | controls.*; tenant/owned/assigned scope | evidence lineage; tests de control global vs tenant y `completed != verified` |
| Compliance 360 | RegulatoryPackVersion, NormativeUnit, Requirement, controles de referencia y evidencia | NormativeUnit, RequirementApplicability, RequirementAssessment, StatementOfApplicability, StatementOfApplicabilityItem / Compliance | navegar unidades, decidir applicability, evaluar Requirements y aprobar SoA | compliance score, coverage, SoA y conclusion | compliance.*; tenant/org/process scope | jerarquía y pack/version auditados; tests N/A, no-data, coverage, SoA y agregación por unidad |
| Data & Trust Center | RawRecord, Observation y lineage | Observation, SourceResolution, DataQualityAssessment, MetricMeasurement / Data & Metrics | validar, resolver fuentes y calcular | result_status, Data Trust y metric value | data.*; tenant scope | input hash/lineage; tests conflicto, freshness y cero real |
| Audit Workspace | universo, alcance, workpapers, muestras y evidencia | AuditProgram, Audit, AuditWorkpaper, AuditTest, AuditSample / Audit | planificar, ejecutar, emitir y seguir | conclusión de auditoría; Issues originados | audit.*; audit_engagement scope | independencia y SoD; E2E hasta Issue/Action |
| Action Workspace | Issue, owner, fechas y closure evidence | Issue, Action, ActionVerification / Issues & Remediation | crear, ejecutar, completar, verificar y reabrir | prioridad, overdue y verificación | remediation.*; assigned/owned scope | actor/verificador separados; lifecycle y evidencia |
| Evidence Workspace | request, documento, archivo y revisión | EvidenceRequest, Evidence, EvidenceVersion, EvidenceReview, FileObject / Evidence | solicitar, enviar, revisar, aprobar, expirar | coverage, freshness y validez | evidence.*; tenant/assigned scope | malware/access/SoD; upload no equivale a aprobación |
| Administration Center | tenant, membership, plan y configuración | Tenant, TenantMembership, Role, Permission, Subscription, Entitlement, ConfigurationOverride / Platform | provisionar, asignar, configurar y auditar soporte | configuración efectiva y uso | platform.* / tenant scope | cross-tenant, entitlement y impersonation auditados |

Para planes comerciales, cada fila debe además demostrar que la capability requerida está habilitada por `ISO`, `ISO_RIESGO_OPERATIVO` o `GRC` conforme a 42.

La matriz ejecutable debe demostrar adicionalmente `FrameworkVersion → NormativeUnit → Requirement → RequirementControlMapping → Control → Evidence/Assessment → Issue → Action`, conforme a 44.

## Release

`RELEASE_READY` exige que los gates aplicables estén completos y que exista evidencia runtime cuando la funcionalidad dependa del runtime.

## Addendum - Trazabilidad de datos a resultados

La matriz de trazabilidad debe cubrir tambien:

`Source/Object/Field -> Raw Record -> Canonical Observation -> Metric -> Rule -> GRC Impact -> Domain Consumer -> Result Envelope -> UI/Report -> Evidence/Lineage`

Todo conector y todo resultado calculado deben demostrar esta cadena antes de cierre. Ver documentos 14 y 15.
