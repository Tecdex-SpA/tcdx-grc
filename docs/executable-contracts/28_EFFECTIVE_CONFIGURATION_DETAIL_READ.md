# EffectiveConfiguration detail read — v1

CONTRACT_ID=EC-DETAIL-READ-v1-L03-R1
CONTRACT_VERSION=1
STATUS=PUBLISHED_LOCAL_CONTRACT
MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23

Owner funcional: Product Owner único. Aprobación humana declarada2026-10-09 por funciones Architecture Owner, Backend Owner y Security & Privacy Reviewer, fuente y límites en [registro único26](../phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md), secciónDR-STEP6A3-EC-DETAIL-R1-20261009. No firmaCodex, nombre civil, independencia ni credenciales atribuidos. R43§6 permite funciones acumulables; R45§5/6 exige registro previo a código. Publicación contractual local, no operaciónQA/BD/deploy ni aceptación runtime.

## Texto y schema versionados

Fuente normativa humana exacta: [06 — EC-R1.1..8, tabla y JSON Schema](../phase6a/STEP_6A3/SOLO_OWNER_GOVERNANCE_PROPOSAL_20261009_V2/06_NEXT_EXECUTABLE_BATCH.md), bloqueEC-DETAIL-READ-v1-L03-R1. SHA-256 exacto159c2fac9a5d2006900f49ee020521146f2e85baeec9233c8a8f07429bc28163; no se altera ese bloque. Schema anexo SHA-256 UTF-8 indent2+newline: 001aaff210ba9e237c58107c43c4719d35276ff47143fb733a5a963e1d1878ee; materializado sin cambios semánticos en OpenAPI02/components/schemas/EffectiveConfigurationDetailReadResult.

GET /api/v1/effective-configurations/{id}, effectiveConfigurationGet, Bearer humano/TenantContext+membership vigente+CORE_PLATFORM+permiso configuration.effective_configuration.read con grant tenant. DENY todos los scopes sin binding (platform/assigned/owned/orgunit/process/service), sin inferir ownership de creator. ID UUID, ningunaquerycontextual. Una sentencia de metadata; root tenant del actor, todas las layers mismo tenant y cadaDefinition/Override existente, mismo tenant o global-compatible. Nunca interpretar NULL de referencia ausente como global; no ocultar sólo las capas inválidas. Ausencia/inaccesibilidad404 idéntico. RO/NAT/auditNONE/domainNONE.

Result cerrado de ocho campos exactos y capas cerradas según schema; version_number decimal string int64 positivo1..9223372036854775807, sin JS number. Status/nivel strings originales≤32, desconocidos e históricos conservados, sin nuevos enums/alias ni valores efectivos/secretos/actores. Subject/Override nullable. Timestamps UTC. Layers completas, sin paginación; orden presentación ordinal ASC, raw nivel COLLATE C ASC,overrideID ASC NULLS FIRST,layerID ASC interno. No ranking/cálculo de precedencia.

400 VALIDATION.FAILED por shape/query;401 REQUIRED/INVALID con Bearer challenge;403 AUTHORIZATION.DENIED por scope/entitlement/permiso/contexto;404 RESOURCE.NOT_FOUND idéntico por ausencia/linaje inaccesible;409 CONFLICT.RESOURCE sólo duplicado(level,ordinal) o dosselected del mismo nivel;200 códigos persistidos incluso conflict;500 INTERNAL.FAILURE sanitizado por metadata inválida/fallo. No422 de resultado oficial. No-store/Vary Authorization,X-TCDX-Tenant-Id; correlation/requestIDs.

## Supersesión acotada y límites

Supersede sólo propuesta de detalle21§8: version_number wire decimal string; códigos bounded string históricos en esteGET; orden únicamente presentación; conflicto estructural409 vs metadata200. No publica enums ni discovery efectivo contextual de21. Scopes del catálogo no se amplían ni se borran: no vinculadosDENY. Permission/grants existentes sin modificación. No mode none, bindingMethodology, métodosglobales, snapshots, UQ/default/modelo/DDL, SOG/48cláusulas o operación deambiente.

## Test contract y estado

HTTP local:200/400/401/403/404/409/500, ausenciaBearer401 sinSQL, invalidshape400 sinSQL de objeto, membership/entitlement/scope/tenant, referencias ausentes/foráneas sin filtración, unknown/conflict200, duplicados409, ordinal positivo/codes bounds/UUID/hash/UTC/int64, no cache, no materialización/writes. Probar schema enlímites exactos y comparar result deHTTP con schema. Las64 pruebas HTTP locales usan ejecutores sintéticos; las16 pruebas PostgreSQL RO ejecutan el SQL real con fixtures CTE, sin mutar filas. No prueban constraints mediante inserciones ni RLS: físico05§4 lo declara futuro. QA, IAM real y E2E externo permanecen NOT_RUN. Gate funcionalSTEP6A.3 permanecePARTIAL_BLOCKED y6A.4NOT_STARTED.
