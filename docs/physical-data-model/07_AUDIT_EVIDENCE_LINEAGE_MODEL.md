# Auditoría, evidencia y lineage

## AuditEvent

Cada operación crítica registra actor humano o service principal, ownership_class, tenant condicional, momento, command/event, aggregate, outcome, before/after relevante y minimizado, correlation/causation, IP/device cuando corresponda y clasificación. No contiene secretos, blobs, URLs firmadas completas ni datos personales innecesarios. Retención base: 7 años.

Las operaciones reforzadas incluyen administer, approve, verify, publish, impersonate, credenciales, metodologías, rules, permissions, pack content, erasure y purge. AuditEvent es append-only y no sustituye outbox.

## Evidence/document/file

```text
FileObject (metadata; blob S3 fuera de PostgreSQL)
    ↓ scan PASS
Document → DocumentVersion
Evidence → EvidenceVersion → EvidenceReview
                         ↘ EvidenceLink tipado
EvidenceRequest → EvidenceRequestFulfillment → EvidenceVersion
```

- Upload no equivale a Evidence ni aprobación.
- FileObject usa object key opaco, checksum, MIME declarado/detectado, size, encryption ref, scan y retention.
- EvidenceVersion vincula el período/claim; EvidenceReview decide sufficiency/relevance y aplica SoD.
- EvidenceLink sólo admite Requirement, Control, ControlVersion, RequirementAssessment, ControlAssessment o AssuranceTest.
- EvidenceRequest sólo admite Requirement, Control, RequirementAssessment, ControlAssessment o AssuranceTest.
- NormativeUnit no es target de evidencia de cumplimiento.

## Cadena de lineage

```text
Integration → SyncRun → RawRecord
→ ExternalIdentityBinding/Subject
→ Observation
→ SourceResolution (si aplica)
→ CalculationInput → CalculationRun → MetricMeasurement
→ RuleEvaluation → GRCImpact → objeto de dominio
→ SnapshotItem → Snapshot → ReportRun/Artifact
```

`data.data_lineage` conserva edges tipados y roles. Las tablas especializadas preservan además relaciones fuertes; el grafo es proyección, no segunda autoridad.

## Reproducibilidad

Todo resultado oficial conserva:

- definición/versiones de metric, formula, methodology y rule;
- period/effective time y subject;
- input hash y CalculationRun;
- observations/raw provenance;
- SourceResolution candidates/selected/rejected cuando interviene policy;
- EffectiveConfiguration y sus capas;
- DataQualityAssessment/Data Trust;
- supersession/correction y Snapshot.

IA conserva AIJob, contexto hash, provider `ia2.tcdx.int`, AIRecommendation y AIProvenanceLink tipado. La aceptación sólo referencia un command explícito; nunca convierte output IA en hecho oficial.

## Idempotencia y causalidad

IdempotencyRecord bloquea payload distinto bajo la misma key. La transacción de dominio produce OutboxEvent con correlation/causation. Delivery at-least-once y consumers idempotentes preservan el mismo hecho lógico. Reintentos de raw/observations usan business/dedup keys tenant-scoped.
