# I06 — Verificaciones y límites

Evidencias iniciales GATES.json: batería ampliada548 tests con542 PASS/seis fallos históricos; GATES_FINAL.json preserva un error transitorio de tipado del helper de test (referencia Node faltante), corregido sin dependencias nuevas. Evidencia anterior no se sobrescribe.

FINAL_VERIFICATION.json y logs final-*: 49 archivos/550 tests PASS, excluyendo explícitamente *.postgres.test.ts. Incluye todos los tests de contratos/frontend y los módulos backend afectados/regulatorio/configuración. Builds contratos/backend, typecheck frontend, build frontend y derivados de biblioteca PASS; assets existentes y checks rectores PASS en sus logs. La advertencia preexistente de chunk >500kB se conserva, no se presenta como error o gate de performance resuelto.

Cambios posteriores focalizados de lectura/ETag y rótulos requieren y conservan sus rechecks en LAST_VERIFICATION.json/UI_RECEIPT.json. No se repite toda la batería por cambios narrativos de este expediente.

73 pruebas focalizadas iniciales PASS; la batería final incluye casos adicionales de ETag/SQL parametrizado. Pruebas de orquestación usan dobles aislados y no acreditan atomicidad real de PostgreSQL. Custodia utiliza object store fake sólo en tests; ninguna conexión MinIO real. SQLGrammar: seis SELECT analizados en gramática PG16 offline, sin resolución de catálogos ni ejecución. Dos pruebas Playwright de harness local PASS, no E2E de producto/QA. Integración DB/RBAC runtime/E2E/QA NOT_RUN. Nunca se declara enforcement de FK o migración por parsear SQL.

Último recheck conservado: seis archivos y 110 pruebas focalizadas PASS, build backend PASS, verify-rector-governance y test-rector-governance-status PASS. Servicios de lectura nuevos sólo compilados; sus transacciones no se han ejecutado en PostgreSQL.
