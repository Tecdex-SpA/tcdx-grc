# Revisión física técnica — candidata INITIAL_SOURCE

`TECHNICAL_STRUCTURAL_REVIEW=PASS_LIMITED; HUMAN_DATA_MODEL_DICTAMEN=PENDING`
`FINAL_NO_MIGRATION_GATE=NOT_APPROVED; NEW_IMPLEMENTATION_PG16_TESTS=NOT_RUN`

Fuente de diseño PO aprobada: `INITIAL_RETENTION_SOURCE_BOOTSTRAP_DELTA_DRAFT_20261015.md`, SHA `1a133d60e576208eefc90d68ff39df903df829f3c9ab1b3c51fa06d8c826913b`. Esta revisión es preparación técnica para Data Model Owner; Codex no firma su dictamen. R2 conserva SHA `b2a5bc73f75d7f95fb7ba5068f1b3ea77a923d7da7501446d05455ee545ec523`. No se ejecutó DDL ni se modificó el manifest34 QA.

## Correspondencia del diseño con estructuras existentes

| Necesidad | Representación física disponible | Comprobación / límite |
|---|---|---|
| Custodia draft | `privacy.retention_policy_applicabilities` con lifecycle draft, tenant/policy, contexto/clasificación/purpose y autor | FK de cadena no impone published; ese requisito está en contrato/backend. No se elimina FK ni se permite NULL nuevo. |
| Cadena fuente | FK `retention_policy_applicability_id` en intent/file/EvidenceVersion; FK de policy/tenant y guard de concordancia | Los tres objetos conservan la misma aplicabilidad existente; Evidence y DocumentVersion conservan sus identidades. |
| Bind | source_evidence_version_id, source_clause_ref, effective_from/to y row_version de aplicabilidad ya existen | Guard R2 admite draft→draft con incremento de versión y preserva identidad/policy/autor/versión; el nuevo comando sólo consume esos campos. No se agrega timestamp ni author alternativo. |
| SoD por objeto | Autor de aplicabilidad, autor de EvidenceVersion, EvidenceReview.reviewer_membership_id y TenantMembership.UserIdentity | El custodio y autor documental pueden ser distintos sin nueva entidad; la igualdad de identidades se comprueba por objeto y tenant. La existencia de columnas no concede permisos. |
| Audit/replay | AuditEvent y registro idempotente canónicos existentes | Un código AuditEvent nuevo requiere catálogo ejecutable aprobado; no nueva tabla, enum físico o grant. El rollback y unicidad de auditoría se probarán con implementación futura. |
| Fuente pendiente y consumo | FK a aplicabilidad no publicada + cadena/roles existentes | Estado derivado de columnas existentes, sin flag/purpose/JSON de autoridad ni backfill. Los consumers necesitan guard nuevo aprobado, no una columna nueva. |

## Evidencia PostgreSQL16 aislada

Consulta `BEGIN READ ONLY` conservada en `docs/phase6a/STEP_6A3/evidence/po-approved-initial-source-20261015/isolated-physical-read.sql` y `.json`. Identidad: base tcdx-grc, PostgreSQL16, puerto aislado55437. Sus tres funciones `privacy.c04w_guard_applicability`, `evidence.c04w_guard_file_chain` y `privacy.c04w_guard_hold_release` tienen cuerpo exactamente igual al SQL R2 local sellado. Columnas, constraints y triggers se conservan en el recibo, sin filas jurídicas o credenciales.

El entorno aislado tiene242 tablas de contrato más `platform.schema_migrations` (243 incluyéndola), sin tablas contractuales faltantes. Su ledger tiene33 entradas, no se presenta como ledger QA34. R2 estructural ya está presente; no se insertó una entrada ficticia ni se volvió a aplicar SQL para alterar el contador. Esta inspección no acredita runner/rebuild completo ni ejecución del nuevo workflow. Resultado y comparación: `physical-compatibility-result.json`.

## Dictamen solicitado, sin firma anticipada

Data Model Owner debe decidir por los bytes de este informe y los contratos candidatos: confirmar que el diseño propuesto consume exclusivamente las estructuras R2 existentes y autorizar su implementación sin DDL previsto, sujeto a las pruebas positivas/negativas aisladas del flujo tras publicación válida. Especificar identidad, función ejercida, fecha y decisión real. Si las pruebas muestran necesidad de tabla/columna/constraint/trigger distintos, detener implementación dependiente y volver a decisión; no modificar R2. Las pruebas no pueden ser declaradas PASS desde este documento.

No se reabre la aprobación física R2 anterior ni se cambia su freeze; se revisa exclusivamente el impacto de la nueva excepción contractual. Estado hasta el acto y pruebas exigibles: dictamen humano pendiente y ausencia de migración sólo prevista.
