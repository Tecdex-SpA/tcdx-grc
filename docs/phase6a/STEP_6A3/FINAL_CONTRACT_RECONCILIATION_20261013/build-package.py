"""Reproducible documentary candidate builder. No DB, IAM, Git mutation or runtime.

All outputs remain proposed; this script is not a migration runner or approval.
Run from repository root. Inherited authority and package v1 are read-only inputs.
"""
from pathlib import Path
import csv
import hashlib
import json
import re

ROOT = Path.cwd()
BASE = ROOT / "docs/phase6a/STEP_6A3"
OUT = BASE / "FINAL_CONTRACT_RECONCILIATION_20261013"
PACKAGE_ID = "GP-STEP6A3-COMMERCIAL-20261013-02"
ORIGINAL = BASE / "STEP_6A3_COMMERCIAL_GOVERNANCE_APPROVAL_PACKAGE.md"
original = ORIGINAL.read_text()
assert hashlib.sha256(ORIGINAL.read_bytes()).hexdigest() == "846bb0a8b0b8491670a6343bbd5e82fb7d01cea6a20abbb351a724ab502bee32"


def write(name, text):
    (OUT / name).write_text(text.strip() + "\n")


def dump(name, value):
    write(name, json.dumps(value, ensure_ascii=False, indent=2))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


write("01_CANONICAL_LOGICAL_RECTOR_DELTA.md", """
# Delta propuesto canónico/lógico/rector — C-01..C-12

STATUS=DRAFT_NOT_EFFECTIVE. Autoridad: mandato de reconciliación; rector45/49.
No se edita baselinev1.8. Aprobación de diseño no activa una baseline sucesora.

## Deltas exactos para publicación posterior

| Fuente superior | Delta editorial propuesto | Límite |
| --- | --- | --- |
| Rector07/08/33 | Agregar CommercialFamily al owner Tenant & Commercial Entitlements, PLATFORM_CONTROL. UUIDv7; código/significado publicados inmutables; retención IMMUTABLE_RETAIN. | Una autoridad; sin PackFamily paralelo. |
| Rector30 | CommercialFamily1→0..N RegulatoryPack por relación soporte; raíz exactamente1 clasificación para nueva elegibilidad; PlanVersion N:M CommercialFamily por relación soporte. | Sin derecho implícito por source_type/código. |
| Rector30/42 | UsageLimit N→1PlanVersion; dimensión total NULL o familia explícitamente vinculada; un total y uno/familia efectivos durante toda vigencia. | Cero explícito; ausencia bloquea; cambio material→nueva PlanVersion. |
| Rector21 | Subscription active/subscription.change_plan/ended; child active/subscription_regulatory_pack.transfer_close/revoked; activación hija es INSERT active. | Sin update_status; registry exacto antes de código. |
| Rector22§10 | Recurso platform.subscription: read/create/update; update sólo subscriptionChangePlan y llamadas internas; read sólo las tres lecturas comerciales nuevas. Recurso platform.commercial_catalog: publish sólo ceremonia interna commercialCatalogPublication. | Tres permissions nuevas propuestas; tres grants base PLATFORM_ADMIN pendientes; no IAM ejecutado. |
| Rector23/42 | El cambio conserva ends_at programado y expiración de packs. Intervalo destino contiene íntegramente la nueva vigencia comercial. | Sin renovación/recorte/extensión automáticos. |
| Rector29/34 | Guards persistentes de publicación y nuevas asignaciones; transacción de la autoridad comercial única con outbox. | No FeatureFlag como entitlement ni segunda lógica de cambio. |

No se agregan estados de Subscription, capabilities, planes, roles, entidades legales ni fórmulas. Relaciones soporte no son autoridades de negocio nuevas.
La clasificación ISO/standard y LEGAL/law y sus cinco mappings de rector41 se proponen como datos manifestados, no seeds ejecutados. ISO_9001_2026 no se vuelve oficial por clasificación. GRC conserva clases legales/contractuales/sectoriales; familias futuras y cuotas se publican expresamente en nuevas versiones, sin herencia automática.

| Raíz canónica propuesta | Familia / source_type |
| --- | --- |
| ISO_9001_2015 | ISO / standard |
| ISO_9001_2026 | ISO / standard; clasificación no publica edición prepublication |
| ISO_IEC_27001_2022 | ISO / standard |
| ISO_IEC_42001_2023 | ISO / standard |
| CL_LEY_21719 | LEGAL / law; clasificación no altera vigencia legal |

Nuevas versiones propuestas de ISO e ISO_RIESGO_OPERATIVO admiten ISO; nuevaGRC admite ISO+LEGAL, sin limitar para siempre el alcance contractual/sectorial rector42§2.3. Ninguna fila se agrega a las v1 publicadas. Nuevas familias de esas clases exigen nuevas versiones y mappings explícitos.

## F-05: regla prospectiva permanente recomendada R-P

La exclusión existente Subscription+PackVersion permanece íntegra. Agregar regulatory_pack_id por FK exacta de versión. No añadir exclusión retrospectiva por raíz sobre todas las filas.
Cada INSERT y toda ampliación/cambio de raíz, versión, padre o tenant de asignación toma lock de Subscription y rechaza solapamiento con cualquier intervalo de otra asignación de la misma raíz; la comparación incluye filas históricas y usa [from,to). No hay flag legacy, excepción por tenant/fecha, bypass de runtime ni segunda tabla de derechos.
Cerrar/revocar un intervalo mediante comando autorizado puede reducirlo sin reprobar retrospectivamente coexistencias legítimas del intervalo anterior; nunca permite extenderlo. El trigger protege también DML que omita el servicio. READ COMMITTED obligatorio para esta regla propuesta, con nuevo SELECT tras el lock; PostgreSQL real deberá demostrar visibilidad y ausencia de write skew antes de publicación operacional. Un nivel no revisado se rechaza, no se asume equivalente.
IDs y períodos existentes no se reescriben. previous_* histórico NULL significa vínculo no registrado. No se asigna una versión de regla retrospectiva a filas antiguas.
Change-plan exige a lo sumo una versión efectiva por raíz en el origen. Si dos coexistencias actuales legítimas impiden conservar ambas bajo la regla nueva, devuelve409RESOURCE sin mutación. La adopción de ese tenant queda bloqueada para decisión competente; la migración estructural conserva la historia.

## Alternativa exacta R-A condicionada

Root FK más EXCLUDE(subscription_id,regulatory_pack_id,tstzrange(from,to,'[)')) sobre todas las filas. Sólo elegible si inventario real acredita CERO solapamientos por raíz en toda historia y dictamen humano confirma compatibilidad con el contrato anterior. Ningún DELETE/truncamiento/reparación hace elegible R-A. Requiere artefacto SQL específico y hash nuevo; no se aprueba como cambio automático al candidato R-P.
R-P es la propuesta única implementable tras su firma. R-A queda alternativa documental fuera del conjunto implementable. Si el inventario encuentra conflicto activo o asignaciones futuras incompatibles, se entrega decisión comercial por IDs/versiones/derechos exactos antes de la adopción; no se elige ganadora por fecha/código.

## Alcance de aprobación

Este delta prepara publicación exacta superior. Los archivos activos siguen vigentes hasta aprobación y publicación competente. El DDL candidato puede revisarse conjuntamente; su aplicación depende de PHYSICAL_DATA_MODEL_REVIEW y EXECUTABLE_CONTRACTS humanos. Ninguna firma publica bytes de una baseline sucesora todavía no preparada ni cambia su fecha efectiva.
""")

write("02_PHYSICAL_MODEL_CANDIDATE.md", """
# Modelo físico candidato — PostgreSQL16

STATUS=DRAFT_NOT_EFFECTIVE. Invariantes rector07/08/21/22/23/29/30/33/42/46; naming físico11. DDL exacto en 20261013000100_commercial_contract_reconciliation.sql; fuera del manifest/runner activo; NO ejecutado.

| Objeto | Perfil/ownership | Columnas y restricciones propias |
| --- | --- | --- |
| platform.commercial_families | I / PLATFORM_CONTROL | commercial_family_id UUID PK; family_code varchar(96) UQ trim/no vacío; name text trim/no vacío; source_type varchar(32) trim/no vacío; published_at timestamptz NOT NULL; publication_manifest_sha256 char(64) hex; UQ(id,source_type); actores FK RESTRICT; UPDATE/DELETE prohibidos. |
| platform.regulatory_pack_commercial_family_links | I / PLATFORM_CONTROL | regulatory_pack_commercial_family_link_id UUID PK; regulatory_pack_id UUID NOT NULL UQ; commercial_family_id UUID NOT NULL; source_type varchar(32); FKs compuestas raíz/tipo y familia/tipo; UPDATE/DELETE prohibidos. |
| platform.plan_version_commercial_family_links | I / PLATFORM_CONTROL | plan_version_commercial_family_link_id UUID PK; plan_version_id UUID NOT NULL; commercial_family_id UUID NOT NULL; UQ par; FKs RESTRICT. INSERT sólo padre no publicado; UPDATE/DELETE prohibidos. |
| platform.usage_limits | I / PLATFORM_CONTROL existente | commercial_family_id UUID nullable; FK familia + FK par PlanVersion/familia; reemplazar UNIQUE(limit_code) por UQ NULLS NOT DISTINCT(PV,code,family,from); finite>=0; pack entero/unidad; intervalos válidos; GiST total/familiar; INSERT sólo padre no publicado; UPDATE/DELETE prohibidos. |
| platform.subscriptions | TM / TENANT_OWNED existente | previous_subscription_id nullable; FK tenant+previous; UQ sucesor noNULL; no self; EXCLUDE tenant/rango para active y cancelled_atNULL; lineage diferido padreended/corte exacto; cierre anterior conserva campos contractuales y audit before. |
| platform.subscription_regulatory_packs | TM / TENANT_OWNED existente | regulatory_pack_id NOT NULL por FK compuesta versión/raíz; previous_subscription_regulatory_pack_id nullable; FK tenant+previous; UQ sucesor; triggers root prospectivo y lineage diferido; exclusión por versión intacta. |

Nombres >63 bytes se derivan mediante prefijo54 + '_' + primeros8hex SHA256; evitar truncamiento PostgreSQL ambiguo. Todas las FKs ON DELETE RESTRICT. Nuevas tablas usan perfil I existente, timestamps técnicos y CHECK actor <=1; ceremonia exige exactamente un actor real y audit completo. No defaults comerciales.

## Publicación y cuota

Las nuevas PlanVersion deben tener effective_from explícito y al menos una familia. Cada dimensión regulatory_pack_count cubre exactamente el rango del padre mediante range_agg; sin gaps/solapamientos ni cobertura fuera del padre. Un solo valor comercial constante por dimensión, aunque exista más de un intervalo contiguo. Valores no finitos, negativos, fraccionarios o unidades distintas bloquean publicación. Total y cuotas familiares se verifican independientemente. No se impone suma(familias)=total.
La inmutabilidad bloquea INSERT tardío de familias/UsageLimit/Entitlement sobre PV publicada, además de UPDATE/DELETE. Se conserva el contrato publicado previo; no se retrocompleta v1. Actualización material de cuota o elegibilidad crea nueva PV draft, artefacto exacto y publicación posterior.

## Lineage/temporalidad

Subscription hija inicia en corte t y conserva ends_at original del origen (NULL sólo si antes NULL). Antigua ends_at=t y lifecycleended; cancelled_at original NULL se conserva. Padre starts_at<hija.starts_at y parent.ends_at=hija.starts_at; tenant/plan/código original no se cambian. Nueva assignment misma versión/raíz, starts=t y expires=antigua expiry original; vieja revoked/end=t. Audits hijos almacenan expiración previa y corte. Los triggers comprueban también hijos ya enlazados al modificar un padre.
El contrato exige antes del COMMIT que expiry transferida coincida con audit before verificable; no basta comprobar la FK. Servicio, audit y tests deberán probar esa igualdad; no se reconstruye la expiración original después del corte por inferencia.

R-P conserva historia por versión y usa trigger root para nuevos/expandidos intervalos. Migración no realiza clasificación, cuotas, sucesiones inferidas ni grants. Datos incompatibles con restricciones generales de intervalos, subs activas o UsageLimit bloquean antes de DDL. Coexistencias históricas por raíz se inventarían y preservan; conflictos efectivos bloquean adopción.
""")

write("03_SECURITY_TRANSACTION_REPLAY_CONTRACT.md", """
# Contrato ejecutivo propuesto de seguridad, transacción y replay

STATUS=DRAFT_NOT_EFFECTIVE. Fuentes: rector09/21/22/23/25/26/34/42/45/49; ejecutables06/07/12/13 y alta Subscription vigente.

## Autoridad exacta

platform.subscription.update autoriza exclusivamente operationId subscriptionChangePlan / command subscription.change_plan y child transfer_close/transfer_activate invocados exclusivamente dentro del padre. No PATCH/PUT/delete/cancel/renew/state update públicos. Resolver HUMAN_INTERACTIVE activa + PlatformRoleAssignment vigente + Role PLATFORM_CONTROL publicado baseline PLATFORM_ADMIN + Permission publicada + platform scope + ObjectPolicy commercial.subscription.change_plan.v1 + SoD. Tenant Admin, Platform Support, roles custom, ServicePrincipal e impersonation DENY; cero grants por nombre/email/token claim no resuelto. Tenant se deriva del origen y se comprueba activo bajo lock; ningún X-TCDX-Tenant-Id ni tenant_id body.
Reads nuevas: platform.subscription.read y PLATFORM_ADMIN; sólo tres operaciones registradas. Publicación comercial independiente: platform.commercial_catalog.publish, sólo HUMAN_INTERACTIVE PLATFORM_ADMIN, policy commercial.catalog.publish.v1, artefacto exacto y mandato operacional firmado. No endpoints CRUD de catálogo; ningún permiso de Subscription publica familias/límites. Tres permisos/grants son deltas PROPUESTOS; no se materializan en IAM ni SQL candidato.

## Transacción y orden

READ COMMITTED. Autorizar antes de lookup; validar closed schema/headers; idempotency binding primero. Replay reautoriza actual actor/contexto y valida hash ANTES de comprobar CAS/origen activo; una operación completada debe poder reproducirse aunque el origen yaended por su propio éxito. Fingerprint distinto409IDEMPOTENCY incluso si CAS quedó obsoleto.
Nueva ejecución: lock Tenant; Subscription origen y competidoras orden UUID; asignaciones orden UUID; Plan/PlanVersion/familias/links/limits/pack roots+versions orden tabla/UUID FOR SHARE. Revalidar autoridad actual con la ruta canónica; fijar t mediante sentencia posterior a locks, PostgreSQL precisión6 UTC. No usar JS Date como autoridad de microsegundos. Cut>starts origen y todas las asignaciones efectivas que cierran.
Validar destino y matriz temporal; completitud, capabilities, publicación/licencia/gates pack y límites. Comprobar origen único efectivo, sin assignments futuros ni dos versiones efectivas de raíz. Conservar fechas de término antes de mutar. Cerrar origen active→ended (row_version+1 CAS), crear nuevaactive con ends_at previo; cerrar packactive→revoked y nuevaactive misma versión hasta expiry previa; persistir audits padre/privilegiado/hijos, outbox e idempotencia; ejecutar constraints diferidas; COMMIT único; sólo entonces HTTP200completed.
Fallo de audit/outbox/idempotency/CAS/constraint implica ROLLBACK total. Nada externo dentro de TX. Delivery posterior usa outbox y consumidores idempotentes; fallo posterior a COMMIT no revierte silenciosamente la venta. No job de cambio ni system_actor_allowed. Lock/statement timeout se configura mediante configuración operacional revisada, sin duración inventada; sin retry automático SQL no acotado. Deadlock/serialization devuelve409CONCURRENCY retryabletrue y exige reconciliación; no desplaza t artificialmente.

## Fingerprint exacto y persistencia

Perfil SUBSCRIPTION_CHANGE_PLAN_V1, bindingownership PLATFORM_CONTROL/tenantNULL/actor real/operation subscriptionChangePlan/key (1..255), sin client binding nuevo. UUID lowercase canónico, trim de subscription_code y reason; preservar case y Unicode (sin NFC/casefold); If-Match parse strong decimal positivo. canonical_request={origin_subscription_id,plan_version_id,subscription_code,reason,expected_row_version}; claves ordenadas lexicográficamente, JSON compacto UTF8, enteros exactos como strings donde schema lo fija. request_hash=SHA256(UTF8('v1'+'subscriptionChangePlan'+canonicalJSON)), concatenación contractual07; sin correlation, attempt, token ni whitespace transport.
result_ref existente: JSON compacto cerrado {profile:'SUBSCRIPTION_CHANGE_PLAN_V1',http_status:200,body:<SubscriptionChangePlanResponse>}. response_hash=SHA256 de canonicalJSON(body) UTF8; body exacto serializado orden claves/precision congelados. result_status_code=completed. Registrar timestamps UTC con exactamente6 decimales; row_version/version_number strings decimales positivas. No result_ref como join comercial: FKs son C-05. TTL/expiry según policy existente07, nullable; no días inventados.
Replay copia body/IDs/timestamps/versions/correlation raíz originales y HTTP200; revalida autorización y hash; Idempotency-Replayed=true; X-Correlation-Id del intento actual, X-Request-Id del intento actual conforme contrato base; body.correlation_id es raíz original almacenada. ETag OMITIDO tanto en éxito change-plan como replay. La nueva mutación exige GET detalle actual y su ETag fuerte de Subscription.row_version; no copiar version histórica del body como CAS. Cache-Control:no-store en estas lecturas/commands. Idempotency-Replayed=false en primer éxito.
En vuelo sin representación segura409RESOURCE retryabletrue; fingerprint cambiado409IDEMPOTENCY retryablefalse; snapshot corrupto/dependencia indisponible503DEPENDENCY_UNAVAILABLE, no reconstrucción desde filas actuales ni cambio de hash. Operación tras expiry del registro se reevalúa normalmente y origenended rechaza: no nueva venta. No se borra registro por un TTL inventado.

## Errores congelados, sin nuevos códigos

| Condición | HTTP/código | Retryable |
| --- | --- | --- |
| Shape/headers/UUID/unknown property | 400 TCDX.VALIDATION.FAILED | false |
| Auth ausente/inválida | 401 TCDX.AUTHENTICATION.REQUIRED/INVALID | false |
| Authority/SoD/contexto permitido denegado | 403 TCDX.AUTHORIZATION.DENIED | false |
| Target ausente/oculto | 404 TCDX.RESOURCE.NOT_FOUND | false |
| If-Match obsoleto/deadlock/serialization | 409 TCDX.CONFLICT.CONCURRENCY | true |
| Mismo destino/código duplicado/activos contradictorios/assignment futuro/raíz duplicada | 409 TCDX.CONFLICT.RESOURCE | false |
| Origen no vigente/ended/cancelado o arista no publicada | 409 TCDX.LIFECYCLE.TRANSITION_DENIED | false |
| Cut<=start por precisión/instante actual | 409 TCDX.CONFLICT.RESOURCE | true |
| Cuota excedida | 409 TCDX.LIMIT.USAGE_EXCEEDED | false |
| Destino/pack no elegible; límites ausentes; conflicto de intervalos contractuales | 422 TCDX.INVARIANT.VIOLATION | false |
| Auditoría/dependencia/result corrupto indisponible | 503 TCDX.DEPENDENCY.UNAVAILABLE | true |
| Error interno no clasificado | 500 TCDX.INTERNAL.FAILURE | false |

Detalles cerrados seguros del error: missing_configuration[] de códigos, violation enum y limit_code; nunca SQL, nombres de tenants ajenos, licencia, tokens ni datos legales. Error técnico no equivale a configuración vacía. Maps quota/CAS corrigen divergencias del paquetev1 con ejecutable06; no se edita ese contrato activo hoy.

## Lecturas y UI

Detalle actual/history/transfers usan schemas específicos; estado de configuración se deriva de estructura/completitud por la vigencia contractual de PV, no estado lifecycle ni derecho ilimitado. plan_name proviene de PV.display_name inmutable, no nombre mutable de un Plan usado para reinterpretar contrato histórico. next ID por inverseFK único. Historia devuelve estados existentes literal, sin limitar toda la historia a active/ended sólo porque el cambio usa esos dos. El schema lifecycle string1..32 conserva vocabulario existente sin publicar estados nuevos; el runtime valida fuente publicada.
Paginación25/100, cursor1..2048 autenticado y bound actor/tenant/operation/order/filter/asOf. Orden history starts_at DESC,subscription_id DESC; transfers effective_from DESC,assignmentID DESC; cursor de otro contexto400, actor revocado403, vacío legítimo200; dependencia503. Sin materialaudit/outbox para estas reads; telemetría de acceso vigente. Detail ETag sólo para CAS contractual; no implementar cache/If-None-Match ni usarlo sobre history/transfers.
Inspección existente: apps/frontend/src/core-grc.tsx contiene Asignar plan→subscriptionCreate; conservar esa alta. Adaptación posterior sólo PlatformAdmin: acción Cambiar plan en contexto de Subscription existente; GET actual→ETag; seleccionar PV completa mediante selector vigente con permiso create existente del rol base; código/motivo; POST+key estable; mostrar200/replay y refetch. No autoservicio tenant ni cuotas frontend. UI aplica baseline visualv1.0 y gates humanos; no rediseño.
""")

write("04_TRANSITION_PREFLIGHT_ROLLBACK.md", """
# Plan de transición propuesto — F-01/F-05/F-06

STATUS=PROPOSED_NOT_AUTHORIZED. Estrategia propuesta: ventana anunciada de mantenimiento con suspensión de escrituras comerciales y de accesos oficiales afectados. No disponibilidad continua prometida. Sin topología nueva, segundo change-plan, fallback ni FeatureFlag como derecho. Infraestructura rector12/43: backend45, frontend46, PostgreSQL40; dominio público https://grc.tecdex.net/.

## Orden exacto y puntos de parada

| Paso | Operación futura | Entrada/autoridad | Criterio de salida / interrupción |
| --- | --- | --- | --- |
| T0 | Revisar publicación contractual y freeze de hashes | Firma del paquete+artefactos; deltas superiores publicados; modelos/ejecutables aprobados | Cualquier hash/gate distinto→NO_GO. |
| T1 | Ensayo aislado sobre base descartable con datos representativos autorizados | PostgreSQL16 local, manifest exacto, fixtures segregados | Migración/restore/rollback/concurrencia/RBAC/contratos PASS; cero datos reales inventados. |
| T2 | Inventario READ ONLY compartido y preflight | Autorización operacional exacta, conexión TLS, snapshot consistente | Ledger/checksums/IDs actuales; manifiesto de adopción por Subscription/PV/código/CAS/razón aprobado; cuotas aprobadas; conflicto activo/futuro/root→NO_GO. |
| T3 | Anunciar ventana y detener/drenar entradas afectadas | ReleaseOwner+DBA, duración y recovery points reales, backup/PITR restaurable | Suspender comandos y reads oficiales afectados y consumidores que dependan de ellos; comprobar ausencia de TX en vuelo. No sólo esconder botón. |
| T4 | Backup consistente y aplicar únicamente migraciones autorizadas | Manifest/runners/checksums; backup reference y gates | Cada migración+ledger en TX; cualquier error→rollback TX; conservar ventana. |
| T5 | Instalar imagen nueva técnica con ingreso público afectado cerrado | Digest aprobado, coordenadas rectoras existentes, autorización deploy | Liveness técnico no acredita negocio. Canal operacional autenticado sobre runtime existente; no ruta comercial alternativa. |
| T6 | Publicar catálogo/relaciones/nuevas PV/limits completos | Ceremonia independiente, actor real, Permission publish y manifest de cantidades por hash | Audit/outbox/publish guard atómicos; ninguna v1 editada. |
| T7 | Habilitar operacionalmente único POST change-plan para operador autorizado | Canal controlado+PlatformAdmin real+update+CAS+keys del manifiesto aprobado | Ejecutar exactamente mismo endpoint/servicio; cada cambio ACID con fechas preservadas. Sin bypass de origen/destino ni SQL comercial ad hoc. |
| T8 | Validar totalidad de adopciones y estado dependiente | Evidencia por IDs/actor/corte/quota/audit/idempotency; gates de dependencias | Sin suscripciones afectadas pendientes, sin pérdida de derechos, sin contradicción root/tenant/familia. Fallo→NO_GO y recuperación. |
| T9 | Smoke autenticado/UI/observabilidad y aceptación GO | Runtime autorizado, source/runtime parity, Security/QA/humanUI | PASS reales de escenarios comerciales y dependencias enumeradas; no health-only PASS. |
| T10 | Activación pública y reanudar consumidores afectados | GO explícito ReleaseOwner, hashes congelados, aprobación operacional | Habilitar guard comercial único ya consistente; monitorear y registrar publicación real. No STEP6A4 automático. |

No se requiere adopción antes de T5: el comando existe instalado y habilitado controladamente en T7, antes de T10. La barrera de ingreso se aplica en la infraestructura existente según su configuración operacional revisada; el plan concreto debe aportar hashes de reglas/router/ingress y verificar ambos accesos (host interno y público). No se genera una puerta secreta o token bypass. Si no se puede demostrar esa barrera con autoridad existente, T5 bloqueado, no se despliega.

## Preflight obligatorio

Inventario 05_HISTORICAL_READONLY_INVENTORY.sql sólo mediante sesión read-only. Comparar todo ledger con manifest actual aprobado, no asumir30/32. Identidad PG16/tcdx-grc/TLS; privilegios; catálogos/actors/grants reales; fuentes/licencias; FKs; límites finite/negative/units; gaps; subs activos; root overlaps pasados/actuales/futuros; PV contratadas; tiempos de término; provenance; compatibilidad de baseline/modelo/contratos. Consultas agregadas sin exportar PII; IDs para adopción sólo en expediente operacional protegido. Verificar familias/limits/versiones de destino y todos sus intervalos antes de escribir.
No ejecutar consulta de columnas nuevas en esquema previo: SQL de inventario usa JOIN a PackVersion para raíz. Inventario anterior0UsageLimit no sustituye el nuevo. Ninguna query produce diagnóstico PASS por fila ausente de dependencia.

## Recuperación y rollback

Antes de COMMIT de cada cambio: rollback íntegro del comando. Antes de COMMIT de cada migración: runner revierte SQL+ledger. Después de COMMIT no DOWN destructivo, cambio inverso de fechas, borrado de auditorías, reactivación manual ni escritura sobre historia.
Adopción multitenant NO es una única TX global: cada Subscription se confirma individualmente; un fallo intermedio mantiene la ventana cerrada. Recuperación después de cambios comerciales exige restaurar el backup/PITR coordinado de BD y el runtime anterior como unidad, antes de abrir ingreso, sin perder escrituras externas que se admitieron durante la ventana. Por ello se suspende todo escritor/consumer que afecte las filas/eventos/identidades de esa recuperación; si no es viable aislar ese alcance, suspender todas las escrituras de la aplicación durante la ventana o NO_GO. Publicación a consumidores externos se retiene durante adopción; no entregar eventos de operaciones que podrían restaurarse. No borrar outbox/audit manualmente.
Si ya se abrió público o se entregaron efectos externos, restauración unilateral NO autorizada: incidente, reconciliación de efectos por commands compensatorios explícitos y decisión Release/DBA/Product antes de mutar. El plan no promete rollback instantáneo del mundo externo.
Ensayo demuestra restore de imagen+BD/checksums/familias/asignaciones/historia/outbox/idempotency. RPO15min/RTO4h objetivos rector43; evidencia real y ventana concreta pendientes, no duración inventada. Criterios de interrupción: hash/ledger inesperado, datos incompatibles, autoridad incompleta, falta de cifras, bloqueo regulatorio de un pack requerido, timeout/deadlock sin reconciliación, error de auditoría/restore, smoke negativo o barrera permeable.

## Datos operacionales que no aprueba la firma de diseño

Fecha/duración de ventana, operador real, backup/PITR reference, imágenes/digests, rules ingress, secrets references, inventario real, mapping por Subscription, cuotas reales, grants publicados y recuperación deben presentarse juntos en mandato operacional posterior. Hoy no están autorizados ni ejecutados. La firma propone la estrategia; no aprueba valores o hashes futuros desconocidos.
""")

write("05_HISTORICAL_READONLY_INVENTORY.sql", """
-- Proposed READ ONLY inventory. Not executed. Shared QA requires exact authorization.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT current_database() AS database_name,current_setting('server_version_num') AS version_num,
       current_setting('transaction_read_only') AS transaction_read_only;
SELECT migration_id,filename,content_sha256,transactional,outcome
  FROM platform.schema_migrations ORDER BY migration_id;
SELECT lifecycle_state,count(*) AS subscriptions FROM platform.subscriptions GROUP BY lifecycle_state;
SELECT count(*) AS active_subscription_overlaps
FROM platform.subscriptions a JOIN platform.subscriptions b
  ON a.tenant_id=b.tenant_id AND a.subscription_id<b.subscription_id
 AND a.lifecycle_state='active' AND b.lifecycle_state='active'
 AND a.cancelled_at IS NULL AND b.cancelled_at IS NULL
 AND tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(b.starts_at,b.ends_at,'[)');
WITH overlaps AS (
 SELECT a.effective_from AS a_from,a.effective_to AS a_to,
        b.effective_from AS b_from,b.effective_to AS b_to,
        a.lifecycle_state AS a_state,b.lifecycle_state AS b_state
 FROM platform.subscription_regulatory_packs a
 JOIN regulatory.regulatory_pack_versions av USING(regulatory_pack_version_id)
 JOIN platform.subscription_regulatory_packs b
   ON a.subscription_id=b.subscription_id
  AND a.subscription_regulatory_pack_id<b.subscription_regulatory_pack_id
 JOIN regulatory.regulatory_pack_versions bv ON bv.regulatory_pack_version_id=b.regulatory_pack_version_id
 WHERE av.regulatory_pack_id=bv.regulatory_pack_id
   AND tstzrange(a.effective_from,a.effective_to,'[)') && tstzrange(b.effective_from,b.effective_to,'[)')
) SELECT count(*) AS all_historical_root_overlaps,
 count(*) FILTER(WHERE a_state='active' AND b_state='active'
   AND tstzrange(a_from,a_to,'[)') @> transaction_timestamp()
   AND tstzrange(b_from,b_to,'[)') @> transaction_timestamp()) AS effective_root_conflicts,
 count(*) FILTER(WHERE greatest(a_from,b_from)>transaction_timestamp()) AS future_root_overlaps
 FROM overlaps;
SELECT count(*) AS usage_limit_rows,
 count(*) FILTER(WHERE limit_value::text IN ('NaN','Infinity','-Infinity') OR limit_value<0) AS invalid_values,
 count(*) FILTER(WHERE limit_code='regulatory_pack_count' AND (unit<>'pack' OR trunc(limit_value)<>limit_value)) AS invalid_pack_values,
 count(*) FILTER(WHERE effective_to IS NOT NULL AND effective_to<=effective_from) AS invalid_intervals
 FROM platform.usage_limits;
SELECT p.pack_code,p.source_type,count(v.regulatory_pack_version_id) AS version_count
 FROM regulatory.regulatory_packs p LEFT JOIN regulatory.regulatory_pack_versions v USING(regulatory_pack_id)
 GROUP BY p.pack_code,p.source_type ORDER BY p.pack_code;
SELECT connamespace::regnamespace::text AS schema_name,conname,pg_get_constraintdef(oid) AS definition
 FROM pg_constraint WHERE conrelid IN ('platform.usage_limits'::regclass,
 'platform.subscriptions'::regclass,'platform.subscription_regulatory_packs'::regclass)
 ORDER BY 1,2;
ROLLBACK;
""")

write("06_LEGAL_METHODOLOGY_AND_PHASE_GATES.md", """
# Expedientes pendientes y criterios de fase — F-09/F-10

STATUS=DOCUMENTARY_REQUIREMENTS_NOT_ACCEPTANCE. Fuentes rector17/19/23§8/24/28/29/38/43/45/46/49; ledger26 y macro_implementation_20261009 de07_RESULT.json,36/48DONE locales y12pendientes. No se reclasifica una H como cerrada por aprobar conservar su bloqueo.

| Expediente | Datos/fuentes necesarios | Artefactos exactos y criterio | Estado / owner |
| --- | --- | --- | --- |
| H-01 legal | Texto oficial/contrato externo pertinente, fuente/version/hash/cláusula; jurisdicción, actividad, objetos; vigencia, hold y precedencia23§8 | DecisionRecord legal con aplicabilidad positiva/negativa; matriz objeto→contexto→policy/version; representación tipada revisada; guards createUploadIntent/finalize/evidenceCreate; pruebas. Presencia de familiaLEGAL nunca demuestra aplicabilidad. | BLOCKED_SOURCE_AND_BINDING; Privacy/Legal+Architecture/Data/Security/Evidence. |
| H-04 Compliance v1 | Rector17§3.1/19§2/38, defaults peso1/factor0.50/coverage80%; pack override exacto o ausencia demostrada; población/inputs/lineage/fuentes | Expediente por methodologyID/formulaID/version/hash que demuestre autosuficiencia; insuficiencia→conservar EC opcional conforme contrato vigente sin publicar none. | BLOCKED_SUFFICIENCY; Methodology/Compliance/Configuration. |
| H-05 Controls v1 | Rector17§§3.2–3.4/19§3/38/39§2; min(design,operating),coverage80%; inputs válidos, evidencia, recencia/confianza oficiales | Expediente reproducible por versión con muestras positivas/negativas y suficiencia; no ventana de recencia inventada ni promedio compensatorio. | BLOCKED_SUFFICIENCY; Methodology/Controls/Assurance. |
| H-06 publicación | Expedientes H04/H05; metodología/fórmula/version/sourceHash/vigencia exactos; contrato ejecutable27 | Cambiar modo material exige sucesora; representation física del binding sólo después de fuentes/suficiencia; no editar v1 o backfill assessments/NULL=none. Manifest+schemas+modelo por hash revisados. | BLOCKED_REPRESENTATION_AND_PUBLICATION; Architecture/Data/Methodology/Backend/Security. |

Los campos ausentes son evidencia faltante, no parámetros técnicos a escoger. Se preparan requisitos de expediente, no una decisión legal sustantiva ni publicación metodológica. La revisión unipersonal49 permite funciones acumuladas y no acredita esas fuentes. Independencia externa sólo si la fuente superior exacta la exige.

## Dependencias independientes y cierre integral

El motor comercial genérico puede diseñarse y, tras sus gates, implementarse con fixtures aislados sin aplicar retención ni calcular scores: rector43§4/Fase4 y31 decisión55 preservan independencia por dependencia concreta. Change-plan no altera Evidence/Assessment, fórmulas o retención. Un pack oficial requerido todavía debe superar37/41; no usar contenido draft real por un fixture.
El cierre integral STEP6A3 NO puede omitir las12cláusulas pendientes que el ledger vigente incluye.07_RESULT.json continuity_r4/r5/r6 conserva48traced/36local/12pending y STEP6A3PARTIAL_BLOCKED; rector49§6 fija6A3→6A4→ZIP→6A5. Ninguna autorización leída extrae H01/H04/H05/H06 de ese cierre. Por tanto: desarrollo comercial independiente permitido después de sus aprobaciones; cierre integral bloqueado hasta resolver y aceptar obligaciones heredadas. No se cambia el significado de fase.

## Secuencia no circular de suficiencia/publicación

Preparar expediente H04/H05 y representación H06 como candidatos conjuntos→probar suficiencia por versión en entorno autorizado→revisión humana de ambos artefactos exactos→publicación versionada→aceptación externa H10. H04/H05 no exigen que H06 ya esté activa para elaborar la prueba; H06 no afirma suficiencia por publicar. H01 sólo es dependencia de escenarios que consumen contexto legal.

## Entrada exacta STEP6A4

Requisitos acumulativos: cierre formal humano de STEP6A3 con48/48cláusulas trazadas aceptadas en su alcance; comercial end-to-end persistence/domain/API/RBAC/audit/UI/tests/E2E/runtime/traceability; fuentes legales/metodológicas y publicación aplicables; QA/IAM/grants/migraciones legitimados bajo mandatos propios; integridadrectora y gates aplicablesPASS; source/runtime parity; registro humano de cierre fuera del baseline; taskpacket autorizado de STEP6A4. Ninguna firma de este diseño satisface esos requisitos ni inicia la fase. STEP6A4=NOT_STARTED; READY no acreditado.

## Decisiones externas agrupadas mínimas

1. Firmar o rechazar diseño candidato R-P/ventana/HTTP200/cuotas inmutables/fechas/replay/autoridad y artefactos exactos.
2. Aportar expediente legal y suficiencia metodológica; aprobar representación exacta cuando fuentes permitan cerrarla.
3. Autorizar inventario READ ONLY compartido con alcance/actor/tiempo/retención de resultados; resolver coexistencias activas y datos inválidos descubiertos por decisión competente.
4. Aportar cuotas y mapping de adopción por IDs, comercialmente aprobados. No cantidades ficticias.
5. Después de pruebas reales, autorizar publicación/grants/QA/release por artefactos reales y aceptar gates correspondientes.

No se solicitan nuevas decisiones sobre diseños UQ/default/grants44 ya firmados en su alcance; sí su adopción/compatibilidad operacional.
""")

# Closed OpenAPI candidate, separate from active contracts and serving configuration.
uuid = {"type": "string", "format": "uuid", "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"}
instant = {"type": "string", "format": "date-time", "pattern": r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$"}
decimal = {"type": "string", "pattern": "^[1-9][0-9]*$"}


def nullable(schema):
    return {"anyOf": [schema, {"type": "null"}]}


def obj(properties):
    return {"type": "object", "additionalProperties": False, "required": list(properties), "properties": properties}


def ref(name):
    return {"$ref": "#/components/schemas/" + name}


schemas = {}
schemas["SubscriptionChangePlanRequest"] = obj({
    "plan_version_id": uuid,
    "subscription_code": {"type": "string", "minLength": 1, "maxLength": 96, "pattern": r"\S", "description": "Trim server-owned; case/Unicode preserved."},
    "reason": {"type": "string", "minLength": 1, "maxLength": 2000, "pattern": r"\S", "description": "Trim; no secrets."},
})
detail = obj({
    "subscription_id": uuid, "tenant_id": uuid, "subscription_code": {"type": "string", "minLength": 1, "maxLength": 96},
    "plan_version_id": uuid, "plan_id": uuid, "plan_code": {"type": "string", "minLength": 1, "maxLength": 64},
    "plan_name": {"type": "string", "minLength": 1, "description": "Immutable PlanVersion.display_name, not mutable Plan name."},
    "plan_version_number": decimal, "lifecycle_state": {"type": "string", "minLength": 1, "maxLength": 32, "description": "Existing published Subscription vocabulary; change-plan only active/ended. No new lifecycle."},
    "starts_at": instant, "ends_at": nullable(instant), "cancelled_at": nullable(instant), "row_version": decimal,
    "previous_subscription_id": nullable(uuid), "next_subscription_id": nullable(uuid),
    "commercial_configuration_status": {"type": "string", "enum": ["complete", "incomplete", "conflicting"]},
})
schemas["SubscriptionDetailProjection"] = detail
schemas["SubscriptionHistoryProjection"] = json.loads(json.dumps(detail))
schemas["SubscriptionPackTransferProjection"] = obj({
    **{k: uuid for k in ["previous_subscription_regulatory_pack_id", "current_subscription_regulatory_pack_id", "regulatory_pack_id", "regulatory_pack_version_id", "previous_subscription_id", "current_subscription_id"]},
    "effective_from": instant, "effective_to": nullable(instant),
})
schemas["SubscriptionChangePlanResponse"] = obj({
    "operation_id": {"type": "string", "const": "subscriptionChangePlan"}, "status": {"type": "string", "const": "completed"},
    "correlation_id": {"type": "string", "format": "uuid", "description": "Original command root, preserved on replay."},
    "resource_id": uuid,
    "result": obj({"previous_subscription": ref("SubscriptionDetailProjection"), "current_subscription": ref("SubscriptionDetailProjection"),
        "effective_at": instant, "pack_transfers": obj({"count": {"type": "integer", "minimum": 0},
            "href": {"type": "string", "pattern": "^/api/v1/platform/subscriptions/[0-9a-f-]{36}/pack-transfers$"}})}),
})
schemas["IdempotencyReplayProfile"] = obj({"profile": {"type": "string", "const": "SUBSCRIPTION_CHANGE_PLAN_V1"},
    "http_status": {"type": "integer", "const": 200}, "body": ref("SubscriptionChangePlanResponse")})
schemas["CursorPageMetadata"] = obj({"next_cursor": nullable({"type": "string", "minLength": 1, "maxLength": 2048}),
    "has_more": {"type": "boolean"}})
for name, item in [("SubscriptionHistoryPage", "SubscriptionHistoryProjection"), ("SubscriptionPackTransferPage", "SubscriptionPackTransferProjection")]:
    schemas[name] = obj({"items": {"type": "array", "maxItems": 100, "items": ref(item)}, "meta": ref("CursorPageMetadata")})
schemas["ErrorEnvelope"] = {"$ref": "../../../executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml#/components/schemas/ErrorEnvelope"}
parameters = {
    "SubscriptionIfMatch": {"name": "If-Match", "in": "header", "required": True,
        "description": "Current Subscription.row_version from fresh detail GET. Strong quoted decimal, no body CAS/weak validator.",
        "schema": {"type": "string", "pattern": '^"[1-9][0-9]*"$'}},
    "IdempotencyKey": {"name": "Idempotency-Key", "in": "header", "required": True, "schema": {"type": "string", "minLength": 1, "maxLength": 255}},
    "CorrelationId": {"name": "X-Correlation-Id", "in": "header", "required": False, "schema": {"type": "string", "format": "uuid"}},
    "SubscriptionId": {"name": "id", "in": "path", "required": True, "schema": uuid},
    "TenantId": {"name": "tenant_id", "in": "query", "required": True, "schema": uuid},
    "PageSize": {"name": "page[size]", "in": "query", "required": False, "schema": {"type": "integer", "minimum": 1, "maximum": 100, "default": 25}},
    "Cursor": {"name": "page[cursor]", "in": "query", "required": False, "schema": {"type": "string", "minLength": 1, "maxLength": 2048}},
}
common_headers = {"X-Correlation-Id": {"schema": {"type": "string", "format": "uuid"}},
    "X-Request-Id": {"schema": {"type": "string", "format": "uuid"}}, "Cache-Control": {"schema": {"type": "string", "const": "no-store"}}}


def response(schema, description, headers=None):
    return {"description": description, "headers": {**common_headers, **(headers or {})}, "content": {"application/json": {"schema": ref(schema)}}}


def errors(statuses):
    return {str(code): {"description": "Exact error mapping in 03_SECURITY_TRANSACTION_REPLAY_CONTRACT.md; no SQL/secret disclosure.",
        "headers": common_headers, "content": {"application/problem+json": {"schema": ref("ErrorEnvelope")}}} for code in statuses}


def operation(identifier, permission, params, success_schema, mutable=False, etag=False):
    result = {"operationId": identifier, "security": [{"ApplicationBearer": []}], "x-status": "DRAFT_NOT_EFFECTIVE",
        "x-permission": permission, "x-scope": "platform", "x-authority": "HUMAN_INTERACTIVE PLATFORM_ADMIN; no impersonation",
        "x-forbidden-request-headers": ["X-TCDX-Tenant-Id"], "x-closed-query": True,
        "parameters": [{"$ref": "#/components/parameters/" + p} for p in params],
        "responses": {"200": response(success_schema, "Completed after COMMIT; original body on authorized replay." if mutable else "Authorized current read.",
            {"Idempotency-Replayed": {"schema": {"type": "boolean"}}} if mutable else ({"ETag": {"schema": {"type": "string", "pattern": '^"[1-9][0-9]*"$'}}} if etag else {})),
            **errors([400, 401, 403, 404, 409, 422, 500, 503] if mutable else [400, 401, 403, 404, 500, 503])}}
    if mutable:
        result["requestBody"] = {"required": True, "content": {"application/json": {"schema": ref("SubscriptionChangePlanRequest")}}}
        result["x-command-code"] = "subscription.change_plan"
        result["x-idempotency-profile"] = "SUBSCRIPTION_CHANGE_PLAN_V1"
        result["x-response-etag"] = "OMITTED_ON_FIRST_SUCCESS_AND_REPLAY"
    return result

openapi = {"openapi": "3.1.0", "info": {"title": "STEP6A3 commercial additive contract candidate", "version": "20261013-02",
    "x-package-id": PACKAGE_ID, "x-status": "DRAFT_NOT_EFFECTIVE", "description": "No active OpenAPI or HTTP202 subscriptionCreate change. Approval/publication/gates required."},
    "servers": [{"url": "https://grc.tecdex.net/api/v1"}],
    "paths": {
        "/platform/subscriptions/{id}:change-plan": {"post": operation("subscriptionChangePlan", "platform.subscription.update", ["SubscriptionId", "CorrelationId", "IdempotencyKey", "SubscriptionIfMatch"], "SubscriptionChangePlanResponse", True)},
        "/platform/subscriptions/{id}": {"get": operation("subscriptionCommercialGet", "platform.subscription.read", ["SubscriptionId", "CorrelationId"], "SubscriptionDetailProjection", etag=True)},
        "/platform/subscriptions": {"get": operation("subscriptionCommercialList", "platform.subscription.read", ["TenantId", "PageSize", "Cursor", "CorrelationId"], "SubscriptionHistoryPage")},
        "/platform/subscriptions/{id}/pack-transfers": {"get": operation("subscriptionPackTransferList", "platform.subscription.read", ["SubscriptionId", "PageSize", "Cursor", "CorrelationId"], "SubscriptionPackTransferPage")},
    }, "components": {"schemas": schemas, "parameters": parameters,
        "securitySchemes": {"ApplicationBearer": {"type": "http", "scheme": "bearer", "bearerFormat": "JWT",
            "description": "Existing TCDX application token validation and Platform authority chain; not external provider JWT."}}}}
dump("07_OPENAPI_COMMERCIAL_CANDIDATE.json", openapi)

bindings = [
    {"operationId": "subscriptionChangePlan", "command_code": "subscription.change_plan", "entity": "Subscription", "from": "active", "to": "ended",
     "permission": "platform.subscription.update", "object_policy": "commercial.subscription.change_plan.v1", "audit": "audit.platform.subscription.change_plan.v1", "event": "platform.subscription.plan_changed.v1", "profile": "SUBSCRIPTION_CHANGE_PLAN_V1", "internal_only": False},
    {"operationId": None, "command_code": "subscription_regulatory_pack.transfer_close", "entity": "SubscriptionRegulatoryPack", "from": "active", "to": "revoked",
     "permission": "platform.subscription.update", "object_policy": "commercial.pack.transfer_close.v1", "audit": "audit.platform.subscription_regulatory_pack.transfer_close.v1", "event": "platform.subscription_regulatory_pack.transfer_closed.v1", "profile": "PARENT_AND_ASSIGNMENT_ID", "internal_only": True},
    {"operationId": None, "command_code": "subscription_regulatory_pack.transfer_activate", "entity": "SubscriptionRegulatoryPack", "from": None, "to": "active",
     "permission": "platform.subscription.update", "object_policy": "commercial.pack.transfer_activate.v1", "audit": "audit.platform.subscription_regulatory_pack.transfer_activate.v1", "event": "platform.subscription_regulatory_pack.transferred.v1", "profile": "PARENT_AND_ASSIGNMENT_ID", "internal_only": True},
    {"operationId": "commercialCatalogPublication", "command_code": "commercial_catalog.publish", "entity": "CommercialFamily", "from": None, "to": None,
     "permission": "platform.commercial_catalog.publish", "object_policy": "commercial.catalog.publish.v1", "audit": "audit.platform.commercial_catalog.publish.v1", "event": "platform.commercial_catalog.published.v1", "profile": "PUBLICATION_MANIFEST_SHA256", "internal_only": True},
    {"operationId": "commercialCatalogPublication", "command_code": "commercial_catalog.publish", "entity": "PlanVersion", "from": "draft", "to": "published",
     "permission": "platform.commercial_catalog.publish", "object_policy": "commercial.catalog.publish.v1", "audit": "audit.platform.plan_version.publish.v1", "event": "platform.plan_version.published.v1", "profile": "PUBLICATION_MANIFEST_SHA256", "internal_only": True},
]
for binding in bindings:
    binding.update({"allowed_scopes": ["platform"], "system_actor_allowed": False,
        "notification_policy": "NONE_NEW", "recalculation_policy": "NO_HISTORICAL_RECALCULATION",
        "concurrency_semantics": "READ_COMMITTED_TENANT_ORDERED_LOCKS_CAS" if binding["profile"] != "PUBLICATION_MANIFEST_SHA256" else "READ_COMMITTED_ORDERED_CATALOG_LOCKS",
        "sod_policy": "PLATFORM_ADMIN_REAL_HUMAN_NO_IMPERSONATION_NO_PRODUCT_SOD_BYPASS"})
dump("08_COMMAND_PERMISSION_LIFECYCLE_AUDIT_BINDINGS.json", {"status": "DRAFT_NOT_EFFECTIVE", "bindings": bindings,
    "read_bindings": [{"operationId": op, "permission": "platform.subscription.read", "scope": "platform", "material_audit": None, "outbox": None} for op in ["subscriptionCommercialGet", "subscriptionCommercialList", "subscriptionPackTransferList"]],
    "permission_grant_candidates": [{"code": code, "base_role": "PLATFORM_ADMIN", "other_roles": "DENY", "published": False} for code in ["platform.subscription.update", "platform.subscription.read", "platform.commercial_catalog.publish"]],
    "publication": {"scope": "platform", "actor": "REAL_HUMAN_PLATFORM_ADMIN", "input": "HUMAN_APPROVED_EXACT_MANIFEST_SHA256",
        "transaction": "All manifest rows, bindings, immutable PlanVersion publication, audits per aggregate, outbox and idempotency COMMIT together",
        "partial_publication": "PROHIBITED", "active_plan_versions_changed": False,
        "audit_command_code": "commercial_catalog.publish", "api_operation_id_metadata": "commercialCatalogPublication"}})

# Proposed forward migration: excluded from active runner/manifest; never applied here.
source_manifest = json.loads((ROOT / "database/migrations/manifest.json").read_text())
ledger_json = json.dumps(source_manifest["migrations"], separators=(",", ":"))
sql = ["""-- DRAFT_NOT_EFFECTIVE: exact review candidate, NOT applied or in active runner.
-- PG16, R-P prospective root rule. No commercial values, identities or grants.
-- Runner owns BEGIN/COMMIT + ledger; do not run as an ungoverned psql script.
DO $preflight$
BEGIN
 IF current_database()<>'tcdx-grc' OR current_setting('server_version_num')::integer/10000<>16 THEN
  RAISE EXCEPTION 'COMMERCIAL_TARGET_IDENTITY_MISMATCH';
 END IF;
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'COMMERCIAL_REQUIRES_REVIEWED_READ_COMMITTED';
 END IF;
 IF to_regclass('platform.commercial_families') IS NOT NULL THEN
  RAISE EXCEPTION 'COMMERCIAL_SCHEMA_ALREADY_PRESENT_WITHOUT_REVIEWED_LEDGER';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='platform.usage_limits'::regclass
   AND conname='uq_usage_limits__limit_code' AND contype='u') THEN
  RAISE EXCEPTION 'COMMERCIAL_SOURCE_USAGE_LIMIT_CONSTRAINT_MISMATCH';
 END IF;
 IF EXISTS(SELECT 1 FROM platform.usage_limits WHERE limit_value::text IN ('NaN','Infinity','-Infinity')
   OR limit_value<0 OR (effective_to IS NOT NULL AND effective_to<=effective_from)
   OR (limit_code='regulatory_pack_count' AND (unit<>'pack' OR trunc(limit_value)<>limit_value))) THEN
  RAISE EXCEPTION 'COMMERCIAL_USAGE_LIMIT_DATA_REQUIRES_COMPETENT_RESOLUTION';
 END IF;
END $preflight$;
"""]
sql.append("""DO $ledger$
BEGIN
 IF EXISTS(
   SELECT 1 FROM jsonb_to_recordset($reviewed$""" + ledger_json + """$reviewed$::jsonb)
   AS expected(id text,filename text,sha256 text,transactional boolean)
   FULL JOIN (SELECT * FROM platform.schema_migrations WHERE outcome='applied') actual
     ON actual.migration_id=expected.id
   WHERE expected.id IS NULL OR actual.migration_id IS NULL OR actual.filename<>expected.filename
      OR actual.content_sha256<>expected.sha256 OR actual.transactional<>expected.transactional
 ) THEN RAISE EXCEPTION 'COMMERCIAL_REVIEWED_SOURCE_LEDGER_MISMATCH'; END IF;
END $ledger$;
CREATE EXTENSION IF NOT EXISTS btree_gist;
""")


def physical_name(value):
    return value if len(value) <= 63 else value[:54] + "_" + hashlib.sha256(value.encode()).hexdigest()[:8]


for table, pk, fields, keys in [
    ("commercial_families", "commercial_family_id",
     "family_code varchar(96) NOT NULL, name text NOT NULL, source_type varchar(32) NOT NULL, published_at timestamptz NOT NULL, publication_manifest_sha256 char(64) NOT NULL",
     "CONSTRAINT uq_commercial_families__family_code UNIQUE(family_code), CONSTRAINT uq_commercial_families__id_source UNIQUE(commercial_family_id,source_type), CONSTRAINT ck_commercial_families__required_text CHECK(btrim(family_code)<>'' AND family_code=btrim(family_code) AND btrim(name)<>'' AND btrim(source_type)<>''), CONSTRAINT ck_commercial_families__manifest_hash CHECK(publication_manifest_sha256 ~ '^[0-9a-f]{64}$')"),
    ("regulatory_pack_commercial_family_links", "regulatory_pack_commercial_family_link_id",
     "regulatory_pack_id uuid NOT NULL,commercial_family_id uuid NOT NULL,source_type varchar(32) NOT NULL",
     "CONSTRAINT uq_pack_commercial_family_links__root UNIQUE(regulatory_pack_id)"),
    ("plan_version_commercial_family_links", "plan_version_commercial_family_link_id",
     "plan_version_id uuid NOT NULL,commercial_family_id uuid NOT NULL",
     "CONSTRAINT uq_plan_version_family_links__pair UNIQUE(plan_version_id,commercial_family_id)")]:
    sql.append(f"""CREATE TABLE platform.{table} (
 {pk} uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
 created_by_user_identity_id uuid,created_by_service_principal_id uuid,
 {fields},CONSTRAINT {physical_name('pk_'+table)} PRIMARY KEY({pk}),
 CONSTRAINT {physical_name('ck_'+table+'__created_actor_one')} CHECK(num_nonnulls(created_by_user_identity_id,created_by_service_principal_id)<=1),
 CONSTRAINT {physical_name('fk_'+table+'__created_user')} FOREIGN KEY(created_by_user_identity_id) REFERENCES iam.user_identities(user_identity_id) ON DELETE RESTRICT,
 CONSTRAINT {physical_name('fk_'+table+'__created_service')} FOREIGN KEY(created_by_service_principal_id) REFERENCES iam.service_principals(service_principal_id) ON DELETE RESTRICT,
 {keys}
);
""")
sql.append("""
ALTER TABLE regulatory.regulatory_packs ADD CONSTRAINT uq_regulatory_packs__id_source_commercial UNIQUE(regulatory_pack_id,source_type);
ALTER TABLE platform.regulatory_pack_commercial_family_links
 ADD CONSTRAINT fk_pack_family_links__root_source FOREIGN KEY(regulatory_pack_id,source_type) REFERENCES regulatory.regulatory_packs(regulatory_pack_id,source_type) ON DELETE RESTRICT,
 ADD CONSTRAINT fk_pack_family_links__family_source FOREIGN KEY(commercial_family_id,source_type) REFERENCES platform.commercial_families(commercial_family_id,source_type) ON DELETE RESTRICT;
ALTER TABLE platform.plan_version_commercial_family_links
 ADD CONSTRAINT fk_plan_version_family_links__plan_version FOREIGN KEY(plan_version_id) REFERENCES platform.plan_versions(plan_version_id) ON DELETE RESTRICT,
 ADD CONSTRAINT fk_plan_version_family_links__family FOREIGN KEY(commercial_family_id) REFERENCES platform.commercial_families(commercial_family_id) ON DELETE RESTRICT;
ALTER TABLE platform.usage_limits ADD COLUMN commercial_family_id uuid;
ALTER TABLE platform.usage_limits DROP CONSTRAINT uq_usage_limits__limit_code;
ALTER TABLE platform.usage_limits
 ADD CONSTRAINT uq_usage_limits__version_code_family_start UNIQUE NULLS NOT DISTINCT(plan_version_id,limit_code,commercial_family_id,effective_from),
 ADD CONSTRAINT fk_usage_limits__family FOREIGN KEY(commercial_family_id) REFERENCES platform.commercial_families(commercial_family_id) ON DELETE RESTRICT,
 ADD CONSTRAINT fk_usage_limits__version_family FOREIGN KEY(plan_version_id,commercial_family_id) REFERENCES platform.plan_version_commercial_family_links(plan_version_id,commercial_family_id) ON DELETE RESTRICT,
 ADD CONSTRAINT ck_usage_limits__finite_nonnegative CHECK(limit_value::text NOT IN ('NaN','Infinity','-Infinity') AND limit_value>=0),
 ADD CONSTRAINT ck_usage_limits__pack_value_unit CHECK(limit_code<>'regulatory_pack_count' OR (unit='pack' AND trunc(limit_value)=limit_value)),
 ADD CONSTRAINT ck_usage_limits__family_code CHECK(commercial_family_id IS NULL OR limit_code='regulatory_pack_count'),
 ADD CONSTRAINT ex_usage_limits__total_no_overlap EXCLUDE USING gist(plan_version_id WITH =,limit_code WITH =,tstzrange(effective_from,effective_to,'[)') WITH &&) WHERE(commercial_family_id IS NULL),
 ADD CONSTRAINT ex_usage_limits__family_no_overlap EXCLUDE USING gist(plan_version_id WITH =,limit_code WITH =,commercial_family_id WITH =,tstzrange(effective_from,effective_to,'[)') WITH &&) WHERE(commercial_family_id IS NOT NULL);
ALTER TABLE platform.subscriptions
 ADD COLUMN previous_subscription_id uuid,
 ADD CONSTRAINT fk_subscriptions__previous FOREIGN KEY(tenant_id,previous_subscription_id) REFERENCES platform.subscriptions(tenant_id,subscription_id) ON DELETE RESTRICT,
 ADD CONSTRAINT ck_subscriptions__previous_not_self CHECK(previous_subscription_id IS NULL OR previous_subscription_id<>subscription_id),
 ADD CONSTRAINT ex_subscriptions__active_no_overlap EXCLUDE USING gist(tenant_id WITH =,tstzrange(starts_at,ends_at,'[)') WITH &&) WHERE(lifecycle_state='active' AND cancelled_at IS NULL);
CREATE UNIQUE INDEX uq_subscriptions__previous_successor ON platform.subscriptions(tenant_id,previous_subscription_id) WHERE previous_subscription_id IS NOT NULL;
ALTER TABLE regulatory.regulatory_pack_versions ADD CONSTRAINT uq_pack_versions__version_root_commercial UNIQUE(regulatory_pack_version_id,regulatory_pack_id);
ALTER TABLE platform.subscription_regulatory_packs
 ADD COLUMN regulatory_pack_id uuid,
 ADD COLUMN previous_subscription_regulatory_pack_id uuid;
-- Mechanical FK-derived root only. No family, quota, chronology or provenance backfill.
UPDATE platform.subscription_regulatory_packs assignment SET regulatory_pack_id=version.regulatory_pack_id
 FROM regulatory.regulatory_pack_versions version WHERE version.regulatory_pack_version_id=assignment.regulatory_pack_version_id;
ALTER TABLE platform.subscription_regulatory_packs
 ALTER COLUMN regulatory_pack_id SET NOT NULL,
 ADD CONSTRAINT fk_subscription_regulatory_packs__version_root FOREIGN KEY(regulatory_pack_version_id,regulatory_pack_id) REFERENCES regulatory.regulatory_pack_versions(regulatory_pack_version_id,regulatory_pack_id) ON DELETE RESTRICT,
 ADD CONSTRAINT fk_subscription_regulatory_packs__previous FOREIGN KEY(tenant_id,previous_subscription_regulatory_pack_id) REFERENCES platform.subscription_regulatory_packs(tenant_id,subscription_regulatory_pack_id) ON DELETE RESTRICT,
 ADD CONSTRAINT ck_subscription_regulatory_packs__previous_not_self CHECK(previous_subscription_regulatory_pack_id IS NULL OR previous_subscription_regulatory_pack_id<>subscription_regulatory_pack_id);
CREATE UNIQUE INDEX uq_subscription_regulatory_packs__previous_successor ON platform.subscription_regulatory_packs(tenant_id,previous_subscription_regulatory_pack_id) WHERE previous_subscription_regulatory_pack_id IS NOT NULL;
CREATE INDEX ix_subscription_regulatory_packs__root_interval ON platform.subscription_regulatory_packs(subscription_id,regulatory_pack_id,effective_from);
CREATE INDEX ix_subscriptions__tenant_history ON platform.subscriptions(tenant_id,starts_at DESC,subscription_id DESC);
CREATE INDEX ix_plan_version_family_links__family ON platform.plan_version_commercial_family_links(commercial_family_id);

CREATE FUNCTION platform.commercial_immutable_row_guard() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN RAISE EXCEPTION 'COMMERCIAL_IMMUTABLE_RETAIN'; END $fn$;
CREATE FUNCTION platform.commercial_version_child_guard() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE state text;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'COMMERCIAL_VERSION_CHILD_IMMUTABLE'; END IF;
 SELECT lifecycle_state INTO state FROM platform.plan_versions WHERE plan_version_id=NEW.plan_version_id FOR UPDATE;
 IF state IS NULL OR state='published' THEN RAISE EXCEPTION 'COMMERCIAL_PUBLISHED_VERSION_FROZEN'; END IF;
 RETURN NEW;
END $fn$;
CREATE TRIGGER commercial_families_immutable BEFORE UPDATE OR DELETE ON platform.commercial_families FOR EACH ROW EXECUTE FUNCTION platform.commercial_immutable_row_guard();
CREATE TRIGGER pack_family_links_immutable BEFORE UPDATE OR DELETE ON platform.regulatory_pack_commercial_family_links FOR EACH ROW EXECUTE FUNCTION platform.commercial_immutable_row_guard();
CREATE TRIGGER plan_family_links_frozen BEFORE INSERT OR UPDATE OR DELETE ON platform.plan_version_commercial_family_links FOR EACH ROW EXECUTE FUNCTION platform.commercial_version_child_guard();
CREATE TRIGGER usage_limits_frozen BEFORE INSERT OR UPDATE OR DELETE ON platform.usage_limits FOR EACH ROW EXECUTE FUNCTION platform.commercial_version_child_guard();
CREATE TRIGGER entitlements_frozen BEFORE INSERT OR UPDATE OR DELETE ON platform.entitlements FOR EACH ROW EXECUTE FUNCTION platform.commercial_version_child_guard();

CREATE FUNCTION platform.commercial_plan_publication_guard() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE family uuid; required_range tstzmultirange; actual_range tstzmultirange; distinct_values bigint;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'COMMERCIAL_VERSION_HISTORY_RETAIN'; END IF;
 IF TG_OP='UPDATE' AND OLD.lifecycle_state='published' AND NEW IS DISTINCT FROM OLD THEN
  RAISE EXCEPTION 'COMMERCIAL_PUBLISHED_VERSION_IMMUTABLE';
 END IF;
 IF NEW.lifecycle_state<>'published' THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN RAISE EXCEPTION 'COMMERCIAL_CREATE_DRAFT_BEFORE_PUBLICATION'; END IF;
 IF OLD.lifecycle_state='published' THEN RETURN NEW; END IF;
 IF NEW.effective_from IS NULL OR NEW.published_at IS NULL THEN RAISE EXCEPTION 'COMMERCIAL_PUBLICATION_INTERVAL_REQUIRED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM platform.plan_version_commercial_family_links WHERE plan_version_id=NEW.plan_version_id) THEN
  RAISE EXCEPTION 'COMMERCIAL_PUBLICATION_FAMILY_REQUIRED';
 END IF;
 required_range:=tstzmultirange(tstzrange(NEW.effective_from,NEW.effective_to,'[)'));
 FOR family IN SELECT NULL::uuid UNION ALL SELECT commercial_family_id FROM platform.plan_version_commercial_family_links WHERE plan_version_id=NEW.plan_version_id LOOP
  SELECT range_agg(tstzrange(effective_from,effective_to,'[)')),count(DISTINCT limit_value)
   INTO actual_range,distinct_values FROM platform.usage_limits WHERE plan_version_id=NEW.plan_version_id
    AND limit_code='regulatory_pack_count' AND commercial_family_id IS NOT DISTINCT FROM family;
  IF actual_range IS DISTINCT FROM required_range OR distinct_values<>1 THEN
   RAISE EXCEPTION 'COMMERCIAL_PUBLICATION_QUOTA_COVERAGE_OR_VALUE_CONFLICT';
  END IF;
 END LOOP;
 RETURN NEW;
END $fn$;
CREATE TRIGGER plan_versions_commercial_publication BEFORE INSERT OR UPDATE OR DELETE ON platform.plan_versions FOR EACH ROW EXECUTE FUNCTION platform.commercial_plan_publication_guard();

CREATE FUNCTION platform.commercial_assignment_root_guard() RETURNS trigger LANGUAGE plpgsql VOLATILE AS $fn$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'COMMERCIAL_ASSIGNMENT_HISTORY_RETAIN'; END IF;
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'COMMERCIAL_ROOT_REQUIRES_READ_COMMITTED'; END IF;
 PERFORM 1 FROM platform.subscriptions WHERE subscription_id=NEW.subscription_id AND tenant_id=NEW.tenant_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'COMMERCIAL_ASSIGNMENT_PARENT_MISMATCH'; END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.subscription_regulatory_pack_id IS DISTINCT FROM OLD.subscription_regulatory_pack_id
   OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id OR NEW.subscription_id IS DISTINCT FROM OLD.subscription_id
   OR NEW.regulatory_pack_id IS DISTINCT FROM OLD.regulatory_pack_id OR NEW.regulatory_pack_version_id IS DISTINCT FROM OLD.regulatory_pack_version_id
   OR NEW.effective_from IS DISTINCT FROM OLD.effective_from
   OR NEW.previous_subscription_regulatory_pack_id IS DISTINCT FROM OLD.previous_subscription_regulatory_pack_id THEN
   RAISE EXCEPTION 'COMMERCIAL_ASSIGNMENT_IDENTITY_HISTORY_IMMUTABLE';
  END IF;
  IF OLD.effective_to IS NOT NULL AND (NEW.effective_to IS NULL OR NEW.effective_to>OLD.effective_to) THEN
   RAISE EXCEPTION 'COMMERCIAL_ASSIGNMENT_NO_IMPLICIT_EXTENSION';
  END IF;
  IF OLD.lifecycle_state='revoked' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'COMMERCIAL_REVOKED_HISTORY_IMMUTABLE'; END IF;
  RETURN NEW; -- Preserved legitimate history; closure only, never range expansion.
 END IF;
 -- New SELECT after parent lock. Existing historical rows are compared, not rewritten.
 IF EXISTS(SELECT 1 FROM platform.subscription_regulatory_packs existing
  WHERE existing.subscription_id=NEW.subscription_id AND existing.regulatory_pack_id=NEW.regulatory_pack_id
   AND tstzrange(existing.effective_from,existing.effective_to,'[)') && tstzrange(NEW.effective_from,NEW.effective_to,'[)')) THEN
  RAISE EXCEPTION 'COMMERCIAL_NEW_ASSIGNMENT_ROOT_OVERLAP';
 END IF;
 RETURN NEW;
END $fn$;
CREATE TRIGGER subscription_pack_root_prospective BEFORE INSERT OR UPDATE OR DELETE ON platform.subscription_regulatory_packs FOR EACH ROW EXECUTE FUNCTION platform.commercial_assignment_root_guard();

CREATE FUNCTION platform.commercial_subscription_lineage_guard() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
 IF EXISTS(SELECT 1 FROM platform.subscriptions child JOIN platform.subscriptions parent
  ON parent.subscription_id=child.previous_subscription_id
  WHERE (child.subscription_id=NEW.subscription_id OR parent.subscription_id=NEW.subscription_id)
   AND (child.tenant_id<>parent.tenant_id OR parent.lifecycle_state<>'ended' OR parent.starts_at>=child.starts_at
    OR parent.ends_at IS DISTINCT FROM child.starts_at)) THEN
  RAISE EXCEPTION 'COMMERCIAL_SUBSCRIPTION_LINEAGE_INVALID';
 END IF;
 RETURN NULL;
END $fn$;
CREATE CONSTRAINT TRIGGER subscription_lineage_consistent AFTER INSERT OR UPDATE ON platform.subscriptions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION platform.commercial_subscription_lineage_guard();

CREATE FUNCTION platform.commercial_pack_lineage_guard() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
 IF EXISTS(SELECT 1 FROM platform.subscription_regulatory_packs child
  JOIN platform.subscription_regulatory_packs parent ON parent.subscription_regulatory_pack_id=child.previous_subscription_regulatory_pack_id
  JOIN platform.subscriptions child_subscription ON child_subscription.subscription_id=child.subscription_id
  WHERE (child.subscription_regulatory_pack_id=NEW.subscription_regulatory_pack_id OR parent.subscription_regulatory_pack_id=NEW.subscription_regulatory_pack_id)
   AND (child.tenant_id<>parent.tenant_id OR child.regulatory_pack_id<>parent.regulatory_pack_id
    OR child.regulatory_pack_version_id<>parent.regulatory_pack_version_id OR parent.lifecycle_state<>'revoked'
    OR parent.effective_to IS DISTINCT FROM child.effective_from OR parent.effective_from>=child.effective_from
    OR child_subscription.previous_subscription_id IS DISTINCT FROM parent.subscription_id
    OR child.effective_from IS DISTINCT FROM child_subscription.starts_at
    OR (child_subscription.ends_at IS NOT NULL AND (child.effective_to IS NULL OR child.effective_to>child_subscription.ends_at)))) THEN
  RAISE EXCEPTION 'COMMERCIAL_PACK_TRANSFER_LINEAGE_INVALID';
 END IF;
 RETURN NULL;
END $fn$;
CREATE CONSTRAINT TRIGGER pack_transfer_lineage_consistent AFTER INSERT OR UPDATE ON platform.subscription_regulatory_packs DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION platform.commercial_pack_lineage_guard();
-- No catalog data/limits/permissions/grants/actors inserted. Publication has its own gate.
""")
write("20261013000100_commercial_contract_reconciliation.sql", "\n".join(sql).replace("END $", "END; $"))
candidate_manifest = {**source_manifest, "migrations": source_manifest["migrations"] + [{
    "id": "20261013000100", "filename": "20261013000100_commercial_contract_reconciliation.sql",
    "sha256": digest(OUT / "20261013000100_commercial_contract_reconciliation.sql"), "transactional": True}]}
dump("09_MIGRATION_MANIFEST_CANDIDATE.json", candidate_manifest)
write("09_MIGRATION_EXECUTION_CONTRACT.md", """
# Migración propuesta y runner

STATUS=DRAFT_NOT_EXECUTED. El manifest09 conserva todos los registros/hashes previos y añade20261013000100. No sustituye database/migrations/manifest.json. Primera validación PostgreSQL sólo tras aprobación exacta y gates.
La base de entrada exacta es el manifest activo completo, incluidos candidatos locales31/32 cuando consten en ese manifest. QA30 no satisface automáticamente esa entrada: reconciliar/adoptar dependencias aprobadas bajo mandatos propios antes del comercial. No actualizar ledger a mano.
Para ensayo aislado aprobado, preparar directorio efímero con bytes de migraciones originales y SQL candidato; usar overrides existentes TCDX_MIGRATION_TEST_MODE/TCDX_MIGRATION_DIRECTORY/TCDX_MIGRATION_MANIFEST del runner revisado. No crear runner paralelo. Aplicación envuelta por BEGIN/COMMIT del runner; advisorylock/checksums/ledger existentes; segunda ejecución se omite sólo tras verificar checksum aplicado. No IF NOT EXISTS que esconda drift estructural.
DDL contiene preflight exacto de target/sourceledger/constraint/values; root backfill es join mecánico de FK. DDL no hace seed comercial ni IAM. Las cantidades y nuevos PlanVersion se publican por ceremonia independiente, no por esta migración. Modelo03 anterior declara no triggers en su fase de diseño: el delta02 y este SQL proponen explícitamente cambiar esa estrategia para estos invariantes; requiere firma del DataModel/Architecture, no se presenta como derivación ya aprobada.
No DOWN destructivo. Recuperación tras COMMIT según04. Antes de publicar manifest activo se exige expected-schema/modelo físico/traceability actualizados como artefactos exactos derivados y revisados; no se aprueban hoy versiones futuras de esos archivos. El candidato actual puede aprobarse para revisión/diseño; su ejecución queda bajo gates y taskpacket posterior. Pruebas nuevas: esquema, negativeFK/unique/check/exclusion/roottrigger/deferredlineage, fresh+upgrade32→33, reapplychecksum/noDML, rollback error/restore, actor/source constraints intactos, historia solapada legítima preservada. Nunca SQL simulado como evidencia PostgreSQL.
""")

temporal = [
    ("V1", "active vigente; endsNULL", "publicada y vigente [<=t,NULL)", "packs efectivos con expiryNULL", "ALLOW si capacidades/familias/cuotas/pack gates completos; nuevaendsNULL; packexpiryNULL"),
    ("V2", "active vigente; endsE>t", "contiene [t,E)", "pack expiryP<=E", "ALLOW; nuevaendsE; packexpiryP; viejaends=t"),
    ("V3", "active vigente; endsE>t", "effective_to D<E", "cualquier pack", "422INVARIANT; preservar duración imposible; rollback"),
    ("V4", "active vigente; endsNULL", "effective_to finito", "cualquier pack", "422INVARIANT; no convertir contrato abierto en finito"),
    ("V5", "active vigente; endsE>t", "contiene [t,E)", "expiryNULL o P>E", "422INVARIANT; no recortar pack ni extender Subscription"),
    ("V6", "ended/cancelada/no vigente", "válido", "cualquiera", "409TRANSITION_DENIED; excepción sólo replay completado reautorizado"),
    ("V7", "active t<=starts", "válido", "asignación t<=effective_from que debe cerrarse", "409RESOURCE retryabletrue; no t+epsilon inventado"),
    ("V8", "active vigente", "mismo PlanVersion", "cualquiera", "409RESOURCE; no mutación"),
    ("V9", "active vigente", "draft/expirada/futura/incompleta", "cualquiera", "422INVARIANT; no adopción/contratación"),
    ("V10", "active vigente", "válido", "assignment active future", "409RESOURCE; no cancelar/copiar futuro"),
    ("V11", "active vigente", "válido", "vencido/revocado", "NO_TRANSFER; historia permanece; cuotas cuentan sólo efectivos"),
    ("V12", "active vigente", "válido", "dos versiones efectivas misma raíz", "409RESOURCE; no escoger ganadora; resolución competente antes de adopción"),
    ("V13", "active vigente", "válido", "cuota total/familiar excedida", "409USAGE_EXCEEDED; rollback"),
    ("V14", "active vigente", "válido; familia no admitida", "pack efectivo incompatible", "422INVARIANT; no traslado parcial"),
    ("V15", "active vigente", "válido", "fin de vigencia oficial/licencia no permite intervalo que se preserva", "422INVARIANT; no herencia de edición ni obligación legal inferida"),
    ("V16", "active vigente", "contiene vigencia nueva", "sin packs", "ALLOW sólo si límites total+familias completos; cero packs no prueba unlimited"),
]
with (OUT / "10_TEMPORAL_MATRIX.csv").open("w", newline="") as handle:
    writer = csv.writer(handle)
    writer.writerow(["id", "origin", "destination", "packs", "expected_result"])
    writer.writerows(temporal)

commercial_cases = [
    ("INITIAL_CREATE", "Alta inicial válida y rechazo segunda alta; HTTP202 intacto", "C-03,C-06", "PG/API", "202/409; unaSubscription"),
    ("PLAN_VALIDITY", "Destino draft/futuro/expirado y Plan no publicado", "C-02,C-03,C-06", "PG/API", "422; ninguna mutación"),
    ("CHANGE_VERSION", "Cambio entre versiones válidas con lineage", "C-05,C-06,C-07", "PG/API", "200completed; viejaended/nuevaactive"),
    ("CHANGE_FAMILY", "Familias autorizadas compatibles desde bindings exactos", "C-01,C-02,C-03,C-07", "PG/API", "200; mismas PackVersion exactas"),
    ("TOTAL_QUOTA", "Exceso total y frontera cero/uno/N en fixture segregado", "C-03,C-07", "PG/API", "409USAGE_EXCEEDED; rollback"),
    ("FAMILY_QUOTA", "Exceso familiar independiente de total", "C-03,C-07", "PG/API", "409USAGE_EXCEEDED; rollback"),
    ("INCOMPLETE", "Total/familia/gap/unit/foreign family ausentes o incoherentes", "C-03,C-07", "PG/API", "422; no unlimited/no defaults"),
    ("ENDED_HISTORY", "Cierre activeended preserva códigos/IDs/fecha y reads", "C-05,C-07,C-09", "PG/API", "historia completa; sólo uno efectivo"),
    ("AUDIT_ROLLBACK", "Fallo audit padre/hijo/privilegeduse antescommit", "C-07,C-10", "PG", "rollback de todas las filas/claim"),
    ("OUTBOX_ROLLBACK", "Fallo outbox/completeIdempotency/deferred constraint", "C-07,C-08,C-10", "PG", "rollback completo"),
    ("POSTCOMMIT_DELIVERY", "Fallo worker despuéscommit y reintento", "C-07,C-10", "PG/worker", "venta persiste; consumidor idempotente"),
    ("ACTIVE_EXCLUSION", "Subs activas contradictorias y DML directo solapado", "C-05,C-07", "PG", "409/constraint; sin borrado"),
    ("CURRENT_READ", "Detalle nuevo/vigente y GET ETag actual", "C-08,C-09", "PG/API", "200 projection; CAS fresh"),
    ("HISTORY_READ", "Historia/paginación estable/no leaking por tenant", "C-05,C-09", "PG/API", "exactospredecessor/successor; cursorbound"),
    ("AUDIT_COMPLETENESS", "Actor/reason/oldnewPV/cut/limits/hash/expiry exactos", "C-01,C-07,C-10", "PG", "audit/outbox reconstruibles sinPII"),
    ("PLATFORM_ADMIN", "HumanoPlatformAdmin publicado y policy vigente", "C-06", "PG/API", "200"),
    ("TENANT_ADMIN_DENY", "TenantAdmin aun con stringupdate/grant tenant", "C-06", "PG/API", "403; cero efectos"),
    ("SUPPORT_DENY", "PlatformSupport", "C-06", "PG/API", "403"),
    ("SERVICE_DENY", "ServicePrincipal válido", "C-06", "PG/API", "403"),
    ("IMPERSONATION_DENY", "PlatformAdmin impersonando", "C-06", "PG/API", "403"),
    ("CUSTOM_ROLE_DENY", "RolcustomPlatform conPermission equivalente", "C-06", "PG/API", "403"),
    ("GENERIC_UPDATE_DENY", "PATCH/PUT/cancel/renew/status/revoke y internalchild directo", "C-06,C-07", "API", "ruta no publicada404; policyDENY; cero efectos"),
    ("AUTH_REFRESH", "Asignación/identity/Permission revocada durante lock/replay", "C-06,C-08", "PG/API", "DENY actual; no efecto/materialaudit"),
    ("TENANT_ISOLATION", "FKchildA→parentB, Tenant header/body/contexto ajeno", "C-05,C-06,C-09", "PG/API", "FK/400/403/404según contexto; Admin global legítimo no se confunde con fuga"),
    ("CAS", "IfMatch stale/weak/bodyCAS/RetentionPolicyETag", "C-06,C-08", "PG/API", "409CONCURRENCY o400shape"),
    ("CONCURRENT_CHANGE", "Dos cambios mismo origen y CAS", "C-05,C-07,C-08", "PGdosconexiones", "unCOMMIT; otro409; sin activosdobles"),
    ("DEADLOCK", "Deadlock/timeout controlado y rollback/retry explícito", "C-07,C-08", "PGdosconexiones", "sinretry infinito;409CONCURRENCY"),
    ("IDEMPOTENT_REPLAY", "Replay despuésended y otro cambio posterior", "C-08", "PG/API", "200body original; sinETag; sin efectosduplicados"),
    ("IDEMPOTENT_CONFLICT", "Mismakey actor/operation conpayload/CAS diferente", "C-08", "PG/API", "409IDEMPOTENCY; sin mutación"),
    ("IDEMPOTENT_INFLIGHT", "Claim concurrente sin safe result", "C-08", "PGdosconexiones/API", "409RESOURCE retryabletrue"),
    ("CORRUPT_RESULT", "Corrupt profile/hash/ref y dependencia ausente", "C-08", "PG/API", "503; no respuesta reconstruida"),
    ("ROOT_HISTORY", "Dos versiones históricas legítimas y fechas preservadas", "C-05,C-11", "PGupgrade", "migraciónR-P preserva todas; historia consultable"),
    ("ROOT_NEW_INSERT", "Nuevo intervalo solapado misma raíz y versión distinta", "C-05,C-11", "PG", "triggerDENY; oldversionexclusionintacta"),
    ("ROOT_CONCURRENCY", "Dos INSERT directos en conexiones concurrentes; mismo statementmultirow", "C-05,C-11", "PGdosconexiones", "unwinner/sinwrites skew; aislamiento no revisadoDENY"),
    ("LINEAGE", "CrossTenant/ciclo/twoSuccessors/parentnotended/cut distinto", "C-05,C-07", "PG", "FK/UQ/deferredconstraintDENY"),
    ("TEMPORAL", "Toda matrizV1..V16; microsegundos y endsNULL/finito", "C-05,C-06,C-07", "PG/API", "resultadoexacto10_TEMPORAL_MATRIX.csv"),
    ("LIMIT_FINITE", "NaN/Infinity/negativo/fracción/unidad yNULLfamilia", "C-03,C-11", "PG", "CHECK/FK/UQ/GiSTDENYsegúncaso"),
    ("PUBLISH_COVERAGE", "Total+familias full range; gaps/openends; valuechange", "C-02,C-03,C-11", "PG", "guard sólo permite cobertura exacta/cuota constante"),
    ("PUBLISHED_IMMUTABLE", "INSERTlate/UPDATE/DELETElimits,links,entitlements,PV/familia", "C-01,C-02,C-03,C-11", "PG", "DENY; cuotas sólo nuevaPV"),
    ("CATALOG_AUTHORITY", "Publicaciónindependiente conupdate vs permiso publish", "C-01,C-06,C-10", "PG/APIinterno", "updateDENY; actorreal+publish+manifestexacto"),
    ("MIGRATION", "Fresh/upgrade/reapply/drift/preflightinvalid/rollbackrestore", "C-11", "PG/runner", "ledger/checksum/historiaexactos; sinIAMseed"),
    ("OPENAPI", "Request/responseClosed,header/status/error/serialization", "C-06,C-08,C-09", "contract/API", "schemas exactos; alta202intacta"),
    ("FRONTEND", "FormularioAdmin+freshCAS+keyretry+refetch+noTenantflow", "C-06,C-08,C-09", "browserE2E", "visualbaseline/accesibilidad; backendautoridad"),
    ("REGRESSION", "Alta/activation/revoke/currentpacks/administrativeprojection", "C-03,C-05,C-06,C-09", "PG/API/browser", "suitesafectadasPASS; no evidenciahistórica para deltanuevo"),
    ("SECRET_RECTOR", "Secret scan,integridadrectora y dominiocanónico", "C-12", "document/security", "sinsecrets; hashes intactos; canonicalURLúnica"),
    ("QA_WINDOW", "Barrera/drain/installedruntime/adopción/restore/GO", "C-04,C-11,C-12", "QAoperacional", "evidencia de cada T0..T10; autorización separada"),
]
with (OUT / "11_SCENARIO_DEPENDENCY_EVIDENCE_GATE_MATRIX.csv").open("w", newline="") as handle:
    writer = csv.writer(handle)
    writer.writerow(["scenario", "contract", "dependencies", "evidence_required", "gate", "approver", "state", "expected_result"])
    for code, case, dependencies, evidence, expected in commercial_cases:
        writer.writerow(["COM-"+code, case, dependencies, evidence+":logs+IDs+hash+positive/negative", "COMMERCIAL_SLICE_LOCAL_OR_RUNTIME" if code!="QA_WINDOW" else "QA_OPERATIONAL_GO", "Architecture/Backend/Security/QA;DataModel for PG;humanUI for frontend", "NOT_EXECUTED_PENDING_EXACT_APPROVAL", expected])
    rbac_table = (BASE / "20_P_RBAC_PUBLICATION_DECISION_PACKET.md").read_text()
    for n in range(1,19):
        case = re.search(r"\| RBAC-C%02d \| ([^\n]+)" % n, rbac_table).group(1).strip().rstrip("|").strip()
        deps = "H-03;H-01" if n==12 else ("H-03;H-02" if n==16 else "H-03;published pertinent contracts/grants")
        writer.writerow(["RBAC-C%02d" % n, case, deps, "authenticated external evidence; existing local hashes reused within scope", "RBAC_EXTERNAL_ACCEPTANCE", "Security/QA/Domain", "EXTERNAL_ACCEPTANCE_PENDING", "exact criterion; independent cases may run without H-01"])
    cfg_table = (BASE / "28_CONFIG_CFGD_CONDITIONAL_DECISION_AND_PHYSICAL_RECONCILIATION.md").read_text()
    cfg_dependencies = {1:"H-04,H-05,H-06",2:"H-04,H-05,H-06",3:"published history contract;H-10",4:"H-06",5:"published exact read contract;H-10",6:"H-07,H-08",7:"H-07,H-08;authorized recovery plan",8:"H-09"}
    for n in range(1,9):
        case = re.search(r"\| CFG-T%02d \| ([^|]+)" % n,cfg_table).group(1).strip()
        writer.writerow(["CFG-T%02d" % n,case,cfg_dependencies[n],"external runtime evidence; reuse prior local hashes", "CFG_EXTERNAL_ACCEPTANCE", "QA/Security/Methodology/Domain", "EXTERNAL_ACCEPTANCE_PENDING", "No global H-01 dependency; add only if a case actually consumes legal binding"])
    voc_table = (BASE / "23_P_VOC_DECISION_AND_PROVENANCE.md").read_text()
    for n in range(1,13):
        case = re.search(r"\| T-VOC%02d \| ([^\n]+)" % n,voc_table).group(1).strip().rstrip("|").strip()
        writer.writerow(["T-VOC%02d" % n,case,"H-11,H-12;exact vocabulary occurrence manifest", "external occurrence evidence+compatibility inventory", "VOC_EXTERNAL_ACCEPTANCE", "QA/Security/Domain", "EXTERNAL_ACCEPTANCE_PENDING", "Exact original criterion; no new engine inferred"])

# All thirty dispositions, with proposed status and exact prerequisite classes.
C = [
 ("C-01", "Catálogo único CommercialFamily/platform, append-only; ceremonia HUMAN_INTERACTIVE PlatformAdmin separada con platform.commercial_catalog.publish y manifest exacto; audit por familia/PV", "07/08/22/30/33/42/45/49", "01,02,03,08,17,18,DDL", "C-02,C-10,C-11,C-12", "publicación sin actor/grant/fuente", "CommercialFamily/3tablas/catálogo/grant propuestos", "publicación íntegra auditada y no autoridad paralela"),
 ("C-02", "Raíz→familia única; PV→familias N:M; mappingISO/LEGAL manifestado; nuevas condiciones sólo nuevasPV; nuevas familias no heredan contratos", "23/30/33/37/41/42", "01,02,DDL", "C-01,C-03,C-11", "reclasificación retroactiva", "mapping nominal y relaciones propuestas", "FK/source coherence/inmutabilidad/publicación"),
 ("C-03", "UsageLimit familiar y total; finite>=0; packentero; UQ NULLSNOTDISTINCT/exclusions/fullcoverage; cuota constante porPV; cambio material nuevaPV; ausencia bloquea", "23/29/30/42;physical01", "02,03,DDL", "C-02,C-11", "gaps/NaN/cuota inferida", "modelo/política exacta; cantidades excluidas", "DBnegativos/publish guard/cuotas total/familia"),
 ("C-04", "Ventana anunciada T0..T10; instalación antes de adopción; guard público afectado cerrado; mismoendpointcanónico; derechos conservados y restore coordinado", "23/26/42/43/46", "04,05,19", "C-02,C-03,C-05,C-07,C-11,C-12", "disponibilidad/recuperación/active overlaps", "estrategia ventana; operación excluida", "adopción total/GO y compatibilidadreal"),
 ("C-05", "RootFK+R-Pprospectivo portrigger; exclusiónporversiónintacta; lineageFKmismotenant/uniques/deferredcut; historiaNULLnoinferida", "21/23/29/30;approvedpackphysical", "01,02,05,DDL", "C-07,C-11", "historia legítima rechazada/write skew", "R-P;R-A sóloalternativa no implementable sin nuevohash", "PGconcurrencia/DMLdirecto/historiapreservada/inventario"),
 ("C-06", "POSTchange-plan específico; PlatformAdminhumano; requestclosed+código+motivo; SubscriptionIfMatch; X-Correlation-Id; DENY genéricos/tenant/support/service/impersonation", "09/21/22/25/42", "03,07,08", "C-03,C-05,C-07,C-08", "ampliación permiso/IDOR", "update/read exclusivos propuestos", "matrizRBACnegativa+contratoexacto"),
 ("C-07", "TXREADCOMMITTED única; locksordenados; corte despuéslocks; oldended/newactive; nuevaendsoriginal; pack expiryoriginal; rollbackcompleto; sinexternalTX", "21/23/25/34/42", "02,03,08,10", "C-03,C-05,C-06,C-10", "fechas implícitas/transacciónparcial", "temporalidad/aristas/mapping propuestos", "PGatomicidad/CAS/concurrencia/audit/outbox"),
 ("C-08", "HTTP200completed trasCOMMIT; snapshotbody exacto/replay reautorizado antesCAS; noETagcommand/replay; hash/fingerprintprecision congelados; errores06 exactos", "25;exec06/07/12", "03,07,08", "C-06,C-07,C-09,C-10", "replay falla pororigenended/CAShistorical", "HTTP/replay propuestos", "replaytrascambioposterior/noduplicate/corruptionnegative"),
 ("C-09", "Detalle/history/transfers PlatformAdminread; schemascerrados; page25/100; cursorbound; GETdetailETagactual; historia incomplete explícita; sin autoridad desde lectura", "22/23/25/26", "03,07", "C-05,C-06,C-08", "fuga/cursor/versiónhistórica", "treslecturaspropuestas", "APIactual/historia/tenantisolation/paginación"),
 ("C-10", "MappingoperationId/commanddot exacto; padrePlatformtenantNULL, hijosTenantreal; beforeoriginalend/quotaIDs/hash/actor/reason; audits/outboxTX e idempotentes", "21/23/25/26", "03,08,12", "C-01,C-07,C-08", "provenance reconstruida/secretos", "eventschemas/materialaudit propuestos", "prueba reconstrucción y rollbackaudit/outbox"),
 ("C-11", "DDLforwardonly candidato fuera runner; baseledgerexacto; rootbackfill porFK; lineageNULL; no cuotas/IAM; preflight/restore; ningúnhistoricalSQL modificado", "23/26/43/45/46", "02,04,05,09,DDL", "C-01..C-05;H-07..H-09 encoordinación", "ledgerdrift/pérdidadatos", "DDLmodelo candidato; gatesantesaplicar", "fresh/upgrade/reapply/checksum/restore reales"),
 ("C-12", "Diseño/artefactos presentados≠publicaciónrectora≠implementación≠operación≠aceptación; Hpendientes impiden cierreintegral; no siguiente fase", "28/43/45/46/49", "01,06,11,13,19,20", "Todas G/C/H", "firma utilizada como operación", "aprobaciónexacta y gates futuros", "cadenaautoridad+48cláusulas+humanclose"),
]
G = [
 ("G-01","C-01,C-02,C-11","catálogo/modelo/publicación","07/08/30/33/42"),
 ("G-02","C-03,C-04","límites/derechos/adopción","23/29/42/43"),
 ("G-03","C-05,C-07","integridad root/lineage/temporalidad","21/23/30"),
 ("G-04","C-06,C-08,C-09,C-10","API/seguridad/read/audit/replay","21/22/25/26"),
 ("G-05","H-01,H-04,H-05,H-06","legal/metodología, sin suficienciaficticia","17/19/23/29/38/49"),
 ("G-06","H-02,H-03,H-07,H-08,H-09,H-10,H-11,H-12,C-12","operación/aceptación/gates","26/28/43/45/46/49"),
]
H = [
 ("H-01","C-04W","23§8/24/29/49","G-05;C-12;RBAC-C12","fuentelegal/bindingtipado","DECISION_AND_EXTERNAL_SOURCE_PENDING","legalaplicability/retenciónderechos","PrivacyLegal/Architecture/DataModel/Security/Evidence","DecisionRecord/fuentes/binding/guards y aceptación"),
 ("H-02","C-07","22/25/26/45/49","G-06;C-12;RBAC-C16","planactorreal/44grants/preflight","OPERATIONAL_AUTHORIZATION_PENDING","propagaciónIAM/grantsincorrectos","Architecture/Backend/Security/DBA","adopciónexacta auditada/restore/aceptación"),
 ("H-03","C-08","22/26/28/45/49","G-06;C-12;H-01 sóloRBAC-C12;H-02 paraC16","aceptaciónRBAC-C01..18externa","EXTERNAL_EVIDENCE_PENDING","fixturespresentadoscomoruntime","Security/QA/Domain","evidenciaautenticada porcaso/aceptación"),
 ("H-04","CFG-D-COMPLIANCE-V1","17§3.1/19§2/38/49","G-05;C-12;H-06/H-10","expedientesuficienciaCompliancev1","DECISION_AND_EXTERNAL_SOURCE_PENDING","overrides/inputsimplícitos","Methodology/Compliance/Configuration","suficienciaporversión ypublicaciónexacta"),
 ("H-05","CFG-D-CONTROLS-V1","17§3.2–3.4/19§3/38/49","G-05;C-12;H-06/H-10","expedientesuficienciaControlsv1","DECISION_AND_EXTERNAL_SOURCE_PENDING","recencia/evidenciaficticias","Methodology/Controls/Assurance","suficienciaporversión ypublicaciónexacta"),
 ("H-06","CFG-D-PUBLICATION","23/29/49","G-05;C-12;H-04/H-05→publicación→H-10","representation/modo/version/hash","DECISION_AND_EXTERNAL_SOURCE_PENDING","noneinferido/v1mutada","Architecture/DataModel/Methodology/Backend/Security","bindingexacto/sucesorasmateriales/manifest"),
 ("H-07","CFG-UQ1","29/30/23;physical01","G-06;C-12;CFG-T06/T07","UQECyaaprobada;adopciónreal","OPERATIONAL_AUTHORIZATION_PENDING","dedupehistoria","DataModel/Architecture/Backend/DBA","preflight/migración/IDsFKintactos/aceptación"),
 ("H-08","CFG-UQ2","29/30/23;physical01","G-06;C-12;CFG-T06/T07","UQlayersyaaprobada;adopciónreal","OPERATIONAL_AUTHORIZATION_PENDING","ordinalreordenado","DataModel/Architecture/Backend/DBA","preflight/migración/layersintactas/aceptación"),
 ("H-09","CFG-DEFAULT","29/45;physical01","G-06;C-12;CFG-T08","exactamentedefaulttipado;datoinválidobloquea","OPERATIONAL_AUTHORIZATION_PENDING","defaultfabricado","DataModel/Configuration/Architecture/DBA","mapatipos/preflight/adopción/aceptación"),
 ("H-10","CFG-QA","26/28/38/45/49","G-06;C-12;dependencias11 porCFG-T;NOH-01global","CFG-T01..08externalporcaso","EXTERNAL_EVIDENCE_PENDING","bloqueouniversal/PASSinferido","QA/Security/Methodology/Domain","aceptaciónporcaso+metodología/restriccionespertinentes"),
 ("H-11","VOC-C04","23/30/26/45/49","G-06;C-12;H-12","inventariorealpor26ocurrencias","EXTERNAL_INVENTORY_PENDING","PII/coerciónhistórica","Architecture/Backend/Security/DataModel/Domain/QA","compatibilidaddictaminada sinbackfillprovenance"),
 ("H-12","VOC-QA","23/30/26/28/45/49","G-06;C-12;H-11","T-VOC01..12externosporocurrencia","EXTERNAL_EVIDENCE_PENDING","catálogo≠motor terminado","QA/Security/Domain","evidenciareal/negative/compatibilidad/aceptación"),
]
rows = []
for code, deps, decision, authority in G:
    rows.append({"id":code,"legacy_id":"NOT_APPLICABLE","authority":authority,"proposed_status":"GROUP_RECONCILED_PENDING_APPROVAL",
        "decision":decision,"canonical_model":"Exact child C/H contracts; no additional entity","physical_model":"02 where applicable; H source unchanged",
        "executable_contract":"03/07/08; inherited exact receipts for H","dependencies":deps,"artifacts":"01..13 + linked source manifest",
        "tests":"11 exact scenarios for members","risk":"union of explicitly listed member risks","evidence_required":"member positive/negative/runtime evidence",
        "human_authority":"Functions of all grouped members under45/49","publication_condition":"exact signed artifacts and superior delta published",
        "operation_condition":"member operational mandates; no implicit QA/IAM","acceptance_condition":"all member conditions; G05/G06 not closed by blocking disposition"})
for code, decision, authority, artifacts, deps, risk, human, close in C:
    rows.append({"id":code,"legacy_id":"NOT_APPLICABLE","authority":authority,"proposed_status":"CONTRACT_PROPOSED_READY_FOR_REVIEW",
        "decision":decision,"canonical_model":"01 exact delta","physical_model":"02 and proposed SQL" if code in ["C-01","C-02","C-03","C-04","C-05","C-11"] else "NOT_APPLICABLE_NEW_TABLE: consumes the approved C-05 structure; transport/behavior defined03/07/08",
        "executable_contract":"03/07/08/12 exact candidate","dependencies":deps,"artifacts":artifacts,"tests":"11 COM scenarios for " + code,
        "risk":risk,"evidence_required":"positive/negative PG/API/browser/runtime as listed11","human_authority":"Product/Architecture/DataModel/Backend/Security/QA: "+human,
        "publication_condition":"exact hashes approved; superior and executable deltas published","operation_condition":"local implementation mandate/gates; sharedQA authorization separate",
        "acceptance_condition":close})
for code, legacy, authority, deps, decision, status, risk, human, close in H:
    rows.append({"id":code,"legacy_id":legacy,"authority":authority,"proposed_status":status,"decision":decision,
        "canonical_model":"Preserve existing canonical contracts; H01/H06 representation still source-dependent",
        "physical_model":"Existing signed candidate31 for H07..09; no speculative legal/methodology schema",
        "executable_contract":"Inherited receipts+ledger exact sources;06requirements;11scenarios",
        "dependencies":deps,"artifacts":"06,11 and inherited source hashes","tests":"11 RBAC/CFG/VOC exact criterion subsets",
        "risk":risk,"evidence_required":"competent source/real inventory/operational or external evidence as status declares",
        "human_authority":human,"publication_condition":"exact artifacts/evidence reviewed; no signaway of missing facts",
        "operation_condition":"separate authorized real actor/QA/DBA plan","acceptance_condition":close})
assert len(rows)==30 and len({r["id"] for r in rows})==30
with (OUT / "14_THIRTY_DISPOSITION_TRACEABILITY.csv").open("w", newline="") as handle:
    writer=csv.DictWriter(handle,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
dump("14_THIRTY_DISPOSITION_TRACEABILITY.json", {"package_id":PACKAGE_ID,"status":"PROPOSED_NOT_APPROVED","dispositions":rows})

evaluation = obj({"usage_limit_id":uuid,"commercial_family_id":nullable(uuid),"limit_value":{"type":"string","pattern":"^(0|[1-9][0-9]*)$"},
    "evaluated_root_count":{"type":"integer","minimum":0}})
parent_before = obj({"subscription":ref("SubscriptionDetailProjection"),"scheduled_ends_at":nullable(instant)})
parent_after = obj({"previous_subscription_id":uuid,"current_subscription_id":uuid,"old_plan_version_id":uuid,"new_plan_version_id":uuid,
    "tenant_id":uuid,"effective_at":instant,"preserved_ends_at":nullable(instant),"reason":{"type":"string","minLength":1,"maxLength":2000},
    "evaluated_configuration_sha256":{"type":"string","pattern":"^[0-9a-f]{64}$"},"evaluated_limits":{"type":"array","items":evaluation},
    "transfer_count":{"type":"integer","minimum":0},"operation_id":{"type":"string","const":"subscriptionChangePlan"}})
child_before = obj({"assignment_id":uuid,"subscription_id":uuid,"regulatory_pack_id":uuid,"regulatory_pack_version_id":uuid,
    "lifecycle_state":{"type":"string","const":"active"},"effective_from":instant,"original_effective_to":nullable(instant),"row_version":decimal})
child_after = obj({"previous_assignment_id":uuid,"current_assignment_id":uuid,"previous_subscription_id":uuid,"current_subscription_id":uuid,
    "regulatory_pack_id":uuid,"regulatory_pack_version_id":uuid,"effective_at":instant,"preserved_effective_to":nullable(instant),
    "parent_command":{"type":"string","const":"subscription.change_plan"}})
event_payload = obj({"previous_subscription_id":uuid,"current_subscription_id":uuid,"tenant_id":uuid,
    "old_plan_version_id":uuid,"new_plan_version_id":uuid,"effective_at":instant,"transfer_count":{"type":"integer","minimum":0}})
dump("12_AUDIT_EVENT_PAYLOAD_SCHEMAS.json", {"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"urn:tcdx:step6a3:commercial:audit:20261013:02",
    "$defs":{**schemas,"ParentAuditBefore":parent_before,"ParentAuditAfter":parent_after,"ChildAuditBefore":child_before,"ChildAuditAfter":child_after,"PlanChangedEventPayload":event_payload},
    "description":"Draft payload schemas only; existing Audit/Outbox envelopes retained with exact ownership binding08. Publication manifests carry rows/hashes; parent holds per-dimension evaluations, children hold transfer pairs, no unbounded pack-pair blob."})
# Rewrite reusable component references for a standalone JSON Schema namespace.
payload_path=OUT/"12_AUDIT_EVENT_PAYLOAD_SCHEMAS.json"
payload_path.write_text(payload_path.read_text().replace('"$ref": "#/components/schemas/', '"$ref": "#/$defs/'))

write("13_IMPLEMENTATION_RELEASE_TASK_PACKET.md", """
# Task packet técnico propuesto y preparación de release

TASK_ID=STEP6A3_COMMERCIAL_RECONCILIATION_20261013_02.
MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.8_2026-10-09.
CODEX_VARIATION_BUDGET=ZERO. DESIGN_PREPARATION=AUTHORIZED_BY_CURRENT_MANDATE.
IMPLEMENTATION=BLOCKED_PENDING_EXACT_HUMAN_APPROVAL_AND_PUBLICATION. QA/DEPLOY/IAM=NOT_AUTHORIZED.

## Alcance cerrado después de aprobación/publicación/gates

Reusable: apps/backend/src/security/platform-iam-service.ts subscriptionCreate y tenant lock; platform-authority.ts resolución Platform; persistence/foundation-records.ts claim/complete/audit/outbox; administrative-read.ts catalogue/tenant projections; packages/contracts OpenAPI/generator; regulatory pack services exact version; apps/frontend/src/core-grc.tsx Asignar plan; frontend ApiClient y componentes visuales. Reutilizar por contrato, no copiar un helper incompatible: alta replay actual reconstruye proyección, por ello NO usar ese replay para change-plan.
Derivar artefactos activos exactos: catálogo nominal/canónico/lógico/modelo físico/expected-schema, executable02/03/04/05/07/08/09/18, typed contracts y registry. Fuentes bytes aquí se presentan como candidatos; publicación superior competente precede código. Baseline activa inmutable; sucesora/enmienda material sólo con su propia manifestación exacta y autoridad.

Backend: commercial domain validator/catalog publisher, Subscription change application command, typed repository, read query projection, registry mapping, authoritative PlatformObjectPolicy y errores; HTTProute Fastify específico; modificaciones necesarias del predicado canónico en alta/packactivate/currentpackreads/planVersionSelectableList. Alta conserva permiso/body/envelope/HTTP202 y rechazo segunda alta. Runtime único aplica publicación/completitud/limits en todos consumidores afectados después de adopción; no OLD+NEW fallback.
Frontend: preservar alta inicial; cambio sólo PlatformAdmin con fresh read/CAS, key estable, motivo/código/nuevoPV, resultado/replay/refetch; historial/transfers paginados. No redesign, tenantselfservice, cosméticos o librería nueva. Leer manifest/contratos visuales vigentes; ejecutar regresión visual/keyboard/narrow y revisión humana sobre QA. Versión pendientev1.2 no se autoactiva.
Pruebas dirigidas: escenarios11+temporal10; backend unit/schema/contract, PostgreSQL aislado fresco y upgrade, faults/concurrency/rollback; browser E2E y suites afectadas; typecheck/lint/build/secrets; rector. Nuevos fixtures explícitos aislados, sin seeds comerciales en producto; sin mocks como PG evidence. Cada test incluye IDs/actor/tenant/SQLestado/audit/event counts y hashes relevantes. Suites intactas anteriores se reutilizan por hash/cobertura, no sólo por su conteo.

## Rutas permitidas por etapa

EtapaA actual: sólo FINAL_CONTRACT_RECONCILIATION_20261013/, STEP_6A3_COMMERCIAL_GOVERNANCE_APPROVAL_PACKAGE_V2.md y STEP_6A3_FINAL_CONTRACT_AND_IMPLEMENTATION_REPORT.md. Entradas y cambios heredados read-only. Ningún estado/receipt/grant.
EtapaC propuesta: apps/backend/src/security/commercial-*.ts y sus tests/route consumers autorizados; persistence helper sólo delta replay perfil aprobado; packages/contracts schemas/tests/generation; apps/frontend/src/core-grc.tsx/API client/tests; contracts/model/runner manifest derivados; nueva SQL aprobada; database expected-schema; sólo paths revisados en taskpacket publicado. Prohibidos históricos, otros dominios, IAMreal, infra/deploy, main, baseline in situ y cualquier refactor ajeno. Este listado propuesto no autoriza aún modificar esas rutas.

## Gate previo a implementación

Decisión humana exacta sobre paquete+manifest; publicación gobernada de deltas rectores/canónicos/lógicos; PHYSICAL_DATA_MODEL_REVIEW y EXECUTABLE_CONTRACTS humanos; comprobación de representación completa y efectos de triggers declarados. Si un artefacto posterior cambia materialmente bytes/semántica, requiere nuevo delta por hash. No interpretar approval de intención como approval de archivo futuro.

## Release manifest requerido posterior, no disponible hoy

Version/repo/branch/HEAD del build; backend image digest y frontend image/bundle SHA; exactSQLmanifest/sourceledger/destinationledger; signed publication/adoption manifest; Actor/grants reales; backup/PITRref; ingreso/windowrules hash; dependency packs/capabilities con gates; source/runtime parity; smoke/e2e/audit/isolation/security/visual results; rollbackproof; Security+Release GO. Cada valor se obtiene del artefacto construido/evidencia real. Ningún placeholder se presenta como release firmado.
Estado hoy: NOT_BUILT / NOT_READY_FOR_RELEASE / NO_GO_SHARED_QA. No imágenes/commit/push/deploy. Próximo paso contractual: decisión sobre bytes candidatos; luego publicación/gates; implementación y pruebas afectadas autorizadas; sólo posteriormente paquete operacional QA con inputs reales y autorización.

## Riesgos residuales y detener únicamente lo dependiente

Inventario/compatibilidad real, coexistencia activa por raíz, actores/grants/datos comerciales, ventana y restore, fuentes legales y suficiencia metodología, aceptación externa48cláusulas. Datos incompletos no bloquean preparar/pruebas futuras aisladas del mecanismo tras contrato; sí publicación/contratación/adopción real. Hlegales/metodológicas impiden cierre integral; no reinterpretar la fase. SQL candidate sin ejecución PG no es migración probada.
""")

F = [
    ("F-01","04","Ventana T0..T10 separa runtime/adopción/publicación y mantiene barrera hastaGO","STRATEGY_PROPOSED; operational inputs/authorization pending"),
    ("F-02","03/08","Binding exclusivo update→command/internalchildren; negativos/authority chain completos","DESIGN_PROPOSED; IAM publication not authorized"),
    ("F-03","03/07","200completed trasCOMMIT/replay; alta202 intacta","DESIGN_PROPOSED; API evidence pending"),
    ("F-04","01/02/DDL","finite/nonnegative/integer/units/UQ/exclusion/fullcoverage; materialquota→newPV","DESIGN_PROPOSED; real amounts not supplied"),
    ("F-05","01/02/05/DDL","R-P prospectivo persistente preserva historia; R-A alternativa sólo si0overlaps y aprobación exacta","DESIGN_PROPOSED; real inventory/PG concurrency pending; active conflict→competent decision"),
    ("F-06","03/10","nuevaends original; packexpiry original; destino contiene intervalos; rechazo sin fechas artificiales","DESIGN_PROPOSED; real commercial interval proof pending"),
    ("F-07","03/08/12/17/18","operationId/domaincommand/registry/Permission/policy/audit/event/profile exactos; publicación independiente","DESIGN_PROPOSED; exact publication/grants pending"),
    ("F-08","03/07/12","X-Correlation-Id; SubscriptionIfMatch; closedschemas; originalbody; omitETagcommands; exact errors/hash","DESIGN_PROPOSED; contract/runtime proof pending"),
    ("F-09","06/20","Expedientes competentes porfuente/versión; v1 intactas; ninguna falsa suficiencia/binding","EXTERNAL_DESIGN_AND_EVIDENCE_PENDING; no closed legal/methodology assertion"),
    ("F-10","06/11/14/19","Scenario matrix exacta; independencia comercial; integral48clauses no omitidas; gate6A4 explicit","DEPENDENCIES_PROPOSED; integral closure/external acceptance pending"),
]
dump("15_F01_F10_RESOLUTIONS.json", {"package_id":PACKAGE_ID,"status":"PROPOSED_NOT_APPROVED","findings":[{"id":i,"artifacts":a,"resolution":r,"residual_status":s} for i,a,r,s in F]})
write("16_TECHNICAL_REFERENCES.md", """
# Referencias técnicas verificadas; no autoridad comercial

PostgreSQL16 numeric: https://www.postgresql.org/docs/16/datatype-numeric.html — NaN y valores finitos deben tratarse explícitamente.
PostgreSQL16 aggregates: https://www.postgresql.org/docs/16/functions-aggregate.html — range_agg produce la unión multirange; cardinalidad/cobertura comercial provienen del contrato propuesto, no de la documentación SQL.
PostgreSQL16 trigger data visibility: https://www.postgresql.org/docs/16/trigger-datachanges.html — triggersVOLATILE y visibilidad; el diseño requiere prueba real de concurrencia para confirmar su implementación exacta. La documentación no constituye PASS.
HTTP: https://www.rfc-editor.org/rfc/rfc9110.html#section-15.3.3 —202accepted no es finalización sincrónica;200change-plan es propuesta humana específica; alta202 aprobada preservada.
""")

publication_family = obj({"commercial_family_id":uuid,"family_code":{"type":"string","minLength":1,"maxLength":96},
    "name":{"type":"string","minLength":1},"source_type":{"type":"string","minLength":1,"maxLength":32}})
publication_root = obj({"regulatory_pack_commercial_family_link_id":uuid,"regulatory_pack_id":uuid,"commercial_family_id":uuid,
    "source_type":{"type":"string","minLength":1,"maxLength":32}})
publication_limit = obj({"usage_limit_id":uuid,"commercial_family_id":nullable(uuid),"limit_code":{"type":"string","const":"regulatory_pack_count"},
    "limit_value":{"type":"string","pattern":"^(0|[1-9][0-9]{0,19})$","description":"Approved commercial amount, exact integer for numeric(30,10); no default."},
    "unit":{"type":"string","const":"pack"},"effective_from":instant,"effective_to":nullable(instant)})
publication_version = obj({"plan_version_id":uuid,"plan_id":uuid,"version_number":decimal,"display_name":{"type":"string","minLength":1},
    "commercial_terms_ref":nullable({"type":"string","minLength":1}),"effective_from":instant,"effective_to":nullable(instant),
    "family_links":{"type":"array","minItems":1,"items":obj({"plan_version_commercial_family_link_id":uuid,"commercial_family_id":uuid})},
    "usage_limits":{"type":"array","minItems":2,"items":publication_limit},
    "entitlements":{"type":"array","minItems":1,"items":obj({"entitlement_id":uuid,"capability_id":uuid,"is_enabled":{"type":"boolean"}})}})
publication_schema = obj({"profile":{"type":"string","const":"COMMERCIAL_CATALOG_PUBLICATION_V1"},
    "decision_record_ref":{"type":"string","minLength":1},"decision_record_sha256":{"type":"string","pattern":"^[0-9a-f]{64}$"},
    "families":{"type":"array","items":publication_family},"root_links":{"type":"array","items":publication_root},
    "plan_versions":{"type":"array","items":publication_version}})
publication_schema.update({"$schema":"https://json-schema.org/draft/2020-12/schema",
    "description":"Proposed closed data publication input schema; no real commercial rows/amounts approved or seeded. IDs, quantities, entitlement matrix and source types require competent publication. Human approval references the canonical UTF8 SHA256; no self hash field."})
dump("17_PUBLICATION_MANIFEST_SCHEMA.json",publication_schema)
write("17_PUBLICATION_CEREMONY_CONTRACT.md", """
# Publicación comercial independiente — propuesta exacta

STATUS=DRAFT_NOT_EFFECTIVE. command_code commercial_catalog.publish / internaloperation commercialCatalogPublication / Permission platform.commercial_catalog.publish / scopeplatform / HUMAN_INTERACTIVE baselinePLATFORM_ADMIN vigente / ObjectPolicy commercial.catalog.publish.v1. Negar update/createSubscription/read como autoridad de publicación. No endpoints de catálogo ni nuevos ServicePrincipal. DML/grants compartidos requieren mandato operacional.

Input17schema cerrado: decision_ref/hash humano y filas exactas de familias, clasificaciones de raíces, PV draft con términos/intervalo, familylinks, límites total/familia e Entitlement. Cuotas como decimalstrings exactas en rango físico numeric(30,10), no máximos comerciales; no defaults. Códigos/tipos root por FKcanónica; resolve IDs desde fuentes explícitas, no heurística por prefijos. Verificar que cada nuevaPV preserve/descomponga capacidades42 de su Plan y que las familias correspondan al manifest aprobado. Version_number nuevo positivo y monotónico del root; no reutilizar una v1 ni superseded_by como autoridad de contrato.
Actor/correlación/publicationtimestamptz son server-owned y no input. UUIDs asignados por plataforma y presentados en manifest de datos antes de firma; no inventar IDs reales hoy. Publicado_at real sólo tras ceremonia; hash de manifest17datos se calcula sobre bytes canónicos UTF8 aprobados, no hash del schema.
Ceremonia READCOMMITTED única: reclamar idempotencia Platform/actor/operation/keymanifestSHA; lock roots de Plan y Pack en orden UUID; revalidar autoridad y fuentefirmada; INSERT familias/links inmutables nuevos, crear PVdraft→limits/families/entitlements→guard→publicarPV. Re-publicación misma decisión/hash devuelve referencias anteriores con cero nuevas filas/audit/outbox; diferente contenido con keyidéntica409IDEMPOTENCY. Drift/código orootya clasificado con significado distinto409RESOURCE; no UPDATE para reparar.
Audit por nueva CommercialFamily audit.platform.commercial_catalog.publish.v1 y evento platform.commercial_catalog.published.v1, aggregateesaFamily. Audit por PV audit.platform.plan_version.publish.v1/eventplatform.plan_version.published.v1, aggregateesaPV. Todos PLATFORM_CONTROL/tenantNULL, actorreal/commanddot/correlation/manifestSHA/decisionref/filas+FK+hashesexactos. Link/limit publication se registra bajo su PV/Family padre; no agregadomanifestficticio. Parent batch no blob de packs transferidos; publication provenance lleva los datos exactos congelados. Outbox/claim/result y todas las filas COMMIT juntas; fallo cualquieraROLLBACK.
result_ref profile COMMERCIAL_CATALOG_PUBLICATION_RESULT_V1 con manifest_sha256 y pares aggregateType/ID publicados, schema cerrado no datossecretos; response_hash canonicalJSON de esas referencias. No HTTPnuevo ni APIpublica. Ejecución operacional conservará before/afterde las relaciones y hashes, cantidades aprobadas y prueba guard/publicación/inmutabilidad. Ningún acto publica/licencia RegulatoryPackVersion por esta ceremonia.
""")
publication_result = obj({"profile":{"type":"string","const":"COMMERCIAL_CATALOG_PUBLICATION_RESULT_V1"},
    "manifest_sha256":{"type":"string","pattern":"^[0-9a-f]{64}$"},
    "published_aggregates":{"type":"array","items":obj({"aggregate_type":{"type":"string","enum":["CommercialFamily","PlanVersion"]},"aggregate_id":uuid})}})
publication_result["$schema"]="https://json-schema.org/draft/2020-12/schema"
dump("18_CATALOG_PUBLICATION_RESULT_SCHEMA.json",publication_result)

write("19_DEPENDENCY_ORDER_AND_DECISION_BOUNDARIES.md", """
# Dependencias y orden sin ciclos operacionales

STATUS=PROPOSED. Las dependencias de matriz14 son referencias/co-requisitos de revisión contractual conjunta, no un orden topológico de tareas. La definición de catálogo/relaciones/límites/command se revisa como un contrato cohesionado. El requisito de aprobación de C12 no exige que C01 ya haya sido operado: consume sus bytes candidatos y conserva gates posteriores.

## DAG de ejecución comercial

Aprobación de diseño exacto→publicación superior canónica/rectora→review físico y ejecutable→implementación local autorizada→migración y datos fixture aislados→pruebas dirigidas→release candidate técnico→mandato operacional QA→T2inventario→T3ventana→T4migración→T5instalar runtime→T6publicación comercial→T7adopción por mismo change-plan→T8integridad→T9smoke+GO→T10apertura pública.
F-01 desaparece del procedimiento propuesto porque T7 ya dispone del runtime instalado en T5 y público permanece cerrado hasta T10. Instalar/habilitar/adoptar/publicar no son sinónimos.
La comprobación de schema/physical/executable precede código; las pruebas PostgreSQL prueban el mecanismo después de aprobación, no generan por sí solas autoridad.

## DAG legal y metodológico

H01fuentes→decisión legal/binding exacto→contratos/modelo aprobados→guards implementados→RBAC-C12evidencia→H01/H03aceptación. No supeditar preparar la fuente a tener previamente H03PASS.
H04/H05expedientes de suficiencia candidatos + H06representación candidata→prueba y revisión competente conjunta→publicación exacta de versión/modo→H04/H05/H06aceptación→CFG-T01/T02/T04→H10aceptación. Distinguir expediente de suficiencia de cierre/publicación: no exigir que H06 esté publicada para investigar la suficiencia ni inferirla del acto de publicar.
H07/H08/H09preflight/candidato aprobado→adopción operacional autorizada→CFG-T06/T07/T08→H10aceptación. H11inventario→dictamen/enforcement autorizado→T-VOCaceptación→H12. Sólo RBAC-C12 requiere H01 sustantiva; la matriz11 enumera escenarios independientes.

## Límites y pendientes agrupados

R-P propuesta prospectiva se aprueba como diseño permanente para nuevas escrituras; no precisa inventar una fecha comercial de corte en filas ni rehacer historia. Su prueba real y dictamen de compatibilidad preceden uso real. R-A es alternativa exacta documental, sólo si no existen solapamientos y los owners revisan su nuevo DDL/hash. Ni R-P ni esta firma resuelven qué derecho conservar entre dos versiones actualmente contratadas cuando el destino no puede conservar ambas: hace falta decisión competente sobre esas asignaciones, después de inventario.
Datos de cantidades, IDs concretos de nuevasPV y manifiesto de adopción no son diseño de mecanismo, pero sí condición comercial de publicación/operación. Faltan fuente legal, suficiencia metodológica y representación H06: esas decisiones no son artefactos mecánicos ni meras pruebas pendientes. Se presentan juntas en06; ninguna aprobación de conservar bloqueos las cierra.
La aprobación única aquí solicitada puede cerrar diseño comercial propuesto y tratar30disposiciones conjuntamente; no puede cerrar integralmente STEP6A3 hasta evidencias y decisiones heredadas exigidas. Si el humano rechaza R-P o ventana, el bloque dependiente se devuelve con delta exacto; no seleccionar automáticamente R-A u otra topología.
""")

write("20_EXTERNAL_DECISIONS_ALTERNATIVES.md", """
# Decisiones externas agrupadas — alternativas y consecuencias

STATUS=NOT_DECIDED. Estas alternativas son requisitos condicionales de decisión competente, no ramas habilitadas por firmar el diseño comercial. Rector45§3 prohíbe inferir la respuesta. Recomendaciones aquí son propuestas sometidas al humano, no autoridad oficial.

| Pendiente / datos mínimos | Alternativa exacta | Criterio objetivo | Recomendación propuesta / consecuencias |
| --- | --- | --- | --- |
| F05 inventario global por raíz | R-P: conservar historia y usar guard de nuevas escrituras; R-A: exclusión por raíz sobre toda historia | R-A sólo si0overlaps y dictamen de compatibilidad; R-P no exige borrar períodos anteriores | Recomendar R-P, artefactoDDL presentado; prueba de concurrencia pendiente. R-A requiere nuevos bytes/hash y aprobación, no autoelección. |
| F05 coexistencias efectivas en origen | Mantener contrato vigente y no promover; o aprobar decisión contractual concreta por asignaciones antes de adoptar | Inventario identifica IDs/PackVersion/intervalos/derechos y motivo competente | Recomendar detener sólo adopción afectada y mantener barrera; no elegir edición por fecha. Si se decide terminar un derecho, usar comando revoke autorizado con motivo/audit; no truncar historia ni inferir consentimiento. Preservar ambas bajo una política distinta exige enmienda general nueva, no excepción por tenant. |
| H01 fuente legal/contexto | L-A: reutilizar relación canónica ya existente que la fuente demuestre suficiente; L-B: enmienda tipada versionada del binding que la fuente determine | Fuente/cláusula/jurisdicción/actividad/objeto/intervalo/hold/precedencia, más FKs existentes demostradas para L-A; identidad/cardinalidad exactas para L-B | Recomendar reutilizar sólo si cadena completa demostrada. Hoy ninguna alternativa se declara elegible: preparar requisitos06; después fuente exacta y dictamen legal eligen representación. No usar presenciaLEGAL, policy_id igual ni PrivacyProcessingActivity por conveniencia. |
| H04/H05 suficiencia v1 | M-A: demostrar autosuficiencia de comportamiento actual v1 sin alterar aceptación de EC; M-B: nueva versión con comportamiento/metadatos materialmente diferentes | Reglas17/19/38/39, inputs/overrides/recencia/lineage por versión y pruebas suficientes; changeoptional→none que rechaza EC es material | Recomendar expediente de v1 primero. Conservar v1 y EC opcional. Si nuevo modo cambia conducta, M-B exige sucesora y datos exactos; no agregar none a v1, no inventar recencia/pesos. |
| H06 publicación | P-A: publicar artefacto de prueba de semántica v1 ya aprobada sin cambiarla; P-B: publicar sucesora/binding nuevo revisado para nueva semántica | Expediente determina si hay cambio material; bytes/modelo/manifests exactos identificados antes de firma | Recomendar separar suficiencia de cambio de modo. Representación final depende del expediente; no aprobación de tabla/flag/artefacto futuro por arrastre. |
| H07/H08/H09 datos incompatibles | No adoptar hasta resolución competente; o corregir mediante comando/artefacto específico legítimo y auditado | Identificar PK/FK/valores/conflicto; fuente del dato correcto o contrato explícito de corrección | Recomendar preflightfailclosed. No dedupe/merge/hash/default fabricado. Sólo operación/dato competente, diseños de claves ya aprobados no se reabren. |
| C03 cantidades reales | Publicar nuevaPV completa con cantidades aprobadas; o mantener bloqueada publicación/contratación | Datos Producto por PV/familia/intervalo y manifest/hash; ningún valor se deriva de tests o v1incompleta | Recomendar aportar todo junto antes de QA/adopción. No se necesita inventar precio/cuota para implementar y probar mecanismo aislado tras gates. |
| T3/T5 barrera/restore | Ventana controlada sobre infraestructura existente verificable; o NO_GO | Mandato actor/fecha/duración/ruleshash/imágenes/backup/drain/restore y prueba de ambos ingresos | Recomendar ventana propuesta; si la barrera o recuperación no puede demostrarse, no sustituir por bypass ni topología nueva no aprobada. |

Una sola respuesta humana puede aceptar el diseño candidato y aportar decisiones externas con sus fuentes cuando estén disponibles; sin datos suficientes no se rellenan campos ni se cierran H. Aprobación conjunta de tratamiento de pendientes no es aprobación de una alternativa sustantiva sin evidencia. Si aparecen datos reales que obligan a cambiar diseño, presentar nuevo delta exacto y hash, preservar versión02 y sus condiciones.
""")

# Exact source manifest: all superior baseline files plus touched semantic inputs.
source_paths = set()
for directory in ["docs/rector/baseline", "docs/physical-data-model", "docs/executable-contracts", "database/migrations", "docs/ui"]:
    for path in (ROOT/directory).rglob("*"):
        if path.is_file() and path.suffix in [".md",".json",".yaml",".sql",".txt"]:
            source_paths.add(path.relative_to(ROOT).as_posix())
for path in [ORIGINAL, BASE/"STEP_6A3_INTEGRAL_CLOSURE_REPORT_20261013.md",BASE/"26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md",
    BASE/"20_P_RBAC_PUBLICATION_DECISION_PACKET.md",BASE/"21_P_CONFIG_BINDING_EVIDENCE_AND_ARCHITECTURE_OPTIONS.md",BASE/"23_P_VOC_DECISION_AND_PROVENANCE.md",
    BASE/"28_CONFIG_CFGD_CONDITIONAL_DECISION_AND_PHYSICAL_RECONCILIATION.md", BASE/"SOLO_OWNER_GOVERNANCE_PROPOSAL_20261009_V2/07_RESULT.json",
    ROOT/"docs/governance/MASTER_EXECUTION_STATUS.md",ROOT/"docs/governance/CODEX_RECTOR_ENFORCEMENT.md",
    ROOT/"docs/governance/amendments/COMMERCIAL_PACK_FAMILY_20261013/DRAFT_CANONICAL_AMENDMENT.md",
    ROOT/"AGENTS.md",ROOT/"database/expected-schema.json",ROOT/"database/seed-manifest.json",
    ROOT/"docs/rector/ACTIVE_ACTIVATION.json",ROOT/"docs/rector/BASELINE_ID",ROOT/"docs/rector/BASELINE_STATUS",ROOT/"docs/rector/RECTOR_MANIFEST.sha256"]:
    source_paths.add(path.relative_to(ROOT).as_posix())
for path in (BASE/"CONSOLIDATED_APPROVAL_20261009").glob("**/*RECEIPT*.json"):
    source_paths.add(path.relative_to(ROOT).as_posix())
for path in (BASE/"CONSOLIDATED_APPROVAL_20261009/evidence/integral-closure-20261013").glob("*"):
    if path.is_file(): source_paths.add(path.relative_to(ROOT).as_posix())
dump("SOURCE_MANIFEST.json", {"package_id":PACKAGE_ID,"sources":[{"path":p,"sha256":digest(ROOT/p)} for p in sorted(source_paths)]})
artifact_paths = sorted(p for p in OUT.iterdir() if p.is_file() and p.name not in ["ARTIFACT_MANIFEST.json","validation-results.json","DELIVERY_SHA256SUMS.txt","APPROVAL_TEXT_UNSIGNED.txt"] and not p.name.endswith(".log"))
dump("ARTIFACT_MANIFEST.json", {"package_id":PACKAGE_ID,"approval_state":"UNSIGNED_PROPOSED","artifacts":[
    {"path":p.relative_to(ROOT).as_posix(),"sha256":digest(p),"bytes":p.stat().st_size,"status":"PROPOSED_OR_ENTRY_EVIDENCE_NOT_ACTIVATED"} for p in artifact_paths]})
manifest_sha = digest(OUT/"ARTIFACT_MANIFEST.json")

header = f"""# STEP6A3 — paquete contractual corregido v2

PACKAGE_ID={PACKAGE_ID}
STATUS=READY_FOR_CONTRACT_REVIEW_NOT_APPROVED_NOT_EFFECTIVE
MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.8_2026-10-09
CODEX_VARIATION_BUDGET=ZERO
ARTIFACT_MANIFEST_SHA256={manifest_sha}
Dominio público único: https://grc.tecdex.net/.

## 1. Continuidad y alcance exacto

Paquete v1 intacto, SHA846bb0a8b0b8491670a6343bbd5e82fb7d01cea6a20abbb351a724ab502bee32. Rama fix/qa-functional-commercial-onboarding-20261013, HEAD local/remoto23c7b50468213b8c0769ca2607349e04f4c32eae. Workingtree heredado preservado por entry-state.json. Rectoractivo íntegro. Estado leído STEP6A3PARTIAL_BLOCKED/STEP6A4NOT_STARTED; ningún estado/receipt modificado.
La etapaA prepara bytes exactos revisables de diseño, DDL propuesto, OpenAPI, policies/registry/audit/replay, escenarios, inventario y operación. No implementa ni ejecuta el contrato dependiente antes de firma45§6/49§3 y publicación/gates correspondientes. READY_FOR_CONTRACT_REVIEW no significa READY_FOR_IMPLEMENTATION, RELEASE o cierreintegral.

## 2. Clases de autoridad y decisiones

A: intención humana de relación/familias/limits/change-planindependiente/PlatformAdmin/atomicidad/historia; alta y packVersionauthority aprobados; R1/R2/R3 dentro de su alcance. No volver a pedir su intención ni repetir suites intactas.
B: UUID/tenantFK/ausencia≠unlimited/inmutabilidad/defaultDENY/CAS/auditoutboxTX/noinferenciahistórica, derivados del rector. Representaciones físicas nuevas requieren aprobación.
C: modelo exacto, R-P/ventana/HTTP200/temporalidad/cuotasconstantes/headers/replay/authority/bindings y tres permisos propuestos se someten a firma conjunta.
D: fuentes legales/suficiencia/inventario/compatibilidad externa/aceptaciones pendientes; no Hcerrada por conservar bloqueo.
E: DDL/DMLQA/IAM/grants/publicaciónoperacional/deploy/commit/push/merge y cierre/6A4 requieren sus mandatos/gates; no autorizados ahora.

## 3. Decisiones C-01..C-12 completas por contrato exacto

Cada fila14 define autoridad, modelo, physical, executable, dependencies, pruebas, riesgo, evidencia, owner y condiciones. Artefactos numerados siguientes están vinculados por manifestSHA exacto; no son documentos futuros desconocidos.
"""
package = [header]
for code, decision, authority, artifacts, deps, risk, human, close in C:
    package.append(f"### {code}\n\n**Decisión propuesta:** {decision}.\n\n**Autoridad rectora:** {authority}. **Contrato/modelo/DDL:** artefactos {artifacts}, inventariados por hash. **Dependencias:** {deps}; referencias contractuales de revisión conjunta, orden operacional en19.\n\n**Riesgo:** {risk}. **Decisión humana pendiente:** {human}. **Funciones humanas:** Producto, Arquitectura, Modelo de Datos, Backend, Seguridad y QA/Release; acumulables bajo45/49. **Aceptación:** {close}; casos11, nunca PASS por diseño. **Activación:** publicación superior y gates físicos/ejecutables exactos; operación QA separada.\n")
package.append("## 4. Resoluciones F-01..F-10 y límites verificables\n\n| ID | Artefactos | Resolución propuesta | Dependencia residual |\n| --- | --- | --- | --- |")
for code, artifacts, resolution, status in F:
    package.append(f"| {code} | {artifacts} | {resolution} | {status} |")
package.append("\nF-01..08 tienen propuestas contractuales exactas, no decisiones humanas registradas. F-05 no demuestra compatibilidad real; R-P conserva historia y datos activos incompatibles impiden adopción. F-09 requiere fuentes y representación competentes; F-10 mantiene cierreintegral condicionado. No se declara resuelta una incompatibilidad por preparar el mecanismo.\n")
package.append("## 5. Grupos G y matriz30\n\n| Grupo | Disposiciones | Decisión conjunta | Autoridad |\n| --- | --- | --- | --- |")
for code, deps, decision, authority in G:
    package.append(f"| {code} | {deps} | {decision} | {authority} |")
package.append("\nLa matriz14 CSV/JSON contiene las30filas exactas y todos sus campos contractuales. IDs H históricos C07/C08 no son decisiones C07/C08 comerciales. Los G sólo agrupan y no sustituyen requisitos de sus miembros. Hlegal/metodológica permanece pendiente aun si se aprueba su disposición documental.\n")
package.append("## 6. Disposiciones H-01..H-12, texto base íntegro y reconciliación v2\n")
h_source = original.split("## 3. Las doce cláusulas pendientes",1)[1].split("## 4. Propuesta comercial completa",1)[0]
for index, (code,legacy,authority,deps,decision,status,risk,human,close) in enumerate(H):
    section=h_source.split(f"### {code} — ",1)[1]
    section=section.split("### H-",1)[0].strip()
    package.append(f"### {code} — {section}\n\n**Complemento contractual v2:** autoridad {authority}; dependencia exacta {deps}; estado PROPUESTO {status}. Modelo/artefacto: {decision}, requisitos06 y escenarios11. Condición de cierre: {close}. Aprobación posterior: {human}. Conservar evidencia/receipts previos; ninguna firma actual registra DONE/PASS.\n")
    if code=="H-10":
        package.append("**Reconciliación explícita:** la dependencia genérica C-04W del texto base queda sustituida por la matriz11: H-01 sólo cuando el escenario realmente consuma contexto legal; CFG-T01..08 no tienen dependencia legal universal. H04/H05/H06 sólo T01/T02/T04 y casos realmente metodológicos; UQ/default sólo T06/T07/T08. No alterar criterios originales ni omitir evidencia.\n")
package.append("## 7. Contratos, migración, temporalidad y operación\n\n01delta+02modelo+03seguridad/replay+07OpenAPI+08bindings+12audit fijan el contrato comercial. SQL y09manifest son candidatos exactos sin ejecución.04plan elimina ciclo y congela apertura hastaGO.05inventario no ejecutado.10matriztemporal y11escenarios son criterios futuros.06expedientes/gates conserva12pendientes y entrada6A4.13taskpacket identifica implementación/release futuros. Toda fuente y artefacto tiene hash en manifests.\n")
package.append("## 8. Inventario exacto revisable\n\nARTIFACT_MANIFEST.json SHA256="+manifest_sha+". Su contenido y cada artefacto forman el conjunto exacto solicitado. El hash del paquete no se inserta en sus propios bytes; se comunica en informe/sidecar.\n\n| Artefacto | SHA-256 |\n| --- | --- |")
for item in json.loads((OUT/"ARTIFACT_MANIFEST.json").read_text())["artifacts"]:
    package.append(f"| {item['path']} | {item['sha256']} |")
package.append(f"""

## 9. Texto exacto de aprobación conjunta — sin firma

Identidad/funciones/fecha real las aporta el humano. Sustituir PACKAGE_SHA256 exclusivamente por el hash comunicado del archivo v2 recibido; manifest ya identificado por bytes. Una firma acumula funciones internas, sin dispensar independencia superior ni SoD operacional.

```text
DECISION_ID=DR-STEP6A3-COMMERCIAL-GOVERNANCE-20261013-02
PACKAGE_ID={PACKAGE_ID}
PACKAGE_FILE=docs/phase6a/STEP_6A3/STEP_6A3_COMMERCIAL_GOVERNANCE_APPROVAL_PACKAGE_V2.md
PACKAGE_SHA256=[SHA-256 exacto del paquete v2 recibido]
ARTIFACT_MANIFEST_SHA256={manifest_sha}
HUMAN_IDENTITY=[identidad humana real]
HUMAN_FUNCTIONS=[Producto, Arquitectura, Modelo de Datos, Backend, Seguridad,
Privacidad/Legal, Methodology y QA/Release realmente ejercidas]
SIGNED_AT_UTC=[fecha y hora real ISO8601 UTC]

Apruebo conjuntamente G-01..G-06, C-01..C-12 y H-01..H-12 en el alcance
exacto de este paquete y los artefactos presentes identificados en su manifest.
Adopto como diseño propuesto la ventana controlada T0..T10, R-P prospectivo,
HTTP200 para change-plan sin alterar el alta202, cuotas finitas/inmutables por
PlanVersion, fechas comerciales preservadas, binding exclusivo update, tres
permisos/grants candidatos, schemas y mapping de comandos/auditoría/replay.
Apruebo las resoluciones F-01..F-10 con sus dependencias residuales explícitas.

La firma aprueba el diseño y los bytes candidatos presentados para su
reconciliación/publicación gobernada; no registra cierre de H por mantener
su bloqueo, no acredita fuentes legales, suficiencia metodológica, inventario,
cuotas reales, compatibilidad activa o aceptación externa sin evidencia.
R-A no queda autorizada para implementación por esta firma.

No apruebo por arrastre una baseline sucesora, expected-schema activo,
publicación/seed manifest, artefactos de implementación o imágenes futuras
cuyos bytes y hashes no se presentaron. La implementación dependiente sólo
comienza tras publicación competente y gates físicos/ejecutables exigidos.

No autorizo DDL/DML en QA compartido, IAM real, grants, cambios de estado,
commit/push/merge/deploy ni inicio STEP6A4/ZIP normativo/STEP6A5 por esta firma.
Su ejecución requiere mandato operacional y gates correspondientes.
No declaro STEP6A3PASS ni READY_FOR_RELEASE y conservo las separaciones
operacionales y obligaciones superiores bajo rector45§6/49§3.
```

Para rechazar: mismos campos de identidad/funciones/hash/fecha; indicar IDs
rechazados y delta exacto. Ningún otro ID se aprueba por silencio. Un cambio
material posterior exige bytes/hash nuevos; no reutilizar hashv1 ni v2actual.

## 10. Detención y siguiente acción

Solicitar decisión humana agrupada sobre diseño/artefactos exactos y datos
externos06. La implementación, ejecución SQL, QA y release quedan pendientes
de sus dependencias; ninguna aprobación fue fabricada. STEP6A3PARTIAL_BLOCKED;
STEP6A4NOT_STARTED. Las30disposiciones están tratadas, no todas cerradas.
""")
package_path = BASE / "STEP_6A3_COMMERCIAL_GOVERNANCE_APPROVAL_PACKAGE_V2.md"
package_path.write_text("\n".join(package).strip()+"\n")
print(json.dumps({"package_id":PACKAGE_ID,"package_file":package_path.relative_to(ROOT).as_posix(),
    "package_sha256":digest(package_path),"artifact_manifest_sha256":manifest_sha,"artifacts":len(artifact_paths),"dispositions":len(rows),"commercial_scenarios":len(commercial_cases)},ensure_ascii=False))
