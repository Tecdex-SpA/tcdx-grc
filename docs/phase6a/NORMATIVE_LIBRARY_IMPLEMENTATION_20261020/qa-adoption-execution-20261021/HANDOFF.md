# Continuidad — autorización recibida, ejecución detenida por TLS

**QA_PHYSICAL_ADOPTION=NOT_EXECUTED; decisión NO_GO_01.json. Ventana30min NOT_STARTED.** La orden PO de esta operación ya autoriza exactamente20261021221204 con respaldo QA-LOGICAL-e923e6ecc44845c6920c8fd975f34675. No volver a solicitar ratificación administrativa. Todos los controles técnicos previos realizados pasaron excepto la conexión TLS verificada del runner canónico. Mantener5.328 archivos previos byte-idénticos y este nuevo expediente; sin staging/commit/push/merge/checkout/reset/clean.

Primero ejecutar el verifier local de este expediente, sin SQL/red:

```sh
python3 docs/phase6a/NORMATIVE_LIBRARY_IMPLEMENTATION_20261020/qa-adoption-execution-20261021/verify.py
```

Leer REPORT.md → NO_GO_01.json → CANONICAL_STATUS.json → BACKUP_AVAILABLE.json → PRE.json. Fuente previa canónica: ../g4-canonical-reconciliation-20261021/HANDOFF.md y FINAL_RECOVERY_RECEIPT.json; no regenerar/amendar ni reejecutar sus scripts de generación. Los verifiers históricos con inventario cerrado no aceptarán archivos sucesores; no editarlos.

PRE.sql/inspect.py ejecutaron exclusivamente lectura QA/TLS y guard de identidad, catálogos completos, ledger34 y fingerprints agregados de242 tablas de negocio. Snapshot2026-10-21T23:20:25.957755Z: una sesión idle, sin tx/locks/prepared; todo el catálogo/ledger igual al preflight aprobado. counts del backup coinciden, igualdad completa con contenido del respaldo NOT_ASSERTED. Source de recuperación disponible/hash/permisos/FileVault verificados, snapshot lógico22:46:47Z, sin PITR. No se ejecutó apply ni verify-schema post-DDL, no hay nuevo ledger35, no hay mutaciones de negocio/DDL QA.

Bloqueo: `scripts/foundations/migrate.ts status` con Node22.23.2 y DATABASE_SSL_MODE=require no conecta: DEPTH_ZERO_SELF_SIGNED_CERT. El almacén CA del sistema no permite verificar el certificado autofirmado. No confundir libpq sslmode=require (lectura cifrada exitosa) con confianza CA del runner Node. No se aplicó no-verify/disable ni CA inventada. Pregunta pendiente al PO/administrador: indicar referencia aprobada de CA/certificado público o huella SHA256 verificada para PostgreSQL QA, sin claves privadas. No modificar certificados/configuración de servidor por inferencia.

Con ese dato, preparar una invocación canónica con confianza acotada por proceso y evidencia de origen aprobada; conservar el fallo anterior como intento01 y registrar sucesores, nunca sobrescribirlos. canonical.py sólo es wrapper de invocación del runner/verificador oficial; no un runner alternativo. Contiene guard de manifest35/últimoID/hash, test/rebuild mode desactivados y timeouts sesión60s/lock2s. Su modo apply requiere GO_NO_GO.json con todos los gates PASS y expiración de ventana; dicho archivo **no existe**, por lo que apply queda bloqueado.

Antes de GO: repetir identidad QA192.168.2.40:5432/tcdx-grc16.15/cluster16/main, TLS del canal canónico, ledger34/checksums, catálogo/fingerprints/compatibilidad y actividad actual; comprobar respaldo disponible/pertinente. Una nueva actividad incompatible o drift exige STOP, sin terminar sesiones ajenas. Registrar GO con inicio/expiración30min antes del apply. El manifest sólo puede contener esas35 filas y34 ya aplicadas, de modo que sólo35 queda pendiente. Nunca TEST_MODE, ISOLATED_REBUILD, reconstrucción o SQL manual en QA.

Después de una ejecución autorizada futura: ledger35/hash/resultado, verificador canónico, inventario exacto de delta, fingerprints PRE/POST de todos los datos anteriores salvo nueva fila técnica de ledger, constraints/índices/funciones/triggers exactos y sólo dos tablas/cuatro columnas/reemplazo UNIQUE publicados. No copiar hashes de datos como filas ni contenidos. Nuevos campos históricos siguen NULL sin backfill. Inmutabilidad/cross-tenant negativa sintética149 y17 gates de migración se reutilizan honestamente; no escribir fixtures QA por inferencia. Si falla, rollback del runner cuando proceda; no down destructivo/restauración sin recuperación segura y autorización pertinente.

La autorización de adopción permanece delimitada. No activaciones IAM/registry/Definitions, imports, backend/frontend deploy, producción o Git mutante. STEP6A5/STEP6A6 NOT_STARTED. No afirmar disponibilidad/runtime funcional por este DDL. Dominio único grc.tecdex.net. Ninguna conexión IA.

## Instrucción PO y hallazgo TLS sucesores

El PO pidió expresamente inspección pública sólo lectura sin aceptar el autofirmado. Leer TLS_REPORT.md y TLS_PUBLIC_INSPECTION.json antes de cualquier continuación. Certificado observado CN/Issuer=db-tecdex, vigente2026-05-17→2036-05-14, único SAN DNS:db-tecdex; SHA256 DER FB:68:09:DA:13:9E:E3:E5:2C:2F:1F:EA:D7:5B:11:92:7B:04:B8:96:7A:2B:5D:B8:46:9C:B6:70:E3:BB:A3:E6. No cubre IP192.168.2.40 incluso si se aprobara su confianza. Nombre db-tecdex coincide offline pero no está vinculado administrativamente como identidad QA autorizada. No DNS/hosts nuevo ni alias inferido. STARTTLS mantuvo verificación fatal y terminó rechazado antes de autenticación; PEM observado no es trust anchor. No instalarlo automáticamente. El procedimiento de consola independiente y los datos públicos concretos pendientes están en TLS_REPORT.md. La solicitud DDL sigue BLOCKED, ventana NOT_STARTED.
