# Enmienda comercial consolidada — STEP_6A3

STATUS=DRAFT_NOT_APPROVED_NOT_ACTIVE
TASK_ID=COMMERCIAL-PACK-FAMILY-20261013
MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.8_2026-10-09
CODEX_VARIATION_BUDGET=ZERO
HUMAN_APPROVAL=PENDING_EXACT_ARTIFACT_REVIEW
PHYSICAL_MODEL_GATE=PENDING_REVIEW
EXECUTABLE_CONTRACT_GATE=PENDING_REVIEW
RECTOR_GATE=BLOCKED para activación y cierre comercial.

## 1. Autoridad y procedimiento

Contrato único candidato para revisión; reemplaza editorialmente el borrador de HEAD 23c7b50468213b8c0769ca2607349e04f4c32eae sin modificar el baseline, modelo congelado, OpenAPI, seeds ni migraciones. La versión anterior queda preservada por Git y su hash de entrada en la evidencia integral.

El mandato STEP_6A3 del 2026-10-13 autoriza preparar e implementar el mecanismo cuando los gates correspondientes lo permitan: relación PlanVersion–CommercialFamily, límites configurables, cambio independiente del alta, Platform Admin exclusivamente, sustitución inmediata active → ended, historia, auditoría y rollback completo. Conserva aprobación humana adicional cuando el rector la exige. Las decisiones recibidas anteriormente fijan traslado de packs vigentes compatibles, rechazo íntegro por incompatibilidad y código de nueva suscripción aportado por Platform Admin. Las especificaciones **candidatas** de las secciones 3–10 no se presentan como decisiones humanas ya aprobadas.

Fuentes vinculantes: rector 07/08/30/33 (autoridad nominal y ownership), 09/22/42 (Platform/Tenant, capacidades, permisos y planes), 21 §§15–16 (registry), 23/25/26/29/37/41 (tiempo, auditoría, seguridad, configuración y packs), 28 G3/G7/G8/G11/G14/G15, 43/45/46/49 (secuencia, congelamiento y aprobación exacta). Se reutilizan PHASE_5_SUBSCRIPTION_CREATE_DECISION y PHASE_5_SUBSCRIPTION_REGULATORY_PACK_v1.0. El presente cambio no sustituye la publicación de catálogo rector 33 ni la revisión del modelo físico.

Rector 45 §6: «los siguientes PASS requieren aprobación humana registrada: baseline rector, modelo físico, contratos ejecutables, seguridad/privacidad, gates runtime y release». Rector 49 §3: «Si sus hashes aún no fueron presentados y aprobados, la autorización funcional general no los publica». Revisión unipersonal por funciones acumuladas está permitida por 49; Codex no firma por el humano. Después de revisión exacta, registrar identidad, funciones, fecha, decisión, manifest SHA-256 y evidencia inmutable. Si se exige modificación del baseline, preparar una nueva versión y activación gobernadas; nunca editar v1.8 in situ.

## 2. Inventario y brecha comprobados

Evidencia nueva: evidence/integral-closure-20261013/qa-readonly.json, bajo el paquete CONSOLIDATED_APPROVAL_20261009. PostgreSQL 16 / 192.168.2.40 / tcdx-grc, TLSv1.3, transaction_read_only=on; 30 migraciones hasta 20261007000200; 172 permisos publicados; cero permisos platform.subscription.change_plan; cero UsageLimit; cinco raíces iniciales. No se ejecutó DDL/DML QA.

No existe CommercialFamily en el catálogo canónico 33, ni catálogo físico equivalente, ni relación PlanVersion–familia. El candidato anterior regulatory.pack_families no está materializado. Se propone **un único catálogo** para CommercialFamily; no coexistirán PackFamily y CommercialFamily como autoridades separadas.

Divergencia UL-01: diccionario físico 01 §2 prescribe UQ(plan_version_id, limit_code, effective_from) y limit_value >= 0. Migración 20260916000600, expected-schema.json y PostgreSQL real contienen UNIQUE(limit_code), sin CHECK de no negatividad. Impide repetir el mismo límite en distintas versiones y no protege el valor negativo. Reconciliar como delta explícito revisado; no cambiar migración aplicada ni ocultar la divergencia mediante códigos por plan o UUID.

subscriptionCreate ya verifica publicación/vigencia, serializa con lock del Tenant, persiste auditoría/outbox/idempotencia y rechaza segunda alta. Se preserva ese rechazo: no es change-plan. Subscription tiene starts_at, ends_at, cancelled_at, row_version y clave compuesta tenant/código. SubscriptionRegulatoryPack conserva tenant y versión exacta. No hay endpoint de historial comercial ni arista ejecutable Subscription active → ended.

## 3. Modelo canónico y físico candidato exacto

Único write owner del catálogo de elegibilidad y límites: Tenant & Commercial Entitlements, con Platform Authority. Regulatory & Compliance conserva RegulatoryPack y sus versiones. No añade tenant a referencias globales ni usa IAM como catálogo comercial.

| Objeto | Representación candidata | Claves y cardinalidad |
| --- | --- | --- |
| CommercialFamily | regulatory.pack_families | pack_family_id UUIDv7 PK; family_code varchar(96) NOT NULL UQ; name text NOT NULL; source_type varchar(32) NOT NULL; lifecycle_state varchar(32) NOT NULL; perfil M existente, sin tenant; UQ(pack_family_id,source_type) |
| Clasificación de raíz | regulatory.regulatory_pack_family_assignments | regulatory_pack_family_assignment_id UUIDv7 PK; regulatory_pack_id UUID NOT NULL UQ; pack_family_id UUID NOT NULL; source_type varchar(32) NOT NULL; perfil I; FK compuestas a raíz y familia con source_type; una raíz tiene una clasificación, una familia 0..N raíces |
| Elegibilidad por PlanVersion | platform.plan_version_pack_families | plan_version_pack_family_id UUIDv7 PK; plan_version_id UUID NOT NULL; pack_family_id UUID NOT NULL; perfil I; FKs RESTRICT; UQ(plan_version_id,pack_family_id); PlanVersion N:M CommercialFamily |
| UsageLimit, reutilizado | platform.usage_limits | conservar PK/plan_version_id/limit_code/limit_value/unit/effective_from/effective_to y actores; agregar pack_family_id UUID NULL FK a CommercialFamily; NULL identifica límite total, ID identifica límite de esa familia |

Los perfiles M/I aportan los timestamps/actores/checks definidos en modelo físico 01 §1.1; no se inventa segundo perfil. Agregar UQ(regulatory_pack_id,source_type) en raíz para FK compuesta. Catalogar nominalmente CommercialFamily y documentar ambas relaciones en 30/33 y trazabilidad antes de publicación. Columnas no se ocultan en JSONB.

Familias y clasificaciones publicadas son inmutables; la relación PlanVersion–familia queda congelada al publicar la versión del plan. Cambiar elegibilidad requiere nueva PlanVersion. Reclasificar raíz publicada requiere revisión material y nueva identidad gobernada, nunca UPDATE histórico. Publicación de familia candidata draft → published requiere registro de comando/permiso/audit exactos antes de habilitar administración runtime; esta enmienda no añade CRUD genérico.

Vocabulario inicial **propuesto para aprobación**, sin valores comerciales: ISO/source_type=standard y LEGAL/source_type=law. ISO_9001_2015, ISO_9001_2026, ISO_IEC_27001_2022 e ISO_IEC_42001_2023 se clasifican ISO; CL_LEY_21719 se clasifica LEGAL. Son mapeos de migración versionados por códigos canónicos rector 41 con IDs resueltos por FK, nunca reglas de elegibilidad por prefijo en backend. Todo pack futuro requiere clasificación explícita, incluso no estándar. Una raíz sin clasificación falla cerrada. Clasificar no publica contenido ni satisface licencia/cobertura/vigencia.

Propuesta inicial de relaciones: versiones iniciales ISO e ISO_RIESGO_OPERATIVO admiten ISO; GRC admite ISO y LEGAL. No incorpora automáticamente familias futuras. Los source_type adicionales de rector 37 necesitan datos de clasificación y publicación expresa, no heurística por plan_code.

## 4. Cantidad, vigencia y publicación

Código candidato único: regulatory_pack_count; unidad candidata pack; contar raíces distintas activas y efectivas, no número de versiones históricas. Cada PlanVersion publicable exige un límite total y un límite para cada familia admitida; entero >= 0, sin máximo arbitrario. Las cantidades concretas permanecen SIN_CONFIGURACION_COMERCIAL_APROBADA. No se siembran números de producto ni se interpreta ausencia como ilimitado. Fixture aislado puede asignar cantidades explícitas de prueba, sin promoción, para probar fronteras cero/uno/N y exceso.

Para límites de packs agregar CHECK de entero y unidad, FK de familia coherente con PlanVersion admitida; para límites generales, preservar tipo/unidad publicados. Reconciliar UL-01 mediante UQ NULLS NOT DISTINCT(plan_version_id,limit_code,pack_family_id,effective_from), CHECK(limit_value >= 0) y exclusión temporal para el mismo plan/código/familia. Rango [effective_from,effective_to), NULL superior abierto; reutilizar btree_gist ya disponible. Constraint debe normalizar NULL de familia de manera contractual o separar exclusiones total/familia con predicados. No sentinel comercial ni UUID de familia ficticia.

Un único registro debe resolver cada límite requerido al instante de evaluación. Ausencia, duplicación, solapamiento, unidad incorrecta o valor inválido bloquea publicación/contratación y activación de packs. Cambio de condiciones comerciales publicadas crea nueva PlanVersion; no reescribe UsageLimit histórico. Actualización de reloj entre preflight y commit se revalida dentro de la transacción.

Selección, alta, change-plan, activación y lectura efectiva deben usar el mismo predicado de elegibilidad: plan/versión publicada y vigente, familia publicada con relación explícita, límites íntegros y vigentes, versión exacta del pack, licencia, cobertura/gate normativo y las capacidades contratadas. RBAC y ObjectPolicy siguen siendo predicados independientes. Entitlement nunca surge desde familia o límite.

## 5. Comando change-plan candidato

Ruta decidida: POST /api/v1/platform/subscriptions/{id}:change-plan. operationId candidato subscriptionChangePlan. Permission decidido platform.subscription.change_plan; scope platform; único rol base PLATFORM_ADMIN. Backend resuelve PlatformRoleAssignment vigente, identidad humana activa, permiso publicado y rol. Tenant Admin, Platform Support, usuario comercial, usuario estándar, servicio y contexto tenant presentado como autoridad producen DENY. No modifica protocolo de autenticación, roles base ni proveedor IAM. Publicar este permiso, sólo su grant base y catálogo de eventos es un delta contractual explícito pendiente.

Request candidato cerrado: plan_version_id UUIDv7 y subscription_code string no vacío, máximo 96; no tenant_id, familias, límites, estado, actor ni timestamp caller-owned. Headers obligatorios Idempotency-Key y If-Match fuerte de row_version de la suscripción origen. Correlation-ID conserva contrato existente. El tenant se deriva exclusivamente de la suscripción identificada y se valida bajo lock. Motivo: propuesta de campo reason string 1..2000 para decisión auditable, sujeto a aceptación exacta antes de publicar.

Precondiciones y ejecución indivisibles:

1. Autenticar y autorizar; validar schema cerrado y headers.
2. Reclamar idempotencia Platform/actor/operación/key y fingerprint versión v1: origen, PlanVersion destino, código, reason e If-Match normalizado.
3. Lock Tenant y Subscription origen en orden canónico; lock de asignaciones involucradas. Revalidar identidad/autoridad, row_version y que origen sea la única suscripción vigente efectiva.
4. Validar destino publicado/vigente, configuración completa y capacidades/familias/límites. Lock SHARE de fuentes comerciales y packs evaluados.
5. Instante efectivo único t server-owned tomado **después** de adquirir locks; evaluar intervalos en t. t debe ser posterior al inicio de origen para respetar ends_at > starts_at.
6. Snapshot de packs activos efectivos en t; contar por raíz/familia. Cualquier incompatibilidad rechaza íntegramente.
7. Ejecutar arista registrada Subscription active → ended: ends_at=t, actor de actualización y CAS row_version+1; conservar starts_at, plan_version_id, ID, código y cancelled_at; jamás borrar ni sustituir historia.
8. Insertar nueva Subscription active del mismo tenant, destino y código único; starts_at=t; ends_at/cancelled_at NULL; actor canónico.
9. Cerrar intervalos de packs trasladados y crear asignaciones nuevas de las mismas versiones exactas en la nueva Subscription desde t; IDs distintos y vínculos old→new en auditoría. No migrar assessments/evidencias ni editar su linaje.
10. Persistir auditoría material, auditoría de uso privilegiado, outbox e idempotencia en la misma transacción. Revalidar que sólo exista una suscripción efectiva y que ninguna asignación trasladada exceda configuración. COMMIT único; cualquier excepción implica ROLLBACK total.

Propuestas explícitas que requieren aceptación humana, no supuestos: destino igual al PlanVersion origen = 409 sin mutación; packs activos programados futuros = 409 hasta decisión comercial expresa, sin cancelarlos; packs ya vencidos/revocados permanecen históricos sin traslado. Un corte igual/anterior a starts_at = 409 retryable, sin alterar fechas artificialmente. No trasladar períodos futuros por inferencia.

Replay exacto debe devolver el resultado seguro original con ambas asignaciones y mismo corte; después de una nueva operación nunca reconstruir respuesta desde estado actual de origen. Persistencia debe respetar el contrato existente de result_ref/response_hash o un delta de representación explícitamente aprobado. Key/payload distinto = 409 TCDX.CONFLICT.IDEMPOTENCY; CAS obsoleto o carrera = 409 TCDX.CONFLICT.RESOURCE; denied = 403; target inexistente/oculto = 404; plan/pack/límite inválido = 422 TCDX.INVARIANT.VIOLATION; dependencia indisponible = 503 TCDX.DEPENDENCY.UNAVAILABLE. Fallo de auditoría/outbox/completeIdempotency no produce éxito ni filas comerciales huérfanas.

## 6. Registry de transiciones y estados

Publicar antes de código la definición LifecycleTransitionDefinition Subscription active + subscription.change_plan → ended, permiso platform.subscription.change_plan, scope platform, preconditions arriba, política de actor Platform Admin, concurrencia CAS + tenant lock, idempotencia exacta y audit/outbox de §8. No permitir comando genérico update_status ni introducir otros estados de Subscription.

El traslado necesita cierre exacto de SubscriptionRegulatoryPack active → revoked mediante el comando registrado existente o un delta explícito de sus precondiciones y efectos que permita invocación interna bajo change-plan. effective_to=t; reason referencia a sustitución comercial; auditoría propia si se reutiliza revoke. Nuevas filas active conservan versión exacta y comienzan t. La elección de reutilizar la arista revoke con esos efectos es **propuesta pendiente**, no autorización de escribir directamente lifecycle_state. Si su policy no admite la autoridad del orquestador, publicar delta coherente antes de implementar.

La exclusión temporal existente es por Subscription/PackVersion. Agregar garantía candidata de no superponer versiones de la misma raíz en una suscripción exige FK tipada de RegulatoryPack raíz en asignación o constraint equivalente revisada; la representación exacta no está cerrada por el mandato. **DECISION_PENDING_ROOT_EXCLUSION**: propietario Modelo de Datos debe escoger FK redundante compuesta a versión/raíz con exclusión por raíz, o enforcement transaccional mediante locks y predicado sobre versiones, documentando garantías frente a DML directo. No inferir esta representación ni añadir una columna especulativa.

## 7. Contratos de lectura candidatos

Conservar TenantAdministrativeProjection vigente y su consumo UI. Proponer lectura administrativa segura propia GET /api/v1/platform/subscriptions/{id} y listado GET /api/v1/platform/subscriptions?tenant_id={id}; permiso candidato platform.subscription.read exclusivamente Platform Admin; scope platform. Requiere aprobación de operación/permiso; no se añade a OpenAPI activo en esta intervención.

Detail: subscription_id, tenant_id, subscription_code, plan_version_id, plan_id, plan_code/name/version_number, lifecycle_state, starts_at, ends_at, cancelled_at y row_version (representación decimal exacta si excede integer seguro); ETag fuerte correspondiente. Historial usa paginación canónica, filtro tenant obligatorio, orden estable starts_at/ID y cursor ligado al tenant/filtro; ninguna fila de otro tenant se mezcla. Predecesor/sucesor se reconstruye desde relación tipada aprobada o evento de auditoría exacto, no por coincidencia de timestamps. Esta propuesta usa el evento correlacionado de §8; si se exige FK persistente adicional necesita delta físico explícito.

Response candidata change-plan: envelope existente operation_id/status/correlation_id/resource_id/result; result incluye previous_subscription, current_subscription, effective_at y pack_transfers con assignment IDs antiguo/nuevo y pack-version exacta. HTTP 202 completed conserva convención publicada del alta; replay mantiene status y resultado original. Sin tokens, licencias/textos, grants o datos privados de terceros.

effectivePacks debe intersectar suscripción/intervalo, versión de pack y elegibilidad comercial completa. Administración distingue estado persistido de vigencia derivada; antigua asignación no aparece efectiva después de corte aunque permanezca accesible como historia. Falla técnica/configuración inconsistente se devuelve como error contractual, nunca colección vacía válida para ocultar fallo. UI consume lecturas aprobadas; formulario Cambiar plan es STEP_6A3 sólo tras publicación y contrato visual vigente, sin rediseño.

## 8. Auditoría y eventos candidatos

Código material propuesto audit.platform.subscription.change_plan.v1; evento propuesto platform.subscription.plan_changed.v1; command subscriptionChangePlan; entity Subscription origen; Platform ownership, tenant_id de envelope NULL, tenant real en payload seguro. Uso privilegiado conserva audit.iam.application_token.privileged_use.v1. No fabricar tenant técnico.

Before/after contienen IDs origen/destino, PlanVersion anteriores/nuevas, estados, starts/ends, versiones CAS, actor, corte t, código, reason, configuration IDs de UsageLimit/familias evaluadas y pares de asignaciones. correlation y causation identifican una operación reconstruible. Outbox, auditoría de cierre de packs y claim/result se confirman junto con ambas suscripciones. Consumidores idempotentes por event_id; no side effects de proveedor IAM.

Creación/publicación de catálogo, clasificación y condiciones de PlanVersion exige actor, versión de artefacto, fuentes y manifest; no datos comerciales silenciosos mediante SQL ad hoc. La migración sólo materializa el mapeo aprobado y registra ejecución técnica y publicación contractual conforme al procedimiento aprobado.

## 9. Migración y compatibilidad

No se crea migración ejecutable mientras siga pendiente el modelo exacto, registry y aprobación humana. El paquete posterior será forward-only, transaccional y separado de las 32 migraciones existentes, sin reescritura de checksums. Publicar también expected-schema, seed manifest y matrices de canonical/logical/physical/executable con hashes nuevos.

Preflight: versión/identidad del servidor, ledger/checksums, backup/restore antes de QA, inventario completo de raíces/planes, constraints fuente exactas, datos de límites negativos/no enteros/solapados, suscripciones contradictorias, asignaciones de otras versiones de misma raíz y todas las relaciones sin clasificación. Fallar antes de escribir ante un mapeo ausente; no conjeturar familia desde nombre.

Aplicación candidata: catálogo único + clasificación + PlanVersion–familia; extensión y reconciliación UsageLimit; constraints e índices por FK/plan/familia/intervalo; registry/permiso único/grant/eventos contractuales. No backfill de cantidades porque no existen valores comerciales aprobados. Versiones actuales conservan historia y quedan no contratables para operaciones dependientes cuando configuración resulte incompleta; efecto sobre lectura y derechos previamente contratados requiere aceptación humana expresa antes de activar, evitando degradación silenciosa de tenants actuales.

QA30 no consume las nuevas relaciones. QA32 y ceremonias locales33/34 son dependencias independientes con gates propios; 33/34 no están en manifest activo y los fixtures no se presentan como ledger migrado. Ninguna autorización local permite promoción, deploy, DDL/DML QA o modificar suscripciones reales. Rollback del runner es transaccional; recuperación después de commit mediante backup/restore aprobado o migración compensatoria gobernada, sin DROP de historia.

## 10. Pruebas y aprobación necesaria

El mecanismo nuevo requiere todos los casos A–T del mandato sobre PostgreSQL real, API autenticada y fixtures segregados: dos tenants, múltiples raíces ISO/ley, cambio entre versiones/familias válidas, vigencia y límites negativos, configuración incompleta, CAS/idempotencia/concurrencia, rollback por auditoría/outbox y lecturas/history. Fixtures numéricos son datos de prueba, no tarifas ni máximos del producto. Mocks son complementarios. La regresión del alta existente se acredita separadamente en el informe integral.

Para aprobar este paquete faltan decisiones **materiales** precisas: aceptar representación CommercialFamily/campos/relaciones; catálogo ISO/LEGAL y sus mapeos; extensión UsageLimit/código/unidad y cardinalidad de límites; políticas same-plan/futuros/corte; arista de cierre de packs; representación de exclusión por raíz; payload/read/audit/events/replay exactos; efecto de datos incompletos sobre derechos existentes. No quedan como TODO de implementación. Su gate es BLOCKED y su owner Producto/Arquitectura/Modelo de Datos/Backend/Seguridad/QA, con funciones humanas acumulables conforme 49.

Cantidades comerciales requieren aprobación de Producto únicamente antes de publicar/contratar datos reales; no bloquean la implementación técnica una vez aprobado el mecanismo ni las pruebas con fixtures. Autorización operacional QA, respaldo/restauración y compatibilidad se solicitan en un gate posterior con artefactos exactos. No se inicia STEP_6A4, intermedio ZIP ni STEP_6A5. Dominio público único https://grc.tecdex.net/.
