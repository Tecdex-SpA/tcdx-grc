# GRC Tecdex — Conciliación previa del paso normativo post-STEP6A4
Fecha: 2026-10-20 | Estado: REVISIÓN DOCUMENTAL; NO AUTORIZA IMPLEMENTACIÓN

## 1. Fuentes cotejadas
- ZIP de revisión de producto de 2026-10-20 (103 entradas; seis documentos adicionales de revisión).
- ZIP rector v1.1 de 2026-09-15, documentos 33, 37, 41, 43 y 44.
- Información comunicada por el Product Owner: baseline activa v1.12, cierre STEP6A4=PASS.

**Límite:** no se dispone en estos ZIP del texto completo vigente de la baseline v1.12, ni del repositorio en vivo. Por ello esta conciliación NO certifica compatibilidad final, autorización de nuevos contratos ni denominación del paso intermedio. El ZIP rector v1.1 es antecedente, no reemplaza v1.12.

## 2. Decisiones funcionales del Product Owner
- N-01 a N-17 aceptadas; tres niveles enriquecidos Comprender/Implementar/Demostrar, contextualizables por tenant.
- Mantener los 211 registros propuestos como candidatos incluidos en la preparación, **no** como 211 obligaciones jurídicas comprobadas.
- ISO 9001:2015 y 2026 son ediciones independientes, con adopción explícita por tenant y conservación de historia.
- Matrices gráficas configurables por ejes y filtros, siempre proyecciones de relaciones canónicas.
- Tenant admin propone personalización de actividad, evidencia, frecuencia y confirmación; aprobación empresarial con autoridad formal y trazabilidad.
- Contexto narrativo de empresa como entrada para recomendaciones futuras de aplicabilidad con explicación, incertidumbre y aprobación humana.
- IA futura preparada mediante procedencia, versionado y referencias; no implementar ni dar autoridad autónoma a IA ahora.

## 3. Mapeo canónico preliminar (rector v1.1)
| Necesidad | Entidades/contratos existentes | Restricción |
|---|---|---|
| Pack y fuente | RegulatorySource, RegulatoryPackVersion, FrameworkVersion, RegulatoryCoverageManifest | Publicación exige fuente autorizada, revisión y cobertura completa |
| Jerarquía normativa | NormativeUnit | No recibe cumplimiento ni evidencia de cumplimiento directa |
| Obligación evaluable | Requirement, RequirementApplicability, RequirementAssessment | No fabricar Requirement por encabezado |
| Controles | Control, ControlVersion, RequirementControlMapping, NormativeUnitControlMapping | Separar regulatory_reference, tcdx_baseline y tenant_instantiated |
| Matriz intermarcos | FrameworkCrosswalk, NormativeUnitCrosswalkMapping, RequirementCrosswalkMapping, ControlCrosswalkMapping | Tipos de relación, dirección, confianza, revisión; no equivalencia automática |
| Evidencias y acciones | EvidenceLink, Issue, Action | Trazabilidad al objeto evaluable, no evaluación directa de NormativeUnit |
| Aplicabilidad tenant | RequirementApplicability; SoA/SoAItem cuando proceda | Aislamiento tenant, vigencia, decisión autorizada |
| Explicación editorial | Requiere confirmar campos y mecanismo de contenido en v1.12 | No inventar columnas/endpoints ni mezclar texto licenciado y orientación |
| Overrides y aprobación gerencial | Requiere confirmar operaciones, permisos y SoD en v1.12 | No deducir autoridad de nombre de cargo ni de botón OK |
| Matrices gráficas | Vistas derivadas de mappings/evaluaciones existentes | No construir tabla de resultados paralela |

## 4. Correspondencias explícitas propuestas en el paquete
Las seis relaciones originales son POTENCIALES; ninguna prueba equivalencia normativa ni cumplimiento:
1. ISO 9001 §7.5 ↔ ISO 27001 §7.5 — control documental.
2. ISO 9001 §6.1 ↔ ISO 42001 §6.1 — riesgos y oportunidades.
3. ISO 27001 A.5.24–A.5.30 ↔ Ley 21.663 — incidentes y continuidad.
4. ISO 27001 A.5.34 ↔ Ley 21.719 — seguridad y privacidad.
5. ISO 42001 Anexo A.7 ↔ Ley 21.719 — gobernanza de datos.
6. ISO 9001 §9.2 ↔ ISO 42001 §9.2 — auditoría interna.
Antes de publicar: determinar FrameworkVersion de ambos extremos, tipo de crosswalk, IDs canónicos, dirección, rationale, confidence, reviewer, vigencia y aprobación.

## 5. Distinciones regulatorias críticas
- La baseline v1.1 enumera cinco packs iniciales: ISO_9001_2015, ISO_9001_2026, ISO_IEC_27001_2022, ISO_IEC_42001_2023 y CL_LEY_21719. **Ley 21.663 está en el paquete del usuario, pero no figura en esos cinco**: su incorporación oficial requiere cotejar v1.12 y autorización de alcance.
- ISO 9001:2026: la baseline v1.1 prohíbe publicar como oficial un borrador, y exige texto definitivo licenciado para publicación y evaluación oficial. Puede conservarse material preparatorio claramente rotulado y no seleccionable.
- Ley 21.719: distinguir ley modificatoria, texto consolidado Ley 19.628 y vigencias por fecha; recuperar versión oficial y verificar cambios.
- Los 211 registros son candidatos de contenido y control; no sustituyen manifiestos de cobertura 100% por unidades, obligaciones y controles de referencia.
- Los documentos ISO protegidos no deben reconstruirse por IA cuando falta una copia autorizada.

## 6. Gates y decisiones aún abiertas
| Punto | Estado | Acción mínima |
|---|---|---|
| Ubicación/nombre oficial del paso intermedio | NO VERIFICADO | Leer roadmap y contratos v1.12 en repo |
| Correspondencia N-01..N-17 con operaciones actuales | NO VERIFICADO | Matriz requisito → entidad → API → UI → permiso → gate |
| Explicaciones editoriales | REQUISITO APROBADO FUNCIONALMENTE | Confirmar mecanismo vigente y autoridad de publicación |
| Ajustes tenant y aprobación gerente | REQUIERE DECISIÓN RECTORA SI NO EXISTE SOPORTE | Revisar RBAC/SoD, estado, auditoría y firma de decisión |
| Contexto de empresa y sugerencias | REQUIERE CONFIRMAR ALCANCE Y POLÍTICA DE DATOS | Revisar entidad/configuración existente y límites de IA |
| Matrices gráficas configurables | REQUIERE VERIFICAR ALCANCE | Comprobar reporting/visualización existentes y fase asignada |
| Ley 21.663 como pack | REQUIERE CONFIRMACIÓN DE ALCANCE | Comparar v1.12 con v1.1; no incorporarla silenciosamente |
| Publicación de fuentes normativas | BLOQUEADA POR COTEJO/LICENCIA/COBERTURA DONDE APLIQUE | Fuente auténtica + revisión + coverage manifest + gate por pack |
| Ejecución en QA | NO AUTORIZADA | Preparar dry-run, solicitar aprobación específica |

## 7. Orden propuesto para el próximo trabajo de Codex, sin implementar
1. Leer baseline v1.12 efectiva, AGENTS.md, contratos y roadmap; informar diferencias respecto de v1.1.
2. Inventariar las 103 entradas del paquete y hashes; conservar los originales.
3. Generar matriz exhaustiva N-01..N-17 y decisiones adicionales frente a entidades físicas, OpenAPI, RBAC, SoD y UI existentes.
4. Clasificar: ya implementado / permitido y pendiente / requiere decisión rectora / etapa posterior.
5. Resolver explícitamente Ley 21.663, matriz gráfica, override tenant, aprobación gerencial, contexto narrativo y preparación IA.
6. Proponer plan de homologación y validación semántica con revisión humana, sin importación ni modificaciones.
7. Entregar al Product Owner la lista cerrada de decisiones para aprobación; sólo después generar prompt de implementación.

## 8. Estado final
RECONCILIACION_DOCUMENTAL_PRELIMINAR=COMPLETED
BASELINE_V1_12_CONTRACTUAL_RECONCILIATION=PENDING
IMPLEMENTATION_AUTHORIZATION=NOT_GRANTED
DATABASE_OR_CODE_CHANGES=NONE
REGULATORY_IMPORT=NOT_EXECUTED
