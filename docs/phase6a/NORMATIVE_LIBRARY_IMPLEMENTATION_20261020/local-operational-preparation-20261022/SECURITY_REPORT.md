# Seguridad local verificada

| Control | Evidencia | Estado |
| --- | --- | --- |
| Default DENY | Sin configuración exacta de publisher no se abre transacción; auth fallida no escribe. Viewer sin create y Support escribiendo denegados | PASS_LOCAL |
| Catálogo canónico | Ocho permisos derivados de PERMISSIONS_AND_GRANTS; code/domain/resource/action/estado exactos; no duplicados en replay | PASS_LOCAL_PG16 |
| Roles y grants | Sólo pares publicados; baseline global y roles tenant de los targets explícitos. Sin personas/grants de MembershipRole/PlatformRoleAssignment creados por código de producto | PASS_LOCAL_PG16 |
| Platform/Tenant | Dos tenants sintéticos; autor tenant no opera Platform; Support no opera tenant ni escribe. Support metadata-only; Membership no sustituye PlatformRoleAssignment | PASS_LOCAL_PG16 |
| B05/SoD | Approve únicamente GRC Manager con permiso efectivo, mismo tenant/ControlVersion y Definition aprobada; autoaprobación negada en policy tests aun con roles acumulados | PASS_LOCAL_POLICY; PHYSICAL_OVERRIDE_FLOW_BLOCKED_DEFINITIONS |
| B06 | Trece bindings exactos; negativos de SoD, scope y efecto por cada uno; FK desconocida negada; servicio inactivo negado | PASS_LOCAL_PG16 |
| Auditoría IAM | Atomicidad ante falla de auditoría, replays/concurrencia sin duplicación; identidad y hash exactos en AuditEvent | PASS_LOCAL_PG16 |
| Derechos H04 | Fuente/acto/hash/edición/pack/entorno/audiencia/intervalo y proof exactos. No flag global, wildcard, grant ni permiso de distribución inventado | PASS_LOCAL |
| Ingreso H04 | Usuario humano activo + permiso funcional de Source + objeto propio + evidencia válida. Sin evidencia, Viewer o tenant ajeno denegados | PASS_LOCAL_PG16_SYNTHETIC_PROOF |
| Uso H04 | Derecho válido ALLOW; inexistente/insuficiente/futuro/expirado/acto/fuente/tenant/entorno incorrectos y proof no verificado DENY | PASS_LOCAL_SYNTHETIC |
| Publicación protegida | Consultation no autoriza publication; policy existente exige consultation y publication de forma independiente | PASS_LOCAL |
| Custodia | MinioRightsEvidence existente valida cifrado/versionado, referencia de versión inmutable, bytes/hash y proof cerrado; no HTTP ni URL externa | PASS_FOCUSED_CLIENT_FIXTURE; LIVE_STORAGE_NOT_RUN |
| Revocación | Una vez, auditada, fuente bloqueada; replay no duplica; DELETE negado por trigger físico | PASS_LOCAL_PG16 |
| Atomicidad H04 | Falla de persistencia revierte el AuditEvent; concurrencia sobre Source produce una fila y un replay | PASS_LOCAL_PG16 |
| Secrets | Scan canónico, cero hallazgos; no credenciales, JWT ni evidencia jurídica incorporados al expediente | PASS |

Los roles/asignaciones/entitlements utilizados por los tests se crearon exclusivamente en la fixture sintética del clúster propio, nunca en código de bootstrap o en un entorno existente. La vía IAM nueva reutiliza la autenticación M2M del publisher existente; las pruebas de autenticación y del boundary son locales. No hubo autenticación contra un proveedor real, cambio de identidad ni implementación Managed Identity.

La tabla RolePermission no se transforma en una segunda policy store: su audit registra la procedencia/policy; el enforcement sigue en authorizeLibraryOperation, CanonicalKnowledgePolicy, CanonicalControlAdjustmentPolicy y los resolvers canónicos. Los templates no conceden acceso por nombre de rol sin cadena efectiva. Se preservan entitlements y permisos de intersección de matrices.

LOCAL-DEFINITIONS-01 impide demostrar aprobación B04 físicamente sobre datos contractualmente válidos. Las regresiones SoD de código pasan; no se certifica un flujo físico de overrides ni E2E QA. Ningún PASS local habilita activaciones reales. QA_CONTACTED=NO; REAL_GRANTS/REAL_DEFINITIONS/REAL_RIGHTS=NONE.
