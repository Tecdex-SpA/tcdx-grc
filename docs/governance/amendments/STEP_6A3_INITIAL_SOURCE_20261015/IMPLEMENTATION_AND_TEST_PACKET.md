# Task packet cerrado — implementación INITIAL_SOURCE tras publicación

`STATUS=PREPARED_NOT_EXECUTABLE_BEFORE_GATES; IMPLEMENTATION=NOT_STARTED`
`TASK_ID=STEP6A3-INITIAL-SOURCE-V111; CODEX_VARIATION_BUDGET=ZERO`

Autoridad: diseño PO SHA1a133d60e576208eefc90d68ff39df903df829f3c9ab1b3c51fa06d8c826913b y recibo PO_DESIGN_APPROVAL_RECEIPT_20261015.json. Este packet deriva el diseño; requiere aprobación por nuevos bytes, activación rectora, dictamen Data y publicación ejecutable antes de código dependiente. No es un nuevo acto de consentimiento humano ni autoridad de deploy.

## Límites y archivos previstos

- `apps/backend/src/core-grc/retention-applicability.ts`: predicado específico de custodia pendiente separado del predicado ordinario, con locks de contexto compatibles con el advisory lock R2; sin excepción por ID/fecha/cliente. Ambos vuelven a resolver policy/contexto al decidir.
- `service.ts`: request-upload/finalize/EvidenceCreate y submit de fuente; bind draft→draft con source/cláusula/intervalo reales; revalidar source antes de approve/publish; aplicar restricciones de consumo donde el servicio resuelve EvidenceVersion para negocio. Conservar actor documental real y autor del draft, CAS/replay/audit y compensación storage.
- `routes.ts`, `model.ts`, `repository.ts`, `reference-reads.ts` y sus resolvers concretos afectados: ruta bind200, headers/body cerrado y proyección/selección acotada. Identificar consumidores de EvidenceVersion en servicio/referencias/regulatory sólo si efectivamente consumen la misma fuente; no crear un segundo motor o wrappers legacy. No agregar lecturas públicas nuevas sin decisión.
- `packages/contracts/src` y generadores canónicos: consumir las sucesoras publicadas y regenerar sólo assets derivados exigidos; no convertir tests en autoridad. Bind no añade arista/grant ni requiere publicación M2M de nuevo.
- Frontend: `api-client.ts`, `core-grc.tsx`, selectores/referencias existentes e i18n de campos necesarios; acción «Vincular fuente inicial» y advertencia de pendiente. Leer contrato visual activo y usar assets locales aprobados antes de editar. No rediseño ni nuevas pantallas.
- Pruebas focalizadas previstas (archivos nuevos aún no creados): `apps/backend/src/core-grc/initial-retention-source.test.ts`, `apps/backend/src/core-grc/initial-retention-source.postgres.test.ts`, `packages/contracts/src/initial-retention-source-contract.test.ts` y `e2e/initial-retention-source.real.spec.ts`; extender además los tests existentes de rutas, referencias y UI afectados. No crear los tests de comportamiento ni ejecutar código dependiente antes de contratos efectivos. Los paths previstos no acreditan existencia ni ejecución.

Prohibidos: baseline/históricos ya sellados, contrato27 histórico, metodologíasv1, R2, expected-schema y migrations manifest sin una nueva necesidad/decisión física, IAM/grants/roles/seeds, sourceKind/purpose nuevos, flags, tenants ficticios, datos jurídicos sintéticos QA, infra/DNS/producción. Preservar dos under_review, EvidenceVersion effective_fromNULL y todos los resultados históricos. La dirección comercial12meses está fuera de esta implementación.

## Matriz focalizada de aceptación futura — todos NOT_RUN para este delta

| Capa / caso | Ejecución requerida / resultado |
|---|---|
| PG16 aislado positivo | Datos técnicos efímeros identificados como fixtures aislados, nunca QA jurídica; draft del custodio→intent/file/version del autor documental→EvidenceReview de tercero→bind→revisión/aprobación/publicación. FK/tenant/policy/clasificación/contexto exactos, sin DDL y rollback verificable. |
| RBAC/SoD | DENY anónimo/M2M/Platform, sin permiso/capability/scope, tenant ajeno; autor del documento no aprueba su Evidence; autor de draft no aprueba aplicabilidad. Positivo con dos actores distintos y permisos reales por operación; no hardcode por membership. |
| Fuente/custodia | DENY source inexistente/no vigente/no aprobada/no scan-PASS, hash/storage erróneos, draft ajeno sin actor documental autorizado, policy hold/no publicada/vencida, contexto/clasificación/policy discordantes y primaria ordinaria ya elegible. Pasos intermedios no crean legitimidad jurídica. |
| Tres revalidaciones | Repetir guards en request, finalize y EvidenceCreate; caller no puede insertar nullFK, cambiar target source ni elegir storagekey. Carreras con nueva primaria/publicación/submit: revalidación bajo locks y DENY sin efectos parciales. |
| Consumo | Excluir cadena pendiente de selección/evaluación ordinarias, EvidenceRequest/fulfill y referencias donde aplique; permitir sólo review fuente y bind exacto. Approval de Evidence por sí solo no permite evaluación ni purge. Publicación posterior no inventa typed links de negocio. |
| Bind |200 tras COMMIT; sólo source/cláusula/intervalo/row_version; auditar una vez. Replay con mismo actor/key/body reautoriza y no duplica fila/versión/audit; key/body distintos, CAS vencido, source ya vinculada y estado no draft:409. Falla de audit produce rollback completo. |
| Temporalidad/hold | No fuente caduca/futura fuera de contrato, ni from técnico inferido, ni to≤from. Hold concurrente sigue bloqueando purge; bind no libera hold ni borra objetos. No se crea un comando nuevo de purge. |
| CFG-D/historia | Regresión del guard de suficiencia existente, EC opcional sin none, no resultado valid por mero caller; nuevos diagnósticos no reescriben aprobados. Comparar fingerprints e IDs/versiones históricos antes/después de QA. |
| HTTP/frontend/E2E | Schema bind cerrado/headers/CAS,401/403/404/409/422 contractuales, estados y etiquetas españolas, actor/custodio claros, loading/empty/error/conflict, ausencia de consumo indebido; escritorio/estrecho/foco. Simulación local y QA real se etiquetan por separado. |
| QA auténtica | Sólo documento real autorizado con origen/cláusula/contexto/vigencia y sesiones humanas legítimas. Conservar request path/method/status/correlation, hashes de respuestas y auditoría/lineage; no tokens/cookies/URL firmada/blob. Si faltan actores/source/sesión: NOT_RUN. |

Secuencia: publicación rectora/ejecutable y dictamen físico→implementación mínima→typecheck, contratos, pruebas focalizadas aisladas y UI→seguridad/diff/secret checks de cambios→build inmutable→Release QA por artefactos exactos→smoke/E2E QA auténticos→H01–H10→cierre rector→entrada6A4. Las pruebas anteriores sin cambio de fuente se reutilizan; sólo ampliar por falla o riesgo concreto.

No se declara un gate PASS por este plan. Owners de autorización y evidencia están en HUMAN_GATE_DECISION_FORM.md y QA_DEPLOY_AND_CLOSEOUT_RUNBOOK.md.
