# 44 — Contrato de estructura normativa, requisitos y controles

## 1. Propósito

Separar de forma inequívoca la estructura editorial de una fuente normativa, las obligaciones evaluables y los mecanismos de control. Este contrato aplica a normas ISO, leyes, regulación sectorial, contratos y políticas internas sin crear modelos paralelos por tipo de fuente.

## 2. Separación canónica

Los siguientes conceptos no son sinónimos:

- `NormativeUnit`: unidad estructural de una `FrameworkVersion`, como capítulo, cláusula, subcláusula, anexo, artículo, párrafo, numeral o disposición transitoria. Organiza y permite navegar la fuente; no contiene estados de cumplimiento tenant.
- `Requirement`: obligación atómica y evaluable identificada dentro de una unidad normativa. Es el único objeto contra el que se decide applicability y se registra `RequirementAssessment`.
- `Control`: mecanismo de gobierno u operación que previene, detecta, corrige, dirige, mitiga o demuestra tratamiento/cumplimiento. No es una cláusula ni un resultado de evaluación.
- `Issue`: desviación, gap, hallazgo, no conformidad o excepción identificada al evaluar. Un Requirement nunca se convierte en Issue ni almacena la brecha.
- `Action`: trabajo de remediación derivado de un Issue.

## 3. Cadena normativa rectora

```text
RegulatorySource
→ RegulatoryPackVersion
→ FrameworkVersion
→ NormativeUnit hierarchy
→ Requirement
→ RequirementApplicability
→ RequirementAssessment
→ Issue
→ Action
→ Evidence
→ Verification
```

Los controles se relacionan transversalmente:

```text
Requirement N:M Control mediante RequirementControlMapping
NormativeUnit N:M ControlVersion mediante NormativeUnitControlMapping
Control → ControlVersion → ControlAssessment / AssuranceTest → Evidence
```

## 4. NormativeUnit

`NormativeUnit` pertenece a Regulatory & Compliance y hereda ownership de su FrameworkVersion: GLOBAL_REFERENCE para fuentes globales/licenciadas, PLATFORM_CONTROL para baselines TCDX y TENANT_OWNED para contratos o políticas privadas del tenant. Nunca es TENANT_DERIVED.

Atributos contractuales mínimos:

- `normative_unit_id`: UUIDv7 inmutable;
- `tenant_id` obligatorio sólo cuando la FrameworkVersion es TENANT_OWNED;
- `framework_version_id`;
- `parent_normative_unit_id` nullable y dentro de la misma FrameworkVersion;
- `unit_type`: `section | chapter | clause | subclause | annex | article | paragraph | numeral | transitory_provision | schedule | control_group | other`;
- `unit_code` y `title` conforme a la fuente;
- `display_order` determinístico entre siblings;
- `source_locator` estable;
- `content_language` y contenido licenciado o `licensed_content_ref` según la política de almacenamiento/acceso;
- `effective_from`, `effective_to` cuando la fuente lo defina;
- `content_hash`, provenance y clasificación/política de licencia;
- lifecycle/version conforme a FrameworkVersion.

Business key: `framework_version_id + source_locator`; el tenant queda implícito y restringido por la FrameworkVersion. La combinación `framework_version_id + parent_normative_unit_id + unit_code` debe ser única cuando `unit_code` exista.

La jerarquía debe impedir ciclos y referencias entre FrameworkVersion distintas. Una nueva edición crea nuevas identidades/versiones y mappings de transición; no reescribe la estructura publicada anterior.

`NormativeUnit` no posee `domain_conclusion`, `result_status`, lifecycle tenant ni evidencia de cumplimiento directa. La vista por cláusula agrega requisitos, controles y evidencias descendientes sin convertir la cláusula en assessment.

## 5. Requirement

`Requirement` pertenece a Regulatory & Compliance, hereda ownership/tenant de su FrameworkVersion y representa una obligación atómica evaluable.

Atributos contractuales mínimos:

- `requirement_id`: UUIDv7 inmutable;
- `tenant_id` obligatorio sólo cuando la FrameworkVersion es TENANT_OWNED;
- `framework_version_id` y `normative_unit_id` obligatorios y coherentes;
- `requirement_code` estable dentro de FrameworkVersion;
- `requirement_kind`: `shall | legal_obligation | contractual_obligation | policy_mandate | other`;
- `statement_locator`, `content_language`, statement licenciado o `licensed_content_ref`, y content hash/provenance;
- `is_mandatory`;
- applicability guidance y evidence expectations versionadas;
- effective interval y supersession reference.

Business key: `framework_version_id + requirement_code`; queda global o tenant-scoped según la FrameworkVersion. Una NormativeUnit puede contener cero, uno o muchos Requirements; cada Requirement posee exactamente una NormativeUnit primaria. Cross-references adicionales no cambian su owner ni identidad.

Cuando la fuente no asigna un código distinto a cada obligación dentro de una unidad, el importador genera un `requirement_code` estable y determinístico desde `source_locator + statement ordinal`, conserva el locator original y exige revisión humana antes de publicar. Una nueva extracción no puede renumerar silenciosamente Requirements publicados.

El texto licenciado se almacena y expone sólo conforme a la licencia. IA no reconstruye contenido protegido ausente.

## 6. Controles de referencia y controles tenant

`Control/ControlVersion` conserva una sola semántica con origen y ownership explícitos:

- `regulatory_reference`: control publicado por una fuente, GLOBAL_REFERENCE;
- `tcdx_baseline`: control base creado y gobernado por TCDX, PLATFORM_CONTROL;
- `tenant_instantiated`: instancia tenant basada en un ControlVersion global, TENANT_OWNED;
- `tenant_defined`: control creado por el tenant, TENANT_OWNED.

Un control de referencia no significa que el tenant lo haya implementado. La implementación requiere un Control tenant-owned, owner, scope, frecuencia, método de ejecución/verificación, evidencia esperada y lifecycle.

`based_on_control_version_id` enlaza una instancia tenant con su referencia sin mutar el control global.

## 7. Mappings

### RequirementControlMapping

Relación M:N versionada entre Requirement y una versión concreta de Control. Declara:

- `mapping_type`: `satisfies | supports | mitigates | detects | evidences`;
- coverage contribution y rationale;
- source/provenance;
- effective interval;
- status y aprobación;
- global o tenant ownership.

El mapping no declara cumplimiento por sí mismo. Un Requirement puede requerir varios controles y una ControlVersion puede contribuir a varios Requirements o FrameworkVersion. Referenciar la versión concreta preserva reproducibilidad histórica.

### NormativeUnitControlMapping

Relaciona una unidad normativa con un ControlVersion de referencia cuando la fuente contiene un catálogo de controles, por ejemplo un anexo. Evita fabricar Requirements artificiales para representar controles que la fuente no formula como obligaciones.

Este mapping describe ubicación/provenance editorial; no sustituye `RequirementControlMapping` ni demuestra implementación tenant.

## 8. Assessments, gaps y evidencia

- Applicability y compliance outcome existen sólo en `RequirementApplicability` y `RequirementAssessment`.
- Gap, non-conformity, finding y exception existen como `Issue` con `IssueOrigin` tipado. Orígenes permitidos: RequirementAssessment, ControlAssessment, AssuranceTest, AuditTest, Risk, Incident o SupplierAssessment. No existe origen genérico sin FK/integridad.
- Evidence se vincula mediante `EvidenceLink` a Requirement, Control, ControlVersion, RequirementAssessment, ControlAssessment o AssuranceTest. `Control` representa la implementación tenant; `ControlVersion` representa la versión de referencia o concreta según el caso. Evidence que pretende demostrar implementación de un tenant debe enlazar al Control tenant correspondiente. No se vincula directamente a NormativeUnit como prueba de cumplimiento.
- La consulta por NormativeUnit recorre descendientes y muestra Requirements, mappings, controles tenant, evidencia vigente, assessments, Issues y Actions con lineage completo.
- KPI/KRI/KCI/KQI son MetricDefinition/MetricMeasurement relacionados; no atributos libres incrustados en Control.
- Tareas de remediación son Action; no se modelan como Control.

`RequirementApplicability` decide si una obligación aplica a un tenant/scope. El scope es tenant-wide o un `Subject` del mismo tenant; `scope_subject_id=NULL` significa tenant-wide. Si una obligación debe evaluarse en varios Subjects, existen applicabilities separadas por scope, versionables/effective-dated. No se usa `organization_id` como sustituto universal de scope ni referencias `(type,id)` genéricas. Para normas que exigen Statement of Applicability, `StatementOfApplicability` posee líneas `StatementOfApplicabilityItem` tenant-owned. Cada línea referencia un ControlVersion de referencia, decisión de aplicabilidad, justificación, implementation state y, cuando exista, el Control/ControlVersion tenant que lo implementa. RequirementApplicability y StatementOfApplicabilityItem no se reemplazan entre sí.

## 9. Cobertura y publicación

Un `RegulatoryCoverageManifest` contabiliza separadamente:

- normative units esperadas/importadas/revisadas;
- requirements esperados/importados/revisados;
- reference controls esperados/importados/revisados cuando existan;
- relaciones padre-hijo válidas;
- mappings editoriales y de cumplimiento revisados.

`coverage_percent=100` requiere completar cada población aplicable; no se permite compensar unidades faltantes con requisitos o controles adicionales.

## 10. Crosswalks tipados

`FrameworkCrosswalk` es la cabecera versionada que relaciona una FrameworkVersion fuente con una destino. Sus correspondencias usan entidades separadas:

- `NormativeUnitCrosswalkMapping` para estructura editorial;
- `RequirementCrosswalkMapping` para obligaciones evaluables;
- `ControlCrosswalkMapping` para versiones de controles.

Cada mapping declara source FK, target FK, `relationship_type=equivalent|partially_equivalent|overlaps|supports|supersedes|no_match`, dirección, rationale, confidence, provenance, reviewer, status y effective/version metadata. Los source/target deben pertenecer a las FrameworkVersion declaradas por la cabecera. Para `no_match`, target FK es NULL y la ausencia queda justificada; para cualquier otro relationship_type ambos FKs son obligatorios.

Un crosswalk no fusiona identidades, no copia assessments entre ediciones y no implica cumplimiento automático. Las relaciones críticas usan FKs tipadas; se prohíbe un par genérico `(object_type, object_id)` sin integridad.

## 11. Invariantes físicos obligatorios

- No existe columna o entidad genérica que mezcle Clause y Requirement.
- `NormativeUnit` y `Requirement` tienen IDs y business keys distintos.
- Toda Requirement referencia una NormativeUnit de la misma FrameworkVersion.
- NormativeUnit y Requirement heredan ownership/tenant de FrameworkVersion y no admiten relaciones cross-tenant.
- Una NormativeUnit estructural no recibe assessment tenant.
- `RequirementControlMapping` y `NormativeUnitControlMapping` son relaciones distintas.
- Controles globales y tenant conservan ownership e identidad separados.
- No existe copia tenant de texto normativo global salvo snapshot/citación autorizada con provenance.
- Los dashboards por cláusula son proyecciones derivadas y reconstruibles.
- Ningún cambio de edición modifica contenido publicado ni historia de assessments.
- Crosswalks tipados no mezclan unidades, Requirements ni ControlVersion y preservan dirección/provenance.
- RequirementApplicability y StatementOfApplicabilityItem permanecen separados y tenant-scoped.
- RequirementApplicability conserva `tenant_id` como ownership y usa `scope_subject_id` opcional sólo para alcance; el Subject debe pertenecer al mismo tenant.
- EvidenceLink distingue Control tenant de ControlVersion y conserva FKs tipadas.
- EvidenceRequest sólo puede targetear Requirement, Control, RequirementAssessment, ControlAssessment o AssuranceTest mediante integridad referencial verificable.
- IssueOrigin sólo puede originarse en RequirementAssessment, ControlAssessment, AssuranceTest, AuditTest, Risk, Incident o SupplierAssessment mediante integridad referencial verificable.

## 12. Gate

El modelo físico debe demostrar estas entidades, relaciones, ownership, claves, restricciones de jerarquía, versionado, licencia y trazabilidad. Cualquier diseño que use Requirement indistintamente como cláusula, obligación y gap produce:

`PHYSICAL_DATA_MODEL_REVIEW=FAIL`.
