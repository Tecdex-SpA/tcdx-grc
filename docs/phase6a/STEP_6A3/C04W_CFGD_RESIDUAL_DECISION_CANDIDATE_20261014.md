# STEP 6A.3 — C-04W / CFG-D, decisión residual candidata

`STATUS=DRAFT_NOT_EFFECTIVE`  
`MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.9_2026-10-14`  
`SCOPE=C-04W, CFG-D-COMPLIANCE-V1, CFG-D-CONTROLS-V1, CFG-D-PUBLICATION`  
`STEP_6A4=NOT_STARTED`

Este texto identifica los deltas que la decisión funcional del Product Owner de
2026-10-14 no publica por sí sola. No altera la baseline, los contratos físicos
o ejecutables vigentes, los grants, las versiones v1 ni datos históricos.

## C-04W — decisión exacta pendiente de publicación contractual

1. `RetentionPolicy` continúa siendo la única autoridad de duración,
   `policy_kind`, prioridad, versión, intervalo y lifecycle. La configuración
   pertenece al tenant. El Tenant Admin del mismo tenant puede preparar,
   consultar, actualizar y solicitar publicación de su política; la aprobación
   de la misma política requiere una identidad humana distinta conforme al
   SoD operacional vigente. Ninguna autorización cross-tenant o Platform se
   deriva de esta decisión.
2. El catálogo ejecutable 05 y sus grants vigentes asignan
   `privacy.retention_policy.read/create/update/review/publish` a roles distintos
   de `TENANT_ADMIN`; `approve` corresponde a `LEGAL_REVIEWER`. Se requiere un
   delta exacto de RolePermission para Tenant Admin, sin grant directo a
   UserIdentity y sin conceder autoaprobación. Este candidato no publica ese
   delta ni presupone que el Tenant Admin tenga otro rol.
3. El modelo físico vigente tiene `retention_policy_id` obligatorio en
   `FileUploadIntent`, `FileObject` y `Evidence`, pero carece de vínculo tipado
   que identifique la fuente documental y el ámbito jurídico/operacional de
   aplicación a cada objeto. `regulatory_source_id`, `source_provenance`,
   `provenance_ref`, igualdad de policy ID y el link Evidence→Requirement/Control
   no sustituyen esa relación.
4. Delta canónico mínimo sometido a revisión: una relación versionada y
   tenant-owned de **aplicabilidad de RetentionPolicy** que identifique la
   versión exacta de policy, clase de objeto cubierto, propósito de carga,
   clasificación, contexto/actividad y período efectivos, fuente documental
   mediante `EvidenceVersion` scan-PASS/revisada cuando exista, cláusula
   declarada, actor y procedencia. Debe poder existir como política configurada
   antes de que se acredite respaldo documental, sin emitir conclusión jurídica.
   `FileUploadIntent` referencia esa aplicación al solicitar la carga;
   `FileObject` hereda el mismo vínculo tras scan-PASS; `Evidence` conserva el
   vínculo de su `EvidenceVersion`/archivo. Las tres FK de RetentionPolicy
   actuales permanecen obligatorias y deben concordar con la aplicación.
5. El resolver transaccional revalida publicación, intervalo, tenant, ámbito,
   fuente y prioridad en `request-upload`, `finalize` y `evidenceCreate`.
   Ante obligaciones concurrentes aplica rector 23 §8: legal hold prevalece;
   una obligación legal/regulatoria/contractual acreditada no se reduce por
   policy tenant; conflicto no resuelto falla cerrado para selección o purge.
   Un documento cargado acredita procedencia técnica, no validez jurídica.
   El estado de respaldo insuficiente se expone sin llamarlo cumplimiento.
6. Esta relación no figura en el catálogo canónico 33 ni en el modelo físico
   congelado. Su definición de claves, cardinalidades, constraints, FKs,
   versiones y política de concurrencia exige aprobación de Architecture,
   Data Model, Privacy/Legal y Security antes de DDL, backend, frontend o QA.
   El origen de un documento de respaldo debe poder cargarse sin circularidad:
   una política tenant operativa configurada puede gobernar ese upload, pero
   no adquiere por ello respaldo legal acreditado.

**Decisión solicitada:** aprobar o rechazar el delta canónico tipado de los
puntos 2–6, con sus bytes y posterior modelo físico/ejecutable exacto. La
responsabilidad funcional del Tenant Admin y el aporte de fuentes por tenant
ya fueron decididos y no se someten nuevamente.

## CFG-D — incompatibilidad literal y reemplazo propuesto

Los textos aún pendientes `CFG-D-COMPLIANCE-V1` y `CFG-D-CONTROLS-V1` exigen
confirmar autosuficiencia de las v1; `CFG-D-PUBLICATION` exige publicar el modo
versionado. No existe prueba de inputs oficiales completos ni vínculo de modo.
La decisión PO de 2026-10-14 ordena expresamente no afirmar autosuficiencia,
no publicar `configuration_mode=none` y conservar v1 con
`EffectiveConfiguration` opcional. Por tanto, los textos pendientes no pueden
recibir PASS bajo su redacción actual.

**Reemplazo exacto propuesto para esas tres cláusulas, sin alterar rector
17/19/23/29/35/38 ni contrato 27:**

> Para BASELINE_COMPLIANCE v1 y BASELINE_CONTROL_EFFECTIVENESS v1 se conserva
> la fórmula, los parámetros y el binding de metodología publicados, así como
> la opcionalidad contractual de EffectiveConfiguration. Una referencia EC
> presente debe ser válida para tenant y dominio; EC ausente no declara
> autosuficiencia ni equivale a `configuration_mode=none`. Los inputs, evidencia,
> procedencia o conflictos insuficientes producen el `result_status` rector
> correspondiente y no un resultado oficial `valid`. No se publica modo
> `none`, no se crea versión sucesora, no se reescriben assessments o snapshots
> históricos y no se infiere configuración vacía. La publicación versionada de
> un modo sólo será exigible si una versión futura pretende declarar
> autosuficiencia, con su expediente y gates propios.

Este reemplazo cambia una obligación aprobada fuera de la baseline activa;
requiere aceptación humana expresa de sus bytes exactos conforme a rector
45/49. `CFG-D-HISTORY` ya cerrado se preserva. Ninguna firma convierte en
válido un cálculo que no tenga inputs suficientes, ni dispensa pruebas
dirigidas de los guards actuales.

## Gate de esta candidatura

`RECTOR_GATE=BLOCKED` y `STEP_6A3=PARTIAL_BLOCKED` hasta aprobación exacta
de los deltas necesarios, implementación, pruebas PostgreSQL positivas y
negativas, QA real del slice y aceptación macro residual. Las aceptaciones
IAM, comercial y VOC-C04 existentes no se reabren.
