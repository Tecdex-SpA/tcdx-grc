# 42 — Planes comerciales y roles base obligatorios

## 1. Separación contractual

`Plan/Entitlement` determina qué puede contratar un tenant. `Role/Permission/Scope` determina quién puede operar una capacidad habilitada. Ningún plan concede permisos y ningún rol habilita capacidades no contratadas.

## 2. Planes cerrados desde el inicio

Existen exactamente tres planes comerciales iniciales. Los nombres Foundation, Professional y Enterprise quedan retirados y no pueden aparecer en seeds, configuración, API, UI ni documentación comercial nueva.

| plan_code | nombre | propósito contractual |
|---|---|---|
| `ISO` | ISO | administrar de punta a punta el cumplimiento de normas ISO soportadas por TCDX |
| `ISO_RIESGO_OPERATIVO` | ISO + Riesgo Operativo | todas las capacidades de ISO más gestión integral de riesgo operativo |
| `GRC` | GRC | todas las capacidades funcionales de TCDX GRC |

### 2.1 Plan ISO

Incluye exclusivamente las capacidades necesarias para gestionar correctamente normas ISO:

- tenant, organización, identidad, RBAC, configuración y auditoría de plataforma;
- activación de Regulatory Packs cuyo `source_type=standard` y familia ISO esté habilitada;
- navegación por NormativeUnit, Requirements atómicos, applicability, assessments, GAP Analysis y Statement of Applicability cuando corresponda;
- controles de referencia, controles tenant, mappings, evaluaciones de control, assurance y pruebas;
- documentos, evidencia, solicitudes, revisiones y vigencia;
- Issues, no conformidades, hallazgos, acciones, verificación y mejora;
- auditorías internas y seguimiento;
- métricas, dashboards y reportes necesarios para cumplimiento ISO;
- notificaciones y exportaciones asociadas.

No incluye por defecto riesgo operativo independiente, pérdidas operacionales, Third-Party Risk, resiliencia, privacidad como dominio autónomo, Surveys, Integration Hub, Rules/GRC Impact general, Regulatory Intelligence, Report Studio avanzado ni IA. Una norma ISO puede referenciar riesgos o partes interesadas dentro de su assessment sin habilitar el módulo autónomo de Riesgo Operativo.

### 2.2 Plan ISO + Riesgo Operativo

Incluye todo el plan ISO y además:

- taxonomías y metodologías de riesgo operativo;
- riesgos inherentes y residuales;
- apetito, tolerancia, aceptación y tratamientos;
- KRI y monitoreo;
- incidentes operacionales, causas raíz, eventos de pérdida y recuperaciones;
- relaciones entre riesgos, controles, procesos, servicios, activos, issues y acciones;
- heatmaps, dashboards y reportes de riesgo operativo.

No incluye automáticamente las capacidades exclusivas del plan GRC.

### 2.3 Plan GRC

Incluye todas las capacidades de ISO + Riesgo Operativo y, adicionalmente, todos los dominios y experiencias definidos en 01: packs regulatorios ISO, legales, contractuales y sectoriales; Integration Hub; Data & Trust; Rules & Impact; Third Parties; Resilience; Privacy; Surveys; Report Studio; Knowledge & Regulatory Intelligence; IA y automatización gobernada.

### 2.4 Capability groups normativos

El seed inicial debe publicar exactamente los siguientes grupos de capabilities:

| capability_group | ISO | ISO_RIESGO_OPERATIVO | GRC |
|---|---:|---:|---:|
| `CORE_PLATFORM` | sí | sí | sí |
| `ISO_COMPLIANCE` | sí | sí | sí |
| `CONTROLS_ASSURANCE` | sí | sí | sí |
| `EVIDENCE_DOCUMENTS` | sí | sí | sí |
| `ISSUES_ACTIONS` | sí | sí | sí |
| `AUDIT` | sí | sí | sí |
| `ISO_REPORTING` | sí | sí | sí |
| `OPERATIONAL_RISK` | no | sí | sí |
| `INCIDENTS_LOSS` | no | sí | sí |
| `INTEGRATION_HUB` | no | no | sí |
| `DATA_TRUST` | no | no | sí |
| `RULES_IMPACT` | no | no | sí |
| `THIRD_PARTIES` | no | no | sí |
| `RESILIENCE` | no | no | sí |
| `PRIVACY` | no | no | sí |
| `SURVEYS` | no | no | sí |
| `REPORT_STUDIO` | no | no | sí |
| `REGULATORY_INTELLIGENCE` | no | no | sí |
| `AI_ASSISTANCE` | no | no | sí |
| `GOVERNED_AUTOMATION` | no | no | sí |

Las capabilities atómicas y sus códigos definitivos se congelan en `EXECUTABLE_CONTRACTS`; deben ser una descomposición exacta de esta matriz y no pueden ampliar silenciosamente un plan. Codex no puede agregar, renombrar, dividir ni fusionar un capability group. Una necesidad de cambio vuelve a decisión rectora.

Los límites cuantitativos (usuarios, almacenamiento, ejecuciones, packs, conectores, retención) viven en `PlanVersion` y `UsageLimit`, nunca en código. El baseline crea una versión inicial por plan; todo cambio comercial crea nueva `PlanVersion` y no altera contratos existentes.

Los tres planes comparten un único modelo de datos. Las capacidades no contratadas quedan inaccesibles por Entitlement y ocultas en UI; no se eliminan tablas ni se crean schemas por plan.

## 3. Roles canónicos cerrados

Roles de plataforma: `Platform Admin`, `Platform Support`.

Roles tenant: `Tenant Admin`, `Executive/Board Viewer`, `GRC Manager`, `Quality Manager`, `Compliance Manager`, `Risk Manager`, `CISO/Security Manager`, `AI Governance Manager`, `Privacy Manager`, `Legal Reviewer`, `Auditor Lead`, `Auditor`, `Process Owner`, `Control Owner`, `Evidence Owner`, `Action Owner`, `Supplier Manager`, `Continuity Manager`, `Regulatory Content Steward`, `Data Admin`, `Report Viewer`, `Viewer`.

Todo tenant obtiene al crearse los roles tenant como definiciones inmutables de baseline; puede crear roles personalizados mediante composición de permissions, sin editar ni borrar los roles base.

## 4. Responsabilidad mínima

| rol | responsabilidad primaria |
|---|---|
| Platform Admin | operación global, planes, capabilities y soporte controlado |
| Platform Support | diagnóstico tenant sin privilegio administrativo implícito |
| Tenant Admin | memberships, asignación de roles y configuración tenant |
| Executive/Board Viewer | lectura ejecutiva aprobada |
| GRC Manager | gobierno transversal y publicación de configuraciones/metodologías autorizadas |
| Quality Manager | ISO 9001, QMS, no conformidades y mejora |
| Compliance Manager | applicability, assessments, gaps y cumplimiento |
| Risk Manager | metodología, riesgos, apetito, tolerancia y tratamientos |
| CISO/Security Manager | seguridad e ISO/IEC 27001 |
| AI Governance Manager | sistema de gestión de IA e ISO/IEC 42001 |
| Privacy Manager | privacidad, tratamientos, derechos y brechas |
| Legal Reviewer | interpretación y aprobación jurídica; no administra plataforma |
| Auditor Lead | programa, alcance, equipo y emisión de auditorías |
| Auditor | ejecución independiente dentro del engagement |
| Process Owner | responsabilidad de proceso y sus objetos scoped |
| Control Owner | diseño, operación y mantenimiento de controles asignados |
| Evidence Owner | entrega y mantenimiento de evidencia; no autoaprueba |
| Action Owner | ejecución de acciones; no autoverifica |
| Supplier Manager | ciclo de terceros y proveedores |
| Continuity Manager | BIA, continuidad, ejercicios y recovery |
| Regulatory Content Steward | importación y mantenimiento editorial de packs |
| Data Admin | integraciones, mappings, calidad y lineage |
| Report Viewer / Viewer | lectura acotada por scope |

## 5. Segregación obligatoria

- Autor de un pack ≠ aprobador único del pack.
- Action Owner ≠ Action Verifier en cierre de alto riesgo.
- Evidence Owner ≠ Evidence Approver para evidencia crítica.
- Auditor no administra el objeto auditado.
- Platform Support usa sesión de soporte temporal, justificada y auditada.
- Legal Reviewer aprueba interpretación jurídica, no resultados técnicos.

La matriz permission/scope definitiva continúa en 22 y debe incorporar estos roles antes del `PHYSICAL_DATA_MODEL_REVIEW`.
