BEGIN;
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
ALTER TABLE regulatory.requirement_assessments ADD CONSTRAINT "fk_cm_assessment_method" FOREIGN KEY(methodology_version_ref) REFERENCES regulatory.compliance_methodologies(compliance_methodology_id);
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
ALTER TABLE controls.control_assessments ADD CONSTRAINT "fk_cem_assessment_method" FOREIGN KEY(methodology_version_ref) REFERENCES controls.control_effectiveness_methodologies(control_effectiveness_methodology_id);
CREATE FUNCTION controls.cem_preserve_published_methodology() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.lifecycle_state='published' THEN IF TG_OP='DELETE' THEN RAISE EXCEPTION 'PUBLISHED_METHODOLOGY_IMMUTABLE'; END IF; IF (to_jsonb(NEW)-'effective_to') IS DISTINCT FROM (to_jsonb(OLD)-'effective_to') THEN RAISE EXCEPTION 'PUBLISHED_METHODOLOGY_IMMUTABLE'; END IF; END IF; RETURN NEW; END $$;
CREATE TRIGGER cem_published_immutable BEFORE UPDATE OR DELETE ON controls.control_effectiveness_methodologies FOR EACH ROW EXECUTE FUNCTION controls.cem_preserve_published_methodology();
CREATE FUNCTION data.preserve_phase5_published_method_formula() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.lifecycle_state='published' AND (EXISTS(SELECT 1 FROM regulatory.compliance_methodologies WHERE formula_definition_id=OLD.formula_definition_id) OR EXISTS(SELECT 1 FROM controls.control_effectiveness_methodologies WHERE formula_definition_id=OLD.formula_definition_id)) THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'PUBLISHED_METHODOLOGY_FORMULA_IMMUTABLE'; END IF;
  IF (to_jsonb(NEW)-'effective_to') IS DISTINCT FROM (to_jsonb(OLD)-'effective_to') THEN RAISE EXCEPTION 'PUBLISHED_METHODOLOGY_FORMULA_IMMUTABLE'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER phase5_method_formula_immutable BEFORE UPDATE OR DELETE ON data.formula_definitions FOR EACH ROW EXECUTE FUNCTION data.preserve_phase5_published_method_formula();
COMMIT;