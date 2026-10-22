# Regresiones focalizadas

| Capacidad | Verificación actual | Estado |
| --- | --- | --- |
| CODE-B04-01/contextual lookup | Mismo GET/permission funcional, cuatro opciones reales PG16; selector y estados del bundle actual en escritorio1536×1024 y estrecho390×844 | PASS |
| Revalidación de guardado | Test físico409 ante Definition inexistente; suites de backend/browsers invalidan Definition retirada/flags/vigencia y limpian selección | PASS |
| B04 workflow | Crear draft/replay, review independiente y approved sobre PG16 con constraints/audit/outbox/idempotencia y registry B06 reales aislados | PASS_LOCAL |
| Semántica | Valores originales del ControlVersion conservados; ausencia de confirmación permanece NULL; no nuevos valores/permisos | PASS |
| IAM/registry | Catálogo aprobado, separación Platform/Tenant, permisos/scopes efectivos, principal inactivo, missing permission/defaultDENY, atomicidad/replay | PASS_LOCAL |
| B06 |13bindings exactos; cada uno niega drift de SoD/scope/efecto/ordinal; FK desconocida negada | PASS_LOCAL |
| RBAC/SoD/tenant | Dos tenants sintéticos, Support metadata-only, autor tenant no Platform, GRC Manager sin autoaprobación y reglas de target/scope | PASS_LOCAL |
| H04 | Incorporación/revocación auditadas; negativos fuente/acto/tenant/intervalo/entorno/proof; historia/rollback/concurrencia | PASS_LOCAL_SYNTHETIC_PROOF |
| Backend/composición/B07/matrices | Suites focalizadas de composición/bootstrap/hooks/policies/readers y resolver único | PASS |
| Frontend | Fuente/CSS/assets de marca intactos; pruebas componentes/cliente/shell y10browser sobre bundle actual | PASS_LOCAL_NO_NEW_HUMAN_ACCEPTANCE |
| Contratos |25schemas/31operaciones nuevas más create existente; cuatrodescriptores/13bindings/IAM/H04 originales intactos. Sólo metadata del sucesor físico derivada | PASS |

Total final:200pruebas PASS —141focalizadas en16archivos,49PostgreSQL16 y10Playwright. No se ejecutaron suites completas ajenas al cambio. CHECKS.json registra comandos/códigos y logs sellados. Typechecks/builds globales y backend finales PASS; warning de chunkfrontend>500kB existente, sin relajar umbrales.

Browser usa cliente/bundle y Fastify/policies/comandos reales con ejecutor SQL sintético y catálogos de fixture; las peticiones ajenas a loopback/API esperada son abortadas. No es E2EQA ni navegador→PostgreSQL completo. La persistencia física y los locks/CHECKs/ledger se demuestran en los49testsPG separados. H04 prueba MinIO con cliente fixture, no una licencia o storage real.

Intentos conservados: PG_ATTEMPT_1.log muestra10tests de upgrade y schemaPASS, pero38omitidos por assetsdist desactualizados; se corrigió el orden del runner para verificar/generar assets y compilar contracts antes del consumo. No se cambió una aserción para admitir esa omisión. PG_VALIDATION_INITIAL_SUCCESS.log conserva la primera integración completa previa a ampliar negativos. BROWSER_ATTEMPT_1.log y browser-attempt-1/ documentan Chromium bloqueado por MachPort del sandbox, antes de cargar UI; repetición autorizada fuera del sandbox10PASS. Los snapshots históricos permanecen intactos.
