BEGIN;
INSERT INTO regulatory.requirement_applicabilities(requirement_applicability_id,tenant_id,requirement_id,applicability_version,applicability_decision,rationale,lifecycle_state,effective_from,context_knowledge_version_id) VALUES ('00000000-0000-7000-8000-000000000160','00000000-0000-7000-8000-000000000001','00000000-0000-7000-8000-000000000070',160,'applicable','Synthetic only','approved','2026-01-01','00000000-0000-7000-8000-000000000031');UPDATE regulatory.requirement_applicabilities SET context_knowledge_version_id=NULL;
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
