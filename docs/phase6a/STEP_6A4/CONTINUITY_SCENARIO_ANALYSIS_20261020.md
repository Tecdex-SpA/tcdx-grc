# STEP6A4 — continuidad temporal del diagnóstico, 2026-10-20

**Trabajo activo, NO cierre.** Este handoff fue solicitado expresamente por el usuario para poder continuar desde otra cuenta Codex si se agota el uso. No es memoria persistente ni aprobación humana. No contiene secretos.

## Objetivo y límites actuales

Finalizar la tarea «QA SCENARIO UNBLOCKING AND HUMAN ACCEPTANCE PREPARATION»: diagnóstico de42 operaciones/95 referencias, actores/permisos efectivos, dependencias, escenarios y plan mínimo de aceptación. Sólo lecturas QA no destructivas y nueva documentación en docs/phase6a/STEP_6A4. PROHIBIDO modificar aplicación/contratos/baseline/DB/IAM, solicitudes mutantes/comandos/transiciones, datos ficticios, nuevos builds/deploys, operaciones Git de publicación/cambio de rama. STEP6A3 cerrado PASS no se reabre. STEP6A4 permanece abierto, QA integral BLOCKED, aceptación humana PENDING.

Repo /Users/andresbarouh/repos/tcdx-grc; rama fix/step6a3-v112-continuity-20261016; HEAD4a275264a7522031e62bf09f598c9d56e21d25e0. Índice vacío preservado,27 tracked dirty preexistentes y numerosos untracked. No reset/clean/stash/checkout/switch/rebase/stage/commit/push/merge.

Baseline v1.12 TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16 ACTIVE según BASELINE_ID/STATUS/enforcement/publicación efectiva; el texto candidato congelado dentro de46 es histórico, no volver a bloquear por ello. Leer AGENTS,46,enforcement y rector21/22, contratos de42 y documentación6A2. Dominio exclusivo https://grc.tecdex.net/. No alternativa DNS.

## Entrada preservada y nueva evidencia

Expediente actual nuevo: docs/phase6a/STEP_6A4/evidence/scenario-analysis-20261020/.
ENTRY_SHA256.json contiene3937 archivos de entrada y hashes; git-entry.txt e index-entry.diff. Todos deberán verificarse antes del cierre. CONTINUITY.json y rector-entry.log: rector PASS. Sellos anteriores verificados local126 y QA218 entradas. No modificarlos ni ejecutar qa-consolidate-evidence.py/qa-deploy-frontend.py de la tarea anterior.

Fuentes de entrada: IMPLEMENTATION_REPORT_20261020.md, QA_DEPLOYMENT_REPORT_20261020.md, HUMAN_ACCEPTANCE_QA_20261020.md, TRACEABILITY_MATRIX.csv, FORM_INVENTORY.csv, REFERENCE_INVENTORY.csv, matrices de QA selladas y documentación STEP_6A2.

Runtime nuevamente verificado RUNTIME_CONTINUITY.json: frontend sha256:bc8f21f7edaa0779cfafbfee01afe324d81e7e39bf45d4e51302bc6b7303fdd6 healthy; backend sha256:f4ed625346fc4712f27945d5248aa1b93e3b324772ef5e06c8d37e1102f57129 healthy. Bundle index-I3a0WyWz.js SHA2564692b2d67c7892ef91c1cbce222be509d1334fc161c90a35fa07addf03ab8ff9 igual público/TLS válido, sin dominio erróneo. Sin build/deploy de esta tarea.

## Inspecciones realizadas

Método documentado STEP6A3: SSH tecdex@192.168.2.45 -> docker exec -i tcdx-grc-backend node -, usando pool existente INTERNAMENTE, sin extraer credenciales. Script nuevo en evidencia readonly-scenarios.cjs; BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY, SHOW transaction_read_only=on, SELECTs allowlist, ROLLBACK. Sin nombres personales/emails/contenidos de archivos. IDs mínimos de usuarios/membresías sí. No implica autorización de comandos por impersonación; son hechos de grants/scope/capabilities y metadatos.

qa-readonly-before.json: primer inventario (excluyó métodos globales NULL y consultó nombre de tabla soa_items no existente sin mutación). Se corrigió sólo el script diagnóstico nuevo: tabla física real regulatory.statement_of_applicability_items, métodos globales incluidos; qa-readonly-inspection.json contiene inventario actual completo y debe usarse para conclusiones. Ambos recibos preservados. Los fingerprints incluyen datos de negocio y tablas IAM de grants/roles para comparar antes/después, sin contenidos sensibles. Rerun final del MISMO script hacia archivo qa-readonly-after.json y comparar fingerprints/iamFingerprints con inspection.

CONTRACT_OPERATION_FACTS.json deriva exactamente las42 operaciones, x-permission/x-scope/capability y schemas del OpenAPI vigente, sin regenerar assets ni repetir tests. BACKEND_GUARD_INSPECTION.json lee hash y marcadores en /app/apps/backend/dist/core-grc/service.js desplegado; no ejecuta código de negocio.

## Hallazgos sustantivos — no reducir todo a falta de aceptación

1.6 identidades activas con grants tenant vigentes. Principal candidato amplio ID01a0cfae-d860-730d-88b8-d8b1b3f5d7dc (A),los36 permisos distintos de las42 operaciones presentes antes de evaluar scope/policy/SoD; otros IDs están en actors de qa-readonly-inspection.json. La UI no expone identidad canónica actual; no atribuir la sesión a A sólo por roles.
2.assuranceTestStart/Execute exigen assigned_object/audit_engagement (execute assigned); todos los grants de execute vigentes observados son tenant. actionStart/SubmitForReview/Complete exigen assigned/owned; todos los grants transition son tenant. Es falta de scope efectivo, NO simple login humano. No modificar IAM para arreglarlo.
3.evidenceSubmit tiene grants tenant solamente. El backend desplegado limita tenant-only a fuente inicial pendiente del propio autor. QA_EVID_RET_001 es ordinaria con aplicabilidad published y vínculo; ser autor no basta sin scope owned/assigned. No convertirla en fuente inicial ni cambiar clasificación. Diagnóstico BLOCKED_MISSING_PERMISSION (scope/purpose), no fabricar403 con POST.
4.Sólo A tiene controlAssessmentReview+Approve, assuranceTestReview+Approve, issue.transition y action.verify/transition. Las transiciones de review/approve, verify_close y verify requieren actor distinto del previo; action.verify además distinto del assignee. Es imposible completar esos pares con la misma identidad. ControlAssessmentReview sobre completed existente también tiene prior_actor=A; usar B para completar otro objeto es posible en un recorrido FUTURO autorizado, pero ControlAssessmentApprove después de review de A sigue sin segundo aprobador candidato. No recomendar excepciones ni grants inventados.
5.Métodos publicados actualmente: BASELINE_COMPLIANCE v1 ID01a11900-0000-7001-8000-000000000001 y BASELINE_CONTROL_EFFECTIVENESS v1 ...0002, globales NULL tenant. No hay otros ni EffectiveConfiguration. Guard desplegado assertAssessmentPublicationSufficiency bloquea publicación/aprobación con esos métodos incompletos, y exige result_status=valid. Esto preserva CFG-D aceptado STEP6A3; no es reapertura de su cierre, no cambiar metodología, ni inventar suficiencia. FORM07/15 necesitan escenario con metodología suficiente legítimamente publicada FUERA de esta tarea; aceptación visual no lo resuelve.
6.Header Evidence QA-F5-20261007-EVIDENCE está draft, pero su EvidenceVersion está approved. La ausencia de acciones no demuestra falta de permiso: el workflow usa VERSION. El reporte anterior miró ese legado. La versión de QA_EVID_RET_001 está draft y es de UserIdentity01a1470d-bc20-744d-b35d-6121b96631ce (user3 en documentación anterior). Su creación/persistencia/descarga STEP6A3 no deben repetirse. Puede ser candidata para nuevas transiciones sólo cuando scope/actor/autorización lo permitan.
7.Aprobar y rechazar son ramas excluyentes: requieren dos versiones/casos auténticos. Una existente draft más otra creación auténtica permitiría cubrir ambos sin repetir creación STEP6A3. No inventar rechazo para obtener cobertura. Retención publicada existente se reutiliza para evidencia; no exigir crear RetentionPolicyApplicability fuera de42 para consumir una política nueva creada en el recorrido independiente de retención.
8.42 comandos siempre requieren escritura, actualmente EXCLUIDA. Registrar este bloqueo transversal aparte de escenarios/scopes/actores/estados; no convertir un formulario visible en comando PASS.

## Inventario real resumido

Aplicabilidad1 approved; RequirementAssessment3 (approved, assessed insufficiente, not_assessed); SoA1 published +1item; Controls2 tenant active/versiones2 active; ControlAssessment3 (approved, completed insufficient_data, in_progress); AssuranceTest1 approved; EvidenceRequest1 fulfilled; Evidence2 headersdraft, versiones approved/draft; RetentionPolicy2published; RetentionPolicyApplicability1published+2under_review; Issue1verified_closed; Action1verified. Métodos globales v1 dos; EffectiveConfiguration0. Todo son registros QA existentes, no cumplimiento normativo auténtico por el mero nombre. No reabrir terminales para habilitar prueba.

## Navegador y sesión

Usar exclusivamente mcp__cua_repl para UI. Chrome browser1, pestaña original1477742241; URL actual https://grc.tecdex.net/controles. Usuario pidió explícitamente abrir ventana login; se creó pestaña1477742271 pero finalmente inició sesión en la ORIGINAL. Nueva pestaña cerrada por agente. Usuario confirmó «ya esta logueada la sesiuón» y se verificó sesión real/TecDex en pestaña original. No atribuir login a aceptación humana STEP6A4.

En esta sesión CUA persisten grcTab,grcBrowser,qaFs,qaViewport,scenarioEvidencePath y captureScenario (escribe en expediente NUEVO). NO usar captureQa/captureBothQa antiguos: escriben en evidencia QA sellada y la romperían. En nueva cuenta reinicializar CUA según instrucciones de herramienta, seleccionar pestaña real; no extraer sessionStorage/cookies/tokens ni ejecutar fetch a través de evaluate (sólo DOM readonly).

Antes de renovación humana hubo vista denegada y volvió a login tras reload; capturas preservadas. Tras renovación: lectura del draft QA_EVID_RET_001 funciona; no acciones para actor actual, sin GET HTTP status/código capturado, no inventar403. Capturas evidence-draft-after-human-login.*. No descargar archivo. FORM14 actual en completed muestra Revisar evaluación de control; capturas desktop1440x1000/narrow390x844 y FORM-14-current-observation.json (modal/foco/Escape/retorno al disparador/sin overflow). NO se clicó Revisar ni ningún comando, ni se enviaron requests mutantes del agente. Viewport restaurado. Evidencia previa15UI se reutiliza por sellado, no repetir61/92 locales.

## Pendiente para terminar — continuar sin reiniciar

A. Generar diagnóstico completo42 filas con operación/path/permiso/scope/actor/precondiciones/estado/referencias/escenario/causa exacta/dependencias/escritura/evidencia PASS faltante. Separar clasificación auxiliar de estado de negocio. Propuesta de categorías primarias (confirmar con datos, no criterio automático):
-11create: BLOCKED_MISSING_SCENARIO (datos auténticos nuevos no autorizados/provistos).
-02,03,06,09,12,19,22,25,26,27,29,30,31,32,34,35,36: BLOCKED_BUSINESS_STATE (fuente no disponible actualmente).
-05,13: BLOCKED_AUTHORIZATION (objeto/estado existen; escritura excluida, dueño decide entradas auténticas).
-07: BLOCKED_MISSING_SCENARIO (metodología suficiente; además actor previo incompatible actual).
-14,15,20,37,42: BLOCKED_MISSING_ACTOR (14 sobre objeto actual;15/20/37/42 pares sin identidades distintas candidatas;15 además metodología).
-17,18,24,39,40,41: BLOCKED_MISSING_PERMISSION (scope/purpose).
Son42, contar:12scenario+17state+2authorization+5actor+6permission. Mantener un eje separado:15formularios ready for human presentation review por evidencia previa; no decir15comandos listos.

B. Grafo de42 operaciones con31transiciones/11creaciones y38relaciones DEP del STEP6A2/01, distinguiendo obligatorio/alternativo/opcional. NO inventar ControlAssessment→AssuranceTest ni Applicability→SoA. RetentionPolicyUpdate es edición opcional, no requisito de review; incluye en orden de cobertura, no imponer como dependencia contractual. Source lifecycle actual en qa-readonly-inspection.edges; permisos/scopes fuente en CONTRACT_OPERATION_FACTS.
C. Plan mínimo razonable:4 macrorecorridos (cumplimiento9, controles11, evidencias+retención12 con ramas aprobar/rechazar, hallazgos+acciones10) y11cadenas de entidad. No afirmar mínimo matemático de personas o clicks. Distinción2identidades necesarias no suficientes con grants actuales. Cada recorrido incluir A-O del prompt, registros/IDs existentes, dónde falta nuevo escenario, actores IDs/capacidades actuales, estado y resultados esperados, evidencia y posteriores GET seguros. El recorrido de evidencia necesita2ramas auténticas; puede reutilizar draft existente para una, nueva Evidence para otra sin inventar nuevos IDs/códigos. Todo es plan futuro condicionado, NO permiso para ejecutar escrituras.
D. Inventario auténtico QA CSV y95referencias revisadas con campo/contexto/dependencias y evidencia reutilizada (22UI observadas antes,1retiradaN/A). No afirmar95runtime lookup nuevos.
E. Lista mínima humana: dueños de dominio aportan hechos/datos/decisiones auténticos; seguridad/IAM competente resuelve gaps scopes/SoD mediante gobierno independiente, NO pedir al PO operar como otros roles; autoridad metodológica competente resuelve suficiencia mediante fuentes aprobadas fuera deesta tarea. PO sólo decide alcance/escenarios y eventual autorización operativa SEPARADA para escrituras explícitas, y acepta/rechaza visual/funcional STEP6A4 cuando corresponda. Login humano ya resuelto; no reexigirlo salvo expiración. Dictamen global BLOCKED por gaps reales + escritura excluida.
F. Antes de sellar: repetir diagnóstico SQL READ ONLY hacia after, comparar fingerprints de negocio/IAM con inspection; runtime ids/start/restarts y branchHEADindex invariables;3937 hashes de entrada y sellos126+218 intactos. Ejecutar sólo rector governance y diff-check/integridad; no pruebas locales selladas niSTEP6A3. Secret scan nuevoexpediente patrón sin imprimir credenciales. Reportar límites de SQLgrants vs APIcommand ObjectPolicy/SoD no ejecutados.
G. Crear reportes nuevos en docs/phase6a/STEP_6A4, no tocarpreexistentes, hashes finaltodo. Resultado final conA-E del prompt, counters exactos,4recorridos y bloqueos precisos. STEP6A4_CLOSURE=BLOCKED, HUMAN_ACCEPTANCE=PENDING; rector técnico diagnóstico PASS si checks0, no falsa clausura.
H. Actualizar este handoff al final para indicar outputs reales/estado final (es nuevo de esta tarea, no entrada sellada). Copia temporal /private/tmp/STEP6A4_SCENARIO_CONTINUITY_20261020.md. Si compacción/uso termina antes, esta versión ya permite continuar.

Memoria consultada brevemente: ~/.codex/memories/MEMORY.md líneas136/160-168; hechos actuales prevalecen. Si se usa, finalizar con bloque oai-mem-citation requerido; rollout01a14078-0b1a-73d0-97c3-fcdb9ae68cc2. No escribir memoria persistente sin solicitud expresa.
