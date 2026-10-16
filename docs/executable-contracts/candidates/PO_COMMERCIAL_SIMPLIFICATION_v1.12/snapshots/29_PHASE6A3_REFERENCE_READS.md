> DRAFT_NOT_EFFECTIVE — copia candidata PO v1.12. Estados y recibos heredados describen su autoridad histórica; el delta PO rige la propuesta futura.

> CANDIDATE_NOT_EFFECTIVE: snapshot sucesor INITIAL_SOURCE; texto histórico preservado, requiere publicación competente.

# STEP6A3_REFERENCE_READS_v1 — publicación local

Estado: `PUBLISHED_LOCAL_V1`. Vigencia contractual local: 2026-10-09T18:58:05.431882+00:00. Master: `TCDX_GRC_MASTER_REGENT_BASELINE_v1.8_2026-10-09`.

Autoridad humana: MACRO-STEP6A3-20261009-R1-APPROVAL, manifiesto SHA-256 `5b8c02385615fe6b5c825b18619d0cf1d493b7b7880e47530cc02893b3c953c4`; recibo `docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/MACRO_APPROVAL_RECEIPT_R1.json`. Una persona ejerce las funciones declaradas conforme al rector49. Publicación contractual no acredita runtime, grants en BD, QA, IAM real ni deploy. CFG-D none y SOGv2 no se activan.

Se adopta íntegramente el contenido normativo del artefacto aprobado `docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md`, SHA-256 `029ba9a9e2a0f13a726b3133bd43be71b2caf209ecb11c6381074da40a1bf247`, y sus bases incorporadas selladas en el manifiesto. Sus etiquetas históricas DRAFT/PENDING describen el estado anterior, quedan preservadas y son supersedidas únicamente por esta publicación para los deltas cerrados. Las cantidades de nuevos permisos/grants efectivos del candidato describían antes de publicación, no su materialización. No se cambia la semántica aprobada.

La implementación consume OpenAPI02, matriz03, Permission05 y los assets canónicos derivados. Requisito superior o dependencia no resuelta mantiene DENY; CT04 no permite omitir binding técnico/FK; para acreditar una obligación jurídica se requiere su respaldo aplicable, sin universalizarlo a configuración ordinaria. History no genera elegibilidad nueva.


## INITIAL_SOURCE v1.11 — delta candidato

## Fuente, consumo y selección

La vista de upload puede seleccionar el draft sólo para incorporar su fuente, separada inequívocamente de primarias ordinarias. La selección debe verificarse en backend, con permisos/capabilities propios de la operación; no se transforma una lectura en derecho de comando. Los selectores de evidencia ordinaria excluyen versiones ligadas a aplicabilidad no publicada. El selector de bind permite únicamente EvidenceVersion de la misma cadena draft aprobada independientemente/vigente/scan-PASS, accesible al custodio o revisor según ObjectPolicy existente acotado. History sigue mostrando su estado original sin crear elegibilidad. La consulta fuente pendiente no expone documentos de otro actor por mera pertenencia al tenant. No se añade Permission/RolePermission ni propósito persistido.




## Selección operativa y acreditación — candidata PO

El binding jurídico se requiere cuando la operación pretende acreditar fundamento
externo; el binding técnico de policy/contexto/FK siempre se valida. Una primaria
operativa publicada puede carecer de source sin ser presentada como acreditada.
No se selecciona una draft INITIAL_SOURCE como primaria ordinaria; no se amplía
lectura documental/submit tenant-only ni se elude permiso padre/ObjectPolicy.
Una lectura de EC no crea configuración ni binding ausente. DELTA.md no modifica
scopes publicados, cursores ni proyecciones y conserva toda historia.
