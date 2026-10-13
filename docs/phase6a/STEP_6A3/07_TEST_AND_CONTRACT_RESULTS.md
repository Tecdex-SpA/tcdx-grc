# Resultados de pruebas y contratos

Fecha: 2026-10-08. Main / 6af66387aa03fa185ef139584de07700f247b903. Master: TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23. STEP_6A3=PARTIAL_BLOCKED.

| CHECK | RESULT | ACTUAL_EVIDENCE |
| --- | --- | --- |
| Unit/contract | PASS | pnpm test: 505passed,82PGskipped por flags unit; suitesPG se ejecutaron separadas, no contadas como PASSunit |
| Frontend | PASS | pnpm -C apps/frontend test: 98passed, incluidos enunit, no sumar de nuevo |
| PostgreSQL aislado | PASS | 82passed en15files; localhost55432/postgres16/tcdx-grc; flags integration activados; ningúnQA target |
| GRC application browser regression | PASS_LOCAL_API_FIXTURES | 444passed,0skipped/0failed/0flaky, cuatroviewports; baselinehistórica428+16casos nuevos; no QA runtime |
| IAM browser regression | PASS_LOCAL_API_FIXTURES | 256cases, subset de444; managed identity/UI/access/platform-role/onboarding, todos API mock; suiteIAMruntimehistórica21 no ejecutada |
| OpenAPI/operation/Permission/scope | PASS_UNCHANGED_CONTRACTS | Published runtime contract suites enunit + contracts:verify:161operations/56reads/172permissions/237tables/30migrations; no contract API write change |
| Generated vocabulary | PASS | generate-phase6a-vocabularies --check, exact request enum and seedregistry comparisons |
| Typecheck / lint static | PASS | pnpm typecheck; pnpm lint (repository lint is tsc static, no new linttool) |
| Rector integrity | PASS | verify-rector-governance.sh exit0/RECTOR_GATE=PASS; stale historical phase projection not treated as newauthority |
| Secret/domain/whitespace/scope | PASS after final docvalidation | repo secret scan0; source activebad domains0; git diff --check; untracked source/docs checks; originaldocs hashes/governanceprefix/HEAD/index preserved |

Tests nouveaux: reference-read.test.ts incluye tenantlate/cross mismatch, malformed response/cursor,unsupported search/filter/parent, exact Controlversionownership/compatibility y approvedEvidenceVersion/fulfillment typedtarget. reference-selectors.test.tsx verifica source enums y mensajes sanitizados. phase6a-reference-resolution.test.ts compruebaoperationId/path/Permission, cadaenum contraOpenAPI y lifecycleedgescontra09. Cuatro casos browser nuevos ×4 viewports =16: Subjectpaging/search/reset/responsive, controlversions elección explícita/nativekeyboardfocus, temporaryerrorretry/sanitization, revokedpermissionpaging clearscache/selection.

La primera corrida browser detectó selectors de test ambiguos/foco esperado en orden incorrecto; se corrigieron assertions exactas y scope responsive aldrawer sin modificar snapshots ni ocultar regresión. Además se corrigió eliminación de cache403 en código y se probó explícitamente. Corrida final completa444passed. Problema de sandbox localhost se resolvió mediante permisos de tooling local; no red externa QA.

Evidencia visual local en /tmp/phase6a3-grc-visual: cuatro screenshots nuevos phase6a3-selector-*.png y capturas de regresión. No overwrite de artifacts Phase5 versionados; no actualizaciones de baseline ni HUMAN_UI_REVIEW=PASS. Scoped componentresponsive PASS; global shelloverflow previo laptop/tablet no resuelto ni afirmado corregido. Matrices/docchecks se detallan en JSON VALIDATION_RECEIPT; no secrets/userpersonaldata en resultados versionados.


## Continuación correctiva — 2026-10-08

La aprobación funcional RR-G01..04 y regla transversal ya está registrada como DR-6A3-FUNCTIONAL-20261008. La evidencia anterior se conserva como histórica. Decisiones técnicas exactas aún abiertas, alternativas y consecuencias: `docs/phase6a/STEP_6A3/11_CORRECTIVE_CONTRACT_DECISION_PACKET.md`. Matriz de29campos: `docs/phase6a/STEP_6A3/12_CORRECTIVE_VOCABULARY_MATRIX.csv`. Informe/pruebas frescas: `docs/phase6a/STEP_6A3/13_CORRECTIVE_CLOSURE_REPORT.md`. Resultado actual: `docs/phase6a/STEP_6A3/14_STEP_6A3_CORRECTIVE_RESULT.json`; resultado10 anterior no se sobrescribe. STEP_6A3=PARTIAL_BLOCKED;20grupos técnicos CT/CV/CF, aprobación funcional no pendiente. Cambios fuente nuevos=0; ninguna lectura/proyección/Permission o vocabulario DRAFT se presenta aprobado.


## Cierre técnico correctivo autorizado — 2026-10-08

DR-6A3-TECHNICAL-20261008 en15registra direcciónPOaprobada ypublicación técnica pendiente,sin firmas ficticias. CF-01/02implementados/probados:3campos resueltos porretiro/disabled explícitos;60fuentes vocabpreparadas+3CF=63resueltos,26CVbloqueados.4CTaúnbloqueados porpublicación/binding.18definiciones residuales agrupadas en3packets específicos,nolas20anteriores. Localizaciónselectorcentral yfail-closedespañol implementados.509unit/102frontend/82PGlocal/448browserlocal(256IAMsubset)PASS;21IAMrealNOT_EXECUTED. Matrices16/17,informe18 yresultado19son estadoactual; evidencia anteriorpreservada. STEP_6A3=PARTIAL_BLOCKED;6A.4noiniciada.
