# 22 - Matriz RBAC Permission/Scope y Segregation of Duties

## 1. Modelo

Autorización efectiva Platform:

`authenticated UserIdentity -> active PlatformRoleAssignment -> Role(PLATFORM_CONTROL) -> Permission -> platform scope -> ObjectPolicy -> SoD -> ALLOW/DENY`

Autorización efectiva tenant:

`authenticated UserIdentity -> active TenantMembership -> commercial entitlement -> active MembershipRole -> Role -> Permission -> tenant/object scope -> ObjectPolicy -> SoD -> ALLOW/DENY`

Default DENY.

`PlatformRoleAssignment` y `MembershipRole` son relaciones de grant distintas dentro del mismo IAM. La primera no contiene ni requiere tenant/membership y sólo puede referenciar un `Role` cuya `ownership_class=PLATFORM_CONTROL`; la segunda requiere una `TenantMembership` activa y no puede otorgar scope `platform`. No existe grant por email, dominio, allowlist runtime, configuración externa o tenant ficticio.

## 2. Acciones canónicas

`read, create, update, submit, review, approve, reject, verify, assign, transition, archive, delete, export, execute, configure, administer, publish, impersonate`

Permiso: `domain.resource.action`.

## 3. Scopes

- platform
- tenant
- organizational_unit
- process
- service
- audit_engagement
- assigned_object
- owned_object

Scope más amplio no se infiere de uno estrecho.

## 4. Roles base

Platform Admin; Platform Support; Tenant Admin; Executive/Board Viewer; GRC Manager; Quality Manager; Compliance Manager; Risk Manager; CISO/Security Manager; AI Governance Manager; Privacy Manager; Legal Reviewer; Auditor Lead; Auditor; Process Owner; Control Owner; Evidence Owner; Action Owner; Supplier Manager; Continuity Manager; Regulatory Content Steward; Data Admin; Report Viewer; Viewer.

Roles agrupan permisos; no son autoridad primaria.

## 5. Grants funcionales mínimos

- Tenant Admin: administración tenant y membresías, no aprobación automática de todos los objetos.
- Platform Support: diagnóstico temporal mediante sesión auditada; no impersonation irrestricta.
- GRC Manager: coordinación transversal, no bypass de SoD.
- Quality Manager: QMS, ISO 9001, no conformidades y mejora.
- Compliance Manager: requirements/applicability/assessments.
- Risk Manager: risks/assessments/treatments/acceptance workflow.
- CISO/Security Manager: gobierno de seguridad e ISO/IEC 27001.
- AI Governance Manager: gobierno de IA e ISO/IEC 42001.
- Privacy Manager: privacidad, derechos y brechas.
- Legal Reviewer: revisión jurídica sin administración técnica.
- Regulatory Content Steward: importación/editorial de packs; no publicación unilateral.
- Auditor Lead: planificar/emitir auditorías.
- Auditor: ejecutar pruebas y findings dentro del engagement asignado.
- Evidence Owner: crear/enviar evidencia; no autoaprobar por defecto.
- Action Owner: ejecutar/completar; no verificar propia acción por defecto.
- Data Admin: integraciones, mappings, métricas; no cambiar resultados GRC manualmente.
- Viewer roles: read-only.

## 6. SoD obligatoria

Por defecto, la misma identidad no puede:

- submit + approve la misma Evidence;
- complete + verify la misma Action;
- execute AuditTest + approve final conclusion si el tenant exige independencia;
- request risk acceptance + approve la misma aceptación;
- author + approve una metodología/regla global en actos operacionales del producto; el gobierno editorial/metodológico interno del texto se rige por 49 y admite aprobación humana unipersonal expresa;
- configure connector + approve privileged credential access cuando política reforzada esté activa.

Excepción operacional requiere policy explícita, motivo y AuditEvent. La adopción editorial/metodológica interna conforme a 49 no concede una excepción operacional ni permisos a usuarios de GRC.

## 7. Machine identities

Connectors, schedulers y IA usan service principals con permissions mínimas. No usan cuentas humanas compartidas.

## 8. Impersonation

Sólo Platform Admin autorizado, con motivo, tiempo limitado, banner visible y audit trail. No permite operaciones prohibidas por política regulatoria/SoD sin elevación explícita.

## 9. Permission catalog gate

Todo endpoint/command debe mapear exactamente a una permission canónica antes de implementarse. Frontend sólo refleja la decisión backend.

## 10. Permission Registry normativo

La matriz RBAC no se completa dinámicamente desde endpoints. Primero se publica la entidad canónica `Permission`; después el endpoint/command la referencia. `PermissionDefinition` queda retirado como alias y no autoriza una entidad adicional.

Recursos canónicos iniciales y acciones máximas permitidas:

| Dominio | Recursos | Acciones potenciales |
|---|---|---|
| platform | tenant, membership, entitlement, role, permission, capability, impersonation_session | read, create, update, assign, archive, administer, impersonate |
| organization | organization, organizational_unit, process, service, asset, subject, resource | read, create, update, assign, archive |
| compliance | framework, normative_unit, requirement, applicability, requirement_assessment, soa, soa_item | read, create, update, submit, review, approve, reject, publish, archive, export |
| controls | control, control_assessment, assurance_test | read, create, update, submit, review, approve, reject, assign, execute, archive |
| evidence | evidence_request, evidence, evidence_version, document, document_version | read, create, update, submit, review, approve, reject, assign, archive, delete, export |
| risk | risk, risk_assessment, treatment, acceptance, kri, loss_event | read, create, update, submit, review, approve, reject, verify, assign, transition, archive, export |
| remediation | issue, action, verification | read, create, update, submit, review, approve, reject, verify, assign, transition, archive, export |
| audit | audit, workpaper, audit_test, finding | read, create, update, submit, review, approve, reject, execute, assign, transition, archive, export |
| operations | incident, supplier, supplier_assessment, bia, continuity_plan, privacy_activity, survey | read, create, update, submit, review, approve, reject, verify, assign, transition, archive, export |
| data | observation, metric_definition, measurement, rule, impact, snapshot, quality, lineage | read, create, update, review, approve, execute, archive, export, administer |
| integration | connector, integration, mapping, sync_run, credential_ref | read, create, update, execute, configure, archive, administer |
| reporting | report_definition, report_run, report | read, create, update, execute, review, approve, publish, export, archive |
| knowledge | regulatory_pack, regulatory_source, import_manifest, coverage_manifest, framework_crosswalk, knowledge_item, regulatory_change | read, create, update, review, approve, publish, archive |
| ai | ai_recommendation | read, create, review, reject, archive |

La existencia de una acción potencial NO concede permiso. Los grants son explícitos y default DENY.

NormativeUnit y Requirement de packs globales publicados son de sólo lectura para usuarios tenant dentro de packs habilitados. Crear, actualizar, revisar y publicar contenido global requiere permisos de Regulatory Content Steward/revisores conforme a 41 y no puede concederse por el plan comercial por sí solo. Para frameworks internos tenant-owned, los commands equivalentes requieren permisos tenant específicos, scope tenant y workflow de aprobación sin permitir mutar contenido global.

## 11. Scope resolution

Todo objeto tenant-owned debe resolver scope desde relaciones canónicas, nunca desde parámetros aportados por el cliente. Si un objeto pertenece a múltiples scopes, la policy declara `ANY` o `ALL`; no se asume. Los exports heredan exactamente el scope de lectura de los objetos exportados.

Para `controlAssessmentSubmit`, `owned_object` se resuelve exclusivamente desde ownership/responsabilidad canónica del `Control` padre. El creator de `ControlAssessment` no adquiere ownership. Mientras no exista una relación canónica entre el actor y el `Subject` owner, ese scope falla cerrado; sólo un grant publicado `tenant` puede autorizar el command. No se crea ni infiere assignee.

## 12. Operaciones sensibles

`administer`, `approve`, `verify`, `publish`, `impersonate`, acceso a credenciales y cambios de methodology/rule/permission catalog requieren audit reforzado. Las credenciales secretas nunca son retornadas por permiso de lectura; sólo referencias y metadata no sensible.

El command que inicia una `ImpersonationSession` requiere `platform.impersonation_session.impersonate` con scope `platform`, motivo obligatorio, duración limitada y actor Platform Admin autorizado. Platform Support no obtiene este permiso por rol base.

## 13. First Platform Admin Bootstrap

`FIRST_PLATFORM_ADMIN_BOOTSTRAP` es una ceremonia administrativa interna y one-time, no una operación pública ni un permiso reusable. Su autoridad es exclusivamente la decisión humana F5D-007 aplicada al estado inicial sin grants; no introduce una segunda ruta de autorización normal.

Precondiciones conjuntas y fail-closed:

- principal `HUMAN_INTERACTIVE` autenticado por OIDC y resuelto a una `UserIdentity` canónica existente;
- exactamente un Role baseline publicado con `role_code=PLATFORM_ADMIN`, `ownership_class=PLATFORM_CONTROL` y `tenant_id IS NULL`;
- `COUNT(active PlatformRoleAssignment)=0`, donde activo significa `valid_from <= transaction_timestamp()` y `valid_to IS NULL OR valid_to > transaction_timestamp()`;
- no existe ninguna fila histórica en `iam.platform_role_assignments`, condición más fuerte que impide reabrir bootstrap después de revocación;
- correlation ID y justificación operacional presentes conforme al contrato de auditoría.

La transacción usa aislamiento `READ COMMITTED` y, antes de evaluar las dos condiciones de assignments, obtiene `SELECT ... FOR UPDATE` sobre la única fila canónica `PLATFORM_ADMIN`. Todos los intentos usan la misma fila de serialización. Después del lock, la transacción revalida identidad, catálogo y precondiciones, crea exactamente un assignment abierto con `valid_from=transaction_timestamp()` y emite `audit.iam.platform_role_assignment.bootstrap.v1` en la misma transacción. Si cualquier validación, insert o AuditEvent falla, todo se revierte. Dos intentos concurrentes no pueden observar ambos el estado inicial: el segundo espera el lock, reevalúa con una nueva snapshot `READ COMMITTED` y DENY.

El target es la misma `UserIdentity` autenticada; el caller no aporta `role_id`, email, issuer/subject, tenant ni membership. El rol permitido es exclusivamente `PLATFORM_ADMIN`; `PLATFORM_SUPPORT`, cualquier otro `PLATFORM_CONTROL`, rol tenant o custom producen DENY. Tras el primer commit, todo intento posterior produce DENY, incluso si el grant fue luego revocado.

## 14. Autoridad comercial propuesta

Se añaden al recurso `platform.subscription` las acciones potenciales `read` y `update`, y al recurso `platform.commercial_catalog` la acción potencial `publish`; el permiso `platform.subscription.create` existente y su HTTP 202 permanecen intactos. Los nuevos códigos candidatos son exactamente `platform.subscription.read`, `platform.subscription.update` y `platform.commercial_catalog.publish`, todos con scope `platform`. `update` autoriza exclusivamente `subscriptionChangePlan` y sus dos efectos de transferencia internos; `read` se vincula sólo a `subscriptionCommercialGet`, `subscriptionCommercialList` y `subscriptionPackTransferList`; `publish` sólo a la ceremonia interna `commercialCatalogPublication`. Ninguno autoriza PATCH/PUT/DELETE genérico, autoservicio tenant, grant a Platform Support o publicación de contenido regulatorio.

Los tres grants base candidatos se dirigen exclusivamente a `PLATFORM_ADMIN` humano interactivo con PlatformRoleAssignment vigente, Permission publicada y ObjectPolicy específica. No se concede autoridad por nombre, email, claim no resuelto, ServicePrincipal o impersonation. Tenant Admin y roles custom DENY. La decisión de diseño no ejecuta grants ni los publica en IAM: cada fila/manifest y su acto operacional mantienen gate propio. Todo acceso preserva default DENY, separación Platform/Tenant y auditoría reforzada.

## Delta candidato STEP_6A3 C-04W

Nueve RolePermission tenant-owned para cada TENANT_ADMIN tenant-owned, nunca Platform: privacy.retention_policy.read/create/update/publish; evidence.document.create/update; evidence.evidence.create/submit/read. Cada operación se restringe por entitlement, tenant, MembershipRole.scope_kind, ObjectPolicy y propósito de fuente de retención. Los scopes tenant nuevos de evidence.document.update y evidence.evidence.submit sólo aplican a este flujo restringido. Se agrega únicamente privacy.retention_policy.legal_hold.release para LEGAL_REVIEWER tenant-owned, mismo tenant, sin grant Tenant Admin/Privacy Manager/Platform. Los grants vigentes de otros roles permanecen.

Fuente exacta del delta: `docs/governance/amendments/STEP_6A3_C04W_CFGD_20261014/CONTRACT_PACKET_20261015.md`; SHA-256 `6b87812823472d56a89622eca8119b0cd56606f2f21d635dd84bf903896ba7f2`. Esta copia candidata no es autoridad activa antes del gate 47.


## STEP_6A3 — candidata de incorporación inicial de fuente v1.11

`STATUS=DRAFT_NOT_EFFECTIVE; HUMAN_EXACT_BYTES_REVIEW=PENDING`. Baseline candidata TCDX_GRC_MASTER_REGENT_BASELINE_v1.11_2026-10-15, predecesora TCDX_GRC_MASTER_REGENT_BASELINE_v1.10_2026-10-15. Diseño PO aprobado por SHA `1a133d60e576208eefc90d68ff39df903df829f3c9ab1b3c51fa06d8c826913b`; constancia `docs/governance/amendments/STEP_6A3_INITIAL_SOURCE_20261015/PO_DESIGN_APPROVAL_RECEIPT_20261015.json`. Esta sección sólo tendrá efecto después de publicación conforme47/49 y gates físico/ejecutable; no autoriza operación QA ni deploy por sí sola.

Se mantienen todos los Permission/RolePermission/MembershipRole existentes. Tenant Admin humano es custodio y autor del draft; el autor documental puede ser ese custodio o Evidence Owner humano del mismo tenant con scope tenant y permisos efectivos de cada operación. Upload/finalize/create/submit sólo admiten su cadena documental exacta; finalize/submit permanecen del autor documental. Bind es del Tenant Admin custodio autor con privacy.retention_policy.update y PRIVACY. EvidenceReview debe ser de identidad distinta del autor documental; la aprobación de aplicabilidad debe ser de identidad distinta del autor del draft. Ser autor del draft no impide revisar Evidence ajena si el permiso existe. Ninguna acumulación editorial conforme49 sustituye estas separaciones. M2M/Platform, identidad ajena, falta de permiso/entitlement/scope y objeto de otro tenant: DENY. No se conceden grants ni lectura documental general.

## Límite de la autonomía administrativa — DR001 §§1–4 / DR003

Tenant Admin administra personas/roles/configuraciones de su tenant usando permisos efectivos ya definidos, sin ratificación Platform por cada operación ordinaria. No obtiene authority Platform, permisos globales, aprobación de evidencia propia ni liberación de holds. Platform Admin asiste mediante contratos25/26, sus permisos comerciales y de acceso explícitos; no usa una Membership ficticia ni convierte platform.role.assign en assign Platform genérico. No se añaden grants en esta candidata.
La fuente y revisión jurídicas se exigen para la acreditación formal correspondiente, no para una preferencia SaaS por su mera naturaleza administrativa. Las separaciones de aprobación ya modeladas en los comandos sensibles permanecen. La eliminación de dobles firmas internas del desarrollo de49 no las elimina.
