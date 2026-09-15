# Reporte de revisión del modelo físico

Estado: `DRAFT_CANDIDATE_FOR_HUMAN_REVIEW`

```text
BASELINE_INTEGRITY=PASS
RECTOR_COVERAGE=175/175
UNMAPPED_CANONICAL_ENTITIES=0
UNMAPPED_PERSISTENCE_REQUIREMENTS=0
UNSOURCED_PHYSICAL_OBJECTS=0
SEMANTIC_INFERENCES=0
TENANT_ISOLATION_GAPS=0
RBAC_GAPS=0
TEMPORAL_GAPS=0
AUDIT_GAPS=0
EVIDENCE_LINEAGE_GAPS=0
NORMATIVE_MODEL_GAPS=0
OPEN_BLOCKERS=0
```

`PHYSICAL_DATA_MODEL_DESIGN=CANDIDATE_READY_FOR_HUMAN_REVIEW`

Esto no equivale a `PHYSICAL_DATA_MODEL_REVIEW=PASS`.

## Auditorías internas

| Auditoría | Resultado | Evidencia |
|---|---|---|
| A — Canonical → Physical | PASS documental | 175 entidades únicas de 33 mapeadas en 01/12; relaciones persistentes de 30/44 en 02 |
| B — Physical → Rector | PASS documental | todo objeto de 01/02 tiene referencia en 12 o decisión técnica neutral PDM-D001..014 |
| C — Cross-cutting | PASS documental | 03–09 cubren tenant, RBAC, tiempo, audit, evidence, lineage, lifecycle, normativa, config, sufficiency, reporting, IA y retención |
| D — Freeze readiness | PASS documental | perfiles + catálogo de tablas + relaciones + tipos + constraints permiten generar DDL sin decisión semántica nueva |

## Validaciones críticas

- No existe entidad física `Result`, `DomainResult` o `Clause`.
- FrameworkVersion → NormativeUnit → Requirement queda separado y restringido.
- RequirementApplicability y StatementOfApplicabilityItem son objetos distintos.
- RequirementControlMapping y NormativeUnitControlMapping son relaciones distintas.
- EvidenceLink, EvidenceRequest e IssueOrigin usan FKs tipadas.
- Eventos/auditoría condicionan `tenant_id` por `ownership_class` sin tenant artificial.
- Tenant ownership permanece distinto de Organization/Subject scope.
- Definiciones globales y datos tenant derivados preservan ownership y lineage.

## Aprobación requerida

Revisores: Data Model Owner y Architecture Owner. Security & Privacy Reviewer debe revisar aislamiento, retención, erasure y clasificación. La aprobación, identidad, fecha y evidencia deben registrarse fuera de este baseline documental antes de cualquier Fase 2/DDL.
