# Paquete operacional QA — preparado, no ejecutado

725 pruebas locales PASS,0fallos,0omitidas y38casos UQ nativos PASS permiten preparar este paquete; no autorizan QA. El plan preciso y dependencias están en QA_OPERATIONAL_PLAN_R1.json. Firma macro C16 pendiente; los artefactos de publicación/build/DDL activos aún dependen de ella. No se solicita una aprobación operacional genérica ni se rellenan cuentas, credenciales, IDs de migración o hashes inexistentes.

Antes de presentar el acto QA final deben estar cerrados CT01/03/04, CFG-D, catálogos, nueva migración y hashes de release. Preflight readonly.sql ya preparado es el inventario canónico permitido sólo tras autorización específica. Los datos incompatibles abortan sin backfill. Delta fuera de migrations activas; migraciones históricas y QA intactos. DDL exclusivamente en clúster local descartable identificado; su resultado no prueba RLS, QA, IAM real ni E2E externo.

Futuro recovery: fallo antes del commit revierte toda la transacción; después del commit corregir forward-only o restaurar mediante plan humano específico sin eliminar nuevos registros. Prohibido reinstalar global UNIQUE(tenant_id)/UNIQUE(ordinal) cuando nuevas cardinalidades válidas ya existen.
