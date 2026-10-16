# Paquete de promoción QA R5

PREPARED_NOT_READY_NOT_AUTHORIZED_NOT_EXECUTED. Destinatario Andrés Barouh PO, funciones QARelease/DBA/Security/IAM. R3 operacional intacto, SHA256 3a1451f6b733fc7c2f45b46b9bf376364dcd24428affe1a2062256b640afc0e8; R4 intacto. R5 incorpora preflight y gates por etapa, nunca órdenes de ejecución.14artifacts y454build hashes coinciden en evidenciaR5; no prueban digest/imagen deploy.

## Candidato y contratos

Fuente HEAD6af66387aa03fa185ef139584de07700f247b903, rama step6a3-internal-governance-v18-20261009, worktree heredado+R5documental. No nuevo build/contrato efectivo/runtime. ManifestR5 sella sólo preparación. Antes de promoción, congelar candidato completo y sus fuentes/tests/build/images después de aprobar deltaIANA y resolver inputs. Contratos29/30/31/32 locales preservados; GETEC R1 intacto. Dominio único https://grc.tecdex.net/; internos DB192.168.2.40/bk192.168.2.45/www192.168.2.46. No conexión a ninguno enR5.

## Etapa P0 autorización de inventario

Operación propuesta: sólo lectura agregada de ledger/esquema/RLS/vocab/constraints y elegibilidad de actor, sin dump de PII. Falta nombre/identidadDBA, ServicePrincipal PLATFORM_CONTROL activo existente autorizado33/34, cuentas/membresías/roles/entitlements QA y ventana expresa. No se crean usuarios/grants/secretos ni se reutiliza actor de fixtureR3. Ventana propuesta como secuencia: inventario supervisado → revisiónGO → backup/restore descartable → ventana de locks y smoke aprobada; fecha/hora/duración NO_FIJADAS por falta de inputPO, no autorización implícita.

Consultas de metadatos propuestas para revisar después de autorizar (NOT_RUN): BEGIN READ ONLY; SELECT current_database(), inet_server_addr(), inet_server_port(), current_setting('server_version_num'); SELECT migration_id,filename,content_sha256,transactional FROM platform.schema_migrations WHERE outcome='applied' ORDER BY migration_id; SELECT n.nspname,c.relname,c.relrowsecurity,c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname IN ('iam','evidence','privacy','config','ops_audit'); ROLLBACK. Backend readiness exige PostgreSQL16/base tcdx-grc. Inventariar políticas/owner/runtime superuser/BYPASSRLS con rol real previamente identificado; no atribuir postgres descartable a runtime. Limitar SQL y resultados al scope aprobado.

DatosUQ/default: usar preflight.readonly.sql y existing-data.predicates.readonly.sql ya sellados en physical-reconciliation; confirmar hashes del manifestR3 antes de uso, origen de constraints validated y duplicatesNULLsafe, capas/padres/niveles, defaultcount/tipo/estado, FKs e historia. Resultado incompatible aborta, sin backfill/reordenación/coerción. VOC-C04: inventario por14familias/26ocurrencias usando mapping publicado30/23; counts por tenant/contexto/versionado y canonicalcode; valores desconocidos se minimizan y no se exportan filas/PII. No asumir compatibilidad desde vacío descartable.52valores publicados no limitan por sí solos futuros consumidores.

## Etapa P1 backup recuperación y runner

BackupPITR/cifrado con identidadDBA y destino autorizado; restore sobre recurso aislado controlado y comparaciones ledger/counts/FK/index/constraints. No se da backupPASS sin ejecución.33/34 siguen fuera del manifest activo32; requieren nueva integración canónica exacta aprobada, checksum/actor/ceremonia transaccional y auditoría. No añadirlos a manifest sólo por firmar este paquete. Migraciones31UQ/default y32permisos ya aprobadas localmente;33adopciónaudit y34D01/D02 precisan autoridad real, locks e historial coherente. Snapshotgrants yAuditEvent antes/después sin falsaINSERT ni retrofechas. Nada se ejecuta enR5.

## Etapa P2 GO NO GO y promoción

GO exige fuentes CFG-D/bindingCT04/proyecciónIANA publicados y pruebas requeridasPASS; inventario compatible; backup/restore real; identidad/actor/runner/hashes/ventana/lista de actos aprobados; candidato imagen/assets sellado. RLS se evalúa contra obligación condicional rector26, sin marcarPASS físico ausente. NO-GO ante identidad/hash/contexto/SoD/entitlement/auditoría incorrectos, datos incompatibles, missinglegalbinding o aprobación ausente. Autorización de inventario no autoriza DDL/grants/deploy.

Smoke por cuentas reales autorizadas: CT01versions/licencias/historia;CT03membership activa/cursor2/revocación/guardescritura;CT04pending vs aplicación jurídicamente vinculada;GETEC400/401/403/404/coherencia;44pares yD01/D02scopes/11lectores/custompreservados;VOC52provenance/códigos históricos;UQdefault/concurrencia/rollback;UTCZ/IANA/DST/contextswitch;tenantA/Bnegativos;auditoría atómica,secretminimization;assets MIME/hash/deeproute/reload y revisiónUI humana. API/IAMsimulados no pasan E2Eexterno. Manuales caso a caso con registro real, no firma anticipada.

## Recuperación y punto de autorización

Antes de commitBD rollback transaccional; después recuperación forward-only aprobada que conserve nuevos registros contextualizados e historia. No reinstalar UQtenant/globalordinal, resucitar grantAUDITOR ni borraraudits. Backuprestore coordinado necesita decisión explícita preservando escrituras posteriores. Rollbackdeploy sólo con candidato anterior exacto y plan autorizado; no suponer disponible. Paquete posterior debe nombrar targets/actores/fechaUTC/hashes/acciones; la firma macroR5 de preparación no ejecutaQA. QA/IAM/E2Eexterno/deployNOT_RUN.
