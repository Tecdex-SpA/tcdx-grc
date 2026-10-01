# 15 - MODULOS CONSUMIDORES Y MATRIZ DE INFORMACION

## 1. Objetivo

Definir que modulos consumen informacion, que informacion consumen, para que la utilizan y por que es necesaria. Este documento evita que cada modulo cree su propio modelo de datos o una interpretacion incompatible del mismo hecho.

## 2. Categorias canonicas de informacion

### A. Contexto organizacional
Organizacion, unidades, procesos, servicios, activos, sistemas, personas/roles, ubicaciones, proveedores, dependencias y criticidad.

### B. Obligaciones
Normas, leyes, frameworks, NormativeUnit jerárquicas, Requirements atómicos, políticas, obligaciones contractuales, applicability y criterios de cumplimiento.

### C. Controles
Control, objetivo, owner, alcance, frecuencia, implementacion, testing y efectividad.

### D. Observaciones reales
Configuraciones, eventos, vulnerabilidades, estados de identidades, tickets, backups, deployments, disponibilidad, logs e incidentes observados. Findings/NC/Gap pertenecen a Desviaciones (`Issue`), no a `Observation` canónica.

### E. Mediciones
Valor, unidad, periodo, poblacion, numerador, denominador, timestamp, formula, version, cobertura y Data Trust.

### F. Evidencia
Documentos, registros, resultados tecnicos, tests, aprobaciones, archivos y referencias verificables.

### G. Riesgo
Escenario, amenaza, vulnerabilidad, activo/proceso, probabilidad, impacto, controles, riesgo inherente y residual.

### H. Desviaciones
Gap, finding, no conformidad, regla incumplida, control degradado y metrica fuera de tolerancia.

### I. Remediacion
Issue, Action, owner, prioridad, fechas, tratamiento, progreso, evidencia de cierre y verificacion.

### J. Resultados
Compliance, risk, control effectiveness, KPI/KRI/KCI/KQI, readiness, Data Trust, tendencias, findings, acciones y agregaciones autorizadas.

## 3. Modulos consumidores

| Modulo | Informacion consumida | Para que | Por que |
|---|---|---|---|
| Organization / Asset & Service Context | unidades, procesos, servicios, activos, sistemas, owners, ubicaciones, dependencias, criticidad | construir contexto y alcance | ningun riesgo/control/incidente es interpretable sin contexto de negocio |
| Regulatory & Compliance | NormativeUnit, Requirements, applicability, mappings, controles, evidencias, evaluaciones, métricas, findings | navegar la fuente y determinar estado, GAP, readiness y cumplimiento por Requirement | responde dónde se exige, qué aplica y qué se demuestra |
| Controls & Assurance | controles, owners, frecuencia, observaciones, metricas, evidencia, tests | evaluar diseno, implementacion y efectividad | un control documentado no demuestra funcionamiento |
| Evidence & Documents | politicas, procedimientos, logs, certificados, reportes, archivos, versiones, aprobaciones | sustentar afirmaciones y verificaciones | transforma declaraciones en evidencia demostrable |
| Risk Management | contexto, amenazas, vulnerabilidades, incidentes, metricas, controles, efectividad, impacto/probabilidad, perdidas | evaluar riesgo inherente/residual y tratamiento | representa exposicion real y prioriza decisiones |
| Issues / Findings / Gaps | reglas fallidas, gaps, findings, controles degradados, incidentes | formalizar desviaciones | separa deteccion de remediacion |
| Actions & Remediation | issues, owners, prioridad, fechas, progreso, evidencias, verificacion | gestionar correccion y cierre | GRC debe producir mejora verificable |
| Audit & Assurance | universo auditable, riesgos, controles, requisitos, evidencia, historicos, muestras | planificar y ejecutar auditorias | verifica independientemente los hechos declarados |
| Incidents & Loss | eventos, causa, servicio/activo, severidad, duracion, perdidas, recuperacion | alimentar riesgo, KRI, controles y tendencias | contrasta el modelo con eventos reales |
| Operational Resilience | servicios/procesos criticos, dependencias, BIA, RTO/RPO/MTPD, incidentes, ejercicios | evaluar continuidad y recuperacion | mide capacidad de mantener/restaurar operacion critica |
| Third Parties | proveedores, servicios, criticidad, contratos, SLA, cuestionarios, evidencia, incidentes, riesgos | evaluar y monitorear terceros | parte de la exposicion existe fuera del tenant |
| Privacy | tratamientos, datos, titulares, finalidades, sistemas, terceros, incidentes, controles | evaluar privacidad y obligaciones | relaciona tratamiento real con obligaciones y riesgos |
| Surveys & Assessments | preguntas, respuestas, evidencias, responsables, fechas | capturar informacion humana/declarativa | existen controles no observables automaticamente |
| Integration Hub | registros externos en bruto | autenticar, extraer, conservar, normalizar, validar y mapear | desacopla fuentes externas del dominio GRC |
| Data & Metrics | observaciones normalizadas, valores, timestamps, fuentes, calidad, formulas | producir mediciones oficiales y Data Trust | crea una capa cuantitativa comun |
| Rules / GRC Impact | metricas, observaciones, umbrales, mappings | producir pass/fail/unknown, impacto y prioridad | convierte datos en significado GRC |
| Reporting / BI | resultados consolidados y snapshots | dashboards, informes, tendencias, comparativas | presenta informacion para decision |
| Knowledge & Regulatory Intelligence | normas, unidades normativas, requisitos, mappings y versiones autorizadas | contextualizar estructura y obligaciones | separa conocimiento normativo de hechos operacionales |
| AI Assistance | contexto GRC autorizado, evidencia, metricas, conocimiento y provenance | explicar, resumir, correlacionar y recomendar | agrega asistencia sin autoridad sobre hechos oficiales |

## 4. Patron obligatorio de consumo externo

Los modulos de dominio NO consumen directamente APIs externas para producir hechos oficiales.

Patron:

`External Source -> Integration Hub -> Raw Record -> Normalized Observation -> Canonical Data/Metric -> Rule/Mapping -> Domain Consumer -> Reporting`

Ejemplos prohibidos:

- Compliance consultando directamente Microsoft 365.
- Risk consultando directamente AWS para calcular riesgo oficial.
- Dashboard consultando Jira como fuente paralela.
- IA consultando una fuente externa y escribiendo un resultado oficial sin pasar por el contrato canonico.

## 5. Un hecho, multiples consumidores

Ejemplo:

`Microsoft 365 -> User X -> MFA disabled`

Se conserva una sola observacion canonica. A partir de ella pueden derivarse:

- Metric: cobertura MFA.
- Rule: cobertura minima o MFA obligatorio.
- Control impact: control de autenticacion degradado.
- Compliance impact: Requirements relacionados afectados.
- Risk impact: exposicion asociada modificada.
- Issue: desviacion si la politica lo determina.
- Reporting: indicador actualizado.
- AI: explicacion/recomendacion, sin alterar el hecho.

Nunca deben existir copias independientes del mismo hecho para cada consumidor.

## 6. Responsabilidad por capa

- **Sources:** informan que ocurrio.
- **Integration Hub:** captura y representa el hecho de forma canonica.
- **Data & Metrics:** define que se mide y calcula mediciones oficiales.
- **Rules / GRC Impact:** determina el significado contractual del resultado.
- **Domain modules:** aplican ese impacto dentro de su autoridad.
- **Reporting:** presenta resultados y permite drill-down.
- **AI:** ayuda a entender y actuar, sin sustituir autoridades.

## 7. Contrato Input -> Processing -> Output

Todo modulo consumidor debe documentar antes de implementarse:

1. Inputs canonicos aceptados.
2. Preconditions y tenant scope.
3. Validaciones de calidad/freshness.
4. Transformaciones o calculos autorizados.
5. Objetos que puede escribir segun Domain Model.
6. Outputs canonicos.
7. Eventos/auditoria generados.
8. Efectos sobre otros modulos mediante contratos, no escritura cruzada.
9. Comportamiento ante datos faltantes, vencidos o invalidos.
10. Drill-down/lineage requerido.

## 8. Matriz obligatoria para cada conector

Antes de implementar un conector real debe existir una matriz:

`External object/field -> Raw representation -> Canonical observation/entity -> Metric -> Rule -> GRC impact -> Consumers -> Evidence/lineage`

No se aprueba un conector si no puede demostrar esta trazabilidad.

## 9. Fuentes/conectores

Las fuentes concretas y su priorizacion deben mantenerse conforme a la definicion vigente del Integration Hub en la base de conocimiento. Este documento NO inventa como contrato nuevos conectores ni objetos de API que no esten definidos en las fuentes.

Para cada conector aprobado posteriormente debe definirse expresamente que objetos y campos se extraen, con que frecuencia, como se identifican incrementalmente, como se normalizan y que consumidores canonicos pueden utilizarlos.
