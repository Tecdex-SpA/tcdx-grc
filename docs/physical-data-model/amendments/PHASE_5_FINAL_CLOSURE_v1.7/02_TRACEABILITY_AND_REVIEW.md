# Phase 5 final closure physical traceability and review

| approved decision | physical/runtime realization | authority preserved |
|---|---|---|
| durable pre-materialization upload | `evidence.file_upload_intents` | `FileObject` remains final object authority |
| unique fulfillment audit code | lifecycle definition v2 only; no new table | `ops_audit.audit_events` remains audit authority |
| submit scope `owned_object` / `tenant` | lifecycle definition v3 scopes only; no assignee column | Control ownership and IAM remain authoritative |

```text
PHYSICAL_MODEL_AMENDMENT=PASS
NEW_CANONICAL_TABLES=1
ALTERED_DOMAIN_TABLES=0
LIFECYCLE_DEFINITION_ROWS_ADDED=2
SECOND_AUTHORITY=0
GENERIC_POLYMORPHIC_REFERENCE=0
JSONB_SEMANTIC_SHORTCUT=0
FAKE_TENANT=0
SECRETS_IN_DATABASE=0
```
