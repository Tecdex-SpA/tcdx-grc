# Pruebas focalizadas y gates

Resultado:134 pruebas en13 archivos PASS y10 casos browser nuevos PASS. Se verifican las capas cambiadas y regresiones inmediatas; no se repiten indiscriminadamente las251 pruebas/8 browser históricos.

| Check | Comando | Exit | Evidencia |
| --- | --- | --- | --- |
| focused-tests | `pnpm exec vitest run apps/backend/src/configuration/control-definition-references.test.ts apps/backend/src/configuration/control-adjustment-policy.test.ts apps/backend/src/normative-library apps/frontend/src/normative-library-workspace.test.tsx apps/frontend/src/normative-library-client.test.ts apps/frontend/src/core-grc.test.tsx` | 0 | focused-tests.log |
| library-assets | `node scripts/normative-library/generate-contract-assets.mjs --check` | 0 | library-assets.log |
| canonical-assets | `pnpm contracts:verify` | 0 | canonical-assets.log |
| rector-integrity | `bash scripts/verify-rector-governance.sh` | 0 | rector-integrity.log |
| rector-status | `bash scripts/test-rector-governance-status.sh` | 0 | rector-status.log |
| whitespace | `git diff --check` | 0 | whitespace.log |
| typecheck | `pnpm typecheck` | 0 | typecheck.log |
| build | `pnpm build` | 0 | build.log |
| rights-assets | `node scripts/normative-library/generate-rights-contract.mjs --check` | 0 | rights-assets.log |
| canonical-repeat | `pnpm contracts:verify` | 0 | canonical-repeat.log |
| secrets | `pnpm secrets:scan` | 0 | secrets.log |
| frontend-build-repeat | `pnpm --filter @tcdx-grc/frontend build` | 0 | frontend-build-repeat.log |
| frontend-typecheck | `pnpm --filter @tcdx-grc/frontend typecheck` | 0 | frontend-typecheck.log |
| frontend-final-build | `pnpm --filter @tcdx-grc/frontend build` | 0 | frontend-final-build.log |
| frontend-final-tests | `pnpm exec vitest run apps/frontend/src/normative-library-workspace.test.tsx apps/frontend/src/core-grc.test.tsx` | 0 | frontend-final-tests.log |
| final-library-assets | `node scripts/normative-library/generate-contract-assets.mjs --check` | 0 | final-library-assets.log |
| final-rector-integrity | `bash scripts/verify-rector-governance.sh` | 0 | final-rector-integrity.log |
| final-whitespace | `git diff --check` | 0 | final-whitespace.log |

Browser final: `pnpm exec playwright test --config scripts/normative-library/playwright-b04-resolution.config.ts`; salida JSON en browser-results.json, capturas/trace en browser/. Vite preview en127.0.0.1:4184. Build hash de archivos en BUILD_ARTIFACTS.json. El navegador intercepta APIs: descubrimiento y guardado se envían a la composición Fastify real con sus servicios/policies y un ejecutor SQL sintético; catálogos de controles/proyección auth se simulan para la UI. Destinos no esperados se abortan; no conexión PostgreSQL ni a QA.

| Requisito | Prueba/evidencia | Resultado |
| --- | --- | --- |
| Consulta válida/autor B04 | HTTP4 refs, sólo grant funcional create, sin Platform/override.read | PASS |
| No autorizado/scopes/capability/roles | parametrizadas403 antes de consulta de target/Definitions; bootstrap401 | PASS |
| Control ajeno/global/ausente y enumeración |404 uniforme, cero búsqueda Definition; mismo control/parent tenant en SQL | PASS |
| Definition no publicada/no elegible | draft/approved/retired/futura/expirada/owner/flags/scope/version | PASS |
| Empty y dependencias |200 items vacíos legítimos;503 reglas ausentes/422 reglas inválidas | PASS |
| Cambio control y selección invalidada | browser2 viewports, selección/valor anteriores eliminados | PASS |
| Crear B04 | POST existente202 con FK exacta, draft, un audit/outbox/completion | PASS |
| Revalidar al guardar | cambio de estado/vigencia/flags posterior a GET409; grant retirado403; alien404 | PASS |
| Errores y respuesta contractual | schema cerrado/code422/503 y validación antes de SQL | PASS |
| Integración frontend/backend | creación y periodicidad via ApiClient→Fastify→servicios→SQL executor fixture | PASS_ISOLATED |
| Regresiones de orquestación/H04/SoD | suites library/composition/bootstrap/rights/custody/mutations + policy y shell | PASS_LOCAL |
| Gate físico/cadena | hashes de35 SQL, manifest/schema, generador canónico y bytes recibidos | PASS_LOCAL_INTEGRITY |

Cobertura browser adicional: guardado sin grant Platform ni override.read; vacío/deny/error sin submit; revocación de Definition y limpieza automática; vocabulario CV-03 muestra Mensual y persiste monthly sin convertir meses a días. Capturas desktop1536×1024 y390×844, etiquetas semánticas, foco nativo y overflow principal. El CSS/logo/tokens/layout existentes permanecen intactos. HUMAN_UI_REVIEW=PENDING; no actualización/aprobación de baseline visual.

Intentos y correcciones preservados: la primera corrida de8 casos pasó. Al añadir periodicidad, el localizador exacto getByLabel de un select envolvente no resolvía aunque el control accesible estaba presente; se corrigió el test para usar roles textbox/combobox y espera visible, sin forzar controles ni relajar aserciones. El intento fallido está en browser-attempt01.json/browser-attempt01. La corrida final10 casos pasó. Un typecheck intermedio rechazó indexar las etiquetas publicadas con string genérico; se corrigió mediante vista readonly tipada, manteniendo disabled para etiqueta ausente. Typecheck final PASS.

Un intento de comparar todos los archivos de dist antes/después de build no fue válido tras typecheck: el script frontend typecheck usa tsc -b y emite archivos transpilados que Vite limpia al construir. Se verificó repetición limpia con diferencias vacías (build-before-repeat.json/frontend-build-repeat.log) y después se registraron hashes del bundle final. No se usa ese intento para afirmar un fallo o PASS del generador canónico. Los dos logs canonical-assets/canonical-repeat --check sí son idénticos y la cadena de35 migraciones permanece exacta.

La compilación global y la final frontend pasan; se conserva la advertencia de chunk >500kB, sin cambiar límites. Secret scan0 findings. Las pruebas existentes de transacciones verifican orquestación sobre fixtures, no atomicidad PostgreSQL física. Conexiones QA, DDL/DML, migraciones, activaciones IAM/registry/Definitions/rights, importación, despliegue, JWT/roles reales y E2E QA no se ejecutan por exclusión expresa. Ningún fixture se instala en rutas reales ni en DB operacional.

Para reproducir, ejecutar comandos desde raíz y capturar nueva evidencia fuera de esta carpeta sellada. verify.py es de sólo lectura y comprueba estado recibido/deltas/fuentes/contratos/resultados. Los verificadores de expedientes anteriores con snapshots cerrados no incluyen este sucesor y no se editan para acomodarlo.
