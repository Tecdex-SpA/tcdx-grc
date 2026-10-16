# R6 test evidence at owner suspension

PROVISIONAL_NOT_FINALIZED. No further extensive verification. Full details and historical failures: CONTINUITY_CHECKPOINT_R6.md. Definitive current local candidate source: evidence/continuity-r6/v2-tested-source-hashes.json, verified unchanged by suspended-source-match.json.

| Revision | Evidence | Result | Scope |
|---|---|---|---|
| R3 historical | verified R3 JSON/seals |850PASS=737unit+113PG;0FAIL/0SKIP |460simulatedbrowser/38UQ separate, not R6|
| R4 historical | R4 evidence |7directed+3final checksPASS |documentation only|
| R5 historical | R5 evidence |13checksPASS |documentation only|
| R6 former v1 candidate |final-serial-tests.json |869PASS,0FAIL,0SKIP |superseded transport candidate, not effective publication|
| R6 former v1 browser |browser-simulated-release.log |200PASS |core only, not full464v2|
| R6 current v2 candidate |v2-integral-tests.json;v2-gate-commands.json |872PASS=759unit+113PG,0FAIL,0SKIP;87files |current source matches; PG18files, old82in15files included|
| R6 current v2 checks |v2-gate-commands.json |9PASS |typecheck/lint/build/contracts/vocabulary/secrets/rector/status/whitespace|
| R6 current v2 browser |v2-browser-simulated-all.log |62expected/94unexpected/308notcompleted;exit130 |interrupted, NOT_PASS; route harness discrepancy recorded|
| External |no execution |NOT_RUN |QA/IAM real/E2E external/human UI|

Commands, timestamps, duration and logSHA256 are in v2-gate-commands.json and final-serial-command.json. Earlier failed attempts remain in first-full-tests.json, release-timeout-tests.json and their logs; assertions and timeouts were not weakened. Do not add overlapping runs or categories. PostgreSQL16.15/Node22.23.2/pnpm12.4.1, own isolated namespace127.0.0.1:55432, no host port, exact labels/system identifier checked before DDL. Owned resources removed; foreign4unchanged. Evidence is local test fixtures, not real operational identities/grants or QA acceptance.
