BEGIN;
UPDATE knowledge.knowledge_versions SET lifecycle_state='published',published_at=now(),effective_from='2026-01-01' WHERE knowledge_version_id='00000000-0000-7000-8000-000000000030';DELETE FROM knowledge.knowledge_versions WHERE knowledge_version_id='00000000-0000-7000-8000-000000000030';
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
