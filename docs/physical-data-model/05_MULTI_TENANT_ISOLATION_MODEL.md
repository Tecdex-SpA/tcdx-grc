# Modelo de aislamiento multi-tenant

## Clasificación y ownership raíz

| Clase | `tenant_id` | Ejemplos | Regla |
|---|---|---|---|
| GLOBAL_REFERENCE | NULL | contenido regulatorio licenciado, referencias globales | legible sólo si capability/pack/RBAC lo permiten |
| PLATFORM_CONTROL | NULL | planes, capabilities, permissions, lifecycle registry | administrado por permisos platform |
| TENANT_OWNED | NOT NULL | organización, controles tenant, evidence, risks, issues | escrito sólo dentro del tenant actor |
| TENANT_DERIVED | NOT NULL | observations, measurements, resolutions, snapshots | deriva exclusivamente de inputs tenant compatibles |

`platform.tenants` es la frontera raíz. Organization y Subject delimitan alcance funcional, no ownership.

## Propagación

1. Toda tabla TENANT_* persiste `tenant_id`, incluso si puede derivarse del parent.
2. Toda tabla TENANT_* publica UNIQUE `(tenant_id,id)` para ser target de FK compuesta.
3. FK tenant→tenant incluye tenant en ambos lados. Una UUID válida de otro tenant falla en BD.
4. Referencias a contenido global/plataforma usan FK simple, más validación transaccional de lifecycle, pack/capability y acceso.
5. Entidades mixtas aplican CHECK `tenant_id` condicionado por `ownership_class` y compatibilidad con parents.
6. No se propaga `organization_id` indiscriminadamente. Scope usa Subject/FKs estructurales cerradas.

## Casos críticos

- RequirementApplicability: ownership tenant; Requirement global o mismo tenant; `scope_subject_id` NULL=tenant-wide o Subject del mismo tenant.
- Control tenant: `based_on_control_version_id` puede apuntar a global/platform; el control conserva tenant.
- EvidenceLink/EvidenceRequest: target tenant debe coincidir; Requirement/ControlVersion global permitido por contrato, sin convertirlo en tenant-owned.
- SourceResolution/Measurement/Snapshot/EffectiveConfiguration: siempre TENANT_DERIVED y todos sus inputs son del mismo tenant.
- AuditEvent/Outbox/Idempotency: `ownership_class` decide si tenant es obligatorio o NULL; nunca se inventa tenant técnico.
- Impersonation: session conserva target tenant, actor platform, razón y expiración; no elimina SoD.

## RLS futura (no implementada)

Las tablas TENANT_* son candidatas obligatorias a policy basada en tenant context de sesión; las mixtas separan branches tenant y global. RLS es defensa en profundidad, no reemplaza composite FKs ni autorización. Diseño/DDL de policies pertenece a fases posteriores y requiere pruebas contra workers, jobs, soporte e importadores.

## Pruebas negativas obligatorias futuras

- leer/listar/actualizar/eliminar objeto de tenant B desde contexto A;
- insertar child A con parent B en cada composite FK;
- asignar Subject B como scope de applicability/control/risk A;
- enlazar evidence/action/issue/audit/AI lineage cross-tenant;
- usar observation B en calculation/resolution/snapshot A;
- otorgar rol/scope de otro tenant;
- resolver configuration/retention policy de B para A;
- filtrar sin tenant en repositories, workers, exports y retries;
- impersonation expirada/sin motivo/sin permiso;
- evento global con tenant o evento tenant sin tenant.

Cada prueba debe fallar en al menos autorización y constraint cuando la relación llega a persistencia.
