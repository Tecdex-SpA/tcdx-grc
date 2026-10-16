# 36 - Automation Policy y supervisión humana

## 1. Principio

Automatizar detección no equivale a automatizar decisión GRC. Toda consecuencia automática debe estar permitida por una `AutomationPolicy` versionada. Default: propuesta/no destructive action.

## 2. Niveles

- A0 Observe: sólo registra hechos/mediciones.
- A1 Notify: alerta/notifica.
- A2 Propose: propone Issue/Action/mapping/cambio, requiere aceptación humana.
- A3 Create reversible: puede crear Issue/Action en estado inicial si policy lo permite.
- A4 Execute bounded: ejecuta transición reversible explícitamente autorizada.
- A5 Restricted decision: reservado; nunca por defecto. Requiere policy reforzada, SoD y justificación regulatoria.

## 3. Prohibiciones por defecto

No automatizar sin policy reforzada: aprobar evidencia; aceptar riesgo; verificar una acción; aprobar metodología/regla; emitir auditoría; declarar cumplimiento final; borrar evidencia/histórico; modificar permissions; ejecutar acciones externas destructivas.

## 4. Contrato

Cada policy declara trigger, rule/version, target command, maximum scope, actor/service principal, required confidence/data trust, preconditions, approval mode, idempotency, rollback/compensation, rate limit, notification, audit event y expiry/review date.

## 5. IA

AIRecommendation opera como A2 máximo por defecto. La IA no eleva su propio nivel ni ejecuta commands oficiales salvo policy explícita independiente del modelo.
