# 47 — Aprobación y activación del baseline maestro

## Decisión

El 2026-09-23 la autoridad humana activó `TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23` como baseline rectora vigente sobre v1.6. La baseline v1.6 se preserva completa e inmutable bajo `docs/rector/history/TCDX_GRC_MASTER_REGENT_BASELINE_v1.6_2026-09-23/`.

El amendment v1.7 incorpora exclusivamente `FileUploadIntent` como coordinación durable previa a `FileObject`; `audit.lifecycle.evidence_request.fulfill.v1` como único audit code de fulfillment; y `controlAssessmentSubmit` con `owned_object`/`tenant`, sin assignee ni ownership inferido. La aprobación autoriza la reconciliación rectora, física, contractual y runtime necesaria para cerrar Fase 5, incluida la migración forward-only `20260923000200_phase5_final_closure.sql`. No autoriza modificar migraciones aplicadas, commit, push, PR, merge, producción ni Fase 6.

## Estado de gates al publicar

- `RECTOR_DOCUMENT_CONSISTENCY=PASS`
- `SEMANTIC_CONFLICTS=0`
- `UNRESOLVED_ARCHITECTURAL_FINDINGS=0`
- `SCOPE_EXPANSIONS=0`
- `CODEX_VARIATION_BUDGET=ZERO`
- `RECTOR_BASELINE=PASS`
- `RECTOR_V1_6_HISTORY=PROTECTED_IMMUTABLE`
- `PHYSICAL_MODEL_AMENDMENT=AUTHORIZED_PHASE5_FINAL_CLOSURE_ONLY`
- `EXECUTABLE_CONTRACTS=AUTHORIZED_PHASE5_FINAL_CLOSURE_ONLY`
- `MIGRATIONS=AUTHORIZED_FORWARD_ONLY_20260923000200`
- `FUNCTIONAL_DEVELOPMENT=AUTHORIZED_PHASE5_FINAL_CLOSURE_ONLY`
- `PHASE_6=BLOCKED`
- `COMMIT_PUSH_PR_MERGE_PRODUCTION=BLOCKED`

Fuera de este cierre acotado aplica fail-closed y `CODEX_VARIATION_BUDGET=ZERO`. La revisión humana previa a commit sigue siendo el siguiente gate de integración.
