# 43 — Plan maestro rector de diseño y desarrollo — v1.5

> Active baseline: `TCDX_GRC_MASTER_REGENT_BASELINE_v1.5_2026-09-16`.
> Status: `ACTIVE`; human approval recorded in `docs/governance/PRE_F4_AUDIT_MODEL_AMENDMENT_APPROVAL.md`.

## 1. Autoridad

Este documento fija el orden único de ejecución. Ninguna fase posterior comienza sin evidencia PASS de su gate, salvo la Fase 4 regulatoria, cuyos gates son independientes por pack y pueden ejecutarse en paralelo sin bloquear el desarrollo funcional permitido por el plan. La base PostgreSQL se implementa una sola vez como modelo definitivo; no se autoriza schema provisional, legacy, paralelo ni “MVP para migrar después”.

## 2. Stack vinculante

- PostgreSQL 16 `tcdx-grc` en `192.168.2.40`, migraciones SQL versionadas y transaccionales.
- Backend modular monolith: Node.js 22 LTS, TypeScript strict, Fastify y acceso SQL tipado; API REST OpenAPI 3.1.
- Frontend: React 19, TypeScript strict y Vite; design system propio basado en tokens accesibles WCAG 2.2 AA.
- Jobs: outbox PostgreSQL como autoridad + workers idempotentes; Redis 7 sólo para cache/coordination no autoritativa.
- Binarios: almacenamiento S3-compatible; MinIO en infraestructura Tecdex, metadata y permisos en PostgreSQL.
- Secretos: referencias de secretos; Docker secrets en QA y Vault en producción. Nunca valores secretos en BD, repo, logs o frontend.
- Observabilidad: OpenTelemetry, Prometheus, Grafana y Loki; correlation IDs end-to-end.
- IA: el backend GRC consume el servicio existente `ia2.tcdx.int` mediante integración gobernada; salidas con provenance y aprobación según 36. No se crea una VM o runtime GRC separado denominado `ia-grc`.
- Despliegue inicial: backend en `192.168.2.45` / `grc-bk.tcdx.int` y frontend en `192.168.2.46` / `grc-www.tcdx.int`; PostgreSQL `tcdx-grc` reside en `192.168.2.40`. El backend consume `ia2.tcdx.int`. No se autoriza una tercera VM GRC para IA salvo ADR rector posterior.

Estas elecciones sólo cambian mediante ADR humano aprobado y actualización previa de esta base rectora. El stack de plataforma queda cerrado; versiones exactas de paquetes, package manager, librería de SQL tipado, framework de pruebas, layout de repositorio y convenciones de generación deben congelarse en un `IMPLEMENTATION_DECISION_MANIFEST` durante Fase 2. Su ausencia no bloquea el diseño físico, pero sí `EXECUTABLE_CONTRACTS=PASS` y todo desarrollo funcional. Codex no elige esos elementos por defecto.

## 3. Objetivos no funcionales cerrados

- disponibilidad objetivo producción: 99,9% mensual, excluyendo mantenimiento anunciado;
- RPO producción: 15 minutos;
- RTO producción: 4 horas;
- backups cifrados: PITR + diario, prueba de restauración trimestral;
- tenant isolation: pruebas negativas obligatorias en cada slice;
- seguridad: OWASP ASVS nivel 2 como baseline de aplicación;
- accesibilidad: WCAG 2.2 AA;
- todo tiempo técnico en UTC; presentación según timezone IANA del tenant/usuario.

## 4. Fases y gates

### Fase 0 — Baseline rector

Salida: baseline `TCDX_GRC_MASTER_REGENT_BASELINE_v1.5_2026-09-16`, documentos 00–48 aplicables, con v1.4 preservado como histórico verificable. Gate: `RECTOR_BASELINE=PASS`.

### Fase 1 — Modelo físico definitivo

Derivar todas las entidades de 33 y las adiciones 41–44: tablas, columnas, UUIDv7, PK/FK, ownership, uniques, checks, índices, partición, temporalidad, versionado, retención, audit y lineage. El diseño debe demostrar expresamente `FrameworkVersion → NormativeUnit → Requirement`, ambos mappings normativos, controles globales/tenant, RequirementApplicability tenant-wide/Subject-scoped, EvidenceLink/EvidenceRequest tipados, IssueOrigin tipado, contexto ownership_class/tenant de eventos y la imposibilidad de evaluar una NormativeUnit como Requirement. Entregables: diccionario, ERD, matriz Entity→Physical, matriz de invariantes y DDL propuesto sin ejecutar.

Gate: `PHYSICAL_DATA_MODEL_REVIEW=PASS`.

### Fase 2 — Contratos ejecutables

Congelar OpenAPI base, event catalog, permission catalog, error model, idempotency, audit events, seed manifests, test contracts, migration plan e `IMPLEMENTATION_DECISION_MANIFEST`. Cada artefacto debe identificar owner y aprobación humana. Gate: `EXECUTABLE_CONTRACTS=PASS`.

### Fase 3 — Creación definitiva de base y foundations

Crear `tcdx-grc`, ejecutar migraciones iniciales y seeds globales: planes, capabilities, roles, permissions, escalas, lifecycles y manifiestos regulatorios. Implementar tenant/organization, identity, RBAC, entitlements, configuration, audit/outbox, archivos/evidencia, observabilidad y seguridad.

Gate: `FOUNDATIONS_RUNTIME=PASS`, con rollback/rebuild, tenant isolation y restore probados.

### Fase 4 — Packs regulatorios independientes y paralelos

Importar desde fuentes autorizadas el 100% de ISO 9001:2015, ISO 9001:2026 cuando esté publicada, ISO/IEC 27001:2022, ISO/IEC 42001:2023 y Ley 21.719; crear NormativeUnit, Requirements, controles de referencia/base, mappings, crosswalks y manifiestos conforme a 44.

Cada pack posee gate individual `REGULATORY_PACK_<CODE>=PASS`. La falta de texto licenciado, publicación definitiva o aprobación de un pack bloquea exclusivamente su selección, uso oficial y evidencia runtime dependiente. No bloquea la construcción genérica de motores ni otros packs/capacidades independientes. Un gate de slice o release sólo puede pasar si un `RELEASE_DEPENDENCY_MANIFEST` aprobado enumera sus capabilities/packs y todos los `REGULATORY_PACK_<CODE>` declarados como dependencias están en PASS.

### Fase 5 — Slice Compliance + Controls + Evidence + Actions

Applicability, assessment, SoA, control lifecycle, assurance, evidence, issue/gap y remediation completos end-to-end. Gate: `CORE_GRC_SLICE=PASS`.

### Fase 6 — Slice Risk + Incidents/Loss

Taxonomías, metodología, inherente/residual, controles, apetito/tolerancia, KRI, tratamientos, incidentes y pérdidas. Gate: `RISK_RUNTIME=PASS`.

### Fase 7 — Integrated Audit + Third Parties + Resilience + Privacy

Audit se entrega como módulo integrado multi-norma alineado al contrato 48. Una Audit selecciona entre una y tres FrameworkVersion, conserva objetivos, criterios, scopes tipados por FrameworkVersion+Subject, equipo, lead/auditor/technical expert, competencias validadas y agenda integrada.

AuditTest puede cubrir múltiples Requirements sólo mediante links tipados. Si los Requirements pertenecen a FrameworkVersion distintas, toda agrupación adicional debe citar un RequirementCrosswalkMapping aprobado, efectivo y con relationship_type `equivalent | partially_equivalent | overlaps | supports`. Coincidencia de numeración HLS nunca basta. Cada Requirement conserva identity, applicability, RequirementAssessment, result_status, domain_conclusion y lineage independientes.

AuditTest puede vincular Control o ControlAssessment tenant y RequirementAssessment mediante FKs tipadas. Evidence, Issue y Action continúan bajo sus autoridades existentes; Audit no crea copias ni motores paralelos. Agenda enlaza tests, scopes y AuditTeamAssignment.

Third Parties, Resilience y Privacy mantienen sus contratos v1.4. Cada dominio se entrega como slice completo con persistence, domain, API, RBAC, audit, UI, tests, E2E, runtime y traceability. Gate: `ASSURANCE_OPERATIONS=PASS`; para Audit requiere previamente `AUDIT_MODEL_AMENDMENT_REVIEW=PASS` y migración incremental aprobada/materializada.

### Fase 8 — Data/Integration/Rules/Impact

Conectores sólo tras contrato por proveedor; ingesta, observations, metrics, Data Trust, rules y GRC Impact reproducibles. Gates: `CONNECTOR_CONTRACT_<PROVIDER>=PASS` y `DATA_IMPACT_RUNTIME=PASS`.

### Fase 9 — Reporting, Regulatory Intelligence e IA

Dashboards/drill-down, Report Studio, cambios regulatorios e IA gobernada. Gate: `INTELLIGENCE_RUNTIME=PASS`.

### Fase 10 — Release comercial

Pruebas funcionales, seguridad, carga, accesibilidad, recuperación, cross-tenant, upgrade, rollback y operación. Gate final: `MARKET_RELEASE_READY=PASS`.

## 5. Reglas de ejecución

1. Cada slice recorre persistence→domain→API→RBAC→audit→UI→tests→E2E→runtime→traceability.
2. No se aceptan mocks como evidencia de cierre runtime.
3. No se reabre una decisión cerrada por comodidad de implementación.
4. Toda excepción requiere ADR, owner, fecha de expiración y plan de eliminación; nunca crea una vía paralela.
5. No se hacen commit, merge ni deploy si el gate aplicable a ese artefacto o capacidad está FAIL.
6. El estado de cada fase se registra en un único `MASTER_EXECUTION_STATUS.md` generado en el repositorio de desarrollo, no dentro de esta base rectora.
7. Codex aplica 45. Si una tarea permite más de una solución material, detiene esa parte y solicita un Decision Record humano; no selecciona por conveniencia.
8. Los owners humanos aprueban gates y ADR. Codex puede preparar evidencia y propuestas DRAFT, pero no autoaprobarlas.
9. Todo task packet material declara alcance, fuentes, archivos permitidos, contratos afectados, criterios de aceptación, pruebas y acciones prohibidas. La omisión material produce BLOCKED.

## 6. Responsables del desarrollo

- Product Owner/CPO: alcance, prioridad y aceptación funcional.
- Architecture Owner: coherencia de contratos, modelo y ADR.
- Data Model Owner: DDL, migraciones, integridad, performance y recovery.
- Backend Owner: dominio, API, workers, seguridad y tests.
- Frontend Owner: UX, accesibilidad, autorización visible y E2E.
- Security & Privacy Reviewer: threat model, controles, privacidad y gates.
- QA/Release Owner: test contracts, evidencia runtime y release gates.
- Regulatory Content Owners: roles especializados definidos en 41.

Una persona puede ocupar varios roles en un equipo pequeño, pero debe registrarse el sombrero usado en cada aprobación y respetar las segregaciones obligatorias.
