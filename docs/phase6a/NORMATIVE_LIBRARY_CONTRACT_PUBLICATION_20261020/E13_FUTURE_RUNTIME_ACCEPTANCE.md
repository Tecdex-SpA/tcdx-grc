# E13 — Casos reservados a autorización posterior

Todos los casos siguientes están NOT_RUN, no son condiciones satisfechas de runtime:

| Caso | Resultado exigido futuro |
| --- | --- |
| Importar preliminar autorizado para prueba | Provenance/edición/derechos reales, NON_AUTHORITATIVE_TEST_PACK y acceso exacto; jamás gate oficial por defecto |
| Intentar recibido como official/licensed/authorized | Rechazo sin mutación; conservar fuente original |
| Ley21.663 sin fecha/cita auténtica resoluble | Bloquear el import afectado; Ley21.719 e independientes intactos |
| Link Knowledge XOR inválido o global→privado/cross-tenant | FK/constraint/guard rechaza; ningún dato filtrado |
| Publicación y modificación de cuerpo/links publicados | Hash exacto al publicar; modificación rechazada, sucesor conserva historia |
| Numeración por Item y concurrencia de creación | UQ item+version real, sin renumeración histórica ni duplicados |
| Autor revisa/decide su propio ajuste | DENY incluso con roles acumulados; sin cambio ni segundo hecho material |
| Dos sucesores aprobados del mismo override | Serialización/unique rechaza fork; historia inmutable |
| Idempotencia y ETag obsoleto/ABA | Replay original sin duplicados; key distinta/payload conflictivo o CAS inválido409 |
| Aplicabilidad con contexto ajeno/incompatible/no publicado | Denegar; snapshot/tenant/actor/hash exactos sólo para contexto elegible |
| Históricos NULL o contexto supersedido | Sin backfill/reevaluación; decisión y audit permanecen originales |
| Error al persistir audit/outbox exigido/idempotencia | Rollback de la mutación completa; create sin nuevo outbox artificial |
| MatrixRead sin permiso de una fuente | Sin filas/celdas/conteos privados, cursor ligado a tenant/actor/contexto |
| Support intenta escritura/global body/tenant implícito | DENY; únicamente metadata explícitamente autorizada |

La implementación integral requiere persistencia→dominio→API→RBAC→audit→UI→tests→E2E→runtime→traceability. Ningún caso crea actores, grants, datos o entornos ahora. Migración/import/deploy/implementación requieren su orden específica; STEP6A5/6A6 siguen excluidos.
