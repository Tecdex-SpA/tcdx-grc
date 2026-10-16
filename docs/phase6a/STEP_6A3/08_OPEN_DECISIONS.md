# Decisiones humanas abiertas

Fecha: 2026-10-08. Main / 6af66387aa03fa185ef139584de07700f247b903. Master: TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23. STEP_6A3=PARTIAL_BLOCKED.

Cuatro decisiones obligatorias RR-G01..04 se mantienen sin resolver. Especificación mínima, restricciones de permiso/tenant/filtros/paginación/orden/proyección/tests en `docs/phase6a/STEP_6A2/04_MISSING_READ_CAPABILITIES.md`, sin aprobar DRAFT. Owner debe emitir Decision Record y publicar fuentes/contract packet antes de la porción bloqueada; ejecución independiente no modifica ese gate.

14 familias U-VOC: classification, evidence_type, frequency_code, items[].applicability_decision, items[].implementation_state, link_role, origin_role, priority, relevance, samples[].selection_method, severity, source_kind, sufficiency, suggested_owner_role_code. Owners/semántica exactos en6A.2/05. Deben cerrar enum/catálogo/configuración existente o free text legítimo, valores sólo cuando cerrado, ownership/version/effective rules, fuente lectura/permiso y labels. No IAMRole para roles de origen/vínculo/sugerencia ni escala Risk para severity.

U-FILTER es una decisión conjunta sobre applicability/implementation controlList: UIenvía parámetros que OpenAPI/allowlist vigentes no admiten. No habilitar rama inalcanzable como authority, no new enum ni query params sin decisión/publicación. Los2campos están dentro de28pendientes originales.

U-CONTROL-LIFECYCLE: un campo adicional F-0116 filter[lifecycle_state] en controles carece de fuente completa publicada de opciones. Inspección focalizada09registry y consulta PostgreSQL aislada de Control/ControlVersion/TenantControl:0 edgespublished. Existing initial active no completa catálogo. Domain/Architecture debe identificar fuente o cerrar alcance del filtro; no inventar estados ni migración para lookupUI. Esta evidencia no reinterpreta baseline61 confirmados: identifica falta de publicación consumible en un filtro concreto.

Total:20 decisiones agrupadas =4 RR +14vocabfamilies +1 U-FILTER +1 U-CONTROL-LIFECYCLE;29 ocurrencias de vocab pendientes =28históricas +F-0116. No contradicción rectora nueva; RECTOR_GATE=BLOCKED para finalización del slice por autoridad necesaria pendiente, con integridad rectora PASS y parte independiente validada.

U-ZIP exact archive(1) y U-DYNAMIC runtime/accesibilidad global siguen requisitos históricos; no se declaran resueltos por selección local. No se inicia6A.4 ni6A.6, sin QA/human UI auto-review. Próxima acción: cerrar decisiones/publicarcontratos y completar6A.3; no abrir micro-step ni broad grant.


## Continuación correctiva — 2026-10-08

La aprobación funcional RR-G01..04 y regla transversal ya está registrada como DR-6A3-FUNCTIONAL-20261008. La evidencia anterior se conserva como histórica. Decisiones técnicas exactas aún abiertas, alternativas y consecuencias: `docs/phase6a/STEP_6A3/11_CORRECTIVE_CONTRACT_DECISION_PACKET.md`. Matriz de29campos: `docs/phase6a/STEP_6A3/12_CORRECTIVE_VOCABULARY_MATRIX.csv`. Informe/pruebas frescas: `docs/phase6a/STEP_6A3/13_CORRECTIVE_CLOSURE_REPORT.md`. Resultado actual: `docs/phase6a/STEP_6A3/14_STEP_6A3_CORRECTIVE_RESULT.json`; resultado10 anterior no se sobrescribe. STEP_6A3=PARTIAL_BLOCKED;20grupos técnicos CT/CV/CF, aprobación funcional no pendiente. Cambios fuente nuevos=0; ninguna lectura/proyección/Permission o vocabulario DRAFT se presenta aprobado.


## Cierre técnico correctivo autorizado — 2026-10-08

DR-6A3-TECHNICAL-20261008 en15registra direcciónPOaprobada ypublicación técnica pendiente,sin firmas ficticias. CF-01/02implementados/probados:3campos resueltos porretiro/disabled explícitos;60fuentes vocabpreparadas+3CF=63resueltos,26CVbloqueados.4CTaúnbloqueados porpublicación/binding.18definiciones residuales agrupadas en3packets específicos,nolas20anteriores. Localizaciónselectorcentral yfail-closedespañol implementados.509unit/102frontend/82PGlocal/448browserlocal(256IAMsubset)PASS;21IAMrealNOT_EXECUTED. Matrices16/17,informe18 yresultado19son estadoactual; evidencia anteriorpreservada. STEP_6A3=PARTIAL_BLOCKED;6A.4noiniciada.
