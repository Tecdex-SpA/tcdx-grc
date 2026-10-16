# 46 — Regente maestro del desarrollo TCDX GRC

## 1. Autoridad y vigencia

Este documento es el punto de entrada obligatorio y la constitución operativa maestra del desarrollo TCDX GRC. Integra y gobierna los documentos 00–49 aplicables de este baseline. No reemplaza sus contratos especializados: fija cómo deben ser interpretados, ejecutados y verificados durante todo el ciclo hasta `MARKET_RELEASE_READY=PASS`.

`CANDIDATE_MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16`

`STATUS=DRAFT_NOT_EFFECTIVE`; predecesora activa `TCDX_GRC_MASTER_REGENT_BASELINE_v1.11_2026-10-15`.

`CODEX_VARIATION_BUDGET=ZERO`

Toda implementación, revisión, migración, API, backend, frontend, integración, IA, prueba, despliegue y release debe demostrar trazabilidad a este baseline. Código, tests, mocks, documentación histórica, convenciones de framework o decisiones de agentes no son fuente de autoridad.

49 gobierna exclusivamente revisión/publicación editorial y metodológica interna y delimita la acumulación humana de funciones. No altera SoD operacional, datos, permisos, fases ni obligaciones superiores. La historia de las baselines anteriores permanece inmutable. Esta copia sucesora no es autoridad activa antes de cumplir 47.

## 2. Producto y criterio de terminación

TCDX GRC se desarrolla como producto comercial completo, multi-tenant, gobernado, auditable y operable. No se autoriza estrategia MVP, demo descartable, schema provisional, compatibilidad legacy, vías paralelas, hardcodes de tenant/cliente/fecha, deuda contractual deliberada ni funcionalidades incompletas presentadas como cierre.

Una capacidad sólo está terminada cuando su slice atraviesa persistence → domain → API → RBAC → audit → UI → tests → E2E → runtime → traceability y satisface los gates aplicables con evidencia real. El proyecto sólo se considera funcionalmente cerrado cuando todos los ítems requeridos por el baseline y el `RELEASE_DEPENDENCY_MANIFEST` aprobado están implementados y `MARKET_RELEASE_READY=PASS`.

## 3. Cadena de autoridad arquitectónica

La dependencia obligatoria es:

Baseline rector → modelo canónico/lógico → modelo físico PostgreSQL aprobado → contratos ejecutables aprobados → migraciones/foundations → backend → frontend → integraciones/IA → evidencia runtime → release.

Una capa inferior nunca redefine silenciosamente una superior. Si backend o frontend necesita una semántica no prevista, la tarea se bloquea y vuelve al owner rector correspondiente. La base de datos no se modifica para acomodar conveniencias de UI o framework.

## 4. Infraestructura cerrada inicial

- Repositorio de desarrollo: `Tecdex-SpA/tcdx-grc`.
- Sistema visual de referencia, sólo lectura: `Tecdex-SpA/tecdex-design-system`.
- PostgreSQL 16 / base `tcdx-grc`: `192.168.2.40`.
- Backend: `192.168.2.45`, `grc-bk.tcdx.int`.
- Frontend: `192.168.2.46`, `grc-www.tcdx.int`.
- IA: servicio existente `ia2.tcdx.int`, consumido por el backend mediante integración gobernada. No existe una VM/runtime GRC separado `ia-grc` en esta arquitectura inicial.

Cambiar cualquiera de estas coordenadas o crear una nueva capa desplegable exige ADR humano aprobado y nueva versión rectora antes de implementación.

## 5. Gates obligatorios

Orden mínimo:

1. `RECTOR_BASELINE=PASS`.
2. `PHYSICAL_DATA_MODEL_REVIEW=PASS`.
3. `EXECUTABLE_CONTRACTS=PASS`.
4. migraciones/foundations y `FOUNDATIONS_RUNTIME=PASS`.
5. gates de slices y packs regulatorios aplicables.
6. gates de seguridad, privacidad, tenant isolation, recuperación, observabilidad, accesibilidad, performance y operación.
7. `MARKET_RELEASE_READY=PASS`.

Un PASS parcial no autoriza la etapa siguiente salvo que 43 lo establezca expresamente. Codex no autoaprueba ningún gate humano.

## 6. Modelo físico y congelamiento de datos

El modelo físico se diseña una sola vez como modelo definitivo derivado del dominio y modelo canónico. Antes de ejecutar DDL deben quedar aprobados tablas, columnas, tipos, PK/FK, ownership, cardinalidades, uniques, checks, índices, temporalidad, versionado, retención, audit, lineage y reglas multi-tenant. `PHYSICAL_DATA_MODEL_REVIEW=PASS` congela ese contrato para las etapas posteriores.

Cambios posteriores sólo son válidos cuando responden a un cambio rector humano, tienen análisis de impacto completo, nueva trazabilidad y migración explícita. No se permite alterar el modelo para corregir una implementación que se desvió del contrato.

## 7. Backend, frontend e IA

Backend implementa exclusivamente contratos ejecutables aprobados y el modelo físico aprobado. Frontend consume exclusivamente capacidades expuestas por backend y respeta RBAC, entitlements, estados y semántica del dominio. El repositorio `tecdex-design-system` es referencia visual de sólo lectura y no otorga autoridad funcional.

IA es asistencia gobernada, no autoridad de negocio. El backend controla contexto, autorización, minimización de datos, provenance, auditoría y human oversight antes de consumir `ia2.tcdx.int`. Ninguna salida IA puede crear hechos, permisos, estados o decisiones vinculantes fuera de los contratos aprobados.

## 8. Cero deuda y no inferencia

Aplican íntegramente 06, 13, 35 y 45. No se inventan decisiones de producto ni se amplía el alcance mediante analogía, framework, fallback o deuda. Una decisión expresa PO autoriza las actividades comprendidas y su reconciliación interna. Sólo un impedimento excepcional de45/49 detiene la operación afectada; las verificaciones técnicas continúan sobre el trabajo independiente. Todo cambio material mantiene trazabilidad a la instrucción PO y sus verificaciones. DR003 autoriza las actividades comprendidas y elimina ratificaciones internas reiterativas; una exclusión expresa sigue vigente.

## 9. Calidad verificable

Cada slice debe incluir pruebas unitarias/contractuales/integración/E2E según corresponda, tenant isolation negativa, autorización, auditoría, errores, idempotencia/concurrency, observabilidad y evidencia runtime. Mocks no prueban cierre runtime. Los requisitos no funcionales de 26 y 43 son parte del producto, no mejoras posteriores.

No se acepta cierre con tests omitidos, errores conocidos no gobernados, campos sin uso contractual, rutas muertas, código legacy, bypass temporales sin ADR, deuda “para después” ni divergencias entre DB/API/UI.

## 10. CI y protección de main

El repositorio debe mantener CI rector obligatorio. Todo PR debe verificar integridad SHA-256 del baseline, estado/gates, ausencia de archivos rectores no manifestados y controles específicos de la fase. `main` debe protegerse mediante PR y required status checks; Codex/desarrolladores no deben disponer de bypass ordinario.

Los gates CI complementan pero no sustituyen aprobaciones humanas donde 45 las exige.

## 11. Trazabilidad y evidencia

Todo artefacto material debe poder rastrearse desde requisito/contrato rector hasta objeto físico, API/evento/permiso, implementación, UI, prueba y evidencia runtime. `MASTER_EXECUTION_STATUS.md` registra el estado único de ejecución fuera del baseline inmutable. La matriz 10 se completa con identificadores físicos/ejecutables en las fases autorizadas.

## 12. Regla de cierre

No se declara “READY”, “DONE”, “PRODUCTION READY” ni equivalente por avance porcentual. El cierre exige evidencia de todos los gates y capacidades dependientes. La autoridad interna de decisiones de release corresponde al Product Owner; Codex no inventa su acto ni autorización de un despliegue fuera de alcance. La evidencia de aceptación operacional del producto sigue siendo real, sin firmas simuladas.

Una contradicción entre una instrucción expresa PO y una directiva interna anterior exige preparar el delta formal, no un bloqueo administrativo permanente. La activación o implementación expresamente excluida no se ejecuta. Las restricciones excepcionales se acotan y evidencian conforme45/49.


## STEP_6A3 — candidata de incorporación inicial de fuente v1.11

`STATUS=DRAFT_NOT_EFFECTIVE; HUMAN_EXACT_BYTES_REVIEW=PENDING`. Baseline candidata TCDX_GRC_MASTER_REGENT_BASELINE_v1.11_2026-10-15, predecesora TCDX_GRC_MASTER_REGENT_BASELINE_v1.10_2026-10-15. Diseño PO aprobado por SHA `1a133d60e576208eefc90d68ff39df903df829f3c9ab1b3c51fa06d8c826913b`; constancia `docs/governance/amendments/STEP_6A3_INITIAL_SOURCE_20261015/PO_DESIGN_APPROVAL_RECEIPT_20261015.json`. Esta sección sólo tendrá efecto después de publicación conforme47/49 y gates físico/ejecutable; no autoriza operación QA ni deploy por sí sola.

El diseño técnico de fuente inicial v1.11 permanece como antecedente de esta sucesora, que añade DR001/002/003. No se atribuyen firmas ni funciones internas inexistentes: la instrucción PO autoriza las actividades en alcance sin declaraciones administrativas, segundos aprobadores o ratificación de bytes derivados. Se verifican manifiesto, compatibilidad y contratos; una activación/promoción expresamente excluida no se ejecuta. Aceptación operacional y evidencia real siguen separadas del permiso de desarrollar.6A4 sólo tras cierre de6A3 y una instrucción que incluya su inicio.

## Autoridad interna sucesora — DR003

La instrucción expresa del Product Owner constituye autorización suficiente para las actividades comprendidas en su alcance. No se exige segunda firma, segundo aprobador, comité, revisor humano independiente ni ratificación administrativa interna. La autorización funcional comprende análisis, diseño, contratos ejecutables, backend/frontend necesarios, pruebas, corrección y validación técnica dentro del alcance; Codex mantiene continuidad autónoma. Una contradicción con una directiva interna anterior se reconcilia documentalmente, sin veto administrativo permanente. Se mantienen integridad, hashes, trazabilidad, verificación técnica y límites expresos; registrar la instrucción y los bytes producidos no significa atribuir una firma humana a bytes futuros. Sólo se detiene la operación afectada por un impedimento técnico/de seguridad no resoluble en alcance, una restricción externa con fuente y aplicabilidad concreta, o una exclusión expresa. No se inventan obligaciones, revisores ni responsables. Esta regla no amplía alcance ni autoriza arquitectura arbitraria, deuda o despliegues excluidos.

Se preservan el modelo canónico y físico aprobado, contratos de backend/frontend y su evolución trazable autorizada, IAM/RBAC, mínimo privilegio, aislamiento multi-tenant, integridad transaccional, auditoría, seguridad, privacidad e historia. La gobernanza interna del desarrollo es distinta de la SoD operacional que ofrece GRC a los clientes: Evidence submit/approve, Action complete/verify, risk acceptance, Audit y credenciales conservan sus policies y actores cuando correspondan. No hay permiso, grant, estado, tabla ni excepción operacional nueva por esta regla.

Esta preparación no cambia la cadena baseline→modelo canónico/físico→contratos→implementación; formaliza cómo la decisión PO actualiza la autoridad documental. Los estados de gate técnicos requieren evidencia; los controles funcionales de clientes y obligaciones externas reales permanecen. Ni una cláusula de revisión interna anterior ni el estado PARTIAL_BLOCKED del cierre impiden esta preparación expresamente autorizada. La candidata no está activa.
