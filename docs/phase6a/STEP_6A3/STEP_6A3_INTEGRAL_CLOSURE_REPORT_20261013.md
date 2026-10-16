# STEP_6A3 — Informe integral de cierre, 2026-10-13

**Dictamen: STEP_6A3=PARTIAL_BLOCKED; RECTOR_GATE=BLOCKED para cierre y activación comercial. STEP_6A4=NOT_STARTED; entrada READY no acreditada.**

MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.8_2026-10-09; BASELINE_STATUS=ACTIVE; CODEX_VARIATION_BUDGET=ZERO; TASK_PACKET_STATUS=BLOCKED para nuevos contratos comerciales. La integridad rectora técnica pasa; ese PASS no aprueba modelo/contratos nuevos ni sustituye cierre de fase. No se inició STEP_6A4, intermedio normativo ni STEP_6A5.

## 1. Estado inicial, Git y continuidad

Rama verificada y conservada: fix/qa-functional-commercial-onboarding-20261013. HEAD local y remoto de esa rama: 23c7b50468213b8c0769ca2607349e04f4c32eae. HEAD remoto main: 6af66387aa03fa185ef139584de07700f247b903. Coinciden con la continuidad informada; main no se alteró. Sin cambios tracked al inicio. Se encontraron dos archivos untracked heredados qa-functional-execution.json y qa-functional-execution-r2.json en rescue-20261013; no se escribieron ni se incluyeron como resultados nuevos.

Evidencia: [entry-state.json](CONSOLIDATED_APPROVAL_20261009/evidence/integral-closure-20261013/entry-state.json). Los hashes de archivos tracked previos se obtienen de HEAD; los hashes de contenido de los untracked se registraron al preparar el informe, no retrospectivamente como observaciones de entrada. No hubo commit, push, merge, nueva rama, deploy ni promoción.

Rector leído/verificado: AGENTS.md, entry46, enforcement, contratos 07/08/09/13/21/22/23/25/26/28/29/30/33/34/35/37/41/42/43/45/47/49, aprobación/estado de modelo físico y ejecutables, decisiones Subscription y pack authority, enmienda DRAFT, metadata/receipts R1/R2/R3/R6 y estado fuera del baseline. Se reutilizó el trabajo existente de alta, locks, proyección, auditoría, outbox y fixtures. No se tomó el código como autoridad de producto.

MASTER_EXECUTION_STATUS y ledger vigente mantienen 36/48 cláusulas DONE y 12 pendientes. La evidencia rescue posterior documenta QA30 R2 técnica y alta inicial; no cierra automáticamente las cláusulas metodológicas/legales/runtime. [inherited-pending-clauses.json](CONSOLIDATED_APPROVAL_20261009/evidence/integral-closure-20261013/inherited-pending-clauses.json) preserva texto, owner, fuente, estado y resolución de las doce.

## 2. PostgreSQL QA realmente verificado

[qa-readonly.json](CONSOLIDATED_APPROVAL_20261009/evidence/integral-closure-20261013/qa-readonly.json) se obtuvo desde el backend existente 192.168.2.45 usando su driver/configuración TLS. Identidad: PostgreSQL16, 192.168.2.40, tcdx-grc, TLSv1.3, transaction_read_only=on. **DDL=0; DML=0; secretos exportados=0.**

Resultado actual: 30 migraciones aplicadas, última 20261007000200; hashes del ledger registrados; 172 permisos publicados; cero platform.subscription.change_plan; cero UsageLimit; cinco raíces regulatorias; ausencia de catálogo CommercialFamily y relaciones candidatas; cero tenants con múltiples suscripciones efectivas según el predicado actual. El conteo cero prueba el estado observado, no la garantía futura de change-plan.

No se ejecutó ninguna operación comercial contra QA. La consulta no publica ni valida licencia/cobertura de los cinco packs. La condición operativa QA32, respaldo/restore y compatibilidad sigue separada de las pruebas locales.

## 3. Brechas y decisiones del rescate

| Brecha | Evidencia y estado final |
| --- | --- |
| PlanVersion–CommercialFamily | CommercialFamily ausente de rector33 y tablas candidatas ausentes de QA. Modelo/relaciones exactos consolidados DRAFT; activación pendiente de aprobación. |
| Límites por versión/familia | Sin valores ni código publicado. Propuesta reutiliza UsageLimit y familia tipada, sin límites arbitrarios; no se publicaron cantidades. |
| UL-01, integridad de UsageLimit | Modelo01 prescribe clave por versión/código/vigencia y no negatividad; SQL aplicado y expected-schema imponen UNIQUE(limit_code) y no CHECK de valor >=0. QA real confirma. Reconciliación explícita incorporada al borrador. |
| change-plan | No existe operación ejecutable publicada ni permiso. Intención autorizada; payload/registry/audit/read/model no aprobados exactos. No se implementó una ruta fuera del gate. |
| active → ended | Estado previsto por mandato; falta arista LifecycleTransitionDefinition conforme21§16. No se escribió estado por CRUD. |
| Traslado de packs | Exact-version authority existente reutilizable; preflight de familia/límites, cierre de intervalos, future packs y exclusión por raíz requieren publicación/decisión. |
| Lectura actual/historial | Lectura actual inicial comprobada en PostgreSQL/API. Detail CAS e historial nuevos preparados en DRAFT, sin ampliar tenantGet por conveniencia. |
| Auditoría | Alta real y rollback ante fallo PostgreSQL comprobados. Eventos/linaje de change-plan candidatos, no activados. |
| Regresión contractual | Prueba MI7A esperaba164 operaciones/59GET aunque contrato/matriz vigente de commit8da37de contiene165/60 por planVersionSelectableList. Se corrigió sólo la expectativa y se añadió comprobación del operationId exacto.105 mutaciones, paridad y trazabilidad permanecen comprobadas. |
| Cierre global STEP_6A3 | Doce cláusulas heredadas pendientes más nuevo paquete comercial pendiente; no se presentaron tests existentes como cierre de mecanismos ausentes. |

Las decisiones humanas aplicadas son las expresas del mandato: separar alta/cambio; Platform Admin; atomicidad; historia; familias y límites persistentes; sin datos ficticios comerciales; PostgreSQL aislado; no QA mutation ni pasos posteriores. Las elecciones exactas propuestas permanecen DRAFT y no constituyen autoridad activa. Supuestos introducidos como autoridad de producto: NONE.

## 4. Contrato consolidado y gate humano

[Enmienda única revisable](../../governance/amendments/COMMERCIAL_PACK_FAMILY_20261013/DRAFT_CANONICAL_AMENDMENT.md): representación de CommercialFamily en un único catálogo, clasificación de raíz, relación PlanVersion–familia, cardinalidades, extensión/reconciliación UsageLimit, rangos/vigencia, publicación, límites incompletos fail-closed, request/response, CAS/idempotencia, transición/cierre, lecturas, auditoría, permisos, migración/preflight y compatibilidad.

Propuestas comerciales sin activación: ISO/LEGAL, código regulatory_pack_count y unidad pack, límite total y por familia, mismo PlanVersion rechazado, packs futuros bloqueados, cierre de packs por arista registrada y respuesta202 completed. El borrador identifica como decisión pendiente la representación de exclusión temporal por raíz y el efecto de configuración incompleta sobre contratos existentes. No se decidió esa representación ni se degradó derecho actual silenciosamente.

**Bloqueo exacto:** rector45§6 exige aprobación humana registrada de modelo físico y contratos ejecutables; rector46§§3/5/6/7 obliga a publicar antes de consumir; rector49§3 dice: «Si sus hashes aún no fueron presentados y aprobados, la autorización funcional general no los publica». Rector28 G3/G7/G8/G11/G14/G15 permanece no satisfecho para la ampliación comercial. Este mandato conserva ese procedimiento en su sección5. Por ello no puede marcarse APPROVED el nuevo artefacto aún no revisado.

No se requiere una segunda persona interna por defecto;49 permite que la autoridad humana acumule funciones de Producto/Arquitectura/Modelo/Backend/Seguridad/QA con registro explícito. Codex no inventó firmas. [manifest-review.json](CONSOLIDATED_APPROVAL_20261009/evidence/integral-closure-20261013/manifest-review.json) identifica bytes/hash del borrador, delta de pruebas y evidencia para revisar; APPROVAL=PENDING, sin receipt humano fabricado.

## 5. Archivos modificados y capas

Cambios tracked:

- docs/governance/amendments/COMMERCIAL_PACK_FAMILY_20261013/DRAFT_CANONICAL_AMENDMENT.md: consolidación propuesta, sin activación.
- packages/contracts/src/mi7a-frontend-projections.test.ts: corrección de conteos a contrato ya existente, con comprobación exacta de nueva lectura.
- docs/governance/MASTER_EXECUTION_STATUS.md: continuidad de este rescate manteniendo PARTIAL_BLOCKED y enlace al informe.

Archivos nuevos:

- apps/backend/src/security/platform-subscription.postgres.test.ts: siete pruebas sobre PostgreSQL16 real y API del alta aprobada.
- Este informe y evidence/integral-closure-20261013/: runners reproducibles, consulta QA de solo lectura, fixtures reutilizados, receipts, logs, JSON de pruebas, intentos anteriores, hashes y matriz de bloqueos.

Base de datos compartida: sin cambios. Modelo/contratos ejecutables activos: sin cambios. Código funcional backend/frontend: sin cambios; se añadió test backend. Infraestructura/IAM real/deployment: sin cambios. Base local descartable: migraciones **existentes**31/32 aplicadas por runner canónico y fixtures de catálogo/publicación ya utilizados/aprobados localmente; no se activó modelo comercial nuevo. Build local actualizado, sin despliegue. Baseline y manifests aprobados previos se preservaron.

## 6. Migraciones y fixture PostgreSQL local

Instancia existente tcdx-grc-phase3-postgres-16, 127.0.0.1:55432, PostgreSQL16.15, tcdx-grc. Tenants iniciales=0, UsageLimit=0; destino descartable verificado antes de pruebas. Se aplicaron únicamente 20261009000100_phase6a3_configuration_integrity y 20261009000200_phase6a3_reference_read_permissions; ledger local final32. **Migraciones comerciales nuevas creadas=0; QA migraciones ejecutadas=0.**

Se reutilizó fixture-setup.mjs de continuidadR6 y ceremoniaR3 con actor de servicio test-only, catálogos locales versionados existentes y attestation de pg_control_system. No se importó ZIP normativo reservado ni se ejecutó el intermedio normativo. Auditorías de fixtures33/34 no se presentaron como migraciones activas ni se añadieron al ledger. [fixture-attestation.json](CONSOLIDATED_APPROVAL_20261009/evidence/integral-closure-20261013/fixture-attestation.json) registra system_identifier y hashes de scripts.

El gate de esquema local acredita 237 tablas de dominio, 1338 FKs, 487 FKs compuestas tenant, 421 constraints únicas, 782 checks, cero mismatches y cero ON DELETE CASCADE prohibidos. **Es una comparación con expected-schema vigente; no resuelve UL-01**, porque ese inventario también contiene la unicidad global divergente. No se modificó el validador para ocultarlo.

## 7. Pruebas y resultados reales

Node22.23.2 y pnpm12.4.1; el Node26 del shell se detectó y no se utilizó como runtime de validación. Runners permiten TCDX_NODE22_BINARY para reproducir la versión exacta. Cada receipt registra comando, hora real, exit code y hash del log. [tests-summary.json](CONSOLIDATED_APPROVAL_20261009/evidence/integral-closure-20261013/tests-summary.json) relaciona archivo, caso y resultado.

| Check ejecutado | Resultado final y evidencia |
| --- | --- |
| Rector governance/integrity | PASS, rector-receipt.json y rector.log; invocación con bash porque archivo no tiene permiso ejecutable. |
| Rector status regression | PASS, rector-status-receipt.json. |
| Typecheck | PASS, typecheck-receipt.json. |
| Lint del repo | PASS, lint-receipt.json; su comando publicado usa tsc --noEmit, no se afirma ESLint no ejecutado. |
| Build local | PASS, build-receipt.json. |
| Unit/contract/UI component regression | 771/771 PASS,70 archivos,0 failed/0 pending; unit-results.json. No prueba runtime de change-plan. |
| PostgreSQL integration completa | 120/120 PASS,19 archivos,0 failed/0 pending; postgres-results.json. Incluye security/RBAC, tenant, audit, packs, lifecycle y reference reads existentes. |
| Nuevas pruebas Subscription | 7/7 PASS, subscription-postgres-results.json; incluidas dentro de120, no se suman dos veces. |
| Contract asset generation verification | PASS, contracts-receipt.json. |
| Secret scan | PASS, secrets-receipt.json. |
| Migration gates | PASS, migration-validation-receipt.json: checksum, advisory concurrency, unknown ledger y checksums originales. |
| Schema y seeds | PASS, schema-receipt.json y seeds-receipt.json. |
| Tenant isolation específica | PASS,12 verificaciones,0gaps; tenant-isolation.log. |
| QA metadata READ ONLY | PASS, qa-readonly.json, TLSv1.3; no prueba comercial mutativa ni aceptación humana. |
| Dominio activo y diff whitespace | PASS, final-audit.json; sin referencias alternativas en apps/packages/deploy/database/e2e/.github/.env.example. |
| Browser E2E, external IAM/human UI | NOT_RUN; no frontend modificado, no nuevo flujo publicado. Históricos no reclasificados como nuevas pruebas. |
| Nuevo modelo, límites y change-plan | NOT_RUN_CONTRACT_GATE_BLOCKED; no mocks ni SQL simulado presentados como integración. |

Se preservaron fallos iniciales en attempts/: conteo MI7A desactualizado, error de composición del fixture de bootstrap y falta de publicación de referencias en base local recién migrada. Se corrigió el test y se reutilizó la ceremonia de fixtures exigida, conservando los guards. La suite final no contiene skips. Restricciones EPERM del sandbox para conectividad local/SSH se resolvieron mediante aprobación de ejecución; no mediante relajar TLS, permisos o gates.

## 8. Evidencia RBAC, tenant y auditoría

Las pruebas nuevas resuelven PlatformActor desde tablas reales, con PlatformRoleAssignment y Permission publicados; API via Fastify inject usa identidad verificada de fixture, no OIDC humano. Platform Admin crea suscripción; Tenant Admin con MembershipRole real aislado y sin PlatformRoleAssignment, y Platform Support, reciben403 en alta y lectura global. Llamada sin bearer recibe401. No se concedieron permisos comerciales a Tenant Admin ni se alteró proveedor IAM.

Dos tenants de fixture obtienen suscripciones distintas; GET tenant devuelve la suya. Los12 checks especializados rechazan FKs/objetos/scopes cruzados, comprueban idempotencia separada por tenant y ownership de audit/outbox. Suites runtime-security, membership, grants/reference reads también pasan. Esto acredita regresión local, no aceptación real de change-plan o browser humano.

Alta nueva persiste audit.platform.subscription.create.v1, auditoría privilegiada y outbox platform.subscription.created.v1 con PlanVersion/tenant exactos. Replay no duplica registros; payload alterado409. Dos comandos concurrentes producen un único contrato activo y un409. Un trigger PostgreSQL de prueba rechaza la inserción de auditoría material con SQLSTATE23514: se revierte suscripción, auditorías, outbox, claim y el propio trigger; un nuevo intento limpio puede crear. El trigger existió sólo en transacción local abortada; no DDL QA ni cambio contractual.

## 9. Matriz A–T del mandato

PASS aquí se limita al mecanismo indicado; ningún PASS del alta se traslada a change-plan.

| Caso | Estado y alcance |
| --- | --- |
| A Alta inicial | PASS_POSTGRES_REAL, nuevo test material y API. |
| B PlanVersion fuera de vigencia | PASS_POSTGRES_REAL para alta: futuro, vencido y draft; cambio pendiente. |
| C Cambio entre versiones válidas | BLOCKED_CONTRACT, no ejecutado. |
| D Cambio entre familias autorizadas | BLOCKED_CONTRACT, no ejecutado. |
| E Límite excedido | BLOCKED_CONTRACT, mecanismo no publicado. |
| F Configuración comercial incompleta | BLOCKED_CONTRACT, predicado propuesto sin activación. |
| G active → ended | BLOCKED_REGISTRY, no ejecutado. |
| H Atomicidad change-plan | BLOCKED_CONTRACT, no ejecutado. |
| I Rollback ante error | PASS_POSTGRES_REAL del alta ante audit23514; change-plan pendiente. |
| J Activos contradictorios | PASS_POSTGRES_REAL para concurrencia de alta; nuevo cambio pendiente. |
| K Lectura plan vigente | PASS_POSTGRES_REAL de tenantGet tras alta de dos tenants. |
| L Historial comercial | BLOCKED_READ_CONTRACT, no operación publicada. |
| M Auditoría cambios | PASS_POSTGRES_REAL del alta; evento change-plan pendiente. |
| N Platform Admin | PASS_POSTGRES_REAL del alta/API; change-plan pendiente. |
| O Rechazo Tenant Admin | PASS_POSTGRES_REAL del alta y lectura Platform; change-plan pendiente. |
| P Aislamiento multi-tenant | PASS regresión local,12checks y suites existentes; cambio nuevo pendiente. |
| Q Integridad PostgreSQL | PASS inventario vigente/fixtures; UL-01 y relaciones nuevas pendientes. |
| R Regresión alta | PASS,7casos reales incluidos en120. |
| S Regresión comercial existente | PASS unit/contract y pack-temporal/validation/security locales; runtime QA integral no ejecutado. |
| T Repetición/idempotencia | PASS_POSTGRES_REAL del alta; mismo payload replay, otro payload409; política change-plan pendiente. |

## 10. Resultado rector y bloqueos residuales

RECTOR_BASELINE_INTEGRITY=PASS, rector validator=PASS para baseline existente. **RECTOR_GATE=BLOCKED para activar nuevas estructuras/contratos y cerrar STEP_6A3.** HUMAN_UI_REVIEW no aprobado por Codex; MARKET_RELEASE_READY no acreditado.

Bloqueos comerciales: aprobación exacta de CommercialFamily/relaciones/UsageLimit/UL-01; decisión de exclusión por raíz y derechos existentes; registry de transiciones; payload/read/replay/audit/events/permiso; luego implementación/pruebas completas A–T y evidencia runtime. Cuantías comerciales pendientes bloquean publicación/contratación real, no el mecanismo técnico una vez autorizado con fixtures.

Bloqueos de fase heredados no cancelados por este rescate: C-04W legal binding; C-07 publicación44 grants; C-08 aceptación externa; CFG-D-COMPLIANCE-V1/CFG-D-CONTROLS-V1/CFG-D-PUBLICATION suficiencia oficial versionada; CFG-UQ1/CFG-UQ2/CFG-DEFAULT ejecución operacional; CFG-QA aceptación externa; VOC-C04 inventario histórico externo; VOC-QA aceptación externa. El historial de36/48 se conserva. La RLS figura históricamente NOT_IMPLEMENTED; no se añadió ni se declaró cerrada.

## 11. Entrada STEP_6A4 y acciones humanas necesarias

STEP_6A4=NOT_STARTED; STEP_6A4_READY=BLOCKED. Rector49 preserva secuencia6A.3 →6A.4 →ZIP normativo →6A.5. Contrato phase6a/STEP_6A2/10 exige UX_REFERENCE_RESOLUTION=PASS en6A.3:95FIELD resueltos, RR-G01..04,89VOC, permisos/fuentes aprobados y negativos. Doce cláusulas aún pendientes y nuevo ciclo comercial bloqueado impiden esa entrada. Backlog09 identifica T-SELECT/T-VOC como dependencias para42formularios y3editores; preparar continuidad no los inicia.

Acciones humanas mínimas:

1. Revisar el borrador exacto y su hash en manifest-review.json, cerrar las decisiones materiales enumeradas en §10 de la enmienda y registrar aprobación con funciones acumuladas según49. Ese registro desbloquea la publicación/modelo/ejecutables pertinentes, no QA por arrastre.
2. Proporcionar datos comerciales de límites por PlanVersion/familia sólo antes de publicar/contratar producto real; jamás números ficticios en QA.
3. Resolver fuentes/bindings legales y suficiencia metodológica heredados con sus owners y pruebas reproducibles. No autorizar configuration_mode=none sin ese contrato.
4. Tras implementación y pruebas de contratos aprobados, aprobar un plan operacional concreto de QA con backup/restore, compatibilidad y hashes; ejecutar aceptación autenticada y gates humanos correspondientes.

No se pide autorización nueva para decisiones puramente implementativas ni para repetir trabajo ya aprobado. La detención afecta la activación/implementación dependiente del contrato no publicado; la regresión y evidencia autorizadas se completaron. Archivos fuera del alcance modificados: NONE. No se añadió deuda, capa legacy, hardcode comercial, fake tenant de producto, cambio IAM real ni permiso humano fabricado.

## 12. Trazabilidad verificable

Rector42 y decisiónSubscription → platform.tenants/plans/plan_versions/subscriptions → subscriptionCreate → platform.subscription.create/PLATFORM_ADMIN → auditoría/outbox/idempotencia → test nuevo7casos → postgres-results120PASS. Rector21/28/45/46/49 → enmienda DRAFT/manifest → bloqueo explícito del nuevo modelo/change-plan. Rector26/22/25 → tests security/isolation/audit y receipts. UL-01 → modelo físico01 + SQL20260916000600 + expected-schema + qa-readonly → propuesta de reconciliación sin alteración de fuente aprobada.

[Evidencia y manifest revisable](CONSOLIDATED_APPROVAL_20261009/evidence/integral-closure-20261013/manifest-review.json), [resultados por caso](CONSOLIDATED_APPROVAL_20261009/evidence/integral-closure-20261013/tests-summary.json), [auditoría final](CONSOLIDATED_APPROVAL_20261009/evidence/integral-closure-20261013/final-audit.json). SHA256SUMS.txt cubre artefactos entregados; verificarlo desde la raíz del repositorio con shasum -a256 -c. El manifest identifica un paquete preparado para revisión y **no** aprobación humana ni cierre STEP_6A3.
