# Pruebas y gates locales

Resultado final:251 tests /21 archivos PASS; typecheck/build globales PASS;8 casos browser aislados PASS. Los logs y códigos de salida están en CHECKS.json.

| Check | Comando | Exit | Log |
| --- | --- | --- | --- |
| focused-tests | `pnpm exec vitest run apps/backend/src/normative-library apps/backend/src/configuration/control-adjustment-policy.test.ts apps/backend/src/configuration/resolver.test.ts apps/backend/src/configuration/effective-read.test.ts apps/backend/src/regulatory/library-law.test.ts apps/frontend/src/normative-library.test.tsx apps/frontend/src/normative-library-client.test.ts apps/frontend/src/normative-library-workspace.test.tsx apps/frontend/src/core-grc.test.tsx apps/frontend/src/api-client.test.ts apps/frontend/src/reference-read.test.ts apps/backend/src/core-grc/routes.test.ts apps/backend/src/core-grc/core-grc.test.ts apps/backend/src/core-grc/phase5-final-closure.test.ts` | 0 | focused-tests.log |
| typecheck | `pnpm typecheck` | 0 | typecheck.log |
| build | `pnpm build` | 0 | build.log |
| contract-gate | `pnpm contracts:verify` | 0 | contract-gate.log |
| library-assets | `node scripts/normative-library/generate-contract-assets.mjs --check` | 0 | library-assets.log |
| rights-assets | `node scripts/normative-library/generate-rights-contract.mjs --check` | 0 | rights-assets.log |
| rector-integrity | `bash scripts/verify-rector-governance.sh` | 0 | rector-integrity.log |
| rector-status | `bash scripts/test-rector-governance-status.sh` | 0 | rector-status.log |
| generator-repeat | `pnpm contracts:verify` | 0 | generator-repeat.log |
| whitespace | `git diff --check` | 0 | whitespace.log |

Browser: `pnpm exec playwright test --config scripts/normative-library/playwright-code-composition.config.ts`. Servidor Vite preview exclusivamente127.0.0.1:4182; bundle de build global. API interceptada en el navegador con datos sintéticos; cualquier destino inesperado se aborta. Ningún backend ni DB remoto se inicia/consulta. Los tests no se denominan E2E reales QA.

El primer intento local de preview fue rechazado por sandbox (listen EPERM); se repitió con autorización de ejecución local. Los intentos browser01/02 están preservados:01 falló por etiqueta esperada Publicado frente a Publicada y catálogo sintético de ediciones vacío que limpiaba correctamente la selección;02 falló sólo al intentar usar el selector de empresa oculto en layout estrecho. Se corrigió el test: captura estrecha y cambio mediante selector visible al ampliar temporalmente el viewport, luego regreso390px. No se forzaron controles ocultos ni se cambió el layout aprobado. Los ocho casos finales pasan. El primer test SSR de MatrixWorkspace detectó window no definido; se corrigió el acceso a parámetros de ubicación en SSR y se repitió la suite.

Cobertura browser: contenido y capas editoriales; retiro de contenido al cambiar contexto sin permisos; seis matrices full y sus filtros obligatorios; empty state/aviso de autorización; mini3/3/9 y navegación al mismo lector full; acceso directo sin grants a Normas/Platform; screenshots escritorio/estrecho y overflow principal. Los writes UI, selectores B07 y decisiones gerenciales no se presentan como verificados en navegador: sí están incluidos en build y sus contratos/hooks/policies tienen pruebas aisladas.

Visual: se leyó manifest y6 contratos activos, se inspeccionó baseline dashboard v1.0 y capturas nuevas. Brand/CSS/tokens/assets recibidos se preservan por hash. No existe referencia humana aprobada de estas nuevas superficies para comparación píxel exacta; las capturas son evidencia técnica de composición/layout, no una nueva aprobación. HUMAN_UI_REVIEW=PENDING.

Generador rector ejecutado dos veces en modo --check con salida idéntica y35 migraciones/244 tablas. verify.py exige igualdad de ambos logs y hashes de toda la cadena física recibida. Generadores B01–B09/H04 en --check PASS. Los gates rectores son técnicos PASS; el cierre del alcance rector queda BLOCKED por CODE-B04-01.

Omitidos deliberadamente: conexiones SQL/DDL/DML QA; verificadores runtime/schema que consultan DB; activación IAM/registry/Definitions/derechos; importaciones; deploy; E2E con backend+PostgreSQL+storage reales y actores reales. Estas operaciones están expresamente excluidas o requieren dependencias/autorizaciones separadas. No se repitieron pruebas físicas históricas PostgreSQL16.15 ni adopción35.

Advertencia de build: chunk frontend >500kB, sin relajar umbral. No implica fallo de compilación ni prueba de rendimiento operacional. FIELD/actor/SoD/H04 negativos se comprueban en suite local, sin extender sus resultados a QA.

Reproducción sin mutar evidencia: ejecutar los comandos de CHECKS.json desde raíz; capturar salidas en otra carpeta si se desean conservar. El verificador sucesor verify.py es de sólo lectura; no ejecutar el verificador histórico como si aceptara estas modificaciones posteriores.
