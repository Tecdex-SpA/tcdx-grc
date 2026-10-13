# Gates internos verificables de Fase 6A

Fecha: 2026-10-08. Autoridad: TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23. HEAD: main / 6af66387aa03fa185ef139584de07700f247b903. Alcance: diseño documental, sin implementación.

Son gates internos adicionales. No reemplazan gates rectores, no reabren Phase5 ni alteran CORE_GRC_SLICE histórico. Fuente de criterios transversales: `docs/phase6a/STEP_6A1/08_BUSINESS_ACCEPTANCE_CRITERIA.md` (AC-G01..06, AC-F01..42) y `docs/rector/baseline/45_CONTRATO_DESARROLLO_CERRADO_Y_NO_INFERENCIA.md`. FORM-xx conserva el orden de AC-Fxx; evidencia debe relacionar cada formulario/field/link con caso/prueba/correlación sin secretos.

| Etapa | Gate | Criterio verificable de PASS | Evidencia y límite |
| --- | --- | --- | --- |
| 6A.3 | UX_REFERENCE_RESOLUTION=PASS | 95/95 FIELD_ID de 03 resueltos sin ID manual; todas fuentes tenant/entitlement/Permission/scope/ObjectPolicy/SoD; RR-G01..04 cerrados con contrato aprobado, paginación/acceso negativos; 89 VOC fields con fuente publicada o free text legítimo decidido; U-FILTER cerrado | Contract/component/security tests y publicación aprobada; no autoaprobación humana de permisos/executable contracts; implementación parcial no pasa. |
| 6A.4 | UX_BUSINESS_FORMS=PASS | 42/42 FORM con required/optional/conditional correctos, business titles/help y progressive grouping; 3 JSON editores estructurados con 22 miembros y serialización idéntica; dates correctas; user codes caller-owned; uploads scan-PASS y errores precisos | Component/contract tests por formulario, roundtrip JSON, validators, accessibility/responsive; referencia6A.3 PASS. |
| 6A.5 | UX_WORKFLOW_NAVIGATION=PASS | 29/29 LINK navegables, 38 DEP preservadas y 2 relaciones no soportadas rechazadas; create-from-context/return, ES-A/G; children/histories reales visibles; state/permission/SoD correctos; completion distinto verification | Integración/E2E por links/workflows, negativas N-01..12, return/tenant-change; 6A.4 PASS. Document creation no se inventa. |
| 6A.6 | UX_CORE_GRC_RUNTIME=PASS | Usuario empresarial realiza operaciones habituales en cuatro dominios sin UUID/JSON/DB/copy IDs; 42FORM/95references/3JSON/89vocab/29links/38dep y findings9/9/2 verificados; tenant RBAC/audit/idempotency/concurrency intactos | Evidencia runtime real autorizada, pruebas UI/negativas y aprobadores humanos Security/Privacy/QA/visual donde rector exige; U-DYNAMIC cerrado. Sin QA/deploy en6A.2. |

## Suite de aceptación por formulario

Cada FORM-xx debe tener escenario exitoso con prerequisitos explícitos, required/optional/conditional conforme al request, selección contextual y desde selector cuando exista, error por campo/fila, denegación de lookup/command, versión/estado cambiado, cancelación/retorno, teclado/accessibility/responsive. Los cero-input prueban confirmación con significado empresarial y body/concurrency canónico; no inventar campos. Formulario sólo habilitado tras todas dependencias necesarias, sin valores ficticios.

Las 3 JSON pruebas verifican typed FK/pair, minItems y omitted optional, tenant y parent version, schema additionalProperties=false. Vocabs se prueban contra fuente publicada por operación, sin frontend-only opciones. Selectores muestran más de primera página, preservan elegibilidad y no filtran data sensible sólo después de descargarla. Comandos prueban replay misma key/payload, 409 payload distinto, expected_version/If-Match fuerte y eventos/audit existentes sin duplicación.

No una evidencia meramente mock basta para gate runtime; ningún HUMAN_UI_REVIEW=PASS emitido por agente. Gates siguen NOT_STARTED en este paso aunque diseño documental valide.
