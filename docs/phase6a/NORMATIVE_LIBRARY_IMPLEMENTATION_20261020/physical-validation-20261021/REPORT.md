# Validación física aislada B01–B09 / H04 — 2026-10-21

Resultado: **149/149 comprobaciones PASS con corrector H04 candidato no publicado**. El DDL H04 efectivo sin corrector presenta **dos FAIL reproducidos**, SQLSTATE 42703 al informar un paquete. No se declara cierre funcional B01–B09 ni disponibilidad QA/runtime.

## Entrada y preservación

Baseline activa v1.12 verificada por ACTIVE_ACTIVATION y gate rector; cierres STEP6A3/6A4 PASS en MASTER_EXECUTION_STATUS.md, líneas5481/5518/5520. ENTRY.json registra 4.359 archivos Git visibles, rama, HEAD e índice antes de los cambios. Los115 creados/ocho modificados de la primera implementación y89 creados/16 modificados de la composición permanecen en sus bytes recibidos. Se retienen las siete diferencias de código previamente autorizadas respecto de la primera implementación; no se las confunde con cambios actuales. Todos los4.359 hashes se verifican al cierre. No hay ediciones de archivos recibidos.

Se leyeron AGENTS, rector46/43/13/47, enforcement, modelo de aislamiento, ACTIVE_ACTIVATION, RESULT_SUCCESSOR, DELTAS_SUCCESSOR, HANDOFF_SUCCESSOR y DDL/recibos efectivos. verify-continuation.py pasó antes de crear este expediente. Su inventario cerrado antiguo rechaza los nuevos archivos si se repite después: hallazgo de herramienta documentado, no pérdida de transferencia. No se modifica el verificador anterior. verify.py verifica este sucesor y todos los bytes de entrada.

## Entorno realmente utilizado

Imagen local `postgres:16.15-bookworm`, ID `sha256:0ea6700a3b4f0ae6ce746519073558aed4d88a79d8d07622a9a644946c7319c4`. PostgreSQL16.15 real. Cada contenedor usa `--network none`, ningún puerto publicado, `listen_addresses=` vacío y PGDATA en tmpfs de512MiB, sin binds/volúmenes/volumes-from. Usuario/base `synthetic_validator` / `synthetic_contract_validation`; socket local con trust en contenedor sin red; cero credenciales heredadas de QA/producción. ISOLATION.json registra comprobaciones previas al SQL y la configuración real. Tres contenedores creados y destruidos, cada uno con recibo CLEANUP.json e inspección posterior de ausencia. Ninguno se conserva.

## DDL y preparación

1. Estructuras canónicas: sentencias DDL exactas, seleccionadas por AST PostgreSQL16 y en orden del manifest de migraciones existente. BASE_STRUCTURAL_INVENTORY.json enumera cada hash fuente y offset/longitud seleccionado. Se verifica SHA de las34 fuentes;23 contienen DDL seleccionado. Se excluyen INSERT/UPDATE/DELETE, todos los DO de pre/postflight de migraciones históricas, locks/settings de runner y seeds. Los DO fueron inspeccionados para descartar DDL/DML embebido. No es una repetición del runner ni de sus pre/postcondiciones operacionales. No se escriben ledger, permisos, roles, grants o registry.
2. `docs/physical-data-model/amendments/NORMATIVE_LIBRARY_20261020/03_DDL_SPEC.sql`:41 sentencias/siete funciones; aplicado íntegro sin editar. Tabla de bindings Knowledge, cuatro columnas nullable, FKs, CHECKs, uniques, índices y triggers.
3. `docs/executable-contracts/amendments/NORMATIVE_LIBRARY_H04_SQL_GRAMMAR_20261021/DDL_SPEC.sql`:cuatro sentencias/una función; aplicado íntegro. Es el SQL efectivo, no el predecesor superado por el corrector gramatical.
4. Corrector candidato `NORMATIVE_LIBRARY_H04_PHYSICAL_VALIDATION_20261021/DDL_SPEC.sql`:una sentencia CREATE OR REPLACE FUNCTION, aplicada después de ambos DDL sólo en attempt-03. No agrega tablas/columnas ni edita contratos publicados. Sin recibo de publicación: **CANDIDATE_NOT_PUBLISHED**.

Los tres hashes DDL figuran en FINAL_RESULT.json y attempt-03/RESULT.json. Los cuerpos SQL realmente enviados y sus salidas son reproducibles por caso. Se usaron únicamente fixtures sintéticos propios: dos tenants, actor sin grants, referencias editoriales y paquete en draft, controles, configuración y auditorías/derechos ficticios sólo dentro del contenedor. Un fixture con use_environment=production es una etiqueta sintética; nunca es una conexión a producción ni evidencia de licencia. No se importó ningún contenido normativo.

## Resultados y hallazgos preservados

| Ejecución | Resultado original conservado | Interpretación |
|---|---|---|
| attempt-01 |61 PASS /65 FAIL |64 falsos negativos por espaciado SQLSTATE en el harness; un supuesto inválido de fixture EC |
| attempt-02 |127 PASS /2 FAIL |Fallo físico H04 confirmado en paquete válido y desconocido: columna tenant_id inexistente |
| attempt-03 |149 PASS /0 FAIL |Batería final ampliada con corrector candidato y ambas carreras concurrentes |

PV-H04-01: `regulatory_pack_versions` es el catálogo global canónico y no tiene tenant_id. El trigger H04 intentaba leer esa columna. El corrector sólo bloquea por FOR SHARE el ID de paquete exacto, dejando al FK existente rechazar el ID desconocido (23503). Ownership y audiencia siguen vinculados al KnowledgeSource y al tenant exacto. REVIEW.json, DELTA.md, AUTHORIZATION.json y manifiesto candidato permiten revisar los bytes sin tocar sellos.

PV-TEST-01: el verificador esperaba un espacio exacto en errores psql; se corrigió la extracción del token SQLSTATE sin eliminar la validación de mensaje/constraint. No se reescriben logs históricos. PV-TEST-02: dos controles diferentes no pueden compartir legítimamente input_hash porque el contrato incluye ControlVersion en sus entradas. Se conserva un check de rechazo de hash repetido y se agrega el positivo con hashes distintos; no se modifica ninguna restricción física.

## Cobertura real

CHECK_MATRIX.csv enumera149 comprobaciones:23 bloques estructurales, tres DDL candidatos/efectivos, identidad PG16, fixtures y121 comprobaciones adicionales. Incluye XOR/citas/FKs, cuatro destinos tipados, separación global/tenant y tenant cruzado; numeración por Item; inmutabilidad de publicación/targets y sucesión única; configuración por ControlVersion, scopes, intervalos, sucesores/uniques, EC; contexto exacto de aplicabilidad e históricos NULL; H04 siete actos/cuatro entornos/cuatro tipos de contenido, audiencia, paquete, evidencia sintética, auditoría, revocación única; índices presentes/válidos y constraints validados; validación diferida al commit y rollback sin residuos; atomicidad de auditoría+derecho.

Concurrencia: dos sesiones reales compiten entre publicación y edición de binding, y entre dos aprobaciones sucesoras del mismo predecesor. Se observa primero el lock en pg_locks, sin asumir orden por sleep. Se verifica el rechazo y se conservan SQL/log de las dos sesiones A. CATALOG.json conserva definiciones reales de constraints, índices y triggers. No hay mocks de PostgreSQL.

Alcance acotado: el aislamiento acreditado es de integridad de escritura por FKs/guards con dos tenants. No es prueba de lectura multi-tenant con roles reales, RLS, permisos efectivos, SoD, idempotencia HTTP/outbox o E2E de aplicación. El modelo05 declara RLS futura; no se agrega ni se atribuye PASS a RLS. La política H04 de acreditación jurídica y la lectura del almacenamiento no se prueban con estos fixtures. No se ejecutan tests QA, navegador, builds ni suites de código sin cambios: se reutilizan sus recibos históricos, sin actualizarlos a PASS de esta ejecución.

## Gates y siguientes decisiones

RECTOR_GATE=PASS para la preparación/validación aislada autorizada; rector final exit0 en RECTOR_GATE.json. Esto no convierte el SQL H04 efectivo en PASS: sus dos fallos continúan documentados hasta una publicación sucesora. Gramática SQL/PLpgSQL PG16.1 del corrector y sintaxis Python verificadas. Todos los entornos destruidos. Las migraciones del producto, QA y producción no se ejecutan, ni su ledger/registry/grants. No se modifica backend/frontend, baseline, infraestructura persistente, DNS, secretos o despliegues. No stage/commit/push/merge.

Pregunta concreta de desbloqueo: ¿autoriza el PO publicar contractualmente el corrector candidato PV-H04-01 de una sola función, identificado por el manifiesto candidato, manteniendo separados cualquier migración, importación, habilitación IAM/registry o despliegue? La orden física autoriza preparar sucesores verificables; aquí no se presume su publicación. No se reabre H04 conceptual ni se ratifican D01–D09/H01–H04.

Después siguen pendientes derechos reales por fuente/acto/entorno; Definition/rules y grants/registry operacionales; adopción física y preflight de datos existentes en un entorno autorizado; montaje runtime/backend/UI, QA/E2E y aceptación humana. Son decisiones y pruebas separadas, no cubiertas por este PASS sintético. B10/B11 documentales. STEP6A5/STEP6A6 NOT_STARTED.
