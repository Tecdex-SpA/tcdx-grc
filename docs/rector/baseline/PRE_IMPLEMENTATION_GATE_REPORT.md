# PRE_IMPLEMENTATION_GATE_REPORT — TCDX GRC

Fecha de cierre rector: 2026-09-15

Baseline ID candidato: `TCDX_GRC_MASTER_REGENT_BASELINE_v1.4_2026-09-15`.

## Resultado y alcance

`RECTOR_BASELINE=PASS`

`SEMANTIC_PRE_PHYSICAL_GATE=PASS`

`PRE_IMPLEMENTATION_CONTRACT_GATE=PASS_FOR_PHYSICAL_MODEL_DESIGN`

`PHYSICAL_MODEL_DESIGN=AUTHORIZED`

`PHYSICAL_DATA_MODEL_REVIEW=PENDING`

`EXECUTABLE_CONTRACTS=PENDING`

`MIGRATIONS=BLOCKED`

`FUNCTIONAL_DEVELOPMENT=BLOCKED`

La revisión semántica pre-física permanece satisfecha. Este baseline maestro, una vez publicado con aprobación humana registrada en el repositorio, autoriza exclusivamente `PHYSICAL_MODEL_DESIGN=AUTHORIZED`; no equivale a `PASS_FOR_IMPLEMENTATION`, no autoriza migraciones y no autoriza desarrollo funcional.

## Matriz obligatoria G1–G15

| Gate | Alcance evaluado | Estado | Evidencia y cierre |
|---|---|---|---|
| G1 Product Scope | pre-físico | PASS | 01 define dominios, experiencias, producto terminado y exclusiones; 42 fija planes `ISO`, `ISO_RIESGO_OPERATIVO` y `GRC` sin planes heredados |
| G2 Domain Ownership | pre-físico | PASS | 07 fija write owner único; Supplier queda exclusivamente en Third Parties; writes inter-domain usan commands/events |
| G3 Canonical Model | pre-físico | PASS | 08, 30, 33, 39 y 44 definen entidades, relaciones, IDs, ownership classes, scope tenant/Subject, temporalidad, versionado, invariantes y deletion policies; NormativeUnit, Requirement, Control e Issue quedan separados |
| G4 Integration Representation | pre-físico | PASS | 14, 16, 20, 30 y 35 representan fuentes, RawRecord, Subject binding, Observation, precedence y lineage sin schema por proveedor |
| G5 Metrics & Methodology | pre-físico | PASS | 17, 19, 38 y 39 separan formulas, escalas, coverage, Data Trust, calculation_status, result_status y domain_conclusion |
| G6 Rules & Impact | pre-físico | PASS | 18 y 36 delimitan RuleEvaluation, GRCImpact, mappings, automatización y decisiones humanas |
| G7 Lifecycle | pre-físico | PASS | 03 y 21 fijan estados y `LifecycleTransitionDefinition`; aristas ejecutables quedan obligatoriamente para `EXECUTABLE_CONTRACTS` |
| G8 RBAC | pre-físico | PASS | 09, 22 y 42 fijan Permission, scopes, roles, SoD y autorización; mapping command→permission queda para `EXECUTABLE_CONTRACTS` |
| G9 Temporal/Retention | pre-físico | PASS | 23 y 39 cierran effective time, correction, recalculation, retention, legal hold, archive, supersession y erasure |
| G10 Evidence | pre-físico | PASS | 24 y 30 cierran FileObject, malware scan, acceso, review, vigencia, expiración, EvidenceLink Control/ControlVersion y targets tipados de EvidenceRequest |
| G11 API/Event Integrity | pre-físico | PASS | 25 define estructuras físicas e invariantes de idempotencia, concurrency, outbox, audit, ownership_class/tenant context y error model sin tenant artificial; catálogos concretos quedan para `EXECUTABLE_CONTRACTS` |
| G12 Non-functional | pre-físico | PASS | 26 y 43 fijan aislamiento, secretos, observabilidad, performance, disponibilidad, RPO/RTO, seguridad y accesibilidad |
| G13 Connectors | representabilidad pre-física | PASS | 20 demuestra representación por core y fija `ConnectorVersion` contractual; ningún adapter está autorizado sin su gate específico |
| G14 Traceability | conceptual pre-física | PASS | 10 contiene una fila conceptual por cada experiencia crítica y la cadena FrameworkVersion→NormativeUnit→Requirement→Control→Evidence→Issue→Action; DB/API/event/test IDs se completan en `EXECUTABLE_CONTRACTS` |
| G15 Semantic Integrity | pre-físico | PASS TÉCNICO | 32–45 reconcilian nomenclatura, catálogo, precedence, automation, packs, estructura normativa, resultados, planes, secuencia y no inferencia; la adopción permanece pendiente de aprobación humana |

## Reconciliaciones finales verificadas

| Área | Cierre |
|---|---|
| Catálogo contractual | Se incorpora `LifecycleTransitionDefinition` y se eliminan divergencias nominales de Permission y ConnectorVersion |
| Supplier ownership | Third Parties es write owner único; otros dominios sólo referencian |
| RBAC actions | `publish` e `impersonate` forman parte del vocabulario canónico y la impersonation posee permission/scope explícitos |
| Planes comerciales | Sólo existen ISO, ISO + Riesgo Operativo y GRC; Issue/Action quedan juntos y las capabilities están delimitadas |
| Regulatory gating | Cada pack tiene gate independiente; un pack pendiente no bloquea capacidades no dependientes |
| Result semantics | Result/DomainResult permanecen como envelopes, no entidades/tablas genéricas |
| Status y propagación | 38 separa calculation_status, result_status y domain_conclusion y define precedencia determinística |
| Risk y Data Trust | escalas, residual 0..25, appetite/tolerance, coverage y DataQualityAssessment permanecen versionados y reproducibles |
| Source/configuration/privacy | SourceResolution, EffectiveConfiguration y ErasureExecutionRecord quedan canónicos y trazables |
| Artefactos obsoletos | Sólo el contenido de este paquete integra el baseline; adjuntos individuales, auxiliares e históricos son NON_NORMATIVE |
| Estructura normativa | NormativeUnit, Requirement, Control e Issue poseen identidades separadas; Clause es una presentación de NormativeUnit |
| Mappings regulatorios | RequirementControlMapping expresa contribución al cumplimiento; NormativeUnitControlMapping expresa ubicación/provenance de controles de referencia |
| Controles globales/tenant | Regulatory reference, baseline TCDX, instancia tenant y definición tenant conservan origin y ownership explícitos |
| Crosswalks | FrameworkCrosswalk usa mappings tipados separados para NormativeUnit, Requirement y ControlVersion |
| SoA | StatementOfApplicabilityItem queda separado de RequirementApplicability y enlaza controles de referencia con implementación tenant |
| Applicability scope | RequirementApplicability conserva ownership tenant y define scope tenant-wide o Subject del mismo tenant; múltiples scopes generan applicabilities separados |
| Evidence targets | EvidenceLink distingue Control tenant de ControlVersion; EvidenceRequest admite sólo targets contractuales con integridad referencial |
| Issue origin | IssueOrigin queda limitado a RequirementAssessment, ControlAssessment, AssuranceTest, AuditTest, Risk, Incident o SupplierAssessment con integridad referencial |
| Event ownership | ownership_class gobierna contexto; tenant_id es obligatorio sólo para TENANT_* y se prohíbe SYSTEM_TENANT_ID |
| Tenant vs Organization | Tenant es aislamiento/ownership; Organization/Subject son scope y no fuerzan organization_id universal |
| Discrecionalidad de Codex | 45 fija `CODEX_VARIATION_BUDGET=ZERO`; alternativas múltiples, vacíos o task packets incompletos producen BLOCKED |
| Decisiones físicas | Codex no elige normalización, índices, particionado, vistas o caches entre alternativas válidas; Data Model Owner y Architecture Owner deciden |
| Aprobaciones | Codex prepara evidencia DRAFT, pero no aprueba baseline, modelo físico, contratos, seguridad, runtime ni release |
| Stack ejecutable | Las elecciones de plataforma permanecen cerradas; paquetes, versiones y toolchain exactos se congelan en `IMPLEMENTATION_DECISION_MANIFEST` antes de desarrollo funcional |
| Capability groups | El catálogo inicial deja de ser mínimo abierto y pasa a ser exacto |
| Topología | DB `192.168.2.40`, backend `192.168.2.45` / `grc-bk.tcdx.int`, frontend `192.168.2.46` / `grc-www.tcdx.int` y consumo IA `ia2.tcdx.int` quedan explícitamente fijados; no existe despliegue `ia-grc` separado |
| Dependencias regulatorias | Cada slice/release declara packs requeridos en `RELEASE_DEPENDENCY_MANIFEST`; un gate no pasa con dependencias pendientes |
| Integridad del paquete | El verificador del governance gate exige inventario exacto y rechaza archivos extra o symlinks dentro de docs/rector |

## Contradicciones abiertas

No quedan contradicciones materiales conocidas que impidan derivar el modelo físico una vez aprobada v1.3. Las contradicciones detectadas en v1.1 quedaron reconciliadas en v1.2; v1.3 cierra la discrecionalidad de ejecución sin ampliar alcance funcional. La aprobación humana de esta revisión está pendiente. Cualquier necesidad de inventar una entidad, enum, ownership, lifecycle, fórmula, policy, plan, capability o elección técnica revierte la tarea afectada a BLOCKED.

## Decision log

| ID | Decisión | Consecuencia |
|---|---|---|
| D-001 | Autorizar sólo diseño físico | migrations y funcionalidad continúan bloqueadas |
| D-002 | Usar `Permission` como entidad canónica | no se crea PermissionDefinition separada |
| D-003 | Usar `ConnectorVersion` como contrato canónico | no se crea ConnectorContractVersion separada |
| D-004 | Incorporar `LifecycleTransitionDefinition` | el modelo físico debe representar el registry de aristas |
| D-005 | Asignar Supplier a Third Parties | Organization y otros dominios sólo referencian |
| D-006 | Adoptar planes ISO, ISO + Riesgo Operativo y GRC | quedan prohibidos Foundation, Professional y Enterprise |
| D-007 | Mantener Issue y Action juntos en todos los planes que habiliten remediación | no existe Action huérfana de la capability de Issues |
| D-008 | Separar gates regulatorios por pack | la falta de un pack no paraliza el desarrollo no dependiente |
| D-009 | Diferenciar gate semántico de contratos ejecutables | G7/G8/G11/G14 se completan a nivel command/API/test antes de migrations |
| D-010 | Establecer este paquete como única fuente normativa | copias individuales anteriores quedan obsoletas |
| D-011 | Incorporar NormativeUnit como estructura editorial genérica | cláusulas, artículos y anexos no se modelan como Requirements |
| D-012 | Mantener Requirement como obligación atómica evaluable | applicability y assessments no operan sobre unidades estructurales |
| D-013 | Separar ambos mappings de controles | ubicación normativa no se confunde con contribución al cumplimiento |
| D-014 | Distinguir controles de referencia y controles tenant | un control publicado no se presenta como implementado por una organización |
| D-015 | Representar gaps exclusivamente como Issue | Requirement no almacena brecha ni remediación |
| D-016 | Tipar los items de FrameworkCrosswalk | se preservan FKs y semántica distinta para unidades, Requirements y Controls |
| D-017 | Incorporar StatementOfApplicabilityItem | la SoA no queda como blob ni se confunde con applicability de Requirements |
| D-018 | Cerrar RequirementApplicability por tenant + scope Subject opcional | tenant define ownership; Subject define alcance; no se crea estructura paralela |
| D-019 | Distinguir EvidenceLink→Control y →ControlVersion | evidencia de implementación tenant no se atribuye sólo al control de referencia |
| D-020 | Cerrar targets de EvidenceRequest | no existe target polimórfico sin integridad |
| D-021 | Cerrar orígenes de IssueOrigin | no existe source object polimórfico libre |
| D-022 | Hacer tenant_id condicional a ownership_class en eventos/audit | eventos globales/plataforma no requieren tenant artificial |
| D-023 | Separar Tenant ownership de Organization/Subject scope | no se propaga organization_id indiscriminadamente |
| D-024 | Fijar presupuesto de variación cero | Codex no completa vacíos ni elige alternativas |
| D-025 | Reservar aprobación de gates a owners humanos | evidencia automática no equivale a aprobación |
| D-026 | Exigir task packet completo | alcance, archivos, contratos, aceptación y prohibiciones son explícitos |
| D-027 | Exigir Decision Record para alternativas | ninguna preferencia técnica se vuelve contrato por defecto |
| D-028 | Cerrar catálogo inicial de capability groups | no se agregan grupos bajo la expresión “al menos” |
| D-029 | Separar componente, FQDN e IP | se elimina ambigüedad de nombres de infraestructura |
| D-030 | Congelar toolchain ejecutable en Fase 2 | el stack general no autoriza seleccionar paquetes por iniciativa |
| D-031 | Declarar dependencias regulatorias por release | ningún gate usa packs pendientes de forma implícita |
| D-032 | Fortalecer integridad a inventario exacto | un archivo adicional no puede convertirse en fuente rectora silenciosa |

## Gate siguiente

Primero debe registrarse la aprobación humana de v1.3 y activarse el governance gate v1.1. Después puede derivarse el modelo físico PostgreSQL completo y someterlo a revisión contra 00–45.

Sólo tras:

`PHYSICAL_DATA_MODEL_REVIEW=PASS`

se congelan los contratos ejecutables. Sólo:

`EXECUTABLE_CONTRACTS=PASS`

autoriza las migrations definitivas conforme a 43. Cada conector mantiene además `CONNECTOR_CONTRACT_<PROVIDER>=PASS` antes de implementación.
