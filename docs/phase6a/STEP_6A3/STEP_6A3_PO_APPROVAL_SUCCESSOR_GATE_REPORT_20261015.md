# STEP_6A3 — aprobación PO registrada y sucesoras listas para decisión exacta

`MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.10_2026-10-15`
`ACTIVE_RECTOR_MANIFEST_SHA256=b9b6bf6930931af5eb32ca1b4027212ad3a82f247fef677b919af24d30ac9060`
`RECTOR_BASELINE=PASS; STEP_6A3=PARTIAL_BLOCKED; RECTOR_GATE=BLOCKED; STEP_6A4=NOT_STARTED`
`CODEX_VARIATION_BUDGET=ZERO; TASK_PACKET_STATUS=BLOCKED`

Mismo worktree `/private/tmp/tcdx-grc-step6a3-prep-20261015`, rama `codex/step6a3-c04w-cfgd-prep-20261015`, HEAD23c7b50468213b8c0769ca2607349e04f4c32eae. Trabajo anterior preservado. Esta entrega registra la aprobación y prepara todos los artefactos de revisión autorizados; no trata el deseo de despliegue como aprobación de bytes futuros o de otras funciones.

## Decisión PO exacta y límites

Texto recibido: **«Sí, apruebo, pero necesito avancemos hasta el despliegue y poder iniciar etapa 6A.4»**. Archivo aprobado: `INITIAL_RETENTION_SOURCE_BOOTSTRAP_DELTA_DRAFT_20261015.md`, SHA `1a133d60e576208eefc90d68ff39df903df829f3c9ab1b3c51fa06d8c826913b`. Coincide con el manifest original SHA `f3f49ec297e069abb28989f5c039bbe1e654f507d6bf62c8d7cede12300d5582`. Ambos originales permanecen intactos.

Recibo aditivo: `docs/governance/amendments/STEP_6A3_INITIAL_SOURCE_20261015/PO_DESIGN_APPROVAL_RECEIPT_20261015.json`, SHA `8ad355ce0a9fcfd7f6fc804bfa2a0852ccf4675e72f328563b6ca716dc675a5d`. Conserva UTC real de registro y fecha observada; hora original del acto no comunicada, no inventada. Actor explícito: Product Owner, con referencia de identidad de continuidad a la constancia previa; no se atribuyen nuevas funciones, firma criptográfica, consentimiento de Privacy/Legal ni aprobación de QA. La aprobación de diseño/preparación queda satisfecha y **no se vuelve a solicitar**.

## Sucesoras exactas preparadas, no activadas/publicadas

| Artefacto | Estado / hash |
|---|---|
| Baseline candidata completa `docs/rector/candidates/TCDX_GRC_MASTER_REGENT_BASELINE_v1.11_2026-10-15/` |51documentos completos + SHA256SUMS; manifest SHA `4599f6e522ed91952ab01296a4c0b9cbe4df8ad4c1a612afd7fd0414215f824b`; NOT_ACTIVATED |
| Ejecutables candidatos `docs/executable-contracts/candidates/STEP_6A3_INITIAL_SOURCE_v1.11/` | DELTA, UI_DELTA, snapshots02/03/05/08/09/14/29 y estado STAGED_NOT_EFFECTIVE. Una operación bind200 y un AuditEvent nuevos; mismos permisos/grants/registry5; cubre tres revalidaciones, source-only/consumo y SoD por objeto. |
| Manifest consolidado de nuevos bytes | `docs/governance/amendments/STEP_6A3_INITIAL_SOURCE_20261015/NEW_BYTES_REVIEW_MANIFEST.json`, SHA **`f4db8b38ac4fb18abb0978f9654a83def7b4ee024bafff560a8dbf6e9b7f9247`**;62artefactos contractuales +7suplementos de revisión, incluyendo evidencia física. |
| Delta exacto | `SUCCESSORS.diff`, hash fijado en manifest; predecesoras/root contracts intactos. |
| Dictamen físico preparado | `PHYSICAL_COMPATIBILITY_REVIEW_CANDIDATE.md`; revisión técnica estructural limitada PASS, dictamen humano Data Model Owner PENDING. |
| Implementación/pruebas y QA | `IMPLEMENTATION_AND_TEST_PACKET.md`, `QA_DEPLOY_AND_CLOSEOUT_RUNBOOK.md` y `HUMAN_GATE_DECISION_FORM.md`: rutas, comandos, precondiciones, negativos, owners y criterios exactos sin ejecución prematura. |

Los archivos nuevos se someten a revisión una sola vez por este manifest. No se reabren A01–A13, cuatro candidatos, seis snapshots, publicación efectiva previa ni registry M2M auditado. La candidata v1.11 sólo sucede los puntos INITIAL_SOURCE si es aprobada y activada conforme47/49; v1.10 continúa activa. Ninguna etiqueta histórica copiada convierte la candidata en autoridad actual.

## Gates reales y continuidad autorizada

| Gate | Estado real | Acto/evidencia que falta |
|---|---|---|
| Diseño PO / preparación de sucesoras | PASS_APPROVAL_RECORDED | Ninguno para ese diseño. |
| Rector v1.10 / publicación C-04W previa / R2 / registry5 | PASS preservados en su alcance | No repetir publicación, DDL, grants ni suites previas sin cambios/riesgo. |
| Revisión/activación de nuevos bytes rectores | PENDING_HUMAN_EXACT_BYTES_REVIEW | Decisión por manifest/ID/hashes, con funciones competentes efectivamente ejercidas, ceremonia47 y CI/revisión antes de main. |
| Architecture/Data/Security-Privacy sobre nuevas sucesoras | PENDING_EXPLICIT_COMPETENT_ACT | El acto PO actual sólo declara Product Owner. Rector49 permite acumular funciones si la persona las declara realmente; no se exige otra persona por defecto ni se fabrican funciones. |
| Publicación ejecutable INITIAL_SOURCE | STAGED_NOT_EFFECTIVE | Acto competente sobre esos nuevos bytes y publicación efectiva, después del rector. |
| Dictamen «sin migración» | TECHNICAL_SUPPORT_ONLY; HUMAN_DICTAMEN=PENDING | Data Model Owner y pruebas del nuevo flujo en PG16 aislado después de contratos efectivos. No hay dictamen definitivo automático de Codex. |
| Implementación, pruebas del nuevo flujo y build | NOT_RUN / NOT_STARTED_DEPENDENT_PUBLICATION | UsuarioA/B y rector46 §§3/5/7 impiden código dependiente antes de publicación válida. Se dejó packet revisable, sin código de producto adelantado. |
| Despliegue nuevo QA | **BLOCKED_DEPLOY_AUTHORITY**, además de contratos aún no efectivos | QA/Release Owner debe autorizar source/imágenes/gate manifest reales que se producirán después de implementación/pruebas. No se solicitan firmas sobre hashes futuros ni se finge una restricción ambiental: no se intentó deploy. |
| Fuente auténtica/sesiones/revisión independiente/QA/UI | BLOCKED_HUMAN_ACTION / NOT_RUN | H01–H10 por actores reales, fuente auténtica y aceptación explícita de la nueva versión desplegada. |
| Cierre6A3 / entrada6A4 | PARTIAL_BLOCKED / NOT_STARTED | Todos los gates y acta competente de cierre; sólo después acto formal de entrada6A4. No se usa READY_TO_START para sustituirlo. |

**Próximo acto humano mínimo:** decidir el manifest de nuevos bytes indicado y el dictamen adjunto, declarando las funciones editoriales/técnicas realmente ejercidas. El formulario permite un acto consolidado conforme49; no presupone más revisores ni vuelve a pedir el diseño PO. Tras ese acto y la publicación válida podrá continuar implementación. Release y aceptación se decidirán con sus artefactos/evidencias reales posteriores.

## Evidencia técnica independiente ejecutada

- Verificadores v1.10 y ledger vigente: PASS; hashes activos conservados, historia v1.9 y51candidatos previos íntegros. La cadena firmada de macro6A3 no se alteró.
- Validación de candidatos: PASS después de corregir ubicación YAML en el paquete no publicado;51archivos manifestados,62contratos y suplementos con hashes exactos; OpenAPI174→175operaciones,2.344refs locales resueltas, schema bind cerrado, headers/CAS/respuestas y permiso existentes. Las174operaciones anteriores se conservan salvo anotación del contrato candidato para las afectadas. El fallo de borrador y su corrección están documentados; no fue fallo de runtime ni implementación.
- PostgreSQL16 aislado55437 READ_ONLY: tres cuerpos de funciones c04w coinciden exactamente con R2 sellada; columnas/FK/constraints/guards existentes disponibles para draft→draft y misma cadena.242tablas contractuales más el ledger, sin tablas esperadas faltantes. El ledger aislado33 se registra literalmente, no se presenta como QA34 ni se inserta fila ficticia. No se usaron fixtures jurídicos ni se ejecutó workflow futuro. Esto es inspección estructural, **no prueba del flujo nuevo ni aprobación humana del modelo**.
- R2 SHA `b2a5bc73f75d7f95fb7ba5068f1b3ea77a923d7da7501446d05455ee545ec523` y contrato27 SHA `eedf85debfb5eb48e25d4abdd5ff4332c5dba8197ab7b96a66b97f640cfef4df`: intactos.
- Tests de producto nuevos: NOT_RUN por publicación pendiente, no PASS. Los cuatro negativos HTTP M2M/anónimo y suites focalizadas previas conservan sus recibos; no se repiten ni se presentan como negativos humanos. SoD/CFG-D/404 humanos aún NOT_RUN sin sesión legítima accesible.

Recibos nuevos: `docs/phase6a/STEP_6A3/evidence/po-approved-initial-source-20261015/`, incluidos `candidate-document-validation.json`, `isolated-physical-read.sql/.json`, `physical-compatibility-result.json`, hallazgo YAML inicial corregido y checks finales con hashes. La revisión del package no se confunde con aceptación comercial ni jurídica.

## QA existente, H01–H10 y funciones humanas

No hubo build ni deploy nuevos. Último QA acreditado preservado:

| Servicio | Imagen QA anterior acreditada | Fuente SHA |
|---|---|---|
| Backend | `sha256:474e525a3e6b2bcc067dda7a77039b36f2832ca37d138b1424a700644560fc6d` | `879942f159f61a607712fe4c7ba79668343f008285e43a37129159fae821a58e` |
| Frontend | `sha256:552ff3e9412cb1c78bfa3400c26c8835c6a2bfa09a6db1dc72ef18b8a2712eeb` | `bac88a14e73d95ed258cd4e3c9a615dce5ec42c7352241b5239fec7e16d45821` |

Son las versiones anteriores saludables con rollback según recibos ya conservados, **no** imágenes del nuevo bind/recorrido. El runbook adjunto contiene invocaciones reproducibles del promotor privado y sus preflights para cuando existan entradas reales y Release aprobado. No se bajó el gate ni se desplegó una versión antigua para aparentar avance.

| H | Responsable y recibo indispensable |
|---|---|
| H01 | Privacy/Legal tenant: documento auténtico autorizado, origen, cláusula, clasificación, contexto y vigencia; hash y constancia. Puede prepararlo en paralelo a la revisión de contratos. |
| H02 | Tenant Admin custodio: draft nuevo legítimo/policy ordinaria/contexto exacto, después de gates y despliegue. No tocar dos under_review ni inventar scope. |
| H03 | Evidence Owner autor documental con sesión real: upload→scan→FileObject→EvidenceVersion, IDs/hash/FK/audit. |
| H04 | Revisor Evidence con permiso real, distinto del autor documental: EvidenceReview/audit. Inventario anterior permite proponer Tenant Admin como revisor de Evidence ajena, no autoaprobación. |
| H05 | Custodio autor del draft: bind fuente/cláusula/intervalo reales con200/CAS/audit y submit; sólo después de publicar/implementar la operación. |
| H06 | Legal Reviewer distinto del autor del draft y publicador autorizado: aprobación/publicación separadas con fuente revalidada y AuditEvents. |
| H07 | Autor/QA humano: recibos CFG-D de suficiencia y preservación histórica; valid declarado no publica valid oficial. |
| H08 | Autoridad QA/UI: aceptación explícita desktop/estrecho/español/foco/recarga/selector sobre nuevas imágenes exactas, capturas QA reales/hashes. |
| H09 | QA con identidades/contextos existentes aptos: SoD, tenant401/403/404, permiso/entitlement, fuente/hold según dependencias; path/method/status/correlation/hash. Sin actor/source/sesión:NOT_RUN, sin cambios IAM. |
| H10 | QA/Release y autoridades competentes: acta real, alcance/versiones/manifests y todos los gates acreditados. No registrada por Codex. |

Los usuarios canónicos previamente inventariados se mantienen sin grants nuevos: `01a0cfae-d860-730d-88b8-d8b1b3f5d7dc` (custodio/posible revisor de Evidence ajena) y `01a0e832-ccb7-7574-8316-0781503d47de` (Evidence Owner/Legal Reviewer). La segunda identidad carece de evidence.approve: puede ser autora documental y luego aprobar aplicabilidad ajena, mientras la primera revisa su Evidence con permiso existente. Esa distribución conserva SoD por objeto, está sujeta a contratos aprobados y revalidación de permisos/scope/sesiones; no es un acto humano ya ejecutado ni una allowlist de producto.

## Cambios efectivos, trazabilidad y límites

Cambios de esta continuación: recibo PO aditivo, candidata rectora completa v1.11, enmiendas ejecutables candidatas y manifiestos/diff, revisión física técnica, packet de implementación/pruebas, formulario competente y runbook, este informe/evidencia y anexos a MASTER_EXECUTION_STATUS/expediente. Los bytes de la propuesta y manifests originales y paquetes previos se conservan; no se edita el ledger macro firmado ni los contratos activos. Baseline activa sigue v1.10.

BD, contratos **efectivos**, backend/frontend runtime, infraestructura y deployment contracts activos: sin cambio. Sin nuevas migraciones, código dependiente, IAM/grants, fuentes/usuarios/tenants falsos, producción, commit/push/merge/reset/clean. Ninguna etapa6A4 fue iniciada. Si una implementación futura requiere DDL no previsto, vuelve a decisión humana y no altera R2.

Se conserva sin implementar la dirección comercial de12meses por defecto para futuros contratos GRC Tecdex y alternativas18/24/36/48/60 cuando se pacten. No es fuente jurídica, máximo legal, conversión a días fijos, default persistido ni requisito nuevo6A3. Su recibo anterior sigue vigente como dirección y queda fuera del delta.

Trazabilidad: mensaje PO→propuesta y manifest exactos→recibo de diseño→candidata51/contratos/dictamen técnico→decisión competente pendiente→futura publicación→implementación/pruebas→Release QA por bytes reales→H01–H10→cierre rector→entrada6A4. Supuestos introducidos:NONE; archivos fuera de alcance modificados:NONE. Conflictos pendientes: nuevos bytes todavía sin aprobación/publicación competente, dictamen Data pendiente, Release y actos humanos no ejecutados. La aprobación de diseño **sí** está acreditada; no permanece como bloqueo.
