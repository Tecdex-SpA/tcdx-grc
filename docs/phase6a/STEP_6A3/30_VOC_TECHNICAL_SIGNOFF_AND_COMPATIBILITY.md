# P-VOC — manifest DRAFT, publicación técnica y compatibilidad

Master activo: `TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23`. `TASK_ID=STEP_6A3_PO_RECONCILIATION_20261008`; `CODEX_VARIATION_BUDGET=ZERO`.

Estado: **DRAFT / PROPOSED_NOT_PUBLISHED**. Dirección PO `APPROVED_2026_10_08`; revisión técnica `PENDING_REVIEW`. Rector 45 §§2,3,5,6 y 46 §§3,5,6,8 autorizan esta propuesta documental y mantienen bloqueada la publicación. Registro único de firmas: [26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md](26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md); ningún otro archivo de este paquete registra aprobaciones.

## Verificación mecánica

CSV22 SHA-256 `8a9669d3389eba33be3640756777c35642a5d910567082cdd1fc12bf91c66239`: exactamente **52 filas / 14 familias / 26 FIELD_ID únicos**; ninguna pareja familia/value duplicada. 4 ocurrencias con mapping autorizable (CV01:1, CV04:1, CV14:2); 22 con contrato nuevo. Matriz17 conserva29 filas=26 CV+3 CF, sin reescribir sus fuentes erróneas históricas. Matriz corregida23:29–54 es la fuente de procedencia actual.

Manifest [29_VOC_PUBLICATION_MANIFEST_CANDIDATE.csv](29_VOC_PUBLICATION_MANIFEST_CANDIDATE.csv):52 filas, una por familia/value. Copia exacta de codes/labels/definitions/restrictions/owner/version/provenance delCSV22; sólo el estado de esta propuesta se distingue mediante source_state y state. Cero filas publicadas o seleccionables. effective_from/effective_to vacíos con effective_status=PENDING_SIGNED_MANIFEST_NO_DATE; fecha de PO no se usa como vigencia. Hash family_payload_sha256 = SHA256 de array de filas fuente de esa familia en ordenCSV22, JSON UTF8 ensure_ascii=false, sort_keys=true, separadores coma/dos puntos sin espacios. CSV global hash cubre bytes íntegros del22.

El manifest añade resolved_source_references sin cambiar source_references de CSV22: CV02 corrige rector24:39 (vacía) a docs/rector/baseline/24_CONTRATO_EVIDENCIA_DOCUMENTOS_ARCHIVOS.md:43; CV11 corrige rector19:104 (vacía, sección Appetite) a docs/rector/baseline/19_METODOLOGIAS_GRC_COMPLIANCE_RISK_ASSURANCE.md:128 (Finding/Risk). Son ocho filas con corrección de anclaje, cero cambios de code/label/definición aprobada.

## Schemas OpenAPI propuestos por familia

Cada schema DRAFT es `type: string; minLength: 1; maxLength: N; enum: valores exactos debajo`. Aplicar sólo a property de la ocurrencia enumerada; sin default. No reemplazar enums de otro owner ni narrowing de lecturas históricas. Publicación requiere VOC-C01..06 y cláusula de familia, compatibilidad y manifest firmado. Valores no se generan desde CSV29/22 en runtime.

| Familia / cláusula | Schema propuesto / maxLength | Enum exacto aprobado funcionalmente | Owner | FilasCSV22 |
|---|---|---|---|---|
| CV-01 / CV01-A | FileClassification / 32 | public, internal, confidential, restricted | Evidence + Security & Privacy Reviewer | 2,3,4,5 |
| CV-02 / CV02-A | EvidenceType / 64 | document, record, image, report | Evidence Domain Owner | 6,7,8,9 |
| CV-03 / CV03-A | ControlFrequency / 64 | continuous, daily, weekly, monthly, quarterly, semiannual, annual, event_driven | Controls Domain Owner | 10,11,12,13,14,15,16,17 |
| CV-04 / CV04-A | SoAApplicabilityDecision / 32 | applicable, not_applicable | Compliance Domain Owner | 18,19 |
| CV-05 / CV05-A | SoAImplementationState / 32 | not_implemented, partially_implemented, implemented, not_applicable | Compliance + Controls Domain Owners | 20,21,22,23 |
| CV-06 / CV06-A | ActionEvidenceLinkRole / 32 | closure | Actions + Evidence Domain Owners | 24 |
| CV-07 / CV07-A | IssueOriginRole / 32 | trigger | Actions Domain Owner | 25 |
| CV-08 / CV08-I/A/C | IssuePriority;ActionPriority / 32 | urgent, high, normal, low | Actions Domain Owner | 26,27,28,29 |
| CV-09 / CV09-A | EvidenceRelevance / 32 | relevant, partially_relevant, not_relevant | Evidence Domain Owner | 30,31,32 |
| CV-10 / CV10-A | AssuranceSelectionMethod / 64 | census, random, stratified_random, systematic, judgmental | Assurance Domain Owner | 33,34,35,36,37 |
| CV-11 / CV11-A | IssueSeverity / 32 | critical, major, moderate, minor | Actions / Finding Domain Owner | 38,39,40,41 |
| CV-12 / CV12-A | EvidenceSourceKind / 32 | uploaded, system_record, human_observation, external_record | Evidence Domain Owner | 42,43,44,45 |
| CV-13 / CV13-A | EvidenceSufficiency / 32 | sufficient, partially_sufficient, insufficient | Evidence Domain Owner | 46,47,48 |
| CV-14 / CV14-A | SuggestedBusinessOwnerRole / 96 | COMPLIANCE_MANAGER, CONTROL_OWNER, PROCESS_OWNER, QUALITY_MANAGER, CISO_SECURITY_MANAGER | Controls Domain Owner + Security Reviewer | 49,50,51,52,53 |

IssuePriority y ActionPriority se mantienen schemas separados. CV08-I firma Issue, CV08-A firma Action; CV08-C firma explícitamente si pueden compartir fuente contractual. Igual lista no demuestra escala/version común; sinC, no fusionar. Labels/definitions completos se preservan en22/29, no se duplican en este texto.

## Matriz por ocurrencia

Todos los códigos son strings. Request conserva minLength1 y maxLength actual; la propuesta no inventa cambios de requiredness. Read puede requerir conservación de unknown: mantener string/proyección actual para historia, no enum estricto que invalide lectura. Max de escritura se aplica a nuevas opciones después de autorización; lectura no impone un límite de escritura nuevo al histórico. EvidenceReview omission=SQL NULL; ausencia opcional no se convierte en default ni approval/rejection. Las fechas/versiones del objeto y pertenencia tenant siguen sus contratos.

| FIELD_ID / familia | Operación / property | Longitud escritura | Requiredness/nulabilidad actual | Fuente OpenAPI / procedencia corregida23 |
|---|---|---|---|---|
| F-0075 / CV-03 | controlInstantiate / frequency_code | 1..64 | required | docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml:6097; docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:29 |
| F-0079 / CV-14 | controlInstantiate / suggested_owner_role_code | 1..96 | optional | docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml:6101; docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:30 |
| F-0090 / CV-03 | controlGet / frequency_code | lectura: no estrechar histórico | read-only; required; non-null si presente | docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml:5584; docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:31 |
| F-0094 / CV-14 | controlGet / suggested_owner_role_code | lectura: no estrechar histórico | read-only; optional; nullable | docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml:5588; docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:32 |
| F-0208 / CV-02 | evidenceCreate / evidence_type | 1..64 | required | docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml:6274; docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:33 |
| F-0213 / CV-12 | evidenceCreate / source_kind | 1..32 | required | docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml:6279; docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:34 |
| F-0223 / CV-01 | uploadIntentCreate / classification | 1..32 | required when upload | docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml:6207; docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:35 |
| F-0225 / CV-13 | evidenceApprove / sufficiency | 1..32 | optional; omitido persiste NULL; rationale y expected_version required | docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml:6310; docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:36 |
| F-0226 / CV-09 | evidenceApprove / relevance | 1..32 | optional; omitido persiste NULL; rationale y expected_version required | docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml:6311; docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:37 |
| F-0228 / CV-13 | evidenceReject / sufficiency | 1..32 | optional; omitido persiste NULL; rationale y expected_version required | docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml:6320; docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:38 |
| F-0229 / CV-09 | evidenceReject / relevance | 1..32 | optional; omitido persiste NULL; rationale y expected_version required | docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml:6321; docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:39 |
| F-0234 / CV-02 | evidenceGet / evidence_type | lectura: no estrechar histórico | read-only; required; non-null si presente | docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml:5788; docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:40 |
| F-0240 / CV-12 | evidenceGet / source_kind | lectura: no estrechar histórico | read-only; required; non-null si presente | docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml:5794; docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:41 |
| F-0278 / CV-11 | issueCreate / severity | 1..32 | required | docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml:6337; docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:42 |
| F-0279 / CV-08 | issueCreate / priority | 1..32 | required | docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml:6338; docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:43 |
| F-0285 / CV-07 | issueCreate / origin_role | 1..32 | required | docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml:6344; docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:44 |
| F-0286 / CV-11 | issueTriage / severity | 1..32 | required | docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml:6352; docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:45 |
| F-0287 / CV-08 | issueTriage / priority | 1..32 | required | docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml:6353; docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:46 |
| F-0299 / CV-11 | issueGet / severity | lectura: no estrechar histórico | read-only; required; non-null si presente | docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml:5827; docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:47 |
| F-0300 / CV-08 | issueGet / priority | lectura: no estrechar histórico | read-only; required; non-null si presente | docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml:5828; docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:48 |
| F-0314 / CV-08 | actionCreate / priority | 1..32 | required | docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml:6386; docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:49 |
| F-0318 / CV-06 | actionComplete / link_role | 1..32 | required | docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml:6410; docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:50 |
| F-0329 / CV-08 | actionGet / priority | lectura: no estrechar histórico | read-only; required; non-null si presente | docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml:5871; docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:51 |
| F-0341 / CV-04 | soaCreate / items[].applicability_decision | 1..32 | required within item | docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml:6066; docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:52 |
| F-0343 / CV-05 | soaCreate / items[].implementation_state | 1..32 | required within item | docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml:6068; docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:53 |
| F-0358 / CV-10 | assuranceTestExecute / samples[].selection_method | 1..64 | required dentro de sample; samples optional | docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml:6154; docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:54 |

CV03/14 viven en controls.control_versions, no controls.controls. CV06 en action_evidence_links, CV07 en issue_origins, CV09/13 en evidence_reviews. Registros de SoAItem heredan SoA y versionado, no RequirementApplicability. samples optional, pero selection_method required dentro de cada sample; ninguna selección crea motor de muestreo.

## Compatibilidad y versionado firmables

VOC-C01 publica enums propios en OpenAPI02 y usa generador existente para assets de request, con catálogo/manifest congelados y traceability. Ninguna importación de CSV22/29 por apps/packages; sin endpoint/permission/catálogo paralelo. VOC-C02 fija identidad family/code/significado/version y presentation_version; activación sólo con effective_from UTC del manifest competente, nunca reloj local/latest. Retirement usa nueva revisión/effective_to explícita, no borrar ni reutilizar code. Objeto histórico conserva significado original de versión; no traducir códigos, UUID, nombres oficiales ni texto libre.

VOC-C03/C04: antes de enforcement, inventario autorizado agregado por owner/columna/code/versión y NULL (incluyendo ControlVersion global/tenant, SoA items, reviews, origins, links y samples), sin PII. Conciliar unknown/retired no cubiertos y counts con owners; evaluar referencialidad/lineage y backups. Plan forward-only, no changes históricos: unknown legible con «Valor sin traducción aprobada», retired con label firmado + «(retirado)», ambos no seleccionables nuevos. Escritura unknown/retired se deniega sólo tras publicación e inventario/revisión técnicos, TCDX.VALIDATION.FAILED400 sanitizado. **upload y uploaded permanecen distintos**, ninguno alias; no rename masivo, regla implícita ni borrowing de Risk. No se ejecutó inventarioQA ni una migración de compatibilidad.

VOC-C05: permisos/capabilities/parent ObjectPolicy/scope/tenant/SoD/idempotency/row_version actuales de23 por ocurrencia; código no otorga derecho ni reduce clasificación. Audit/lineage existente genérico no demuestra versión de estas nuevas familias. Backend/Data Model deben firmar enlace reproducible entre código/version del catálogo y versión/audit/snapshot del objeto antes de runtime. Si falta soporte canónico, enmienda específica y gate físico, no JSON crítico ad hoc ni nueva columna creada aquí.

VOC-C06: i18n central contextual propuesto en display-text.ts/es.ts tras publicación; separar priority de severity, Issue/Action delRisk, business role de IAMRole. No consumir ROLE_LABELS como grant. Opción sin label aprobado no se ofrece; español central, nombres/texto libre intactos. Se preservan CF01 (sin filtros applicability/source_role; columnas intactas) y CF02 (lifecycle Control deshabilitado sin catálogo/query). Esas tres ocurrencias no son nuevasCV ni justifican elegir active.

CV01-A conserva CHECK archivo4 valores; Tenant.data_classification no es source de semántica archivo. CV04-A conserva objetoSoA, no crea RequirementApplicability. CV05-A implementation_state no altera Control workflow; cross-field not_applicable exige aprobación de regla antes de escritura. CV11 no alteraRisk. CV14 sólo función empresarial sugerida, sin lectura de personas por rol ni RoleAssignment/Permission. CV10 sólo método declarado y reglas de soporte; census/counts nueva regla se revisa, no algoritmo estadístico implementado.

## Pruebas negativas y firmas

T-VOC01 exactitud52rows/enum/hash/generador; T-VOC02 required/optional/bounds y omissionNULL; T-VOC03 unknown/retired nuevoDENY versus histórico legible; T-VOC04 tenant/permission/entitlement/scope/SoD/idempotency/concurrency; T-VOC05 sin IAMgrant porCV14; T-VOC06 semánticasSoA/Control separadas; T-VOC07 I/A/C independiente ysin SLA/default; T-VOC08 upload/uploaded sinalias; T-VOC09 i18ncontextual sin traducirfree text; T-VOC10 vigenciafirmada/calendario/zona/DST sin fecha de máquina; T-VOC11 FKsame-tenant/lineage; T-VOC12 censusrule sólo tras firma ysin motor. Definiciones completas: docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:103.

Todas son NOT_RUN_PROPOSED_CAPABILITY en esta ejecución; suites existentes no prueban vocabularios no publicados. QA firma VOC-QA; Domain/Architecture/Backend/Security/Data Model firman por familia yVOC-C01..06 sólo en26. Identity/role/date/hash requeridos; no actor ni fecha efectiva inventados. Si cualquier owner cambia valor/code/definición/label, presentar diff exacto family/value/antes/después/reason al PO; preservar52rows y pedir decisión nueva sólo para ese cambio, nunca reinterpretar aprobación actual.
