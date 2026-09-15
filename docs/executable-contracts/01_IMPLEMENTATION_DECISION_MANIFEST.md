# Implementation Decision Manifest

| Campo | Valor |
|---|---|
| Contract owner | Architecture Owner |
| Approving human roles | Architecture Owner; Data Model Owner; Backend Owner; Frontend Owner; QA/Release Owner; Security & Privacy Reviewer |
| Status | `HUMAN_APPROVED_DECISIONS_RECORDED` |
| Human Decision Record | `Fase 2 continuation authorization`; final closure H-001 and H-002 |

`HUMAN_APPROVED` se usa sólo para decisiones contenidas explícitamente en los Decision Records humanos de continuación y cierre final. Ninguna aprobación de versión autoriza por sí misma instalación ni implementación.

| decision_id | subject | status | selected_value | allowed alternatives considered | compatibility with rector / physical model | operational, security and maintenance impact | reason | human owner | human approval |
|---|---|---|---|---|---|---|---|---|---|
| IDM-001 | Motor y base | `RECTOR_FIXED` | PostgreSQL 16, `tcdx-grc`, `192.168.2.40` | ninguna | exacta / exacta | system of record, recovery y aislamiento | 43 §2–3, 46 §4 | Architecture + Data Model Owner | baseline y modelo físico aprobados |
| IDM-002 | Backend mayor | `RECTOR_FIXED` | Node.js 22 LTS, TypeScript strict, Fastify, REST, OpenAPI 3.1 | ninguna | exacta / neutral | modular monolith, backend authoritative | 43 §2 | Architecture + Backend Owner | baseline |
| IDM-003 | Frontend mayor | `RECTOR_FIXED` | React 19, TypeScript strict, Vite, design system propio, WCAG 2.2 AA | ninguna | exacta / neutral | accesibilidad y separación backend/frontend | 43 §2–3 | Architecture + Frontend Owner | baseline |
| IDM-004 | Async/cache | `RECTOR_FIXED` | PostgreSQL outbox; workers idempotentes; Redis 7 no autoritativo | ninguna | exacta / `ops_audit.*` | at-least-once; PostgreSQL authority | 25,34,43 | Architecture + Backend Owner | baseline |
| IDM-005 | Archivos y secretos | `RECTOR_FIXED` | S3-compatible/MinIO; metadata/permissions PostgreSQL; Docker secrets QA; Vault prod | ninguna | exacta / `evidence.file_objects` | no secretos en DB/logs/frontend | 24,26,43 | Security & Privacy Reviewer | baseline |
| IDM-006 | Observabilidad | `RECTOR_FIXED` | OpenTelemetry, Prometheus, Grafana, Loki; correlation end-to-end | ninguna | exacta / `ops_audit.*` | métricas/trazas/logs gobernados | 26,43 | Architecture + QA/Release | baseline |
| IDM-007 | IA topology | `RECTOR_FIXED` | backend → `ia2.tcdx.int`; no `ia-grc` | ninguna | exacta / `ai.*` | asistencia no autoritativa | 36,43,46 | AI Governance + Security | baseline |
| IDM-010 | Package manager | `HUMAN_APPROVED` | `pnpm`; exclusivo, sin npm/yarn paralelo | npm, yarn | exacta / neutral | un lockfile y workspaces reproducibles | DR-F2-001 | Architecture Owner | Decision Record: Fase 2 continuation authorization |
| IDM-011 | Layout | `HUMAN_APPROVED` | monorepo workspaces `apps/backend`, `apps/frontend`, `packages/*`; shared real only | layouts equivalentes | preserva modular monolith y bounded contexts / neutral | boundaries e imports sin duplicar dominio | DR-F2-002 | Architecture Owner | Decision Record: Fase 2 continuation authorization |
| IDM-012 | SQL tipado | `HUMAN_APPROVED` | Kysely; PostgreSQL/modelo físico mandan; no schema generation/auto-sync/migrations desde modelos | otras typed-SQL layers | literal al modelo / exacta | typing sin ORM authority | DR-F2-003 | Data Model + Backend Owner | Decision Record: Fase 2 continuation authorization |
| IDM-013 | Migraciones | `HUMAN_APPROVED` | runner mínimo del proyecto sobre SQL ordenado/transaccional, ledger PostgreSQL, SHA-256 y advisory lock; sin framework externo salvo decisión posterior | framework externo compatible | consume modelo, nunca lo genera | superficie mínima y control de integridad | DR-F2-004 | Data Model Owner | Decision Record: Fase 2 continuation authorization |
| IDM-014 | Testing backend | `HUMAN_APPROVED` | Vitest; unit/contract/integration/PostgreSQL real/concurrency/faults | otras herramientas | neutral | un runner con DB real; mocks no cierran runtime | DR-F2-005 | Backend + QA/Release | Decision Record: Fase 2 continuation authorization |
| IDM-015 | Testing frontend | `HUMAN_APPROVED` | Vitest + Testing Library for React; React 19, states, accessibility, visible authorization | otras herramientas | neutral | componente/accesibilidad; no reemplaza E2E | DR-F2-006 | Frontend + QA/Release | Decision Record: Fase 2 continuation authorization |
| IDM-016 | E2E | `HUMAN_APPROVED` | Playwright; runtime, tenants, roles, workflows, uploads y browsers QA | otras herramientas | neutral | evidencia browser real | DR-F2-007 | QA/Release Owner | Decision Record: Fase 2 continuation authorization |
| IDM-017 | Pinning | `HUMAN_APPROVED` | versiones exactas en manifests + lockfile; sin rangos flotantes críticos; upgrades explícitos | rangos flotantes rechazados | neutral | supply chain y reproducibilidad | DR-F2-008 | Architecture + Security | Decision Record: Fase 2 continuation authorization |
| IDM-018 | OpenAPI/generación | `HUMAN_APPROVED` | OpenAPI 3.1 schema-first; generación unidireccional OpenAPI → types/client; nunca implementation-first ni modelos manuales divergentes | implementation-first rechazado | autoridad API única / neutral | elimina drift | DR-F2-009 | Architecture + Backend + Frontend | Decision Record: Fase 2 continuation authorization |
| IDM-019 | UUIDv7 | `HUMAN_APPROVED` | generación en aplicación mediante librería mantenida conforme RFC vigente; no generador propio salvo imposibilidad aprobada | generador propio rechazado por defecto | exacta con physical profiles | formato/version bits/uniqueness/order/concurrency probados | DR-F2-010 | Backend + Security | Decision Record: Fase 2 continuation authorization |
| IDM-020 | Authentication/trust | `HUMAN_APPROVED` | OIDC/OAuth 2.x Bearer JWT; issuer/audience/JWKS configurados; identidades human y M2M separadas; backend autoriza | proveedor/IdP concreto no seleccionado | exacta con IAM / neutral | autenticación verificable sin confiar en frontend | DR-F2-011 | Security + Architecture | Decision Record: Fase 2 continuation authorization |
| IDM-021 | IA integration policy | `HUMAN_APPROVED` | sólo backend→`ia2.tcdx.int`; contexto autorizado/minimizado, provenance, correlation, audit, human oversight; no authority/RBAC bypass/secrets | provider/model/DPA quedan gate futuro | exacta con `ai.*` | proveedor/config no inventados | DR-F2-020 | AI Governance + Security | Decision Record: Fase 2 continuation authorization |
| IDM-P01 | Exact toolchain version set | `HUMAN_APPROVED` | Node.js `22.23.2`; pnpm `12.4.1`; TypeScript `7.0.2`; Fastify `5.12.4`; React `19.3.0`; React DOM `19.3.0`; Vite `8.3.0`; Kysely `0.29.5`; Vitest `5.0.1`; Testing Library React `16.3.3`; Testing Library DOM `10.4.2`; Playwright `1.63.0`; uuid `14.0.2` | ninguna tras H-001 | majors rectoras respetadas; exact pins no alteran modelo físico | supply-chain baseline reproducible; no instalación en Fase 2 | H-001 | Architecture + Security + applicable owners | final closure Decision Record H-001, 2026-09-15 |
| IDM-P02 | PostgreSQL JS driver | `HUMAN_APPROVED` | `pg` `8.23.0`, exact pin, exclusivamente driver PostgreSQL de Kysely | ninguna tras H-002 | PostgreSQL/modelo físico siguen siendo autoridad; sin schema generation, migration authority ni auto-sync | pool/TLS/type parsing surface; no autoridad de schema | H-002 | Data Model + Backend + Security | final closure Decision Record H-002, 2026-09-15 |

## Tooling consequences

- No package/runtime manifest or lockfile is created in Fase 2.
- The migration runner is project-owned in Fase 3 and has no extra framework dependency under the current approval.
- An OpenAPI generator package is not required to close the schema-first contract; selection is deferred until generation is implemented and must receive an exact-version approval without changing direction of authority.
- Provider/model/DPA details for IA are runtime/security dependencies, not gaps in the generic executable contract.

`OPEN_HUMAN_DECISIONS=0`. `IMPLEMENTATION_DECISION_MANIFEST=PASS` as a Phase 2 contract candidate. H-001 and H-002 freeze the exact versions but do not authorize package installation, runtime manifests, lockfiles or Phase 3 implementation.
