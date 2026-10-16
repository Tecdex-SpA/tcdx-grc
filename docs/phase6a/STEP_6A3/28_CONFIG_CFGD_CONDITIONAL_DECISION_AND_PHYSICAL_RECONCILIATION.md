# P-CONFIG — CFG-D condicional por metodología y reconciliación física

Master activo: `TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23`. `TASK_ID=STEP_6A3_PO_RECONCILIATION_20261008`; `CODEX_VARIATION_BUDGET=ZERO`.

Estado: **DRAFT / PROPOSED_NOT_PUBLISHED**. Dirección PO `APPROVED_2026_10_08`; revisión técnica `PENDING_REVIEW`. Rector 45 §§2,3,5,6 y 46 §§3,5,6,8 autorizan esta propuesta documental y mantienen bloqueada la publicación. Registro único de firmas: [26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md](26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md); ningún otro archivo de este paquete registra aprobaciones.

## Decisión condicionada y evidencia concreta

La preferencia PO por CFG-D sustituye la solicitud anterior de elegir genéricamente CFG-A/B/C/D (21:214); no sustituye la confirmación Methodology/Domain. `configuration_mode=none` no existe como dato publicado en los registries actuales. CT-02 sigue BLOCKED_CONDITIONAL_CFGD_SIGNOFF_AND_PUBLICATION. CFG-B sólo podrá considerarse si se demuestra una necesidad real y se autoriza una enmienda tipada; CFG-C no justificada, no se desarrolla. No Methodology→Definition/Subject/effective_at/snapshot inventado.

| Versión exacta | Fórmula/valores tipados demostrados en checkout | Ausencia EC / historia demostradas | Afirmación aún no demostrada |
|---|---|---|---|
| BASELINE_COMPLIANCE v1 | migration20261007000200:48/50, FormulaDefinition código/version1; score=sum(weight*status_factor)/sum(weight_of_scored_applicable_requirements)*100; coverage=scored/applicable*100; partial_compliance_factor numeric(5,4)=0.50; minimum_coverage numeric(5,2)=80; publicado global PLATFORM_CONTROL con FK fórmula y código/version único | service.ts:263–267 retorna sin EC; :271–277 conserva metodología y EC nullable; FK publicado; fórmula/método inmutables, selección vigente, resolución histórica sin exigir vigencia actual (methodologies.ts:23) | Que fórmula + parámetros + reglas rector17/19/38/39 + pesos gobernados del Pack bastan para todo resultado de esta versión y no existe dependencia adicional de EC; omitir EC no prueba esa afirmación |
| BASELINE_CONTROL_EFFECTIVENESS v1 | migration20261007000200:96/98/100; fórmula min(design_effectiveness,operating_effectiveness), minimum_coverage numeric(5,2)=80; FK/version/publicación/ownership; service.ts:710–738 consulta método histórico, exige coverage/result_status y calcula min | service.ts:317–324 omite EC si ausente; conserva FK método; histórico no se recalcula por cambio de selección | Que inputs design/operating/coverage y reglas de evidencia/recencia/suficiencia/conclusión del método cubren todo cálculo oficial sin EC ni otro parámetro metodológico externo |

Fuentes de autoridad: docs/rector/baseline/17_CATALOGO_METRICAS_FORMULAS_Y_AGREGACIONES.md:42; docs/rector/baseline/19_METODOLOGIAS_GRC_COMPLIANCE_RISK_ASSURANCE.md:5; docs/executable-contracts/27_PHASE5_METHODOLOGY_BINDING.md:5; aprobación física Fase5 y migration actual íntegra. Los UUID seed publicados identifican versiones en la fuente, no reglas hardcodeadas de este diseño. Coverage/partial factor se consumen como datos metodológicos, no nuevas constantes runtime. No se consultó historial privado/QA.

Conclusión por ambas: evidencia **suficiente para someter CFG-D a firma, insuficiente para afirmar autosuficiencia oficial**. La fórmula Compliance incluye pesos externos al registry: Methodology/Compliance deben confirmar el origen gobernado por Pack, suficiencia del caso sin pesos explícitos y ausencia de configuración adicional; no se transforma weight=1 en código nuevo. Controls debe confirmar independencia de configuración para sus dimensiones y restricciones. Si se rechaza una afirmación, CT02 permanece bloqueado y se describe el parámetro/dependencia exacto que justifique CFG-B, sin crearlo.

## Dos cláusulas firmables independientes

**CFG-D-COMPLIANCE-V1 — propuesta de texto a aprobar/rechazar:** «Confirmo que BASELINE_COMPLIANCE v1 y su FormulaDefinition v1 publicada, los parámetros tipados minimum_coverage/partial_compliance_factor, las reglas rectoras de status/suficiencia y los inputs/pesos autorizados por Pack son metodológicamente autosuficientes. No requieren EffectiveConfiguration adicional para nuevos usos de esa versión. Apruebo publicar la declaración versionada configuration_mode=none sólo después de revisar su vínculo e inmutabilidad en CFG-D-PUBLICATION y la compatibilidad CFG-D-HISTORY; vigencia será la explícita del manifest firmado. Esta decisión no modifica parámetros, código/version ni resultados históricos». Owners Methodology/Configuration/Compliance/Architecture; resultado PENDING_REVIEW.

**CFG-D-CONTROLS-V1 — propuesta de texto a aprobar/rechazar:** «Confirmo que BASELINE_CONTROL_EFFECTIVENESS v1 y su FormulaDefinition v1 publicada, minimum_coverage y los inputs/reglas autorizados de diseño, operación, evidencia, recencia, cobertura y conclusión son metodológicamente autosuficientes y no requieren EffectiveConfiguration adicional. Apruebo publicar configuration_mode=none para nuevos usos de la versión exacta sólo tras CFG-D-PUBLICATION/HISTORY, con vigencia explícita del manifest firmado y preservación de referencias/resultados históricos». Owners Methodology/Configuration/Controls-Assurance/Architecture; resultado PENDING_REVIEW.

No hay fecha efectiva, firma o identidad prellenada. La fecha PO2026-10-08 no es effective_from de ninguno de esos modos.

## Delta create/read, ausencia e historia (CFG-D-HISTORY/PUBLICATION)

Tras firma y publicación autorizada: create de cada dominio exige metodología exacta publicada/selectable. Para modo none publicado, omitir effective_configuration_id conserva NULL; un UUID EC adicional se rechaza con TCDX.INVARIANT.VIOLATION422 sanitizado. Un null explícito continúa sujeto a shape actual OpenAPI; no se lo inventa como variante nueva. No grant de EC.read por assessment.create. No resolver EC ni Definition ni scope ni instante efectivo ni snapshot ficticio para expresar ausencia. Firma de una metodología no habilita la otra ni nuevas versiones.

Read de un assessment histórico devuelve su metodología/version y EC real nullable con autorización existente. Un registro antiguo sin EC no se reetiqueta retroactivamente none por NULL. Un registro antiguo con EC conserva FK, layers/valores/versiones y significado histórico; no se rechaza su lectura, se elimina FK ni se recalcula. Snapshots publicados conservan items/result_status/conclusion/version y EC real cuando participó; un nuevo resultado none sólo conserva ausencia explícita y versión metodológica/fórmula + provenance de publicación aprobada, sin construir EC vacía. No se afirma generación de snapshot contextual existente.

**Decisión concreta CFG-D-PUBLICATION:** revisar un manifest contractual versionado por metodología que asocie su identidad/version exacta, fórmula/version y hash, declaración none, firma y effective interval explícito. No publicar modo en código por comparación con dos nombres; no cambiar filas metodológicas publicadas inmutables. Architecture/Methodology/Data Model/Backend deben aprobar si la declaración adicional preserva el significado original de v1 o exige nueva versión metodológica. Si exige v2 o un vínculo físico adicional, detener publicación y preparar delta exacto para decisión competente/PO donde afecte dirección; no inventar schema. Enlace a release/traceability existente puede probar provenance sólo después de aprobación verificable. No asumir que audit JSON genérico ya satisface ese binding.

Schema create actual no cambia aquí; propuesta futura por mode publicado restringe EC sin cambiar requiredness de methodology_version_ref. Response candidata de metodología puede declarar modo/version de declaración firmada únicamente desde fuente publicada aprobada; mientras no exista, no añadir `none` a response/UI. La identidad/version/fecha/hash del manifest y su asociación inmutable son condición de firma, no un dato operativo inventado.

## CT-02: lectura real y permiso

docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml:3478 declara GET effective-configurations/{id}, operationId effectiveConfigurationGet, CORE_PLATFORM, configuration.effective_configuration.read, RO; respuesta genérica OperationSuccess. Búsqueda local literal en apps/backend/packages/contracts/e2e no demuestra handler HTTP ni discovery contextual. routes.ts enumera reads y metodología, sin EC. Estado `PUBLISHED_DECLARATION_HANDLER_NOT_DEMONSTRATED`. No contar esa declaración como capability implementada, aunque contracts:verify pase.

EC.read existente conserva Data Admin/scopes publicados (Permission05:230); no se amplía. Si CFG-D se firma/publica para esas dos versiones, no necesitan picker EC, pero esa exclusión sólo cierra su dependencia metodológica tras enmienda aprobada/pruebas. No certifica handler detalle ni resuelve otros modos/metodologías. Context route propuesto21 no se implementa para evitar un binding innecesario. No se retoma CFG-B sin necesidad real.

## Reconciliación física forward-only — diseño, sin DDL

| Cláusula | Materialización heredada | Clave/regla superior y candidato de reconciliación |
|---|---|---|
| CFG-UQ1 | migration006:797 UNIQUE NULLS NOT DISTINCT(tenant_id) | físico01:228: business key (tenant_id,configuration_definition_id,resolved_for_subject_id,effective_at,input_hash), NULLS NOT DISTINCT; PK y FK por tenant/EC permanecen |
| CFG-UQ2 | migration006:800 UNIQUE(ordinal) global | físico01:229: (effective_configuration_id,precedence_level,ordinal), con FK EC mismo tenant; no renumerar historia ni cambiar PK |
| CFG-DEFAULT | migration006:772 num_nonnulls(defaults)<=1 | físico01:224 exige exactamente uno, compatible con value_type y validation/scopes. Propuesta conservar esa regla, no default sintético. Permitir cero aun en draft exige enmienda competente explícita; no se presume excepción |

Preflight futuro tras autorización: inventario agregado por code/version de Definition, tipos y count de defaults (0/1/>1), estado/publicación y validation rules; EC por tenant/Definition/Subject/instant/hash, duplicates con NULL-safe equality, resolución/hash tipados, referencias desde assessments/snapshots y layers; coherencia layer.definition=EC.definition=override.definition, tenant/ownership/intervalo de cada FK; orphan/FK/convalidated; ordinal/nivel; catálogo real de índices/constraints y nombres. Inventario de datos históricos aún **NOT_RUN**, sin copiar filas privadas ni usar el receipt aislado histórico25 como consulta actual.

La migración futura aprobada crea/verifica nuevas claves antes de retirar sólo las dos restricciones erróneas, mantiene tenant identity UQ y todas PK/FK. Orden transaccional/locks, timeout y plan de disponibilidad se firman Data Model/Backend; ninguna receta ejecutable DDL aquí. Duplicados, default ausente/incompatible o hash inválido bloquean; no backfill por guesses, no delete/renumber/update historia. Actualizar expected-schema/generadores/checks y modelo/version/manifests sólo con autorización, no modificar migraciones pasadas.

Integridad: backup y restore comprobables del inventario aprobado; hashes de metadata/cuentas/FK antes/después; tests de aislamiento e inmutabilidad. Antes de commit, error revierte transacción. Después de permitir varias EC por tenant u ordinal por EC, **no reinstalar constraints globales por rollback**: datos legítimos nuevos no cabrían. Recuperación forward-only compensatoria revisada o restore coordinado del backup tras evaluar datos posteriores, nunca truncar historial. Pausar nuevas escrituras dependientes durante recuperación conforme a contrato aprobado, sin desactivar RLS/RBAC ni grants.

typed default: exactly one columna de boolean/integer/decimal/text/timestamp/duration/json según value_type; límites y validaciones de Definition; json no contiene parámetro crítico que deba normalizarse. Zero no significa none metodológico: CFG-D evita EC adicional, no invalida reglas de ConfigurationDefinition. Owner confirma impacto sobre drafts y Definitions ya publicadas; si contrato requiere distinto diseño, DR/enmienda específica.

## Pruebas propuestas y habilitación

| Test | Criterio posterior a firma/publicación | Estado actual |
|---|---|---|
| CFG-T01 | Cada metodología firmada sólo habilita versión exacta, ninguna versión nueva/hermana ni modo por nombre | NOT_RUN_PROPOSED |
| CFG-T02 | none: ausencia EC válida; UUID adicional422; no EC.read nuevo; no creación de EC/layers/snapshot por GET; wrong-domain/unpublished/expired DENY | NOT_RUN_PROPOSED |
| CFG-T03 | Históricos NULL y EC referenciada se leen sin reescritura; snapshot reproduce método/fórmula/EC exactos tras expiry | NOT_RUN_PROPOSED |
| CFG-T04 | Manifest hash/version/firma/vigencia permite reproducibilidad; firma ausente o modo ambiguo falla cerrado | NOT_RUN_PROPOSED |
| CFG-T05 | Declaración HTTP no prueba handler; comprobar endpoint real sólo tras autorización; actor create sin EC.read no adquiere read | NOT_RUN_PROPOSED |
| CFG-T06 | Dos EC mismo tenant con distintas Definition/Subject/fecha/hash válidas; duplicate same key NULL-safe DENY; ordinal igual en EC distintas permitido y mismo EC/nivel duplicado DENY | NOT_RUN_NOT_AUTHORIZED_DDL |
| CFG-T07 | Cross-tenant/layer-definition mismatch, idempotencia concurrente, FK/inmutabilidad, backup/restore y rollback antes del commit | NOT_RUN_NOT_AUTHORIZED_DDL |
| CFG-T08 | Default0/>1/tipo incorrecto/rango inválido DENY; typed default válido admitido conforme contrato; ninguna excepción draft sin firma | NOT_RUN_NOT_AUTHORIZED_DDL |

Siguiente acto competente: firmar/rechazar CFG-D-COMPLIANCE-V1 y CFG-D-CONTROLS-V1 con sus afirmaciones exactas; Backend/Data Model revisan HISTORY/PUBLICATION y UQ1/UQ2/DEFAULT; QA CFG-QA. El agente no firma, no ejecuta schema ni convierte preferencia PO en runtime.
