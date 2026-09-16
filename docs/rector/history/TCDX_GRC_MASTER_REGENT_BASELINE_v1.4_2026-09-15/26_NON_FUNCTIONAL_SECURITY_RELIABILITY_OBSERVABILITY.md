# 26 - Requisitos no funcionales: seguridad, fiabilidad y observabilidad

## 1. Multi-tenancy

Defensa en profundidad:

- tenant_id en entidades tenant-owned;
- composite FKs cuando correspondan;
- session/request tenant context;
- repository/service layer exige tenant;
- RLS para tablas críticas cuando sea operacionalmente viable;
- tests cross-tenant obligatorios.

## 2. Secretos

Nunca en BD de negocio en texto plano, repo, logs o frontend. Se usa secret manager/credential reference. Rotation soportada.

## 3. Encryption

TLS en tránsito. Encryption at rest para DB/object storage/backups. Campos de alta sensibilidad pueden requerir envelope encryption.

## 4. Availability

Servicios stateless cuando sea posible. Jobs reanudables desde checkpoint. Integraciones toleran rate limits y outages sin fabricar datos.

## 5. Performance targets iniciales

Objetivos de diseño, medidos p95 en QA representativo:

- API read simple < 500 ms;
- API mutation simple < 1 s excluyendo side effects async;
- dashboard inicial < 2.5 s con resultados precomputados;
- paginación server-side obligatoria para colecciones grandes;
- reportes pesados como jobs async.

Los objetivos de producción y su condición comercial se fijan en 43: disponibilidad 99,9% mensual, RPO 15 minutos y RTO 4 horas.

## 6. Observability

Logs estructurados con correlation_id, tenant pseudonymized id, service, operation, outcome y duration.

Metrics: request latency/error, job queue depth, connector health, sync lag, calculation lag, DB saturation, outbox/DLQ, AI availability.

Tracing distribuido para flows críticos.

## 7. Backup/DR

PostgreSQL: backups automáticos + PITR. Object storage: versioning/backup según criticidad.

RPO/RTO de producción son los definidos en 43. QA debe demostrar que la arquitectura y los procedimientos pueden cumplirlos antes del release.

## 8. Security gates

SAST, dependency scanning, secret scanning, migration tests, authorization tests, tenant isolation tests, file upload tests y audit completeness antes de release.

## 9. AI isolation

No entrenamiento cross-tenant con datos privados. Context retrieval respeta tenant/RBAC. Prompt/output logs se clasifican y minimizan. AI failure no impide cálculos determinísticos.
