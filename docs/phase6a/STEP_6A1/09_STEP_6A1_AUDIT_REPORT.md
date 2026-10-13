# STEP 6A.1 canonical UX contract audit report

Audit date: 2026-10-08. Baseline: main at 6af66387aa03fa185ef139584de07700f247b903.
Master: TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23. Mode: READ_ONLY_AUDIT.
Recommendations are audit proposals for the authorized later stages; no application contract or runtime change is approved by this artifact.

## Authority, authorization and current gates

The Product Owner's 2026-10-08 task packet explicitly authorizes Phase 6 and Phase 6A operational UX enablement, with only STEP 6A.1 read-only audit/documentation active. The original rector Phase 6 remains Risk + Incidents/Loss, not implemented here. The mandatory transversal business UX acceptance rule is reproduced in 08. Root AGENTS, rector46/45/43, enforcement and the latest mutable execution-status evidence were inspected before documentation writes.

`RECTOR_GATE=PASS` applies to the authorized audit. `MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23`; immutable manifests/history verification passed via `bash scripts/verify-rector-governance.sh`. The verifier still prints the historical “Current authorized phase” projection (Phase 6 BLOCKED and earlier Phase 5 status); latest append-only STEP23M final recovery evidence explicitly supersedes that old projection. The current human packet supplies new audit authorization. No historical section or PASS is rewritten and no governance tooling is changed to manufacture authorization. `scripts/test-rector-governance-status.sh` tests the old fixed projection and was inspected, not executed as a new Phase6 gate.

Phase 5 remains PASS/CLOSED/INTEGRATED; Core slice PASS. Phase 6A and its audit are AUTHORIZED; 6A.2 is not started. Risk and Incidents/Loss remain NOT_STARTED. No new human visual approval, security/runtime/release PASS or MARKET_RELEASE_READY is claimed. Active visual authority is v1.0 with approved local logo/baseline preserved; pending v1.2 remains pending.

## Scope, method and findings

Single file inventory, targeted source/contract reads, named OpenAPI schemas parsed with existing installed YAML dependency, typed model/relationship inspection and existing component/test references. No dependency installation, full tests, Docker, QA access or network/domain work. Production/IAM domains remain canonical: https://grc.tecdex.net/ and https://iam.grc.tecdex.net/ ; issuer https://iam.grc.tecdex.net/realms/tcdx-managed-identity ; callback https://grc.tecdex.net/auth/callback . No alias/fallback is proposed.

| Metric | Value |
| --- | --- |
| DOMAINS_AUDITED | ['Compliance', 'Controls', 'Evidence', 'Actions'] |
| FORMS_INVENTORIED | 42 |
| FIELDS_AUDITED | 361 |
| EXPOSED_INTERNAL_IDS | 95 |
| BUSINESS_JSON_FIELDS | 3 |
| CONTROLLED_VOCABULARY_FIELDS | 89 |
| CANONICAL_REFERENCE_SOURCES_FOUND | 21 |
| MISSING_REFERENCE_RESOLUTION_CAPABILITIES | 4 |
| WORKFLOW_DEPENDENCIES_CONFIRMED | 38 |
| MISSING_CONTEXTUAL_NAVIGATION_LINKS | 29 |
| P0_FINDINGS | 9 |
| P1_FINDINGS | 9 |
| P2_FINDINGS | 2 |

All eleven workspaces and 42 actual mutation surfaces were inventoried. The CSV's 361 rows include input occurrences, read-only detail/list scalars, filters, selector helpers and typed JSON members; exact breakdown is in result JSON. Internal-ID count is occurrence-based, and business JSON count is exactly three editors. Closed vocabulary and reviewed-but-unknown vocabulary occurrences are distinguished in JSON/05. A bounded string is not promoted to an enum.

Business usability deficiencies include manual references, JSON editing, incomplete contextual navigation, date/type/requiredness confusion and hidden child histories. Existing base-control, Subject and methodology selectors plus typed child reads can be reused. Four precise missing/restricted reference-resolution capability families are documented in 03, without approved endpoint names/grants. There are 9 P0, 9 P1 and 2 P2 findings, each tied to source, exact operation, dependency, stage and regression risk.

## Traceability

Rector19/21/22/24/25/29/30/31/38/39/43/44/45/46 → approved physical model/amendments → OpenAPI named schema + operation matrix + permission catalog → Core model/routes/services/repositories → frontend create/workflow/detail/picker observation → CSV field IDs → UX findings → B-01–14 later-stage backlog → AC-G01–06 and AC-F01–42. Source paths/line references are in the CSV and artifacts. These are audit evidence, not new runtime receipts.

## Unknowns, alternatives and pending approvals

Exact unknown verification requirements: RR-G01–04 (03), U-VOC (05), U-FILTER/U-DYNAMIC (06), U-ZIP (01). Unknown details are explicitly allowed by this audit packet when precisely recorded. No unsupported architecture assumption was substituted. Known optional configuration may remain omitted under its existing contract; auto-resolution is not inferred. Caller-owned business codes are not auto-generated. Bounded-string vocabularies may be genuinely free text or controlled; the audit selects neither as official semantics. Missing assignee/framework/retention/configuration reads require human Architecture/Domain/Backend/Security closure before dependent implementation, not implicit IAM/endpoint grants. No unresolved rector conflict prevents documenting these findings; they block only dependent later implementation. Human visual/functional/runtime review is pending for any future UI candidate.

Task packet status COMPLETE for audit; variation budget ZERO; mechanical derivations: source schema/input inventory, reference/permission/path matching and CSV counts. Human decisions cited: current audit authorization and transversal rule; existing approved Phase5 read and methodology amendments. Assumptions introduced NONE. Files outside authorized scope modified NONE. Prohibited actions confirmed unexecuted: source/contract/migration/IAM/DB/infra/deploy changes, QA authentication, staging, commit/push/merge, Risk/Incidents and automatic 6A.2 execution.

## Deliverables, validation and gate

Ten deliverables under `docs/phase6a/STEP_6A1/`, plus a prospective audit-only append to `docs/governance/MASTER_EXECUTION_STATUS.md`. Existing untracked `artifacts/phase5-iam-ui/step23l-managed-identity-tenant-onboarding-e2e/snapshot.mjs` and `data/regulatory/catalogs/_archives/` are preserved. No application source, database, executable contract, backend, frontend, infrastructure or deployment contract changed.

Validation gate initially PENDING; the final validation receipt below and 10_STEP_6A1_RESULT.json record actual checks, never presumed results. Checks are restricted to governance integrity, documentation coverage, CSV/JSON parse, source/reference existence/consistency, new-document secret scan, git diff whitespace and scope/source preservation. No full regression or runtime test is required for this documentation-only audit.

NEXT_REQUIRED_ACTION after documentation PASS: EXECUTE_STEP_6A2_NAVIGATION_AND_DEPENDENCY_DESIGN. Do not start it automatically.

## Final documentation validation receipt

STEP_6A1=PASS
RECTOR_GATE=PASS
AUDIT_DOCUMENTATION_CHECKS=PASS
CSV_VALIDATION=PASS
JSON_VALIDATION=PASS
SOURCE_PATH_VALIDATION=PASS
REFERENCE_CONSISTENCY=PASS
GIT_DIFF_CHECK=PASS
SECRET_SCAN=PASS
SCOPE_CHECK=PASS

Validated 42 operations, 361 CSV rows/26 stable columns, 112 source files and 2188 CSV source line references; all 42 form-specific acceptance rows and 20 prioritized findings have consistent references. All actual visible source fields and all typed members of the three JSON schemas are covered. Every field has exactly one permitted primary origin category. IDs map to canonical sources and existing/missing read contracts. Permissions referenced by every business mutation are declared in the approved catalog. Unknowns retain their precise later verification requirements. Closed versus unresolved vocabulary occurrence counts are 61 and 28. The approved v1.0 image/logo match their manifest hashes.

Tracked git diff contains only the prospective status append; untracked additions are exactly these ten audit documents plus the two pre-existing unrelated untracked paths. The entire historical MASTER_EXECUTION_STATUS.md prefix remains byte-identical to HEAD (SHA-256 55354727b8dcf9c5cbd7593c63f55e9aeaeb3ec3605e8e6127b6241de2a70a37). The index is unchanged and HEAD remains 6af66387aa03fa185ef139584de07700f247b903. Checks cover new untracked files as well as git diff --check. The initial CSV CRLF whitespace finding was corrected to LF and the complete documentation checks reran successfully. Scoped scanner patterns cover private keys, JWTs, credential URIs, quoted/environment secrets and personal email data; no matches. No application/contract/database/IAM/infrastructure/deployment mutation, staging, commit, push or merge.

No full suites, Docker, dependencies, runtime or QA checks ran. Unknown live conditional/focus/responsive details await authorized 6A.6 candidate evidence. This PASS certifies audit completeness and documentation validation only, not remediation completion or a human UI gate.

NEXT_REQUIRED_ACTION=EXECUTE_STEP_6A2_NAVIGATION_AND_DEPENDENCY_DESIGN
STEP_6A2_STARTED=NO
