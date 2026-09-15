# 34 - Arquitectura lógica de componentes y dependencias

## 1. Objetivo

Fijar límites operativos y aplicar el stack vinculante definido en 43.

## 2. Capas

### Edge/API
Autenticación, tenant context, request validation, rate limiting y routing. Sin reglas de negocio.

### Application Commands/Queries
Orquesta use cases, autorización, transacciones y domain commands. No accede directamente a APIs externas.

### Domain Modules
Implementan invariantes de su bounded context y escriben sólo sus aggregates.

### Data/Calculation Plane
Observation ledger, metrics, calculation engine, data quality, snapshots.

### Rules/Impact Plane
Rule evaluation, impact graph y automation policy.

### Integration Plane
Connectors, credentials references, sync workers, raw storage, normalization y subject bindings.

### Async Plane
Transactional outbox, job workers, retries, DLQ, notifications, reports y recálculos.

### Storage Plane
PostgreSQL system of record + object storage para binarios + caches/indices derivados no autoritativos.

### AI Plane
El backend GRC obtiene contexto autorizado y llama `ia2.tcdx.int` mediante la capa de integración IA gobernada; el servicio IA no accede a PostgreSQL ni elude application authorization.

## 3. Dirección de dependencias

`Edge -> Application -> Domain contracts`

Integrations/Data/Rules se conectan mediante interfaces/commands/events definidos. Ningún bounded context importa repositorios internos de otro para mutar su estado.

## 4. Consistencia

Dentro de un aggregate: transacción ACID.

Entre bounded contexts: consistencia eventual gobernada mediante outbox/eventos, con idempotencia y estado observable.

Operaciones que legalmente requieren atomicidad transversal deben modelarse como un único application use case con locks/transactions explícitos sólo si comparten la misma autoridad; no usar distributed pseudo-transactions implícitas.

## 5. Queries

Read models pueden denormalizarse para UX/reporting, pero se reconstruyen desde fuentes canónicas y nunca reciben escritura de negocio.

## 6. Tecnología

La selección tecnológica está cerrada en 43. Los componentes se abstraen por contratos internos para testabilidad y evolución, pero no quedan proveedores o frameworks pendientes para iniciar. Un cambio futuro requiere ADR y actualización rectora previa.
