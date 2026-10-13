# Modelo operativo provisional — PO único y Codex asistente

Propuesta documental, sin nombramientos ni firmas. Master: `TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23`. Modalidad indicada por el PO el 2026-10-08: `SOLO_PRODUCT_OWNER + CODEX_ASSISTED_ENGINEERING`. El [ledger26](../26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md) sigue siendo el único registro de aprobaciones. Esta carpeta no recibe firmas.

## Respuestas a las tres preguntas

**1. ¿Qué cláusulas requieren otra persona distinta del PO?** No se demostró una exigencia incondicional para aprobar ninguna de las 48 cláusulas. Hay **tres C?**, con certeza `INDETERMINADO_POR_EVIDENCIA`: `CFG-D-COMPLIANCE-V1`, `CFG-D-CONTROLS-V1` y `CFG-D-PUBLICATION`. El candidato deja abierta la naturaleza de la declaración `none` y si exige una nueva versión; tampoco identifica autoría y aprobación humana del acto. Si constituye autoría o modificación de metodología global y el PO es autor, la regla por defecto impide que él mismo apruebe. Otra persona competente debe aprobar ese acto, salvo excepción válida no demostrada aquí. Codex y el actor SQL de una migración no satisfacen independencia humana. Fuentes: docs/rector/baseline/22_RBAC_PERMISSION_SCOPE_MATRIX.md:64/70/73; docs/phase6a/STEP_6A3/28_CONFIG_CFGD_CONDITIONAL_DECISION_AND_PHYSICAL_RECONCILIATION.md:22/24/34.

Esto no presume que el PO sea autor de cada metodología existente. Si no lo es, la regla exige separación respecto del autor real, no necesariamente otra persona distinta del PO. **C firmes=0; revisión externa incondicional para estas aprobaciones=NOT_DEMONSTRATED.** Las tres C? siguen bloqueadas.

**2. ¿Qué funciones puede acumular el PO?** **44 cláusulas B**, identificadas individualmente en02. Rector 43:116 permite expresamente varias funciones en una persona, registrando el sombrero de cada aprobación y respetando SoD. Competencia, autoridad para el alcance actual, ausencia de conflictos y aceptación de responsabilidad siguen **NOT_DEMONSTRATED** para este paquete. Cada función conserva su aceptación: una firma de Backend no se copia como decisión jurídica o de Data Model. Una sola identidad habilitada puede registrar esos distintos actos. Fuentes: docs/rector/baseline/43_PLAN_MAESTRO_RECTOR_DISENO_Y_DESARROLLO.md:107/116; docs/rector/baseline/45_CONTRATO_DESARROLLO_CERRADO_Y_NO_INFERENCIA.md:68/79/81.

El precedente Fase5 identifica una misma persona en cinco funciones, limitado a esa fase. No acredita por sí solo competencia actual ni firma 6A.3. La aprobación PO del 2026-10-08 cubre dirección funcional; no sustituye estos actos técnicos. Fuentes: docs/governance/PHASE_5_HUMAN_GATE_APPROVAL.md:9/10/14/18; docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md:11/27.

**3. ¿Qué puede resolver evidencia Codex más autorización PO sin otra firma especializada?** **Una cláusula A: CFG-HANDLER**, exclusivamente para reconocer el hecho «declaración OpenAPI presente; handler HTTP no demostrado». Es conservador, reversible y no modifica contratos, semántica, permisos o gates. El PO puede aceptar la evidencia factual sin presumir competencia Backend ni otra firma técnica. Cualquier implementación, cambio contractual o PASS posterior sigue necesitando owners humanos. Fuentes: docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md:57; docs/rector/baseline/45_CONTRATO_DESARROLLO_CERRADO_Y_NO_INFERENCIA.md:13/38/79; docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml:3480; apps/backend/src/core-grc/routes.ts:62; apps/backend/src/app.ts:81.

D01/D02, matrices de grants, hashes, tipos y discrepancias UQ admiten comprobaciones mecánicas. Sus cláusulas completas incluyen decisiones de reconciliación, publicación o compatibilidad y siguen B. Generar desde un contrato aprobado tampoco equivale a aprobar los significados de los 52 valores nuevos. Fuentes: docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md:48/49/54/75; docs/rector/baseline/45_CONTRATO_DESARROLLO_CERRADO_Y_NO_INFERENCIA.md:38.

## Interpretación del CSV

`YES_EXPLICIT` en functions_consolidatable señala habilitación normativa **condicionada**, no designación actual. `NOT_DEMONSTRATED` en independent_human_required significa que no se demostró obligación específica de otro humano para aprobar esa cláusula; no es dispensa. Las tres C? tienen consolidación NOT_DEMONSTRATED hasta resolver SoD y autoría. La falta de competencia de las 44 B es una condición pendiente distinta de las tres incertidumbres de clasificación.

required_functions reproduce el ledger, incluso owners repetidos; un duplicado de Security no significa dos personas. Las B requieren aceptación por función, posible en un mismo acto humano con decisiones individualizadas. En A esos owners siguen relacionados con cualquier cambio técnico posterior; sólo se admite aceptación factual. **Las 48 aprobaciones permanecen pendientes**, incluida A; esta auditoría no acepta el hecho por el PO ni cambia26.

## Evidencia y designación funcional propuestas

El PO conserva alcance, prioridad y aceptación funcional. Codex inspecciona, deriva y verifica, sin personalidad firmante ni capacidad para nombrar al usuario. Las funciones técnicas se ejercen tras acto humano explícito con competencia y autoridad para el alcance. No comité ni contratación permanente exigidos por 43:116. Fuentes: docs/rector/baseline/43_PLAN_MAESTRO_RECTOR_DISENO_Y_DESARROLLO.md:107/116; docs/rector/baseline/45_CONTRATO_DESARROLLO_CERRADO_Y_NO_INFERENCIA.md:13/26/68/81.

Evidencia mínima sugerida, **propuesta operativa y no requisito académico añadido al rector**:

| Función | Evidencia verificable sugerida | Estado |
|---|---|---|
| Architecture | Revisiones pertinentes; jerarquía y ADR; explicación del delta, alternativas, dependencias y riesgos; autoridad actual | NOT_DEMONSTRATED |
| Backend/IAM/Security | Trabajo con SQL, tenant, scopes, ObjectPolicy, minimización y concurrencia; revisión de request, respuesta y errores | NOT_DEMONSTRATED |
| Data Model/Configuration | PostgreSQL, claves NULL-safe, tipado, integridad y recuperación; evaluación del preflight UQ/default | NOT_DEMONSTRATED |
| Domain/Methodology | Conocimiento específico y revisión de inputs, pesos, cobertura, suficiencia, temporalidad y compatibilidad por versión | NOT_DEMONSTRATED |
| Privacy/Legal | Capacidad para el asunto jurídico preciso, fuentes aplicables y límites; habilitación profesional sólo si una norma autorizada realmente la exige | NOT_DEMONSTRATED |
| QA/Release | Evaluación de cobertura negativa, aislamiento, concurrencia y restore; regresión existente separada de aceptación nueva | NOT_DEMONSTRATED |

Formación relevante, experiencia verificable y trabajos/revisiones pertinentes pueden sustentar competencia. El rector no prescribe títulos ni un tercero acreditador para toda revisión de ingeniería. Una autodescripción sin evidencia no basta y no se atribuye credencial al PO. La ausencia de personal o contratación futura no dispensa condiciones presentes.

Legal Reviewer ejerce revisión jurídica y no administración de plataforma; su aceptación no sustituye resultados técnicos. Acumular funciones de desarrollo no concede grants IAM ni elude fronteras operacionales. No presumir PO abogado ni opinión IA como acreditación o firma. No se investigó normativa externa ni se afirmó obligación profesional no demostrada en el checkout. Fuentes: docs/rector/baseline/42_PLANES_COMERCIALES_Y_ROLES_BASE.md:107/127; docs/rector/baseline/43_PLAN_MAESTRO_RECTOR_DISENO_Y_DESARROLLO.md:116; docs/rector/baseline/45_CONTRATO_DESARROLLO_CERRADO_Y_NO_INFERENCIA.md:68/79.

Si no puede demostrar competencia para una función, su cláusula sigue pendiente. Revisión externa puntual puede suplir esa capacidad, sin convertirla en obligación de independencia inexistente.

Formato **en blanco** para preparar un acto humano y registrarlo únicamente en26:

| Campo | A completar personalmente |
|---|---|
| Identidad, función y clause_ids | [ ] |
| Autoridad formal y fundamento de acumulación | [ ] |
| Evidencia de competencia y hash del candidato | [ ] |
| Autoría, conflictos y SoD por acto | [ ] |
| Aceptación explícita de responsabilidad y límites | [ ] |
| Decisión individual por cláusula/función y condiciones | [ ] |
| Fecha real y evidencia verificable del acto | [ ] |

No se registra aceptación en esa tabla ni otro ledger. Fuentes: docs/rector/baseline/45_CONTRATO_DESARROLLO_CERRADO_Y_NO_INFERENCIA.md:68/81; docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md:83/85.

## Ruta crítica mínima

| Orden | Acción y dependencia | Responsable / naturaleza | Límite |
|---|---|---|---|
| 1 | Aceptar hecho CFG-HANDLER; utilizar conteos y contrastes ya verificados | Codex evidencia; PO aceptación factual A | No cierra CT02 |
| 2 | Decidir qué funciones B asumirá y aportar competencia, autoridad y aceptación | PO bajo43:116 y45:68/81 | No repetir aprobación funcional ni autoasignar competencia |
| 3 | Resolver naturaleza CFG-D y autor/aprobador real de las tres C? | Architecture, Security y Methodology competentemente ejercidas | SoD22:70; sin excepción inventada |
| 4 | Confirmar autosuficiencia por método; HISTORY/PUBLICATION y UQ1/UQ2/DEFAULT | Domain, Methodology, Architecture, Backend y Data Model | NULL no demuestra suficiencia; sin DB/DDL |
| 5 | C-01/02/03A/B/04/G/W, C-06F/M/R y D01/D02 antes C-07 | Architecture, Security, Backend, Domain, IAM y Privacy/Legal | CT03 minimización más revalidación; CT04 discovery no aplicabilidad |
| 6 | VOC-C01..06, familias CV01..14 y CV08-I/A/C; compatibilidad antes de enforcement | Domain, Architecture, Backend, Security, Data Model; función Frontend para mapping contextual | 52 propuestas intactas; upload/uploaded sin alias; CV14 sin grants; CV10 sin motor |
| 7 | Planes C-08, CFG-QA y VOC-QA tras dependencias anteriores | Función QA humana acumulable; Codex evidencia | No PASS runtime por suites históricas |
| 8 | Autorización posterior de publicación y acciones operativas exactas | Autoridades competentes y task packet futuro | Este encargo no autoriza publicación/DDL/implementación/QA/deploy |

Fuentes de las dependencias: docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md:34/50/75/81; docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md:134; docs/phase6a/STEP_6A3/28_CONFIG_CFGD_CONDITIONAL_DECISION_AND_PHYSICAL_RECONCILIATION.md:22/24/34/48; docs/phase6a/STEP_6A3/30_VOC_TECHNICAL_SIGNOFF_AND_COMPATIBILITY.md:75/77/79/89. No otro paquete de implementación.

**Revisión externa confirmada para aprobar estas cláusulas: NOT_DEMONSTRATED.** Mínimo condicional: si PO es autor de un acto sujeto a22:70 y no existe excepción válida, una persona distinta y competente en ambas metodologías y publicación puede revisar los dos métodos y CFG-D-PUBLICATION. No tres personas o un comité por el número de cláusulas. No presumir que un revisor cubre ambas competencias.

Las obligaciones futuras sí son expresas: autor/importador no único aprobador de pack; Evidence crítica y Action de alto riesgo con segregación; Audit con sus reglas; IDM-P05 exige dos humanos autenticados independientemente para QA del lifecycle RetentionPolicy. Dos cuentas del PO no satisfacen esas condiciones. Aprobar GET o plan no ejecuta ni dispensa esos actos. Fuentes: docs/rector/baseline/41_BASELINE_REGULATORIO_OBLIGATORIO.md:61/66/69; docs/rector/baseline/42_PLANES_COMERCIALES_Y_ROLES_BASE.md:123/124/125; docs/rector/baseline/22_RBAC_PERMISSION_SCOPE_MATRIX.md:66/67/68/73; docs/rector/baseline/48_CONTRATO_AUDITORIA_INTEGRADA_ISO_19011.md:99; docs/executable-contracts/01_IMPLEMENTATION_DECISION_MANIFEST.md:37.

## Resultado y límites

**48/48** IDs únicos, orden original: **A=1; B=44; C firmes=0; C?=3; indeterminados=3**. Las 48 filas de 26 siguen PENDING_REVIEW. AUTHORITY_AUDIT=PARTIAL_BLOCKED por las tres incertidumbres concretas; auditoría documental exhaustiva. RECTOR_GATE=PASS sólo para este encargo y su integridad; STEP_6A3=PARTIAL_BLOCKED y gate de publicación BLOCKED.43:116 permite acumular; 22 limita actos sujetos a SoD. No alterar reglas por falta de personal. Fuentes: docs/rector/baseline/45_CONTRATO_DESARROLLO_CERRADO_Y_NO_INFERENCIA.md:32/79/81; docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md:5/27.

Integridad rectora, proyección histórica del status, contrato generado existente y comprobaciones estáticas/documentales ejecutadas. Unit/typecheck/lint/E2E/PostgreSQL/QA/runtime/nuevas capacidades: NOT_RUN; no agregan evidencia de autoridad a esta auditoría sin cambio de producto; red/mutaciones prohibidas. Los anteriores 509/102/82/448/256 son históricos. 04 registra checks y hashes.

Sólo cuatro archivos nuevos. Fuentes, índice, HEAD, diff previo y gobernanza conservados. BD, contratos ejecutables, backend, frontend, infraestructura y despliegue: sin cambios por esta ejecución. Dominio público https://grc.tecdex.net/; issuer https://iam.grc.tecdex.net/realms/tcdx-managed-identity. Sin importación normativa, commits, QA ni deploy; STEP_6A4=NOT_STARTED.
