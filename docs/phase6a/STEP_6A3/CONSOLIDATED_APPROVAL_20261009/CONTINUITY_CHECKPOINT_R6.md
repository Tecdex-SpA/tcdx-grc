# Checkpoint inmediato de ejecución R6

2026-10-13. EXECUTION=SUSPENDED_BY_OWNER. No nuevas verificaciones extensas ni cambios de implementación después de la solicitud de checkpoint. R6 no finalizado; versión de transporte y publicación pendientes. v1.8 y D1=B/D2=C/D3=A/D4=A/D5=A preservadas. La opción A SHA188f09… ya autorizó preparación, no publicación automática del delta nuevo.

## Proceso y parada controlada

No se identificó un proceso de pruebas R6 activo de más de una hora. En el snapshot de proceso de13:25–13:26UTC, el coordinador PID37056 ejecutaba python /tmp/r6-v2-gates.py, elapsed09:21, CPU0%, estadoSs: esperaba al hijo. PID37642 ejecutaba node .../@playwright/test/cli.js test --reporter=json, elapsed08:27, CPU0%, estadoS; sus workers renovados estaban activos. Cadena pnpm37628/37631/37639; Vite37675, port4173, elapsed08:26. Último avance verificable: nuevo error-context de tenant-onboarding a2026-10-13T13:25:52.852637Z;88 contextos y15PNG al muestreo. No se acredita deadlock: progresaba con fallos repetidos.

PID37642 recibió SIGINT después de archivar test-results. Playwright cerró con130, emitió JSON parcial; coordinador terminó con1 al registrar interrupción, workers y Vite asociados salieron. ps posterior no encontró ninguno de los seis PIDs principales. Sin SIGKILL, borrado de worktree o snapshots, ni reinicio de prueba. Evidencia: user-requested-process-checkpoint.json, controlled-stop-request.json, browser-artifacts-before-controlled-stop.tar.gz, v2-browser-simulated-all.log, browser-controlled-stop-summary.json, v2-gate-commands.json.

Los intérpretes de más de una hora sí encontrados son servicios persistentes de herramientas, previos a R6: PID80666 servidor codex-security --stdio;80667 cua-repl;80670/80711 node_repl. Elapsed03-15:29:53, CPU0% al muestreo. No ejecutan la suite identificada y no se detuvieron. Comandos completos en persistent-runtime-processes.txt.

## Pruebas acreditadas y limitaciones

Candidato IANA bajo v1 anterior:869PASS,0FAIL,0SKIP; core browser200PASS. Son revisiones anteriores, no prueba del transporte v2. Candidato actual v2:872PASS=759unit+113PostgreSQL,0FAIL,0SKIP,87archivos/18PostgreSQL;22casos unit nuevos respecto de737R3. Los82casos antiguamente omitidos constan en15archivos;16GETEC ya incluidos en113. Node22.23.2/pnpm12.4.1/PostgreSQL16.15. Fuente probada coincide actualmente, registro suspended-source-match.json. Typecheck/lint/build/contratos/vocabularios/secrets/rector/status/whitespace9checksPASS; no se repiten.

Navegador v2 completo interrumpido:62expected,94unexpected,308skipped/not completed,0flaky;464previstos, duración556154ms. INTERRUPTED_NOT_PASS. No sumar estos conteos a872 ni llamar E2E real a simulación. La lectura estática demuestra un defecto de preparación en harness: core-grc-ui, tenant-onboarding-ui, platform-role-ui y managed-identity-tenant-access aún interceptan **/api/v1/**, aunque la proyección candidata esv2; por ello sus ramas de mockv2 quedan fuera del interceptor. Debe corregirse tras resolver el transporte y luego ejecutarse sólo las suites afectadas; no se atribuyen automáticamente los94fallos a una sola causa ni se simula su resolución.

Intentos previos conservados: first-full-tests.json792PASS/21FAIL/53pending por fixtures iniciales no conciliados; posteriores866PASS. release-timeout-tests.json868PASS/1timeout; final-serial-tests.json869PASS sin cambiar assertions/timeout. Error de selector inicial de navegador y fixture/typecheck conservados. Evidencia histórica:R3 850=737unit+113PG,460browser simulado y38UQ separados;R4 7+3checks;R5 13checks. No se atribuyen a R6.

## Dos alternativas exactas de versionado

### Opción A

Solicito derivar y presentar para aprobación posterior el delta exacto de currentPrincipalAuthorizationRead en /api/v2/auth/me/authorization y sus consumidores, conservando íntegro el texto IANA ya aprobado. No autorizo publicación automática de hashes futuros, convivencia legacy ni despliegue; debe decidirse formalmente el retiro de la proyección anterior y su compatibilidad antes de ejecución.

SHA256 UTF8 con salto final: 188f09c23936afe871ad562ce20d7e859914a83d66766cd708a5c330fcec5ec5

### Opción B

Solicito preparar una enmienda rectora sucesora, exclusivamente para el campo default_timezone de CurrentPrincipalTenantPermissions identificado por SHA-256 6205faaafa3cb0cbd4d0cf34cd9c8343ccca64392e638a833e10fa7db8c73375, que permita su cambio coordinado de DTO cerrado bajo la ruta v1 actual sin nueva major. No activo la enmienda ni modifico v1.8; los bytes de la nueva enmienda y su manifest deberán ser aprobados posteriormente antes de publicación local. Toda otra regla de rector25 se conserva.

SHA256 UTF8 con salto final: 39b726aa1b3593693c670e950841c229496fb99405a37712ccf51e3af56c1309

A requiere ruta v2, DTO/parsers/clientes pareados, política explícita de retiro v1-self y adaptación de harness. Sólo la proyección propia cambia de major; otros endpointsv1 siguen. B prepararía una enmienda rectora sucesora exacta que exceptúe este único campo en v1; tampoco publica automáticamente hashes, ni altera por sí sola v1.8. Recomendación técnica A: cumple rector25 §1 vigente sin excepción; requiere aceptar formalmente incompatibilidad/retiro. A ya seleccionada para preparación; falta aceptar el delta de transporte/retirement presentado, no repetir D3 ni D1–D5. R6_V2_TRANSPORT_CONTRACT_DRAFT.md, patch atribuible y índice de33archivos están disponibles; manifiesto final/Word aún no finalizados.

## Qué falta para terminar R6

Implementación: candidato local requerido IANA y lectura/transacción/backendUTC/presentación/DST implementados;28archivos heredados modificados autorizadamente y5nuevos de código/contrato. Falta ajustar harness v2 demostrados y resolver fallos restantes con evidencia, tras decisión de transporte. CFG-D sucesor11inputs diseñado sin reglas inventadas; CT04 nueva aplicación bloqueada; RLS24tablas diseñado,0policies activadas. Las decisiones D1/D2/D4 no autorizan completar reglas/DDL ausentes.

Publicación: aceptar exactos bytes de majorv2, retiro y compatibilidad bajo25 §1/49 §3; preparar/sellar un único manifest y Word de decisión residual, ejecutar sólo gates que nuevas modificaciones afecten y registrar publicación efectiva cuando exista autoridad. D3 semántico SHA6205faa… aprobado, sin discrepancia; no hay publicación contractual efectiva ni nueva activation.

Pruebas: conservar872PASS y9checks de fuente actual. Después de corrección de harness/decisión, ejecutar sólo módulos afectados y gates exigibles al nuevo delta. Browser simulado sigue incompleto/fallido; HUMAN_UI_REVIEW no aprobado. No más verificaciones extensas durante esta suspensión.

Operación externa: QA/IAM real/E2E externo/DDL compartido/deploy NOT_RUN/NOT_AUTHORIZED. D5 plan preparado con campos faltantes PENDING_OPERATIONAL_INPUT y dueño/fuente individuales; ventanaNOT_SCHEDULED. Datos de actorDBA/SP/membresías/grants/backup/restore no inventados. Autorizaciones por operación aún ausentes; no son prerrequisito para trabajo local independiente.

Cierre documental: checkpoint presente; matriz R6_12_CLAUSES_DISPOSITION.md y diseños/QA presentes. R6_TEST_EVIDENCE.md provisional presente. Falta manifiesto final y Word único, append final de ledger/matriz y cierre de R6; no se finalizan con navegador interrumpido ni publicación pendiente. Ledger/matriz R5 no se sobrescriben en esta suspensión.

## Preservación y estado

RepoTecdex-SpA/tcdx-grc;branchstep6a3-internal-governance-v18-20261009;HEAD6af66387aa03fa185ef139584de07700f247b903. Snapshot1600archivos:1572idénticos,28delta local autorizado,0perdidos. Índice1212entradas idéntico y stagingEMPTY.178archivos de rector baseline/migraciones/visual assets/GETEC idénticos. Rector activo TCDX_GRC_MASTER_REGENT_BASELINE_v1.8_2026-10-09, integridad verificada; SOG v2DRAFT_NOT_EFFECTIVE.48trazadas/36closedlocal/12pending, sin promociones artificiales.

PostgreSQL descartable propio y runner retirados porIDs/labels/system_identifier verificados; tmpfs propio retirado. Cuatro contenedores heredados conservan exactamenteID/name/running/StartedAt. DDL_LOCAL sólo rebuild canónico32/fixtures propios; DDL_QA0. RLS0tables/0forced/0policies en base propia; no acredita inspección QA. COMMITS0/PUSH0/PR0/MERGE0/DEPLOY0/STEP6A4NOT_STARTED. RECTOR_GATE=BLOCKED;STEP6A3=PARTIAL_BLOCKED;QA_PACKAGE=PREPARED_NOT_READY_NOT_AUTHORIZED_NOT_EXECUTED. Se espera decisión de transporte; no se reinicia ni continúa desarrollo durante suspensión.
