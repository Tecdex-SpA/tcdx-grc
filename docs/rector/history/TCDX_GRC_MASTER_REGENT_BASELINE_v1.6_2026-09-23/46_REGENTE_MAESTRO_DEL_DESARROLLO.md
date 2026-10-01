# 46 — Regente maestro del desarrollo TCDX GRC

## 1. Autoridad y vigencia

Este documento es el punto de entrada obligatorio y la constitución operativa maestra del desarrollo TCDX GRC. Integra y gobierna los documentos 00–48 aplicables de este baseline. No reemplaza sus contratos especializados: fija cómo deben ser interpretados, ejecutados y verificados durante todo el ciclo hasta `MARKET_RELEASE_READY=PASS`.

`MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.6_2026-09-23`

`CODEX_VARIATION_BUDGET=ZERO`

Toda implementación, revisión, migración, API, backend, frontend, integración, IA, prueba, despliegue y release debe demostrar trazabilidad a este baseline. Código, tests, mocks, documentación histórica, convenciones de framework o decisiones de agentes no son fuente de autoridad.

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

Aplican íntegramente 06, 13, 35 y 45. Ante una decisión material no cerrada: `RECTOR_GATE=BLOCKED`. No se completa el vacío mediante “mejor práctica”, analogía con otro producto, decisión de framework, código generado, fallback, TODO o supuesto. Todo cambio material requiere task packet cerrado y, cuando corresponda, Decision Record humano.

## 9. Calidad verificable

Cada slice debe incluir pruebas unitarias/contractuales/integración/E2E según corresponda, tenant isolation negativa, autorización, auditoría, errores, idempotencia/concurrency, observabilidad y evidencia runtime. Mocks no prueban cierre runtime. Los requisitos no funcionales de 26 y 43 son parte del producto, no mejoras posteriores.

No se acepta cierre con tests omitidos, errores conocidos no gobernados, campos sin uso contractual, rutas muertas, código legacy, bypass temporales sin ADR, deuda “para después” ni divergencias entre DB/API/UI.

## 10. CI y protección de main

El repositorio debe mantener CI rector obligatorio. Todo PR debe verificar integridad SHA-256 del baseline, estado/gates, ausencia de archivos rectores no manifestados y controles específicos de la fase. `main` debe protegerse mediante PR y required status checks; Codex/desarrolladores no deben disponer de bypass ordinario.

Los gates CI complementan pero no sustituyen aprobaciones humanas donde 45 las exige.

## 11. Trazabilidad y evidencia

Todo artefacto material debe poder rastrearse desde requisito/contrato rector hasta objeto físico, API/evento/permiso, implementación, UI, prueba y evidencia runtime. `MASTER_EXECUTION_STATUS.md` registra el estado único de ejecución fuera del baseline inmutable. La matriz 10 se completa con identificadores físicos/ejecutables en las fases autorizadas.

## 12. Regla de cierre

No se declara “READY”, “DONE”, “PRODUCTION READY” ni equivalente por avance porcentual. El cierre exige evidencia de todos los gates y capacidades dependientes. La autoridad final de release corresponde al QA/Release Owner y aprobadores humanos definidos, nunca a Codex.

Cualquier contradicción entre una tarea y este baseline produce `RECTOR_GATE=BLOCKED` y no una reinterpretación del baseline.
