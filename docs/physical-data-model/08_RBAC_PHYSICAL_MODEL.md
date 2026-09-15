# Modelo físico RBAC

## Decisión efectiva

```text
UserIdentity
→ active TenantMembership
→ active Subscription → PlanVersion → Entitlement → Capability
→ MembershipRole → Role → RolePermission → Permission
→ scope resolver → object policy → SoD
→ ALLOW / default DENY
```

Commercial entitlement, Permission, scope y ownership son dimensiones separadas.

## Tablas y claves

| Objeto | Tabla | Business key/integridad |
|---|---|---|
| identidad | `iam.user_identities` | identity_key global |
| membership | `iam.tenant_memberships` | tenant+identity activo |
| rol | `iam.roles` | ownership/tenant+role_code; baseline inmutable |
| permiso | `iam.permissions` | permission_code global `domain.resource.action` |
| rol-permiso | `iam.role_permissions` | ownership/tenant+role+permission |
| asignación | `iam.membership_roles` | tenant+membership+role+scope+validity |
| principal máquina | `iam.service_principals` | ownership/tenant+principal_code |
| soporte | `iam.impersonation_sessions` | actor platform + target membership + tenant + razón + expiry |
| comercial | `platform.subscriptions`, `plan_versions`, `entitlements`, `capabilities` | plan versionado y capability explícita |

## Scopes

`platform`, `tenant`, `organizational_unit`, `process`, `service`, `audit_engagement`, `assigned_object`, `owned_object`. Los cuatro scopes con objeto usan FK tipada; owned/assigned se resuelven desde relaciones canónicas del objeto, nunca IDs enviados por el cliente. Si un objeto pertenece a múltiples scopes, policy futura declara ANY/ALL; no se infiere.

## SoD persistible

- EvidenceReview conserva reviewer; EvidenceVersion conserva submitter vía audit.
- ActionVerification conserva verifier; Action/AuditEvent conserva completer.
- RiskAcceptance conserva requester/approver.
- Assurance/Audit tests conservan executor/reviewer.
- Pack/metodología/rule/config publicados conservan import/author/reviewer/approver según objeto y AuditEvent.
- Connector credential/config aprobaciones quedan en AuditEvent y contracts futuros.

La excepción SoD no se modela como bypass; requiere policy explícita, motivo y AuditEvent. No se inventa entidad de excepción sin contrato rector.

## Roles y capabilities

Los 24 roles tenant y 2 platform de 42 son filas baseline en `iam.roles`; roles personalizados son tenant-owned y componen permissions sin modificar los baseline. Los 20 capability groups exactos son filas de `platform.capabilities`; capabilities atómicas se congelan en Fase 2, por lo que este modelo no inventa códigos adicionales.

## Reglas de seguridad

- Default DENY; grant potencial no equivale a concesión.
- Tenant Admin no aprueba todos los objetos automáticamente.
- Platform Support no obtiene impersonation.
- Secret refs no son retornables por permission read.
- Export hereda exactamente lectura/scope.
- UI no es control de seguridad; backend y BD aplican contexto/constraints.
- IA recibe sólo lineage/context que el actor puede leer.
