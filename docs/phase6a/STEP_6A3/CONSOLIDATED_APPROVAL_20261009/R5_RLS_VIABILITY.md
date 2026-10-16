# Evaluación acotada de viabilidad RLS R5

Estado: TECHNICAL_ASSESSMENT_COMPLETE_OWNER_SCOPE_PENDING. RLS=NOT_IMPLEMENTED según inventario PostgreSQLR3; no se inspeccionó QA ni se creó PG R5. Rector26 §1 (S04) dice «RLS para tablas críticas cuando sea operacionalmente viable». Es obligación condicional de defensa en profundidad, no una recomendación opcional general; tampoco define lista universal de tablas/predicados ni demuestra viabilidad runtime.

## Candidatos derivados del slice

24tablas existentes candidatas en evidence/continuity-r5/rls-critical-candidates.json, tomadas de expected-schema237: pertenencia/asignacionesIAM, evidencias/versiones/archivos, Privacy/contexto/retención, EffectiveConfiguration/layers y audit/idempotency/outbox. Son candidatas técnicas por contener acceso de tenants, PII, binarios o historia y autoridad; no lista aprobada de implementación. Tablas mixtas IAM/Retention/Audit no admiten asumir tenant_id=current_context como única policy; GLOBAL_REFERENCE/PLATFORM_CONTROL y operaciones globales necesitan separación explícita. IAM.user_identities y platform.tenants exigen evaluación propia de autoridad global, no se incluyeron como tenant tables por analogía.

## Amenazas y límites observados

1. Lectura SQL con tenant predicate omitido: controles de repositorio/autorización protegen rutas actuales, pero FKs por sí solas no filtran SELECT. RLS podría aportar defensa adicional si el actor/contextoDB está vinculado de manera confiable.
2. Cambio de tenant en pool: createDatabase usa pg.Pool de20conexiones (database.ts:9–18); la ruta de autorización valida membresía propia en transacción read-only repeatable-read (frontend-projections.ts:69–92). No se encontró protocolo aprobado de contextoRLS dentro de esos consumidores. Diseño debe garantizar limpieza entre transacciones, error/rollback y trabajos/background sin heredar tenant anterior. No se inventa un nombre de GUC ni se implementa SET LOCAL.
3. Platform authority y plantillas mixtas: no se habilita acceso cross-tenant con bandera support/admin. Roles, grants, finalidad y auditoría necesitan contrato vigente por operación. 33/34 requieren ceremonia explícita; políticasRLS no pueden impedir su auditoría ni conferir bypass general.
4. Owner/superuser/BYPASSRLS: deben verificarse atributos y ownership del actor runtime real después de autorización. El usuario postgres descartable deR3 no prueba el rol runtime. No se afirma seguridadRLS bajo un owner/bypass no inspeccionado.
5. Auditoría/outbox: policies deben admitir escrituras legítimas atómicas y proteger reads históricos por ownership; fallos de audit siguen abortando cambios. Backup/restore debe preservar todas las filas autorizadamente, no producir un backup filtrado presentado como completo.

## Viabilidad por componente

PostgreSQL16 soporta RLS; capacidad tecnológica disponible. Contexto/conexión/predicados/aprobación de scope no cerrados. Roles runtime/ownership/bypass, planes y p95, pooling/worker/globaltemplates y restore NO_VERIFICADOS en entorno real. No se declara NO_VIABLE ni PASS a partir de esa ausencia. Recomendación técnica: cerrar contrato de contexto/roles/predicados y probar las24candidatas o subconjunto exacto aprobado en base propia descartable antes de decidir aplicación real. Cambiar constraints/IAM para sortearlo no es admisible.

## Pruebas necesarias tras alcance aprobado

TenantA/B para SELECT/INSERT/UPDATE/DELETE y reference hidden; contexto ausente/inválido; cambio/rollback/error/reuso de conexión; roles owner/bypass frente a runtime; permisos/entitlements/SoD/revocación; workers/serviceprincipals; tablas mixtas global+tenant; auditoría/outbox transaccional; export/backup/restore; límites de latencia vigentes. No son tests ejecutadosR5. Se exige nuevo delta exacto firmado, migración forward-only y gates aplicables; RLS no se implementa en esta iteración.

Mecánica PostgreSQL cotejada con documentación primaria16: https://www.postgresql.org/docs/16/ddl-rowsecurity.html y https://www.postgresql.org/docs/16/sql-set.html (consulta2026-10-09). Roles superuser/BYPASSRLS eluden policies; owner normalmente también, salvo FORCE para owner. SET LOCAL limita el ajuste a la transacción. Son capacidades técnicas, no autoridad para diseñar el contexto GRC. Fuentes y amenazas del producto derivan de rector26/modelo y consumidores focalizados, no de ejemplos de PostgreSQL.
