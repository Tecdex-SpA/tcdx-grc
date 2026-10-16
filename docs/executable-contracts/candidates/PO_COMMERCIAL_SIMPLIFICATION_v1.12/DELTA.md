# Contrato derivado mínimo — DR-GRC-20261016-001/002/003

`STATUS=DRAFT_NOT_EFFECTIVE`; `RUNTIME_IMPLEMENTED=NO`.
Sucesora candidata v1.12, predecesora activa v1.11. Este texto sólo modifica las
copias candidatas del contrato; no publica rutas, policies, datos ni permisos.

## C1. Autoridad interna de desarrollo

La instrucción expresa PO basta para las actividades incluidas: análisis, diseño,
contratos, implementación backend/frontend necesaria, pruebas, correcciones y
validación. No se requiere segunda firma, comité, revisor independiente interno,
ratificación de bytes derivados ni declaración administrativa adicional de roles.
Se conserva la instrucción fuente, su alcance y los hashes producidos, sin afirmar
que el PO firmó bytes futuros. Una contradicción interna se actualiza formalmente;
no constituye veto permanente. Se detiene sólo la operación excluida, con riesgo
técnico/de seguridad no resoluble en alcance o restricción externa concretamente
demostrada. La presente instrucción es sólo documental y excluye implementación,
activación y publicación Git. No se generaliza la regla a SoD del producto.

## C2. Incorporación y autoridad de los administradores

Hasta completar Fase10, Platform Admin realiza tenantInitialOnboardingCreate
(contrato25): identidad canónica existente o MI previamente provisionada por su
operación autorizada, tenantCreate, bootstrap interno de roles/primer TENANT_ADMIN,
recibo durable y refetch. Actor Platform no recibe Membership ni roles tenant.
El alta inicial sin Subscription conserva la excepción existente acotada; no
habilita la operación tenant general antes de CORE_PLATFORM efectivo.
Habilitación usa subscriptionCreate sobre PlanVersion publicada y los comandos
subscriptionRegulatoryPackActivate existentes sobre versiones elegibles. Ningún
plan concede RBAC, publica contenido ni elude cuotas/entitlements/intervalos.
Posteriores usuarios: Tenant Admin usa membershipCreate y membershipRoleAssign
en su tenant; asistencia Platform usa tenantUserOnboardingCreate (contrato26),
sus lecturas/revocación expresamente permitidas. platform.role.assign no se
amplía para asignar por ruta Platform genérica. MI y credenciales siguen siendo
Platform-only; Tenant Admin incorpora identidades existentes y compone roles
permitidos, sin crear cuentas OIDC ni recibir secreto ajeno. No se crean usuarios
ficticios, cuentas compartidas, grants, endpoints de solicitud ni autoservicio.

Autonomía significa no esperar una ratificación Platform por cada acción tenant
permitida. Requiere Membership activa, entitlement, permiso/scope efectivo,
ObjectPolicy y SoD; sin ellos DENY. No se agrega permiso de lectura EC a Tenant
Admin: effectiveConfigurationGet conserva su grant/scope real y sólo lee un
binding persistido existente. No se convierte esa lectura en cálculo/escritura.
La autoatención de clientes queda fuera de Fases1–10 cuando representa
autoalta/contratación autónoma; no se habilitan por la llegada del calendario.

## C3. Configuración ordinaria y acreditación

Una preferencia SaaS usa configurationOverrideCreate sobre una definición
publicada, de tipo y scope permitidos, con CORE_PLATFORM y su permiso existente;
no necesita universalmente documento jurídico auténtico ni revisión independiente.
No modifica definición global, catálogo, resultado oficial ni políticas sensibles.
No se ejecutan los workflows de Evidence/RetentionPolicy sólo para guardar esa
preferencia. Las revisiones/SoD que un comando sensible sí tiene se conservan.

Una aplicabilidad operativa ordinaria puede estar publicada sin source_evidence_
version_id/legal_basis_id/source_clause_ref cuando no invoca acreditación externa,
su policy es ordinaria tenant_policy/product_baseline no obligatoria y conserva
los predicados técnicos existentes. Esta distinción se deriva de policy_kind,
is_mandatory y vínculos reales: no hay enum, flag caller-controlled ni autoridad
paralela. No se rebaja una policy obligatoria/contractual/hold llamándola ordinaria.
Si hay fuente vinculada, se verifica siempre; si se pretende acreditación formal,
se requieren fuente auténtica, vigencia, revisión y SoD correspondientes. Una
fuente nula no acredita obligación jurídica ni cumplimiento, pero tampoco es
por sí sola error técnico para una configuración/carga ordinaria elegible.

uploadIntentCreate/uploadContentPut/uploadFinalize/evidenceCreate conservan
autorización, primaria operativa inequívoca publicada (o la excepción INITIAL_SOURCE
formal exacta), FK/policy/tenant/contexto, MIME/tamaño/hash/scan, idempotencia,
auditoría y transacciones. No admiten NULL en vínculos nuevos para evitar un guard.
Una primaria publicada ordinaria sin fuente no se filtra sólo por carecer de
acreditación jurídica. Los límites de consumo de la cadena draft INITIAL_SOURCE
siguen intactos; no se usa para evidencia de negocio hasta su publicación válida.
La aclaración no cambia scopes tenant-only de submit ordinario ni grants ajenos.

retentionApplicabilityBindInitialSource continúa siendo el acto exclusivo de bind
de fuente formal en draft, con fuente elegible independiente, sin backfill,
alteración de autor ni edición de publicaciones. Si una operación invoca un
fundamento externo obligatorio todavía no acreditado, se limita la acreditación
o purge correspondiente, no alta de usuarios/configuración independiente.
Retener por precaución no es acreditar legalmente esa obligación.

## C4. Retención propuesta sin reducción

Propuesta comercial12meses por defecto, alternativas18/24/36/48/60. No se declara
implementada ni persistida. La propuesta describe servicio operativo; no reemplaza
las categorías de rector23§6 ni las condiciones de disponibilidad/historia que
les correspondan. No añade límite0, duración en segundos, seed o fecha implícita.
Por objeto se conservan todas las obligaciones concurrentes, su categoría, evento
inicial y versión; no se hace max numérico entre unidades/anclas incomparables.
La duración efectiva no puede quedar por debajo del piso de categoría ni de una
obligación superior real. Hold activo sin release autorizado siempre DENY purge;
conflicto, ancla o obligación necesaria no resuelta también DENY purge. Cambiar
plan/meses, expiración, archive o release no ejecuta borrado. Publicaciones e
historia son inmutables y no se acorta ningún contrato anterior.

El catálogo temporal debe cerrar, antes de implementar esa selección, código y
versión de dato, unidad/calendario, ancla, zona/regla de fin de mes y traducción
a retention_seconds cuando corresponda. SEED011 no contiene hoy esa definición
y los schemas de configuración genéricos no cierran el input de meses. Se registra
NO_BINDING_DEMONSTRATED para esa selección, no para todo el producto. La solución
compatible es un contrato/manifiesto de datos tipados sobre las entidades ya
existentes, dentro del alcance de la futura instrucción, sin segunda aprobación
conceptual ni tablas nuevas. No se escoge mes=30días ni se publica nada ahora.

## C5. Errores, efectos y contratos sin cambio

Transporte, request/response, códigos400/401/403/404/409/422/503 aplicables por cada
operación, If-Match/expected_version, idempotencia y auditorías/eventos existentes
se conservan. No se añade código de error, permiso, grant, evento o arista.
Los comentarios y x-tcdx-po-reconciliation son propuestas documentales; no son
feature flag ni policy runtime. OPERATION_BINDINGS.json deriva IDs/paths/permisos/
scopes/capabilities de la OpenAPI activa y verifica que el transporte no cambió.
Políticas/aristas publicadas que una implementación futura necesite evolucionar
se versionan y verifican sobre el registry existente, sin reescribir historia ni
inventar una versión/policy_ref en este paquete.

## C6. UX contractual y criterios futuros

Hasta Fase10, Empresa→alta asistida Platform, administrador inicial y habilitación
son actos distintos con recibos reales y resultados parciales explícitos. Tenant
Admin administra Usuarios/Roles y parámetros propios con permisos efectivos.
La presentación separa configuración operativa de acreditación formal y no usa
etiquetas que certifiquen cumplimiento por guardar una opción o cargar un archivo.
No hay autoalta ni checkout de clientes, UUID/JSON manual ni entrega de credenciales
ajenas. Opciones en meses se presentan sólo cuando el contrato de datos y backend
real existan; no mostrar una opción como implementada por este documento.
Se preservan tokens, layouts, componentes, densidad, navegación y branding
docs/ui v1.0; no hay cambio visual ni HUMAN_UI_REVIEW=PASS. Aceptación operacional
real es evidencia funcional, no segunda aprobación interna para desarrollar.

## C7. Estado

Las pruebas futuras se especifican en TEST_SCENARIOS.json; todas NOT_RUN en esta
tarea. Integridad/coherencia se verifican estáticamente sin sustituir runtime.
STEP_6A3=PARTIAL_BLOCKED; H01–H10 suspendidas y reclasificadas prospectivamente;
STEP_6A4=NOT_STARTED. Activación, DB, backend/frontend, QA/PROD, commit/push/merge
y despliegue no están autorizados en esta ejecución.
