BEGIN;
INSERT INTO config.effective_configurations(effective_configuration_id,tenant_id,configuration_definition_id,control_version_id,resolved_at,effective_at,resolution_status,input_hash,effective_json_value) VALUES ('00000000-0000-7000-8000-000000000140','00000000-0000-7000-8000-000000000001','00000000-0000-7000-8000-000000000090','00000000-0000-7000-8000-000000000083','2026-01-01','2026-01-01','resolved','bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb','{"synthetic": true}'::jsonb);
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
