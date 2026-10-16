# Expedientes pendientes y criterios de fase — F-09/F-10

STATUS=DOCUMENTARY_REQUIREMENTS_NOT_ACCEPTANCE. Fuentes rector17/19/23§8/24/28/29/38/43/45/46/49; ledger26 y macro_implementation_20261009 de07_RESULT.json,36/48DONE locales y12pendientes. No se reclasifica una H como cerrada por aprobar conservar su bloqueo.

| Expediente | Datos/fuentes necesarios | Artefactos exactos y criterio | Estado / owner |
| --- | --- | --- | --- |
| H-01 legal | Texto oficial/contrato externo pertinente, fuente/version/hash/cláusula; jurisdicción, actividad, objetos; vigencia, hold y precedencia23§8 | DecisionRecord legal con aplicabilidad positiva/negativa; matriz objeto→contexto→policy/version; representación tipada revisada; guards createUploadIntent/finalize/evidenceCreate; pruebas. Presencia de familiaLEGAL nunca demuestra aplicabilidad. | BLOCKED_SOURCE_AND_BINDING; Privacy/Legal+Architecture/Data/Security/Evidence. |
| H-04 Compliance v1 | Rector17§3.1/19§2/38, defaults peso1/factor0.50/coverage80%; pack override exacto o ausencia demostrada; población/inputs/lineage/fuentes | Expediente por methodologyID/formulaID/version/hash que demuestre autosuficiencia; insuficiencia→conservar EC opcional conforme contrato vigente sin publicar none. | BLOCKED_SUFFICIENCY; Methodology/Compliance/Configuration. |
| H-05 Controls v1 | Rector17§§3.2–3.4/19§3/38/39§2; min(design,operating),coverage80%; inputs válidos, evidencia, recencia/confianza oficiales | Expediente reproducible por versión con muestras positivas/negativas y suficiencia; no ventana de recencia inventada ni promedio compensatorio. | BLOCKED_SUFFICIENCY; Methodology/Controls/Assurance. |
| H-06 publicación | Expedientes H04/H05; metodología/fórmula/version/sourceHash/vigencia exactos; contrato ejecutable27 | Cambiar modo material exige sucesora; representation física del binding sólo después de fuentes/suficiencia; no editar v1 o backfill assessments/NULL=none. Manifest+schemas+modelo por hash revisados. | BLOCKED_REPRESENTATION_AND_PUBLICATION; Architecture/Data/Methodology/Backend/Security. |

Los campos ausentes son evidencia faltante, no parámetros técnicos a escoger. Se preparan requisitos de expediente, no una decisión legal sustantiva ni publicación metodológica. La revisión unipersonal49 permite funciones acumuladas y no acredita esas fuentes. Independencia externa sólo si la fuente superior exacta la exige.

## Dependencias independientes y cierre integral

El motor comercial genérico puede diseñarse y, tras sus gates, implementarse con fixtures aislados sin aplicar retención ni calcular scores: rector43§4/Fase4 y31 decisión55 preservan independencia por dependencia concreta. Change-plan no altera Evidence/Assessment, fórmulas o retención. Un pack oficial requerido todavía debe superar37/41; no usar contenido draft real por un fixture.
El cierre integral STEP6A3 NO puede omitir las12cláusulas pendientes que el ledger vigente incluye.07_RESULT.json continuity_r4/r5/r6 conserva48traced/36local/12pending y STEP6A3PARTIAL_BLOCKED; rector49§6 fija6A3→6A4→ZIP→6A5. Ninguna autorización leída extrae H01/H04/H05/H06 de ese cierre. Por tanto: desarrollo comercial independiente permitido después de sus aprobaciones; cierre integral bloqueado hasta resolver y aceptar obligaciones heredadas. No se cambia el significado de fase.

## Secuencia no circular de suficiencia/publicación

Preparar expediente H04/H05 y representación H06 como candidatos conjuntos→probar suficiencia por versión en entorno autorizado→revisión humana de ambos artefactos exactos→publicación versionada→aceptación externa H10. H04/H05 no exigen que H06 ya esté activa para elaborar la prueba; H06 no afirma suficiencia por publicar. H01 sólo es dependencia de escenarios que consumen contexto legal.

## Entrada exacta STEP6A4

Requisitos acumulativos: cierre formal humano de STEP6A3 con48/48cláusulas trazadas aceptadas en su alcance; comercial end-to-end persistence/domain/API/RBAC/audit/UI/tests/E2E/runtime/traceability; fuentes legales/metodológicas y publicación aplicables; QA/IAM/grants/migraciones legitimados bajo mandatos propios; integridadrectora y gates aplicablesPASS; source/runtime parity; registro humano de cierre fuera del baseline; taskpacket autorizado de STEP6A4. Ninguna firma de este diseño satisface esos requisitos ni inicia la fase. STEP6A4=NOT_STARTED; READY no acreditado.

## Decisiones externas agrupadas mínimas

1. Firmar o rechazar diseño candidato R-P/ventana/HTTP200/cuotas inmutables/fechas/replay/autoridad y artefactos exactos.
2. Aportar expediente legal y suficiencia metodológica; aprobar representación exacta cuando fuentes permitan cerrarla.
3. Autorizar inventario READ ONLY compartido con alcance/actor/tiempo/retención de resultados; resolver coexistencias activas y datos inválidos descubiertos por decisión competente.
4. Aportar cuotas y mapping de adopción por IDs, comercialmente aprobados. No cantidades ficticias.
5. Después de pruebas reales, autorizar publicación/grants/QA/release por artefactos reales y aceptar gates correspondientes.

No se solicitan nuevas decisiones sobre diseños UQ/default/grants44 ya firmados en su alcance; sí su adopción/compatibilidad operacional.
