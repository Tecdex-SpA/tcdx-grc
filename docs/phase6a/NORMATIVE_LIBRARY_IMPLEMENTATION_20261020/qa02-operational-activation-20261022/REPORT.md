# QA-02 — habilitación operacional B01–B09/H04

QA02_GATE=BLOCKED. RECTOR_GATE=BLOCKED para la habilitación solicitada; RECTOR_BASELINE_INTEGRITY=PASS. No se ejecutó ninguna activación. La autorización PO actual es suficiente dentro de su alcance; el bloqueo es técnico, no una nueva aprobación administrativa ni una exigencia de licencias ISO.

Baseline activa: TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16. Fase POST_STEP6A4 / Biblioteca Normativa intermedia / PRE_STEP6A5. STEP6A3/STEP6A4 conservan sus cierres anteriores. STEP6A5/STEP6A6 no iniciados; detenido antes de QA-03. Dominio canónico https://grc.tecdex.net/.

## Resultado comprobado

QA-01 continúa íntegro: su verificador actual pasó con `--check-backup`. Se verificó el archivo privado del respaldo QA01-LOGICAL-0680ff6898e747d8ba2d56b9a171e1ca sin volver a extraer ni restaurar la base. No se reaplicó migración 36. La conexión física se limitó a db-tecdex/192.168.2.40:5432/tcdx-grc, TLS verify-full, PostgreSQL 16.15, cluster 16/main y system_identifier 7640968386355389904.

Las 36 filas completas del ledger, catálogo, ACL y 244 fingerprints / 5.097 filas de dominio son idénticos a QA-01 y entre las lecturas inicial y final. El verificador canónico informa 244 tablas de dominio, 3.630 columnas, cero mismatches, cero cascadas DELETE prohibidas, 217 tablas tenant-scoped y 510 FK tenant compuestas. Las 245 PK incluyen el ledger técnico. No hubo DDL, DML, pruebas con escrituras, residuos ni nuevas auditorías de activación.

Los ocho permisos nuevos están ausentes; existen los tres permisos de configuración reutilizados por B06. Los 13 bindings objetivo están ausentes, así como las cuatro Definitions. KnowledgeSource y KnowledgeSourceUsageRight están vacías. Ninguna fuente ISO comercial fue activada o importada. Los recibos conservan los trece identificadores contractuales, cuatro códigos/versiones, permisos y referencias reales. Los IDs físicos pendientes se registran como NULL, no se inventan.

## Impedimento de ejecución

El runbook requiere `iam.library.publish` por el mismo operador privado y autenticación M2M fresca. `IamPublicationService.publishNormativeLibrary` autentica la credencial dedicada y resuelve el principal existente antes de abrir la publicación; el publisher actual realiza IAM, B06 y Definitions juntos en una transacción atómica. Esta dependencia canónica sustituye la separación orientativa de pasos de la orden PO.

El principal `grc-qa-iam-publisher`, ID 01a13c3b-dbdd-763f-bcbb-f16ff41d99ba, está activo y su auditoría de provisión existe. Sin embargo, esta sesión local no dispone de `/run/secrets/iam_publisher_client_secret`, del archivo local convencional `.secrets/tcdx-grc-qa/iam-publisher-client-secret`, ni de `/run/tcdx-operator/catalog.sock`. No hay configuración de publicación IAM/Library en el entorno local. Las comprobaciones sólo consultaron presencia y metadata, nunca valores secretos.

La orden permite conexión exclusivamente a PostgreSQL QA y prohíbe despliegues e infraestructura. No se accedió por SSH al backend ni se transportaron secretos remotos. Una sesión SQL administrativa no acredita el proof M2M exigido. Llamar directamente al writer transaccional con un ID obtenido por SELECT eludiría la autenticación canónica. Por ello IAM/B06/Definitions no se ejecutan; H04 queda detenido por esa dependencia y tampoco se fabrica un contexto humano autenticado ni evidencia de custodia privada.

En el inventario de candidatos, TECDEX y ACME 2 tienen las referencias de roles requeridas; ACME-1 carece de siete roles base: TENANT_ADMIN, GRC_MANAGER, COMPLIANCE_MANAGER, CONTROL_OWNER, EVIDENCE_OWNER, ACTION_OWNER y VIEWER. Incluir ACME-1 en `tenantIds` produciría conflicto canónico. Esta es una limitación de ese candidato, no una autorización para crear roles, corregir onboarding o seleccionar todos los tenants activos. No se emitió input de activación ni intervalo arbitrario.

## Continuidad y pruebas

Los verificadores históricos de preparación, Definitions y B04 fallan sobre snapshots anteriores a sucesores ya sellados. Sus errores originales se conservan. CONTINUITY_RECONCILIATION verifica todos sus entries y seals en memoria usando preimages exactas de QA-01, Definitions y preparación; no cambia archivos históricos ni relaja sus verificadores. El verificador QA-01 actual pasa completo. Gobernanza/integridad rectora, status y los tres generadores `--check` pasan.

La primera conexión desde sandbox falló EPERM sin contactar exitosamente QA; se conservó PRE.json. El reintento autorizado fuera del sandbox completó PRE_RETRY y el postcheck. Una primera herramienta local de metadata falló por resolución de imports TypeScript; se conservó LOCAL_READINESS.json y se corrigió sólo el script del expediente para verificar directamente fuentes y hashes publicados. LOCAL_READINESS_RETRY pasó. Ninguno de estos intentos ejecutó activaciones.

No se repiten las 200 pruebas locales o los diez browser del cierre anterior: no cambió código de producto. No se declara ALLOW/DENY funcional QA, SoD operativo, H04 positivo/negativo, idempotencia de activación, integración HTTP/MinIO ni E2E de interfaz real. La preservación RBAC/default DENY/aislamiento se acredita únicamente por ausencia de cambios en todas las filas, catálogo y contratos, no por nuevas pruebas funcionales.

## Capas y trazabilidad

Sólo se crean archivos dentro de este expediente. Ningún archivo recibido se modifica, incluido MASTER_EXECUTION_STATUS, para conservar íntegra la continuidad verificable QA-01. ENTRY y FILE_MANIFEST prueban los hashes, la rama, HEAD e índice. No hubo staging, commit, push, merge, reset, clean, stash ni cambio de rama.

Base de datos, contratos ejecutables, backend, frontend, infraestructura y contratos de despliegue: SIN CAMBIOS. Servicios backend/frontend: no contactados ni alterados; su salud no se acredita por este preflight PostgreSQL. Conflictos semánticos rectores nuevos: NONE. Dependencia técnica pendiente: ejecutor autenticado canónico accesible y definición operacional de destinos elegibles/intervalo al reanudar.

Trazabilidad: autorización PO QA02 → AGENTS/rector46/22/21/23/25/29/45/enforcement → QA01 verificado → preparación/B04/Definitions y preimages selladas → catálogos/registries/hashes36 → QA read-only PRE_RETRY → esquema canónico → inventario y dependencia M2M → cero activaciones → POST idéntico → cuatro recibos BLOCKED/RESULT/verificador offline.

Verificación: `python3 docs/phase6a/NORMATIVE_LIBRARY_IMPLEMENTATION_20261020/qa02-operational-activation-20261022/verify.py`. La integridad del expediente puede pasar con QA02_GATE=BLOCKED; no convierte la habilitación en PASS.
