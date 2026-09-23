# TCDX GRC — RBAC Model

## Separación obligatoria

```text
Commercial Entitlement
!= RBAC Permission
!= Tenant Scope
!= Object Ownership
```

## Roles base

Platform Admin, Platform Support, Tenant Admin, Executive/Board Viewer, GRC Manager, Quality Manager, Compliance Manager, Risk Manager, CISO/Security Manager, AI Governance Manager, Privacy Manager, Legal Reviewer, Auditor Lead, Auditor, Process Owner, Control Owner, Evidence Owner, Action Owner, Supplier Manager, Continuity Manager, Regulatory Content Steward, Data Admin, Report Viewer y Viewer. Responsabilidades y provisión inicial se fijan en 42.

Los roles son agrupadores. Las permissions canónicas constituyen la autoridad funcional.

## Permissions

Convención:

`domain.resource.action`

Acciones comunes: read, create, update, archive/delete, approve, verify, assign, export y administer.

## Scopes

Platform, tenant, organizational unit, process, owned object, assigned object y audit engagement.

## Decisión de autorización

La autoridad humana interactiva se resuelve por dos rutas explícitas que comparten una única `UserIdentity`, un único catálogo `Role` y un único catálogo `Permission`:

```text
Platform:
Authenticated UserIdentity
→ active PlatformRoleAssignment
→ Role(PLATFORM_CONTROL)
→ Permission
→ platform scope
→ ObjectPolicy
→ SoD
→ ALLOW / default DENY

Tenant:
Authenticated UserIdentity
→ active TenantMembership
→ Commercial capability enabled
→ active MembershipRole
→ Role
→ Permission
→ tenant/object scope
→ ObjectPolicy
→ SoD
→ ALLOW / default DENY
```

`PlatformRoleAssignment` es un grant IAM canónico, persistido, temporal y auditable. No contiene `tenant_id` ni `tenant_membership_id`; no usa email, dominio, nombre, allowlist runtime ni claim inestable como fuente de privilegio. `TenantMembership` nunca concede autoridad `platform`.

### First Platform Admin Bootstrap

La única excepción de inicialización es el command interno one-time `FIRST_PLATFORM_ADMIN_BOOTSTRAP`, autorizado por decisión humana F5D-007. Opera exclusivamente sobre la `UserIdentity` canónica del principal humano ya autenticado por OIDC y resuelto mediante `issuer + stable subject`; no recibe email, identidad externa, tenant ni `role_id` como autoridad.

En una transacción PostgreSQL 16 fail-closed, la ceremonia serializa todos los intentos sobre la fila canónica publicada `Role(PLATFORM_ADMIN, PLATFORM_CONTROL)`, exige exactamente una fila de catálogo coincidente, `COUNT(active PlatformRoleAssignment)=0` y ausencia total de cualquier `PlatformRoleAssignment` histórica. Sólo entonces crea el primer grant abierto a `PLATFORM_ADMIN` y su `AuditEvent` reforzado. La ausencia histórica adicional garantiza que una revocación posterior nunca reabra bootstrap. Todo segundo intento o estado ambiguo produce DENY.

Este command no es un endpoint público, permission/grant alternativo, flag reactivable, allowlist ni segunda autoridad persistente. Su implementación runtime queda sujeta a la etapa posterior autorizada; hasta entonces no existe una superficie ejecutable y Platform permanece fail-closed.

## Segregación de funciones

La ejecución y verificación pueden requerir actores distintos. Evidence owner no implica autoridad de aprobación. Auditor no obtiene permisos administrativos sobre el objeto auditado por ser auditor. Impersonation queda auditada.

## Backend authority

Ocultar una función en UI mejora UX pero no autoriza ni protege. Todos los endpoints/commands aplican autorización backend.

## IA

La IA recibe únicamente el contexto que el usuario puede consultar. No expande privilegios ni cruza tenants.
## Matriz vinculante

La convención de permissions, scopes y SoD se completa en `22_RBAC_PERMISSION_SCOPE_MATRIX.md`. Todo endpoint/command futuro debe declarar permission y scope antes de implementarse.
