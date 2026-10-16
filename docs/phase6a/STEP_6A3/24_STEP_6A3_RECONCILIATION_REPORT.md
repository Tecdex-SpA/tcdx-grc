# STEP 6A.3 — reconciliación integral P-RBAC, P-CONFIG y P-VOC

Fecha: 2026-10-08. `MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23`; `CODEX_VARIATION_BUDGET=ZERO`. `STEP_6A3=PARTIAL_BLOCKED`; `RECTOR_GATE=BLOCKED` para el cierre y publicación residual. La investigación y las propuestas solicitadas están entregadas. No se declara completo el slice ni se inicia 6A.4.

## Resultado ejecutivo

Se rastrearon las tres lecturas, el binding de configuración y las 26 ocurrencias de 14 familias CV hasta contratos, modelo físico, migraciones, seeds y consumidores reales. Los documentos20/21/23 y CSV22 contienen propuestas concretas para revisión por cláusula y owner. Todas las rutas, códigos, valores y grants nuevos permanecen **PROPOSED_NOT_PUBLISHED**. El PO ya aprobó las 14 definiciones funcionales; no se pide repetir esa decisión ni se le atribuyen firmas de Architecture, Backend, Security, Domain o Data Model.

- `IMPLEMENTED_AUTHORIZED`: seis textos centrales en español y dos expectativas E2E, con regresión real. CF-01/02 ya estaban implementados en el worktree recibido: se inspeccionaron y revalidaron, no se presentan como código nuevo de esta pasada.
- `READY_FOR_HUMAN_SIGNOFF`: CT-01/03/04, opciones CFG-A/B/C/D y 52 filas de valores/etiquetas/definiciones/restricciones de las 14 CV.
- `BLOCKED_MISSING_CANONICAL_BINDING`: CT-02 y aplicabilidad jurídica global por objeto de CT-04.
- `PROPOSED_NOT_PUBLISHED`: tres Permissions, tres colecciones y 44 RolePermission por conjunto de templates en P-RBAC; una proyección contextual CFG adicional y 52 valores CV. Son propuestas, sin grants efectivos ni pruebas ficticias de operaciones inexistentes.

## Preflight y portabilidad

Raíz confirmada con `git rev-parse --show-toplevel`, remote `https://github.com/Tecdex-SpA/tcdx-grc.git`, rama `main`, HEAD `6af66387aa03fa185ef139584de07700f247b903`, idéntico al histórico. No hubo pull, fetch, red para recuperar contexto, cambio de rama, reset, rebase, stash, clean, stage, commit o push. Existen STEP_6A1/2/3, documentos11/15/19 y matriz17. Los números20–25 estaban libres al iniciar; no se sobrescribió historia ni se reconstruyeron resultados anteriores como ejecuciones actuales.

No existe ZIP rector local. Se usó el baseline rector **local activo** bajo `docs/rector/baseline/`, BASELINE_ID/STATUS, manifiesto y enforcement, con integridad SHA-256 PASS. No se afirma lectura de un ZIP inexistente ni se sustituyó autoridad con memoria, historial de otra cuenta o DRAFT. El ZIP normativo reservado no se abrió, descomprimió ni utilizó como autoridad operativa.

Antes de escribir se registraron hashes de 60 archivos modificados o untracked preexistentes y del index. Sólo los tres archivos de fuentes/prueba expresamente editados y el append de MASTER_EXECUTION_STATUS cambian respecto de ese recibo; los otros 56 conservan hash. Los artefactos1–19, matriz17, STEP_6A1/2, contratos heredados, migrations e index/HEAD se preservan. El prefijo histórico del status se verifica byte por byte. Recibo portable en25.

Se usaron dependencias ya instaladas y Node22.23.2/pnpm12.4.1 disponibles, sin nuevos paquetes, ajustes de cuenta, auth, secretos, hooks o configuración global. Las credenciales existentes del proceso se consumieron sólo con target PG explícito `127.0.0.1:55432`; no se imprimieron ni copiaron a recibos.

## Matriz única de decisiones vigentes

La dirección de las cuatro CT, las 14 definiciones CV y CF-01/02 está **APPROVED_BY_PO**. La aprobación técnica y publicación se distinguen en cada fila.

| Decisión | Resultado técnico actual | Residuo exacto / cláusulas |
|---|---|---|
| CT-01 | READY_FOR_HUMAN_SIGNOFF; PROPOSED_NOT_PUBLISHED | FrameworkVersion Compliance independiente de Controls; predicados, 13 templates, historia SoA y distribución.20 C-01/02/06F/07/08 |
| CT-02 | BLOCKED_MISSING_CANONICAL_BINDING; NO_BINDING_DEMONSTRATED | Método→Definition, override tipado, Subject/fecha/snapshot y uniques.21 CFG-A/B/C/D y CFG01..09 |
| CT-03 | READY_FOR_HUMAN_SIGNOFF; PROPOSED_NOT_PUBLISHED | Minimización backend, 7 creadores/17 lectores con parent exacto, elegibilidad y recheck.20 C-03A/B/06M |
| CT-04 | READY_FOR_HUMAN_SIGNOFF; PROPOSED_NOT_PUBLISHED; GLOBAL_BINDING_RESIDUAL |3 creadores/14 lectores con parent exacto, vigencia/prioridad. Discovery no demuestra aplicabilidad regulatoria; global contractual/hold DENY.20 C-04/G/W/06R |
| CV-01 classification | EXISTENTE_PERO_REQUIERE_MAPEO_AUTORIZADO |1 ocurrencia; CHECK de4 códigos de archivo; mapping Evidence/Security y labels.22/23 CV01-A |
| CV-02 evidence_type | NUEVO_CONTRATO_PROPUESTO |2 ocurrencias; enumEvidenceType versionado.22/23 CV02-A |
| CV-03 frequency_code | NUEVO_CONTRATO_PROPUESTO |2 ocurrencias;8 frecuencias propuestas y semántica temporal; contenido draft no es catálogo.22/23 CV03-A |
| CV-04 SoA applicability_decision | EXISTENTE_PERO_REQUIERE_MAPEO_AUTORIZADO |1 ocurrencia;2 códigos con semántica SoA propia, sin fusionar Applicability.22/23 CV04-A |
| CV-05 SoA implementation_state | NUEVO_CONTRATO_PROPUESTO |1 ocurrencia; separado de lifecycle/effectiveness de Control.22/23 CV05-A |
| CV-06 link_role | NUEVO_CONTRATO_PROPUESTO |1 ocurrencia ActionEvidenceLink; no IAM.22/23 CV06-A |
| CV-07 origin_role | NUEVO_CONTRATO_PROPUESTO |1 ocurrencia IssueOrigin; no IAM.22/23 CV07-A |
| CV-08 priority | NUEVO_CONTRATO_PROPUESTO |5 ocurrencias; enums Issue/Action separados, escala común sólo con I/A/C firmadas.22/23 CV08-I/A/C |
| CV-09 relevance | NUEVO_CONTRATO_PROPUESTO |2 ocurrencias EvidenceReview opcionales; criterios y rationale.22/23 CV09-A |
| CV-10 selection_method | NUEVO_CONTRATO_PROPUESTO |1 ocurrencia;5 métodos de muestra con restricciones, sin motor estadístico inferido.22/23 CV10-A |
| CV-11 severity | NUEVO_CONTRATO_PROPUESTO |3 ocurrencias Finding; escala propia, no Risk.22/23 CV11-A |
| CV-12 source_kind | NUEVO_CONTRATO_PROPUESTO |2 ocurrencias; fixtures upload/uploaded no prueban aliases.22/23 CV12-A |
| CV-13 sufficiency | NUEVO_CONTRATO_PROPUESTO |2 ocurrencias EvidenceReview opcionales; no result_status ni score.22/23 CV13-A |
| CV-14 suggested_owner_role_code | EXISTENTE_PERO_REQUIERE_MAPEO_AUTORIZADO |2 ocurrencias;5 códigos Role como funciones sugeridas sólo con mapping Controls/Security, sin grants.22/23 CV14-A |
| CF-01 | IMPLEMENTED_AUTHORIZED_PREEXISTING_REVALIDATED |2 affordances y sus query emissions retiradas; sin valores nuevos |
| CF-02 | IMPLEMENTED_AUTHORIZED_PREEXISTING_REVALIDATED |1 filtro deshabilitado con explicación española, sin emisión de lifecycle |

Ninguna de las tres lecturas cercanas publicadas demuestra equivalencia completa: Controls exige otro entitlement/Permission; Membership administrativa expone atributos IAM/PII en red; RetentionPolicy Privacy es tenant-only. Documento20 aporta diferencial de24 roles: F13/M17/R14=44 RolePermission **propuestos por conjunto**, no44 personas ni grants efectivos. Picker M7/R3 y lectura histórica por parent permanecen diferenciados. Cero permisos, endpoints o grants nuevos publicados. CT-04 Source→Pack prueba procedencia; el candidato regulatorio lleva `selectable=false` sin binding jurídico por objeto.

## Evidencia nueva y discrepancias respecto de15/17/19

| ID | Evidencia y consecuencia | Estado / owner |
|---|---|---|
| RBAC-D01 | Catálogo/matriz actionCreate enumeran5 roles; seed publica6, incluido AUDITOR. Lectura PG aislada confirma6 grants. | Abierto; Security/Architecture/Remediation. Sin revocación ejecutada. |
| RBAC-D02 | Catálogo requirement.read declara11 lectores, pero SQL publica Permission sin RolePermission. PG aislado confirma0 grants; cfgread tiene1 grant DATA_ADMIN. | Abierto; Security/Architecture/Compliance/Backend. Lectores declarados no equivalen a distribución probada. |
| CFG-UQ1 | Físico01:228 prescribe business key compuesta de EC; migration006:797 implementa UNIQUE(tenant_id). pg_indexes aislado lo confirma. | Abierto; Data Model/Architecture/Backend. Impide varias resoluciones históricas por tenant. |
| CFG-UQ2 | Físico01:229 prescribe UQ EC+level+ordinal; migration006:800 implementa UNIQUE(ordinal) global. pg_indexes aislado lo confirma. | Abierto; Data Model/Architecture/Backend. Cardinalidad distinta aunque tests/generated assets pasen. |
| CFG-DEFAULT | Físico01:224 exige exactamente un typed default; CHECK006:772 permite<=1. | Abierto; Data Model/Configuration. Cerrar ausencia legítima/publicación sin inventar defaults. |
| RBAC-D03 | Nulabilidad RetentionPolicy previa cede ante enmienda aprobada IDM-P05/migration20260924000200: NULL en draft, effective_from obligatorio en published. | Reconciliado por precedencia; no DDL nuevo. |
| VOC-PROVENANCE | Fuentes reales: control_versions para frecuencia/rol; action_evidence_links.link_role; issue_origins.origin_role; evidence_reviews para relevancia/suficiencia. Estas últimas son opcionales, frente a required de17. | Corregido en anexo23, preservando matriz17 e historia. |
| CFG-HANDLER | EffectiveConfigurationGet está publicado como declaración OpenAPI/matriz; handler HTTP/discovery ejecutado no demostrado. GET por UUID no determina binding. | Brecha contractual/implementación registrada; no HTTP PASS inferido. |

Son **5 discrepancias materiales abiertas entre contrato/modelo y materialización**, además de los18 residuos técnicos CT/CV. La integridad no permite declarar cero conflictos. Binding y firmas pendientes se registran por separado. Las consultas actuales son sólo PG16.15 aislado, nunca QA; recibo completo resumido en25 y bruto en `/private/tmp/step6a3-isolated-read-receipt.json`.

P-VOC aporta fuentes existentes más precisas: CHECK FileUploadIntent con4 códigos; enum Applicability no equivale automáticamente a SoA; Role IAM no equivale a función empresarial. El catálogo v1.1 contiene212 ControlVersion candidatas draft, sin contrato exhaustivo para frequency/role. Antes de enforcement se requiere inventario autorizado de valores persistidos y lineage de versiones; no se ejecutó inventario QA.

## Conteos reconciliados

Inventario preservado:42 formularios,361 campos,95 IDs internos,89 ocurrencias de vocabulario,3 JSON,29 links y38 dependencias.

- **95 IDs=76 READY_FOR_6A4+18 BLOCKED_CONTRACT_DECISION+1 NOT_APPLICABLE**. El último es F-0268, regulatory_source_id de proyección retentionPolicyGet, sin selector de entrada. Cero IDs removidos de formularios en esta ejecución; las propuestas no desbloquean los18.
- **89 vocab=60 fuentes contractuales preparadas+3 comportamientos CF resueltos+26 CV pendientes**. Matriz05 conserva clasificación histórica de29 bloqueadas;23/24/25 proyectan CF resueltos sin reescribirla.
- **26 CV=4 ocurrencias con mapeo autorizable+22 contratos nuevos propuestos**.0 PUBLICADO_Y_REUTILIZABLE demostrado para activar y0 texto libre adoptado.52 filas de propuestas/14 familias, todas PROPUESTO_NO_APROBADO;0 valores nuevos runtime. Ningún mapping candidato se cuenta como CV resuelta.

## Cambios de localización y límites UX

En `apps/frontend/src/i18n/es.ts` se cambiaron currentTenantData («Registros visibles de la empresa»), forms.guidance («Completa los datos de la operación con información de tu empresa») y tenant.noneDetail («contexto de empresa activo»). En `i18n/display-text.ts`, los labels PLATFORM_ADMIN/PLATFORM_SUPPORT/TENANT_ADMIN pasan a «Administrador de la plataforma»/«Soporte de la plataforma»/«Administrador de la empresa». Dos expectativas E2E en `e2e/core-grc-ui.spec.ts` se actualizaron al mismo copy. Se usa traducción central existente, sin heurísticas ni cambios de códigos, API, persistencia, texto libre o nombres oficiales. No se añadieron opciones CV propuestas.

Se leyeron manifest y seis contratos visuales activos v1.0; marca, tokens, assets y baseline versionados mantienen hash. La E2E final capturó84 imágenes locales en4 viewports. La inspección de Controls narrow y selector desktop confirma explicación del filtro deshabilitado, columnas conservadas y tokens/densidad existentes. Las capturas están en `/private/tmp/step6a3-visual`; no se cambió el baseline aprobado. Revisión de agente no aprueba HUMAN_UI_REVIEW.

`SPANISH_UI_GATE=PASS_SCOPED_CENTRAL_COPY_AND_PREPARED_SELECTORS`, sin PASS global de plataforma. Fuera del residuo: fieldPlaceholder aún pide identificador/JSON y fieldLabel/displayValue contienen fallback heurístico (`display-text.ts:166–188`); ciertos formularios actuales aún usan UUID/JSON antes de6A.4. Documento23 registra las brechas. No se consideran módulos completos ni habilitan6A.4; no se modificó lógica de campos para ocultarlas.

## Pruebas actuales y diferencias con19

| Gate / alcance actual | Resultado real |19 histórico|Delta|
|---|---|---|---|
| Rector integrity/manifests activos y protegidos |PASS, exit0; task RECTOR_GATE BLOCKED independiente |PASS|0|
| Contract/assets verify |PASS:237 tables/172 permissions/30 migrations/161 operations/56 reads |Mismos conteos|0|
| OpenAPI/operations/permissions |PASS_EXISTING_SCOPE:107 assertions packages/contracts dentro del unit run; ningún HTTP contrato nuevo publicado |PASS|0 implementados|
| Unit |509 PASS,0 FAIL;82 PG skipped en este command y ejecutados por separado |509|0|
| Frontend |102 PASS, subset de509 |102|0|
| PostgreSQL aislado |82 PASS/15 files,0 skipped,127.0.0.1:55432 |82|0|
| GRC/browser local |448 PASS,0 failed/0 flaky/0 skipped;4 viewports y API fixtures locales |448|0|
| IAM UI subset |256 PASS dentro de448; sin IAM real |256|0|
| IAM21 runtime real histórico |NOT_RUN_NO_REAL_IAM_CHANGE_OR_RUNTIME_AUTHORIZATION |NOT_EXECUTED|No ejecutado|
| RBAC/tenant/entitlement/scope/SoD |PASS_EXISTING_TEST_SCOPE:184 security unit assertions y regresiones PG; sin gate Security humano |PASS_IMPLEMENTED_SCOPE|No sustituye firma|
| Typecheck / lint |PASS, exit0; lint es TypeScript static, sin introducir ESLint |PASS|0|
| Vocabulary generator --check |PASS del asset derivado existente |PASS|0|
| Nuevos CT/CV/CFG |NOT_RUN_PROPOSED_NOT_PUBLISHED_NOT_IMPLEMENTED |Bloqueados|0 runtime|
| QA/runtime/despliegue |NOT_RUN_NOT_AUTHORIZED |Sin QA en esta etapa|0 mutaciones QA|

La primera invocación unit rechazó reporter por el parser pnpm antes de ejecutar Vitest (exit2); se corrigió a `pnpm exec vitest` y se obtuvo509 PASS reales. Primer E2E en sandbox:448 unexpected por browserType.launch, sin ejecutar tests de producto. Recibo conservado; no se interpreta como fallo funcional. Repetición local autorizada fuera del sandbox:448 PASS. Después de los seis textos se repitió toda la suite:448 PASS. No se relajaron tests ni actualizaron baselines; sólo dos expectativas de copy autorizado cambiaron.

No se ejecutó rebuild destructivo ni DDL para PG: se usó la instancia aislada existente y su suite con fixtures locales. No se publicaron datos ficticios de producto. Recibos, hashes y resúmenes JSON unit/PG/E2E, logs y validaciones de CSV/referencias/dominios/secretos/whitespace/preservación se registran en25. Los archivos brutos bajo/private/tmp son evidencia auxiliar temporal; los resúmenes versionados en25 constituyen el registro portable. Sus PASS no autoaprueban Security, Data Model, UI o release.

## Archivos y capas afectadas

Nuevos:20 P-RBAC,21 P-CONFIG,22 CSV values,23 P-VOC provenance,24 este reporte y25 resultado. Editados respecto del preflight: dos archivos i18n, una prueba E2E y MASTER_EXECUTION_STATUS con append. Matriz17 y artefactos1–19 conservados. Los demás cambios fuente heredados se preservan; ningún git stage.

| Capa | Cambio de esta ejecución |
|---|---|
| Database/modelo/migrations/DDL |0; enmiendas propuestas no ejecutadas. Sí se ejecutaron tests aislados PG con fixtures del suite existente. |
| Executable contracts/permissions/grants |0 efectivos; propuestas20–23 fuera del contrato publicado |
| Backend |0 |
| Frontend |6 textos centrales españoles; sin layout, lógica, autorización o API nuevos |
| Pruebas |2 expectativas E2E; mismos conteos |
| Infrastructure/IAM/deployment contracts |0 |
| QA/deploy/Git |QA_mutations=0;deploy=NO;commits=0;push/PR/merge=NO |

## Mínima revisión competente restante

Architecture/Backend/Security/Domain revisan cláusulas C01..08 y grants F/M/R exactos de20, incluida elegibilidad/recheck. Security reconcilia D01/D02. Privacy/Legal/Data Model cierran el binding global por objeto que no puede deducirse de procedencia Pack. Cada categoría global y lectura histórica puede aprobarse o rechazarse por cláusula, sin aprobar enumeración amplia.

Architecture/Data Model/Configuration/Methodology/Domain seleccionan CFG-A/B/C/D de21. Para A, aportar fuente relacional versionada real que pruebe la cadena; para B/C, aprobar la enmienda exacta y contexto; para D, declarar mode=none por método/version sin Definition inventada. Revisar los dos UQ, defaults tipados, hash, lineage, fecha/scope, proyección y permiso reutilizado. Cualquier DDL/publicación operacional requiere autorización posterior separada.

Domain/Backend/Architecture/Security/Data Model revisan las52 filas de22 y las cláusulas comunes/por familia de23, incluidos valores históricos y lineage antes del enforcement. Cada aprobación exige identidad/rol/fecha/evidencia/hash. Firmar la definición funcional no activa valores.

Se entrega contenido para revisión única, sin solicitar autorización genérica ni contexto de otra cuenta. `TASK_PACKET_STATUS=COMPLETE_FOR_AUTHORIZED_RESEARCH_COPY_AND_PROPOSALS;BLOCKED_FOR_RESIDUAL_PUBLICATION`; `ASSUMPTIONS_INTRODUCED=NONE_AS_AUTHORITY`; nuevos valores/rutas/modelos son propuestas explícitas; `FILES_OUTSIDE_SCOPE_MODIFIED=NONE`.

Fase5 PASS/CLOSED se conserva como status registrado, sin revalidarla en QA en esta ejecución.6A IN_PROGRESS;6A.1/2 PASS documentales preservados;6A.4/5/6 NOT_STARTED; Risk/Incidents NOT_STARTED; sin nueva aprobación comercial/release.

Trazabilidad: rector09/19/22/23/24/29/30/32/42/45/46 → contratos OpenAPI/matriz/permisos/enmiendas físicas → seeds/FK/indexes/consumidores → evidencia y cláusulas20–23 → cambio lingüístico central → regresión local y recibos25 → revisión competente pendiente. No se infiere PASS de producto completo.
