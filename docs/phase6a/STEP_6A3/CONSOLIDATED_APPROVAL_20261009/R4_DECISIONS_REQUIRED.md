# Inputs canónicos y decisión agrupada R4

Estado: PREPARED_INPUT_REQUEST_AND_DRAFT_NOT_APPROVED. Autoridad: rector45 §§3–5 y rector49 §3; C16 exige aprobación posterior a hashes de todo nuevo delta material. Una sola persona puede ejercer las funciones competentes. R1/R2/R3 y activación v1.8 no se someten nuevamente a aprobación.

## CFG D Compliance Controls y publicación

Cláusulas CFG-D-COMPLIANCE-V1, CFG-D-CONTROLS-V1 y CFG-D-PUBLICATION. Las fórmulas, factor parcial 0.50, peso baseline 1 y coverage 80 ya son oficiales (rector17 §§3.1–3.4; rector19 §§2–3). No se pide volver a aprobarlas.

Entrada necesaria del PO Methodology/Compliance/Architecture: rutas/versiones efectivas de fuentes publicadas y relaciones canónicas que vinculan cada baseline v1 a aplicabilidad, pesos del Pack, evidencia válida/suficiente, recencia, inputs blocking, SourceResolution/conflicto, confianza y agregación reproducible. Para cada input: identidad/versionado, alcance, fuente, vigencia y vínculo al cálculo. No se ingiere el ZIP reservado para obtener esos datos.

Opciones sin adopción por Codex: demostrar esos bindings existentes; publicar un delta canónico de metodología cuando no existan; conservar el modo vigente mientras no haya suficiencia. Consecuencias: none sólo es publicable después de prueba positiva/negativa reproducible y vínculo inmutable de declaración a versión/formula/sourceHash/vigencia. Una aprobación genérica no cierra las tres cláusulas. Fuentes: RESIDUAL_MACRO_R2/04_CFGD_CORRECTED_SUFFICIENCY_REVIEW.md; contrato27; rector29/35/37/38. No se redactan reglas inventadas para firma ni se altera v1.

## CT04 contexto jurídico

Cláusula C-04W. PO Privacy/Legal + Architecture/Data Model debe identificar el contrato de servicio real y su versión/cláusulas, separadamente de la política tenant; fuente de obligación, clasificación, jurisdicción, vigencia, prioridad y legal hold, además de entidad/contexto y relación tipada autorizada hacia FileUploadIntent/FileObject/Evidence.

Opciones sin adopción: reutilizar PrivacyProcessingActivity sólo con relación/semántica expresamente aprobadas; delta canónico distinto con autoridad explícita; mantener aplicación nueva bloqueada hasta disponer de fuente. Igualdad policy_id, Source opcional y FK obligatoria no prueban aplicabilidad. Continuidad PENDIENTE sin política sólo en operaciones cuyo contrato lo permita; el modelo actual exige retention_policy_id para persistir esos objetos. No se elimina FK ni se añade DENY universal a flujos históricos. Fuente: RESIDUAL_MACRO_R2/05_RETENTION_TYPED_BINDING_FINDING.md y rector23 §§6–8.

## Propuesta exacta de contexto IANA

DRAFT para decisión PO Architecture/API/UX; no es contrato publicado. Se propone ampliar el DTO existente, evitando nueva ruta, permiso o columna. Texto adoptable:

> Apruebo para STEP 6A.3 añadir default_timezone, string obligatorio de longitud 1 a 64 y validado como identificador IANA, a CurrentPrincipalTenantPermissions de CurrentPrincipalAuthorization. Su valor proviene exclusivamente de platform.tenants.default_timezone del tenant seleccionado mediante x-tcdx-tenant-id, leído en la misma transacción read-only repeatable-read que valida la membresía humana propia activa y tenant activo. Sin tenant seleccionado, tenant_permissions permanece null. Se preservan errores y autorización actuales: header inválido 400, autenticación 401, principal no humano o membresía/tenant inactivos 403, contexto ajeno o inexistente 404, dependencia o dato temporal persistido inválido 503. No se concede Tenant.read, no se exponen datos adicionales de empresa o persona y Platform Admin/Support no adquiere acceso tenant sin vínculo autorizado por contrato. El dato es presentación efímera; no es fuente de autorización. Al cambiar tenant o perder contexto se invalida el dato anterior; no se convierte una fecha con zona de navegador, host, locale o default supuesto. Backend y API conservan UTC Z; la UI usa la zona persistida validada. Se rechazan entradas locales inexistentes o ambiguas por DST hasta que el usuario pueda expresar un instante inequívoco conforme al contrato temporal; no se elige un offset automáticamente. No se cambia esquema, grants, auditoría de comandos, metodología ni GET EC R1. Publicación e implementación sólo después del manifiesto de este texto aprobado por el PO y de las pruebas aplicables.

Alternativa material: proyección distinta dentro del contexto canónico propio, que exigiría texto exacto de API y autorización antes de implementación. Ninguna alternativa queda elegida por esta preparación. Riesgo de la propuesta: ampliación del DTO cerrado y coherencia temporal al cambiar tenant; mitigación prevista: schema cerrado, misma transacción, invalidación por contexto, negativos cross-tenant/revocación y pruebas DST con varias zonas. Persistencia existente: Physical01:33; DTO OpenAPI02:5262; backend frontend-projections.ts:79–92; validación tenantCreate platform-iam-service.ts:593–613. Tests a ejecutar después de aprobar: HTTP/schema/PG/context-switch/DST y regresión integral/typecheck/lint/build/visual checks si cambia UI. Hoy NOT_RUN.

## RLS y aceptación externa

RLS=NOT_IMPLEMENTED. Rector26 §1 exige RLS para tablas críticas cuando sea operacionalmente viable; no prescribe RLS universal ni concede dispensa automática. PO Security/DBA/Architecture debe cerrar evaluación de tablas críticas y viabilidad con fuente y evidencia. Aislamiento por FKs, tenant context, servicio/repositorio y negativos existe en evidencia R3; no equivale a RLS físico ni cierre comercial de defensa en profundidad. No se introduce RLS por suposición.

C-07/CFG-UQ1/CFG-UQ2/CFG-DEFAULT necesitan autorización operacional exacta; C-08/CFG-QA/VOC-C04/VOC-QA necesitan inventario/aceptación reales. Reutilizar QA_OPERATIONAL_PLAN_R3.json: actor ServicePrincipal real existente PLATFORM_CONTROL, identidad DBA, cuentas/membresías/entitlements de QA, backups y restore demostrado, ventana, runner canónico 33/34 y hashes finales. No solicitar secretos. Autorizar lectura de inventario y mutaciones por actos separados según plan; HUMAN_UI_REVIEW requiere acto humano real. No hay ejecución externa autorizada.

## Punto de decisión

Este documento concentra los inputs y la propuesta IANA; no contiene firmas ni aprobación atribuida al PO. El manifiesto R4_DECISION_MANIFEST.json sella sus bytes y la matriz residual. El siguiente acto útil es identificar las fuentes/bindings CFG-D y CT04 y decidir el texto IANA. Con reglas metodológicas completas se preparará el único documento Word de adopción previsto por C04/H06, sin duplicar cuestionarios ni publicar reglas todavía ausentes. SOG v2 y STEP 6A.4 siguen reservados.
