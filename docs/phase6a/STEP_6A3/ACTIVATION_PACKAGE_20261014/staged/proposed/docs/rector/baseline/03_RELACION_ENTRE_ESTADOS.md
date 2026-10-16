# TCDX GRC — Modelo y relación entre estados

## Principio

Lifecycle, outcome, severity, priority, health y score son dimensiones distintas. Un `status` genérico no puede comprimirlas.

La matriz vinculante de transiciones está en `21_LIFECYCLE_TRANSITION_MATRIX.md`.

## Estados principales

- EvidenceRequest: `open -> fulfilled | cancelled | expired`.
- Evidence: `draft -> submitted -> under_review -> approved | rejected`; approved puede pasar a expired/superseded.
- RequirementAssessment lifecycle: `not_assessed -> in_progress -> assessed -> approved -> superseded`; outcome separado: compliant/partial/non_compliant/etc.
- ControlAssessment/AssuranceTest: planned/in_progress/completed/reviewed/approved; conclusion separada.
- Risk lifecycle: `identified -> assessing -> active -> monitoring -> closed -> reopened`; tratamiento/aceptación son objetos/decisiones separados.
- Issue: `open -> triaged -> remediation_in_progress -> pending_verification -> verified_closed -> reopened`; dismissed requiere decisión explícita.
- Action: `pending -> in_progress -> in_review -> completed -> verified -> reopened`; puede cancelarse bajo policy. `completed != verified`.
- Audit: draft/planned/approved/fieldwork/reporting/issued/follow_up/closed.
- Incident: reported/triaged/active/contained/recovered/root_cause_review/closed.

## Integraciones: dos dimensiones

Configuration lifecycle:

`not_configured -> configured -> authorizing -> connected -> disabled`

Operational health:

`idle | syncing | healthy | degraded | rate_limited | permission_missing | credential_expired | error`

No mezclar configuración con health.

## Invariante

Toda transición se ejecuta mediante command autorizado y produce audit event. Frontend no define transiciones; las representa.
