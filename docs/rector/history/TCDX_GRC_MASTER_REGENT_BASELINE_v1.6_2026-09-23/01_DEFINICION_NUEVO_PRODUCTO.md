# TCDX GRC — Definición del nuevo producto

## Definición

TCDX GRC es una plataforma SaaS multi-tenant para gobierno, riesgo, cumplimiento, controles, assurance y operación GRC, diseñada para convertir información real de la organización en decisiones, acciones y evidencia verificable.

Cadena funcional rectora:

```text
Datos y operación real
→ validación y confianza
→ observaciones
→ métricas
→ cumplimiento / controles / riesgos
→ impacto
→ prioridad
→ issue / brecha
→ acción
→ evidencia
→ verificación
→ mejora demostrable
```

La plataforma debe responder: cuál es el estado real, qué cambió, por qué, qué impacto tiene, qué debe hacerse, quién es responsable y cómo se demuestra la resolución.

## Dominios del producto completo

### Plataforma SaaS y administración
Tenants, organizaciones, unidades, usuarios, equipos, roles, permisos, capabilities, planes, entitlements, límites, configuración, onboarding y auditoría administrativa.

Los planes comerciales iniciales son `ISO`, `ISO_RIESGO_OPERATIVO` y `GRC`; los roles canónicos se provisionan desde el onboarding conforme a 42. No existen los planes Foundation, Professional ni Enterprise.

### Organización, procesos, servicios y activos
Estructura organizacional, procesos, subprocesos, servicios, activos, sistemas, aplicaciones, información, ubicaciones, owners y dependencias.

### Governance & Compliance
Frameworks, versiones, Regulatory Packs, unidades normativas jerárquicas, requisitos atómicos evaluables, applicability, evaluaciones, GAP Analysis, planes de adecuación, SoA, cross-mapping, histórico y snapshots. Cláusula, requisito, control y brecha son conceptos distintos conforme a 44.

El baseline obligatorio incluye ISO 9001:2015, ISO 9001:2026, ISO/IEC 27001:2022, ISO/IEC 42001:2023 y Ley chilena 21.719 bajo las reglas de 41.

### Controls & Assurance
Catálogo de controles globales de referencia, controles base TCDX y controles tenant; objetivos, owners, diseño, implementación, operación, evidencia, frecuencia, efectividad, pruebas, excepciones y re-tests. Un control de referencia no implica implementación por el tenant.

### Evidencias y documentos
Documentos y versiones; evidencias, solicitudes, revisión, aprobación/rechazo, vigencia, expiración, reemplazo, workflows y relaciones gobernadas.

### Risk Management
Taxonomías, metodologías, causas, amenazas, vulnerabilidades, eventos, consecuencias, riesgo inherente, controles, residual, apetito, tolerancia, KRI, tratamientos, heatmaps y revisiones.

### Riesgo operacional y pérdidas
Eventos de pérdida, frecuencia, severidad, pérdida bruta, recuperación, pérdida neta, expected loss y relación con riesgos, controles, incidentes y acciones.

### Issues & Remediation
Modelo transversal `Issue` para Finding, Non-Conformity, Gap, Exception y Audit/Assessment Observation. La `Observation` canónica de datos es un concepto distinto y nunca se usa como sinónimo de hallazgo.

### Actions
Motor único de acciones con origen, owner, prioridad, vencimiento, estado, progreso, evidencia, aprobación, verificación, efectividad, escalamiento y trazabilidad bidireccional.

### Audit & Assurance
Universo auditable, programa anual, auditorías, alcance, equipo, criterios, workpapers, muestras, pruebas, evidencia, hallazgos, NC, acciones, re-test, conclusión, informe y seguimiento.

### Incidentes
Clasificación, severidad, procesos/activos/servicios afectados, causa raíz, impacto, riesgos, controles, pérdidas, evidencia, respuesta y acciones.

### Third-Party Risk Management
Proveedores, servicios, criticidad, contratos, evaluaciones, cuestionarios, riesgos, controles, evidencia, incidentes, findings y acciones.

### Operational Resilience
BIA, MTPD, RTO, RPO, dependencias, planes de continuidad, crisis, ejercicios y recovery tests.

### Privacy & Data Protection
Actividades de tratamiento, datos, titulares, finalidades, bases jurídicas, encargados, terceros, transferencias, retención, medidas, riesgos, incidentes, evaluaciones y evidencia. El modelo debe permitir operacionalizar marcos regulatorios como Ley 21.719.

### Surveys & Assessments
Encuestas, cuestionarios versionados, campañas, poblaciones, branching, respuestas, scoring, evidencia y efectos GRC.

### Data, Metrics & BI
Catálogo de datos y métricas, KPI/KRI/KCI/KQI, Data Trust, freshness, lineage, snapshots, comparativas, dashboards, drill-down e Impact Graph.

### Report Studio
Word, Excel y PDF; templates, variables, tablas, gráficos, snapshots, versionado, aprobación y programación.

### Integration Hub
Conectores, credenciales seguras, discovery, sync incremental, normalización, observaciones, mappings, reglas, impactos, health y Mapping Studio.

### Knowledge & Regulatory Intelligence
Conocimiento global, regulatorio y privado por tenant; fuentes oficiales, versionado, cambios regulatorios, diff, revisión humana, publicación e impacto.

### AI / Senior Auditor
Explicación, resumen, recomendaciones, análisis documental, consulta contextual, borradores, asistencia de auditoría e investigación controlada. IA con provenance y autorización; nunca autoridad oficial.

## Experiencias principales

- Centro Ejecutivo GRC
- Centro Operativo GRC
- Risk 360
- Control 360
- Compliance 360
- Data & Trust Center
- Audit Workspace
- Action Workspace
- Evidence Workspace
- Administration Center

## Producto terminado

Una capacidad no se considera terminada porque exista una pantalla. Debe poseer contrato funcional, modelo canónico, persistencia, autorización, API, UI cuando corresponda, auditabilidad, manejo de errores, pruebas y evidencia runtime.

## Addendum - Producto basado en hechos trazables

TCDX GRC transforma informacion real y declarativa en resultados GRC explicables mediante una cadena canonica de ingesta, normalizacion, observacion, medicion, reglas, impacto, remediacion, evidencia, verificacion y reporting. El producto no se limita a registrar cumplimiento: debe poder explicar el origen y calculo de cada resultado relevante. Aplican obligatoriamente los contratos 14 y 15 de esta base.
