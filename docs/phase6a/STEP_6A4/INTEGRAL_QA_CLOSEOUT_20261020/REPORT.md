# STEP6A4 — despliegue integral QA y preparación de cierre

Fecha: 2026-10-20. Destino exclusivo: **https://grc.tecdex.net/**, frontend QA `192.168.2.46`. Publicación terminada; aceptación y cierre pendientes. Este expediente nuevo conserva los informes y sellados históricos. No inicia STEP6A5/6A6.

```text
PREDEPLOYMENT_GATE=PASS
STEP6A4_INTEGRAL_QA_DEPLOYMENT=PASS
STEP6A4_POSTDEPLOYMENT_VERIFICATION=PASS_TECHNICAL
STEP6A4_SCOPE_COVERAGE=PASS_TECHNICAL_42_FORMS_95_CLASSIFIED_REFERENCES
STEP6A4_TECHNICAL_DEBT_REVIEW=COMPLETED_WITH_RUNTIME_VERIFICATION_GAPS
STEP6A4_QA_FUNCTIONAL_VERIFICATION=BLOCKED
STEP6A4_HUMAN_ACCEPTANCE=PENDING
RECTOR_GATE=PASS
STEP6A4_READY_FOR_CLOSURE=BLOCKED
STEP6A4_CLOSURE=BLOCKED
HUMAN_UI_REVIEW=PENDING
```

`RECTOR_GATE=PASS` acredita integridad rectora y ejecución de este alcance autorizado. No acredita cierre, aceptación humana ni los comandos no ejecutados. La fase vigente es **6A / STEP6A4**; `STEP6A3_CLOSURE=PASS` se conserva sin repetir sus pruebas.

## Autoridad y predeployment

Baseline efectiva: **TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16**, status ACTIVE, `ACTIVE_ACTIVATION.json`, manifiesto `cdd0165364e50dee176c8a8ec8cf7c1f55a5905f4febd91c63459583c9faec85`. El Rector Governance Gate verifica la publicación; los textos históricos de candidata y checkpoints impresos no reemplazan el acto efectivo. No se modificaron baseline ni contratos.

Fuentes aplicadas: AGENTS; rector46,06,13,21,22,26,27,43,45,49; enforcement; contratos de formularios STEP6A1/6A2, especialmente `STEP_6A2/10_PHASE6A_ACCEPTANCE_GATES.md`; OpenAPI y referencias vigentes, consultados mediante la trazabilidad consolidada y la corrección P3/P5; manifiesto visual v1.0 y sus seis contratos activos. Marca local y lenguaje visual preservados, sin promoción de candidata visual ni PASS humano emitido por el agente.

La instrucción PO actual autoriza integralmente el rollout QA y las pruebas no destructivas; sucede las exclusiones de despliegue/navegador de la tarea anterior para este alcance. Rector45/49/DR003 permiten ejecutar lo instruido sin ratificación administrativa de cada byte. Las exclusiones actuales de backend, datos, contratos, IAM, Git y cierre siguen vigentes. El procedimiento frontend acreditado no exige commit/push/merge ni cambio de rama.

Rama: `fix/step6a3-v112-continuity-20261016`. HEAD: `4a275264a7522031e62bf09f598c9d56e21d25e0`. Índice de entrada vacío, SHA256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. El árbol ya contenía cambios en backend/autenticación, lockfile, frontend y documentación: se inventariaron antes de actuar. El Dockerfile consume frontend, contracts/shared-types y marca; **no copia ni reconstruye backend**.

Predeployment comprobó repositorio/rama/HEAD/índice, preservación, activación rectora, cierre STEP6A3, 42 formularios y 95 referencias, cobertura contractual y pruebas locales vigentes, procedimiento QA y rollback. Se verificaron **392 entradas de hashes históricos**. Los hashes antiguos de fuentes corregidas se comprobaron contra sus preimages acreditados; los bytes actuales contra el manifiesto sellado P3/P5. No se exigió que una fuente corregida coincidiera con su versión histórica.

El delta de entradas del build frente al frontend QA anterior consiste exactamente en cinco rutas: `business-form-fields.tsx`, `business-forms.ts`, `core-grc.tsx`, `business-origin-fields.tsx` y su test. Corresponden únicamente a P3/P5. Las otras entradas son idénticas. Fuente exacta: [build-source-sha256.json](evidence/build-source-sha256.json), SHA256 `8b6e05d80713bc2dda858a4eb179a96d65f936fd01ed7e63b9dba94565053b1d`.

Recibos: [source-review.json](evidence/source-review.json), [PREDEPLOYMENT_GATE.json](evidence/PREDEPLOYMENT_GATE.json), git-entry/workspace-entry y rector-pre en `evidence/`.

## Publicación e inventario

| Dato | Evidencia real |
| --- | --- |
| Imagen anterior | `sha256:bc8f21f7edaa0779cfafbfee01afe324d81e7e39bf45d4e51302bc6b7303fdd6` |
| Imagen nueva, ID inmutable | `sha256:e00413fcd947cdaea312583d610b52a205c2af7a8fa445327a8e8352d2a9e0f7` |
| Tag local | `tcdx-grc-frontend:step6a4-integral-p3-p5-20261020` |
| RepoDigest local de build | `tcdx-grc-frontend@sha256:e00413fcd947cdaea312583d610b52a205c2af7a8fa445327a8e8352d2a9e0f7` |
| Digest de registro remoto | No se publicó en registro. Tras docker load, RepoDigests remoto vacío; se usa Image ID exacto, sin inventar un digest OCI de registro. |
| Plataforma | Linux/amd64 |
| Rollout UTC | 17:17:47.640669 → 17:17:56.885811, 2026-10-20 |
| Hora America/Santiago | 14:17:47 → 14:17:56, 2026-10-20 |
| Contenedor nuevo | `a633d5527524b8cab6c1bfeaab046233cf64e9668346594a598464e925b7f46a` |
| Bundle público | `/assets/index-CvWWIckP.js`, 697287 bytes |
| SHA256 del bundle | `f645cc91cf9baa6cdf3b3fbbaa138f721fcec531a2578fd1636394504a8ec680` |
| Resultado | Running/healthy, cero reinicios; rollback anterior conservado/detenido |

Se publicó **únicamente frontend**, incluyendo T-FCOM (9), T-FCTL (11), T-FEVD (12), T-FACT (10), T-VALID/T-LABEL, editores estructurados, referencias y correcciones FORM-21/FORM-33. Las rutas/operaciones/componentes individuales están en [COVERAGE_42.csv](COVERAGE_42.csv) y la matriz contractual anterior enlazada por cada fila. Son fuentes ya existentes, no funcionalidades añadidas por esta tarea.

Procedimiento: Dockerfile frontend vigente → build linux/amd64 con manifest de fuentes y HEAD → inspección del bundle de la imagen exacta → docker save → SSH/docker load en QA → promotor frontend preflight → stop/rename del anterior → run conservando configuración → health. `scripts/phase6a4/qa-promote-frontend.py` se reutilizó cambiando solamente nombres rollback/failed para evitar colisión con el despliegue anterior. Copia exacta ejecutada: [promoter.py](evidence/promoter.py). No hubo publicación Git ni reconstrucción de otros componentes.

Los IDs, archivo transportado y su SHA256, build, fechas y rollout constan en [BUILD_RESULT.json](evidence/BUILD_RESULT.json), [transport.json](evidence/transport.json), [promotion.json](evidence/promotion.json) y `build-attempt.json`.

## Postdeployment e invariantes

| Verificación | Resultado y límite |
| --- | --- |
| Frontend | Imagen nueva exacta, running/healthy, cero reinicios. |
| Backend | Mismo contenedor `0800ad07…`, imagen `sha256:f4ed625346fc4712f27945d5248aa1b93e3b324772ef5e06c8d37e1102f57129`, inicio 2026-10-19T14:44:17Z, configuración, salud y cero reinicios anteriores/posteriores idénticos. |
| Configuración del rollout | Env por nombre/valor, usuario, comando, entrypoint, directorio, puertos, healthcheck, HostConfig y aliases de red iguales al rollback. Sólo imagen/labels/identidad generada/inicio cambian. |
| HTTPS público | `/`, `/health/ready` y JS nuevo: HTTP200, TLS verificado. Bundle público y de imagen con SHA256 idéntico. |
| Dominio | Únicamente origen canónico `https://grc.tecdex.net/`; dominio incorrecto ausente de entradas de build y bundle. Sin DNS/fallback. |
| Baseline/contratos/IAM/modelo/backend locales | Archivos preexistentes preservados por hashes; Rector pre/final PASS. |
| PostgreSQL y negocio | Ninguna conexión SQL, migración ni comando de negocio ejecutado en esta tarea. Navegadores registran sólo GET API y cero intentos mutantes. Login oficial puede generar su auditoría normal. No se afirma un fingerprint exhaustivo de modificaciones concurrentes de otros actores. |
| Infraestructura | Sólo rollout frontend autorizado; backend intacto y configuración frontend contrastada contra el anterior. No se auditó toda la infraestructura externa. |
| Git | Rama/HEAD/índice preservados; sin commit, push, merge ni checkout. |

Recibos: [runtime-postdeploy.json](evidence/runtime-postdeploy.json), [runtime-configuration-comparison.json](evidence/runtime-configuration-comparison.json), [public-parity.json](evidence/public-parity.json), [preservation.json](evidence/preservation.json). El health histórico del contenedor detenido no se usa como salud actual del servicio.

## Cobertura y pruebas: estados separados

| Nivel de evidencia | Estado acreditado |
| --- | --- |
| Implementación local | 42/42 formularios, 9+11+12+10; T-VALID/T-LABEL; 3 editores/22 miembros; 95/95 referencias clasificadas, 94 activas y F-0122 retirada. |
| Local integral previa | 61 pruebas y 92 casos de navegador con API simulada PASS; cobertura por formulario y serialización. Reutilizada por integridad/lineage, sin volver a ejecutar la suite sellada. |
| Local P3/P5 vigente | 97 pruebas focalizadas PASS, typecheck/lint/build PASS, ocho casos de navegador simulado PASS. Bytes de la corrección coinciden con su sello; no son prueba QA. |
| Checks nuevos | Rector pre/final, generación contractual `--check`, generación de formularios `--check`, whitespace, build Docker y secret scan PASS. Advertencia de bundle >500kB conservada. |
| QA anterior reutilizada | Presentación de 15/42 formularios y 22 referencias; no equivale a 15 comandos ni a 95 roundtrips. Fuentes no corregidas idénticas; la evidencia de P3/P5 anterior queda sucedida por la nueva para su corrección. |
| QA nueva | P3/P5 abiertos a 1440×1000 y 390×844, con API real; validación/foco, selección de orígenes, exclusión de campos, limpieza, cancelación, nombres accesibles y ausencia de overflow documentada. No es auditoría WCAG completa. |
| Transaccional previa | **FORM-05 PASS**, HTTP202, estado/version/auditoría acreditados anteriormente. **No repetida**. Las otras **41 BLOCKED**, cero FAIL acreditados; se conserva la causa individual. |
| Humana previa | P1 OK, P2 OK, P4 OK; P3 y P5 OBSERVATION_OPEN; P6 OK_WITH_OBSERVATION, según instrucción PO actual. No se extrapola a prueba de cada comando. |
| Humana nueva | Pendiente; la respuesta «Sesión lista en TecDex» habilitó el navegador y **no** constituye aceptación del producto. |

Matrices nuevas como vistas de evidencia existente: [COVERAGE_42.csv](COVERAGE_42.csv), [REFERENCE_TRACEABILITY_95.csv](REFERENCE_TRACEABILITY_95.csv), [GATES.csv](GATES.csv). Las 95 filas se copiaron sin reinterpretación del inventario vigente; no se recrearon referencias retiradas. Fuentes reutilizadas y hashes: [REUSED_EVIDENCE_SHA256.json](evidence/REUSED_EVIDENCE_SHA256.json).

### P3/P5: resultado focalizado y límites

P3: formulario y tipo/origen visibles; envío vacío muestra error comprensible y su enlace enfoca el tipo. Los cinco tipos se seleccionaron con un único campo de referencia activo. Se eligieron marco y requisito auténticos; el requisito estaba deshabilitado sin marco y se vació al restablecerlo. QA ofrece **un solo marco elegible**: no se acredita cambio entre dos marcos diferentes en QA; esa variante tiene prueba local simulada. Los otros cuatro tipos permitieron seleccionar registros reales y responsables elegibles; al cambiar tipo se comprobó responsable vacío. El estado deshabilitado del responsable inmediatamente después de borrar el requisito es esperado, aunque el helper lo registró como `BLOCKED_LOOKUP_UNAVAILABLE_AFTER_WAIT`: no es una lectura denegada ni un defecto probado. Opcionales identificados en UI/capturas y contrato. Cancelación sin persistir.

P5: formulario y error/foco visibles. Se seleccionaron evaluaciones de requisito/control y prueba auténticas, cambiando entre tipos y retirando campos incompatibles. Sólo un selector de origen activo. Cancelación sin persistir. La exclusión en payload, combinaciones incompatibles, opcionales y cambio de registro dentro del mismo tipo tienen evidencia contractual/local vigente; no se enviaron payloads reales para acreditarlos en QA.

Recibos originales y complementarios: `evidence/browser-result.json` y [browser-followup/browser-result.json](evidence/browser-followup/browser-result.json). El primer helper leyó algunas opciones antes de terminar la carga: los vacíos iniciales no son prueba de falta de datos. La segunda ejecución esperó opciones y confirmó los lectores. Ambas usan respuestas reales, sin mocks y con bloqueo preventivo de comandos; no se produjo ningún intento mutante. Se conserva todo el historial.

La correspondencia de los **15 checks P3 y 13 checks P5** solicitados, con sus límites QA/local y aceptación pendiente, está en [P3_P5_CHECKS.csv](P3_P5_CHECKS.csv).

Revisión de capturas: las originales FORM-21/33 escritorio/390 muestran el drawer y su estilo vigente. La captura complementaria `browser-followup/FORM-33-1440.png` resultó vacía y se **excluye como evidencia visual**; no invalida las assertions DOM ni sustituye la original válida `FORM-33-1440.png`. La revisión humana de scroll/foco y responsive permanece pendiente. No se declara ausencia universal de regresiones visuales.

## Revisión de deuda dentro de STEP6A4

[TECHNICAL_DEBT_REVIEW.csv](TECHNICAL_DEBT_REVIEW.csv) clasifica los hallazgos. El cotejo de matrices, hashes y pruebas por schema no encontró formularios/campos/validadores faltantes ni divergencias nuevas en el delta. P3/P5 ya incluyen la corrección y no mostraron un defecto bloqueante de implementación en el alcance QA observado. **No se certifica ausencia de deuda de implementación en las 41 operaciones sin ejecución acreditada.** La revisión está terminada con límites explícitos; no permite cerrar su gate funcional.

| Clase | Resultado |
| --- | --- |
| BLOCKING_DEFECT | Ninguno demostrado por esta revisión. Las lagunas de prueba no se convierten en PASS ni en un defecto inventado. |
| RECTOR_DEPENDENCY | 41 comandos y negativas reales pendientes, actores/scopes/SoD/metodología/escenarios; segundo marco elegible ausente; aceptación PO pendiente. Bloquean el cierre correspondiente. |
| NON_BLOCKING_OBSERVATION | Warning de chunk >500kB, sin medición nueva p95; incidencias del helper/captura documentadas. No se añade optimización de producto. |
| OUT_OF_SCOPE | Biblioteca normativa, IA, UI-7/STEP6A5 y STEP6A6. No son deuda automática de STEP6A4. |

Seguridad real de comandos, aislamiento, auditoría, replay/idempotencia y concurrencia no se acreditan globalmente mediante mocks o aceptación visual. El cotejo preserva contratos; las comprobaciones operacionales faltantes siguen bloqueadas individualmente.

## Guía única de aceptación humana pendiente

**Versión a revisar:** imagen `e00413fc…`, bundle `index-CvWWIckP.js` en https://grc.tecdex.net/. Sesión oficial personal, empresa TecDex y permisos efectivos de lectura/creación del formulario; Platform Admin por sí solo no los sustituye. No introducir credenciales en el expediente. La revisión siguiente es **sin escrituras**: mantener vacíos código de solicitud/código de hallazgo y otros obligatorios, usar «Crear registro» únicamente para validación de entradas incompletas y terminar con «Cerrar creación» o Escape. Nunca guardar un formulario válido. No repetir FORM-05.

Se conservan P1/P2/P4 aceptados; no se pide repetirlos. P6 conserva su aceptación previa con observación y sólo se revisa lo compartido afectado por P3/P5: agrupación de relaciones, resumen de errores y foco. El helper compartido limita el grupo de origen a dos schemas; los otros formularios mantienen su evidencia local de regresión.

En la tabla, **PO** es responsable de aceptar presentación; el actor operativo debe tener el permiso indicado y lectura de la referencia, scope/ObjectPolicy efectivos. Para toda fila: PASS si se observa el resultado completo, FAIL si difiere; si no existe dato/permiso, **BLOCKED**, indicando la dependencia, sin inventarlo. Evidencia mínima común: fecha, versión/bundle, ancho, ID de prueba, resultado y captura o descripción precisa del paso; sin tokens. La decisión humana no se infiere de silencio ni del login.

| ID / grupo | URL y pantalla | Actor / precondición | Acción exacta | Resultado / PASS-FAIL específico | Evidencia mínima / dependencia / responsable |
| --- | --- | --- | --- | --- | --- |
| H-P3-1 nueva | https://grc.tecdex.net/evidencias → Solicitudes de evidencia → Nuevo registro | PO con `evidence.evidence_request.create`, tenant y lecturas efectivos; no rellenar código | Abrir Solicitar evidencia; sin origen pulsar Crear registro; pulsar Objeto de origen en resumen | Error explica elegir tipo y un registro; foco visible en Tipo de origen, no persistencia. FAIL si mensaje o foco no orientan | Captura del error y foco; depende de sesión/permiso; PO |
| H-P3-2 nueva | Misma pantalla | Igual; marco/requisito auténticos accesibles | Elegir Requisito; verificar deshabilitado sin marco; elegir marco y requisito; vaciar marco y volver a elegirlo | Requisito anterior vacío. Si hay segundo marco elegible, cambiar a él y comprobar también limpieza. Falta de segundo marco se registra BLOCKED sólo para esa variante, no obliga a crear uno | Marco/registro observados, antes/después; escenario de segundo marco a cargo del dueño normativo, revisión PO |
| H-P3-3 nueva | Misma pantalla | Igual; lector autorizado de cada tipo y responsables elegibles | Elegir sucesivamente Control, Evaluación de requisito, Evaluación de control y Prueba de control; seleccionar un registro existente y responsable; cambiar tipo; cuando haya dos registros, cambiar también registro dentro del tipo | Sólo selector correspondiente; referencia anterior y responsable se borran; no aparecen FKs incompatibles. Si falta alternativa auténtica, anotar caso pendiente | Captura antes/después; dependencias de lector/datos, sin grants nuevos; PO |
| H-P3-4 nueva | Misma pantalla | Formulario incompleto, código vacío | Revisar responsable/fecha opcionales; cambiar tipo sin registro y pulsar Crear registro; seleccionar registro y revisar retirada del error de origen; cancelar | Error orienta al registro pendiente; desaparece al resolver origen; otros errores obligatorios pueden permanecer; opcionales no sustituyen origen; no registro creado | Descripción/imagen y cancelación; PO |
| H-P5-1 nueva | https://grc.tecdex.net/acciones → Hallazgos y brechas → Nuevo registro | PO con `remediation.issue.create` y lecturas efectivas; códigos y demás datos obligatorios vacíos | Abrir Registrar hallazgo; sin origen pulsar Crear registro; pulsar Objeto de origen en resumen | Mensaje comprensible; foco al tipo; no persistencia | Error/foco; depende de sesión/permiso; PO |
| H-P5-2 nueva | Misma pantalla | Evaluaciones de requisito/control y prueba auténticas accesibles | Elegir los tres tipos y un registro en cada uno, cambiando de tipo después de cada selección | Una sola referencia activa; nuevo selector vacío al cambiar; no se exigen requisito/control auxiliares | Captura/relato de los tres tipos; lector/datos a cargo del dominio; PO acepta |
| H-P5-3 nueva | Misma pantalla | Formulario incompleto | Revisar rol de origen obligatorio, responsable de negocio/fecha opcionales; cambiar tipo sin registro, validar vacío; seleccionar origen; cancelar | Error de origen se retira al resolverlo, opcionales conservados, rol independiente de FK; cancelación sin registro | Resultado y captura si falla; PO |
| H-P6-1 afectada compartida | Ambas URLs y formularios anteriores | PO, teclado, escritorio | Abrir, recorrer Tab/Shift+Tab, usar resumen y Escape | Etiquetas legibles, foco visible, recorrido dentro del drawer y retorno al botón Nuevo registro | Resultado por formulario; sesión y versión nueva; PO |
| H-P6-2 afectada compartida | Ambas URLs, ancho 390px | PO, viewport 390×844 o dispositivo equivalente | Repetir sólo apertura, error de origen, scroll al grupo y pie, cerrar | Sin overflow horizontal del documento; texto, selector y acción accesibles; sin exigir repetir P1/P2/P4 | Captura del grupo/pie y aceptación o defecto; PO |

**Devolución mínima del PO:** `P3=ACEPTADO/OBSERVADO; P5=ACEPTADO/OBSERVADO; P6_DELTA=ACEPTADO/OBSERVADO`, fecha/versión/ancho, IDs que fallaron o quedaron BLOCKED y texto observado. Esta devolución cierra observaciones de presentación sólo si es explícita; no sustituye ejecución transaccional o controles de seguridad exigidos.

### Pruebas que requieren actores, negocio o decisiones adicionales

Las siguientes **no se ejecutan bajo esta autorización**. El PO no necesita repetir 42 operaciones manualmente. Se conservan los resultados individuales en COVERAGE_42 y se agrupan las 41 pendientes en recorridos futuros. Para cada uno, PASS requiere respuesta contractual, estado/version y lectura oficial persistida, correlación/auditoría y negativas/idempotencia/concurrencia aplicables; FAIL es divergencia demostrada, BLOCKED es precondición ausente. Evidencia mínima: operación/objeto/actor canónico/tenant, método-status, estado/version antes/después, correlación y auditoría, sin secretos.

| Recorrido pendiente / URL-pantalla | Actor y precondición | Acción futura exacta / resultado esperado | Dependencia, decisión y responsable |
| --- | --- | --- | --- |
| P1 negocio: https://grc.tecdex.net/cumplimiento y /requisitos; FORM01–04,06–09; **excluir FORM05** | Autor de aplicabilidad/evaluación/SoA y aprobador elegible; datos genuinos; assessment ahora in_progress para 06 | Tramitar aplicabilidad draft→submitted→approved; crear evaluación y, sin repetir inicio05, enviar resultado auténtico→assessed→approved; SoA draft→published | Assessor debe aportar conclusión real para06; metodología suficiente para07; escenarios y autorización de escrituras futuras concretas. Dueño cumplimiento y QA; PO decide alcance, no inventa resultado |
| P2 negocio: https://grc.tecdex.net/controles; FORM10–20 | Dueño/control owner, ejecutor asignado y revisores distintos según SoD; controles/assessment/test elegibles | Crear Control; assessment planned→in_progress→completed→reviewed→approved; test planned→in_progress→completed→reviewed→approved | FORM13 necesita resultado auténtico;17/18 scope asignado/engagement,14/15/20 SoD,15 suficiencia metodológica. Dueño de control/prueba, Seguridad y autoridad metodológica; QA acredita |
| P3/P4 negocio: https://grc.tecdex.net/evidencias; solicitudes, evidencias y políticas; FORM21–32 | Evidence owner autor y revisor independiente; Privacy/Legal efectivos por operación; archivo/procedencia/retención auténticos; versiones distintas para aprobar/rechazar | Solicitud open→fulfilled con versión aprobada y target coherente; Evidence draft→submitted→under_review→approved o rejected en casos distintos; policy draft→under_review→approved→published, edición29 opcional | Scope submit24 pendiente; escenarios/actores/SoD, autorización futura de comandos. No repetir evidencia/carga STEP6A3 ni transformar fixture en cumplimiento. Dueños evidencia/retención, Seguridad y QA |
| P5 negocio: https://grc.tecdex.net/acciones; FORM33–42 | Dueño de hallazgo, assignee y verificador distinto; Issue/Action no terminales genuinos, evidencia apta para complete | Hallazgo open→triaged→remediation_in_progress→pending_verification→verified_closed; acción pending→in_progress→in_review→completed→verified | Scopes39/40/41, SoD37/42 y escenarios; no reabrir terminales. Dueño operativo y Seguridad, QA; PO autoriza alcance futuro |

Bloqueos contractuales concretos preservados: FORM17/18 `controls.assurance_test.execute` requiere scope assigned_object/audit_engagement o assigned; FORM24 submit ordinario no se legitima por excepción de fuente inicial pendiente; FORM39/40/41 requieren assigned/owned_object, no basta grant tenant. FORM14/15/20/37/42 requieren actores elegibles distintos según guard;42 además distinto del assignee. FORM07/15 requieren metodología/resultado suficiente, no declaración fabricada `valid`. No se altera IAM, SoD ni metodología para completar pruebas. La fila individual conserva causa, permiso, actor candidato y acción mínima; se revalidarán antes de cualquier futura ejecución.

## Gates y dictamen

Los nombres A–H son agrupaciones operativas. El gate oficial aplicable es **UX_BUSINESS_FORMS**, definido por STEP6A2/10 bajo rector27/43/46; `RECTOR_BASELINE` y `HUMAN_UI_REVIEW` conservan sus identificadores. No se crean nuevos gates rectores ni se confunde el gate posterior UX_CORE_GRC_RUNTIME con autorización de iniciar6A6.

| Grupo | Resultado | Pendiente / responsable |
| --- | --- | --- |
| Implementación | PASS_LOCAL | Sin delta de implementación pendiente conocido; no equivale al gate completo |
| Verificación local | PASS | Evidencia sellada y checks nuevos; Frontend/Codex |
| Despliegue QA | PASS | Sólo frontend autorizado, rollback disponible |
| Verificación funcional QA | BLOCKED | 41 comandos y negativas reales; actores operativos/QA |
| Seguridad y contratos | PASS de preservación; BLOCKED de evidencia runtime completa | Scopes/SoD/tenant/audit/conflict/replay pendientes; Seguridad/dominios/QA |
| Aceptación humana | PENDING | P3/P5 y delta P6; PO |
| Gobernanza rectora | PASS | Integridad/publicación y alcance verificados |
| Cierre formal | BLOCKED | UX_BUSINESS_FORMS completo y acto humano aún pendientes; cierre automático excluido |

[GATES.csv](GATES.csv) detalla identificador rector, criterio, evidencia, resultado, pendiente y responsable por agrupación. No hay conflicto rector material nuevo; existen dependencias operacionales que esta tarea no puede resolver dentro de sus exclusiones.

**Dictamen:** STEP6A4 integral y P3/P5 están publicados y técnicamente saludables en QA, disponibles para la aceptación humana focalizada anterior. La preparación documental de cierre está entregada. STEP6A4 **no está listo para cierre formal** mientras falten las pruebas funcionales/seguridad obligatorias y aceptación explícita; no se cierra ni se inicia una etapa posterior.

## Rollback, incidencias y preservación final

Rollback retenido: `tcdx-grc-frontend-rollback-step6a4-integral-p3-p5-20261020`, contenedor anterior `5b74e613…`, imagen `bc8f21f7…`. No se ejecutó ni ensayó reversión. El promotor revierte automáticamente sólo si falla el arranque/salud del nuevo frontend; no ocurrió.

Ante un incidente crítico atribuible al frontend, detener validaciones y comprobar por inspect activo/rollback contra promotion y frontend-before; verificar libre el nombre `tcdx-grc-frontend-failed-step6a4-integral-p3-p5-20261020`. Aplicar la reversión documentada del promotor: detener sólo el frontend activo, renombrarlo al nombre failed, devolver al rollback el nombre `tcdx-grc-frontend` y arrancarlo. Verificar healthy, HTTPS y bundle anterior. No ejecutar si identidades no coinciden, falta rollback o no existe condición prevista; no reconstruir backend ni tocar datos/IAM. Es disponibilidad documentada, no una orden de ejecutarlo ahora.

Incidencias técnicas de esta tarea: sandbox bloqueó Docker/navegador/SSH y se repitieron las operaciones con permisos del entorno; no se relajó el sandbox. El primer marcador de bundle usó una subcadena que no coincidía con el mensaje completo: se corrigió el **verificador**, sin cambiar producto. La comparación inicial de Env señaló distinto orden: el cotejo final por nombre/valor demuestra igualdad, con HostConfig/red intactos. Recibos conservados. Los límites de polling/captura se describen arriba. Ninguno demostró fallo crítico de servicio que activara rollback.

Archivos cambiados en esta tarea: expediente nuevo completo y append de continuidad en `docs/governance/MASTER_EXECUTION_STATUS.md`. **Ninguna fuente de producto fue editada por esta tarea.** Frontend se construyó/publicó con sus correcciones locales preexistentes autorizadas. DB/esquemas/migraciones, contratos ejecutables, backend, IAM/RBAC/SoD, metodologías, baseline y contratos de despliegue: sin cambios de esta tarea; infraestructura sólo rollout frontend. La configuración de despliegue vigente se consumió, no se modificó.

El manifest final lista archivos y SHA256 del expediente; preservación contrasta cada archivo preexistente y permite únicamente el append documentado de status. Se conserva índice/rama/HEAD; no hubo commits/push/merges/checkout, producción, SQL, transferencias documentales ni escrituras de negocio. `FINAL_INTEGRITY.json` y `SHA256SUMS.txt` registran la comprobación final. Los sellados históricos permanecen intactos.
