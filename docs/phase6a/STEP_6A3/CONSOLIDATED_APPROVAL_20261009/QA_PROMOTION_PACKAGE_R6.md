# QA operational preparation R6

D5=A accepted and clarified by PO2026-10-13: use only documented verifiable actors/procedures; missing fields individually PENDING_OPERATIONAL_INPUT; window NOT_SCHEDULED. PREPARED_NOT_READY_NOT_AUTHORIZED_NOT_EXECUTED. No QA connection or real IAM action occurred. Source hashes in operational-source-registry.json; historical account names are candidates, not verified active actors or inherited STEP6A3 authority. No secret value is requested.

## Inputs with individual owner and source

| Input | Documented value | Source where verified or to verify | State | Responsible |
|---|---|---|---|---|
| Database target | 192.168.2.40 / tcdx-grc / PostgreSQL16 | rector46; QA planR3 | DOCUMENTED_TARGET_NOT_CONNECTED | DBA |
| Backend/frontend/public | 192.168.2.45 /192.168.2.46 /https://grc.tecdex.net/ | rector46; QA planR3 | DOCUMENTED_TARGET_NOT_CONNECTED | PO QARelease |
| DBA execution identity | not supplied | QA planR3 actor_plan.DBA_execution_identity=null; deployment references environment without identity proof | PENDING_OPERATIONAL_INPUT | DBA/PO |
| Existing active global ServicePrincipal | not supplied | QA planR3 actor_plan.existing_real_service_principal_id=null; IAM canonical service_principals inventory only after separate authorization | PENDING_OPERATIONAL_INPUT | IAM/DBA |
| Human author/operator candidate | Baruj documented only in Phase5 scope | PHASE5_QA_REVIEWER_MEMBERSHIP_AUTHORIZATION_20261007.md | PENDING_OPERATIONAL_INPUT: current issuer/subject/membership/grants and STEP6A3 use unverified | IAM/PO |
| Human reviewer candidate | andres.grc; Phase5 retained membership, final roles0 by prior authority | same Phase5 authorization, scope not carried into6A3; no grants inferred | PENDING_OPERATIONAL_INPUT: current identity/context and permitted operations | IAM/PO |
| Tenant/member/role/entitlement selectors | not supplied for6A3 | QA planR3 actor_plan.real_tenant_memberships_and_entitlements=null; canonical APIs under later plan | PENDING_OPERATIONAL_INPUT | IAM/QARelease |
| Backup/PITR artifact and destination | no exact artifact/path/operator supplied | Phase5 closure records configured reference only; not reusable completion evidence | PENDING_OPERATIONAL_INPUT | DBA |
| Restore destination and procedure | no approved current QA destination/procedure supplied | verify-restore.ts is local-only127.0.0.1:55432 and historical ledger10; cannot execute it on QA or assert32-stage recovery | PENDING_OPERATIONAL_INPUT | DBA |
| Execution window | NOT_SCHEDULED | PO explicit reply2026-10-13; later express decision required | NOT_SCHEDULED | PO |
| Candidate image digest/runner33-34 integration | not supplied for R6 | R3 plan33/34 outside active32 migration manifest; R6 local build is not a QA image | PENDING_OPERATIONAL_INPUT | QARelease/DBA |

## Authorization by operation

| Operation | Exact scope/preflight | GO and recovery | Current authorization |
|---|---|---|---|
| Read-only inventory | exact target/DB version/ledger/hash/schema, existing actor ownership, RLS owner/bypass, typed defaults/UQ,14 VOC families/26 consumers, aggregate counts without PII export | named DBA/actor and read scope; no code mutation; read-only rollback | NOT_AUTHORIZED; no connection |
| Backup and isolated restore | DBA approved artifact/destination/encryption/PITR and exact restore resource; rowcounts/hash/ledger/FK/grants and negatives | current compatible backup and demonstrated restore; don't reuse local ledger10 script as QA procedure | NOT_AUTHORIZED; missing procedure/destination |
| Forward31/32 migrations | existing data predicates and exact active canonical manifest; abort incompatible rows, no coercion/backfill | locks/window/operator/backup required; transaction rollback; postcommit only separately approved forward recovery preserving history | NOT_AUTHORIZED |
| Candidate33/34 + SEED010/44 grants | existing active PLATFORM_CONTROL SP; exact SQL hashes/receipt/audit/ledger/canonical runner integration; no fake adoption | every actual grant/audit verified; audit failure aborts; rollback beforecommit, never delete historical evidence aftercommit | NOT_AUTHORIZED; candidates remain outside manifest |
| Vocabulary compatibility | T-VOC01..12 by52 codes/14 families/26 occurrences; current/historical version and provenance, unknown values retained | no implicit enforcement/coercion/backfill; inventory incompatibility blocks only dependent activation | NOT_AUTHORIZED |
| CFG acceptance | CFG-T01..08, v1 preserved; successor rules none not approved | methodology/source/mode gates specific to version; cannot convert D1 design into publication | NOT_AUTHORIZED |
| IANA/auth smoke | own tenant zone/UTCZ,400/401/403/404/503,foreign tenant concealment, revocation/context-switch/DST/no extra Tenant.read | exact R6 candidate hashes/image; current real identities; local candidate regression and simulated browser evidence aren't real E2E | NOT_AUTHORIZED |
| CT01/CT03/GETEC and negative E2E | versions/context/entitlements/history,active eligible memberships/save revalidation; EC coherence and errors; operational SoD/manual case log | exact real user/tenant grants; external results and human UI acceptance after execution | NOT_AUTHORIZED |
| CT04 application | valid legal source and typed applicability binding | missing binding blocks new application; independent permitted pending/history flows may be tested without claiming compliance | BLOCKED_LEGAL_BINDING; NOT_AUTHORIZED |
| Deployment | exact backend/frontend images,asset MIME/hash/deep-route/reload, approved compatibility and operation list | candidate parity and smoke; rollback only to exact authorized prior image; never guessed DNS/default zone | NOT_AUTHORIZED |

## Candidate and recovery controls

R1/R2/R3 and local32-stage artifacts preserved. D3 exact local projection delta is separately approved; all R6 artifacts/build sources will be sealed in the R6 manifest. R3/R5 build hashes are historical after R6 frontend/backend changes; do not substitute them for a newly built candidate. No image digest is invented. No prior logical approval authorizes actual31/32/33/34,grants,IAM or deploy.

GO is operation-specific. Read-only inventory does not require pretending methodology/CT04 completion, and it does not authorize writes. Missing CT04 binding blocks application, not unrelated contract-permitted QA pending/history tests. A methodology none/successor gate blocks that publication only. Every operation still requires its own exact named actor, target, hashes, scope and later human authorization; elapsed time is never permission. QA performance/real DST/end-user/accessibility/backup targets remain NOT_RUN.

Transaction rollback before commit; after commit a new approved forward repair preserving legitimate contextual rows and audits, or separately approved coordinated backup recovery preserving subsequent writes. No restoring UNIQUEtenant/globalordinal or AUDITOR grant, no audit deletion, no policy fallback. D4 draft does not activateRLS or create a bypass role. Window NOT_SCHEDULED, QA/IAM/E2E_EXTERNAL/DDL_QA/DEPLOY=NOT_RUN.

The closed tenant DTO changes the frontend/backend compatibility boundary. Promotion must use an exact matching pair of backend/frontend artifacts; an old closed parser rejects the new field, and a new parser rejects its absence. Such a mismatch remains DENY, never a compatibility fallback. Recovery must restore a coherent authorized pair; this plan does not assume an old pair is available. No deployment occurred.

## Major v2 draft prerequisite

The IANA semantic text is accepted, but the closed DTO change requires major v2 under rector25 §1. Option A authorizes preparation of the exact successor and v1-self retirement only. R6_V2_TRANSPORT_CONTRACT_DRAFT.md and R6_V2_APPROVAL_MANIFEST.json are DRAFT_NOT_EFFECTIVE pending their later presented-byte acceptance. No paired build may be promoted until that publication gate and every operation-specific authorization in this plan pass. The self projection candidate is /api/v2/auth/me/authorization; /api/v1/auth/me/authorization is proposed retired404 without redirect/fallback; other v1 endpoints remain. Window NOT_SCHEDULED, QA NOT_AUTHORIZED/NOT_EXECUTED.
