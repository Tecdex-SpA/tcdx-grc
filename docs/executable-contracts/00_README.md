# Fase 2 — executable contracts final closure candidate

| Campo | Valor |
|---|---|
| Master regent | `TCDX_GRC_MASTER_REGENT_BASELINE_v1.4_2026-09-15` |
| Phase | `EXECUTABLE_CONTRACTS_FINAL_CLOSURE` |
| Contract owner | Architecture Owner |
| Approving human roles | Product Owner/CPO, Architecture Owner, Data Model Owner, Backend Owner, Frontend Owner, Security & Privacy Reviewer, QA/Release Owner, Regulatory Content Owner as applicable |
| Status | `CANDIDATE_READY_FOR_HUMAN_REVIEW` |
| Physical authority | approved commit `a822bb92d0d585edd84adc8a1c65ec280923cc8e` |
| Continuity base | draft commit `bee2c20` |

This directory freezes Phase 2 declarative contracts only. It contains no executable DDL, migrations, seed scripts, backend, frontend, worker, package manifest, lockfile or deployment action. It does not approve `EXECUTABLE_CONTRACTS=PASS`.

## Final closure result

The continuation Decision Record and final human decisions H-001..H-006 close package-manager direction, exact toolchain/driver pins, repository layout, typed SQL, project migration runner, test stacks, OpenAPI authority/generation, UUIDv7 library direction, authentication trust profile, AI boundary, the three missing permission families and the exact `Issue.dismissed` source states. Controlled derivation publishes:

- 74 public API operations in OpenAPI and the operation matrix;
- 55 domain/integration event types;
- 134 permissions and explicit base-role/scope grants;
- one stable problem error vocabulary;
- 69 mutating API idempotency/audit mappings;
- 95 lifecycle edges with permission, audit, event and idempotency contracts, including exactly `open -> dismissed` and `triaged -> dismissed` for Issue;
- exact plan/capability/role/methodology/regulatory-header seed manifests;
- migration, authentication, storage, outbox, observability, AI and test contracts.

No Phase 2 human decision or documentary blocker remains. This is a candidate for the separate human gate and does not self-approve it:

```text
EXECUTABLE_CONTRACTS_DESIGN=CANDIDATE_READY_FOR_HUMAN_REVIEW
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
