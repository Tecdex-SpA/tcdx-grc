# TCDX GRC — Base de conocimiento rectora

## Propósito

Este paquete constituye la base contractual, funcional y de ingeniería para el nuevo desarrollo **TCDX GRC**.

Baseline ID: `TCDX_GRC_RECTOR_BASELINE_v1.3_2026-09-15`.

No contiene prompts a ejecutar individualmente. Sus archivos son **fuentes de conocimiento y alineamiento** que deben ser leídas y respetadas por ChatGPT, Codex y desarrolladores antes de diseñar o implementar componentes.

## Contexto del nuevo proyecto

- Repositorio: `Tecdex-SpA/tcdx-grc`
- Base PostgreSQL nueva: `tcdx-grc`
- Servidor PostgreSQL 16 existente: `192.168.2.40`
- Backend futuro: `bk-grc`
- Frontend futuro: `www-grc`
- Servicio IA externo autorizado: `ia2.tcdx.int`
- No existe ni se autoriza una VM/componente desplegable separado denominado `ia-grc` en el baseline inicial. La integración/orquestación de IA pertenece al backend `grc-bk.tcdx.int` y consume `ia2.tcdx.int` mediante contratos gobernados.
- `tcdx-iso-saas-v4` es únicamente fuente de aprendizaje, funcionalidad conocida y anti-patrones. No es base técnica ni esquema a preservar.

## Objetivo

Construir una plataforma GRC completa, comercial y operativa. No un MVP, demo, prototipo ni conjunto de pantallas parcialmente funcionales.

## Autoridad y resolución

Existe una sola precedencia, definida al final de este documento. Toda contradicción debe resolverse modificando primero esta base; nunca se elige silenciosamente ni se crea compatibilidad paralela. El plan maestro 43 gobierna la ejecución y los gates.

## Principio rector

> Contract first. Canonical data first. Implementation second. Runtime evidence before closure.

PostgreSQL es el system of record operacional. La IA no es autoridad de cumplimiento ni system of record.

## Addendum obligatorio - Contrato de informacion y consumidores

Se incorporan como fuentes rectoras:
- `14_CONTRATO_CANONICO_INGESTA_CALCULO_RESULTADOS.md`
- `15_MODULOS_CONSUMIDORES_Y_MATRIZ_DE_INFORMACION.md`

Estos documentos son transversales. Ningun modulo, conector, metrica, regla, dashboard o capacidad IA puede introducir una semantica de datos paralela. Ante conflicto, debe reconciliarse el contrato antes de implementar.

## Jerarquía contractual ampliada y definitiva

Los contratos 14-45 son vinculantes. Para decisiones de datos/cálculo/operación prevalece el contrato más específico siempre que no contradiga Definición de Producto, Domain Model o Canonical Data Model.

Orden de resolución:

1. `01_DEFINICION_NUEVO_PRODUCTO.md`
2. `07_TCDX_GRC_DOMAIN_MODEL.md`
3. `08_TCDX_GRC_CANONICAL_DATA_MODEL.md`
4. `30_MODELO_LOGICO_RELACIONAL_CANONICO.md`
5. `14_CONTRATO_CANONICO_INGESTA_CALCULO_RESULTADOS.md`
6. `16_CATALOGO_CANONICO_OBSERVACIONES_Y_SUBJECTS.md`
7. `17_CATALOGO_METRICAS_FORMULAS_Y_AGREGACIONES.md`
8. `18_RULES_ENGINE_GRC_IMPACT_CONTRACT.md`
9. `19_METODOLOGIAS_GRC_COMPLIANCE_RISK_ASSURANCE.md`
10. `21_LIFECYCLE_TRANSITION_MATRIX.md`
11. `22_RBAC_PERMISSION_SCOPE_MATRIX.md`
12. `23_CONTRATO_TEMPORAL_VERSIONADO_RETENCION_RECALCULO.md`
13. `24_CONTRATO_EVIDENCIA_DOCUMENTOS_ARCHIVOS.md`
14. `25_API_EVENTOS_IDEMPOTENCIA_AUDITORIA.md`
15. `26_NON_FUNCTIONAL_SECURITY_RELIABILITY_OBSERVABILITY.md`
16. `20_MATRIZ_CONECTORES_DATOS_OBSERVACIONES_IMPACTO.md`
17. `27_REPORTING_UX_RESULTADOS_DRILLDOWN.md`
18. restantes documentos de funcionamiento, traceability, engineering, infraestructura y anti-regresión.

## Prohibición de implementación prematura

No crear schema físico, migraciones, endpoints, UI funcional definitiva, conectores ni reglas runtime hasta obtener `PRE_IMPLEMENTATION_CONTRACT_GATE=PASS` conforme a `28_PREIMPLEMENTATION_CONTRACT_GATE.md`.

El repositorio puede contener documentación y scaffolding no vinculante, pero ninguna decisión física puede adelantarse al contrato lógico.


## Semántica y catálogo completo

`32_GLOSARIO_SEMANTICO_Y_NOMENCLATURA.md`, `33_CATALOGO_ENTIDADES_CANONICAS.md` y `34_ARQUITECTURA_LOGICA_COMPONENTES_Y_DEPENDENCIAS.md` son fuentes rectoras para evitar ambigüedad terminológica, entidades faltantes y acoplamiento técnico prematuro.

## Contratos de cierre semántico y ejecución

35. `35_SOURCE_PRECEDENCE_CONFLICT_RESOLUTION_POLICY.md` — autoridad entre fuentes y conflictos.
36. `36_AUTOMATION_POLICY_AND_HUMAN_OVERSIGHT.md` — límites de automatización y decisiones humanas.
37. `37_REGULATORY_PACK_CONTRACT.md` — incorporación versionada de normas/leyes/frameworks.
38. `38_RESULT_STATUS_AND_DATA_SUFFICIENCY_CONTRACT.md` — estados de suficiencia y validez de resultados.

41. `41_BASELINE_REGULATORIO_OBLIGATORIO.md` — packs obligatorios, cobertura completa y gates.
42. `42_PLANES_COMERCIALES_Y_ROLES_BASE.md` — planes, capabilities, roles y segregación.
43. `43_PLAN_MAESTRO_RECTOR_DISENO_Y_DESARROLLO.md` — stack, fases, responsables y gates.
44. `44_CONTRATO_ESTRUCTURA_NORMATIVA_REQUISITOS_CONTROLES.md` — separación vinculante entre unidades normativas, requisitos evaluables y controles.

Estos documentos tienen fuerza contractual especializada. Ningún documento anterior puede interpretarse de forma incompatible con ellos.

## Cierre semántico pre-modelo físico

El documento `39_DECISIONES_SEMANTICAS_FINALES_PRE_MODELO_FISICO.md` cierra las decisiones semánticas finales necesarias antes de DDL. El documento `40_CIERRE_INTEGRIDAD_SEMANTICA_Y_CONTRATOS_FISICOS.md` reconcilia conflictos residuales y fija la precedencia final para derivación física. Ningún modelo físico puede contradecir 39-40.


## Precedencia contractual definitiva para conflictos

Para conflictos de interpretación aplica:

1. `45_CONTRATO_DESARROLLO_CERRADO_Y_NO_INFERENCIA.md` para límites de actuación de Codex, suficiencia de task packets y aprobaciones;
2. `43_PLAN_MAESTRO_RECTOR_DISENO_Y_DESARROLLO.md` para secuencia, stack y gates;
3. `42_PLANES_COMERCIALES_Y_ROLES_BASE.md` para planes y roles;
4. `44_CONTRATO_ESTRUCTURA_NORMATIVA_REQUISITOS_CONTROLES.md` para estructura normativa, Requirements, controles y mappings;
5. `41_BASELINE_REGULATORIO_OBLIGATORIO.md` para contenido normativo obligatorio;
6. `40_CIERRE_INTEGRIDAD_SEMANTICA_Y_CONTRATOS_FISICOS.md` para reconciliaciones;
7. `39_DECISIONES_SEMANTICAS_FINALES_PRE_MODELO_FISICO.md`;
8. contrato especializado del concepto (35-38, luego 14-30 según dominio);
9. `33_CATALOGO_ENTIDADES_CANONICAS.md` para identidad/nombre de entidades;
10. `08_TCDX_GRC_CANONICAL_DATA_MODEL.md` y `07_TCDX_GRC_DOMAIN_MODEL.md`;
11. documentos generales de funcionamiento/mapas/ejemplos.

La precedencia no autoriza contradecir materialmente la Definición de Producto: si eso ocurre, el gate vuelve a BLOCKED y debe reconciliarse el producto.

## Cierre de reconciliación v1.2

Esta revisión cierra expresamente: scope de RequirementApplicability mediante Subject sin confundir ownership tenant; distinción EvidenceLink→Control vs ControlVersion; targets cerrados de EvidenceRequest; orígenes cerrados de IssueOrigin; eventos GLOBAL_REFERENCE/PLATFORM_CONTROL sin tenant artificial; y regla Tenant=ownership / Organization-Subject=scope. No se agregan capacidades ni dominios.

## Cierre de gobernanza v1.3

La revisión v1.3 incorpora `45_CONTRATO_DESARROLLO_CERRADO_Y_NO_INFERENCIA.md`. Codex opera con presupuesto de variación cero: puede derivar mecánicamente lo ya aprobado, pero no escoger entre alternativas, llenar vacíos, aprobar gates, crear ADR ni convertir prácticas técnicas habituales en decisiones del producto. Toda indeterminación material produce `RECTOR_GATE=BLOCKED` y vuelve al owner humano correspondiente.

La topología distingue de forma expresa nombre lógico de componente, FQDN e IP; el catálogo inicial de capability groups es exacto; y cada release debe declarar dependencias de Regulatory Packs en un manifiesto aprobado. Estas reconciliaciones no autorizan modelo físico, migraciones ni desarrollo funcional adicional.

## Estado del baseline

Sólo los archivos `.md` enumerados 00–45, `PRE_IMPLEMENTATION_GATE_REPORT.md` y `SHA256SUMS.txt` integran el paquete. El verificador exige inventario exacto y rechaza archivos normativos adicionales, ausentes o enlaces simbólicos. Hallazgos, cruces, borradores, archivos adjuntos individualmente y revisiones históricas quedan excluidos y no son normativos. La autoridad corresponde exclusivamente a los archivos extraídos del ZIP cuyo checksum coincide con este manifiesto.
