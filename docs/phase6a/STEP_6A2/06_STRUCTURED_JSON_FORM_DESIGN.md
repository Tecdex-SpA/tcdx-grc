# Editores estructurados para tres campos JSON

Fecha: 2026-10-08. Autoridad: TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23. HEAD: main / 6af66387aa03fa185ef139584de07700f247b903. Alcance: diseño documental, sin implementación.

Fuentes: `docs/phase6a/STEP_6A1/05_JSON_AND_VOCABULARY_AUDIT.md`, CSV histórico y schemas exactos en `docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml`. No textarea/editor JSON para usuario empresarial; JSON sólo serialización interna efímera del contrato existente.

## Elementos de declaración de aplicabilidad — FORM-08 / F-0050

Operación: soaCreate; POST /api/v1/statements-of-applicability; permiso compliance.soa.create. Schema de fila SoaItemCreateInput; required: reference_control_version_id, applicability_decision, justification, implementation_state.

| FIELD_ID | VISIBLE_MEMBER | TYPE | REQUIREDNESS | UI | VALIDATION |
| --- | --- | --- | --- | --- | --- |
| F-0340 | items[].reference_control_version_id | UuidV7 | required within item | Selector/contexto de 03 | schema=UuidV7; Reference version; authorized global list then control detail |
| F-0341 | items[].applicability_decision | "string" | required within item | Fuente VOC de 05 pendiente/cerrada según fila | minLength=1; maxLength=32 |
| F-0342 | items[].justification | "string" | required within item | Entrada empresarial etiquetada: Justification for StatementOfApplicability | minLength=1; Do not weaken business nonempty/conditional validation |
| F-0343 | items[].implementation_state | "string" | required within item | Fuente VOC de 05 pendiente/cerrada según fila | minLength=1; maxLength=32 |
| F-0344 | items[].tenant_control_id | UuidV7 | conditional: both omitted or supplied as compatible pair | Selector/contexto de 03 | schema=UuidV7; TENANT_OWNED only; pair with compatible tenant version |
| F-0345 | items[].tenant_control_version_id | UuidV7 | conditional: both omitted or supplied as compatible pair | Selector/contexto de 03 | schema=UuidV7; Pair with tenant_control_id; same parent and tenant |

Editor: tabla repetible con selector de control de referencia/version, decisión, justificación, estado de implementación y sección opcional control tenant + versión. Header muestra framework/versión seleccionado. items obligatorio min1; row add/remove/keyboard con confirmación antes de guardar. Par tenant ambos o ninguno y control/version compatibles; no derivar SoA applicability de RequirementApplicability. U-VOC item decision/state debe cerrar antes del editor funcional. Serializar items[] con los seis miembros existentes, omitir opcionales ausentes; no enviar statement_of_applicability_id generado por atomic create ni crear items aparte.

Validación/error: additionalProperties=false; UUID internos validados por picker y API; límites de strings/números/UTC del schema; errores FIELD_ID/fila accesibles e indexados, conservar entradas al error. API revalida tenant/entitlement/ObjectPolicy y contexto, no confiar en estado del editor. On success releer parent/child projection; no tabla paralela. Tests: roundtrip UI→payload por schema, minItems/required/omitidos, fila inválida, target cruzado, cambio parent/version, combinación incompatible, field_errors por fila, teclado/foco/mobile y comando audit/idempotency/concurrency.

## Relaciones que sustenta la evidencia — FORM-23 / F-0221

Operación: evidenceCreate; POST /api/v1/evidence; permiso evidence.evidence.create. Schema de fila EvidenceLinkCreateInput; required: .

| FIELD_ID | VISIBLE_MEMBER | TYPE | REQUIREDNESS | UI | VALIDATION |
| --- | --- | --- | --- | --- | --- |
| F-0346 | links[].requirement_id | UuidV7 | conditional: exactly one of six target fields per link | Selector/contexto de 03 | schema=UuidV7; FrameworkVersion; enabled pack; query/unit/cursor; currently no lifecycle/effective filter |
| F-0347 | links[].control_id | UuidV7 | conditional: exactly one of six target fields per link | Selector/contexto de 03 | schema=UuidV7; Selected tenant instance for assessments/tests; global references not tenant implementation |
| F-0348 | links[].control_version_id | UuidV7 | conditional: exactly one of six target fields per link | Selector/contexto de 03 | schema=UuidV7; Child of selected Control; no free version UUID entry |
| F-0349 | links[].requirement_assessment_id | UuidV7 | conditional: exactly one of six target fields per link | Selector/contexto de 03 | schema=UuidV7; List/detail exist; label composition required |
| F-0350 | links[].control_assessment_id | UuidV7 | conditional: exactly one of six target fields per link | Selector/contexto de 03 | schema=UuidV7; List/detail exist; label composition required |
| F-0351 | links[].assurance_test_id | UuidV7 | conditional: exactly one of six target fields per link | Selector/contexto de 03 | schema=UuidV7; List/detail exist; state/cursor; parent navigation missing |
| F-0352 | links[].claim | "string" | optional within item | Entrada empresarial etiquetada: Claim for Evidence | minLength=1 |
| F-0353 | links[].effective_from | UtcTimestamp | optional within item | Entrada empresarial etiquetada: Vigente desde for Evidence | schema=UtcTimestamp |
| F-0354 | links[].effective_to | UtcTimestamp | optional within item | Entrada empresarial etiquetada: Vigente hasta for Evidence | schema=UtcTimestamp |

Editor: filas con elección empresarial del target permitido (Requirement, Control, ControlVersion, RequirementAssessment, ControlAssessment, AssuranceTest), seguida de picker específico y claim/fechas opcionales. Familia visual sólo deriva de las seis FK del schema, no catálogo persistente ni target_type enviado. Exactamente una FK por fila; array requerido min1. Contexto puede prellenar una fila visible confirmable; no crear links escondidos. ControlVersion global solo no demuestra implementación tenant. Serializar cada fila al miembro tipado exacto; limpiar anterior FK al cambiar familia. No document_id/version inventados.

Validación/error: additionalProperties=false; UUID internos validados por picker y API; límites de strings/números/UTC del schema; errores FIELD_ID/fila accesibles e indexados, conservar entradas al error. API revalida tenant/entitlement/ObjectPolicy y contexto, no confiar en estado del editor. On success releer parent/child projection; no tabla paralela. Tests: roundtrip UI→payload por schema, minItems/required/omitidos, fila inválida, target cruzado, cambio parent/version, combinación incompatible, field_errors por fila, teclado/foco/mobile y comando audit/idempotency/concurrency.

## Muestras de la prueba — FORM-18 / F-0159

Operación: assuranceTestExecute; POST /api/v1/assurance-tests/{id}:execute; permiso controls.assurance_test.execute. Schema de fila AssuranceSampleExecuteInput; required: sample_code, sample_count, selection_method, result_status.

| FIELD_ID | VISIBLE_MEMBER | TYPE | REQUIREDNESS | UI | VALIDATION |
| --- | --- | --- | --- | --- | --- |
| F-0355 | samples[].sample_code | "string" | required within item | Entrada empresarial etiquetada: Sample code for AssuranceTest | minLength=1; maxLength=128 |
| F-0356 | samples[].population_count | "integer" int64 | optional within item | Entrada empresarial etiquetada: Population count for AssuranceTest | minimum=0; format="int64" |
| F-0357 | samples[].sample_count | "integer" int64 | required within item | Entrada empresarial etiquetada: Sample count for AssuranceTest | minimum=0; format="int64" |
| F-0358 | samples[].selection_method | "string" | required within item | Fuente VOC de 05 pendiente/cerrada según fila | minLength=1; maxLength=64 |
| F-0359 | samples[].sample_period_start | UtcTimestamp | optional within item | Entrada empresarial etiquetada: Sample period start for AssuranceTest | schema=UtcTimestamp |
| F-0360 | samples[].sample_period_end | UtcTimestamp | optional within item | Entrada empresarial etiquetada: Sample period end for AssuranceTest | schema=UtcTimestamp |
| F-0361 | samples[].result_status | ResultStatus | required within item | Fuente VOC de 05 pendiente/cerrada según fila | schema=ResultStatus |

Editor: sección Muestras opcional que puede omitirse; row con código empresarial, población opcional, tamaño requerido, método de selección, período opcional y ResultStatus. Contadores enteros >=0, sample_count <= population_count cuando existe población, límites int64; timestamps UTC/intervalos crecientes conforme al schema. No autogeneración de muestra ni método inventado. Serializar samples[] sólo si usuario decide registrarlo; request sin samples conserva contrato optional, con domain_conclusion optional y metodología condicional respetadas.

Validación/error: additionalProperties=false; UUID internos validados por picker y API; límites de strings/números/UTC del schema; errores FIELD_ID/fila accesibles e indexados, conservar entradas al error. API revalida tenant/entitlement/ObjectPolicy y contexto, no confiar en estado del editor. On success releer parent/child projection; no tabla paralela. Tests: roundtrip UI→payload por schema, minItems/required/omitidos, fila inválida, target cruzado, cambio parent/version, combinación incompatible, field_errors por fila, teclado/foco/mobile y comando audit/idempotency/concurrency.
