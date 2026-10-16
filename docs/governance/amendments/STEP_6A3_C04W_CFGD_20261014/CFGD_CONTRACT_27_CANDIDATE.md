# Contrato ejecutable 27 — delta candidato CFG-D

`STATUS=DRAFT_NOT_EFFECTIVE`  
`SOURCE_SHA256=3487fd9fa032e5d311b37361ff673c335fba63c9736110b2c7200581370fd8dd`  
`TARGET=docs/executable-contracts/27_PHASE5_METHODOLOGY_BINDING.md`  
`SCOPE=CFG-D-COMPLIANCE-V1,CFG-D-CONTROLS-V1,CFG-D-PUBLICATION`

El Product Owner aprobó exactamente el reemplazo siguiente en el candidato
fuente. Esta copia prepara su incorporación al contrato 27 sin modificar las
metodologías v1, sus registros, `EffectiveConfiguration`, resultados ni historia.
El archivo destino permanece inalterado hasta la aprobación de los bytes del
contrato derivado y su publicación gobernada.

> Para BASELINE_COMPLIANCE v1 y BASELINE_CONTROL_EFFECTIVENESS v1 se conserva
> la fórmula, los parámetros y el binding de metodología publicados, así como
> la opcionalidad contractual de EffectiveConfiguration. Una referencia EC
> presente debe ser válida para tenant y dominio; EC ausente no declara
> autosuficiencia ni equivale a `configuration_mode=none`. Los inputs, evidencia,
> procedencia o conflictos insuficientes producen el `result_status` rector
> correspondiente y no un resultado oficial `valid`. No se publica modo
> `none`, no se crea versión sucesora, no se reescriben assessments o snapshots
> históricos y no se infiere configuración vacía. La publicación versionada de
> un modo sólo será exigible si una versión futura pretende declarar
> autosuficiencia, con su expediente y gates propios.

Dependencia técnica no satisfecha: los guards de assessment deben impedir que
un `result_status=valid` enviado por caller sustituya la prueba de inputs,
evidencia, procedencia y conflictos. Los criterios completos por versión no
están publicados; el candidato no los crea. `RECTOR_GATE=BLOCKED`.
