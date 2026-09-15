# File and evidence storage contract

| Campo | Valor |
|---|---|
| Contract owner | Backend Owner / Security & Privacy Reviewer |
| Approving human roles | Architecture Owner, Backend Owner, Security & Privacy Reviewer, Data Model Owner |
| Status | `CONTRACT_DEFINED_PENDING_OPERATION_APPROVAL` |

## Authority split

MinIO/S3-compatible storage holds encrypted binary objects. PostgreSQL holds FileObject metadata, tenant ownership, permissions, classification, checksum, scan state, retention and evidence/document relations. Blob existence is not Evidence and object storage is not an authorization authority.

## Pipeline

`authorize request → allocate opaque tenant-bound FileObject/quarantine key → short-lived signed upload → verify declared/detected MIME and size → malware scan → SHA-256 → durable store/version → classify/retention → Document/Evidence version → submit/review`.

Before scan PASS the file is unavailable as evidence or download except tightly authorized security/quarantine handling. Scan failure/timeout is explicit; no valid empty fallback.

## Metadata and keys

Persist the exact metadata required by rector 24 and physical model. Object keys contain no tenant name, filename, email or sensitive business data. Tenant namespace is logical and enforced by metadata/access policy. Original filename is display metadata and never trusted as path/MIME.

## Access

Every upload/download verifies tenant + entitlement + permission + scope + object policy. Signed URLs are single-purpose/short-lived; their exact TTL is HUMAN_DECISION_REQUIRED because no rector duration exists. Full signed URLs are never logged/audited. Range/download behavior cannot bypass classification or expiry policy.

## Evidence lineage

Document, DocumentVersion, Evidence, EvidenceVersion, EvidenceReview and FileObject remain separate. EvidenceLink and EvidenceRequest use approved typed targets and same-tenant constraints. Evidence proving tenant implementation links the tenant Control; a global ControlVersion alone is insufficient. Expiry preserves history but changes current eligibility and may trigger only approved policies/events.

## Integrity/recovery

Checksum is verified at finalization and retrieval/restore procedures. Object versioning/backup is reconciled with PostgreSQL metadata. Missing/mismatched blob causes explicit dependency/source failure, not successful Evidence. Orphan quarantine cleanup and retention purge are idempotent, audited jobs honoring legal hold.
