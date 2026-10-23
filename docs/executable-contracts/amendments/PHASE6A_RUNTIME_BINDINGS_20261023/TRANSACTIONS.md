# Contratos ejecutables locales P1/P2/T1

OPENAPI.json es el schema cerrado de requests y responses. CONTRACT.json fija
roles, permissions y matriz por pack. No se modifican predecesores sellados.
Los paths usan /api/v1; Platform rechaza tenant-header. Tenant exige contexto
UUIDv7 y Membership efectiva. No se aceptan actores, permisos, lifecycle,
flags de derechos o hashes de validación aportados como autoridad por cliente.

## Captura y publicación normativa

GET publication sólo devuelve metadatos exactos/manifiestos/recibos, nunca texto
normativo o evidencia jurídica. El ETag fuerte incluye población actual, estados,
todos los recibos (también rechazados/sucedidos) y registros H04 relevantes.
Las poblaciones se ordenan por su PK; timestamps conservan precisión PostgreSQL.
population_hash excluye metadata de transición/recibos, conservando las relaciones
tipadas y los hashes de los contenidos. No depende de xmin o del último lector.

Captura: autenticar→resolver IAM actual→validar schema/key/If-Match→lock pack
canónico del importador→revalidar IAM a statement-time→claim→replay íntegro si
corresponde→CAS→derivar source/edition/hashes desde import+coverage/población→
validar rol exacto y su PlatformRoleAssignment→insert recibo→AuditEvent→COMMIT.
Fuente approved exige KnowledgeSource global explícita; otras capturas no aceptan
ese vínculo. La sucesión nombra el predecesor actual del mismo tipo/import/rol.
No se actualiza coverage.approved_by ni se publica un pack al crear un recibo.
Audit: audit.knowledge.regulatory_pack.validation.create.v1; no domain event.

Publicación: única operación regulatoryPackPublish ya canónica, body {reason}.
Mismos locks/claim/CAS y reautorización. Exige un import y coverage inequívocos por
fuente, source_edition exacta y outcome validated (jamás test), cobertura100% por
población y conteos físicos/integridad coherentes. Exige recibos source+edition
y los package/coapprovals de CONTRACT por cada import, para la población actual.
El conjunto de actores incluye alguien distinto de todos los importadores;
la función de una persona no se registra como dos personas independientes.

Por cada fuente el vínculo source receipt→KnowledgeSource permite evaluar H04
existente por hash/edición/pack/acto/entorno/audiencia exactos. Para la operación
global se verifican consultation y publication con audience=platform_staff
(audience_tenant_id=NULL), audit binding y evidencia inmutable por el adaptador
privado ya existente. La proyección HTTP sólo publica metadata; ese chequeo no
es autorización de distribución a tenants. La distribución/consulta de cuerpos
conserva su evaluación por audiencia y acto; no se inventa un wildcard tenant.
La policy DEV/QA interna no habilita regulatoryPackPublish oficial.

Sólo tras esos gates se actualizan los cuatro tipos de filas indicados en
CONTRACT; no se publican controles, mappings o resultados por analogía.
Una transacción confirma transición+audit.knowledge.regulatory_pack.publish.v1+
knowledge.regulatory_pack.published.v1+resultado idempotente. Fallo de cualquier
persistencia revierte todo. No hay ruta alternativa ni otro publisher público.

## Documento externo y vínculo

documentIncorporate crea Document y DocumentVersion1 para un PDF scan-PASS propio
ya promovido por el pipeline canónico. document_code es el identificador externo;
document_kind=contractual_ticket. Emisor, aprobación y versión de plantilla reales
constan en el documento externo, no son declaraciones del agente. DocumentVersion
nace draft sin afirmar aprobación interna o gerencial. Creación documental no
activa Subscription, permisos o un contrato. No se crea Evidence para simularlo.

documentVersionIncorporate exige If-Match de Document.row_version, mismo Document,
un FileObject nuevo autorizado y número anterior+1 bajo lock del Document. Nunca
modifica versiones anteriores. Ambos comandos revalidan tenant, creador/scope,
PDF/MIME/hash/scan/version privada y primaria de retención publicada vigente,
no el flujo draft de primera fuente. Una fuente contractual invocada mantiene
sus requisitos propios. El hash siempre procede de FileObject, no del request.

Eventos audit.evidence.document.incorporate.v1 y
audit.evidence.document_version.incorporate.v1; sin domain event. Documento y
versión comparten la misma transacción de audit/idempotencia. El GET documental
requiere evidence.document.read efectivo, EVIDENCE_DOCUMENTS y tenant/owned_object
según grant. PDF se recupera por el lector FileObject actual y sus permisos;
no se devuelve storage key, credential, URL permanente ni contenido al Platform.

subscriptionTicketLink verifica Platform Admin y permiso específico, If-Match de
Subscription.row_version, mismo tenant, DocumentVersion/FileObject exactos,
hash/scan/retención actuales. Primer vínculo o corrección a versión posterior del
mismo Document, conservando before/after; no unbind o cambio de ticket por body
libre. Cambios incompatibles409. Actor Platform verifica metadata mínima por esta
ObjectPolicy expresa; no hereda derecho de lectura documental o descarga.
Audit audit.platform.subscription.ticket.link.v1 y domain event
platform.subscription.ticket.linked.v1 atómicos con FK/row_version/idempotencia.
GET ticket devuelve sólo IDs/hash/row_version/último audit de la asociación.
Históricos sin vínculo conservan NULL. No se cambian DTOs de alta/cambio de plan.

## Replay, errores y publicación IAM

Los comandos reautorizan antes de replay; verifican response_hash del cuerpo
original persistido en IdempotencyRecord.result_ref. El replay devuelve resultado
histórico, no reconstrucción desde filas actuales; no aplica otra vez CAS ni
audita/emite de nuevo. Resultado ausente/corrupto503; intención distinta409.
Idempotency-Replayed=true sólo para ese caso. Comandos no devuelven un ETag
histórico como actual: obtener el GET fresco antes de otro command.

Publicación de Permissions/RolePermissions por el publisher IAM canónico existente
con principal efectivo, manifiesto exacto, locks, auditoría por fila y replay sin
duplicados; ningún startup INSERT/grant ni nueva identidad. Asignaciones globales
se administran mediante el servicio PlatformRoleAssignment existente, sólo para
la familia ampliada expresamente. Resolver filtra los permisos de roles globales
de contenido a los tres normativos publicados; el template tenant no se convierte
en privilegio Platform genérico. Admin/Support conservan su contrato.

Efectividad documental no acredita adopción física, pruebas, operación humana,
licencia real o despliegue. Todos siguen excluidos salvo pruebas locales con
datos y actores sintéticos explícitos.
