# Registro de decisiones físicas

Sólo se registran decisiones técnicas neutras que preservan una semántica ya cerrada. El artefacto sigue `DRAFT`; Data Model Owner y Architecture Owner deben aceptar estas representaciones al resolver el gate humano.

| ID | Decisión técnica | Fuente semántica | Razón física neutral | Impacto semántico |
|---|---|---|---|---|
| PDM-D001 | Un schema por bounded context, con nombres de 11 | 07, 33 | namespace y ownership claros | ninguno |
| PDM-D002 | Una tabla por entidad canónica única | 33, 40 §3.11 | máxima trazabilidad y preservación de identidad | ninguno |
| PDM-D003 | UUIDv7 generado por plataforma, sin default SQL | 39 §13 | reproduce exactamente la decisión cerrada | ninguno |
| PDM-D004 | `varchar` + CHECK para vocabularios cerrados; FK para registries versionados | 21, 22, 33, 38 | evita duplicar registries y mantiene validación | ninguno |
| PDM-D005 | Valores heterogéneos con columnas tipadas y check one-of | 16, 29, 31 | evita JSON para campos críticos | ninguno |
| PDM-D006 | FKs compuestas `(tenant_id, id)` para relaciones TENANT_* | 26, 30, 39 §14 | impide asociaciones cross-tenant en BD | ninguno |
| PDM-D007 | Targets críticos mediante columnas FK tipadas + exactamente una | 24, 30, 40, 44 | preserva integridad sin par polimórfico débil | ninguno |
| PDM-D008 | `NO ACTION`/`RESTRICT` como política referencial por defecto; nunca CASCADE sobre historia | 30, 39 §17 | conserva evidencia e historia | ninguno |
| PDM-D009 | `jsonb` limitado a raw/event payload, constraints declarativas y metadata suplementaria | 16, 25, 29, 31 | usos abiertos expresamente autorizados | ninguno |
| PDM-D010 | Sin particionamiento inicial obligatorio; candidatos sólo en 04 | 40 §4, 45 §7 | el baseline no autoriza elegir una estrategia material antes del gate humano/volumetría | ninguno; decisión pendiente no bloquea estructura lógica |
| PDM-D011 | Índices de integridad/operación congelables; performance adicional queda candidato medible | 04, 26 | separa contrato de optimización reversible | ninguno |
| PDM-D012 | `EffectiveConfiguration` existe una vez en `config`, aunque 33 la liste transversalmente | 08, 29, 33 | evita doble autoridad | ninguno |
| PDM-D013 | No se materializan read models, caches ni vistas | 34 §5, 40 §4 | no son requeridos para persistencia autoritativa y precisarían aprobación física | ninguno |
| PDM-D014 | Perfiles de columnas documentales componen la definición por tabla | mandato Fase 1 | reduce repetición manteniendo especificación completa | ninguno |

## Decisiones humanas pendientes

No hay decisión semántica faltante. La única aprobación pendiente es aceptar o rechazar el candidato completo mediante `PHYSICAL_DATA_MODEL_REVIEW`; este documento no registra PASS.
