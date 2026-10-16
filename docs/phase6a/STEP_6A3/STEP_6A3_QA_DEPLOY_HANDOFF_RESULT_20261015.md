# STEP_6A3 — resultado de promoción QA y traspaso, 2026-10-15

Observado hasta 2026-10-15 23:11 UTC en el mismo worktree `codex/step6a3-c04w-cfgd-prep-20261015`. Alcance: exclusivamente QA; sin PROD, DNS, commit, push, merge, migración, grant ni republicación M2M.

## Autoridad y estado final

`MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.11_2026-10-15`; `RECTOR_BASELINE=PASS`; `QA_DEPLOY=PASS`; `HUMAN_QA_ACCEPTANCE=PENDING`; `STEP_6A3=PARTIAL_BLOCKED`; `RECTOR_GATE=BLOCKED` para cierre integral; `STEP_6A4=NOT_STARTED`.

La activación real consta en `docs/rector/ACTIVE_ACTIVATION.json`, `BASELINE_ID`, manifest y verificador v1.11. El manifest de bootstrap aprobado SHA-256 `f4db8b38ac4fb18abb0978f9654a83def7b4ee024bafff560a8dbf6e9b7f9247` y el del delta submit v2 `df66515d794942c6f18e8a61fb3d398fb679c7b2111ea225571a77e605b8f19b` coinciden con los recibos humanos. La autorización Release QA es condicional y está ligada a esos bytes; no acredita aceptación QA, independencia operacional ni fuente jurídica. El release gate `step6a3-initial-source-20261015`, SHA-256 `549687ebca9215a5b2936898db47e62c35fad7f212194217605d8c0da22c4af6`, pasó el preflight en ambos hosts. Su estado de datos es el snapshot de promoción, corroborado después con consulta de solo lectura.

## Herencia comprobada y acciones ejecutadas

Se conservaron la publicación M2M real `EvidenceVersion.submit` v2 y su replay sin duplicados (recibo SHA-256 `ba9bb4ea8686ec18e08edff7b884a6518c8ccb84e846cdea9f72828c081afb97`), las 34 migraciones, cinco aristas C-04W y los históricos. Los hosts seguían en las imágenes anteriores y saludables; no había promoción activa ni recibos de activación nuevos. Las dos imágenes candidatas ya existían en sus hosts, con arquitectura amd64 y etiquetas de source SHA iguales a los build receipts. Se transfirieron los artefactos faltantes a staging protegido, se verificaron el gate y los hashes de scripts, se hizo staging con respaldo del gate anterior y se ejecutó el promotor existente: primero backend, luego frontend. Ambos preflights y activaciones devolvieron PASS. Los contenedores anteriores quedaron detenidos con nombre de rollback, sin borrado.

| QA | Imagen y source SHA-256 | Contenedor activo | Rollback conservado |
| --- | --- | --- | --- |
| Backend `.45` | `sha256:bda003a95edc7758b8a8694dbec698d1a5b1456663c063b6dd5da12e4fcc2ea2`; `90f59780884c439b36f51f4a91a4311b0baa34f272ce50c1b4d8b1a8c4ac7a86` | `49b317a51c70f47f99aeaa79e8ee5341f487de5792eef3872e1d0b7013fb4393` | `5aeecc52ff00d978f32bc4edb0f522efa66f3ada65a87d6e3ac27bda36b9e734`, imagen `sha256:474e525a3e6b2bcc067dda7a77039b36f2832ca37d138b1424a700644560fc6d` |
| Frontend `.46` | `sha256:75ba877f2e39cdab7e47e64fb12c9e279355832053aad44df4ffef5246dcd652`; `6c7fff0eba38d69c44255ef069c0b60a0a42b629ebf297a6c6e15c44becbdfae` | `9f30cf1ae504071c7f6e96b8f6e8f857c1648a8d80266d4d2420fc1e6f657a68` | `702ffb7d8c574de39754101f5fb4097e718768eb8fca1c0e91bef1e0e4806370`, imagen `sha256:552ff3e9412cb1c78bfa3400c26c8835c6a2bfa09a6db1dc72ef18b8a2712eeb` |

Ambos activos: `running=true`, `healthy`, reinicios `0`; gate local idéntico en ambos hosts. Recibos en `~/.config/tcdx-grc/step6a3-iam-m2m-20261014/{backend,frontend}-activation-step6a3-initial-source-20261015.json` en el host respectivo. El promotor preservó configuración, mounts y red del servicio anterior. No se ejecutó rollback porque no falló el health gate.

## Validación posterior y límites

| Control | Resultado |
| --- | --- |
| Gobernanza v1.11, historia protegida y manifest; verificador STEP_6A3 | PASS |
| Pruebas del promotor | PASS, 10/10 |
| Pruebas heredadas de implementación | PASS, 88 focalizadas; 11 PG16 aisladas; 2 Playwright visuales; 1 boundary del operador; typechecks previos PASS |
| `https://grc.tecdex.net/`, `/health/live`, `/health/ready`, páginas `/evidencias` y `/configuraciones/empresas` | PASS, HTTP 200, TLS verificado |
| Upload request, EvidenceCreate, EvidenceVersion.submit y bind inicial sin sesión | PASS de frontera de autenticación, HTTP 401 en las cuatro rutas reales; no prueba éxito funcional ni SoD. Para bind, `x-correlation-id=785c2486-2a1e-456e-8e7f-01163d43f9e9` fue devuelto idéntico y `x-request-id=01a141d6-90b2-750c-97f0-2eef3fb8728b` |
| PostgreSQL QA con transacción READ ONLY | PASS: DB `tcdx-grc`, servidor `.40`, PG16, 34 migraciones exactas; hashes de roles, grants, memberships, aplicabilidades, versiones/revisiones, políticas, holds, Controls histórico y suscripciones idénticos al snapshot anterior; C-04W idéntico; submit v2 `published` con scopes `assigned_object`, `owned_object`, `tenant`, una auditoría; DDL/DML 0. Recibo local `evidence/initial-source-implementation-20261015/qa-postdeploy-readonly-20261015.json`, SHA-256 `f24c8906cdf4dd72638e25f44893de1702db08dc4e238bbb4e839639f1f1f2d0` |
| Flujo auténtico upload/finalize/EvidenceCreate/submit/revisión/bind/publicación; DENY de evidencia ordinaria/ajena, cross-tenant y replay HTTP; Zoho real | NOT_RUN en QA: faltan documento jurídico, sesiones humanas aptas y actos independientes. Las 11 pruebas PG16 aisladas prueban la semántica técnica con rollback, no reemplazan ese recorrido |
| Aceptación visual humana de estas imágenes, negativos humanos CFG-D/C-04W y H10 | NOT_RUN/PENDING |

El recibo M2M heredado identifica la publicación v2 con `correlation_id=01a141c5-40b5-7460-8a0b-fda5905af2c7`, `audit_event_id=01a141c5-4278-72fd-b1f4-5a84b08e39fa` y cero duplicados en replay. Es correlación de publicación del contrato, no una sesión de QA humana.

Una consulta exploratoria a `/api/health` devolvió 404 porque la ruta correcta es `/health/ready`; ésta devolvió 200. Del mismo modo, `/api/v1/evidence-versions` era una ruta GET inexistente; se verificó después la ruta real POST `/api/v1/evidence-versions/:id:submit` con 401 sin sesión. Ningún 404 exploratorio se presenta como fallo de producto ni como prueba de aislamiento.

`git diff --check` devolvió código 2 exclusivamente por `new blank line at EOF` en los cinco snapshots sellados `03_API_RESOURCE_OPERATION_MATRIX.md`, `05_PERMISSION_CATALOG.md`, `09_SEED_MANIFESTS.md`, `14_FILE_EVIDENCE_STORAGE_CONTRACT.md` y `29_PHASE6A3_REFERENCE_READS.md`. Es la excepción de bytes aprobados documentada en `SEALED_SNAPSHOT_DIFF_CHECK_NOTES.json`; no aparecieron otros errores de whitespace y no se reescribieron esos bytes. No se modificó código ni se corrieron nuevamente suites que ya tenían recibos válidos.

## Cierre por rol: H01–H10

1. **H01, Privacy/Legal del tenant:** aportar por canal autorizado documento auténtico, origen verificable, cláusula exacta, contexto/Subject/actividad, clasificación y vigencia real; custodiar hash y constancia sin incorporar el documento reservado al repositorio. La dirección comercial de 12 meses no es fuente jurídica.
2. **H02–H03, Tenant Admin y autor documental:** con sesión Zoho real y permisos existentes, crear el draft propio y cargar/finalizar la primera fuente mediante el flujo v1.11; conservar intent, FileObject, EvidenceVersion, scan, correlation y auditoría. No tocar las dos aplicabilidades `under_review` históricas.
3. **H04, revisor Evidence independiente:** validar permisos `evidence.approve`, identidad distinta del autor, documento, cláusula y vigencia; ejecutar revisión/aprobación real por objeto y guardar AuditEvent. El Legal Reviewer inventariado carecía de ese permiso y no se le concede uno para este cierre.
4. **H05–H06, autor del draft y Legal Reviewer distinto:** bind explícito con fuente aprobada, contexto/intervalo congruente y CAS; después revisión, aprobación y publicación de aplicabilidad mediante identidades autorizadas. Conservar idempotency key, correlation, IDs/versiones y auditorías. No usar SQL ni M2M como sustituto.
5. **H07–H09, QA humano con sesiones/contextos existentes:** aceptar diagnóstico CFG-D `insufficient_data` y preservar histórico; ejecutar negativos SoD/valid forzado/permiso-entitlement/cross-tenant con casos aptos y registrar HTTP/correlation/hash; revisar UI desplegada en escritorio y estrecho, recarga, selector de empresa, foco, español y branding. Si falta un contexto apto, marcar NOT_RUN.
6. **H10, QA/Release:** adjuntar recibos H01–H09, emitir aceptación o rechazo explícito para estas dos imágenes y evaluar el gate de cierre. Sólo una decisión humana real y todos los gates aplicables permitirán cerrar STEP_6A3 y habilitar STEP_6A4; este handoff no inicia 6A.4.

Traza: rector 21–25/38/45–49 y sucesoras v1.11 → contratos ejecutables publicados y release gate exacto → builds/source hashes → activaciones QA → consulta PG16 de solo lectura y smoke HTTP → checklist humano pendiente. Conflictos rectores nuevos: ninguno identificado. La falta de fuente y actos humanos mantiene bloqueado el cierre integral. Capas cambiadas en esta continuación: despliegue QA de backend/frontend y staging de sus artefactos; base de datos, contratos ejecutables, código fuente, infraestructura, DNS y PROD sin cambios.
