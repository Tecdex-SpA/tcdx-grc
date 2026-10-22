BEGIN;
INSERT INTO config.configuration_overrides(configuration_override_id,ownership_class,tenant_id,configuration_definition_id,override_version,scope_level,control_version_id,supersedes_configuration_override_id,lifecycle_state,effective_from,effective_to,json_value) VALUES ('00000000-0000-7000-8000-000000000120','TENANT_OWNED','00000000-0000-7000-8000-000000000001','00000000-0000-7000-8000-000000000090',1,'control_version','00000000-0000-7000-8000-000000000081',NULL,'approved','2026-01-01','2030-01-01','{"synthetic": true}'::jsonb);UPDATE config.configuration_overrides SET json_value='{}';
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
