# FileUploadIntent physical model

| Object | Physical representation | Profile | Columns | Integrity |
|---|---|---|---|---|
| `FileUploadIntent` | `evidence.file_upload_intents` | `TM / TENANT_OWNED` | UUIDv7 PK and tenant/actor/mutable-profile columns; `purpose`; `original_filename`; untrusted `declared_mime`; `expected_size_bytes`; `classification`; `retention_policy_id`; request `source_provenance` and optional effective interval carried forward unchanged to the final FileObject; opaque `quarantine_object_key`; lifecycle; mandatory `expires_at`; upload/scan/promotion/rejection/cancellation timestamps; nullable final `file_object_id` | same-tenant RetentionPolicy and final FileObject FKs; UQ tenant+PK; global UQ quarantine key; final FileObject linked at most once; closed states; timestamp/state coherence; size nonnegative; valid effective interval; expiry after creation; row-version CAS |

Lifecycle is closed to `pending_upload | quarantined | scanning | promoted | rejected | expired | cancelled`. `purpose=evidence_document` is the closed discrimination for the existing Evidence/Documents upload command; bucket, key and tenant are never client-selected. Only `promoted` may contain `file_object_id` and `promoted_at`; terminal rejection/expiry/cancellation never does.

`quarantine_object_key` and the final FileObject key are opaque server-generated values. The table contains neither binary content nor access key, secret key, signed URL, encryption key material or malware-scanner credential. The final `FileObject` remains distinct and is inserted only with actual detected MIME, size, SHA-256, scan PASS and storage/encryption metadata.
