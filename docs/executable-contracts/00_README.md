# Fase 2 — executable contracts continuation

| Campo | Valor |
|---|---|
| Master regent | `TCDX_GRC_MASTER_REGENT_BASELINE_v1.4_2026-09-15` |
| Phase | `EXECUTABLE_CONTRACTS_CONTINUATION` |
| Contract owner | Architecture Owner |
| Approving human roles | Product Owner/CPO, Architecture Owner, Data Model Owner, Backend Owner, Frontend Owner, Security & Privacy Reviewer, QA/Release Owner, Regulatory Content Owner as applicable |
| Status | `BLOCKED_BY_SIX_HUMAN_DECISIONS` |
| Physical authority | approved commit `a822bb92d0d585edd84adc8a1c65ec280923cc8e` |
| Continuity base | draft commit `bee2c20` |

This directory freezes Phase 2 declarative contracts only. It contains no executable DDL, migrations, seed scripts, backend, frontend, worker, package manifest, lockfile or deployment action. It does not approve `EXECUTABLE_CONTRACTS=PASS`.

## Continuation result

The human continuation Decision Record closes package-manager direction, repository layout, typed SQL, project migration runner, test stacks, OpenAPI authority/generation, UUIDv7 library direction, authentication trust profile and AI boundary. Controlled derivation publishes:

- 65 public API operations in OpenAPI and the operation matrix;
- 47 domain/integration event types;
- 100 permissions and explicit base-role/scope grants;
- one stable problem error vocabulary;
- 61 mutating API idempotency/audit mappings;
- 93 unambiguous lifecycle edges with permission, audit, event and idempotency contracts;
- exact plan/capability/role/methodology/regulatory-header seed manifests;
- migration, authentication, storage, outbox, observability, AI and test contracts.

Six human decisions remain: two exact version approvals, three missing permission resource families, and the source-state set for `Issue.dismissed`. Therefore:

```text
EXECUTABLE_CONTRACTS_DESIGN=BLOCKED
HUMAN_GATE_REQUIRED=EXECUTABLE_CONTRACTS
```

## Common rules

- API base is `/api/v1`; OpenAPI 3.1 is schema-first authority and generation is one-way to types/client.
- Bearer JWT identity is validated by backend; tenant selection header never grants access.
- Effective authorization is identity -> membership/service principal -> entitlement/capability -> permission -> scope/ownership -> object policy -> SoD -> ALLOW; otherwise DENY.
- UUIDv7 is application-generated; timestamps are UTC; tenant civil time uses contractual IANA timezone.
- PostgreSQL owns business state, idempotency, outbox and job authority. Redis 7 is non-authoritative.
- `tenant_id` follows ownership class; no `SYSTEM_TENANT_ID`.
- Audit and domain/integration events are distinct.
- No generic table CRUD, `DELETE`, `update_status`, cross-tenant bypass, protected-content reconstruction or AI authority exists.

Artifacts 01–20 form one review unit. Artifact 18 proves bidirectional traceability, 19 is the authoritative blocker ledger and 20 is the consolidated review result.
