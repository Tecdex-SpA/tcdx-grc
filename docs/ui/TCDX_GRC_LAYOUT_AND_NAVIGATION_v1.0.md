# TCDX GRC — Layout and Navigation Contract v1.0

## Desktop application shell

1. Left sidebar: persistent, dark, approximately 220–260 px expanded width.
2. Top bar: persistent application context and global utilities.
3. Main workspace: light background, responsive card/table layout.
4. Page-level content must not be hidden behind global chrome.

## Baseline navigation groups

Primary product navigation may include, according to actual functional availability and RBAC:

- Dashboard
- Cumplimiento
- Requisitos
- Controles
- Evidencias
- Riesgos
- Incidentes
- Acciones
- Auditoría
- Terceros
- Reportes
- Inteligencia Regulatoria

Configuration/admin group may include, according to actual functional availability and RBAC:

- Organización
- Usuarios
- Parámetros
- Integraciones
- Registros de Auditoría

This list is a visual/navigation baseline, not authorization to implement unavailable product capabilities early.

## Navigation rules

- Hidden/disabled behavior must follow product entitlement and RBAC contracts.
- Current location must be visually obvious.
- Deep modules should use breadcrumbs or equivalent location context.
- Sidebar labels must remain concise.
- Navigation order should remain stable between sessions unless role/entitlement removes entries.
