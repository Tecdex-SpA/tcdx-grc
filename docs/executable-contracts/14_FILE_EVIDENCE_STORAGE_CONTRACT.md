# File and evidence storage contract

| Campo | Valor |
|---|---|
| Contract owner | Backend Owner / Security & Privacy Reviewer |
| Approving human roles | Architecture Owner, Backend Owner, Security & Privacy Reviewer, Data Model Owner |
| Status | `CONTRACT_DEFINED` |

## Authority split

MinIO/S3-compatible storage holds encrypted binary objects. PostgreSQL holds FileUploadIntent coordination plus final FileObject metadata, tenant ownership, permissions, classification, checksum, scan state, retention and evidence/document relations. Blob existence is not Evidence and object storage is not an authorization authority.

## Pipeline

`authorize request → persist FileUploadIntent and opaque quarantine key → short-lived signed upload → trusted size/MIME detection → malware scan → SHA-256 → promote and persist final FileObject → Document/Evidence version → submit/review`.

Before scan PASS the file is unavailable as evidence or download except tightly authorized security/quarantine handling. Scan failure/timeout is explicit; no valid empty fallback.

## Metadata and keys

Persist the exact metadata required by rector 24 and physical model. Object keys contain no tenant name, filename, email or sensitive business data. Tenant namespace is logical and enforced by metadata/access policy. Original filename is display metadata and never trusted as path/MIME.

## Access

Every upload/download verifies tenant + entitlement + permission + scope + object policy. Signed URLs are single-purpose and short-lived; the exact TTL is bounded security configuration approved before runtime and is not product authority. Full signed URLs are never logged/audited. Range/download behavior cannot bypass classification or expiry policy.

The public browser path is `https://grc.tecdex.net`: authenticated `PUT /api/v1/file-upload-intents/{id}/content` streams into the server-owned pending intent quarantine key, and authenticated `GET /api/v1/file-objects/{id}/content` streams a scan-PASS authorized final object. The browser receives a relative `upload_url`, never a private MinIO hostname or signed MinIO URL. Internal signed URLs may remain in the adapter for private operations. The backend enforces exact declared size, tenant and object policy, MIME and malware at finalization, safe Content-Disposition and no caller-selected bucket/key. No alternate storage is introduced.

## Evidence lineage

Document, DocumentVersion, Evidence, EvidenceVersion, EvidenceReview, FileUploadIntent and FileObject remain separate. FileUploadIntent is expirable pre-materialization coordination, never evidence or permanent alternate storage. EvidenceLink and EvidenceRequest use approved typed targets and same-tenant constraints. Evidence proving tenant implementation links the tenant Control; a global ControlVersion alone is insufficient. Expiry preserves history but changes current eligibility and may trigger only approved policies/events.

## Integrity/recovery

Checksum is verified at finalization and retrieval/restore procedures. Object versioning/backup is reconciled with PostgreSQL metadata. Missing/mismatched blob causes explicit dependency/source failure, not successful Evidence. Orphan quarantine cleanup and retention purge are idempotent, audited jobs honoring legal hold.

`FILE_EVIDENCE_STORAGE_CONTRACT=PASS` as a Phase 2 contract candidate.
