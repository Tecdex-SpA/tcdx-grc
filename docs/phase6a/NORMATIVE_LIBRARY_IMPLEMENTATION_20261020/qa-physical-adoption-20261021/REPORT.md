# Adopción física QA gobernada — resultado NO-GO

**QA_PHYSICAL_ADOPTION=NOT_EXECUTED.** G4 permanece BLOCKED conforme a la aclaración PO; no se ejecutó DDL, DML de negocio ni escritura técnica de ledger. No se crearon backups, copias de datos, restores, contenedores, roles/grants, migraciones activas o contratos sucesores publicados. La autorización de30min queda registrada y **su ventana no ha comenzado**.

## Autoridad y preservación

Baseline activa TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16, ACTIVE_ACTIVATION y gate rector íntegros. Se leyeron AGENTS/rector46/enforcement, plan canónico de migraciones11, expedientes pedidos, fuentes de recuperación y verificador canónico. ZIPv1.4 disponible revisado como historia, sin sustituir v1.12. PV-H04-01 continúa CONTRACT_PUBLISHED_VERIFIED. Los5.256 archivos de entrada se verificaron por SHA256:4.359 originales+850 físicos+16 publicación+31 preflight; ningún archivo previo modificado, incluidos database/migrations/manifest.json, database/expected-schema.json y scripts/foundations/verify-schema.ts. Rama/HEAD/índice preservados. Sólo se agregan archivos de este expediente.

## G1: identidad, perímetro y ventana

QA observada192.168.2.40:5432/tcdx-grc, PostgreSQL16.15 Ubuntu, cluster16/main, usuario postgres. La sesión se forzó READ ONLY/on desde startup y BEGIN REPEATABLE READ READ ONLY, con statement_timeout5s y lock_timeout1s, guardando identidad antes de consultas. La cuenta es superusuario; es la única credencial local disponible y owner de las relaciones observadas, no se presenta como mínimo privilegio intrínseco ni se crearon cuentas. No hay conexión a aplicación/producción.

El muestreo encontró una sesión ajena idle, sin transacción abierta, ninguna transacción>30s, ningún lock pendiente ni preparado. Es una observación, no una reserva permanente. El PO autorizó30min desde que TODOS los gates previos estén PASS. G1 tiene identidad y autorización de ventana acreditadas; el chequeo inmediato de actividad sigue siendo requisito de un GO futuro. No se interrumpe ni mata ninguna sesión.

## G2: reconciliación transversal

ARCHITECTURE_IMPACT_MATRIX.json enumera112 objetos/dimensiones previstos desde los contratos publicados: dos tablas, cuatro columnas nuevas en tablas existentes, ocho funciones únicas, doce triggers, reemplazo UQ y sus FKs/checks/índices/columnas de soporte. Cada fila contiene fuente/versión por hash/statement, entidad canónica, owner lógico, módulos consumidores, tablas, tenant scope, RBAC/SoD/historia, efecto sobre datos y evidencia. No se crea un catálogo IAM, motor de matrices/resultados ni autoridad editorial paralelos. La función H04 global correcta procede del recibo PV-H04-01; no consulta tenant_id en RegulatoryPackVersion.

Se capturó el catálogo QA completo relevante:243 relaciones (242 tablas de dominio+ledger),3.601 columnas,2.857 constraints,2.215 índices,24 funciones en namespaces de dominio seleccionados y34 triggers. Fingerprint SHA256 y definiciones/hashes en PRE_GATES_READONLY/QA_SCHEMA_FINGERPRINT. El cierre transitivo por FKs conecta242 tablas: no hay constraints sin validar ni índices inválidos/no listos en ese cierre. No se afirma prueba exhaustiva de filas, permisos, semántica de consultas o runtime de todos esos módulos. La comparación con los metadatos del preflight anterior no encuentra drift imprevisto en relaciones/columnas/constraints/índices examinados antes.

**Dependencia antidrift pendiente:** la proyección operativa y el verificador canónico siguen esperando242 tablas y el UQ global de KnowledgeVersion. Aplicar sólo DDL dejando esos artefactos así produciría divergencia. G2/G3 no se declaran PASS de adopción por haber preparado una matriz. CANONICAL_INTEGRATION_PLAN.md identifica el trabajo técnico derivado de contratos ya aprobados, sin reabrirlos ni modificarlos.

## G3: historial y candidata canónica

Las34 filas actuales del ledger coinciden exactamente con filenames, transactional y SHA256 del manifest y de cada archivo local. Ninguna migración aplicada fue editada. Se identificó el único runner oficial: scripts/foundations/migrate.ts, advisory lock canónico y ledger INSERT atómico con DDL. El runner exige una referencia real de backup/PITR antes de mutación; no se usa una cadena ficticia ni ISOLATED_REBUILD/test-mode en QA para sortearlo.

Se preparó una candidata35 y manifest propuesto **sólo dentro de candidate-migration/** de este expediente. La candidata concatena los tres bloques DDL publicados byte-idénticos, con offsets/hashes verificables: B01–B09/41 sentencias, H04_SQL_GRAMMAR/4 y PV-H04-01/1. Se verificaron offline46 sentencias/nueve definiciones de función (ocho funciones únicas, una reemplazada) con gramática SQL y PLpgSQL16.1. Sin DML de negocio ni seeds. No está registrada en el manifest activo ni se lanzó el runner.

Falta integrar/reconciliar los artefactos canónicos derivados y demostrar con el runner real rebuild/reapply/checksum/rollback del nuevo conjunto en entorno desechable autorizado. Los149 tests físicos anteriores no cubren ese nuevo empaquetado/verificador y no se vuelven a etiquetar como prueba de migración. G3=BLOCKED, no PASS por sintaxis.

## G4: inspección de respaldos y bloqueo real

No se aportó una referencia recuperable verificada. El PO delimitó que sólo se revisen mecanismos existentes en lectura, sin inferir creación de copias, configuraciones, restores o infraestructura. Se localizaron en scripts dos referencias históricas de backup cifrado: cLtKoTUJ (SHA3d60cc...) y w5UXYYlC (SHA776b79...). La segunda pertenecía a una prueba de restauración con33 migraciones antes de R2; QA tiene34. Fecha exacta del fichero, existencia y checksum actual, custodia y estado de recuperación vigente: NOT_VERIFIED. No se declaran inexistentes por no poder verificarlos.

La lectura remota de metadatos/recibos por SSH al host QA fue rechazada por autenticación. No se probaron contraseñas ni identidades arbitrarias, no se descifró o copió ningún archivo, no se alteró acceso. BACKUP_METADATA_READONLY.json registra el error; BACKUP_REFERENCES enumera rutas/hashes declarados y su incertidumbre.

QA tiene archive_mode=off, cero WAL archivados, sin fecha de último archivado: PITR no acreditado. Eso no demuestra que todo backup sea irrecuperable; exige comprobar su restauración autónoma. La inspección adicional de pg_catalog muestra **cuatro bases de usuario conectables adicionales**, cero tablespaces externos y cero basebackups activos. No se consultaron sus nombres o datos ni se conectó a ellas. Ejecutar el pg_basebackup histórico copiaría el clúster entero, ampliando el perímetro tcdx-grc sin autorización suficiente.

RECOVERY_PROCEDURE_PROPOSED.md ofrece dos vías: verificar evidencia de una copia existente que recupere el estado necesario, o una orden específica posterior para un respaldo lógico cifrado exclusivo de tcdx-grc y ensayo de restore en un recurso aislado/cifrado identificado. No se propone usar sin revisión verify-restore.ts antiguo (plaintext temporal y expectativa de10 migraciones), ni crear un entorno o exportar datos por inferencia. No se ha creado ningún punto de recuperación nuevo. G4=BLOCKED.

## GO/NO-GO y siguientes pasos

GO_NO_GO.json=NO_GO. ARCHITECTURAL_CONSISTENCY_GATE=BLOCKED; MIGRATION_INTEGRITY_GATE=BLOCKED; PREFLIGHT_FINAL_GATE=BLOCKED. G1 ventana30min autorizada, aún no iniciada. DATABASE_DRIFT_GATE y POST_ADOPTION_INTEGRITY_GATE=NOT_RUN porque no hubo adopción. El control de drift preliminar acotado PASS no se confunde con el gate posterior.

El preflight final de objetos/datos/ledger/sesiones/locks se repetirá inmediatamente antes de un eventual GO, no ahora para aparentar cumplimiento mientras G4 y la cadena canónica están pendientes. Rollback transaccional previo al commit y recuperación de un estado comprometido son pruebas distintas; no se prometen sin ensayo. No se restauran constraints globales incompatibles ni se borra historia como compensación.

Siguiente decisión específica PO: proporcionar evidencia recuperable verificable de copia existente, o autorizar el procedimiento concreto de backup lógico cifrado sólo tcdx-grc y restauración aislada descrito, con recurso/custodia/retención identificados. La ventana ya está aprobada: no necesita nueva ratificación. En paralelo queda la reconciliación técnica canónica indicada, sin nueva decisión conceptual B01–B09/H04. Todos los límites operacionales permanecen: no IAM/registry/Definitions, importación, rutas/policies/hooks runtime, deploy, producción, nueva publicación contractual o Git mutante. STEP6A5/STEP6A6 NOT_STARTED.
