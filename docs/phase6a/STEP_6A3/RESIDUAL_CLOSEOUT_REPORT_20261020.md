# STEP6A3 — resolución de los dos residuales de cierre

Baseline: `TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16`. QA TECDEX. Dominio: https://grc.tecdex.net/. Este informe sucede exclusivamente a P1/P2 de `FORMAL_CLOSURE_EVALUATION_20261020.md`; conserva los PASS anteriores. STEP6A4 no iniciado.

| Estado solicitado | Resultado | Acción pendiente |
| --- | --- | --- |
| CFG_D_OPERATIONAL_ACCEPTANCE | **PASS** | Ninguna comprobación operacional adicional; la presentación se incluye en la única revisión humana indicada abajo. |
| UI_V112_TECHNICAL_REVIEW | **PASS** | Ninguna prueba técnica adicional para este residual. |
| UI_V112_HUMAN_ACCEPTANCE | **PASS** | PO confirmó expresamente UI-1 a UI-7, escritorio y pantalla estrecha. Recibo final registrado. |
| RECTOR_GATE | **PASS** | Verificación final y aceptación humana consolidada en FINAL_CLOSURE_REPORT_20261020.md. |
| STEP6A3_CLOSURE | **PASS** | Sin acciones pendientes de esta etapa. STEP6A4 pendiente de autorización, no iniciado. |

## Evidencia recuperada y exclusiones

No se repitieron PASO9.2B,9.3,9.4 ni las18 verificaciones de persistencia. Se conservan `evidence/closure-evaluation-20261020/PO_FUNCTIONAL_ACCEPTANCE.json`, `chain-verification.json` e índice consolidado. Tampoco se reejecutaron suites unitarias/PostgreSQL/Playwright ya PASS.

| Recibo existente | Cobertura reutilizada | Límite conservado |
| --- | --- | --- |
| `evidence/account-continuity-20261015/recovered-step6a3-cfgd-qa-proof.json` | Controls diagnóstico `01a14122-06e4-748d-a3db-5935f64c1901`, completed/v3, insufficient_data, métricas/cobertura/conclusión nulas; histórico aprobado preservado. | No es aceptación visual humana. No recreado ni completado otra vez. |
| `evidence/initial-source-implementation-20261015/final-focused-tests.json` | Guard CFG-D: valid caller no basta; causalidad/null; bloqueo de aprobación v1 sin criterios, sin actualizar históricos; presentación sin cero artificial. | Pruebas técnicas locales; no se renombran como QA autenticada. |
| `evidence/ordinary-retention-v112-20261016/RESULT.json` | 37 unitarias,17 PostgreSQL,6 casos de presentación escritorio/estrecho;5 escenarios adicionales ×2 tamaños =10 PASS de precedencia/navegación/seguridad. Typecheck/build y contratos PASS existentes. | API simulada para presentación. Reutilizados, no repetidos. Hashes de ambos reportes unit/PG y10 capturas contrastados: PASS. |
| `QA_RUNTIME_PUBLICATION_RELEASE_EVIDENCE_20261014.json` | Aceptación humana de Empresas/cambio de plan y restricción Tenant Admin. | Excluidos de revisión pendiente; sólo se incluye el acceso nuevo a aplicabilidad, no se repite cambio de plan. |
| `HUMAN_RESIDUAL_VOC_C04_ACCEPTANCE_RECEIPT_20261014.json` | Inventario histórico agregado y conservación literal de vocabularios QA. | No se vuelve a pedir esa decisión; tampoco se extrapola a revisión visual nueva. |
| Recibo PO20oct y selector user3 del expediente `functional-scenario-20261020` | Evidencia final, referencia al control tenant-owned, persistencia y recuperación del PDF. | Formulario/transferencia/fechas/selector de vínculos de ese recorrido fuera del trabajo pendiente. |

No se requiere volver a aprobar95 referencias individualmente ni42 formularios de STEP6A4. No se reabre duración de sesión, incorporación normativa, fuente jurídica universal ni reclasificación v1.12. El fixture sigue siendo QA, sin valor probatorio de cumplimiento real.

## CFG-D: exclusivamente los casos sin recibo QA

Procedimiento existente: checklist15oct, negativo CFG-D, caso nuevo autorizado/diagnóstico por comandos oficiales, preservando históricos. Sesión Zoho normal de `andres.barouh@tecdex.net`; `/api/v2/auth/me/authorization` respondió200 y acreditó permisos operacionales de creación/actualización/submit de ambos dominios con scope **tenant TECDEX**. No se utilizó Platform Admin para sustituirlos ni se cambiaron roles. Credenciales permanecieron en Chromium.

Se crearon **dos assessments QA**, no Evidence/Document/FileObject ni vínculos documentales: uno para el diagnóstico Compliance que faltaba y otro sólo para el negativo Controls sin recibo. No se creó una segunda prueba positiva de Controls. Los comandos usan idempotencia, expected_version e If-Match fuerte. No hubo SQL de escritura, aprobación, cambio metodológico o modificación de filas históricas.

| Caso | Operación y resultado real | Recibo/correlación |
| --- | --- | --- |
| Compliance pendiente | GET de aplicabilidad existente aprobada `01a118c4-0331-73a7-97cc-c2eadd006b98` y metodología publicada `01a11900-0000-7001-8000-000000000001`; create202 y start202. | Requests/responses02,03,06,07 del expediente nuevo. |
| valid caller sin suficiencia | Submit `{expected_version:2,result_status:"valid"}` al assessment **01a15932-85d5-7393-859e-15c5e589ecb9**: HTTP202, **assessed/insufficient_data**, versión3. domain_conclusion, coverage_percent, approved_at y EC nulos. GET200 idéntico. | `08-compliance-valid-guard`, `17-compliance-persisted`; correlación **01a15932-b1be-70d5-b913-d73c00bbdd70**. |
| Negativo Controls pendiente | Sobre control QA tenant-owned ya aceptado, create202/start202 del assessment **01a15932-d59a-71cc-a65c-335ec33e5b4a**. Complete con `{expected_version:2,result_status:"valid"}`: **HTTP400 TCDX.VALIDATION.FAILED**, campo **design_effectiveness**. | `09` a `12`; correlación de rechazo **01a15933-054e-7412-9fa3-8d718d33c377**. |
| Rechazo sin actualización | GET200 de Controls idéntico al resultado start: in_progress/no_data, row_version2; dimensiones/cobertura/conclusión/EC nulas. | `10-control-negative-start` frente a `12-control-after-reject`. No se intenta completar/aprobar el diagnóstico. |
| Historia Compliance | Histórico **01a11afc-7a61-743f-9add-fbd93a87ddd7** permanece approved/no_data, versión4, misma conclusión/fechas y null. Igualdad exacta de las proyecciones antes/después. | `04-compliance-before` frente a `19-compliance-history-after`. |
| Historia Controls | Histórico **01a11afc-7f48-701e-9c0b-c2bc01ba0a5e** permanece approved/no_data/not_tested, versión5; proyección exacta antes/después. | `05-controls-historical-before` frente a `18-controls-history-after`. |

Compliance rechaza la pretensión de **validez oficial** mediante diagnóstico conservador; HTTP202 no es una denegación HTTP. Controls rechaza el comando incompleto con400. Ambos comportamientos corresponden a sus implementaciones/contratos vigentes y no se homogeneizan artificialmente. No se inventaron cobertura100, eficacia90, población, evidencia o modo none. La presentación y comprensión humanas del diagnóstico quedan sólo en UI-3/UI-5; no son un segundo bloqueo operacional.

## UI: revisión técnica y único inventario humano restante

Se capturaron en QA autenticada las cuatro rutas actuales, los dos listados diagnósticos y sus formularios de referencia, a1536×1024 y390×844. Las capturas verifican ruta canónica, pantalla esperada y ausencia de desbordamiento horizontal del documento. Los formularios se abrieron/cerraron sin envío; no son pruebas de creación. Las capturas de apertura pueden mostrar «Cargando opciones…» transitorio: no certifican la elegibilidad de cada opción ni sustituyen los recibos técnicos existentes o el juicio humano sobre el estado estable.

La cobertura automatizada existente de precedencia, estados/labels, teclado/foco de referencias, contexto/parent-version y permisos se reutiliza con sus límites. Las capturas nuevas acreditan presentación real QA; no son comparaciones pixel-perfect ni aceptación humana. No se actualizó baseline visual ni se modificó frontend.

### Guía ejecutada y aceptada por el Product Owner

Usar TECDEX y la sesión Zoho abierta. Revisar primero escritorio y luego ancho estrecho (~390px); basta una confirmación consolidada, con excepción por fila si algo falla. No crear/enviar registros, aprobar assessments, transferir archivos, cambiar política ni modificar datos. Las cifras/estados de CFG-D ya están comprobados por API: sólo juzgar si se entienden y pueden consultarse en la UI.

| ID | Pantalla y acceso exacto | Comportamiento esperado / criterio PASS–FAIL | Capturas QA |
| --- | --- | --- | --- |
| UI-1 | [Políticas de retención](https://grc.tecdex.net/evidencias?tab=retencion): tabla, detalle de QA_RET_ORD_001 y Nuevo registro; cerrar sin guardar. | PASS: código/tipo/versión/estado distinguibles; etiquetas legibles; precedencia identificada como derivada y no editable; controles utilizables con teclado y scroll. FAIL si el significado o interacción no se comprende o queda oculto. No repetir publicación. | [Escritorio](evidence/residual-closeout-20261020/qa-review/13-ui-retention-create-1536.png), [estrecho](evidence/residual-closeout-20261020/qa-review/13-ui-retention-create-390.png). |
| UI-2 | [Aplicabilidad de retención](https://grc.tecdex.net/evidencias?tab=aplicabilidad-retencion): tabla/detalle del registro publicado de QA_RET_ORD_001 y Nuevo registro; cerrar. | PASS: se distingue versión de policy y de aplicabilidad; clasificación, scope y fechas locales se entienden; texto explica fuente opcional para política ordinaria. Selectores legibles al terminar la carga, sin escribir UUID. FAIL si exige fuente universal o no permite comprender la selección. No volver a publicar. | [Escritorio](evidence/residual-closeout-20261020/qa-review/14-ui-applicability-create-1536.png), [estrecho](evidence/residual-closeout-20261020/qa-review/14-ui-applicability-create-390.png). |
| UI-3 | [Evaluaciones de control](https://grc.tecdex.net/controles?tab=evaluaciones-control): Ver detalle del registro **01a14122…**, Completada/v3; histórico **01a11afc…**, Aprobada/v5. | PASS: el diagnóstico insufficient_data/datos insuficientes y valores no informados se distinguen de0/valid/aprobación; el histórico puede consultarse separadamente; lectura y cierre legibles en ambos tamaños. FAIL si presenta suficiencia/eficacia oficial que no existe o impide distinguir historia. No ejecutar acciones de estado. | [Escritorio](evidence/residual-closeout-20261020/qa-review/15-ui-controls-diagnostic-1536.png), [estrecho](evidence/residual-closeout-20261020/qa-review/15-ui-controls-diagnostic-390.png); API/IDs completos en sección CFG-D. |
| UI-4 | En esa misma pantalla: Nuevo registro de evaluación de control; recorrer referencias y cerrar sin guardar. | PASS: búsqueda/elección del control, versión dependiente y metodología distinguibles; EC opcional sin asumir none; foco visible y controles accesibles. FAIL si necesita pegar IDs o resulta imposible identificar la selección. No crear otro assessment. | [Escritorio](evidence/residual-closeout-20261020/qa-review/20-ui-control-reference-form-1536.png), [estrecho](evidence/residual-closeout-20261020/qa-review/20-ui-control-reference-form-390.png). |
| UI-5 | [Evaluaciones de requisitos](https://grc.tecdex.net/requisitos?tab=requisitos): Ver detalle de **01a15932…**, Evaluada/v3; histórico **01a11afc…**, Aprobada/v4. | PASS: diagnóstico insuficiente y null no parecen cumplimiento oficial/0; histórico consultable y separado; jerarquía/lectura utilizables en ambos tamaños. FAIL si una evaluación sólo diagnosticada aparece válida/aprobada o su estado no se entiende. No aprobar ni volver a enviar. | [Escritorio](evidence/residual-closeout-20261020/qa-review/16-ui-compliance-diagnostic-1536.png), [estrecho](evidence/residual-closeout-20261020/qa-review/16-ui-compliance-diagnostic-390.png); datos exactos en CFG-D. |
| UI-6 | En esa misma pantalla: Nuevo registro de evaluación de requisitos; inspeccionar selectores y cerrar. | PASS: aplicabilidad aprobada y metodología/version se distinguen sin escribir UUID; ausencia de EC no se presenta como modo none; lectura/foco utilizables. FAIL si referencias o selección resultan ininteligibles. No crear otro assessment. | [Escritorio](evidence/residual-closeout-20261020/qa-review/21-ui-compliance-reference-form-1536.png), [estrecho](evidence/residual-closeout-20261020/qa-review/21-ui-compliance-reference-form-390.png). |
| UI-7 | [Empresas](https://grc.tecdex.net/configuraciones/empresas): TecDex → Ver detalle → **Abrir aplicabilidad de retención**. | Revisar sólo el acceso añadido: PASS si el texto es comprensible y conduce al espacio existente de aplicabilidad de la empresa activa, conservando la pestaña al recargar. Los negativos de permisos/contexto ya están acreditados; no repetirlos ni revisar cambio de plan. FAIL si navega a un contexto/pestaña incorrecto o el acceso es inutilizable. | Acceso directo indicado; capturas16oct en RESULT#qa_findings_correction ya acreditan escritorio/estrecho con API simulada, sin presentarlas como revisión humana QA. |

Común a las siete filas: conservar marca/jerarquía aprobadas, español comprensible, foco y cierre accesibles; sin texto o acciones esenciales recortados. El scroll interno de una tabla/panel es admisible; no confundirlo con pérdida de contenido. La guía no exige repetir validaciones de backend ni formularios/recorridos ajenos.

Recibo mínimo que falta: **«Revisé UI-1 a UI-7 en QA TECDEX, escritorio y pantalla estrecha: PASS»**, sólo si efectivamente se revisaron. Si falla una fila, indicar ID, tamaño y observación; no aceptar por anticipado. Codex no asigna HUMAN_UI_REVIEW=PASS.

## Registro técnico y límites

Expediente: `evidence/residual-closeout-20261020/`. Requests/responses oficiales sanitizados en `qa-review/`; autorización y correlaciones preservadas; capturas sin secretos. `CHECKS.json` contiene las comprobaciones derivadas de los recibos, no una suite funcional repetida. `SOURCE_RECEIPTS.json` vincula por SHA256 los recibos reutilizados. `SHA256SUMS.txt` fija los artefactos del expediente. Gate anterior/posterior en `rector-governance-pre.log`/`rector-governance.log`.

Los mensajes del runner sobre ledger v1.11/STEP6A3 BLOCKED son checkpoints históricos; exit0 acredita integridad y no promueve esos rótulos sobre la baseline activa v1.12 ni sobre la aceptación del PO. El cierre global sigue BLOCKED por la única revisión humana pendiente.

Cambios de esta tarea: este informe, enlace aditivo desde la evaluación anterior, dos herramientas acotadas de comprobación QA y recibos técnicos. Sin cambio en código de producto backend/frontend, contratos ejecutables, IAM/RBAC, metodologías/fórmulas, esquema/migraciones, infraestructura o contratos/despliegues. Datos históricos intactos; únicamente los dos assessments nuevos descritos por operaciones oficiales, autorizados para los casos faltantes. Sin Evidence/Document/FileObject nuevo, SQL de escritura, commit/push/merge/main ni STEP6A4/STEP6A5. Sin conflicto rector nuevo identificado.

Archivos de trabajo: `docs/phase6a/STEP_6A3/RESIDUAL_CLOSEOUT_REPORT_20261020.md`, `docs/phase6a/STEP_6A3/FORMAL_CLOSURE_EVALUATION_20261020.md` (nota aditiva), `scripts/phase6a3/qa-residual-closeout-browser.mjs`, `scripts/phase6a3/qa-residual-command.py` y el expediente citado. Comprobaciones nuevas derivadas de recibos: **20 PASS,0 FAIL** (8 de autorización/CFG-D/historia y12 de pantallas/tamaños); sintaxis de ambas herramientas y whitespace PASS.

Cierre posterior20oct: el PO confirmó expresamente UI-1 a UI-7 PASS, escritorio y pantalla estrecha. La guía anterior se conserva como registro del recorrido ya aceptado; no se solicita repetirla. Su solicitud de considerar una mejora UI-7 durante STEP6A5 no es bloqueante ni autoriza implementación o ampliación contractual. Conclusión actual: [FINAL_CLOSURE_REPORT_20261020.md](FINAL_CLOSURE_REPORT_20261020.md), STEP6A3_CLOSURE=PASS; recibo en evidence/final-closure-20261020/HUMAN_UI_ACCEPTANCE_RECEIPT.json.
