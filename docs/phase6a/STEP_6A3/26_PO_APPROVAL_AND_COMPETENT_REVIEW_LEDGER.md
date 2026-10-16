# STEP 6A.3 — aprobación PO y registro único de revisión competente

Master activo: `TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23`. `TASK_ID=STEP_6A3_PO_RECONCILIATION_20261008`; `CODEX_VARIATION_BUDGET=ZERO`.

Estado: **DRAFT / PROPOSED_NOT_PUBLISHED**. Dirección PO `APPROVED_2026_10_08`; revisión técnica `PENDING_REVIEW`. Rector 45 §§2,3,5,6 y 46 §§3,5,6,8 autorizan esta propuesta documental y mantienen bloqueada la publicación. Registro único de firmas: [26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md](26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md); ningún otro archivo de este paquete registra aprobaciones.

## Decisión recibida, transcripción

Fuente: task packet del usuario de esta ejecución, sección «Decisión humana ya recibida: PO_APPROVED — 2026-10-08». Se registra la autoridad funcional que el usuario declara; no se inventa identidad del PO ni firma técnica. Fecha de decisión suministrada por el usuario, no fecha efectiva de publicación.

La siguiente es **aprobación de dirección funcional y arquitectura candidata del Product Owner**, NO firma técnica ni publicación ejecutable. No solicites nuevamente estas decisiones funcionales:

- **P-RBAC:** CT-01 FrameworkVersion Compliance independiente de Controls; CT-03 selector mínimo de TenantMembership con elegibilidad y revalidación de asignación; CT-04 selector contextual de RetentionPolicy, distinguiendo descubrimiento de aplicabilidad jurídica. Aceptada la arquitectura de tres proyecciones mínimas; **44 grants por set de templates sólo como matriz candidata**, nunca autorizados/materializados por esta aprobación. No se confunde Platform con Tenant ni se expone PII administrativa en red.
- **P-CONFIG:** preferencia por **CFG-D** (`configuration_mode=none`) para las versiones `BASELINE_COMPLIANCE` v1 y `BASELINE_CONTROL_EFFECTIVENESS` v1 **condicionada a confirmación competente de autosuficiencia metodológica**. No declarar `none` publicado por preferencia PO; si no se puede demostrar/firmar, CT-02 permanece bloqueado. **CFG-B** es alternativa futura sólo si existe necesidad real y enmienda tipada autorizada. CFG-C no justificada para este slice. El permiso `configuration.effective_configuration.read` existente no se amplía. No inventar binding Methodology→Definition/Subject/effective_at/snapshot.
- **P-VOC:** aprobadas como **propuestas funcionales** las **52 filas** exactas de `22_P_VOC_CANONICAL_VALUE_PROPOSALS.csv`, para CV-01..CV-14 y 26 ocurrencias, con definiciones/etiquetas en español, opcionalidad, provenance y compatibilidad histórica de `23`. **Ninguna fila está técnicamente publicada ni es seleccionable hasta firma y manifest/versionado competentes**. CV-01 distingue clasificación archivo/tenant; CV-04 SoA/RequirementApplicability; CV-05 SoA/control lifecycle; CV-08 Issue/Action y CV-11 Severity/Risk; CV-14 sugerencia empresarial, no asignación IAM. Conservar históricos `upload` y `uploaded` sin alias implícito. `relevance`/`sufficiency` siguen opcionales. CV-10 no habilita motor de muestreo. No usar ZIP normativo como fuente de estos enums.
- **Modelo físico:** reconciliar, mediante diseño y posterior autorización específica, los dos índices `UNIQUE(tenant_id)` en EffectiveConfiguration y `UNIQUE(ordinal)` en layers con las claves canónicas, y la regla `typed default`; **no ejecutar DDL ni modificar migraciones históricas** en este turno.
- **Discrepancias:** resolver contractualmente RBAC-D01 (`AUDITOR` extra en actionCreate), RBAC-D02 (grants de requirement.read no materializados), dos UQ y typed default; no revocar ni inventar grants.
- **Gobernanza:** no QA, migraciones, publicación efectiva de permissions/grants, commits/push/PR/merge ni deploy sin autorización específica y gates. STEP6A.4 sigue NOT_STARTED. Fase5 cerrada, no reabrir. Normativa importación después de 6A.4 y antes de 6A.5; ZIP reservado `docs/normative-sources/incoming/GRC_Tecdex_Paquete_Normativo_Unificado_Preparacion_Post6A4_v2_2026-10-08.zip`: no importar ni reinterpretar en este paso.

CSV22 aprobado funcionalmente: SHA-256 `8a9669d3389eba33be3640756777c35642a5d910567082cdd1fc12bf91c66239`. Su estado documental anterior queda intacto; este registro actualiza la aprobación PO sin convertirlo en contrato publicado.

## Verificación de firmas y alcance

Se verificaron los archivos locales de gobernanza y paquetes 15/19/20–25. El DR de metodología de Fase5 es una aprobación real delimitada a la enmienda anterior (docs/governance/PHASE5_METHODOLOGY_BINDING_ARCHITECTURE_DECISION_20261007.md:3); no firma CFG-D, los tres permisos ni los valores CV. Las tablas de revisión de 20/21/23 están pendientes. No se demostró firma técnica por cláusula con identidad, rol, fecha y evidencia para este paquete. `COMPETENT_SIGNOFF=PENDING_REVIEW`; `HUMAN_SIGNATURES_FABRICATED=0`.

La propuesta del PO no amplía el catálogo rector 22 §10: los recursos membership_reference/retention_policy_reference candidatos requieren reconciliación competente de nomenclatura y, si esa extensión modifica autoridad rectora, enmienda humana manifestada antes de publicación. El candidato no modifica el baseline.

## Matriz individual firmable

Cada fila se aprueba o rechaza separadamente. Evidencia apunta al contenido existente; impacto y prueba al delta de 27/28/30. El owner sólo ejerce su autoridad nombrada: una firma de Backend no sustituye Security, Legal o Data Model. Todas las firmas, fechas efectivas y resultados humanos permanecen pendientes. Publicación operacional, DDL, QA y deploy siguen requiriendo autorización específica posterior aun con todas las firmas documentales.

| Cláusula | Decisión propuesta | Evidencia fuente:línea | Alcance/owner | Impacto contractual / qué habilita | Riesgo | Test requerido | Resultado |
|---|---|---|---|---|---|---|---|
| C-01 | Aprobar request/envelope/cursor/contexto temporal/error/audit/default DENY de §4. | docs/phase6a/STEP_6A3/20_P_RBAC_PUBLICATION_DECISION_PACKET.md:188 | Architecture, Backend, Security | Publicar reglas comunes; rechazo bloquea las tres lecturas.; Reconciliación documental exacta; publicación/implementación exige gates y autorización separada | Fuga por cursor/error/auditoría | RBAC-C13/C14/C15 | PENDING_REVIEW |
| C-02 | Aprobar proyección, predicados, acceso oficial/validación e historia FrameworkVersion de §5 bajo compliance.framework.read. | docs/phase6a/STEP_6A3/20_P_RBAC_PUBLICATION_DECISION_PACKET.md:189 | Architecture, Backend, Security, Compliance | Publicación contractual CT-01; rechazo mantiene RR-G01.; Reconciliación documental exacta; publicación/implementación exige gates y autorización separada | Contenido global o versión no elegible | RBAC-C01/C02/C04 | PENDING_REVIEW |
| C-03A | Aprobar display_name+joined_at, elegibilidad activa y propósitos ligados al parent de §6; recurso Permission membership_reference. | docs/phase6a/STEP_6A3/20_P_RBAC_PUBLICATION_DECISION_PACKET.md:190 | Architecture, Backend, Security, IAM, Evidence, Remediation | Publicación contractual CT-03; rechazo mantiene RR-G03.; Reconciliación documental exacta; publicación/implementación exige gates y autorización separada | PII administrativa y enumeración histórica | RBAC-C05/C06/C07 | PENDING_REVIEW |
| C-03B | Aprobar revalidación de elegibilidad activa y pertenencia de asignado en comandos EvidenceRequest/Action, conservando IDs/campos e historia. | docs/phase6a/STEP_6A3/20_P_RBAC_PUBLICATION_DECISION_PACKET.md:191 | Architecture, Backend, Security, IAM, Evidence, Remediation | Enmienda de validación futura; sin ella no hay cierre de concurrencia del selector.; Reconciliación documental exacta; publicación/implementación exige gates y autorización separada | Asignación obsoleta concurrente | RBAC-C07/C08 | PENDING_REVIEW |
| C-04 | Aprobar proyección, propósito, vigencia e historia de §7 bajo EVIDENCE_DOCUMENTS y permiso específico. | docs/phase6a/STEP_6A3/20_P_RBAC_PUBLICATION_DECISION_PACKET.md:192 | Architecture, Backend, Security, Evidence, Privacy/Legal | Publicación contractual acotada CT-04; rechazo mantiene RR-G04.; Reconciliación documental exacta; publicación/implementación exige gates y autorización separada | Política no vigente o sin derecho | RBAC-C09/C10 | PENDING_REVIEW |
| C-04G-1 | Aprobar visibilidad mínima global product_baseline published, sin afirmar cumplimiento jurídico. | docs/phase6a/STEP_6A3/20_P_RBAC_PUBLICATION_DECISION_PACKET.md:193 | Architecture, Security, Privacy/Legal | Descubrir baseline producto; rechazo mantiene global DENY.; Reconciliación documental exacta; publicación/implementación exige gates y autorización separada | Baseline confundido con mínimo jurídico | RBAC-C11/C12 | PENDING_REVIEW |
| C-04G-2 | Aprobar Source→ImportManifest→PackVersion oficial efectiva para descubrir candidato regulatorio; no concede aplicabilidad al objeto. | docs/phase6a/STEP_6A3/20_P_RBAC_PUBLICATION_DECISION_PACKET.md:194 | Architecture, Data Model, Backend, Security, Privacy/Legal | Reutilizar FK existente para lectura; rechazo mantiene global regulatory bloqueado.; Reconciliación documental exacta; publicación/implementación exige gates y autorización separada | Procedencia confundida con aplicabilidad | RBAC-C11/C12 | PENDING_REVIEW |
| C-04G-3 | Confirmar DENY de global contractual/hold sin binding; decidir si el requisito completo exige enmienda C-04G-B. | docs/phase6a/STEP_6A3/20_P_RBAC_PUBLICATION_DECISION_PACKET.md:195 | Architecture, Data Model, Privacy/Legal, Evidence | Fija alcance y residual; binding requerido impide declarar CT-04 PASS.; Reconciliación documental exacta; publicación/implementación exige gates y autorización separada | Hold/contrato global sin binding | RBAC-C11 | PENDING_REVIEW |
| C-04W | Aprobar revalidación de publicación/vigencia/aplicabilidad/prioridad y coherencia upload→FileObject→Evidence en comandos futuros. | docs/phase6a/STEP_6A3/20_P_RBAC_PUBLICATION_DECISION_PACKET.md:196 | Architecture, Backend, Security, Privacy/Legal, Evidence | Enmienda contractual futura; sin firma sigue pendiente el cierre concurrente/jurídico.; Reconciliación documental exacta; publicación/implementación exige gates y autorización separada | Reducción de obligación o cambio de FK | RBAC-C12 | PENDING_REVIEW |
| C-06F | Aprobar13 templates F exactos, incluidos Auditor Lead/Auditor para historia SoA; los otros11 DENY. | docs/phase6a/STEP_6A3/20_P_RBAC_PUBLICATION_DECISION_PACKET.md:197 | Security, Architecture, Compliance | Matriz F explícita; no inventar grants Requirement materializados.; Reconciliación documental exacta; publicación/implementación exige gates y autorización separada | Grant de rol confundido con scope | RBAC-C03 | PENDING_REVIEW |
| C-06M | Aprobar17 templates M; lista sólo para M7 con permiso de comando; historia sólo por parent exacto. | docs/phase6a/STEP_6A3/20_P_RBAC_PUBLICATION_DECISION_PACKET.md:198 | Security, Architecture, IAM, Evidence, Remediation, Controls | Matriz M explícita; rechazar historia conserva referencias readonly pendientes.; Reconciliación documental exacta; publicación/implementación exige gates y autorización separada | Historia usada como directorio | RBAC-C06/C14 | PENDING_REVIEW |
| C-06R | Aprobar14 templates R; selección sólo R3 con permiso de comando; historia por parent exacto. | docs/phase6a/STEP_6A3/20_P_RBAC_PUBLICATION_DECISION_PACKET.md:199 | Security, Architecture, Privacy/Legal, Evidence | Matriz R explícita; sin ampliación de PRIVACY.; Reconciliación documental exacta; publicación/implementación exige gates y autorización separada | Ampliación Privacy o selección inválida | RBAC-C09/C11 | PENDING_REVIEW |
| C-07 | Aprobar estrategia44 grants/template set y44 por tenant completo, SEED010, preflight, versionado/audit; ejecución operacional sigue NOT_AUTHORIZED. | docs/phase6a/STEP_6A3/20_P_RBAC_PUBLICATION_DECISION_PACKET.md:200 | Architecture, Backend, Security | Preparar publicación; no autoriza QA, migración ni deploy aquí.; Reconciliación documental exacta; publicación/implementación exige gates y autorización separada | Distribución no idempotente o no autorizada | RBAC-C16 | PENDING_REVIEW |
| C-08 | Aprobar18 pruebas negativas/regresión/gates de §10. | docs/phase6a/STEP_6A3/20_P_RBAC_PUBLICATION_DECISION_PACKET.md:201 | Architecture, Backend, Security, Domain, QA/Release | Congela aceptación futura; no autoaprueba gate humano.; Reconciliación documental exacta; publicación/implementación exige gates y autorización separada | Regresión confundida con nueva capacidad | RBAC-C01..18 | PENDING_REVIEW |
| RBAC-D01 | Resolver grant AUDITOR actionCreate materializado adicional: reconciliar con catálogo de cinco roles o emitir DR competente que apruebe su alcance exacto. | docs/phase6a/STEP_6A3/20_P_RBAC_PUBLICATION_DECISION_PACKET.md:202 | Security, Architecture, Remediation | Cierra discrepancia contractual/seed; sin SQL en este turno.; Reconciliación documental exacta; publicación/implementación exige gates y autorización separada | Sexto grant extra propagado | RBAC-C08 | PENDING_REVIEW |
| RBAC-D02 | Registrar once lectores contractuales Requirement y ausencia de RolePermission en migraciones; decidir publicación legítima futura independiente. | docs/phase6a/STEP_6A3/20_P_RBAC_PUBLICATION_DECISION_PACKET.md:203 | Security, Architecture, Compliance, Backend | Diferencia contrato/template/runtime explícita; sin grants ficticios.; Reconciliación documental exacta; publicación/implementación exige gates y autorización separada | Once lectores declarados contados como grants | RBAC-C03/C16 | PENDING_REVIEW |
| CFG-D-COMPLIANCE-V1 | Confirmar autosuficiencia de BASELINE_COMPLIANCE v1 y ausencia de configuración adicional conforme a 28; aprobar la cláusula individual, no una preferencia operativa | database/migrations/20261007000200_phase5_methodology_binding.sql:48 | Methodology, Configuration, Domain Compliance, Architecture | create sin EC sólo después de publicación; preservar históricos; Reconciliación del candidato CFG-D o plan físico; ejecución no autorizada | Pesos de Pack o supuestos no incorporados | CFG-T01/T02 | PENDING_REVIEW |
| CFG-D-CONTROLS-V1 | Confirmar autosuficiencia de BASELINE_CONTROL_EFFECTIVENESS v1 y ausencia de configuración adicional conforme a 28 | database/migrations/20261007000200_phase5_methodology_binding.sql:96 | Methodology, Configuration, Domain Controls/Assurance, Architecture | create sin EC sólo después de publicación; conservar min y coverage; Reconciliación del candidato CFG-D o plan físico; ejecución no autorizada | Factores de recencia/suficiencia no cerrados | CFG-T01/T02 | PENDING_REVIEW |
| CFG-D-HISTORY | Aprobar preservación de assessments con/sin EC, snapshots y método/fórmula exactos; contrato versionado de ausencia, sin backfill | apps/backend/src/core-grc/service.ts:263 | Backend, Data Model, Domain Compliance, Domain Controls, Architecture | enmienda create/read por versión y lineage verificable; Reconciliación del candidato CFG-D o plan físico; ejecución no autorizada | Borrado de EC histórica o NULL convertido en none | CFG-T03/T04 | PENDING_REVIEW |
| CFG-D-PUBLICATION | Aprobar forma de publicación versionada del modo por metodología y enlace verificable a la versión; sin columnas/tablas ni flags inferidos; resolver requisito de nueva versión inmutable antes de ejecutar | docs/executable-contracts/27_PHASE5_METHODOLOGY_BINDING.md:5 | Architecture, Data Model, Backend, Methodology, Security | manifest firmado y contratos candidatos coherentes; Reconciliación del candidato CFG-D o plan físico; ejecución no autorizada | Anotar none retroactivamente o inferirlo del código | CFG-T04/T05 | PENDING_REVIEW |
| CFG-UQ1 | Reconciliar business key EC: tenant/Definition/Subject/effective_at/hash, NULLS NOT DISTINCT | database/migrations/20260916000600_constraints_and_uniqueness.sql:797 | Data Model, Architecture, Backend | plan forward-only de 28; DDL sigue prohibido; Reconciliación del candidato CFG-D o plan físico; ejecución no autorizada | Pérdida de historia, duplicados o hash no reproducible | CFG-T06/T07 | PENDING_REVIEW |
| CFG-UQ2 | Reconciliar unicidad de layers por EC + precedence_level + ordinal | database/migrations/20260916000600_constraints_and_uniqueness.sql:800 | Data Model, Architecture, Backend | plan forward-only de 28; conservar PK/FK; Reconciliación del candidato CFG-D o plan físico; ejecución no autorizada | Ordinal global o capas incoherentes | CFG-T06/T07 | PENDING_REVIEW |
| CFG-DEFAULT | Mantener exactamente un typed default que coincida con value_type; cero requiere resolución competente, no default fabricado | docs/physical-data-model/01_PHYSICAL_DATA_MODEL.md:224 | Data Model, Configuration, Architecture, Backend | reconciliación del CHECK <=1 con contrato superior; Reconciliación del candidato CFG-D o plan físico; ejecución no autorizada | Default ausente o de tipo incompatible | CFG-T08 | PENDING_REVIEW |
| CFG-HANDLER | Registrar declaración effectiveConfigurationGet sin handler HTTP demostrado; no contar CT02 implementada; ninguna ampliación EC.read | docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml:3478 | Backend, Architecture, Security | alcance de prueba y brecha HTTP exactos; Reconciliación del candidato CFG-D o plan físico; ejecución no autorizada | Declaración confundida con capacidad ejecutada | CFG-T05 | PENDING_REVIEW |
| CFG-QA | Aprobar aceptación de 28 CFG-T01..08 sin autoaprobar runtime | docs/phase6a/STEP_6A3/21_P_CONFIG_BINDING_EVIDENCE_AND_ARCHITECTURE_OPTIONS.md:188 | QA, Backend, Security, Domain Compliance, Domain Controls | plan de pruebas posteriores a publicación; Reconciliación del candidato CFG-D o plan físico; ejecución no autorizada | Firma sustituida por suites anteriores | CFG-T01..08 | PENDING_REVIEW |
| CV01-A | 4 códigos CHECK archivo y4 labels/definiciones de 22; separación de Tenant; conjunto exacto CSV22, hash 8a9669d3389eba33be3640756777c35642a5d910567082cdd1fc12bf91c66239 | docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:78 | Evidence + Security, Backend, Architecture, Security, Data Model | Preparar enumFileClassification y traducción; sin nuevos códigosCHECK; Preparar publicación de familia; no habilita selector ni enforcement | Equivalencia de owners, validación sin historia o versión no reproducible | T-VOC01..12 con casos específicos de 30 | PENDING_REVIEW |
| CV02-A | document/record/image/report de22 como tipo; separación MIME/source; conjunto exacto CSV22, hash 8a9669d3389eba33be3640756777c35642a5d910567082cdd1fc12bf91c66239 | docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:79 | Evidence, Backend, Architecture, Security, Data Model | Preparar enumEvidenceType; compatibilidad inventario previo; Preparar publicación de familia; no habilita selector ni enforcement | Equivalencia de owners, validación sin historia o versión no reproducible | T-VOC01..12 con casos específicos de 30 | PENDING_REVIEW |
| CV03-A | 8frecuencias de22 y períodos calendarios expresos; trigger sólo descrito; conjunto exacto CSV22, hash 8a9669d3389eba33be3640756777c35642a5d910567082cdd1fc12bf91c66239 | docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:80 | Controls, Backend, Architecture, Security, Data Model | Preparar enumControlFrequency; no scheduler ni SLA; Preparar publicación de familia; no habilita selector ni enforcement | Equivalencia de owners, validación sin historia o versión no reproducible | T-VOC01..12 con casos específicos de 30 | PENDING_REVIEW |
| CV04-A | applicable/not_applicable de22 paraControlVersion enSoA; equivalencia acotada de códigosRequirementApplicability; conjunto exacto CSV22, hash 8a9669d3389eba33be3640756777c35642a5d910567082cdd1fc12bf91c66239 | docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:81 | Compliance, Backend, Architecture, Security, Data Model | Preparar enumSoAApplicabilityDecision propio; no fusionar objeto; Preparar publicación de familia; no habilita selector ni enforcement | Equivalencia de owners, validación sin historia o versión no reproducible | T-VOC01..12 con casos específicos de 30 | PENDING_REVIEW |
| CV05-A | 4estados22 y regla not_applicable requiere decisiónSoA homónima; implemented separadoeffectiveness; conjunto exacto CSV22, hash 8a9669d3389eba33be3640756777c35642a5d910567082cdd1fc12bf91c66239 | docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:82 | Compliance + Controls, Backend, Architecture, Security, Data Model | Preparar enumSoAImplementationState y validación cruzada autorizada; Preparar publicación de familia; no habilita selector ni enforcement | Equivalencia de owners, validación sin historia o versión no reproducible | T-VOC01..12 con casos específicos de 30 | PENDING_REVIEW |
| CV06-A | closure único22 como soportecompleted; conjunto exacto CSV22, hash 8a9669d3389eba33be3640756777c35642a5d910567082cdd1fc12bf91c66239 | docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:83 | Actions + Evidence, Backend, Architecture, Security, Data Model | Preparar enumActionEvidenceLinkRole;verified exige workflow actual; Preparar publicación de familia; no habilita selector ni enforcement | Equivalencia de owners, validación sin historia o versión no reproducible | T-VOC01..12 con casos específicos de 30 | PENDING_REVIEW |
| CV07-A | trigger único22 como papel de origen; conjunto exacto CSV22, hash 8a9669d3389eba33be3640756777c35642a5d910567082cdd1fc12bf91c66239 | docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:84 | Actions, Backend, Architecture, Security, Data Model | Preparar enumIssueOriginRole;sin reglas automáticas; Preparar publicación de familia; no habilita selector ni enforcement | Equivalencia de owners, validación sin historia o versión no reproducible | T-VOC01..12 con casos específicos de 30 | PENDING_REVIEW |
| CV08-I | urgent/high/normal/low22 paraIssue; conjunto exacto CSV22, hash 8a9669d3389eba33be3640756777c35642a5d910567082cdd1fc12bf91c66239 | docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:85 | Actions, Backend, Architecture, Security, Data Model | Preparar enumIssuePriority; Preparar publicación de familia; no habilita selector ni enforcement | Equivalencia de owners, validación sin historia o versión no reproducible | T-VOC01..12 con casos específicos de 30 | PENDING_REVIEW |
| CV08-A | urgent/high/normal/low22 paraAction; conjunto exacto CSV22, hash 8a9669d3389eba33be3640756777c35642a5d910567082cdd1fc12bf91c66239 | docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:86 | Actions, Backend, Architecture, Security, Data Model | Preparar enumActionPriority; Preparar publicación de familia; no habilita selector ni enforcement | Equivalencia de owners, validación sin historia o versión no reproducible | T-VOC01..12 con casos específicos de 30 | PENDING_REVIEW |
| CV08-C | Aprobar expresamente escala compartida de urgenciaIssue/Action de22; ningún SLA/valor heredado; conjunto exacto CSV22, hash 8a9669d3389eba33be3640756777c35642a5d910567082cdd1fc12bf91c66239 | docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:87 | Actions + Architecture, Backend, Architecture, Security, Data Model | Usar fuente contractual compartida sólo siI/A/C firmadas; siC rechazada mantener separado; Preparar publicación de familia; no habilita selector ni enforcement | Equivalencia de owners, validación sin historia o versión no reproducible | T-VOC01..12 con casos específicos de 30 | PENDING_REVIEW |
| CV09-A | 3 criterios relevance de 22;opcionalidad y rationale; conjunto exacto CSV22, hash 8a9669d3389eba33be3640756777c35642a5d910567082cdd1fc12bf91c66239 | docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:88 | Evidence, Backend, Architecture, Security, Data Model | Preparar enumEvidenceRelevance; no decisiónapproval automática; Preparar publicación de familia; no habilita selector ni enforcement | Equivalencia de owners, validación sin historia o versión no reproducible | T-VOC01..12 con casos específicos de 30 | PENDING_REVIEW |
| CV10-A | 5 métodos de 22 y restriccionescensus;procedimientos explícitos en soporte gobernado; conjunto exacto CSV22, hash 8a9669d3389eba33be3640756777c35642a5d910567082cdd1fc12bf91c66239 | docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:89 | Assurance + Backend, Backend, Architecture, Security, Data Model | Preparar enumAssuranceSelectionMethod; no motor muestreo; Preparar publicación de familia; no habilita selector ni enforcement | Equivalencia de owners, validación sin historia o versión no reproducible | T-VOC01..12 con casos específicos de 30 | PENDING_REVIEW |
| CV11-A | critical/major/moderate/minor22 con criteriosFinding;sin escalaRisk; conjunto exacto CSV22, hash 8a9669d3389eba33be3640756777c35642a5d910567082cdd1fc12bf91c66239 | docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:90 | Actions / Finding, Backend, Architecture, Security, Data Model | Preparar enumIssueSeverity propio; Preparar publicación de familia; no habilita selector ni enforcement | Equivalencia de owners, validación sin historia o versión no reproducible | T-VOC01..12 con casos específicos de 30 | PENDING_REVIEW |
| CV12-A | uploaded/system_record/human_observation/external_record22;no aliasupload y todasfile pipeline vigente; conjunto exacto CSV22, hash 8a9669d3389eba33be3640756777c35642a5d910567082cdd1fc12bf91c66239 | docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:91 | Evidence, Backend, Architecture, Security, Data Model | Preparar enumEvidenceSourceKind; no integración nueva; Preparar publicación de familia; no habilita selector ni enforcement | Equivalencia de owners, validación sin historia o versión no reproducible | T-VOC01..12 con casos específicos de 30 | PENDING_REVIEW |
| CV13-A | 3 criterios sufficiency de 22;opcional;sin scorefactor; conjunto exacto CSV22, hash 8a9669d3389eba33be3640756777c35642a5d910567082cdd1fc12bf91c66239 | docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:92 | Evidence, Backend, Architecture, Security, Data Model | Preparar enumEvidenceSufficiency; Preparar publicación de familia; no habilita selector ni enforcement | Equivalencia de owners, validación sin historia o versión no reproducible | T-VOC01..12 con casos específicos de 30 | PENDING_REVIEW |
| CV14-A | 5 códigos de 22 delregistryRole usados sólo como funciones sugeridas; sin grants/assignments; conjunto exacto CSV22, hash 8a9669d3389eba33be3640756777c35642a5d910567082cdd1fc12bf91c66239 | docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:93 | Controls + Security, Backend, Architecture, Security, Data Model | Preparar enumSuggestedBusinessOwnerRole y mapping sin autoridadIAM; Preparar publicación de familia; no habilita selector ni enforcement | Equivalencia de owners, validación sin historia o versión no reproducible | T-VOC01..12 con casos específicos de 30 | PENDING_REVIEW |
| VOC-C01 | Aprobar fuente OpenAPI por owner y generación existente conforme a 23/30 | docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:60 | Architecture, Backend, Security, Data Model, Domain propietario | manifest y publicación futura de 14 familias; Revisión del manifest DRAFT; publicación sigue bloqueada | Catálogo ad hoc, historia perdida o localización ambigua | T-VOC01..12 | PENDING_REVIEW |
| VOC-C02 | Aprobar versiones de contrato/presentación y vigencia pendiente conforme a 23/30 | docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:62 | Architecture, Backend, Security, Data Model, Domain propietario | manifest y publicación futura de 14 familias; Revisión del manifest DRAFT; publicación sigue bloqueada | Catálogo ad hoc, historia perdida o localización ambigua | T-VOC01..12 | PENDING_REVIEW |
| VOC-C03 | Aprobar retirement y unknown histórico conforme a 23/30 | docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:64 | Architecture, Backend, Security, Data Model, Domain propietario | manifest y publicación futura de 14 familias; Revisión del manifest DRAFT; publicación sigue bloqueada | Catálogo ad hoc, historia perdida o localización ambigua | T-VOC01..12 | PENDING_REVIEW |
| VOC-C04 | Aprobar inventario histórico y compatibilidad antes del enforcement conforme a 23/30 | docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:66 | Architecture, Backend, Security, Data Model, Domain propietario, QA | manifest y publicación futura de 14 familias; Revisión del manifest DRAFT; publicación sigue bloqueada | Catálogo ad hoc, historia perdida o localización ambigua | T-VOC01..12 | PENDING_REVIEW |
| VOC-C05 | Aprobar tenant/RBAC/SoD/audit/lineage reproducible conforme a 23/30 | docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:68 | Architecture, Backend, Security, Data Model, Domain propietario | manifest y publicación futura de 14 familias; Revisión del manifest DRAFT; publicación sigue bloqueada | Catálogo ad hoc, historia perdida o localización ambigua | T-VOC01..12 | PENDING_REVIEW |
| VOC-C06 | Aprobar i18n español central por contexto conforme a 23/30 | docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:70 | Architecture, Backend, Security, Data Model, Domain propietario | manifest y publicación futura de 14 familias; Revisión del manifest DRAFT; publicación sigue bloqueada | Catálogo ad hoc, historia perdida o localización ambigua | T-VOC01..12 | PENDING_REVIEW |
| VOC-QA | Aprobar pruebas T-VOC01..12 y compatibilidad por ocurrencia sin certificar ejecución de capacidades nuevas | docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md:103 | QA, Backend, Security, Domain propietarios | criterios de aceptación posteriores a publicación; Plan de aceptación, no QA/runtime/deploy | Regresión histórica sustituye gate nuevo | T-VOC01..12 | PENDING_REVIEW |

## Formato de recepción de una firma real

Para cada cláusula y cada owner requerido, anexar: clause_id; APPROVE o REJECT; identidad real; rol ejercido; fecha UTC de firma; hash del candidato revisado y CSV22 cuando corresponde; evidencia verificable del Decision Record humano; alcance/condiciones exactos; fecha efectiva explícita cuando se apruebe publicación. Todos esos campos están **pendientes**, no prellenados. Rechazo exige delta exacto; un cambio de cualquiera de los 52 valores/labels/definiciones se somete al PO como nueva decisión, conservando CSV22 intacto.

Orden accionable: revisar C-01/02/03A/B/04/G/W y C-06F/M/R/D01/D02 con los owners de cada fila; confirmar las dos CFG-D individualmente y CFG-D-HISTORY/PUBLICATION; resolver CFG-UQ1/UQ2/DEFAULT como diseño; firmar VOC-C01..06, cada familia y CV08-I/A/C; QA firma criterios C-08/CFG-QA/VOC-QA. Esto cierra decisiones precisas y permite preparar una release contractual posterior. No requiere repetir dirección funcional PO ni otra investigación general. No cierra STEP6A.3 ni activa STEP6A.4.


## EC-DETAIL-READ-v1-L03-R1 — decisión y aprobación humana acotada — 2026-10-09

Registro de procedencia; las48 filas precedentes y sus PENDING_REVIEW permanecen intactos. Fuente1: mandato humano «Mandato ejecutivo de cierre STEP6A.3 / EC-DETAIL-READ-v1-L03-R1», que adopta específicamente EC-R1.1..8/tabla/JSON Schema SHA159c2fac9a5d2006900f49ee020521146f2e85baeec9233c8a8f07429bc28163 y autoriza publicación contractual local e implementación tras gate. Fuente2, texto literal posterior: «Architecture, Backend y Security \& Privacy autorizan para publicar, procede».

ID de decisión: DR-STEP6A3-EC-DETAIL-R1-20261009. Identidad humana declarada: Product Owner único, emisor de esos mandatos en esta conversación. Roles ejercidos declarados en la autorización posterior: Architecture Owner, Backend Owner, Security & Privacy Reviewer; fecha de decisión suministrada2026-10-09, sin horaUTC de firma inventada. Acumulación de funciones internas bajo43:116; no se atribuyen personas distintas, revisión independiente, credenciales o firma criptográfica. Codex transcribe/aplica; no es aprobador. Evidencia: textos anteriores y hashes verificados en06/07.

Problema: OpenAPI declarabaGET/permiso pero faltaba respuesta/ObjectPolicy aprobada21§8. Alternativas ya consideradas en06: enum nuevo vs códigos históricos literales; número JSON vs decimal string int64; ranking de precedencia vs orden exclusivamente de presentación. Decisión adoptada: texto/schema R1 exactos por hash, sin nuevos valores/scopes/grants. Consecuencia: habilita delta local de OpenAPI/matriz/contrato28 y su implementación local; publicación documental vigente sólo de effectiveConfigurationGet-v1. No avala48cláusulas,SOG,metodologías/none,CT02 contextual,DDL/QA/IAM/deploy/6A.4 o gate runtime real. R45:68–81 yOpenAPI02:19–23 satisfechos para esta aprobación declarada; toda independencia superior que fuese aplicable permanece exigible, no hay excepciónSoD creada.


## DR-STEP6A3-CFGD-FUNCTIONAL-20261009 — aprobación funcional delimitada

Fuente: mensaje humano del Product Owner en esta ejecución, fecha suministrada 2026-10-09. Identidad: emisor humano que declara el rol PO; no se inventa nombre, hora UTC, firma criptográfica ni revisión independiente. Estado único de esta decisión: **FUNCTIONALLY_APPROVED**. No modifica los PENDING_REVIEW de la matriz ni la autorización EC R1.

Bytes UTF-8 exactos de la transcripción siguiente, desde el título hasta el último salto de línea: SHA-256 `c26c8c0ea0810eaf1bb34cf43d7a0f7a1820eee4b8f48f546baa345f50625c14`.

```text
DECISIÓN FUNCIONAL DEL PRODUCT OWNER — CFG-D / CT02

Para GRC Tecdex, las metodologías baseline de Controls y Compliance deberán ser autosuficientes cuando sus reglas de evaluación estén completamente definidas, versionadas y respaldadas por los contratos rectores.

Se autoriza funcionalmente el uso de configuration_mode=none exclusivamente para aquellas metodologías y versiones cuya autosuficiencia pueda demostrarse mediante evidencia contractual y pruebas.

La opcionalidad de EffectiveConfiguration en el modelo físico no constituye por sí sola evidencia de autosuficiencia.

En Controls, la evaluación deberá respetar el algoritmo, los umbrales y las reglas de suficiencia, validez y recencia de evidencias que correspondan según los contratos vigentes.

En Compliance, deberá respetar las reglas de ponderación, aplicabilidad, procedencia y trazabilidad definidas contractualmente.

No se autoriza inventar umbrales, pesos, períodos de recencia, criterios de aplicabilidad ni otros parámetros que carezcan de respaldo rector.

Codex deberá identificar las reglas existentes, distinguir las efectivamente publicadas de las propuestas y completar toda implementación técnicamente autorizada.

Cuando una metodología no demuestre autosuficiencia, deberá conservar el requisito de configuración que establezca su contrato, sin utilizar none como mecanismo para evitar dependencias.

Para UQ/default, continuar la reconciliación estructural forward-only fuera de las migraciones activas, sin modificar QA, ejecutar DDL ni alterar restricciones vigentes.

Registrar esta decisión como aprobación funcional del Product Owner. No interpretarla como aprobación independiente de seguridad, segregación de funciones, publicación contractual o cambios físicos.

El objetivo continúa siendo cerrar integralmente STEP 6A.3, sin hardcodes, regresiones ni deuda técnica deliberada.
```

Consecuencia autorizada: investigación contractual, pruebas de reglas ya vigentes y preparación forward-only fuera de migraciones activas. `none` permanece sin publicación hasta autosuficiencia comprobada, revisión competente por versión y CFG-D-PUBLICATION/HISTORY/SoD. La evidencia del cálculo `min` no acredita criterios de evidencia/recencia; la opcionalidad EC ni NULL acreditan none. Cambios físicos, QA, publicación, grants, IAM y deploy no autorizados. No se vuelve a pedir esta aprobación funcional.


## Recepción consolidada pendiente — cierre residual 2026-10-09

Los cinco textos exactos y sus hashes están en `SOLO_OWNER_GOVERNANCE_PROPOSAL_20261009_V2/06_NEXT_EXECUTABLE_BATCH.md`, sección Cierre residual. Para aprobar o rechazar, registrar aquí ID, hash exacto, identidad/rol competente, fecha UTC real, alcance, evidencia y vigencia cuando corresponda; no se prellena ninguno.

- DR-STEP6A3-CFGD-SOD-R1: **PENDING_REVIEW**, SHA-256 `69e6e4c0dc3645b76cfe2f50b07d4ab9d37ebf502d307d243532c8e07386e4a8`; Methodology + Configuration + Compliance y Controls/Assurance + Architecture + Data Model + Backend + Security, cada cual en sus cláusulas; autor/revisor/publicador distintos donde SoD lo exija.
- DR-STEP6A3-CT-RBAC-R1: **PENDING_REVIEW**, SHA-256 `c1ae7f1adc4d183737950469a174b6aa925eb54c9b79275a1821596c8878d901`; Architecture + Backend + Security + Compliance + IAM + Evidence/Remediation + Privacy/Legal + Data Model, según C-01..C-08 y D01/D02.
- DR-STEP6A3-VOC52-R1: **PENDING_REVIEW**, SHA-256 `88e5c0020406fd2eb4821d764fa231b2386faa8a91ac59365eb33d03e2040e71`; Owners de cada familia + Architecture + Backend + Security + Data Model + QA para criterios; no sustituibles por dirección PO.
- DR-STEP6A3-UQ-DEFAULT-R1: **PENDING_REVIEW**, SHA-256 `314f8cf7d5792e2a4ea8c039f548042e1eaf0ad2ec3f233cdab3bb8a7d3ff764`; Data Model + Architecture + DBA/Backend para diseño y disponibilidad; autorización operacional DDL independiente.
- DR-STEP6A3-EXTERNAL-ACCEPTANCE-R1: **PENDING_REVIEW**, SHA-256 `1f1bb66be0e14fb19a3dc40ba092a049eed58ef6a749a8f30ed1b8dfd2103ac1`; QA/Release + Security + Backend + owners de dominio; aceptación humana basada en ejecución real.

Una sola recepción puede contener las cinco decisiones, manteniendo firma/resultado por competencia y cláusula. No se pide nuevamente la dirección funcional CFG-D ni EC R1. La falta de reglas publicadas o binding no se resuelve con una firma ficticia de suficiencia. Ninguna de estas decisiones está aprobada por este registro.


## DR-STEP6A3-UQDEFAULT-FUNCTIONAL-20261009 — aprobación funcional UQ/default

Estado único: **FUNCTIONALLY_APPROVED**. Procedencia: último mensaje humano PO; fecha declarada 2026-10-09, sin inventar identidad civil/hora UTC/revisión independiente. SHA-256 de bytes UTF-8 de la transcripción con salto final: `e25522c36cc7ea48dbb3143425da5eae036cbf3b1ddb876df144c6bba30d9c40`.

```text
DECISIÓN DEL PRODUCT OWNER — RECONCILIACIÓN UQ/DEFAULT, STEP 6A.3

Se aprueba funcionalmente la reconciliación estructural de las tres discrepancias verificadas en PostgreSQL:

1. La restricción UNIQUE(tenant_id) de EffectiveConfiguration deberá reconciliarse con la clave de unicidad definida por el modelo canónico.
2. La restricción global UNIQUE(ordinal) de EffectiveConfigurationLayer deberá sustituirse, cuando corresponda, por la restricción de unicidad contextual establecida en el contrato rector.
3. Las reglas de defaults deberán garantizar las cardinalidades, tipos y condiciones de publicación establecidos por los contratos canónicos, sin imponer valores arbitrarios ni alterar definiciones válidas.

Esta aprobación establece el comportamiento funcional esperado. No autoriza inventar claves, modificar contratos rectores ni introducir nuevas entidades para resolver discrepancias.

Completar el delta forward-only, incluyendo verificaciones de precondiciones, detección de datos incompatibles, preservación de registros existentes, comportamiento ante errores y pruebas de regresión.

Verificar que el cambio sea seguro para instancias con datos existentes y no solamente para la instancia local inspeccionada.

Mantener intactas las migraciones históricas.

Registrar la aprobación funcional del Product Owner y conservar separadas las firmas metodológicas, de seguridad y de publicación exigidas por la gobernanza.

No ejecutar DDL, modificar QA, activar contratos ni desplegar sin las autorizaciones específicas correspondientes.

Continuar paralelamente con CT01/02/03/04, CFG-D, RBAC y vocabularios hasta agotar todas las actividades autorizadas de STEP 6A.3.
```

Se conserva el bloqueo de DDL, QA, publicación y deploy. La revisión exige comprobar instancias con datos: las15 pruebas CTE de predicados con datos no vacíos se aprueban sólo como detección de incompatibilidades; no como ejecución/aceptación de la migración o constraints. Revisión DBA/Data Model/Architecture y autorización operacional siguen pendientes. La dirección funcional UQ/default no se solicita nuevamente.

DR-STEP6A3-UQ-DEFAULT-R2: **PENDING_REVIEW**, SHA-256 `c8b966f03a567fd6095d7ef7ae29aee8b6898d8c5df90c452df9c8241a0391b0`; sustituye diseño R1, sin firma competente ni DDL autorizada. Las otras cuatro decisiones siguen pendientes en sus propios alcances.


## Continuidad de autoridad humana — enmienda interna v1.8, 2026-10-09

DR-INTERNAL-REVIEW-V18-20261009 adoptado por mandato expreso del Product Owner: preparar/validar/publicar/activar en este lote la enmienda interna precisa, sin nueva firma de activación. La autoridad Andrés Barouh declara Architecture/Backend/Security/Compliance/IAM/Privacy-Legal/DBA/Methodology; una persona, funciones acumuladas. No son dos firmas independientes. Fuente, delta, SHA-256 y fecha UTC real: docs/rector/ACTIVE_ACTIVATION.json y docs/governance/amendments/INTERNAL_REVIEW_v1.8_20261009/ACTIVATION_EVIDENCE.json. Estado verificado ACTIVE_VERIFIED; baseline v1.8 sucesora y v1.7 protegida inmutable.

49 elimina segunda persona obligatoria por defecto sólo en revisión/publicación editorial/metodológica interna y delimita author+approve de22§6 en esa faceta. Se conservan íntegros SoD operacional, controles de tenants, credenciales/privilegios, legal/external/certificación aplicable y gates técnicos. SOGv2 sigue DRAFT_NOT_EFFECTIVE. Las filas y firmas históricas anteriores no se reescriben ni se autopromueven.

Se localizaron y preservaron ambos cuestionarios del09-10-2026, originales .docx y extracciones completas, bajo docs/governance/amendments/INTERNAL_REVIEW_v1.8_20261009/sources/. Sus hashes están en el manifiesto macro. C16 del complementario exige revisión del manifiesto y firma posterior: no aprueba artefactos cuyos hashes no habían sido presentados. C10/C11/C13 restringen QA/IAM/commit; C17 reserva SOGv2. La nueva autorización supera sólo el bloqueo interno de independencia, no esos actos operacionales.

Manifiesto único MACRO-STEP6A3-20261009-R1: CONSOLIDATED_APPROVAL_20261009/MACRO_MANIFEST_R1.json, SHA-256 5b8c02385615fe6b5c825b18619d0cf1d493b7b7880e47530cc02893b3c953c4. Word único directamente firmable: DECISION_MACRO_R1.docx. Estado PENDING_PO_MACRO_SIGNATURE. El agente no firma. C-01..VOC/CFG/UQ mantienen decisiones por elemento dentro del macro; no se exige una ronda de firmas por cada cláusula.

Resultados locales:725PASS/0FAIL/0omitidas;627unit+82integraciones previamente omitidas+16SQL,79archivos de suite. No se suman627 de la repetición host como pruebas distintas. UQ/default38casos nativos PASS en copias de esquema canónico con registros existentes/concurrencia/rollback/fail-closed; additional roundtrip7valores comprobado sin coerción, no contado como siete casos nuevos.44pares rol-permission y52valores cotejados readonly contra roles/columns de instancia descartable: permisos nuevos0,grants nuevos0,vocabularios publicados0. Método3casos SQL existentes y16límites en memoria pasan, sin acreditar todavía suficiencia oficial ni configuration_mode=none.

Instancia propia PostgreSQL16.15: contenedor60906c8a477e3c8659f058a97ee831d8014e654856943fe9688c2832e09186e9, host127.0.0.1:55436/internal55432, IPCprivate/shm128MiB/shared_buffers32MiB/max_connections30/dynamic_shared_memory_typeposix, datos tmpfs descartables.16SQL usan CTE tipadas/transaction_read_only=on, sin DDL/DML ni fixtures persistidos en esas16pruebas. Las fixtures/DDL del resto permanecen sólo en la instancia propia descartable; ninguna escritura en BD compartida/QA. RLS físico NOT_IMPLEMENTED; QA/IAM_REAL/E2E_EXTERNAL NOT_RUN. No extender el PASS SQL local a esos gates. Paquete QA preparado, no ejecutado.

## Aprobación macro recibida — 2026-10-09T18:57:05.724634+00:00

Respuesta humana literal: «Apruebo el manifiesto y su texto exacto». Acto MACRO-STEP6A3-20261009-R1-APPROVAL, sobre SHA-256 `5b8c02385615fe6b5c825b18619d0cf1d493b7b7880e47530cc02893b3c953c4`. Recibo: `CONSOLIDATED_APPROVAL_20261009/MACRO_APPROVAL_RECEIPT_R1.json`. Satisface C16 para esos bytes; no modifica el manifiesto ni sus propuestas históricas. Autoriza exclusivamente su texto y conserva sus exclusiones. Publicación local y ejecución material se registrarán separadamente; la firma no constituye PASS técnico.


## MACRO residual R2 — aprobación humana exacta recibida

Texto humano: «Apruebo R2 y sus tres textos exactos». Recibo docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/RESIDUAL_MACRO_R2/APPROVAL_RECEIPT_R2.json; SHA del manifiesto 2dd41de880d445963c5c74917751d58490c63d7364ec1ad2179bbe39c5187ed8; registrado UTC 2026-10-09T20:42:45.308111+00:00. Una persona, funciones acumuladas, no independencia ficticia. Publica sólo los tres textos literales cerrados de31; CFG-D y CT04 conservan sus dependencias de evidencia/binding real. QA/IAM/DDL no descartable/deploy/Git remoto/SOGv2/6A4 excluidos.

## Aprobación humana exacta R3 — 2026-10-09T21:25:26.905290+00:00

Respuesta literal: «Apruebo R3 y su texto exacto». Manifest SHA-256 17eeb65269bc2dc9727c605999f1fd0c5c343cab3b6653a372c3d879618daed9; recibo docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/MACRO_APPROVAL_RECEIPT_R3.json SHA-256 3d69c54a089e0996096b6b37eab1ec45c320f96771c97030c2741fd2afff816d. D01/D02 autorizados para publicación e implementación local descartable; no autorizan operaciones reales. Los bytes firmados de R1/R2/R3 se preservan.

## Estado sucesor R1/R2/R3 — 2026-10-09T21:38:11.768851+00:00

R1, R2 y R3 tienen aprobación humana exacta posterior a sus hashes y publicaciones locales29/30/31/32. C16 satisfecho para los tres manifiestos exactos; ninguna segunda persona interna requerida por49. No se autopromueven las afirmaciones condicionales CFG-D ni SoD de usuarios GRC. CURRENT_EXECUTION_REPORT=macro_implementation_20261009 en07_RESULT.json.

Regresión final: 850 PASS/0FAIL/0omitidas, 737unit +113PG en85archivos;16ECSQLRO incluidos, no sumarlos nuevamente. 460browserPASS, API/IAMsimulados.38UQnativas preservadas;8RBACaudit R2 +12R3nativasPASS, sin sumar reejecuciones. RLS físico0policies/0RLS; QA/IAMreal/E2Eexterno NOT_RUN; revisiónUIhumana pendiente.

| Cláusula | Estado actual | Evidencia / dependencia |
|---|---|---|
| C-01 | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| C-02 | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| C-03A | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| C-03B | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| C-04 | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| C-04G-1 | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| C-04G-2 | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| C-04G-3 | DONE | PASS_DENY_UNBOUND; COMPLETE_BINDING_UNRESOLVED_IN_C04W; NONE_FOR_LOCAL_CLOSED_DELTA |
| C-04W | BLOCKED_CANONICAL_LEGAL_BINDING | NOT_RUN_DEPENDENT_APPLICATION_GUARD; No typed binding from evidence/file/upload to legal context; mandatory FK conflicts with pending-without-policy write |
| C-06F | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| C-06M | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| C-06R | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| C-07 | BLOCKED_OPERATIONAL_PLAN | PASS_EXACT44_NATIVE_AND8_AUDIT_CASES; No existing DB/QA DDL/actor ceremony authorized |
| C-08 | BLOCKED_EXTERNAL_ACCEPTANCE | PASS_LOCAL_ONLY; QA/IAM real/external E2E and human UI pending |
| RBAC-D01 | DONE | PASS_EXACT_LOCAL_DELTA_12_NATIVE_ROLLBACK_CASES_AND3_NATIVE_HTTP_BOOTSTRAP_CASES; NONE_FOR_LOCAL_APPROVED_DELTA; REAL_MUTATIONS_TRACKED_IN_C07 |
| RBAC-D02 | DONE | PASS_EXACT_LOCAL_DELTA_12_NATIVE_ROLLBACK_CASES_AND3_NATIVE_HTTP_BOOTSTRAP_CASES; NONE_FOR_LOCAL_APPROVED_DELTA; REAL_MUTATIONS_TRACKED_IN_C07 |
| CFG-D-COMPLIANCE-V1 | BLOCKED_OFFICIAL_SUFFICIENCY_AND_VERSIONED_PUBLICATION | PASS_EXISTING_METHOD_BOUNDARIES_ONLY; No proof of official complete per-version inputs/recency/Pack weight overrides/conflict/confidence and none binding |
| CFG-D-CONTROLS-V1 | BLOCKED_OFFICIAL_SUFFICIENCY_AND_VERSIONED_PUBLICATION | PASS_EXISTING_METHOD_BOUNDARIES_ONLY; No proof of official complete per-version inputs/recency/Pack weight overrides/conflict/confidence and none binding |
| CFG-D-HISTORY | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| CFG-D-PUBLICATION | BLOCKED_OFFICIAL_SUFFICIENCY_AND_VERSIONED_PUBLICATION | PASS_EXISTING_METHOD_BOUNDARIES_ONLY; No proof of official complete per-version inputs/recency/Pack weight overrides/conflict/confidence and none binding |
| CFG-UQ1 | BLOCKED_OPERATIONAL_PLAN | PASS_38_NATIVE_UQ; No existing DB/QA DDL/actor ceremony authorized |
| CFG-UQ2 | BLOCKED_OPERATIONAL_PLAN | PASS_38_NATIVE_UQ; No existing DB/QA DDL/actor ceremony authorized |
| CFG-DEFAULT | BLOCKED_OPERATIONAL_PLAN | PASS_38_NATIVE_UQ; No existing DB/QA DDL/actor ceremony authorized |
| CFG-HANDLER | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| CFG-QA | BLOCKED_EXTERNAL_ACCEPTANCE | PASS_LOCAL_ONLY; QA/IAM real/external E2E and human UI pending |
| CV01-A | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| CV02-A | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| CV03-A | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| CV04-A | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| CV05-A | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| CV06-A | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| CV07-A | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| CV08-I | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| CV08-A | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| CV08-C | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| CV09-A | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| CV10-A | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| CV11-A | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| CV12-A | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| CV13-A | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| CV14-A | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| VOC-C01 | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| VOC-C02 | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| VOC-C03 | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| VOC-C04 | BLOCKED_EXTERNAL_HISTORICAL_INVENTORY | PASS_LOCAL_TYPE_LENGTH_NO_COERCION; No authorized QA historic values inventory; discardable empty tenants are not production compatibility evidence |
| VOC-C05 | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| VOC-C06 | DONE | PASS; NONE_FOR_LOCAL_CLOSED_DELTA |
| VOC-QA | BLOCKED_EXTERNAL_ACCEPTANCE | PASS_LOCAL_ONLY; QA/IAM real/external E2E and human UI pending |

Las48 cláusulas tienen trazabilidad, pero sólo36 están cerradas en el alcance local. C-04W/CFG-D/contextoIANA y aceptación/operación conservan dependencia exacta. No se edita el manifest firmado ni las etiquetas históricas de candidatos; la vigencia se registra en publicaciones sucesoras.

## Decisión condicional sucesora C-04W / CFG-D — 2026-10-14

El Product Owner aprobó condicionalmente los dos deltas del candidato
`C04W_CFGD_RESIDUAL_DECISION_CANDIDATE_20261014.md`, SHA-256
`3487fd9fa032e5d311b37361ff673c335fba63c9736110b2c7200581370fd8dd`,
verificado localmente. Este acto sustituye la dirección funcional anterior
de `configuration_mode=none` para las v1 por el reemplazo conservador literal
del candidato en `CFG-D-COMPLIANCE-V1`, `CFG-D-CONTROLS-V1` y
`CFG-D-PUBLICATION`. `CFG-D-HISTORY` permanece cerrado. Para C-04W aprueba
Tenant Admin en su tenant y el vínculo tipado fuente documental ↔
RetentionPolicy/version ↔ FileUploadIntent/FileObject/Evidence, preservando
Privacy Manager, SoD, seguridad y evidencias.

Estado del acto: `HUMAN_FUNCTIONAL_DECISION_RECEIVED`;
`CONTRACT_DERIVATIVES_NOT_APPROVED`; `RECTOR_GATE=BLOCKED`;
`STEP_6A3=PARTIAL_BLOCKED`. No se inventan hora UTC, firma criptográfica,
fecha efectiva de publicación ni aprobación de bytes derivados. Las filas
históricas anteriores permanecen como historia; este recibo no publica una
baseline sucesora, modelo físico, permiso, grant, DDL, metodología, QA ni
aceptación macro. El expediente de compatibilidad, brechas y gates es
`docs/governance/amendments/STEP_6A3_C04W_CFGD_20261014/CONDITIONAL_DECISION_AND_TASK_PACKET.md`.
