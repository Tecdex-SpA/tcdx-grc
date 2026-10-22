BEGIN;
INSERT INTO knowledge.knowledge_version_context_links(knowledge_version_context_link_id,created_by_user_identity_id,ownership_class,tenant_id,knowledge_version_id,context_role,source_locator,provenance_ref,control_version_id) VALUES ('00000000-0000-7000-8000-000000000100','00000000-0000-7000-8000-000000000003','TENANT_OWNED','00000000-0000-7000-8000-000000000001','00000000-0000-7000-8000-000000000031','comprender','synthetic:1','synthetic:fixture','00000000-0000-7000-8000-000000000081');
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
