# INTEGRATED_QA_RELEASE_20261022

Resultado: PARTIAL. Backend, frontend, cuatro operadores y activaciones aprobadas están operativos en QA. Falta acreditar el E2E positivo completo de escritura/revisión/aprobación con identidades independientes reales; no se declara completitud funcional integral.

Baseline: TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16. Fase POST_STEP6A4_PRE_STEP6A5. RECTOR_GATE=PASS para las operaciones ejecutadas; HUMAN_UI_REVIEW no autoaprobado.

## Git y componentes

Rama existente fix/step6a3-v112-continuity-20261016, recibida en 4a275264a7522031e62bf09f598c9d56e21d25e0. Trabajo aprobado clasificado por contratos, backend, frontend y operaciones/evidencia; commits coherentes, sin git add indiscriminado, force push ni historia reescrita. Custodia privada, respaldos y caches excluidos y preservados.

Los nueve commits funcionales y la localización del commit de sellado están en RESULT.json. El sellado completa diez commits y 2.092 archivos consolidados del alcance acumulado: 2.027 nuevos y 65 modificados, sin eliminaciones. Esto incluye fuentes y evidencia histórica previamente local; no significa 2.092 cambios funcionales nuevos en esta sesión.

Backend QA grc-bk/192.168.2.45, revisión 683da92fc7f3f2a92bd1bfd9b12d4d2dbe53660c:
sha256:c83db1816720e52f615768a044e5d0e16b215a4404ab280cb8ab9461b8503152.

Frontend QA grc-www/192.168.2.46, revisión 97a00013f48b1b630ddb34c41754472ced3c1395:
sha256:23bdcd90072905064e554a8a188b3455a93f052d2b8cf219bc631cd4192b56d6.

Son IDs de imagen Docker direccionados por contenido, verificados después de save/load, no RepoDigests de un registro inexistente. Imágenes linux/amd64 completas, Dockerfiles/base fijados y lockfile congelado. El código funcional frontend/contratos consumidos es idéntico entre ambas revisiones; sólo difiere después un test de conteo del catálogo. Correcciones posteriores afectan backend/operación, conforme a la política vigente de releases por componente.

Cuatro operadores privados actualizados a la imagen backend final, sockets existentes y credencial M2M bajo custodia QA preservados. iam.library.publish disponible, autenticación OAuth2 client credentials RS256 fresca, sin identidades nuevas. Despliegues saludables y rollback de contenedores conservado.

PR borrador: https://github.com/Tecdex-SpA/tcdx-grc/pull/23. Main no fusionada; protecciones/revisión humana preservadas. Rector CI del commit fuente683da92 SUCCESS; la comprobación se vuelve a ejecutar al publicar el sellado.

## Activaciones y datos

Publisher canónico autenticado: ocho permisos, 39 relaciones globales/templates, trece bindings B06 y cuatro Definitions/scopes/reglas; 64 creaciones y 64 auditorías. Tras autorización PO explícita del tenant TecDex 01a0cfc7-0c97-75a3-890f-d6ca9db8bbe9, delta exclusivo de 30 relaciones tenant y 30 auditorías. Total94 auditorías. Ambos replays: cero creaciones y cero auditorías. IDs, comandos, hashes de manifiesto y recibos en RESULT.json.

Definitions v1 publicadas con defaults SQL NULL, sin default Platform ficticio, scope control_version. Vigencia PO: [2026-10-22T17:13:37.474Z, 2027-10-22T17:13:37.474Z), exactamente un año calendario desde el inicio registrado y aprobado. No se cambiaron fechas al extender el destino tenant.

ACME-1 y otros tenants no activados. No usuarios, roles, asignaciones humanas ni proveedores de identidad creados/modificados para superar pruebas. H04 funcional desplegado; nueve pruebas sintéticas sobre el backend real y evidencia privada cifrada/versionada PASS, con eliminación verificada de la única versión de prueba. Cero filas de derechos/fuentes/contenido normativo creadas por esa prueba.

PostgreSQL16.15 verify-full, 36 migraciones exactas, migración36 no reaplicada, 244 tablas/3.630 columnas, catálogos físicos íntegros. De244 fingerprints,234 sin cambio; ocho tablas con deltas operacionales exactos y dos con auditoría/autenticaciones reales. Ningún cambio fuera de esa lista.

Respaldo preactivación INTEGRATED-QA-45c8f11cf2604f1298230fa3cbcf8ea5, SHA25633ef786fe9d916c0325f9c6ffc461b0e268351bdab6bfa5189bf3529e5baac23, restaurado y comparado en PostgreSQL16 aislado:245 tablas incluyendo ledger, sin red ni volúmenes persistentes. Custodia privada FileVault; no PITR declarado.

## Pendiente real

Lectura QA acreditó cero GRC_MANAGER activos independientes del PO en TecDex. No es lícito fabricar el actor, autoaprobar ni ampliar privilegios. El PO debe identificar una identidad humana existente independiente y decidir su asignación canónica GRC_MANAGER en ese tenant; luego se podrá autenticar legítimamente y cerrar el E2E positivo de escritura/revisión. No hace falta crear roles ni M2M.

La metodología integrada quedó incorporada a AGENTS.md y CODEX_RECTOR_ENFORCEMENT.md. Baseline inmutable, esquema, contratos funcionales y topología no cambiaron para resolver incidencias. Sin producción, importaciones ISO comerciales, STEP6A5 ni STEP6A6.
