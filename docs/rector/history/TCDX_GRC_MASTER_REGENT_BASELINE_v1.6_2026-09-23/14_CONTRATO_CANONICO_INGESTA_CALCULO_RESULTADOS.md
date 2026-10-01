# 14 - CONTRATO CANONICO DE INGESTA, CALCULO Y RESULTADOS GRC

## 1. Mandato fundacional

TCDX GRC DEBE definir antes de implementar consumidores funcionales de informacion el contrato canónico completo mediante el cual los datos ingresan, son interpretados, procesados, calculados y presentados.

Este contrato NO se construye incrementalmente para satisfacer pantallas, conectores o funcionalidades particulares. Las funcionalidades futuras consumen y extienden de forma compatible el contrato; no redefinen silenciosamente su semantica.

Principio rector:

`Contract first -> Canonical data first -> Implementation second -> Runtime evidence before closure`

En este contexto, Canonical data comprende tambien significado, origen, temporalidad, calidad, transformacion, calculo, regla, impacto, resultado y explicabilidad.

## 2. Cadena contractual obligatoria

`Source -> Ingestion -> RawRecord -> Normalization -> Subject Binding -> Observation -> Validation/Data Trust -> Metric Definition -> Calculation -> MetricMeasurement -> Rule Evaluation -> GRC Impact -> Domain Command/State -> Aggregation/Snapshot -> Result Envelope -> Presentation -> Drill-down/Lineage`

Cada etapa tiene responsabilidad propia y no puede ser omitida mediante accesos directos entre un sistema externo y un consumidor GRC.

## 3. Reglas no negociables

1. Un hecho externo se ingiere una vez y puede tener multiples consumidores.
2. No existen copias semanticas del mismo hecho para Compliance, Risk, Dashboard u otros modulos.
3. Una integracion captura y normaliza hechos; NO define por si sola su significado GRC.
4. Un modulo funcional declara conceptos canonicos que consume; NO diseña estructuras ad-hoc de datos.
5. Nuevas normas y Regulatory Packs usan las mismas primitivas canónicas; NO crean motores paralelos de cálculo.
6. Los calculos oficiales son deterministas, reproducibles, versionados y explicables.
7. Dato faltante, dato vencido, error de integracion y valor real cero son estados diferentes.
8. Ningun resultado puede presentarse como valido si no satisface sus condiciones de cobertura, freshness y calidad.
9. IA puede explicar, resumir, correlacionar y recomendar; NO reemplaza hechos, metricas ni resultados oficiales.
10. Cambios de semantica requieren migracion explicita, versionada y con analisis de impacto.

## 4. Contrato minimo de todo dato

Todo dato u observacion utilizable por el dominio DEBE poder identificar, cuando aplique:

- tenant y alcance organizacional;
- fuente y conector;
- identificador externo estable;
- tipo de objeto observado;
- valor original y valor normalizado;
- timestamp de origen, ingesta y observacion;
- periodo de validez;
- freshness;
- calidad/confianza;
- lineage/provenance;
- version del mapping o transformacion;
- evidencia o referencia verificable asociada.

## 5. Contrato minimo de toda metrica

Toda metrica oficial DEBE definir:

- identificador y significado;
- unidad;
- inputs canonicos;
- poblacion, numerador y denominador cuando aplique;
- formula;
- version de formula;
- periodo;
- condiciones minimas de cobertura;
- freshness requerida;
- politica ante datos faltantes o invalidos;
- resultado calculado;
- Data Trust/quality asociado;
- lineage hasta los datos fuente.

## 6. Contrato minimo de toda regla

Toda regla DEBE declarar:

- objeto evaluado;
- metrica/observacion de entrada;
- operador y umbral/criterio;
- version;
- vigencia;
- resultado posible;
- tratamiento de unknown/insufficient data;
- Requirement, Control, Risk u otros objetos afectados;
- politica de severidad/prioridad cuando corresponda.

## 7. Explicabilidad obligatoria

Para cualquier resultado calculado TCDX GRC debe poder responder:

- Que resultado es?
- Con que formula y version se calculo?
- Que datos participaron?
- De que fuentes provinieron?
- A que periodo corresponden?
- Que freshness y calidad tenian?
- Que reglas se evaluaron?
- Que objetos GRC fueron afectados?
- Por que se presenta ese resultado al usuario?

## 8. Extensibilidad

El modelo debe aceptar nuevas fuentes, conectores, metricas, reglas, normas, controles, riesgos y dashboards sin reinterpretar silenciosamente datos historicos ni crear estructuras paralelas.

Una ampliacion solo es valida si:

- reutiliza conceptos canonicos existentes; o
- introduce una extension compatible y versionada del contrato.

Si cambia la semantica de un concepto existente, se trata como migracion contractual y debe evaluar BD, APIs, backend, frontend, IA, calculos, historicos, auditoria y trazabilidad.

## 9. Gate de desarrollo

NO debe considerarse definitiva la implementacion de Integration Hub, Data & Metrics, Rules/GRC Impact, dashboards ni consumidores equivalentes mientras este contrato no este reconciliado con Domain Model, Canonical Data Model, estados, RBAC y Traceability Matrix.

Ninguna funcionalidad puede aprobarse si introduce datos, metricas, calculos o resultados fuera del contrato canonico sin una extension contractual previa y versionada.
