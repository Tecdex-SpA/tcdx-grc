# 31 - Registro único de decisiones fundacionales cerradas

## Cerradas antes de implementar

1. PostgreSQL `tcdx-grc` es system of record operacional.
2. Arquitectura multi-tenant desde schema y autorización.
3. Un concepto canónico tiene un solo owner de escritura.
4. Datos externos entran exclusivamente por Integration Hub/contract adapters para hechos oficiales.
5. Raw data, Observation, Metric, Rule, Impact y Domain State son capas distintas.
6. No-data no es cero.
7. Score y coverage son dimensiones distintas.
8. No existe score GRC universal por defecto.
9. Compliance, Risk, Control Effectiveness y Data Trust usan metodologías separadas.
10. IA no es fuente oficial de hechos, scores ni autorizaciones.
11. Versiones publicadas, snapshots y audit history son inmutables.
12. `completed != verified`; upload != approved evidence; lifecycle != severity/level.
13. Nuevas normas se incorporan como Regulatory Packs, no schemas especiales.
14. Nuevos conectores se incorporan como adapters + mappings, no semánticas paralelas.
15. Feature flags, entitlements, permissions y scope son conceptos separados.
16. Side effects inter-domain usan commands/events/outbox, no writes cruzados.
17. Archivos binarios fuera de PostgreSQL; metadata/authority en PostgreSQL.
18. JSONB no sustituye el modelo relacional para campos críticos.
19. Historical correction usa supersession/recalculation, no destructive overwrite.
20. Desarrollo físico no comienza hasta PASS del documento 28.

## Decisiones de implementación cerradas

Frameworks, persistencia, API, object storage, secretos, observabilidad, jobs/colas, baseline UI, SLA y RPO/RTO quedan definidos de forma vinculante en 43. No existe una lista de decisiones fundacionales pendientes. Una sustitución futura requiere ADR aprobado y cambio previo de la base rectora, sin compatibilidad paralela.

## Cierres adicionales de reconciliación

21. El pipeline canónico oficial es exclusivamente el definido en 14; cualquier cadena resumida debe conservar su orden semántico.
22. `ObservationType` es registry normativo versionado; ejemplos no autorizan producción.
23. Conflictos entre fuentes se resuelven por `SourcePrecedencePolicy`; nunca por last-write-wins.
24. Automation tiene niveles A0-A5 y default no destructivo; detección automática no implica decisión automática.
25. Regulatory Packs reutilizan primitivas canónicas y no crean motores, lifecycle, permissions o schemas alternativos.
26. Todo resultado separa estado técnico (`calculation_status`), validez/suficiencia (`result_status`) y conclusión de dominio (`domain_conclusion`) según 38.
27. Baselines de retención del producto no se presentan como mínimos legales universales.
28. Un conector es `implementation_ready` sólo cuando su contrato a nivel de campos está publicado; representabilidad conceptual no basta.

## Cierres semánticos finales pre-modelo físico

29. La rúbrica base de Control Design/Operating Effectiveness, coverage y conclusiones se rige por 39.
30. Likelihood e Impact 1..5 usan `LikelihoodScaleDefinition` e `ImpactScaleDefinition` versionadas y referenciadas por RiskMethodology.
31. Las entidades canónicas son `RiskAppetitePolicy`/`RiskTolerancePolicy`; tolerance posee `tolerance_max` comparable y opcional `max_duration`.
32. `partially_compliant=0.50` y `minimum_coverage=80%` son defaults oficiales versionables, no constantes universales.
33. Data Trust se representa como `DataQualityAssessment` reproducible con fórmula/componentes/version/lineage; no altera silenciosamente el valor de negocio.
34. Todo mapping implementation-ready declara SourcePrecedencePolicy; todo cálculo donde la policy interviene conserva `SourceResolution`.
35. Subject identity, merge/split/retirement/reused external IDs se resuelven sin reescribir historia.
36. Privacy erasure se reconcilia con retención/legal hold/audit mediante `ErasureExecutionRecord`.
37. Instantes se almacenan en UTC; semántica local usa timezone IANA versionado/contextual.
38. PK base de nuevas entidades = UUIDv7; business keys tenant-owned son tenant-scoped y los IDs nunca se reutilizan.
39. Toda entidad física se clasifica GLOBAL_REFERENCE, PLATFORM_CONTROL, TENANT_OWNED o TENANT_DERIVED antes de DDL.
40. Configuración usa `ConfigurationDefinition`, `ConfigurationOverride` y `EffectiveConfiguration` con precedencia Platform → Methodology/Pack → Tenant → Scoped Object.
41. No existe DELETE CRUD genérico; cada entidad declara deletion_policy conforme a 39.
42. `Result`/`DomainResult` no son entidades genéricas; son envelopes de salida sobre entidades concretas. No existe tabla genérica `results`.
43. Inherent Risk usa rango 1..25; Residual Risk 0..25. Residual 0 es valor válido modelado, no ausencia.
44. La propagación baseline de status para agregados se rige por 38; metodologías pueden endurecer blockers sin redefinir los estados.
45. El diseñador físico no puede inventar nuevas entidades, enums semánticos, policies de precedencia ni reglas de configuración para completar ambigüedades.
46. Los Regulatory Packs obligatorios y su política de carga completa se rigen por 41.
47. Planes comerciales, capabilities y roles base se rigen por 42 y existen desde el seed inicial.
48. La secuencia, stack, objetivos no funcionales y gates únicos se rigen por 43.
49. La primera base ejecutada será la base definitiva; quedan prohibidos schemas provisionales, legacy o de transición.
50. Los únicos planes comerciales iniciales son `ISO`, `ISO_RIESGO_OPERATIVO` y `GRC`; Foundation, Professional y Enterprise quedan retirados.
51. Issue y Action pertenecen juntos a la capability `ISSUES_ACTIONS`; ningún plan ofrece Actions sin el soporte de Issues requerido por el modelo.
52. `Permission` materializa el registry de permisos; `ConnectorVersion` materializa el contrato versionado del conector; los aliases `PermissionDefinition` y `ConnectorContractVersion` no crean entidades adicionales.
53. `LifecycleTransitionDefinition` es entidad canónica PLATFORM_CONTROL y registry normativo de transiciones.
54. Third Parties es el único write owner de Supplier.
55. Los gates de Regulatory Packs son independientes por pack y no bloquean slices que no dependan del pack pendiente.
56. `NormativeUnit`, `Requirement`, `Control` e `Issue` son entidades semánticamente distintas; cláusula no es sinónimo de Requirement y Requirement no es Gap.
57. `NormativeUnit` representa la jerarquía editorial genérica para normas, leyes, contratos y políticas; no se crea un modelo exclusivo Clause para ISO.
58. Applicability y RequirementAssessment sólo operan sobre Requirements atómicos evaluables; las conclusiones por cláusula son agregaciones derivadas.
59. `RequirementControlMapping` representa contribución M:N al cumplimiento; `NormativeUnitControlMapping` representa ubicación/provenance de controles de referencia.
60. Controles regulatorios de referencia, controles base TCDX, instancias tenant y controles definidos por tenant comparten Control/ControlVersion con origin/ownership explícitos y nunca se confunden con implementación efectiva.
61. Gap, finding, non-conformity y exception se materializan como Issue; tareas correctivas se materializan como Action.
62. La estructura normativa y sus invariantes se rigen por 44.
63. FrameworkCrosswalk es cabecera versionada; sus correspondencias se materializan mediante `NormativeUnitCrosswalkMapping`, `RequirementCrosswalkMapping` y `ControlCrosswalkMapping` con FKs tipadas.
64. `StatementOfApplicabilityItem` es la línea tenant-owned de SoA para controles de referencia; no se sustituye por RequirementApplicability ni por un blob dentro de StatementOfApplicability.
65. Codex opera bajo presupuesto de variación cero conforme a 45: deriva contratos aprobados, no los completa ni elige entre alternativas.
66. Ningún gate arquitectónico, de seguridad, datos, release o contrato puede ser aprobado únicamente por Codex; requiere el owner humano registrado.
67. Un ADR sólo existe cuando un humano autorizado lo solicita y aprueba antes del cambio; Codex no lo crea para legitimar una desviación.
68. El catálogo inicial de capability groups de 42 es exacto. Cualquier alta, baja o división requiere revisión rectora o contrato ejecutable expresamente aprobado, según su nivel.
69. La identidad de infraestructura separa componente lógico, FQDN e IP conforme a 12; un dato no fijado bloquea únicamente la acción que dependa de él.
70. Una fase puede producir un borrador derivado por Codex, pero el estado permanece DRAFT/PENDING hasta revisión humana y evidencia del gate.
