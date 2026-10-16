# STEP_6A3 — paquete único de aprobación de gobernanza comercial

**Documento propuesto para decisión humana conjunta; no aprobado, no activo.**

ID del paquete: **GP-STEP6A3-COMMERCIAL-20261013-01**. Enmienda fuente: **COMMERCIAL_PACK_FAMILY_20261013**. Rector activo: **TCDX_GRC_MASTER_REGENT_BASELINE_v1.8_2026-10-09**. CODEX_VARIATION_BUDGET=ZERO. Dominio público único: **https://grc.tecdex.net/**.

RECTOR_GATE=BLOCKED para activación y cierre; STEP_6A3=PARTIAL_BLOCKED; STEP_6A4=NOT_STARTED. Son los estados leídos, **no estados modificados por este documento**. Preparación documental autorizada por el mandato actual. TASK_PACKET_STATUS=COMPLETE_FOR_DOCUMENTARY_REVIEW; no autorización de implementación.

## 1. Alcance de la firma solicitada

La autoridad puede aprobar o rechazar en una respuesta el **diseño comercial C-01..C-12** y las **disposiciones H-01..H-12** relativas a las doce cláusulas heredadas. Este paquete identifica cambios concretos respecto al DRAFT y conserva los artefactos ya firmados. No solicita nuevamente aprobar la intención funcional ni repetir pruebas verdes.

Una firma acepta decisiones de diseño y disposiciones de gobierno; no certifica fuentes legales, autosuficiencia metodológica, datos comerciales, compatibilidad histórica externa o runtime que no están demostrados. Esas dependencias permanecen explícitas. No puede aprobarse hoy un DDL/OpenAPI/manifest futuro cuyo contenido y hash aún no fueron presentados. La firma exacta de **este texto** no otorga permiso para ejecutar esos artefactos ni altera sus gates.

Rector45§6: «Sin identidad del aprobador, rol ejercido, fecha y evidencia, el estado permanece PENDING_REVIEW aunque las pruebas estén verdes». Rector49§3: «Si sus hashes aún no fueron presentados y aprobados, la autorización funcional general no los publica». Se permite una sola persona acumulando las funciones expresamente declaradas; no se inventa segunda firma. Permanecen SoD operacional, revisión regulatoria de packs y obligaciones superiores49§§4–5.

El archivo DRAFT leído íntegramente y preservado tiene SHA-256 **4f0b9bf2ea346b26d65f79df7daa6165d25785a917dfea52a2d4d9d1b627c068**. Este paquete **no aprueba literalmente ese borrador sin correcciones**. Propone sustituir exclusivamente sus elecciones enumeradas en §5 si el humano firma. Hasta entonces prevalecen los contratos activos; ambos documentos son propuestas.

## 2. Continuidad y clases de decisión

Rama local: fix/qa-functional-commercial-onboarding-20261013. HEAD: 23c7b50468213b8c0769ca2607349e04f4c32eae. Se preservaron todos los cambios y archivos heredados del rescate; únicamente se crea este informe. No se consultó remoto/QA ni PostgreSQL local durante esta preparación.

**A — ya aprobado, por alcance:**

| ID | Decisión y fuente de autoridad | Límite de la aprobación |
| --- | --- | --- |
| A-01 | Rector42: tres planes ISO/ISO_RIESGO_OPERATIVO/GRC; capacidades separadas de permisos; límites en PlanVersion/UsageLimit. | No cantidades de packs ni nueva representación física. |
| A-02 | Mandato humano STEP_6A3 del13-10: relación explícita PlanVersion–CommercialFamily, límites configurables, change-plan independiente, Platform Admin, sustitución active→ended, atomicidad, historia y auditoría. | Intención funcional; no firma de bytes futuros ni QA por arrastre. |
| A-03 | PHASE_5_SUBSCRIPTION_CREATE_DECISION: alta inicial, permiso create, lock Tenant, audit/outbox/idempotencia. | Excluye cambio/update/cancel/delete; se preserva su contrato. |
| A-04 | PHASE_5_SUBSCRIPTION_REGULATORY_PACK_v1.0: autoridad exclusiva SubscriptionRegulatoryPack hacia versión exacta. | No catálogo paralelo ni herencia automática de ediciones. |
| A-05 | Ledger26/R1/R2/R3 y receipts exactos: proyecciones locales,44pares de referencias, vocabularios/provenance, correcciones aprobadas D01/D02 y diseños UQ/default en su alcance. | Operación/aceptación externa y condiciones CFG-D/C-04W no se arrastran. |
| A-06 | Decisiones comerciales reportadas en el DRAFT y FUNCTIONAL_INTEGRATION_STATUS: traslado de packs vigentes compatibles; incompatible revierte; código nuevo caller-owned; ruta change-plan y nombre de permiso propuestos/recibidos. | La intención de cambio/traslado se conserva; nomenclatura de Permission debe reconciliarse con rector22 antes de publicar. No se trata una anotación del DRAFT como receipt de contrato ejecutable. |

**B — derivable del rector, sin elegir política nueva:** UUID opacos; tenant derivado de FK; FKs compuestas; ausencia de referencia comercial no concede derecho; versión publicada inmutable; estado/resultado distintos; default DENY; CAS/ETag; idempotencia actor/ownership/operación; transacción con audit/outbox; intervalos y conservación de historia; no secrets en audit; nombres físicos derivados de estándar11. Derivar estos invariantes no autoriza ampliar tablas, permisos o contratos sin gate humano.

**C — decisiones materiales que se someten ahora:** representación exacta de catálogo/relaciones, cantidades **no** incluidas, ámbito/clave/exclusiones de UsageLimit, tratamiento de versiones/contratos actuales, lineage tipado, root exclusion, request/response/lecturas, comandos/aristas/eventos y nomenclatura de permiso. Se ofrece una propuesta única por decisión; alternativas descartadas se explican para revisión, no se adoptan como opciones runtime.

## 3. Las doce cláusulas pendientes, sin duplicar aprobaciones

Fuente de estado: 07_RESULT.json, sección macro_implementation_20261009; texto individual del ledger26 y copia verificable inherited-pending-clauses.json.48cláusulas trazadas;36DONE locales;12pendientes. La tabla histórica PENDING_REVIEW del ledger no invalida receipts posteriores R1/R2/R3. El texto citado expresa el requisito aún por satisfacer; no afirma que su condición se cumplió.

Para cada H se distinguen contradicción material, falta de operación y falta de evidencia. **No se reclasifican las doce como decisiones comerciales ni como ausencia general de firma.**

### H-01 — C-04W

**Identificador exacto:** C-04W. **Estado leído:** BLOCKED_CANONICAL_LEGAL_BINDING.

**Texto contractual vigente por satisfacer:** «Aprobar revalidación de publicación/vigencia/aplicabilidad/prioridad y coherencia upload→FileObject→Evidence en comandos futuros.»

**Fuente:** docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md:42; evidencia contractual docs/phase6a/STEP_6A3/20_P_RBAC_PUBLICATION_DECISION_PACKET.md:196; aceptación RBAC-C12.

**Contradicción o brecha identificada:** Existe una contradicción material: descubrir RetentionPolicy no acredita aplicabilidad legal por objeto; falta binding tipado upload/FileObject/Evidence→contexto legal, pero sus FKs de policy siguen obligatorias.

**Propuesta de resolución:** No aprobar aplicabilidad por igualdad de policy_id, ni quitar la FK, ni introducir un DENY universal sobre flujos ya aprobados. Mantener el alcance de lectura CT04 aprobado y bloquear sólo la nueva aplicación dependiente. Exigir un Decision Record Privacy/Legal con fuente externa real, cláusula, jurisdicción, objeto/actividad aplicable, intervalos, hold y precedencia de rector23§8, seguido de relación tipada y guard de coherencia en los tres comandos. Este paquete no escoge PrivacyProcessingActivity ni una entidad nueva sin esa fuente.

**Consecuencia técnica:** Futuro binding canónico y guard transaccional en createUploadIntent/finalize/evidenceCreate; conservar historia y políticas existentes. No se implementa ni se publica ese delta en este paquete.

**Riesgo de compatibilidad:** Alto: quitar obligatoriedad, aplicar una ley por presencia del pack o imponer una política global puede cambiar conservación y derechos de objetos ya creados.

**¿Requiere aprobación humana?:** Sí, para el binding y fuentes/interpretación competentes. La firma conjunta puede aprobar esta disposición de bloqueo y sus criterios; no acredita un contexto legal aún inexistente. **Funciones:** Privacidad/Legal, Arquitectura, Modelo de Datos, Backend, Seguridad y Evidence.

**Efecto de una aprobación conjunta:** aprobar la disposición anterior; conservar el gate pendiente hasta demostrar la dependencia concreta. No marcar DONE/PASS ni autorizar operación por esta firma.

### H-02 — C-07

**Identificador exacto:** C-07. **Estado leído:** BLOCKED_OPERATIONAL_PLAN.

**Texto contractual vigente por satisfacer:** «Aprobar estrategia44 grants/template set y44 por tenant completo, SEED010, preflight, versionado/audit; ejecución operacional sigue NOT_AUTHORIZED.»

**Fuente:** docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md:46; evidencia contractual docs/phase6a/STEP_6A3/20_P_RBAC_PUBLICATION_DECISION_PACKET.md:200; aceptación RBAC-C16.

**Contradicción o brecha identificada:** No hay contradicción normativa del diseño ya aprobado: falta autorización operacional exacta del publisher/actor y aplicación real de los44pares. Aprobación R1/R2 no es DML QA.

**Propuesta de resolución:** Ratificar el diseño R1/R2 existente sin volver a aprobar sus44pares. Aprobar la separación contractual/operacional: ejecución real exige identidad real existente del ServicePrincipal PLATFORM_CONTROL, hashes de31/32/33/34 pertinentes, preflight, backup/restore, compatibilidad, rollback y auditoría por RolePermission. No agregar roles/grants ni inventar actor.

**Consecuencia técnica:** Ceremonia futura atómica, idempotente y auditada de relaciones realmente presentes, con adopción SEED010; sin tocar MembershipRole o roles custom.

**Riesgo de compatibilidad:** Alto en QA: propagación excesiva, dobles auditorías, ruptura del bootstrap o materialización de grants no incluidos.

**¿Requiere aprobación humana?:** Sí para el plan operacional y aceptación real; el texto funcional y matriz ya tienen recibos R1/R2. Esta firma no autoriza IAM ni DML. **Funciones:** Arquitectura, Backend, Seguridad y autoridad operacional/DBA.

**Efecto de una aprobación conjunta:** aprobar la disposición anterior; conservar el gate pendiente hasta demostrar la dependencia concreta. No marcar DONE/PASS ni autorizar operación por esta firma.

### H-03 — C-08

**Identificador exacto:** C-08. **Estado leído:** BLOCKED_EXTERNAL_ACCEPTANCE.

**Texto contractual vigente por satisfacer:** «Aprobar18 pruebas negativas/regresión/gates de §10.»

**Fuente:** docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md:47; evidencia contractual docs/phase6a/STEP_6A3/20_P_RBAC_PUBLICATION_DECISION_PACKET.md:201; aceptación RBAC-C01..18.

**Contradicción o brecha identificada:** Brecha de evidencia, no contradicción del catálogo:18criterios RBAC tienen evidencia local y falta aceptación externa autenticada/humana.

**Propuesta de resolución:** Reutilizar los resultados y hashes locales aprobados; mantener RBAC-C01..18 como aceptación futura. Ejecutar sólo escenarios externos que falten, bajo plan separado, con identidad/tenant/rol/entitlement/scope/SoD y correlaciones reales. No volver a correr pruebas locales verdes por trámite.

**Consecuencia técnica:** Matriz caso→evidencia→runtime→aprobador; ningún PASS externo se infiere de Fastify inject, mocks o contenedor healthy.

**Riesgo de compatibilidad:** Medio/alto: confundir usuario de fixture con usuario real oculta fugas, permisos o SoD en runtime.

**¿Requiere aprobación humana?:** Sí para aceptación humana Security/QA y autorización del runtime correspondiente. Aprobar el plan documental no equivale a aceptar resultados no ejecutados. **Funciones:** Arquitectura, Backend, Seguridad, Domain y QA/Release.

**Efecto de una aprobación conjunta:** aprobar la disposición anterior; conservar el gate pendiente hasta demostrar la dependencia concreta. No marcar DONE/PASS ni autorizar operación por esta firma.

### H-04 — CFG-D-COMPLIANCE-V1

**Identificador exacto:** CFG-D-COMPLIANCE-V1. **Estado leído:** BLOCKED_OFFICIAL_SUFFICIENCY_AND_VERSIONED_PUBLICATION.

**Texto contractual vigente por satisfacer:** «Confirmar autosuficiencia de BASELINE_COMPLIANCE v1 y ausencia de configuración adicional conforme a 28; aprobar la cláusula individual, no una preferencia operativa»

**Fuente:** docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md:50; evidencia contractual database/migrations/20261007000200_phase5_methodology_binding.sql:48; aceptación CFG-T01/T02.

**Contradicción o brecha identificada:** No se demostró la autosuficiencia de esa versión. Rector17 sí publica peso default1 y factor0.50; no es correcto declararlos ausentes. Falta binding de overrides Pack, población, fuente/versión, recencia, conflicto y lineage a la evaluación específica.

**Propuesta de resolución:** Conservar BASELINE_COMPLIANCE v1 y EffectiveConfiguration opcional vigentes; NULL no significa none. No confirmar autosuficiencia con la firma actual. Requerir expediente por versión con reglas17/19/38, overrides explícitos o ausencia demostrada, fuentes/inputs/hash y pruebas de suficiencia existentes o nuevas sólo para vínculos ausentes. Cambio material de modo exige sucesora inmutable, no renombrar v1.

**Consecuencia técnica:** Publicación eventual condicionada a expediente reproducible y referencia exacta metodología/fórmula/fuentes; se preservan assessments y snapshots.

**Riesgo de compatibilidad:** Alto: pesos o población implícitos y eliminación de EC pueden cambiar scores e historia.

**¿Requiere aprobación humana?:** Sí para suficiencia demostrada y publicación exacta; el paquete sólo aprueba conservar el contrato actual mientras falte esa prueba. **Funciones:** Methodology, Configuration, Compliance, Arquitectura y Modelo de Datos.

**Efecto de una aprobación conjunta:** aprobar la disposición anterior; conservar el gate pendiente hasta demostrar la dependencia concreta. No marcar DONE/PASS ni autorizar operación por esta firma.

### H-05 — CFG-D-CONTROLS-V1

**Identificador exacto:** CFG-D-CONTROLS-V1. **Estado leído:** BLOCKED_OFFICIAL_SUFFICIENCY_AND_VERSIONED_PUBLICATION.

**Texto contractual vigente por satisfacer:** «Confirmar autosuficiencia de BASELINE_CONTROL_EFFECTIVENESS v1 y ausencia de configuración adicional conforme a 28»

**Fuente:** docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md:51; evidencia contractual database/migrations/20261007000200_phase5_methodology_binding.sql:96; aceptación CFG-T01/T02.

**Contradicción o brecha identificada:** No se demostró autosuficiencia: min(design,operating) y cobertura80% están publicados, pero no acreditan inputs válidos, frescos, evidencia suficiente ni bindings de recencia/confianza.

**Propuesta de resolución:** Conservar BASELINE_CONTROL_EFFECTIVENESS v1 y EC opcional. No fabricar ventana de recencia ni convertir NULL en none. Expediente específico con rector17§§3.2–3.4/19§3/38, reglas oficiales y vínculos vigentes de inputs/Assurance/evidencia; cualquier modo material nuevo usa versión sucesora tras prueba reproducible.

**Consecuencia técnica:** Validación metodológica por versión y lineage; no sustituir debilidad de dimensión por promedio ni declarar cálculo oficial con inputs insuficientes.

**Riesgo de compatibilidad:** Alto: aritmética válida sin evidencia/recencia válida puede publicar una efectividad no sustentada.

**¿Requiere aprobación humana?:** Sí para suficiencia y publicación; esta aprobación no certifica inputs ausentes. **Funciones:** Methodology, Configuration, Controls/Assurance, Arquitectura y Modelo de Datos.

**Efecto de una aprobación conjunta:** aprobar la disposición anterior; conservar el gate pendiente hasta demostrar la dependencia concreta. No marcar DONE/PASS ni autorizar operación por esta firma.

### H-06 — CFG-D-PUBLICATION

**Identificador exacto:** CFG-D-PUBLICATION. **Estado leído:** BLOCKED_OFFICIAL_SUFFICIENCY_AND_VERSIONED_PUBLICATION.

**Texto contractual vigente por satisfacer:** «Aprobar forma de publicación versionada del modo por metodología y enlace verificable a la versión; sin columnas/tablas ni flags inferidos; resolver requisito de nueva versión inmutable antes de ejecutar»

**Fuente:** docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md:53; evidencia contractual docs/executable-contracts/27_PHASE5_METHODOLOGY_BINDING.md:5; aceptación CFG-T04/T05.

**Contradicción o brecha identificada:** La preferencia CFG-D no publica un binding. Anotar none en v1 o usar un flag/nombre/NULL como prueba contradice inmutabilidad y provenance rector23/29/49.

**Propuesta de resolución:** Conservar los dos registros v1; toda declaración de modo exige artefacto exacto por versión con metodologíaID/versión, fórmulaID/versión, sourceHash, vigencia y expediente de suficiencia. No publicar un successor ni una relación física hasta que el expediente cierre su representación. Ratificar la obligación de successor cuando cambie semántica.

**Consecuencia técnica:** Actualización futura coordinada de contrato/manifest/proyecciones por versión; no columnas o flags ad hoc ni backfill de assessments.

**Riesgo de compatibilidad:** Alto: cambiar v1 destruye atribución contractual; un modo inferido activa comportamiento sin autoridad.

**¿Requiere aprobación humana?:** Sí; una firma editorial no sustituye suficiencia ni aprueba un artefacto futuro cuyo hash no se presentó. **Funciones:** Arquitectura, Modelo de Datos, Backend, Methodology y Seguridad.

**Efecto de una aprobación conjunta:** aprobar la disposición anterior; conservar el gate pendiente hasta demostrar la dependencia concreta. No marcar DONE/PASS ni autorizar operación por esta firma.

### H-07 — CFG-UQ1

**Identificador exacto:** CFG-UQ1. **Estado leído:** BLOCKED_OPERATIONAL_PLAN.

**Texto contractual vigente por satisfacer:** «Reconciliar business key EC: tenant/Definition/Subject/effective_at/hash, NULLS NOT DISTINCT»

**Fuente:** docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md:54; evidencia contractual database/migrations/20260916000600_constraints_and_uniqueness.sql:797; aceptación CFG-T06/T07.

**Contradicción o brecha identificada:** La unicidad histórica de EC por tenant solo difiere de la clave canónica por tenant/Definition/Subject/effective_at/hash; diseño reconciliado localmente, falta adopción QA.

**Propuesta de resolución:** Ratificar el candidato31 y contrato ya revisados: UNIQUE NULLS NOT DISTINCT(tenant_id,configuration_definition_id,resolved_for_subject_id,effective_at,input_hash). Conservar todos los IDs, relaciones y valores; preflight real antes de mutar; ante duplicado incoherente detener sin DELETE, merge o hash fabricado.

**Consecuencia técnica:** Migración forward-only transaccional posterior y proof de integridad;38casos nativos previos se reutilizan, no se repiten.

**Riesgo de compatibilidad:** Medio/alto: ledger/catálogo o datos reales distintos del fixture; pérdida de historia por deduplicación automática.

**¿Requiere aprobación humana?:** Sí para plan/ejecución operacionales, no una nueva firma de dirección de la clave ya aprobada. **Funciones:** Modelo de Datos, Arquitectura, Backend y DBA operacional.

**Efecto de una aprobación conjunta:** aprobar la disposición anterior; conservar el gate pendiente hasta demostrar la dependencia concreta. No marcar DONE/PASS ni autorizar operación por esta firma.

### H-08 — CFG-UQ2

**Identificador exacto:** CFG-UQ2. **Estado leído:** BLOCKED_OPERATIONAL_PLAN.

**Texto contractual vigente por satisfacer:** «Reconciliar unicidad de layers por EC + precedence_level + ordinal»

**Fuente:** docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md:55; evidencia contractual database/migrations/20260916000600_constraints_and_uniqueness.sql:800; aceptación CFG-T06/T07.

**Contradicción o brecha identificada:** UNIQUE(ordinal) global difiere de unicidad por EC/precedence_level/ordinal; corrección ya preparada, falta QA.

**Propuesta de resolución:** Ratificar UNIQUE(effective_configuration_id,precedence_level,ordinal) de candidato31. No reordenar ni borrar layers; verificar root/FKs y duplicados por la nueva clave; incoherencia detiene la adopción.

**Consecuencia técnica:** Constraint forward-only en transacción con preflight y recuperación; cada EffectiveConfiguration conserva capas reproducibles.

**Riesgo de compatibilidad:** Medio: duplicados o scope incorrecto pueden alterar la selección de configuración reproducible.

**¿Requiere aprobación humana?:** Sí para operación DBA/QA; el diseño no exige volver a pedir su dirección aprobada. **Funciones:** Modelo de Datos, Arquitectura, Backend y DBA operacional.

**Efecto de una aprobación conjunta:** aprobar la disposición anterior; conservar el gate pendiente hasta demostrar la dependencia concreta. No marcar DONE/PASS ni autorizar operación por esta firma.

### H-09 — CFG-DEFAULT

**Identificador exacto:** CFG-DEFAULT. **Estado leído:** BLOCKED_OPERATIONAL_PLAN.

**Texto contractual vigente por satisfacer:** «Mantener exactamente un typed default que coincida con value_type; cero requiere resolución competente, no default fabricado»

**Fuente:** docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md:56; evidencia contractual docs/physical-data-model/01_PHYSICAL_DATA_MODEL.md:224; aceptación CFG-T08.

**Contradicción o brecha identificada:** CHECK<=1 permite cero typed defaults mientras contrato01 requiere exactamente uno del tipo declarado; candidato31 ya contiene corrección y falta operación.

**Propuesta de resolución:** Ratificar exactamente un default y coincidencia con value_type: boolean/integer/decimal/text/timestamp/duration/json. Falso y cero son valores; ausencia no se reemplaza. No inferir default. Un tipo no mapeado o una fila sin default bloquea preflight y requiere dato/decisión competente, no coerción.

**Consecuencia técnica:** CHECK de cardinalidad/tipo del candidato31; mantener PK/FK/valores y resolver datos inválidos fuera de la migración automatizada.

**Riesgo de compatibilidad:** Alto si se agregan defaults ficticios: cambia resolución y resultados. La adopción del mapa de value_type debe quedar registrada.

**¿Requiere aprobación humana?:** Sí para adopción operacional y cualquier dato inválido; no se aprueba inventar valores. **Funciones:** Modelo de Datos, Configuration, Arquitectura, Backend y DBA.

**Efecto de una aprobación conjunta:** aprobar la disposición anterior; conservar el gate pendiente hasta demostrar la dependencia concreta. No marcar DONE/PASS ni autorizar operación por esta firma.

### H-10 — CFG-QA

**Identificador exacto:** CFG-QA. **Estado leído:** BLOCKED_EXTERNAL_ACCEPTANCE.

**Texto contractual vigente por satisfacer:** «Aprobar aceptación de 28 CFG-T01..08 sin autoaprobar runtime»

**Fuente:** docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md:58; evidencia contractual docs/phase6a/STEP_6A3/21_P_CONFIG_BINDING_EVIDENCE_AND_ARCHITECTURE_OPTIONS.md:188; aceptación CFG-T01..08.

**Contradicción o brecha identificada:** Falta aceptación runtime CFG-T01..08; las pruebas locales y preferencia none no la acreditan.

**Propuesta de resolución:** Ratificar criterios CFG-T01..08 y reutilizar evidencia local exacta. La aceptación externa depende de C-04W, suficiencia/publicación de metodología cuando aplique y adopción segura31. Ningún criterio dependiente se marca PASS por omisión; pruebas nuevas sólo cubren evidencia externa o cambios nuevos.

**Consecuencia técnica:** Expediente QA con recursos/configuraciones reales y errores/status exactos; no ampliar effective_configuration.read ni inventar handlers.

**Riesgo de compatibilidad:** Medio/alto: resultado vacío, NULL o test previo puede confundirse con configuración correcta.

**¿Requiere aprobación humana?:** Sí para aceptación QA/Security/Domain y operación correspondiente; no para ratificar de nuevo resultados locales. **Funciones:** QA, Backend, Seguridad, Compliance y Controls.

**Efecto de una aprobación conjunta:** aprobar la disposición anterior; conservar el gate pendiente hasta demostrar la dependencia concreta. No marcar DONE/PASS ni autorizar operación por esta firma.

### H-11 — VOC-C04

**Identificador exacto:** VOC-C04. **Estado leído:** BLOCKED_EXTERNAL_HISTORICAL_INVENTORY.

**Texto contractual vigente por satisfacer:** «Aprobar inventario histórico y compatibilidad antes del enforcement conforme a 23/30»

**Fuente:** docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md:78; evidencia contractual docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:66; aceptación T-VOC01..12.

**Contradicción o brecha identificada:** Falta inventario histórico real por ocurrencia; fixtures sin tenants/product data no prueban compatibilidad de52valores/26ocurrencias.

**Propuesta de resolución:** Ratificar inventario READ ONLY previo a enforcement: para cada ocurrencia autorizada registrar código, conteo, tipo/longitud, versión contractual conocida/desconocida y contexto mínimo agregado; no exportar filas/PII. Mantener upload y uploaded separados; ausencia de provenance antigua es desconocida, nunca v1 asignada retrospectivamente. Una incompatibilidad bloquea sólo el enforcement afectado y vuelve al owner.

**Consecuencia técnica:** Informe posterior de compatibilidad con catálogo/manifest exactos; no coerción, alias, backfill, traducción persistida ni cambio de enums históricos.

**Riesgo de compatibilidad:** Alto: rechazo de datos históricos válidos o normalización silenciosa; exposición por inventario excesivo.

**¿Requiere aprobación humana?:** Sí para autorización del plan concreto READ ONLY y tratamiento de incompatibilidades; no se ejecuta esa consulta hoy. **Funciones:** Arquitectura, Backend, Seguridad, Modelo de Datos, Domain propietario y QA.

**Efecto de una aprobación conjunta:** aprobar la disposición anterior; conservar el gate pendiente hasta demostrar la dependencia concreta. No marcar DONE/PASS ni autorizar operación por esta firma.

### H-12 — VOC-QA

**Identificador exacto:** VOC-QA. **Estado leído:** BLOCKED_EXTERNAL_ACCEPTANCE.

**Texto contractual vigente por satisfacer:** «Aprobar pruebas T-VOC01..12 y compatibilidad por ocurrencia sin certificar ejecución de capacidades nuevas»

**Fuente:** docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md:81; evidencia contractual docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:103; aceptación T-VOC01..12.

**Contradicción o brecha identificada:** Compatibilidad local no acredita T-VOC01..12 externos ni ejecución de capacidades nuevas.

**Propuesta de resolución:** Ratificar aceptación por ocurrencia con fuente/hash/provenance/i18n/versionado, negativos y compatibilidad real. Reusar PASS locales; ejecutar únicamente escenarios externos o nuevos deltas autorizados; preservar los conteos de familias/valores/ocurrencias exactamente como sus manifests, sin sumar fixtures a producto.

**Consecuencia técnica:** Expediente por operación/ocurrencia, permiso/tenant y dato histórico; un dropdown o label no acredita motor de dominio.

**Riesgo de compatibilidad:** Medio/alto: presentar vocabulario publicado como capacidad funcional terminada o confundir ocurrencias distintas.

**¿Requiere aprobación humana?:** Sí para aceptación externa QA/Security/Domain; no se certifica hoy ni se cambia estado del ledger. **Funciones:** QA, Backend, Seguridad y Domains propietarios.

**Efecto de una aprobación conjunta:** aprobar la disposición anterior; conservar el gate pendiente hasta demostrar la dependencia concreta. No marcar DONE/PASS ni autorizar operación por esta firma.

## 4. Propuesta comercial completa para aprobación conjunta

### C-01 — catálogo único y autoridad

CommercialFamily será entidad nominal del bounded context **Tenant & Commercial Entitlements**, ownership **PLATFORM_CONTROL**, sin tenant. Se propone **platform.commercial_families**, PK **commercial_family_id** UUIDv7; family_code varchar(96) no vacío/único; name text no vacío; source_type varchar(32) no vacío; published_at timestamptz NOT NULL; publication_manifest_sha256 char(64) hex NOT NULL; perfil **I append-only** existente con timestamps/actores/FKs de identidad. Sólo contiene filas efectivamente publicadas mediante artefacto humano y ceremonia gobernada; drafts permanecen documentales. No agrega un workflow editable ni endpoints CRUD de catálogo.

No se crean simultáneamente regulatory.pack_families ni un catálogo PackFamily separado. Cambiar código/tipo/significado de una familia publicada no modifica su fila: requiere nueva identidad/código publicados y nuevas PlanVersion que la adopten. El catálogo y sus relaciones se versionan mediante manifests de publicación y binding a PlanVersion exacta. No se usa row_version mutable como versión comercial.

Una ceremonia futura de publicación será PLATFORM_CONTROL, actor canónico humano o ServicePrincipal real con autoridad operacional explícita; command_code **commercialCatalogPublication**, audit **audit.platform.commercial_catalog.publish.v1**, outbox **platform.commercial_catalog.published.v1**; manifest/hash, actor, fuente y filas exactas en before/after. No crea identidad/grants ni usa un tenant técnico. El texto humano no ejecuta esa ceremonia.

**Rectores:**07/08/30/33/42/46; estándar físico11. **Decisión C:** sustituye el catálogo regulatory.pack_families/perfil M del DRAFT por un catálogo comercial append-only en su namespace propietario. Necesita alta nominal gobernada en33 y modelos antes de código; no se hace en v1.8 in situ.

### C-02 — relaciones, clasificación y versiones comerciales

Se proponen dos relaciones soporte, sin convertirse en autoridades paralelas:

| Relación | Columnas propias sobre perfil I | Integridad |
| --- | --- | --- |
| platform.regulatory_pack_commercial_family_links | regulatory_pack_commercial_family_link_id UUIDv7 PK; regulatory_pack_id UUID NOT NULL; commercial_family_id UUID NOT NULL; source_type varchar(32) NOT NULL | UQ(regulatory_pack_id); FK compuestas (regulatory_pack_id,source_type)→raíz y (commercial_family_id,source_type)→familia; UQ soporte en ambas raíces referidas; RESTRICT. |
| platform.plan_version_commercial_family_links | plan_version_commercial_family_link_id UUIDv7 PK; plan_version_id UUID NOT NULL; commercial_family_id UUID NOT NULL | UQ(plan_version_id,commercial_family_id); FKs RESTRICT a PlanVersion y CommercialFamily. |

Cardinalidades: CommercialFamily1→0..Nraíces; RegulatoryPack0..1clasificación antes de completarse, **exactamente1 para nueva elegibilidad**; PlanVersion N:M CommercialFamily; cada par una fila inmutable. Clasificación estable entre versiones de una raíz; no reclasificar una raíz histórica silenciosamente. Referential integrity se implementa en PostgreSQL y autorización en backend, no sólo frontend.

Propuesta de catálogo/mapeo inicial: ISO/standard para las cuatro raíces ISO de rector41; LEGAL/law para CL_LEY_21719. Son datos de catálogo/migración con IDs canónicos resueltos, no prefijos o plan_code en if/else. Root source_type se preserva. Clasificación no publica pack, licencia, cobertura, vigencia ni permiso.

**Corrección respecto al DRAFT:** nuevas condiciones se asocian **únicamente a nuevas PlanVersion**, nunca se agregan familias/límites a las v1 publicadas. Para nuevas versiones de ISO e ISO_RIESGO_OPERATIVO el manifest propone ISO; para nueva GRC, ISO+LEGAL. Rector42§2.3 conserva el alcance contractual/sectorial GRC: futuras familias de esas clases se publican explícitamente en versiones futuras, sin herencia automática ni reducción del alcance rector a dos familias para siempre. No se inventan familias/códigos adicionales hoy.

### C-03 — resolución exacta de UsageLimit

**Se reutiliza platform.usage_limits. No se crea PackLimit ni una segunda tabla de límites.** Se agrega commercial_family_id UUID NULL; el resto de campos/tipos/PK/actores existentes se conserva. FK de familia a CommercialFamily y FK compuesta (plan_version_id,commercial_family_id)→plan_version_commercial_family_links para registros con familia. NULL expresa dimensión total y no familia ficticia.

| Aspecto | Propuesta única |
| --- | --- |
| Código/unidad de packs | limit_code=regulatory_pack_count; unit=pack. Cantidad cuenta raíces distintas, no versiones/historia. Ambos códigos son C para aprobación; no cantidades. |
| Unicidad | UNIQUE NULLS NOT DISTINCT(plan_version_id,limit_code,commercial_family_id,effective_from). Sustituye el UNIQUE(limit_code) global; conserva el caso sin familia de la clave rector01. No codificar plan/UUID en limit_code. |
| Valor | CHECK(limit_value>=0) para todos los límites; numeric(30,10) vigente. Para regulatory_pack_count exigir entero y unit=pack. Cero concede cero packs, nunca unlimited. |
| Familia | Para códigos distintos de regulatory_pack_count, commercial_family_id debe ser NULL; no reinterpretar otras unidades. Familia no admitida por esa PlanVersion rechazada por FK. |
| Intervalo | effective_from NOT NULL; effective_to NULL o >from; [from,to), NULL superior abierto. |
| Solapamiento | Dos exclusiones GiST usando btree_gist existente: total por (plan_version_id,limit_code,range), WHERE family IS NULL; familiar por (plan_version_id,limit_code,commercial_family_id,range), WHERE family IS NOT NULL. No COALESCE UUID/sentinel ni comparador de NULL ambiguo. |
| Cardinalidad | En cualquier instante válido de una nueva PlanVersion: exactamente1límite total efectivo y1por cada familia admitida. Puede haber Nintervalos consecutivos inmutables, sin solapamiento; no tiene que cumplirse suma(familia)=total, ambos límites se verifican independientemente. |
| Publicación | Guard transaccional acredita cobertura sin gaps de todos los intervalos de la PlanVersion. Con vigencia abierta, todos los límites requeridos deben cubrir su tramo abierto; no defaults implícitos. |
| Condiciones | Nuevas condiciones publicadas→nueva PlanVersion; no UPDATE de UsageLimit histórico ni cambio del padre. |
| Registros existentes | Columna nueva NULL mantiene significado de dimensión total; conservar ID/plan/código/valor/unidad/intervalo. Inventario conocido QA tiene0UsageLimit, pero migración futura debe comprobarlo de nuevo; no inferir estado futuro del resultado histórico. |
| Datos inválidos | Negativos, intervalos/solapamientos/gaps incoherentes o valores packs no enteros bloquean preflight. No DELETE, redondeo, merge, renombrado ni reparación automática; requiere dato/decisión humana exactos. |
| Ausencia/incompletitud | No seleccionar para contratar, crear Subscription nueva, cambiar al destino, agregar o transferir packs.422 TCDX.INVARIANT.VIOLATION, detalle seguro de configuración faltante; error técnico503 nunca se devuelve como configuración vacía válida. |

La integralidad de datos y la cardinalidad de publicación no se confunden: FK/unique/exclusion/check protegen estructura, y guard de publicación protege que **existan** los límites requeridos. No se pretende que una FK por sí sola garantice completitud.

**UL-01 resuelto como propuesta documental:** dictamen físico01 y rector42 prevalecen; SQL aplicado y expected-schema globales deben reconciliarse después mediante migración forward-only revisada. No se edita 20260916000600 ni su checksum. Las cantidades comerciales quedan **no provistas**, no0 por default. Su entrega es dato de Producto antes de publicación/contratación; no impide probar técnicamente el mecanismo con fixtures segregados después de autorización.

### C-04 — derechos actuales y preflight de activación

Se conservan PlanVersion publicadas, Subscription, asignaciones, entidades y snapshots actuales. No se agregan condiciones a una versión ya contratada ni se cambia plan_version_id in situ. No grandfather flag, allowlist, rama por tenant/fecha, modo legacy o doble predicado de derechos.

El nuevo guard comercial único **no se activa en un ambiente con suscripciones actuales que quedarían sin configuración canónica suficiente**. La promoción deberá acreditar que los tenants afectados adoptaron explícitamente nuevas PlanVersion completas mediante change-plan autorizado, o que las condiciones históricas estaban modeladas y aprobadas en fuentes canónicas suficientes; no reconstruirlas de nombres o permisos. Si falta esa evidencia, la activación completa queda bloqueada. Conservar el runtime aprobado antes de promoción no constituye nueva capa de compatibilidad.

El mecanismo change-plan puede comprobar origen real activo y trasladar sólo sus packs exactos compatibles a un destino completo, sin inventar un derecho ilimitado del origen. Eso no autoriza publicar el nuevo runtime de migración por esta firma: el orden operativo y compatibilidad deben demostrar una adopción sin interrupción ni bypass antes de cualquier promoción. No se promete que la aprobación documental por sí sola resuelva la coexistencia en QA.

Lecturas nuevas administrativas pueden devolver registros históricos/incompletos con commercial_configuration_status **complete|incomplete|conflicting**, derivado y sin conceder derecho ni nuevo lifecycle. Una lectura de historia es distinta de selección/effective entitlement. Acceso oficial nuevo requiere íntegramente Subscription+PlanVersion+familia+límites+pack+capability+RBAC/Scope/ObjectPolicy/SoD. Datos faltantes no se transforman en unlimited ni borran historia.

### C-05 — integridad de activos, raíz y lineage persistente

Se propone reforzar Subscription con exclusión temporal GiST de (tenant_id,range[starts_at,ends_at)) para lifecycle_state=active y cancelled_at IS NULL; lock Tenant sigue serializando comandos. Preflight detecta cualquier solapamiento real/futuro. No elimina suscripciones existentes para agregar la constraint.

Se agregan columnas tipadas, no objetos JSON de negocio:

| Objeto | Delta candidato |
| --- | --- |
| platform.subscriptions | previous_subscription_id UUID NULL; FK compuesta (tenant_id,previous_subscription_id)→(tenant_id,subscription_id); UNIQUE(tenant_id,previous_subscription_id) para no NULL; CHECK previous!=self. La nueva fila apunta al origen; no editar la historia para apuntar al futuro. |
| platform.subscription_regulatory_packs | regulatory_pack_id UUID NOT NULL derivado de versión; FK compuesta (regulatory_pack_version_id,regulatory_pack_id)→versión/raíz con UQ soporte. Excluir solapamiento por (subscription_id,regulatory_pack_id,range[effective_from,effective_to)), **todas las filas**, conservando la exclusión existente por versión. |
| platform.subscription_regulatory_packs | previous_subscription_regulatory_pack_id UUID NULL; FK compuesta tenant+ID→asignación anterior; unique por tenant+previous noNULL y CHECK previous!=self. Cada traslado crea nuevo ID con versión exacta. |

Constraint triggers transaccionales diferidos deben acreditar, para una relación noNULL, mismo tenant, padre Subscription ended, parent.starts_at<child.starts_at, parent.ends_at=child.starts_at; y para traslado: Subscription nueva referencia a la vieja, mismas raíz/versión, asignación vieja revoked y su effective_to=nueva.effective_from=corte. Esa desigualdad temporal excluye ciclos; FK/unique excluyen cross-tenant y dos sucesores. El orquestador no puede confirmar una cadena incompleta.

Backfill de regulatory_pack_id es mecánico por FK de versión existente; no clasifica familia por heurística. previous_* queda NULL en registros previos y significa vínculo **no registrado**, sin reconstrucción por fechas/códigos ni backfill de relato comercial. Relaciones de renovación u otras transiciones no se agregan por inferencia.

Se escoge **FK compuesta + exclusión PostgreSQL por raíz**, descartando enforcement sólo por locks: el último no protege escrituras que omitan el servicio. Un registro duplicado/solapado detectado bloquea migración; no se elimina ni se trunca. El traslado conserva la expiración prevista original: la nueva asignación effective_to es el valor previo de la antigua, no NULL por conveniencia. El audit conserva before con ese valor antes del cierre en t.

### C-06 — change-plan, autoridad y contrato de transporte

Operación **subscriptionChangePlan**, POST **/api/v1/platform/subscriptions/{id}:change-plan**. Body cerrado con tres campos obligatorios:

- plan_version_id: UUIDv7 canónico de destino.
- subscription_code: string no vacío/trim, máximo96; único dentro del tenant; se preserva case conforme contrato de alta, sin normalización comercial nueva.
- reason: string no vacío/trim,1..2000, sin secretos.

Headers: Idempotency-Key obligatorio conforme contrato7; If-Match fuerte citado con row_version decimal positivo; Correlation-ID conforme contrato existente. Se rechazan weak ETag, body expected_version, tenant_id, actor, fechas, estado, family/limit/capability/entitlement aportados. Sin X-TCDX-Tenant-Id; el tenant se deriva del origen y se valida en PostgreSQL.

Origen único activo, starts_at<=t, ends_at NULL o >t y cancelled_at NULL; tenant e identidad activos. Destino distinto, plan/versión publicados y vigentes, datos completos y entitlements rector42. Todos los packs efectivos deben ser compatibles, publicados/vigentes/licenciados con gate regulatorio de41 y límites suficientes; nunca aceptar draft de pack como derecho oficial. Si no hay packs, igual se valida completitud comercial del destino; no implica derecho ilimitado.

Políticas exactas para aprobación: mismo PlanVersion→409 sin mutación; packs active con effective_from>t→409, no copiar/cancelar futuras asignaciones; origen no vigente/ended/cancelado→409; varias suscripciones activas o solapamiento→409; packs vencidos/revocados no se trasladan ni se borran; nuevo código duplicado→409; corte t<=starts_at de origen/asignación que debe cerrarse→409retryable sin desplazar fechas. No renovación, suspensión o cancelación implícitas.

**Nomenclatura y seguridad:** se propone **platform.subscription.update** para este comando y **platform.subscription.read** para las lecturas nuevas. Acciones update/read son canónicas en rector22§2; la nomenclatura change_plan del DRAFT no lo es. El recurso Subscription ya tiene autoridad de alta aprobada; se requiere reconciliar su entrada explícita y acciones read/create/update en22§10 y catálogos derivados mediante enmienda humana, sin editar baseline activo. No publicar ni aceptar alias platform.subscription.change_plan ni un grant equivalente alternativo.

Ambos permisos son PLATFORM_CONTROL/platform y sus únicos grants base propuestos son PLATFORM_ADMIN. PlatformActor debe resolver UserIdentity HUMAN_INTERACTIVE activa, PlatformRoleAssignment vigente, Role PLATFORM_CONTROL publicado e is_baseline=true, Permission publicada y rol base PLATFORM_ADMIN, además de ObjectPolicy/SoD. Un permiso aportado o un rol tenant/custom, Platform Support, un ServicePrincipal o impersonation session no sustituyen esa cadena. Autoridad del plan nunca concede Permission. El permiso update **no expone update CRUD ni cambio de estado libre**: únicamente esta ruta/comando registrados. No se modifica IAM ni se materializan sus dos grants en esta intervención; autorización de nomenclatura no es autorización DML.

### C-07 — transición, atomicidad y concurrencia

Una sola transacción de aplicación bajo Tenant & Commercial Entitlements:

1. Autenticar/autorizar/validar; reclamar idempotencia. Replay se reautoriza antes de devolver snapshot original.
2. Orden de lock: Tenant; Subscription origen y cualquier activa competidora; asignaciones por ID; SHARE de Plan/PlanVersion, relaciones de familia/UsageLimit y versiones/raíces de packs en orden estable. Revalidar catálogo/actor/CAS luego de locks.
3. Fijar **t=statement_timestamp posterior a locks** y usarlo para el corte de todo el comando. Evaluar rangos [from,to), ausencia/incompatibilidad y conteos total/por familia en ese instante; revalidar vigencia/configuración/autoridad antes de confirmación. No usar un timestamp anterior a espera de lock para falsear vigencia.
4. Arista Subscription active→ended: ends_at=t, updated actor/time, row_version+1 por CAS; conservar ID, tenant, código, PlanVersion, starts_at y cancelled_at. Insertar nueva active con starts_at=t, destino/código, previous_subscription_id=origen y actor.
5. Para cada asignación efectiva compatible: registrar before; ejecutar active→revoked con effective_to=t, actor/CAS; insertar active nueva de versión exacta, raíz y previous ID, desde t y **hasta expiración original**. No trasladar Evidence/Assessment/Control ni reescribir su lineage.
6. Persistir audit material/privilegiado, audits de hijos, outbox e idempotencia con resultado; constraints y checks de unicidad/completitud válidos; COMMIT único.

Cualquier fallo antes de commit, incluido audit/outbox/completeIdempotency/constraint/CAS, produce **ROLLBACK íntegro**. Side effects externos van por outbox; después de commit su fallo se reintenta auditadamente, sin rollback comercial silencioso, conforme21/25. No proveedor IAM/storage/IA en esa transacción. Historia no se borra y la nueva asignación no hereda ediciones futuras.

Definiciones a publicar antes de implementar:

| Entity/from/command/to | Permission/scope | Precondition | Audit/event | SoD/notification/recalculation |
| --- | --- | --- | --- | --- |
| Subscription/active/subscription.change_plan/ended | platform.subscription.update/platform | commercial.subscription.change_plan.v1: C-03..C-07, CAS y origen único | audit.platform.subscription.change_plan.v1; platform.subscription.plan_changed.v1 | Sólo Platform Admin; no autoaprobación de contenido; sin notificación nueva; sin recalcular historia. |
| SubscriptionRegulatoryPack/active/subscription_regulatory_pack.transfer_close/revoked | mismo permiso/autoridad de comando padre | commercial.pack.transfer_close.v1: origen efectivo y mapeo atómico hacia nueva Subscription | audit.platform.subscription_regulatory_pack.transfer_close.v1; platform.subscription_regulatory_pack.transfer_closed.v1 | Invocación interna exclusiva de change-plan; sin ruta pública nueva ni estado adicional. |

La creación nueva active tiene command interno **subscription_regulatory_pack.transfer_activate**, precondition commercial.pack.transfer_activate.v1 y audit **audit.platform.subscription_regulatory_pack.transfer_activate.v1**, evento **platform.subscription_regulatory_pack.transferred.v1**. Es alta con estado inicial server-owned, no arista desde un estado inventado. Idempotencia de las tres operaciones internas es la del padre más IDs origen y asignaciones, nunca tres transacciones/key de cliente. Concurrencia: CAS, locks y exclusions de C-05. system_actor_allowed=false para el cambio y cierre comercial; no jobs automáticos.

No reutilizar/redefinir silenciosamente subscriptionRegulatoryPackRevoke público: conserva permiso archive, motivo, audit y outbox originales. La nueva arista específica tiene la semántica de traslado aprobada; no otorga a otros actores revocación genérica. LifecycleTransitionDefinition sigue siendo el registry único y sus versiones publicadas permanecen inmutables.

### C-08 — respuesta e idempotencia exactas

HTTP **202 completed**, conservando el envelope publicado, result seguro cerrado:

```json
{
  "operation_id": "subscriptionChangePlan",
  "status": "completed",
  "correlation_id": "UUID de la operación original",
  "resource_id": "UUID de la nueva Subscription",
  "result": {
    "previous_subscription": "SubscriptionCommercialProjection",
    "current_subscription": "SubscriptionCommercialProjection",
    "effective_at": "UTC ISO8601",
    "pack_transfers": {
      "count": "entero no negativo",
      "href": "/api/v1/platform/subscriptions/{new_id}/pack-transfers"
    }
  }
}
```

El bloque define nombres/tipos, no fixture con datos comerciales. ETag de la nueva Subscription. Los transfers se leen paginados; no arrays de tamaño indeterminado ni máximo comercial inventado. Header Idempotency-Replayed=true para replay.

Fingerprint v1 según contrato7: operation/target-origen, plan_version_id, subscription_code/reason normalizados e If-Match canónico; ownership PLATFORM_CONTROL, tenant_id NULL, actor canónico, key. Snapshot **result** original y correlation raíz se serializa con schema cerrado **COMMERCIAL_CHANGE_PLAN_RESULT_V1** en el result_ref seguro del IdempotencyRecord existente, result_status_code=completed y response_hash canónico; no tabla nueva ni campo de negocio join-critical en JSON. Relaciones de negocio persisten por FKs C-05. Schema de replay es delta explícito del contrato7, no un formato inferido de otro comando.

Replay revalida identidad/permiso/scope y hash de snapshot; conserva202/resultado/IDs/fechas/versions originales y no produce audit material/outbox duplicados. Nunca reconstruye respuesta desde filas que cambiaron después. Registro corrupto/dependencia requerida ausente→503; fingerprint distinto→409 TCDX.CONFLICT.IDEMPOTENCY retryable=false; in-progress sin representación segura→409 TCDX.CONFLICT.RESOURCE retryable=true. Auth401/403; target404; CAS/estado/código409; schema400 TCDX.VALIDATION.FAILED; plan/pack/límite422 TCDX.INVARIANT.VIOLATION; dependencia503. Error SQL no se presenta como éxito. TTL no inventado: retención por policy del contrato7.

### C-09 — lecturas comerciales completas

Nuevas operaciones bajo **platform.subscription.read/platform/PLATFORM_ADMIN**, sin tenant header y sin ampliar TenantAdministrativeProjection/tenantGet existentes:

| OperationId | GET ruta | Resultado |
| --- | --- | --- |
| subscriptionCommercialGet | /api/v1/platform/subscriptions/{id} | SubscriptionCommercialProjection+ETag; tenant derivado de registro;404 desconocido. |
| subscriptionCommercialList | /api/v1/platform/subscriptions?tenant_id={id} | Historial por tenant explícito obligatorio, autorizado Platform; page canónica. |
| subscriptionPackTransferList | /api/v1/platform/subscriptions/{id}/pack-transfers | Pares tipados cuya asignación destino pertenece a esa Subscription; conteo y page canónica. |

**SubscriptionCommercialProjection** cerrada: subscription_id,tenant_id,subscription_code,plan_version_id,plan_id,plan_code,plan_name,plan_version_number (string decimal positiva),lifecycle_state,starts_at,ends_at,cancelled_at,row_version (string decimal positiva),previous_subscription_id nullable,next_subscription_id nullable,commercial_configuration_status. Estados Subscription existentes active/ended del cambio, sin estado de configuración nuevo. Fechas UTC ISO8601; next ID por FK inversa única, no por coincidencia de fechas ni búsqueda heurística en audit.

**SubscriptionPackTransferProjection** cerrada: previous_subscription_regulatory_pack_id,current_subscription_regulatory_pack_id,regulatory_pack_id,regulatory_pack_version_id,previous_subscription_id,current_subscription_id,effective_from,effective_to nullable. IDs/tenant/version se validan desde las relaciones C-05; no email, roles, texto normativo, licencias privadas ni secrets.

page[size] default25/máximo100 y cursor maxLength2048 conforme contratos existentes; historial orden starts_at DESC,subscription_id DESC; transfers orden effective_from DESC,subscription_regulatory_pack_id DESC. Cursor autenticado/context-bound por actor, tenant, operation, Subscription/filtros,orden/versión y tiempo de evaluación. Cursor otro tenant/filtro400; estado de identidad/rol/contexto revocado403; no descargar otros tenants y filtrar en UI. Página vacía legítima200; dependencia/SQL error503, nunca empty success. Reads NATURALLY_IDEMPOTENT, sin audit material/outbox nuevo; registrar controles operacionales generales vigentes. Datos incompletos se muestran como tales sin habilitar operaciones o derechos oficiales.

### C-10 — auditoría, eventos y prueba de decisión

Audit material padre: **audit.platform.subscription.change_plan.v1**, command subscriptionChangePlan, aggregate Subscription origen, ownership PLATFORM_CONTROL, tenant_id envelope NULL; tenant real explícito en payload seguro como en alta aprobada. Uso privilegiado conserva **audit.iam.application_token.privileged_use.v1**. Audit/outbox de filas hijas usa TENANT_OWNED y tenant real de Subscription, sin cambiar su ownership para acomodar el actor Platform.

Evento padre **platform.subscription.plan_changed.v1**: versión1, event_id,ownership,tenant/NULL según clase,aggregateType/ID,occurred_at,actor,correlation_id,causation_id,classification confidential y payload cerrado old/newSubscriptionID,tenantID,old/newPlanVersionID,effective_at,transfer_count. Eventos de hijos C-07 usan aggregate/asignación correspondiente y IDs de padre/vínculo/versión/intervalos exactos. Consumers idempotentes; no publicación síncrona de side effects externos.

Before/after material: estados/PlanVersionIDs/códigos, starts/ends, row_version CAS, actor, reason, corte, vínculos previous/successor y hashes/IDs exactos de PlanVersion–familia/UsageLimit evaluados. Cada hijo conserva original effective_to y nueva expiración; se agregan sus IDs/relaciones al audit del hijo. El padre registra count y correlación hacia audits hijos, evitando un blob único ilimitado. Clasificación/publicación de catálogo tienen C-01 propio.

No backfill de auditoría/provenance a registros antiguos, no secrets ni documentación normativa protegida en payload. Reads de historial pueden reconstruir relaciones desde datos tipados y provenance desde audits vinculados; ausencia de audit histórico es desconocida explícita, no aprobación.

### C-11 — migración, invariantes y compatibilidad

No se entrega ni ejecuta SQL en este turno. Diseño futuro: **3tablas soporte/catálogo comerciales**, extensión UsageLimit, lineage tipado y root/overlap safeguards C-05; sin nueva tabla de Subscription, PackLimit, entitlement o IAM. PK/FK/index/check/unique/exclusion/trigger y nombres se derivan exactamente de los perfiles/naming11 y matrices C-01..C-05; deben publicarse con modelo físico y traceability antes del runner.

Preflight obligatorio futuro: identidad Postgres16/ledger/checksums, source constraints exactas UL-01, raíces y source_types, familia/mapping completos, versiones publicadas/contratadas, límites negativos/noninteger/unidad/gaps/solapamientos, suscripciones/raíces solapadas, FK/ownership existentes y datos incompatibles; backup/restore para ambiente compartido. Fallo no hace DELETE/cast/merge silencioso. Mapeo inicial sólo por claves canónicas rector41 resueltas; raíces adicionales exigen dato clasificado explícito, no fallback.

Forward-only; migraciones aplicadas/manifests anteriores intactos. Backfill mecánico de raíz por versión y NULL de lineage no altera significado de contratos históricos. Condiciones de nuevos planes se crean antes de publicar la nueva versión; cantidades aprobadas son prerequisite de publicación real. Integridad conserva FKs RESTRICT, temporalidad y tenancy. Todas las mutaciones y semánticas de errores se verifican con pruebas nuevas cuando se autorice, incluido caso negativo de cada constraint y transaction rollback; reusar las pruebas intactas ya aprobadas.

### C-12 — alcance que puede firmarse y activación futura

Firmar este paquete acepta las decisiones C y H exactas para elaborar/presentar la reconciliación rector→canonical/logical→physical→executable; **no adopta automáticamente una nueva versión rectora**. ComercialFamily ausente33 y Subscription/Permission/actions/aristas requieren publicación competente de sus deltas. Baselinev1.8 e históricos jamás se editan in situ. No se asigna por Codex un ID/fecha de futura activación como si el humano ya la hubiera aprobado.

La autoridad debe revisar bytes/hash de esa publicación futura y sus gates antes de implementación dependiente; una aprobación de texto no firma artefactos todavía no generados. Ninguna decisión autoriza DDL/DML, IAM, catálogo/grants, QA, E2Eexterno, commit/push/merge/deploy en esta intervención. El mandato presente termina en solicitud de aprobación formal. STEP6A4/intermedio/6A5 no iniciados; no override de fases ni MARKET_RELEASE_READY.

## 5. Cambios documentales propuestos respecto al DRAFT, agrupados

| Grupo | Decisiones que se aprueban/rechazan conjuntamente | Razón del cambio |
| --- | --- | --- |
| G-01 | C-01/C-02/C-11: CommercialFamily y3relaciones/tablas precisas | Un catálogo en su owner platform y naming físico11; sin PackFamily paralelo ni workflow mutable innecesario. |
| G-02 | C-03/C-04: UsageLimit y contratos actuales | Reconciliar UL-01, exclusiones total/familia, publicación íntegra; no agregar condiciones a v1 ni unlimited por ausencia. |
| G-03 | C-05/C-07: raíz/activos/lineage/transiciones | Elegir garantías físicas, vínculos tipados y cierre de expiración exacto; no locks-only, timestamps heurísticos ni extensión implícita del pack. |
| G-04 | C-06/C-08/C-09/C-10: comando/API/RBAC/read/audit/replay | Cambiar permiso a acción canónica update; sólo comando específico; lectura propia/paginación; snapshot original seguro. |
| G-05 | H-01/H-04/H-05/H-06: disposiciones de binding legal y metodología | Conservar gates por hechos no demostrados, sin pedir ratificación falsa de suficiencia/leyes. |
| G-06 | H-02/H-03/H-07..H-12 y C-12: operación/aceptación/autoridad | Reusar aprobaciones/evidencia; preparar criterios de planes separados; ninguna autorización operacional implícita. |

Cambiar la nomenclatura o representación propuesta es material: debe reflejarse en el texto humano de rechazo/delta, no se transforma automáticamente por Codex. La aprobación íntegra adopta **sólo la propuesta única de este paquete**, incluida la disposición de mantener bloqueos factuales; no mezcla opciones del DRAFT anterior.

## 6. Revisión contra el rector activo

| Contrato superior | Contraste y resultado documental |
| --- | --- |
| 07/08/30/33 | Owner único comercial, relaciones tipadas, sin autoridad duplicada. Extensión nominal CommercialFamily ausente33→gate de nueva publicación; no se afirma que exista en baseline vigente. |
| 11físico/29rector | Namespace platform comercial, PK canonical, campos críticos en columnas/FKs; sólo snapshot/audit seguros en JSON/text. Sustituye namespaces/campos ambiguos de borrador. |
| 21§§15–16 | Parent y childclose con aristas/policies/permiso/eventos explícitos; initialactive como creación; no update_status ni nuevo estado de Subscription. Registry antes de código. |
| 22§§1/2/10/12 | DefaultDENY y Platform/Tenant separados; acciones update/read canónicas. **Hallazgo del DRAFT:** change_plan no es acción permitida; sustitución exige aprobación explícita, no alias. Recurso/acciones plataforma se publican como delta de catálogo, no permiso inferido. |
| 23/42§2.4 | **Hallazgo del DRAFT:** familias/límites sobre v1 publicadas cambian condiciones. Propuesta exige nuevas PlanVersion, retiene historia y bloquea activación incompatible; no edición retroactiva. |
| 25/contratos7/12 | CAS, replay exacto, ownership condicionado, TX/outbox/audit; rollback previo alcommit y delivery/retry posterior; sin distributed transaction o supplierIAM. |
| 26 | Integridad/aislamiento/secretos preservados; pruebas existentes no se repiten; evidencia faltante no se proclama PASS. |
| 37/41/42 | Familia no publica norma ni licencia ni concede capability; selección oficial depende de gate; GRC conserva clases futuras por datos/versiones, sin hardcode ISO o plan_code. |
| 17/19/38/29/49 | Ninguna firma confirma autosuficiencia inexistente, recencia inventada o NULL=none. Factores/coverage rector vigentes se reconocen sin reformular metodología. |
| 28/43/45/46/49 | La propuesta no elude gates; approval documental no firma artefactos futuros ni autoriza operación. Independencia humana interna no obligatoria por defecto; SoD operacional intacta. |

**Dictamen:** se corrigieron documentalmente alternativas del DRAFT que no pueden activarse tal como están (permiso, condiciones v1, namespace, root exclusion y expiración/lineage). La propuesta no declara ausencia total de gate: necesita enmienda nominal/registry/catálogos publicada y hechos/operación de H acreditados. Mientras eso falte, RECTOR_GATE de activación sigue BLOCKED. Una firma conjunta es válida para el diseño exacto aquí presentado; no habilita contradicciones con v1.8 ni permite ejecutar un delta no aprobado.

## 7. Evidencia existente reutilizada y verificaciones de este turno

Informe integral anterior:771unit/contractPASS y120PostgreSQLPASS, incluyendo7casos nuevos del alta; QAreadonlyTLSv1.3/30migraciones/172permisos/0UsageLimit. Se citan como resultados históricos del rescate13-10, no como pruebas corridas ahora ni como mecanismo change-plan terminado. Fuentes: tests-summary.json, postgres-results.json, qa-readonly.json y manifest-review.json.

En este turno: lectura íntegra del DRAFT,45§6,49§3, doce cláusulas/ledger/receipts, fuentes rectoras especializadas y evidencia; comparación de hashes del manifest existente; comprobación pasiva de51entradas de cada manifest rector y coherencia ACTIVE_ACTIVATION. **Ninguna suite aprobada se repitió, ningún script de migración/test se ejecutó y no se abrió conexión PostgreSQL/QA.**

Control de entrega efectuado:12cláusulas heredadas con sus seis campos requeridos,12decisiones comerciales,79artefactos heredados con bytes intactos y único path añadido igual a este archivo. Se calculó SHA-256 del paquete; HEAD y working tree heredado permanecen preservados. Es control documental, no una nueva prueba funcional ni resultado de aceptación. Archivos fuera de alcance modificados: NONE; supuestos usados como autoridad de producto: NONE; aprobaciones fabricadas:0.

## 8. Manifiesto de fuentes exactas, incluido en este único informe

El SHA del paquete completo se comunica al entregar el archivo; no se incrusta dentro de sí mismo porque cambiaría sus propios bytes. La firma debe identificar ese hash. Las fuentes siguientes permanecen intactas:

| Fuente | SHA-256 de bytes actuales |
| --- | --- |
| docs/governance/amendments/COMMERCIAL_PACK_FAMILY_20261013/DRAFT_CANONICAL_AMENDMENT.md | 4f0b9bf2ea346b26d65f79df7daa6165d25785a917dfea52a2d4d9d1b627c068 |
| docs/rector/BASELINE_ID | 76c5f58d48b99c68594d96861d2cc7ccdcd19cabaa759b5e5bb55667d6149761 |
| docs/rector/BASELINE_STATUS | 883d3bff9a26459c06c2dae4b4993c3f6bf4059f8abefb81bef9985f280237ff |
| docs/rector/ACTIVE_ACTIVATION.json | 6c3396ed9bd37e70f79d18c77cfd7421999114ab1aa20b6ea943df7c859b284a |
| docs/rector/RECTOR_MANIFEST.sha256 | e51f6539df119775b2feb8839907c8cd690623b82707b399aa15a31d59196533 |
| docs/rector/baseline/45_CONTRATO_DESARROLLO_CERRADO_Y_NO_INFERENCIA.md | e283b2a059aa7f1a563fb3ac1fc242eab6156232cb183217b38afe02a196d7ba |
| docs/rector/baseline/49_GOBIERNO_INTERNO_Y_REVISION_UNIPERSONAL.md | 544fd5083cf38ba5df954152d83cd02b65be3ce3f57e634ff47c685373de8c1b |
| docs/rector/baseline/21_LIFECYCLE_TRANSITION_MATRIX.md | af1b6eed6bcb13c7ddebf9d0b3dc2a44cfc7f230c866d6c1c44da23d1fc888a5 |
| docs/rector/baseline/22_RBAC_PERMISSION_SCOPE_MATRIX.md | d47a594ee78863b2b294128f7cb3696b36d991d5f653a2836ee57896ed1b23f9 |
| docs/rector/baseline/23_CONTRATO_TEMPORAL_VERSIONADO_RETENCION_RECALCULO.md | 27fe799dc0bf1dcefb1e8af7efb56e1b019b934d8d18b0f6a957f6d162eff50a |
| docs/rector/baseline/25_API_EVENTOS_IDEMPOTENCIA_AUDITORIA.md | 683d2c0f17ed0cf0aedb6ed107b3dc69d68a664b06ef019c01bfb8b87f4d633b |
| docs/rector/baseline/33_CATALOGO_ENTIDADES_CANONICAS.md | 7e2cb028aca17a448a7f9010aa71f9af0094adfd3366f74e86fc1c46651c94d0 |
| docs/rector/baseline/42_PLANES_COMERCIALES_Y_ROLES_BASE.md | 1d3ab34978339da234e8b5676e645fe799b94f7fdef45a2e46517fc8b16bdf59 |
| docs/physical-data-model/01_PHYSICAL_DATA_MODEL.md | cdbee203ac9afe9f89cbb4320f6b7010a0e315bc160d2be6134ed3c2a15fabd5 |
| docs/physical-data-model/11_PHYSICAL_NAMING_STANDARD.md | 59aa0e55cb44d1986544101ffaeddb352f32023114027dac7c98ceee3af17803 |
| docs/governance/MASTER_EXECUTION_STATUS.md | 8cbcb1e5d44080770e7b8f0b55a1d2adca672f0492428d8f8df7725b39ae0aa8 |
| docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md | 85bc72b94021adf28444e3ae6d2fc7a354873fa3fe85004f1314d3bd269c862f |
| docs/phase6a/STEP_6A3/SOLO_OWNER_GOVERNANCE_PROPOSAL_20261009_V2/07_RESULT.json | fc3e8267f6d5c6e1a27d2aaee8e04d2b2251a1f0b608c4ea7c3b7a4184d719c6 |
| docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/MACRO_APPROVAL_RECEIPT_R1.json | 335c40cac78b6bfcf01f7b840786d62ad74ea8f24d7bd59d0fb95f2f1f8c6739 |
| docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/RESIDUAL_MACRO_R2/APPROVAL_RECEIPT_R2.json | eed714be808cf63ea5b32c750fa003336851bb6545044a9fe051ed1c053334b1 |
| docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/MACRO_APPROVAL_RECEIPT_R3.json | 3d69c54a089e0996096b6b37eab1ec45c320f96771c97030c2741fd2afff816d |
| docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/RESIDUAL_MACRO_R2/04_CFGD_CORRECTED_SUFFICIENCY_REVIEW.md | 1cfe108bd90e119e2107a2cb4060dcd8673ceb6bd4f1a7e59f90e39bdb5645d1 |
| docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/RESIDUAL_MACRO_R2/05_RETENTION_TYPED_BINDING_FINDING.md | 79c2c1bb11c403bd34e5bcbc5826a3c12ae91c4063a866288d6afcf1c2794326 |
| docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/evidence/integral-closure-20261013/manifest-review.json | 062130543d20443c997b2db668ec87f0d0e7acec87647ec4d26939fba6829fbe |
| docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/evidence/integral-closure-20261013/inherited-pending-clauses.json | bb0ab0821bad562a01687d02af1387c0fe34b9900ee385330931a27c6a8e2dd0 |
| docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/evidence/integral-closure-20261013/tests-summary.json | 15821424e4df75eb32de260651e9628190fa4103938d18e8c80390c065008f91 |
| docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/evidence/integral-closure-20261013/qa-readonly.json | 78f7873fdad2b5cd24c03968b58b9f0f462d605393376b70f0ff163c9b1d9d58 |

## 9. Texto exacto de aprobación o rechazo humano

**Formulario sin firmar.** Identidad, fecha y hash del paquete los aporta el responsable humano; esos campos no se presentan como hechos ya registrados. La fecha efectiva de publicación futura no se inventa hoy. Sólo se solicita esta aprobación formal, no ejecución ni cifras comerciales.

```text
DECISION_ID=DR-STEP6A3-COMMERCIAL-GOVERNANCE-20261013-01
PACKAGE_ID=GP-STEP6A3-COMMERCIAL-20261013-01
PACKAGE_FILE=docs/phase6a/STEP_6A3/STEP_6A3_COMMERCIAL_GOVERNANCE_APPROVAL_PACKAGE.md
PACKAGE_SHA256=[hash SHA-256 comunicado junto al archivo recibido]
HUMAN_IDENTITY=[nombre real del responsable]
HUMAN_FUNCTIONS=[funciones realmente ejercidas al revisar: Producto, Arquitectura,
Modelo de Datos, Backend, Seguridad, Privacidad/Legal, Methodology y QA/Release]
SIGNED_AT_UTC=[fecha/hora real ISO8601 UTC de esta decisión]

Apruebo íntegramente el texto exacto de este paquete, cuya trazabilidad usa
las fuentes identificadas por hash, en las funciones declaradas bajo45§6 y49§3.
Apruebo conjuntamente G-01..G-06, decisiones C-01..C-12 y disposiciones H-01..H-12.
Acepto las correcciones explícitas al DRAFT COMMERCIAL_PACK_FAMILY_20261013,
incluidos catálogo único platform, UsageLimit, nuevas PlanVersion,
lineage tipado/exclusiones, permiso platform.subscription.update para el comando
específico, lecturas/auditoría/replay y conservación de expiración de los packs.

Esta firma aprueba el diseño contractual exacto y las disposiciones documentales
para elaborar y presentar su reconciliación gobernada. No declara aprobada una
baseline sucesora ni un DDL/OpenAPI/manifest futuro aún no revisado por hash.
No certifica autosuficiencia CFG-D, aplicabilidad legal, cantidades comerciales,
inventario histórico o aceptación runtime sin la evidencia concreta requerida.
No convierte en DONE/PASS ninguna cláusula por el acto de firmar.

No autorizo cambios de estado de gobernanza, IAM, DDL/DML PostgreSQL, QA,
commit/push/merge/deploy, STEP_6A4, intermedio normativo ni STEP_6A5 en esta
intervención. La activación/implementación posterior requiere publicación de
los deltas exactos, sus gates y el mandato operacional correspondiente.
```

Para rechazo conjunto, usar los mismos campos de identidad/funciones/hash/fecha y sustituir los párrafos de aprobación por:

```text
Rechazo el paquete GP-STEP6A3-COMMERCIAL-20261013-01 identificado por el hash indicado.
Grupos/decisiones rechazados: [IDs exactos].
Motivo y delta contractual solicitado: [texto exacto].
Las decisiones no rechazadas no se consideran aprobadas por silencio.
No autorizo activación, implementación u operación y preservo los estados vigentes.
```

El humano puede aprobar con una sola firma de funciones acumuladas; si decide aprobar sólo un subconjunto deberá enumerar IDs exactos, y las dependencias de grupos rechazados mantendrán bloqueadas las decisiones dependientes. No se solicita una nueva ronda por cada cláusula. Este formulario no es un receipt ni una firma de Codex.

## 10. Entrega y detención

Se entrega únicamente este informe. Sólo cambió documentación propuesta nueva; PostgreSQL, IAM, modelo/contratos activos, backend, frontend, infraestructura, deployment y estados de gobernanza no cambiaron en este turno. Pruebas ejecutadas:0; evidencia previa reutilizada por hash; controles documentales descritos en§7. No nuevas cantidades, excepciones, estructuras legacy, catálogos paralelos o fallback de dominio.

Rector activo permanece TCDX_GRC_MASTER_REGENT_BASELINE_v1.8_2026-10-09. STEP_6A3 permanece PARTIAL_BLOCKED y STEP_6A4 NOT_STARTED. Se detiene aquí para solicitar exclusivamente aprobación o rechazo formal mediante§9 sobre el hash entregado; no se materializa ninguna decisión candidata mientras se espera.
