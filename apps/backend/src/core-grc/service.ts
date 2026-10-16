import {captureVocabularyWrites,buildVocabularyProvenance} from "./vocabulary-provenance.js";
import { createHash } from "node:crypto";
import { CompiledQuery, sql, type Transaction } from "kysely";
import { validate as validateUuid } from "uuid";
import { CONTROL_NATURES, CONTROL_TYPES, type ScopeKind } from "@tcdx-grc/shared-types";
import { REQUEST_VOCABULARIES } from "@tcdx-grc/contracts";
import { assertAssignableMembership, assertSelectableFramework } from "./reference-reads.js";
import { newUuidV7 } from "../uuid.js";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import { packVisibility } from "../regulatory/pack-entitlement.js";
import type { AuthorizedFileAccess, FileStoragePort } from "../ports/file-storage.js";
import { claimIdempotency, completeIdempotency, persistAuditEvent, persistOutboxEvent } from "../persistence/foundation-records.js";
import type { CoreActor, ResourceKey } from "./model.js";
import { resolveMethodology } from "./methodologies.js";
import { resources } from "./model.js";
import { assertLifecycleEdge, grantedScopes, requireAccess } from "./security.js";
import { casRetentionPolicyTransition, casRetentionPolicyUpdate, casTransition, detailResource, getResource, insertRow } from "./repository.js";
import { assertUploadRetention, assertInitialSourceCustody, assertOrdinaryEvidence, assertLegalSource, lockRetentionTenant } from "./initial-retention-source.js";

type Body = Record<string, unknown>;
type MutationResult = {
  resource: ResourceKey;
  id: string;
  response?: Record<string, unknown>;
  auditAfter?: Record<string, unknown>;
  auditBefore?: Record<string, unknown>;
  auditOutcome?: "success" | "failure";
  deferredError?: FoundationError;
  afterCommit?: () => Promise<void>;
  rollbackExternal?: () => Promise<void>;
};
type MutationContext = {
  transaction: Transaction<FoundationDatabase>;
  actor: CoreActor;
  body: Body;
  auditEventId?: string;
  correlationId?: string;
  fileStorage?: FileStoragePort;
  targetId?: string;
  parentId?: string;
};

export type MutationDefinition = {
  operationId: string;
  permission: string;
  capability: string;
  scopes: readonly ScopeKind[];
  auditEvent: string;
  domainEvent?: string;
  allowedFields: readonly string[];
  requiredFields: readonly string[];
  execute(context: MutationContext): Promise<MutationResult>;
  replay?(context: MutationContext, result: { resource: ResourceKey; id: string }): Promise<{ response: Record<string, unknown>; afterCommit?: () => Promise<void> }>;
};

export function validatePublishedVocabulary(operationId: string, body: Body): void {
 const fields=(REQUEST_VOCABULARIES as Readonly<Record<string,Readonly<Record<string,readonly string[]>>>>)[operationId];
 for(const [path,values] of Object.entries(fields??{})) {
  const [field,nested]=path.split("[].");
  if(nested) {const array=body[field!]; if(array===undefined) continue; if(!Array.isArray(array)) invalidField(field!); for(const item of array) {if(!item || typeof item!=="object" || Array.isArray(item) || !values.includes(item[nested])) invalidField(path);}}
  else if(Object.hasOwn(body,path) && (typeof body[path]!=="string" || !values.includes(body[path] as string))) invalidField(path);
 }
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Body).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

function hash(value: unknown): string { return createHash("sha256").update(canonical(value)).digest("hex"); }

function string(body: Body, key: string): string {
  const value = body[key];
  if (typeof value !== "string" || value.length === 0) throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field: key });
  return value;
}

function optionalString(body: Body, key: string): string | null {
  const value = body[key];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field: key });
  return value;
}

function number(body: Body, key: string): number {
  const value = body[key];
  if (typeof value !== "number" || !Number.isFinite(value)) throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field: key });
  return value;
}

function optionalNumber(body: Body, key: string): number | null {
  if (body[key] === undefined || body[key] === null) return null;
  return number(body, key);
}

function version(body: Body): number {
  const value = number(body, "expected_version");
  if (!Number.isSafeInteger(value) || value < 1) throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field: "expected_version" });
  return value;
}

function validateClosedBody(definition: MutationDefinition, body: Body): void {
  if (!body || Array.isArray(body) || typeof body !== "object") throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400);
  const allowed = new Set(definition.allowedFields);
  const unknown = Object.keys(body).find((key) => !allowed.has(key));
  const missing = definition.requiredFields.find((key) => body[key] === undefined || body[key] === null || body[key] === "");
  if (unknown || missing) throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field: unknown ?? missing });
  validatePublishedVocabulary(definition.operationId, body);
  for (const [field, value] of Object.entries(body)) validateField(field, value);
  if (definition.operationId === "soaCreate") validateObjectArray(body.items, "items", soaItemFields, ["reference_control_version_id", "applicability_decision", "justification", "implementation_state"]);
  if (definition.operationId === "applicabilityCreate") {
    if (body.applicability_decision !== "applicable" && body.applicability_decision !== "not_applicable") invalidField("applicability_decision");
    if (body.applicability_decision === "not_applicable" &&
        (typeof body.rationale !== "string" || !body.rationale.trim())) invalidField("rationale");
  }
  if (definition.operationId === "assuranceTestExecute" && body.samples !== undefined) validateObjectArray(body.samples, "samples", assuranceSampleFields, ["sample_code", "sample_count", "selection_method", "result_status"]);
  if (definition.operationId === "evidenceCreate") validateObjectArray(body.links, "links", evidenceLinkFields, []);
  for (const [start, end] of [["effective_from", "effective_to"], ["valid_from", "valid_to"], ["period_start", "period_end"]] as const) {
    if (typeof body[start] === "string" && typeof body[end] === "string" && Date.parse(body[end]) <= Date.parse(body[start])) invalidField(end);
  }
  if (definition.operationId === "assuranceTestExecute" && Array.isArray(body.samples)) {
    for (let index = 0; index < body.samples.length; index += 1) {
      const sample = body.samples[index] as Body;
      if (typeof sample.population_count === "number" && typeof sample.sample_count === "number" && sample.sample_count > sample.population_count) invalidField(`samples[${index}].sample_count`);
      if (typeof sample.sample_period_start === "string" && typeof sample.sample_period_end === "string" && Date.parse(sample.sample_period_end) <= Date.parse(sample.sample_period_start)) invalidField(`samples[${index}].sample_period_end`);
    }
  }
}

const resultStatuses = new Set(["valid", "no_data", "insufficient_data", "insufficient_coverage", "stale_source", "conflicting_sources", "dependency_pending", "invalid_input", "source_error", "calculation_error", "not_applicable", "superseded"]);
const uuidFields = new Set([
  "requirement_id", "scope_subject_id", "requirement_applicability_id", "methodology_version_ref", "effective_configuration_id", "framework_version_id",
  "reference_control_version_id", "tenant_control_id", "tenant_control_version_id", "based_on_control_version_id", "business_owner_subject_id", "control_id",
  "control_version_id", "assigned_membership_id", "assurance_test_id", "retention_policy_id", "retention_policy_applicability_id", "processing_activity_id", "file_object_id", "evidence_version_id", "issue_id",
  "requirement_assessment_id", "control_assessment_id"
]);
const timestampFields = new Set(["effective_from", "effective_to", "planned_at", "due_at", "valid_from", "valid_to", "period_start", "period_end", "expires_at", "sample_period_start", "sample_period_end"]);
const dateFields = new Set(["due_date"]);
const percentageFields = new Set(["coverage_percent", "design_effectiveness", "operating_effectiveness"]);
const integerFields = new Set(["expected_version", "population_count", "sample_count", "size_bytes", "version_number", "retention_seconds", "precedence_rank"]);
const maxLengths: Record<string, number> = {
  applicability_decision: 32, control_code: 160, control_type: 32, nature: 32, frequency_code: 64, suggested_owner_role_code: 96,
  test_code: 128, sample_code: 128, selection_method: 64, request_code: 128, evidence_code: 128, evidence_type: 64, source_kind: 32,
  sufficiency: 32, relevance: 32, issue_code: 128, issue_kind: 32, severity: 32, priority: 32, origin_role: 32, action_code: 128,
  link_role: 32, implementation_state: 32, declared_mime: 255, classification: 32, policy_code: 128, policy_kind: 32, trigger_event_code: 96
};
const enumFields: Record<string, ReadonlySet<string>> = {
  result_status: resultStatuses,
  domain_conclusion: new Set(["not_assessed", "compliant", "partially_compliant", "non_compliant", "not_applicable", "insufficient_evidence", "effective", "partially_effective", "ineffective", "not_tested"]),
  control_type: new Set(CONTROL_TYPES),
  nature: new Set(CONTROL_NATURES),
  issue_kind: new Set(["finding", "non_conformity", "gap", "exception", "audit_observation"]),
  verification_decision: new Set(["accepted"]),
  classification: new Set(["public", "internal", "confidential", "restricted"])
};
const soaItemFields = new Set(["reference_control_version_id", "applicability_decision", "justification", "implementation_state", "tenant_control_id", "tenant_control_version_id"]);
const assuranceSampleFields = new Set(["sample_code", "population_count", "sample_count", "selection_method", "sample_period_start", "sample_period_end", "result_status"]);
const evidenceLinkFields = new Set(["requirement_id", "control_id", "control_version_id", "requirement_assessment_id", "control_assessment_id", "assurance_test_id", "claim", "effective_from", "effective_to"]);

function invalidField(field: string): never {
  throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field });
}

function validateField(field: string, value: unknown): void {
  if (value === null || value === undefined) invalidField(field);
  if (uuidFields.has(field) && (typeof value !== "string" || !validateUuid(value))) invalidField(field);
  if (timestampFields.has(field) && (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T.+Z$/.test(value) || Number.isNaN(Date.parse(value)))) invalidField(field);
  if (dateFields.has(field) && (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) !== value)) invalidField(field);
  if (percentageFields.has(field) && (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100)) invalidField(field);
  if (integerFields.has(field) && (typeof value !== "number" || !Number.isSafeInteger(value) || value < (field === "expected_version" ? 1 : 0))) invalidField(field);
  if (typeof value === "string" && value.length === 0) invalidField(field);
  if (maxLengths[field] !== undefined && (typeof value !== "string" || value.length > maxLengths[field]!)) invalidField(field);
  const values = enumFields[field];
  if (values && (typeof value !== "string" || !values.has(value))) invalidField(field);
}

function validateObjectArray(value: unknown, field: string, allowed: ReadonlySet<string>, required: readonly string[]): void {
  if (!Array.isArray(value)) invalidField(field);
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
    const itemField = `${field}[${index}]`;
    if (!item || Array.isArray(item) || typeof item !== "object") invalidField(itemField);
    const record = item as Body;
    const unknown = Object.keys(record).find((key) => !allowed.has(key));
    const missing = required.find((key) => record[key] === undefined || record[key] === null || record[key] === "");
    if (unknown || missing) invalidField(`${itemField}.${unknown ?? missing}`);
    for (const [key, nested] of Object.entries(record)) validateField(key, nested);
  }
}

async function referenceExists(tx: Transaction<FoundationDatabase>, table: string, idColumn: string, id: string, tenantId: string, globalAllowed = false,
  runtimeEnvironment: CoreActor["runtimeEnvironment"] = "production"): Promise<void> {
  const values: unknown[] = [id, tenantId];
  let predicate = globalAllowed ? "(tenant_id IS NULL OR tenant_id=$2::uuid)" : "tenant_id=$2::uuid";
  if (globalAllowed && ["regulatory.requirements", "regulatory.framework_versions", "controls.control_versions"].includes(table)) {
    const visibility = await packVisibility(tx, tenantId, runtimeEnvironment);
    const allowed = table === "controls.control_versions"
      ? [...visibility.globalControlVersionIds] : [...visibility.frameworkVersionIds];
    values.push(allowed);
    const scope = table === "regulatory.requirements" ? "framework_version_id" : idColumn;
    predicate = `(tenant_id=$2::uuid OR (tenant_id IS NULL AND ${scope}=ANY($3::uuid[])))`;
  }
  const result = await tx.executeQuery<{ found: number }>(CompiledQuery.raw(`SELECT 1 AS found FROM ${table} WHERE "${idColumn}"=$1::uuid AND ${predicate}`, values));
  if (!result.rows[0]) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
}

async function assertSelectableSubject(tx: Transaction<FoundationDatabase>, subjectId: string, tenantId: string): Promise<void> {
  const result = await sql<{ subject_id: string }>`
    SELECT subject_id FROM org.subjects
     WHERE subject_id=${subjectId}::uuid AND tenant_id=${tenantId}::uuid
       AND lifecycle_state='active' AND superseded_by_subject_id IS NULL
       AND effective_from<=transaction_timestamp()
       AND (effective_to IS NULL OR effective_to>transaction_timestamp())
  `.execute(tx);
  if (result.rows.length !== 1) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
}

async function assertTenantMembership(tx: Transaction<FoundationDatabase>, membershipId: string, tenantId: string): Promise<void> {
  await assertAssignableMembership(tx, tenantId, membershipId);
}

async function assertControlVersion(tx: Transaction<FoundationDatabase>, controlId: string, controlVersionId: string, tenantId: string): Promise<void> {
  const result = await sql<{ found: number }>`
    SELECT 1 AS found FROM controls.control_versions
     WHERE tenant_id=${tenantId}::uuid AND control_id=${controlId}::uuid AND control_version_id=${controlVersionId}::uuid
  `.execute(tx);
  if (!result.rows[0]) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
}

async function assertEligibleEvidenceVersion(tx: Transaction<FoundationDatabase>, evidenceVersionId: string, tenantId: string): Promise<void> {
  await assertOrdinaryEvidence(tx, tenantId, evidenceVersionId);
  const result = await sql<{ lifecycle_state: string; scan_status: string | null }>`
    SELECT ev.lifecycle_state,fo.scan_status
      FROM evidence.evidence_versions ev
      LEFT JOIN evidence.file_objects fo ON fo.tenant_id=ev.tenant_id AND fo.file_object_id=ev.file_object_id
     WHERE ev.tenant_id=${tenantId}::uuid AND ev.evidence_version_id=${evidenceVersionId}::uuid
  `.execute(tx);
  const row = result.rows[0];
  if (!row) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
  if (row.lifecycle_state !== "approved" || (row.scan_status !== null && row.scan_status !== "passed")) {
    throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Evidence version is not eligible", 422);
  }
}

async function assertEvidenceVersionSubmittable(tx: Transaction<FoundationDatabase>, evidenceVersionId: string, actor: CoreActor): Promise<void> {
  const result = await sql<{ scan_status: string | null; link_count: string; retention_policy_applicability_id: string | null; created_by_user_identity_id: string | null }>`
    SELECT fo.scan_status,COUNT(el.evidence_link_id)::text AS link_count,
           ev.retention_policy_applicability_id,ev.created_by_user_identity_id
      FROM evidence.evidence_versions ev
      LEFT JOIN evidence.file_objects fo ON fo.tenant_id=ev.tenant_id AND fo.file_object_id=ev.file_object_id
      LEFT JOIN evidence.evidence_links el ON el.tenant_id=ev.tenant_id AND el.evidence_version_id=ev.evidence_version_id
     WHERE ev.tenant_id=${actor.tenantId}::uuid AND ev.evidence_version_id=${evidenceVersionId}::uuid
     GROUP BY fo.scan_status,ev.retention_policy_applicability_id,ev.created_by_user_identity_id
  `.execute(tx);
  const row = result.rows[0];
  if (!row) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
  if (actor.roles.includes("TENANT_ADMIN") && !actor.roles.includes("EVIDENCE_OWNER")
      && (!row.retention_policy_applicability_id || row.created_by_user_identity_id !== actor.userIdentityId
        || Number(row.link_count) !== 0)) {
    throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
  }
  let initialSource = false;
  if (row.retention_policy_applicability_id) {
    const chain = await sql<{ lifecycle_state: string; retention_policy_id: string; classification: string; scope_subject_id: string | null; processing_activity_id: string | null }>`
      SELECT lifecycle_state,retention_policy_id,classification,scope_subject_id,processing_activity_id
        FROM privacy.retention_policy_applicabilities WHERE tenant_id=${actor.tenantId}::uuid
         AND retention_policy_applicability_id=${row.retention_policy_applicability_id}::uuid`.execute(tx);
    const a=chain.rows[0];
    if (a && a.lifecycle_state !== 'published') {
      if (row.created_by_user_identity_id !== actor.userIdentityId || Number(row.link_count)!==0) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
      await assertInitialSourceCustody(tx, actor, { tenantId: actor.tenantId, applicabilityId: row.retention_policy_applicability_id,
        retentionPolicyId: a.retention_policy_id, classification: a.classification, scopeSubjectId: a.scope_subject_id,
        processingActivityId: a.processing_activity_id }, "evidence.evidence.submit");
      initialSource = true;
    }
  }
  const tenantAdminSource = actor.roles.includes("TENANT_ADMIN") && row.retention_policy_applicability_id
    && row.created_by_user_identity_id === actor.userIdentityId;
  const submitScopes=grantedScopes(actor,"evidence.evidence.submit");
  if(submitScopes.has("tenant")&&!submitScopes.has("owned_object")&&!submitScopes.has("assigned_object")&&!initialSource) {
    throw new FoundationError("TCDX.AUTHORIZATION.DENIED","Tenant-only submit is limited to its own pending initial source",403);
  }
  if (row.scan_status !== "passed" || (Number(row.link_count) < 1 && !tenantAdminSource && !initialSource)) {
    throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Evidence version is not submittable", 422);
  }
}

function actorColumns(actor: CoreActor): Record<string, unknown> {
  return { created_by_user_identity_id: actor.userIdentityId };
}

async function createApplicability({ transaction: tx, actor, body }: MutationContext): Promise<MutationResult> {
  const decision = string(body, "applicability_decision");
  if (decision !== "applicable" && decision !== "not_applicable") invalidField("applicability_decision");
  const rationale = typeof body.rationale === "string" ? body.rationale : "";
  if (decision === "not_applicable" && !rationale.trim()) invalidField("rationale");
  const requirementId = string(body, "requirement_id");
  await referenceExists(tx, "regulatory.requirements", "requirement_id", requirementId, actor.tenantId, true, actor.runtimeEnvironment);
  const scope = optionalString(body, "scope_subject_id");
  if (scope) await assertSelectableSubject(tx, scope, actor.tenantId);
  const max = await sql<{ next_version: string }>`SELECT COALESCE(MAX(applicability_version),0)+1 AS next_version FROM regulatory.requirement_applicabilities WHERE tenant_id=${actor.tenantId}::uuid AND requirement_id=${requirementId}::uuid AND scope_subject_id IS NOT DISTINCT FROM ${scope}::uuid`.execute(tx);
  const id = newUuidV7();
  await insertRow(tx, "regulatory.requirement_applicabilities", { requirement_applicability_id: id, tenant_id: actor.tenantId, ...actorColumns(actor), requirement_id: requirementId, scope_subject_id: scope, applicability_version: max.rows[0]!.next_version, applicability_decision: decision, rationale, lifecycle_state: "draft", effective_from: string(body, "effective_from"), effective_to: optionalString(body, "effective_to") });
  return { resource: "applicability", id };
}

async function assertAssessmentConfiguration(tx: Transaction<FoundationDatabase>, actor: CoreActor, body: Body, domain: string): Promise<void> {
  const id = optionalString(body, "effective_configuration_id");
  if (!id) return;
  const result = await tx.executeQuery(CompiledQuery.raw(`SELECT ec.effective_configuration_id
    FROM config.effective_configurations ec
    JOIN config.configuration_definitions cd ON cd.configuration_definition_id=ec.configuration_definition_id
    WHERE ec.effective_configuration_id=$1::uuid AND ec.tenant_id=$2::uuid
      AND cd.owner_domain=$3 AND cd.lifecycle_state='published'
      AND NOT EXISTS (SELECT 1 FROM config.effective_configuration_layers layer
        WHERE layer.effective_configuration_id=ec.effective_configuration_id
          AND layer.tenant_id <> ec.tenant_id)
      AND (cd.tenant_id IS NULL OR cd.tenant_id=ec.tenant_id)
      AND NOT EXISTS (SELECT 1 FROM config.effective_configuration_layers layer
        LEFT JOIN config.configuration_definitions ld ON ld.configuration_definition_id=layer.configuration_definition_id
        LEFT JOIN config.configuration_overrides lo ON lo.configuration_override_id=layer.configuration_override_id
        LEFT JOIN config.configuration_definitions od ON od.configuration_definition_id=lo.configuration_definition_id
        WHERE layer.effective_configuration_id=ec.effective_configuration_id
          AND (ld.configuration_definition_id IS NULL
            OR (ld.tenant_id IS NOT NULL AND ld.tenant_id <> ec.tenant_id)
            OR (layer.configuration_override_id IS NOT NULL AND lo.configuration_override_id IS NULL)
            OR (lo.tenant_id IS NOT NULL AND lo.tenant_id <> ec.tenant_id)
            OR (layer.configuration_override_id IS NOT NULL AND od.configuration_definition_id IS NULL)
            OR (od.tenant_id IS NOT NULL AND od.tenant_id <> ec.tenant_id)))`, [id, actor.tenantId, domain]));
  if (!result.rows.length) throw new FoundationError("TCDX.VALIDATION.FAILED", "Configuration is not compatible with this tenant assessment", 400, false, { field: "effective_configuration_id" });
}

async function createRequirementAssessment({ transaction: tx, actor, body }: MutationContext): Promise<MutationResult> {
  await resolveMethodology(tx, "compliance", string(body, "methodology_version_ref"));
  await assertAssessmentConfiguration(tx, actor, body, "compliance");
  const applicabilityId = string(body, "requirement_applicability_id");
  await referenceExists(tx, resources.applicability.table, resources.applicability.idColumn, applicabilityId, actor.tenantId);
  const id = newUuidV7();
  await insertRow(tx, resources.requirementAssessment.table, { requirement_assessment_id: id, tenant_id: actor.tenantId, ...actorColumns(actor), requirement_applicability_id: applicabilityId, methodology_version_ref: string(body, "methodology_version_ref"), lifecycle_state: "not_assessed", result_status: "no_data", effective_configuration_id: optionalString(body, "effective_configuration_id") });
  return { resource: "requirementAssessment", id };
}

async function createSoa({ transaction: tx, actor, body }: MutationContext): Promise<MutationResult> {
  const framework = string(body, "framework_version_id");
  await assertSelectableFramework(tx, actor, framework);
  if (!Array.isArray(body.items) || body.items.length === 0) throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field: "items" });
  const max = await sql<{ next_version: string }>`SELECT COALESCE(MAX(soa_version),0)+1 AS next_version FROM regulatory.statements_of_applicability WHERE tenant_id=${actor.tenantId}::uuid AND framework_version_id=${framework}::uuid`.execute(tx);
  const id = newUuidV7();
  await insertRow(tx, resources.soa.table, { statement_of_applicability_id: id, tenant_id: actor.tenantId, ...actorColumns(actor), framework_version_id: framework, soa_version: max.rows[0]!.next_version, title: string(body, "title"), lifecycle_state: "draft", effective_from: optionalString(body, "effective_from") });
  for (const raw of body.items) {
    if (!raw || typeof raw !== "object") throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field: "items" });
    const item = raw as Body;
    const controlVersion = string(item, "reference_control_version_id");
    await referenceExists(tx, "controls.control_versions", "control_version_id", controlVersion, actor.tenantId, true, actor.runtimeEnvironment);
    const tenantControl = optionalString(item, "tenant_control_id");
    const tenantControlVersion = optionalString(item, "tenant_control_version_id");
    if (Boolean(tenantControl) !== Boolean(tenantControlVersion)) throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Tenant Control and ControlVersion must be provided together", 422);
    if (tenantControl) await referenceExists(tx, resources.control.table, resources.control.idColumn, tenantControl, actor.tenantId);
    if (tenantControl && tenantControlVersion) await assertControlVersion(tx, tenantControl, tenantControlVersion, actor.tenantId);
    await insertRow(tx, "regulatory.statement_of_applicability_items", { statement_of_applicability_item_id: newUuidV7(), tenant_id: actor.tenantId, ...actorColumns(actor), statement_of_applicability_id: id, reference_control_version_id: controlVersion, applicability_decision: string(item, "applicability_decision"), justification: string(item, "justification"), implementation_state: string(item, "implementation_state"), tenant_control_id: tenantControl, tenant_control_version_id: tenantControlVersion });
  }
  return { resource: "soa", id };
}

async function instantiateControl({ transaction: tx, actor, body }: MutationContext): Promise<MutationResult> {
  const basedOn = string(body, "based_on_control_version_id");
  const visibility = await packVisibility(tx, actor.tenantId, actor.runtimeEnvironment);
  if (!visibility.globalControlVersionIds.has(basedOn)) {
    throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
  }
  await assertSelectableSubject(tx, string(body, "business_owner_subject_id"), actor.tenantId);
  const id = newUuidV7();
  const versionId = newUuidV7();
  await insertRow(tx, resources.control.table, { control_id: id, tenant_id: actor.tenantId, ownership_class: "TENANT_OWNED", ...actorColumns(actor), control_code: string(body, "control_code"), name: string(body, "name"), control_origin: "tenant_instantiated", based_on_control_version_id: basedOn, business_owner_subject_id: string(body, "business_owner_subject_id"), lifecycle_state: "active" });
  await insertRow(tx, "controls.control_versions", { control_version_id: versionId, tenant_id: actor.tenantId, ownership_class: "TENANT_OWNED", ...actorColumns(actor), control_id: id, version_number: 1, objective: string(body, "objective"), control_type: string(body, "control_type"), nature: string(body, "nature"), frequency_code: string(body, "frequency_code"), execution_method: string(body, "execution_method"), verification_method: string(body, "verification_method"), minimum_evidence: string(body, "minimum_evidence"), suggested_owner_role_code: optionalString(body, "suggested_owner_role_code"), lifecycle_state: "active", effective_from: optionalString(body, "effective_from"), effective_to: optionalString(body, "effective_to") });
  return { resource: "control", id };
}

async function createControlAssessment({ transaction: tx, actor, body }: MutationContext): Promise<MutationResult> {
  await resolveMethodology(tx, "controls", string(body, "methodology_version_ref"));
  await assertAssessmentConfiguration(tx, actor, body, "controls");
  const control = string(body, "control_id");
  const controlVersion = string(body, "control_version_id");
  await referenceExists(tx, resources.control.table, resources.control.idColumn, control, actor.tenantId);
  await assertControlVersion(tx, control, controlVersion, actor.tenantId);
  const id = newUuidV7();
  await insertRow(tx, resources.controlAssessment.table, { control_assessment_id: id, tenant_id: actor.tenantId, ...actorColumns(actor), control_id: control, control_version_id: controlVersion, methodology_version_ref: string(body, "methodology_version_ref"), lifecycle_state: "planned", result_status: "no_data", effective_configuration_id: optionalString(body, "effective_configuration_id") });
  return { resource: "controlAssessment", id };
}

async function createAssuranceTest({ transaction: tx, actor, body }: MutationContext): Promise<MutationResult> {
  const control = string(body, "control_id");
  const controlVersion = string(body, "control_version_id");
  await referenceExists(tx, resources.control.table, resources.control.idColumn, control, actor.tenantId);
  await assertControlVersion(tx, control, controlVersion, actor.tenantId);
  const id = newUuidV7();
  await insertRow(tx, resources.assuranceTest.table, { assurance_test_id: id, tenant_id: actor.tenantId, ...actorColumns(actor), control_id: control, control_version_id: controlVersion, test_code: string(body, "test_code"), lifecycle_state: "planned", result_status: "no_data", planned_at: optionalString(body, "planned_at"), executor_membership_id: actor.membershipId });
  return { resource: "assuranceTest", id };
}

async function createEvidenceRequest({ transaction: tx, actor, body }: MutationContext): Promise<MutationResult> {
  const targets = ["requirement_id", "control_id", "requirement_assessment_id", "control_assessment_id", "assurance_test_id"].filter((key) => body[key] !== undefined && body[key] !== null);
  if (targets.length !== 1) throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Exactly one typed evidence target is required", 422);
  const target = targets[0]!;
  const mappings: Record<string, [string, string, boolean?]> = { requirement_id: ["regulatory.requirements", "requirement_id", true], control_id: [resources.control.table, resources.control.idColumn], requirement_assessment_id: [resources.requirementAssessment.table, resources.requirementAssessment.idColumn], control_assessment_id: [resources.controlAssessment.table, resources.controlAssessment.idColumn], assurance_test_id: [resources.assuranceTest.table, resources.assuranceTest.idColumn] };
  const targetMapping = mappings[target]!;
  await referenceExists(tx, targetMapping[0], targetMapping[1], string(body, target), actor.tenantId, targetMapping[2] ?? false, actor.runtimeEnvironment);
  const assignedMembership = optionalString(body, "assigned_membership_id");
  if (assignedMembership) await assertTenantMembership(tx, assignedMembership, actor.tenantId);
  const id = newUuidV7();
  await insertRow(tx, resources.evidenceRequest.table, { evidence_request_id: id, tenant_id: actor.tenantId, ...actorColumns(actor), request_code: string(body, "request_code"), requirement_id: optionalString(body, "requirement_id"), control_id: optionalString(body, "control_id"), requirement_assessment_id: optionalString(body, "requirement_assessment_id"), control_assessment_id: optionalString(body, "control_assessment_id"), assurance_test_id: optionalString(body, "assurance_test_id"), lifecycle_state: "open", requested_by_membership_id: actor.membershipId, assigned_membership_id: assignedMembership, due_at: optionalString(body, "due_at") });
  return { resource: "evidenceRequest", id };
}

async function createEvidence({ transaction: tx, actor, body }: MutationContext): Promise<MutationResult> {
  const fileId = string(body, "file_object_id");
  const file = await sql<{ scan_status: string; retention_policy_id: string; retention_policy_applicability_id: string | null; classification: string; scope_subject_id: string | null; processing_activity_id: string | null; created_by_user_identity_id: string | null }>`
    SELECT f.scan_status,f.retention_policy_id,f.retention_policy_applicability_id,f.classification,f.created_by_user_identity_id,
           a.scope_subject_id,a.processing_activity_id
      FROM evidence.file_objects f
      LEFT JOIN privacy.retention_policy_applicabilities a
        ON a.tenant_id=f.tenant_id AND a.retention_policy_applicability_id=f.retention_policy_applicability_id
     WHERE f.tenant_id=${actor.tenantId}::uuid AND f.file_object_id=${fileId}::uuid
     FOR UPDATE OF f
  `.execute(tx);
  if (!file.rows[0]) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
  if (file.rows[0].scan_status !== "passed") throw new FoundationError("TCDX.INVARIANT.VIOLATION", "File is not usable evidence", 422);
  if (!file.rows[0].retention_policy_applicability_id || file.rows[0].retention_policy_id !== string(body, "retention_policy_id")) {
    throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Evidence retention chain mismatch", 422);
  }
  const initialSource = await assertUploadRetention(tx, actor, {
    tenantId: actor.tenantId,
    applicabilityId: file.rows[0].retention_policy_applicability_id,
    retentionPolicyId: file.rows[0].retention_policy_id,
    classification: file.rows[0].classification,
    scopeSubjectId: file.rows[0].scope_subject_id,
    processingActivityId: file.rows[0].processing_activity_id
  }, "evidence.evidence.create");
  await referenceExists(tx, "privacy.retention_policies", "retention_policy_id", string(body, "retention_policy_id"), actor.tenantId, true);
  const businessOwner = optionalString(body, "business_owner_subject_id");
  if (businessOwner) await referenceExists(tx, "org.subjects", "subject_id", businessOwner, actor.tenantId);
  if (file.rows[0].scope_subject_id && file.rows[0].scope_subject_id !== businessOwner) {
    throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Evidence owner is outside retention scope", 422);
  }
  const tenantAdminSource = initialSource || (actor.roles.includes("TENANT_ADMIN") && !actor.roles.includes("EVIDENCE_OWNER"));
  if (tenantAdminSource && (file.rows[0].created_by_user_identity_id !== actor.userIdentityId
      || !Array.isArray(body.links) || body.links.length !== 0)) {
    throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
  }
  if (!Array.isArray(body.links) || (body.links.length === 0 && !tenantAdminSource)) {
    throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field: "links" });
  }
  const evidenceId = newUuidV7();
  const versionId = newUuidV7();
  await insertRow(tx, resources.evidence.table, { evidence_id: evidenceId, tenant_id: actor.tenantId, ...actorColumns(actor), evidence_code: string(body, "evidence_code"), evidence_type: string(body, "evidence_type"), business_owner_subject_id: businessOwner, lifecycle_state: "draft", valid_from: optionalString(body, "valid_from"), valid_to: optionalString(body, "valid_to"), retention_policy_id: string(body, "retention_policy_id"), source_kind: string(body, "source_kind") });
  await insertRow(tx, resources.evidenceVersion.table, { evidence_version_id: versionId, tenant_id: actor.tenantId, ...actorColumns(actor), evidence_id: evidenceId, file_object_id: fileId, retention_policy_applicability_id: file.rows[0].retention_policy_applicability_id, version_number: 1, effective_from: optionalString(body, "effective_from"), effective_to: optionalString(body, "effective_to"), period_start: optionalString(body, "period_start"), period_end: optionalString(body, "period_end"), lifecycle_state: "draft", expires_at: optionalString(body, "expires_at"), provenance_ref: string(body, "provenance_ref") });
  const mappings: Record<string, [string, string, boolean?]> = { requirement_id: ["regulatory.requirements", "requirement_id", true], control_id: [resources.control.table, resources.control.idColumn], control_version_id: ["controls.control_versions", "control_version_id", true], requirement_assessment_id: [resources.requirementAssessment.table, resources.requirementAssessment.idColumn], control_assessment_id: [resources.controlAssessment.table, resources.controlAssessment.idColumn], assurance_test_id: [resources.assuranceTest.table, resources.assuranceTest.idColumn] };
  for (const raw of body.links) {
    if (!raw || typeof raw !== "object") throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field: "links" });
    const link = raw as Body;
    const targets = Object.keys(mappings).filter((key) => link[key] !== undefined && link[key] !== null);
    if (targets.length !== 1) throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Exactly one typed evidence link target is required", 422);
    const target = targets[0]!;
    const targetMapping = mappings[target]!;
    await referenceExists(tx, targetMapping[0], targetMapping[1], string(link, target), actor.tenantId, targetMapping[2] ?? false, actor.runtimeEnvironment);
    await insertRow(tx, "evidence.evidence_links", { evidence_link_id: newUuidV7(), tenant_id: actor.tenantId, ...actorColumns(actor), evidence_version_id: versionId, requirement_id: optionalString(link, "requirement_id"), control_id: optionalString(link, "control_id"), control_version_id: optionalString(link, "control_version_id"), requirement_assessment_id: optionalString(link, "requirement_assessment_id"), control_assessment_id: optionalString(link, "control_assessment_id"), assurance_test_id: optionalString(link, "assurance_test_id"), claim: optionalString(link, "claim"), effective_from: optionalString(link, "effective_from"), effective_to: optionalString(link, "effective_to") });
  }
  return { resource: "evidence", id: evidenceId };
}

const retentionPrecedence = new Map<string, number>([
  ["legal_hold", 500],
  ["mandatory_regulatory_policy", 400],
  ["contractual_policy", 300],
  ["tenant_policy", 200],
  ["product_baseline", 100]
]);

async function createRetentionPolicy({ transaction: tx, actor, body }: MutationContext): Promise<MutationResult> {
  const policyKind = string(body, "policy_kind");
  const precedenceRank = number(body, "precedence_rank");
  const versionNumber = number(body, "version_number");
  const retentionSeconds = policyKind === "legal_hold" ? null : number(body, "retention_seconds");
  if (!Number.isSafeInteger(versionNumber) || versionNumber < 1) invalidField("version_number");
  if (policyKind === "legal_hold") {
    if (body.retention_seconds !== undefined) invalidField("retention_seconds");
  } else if (!Number.isSafeInteger(retentionSeconds) || retentionSeconds! < 0) invalidField("retention_seconds");
  if (!Number.isSafeInteger(precedenceRank) || retentionPrecedence.get(policyKind) !== precedenceRank) invalidField("precedence_rank");
  if (string(body, "trigger_event_code") !== "expiry_or_closure") invalidField("trigger_event_code");
  if (typeof body.is_mandatory !== "boolean") invalidField("is_mandatory");
  const id = newUuidV7();
  await insertRow(tx, resources.retentionPolicy.table, {
    retention_policy_id: id,
    tenant_id: actor.tenantId,
    ownership_class: "TENANT_OWNED",
    ...actorColumns(actor),
    row_version: 1,
    policy_code: string(body, "policy_code"),
    version_number: versionNumber,
    policy_kind: policyKind,
    retention_seconds: retentionSeconds,
    trigger_event_code: "expiry_or_closure",
    precedence_rank: precedenceRank,
    is_mandatory: body.is_mandatory,
    lifecycle_state: "draft",
    effective_from: null,
    effective_to: null,
    regulatory_source_id: null
  });
  return { resource: "retentionPolicy", id };
}

function retentionPolicyTransition(fromState: string, command: string, approve = false, publish = false) {
  return async ({ transaction: tx, actor, body, targetId }: MutationContext): Promise<MutationResult> => {
    if (!targetId) throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400);
    const definition = resources.retentionPolicy;
    const permission = mutationPermission.get(command)!;
    await getResource(tx, actor, definition, targetId, true, permission);
    const edge = await assertLifecycleEdge(tx, actor, { entityType: "RetentionPolicy", fromState, commandCode: command, permission });
    if (edge.auditEventCode !== mutationAudit.get(command)) throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Audit contract mismatch", 422);
    if (approve || command === "retention_policy.submit_for_review") {
      const author = await tx.executeQuery<{ created_by_user_identity_id: string | null }>(CompiledQuery.raw(
        "SELECT created_by_user_identity_id FROM privacy.retention_policies WHERE tenant_id=$1::uuid AND retention_policy_id=$2::uuid",
        [actor.tenantId, targetId]
      ));
      const same = author.rows[0]?.created_by_user_identity_id === actor.userIdentityId;
      if ((approve && same) || (command === "retention_policy.submit_for_review" && !same)) {
        throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
      }
    }
    await casRetentionPolicyTransition(tx, actor, targetId, version(body), fromState, edge.toState, publish);
    return { resource: "retentionPolicy", id: targetId };
  };
}

async function updateRetentionPolicy({ transaction: tx, actor, body, targetId }: MutationContext): Promise<MutationResult> {
  if (!targetId) throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400);
  const current = await getResource(tx, actor, resources.retentionPolicy, targetId, true, "privacy.retention_policy.update");
  if (actor.roles.includes("TENANT_ADMIN") && !actor.roles.includes("PRIVACY_MANAGER")) {
    const author = await sql<{ created_by_user_identity_id: string | null }>`
      SELECT created_by_user_identity_id FROM privacy.retention_policies
       WHERE tenant_id=${actor.tenantId}::uuid AND retention_policy_id=${targetId}::uuid
    `.execute(tx);
    if (author.rows[0]?.created_by_user_identity_id !== actor.userIdentityId) {
      throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
    }
  }
  const hold = current.policy_kind === "legal_hold";
  const retentionSeconds = hold ? null : number(body, "retention_seconds");
  if (hold) {
    if (body.retention_seconds !== undefined) invalidField("retention_seconds");
  } else if (!Number.isSafeInteger(retentionSeconds) || retentionSeconds! < 0) invalidField("retention_seconds");
  if (typeof body.is_mandatory !== "boolean") invalidField("is_mandatory");
  await casRetentionPolicyUpdate(tx, actor, targetId, version(body), { retention_seconds: retentionSeconds, is_mandatory: body.is_mandatory });
  return { resource: "retentionPolicy", id: targetId };
}

async function createRetentionApplicability({ transaction: tx, actor, body }: MutationContext): Promise<MutationResult> {
  const policyId = string(body, "retention_policy_id");
  const versionNumber = number(body, "version_number");
  if (!Number.isSafeInteger(versionNumber) || versionNumber < 1) invalidField("version_number");
  const policy = await sql<{ policy_kind: string }>`
    SELECT policy_kind FROM privacy.retention_policies
     WHERE tenant_id=${actor.tenantId}::uuid AND retention_policy_id=${policyId}::uuid
       AND ownership_class='TENANT_OWNED' AND lifecycle_state='published'
     FOR SHARE
  `.execute(tx);
  if (policy.rows.length !== 1) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
  const subjectId = optionalString(body, "scope_subject_id");
  const activityId = optionalString(body, "processing_activity_id");
  const legalBasisId = optionalString(body, "legal_basis_id");
  const sourceId = optionalString(body, "source_evidence_version_id");
  const predecessorId = optionalString(body, "supersedes_applicability_id");
  if (subjectId) await assertSelectableSubject(tx, subjectId, actor.tenantId);
  if (activityId) await referenceExists(tx, "privacy.privacy_processing_activities", "privacy_processing_activity_id", activityId, actor.tenantId);
  if (legalBasisId) await referenceExists(tx, "privacy.legal_bases", "legal_basis_id", legalBasisId, actor.tenantId);
  if (sourceId) await referenceExists(tx, resources.evidenceVersion.table, resources.evidenceVersion.idColumn, sourceId, actor.tenantId);
  if (body.source_clause_ref !== undefined && !sourceId) invalidField("source_clause_ref");
  if (predecessorId) {
    const previous = await sql<{ version_number: string; retention_policy_id: string; lifecycle_state: string }>`
      SELECT version_number::text,retention_policy_id,lifecycle_state
        FROM privacy.retention_policy_applicabilities
       WHERE tenant_id=${actor.tenantId}::uuid AND retention_policy_applicability_id=${predecessorId}::uuid FOR SHARE
    `.execute(tx);
    if (previous.rows.length !== 1 || previous.rows[0]!.lifecycle_state !== "published"
        || previous.rows[0]!.retention_policy_id !== policyId
        || Number(previous.rows[0]!.version_number) + 1 !== versionNumber) {
      throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Invalid retention applicability predecessor", 422);
    }
  } else if (versionNumber !== 1) invalidField("version_number");
  const id = newUuidV7();
  await insertRow(tx, resources.retentionPolicyApplicability.table, {
    retention_policy_applicability_id: id, tenant_id: actor.tenantId, ...actorColumns(actor),
    retention_policy_id: policyId, version_number: versionNumber,
    classification: string(body, "classification"), purpose: "evidence_document",
    scope_subject_id: subjectId, processing_activity_id: activityId,
    legal_basis_id: legalBasisId, source_evidence_version_id: sourceId,
    source_clause_ref: optionalString(body, "source_clause_ref"),
    effective_from: optionalString(body, "effective_from"),
    effective_to: optionalString(body, "effective_to"),
    lifecycle_state: "draft", published_at: null,
    supersedes_applicability_id: predecessorId, row_version: 1
  });
  return { resource: "retentionPolicyApplicability", id };
}

function retentionApplicabilityTransition(fromState: string, command: string, approve = false, publish = false) {
  return async ({ transaction: tx, actor, body, targetId }: MutationContext): Promise<MutationResult> => {
    if (!targetId) invalidField("target_id");
    const permission = mutationPermission.get(command)!;
    await getResource(tx, actor, resources.retentionPolicyApplicability, targetId, true, permission);
    const author = await sql<{ created_by_user_identity_id: string | null }>`
      SELECT created_by_user_identity_id FROM privacy.retention_policy_applicabilities
       WHERE tenant_id=${actor.tenantId}::uuid AND retention_policy_applicability_id=${targetId}::uuid
    `.execute(tx);
    if (command === "retention_policy_applicability.submit_for_review"
        && author.rows[0]?.created_by_user_identity_id !== actor.userIdentityId) {
      throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
    }
    if (approve && author.rows[0]?.created_by_user_identity_id === actor.userIdentityId) {
      throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
    }
    const source = await sql<{
      source_evidence_version_id: string | null; source_clause_ref: string | null;
      effective_from: string | null; effective_to: string | null; ordinary_without_source: boolean;
    }>`
      SELECT a.source_evidence_version_id,a.source_clause_ref,a.effective_from::text,a.effective_to::text,
             (p.policy_kind IN ('tenant_policy','product_baseline') AND p.is_mandatory=false
              AND p.regulatory_source_id IS NULL AND a.legal_basis_id IS NULL
              AND a.source_evidence_version_id IS NULL AND a.source_clause_ref IS NULL
              AND NOT EXISTS (SELECT 1 FROM evidence.file_upload_intents pending
                WHERE pending.tenant_id=a.tenant_id
                  AND pending.retention_policy_applicability_id=a.retention_policy_applicability_id)) AS ordinary_without_source
      FROM privacy.retention_policy_applicabilities a
      JOIN privacy.retention_policies p ON p.tenant_id=a.tenant_id AND p.retention_policy_id=a.retention_policy_id
      WHERE a.tenant_id=${actor.tenantId}::uuid AND a.retention_policy_applicability_id=${targetId}::uuid
        AND p.ownership_class='TENANT_OWNED' AND p.lifecycle_state='published'
        AND p.effective_from<=transaction_timestamp() AND p.effective_from<=a.effective_from
        AND (p.effective_to IS NULL OR (p.effective_to>transaction_timestamp()
          AND a.effective_to IS NOT NULL AND p.effective_to>=a.effective_to))
      FOR SHARE OF p`.execute(tx);
    const legal = source.rows[0];
    // v1.12 distinguishes ordinary operation from formal accreditation using
    // persisted policy and source links, never a caller-controlled exemption.
    if (!legal?.effective_from || (!legal.ordinary_without_source
        && (!legal.source_evidence_version_id || !legal.source_clause_ref?.trim()))) {
      throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Explicit validity and any required formal source must be bound before review or publication", 422);
    }
    if (legal.source_evidence_version_id) {
      await assertLegalSource(tx, actor.tenantId, targetId, legal.source_evidence_version_id,
        legal.effective_from, legal.effective_to, false);
    }
    const edge = await assertLifecycleEdge(tx, actor, {
      entityType: "RetentionPolicyApplicability", fromState, commandCode: command, permission
    });
    if (edge.auditEventCode !== mutationAudit.get(command)) {
      throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Audit contract mismatch", 422);
    }
    const result = await tx.executeQuery<Record<string, unknown>>(CompiledQuery.raw(
      `UPDATE privacy.retention_policy_applicabilities SET lifecycle_state=$5,row_version=row_version+1${publish ? ",published_at=transaction_timestamp()" : ""} WHERE tenant_id=$1::uuid AND retention_policy_applicability_id=$2::uuid AND row_version=$3::bigint AND lifecycle_state=$4 RETURNING retention_policy_applicability_id`,
      [actor.tenantId, targetId, version(body), fromState, edge.toState]
    ));
    if (result.rows.length !== 1) throw new FoundationError("TCDX.CONFLICT.CONCURRENCY", "Concurrent modification detected", 409, true);
    return { resource: "retentionPolicyApplicability", id: targetId };
  };
}

async function bindInitialSource({ transaction: tx, actor, body, targetId }: MutationContext): Promise<MutationResult> {
  if (!targetId) invalidField("target_id");
  const current=await getResource(tx,actor,resources.retentionPolicyApplicability,targetId,true,"privacy.retention_policy.update");
  await assertInitialSourceBinder(tx,actor,targetId);
  if (current.lifecycle_state!=="draft" || current.source_evidence_version_id || Number(current.row_version)!==version(body)) {
    throw new FoundationError("TCDX.CONFLICT.CONCURRENCY", "Concurrent modification detected", 409, true);
  }
  await assertInitialSourceCustody(tx,actor,{tenantId:actor.tenantId,applicabilityId:targetId,
    retentionPolicyId:String(current.retention_policy_id),classification:String(current.classification),
    scopeSubjectId:current.scope_subject_id as string|null,processingActivityId:current.processing_activity_id as string|null},"privacy.retention_policy.update");
  const source=string(body,"source_evidence_version_id"), clause=string(body,"source_clause_ref");
  const from=string(body,"effective_from"), to=optionalString(body,"effective_to");
  if (!clause.trim() || !Number.isFinite(Date.parse(from)) || (to && (!Number.isFinite(Date.parse(to)) || Date.parse(to)<=Date.parse(from)))) {
    throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Source clause and validity interval are required", 422);
  }
  requireAccess(actor,"evidence.evidence.read","EVIDENCE_DOCUMENTS",["tenant"]);
  await getResource(tx,actor,resources.evidenceVersion,source,false,"evidence.evidence.read");
  await assertLegalSource(tx,actor.tenantId,targetId,source,from,to,true);
  const result=await sql`UPDATE privacy.retention_policy_applicabilities SET source_evidence_version_id=${source}::uuid,
    source_clause_ref=${clause},effective_from=${from}::timestamptz,effective_to=${to}::timestamptz,row_version=row_version+1
    WHERE tenant_id=${actor.tenantId}::uuid AND retention_policy_applicability_id=${targetId}::uuid
      AND row_version=${version(body)} AND lifecycle_state='draft' AND source_evidence_version_id IS NULL
    RETURNING retention_policy_applicability_id`.execute(tx);
  if (result.rows.length!==1) throw new FoundationError("TCDX.CONFLICT.CONCURRENCY", "Concurrent modification detected", 409,true);
  return {resource:"retentionPolicyApplicability",id:targetId,auditBefore:{ source_evidence_version_id:current.source_evidence_version_id,
    source_clause_ref:current.source_clause_ref,effective_from:current.effective_from,effective_to:current.effective_to,row_version:current.row_version }};
}

async function assertInitialSourceBinder(tx: Transaction<FoundationDatabase>,actor: CoreActor,id: string): Promise<void> {
  if (!actor.roles.includes("TENANT_ADMIN")) throw new FoundationError("TCDX.AUTHORIZATION.DENIED","Access denied",403);
  const result=await sql<{created_by_user_identity_id:string}>`SELECT created_by_user_identity_id FROM privacy.retention_policy_applicabilities
    WHERE tenant_id=${actor.tenantId}::uuid AND retention_policy_applicability_id=${id}::uuid`.execute(tx);
  if (result.rows[0]?.created_by_user_identity_id!==actor.userIdentityId) throw new FoundationError("TCDX.AUTHORIZATION.DENIED","Access denied",403);
}

async function releaseLegalHold({ transaction: tx, actor, body, targetId, auditEventId }: MutationContext): Promise<MutationResult> {
  if (!targetId || !auditEventId) invalidField("target_id");
  if (!actor.roles.includes("LEGAL_REVIEWER")) {
    throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
  }
  const reason = string(body, "reason").trim();
  if (!reason) invalidField("reason");
  const current = await sql<{ row_version: string; policy_kind: string; lifecycle_state: string; created_by_user_identity_id: string | null }>`
    SELECT a.row_version::text,p.policy_kind,a.lifecycle_state,a.created_by_user_identity_id
      FROM privacy.retention_policy_applicabilities a
      JOIN privacy.retention_policies p ON p.tenant_id=a.tenant_id AND p.retention_policy_id=a.retention_policy_id
     WHERE a.tenant_id=${actor.tenantId}::uuid AND a.retention_policy_applicability_id=${targetId}::uuid
     FOR UPDATE OF a
  `.execute(tx);
  const hold = current.rows[0];
  if (!hold) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
  if (Number(hold.row_version) !== version(body)) {
    throw new FoundationError("TCDX.CONFLICT.CONCURRENCY", "Concurrent modification detected", 409, true);
  }
  if (hold.policy_kind !== "legal_hold" || hold.lifecycle_state !== "published"
      || hold.created_by_user_identity_id === actor.userIdentityId) {
    throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
  }
  const prior = await sql<{ hold_release_id: string }>`
    SELECT hold_release_id FROM privacy.retention_policy_hold_releases
     WHERE tenant_id=${actor.tenantId}::uuid AND retention_policy_applicability_id=${targetId}::uuid
  `.execute(tx);
  if (prior.rows.length) throw new FoundationError("TCDX.LIFECYCLE.TRANSITION_DENIED", "Legal hold already released", 409);
  const sourceId = optionalString(body, "release_source_evidence_version_id");
  if (sourceId) await referenceExists(tx, resources.evidenceVersion.table, resources.evidenceVersion.idColumn, sourceId, actor.tenantId);
  const releaseId = newUuidV7();
  const insert = await sql<{ hold_release_id: string; released_at: Date }>`
    INSERT INTO privacy.retention_policy_hold_releases
      (hold_release_id,tenant_id,retention_policy_applicability_id,released_by_membership_id,reason,release_source_evidence_version_id,audit_event_id)
    VALUES (${releaseId}::uuid,${actor.tenantId}::uuid,${targetId}::uuid,${actor.membershipId}::uuid,${reason},${sourceId}::uuid,${auditEventId}::uuid)
    RETURNING hold_release_id,released_at
  `.execute(tx);
  return { resource: "retentionPolicyApplicability", id: targetId,
    response: { retention_policy_applicability_id: targetId, hold_release_id: insert.rows[0]!.hold_release_id,
      released_at: insert.rows[0]!.released_at.toISOString(), lifecycle_state: "released" } };
}

async function replayLegalHoldRelease({ transaction: tx, actor, targetId }: MutationContext): Promise<{ response: Record<string, unknown> }> {
  if (!targetId) invalidField("target_id");
  const result = await sql<{ hold_release_id: string; released_at: Date }>`
    SELECT hold_release_id,released_at FROM privacy.retention_policy_hold_releases
     WHERE tenant_id=${actor.tenantId}::uuid AND retention_policy_applicability_id=${targetId}::uuid
  `.execute(tx);
  if (result.rows.length !== 1) throw new FoundationError("TCDX.CONFLICT.IDEMPOTENCY", "Idempotent result unavailable", 409);
  return { response: { retention_policy_applicability_id: targetId,
    hold_release_id: result.rows[0]!.hold_release_id, released_at: result.rows[0]!.released_at.toISOString(),
    lifecycle_state: "released" } };
}

async function createIssue({ transaction: tx, actor, body }: MutationContext): Promise<MutationResult> {
  const targets = ["requirement_assessment_id", "control_assessment_id", "assurance_test_id"].filter((key) => body[key] !== undefined && body[key] !== null);
  if (targets.length !== 1) throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Exactly one typed issue origin is required", 422);
  const mappings: Record<string, [string, string]> = { requirement_assessment_id: [resources.requirementAssessment.table, resources.requirementAssessment.idColumn], control_assessment_id: [resources.controlAssessment.table, resources.controlAssessment.idColumn], assurance_test_id: [resources.assuranceTest.table, resources.assuranceTest.idColumn] };
  const target = targets[0]!;
  await referenceExists(tx, ...mappings[target]!, string(body, target), actor.tenantId);
  const businessOwner = optionalString(body, "business_owner_subject_id");
  if (businessOwner) await referenceExists(tx, "org.subjects", "subject_id", businessOwner, actor.tenantId);
  const id = newUuidV7();
  await insertRow(tx, resources.issue.table, { issue_id: id, tenant_id: actor.tenantId, ...actorColumns(actor), issue_code: string(body, "issue_code"), issue_kind: string(body, "issue_kind"), title: string(body, "title"), description: string(body, "description"), lifecycle_state: "open", severity: string(body, "severity"), priority: string(body, "priority"), business_owner_subject_id: businessOwner, due_date: optionalString(body, "due_date") });
  await insertRow(tx, "remediation.issue_origins", { issue_origin_id: newUuidV7(), tenant_id: actor.tenantId, ...actorColumns(actor), issue_id: id, requirement_assessment_id: optionalString(body, "requirement_assessment_id"), control_assessment_id: optionalString(body, "control_assessment_id"), assurance_test_id: optionalString(body, "assurance_test_id"), origin_role: string(body, "origin_role") });
  return { resource: "issue", id };
}

async function createAction({ transaction: tx, actor, body, parentId }: MutationContext): Promise<MutationResult> {
  if (!parentId) throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400);
  await referenceExists(tx, resources.issue.table, resources.issue.idColumn, parentId, actor.tenantId);
  const assignedMembership = optionalString(body, "assigned_membership_id");
  if (assignedMembership) await assertTenantMembership(tx, assignedMembership, actor.tenantId);
  const id = newUuidV7();
  await insertRow(tx, resources.action.table, { action_id: id, tenant_id: actor.tenantId, ...actorColumns(actor), issue_id: parentId, action_code: string(body, "action_code"), title: string(body, "title"), description: string(body, "description"), lifecycle_state: "pending", priority: string(body, "priority"), assigned_membership_id: assignedMembership, due_date: optionalString(body, "due_date") });
  return { resource: "action", id };
}

function fileStorageContext(context: MutationContext, permission: string, scopes: readonly ScopeKind[]): { port: FileStoragePort; access: AuthorizedFileAccess } {
  const { actor, correlationId, fileStorage } = context;
  requireAccess(actor, permission, "EVIDENCE_DOCUMENTS", scopes);
  if (!fileStorage) throw new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE", "File storage runtime is not configured", 503, true);
  if (!correlationId) throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Correlation context is required", 422);
  const grants = grantedScopes(actor, permission);
  const scope = scopes.find((candidate) => grants.has(candidate));
  if (!scope) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
  return {
    port: fileStorage,
    access: {
      tenantId: actor.tenantId,
      correlationId,
      capabilityEnabled: true,
      permissionGranted: true,
      scope,
      objectPolicyAllowed: true
    }
  };
}

async function createUploadIntent(context: MutationContext): Promise<MutationResult> {
  const { transaction: tx, actor, body } = context;
  const retentionPolicyId = string(body, "retention_policy_id");
  const applicabilityId = string(body, "retention_policy_applicability_id");
  await assertUploadRetention(tx, actor, {
    tenantId: actor.tenantId, applicabilityId, retentionPolicyId,
    classification: string(body, "classification"),
    scopeSubjectId: optionalString(body, "scope_subject_id"),
    processingActivityId: optionalString(body, "processing_activity_id")
  }, "evidence.document.create");
  const id = newUuidV7();
  const { port, access } = fileStorageContext(context, "evidence.document.create", ["tenant"]);
  const allocation = await port.allocateQuarantineUpload({
    ...access,
    uploadIntentId: id,
    declaredMime: string(body, "declared_mime"),
    sizeBytes: number(body, "size_bytes"),
    classification: string(body, "classification")
  });
  await insertRow(tx, resources.fileUploadIntent.table, {
    file_upload_intent_id: id,
    tenant_id: actor.tenantId,
    ...actorColumns(actor),
    purpose: "evidence_document",
    original_filename: string(body, "original_filename"),
    declared_mime: string(body, "declared_mime"),
    expected_size_bytes: number(body, "size_bytes"),
    classification: string(body, "classification"),
    retention_policy_id: retentionPolicyId,
    retention_policy_applicability_id: applicabilityId,
    source_provenance: string(body, "source_provenance"),
    effective_from: optionalString(body, "effective_from"),
    effective_to: optionalString(body, "effective_to"),
    quarantine_object_key: allocation.objectKey,
    lifecycle_state: "pending_upload",
    expires_at: allocation.expiresAt
  });
  const response = {
    upload_intent_id: id,
    lifecycle_state: "pending_upload",
    upload_url: `/api/v1/file-upload-intents/${id}/content`,
    expires_at: allocation.expiresAt.toISOString()
  };
  return {
    resource: "fileUploadIntent",
    id,
    response,
    auditAfter: {
      upload_intent_id: id,
      lifecycle_state: "pending_upload",
      expires_at: allocation.expiresAt.toISOString()
    }
  };
}

async function replayUploadIntent(context: MutationContext, result: { resource: ResourceKey; id: string }): Promise<{ response: Record<string, unknown> }> {
  if (result.resource !== "fileUploadIntent") throw new FoundationError("TCDX.CONFLICT.IDEMPOTENCY", "Idempotent result is incompatible", 409);
  const current = await getResource(context.transaction, context.actor, resources.fileUploadIntent, result.id, true, "evidence.document.create");
  if (current.lifecycle_state !== "pending_upload" || Date.parse(String(current.expires_at)) <= Date.now()) {
    throw new FoundationError("TCDX.LIFECYCLE.TRANSITION_DENIED", "Upload intent is no longer uploadable", 409);
  }
  const { port, access } = fileStorageContext(context, "evidence.document.create", ["tenant"]);
  const allocation = await port.allocateQuarantineUpload({
    ...access,
    uploadIntentId: result.id,
    declaredMime: String(current.declared_mime),
    sizeBytes: Number(current.expected_size_bytes),
    classification: String(current.classification),
    expiresAt: new Date(String(current.expires_at))
  });
  if (allocation.objectKey !== current.quarantine_object_key) throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Quarantine key contract mismatch", 422);
  return {
    response: {
      upload_intent_id: result.id,
      lifecycle_state: "pending_upload",
      upload_url: `/api/v1/file-upload-intents/${result.id}/content`,
      expires_at: String(current.expires_at)
    }
  };
}

function rejectableStorageError(error: unknown): error is FoundationError {
  return error instanceof FoundationError && error.statusCode === 422 && !error.retryable;
}

async function finalizeUploadIntent(context: MutationContext): Promise<MutationResult> {
  const { transaction: tx, actor, body, targetId } = context;
  if (!targetId) throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400);
  const current = await getResource(tx, actor, resources.fileUploadIntent, targetId, true, "evidence.document.update");
  if (actor.roles.includes("TENANT_ADMIN") && !actor.roles.includes("EVIDENCE_OWNER")) {
    const author = await sql<{ created_by_user_identity_id: string | null }>`
      SELECT created_by_user_identity_id FROM evidence.file_upload_intents
       WHERE tenant_id=${actor.tenantId}::uuid AND file_upload_intent_id=${targetId}::uuid
    `.execute(tx);
    if (author.rows[0]?.created_by_user_identity_id !== actor.userIdentityId) {
      throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
    }
  }
  if (current.lifecycle_state !== "pending_upload") throw new FoundationError("TCDX.LIFECYCLE.TRANSITION_DENIED", "Lifecycle transition denied", 409);
  const expectedVersion = version(body);
  if (Number(current.row_version) !== expectedVersion) throw new FoundationError("TCDX.CONFLICT.CONCURRENCY", "Concurrent modification detected", 409, true);
  if (!current.retention_policy_applicability_id) throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Upload has no retention applicability", 422);
  const retentionContext = await sql<{ scope_subject_id: string | null; processing_activity_id: string | null }>`
    SELECT scope_subject_id,processing_activity_id FROM privacy.retention_policy_applicabilities
     WHERE tenant_id=${actor.tenantId}::uuid
       AND retention_policy_applicability_id=${String(current.retention_policy_applicability_id)}::uuid
  `.execute(tx);
  if (!retentionContext.rows[0]) throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Upload retention context is missing", 422);
  const initialSource = await assertUploadRetention(tx, actor, {
    tenantId: actor.tenantId,
    applicabilityId: String(current.retention_policy_applicability_id),
    retentionPolicyId: String(current.retention_policy_id),
    classification: String(current.classification),
    scopeSubjectId: retentionContext.rows[0].scope_subject_id,
    processingActivityId: retentionContext.rows[0].processing_activity_id
  }, "evidence.document.update");
  if (initialSource) {
    const author=await sql<{created_by_user_identity_id:string}>`SELECT created_by_user_identity_id FROM evidence.file_upload_intents
      WHERE tenant_id=${actor.tenantId}::uuid AND file_upload_intent_id=${targetId}::uuid`.execute(tx);
    if(author.rows[0]?.created_by_user_identity_id!==actor.userIdentityId) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
  }
  if (Date.parse(String(current.expires_at)) <= Date.now()) {
    await casTransition(tx, actor, resources.fileUploadIntent, targetId, expectedVersion, "pending_upload", "expired", { expired_at: new Date() });
    const response = await detailResource(tx, actor, resources.fileUploadIntent, targetId, "evidence.document.update");
    return {
      resource: "fileUploadIntent",
      id: targetId,
      response,
      auditAfter: response,
      auditOutcome: "failure",
      deferredError: new FoundationError("TCDX.LIFECYCLE.TRANSITION_DENIED", "Upload intent has expired", 409)
    };
  }
  const fileObjectId = newUuidV7();
  const { port, access } = fileStorageContext(context, "evidence.document.update", ["tenant", "owned_object"]);
  let finalized: Awaited<ReturnType<FileStoragePort["finalizeQuarantine"]>>;
  try {
    finalized = await port.finalizeQuarantine({
      ...access,
      uploadIntentId: targetId,
      fileObjectId,
      quarantineObjectKey: String(current.quarantine_object_key),
      declaredMime: String(current.declared_mime),
      expectedSizeBytes: Number(current.expected_size_bytes)
    });
  } catch (error) {
    if (!rejectableStorageError(error)) throw error;
    const rejected = await casTransition(tx, actor, resources.fileUploadIntent, targetId, expectedVersion, "pending_upload", "rejected", {
      uploaded_at: new Date(),
      scan_started_at: new Date(),
      scan_completed_at: new Date(),
      rejected_at: new Date()
    });
    const response = await detailResource(tx, actor, resources.fileUploadIntent, targetId, "evidence.document.update");
    return {
      resource: "fileUploadIntent",
      id: targetId,
      response,
      auditAfter: response,
      auditOutcome: "failure",
      deferredError: error
    };
  }
  const now = new Date();
  const rollbackExternal = () => port.removeFinalizedObject({ ...access, fileObjectId, objectKey: finalized.objectKey });
  if (finalized.objectKey !== `objects/${fileObjectId}` || finalized.scanState !== "passed") {
    if (finalized.objectKey === `objects/${fileObjectId}`) await rollbackExternal();
    throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Storage promotion contract mismatch", 422);
  }
  try {
    await insertRow(tx, resources.fileObject.table, {
      file_object_id: fileObjectId,
      tenant_id: actor.tenantId,
      ...actorColumns(actor),
      object_key: finalized.objectKey,
      original_filename: current.original_filename,
      declared_mime: current.declared_mime,
      detected_mime: finalized.detectedMime,
      size_bytes: finalized.sizeBytes,
      sha256: finalized.sha256,
      encryption_key_ref: finalized.encryptionKeyRef,
      classification: current.classification,
      retention_policy_id: current.retention_policy_id,
      retention_policy_applicability_id: current.retention_policy_applicability_id,
      scan_status: finalized.scanState,
      scan_completed_at: now,
      storage_version: finalized.storageVersion,
      source_provenance: current.source_provenance,
      effective_from: current.effective_from,
      effective_to: current.effective_to
    });
    await casTransition(tx, actor, resources.fileUploadIntent, targetId, expectedVersion, "pending_upload", "promoted", {
      uploaded_at: now,
      scan_started_at: now,
      scan_completed_at: now,
      promoted_at: now,
      file_object_id: fileObjectId
    });
  } catch (error) {
    await rollbackExternal();
    throw error;
  }
  return {
    resource: "fileObject",
    id: fileObjectId,
    afterCommit: () => port.removeQuarantine({ ...access, uploadIntentId: targetId, quarantineObjectKey: String(current.quarantine_object_key) }),
    rollbackExternal
  };
}

async function replayUploadFinalize(context: MutationContext, result: { resource: ResourceKey; id: string }): Promise<{ response: Record<string, unknown>; afterCommit?: () => Promise<void> }> {
  if (result.resource !== "fileObject" || !context.targetId) throw new FoundationError("TCDX.CONFLICT.IDEMPOTENCY", "Idempotent result is incompatible", 409);
  const intent = await getResource(context.transaction, context.actor, resources.fileUploadIntent, context.targetId, false, "evidence.document.update");
  if (intent.lifecycle_state !== "promoted" || intent.file_object_id !== result.id) throw new FoundationError("TCDX.CONFLICT.IDEMPOTENCY", "Idempotent result is incompatible", 409);
  const response = await detailResource(context.transaction, context.actor, resources.fileObject, result.id, "evidence.document.update");
  const { port, access } = fileStorageContext(context, "evidence.document.update", ["tenant", "owned_object"]);
  return {
    response,
    afterCommit: () => port.removeQuarantine({ ...access, uploadIntentId: context.targetId!, quarantineObjectKey: String(intent.quarantine_object_key) })
  };
}

async function assertEvidenceRequestFulfillmentTarget(tx: Transaction<FoundationDatabase>, actor: CoreActor, evidenceRequestId: string, evidenceVersionId: string): Promise<void> {
  await assertEligibleEvidenceVersion(tx, evidenceVersionId, actor.tenantId);
  const compatible = await sql<{ found: number }>`
    SELECT 1 AS found
      FROM evidence.evidence_requests er
      JOIN evidence.evidence_versions ev ON ev.tenant_id=er.tenant_id AND ev.evidence_version_id=${evidenceVersionId}::uuid
      JOIN evidence.evidence_links el ON el.tenant_id=ev.tenant_id AND el.evidence_version_id=ev.evidence_version_id
     WHERE er.tenant_id=${actor.tenantId}::uuid AND er.evidence_request_id=${evidenceRequestId}::uuid
       AND (
         (er.requirement_id IS NOT NULL AND el.requirement_id=er.requirement_id)
         OR (er.control_id IS NOT NULL AND el.control_id=er.control_id)
         OR (er.requirement_assessment_id IS NOT NULL AND el.requirement_assessment_id=er.requirement_assessment_id)
         OR (er.control_assessment_id IS NOT NULL AND el.control_assessment_id=er.control_assessment_id)
         OR (er.assurance_test_id IS NOT NULL AND el.assurance_test_id=er.assurance_test_id)
       )
     LIMIT 1
  `.execute(tx);
  if (!compatible.rows[0]) throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Evidence version does not satisfy the request target", 422);
}

async function assertControlAssessmentSubmitObjectPolicy(_tx: Transaction<FoundationDatabase>, actor: CoreActor, _body: Body, _id: string): Promise<void> {
  const grants = grantedScopes(actor, "controls.control_assessment.submit");
  if (grants.has("tenant")) return;
  if (grants.has("owned_object")) {
    // v1.7 has canonical Control.business_owner_subject_id but no canonical UserIdentity/TenantMembership-to-Subject relation.
    // Creator identity, names, email and request payload are not ownership authority, so this path remains fail-closed.
    throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Control ownership cannot be resolved for this actor", 403);
  }
  throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
}

async function controlAssessmentSubmissionChanges(body: Body, _actor: CoreActor, current: Record<string, unknown>, tx: Transaction<FoundationDatabase>): Promise<Record<string, unknown>> {
  const methodology = await resolveMethodology(tx, "controls", String(current.methodology_version_ref), false);
  const requestedStatus = string(body, "result_status");
  const design = optionalNumber(body, "design_effectiveness");
  const operating = optionalNumber(body, "operating_effectiveness");
  const coverage = optionalNumber(body, "coverage_percent");
  const conclusion = optionalString(body, "domain_conclusion");
  if ((design === null) !== (operating === null)) invalidField(design === null ? "design_effectiveness" : "operating_effectiveness");
  if (requestedStatus === "valid") {
    if (design === null) invalidField("design_effectiveness");
    if (operating === null) invalidField("operating_effectiveness");
    if (coverage === null || coverage < methodology.minimum_coverage) invalidField("coverage_percent");
    if (!conclusion || !["effective", "partially_effective", "ineffective"].includes(conclusion)) invalidField("domain_conclusion");
  }
  if (requestedStatus === "insufficient_coverage") {
    if (design === null) invalidField("design_effectiveness");
    if (operating === null) invalidField("operating_effectiveness");
    if (coverage === null || coverage >= methodology.minimum_coverage) invalidField("coverage_percent");
  }
  const criteriaUnpublished = methodology.version_number === 1 && methodology.methodology_code === "BASELINE_CONTROL_EFFECTIVENESS";
  const resultStatus = requestedStatus === "valid" && criteriaUnpublished ? "insufficient_data" : requestedStatus;
  return {
    result_status: resultStatus,
    domain_conclusion: resultStatus === "valid" ? conclusion : null,
    design_effectiveness: design,
    operating_effectiveness: operating,
    overall_effectiveness: design === null || operating === null ? null : Math.min(design, operating),
    coverage_percent: coverage,
    assessed_at: new Date()
  };
}

async function requirementAssessmentSubmissionChanges(body: Body, _actor: CoreActor, current: Record<string, unknown>, tx: Transaction<FoundationDatabase>): Promise<Record<string, unknown>> {
  const methodology = await resolveMethodology(tx, "compliance", String(current.methodology_version_ref), false);
  const requestedStatus = string(body, "result_status");
  const criteriaUnpublished = methodology.version_number === 1 && methodology.methodology_code === "BASELINE_COMPLIANCE";
  const resultStatus = requestedStatus === "valid" && criteriaUnpublished ? "insufficient_data" : requestedStatus;
  return { result_status: resultStatus, domain_conclusion: resultStatus === "valid" ? optionalString(body, "domain_conclusion") : null,
    coverage_percent: body.coverage_percent ?? null, assessed_at: new Date() };
}

async function assertAssessmentPublicationSufficiency(tx: Transaction<FoundationDatabase>, _actor: CoreActor, _body: Body, _id: string, current: Record<string, unknown>, domain: "compliance" | "controls"): Promise<void> {
  const methodology = await resolveMethodology(tx, domain, String(current.methodology_version_ref), false);
  if (methodology.version_number === 1
      && methodology.methodology_code === (domain === "compliance" ? "BASELINE_COMPLIANCE" : "BASELINE_CONTROL_EFFECTIVENESS")) {
    throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Published methodology does not establish complete sufficiency criteria", 422, false, { result_status: "insufficient_data" });
  }
  if (current.result_status !== "valid") {
    throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Only a sufficient valid result can be published", 422, false, { result_status: current.result_status });
  }
}

type TransitionSpec = { resource: ResourceKey; entity: string; from: string; command: string; requiresDistinctActor?: boolean; changes?: (body: Body, actor: CoreActor, current: Record<string, unknown>, tx: Transaction<FoundationDatabase>) => Record<string, unknown> | Promise<Record<string, unknown>>; beforeLoad?: (tx: Transaction<FoundationDatabase>, actor: CoreActor, body: Body, id: string) => Promise<void>; before?: (tx: Transaction<FoundationDatabase>, actor: CoreActor, body: Body, id: string, current: Record<string, unknown>) => Promise<void>; after?: (tx: Transaction<FoundationDatabase>, actor: CoreActor, body: Body, id: string, row: Record<string, unknown>) => Promise<void> };

function transition(spec: TransitionSpec) {
  return async ({ transaction: tx, actor, body, targetId }: MutationContext): Promise<MutationResult> => {
    if (!targetId) throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400);
    const definition = resources[spec.resource];
    const permission = mutationPermission.get(spec.command)!;
    if (spec.beforeLoad) await spec.beforeLoad(tx, actor, body, targetId);
    const current = await getResource(tx, actor, definition, targetId, true, permission);
    if(spec.command==='evidence.submit') await assertEvidenceVersionSubmittable(tx,targetId,actor);
    const edge = await assertLifecycleEdge(tx, actor, { entityType: spec.entity, fromState: spec.from, commandCode: spec.command, permission });
    if(spec.command==='evidence.submit') {
      const scopes=grantedScopes(actor,permission);
      if(!scopes.has('owned_object')&&!scopes.has('assigned_object')&&edge.preconditionPolicyRef!=='contract:initial-retention-source-submit:v1.11') {
        throw new FoundationError("TCDX.LIFECYCLE.TRANSITION_DENIED","Initial source registry policy is required",409);
      }
    }
    if (edge.auditEventCode !== mutationAudit.get(spec.command)) throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Audit contract mismatch", 422);
    if (spec.requiresDistinctActor) {
      const previous = await tx.executeQuery<{ prior_actor: string | null }>(CompiledQuery.raw(`SELECT COALESCE(updated_by_user_identity_id,created_by_user_identity_id) AS prior_actor FROM ${definition.table} WHERE tenant_id=$1::uuid AND "${definition.idColumn}"=$2::uuid`, [actor.tenantId, targetId]));
      if (previous.rows[0]?.prior_actor === actor.userIdentityId) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
    }
    if (spec.before) await spec.before(tx, actor, body, targetId, current);
    const row = await casTransition(tx, actor, definition, targetId, version(body), spec.from, edge.toState, await spec.changes?.(body, actor, current, tx));
    if (spec.after) await spec.after(tx, actor, body, targetId, row);
    return { resource: spec.resource, id: targetId };
  };
}

async function replayEvidenceSubmit({transaction:tx,actor,targetId}:MutationContext):Promise<{response:Record<string,unknown>}> {
  if(!targetId) invalidField("target_id");
  const scopes=grantedScopes(actor,"evidence.evidence.submit");
  if(!scopes.has("owned_object")&&!scopes.has("assigned_object")) {
    if(!scopes.has("tenant")) throw new FoundationError("TCDX.AUTHORIZATION.DENIED","Access denied",403);
    const chain=await sql<{valid:boolean}>`SELECT EXISTS (
      SELECT 1 FROM evidence.evidence_versions ev JOIN evidence.evidences e ON e.tenant_id=ev.tenant_id AND e.evidence_id=ev.evidence_id
      JOIN evidence.file_objects f ON f.tenant_id=ev.tenant_id AND f.file_object_id=ev.file_object_id
      JOIN privacy.retention_policy_applicabilities a ON a.tenant_id=ev.tenant_id AND a.retention_policy_applicability_id=ev.retention_policy_applicability_id
      JOIN privacy.retention_policies p ON p.tenant_id=a.tenant_id AND p.retention_policy_id=a.retention_policy_id
      WHERE ev.tenant_id=${actor.tenantId}::uuid AND ev.evidence_version_id=${targetId}::uuid
        AND ev.created_by_user_identity_id=${actor.userIdentityId}::uuid AND f.created_by_user_identity_id=ev.created_by_user_identity_id
        AND f.retention_policy_applicability_id=a.retention_policy_applicability_id AND e.retention_policy_id=a.retention_policy_id AND f.retention_policy_id=a.retention_policy_id
        AND f.classification=a.classification AND f.scan_status='passed' AND p.lifecycle_state='published' AND p.policy_kind<>'legal_hold'
        AND (a.source_evidence_version_id=ev.evidence_version_id OR (a.lifecycle_state='draft' AND a.source_evidence_version_id IS NULL))
        AND NOT EXISTS (SELECT 1 FROM evidence.evidence_links el WHERE el.tenant_id=ev.tenant_id AND el.evidence_version_id=ev.evidence_version_id)
        AND EXISTS (SELECT 1 FROM evidence.file_upload_intents fi WHERE fi.tenant_id=ev.tenant_id AND fi.file_object_id=f.file_object_id
          AND fi.retention_policy_applicability_id=a.retention_policy_applicability_id AND fi.lifecycle_state='promoted'
          AND fi.created_by_user_identity_id=ev.created_by_user_identity_id)
      ) AS valid`.execute(tx);
    if(!chain.rows[0]?.valid||(!actor.roles.includes('EVIDENCE_OWNER')&&!actor.roles.includes('TENANT_ADMIN'))) throw new FoundationError("TCDX.AUTHORIZATION.DENIED","Access denied",403);
  }
  return {response:await detailResource(tx,actor,resources.evidenceVersion,targetId,"evidence.evidence.submit")};
}

const mutationPermission = new Map<string, string>();
const mutationAudit = new Map<string, string>();

const operationScopes: Readonly<Record<string, readonly ScopeKind[]>> = {
  applicabilityCreate: ["tenant"], applicabilitySubmit: ["tenant", "owned_object"], applicabilityApprove: ["tenant"],
  requirementAssessmentCreate: ["tenant"], requirementAssessmentStart: ["assigned_object", "tenant"], requirementAssessmentSubmit: ["assigned_object", "tenant"], requirementAssessmentApprove: ["tenant"],
  soaCreate: ["tenant"], soaPublish: ["tenant"], controlInstantiate: ["tenant"],
  controlAssessmentCreate: ["tenant", "owned_object"], controlAssessmentStart: ["tenant"], controlAssessmentSubmit: ["owned_object", "tenant"], controlAssessmentReview: ["tenant"], controlAssessmentApprove: ["tenant"],
  assuranceTestCreate: ["tenant", "audit_engagement"], assuranceTestStart: ["assigned_object", "audit_engagement"], assuranceTestExecute: ["assigned_object"], assuranceTestReview: ["tenant", "audit_engagement"], assuranceTestApprove: ["tenant"],
  uploadIntentCreate: ["tenant"], uploadFinalize: ["tenant", "owned_object"],
  evidenceRequestCreate: ["tenant"], evidenceRequestFulfill: ["assigned_object", "tenant"], evidenceCreate: ["tenant", "assigned_object", "owned_object"],
  evidenceSubmit: ["owned_object", "assigned_object", "tenant"], evidenceReviewStart: ["assigned_object", "tenant"], evidenceApprove: ["tenant"], evidenceReject: ["tenant"],
  issueCreate: ["tenant"], issueTriage: ["tenant"], issueStartRemediation: ["tenant", "assigned_object", "owned_object"], issueRequestVerification: ["tenant", "assigned_object", "owned_object"], issueVerifyClose: ["tenant", "assigned_object", "owned_object"],
  actionCreate: ["tenant"], actionStart: ["assigned_object", "owned_object"], actionSubmitForReview: ["assigned_object", "owned_object"], actionComplete: ["assigned_object", "owned_object"], actionVerify: ["tenant"],
  retentionPolicyCreate: ["tenant"], retentionPolicyUpdate: ["tenant"], retentionPolicySubmitForReview: ["tenant"], retentionPolicyReview: ["tenant"], retentionPolicyApprove: ["tenant"], retentionPolicyPublish: ["tenant"],
  retentionApplicabilityBindInitialSource: ["tenant"], retentionApplicabilityCreate: ["tenant"], retentionApplicabilitySubmitForReview: ["tenant"], retentionApplicabilityReview: ["tenant"], retentionApplicabilityApprove: ["tenant"], retentionApplicabilityPublish: ["tenant"], legalHoldRelease: ["tenant"]
};

function def(value: Omit<MutationDefinition, "scopes">): MutationDefinition {
  const scopes = operationScopes[value.operationId];
  if (!scopes) throw new Error(`Missing scope contract for ${value.operationId}`);
  return { ...value, scopes };
}

const e = ["expected_version"] as const;
const transitionDefinitions: Array<[string, Omit<MutationDefinition, "execute" | "scopes">, TransitionSpec]> = [
  ["applicabilitySubmit", { operationId: "applicabilitySubmit", permission: "compliance.applicability.submit", capability: "ISO_COMPLIANCE", auditEvent: "audit.compliance.applicability.submit.v1", domainEvent: "compliance.applicability.submitted.v1", allowedFields: [...e, "rationale"], requiredFields: [...e, "rationale"] }, { resource: "applicability", entity: "RequirementApplicability", from: "draft", command: "applicability.submit", changes: (b) => ({ rationale: string(b, "rationale") }) }],
  ["applicabilityApprove", { operationId: "applicabilityApprove", permission: "compliance.applicability.approve", capability: "ISO_COMPLIANCE", auditEvent: "audit.compliance.applicability.approve.v1", domainEvent: "compliance.applicability.approved.v1", allowedFields: e, requiredFields: e }, { resource: "applicability", entity: "RequirementApplicability", from: "submitted", command: "applicability.approve", requiresDistinctActor: true, changes: (_b, a) => ({ approved_at: new Date(), approved_by_user_identity_id: a.userIdentityId }) }],
  ["requirementAssessmentStart", { operationId: "requirementAssessmentStart", permission: "compliance.requirement_assessment.update", capability: "ISO_COMPLIANCE", auditEvent: "audit.compliance.requirement_assessment.start.v1", allowedFields: e, requiredFields: e }, { resource: "requirementAssessment", entity: "RequirementAssessment", from: "not_assessed", command: "requirement_assessment.start" }],
  ["requirementAssessmentSubmit", { operationId: "requirementAssessmentSubmit", permission: "compliance.requirement_assessment.submit", capability: "ISO_COMPLIANCE", auditEvent: "audit.compliance.requirement_assessment.submit.v1", domainEvent: "compliance.requirement_assessment.assessed.v1", allowedFields: [...e, "result_status", "domain_conclusion", "coverage_percent"], requiredFields: [...e, "result_status"] }, { resource: "requirementAssessment", entity: "RequirementAssessment", from: "in_progress", command: "requirement_assessment.submit", changes: requirementAssessmentSubmissionChanges }],
  ["requirementAssessmentApprove", { operationId: "requirementAssessmentApprove", permission: "compliance.requirement_assessment.approve", capability: "ISO_COMPLIANCE", auditEvent: "audit.compliance.requirement_assessment.approve.v1", domainEvent: "compliance.requirement_assessment.approved.v1", allowedFields: e, requiredFields: e }, { resource: "requirementAssessment", entity: "RequirementAssessment", from: "assessed", command: "requirement_assessment.approve", requiresDistinctActor: true, before: (tx, actor, body, id, current) => assertAssessmentPublicationSufficiency(tx, actor, body, id, current, "compliance"), changes: () => ({ approved_at: new Date() }) }],
  ["soaPublish", { operationId: "soaPublish", permission: "compliance.soa.publish", capability: "ISO_COMPLIANCE", auditEvent: "audit.compliance.soa.publish.v1", domainEvent: "compliance.soa.published.v1", allowedFields: [...e, "reason"], requiredFields: [...e, "reason"] }, { resource: "soa", entity: "StatementOfApplicability", from: "draft", command: "soa.publish", changes: () => ({ published_at: new Date(), approved_at: new Date() }) }],
  ["controlAssessmentStart", { operationId: "controlAssessmentStart", permission: "controls.control_assessment.update", capability: "CONTROLS_ASSURANCE", auditEvent: "audit.controls.control_assessment.start.v1", allowedFields: e, requiredFields: e }, { resource: "controlAssessment", entity: "ControlAssessment", from: "planned", command: "control_assessment.start" }],
  ["controlAssessmentSubmit", { operationId: "controlAssessmentSubmit", permission: "controls.control_assessment.submit", capability: "CONTROLS_ASSURANCE", auditEvent: "audit.controls.control_assessment.complete.v1", domainEvent: "controls.control_assessment.completed.v1", allowedFields: [...e, "result_status", "domain_conclusion", "design_effectiveness", "operating_effectiveness", "coverage_percent"], requiredFields: [...e, "result_status"] }, { resource: "controlAssessment", entity: "ControlAssessment", from: "in_progress", command: "control_assessment.complete", beforeLoad: assertControlAssessmentSubmitObjectPolicy, changes: controlAssessmentSubmissionChanges }],
  ["controlAssessmentReview", { operationId: "controlAssessmentReview", permission: "controls.control_assessment.review", capability: "CONTROLS_ASSURANCE", auditEvent: "audit.controls.control_assessment.review.v1", allowedFields: e, requiredFields: e }, { resource: "controlAssessment", entity: "ControlAssessment", from: "completed", command: "control_assessment.review", requiresDistinctActor: true }],
  ["controlAssessmentApprove", { operationId: "controlAssessmentApprove", permission: "controls.control_assessment.approve", capability: "CONTROLS_ASSURANCE", auditEvent: "audit.controls.control_assessment.approve.v1", domainEvent: "controls.control_assessment.approved.v1", allowedFields: e, requiredFields: e }, { resource: "controlAssessment", entity: "ControlAssessment", from: "reviewed", command: "control_assessment.approve", requiresDistinctActor: true, before: (tx, actor, body, id, current) => assertAssessmentPublicationSufficiency(tx, actor, body, id, current, "controls") }],
  ["assuranceTestStart", { operationId: "assuranceTestStart", permission: "controls.assurance_test.execute", capability: "CONTROLS_ASSURANCE", auditEvent: "audit.controls.assurance_test.start.v1", allowedFields: e, requiredFields: e }, { resource: "assuranceTest", entity: "AssuranceTest", from: "planned", command: "assurance_test.start" }],
  ["assuranceTestExecute", { operationId: "assuranceTestExecute", permission: "controls.assurance_test.execute", capability: "CONTROLS_ASSURANCE", auditEvent: "audit.controls.assurance_test.execute.v1", domainEvent: "controls.assurance_test.completed.v1", allowedFields: [...e, "result_status", "domain_conclusion", "samples"], requiredFields: [...e, "result_status"] }, { resource: "assuranceTest", entity: "AssuranceTest", from: "in_progress", command: "assurance_test.execute", changes: (b) => ({ result_status: string(b, "result_status"), domain_conclusion: optionalString(b, "domain_conclusion"), executed_at: new Date() }), after: async (tx, actor, body, id) => { if (!Array.isArray(body.samples)) return; for (const raw of body.samples) { const sample = raw as Body; await insertRow(tx, "controls.assurance_samples", { assurance_sample_id: newUuidV7(), tenant_id: actor.tenantId, ...actorColumns(actor), assurance_test_id: id, sample_code: string(sample, "sample_code"), population_count: sample.population_count ?? null, sample_count: number(sample, "sample_count"), selection_method: string(sample, "selection_method"), sample_period_start: optionalString(sample, "sample_period_start"), sample_period_end: optionalString(sample, "sample_period_end"), result_status: string(sample, "result_status") }); } } }],
  ["assuranceTestReview", { operationId: "assuranceTestReview", permission: "controls.assurance_test.review", capability: "CONTROLS_ASSURANCE", auditEvent: "audit.controls.assurance_test.review.v1", allowedFields: e, requiredFields: e }, { resource: "assuranceTest", entity: "AssuranceTest", from: "completed", command: "assurance_test.review", requiresDistinctActor: true, changes: (_b, a) => ({ reviewed_at: new Date(), reviewer_membership_id: a.membershipId }) }],
  ["assuranceTestApprove", { operationId: "assuranceTestApprove", permission: "controls.assurance_test.approve", capability: "CONTROLS_ASSURANCE", auditEvent: "audit.controls.assurance_test.approve.v1", allowedFields: e, requiredFields: e }, { resource: "assuranceTest", entity: "AssuranceTest", from: "reviewed", command: "assurance_test.approve", requiresDistinctActor: true, changes: () => ({ approved_at: new Date() }) }],
  ["evidenceRequestFulfill", { operationId: "evidenceRequestFulfill", permission: "evidence.evidence_request.submit", capability: "EVIDENCE_DOCUMENTS", auditEvent: "audit.lifecycle.evidence_request.fulfill.v1", domainEvent: "evidence.request.fulfilled.v1", allowedFields: [...e, "evidence_version_id"], requiredFields: [...e, "evidence_version_id"] }, { resource: "evidenceRequest", entity: "EvidenceRequest", from: "open", command: "evidence_request.fulfill", before: async (tx, actor, body, id) => assertEvidenceRequestFulfillmentTarget(tx, actor, id, string(body, "evidence_version_id")), changes: () => ({ fulfilled_at: new Date() }), after: async (tx, actor, body, id) => { await insertRow(tx, "evidence.evidence_request_fulfillments", { evidence_request_fulfillment_id: newUuidV7(), tenant_id: actor.tenantId, ...actorColumns(actor), evidence_request_id: id, evidence_version_id: string(body, "evidence_version_id"), fulfilled_at: new Date() }); } }],
  ["evidenceSubmit", { operationId: "evidenceSubmit", permission: "evidence.evidence.submit", capability: "EVIDENCE_DOCUMENTS", auditEvent: "audit.evidence.evidence.submit.v1", domainEvent: "evidence.evidence.submitted.v1", allowedFields: e, requiredFields: e }, { resource: "evidenceVersion", entity: "EvidenceVersion", from: "draft", command: "evidence.submit", changes: () => ({ submitted_at: new Date() }) }],
  ["evidenceReviewStart", { operationId: "evidenceReviewStart", permission: "evidence.evidence.review", capability: "EVIDENCE_DOCUMENTS", auditEvent: "audit.evidence.evidence.start_review.v1", allowedFields: e, requiredFields: e }, { resource: "evidenceVersion", entity: "EvidenceVersion", from: "submitted", command: "evidence.start_review" }],
  ["evidenceApprove", { operationId: "evidenceApprove", permission: "evidence.evidence.approve", capability: "EVIDENCE_DOCUMENTS", auditEvent: "audit.evidence.evidence.approve.v1", domainEvent: "evidence.evidence.approved.v1", allowedFields: [...e, "sufficiency", "relevance", "rationale"], requiredFields: [...e, "rationale"] }, { resource: "evidenceVersion", entity: "EvidenceVersion", from: "under_review", command: "evidence.approve", changes: () => ({ approved_at: new Date(), published_at: new Date() }), after: async (tx, actor, body, id, row) => { const creator = await sql<{ created_by_user_identity_id: string | null }>`SELECT created_by_user_identity_id FROM evidence.evidence_versions WHERE tenant_id=${actor.tenantId}::uuid AND evidence_version_id=${id}::uuid`.execute(tx); if (creator.rows[0]?.created_by_user_identity_id === actor.userIdentityId) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403); await insertRow(tx, "evidence.evidence_reviews", { evidence_review_id: newUuidV7(), tenant_id: actor.tenantId, ...actorColumns(actor), evidence_id: row.evidence_id, evidence_version_id: id, reviewer_membership_id: actor.membershipId, decision: "approved", sufficiency: optionalString(body, "sufficiency"), relevance: optionalString(body, "relevance"), rationale: string(body, "rationale"), reviewed_at: new Date() }); } }],
  ["evidenceReject", { operationId: "evidenceReject", permission: "evidence.evidence.reject", capability: "EVIDENCE_DOCUMENTS", auditEvent: "audit.evidence.evidence.reject.v1", domainEvent: "evidence.evidence.rejected.v1", allowedFields: [...e, "sufficiency", "relevance", "rationale"], requiredFields: [...e, "rationale"] }, { resource: "evidenceVersion", entity: "EvidenceVersion", from: "under_review", command: "evidence.reject", after: async (tx, actor, body, id, row) => { const creator = await sql<{ created_by_user_identity_id: string | null }>`SELECT created_by_user_identity_id FROM evidence.evidence_versions WHERE tenant_id=${actor.tenantId}::uuid AND evidence_version_id=${id}::uuid`.execute(tx); if (creator.rows[0]?.created_by_user_identity_id === actor.userIdentityId) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403); await insertRow(tx, "evidence.evidence_reviews", { evidence_review_id: newUuidV7(), tenant_id: actor.tenantId, ...actorColumns(actor), evidence_id: row.evidence_id, evidence_version_id: id, reviewer_membership_id: actor.membershipId, decision: "rejected", sufficiency: optionalString(body, "sufficiency"), relevance: optionalString(body, "relevance"), rationale: string(body, "rationale"), reviewed_at: new Date() }); } }],
  ["issueTriage", { operationId: "issueTriage", permission: "remediation.issue.transition", capability: "ISSUES_ACTIONS", auditEvent: "audit.remediation.issue.triage.v1", domainEvent: "remediation.issue.triaged.v1", allowedFields: [...e, "severity", "priority", "business_owner_subject_id", "due_date"], requiredFields: [...e, "severity", "priority"] }, { resource: "issue", entity: "Issue", from: "open", command: "issue.triage", before: async (tx, actor, body) => { const owner = optionalString(body, "business_owner_subject_id"); if (owner) await referenceExists(tx, "org.subjects", "subject_id", owner, actor.tenantId); }, changes: (b) => ({ severity: string(b, "severity"), priority: string(b, "priority"), business_owner_subject_id: optionalString(b, "business_owner_subject_id"), due_date: optionalString(b, "due_date") }) }],
  ["issueStartRemediation", { operationId: "issueStartRemediation", permission: "remediation.issue.transition", capability: "ISSUES_ACTIONS", auditEvent: "audit.remediation.issue.start_remediation.v1", allowedFields: e, requiredFields: e }, { resource: "issue", entity: "Issue", from: "triaged", command: "issue.start_remediation" }],
  ["issueRequestVerification", { operationId: "issueRequestVerification", permission: "remediation.issue.transition", capability: "ISSUES_ACTIONS", auditEvent: "audit.remediation.issue.request_verification.v1", allowedFields: e, requiredFields: e }, { resource: "issue", entity: "Issue", from: "remediation_in_progress", command: "issue.request_verification" }],
  ["issueVerifyClose", { operationId: "issueVerifyClose", permission: "remediation.issue.transition", capability: "ISSUES_ACTIONS", auditEvent: "audit.remediation.issue.verify_close.v1", allowedFields: [...e, "verification_decision", "rationale"], requiredFields: [...e, "verification_decision", "rationale"] }, { resource: "issue", entity: "Issue", from: "pending_verification", command: "issue.verify_close", requiresDistinctActor: true, changes: () => ({ closed_at: new Date() }) }],
  ["actionStart", { operationId: "actionStart", permission: "remediation.action.transition", capability: "ISSUES_ACTIONS", auditEvent: "audit.remediation.action.start.v1", allowedFields: e, requiredFields: e }, { resource: "action", entity: "Action", from: "pending", command: "action.start" }],
  ["actionSubmitForReview", { operationId: "actionSubmitForReview", permission: "remediation.action.transition", capability: "ISSUES_ACTIONS", auditEvent: "audit.remediation.action.submit_review.v1", allowedFields: e, requiredFields: e }, { resource: "action", entity: "Action", from: "in_progress", command: "action.submit_review" }],
  ["actionComplete", { operationId: "actionComplete", permission: "remediation.action.transition", capability: "ISSUES_ACTIONS", auditEvent: "audit.remediation.action.complete.v1", domainEvent: "remediation.action.completed.v1", allowedFields: [...e, "evidence_version_id", "link_role"], requiredFields: [...e, "evidence_version_id", "link_role"] }, { resource: "action", entity: "Action", from: "in_review", command: "action.complete", before: async (tx, actor, body) => assertEligibleEvidenceVersion(tx, string(body, "evidence_version_id"), actor.tenantId), changes: () => ({ completed_at: new Date() }), after: async (tx, actor, body, id) => { const evidence = string(body, "evidence_version_id"); await insertRow(tx, "remediation.action_evidence_links", { action_evidence_link_id: newUuidV7(), tenant_id: actor.tenantId, ...actorColumns(actor), action_id: id, evidence_version_id: evidence, link_role: string(body, "link_role") }); } }],
  ["actionVerify", { operationId: "actionVerify", permission: "remediation.action.verify", capability: "ISSUES_ACTIONS", auditEvent: "audit.remediation.action.verify.v1", domainEvent: "remediation.action.verified.v1", allowedFields: [...e, "verification_decision", "rationale", "retest_reference"], requiredFields: [...e, "verification_decision", "rationale"] }, { resource: "action", entity: "Action", from: "completed", command: "action.verify", requiresDistinctActor: true, before: async (_tx, actor, _body, _id, current) => { if (current.assigned_membership_id === actor.membershipId) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403); }, changes: () => ({ verified_at: new Date() }), after: async (tx, actor, body, id) => { await insertRow(tx, "remediation.action_verifications", { action_verification_id: newUuidV7(), tenant_id: actor.tenantId, ...actorColumns(actor), action_id: id, verifier_membership_id: actor.membershipId, verification_decision: string(body, "verification_decision"), rationale: string(body, "rationale"), verified_at: new Date(), retest_reference: optionalString(body, "retest_reference") }); } }]
];

export const mutations = new Map<string, MutationDefinition>();

for (const [key, base, spec] of transitionDefinitions) {
  mutationPermission.set(spec.command, base.permission);
  mutationAudit.set(spec.command, base.auditEvent);
  mutations.set(key, def({ ...base, execute: transition(spec), ...(key==='evidenceSubmit'?{replay:replayEvidenceSubmit}:{}) }));
}

function addCreate(operationId: string, permission: string, capability: string, auditEvent: string, allowedFields: readonly string[], requiredFields: readonly string[], execute: MutationDefinition["execute"], domainEvent?: string): void {
  mutations.set(operationId, def({ operationId, permission, capability, auditEvent, ...(domainEvent ? { domainEvent } : {}), allowedFields, requiredFields, execute }));
}

addCreate("applicabilityCreate", "compliance.applicability.create", "ISO_COMPLIANCE", "audit.compliance.applicability.create.v1", ["requirement_id", "scope_subject_id", "applicability_decision", "rationale", "effective_from", "effective_to"], ["requirement_id", "applicability_decision", "effective_from"], createApplicability);
addCreate("requirementAssessmentCreate", "compliance.requirement_assessment.create", "ISO_COMPLIANCE", "audit.compliance.requirement_assessment.create.v1", ["requirement_applicability_id", "methodology_version_ref", "effective_configuration_id"], ["requirement_applicability_id", "methodology_version_ref"], createRequirementAssessment);
addCreate("soaCreate", "compliance.soa.create", "ISO_COMPLIANCE", "audit.compliance.soa.create.v1", ["framework_version_id", "title", "effective_from", "items"], ["framework_version_id", "title", "items"], createSoa);
addCreate("controlInstantiate", "controls.control.create", "CONTROLS_ASSURANCE", "audit.controls.control.instantiate.v1", ["based_on_control_version_id", "control_code", "name", "business_owner_subject_id", "objective", "control_type", "nature", "frequency_code", "execution_method", "verification_method", "minimum_evidence", "suggested_owner_role_code", "effective_from", "effective_to"], ["based_on_control_version_id", "control_code", "name", "business_owner_subject_id", "objective", "control_type", "nature", "frequency_code", "execution_method", "verification_method", "minimum_evidence"], instantiateControl, "controls.control.instantiated.v1");
addCreate("controlAssessmentCreate", "controls.control_assessment.create", "CONTROLS_ASSURANCE", "audit.controls.control_assessment.create.v1", ["control_id", "control_version_id", "methodology_version_ref", "effective_configuration_id"], ["control_id", "control_version_id", "methodology_version_ref"], createControlAssessment);
addCreate("assuranceTestCreate", "controls.assurance_test.create", "CONTROLS_ASSURANCE", "audit.controls.assurance_test.create.v1", ["control_id", "control_version_id", "test_code", "planned_at"], ["control_id", "control_version_id", "test_code"], createAssuranceTest);
addCreate("retentionPolicyCreate", "privacy.retention_policy.create", "PRIVACY", "audit.privacy.retention_policy.create.v1", ["policy_code", "version_number", "policy_kind", "retention_seconds", "trigger_event_code", "precedence_rank", "is_mandatory"], ["policy_code", "version_number", "policy_kind", "trigger_event_code", "precedence_rank", "is_mandatory"], createRetentionPolicy);
mutations.set("retentionPolicyUpdate", def({
  operationId: "retentionPolicyUpdate", permission: "privacy.retention_policy.update", capability: "PRIVACY",
  auditEvent: "audit.privacy.retention_policy.update.v1",
  allowedFields: ["expected_version", "retention_seconds", "is_mandatory"],
  requiredFields: ["expected_version", "is_mandatory"],
  execute: updateRetentionPolicy
}));
for (const [operationId, permission, auditEvent, fromState, command, approve, publish, domainEvent] of [
  ["retentionPolicySubmitForReview", "privacy.retention_policy.update", "audit.privacy.retention_policy.submit_for_review.v1", "draft", "retention_policy.submit_for_review", false, false, undefined],
  ["retentionPolicyReview", "privacy.retention_policy.review", "audit.privacy.retention_policy.review.v1", "draft", "retention_policy.review", false, false, undefined],
  ["retentionPolicyApprove", "privacy.retention_policy.approve", "audit.privacy.retention_policy.approve.v1", "under_review", "retention_policy.approve", true, false, undefined],
  ["retentionPolicyPublish", "privacy.retention_policy.publish", "audit.privacy.retention_policy.publish.v1", "approved", "retention_policy.publish", false, true, "privacy.retention_policy.published.v1"]
] as const) {
  mutationPermission.set(command, permission);
  mutationAudit.set(command, auditEvent);
  mutations.set(operationId, def({
    operationId, permission, capability: "PRIVACY", auditEvent,
    ...(domainEvent ? { domainEvent } : {}),
    allowedFields: e, requiredFields: e,
    execute: retentionPolicyTransition(fromState, command, approve, publish)
  }));
}
addCreate("retentionApplicabilityCreate", "privacy.retention_policy.create", "PRIVACY",
  "audit.privacy.retention_policy_applicability.create.v1",
  ["retention_policy_id", "version_number", "classification", "scope_subject_id", "processing_activity_id", "legal_basis_id", "source_evidence_version_id", "source_clause_ref", "effective_from", "effective_to", "supersedes_applicability_id"],
  ["retention_policy_id", "version_number", "classification"], createRetentionApplicability);
for (const [operationId, permission, auditEvent, fromState, command, approve, publish] of [
  ["retentionApplicabilitySubmitForReview", "privacy.retention_policy.update", "audit.privacy.retention_policy_applicability.submit_for_review.v1", "draft", "retention_policy_applicability.submit_for_review", false, false],
  ["retentionApplicabilityReview", "privacy.retention_policy.review", "audit.privacy.retention_policy_applicability.review.v1", "draft", "retention_policy_applicability.review", false, false],
  ["retentionApplicabilityApprove", "privacy.retention_policy.approve", "audit.privacy.retention_policy_applicability.approve.v1", "under_review", "retention_policy_applicability.approve", true, false],
  ["retentionApplicabilityPublish", "privacy.retention_policy.publish", "audit.privacy.retention_policy_applicability.publish.v1", "approved", "retention_policy_applicability.publish", false, true]
] as const) {
  mutationPermission.set(command, permission);
  mutationAudit.set(command, auditEvent);
  mutations.set(operationId, def({ operationId, permission, capability: "PRIVACY", auditEvent,
    allowedFields: ["expected_version"], requiredFields: ["expected_version"],
    execute: retentionApplicabilityTransition(fromState, command, approve, publish) }));
}
mutations.set("retentionApplicabilityBindInitialSource", def({
  operationId:"retentionApplicabilityBindInitialSource",permission:"privacy.retention_policy.update",capability:"PRIVACY",
  auditEvent:"audit.privacy.retention_policy_applicability.bind_initial_source.v1",
  allowedFields:["expected_version","source_evidence_version_id","source_clause_ref","effective_from","effective_to"],
  requiredFields:["expected_version","source_evidence_version_id","source_clause_ref","effective_from"],execute:bindInitialSource,
  replay:async ({transaction,actor,targetId})=>{ if(!targetId) invalidField("target_id"); await assertInitialSourceBinder(transaction,actor,targetId);
    return {response:await detailResource(transaction,actor,resources.retentionPolicyApplicability,targetId,"privacy.retention_policy.update")}; }
}));
mutations.set("legalHoldRelease", def({
  operationId: "legalHoldRelease", permission: "privacy.retention_policy.legal_hold.release", capability: "PRIVACY",
  auditEvent: "audit.privacy.retention_policy.legal_hold.release.v1",
  allowedFields: ["expected_version", "reason", "release_source_evidence_version_id"],
  requiredFields: ["expected_version", "reason"],
  execute: releaseLegalHold, replay: replayLegalHoldRelease
}));
mutations.set("uploadIntentCreate", def({
  operationId: "uploadIntentCreate",
  permission: "evidence.document.create",
  capability: "EVIDENCE_DOCUMENTS",
  auditEvent: "audit.evidence.file.upload_requested.v1",
  allowedFields: ["original_filename", "declared_mime", "size_bytes", "classification", "retention_policy_id", "retention_policy_applicability_id", "scope_subject_id", "processing_activity_id", "source_provenance", "effective_from", "effective_to"],
  requiredFields: ["original_filename", "declared_mime", "size_bytes", "classification", "retention_policy_id", "retention_policy_applicability_id", "source_provenance"],
  execute: createUploadIntent,
  replay: replayUploadIntent
}));
mutations.set("uploadFinalize", def({
  operationId: "uploadFinalize",
  permission: "evidence.document.update",
  capability: "EVIDENCE_DOCUMENTS",
  auditEvent: "audit.evidence.file.finalize.v1",
  domainEvent: "evidence.file.quarantined.v1",
  allowedFields: e,
  requiredFields: e,
  execute: finalizeUploadIntent,
  replay: replayUploadFinalize
}));
addCreate("evidenceRequestCreate", "evidence.evidence_request.create", "EVIDENCE_DOCUMENTS", "audit.evidence.request.create.v1", ["request_code", "requirement_id", "control_id", "requirement_assessment_id", "control_assessment_id", "assurance_test_id", "assigned_membership_id", "due_at"], ["request_code"], createEvidenceRequest, "evidence.request.opened.v1");
addCreate("evidenceCreate", "evidence.evidence.create", "EVIDENCE_DOCUMENTS", "audit.evidence.evidence.create.v1", ["evidence_code", "evidence_type", "business_owner_subject_id", "valid_from", "valid_to", "retention_policy_id", "source_kind", "file_object_id", "period_start", "period_end", "effective_from", "effective_to", "expires_at", "provenance_ref", "links"], ["evidence_code", "evidence_type", "retention_policy_id", "source_kind", "file_object_id", "provenance_ref", "links"], createEvidence, "evidence.evidence.created.v1");
addCreate("issueCreate", "remediation.issue.create", "ISSUES_ACTIONS", "audit.remediation.issue.create.v1", ["issue_code", "issue_kind", "title", "description", "severity", "priority", "business_owner_subject_id", "due_date", "requirement_assessment_id", "control_assessment_id", "assurance_test_id", "origin_role"], ["issue_code", "issue_kind", "title", "description", "severity", "priority", "origin_role"], createIssue, "remediation.issue.opened.v1");
addCreate("actionCreate", "remediation.action.create", "ISSUES_ACTIONS", "audit.remediation.action.create.v1", ["action_code", "title", "description", "priority", "assigned_membership_id", "due_date"], ["action_code", "title", "description", "priority"], createAction, "remediation.action.created.v1");

export async function executeMutation(transaction: Transaction<FoundationDatabase>, actor: CoreActor, definition: MutationDefinition, input: { body: Body; idempotencyKey: string; correlationId: string; fileStorage?: FileStoragePort; targetId?: string; parentId?: string }): Promise<{ response: Record<string, unknown>; replayed: boolean; afterCommit?: () => Promise<void>; deferredError?: FoundationError }> {
  validateClosedBody(definition, input.body);
  requireAccess(actor, definition.permission, definition.capability, definition.scopes);
  if (!input.idempotencyKey || input.idempotencyKey.length > 255) throw new FoundationError("TCDX.VALIDATION.FAILED", "Idempotency-Key is required", 400, false, { field: "Idempotency-Key" });
  if (definition.operationId.startsWith("retentionApplicability") || ["uploadIntentCreate", "uploadFinalize", "evidenceCreate", "evidenceSubmit"].includes(definition.operationId)) await lockRetentionTenant(transaction, actor.tenantId);
  const requestHash = hash({ body: input.body, target_id: input.targetId ?? null, parent_id: input.parentId ?? null, fingerprint_version: "v1" });
  const claim = await claimIdempotency(transaction, { idempotencyRecordId: newUuidV7(), ownershipClass: "TENANT_OWNED", tenantId: actor.tenantId, actor: { userIdentityId: actor.userIdentityId }, correlationId: input.correlationId, operationCode: definition.operationId, key: input.idempotencyKey, requestHash });
  if (claim.state === "replay") {
    if (!claim.resultRef) throw new FoundationError("TCDX.CONFLICT.RESOURCE", "Idempotent result unavailable", 409, true);
    if (claim.resultStatusCode === "failed") throw new FoundationError("TCDX.CONFLICT.IDEMPOTENCY", "Previous idempotent attempt failed", 409);
    const [rawResource, id] = claim.resultRef.split(":");
    if (!rawResource || !id || !(rawResource in resources)) throw new FoundationError("TCDX.CONFLICT.RESOURCE", "Idempotent result unavailable", 409, true);
    const resource = rawResource as ResourceKey;
    const context: MutationContext = {
      transaction,
      actor,
      body: input.body,
      correlationId: input.correlationId,
      ...(input.fileStorage ? { fileStorage: input.fileStorage } : {}),
      ...(input.targetId ? { targetId: input.targetId } : {}),
      ...(input.parentId ? { parentId: input.parentId } : {})
    };
    const replay = definition.replay
      ? await definition.replay(context, { resource, id })
      : { response: await detailResource(transaction, actor, resources[resource], id, definition.permission) };
    return { ...replay, replayed: true };
  }
  const context: MutationContext = {
    transaction,
    actor,
    body: input.body,
    auditEventId: newUuidV7(),
    correlationId: input.correlationId,
    ...(input.fileStorage ? { fileStorage: input.fileStorage } : {}),
    ...(input.targetId ? { targetId: input.targetId } : {}),
    ...(input.parentId ? { parentId: input.parentId } : {})
  };
  let result: MutationResult | undefined;
  try {
    const capture = await captureVocabularyWrites(()=>definition.execute(context));
    result = capture.result;
    const response = result.response ?? await detailResource(transaction, actor, resources[result.resource], result.id, definition.permission);
    const resourceDefinition=resources[result.resource];
    const profile=buildVocabularyProvenance(definition.operationId,input.body,capture.writes,{table:resourceDefinition.table,entity:resourceDefinition.name,idColumn:resourceDefinition.idColumn,row:capture.writes.find(w=>w.table===resourceDefinition.table)?.row??response});
    const auditAfter={...(result.auditAfter??response),...(profile?{contract_provenance:profile}:{})};
    if(profile)response.contract_provenance=[...(Array.isArray(response.contract_provenance)?response.contract_provenance:[]),profile];
    await persistAuditEvent(transaction, { auditEventId: context.auditEventId!, ownershipClass: "TENANT_OWNED", tenantId: actor.tenantId, actor: { userIdentityId: actor.userIdentityId }, correlationId: input.correlationId, eventCode: definition.auditEvent, aggregateType: resources[result.resource].name, aggregateId: result.id, commandCode: definition.operationId, outcome: result.auditOutcome ?? "success", classification: "internal", ...(result.auditBefore ? { before: result.auditBefore } : {}), after: auditAfter });
    if (definition.domainEvent && !result.deferredError) await persistOutboxEvent(transaction, { outboxEventId: newUuidV7(), eventId: newUuidV7(), ownershipClass: "TENANT_OWNED", tenantId: actor.tenantId, actor: { userIdentityId: actor.userIdentityId }, correlationId: input.correlationId, eventType: definition.domainEvent, aggregateType: resources[result.resource].name, aggregateId: result.id, classification: "internal", payload: { aggregate_id: result.id, row_version: response.row_version } });
    await completeIdempotency(transaction, { idempotencyRecordId: claim.idempotencyRecordId, requestHash, resultStatusCode: result.deferredError ? "failed" : "completed", resultRef: `${result.resource}:${result.id}`, responseHash: hash(response) });
    return {
      response,
      replayed: false,
      ...(result.afterCommit ? { afterCommit: result.afterCommit } : {}),
      ...(result.deferredError ? { deferredError: result.deferredError } : {})
    };
  } catch (error) {
    if (result?.rollbackExternal) await result.rollbackExternal();
    throw error;
  }
}
