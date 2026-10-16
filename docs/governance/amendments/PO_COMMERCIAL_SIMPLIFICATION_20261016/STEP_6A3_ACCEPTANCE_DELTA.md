# Criterios STEP_6A3 — propuesta prospectiva

`STATUS=DRAFT_NOT_EFFECTIVE`; `STEP_6A3=PARTIAL_BLOCKED`;
`STEP_6A4=NOT_STARTED`; `H01_H10_EXECUTION=SUSPENDED_CURRENT_TASK`.

Fuente histórica: C04W_CFGD_HUMAN_CLOSEOUT_CHECKLIST_20261015.md y handoff
STEP_6A3_QA_DEPLOY_HANDOFF_RESULT_20261015.md. Sus bytes, actores y resultados se
preservan. La presente matriz no declara PASS ni inaplicabilidad retroactiva.
DR001/002/003 ya expresas cambian el criterio FUTURO, sin pruebas de aceptación ahora.

| ID | Criterio previo | Tratamiento candidato | Evidencia futura requerida |
|---|---|---|---|
| H01 | Fuente Privacy/Legal auténtica | CONDICIONAL: únicamente acreditación formal/obligación externa invocada; no requisito de configuración ordinaria | Probar ordinaria sin documento; formal sin fuente no acredita; evidencia previa intacta |
| H02 | Primaria y contexto habilitante | CONSERVAR lo técnico: policy/applicability publicadas elegibles, contexto/FK; fuente sólo formal | No elegir under_review como publicada; primaria ordinaria sin source no es certificación |
| H03 | Carga y cadena documental | SEPARAR carga ordinaria de incorporación de fuente formal; no fuente universal | Auth/tenant/FK/MIME/hash/scan siguen requeridos; draft INITIAL_SOURCE no primaria ordinaria |
| H04 | Revisión independiente de Evidence | CONSERVAR donde command/SoD operacional corresponda; no exigir para mera preferencia SaaS | No autoapprove ni usar gobierno unipersonal como permiso de producto |
| H05 | Vincular fuente y aplicabilidad nueva | CONDICIONAL: sólo si se acredita fuente; no workflow obligatorio para cada configuración | Bind y sucesión inmutables, sin backfill, actor/source reales |
| H06 | Aprobación/publicación jurídica | CONDICIONAL al objeto formal; conservar SoD y permisos de workflows sensibles | No eludir hold ni aprobar objeto propio; no segunda firma interna para desarrollar |
| H07 | CFG-D diagnóstico e historia | CONSERVAR criterio técnico; no depende de fuente legal para configuración independiente | Insufficient_data no es valid; valores nulos e historia intactos |
| H08 | UX/UI QA y versión exacta | CONSERVAR evidencia funcional/visual cuando se implemente; no ratificación interna para autorizar desarrollo | Pantallas distinguen configuración/acreditación; no HUMAN_UI_REVIEW=PASS generado |
| H09 | Aislamiento/permiso/entitlement | CONSERVAR incondicionalmente para la operación afectada | Negativas tenant y auth; no sesión/actor ficticio ni grant implícito |
| H10 | Acta/cierre de6A3 | ACTUALIZAR a evidencia de requisitos aplicables y autoridad PO única; sin duplicación de firmas internas | No cerrar hasta evidencia real aplicable; no trasladar NOT_RUN a PASS ni iniciar6A4 |

## Criterios adicionales derivados, sin ampliar producto

Alta asistida y habilitación comercial con autoridad efectiva hasta completar
Fase10; Tenant Admin gestiona su tenant sin ratificación Platform de cada acto;
no self-service ni elevación Platform. Configuración ordinaria sin fuente universal
ni revisión jurídica; formal sin fuente no acredita. Conservación por categoría,
obligaciones, hold y evidencia histórica pese a propuesta mensual. Gobierno interno
sin segundo firmante ni comité; exclusiones respetadas y bloqueos acotados.
TEST_SCENARIOS.json especifica las verificaciones futuras, todas NOT_RUN.

## Cierre no ejecutado

No se modifica07_RESULT.json, MASTER_EXECUTION_STATUS activo ni recibos previos.
La validación estática de esta candidata no es UI→API→DB ni QA autenticada.
Cuando la instrucción incluya implementación y validación se completará ese alcance
autónomamente; no se pedirá ratificar DR001/002/003 ni cada paso interno. Antes de
cualquier acto excluido se requiere que una instrucción lo incluya, por tratarse
de alcance distinto, no por doble aprobación conceptual. No hay autorización
actual de activar, cerrar6A3, iniciar6A4 ni desplegar.
