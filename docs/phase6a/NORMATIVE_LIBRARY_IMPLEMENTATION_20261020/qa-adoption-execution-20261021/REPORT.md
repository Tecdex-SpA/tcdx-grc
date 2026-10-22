# Adopción QA20261021221204 — NO-GO por confianza TLS

**QA_PHYSICAL_ADOPTION=NOT_EXECUTED. La ventana de30min no comenzó.** El PO autorizó exclusivamente20261021221204, condicionada a todos los controles previos PASS. Se detuvo antes de DDL porque el runner canónico no establece su conexión TLS verificada: `DEPTH_ZERO_SELF_SIGNED_CERT`. No se deshabilitó la verificación, cambió certificado/configuración, usó otro runner ni intentó SQL manual.

## Continuidad y autorización

Se leyeron AGENTS, rector46, enforcement, activación v1.12 y secciones de26/43 pertinentes; handoff, RESULT, recibo de recuperación y reconciliación canónica del ciclo anterior. Su verifier pasó antes de crear este expediente. Se preservan5.328 archivos recibidos, incluidos todos los artefactos físicos/implementación,42 archivos del último ciclo y los cuatro deltas canónicos anteriores. Ningún archivo previo modificado en esta operación. Rama fix/step6a3-v112-continuity-20261016; HEAD4a275264a7522031e62bf09f598c9d56e21d25e0; índice vacío.

El gate rector documental/integridad pasó. Las clausuras STEP6A3/6A4 PASS y las verificaciones sintéticas selladas anteriores se reutilizan; no se repitieron149 pruebas físicas ni reconstrucciones. Contratos sellados, migraciones, backend/frontend, infraestructura y despliegues no se editaron. Este expediente no publica una nueva autoridad.

## Controles efectivamente realizados

- Referencia QA-LOGICAL-e923e6ecc44845c6920c8fd975f34675 disponible; SHA256754e1810ca4a0242814a3a02d6e6f9821774b35eb304f300b09a3665616141a5 coincide, tamaño2544085, permisos privados correctos y FileVault ON. El recibo de restauración aislada16.15 permanece íntegro. Snapshot2026-10-21T22:46:47.129323Z; recuperación sólo de esta base, sin PITR. El PO nombró expresamente esta referencia. El archivo no tiene cifrado independiente por su decisión previa.
- Inspección QA READ ONLY completa mediante libpq/TLS:192.168.2.40:5432/tcdx-grc, PostgreSQL16.15, cluster16/main, postgres; default_transaction_read_only/transaction_read_only=on. Cuenta privilegiada ya autorizada, sin roles/grants nuevos. Estado del servidor observado2026-10-21T23:20:25.957755Z. Se conservaron SQL y resultados sanitizados; sin filas/PII/secretos/cuerpos normativos. Un primer intento fue bloqueado por sandbox antes de SQL, preservado por separado; se repitió mediante elevación local autorizada.
- Ledger34/checksums coincide con las34 migraciones inmutables del manifest oficial35. Hash exacto de candidata y cada bloque contractual verificado: `9279159e88c60fff03f998e33008fb0d675f53e4423df638c9e54f709a773798`. Sólo20261021221204 está prevista; los tres DDL publicados completos, incluido PV-H04-01, permanecen byte-idénticos. No se editó el corrector ni el modelo para adaptar la conexión.
- Relaciones, columnas, constraints, índices, funciones, triggers y ledger son idénticos al preflight aprobado. No hay drift estructural previo. Se capturaron fingerprints agregados SHA256 y cardinalidades de242 tablas de negocio (ledger separado); nuevos campos nullable se excluyen de la comparación futura para preservar exactamente los datos anteriores. Ninguna tabla alcanza el límite100001. Las cardinalidades coinciden con el snapshot de respaldo; esto **no** demuestra igualdad de todos sus valores con ese respaldo. No se convierte el hash agregado actual en una copia ni se exportan filas.
- Una sesión ajena idle, cero transacciones abiertas/prolongadas, cero locks/waiters/prepared transactions en el snapshot. No se interrumpió ninguna sesión. Esta observación no reserva actividad futura y no abrió ventana.
- Recuperación aplicable antes de commit: rollback DDL+ledger probado previamente en PG16.15 con runner canónico. Después del commit, una restauración o reversión destructiva no está autorizada automáticamente. Hay copia lógica verificada para el punto indicado, sin promesa de PITR o recuperación de otras bases.

## Bloqueo preciso

La comprobación `migrate.ts status`, sin DDL y con default_transaction_read_only=on, falló en el handshake TLS, antes de poder consultar el ledger mediante ese runner. Node22.23.2, DATABASE_SSL_MODE=require y almacén CA existente del sistema: `Error: self-signed certificate`, código DEPTH_ZERO_SELF_SIGNED_CERT. canonical.py fuerza el destino aprobado, desactiva test/rebuild mode y configura timeouts sólo por sesión. No contiene secretos ni se ejecutó su modo apply.

Libpq sslmode=require demuestra conexión cifrada y permitió verificar el destino/metadatos; no acredita la confianza CA que exige esta invocación segura del runner Node. No se presenta esa lectura exitosa como un PASS del canal canónico. No se cambió a no-verify/disable ni se añadió una CA no aprobada para conseguir PASS. El motivo del NO-GO no es la integridad del DDL o el respaldo.

**Dato pendiente solicitado:** referencia aprobada de CA/certificado público o huella SHA256 verificada por el administrador para PostgreSQL QA. No enviar claves privadas ni contraseñas. No se pide ratificar la adopción ya autorizada; falta acreditar la confianza de su conexión. Si requiere renovar/instalar certificados o cambiar configuración de servidor, esa operación necesita su alcance propio y no se ejecuta por inferencia.

## Resultado y límites

ARCHITECTURAL_CONSISTENCY_GATE=PASS en inspección previa; MIGRATION_INTEGRITY_GATE=PASS para archivos/ledger34; G4=PASS para la referencia nombrada. PREFLIGHT_FINAL_GATE=BLOCKED por TLS canónico; RECTOR_GATE=BLOCKED para ejecutar, con rector documental PASS. DATABASE_DRIFT_GATE=PASS_PRE_ADOPTION_ONLY; gates posteriores NOT_RUN. DDL/DML/ledger QA ejecutados: NONE; ningún objeto modificado ni registro35 creado por esta ejecución.

Inicio/fin de ventana: NOT_STARTED/NOT_STARTED. No imports, IAM/registry, despliegues, producción, Git mutante, IA ni STEP6A5/STEP6A6. No se afirma B01–B09 habilitado o funcionalmente completo. La siguiente acción segura es resolver la referencia TLS y repetir el control final de actividad/identidad/ledger/fingerprints antes de registrar GO y abrir los30min; no reutilizar como vigente la observación de actividad anterior.

## Diagnóstico TLS adicional autorizado por PO

Se completó inspección pública manteniendo verificación fatal, sin autenticación/SQL: certificado autofirmado CN=db-tecdex, SAN sólo DNS:db-tecdex y sin SAN de la IP autorizada. La IP falla identidad; el nombre sólo coincide offline y carece de vinculación administrativa verificada. TLS_REPORT.md contiene huella DER SHA256, emisor, fechas/SAN y procedimiento de contraste independiente. No se aceptó/instaló el certificado ni se conectó a un alias. NO_GO se mantiene por confianza e identidad; no hay DDL ni ventana.
