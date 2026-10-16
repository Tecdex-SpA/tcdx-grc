# 38 - Estado de resultados, ejecución de cálculo y suficiencia de datos

## 1. Propósito

Un valor numérico no basta para afirmar que un resultado es válido. TCDX GRC separa obligatoriamente tres planos que no pueden colapsarse en un único enum:

1. `calculation_status`: estado técnico de la ejecución;
2. `result_status`: validez/suficiencia del resultado producido;
3. `domain_conclusion`: conclusión propia del dominio cuando corresponda.

`0` es un valor y jamás sustituye un estado. `unknown`, `missing`, `not_tested` o `insufficient_evidence` no equivalen automáticamente a FAIL.

## 2. calculation_status canónico

Aplica a `CalculationRun` y ejecuciones equivalentes:

`pending | running | succeeded | failed | cancelled`

- `succeeded` significa que la ejecución terminó técnicamente; no implica que el resultado sea publicable.
- `failed` requiere error code/clase y auditabilidad; no convierte el valor previo en cero.
- una ejecución fallida no reemplaza un resultado oficial anterior.

## 3. result_status canónico

Aplica al envelope de todo resultado oficial o candidato a oficial:

- `valid`: inputs suficientes, frescos y sin conflicto material;
- `no_data`: no existen datos aplicables para el período/scope y la metodología no permite inferencia;
- `insufficient_data`: existen datos, pero faltan inputs obligatorios o calidad mínima distinta de coverage;
- `insufficient_coverage`: coverage inferior al mínimo contractual;
- `stale_source`: freshness excedida para uno o más inputs requeridos;
- `conflicting_sources`: existe conflicto material no resuelto;
- `dependency_pending`: dependencia requerida aún no dispone de resultado resoluble;
- `invalid_input`: input presente pero inválido según contrato/tipo/rango;
- `source_error`: una dependencia/fuente necesaria falló antes de entregar input válido;
- `calculation_error`: la ejecución alcanzó el motor de cálculo pero no pudo producir resultado válido;
- `not_applicable`: la metodología declara expresamente N/A;
- `superseded`: existe resultado oficial posterior que lo sustituye sin borrar historia.

`not_calculated` no es un `result_status` persistido: es un estado de proyección/API cuando no existe todavía un resultado para el scope solicitado. Se deriva de ausencia de resultado + ausencia de CalculationRun exitoso aplicable.

## 4. domain_conclusion

Las conclusiones pertenecen a cada bounded context y nunca se reutilizan como `result_status`.

Ejemplos:

- RequirementAssessment: `not_assessed | compliant | partially_compliant | non_compliant | not_applicable | insufficient_evidence`.
- Assurance: `effective | partially_effective | ineffective | not_tested | insufficient_evidence`.
- Risk appetite evaluation: `within_appetite | tolerated_breach | tolerance_breach`.

Un resultado puede, por ejemplo, tener `result_status=valid` y `domain_conclusion=ineffective`. También puede tener `result_status=insufficient_data` y no poseer `domain_conclusion` oficial.

## 5. Envelope contractual de resultado

Todo resultado publicado o retornado por API debe poder exponer, según aplique:

- `value` y unidad/escala;
- `result_status`;
- `domain_conclusion` nullable;
- período y effective time;
- metric/formula/methodology versions;
- coverage;
- freshness;
- Data Trust;
- CalculationRun;
- input/source lineage;
- EffectiveConfiguration utilizada;
- SourceResolution utilizada cuando hubo múltiples fuentes;
- supersession/correction reference cuando aplique.

## 6. Precedencia para determinar result_status

Una metodología puede endurecer condiciones, pero no puede redefinir los significados canónicos. Baseline determinístico cuando múltiples condiciones coexisten:

1. `invalid_input`;
2. `source_error`;
3. `calculation_error`;
4. `conflicting_sources`;
5. `dependency_pending`;
6. `insufficient_data`;
7. `insufficient_coverage`;
8. `stale_source`;
9. `no_data`;
10. `not_applicable`;
11. `valid`.

Esta lista no convierte automáticamente un componente inválido en status agregado; define la prioridad sólo cuando la metodología declara que ese componente bloquea el resultado agregado.

## 7. Propagación baseline en agregados

Todo agregado declara componentes `blocking`, `non_blocking` y minimum coverage. Si no publica una regla más específica:

- cualquier componente `blocking` con `invalid_input`, `source_error`, `calculation_error` o `conflicting_sources` impide resultado `valid`;
- `dependency_pending` en componente blocking produce `dependency_pending`;
- falta de required inputs produce `insufficient_data`;
- coverage bajo el threshold produce `insufficient_coverage`;
- freshness fuera de contrato en componente blocking produce `stale_source`;
- componentes `non_blocking` degradan Data Trust/presentación pero no cambian automáticamente el status principal;
- ningún agregado puede ocultar silenciosamente la cantidad/peso de componentes no válidos.

Compliance Score y Control Effectiveness usan además las reglas específicas de 17, 19 y 39.

## 8. Publicación y preview

Un resultado con `result_status != valid` no se presenta como resultado oficial válido. Puede exponerse como preview/diagnóstico sólo si la metodología lo permite y la UI/API etiqueta inequívocamente status, coverage y causa.

`superseded` permanece consultable históricamente y nunca se selecciona como current result.

## 9. Comparabilidad

Resultados sólo son comparables si metric/formula/methodology versions, población, escala, horizonte temporal y semántica de subject son compatibles. Cambios incompatibles producen `break_in_series` explícito en metadata; no se fuerzan comparaciones.

## 10. Guard conservador CFG-D candidato

Los comandos de assessment no aceptan result_status=valid declarado por el caller como prueba de suficiencia. Evalúan población, inputs, evidencia, cobertura, procedencia, conflictos, recencia sólo si hay umbral publicado y calidad sólo si hay criterio publicado, según metodología/version. Se conserva el orden de precedencia existente para componentes blocking; ausencia de dato no equivale a cero. Sin inventario publicado de criterios requeridos para una v1, el resultado nuevo queda insufficient_data/dependency_pending y no valid oficial. Historia inmutable; EC NULL no implica none.

Fuente exacta del delta: `docs/governance/amendments/STEP_6A3_C04W_CFGD_20261014/CONTRACT_PACKET_20261015.md`; SHA-256 `6b87812823472d56a89622eca8119b0cd56606f2f21d635dd84bf903896ba7f2`. Esta copia candidata no es autoridad activa antes del gate 47.


## STEP_6A3 — candidata de incorporación inicial de fuente v1.11

`STATUS=DRAFT_NOT_EFFECTIVE; HUMAN_EXACT_BYTES_REVIEW=PENDING`. Baseline candidata TCDX_GRC_MASTER_REGENT_BASELINE_v1.11_2026-10-15, predecesora TCDX_GRC_MASTER_REGENT_BASELINE_v1.10_2026-10-15. Diseño PO aprobado por SHA `1a133d60e576208eefc90d68ff39df903df829f3c9ab1b3c51fa06d8c826913b`; constancia `docs/governance/amendments/STEP_6A3_INITIAL_SOURCE_20261015/PO_DESIGN_APPROVAL_RECEIPT_20261015.json`. Esta sección sólo tendrá efecto después de publicación conforme47/49 y gates físico/ejecutable; no autoriza operación QA ni deploy por sí sola.

EvidenceVersion ligada a aplicabilidad no publicada y usada como fuente pendiente no puede consumirse como evidencia ordinaria en resultados, controles/requisitos ni evaluaciones. Su aprobación documental permite únicamente la vinculación de fuente por el custodio; no es valid oficial ni publica metodología. Publicar posteriormente la aplicabilidad no crea EvidenceLinks de negocio ni elimina las comprobaciones ordinarias. Se preservan las metodologíasv1, CFG-D conservador, EC opcional sin none y todos los resultados históricos.
