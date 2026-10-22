# Procedimiento concreto propuesto para desbloquear G4 — NO EJECUTADO

La aclaración PO actual autoriza únicamente inspección de respaldos. No se crea copia, no se descifra, no se restaura ni se modifica infraestructura. Este documento se ofrece para una decisión posterior específica.

## Evidencia disponible

Existen dos referencias históricas de backup cifrado en scripts canónicos STEP6A3 (BACKUP_REFERENCES.json). No se pudo verificar su existencia, fecha, checksum real ni recibos actuales: el SSH metadata-only al host QA fue rechazado por autenticación. No se sustituye esa carencia por el texto de un script ni por una referencia ficticia al runner. La copia histórica R2 debía tener33 migraciones; QA actual tiene34 y datos posteriores potenciales. archive_mode=off y0 WAL archivados no acreditan PITR. Un backup autónomo puede ser recuperable sin PITR, pero requiere su propia restauración verificada.

El catálogo actual cuenta otras cuatro bases de usuario conectables y0 tablespaces externos. Los scripts pg_basebackup existentes copian el clúster entero: no deben ejecutarse bajo una autorización limitada a tcdx-grc, ni se presume que esas otras bases sean QA. No se conectó a ellas ni se leyó su contenido.

## Opción A: verificar una copia existente

Un operador con acceso ya autorizado a db-v4 debe facilitar metadatos de la copia y recibos, sin archivos de datos ni secretos: fecha/punto de consistencia, alcance, tamaño/checksum del cifrado, custodia y retención aplicables, versión PG, resultado real de restauración aislada y comparación con el esquema/ledger/datos del punto recuperado. Si no permite recuperar el estado necesario de tcdx-grc antes del DDL sin afectar otras bases, no satisface G4. No basta un archivo no vacío o poder listar un tar.

## Opción B: crear y validar una copia nueva sólo de tcdx-grc

Requiere una orden posterior específica de backup+ensayo aislado. No autoriza la migración por sí sola.

1. Identificar el destino de custodia cifrada aprobado y el entorno de restauración aislado. Reutilizar recursos existentes sólo tras demostrar su identidad/aislamiento y capacidad. Si no existen, solicitar el alcance de infraestructura correspondiente; no crearlos por inferencia. Operador mantiene clave/passphrase por canal seguro, nunca chat/repositorio/log. No se cambia archive_mode, configuración global, red ni otras bases.
2. Capturar un respaldo lógico consistente **exclusivo de tcdx-grc**, con utilidades PostgreSQL16, por ejemplo pg_dump formato custom dirigido mediante pipe directamente a cifrado AES256 en la custodia aprobada. No usar pg_dumpall ni pg_basebackup de todo el clúster. No guardar dumps planos en /tmp, repo o escritorio. Directorio privado0700, fichero0600; credenciales sólo por mecanismo seguro existente. Registrar versiones, timestamps, límites y referencia del snapshot; capturar schema/ledger y agregados del mismo snapshot para comparación, sin exportarlos como datos sensibles a evidencia pública.
3. Verificar el flujo cifrado y SHA256 del artefacto final; conservar metadatos mínimos de alcance/punto/retención. El hash es evidencia de bytes, no de restaurabilidad. El plan de captura debe preservar consistencia entre dump y metadatos, sin bloquear o matar sesiones de terceros. No copiar datos de otras bases.
4. En el destino aislado aprobado, descifrar por streaming y restaurar con utilidades PG16, errores fatales y transacción cuando sea compatible. El almacenamiento de la restauración contiene datos QA reales: requiere cifrado/aislamiento y custodia aprobados. Sin endpoints externos, sin bootstrap de app/IA, sin emails/jobs, sin IAM/registry activados fuera de los datos recuperados de esa copia. No lanzar scripts de restore genéricos contra QA: scripts/foundations/verify-restore.ts es un test antiguo delocalhost, escribe plaintext temporal y espera10 migraciones; no sirve sin revisión como prueba del estado QA actual34.
5. Comprobar arranque PG16, integridad de tablas/constraints/índices/FKs, fingerprints de esquema, los34 IDs/checksums del ledger y agregados invariantes de la copia/snapshot. Comparar conteos y evidencias minimizadas, sin volcar cuerpos, PII, tokens o payloads. Documentar exactamente qué cobertura fue probada y qué no. Una restauración sintáctica sin comprobaciones no es PASS.
6. Emitir recibo de recuperación: referencia cifrada/SHA256, punto recuperable, verificación real, alcance/limitaciones, roles/custodia y fecha. Resolver retención o destrucción del entorno con la política/orden aprobada; no destruir copias de terceros. Esa referencia real, nunca un texto inventado, se utiliza como DATABASE_BACKUP_REFERENCE en el runner.

## Rollback y GO posteriores

Con G4 acreditado, completar G2/G3 y repetir preflight final. La ventana de30min ya autorizada comienza sólo entonces. Antes de commit, el runner debe revertir DDL+ledger completo ante error. Después de commit, restaurar datos reales es una operación de recuperación coordinada, con alcance QA y decisión correspondientes; no se promete rollback mágico ni se reinstala un UNIQUE global incompatible con versiones futuras. No restaurar un clúster entero sobre las otras cuatro bases.

Decisión concreta propuesta si la opciónA no puede acreditarse: autorizar backup lógico cifrado **sólo tcdx-grc** y ensayo de restauración en un recurso aislado/cifrado identificado, con custodia y limpieza definidas. Crear ese recurso si no existe requiere autorización explícita. Hasta entonces G4=BLOCKED y no hay DDL.
