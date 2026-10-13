# P-RBAC — propuesta de publicación y anexo de decisión CT-01/03/04

Fecha: 2026-10-08. `MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23`. `TASK_ID=STEP_6A3_P_RBAC_RECONCILIATION`. `CODEX_VARIATION_BUDGET=ZERO`. Estado documental: `READY_FOR_HUMAN_SIGNOFF`; contratos, rutas, permisos, grants y cláusulas nuevas: **PROPUESTO_NO_APROBADO / NOT_PUBLISHED**. Estado de las tres capacidades: `PARTIAL_BLOCKED`. Esta propuesta no se convierte en publicación por aprobar su dirección funcional.

La dirección CT-01/03/04 está aprobada por el PO. Este documento solicita exclusivamente revisión competente de contenido técnico concreto. No registra firmas de Architecture, Backend, Security, Domain, Data Model o QA. No usa el ZIP normativo reservado. No realiza DDL, migración, publicación de permisos, mutación QA, cambios IAM/infra, deploy o Git. Dominio público único `https://grc.tecdex.net/`; IAM `https://iam.grc.tecdex.net/`.

## 1. Fuentes y precedencia

Autoridad: rector 09 cadena separada Platform/Tenant; 22 §§1–3,9–12 Permission antes de endpoint y scopes no inferidos; 23 §§1,2,6,8 temporalidad/retención; 24 §§3–6 evidencia/archivo; 42 §§1,2.4,3–5 roles/capabilities/SoD; 45 §§2–6 propuesta autorizada, aprobación humana y publicación antes del código; 46 §§3,5–8. Se leyeron las fuentes locales activas y el enforcement. El ZIP rector original no es una dependencia cuando el baseline local activo íntegro está disponible; no se afirma haber leído un ZIP inexistente.

Diseño histórico: STEP_6A1/03 y matriz 02; STEP_6A2/04; STEP_6A3/02,05,06,11,15,16,19. El 11 es DRAFT y el 15 confirma dirección, no publicación. OpenAPI/03/05/09 y publicaciones SQL son evidencia de contratos y materialización; el código explica consumidores, sin sustituir autoridad rectora. Los hallazgos físicos son del checkout, no lectura actual de QA.

Referencias abreviadas de este documento: `OpenAPI`= `docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml`; `matriz03`= `docs/executable-contracts/03_API_RESOURCE_OPERATION_MATRIX.md`; `Permission05`= `docs/executable-contracts/05_PERMISSION_CATALOG.md`; `executable01`= `docs/executable-contracts/01_IMPLEMENTATION_DECISION_MANIFEST.md`; `executable08/09`= `docs/executable-contracts/08_AUDIT_EVENT_CATALOG.md` / `docs/executable-contracts/09_SEED_MANIFESTS.md`; `model01`= `docs/physical-data-model/01_PHYSICAL_DATA_MODEL.md`. `repository.ts`, `model.ts`, `service.ts`, `security.ts` corresponden a `apps/backend/src/core-grc/`; `administrative-read.ts` a `apps/backend/src/security/`; `pack-entitlement.ts` a `apps/backend/src/regulatory/`; `reference-read.ts` a `apps/frontend/src/`. Todos los anclajes son del checkout actual.

## 2. Alternativas publicadas investigadas

| CT | Capacidad publicada cercana / evidencia exacta | Equivalencia y consecuencia |
|---|---|---|
| CT-01 | `controlList` OpenAPI `02_OPENAPI_BASE_CONTRACT.yaml:3946`; matriz03:83; repository.ts:286–293; frontend reference-read.ts:137–147 | `framework_filters` ya es independiente del tamaño de página de Controls, pero exige `controls.control.read` y `CONTROLS_ASSURANCE` (model.ts:65). No equivale a descubrimiento Compliance sin Controls. Reutilización válida sólo para lector Controls ya autorizado; no desbloquea CT-01. |
| CT-01 | `normativeUnitList`/`requirementList`, matriz03:65–66 | El FrameworkVersion ID es prerrequisito de path; no descubre el padre. Listar requisitos no sustituye resolver ese ID. |
| CT-01 | `subscriptionRegulatoryPackList`, Permission05:41; fuente pack-entitlement.ts:20–46,107–113 | Lectura administrativa de asignaciones de Pack, con Permission diferente, no FrameworkVersion empresarial. El binding `subscription → subscription_regulatory_packs → pack_version → regulatory_pack_framework_versions → framework_version` sí es reutilizable como ObjectPolicy interno. |
| CT-03 | `membershipList`, `membershipGet`, `membershipRoleList`, matriz03:48–50; Permission05:52; gobernanza `PHASE_5_ADMINISTRATIVE_READ_AUTHORITY_DECISION.md` | Autoridad administrativa Platform Admin/Tenant Admin. `administrative-read.ts:45–67` exige Tenant Admin en modo tenant y cadena Platform separada. `membershipSpec`, líneas165–175, devuelve user_identity_id, email_normalized, last_authenticated_at y roles. No equivale a responsable empresarial. |
| CT-03 | `accessGet`, matriz03:37, security.ts:81–103 | Devuelve exclusivamente membresías propias del actor: no enumera candidatos del tenant. Proyectar sólo dos campos en reference-read.ts:75–81 minimiza UI, pero los atributos administrativos ya llegaron por red; no cierra minimización backend. |
| CT-03 | `userIdentityDiscovery` y `userIdentityTenantAccessList`, matriz03:21–22 y contrato25 | Superficie de incorporación/IAM, identidad global, permisos administrativos y finalidad diferente; no seleccionar UserIdentity en lugar de TenantMembership. |
| CT-04 | `retentionPolicyList/Get`, OpenAPI:3504/3551; matriz03:160–161; Permission05:231; core-grc/model.ts:104–107 | `PRIVACY` + `privacy.retention_policy.read`, sólo filas del tenant. No cubre lector Evidence, plan ISO sin Privacy autónomo, ni descubrimiento global aplicable. Reutilizarlo sólo para usuario Privacy ya autorizado y fila cubierta. |
| CT-04 | `evidenceCreate` y `uploadIntentCreate`, service.ts:357/497; `referenceExists`, service.ts:177–190 | Aceptar FK no concede lectura. Para RetentionPolicy, `globalAllowed=true` usa `tenant_id IS NULL OR tenant_id=actorTenant` sin binding de aplicabilidad ni estado/vigencia; la rama Pack sólo cubre requirements/framework_versions/control_versions. Es una brecha de validación, no prueba de visibilidad legal global. |

Resultado: `PUBLICADO_Y_EQUIVALENTE=0`; `REUSO_PARCIAL_DEMOSTRADO=3`. No se añade endpoint ni permiso efectivo. Mantener estas tres lecturas cercanas como dependencias obligatorias contradiría las direcciones humanas.

## 3. Discrepancias encontradas y tratamiento

**RBAC-D01 — actionCreate.** Permission05:86 y matriz03:125 especifican GRC Manager, Quality Manager, Compliance Manager, Risk Manager, Auditor Lead; seed `20260916000900_canonical_seeds.sql:202–208` agrega también AUDITOR. No se copia ese sexto grant al propósito de creación de acciones. Se propone DENY para AUDITOR en ese propósito; su lectura de Action sí permanece válida. No se revoca ni altera el grant preexistente. Architecture/Security/Remediation deben reconciliar por decisión exacta el contrato y la publicación antes del cierre RBAC global.

**RBAC-D02 — requirement.read.** Permission05:59–60 declara once lectores, pero el seed canónico publica `compliance.requirement.read` en línea112 sin ningún RolePermission que referencie su Permission ID. Búsqueda de ese código en todas las migraciones actuales encuentra solamente su definición, no distribución posterior. Se distingue plantilla declarada de grant físicamente materializado. No se afirma el estado de QA ni se fabrica un grant existente. La propuesta CT-01 toma la lista contractual explícita, no una consulta que devolvería cero grants y luego los inventaría.

**RBAC-D03 — RetentionPolicy nullable.** physical-data-model/01:178 conserva la notación `effective_from/to !`; la enmienda humana IDM-P05 en executable01:37 y migración `20260924000200:64–67` permiten NULL en draft, y líneas91–96 exigen effective_from al publicar. Esa enmienda física aprobada prevalece para nulabilidad; la propuesta no usa el texto anterior para falsear el schema vigente. No DDL nuevo.

**RBAC-D04 — firma y distribución.** executable09:19/174 conserva conteos históricos de 154 permisos. No es autorización genérica para nuevas publicaciones ni conteo del registro actual. El paquete futuro deberá comparar catálogo/migraciones/manifest vigente completo, sin alterar seed histórico ni declarar un total runtime nuevo aquí.

## 4. Contrato común propuesto C-01

Tres GET relativos a `/api/v1`; sólo `HUMAN_INTERACTIVE`, Bearer validado y `X-TCDX-Tenant-Id` autenticado contra Membership activa. Ningún modo Platform, `tenant_id` query, servicio principal, invitación o correo otorga acceso. Cada solicitud revalida identidad, Membership, Role/MembershipRole vigentes, Permission publicada, entitlement, scope y ObjectPolicy. Platform Admin sin autoridad tenant explícita recibe DENY. Tener una capability o rol no basta.

Envelope: `{items: [...], page: {has_more: boolean, next_cursor: string|null}}`. `additionalProperties=false` en request/proyección. `page[size]` entero1..100, default 25; `page[cursor]` opaco max 2048. Query no incluida expresamente es400. No totals de filas ocultas. Buscar `filter[query]`2..160 caracteres sobre columnas permitidas; normalizar sólo espacios de consulta, no nombres oficiales ni valores persistidos. Orden lexicográfico PostgreSQL contractual y desempate UUIDv7 interno; nunca ordenar una sola página como catálogo completo.

Cursor propuesto versión1: vincula operationId, actor membership, tenant, purpose, parent exacto, filtros normalizados, instante de consulta, orden y versión de política; tampering/contexto distinto produce400. No es prueba de autorización: SQL reaplica los predicados en cada página. El instante inicial es el transaction_timestamp() del GET y se conserva en cursor, para lectura operacional de elegibilidad; no se usa para evaluar metodología/configuración CT-02 ni sustituye effective_from de datos. No persistir snapshot por GET. Si cambia Permission, Membership o entitlement, nueva página403; si cambia parent inaccesible,404. Cambios concurrentes invalidan selección y el command revalida.

Aplicar tenant, visibilidad, ObjectPolicy, vigencia y propósito **antes** de DISTINCT, orden, LIMIT y has_more. No recuperar100 filas y filtrar luego en backend/UI. No contar ni mostrar inaccesibles; ausencia válida200empty, denegación403, dependencia503. Todos los IDs se conservan como value interno; labels empresariales se producen con el mecanismo central contextual español. El servidor no traduce códigos físicos, nombres oficiales ni texto libre. No nuevas opciones de vocabulario runtime.

Errores del modelo06, sin nuevos códigos:400`TCDX.VALIDATION.FAILED`;401AUTHENTICATION;403`TCDX.AUTHORIZATION.DENIED` sólo para contexto conocido;404`TCDX.RESOURCE.NOT_FOUND` para parent/candidato ajeno u oculto;409`TCDX.CONFLICT.RESOURCE` para ambigüedad contractual visible;422`TCDX.INVARIANT.VIOLATION` para contexto autorizado semánticamente incompatible;503`TCDX.DEPENDENCY.UNAVAILABLE`. No SQL, stacks, secretos, email, UUID extranjero ni cantidad oculta en errors. `application/problem+json`, correlation_id y retryable conforme06. Traducción contextual central del mensaje en UI.

GET naturalmente idempotente, RO repeatable-read en el request, sin Idempotency-Key, escritura de dominio ni outbox. Auditoría vigente executable08:9,65: GET mínimo no crea AuditEvent material por defecto; denegaciones conocidas se registran por política existente, foreign targets en telemetría segura. Logs sólo actor/tenant autorizado, operationId/purpose, outcome, correlation y versión de contrato/política; sin términos de búsqueda, listas de personas ni contenido protegido. Publicación/grants sí requieren audit reforzado existente y aprobación Security. Activar audit material de estas lecturas exigiría cláusula y código de evento aprobados, no se inventa aquí.

## 5. CT-01 — C-02 FrameworkVersion

Propuesta `frameworkVersionReferenceList`: `GET /framework-version-references`. Permission `compliance.framework.read`; capability `ISO_COMPLIANCE`; scope permitido `tenant`. Recurso framework ya figura en rector 22§10 como potencial; Permission aún no publicada. El actor debe tener MembershipRole con scope tenant para ese permiso; un grant process/assigned/owned no se amplía a tenant.

Allowlist: `page[size]`, `page[cursor]`, `filter[query]`, `filter[framework_id]`, `filter[framework_version_id]`, `purpose`, `statement_of_applicability_id`. IDs UUIDv7. `purpose=select` por defecto para descubrimiento; `purpose=history` requiere ambos IDs parent y versión, y FK exacta `soa.framework_version_id=candidate` más `compliance.soa.read` + ISO_COMPLIANCE + policy del SoA parent. Los IDs parent/versión son resueltos por navegación autorizada, no formularios técnicos.

Proyección cerrada: `framework_version_id:UuidV7`, `framework_id:UuidV7`, `framework_code:string<=128`, `framework_name:string` alias explícito `frameworks.name`, `edition:string<=128`, `version_number:int64 >= 1`, `ownership_class:enum canónico`, `lifecycle_state:string<=32`, `effective_from:UTC|null`, `effective_to:UTC|null`, `published_at:UTC|null`, `access_mode:official|non_authoritative_validation`, `selectable:boolean`. Orden `framework_code ASC, version_number DESC, framework_version_id ASC`. No texto normativo, source URLs protegidas ni control IDs. Label nombre oficial+edición+versión/código y acceso, desde traducción central contextual.

Predicate SELECT propuesto: root/version ownership coherente y (a) tenant_id=actorTenant para ambas filas, lifecycle published, effective_from NULL o <=queryInstant y effective_to NULL o >queryInstant; o (b) global framework_version vinculada por `regulatory_pack_framework_versions` a **effectivePacks** oficial del actor, con root/version published y vigencia compatible; o (c) acceso de validación no autoritativo demostrado por `nonAuthoritativeValidationPacks` existente, sólo desarrollo/test/QA con tenant demo/test, procedencia exacta y draft coherente, siempre `access_mode=non_authoritative_validation`. En producción (c) DENY. Se propone reutilizar literalmente la autoridad Pack demostrada, sin inferir licencia de ownership global y sin importar nuevo pack. La elegibilidad published/vigencia del FrameworkVersion es propuesta adicional: el motor Pack actual no la verifica en el join de framework IDs (`pack-entitlement.ts:107–113`); Domain debe aprobarla, no se afirma existente.

History muestra sólo la versión referenciada por SoA autorizado, tenant-compatible y con autoridad de contenido global conservada; `selectable=false` si retired/expired/superseded. El contexto histórico no reabre Pack expirado ni permite enumeración. Si acceso Pack ya no permite revelar metadata,404 genérico; conservar ID interno en objeto y UX“Referencia con acceso restringido”. No latest ni autoelección de una versión. Seleccionar marco no exige Controls; comandos SoA que incluyen controls conservan sus permisos propios.

Consumidores: F-0047/F-0054 SoA; selección auxiliar FrameworkVersion de Requirement para FORM-01/08; F-0118Controls sigue con su capacidad publicada. No se obliga a cambiar Controls ni se inicia adopción6A.4. El set propuesto de 13 lectores reúne once lectores contractuales Requirement + AUDITOR_LEAD/AUDITOR para SoA histórico; esta ampliación respecto de 11 se firma expresamente en C-06.

## 6. CT-03 — C-03 responsables TenantMembership

Propuesta `membershipReferenceList`: `GET /membership-references`. Permission `platform.membership_reference.read` propuesta; extensión explícita del vocabulario inicial de recurso de rector 22, sin entidad/tabla nueva. Capabilities: `CORE_PLATFORM` **y** capability del propósito: `EVIDENCE_DOCUMENTS`, `ISSUES_ACTIONS` o `CONTROLS_ASSURANCE`. Scopes permitidos del permiso mínimo:tenant,assigned_object,owned_object,audit_engagement; cada uno se resuelve respecto del parent/target, jamás respecto del candidato arbitrario.

Allowlist: `page[size]`, `page[cursor]`, `filter[query]`, `filter[tenant_membership_id]`, `purpose`, `requirement_id`, `control_id`, `requirement_assessment_id`, `control_assessment_id`, `assurance_test_id`, `issue_id`, `evidence_request_id`, `action_id`. No query por role,email,identity,tenant,state ni modo administrativo. `purpose` obligatorio enum propuesto cerrado: `evidence-request-assignment`, `action-assignment`, `evidence-request-history`, `action-history`, `assurance-test-history`. La lista de propósito es API de proyección, no catálogo operativo persistido.

Assignment request: exactamente un target tipado de los cinco permitidos por rector 24; target existente/autorizado, permiso explícito `evidence.evidence_request.create` y scope exacto del command sobre target. Assignment action: issue_id obligatorio, issue autorizado, permiso `remediation.action.create` y scope sobre Issue. Roles propuestos por propósito: request GRC_MANAGER/COMPLIANCE_MANAGER/CONTROL_OWNER/AUDITOR_LEAD/AUDITOR; action GRC_MANAGER/QUALITY_MANAGER/COMPLIANCE_MANAGER/RISK_MANAGER/AUDITOR_LEAD. Role no sustituye Permission. Para grant assigned/owned/audit sin relación canónica verificable al target, DENY: no convertir creator en owner ni asumir que cualquier target del tenant está asignado.

History: parent exacto obligatorio, permiso read del recurso parent y su ObjectPolicy; `filter[tenant_membership_id]` obligatorio y debe corresponder a `requested_by_membership_id`/`assigned_membership_id` de EvidenceRequest, `assigned_membership_id` de Action, o `executor_membership_id`/`reviewer_membership_id` de AssuranceTest. Se devuelve como máximo esa referencia; no buscar nombres ni enumerar usuarios desde historia. Ausencia/no-match/foreign 404 equivalente. Esto cubre F-0172/F-0173/F-0198/F-0199/F-0330 y conserva las relaciones server-owned sin convertirlas en pickers.

Proyección cerrada propuesta: `{tenant_membership_id:UuidV7, display_name:string, joined_at:UTC, selectable:boolean}`. `display_name` conserva nombre real; `joined_at` es atributo ya físico propuesto para desambiguación empresarial y requiere firma Security/Domain. No user_identity_id,identity_key,email,username,provider,last_authenticated_at,membership_state,ended_at,roles/grants. Label central nombre + “Incorporación: fecha/hora” sólo cuando el nombre duplicado necesita desambiguación. Duplicación exacta de ambos atributos no se resuelve mostrando UUID ni eligiendo primero: query autorizada produce 409 RESOURCE de ambigüedad con guidance española; owner IAM debe corregir el display_name por operación canónica autorizada independiente. No nuevo alias personal ni número fabricado.

Eligibility SELECT propuesta: m.tenant_id=actorTenant; m.membership_state=active; joined_at<=queryInstant; ended_at NULL o >queryInstant; u.lifecycle_state=active; trim(display_name) no vacío. No requisito de rol asignado al candidato: selección no otorga Permission. Orden `display_name ASC, joined_at ASC, tenant_membership_id ASC`. Historia puede mostrar miembro ended/inactive ya relacionado si parent y nombre autorizados; `selectable=false`. No historia arbitraria global.

**Simetría pendiente concreta:** `assertTenantMembership`, service.ts:204–205, sólo comprueba existencia/tenant; creates service.ts:345–346/466–467 no aplican filtro activo. Esta propuesta requiere aprobación Domain de selector activo y del recheck equivalente al ejecutar command para evitar referencia obsoleta; no presenta el filtro como regla actual ni modifica writes aquí. C-03A autoriza la proyección; C-03B, separadamente, aprueba la enmienda de validación de asignación sin nuevos campos, manteniendo historial. Sin C-03B no puede declararse cierre funcional concurrente del selector.

## 7. CT-04 — C-04 RetentionPolicy

Propuesta `retentionPolicyReferenceList`: `GET /retention-policy-references`. Permission `privacy.retention_policy_reference.read` propuesta; capability de selección `EVIDENCE_DOCUMENTS`; no requiere Privacy autónomo. Recurso/proyección RetentionPolicy existente, sin tabla ni catálogo paralelo; extensión del recurso Permission debe aprobarse. Scopes:tenant,assigned_object,owned_object, bajo policy del objeto contextual; upload actual exige tenant para `evidence.document.create` (service.ts:499), no ensanchar a scope narrower sin contrato.

Allowlist: `page[size]`, `page[cursor]`, `filter[query]` exclusivamente policy_code, `filter[policy_kind]` enum publicado, `filter[version_number]`int64 >= 1, `filter[retention_policy_id]`, `purpose`, `evidence_id`, `file_object_id`, `file_upload_intent_id`. Propósito cerrado propuesto `upload`,`evidence`,`history`; sin tenant query, unrestricted regulatory source ni filtro client de estados para habilitar drafts.

Upload: requiere `evidence.document.create` y EVIDENCE_DOCUMENTS + scope tenant. Evidence: requiere `evidence.evidence.create` y EVIDENCE_DOCUMENTS; si file_object_id presente, objeto finalizado/scan passed/autorizado, retention policy compatible con su referencia exacta. Historia: exactamente un parent Evidence/FileObject/FileUploadIntent autorizado bajo su lectura existente; policy ID debe igualar su FK; devuelve sólo esa referencia, sin enumeración/búsqueda. Los lectores de RetentionPolicy administrativo conservan su superficie PRIVACY; no se concede create/update/review/approve/publish/archive.

Proyección cerrada: `retention_policy_id:UuidV7`, `policy_code:string<=128`, `version_number:int64 >= 1`, `policy_kind:legal_hold|mandatory_regulatory_policy|contractual_policy|tenant_policy|product_baseline`, `retention_seconds:int64>=0|null`, `trigger_event_code:expiry_or_closure`, `precedence_rank:500|400|300|200|100`, `is_mandatory:boolean`, `ownership_class:enum físico`, `lifecycle_state:draft|under_review|approved|published`, `effective_from:UTC|null`, `effective_to:UTC|null`, `selectable:boolean`. No regulatory_source_id/protected source body, author/legal reviewer IDs ni details de hold. Los kinds/precedencias/trigger provienen de OpenAPI:6429–6433 y migración20260924000200:72–96, no valores nuevos. Orden `policy_code ASC, version_number DESC, retention_policy_id ASC`. Label contextual español: código oficial+versión+tipo+duración/“Sin plazo finito” para null + disparador+obligatoriedad/vigencia. No convertir seconds a siete años fijos ni prometer mínimo legal universal.

Elegibilidad temporal SELECT propuesta: published, effective_from no NULL <=queryInstant, effective_to NULL o >queryInstant. El instante es operacional de elección, no arranque de retention clock: éste conserva `expiry_or_closure` y dato real del objeto. Historia permite versión referenciada no seleccionable y nulabilidad física; no latest ni selección default.

**Visibilidad global — C-04G cerrada para revisión, no deducida:** same-tenant published es visible bajo el permiso específico. Global `product_baseline` published se propone visible como baseline producto, sin afirmar jurisdicción. Global `mandatory_regulatory_policy` se propone visible **sólo para descubrimiento de candidato** si regulatory_source_id coincide con RegulatoryImportManifest de una versión Pack oficial efectiva del tenant por `effectivePacks`; el vínculo Source→ImportManifest→PackVersion ya físico (model01:77,178; FK migration20260916000700:179,677), pero que esto autorice descubrimiento RetentionPolicy es semántica nueva propuesta que Privacy/Legal y Architecture deben firmar. Nunca usa validationPack no licenciado para obligación legal. La fuente es procedencia, no demuestra automáticamente que la obligación sea aplicable al objeto. Global `contractual_policy` y `legal_hold` no se enumeran: no se demostró binding tenant/objeto/contrato/hold; null tenant o coincidir una fuente no lo crean. Una policy global ya referenciada puede mostrarse sólo bajo parent autorizado y misma referencia, como metadata histórica, sin proclamar nueva elegibilidad.

C-04G puede aprobarse/rechazarse por cada categoría. Aprobación permite sólo ese alcance preciso. Si Domain exige seleccionar global contractual/hold o evaluar aplicabilidad regulatoria específica del objeto, la capacidad completa sigue bloqueada hasta un binding canónico aprobado; no se oculta la limitación con empty list ni se fabrica relación. Alternativa C-04G-B: Architecture/DataModel/Legal proponen relación tipada de aplicabilidad policy_version→tenant/object/contract/validity, con fuente jurídica y audit; sería enmienda física futura fuera de esta ejecución, no “tabla auxiliar UI”. No se entrega DDL ni migración.

**Regla de selección propuesta explícita:** una política global regulatoria descubierta únicamente por procedencia Source→Pack lleva `selectable=false`. Esa procedencia no satisface aplicabilidad jurídica por objeto. Si el propósito exige una política seleccionable y sólo existen candidatos sin binding, el resultado es `TCDX.INVARIANT.VIOLATION`422 sanitizado con explicación central española, no una selección válida ni un catálogo vacío exitoso. El baseline producto tampoco exonera una obligación superior desconocida: el command falla cerrado si no puede determinar obligaciones aplicables. C-04G-2 firma exclusivamente discovery; la selección regulatoria/global contractual/hold requiere la fuente tipada adicional revisada en C-04G-3/C-04W. No se presenta el nombre «contract» como una entidad/FK actualmente publicada: su representación requiere inventario y decisión Architecture/Data Model/Legal, y no puede implementarse desde esta propuesta por inferencia.

Prioridad obligatoria rector 23: `legal_hold(500) > mandatory_regulatory_policy(400) > contractual_policy(300) > tenant_policy(200) > product_baseline(100)`. La lista informa precedence_rank/is_mandatory; elegir un ID no exonera obligaciones superiores. Duración mayor no sustituye prioridad jurídica; conflictos de obligación conservan restricción de borrado hasta resolución humana. Ningún GET fija retention_seconds o purge. Command debe revalidar la policy y la misma referencia upload→file→evidence; no reasignar metadata ni resolver conflicto eligiendo primera/última/mayor versión. Si políticas obligatorias aplicables no pueden determinarse, 503/422 según ausencia de dependencia/invariante, nunca un baseline ficticio.

**Simetría pendiente C-04W:** los writes actuales sólo comprueban existence/tenant-or-global. Deben aprobarse predicates de visibilidad/vigencia/conservación aplicable en command y coherencia con FileObject; hasta esa enmienda autorizada, una lista más estricta no asegura la selección concurrente ni el respeto de prioridades. No se modifica backend/write aquí. Retention effective/purge engine no se da por implementado por esta propuesta.

## 8. C-06 — matriz diferencial exacta por Role/template

Antes: **0** de las tres Permissions propuestas en catálogo ejecutable/migraciones; por tanto 0 RolePermission para ellas. Columnas “después” son propuesta, no grants actuales. Se grantan sólo templates canónicos baseline y sus instancias TENANT_OWNED equivalentes; ningún rol Platform, custom, ServicePrincipal o grant directo UserIdentity. `F`=CT01 framework.read; `M`=CT03 membership_reference.read; `R`=CT04 retention_policy_reference.read. `1` es sólo inclusión en RolePermission; las policies de propósito,capability y scope previas siguen necesarias.

| role_code canónico | Antes F/M/R | Después propuesto F/M/R | Propósitos de selección nuevos autorizables |
|---|---|---|---|
| PLATFORM_ADMIN | 0/0/0 | 0/0/0 | ninguno; Platform no es tenant |
| PLATFORM_SUPPORT | 0/0/0 | 0/0/0 | ninguno |
| TENANT_ADMIN | 0/0/0 | 0/0/0 | conserva lecturas administrativas; ningún permiso empresarial implícito |
| EXECUTIVE_BOARD_VIEWER | 0/0/0 | 1/1/1 | F read; M/R sólo history parent autorizado |
| GRC_MANAGER | 0/0/0 | 1/1/1 | F; M request/action; R sólo history salvo command grant independiente |
| QUALITY_MANAGER | 0/0/0 | 1/1/1 | F; M action; R history |
| COMPLIANCE_MANAGER | 0/0/0 | 1/1/1 | F; M request/action; R history |
| RISK_MANAGER | 0/0/0 | 0/1/0 | M action/history Action; no Risk runtime nuevo |
| CISO_SECURITY_MANAGER | 0/0/0 | 1/1/1 | F; M/R history |
| AI_GOVERNANCE_MANAGER | 0/0/0 | 1/1/1 | F; M/R history |
| PRIVACY_MANAGER | 0/0/0 | 1/1/1 | F; M/R history; retención admin conserva PRIVACY |
| LEGAL_REVIEWER | 0/0/0 | 1/1/1 | F; M/R history; ninguna aprobación automática |
| AUDITOR_LEAD | 0/0/0 | 1/1/1 | F; M request/action; R history |
| AUDITOR | 0/0/0 | 1/1/1 | F; M request; R upload por document.create; M action DENY por RBAC-D01 |
| PROCESS_OWNER | 0/0/0 | 0/1/0 | M sólo history de Action/Assurance autorizado |
| CONTROL_OWNER | 0/0/0 | 0/1/1 | M request; R upload; history sólo parent permitido |
| EVIDENCE_OWNER | 0/0/0 | 0/1/1 | M history; R upload/evidence; sin autoaprobar |
| ACTION_OWNER | 0/0/0 | 0/1/0 | M history Action; sin create/verificación implícita |
| SUPPLIER_MANAGER | 0/0/0 | 0/0/0 | ninguno |
| CONTINUITY_MANAGER | 0/0/0 | 0/0/0 | ninguno |
| REGULATORY_CONTENT_STEWARD | 0/0/0 | 1/0/0 | F read, sin publicación editorial |
| DATA_ADMIN | 0/0/0 | 0/0/0 | ninguno |
| REPORT_VIEWER | 0/0/0 | 1/1/1 | F read; M/R history |
| VIEWER | 0/0/0 | 1/1/1 | F read; M/R history |

Total: F 13 templates, M 17 templates, R 14 templates = **44 nuevos RolePermission por set de templates**. Cada tenant con 22 instancias baseline canónicas añade hasta 44 equivalentes; total propuesto `44 + Σ(44 por tenant completo elegible)`; no se conoce ni se inventa el número de tenants. Una instancia faltante/incoherente bloquea preflight de publicación, no se crea rol ad hoc ni grant custom. Todas las filas 0 permanecen 0. Grants de las permissions publicadas cercanas no cambian. No modificar MembershipRole del actor para que coincida con scope.

La distribución M 17/R 14 es mayor que el picker list mínimo M7/R3 por las references readonly históricas: M 17es union de lectores Evidence/Actions/Assurance, R 14lectores Evidence; list sólo recibe M7/R3 según command policies. Security puede rechazar las cláusulas history sin aprobar enumeración ampliada; consecuencia exacta: labels parent refs residuales no quedan cerrados. No esconder ese residual contando el picker como capability completa.

**Scopes físicos:** `iam.role_permissions` no posee scope_kind; scope proviene de MembershipRole (model01:48; security.ts:28–39,126–138). No se presenta 44 pares como 44 grants tenant/assigned independientes. F sólo valida MembershipRole tenant; M admite su allowed scope sobre parent verificado; R preserva scope command incluido upload tenant. Process/orgunit/service no mencionados se DENY. Approval debe mantener esta separación sin nueva estructura RBAC.

## 9. C-07 — estrategia de publicación propuesta, no ejecutada

1. Los owners firman cláusulas exactas, resuelven RBAC-D01/D02 y cierran el alcance global. Publicar Decision Record humano con identidad, rol, fecha, resultado por cláusula y evidencia.
2. Reconciliar una revisión v1 de OpenAPI02, matriz03, Permission05, manifest09/traceability18 y ObjectPolicy. Registrar las tres Permissions y tres operationIds/paths exactos. Cerrar selección, historia, validación de escritura y pruebas. No derivar permisos desde endpoints.
3. Aprobar por separado la publicación operacional del catálogo en `iam.permissions`/`iam.role_permissions`. El prompt actual prohíbe nuevas migraciones y QA: ese paso sigue `NOT_AUTHORIZED` aunque se firmen los contratos. La opción futura es publicación de datos forward-only revisada, sin modificar seeds históricos.
4. Preflight futuro: Permission codes ausentes o idénticos; dos roles Platform y 22 templates baseline únicos; ownership/tenant coherentes; snapshot de grants previos; delta exacto de44 por set; inventario real de instancias tenant. Resolver IDs desde códigos canónicos, sin UUID ni tenant hardcoded.
5. Transacción idempotente sobre Permission/RolePermission, claves únicas existentes, rollback ante incompatibilidad y AuditEvent reforzado aprobado. Reaplicar produce cero duplicados. No RoleAssignment, Membership ni custom role automático.
6. Verificar delta de44 templates y44 por tenant completo, sin otros grants; actualizar hashes/totales reales del seed manifest. SEED010 consume los templates publicados para futuros tenants. El endpoint se implementa después del contrato Permission aprobado y se activa sólo tras materialización legítima. Ausencia de grant siempre DENY.
7. Backend implementa proyección mínima y policy; frontend utiliza traducción central contextual e IDs internos. Adopción de forms6A.4 sigue `NOT_STARTED`. QA, runtime, deploy y revisión UI tienen gates independientes.

Reversión futura: revocación forward-only de los grants nuevos con auditoría, conservando permisos y referencias históricas. No reset, modificación de migraciones pasadas ni borrado de historia.

## 10. C-08 — pruebas exigibles por publicación

Estas pruebas son **NOT_RUN_PROPOSED_CAPABILITY**: no existe operación aprobada ni implementada. Los tests de capacidades vigentes no prueban estos contratos nuevos.

| Test ID | Caso / resultado esperado |
|---|---|
| RBAC-C01 | Actor Compliance con F, ISO_COMPLIANCE y scope tenant descubre marcos sin Controls; ausencia de Permission/capability produce403. |
| RBAC-C02 | Packs expirados/no asignados, frameworks globales inaccesibles y tenant ajeno excluidos antes de LIMIT/has_more. |
| RBAC-C03 | Los13 roles F autorizados; los otros11 DENY. MembershipRole con scope estrecho no confiere tenant. |
| RBAC-C04 | Validación no autoritativa sólo con procedencia exacta en nonproduction/demo-test; producción DENY y etiqueta contextual española. |
| RBAC-C05 | Creadores Evidence/Action sin Tenant Admin consultan M; ese grant no permite lecturas administrativas, identity discovery ni role assign. |
| RBAC-C06 | Los17 roles M sólo reciben historia con parent read y FK exacta; candidato ajeno/no relacionado produce404 indistinguible. |
| RBAC-C07 | Miembro activo, no terminado y nombre autorizado seleccionable; histórico inactivo sólo readonly; duplicados exactos409 sin UUID/PII visible. |
| RBAC-C08 | Auditor DENY para asignación de Action según RBAC-D01; asignación de EvidenceRequest permitida con grants explícitos. Selección no concede rol. |
| RBAC-C09 | Evidence Owner/Control Owner/Auditor seleccionan R para upload sin PRIVACY; los14 lectores sólo acceden a historia del parent exacto. |
| RBAC-C10 | Draft/futuro/expirado no seleccionable; published sin effective_from falla cerrado; duración NULL no se convierte en número ficticio. |
| RBAC-C11 | Global baseline/regulatory discovery sólo tras C-04G; fuente no vinculada, Pack no licenciado, otro tenant, global contractual/hold DENY. |
| RBAC-C12 | Selección no reduce obligación mandatory/hold; upload/file/evidence conservan policy; cambio concurrente exige revalidación del command. |
| RBAC-C13 | Cursor de otro actor/tenant/purpose/parent/filtro400; página0/101 o filtro desconocido400; revalidar autorización cada página. |
| RBAC-C14 | Platform Admin sin Membership, Membership suspendida, M2M o entitlement inactivo DENY; ningún custom role recibe distribución automática. |
| RBAC-C15 | JSON de red cumple allowlist, sin email/identity ID/roles/secretos/contenido normativo;403/503 no son listas vacías válidas. |
| RBAC-C16 | Regresión de lecturas administrativas/Privacy/Controls; SEED010 y tenants materializan delta44 exacto; reaplicación0 duplicados. |
| RBAC-C17 | Traducción central contextual100% española; nombres oficiales y texto libre originales; IDs internos; cancelar respuestas obsoletas al cambiar tenant. |
| RBAC-C18 | OpenAPI/contract verify, RBAC, PG aislado/tenant isolation, E2E local, typecheck, lint, secretos, dominios e integridad rectora; gates humanos no inferidos. |

Riesgos cubiertos: permiso administrativo compartido, ampliación de PRIVACY, lectura global sin binding, scopes ampliados desde rol, enumeración por historia, PII en red, prioridad jurídica inferida desde code y asignación automática de roles.

## 11. Anexo firmable — C-09

Cada owner aprueba o rechaza cláusulas individuales. Todas siguen `PENDING_COMPETENT_REVIEW`. El registro humano posterior debe contener aprobador real, rol ejercido, fecha, resultado y evidencia; no se atribuyen firmas técnicas al PO.

| Cláusula | Decisión concreta sometida a firma | Owners competentes | Acción habilitada / consecuencia del rechazo |
|---|---|---|---|
| C-01 | Aprobar request/envelope/cursor/contexto temporal/error/audit/default DENY de §4. | Architecture, Backend, Security | Publicar reglas comunes; rechazo bloquea las tres lecturas. |
| C-02 | Aprobar proyección, predicados, acceso oficial/validación e historia FrameworkVersion de §5 bajo compliance.framework.read. | Architecture, Backend, Security, Compliance | Publicación contractual CT-01; rechazo mantiene RR-G01. |
| C-03A | Aprobar display_name+joined_at, elegibilidad activa y propósitos ligados al parent de §6; recurso Permission membership_reference. | Architecture, Backend, Security, IAM, Evidence, Remediation | Publicación contractual CT-03; rechazo mantiene RR-G03. |
| C-03B | Aprobar revalidación de elegibilidad activa y pertenencia de asignado en comandos EvidenceRequest/Action, conservando IDs/campos e historia. | Architecture, Backend, Security, IAM, Evidence, Remediation | Enmienda de validación futura; sin ella no hay cierre de concurrencia del selector. |
| C-04 | Aprobar proyección, propósito, vigencia e historia de §7 bajo EVIDENCE_DOCUMENTS y permiso específico. | Architecture, Backend, Security, Evidence, Privacy/Legal | Publicación contractual acotada CT-04; rechazo mantiene RR-G04. |
| C-04G-1 | Aprobar visibilidad mínima global product_baseline published, sin afirmar cumplimiento jurídico. | Architecture, Security, Privacy/Legal | Descubrir baseline producto; rechazo mantiene global DENY. |
| C-04G-2 | Aprobar Source→ImportManifest→PackVersion oficial efectiva para descubrir candidato regulatorio; no concede aplicabilidad al objeto. | Architecture, Data Model, Backend, Security, Privacy/Legal | Reutilizar FK existente para lectura; rechazo mantiene global regulatory bloqueado. |
| C-04G-3 | Confirmar DENY de global contractual/hold sin binding; decidir si el requisito completo exige enmienda C-04G-B. | Architecture, Data Model, Privacy/Legal, Evidence | Fija alcance y residual; binding requerido impide declarar CT-04 PASS. |
| C-04W | Aprobar revalidación de publicación/vigencia/aplicabilidad/prioridad y coherencia upload→FileObject→Evidence en comandos futuros. | Architecture, Backend, Security, Privacy/Legal, Evidence | Enmienda contractual futura; sin firma sigue pendiente el cierre concurrente/jurídico. |
| C-06F | Aprobar13 templates F exactos, incluidos Auditor Lead/Auditor para historia SoA; los otros11 DENY. | Security, Architecture, Compliance | Matriz F explícita; no inventar grants Requirement materializados. |
| C-06M | Aprobar17 templates M; lista sólo para M7 con permiso de comando; historia sólo por parent exacto. | Security, Architecture, IAM, Evidence, Remediation, Controls | Matriz M explícita; rechazar historia conserva referencias readonly pendientes. |
| C-06R | Aprobar14 templates R; selección sólo R3 con permiso de comando; historia por parent exacto. | Security, Architecture, Privacy/Legal, Evidence | Matriz R explícita; sin ampliación de PRIVACY. |
| C-07 | Aprobar estrategia44 grants/template set y44 por tenant completo, SEED010, preflight, versionado/audit; ejecución operacional sigue NOT_AUTHORIZED. | Architecture, Backend, Security | Preparar publicación; no autoriza QA, migración ni deploy aquí. |
| C-08 | Aprobar18 pruebas negativas/regresión/gates de §10. | Architecture, Backend, Security, Domain, QA/Release | Congela aceptación futura; no autoaprueba gate humano. |
| RBAC-D01 | Resolver grant AUDITOR actionCreate materializado adicional: reconciliar con catálogo de cinco roles o emitir DR competente que apruebe su alcance exacto. | Security, Architecture, Remediation | Cierra discrepancia contractual/seed; sin SQL en este turno. |
| RBAC-D02 | Registrar once lectores contractuales Requirement y ausencia de RolePermission en migraciones; decidir publicación legítima futura independiente. | Security, Architecture, Compliance, Backend | Diferencia contrato/template/runtime explícita; sin grants ficticios. |

Casillas para adjuntar evidencia humana real:

- [ ] Architecture: resultado individual de cláusulas en Decision Record humano.
- [ ] Backend: schemas, claves, proyecciones, queries, errores, versiones y checks.
- [ ] Security: permisos,44 grants, scopes, privacy, SoD, distribución y discrepancias.
- [ ] Domain Compliance: C-02/C-06F y elegibilidad de versiones.
- [ ] Domain IAM/Evidence/Remediation/Controls: C-03A/B/C-06M y referencias históricas.
- [ ] Domain Privacy/Legal/Evidence: C-04/G/W/C-06R y límites de binding global.
- [ ] Data Model: FK existente C-04G-2 o enmienda formal C-04G-B, sin DDL autorizado.
- [ ] QA/Release: C-08; el gate runtime permanece pendiente hasta evidencia futura.

## 12. Resultado verificable de la entrega documental

`IMPLEMENTED_AUTHORIZED=DOCUMENTATION_ONLY`; `READY_FOR_HUMAN_SIGNOFF=CT01_CT03_CT04_CLAUSES`; `PROPOSED_NOT_PUBLISHED=3_PERMISSIONS_3_COLLECTION_OPERATIONS_44_TEMPLATE_GRANTS`. `BLOCKED_MISSING_CANONICAL_BINDING=CT04_GLOBAL_CONTRACTUAL_HOLD_AND_OBJECT_LEGAL_APPLICABILITY` cuando esos contextos sean requeridos. Las cláusulas delimitan qué residual continúa aun si se firma sólo la lectura acotada.

Checks de esta investigación: inspección local de autoridad/contratos/modelo/migraciones/consumidores; extracción mecánica de role_codes y RolePermission desde SQL; comparación de referencias y field IDs. No se ejecutan tests de endpoints ficticios. Los checks generales se consolidan en 24/25; los conteos 509/102/82/448/256 de 19 son históricos hasta su reejecución demostrada.

`RECTOR_GATE=BLOCKED` para implementación/publicación residual. La integridad baseline se registra en el reporte consolidado. `TASK_PACKET_STATUS=COMPLETE_FOR_PROPOSAL;BLOCKED_FOR_PUBLICATION`. Derivaciones mecánicas: existencia de fuentes, FK, role_codes, materialización SQL, diferenciales y tipos vigentes. Decisiones humanas citadas: dirección CT-01/03/04 y español empresarial; no firmas técnicas. `ASSUMPTIONS_INTRODUCED=NONE_IN_RUNTIME`; todas las opciones nuevas están marcadas propuestas. `FILES_OUTSIDE_SCOPE_MODIFIED=NONE`; añadido único 20; sin cambios por este archivo en BD/contratos ejecutables/backend/frontend/infra/deploy. `commits=0`; `QA_mutations=0`; `deploy=NO`; `STEP_6A4=NOT_STARTED`.
