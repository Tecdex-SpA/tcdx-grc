# STEP_6A3 — ejecución humana pendiente y acta sin firmar

`MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.10_2026-10-15`
`STEP_6A3=PARTIAL_BLOCKED; RECTOR_GATE=BLOCKED; STEP_6A4=NOT_STARTED`

Preparado el 2026-10-15 a partir de recibos recuperados y lectura QA real, no de memoria entre cuentas. Autoridad: rectores 23/24/38/45/46/49, paquete C-04W/CFG-D y publicación efectiva manifest `e7f30ded29f213fa33a8648466b5c7bbfcc6bb520e6cdf2b11968a41d9f6e944`. Las aprobaciones de cuatro candidatos, seis snapshots y A01–A13 ya existen: **no se solicitan otra vez**.

## Versión que debe aceptar la autoridad QA

Único dominio público: **https://grc.tecdex.net/**. Usar inicio de sesión normal Zoho y seleccionar el tenant autorizado. No compartir tokens, contraseñas, cookies, URLs firmadas ni exportaciones de sesión.

| Servicio QA | Imagen exacta | Fuente SHA-256 |
|---|---|---|
| Backend | `sha256:474e525a3e6b2bcc067dda7a77039b36f2832ca37d138b1424a700644560fc6d` | `879942f159f61a607712fe4c7ba79668343f008285e43a37129159fae821a58e` |
| Frontend español final | `sha256:552ff3e9412cb1c78bfa3400c26c8835c6a2bfa09a6db1dc72ef18b8a2712eeb` | `bac88a14e73d95ed258cd4e3c9a615dce5ec42c7352241b5239fec7e16d45821` |

El operador confirma las imágenes antes de firmar. Si cambian, la aceptación se vincula a la versión nueva después de reconciliar su evidencia; no se acepta por arrastre. Los contenedores previos están retenidos para rollback; no ejecutar rollback ni deploy como parte de este checklist.

## Actos humanos y recibos necesarios

No son casillas ya aprobadas. Registrar resultado real, actor, rol, fecha UTC, tenant, IDs, versión, correlation ID y evidencia sanitizada por cada fila ejecutada.

| ID | URL / pantalla | Actor / precondición | Acción concreta | Resultado esperado / recibo |
|---|---|---|---|---|
| H01 | Canal documental autorizado del tenant; luego Evidencias | Responsable Privacy/Legal con autoridad sobre el documento | Identificar documento auténtico autorizado, origen verificable, cláusula exacta, propósito, clasificación, contexto/Subject/actividad, obligación de retención y vigencia real. Registrar hash del archivo autorizado. | Constancia del responsable; no equivale a scan-PASS ni a revisión operacional. No incorporar contenido reservado al repositorio. |
| H02 | https://grc.tecdex.net/configuraciones/empresas → Retención documental de la empresa | Tenant Admin con PRIVACY y permisos publicados | Revisar política y contexto inicial aplicable **antes de intentar upload**; identificar la aplicabilidad ordinaria publicada/vigente que permitirá la carga. | Preflight documentado. Hoy hay dos aplicabilidades `under_review`, cero publicadas y ninguna fuente jurídica acreditada. No seleccionar esas filas como publicadas ni alterar la EvidenceVersion histórica. Véase dependencia inicial abajo. |
| H03 | https://grc.tecdex.net/evidencias → Evidencias → Nuevo registro | Autor autorizado; H01 y precondición H02 satisfechas por flujo gobernado | Cargar el archivo auténtico, seleccionar política/aplicabilidad/contexto congruentes, registrar procedencia e intervalo real. Conservar IDs de intent, archivo y EvidenceVersion, SHA y scan. Enviar a revisión. | Upload → scan-PASS → FileObject → EvidenceVersion con FK/policy/contexto concordantes. No inventar fechas ni aceptar archivo sólo porque el antivirus pasó. |
| H04 | Evidencias → detalle de la versión → Iniciar revisión / Aprobar | Revisor existente distinto del autor, con permisos efectivos y política de objeto aplicable | Revisar documento, cláusula, contexto y vigencia; registrar suficiencia/relevancia y motivo real. | Acto separado persistido, identidad y AuditEvent. Membership candidata existente `01a0e8a9-7935-736d-bc0c-4f7809291919`: revalidar actividad, permisos e independencia al actuar; su presencia no prueba consentimiento. No conceder roles para pasar el test. |
| H05 | Configuración de empresa → Aplicabilidad de retención → Nuevo registro | Tenant Admin autor; fuente H04 elegible | Crear nueva aplicabilidad con fuente, cláusula, clasificación y contexto exactos. Usar versión/sucesión coherente; conservar los dos casos técnicos previos. Enviar a revisión. | Draft → under_review auditado. Los dos casos técnicos sin fuente no se convierten en respaldo jurídico. No existe un comando aprobado de edición de aplicabilidad para rellenarlos retrospectivamente. |
| H06 | Misma aplicabilidad → Aprobar; luego Publicar | Legal Reviewer distinto del autor para aprobar; publicador autorizado después | Ejecutar revisión separada y aprobación real; publicar sólo al revalidar fuente, vigencia, SoD y contexto. | Fuente vigente y aprobada; CAS/If-Match e idempotencia; AuditEvents de approve y publish. Una negativa no se compensa por SQL, grant o cambio de IAM. |
| H07 | https://grc.tecdex.net/controles → Evaluaciones de control | Autoridad QA con acceso al tenant de prueba | Revisar `01a14122-06e4-748d-a3db-5935f64c1901`: `insufficient_data`, métricas/cobertura/conclusión nulas; comparar histórico `01a11afc-7f48-701e-9c0b-c2bc01ba0a5e`. | Aceptar presentación diagnóstica; histórico aprobado intacto. EC ausente no declara `none`. No aprobar el diagnóstico como `valid`. La prueba nueva de Controls ya está auditada y no necesita recrearse. |
| H08 | Configuración de empresa, Evidencias y Controles; escritorio y pantalla estrecha | Autoridad humana QA/UI | Revisar etiquetas españolas, navegación, tablas/detalles/selectores, estados vacíos/insuficientes, teclado/foco, overflow y branding. Recargar la sesión y volver a las pantallas. | Capturas QA de las pantallas realmente desplegadas, dimensiones y resultado humano explícito. Las capturas locales con API simulada del expediente no sustituyen este acto. |
| H09 | Selector Empresa activa; mismos módulos | QA con dos contextos **existentes** y autorizados | Cambiar de empresa; comprobar que IDs/listas/fuentes del otro tenant no aparecen. Para probar actor sin permiso o entitlement, usar una identidad/contexto existente apropiado. | Recibo HTTP/UI específico del residual. Reutilizar aceptación comercial anterior sólo para su alcance histórico. Si no existe actor apropiado, registrar NOT_RUN; no crear tenant ni modificar IAM. |
| H10 | Acta siguiente y expediente | Autoridad QA/Release competente | Adjuntar recibos H01–H09 y los negativos pendientes, evaluar gates y expresar aceptación o rechazo por esta versión exacta. | Sólo cerrar STEP_6A3 cuando todas las obligaciones aplicables estén acreditadas. STEP_6A4 permanece NOT_STARTED incluso después de aceptar. |

### Dependencia inicial de la fuente: no prometer una carga imposible

El backend actual exige una aplicabilidad primaria ordinaria publicada para `request-upload` (`assertPrimaryRetentionApplicability`). QA no tiene ninguna. La única EvidenceVersion histórica está approved/scan-PASS, pero `effective_from=NULL`, sin acreditación jurídica; no puede convertirse en la fuente inicial mediante edición. El formulario de nueva aplicabilidad permite omitir fuente para respaldo pendiente; esa capacidad técnica **no autoriza presentar una publicación sin respaldo como acreditación jurídica**.

H01 puede realizarse inmediatamente. Antes de H03, Privacy/Legal y el responsable rector deben documentar cómo se incorpora esa fuente auténtica inicial dentro del contrato ya aprobado. Si no hay un recorrido autorizado con los datos existentes, conservar el recibo del selector vacío/422 e identificar únicamente ese recorrido faltante para decisión competente; no volver a pedir aprobación del paquete de diez artefactos ni inventar bootstrap, fixture o backfill. Este checklist no autoriza publicar las dos filas pendientes sin fuente. No se declara que la simple entrega de un archivo cierre automáticamente esta dependencia.

## Negativos específicos que todavía requieren recibo QA suficiente

La sesión parcial informó DENY de autoaprobación y de `valid` forzado. Se recuperaron la persistencia CFG-D y las auditorías de transiciones, pero no un recibo HTTP de esos rechazos ni las capturas de aquella herramienta de escritorio. La lectura filtrada de logs no recuperó respuestas correlacionables. No se presentan como pruebas HTTP independientes.

| Caso pendiente | Ejecución / resultado exigido |
|---|---|
| Autoaprobación C-04W | Autor del caso `01a14126-bc97-7721-85e4-e34026cf4213` intenta approve por flujo normal; DENY y fila permanece under_review/row_version 2. No aprobar con el otro actor hasta disponer del respaldo auténtico. |
| CFG-D requisito y control | Reutilizar resultado Controls existente; conservar recibo del rechazo `valid` con input insuficiente. Compliance v1 tiene pruebas locales, pero no se recuperó una ejecución QA específica: probar sólo sobre un caso nuevo autorizado y diagnóstico, preservando históricos. |
| Tenant / permisos / entitlement | GET con contexto ajeno autorizado devuelve ausencia/404 según contrato; sin permiso o capability devuelve 403; sin autenticación, 401. Capturar método/path/status/correlation sin token. |
| Fuente / cadena / hold | Una vez disponibles H02–H06, probar discordancia policy/clasificación/scope, fuente no elegible y hold posterior al upload con objetos QA autorizados y sin fabricar documento jurídico. Levantar hold requiere acto Legal Reviewer distinto del autor; no ejecutar release por el mero checklist. No existe aquí recibo QA de purge ni se elimina ningún objeto. |

Las pruebas PostgreSQL aisladas y UI simulada ya preservadas acreditan su alcance técnico; no se repiten ni se renombran como QA con OIDC real. Los escenarios que dependen de fuente/H02 quedan pendientes de esa dependencia; no impiden reconocer los checks técnicos independientes que ya pasaron.

## Plantilla de acta — sin decisión ni firma anticipada

```text
ACTA STEP_6A3 C-04W / CFG-D
Estado de esta plantilla: SIN FIRMAR; NO ES APROBACIÓN
Identidad humana:
Funciones ejercidas (Privacy/Legal / Legal Reviewer / QA-Release):
Tenant y membership del actor:
Fecha/hora UTC real del acto:
URL: https://grc.tecdex.net/
Backend image ID y source SHA-256:
Frontend image ID y source SHA-256:
Manifest de publicación: e7f30ded29f213fa33a8648466b5c7bbfcc6bb520e6cdf2b11968a41d9f6e944
Documento auténtico: ID/hash/origen autorizado/cláusula/contexto/vigencia:
Autor / revisor independiente / EvidenceReview / AuditEvents:
Aplicabilidad inicial habilitante y fundamento de su incorporación:
Aplicabilidad definitiva / versión / source ID / publicación / AuditEvents:
H01–H10: por fila PASS / FAIL / NOT_RUN, motivo y recibo/hash:
Negativos QA pendientes: por caso PASS / FAIL / NOT_RUN, recibo/hash:
Capturas QA reales: paths/hashes, pantalla, viewport, fecha:
Históricos preservados y verificación de tenant/RBAC/SoD:
Decisión humana exacta, alcance y observaciones:
HUMAN_UI_REVIEW: (sin valor hasta el acto real)
Aceptación funcional QA: (sin valor hasta el acto real)
STEP_6A3: PARTIAL_BLOCKED hasta comprobar todos los gates
STEP_6A4: NOT_STARTED
Firma o mecanismo humano verificable:
```

No se exige nueva versión metodológica ni modo `none` para aceptar el comportamiento conservador CFG-D aprobado. Ninguna firma sobre esta plantilla puede dispensar fuente, SoD o verificaciones faltantes por omisión.
