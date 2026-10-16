# 27 - Contrato de resultados, reporting, UX y drill-down

## 1. Principio

Toda cifra oficial visible debe tener una ruta de explicación. UI no calcula verdad oficial por su cuenta.

## 2. Result View Model

Todo resultado presentado expone conforme a 38:

- code/name;
- result_status;
- domain_conclusion cuando aplique;
- value/unit cuando `result_status=valid` o preview explícitamente permitido;
- period;
- freshness;
- Data Trust;
- methodology/formula version;
- snapshot id;
- blockers/warnings;
- last_calculated_at;
- permissions-aware drill-down links.

## 3. Drill-down mínimo

`Executive Result Envelope -> Domain -> Object -> Metric -> Rule Evaluation -> Observation/SourceResolution -> Source/Raw provenance`

El usuario sólo ve nodos autorizados; la explicación debe indicar cuando parte del lineage está oculto por permisos.

## 4. Estados de UI

Distinguir siempre:

- 0 real;
- no_data;
- insufficient_data;
- stale_source;
- conflicting_sources;
- source_error;
- calculation_error;
- not_applicable;
- permission_limited.

No usar guión/0 genérico para todos.

## 5. Dashboards

Dashboards consumen snapshots/measurements oficiales y pueden filtrar/agrupar, pero no alterar fórmula.

## 6. Reportes

PDF/DOCX/XLSX son artefactos versionados ligados a snapshots. Report aprobado no cambia al recalcular datos posteriores.

## 7. Executive vs operational

Executive resume exposición, tendencia, blockers y decisiones. Operational muestra objetos accionables, owners, due dates, evidence y lineage.

## 8. Comparaciones

Comparar sólo misma métrica y versión/metodología compatible. Si cambia versión, UI marca break-in-series o normalización explícita.
