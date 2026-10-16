# Componentes de selección y consumo6A.4

Fecha: 2026-10-08. Main / 6af66387aa03fa185ef139584de07700f247b903. Master: TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23. STEP_6A3=PARTIAL_BLOCKED.

| COMPONENT | INTERFACE / POLICY | AVAILABILITY |
| --- | --- | --- |
| EntityReferenceSelect | api/entity/value/onChange/context/disabled/permissionState; 16 readers tipados, filtros por entidad; backend único authority | Disponible; Membership/Retention sólo autoridades existentes, no solución transversal RR |
| SubjectSelect | Subject activo/effective del endpoint; nombres/tipos/canonical key autorizados; búsqueda explícita y cursor | Integrado como reemplazo del picker existente, sin cambio de contrato/create fields |
| MethodologySelect | domain compliance/controls; published/effective por servidor; sin default inventado; paginación | Integrado como reemplazo del selector existente |
| ControlVersionSelect | ownership reference/tenant; parentControlId opcional; controlGet verifica ID/ownership/parent/version; elección explícita incluso única | Reemplaza picker existente de instantiate; tenant variant listo para6A.4 |
| EvidenceVersionSelect | evidenceId y requestId opcional; approved, request open y exactamente un typed target; versionGet.links matching; server valida scan/command final | Listo para6A.4, sin sustituir UUID de formularios actuales |
| ContractVocabularySelect | schemaField tipado de asset generado; enum por request exacto, labels españoles; sin unknown strings convertidos en enum | Disponible para6A.4; priority/severity/SoAitem scales permanecen bloqueadas |
| LifecycleFilterSelect | sólo entidades con edges publicados en09_SEED_MANIFESTS; no transiciones de estado desde selector | 10 entidades publicadas; filtro Control bloqueado U-CONTROL-LIFECYCLE |
| ReferenceState | NO_RECORDS / NO_ELIGIBLE_RECORDS / NO_PERMISSION / MISSING_CONFIGURATION / CATALOG_NOT_PUBLISHED / TEMPORARY_READ_FAILURE | Mensajes reutilizables, sin SQL/UUID/stack/error content |

El picker de presentación es privado: ninguna prop permite API path arbitrario, filtro global o auth grant. initial value se verifica contra opciones autorizadas (recorre cursor hasta encontrarlo o descartarlo); nunca muestra UUID como etiqueta. Cambiar tenant/parent/query/permission invalida opciones/selección; abort y chequeo tenant descartan respuestas tardías. Denegación401/403 en paginación elimina datos cacheados y selección; no leak bajo revocación. Error temporal permite retry; no fallback.

search usa button type=button para no anidar forms ni submit involuntario. IDs useId y htmlFor, aria-describedby, native select, focus y controles disabled accesibles. CSS scoped min-width/max-width/gap reutiliza estilos del drawer. Pruebas responsive miden drawer-body/picker; overflow del shell histórico laptop/tablet no se presenta como corregido por6A.3. Brand/layout/visualv1.0 conservados; HUMAN_UI_REVIEW no aprobado.

API currentTenantId sólo expone contexto seleccionado existente; no otorga autoridad. READ capability20 y reference option kinds18 no equivalen a95 campos corregidos. FIELD_ID/FORM_ID readiness en05. Ninguna entidad relacionada creada silenciosamente; business codes siguen caller-owned; JSON y29 links quedan6A.4/5.

## Contexto de los42 formularios, incluidos cero-input

FORM_ID conserva6A.2. Las filas read/filter se relacionan con sus formularios por workspace para preparación de contexto/labels; no significa serializar todos esos fields en cada request. Target/concurrency de comandos se obtiene desde detalle autorizado; códigos/UUID/expected_version nunca inputs empresariales nuevos. Formularios cero-input sólo necesitan contexto técnico interno y confirmación empresarial en6A.4/5.

| FORM_ID | Operation | Infraestructura de referencia/contexto |
| --- | --- | --- |
| FORM-01 | applicabilityCreate | Ver FIELD_ID en05; source READY o contrato bloqueado por fila; adopción no iniciada |
| FORM-02 | applicabilitySubmit | Ver FIELD_ID en05; source READY o contrato bloqueado por fila; adopción no iniciada |
| FORM-03 | applicabilityApprove | Leer target/version del detalle existente; ninguna referencia manual adicional |
| FORM-04 | requirementAssessmentCreate | Ver FIELD_ID en05; source READY o contrato bloqueado por fila; adopción no iniciada |
| FORM-05 | requirementAssessmentStart | Leer target/version del detalle existente; ninguna referencia manual adicional |
| FORM-06 | requirementAssessmentSubmit | Ver FIELD_ID en05; source READY o contrato bloqueado por fila; adopción no iniciada |
| FORM-07 | requirementAssessmentApprove | Leer target/version del detalle existente; ninguna referencia manual adicional |
| FORM-08 | soaCreate | Ver FIELD_ID en05; source READY o contrato bloqueado por fila; adopción no iniciada |
| FORM-09 | soaPublish | Ver FIELD_ID en05; source READY o contrato bloqueado por fila; adopción no iniciada |
| FORM-10 | controlInstantiate | Ver FIELD_ID en05; source READY o contrato bloqueado por fila; adopción no iniciada |
| FORM-11 | controlAssessmentCreate | Ver FIELD_ID en05; source READY o contrato bloqueado por fila; adopción no iniciada |
| FORM-12 | controlAssessmentStart | Leer target/version del detalle existente; ninguna referencia manual adicional |
| FORM-13 | controlAssessmentSubmit | Ver FIELD_ID en05; source READY o contrato bloqueado por fila; adopción no iniciada |
| FORM-14 | controlAssessmentReview | Leer target/version del detalle existente; ninguna referencia manual adicional |
| FORM-15 | controlAssessmentApprove | Leer target/version del detalle existente; ninguna referencia manual adicional |
| FORM-16 | assuranceTestCreate | Ver FIELD_ID en05; source READY o contrato bloqueado por fila; adopción no iniciada |
| FORM-17 | assuranceTestStart | Leer target/version del detalle existente; ninguna referencia manual adicional |
| FORM-18 | assuranceTestExecute | Ver FIELD_ID en05; source READY o contrato bloqueado por fila; adopción no iniciada |
| FORM-19 | assuranceTestReview | Leer target/version del detalle existente; ninguna referencia manual adicional |
| FORM-20 | assuranceTestApprove | Leer target/version del detalle existente; ninguna referencia manual adicional |
| FORM-21 | evidenceRequestCreate | Ver FIELD_ID en05; source READY o contrato bloqueado por fila; adopción no iniciada |
| FORM-22 | evidenceRequestFulfill | Ver FIELD_ID en05; source READY o contrato bloqueado por fila; adopción no iniciada |
| FORM-23 | evidenceCreate | Ver FIELD_ID en05; source READY o contrato bloqueado por fila; adopción no iniciada |
| FORM-24 | evidenceSubmit | Leer target/version del detalle existente; ninguna referencia manual adicional |
| FORM-25 | evidenceReviewStart | Leer target/version del detalle existente; ninguna referencia manual adicional |
| FORM-26 | evidenceApprove | Ver FIELD_ID en05; source READY o contrato bloqueado por fila; adopción no iniciada |
| FORM-27 | evidenceReject | Ver FIELD_ID en05; source READY o contrato bloqueado por fila; adopción no iniciada |
| FORM-28 | retentionPolicyCreate | Ver FIELD_ID en05; source READY o contrato bloqueado por fila; adopción no iniciada |
| FORM-29 | retentionPolicyUpdate | Ver FIELD_ID en05; source READY o contrato bloqueado por fila; adopción no iniciada |
| FORM-30 | retentionPolicyReview | Leer target/version del detalle existente; ninguna referencia manual adicional |
| FORM-31 | retentionPolicyApprove | Leer target/version del detalle existente; ninguna referencia manual adicional |
| FORM-32 | retentionPolicyPublish | Leer target/version del detalle existente; ninguna referencia manual adicional |
| FORM-33 | issueCreate | Ver FIELD_ID en05; source READY o contrato bloqueado por fila; adopción no iniciada |
| FORM-34 | issueTriage | Ver FIELD_ID en05; source READY o contrato bloqueado por fila; adopción no iniciada |
| FORM-35 | issueStartRemediation | Leer target/version del detalle existente; ninguna referencia manual adicional |
| FORM-36 | issueRequestVerification | Leer target/version del detalle existente; ninguna referencia manual adicional |
| FORM-37 | issueVerifyClose | Ver FIELD_ID en05; source READY o contrato bloqueado por fila; adopción no iniciada |
| FORM-38 | actionCreate | Ver FIELD_ID en05; source READY o contrato bloqueado por fila; adopción no iniciada |
| FORM-39 | actionStart | Leer target/version del detalle existente; ninguna referencia manual adicional |
| FORM-40 | actionSubmitForReview | Leer target/version del detalle existente; ninguna referencia manual adicional |
| FORM-41 | actionComplete | Ver FIELD_ID en05; source READY o contrato bloqueado por fila; adopción no iniciada |
| FORM-42 | actionVerify | Ver FIELD_ID en05; source READY o contrato bloqueado por fila; adopción no iniciada |

Validación de campo: wrappers aceptan required/invalid y native required + aria-invalid; mensaje de selección inválida enlazado al control, sin texto de error técnico. El formulario6A.4 conserva validación por schema/condición y serialize values canónicos; componente no concede permisos ni completa opcionales en silencio.


## Cierre técnico correctivo autorizado — 2026-10-08

DR-6A3-TECHNICAL-20261008 en15registra direcciónPOaprobada ypublicación técnica pendiente,sin firmas ficticias. CF-01/02implementados/probados:3campos resueltos porretiro/disabled explícitos;60fuentes vocabpreparadas+3CF=63resueltos,26CVbloqueados.4CTaúnbloqueados porpublicación/binding.18definiciones residuales agrupadas en3packets específicos,nolas20anteriores. Localizaciónselectorcentral yfail-closedespañol implementados.509unit/102frontend/82PGlocal/448browserlocal(256IAMsubset)PASS;21IAMrealNOT_EXECUTED. Matrices16/17,informe18 yresultado19son estadoactual; evidencia anteriorpreservada. STEP_6A3=PARTIAL_BLOCKED;6A.4noiniciada.
