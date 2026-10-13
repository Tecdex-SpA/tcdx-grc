# P-CONFIG / CT-02 — evidencia de binding y opciones arquitectónicas para decisión

Fecha: 2026-10-08. Estado: `READY_FOR_HUMAN_SIGNOFF` para este análisis/propuesta; `BLOCKED_MISSING_CANONICAL_BINDING` para implementación contextual; `PROPOSED_NOT_PUBLISHED` para cada contrato nuevo aquí descrito. `STEP_6A3=PARTIAL_BLOCKED`; `RECTOR_GATE=BLOCKED` para publicación dependiente. Integridad del baseline local verificada: `PASS`.

Master activo: `TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23`. Checkout comprobado: raíz local de `Tecdex-SpA/tcdx-grc`, `main`, HEAD `6af66387aa03fa185ef139584de07700f247b903`, igual al histórico indicado. El archivo 21 no existía antes de esta ejecución. Se preservan las fuentes y documentos preexistentes. Investigación exclusivamente local; no se utilizó memoria externa, red, ZIP normativo, QA ni despliegue.

## 1. Decisión funcional recibida y límite de su autorización

CT-02 ya está aprobado en dirección: reutilizar `configuration.effective_configuration.read` solamente cuando se demuestre un binding determinista, sin heurísticas. No se vuelve a pedir esa decisión. El permiso y la operación de detalle están publicados; el binding contextual **no queda demostrado** por su existencia. El PO no ha firmado revisión de Architecture, Data Model, Configuration, Methodology, Domain, Backend o Security. Este documento no simula esas firmas ni modifica contratos ejecutables, backend, frontend, permisos, grants, schema o migraciones.

Conclusión exacta: **`NO_BINDING_DEMONSTRATED`**. Las fuentes inspeccionadas no permiten reconstruir la función evaluación/metodología → definición versionada → Subject → fecha efectiva → resolución inmutable/snapshot. Esto no afirma `NO_BINDING_EXISTS` universalmente ni sustituye un inventario runtime de QA.

El preflight de integridad ejecutó `bash scripts/verify-rector-governance.sh`, exit 0, `RECTOR_BASELINE_INTEGRITY=PASS`. Los estados históricos impresos por el script no son inventario actual de QA ni cierre de CT-02. La autorización vigente sólo permite investigar y preparar esta propuesta.

## 2. Autoridad y precedencia usadas

| Fuente real | Cláusula y consecuencia para CT-02 |
|---|---|
| `docs/rector/baseline/46_REGENTE_MAESTRO_DEL_DESARROLLO.md:24` | La cadena canónico/lógico → físico → ejecutable → código no permite que `owner_domain` o un test inventen una relación. |
| `docs/rector/baseline/29_CONFIGURACION_PARAMETRIZACION_Y_EXTENSIBILIDAD.md:11` | Definition, Override y EffectiveConfiguration son conceptos distintos; configuración crítica tiene representación tipada. |
| Rector 29, líneas 21–25 | Platform Default → Methodology/Pack → Tenant → Object; conflicto de igual especificidad explícito; lineage reconstruible de IDs/versiones/valores. |
| `docs/rector/baseline/19_METODOLOGIAS_GRC_COMPLIANCE_RISK_ASSURANCE.md:5` | Metodologías compatibles versionadas; publicación inmutable. |
| `docs/rector/baseline/23_CONTRATO_TEMPORAL_VERSIONADO_RETENCION_RECALCULO.md:5` | `created_at`, `assessed_at`, `effective_at`, publicación y vigencia no son intercambiables. §§2–5 preservan versiones/snapshots e impiden recálculo silencioso. |
| `docs/rector/baseline/30_MODELO_LOGICO_RELACIONAL_CANONICO.md:116` | Definition 1:N Override y 1:N EffectiveConfiguration; resultado oficial dependiente referencia resolución concreta. |
| `docs/rector/baseline/45_CONTRATO_DESARROLLO_CERRADO_Y_NO_INFERENCIA.md:11` | Autoriza propuesta DRAFT cuando el packet lo solicita; líneas 30–46 impiden elegir una alternativa como decisión oficial. Líneas 66–81 requieren decisión competente y evidencia de aprobación. |
| `docs/governance/PHASE5_METHODOLOGY_BINDING_ARCHITECTURE_DECISION_20261007.md:9` | Enmienda aprobada diferencia Methodology de ConfigurationDefinition/FormulaDefinition; crea dos registries y FKs, no binding metodológico de configuración. |
| `docs/executable-contracts/27_PHASE5_METHODOLOGY_BINDING.md:5` | Optional EffectiveConfiguration valida tenant/owner domain; no override inferido. No prescribe qué Definition requiere cada versión. |
| `docs/physical-data-model/15_PHASE5_METHODOLOGY_BINDING_AMENDMENT.md:7` | FKs a registries y fórmulas; referencia histórica protegida; no relación a ConfigurationDefinition. |
| `docs/phase6a/STEP_6A1/02_FORM_FIELD_MATRIX.csv` | F-0026/F-0040/F-0127/F-0145 registran la dependencia create/detail; son inventario UI, no autoridad del binding. |
| `docs/phase6a/STEP_6A2/04_MISSING_READ_CAPABILITIES.md:19` | Separa contrato de detalle declarado de discovery ejecutado; líneas 21–25 exigen definición/scope/instante canónicos antes del adapter. |
| `docs/phase6a/STEP_6A3/11_CORRECTIVE_CONTRACT_DECISION_PACKET.md` y `15_DR_6A3_TECHNICAL_20261008.md` | Propuestas previas se mantienen DRAFT. La investigación nueva de §§3–5 aporta relaciones, cardinalidades, constraints y alternativas precisas; no reproduce un bloqueo por falta de contexto. |
| `docs/governance/MASTER_EXECUTION_STATUS.md:5109` | Estado vigente `PARTIAL_BLOCKED`; 6A.4/5/6 no iniciados. |

El baseline local es suficiente para la investigación y propuesta. No hay dependencia de `/mnt/data` ni se trata el ZIP normativo reservado como vocabulario/configuración operacional.

## 3. Cadena de claves real y puntos de ruptura

| Arista/capacidad | Fuente archivo:línea | Cardinalidad / ownership comprobado | Resultado |
|---|---|---|---|
| RequirementAssessment → RequirementApplicability | `database/migrations/20260916000300_normative_control_evidence.sql:215`; `20260916000700_foreign_keys.sql:219` | Cada assessment tiene un applicability; relación mismo tenant. Applicability posee un `scope_subject_id` nullable (líneas 196–212). | El Subject potencial puede derivarse inequívocamente **del applicability**; falta contrato que lo haga el Subject de resolución. |
| RequirementAssessment → ComplianceMethodology | `database/migrations/20261007000200_phase5_methodology_binding.sql:52` | FK no nula, registry global `PLATFORM_CONTROL`, tenant NULL, un row por versión. | Binding metodológico publicado completo para identidad de metodología. |
| ControlAssessment → Control / ControlVersion | `database/migrations/20260916000300_normative_control_evidence.sql:455`; `apps/backend/src/core-grc/service.ts:319` | Control tenant y versión compatible; no `scope_subject_id` propio en assessment. | El target se identifica, el Subject de configuración no. |
| Control → ControlScope → Subject | `database/migrations/20260916000300_normative_control_evidence.sql:441` | Control 0..N scopes; cada scope tiene Subject, rol e intervalo; no Subject singular por contrato. | No usar business owner como scope, ni primer scope, ni combinación inventada. |
| ControlAssessment → ControlEffectivenessMethodology | `database/migrations/20261007000200_phase5_methodology_binding.sql:102` | FK no nula, global/platform, código+versión único. | Identidad metodológica completa y separada de Compliance/Risk. |
| Ambos registries → FormulaDefinition | `database/migrations/20261007000200_phase5_methodology_binding.sql:23`, `:42`, `:75`, `:93` | Cada versión exige exactamente una fórmula compatible. | Fórmula es binding real; no es una Definition de configuración. |
| Ambos registries → ConfigurationDefinition | Inventario completo de columnas de la migración `20261007000200`, líneas 11–44 y 63–94; `scripts/foundations/phase5-methodology-amendment.mjs:6` | No columna/relación publicada que elija Definition, mode de configuración o instante de resolución. | **Primera ruptura:** no se determina qué Definition corresponde a una metodología/evaluación. |
| ConfigurationOverride → Definition | `database/migrations/20260916000500_data_integration_reporting_ai.sql:513`; `20260916000700_foreign_keys.sql:928` | N:1 FK real; override versionado, scopes/metodología/pack/sujeto opcionales. | Definition de un override no demuestra que la metodología lo requiera. |
| ConfigurationOverride.methodology_id → registry | `database/migrations/20260916000500_data_integration_reporting_ai.sql:524`; `20260916000700_foreign_keys.sql:925`–`:931` | UUID nullable; FKs presentes apuntan a Definition, Pack, Subject, actores/tenant; no FK de `methodology_id`. | **Segunda ruptura:** UUID no tipado no distingue Compliance/ControlEffectiveness/Risk ni versión. Índice sobre columna no aporta target ni integridad. |
| EffectiveConfiguration → Definition / Subject | `database/migrations/20260916000500_data_integration_reporting_ai.sql:541`; `20260916000700_foreign_keys.sql:935`–`:936` | N:1 Definition, un Subject nullable, tenant no nulo; `effective_at`, `resolved_at`, hash y valores tipados persistidos. | Es capaz de representar una resolución singular, pero no se enlaza a metodología/binding. |
| Assessment → EffectiveConfiguration | `database/migrations/20260916000700_foreign_keys.sql:220`, `:299` | 0..1 resolución por assessment; FK compuesta tenant+EC. | Evita referencia cross-tenant; no certifica método/definición/scope/fecha. |
| EffectiveConfiguration → layers | `database/migrations/20260916000700_foreign_keys.sql:940`–`:942` | Layer → EC mismo tenant; FK a Definition y override. Definition/override se referencian separadamente. | FKs no fuerzan por sí solas que override.definition = layer.definition = EC.definition ni que el override sea de ese tenant compatible. El servicio futuro debe verificar estas igualdades. |
| Snapshot → EffectiveConfiguration / assessment | `database/migrations/20260916000500_data_integration_reporting_ai.sql:409`–`:447`; `20260916000700_foreign_keys.sql:895` | Snapshot tiene 0..1 EC y N SnapshotItems tipados; preservar una resolución por resultado/ítem cuando se publiquen varios parámetros incompatibles. | FK disponible; no se encontró generación de snapshot contextual para CT-02 en core-grc. No declarar cierre de reproducibilidad por mera estructura. |
| Assessment → instante efectivo | Request create: `apps/backend/src/core-grc/service.ts:829`, `:832`; submit `:736`, `:790` | Create admite método + EC opcional, no fecha efectiva explícita. `assessed_at` se fija al submit en reloj del servidor. | **Tercera ruptura:** no hay contrato que derive `effective_at` de assessment create/submit. No reemplazarlo por ahora/created_at/fecha de lectura. |

### Validación ejecutada existente frente a validación necesaria

`apps/backend/src/core-grc/service.ts:263`–`:267` retorna sin validar configuración si `effective_configuration_id` está ausente. Si está presente sólo exige:

```text
ec.id = request.id
ec.tenant_id = actor.tenant_id
ec.configuration_definition_id = cd.id
cd.owner_domain = 'compliance' o 'controls'
cd.lifecycle_state = 'published'
```

Las líneas 271–276 y 317–324 resuelven metodología y EC por separado. No cruzan identidad metodológica con Definition; no verifican `resolved_for_subject_id`, `effective_at`, intervalo Definition/overrides, `resolution_status`, `input_hash`, layers, flags de override o vínculo a snapshot. `owner_domain` es clasificación de ownership, no una función única metodología → Definition. Una consulta `WHERE owner_domain=... ORDER BY version_number DESC` sería una selección nueva no autorizada.

El resolver puro `apps/backend/src/configuration/resolver.ts:3`–`:20` toma `layerId`, precedence, specificity y value provistos por su caller. Selecciona una única capa de mayor precedence, rechaza cero capas o múltiples candidatas. No obtiene FKs, permisos, effective intervals, flags/type/scope, snapshot ID o hash persistido. Su retorno `value/selectedLayerId/layerIds` no equivale a un `config.effective_configurations` publicado.

## 4. Catálogos, seeds, distribución de permisos y rutas

`database/migrations/20260916000900_canonical_seeds.sql:405` publica `configuration.effective_configuration.read` con permission ID `01a0a783-6000-7a9d-bf6b-22370d0bbdd0`. La línea 406 concede el permiso al template cuyo role ID es `01a0a783-6000-7e26-b646-a62350994723`; el catálogo humano identifica **Data Admin** (`docs/executable-contracts/05_PERMISSION_CATALOG.md:230`). Sus scopes son tenant, organizational_unit, process, service, assigned_object y owned_object; capability `CORE_PLATFORM`. El catálogo generado los reproduce en `apps/backend/src/security/permission-projection-catalog.generated.ts:334`–`:345`. No se infiere permiso de lectura desde create assessment ni desde Platform Admin.

`docs/executable-contracts/03_API_RESOURCE_OPERATION_MATRIX.md:158` publica `effectiveConfigurationGet`, GET `/effective-configurations/{id}`, RO, sin domain/audit event de lectura, conflicto explícito. OpenAPI líneas 3478–3501 declara tenant header y UUID path; response 200 `OperationSuccess` genérica. No hay request contextual ni response tipada contextual. Búsqueda literal en todos `apps/backend`, `packages/contracts` y `e2e` no encuentra handler `effectiveConfigurationGet` ni path `/effective-configurations`. `apps/backend/src/core-grc/routes.ts:62`–`:74` enumera lecturas reales sin EC; registro de metodología desde línea 124 sí existe. **Published declaration ≠ HTTP handler ejecutado ≠ discovery**. No se declara el GET existente probado en runtime.

Seeds de ConfigurationDefinition de foundations iniciales: `scripts/foundations/generate-contract-assets.mjs:1129` declara SEED-011 intencionalmente vacío. La publicación posterior `database/migrations/20260929000300_phase5_plus_subject_validation_access.sql:25`–`:35` aporta la Definition `tenant_account_classification`, owner domain `platform`, tipo text, tenant-overridable, no object-overridable, scope tenant. No es una configuración de Compliance/Control Effectiveness y no se reutiliza. Las dos metodologías baseline publicadas (`20261007000200:48`–`:50`, `:98`–`:100`) contienen fórmula/coverage y partial factor tipados, pero no declaran si EC adicional es `none`, `optional` o `required`; tampoco seleccionan Definition.

La reutilización particular de configuración de clasificación (`apps/backend/src/regulatory/tenant-classification.ts:20`–`:56`) prueba un consumo específico aprobado. Resuelve desde código/fecha actual y posee comportamiento de clasificación conservador; no crea EC persistida ni mapea assessment. No se generaliza ese fallback a CT-02, no se usa `commercial` ni `latest` como solución metodológica.

## 5. Discrepancia adicional comprobada: unicidad física de resoluciones

| Regla del modelo físico aprobado | Migración vigente encontrada | Consecuencia |
|---|---|---|
| `docs/physical-data-model/01_PHYSICAL_DATA_MODEL.md:228`: UQ tenant + definition + scope + effective + hash | `database/migrations/20260916000600_constraints_and_uniqueness.sql:797`: UNIQUE NULLS NOT DISTINCT **tenant_id solamente** | Limita a una EC por tenant y bloquea nuevas fechas/Definitions preservando historia. Contradice la cardinalidad Definition 1:N y resolución histórica. |
| Mismo físico, línea 229: UQ EC + level + ordinal | Misma migración, línea 800: UNIQUE **ordinal solamente** | Numeración de layers queda única entre todas las EC, en lugar de dentro de cada resolución. |

Búsqueda de ambos nombres de constraint en migraciones/scripts no identifica una migración que los reemplace. El root de esta ejecución además verificó en **PostgreSQL aislado existente** `127.0.0.1:55432`, versión 16.15, mediante lectura de `pg_indexes`, los dos índices con esas definiciones. La evidencia local/receipt y alcance se consolidan en 24/25; no representa inventario QA. No se corrigieron los constraints ni generador/expected-schema, no se ejecutó DDL. La precedencia mantiene el modelo aprobado; exige revisión Data Model de reconciliación física, no adaptar la UI para convivir con una única EC mutable por tenant.

También difieren la prosa `exactly one typed default` del físico línea 224 y el check `<=1` de `20260916000600:772`. No se da por aprobado un default inexistente; el owner debe cerrar qué ausencia es legítima al publicar la Definition. Scope/validation uniqueness de la prosa no convierte duplicados en opciones seleccionables. Estas diferencias se registran, sin reparación oportunista.

## 6. Opciones completas para Architecture/Data Model/Domain

Todas las opciones son `PROPOSED_NOT_PUBLISHED`. Ninguna se elige como decisión oficial. Aprobación de una opción **no autoriza DDL/QA/deploy/Git** en esta ejecución; exige autorización posterior delimitada y actualización de contratos.

| Opción | Contrato/modelo concreto | Ventaja | Consecuencia y condición de cierre |
|---|---|---|---|
| **CFG-A — publicar binding canónico ya existente si el owner lo aporta** | Mantener schema. Revisión exige una relación versionada disponible en el checkout que determine exactamente método→Definition, scope, fecha y EC. No puede ser una nueva tabla JSON/config ad hoc. Las reglas de §§7–9 aplican a sus identidades reales. | Cero nueva estructura; cumple CT-02 reutilizando autoridad publicada. | Hoy `NO_BINDING_DEMONSTRATED`; no implementable. La identificación competente de fuente real debe incluir PK/FK, cardinalidad, version/validity y test demostrativo. La discrepancia §5 no desaparece por esta opción: exige revisión física separada para histórico multi-resolución. |
| **CFG-B — binding tipado explícito a una Definition singular** | Un soporte normalizado para la relación entre objetos ya canónicos, descrito en §7; una EC existente por resolución. No crea un catálogo/metodología paralela. Publicación de binding requiere relación Domain/Data Model aprobada. | Corresponde al 0..1 EC de las assessment APIs y preserva una Definition versionada por resultado. | Añade soporte/constraints y contexto tipado mediante futura enmienda; exacto impacto detallado abajo. No inventa Definition/valores. Domain debe aprobar si singular satisface el método. |
| **CFG-C — N parámetros metodológicos independientes** | Methodology 1:N bindings tipados, cada uno N:1 Definition; Assessment 1:N EC mediante relaciones tipadas; SnapshotItem conserva conjunto de resoluciones. | Permite varios parámetros normalizados sin esconderlos en JSON. | Cambia cardinalidad assessment/contrato create/read y lineage de snapshots. Mayor impacto; requiere nueva enmienda, no compatible directamente con EC singular actual. No se necesita sólo para comodidad UI. Rechazar si Domain demuestra que no hay N parámetros. |
| **CFG-D — declaración explícita de ausencia de configuración adicional por versión** | Publicación competente del mode `none` para versiones cuyo método ya incorpora todos sus parámetros inmutables; persistir identidad/version de esa decisión como binding. Rechazar EC adicional en nuevas creaciones cubiertas por ese mode, no borrar referencias históricas. | No inventa ConfigurationDefinition ni valores para resolver una configuración que no aplica. | Los seeds tipados actuales permiten evaluar esta alternativa, no la prueban. Domain/Methodology debe firmar `none` explícitamente para la versión exacta y su vigencia; Backend/Data Model deben revisar preservación de assessments preexistentes. No omitir automáticamente EC por ser optional en OpenAPI. |

**Opciones descartadas técnicamente:** usar `owner_domain` como identity binding; escoger el latest; asumir UUID `override.methodology_id` válido por forma; utilizar business owner del Control como Subject; aceptar fecha actual implícita; guardar parámetros/binding crítico en metadata JSON; GET con INSERT; reinterpretar ConfigurationDefinition como metodología; introducir un catálogo UI independiente; conceder Data Admin a todo assessor. Cada una viola una cláusula o no demuestra unicidad/autoridad.

## 7. Enmienda mínima singular CFG-B — contenido exacto propuesto

La relación siguiente es **soporte relacional propuesto de ConfigurationDefinition/Methodology**, no una entidad canónica creada por el agente. Architecture debe decidir su incorporación al modelo lógico antes de Data Model/DDL. Nombres de tabla/columna/códigos de esta sección son propuestas y no valores runtime activos.

### CFG-B1. Binding versionado, tipado y publicado

Proponer tabla soporte `config.methodology_configuration_bindings`:

| Campo propuesto | Tipo / constraint cerrado |
|---|---|
| `methodology_configuration_binding_id` | UUIDv7 PK; identidad publicada mediante release gobernada, nunca UUID de UI. |
| `compliance_methodology_id` | UUID nullable, FK RESTRICT al registry Compliance. |
| `control_effectiveness_methodology_id` | UUID nullable, FK RESTRICT al registry Controls. Exactamente **uno** de ambos FKs no nulo; se excluye Risk de este slice. |
| `binding_version` | bigint positivo, único por FK metodológico+version. Identidad de método ya identifica versión metodológica. |
| `configuration_mode` | Enum propuesto `none | optional | required`; no valor por defecto; definición aprobada por Methodology/Domain. |
| `configuration_definition_id` | UUID nullable, FK RESTRICT; NULL exactamente cuando mode=none; no NULL para optional/required. Definition global compatible y publicada, `owner_domain` correcto como comprobación adicional, no selector. |
| `scope_rule` | Enum propuesto `tenant | applicability_subject | explicit_control_subject`; `none` usa scope_rule=tenant como contexto tenant, no afirma que el Control tenga scope tenant. Domain cierra por metodología compatible. |
| `time_rule` | Enum propuesto `explicit_effective_at`; obligatorio para contextual optional/required, prohibido derivar de reloj/creation/submit. |
| `effective_from`, `effective_to` | timestamptz inicio obligatorio, final nullable; intervalo `[from,to)`, final > inicio. No solapamiento de bindings publicados de igual metodología/version/contexto. |
| `lifecycle_state`, `published_at` | draft/published y publicación consistente; contenido publicado inmutable, fin de vigencia con motivo/audit preservado. |
| `created_at`, actor user/service FKs | Metadata canónica, exactamente un actor autorizado o system actor de seed release explícitamente identificado; no firma humana sintética. |
| `rector_source`, `approval_ref` | Provenance versionada obligatoria; son referencias de autoridad revisada, no comentarios que concedan permisos. |

Cardinalidades propuestas: versión metodológica 1:N bindings históricos, **exactamente uno** efectivo para nuevo command en el instante explícito; binding 0..1 Definition según mode; Definition 1:N bindings; Assessment N:1 binding aplicado; EC N:1 binding aplicado cuando existe. Publication gate exige no gap/overlap donde el método se ofrece para new creation. Dos exclusiones parciales por el FK metodológico tipado correspondiente + intervalo `[from,to)` para filas published impiden solapamiento; dos claves únicas parciales FK+binding_version preservan identidades por registry. Si existen 0 bindings se reporta `dependency_pending`, nunca mode=none inferido; >1 es conflicto, nunca mayor versión ni primera fila.

A través de una futura enmienda añadir `methodology_configuration_binding_id` nullable con FK a EC y a ambas assessment tables: una referencia persistida a la regla exacta utilizada, incluso si mode=none y EC NULL. Nueva creación posterior a publicación exige esta identidad; rows históricas no se rellenan con mappings arbitrarios. No crear código con excepción a IDs/fechas fijas: la elegibilidad depende de relación aprobada y vigencia como dato. Revisión/inventario histórico previo determina si rows sin binding pueden probarse o quedan preservadas como evidencia histórica con ausencia explícita de lineage, sin reescribir sus resultados.

Esta propuesta cambia **una tabla soporte nueva**, **una columna/FK en EC**, **una columna/FK en cada assessment table**. No se asigna migration ID, UUID seed ni aprobación de DDL en este documento. CFG-B añade también typed FK opcionales de metodología a `configuration_overrides` (dos columnas correspondientes a los registries; exactamente una cuando scope metodológico de estos dominios). El UUID genérico `methodology_id` no se interpreta: inventariar cualquier uso real previo, resolver mappings con owner y actualizar contrato físico; no crear fallback dual de escritura/lectura. La enmienda deberá decidir formalmente la representación del resto de domains antes de retirar/redefinir esa columna; Risk no se implementa aquí. Si no puede reconciliarse sin intervenir otro dominio, **no se autoriza CFG-B para producción**; elegir binding existente demostrado o cerrar la enmienda transversal competente sin ejecutar Phase 6 Risk.

### CFG-B2. Scope/fecha deterministas

Para RequirementAssessment: obtener applicability por ID autorizado y tenant; si scope_rule=applicability_subject, EC.Subject debe ser idéntico al `scope_subject_id` de esa **versión** de applicability. NULL representa el scope tenant-wide ya modelado, no un UUID fabricado. No cambiar el scope de applicability. Si scope_rule=tenant se rechaza cualquier EC con Subject no NULL.

Para ControlAssessment: si scope_rule=explicit_control_subject, el command contextual identifica Subject seleccionado por affordance empresarial autorizada; debe existir ControlScope real vigente de ese Control y tenant en el effective instant. Si hay varios scopes, la persona selecciona explícitamente uno; no se elige primer scope ni owner. Si el método exige ese scope y no hay ControlScope elegible, `dependency_pending`; no se degrada a tenant-wide. Si Domain quiere cálculo agregado multiscopes, es CFG-C y no este contrato singular. scope_rule=tenant exige Subject NULL y debe estar aprobado explícitamente para ese método.

Para optional/required, el usuario proporciona fecha de negocio en una interfaz legible; el command usa `effective_at` ISO8601 con offset, normalizado UTC. Ese instante se persiste en EC y se audita en el command; nunca toma `assessed_at`, fecha de lectura o ahora implícito. Intervalos del método/binding/Definition/scopes/overrides contienen el mismo instante con semántica `[from,to)`. Una metodología expirada puede leerse históricamente; no se vuelve selectable por pasar una fecha histórica si el contrato de creación vigente lo prohíbe. Backfill/reassessment histórico conserva workflow explícito rector23, no es creado por este selector.

### CFG-B3. Resolución, snapshot e idempotencia

1. Resolver actor/Membership tenant, entitlement de dominio y autoridad del target antes de leer capas. Binding requiere exactamente uno efectivo, con FK/ownership/type/scope compatibles.
2. Para mode=none: no calcular EC, no inventar default; devolver/persistir ausencia y binding versionado explícitos. Para optional: ausencia sólo por elección expresa y regla metodológica publicada que define el efecto de ausencia. Para required: ausencia de resolución impide creación/publicación dependiente.
3. Resolver **únicamente** Definition seleccionada por FK del binding. Default proviene de esa versión publicada y se admite sólo si la Definition prescribe un typed default válido. Leer methodology/pack, tenant y object overrides cuyo intervalo contiene effective_at, lifecycle/publication/approval y flags/scope/type autorizados. Pack sólo entra con vínculo canónico explícito del target; si no puede determinarse un Pack singular se reporta conflicto o dependency_pending, no se busca cualquiera.
4. Precedence 0 Platform, 1 Methodology/Pack, 2 Tenant, 3 Object. Dos candidatos incompatibles de igual especificidad producen conflicto. Orden de lectura no cambia resultado. Las reglas de validación tipadas de Definition se aplican antes de aceptar effective value. No mezcla feature flag, entitlement ni RBAC como parámetros metodológicos.
5. Canonical hash SHA-256 sobre tenant, método/version, binding ID/version, Definition ID/version, Subject/null, effective_at UTC, IDs/versiones/valores de todas las capas y versión del algoritmo. Orden de serialización fijo por precedence/ordinal/identity, números/timestamps tipados, sin datos volátiles `resolved_at` en input hash. Backend owner aprueba formato versionado y pruebas de equivalencia.
6. Una lectura retorna solamente EC/layers **ya persistidas** cuyo contexto/hash sea exacto. No inserta para obtener ID. Si no existe una EC requerida, se responde ausencia explícita; la futura mutación de negocio autorizada puede resolver/persistir EC/layers dentro de la misma TX de creación/evaluación, con idempotency key del command existente. Ese cambio de escritura es enmienda futura, no ejecutado por CT-02 actual.
7. Snapshot publicado referencia EC exacta + binding/version + assessment/item; no recalcula al leer. La resolución persistida y sus layers son inmutables cuando un resultado las referencia. Corrección crea nueva resolución/hash y nueva versión/snapshot con supersession auditada; no UPDATE en sitio. Históricos conservan FK aunque método/Definition/override se retire.
8. Corregir en futura migración gobernada los dos UQ del §5 a `UNIQUE NULLS NOT DISTINCT(tenant_id, configuration_definition_id, resolved_for_subject_id, effective_at, input_hash)` y `UNIQUE(effective_configuration_id, precedence_level, ordinal)`. Si binding identifica semántica adicional, el hash la incorpora; Data Model valida si binding FK debe estar también en business key. No borrar/recrear ni truncar historia. Para evitar duplicados concurrentes, atomic insert/get bajo business key y idempotencia; misma key de command+payload equivale a replay, distinto payload conflicto.

### CFG-B4. Versiones actuales y valores ausentes

Las metodologías baseline exactas ya publicadas son `BASELINE_COMPLIANCE` v1 y `BASELINE_CONTROL_EFFECTIVENESS` v1 (`20261007000200:50`, `:100`). Sus coverage/factor están tipados. El packet **no afirma** que acepten configuración adicional ni que su ausencia equivalga a none. La cláusula decidible para Domain es: aprobar **mode=none** explícito para nuevos usages de esas versiones con vigencia de publicación y preservación de resultados anteriores, o publicar nuevas versiones metodológicas y Definitions exactas que requieran optional/required. No se insertan nombres/códigos/UUID/thresholds nuevos para aparentar cierre. Aprobación de mode=optional exige firmar el comportamiento de ausencia (método inmutable vigente sin override adicional); si no se acepta ese comportamiento no se aprueba optional.

## 8. Proyección contractual contextual — propuesta concreta, sin publicación

La operación de detalle existente sigue GET `/api/v1/effective-configurations/{id}`, UUIDv7 path, sin query nueva. Se propone publicar schema de respuesta minimizado, manteniendo permiso `configuration.effective_configuration.read`, scopes existentes y `CORE_PLATFORM`. Fields permitidos:

```text
effective_configuration_id: UuidV7
configuration_definition: {configuration_definition_id: UuidV7,
  configuration_code: string[1..128], version_number: positive int64}
resolved_for_subject_id: UuidV7|null
effective_at: date-time UTC
resolved_at: date-time UTC
resolution_status: código de resolución expresamente publicado por owner
input_hash: hex sha256[64]
layers: [{configuration_definition_id: UuidV7,
  configuration_override_id: UuidV7|null, precedence_level: string contractual,
  ordinal: positive integer, was_selected: boolean}]
```

`resolution_status`/`precedence_level` no tienen enum cerrado publicado identificado; la firma debe aprobar códigos concretos antes del schema executable. Propuesta separada y explícita para resolución: `resolved` = un resultado válido reproducible; `insufficient_data` = no valor autorizado; `configuration_conflict` = capas incompatibles; `dependency_pending` = binding/fuente requerido ausente. Para `precedence_level` se proponen exactamente `platform_default` (0), `methodology_or_pack` (1), `tenant_override` (2), `object_override` (3). Son **códigos propuestos no aprobados**, nunca se reescribe un estado actual por similitud. Error envelope usa códigos TCDX existentes donde equivalen: 400 `TCDX.VALIDATION.FAILED`, 403 `TCDX.AUTHORIZATION.DENIED`, 404 `TCDX.RESOURCE.NOT_FOUND`, 409 `TCDX.CONFLICT.RESOURCE`, 422 `TCDX.RESULT.INSUFFICIENT_DATA`; dependency ausente se expresa en el contexto diagnóstico sanitizado del 422 propuesto y no introduce un error code nuevo.

Orden de layers: precedencia publicada ascendente, ordinal ascendente, override ID para desempate sólo de presentación; conflictos se detectan antes del orden. No paginación: resolución singular; se devuelven todas las filas de lineage de esa EC autorizada, sin truncamiento ni selección de una página como si fuera el conjunto completo. No typed values sensibles, JSON, secretos ni nombres de actores/admin en el picker. Etiquetas: «Configuración {configuration_code}, versión {version_number}», «Vigente para {fecha}», «Sin configuración adicional» sólo cuando mode=none firmado. Códigos/IDs permanecen técnicos en persistencia/API; traducción central contextual es presentación.

Discovery adicional propuesto: operation `effectiveConfigurationContextGet`, GET `/api/v1/effective-configuration-context` (nombre/path **DRAFT**), singular RO, mismo permiso. Query allowlist exacta:

| Variante | Parámetros permitidos/obligatorios |
|---|---|
| Compliance | `requirement_applicability_id` UUIDv7, `methodology_version_ref` UUIDv7, `effective_at` date-time obligatorios; no `control_id`, no tenant query, no cliente Definition ID. Subject derivado del applicability conforme binding. |
| Controls | `control_id`, `control_version_id`, `methodology_version_ref` UUIDv7 y `effective_at` obligatorios; `scope_subject_id` obligatorio sólo para explicit_control_subject, prohibido para tenant. |

Variantes mutuamente excluyentes; desconocidos/duplicados/referencias wrong-domain → 400 sanitizado. TenantContext deriva del actor validado. Response `mode`, `methodology_version_ref`, binding ID/version y `configuration` del schema anterior o NULL sólo para mode=none/optional explícitamente permitidos. GET no materializa resolution ni snapshot. 422 por requerida ausente; 409 por >1 binding/candidato; 404 target inaccesible; 401/403 auth/capability/permission; 503 backend indisponible nunca vacío exitoso. El contexto debe ser suficiente para resolver singularmente o fallar, no se introduce un listado de todas las EC de tenant.

Autorización backend obligatoria: Membership activa, tenant seleccionado, CORE_PLATFORM y permiso existente; además entitlement ISO_COMPLIANCE/CONTROLS_ASSURANCE, permiso de lectura del target y ObjectPolicy target→Subject. Platform authority no implica tenant authority. Si actor tiene assessment.create pero no EC.read, **DENY**. No se cambia el grant de Data Admin; un assessor sin ese permiso sigue bloqueado para discovery. Cualquier distribución adicional pertenece a Security/P-RBAC explícito y está fuera de CT-02 autorizado. El detalle EC valida objeto/scopes y cada layer visible, minimiza links no autorizados; no revela existencia cross-tenant.

Read no genera domain event ni mutación. Protected access/security logging respeta política vigente y correlation ID; contract matrix actual conserva audit/domain event NONE. Publicación/override/assessment command llevan AuditEvent con actor real, tenant, binding/método/Definition versions, Subject/effective instant y provenance; estos eventos nuevos/versionados deben publicarse/revisarse antes de ejecución.

## 9. Verificación exigida y evidencia de esta pasada

| Prueba | Expectativa de aceptación posterior a firma | Estado de esta ejecución |
|---|---|---|
| Rector/hash/source precedence | Baseline inmutable íntegro | **PASS**, script rector exit 0 ejecutado. |
| Investigación de FK/routes/seeds/tests | Cadena real con diferencias explícitas; ninguna fuente DRAFT tratada como publicada | **EXECUTED_STATIC**, §§3–5. |
| Constraints de EC/layers | Claves del físico vs índices reales aislados | **EXECUTED_READ_ONLY_ISOLATED**, reproducción informada por root; receipt consolidado en 24/25. QA **NOT_RUN**. |
| Resolver unit vigente | Mayor precedence singular, ausencia/ambigüedad explícitas | Inspeccionadas dos pruebas `apps/backend/src/configuration/resolver.test.ts:5`, `:13`; ejecución total de regresión consolidada en 24/25. No son prueba del binding. |
| PostgreSQL methodology vigente | FK método/domain, publication/expiry, permisos y grants exactos | Inspeccionadas 3 pruebas en `apps/backend/src/core-grc/methodologies.postgres.test.ts:14`, `:30`, `:46`; requieren PG aislado por líneas 8–10. No incluyen contextual EC. Resultados nuevos del root en 24/25. |
| CT-02 contextual y nueva enmienda | Todas las pruebas siguientes | **NOT_RUN_NOT_IMPLEMENTED_UNAPPROVED_CONTRACT**. |

Pruebas obligatorias del packet futuro: metodología wrong-domain/desconocida/unpublished; Definition incorrecta y owner correcto pero binding distinto; 0 y >1 binding; mode none/optional/required; scopes de otro tenant/Control/applicability; múltiples ControlScope sin selección; ausencia de Subject; effective_at en límites `[from,to)` y date offset equivalente; Definition/override futuros/expirados; flags tenant/object falsos; tipos/validation rules inválidos; Pack inexistente/no elegible/ambiguo; dos capas mismo nivel; `resolution_status` conflict aunque ID existente; hash inconsistente; layers de otra Definition/tenant; actor create sin read; Platform-only sin tenant; capability inactiva; scope/ObjectPolicy insuficiente; GET no INSERT/UPDATE/audit domain write; create idempotente/concurrente; retorno replay mismo payload y conflicto payload distinto; dos EC del mismo tenant con fechas/Definitions/hash distintos; layer ordinal repetido en resoluciones distintas; publicado inmutable; histórico retired legible por objeto; snapshots reproducibles después de expiry/supersession; negative tests de ausencia de raw UUID/JSON en operaciones comunes; i18n central español sin modificar códigos/free text.

La matriz futura no puede anunciar PASS por 509 unit/102 frontend/82 PG/448 GRC E2E/256 IAM subset históricos: esas cantidades corresponden a otra ejecución. El reporte 24/25 registra cantidades realmente ejecutadas en la pasada actual y diferencias; CT-02 nuevo sigue NOT_RUN aunque toda regresión existente pase.

## 10. Anexo de aprobación por cláusula y mínimo input legítimo

Las casillas están **sin firmar**. Cada owner registra aprobación/rechazo con identidad, rol ejercido, fecha y referencia de evidencia; `PENDING_REVIEW` es el estado actual de todos. La firma de PO de dirección CT-02 permanece válida; no se solicita de nuevo. Rechazar una cláusula conserva bloqueo de su dependencia, no autoriza al agente a reemplazarla.

| Cláusula | Decisión concreta preparada | Owner(s) requeridos | Acción que habilita tras publicación y autorización posterior |
|---|---|---|---|
| CFG-01 | [ ] Aprobar [ ] Rechazar conclusión `NO_BINDING_DEMONSTRATED` y ruptura en método→Definition, override metodológico tipado, Subject/fecha y EC snapshot. Para impugnar, aportar relación/version exactas y reproducibilidad, no sólo owner_domain. | Architecture, Configuration, Methodology, Backend | Elegir CFG-A sólo si una fuente existente demostrada reemplaza las rupturas. |
| CFG-02 | [ ] CFG-A [ ] CFG-B [ ] CFG-C [ ] CFG-D. Aprobar exactamente la opción seleccionada y su impacto §§6–7; ninguna opción seleccionada actualmente. | Architecture, Data Model, Domain Compliance/Controls, Configuration/Methodology | Reconciliar lógico/físico/executable de la opción elegida. No DDL por esta firma sola. |
| CFG-03 | [ ] Aprobar [ ] Rechazar binding singular CFG-B1 y mode none/optional/required sin defaults, typed FKs, identidad/version/intervalo no ambiguos e inmutabilidad. | Architecture, Data Model, Configuration, Methodology | Preparar propuesta física/contractual ejecutable revisable, sin datos inventados. |
| CFG-04 | [ ] Aprobar [ ] Rechazar applicability Subject / explicit ControlScope / tenant sólo cuando firmado, effective_at explícito UTC y ausencia/conflictos fail-closed. | Domain Compliance, Domain Controls/Assurance, Configuration, Backend | Publicar request context exacto y predicados elegibles. |
| CFG-05 | [ ] Declarar mode=none para baseline Compliance v1 y Controls v1 con vigencia firmada e impacto histórico revisado [ ] Exigir nuevas versiones/Definitions reales mediante release competente. | Domain Compliance, Domain Controls/Assurance, Methodology, Configuration | Cerrar dato fundamental sobre necesidad/ausencia de configuración. No asignar Definition inexistente; nueva Definition exige valores/version/type/validation/scopes publicados reales. |
| CFG-06 | [ ] Aprobar [ ] Rechazar hash/lineage/idempotencia/read RO/persistencia en command y conservación histórica de CFG-B3. | Architecture, Backend, Data Model, Security | Publicar algoritmo y command/response versionados; tests de reproducibilidad. |
| CFG-07 | [ ] Aprobar [ ] Rechazar reconciliación futura UQ del §5/CFG-B3 con inventario, migración incremental y no backfill arbitrario. | Data Model, Architecture, Backend | Elaborar migración futura para autorización separada; no ejecutar con este packet. |
| CFG-08 | [ ] Aprobar [ ] Rechazar schema/path contextual/códigos de §8, semántica de errores, permiso existente sin grants nuevos, capas minimizadas y ObjectPolicy. | Architecture, Backend, Configuration, Security | Publicación executable coordinada; implementación sólo después de autorización explícita. |
| CFG-09 | [ ] Aprobar [ ] Rechazar suite negativa §9 y política de no-publish con checks faltantes. | Backend, Security, QA | Validar candidato local posterior; QA/deploy requiere autorización separada. |

**Mínimo input que resta:** el equipo competente selecciona una opción técnica y firma (a) identidad/mode/version de binding o fuente existente demostrable, (b) Subject y fecha efectiva, (c) reconciliación física/lineage, (d) schema/errores/autorización minimizada. Para CFG-D/none no hacen falta inventar valores ni Definitions; sí una declaración Methodology/Domain explícita. Para optional/required hace falta una Definition real y publicada con sus values/type/constraints/intervalo, no una casilla vacía cubierta por UUID inventado. No se exigen otra cuenta Codex, credenciales, una firma del PO de las 14 CV ni aprobar genéricamente toda 6A.3.

## 11. Resultado machine-readable del paquete

```json
{
  "package": "P-CONFIG",
  "decision_id": "CT-02",
  "master_regent": "TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23",
  "functional_direction": "APPROVED_BY_PO_EXISTING_PERMISSION_ONLY_WITH_DEMONSTRATED_BINDING",
  "research_result": "NO_BINDING_DEMONSTRATED",
  "implementation": "BLOCKED_MISSING_CANONICAL_BINDING",
  "decision_packet": "READY_FOR_HUMAN_SIGNOFF",
  "contract_status": "PROPOSED_NOT_PUBLISHED",
  "existing_permission": "configuration.effective_configuration.read",
  "new_permissions": 0,
  "new_effective_grants": 0,
  "existing_detail": "PUBLISHED_DECLARATION_HANDLER_NOT_DEMONSTRATED",
  "proposed_context_route": "NOT_PUBLISHED_NOT_IMPLEMENTED",
  "physical_discrepancies": ["EFFECTIVE_CONFIGURATION_UNIQUE_TENANT_ONLY", "LAYER_ORDINAL_UNIQUE_GLOBAL"],
  "physical_discrepancy_runtime_scope": "READ_ONLY_EXISTING_ISOLATED_POSTGRES_NOT_QA",
  "options": ["CFG-A_EXISTING_BINDING_PROOF", "CFG-B_TYPED_SINGULAR_BINDING", "CFG-C_TYPED_MULTIPARAMETER_AMENDMENT", "CFG-D_EXPLICIT_NO_ADDITIONAL_CONFIGURATION"],
  "technical_owner_approvals": "PENDING_REVIEW_NO_SIGNATURE_ATTRIBUTED",
  "RECTOR_BASELINE_INTEGRITY": "PASS",
  "RECTOR_GATE": "BLOCKED",
  "STEP_6A3": "PARTIAL_BLOCKED",
  "CT02_new_contract_tests": "NOT_RUN_NOT_IMPLEMENTED_UNAPPROVED_CONTRACT",
  "DDL_executed": 0,
  "QA_mutations": 0,
  "backend_changes": 0,
  "frontend_changes": 0,
  "executable_contract_changes": 0,
  "commits": 0,
  "deploy": "NO",
  "STEP_6A4_started": false
}
```

Trazabilidad de la pasada: rector 19/23/29/30/45/46 → enmienda humana metodología existente → tablas/PK/FK/checks/seeds/permisos/rutas reales → ruptura documentada → alternativas/cláusulas firmables → reporte integral 24/result 25. El único archivo escrito por el investigador P-CONFIG es este documento 21.


## 2026-10-09 — supersesión acotada del detalle GET EC

La decisión humanaDR-STEP6A3-EC-DETAIL-R1-20261009 y aprobación declaradaArchitecture/Backend/Security & Privacy registradas en26 habilitan exclusivamente contrato ejecutable28v1/OpenAPI02. Se conserva íntegra la propuesta anterior como evidencia. Para GET effectiveConfigurationGet,21§8 es supersedido sólo por EC-R1.1..8 exactos SHA159c2fac9a5d2006900f49ee020521146f2e85baeec9233c8a8f07429bc28163: int64wire decimalstring, estado/nivel histórico boundedstring sin enumnuevo, ordenpresentaciónordinal/rawcode/override/layerID, estructural409 y metadatastatus200. El resto de21, discoverycontextual/binding/mode none/metodologías/CT02 queda pendiente, sin publicación implícita. Publicación local decontrato no significaPASS PostgreSQL/RLS/runtime.
