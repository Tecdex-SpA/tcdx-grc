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

Evidence lifecycle: `draft -> submitted -> under_review -> approved | rejected`.

Desde `approved`: `expired | superseded` según vigencia/reemplazo. Desde `rejected`: puede volver a `draft` como nueva revisión/version según policy; no pasa a expired.

- approve/reject requiere reviewer distinto del submitter cuando SoD aplica;
- expiry no borra el objeto;
- superseded conserva historial.

## 3. RequirementAssessment

`not_assessed -> in_progress -> assessed -> approved -> superseded`

Resultado de evaluación es campo separado del lifecycle.

## 4. ControlAssessment / AssuranceTest

`planned -> in_progress -> completed -> reviewed -> approved`

Conclusión separada del lifecycle.

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
