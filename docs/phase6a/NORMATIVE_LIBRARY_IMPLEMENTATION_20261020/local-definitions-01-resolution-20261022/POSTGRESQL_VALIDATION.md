# Validación PostgreSQL16 aislada

Resultado:49tests físicos PASS, más verificación de esquema canónica con cero diferencias. Host fijo127.0.0.1:55549, base desechable tcdx-grc, directorio task-owned verificado mediante current_setting(data_directory). LOCAL_CLUSTER_STATUS.json confirma detenido. El runner no carga .env ni conecta a un destino recibido de QA.

El runner crea un clúster vacío, aplica el prefijo inmutable1–35 mediante el runner canónico y su modo de manifest de prueba, luego ejecuta el test upgrade que aplica36 mediante el mismo runner normal. El manifest temporal es sólo el prefijo de la cadena canónica; no es una segunda autoridad. La aplicación final cubre la secuencia completa1–36. Reapply de36 es no-op con ledger idéntico y sin reejecutar DDL.

| Prueba material | Evidencia/aserción | Resultado |
| --- | --- | --- |
| Reproducir defecto recibido | text con defaults NULL bajo35→23514/typed_default | PASS_NEGATIVE_PREDECESSOR |
| Preflight de drift | CHECK mismo nombre alterado dentro de transacción sintética→LOCAL_DEFINITIONS_01_PREDECESSOR_DRIFT; rollback | PASS |
| Compatibilidad anterior | Defaults válidos de boolean/integer/decimal/text/timestamp/duration/json antes de36 | PASS |
| Preservación de datos | SHA256 de filas ordenadas de cada tabla de dominio antes/después de36 | IDENTICAL |
| Otras constraints | Inventario ordenado nombre/relation/definición, excluido sólo typed_default objetivo | IDENTICAL |
| Tipos y cardinalidad | Siete tipos con ausencia y con un default correcto ALLOW; columna ajena y doble default DENY | PASS |
| Tipo desconocido/negativo | Unknown con defaults NULL DENY; duración negativa DENY | PASS |
| Modelo general |244tablas/3630columnas; PK/UQ/FK/index/ownership y98constraints/56indexes/8functions/12triggers normativos | PASS_ZERO_MISMATCHES |
| Cuatro Definitions | Cuatro filas globales published v1/intervalo explícito;7defaults NULL; scope control_version y regla contract_schema exacta | PASS |
| Semántica de ausencia | Resolver devuelve campo original del ControlVersion; confirmación devuelve NULL sin capa seleccionada | PASS |
| Materialización atómica | Falla del audit de Definition revierte catálogo/grants/bindings/Definition/scopes/rules/audit | PASS |
| Idempotencia/concurrencia | Replay exacto y dos replays concurrentes no crean filas ni audits | PASS |
| Versionamiento | Duplicado code@1→23505; code@2 no aprobado hace fallar publisher409 sin sobrescritura | PASS |
| B04 con PostgreSQL | Descubrimiento4, create draft/replay, review de otro actor y decide approved mediante B06; Definition inexistente409 | PASS |

Los negativos ejecutan sólo fixtures en el clúster local y revierten sus deltas. No se deshabilitan constraints para materializar datos válidos. La prueba de drift modifica temporalmente el CHECK en una transacción que necesariamente falla y se revierte; el sistema final conserva el predicado canónico.

Comando reproducible desde raíz con Node22/pnpm12.4.1/PostgreSQL16 instalados:

```sh
bash scripts/normative-library/run-operational-postgres-tests.sh
```

La salida completa está en checks/postgres.log. Se aplica verify-schema después de36, antes de las fixtures funcionales; comprueba también la representación exacta PG16 del CHECK y sus fuentes/checksums. La captura previa de proyección sólo construyó metadata derivada en otro clúster desechable; el gate definitivo usa el runner y ledger canónicos. No hay inspección física QA ni claim de ausencia de drift en un entorno no contactado.
