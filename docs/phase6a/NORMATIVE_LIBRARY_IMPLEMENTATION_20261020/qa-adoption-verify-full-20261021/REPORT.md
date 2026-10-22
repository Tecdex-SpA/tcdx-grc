# Adopción física PostgreSQL QA20261021221204 — verificada

**QA_PHYSICAL_ADOPTION=APPLIED_VERIFIED. ARCHITECTURAL_CONSISTENCY_GATE, MIGRATION_INTEGRITY_GATE, DATABASE_DRIFT_GATE y POST_ADOPTION_INTEGRITY_GATE=PASS**, dentro del alcance físico/catálogo/preservación inspeccionado. **B01–B09 no está declarado funcionalmente completo ni habilitado operacionalmente.** No se probaron runtime de aplicación, RBAC/SoD o E2E QA mediante esta adopción.

## Autoridad, continuidad y alcance

Orden operativa PO: exclusivamente20261021221204 en QA, ventana30min sólo tras todos los gates PASS y ausencia de actividad incompatible, recuperación QA-LOGICAL-e923e6ecc44845c6920c8fd975f34675. Orden TLS sucesora: el PO verificó mediante consola administrativa independiente db-v4/IP192.168.2.40, archivo público /etc/ssl/certs/ssl-cert-snakeoil.pem, CN/SAN db-tecdex y huella SHA256 exacta; autorizó esa identidad con host+hostaddr y verify-full sin alterar servidor/DNS. Las decisiones previas no se reabrieron. AGENTS, rector46/enforcement, activación v1.12 y handoffs/recibos pertinentes se verificaron; integridad rectora inicial/final PASS. STEP6A3/6A4 PASS preservados; STEP6A5/6A6 NOT_STARTED.

ENTRY.json registra5.354 archivos recibidos y preservación inicial PASS del expediente anterior. Las fuentes contractuales,34 migraciones históricas y todos los expedientes/sellos anteriores permanecen en sus bytes. Sólo hay dos deltas de archivos recibidos: soporte técnico de conexión host/hostaddr+CA en scripts/foundations/db.ts (preimage exacto preservado) y append en MASTER_EXECUTION_STATUS (prefijo íntegro por hash). Los demás5.352 archivos no cambiaron. No hubo commit/stage/push/merge/cambio de rama/checkout/reset/clean. Rama fix/step6a3-v112-continuity-20261016; HEAD4a275264a7522031e62bf09f598c9d56e21d25e0; índice vacío. No se modificó backend/frontend desplegado, baseline inmutable, arquitectura de negocio ni contratos efectivos.

## TLS verificado y certificado administrativo

Identidad aprobada: host=db-tecdex; hostaddr=192.168.2.40;5432/tcdx-grc. Huella SHA256 DER exclusiva:

`FB:68:09:DA:13:9E:E3:E5:2C:2F:1F:EA:D7:5B:11:92:7B:04:B8:96:7A:2B:5D:B8:46:9C:B6:70:E3:BB:A3:E6`.

La copia pública previamente observada se autenticó contra la huella acreditada por el PO desde un canal administrativo independiente; no se la aceptó por ser presentada por el servidor. Con ese contenido exacto aprobado se estableció TLS verify-full, y por la sesión PostgreSQL administrativa autenticada se obtuvo **sólo** el archivo público indicado por el PO y se verificó nuevamente su huella. QA_ADMINISTRATIVE_PUBLIC_CERT.pem es esa copia verificada, local0600. No se leyó clave privada, copió secreto a archivos/argv/evidencias o instaló CA global. La credencial libpq existente se reutilizó; para el probe libpq con hostname se pasó únicamente en memoria del proceso hijo, nunca en argumentos/logs/archivos.

El cliente canónico de foundations ahora traduce hostaddr a dirección TCP explícita y conserva el hostname como servername validado por TLS, con CA explícita y rejectUnauthorized=true. No proxy, monkeypatch, segundo runner, resolución DNS nueva, hosts/fallback o cambio persistente del servidor. El override de dirección exige literal IP y verify-full; falta de raíz aprobada falla cerrado. Se conserva el comportamiento de sockets aislados previos. El helper SQL/runner/migraciones no redefine semántica del producto.

TLS_VALIDATION.json prueba TLSv1.3 autorizado, fingerprint exacto, identidad PostgreSQL16.15/16-main/QA, sesión sólo lectura; libpq real con los parámetros host/hostaddr/sslmode=verify-full/sslrootcert; rechazo de SAN incorrecto y de CA no aprobada. Cuatro controles TLS PASS y cuatro unit de configuración PASS; typecheck estricto PASS. El intento01 previo a la ventana falló en el guard por representación textual de inet; se conservó y se normalizó con host(inet_server_addr()), sin relajar la identidad. No hubo DDL en ese intento ni cambio de TLS para eludir el rechazo.

## Preflight final y GO

PRE e IMMEDIATE ejecutaron los SELECT revisados por el canal verify-full, con BEGIN REPEATABLE READ READ ONLY, default_transaction_read_only=on, timeouts por sesión y guard de host/cluster/versión/usuario/SSL. Se confirmaron servidor192.168.2.40, PG16.15, cluster16/main y el mismo identificador de clúster del preflight aprobado. Cuenta postgres privilegiada ya autorizada/propietaria de los objetos, sin nuevas concesiones. No se conectó a otras bases ni producción.

Las34 filas del ledger/checksums son exactas, manifest canónico35 válido y sólo35 pendiente. Relaciones/columnas/constraints/índices/funciones/triggers/ledger coinciden con el preflight aprobado; fingerprints SHA256 agregados de242 tablas de negocio coinciden también, sin exportar filas, PII, cuerpos normativos o secretos. Los hashes incluyen todas las columnas anteriores y cardinalidades; las cuatro columnas nuevas se excluyen simétricamente del hash y se comprueban por separado como NULL. Ninguna tabla alcanzó el límite100001. Los agregados de la copia de recuperación coinciden en cardinalidades, sin afirmar comparación completa de sus valores con el estado actual.

La copia QA nombrada seguía disponible: SHA256754e1810ca4a0242814a3a02d6e6f9821774b35eb304f300b09a3665616141a5,2544085bytes, carpeta privada0700/archivo0600 y FileVault ON. Se reutilizó su recibo real de restore PG16.15. Punto lógico2026-10-21T22:46:47UTC; no PITR ni recuperación de otras bases/secretos globales/object storage. El PO nombró expresamente esa referencia. No se creó otro backup o restore en esta operación.

El control inmediato repitió catálogo/datos y dejó actividad/locks al final: sólo sesión idle ajena, cero tx abiertas/prolongadas, locks/waiters o prepared transactions incompatibles. No se finalizaron sesiones. Todos los gates PASS quedaron escritos antes de GO; no se tomó una observación anterior como reserva de ventana.

## Ejecución y ventana UTC

- Inicio efectivo: **2026-10-21T23:41:38.793496Z**.
- Límite autorizado:2026-10-22T00:11:38.793496Z.
- Aplicación canónica:1,635s; finalizó2026-10-21T23:41:40.503950Z, exit0.
- Cierre anticipado tras gates posteriores: **2026-10-21T23:43:29.506226Z**. La ventana está cerrada y no habilita nuevas operaciones.

Se ejecutó exclusivamente scripts/foundations/migrate.ts apply contra el manifest oficial, Node22.23.2, sin TEST_MODE ni ISOLATED_REBUILD. Las34 migraciones anteriores se omitieron con checksums verificados; sólo20261021221204 se aplicó. DDL y una fila técnica del ledger se confirmaron en la misma transacción. Parámetros por sesión: statement_timeout60s, lock_timeout2s, idle_in_transaction_session_timeout30s y watchdog de invocación120s. No se cambiaron parámetros persistentes ni se mataron sesiones.

SQL efectivo: database/migrations/20261021221204_normative_library_b01_b09_h04_pv01.sql, SHA256 **9279159e88c60fff03f998e33008fb0d675f53e4423df638c9e54f709a773798**. Son los tres bloques publicados byte-idénticos B01–B09 completo → H04_SQL_GRAMMAR completo → PV-H04-01.46 sentencias, nueve definiciones/ocho funciones finales; el corrector final no consulta tenant_id del catálogo global de paquetes. No se editó DDL ni se improvisaron reparaciones. No hubo error de migración o rollback QA; la prueba de rollback transaccional de fallos del runner se reutiliza del entorno sintético previo. Revertir/restaurar después del commit requiere alcance/orden propios; no se ejecuta una reversión destructiva por inferencia.

## Delta físico exacto y preservación

OBJECT_DELTAS.json conserva cada objeto antes/después y POST_GATES.json los18 controles PASS. No hay modificación imprevista de objetos anteriores:

| Categoría | Añadidos | Retirados | Cambios sobre objetos conservados |
|---|---:|---:|---:|
| Tablas |2 |0 |0 |
| Columnas |38:34 en nuevas tablas +4 sobre existentes |0 |0 |
| Entradas pg_constraint |42:40 PK/UQ/FK/CHECK +2 asociadas a triggers diferidos |1 UNIQUE anterior |0 |
| Índices |15, incluidos respaldos PK/UQ |1 respaldo de UNIQUE anterior |0 |
| Funciones efectivas |8 |0 |0 |
| Triggers |12 |0 |0 |

El reemplazo es UNIQUE global version_number→UNIQUE(knowledge_item_id,version_number), exactamente publicado. Los dos registros de constraint-trigger son representación catalogal de los triggers publicados, no dos reglas nuevas. Los nuevos índices están valid/ready, constraints validadas y triggers habilitados. El verificador canónico reporta244 tablas de dominio (245 con ledger),3630 columnas, cero mismatches, un propietario y cero ON DELETE CASCADE. Verifica definiciones de98 constraints/56índices de seis relaciones afectadas, ocho funciones y12triggers, conservando los gates históricos C04W. No hay modelo/catálogo paralelo ni permisos implícitos.

Las34 filas anteriores de migraciones permanecen iguales y hay exactamente una nueva fila35 con hash correcto/outcome=applied/transactional=true. **242/242 fingerprints y cardinalidades de tablas de negocio preexistentes coinciden antes/después**, incluidos IAM, configuración, auditoría y outbox. Nuevas tablas de bindings/derechos vacías; los cuatro campos nuevos históricos NULL. No backfill, datos normativos, tenants/actores/evidencias ficticios o reescritura de decisiones históricas.

La integridad tenant/global/inmutabilidad se acredita aquí por definiciones exactas, FKs/constraints validadas y preservación de datos. Los149 tests funcionales de SQL/tenant/locks y17 gates canónicos sintéticos anteriores se reutilizan para su alcance, sin reejecutarlos ni convertirlos en pruebas RBAC/SoD/runtime/E2E QA. No se escribieron fixtures en QA. No se declara cierre funcional integral por este PASS físico.

## Resultado y próximo paso seguro

Adopción física cerrada con recibo, fingerprints, hashes, inventario y continuidad. Cambió el esquema QA y una fila técnica de su historial. No DML de negocio, importaciones, materialización IAM/registry/Definitions, despliegues, producción, DNS, certificados/configuración persistente del servidor, IA o Git mutante. STEP6A5/6A6 NOT_STARTED. Dominio público único grc.tecdex.net.

Conservar el punto de recuperación y verificar este expediente localmente. La siguiente dependencia es la autorización/validación operacional separada de IAM/registry/configuración y runtime; no se solicita ni ejecuta su activación aquí. No volver a ejecutar esta migración, reutilizar la ventana cerrada o inferir disponibilidad de usuarios QA. No quedan bloqueos de esta adopción física dentro del alcance efectivamente verificado.
