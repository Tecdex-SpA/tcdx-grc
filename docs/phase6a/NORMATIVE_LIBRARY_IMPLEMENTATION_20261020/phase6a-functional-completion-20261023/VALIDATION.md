# Validación reproducible y límites

Vigente: sección final «Validación vigente de esta cuenta». Las secciones
anteriores son evidencia histórica y no resultados nuevos.

## G — Pruebas ejecutadas

| Comando/procedimiento | Resultado |
| --- | --- |
|pnpm typecheck|PASS workspace|
|pnpm build|PASS workspace; build local, no imagen/promoción QA|
|pnpm exec vitest run --reporter=json --outputFile=…/unit-final.json|1078PASS,237SKIPPED por entorno,0FAIL|
|bash scripts/regulatory/run-pipeline-postgres-tests.sh|10PASS,PG16;245tablas incluido ledger,0schema mismatches; clúster detenido|
|bash scripts/normative-library/run-operational-postgres-tests.sh|10upgrade defaults+40B04/H04=50PASS,PG16|
|pnpm contracts:verify|PASS|
|bash scripts/verify-rector-governance.sh|PASS|
|pnpm secrets:scan|0hallazgos|
|git diff --check|PASS|
|Diff frontend/docs-ui/database/baseline/executable-contracts frente origin/main|VACÍO|

TESTS_MOCKED:1078 unitarias, incluidas pruebas de contratos/API inject, permisos,
default DENY, idempotencia, concurrencia y fuentes. Las237 omitidas no son PASS;
los casos PG pertinentes ejecutados aparte se identifican arriba.
TESTS_INTEGRATION:60casos reales PostgreSQL16, con identidades/contenidos/proofs
sintéticos explícitos en clústeres de propiedad de esta tarea. Ningún fixture
acredita fuente normativa, firma humana o derecho de explotación real.
TESTS_REAL_QA: PostgreSQL READ ONLY/TLS verify-full; ledger36 exacto,244tablas/
3630columnas de producto y ledger1/9; cero constraints sin validar/índices inválidos.
M2M privado real fresco,0committed writes; backend/frontend healthy y misma fuente
f060cb1,HTTPS200/HTMLparity. GET catálogo y matriz sin token devuelven401.
TESTS_HUMAN_OPERATIONAL:NOT_RUN. No E2E humano de publicación/contratación acreditado.

QA matriz:333RequirementControlMapping y6FrameworkCrosswalk;0huérfanos de mappings
requisito-control/unidad-control y0cabeceras huérfanas;0violaciones inspeccionadas
de provenance/version/no_match en los tres tipos. Esto verifica integridad de
datos existentes, no su homologación semántica. Lectura funcional desde
loadMatrixPopulation sobre objetos importados se ejecutó en PG16 con controles
de permisos y trazabilidad, sin cambios de diseño ni matrices nuevas.

Intentos anteriores conservados como resultados fallidos, no PASS: timeouts antes
de VPN; initdb/puerto denegados por sandbox; expectativa de jurisdicción del
fixture; prueba negativa UUID aleatoria. earlier-attempts.json explica corrección.
El validador productivo de procedencia no cambió, ninguna aserción se desactivó.
El runner sobrescribió su reporte final tras corregir el fixture; el resumen
de fallo conserva los conteos observados sin inventar el hash del reporte anterior.

## D — Operación humana B04 preparada, no ejecutada

Snapshot QA: PO creó01a16575-da86-743c-a680-40563e61a7a4, audit
01a16575-da94-76ef-90f6-cefe61818866; sigue draft. Mario creó otra propuesta,
01a16571-2563-715c-ab43-299281d97d00; no es la revisión de la del PO.
Mario Managed01a16559-dee5-754d-a746-aa5b961e22e2,Membership
01a1656f-c602-73b0-a658-fef85f26ed72,GRC_MANAGER TECDEX activo. No cambiar roles.
TenantTECDEX01a0cfc7-0c97-75a3-890f-d6ca9db8bbe9. NoACME-1.

Secuencia indispensable por actores reales:
1. PO autentica personalmente, recupera su propuesta por GET oficial y prueba
   que su propio review/decide es rechazado. Registrar code/correlation sin tokens.
2. Mario autentica personalmente por Managed Identity/password+TOTP y recupera
   el mismo recurso. Verificar tenant, autor, estado y vigencia antes de operar.
3. POST /api/v1/configuration-overrides/{id}:review con If-Match fuerte del GET
   actual,Idempotency-Key propia y cuerpo cerrado
   {"decision":"reviewed","rationale":"<revisión real del actor>"}; rechazo usa
   decision=rejected. No reutilizar el ETag después de una transición.
4. GET actual; luego :decide con nueva clave,ETag y
   {"decision":"approved","rationale":"<decisión real del actor>"} o rejected.
5. Repetir el comando idéntico con la misma clave; comprobar replay sin segundo
   audit/outbox. Obtener estado actual por GET; el resultado de replay es histórico.
6. Verificar UUIDs de audit review/decide, actores distintos del autor, transición,
   flags de vigencia y el conflicto409 de un ETag obsoleto; preservar historia.

No copiar credenciales, firmar tokens de humanos o introducir VerifiedIdentity
fabricada contra QA. El borrador PO termina2026-10-23T21:20Z: si la operación
se realiza después, el autor debe ajustar/crear mediante comandos canónicos
autorizados y revisar ese artefacto exacto. No extender fechas por SQL.
Las pruebas aisladas50PASS acreditan el software automatizable, no estos pasos.

## E/F — Publicación, contratación y ticket

No hay paquete oficial elegible para ejecutar un contrato QA auténtico.
Los positivos unitarios/sintéticos no cuentan como PUBLISHING_E2E o CONTRACTING_E2E.
La autorización PO no equivale a licencia ISO ni al recibo operacional de un actor.
El PDF editable existente no cuenta como emisión. No hay referencia documental
en los DTOs cerrados de onboarding25 o activación. El binding de emisión/
persistencia del ticket requiere cierre contractual concreto antes del código.

RESULT contiene cada bloqueo con causa,dependencia,evidencia,acción,owner y unlock.
Los recibos completos quedan en custodia privada ignorada por Git, referidos por
SHA256 desde RESULT; sus extractos anteriores bastan para continuidad sin secretos.


## Ejecución 1/3 — evidencia final de runtime

Código: 4eaf58906b1206be5f6a7e8ac7ff7e520fb4c5c7. Node22.23.2,
pnpm12.4.1, PostgreSQL16 local aislado. La primera pasada utilizó Node26.4.0;
se repitió la validación completa con el engine exacto del repositorio. Binario
oficial temporal verificado contra SHASUMS256:
61130f394c1630d211dd50aecc4353d379480f36d3ac913cd85dbba1aed585c6.
No instalación global ni cambio de dependencias/lockfile.

| Nombre / comando | Entorno y datos | Resultado | Recibo privado / alcance |
| --- | --- | --- | --- |
| pnpm typecheck | Node22, workspace | PASS | runtime-node22-typecheck.log |
| pnpm build | Node22, workspace | PASS; advertencia de tamaño de bundle preexistente | runtime-node22-build.log; no imagen ni deploy |
| pnpm exec vitest run --reporter=json --outputFile=<custody>/runtime-node22-unit.json | Local, fixtures/unit/mocks explícitos | 1079PASS / 248omitidas por flags / 0FAIL | runtime-node22-unit.json; no E2E operacional |
| bash scripts/regulatory/run-runtime-postgres-tests.sh core | PG16 propio; DB nueva por suite; catálogo editorial draft preexistente y actor sintético | 43PASS | runtime-node22-core-postgres.log; nueve suites, lector36 + upgrade31 separados |
| bash scripts/regulatory/run-runtime-postgres-tests.sh commercial | PG16 propio, planes/familias/paquetes sintéticos, tokens firmados | 3catálogo +25cambio plan +6pack HTTP =34PASS | runtime-node22-commercial-postgres.log |
| bash scripts/normative-library/run-operational-postgres-tests.sh | PG16 propio; 35→36migraciones; B04/rights sintéticos | 10upgrade +45operacionales técnicos =55PASS | runtime-node22-b04-postgres.log |
| bash scripts/regulatory/run-pipeline-postgres-tests.sh | PG16 propio, contenido explícitamente sintético | 10PASS | runtime-node22-importer-postgres.log |
| pnpm contracts:verify | Generados efectivos | PASS | runtime-contracts.log |
| bash scripts/verify-rector-governance.sh | Baseline/manifiestos/contratos | Exit0 / integridad PASS | runtime-governance.log; gates históricos BLOCKED impresos no se convierten en PASS |
| pnpm secrets:scan | Diff/fuentes | 0hallazgos | runtime-secrets.log |
| git diff --check | Fuentes/expediente | PASS | verificación Git |

Custodia: .release-custody/phase6a-functional-completion-20261023/.
RESULT.RUNTIME_EXECUTION.TESTS.receipts registra SHA256 por archivo, y conserva
106 omisiones **individualizadas** con nombre, archivo, configuración requerida,
causa y criticidad. runtime-test-inventory.json clasifica cada una de las1327
pruebas por comando/entorno/datos/resultado/evidencia/alcance/límites. Las248
omitidas por el runner unitario incluyen142 ejecutadas realmente en PG aparte;
las106 restantes no se contabilizan como PASS. Las omisiones de selección en el
lector de referencias son complementarias:11casos actuales y1upgrade ejecutados
sobre sus respectivos esquemas; ningún caso de esa suite queda omitido.

TESTS_MOCKED: el conjunto unitario incluye mocks de puertos, autenticación y
almacenamiento según cada archivo; no demuestra derechos legales ni IAM humano.
TESTS_INTEGRATION:142 PostgreSQL reales. B04 añade cinco casos sobre socket HTTP
local y los servicios reales, con sesiones JWT sintéticas firmadas, además de los
40casos previos. Contratación añade seis casos Fastify.inject sin interceptar
handlers/repositorios. El adaptador de custodia H04 se prueba con MinIO sustituido;
los casos PG de rights usan attestation synthetic. No equivalen a prueba de MinIO
QA ni a licencia auténtica. TESTS_REAL_QA=NO_EJECUTADAS_EN_ESTA_EJECUCION;
TESTS_HUMAN_OPERATIONAL=EXCLUIDAS_POR_MANDATO. No hay aprobación humana simulada.

### Casos y límites de publicación, ticket y matrices

PUBLISHING_HTTP_RUNTIME=BLOCKED. Positivos HTTP ejecutados:0. Negativos HTTP
contractuales ejecutados:0. Las guardas del pipeline interno tienen pruebas,
pero no acreditan binding HTTP/CAS/coaprobaciones. No se añade ruta alternativa ni
se llama un404 genérico una prueba satisfactoria de autorización de publicación.
Los doce negativos exigidos (permiso, tenant, ausencia, versión, ETag, approvals,
derechos, edición, paquete, replay, concurrencia y estado) siguen siendo criterio
obligatorio del binding pendiente; no se declaran ejecutados.

TENANT_TICKET_RUNTIME=BLOCKED. El PO cerró emisión externa e incorporación
posterior, no emisión dentro de GRC. La plantilla no es documento emitido ni
recibo contractual. Persistencia/recuperación de la incorporación aún requieren
el contrato tipado de HANDOFF; ningún dato comercial oficial se crea en QA.

MATRIX_RUNTIME tiene SQL real probado para RequirementControlMapping, versiones,
procedencia y denegación, más los seis tipos en pruebas unitarias. No se declara
prueba HTTP+PG poblada de todos los ejes. Esa limitación permanece visible como
verificación integral no cerrada, no como trabajo aceptado para ejecución2.

### B04 / H04 / contratación: demostración técnica

B04: create202 y replay exacto; PATCH con ETag leído por GET; autorreview403;
review independiente200; decide200; rechazo review/decide terminal; JSON cerrado;
no bearer/token inválido401; tenant ajeno404; viewer403; If-Match ausente o
malformado400, obsoleto409; dos reviews concurrentes200/409; decisión fuera de
estado409. Se verifican actores reales de fixtures, IDs audit review/decision,
cuatro AuditEvent y cuatro outbox del circuito válido. Fallo de INSERT audit500
revierte transición; reintento exacto funciona con la misma key. No actúa Mario.

H04: intervalos con precisión de microsegundo, inclusive desde/exclusive hasta y
revocación; múltiples instantes equivalentes con zona; tiempo inválido DENY.
Fuente/hash/edición/paquete/audiencia/acto/ambiente exactos, evidencia ausente o
ambigua deniega. Historial inmutable, revocación, rollback y replay PG. La relación
hacia RegulatorySource/publicación global sigue contractual y no se sustituye por
license_classification. No se atesta derecho real sobre ISO.

Contratación: asignación de versión exacta → visibilidad efectiva → revocación →
visibilidad retirada; replay de activación conserva resultado original anterior
a la revocación y hash. Concurrencia misma key crea una fila; intención cambiada
409; rol Support/tenant header403; token ausente/inválido401; recurso ausente404;
campos adicionales400; fallo audit500 revierte assignment/claim y permite retry;
resultado corrupto503; autoridad revocada403 incluso con token aún válido. No se
crea paquete comercial ni contratación oficial en QA. Los25casos de cambio de
plan verifican términos, versiones, límites, capabilities, transferencia y
atomicidad; los tres accesos provisionales existentes no cambian.

### Intentos iniciales corregidos

El sandbox impidió shmget/listener; se repitieron runners con autorización de
clústeres locales, no se contaron esos fallos como PASS. La primera base limpia
no tenía la publicación de referencias ni catálogo draft que exigen los tests;
la preparación ahora usa SQL canónico y materializador existentes bajo guardas de
propiedad local. Se corrigieron cast explícito del parámetro UUID y display_name
obligatorio en fixtures. PlanVersion publicada no se modifica para negativos:
se crean candidatas separadas, con familias/cuotas/entitlements coherentes, y se
conservan los422 esperados. El caso scan ahora exige422/code/mensaje del guard
vigente y comprueba estado approved/versión3 inalterados, antes de probar éxito
tras restaurar el scan. La migración de referencia se prueba en31reales, sin
suprimir ledger de36 ni omitir sus asserts. Logs de intentos quedan en custodia;
los recibos finales Node22 contienen cero fallos y todos los clústeres detenidos.

RUNTIME_TECHNICAL_CLOSURE=BLOCKED; no PARTIAL_PASS. Los dos contratos propuestos
requieren revisión/publicación antes de código; las106pruebas globales omitidas
y cobertura matricial parcial tampoco reciben un PASS por tener CI verde.


Recibo Git: publicación origin HEAD b2ef5d61e29a1fdda9f501377eec3255ea456502,
PR27 OPEN/MERGEABLE, rector-governance PASS8s:
https://github.com/Tecdex-SpA/tcdx-grc/actions/runs/39974129352/job/120484191308.
Código probado4eaf589; main c2a774f y PR26 6f558f4 intactos; working tree limpio
al publicar. El commit documental que incorpora este recibo se verifica aparte
por CI; no invalida ni cambia la evidencia del código probado.


## Validación vigente de esta cuenta — ejecución 1/3 local

Esta sección sucede los conteos históricos anteriores. Node22.23.2/pnpm12.4.1;
PostgreSQL16.14 exclusivamente en clústeres temporales propios y detenidos.

| Comando | Resultado actual |
| --- | --- |
|pnpm exec vitest run --config vitest.config.ts --reporter=json --outputFile=…/unit-complete.json|1083PASS,289SKIPPED,0FAIL|
|bash scripts/regulatory/run-runtime-postgres-tests.sh core|43PASS|
|bash scripts/regulatory/run-runtime-postgres-tests.sh commercial|34PASS|
|bash scripts/regulatory/run-runtime-postgres-tests.sh security|77PASS; diez suites actuales y tres publicaciones históricas sobre predecesores26/27/28 reales|
|bash scripts/regulatory/run-runtime-postgres-tests.sh iam|9PASS; proveedor de tokens sintético|
|bash scripts/regulatory/run-runtime-postgres-tests.sh legacy|20PASS;34migraciones reales, contratos sellados verificados, rollback|
|bash scripts/normative-library/run-operational-postgres-tests.sh|55PASS:10upgrade+45operacionales|
|bash scripts/regulatory/run-pipeline-postgres-tests.sh|11PASS; incluye política interna H04 sin registros de derechos ficticios|
|bash scripts/regulatory/run-binding-postgres-tests.sh runtime|40PASS; esquema candidato245/3652,0mismatches; seis packs y seis matrices pobladas|
|pnpm exec playwright test --config=…/playwright-b04.config.ts|10PASS desktop/narrow; handlers reales con executor SQL de fixture|
|pnpm exec playwright test --config=…/playwright-library.config.ts|8PASS desktop/narrow; composición/matrices y negativos con API interceptada|
|pnpm typecheck; pnpm build|PASS workspace; advertencia de tamaño de chunk frontend preexistente|
|pnpm contracts:verify; node scripts/regulatory/generate-runtime-binding-assets.mjs --check|PASS|
|bash scripts/verify-rector-governance.sh; bash scripts/test-rector-governance-status.sh|PASS integridad/status; no implica gate operacional|
|pnpm secrets:scan; git diff --check|0hallazgos;PASS|

Las289pruebas PostgreSQL son las289omisiones del runner unitario; no se suman
dos veces ni quedan omisiones sin ejecutar. TEST_SUITE_INVENTORY en RESULT
identifica cada suite, hash y caso individual. TECHNICAL_RECEIPTS contiene rutas
y SHA256 de logs privados; test-inventory-complete.json puede regenerarse desde
la salida JSON de Vitest y las suites de los runners versionados. Una cuenta
sin custodia privada puede repetir esos comandos; sus UUIDs/tiempos serán nuevos.

La batería nueva prueba recibos/tres poblaciones/roles reales, combinaciones de
los seis packs, SoD del importador, rights vigentes/revocadas, CAS, concurrencia
con misma/distinta key, rollback de audit, resultado idempotente corrupto,
versionado documental, descarga de bytes sintéticos exactos, asociación tenant,
FK físico, Platform sin PDF, correcciones concurrentes, seis matrices pobladas,
permisos de cada origen, concealment, cursores/fingerprints y lecturas sin writes.
La comprobación de revocación concurrente usa locks reales y timeout55P03; no
se etiqueta un permiso de consulta como autorización de distribución.

Los intentos fallidos se conservaron, incluidos sandbox shmget/listen, fixtures
incompletos de retención/mapping/source, catálogo IAM antiguo, clasificación
errónea de roles tenant/global y timestamps locales etiquetados UTC. Se corrigió
la clasificación productiva y las fixtures contra contratos vigentes; no se
relajaron invariantes ni se deshabilitaron pruebas. Los tests históricos ya no
forjan filas del ledger: aplican migraciones exactas en bases separadas. El
manifest34 C04W se obtiene del prefijo vigente y coincide byte a byte con su
hash sellado; el loader operacional mantiene su rechazo a dependencias distintas.

TESTS_REAL_QA=NOT_RUN; TESTS_HUMAN_OPERATIONAL=NOT_RUN; HUMAN_UI_REVIEW=PENDING.
Los18browser no son pruebas de persistencia real ni aprobación visual humana.
No cambió frontend; las imágenes históricas anteriores no representan el source
nuevo. No hay nuevas publicaciones, derechos, licencias o documentos reales.
