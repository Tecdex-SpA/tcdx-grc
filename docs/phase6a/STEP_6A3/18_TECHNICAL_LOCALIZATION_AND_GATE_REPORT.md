# STEP6A.3 — localización, filtros y gates técnicos

2026-10-08;main/6af66387aa03fa185ef139584de07700f247b903;TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23. STEP_6A3=PARTIAL_BLOCKED;RECTOR_GATE=BLOCKED por autoridad técnica residual,integridadPASS yconflictos rectores0. DR15 separa dirección aprobada de publicación/revisión no verificada. Matrices16CTy17CV/CF son proyección actual; originales1–14 e inventarios6A.1/2 conservan evidencia histórica.

## Cambios y trazabilidad

- `apps/frontend/src/core-grc.tsx`: CF-01 elimina estados/affordances/query emissions deapplicability/implementation; conserva columnas/datos. CF-02 deshabilita estadoControls, conserva opción neutra Todos sin opciones activas, vincula explicación española por aria-describedby; guard deconsulta evita lifecycle incluso ante estado local manipulado. Otros módulos conservan filtros publicados.
- `apps/frontend/src/i18n/es.ts`: copycentral de selección/búsqueda/carga/retry/error/empty/prerequisites/lifecycle indisponible; empresa sustituye tenant en mensajes intervenidos. Regla española obligatoria no modifica código deTenantContext/API.
- `apps/frontend/src/i18n/display-text.ts`: extiende localización central existente para valores realmente publicados enFORM_VOCABULARIES ySubjecttypes rector16. No catálogo nuevo ni nueva opción de escritura. publishedOptionLabel devuelveundefined para valor sin traducción; separa effective como conclusión(Efectivo) de lifecycle(Vigente). Números no requieren traducción. Las14familias sin fuente no reciben valores inventados.
- `apps/frontend/src/reference-read.ts`: etiquetas Subject tipo/estado traducidas; no muestra canonical_key técnico como sustituto del nombre empresarial ni UUID. Nombre oficial/código empresarial autorizado conserva su contenido; no se traduce texto libre mediante heurísticas. Tipo/estado sin traducción produce gap explícito en vez de inglés definitivo. No cambio deparams/API/auth/payload/persistencia.
- `apps/frontend/src/reference-selectors.tsx`: usa uiText ylabels centrales; opción contractual sin traducción se deshabilita con mensajeespañol, manteniendo value canónico. Si falla localización de referencia, limpia cache/selección y muestra LOCALIZATION_UNAVAILABLE, sin fallback inglés. Componentes8 ytipos18preservados; no nuevos endpoints ni grants.

Pruebas modificadas: `apps/frontend/src/reference-read.test.ts`, `apps/frontend/src/reference-selectors.test.tsx`, `e2e/core-grc-ui.spec.ts`.4casos unitarios nuevos verifican cobertura de todos losrequestenum/estados publicados, contexto lingüístico, value intacto, tipos/estados desconocidos fail-closed y nombres/códigos preservados.1caso browser×4viewports verifica selección no habilitada y ausencia del valor inglés/UUID cuando falta traducción. Caso existenteControls verifica columnas conservadas, filtros retirados/disabled, explicación y todas las peticiones iniciales/búsqueda sinlos3parámetros; casos deerror/denegación/paginación/stalecontinúan.

## Pruebas ejecutadas

| Gate | Resultado actual |
| --- | --- |
| Unit/contract | 509PASS;82PGskipped enunit se ejecutan separadas |
| Frontend | 102PASS,subset de509 |
| PostgreSQL aislado | 82PASS/15files;127.0.0.1:55432, noQA |
| GRC/browser | 448PASS,0skipped/0failed/0flaky,4viewports/APIfixtures locales |
| IAM UI | 256PASSsubset de448;21realIAMhistóricosNOT_EXECUTED/noimpactIAM |
| RBAC/tenant/entitlement/scope/ObjectPolicy/SoD | PASS_IMPLEMENTED_EXISTING_SCOPE; no ejecución deoperacionesDRAFT inexistentes |
| OpenAPI/matriz/Permission/contractverify | PASS_EXISTING_UNCHANGED;161ops/56reads/172permissions/237tables/30migrations |
| Rector integrity | PASS; proyección histórica delverifier no altera cierrePhase5 ni autorización actual |
| Typecheck/lint | PASS;lint=TypeScriptstatic vigente |
| Generated vocabulary --check | PASS |
| CSV/JSON/sourcepath/reference/scope/secrets/domain/diff | Receipt final en19 |

PrimeraE2E:432passed/16failed porassertions contenant yfixtures deSubjectperson sin traducción publicada. Se actualizaron expectativas almensaje autorizadoespañol yfixtures aprocess, tipo canónico rector16. No se ocultó error de aplicación ni se modificaron snapshots. Repetición íntegra448PASS. Logs `/tmp/phase6a3-technical-*.log`,report `/tmp/phase6a3-technical-e2e.json`,capturas `/tmp/phase6a3-technical-visual`. No evidencia anterior reemplazada.

Inspección de capturas scopedControls narrow yselector desktop: copy español, filtrodisabled explicado, columnas retenidas en tabla conscroll horizontal, tokens/layoutexistentes preservados. Capture/viewports ykeyboard/label regresión local pasan; no revisión humanaQA ni HUMAN_UI_REVIEW=PASS. Manifest/brand/baselinehashes preservados. SPANISH_UI_GATE=PASS_INTERVENED_COMPONENTS_ONLY, no auto-declaración de plataforma completa traducida:formularios/rawJSON/IDs/otrasuperficies aún pertenecen a6A.4 yno se adoptan aquí. Brecha real de nomenclatura/traducción futura se documenta y no se transforma en opción inglesa definitiva.

## Estado real y decisiones residuales

Vocab89=60fuentes contractuales preparadas+3comportamientosCFaprobadosresueltos+26camposCVbloqueados.63RESOLVED no significa63catálogos ni89campos implementados enformularios. CFno cambia cantidad histórica42forms/361fields/95IDs/3JSON/29links.51inputs y76ocurrencias deID listas paraadopción siguenbase; noIDsremovidos niJSONrediseñado ni enlaces6A.5nuevos.38dependencias y2relacionesno soportadas se preservan.

CT1/3/4APROBADO_PERO_REQUIERE_PUBLICACION;CT2SIN_AUTORIDAD_DE_BINDING_DEMOSTRADO. Sin endpoints/Permission nueva implementados.18definiciones residuales(4CT+14CV), agrupadas en3packets concretos con opción recomendada,texto deaprobación y evidencia enDR15. No se vuelve a solicitar dirección funcional niCF ya aprobados. Ninguna firma ficticia/permiso implícito/política global porownership/inactiveassignmentrule/writehardening.

5runtimefrontend+3tests modificados enesta continuación;backend,executableHTTP,Permission catalog,registry/grants,physicalmodel,DB/IAM,infrastructure/deploymentcontracts sin cambios. No migraciones/QA/commit/push/PR/merge/deploy. Worktreeprevio íntegro salvo ediciones autorizadas sobre archivosfrontend/tests preexistentes; fuentesnointervenidas yprefijosdoc/historial/hashpreservados.

PHASE_5=PASS;PHASE_5_CLOSED=YES;PHASE_6A=IN_PROGRESS;STEP_6A4/5/6=NOT_STARTED;RISK_RUNTIME/INCIDENTS_LOSS_RUNTIME=NOT_STARTED. TASK_PACKET_STATUS=COMPLETE_FOR_IMPLEMENTED_CF_AND_LOCALIZATION/BLOCKED_FOR_RESIDUAL_CT_CV;CODEX_VARIATION_BUDGET=ZERO;ASSUMPTIONS_INTRODUCED=NONE;fuera de alcance modificado=NONE. NoQA/human-runtimegateaprobada.
