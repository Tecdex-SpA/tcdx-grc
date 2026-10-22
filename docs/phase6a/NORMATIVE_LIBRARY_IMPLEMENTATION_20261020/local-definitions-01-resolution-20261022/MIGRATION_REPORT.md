# Migración36 correctiva — preparada local, QA no ejecutado

Archivo: `database/migrations/20261022141304_configuration_optional_default.sql`. ID14dígitos UTC obtenido mediante `date -u +%Y%m%d%H%M%S`; secuencia posterior a20261021221204, sin colisión, gramática del contrato11 verificada. MIGRATION_ID_ALLOCATION.json registra asignación. Hash/entry final en migration36.json y manifest canónico.

Autoridad: nuevo sucesor físico CONFIGURATION_OPTIONAL_DEFAULT_20261022 y su contrato ejecutable, derivados de la orden PO actual y de la semántica NULL ya publicada para B04. La línea «exactly one» del modelo físico anterior se sucede documentalmente; sus bytes y los35SQL aplicados no se reescriben.

La migración contiene sólo SET LOCAL, LOCK, preflight de catálogo y ALTER TABLE del CHECK de config.configuration_definitions. No tiene DML, backfill, nuevas tablas/columnas, objetos específicos de las cuatro Definitions, grants, rules, triggers o cambios de otra entidad. El ledger técnico lo gestiona el runner canónico, no el DDL.

Orden transaccional: lock exclusivo/timeouts → comprobar constraint anterior exacta y validada → agregar CHECK nuevo NOT VALID → VALIDATE sobre todas las filas anteriores → retirar anterior → renombrar reemplazo al nombre canónico. El reemplazo ya protege las filas antes del DROP. Todos los defaults anteriores válidos siguen válidos; no hay transformación de datos. Fallo revierte íntegramente DDL y ledger; reapply canónico se omite por checksum/ledger aplicado.

Generador único: deriva36 desde DDL publicado/hash-bound y conserva el prefijo35 byte a byte. Manifest registra36 con pre/postcondiciones; expected-schema conserva244tablas/3630columnas y añade metadata/aserción exacta del CHECK. La proyección PG16 es evidencia derivada, no autoridad alternativa. --check dos veces produce salida idéntica. verify-schema compara la definición validada exacta, además de las aserciones anteriores; no se amplían normalizaciones para ocultar drift.

## Futuro procedimiento QA, no ejecutado

1. Obtener autorización PO específica para adopción36 en QA y bytes/checksums concretos; esta preparación no la concede. No repetir1–35 ni iniciar fases posteriores.
2. Preflight autorizado: ledger35 exacto contra manifest predecesor sellado, CHECK anterior exacto, recuperación/snapshot válido y ausencia de drift. El expected-schema nuevo36 corresponde al postestado; no tratar el QA35 previo como corrupto por no tener todavía esa corrección.
3. Confirmar backup/ventana/actor/credenciales existentes, sin cambiar identidad/infraestructura. Ejecutar el runner canónico sólo para36; éste valida IDs/checksums/ledger y la migración valida el CHECK previo. Cualquier divergencia es NO-GO, sin reparar manualmente.
4. Postestado: ledger36 técnico, expected-schema actual con cero diferencias,244tablas/3630columnas y fingerprints empresariales idénticos. No materializar Definitions ni grants por la adopción física; ese DML sigue requiriendo su autorización propia.
5. Sólo en una activación operacional posterior autorizada: mismo publisher IAM privado y mismo input exacto, ahora con las cuatro Definitions/scopes/rules atómicos. Luego derechos H04 auténticos por fuente/acto y despliegue según alcances aprobados. El runbook anterior debe leerse junto a este sucesor: LOCAL-DEFINITIONS-01 queda resuelto localmente y36 es ahora prerrequisito físico. No se ejecutó ninguna parte sobre QA.
6. Recuperación: fallo transaccional→rollback íntegro; después de commit no editar ledger ni hacer DOWN destructivo. Tras materializar defaultsNULL, reinstalar el CHECK antiguo rechazaría datos contractualmente válidos: usar recuperación/snapshot/PITR aprobados si hay incidente, conservar auditoría y evaluar compatibilidad de imágenes separadamente. No se entrega un bypass/DELETE masivo.

NO-GO: checksum/ledger/CHECK distinto, recuperación ausente, actores/evidencia/grants no autorizados, intento de modificar1–35 o de publicar datos bajo sólo autorización física. Ningún resultado local declara QA_READY, aprobación humana, licencia jurídica o release comercial.
