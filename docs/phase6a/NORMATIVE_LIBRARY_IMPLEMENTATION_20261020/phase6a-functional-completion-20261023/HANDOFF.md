# Continuidad funcional — 2026-10-23

Baselinev1.12;POST_STEP6A4_PRE_STEP6A5. STEP6A5/6A6NO_AUTORIZADOS.
Base mainc2a774f;PR25integrado. Rama funcional
feat/phase6a-functional-completion-20261023. No modificarPR26/ui-premium-review.
No merge ni deploy automático. Producción excluida.

Código ee2dee72f7683c5ea3c8b86bc9936687a41514d6 completa persistencia canónica
del sexto código y de correspondencias, temporalidad por disposición, controles
versionados, lock/replay y binding de publicación al import exacto.
9bb59eff2bc27283fc950db1de26d981096115ef corrige sólo un fixture UUID aleatorio.
No cambios DB/migraciones/APIpública/permisos/frontend/visual/infra.

Procedimiento reproducible: pnpm install;pnpm typecheck;pnpm build;pnpm test;
bash scripts/regulatory/run-pipeline-postgres-tests.sh y procedimiento oficial
scripts/normative-library/run-operational-postgres-tests.sh. PG16 local; revisar
puertos libres55559/55549, sin usar QA como entorno de pruebas sintéticas.
1078unitPASS/237skips;60PGPASS;schema0mismatches;secrets0;governancePASS.
VER VALIDATION para alcances y fallos corregidos. No repetir la aceptación visual.

QA revalidado tras conectar VPN: mismas imágenes saludables de f060cb1;36migraciones
exactas;cinco packs draft,cero publicados/cero contratos oficiales,tres accesosQA.
Dos propuestas B04 siguen draft y no hay review/decide; operación humana exacta
preparada en VALIDATION. No operar como Mario ni renovar fechas por SQL.
333relaciones y6cabeceras matriciales inspeccionadas; no equivale a homologación.

Bloqueos precisos en RESULT:
- fuentes ISO auténticas/derechos y revisión completa;
- payloads/cotejo/homologación verdaderos, incluida Ley21663;
- frontera HTTP de publicación: esquema/CAS/recibos aún genéricos;
- ticket: binding de persistencia/emisión no publicado;
- circuito humanoB04 y posterior operación contractual real;
- autorización operacional de merge/deploy/import concreto.
No crear endpoints,roles,tablas,flags de licencia ni aprobaciones para eludirlos.
El alcance conceptual aprobado D01–D09 no se reabre.

Custodia: .release-custody/phase6a-functional-completion-20261023/
contiene queriesREADONLY,resultados,logs,recibos y hashes. No publicar credenciales.
Los cuatro archivos de este expediente son la entrega consolidada. RESULT separa
decisión/contrato/código/prueba/despliegue/operación/audit/gate.
RECTOR_GATE=BLOCKED sólo para cierre integral; slice implementadoPASS_LOCAL.

PR funcional: https://github.com/Tecdex-SpA/tcdx-grc/pull/27. Estado/HEAD/CI finales se verifican en ese PR; no fusionar automáticamente.

## Ejecución 1/3 — decisiones indispensables para los bindings

Mandato: PHASE6A_RUNTIME_FUNCTIONAL_CLOSURE. Estas propuestas no son decisiones
rectoras nuevas ni contratos efectivos; no autorizan DDL, grants o endpoints.
Se continúa el PR27 abierto desde 9c0edea, sin intervención del PR26, merge,
despliegue, contenido auténtico ni actuaciones humanas.

### Ticket: persistencia e instante de emisión no definidos

Evidencia: `docs/executable-contracts/amendments/QA_TICKET_COMMERCIAL_20261022/CONTRACT.md`
define expresamente PDF externo, Gerencia emisora, Operaciones ejecutora y exige
binding publicado antes de vinculación electrónica/persistencia. Los DTO vigentes
son cerrados. Document/DocumentVersion/FileObject son tenant-owned; el ticket de
alta precede al tenant. No hay entidad ni operación ejecutable de emisión que
resuelva ese orden. Tenant, Subscription y activaciones no equivalen al ticket.

Propuesta mínima para decisión del PO: conservar la emisión gerencial externa y
formalizar un binding de incorporación del documento ya emitido a Document y
DocumentVersion del tenant una vez creado. Exigir emisor real, identificador
externo, versión de plantilla, hash del PDF y custodia privada existente; enlazar
el registro a tenant/Subscription/activaciones mediante relaciones canónicas
expresamente publicadas en el binding. Recuperación y verificación por los
contratos documentales existentes; auditoría e idempotencia canónicas. La
incorporación posterior no se denominaría emisión realizada por el software.

Decisión indispensable: confirmar esa frontera externa + incorporación posterior,
o exigir emisión electrónica anterior al tenant. La segunda opción requiere una
enmienda arquitectónica explícita de propiedad/persistencia y autorización
física; este mandato no permite inventarla. Antes de implementar cualquiera,
deben publicarse campos, relaciones, actor/permiso, comando, evento, CAS y
semántica de replay exactos por el procedimiento rector.

Descartados: tenant ficticio, bucket global usando FileObject tenant-owned,
auditoría/JSON como solicitud primaria, nuevos campos en DTO cerrados, nuevo motor
de tickets y tabla improvisada. El PDF vacío sigue siendo sólo plantilla.

### Publicación: aprobación conceptual sin binding completo de recibos

Evidencia: rector41§6 y matriz API03 `regulatoryPackPublish` exigen GRC Manager y
coaprobaciones reales por pack, `Reason+ETag`, cobertura y licencia. OpenAPI02
remite a DomainCommandRequest genérico. RegulatoryPackVersion no tiene row_version;
CoverageManifest tiene un único approved_by, no una población de coaprobaciones.
Los roles/actor efectivos deben resolverse en plataforma; un GRC Manager tenant
no adquiere autoridad global. H04 aporta derechos exactos de KnowledgeSource,
no una equivalencia automática con RegulatorySource ni un grant de publicación.

Propuesta mínima para decisión y posterior formalización: conservar la única
ruta aprobada y body cerrado `{reason}`, derivar ETag fuerte de la versión más
manifiestos de importación/cobertura y referencias inmutables de revisión/derechos;
consumir únicamente recibos persistidos de actores autenticados vinculados al
hash/edición exactos. Publicación transaccional bajo lock del pack con segunda
validación de derechos/roles, CAS, audit/outbox e idempotencia canónicos.
El PO debe designar el registro canónico autorizado para esas coaprobaciones y
su captura; si no existe, autorizar su formalización por la jerarquía de modelos,
incluida la relación RegulatorySource–KnowledgeSource y alcance global de actores.
No basta aprobar una fórmula ETag para resolver esas autoridades.

Descartados: approvals/booleans confiados desde el body, reutilizar la revisión B04
de un override para aprobar un pack, dar publicación a Platform Admin por analogía,
inventar grants globales, usar approved_by como varias aprobaciones o exponer
directamente el pipeline interno sin verificar sus hechos.

### Respuesta del PO y candidato para revisión — ejecución 1/3

El PO confirmó en esta sesión: **«Emisión externa; formalizar incorporación
posterior»** y **«Autorizar formalización para revisión»** de publicación.
Esto cierra la frontera del ticket y autoriza esta propuesta; no publica sus
contratos, migraciones o grants. No se atribuye aprobación de esos bytes al PO.

| Elemento | Candidato revisable | Autoridad/impacto que debe publicarse antes de código |
| --- | --- | --- |
| Ticket/documento | Gerencia emite fuera de GRC. Tras crear el tenant, el custodio autorizado incorpora PDF real a Document/DocumentVersion y FileObject del mismo tenant, por custodia privada, hash, scan PASS y retención aplicable. `document_code` conserva identificador externo; versión/contenido son inmutables. El emisor externo consta en el documento, separado del actor que lo incorpora. | Rector24/25/30/33; concretar operaciones documentales de creación/versionado, actualmente sin binding de emisión de ticket. No afirmar que el upload crea aprobación gerencial. |
| Ticket/contratación | Asociación tipada y opcional `tenant_creation_ticket_document_version_id` en Subscription, FK compuesta mismo tenant a DocumentVersion; nuevas contrataciones asistidas usarían esa referencia obligatoria por policy del binding, sin reescribir historia ni accesos provisionales. Operaciones vincula sólo después de verificar documento emitido; activaciones se recuperan desde la Subscription existente. | Candidato de relación lógica/física, NO campo vigente ni DDL autorizado. Requiere decisión Data Model y contrato HTTP cerrado de vinculación con If-Match de Subscription.row_version, idempotencia y audit de la asociación; no modificar silenciosamente subscriptionCreate/change-plan. |
| Ticket/recuperación | Lectura documental autorizada devuelve la versión exacta; comprobar hash contra FileObject/PDF. Resultado de incorporación devuelve DocumentVersion, Subscription, hash y referencia AuditEvent. La emisión gerencial externa sigue siendo una dependencia operacional explícita. | Definir acceso del custodio documental tenant frente al operador Platform Admin sin heredar permisos documentales por ser staff. No crear rol o bypass. Queda pendiente esa frontera de permisos. |
| Publicación HTTP | Mantener POST `/platform/regulatory-pack-versions/{id}:publish`. Body candidato cerrado `{reason:string}` (no booleanos de derechos, actores o approvals); bearer humano, sin tenant header, Idempotency-Key e If-Match fuerte. | Refinamiento de OpenAPI02/API03 y perfil exacto de respuesta/ETag, pendiente publicación formal. |
| Recibos independientes | Proponer una relación canónica append-only de validación de RegulatoryPackVersion, con PK UUIDv7, FKs pack-version/import-manifest/source/actor, scope source/edition/package, edición, checksum de importación, hash de contenido, decisión, rol canónico efectivo, motivo y AuditEvent. Las tres poblaciones de validación se comprueban separadamente. No usar el approved_by singular como varios recibos. | Requiere extender modelo lógico/físico congelado y contrato de captura. Estos campos son propuesta, no tabla creada ni nueva autoridad activa. La captura no puede reutilizar un permiso de KnowledgeItem para un RegulatoryPack. |
| Actores globales | Aplicar los roles de rector41 por pack. Proponer asignación global explícita, temporal y por operación de esos roles canónicos mediante la estructura IAM existente, sin nuevos roles ni asignar nada en QA. El autor/importador no es único aprobador. | Resolver contradicción entre publisher GRC global (API03/41) y catálogo de roles de plataforma cerrado a Admin/Support (rector42). Requiere enmienda rectora/IAM, no sólo ampliar resolvePlatformActor. Captura/revisión necesita permiso específico publicado; no se crea ahora. La matriz especializada de Ley21663 requiere decisión explícita. |
| RegulatorySource/H04 | Proponer FK explícita desde RegulatorySource a KnowledgeSource global correspondiente. Al publicar, cada fuente requiere rights tuple exacta por hash/edición/pack/acto publication/ambiente/audiencia, evidencia inmutable vigente y verificada, más los usos adicionales que el binding autorice expresamente. Ausencia/ambigüedad DENY. | La relación no existe hoy. Data Model debe aprobarla; H04 no concede automáticamente derechos para toda audiencia tenant por permitir al staff. Resolver alcance contractual sin inventar grants de distribución. |
| ETag/CAS | SHA256 de JSON canónico: fila PackVersion, IDs/checksums de manifests de importación/cobertura, recibos inmutables vinculados a la versión y referencias/hash de derechos. Ordenar poblaciones por ID; excluir intentos/lecturas. Verificar nuevamente bajo lock de pack antes de transición. | Contrato de concurrencia específico pendiente; no usar xmin, timestamp o business version como CAS. El perfil debe congelarse con sus vectores de prueba. |
| TX/recibo/replay | Resolver actor actual → claim → locks ordenados → validar versión/estado y tres gates + roles/SoD/derechos → CAS → transición PackVersion y estados relacionados expresamente contratados → AuditEvent/outbox/result idempotente → COMMIT. Replay verifica hash y autoridad actual, devuelve respuesta histórica sin nuevo evento; obtener ETag actual por lectura. | Publicar conjunto exacto de filas afectadas y proyección del recibo. No inferir que publicar sólo PackVersion hace elegible una cabecera/framework todavía draft. |

Alternativa descartada: ejecutar como Platform Admin en nombre del GRC Manager;
no satisface rector41 y cambiaría SoD. Tampoco se añade un motor de aprobación
genérico, un contrato comercial paralelo ni una ruta de publicación alternativa.

Condición de desbloqueo: revisión competente y publicación trazable de los
contratos/modelos/alcances IAM anteriores mediante los gates existentes. La
elección comercial del ticket y el alcance funcional ya están aprobados; no se
solicitan de nuevo. Estas decisiones de arquitectura pendientes impiden declarar
TENANT_TICKET_RUNTIME o PUBLISHING_HTTP_RUNTIME PASS. No son tareas de contenido
ni actuaciones humanas de las ejecuciones 2/3.


## PHASE6A_RUNTIME_HANDOFF_TO_NORMATIVE_LIBRARY

STATUS=NOT_READY. SOURCE_COMMIT=4eaf58906b1206be5f6a7e8ac7ff7e520fb4c5c7.
RUNTIME_TECHNICAL_CLOSURE=BLOCKED. Continuar PR27; no abrir entrega paralela.

Capacidades disponibles en fuente: importador tipado y transaccional; B04
create/get/update/review/decide/list con IAM real en adapters y pruebas locales
firmadas; H04 KnowledgeSource con evidencia exacta y microsegundos; catálogo,
contratación/entitlements existentes con replay íntegro. Interfaces y contratos
activos: matriz RELEASE y B01–B09/H04/API03 existentes. Los candidatos de esta
sección no son contratos activos ni permisos efectivos.

Validación reproducible: Node22.23.2/pnpm12.4.1; pnpm typecheck/build; unit1079;
PG142 mediante los cuatro runners de VALIDATION. Consultar RESULT para hashes,
106 omisiones individuales y alcance. Las omisiones no equivalen a PASS. No se
promovieron imágenes; QA conserva el source f060cb1 previamente inspeccionado,
no este commit. No volver a desplegar esas imágenes para atribuirles el código
nuevo. No ejecutar ahora contenido, publicación, contratación ni B04 humanos.

Condición de entrada a ejecución2: publicar los dos bindings de arquitectura
revisados, implementar y probar sus componentes en esta ejecución1, completar la
verificación integral (incluidos ejes matriciales/omisiones críticas aplicables)
y obtener RUNTIME_TECHNICAL_CLOSURE=PASS. No se trasladan esos pendientes técnicos
a ejecución2 como dependencias normales de contenido. Ejecuciones2/3 y
STEP6A5/6A6 no iniciadas. La ausencia de licencias/contenidos reales no impide
las pruebas sintéticas; no resuelve los contratos de runtime pendientes.
