# Constraints e invariantes

Clasificación: `DB` = constraint declarativo; `TX` = validación transaccional futura; `APP` = backend futuro; `DEFENSE` = capa adicional. No se implementan triggers.

## Identidad, ownership y referencias

| ID | Invariante | Capa primaria | Defensa |
|---|---|---|---|
| INV-001 | PK UUIDv7, opaca, inmutable y nunca reutilizada | APP al generar + DB PK | test de formato/orden |
| INV-002 | `tenant_id` NOT NULL en TENANT_OWNED/TENANT_DERIVED y NULL en GLOBAL_REFERENCE/PLATFORM_CONTROL mixtos | DB CHECK | repository tenant context |
| INV-003 | Toda relación tenant↔tenant usa FK compuesta `(tenant_id,id)` | DB FK/UQ | test cross-tenant negativo |
| INV-004 | Referencias tenant→global/platform sólo hacia objetos publicados/accesibles | TX/APP | audit + entitlement/RBAC |
| INV-005 | Tenant es ownership; Organization/Subject son scope y no sustituyen tenant | DB columnas/FK | policy resolver |
| INV-006 | No existe `SYSTEM_TENANT_ID` | DB modelo | scan/tests |
| INV-007 | Business keys tenant-owned incluyen tenant; registries globales son globalmente únicos | DB UQ | contract tests |
| INV-008 | Actor humano y service principal son mutuamente exclusivos cuando se exige actor | DB CHECK | auth context |

## Normativa y controles

| ID | Invariante | Capa primaria | Defensa |
|---|---|---|---|
| INV-020 | NormativeUnit, Requirement, Control e Issue no comparten tabla/identidad | DB estructura | traceability test |
| INV-021 | Parent NormativeUnit pertenece a misma FrameworkVersion/tenant y no forma ciclos | DB composite FK + TX cycle check | recursive negative test |
| INV-022 | Requirement referencia exactamente una NormativeUnit primaria de la misma FrameworkVersion | DB composite FK/NOT NULL | import validation |
| INV-023 | NormativeUnit no recibe applicability, assessment, result ni evidence directa | DB ausencia de FK | schema contract test |
| INV-024 | RequirementApplicability tiene scope tenant-wide (NULL) o un Subject del mismo tenant | DB FK/check | authorization test |
| INV-025 | SoA item y RequirementApplicability permanecen separados | DB estructura | traceability test |
| INV-026 | RequirementControlMapping y NormativeUnitControlMapping permanecen separados | DB estructura | mapping semantics test |
| INV-027 | Control origin concuerda con ownership; `based_on` sólo para tenant_instantiated | DB CHECK + TX parent class | tests por origen |
| INV-028 | Crosswalk item source/target pertenece a versions declaradas; target NULL sólo para no_match | DB CHECK/FK + TX | publication validation |
| INV-029 | Pack publicado exige cobertura 100%, poblaciones exactas y aprobadores requeridos | TX | gate/report audit |

## Targets tipados y no polimorfismo débil

| ID | Invariante | Capa primaria | Defensa |
|---|---|---|---|
| INV-040 | EvidenceLink tiene exactamente uno de seis targets permitidos | DB CHECK + typed FKs | API union validation |
| INV-041 | EvidenceRequest tiene exactamente uno de cinco targets permitidos | DB CHECK + typed FKs | API union validation |
| INV-042 | IssueOrigin tiene exactamente uno de siete orígenes permitidos | DB CHECK + typed FKs | command validation |
| INV-043 | SnapshotItem referencia exactamente una entidad concreta, nunca Result genérico | DB CHECK + typed FKs | schema scan |
| INV-044 | CalculationInput, RuleEvaluationInput, DataQuality scope y AI provenance usan exactamente una FK tipada | DB CHECK + typed FKs | contract tests |
| INV-045 | Todo target tenant pertenece al mismo tenant; target global debe ser accesible | DB composite FK / TX | cross-tenant tests |

## Estados, resultados y valores

| ID | Invariante | Capa primaria | Defensa |
|---|---|---|---|
| INV-060 | lifecycle, severity, priority, calculation_status, result_status y domain_conclusion son columnas distintas | DB estructura/CHECK | API contract tests |
| INV-061 | Estados `calculation_status` sólo son pending/running/succeeded/failed/cancelled | DB CHECK | transition tests |
| INV-062 | `result_status` sólo usa vocabulario 38; `not_calculated` no se persiste | DB CHECK | schema/API scan |
| INV-063 | MetricMeasurement oficial tiene `numeric_value` sólo cuando valid; preview no se presenta oficial | DB CHECK + APP | UI/API tests |
| INV-064 | Cero válido no equivale a no_data/null | DB nullable/value separation | calculation tests |
| INV-065 | Observation/config/answer heterogéneo tiene value_type coincidente y exactamente un valor tipado | DB CHECK | validation tests |
| INV-066 | Result status agregado respeta blockers, coverage, freshness y precedencia 38 | APP deterministic calculation | calculation contract tests |
| INV-067 | Overall control effectiveness default=min(design,operating) bajo metodología baseline | APP/TX publication | formula tests |
| INV-068 | Inherent 1..25; residual 0..25; levels 1..5; percentages 0..100; confidence 0..1 | DB CHECK | methodology tests |
| INV-069 | tolerance_max >= appetite_max en misma metodología/escala | TX across policies + DB local ranges | policy resolution tests |

## Lifecycle, SoD e idempotencia

| ID | Invariante | Capa primaria | Defensa |
|---|---|---|---|
| INV-080 | Sólo una arista publicada de LifecycleTransitionDefinition autoriza transición | APP/TX | audit + transition tests |
| INV-081 | No existe command genérico update_status | executable-contract gate | scans/tests |
| INV-082 | completed != verified; submitter/approver y completer/verifier separados cuando policy aplica | TX/APP | SoD negative tests |
| INV-083 | cancel/reject/dismiss/invalidate/supersede/expire/reopen requiere command y motivo cuando aplica | APP | audit completeness |
| INV-084 | Idempotency uniqueness incluye ownership/tenant, actor, operation y key | DB UQ | concurrency tests |
| INV-085 | Misma key con request hash distinto produce conflicto y no mutación | TX/APP | retry tests |
| INV-086 | Outbox se inserta en misma transacción que mutación; consumers son idempotentes | TX/APP | integration tests |
| INV-087 | Automatización no excede policy/level; IA default máximo A2 | APP | authorization/audit tests |

## Tiempo, versionado, retención y deletion

| ID | Invariante | Capa primaria | Defensa |
|---|---|---|---|
| INV-100 | Instantes son timestamptz UTC; fechas civiles usan date; interpretación usa IANA | DB type + APP | timezone/DST tests |
| INV-101 | `effective_to > effective_from`, `period_end >= period_start`, expiración posterior al inicio | DB CHECK | boundary tests |
| INV-102 | Versiones publicadas, snapshots, source resolutions, audit y erasure records son inmutables | privilege design future + APP | mutation-negative tests |
| INV-103 | Corrección crea supersession/retraction, no overwrite destructivo | APP/TX | history tests |
| INV-104 | Recálculo crea CalculationRun/Snapshot nuevos y no modifica publicación histórica | APP/TX | reproducibility tests |
| INV-105 | Retención efectiva: legal hold > mandatory regulatory > contractual > tenant > baseline | APP policy resolver | purge dry-run/audit |
| INV-106 | No ON DELETE CASCADE sobre historia/evidence/measurements/impacts/snapshots/resolutions/erasure/audit | DB FK action | schema inspection |
| INV-107 | No DELETE CRUD genérico; cada objeto aplica deletion_policy | executable contracts + APP | authorization tests |

## Evidence, lineage e integración

| ID | Invariante | Capa primaria | Defensa |
|---|---|---|---|
| INV-120 | FileObject no es Evidence; archivo sólo utilizable tras malware scan PASS | DB separación + APP | upload tests |
| INV-121 | Evidence aprobada requiere EvidenceReview válida y SoD aplicable | TX/APP | workflow tests |
| INV-122 | Evidence de implementación tenant enlaza Control tenant, no sólo ControlVersion global | TX/APP | evidence lineage tests |
| INV-123 | RawRecord, Observation, Measurement, RuleEvaluation, Impact y Domain object no se colapsan | DB estructura | pipeline trace test |
| INV-124 | Observations son append-only; conflicto conserva candidatos | DB immutable + APP | precedence tests |
| INV-125 | SourceResolution registra candidates/selected/non-selected y policy/version | DB link tables + TX | reproducibility test |
| INV-126 | Todo resultado oficial referencia versiones, run, config, sources y Data Trust según aplique | DB FK + TX | lineage completeness |
| INV-127 | External binding activo es único por provider/namespace/type/id/generation | DB partial UQ | reused-ID tests |
| INV-128 | Raw dedup y Observation dedup son tenant/source scoped e idempotentes | DB UQ + APP hash | retry tests |
| INV-129 | Secretos/blobs no se guardan en tablas; sólo referencias/metadata | APP + classification review | secret scan |

## Publicación y restricciones transaccionales

Las reglas multi-fila/cross-table no se convierten en triggers en esta fase. El backend futuro debe bloquear la transacción antes del commit y producir AuditEvent/Outbox cuando corresponda. Esto incluye: publicación de packs con cobertura/aprobaciones; ciclos jerárquicos; consistencia ownership mixta; estado publicado inmutable; selected⊆candidate; obligatoriedad de preguntas al submit; policy de SoD; cálculo de especificidad/config/retención; y transición registrada.
