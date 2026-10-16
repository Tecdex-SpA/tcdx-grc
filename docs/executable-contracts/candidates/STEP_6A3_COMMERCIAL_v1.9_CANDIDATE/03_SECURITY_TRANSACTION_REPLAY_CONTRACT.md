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
