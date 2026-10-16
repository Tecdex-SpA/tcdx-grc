# STEP_6A3 — incorporación inicial, ejecución y bloqueos finales

`MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.10_2026-10-15`
`RECTOR_MANIFEST_SHA256=b9b6bf6930931af5eb32ca1b4027212ad3a82f247fef677b919af24d30ac9060`
`RECTOR_BASELINE=PASS; STEP_6A3=PARTIAL_BLOCKED; RECTOR_GATE=BLOCKED; STEP_6A4=NOT_STARTED`
`CODEX_VARIATION_BUDGET=ZERO; TASK_PACKET_STATUS=BLOCKED`

Continuación en `/private/tmp/tcdx-grc-step6a3-prep-20261015`, rama `codex/step6a3-c04w-cfgd-prep-20261015`, HEAD `23c7b50468213b8c0769ca2607349e04f4c32eae`. Este informe sucede aditivamente a los informes de continuidad: no altera sus recibos ni presenta sus acciones como nuevas. Fuentes de autoridad: AGENTS, rector46,23/24,17/19/38,21/22/25/29,45/47/49 y las enmiendas físicas/ejecutables publicadas. Evidencia nueva: `evidence/final-blockers-execution-20261015/`.

## 1. Resultado: no hay una ruta publicada para el primer documento en este estado

El ciclo es **documental/operativo**, no una ausencia de tablas: `fuente elegible → aplicabilidad acreditada publicada → upload/finalize/EvidenceCreate → primera fuente elegible`. El esquema R2 admite FK a draft, pero el contrato exige publicada para esas tres operaciones. La capacidad física no autoriza excepción de negocio. No se usó publicación sin source como bootstrap.

| Paso real | Contrato efectivo y operación | Predicado efectivo / impedimento |
|---|---|---|
| Crear contexto | DELTA C-04W, OpenAPI y `retentionApplicabilityCreate`, POST `/api/v1/retention-policy-applicabilities` | Tenant humano autorizado, `privacy.retention_policy.create`, PRIVACY, policy publicada tenant-owned. Crea draft; source/cláusula opcionales hasta respaldo pendiente. No crea source ni publica. |
| Enviar / revisar / aprobar / publicar | DELTA, mapping exacto y `retentionApplicabilitySubmitForReview`, `Review`, `Approve`, `Publish` | Permisos update/review/approve/publish, tenant, CAS/If-Match, idempotencia y auditoría. Approve exige identidad distinta del autor. Published es inmutable. Body sólo de transición; no permite incorporar source/cláusula. No existe operación de update/bind de aplicabilidad en el contrato publicado. |
| Solicitar carga | Rector24 §9; storage14 C-04W; OpenAPI `UploadIntentCreateRequest`; POST `/api/v1/files:request-upload` / `uploadIntentCreate` | FK applicability y policy obligatorias, clasificación/contexto/procedencia; `evidence.document.create`, EVIDENCE_DOCUMENTS y ObjectPolicy. `createUploadIntent` llama `assertPrimaryRetentionApplicability` antes de asignar cuarentena. |
| Resolver primaria | `apps/backend/src/core-grc/retention-applicability.ts`, función `assertPrimaryRetentionApplicability` | Mismo tenant/policy/clasificación/propósito; contexto compatible; applicability **published/vigente/no supersedida**, policy ordinaria **published/vigente**, sin peer conflictivo de igual/superior precedencia. Si no:422. No compara únicamente existencia de FK. |
| Recibir / finalizar | PUT `/api/v1/file-upload-intents/{id}/content`; POST `/api/v1/file-upload-intents/{id}:finalize` | Autor/scope/document.update; intent pendiente no expirado y CAS. `finalizeUploadIntent` vuelve a llamar el predicado de primaria. Scan-PASS, MIME/hash/storage reales; FileObject conserva exactamente la FK. Relajar sólo request-upload no resuelve este paso. |
| Materializar evidencia | POST `/api/v1/evidence` / `evidenceCreate` | FileObject del mismo tenant scan-PASS, policy/FK/contexto concordantes; llama **otra vez** a primaria. EvidenceVersion hereda FK. Soporte source con links vacíos está limitado por ObjectPolicy; no existe entrada inline/directa/import publicada que sustituya esta cadena. DocumentVersion tampoco aporta aquí una ruta de carga inicial independiente. |
| Fuente elegible | Rector24, DELTA, storage14 y guard físico `privacy.c04w_guard_applicability` | EvidenceVersion approved, mismo tenant, FileObject directo/DocumentVersion scan-PASS, effective_from real y vigente, no vencida, cláusula y contexto auténticos. Review de evidencia independiente. Scan o un campo source_kind no acreditan legalidad. |
| Cierre del círculo | R2, API de aplicabilidad y datos QA | R2 sólo comprueba source si no es NULL; tolerar publicación NULL no es autoridad para una aplicación jurídica acreditada. La API de transición no puede llenar source/cláusula de una fila ya creada. La UNIQUE de contexto/versión y predecesora publicada impiden resolverlo inventando otra v1 o sucesora de un draft. |

Los snippets, números de línea y hashes se preservan en `contract-chain.json`. Se cotejaron schemas cerrados, matriz de operaciones, permisos/ObjectPolicy y enmiendas: no hay excepción publicada de incorporación inicial. No se ejecutó una supuesta ruta de éxito ni se presentó una prueba sintética como evidencia jurídica.

QA real a `2026-10-15T20:47:50.826Z`: una policy ordinaria publicada, dos aplicabilidades under_review/row_version2, **cero publicadas**, cuatro auditorías de aplicabilidad y34 migraciones. La única EvidenceVersion sigue approved/row_version4, effective_from NULL y archivo histórico sin applicability. Es insuficiente para source inicial; no se alteró ni utilizó como fundamento.

## 2. Una sola corrección propuesta; implementación detenida

`INITIAL_RETENTION_SOURCE_BOOTSTRAP_DELTA_DRAFT_20261015.md` contiene **una única propuesta**: custodiar la primera fuente auténtica sobre una nueva aplicabilidad draft propia, usando la cadena existente, y agregar un comando específico `retentionApplicabilityBindInitialSource` después de la aprobación independiente de EvidenceVersion. Luego se usan revisión/aprobación/publicación canónicas. Nunca se publica primero una aplicabilidad sin respaldo.

El delta cubre las tres revalidaciones, ObjectPolicy de fuente pendiente, prohibición de uso de negocio/purge, vinculación final con CAS/replay y un AuditEvent nuevo. Reutiliza permisos, grants, tablas, columnas, FK, storage y estados; **ninguna migración prevista**, sujeto a dictamen físico y pruebas de la implementación futura. No existe todavía ese comando y no se ejecuta desde este informe.

Estado: `BLOCKED_CONTRACT_DECISION`. Owners: PO en funciones Architecture/Data Model/Security-Privacy y Privacy-Legal competente; QA/Release para gates posteriores. Decisión concreta: revisar/decidir **los bytes de esta propuesta y su SHA en `DECISION_MANIFEST.json`**, no volver a aprobar el paquete anterior. Una aprobación del diseño permitirá preparar sucesoras exactas bajo47/49; no activa baseline ni endpoint ni autoriza deploy por sí sola. Los diez artefactos anteriores conservan sus PASS. La corrección no se implementó.

## 3. Negativos QA independientes ejecutados

Todos sobre `https://grc.tecdex.net/`, con imágenes finales existentes. El principal real M2M fue autenticado con client_credentials normal, token verificado y ServicePrincipal existente `01a13c3b-dbdd-763f-bcbb-f16ff41d99ba`. No se emitió token humano, no se impersonó una identidad ni se ejecutó `iam.publish/provision`, registry o cambio de grant. Credenciales y tokens permanecieron sólo en memoria del proceso remoto; no se imprimieron/persistieron.

| Prueba / alcance | Método y path | Esperado / observado | Estado |
|---|---|---|---|
| Principal M2M sin autoridad tenant humana | GET `/api/v1/retention-policy-applicabilities` |403/403, `TCDX.AUTHORIZATION.DENIED` | PASS |
| Mismo principal, objeto QA real | GET `/api/v1/retention-policy-applicabilities/01a14126-bc97-7721-85e4-e34026cf4213` |403/403 | PASS |
| Intento de approve sin autenticación, caso existente | POST `/api/v1/retention-policy-applicabilities/01a14126-bc97-7721-85e4-e34026cf4213:approve` |401/401, `TCDX.AUTHENTICATION.REQUIRED` | PASS |
| Bearer inválido | GET `/api/v1/retention-policy-applicabilities` |401/401, `TCDX.AUTHENTICATION.INVALID` | PASS |

Cada recibo incluye method/path/status, correlation enviado/devuelto, error code y SHA-256 del cuerpo en `qa-inspection.json`. Los cuatro correlation IDs retornados coinciden con los enviados. Las dos filas de aplicabilidad permanecen exactamente iguales antes/después; no hubo approve/publish ni release. Estos403 prueban la frontera M2M/humana, **no** una negativa SoD del autor ni aislamiento entre humanos.

| Recibo adicional requerido | Estado exacto y razón |
|---|---|
| DENY autoaprobación con el autor C-04W real | NOT_RUN en esta ejecución: hay autor canónico, pero no hay herramienta de navegador ni canal de sesión humana autenticada disponible. La sesión parcial informó el intento; no se fabricó HTTP ni token para repetirlo.401 de anónimo no lo sustituye. |
| Rechazo de valid forzado Controls/Compliance v1 | NOT_RUN para nuevo recibo HTTP por la misma limitación de sesión; se reutiliza Controls insufficient_data auditado y su histórico intacto. No se repite submit exitoso sobre el assessment completed ni se muta el aprobado histórico. |
|404 cross-tenant humano y403 por permiso/entitlement específicos | NOT_RUN: requieren identidad/sesión/contextos aptos. El inventario observado contiene dos memberships activas en un tenant; no se inventaron tenants/actores ni se desactivó un entitlement para producir rechazo. |
| Fuente no aprobada/no scan-PASS, cadena discordante y hold dependientes de H01–H06 | BLOCKED_HUMAN_ACTION + BLOCKED_CONTRACT_DECISION; no hay fuente inicial/recorrido aprobado. Las pruebas aisladas previas conservan su alcance. No se activa ni libera un hold ficticio. |

No hay tests ejecutados con resultado FAIL en esta continuación. `BLOCKED_CONTRACT_DECISION` describe la ausencia del recorrido aprobado; no reetiqueta los cuatro negativos PASS como fallos.

Para el futuro recibo CFG-D, el criterio no es cualquier error HTTP: submit de v1 sin inventario de suficiencia degrada `valid` solicitado a `insufficient_data`, con métricas/cobertura/conclusión nulas. El intento posterior de aprobación sin suficiencia produce422 contractual. Un409 por intentar reenviar un assessment ya completed o un401 por no estar autenticado no acreditan ese guard. Conservar cuerpo diagnóstico/audit y método/path/status/correlation sanitizados de cada acto; las pruebas de Controls ya persistidas no se repiten sólo para recrear datos.

## 4. Actores existentes: separación comprobada, sin atribuir consentimiento

`qa-human-contexts.json` acredita roles/permisos efectivos por catálogo/membership en lectura, no una aprobación ni sesión humana:

| Membership / UserIdentity | Capacidad observada | Límite para el próximo acto |
|---|---|---|
| `01a0cfc7-0e5d-764f-92d8-a15e25223325` / `01a0cfae-d860-730d-88b8-d8b1b3f5d7dc` | Tenant Admin y otros roles existentes; evidence.approve/review y privacy.retention_policy.approve/update | Es autor de la EvidenceVersion histórica y de los casos técnicos. No puede autoaprobar su propia fuente/aplicabilidad. No se usaron sus derechos sin sesión real. |
| `01a0e8a9-7935-736d-bc0c-4f7809291919` / `01a0e832-ccb7-7574-8316-0781503d47de` | Legal Reviewer, Evidence Owner y Control Owner; `privacy.retention_policy.approve` vigente | Puede ser candidato independiente para aplicabilidad, sujeto a ObjectPolicy real; **no tiene `evidence.evidence.approve`**. No puede darse por satisfecho H04 sólo por ser Legal Reviewer. |

Con el autor actual no se constató un actor independiente ya habilitado para aprobar su EvidenceVersion. `SOURCE_EVIDENCE_REVIEWER=BLOCKED_HUMAN_ACTION` para esa autoría. La única propuesta nueva separa custodia de aplicabilidad y autoría documental: un Evidence Owner existente puede escribir la nueva fuente, el Tenant Admin distinto puede revisarla si tiene evidence.approve, y el Legal Reviewer distinto del autor del draft puede aprobar la aplicabilidad. Así no se exige automáticamente una tercera persona ni nuevos grants. Ese recorrido no está autorizado ni implementado hoy: depende de aprobar/publicar la corrección y revalidar permisos/scope de cada comando y sesiones reales. El responsable debe aportar actores/sesiones aptos por el procedimiento gobernado; esta ejecución no concede permisos, crea personas ni solicita un bypass SoD. La separación se evalúa por objeto, nunca se cambia la autoría histórica para hacerla pasar.

## 5. Paquete humano corto y ejecutable H01–H10

Todo recibo humano debe incluir identidad, rol, fecha UTC real, tenant, IDs/versiones, correlation, resultado y hash/captura sanitizados. No exportar tokens, cookies o documentos reservados al repositorio. La plantilla sin firmar del checklist anterior sigue disponible; complementar con estos bloqueos y versión efectiva.

| Orden / H | Actor competente | Pantalla / acción | Prerrequisito y recibo esperado |
|---|---|---|---|
|1a · H02 | PO/Architecture/Data Model/Security-Privacy, con Privacy-Legal | Decidir propuesta `INITIAL_RETENTION_SOURCE_BOOTSTRAP_DELTA_DRAFT_20261015.md` por manifest/hash | Decisión exacta sobre esos nuevos bytes; preparar/publicar sucesoras sólo tras gates47/49. No ratificar los diez artefactos existentes. Sin decisión, no pedir al tenant que ejecute una carga imposible. |
|1b · H01, en paralelo | Responsable Privacy/Legal del tenant | Aportar por canal autorizado el documento auténtico y el origen, cláusula, clasificación, contexto/Subject/actividad y vigencia reales | Hash de archivo autorizado y constancia del responsable; una propuesta comercial de12meses no sirve como fuente firmada. |
|2 · H03–H04 | Tenant Admin/autor habilitado y revisor Evidence independiente apto | Después de contratos/implementación/gates: https://grc.tecdex.net/configuraciones/empresas y `/evidencias`; cargar, scan, Evidence, submit/start-review/approve | Cadena intent/file/version con hash real; EvidenceReview independiente y audit. Verificar antes que el revisor tenga evidence.approve; el candidato Legal Reviewer actual no lo tiene. No modificar IAM durante estas pruebas. |
|3 · H05–H06 | Autor del draft; Legal Reviewer distinto del autor; publicador autorizado | Vincular fuente por el comando **futuro** sólo tras su publicación; después solicitar revisión, aprobar y publicar aplicabilidad | Fuente/cláusula/intervalo auténticos, FK congruentes, CAS e idempotencia, AuditEvents. No modificar los dos under_review ni la versión histórica effective_from=NULL. |
|4 · H07 y negativos independientes, realizable ahora con sesión apta | Autor/QA humano con sesión Zoho real y permisos existentes | https://grc.tecdex.net/controles → Evaluaciones de control: revisar diagnóstico `01a14122-06e4-748d-a3db-5935f64c1901`. En empresa, autor intenta approve del caso `01a14126-bc97-7721-85e4-e34026cf4213` | Controls diagnostic insufficient_data/métricas nulas, histórico intacto; autoapprove403 y row_version2 sin aprobación. Para valid forzado usar sólo caso diagnóstico nuevo autorizado en estado ejecutable, o recibo original si se recupera; no reutilizar completed como si aún fuera editable. Guardar método/path/status/correlation/hash. |
|5 · H08–H09, independiente de fuente para pantallas actuales | Autoridad QA/UI y actores humanos ya habilitados | Configuración empresa, Evidencias y Controles; escritorio/estrecho, navegación/foco, español, estados insuficientes, recarga y selector Empresa activa | Capturas QA reales y aceptación/rechazo explícitos por imágenes exactas; aislamiento/permiso/entitlement sólo con contextos aptos existentes. Si faltan, NOT_RUN; no crear tenant ni modificar IAM. La fuente/hold dependiente se completa después del orden3. |
|6 · H10 | QA/Release y responsables competentes | Incorporar acta real y verificar todos los recibos/gates de STEP_6A3 | Firma/acto humano y decisión exacta tras evidencia, sin valores PASS anticipados. Sólo entonces procedimiento rector de cierre; STEP_6A4 sigue NOT_STARTED. |

La versión QA que debe inspeccionarse sigue siendo backend `sha256:474e525a3e6b2bcc067dda7a77039b36f2832ca37d138b1424a700644560fc6d` y frontend `sha256:552ff3e9412cb1c78bfa3400c26c8835c6a2bfa09a6db1dc72ef18b8a2712eeb`: ambos healthy y cero reinicios. Una corrección futura desplegada exige vincular la aceptación a sus nuevos bytes y gates; este informe no autoriza ese despliegue.

## 6. Dirección comercial recibida: registrada, sin efecto runtime

El PO fijó12meses como predeterminado comercial de **futuros contratos de servicio GRC Tecdex** y alternativas12/18/24/36/48/60 de acuerdo con lo pactado. Se conserva como dirección comercial/de configuración en `PO_COMMERCIAL_DIRECTION_RECEIPT_20261015.json`, sin inventar hora original de firma, contrato firmado ni fuerza jurídica. Prevalecen las obligaciones específicas legales/contractuales donde corresponda. No hay selección/default persistido, conversión mes→segundos, seed, valor de catálogo, grant ni publicación. La definición temporal/parametrización futura se decidirá en su alcance propio; **no es una nueva obligación de cierre STEP_6A3**. No reemplaza ni modifica la policy QA existente de604800segundos ni la baseline operacional de retención.

## 7. Evidencia, checks, archivos y alcance final

PASS reutilizados con hashes conservados: cuatro+seis aprobaciones, publicación física/ejecutable efectiva, registry M2M5, R2/ledger34, esquema242/cero mismatches, imágenes/builds, paridad187/77, CFG-D Controls y C-04W exitosos, typecheck/pruebas focalizadas/visuales previas. El paquete anterior de63 archivos permanece sellado. No se repitieron sus publicaciones, migraciones, builds, despliegues o suites.

Checks nuevos: verificador v1.10 (activación/historia/51candidatos) y ledger actual PASS; integridad SHA de los63 archivos previos PASS; cuatro negativos HTTP PASS con correlations y hashes; preservación exacta de aplicabilidades PASS; inventario QA roles/permisos/policy READ_ONLY; diff whitespace y verificación de recibos/manifests documentales. La llamada inicial a los verificadores desde el directorio de evidencia tuvo un cwd incorrecto y no arrancó; se ejecutó desde raíz y pasó. No se cuenta ese intento como fallo de producto/test. Los checks finales y sus códigos de salida se guardan en `execution-checks.json`.

El escáner de secretos marcó inicialmente la copia textual del status anterior por una línea de estado histórica cuyo fingerprint ya estaba revisado/aprobado en su ruta canónica. Se confirmó el hash exacto, sin material secreto; se conservó el snapshot anterior como texto JSON reversible con el mismo hash original. No se amplió ninguna excepción del escáner ni se modificó su código. Se conservan el hallazgo inicial, la explicación verificable y el resultado corregido en los recibos nuevos.

Archivos nuevos: este informe, propuesta DRAFT única y `evidence/final-blockers-execution-20261015/` con fuentes de probes, JSON sanitizados, chain/hash, direction receipt y manifest de decisión. Actualizaciones permitidas: anexos al expediente residual, MASTER_EXECUTION_STATUS y checklist humano. El checklist anterior está sellado por manifest de continuidad: se añade un complemento separado si alterar sus bytes invalidaría el sello; no se cambia ese archivo ni el ledger macro firmado.

Capas: BD sin DDL/DML; contratos activos sin modificación/publicación; backend/frontend runtime sin cambio; infraestructura y contratos de deploy sin cambio; sólo documentación y herramientas de evidencia. OAuth M2M normal obtuvo un token efímero para lecturas denegadas y puede generar su log de autenticación normal; no es modificación de IAM. Sin producción, commit, push, merge, reset/clean, fuentes falsas, grants ni avances a6A.4. Supuestos introducidos: NONE; archivos fuera de alcance modificados: NONE.

Trazabilidad: rector23/24/46 → sucesoras C-04W aprobadas → predicado de primaria en tres operaciones + invariantes R2 → snapshot QA sin fuente/primaria → contradicción inicial → propuesta nueva **pendiente de aprobación**; rector22/25 → principal M2M real y negativas HTTP → recibos sanitizados. CFG-D38/27 sucesor conserva diagnóstico/no valid/historia. Conflicto no resuelto: recorrido inicial no autorizado; dependencias humanas: fuente/actor revisor apto/sesión y aceptación QA. Estado final permanece **PARTIAL_BLOCKED / RECTOR_GATE=BLOCKED / STEP_6A4=NOT_STARTED**.
