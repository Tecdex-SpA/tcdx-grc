# 25 - Contrato de APIs, commands, events, idempotencia y auditoría

## 1. API

API tenant business usa `/api/v1/...`. Breaking change requiere nueva major version.

Identifiers internos son UUID opacos. Business codes nunca sustituyen tenant scope.

## 2. Mutation command

Toda mutación sigue:

`authenticate -> authorize -> validate -> idempotency -> domain command -> transaction -> outbox event -> audit -> response`

## 3. Idempotency

POST/commands reintentables aceptan `Idempotency-Key`. Se persiste scope de ownership + tenant cuando aplique + actor + operation + key + request hash + result. Las operaciones GLOBAL_REFERENCE/PLATFORM_CONTROL no inventan un tenant técnico o `SYSTEM_TENANT_ID`.

Misma key con payload distinto = 409 conflict.

## 4. Optimistic concurrency

Entidades editables críticas usan `version`/ETag. Update con versión obsoleta = 409.

## 5. Event envelope

Todo domain/integration event contiene:

- event_id;
- event_type + version;
- ownership_class: GLOBAL_REFERENCE | PLATFORM_CONTROL | TENANT_OWNED | TENANT_DERIVED;
- tenant_id: obligatorio para TENANT_OWNED/TENANT_DERIVED y NULL/no aplicable para GLOBAL_REFERENCE/PLATFORM_CONTROL;
- aggregate_type/id;
- occurred_at;
- actor/service principal;
- correlation_id;
- causation_id;
- payload;
- classification.

## 6. Transactional outbox

Side effects asíncronos salen por outbox en la misma transacción que la mutación. At-least-once delivery; consumers idempotentes.

## 7. AuditEvent

Registra quién, qué, cuándo, ownership_class, tenant cuando aplique, objeto, command, before/after relevante, IP/device cuando corresponde, correlation y outcome. Eventos/acciones globales o de plataforma no fabrican tenant para satisfacer auditoría.

No almacenar secretos ni blobs sensibles en audit payload.

## 8. Errores

Formato estable:

`code, message, correlation_id, field_errors?, retryable?`

Nunca convertir error técnico en dataset vacío válido.

## 9. Bulk/import

Procesamiento por job con row-level outcome, partial failure explícito y archivo de errores; no transacciones gigantes opacas.

## 10. Command comercial propuesto

`subscriptionChangePlan` usa `POST /api/v1/platform/subscriptions/{id}:change-plan`, `platform.subscription.update`, `If-Match` fuerte de `Subscription.row_version`, `Idempotency-Key`, schema cerrado y HTTP 200 sólo después de COMMIT. El alta `subscriptionCreate` conserva su HTTP 202. El replay reautoriza al actor y valida el fingerprint antes de evaluar el CAS o el estado posterior del origen; devuelve el cuerpo original persistido y omite ETag tanto en éxito como replay. El GET actual proporciona un ETag fresco para un nuevo command. Un resultado corrupto no se reconstruye desde filas actuales.

El cambio, cierre/alta de asignaciones, lineage, AuditEvent, OutboxEvent e IdempotencyRecord se confirman en una sola transacción. Los códigos, perfiles, payloads y mapeos exactos son los del paquete `GP-STEP6A3-COMMERCIAL-20261013-02`, artefactos 03/07/08/12, que deberán publicarse como contratos ejecutables antes de código. La ceremonia `commercialCatalogPublication` es interna, independiente y exige manifest de datos exactos, actor humano Platform Admin y transacción indivisible; no crea endpoint público de catálogo. La publicación comercial no licencia RegulatoryPackVersion.
