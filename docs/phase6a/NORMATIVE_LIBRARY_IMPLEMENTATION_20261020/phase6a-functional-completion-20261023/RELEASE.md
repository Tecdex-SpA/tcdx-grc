# Cierre funcional Fase6A — implementación y verificación 2026-10-23

Estado vigente: **ejecución 1/3 — cierre técnico local PASS; release operacional PARTIAL**.
La sección final de transferencia y las claves actuales de RESULT.json rigen
este cierre. Todo resultado anterior se conserva como evidencia histórica;
HISTORICAL_PRE_TRANSFER_RESULT identifica el snapshot previo completo.

Ejecución PHASE6A_FUNCTIONAL_COMPLETION_NORMATIVE_HOMOLOGATION_CONTRACTING.
Baseline activa TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16.
Fase POST_STEP6A4_PRE_STEP6A5. STEP6A5/6A6 no autorizados.
Base main=c2a774f1f55b1edc3abc347ed155c4730d18fe31; PR25 MERGED/CI SUCCESS.
Rama feat/phase6a-functional-completion-20261023. PR26/ui-premium-review intacto.

## A — Estado inicial y final

| Indicador QA | Inicial declarado | Final verificado |
| --- | --- | --- |
| Marcos aprobados |6|6|
| Estructurados completos / homologados |0/0|0/0; cinco poblaciones draft conservadas|
| Publicados / contratables / contratados oficiales |0/0/0|0/0/0|
| Ley21663 |Sin materializar|Adaptador canónico corregido y PG16 verificado; sin import QA|
| B04 |Dos create; sin review/decide|Mismo estado QA; circuito automatizable probado en PG16|
| Ticket |PDF editable|Plantilla conservada; emisión bloqueada por binding contractual ausente|
| Backend/frontend/DB |PASS histórico|PASS inspección actual; no despliegue ni cambios QA|
| Matrices |Evidencia previa parcial|333relaciones/6cabeceras inspeccionadas sin defectos referenciales; lector PG16 probado|
| Implementación importador |Persistencia incompleta|PASS local del slice descrito abajo|
| Cierre integral |BLOCKED/PARTIAL|BLOCKED/PARTIAL; no cierre artificial|

## B — Marcos y fuentes

| Marco | Emisor/fuente y edición | Derechos | Estructura QA | Homologación/validación | Publicación/contratación | Evidencia |
| --- | --- | --- | --- | --- | --- | --- |
|ISO_9001_2015|[ISO](https://www.iso.org/standard/62085.html),2015+Amd1:2024|Fuente licenciada no acreditada|35unidades/35requisitos,draft|Coverage0,no homologación auténtica|0/0|QA entry,sources/coverage|
|ISO_9001_2026|[ISO](https://www.iso.org/standard/9001),edición6,2026|Fuente definitiva licenciada no acreditada|35/39,draft|Coverage0,propuestas separadas|0/0|QA entry+catálogo oficial|
|ISO_IEC_27001_2022|[ISO/IEC](https://www.iso.org/standard/27001),2022|No acreditados para texto oficial|105/7,93controles,draft|Coverage0|0/0|QA entry+metadata oficial|
|ISO_IEC_42001_2023|[ISO/IEC](https://www.iso.org/standard/42001),2023|No acreditados para texto oficial|55/7,38controles,draft|Coverage0|0/0|QA entry+metadata oficial|
|CL_LEY_21719|[BCN21719](https://www.bcn.cl/leychile/navegar?idNorma=1209272&idVersion=2026-12-01)+Ley19628 consolidada,2026-12-01|Fuente pública legal; no licencia ISO exigida|30/30,draft;vigencia futura preservada|Coverage100 declarado,approved_by/atNULL; no publicación acreditada|0/0|QA entry+BCN|
|CL_LEY_21663|[BCN](https://www.bcn.cl/leychile/navegar?idNorma=1202434),Ley Marco de Ciberseguridad|Fuente pública localizable; cotejo del payload pendiente|0/0 en QA|No import/homologación auténticos; capacidad de persistencia PG16 probada|0/0|ZIP candidatos+pruebas PG16|

Metadatos externos no prueban integridad o licencia del archivo recibido.
ISO2015 figura retirada/reemplazada por2026 en el catálogo; se preservan ambas
identidades e historia según rector41. Ningún estado comercial fue alterado.
H04 conserva cero instancias atestadas; no se inventan proofs ni derechos.
Metadatos, referencias/editorial y cuerpos protegidos permanecen separados.
La ausencia de derechos de una ISO no bloquea conceptualmente las dos leyes.

## C — Implementación real

Código ee2dee72f7683c5ea3c8b86bc9936687a41514d6:
- regulatory/model.ts: entrada interna con jurisdicción, vigencias por disposición,
  versiones explícitas de controles/correspondencias y procedencia por relación.
  Son columnas canónicas ya aprobadas; no nueva API, schema o entidad.
- regulatory/postgres-repository.ts: crea cabecera canónica de cualquiera de los
  seis códigos dentro de la misma transacción; preserva fuentes/controles existentes;
  conserva intervalos propios y no asigna una fecha uniforme a Ley21663.
  Completa columnas obligatorias de los tres crosswalks; destinos globales exactos,
  rechazo de ambigüedad y ausencia, sin LIMIT1 ni adopción de privados.
- regulatory/pipeline.ts y repository.ts: lock transaccional por pack bajo
  READ COMMITTED, replay concurrente y rechazo de drift de edición/checksum.
  Publicación interna exige el ID/hash/import exactos persistidos.
- regulatory/validator.ts: validaciones de campos, versiones, temporalidad,
  procedencia, duplicados y confianza finita; los packs nominales vacíos y
  crosswalks sin revisar no son candidatos listos para publicación.
- regulatory/pipeline.test.ts y pipeline.postgres.test.ts: guardas y persistencia
  física, seis códigos sintéticos, tres tipos, no_matchNULL, rollback,
  replay concurrente, aislamiento global/privado, versiones y lector matricial.
- scripts/regulatory/run-pipeline-postgres-tests.sh: procedimiento reproducible,
  contratos compilados,36migraciones intactas en PG16 desechable, validación de
  schema y parada verificada; no copia datos QA.
- Test-only9bb59eff2bc27283fc950db1de26d981096115ef:
  core-grc/vocabulary-provenance.test.ts corrige el dato negativo aleatorio UUID,
  sin modificar el validador productivo ni su expectativa DENY.

Autoridad: D02/D03/D06, B01/B07/B08, rectores37/41/44 y contrato12 de concurrencia;
modelo físico09 y migración contractual20260928000400 ya vigente.
Los ZIP originales se preservan; son preparación, no autoridad sobre la baseline:
76f31d9effc174e0d9133615c1e979a13f9b1f1c1b1ef291197ea2c4f129d68c y
4b7d7374fc0a09be9697ff9784f093c2b737edbaabe82460c3aa7c64659f9aee.
Su revisión interna declara especificación/no homologación completada.
D01–D09 no se reabren ni se solicita aprobación conceptual otra vez.

## D/E/F — Fronteras operacionales

B04: ejecución humana exacta preparada en VALIDATION. Dos identidades activas,
sin operación por el agente en nombre de Mario. No hay audit review/decide real.
Contratación: Subscription/PlanVersion y tres accesos QA provisionales preservados;
cero asignaciones oficiales. El catálogo vacío responde a gates reales.
Ticket: contrato QA_TICKET_COMMERCIAL_20261022 lo sitúa fuera del dominio y exige
binding ejecutable antes de solicitud/aprobación persistida. No se utiliza
Document/Evidence/auditJSON como sustituto de una entidad no autorizada.
Publicación HTTP: el contrato03 describe Reason+ETag y OpenAPI02 aún remite a
DomainCommandRequest genérico; falta binding de CAS y recibos auténticos.
No se publica un endpoint de conveniencia que confíe en flags del cuerpo.

RECTOR_GATE=BLOCKED para cierre integral; integridad del slice implementado PASS.
INTEGRATED_RELEASE_GATE=PARTIAL. Las causas/owners/unlock están en RESULT.
No merge, despliegue, import QA, permisos nuevos, cambios visuales o producción.

PR funcional: https://github.com/Tecdex-SpA/tcdx-grc/pull/27. Estado/HEAD/CI finales se verifican en ese PR; no fusionar automáticamente.

## H/I/J — Git, bloqueos e integridad

PR funcional27,base mainc2a774f,fuentes ee2dee7/9bb59ef; commits preservados,
sin force push ni merge. Handoff y checks vigentes en el PR.
RESULT.BLOCKERS identifica causa,dependencia,evidencia,acción,owner y condición
de desbloqueo para cada impedimento, sin exigir nueva aprobación conceptual.

NO_NEW_TECHNICAL_DEBT: sin TODO,compatibilidad,shadow model o bypass nuevos.
NO_NEW_HARDCODES: no IDs/tenants/usuarios/contenidos normativos en código nuevo;
los fixtures son explícitos y sólo ejecutables en clústeres locales propios.
NO_UNAUTHORIZED_SCOPE: cambios limitados a persistencia/validación contractual
y fixture de prueba necesario para una regresión reproducible.
NO_UNAUTHORIZED_SCHEMA_CHANGES y NO_UNAUTHORIZED_RBAC_CHANGES: diffs vacíos
en database,modelos físicos,contratos ejecutables y catálogos/grants.
NO_FUNCTIONAL_REGRESSIONS: suites aplicables PASS; no se afirma E2E no ejecutado.
NO_VISUAL_CHANGES: cero diff en apps/frontend y docs/ui; PR26 intacto.
NO_PRODUCTION_CHANGES: no contacto de escritura o despliegue productivo.
Estas declaraciones se acotan al diff y evidencias de esta ejecución.


## Ejecución 1/3 — runtime funcional

RUNTIME_TECHNICAL_CLOSURE=BLOCKED. Rector v1.12 activo; fase sin cambios.
Referencia inicial 9c0edea; correcciones de runtime en
4eaf58906b1206be5f6a7e8ac7ff7e520fb4c5c7. Continúa PR27 abierto, sin merge/deploy;
main permanece c2a774f. PR26 permanece en 6f558f4, sin intervención visual.
No se ejecutan contenidos/operaciones de las etapas 2/3 ni STEP6A5/6A6.

### Inventario técnico verificable

Abreviaturas: I/P=implementado y probado en el alcance indicado;
P=parcial; BC=bloqueado por contrato. Ningún I/P implica operación oficial en QA.
Las rutas de código siguientes son relativas a apps/backend/src.

| Capacidad | Inicial → final | Contrato efectivo | Código / evidencia ejecutable | Brecha o límite |
| --- | --- | --- | --- | --- |
| Importación normativa | I/P → I/P interno | rector37/41/44, B01, modelo físico09 | regulatory/pipeline.ts, validator.ts; pipeline.test.ts y 10 PG | API pública y aprobación de fuente no se infieren del input interno |
| Persistencia importación | I/P → I/P | modelo09, contratos07/12 | regulatory/postgres-repository.ts; pipeline.postgres.test.ts | Manifiesto/checksum/actor, rollback, replay; no import QA |
| Fuente/edición | P → BC para cierre persistente | D03, rector41 | validator.ts; pruebas de fuente/procedencia/edición | Captura independiente de validaciones depende del binding de publicación |
| Paquete | P → BC para gate completo | D03, rector41 | coverage.ts, validator.ts; pipeline tests | Cobertura calculada no sustituye recibos de revisión/decisión |
| H04 | I/P KnowledgeSource → I/P corregido; BC RegulatorySource | H04_SOURCE_USAGE_RIGHTS_V1 | normative-library/rights.ts; 23 unitarias y casos PG de derechos | Microsegundos corregidos. Relación RegulatorySource/KnowledgeSource y alcance por audiencia no publicados |
| Estructuración | I/P → I/P tipado | modelo09, B01/B02 | pipeline/postgres; jerarquía, requisitos, controles, fechas, tres crosswalks | Fixtures no son estructuración auténtica de los seis marcos |
| Homologación | P → P/BC | D06, B07, modelo09 | validator/postgres; procedencia, tipo, destino, edición, no_match | Persistir una relación draft no la homologa. Captura de validación/aprobación aún BC |
| Matrices | I/P parcial → I/P parcial | D07/B08/B09 | normative-library/matrices.ts, matrix-source.ts; library.test.ts + SQL de RequirementControlMapping | Seis tipos tienen cobertura unitaria; no se acredita HTTP/PG completo de cada eje con datos poblados |
| B04 create | I/P servicio → I/P HTTP/PG | B04/B05/B06 y CONFIGURATION_APPROVAL_AND_CONCURRENCY.md | configuration/control-adjustment-service.ts; PG operacional | Identidades sintéticas firmadas locales, no PO/Mario |
| B04 review | I/P servicio → I/P HTTP/PG | mismo contrato | mismas pruebas; autor DENY, reviewer permitido, CAS y rechazo | Ejecución humana excluida |
| B04 decide | I/P servicio → I/P HTTP/PG | mismo contrato | mismas pruebas; audit/recibos/rollback/retry | Estado incompatible ahora 409; no confundir con actuación humana |
| Publicación HTTP | BC → BC, candidato formalizado | API03 regulatoryPackPublish, rector41/42, H04 | pipeline interno conserva guardas; HANDOFF candidato | No endpoint nuevo ni PASS por servicio. Faltan recibos/gates/autoridad global/binding CAS |
| Catálogo | I/P → I/P del mecanismo existente | rector42, comercial v1.9 | security/commercial-catalog-publication.ts; 3 PG | Fixtures no publican ofertas reales |
| Contratabilidad | P → P/BC global | rector41/42, comercial v1.9 | commercial-subscription.ts; cambio de plan y contratos sintéticos | No acredita publicación/H04 global; gate HTTP aún BC |
| Contratación | I/P → I/P alcance probado | API03, contratos07/12 | regulatory/pack-contract.ts; 6 PG HTTP + 25 cambio plan | Replay corregido conserva resultado/hash tras revocación; no contratación QA oficial |
| Entitlements | I/P → I/P alcance probado | rector42, pack access canónico | regulatory/pack-entitlement.ts; temporal PG, cambio plan y activate/revoke HTTP | Tres accesos QA no modificados; no nuevo grant |
| Ticket contractual | BC → BC, frontera decidida | QA_TICKET_COMMERCIAL_20261022, rector24/25/30/33 | PDFs existentes; propuesta HANDOFF | PO confirma emisión externa e incorporación posterior; relación/operación documental aún no publicadas |
| Auditoría | I/P parcial → I/P en comandos probados | contratos04/07/08/12 | AuditEvent/outbox/idempotency en suites PG | Ausencia de comando de ticket/publicación impide PASS global; no recibos humanos fabricados |

### Correcciones y trazabilidad

- H04 compara instantes UTC canónicos con seis decimales, sin autorizar antes del
  inicio por truncado a milisegundos; respeta fin exclusivo/revocación y DENY ante
  instantes inválidos. No cambia derechos, permisos ni evidencia jurídica.
- B04 rechaza estados incompatibles con 409 tras verificar actor/SoD; conserva
  política, registry, CAS, transacciones y auditoría originales.
- Activate/revoke guardan el resultado original en IdempotencyRecord.result_ref,
  verifican response_hash en replay y fallan 503 si falta/corrompe el resultado.
  No reconstruyen un éxito desde filas actuales. Un recibo histórico antiguo que
  sólo contenga pack:<id> requiere reconciliación; no se convierte automáticamente.
- Nuevas pruebas HTTP+PG verifican autenticación firmada sintética, permisos,
  aislamiento, ETag, rechazo, idempotencia, concurrencia, revocación y rollback
  con fallos reales de persistencia. B04 utiliza HTTP por socket localhost;
  contratación utiliza Fastify.inject con handlers y PostgreSQL reales.
- Los runners crean clústeres PG16 propios, bases nuevas por suite y verifican
  directorio/system_identifier. Aplican migraciones exactas sólo allí y detienen
  clústeres al salir, propagando fallos de cierre. La migración histórica de
  referencias se prueba en su predecesor real de 31 migraciones, separado del
  lector actual de 36. No se alteran migraciones históricas.
- Fixtures antiguos se ajustan a contratos efectivos: nuevas PlanVersion de prueba
  antes de publicación (no mutar las publicadas); error de scan verificado en el
  guard de aplicación vigente, conservando estado/versión; preparación de la
  publicación de referencias y del catálogo editorial draft preexistente local.
  No se relajan aserciones, se desactivan pruebas ni se publica contenido oficial.

Los 12 archivos del commit incluyen tres servicios/helpers de runtime, seis
archivos de pruebas y tres scripts de preparación/ejecución. git show --stat
4eaf589 reproduce el inventario exacto. Los cuatro archivos de este expediente
contienen las propuestas y recibos; custodia privada no se agrega a Git.

### Bloqueos y decisión competente

| ID | Causa / contrato | Acción y responsable | Condición de desbloqueo |
| --- | --- | --- | --- |
| RUNTIME-PUBLISH-BINDING | API03 exige GRC global/coaprobaciones; OpenAPI genérico; fila approved_by singular; H04 no enlaza RegulatorySource; rector42 cierra roles globales | PO autorizó formalizar para revisión. Architecture/Data Model/Security deben revisar la propuesta precisa en HANDOFF | Publicación formal de modelo de recibos/gates, vínculo fuente/derechos/audiencias, autoridad global/SoD, esquema/ETag/TX; luego implementación y HTTP+PG positivos/negativos |
| RUNTIME-TICKET-BINDING | Contrato QA_TICKET declara PDF externo y exige binding para persistencia/vinculación; propiedad documental tenant posterior al alta | PO decidió emisión externa + incorporación posterior. Architecture/Data Model/Backend/Security revisan relación y operación propuestas | Contrato documental y asociación tipada publicados con actor/permisos/CAS/retención/custodia/audit; luego implementación y prueba de incorporación/recuperación |

No falta una autorización humana operacional para probar B04 localmente. Las
licencias auténticas, contenido completo y actuaciones humanas pertenecen a
las ejecuciones 2/3 y no se usan como sustituto de estos dos bloqueos de runtime.
Las limitaciones de prueba globales se enumeran sin PASS en RESULT/VALIDATION.

### Declaración de integridad del diff

NEW_TECHNICAL_DEBT=0 introducida por el diff: sin TODO, tabla/flag/bypass temporal.
NEW_BUSINESS_HARDCODES=0: sin IDs/tenants/usuarios reales ni condiciones comerciales
fijas nuevas. Las constantes de puertos/fixtures son restricciones de seguridad
local de pruebas, no comportamiento de negocio. UNAUTHORIZED_SCOPE_CHANGES=0;
UNAUTHORIZED_SCHEMA_CHANGES=0; UNAUTHORIZED_RBAC_CHANGES=0; VISUAL_CHANGES=0;
PRODUCTION_CHANGES=0. Evidencia: diff limitado a backend/tests/scripts/expediente;
diff vacío en baseline/modelos/contratos/DB/frontend/UI. No se ejecuta despliegue,
QA DML ni migración externa. No se declara ausencia absoluta de regresiones:
las pruebas ejecutadas pasan y las omisiones se identifican individualmente.


## Cierre técnico local de ejecución 1/3 — transferencia 2026-10-23

`RECTOR_GATE=PASS` y `RUNTIME_TECHNICAL_CLOSURE=PASS` para la formalización e
implementación local autorizada. `INTEGRATED_RELEASE_GATE=PARTIAL`,
`MARKET_RELEASE_READY=BLOCKED`; no son gates operacionales nuevos. Fuente
`4ba0734f67619dbce3a9b67bf7a2d9c7e90337a1`; PR27 continúa abierto. Baseline activa
`TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16`.

Al comenzar existían importador/persistencia tipados, B04, H04 KnowledgeSource y
los mecanismos de catálogo/contratación/entitlements. Faltaban los bindings
efectivos de publicación/ticket, cobertura HTTP+PG de seis matrices y 106
regresiones. P1, P2, T1 y P1-TX recibieron aprobación expresa actual; sus
autorizaciones y cadenas de integridad están versionadas, sin atribuir firma
humana a los bytes derivados. H04 interno se formalizó por separado.

La única publicación canónica usa recibos inmutables source/edition/package,
coaprobaciones persistidas por los seis packs, IAM global explícito, SoD,
If-Match fuerte y replay histórico. Publica también las referencias globales y
mappings propios revisados bajo P1-TX; conserva los publicados y no publica
controles tenant ni crosswalks. Auditoría/outbox/claim son atómicos. Derechos
exactos se bloquean durante su comprobación para serializar revocaciones. Se
retiró el publisher alternativo que confiaba en etiquetas de entrada.

El ticket sigue emitido externamente por Gerencia. Incorporación/versionado de
PDF propio scan-PASS, lectura privada por custodio y asociación opcional
Subscription→DocumentVersion del mismo tenant usan custodia/retención/RBAC
existentes. Platform recibe sólo metadatos de la asociación, sin acceso al PDF.
La unicidad de DocumentVersion se corrige a su padre Document, según rector23/30.

La extensión física local está en DDL_SPEC.sql/modelo candidato:245tablas/
3652columnas, cero mismatches. Ledger por defecto36/244tablas y migraciones
históricas intactos. No está adoptada en QA. Las capas cambiadas son contrato
lógico/físico candidato, contratos ejecutables, backend y tooling; inventario
exacto en RESULT.SOURCE_CHANGE_INVENTORY y git show --stat del source commit.
Frontend/visual, baseline inmutable, infraestructura y deployment no cambiaron.

Pruebas nuevas de esta cuenta:1083unitarias,289PostgreSQL y18browser PASS. Las
289 omisiones del runner unitario se ejecutaron aparte; ninguna queda pendiente.
Seis matrices pobladas y seis combinaciones de coaprobación fueron verificadas
por HTTP autenticado/PG. Browser usa fixtures explícitos y no acredita E2E QA
real ni revisión humana. Detalles, comandos, inventario individual y SHA256 de
recibos en VALIDATION/RESULT. Sin conflictos rectores locales ni nueva decisión
PO pendiente para este cierre.

No se inició ejecución2/3 ni STEP6A5/6A6. QA no fue contactado en esta cuenta;
los datos/imágenes anteriores de este expediente son históricos. Contenido real,
adopción QA, publicación/contratación humanas y aceptación UI siguen fuera del
mandato y no reciben PASS. No hubo merge, despliegue o migración externa.
