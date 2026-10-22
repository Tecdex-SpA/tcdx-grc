# Pruebas y gates locales

Resultado final: **195 tests PASS**. Son144 focalizados en16archivos,13 de autenticación y38 físicos PostgreSQL16 en un archivo. Los cuatro rechazos esperados de Definitions pasan como negativos; su gate operacional continúa BLOCKED. CHECKS.json contiene comandos, códigos de salida y rutas de logs; FILE_MANIFEST los sella.

Se utilizó Node22.23.2 instalado localmente, pnpm12.4.1 y PostgreSQL16. El runner fija host127.0.0.1:55549, DB desechable tcdx-grc, comprueba puerto libre y data_directory propio bajo /private/tmp/tcdx-library-operational.*, y detiene sólo ese clúster mediante trap. No carga .env ni credenciales de QA. Reconstruye allí las35 migraciones existentes; no crea una36 ni toca el generador. El ledger aislado conserva35 filas.

| Gate | Resultado | Evidencia |
| --- | --- | --- |
| Focused library/backend/frontend/B04/private publisher | PASS144/16files | checks/focused.log |
| Auth/JWT/session regression | PASS13 | checks/authentication.log |
| PG16 IAM/B06/H04/Definitions blockers | PASS38 | checks/postgres.log |
| Typecheck global | PASS | checks/typecheck.log |
| Build global | PASS, warning frontend >500kB existente | checks/build.log |
| Typecheck/build backend sobre últimos bytes | PASS | checks/backend-typecheck.log; checks/backend-build.log |
| Generador canónico --check | PASS244tables/35migrations | checks/canonical-generator.log |
| Assets B01–B09 y sucesor B04 | PASS25schemas/31newoperations | checks/library-assets.log |
| Assets H04 y sucesores | PASS | checks/rights-assets.log |
| Rector integrity/status | PASS técnico | checks/rector-integrity.log; checks/rector-status.log |
| Migraciones1–35/manifest/expected-schema/generador | PASS_UNCHANGED | INITIAL_STATE; FILE_MANIFEST; verify.py |
| Arquitectura del delta local | PASS_NO_PARALLEL_AUTHORITY; gate integral BLOCKED_LOCAL_DEFINITIONS_01 | ARCHITECTURAL_REVIEW.json |
| Secret scan | PASS0findings | checks/secrets.log |
| Whitespace | PASS | checks/whitespace.log |
| Browser B04 histórico | REUSED10PASS, unchanged frontend | code-b04-01-full-resolution-20261022/TEST_REPORT.md; preservación SHA |
| QA/runtime/MinIO real | NOT_RUN | Exclusión PO; no se extrapolan fixtures |

## Reproducción focalizada

Ejecutar desde raíz con Node22 y pnpm12.4.1 disponibles en PATH. No instalar dependencias ni usar servicios remotos para completar un gate ausente.

```sh
pnpm exec vitest run apps/backend/src/security/normative-library-publication.test.ts apps/backend/src/security/publication-operator-server.test.ts apps/backend/src/configuration/control-definition-references.test.ts apps/backend/src/configuration/control-adjustment-policy.test.ts apps/backend/src/normative-library apps/backend/src/regulatory/library-law.test.ts apps/frontend/src/normative-library-workspace.test.tsx apps/frontend/src/normative-library-client.test.ts apps/frontend/src/core-grc.test.tsx
pnpm exec vitest run apps/backend/src/security/authentication.test.ts
bash scripts/normative-library/run-operational-postgres-tests.sh
pnpm typecheck
pnpm build
pnpm contracts:verify
node scripts/normative-library/generate-contract-assets.mjs --check
node scripts/normative-library/generate-rights-contract.mjs --check
bash scripts/verify-rector-governance.sh
bash scripts/test-rector-governance-status.sh
pnpm secrets:scan
git diff --check
```

El test PostgreSQL se incluye sólo con su opt-in y exige identidad del clúster antes de crear fixtures. `verify.py` no lo ejecuta ni conecta DB. El gate de integridad de migraciones es checksum local + ledger físico aislado; no es un DATABASE_DRIFT_GATE nuevo de QA. Los scripts rectores validan integridad/status técnico, no cierran por sí mismos la Biblioteca; sus campos históricos no sustituyen el estado final del slice.

## Cobertura material

- IAM: catálogo y pares exactos, replay/concurrencia, usuario con permiso/sin permiso, cadena MembershipRole/PlatformRoleAssignment, Support, defaultDENY, principal inactivo y rollback de auditoría. Config opcional ausente/incompleta y autenticación fallida no abren publicación.
- Cada uno de los13bindings: adopción exacta, negativo de SoD, scope, efecto ausente y ordinal divergente. FK de permiso desconocido produce23503. Las policies y transiciones conservan el dispatch de decisiones aprobado.
- Cada una de las4Definitions: descriptor/version/scope y regla hash preparados sin IDs; INSERT contractual devuelve23514 por typed_default. Descubrimiento B04 físico vacío legítimo, create sin Definition válida denegado409. Los tests de código B04 preservados comprueban elegibilidad/versiones/vigencia, revalidación, selector y creación con SQL executor sintético.
- H04: ingreso con proof sintético y audit físico, inexistencia/insuficiencia/futuro/expiración/acto/fuente/tenant/entorno/proof; publication no heredada de consultation; usuario sin permiso y tenant ajeno; overlap negado; rollback audit+right, replay/concurrencia, revocación e historia inmutable. Las suites existentes comprueban el adaptador MinIO con cliente fixture, nunca una licencia real.
- Composición, bootstrap, B07, policies, contratos, matrices y frontend se verifican en las suites focalizadas existentes. No se declara un flujo físico B04 aprobado ni E2EQA.

## Intentos y correcciones

1. El sandbox rechazó `initdb` por memoria compartida (`shmget: Operation not permitted`). Se pidió la escalación de sistema requerida y se ejecutó el mismo runner local; no se cambió su destino ni se usó QA.
2. PG_ATTEMPT_1.log:24fallos/11PASS; causa primaria real: typed_default prohíbe los NULL aprobados. La transacción se revirtió. La implementación separó IAM/B06 y preparó los4descriptores sin un writer que viole el contrato. No se altera esta evidencia histórica.
3. PG_ATTEMPT_2.log:34PASS/1fallo; la fixture B04 omitía el campo requerido scope_level, por lo que recibía400 antes de la negación por Definition inexistente. Se corrigió el request de prueba, sin cambiar API/policy. Corrida siguiente35PASS.
4. Se añadieron negativos físicos de principal/FK, atomicidad/concurrenciaH04 y ordinales B06: corrida final38PASS. Se repitieron sólo estos tests y las regresiones focalizadas pertinentes.
5. Typecheck intermedio detectó la unión de operaciones del operador en server.ts sin el nuevo literal; se completó el dispatch tipado de la misma vía privada. Typechecks/builds finales PASS. Ningún fallo se reinterpretó como PASS.
6. SECRET_SCAN_ATTEMPT_1.log detectó en la copia plaintext del status un flag histórico cuyo fingerprint ya está aprobado en su ruta canónica. Se confirmó ese fingerprint exacto, sin exponer su valor ni ampliar excepciones del scanner. El preimage de status se conserva como string JSON con roundtrip/hash exacto; los otros seis preimages son bytes originales. El scan final vuelve a pasar. El manifiesto incluye también logs ignorados por Git: no se omiten de hashes ni conteos.

No se emitieron fixtures, nuevos contratos o imágenes a QA. La evidencia sintética permite valorar la implementación local y sus límites; no acredita aceptación operacional, legal, humana, performance ni release comercial.
