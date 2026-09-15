# Test contracts

| Campo | Valor |
|---|---|
| Contract owner | QA/Release Owner |
| Approving human roles | QA/Release Owner, Architecture Owner, Security & Privacy Reviewer, Data Model/Backend/Frontend owners by layer |
| Status | `CONTRACT_DEFINED` |
| Human authority | Decision Record: DR-F2-005, DR-F2-006, DR-F2-007, DR-F2-010 |

Mocks may support unit tests but never close integration, E2E, runtime, recovery or release gates. Evidence records exact revision, environment, fixture manifest, command/tool version, timestamps, outcome and retained artifact; secrets are redacted.

| test_contract_id | requirement | preconditions | action | expected invariant | evidence required | gate | rector source |
|---|---|---|---|---|---|---|---|
| TC-SCHEMA-001 | physical model integrity | isolated PostgreSQL 16; approved DDL from Fase 3 | inspect catalog/constraints/types/FKs | exact approved objects; no forbidden/unsourced object | catalog diff + checksums | FOUNDATIONS_RUNTIME | physical 01–13; 40 |
| TC-TENANT-001 | cross-tenant read deny | tenants A/B with equivalent objects; actor A | read/list B by guessed UUID/filter | denied without existence leak | request/audit/DB evidence | every tenant slice | 22,26; physical 05 |
| TC-TENANT-002 | cross-tenant write constraint | A child and B parent | insert/update relation | authorization deny and composite FK failure where persistence reached | API + SQLSTATE redacted + audit | FOUNDATIONS_RUNTIME | physical INV-003/045 |
| TC-TENANT-003 | worker/export isolation | queued work for A/B | execute retry/export without client tenant filter | worker binds stored ownership; no mixed rows/files | artifact manifest and query trace | slice/runtime | 26 |
| TC-AUTHN-001 | authentication | configured approved IdP profile | missing/invalid/expired token | safe 401; no tenant access | contract + integration result | FOUNDATIONS_RUNTIME | 09,22,26 |
| TC-AUTHZ-001 | permission matrix | published permissions/roles/scopes/entitlements | enumerate ALLOW/DENY cells | effective chain exact; default DENY | generated matrix result | EXECUTABLE/FOUNDATIONS | 22,42 |
| TC-SOD-001 | mandatory SoD | same actor performed first action | attempt paired approve/verify | denied absent explicit policy/reason/audit | negative cases per SoD pair | slice | 22,42 |
| TC-API-001 | OpenAPI conformance | approved OpenAPI with operations | validate requests/responses and undocumented routes | schemas/status/headers exact; undocumented route fails CI | validator report | EXECUTABLE/slice | 25,28 G11 |
| TC-ERR-001 | error confidentiality | known failures including foreign tenant ID | invoke each error class | stable safe envelope; no SQL/stack/secret/cross-tenant disclosure | snapshot + secret scan | security gate | 25,26 |
| TC-LIFE-001 | lifecycle edges | published LifecycleTransitionDefinition | exercise every allowed/denied edge | only exact edge/command; no direct status write | transition matrix result + audit | slice | 21 |
| TC-IDEM-001 | replay | operation classified key-required | same key/fingerprint concurrently and sequentially | one mutation/event; identical replay response/ref | DB rows, response hashes, event count | slice | 25; INV-084–086 |
| TC-IDEM-002 | fingerprint conflict | completed/in-flight key | same key, changed semantic payload | 409 conflict; no second mutation | response + DB/event counts | slice | 25 |
| TC-CONC-001 | optimistic concurrency | mutable row_version N | concurrent valid writers use ETag N | one commit, one concurrency conflict; version monotonic | response and DB state | slice | 25; physical profiles |
| TC-OUTBOX-001 | atomic outbox | command with side effect | fault before/after commit | no mutation without required outbox; no orphan event | fault-injection evidence | FOUNDATIONS_RUNTIME | 25,34 |
| TC-OUTBOX-002 | at-least-once consumer | duplicate delivery and restart | deliver same event multiple times | one logical consumer effect; attempts observable | consumer state/metrics | slice/runtime | 25,26 |
| TC-AUDIT-001 | audit completeness | approved command catalog | execute success/deny/failure for material commands | required actor/ownership/tenant/outcome/correlation and redaction | audit coverage report | slice/security | 25; physical 07 |
| TC-EVID-001 | file quarantine | upload authorization and object store | upload valid/invalid/malicious files | unusable before scan PASS; checksum/MIME/classification exact | scan/access/audit evidence | FOUNDATIONS/slice | 24 |
| TC-EVID-002 | evidence lineage | tenant control/reference/requirement fixtures | link/review evidence | typed target, same tenant; global reference alone cannot prove tenant implementation | DB/API negative/positive results | CORE_GRC_SLICE | 24,44 |
| TC-DATA-001 | data sufficiency | inputs for every result_status | calculate/project | zero distinct from no_data; precedence and blockers exact | golden deterministic cases | data/slice | 17,38,39 |
| TC-LINEAGE-001 | result reproducibility | official result fixture | rebuild from versions/config/source resolution/inputs | same unrounded value/status and complete lineage | reproducibility bundle | data/runtime | 14,35,38 |
| TC-SEED-001 | repeatability | empty isolated DB then seeded DB | apply manifest twice; mutate checksum | second identical apply converges; mismatch fails closed | before/after/checksum report | FOUNDATIONS_RUNTIME | 31,42 |
| TC-MIG-001 | rebuild | empty PostgreSQL 16 | apply all approved migrations + seeds | exact schema/state from zero | logs, checksums, catalog diff | FOUNDATIONS_RUNTIME | 43 |
| TC-MIG-002 | upgrade/promotion | previous supported release backup | preflight/apply/postflight/reapply | ordered immutable ledger; reapply no drift; checksum mismatch blocks | ledger and probes | release | 43 |
| TC-ROLL-001 | failure/rollback | injected failure in transactional migration | apply failing migration | transaction rolls back when contract allows; otherwise stop + restore procedure | DB state + ledger | FOUNDATIONS/release | 23,43 |
| TC-BACKUP-001 | backup/restore | representative DB/object data, encrypted backups | PITR/restore and reconcile object metadata | RPO 15m/RTO 4h architecture demonstrated; no silent missing blobs | timed restore report | release | 26,43 |
| TC-OBS-001 | correlation | API→DB/outbox→worker/provider flow | execute trace | same correlation; request/event/causation linkage; tenant pseudonymized in logs | trace/log/metric sample | FOUNDATIONS/runtime | 26,43 |
| TC-SECRET-001 | non-disclosure | canary secrets and signed URLs | exercise logs/errors/audit/export/frontend | no secret values/full signed URLs; refs only | automated scan report | security/release | 24,26 |
| TC-AI-001 | authorized context/human oversight | A/B tenant data; policies A0–A2 | request/review/accept AI recommendation | no cross-tenant context; provenance; no direct official mutation; failure leaves deterministic calc intact | request context hashes/audit | INTELLIGENCE_RUNTIME | 26,36 |
| TC-REG-001 | pack publication | authorized licensed import manifest | validate publication | 100% independent populations, hierarchy, approvals, checksum; no premature ISO 9001:2026 use | coverage/gate artifact | per-pack gate | 41,44 |
| TC-UI-001 | accessibility/result states | approved UI contract and API fixtures | test keyboard/screen reader/contrast/states | WCAG 2.2 AA; zero/no-data/errors/permission-limited distinct | automated + human evidence | slice/release | 27,43 |
| TC-UUID-001 | application UUIDv7 generation | pinned maintained RFC 9562 library; Node.js 22 | generate sequential and highly concurrent samples | canonical UUID format; version bits=7; variant valid; no collision; timestamp-order behavior documented without treating order as uniqueness/security authority | deterministic parser output + statistical/concurrency run | FOUNDATIONS_RUNTIME | 39 §13; DR-F2-010 |
| TC-TOOL-001 | approved test stack | exact approved manifests+lockfile | run backend unit/contract/integration/concurrency/fault suites with Vitest; component/accessibility suites with Vitest+Testing Library; E2E with Playwright | suites run under Node.js 22; real PostgreSQL tests do not use mocks as gate evidence; E2E exercises real authorization/tenant/upload workflows | tool versions, lock checksum, reports | FOUNDATIONS/slice/runtime | DR-F2-005..008 |

Vitest, Testing Library for React and Playwright are `HUMAN_APPROVED` by the continuation Decision Record. Their exact proposed versions remain subject to the two version-approval decisions in artifact 01; this does not alter the test requirements.

`TEST_CONTRACTS=PASS` as a Phase 2 contract candidate.
