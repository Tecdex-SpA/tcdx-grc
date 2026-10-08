-- Explicit human-approved Phase 5 methodology binding amendment; no Phase 6.
DO $$ BEGIN
 IF current_database()<>'tcdx-grc' OR current_setting('server_version_num')::integer/10000<>16
 OR (SELECT count(*) FROM platform.schema_migrations WHERE outcome='applied')<>29
 OR (SELECT max(migration_id) FROM platform.schema_migrations WHERE outcome='applied')<>'20261007000100'
 OR (SELECT count(*) FROM iam.permissions WHERE lifecycle_state='published')<>170
 OR EXISTS(SELECT 1 FROM regulatory.requirement_assessments)
 OR EXISTS(SELECT 1 FROM controls.control_assessments)
 THEN RAISE EXCEPTION 'PHASE5_METHODOLOGY_PRECONDITION_FAILED'; END IF; END $$;

CREATE TABLE "regulatory"."compliance_methodologies" (
 "compliance_methodology_id" uuid NOT NULL,
 "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "created_by_user_identity_id" uuid,
 "created_by_service_principal_id" uuid,
 "ownership_class" varchar(24) NOT NULL,
 "tenant_id" uuid,
 "methodology_code" varchar(128) NOT NULL,
 "version_number" bigint NOT NULL,
 "name" text NOT NULL,
 "rector_source" text NOT NULL,
 "rector_version" varchar(128) NOT NULL,
 "formula_definition_id" uuid NOT NULL,
 "minimum_coverage" numeric(5,2) NOT NULL,
 "partial_compliance_factor" numeric(5,4) NOT NULL,
 "lifecycle_state" varchar(32) NOT NULL,
 "effective_from" timestamptz NOT NULL,
 "effective_to" timestamptz,
 "published_at" timestamptz,
 CONSTRAINT "pk_cm" PRIMARY KEY (compliance_methodology_id),
 CONSTRAINT "uq_cm_tenant_identity" UNIQUE NULLS NOT DISTINCT (tenant_id,compliance_methodology_id),
 CONSTRAINT "uq_cm_code_version" UNIQUE (methodology_code,version_number),
 CONSTRAINT "ck_cm_version" CHECK(version_number>0),
 CONSTRAINT "ck_cm_ownership" CHECK(ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL),
 CONSTRAINT "ck_cm_coverage" CHECK(minimum_coverage BETWEEN 0 AND 100),
 CONSTRAINT "ck_cm_interval" CHECK(effective_to IS NULL OR effective_to>effective_from),
 CONSTRAINT "ck_cm_publication" CHECK(lifecycle_state IN ('draft','published') AND ((lifecycle_state='published')=(published_at IS NOT NULL))),
 CONSTRAINT "ck_cm_actor" CHECK(num_nonnulls(created_by_user_identity_id,created_by_service_principal_id)<=1),
 CONSTRAINT "fk_cm_tenant" FOREIGN KEY(tenant_id) REFERENCES platform.tenants(tenant_id),
 CONSTRAINT "fk_cm_user" FOREIGN KEY(created_by_user_identity_id) REFERENCES iam.user_identities(user_identity_id),
 CONSTRAINT "fk_cm_service" FOREIGN KEY(created_by_service_principal_id) REFERENCES iam.service_principals(service_principal_id),
 CONSTRAINT "fk_cm_formula" FOREIGN KEY(formula_definition_id) REFERENCES data.formula_definitions(formula_definition_id),
 CONSTRAINT "ck_cm_partial" CHECK(partial_compliance_factor BETWEEN 0 AND 1)
);

CREATE INDEX "ix_cm_selection" ON regulatory.compliance_methodologies(lifecycle_state,effective_from,compliance_methodology_id);

INSERT INTO data.formula_definitions(formula_definition_id,ownership_class,formula_code,version_number,name,expression_language,expression,output_unit,lifecycle_state,effective_from,published_at) VALUES('01a11900-0000-7001-8000-000000000003','GLOBAL_REFERENCE','BASELINE_COMPLIANCE',1,'Compliance rector baseline','TCDX_DETERMINISTIC_EXPRESSION_V1','compliance_score=sum(weight*status_factor)/sum(weight_of_scored_applicable_requirements)*100;coverage=scored_applicable_requirements/applicable_requirements*100;partial_compliance_factor=methodology.partial_compliance_factor','percent','published',transaction_timestamp(),transaction_timestamp());

INSERT INTO regulatory.compliance_methodologies(compliance_methodology_id,ownership_class,methodology_code,version_number,name,rector_source,rector_version,formula_definition_id,minimum_coverage,partial_compliance_factor,lifecycle_state,effective_from,published_at) VALUES('01a11900-0000-7001-8000-000000000001','PLATFORM_CONTROL','BASELINE_COMPLIANCE',1,'Compliance rector baseline','rector 17/19/31/38/39; PHASE5_METHODOLOGY_BINDING_ARCHITECTURE_DECISION_20261007','TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23','01a11900-0000-7001-8000-000000000003',80,0.50,'published',transaction_timestamp(),transaction_timestamp());

ALTER TABLE regulatory.requirement_assessments ADD CONSTRAINT "fk_cm_assessment_method" FOREIGN KEY(methodology_version_ref) REFERENCES regulatory.compliance_methodologies(compliance_methodology_id);

INSERT INTO iam.permissions(permission_id,permission_code,domain_code,resource_code,action_code,lifecycle_state) VALUES(('01a11900-0000-7'||substr(md5('compliance.methodology.read'),1,3)||'-8'||substr(md5('compliance.methodology.read'),4,3)||'-'||substr(md5('compliance.methodology.read'),7,12))::uuid,'compliance.methodology.read','compliance','methodology','read','published');

INSERT INTO iam.role_permissions(role_permission_id,ownership_class,tenant_id,role_id,permission_id) SELECT ('01a11901-0000-7'||substr(md5(rp.role_id::text||':compliance.methodology.read'),1,3)||'-8'||substr(md5(rp.role_id::text||':compliance.methodology.read'),4,3)||'-'||substr(md5(rp.role_id::text||':compliance.methodology.read'),7,12))::uuid,rp.ownership_class,rp.tenant_id,rp.role_id,p.permission_id FROM iam.role_permissions rp JOIN iam.permissions source ON source.permission_id=rp.permission_id JOIN iam.roles r ON r.role_id=rp.role_id CROSS JOIN iam.permissions p WHERE source.permission_code='compliance.requirement_assessment.create' AND r.lifecycle_state='published' AND r.role_code<>'PLATFORM_ADMIN' AND p.permission_code='compliance.methodology.read';

INSERT INTO ops_audit.audit_events(audit_event_id,ownership_class,correlation_id,event_code,event_version,aggregate_type,aggregate_id,command_code,occurred_at,outcome,after_payload,classification) VALUES(('01a11902-0000-7'||substr(md5('compliance'),1,3)||'-8'||substr(md5('compliance'),4,3)||'-'||substr(md5('compliance'),7,12))::uuid,'PLATFORM_CONTROL','01a11900-0000-7001-8000-000000000005','audit.compliance.methodology.publish.v1',1,'ComplianceMethodology','01a11900-0000-7001-8000-000000000001','migration.20261007000200',transaction_timestamp(),'success',jsonb_build_object('methodology_version_ref','01a11900-0000-7001-8000-000000000001','version_number',1,'formula_definition_id','01a11900-0000-7001-8000-000000000003','actor_kind','governed_migration','database_actor',current_user,'approval','Aprobar enmienda y ejecutar hasta cierre'),'internal');

CREATE FUNCTION regulatory.cm_preserve_published_methodology() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.lifecycle_state='published' THEN IF TG_OP='DELETE' THEN RAISE EXCEPTION 'PUBLISHED_METHODOLOGY_IMMUTABLE'; END IF; IF (to_jsonb(NEW)-'effective_to') IS DISTINCT FROM (to_jsonb(OLD)-'effective_to') THEN RAISE EXCEPTION 'PUBLISHED_METHODOLOGY_IMMUTABLE'; END IF; END IF; RETURN NEW; END $$;
CREATE TRIGGER cm_published_immutable BEFORE UPDATE OR DELETE ON regulatory.compliance_methodologies FOR EACH ROW EXECUTE FUNCTION regulatory.cm_preserve_published_methodology();

CREATE TABLE "controls"."control_effectiveness_methodologies" (
 "control_effectiveness_methodology_id" uuid NOT NULL,
 "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "created_by_user_identity_id" uuid,
 "created_by_service_principal_id" uuid,
 "ownership_class" varchar(24) NOT NULL,
 "tenant_id" uuid,
 "methodology_code" varchar(128) NOT NULL,
 "version_number" bigint NOT NULL,
 "name" text NOT NULL,
 "rector_source" text NOT NULL,
 "rector_version" varchar(128) NOT NULL,
 "formula_definition_id" uuid NOT NULL,
 "minimum_coverage" numeric(5,2) NOT NULL,
 "lifecycle_state" varchar(32) NOT NULL,
 "effective_from" timestamptz NOT NULL,
 "effective_to" timestamptz,
 "published_at" timestamptz,
 CONSTRAINT "pk_cem" PRIMARY KEY (control_effectiveness_methodology_id),
 CONSTRAINT "uq_cem_tenant_identity" UNIQUE NULLS NOT DISTINCT (tenant_id,control_effectiveness_methodology_id),
 CONSTRAINT "uq_cem_code_version" UNIQUE (methodology_code,version_number),
 CONSTRAINT "ck_cem_version" CHECK(version_number>0),
 CONSTRAINT "ck_cem_ownership" CHECK(ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL),
 CONSTRAINT "ck_cem_coverage" CHECK(minimum_coverage BETWEEN 0 AND 100),
 CONSTRAINT "ck_cem_interval" CHECK(effective_to IS NULL OR effective_to>effective_from),
 CONSTRAINT "ck_cem_publication" CHECK(lifecycle_state IN ('draft','published') AND ((lifecycle_state='published')=(published_at IS NOT NULL))),
 CONSTRAINT "ck_cem_actor" CHECK(num_nonnulls(created_by_user_identity_id,created_by_service_principal_id)<=1),
 CONSTRAINT "fk_cem_tenant" FOREIGN KEY(tenant_id) REFERENCES platform.tenants(tenant_id),
 CONSTRAINT "fk_cem_user" FOREIGN KEY(created_by_user_identity_id) REFERENCES iam.user_identities(user_identity_id),
 CONSTRAINT "fk_cem_service" FOREIGN KEY(created_by_service_principal_id) REFERENCES iam.service_principals(service_principal_id),
 CONSTRAINT "fk_cem_formula" FOREIGN KEY(formula_definition_id) REFERENCES data.formula_definitions(formula_definition_id)
);

CREATE INDEX "ix_cem_selection" ON controls.control_effectiveness_methodologies(lifecycle_state,effective_from,control_effectiveness_methodology_id);

INSERT INTO data.formula_definitions(formula_definition_id,ownership_class,formula_code,version_number,name,expression_language,expression,output_unit,lifecycle_state,effective_from,published_at) VALUES('01a11900-0000-7001-8000-000000000004','GLOBAL_REFERENCE','BASELINE_CONTROL_EFFECTIVENESS',1,'Control effectiveness rector baseline','TCDX_DETERMINISTIC_EXPRESSION_V1','overall_effectiveness=min(design_effectiveness,operating_effectiveness)','percent','published',transaction_timestamp(),transaction_timestamp());

INSERT INTO controls.control_effectiveness_methodologies(control_effectiveness_methodology_id,ownership_class,methodology_code,version_number,name,rector_source,rector_version,formula_definition_id,minimum_coverage,lifecycle_state,effective_from,published_at) VALUES('01a11900-0000-7001-8000-000000000002','PLATFORM_CONTROL','BASELINE_CONTROL_EFFECTIVENESS',1,'Control effectiveness rector baseline','rector 17/19/31/38/39; PHASE5_METHODOLOGY_BINDING_ARCHITECTURE_DECISION_20261007','TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23','01a11900-0000-7001-8000-000000000004',80,'published',transaction_timestamp(),transaction_timestamp());

ALTER TABLE controls.control_assessments ADD CONSTRAINT "fk_cem_assessment_method" FOREIGN KEY(methodology_version_ref) REFERENCES controls.control_effectiveness_methodologies(control_effectiveness_methodology_id);

INSERT INTO iam.permissions(permission_id,permission_code,domain_code,resource_code,action_code,lifecycle_state) VALUES(('01a11900-0000-7'||substr(md5('controls.methodology.read'),1,3)||'-8'||substr(md5('controls.methodology.read'),4,3)||'-'||substr(md5('controls.methodology.read'),7,12))::uuid,'controls.methodology.read','controls','methodology','read','published');

INSERT INTO iam.role_permissions(role_permission_id,ownership_class,tenant_id,role_id,permission_id) SELECT ('01a11901-0000-7'||substr(md5(rp.role_id::text||':controls.methodology.read'),1,3)||'-8'||substr(md5(rp.role_id::text||':controls.methodology.read'),4,3)||'-'||substr(md5(rp.role_id::text||':controls.methodology.read'),7,12))::uuid,rp.ownership_class,rp.tenant_id,rp.role_id,p.permission_id FROM iam.role_permissions rp JOIN iam.permissions source ON source.permission_id=rp.permission_id JOIN iam.roles r ON r.role_id=rp.role_id CROSS JOIN iam.permissions p WHERE source.permission_code='controls.control_assessment.create' AND r.lifecycle_state='published' AND r.role_code<>'PLATFORM_ADMIN' AND p.permission_code='controls.methodology.read';

INSERT INTO ops_audit.audit_events(audit_event_id,ownership_class,correlation_id,event_code,event_version,aggregate_type,aggregate_id,command_code,occurred_at,outcome,after_payload,classification) VALUES(('01a11902-0000-7'||substr(md5('controls'),1,3)||'-8'||substr(md5('controls'),4,3)||'-'||substr(md5('controls'),7,12))::uuid,'PLATFORM_CONTROL','01a11900-0000-7001-8000-000000000005','audit.controls.methodology.publish.v1',1,'ControlEffectivenessMethodology','01a11900-0000-7001-8000-000000000002','migration.20261007000200',transaction_timestamp(),'success',jsonb_build_object('methodology_version_ref','01a11900-0000-7001-8000-000000000002','version_number',1,'formula_definition_id','01a11900-0000-7001-8000-000000000004','actor_kind','governed_migration','database_actor',current_user,'approval','Aprobar enmienda y ejecutar hasta cierre'),'internal');

CREATE FUNCTION controls.cem_preserve_published_methodology() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.lifecycle_state='published' THEN IF TG_OP='DELETE' THEN RAISE EXCEPTION 'PUBLISHED_METHODOLOGY_IMMUTABLE'; END IF; IF (to_jsonb(NEW)-'effective_to') IS DISTINCT FROM (to_jsonb(OLD)-'effective_to') THEN RAISE EXCEPTION 'PUBLISHED_METHODOLOGY_IMMUTABLE'; END IF; END IF; RETURN NEW; END $$;
CREATE TRIGGER cem_published_immutable BEFORE UPDATE OR DELETE ON controls.control_effectiveness_methodologies FOR EACH ROW EXECUTE FUNCTION controls.cem_preserve_published_methodology();

DO $$ BEGIN IF (SELECT count(*) FROM iam.permissions WHERE lifecycle_state='published')<>172 THEN RAISE EXCEPTION 'PHASE5_METHODOLOGY_PERMISSION_POSTCONDITION_FAILED'; END IF; END $$;

CREATE FUNCTION data.preserve_phase5_published_method_formula() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.lifecycle_state='published' AND (EXISTS(SELECT 1 FROM regulatory.compliance_methodologies WHERE formula_definition_id=OLD.formula_definition_id) OR EXISTS(SELECT 1 FROM controls.control_effectiveness_methodologies WHERE formula_definition_id=OLD.formula_definition_id)) THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'PUBLISHED_METHODOLOGY_FORMULA_IMMUTABLE'; END IF;
  IF (to_jsonb(NEW)-'effective_to') IS DISTINCT FROM (to_jsonb(OLD)-'effective_to') THEN RAISE EXCEPTION 'PUBLISHED_METHODOLOGY_FORMULA_IMMUTABLE'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER phase5_method_formula_immutable BEFORE UPDATE OR DELETE ON data.formula_definitions FOR EACH ROW EXECUTE FUNCTION data.preserve_phase5_published_method_formula();
