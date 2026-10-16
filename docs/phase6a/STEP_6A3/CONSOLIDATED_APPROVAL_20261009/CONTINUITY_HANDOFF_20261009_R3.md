# Traspaso entre cuentas Codex — STEP 6A.3, después de R3

Salida intermedia solicitada por el PO por disponibilidad de uso. Este documento guía continuidad; la fuente única de estado es `../SOLO_OWNER_GOVERNANCE_PROPOSAL_20261009_V2/07_RESULT.json`, campo `CURRENT_EXECUTION_REPORT=macro_implementation_20261009`. No sustituye contratos ni firmas. No se declara STEP 6A.3 cerrado.

## Checkout y límites

Repositorio `Tecdex-SpA/tcdx-grc`, remote `https://github.com/Tecdex-SpA/tcdx-grc.git`, raíz observada `/Users/andresbarouh/repos/tcdx-grc`. Rama `step6a3-internal-governance-v18-20261009`; HEAD `6af66387aa03fa185ef139584de07700f247b903`. Worktree modificado, con trabajo heredado y cambios autorizados; staging vacío. Revalidar estos valores, sin asumir rutas/cuenta/alias/credenciales.

No commits, push, PR, merge, QA, IAM real, DDL no descartable ni deploy. El commit local sigue condicionado a PASS y aprobación concreta C11; no hay cierre global. PostgreSQL local aislado/descartable sí fue autorizado. SOG v2 general continúa `DRAFT_NOT_EFFECTIVE`; STEP 6A.4 y Risk runtime no iniciados. ZIP normativo reservado no ingerido. Dominio exclusivo `https://grc.tecdex.net/`.

## Rector efectivo y autoridad humana

`TCDX_GRC_MASTER_REGENT_BASELINE_v1.8_2026-10-09` está `ACTIVE_VERIFIED`. Activación real UTC `2026-10-09T18:23:58.855422Z`, `docs/rector/ACTIVE_ACTIVATION.json`; manifest SHA-256 `e51f6539df119775b2feb8839907c8cd690623b82707b399aa15a31d59196533`.

Enmienda puntual autorizada expresamente y ejecutada: revisión editorial/metodológica interna unipersonal por funciones acumuladas del PO Andrés Barouh. No exigir otra persona interna por defecto ni otra aprobación de esta enmienda. No elimina SoD operacional de Evidence/Action/risk/credenciales ni obligaciones superiores. Rector49 y 22/43/45/46/47 activos delimitan la excepción. v1.7 está preservado inmutable en history. No activar SOG v2 por arrastre.

`docs/governance/amendments/INTERNAL_REVIEW_v1.8_20261009/` contiene ADR, delta, autorización, 115 hallazgos con citas/líneas/hashes, dos cuestionarios originales sin respuestas alteradas y evidencia de activación. AGENTS.md y enforcement actuales consumen v1.8.

## Aprobaciones exactas ya recibidas — no volver a solicitarlas

| Lote | Manifest SHA-256 | Respuesta humana exacta | Recibo |
|---|---|---|---|
| R1 MACRO-STEP6A3-20261009-R1 | 5b8c02385615fe6b5c825b18619d0cf1d493b7b7880e47530cc02893b3c953c4 | Apruebo el manifiesto y su texto exacto | MACRO_APPROVAL_RECEIPT_R1.json |
| R2 MACRO-STEP6A3-RESIDUAL-20261009-R2 | 2dd41de880d445963c5c74917751d58490c63d7364ec1ad2179bbe39c5187ed8 | Apruebo R2 y sus tres textos exactos | RESIDUAL_MACRO_R2/APPROVAL_RECEIPT_R2.json |
| R3 MACRO-STEP6A3-RBAC-D01-D02-20261009-R3 | 17eeb65269bc2dc9727c605999f1fd0c5c343cab3b6653a372c3d879618daed9 | Apruebo R3 y su texto exacto | MACRO_APPROVAL_RECEIPT_R3.json |

Todos los originales JSON/Word/textos/artefactos sellados se preservaron. Sus etiquetas históricas DRAFT/PENDING no se editan: los recibos y publicaciones sucesoras registran la vigencia. C16 exige aprobación posterior a hashes de nuevos deltas; no convertir aprobaciones actuales en autorización de textos futuros. Una firma representa varias funciones del PO, nunca dos personas.

R1 adopta los deltas locales cerrados CT01/03/04, RBAC44, VOC52 y UQ/default, manteniendo CFG-D condicionado. R2 adopta cursor CT03 acotado, auditoría reforzada RBAC y procedencia tipada VOC. R3 adopta exclusivamente retirada baseline AUDITOR→remediation.action.create y distribución del permiso existente compliance.requirement.read a once lectores publicados. No aprueban operaciones reales ni none sin suficiencia.

## Implementación local concluida y publicada

- Contratos ejecutables29/30/31/32 `PUBLISHED_LOCAL_V1`, no desplegados. Tres GET de referencia, OpenAPI/matriz/permisos/proyecciones/consumidores españoles y negativos implementados. CT03 revalida membership activa a la escritura, evita datos de identidad innecesarios y usa cursor2 limitado por joined_at/UUID, sin nombres extensos ni pérdida de microsegundos.
- GET EC R1 intacto, autorización DR-STEP6A3-EC-DETAIL-R1-20261009/hash159c2fac9a5d2006900f49ee020521146f2e85baeec9233c8a8f07429bc28163. 400tenantUUID antesSQL,401Bearer, sentencia coherente y referencias tenant/global compatibles conservadas. No reimplementar.
- RBAC44 reconciliados uno a uno,13framework/17membership/14retention, sin custom/admin ni grants por analogía. Manifest29 SHA7462a780d4e0afe23c812983b762685e6f1aa8944ddef85afc50ca2c6d01cd72. Tres permisos nuevos publicados localmente; catálogo175.
- VOC52/14familias/26ocurrencias, manifest30 SHA81e559c96f687c319d415bb57b97187f17f91d884b35594b4ce0db7b68862b83. Catálogos generados, etiquetas españolas, validación por fuente canónica. Procedencia en AuditEvent existente: RETURNING/CAS/FK reales, versiones numéricas exactas; hijos sin versión propia registran explícitamente la versión real de raíz vinculada. Nunca UUID como versión, coerción, alias o backfill de historia. Schema cerrado2020-12 e int64 lexical exacto; negativos por dialecto.
- R3 publicado en `docs/executable-contracts/32_PHASE6A3_RBAC_RESOLUTION_R3.md` y metadata. Candidato34 forward-only retira únicamente D01 y agrega/adopta D02 para VIEWER, REPORT_VIEWER, EXECUTIVE_BOARD_VIEWER, GRC_MANAGER, QUALITY_MANAGER, COMPLIANCE_MANAGER, CISO_SECURITY_MANAGER, AI_GOVERNANCE_MANAGER, PRIVACY_MANAGER, LEGAL_REVIEWER, REGULATORY_CONTENT_STEWARD. No permisos/roles/scopes nuevos. Auditoría transaccional de presencia real, snapshot revocado, receipt/hash/source/version/UTC/correlación/actor existente; replay y corrupción/duplicados fail-closed. SEED-010 comprueba publicación R3 y audita cada materialización D02. Los otros cinco creadores quedan intactos; autorización por grants efectivos, sin veto accidental por acumular el rol AUDITOR.

## Migraciones y operaciones

Manifest activo local:32 migraciones. Históricas intactas.

| Artefacto | Estado / efecto |
|---|---|
| database/migrations/20261009000100_phase6a3_configuration_integrity.sql |31, aprobado/local aplicado. UQ EC contextual tenant+definition+subject+effective_at+hash NULLS NOT DISTINCT; capas EC+precedence+ordinal; defaults tipados/cardinalidad canónica, preflight fail-closed, sin reescribir datos. |
| database/migrations/20261009000200_phase6a3_reference_read_permissions.sql |32, aprobado/local aplicado, SHA920ececb9d28e3821a9faf9d2c754db481a26c0e33c53ae0f94b3a0535885ed8.3permisos/44pares; no custom ni MembershipRole. |
| docs/phase6a/STEP_6A3/rbac-publication/20261009000300_phase6a3_role_permission_publication.sql |33, preparado FUERA del manifest activo, adopción auditable de grants ya presentes; no INSERT ficticio. Actor real/plan/canonical runner pendientes. |
| docs/phase6a/STEP_6A3/rbac-publication/20261009000400_phase6a3_rbac_resolution.sql |34, preparado FUERA del manifest activo; R3 probado en transacciones rollback solamente. Ningún grant real aplicado. |

33/34 requieren ServicePrincipal PLATFORM_CONTROL activo existente y ejecución autorizada; no sembrarlo ni crear credenciales. Locks, fuente/checksum, ownership baseline y evidencia inmutable; fallo de AuditEvent aborta DML. Tras commit eventual, recuperación forward-only nueva y aprobada, no reinsertar permisos revocados ni borrar historia.

## Pruebas y gates reales

Regresión definitiva: `evidence/product-r3/r3-full-tests.json`, **850PASS/0FAIL/0omitidas**,85archivos;737unit+113PostgreSQL. Incluye82casosPG anteriormente omitidos en17archivos,16SQL EC read-only y12referencias nativas más3testsR3. Los627unit anteriores están cubiertos por el mismo conjunto; no sumarlos de nuevo.

- **460browserPASS**,115escenarios×4viewports,0fallos/omitidas/flaky. API/IAM simulados; NO E2E externo, QA ni revisión visual humana. R3 backend/grants no cambia UI; no se repitió esta suite ya aprobada.
- **38UQ/default nativasPASS**, datos existentes/concurrencia/recovery/rollback/fail-closed. SQL/harness sellados sin cambios; no repetidas innecesariamente.
- **8RBAC R2 nativasPASS**, auditoría real/no actor/actor inactivo/hash/falloINSERT/replay/UUID7UTC.
- **12RBAC R3 nativasPASS**, exactD01/D02/auditoría/corrupción/duplicados/locks concurrentes/rollback.3testsPG adicionales sobre roles poblados/custom/bootstrap/11lectoresHTTP/negativos scopes-entitlement-revocación incluidos en850; no sumarlos dos veces.
- Typecheck/lint/build4proyectosPASS; contracts--check32/237tables/175permissions/164opsPASS; vocab generator--checkPASS; esquema/seeds/migrationgates PostgreSQL localPASS,0mismatch; secret scan0; whitespacePASS; rectorintegrity/status/currentconsumerPASS;6counterfactuals y Python-O rechazo fail-closedPASS.

Se corrigió la causa raíz de cleanup de fixtures: nuevos auditsServicePrincipal retenían tenantFK y datos de actor al limpiar solo audits humanos. Cleanup por IDs de tenants propios y aserción0residuos; reconstrucción exclusivamente tmpfs propia y regresión completa posterior. No tests silenciados.

Un primer comando R3 usó un snapshot antiguo del runner y otro no encontró el archivo nuevo; NO son evidencia R3. Se sincronizaron y comprobaron **863hashes de fuentes**;53targeted actualPASS y850final actualPASS. No confundir JSON viejo con resultado de proceso en curso. Solo los reportes definitivos anteriores acreditan R3.

## PostgreSQL/IPC y retiro verificado

16SQL EC16.15 PASS exclusivamente del gate local: CTEs tipadas sobre SQL real, transaction_read_only=on, ROLLBACK, sinDDL/DML/fixtures ni escrituras persistentes en esas16. No extender PASS a RLS/QA/IAM/E2E.

IPC original ENOSPC/EPERM y resolución comprobada conservados en07 y `evidence/product-r3/ipc-original-server.log`, SHAf555c20de581631a68e7e76ab276bc40b2142d5b8cead4e4664d14f93009cda6. No repetir eliminación IPC ni consultar instancia ajena.

Instancia propia usada: PostgreSQL16.15 ARM64, contenedor `tcdx-step6a3-v18-pg-20261009`, ID60906c8a477e3c8659f058a97ee831d8014e654856943fe9688c2832e09186e9, systemID7694735811590922280, host127.0.0.1:55436/interno55432; privateIPC/shm128MiB/shared_buffers32MiB/maxconn30/posix/tmpfs512MiB. RunnerNode22.23.2/pnpm12.4.1 `tcdx-step6a3-v18-runner2-20261009`, ID03b75e591afd…; cwd/workspace. Ambos **RETIRADOS**, tmpfs destruido,4contenedores ajenos conservan ID/Running/StartedAt. Evidencia `r3-instance-cleanup.json`.

DDL/setup/fixtures locales separados sí existieron y estaban autorizados en ese tmpfs; no afirmar que toda la instancia nunca recibió escrituras.16SQL y12R3DMLrollback dejaron0persistentes; el setup restante fue destruido. Inventario final antes del retiro:0tenants,0Memberships,0PlatformAssignments,0tenantAudits;44audits globales y1SP propios de prueba. RLS0tablas/0policies/0forced: **NOT_IMPLEMENTED**, noPASS. QA/IAMreal/E2EexternoNOT_RUN.

No reutilizar nombres/puertos actuales sin nueva inspección. Si cambios posteriores afectan SQL, recrear exclusivamente instancia descartable autorizada, atestar systemID/labels/puertos propios, ejecutar gates apropiados y retirar sólo recursos propios. No repetir suites ya aprobadas si no hay impacto.

## Preservación y hashes

`evidence/product-r3/r3-preservation.json`, `r3-source-changes.json`, `r3-attributable.diff`, `EVIDENCE_SHA256SUMS.txt`.1308paths de entrada:1244bytes idénticos,64modificados en alcance,0perdidos.153SQL preexistentes (incluidas30migraciones activas históricas),29PNG originales y3fuentes/tests GET EC intactos. Los PNG inicialmente sobrescritos por un run con variable equivocada se restauraron exactamente a su hash original; no hay alteración residual.

Staging antes/después0 y todos modos/blob/path del índice iguales alHEAD original. SHA bruto del índice cambió por stat/cache de lecturasGit; está declarado, no se restauró/reemplazó el índice. No decir que los bytes brutos del índice son idénticos.66valores históricos originales no-pointer de07 preservados; sucesores añadidos y puntero actualizado únicamente. Snapshot inicial y diffs atribuibles bajo `/tmp/step6a3-governance-20261009/`; evidencia durable enrepo. No usar reset/clean/stash/reescrituras masivas.

Para screenshots futuros, variable correcta **TCDX_UI_EVIDENCE_DIR** hacia directorio temporal propio; **TCDX_E2E_SCREENSHOT_DIR no funciona**. Preservar baselines/assets y no declarar HUMAN_UI_REVIEW=PASS.

## Bloqueos exactos y próxima ejecución

36/48cláusulas cerradas localmente;12pendientes,48/48trazadas. Tabla de9columnas por requisito y por cada cláusula en `REQUIREMENT_TRACEABILITY.md`; detalles en07 y `RESIDUAL_DEPENDENCIES_R3.json`. No hay UNKNOWN ni obligación genérica de segundo revisor interno.

1. **CFG-D-COMPLIANCE-V1 / CFG-D-CONTROLS-V1 / CFG-D-PUBLICATION:** aritmética oficial ya identificada (weight default1;factors1/.5/0;mincoverage80;Controls min diseño/operación). Faltan fuentes/bindings oficiales por versión para validez/recencia/suficiencia/procedencia/aplicabilidad/overridesPack/conflictos/confianza y declaración inmutable de mode. Leer `RESIDUAL_MACRO_R2/04_CFGD_CORRECTED_SUFFICIENCY_REVIEW.md`. No pedir otra aprobación de parámetros ya publicados; tampoco inventar los faltantes. Con fuentes exactas, cerrar prueba reproducible y delta nuevo, C16 posterior a hashes; mientras tanto none NO publicado y EC opcional existente intacto.
2. **C-04W:** falta relación tipada canónica desde Evidence/FileObject/FileUploadIntent a contexto legal autorizado, fuentes/reglas de clasificación/jurisdicción/prioridad/hold. Modelo actual impone FKretention obligatoria; la condición PO PENDIENTE sin política solo vale si contrato lo permite. Leer `RESIDUAL_MACRO_R2/05_RETENTION_TYPED_BINDING_FINDING.md`. No transformar FK/NULL/UUIDpolicy en binding, añadir entidad de conveniencia ni bloquear indiscriminadamente flujos históricos como workaround. Requiere inputs legales y delta exacto de contexto/modelo antes de nueva aplicación o rollout.
3. **Contexto IANA para UI:** Tenant.default_timezone existe, pero proyección membership/authorization no lo expone a todos los actores; Tenant.read no universal. Preparar delta exacto de contexto legible usando campo persistido, sin dar permisos por inferencia ni timezonebrowser/UTCfallback. Formularios opcionales muestran pendiente explícito; no hay cierre de esta parte.
4. **C-07,CFG-UQ1/UQ2/DEFAULT/QA,VOC-C04/QA,C-08:** operaciones reales, inventario histórico de valores, aceptación QA/IAM/E2E y revisión UI humana siguen reservadas. R3 D01/D02 ya aprobados y probados: NO volver a pedir su aprobación funcional. Preparar identidad real existente/target/backup/preflight/ventana/ledger33-34/buildhashes/recuperación para autorización específica posterior.

**QA_OPERATIONAL_PLAN_R3.json/.md** ya preparados automáticamente, no ejecutados; JSON SHA3a1451f6b733fc7c2f45b46b9bf376364dcd24428affe1a2062256b640afc0e8. Incluye31/32/33/34/hashes/builds, identidades reales aúnsinidentificar y dependencias. Estado PREPARED_NOT_READY_NOT_AUTHORIZED_NOT_EXECUTED. No ejecutar este paquete por aprobar R1/R2/R3. No conectar192.168.2.40/45/46/IAM real sin nuevo plan específico autorizado.

Antes de editar: leer AGENTS, rector46/enforcement/49 y especializados; comprobar checkout/staging/conflictos/hashes sellados. `bash scripts/verify-rector-governance.sh` y `bash scripts/test-rector-governance-status.sh` consumen el ledger vigente. Todos los archivos correctos y sellados se preservan; si cambian inputs materiales, crear sucesor, no alterar manifiesto aprobado. No repetir GET EC ni pruebas cerradas sin impacto.

## Estado intermedio inequívoco

```text
RECTOR_ACTIVE_VERSION=TCDX_GRC_MASTER_REGENT_BASELINE_v1.8_2026-10-09
AMENDMENT_STATUS=ACTIVE_VERIFIED
RECTOR_INTEGRITY=PASS
RECTOR_GATE=BLOCKED_RESIDUAL_CONTRACTS_AND_EXTERNAL_ACCEPTANCE
GET_EC_REGRESSION=PASS
CT01=BLOCKED_EXTERNAL_RUNTIME (PUBLISHED_LOCAL_V1)
CT03=BLOCKED_EXTERNAL_RUNTIME (PUBLISHED_LOCAL_V1_R2)
CT04=BLOCKED_TYPED_LEGAL_BINDING_C04W (reader PUBLISHED_LOCAL)
CT02_CFGD_COMPLIANCE=BLOCKED_SUFFICIENCY_AND_VERSIONED_BINDING
CT02_CFGD_CONTROLS=BLOCKED_SUFFICIENCY_AND_VERSIONED_BINDING
CT02_CFGD_PUBLICATION=BLOCKED_IMMUTABLE_DECLARATION_AND_SUFFICIENCY
RBAC_44=PARTIAL_PUBLISHED_LOCAL_NATIVE_PASS_REAL_OPERATIONS_RESERVED
RBAC_D01_D02_R3=PASS_LOCAL_ONLY
VOCAB_52=PARTIAL_PUBLISHED_LOCAL_QA_HISTORY_ACCEPTANCE_PENDING
UQ_DEFAULT=PARTIAL_LOCAL_38_PASS_REAL_DDL_RESERVED
CLAUSES_48_48=PARTIAL (48traced/36localclosed/12pending)
TESTS=850PASS_0FAIL_0SKIP;460BROWSER_SYNTHETIC;38UQ;8R2_RBAC;12R3_RBAC
POSTGRESQL=16.15_LOCAL_SQL16_PASS_OWN_INSTANCE_DESTROYED
RLS=NOT_IMPLEMENTED
QA=NOT_RUN;IAM_REAL=NOT_RUN;E2E_EXTERNAL=NOT_RUN;HUMAN_UI_REVIEW=PENDING_HUMAN
SOG_V2=DRAFT_NOT_EFFECTIVE
STEP_6A3=PARTIAL_BLOCKED
STEP_6A4=NOT_STARTED
COMMITS=0;PUSH=0;PR=0;MERGE=0;DDL_LOCAL=OWN_DISPOSABLE_ONLY;DDL_QA=0;QA_MUTATIONS=0;DEPLOY=0
```
