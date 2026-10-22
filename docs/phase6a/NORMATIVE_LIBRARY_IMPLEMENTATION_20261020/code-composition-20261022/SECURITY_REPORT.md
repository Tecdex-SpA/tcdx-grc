# Seguridad — alcance local y límites

`RBAC_SOD_DEFAULT_DENY=PASS_LOCAL`; no se declara habilitación IAM o seguridad operacional QA.

| Control | Conexión y evidencia | Límite |
| --- | --- | --- |
| Autenticación/default DENY | Bootstrap prueba aplicación completa:31 operaciones401 sin bearer. Dependencias ausentes503. Policies deniegan permisos ausentes, operación no publicada, contexto/scope inválido. | No es matriz de grants reales. |
| RBAC/entitlements | Rutas autentican y servicios resuelven actor/permisos/scope/capabilities efectivos; UI usa proyección propia tenant y permisos Platform separados. | Cero catálogo/grants activados. |
| Tenant isolation | Policy prueba ownership y targets; requests tenant obligatorios y Platform rechaza header tenant. No-store/Vary, cursor firmado y loaders abortables por contexto. Suite negativa foreign tenant y browser retira contenido al cambiar a tenant sin permisos. | Dos tenants sintéticos; no QA. |
| SoD | Autor distinto de revisor/decisor; test de autoaprobación negativa y registry/H01 exactos reutilizados. UI no afirma ALLOW por rol ni por mostrar botón. | Sólo backend puede decidir por autor/estado exactos; no actores reales. |
| H04 | Composición conserva CanonicalKnowledgePolicy + MinioRightsEvidence reales: fuente/hash/edición/pack/acto/entorno/audiencia y evidencia versionada exactos. Derechos ausentes/ambiguos/revocados/tamper/entorno incorrecto deniegan; Support metadata-only. | Cero derechos reales introducidos. Storage simulado en pruebas, no acceso remoto. |
| Auditoría/transacciones | Mutaciones existentes preservan audit/outbox/idempotency/locks/CAS. B07 usa hooks dentro de la única transacción y perfil de AuditEvent existente; sin evento o modelo paralelo. | No se inspeccionó un AuditEvent QA nuevo. |
| Entrada/errores | Esquemas publicados, targets tipados, UUIDv7 desde selectores, ETag fuerte/idempotencia en writes. Errores sin detalle privado, contenido React escapado. | Validación semántica y autorización permanecen en backend. |
| Matrices | Intersección de permiso entrada+fuentes; no conteos ocultos; filtros/cursor/backend reautorizan; referencias verificadas dentro de ventana; ejes esperan celdas pendientes. | Proyecciones no son evidencia de cumplimiento. |
| Identidad | Sólo se reutiliza identidad/verificador ya existente. | No se modificó modelo, proveedor ni Managed Identity. |

Pruebas relevantes: bootstrap.test, composition.test, library.test, rights.test, custody.test, mutations.test, registry-adoption.test, applicability-hooks.test, control-adjustment-policy.test, resolver.test, normative-library-client.test, normative-library-workspace.test, core-grc/routes y browser aislado. Ver comandos/logs en CHECKS.json.

La UI no sustituye controles backend. No hay fallback ALLOW, permisos temporales, licencias por booleano, actor simulado en rutas reales, SQL dinámico de usuario, origen/caché compartida tenant o generación de grants en el arranque.

CODE-B04-01 permanece bloqueado. Ausencia de datos operacionales no se convierte en autorización. Los puertos sintéticos y tokens de las pruebas sólo existen en archivos de tests; `server.ts` compone policies/adapters concretos. Las restricciones de test son verificaciones de código; su PASS no demuestra persistencia/auditoría física ni ausencia de vulnerabilidades global del producto.
