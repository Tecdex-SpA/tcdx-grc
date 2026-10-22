# STEP6A3 — PASO 9.2B — validación de vínculos

`MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16`; `RECTOR_GATE=PASS` para diagnóstico y pruebas. `STEP6A3=PARTIAL_BLOCKED`; aceptación funcional pendiente; `STEP6A4=NOT_STARTED`. Dominio único https://grc.tecdex.net/.

## Diagnóstico acreditado

El rechazo `details.field=links` coincide exactamente con `createEvidence` en backend QA: `!Array.isArray(body.links) || (body.links.length === 0 && !tenantAdminSource)`. El recibo de sólo lectura conserva el guard compilado, imagen y hash. No es un fallo de transferencia, fechas ni serialización.

Consulta REPEATABLE READ READ ONLY: user3 activo en TECDEX, roles vigentes EVIDENCE_OWNER y PRIVACY_MANAGER, ambos scope tenant. El último FileObject es `01a15505-0565-758c-a3fd-1c4142fde098`, creado 2026-10-19T16:35:54.835Z por user3, scan passed, sin EvidenceVersion. Tiene policy `01a146ce-bf2e-74cc-972b-154081141b64` y aplicabilidad `01a146f1-8dbe-723a-92a1-24c2bbf1ae45` publicada. No es INITIAL_SOURCE draft, ni fuente documental de un Tenant Admin sin Evidence Owner. Por tanto el predicado de excepción es falso y el arreglo vacío produce el HTTP400 observado. El inventario de audit consultado sólo contiene la creación exitosa histórica; no se afirma que todos los rechazos estén en ese stream transaccional.

## Comportamiento contractual

OpenAPI `EvidenceCreateRequest` requiere `links`; **no admite omisión**. Su esquema array `minItems:0` admite sintácticamente `[]` porque el mismo comando incluye una ruta documental especial. No significa que todo actor/contexto pueda crear evidencia ordinaria sin vínculo. Rector24 distingue evidencia de negocio y fuente documental inicial; el delta C-04W v1.10 autoriza `links=[]` para fuente de Tenant Admin, y INITIAL_SOURCE v1.11 conserva esa capacidad acotada con custodia y ausencia de primaria publicada. DR001 §4/v1.12 conserva las cargas ordinarias y no convierte esa excepción en universal. No se altera la retención ni se inventa una nueva excepción por tratarse de un PDF.

En el caso ordinario de user3 se exige al menos un vínculo auténtico. Cada elemento admite exactamente uno de: `requirement_id`, `control_id`, `control_version_id`, `requirement_assessment_id`, `control_assessment_id`, `assurance_test_id`. Tenant y acceso deben ser compatibles; referencias globales exigen visibilidad de pack. No se admite RetentionPolicy ni su aplicabilidad como target de EvidenceLink. Un ControlVersion global solo no demuestra implementación del tenant.

Formulario y ApiClient corresponden al transporte: `StructuredCollectionEditor` permite agregar un elemento y escoger un target tipado; cuando no hay elementos CreateDrawer envía `[]`; ApiClient.post serializa el body sin eliminar vínculos. El backend conserva la precondición contextual que la forma de OpenAPI no expresa. No se demuestra una discrepancia que autorice relajar backend, cambiar contrato o forzar vínculos desde frontend. No se cambia implementación ni se despliega.

## Objetos existentes en TECDEX

Consultados exclusivamente para este diagnóstico, sin crearlos ni vincularlos:

| Tipo | Referencia existente | Estado |
| --- | --- | --- |
| Control tenant | `01a118d7-6222-7470-8a85-306e07659f4a` — QA-F5-20261007-CONTROL — QA Phase5 20261007 - Control de requisitos de clientes | active |
| ControlAssessment | `01a11afc-7f48-701e-9c0b-c2bc01ba0a5e` | approved, no_data |
| ControlAssessment | `01a14122-06e4-748d-a3db-5935f64c1901` | completed, insufficient_data |
| AssuranceTest | `01a118d7-e604-7298-bae3-8b9da3eb809d` — QA-F5-20261007-ASSURANCE | approved, no_data |
| RequirementAssessment | `01a11afc-7a61-743f-9add-fbd93a87ddd7` | approved, no_data |

Se constató además una aplicabilidad de requirement del tenant, referida a requirement `01a0ea93-a4b4-70c2-a621-720d94c90124`. No se declara elegibilidad global sin comprobar su acceso por pack. Los demás objetos figuran con tenant TECDEX y user3 tiene permisos de lectura tenant para esos cuatro tipos. El backend comprueba existencia/tenant del target; los selectores conservan sus lecturas autorizadas. **Elegibilidad técnica no acredita pertinencia del contenido**: no se leyó el PDF ni se determina que respalde el control de requisitos de clientes. No se recomienda asociarlo sólo para superar la validación.

## Pruebas focalizadas y alcance

Cuatro pruebas Vitest nuevas, con executor simulado y cero escrituras QA:

1. Evidence Owner ordinario con links=[]: HTTP400/field links antes de cualquier INSERT.
2. Un target Control del mismo tenant existente en el fixture: creación de Evidence/Version/Link aceptada.
3. Fuente propia Tenant Admin con links=[]: excepción conservada.
4. Omisión de links: rechazo por required antes de consultar persistencia.

Resultado 4/4 PASS; otras22 pruebas omitidas. Rector Governance Gate exit0 PASS y whitespace PASS. No se repitieron login, transferencia, fechas ni otras aceptaciones funcionales. Sin cambios a implementación backend/frontend, contratos, esquema/datos, IAM/RBAC, infraestructura, arquitectura ni runtime. Sin build o deploy innecesario. Sin conflictos rectores nuevos; no se interpreta minItems:0 como autorización para eludir la precondición de negocio. Modificaciones: caso de pruebas en core-grc.test.ts, script diagnóstico READ ONLY, este informe, evidencia y entrada aditiva de estado. El trabajo pendiente anterior queda preservado.

## Retomar únicamente PASO 9.2B

Mantener abierto el formulario rechazado, con el FileObject ya finalizado; no cerrar/recargar, volver a seleccionar PDF ni cambiar política/clasificación, porque eso puede perder o invalidar su estado en memoria. En **Vínculos → Agregar elemento → Tipo de objeto**, seleccionar el objeto existente que el documento efectivamente respalda y escribir una declaración veraz si corresponde. El control identificado sólo debe seleccionarse si existe esa relación real; no hay evidencia para decidirla automáticamente.

Con un target real seleccionado, Crear registro reenvía el mismo FileObject y no ejecuta una transferencia nueva. Después del éxito, recargar el listado y verificar el código ingresado. El payload informado usa `QA_RET_ORD_001`; no confundirlo con `QA_EVID_RET_001` de intentos anteriores al buscar el resultado.

Si el PDF es únicamente un documento de retención y no respalda ninguno de los seis tipos admitidos, este caso ordinario no se desbloquea agregando un vínculo artificial. Detener ese intento y precisar su finalidad funcional; no cambiar roles, crear registros auxiliares ni transformar la carga en INITIAL_SOURCE. Si el formulario ya se cerró, el archivo permanece en MinIO/PostgreSQL pero la UI existente no lo recupera automáticamente; no repetir transferencia para compensarlo.

Recibos: `evidence/evidence-links-20261019/RESULT.json`, `qa-readonly.json`, `backend-runtime-readonly.json`, `focused-tests.log`, `rector-governance.log` y `SHA256SUMS.txt`. No se declara aceptación ni cierre de STEP6A3.
