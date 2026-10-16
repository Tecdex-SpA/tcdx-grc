# DR-GRC-20261016-001/002 — Decisiones del Product Owner para sucesora rectora

**Fecha:** 2026-10-16  
**Estado:** DECISION_PO_EXPRESA / PROPUESTA_DE_INCORPORACION_RECTORA; NO_ACTIVA_POR_ESTE_ARCHIVO  
**Predecesora:** TCDX_GRC_MASTER_REGENT_BASELINE_v1.11_2026-10-15  
**Origen:** instrucciones expresas del Product Owner, 2026-10-16.  
**Alcance:** corrección de gobernanza y requisitos existentes; no autoriza ampliación funcional, migración, despliegue ni cierre de STEP_6A3.

## DR-GRC-20261016-001 — Incorporación asistida y simplificación comercial

1. Hasta completar la Fase 10, **Platform Admin** crea la empresa cliente (tenant), habilita funcionalidades, módulos y normas conforme a la oferta y al catálogo comercial autorizado, y crea/incorpora el primer **Tenant Admin** mediante los mecanismos IAM y RBAC existentes.
2. **Tenant Admin** administra usuarios internos y sus roles dentro de su autoridad y del tenant. **Platform Admin** puede efectuar esas operaciones cuando esté expresamente autorizado por permisos efectivos, con auditoría y sin eludir aislamiento multi-tenant.
3. La autoatención, contratación autoservida y creación autónoma de empresas por clientes **quedan fuera del alcance de las Fases 1–10**. Su eventual diseño se evaluará después de la Fase 10; no se implementarán anticipadamente.
4. La configuración ordinaria de SaaS y la operación GRC se distinguen de la **acreditación jurídica formal**. No se exigirá universalmente una fuente jurídica auténtica ni revisión independiente para la mera configuración operativa. Los flujos de acreditación conservan fuentes, controles y revisiones cuando correspondan.
5. La **opción comercial propuesta** de retención operativa es 12 meses por defecto, con alternativas 18/24/36/48/60 meses. **No reemplaza ni reduce** por sí misma las retenciones canónicas por categoría (por ejemplo AuditEvent, evidencias aprobadas, snapshots, logs), obligaciones regulatorias/contractuales aplicables, legal holds o prohibiciones de purge. Antes de cualquier implementación, reconciliar explícitamente estas semánticas con el documento 23 y contratos existentes. No afirmar que las opciones están ya implementadas.
6. No crear nuevas tablas, módulos, autoridades ni estados para materializar esta decisión salvo que una modificación específica de arquitectura sea aprobada expresamente y resulte indispensable.

## DR-GRC-20261016-002 — Autoridad del Product Owner y proporcionalidad de bloqueos

1. El Product Owner decide alcance funcional, prioridades, comportamiento comercial y evolución del producto. Las contradicciones con directivas **internas anteriores** se tratarán como solicitudes de reconciliación de la autoridad rectora, no como veto permanente a la decisión.
2. Codex debe identificar la cláusula contradictoria, preparar el delta mínimo y sus verificaciones y solicitar sólo la aprobación concreta indispensable para publicarlo. No puede reinterpretar unilateralmente la baseline activa ni declarar una propuesta vigente.
3. Los procedimientos contractuales internos, duplicaciones de firmas y asignaciones administrativas no bloquearán indefinidamente decisiones expresas del PO. Se mantiene el control de bytes/manifiestos, integridad, trazabilidad y revisión técnica exigible para cambios materiales.
4. Se preservan el modelo canónico de datos y su arquitectura física aprobada, integridad transaccional, separación Platform/Tenant, IAM/RBAC, mínimo privilegio, auditoría, evidencias históricas, privacidad, seguridad, SoD operacional y obligaciones legales/contractuales externas efectivamente aplicables.
5. Un impedimento técnico, legal o de seguridad **concreto** debe documentarse con objeto afectado, fuente, consecuencia y alternativa compatible. No inventar revisores, fuentes ni aprobaciones. No eludir un control externo obligatorio mediante esta decisión.
6. La gobernanza editorial interna se interpretará conforme al documento 49: el PO puede acumular funciones internas autorizadas sin fingir independencia humana. La aprobación funcional no equivale a firma de bytes futuros no presentados.

## Instrucción de reconciliación para la baseline sucesora

- Revisar **como mínimo** los documentos 01, 23, 42, 43, 46, 47 y 49, así como los contratos IAM/RBAC, retención, habilitación comercial y UX aplicables; modificar únicamente los afectados.
- Preservar la baseline v1.11 y toda su historia sin alteración retroactiva.
- Preparar candidato completo de sucesora con delta, manifiesto SHA-256, verificador, compatibilidad física/ejecutable y propuesta de criterios STEP_6A3; distinguir claramente lo vigente de lo propuesto.
- Mantener `STEP_6A3=PARTIAL_BLOCKED` y `STEP_6A4=NOT_STARTED`. Suspender la exigencia de completar H01–H10 **como tarea actual de desarrollo**, sin declarar su cierre ni su inaplicabilidad retroactiva; evaluar su pertinencia en la sucesora.
- No hacer cambios de runtime, DDL, QA/PROD, merge ni activación de baseline como efecto de este registro.
- El presente archivo **registra la decisión de producto y encarga su incorporación**. No modifica por sí mismo `BASELINE_ID`, `ACTIVE_ACTIVATION.json`, `RECTOR_MANIFEST.sha256` ni los documentos de la baseline activa.

## Criterio de aceptación de la reconciliación

La sucesora deberá permitir implementar las decisiones comerciales expresas sin imponer validación jurídica a operaciones ordinarias, manteniendo invariantes técnicos y obligaciones superiores reales. Todo bloqueo residual debe ser específico y resoluble; ningún agente puede declarar por sí solo la sucesora activada.
