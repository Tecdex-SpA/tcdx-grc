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

```text
Authenticated?
→ Tenant valid?
→ Commercial capability enabled?
→ Permission granted?
→ Scope allowed?
→ Object accessible?
```

## Segregación de funciones

La ejecución y verificación pueden requerir actores distintos. Evidence owner no implica autoridad de aprobación. Auditor no obtiene permisos administrativos sobre el objeto auditado por ser auditor. Impersonation queda auditada.

## Backend authority

Ocultar una función en UI mejora UX pero no autoriza ni protege. Todos los endpoints/commands aplican autorización backend.

## IA

La IA recibe únicamente el contexto que el usuario puede consultar. No expande privilegios ni cruza tenants.
## Matriz vinculante

La convención de permissions, scopes y SoD se completa en `22_RBAC_PERMISSION_SCOPE_MATRIX.md`. Todo endpoint/command futuro debe declarar permission y scope antes de implementarse.
