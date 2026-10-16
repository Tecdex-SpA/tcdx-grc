# 21 - Lifecycle y matriz de transiciones

## 1. Regla

Toda entidad con workflow usa una state machine explícita. Sólo Commands autorizados producen transiciones. No se permite escribir `status` libremente.

### Estados iniciales Platform/IAM aprobados

- `Tenant` se crea en `lifecycle_state=active`.
- `TenantMembership` materializada para una `UserIdentity` existente se crea en `membership_state=active`.
- ambos valores iniciales son server-owned y no son campos caller-controlled;
- la creación de `TenantMembership` no crea invitación, identidad externa, credencial ni asignación de rol.

Estos estados iniciales no autorizan una transición CRUD genérica. Toda transición posterior continúa sujeta al registry normativo de este documento.

## 2. Evidence

EvidenceRequest: `open -> fulfilled | cancelled | expired`.

`evidence_request.fulfill` publica como código único de auditoría `audit.lifecycle.evidence_request.fulfill.v1`. Una versión posterior de la arista reemplaza contractualmente cualquier código contradictorio sin reescribir la definición histórica publicada.

Evidence lifecycle: `draft -> submitted -> under_review -> approved | rejected`.

Desde `approved`: `expired | superseded` según vigencia/reemplazo. Desde `rejected`: puede volver a `draft` como nueva revisión/version según policy; no pasa a expired.

- approve/reject requiere reviewer distinto del submitter cuando SoD aplica;
- expiry no borra el objeto;
- superseded conserva historial.

FileUploadIntent: `pending_upload -> quarantined -> scanning -> promoted`; desde `quarantined` o `scanning` puede pasar a `rejected`; desde `pending_upload` puede pasar a `expired | cancelled`. `promoted`, `rejected`, `expired` y `cancelled` son terminales. La promoción crea un `FileObject` final con metadata real; el intent nunca se convierte en evidencia ni almacenamiento permanente alternativo.

## 3. RequirementAssessment

`not_assessed -> in_progress -> assessed -> approved -> superseded`

Resultado de evaluación es campo separado del lifecycle.

## 4. ControlAssessment / AssuranceTest

`planned -> in_progress -> completed -> reviewed -> approved`

Conclusión separada del lifecycle.

`control_assessment.complete` admite `owned_object` únicamente cuando ownership sobre el `Control` padre se resuelve mediante una relación canónica vigente, y `tenant` únicamente por grant publicado. No admite `assigned_object` como requisito exclusivo ni permite inferir owner desde creator, email, nombre o payload.

## 5. Risk

Risk lifecycle: `identified -> assessing -> active -> monitoring -> closed -> reopened`.

RiskTreatment es objeto separado con disposition `mitigate | transfer | avoid | accept` y lifecycle `proposed -> approved -> in_progress -> completed -> verified`.

RiskAcceptance es decisión separada, requiere approver y review/expiry date. `risk_level` no es lifecycle state.

## 6. Issue/Finding/Gap

`open -> triaged -> remediation_in_progress -> pending_verification -> verified_closed -> reopened`

Puede existir `dismissed` sólo mediante command de decisión con motivo/permiso. `Issue.kind` distingue finding/non_conformity/gap/exception/audit_observation.

## 7. Action

`pending -> in_progress -> in_review -> completed -> verified -> reopened | cancelled`

`completed != verified`.

## 8. Audit

`draft -> planned -> approved -> fieldwork -> reporting -> issued -> follow_up -> closed`

Findings no se cierran porque Audit cierre.

## 9. Incident

`reported -> triaged -> active -> contained -> recovered -> root_cause_review -> closed`

## 10. SupplierAssessment

`draft -> requested -> collecting -> submitted -> under_review -> approved -> expired`

## 11. BIA/ContinuityPlan

`draft -> review -> approved -> active -> test_due -> tested -> review_due -> superseded`

## 12. Survey

Definition: `draft -> published -> retired`.
Campaign: `draft -> scheduled -> active -> closed -> analyzed`.
Response: `in_progress -> submitted -> accepted | invalidated`.

## 13. Integration

Configuration lifecycle: `not_configured -> configured -> authorizing -> connected -> disabled`.

Operational health separado: `idle | syncing | healthy | degraded | rate_limited | permission_missing | credential_expired | error`.

Health puede cambiar automáticamente sin alterar lifecycle salvo policies de seguridad explícitas.

## 14. Report

`draft -> generated -> under_review -> approved -> published -> superseded`

## 15. Regla de transición

Toda transición declara:

`from + command + preconditions + permission + scope + to + side effects + audit event + notifications + metric invalidations/recalculations`.

Side effects no se ejecutan mediante escritura cross-domain; se publican commands/events contractuales.

## 16. Transition Registry normativo

Las secuencias anteriores definen estados permitidos, pero la implementación sólo puede comenzar para una entidad cuando cada arista utilizada esté registrada en `LifecycleTransitionDefinition` con:

`entity_type | from_state | command_code | to_state | precondition_policy | permission_code | allowed_scopes | sod_policy | side_effect_event_codes | audit_event_code | notification_policy | recalculation_policy | idempotency_semantics | concurrency_semantics`.

No existe transición genérica `update_status`. Un estado no puede ser escrito directamente por CRUD.

`LifecycleTransitionDefinition` es una entidad canónica PLATFORM_CONTROL, versionada, inmutable después de publicada y perteneciente a Platform Audit & Observability. Las variaciones tenant se expresan mediante policies/configuración autorizada referenciada por la definición; no crean una segunda entidad ni modifican la arista publicada. No contiene reglas ejecutables arbitrarias: referencia policies, permissions, eventos y códigos contractuales publicados.

### Reglas transversales cerradas

- `cancelled`, `dismissed`, `rejected`, `invalidated`, `superseded`, `expired` y `reopened` requieren command explícito y motivo cuando corresponda.
- Los jobs temporales sólo pueden ejecutar transiciones cuyo command declare `system_actor_allowed=true`.
- Una transición automática no puede aprobar, aceptar riesgo, verificar remediación ni emitir una auditoría salvo que una AutomationPolicy publicada lo permita explícitamente.
- Side effects inter-domain se realizan por event/outbox y son idempotentes.
- Si falla un side effect, la transición confirmada no se revierte mediante escritura compensatoria silenciosa; se registra delivery/retry y, si corresponde, command compensatorio explícito.

El registry concreto se deriva de esta matriz antes de implementar cada command; la ausencia de una arista implica DENY.

## 17. Aristas comerciales propuestas por DR-STEP6A3-COMMERCIAL-GOVERNANCE-20261013-02

`Subscription: active --subscription.change_plan--> ended` se ejecuta sólo mediante `subscriptionChangePlan`, permiso `platform.subscription.update`, scope `platform` y ObjectPolicy `commercial.subscription.change_plan.v1`; crea una nueva Subscription `active` como sucesora con mismo Tenant y término comercial original. `SubscriptionRegulatoryPack: active --subscription_regulatory_pack.transfer_close--> revoked` y la creación de la sucesora `active` mediante `subscription_regulatory_pack.transfer_activate` son efectos internos obligatorios del mismo command, nunca rutas públicas separadas. Usan la misma autoridad humana y conservan la versión y expiración original. Todos los intervalos se cortan en el mismo instante PostgreSQL.

`PlanVersion: draft --commercial_catalog.publish--> published` y publicación de `CommercialFamily` pertenecen a una ceremonia interna separada `commercialCatalogPublication`, permiso `platform.commercial_catalog.publish`, scope `platform` y ObjectPolicy `commercial.catalog.publish.v1`. No hay CRUD genérico ni actor de sistema autorizado para esas publicaciones. Cada arista requiere el mapping exacto de comando, permiso, policy, auditoría, evento, idempotencia y concurrencia del artefacto 08 aprobado, con registro ejecutable posterior antes de operar. Ausencia de arista publicada sigue siendo DENY.

## Delta candidato STEP_6A3 C-04W

RetentionPolicy y RetentionPolicyApplicability aceptan submit_for_review draft→under_review por autor Tenant Admin con privacy.retention_policy.update; review existente por Privacy Manager/Legal Reviewer permanece; approve under_review→approved corresponde a Legal Reviewer distinto del autor; publish approved→published por Tenant Admin/Privacy Manager después de revalidación. Toda transición exige CAS, idempotencia, tenant y AuditEvent transaccional. Published es inmutable. HoldRelease es un comando insert-only autorizado por Legal Reviewer distinto del autor del hold; no altera lifecycle_state de policy/applicability.

Fuente exacta del delta: `docs/governance/amendments/STEP_6A3_C04W_CFGD_20261014/CONTRACT_PACKET_20261015.md`; SHA-256 `6b87812823472d56a89622eca8119b0cd56606f2f21d635dd84bf903896ba7f2`. Esta copia candidata no es autoridad activa antes del gate 47.


## STEP_6A3 — candidata de incorporación inicial de fuente v1.11

`STATUS=DRAFT_NOT_EFFECTIVE; HUMAN_EXACT_BYTES_REVIEW=PENDING`. Baseline candidata TCDX_GRC_MASTER_REGENT_BASELINE_v1.11_2026-10-15, predecesora TCDX_GRC_MASTER_REGENT_BASELINE_v1.10_2026-10-15. Diseño PO aprobado por SHA `1a133d60e576208eefc90d68ff39df903df829f3c9ab1b3c51fa06d8c826913b`; constancia `docs/governance/amendments/STEP_6A3_INITIAL_SOURCE_20261015/PO_DESIGN_APPROVAL_RECEIPT_20261015.json`. Esta sección sólo tendrá efecto después de publicación conforme47/49 y gates físico/ejecutable; no autoriza operación QA ni deploy por sí sola.

Se propone un único comando retention_policy_applicability.bind_initial_source, actualización draft→draft con CAS, idempotencia y AuditEvent. No publica una nueva arista de transición de estado ni cambia las cinco aristas C-04W ya auditadas. En el flujo de acreditación formal, una draft que custodia fuente pendiente no pasa a revisión, aprobación o publicación antes de bind; published continúa inmutable. Las dos filas QA under_review preexistentes no se regresan ni se modifican.

## Configuración ordinaria frente a workflow formal — DR001 §4 / DR003

Una opción ordinaria autorizada se aplica por ConfigurationDefinition/Override existentes y sus policies, no por una falsa transición de Evidence o aprobación jurídica. La ausencia de fuente jurídica no es por sí sola motivo para bloquear esa configuración. No se eliminan aristas, permisos ni SoD de RetentionPolicy/Applicability, Evidence, holds u otros objetos. Una aplicabilidad ordinaria publicada sin fuente no acredita derecho externo y conserva todos sus controles técnicos; la excepción draft INITIAL_SOURCE permanece acotada a preparar una fuente formal. No se crea estado ni escritura directa de lifecycle. Publicar datos o una arista posterior requiere la instrucción operativa en alcance y verificación técnica; nunca modifica filas históricas inmutables.
