# 47 — Aprobación y activación de sucesoras rectoras

## Antecedente humano ya aprobado

`DR-STEP6A3-COMMERCIAL-GOVERNANCE-20261013-02`, firmado por Andrés Barouh el `2026-10-13T23:45:00Z`, aprueba G-01..G-06, C-01..C-12, H-01..H-12 y F-01..F-10 en el alcance exacto de `GP-STEP6A3-COMMERCIAL-20261013-02`. El paquete tiene SHA-256 `489e8cec4b72c2cf464d0315e5ba4f2f5664012b60df2327a07f82882943ba55` y su manifest SHA-256 `b454e3e2475ece966f87a4da1f89c1640f5cf9baf48d7b7d146935edc4db5cc3`. La constancia local está en `docs/phase6a/STEP_6A3/FINAL_CONTRACT_RECONCILIATION_20261013/HUMAN_DECISION_RECEIPT_20261013.md`.

Esa decisión aprueba diseño y artefactos candidatos presentados. No aprueba por arrastre los bytes de esta baseline sucesora, su manifest, expected-schema activo, publicación/seed manifest ni implementación futura. No cierra las obligaciones H ni STEP 6A.3.

## Alcance de la sucesora propuesta

Reconciliar el catálogo comercial único, CommercialFamily, sus relaciones soporte, UsageLimit por PlanVersion/familia, transición change-plan, regla prospectiva R-P, permisos/autoridad, temporalidad, auditoría y publicación independiente conforme al paquete aprobado. Las relaciones y contratos derivados son candidatos nuevos hasta aprobación exacta y publicación competente. La v1.8 predecesora no se modifica in situ y debe preservarse como historia verificable si se activa esta sucesora.

## Condiciones de activación

1. Presentar los archivos completos 00–49, `PRE_IMPLEMENTATION_GATE_REPORT.md` y `SHA256SUMS.txt`, más el delta exacto respecto de v1.8 y el hash de manifest de esta sucesora.
2. Obtener decisión humana expresa sobre esos bytes nuevos y su alcance, sin volver a someter el diseño del paquete v2 ya aprobado.
3. Verificar identidad/funciones/fecha, fuentes, dependencias, pruebas positivas y negativas, preservación histórica y ausencia de conflicto material con el rector vigente.
4. Publicar por la ceremonia rectora: baseline, ID, estado y manifests concordantes, verificador de integridad adaptado a la sucesora, CI y revisión humana antes de integrar main. Ningún cambio aislado de `BASELINE_STATUS` activa el contrato.
5. Someter después el modelo físico y los contratos ejecutables derivados a sus gates humanos y técnicos propios antes de implementación dependiente.

La preparación o verificación de este candidato no declara `RECTOR_BASELINE=PASS` para v1.9 ni autoriza DDL/DML compartido, IAM real, grants, commit, push, merge, deploy, STEP 6A.4 o release.

## Sucesora STEP_6A3 v1.10 (candidata)

Predecesora activa: `TCDX_GRC_MASTER_REGENT_BASELINE_v1.9_2026-10-14`. Paquete funcional aprobado: `docs/governance/amendments/STEP_6A3_C04W_CFGD_20261014/CONTRACT_PACKET_20261015.md`, SHA-256 `6b87812823472d56a89622eca8119b0cd56606f2f21d635dd84bf903896ba7f2`. Esta copia integra únicamente sus deltas C-04W y CFG-D en 17, 19, 21–24, 30, 33 y 38. La decisión funcional no aprobó estos bytes de baseline ni DDL, grants, runtime o QA.

Activación exige: (1) entrega íntegra 00–49, reporte preimplementación y SHA256SUMS; (2) aprobación humana expresa de identificador, manifest y SHA-256 exactos, con funciones/fecha; (3) compatibilidad, fuentes, historia, pruebas positivas y negativas; (4) ceremonia de baseline, ID, status, manifests, verificador CI y revisión antes de main; (5) gates independientes físico y ejecutable antes de DDL/grants o implementación dependiente. La predecesora no se modifica ni reinterpreta. Preparación no autoriza STEP_6A4 ni QA.


## STEP_6A3 — candidata de incorporación inicial de fuente v1.11

`STATUS=DRAFT_NOT_EFFECTIVE; HUMAN_EXACT_BYTES_REVIEW=PENDING`. Baseline candidata TCDX_GRC_MASTER_REGENT_BASELINE_v1.11_2026-10-15, predecesora TCDX_GRC_MASTER_REGENT_BASELINE_v1.10_2026-10-15. Diseño PO aprobado por SHA `1a133d60e576208eefc90d68ff39df903df829f3c9ab1b3c51fa06d8c826913b`; constancia `docs/governance/amendments/STEP_6A3_INITIAL_SOURCE_20261015/PO_DESIGN_APPROVAL_RECEIPT_20261015.json`. Esta sección sólo tendrá efecto después de publicación conforme47/49 y gates físico/ejecutable; no autoriza operación QA ni deploy por sí sola.

La candidata TCDX_GRC_MASTER_REGENT_BASELINE_v1.11_2026-10-15 entrega51 archivos completos y SHA256SUMS, delta exacto y manifest de revisión contra v1.10. La aprobación PO registrada cubre el diseño de SHA 1a133d60e576208eefc90d68ff39df903df829f3c9ab1b3c51fa06d8c826913b y su preparación, no estos bytes nuevos. Activación requiere decisión humana por manifest/ID/hashes y funciones Architecture/Data/Security competentes realmente ejercidas, constancia de dictamen físico y aprobación ejecutable exacta; ceremony de ID/status/manifests/verificador concordantes y CI/revisión antes de main. El PO puede acumular funciones sólo si las declara conforme49, sin inventarlas. QA deployment exige autoridad Release de esa versión; fuentes, SoD y aceptación humana permanecen. Sin cierre efectivo6A3 no hay READY_TO_START ni inicio6A4.
