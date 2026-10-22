# Validación y evidencia mínima

## Resultados técnicos

| Comprobación | Resultado y alcance |
| --- | --- |
| Integridad rectora | PASS, verify-rector-governance.sh |
| Unitarias generales | 1072 PASS; 227 PostgreSQL omitidas, no contadas como PASS |
| Corrección HTTP/ETag | 44 PASS, composición de 32 operaciones y pruebas CAS/replay |
| TypeScript backend/frontend | PASS |
| Navegador compilado | 255 identidad/formularios + 105 producto/catálogo PASS en tres tamaños |
| Últimos cambios de dashboard/tablas/detalles | 36 PASS en desktop/tablet/mobile |
| Nueva navegación/autorización/overflow | 3 PASS, uno por tamaño |
| PDFs | Dos documentos de una página revisados; ticket con 23 campos/controles vacíos |
| HTTP PDFs local y QA | 2/2, application/pdf, firma PDF y SHA-256 exacto |
| Secret scan | 0 hallazgos |
| CI PR25 | rector-governance PASS sobre f060cb1 |
| PostgreSQL QA READ ONLY | 16.15; 36 migraciones, 244 tablas, 3630 columnas |
| Integridad de migraciones | 36 IDs/nombres/hashes coinciden exactamente con manifest local |
| Promoción backend/frontend | PASS_QA, saludables, mismo commit f060cb1 |
| Runtime/dominio | readiness up; HTTPS 200; HTML SHA-256 coincide con contenedor |
| Operador publicación | PASS_FRESH_M2M; no grants u operadores nuevos |

Las pruebas de navegador compilado usan fixtures contractuales aislados. No
prueban publicaciones, licencias, contratación oficial ni revisión humana real.
La primera ejecución de navegador fue rechazada por sandbox; se ejecutó luego
con permisos. Dos errores de invocación de build y un selector de prueba fueron
corregidos; los resultados anteriores no se presentaron como PASS.
El transporte backend inicial excedió 240s; no se promovió ese intento. La
transferencia posterior verificó la imagen y permitió promoción con rollback.

## Recibos resumidos en RESULT.json

Runtime capturado 2026-10-22T21:32:15.688415Z. Código runtime f060cb17.
Backend imagen sha256:4062adbb09d4c7fa308f0d3a5cd1b730ab0b938bf5c46d57869ca56f5de1ed3d.
Frontend imagen sha256:8d347f9f831afc081e5ba69a96c6d5b10fe448bfdc932e6356c2a1caf441dcf4.

Creación PO del ajuste: audit_event_id 01a16575-da94-76ef-90f6-cefe61818866,
configurationOverrideCreate succeeded, agregado 01a16575-da86-743c-a680-40563e61a7a4.
Autor PO 01a0cfae-d860-730d-88b8-d8b1b3f5d7dc. Mario IAM real
01a16559-dee5-754d-a746-aa5b961e22e2, autenticado 21:06:39.221Z y GRC_MANAGER
TECDEX desde 21:06:26.495Z. No confundir con su identidad histórica distinta.
No hay revisión ni decisión acreditada de esta propuesta. No se probó todavía
la denegación de autorrevisión PO después del despliegue.

Custodia privada ignorada local: .release-custody/qa-full-functional-closure-premium-ui-20261022/.
Contiene recibos de build/transport/preflight/promote, runtime-after.json,
final-scope.json, release-check.json, resultados de pruebas y capturas.
No publicar sesiones, respaldos ni credenciales. Los datos necesarios para
continuidad están resumidos en los cuatro archivos versionados de este expediente.
Las capturas históricas STEP6A4 sobrescritas por el runner fueron restauradas
exactamente desde HEAD; las nuevas capturas se conservaron sólo en custodia.

## Pendientes registrados antes de la continuidad

GET B04 corregido autenticado por dominio; rechazo real de autorrevisión;
revisión y decisión personales Mario; persistencia/auditoría/CAS/replay;
recorrido responsive del frontend desplegado con datos reales, formularios y
matrices; aceptación visual humana; fuentes/derechos/revisión normativa;
Ley21.663; homologación/publicación/contratación oficial; ticket realmente emitido,
aprobación de Gerencia, entrega a Operaciones y uso de seis marcos contratados.

## Verificación de continuidad 2026-10-22

- Fetch origin: rama local/remota f060cb1 al recuperar; sólo cuatro documentos
  pendientes. Handoff sellado/publicado en6d87de6; CI rector-governance SUCCESS.
  PR25 OPEN, no Draft, MERGEABLE/CLEAN al checkpoint. Ruleset23480142 exige PR,
  resolución de hilos y rector-governance estricto, cero reviews adicionales.
- runtime-resume.json: imágenes y contenedores exactamente iguales al checkpoint,
  healthy, NODE_ENV=qa, misma fuente f060cb1, readiness/DB up, HTTPS200/HTML idéntico.
  Cuatro operadores privados siguen running; publisher autenticó M2M nuevamente
  con verify-full y cero escrituras. Keycloak existente healthy.
- resume-readonly.json: TLS verify-full, peer exacto aprobado, transacción
  REPEATABLE READ READ ONLY y ROLLBACK. Mario activo/autenticado/GRC_MANAGER.
  Auditorías reales de provision, onboarding y login verificadas; sólo dos create
  B04, sin review/decide. No se presenta una prueba anterior de otro flujo como
  aprobación del borrador actual. Ratificación PO preservada sin nueva ceremonia.
- post-resume.json:36 filas de ledger idénticas en ID/nombre/SHA/outcome al manifest.
 244 tablas/3630 columnas de producto más ledger técnico de1tabla/9columnas:
  total245/3639. Cero índices inválidos y cero constraints sin validar.
  Una primera consulta acotada a una lista incompleta de schemas dio166/2403;
  no era drift: el conteo completo y catálogo canónico resuelven esa limitación.
- resume-asset-parity.json: JS index-CTx7pw4E.js y CSS index-Cp30uVvk.css descargados
  del dominio canónico coinciden SHA256 con el contenedor QA activo. Se conservan
  1072unitarias,44HTTP/CAS y399casos compilados previos; no se vuelven a ejecutar
  suites cerradas. browser-core-results fue sobrescrito por el runner final de3;
  el log browser-core.log conserva105PASS, browser-final.log36PASS,
  browser-shell.log3PASS y browser-components-results255PASS. El primer intento
  fallido no cuenta como PASS. Fixtures no acreditan contratación humana real.
- El PO ratificó aprobaciones/pruebas previas en esta conversación; aceptación
  visual conservada por autoridad humana, sin autoaprobación de Codex.

### Estado individual de los seis marcos

| Código | Fuente/edición | Estado verificable y bloqueo individual |
| --- | --- | --- |
| ISO_9001_2015 | ISO9001:2015+Amd1:2024 |35unidades/35requisitos draft, cero revisados; fuente licenciada y cobertura auténtica faltantes |
| ISO_9001_2026 | ISO9001:2026,edición6 |35/39draft; ISO confirma publicada; no fuente definitiva licenciada ni revisión del contenido |
| ISO_IEC_27001_2022 | ISO/IEC27001:2022 |105/7draft,93controles;1unidad revisada, cero requisitos/controles revisados |
| ISO_IEC_42001_2023 | ISO/IEC42001:2023 |55/7draft,38controles; cero revisados |
| CL_LEY_21719 | BCN21719+19628consolidada,2026-12-01 |30/30;coverage100declarado,91mappings; approved_by/approved_atNULL; no publicación; vigencia futura preservada |
| CL_LEY_21663 | BCN,idNorma1202434 |Fuente pública localizable; sin header/versión/import/cobertura/revisión persistidos; no temporalidad uniforme inventada |

Fuentes comprobadas: [ISO2015](https://www.iso.org/standard/62085.html),
[ISO2026](https://www.iso.org/standard/9001),
[27001](https://www.iso.org/standard/27001),
[42001](https://www.iso.org/standard/42001),
[Ley21719](https://www.bcn.cl/leychile/navegar?idNorma=1209272&idVersion=2026-12-01),
[Ley21663](https://www.bcn.cl/leychile/navegar?idNorma=1202434).
ISO2015 retirada y reemplazada por2026 según catálogo; no se borra historia ni se
fusionan ediciones. Metadatos externos no autentican archivos recibidos.

H04: cero derechos Knowledge atestados en QA. No se inventa licencia, proof,
evidence hash o grant. Esto no prohíbe enlaces de metadatos o texto legal por ser
una ISO distinta; cada fuente/acto y el gate de pack se conservan independientes.

Contratación: subscriptionRegulatoryPackActivate consume versión publicada
elegible+Subscription/PlanVersion vigente, con actor Platform autorizado,
idempotencia/audit; no activa borradores. No existe contrato publicado de
solicitud/aprobación electrónica ni campo ticket_ref en sus esquemas cerrados.
Se conserva la autorización PO, sin atribuir firmas, ejecución de Gerencia u
Operaciones o contratos inexistentes. Los PDF siguen en
apps/frontend/public/commercial/ y se sirven en /commercial/.

Los recibos privados nuevos y sus SHA256 quedan referenciados en RESULT.
La descripción final del PR25 registra el merge_commit_sha, CI y worktree finales;
no se crea otro expediente. No se ejecutaron nuevas escrituras empresariales,
DDL, imports, builds, despliegues ni cambios de otros tenants.

Verificación focalizada final del bundle exacto servido por QA:45/45PASS en10.5s,
desktop/tablet/mobile; shell, navegación autorizada, catálogo, contratación,
dashboard, tablas y detalles, foco y etiquetas. Todas las APIs se interceptaron;
una ruta de contención rechaza cualquier API no interceptada. Cero autenticaciones
simuladas contra el backend y cero escrituras QA. Es regresión del frontend
publicado con fixtures, no prueba humana dual ni contratación oficial. El JS del
build local y el JS del contenedor tienen nombres distintos; se verificó el
hash del contenedor y se probó directamente ese bundle. El primer URL local
solicitado devolvió el HTML fallback; no se contó como prueba de paridad.
Primer lanzamiento Chromium restringido por sandbox; reejecución autorizadaPASS.
