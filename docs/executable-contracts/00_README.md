# Fase 2 — contratos ejecutables

| Campo | Valor |
|---|---|
| Master regent | `TCDX_GRC_MASTER_REGENT_BASELINE_v1.4_2026-09-15` |
| Fase | `EXECUTABLE_CONTRACTS` |
| Contract owner | Architecture Owner |
| Approving human roles | Architecture Owner, Data Model Owner, Backend Owner, Security & Privacy Reviewer, QA/Release Owner; owners de dominio cuando corresponda |
| Status | `DRAFT_BLOCKED_PENDING_HUMAN_DECISIONS` |
| Physical model authority | commit aprobado `a822bb92d0d585edd84adc8a1c65ec280923cc8e` |

## Propósito y límite

Este directorio traduce el baseline rector y el modelo físico aprobado a contratos de implementación para Fase 3 y posteriores. Es documentación declarativa: no contiene aplicación, DDL ejecutable, migraciones, seeds ejecutables ni acciones sobre infraestructura.

La autoridad permanece en el baseline y el modelo físico. Estos artefactos no autoaprueban `EXECUTABLE_CONTRACTS=PASS`. Cuando una decisión admite más de una alternativa compatible y no existe selección humana, se conserva como `HUMAN_DECISION_REQUIRED`; no se elige una variante por convención.

## Resultado de esta iteración

Los contratos transversales de tenant, ownership, errores, idempotencia, auditoría, archivos, outbox, observabilidad, IA, testing y migraciones quedan definidos hasta el límite inequívoco de las fuentes rectoras. Permanecen abiertos los códigos y operaciones concretas que requieren decisión humana, junto con el toolchain exacto exigido por el documento 43.

Por ello:

```text
EXECUTABLE_CONTRACTS_DESIGN=BLOCKED
HUMAN_GATE_REQUIRED=EXECUTABLE_CONTRACTS
```

## Reglas comunes

- Base API tenant: `/api/v1`.
- UUID internos: UUIDv7 opacos; un business code nunca sustituye tenant scope.
- Tiempo técnico: UTC; presentación y fechas civiles según timezone IANA contractual.
- Autorización efectiva: identidad → membership activa → entitlement/capability → permission → scope → object policy → SoD → ALLOW; default DENY.
- `tenant_id` depende de `ownership_class`; no existe tenant técnico ni `SYSTEM_TENANT_ID`.
- Mutaciones: authenticate → authorize → validate → idempotency → domain command → transaction → audit/outbox → response.
- Side effects inter-domain: outbox PostgreSQL, entrega at-least-once y consumers idempotentes.
- Redis 7 no es autoridad de negocio, autorización, idempotencia ni job state.
- `calculation_status`, `result_status`, `domain_conclusion` y lifecycle permanecen separados.
- No existe CRUD delete genérico, command `update_status`, tabla `results`, entidad `Clause`, ni referencias críticas `(type,id)` sin integridad.

## Índice

Los archivos `01`–`20` son todos obligatorios y forman una unidad de revisión. `18_EXECUTABLE_CONTRACT_TRACEABILITY.md`, `19_OPEN_DECISIONS_AND_BLOCKERS.md` y `20_EXECUTABLE_CONTRACTS_REVIEW_REPORT.md` gobiernan el estado consolidado.

## Fuentes rectoras primarias

`06–10`, `13–15`, `17–18`, `21–47`, `PRE_IMPLEMENTATION_GATE_REPORT.md`, todos bajo `docs/rector/baseline/`, y la totalidad de `docs/physical-data-model/`.

No se usó código, mocks, otro repositorio ni preferencia de framework como autoridad.
