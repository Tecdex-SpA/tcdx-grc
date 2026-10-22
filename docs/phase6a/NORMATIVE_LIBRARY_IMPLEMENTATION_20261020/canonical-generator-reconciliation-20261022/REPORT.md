# Reconciliación del generador canónico — 2026-10-22

## Resultado

`CANONICAL_GENERATOR=PASS`. El generador rector reproduce de forma determinista el manifiesto aprobado de 35 migraciones y el `expected-schema` de 244 tablas. La migración 35, las migraciones 1–34, `database/migrations/manifest.json` y `database/expected-schema.json` conservaron sus bytes.

El alcance fue exclusivamente local y de código. No hubo conexión a PostgreSQL QA, DDL, DML, escritura del historial de migraciones, importación, activación IAM/registry, despliegue ni cambio de infraestructura.

## Causa raíz

`scripts/foundations/generate-contract-assets.mjs` terminaba la cadena generadora en el sucesor C04W. Construía `c04wManifest` con 34 migraciones y consumía `EXPECTED_SCHEMA_C04W_CANDIDATE.json` con 242 tablas; esas dos variables alimentaban directamente los dos `writeOrCheck`. La posterior reconciliación G4 había actualizado correctamente los artefactos canónicos a 35 migraciones y 244 tablas, pero no había integrado su fuente publicada y su proyección PG16 en el único generador rector.

No era un defecto del manifiesto aprobado. La migración 35 aplicada, su recibo QA, el manifiesto de 35 filas y el esquema esperado adoptado eran coherentes entre sí.

## Corrección

Se modificó únicamente `scripts/foundations/generate-contract-assets.mjs`:

- valida por hash y estado el recibo contractual PV-H04-01 y el recibo de adopción QA;
- consume el manifiesto candidato exacto que fue adoptado y exige que sus primeras 34 filas sean idénticas al sucesor C04W;
- verifica la migración 35, su SHA-256, las tres fuentes DDL publicadas, su orden y sus offsets byte a byte;
- deriva la tabla H04 desde el `CREATE TABLE` publicado mediante un parser acotado de elementos SQL, sin copiar una segunda definición de tabla;
- incorpora la proyección de catálogo PostgreSQL 16 sellada, verificando su hash, limpieza del entorno y todos sus resultados PASS;
- reconstruye el `expected-schema` completo y exige el SHA-256 aprobado antes de aplicar `writeOrCheck`;
- reporta 35 migraciones y 244 tablas.

No se añadió un segundo generador ni una segunda fuente de verdad. El DDL publicado conserva autoridad y la proyección PostgreSQL se trata explícitamente como evidencia derivada.

## Autoridades inspeccionadas

- `AGENTS.md`, rector 46 y `CODEX_RECTOR_ENFORCEMENT.md`.
- Recibos de publicación PV-H04-01 y adopción física QA.
- `MIGRATION_RECONCILIATION.json`, `SYNTHETIC_PROJECT.json` y el manifiesto candidato adoptado.
- Contrato de esquema B01–B09 y los tres DDL efectivos B01–B09/H04/PV-H04-01.
- Generador, runner, verificador de esquema, manifiesto y esquema esperado vigentes.

## Integridad antes/después

| Artefacto | Antes | Después | Resultado |
|---|---|---|---|
| Generador | `d5f655067eaab090d15a038b1afc79e320d461873769cd10a7699832d68a934e` | `f91d67ca5a5e64169a0964a81439137c22f842888e323dd48e671098c5856209` | cambio autorizado |
| Manifiesto | `70ecaa0f4bbf168a1f5e4c3cefbd734036217dc7b09ac3d4a11b65f9cbc66152` | mismo | preservado |
| Expected schema | `c2fc38768ee6c7b3760346ec862304204e4f94abd18a2d8150745bbaf6953207` | mismo | preservado |
| Migración 35 | `9279159e88c60fff03f998e33008fb0d675f53e4423df638c9e54f709a773798` | mismo | preservada |
| Migraciones 1–34, agregado ordenado | `12a234fe50ba389a8523cac90445990319ab533d6c017c0085689732600424b5` | mismo | preservadas |

El diff exacto está en `GENERATOR.diff`.

## Verificación

| Gate | Resultado | Alcance |
|---|---|---|
| Generador `--check`, ejecución 1 | PASS | 244 tablas, 35 migraciones |
| Generador `--check`, ejecución 2 | PASS | salida idéntica; hashes de todos los SQL/manifiesto/esquema sin cambios |
| `pnpm contracts:verify` | PASS | gate generador canónico |
| `scripts/test-rector-governance-status.sh` | PASS | corrige el fallo original |
| `scripts/verify-rector-governance.sh` | PASS | baseline v1.12 e integridad protegida |
| Generador contractual B01–B09 `--check` | PASS | 24 schemas, 30 operaciones |
| `git diff --check` | PASS | sin errores de whitespace |
| Verificador histórico de adopción QA | EXPECTED_SCOPE_REJECTION | rechaza cualquier cambio posterior a su snapshot; señaló solamente el generador ahora autorizado |

El rechazo del verificador histórico no se relajó ni se editó. El verificador sucesor de este expediente conserva su snapshot y permite exactamente el delta autorizado del generador. No se ejecutó un `DATABASE_DRIFT_GATE` nuevo porque este trabajo prohibía conectar a QA; se preservan los recibos anteriores y se informa `NOT_EXECUTED`.

## Riesgo residual y siguiente paso

La reconciliación depende deliberadamente de los recibos y de la proyección PG16 sellada; cualquier cambio en ellos bloquea el generador por hash. Esta rigidez es coherente con presupuesto de variación cero. El generador no intenta reinterpretar SQL arbitrario ni sustituye al runner/verificador físico.

El siguiente paso seguro es que el PO revise este cierre y emita, si corresponde, una autorización separada para el siguiente bloque del plan de habilitación operacional. Esta reconciliación no habilita B01–B09/H04 ni autoriza IAM, bootstrap, frontend o despliegue.

