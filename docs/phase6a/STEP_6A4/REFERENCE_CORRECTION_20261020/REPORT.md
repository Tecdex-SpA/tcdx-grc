# STEP6A4 — corrección focalizada P3/P5

Fecha: 2026-10-20. Alcance autorizado: diagnóstico, frontend de Solicitar evidencia y Registrar hallazgo, regresión focalizada, evidencia y preparación de aceptación. La instrucción posterior del PO reserva las pruebas de navegador restantes al humano. No se vuelve a ejecutar navegador después de esa instrucción.

## Estado y autoridad

```text
STEP6A4_P3_REFERENCE_DIAGNOSIS=PASS
STEP6A4_P5_REFERENCE_DIAGNOSIS=PASS
STEP6A4_FRONTEND_CORRECTION=PASS_LOCAL
STEP6A4_FOCUSED_TESTS=PASS_LOCAL
RECTOR_GATE=PASS
STEP6A4_QA_DEPLOYMENT=PASS_PREVIOUSLY_CONFIRMED
STEP6A4_QA_VERIFICATION=BLOCKED
STEP6A4_HUMAN_ACCEPTANCE=PENDING
STEP6A4_CLOSURE=BLOCKED
HUMAN_UI_REVIEW=PENDING
```

Baseline efectiva: `TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16`, ID/status ACTIVE y `docs/rector/ACTIVE_ACTIVATION.json`, manifiesto `cdd0165364e50dee176c8a8ec8cf7c1f55a5905f4febd91c63459583c9faec85`. Se verificó su publicación con el Rector Governance Gate antes y después. Los textos históricos de candidata en 46/43/49 y los checkpoints antiguos impresos por el script no reemplazan el acto de activación ni la continuidad vigente. No se modifican esos documentos. STEP6A3_CLOSURE=PASS se reutiliza; Fase 6A continúa en STEP6A4 y no se inicia STEP6A5/6A6.

Fuentes: rector46/06/13/26/43/45/49; cardinalidades rector24 §8, 30 relaciones Evidence/Remediation, 33 Evidence/Issues y 44 §8/11; contrato UX rector27; OpenAPI02 vigente; lecturas publicadas29; backlog STEP6A2 T-FEVD/T-FACT/T-VALID y gate UX_BUSINESS_FORMS; manifiesto visual y sus seis contratos activos v1.0, imagen aprobada y marca local. Se preservan tokens, branding, lenguaje de componentes, CSS y baseline visual. No se promueve la candidata visual.

Continuidad reutilizada: `../FINAL_CONTINUITY_REPORT_20261020.md`, informe de implementación, despliegue previo y escenarios sellados. La aceptación de los seis grupos con dos observaciones abiertas y FORM-05=PASS se recibe de la instrucción PO actual, sin repetir esa operación. El PASS de despliegue anterior corresponde a su imagen anterior y **no publica esta corrección**.

## Diagnóstico contractual

| Aspecto | P3 — Solicitar evidencia | P5 — Registrar hallazgo |
| --- | --- | --- |
| Formulario/operación | FORM-21, `evidenceRequestCreate` | FORM-33, `issueCreate` |
| Request | POST `/api/v1/evidence-requests`, `EvidenceRequestCreateRequest` | POST `/api/v1/issues`, `IssueCreateRequest` |
| OpenAPI fuente | `docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml`, operación línea 2207, esquema línea 7006 | Mismo archivo, operación línea 2420, esquema línea 7110 |
| Grupo exclusivo | `requirement_id`, `control_id`, `requirement_assessment_id`, `control_assessment_id`, `assurance_test_id` | `requirement_assessment_id`, `control_assessment_id`, `assurance_test_id` |
| Cardinalidad | Exactamente una FK presente entre cinco | Exactamente una FK presente entre tres |
| Restricción | `oneOf`, cada rama exige una FK; cero ramas o más de una rama coincidente fallan | Igual, tres ramas. No es la cardinalidad total de todos los IssueOrigin de un Issue histórico, sino la de este comando de creación |
| Otros obligatorios | `request_code` | `issue_code`, `issue_kind`, `title`, `description`, `severity`, `priority`, `origin_role` |
| Opcionales | `assigned_membership_id`, `due_at` | `business_owner_subject_id`, `due_date` |
| Dependencias | Marco normativo → requisito; objeto elegido → responsables elegibles | Los assessments y pruebas se seleccionan desde lectores autorizados existentes; no se exige agregar su Requirement/Control como otra FK |
| Contexto auxiliar | Marco filtra requisitos, no se serializa. No hay `control_version_id` en este request | `origin_role=trigger` describe la relación y es obligatorio; no es otra referencia. No hay versiones ni FKs adicionales auxiliares admitidas |
| Payload cerrado | `additionalProperties=false`; UUIDv7 y timestamp publicados | `additionalProperties=false`; UUIDv7, fecha civil y vocabularios publicados |
| Autoridad final | Backend valida existencia, visibilidad, tenant, permiso y scope | Backend valida origen tipado, pertenencia, autorización y reglas existentes |

No hay `anyOf` alternativo ni permiso de registrar múltiples referencias por estos comandos. Los campos opcionales no sustituyen el origen obligatorio. Las versiones que puedan verse en otros formularios de evidencia no son campos de estos requests.

## Causa raíz demostrada y límite del incidente original

**P3:** `CreateDrawer` mostraba los cinco destinos simultáneamente con `BusinessFields`. `requiredField` solo leía `required` de nivel superior para estos campos, por lo que cada destino aparecía como «Opcional» sin explicar el grupo exclusivo. Cada callback añadía su FK independiente a `form`, conservando las demás. `Object.fromEntries` omitía valores vacíos, pero enviaría todas las referencias no vacías. El responsable quedaba deshabilitado con cero o varias referencias sin explicar cómo corregir el grupo. El marco normativo ya era contexto local y el cambio de marco ya limpiaba el requisito; no se demostró una FK de marco indebida en el payload.

**P5:** los tres orígenes independientes repetían el mismo problema de obligatoriedad conjunta y exclusión, sin limpiar el origen anterior. `origin_role`, propietario y fecha eran campos distintos; no convierten una combinación de orígenes en válida.

**Error compartido:** el validador generado rechazaba correctamente cero o varias referencias; `validateForm` convertía el `oneOf` en `_form: Selecciona exactamente un objeto de referencia`. El resumen buscaba `[data-field="_form"]`, que no existía, por lo que su enlace no podía enfocar un selector. El error tampoco aparecía junto al grupo responsable.

Clasificación en ambos: `UX_GUIDANCE_DEFECT` y `DEFECT_FRONTEND` en presentación, limpieza y enlace de errores. `INVALID_INPUT_CORRECTLY_REJECTED` para cero y múltiples referencias, reproducido contra el schema publicado. `VALID_INPUT_REJECTED=NOT_DEMONSTRATED`: las ocho alternativas válidas pasan sin relajar validación. `CONTRACT_CONFLICT=NONE` para esta corrección. No hay captura del estado/payload concreto de la sesión humana original: no se puede afirmar si aquella sesión tenía cero o varias referencias, aunque ambas condiciones producen exactamente el mensaje reportado. Esta limitación no impide demostrar y corregir los defectos frontend descritos.

## Corrección y archivos

| Archivo | Delta de esta tarea |
| --- | --- |
| `apps/frontend/src/business-origin-fields.tsx` (nuevo) | Contexto de edición «Tipo de origen» y único selector activo; explicación de filtros, rol y opcionales; reutiliza lectores autorizados |
| `apps/frontend/src/business-forms.ts` | Proyecta alternativas del `oneOf` ya generado, limpia FKs al cambiar origen y responsable dependiente, obligatoriedad del origen visible y error `_reference` accionable |
| `apps/frontend/src/business-form-fields.tsx` | Slot opcional para insertar el grupo de origen dentro de relaciones; comportamiento de los demás formularios conservado |
| `apps/frontend/src/core-grc.tsx` | Conecta ese grupo exclusivamente a los dos schemas; retira solo sus FKs del render independiente |
| `apps/frontend/src/business-origin-fields.test.tsx` (nuevo) | Contrato original, ocho orígenes, todas las parejas incompatibles, opcionales, limpieza, payload y corrección de errores |
| `e2e/step6a4-reference-correction.spec.ts` (nuevo) | Regresión local simulada de ambos formularios; retenida como fuente de evidencia, sin nueva ejecución tras la instrucción PO |
| `e2e/step6a4-business-forms.spec.ts` | Adaptación mínima del helper para elegir tipo antes de su FK; no se ejecutó la batería completa ni se sobrescribieron sus capturas selladas |
| `docs/governance/MASTER_EXECUTION_STATUS.md` | Append de continuidad de esta corrección, preservando historia |
| Este expediente | Reporte, guía manual, recibos, capturas locales previas a la instrucción posterior, hashes y deltas |

El tipo es estado efímero de edición; no añade propiedades al request, entidades, catálogos ni reglas. Cambiar tipo borra todas las FKs del grupo y, en solicitud, el responsable dependiente. Cambiar el registro de solicitud también limpia ese responsable. Otros opcionales se conservan. La validación no sanea silenciosamente un payload inválido: las combinaciones incompatibles siguen rechazadas por el validador publicado y la API. Los errores se muestran junto al origen y el enlace del resumen lleva al selector.

## Pruebas y evidencia

| Verificación | Resultado / recibo en `evidence/` |
| --- | --- |
| Vitest focalizado, business-origin-fields/business-forms/core-grc/reference-selectors | 4 archivos, **97 pruebas PASS**, `unit.txt` |
| Typecheck y lint frontend | PASS, `typecheck.txt`, `lint.txt` |
| Build frontend | PASS, `build.txt`; aviso existente de chunk >500 kB conservado, sin ampliar alcance con optimización |
| Generación contractual `--check` | PASS, `contract-assets.txt` |
| Generación de assets de formularios `--check` | PASS, `form-assets.txt`; ningún generado ni OpenAPI cambió |
| Rector Governance Gate previo/final | PASS, `rector-pre.txt`, `rector-final.txt` |
| Git whitespace e integridad de entrada | PASS, `whitespace.txt`, `INTEGRITY_RESULT.json` |
| Navegador local simulado, antes de instrucción posterior PO | **8 PASS**, escritorio 1536 y estrecho 390 px; `browser-retry.txt`, FORM-21/33 PNG y payloads JSON. No demuestra persistencia ni E2E QA |

Cobertura A/B: sin referencia, cada alternativa válida, todas las parejas incompatibles, cambio de tipo/origen, cambio de marco/requisito dependiente, limpieza de responsable, opcionales presentes/omitidos, formato inválido, propiedades no publicadas, mensaje junto al grupo, enlace/foco, retirada del error y payload exclusivo. La UI evita acumular orígenes; las combinaciones incompatibles se prueban directamente en validadores, sin habilitar UI inválida ni comandos reales. El navegador previo incluyó lecturas denegadas que impiden selección/envío y comprobaciones de nombres accesibles y desbordamiento. La revisión visual/responsive humana sigue pendiente.

Se conserva `initial-unit-fixture-failure.txt`: el primer fixture nuevo usó severity/rol no publicados y fallaron cuatro assertions; se corrigió el **fixture** a `minor/trigger`, sin alterar contrato ni validación. La ejecución final pasó 97/97. El primer intento de navegador fue impedido por EPERM del sandbox al escuchar 127.0.0.1:4173 (`browser.txt`); el reintento autorizado terminó antes del nuevo mensaje PO. No se ejecutó más navegador después. No se repitieron pruebas selladas de STEP6A3, FORM-05 ni la batería completa STEP6A4.

## Integridad y capas

Entrada: 3992 archivos, rama `fix/step6a3-v112-continuity-20261016`, HEAD `4a275264a7522031e62bf09f598c9d56e21d25e0`, índice vacío. El worktree ya tenía cambios extensos ajenos a esta tarea. `ENTRY_PRESERVATION.json` conserva sus hashes; `entry-sources/` contiene los cuatro preimages de código reconstruidos y verificados contra esos hashes, y `deltas/` los cambios exactos de esta tarea. El verificador falla si cambia un archivo de entrada fuera de los cinco previstos (cuatro código/test y append de status), se elimina otro, cambia HEAD/rama/índice o se sobrescribe evidencia sellada.

Capas cambiadas en esta tarea: **frontend y documentación/pruebas**. PostgreSQL, esquemas/migraciones, contratos ejecutables/OpenAPI, backend, IAM/RBAC/SoD, metodologías, infraestructura y contratos de despliegue: **sin cambios**. Sin SQL, SSH a QA, escrituras de negocio, datos ficticios en QA, nuevos despliegues, commit/push/merge ni cambio de rama. Los datos simulados solo existen en pruebas locales. `ARTIFACT_SHA256.json` sella los artefactos nuevos; no se toca ninguna evidencia sellada previa.

## Observaciones de producto posteriores — sin implementación

**Información explicativa de unidades normativas:** necesidad PO de comprender qué establece una unidad, para qué sirve, cómo aplicarla, cómo evidenciarla y cómo utilizarla en GRC. Registrar para evaluación por la etapa normativa del plan43/Fase4 y contratos41/44, sin iniciar biblioteca normativa ni alterar roadmap en STEP6A4. No se crean tablas, columnas, catálogos ni contenido. Cualquier explicación futura debe distinguir texto oficial, procedencia y elaboración de plataforma; no atribuir interpretaciones propias a una norma oficial.

**Asistencia IA contextual:** observación PO sobre comprensión normativa, llenado de formularios, errores y evidencias pertinentes. Queda registrada para evaluación posterior dentro del plan43/Fase9 y rector36, sin diseñar nueva arquitectura, implementar IA ni cambiar prioridades/fases aprobadas.

## Bloqueos y aceptación

Sin conflicto rector material nuevo ni necesidad de cambios fuera del frontend para estas dos observaciones. La corrección está lista para revisión local; su despliegue está expresamente excluido. QA sigue con el artefacto anterior y no acredita la corrección. Aceptación humana pendiente, verificación QA integral bloqueada y restantes gates de cierre preservados según la continuidad anterior. No hay cierre formal ni PASS humano inferido.

Procedimiento y formato de devolución: [MANUAL_ACCEPTANCE.md](MANUAL_ACCEPTANCE.md). El PO realiza las pruebas manuales restantes sobre una versión corregida accesible y comunica el resultado; no se solicitan escrituras QA ni se presentan pruebas locales como aceptación humana.
