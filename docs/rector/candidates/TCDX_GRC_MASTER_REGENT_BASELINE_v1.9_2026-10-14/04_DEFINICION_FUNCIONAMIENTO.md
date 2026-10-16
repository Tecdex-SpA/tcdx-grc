# TCDX GRC — Definición de funcionamiento end-to-end

## Patrón operacional

Todo workflow relevante sigue conceptualmente:

```text
Actor
→ Trigger
→ Preconditions
→ Authorization
→ Input
→ Validation
→ Domain operation
→ Persistence
→ Audit event
→ Derived effects
→ Notification
→ Metrics
→ UI result
→ Error/retry
→ Final state
```

## Flujos centrales

La plataforma cubre end-to-end: onboarding; estructura organizacional; usuarios/RBAC; activación normativa; applicability; compliance assessment; GAP y acciones; SoA; controles; evidence lifecycle; riesgos inherente/residual; tratamientos; KRI; pérdidas; incidentes; issues; acciones y verificación; programa y ejecución de auditoría; proveedores; BIA/continuidad; privacidad; surveys; métricas/Data Trust; snapshots; Impact Graph; reporting; integraciones; IA y notificaciones.

## Regla de automatización

Toda automatización que cree objetos debe ser idempotente, tenant-scoped, auditable, trazable al origen y explicable.

## Trazabilidad

Toda relación origen → acción debe poder recorrerse en sentido inverso.

No se fabrican progreso, evidencia, confianza ni estados para cerrar cadenas.

## Fallas

Los workflows deben diferenciar al menos:
- validation failure;
- authorization failure;
- insufficient data;
- dependency failure;
- conflict/concurrency;
- retryable error;
- terminal error.

Un error técnico no debe transformarse silenciosamente en dato vacío o resultado válido.

## Addendum - Funcionamiento obligatorio de consumidores

Todo workflow consumidor debe declarar Inputs canonicos, precondiciones, tenant scope, freshness/calidad, procesamiento, autoridad de escritura, Outputs, auditoria, errores y lineage. Los modulos de dominio no deben saltarse Integration Hub/Data & Metrics para consumir directamente fuentes externas y producir hechos oficiales. Ver documentos 14 y 15.
