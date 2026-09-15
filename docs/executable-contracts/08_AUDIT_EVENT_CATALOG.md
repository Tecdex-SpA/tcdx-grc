# Audit event catalog

| Campo | Valor |
|---|---|
| Contract owner | Security & Privacy Reviewer |
| Approving human roles | Architecture Owner, Security & Privacy Reviewer, QA/Release Owner, domain owner |
| Status | `BLOCKED` |

## Audit record contract

Every material/sensitive operation records:

`audit_event_code | actor_user_identity_id xor actor_service_principal_id | ownership_class | tenant_id conditional | subject aggregate_type/id | command/action | before_payload? | after_payload? | source | correlation_id | request_id | provenance | occurred_at UTC | outcome | reason/justification when required | classification/redaction | effective retention policy/version`.

Rules:

- `tenant_id` is mandatory only for TENANT_OWNED/TENANT_DERIVED and NULL for GLOBAL_REFERENCE/PLATFORM_CONTROL; no `SYSTEM_TENANT_ID`.
- Before/after is relevant, minimized and field-allowlisted, not a full-row dump.
- Append-only, baseline retention 7 years subject to superior policy/legal hold.
- Secrets, blobs, signed URLs, licensed content not permitted by policy and unnecessary personal data are excluded/redacted.
- Audit creation is atomic with the command outcome where the physical transaction permits; denied/suspicious attempts are recorded through the security audit path without leaking resource existence.

## Mandatory audited families

| blocker | operation family | reason/justification | before/after | reinforced | source |
|---|---|---|---|---:|---|
| AUD-B01 | administer permission/role/capability/plan/configuration | required for material change | relevant grant/config delta | yes | 22, 29, 42 |
| AUD-B02 | impersonation start/end/use | reason and bounded target required | session metadata, never credentials | yes | 22 |
| AUD-B03 | lifecycle submit/review/approve/reject/verify/dismiss/cancel/reopen/supersede/expire | reason when command requires | state and decision-relevant fields | approve/verify yes | 21 |
| AUD-B04 | evidence/document/file upload/scan/review/access/export | review reason; download context | metadata/classification, not binary or signed URL | approval/access yes | 24 |
| AUD-B05 | methodology/rule/mapping/policy publish | approval rationale | version IDs/hashes | yes | 18, 35, 36 |
| AUD-B06 | regulatory import/review/publish/deprecate | provenance and approvals | manifest/version/hash, no unlicensed replication | yes | 37, 41, 44 |
| AUD-B07 | credential reference configure/rotate/validate/access | reason under reinforced policy | reference metadata only | yes | 22, 26 |
| AUD-B08 | retention purge/erasure/legal hold | legal basis/reason required | action/result classifications, no erased data | yes | 23, 39 |
| AUD-B09 | calculation/source resolution/snapshot/report publication | policy/version rationale where human | IDs, versions, status, lineage refs | publication yes | 23, 27, 35, 38 |
| AUD-B10 | AI recommendation review/accept/reject | human decision reason when required | job/recommendation/accepted command refs | yes for accepted official command | 36 |

These blocker identifiers are not executable `audit_event_code` values.

## Blocker

Exact audit codes map one-to-one to approved commands/operations and lifecycle edges. Those catalogs do not yet exist, so publishing names here would invent an authority. `PUBLISHED_AUDIT_EVENT_CODES=0`; `AUDIT_EVENT_CATALOG=BLOCKED`.
