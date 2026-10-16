# Task packet técnico propuesto y preparación de release

TASK_ID=STEP6A3_COMMERCIAL_RECONCILIATION_20261013_02.
MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.8_2026-10-09.
CODEX_VARIATION_BUDGET=ZERO. DESIGN_PREPARATION=AUTHORIZED_BY_CURRENT_MANDATE.
IMPLEMENTATION=BLOCKED_PENDING_EXACT_HUMAN_APPROVAL_AND_PUBLICATION. QA/DEPLOY/IAM=NOT_AUTHORIZED.

## Alcance cerrado después de aprobación/publicación/gates

Reusable: apps/backend/src/security/platform-iam-service.ts subscriptionCreate y tenant lock; platform-authority.ts resolución Platform; persistence/foundation-records.ts claim/complete/audit/outbox; administrative-read.ts catalogue/tenant projections; packages/contracts OpenAPI/generator; regulatory pack services exact version; apps/frontend/src/core-grc.tsx Asignar plan; frontend ApiClient y componentes visuales. Reutilizar por contrato, no copiar un helper incompatible: alta replay actual reconstruye proyección, por ello NO usar ese replay para change-plan.
Derivar artefactos activos exactos: catálogo nominal/canónico/lógico/modelo físico/expected-schema, executable02/03/04/05/07/08/09/18, typed contracts y registry. Fuentes bytes aquí se presentan como candidatos; publicación superior competente precede código. Baseline activa inmutable; sucesora/enmienda material sólo con su propia manifestación exacta y autoridad.

Backend: commercial domain validator/catalog publisher, Subscription change application command, typed repository, read query projection, registry mapping, authoritative PlatformObjectPolicy y errores; HTTProute Fastify específico; modificaciones necesarias del predicado canónico en alta/packactivate/currentpackreads/planVersionSelectableList. Alta conserva permiso/body/envelope/HTTP202 y rechazo segunda alta. Runtime único aplica publicación/completitud/limits en todos consumidores afectados después de adopción; no OLD+NEW fallback.
Frontend: preservar alta inicial; cambio sólo PlatformAdmin con fresh read/CAS, key estable, motivo/código/nuevoPV, resultado/replay/refetch; historial/transfers paginados. No redesign, tenantselfservice, cosméticos o librería nueva. Leer manifest/contratos visuales vigentes; ejecutar regresión visual/keyboard/narrow y revisión humana sobre QA. Versión pendientev1.2 no se autoactiva.
Pruebas dirigidas: escenarios11+temporal10; backend unit/schema/contract, PostgreSQL aislado fresco y upgrade, faults/concurrency/rollback; browser E2E y suites afectadas; typecheck/lint/build/secrets; rector. Nuevos fixtures explícitos aislados, sin seeds comerciales en producto; sin mocks como PG evidence. Cada test incluye IDs/actor/tenant/SQLestado/audit/event counts y hashes relevantes. Suites intactas anteriores se reutilizan por hash/cobertura, no sólo por su conteo.

## Rutas permitidas por etapa

EtapaA actual: sólo FINAL_CONTRACT_RECONCILIATION_20261013/, STEP_6A3_COMMERCIAL_GOVERNANCE_APPROVAL_PACKAGE_V2.md y STEP_6A3_FINAL_CONTRACT_AND_IMPLEMENTATION_REPORT.md. Entradas y cambios heredados read-only. Ningún estado/receipt/grant.
EtapaC propuesta: apps/backend/src/security/commercial-*.ts y sus tests/route consumers autorizados; persistence helper sólo delta replay perfil aprobado; packages/contracts schemas/tests/generation; apps/frontend/src/core-grc.tsx/API client/tests; contracts/model/runner manifest derivados; nueva SQL aprobada; database expected-schema; sólo paths revisados en taskpacket publicado. Prohibidos históricos, otros dominios, IAMreal, infra/deploy, main, baseline in situ y cualquier refactor ajeno. Este listado propuesto no autoriza aún modificar esas rutas.

## Gate previo a implementación

Decisión humana exacta sobre paquete+manifest; publicación gobernada de deltas rectores/canónicos/lógicos; PHYSICAL_DATA_MODEL_REVIEW y EXECUTABLE_CONTRACTS humanos; comprobación de representación completa y efectos de triggers declarados. Si un artefacto posterior cambia materialmente bytes/semántica, requiere nuevo delta por hash. No interpretar approval de intención como approval de archivo futuro.

## Release manifest requerido posterior, no disponible hoy

Version/repo/branch/HEAD del build; backend image digest y frontend image/bundle SHA; exactSQLmanifest/sourceledger/destinationledger; signed publication/adoption manifest; Actor/grants reales; backup/PITRref; ingreso/windowrules hash; dependency packs/capabilities con gates; source/runtime parity; smoke/e2e/audit/isolation/security/visual results; rollbackproof; Security+Release GO. Cada valor se obtiene del artefacto construido/evidencia real. Ningún placeholder se presenta como release firmado.
Estado hoy: NOT_BUILT / NOT_READY_FOR_RELEASE / NO_GO_SHARED_QA. No imágenes/commit/push/deploy. Próximo paso contractual: decisión sobre bytes candidatos; luego publicación/gates; implementación y pruebas afectadas autorizadas; sólo posteriormente paquete operacional QA con inputs reales y autorización.

## Riesgos residuales y detener únicamente lo dependiente

Inventario/compatibilidad real, coexistencia activa por raíz, actores/grants/datos comerciales, ventana y restore, fuentes legales y suficiencia metodología, aceptación externa48cláusulas. Datos incompletos no bloquean preparar/pruebas futuras aisladas del mecanismo tras contrato; sí publicación/contratación/adopción real. Hlegales/metodológicas impiden cierre integral; no reinterpretar la fase. SQL candidate sin ejecución PG no es migración probada.
