# Continuidad — adopción física QA efectuada

**QA_PHYSICAL_ADOPTION=APPLIED_VERIFIED. Migración20261021221204 ya está aplicada en QA con ledger35. Ventana cerrada. NO volver a aplicarla ni ejecutar execute_authorized.py por rutina.** B01–B09 no está habilitado operacionalmente ni se declara funcionalmente completo. STEP6A5/STEP6A6 NOT_STARTED.

Lectura inicial: REPORT.md → ADOPTION_RECEIPT.json → RESULT.json → GO_NO_GO.json → POST_GATES.json → OBJECT_DELTAS.json → DELTAS.json/SHA256SUMS.txt. Luego, verifier local sin SQL/red:

```sh
python3 docs/phase6a/NORMATIVE_LIBRARY_IMPLEMENTATION_20261020/qa-adoption-verify-full-20261021/verify.py
```

## Autoridad y estado real

Baseline activa v1.12 intacta. Rama fix/step6a3-v112-continuity-20261016; HEAD4a275264a7522031e62bf09f598c9d56e21d25e0; índice vacío. Mismo checkout, no clones/worktrees/branches. ENTRY5354 archivos:5352 byte-idénticos; dos deltas recibidos autorizados son cliente canónico de foundations para host/hostaddr+CA y append de MASTER_EXECUTION_STATUS, con preimage/prefijo exactos preservados. Contratos/modelos/sellos/34 SQL anteriores y trabajo ajeno intactos. Nuevos archivos y hashes en DELTAS; no commit/stage/push/merge/reset/clean/checkout.

La orden operativa previa y la aprobación TLS independiente del PO bastaron: no se reabrieron decisiones. Los anteriores NO_GO de qa-adoption-execution-20261021 se conservan históricos; esta evidencia los sucede. No ejecutar sus verifiers cerrados esperando que toleren esta evolución autorizada ni cambiar sus sellos.

## Conexión TLS aprobada, sin cambios al servidor

PO acreditó consola db-v4/IP192.168.2.40, certificado público /etc/ssl/certs/ssl-cert-snakeoil.pem, CN/SAN db-tecdex y huella:
FB:68:09:DA:13:9E:E3:E5:2C:2F:1F:EA:D7:5B:11:92:7B:04:B8:96:7A:2B:5D:B8:46:9C:B6:70:E3:BB:A3:E6.

Se autenticó por esa huella la copia observada y se obtuvo/verificó nuevamente el archivo público mediante sesión administrativa con TLS verify-full. QA_ADMINISTRATIVE_PUBLIC_CERT.pem es copia pública0600, sin clave privada. Ningún trust store global/DNS/hosts/certificado/configuración persistente del servidor cambió. No usar require/no-verify como sustituto.

Cliente canónico scripts/foundations/db.ts admite DATABASE_HOST=db-tecdex, DATABASE_HOSTADDR=192.168.2.40, DATABASE_SSL_MODE=verify-full y DATABASE_SSL_ROOT_CERT=<ruta segura de copia pública verificada>. Conecta a IP explícita y valida servername/CA; hostaddr obliga verify-full y raíz explícita. No proxy/segundo runner/monkeypatch. Credenciales sólo por referencia existente y memoria de proceso; ninguna en evidencias/argv/archivos nuevos. TLS_VALIDATION contiene dos positivos reales (cliente/libpq) y dos negativos CA/nombre, todos PASS; cuatro unit y typecheck PASS. Intento01 de guard inet preservado, corregido con host(inet_server_addr()), antes de ventana/DDL.

## Operación realizada y alcance comprobado

GO2026-10-21T23:41:38.793496Z, tras IMMEDIATE con catálogo/242 fingerprints/actividad al final. Cierre2026-10-21T23:43:29.506226Z; límite autorizado00:11:38.793496Z del22oct, sin reutilización de remanente. Sólo una sesión ajena idle/sin tx/locks. Runner oficial aplicó sólo20261021221204 (1,635s);34 ya aplicadas se omitieron con hash verificado. Sin TEST_MODE/ISOLATED_REBUILD. Transacción DDL+una fila técnica de ledger. Timeouts sesión60s/lock2s/idle30s, watchdog120s; no se finalizaron sesiones.

MigraciónSHA9279159e88c60fff03f998e33008fb0d675f53e4423df638c9e54f709a773798. Tres bloques publicados exactos B01–B09→H04_SQL_GRAMMAR→PV-H04-01,46sentencias/ocho funciones finales. No SQL manual/ediciones/amendments de conveniencia. Rollback QA no necesario; prueba previa aislada del runner reutilizada. No down/restauración destructiva autorizados por este cierre.

QA:244 tablas de dominio/245 con ledger,3630 columnas; verificador canónico cero diferencias. Delta exacto dos tablas, cuatro campos sobre existentes más34 de nuevas tablas,42 entradas pg_constraint (incluye dos de triggers diferidos),15 índices añadidos, una constraint/índice UNIQUE global retirados, ocho funciones y12triggers. Nuevas constraints validadas/índices listos/triggers habilitados. Definiciones exactas98constraints/56índices/ocho funciones/12triggers verificadas; C04W preservado; catálogo global de paquetes sin tenant_id y corrector final exacto.

POST_GATES18 PASS.34 registros de ledger idénticos, uno nuevo35 correcto;242/242 fingerprints de tablas de negocio anteriores iguales, incluidos IAM/config/audit/outbox; nuevas tablas vacías y cuatro campos históricos NULL. No backfill/import/grants/materialización operacional. Los149 tests SQL y17 gates canónicos sintéticos se reutilizan para su alcance; no se repitieron ni se escribieron fixtures QA. No acreditan runtime/RBAC/SoD/E2E de aplicación.

## Recuperación y siguiente acción

Conservar QA-LOGICAL-e923e6ecc44845c6920c8fd975f34675 en carpeta privada de usuario protegida por FileVault, SHA754e1810ca4a0242814a3a02d6e6f9821774b35eb304f300b09a3665616141a5. Snapshot lógico pre-adopción2026-10-21T22:46:47UTC, archivo sin cifrado propio por decisión PO; restore aislado16.15 anterior verificado. No PITR, otras bases, object storage, credenciales globales o restauración de aplicación. No copiar datos/keys al repo ni ejecutar pg_restore sobre QA por inferencia. Una recuperación futura requiere evaluación del punto y orden operativa propia.

Próximo comando seguro: verifier local de arriba. Conservar expediente y recuperación. Para continuar hacia habilitación, el PO deberá delimitar una operación nueva de validación/materialización operacional IAM/registry/configuración o runtime; no dar grants, activar registry/Definitions, importar fuentes o desplegar por esta autorización cumplida. No conectar IA. Dominio público único grc.tecdex.net. No iniciar STEP6A5/6A6.
