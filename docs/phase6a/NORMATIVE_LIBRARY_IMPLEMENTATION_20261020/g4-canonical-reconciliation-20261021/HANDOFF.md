# Continuidad autocontenida — G4 y cadena canónica

**Entrada siguiente:** este HANDOFF → RESULT.json → FINAL_RECOVERY_RECEIPT.json → MIGRATION_RECONCILIATION.json → DELTAS.json/SHA256SUMS.txt. No repetir publicación B01–B09/H04/PV ni149 pruebas físicas. No reconstruir el expediente anterior. Las respuestas PO «sin cifrado» y «carpeta de usuario» son específicas de la copia; no autorizan DDL QA.

Estado: READY_FOR_QA_ADOPTION_PENDING_WINDOW_AND_FINAL_PREFLIGHT. QA no cambió por este trabajo. La orden operativa posterior y nueva ventana/preflight final siguen pendientes. No hay ventana de30min abierta. G4 acredita un snapshot lógico concreto, no PITR. Runtime/funcionalidad B01–B09 no declarados completos.

## Verificación segura inicial

Desde el mismo repo:

```sh
python3 docs/phase6a/NORMATIVE_LIBRARY_IMPLEMENTATION_20261020/g4-canonical-reconciliation-20261021/verify.py
```

Es local, sin SQL/red ni mutaciones. Verifica los5.286 archivos de entrada:5.282 byte-idénticos y cuatro deltas canónicos expresamente autorizados, cuyos preimages exactos existen en HEAD. Se crearon 42 archivos en el repo; cuatro preexistentes modificados. Preserva los115/ocho y los demás ciclos anteriores. No staging/commit/push/merge/reset/clean/checkout/worktree. HEAD4a275264a7522031e62bf09f598c9d56e21d25e0; rama fix/step6a3-v112-continuity-20261016; índice vacío. No ejecutar los verifiers históricos cerrados esperando que acepten cambios canónicos posteriores: sus seals no se editaron y su resultado de entrada PASS se reutiliza.

## Recuperación acreditada y límites

Referencia **QA-LOGICAL-e923e6ecc44845c6920c8fd975f34675**, snapshot2026-10-21T22:46:47.129323Z. SHA256754e1810ca4a0242814a3a02d6e6f9821774b35eb304f300b09a3665616141a5,2.544.085bytes, pg_dump16.14→PG16.15. Ubicación autorizada `~/.tcdx-grc-qa-recovery/<referencia>/tcdx-grc.pgdump`,0700/0600, FileVault ON; archivo sin cifrado propio por decisión PO. Mantener copia/recibo bajo cuenta andresbarouh hasta decisión explícita de disposición. No adjuntar dump/logs privados/filas/claves al repo. FINAL_RECOVERY_RECEIPT.json existe también junto a la copia y es el recibo definitivo. Los archivos BACKUP_RESTORE_FINAL/RECONCILED preservan intentos con comparación textual fallida; no son el resultado final.

Restauración real ya ejecutada y destruida, sin red, puertos o volúmenes, PGDATA tmpfs.243 relaciones/ledger34 y todos los conteos del mismo snapshot coinciden; columnas, índices, funciones, triggers y extensiones coinciden.2857 constraints:2677 exactos,180 con equivalencia AST de distribución de cast text[] a elementos varchar sin typmods;180 negativos rechazan cambios de valores. CONSTRAINT_EQUIVALENCE.json y NORMALIZER_TESTS.json lo prueban. No se borraron fallos: metadatos ambiguos antes del dump, capacidad de locks del primer contenedor y diferencia de renderizado quedaron documentados. Ningún defecto DDL nuevo quedó pendiente.

La copia sólo recupera esta base a ese instante. No incluye otras cuatro bases, secretos/global roles, almacenamiento de objetos o conectividad de aplicaciones. El rol de aplicación se creó NOLOGIN únicamente en el entorno aislado para restaurar ACL. No hay PITR: archive_mode off y0 WAL archivados. El archivo depende de la protección del volumen/cuenta; no se afirma ciphertext portátil. Si QA cambia antes de una adopción futura, evaluar frescura/RPO y detenerse si el punto ya no es pertinente. Una recuperación real requerirá orden operativa propia; nunca apuntar pg_restore al origen por inferencia.

## Cadena canónica ya reconciliada — no regenerar

- database/migrations/manifest.json contiene35 filas; las34 originales/SQL/checksums se preservaron.
- Nueva `database/migrations/20261021221204_normative_library_b01_b09_h04_pv01.sql`, SHA9279159e88c60fff03f998e33008fb0d675f53e4423df638c9e54f709a773798, byte-idéntica a la candidata del expediente anterior. Tres fuentes publicadas completas en orden,46 sentencias, ocho funciones efectivas/12triggers/dos tablas/cuatro columnas/reemplazo UNIQUE. Ningún DML de negocio o semilla nueva IAM/registry/Definitions.
- database/expected-schema.json es la única proyección canónica:244 tablas, fuentes/recibo/hash/offset y asserts físicos PG16. No es contrato nuevo ni evidencia de adopción QA.
- scripts/foundations/verify-schema.ts conserva C04W tras cambiar el conteo, verifica98 constraints/56índices de seis relaciones, ocho funciones y12triggers exactos. La FK B02 a Subject se comprueba junto a sus guards publicados; no hay excepción de tenant no vinculada. schema-definition.ts normaliza sólo el cast acreditado. db.ts cambió una anotación TypeScript opcional/undefined, sin modificar ejecución/conexión.
- ARCHITECTURE_RECONCILIATION.json reutiliza112 objetos y242 dependencias transitivas de la inspección anterior, con trazabilidad a la misma autoridad. No introduce modelos, roles, permisos o estados nuevos.

SYNTHETIC_STABILIZED.json:17 gates PASS con Node22.23.2/PG16.15, red none, repo READ_ONLY, sin credenciales QA. Runner canónico completo34→35, fallo intencional al final y rollback DDL+ledger, apply/reapply/status, guards checksum/concurrencia/ledger, negativos overload/C04W/body/trigger/index/XOR y verificador final cero diferencias. Typecheck estricto, tres unit tests y rector PASS. Los149 históricos se reutilizan, no se atribuyen a este ciclo. Todos los contenedores se eliminaron. Scripts de generación y ensayos conservan asserts de no sobrescritura: no volver a ejecutarlos por rutina.

## Siguiente decisión concreta y secuencia futura

Pregunta pendiente al PO: **¿autoriza una orden operativa QA exclusivamente para la migración20261021221204, con nueva ventana segura y preflight final, manteniendo prohibidos imports, activaciones IAM/registry, despliegues y runtime?** No se solicita autorización general ni decisiones ya aprobadas.

Si llega esa orden: verificar este inventario; repetir G1/read-only final (identidad192.168.2.40:5432/tcdx-grc16.15/cluster16/main, sesiones/tx/locks, ledger34 y checksums, objetos/fingerprints/datos afectados, recuperación pertinente). Abortar ante actividad incompatible, drift o respaldo desactualizado; no terminar sesiones ajenas. Registrar GO/NO-GO antes de abrir ventana. Usar sólo scripts/foundations/migrate.ts con configuración QA segura, DATABASE_BACKUP_REFERENCE real y timeouts por sesión; nunca TEST_MODE/ISOLATED_REBUILD/rebuild-test en QA. Verificar fuente efectiva completa/PV y que sólo está pendiente35. No ejecutar SQL manual disperso. Antes del commit, rollback transaccional probado; después, no aplicar down destructivo ni restaurar sin orden pertinente. Post-gates deben evidenciar delta exacto, ledger y datos preservados, sin habilitar runtime.

Si no llega orden: detenerse tras el verificador local. Esta cuenta no ejecutó DDL/DML/history QA, importaciones, IAM/registry, despliegues o producción. STEP6A5/STEP6A6 NOT_STARTED. Dominio único grc.tecdex.net. Ninguna conexión IA.
