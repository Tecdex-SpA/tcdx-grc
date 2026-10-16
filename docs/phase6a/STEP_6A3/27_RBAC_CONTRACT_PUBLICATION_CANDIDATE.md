# P-RBAC — deltas contractuales candidatos tras aprobación PO

Master activo: `TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23`. `TASK_ID=STEP_6A3_PO_RECONCILIATION_20261008`; `CODEX_VARIATION_BUDGET=ZERO`.

Estado: **DRAFT / PROPOSED_NOT_PUBLISHED**. Dirección PO `APPROVED_2026_10_08`; revisión técnica `PENDING_REVIEW`. Rector 45 §§2,3,5,6 y 46 §§3,5,6,8 autorizan esta propuesta documental y mantienen bloqueada la publicación. Registro único de firmas: [26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md](26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md); ningún otro archivo de este paquete registra aprobaciones.

## Base incorporada y delta

Se incorpora como base candidata 20 §§4–10, no como contrato vigente. Citas: docs/phase6a/STEP_6A3/20_P_RBAC_PUBLICATION_DECISION_PACKET.md:40 (C-01), :54 (CT01), :68 (CT03), :84 (CT04), :106 (grants). Este delta hace cerradas las combinaciones de query, tipos y condiciones de activación; no publica rutas, schemas, Permission ni RolePermission. Referencias a SQL abajo son pseudocódigo de diseño; no son funciones existentes ni DDL/queries ejecutadas.

## OpenAPI propuesto por operación

Los tres GET son relativos a `/api/v1` y no tienen body. `security: [{bearerAuth: []}]`; parámetros publicados CorrelationId/TenantContext; contexto tenant autenticado obligatorio, sin modo Platform. En cada operación se propone `x-tcdx-transaction-boundary: RO`, `x-tcdx-idempotency-class: NATURALLY_IDEMPOTENT`, audit/domain events `NONE`, ninguna Idempotency-Key. Responses: 200 con envelope cerrado tipado abajo; 400/401/403/404/409/422/503 con error06 vigente. La versión propuesta es `STEP6A3_REFERENCE_READS_v1_DRAFT` y su vigencia es PENDING_SIGNED_PUBLICATION.

| Path / operationId | Permission propuesta | Scope permitido | Entitlement y objeto padre |
|---|---|---|---|
| `/framework-version-references` / frameworkVersionReferenceList | compliance.framework.read | tenant | ISO_COMPLIANCE; select sin parent; history SoA exacto con compliance.soa.read |
| `/membership-references` / membershipReferenceList | platform.membership_reference.read | tenant, assigned_object, owned_object, audit_engagement | CORE_PLATFORM + dominio del propósito; target EvidenceRequest, Issue o parent histórico según variante |
| `/retention-policy-references` / retentionPolicyReferenceList | privacy.retention_policy_reference.read | tenant, assigned_object, owned_object | EVIDENCE_DOCUMENTS + permiso de command/read del parent; upload conserva tenant |

Scope real procede de MembershipRole, no de role_permissions. La resolución sobre target/parent y SoD es independiente del rol. No se amplían organizational_unit/process/service. Un rol Platform sin autoridad tenant explícita es DENY. Extensiones de recurso de rector22 se elevan a Architecture/Security, nunca se infieren desde el path.

Request común: `page[size]: integer [1,100], default 25`; `page[cursor]: string maxLength 2048`; `filter[query]: string [2,160]` sólo en selección; IDs `$ref: UuidV7`; purpose enum por operación. Rechazar query desconocida/duplicada, string vacía, combinación incompatible y query tenant/email/identity/role/state. UUID nunca como nombre/criterio empresarial. Todas las queries usan `style: form, explode: true`; los nombres con corchetes son literales.

| Operación/variante | Request específico cerrado (además de paginación) | Restricciones de combinación |
|---|---|---|
| F select | purpose=select (default), filter[query]?, filter[framework_id]?, filter[framework_version_id]? | statement_of_applicability_id prohibido; si ambos filtros ID, root/version deben corresponder |
| F history | purpose=history, statement_of_applicability_id, filter[framework_version_id] | ambos obligatorios; filter[query]/filter[framework_id] prohibidos; sólo FK exacta del SoA |
| M evidence-request-assignment | purpose, exactamente uno: requirement_id/control_id/requirement_assessment_id/control_assessment_id/assurance_test_id; filter[query]?; filter[tenant_membership_id]? | EvidenceRequest.create, scope sobre target, EVIDENCE_DOCUMENTS; restantes parent IDs prohibidos |
| M action-assignment | purpose, issue_id; filter[query]?; filter[tenant_membership_id]? | action.create, scope sobre Issue, ISSUES_ACTIONS; restantes parents prohibidos |
| M evidence-request-history | purpose, evidence_request_id, filter[tenant_membership_id] | EvidenceRequest.read + EVIDENCE_DOCUMENTS; sólo requester/assigned FK; query de nombres/otros parents prohibidos |
| M action-history | purpose, action_id, filter[tenant_membership_id] | Action.read + ISSUES_ACTIONS; sólo assigned FK; restantes parents/búsqueda prohibidos |
| M assurance-test-history | purpose, assurance_test_id, filter[tenant_membership_id] | AssuranceTest.read + CONTROLS_ASSURANCE; sólo executor/reviewer FK; restantes parents/búsqueda prohibidos |
| R upload | purpose=upload; filter[query]?, filter[policy_kind]?, filter[version_number]?, filter[retention_policy_id]? | document.create tenant; todos los parent IDs prohibidos; policy_kind enum físico existente, version_number int64 >=1 |
| R evidence | purpose=evidence; file_object_id?; mismos filtros de selección | evidence.create; FileObject si se aporta exige read autorizado/scan PASS; evidence_id/intent_id prohibidos |
| R history | purpose=history, exactamente un evidence_id/file_object_id/file_upload_intent_id; filter[retention_policy_id] | permiso de lectura vigente del parent; filtro ID obligatorio y FK exacta; query/kind/version prohibidos |

No se amplía historia por paginación: máximo una referencia. Cursor no sustituye parent ni grant. Su firma/autenticación versionada debe cubrir operation, actor membership, tenant, purpose, parent, filtros, queryInstant, orden y policy version; tamaño/tampering/contexto distinto 400. Cambios de autoridad se revalidan por página y command; no confiar en un hash sin autenticidad.

### Responses tipadas propuestas (OpenAPI 3.1)

Todos los objetos usan `additionalProperties: false`. Envelope `type: object; required: [items,page]`, items array con item schema específico y page `required: [has_more,next_cursor]`, has_more boolean y next_cursor `type: [string,'null']; maxLength: 2048`. Los campos de cada item son required; `nullable` abajo significa unión con null, no omisión. UUIDv7 y UTC usan schemas ya publicados. Strings de nombre text no reciben longitud inventada; el catálogo firmado preserva límites físicos.

| Item schema propuesto | Properties exactas y tipos |
|---|---|
| FrameworkVersionReference | framework_version_id/framework_id UUIDv7; framework_code/edition string max128; framework_name string; version_number integer int64 >=1; ownership_class enum canónico [GLOBAL_REFERENCE,PLATFORM_CONTROL,TENANT_OWNED,TENANT_DERIVED]; lifecycle_state string max32; effective_from/effective_to/published_at UTC nullable; access_mode enum [official,non_authoritative_validation]; selectable boolean |
| MembershipReference | tenant_membership_id UUIDv7; display_name string; joined_at UTC; selectable boolean |
| RetentionPolicyReference | retention_policy_id UUIDv7; policy_code string max128; version_number integer int64 >=1; policy_kind enum [legal_hold,mandatory_regulatory_policy,contractual_policy,tenant_policy,product_baseline]; retention_seconds integer int64 >=0 nullable; trigger_event_code enum [expiry_or_closure]; precedence_rank integer enum [500,400,300,200,100]; is_mandatory boolean; ownership_class enum canónico; lifecycle_state enum [draft,under_review,approved,published]; effective_from/effective_to UTC nullable; selectable boolean |

Minimización M es de red: no emails, user_identity_id, identity/provider IDs, roles/grants, estado administrativo ni último acceso. joined_at sólo conforme a C-03A firmado y para desambiguación contextual; no se introduce otro atributo personal. Query no se registra en logs. F no expone texto protegido ni Controls; R no expone fuentes jurídicas/protected content ni detalles de hold.

### ObjectPolicy SQL/semántica candidata

Variables bound del backend: `actorTenant`, `actorMembership`, `queryInstant`, `parentId`, `candidateId`; nunca concatenación del caller. Los términos `authorized_parent`, `official_effective_pack`, `exact_parent_fk`, `scope_allows` y `sod_allows` son predicados **contractuales de este diseño**, que deben expandirse en joins autorizados del backend al implementar, no funciones/estructuras ya presentes. Definición: authorized_parent = permission + capability + tenant + scope + ObjectPolicy/SoD del parent publicado; exact_parent_fk = igualdad de una FK tipada enumerada en la tabla de variantes; scope_allows = relación canónica real del actor con ese parent/target, o grant tenant explícito; official_effective_pack = cálculo existing effectivePacks de pack-entitlement.ts, sin inferir licencia de metadata.

```sql
-- F select, root/version ownership coherente antes de ORDER/LIMIT:
(fv.tenant_id = :actorTenant AND f.tenant_id = :actorTenant
 AND fv.lifecycle_state = 'published' AND f.lifecycle_state = 'published'
 AND (fv.effective_from IS NULL OR fv.effective_from <= :queryInstant)
 AND (fv.effective_to IS NULL OR fv.effective_to > :queryInstant))
OR (fv.tenant_id IS NULL AND f.tenant_id IS NULL
    AND official_effective_pack(fv.framework_version_id)
    AND root_and_version_published_and_effective)
-- tercera rama sólo C02 firmado: nonAuthoritativeValidationPacks exacto,
-- nonproduction y tenant demo/test gobernado; nunca legal applicability.

-- M assignment, además de authorized target/Issue y grant command:
m.tenant_id = :actorTenant AND m.membership_state = 'active'
AND m.joined_at <= :queryInstant
AND (m.ended_at IS NULL OR m.ended_at > :queryInstant)
AND u.lifecycle_state = 'active' AND length(trim(u.display_name)) > 0
-- join u por FK identity interna, sin devolverla.

-- R select, además de parent/command y autorización del tipo global:
rp.lifecycle_state = 'published' AND rp.effective_from IS NOT NULL
AND rp.effective_from <= :queryInstant
AND (rp.effective_to IS NULL OR rp.effective_to > :queryInstant)
AND (rp.tenant_id = :actorTenant OR signed_global_discovery(rp))
-- history F/M/R: authorized_parent AND exact_parent_fk AND
-- autoridad de metadata global conservada; no exigencia de active actual
-- para mostrar una referencia histórica, selectable=false si inelegible.
```

Para F global, vigencia/root/version se verifican igual que tenant; Pack no publicado/expirado/no asignado excluido. El histórico sólo preserva FK referenciada y acceso autorizado actual, nunca reabre Pack. Para R, signed_global_discovery significa: product_baseline sólo C-04G-1; mandatory_regulatory_policy sólo C-04G-2 con Source→ImportManifest→PackVersion oficial efectiva y `selectable=false`; contractual/hold global DENY por C-04G-3 sin binding. Nunca derivar aplicabilidad legal al objeto de Source/Pack. M historical devuelve sólo miembro exacto de parent autorizado; inactive/ended no se selecciona en creación.

Orden F: framework_code ASC, version_number DESC, id ASC; M display_name ASC, joined_at ASC, id ASC; R policy_code ASC, version_number DESC, id ASC. SQL filtra tenant, grants, entitlement, policy, vigencia y propósito antes de DISTINCT/LIMIT/has_more. Fetch size+1 sobre conjunto autorizado, cursor keyset sobre tupla completa de orden. No totales ocultos ni filtro tardío en UI.

### Errores, auditoría y simetría

Envelope exacto: docs/executable-contracts/06_ERROR_MODEL.md:14. 400 VALIDATION.FAILED; 401 AUTHENTICATION.REQUIRED/INVALID; 403 AUTHORIZATION.DENIED en contexto visible; 404 RESOURCE.NOT_FOUND para ajeno/oculto; 409 CONFLICT.RESOURCE para ambigüedad visible; 422 INVARIANT.VIOLATION para obligación/selección incompatible; 503 DEPENDENCY.UNAVAILABLE si dependencia inaccesible. CorrelationId/retryable/allowlisted details de contrato vigente; sin SQL, PII, UUID ajeno o counts ocultos. Empty autorizado 200; DENY/fallo no son empty. 401/403 invalidan cache/opción del consumidor.

GET RO no genera AuditEvent/outbox de dominio. Telemetría existente sólo contexto autorizado, operation/purpose, resultado, correlation y versión; denegaciones conforme a policy actual; sin nombres/queries/listas personales. Publicación de Permission/grants requiere auditoría reforzada aprobada. No se fabrica evento nuevo.

C-03B: en command de asignación, mismo predicado de elegibilidad al instante transaccional y autorización parent/target revalidada; si miembro terminó entre GET y create, rechazo sanitizado y cero mutación. No endurecer lectura histórica. C-04W: command revalida policy, vigencia, binding legal, prioridad y continuidad upload→FileObject→Evidence; policy seleccionada no reduce hold/mandatory/contract. Ningún command puede eludir obligación por elegir baseline o plazo más largo. Validación actual sólo existence/tenant (service.ts:177/204/263) no prueba estas reglas; no se modifica en este turno. F create revalida versión y autoridad de contenido, sin asumir que Controls fue contratado.

## Matriz candidata y mínimo por propósito

| role_code | Antes F/M/R | Candidato F/M/R | Propósito permitido sólo con grants/policy correspondientes |
|---|---|---|---|
| PLATFORM_ADMIN | 0/0/0 | 0/0/0 | ninguno; Platform no es tenant |
| PLATFORM_SUPPORT | 0/0/0 | 0/0/0 | ninguno |
| TENANT_ADMIN | 0/0/0 | 0/0/0 | conserva lecturas administrativas; ningún permiso empresarial implícito |
| EXECUTIVE_BOARD_VIEWER | 0/0/0 | 1/1/1 | F read; M/R sólo history parent autorizado |
| GRC_MANAGER | 0/0/0 | 1/1/1 | F; M request/action; R sólo history salvo command grant independiente |
| QUALITY_MANAGER | 0/0/0 | 1/1/1 | F; M action; R history |
| COMPLIANCE_MANAGER | 0/0/0 | 1/1/1 | F; M request/action; R history |
| RISK_MANAGER | 0/0/0 | 0/1/0 | M action/history Action; no Risk runtime nuevo |
| CISO_SECURITY_MANAGER | 0/0/0 | 1/1/1 | F; M/R history |
| AI_GOVERNANCE_MANAGER | 0/0/0 | 1/1/1 | F; M/R history |
| PRIVACY_MANAGER | 0/0/0 | 1/1/1 | F; M/R history; retención admin conserva PRIVACY |
| LEGAL_REVIEWER | 0/0/0 | 1/1/1 | F; M/R history; ninguna aprobación automática |
| AUDITOR_LEAD | 0/0/0 | 1/1/1 | F; M request/action; R history |
| AUDITOR | 0/0/0 | 1/1/1 | F; M request; R upload por document.create; M action DENY por RBAC-D01 |
| PROCESS_OWNER | 0/0/0 | 0/1/0 | M sólo history de Action/Assurance autorizado |
| CONTROL_OWNER | 0/0/0 | 0/1/1 | M request; R upload; history sólo parent permitido |
| EVIDENCE_OWNER | 0/0/0 | 0/1/1 | M history; R upload/evidence; sin autoaprobar |
| ACTION_OWNER | 0/0/0 | 0/1/0 | M history Action; sin create/verificación implícita |
| SUPPLIER_MANAGER | 0/0/0 | 0/0/0 | ninguno |
| CONTINUITY_MANAGER | 0/0/0 | 0/0/0 | ninguno |
| REGULATORY_CONTENT_STEWARD | 0/0/0 | 1/0/0 | F read, sin publicación editorial |
| DATA_ADMIN | 0/0/0 | 0/0/0 | ninguno |
| REPORT_VIEWER | 0/0/0 | 1/1/1 | F read; M/R history |
| VIEWER | 0/0/0 | 1/1/1 | F read; M/R history |

Verificación mecánica: F=13, M=17, R=14; total **44** pares RolePermission por set completo. Nuevas permissions efectivas publicadas=0; nuevos grants efectivos publicados=0. No se cuenta un total de tenants ni grants de QA.

Prueba del mínimo contractual para **selección más labels históricos completos**: F = 11 lectores contractuales Requirement (Permission05:59/60) ∪ 12 lectores SoA (Permission05:126), unión 13. M = 14 lectores EvidenceRequest (:130) ∪ 17 Action (:133) ∪ 12 AssuranceTest (:129), unión17. R = 14 Evidence (:131) ∪ creadores upload/evidence, unión14. Cada rol extra del picker tiene un parent histórico concreto, no derecho de enumerar candidatos. M7 = unión creadores EvidenceRequest5 y Action5 (3 comunes); R3 = Evidence Owner/Control Owner/Auditor. La alternativa sólo pickers sería F11+M7+R3=21, **23 pares menos** (F−2/M−10/R−11), pero deja referencias históricas sin cierre; no se adopta ni se presenta como reducción equivalente. F13/M17/R14 es mínimo de unions de lectores declarados bajo esos propósitos, no mínimo universal de una revisión Security ni prueba de grants materializados. No se detectó corrección numérica equivalente sin perder cobertura; no se amplían scopes ni se alteran44.

RBAC-D01: propuesta de reconciliación al catálogo de cinco roles action.create: AUDITOR no adquiere propósito action-assignment mediante esta matriz. Seed extra se conserva; Security/Architecture/Domain Actions firman DR de discrepancia antes de cualquier publicación/revocación futura. Actual authority audit/read no cambia. RBAC-D02: once lectores Requirement son declarados; el Permission existe sin RolePermission demostrados en migrations. No se cuentan como once grants. Publicar distribución de requirement.read es una decisión futura independiente, no inferida de F13. Evidencia: docs/phase6a/STEP_6A3/20_P_RBAC_PUBLICATION_DECISION_PACKET.md:32 y :34; seeds actuales inspeccionados, sin consulta QA.

## Activación y aceptación

C-01/02/03A/B/04/G-1/2/3/W, C-06F/M/R, C-07/08 y D01/D02 se firman individualmente en26. Nueva release coordinada OpenAPI02/matriz03/Permission05/seeds09/traceability18, hashes y nomenclatura rector22 reconciliados antes de código. Autorización operacional distinta para catálogo/grants, preflight de roles/templates/tenant instances y snapshot de grants; distribución forward-only idempotente, sin modificar seeds históricos ni memberships/custom roles. Sólo luego backend y pruebas nuevas. Revocación futura de grants nuevos es compensación auditada; conserva historia. Ningún paso ejecutado aquí.

Pruebas negativas exactas RBAC-C01..18 de20: ausencia grant/capability/scope, cross-tenant/Platform/M2M, Packs no elegibles, parent oculto/no FK, PII de red, cursor inválido, falta binding global, cambio concurrente, SoD y distribución idempotente. C-08 fija aceptación, no PASS. Estado: NOT_RUN_PROPOSED_CAPABILITY. Contratos/509 unit de este turno sólo prueban alcance existente.
