# Modelo físico sucesor local P1/P2/T1

Autoridad: docs/governance/amendments/PHASE6A_RUNTIME_BINDINGS_20261023/AUTHORIZATION.json
y RECTOR_DELTA.md. DDL_SPEC.sql es el contrato físico exacto; se ensaya mediante
el runner canónico en un clúster propio. No es una adopción QA/producción.

RegulatoryPackVersion1:NRegulatoryPackValidationReceipt. Receipt es soporte de
validación de ese agregado, PLATFORM_CONTROL, sin tenant artificial. Tipos,
nulabilidad, PK/FKs/CHECKs/índices y defaults están íntegramente en DDL_SPEC.
Import-manifest/source/coverage deben pertenecer a la misma versión por FKs
compuestas. La asignación IAM referencia al actor y rol exactos; rol_code no es
un claim. La temporalidad efectiva se comprueba en la transacción del comando.
source_edition/import_checksum/content_hash/population_hash fijan el artefacto.

source/edition/package y approved/rejected son vocabularios de recibo, no estados
del pack. knowledge_source_id sólo aparece en source approved y tipa la conexión
explícita RegulatorySource→KnowledgeSource global para evaluar H04 oficial.
No se infiere por nombre, URI, license_classification o equivalencia textual.
No se permite fuente Knowledge tenant en un pack global. Cada raíz de recibos
es única por pack/import/kind/rol; la sucesión es lineal e inmutable. Toda sucesión
debe conservar ese ámbito, nunca suplanta otro tipo o fuente. El último recibo
sin sucesor es vigente; rejected no puede ocultarse buscando un approved viejo.

El hecho y su AuditEvent exacto son atómicos mediante FK diferida y constraint
trigger. UPDATE/DELETE de recibos se rechazan. Ninguna aprobación histórica se
reescribe ni se crea un permiso desde estos datos. Retención IMMUTABLE_RETAIN,
clasificación protected_metadata y lineage a fuente/manifiestos/actor/auditoría.
No se agrega purge. Los índices soportan navegación y FKs; no DELETE CASCADE.

Subscription0..1→DocumentVersion mediante FK tenant+id. El campo histórico nace
NULL sin DML ni backfill. El vínculo no altera términos, planes, entitlements o
activaciones. DocumentVersion conserva Document+version como business key: el
UQ anterior global era más restrictivo y no es autoridad de renumeración. Se
instala primero el UQ compuesto y luego se retira el global exacto. No cambia
ninguna fila existente ni la retención documental.

EXPECTED_SCHEMA_CONTRACT.json deriva sólo este delta sobre las244tablas/36
migraciones actuales. La candidata local tiene245tablas de dominio. La migración
37 se conserva en el paquete sucesor y se compone con las36predecesoras exactas
para el runner local, sin editar el manifiesto de adopción vigente. Esto separa
la preparación aprobada de cualquier futura promoción, expresamente excluida.
La verificación física debe probar catálogo completo, triggers/FKs/immutabilidad,
historia anterior intacta y rollback; el PASS documental no sustituye esas pruebas.
