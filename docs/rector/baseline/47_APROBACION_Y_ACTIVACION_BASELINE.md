# 47 — Preparación, integridad y activación de sucesoras

## 1. Sucesora identificada

Candidata: `TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16`; predecesora activa: `TCDX_GRC_MASTER_REGENT_BASELINE_v1.11_2026-10-15`.
`STATUS=DRAFT_NOT_EFFECTIVE`; `ACTIVATION=NOT_AUTHORIZED_NOT_PERFORMED`.
Fuente: decisiones expresas DR-GRC-20261016-001/002 del commit2373b5b63a49ddddb47e104947020e4ceb070f64/PR21 y DR-GRC-20261016-003 de la presente conversación. Las tres decisiones no requieren segunda aprobación conceptual.

## 2. Autorización suficiente, sin doble aprobación interna

La instrucción expresa del Product Owner constituye autorización suficiente para las actividades comprendidas en su alcance. No se exige segunda firma, segundo aprobador, comité, revisor humano independiente ni ratificación administrativa interna. La autorización funcional comprende análisis, diseño, contratos ejecutables, backend/frontend necesarios, pruebas, corrección y validación técnica dentro del alcance; Codex mantiene continuidad autónoma. Una contradicción con una directiva interna anterior se reconcilia documentalmente, sin veto administrativo permanente. Se mantienen integridad, hashes, trazabilidad, verificación técnica y límites expresos; registrar la instrucción y los bytes producidos no significa atribuir una firma humana a bytes futuros. Sólo se detiene la operación afectada por un impedimento técnico/de seguridad no resoluble en alcance, una restricción externa con fuente y aplicabilidad concreta, o una exclusión expresa. No se inventan obligaciones, revisores ni responsables. Esta regla no amplía alcance ni autoriza arquitectura arbitraria, deuda o despliegues excluidos.

No se exige como trámite adicional decisión por cada hash derivado, ratificación de diseño ya decidido, segunda firma técnica ni declaración de otras funciones del PO. Se identifica el alcance realmente autorizado y se calculan manifiestos de los bytes producidos. No se afirma que esos hashes fueron firmados por el PO cuando no lo fueron. READY_FOR_PO_REVIEW significa artefactos concretos disponibles para lectura, no necesidad de una segunda autorización para completar el trabajo incluido.

## 3. Controles documentales y técnicos conservados

Entregar51 documentos completos, SHA256SUMS y manifest de paquete que enumere baseline, contratos candidatos, fuentes/recibos, deltas, criterios6A3, impacto y verificador. Verificar integridad, inventario sin extras, coherencia, referencias, ausencia de secretos, compatibilidad física y preservación de la predecesora/historia. No se cambia una fila publicada ni se fabrica aprobación histórica. Los gates técnicos no se dispensan.

## 4. Operación de activación y publicación

Una futura instrucción que incluya activación permite su ejecución técnica con los hashes/alcance registrados, sin nueva aprobación conceptual ni ratificación administrativa. Si la instrucción la excluye, no se activa. Esta tarea la excluye expresamente: BASELINE_ID, BASELINE_STATUS, ACTIVE_ACTIVATION.json, RECTOR_MANIFEST.sha256, AGENTS/enforcement/status activos permanecen intactos. Sólo existen propuestas de esos textos y checklist de concordancia, sin acto ni fecha efectiva inventados.
Antes de integrar main siguen CI/protección de rama y revisiones técnicas automatizadas aplicables; no se inventa segundo humano interno. Una obligación externa de independencia sólo se exige si se demuestra su fuente y aplicabilidad. Commit/push/merge/despliegue y cambios de DB no se ejecutan por la preparación; en esta tarea están expresamente excluidos.

## 5. Límites de producto y pasos siguientes

Se preservan el modelo canónico y físico aprobado, contratos de backend/frontend y su evolución trazable autorizada, IAM/RBAC, mínimo privilegio, aislamiento multi-tenant, integridad transaccional, auditoría, seguridad, privacidad e historia. La gobernanza interna del desarrollo es distinta de la SoD operacional que ofrece GRC a los clientes: Evidence submit/approve, Action complete/verify, risk acceptance, Audit y credenciales conservan sus policies y actores cuando correspondan. No hay permiso, grant, estado, tabla ni excepción operacional nueva por esta regla.

La futura implementación consume contratos formalmente vigentes y manifiestos de datos exactos que correspondan; no usa el texto candidato como un permiso operativo. Los detalles temporales/comerciales pendientes se acotan al binding futuro de esa función. STEP_6A3=PARTIAL_BLOCKED y STEP_6A4=NOT_STARTED. Las evidencias/aprobaciones previas permanecen históricas; no se cierran H01–H10 por esta preparación.
